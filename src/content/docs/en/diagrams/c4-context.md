---
title: C4 Context Diagram
description: System context view of the medication-adherence conversational agent and the external systems it depends on.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# C4 Context - `ai-agent-eval-harness-healthtech`

The context view shows the system boundary of the medication-adherence
conversational agent and the external systems it depends on. The system
is exercised by a User (synthetic patient persona) and integrated by an
Operator (a generic channel gateway - for example a messaging Business
API or a carrier value-added-service surface). External technical
dependencies are split into LLM providers, an embedding provider, the
vector store, and an observability backend.

See also [c4-container.md](/ai-agent-eval-harness-healthtech-docs/en/diagrams/c4-container/) for the next-level
decomposition.

```mermaid
C4Context
  title System Context - Medication-Adherence Conversational Agent

  Person(user, "User", "Synthetic patient persona on a medication-adherence plan. Interacts in English, es-419, or pt-BR.")
  Person_Ext(operator, "Operator", "Channel gateway: messaging Business API or carrier VAS. Owns transport; does not own agent internals.")

  System_Boundary(harness, "Healthcare Agent + Eval Harness") {
    System(agent, "Healthcare Agent", "Multi-turn LangGraph agent over FastAPI (/health, /chat, /chat/resume). Cites a synthetic KB on every clinical assertion. Refuses outside scope.")
  }

  System_Ext(llm, "LLM Provider(s)", "OpenAI / Anthropic / Groq / Cerebras, switched by env var. Default demo path: Groq; CI judge path: Cerebras + Anthropic.")
  System_Ext(embed, "Embedding Provider", "BAAI/bge-small-en-v1.5 local default (free, zero-network); Voyage AI voyage-3.5 optional when a key is set.")
  System_Ext(vstore, "Vector Store", "Chroma embedded (DuckDB+Parquet) in-process; Qdrant Cloud documented as alternative path.")
  System_Ext(obs, "Observability Backend", "Langfuse Cloud Hobby for the live demo path; Phoenix self-hosted during eval runs. OTel + OpenInference wire format.")

  Rel(user, operator, "Sends turns over", "messaging channel")
  Rel(operator, agent, "Forwards turns to", "HTTPS / FastAPI")
  Rel(agent, llm, "Generates turns with", "HTTPS / OpenAI-compatible REST")
  Rel(agent, embed, "Embeds KB cards and queries with", "HTTPS")
  Rel(agent, vstore, "Retrieves grounded citations from", "in-process / on-disk")
  Rel(agent, obs, "Emits spans + traces to", "OTLP")

  UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

The retrieval path uses a local dense embedding model (BAAI BGE) as the
default; the diagram's embedding provider also reflects a documented
hosted-embedding alternative. Dense vectors are combined with BM25 lexical
matching and a cross-encoder rerank, fused via reciprocal rank fusion, so
every grounded citation comes from the hybrid retriever.
