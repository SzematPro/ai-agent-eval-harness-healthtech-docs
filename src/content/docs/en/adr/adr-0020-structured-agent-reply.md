---
title: "ADR-0020: Structured Agent Reply"
description: Why the agent emits a validated structured reply (Pydantic schema plus per-provider JSON mode) instead of relying on substring matching over prose.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0020: Structured Agent Reply — Pydantic Schema + LLM JSON Mode

- Status: Accepted
- Date: 2026-05-27
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

Earlier, the agent emitted free prose, and the refusal- and
escalation-correctness scorers decided "did the agent refuse?" /
"did the agent escalate?" by substring-matching the prose against
English-only marker tables.

This is fragile in three concrete ways:

1. The marker tables are English-only. The harness ships es-419 and
   pt-BR locales ([ADR-0001](./adr-0001-orchestration.md)) but the
   scorers cannot see a refusal in those locales unless the prose
   happens to contain the English substrings. A separate multilingual
   regex existed in parallel in the guardrail layer — two parallel
   marker layers that drift independently.
2. Adding a new refusal sub-template (six were added:
   `input-malformed`, `out-of-scope-dosing`, `out-of-scope-diagnosis`,
   `out-of-scope-interpretation`, `out-of-scope-pii`,
   `out-of-scope-meta`) requires extending the marker table; a missed
   substring silently mis-scores a refusal as an answer.
3. The eval-gate signal is structurally an n-of-N substring match on
   prose that the model may legitimately paraphrase. Two semantically
   identical refusals can score 1.0 and 0.0 depending on word choice.

The structured-agent-domain upgrade needed the contract robust before
stacking RAG retrieval and a retrieval-only scorer on top. How do we
make the discriminator structural rather than prose-based, while
keeping the SPA's existing assistant-text rendering unchanged?

## Decision Drivers

- **Structural correctness**: the discriminator must not depend on
  prose word-choice or locale.
- **Vendor portability**: the contract must work across Groq, OpenAI,
  Cerebras, Anthropic, and the in-process stub. JSON mode coverage
  varies sharply across vendors.
- **Backward compatibility**: existing tests, the eval gate, and the
  SPA must keep working through the migration. No "big-bang" rewrite.
- **Eval signal**: the structured kind directly maps to the
  must_refuse / must_escalate expectations the eval cases already
  carry, so the scorer becomes a one-line discriminator check.
- **Span budget**: trace attributes for the structured reply must fit
  the existing observability budget (metadata-only span policy from
  [ADR-0006](./adr-0006-observability.md)).

## Considered Options

- **Option A**: Keep prose + extend the substring marker tables
  per-locale + add per-locale regex layers.
- **Option B**: Migrate every adapter to native tool-use with a
  single `agent_reply` tool whose schema enforces the envelope.
- **Option C**: Add a Pydantic `AgentReply` schema, request JSON mode
  per provider (each adapter degrades politely to its best available
  JSON surface), validate at the agent layer, consume the
  discriminator at the scorer layer, deprecate substring matching in
  three stages.

## Decision Outcome

Chosen option: **Option C** — Pydantic schema + per-provider JSON
mode + staged deprecation of the substring layer.

The single load-bearing reason is the cross-provider asymmetry of
tool-use support: Anthropic offers tool-use natively, the OpenAI-
compatible providers (Groq, OpenAI, Cerebras) offer
`response_format={"type":"json_schema",...}` directly, and the
stub-client path needs neither. Option B would force the OpenAI-
compatible adapters into an unnecessary tool-use detour just to
match Anthropic. Option C lets each adapter use its native idiom and
the agent layer validates a vendor-agnostic shape on the way out.

The structured reply is a small validated envelope with four fields:

- `kind` — one of `refusal`, `answer`, or `escalation` (the
  discriminator the scorers read).
- `text` — the locale-rendered assistant message (non-empty).
- `citations` — the list of KB chunk ids supporting the reply.
- `rationale` — a short internal explanation (length-bounded).

The migration shipped in three stages:

1. **Additive**: land the schema; extend the completion request and
   result types with optional JSON-mode fields; thread the JSON-mode
   payload through the shared transport; set the structured reply on
   the agent state from the response-generation node and the refusal /
   answer / escalation emit helpers; have the scorers prefer the
   structured `kind` when present and fall back to substring markers
   when absent.
2. **Test migration**: rewrite refusal / escalation / scorer
   assertions to read the new `kind` discriminator.
3. **Atomic deletion**: remove the substring marker tables and the
   prose-matching helpers; remove the fallback branches; migrate the
   post-guardrail call-site to consume the structured reply when it is
   available.

The per-provider JSON-mode posture:

- **Groq / OpenAI / Cerebras**: native
  `response_format={"type":"json_schema","json_schema":{...,"strict":true}}`
  via the shared OpenAI-compatible payload builder.
- **Anthropic**: no native flag; inject a JSON-mode preamble into the
  system message and tolerantly parse the response. Tool-use
  migration is deferred (cascades into Anthropic are rare; the
  preamble approach keeps that provider usable without a deeper
  adapter rewrite).
- **Stub**: emits a canned reply envelope reusing the existing
  locale-aware heuristics.
- **Fallback**: transparent relay; the JSON-mode request field
  survives unchanged across primary → fallback → last-resort.

### Confirmation

- A dedicated test pins the schema shape and the round-trip.
- Each adapter test asserts the JSON-mode payload shape on the request
  and the structured field on the response.
- Each graph integration test asserts the structured reply `kind`
  matches the expected path.
- A post-migration audit confirms zero references to the old substring
  marker tables inside the eval layer.

## Consequences

### Positive

- The discriminator is locale-invariant and survives any paraphrase
  the model emits.
- Adding a new refusal sub-template is a one-line reply-kind branch,
  not a marker-table extension.
- The scorers become trivial: a single discriminator equality
  check per case.
- The structured envelope is the natural carrier for the later
  citation-span upgrade and the retrieval-recall scorer.
- The eval signal becomes structural; same-semantic paraphrases
  score identically.

### Negative

- Anthropic answers under JSON mode pay ~50 input tokens per turn
  for the schema preamble. Cascades into Anthropic are rare on a
  Groq-primary setup, so the cumulative cost is small, but
  non-zero.
- A new abstraction surface (the reply envelope and its kind enum) is
  added to the agent package's public API.
- The transport layer grows two optional request fields and one
  optional result field; vendor adapters must respect them or document
  why they do not.

### Neutral

- The SPA's rendering contract is unchanged: the last message's
  content still receives the locale-rendered `text`. The structured
  envelope is observable on the agent state and on trace spans but not
  in the SSE stream (extending the SSE event types was handled
  separately in token streaming).
- Temperature for JSON-mode calls is lowered to 0.0; the free-form
  paths keep the existing 0.2 default.

## Pros and Cons of the Options

### Option A: extend marker tables per-locale

- Good, because zero adapter changes.
- Bad, because the marker tables grow with every new locale and
  every new sub-template; drift between the eval-layer markers and the
  guardrail-layer regex becomes worse.
- Bad, because the eval signal stays prose-coupled; paraphrases
  still mis-score.

### Option B: native tool-use across all providers

- Good, because the schema is enforced at the provider boundary.
- Bad, because Groq / OpenAI / Cerebras gain a tool-use detour they
  do not need (they already offer json_schema directly).
- Bad, because tool-use trip rate (model deciding when to call the
  tool) is an additional failure mode that does not exist with a
  forced `response_format`.

### Option C (chosen): Pydantic schema + per-provider JSON mode + staged deprecation

- Good, because each adapter uses its native idiom.
- Good, because the migration is staged and reversible at each
  checkpoint.
- Good, because the structured envelope is the natural carrier for
  later citation spans and the retrieval-only scorer.
- Bad, because Anthropic's lack of a native flag forces a
  prompt-preamble + tolerant-parse posture that other adapters do
  not need.

## More Information

- [ADR-0001](./adr-0001-orchestration.md) — agent state and LangGraph
- [ADR-0002](./adr-0002-llm-vendor-abstraction.md) — LLM client
  Protocol
- [ADR-0003](./adr-0003-eval-harness.md) — scorer Protocol
- [ADR-0005](./adr-0005-guardrails.md) — refusal and escalation
  contract
- [ADR-0006](./adr-0006-observability.md) — metadata-only span
  policy
- MADR 4.0.0: <https://adr.github.io/madr/>
