---
title: "ADR-0023: Recuperação híbrida"
description: Por que a recuperação funde candidatos do BM25 e densos com Reciprocal Rank Fusion e os reavalia com um reranker cross-encoder, degradando de forma elegante.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0023: Recuperação híbrida - BM25 + densa + RRF + rerank com cross-encoder

- Status: Aceito
- Data: 2026-05-29

## Contexto

A camada de recuperação apresentava o contexto com um único caminho denso (bi-encoder): o turno do usuário é embutido com o prefixo de consulta BGE e os subchunks mais próximos são lidos do Chroma ([ADR-0004](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0004-rag-stack/)), depois deduplicados para cartões pais ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0021-parent-document-retrieval/)). A recuperação densa captura similaridade semântica, mas perde correspondências lexicais exatas quando a consulta e um cartão compartilham tokens raros (um nome de medicamento, um modelo de dispositivo, uma unidade de dose específica) que o embedding suaviza. Um índice puramente lexical tem a fraqueza inversa: ele perde a paráfrase. Para um agente de adesão à medicação cujo corpus é denso em entidades nomeadas, nenhum sinal sozinho é suficiente.

O remédio padrão é a recuperação híbrida: rodar um gerador lexical e um denso em paralelo, fundir suas classificações e, então, reavaliar os candidatos fundidos com um cross-encoder que lê consulta e candidato conjuntamente. Esta ADR registra as decisões tomadas ao adicionar esse pipeline.

## Decisão

Substituir o passo de recuperação apenas denso por um pipeline de três estágios, condicionado a um sinalizador que tem como padrão ligado e degrada de forma elegante para o comportamento anterior.

1. **Dois geradores de candidatos paralelos** sobre o mesmo corpus de subchunks: BM25 (lexical) e o caminho denso existente do Chroma (semântico).
2. **Reciprocal Rank Fusion** combina as duas listas classificadas em uma única, sem calibração de score entre os sistemas.
3. **Rerank com cross-encoder** reavalia os candidatos fundidos contra o texto da consulta; os sobreviventes são então deduplicados para pais ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0021-parent-document-retrieval/)), truncados para `top_k` e filtrados pelo limiar de similaridade mínima existente.

As escolhas de engenharia fixadas:

- **(A) Modelo do reranker.** Primário `BAAI/bge-reranker-v2-m3` (~568MB), reclassificação multilíngue de ponta. Fallback documentado `BAAI/bge-reranker-base` (~110MB, ~3-5% de nDCG@10 menor) caso o primário não caiba na RAM ou seu tempo de cold-start seja inaceitável no alvo de implantação. Rerankers pagos (Cohere, Voyage) estão fora do escopo aqui: eles adicionam uma dependência externa paga que o orçamento da demo exclui.
- **(B) Biblioteca de BM25.** `rank-bm25` (BM25Okapi): Python puro, sem dependências compiladas, licenciado sob MIT. Adicionada como dependência principal de runtime (~30KB) para que o caminho híbrido seja importável em cada instalação, em vez de condicionado a um extra.
- **(C) Ciclo de vida do índice BM25.** Reconstruído na inicialização da aplicação a partir da mesma lista de chunks com que o store denso foi construído; nunca serializado com pickle. O índice é pequeno (construção sub-segundo) e, portanto, nunca pode dessincronizar do corpus denso.
- **(D) Constante de RRF.** `k = 60` (Cormack et al. 2009), o padrão canônico; exposto como configuração para ajuste.
- **(E) Tamanhos do conjunto de candidatos.** Cada gerador faz over-fetch para `top_k * overfetch * 2`; o reranker pontua no máximo `reranker_max_input` (padrão 32) candidatos fundidos; o conjunto final trunca para `top_k`.
- **(F) Padrão opt-in.** O híbrido está ligado por padrão; um único sinalizador de env reverte para o caminho apenas denso para comparação A/B ou recuperação sem um redeploy.
- **(G) Contrato de degradação.** Quatro tiers observáveis via um atributo de span `agent.hybrid_path`: `full` (BM25 + densa + RRF + rerank), `rrf_only` (reranker indisponível), `dense_only` (índice BM25 vazio) e a preexistente recusa-em-caso-de-nenhuma-correspondência. O loader do reranker não retorna nada em qualquer falha (arquivos ausentes, OOM, sem rede no cold start) e o nó cai para `rrf_only` em vez de falhar a requisição.
- **(H) Compatibilidade retroativa.** O caminho apenas denso é preservado como o fallback documentado e é alcançável via o sinalizador de opt-out; os testes o fixam.

## Alternativas consideradas

### A1: Híbrido nativo do store de vetores (filtro de metadados do Chroma + densa)

Usar a filtragem `where` do Chroma junto com a busca densa em vez de um índice BM25 separado.

- Prós: um único caminho de consulta; nenhum índice separado para construir.
- Contras: amarra a semântica híbrida a um único store de vetores; a filtragem de metadados não é BM25 e não classifica por frequência de termo / frequência inversa de documento.
- Rejeitada: a fusão na camada do agente é agnóstica ao provedor (vale para Chroma, pgvector, etc.) e dá uma classificação BM25 verdadeira.

### A2: BM25 apoiado em Pyserini / Lucene

- Prós: de nível de produção, rápido em larga escala.
- Contras: ~250MB mais um runtime Java; muito além da pegada da demo para um corpus de 158 subchunks.
- Rejeitada por motivos de pegada e dependência de runtime.

### A3: Entregar apenas BM25 + densa + RRF, pular o cross-encoder

- Prós: menor latência por turno; nenhum modelo de 568MB.
- Contras: o RRF funde classificações, mas não consegue ler consulta e candidato conjuntamente; o cross-encoder é onde a maior parte do ganho de precision@k surge.
- Rejeitada por qualidade. O contrato de degradação ainda recorre exatamente a esta configuração (`rrf_only`) quando o reranker está indisponível, de modo que o caminho é exercitado e suportado, apenas não é o padrão.

### A4: Serializar o índice BM25 em disco com pickle

- Prós: pular a reconstrução na inicialização.
- Contras: adiciona uma superfície de versionamento que pode dessincronizar da coleção do Chroma, que é a fonte da verdade.
- Rejeitada: a reconstrução é sub-segundo; correção supera uma economia de inicialização desprezível.

## Consequências

### Positivas

- O recall melhora estritamente em relação ao apenas denso para qualquer corpus com recall positivo: o conjunto de candidatos fundido é um superconjunto dos candidatos densos, de modo que correspondências apenas lexicais que o embedding perdeu agora são alcançáveis.
- O cross-encoder eleva o precision@k ao reavaliar o conjunto fundido com atenção completa entre consulta+candidato.
- Cada degradação é observável via o atributo de span `agent.hybrid_path`, e uma requisição nunca falha apenas porque um modelo não carregou.

### Negativas

- A latência por turno cresce pela inferência do reranker (~50-150ms em CPU para até 32 candidatos) mais a consulta BM25 (~1ms), limitada por restringir o conjunto de entrada do reranker.
- O primeiro cold start baixa o reranker de ~568MB; inicializações subsequentes usam o cache. O modelo de fallback menor existe para alvos com restrição de pegada.
- Os testes existentes que faziam asserções sobre a ordenação apenas densa ou sobre scores exatos devem migrar para o contrato híbrido: asserções de superconjunto de recall se mantêm, asserções de ordem exata não.

### Neutras

- A invariante de deduplicação por pai ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0021-parent-document-retrieval/)) permanece inalterada: ela roda após a fusão + rerank, ainda sobre as identidades de subchunk.
- A tokenização é minúsculas + remoção de pontuação; a tokenização sensível à localidade para es-419 / pt-BR é adiada até que as métricas de recall a justifiquem.

## Notas de implementação

- O índice BM25 envolve a implementação BM25Okapi do `rank-bm25`; a consulta retorna cópias de chunk de contexto com o score BM25 definido. Um corpus vazio produz um resultado vazio, que é o gatilho de degradação `dense_only`.
- A reciprocal rank fusion é uma função pura; a identidade de fusão é o id do subchunk porque a deduplicação por pai roda após a fusão.
- O reranker envolve o cross-encoder do `sentence-transformers`; seu loader é um callable de nível de módulo que importa a biblioteca de forma preguiçosa, de modo que importar o módulo de recuperação nunca puxa o torch. O loader não retorna nada em caso de falha de carga (Decisão G).
- Configurações: `retrieval_hybrid_enabled`, `rrf_k`, `reranker_model`, `reranker_max_input`.

## Trabalho futuro

- **Tokenização BM25 sensível à localidade** para es-419 / pt-BR se as métricas de recall indicarem perdas lexicais em turnos que não estão em inglês.
- **Expansão de consulta / HyDE / multi-query** como um passo separado de qualidade de recuperação se o recall@k o justificar.
- **Adaptadores de reranker pagos** (Cohere, Voyage) por trás do extra de cloud existente, para implantações que optem por uma API gerenciada de reranking.

## Reversão

Definir o sinalizador de env de opt-out do híbrido para restaurar o caminho apenas denso sem mudança de código; o índice BM25 e o reranker simplesmente ficam sem uso. O caminho denso permanece intocado pelo trabalho do híbrido e continua sendo o fallback.

## Veja também

- [ADR-0004](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0004-rag-stack/) (pilha de RAG): o store denso + embedder que este pipeline estende.
- [ADR-0021](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0021-parent-document-retrieval/) (recuperação de documento pai): o passo de deduplicação por pai que roda após a fusão + rerank.
