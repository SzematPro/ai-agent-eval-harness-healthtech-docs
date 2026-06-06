---
title: "ADR-0005: Guardrails e postura regulatória"
description: Por que a classificação de escopo, os templates de recusa e o escalonamento de red-flag são módulos de primeira classe atrelados a uma linha regulatória.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0005: Guardrails (classificador de escopo + templates de recusa + escalonamento como módulos de primeira classe)

- Status: Accepted
- Data: 2026-03-18
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

O agente é uma ferramenta conversacional de apoio à adesão a medicamentos. Ele
não é um dispositivo médico, não é autorizado pela FDA, não é clinicamente
validado, e é construído sobre dados 100% sintéticos. Para permanecer de forma
credível desse lado da linha, o contrato de design acompanha as orientações
finais da FDA 2026 de General Wellness e Clinical Decision Support Software
(emitidas em 2026-01-06), a orientação WHO LMM e uma ampla consciência
internacional (MHRA, EU AI Act). A referência de postura regulatória é o
companheiro de formato longo deste ADR.

A pergunta arquitetural é concreta: onde vivem os comportamentos relevantes
para a segurança? Se conformidade de escopo, recusa e escalonamento são
truques de engenharia de prompt espalhados dentro de um único prompt de sistema,
eles não são auditáveis, não são testáveis e derivam a cada edição de prompt.
Se eles são módulos de primeira classe com seus próprios arquivos, testes e
fatias de avaliação, eles se tornam artefatos inspecionáveis.

Como tornamos a superfície de guardrail inspecionável, testável e atrelada
1:1 a uma postura regulatória, sem transformar o agente em um
brinquedo de lista negra de palavras-chave?

## Direcionadores da Decisão

- O agente não deve diagnosticar, prescrever, alterar doses, interpretar
  exames laboratoriais / de imagem ou interagir com clínicos; a linha
  FDA 2026 General Wellness / CDS é o contrato
- Toda afirmação clínica deve citar um cartão de KB; a recusa em caso de
  não correspondência é o padrão, não um caso especial
- O escalonamento de red-flag tem uma lista codificada pareada com uma fatia
  de avaliação; falsos negativos custam muito mais que falsos positivos
- A camada de guardrail deve ser substituível: uma implementação futura
  poderia plugar NeMo Guardrails, Guardrails AI ou LLM Guard
- A história de auditoria deve ser legível para um não engenheiro (revisor
  clínico, revisor familiarizado com SaMD)

## Opções Consideradas

- **Três módulos de guardrail de primeira classe**: um classificador de escopo
  mais seletor de template de recusa, detecção de red-flag mais
  orquestração de handoff, e templates de recusa calibrados (escolhida)
- **NVIDIA NeMo Guardrails** como o motor de guardrail, com rails Colang
  codificando as mesmas restrições
- **Guardrails AI** com validadores de saída estruturada
- **Um único prompt de sistema grande** codificando todas as regras inline
- **Terceirizar para o LLM**, sem nenhuma camada programática de guardrail

## Resultado da Decisão

Opção escolhida: **classificador de escopo + templates de recusa + escalonamento /
handoff como módulos de guardrail de primeira classe**, com o contrato de design
fixado na linha de orientação FDA 2026 General Wellness / CDS Software.
A camada de guardrail é um pequeno pacote Python, não um motor de YAML / DSL;
os três módulos expõem funções tipadas que os nós do LangGraph chamam
explicitamente:

- O classificador de escopo roda em todo turno do usuário antes da redação;
  vereditos fora de escopo roteiam diretamente para um nó de recusa
- O renderizador de recusa seleciona um template de recusa calibrado e
  localizado que não recusa demais perguntas benignas
- O detector de escalonamento avalia a lista codificada de red-flag
  (suicidalidade, dor no peito, sinais de AVC, reação alérgica grave,
  distúrbio visual súbito em varfarina, gravidez +
  teratógeno, etc.) e pode disparar um `interrupt()` do LangGraph para o
  caminho HITL

O contrato de design do agente é explícito na referência de postura regulatória
e neste ADR: ele NÃO diagnostica, prescreve, altera doses, interpreta exames
laboratoriais / de imagem ou interage com clínicos. Toda afirmação clínica deve
citar um cartão de KB por id; se nenhum cartão corresponder, o agente
recusa com uma resposta em template, ciente da localidade. NeMo Guardrails e
Guardrails AI são alternativas documentadas; as interfaces no formato de
Protocol permitem que um contribuidor futuro troque implementações sem
reescrever o grafo do agente.

### Confirmação

- Fatia de avaliação para conformidade de escopo: nenhuma elicitação de
  aconselhamento de dosagem, nenhuma pesca de diagnóstico, templates de recusa
  corretos
- Fatia de avaliação para correção de escalonamento: precisão e recall contra
  um conjunto gold de red-flag, peso de falso-negativo muito maior que o de
  falso-positivo no avaliador
- Fatia de avaliação para o equilíbrio recusa-vs-recusa-em-excesso: consultas
  benignas sobre adesão, MI, efeitos colaterais e identificação de comprimidos
  não devem ser recusadas
- A referência de postura regulatória lista comportamentos proibidos,
  espelhados por uma docstring no pacote de guardrails
- A verificação de citação obrigatória é um avaliador determinístico de gate de PR

## Consequências

### Positivas

- O comportamento de guardrail é inspecionável: um leitor (ou um revisor
  clínico) abre três módulos e vê exatamente o que o agente
  fará e não fará
- O harness de avaliação tem fatias nomeadas para as dimensões de segurança,
  não "confie no prompt"
- O contrato de design é pequeno, escrito em inglês claro na
  referência de postura regulatória e reproduzido neste ADR;
  o desvio é detectável por diff
- Os bullets de "O que isto NÃO é" são impostos por código, não por tom
- Uma troca futura para NeMo Guardrails ou Guardrails AI substitui
  implementações atrás do mesmo Protocol, sem tocar
  os nós do LangGraph

### Negativas

- A equipe é dona dos templates de recusa e da lista de red-flag; ambos
  revisados em uma cadência
- Um classificador de escopo com sabor de palavra-chave é menos expressivo que
  uma DSL completa de guardrail; mitigado usando o LLM como o
  classificador atrás do Protocol, não regex estático
- A correção de escalonamento depende da lista de red-flag, tratada como
  um artefato versionado

### Neutras

- O projeto ganha três pequenos módulos e um dataset de templates de recusa
  e gatilhos de red-flag
- O design no formato de Protocol mantém uma troca por NeMo / Guardrails AI como
  uma opção futura, não uma dependência atual
- A postura regulatória vive em três lugares (este ADR, a
  referência de postura regulatória, o resumo "O que isto NÃO é") que
  precisam permanecer em sincronia

## Prós e Contras das Opções

### Três módulos de guardrail de primeira classe

- Boa, porque a superfície é auditável em Python, não em YAML
- Boa, porque o harness de avaliação chama diretamente os módulos
  para fazer asserções contra a lista de red-flag e os templates de recusa
- Boa, porque uma troca futura por NeMo Guardrails ou Guardrails AI
  é uma mudança em nível de Protocol
- Ruim, porque a equipe é dona dos dados de template e de red-flag
- Ruim, porque um classificador com sabor de palavra-chave é menos expressivo
  que uma DSL de guardrail em casos de borda

### NVIDIA NeMo Guardrails

- Boa, porque o Colang dá uma DSL declarativa de rails com uma
  comunidade ativa
- Ruim, porque adiciona uma nova dependência de runtime e uma nova
  linguagem a aprender
- Ruim, porque o motor de rails se torna a fonte da verdade, não
  Python tipado; o harness de avaliação tem que envolver o Colang

### Guardrails AI

- Boa, porque a história de validação de saída estruturada é forte
- Ruim, porque o framework se centra em validar a estrutura da saída do
  LLM, não em decisões de recusa / escalonamento; essa lógica
  ainda viveria em outro lugar

### Um único prompt de sistema grande

- Boa, porque zero código novo
- Ruim, porque as restrições não são inspecionáveis, não são testáveis e
  não são auditáveis; edições de prompt regridem a segurança silenciosamente

### Terceirizar para o LLM (sem camada programática)

- Boa, porque o ajuste de segurança do LLM pega muitos padrões
  adversariais
- Ruim, porque segurança somente por prompt não é defensável para uma
  implementação de referência de healthtech

## Mais Informações

- FDA "General Wellness: Policy for Low-Risk Devices" (final de 2026,
  emitida em 2026-01-06):
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices>
- FDA "Clinical Decision Support Software" (final de 2026):
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software>
- WHO "Ethics and governance of AI for health: Guidance on LMMs":
  <https://www.who.int/publications/i/item/9789240084759>
- MHRA "Software and AI as a Medical Device":
  <https://www.gov.uk/government/publications/software-and-artificial-intelligence-ai-as-a-medical-device>
- NVIDIA NeMo Guardrails: <https://github.com/NVIDIA/NeMo-Guardrails>
- Guardrails AI: <https://www.guardrailsai.com/docs>
- Documento companheiro: [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/)
- MADR 4.0.0: <https://adr.github.io/madr/>

## Roteador de escalonamento tal como construído

**Mecanismo de escalonamento.** O módulo de escalonamento roda uma lista
determinística de red-flag por regex dentro do nó de pré-guardrail, antes do
classificador de escopo; em uma correspondência ele emite uma decisão de
`escalation` cujos metadados carregam um payload de handoff estruturado
(`category`, `severity`, `matched_terms`, `subcategories`, `template_slug`) e
coloca o turno em curto-circuito para um template de escalonamento ciente da
localidade. O payload de metadados é a costura tipada que um caminho de
`interrupt()` com humano no circuito poderia consumir no futuro; o
curto-circuito determinístico é o caminho distribuído porque ele é compatível
com o harness de avaliação de passagem única e sem chaves.

**Localização da lista de red-flag.** A lista é uma constante de módulo inline,
rastreada por diff, consistente com as constantes de regex inline do
classificador de escopo e os templates inline do módulo de recusa. A lista é
inspecionável, o desvio é detectável por diff, e a revisão acontece na mesma
cadência que o resto do módulo de guardrails.

**Taxonomia de red-flag aguda.** O roteador de escalonamento determinístico
cobre dez categorias agudas: ideação suicida, anafilaxia / reação alérgica
grave, dor no peito cardíaca aguda, sangramento grave, asma grave / dificuldade
respiratória aguda, **AVC / sinais FAST**, **emergência hipertensiva**,
**hipoglicemia grave**, **overdose / intenção letal** e a **coocorrência
gravidez + teratógeno**. Esse conjunto de dez categorias é o que o módulo de
escalonamento distribui, o que a lista de red-flag publicada documenta e o que a
referência de postura regulatória registra. Cada categoria carrega um backstop
es-419 / pt-BR ao lado de seus padrões em inglês, de modo que o piso
determinístico se sustenta de forma idêntica nos três locais. Duas categorias
são delimitadas por intenção ou por coocorrência para manter alto recall sem
disparar em excesso: overdose / intenção letal dispara sozinha diante de um
léxico de letalidade inequívoco, enquanto tokens ambíguos (perigoso, demais)
escalonam apenas quando um enquadramento de autoconsumo os habilita, de modo que
"quantos comprimidos vêm em uma caixa" nunca dispara; o braço gravidez +
teratógeno dispara apenas quando um sinal de gravidez e um medicamento
teratógeno curado coocorrem na mesma cláusula, de modo que "grávida + vitamina
pré-natal" nunca dispara. O recall de escalonamento é mantido em >= 0.95. A
detecção é intencionalmente cega a negações - uma escolha deliberada de alto
recall motivada pela assimetria de custo de falso-negativo declarada acima
(escalonar em "sem dor no peito" é um falso positivo aceito; uma red flag não
detectada não é).

**Um padrão adiado para a camada de prompt** (não o roteador determinístico):
um distúrbio visual súbito em um anticoagulante. Ele é tratado pela camada de
prompt no ínterim; o adiamento é registrado na docstring do módulo de
escalonamento.

### Detecção resistente à ofuscação

A detecção de red-flag no nó pré-guardrail roda sobre uma cópia normalizada com
NFKC do turno que remove os caracteres Unicode `Cf` (de largura zero) e dobra um
conjunto curado de homoglifos cirílicos / gregos para latim, aplicado **antes**
do curto-circuito de validação de entrada, de modo que a ideação entremeada com
caracteres de largura zero escalona em vez de se desviar para uma recusa por
entrada malformada. O conjunto de dobra é uma denylist deliberada de
confundíveis de alta frequência, não a tabela completa de confundíveis do
Unicode, para evitar dobrar em excesso letras acentuadas legítimas de es-419 /
pt-BR; a evasão residual com homoglifos exóticos é uma limitação aceita coberta
pelo backstop do LLM. A normalização é apenas para detecção - o texto original
do usuário (com PII redigida) continua sendo o registro transparente e nunca é
sobrescrito com a forma normalizada.
