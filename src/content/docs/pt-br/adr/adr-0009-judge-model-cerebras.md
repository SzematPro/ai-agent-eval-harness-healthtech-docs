---
title: "ADR-0009: Modelo juiz de avaliação (Cerebras)"
description: Por que o modelo juiz de avaliação é o Cerebras gpt-oss-120b, substituindo a escolha anterior do Anthropic Haiku apenas no ponto do modelo juiz.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0009: Modelo juiz de avaliação - Cerebras substitui a escolha do Anthropic Claude Haiku na ADR-0003

- Status: Aceito
- Data: 2026-05-20
- Responsáveis pela decisão: Waldemar Szemat
- Substitui (em parte): [ADR-0003](./adr-0003-eval-harness.md), apenas na escolha do modelo juiz

## Contexto e definição do problema

A [ADR-0003](./adr-0003-eval-harness.md) ("Arcabouço de avaliação") foi aceita em
2026-03-18. Ela selecionou a arquitetura geral de avaliação (um núcleo
artesanal em pytest orquestrando DeepEval, Ragas, Phoenix e Promptfoo) e,
dentro dessa arquitetura, nomeou o **Anthropic Claude Haiku** como o juiz
LLM fixado para os avaliadores apoiados em juiz (fundamentação, fidelidade,
alucinação, rubricas de tom). A ADR-0003 descrevia o juiz como um modelo
Anthropic Haiku fixado, selecionado por meio de uma configuração de modelo juiz.

O arcabouço, tal como é entregue, não executa esse juiz. O juiz que o arcabouço
invoca hoje é o **Cerebras** `gpt-oss-120b`: a configuração declara
o Cerebras como o provedor do juiz e o `gpt-oss-120b` como o modelo juiz, o
wrapper do juiz recebe um cliente Cerebras no caminho de eval-CI, e os
avaliadores apoiados em juiz são ativados somente quando há uma chave de API do Cerebras presente.
A documentação de implantação, a visão geral do projeto e o relatório de avaliação
descrevem o caminho do juiz como governado pela presença de uma chave de API do
Cerebras. O arcabouço migrou para o Cerebras depois que a ADR-0003 foi aceita, pelas
razões de camada gratuita e de latência expostas abaixo; a mudança foi feita
em código, mas nunca registrada como uma decisão.

Mudar o modelo juiz depois que uma ADR foi aceita não é uma correção de
erro de digitação. Conforme a própria convenção de controle de mudanças do projeto (se um
texto precisa relitigar ou emendar uma ADR anterior, registre uma nova ADR e
marque a antiga como substituída), uma mudança substantiva em uma decisão registrada
é, ela mesma, uma decisão e precisa ser registrada. Como registramos a
mudança do modelo juiz para que a trilha de governança seja honesta: o arcabouço executa um
juiz Cerebras, a ADR-0003 ainda diz Anthropic Claude Haiku, e os dois
precisam ser reconciliados sem apagar o registro histórico?

## Fatores da decisão

- **Realidade de código e documentação.** A configuração, o wrapper do juiz, o
  adaptador do DeepEval, a visão geral do projeto e o relatório de avaliação mais recente
  já descrevem um caminho de juiz governado pelo Cerebras. O conjunto de ADRs é o único
  lugar que ainda diz Anthropic Claude Haiku; a documentação precisa convergir
  para o que o arcabouço de fato faz.
- **Orçamento de camada gratuita.** A restrição permanente do projeto é um estado
  estável de US$ 0/mês. O Cerebras oferece uma camada gratuita dimensionada para a carga de trabalho do juiz
  (grande cota diária de tokens, sem necessidade de cartão); o Anthropic Claude Haiku
  é cobrado por token. Um juiz em camada gratuita mantém a CI de avaliação dentro do
  envelope de US$ 0/mês sem um teto de tokens.
- **Superfície compatível com OpenAI.** O Cerebras expõe um endpoint de
  chat-completions compatível com OpenAI, de modo que o juiz reutiliza o mesmo formato de adaptador
  (um cliente Cerebras espelhando o cliente Groq) que o arcabouço já entrega.
  Nenhum segundo SDK e nenhum formato de mensagem específico da Anthropic são necessários no
  caminho do juiz.
- **Honestidade do controle de mudanças.** A convenção do projeto exige uma
  ADR substituidora para qualquer revisão de uma decisão anterior. Uma edição silenciosa no
  corpo da ADR-0003 violaria essa convenção e apagaria o fato de que
  a escolha do juiz mudou.
- **Preservar o restante da ADR-0003.** Apenas a linha do modelo juiz muda.
  O núcleo artesanal em pytest, a composição DeepEval / Ragas / Phoenix / Promptfoo
  e a estrutura de três fluxos de trabalho (gate de PR, juiz noturno
  e red-team) continuam todos válidos. A substituição precisa ser delimitada ao
  modelo juiz e nada mais.

## Opções consideradas

- **Registrar o Cerebras como o juiz por meio de uma nova ADR que substitui a ADR-0003
  em parte** (escolhida): registrar a ADR-0009, marcar a ADR-0003 como substituída no
  ponto do modelo juiz apenas, manter o corpo da ADR-0003 como o registro histórico.
- **Editar silenciosamente o corpo da ADR-0003** para substituir o Anthropic Claude Haiku
  pelo Cerebras em todo o texto.
- **Reverter o arcabouço para um juiz Anthropic Claude Haiku** para que o código
  corresponda ao texto existente da ADR-0003.

## Resultado da decisão

Opção escolhida: **registrar o Cerebras como o juiz de avaliação por meio desta ADR, que
substitui a ADR-0003 apenas na escolha do modelo juiz.** O juiz de avaliação é o
Cerebras (`gpt-oss-120b` por padrão, atrás de uma configuração de modelo juiz
ajustável), acessado por meio do adaptador do cliente Cerebras; os avaliadores apoiados em
juiz (fundamentação, fidelidade, alucinação) são executados somente quando há uma
chave de API do Cerebras definida, e o gate determinístico de PR é executado sem chave,
sem nenhum juiz. Este é o caminho do juiz que o arcabouço entrega e executa
hoje. A ADR-0003 mantém seu status `Aceito` com uma anotação "substituída em parte por
ADR-0009"; seu corpo é mantido inalterado, porque uma ADR substituída
retém seu texto original como o registro histórico (convenção MADR). O
restante da ADR-0003, tudo além da escolha do modelo juiz,
permanece como escrito.

Editar silenciosamente a ADR-0003 foi rejeitado: isso apagaria o fato de que a
decisão mudou e violaria a convenção documentada de controle de mudanças
do projeto. Reverter o arcabouço para o Anthropic Claude Haiku foi rejeitado:
isso reintroduziria uma dependência cobrada por token no caminho de avaliação
contra a restrição de US$ 0/mês, e significaria reescrever código funcional para
corresponder a um documento desatualizado, em vez do contrário.

### Confirmação

- A configuração declara o Cerebras como o provedor do juiz e o
  `gpt-oss-120b` como o modelo juiz; o adaptador do cliente Cerebras e o
  caminho Cerebras da fábrica de LLM são cobertos por testes unitários.
- Os avaliadores apoiados em juiz são ativados somente quando há uma chave de API do Cerebras
  presente; com a chave ausente, o relatório de avaliação carrega um cabeçalho de
  juiz-desativado e o gate é executado apenas contra avaliadores determinísticos.
- A ADR-0003 carrega uma anotação "substituída em parte por ADR-0009" tanto em
  seu status de frontmatter quanto em sua linha de status no corpo, e aponta para
  esta ADR.
- O índice de ADRs lista a ADR-0009 e registra a substituição em seu
  log de substituições.

## Consequências

### Positivas

- O conjunto de ADRs agora corresponde ao arcabouço: o juiz que a documentação
  descreve é o juiz que o código executa.
- O juiz permanece dentro do envelope da camada gratuita de US$ 0/mês; sem cobrança por token
  da Anthropic no caminho de avaliação.
- O juiz reutiliza o adaptador do cliente Cerebras compatível com OpenAI que o
  arcabouço já entrega; sem um segundo SDK no caminho do juiz.
- A trilha de controle de mudanças é honesta: a mudança do modelo juiz é registrada
  como uma decisão, não enterrada em um diff de código.

### Negativas

- O conjunto de ADRs agora carrega sua primeira substituição, então um leitor precisa
  acompanhar a ADR-0003 para frente até a ADR-0009 para obter o modelo juiz atual.
  Mitigado pela anotação na ADR-0003 e pelo log de substituições no
  índice.
- O Cerebras torna-se uma dependência estrutural de camada gratuita no caminho do juiz;
  uma mudança em seus termos de camada gratuita forçaria outra decisão de
  modelo juiz. Uma chave de API da Anthropic permanece conectável como a alternativa de juiz
  paga do operador, o que limita esse risco.

### Neutras

- Um resumo vivo das decisões do projeto é atualizado para nomear o Cerebras como
  o modelo juiz e apontar para esta ADR.
- O id do modelo juiz permanece configurável; o padrão muda de uma
  string de Claude Haiku para `gpt-oss-120b`, mas a superfície de sobreposição
  permanece inalterada.
- Uma chave de API da Anthropic continua sendo um provedor suportado e conectável pelo usuário para uma
  organização que prefere executar um juiz Anthropic pago; esta ADR
  muda o juiz padrão, não o conjunto de provedores selecionáveis.

## Prós e contras das opções

### Registrar o Cerebras por meio de uma nova ADR que substitui a ADR-0003 em parte

- Bom, porque segue a convenção documentada de controle de mudanças
  do projeto (uma nova ADR para qualquer revisão de uma decisão anterior).
- Bom, porque mantém o corpo da ADR-0003 intacto como o registro histórico
  de por que o arcabouço foi estruturado como foi.
- Bom, porque converge o conjunto de ADRs para o que o código de fato faz
  sem reescrever a história.
- Ruim, porque introduz o primeiro link de substituição que um leitor precisa
  acompanhar.

### Editar silenciosamente o corpo da ADR-0003

- Bom, porque deixa uma única ADR-0003 internamente consistente.
- Ruim, porque apaga o fato de que a escolha do juiz mudou depois que a
  ADR foi aceita.
- Ruim, porque viola a própria convenção do projeto de que uma revisão de
  uma decisão registrada é registrada como uma nova ADR.

### Reverter o arcabouço para um juiz Anthropic Claude Haiku

- Bom, porque o código então corresponderia ao texto existente da ADR-0003 sem
  nenhuma ADR nova.
- Ruim, porque reintroduz uma dependência cobrada por token no caminho de
  avaliação, contra a restrição de US$ 0/mês.
- Ruim, porque reescreve código funcional para corresponder a um documento desatualizado em vez
  de atualizar o documento para corresponder à realidade.

## Mais informações

- [ADR-0003: Arcabouço de avaliação](./adr-0003-eval-harness.md) (a decisão substituída em parte)
- [ADR-0002: Abstração de fornecedor de LLM](./adr-0002-llm-vendor-abstraction.md) (o Protocol de cliente LLM que o adaptador do juiz implementa)
- Documentação do Cerebras Inference: <https://inference-docs.cerebras.ai/>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Rubricas cientes de recursos

O juiz avalia cinco dimensões de rubrica específicas de recursos quando um caso
golden carrega tags de recurso em seus metadados. Os recursos são: **voice**,
**i18n** (internacionalização), **pii** (redação de PII), **governance**
(cobertura regulatória) e **data_layer** (gating por chave da camada de dados /
exibição de custo).

- Um conjunto de templates de rubrica de recurso define as cinco descrições de
  rubrica de recurso, cada uma com critérios concretos de pontuação 1.0 / 0.5 / 0.0.
- O avaliador de fundamentação estende condicionalmente sua rubrica com entradas
  de recurso quando um caso carrega metadados de recurso. Casos sem metadados
  de recurso produzem pontuação idêntica à de referência.
- As chaves de pontuação de recurso seguem o padrão `feature_{name}` (por exemplo,
  `feature_voice`, `feature_i18n`).
- Um gate de cobertura de recursos na CI verifica que todas as cinco categorias de recurso
  têm ao menos um caso golden e que nenhuma dimensão de recurso retorna uma
  justificativa malformada em todos os casos (detecção de malformação). Pontuações zero
  legítimas com justificativas não malformadas não são sinalizadas.
- Tolerância de regressão: a avaliação do gate aceita parâmetros opcionais de
  agregados de referência (+/- 0.05) e de referência por localidade (+/- 0.08) para
  detecção de regressão.

A seleção do modelo juiz (Cerebras `gpt-oss-120b`) não é alterada por esta
estrutura de rubrica.
