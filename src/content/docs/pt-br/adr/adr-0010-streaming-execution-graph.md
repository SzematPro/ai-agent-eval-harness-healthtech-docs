---
title: "ADR-0010: Streaming do grafo de execução do agente para a UI"
description: Por que eventos de execução do agente por nó fazem streaming para o navegador via SSE, opcional por negociação de cabeçalho Accept, sem quebrar o contrato JSON do chat.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0010: Streaming do grafo de execução do agente para a UI via SSE

- Status: Aceito
- Data: 2026-05-21
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

Uma versão posterior adicionou um Grafo de Execução do Agente ao vivo ao
aplicativo de página única (SPA) da demo: um pipeline da esquerda para a direita que acende nó a nó conforme
o LangGraph do agente é executado, e que codifica visualmente a latência por nó
e o desfecho do turno. Esta ADR registra a única decisão arquiteturalmente
significativa que esse recurso impõe.

Antes deste recurso, o agente é conduzido por requisição/resposta. `POST /chat`
invoca o grafo LangGraph compilado, aguarda o turno inteiro terminar
e retorna um único documento JSON `ChatResponse`. O painel de rastreamento de backend
do aplicativo renderiza esse documento depois que o turno é concluído. Não há
mecanismo para o navegador saber que `guardrail_pre` terminou e que
`retrieve_context` começou enquanto o turno ainda está em execução. Uma
visualização nó a nó precisa exatamente disso: eventos de progresso por nó
entregues ao navegador conforme acontecem.

O agente já produz os dados subjacentes por nó. A
decisão de observabilidade (ADR-0006) instrumentou spans do OpenTelemetry ao redor de cada
nó do grafo, cada chamada de LLM, cada recuperação e cada decisão de
guardrail, cada um carregando tempo e atributos. A medição por nó
existe. O que não existe é um caminho que *emita* eventos por nó para um
navegador conforme o turno é executado. O arcabouço LangGraph escolhido na ADR-0001
fornece a fonte para esse caminho: o grafo compilado expõe uma API de
streaming que produz um evento por etapa do ciclo de vida do nó, ao lado da
invocação não-streaming que o código de requisição/resposta usa.

A superfície da API de streaming do LangGraph evoluiu durante 2026: a API que a
implementação usa é a API de streaming do LangGraph recomendada à época da
implementação. A decisão aqui registrada, um transporte SSE
negociado por meio do cabeçalho `Accept` e opcional sobre os endpoints existentes,
é independente de qual API de streaming específica do LangGraph acabe
por alimentá-la; a implementação seleciona a API recomendada vigente à época.

Duas restrições limitam a resposta. Primeiro, o contrato JSON existente de `POST /chat` e
`POST /chat/resume` não pode quebrar: chamadores programáticos
e os próprios testes do projeto do caminho JSON precisam continuar funcionando
byte a byte. O arcabouço de avaliação não está entre os chamadores afetados - ele
conduz o agente por meio do construtor de grafo e da invocação não-streaming
diretamente e nunca chama o endpoint HTTP -, mas consumidores gerais da
API HTTP estão. Segundo, o aplicativo de página única é livre de arcabouço e
de dependências por construção (ADR-0007); seja qual for o transporte escolhido,
o lado do navegador precisa consumi-lo com JavaScript puro e sem biblioteca.

Como entregamos eventos de execução do agente por nó ao navegador em tempo
real, para que o aplicativo possa renderizar um grafo de execução ao vivo, sem quebrar o
contrato JSON de `/chat` existente e sem adicionar uma dependência
no lado do cliente?

## Fatores da decisão

- **Fluxo unidirecional, do servidor para o cliente.** O navegador precisa
  *receber* uma sequência de eventos de nó. Ele não precisa *enviar* nada
  no meio do turno; o turno já está totalmente especificado pelo corpo inicial do `POST /chat`.
  O transporte deve corresponder a esse formato e não carregar o custo de uma
  capacidade que o recurso não usa.
- **Compatibilidade retroativa do contrato JSON de `/chat`.** Um chamador
  programático existente, e todo teste existente do caminho JSON, precisa
  receber o `ChatResponse` inalterado. O comportamento de streaming precisa ser
  opcional, não uma mudança que quebre a resposta padrão.
- **Nenhuma nova dependência no lado do cliente.** O aplicativo é livre de arcabouço; o
  navegador precisa consumir o stream com uma API embutida e JavaScript
  puro. Nenhuma biblioteca de cliente pode ser introduzida.
- **Reutilizar o grafo existente e os dados por nó existentes.** O
  caminho de streaming precisa partir do grafo compilado já construído no
  lifespan do FastAPI e dos spans por nó que a ADR-0006 já instrumentou. Ele não pode
  construir um segundo grafo nem reimplementar a medição por nó.
- **Implantabilidade no host de demo de camada gratuita.** O transporte precisa funcionar
  através do proxy do Hugging Face Spaces com SDK Docker (ADR-0007) na CPU
  Basic, com um único worker uvicorn, a US$ 0/mês.
- **Legibilidade de engenharia.** Uma superfície de streaming limpa conduzida a partir de
  uma API de streaming do LangGraph sobre o grafo compilado deve se ler como uma
  escolha de transporte deliberada, não incidental.

## Opções consideradas

- **Server-sent events (SSE), opcional por negociação de conteúdo via cabeçalho
  `Accept`** (escolhida): `POST /chat` e `POST /chat/resume` retornam um
  corpo `text/event-stream` quando a requisição carrega
  `Accept: text/event-stream`, e o JSON `ChatResponse` inalterado
  caso contrário.
- **WebSocket**: um novo endpoint bidirecional `ws://` carregando os
  eventos por nó.
- **Polling do cliente**: o navegador requisita repetidamente um endpoint de
  status do turno até que o turno seja concluído.
- **Sem streaming; renderizar o grafo pós-turno**: manter a invocação
  não-streaming, desenhar o caminho final dos nós uma vez a partir do `ChatResponse`.

Dentro da opção SSE, o próprio esquema de eventos foi uma subdecisão. O AG-UI,
um protocolo de eventos agente-para-UI emergente de 2026, foi considerado como o esquema de fio
para os eventos por nó. Para esta demo autocontida o projeto
usa, em vez disso, um pequeno esquema de eventos SSE sob medida (seis eventos, enumerados no
Resultado da decisão abaixo) que é suficiente para o Grafo de Execução do
Agente e não carrega superfície de protocolo externo. A nomenclatura de
eventos compatível com AG-UI é registrada como possível alinhamento futuro se o projeto algum dia
precisar interoperar com um cliente AG-UI.

## Resultado da decisão

Opção escolhida: **server-sent events, opcional por meio de negociação de conteúdo
via cabeçalho `Accept` nos endpoints `/chat` e `/chat/resume`
existentes.** Quando uma requisição carrega `Accept: text/event-stream`, o
endpoint retorna um stream SSE de seis tipos de evento: um evento de abertura
`graph_topology` carregando o conjunto real de nós e arestas do grafo compilado,
depois eventos `node_started`, `node_completed`, `paused` e `error`
conforme o turno é executado, e um `turn_completed` terminal que carrega o
`ChatResponse` completo. O backend conduz esse stream a partir de uma API de
streaming do LangGraph sobre o grafo compilado já mantido no estado da aplicação.
Quando uma requisição carrega qualquer outro `Accept`, o endpoint se comporta exatamente como
o caminho de requisição/resposta: ele invoca o grafo e retorna o
JSON `ChatResponse`.

O SSE é a escolha estrutural porque o fluxo de dados é estritamente
unidirecional. O navegador recebe um stream de eventos de nó; ele nunca
precisa enviar um frame de volta no meio do turno. O SSE é um protocolo
unidirecional do servidor para o cliente e é, portanto, um encaixe exato, onde o WebSocket
acrescentaria um canal full-duplex, um endpoint separado não-HTTP e
tratamento de ciclo de vida de conexão para um canal de retorno que o recurso nunca usa.
O SSE também é consumido sem nenhuma biblioteca de cliente, o que mantém a
linha de zero dependências do aplicativo. A API `EventSource` embutida do navegador não pode ser
usada aqui: o `EventSource` emite um `GET` e não pode enviar um corpo de requisição ou
cabeçalhos personalizados, ao passo que `/chat` e `/chat/resume` são endpoints `POST`
que recebem um corpo JSON e precisam carregar `Accept: text/event-stream`. O aplicativo
consome o stream, em vez disso, com a API `fetch` que ele já usa para
`/chat`: ele lê o corpo da resposta em streaming através de
`response.body.getReader()`, decodifica os bytes com `TextDecoder` e
analisa ele próprio os frames `text/event-stream`. Isso é uma pequena quantidade de
JavaScript puro e não adiciona dependência. E o SSE trafega sobre HTTP simples, então ele
atravessa o proxy do Hugging Face Spaces sem um upgrade de protocolo.

Tornar o streaming opcional por meio de negociação de conteúdo é a segunda
escolha estrutural. O cabeçalho `Accept` é o próprio mecanismo do HTTP para um
cliente declarar qual representação ele deseja. Atrelar o comportamento de streaming
a `Accept: text/event-stream` significa que o contrato JSON fica intocado para todo chamador
que não solicita o stream: mesmo caminho de endpoint, mesmo método, mesmo esquema
`ChatResponse`, mesmos códigos de status. O modo de streaming é puramente aditivo. Isso
preserva o valor de opção da superfície `/chat`: o caminho de streaming e o caminho JSON coexistem em um
endpoint, e uma mudança futura em qualquer um deles não perturba o outro.

O caminho de streaming adiciona uma camada de emissão, não um novo agente. Ele usa uma
API de streaming do LangGraph sobre o mesmo grafo compilado que o lifespan já
constrói; o construtor de grafo permanece inalterado, o código dos nós permanece inalterado, os
spans por nó do OpenTelemetry da ADR-0006 permanecem inalterados. A decisão é
*fazer streaming do que já é executado*, não rearquitetar o agente.

As opções não-streaming foram rejeitadas. O WebSocket compra bidirecionalidade
que o recurso não precisa, ao custo de um segundo endpoint e mais
código de ciclo de vida. O polling produz uma serra de requisições, não consegue entregar um
evento de nó no instante em que ele acontece e, em um host de camada gratuita, desperdiça o
orçamento de requisições por sessão que a ADR-0007 limita por taxa. Renderizar o grafo apenas
pós-turno a partir do `ChatResponse` é o fallback honesto (e é o caminho de
degradação do aplicativo), mas como experiência principal ele descarta todo o efeito
ao vivo, nó a nó, que é o objetivo do recurso.

### Contrato de compatibilidade retroativa

O modo de streaming é aditivo e opcional. O contrato é:

- Uma requisição `POST /chat` ou `POST /chat/resume` com
  `Accept: text/event-stream` recebe uma resposta `text/event-stream`.
- Uma requisição com qualquer outro valor de `Accept` - incluindo `application/json`,
  `*/*` e um cabeçalho `Accept` ausente - recebe o JSON `ChatResponse`:
  esquema, nomes de campos e códigos de status idênticos.
- O evento terminal `turn_completed` do stream SSE carrega o payload completo do
  `ChatResponse`, então um cliente de streaming encerra o turno com exatamente
  os dados que um cliente JSON recebe.
- No stream de `/chat/resume`, o evento `turn_completed` também carrega uma
  medição `human_wait_ms`. Esse valor vive no envelope do evento SSE,
  não dentro do objeto `ChatResponse`: o esquema do `ChatResponse` permanece
  byte a byte idêntico tanto no caminho JSON quanto no de streaming, e
  `human_wait_ms` só é observável por um cliente de retomada em streaming.
- O arcabouço de avaliação não é afetado: ele invoca o grafo por meio do construtor de
  grafo diretamente e nunca emite uma requisição HTTP `/chat`. A negociação de
  conteúdo existe para consumidores gerais da API HTTP, não para o arcabouço.

### Nota de implantação: o proxy do Space não pode bufferizar o stream

O SSE depende de cada evento chegar ao navegador conforme ele é descarregado. Um proxy
reverso que bufferiza o corpo da resposta anula o recurso: o navegador
receberia todos os eventos de nó de uma vez, ao fim do turno. A implantação do Hugging Face
Spaces com SDK Docker (ADR-0007) fica atrás de tal proxy. A
resposta de streaming irá, portanto, definir `X-Accel-Buffering: no` e
`Cache-Control: no-cache`, e o manipulador de streaming irá descarregar cada registro SSE
conforme a API de streaming do LangGraph o produz. `X-Accel-Buffering: no`
é uma dica específica do nginx, no entanto, e o proxy do Hugging Face Spaces
não é garantido honrá-la: o cabeçalho é necessário, mas não comprovadamente
suficiente. A implementação precisa, portanto, verificar no Space ao vivo
que os eventos de fato chegam de forma incremental (por exemplo, uma verificação `curl -N`
contra o endpoint implantado observando os eventos chegarem um a um, em vez de
como um único bloco de fim de turno), e o runbook de implantação registra tanto o
cabeçalho quanto essa etapa de verificação. A postura de worker único uvicorn
registrada na ADR-0007 é compatível com SSE: uma resposta SSE é uma
resposta HTTP de longa duração no worker, não estado compartilhado.

### Confirmação

A decisão foi implementada e confirmada em conformidade com os
seguintes critérios:

- Os endpoints `/chat` e `/chat/resume` ramificam conforme o cabeçalho `Accept`
  da requisição: `text/event-stream` retorna uma resposta em streaming, todo outro
  valor retorna o JSON `ChatResponse`. Ambos os ramos são cobertos por
  testes, incluindo um teste de regressão afirmando que o caminho JSON está
  byte a byte inalterado.
- O ramo de streaming parte de uma API de streaming do LangGraph sobre o
  grafo compilado no estado da aplicação; o construtor de grafo permanece
  inalterado, o que os testes unitários inalterados do grafo do agente continuam a
  verificar.
- Um teste de streaming afirma a sequência de eventos SSE (a abertura
  `graph_topology`, depois os eventos por nó e terminais) para um turno normal,
  um turno recusado (com um `retrieve_context` pulado), um turno pausado por HITL
  e um turno que falha no meio do stream, contra o esquema de eventos
  documentado.
- A suíte de gate de qualidade e o arcabouço de avaliação passam, confirmando que a
  adição de streaming não perturbou o caminho de execução não-HTTP.
- A documentação de implantação registra o requisito de não bufferização do proxy
  e a etapa de verificação de entrega incremental no Space ao vivo.

## Consequências

### Positivas

- O navegador recebe eventos de execução por nó em tempo real, que é
  a capacidade habilitadora do Grafo de Execução do Agente ao vivo.
- O contrato JSON de `/chat` fica intocado: o streaming é opcional por meio de
  `Accept`, então nenhum chamador programático existente e nenhum teste existente do caminho
  JSON muda de comportamento.
- Nenhuma dependência no lado do cliente é adicionada; o aplicativo permanece livre de arcabouço e
  consome o corpo `text/event-stream` com JavaScript puro.
- O caminho de streaming reutiliza o grafo compilado e os spans por nó que o
  projeto já constrói; é uma camada de emissão, não um segundo agente.
- O SSE trafega sobre HTTP simples, então ele implanta através do proxy do Hugging Face Spaces
  sem upgrade de protocolo e permanece dentro da postura de US$ 0/mês.
- Uma superfície limpa de streaming-do-LangGraph-para-SSE é uma demonstração concreta
  de engenharia de agentes com streaming.

### Negativas

- Os manipuladores `/chat` e `/chat/resume` ganham um segundo caminho de código; os
  endpoints agora têm um ramo JSON e um ramo de streaming a manter em sincronia,
  o que é mais superfície a testar e manter.
- A entrega SSE depende de nenhum proxy bufferizar a resposta; um proxy
  reverso mal configurado degrada silenciosamente o efeito ao vivo para um despejo pós-turno. O
  cabeçalho `X-Accel-Buffering: no` é uma dica específica do nginx e não é
  garantido ser honrado pelo proxy do Hugging Face Spaces, então ele é
  necessário, mas não comprovadamente suficiente; a implementação precisa verificar a
  entrega incremental no Space ao vivo (veja a nota de implantação). Esta
  é uma dependência operacional que não existia antes.
- Uma resposta SSE de longa duração ocupa uma conexão do worker pela duração
  do turno; no Space de camada gratuita de worker único isso limita a
  concorrência, consistente com a postura existente de worker único, mas
  digno de menção.
- Uma resposta SSE de longa duração precisa ser cancelada quando o cliente se desconecta.
  Se o navegador fecha a conexão (aba fechada, navegação para fora) e
  o manipulador não percebe, a execução do grafo continua executando e o
  worker único de camada gratuita permanece ocupado com trabalho que ninguém vai ler,
  vazando o único worker que o Space tem. O manipulador de streaming precisa detectar
  a desconexão do cliente e abortar a execução do grafo em andamento, em vez de deixá-la
  rodar até a conclusão sem ser observada.
- A robustez do SSE através de proxies ociosos exige cuidado explícito. O stream precisa
  emitir um campo `id` por evento e linhas de comentário de heartbeat periódicas (linhas
  keep-alive `:`) para que um intermediário ocioso não trate uma
  conexão quieta como morta e a descarte. Isso importa mais durante uma pausa de HITL:
  entre o evento `paused` e a retomada do humano, o stream pode ficar ocioso
  por muito tempo, e sem heartbeats essa janela de ociosidade é exatamente quando
  um proxy tem mais probabilidade de fechar a conexão.
- O SSE é unidirecional por concepção: se um recurso futuro algum dia precisar de uma
  mensagem cliente-para-servidor no meio do turno, o SSE não pode carregá-la e esse recurso
  precisaria de um transporte diferente. Este é um limite aceito, não um
  custo atual.

### Neutras

- O caminho de execução do agente permanece inalterado: o construtor de grafo, o código dos
  nós, os guardrails, o caminho de RAG e os spans do OpenTelemetry estão todos
  como estavam. A decisão adiciona emissão, não comportamento.
- O esquema `ChatResponse` permanece inalterado; ele agora também é carregado como o
  `data` do evento SSE terminal `turn_completed`.
- O esquema de eventos SSE torna-se uma nova superfície de contrato público: seis eventos
  (`graph_topology`, `node_started`, `node_completed`, `paused`, `error`,
  `turn_completed`), documentados e versionados com o projeto.
- Uma API de streaming do LangGraph torna-se uma parte usada da dependência LangGraph
  já fixada; nenhum novo pacote entra no lockfile. Qual API de streaming específica
  é usada é uma escolha de implementação (a superfície de streaming do LangGraph
  evoluiu durante 2026) e não muda esta
  decisão, que é sobre o transporte SSE e a opção negociada por `Accept`.

## Prós e contras das opções

### SSE, opcional por negociação de conteúdo via cabeçalho `Accept`

- Bom, porque o SSE é unidirecional do servidor para o cliente, o que corresponde
  exatamente a um feed de eventos de nó que não precisa de canal de retorno do cliente.
- Bom, porque a negociação de conteúdo mantém o contrato JSON do `ChatResponse`
  byte a byte intacto para todo chamador não-streaming.
- Bom, porque o navegador consome `text/event-stream` com a API `fetch` embutida
  e um leitor de corpo em streaming, sem biblioteca de cliente, mantendo a
  linha de zero dependências.
- Bom, porque o SSE trafega sobre HTTP simples e atravessa o proxy do Hugging Face Spaces
  sem upgrade de protocolo.
- Bom, porque o stream é conduzido a partir de uma API de streaming do LangGraph sobre
  o grafo compilado existente; sem segundo grafo, sem novo código de medição.
- Ruim, porque os manipuladores `/chat` ganham um segundo caminho de código a manter em
  sincronia com o caminho JSON.
- Ruim, porque a entrega correta depende de nenhum proxy bufferizar o corpo da
  resposta.

### WebSocket

- Bom, porque é um transporte em tempo real maduro e amplamente suportado.
- Bom, porque poderia carregar uma futura mensagem cliente-para-servidor no meio do turno
  sem uma mudança de transporte.
- Ruim, porque o fluxo de dados do recurso é estritamente unidirecional;
  full-duplex é uma capacidade paga e nunca usada.
- Ruim, porque exige um endpoint separado não-HTTP e tratamento explícito de
  ciclo de vida de conexão, mais superfície que o SSE para o mesmo
  resultado.
- Ruim, porque um upgrade `ws://` é um caminho menos trivial através do
  proxy de camada gratuita do que uma resposta de streaming em HTTP simples.

### Polling do cliente

- Bom, porque não precisa de primitiva de streaming em nenhum dos lados e é
  trivial de implementar.
- Ruim, porque não consegue entregar um evento de nó no instante em que o nó
  começa; o efeito ao vivo, nó a nó, degrada para uma aproximação grosseira,
  quantizada pelo intervalo de polling.
- Ruim, porque produz uma rajada de requisições HTTP por turno, desperdiçando o
  orçamento de requisições por sessão que a ADR-0007 limita por taxa na demo de camada gratuita.

### Sem streaming; renderizar o grafo pós-turno

- Bom, porque não adiciona nenhum novo comportamento de endpoint e é o caminho
  honesto de degradação quando o SSE está indisponível.
- Ruim, porque como experiência principal ele descarta toda a visualização ao vivo,
  nó a nó, que é o objetivo do recurso; o grafo
  só mostraria um turno já concluído.

## Mais informações

- [ADR-0001: Arcabouço de orquestração](./adr-0001-orchestration.md) -
  LangGraph, a fonte da API de streaming e do grafo compilado de onde o
  stream é conduzido.
- [ADR-0006: Pilha de observabilidade](./adr-0006-observability.md) - os
  spans por nó do OpenTelemetry que já medem o tempo dos nós.
- [ADR-0007: Alvo de implantação](./adr-0007-deployment.md) - Hugging Face
  Spaces, a postura de worker único e o proxy que o stream SSE precisa
  atravessar sem bufferização.
- Especificação de server-sent events do WHATWG HTML:
  <https://html.spec.whatwg.org/multipage/server-sent-events.html>
- Documentação de streaming do LangGraph:
  <https://langchain-ai.github.io/langgraph/how-tos/streaming/>
- Protocolo de eventos agente-para-UI AG-UI (considerado para o esquema de eventos, registrado
  como possível alinhamento futuro): <https://ag-ui.com/>
- MADR 4.0.0: <https://adr.github.io/madr/>
