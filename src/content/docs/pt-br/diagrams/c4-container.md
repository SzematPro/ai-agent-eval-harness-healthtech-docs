---
title: Diagrama de contêineres C4
description: Visão de contêineres decompondo o agente de saúde e o arnês de avaliação em suas unidades implantáveis.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Contêineres C4 - `ai-agent-eval-harness-healthtech`

A visão de contêineres decompõe o sistema do agente em unidades
implantáveis. Um app FastAPI fica à frente da superfície pública
(`/health`, `/chat`, `/chat/resume` e o `/graph/topology` somente leitura)
mais a casca de single-page app em `/`; não há endpoint `/metrics`. `/chat`
e `/chat/resume` usam negociação de conteúdo: uma requisição
`Accept: text/event-stream` recebe um fluxo de server-sent-events com
eventos de execução por nó, qualquer outro `Accept` recebe o JSON estável
`ChatResponse`. O runtime do agente LangGraph é dono do pipeline
conversacional: o grafo de seis nós `intake -> guardrail_pre ->
[retrieve_context] -> generate_response -> guardrail_post -> closing`, com
um nó opcional `review_response` de human-in-the-loop (HITL) inserido entre
`generate_response` e `guardrail_post` quando o HITL está habilitado. Os
módulos de guardrail rodam dentro dos nós do grafo (`guardrail_pre` e
`guardrail_post`), não como uma camada orquestrada separada. O
armazenamento RAG é Chroma embarcado, fundamentado em uma KB sintética de
36 cartões. O arnês de avaliação roda fora do processo, construindo o mesmo
grafo. A instrumentação OpenTelemetry conecta cada nó aos backends de
observabilidade.

O grafo é compilado uma vez quando o app FastAPI inicia e é reutilizado
entre requisições. A camada de persistência é injetável por checkpointer:
um checkpointer em memória por padrão, ou um checkpointer durável apoiado em
Postgres quando uma string de conexão de banco de dados é configurada (o
caminho durável para retomadas de HITL que atravessam um reinício de
processo). Consulte
[ADR-0001](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0001-orchestration/) para a justificativa.

```mermaid
C4Container
  title Container View - Healthcare Agent + Eval Harness

  Person(user, "User", "Synthetic patient persona")
  Person_Ext(operator, "Operator", "Channel gateway (messaging Business API / carrier VAS)")

  System_Boundary(sys, "Healthcare Agent + Eval Harness") {
    Container(api, "FastAPI App", "Python 3.12, FastAPI", "Exposes /health, /chat, /chat/resume, the read-only /graph/topology, the SPA shell at /, and the unlisted /debug/state. /chat and /chat/resume are content-negotiated: text/event-stream gets an SSE stream of per-node events, any other Accept gets the v1.0.0 ChatResponse JSON. Compiles the agent graph once in lifespan; stateless across requests apart from the checkpointer.")
    Container(agent_rt, "LangGraph Agent Runtime", "Python 3.12, LangGraph 1.x", "Six-node StateGraph: intake -> guardrail_pre -> [retrieve_context] -> generate_response -> guardrail_post -> closing. retrieve_context is the conditional RAG node. An optional review_response interrupt() HITL node is inserted when HITL_ENABLED=1.")
    Container(llm_client, "LLMClient Adapters", "Python 3.12, OpenAI-compatible SDKs", "Thin Protocol with adapters for OpenAI, Anthropic, Groq, Cerebras. Selected by LLM_PROVIDER; optionally fallback-wrapped (Groq primary -> Cerebras fallback).")
    Container(guard, "Guardrail Modules", "Python 3.12", "First-class modules - input_validation, pii, scope, escalation, citations, persona, review - invoked from inside the guardrail_pre / guardrail_post / review_response graph nodes.")
    ContainerDb(rag, "RAG Store", "Chroma embedded", "36 synthetic KB cards with source_url, accessed_at, license. Persisted to a configurable on-disk directory (CHROMA_PERSIST_DIR).")
    Container(embed_sel, "Embedding Selector", "Python 3.12, voyageai / sentence-transformers", "voyage-3.5 when a key is present; BAAI/bge-small-en-v1.5 fallback baked into the image.")
    Container(otel, "OTel Instrumentation", "opentelemetry-python + OpenInference", "Wraps every node, every LLM call, every retrieval. OTLP exporter.")
    ContainerDb(saver, "Persistence Layer", "checkpointer-injectable", "MemorySaver by default; an AsyncPostgresSaver when POSTGRES_DSN is set, for HITL resumes that survive a process restart.")
    Container(eval_harness, "Eval Harness", "Python 3.12, pytest + DeepEval", "Loads JSONL goldens, builds the agent graph once, runs each case, scores with 4 deterministic plus 3 judge-backed scorers, emits markdown + JSON. CI gate trips on threshold breach.")
  }

  System_Ext(llm, "LLM Provider(s)", "OpenAI / Anthropic / Groq / Cerebras")
  System_Ext(embed_ext, "Embedding Provider", "Voyage AI voyage-3.5")
  System_Ext(langfuse, "Langfuse Cloud Hobby", "Live-demo trace backend")
  System_Ext(phoenix, "Phoenix (self-hosted)", "Eval-time trace backend")

  Rel(user, operator, "Sends turns over messaging channel")
  Rel(operator, api, "Forwards POST /chat over HTTPS")
  Rel(api, agent_rt, "Runs the compiled graph via ainvoke (JSON) or astream (SSE)")
  Rel(agent_rt, guard, "Runs guardrail checks inside graph nodes")
  Rel(agent_rt, llm_client, "Generates with")
  Rel(llm_client, llm, "HTTPS / OpenAI-compatible REST")
  Rel(agent_rt, rag, "Retrieves grounded citations from")
  Rel(rag, embed_sel, "Embeds queries with")
  Rel(embed_sel, embed_ext, "HTTPS when voyage selected")
  Rel(agent_rt, saver, "Checkpoints state to")
  Rel(otel, langfuse, "Exports spans (live demo, when configured) via OTLP")
  Rel(otel, phoenix, "Exports spans (eval-time, when configured) via OTLP")
  Rel(eval_harness, agent_rt, "Builds and drives the graph in-process")
  Rel(eval_harness, otel, "Emits spans during eval runs")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

O armazenamento RAG usa recuperação híbrida: correspondência léxica BM25
mais vetores densos (BAAI BGE) mais um reordenamento por cross-encoder,
fundidos via fusão recíproca de ranques (RRF), sobre cartões da KB
fragmentados semanticamente com recuperação de documento-pai. O arnês de
avaliação pontua cada caso com quatro pontuadores deterministas sempre
ativos mais três pontuadores apoiados por juiz; o modelo juiz é o Cerebras
`gpt-oss-120b`. Uma violação de limiar aciona a barreira de CI.
