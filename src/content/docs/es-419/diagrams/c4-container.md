---
title: Diagrama de contenedores C4
description: Vista de contenedores que descompone el agente de salud y el arnés de evaluación en sus unidades desplegables.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Contenedores C4 - `ai-agent-eval-harness-healthtech`

La vista de contenedores descompone el sistema del agente en unidades
desplegables. Una app de FastAPI expone la superficie pública (`/health`,
`/chat`, `/chat/resume` y el endpoint de solo lectura `/graph/topology`),
además del shell de la aplicación de página única en `/`; no hay un endpoint
`/metrics`. `/chat` y `/chat/resume` usan negociación de contenido: una
solicitud con `Accept: text/event-stream` obtiene un flujo de eventos enviados
por el servidor (server-sent events) con los eventos de ejecución por nodo,
y cualquier otro `Accept` obtiene el JSON estable `ChatResponse`. El runtime
del agente LangGraph es dueño de la canalización conversacional: el grafo de
seis nodos `intake -> guardrail_pre -> [retrieve_context] -> generate_response
-> guardrail_post -> closing`, con un nodo opcional `review_response` con humano
en el bucle (HITL) insertado entre `generate_response` y `guardrail_post` cuando
HITL está habilitado. Los módulos de barreras de seguridad se ejecutan dentro
de los nodos del grafo (`guardrail_pre` y `guardrail_post`), no como un nivel
orquestado aparte. El almacén RAG es Chroma embebido, fundamentado en una base
de conocimiento sintética de 36 tarjetas. El arnés de evaluación se ejecuta
fuera de proceso y construye el mismo grafo. La instrumentación de OpenTelemetry
conecta cada nodo con los backends de observabilidad.

El grafo se compila una sola vez cuando arranca la app de FastAPI y se reutiliza
entre solicitudes. La capa de persistencia admite inyección de checkpointer:
un checkpointer en memoria por defecto, o un checkpointer durable respaldado por
Postgres cuando se configura una cadena de conexión a la base de datos (la ruta
durable para reanudaciones HITL que abarcan un reinicio de proceso). Consulta
[ADR-0001](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0001-orchestration/) para conocer la justificación.

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

El almacén RAG usa recuperación híbrida: coincidencia léxica BM25, más vectores
densos (BAAI BGE), más un reordenamiento por cross-encoder, fusionados mediante
fusión recíproca de rangos (RRF), sobre tarjetas de la base de conocimiento
fragmentadas semánticamente con recuperación de documento padre. El arnés de
evaluación puntúa cada caso con cuatro puntuadores deterministas siempre activos,
más tres puntuadores respaldados por un juez; el modelo juez es Cerebras
`gpt-oss-120b`. Una violación de umbral activa la barrera de CI.
