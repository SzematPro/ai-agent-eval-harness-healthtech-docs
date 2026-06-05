---
title: "ADR-0019: Invariante de dados somente sintéticos"
description: Por que o corpus de avaliação é 100% sintético a partir de fontes de domínio público, com uma lista de exclusão explícita e um ônus da prova no momento do PR.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0019: Invariante de dados somente sintéticos + lista de exclusão

- Status: Aceito
- Data: 2026-05-27 (retroativo — invariante desde a v0.4.0)
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

O harness de avaliação deve ser reproduzível por qualquer pessoa que faça fork do
repositório. Um revisor que precisasse assinar um Contrato de Uso de Dados (DUA)
antes de rodar `make eval` enfrentaria uma barreira real de atrito — e toda a
proposta da demo ("avaliação reproduzível, controlada por CI") seria minada.

Muitos conjuntos de dados de IA conversacional médica são restritos por DUA (MIMIC,
ChatDoctor, MedDialog, n2c2 / i2b2). Misturar qualquer um deles ao corpus de
avaliação propagaria a exigência de licenciamento para cada fork.

A abordagem somente sintética também elimina o vetor de ingresso de PHI por
construção: se nenhum dado real de paciente entra no conjunto de avaliação, nenhum
PHI pode vazar através do conjunto de avaliação.

Como mantemos o corpus de avaliação aberto e reproduzível ao mesmo tempo em que
garantimos que o projeto nunca ingira acidentalmente um conjunto de dados
restrito, e como tornamos a política verificável por um leitor casual em 30
segundos?

## Fatores de decisão

- **Reprodutibilidade**: cada revisor pode rodar `make eval` sem atrito de
  licenciamento.
- **Privacidade por construção**: nenhum PHI no corpus significa nenhum PHI
  através do corpus.
- **Auditabilidade de licenças**: cada cartão da KB e cada caso de avaliação carrega
  atribuição de fonte e uma tag de licença permissiva (CC0 ou domínio público).
- **Verificabilidade**: uma varredura de 30 segundos da política deve convencer um
  revisor de que a restrição é real e está sendo aplicada.

## Opções consideradas

- **Opção A**: Misturar dados reais e sintéticos; avaliação reproduzível
  condicionada à aceitação de um DUA por usuário.
- **Opção B**: Somente sintético, com fontes de domínio público de origem
  governamental / ONG (MedlinePlus, DailyMed, WHO EML, rótulos da FDA).
- **Opção C**: Somente sintético, com fontes parafraseadas a partir de material
  licenciado (por exemplo, diretrizes clínicas licenciadas parafraseadas em turnos
  sintéticos de pacientes).

## Resultado da decisão

Opção escolhida: **Opção B** — somente sintético com fontes de domínio público,
uma lista de exclusão explícita de conjuntos de dados restritos por DUA e um ônus
da prova no momento do PR para qualquer proposta de novo conjunto de dados.

A lista de exclusão (declarada na política de segurança do projeto):

- **MIMIC** (MIT Critical Care DB) — DUA via PhysioNet
- **ChatDoctor** — licença não comercial, diálogos de médicos treinados nos EUA
- **MedDialog** — licença não comercial
- **n2c2 / i2b2** — DUA via Harvard
- Qualquer outro conjunto de dados médicos restrito por DUA

O ônus da prova no PR para qualquer nova fonte de dados proposta:

1. Texto da licença citado na descrição do PR, com link para a fonte
   autoritativa.
2. Cadeia de proveniência (quem o produziu originalmente, quando, quais edições
   o repositório aplicou).
3. Afirmação explícita de compatibilidade com a Apache 2.0 (a postura de
   licenciamento do projeto, conforme a [ADR-0008](./adr-0008-licensing.md)).
4. O mantenedor revisa os três itens acima antes que o PR seja
   mesclado.

Todos os cartões da KB e casos de avaliação são entregues com atribuição de fonte e
uma tag de licença permissiva em seus metadados, de modo que qualquer pessoa que
examine o corpus sintético possa verificar a política diretamente.

### Confirmação

- A política de segurança declara a lista de exclusão e a declaração de política.
- O diretório do conjunto de dados sintéticos carrega uma auditoria de licença por
  fonte.
- A [declaração de dados](../reference/data.md) publicada é o cartão do conjunto de
  dados, com proveniência por cartão.
- O [cartão de dados](../governance/data-card.md) de governança é a visão voltada à
  governança do mesmo.
- Pré-merge: a lista de verificação de revisão do PR inclui o portão do ônus da
  prova para qualquer novo arquivo de dados.

## Consequências

### Positivas

- A avaliação é reproduzível de ponta a ponta sem atrito de licenciamento. A CI de
  qualquer fork roda `make eval` contra o corpus versionado.
- O ingresso de PHI é eliminado por construção — não há caminho a montante.
- A afirmação "100% sintético, zero PHI" é respaldada por código (corpus
  versionado) e por processo (ônus da prova no PR).
- A auditoria de licença é uma varredura de 30 segundos do README, da declaração de
  dados e da lista de exclusão.

### Negativas

- O corpus é menor do que o que misturar o MIMIC produziria. A superfície de
  avaliação resultante é mais estreita; um agente de produção precisaria de
  avaliações licenciadas adicionais para cobertura real.
- A restrição de somente sintético elimina o uso de sinais de drift do mundo real
  (sem telemetria de desvio no estilo MIMIC). O [plano de detecção de
  drift](../governance/drift-detection-plan.md) é honesto quanto a essa lacuna.
- Um contribuidor que queira adicionar um conjunto de dados licenciado útil tem de
  fazer o trabalho de (a) encontrar uma alternativa de domínio público, ou
  (b) produzir uma paráfrase somente sintética, ou (c) não contribuir com os
  dados. A opção (c) é aceitável para o estágio deste projeto.

### Neutras

- A lista de exclusão é uma superfície de manutenção: quando um novo conjunto de
  dados médicos restrito por DUA se torna bem conhecido, ele deve ser adicionado à
  lista explicitamente, mesmo que o portão do ônus da prova o capturasse de toda
  forma. A nomeação explícita torna a política mais rápida de verificar.

## Prós e contras das opções

### Opção A: Misturar real + sintético + DUA por usuário

- Boa, porque corpus maior.
- Ruim, porque cada fork precisa aceitar o DUA — fator de atrito que inviabiliza
  revisões abertas.
- Ruim, porque abre o caminho de ingresso de PHI; é preciso novos controles para
  fechá-lo.
- Ruim, porque a afirmação "reproduzível sem atrito de licenciamento" deixa de ser
  verdadeira.

### Opção B (escolhida): Somente sintético, fontes de domínio público

- Boa, porque reprodutibilidade em primeiro lugar.
- Boa, porque o PHI é eliminado por construção.
- Boa, porque a auditoria é rápida — lista de exclusão + tag de licença por cartão.
- Ruim, porque o corpus é limitado pelo que as fontes de domínio público cobrem.

### Opção C: Somente sintético, parafraseado a partir de material licenciado

- Boa, porque cobertura semântica mais ampla.
- Ruim, porque o cenário de licença de uma paráfrase é nebuloso — a licença
  original ainda pode se aplicar. Risco de alegação acidental de obra derivada.
- Ruim, porque a auditoria é mais lenta (cada cartão precisa de uma cadeia até a
  fonte da paráfrase, não apenas de uma atribuição).

## Mais informações

- [Declaração de dados](../reference/data.md) — cartão do conjunto de dados
- [Cartão de dados](../governance/data-card.md) — cartão do conjunto de dados voltado à governança
- [ADR-0004](./adr-0004-rag-stack.md) — pilha de RAG (a consumidora do
  corpus sintético)
- [ADR-0008](./adr-0008-licensing.md) — postura de licenciamento do projeto
- MADR 4.0.0: <https://adr.github.io/madr/>
