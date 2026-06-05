---
title: "ADR-0012: Entrada em texto livre com detecção fora de domínio"
description: Por que o classificador de escopo determinístico ganha detecção fora de domínio ciente de tópico, dando à entrada benigna fora de tópico um redirecionamento gentil em vez de uma recusa rígida.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0012: Entrada em texto livre com detecção fora de domínio

- Status: Aceito
- Data: 2026-05-25
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

O classificador de escopo (ADR-0005) usa um modelo binário de aprovado/reprovado: uma
mensagem do usuário está dentro do escopo (apoio de bem-estar à adesão a medicamentos) ou
fora do escopo (dosagem, diagnóstico, interpretação, extração de PII,
role-play). Mensagens fora do escopo recebem uma recusa rígida.

Esse modelo binário funciona para violações de fronteira claras, mas ele não
trata o meio-termo: mensagens que estão fora do escopo de adesão a medicamentos
mas não são perigosas nem violam fronteiras. Por exemplo, "como está o
tempo hoje?" ou "conte uma piada" são mensagens benignas fora de tópico que
deveriam receber um redirecionamento gentil de volta ao escopo, não uma recusa seca que se lê
como um erro de sistema.

O objetivo de entrada em texto livre pede que o agente trate a entrada conversacional
de forma mais natural. Anteriormente, um usuário perguntando "você pode me ajudar a entender meus
números de colesterol?" recebia uma recusa rígida porque isso toca na
interpretação de exames. Uma experiência melhor detectaria o domínio (colesterol,
adesão à estatina) e forneceria uma resposta delimitada que redireciona para o que o
agente pode ajudar.

Como estendemos o classificador de escopo para distinguir entre "fora de tópico
mas benigno" e "fora do escopo e perigoso" sem adicionar custos de chamada de LLM
ou quebrar o comportamento existente de guardrail?

## Fatores da decisão

- **Camada determinística de custo zero**: a detecção fora de domínio não pode
  exigir uma chamada de LLM. O classificador baseado em regras precisa tratar isso sem
  aumentar o custo por turno (ADR-0005, ADR-0007).
- **Compatibilidade retroativa**: mensagens dentro do escopo existentes precisam continuar passando.
  Padrões de rejeição fora do escopo existentes (dosagem, diagnóstico,
  interpretação) precisam continuar disparando. Sem regressão na cobertura de guardrail.
- **Fallback ciente de localidade**: a mensagem de fallback gentil precisa estar
  disponível em todas as três localidades (en, es-419, pt-BR), consistente com o
  padrão de template de recusa existente (ADR-0005).
- **Observabilidade**: interações fora de domínio precisam ser rastreáveis via
  atributos de span do OpenTelemetry para análise de melhoria contínua
  (ADR-0006).
- **Padrão de classificador único**: a extensão deve viver no classificador de
  escopo existente, não em um novo módulo separado, para manter a superfície de
  auditoria de classificador único.

## Opções consideradas

- **Opção A: Estender o classificador de escopo com classificação ciente de tópico
  e metadados fora de domínio**
- **Opção B: Um novo módulo fora de domínio separado**
- **Opção C: Um classificador fora de domínio baseado em LLM**

## Resultado da decisão

Opção escolhida: **Opção A**, porque preserva o padrão de classificador único,
não adiciona novo módulo, não exige chamada de LLM e é consistente com a
arquitetura existente do classificador de escopo.

A extensão adiciona padrões de palavras-chave de domínio ao classificador de escopo
baseado em regras para oito novos domínios de adesão a medicamentos (adherence-general,
statin, inhaler, antidepressant, caregiver, cost-barriers, pill-burden,
health-literacy). Quando uma mensagem casa com um padrão de palavra-chave de domínio mas
não dispara nenhum padrão de rejeição existente, o classificador marca a
decisão de guardrail como fora de domínio enquanto ainda a aprova. A mensagem
prossegue pelo grafo, mas o nó `guardrail_pre` detecta o
marcador fora de domínio e a roteia para um template de fallback gentil (um novo
slug `out-of-domain`) em vez da recuperação de RAG.

Um novo slug de template de recusa `out-of-domain` é adicionado com variantes de
localidade. O template é conversacional, não uma recusa rígida: ele nomeia o que o
agente pode ajudar e convida o usuário a reformular dentro do escopo.

Os spans do OpenTelemetry no nó `guardrail_pre` ganham dois novos atributos:
`interaction.out_of_domain` (booleano) e `interaction.detected_category`
(string, o domínio casado ou "general" para fora de tópico que não é de domínio).

### Confirmação

- O classificador de escopo é estendido com um mapeamento de palavras-chave de domínio de
  oito nomes de domínio para padrões regex.
- A decisão de guardrail ganha um campo fora de domínio (booleano) quando
  palavras-chave de domínio são detectadas.
- Os templates de recusa ganham um slug `out-of-domain` com variantes en, es-419 e
  pt-BR.
- Os spans do OpenTelemetry em `guardrail_pre` emitem os atributos `interaction.out_of_domain`
  e `interaction.detected_category`.
- Padrões de rejeição existentes (dosagem, diagnóstico, interpretação, PII,
  role-play) disparam inalterados.
- Testes unitários cobrem a detecção fora de domínio.
- Testes unitários cobrem o slug de template `out-of-domain`.

## Consequências

### Positivas

- A entrada em texto livre recebe uma resposta conversacional em vez de uma recusa
  rígida, melhorando a experiência do usuário.
- Sem novo módulo, sem nova chamada de LLM, sem novo custo -- estende a camada
  determinística baseada em regras existente.
- A superfície de auditoria de classificador único é preservada; todas as decisões de escopo
  fluem por um classificador.
- Interações fora de domínio são observáveis via OpenTelemetry para
  análise de melhoria contínua.
- As palavras-chave de domínio expandem a cobertura de recuperação de RAG identificando áreas
  de tópico relevantes.

### Negativas

- O classificador de escopo cresce em complexidade com o dicionário de palavras-chave
  de domínio. Os padrões regex precisam ser cuidadosamente ajustados para evitar falsos
  positivos (por exemplo, "cost" não deve casar "at all costs" em um contexto
  não médico).
- O fallback fora de domínio ainda é uma resposta de template, não uma
  contextual. O agente não consegue interagir com conteúdo fora de tópico mesmo quando
  seria seguro fazê-lo.
- A detecção de domínio baseada em regex é limitada: ela casa palavras-chave, não
  intenção semântica. Uma mensagem como "estou preocupado com o preço do meu
  medicamento" pode não casar o padrão cost-barriers se a redação
  divergir do regex.

### Neutras

- A decisão de guardrail ganha uma nova chave fora de domínio. Consumidores
  downstream já leem os metadados da decisão como um dict, então isso é
  retrocompatível.
- Os spans do OpenTelemetry ganham dois novos atributos. Painéis e
  consultas existentes não são afetados (novos atributos são aditivos).
- As oito categorias de domínio são um conjunto inicial. Mais domínios podem ser
  adicionados estendendo o mapeamento de palavras-chave de domínio sem mudança
  arquitetural.

## Prós e contras das opções

### Opção A: Estender o classificador de escopo com classificação ciente de tópico (escolhida)

- Bom, porque preserva o padrão de classificador único e a superfície de
  auditoria.
- Bom, porque nenhum novo módulo significa nenhum novo grafo de imports, nenhum novo arquivo de teste,
  nenhuma nova fiação.
- Bom, porque a detecção baseada em regex é determinística, testável e de custo zero.
- Bom, porque é consistente com como o classificador de escopo já
  funciona (padrões regex para categorias de rejeição).
- Ruim, porque o classificador de escopo cresce em tamanho e complexidade de regex.
- Ruim, porque os padrões regex são frágeis para linguagem natural; deriva
  semântica na redação do usuário pode escapar à detecção.

### Opção B: Um novo módulo fora de domínio separado

- Bom, porque há separação de responsabilidades: a detecção fora de domínio é uma
  responsabilidade distinta.
- Ruim, porque introduz um segundo módulo classificador, fragmentando a
  superfície de auditoria.
- Ruim, porque o grafo precisaria chamar dois classificadores em sequência,
  adicionando complexidade de fiação.
- Ruim, porque duplica a infraestrutura de regex já presente no
  classificador de escopo.

### Opção C: Um classificador fora de domínio baseado em LLM

- Bom, porque a compreensão semântica trata a linguagem natural melhor
  que o regex.
- Bom, porque o classificador de escopo baseado em LLM existente já fornece um
  segundo passe baseado em modelo.
- Ruim, porque cada turno incorre em um custo de chamada de LLM, mesmo para mensagens
  benignas fora de tópico.
- Ruim, porque adiciona latência ao caminho `guardrail_pre` (1-3 segundos
  por turno).
- Ruim, porque viola o requisito de camada determinística de custo zero
  para o caminho baseado em regras.

## Mais informações

- ADR de guardrails: [ADR-0005](./adr-0005-guardrails.md)
- ADR de observabilidade: [ADR-0006](./adr-0006-observability.md)
- Estratégia de expansão de corpus (ADR companheira): [ADR-0013](./adr-0013-corpus-expansion-strategy.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
