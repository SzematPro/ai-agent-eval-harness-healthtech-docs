---
title: "ADR-0003: Harness de avaliação"
description: Por que o harness de avaliação é um núcleo artesanal em pytest que orquestra DeepEval, Ragas, Phoenix e Promptfoo.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0003: Harness de avaliação (núcleo artesanal em pytest + avaliadores componíveis)

- Status: Accepted; substituído em parte pelo [ADR-0009](./adr-0009-judge-model-cerebras.md) quanto à escolha do modelo juiz
- Data: 2026-03-18
- Responsáveis pela decisão: Waldemar Szemat

> Nota de substituição: este ADR registra o Anthropic Claude Haiku como o
> juiz LLM fixado. Essa escolha específica é substituída pelo
> [ADR-0009](./adr-0009-judge-model-cerebras.md), que registra o Cerebras
> (`gpt-oss-120b`) como o juiz de avaliação que o harness executa hoje. O
> restante deste ADR (o núcleo artesanal em pytest, a composição DeepEval /
> Ragas / Phoenix / Promptfoo, os três workflows) ainda se mantém. O corpo
> abaixo é mantido inalterado como registro histórico, conforme a convenção
> MADR de que um ADR substituído retém seu texto original.

## Contexto e Definição do Problema

O harness de avaliação é o centro deste projeto. O agente
é o veículo; o harness é o artefato. Um leitor tem que sair
convencido de que o harness é real: ele carrega datasets golden em JSONL,
executa o agente de ponta a ponta, emite traces por turno, pontua esses traces
ao longo de dez dimensões de avaliação e produz um veredito que bloqueia PRs
mais um relatório de formato mais longo.

Nenhuma das "plataformas de avaliação de agentes" de prateleira cobre todas as
dez dimensões para um agente multi-turno do domínio de saúde. O DeepEval é forte
em métricas julgadas no estilo G-Eval e em métricas conversacionais; o Ragas
é forte em RAG e em precisão de uso de ferramentas; o Phoenix dá um backend
OTel com UI de tracing; o Promptfoo é o runner canônico de red-team / OWASP
LLM Top 10. Um núcleo artesanal em pytest que orquestra essas
bibliotecas é a menor quantidade de cola que entrega todas as dez
dimensões enquanto permanece portável.

Como estruturamos o harness de avaliação de modo que (a) ele rode como um job
pytest normal em CI, (b) avaliadores determinísticos bloqueiem cada PR de forma
barata, (c) o LLM-como-juiz rode todas as noites sem estourar o orçamento do
nível gratuito, (d) os cenários de red-team rodem todas as noites fora de banda
e (e) cada avaliador possa ser trocado ou atualizado sem reescrever o runner?

## Direcionadores da Decisão

- Cobertura das dez dimensões de avaliação com as quais o projeto se compromete
- Teto de custo do gate de PR: apenas avaliadores determinísticos + LLM barato
  em cada PR; LLM-como-juiz todas as noites
- Reprodutibilidade: um contribuidor deve ser capaz de rodar a suíte de
  avaliação localmente e obter o mesmo veredito que o CI dá
- Fixar o modelo juiz exatamente (provedor + modelo + versão) para que a
  pontuação seja estável entre execuções
- Higiene de licenças: toda biblioteca de avaliador deve ter licença
  permissiva (Apache 2 / MIT / ELv2 aceitáveis para ferramental)
- Evitar uma "plataforma de avaliação de IA" SaaS caixa-preta; o harness tem
  que ser portável e auto-hospedado

## Opções Consideradas

- **Núcleo artesanal em pytest + DeepEval + Ragas + Phoenix +
  Promptfoo** com Anthropic Claude Haiku como o juiz LLM fixado
  (escolhida)
- **Um SaaS de fornecedor (Braintrust / Galileo / LangSmith Eval)**
- **DeepEval puro** como o harness inteiro, com seus runners embutidos
  de dataset e relatório
- **Ragas puro** como o harness inteiro
- **OpenAI Evals** como o runner

## Resultado da Decisão

Opção escolhida: **núcleo artesanal em pytest orquestrando DeepEval,
Ragas, Phoenix e Promptfoo**, com Anthropic Claude Haiku como o
juiz LLM fixado (id do modelo atrás de uma flag de ambiente, versão
fixada). O harness tem três workflows:

- **Bloqueio de PR**: avaliadores determinísticos (regex, palavra-chave,
  correspondência de template de recusa, correspondência de lista de
  escalonamento, verificação de citação obrigatória) mais limiares de DeepEval /
  Ragas que não exigem um LLM (por exemplo, `FaithfulnessMetric` com um pequeno
  modelo Cerebras quando viável, `ToolCallAccuracy`). O PR falha em:
  faithfulness >= 0.85, alucinação <= 0.10, recall de escalonamento >= a barra
  configurada.
- **LLM-como-juiz noturno** (agendado): DeepEval G-Eval,
  `ConversationalGEval` para tom / empatia /
  adequação médica, Ragas
  `AgentGoalAccuracyWithReference`, `TopicAdherence`. Juiz =
  uma versão fixada do Anthropic Claude Haiku.
- **Red-team** (workflow separado): duas camadas. (a) Um gate de CI
  determinístico e sem chaves -- uma avaliação Promptfoo dos 13 casos
  adversariais feitos à mão; o shim conduz o agente LangGraph real usando um
  cliente stub offline; a camada de guardrail do agente decide, não o
  LLM. (b) Uma medição ao vivo separada e com chaves -- uma execução de red-team
  do Promptfoo com Groq `llama-3.3-70b-versatile` como alvo, OpenAI
  `gpt-4o` como gerador de ataque e Groq como avaliador.
  Não bloqueante; falhas reais são esperadas e documentadas com
  procedência.

O Phoenix é o sink de observabilidade durante as execuções de avaliação: cada
turno emite spans OTel pela fiação OpenInference existente do projeto (ver
[ADR-0006](./adr-0006-observability.md)), o Phoenix os coleta, e o harness anexa
as URLs de trace do Phoenix ao relatório de avaliação. O Inspect AI (UK AISI)
está reservado como uma tarefa bônus de avaliação de capacidades, opcional para
o milestone inicial.

Esta composição dá a todas as dez dimensões de avaliação um lar concreto,
mantém o gate de PR barato e nunca depende de uma plataforma de avaliação
fechada.

### Confirmação

- A suíte de avaliação roda o subconjunto de bloqueio de PR localmente e em CI;
  o job de CI falha nas violações de limiar configuradas
- Todo avaliador é implementado atrás de um pequeno Protocol `Scorer`; o
  runner não importa bibliotecas de avaliador diretamente
- O id do modelo juiz é lido de uma variável de ambiente `JUDGE_MODEL`,
  com padrão de uma string fixada de Claude Haiku; um teste unitário
  verifica que a string do pin é não vazia e bem formada
- Um relatório de red-team noturno é publicado como um artefato

## Consequências

### Positivas

- Todas as dez dimensões de avaliação têm um avaliador nomeado; a tabela de
  avaliação publicada mapeia 1:1 para os módulos de avaliação
- O gate de PR é barato e determinístico o suficiente para rodar a cada push
  sem queimar cotas do nível gratuito
- O LLM-como-juiz permanece noturno e usa um Claude Haiku fixado, o
  modelo Anthropic de menor custo por token que ainda pontua bem em
  rubricas de tom / empatia
- O Phoenix auto-hospedado dá um backend OTel real sem pressão de
  cota; sua licença ELv2 é aceitável para este caso de uso
- A suíte OWASP LLM Top 10 do Promptfoo cobre uma superfície de red-team que
  DeepEval / Ragas não cobrem, fixada a um catálogo de ataques público
- O harness é portável: sem lock-in de SaaS, toda dependência é
  de código aberto

### Negativas

- Quatro bibliotecas de avaliador significam quatro trilhas de atualização;
  mitigamos fixando versões minor
- O núcleo artesanal é código real que mantemos; ele justifica
  seu custo ao nos dar controle total sobre limiares e formato
  de relatório
- As chamadas ao juiz Anthropic Haiku são cobradas; a cadência noturna mais um
  pequeno teto de tokens as mantêm dentro do envelope de $0/mês

### Neutras

- O harness emite dois artefatos por execução, um relatório
  JSON legível por máquina e um resumo em Markdown
- O Inspect AI está reservado como uma tarefa opcional de avaliação de
  capacidades; o milestone inicial não depende dele
- O Phoenix e o Promptfoo rodam em perfis Docker, não no arquivo Compose
  principal, para manter pequena a imagem da demo ao vivo

## Prós e Contras das Opções

### Núcleo artesanal em pytest + DeepEval + Ragas + Phoenix + Promptfoo

- Boa, porque cada biblioteca é a melhor da categoria em sua fatia
  (métricas julgadas / métricas de RAG / backend OTel / red-team)
- Boa, porque o pytest já é o harness de testes do projeto
- Boa, porque todo avaliador é trocável atrás de um Protocol
- Ruim, porque quatro partes móveis têm que ser mantidas

### Um SaaS de fornecedor (Braintrust / Galileo / LangSmith Eval)

- Boa, porque a história do dashboard é excelente de imediato
- Ruim, porque o projeto precisa rodar com zero contas
- Ruim, porque as definições de avaliação vivem na UI de outra pessoa

### DeepEval puro

- Boa, porque o DeepEval tem boas métricas conversacionais
- Ruim, porque métricas com sabor de RAG como `ToolCallAccuracy` são
  mais idiomáticas no Ragas, e a superfície de red-team do Promptfoo fica
  descoberta

### Ragas puro

- Boa, porque o Ragas é a biblioteca canônica de avaliação de RAG
- Ruim, porque o Ragas carece das métricas conversacionais / de rubrica de tom
  de que precisamos; território do DeepEval

### OpenAI Evals

- Boa, porque o formato é bem conhecido
- Ruim, porque o runner é centrado em OpenAI e não mapeia
  de forma limpa para avaliações de agentes multi-turno

## Mais Informações

- Documentação do DeepEval: <https://deepeval.com/>
- Documentação do Ragas: <https://docs.ragas.io/>
- Documentação do Phoenix (Arize):
  <https://docs.arize.com/phoenix>
- Documentação do Promptfoo: <https://www.promptfoo.dev/docs/intro/>
- OWASP LLM Top 10:
  <https://owasp.org/www-project-top-10-for-large-language-model-applications/>
- Inspect AI (UK AISI): <https://inspect.ai-safety-institute.org.uk/>
- Model card do Anthropic Claude Haiku:
  <https://docs.anthropic.com/en/docs/about-claude/models>
- Framework de níveis de severidade de alucinação da npj Digital Medicine (2025)
- MADR 4.0.0: <https://adr.github.io/madr/>
