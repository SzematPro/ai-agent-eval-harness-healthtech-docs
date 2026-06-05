---
title: "ADR-0017: Camada de resiliência de implantação em camada gratuita"
description: Por que a demo protege seu worker único de camada gratuita com um limitador de taxa de janela deslizante em processo e um cache de respostas com TTL limitado, sem Redis, a $0/mês.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0017: Camada de resiliência de implantação em camada gratuita

- Status: Aceito
- Data: 2026-05-27 (registrada retroativamente; a camada de resiliência foi entregue em uma versão anterior)
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

A demo vive no Hugging Face Spaces, CPU Basic camada gratuita, worker único
uvicorn (ADR-0007). A URL do Space é compartilhada publicamente. Uma rajada curta de
visitantes curiosos -- um post que ganha tração, uma menção em conferência --
pode disparar o tráfego mais rápido do que o agente consegue responder.

Sem proteção, o worker enfileira turnos até que ou o loop de eventos do worker
fica para trás e timeouts cascateiam, ou o proxy do Hugging Face Spaces
retorna 502 Bad Gateway. Ambos os desfechos transformam um momento público em uma demo
quebrada.

Como protegemos o worker de rajadas de requisições concorrentes mantendo
o custo operacional de $0/mês e a simplicidade de worker único, sem
introduzir Redis?

## Fatores da decisão

- **Orçamento operacional de $0/mês** (ADR-0007): sem Redis, sem serviço gerenciado
  de limitação de taxa.
- **Simplicidade de worker único**: o projeto de implantação é um processo uvicorn
  por Space; compartilhar estado de limitação de taxa entre workers não é uma
  preocupação atual.
- **Semântica de retentativa transparente**: o cliente (o aplicativo) precisa saber quando
  retentar. `Retry-After` é o cabeçalho estrutural.
- **A demo sobrevive a rajadas de entrada idêntica**: quando dez visitantes clicam o mesmo
  cenário de exemplo, o worker deve computar a resposta uma única vez.

## Opções consideradas

- **Opção A**: Sem proteção. O worker trata cada requisição até
  cair.
- **Opção B**: Limitador de taxa de janela deslizante + cache de respostas apoiados em Redis.
- **Opção C**: Limitador de taxa de janela deslizante em processo + cache de respostas com TTL
  em processo, ambos chaveados por uma assinatura de requisição normalizada. Memória
  limitada.
- **Opção D**: Usar um limite de taxa no nível de CDN (Cloudflare à frente do Hugging
  Face Spaces).

## Resultado da decisão

Opção escolhida: **Opção C** -- uma camada de resiliência em processo com um
limitador de taxa de janela deslizante e um cache de respostas com TTL, ambos limitados e
residentes em memória. A razão estrutural mais forte é o orçamento de $0/mês:
qualquer dependência externa para limitação de taxa viola a postura de
implantação. O projeto em processo também corresponde à verdade de worker único --
não há um segundo worker com quem coordenar.

Comportamento:

- O limitador de taxa é chaveado pelo IP do cliente (ciente de proxy, então o
  cabeçalho `X-Forwarded-For` é honrado atrás do proxy reverso do Hugging Face
  Spaces). Uma janela deslizante com uma contagem limitada de requisições por janela
  rejeita rajadas com HTTP 429 e uma dica `Retry-After`.
- O cache de respostas é chaveado por uma tupla normalizada (texto, localidade, modelo).
  Um TTL curto mantém a memória limitada. Entradas idênticas dentro da janela do TTL
  retornam a resposta em cache, evitando gasto redundante de LLM.
- O cache NUNCA é usado para um turno pausado (HITL) -- um rascunho pausado não é
  uma resposta final e não pode ser servido a uma sessão diferente como se
  fosse.

### Confirmação

- O limitador de taxa e o cache são implementados em um módulo de resiliência
  dedicado.
- Testes unitários cobrem: a decisão de limitação de taxa sob rajada, um acerto de cache em
  entrada idêntica, uma falha de cache em uma localidade ou modelo diferente, sem cache em
  turnos pausados, e a propagação do `Retry-After`.
- O limitador é aplicado antes do trabalho do agente, e o cache é aplicado ao redor
  da invocação do agente.

## Consequências

### Positivas

- A demo sobrevive a rajadas de tráfego sem infraestrutura externa.
- Tráfego de entrada idêntica (o padrão "todos clicaram o mesmo exemplo")
  custa zero de gasto de LLM em repetições dentro do TTL do cache.
- A semântica HTTP 429 + `Retry-After` é transparente e
  amigável ao cliente.
- O orçamento de $0/mês é preservado.

### Negativas

- A proteção é por worker. Uma implantação com escalabilidade horizontal
  (uvicorn multi-worker atrás de um balanceador de carga) precisaria externalizar
  o limitador e o cache para o Redis. O projeto é honesto sobre essa
  limitação, registrada como uma lacuna de prontidão para produção no relatório de
  desempenho.
- O reinício do worker perde o estado do cache. O tráfego de cold start paga o custo total de
  LLM até o cache aquecer.
- O limitador baseado em IP é grosseiro: um NAT corporativo apresenta a
  organização inteira como um único IP. A contagem da janela limitada precisa ser ajustada para não
  penalizar tráfego legítimo sob NAT; o ajuste atual é intencionalmente
  leniente.

### Neutras

- A decisão de limitação de taxa adiciona uma checagem em processo por requisição. O custo de
  latência é submilissegundo.
- O cache adiciona estado em memória. Um TTL limitado mantém o consumo de memória
  gerenciável na CPU Basic (16 GB de RAM).

## Prós e contras das opções

### Opção A: Sem proteção

- Bom, porque é zero infraestrutura.
- Ruim, porque o worker cai sob tráfego de rajada.
- Ruim, porque não há semântica de 429 + `Retry-After` -- o cliente vê
  502 do proxy do Hugging Face.

### Opção B: Limitador + cache apoiados em Redis

- Bom, porque sobrevive à escalabilidade horizontal multi-worker.
- Ruim, porque adiciona uma dependência externa (instância Redis, gerenciamento
  de segredos, salto de rede).
- Ruim, porque conflita com o orçamento de $0/mês.
- Ruim, porque é superengenharia para a realidade de worker único.

### Opção C (escolhida): Limitador + cache em processo

- Bom, porque não há dependência externa.
- Bom, porque corresponde à verdade de worker único.
- Bom, porque é explícito, testável e autocontido.
- Ruim, porque não escala além de um worker (reconhecido).

### Opção D: Limite de taxa no nível de CDN

- Bom, porque transfere a proteção para a borda da Cloudflare.
- Ruim, porque o Hugging Face Spaces roteia o tráfego diretamente; colocar a
  Cloudflare à frente exige controle de DNS / domínio que o Space não
  tem por padrão.
- Ruim, porque não cobre a necessidade do cache de respostas.

## Mais informações

- [ADR-0007](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0007-deployment/) -- alvo de implantação e o
  orçamento de $0/mês
- [ADR-0015](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0015-cascading-llm-provider-fallback/) -- a
  camada complementar de fallback em cascata
- MADR 4.0.0: <https://adr.github.io/madr/>
