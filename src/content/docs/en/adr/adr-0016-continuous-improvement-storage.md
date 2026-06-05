---
title: "ADR-0016: Continuous Improvement Layer storage (Supabase)"
description: Why interaction logs and operator-curated improvement suggestions live in the same Supabase project as the demo operational data, PII-redacted at ingress.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0016: Continuous Improvement Layer storage (Supabase)

- Status: Accepted
- Date: 2026-05-24
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The Continuous Improvement Layer requires persistent storage for two
concerns:

1. **Interaction logs**: every demo turn, anonymized at ingress via PII
   redaction, with dedup hashes, compliance flags, latency, cost, and
   citation status. Pending interactions are clustered by semantic
   similarity and analyzed by a batch script to produce improvement
   suggestions. Retention: 90 days raw, aggregated metrics 1 year.

2. **Improvement suggestions**: operator-curated proposals (new KB cards,
   card refinements, eval cases, prompt adjustments, guardrail
   refinements, corpus gaps) with a human-review workflow (pending ->
   approved -> integrated). Retention: indefinite for audit trail.

ADR-0011 establishes the Supabase free tier as the managed Postgres
backend for demo operational data (keys, sessions, consents). The
interaction and suggestion tables are part of the same operational data
domain and naturally co-locate with the demo key and session tables
already provisioned there.

The continuous improvement layer has specific requirements:

- PII-redacted at ingress (never raw text stored)
- Operator-curated (never auto-applied)
- Batch processing (operator-triggered, not cron)
- Audit trail (who approved what, when, which commit)
- Anonymized dedup (sha256 hash of redacted input)

Where should the interaction logs and improvement suggestions live?

## Decision Drivers

- **Colocation with demo operational data**: the interaction logger writes
  after every turn; the demo key and session tables already live in
  Supabase (ADR-0011). Cross-table queries (e.g., "show all interactions
  for this demo key") are natural in a single database.
- **PII redaction at ingress**: the storage backend must never receive raw
  PII. The redaction module runs before the insert. The backend is a
  passive recipient of already-anonymized data.
- **Operator-curated workflow**: the improvement-suggestions table
  enforces a status check constraint (pending review -> approved ->
  rejected -> integrated). Only the operator transitions status. The batch
  script proposes, never applies.
- **$0/month hosting**: consistent with ADR-0007 and ADR-0011.
- **Queryable dashboard**: the operator reviews pending suggestions in the
  Supabase dashboard, the same interface used for demo key management.
- **Regulatory anchors**: GDPR Art. 25 (Privacy by Design), HIPAA Safe
  Harbor (18 identifiers), Chile Ley 19.628 + Reforma 21.719 (anonymized
  with an improvement purpose). The storage choice must support these
  requirements.

## Considered Options

- **Supabase (same project as ADR-0011)** (chosen): the interactions and
  improvement-suggestions tables co-located with demo keys, demo sessions,
  etc. in the same free-tier Postgres.
- **SQLite local on Hugging Face persistent storage**: zero-vendor, but
  persistent storage is not guaranteed for Docker SDK Spaces, no
  dashboard, no cross-table queries with demo keys.
- **Neon (separate project)**: would fragment the operational data across
  two managed Postgres instances for no benefit.
- **Firestore (NoSQL)**: poor fit for relational schema (status check
  constraints, FK to demo keys, JSONB for compliance flags).
- **CSV/JSONL files on Hugging Face persistent storage**: append-only, no
  query capability, no dashboard, no status transitions for suggestions.

## Decision Outcome

Chosen option: **Supabase free tier, same project established in
ADR-0011**, with the interactions and improvement-suggestions tables
deployed alongside the demo operational tables.

The interaction logger hooks into the agent execution graph after the
audit-emit node. On every turn it:

1. Receives the full turn context (input, response, citations, compliance
   flags, latency, cost).
2. Applies PII redaction on both the user input AND the response text
   (defense in depth).
3. Computes a sha256 hash of the redacted input for dedup.
4. Inserts into the interactions table (async, non-blocking).
5. If Supabase is unreachable, logs locally and warns in UI; never blocks
   the agent flow.

The batch improvement script runs on the operator's local machine (not on
the Space). It reads pending interactions, clusters by semantic
similarity, generates suggestions via LLM analysis, and persists them in
the improvement-suggestions table with status "pending review". The
operator reviews in the Supabase dashboard and approves/rejects manually.

The improvement-suggestions status check constraint enforces: pending
review | approved | rejected | integrated. Only the operator can
transition status. The batch script only inserts at "pending review". No
automated status change exists.

### Confirmation

- The interactions table has PII-redacted columns, a dedup hash, and a
  compliance-flags JSONB column.
- The improvement-suggestions table has a status check constraint and
  operator review fields.
- A foreign key links each interaction to its demo key (cross-table query:
  "all interactions for this key").
- A foreign key links demo turn usage to its interaction (cost tracking
  linked to the interaction log).
- The batch script runs locally and connects to Supabase via a
  service-role key from an environment variable.
- If improvement logging is disabled for a key, the logger skips that key
  entirely.

## Consequences

### Positive

- All operational data (keys, sessions, interactions, suggestions)
  co-located in one database. Cross-table queries are natural.
- The operator uses a single dashboard for all review workflows (key
  management + improvement suggestions).
- PII redaction at ingress means the database never receives raw PII.
  Verifiable: a query for any unredacted marker in the anonymized input
  column must return zero rows.
- Free tier (500 MB) is sufficient for low-volume demo (50-150 reviewers x
  5-10 turns = ~1000 rows, well under the cap).
- pgvector is available for semantic clustering of interactions in the
  batch script (reusing the same embedding model as RAG).

### Negative

- Adds two more tables to the Supabase migration surface.
- The batch script requires a service-role key with write access to both
  the interactions and the improvement-suggestions tables.
- If Supabase is down, interaction logging degrades gracefully (local log
  + warning) but data is lost for those turns.

### Neutral

- The interactions table has a 90-day retention policy enforced by the
  operator (manual or via a scheduled script). The Supabase free tier does
  not auto-enforce retention.
- Improvement suggestions are retained indefinitely as an audit trail.
- The batch script is operator-triggered, never automated. This is by
  design for regulated AI: online learning amplifies bias without
  governance.

## Pros and Cons of the Options

### Supabase (same project as ADR-0011)

- Good, because colocation enables cross-table queries (keys + sessions +
  interactions + suggestions)
- Good, because a single dashboard serves all operator workflows
- Good, because PII redaction at ingress is verifiable in one place
- Good, because pgvector is available for semantic clustering
- Good, because $0/month, consistent with ADR-0007 and ADR-0011
- Bad, because it adds migration surface for two more tables
- Bad, because the batch script needs a service-role key

### SQLite local on Hugging Face persistent storage

- Good, because zero-vendor
- Bad, because persistent storage is not guaranteed for Docker SDK
- Bad, because no dashboard for operator review
- Bad, because no cross-table queries with demo keys
- Bad, because concurrent write risks

### Neon (separate project)

- Good, because managed Postgres
- Bad, because it fragments operational data across two instances
- Bad, because no benefit over co-location

### Firestore (NoSQL)

- Good, because Google-managed
- Bad, because poor fit for relational schema and status transitions

### CSV/JSONL on Hugging Face persistent storage

- Good, because simplest possible append-only storage
- Bad, because no query capability
- Bad, because no status transitions for suggestions
- Bad, because no dashboard

## More Information

- Supabase free tier: <https://supabase.com/pricing>
- ADR-0011 (data layer, Supabase for demo operational data): [ADR-0011](./adr-0011-data-layer-supabase.md)
- ADR-0007 (deployment target): [ADR-0007](./adr-0007-deployment.md)
- GDPR Art. 25 (Data Protection by Design and by Default): <https://gdpr-info.eu/art-25-gdpr/>
- HIPAA Safe Harbor de-identification: <https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html>
- Chile Ley 19.628 + Reforma 21.719: <https://www.bcn.cl/leychile/navegar?idNorma=4125>
- MADR 4.0.0: <https://adr.github.io/madr/>
