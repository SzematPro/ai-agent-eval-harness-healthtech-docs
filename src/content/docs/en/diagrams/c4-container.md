---
title: C4 Container Diagram
description: Container view decomposing the healthcare agent and evaluation harness into their deployable units.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# C4 Container - `ai-agent-eval-harness-healthtech`

The container view decomposes the agent system into deployable units. A
FastAPI app fronts the public surface (`/health`, `/chat`,
`/chat/resume`, and the read-only `/graph/topology`) plus the single-page
app shell at `/`; there is no `/metrics` endpoint. `/chat` and
`/chat/resume` are content-negotiated: an `Accept: text/event-stream`
request gets a server-sent-events stream of per-node execution events, any
other `Accept` gets the stable `ChatResponse` JSON. The LangGraph agent
runtime owns the conversational pipeline: the six-node graph `intake ->
guardrail_pre -> [retrieve_context] -> generate_response -> guardrail_post
-> closing`, with an optional `review_response` human-in-the-loop (HITL)
node inserted between `generate_response` and `guardrail_post` when HITL is
enabled. The guardrail modules run inside the graph nodes (`guardrail_pre`
and `guardrail_post`), not as a separate orchestrated tier. The RAG store
is Chroma embedded, grounded on a synthetic KB of 36 cards. The evaluation
harness runs out of process, building the same graph. OpenTelemetry
instrumentation wires every node to the observability backends.

The graph is compiled once when the FastAPI app starts up and is reused
across requests. The persistence layer is checkpointer-injectable: an
in-memory checkpointer by default, or a durable Postgres-backed
checkpointer when a database connection string is configured (the durable
path for HITL resumes spanning a process restart). See
[ADR-0001](../adr/adr-0001-orchestration.md) for the rationale.

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

The RAG store uses hybrid retrieval: BM25 lexical matching plus dense
vectors (BAAI BGE) plus a cross-encoder rerank, fused via reciprocal rank
fusion, over semantically chunked KB cards with parent-document retrieval.
The eval harness scores each case with four always-on deterministic
scorers plus three judge-backed scorers; the judge model is Cerebras
`gpt-oss-120b`. A threshold breach trips the CI gate.
