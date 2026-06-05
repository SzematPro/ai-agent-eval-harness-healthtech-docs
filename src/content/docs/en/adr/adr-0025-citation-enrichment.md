---
title: "ADR-0025: Server-Side Citation Enrichment"
description: Why the API derives citation source URL, license, and relevance score server-side from retrieved context, so the model never emits URLs.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0025: Server-Side Citation Enrichment

- Status: Accepted
- Date: 2026-05-31

## Context

The citation popover needs three data points per cited KB card to render a useful card summary: the source URL, the license, and a relevance score. These fields are absent from the existing citation model (which carries only the card id and the span), and the SPA has no independent access to the verified KB metadata — it is read-only on the chat response payload.

Two enrichment approaches were considered:

1. **Client-side enrichment.** The SPA calls a new card-metadata endpoint to fetch metadata at render time.
2. **Server-side enrichment (chosen).** The API layer derives the fields from the retrieved context already present on the agent state and attaches them to the citation objects before serialising the chat response.

Server-side enrichment was chosen because the KB metadata is already in memory at response-build time (the context-chunk objects in the retrieved context), the LLM must never emit URLs to preserve the honesty constraint ([ADR-0020](./adr-0020-structured-agent-reply.md)), and adding a new public endpoint just for popover data would widen the API surface without a commensurate benefit.

The chat-response citations contract ([ADR-0020](./adr-0020-structured-agent-reply.md)) is backward-compatible: all three new fields default to absent, so existing consumers (eval scorers, red-team gate, cert harness) that read only the card id are unaffected.

## Decision

Extend the citation model with three optional fields and populate them server-side at response-build time from the verified Chroma card metadata keyed by card id.

1. **Three additive optional fields on the citation:**
   - `source_url` — the KB card's source URL from the context chunk's source field.
   - `source_license` — the license from the context chunk's metadata.
   - `retrieved_score` — the reranker relevance score normalized to 0-100.

2. **Server-side enrichment** — a private helper called during response build, immediately after citation reconciliation. It builds a lookup from chunk id to chunk over the retrieved context, then for each citation:
   - Sets the source URL and license from the matching context chunk.
   - Sets the relevance score only when the hybrid path is `full` (the cross-encoder reranker path).

3. **Hybrid-path label on the agent state** — a new optional label (`full`, `rrf_only`, `dense_only`, or absent). Written by the retrieve node alongside the retrieved context, read at response-build time.

4. **The LLM never emits URLs.** The enrichment derives the source URL and license exclusively from the context chunk's source field and metadata — both originate from the verified, synthetic KB dataset ingested at startup. No model-emitted string becomes a displayed URL.

## Locked Engineering Choices

**(A) Score normalization.** The reranker cross-encoder emits a logit. The normalized score is `round(100 / (1 + exp(-logit)))` — the sigmoid function scaled to [0, 100] and rounded to an integer-valued float. This gives a 0-100 relevance percentage on the `full` hybrid path.

**(B) Score is absent on non-full paths.** When the hybrid path is `rrf_only`, `dense_only`, or absent, the relevance score is always absent. RRF scores and dense cosine similarities are on incompatible scales and cannot be compared against reranker logits; emitting them as if they were comparable would be misleading.

**(C) Graceful degradation.** Each enrichment item is wrapped so a failure returns the original citation unchanged. A missing chunk, empty source, or bad metadata field yields an absent value in the corresponding field rather than an error response. The helper never raises.

**(D) Lookup key is the bare card slug.** After dedupe-by-parent in the retrieve node, the context-chunk id equals the parent id equals the card slug (e.g., `card-hyp-01`). There is no `::` separator in the lookup key. A sub-chunk id (`card-hyp-01::00`) would never match a citation's card id because citations are at card granularity ([ADR-0021](./adr-0021-parent-document-retrieval.md)).

**(E) Additive optional fields preserve backward compatibility.** A citation constructed from only a card id still constructs with all three new fields absent. The eval scorers, the red-team gate, and the certification harness read only the card id; they are unaffected.

**(F) Split delivery.** This ADR covers the backend. The frontend citation popover rendering (the source URL as a safe link, an XSS-gating URL check, the popover chip) is a separate frontend increment covered by its own implementation plan. The backend lands independently and is green before the frontend begins.

## Alternatives Considered

### Option A: card id + span only (current state, no enrichment)

Keep the citation model unchanged. The SPA popover renders only the card-id slug and the span excerpt.

- Pro: zero backend change; zero risk.
- Con: the popover conveys no human-readable source link or relevance signal; the requirement is not met.
- Rejected: the owner chose full server-side enrichment.

### Option C: always emit a relevance score regardless of hybrid path

Emit a relevance score on every path by using the available score (RRF rank, dense cosine, reranker logit) normalized to [0, 100] via path-specific formulas.

- Pro: always shows a score in the popover.
- Con: the three score types are on fundamentally different scales (RRF ~1/(1+rank), dense cosine (0, 1], reranker logit unbounded). Cross-path comparison is meaningless and actively misleading. Normalizing each to [0, 100] hides the scale incompatibility.
- Rejected: the honesty constraint locked this in the planning brief.

### Option D: client-side enrichment via a new card-metadata endpoint

Add a public endpoint the SPA calls to fetch card metadata on demand.

- Pro: no change to the existing chat-response schema.
- Con: additional API surface; latency on popover open; the SPA has no trusted path to distinguish synthesised from model-hallucinated card metadata.
- Rejected: server-side enrichment is simpler and already has the data in memory.

## Consequences

**Positive:**
- The citation popover has all the data it needs without a new API endpoint.
- The LLM-URL firewall is preserved: the SPA never receives a URL the model generated.
- The eval gate, scorer regression, and certification harness are unaffected by the additive optional fields (confirmed by a regression run: 160 citation/scorer tests pass).
- The backend half of the feature lands independently and is green before any frontend work begins.

**Negative / risks:**
- The relevance score is absent in the majority of deployments where the cross-encoder is not loaded (cold-start, RAM-constrained, dense-only configurations). The popover must handle the absent value gracefully.
- An ingested KB card with no source field in Chroma metadata yields an absent source URL; this surfaces as a popover with no link. The current synthetic dataset populates the source for every card, so this is a degraded-dataset risk, not a common case.

**Cross-references:**
- [ADR-0020](./adr-0020-structured-agent-reply.md) — Structured Agent Reply (the backward-compatible chat-response citations contract this ADR extends)
- [ADR-0023](./adr-0023-hybrid-retrieval.md) — Hybrid Retrieval (the hybrid-path label and reranker-logit semantics this ADR reads)
