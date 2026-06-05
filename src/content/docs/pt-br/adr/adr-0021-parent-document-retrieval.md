---
title: "ADR-0021: Recuperação de documento pai"
description: Por que a recuperação faz a correspondência em pequenos chunks de subcartão, mas apresenta cartões pais inteiros ao modelo, mantendo as citações no nível do cartão.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0021: Recuperação de documento pai — chunking de subcartão com citação no nível do cartão

- Status: Aceito
- Data: 2026-05-28
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

Anteriormente, a camada de RAG tratava cada cartão da KB como uma unidade de
recuperação atômica: o corpus sintético tem 36 cartões; o ingest embutia o título e
o texto de cada cartão como um único vetor de passagem; o store do Chroma continha
36 linhas; o nó de recuperação retornava os top-K cartões mais próximos, e o
LLM consumia cartões inteiros.

Isso é limitado em precisão de duas maneiras concretas:

1. Uma consulta estreita ("devo tomar com o estômago vazio?")
   compete contra o vetor do cartão inteiro, que mistura a frase relevante
   com parágrafos não relacionados sobre rotinas de adesão, efeitos
   colaterais e apoio ao estilo de vida. O sinal de correspondência é diluído.
2. A mediana do cartão no corpus é de ~1100 caracteres e o p90 é de ~1500
   caracteres; os cartões não são patologicamente longos, mas são longos
   o suficiente para que o chunking semântico de subcartão melhore de forma
   mensurável a unidade de correspondência no momento do embedding sem mudar a
   unidade de contexto no momento do prompt (o LLM ainda se beneficia de ver o
   cartão inteiro).

Essa evolução de precisão de recuperação precisava ser entregue antes de empilhar a
recuperação híbrida (BM25 + densa + reranker + RRF) e um avaliador focado apenas na
recuperação (recall@k) por cima. Como melhoramos a precisão da recuperação sem
quebrar o contrato de citação (os marcadores `[cite:card-X]`, o campo
`must_cite_one_of: ["card-..."]` dos casos golden de avaliação, os chips de citação
da SPA, o corpus de red-team) ou aumentar a pegada de instalação?

## Fatores de decisão

- **Precisão da recuperação**: a unidade de correspondência no nível do vetor deve
  ser pequena o suficiente para que consultas estreitas encontrem a passagem certa;
  consultas mais amplas ainda apresentam o cartão certo.
- **Qualidade do contexto do LLM**: a unidade no momento do prompt deve permanecer
  grande o suficiente para que o LLM tenha o sinal entre parágrafos de que precisa
  para produzir respostas fundamentadas; os cartões inteiros já são a unidade certa
  aqui.
- **Estabilidade do contrato de citação**: a extração de citação, a verificação de
  citação, os casos golden de avaliação, a renderização dos chips na SPA e o
  corpus de red-team todos citam no nível do cartão. Migrá-los para citações no
  nível do chunk multiplica o raio de impacto e estava fora do escopo desta
  evolução.
- **Pegada de instalação**: o alvo de implantação roda em um tier de CPU pequeno
  (16GB de RAM, 2 vCPU). Adicionar uma dependência pesada de chunking acrescentaria
  ~80MB e uma varredura de similaridade de embeddings O(n²) por cartão no ingest.
  Isso é desproporcional para um corpus de 36 cartões.
- **Compatibilidade futura**: o design escolhido deve produzir vetores de
  subchunk sobre os quais o pipeline híbrido posterior (BM25 + reranker + RRF) possa
  operar, e o passo de deduplicação por id do pai deve produzir hits de pai
  que o avaliador de recall@k posterior possa medir.

## Opções consideradas

- **Opção A**: manter o modelo "1 cartão = 1 chunk" e melhorar a
  recuperação puramente por meio de um embedding melhor. Adia o chunking
  por completo.
- **Opção B**: citação no nível do chunk (chunks de subcartão; o LLM cita
  o id do chunk correspondente; a SPA deriva o título do pai a partir dos metadados
  do chunk no momento da renderização).
- **Opção C**: recuperação de documento pai — chunks de subcartão no momento do
  ingest, deduplicação por id do pai no momento da recuperação, apresentar o texto do
  cartão pai ao LLM, citações permanecem no nível do cartão.

## Resultado da decisão

Opção escolhida: **Opção C** — recuperação de documento pai com chunking de
subcartão e citação no nível do cartão.

A razão determinante é o fator de estabilidade do contrato de citação:
a estratégia C é a única opção que melhora a precisão da recuperação ao mesmo
tempo que deixa intocada toda superfície que consome citação (extração de citação,
verificação de citação, o `must_cite_one_of` golden de avaliação, os chips de
citação da SPA, o corpus de red-team). A estratégia A deixa precisão na mesa; a
estratégia B tem o perfil de precisão certo, mas exige uma migração custosa do
contrato de citação em cinco superfícies, além das mudanças na SPA necessárias
para derivar o título do pai no momento da renderização.

O pipeline de chunking divide um cartão em uma lista de subchunks. O
algoritmo é um divisor recursivo por prioridade de separador, com reempacotamento
guloso e uma janela de sobreposição alinhada a palavras:

- Tamanho-alvo do chunk: 384 caracteres (~96 tokens a 4 caracteres/token).
- Sobreposição: 64 caracteres (~16 tokens), prefixada a cada chunk após
  o primeiro, aparada até o próximo limite de palavra para que os chunks nunca
  comecem no meio de uma palavra.
- Prioridade de separador: quebra de parágrafo, quebra de linha, depois pontuação
  de sentença, depois limite de palavra. Quando nenhum separador cabe no
  orçamento, o divisor recursa com a próxima prioridade; quando nenhum resta, ele
  faz o hard-chunk por índice de caractere.
- Prefixo de título: aplicado apenas ao primeiro subchunk. Os subchunks
  subsequentes carregam apenas o texto do corpo. Os metadados de texto do pai
  armazenados na linha do Chroma sempre carregam o texto completo do cartão pai.

O modelo de chunk de contexto ganha dois campos opcionais com padrões que
preservam a compatibilidade binária: um `parent_id` (o id do cartão pai) e
um `chunk_index` (a posição do subchunk). Os campos existentes (id, source,
text, score, metadata) permanecem inalterados.

O pipeline de ingest grava uma linha do Chroma por subchunk: o id da linha é
`{card.id}::{chunk_index:02d}`, o id do pai é o id do cartão, e os
metadados carregam o corpo completo do cartão pai (~1100 caracteres na mediana; bem
dentro do limite de 16 KB por valor de metadados do Chroma), o título do pai e
os metadados existentes do cartão (license, topics, accessed_at). A reingestão
é nuke-and-rebuild: um target `make ingest-clean` derruba o store local do
Chroma antes de reexecutar `make ingest`.

O nó de recuperação faz over-fetch de `top_k * retrieval_overfetch_multiplier`
subchunks (multiplicador padrão 3), deduplica por id do pai mantendo o
melhor score por pai, expande cada hit sobrevivente em um chunk de contexto
pai (id igual ao id do pai, texto igual ao texto do pai armazenado, índice de chunk
0, melhor score entre os irmãos) e trunca para
`top_k` pais. O limiar `min_similarity` opera sobre os scores
melhor-por-pai pós-deduplicação (invariante semântica: o portão antigo
disparava quando o melhor hit de cartão estava abaixo do limiar; o novo portão
dispara quando o melhor cartão, via qualquer um de seus subchunks, está abaixo do
limiar).

A migração foi entregue em três etapas:

1. **Aditiva**: estender o modelo de chunk de contexto com os dois campos
   opcionais; adicionar o módulo de chunking; reescrever o ingest para emitir
   subchunks; encadear o id do pai e o índice de chunk pelo ciclo de ida e volta do
   Chroma; adicionar um passo de deduplicação por pai no nó de recuperação com um
   ramo de segurança que é um no-op quando cada chunk é seu próprio pai (o
   comportamento anterior); adicionar a configuração do multiplicador de
   over-fetch.
2. **Migração de testes**: atualizar fixtures e testes de recuperação para semear
   subchunks na camada do store e fazer asserções sobre a visão de pai
   pós-deduplicação; reingerir o corpus sintético pelo pipeline com chunking;
   rodar o portão de avaliação contra Groq / Cerebras ao vivo e confirmar a paridade
   de recall@k (ou melhoria) em relação à linha de base anterior.
3. **Exclusão atômica**: remover o ramo de segurança; exigir um id de pai
   em cada linha ingerida; descartar os casos de teste legados do nó de recuperação.

### Confirmação

- Um teste de chunking fixa o algoritmo do divisor contra as expectativas de
  formato do corpus (3-4 chunks para o cartão mediano; preferência por quebra de
  parágrafo sobre quebra de sentença; sobreposição alinhada a palavras; fallback de
  hard-chunk quando nenhum separador cabe).
- Os testes de ingest verificam a contagem de chunks por cartão, o formato do id do
  chunk e o ciclo de ida e volta de id do pai / índice de chunk / texto do pai.
- Os testes do nó de recuperação cobrem a deduplicação por pai com múltiplos pais e
  múltiplos subchunks cada; o portão `min_similarity` sobre o
  score melhor-por-pai; e o multiplicador de over-fetch garantindo que o
  conjunto pós-deduplicação seja de pelo menos `top_k` quando o corpus o suportar.
- Uma auditoria pós-migração confirma zero referências ao ramo de segurança
  no código de recuperação de produção.

## Consequências

### Positivas

- A precisão da recuperação melhora em consultas estreitas: um embedding de
  passagem no nível da frase corresponde melhor à consulta do que uma mistura de
  cartão inteiro.
- O contrato de citação permanece inalterado. Os marcadores `[cite:card-X]`, a
  verificação de citação, os arrays `must_cite_one_of` golden de avaliação, os
  chips de citação da SPA e o corpus de red-team continuam a operar sobre ids de
  cartão; a expansão de pai no nó de recuperação torna o formato do chunk de
  contexto apresentado indistinguível do anterior nas camadas do agente e do prompt.
- A evolução de recuperação híbrida herda um store de vetores com granularidade de
  chunk pronto para indexação BM25 e re-scoring com o cross-encoder
  `bge-reranker-v2-m3`; o passo de deduplicação por pai torna-se o ponto natural de
  fusão para listas de chunks mescladas por RRF.
- O avaliador de recall@k mede sobre os ids de pai que saem do contexto
  recuperado, o que corresponde ao formato esperado do golden de avaliação,
  inalterado.
- Zero novas dependências de pip. O divisor recursivo tem ~80 linhas de
  Python puro; a pegada de instalação permanece inalterada.

### Negativas

- A coleção do Chroma cresce de ~36 linhas para ~120 linhas no
  corpus sintético atual. A latência de consulta não é afetada (ainda
  sub-segundo), mas o uso de disco cresce ~3x. Aceitável nesta escala.
- A reingestão agora é uma operação de nuke-and-rebuild (`make ingest-clean`)
  em vez de um upsert idempotente. Um store obsoleto contendo os formatos de
  linha anteriores misturados com linhas de subchunk tropeçaria a deduplicação por
  pai de formas imprevisíveis; o trade-off é um target Make extra para
  sanidade operacional.
- O nó de recuperação ganha um multiplicador de over-fetch (padrão 3) e um
  helper de deduplicação, posteriormente extraído em uma primitiva de recuperação
  compartilhada quando a recuperação híbrida precisou do mesmo padrão de fusão.

### Neutras

- O contexto do prompt do LLM tem formato idêntico ao anterior: o bloco de
  contexto recebe uma lista de chunks de contexto em que o id de cada chunk é igual
  ao id do cartão pai e seu texto é igual ao texto do cartão pai. A regra de
  truncamento de 600 caracteres continua a limitar o tamanho do prompt.
- A semântica de `min_similarity` muda de "melhor score de cartão abaixo do
  limiar" para "melhor score de subchunk abaixo do limiar em qualquer
  cartão". Em um corpus saudável, as duas são equivalentes para o disparo do
  portão; o novo comportamento é ligeiramente mais permissivo em cartões
  onde um único subchunk forte eleva um pai de outro modo fraco
  acima do limiar (que é a direção desejada).

## Prós e contras das opções

### Opção A: manter "1 cartão = 1 chunk"

- Boa, porque não há mudanças de ingest/recuperação.
- Ruim, porque a precisão da recuperação em consultas estreitas permanece diluída.
- Ruim, porque a recuperação híbrida e o avaliador de recall@k herdam o
  mesmo teto de precisão.

### Opção B: citação no nível do chunk

- Boa, porque a unidade de recuperação e a unidade de citação são
  consistentes.
- Ruim, porque a migração toca a extração de citação, a verificação de citação,
  o array `must_cite_one_of` de cada caso golden de avaliação, o
  caminho de renderização dos chips de citação da SPA e o corpus de red-team.
- Ruim, porque a unidade de contexto do LLM passa a ser o texto do subchunk por
  padrão, o que perde o sinal de fundamentação entre parágrafos — exatamente
  o trade-off que a recuperação de documento pai foi projetada para evitar.

### Opção C (escolhida): recuperação de documento pai com citação no nível do cartão

- Boa, porque a unidade de correspondência no momento da recuperação é pequena e
  precisa.
- Boa, porque a unidade do prompt do LLM permanece o cartão pai completo.
- Boa, porque toda superfície que consome citação permanece inalterada.
- Boa, porque o pipeline híbrido e o avaliador de recall@k herdam
  as primitivas certas sem reestruturação adicional.
- Ruim, porque a contagem de linhas do Chroma cresce ~3x (aceitável; a latência de
  consulta sub-segundo é preservada).

## Mais informações

- [ADR-0001](./adr-0001-orchestration.md) — estado do agente e LangGraph;
  define o formato do chunk de contexto.
- [ADR-0004](./adr-0004-rag-stack.md) — pilha de embedding e store
  persistente do Chroma.
- [ADR-0005](./adr-0005-guardrails.md) — contrato de extração e
  verificação de citação; inalterado por esta ADR.
- [ADR-0020](./adr-0020-structured-agent-reply.md) — resposta estruturada do
  agente; o chunk de contexto expandido para o pai mantém a invariante de contexto
  do LLM da qual o prompt em modo JSON depende.
- MADR 4.0.0: <https://adr.github.io/madr/>
