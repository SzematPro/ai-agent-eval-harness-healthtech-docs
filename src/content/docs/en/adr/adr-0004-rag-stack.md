---
title: "ADR-0004: RAG stack"
description: Why retrieval uses Chroma embedded with an instruction-aware BGE embedder and a documented managed-vector-DB path.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0004: RAG stack (Chroma embedded + Voyage AI embeddings)

- Status: Accepted
- Date: 2026-03-18
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The agent grounds every clinical assertion in a small knowledge base
of 30 to 50 cards covering drug-interaction summaries, adherence
barriers, motivational-interviewing talking points, and escalation
criteria. KB sources are restricted to public-domain or
properly-attributed material: DailyMed (FDA SPL), MedlinePlus
(US-gov), and paraphrased WHO Essential Medicines List entries. The
retrieval layer does not need horizontal scaling; it needs to be
cheap, reproducible, and self-contained inside the Docker image we
ship.

At the same time, this is a reference implementation. It has to show
when an embedded vector store is the right call and when a managed
vector DB is the right call. The narrative is "start embedded, document
the managed path".

How do we choose a vector store and an embedding model that (a) run
at $0 with no external accounts in the default demo, (b) demonstrate
managed-vector-DB awareness as an alternative path, (c) match the
quality the LLM-as-judge eval will hold us to, and (d) keep
deterministic reproducibility for the eval harness?

## Decision Drivers

- Zero external services for the default demo path; the vector
  store must work inside the Docker image
- Reproducibility: the same KB plus the same embedding model plus
  the same query must yield the same retrieval, so the eval
  scorer for groundedness is stable
- Cost: free at demo scale (50 cards or fewer, hundreds of queries
  per day), with a documented free-tier managed alternative
- Embedding quality: the judge eval will penalise weak retrieval
  through `FaithfulnessMetric` and `HallucinationMetric`; the
  primary embedding model should be a recent strong one, with a
  baked-in offline fallback if no API key is configured
- License: every component permissively licensed; embeddings
  generated for the KB ship inside the image without per-query
  cost at runtime if the offline fallback is used

## Considered Options

- **Chroma embedded (DuckDB+Parquet) + Voyage AI `voyage-3.5` as
  primary embeddings, `sentence-transformers BAAI/bge-large-en-v1.5`
  as baked-in offline fallback** (chosen)
- **Qdrant Cloud free tier + Voyage AI `voyage-3.5`**: managed
  service, generous free tier, but external dependency
- **FAISS** as an embedded store: high performance, but
  metadata story is thinner than Chroma
- **Postgres + pgvector**: co-located with the LangGraph
  Postgres saver, but adds operational surface for a 50-card KB
- **OpenAI `text-embedding-3-large`** as the embedding model

## Decision Outcome

Chosen option: **Chroma embedded as the primary vector store, with
Voyage AI `voyage-3.5` as the primary embedding model and
`sentence-transformers BAAI/bge-large-en-v1.5` as the baked-in
offline fallback**. Qdrant Cloud's free tier is documented as the
managed alternative path; it is the right answer for any reader whose
use case has more than ~50K chunks or needs a hosted dashboard.

Voyage AI gives 200 million free tokens on the `voyage-3.5` family
to new users, which is far in excess of what the KB needs (the
entire 50-card corpus embeds in under a million tokens). The
sentence-transformers fallback is baked into the Docker image, so the
demo runs with zero external API keys if the user prefers; the harness
picks the fallback automatically when no Voyage API key is set.

The choice keeps the live demo zero-cost, gives a clean managed-DB
alternative for readers who want one, and uses two embedding paths
that both score well on retrieval benchmarks.

### Confirmation

- The default Compose file runs Chroma embedded; no external service
  is required to bring the demo up
- An optional Compose file declares a Qdrant Cloud configuration with
  documented free-tier signup steps, exercised in a manual integration
  test
- The embedder factory selects Voyage AI if a Voyage API key is set,
  and falls back to the local sentence-transformers model otherwise; a
  unit test exercises both branches
- The KB build writes a manifest with model id, model version,
  embedding dimension, and SHA-256 of every card, so the eval harness
  can assert the retrieval surface is the expected one

## Consequences

### Positive

- Demo runs offline: no external service is required, which keeps
  the Hugging Face Space wake-up path fast and deterministic
- The eval harness sees a deterministic retrieval surface (Chroma
  + pinned embeddings + manifest hash), exactly what the
  groundedness scorer needs
- Voyage AI `voyage-3.5` is a recent, strong embedding model
  (announced 2025-05-20); the 200M free-token tier covers the KB
  many times over
- The offline fallback removes the "needs an API key" reading for any
  reader who wants to clone-and-run
- Qdrant Cloud as a documented alternative path lets the project
  signal managed-vector-DB awareness without inheriting the free
  tier's suspension risk

### Negative

- The baked-in `sentence-transformers` model adds to the Docker image
  size; accepted because it removes the "embeddings need an internet
  round-trip" failure mode
- Chroma embedded scales poorly past hundreds of thousands of
  chunks; irrelevant for a 50-card KB but worth flagging
- Two embedding paths mean two retrieval signatures; the manifest
  hash makes the difference auditable, but eval results must be
  compared within one embedding path, not across them

### Neutral

- The project gains `chromadb` and `voyageai` dependencies
- The image carries the `sentence-transformers` weights;
  intentional and documented
- A future migration to Qdrant Cloud is a Protocol-level swap,
  not a rewrite: the store abstraction covers both backends

## Pros and Cons of the Options

### Chroma embedded + Voyage AI primary + bge-large-en-v1.5 fallback

- Good, because the default path runs with zero external
  services
- Good, because Voyage AI's 200M-token free tier covers the KB
- Good, because the offline fallback removes the "needs-a-key"
  reading
- Good, because the eval harness sees a deterministic retrieval
  surface
- Bad, because the Docker image grows for the baked-in fallback model
- Bad, because Chroma embedded does not scale to hundreds of
  thousands of chunks

### Qdrant Cloud free tier + Voyage AI

- Good, because the managed dashboard and free tier (1 GB, no
  card) are generous
- Bad, because the demo would depend on an external service and
  Qdrant's account policy; every reader would have to sign up
- Kept as a documented alternative

### FAISS embedded

- Good, because FAISS is fast and battle-tested
- Bad, because metadata + filtering ergonomics are weaker than
  Chroma's

### Postgres + pgvector

- Good, because Postgres is already used for the conversation-state
  saver
- Bad, because co-locating conversation state and vector storage
  complicates ops for a 50-card KB, and shipping Postgres for
  retrieval contradicts the embedded-by-default posture

### OpenAI `text-embedding-3-large`

- Good, because it is a strong, well-known embedding model
- Bad, because it would force the demo to require an OpenAI key
  for retrieval alone, and there is no clean offline fallback
  with comparable quality outside sentence-transformers anyway

## More Information

- Chroma documentation: <https://docs.trychroma.com/>
- Qdrant Cloud free tier:
  <https://qdrant.tech/documentation/cloud/>
- Voyage AI `voyage-3.5` announcement (2025-05-20):
  <https://blog.voyageai.com/2025/05/20/voyage-3-5/>
- Voyage AI pricing and free-token tier:
  <https://docs.voyageai.com/docs/pricing>
- `BAAI/bge-small-en-v1.5` model card:
  <https://huggingface.co/BAAI/bge-small-en-v1.5>
- DailyMed (FDA SPL): <https://dailymed.nlm.nih.gov/dailymed/>
- MedlinePlus: <https://medlineplus.gov/>
- WHO Essential Medicines List:
  <https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists>
- MADR 4.0.0: <https://adr.github.io/madr/>

## As-built embedder and asymmetric retrieval

**Default embedder: `BAAI/bge-small-en-v1.5`.** The shipped default is
`BAAI/bge-small-en-v1.5`: a 384-dimensional model, roughly 130 MB,
chosen because it is comfortably CPU-Basic-friendly on the Hugging Face
Space free tier while keeping strong retrieval quality.

**Retrieval is asymmetric and instruction-aware.** The BGE v1.5 family
is instruction-tuned and asymmetric. The shipped code honours that: a
query is embedded with the documented BGE retrieval instruction
prefix (`Represent this sentence for searching relevant passages: `); a
passage is embedded with no prefix; every vector is L2-normalized so
Chroma's inner-product search behaves as cosine similarity. A symmetric
general-purpose model (for example `all-MiniLM-L6-v2`) receives no
instruction prefix. Used without the asymmetric handling, BGE retrieval
quality degrades; the retrieval layer is built to apply it.

**Voyage as the configurable cloud alternative.** The embedder factory
resolves Voyage when a Voyage API key is set and the local BGE model
otherwise; the demo runs at $0 with no keys on the local path.

**Retrieval similarity threshold ships disabled.** A
retrieval-minimum-similarity setting exists but defaults to 0.0
(disabled). On the single-domain KB corpus a threshold cannot separate
a near-miss off-corpus clinical question from a genuine in-corpus one
without false-refusing the latter. The agent refuses on zero-hit
retrieval; a near-miss off-corpus question is answered against the
closest card. The threshold is left in place, disabled, so a broader,
more topically diverse corpus can enable it later. See the
[model card](/ai-agent-eval-harness-healthtech-docs/en/reference/model-card/) for the full limitation.
