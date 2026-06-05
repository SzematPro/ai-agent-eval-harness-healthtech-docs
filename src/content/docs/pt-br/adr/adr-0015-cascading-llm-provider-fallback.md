---
title: "ADR-0015: Fallback em cascata de provedores de LLM"
description: Por que a etapa de conclusão de LLM faz cascata de Groq para Cerebras para Anthropic apenas em erros transitórios, preservando cota e atribuindo custo ao provedor que respondeu.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0015: Fallback em cascata de provedores de LLM (Groq → Cerebras → Anthropic)

- Status: Aceito
- Data: 2026-05-27 (registrada retroativamente como parte do polimento pós-lançamento; a cascata foi entregue em uma versão anterior)
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

O agente da demo roda no Hugging Face Spaces, CPU Basic camada gratuita, worker
único (ADR-0007). O provedor primário de LLM é o Groq
`llama-3.3-70b-versatile` a $0 de custo. A cota da camada gratuita é compartilhada por todos os
usuários do Space, então uma rajada curta de visitantes curiosos pode limitar por taxa
o primário enquanto um visitante está no meio de uma conversa. Um `429 Too Many Requests`
retornado a um visitante de demo ao vivo é inaceitável.

Como degradamos graciosamente quando o provedor primário retorna um erro
transitório, sem queimar a cota do secundário em falhas não transitórias e
sem mentir no livro-razão de custo sobre qual provedor de fato respondeu?

O escopo é: a etapa de conclusão de LLM dentro do grafo do agente. A cascata
é invisível ao esquema de estado do agente e ao guardrail de citação.

## Fatores da decisão

- **Preservação de cota**: um 4xx que não seja um 429 (por exemplo, 400 malformado,
  401 chave inválida) NÃO pode disparar a cascata. Queimar a cota do secundário em um
  400 determinístico desperdiça capacidade que tráfego legítimo futuro precisará.
- **Atribuição de custo**: o livro-razão de custo precisa registrar o provedor que
  de fato respondeu, não aquele que tentamos primeiro. Caso contrário, os painéis de
  custo mentem.
- **Portabilidade de provedor**: a ADR-0002 definiu o Protocol de cliente de LLM. A
  cascata precisa compor no nível do cliente, não vazar para o grafo do agente
  ou para o arcabouço de avaliação.
- **Transparência de falha**: quando todos os provedores falham, o usuário vê um
  HTTP 503 amigável e retentável com um `Retry-After`, não um stack trace.

## Opções consideradas

- **Opção A**: Provedor único com retentativa apenas em erros transitórios. Sem
  cascata.
- **Opção B**: Cascata que retenta todo erro no próximo provedor
  (ingênua).
- **Opção C**: Cascata com classificador tipado de erro transitório; 4xx que não seja 429
  NÃO é retentado; provedor que respondeu marcado nos metadados.
- **Opção D**: Serviço de gateway externo (Portkey, LiteLLM Router,
  OpenRouter) que trata a cascata à frente do agente.

## Resultado da decisão

Opção escolhida: **Opção C** -- Cascata com classificador tipado de erro
transitório e atribuição ao provedor que respondeu. A razão estrutural mais
forte é a preservação de cota: o projeto demonstra uma postura
consciente de custo (gates de custo na CI, orçamento por turno), e uma cascata
ingênua dobraria silenciosamente o gasto de tokens de entrada em falhas 4xx
determinísticas. A Opção D foi rejeitada porque adicionar um serviço externo para uma
demo de processo único é superengenharia operacional nesta escala; a
abstração no nível de Protocol da ADR-0002 torna a cascata em processo
trivial de escrever.

A cadeia da cascata é:

1. **Primário**: Groq `llama-3.3-70b-versatile` (camada gratuita dentro da cota)
2. **Fallback 1**: Cerebras `gpt-oss-120b` (também amigável à camada gratuita, o
   modelo juiz sob a ADR-0009; reutilizado como fallback de conclusão)
3. **Fallback 2**: Anthropic `claude-haiku-4-5-20251001` (escotilha de escape paga
   quando ambas as camadas gratuitas se esgotam)

O classificador de transitórios reconhece três classes como retentáveis:

- HTTP 429 (limite de taxa)
- HTTP 5xx (erro de servidor)
- Falha de transporte (sem status HTTP, por exemplo, reset de conexão)

Todo o resto (4xx que não seja 429) levanta exceção imediatamente. A não retentativa de
4xx que não seja 429 é a decisão estrutural de preservação de cota.

O provedor que respondeu é marcado nos metadados do resultado da conclusão para que o
acumulador de custo registre o gasto contra o provedor correto.

### Confirmação

- Testes unitários cobrem: Groq 429 → sucesso no Cerebras, Groq 5xx → sucesso no Cerebras,
  falha de transporte no Groq → sucesso no Cerebras, Groq 401 → sem
  fallback (levanta exceção), todos-os-provedores-falham → 503 ao chamador, provedores mistos
  com atribuição correta.
- O teste do livro-razão de custo afirma que o provedor registrado em cada unidade de custo
  é o provedor que respondeu, não o provedor requisitado.

## Consequências

### Positivas

- A demo sobrevive a uma rajada de cota do Groq sem intervenção do operador.
- A escotilha de escape da Anthropic limita o custo total da demo a um pequeno valor
  delimitado em USD por turno (a partir da tabela de preços por provedor).
- A atribuição de custo é honesta de ponta a ponta.
- O código do agente e o arcabouço de avaliação são alheios à cascata.
- Preservação de cota: um erro 4xx determinístico não desperdiça o
  orçamento da camada gratuita do secundário.

### Negativas

- Três provedores precisam ser configurados em produção. Operadores que querem apenas
  um provedor podem fixar um único provedor e pular a cascata, mas a
  superfície padrão é a cascata completa.
- Uma falha na Anthropic custa USD reais mesmo que o alvo da demo seja $0. O
  gate de custo protege contra gasto descontrolado falhando a CI quando a
  média do corpus excede o orçamento por turno.
- Erros cientes de localidade no caminho da cascata ainda não estão localizados -- o HTTP
  503 retorna corpo em inglês. (Rastreado como trabalho futuro.)

### Neutras

- O classificador de transitórios é uma superfície de manutenção; novas semânticas
  HTTP de provedor (por exemplo, um hipotético 425 Too Early) precisam ser adicionadas
  manualmente.
- A cascata adiciona dois round trips HTTP no pior caso. O orçamento de latência
  por turno configurado acomoda isso.

## Prós e contras das opções

### Opção A: Provedor único, retentativa apenas

- Bom, porque é operacionalmente simples -- um provedor, uma configuração.
- Bom, porque a retentativa é bem compreendida na camada de transporte HTTP.
- Ruim, porque não cobre 429 sustentado (esgotamento de cota).
- Ruim, porque a demo morre quando a janela de cota da camada gratuita do Groq expira.

### Opção B: Cascata ingênua (retenta todo erro)

- Bom, porque a demo sobrevive a erros transitórios.
- Ruim, porque um 400/401 determinístico desperdiça a cota do secundário tentando
  "retentar" algo que nunca terá sucesso.
- Ruim, porque a atribuição de custo torna-se ambígua (qual orçamento de provedor
  este turno atingiu?).

### Opção C (escolhida): Cascata tipada com atribuição

- Bom, porque preserva cota (4xx que não seja 429 permanece no primário).
- Bom, porque é honesta quanto a custo (os metadados registram o provedor que respondeu).
- Bom, porque é portável entre provedores na costura de Protocol (ADR-0002).
- Ruim, porque adiciona uma superfície de manutenção (o classificador de transitórios).

### Opção D: Serviço de gateway externo

- Bom, porque remove a lógica de cascata do projeto.
- Bom, porque alguns gateways adicionam observabilidade de graça.
- Ruim, porque adiciona uma dependência externa, salto de rede e custo
  operacional para uma demo de processo único.
- Ruim, porque conflita com a postura de implantação de $0/mês.

## Mais informações

- [ADR-0002](./adr-0002-llm-vendor-abstraction.md) -- abstração de fornecedor de
  LLM (o Protocol sobre o qual a cascata compõe)
- [ADR-0007](./adr-0007-deployment.md) -- alvo de implantação e os
  fatores por trás da camada de resiliência
- [ADR-0017](./adr-0017-free-tier-deployment-resilience.md) -- o
  limitador de taxa em processo complementar e o cache de respostas
- MADR 4.0.0: <https://adr.github.io/madr/>
