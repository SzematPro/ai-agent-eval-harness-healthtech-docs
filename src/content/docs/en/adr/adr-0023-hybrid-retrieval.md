---
title: "ADR-0023: Hybrid Retrieval"
description: Why retrieval fuses BM25 and dense candidates with Reciprocal Rank Fusion and re-scores them with a cross-encoder reranker, degrading gracefully.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0023: Hybrid Retrieval - BM25 + Dense + RRF + Cross-Encoder Rerank

- Status: Accepted
- Date: 2026-05-29

## Context

The retrieval layer surfaced context with a single dense (bi-encoder) path: the user turn is embedded with the BGE query prefix and the nearest sub-chunks are read from Chroma ([ADR-0004](./adr-0004-rag-stack.md)), then de-duplicated to parent cards ([ADR-0021](./adr-0021-parent-document-retrieval.md)). Dense retrieval captures semantic similarity but misses exact lexical matches when the query and a card share rare tokens (a drug name, a device model, a specific dose unit) that the embedding smooths over. A pure lexical index has the inverse weakness: it misses paraphrase. For a medication-adherence agent whose corpus is dense with named entities, neither signal alone is sufficient.

The standard remedy is hybrid retrieval: run a lexical and a dense generator in parallel, fuse their rankings, then re-score the fused candidates with a cross-encoder that reads query and candidate jointly. This ADR records the decisions made when adding that pipeline.

## Decision

Replace the dense-only retrieve step with a three-stage pipeline, gated behind a flag that defaults on and degrades gracefully to the prior behaviour.

1. **Two parallel candidate generators** over the same sub-chunk corpus: BM25 (lexical) and the existing dense Chroma path (semantic).
2. **Reciprocal Rank Fusion** combines the two ranked lists into one without score calibration between the systems.
3. **Cross-encoder rerank** re-scores the fused candidates against the query text; the survivors are then de-duplicated to parents ([ADR-0021](./adr-0021-parent-document-retrieval.md)), truncated to `top_k`, and filtered by the existing minimum-similarity threshold.

The locked engineering choices:

- **(A) Reranker model.** Primary `BAAI/bge-reranker-v2-m3` (~568MB), state-of-the-art multilingual re-ranking. Documented fallback `BAAI/bge-reranker-base` (~110MB, ~3-5% nDCG@10 lower) if the primary does not fit RAM or its cold-start time is unacceptable on the deploy target. Paid rerankers (Cohere, Voyage) are out of scope here: they add an external paid dependency the demo budget excludes.
- **(B) BM25 library.** `rank-bm25` (BM25Okapi): pure Python, no compiled dependencies, MIT-licensed. Added as a main runtime dependency (~30KB) so the hybrid path is importable in every install rather than gated behind an extra.
- **(C) BM25 index lifecycle.** Rebuilt at application startup from the same chunk list the dense store was built from; never pickled. The index is small (sub-second build) and so can never desynchronise from the dense corpus.
- **(D) RRF constant.** `k = 60` (Cormack et al. 2009), the canonical default; exposed as a setting for tuning.
- **(E) Candidate set sizes.** Each generator over-fetches to `top_k * overfetch * 2`; the reranker scores at most `reranker_max_input` (default 32) fused candidates; the final set truncates to `top_k`.
- **(F) Opt-in default.** Hybrid is on by default; a single env flag reverts to the dense-only path for A/B comparison or recovery without a redeploy.
- **(G) Degradation contract.** Four observable tiers via an `agent.hybrid_path` span attribute: `full` (BM25 + dense + RRF + rerank), `rrf_only` (reranker unavailable), `dense_only` (BM25 index empty), and the pre-existing refusal-on-no-match. The reranker loader returns nothing on any failure (missing files, OOM, no network on cold start) and the node drops to `rrf_only` rather than failing the request.
- **(H) Backward compatibility.** The dense-only path is preserved as the documented fallback and is reachable via the opt-out flag; tests pin it.

## Alternatives considered

### A1: Vector-store-native hybrid (Chroma metadata filter + dense)

Use Chroma's `where` filtering alongside dense search instead of a separate BM25 index.

- Pro: one query path; no separate index to build.
- Con: ties the hybrid semantics to one vector store; metadata filtering is not BM25 and does not rank by term frequency / inverse document frequency.
- Rejected: agent-layer fusion is provider-agnostic (holds across Chroma, pgvector, etc.) and gives true BM25 ranking.

### A2: Pyserini / Lucene-backed BM25

- Pro: production-grade, fast at large scale.
- Con: ~250MB plus a Java runtime; far past the demo footprint for a 158-sub-chunk corpus.
- Rejected on footprint and runtime-dependency grounds.

### A3: Ship BM25 + dense + RRF only, skip the cross-encoder

- Pro: lower per-turn latency; no 568MB model.
- Con: RRF fuses ranks but cannot read query and candidate jointly; the cross-encoder is where most of the precision@k gain comes from.
- Rejected for quality. The degradation contract still falls back to exactly this configuration (`rrf_only`) when the reranker is unavailable, so the path is exercised and supported, just not the default.

### A4: Pickle the BM25 index to disk

- Pro: skip the startup rebuild.
- Con: adds a versioning surface that can desynchronise from the source-of-truth Chroma collection.
- Rejected: the rebuild is sub-second; correctness beats a negligible startup saving.

## Consequences

### Positive

- Recall strictly improves over dense-only for any positive-recall corpus: the fused candidate set is a superset of the dense candidates, so lexical-only matches the embedding missed are now reachable.
- The cross-encoder lifts precision@k by re-scoring the fused set with full query+candidate attention.
- Every degradation is observable via the `agent.hybrid_path` span attribute, and a request never fails merely because a model did not load.

### Negative

- Per-turn latency grows by the reranker inference (~50-150ms on CPU for up to 32 candidates) plus the BM25 query (~1ms), bounded by capping the reranker input set.
- The first cold start downloads the ~568MB reranker; subsequent starts use the cache. The smaller fallback model exists for footprint-constrained targets.
- Existing tests that asserted on dense-only ordering or exact scores must migrate to the hybrid contract: recall-superset assertions hold, exact-order assertions do not.

### Neutral

- The dedupe-by-parent invariant ([ADR-0021](./adr-0021-parent-document-retrieval.md)) is unchanged: it runs after fusion + rerank, still on sub-chunk identities.
- Tokenization is lowercase + punctuation-strip; locale-aware tokenization for es-419 / pt-BR is deferred until recall metrics warrant it.

## Implementation notes

- The BM25 index wraps the `rank-bm25` BM25Okapi implementation; querying returns context-chunk copies with the BM25 score set. An empty corpus yields an empty result, which is the `dense_only` degradation trigger.
- Reciprocal rank fusion is a pure function; the fusion identity is the sub-chunk id because dedupe-by-parent runs after fusion.
- The reranker wraps the `sentence-transformers` cross-encoder; its loader is a module-level callable that lazily imports the library, so importing the retrieval module never pulls torch. The loader returns nothing on load failure (Decision G).
- Settings: `retrieval_hybrid_enabled`, `rrf_k`, `reranker_model`, `reranker_max_input`.

## Future work

- **Locale-aware BM25 tokenization** for es-419 / pt-BR if recall metrics indicate lexical misses on non-English turns.
- **Query expansion / HyDE / multi-query** as a separate retrieval-quality step if recall@k warrants it.
- **Paid reranker adapters** (Cohere, Voyage) behind the existing cloud extra, for deployments that opt into a managed reranking API.

## Rollback

Set the hybrid opt-out env flag to restore the dense-only path with no code change; the BM25 index and reranker simply go unused. The dense path is untouched by the hybrid work and remains the fallback.

## See also

- [ADR-0004](./adr-0004-rag-stack.md) (RAG stack): the dense store + embedder this pipeline extends.
- [ADR-0021](./adr-0021-parent-document-retrieval.md) (parent-document retrieval): the dedupe-by-parent step that runs after fusion + rerank.
