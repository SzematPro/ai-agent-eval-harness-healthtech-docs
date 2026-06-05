---
title: "ADR-0021: Parent-Document Retrieval"
description: Why retrieval matches on small sub-card chunks but surfaces whole parent cards to the model, keeping citations at the card level.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0021: Parent-Document Retrieval — Sub-Card Chunking with Card-Level Citation

- Status: Accepted
- Date: 2026-05-28
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

Earlier, the RAG layer treated each KB card as an atomic retrieval
unit: the synthetic corpus has 36 cards; ingest embedded the title and
text of every card as a single passage vector; the Chroma store held
36 rows; the retrieve node returned the top-K nearest cards, and the
LLM consumed whole cards.

This is precision-limited in two concrete ways:

1. A narrow query ("am I supposed to take it on an empty stomach?")
   competes against the whole-card vector, which mixes the relevant
   sentence with unrelated paragraphs about adherence routines, side
   effects, and lifestyle support. The matching signal is diluted.
2. The corpus median card is ~1100 characters and the p90 is ~1500
   characters; cards are not pathologically long, but they are long
   enough that sub-card semantic chunking measurably improves the
   embedding-time matching unit without changing the prompt-time
   context unit (the LLM still benefits from seeing the whole card).

This retrieval-precision upgrade needed to land before stacking hybrid
retrieval (BM25 + dense + reranker + RRF) and a retrieval-only scorer
(recall@k) on top of it. How do we improve retrieval precision without
breaking the citation contract (the `[cite:card-X]` markers, the eval
golden cases' `must_cite_one_of: ["card-..."]` field, the SPA citation
chips, the red-team corpus) or growing the install footprint?

## Decision Drivers

- **Retrieval precision**: the matching unit at the vector level must
  be small enough that narrow queries find the right passage; broader
  queries still surface the right card.
- **LLM context quality**: the prompt-time unit must remain large
  enough that the LLM has the cross-paragraph signal it needs to
  produce grounded answers; whole cards are already the right unit
  here.
- **Citation contract stability**: citation extraction, citation
  verification, the eval golden cases, the SPA chip rendering, and the
  red-team corpus all cite at the card level. Migrating them to
  chunk-level citations multiplies the blast radius and was out of
  scope for this upgrade.
- **Install footprint**: the deployment target runs on a small CPU
  tier (16GB RAM, 2 vCPU). Adding a heavy chunking dependency would
  add ~80MB and a per-card O(n²) embedding-similarity sweep at ingest.
  This is disproportionate for a 36-card corpus.
- **Forward compatibility**: the chosen design must produce sub-chunk
  vectors that the later hybrid pipeline (BM25 + reranker + RRF) can
  operate over, and the parent-id dedupe step must produce parent hits
  that the later recall@k scorer can measure against.

## Considered Options

- **Option A**: keep the "1 card = 1 chunk" model and improve
  retrieval purely through a better embedding. Defers chunking
  entirely.
- **Option B**: chunk-level citation (sub-card chunks; the LLM cites
  the matched chunk id; the SPA derives parent title from the chunk
  metadata at render time).
- **Option C**: parent-document retrieval — sub-card chunks at ingest
  time, dedupe by parent id at retrieval time, surface the parent
  card text to the LLM, citations stay at card level.

## Decision Outcome

Chosen option: **Option C** — parent-document retrieval with sub-card
chunking and card-level citation.

The load-bearing reason is the citation-contract-stability driver:
strategy C is the only option that improves retrieval precision while
leaving every citation-consuming surface (citation extraction,
citation verification, the eval golden `must_cite_one_of`, SPA
citation chips, red-team corpus) untouched. Strategy A leaves
precision on the table; strategy B has the right precision profile but
requires a costly migration of the citation contract across five
surfaces, plus the SPA changes needed to derive parent title at render
time.

The chunking pipeline splits a card into a list of sub-chunks. The
algorithm is a recursive separator-priority splitter with greedy
re-packing and a word-aligned overlap window:

- Target chunk size: 384 characters (~96 tokens at 4 chars/token).
- Overlap: 64 characters (~16 tokens), prepended to every chunk after
  the first, trimmed to the next word boundary so chunks never start
  mid-word.
- Separator priority: paragraph break, line break, then sentence
  punctuation, then word boundary. When no separator fits the budget
  the splitter recurses with the next priority; when none remain it
  hard-chunks by character index.
- Title prefix: applied to the first sub-chunk only. Subsequent
  sub-chunks carry body-only text. The parent-text metadata stored on
  the Chroma row always carries the full parent card text.

The context-chunk model gains two optional fields with defaults that
preserve binary compatibility: a `parent_id` (the parent card id) and
a `chunk_index` (the sub-chunk position). Existing fields (id, source,
text, score, metadata) are unchanged.

The ingest pipeline writes one Chroma row per sub-chunk: the row id is
`{card.id}::{chunk_index:02d}`, the parent id is the card id, and the
metadata carries the full parent card body (~1100 chars median; well
within Chroma's 16 KB per-value metadata limit), the parent title, and
the existing card metadata (license, topics, accessed_at). Re-ingest
is nuke-and-rebuild: a `make ingest-clean` target drops the local
Chroma store before re-running `make ingest`.

The retrieve node over-fetches `top_k * retrieval_overfetch_multiplier`
sub-chunks (default multiplier 3), dedupes by parent id keeping the
best score per parent, expands each surviving hit into a parent
context chunk (id equal to the parent id, text equal to the stored
parent text, chunk index 0, best sibling score), and truncates to
`top_k` parents. The `min_similarity` threshold operates on the
post-dedupe best-per-parent scores (semantic invariant: the old gate
fired when the best card hit was below the threshold; the new gate
fires when the best card via any of its sub-chunks is below the
threshold).

The migration shipped in three stages:

1. **Additive**: extend the context-chunk model with the two optional
   fields; add the chunking module; rewrite ingest to emit sub-chunks;
   plumb the parent id and chunk index through the Chroma round-trip;
   add a dedupe-by-parent step in the retrieve node with a safety
   branch that is a no-op when every chunk is its own parent (the
   prior behaviour); add the over-fetch multiplier setting.
2. **Test migration**: update fixtures and retrieval tests to seed
   sub-chunks at the store layer and assert on the post-dedupe parent
   view; re-ingest the synthetic corpus through the chunked pipeline;
   run the eval gate against live Groq / Cerebras and confirm recall@k
   parity (or improvement) against the prior baseline.
3. **Atomic deletion**: remove the safety branch; require a parent id
   on every ingested row; drop the legacy retrieve-node test cases.

### Confirmation

- A chunking test pins the splitter algorithm against corpus-shape
  expectations (3-4 chunks for the median card; paragraph-break
  preference over sentence-break; word-aligned overlap; hard-chunk
  fallback when no separator fits).
- Ingest tests assert the chunk count per card, the chunk id format,
  and the parent-id / chunk-index / parent-text round-trip.
- Retrieve-node tests cover dedupe-by-parent with multiple parents and
  multiple sub-chunks each; the `min_similarity` gate on the
  best-per-parent score; and the over-fetch multiplier ensuring the
  post-dedupe set is at least `top_k` when the corpus supports it.
- A post-migration audit confirms zero references to the safety branch
  in production retrieval code.

## Consequences

### Positive

- Retrieval precision improves on narrow queries: a sentence-level
  passage embedding matches the query better than a whole-card
  mixture.
- The citation contract is unchanged. The `[cite:card-X]` markers,
  citation verification, the eval golden `must_cite_one_of` arrays, the
  SPA citation chips, and the red-team corpus continue to operate on
  card ids; the parent-expansion in the retrieve node makes the
  surfaced context-chunk shape indistinguishable from before at the
  agent and prompt layers.
- The hybrid retrieval upgrade inherits a chunk-granular vector store
  ready for BM25 indexing and `bge-reranker-v2-m3` cross-encoder
  rescoring; the dedupe-by-parent step becomes the natural fusion
  point for RRF-merged chunk lists.
- The recall@k scorer measures over parent ids exiting the retrieved
  context, which matches the eval golden expectation shape unchanged.
- Zero new pip dependencies. The recursive splitter is ~80 lines of
  pure Python; the install footprint is unchanged.

### Negative

- The Chroma collection grows from ~36 rows to ~120 rows on the
  current synthetic corpus. Query latency is unaffected (still
  sub-second) but disk usage grows ~3x. Acceptable at this scale.
- Re-ingest is now a nuke-and-rebuild operation (`make ingest-clean`)
  rather than an idempotent upsert. A stale store containing the prior
  row shapes mixed with sub-chunk rows would trip dedupe-by-parent in
  unpredictable ways; the trade-off is one extra Make target for
  operational sanity.
- The retrieve node grows an over-fetch multiplier (default 3) and a
  dedupe helper, later extracted into a shared retrieval primitive
  when hybrid retrieval needed the same fusion pattern.

### Neutral

- The LLM-prompt context is identical in shape to before: the context
  block receives a list of context chunks where each chunk's id equals
  the parent card id and its text equals the parent card text. The
  600-char truncation rule continues to bound prompt size.
- The `min_similarity` semantic shifts from "best card score below
  threshold" to "best sub-chunk score below threshold across any
  card." On a healthy corpus the two are equivalent for the gate
  trigger; the new behaviour is slightly more permissive on cards
  where a single strong sub-chunk lifts an otherwise weak parent
  above the threshold (which is the desired direction).

## Pros and Cons of the Options

### Option A: stay with "1 card = 1 chunk"

- Good, because no ingest/retrieve changes.
- Bad, because retrieval precision on narrow queries stays diluted.
- Bad, because hybrid retrieval and the recall@k scorer inherit the
  same precision ceiling.

### Option B: chunk-level citation

- Good, because the retrieval unit and the citation unit are
  consistent.
- Bad, because the migration touches citation extraction, citation
  verification, every eval golden case's `must_cite_one_of` array, the
  SPA citation chip render path, and the red-team corpus.
- Bad, because the LLM context unit becomes the sub-chunk text by
  default, which loses cross-paragraph grounding signal — exactly
  the trade-off that parent-document retrieval is designed to avoid.

### Option C (chosen): parent-document retrieval with card-level citation

- Good, because the retrieval-time matching unit is small and precise.
- Good, because the LLM-prompt unit stays the full parent card.
- Good, because every citation-consuming surface is unchanged.
- Good, because the hybrid pipeline and the recall@k scorer inherit
  the right primitives without further restructuring.
- Bad, because the Chroma row count grows ~3x (acceptable; sub-second
  query latency is preserved).

## More Information

- [ADR-0001](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0001-orchestration/) — agent state and LangGraph;
  defines the context-chunk shape.
- [ADR-0004](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0004-rag-stack/) — embedding stack and Chroma
  persistent store.
- [ADR-0005](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/) — citation extraction and
  verification contract; unchanged by this ADR.
- [ADR-0020](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0020-structured-agent-reply/) — structured agent
  reply; the parent-expanded context chunk keeps the LLM context
  invariant the JSON-mode prompt depends on.
- MADR 4.0.0: <https://adr.github.io/madr/>
