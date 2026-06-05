---
title: Diagrama de contexto C4
description: Visão de contexto do sistema do agente conversacional de adesão à medicação e os sistemas externos dos quais ele depende.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Contexto C4 - `ai-agent-eval-harness-healthtech`

A visão de contexto mostra o limite do sistema do agente conversacional de
adesão à medicação e os sistemas externos dos quais ele depende. O sistema
é exercitado por um Usuário (persona de paciente sintético) e integrado por
um Operador (um gateway de canal genérico - por exemplo, uma API de
mensagens para empresas ou uma superfície de serviço de valor agregado de
uma operadora). As dependências técnicas externas são divididas em
provedores de LLM, um provedor de embeddings, o armazenamento vetorial e
um backend de observabilidade.

Consulte também [c4-container.md](/ai-agent-eval-harness-healthtech-docs/pt-br/diagrams/c4-container/) para a decomposição do
próximo nível.

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

O caminho de recuperação usa por padrão um modelo local de embeddings
densos (BAAI BGE); o provedor de embeddings do diagrama também reflete uma
alternativa documentada de embeddings hospedados. Os vetores densos são
combinados com a correspondência léxica BM25 e um reordenamento por
cross-encoder, fundidos via fusão recíproca de ranques (RRF), de modo que
cada citação fundamentada provém do recuperador híbrido.
