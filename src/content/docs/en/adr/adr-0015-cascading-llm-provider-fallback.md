---
title: "ADR-0015: Cascading LLM Provider Fallback"
description: Why the LLM completion step cascades Groq to Cerebras to Anthropic on transient errors only, preserving quota and attributing cost to the answering provider.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0015: Cascading LLM Provider Fallback (Groq → Cerebras → Anthropic)

- Status: Accepted
- Date: 2026-05-27 (recorded retroactively as part of post-launch polish; the cascade shipped in an earlier release)
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The demo agent runs on Hugging Face Spaces, CPU Basic free tier, single
worker (ADR-0007). The primary LLM provider is Groq
`llama-3.3-70b-versatile` at $0 cost. Free-tier quota is shared across all
users of the Space, so a short burst of curious visitors can rate-limit
the primary while a viewer is mid-conversation. A `429 Too Many Requests`
returned to a live demo viewer is unacceptable.

How do we degrade gracefully when the primary provider returns a transient
error, without burning the secondary's quota on non-transient failures and
without lying in the cost ledger about which provider actually answered?

The scope is: the LLM completion step inside the agent graph. The cascade
is invisible to the agent state schema and to the citation guardrail.

## Decision Drivers

- **Quota preservation**: a 4xx that is not a 429 (e.g., 400 malformed,
  401 bad key) must NOT trip the cascade. Burning the secondary's quota on
  a deterministic 400 wastes capacity that future legitimate traffic will
  need.
- **Cost attribution**: the cost ledger must record the provider that
  actually answered, not the one we first tried. Otherwise the cost
  dashboards lie.
- **Provider portability**: ADR-0002 defined the LLM client Protocol. The
  cascade must compose at the client level, not leak into the agent graph
  or the eval harness.
- **Failure transparency**: when all providers fail, the user sees a
  friendly retryable HTTP 503 with a `Retry-After`, not a stack trace.

## Considered Options

- **Option A**: Single-provider with retry-only on transient errors. No
  cascade.
- **Option B**: Cascade that retries every error on the next provider
  (naive).
- **Option C**: Cascade with typed transient-error classifier; non-429 4xx
  is NOT retried; answering provider tagged in metadata.
- **Option D**: External gateway service (Portkey, LiteLLM Router,
  OpenRouter) that handles the cascade in front of the agent.

## Decision Outcome

Chosen option: **Option C** -- Cascade with typed transient-error
classifier and answering-provider attribution. The single most
load-bearing reason is quota preservation: the project demonstrates a
cost-conscious posture (cost gates in CI, per-turn budget), and a naive
cascade would silently double input-token spend on deterministic 4xx
failures. Option D was rejected because adding an external service for a
single-process demo is operational over-engineering at this scale; the
Protocol-level abstraction in ADR-0002 makes the in-process cascade
trivial to write.

The cascade chain is:

1. **Primary**: Groq `llama-3.3-70b-versatile` (free tier within quota)
2. **Fallback 1**: Cerebras `gpt-oss-120b` (also free-tier-friendly, the
   judge model under ADR-0009; reused as a completion fallback)
3. **Fallback 2**: Anthropic `claude-haiku-4-5-20251001` (paid escape
   hatch when both free tiers exhaust)

The transient classifier recognises three classes as retriable:

- HTTP 429 (rate limit)
- HTTP 5xx (server error)
- Transport failure (no HTTP status, e.g. connection reset)

Everything else (4xx other than 429) raises immediately. The non-retry of
non-429 4xx is the load-bearing quota-preservation decision.

The answering provider is tagged in the completion result metadata so the
cost accumulator records spend against the correct provider.

### Confirmation

- Unit tests cover: Groq 429 → Cerebras success, Groq 5xx → Cerebras
  success, Groq transport failure → Cerebras success, Groq 401 → no
  fallback (raises), all-providers-fail → 503 to caller, mixed providers
  with correct attribution.
- The cost ledger test asserts that the provider recorded on each cost unit
  is the answering provider, not the requested provider.

## Consequences

### Positive

- The demo survives a Groq quota burst without operator intervention.
- The Anthropic escape hatch caps total demo cost at a small bounded
  per-turn USD figure (from the per-provider pricing table).
- Cost attribution is honest end-to-end.
- The agent code and the eval harness are oblivious to the cascade.
- Quota preservation: a deterministic 4xx error does not waste the
  secondary's free-tier budget.

### Negative

- Three providers must be configured in production. Operators who only want
  one provider can pin a single provider and skip the cascade, but the
  default surface is the full cascade.
- A failure on Anthropic costs real USD even though the demo target is $0.
  The cost gate protects against runaway spend by failing CI when the
  corpus average exceeds the per-turn budget.
- Locale-aware errors in the cascade path are not yet localised -- the HTTP
  503 body returns English. (Tracked as future work.)

### Neutral

- The transient classifier is a maintenance surface; new provider HTTP
  semantics (e.g., a hypothetical 425 Too Early) need to be added
  manually.
- The cascade adds two HTTP round trips in the worst case. The configured
  per-turn latency budget accommodates this.

## Pros and Cons of the Options

### Option A: Single-provider, retry-only

- Good, because operationally simple -- one provider, one config.
- Good, because retry is well-understood at the HTTP transport layer.
- Bad, because it does not cover sustained 429 (quota exhaustion).
- Bad, because the demo dies when Groq's free-tier quota window expires.

### Option B: Naive cascade (retry every error)

- Good, because the demo survives transient errors.
- Bad, because a deterministic 400/401 wastes the secondary's quota trying
  to "retry" something that will never succeed.
- Bad, because cost attribution becomes ambiguous (which provider's budget
  did this turn hit?).

### Option C (chosen): Typed cascade with attribution

- Good, because quota-preserving (non-429 4xx stays on primary).
- Good, because cost-honest (metadata records the answering provider).
- Good, because provider-portable at the Protocol seam (ADR-0002).
- Bad, because it adds a maintenance surface (the transient classifier).

### Option D: External gateway service

- Good, because it removes the cascade logic from the project.
- Good, because some gateways add observability for free.
- Bad, because it adds an external dependency, network hop, and operational
  cost for a single-process demo.
- Bad, because it conflicts with the $0/month deployment posture.

## More Information

- [ADR-0002](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/) -- LLM vendor
  abstraction (the Protocol the cascade composes over)
- [ADR-0007](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0007-deployment/) -- deployment target and the
  drivers behind the resilience layer
- [ADR-0017](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0017-free-tier-deployment-resilience/) -- the
  complementary in-process rate limiter and response cache
- MADR 4.0.0: <https://adr.github.io/madr/>
