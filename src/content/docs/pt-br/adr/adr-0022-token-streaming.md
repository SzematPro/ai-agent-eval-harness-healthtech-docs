---
title: "ADR-0022: Streaming de tokens"
description: Por que os deltas de token transmitidos usam o modo de stream custom do LangGraph e um Protocolo de cliente de streaming separado, entregue primeiro para o provedor padrão.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0022: Streaming de tokens — stream custom do LangGraph + Protocolo de cliente de streaming

- Status: Aceito
- Data: 2026-05-28

## Contexto

O nó de geração de resposta do agente bufferizava toda a resposta do LLM antes que o parsing posterior, a verificação de citação e o evento SSE de nó concluído disparassem. A latência visível ao usuário era, portanto, o tempo de relógio do primeiro token ao último token, mais o passo de parsing, antes que algo aparecesse na SPA. Em uma resposta de 500 tokens em modo JSON aos típicos 250 tok/s do Groq, isso representa ~2 segundos de silêncio entre o evento de nó iniciado e o primeiro caractere da mensagem do assistente.

O endpoint do Groq implantado já expõe uma superfície de streaming Server-Sent-Events (`chat/completions` com `stream: true`); os deltas por token chegam no fio à medida que o modelo os gera. A SPA já roda um EventSource contra o endpoint de chat e consome eventos SSE de ciclo de vida por nó ([ADR-0010](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0010-streaming-execution-graph/)). A infraestrutura para apresentar os deltas existe; esta ADR registra as decisões de design tomadas ao conectar as duas pontas.

## Decisão

Três decisões acopladas:

1. **Mecanismo entre fronteiras: stream custom do LangGraph.** O nó de geração de resposta emite um evento de stream custom (`{"event": "token_delta", "delta": "..."}`) para cada chunk de token que recebe do adaptador. O handler de streaming do FastAPI solicita o modo de stream `custom` do LangGraph junto com os modos existentes; os chunks do `custom` são roteados para registros SSE `token_delta` por meio de um pequeno helper de mapeamento.

2. **API do adaptador: Protocolo de cliente de streaming separado.** Um Protocolo de cliente de streaming estende o Protocolo base de cliente de LLM com um método assíncrono `stream(messages, params)` que retorna um iterador assíncrono de deltas de token. Ambos os Protocolos são verificáveis em tempo de execução. Adaptadores que expõem streaming implementam ambos os Protocolos; adaptadores que não o fazem permanecem apenas com o Protocolo base. O ramo de streaming do agente roteia por uma verificação isinstance e recorre à chamada de completion bufferizada para adaptadores sem streaming.

3. **Escopo: apenas Groq no lançamento.** O ramo de streaming foi entregue para o cliente Groq e para o stub em processo (para testes). Os clientes Cerebras, OpenAI, Anthropic e o de fallback deliberadamente permaneceram apenas bufferizados. Cerebras e OpenAI usam o mesmo formato SSE compatível com OpenAI e podem ser adicionados com mudanças de adaptador de uma linha quando justificado; o formato SSE da Anthropic difere e precisa de seu próprio trabalho de adaptador. O cliente de fallback não é ciente de streaming: em uma falha do stream primário no meio do caminho, o consumidor apresenta um evento SSE de erro e a SPA exibe uma nova tentativa. Um estado futuro de stream em cascata está documentado em "Trabalho futuro".

## Alternativas consideradas

### A1: Fila fora de banda em vez do stream custom do LangGraph

Passar uma fila do handler do FastAPI para dentro do grafo via a config do runnable. O nó empurra deltas para a fila; o handler lê da fila concorrentemente com o stream do grafo.

- Prós: Funciona em qualquer versão do LangGraph; padrão preexistente em bases de código Python assíncronas.
- Contras: Introduz estado fora de banda que a camada de testes precisa configurar; a ordenação entre os deltas da fila e os chunks de stream existentes não é nativa do grafo e precisa ser imposta pelo handler.
- Rejeitada: a versão fixada do LangGraph já fornece uma API nativa documentada de stream-writer.

### A2: Estender o método de completion com um callback por token

Um método de Protocolo; o streaming é um callback que o adaptador invoca por token.

- Prós: Nenhuma nova classe de Protocolo.
- Contras: A assinatura de cada adaptador muda; a tipagem estática não consegue distinguir adaptadores com streaming dos sem streaming; o tipo do callback é mais difícil de raciocinar do que um iterador assíncrono.
- Rejeitada: a tipagem estrutural via um Protocolo separado é o padrão Python mais idiomático.

### A3: Streaming para cada adaptador que o suporta (Cerebras + OpenAI incluídos)

Maximiza a cobertura de streaming estendendo os adaptadores Cerebras e OpenAI ao mesmo tempo.

- Prós: mais ganhos para o usuário por incremento.
- Contras: o streaming de Cerebras e OpenAI sob a troca de tier do fallback em cascata não está validado; poderia vazar respostas parcialmente transmitidas em um fallback; o próprio design da cascata é apenas bufferizado (conforme o design de fallback na [ADR-0002](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/)).
- Adiada: registrada como trabalho futuro abaixo.

### A4: A SPA renderiza deltas em um painel separado; a área principal da mensagem ainda bufferiza

Dois alvos de renderização: um painel de stream bruto em estilo de depuração, mais a área principal da mensagem que aguarda a conclusão do turno.

- Prós: Nenhuma falha de substituir-ao-concluir.
- Contras: Falha no objetivo visível ao usuário (todo o propósito do streaming de tokens é a materialização em estilo ChatGPT na área principal).
- Rejeitada: a renderização progressiva na área principal é a recompensa voltada ao usuário.

## Consequências

### Positivas

- Reduz a latência percebida até o primeiro token de ~2s (buffer de resposta completa) para ~80ms (primeiro token no fio) em uma geração típica do Groq.
- A superfície de streaming é puramente aditiva no fio SSE: clientes que não se inscrevem no novo nome de evento o ignoram silenciosamente conforme a semântica SSE do W3C.
- O caminho de completion bufferizada é preservado inalterado para cada adaptador sem streaming, cada requisição de chat JSON e a CLI de avaliação. A compatibilidade retroativa se mantém para esses caminhos.
- A nova superfície de Protocolo é pequena (um método, um tipo); os dublês de teste são simples.

### Negativas

- O fallback em cascata é contornado durante o streaming. Em uma falha do stream primário do Groq, o consumidor vê um evento SSE de erro e precisa tentar novamente. O fallback em cascata para turnos transmitidos é um design de estado futuro com o qual esta ADR não se compromete.
- A renderização progressiva da SPA deve lidar com estados de JSON parcial (o LLM está em modo JSON sob a [ADR-0020](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0020-structured-agent-reply/); os tokens chegam como `{"kind":"...","text":"..."}` caractere por caractere). A camada de renderização remove o envelope JSON e renderiza apenas o valor interno `text`; um `"text":"...` parcial exige uma lógica de UI cuidadosa.
- O valor de latência do chunk de streaming é o tempo cumulativo desde a abertura do stream; o delta de tempo de relógio por chunk não é reportado porque raramente é significativo para a contabilização posterior.

### Neutras

- O formato de fio SSE adiciona um novo nome de evento (`token_delta`); os nomes de evento existentes (`graph_topology`, `node_started`, `node_completed`, `paused`, `turn_completed`, `error`, `interaction_logged`, `cost_updated`) permanecem intocados.

## Notas de implementação

- A carga útil do token-delta carrega a string do delta, um motivo de finalização, contagens de token de entrada / token de saída, um valor de latência cumulativa, o nome do modelo e um pequeno mapa de metadados. Os chunks intermediários carregam um motivo de finalização nulo e contagens de token zero; o chunk terminal carrega a contabilização por turno.
- A nova tentativa de stream cobre apenas o estabelecimento da conexão inicial (3 tentativas, backoff exponencial). Falhas no meio do stream são levantadas imediatamente.
- A requisição de streaming compatível com OpenAI define `stream=True` mais `stream_options={"include_usage": True}` para que o chunk terminal carregue o uso em todos os provedores compatíveis com OpenAI.
- O parser de chunk-para-token-delta é agnóstico ao provedor e compartilhado, de modo que futuros adaptadores de streaming Cerebras / OpenAI o reutilizem.

## Trabalho futuro

- **Streaming Cerebras**: uma mudança de adaptador de uma linha reutilizando os helpers de transporte compartilhados. Adiado até que surja uma necessidade medida.
- **Streaming OpenAI**: mesmo formato que o Cerebras.
- **Streaming Anthropic**: formato de fio SSE diferente (chunks tipados por evento); precisa de sua própria implementação de adaptador.
- **Fallback de stream em cascata**: o desafio de design é que, em uma falha do primário no meio do stream, o consumidor já bufferizou tokens parciais; tentar novamente no fallback retransmite desde o início, quebrando a ordenação. Um design possível é "parar e reproduzir desde o início no fallback", com a SPA descartando o buffer parcial no primeiro chunk do secundário. Fora de escopo no lançamento; seria entregue por conta própria.

## Reversão

Reverter a mudança da SPA restaura a renderização bufferizada sem outras mudanças de código. A infraestrutura de streaming permanece no lugar (ela é inofensiva quando a SPA não consome o novo evento). A superfície de Protocolo e os helpers de transporte podem permanecer porque não são usados pelos caminhos de código bufferizados.

## Veja também

- [ADR-0002](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/) (abstração de fornecedor de LLM): a superfície de Protocolo que esta ADR estende.
- [ADR-0010](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0010-streaming-execution-graph/) (grafo de execução com streaming): o framework SSE ao qual esta ADR adiciona um evento.
- [ADR-0020](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0020-structured-agent-reply/) (resposta estruturada do agente): o contrato de modo JSON que os deltas transmitidos carregam verbatim.
