---
title: "ADR-0011: Data layer (Supabase free tier)"
description: Why managed Postgres on the Supabase free tier backs the demo operational data, while Chroma remains the RAG vector store, at $0/month hosting.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0011: Data layer -- Supabase free tier for demo operational data

- Status: Accepted
- Date: 2026-05-24
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

Several demo features introduce operational data that does not fit the
in-memory posture of the current demo:

- **Demo key access control**: per-row configured keys with TTL, budget
  caps, feature flags, anonymized fingerprint binding, rate limiting, cost
  tracking. This data must persist across Space restarts and be queryable
  by the operator.
- **Interaction logging**: anonymized turn logs for the continuous
  improvement layer, with dedup hashes and compliance flags. Must persist
  for 90-day retention and be queryable by the batch improvement script.
- **Self-service request, consent, and session metrics**: key requests,
  consent records, session tracking. Must persist across Space restarts
  and survive cold starts.

ADR-0007 locks the deployment to Hugging Face Spaces CPU Basic free tier
(single uvicorn worker, in-memory defaults, $0/month hosting). ADR-0004
locks Chroma embedded for RAG retrieval. ADR-0001 already provisions a
Postgres checkpointer factory for durable conversation state.

The new operational tables (demo keys, demo turn usage, interactions,
improvement suggestions, demo key requests, demo key consents, demo
sessions) need a relational store that persists across Space restarts, is
queryable by both the demo backend and the operator, and remains $0/month
for hosting.

How do we add managed Postgres for demo operational data without violating
the $0/month hosting constraint and without displacing Chroma as the RAG
vector store?

## Decision Drivers

- **$0/month hosting cost**: operator pays nothing for infrastructure in
  steady state (ADR-0007). Per-key API budgets for demo reviewers are
  operator-funded usage costs, not hosting costs.
- **Persistence across Space restarts**: in-memory state is lost on cold
  start (48-hour idle sleep). Demo keys, consents, and sessions must
  survive.
- **Operator dashboard visibility**: the operator needs a queryable view
  of keys, requests, sessions, and interactions for manual review and
  grant/revoke decisions.
- **Relational schema fit**: all seven tables have foreign keys, indexes,
  check constraints, and JSONB columns. A relational store is the natural
  fit.
- **Minimal new operational surface**: one connection string as a Space
  secret, no new infrastructure to manage.

## Considered Options

- **Supabase free tier (Postgres)** (chosen): 500 MB managed Postgres,
  pgvector available, auth optional, dashboard included, row-level
  security, free tier is strategic (not promotional).
- **SQLite on Hugging Face persistent storage**: zero-vendor, but
  persistent storage is not guaranteed on Docker SDK Spaces, concurrent
  access risks corruption, and no dashboard for operator review.
- **Neon free tier**: similar managed Postgres, but weaker dashboard and
  less brand recognition for enterprise reviewers.
- **Firestore (NoSQL)**: document model is a poor fit for the relational
  schema (FKs, check constraints, JSONB queries).
- **PlanetScale free tier**: MySQL-based, withdrew its free tier in April
  2024; not $0/month going forward.
- **Turso (libSQL)**: SQLite-compatible edge database; adds operational
  complexity for a low-volume demo.

## Decision Outcome

Chosen option: **Supabase free tier as the managed Postgres backend for
demo operational data**. One Supabase project hosts all seven tables. The
connection string is configured as a Space secret (a Supabase URL plus a
service key, or a single database URL). The demo backend connects at
startup; if the connection fails, the agent continues with degraded
demo-key enforcement and interaction logging (failure-mode: log locally,
warn in UI, do not block agent flow).

The RAG layer remains Chroma embedded (ADR-0004, unchanged). Supabase is
for operational data, not retrieval. This distinction is explicit: Chroma
owns the vector index over the knowledge-base cards; Supabase owns the
relational tables for access control, consent, sessions, and improvement.

The hosting cost remains $0/month: Hugging Face Spaces free tier (ADR-0007)
+ Supabase free tier. Per-key API budgets (Anthropic, ElevenLabs) are
usage costs funded by the operator, not hosting costs.

### Confirmation

- Schema migrations deploy the seven tables with FKs, indexes, and check
  constraints.
- The demo backend reads the database connection settings at startup and
  connects to Supabase.
- If the connection fails, the agent serves turns without demo-key
  enforcement and logs a warning; the agent flow is never blocked.
- The operator dashboard at Supabase shows keys, requests, sessions,
  interactions, and suggestions in real time.
- The Postgres connection for the LangGraph checkpointer (see ADR-0001)
  can point to the same Supabase instance, sharing the connection pool.

## Consequences

### Positive

- Demo key state, consent records, and sessions persist across Space
  restarts and cold starts.
- Operator gets a real-time dashboard without building one.
- Managed Postgres demonstrates production-aware data layer design.
- Free tier (500 MB) is sufficient for low-volume demo usage (50-150
  reviewers x 5-10 turns).
- pgvector is available for future semantic clustering in the improvement
  layer.
- Unifies storage for the demo operational data under one backend,
  avoiding fragmented state.

### Negative

- Adds a runtime dependency on an external managed service. If Supabase is
  down, demo-key enforcement degrades (agent still serves turns, but
  without access control).
- Supabase free tier has a 500 MB limit; sufficient for demo scale but not
  for sustained production traffic.
- Connection latency from the Space to Supabase adds a few milliseconds
  per turn for the logging write; acceptable at demo scale.
- The Supabase service-role key is a sensitive credential; must be stored
  as a Space secret, never hardcoded.

### Neutral

- A new dependency on a Supabase client or a Postgres driver.
- Schema migrations become part of the deployment checklist.
- The free tier does not include point-in-time recovery; data loss is
  possible on Supabase-side incidents. Acceptable for demo data.

## Pros and Cons of the Options

### Supabase free tier (Postgres)

- Good, because managed Postgres persists across Space restarts
- Good, because the dashboard gives the operator real-time visibility
- Good, because the free tier is strategic (drives platform adoption), not
  promotional
- Good, because pgvector is available for future semantic queries
- Good, because it demonstrates a managed Postgres data layer even in the
  demo
- Bad, because it adds a runtime dependency on an external service
- Bad, because the free tier has a 500 MB cap

### SQLite on Hugging Face persistent storage

- Good, because zero-vendor dependency
- Bad, because persistent storage is not guaranteed for Docker SDK Spaces
- Bad, because concurrent writes risk corruption
- Bad, because no operator dashboard

### Neon free tier

- Good, because similar managed Postgres offering
- Bad, because weaker dashboard for operator review
- Bad, because less brand recognition for enterprise reviewers

### Firestore (NoSQL)

- Good, because Google-managed, generous free tier
- Bad, because document model is a poor fit for relational schema
- Bad, because no SQL, no FKs, no check constraints

### PlanetScale free tier

- Bad, because the free tier was withdrawn in April 2024

### Turso (libSQL)

- Good, because SQLite-compatible with edge replication
- Bad, because adds operational complexity for a low-volume demo

## More Information

- Supabase free tier: <https://supabase.com/pricing>
- Supabase dashboard: <https://supabase.com/dashboard>
- ADR-0007 (deployment target): [ADR-0007](./adr-0007-deployment.md)
- ADR-0004 (RAG stack, unchanged): [ADR-0004](./adr-0004-rag-stack.md)
- ADR-0001 (orchestration, Postgres checkpointer factory): [ADR-0001](./adr-0001-orchestration.md)
- ADR-0016 (Continuous Improvement Layer storage choice): [ADR-0016](./adr-0016-continuous-improvement-storage.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
