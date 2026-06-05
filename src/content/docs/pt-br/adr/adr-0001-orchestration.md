---
title: "ADR-0001: Framework de orquestração"
description: Por que o fluxo de controle do agente é construído sobre o LangGraph 1.x como um grafo de estado explícito, inspecionável e durável.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0001: Framework de orquestração (LangGraph 1.0)

- Status: Accepted
- Data: 2026-03-18
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

A implementação de referência é um agente conversacional multi-turno de
adesão a medicamentos. O agente tem obrigações explícitas de fluxo de
controle: classificar o escopo, recuperar de uma pequena base de conhecimento,
redigir uma resposta, executar uma verificação de segurança, decidir se deve
escalonar e solicitar uma pausa com humano no circuito em turnos de alto
risco. O estado da conversa deve sobreviver a um reinício de processo para que
um turno pausado possa retomar depois que um clínico (ou, na demo, um revisor)
reconheça o escalonamento.

O harness de avaliação, por sua vez, precisa ser capaz de conduzir esse agente
de ponta a ponta de forma determinística, inspecionar traces de nós
intermediários e reproduzir conversas golden. O framework de orquestração
escolhido, portanto, precisa expor o agente como um grafo de nós e arestas
explícitos (não como um "loop de agente" caixa-preta), fornecer estado durável
e dar suporte a uma primitiva HITL no estilo `interrupt`.

Como estruturamos o fluxo de controle do agente de modo que ele seja auditável
em cada nó, possa ser pausado e retomado de forma durável e seja portável
entre fornecedores de LLM e implantações auto-hospedadas?

## Direcionadores da Decisão

- Máquina de estados explícita: a arquitetura é "agente como um grafo
  inspecionável", não "agente como um while-loop opaco"
- Persistência durável: o estado da conversa deve sobreviver a um reinício de
  processo (pronto para Postgres) para que o harness de avaliação e a demo
  possam reproduzir turnos
- Primitiva de humano no circuito de primeira classe (`interrupt()`) para o
  caminho de red-flag / alto risco
- Neutro em relação a fornecedores: o framework não deve forçar um provedor de
  LLM ou runtime hospedado específico
- Sinal de maturidade: um release major estável (1.x), não uma biblioteca 0.x,
  porque esta é uma implementação de referência pública
- Licença: permissiva o suficiente para ser distribuída dentro de uma imagem
  Docker distribuída sob Apache 2.0

## Opções Consideradas

- **LangGraph 1.0**: `StateGraph` explícito, checkpointers duráveis
  incluindo Postgres, HITL `interrupt()` nativo, neutro em relação a
  fornecedores, atingiu o GA 1.0 em 2025-10-22
- **CrewAI**: abstração de "crew de agentes" baseada em papéis, processos
  sequenciais ou hierárquicos, topologia de grafo menos granular
- **Microsoft Agent Framework**: a unificação de 2025 da Microsoft entre o
  Semantic Kernel e o AutoGen, forte ferramental Azure, inclinação a
  fornecedor
- **Claude Agent SDK**: o SDK de agente próprio da Anthropic, ergonômico
  mas prende o loop de controle do agente a uma única família de modelos
- **Pydantic AI**: framework de agente nativo de Python, tipado e ergonômico,
  construído sobre esquemas Pydantic, mais leve em semântica explícita de grafo
- **AutoGen v0.2 / Swarm**: padrões anteriores de conversa multi-agente,
  substituídos / descontinuados até 2026

## Resultado da Decisão

Opção escolhida: **LangGraph 1.0**. É a única opção do conjunto
que combina uma topologia `StateGraph` explícita e inspecionável, uma história
de checkpointer durável que inclui um saver Postgres, uma primitiva
`interrupt()` nativa para HITL e uma linha de release major 1.x estável
(GA em 2025-10-22, ver o changelog da LangChain). É também o
framework que mapeia de forma mais limpa para como o harness de avaliação quer
conduzir o agente: carregar um checkpoint, reproduzir turnos a partir de um
fixture JSONL e fazer asserções sobre o estado em nível de nó. O modelo mental
"o agente é um grafo de nós nomeados" é exatamente a história de arquitetura
que este projeto conta.

### Confirmação

- O grafo é declarado uma única vez como um `StateGraph` com nós nomeados e
  arestas explícitas; o `mypy --strict` verifica os tipos do esquema de estado
- O harness de avaliação conduz o agente pela API pública do grafo, não
  chamando helpers internos, de modo que uma troca por um orquestrador
  diferente apareceria na suíte de testes do runner
- O grafo compilado aceita um checkpointer injetado; a build da demo
  usa um saver em memória, e uma fábrica de saver Postgres é opcional por
  variável de ambiente e coberta por um teste de integração

## Consequências

### Positivas

- O fluxo de controle do agente é documentado pelo próprio grafo; o diagrama
  de máquina de estados C4 e o código permanecem em sincronia porque ambos são
  derivados da mesma definição de `StateGraph`
- A persistência durável via um saver Postgres é uma troca de uma linha a
  partir do checkpointer em memória usado nos testes, o que torna a postura de
  "persistência pronta para produção" defensável
- O `interrupt()` dá ao caminho de escalonamento HITL uma primitiva sobre a
  qual os testes unitários de HITL podem fazer asserções diretas (o grafo
  realmente pausou, não "o agente decidiu parar"); o runner de avaliação roda
  com o HITL desabilitado e nunca exercita a pausa
- O LangGraph é neutro em relação a fornecedores: os nós chamam o Protocol
  `LLMClient` do projeto, não um objeto de provedor específico da LangChain, de
  modo que a abstração no [ADR-0002](./adr-0002-llm-vendor-abstraction.md) é
  preservada
- O status GA 1.0 (2025-10-22) sinaliza que o framework passou da
  janela de turbulência 0.x típica de bibliotecas de agentes

### Negativas

- O LangGraph herda parte da superfície do ecossistema LangChain mais amplo
  (imports, dependências transitivas); mantemos a superfície pequena
  fixando versões e importando apenas `langgraph`, não o megapacote
  `langchain` completo
- O framework prescreve um idioma de grafo de estado; um contribuidor que
  prefira um loop de agente em formato livre tem que aprendê-lo
- Uma migração significativa para outro orquestrador mais tarde tocaria
  cada nó do grafo, ainda que as abstrações de LLM e RAG
  sobrevivessem inalteradas

### Neutras

- O projeto ganha uma dependência `langgraph` no lockfile
- O harness de avaliação precisa saber como carregar um checkpoint de
  `StateGraph`; este é um pequeno adaptador, não uma mudança estrutural
- A LangChain continua sendo uma superfície de dependência indireta; isso é
  documentado explicitamente e a versão minor é fixada

## Prós e Contras das Opções

### LangGraph 1.0

- Boa, porque o `StateGraph` torna a topologia explícita e
  inspecionável
- Boa, porque um saver Postgres dá estado de conversa durável de
  graça
- Boa, porque o `interrupt()` é uma primitiva HITL de primeira classe
- Boa, porque o GA 1.0 em outubro de 2025 estabiliza a superfície da API
- Ruim, porque a proximidade do ecossistema LangChain adiciona superfície de
  dependência
- Ruim, porque os contribuidores precisam aprender o idioma de grafo de estado

### CrewAI

- Boa, porque a abstração baseada em papéis se lê bem em texto de
  marketing
- Ruim, porque as crews são mais grosseiras do que a topologia por nó que o
  harness de avaliação quer
- Ruim, porque a história de HITL é menos de primeira classe do que o
  `interrupt()` do LangGraph

### Microsoft Agent Framework

- Boa, porque a unificação Semantic Kernel + AutoGen é bem projetada
- Boa, porque as integrações Azure são de primeira classe
- Ruim, porque o centro de gravidade do framework é o stack Azure /
  Microsoft, o que entra em conflito com a postura neutra em relação a
  fornecedores deste projeto

### Claude Agent SDK

- Boa, porque a ergonomia é excelente
- Ruim, porque prende o loop de controle do agente aos modelos Anthropic
  e quebra a evidência multi-fornecedor que o projeto quer mostrar

### Pydantic AI

- Boa, porque a API tipada e Pydantic-first é agradável de escrever
- Ruim, porque a postura de máquina de estados explícita é mais fraca; o
  framework se apoia mais em agente-como-função-tipada do que em
  agente-como-grafo
- Mantida como candidata alternativa para um cenário futuro de migração

### AutoGen v0.2 / Swarm

- Ruim, porque ambas as linhas estão descontinuadas até 2026 e foram
  substituídas pelo Microsoft Agent Framework (AutoGen) e pelo campo mais amplo
  de frameworks de agentes (Swarm)

## Mais Informações

- Anúncio do GA do LangGraph 1.0 (2025-10-22):
  <https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available>
- Documentação do LangGraph: <https://langchain-ai.github.io/langgraph/>
- Guia de `interrupt` / HITL do LangGraph:
  <https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/>
- Checkpointers duráveis do LangGraph:
  <https://langchain-ai.github.io/langgraph/concepts/persistence/>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Grafo e checkpointer tal como construídos

**Topologia do grafo tal como construída.** O grafo distribuído tem seis nós:
`intake`, `guardrail_pre`, um `retrieve_context` condicional,
`generate_response`, `guardrail_post` e `closing`. Uma aresta condicional pula
o `retrieve_context` quando uma falha de pré-guardrail (uma recusa ou um
escalonamento agudo) já está presente, de modo que um turno em curto-circuito
não pague pela recuperação.

**HITL `interrupt()`.** Quando o HITL está habilitado (uma flag de ambiente),
um sétimo nó, `review_response`, é inserido entre `generate_response`
e `guardrail_post`. Ele chama o `interrupt()` do LangGraph para pausar um
rascunho de alto risco mas não agudo - uma citação não verificada, uma citação
ausente ou desvio de persona, classificado pelo módulo de revisão - para que um
revisor humano possa aprovar, editar ou rejeitar o rascunho. Um endpoint de
retomada dedicado retoma a thread pausada. O corpo do nó anterior ao
`interrupt()` apenas lê o estado, então é seguro reexecutá-lo quando o
`interrupt()` reexecuta seu nó hospedeiro na retomada. O HITL vem desligado por
padrão: o grafo padrão de seis nós e o harness de avaliação rodam sem nenhum
comportamento de pausa, e um caminho baseado em `interrupt()` permanece
incompatível com o harness de avaliação de passagem única e sem chaves, e é por
isso que ele é opcional. Red flags agudas NÃO são roteadas pelo `interrupt()`:
elas entram em curto-circuito antes, no `guardrail_pre`, para um template de
emergência (ver [ADR-0005](./adr-0005-guardrails.md)) e o `review_response`
nunca as pausa.

**Fábrica de checkpointer.** A fábrica de checkpointer retorna um
`MemorySaver` em memória por padrão e um `AsyncPostgresSaver` quando um DSN de
Postgres está definido; ambos os caminhos recebem um serializador endurecido que
carrega uma allowlist dos tipos Pydantic customizados que o grafo faz checkpoint
(isso também mitiga o CVE-2026-28277 / GHSA-g48c-2wqr-h844). O Space da demo usa
o caminho em memória, então uma thread HITL pausada não sobrevive a um reinício
do Space, a um cold start ou a um segundo worker - uma limitação documentada do
nível gratuito de worker único. O Postgres é a resposta durável e é selecionado
automaticamente ao definir o DSN.

**Diagramas de estado.** Os diagramas de estado no estilo C4 são em Mermaid
escritos à mão, não gerados a partir do `StateGraph` compilado. Eles são
mantidos em sincronia com o código por revisão; a lista de nós inline é a
descrição mais próxima do código e a autoritativa.

**Versão do LangGraph.** O pin é `langgraph>=1.0.10`, resolvido para a
linha 1.x atual. O piso `>=1.0.10` garante que uma instalação nova não possa
resolver para uma versão pré-patch vulnerável ao CVE-2026-28277.
