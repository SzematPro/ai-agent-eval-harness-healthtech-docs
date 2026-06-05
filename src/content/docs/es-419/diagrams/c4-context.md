---
title: Diagrama de contexto C4
description: Vista de contexto del sistema del agente conversacional de adherencia a la medicación y los sistemas externos de los que depende.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Contexto C4 - `ai-agent-eval-harness-healthtech`

La vista de contexto muestra el límite del sistema del agente conversacional
de adherencia a la medicación y los sistemas externos de los que depende. El
sistema lo ejercita un Usuario (persona de paciente sintético) y lo integra un
Operador (una pasarela de canal genérica; por ejemplo, una API de mensajería
para empresas o una superficie de servicio de valor agregado de una operadora).
Las dependencias técnicas externas se dividen en proveedores de LLM, un
proveedor de embeddings, el almacén vectorial y un backend de observabilidad.

Consulta también [c4-container.md](./c4-container.md) para la descomposición
del siguiente nivel.

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

La ruta de recuperación usa por defecto un modelo local de embeddings densos
(BAAI BGE); el proveedor de embeddings del diagrama también refleja una
alternativa documentada de embeddings alojados. Los vectores densos se combinan
con la coincidencia léxica BM25 y un reordenamiento por cross-encoder, fusionados
mediante fusión recíproca de rangos (RRF), de modo que cada citación fundamentada
proviene del recuperador híbrido.
