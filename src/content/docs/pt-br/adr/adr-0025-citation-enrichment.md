---
title: "ADR-0025: Enriquecimento de citação no lado do servidor"
description: Por que a API deriva a URL de origem, a licença e o score de relevância da citação no lado do servidor a partir do contexto recuperado, de modo que o modelo nunca emita URLs.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0025: Enriquecimento de citação no lado do servidor

- Status: Aceito
- Data: 2026-05-31

## Contexto

O popover de citação precisa de três pontos de dados por cartão da KB citado para renderizar um resumo de cartão útil: a URL de origem, a licença e um score de relevância. Esses campos estão ausentes do modelo de citação existente (que carrega apenas o id do cartão e o span), e a SPA não tem acesso independente aos metadados verificados da KB — ela é somente leitura sobre a carga útil da resposta do chat.

Duas abordagens de enriquecimento foram consideradas:

1. **Enriquecimento no lado do cliente.** A SPA chama um novo endpoint de metadados de cartão para buscar os metadados no momento da renderização.
2. **Enriquecimento no lado do servidor (escolhido).** A camada da API deriva os campos do contexto recuperado já presente no estado do agente e os anexa aos objetos de citação antes de serializar a resposta do chat.

O enriquecimento no lado do servidor foi escolhido porque os metadados da KB já estão em memória no momento da construção da resposta (os objetos de chunk de contexto no contexto recuperado), o LLM nunca deve emitir URLs para preservar a restrição de honestidade ([ADR-0020](./adr-0020-structured-agent-reply.md)), e adicionar um novo endpoint público apenas para os dados do popover ampliaria a superfície da API sem um benefício proporcional.

O contrato de citações da resposta do chat ([ADR-0020](./adr-0020-structured-agent-reply.md)) é compatível retroativamente: todos os três novos campos têm como padrão ausente, de modo que os consumidores existentes (avaliadores de avaliação, portão de red-team, harness de certificação) que leem apenas o id do cartão não são afetados.

## Decisão

Estender o modelo de citação com três campos opcionais e populá-los no lado do servidor, no momento da construção da resposta, a partir dos metadados verificados do cartão no Chroma, com chave pelo id do cartão.

1. **Três campos opcionais aditivos na citação:**
   - `source_url` — a URL de origem do cartão da KB, a partir do campo source do chunk de contexto.
   - `source_license` — a licença a partir dos metadados do chunk de contexto.
   - `retrieved_score` — o score de relevância do reranker normalizado para 0-100.

2. **Enriquecimento no lado do servidor** — um helper privado chamado durante a construção da resposta, imediatamente após a reconciliação da citação. Ele constrói uma busca de id de chunk para chunk sobre o contexto recuperado e, então, para cada citação:
   - Define a URL de origem e a licença a partir do chunk de contexto correspondente.
   - Define o score de relevância apenas quando o caminho híbrido é `full` (o caminho do reranker cross-encoder).

3. **Rótulo de caminho híbrido no estado do agente** — um novo rótulo opcional (`full`, `rrf_only`, `dense_only` ou ausente). Gravado pelo nó de recuperação junto ao contexto recuperado, lido no momento da construção da resposta.

4. **O LLM nunca emite URLs.** O enriquecimento deriva a URL de origem e a licença exclusivamente do campo source e dos metadados do chunk de contexto — ambos originam-se do conjunto de dados sintético e verificado da KB, ingerido na inicialização. Nenhuma string emitida pelo modelo se torna uma URL exibida.

## Escolhas de engenharia fixadas

**(A) Normalização do score.** O cross-encoder do reranker emite um logit. O score normalizado é `round(100 / (1 + exp(-logit)))` — a função sigmoide escalada para [0, 100] e arredondada para um float de valor inteiro. Isso dá uma porcentagem de relevância de 0-100 no caminho híbrido `full`.

**(B) O score está ausente em caminhos não-full.** Quando o caminho híbrido é `rrf_only`, `dense_only` ou ausente, o score de relevância está sempre ausente. Os scores de RRF e as similaridades de cosseno densas estão em escalas incompatíveis e não podem ser comparados contra os logits do reranker; emiti-los como se fossem comparáveis seria enganoso.

**(C) Degradação elegante.** Cada item de enriquecimento é envolvido de modo que uma falha retorne a citação original inalterada. Um chunk ausente, um source vazio ou um campo de metadados ruim produz um valor ausente no campo correspondente, em vez de uma resposta de erro. O helper nunca levanta exceção.

**(D) A chave de busca é o slug puro do cartão.** Após a deduplicação por pai no nó de recuperação, o id do chunk de contexto é igual ao id do pai, igual ao slug do cartão (por exemplo, `card-hyp-01`). Não há separador `::` na chave de busca. Um id de subchunk (`card-hyp-01::00`) nunca corresponderia ao id de cartão de uma citação, porque as citações estão na granularidade do cartão ([ADR-0021](./adr-0021-parent-document-retrieval.md)).

**(E) Campos opcionais aditivos preservam a compatibilidade retroativa.** Uma citação construída apenas a partir de um id de cartão ainda é construída com todos os três novos campos ausentes. Os avaliadores de avaliação, o portão de red-team e o harness de certificação leem apenas o id do cartão; eles não são afetados.

**(F) Entrega dividida.** Esta ADR cobre o backend. A renderização do popover de citação no frontend (a URL de origem como um link seguro, uma verificação de URL contra XSS, o chip do popover) é um incremento de frontend separado, coberto por seu próprio plano de implementação. O backend é entregue de forma independente e está verde antes de o frontend começar.

## Alternativas consideradas

### Opção A: apenas id do cartão + span (estado atual, sem enriquecimento)

Manter o modelo de citação inalterado. O popover da SPA renderiza apenas o slug do id do cartão e o trecho do span.

- Prós: zero mudança no backend; zero risco.
- Contras: o popover não transmite link de origem legível por humanos nem sinal de relevância; o requisito não é cumprido.
- Rejeitada: o dono escolheu o enriquecimento completo no lado do servidor.

### Opção C: sempre emitir um score de relevância independentemente do caminho híbrido

Emitir um score de relevância em todo caminho usando o score disponível (rank de RRF, cosseno denso, logit do reranker) normalizado para [0, 100] via fórmulas específicas por caminho.

- Prós: sempre mostra um score no popover.
- Contras: os três tipos de score estão em escalas fundamentalmente diferentes (RRF ~1/(1+rank), cosseno denso (0, 1], logit do reranker ilimitado). A comparação entre caminhos é sem sentido e ativamente enganosa. Normalizar cada um para [0, 100] esconde a incompatibilidade de escala.
- Rejeitada: a restrição de honestidade fixou isso no briefing de planejamento.

### Opção D: enriquecimento no lado do cliente via um novo endpoint de metadados de cartão

Adicionar um endpoint público que a SPA chama para buscar os metadados do cartão sob demanda.

- Prós: nenhuma mudança no schema existente da resposta do chat.
- Contras: superfície de API adicional; latência na abertura do popover; a SPA não tem caminho confiável para distinguir metadados de cartão sintetizados de alucinados pelo modelo.
- Rejeitada: o enriquecimento no lado do servidor é mais simples e já tem os dados em memória.

## Consequências

**Positivas:**
- O popover de citação tem todos os dados de que precisa sem um novo endpoint de API.
- O firewall LLM-URL é preservado: a SPA nunca recebe uma URL que o modelo gerou.
- O portão de avaliação, a regressão do avaliador e o harness de certificação não são afetados pelos campos opcionais aditivos (confirmado por uma execução de regressão: 160 testes de citação/avaliador passam).
- A metade de backend do recurso é entregue de forma independente e está verde antes de qualquer trabalho de frontend começar.

**Negativas / riscos:**
- O score de relevância está ausente na maioria das implantações em que o cross-encoder não é carregado (cold-start, com restrição de RAM, configurações apenas densas). O popover deve lidar com o valor ausente de forma elegante.
- Um cartão da KB ingerido sem campo source nos metadados do Chroma produz uma URL de origem ausente; isso aparece como um popover sem link. O conjunto de dados sintético atual popula o source para cada cartão, então este é um risco de conjunto de dados degradado, não um caso comum.

**Referências cruzadas:**
- [ADR-0020](./adr-0020-structured-agent-reply.md) — Resposta estruturada do agente (o contrato de citações da resposta do chat, compatível retroativamente, que esta ADR estende)
- [ADR-0023](./adr-0023-hybrid-retrieval.md) — Recuperação híbrida (o rótulo de caminho híbrido e a semântica de logit do reranker que esta ADR lê)
