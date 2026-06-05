---
title: "ADR-0024: Retrieval Recall Measurement"
description: Why a deterministic retrieval-only scorer reports hit@k, recall@k, and nDCG@k over retrieved cards, isolated from generation and citation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0024: Retrieval Recall Measurement - recall@k / hit@k / nDCG@k

- Status: Accepted
- Date: 2026-05-29

## Context

The hybrid retrieval pipeline ([ADR-0023](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0023-hybrid-retrieval/)) surfaces a top-`k` set of parent
cards per turn. Until now retrieval quality was observed only indirectly, by
metrics that couple retrieval with generation: a citation-coverage scorer grades
whether the *response* cited an expected card, and a judge-backed
groundedness scorer grades whether the *answer* is supported by the retrieved
context. Neither isolates the retrieval step: a retrieval miss and a citation
miss are indistinguishable, and a regression in ranking quality is invisible
until it drags a downstream metric down.

This ADR records the decisions for a deterministic, retrieval-only scorer
that grades whether retrieval put the relevant card(s) in the top-`k`,
independent of what the LLM then did with them.

## Decision

Add a deterministic, PR-gate-eligible scorer that reads the artefacts the
runner already captures (the retrieved context and the eval case's disjunctive
gold field `must_cite_one_of`) and emits three metrics per gold-bearing
case. `k` is the configured retrieval top-k (default 4). Card identity is the
parent id where present, otherwise the chunk id (post parent-expansion the id
equals the card id, consistent with the citation-correctness scorer). Metrics
are computed over the **retrieved** ids, never the cited ids.

The locked choices:

- **(A) Metric triad.** Emit `retrieval_hit_at_k`, `retrieval_recall_at_k`,
  and `retrieval_ndcg_at_k`.
  - `hit@k` = `1.0` if at least one gold card is in the top-k. This is the
    headline success signal because `must_cite_one_of` is **disjunctive** -
    the citation contract requires only one of the listed cards.
  - `recall@k` = `|gold ∩ topk| / |gold|`. Reported but treated as a
    **conservative lower bound**: under disjunctive gold, surfacing one of two
    acceptable cards scores 0.5 even though the contract is met. The metric set
    names "recall@4", so it is emitted; the lower-bound caveat is documented
    here and in the report.
  - `nDCG@k` = binary-gain nDCG, the only rank-sensitive signal (the reason
    [ADR-0023](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0023-hybrid-retrieval/) added a cross-encoder reranker). Every gold card has relevance 1
    (the labels carry no graded relevance); `DCG = Σ 1/log2(rank+2)` over
    top-k positions holding a gold card (0-based rank); `IDCG` sums the same
    over `min(|gold|, k)` ideal positions, so nDCG never exceeds 1.0 when gold
    cannot all fit in the top-k.
- **(B) Empty-gold contract.** A case with an empty `must_cite_one_of`
  contributes **no score key** (the scorer returns an empty result). The
  aggregator means over keys that are *present*, so omission restricts the
  corpus mean to the gold-bearing subset and yields an honest `n`. Returning a
  vacuous `1.0` (as the citation-coverage scorer does for its own gate) would
  inflate the mean across the capability cases and no-match cases that have no
  relevant card. This is the load-bearing decision.
- **(C) Denominator.** Score every **gold-bearing** case, keyed on label
  presence rather than case type (so an adversarial case that legitimately
  carries a gold card is still graded - the right card should be retrieved
  even when the answer must refuse). The report breaks out golden-vs-
  adversarial and per-locale, each with its own `n`. Cross-locale deltas are
  presented as indicative, not significance-tested (small, unequal,
  independently authored locale corpora).
- **(D) Gate posture: report-first.** The metric flows into the aggregates and
  is rendered (markdown + stdout) with `n`. A live absolute-floor knob (an eval
  CLI threshold flag for recall and one for hit, with gate keyword params that
  accept a float or none) is shipped but defaults **inactive**, mirroring the
  minimum-similarity precedent (ship the metric, defer the strict flip until a
  live baseline justifies a number). A dataset-integrity test (every gold id
  resolves to a real KB card) actively gates CI, so a labeling bug is caught
  and cannot masquerade as a retrieval miss.
- **(E) The eval CLI is storeless; the live gate is an integration test.** The
  CLI runs the agent graph with no store, so the graph drops the retrieve node
  and the retrieved context is empty for every case. The CLI retrieval
  aggregates are therefore vacuous (and so are the pre-existing citation-
  coverage / judge-groundedness scorers - a pre-existing gap, not introduced
  here). The LIVE retrieval-recall gate is an end-to-end integration test,
  which ingests the real 36-card KB into a temporary Chroma with the real BGE
  embedder, runs the gold-bearing cases through the real dense retrieve node,
  and asserts a conservative recall floor (dense-only is a conservative lower
  bound for the hybrid surface; the 568MB reranker stays off). Wiring a store
  into the eval CLI - so the CLI gate also measures retrieval / citation /
  groundedness - is a tracked follow-up (out of scope for a recall-scorer
  increment; it would also flip the hard-gated judge metrics from vacuous to
  live on the keyed sweep).

## Alternatives considered

### A1: recall@k only (the literal metric name)

- Con: misreports disjunctive gold (1-of-2 acceptable cards scores 0.5, a
  false penalty for an adequate retrieval). Rejected as the sole/headline
  metric; kept as a reported lower bound alongside hit@k.

### A2: hit@k only

- Pro: matches the disjunctive contract exactly.
- Con: rank-blind (gold at position 4 scores the same as position 1), so a
  reranker regression is invisible. Rejected as the sole metric; kept as the
  headline, complemented by nDCG@k for rank quality.

### A3: graded relevance / MRR

- Rejected: the labels carry no graded relevance to model, and MRR is
  monotonically equivalent to nDCG on singleton gold and ill-defined under
  disjunction - a correlated third key with no added signal.

### A4: gate (block CI) on a recall floor in this increment

- Con: no live baseline exists yet; the gold set is a disjunctive lower bound;
  per-locale `n` is as low as 29. A guessed floor would be flaky or useless.
  Rejected in favour of report-first; the floor flip is a focused follow-up
  once a baseline run exists.

### A5: rely on the regression-tolerance path to "gate" the metric

- Rejected: that path is inert at runtime. The gate is always called with no
  baseline aggregates; no baseline file is loaded or written anywhere (a
  baseline file + CI step was scoped earlier but only the gate params ever
  landed). Putting a metric "in aggregates" therefore gates nothing today. The
  absolute-floor knob is the only live mechanism; wiring a committed baseline
  file is separate, larger work, out of scope here.

## Consequences

### Positive

- Retrieval quality is observable in isolation; a retrieval miss is no longer
  conflated with a citation or grounding miss.
- The triad reports both the contract-aligned success rate (hit@k) and rank
  quality (nDCG@k), with recall@k as a familiar lower-bound figure.
- The empty-gold contract keeps the corpus mean honest and surfaces `n`.

### Negative

- recall@k under-reports under disjunctive gold; readers must use hit@k as the
  success figure. Documented, but a foreseeable misread.
- Per-locale figures (es-419 / pt-BR, n=29) are noisy; usable for reporting
  and coarse regression detection, not for significance-tested comparison.

### Neutral

- No new dependency (standard-library math only). The scorer is deterministic
  and adds negligible cost to the eval sweep.
- The active floor is deferred; "the gate includes the metric" is satisfied
  by computation + rendering + the shipped-but-inactive knob + the active
  dataset-integrity test.

## Implementation notes

- The recall@k / hit@k / nDCG@k helpers are pure functions over id sequences;
  they dedupe the ranked ids first-occurrence before applying the rank cutoff,
  so a stray duplicate cannot double-count a gain or hide a later card.
- The retrieval-recall scorer resolves `k` from the configured retrieval top-k
  (a constructor override exists for deterministic tests) and is registered in
  the runner's default deterministic scorer block.
- `n` is derived in the report writer / CLI (count of reports carrying the
  retrieval keys), not in the aggregator's return type.

## Future work

- **Flip the floor.** Once a live baseline aggregate is observed, set an
  evidence-based recall threshold (target ≈ 0.85, parallel to
  the faithfulness floor; finalized as observed-minus-slack) in a focused
  follow-up, sibling to the minimum-similarity default-lift.
- **Decouple relevance from citation sufficiency.** If recall numbers warrant,
  add an explicit relevant-ids field separate from the disjunctive
  `must_cite_one_of`, and expand synthetic gold coverage for es-419 / pt-BR
  toward parity with en ([ADR-0019](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0019-synthetic-only-data-invariant/) synthetic-only).
- **Wire a committed baseline file + CI restore/update step** to make the
  regression-tolerance path live for all aggregate dimensions.

## Rollback

Remove the retrieval-recall scorer from the runner's default set; the metric
simply stops being computed. The retrieval pipeline ([ADR-0023](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0023-hybrid-retrieval/)) is untouched.

## See also

- [ADR-0023](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0023-hybrid-retrieval/) (hybrid retrieval): the surface this scorer measures.
- [ADR-0021](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0021-parent-document-retrieval/) (parent-document retrieval): the dedupe-by-parent step that defines
  the card identity used here.
- [ADR-0003](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0003-eval-harness/) (eval harness): the scorer / runner / gate architecture extended.
- [ADR-0019](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0019-synthetic-only-data-invariant/) (synthetic-only data invariant): constrains any gold-label expansion.
