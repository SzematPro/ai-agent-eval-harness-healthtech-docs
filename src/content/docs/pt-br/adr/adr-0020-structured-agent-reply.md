---
title: "ADR-0020: Resposta estruturada do agente"
description: Por que o agente emite uma resposta estruturada validada (esquema Pydantic mais modo JSON por provedor) em vez de depender da correspondência de substrings sobre prosa.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0020: Resposta estruturada do agente — esquema Pydantic + modo JSON do LLM

- Status: Aceito
- Data: 2026-05-27
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

Anteriormente, o agente emitia prosa livre, e os avaliadores de correção da
recusa e da escalação decidiam "o agente recusou?" /
"o agente escalou?" correspondendo substrings da prosa contra
tabelas de marcadores apenas em inglês.

Isso é frágil de três maneiras concretas:

1. As tabelas de marcadores são apenas em inglês. O harness inclui as localidades
   es-419 e pt-BR ([ADR-0001](./adr-0001-orchestration.md)), mas os
   avaliadores não conseguem enxergar uma recusa nessas localidades a menos que a
   prosa contenha por acaso as substrings em inglês. Uma expressão regular
   multilíngue distinta existia em paralelo na camada de guardrails — duas camadas
   de marcadores paralelas que derivam de forma independente.
2. Adicionar um novo subtemplate de recusa (foram adicionados seis:
   `input-malformed`, `out-of-scope-dosing`, `out-of-scope-diagnosis`,
   `out-of-scope-interpretation`, `out-of-scope-pii`,
   `out-of-scope-meta`) exige ampliar a tabela de marcadores; uma substring
   omitida pontua silenciosamente uma recusa como uma resposta.
3. O sinal do portão de avaliação é, estruturalmente, uma correspondência de
   substrings n-de-N sobre prosa que o modelo pode legitimamente parafrasear. Duas
   recusas semanticamente idênticas podem pontuar 1.0 e 0.0 conforme a escolha de
   palavras.

A evolução para um domínio de agente estruturado precisava que o contrato fosse
robusto antes de empilhar a recuperação por RAG e um avaliador focado apenas na
recuperação por cima. Como tornamos o discriminador estrutural em vez de baseado
em prosa, mantendo inalterada a renderização existente do texto do assistente na
SPA?

## Fatores de decisão

- **Correção estrutural**: o discriminador não deve depender da escolha de
  palavras da prosa nem da localidade.
- **Portabilidade entre provedores**: o contrato deve funcionar em Groq, OpenAI,
  Cerebras, Anthropic e no stub em processo. A cobertura do modo JSON varia
  acentuadamente entre provedores.
- **Compatibilidade retroativa**: os testes existentes, o portão de avaliação e
  a SPA devem continuar funcionando durante a migração. Sem reescrita de "big
  bang".
- **Sinal de avaliação**: o tipo estruturado mapeia diretamente para as
  expectativas must_refuse / must_escalate que os casos de avaliação já
  carregam, de modo que o avaliador se torna uma verificação de discriminador de
  uma única linha.
- **Orçamento de spans**: os atributos de trace para a resposta estruturada
  devem caber no orçamento de observabilidade existente (política de spans apenas
  com metadados da [ADR-0006](./adr-0006-observability.md)).

## Opções consideradas

- **Opção A**: Manter a prosa + ampliar as tabelas de marcadores de substrings
  por localidade + adicionar camadas de expressões regulares por localidade.
- **Opção B**: Migrar cada adaptador para o uso nativo de ferramentas com uma
  única ferramenta `agent_reply` cujo esquema imponha o envelope.
- **Opção C**: Adicionar um esquema Pydantic `AgentReply`, solicitar o modo JSON
  por provedor (cada adaptador degrada com cortesia para a melhor superfície de
  JSON disponível), validar na camada do agente, consumir o
  discriminador na camada do avaliador e descontinuar a correspondência de
  substrings em três etapas.

## Resultado da decisão

Opção escolhida: **Opção C** — esquema Pydantic + modo JSON por
provedor + descontinuação escalonada da camada de substrings.

A única razão determinante é a assimetria entre provedores do
suporte ao uso de ferramentas: a Anthropic oferece uso de ferramentas de forma
nativa, os provedores compatíveis com OpenAI (Groq, OpenAI, Cerebras) oferecem
`response_format={"type":"json_schema",...}` diretamente, e o caminho do
cliente stub não precisa de nenhum dos dois. A Opção B forçaria os
adaptadores compatíveis com OpenAI a tomar um desvio desnecessário para o uso de
ferramentas apenas para igualar a Anthropic. A Opção C deixa cada adaptador
usar seu idioma nativo, e a camada do agente valida uma forma agnóstica ao
provedor na saída.

A resposta estruturada é um pequeno envelope validado com quatro campos:

- `kind` — um entre `refusal`, `answer` ou `escalation` (o
  discriminador que os avaliadores leem).
- `text` — a mensagem do assistente renderizada na localidade (não vazia).
- `citations` — a lista de ids de chunks da KB que respaldam a resposta.
- `rationale` — uma breve explicação interna (com comprimento limitado).

A migração foi entregue em três etapas:

1. **Aditiva**: incorporar o esquema; ampliar a requisição de completion e
   os tipos de resultado com campos opcionais de modo JSON; encadear a carga
   útil do modo JSON pelo transporte compartilhado; definir a resposta
   estruturada no estado do agente a partir do nó de geração de resposta e
   dos helpers de emissão de recusa / resposta / escalação; fazer com que os
   avaliadores prefiram o `kind` estruturado quando presente e recorram aos
   marcadores de substrings quando ausente.
2. **Migração de testes**: reescrever as asserções de recusa / escalação /
   avaliador para que leiam o novo discriminador `kind`.
3. **Exclusão atômica**: remover as tabelas de marcadores de substrings e os
   helpers de correspondência de prosa; remover os ramos de fallback; migrar o
   call-site posterior aos guardrails para que consuma a resposta estruturada
   quando ela estiver disponível.

A postura do modo JSON por provedor:

- **Groq / OpenAI / Cerebras**: nativo
  `response_format={"type":"json_schema","json_schema":{...,"strict":true}}`
  por meio do construtor de cargas úteis compartilhado compatível com OpenAI.
- **Anthropic**: sem sinalizador nativo; injetar um preâmbulo de modo JSON na
  mensagem de sistema e analisar a resposta com tolerância. A migração para o uso
  de ferramentas é adiada (cascatas para a Anthropic são raras; a
  abordagem do preâmbulo mantém esse provedor utilizável sem uma reescrita mais
  profunda do adaptador).
- **Stub**: emite um envelope de resposta predefinido reutilizando as
  heurísticas existentes sensíveis à localidade.
- **Fallback**: relé transparente; o campo de requisição do modo JSON
  sobrevive inalterado ao longo de primário → fallback → último recurso.

### Confirmação

- Um teste dedicado fixa a forma do esquema e o ciclo de ida e volta.
- Cada teste de adaptador verifica a forma da carga útil do modo JSON na requisição
  e o campo estruturado na resposta.
- Cada teste de integração do grafo verifica que o `kind` da resposta
  estruturada corresponde ao caminho esperado.
- Uma auditoria pós-migração confirma zero referências às antigas tabelas de
  marcadores de substrings dentro da camada de avaliação.

## Consequências

### Positivas

- O discriminador é invariante à localidade e sobrevive a qualquer paráfrase
  que o modelo emita.
- Adicionar um novo subtemplate de recusa é um ramo de tipo de resposta de uma
  única linha, não uma ampliação da tabela de marcadores.
- Os avaliadores se tornam triviais: uma única verificação de igualdade do
  discriminador por caso.
- O envelope estruturado é o portador natural para a posterior
  evolução dos spans de citação e para o avaliador de recall da recuperação.
- O sinal de avaliação se torna estrutural; paráfrases de mesma semântica
  pontuam de forma idêntica.

### Negativas

- As respostas da Anthropic sob o modo JSON pagam ~50 tokens de entrada por
  turno pelo preâmbulo do esquema. As cascatas para a Anthropic são raras em uma
  configuração com Groq como primário, de modo que o custo acumulado é pequeno,
  mas diferente de zero.
- Uma nova superfície de abstração (o envelope de resposta e seu enum de tipo) é
  adicionada à API pública do pacote do agente.
- A camada de transporte ganha dois campos de requisição opcionais e um
  campo de resultado opcional; os adaptadores de provedor devem respeitá-los ou
  documentar por que não o fazem.

### Neutras

- O contrato de renderização da SPA não muda: o conteúdo da última mensagem
  ainda recebe o `text` renderizado na localidade. O envelope estruturado é
  observável no estado do agente e nos spans de trace, mas não
  no fluxo SSE (a ampliação dos tipos de evento SSE foi tratada
  separadamente no streaming de tokens).
- A temperatura para chamadas em modo JSON é reduzida a 0.0; os caminhos de
  forma livre mantêm o padrão existente de 0.2.

## Prós e contras das opções

### Opção A: ampliar as tabelas de marcadores por localidade

- Boa, porque não requer mudanças nos adaptadores.
- Ruim, porque as tabelas de marcadores crescem com cada nova localidade e
  cada novo subtemplate; a deriva entre os marcadores da camada de avaliação e
  a expressão regular da camada de guardrails piora.
- Ruim, porque o sinal de avaliação permanece acoplado à prosa; as paráfrases
  ainda pontuam mal.

### Opção B: uso nativo de ferramentas em todos os provedores

- Boa, porque o esquema é imposto no limite do provedor.
- Ruim, porque Groq / OpenAI / Cerebras ganham um desvio de uso de ferramentas que
  não precisam (já oferecem json_schema diretamente).
- Ruim, porque a taxa de acionamento do uso de ferramentas (o modelo decidindo
  quando chamar a ferramenta) é um modo de falha adicional que não existe com um
  `response_format` forçado.

### Opção C (escolhida): esquema Pydantic + modo JSON por provedor + descontinuação escalonada

- Boa, porque cada adaptador usa seu idioma nativo.
- Boa, porque a migração é escalonada e reversível em cada
  checkpoint.
- Boa, porque o envelope estruturado é o portador natural para
  os posteriores spans de citação e o avaliador focado apenas na recuperação.
- Ruim, porque a falta de um sinalizador nativo na Anthropic força uma
  postura de preâmbulo de prompt + análise tolerante que outros adaptadores não
  precisam.

## Mais informações

- [ADR-0001](./adr-0001-orchestration.md) — estado do agente e LangGraph
- [ADR-0002](./adr-0002-llm-vendor-abstraction.md) — Protocolo do cliente
  de LLM
- [ADR-0003](./adr-0003-eval-harness.md) — Protocolo do avaliador
- [ADR-0005](./adr-0005-guardrails.md) — contrato de recusa e escalação
- [ADR-0006](./adr-0006-observability.md) — política de spans apenas com
  metadados
- MADR 4.0.0: <https://adr.github.io/madr/>
