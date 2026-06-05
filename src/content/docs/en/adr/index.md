---
title: Architecture Decision Records
description: Index of the architecture decision records behind the AI Agent Eval Harness reference implementation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Architecture Decision Records

This section holds the Architecture Decision Records (ADRs) for the
`ai-agent-eval-harness-healthtech` reference implementation. Each ADR
captures one architecturally significant decision that is hard or
expensive to reverse and explains why it was made.

## Conventions

- **Format**: [MADR 4.0.0](https://adr.github.io/madr/). The canonical
  template is [the ADR template](./adr-template.md). Copy it for any
  new decision; do not invent ad-hoc structures.
- **Status lifecycle**: `Proposed` -> `Accepted` -> `Superseded`. A
  superseded ADR is never deleted; it is renamed to keep the historical
  log and links forward to the ADR that replaces it.
- **File naming**: `ADR-NNNN-kebab-title`, four-digit zero-padded
  sequence, lowercase kebab title. Reserve the next number when starting
  a draft to avoid races.
- **Scope of an ADR**: one decision per file. If a write-up needs to
  re-litigate a previous ADR, file a new ADR and mark the old one
  `Superseded by ADR-NNNN`.
- **Tone**: technical English, no marketing copy, no emojis, no
  em-dashes. Every framework / vendor / version claim cites a
  primary source (release notes, official docs, FDA register, etc.).

## Index

| ID | Title | Status | One-line summary |
|----|-------|--------|------------------|
| [ADR-0001](./adr-0001-orchestration.md) | Orchestration framework | Accepted | LangGraph 1.x over CrewAI, Microsoft Agent Framework, Claude Agent SDK, Pydantic AI, AutoGen. Six-node graph with an optional `interrupt()` HITL `review_response` node and a `MemorySaver` / `AsyncPostgresSaver` checkpointer factory. |
| [ADR-0002](./adr-0002-llm-vendor-abstraction.md) | LLM vendor abstraction | Accepted | Thin `LLMClient` Protocol over LangChain adapters plus direct Groq / Cerebras via OpenAI-compatible REST, switched by an `LLM_PROVIDER` environment variable. |
| [ADR-0003](./adr-0003-eval-harness.md) | Eval harness | Accepted; superseded in part by ADR-0009 | Hand-rolled pytest core + DeepEval + Ragas + Phoenix + Promptfoo. The judge-model choice (Anthropic Claude Haiku) is superseded by ADR-0009. |
| [ADR-0004](./adr-0004-rag-stack.md) | RAG stack | Accepted | Chroma embedded primary with `BAAI/bge-small-en-v1.5` as the default embedder using asymmetric instruction-aware retrieval; Qdrant Cloud and Voyage AI documented as cloud alternatives. |
| [ADR-0005](./adr-0005-guardrails.md) | Guardrails and regulatory posture | Accepted | Scope classifier, refusal templates, and a deterministic seven-category escalation router as first-class modules; design contract = FDA 2026 General Wellness / CDS Software guidance line. |
| [ADR-0006](./adr-0006-observability.md) | Observability stack | Accepted | OpenTelemetry + OpenInference wire format; Langfuse Cloud Hobby for live demo, self-hosted Phoenix for eval runs, Pydantic Logfire documented as alternative. |
| [ADR-0007](./adr-0007-deployment.md) | Deployment target | Accepted | Hugging Face Spaces, Docker SDK, CPU Basic free tier; Render Web Service documented as the operator's second choice. Deployment-resilience layer: per-session rate limiter, Groq -> Cerebras -> Anthropic provider fallback, short-TTL response cache. |
| [ADR-0008](./adr-0008-licensing.md) | Code license | Accepted | Code license switched from MIT to Apache 2.0 at v1.0.0. |
| ADR-0009 | Eval judge model | Accepted | Eval judge is Cerebras (`gpt-oss-120b`); supersedes the Anthropic Claude Haiku judge choice in ADR-0003. |
| ADR-0010 | Streaming the agent execution graph to the UI | Accepted | The v1.1 Agent Execution Graph streams per-node events to the SPA over server-sent events, opt-in via `Accept`-header content negotiation; the v1.0.0 `/chat` JSON contract is unchanged. Supersedes nothing. |
| ADR-0011 | Data layer (Supabase for demo operational data) | Accepted | Supabase free tier managed Postgres for demo keys, interactions, improvement suggestions, demo-key requests, demo-key consents, demo sessions, and demo turn usage. RAG remains Chroma (ADR-0004, unchanged). |
| ADR-0012 | Free-form out-of-domain detection | Accepted | Two-stage scope guard: a rule-based classifier (regex + keyword) admits in-domain turns and refuses high-confidence out-of-scope; an LLM judge resolves ambiguous middle-ground turns. Fail-open when the judge is unavailable. |
| ADR-0013 | Corpus expansion strategy | Accepted | Append-to-existing strategy: new domains added on top of the v1.0.0 corpus rather than replacing it. New KB cards and eval turns expand coverage across eight medication-adherence domains; locale parity maintained across en / es-419 / pt-BR. |
| ADR-0014 | Voice extension (ElevenLabs TTS + STT) | Accepted | ElevenLabs `eleven_multilingual_v2` for on-demand click-to-play TTS with per-locale voice mapping; ElevenLabs Scribe for STT; audio metadata on the SSE sidecar (JSON contract unchanged); voice OFF by default. Full-duplex voice agent deferred. |
| ADR-0015 | Cascading LLM provider fallback | Accepted | Typed transient-error cascade Groq -> Cerebras -> Anthropic. Non-429 4xx is not retried (quota preservation). Answering provider tagged in `metadata` for honest cost attribution. |
| ADR-0016 | Continuous Improvement Layer storage | Accepted | Interaction logs and improvement suggestions co-located in the same managed Postgres project (ADR-0011). PII redacted at ingress. Operator-curated, never auto-applied. |
| ADR-0017 | Free-tier deployment resilience layer | Accepted | In-process sliding-window rate limiter (proxy-aware IP) + TTL response cache, both bounded and memory-resident. No Redis, no external service. Single-worker design; multi-worker scale-out requires external state. |
| ADR-0018 | Voice OFF by default - safety policy | Accepted | Voice toggle defaults OFF on first visit. Opt-in is persisted in `localStorage`. Consent-first posture; an "Audio NOT retained" footer notice is visible regardless of toggle state. Locale parity across en / es-419 / pt-BR. |
| ADR-0019 | Synthetic-only data invariant + exclusion list | Accepted | 100% synthetic eval corpus from public-domain sources (MedlinePlus, DailyMed, WHO EML, FDA labels). Explicit exclusion list: MIMIC, ChatDoctor, MedDialog, n2c2/i2b2. PR burden of proof for any new dataset (license + provenance + compatibility). |
| ADR-0020 | Structured agent reply (Pydantic schema + LLM JSON mode) | Accepted | The agent emits a Pydantic-validated structured reply via LLM JSON mode instead of free prose, so refusal / escalation scorers read explicit fields rather than inferring intent from text. |
| ADR-0021 | Parent-document retrieval (sub-card chunking, card-level citation) | Accepted | KB cards are chunked into sub-card passages for embedding/retrieval, then de-duplicated back to the parent card for citation, improving recall while keeping citations card-level. |
| ADR-0022 | Token streaming (LangGraph custom stream + streaming client) | Accepted | Per-token LLM deltas are streamed to the SPA over the existing SSE surface (ADR-0010) so the assistant message renders as it generates instead of after a full-response buffer. |
| ADR-0023 | Hybrid retrieval (BM25 + dense + RRF + cross-encoder rerank) | Accepted | Dense-only retrieval is replaced by a flag-gated three-stage pipeline - parallel lexical (BM25) + dense generators, reciprocal-rank fusion, then cross-encoder rerank - degrading gracefully to the prior dense path. |
| ADR-0024 | Retrieval recall measurement (recall@k / hit@k / nDCG@k) | Accepted | Retrieval quality is measured directly with recall@k / hit@k / nDCG@k against labelled relevant cards, decoupling retrieval scoring from generation-coupled metrics like citation coverage. |
| ADR-0025 | Server-side citation enrichment | Accepted | The `Citation` model gains optional `source_url`, `source_license`, and `retrieved_score`, enriched server-side in the closing node, so the SPA citation popover renders without a second KB round-trip. |

## Supersession log

- **ADR-0009 supersedes ADR-0003 in part** (2026-05-20): the eval
  judge-model choice. ADR-0003 named Anthropic Claude Haiku; ADR-0009
  records that the harness runs a Cerebras judge. ADR-0003 keeps its
  `Accepted` status and its original body as the historical record; only
  the judge-model line is superseded.

## References

- [MADR: Markdown Any Decision Records](https://adr.github.io/madr/)
- [Documenting Architecture Decisions, Michael Nygard, 2011](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
