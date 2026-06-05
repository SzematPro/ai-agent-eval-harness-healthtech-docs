---
title: "ADR-0017: Free-Tier Deployment Resilience Layer"
description: Why the demo protects its single free-tier worker with an in-process sliding-window rate limiter and a bounded TTL response cache, no Redis, at $0/month.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0017: Free-Tier Deployment Resilience Layer

- Status: Accepted
- Date: 2026-05-27 (recorded retroactively; the resilience layer shipped in an earlier release)
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The demo lives on Hugging Face Spaces, CPU Basic free tier, single uvicorn
worker (ADR-0007). The Space URL is shared publicly. A short burst of
curious visitors -- a post that gets picked up, a conference mention --
can spike traffic faster than the agent can answer.

Without protection, the worker queues turns until either the worker event
loop falls behind and timeouts cascade, or the Hugging Face Spaces proxy
returns 502 Bad Gateway. Both outcomes turn a public moment into a broken
demo.

How do we protect the worker from concurrent-request bursts while keeping
the $0/month operational cost and the single-worker simplicity, without
introducing Redis?

## Decision Drivers

- **$0/month operational budget** (ADR-0007): no Redis, no managed
  rate-limit service.
- **Single-worker simplicity**: the deployment design is one uvicorn
  process per Space; sharing rate-limit state across workers is not a
  current concern.
- **Transparent retry semantics**: the client (the app) must know when to
  retry. `Retry-After` is the load-bearing header.
- **Demo survives identical-input bursts**: when ten viewers click the same
  example scenario, the worker should compute the answer once.

## Considered Options

- **Option A**: No protection. The worker handles every request until it
  falls over.
- **Option B**: Redis-backed sliding-window rate limiter + response cache.
- **Option C**: In-process sliding-window rate limiter + in-process TTL
  response cache, both keyed on a normalised request signature. Bounded
  memory.
- **Option D**: Use a CDN-level rate limit (Cloudflare in front of Hugging
  Face Spaces).

## Decision Outcome

Chosen option: **Option C** -- an in-process resilience layer with a
sliding-window rate limiter and a TTL response cache, both bounded and
memory-resident. The single most load-bearing reason is the $0/month
budget: any external dependency for rate limiting violates the deployment
posture. The in-process design also matches the single-worker truth --
there is no second worker to coordinate with.

Behaviour:

- The rate limiter is keyed on the client IP (proxy-aware, so the
  `X-Forwarded-For` header is honoured behind the Hugging Face Spaces
  reverse proxy). A sliding window with a bounded request count per window
  rejects bursts with HTTP 429 and a `Retry-After` hint.
- The response cache is keyed on a normalised (text, locale, model) tuple.
  A short TTL keeps memory bounded. Identical inputs within the TTL window
  return the cached answer, avoiding redundant LLM spend.
- The cache is NEVER used for a paused (HITL) turn -- a paused draft is not
  a final answer and must not be served to a different session as if it
  were.

### Confirmation

- The rate limiter and cache are implemented in a dedicated resilience
  module.
- Unit tests cover: the rate-limit decision under burst, a cache hit on
  identical input, a cache miss on a different locale or model, no cache on
  paused turns, and `Retry-After` propagation.
- The limiter is applied before agent work, and the cache is applied around
  the agent invocation.

## Consequences

### Positive

- The demo survives traffic bursts without external infra.
- Identical-input traffic (the "everyone clicked the same example" pattern)
  costs zero LLM spend on repeats within the cache TTL.
- The HTTP 429 + `Retry-After` semantics are transparent and
  client-friendly.
- The $0/month budget is preserved.

### Negative

- The protection is per-worker. A horizontal-scale-out deployment
  (multi-worker uvicorn behind a load balancer) would need to externalise
  the limiter and cache to Redis. The design is honest about this
  limitation, recorded as a production-readiness gap in the performance
  report.
- Worker restart loses cache state. Cold-start traffic pays full LLM cost
  until the cache warms.
- The IP-based limiter is coarse: a corporate NAT presents the whole
  organisation as one IP. The bounded-window count must be tuned not to
  penalise legitimate NATted traffic; current tuning is intentionally
  lenient.

### Neutral

- The rate-limit decision adds one in-process check per request. Latency
  cost is sub-millisecond.
- The cache adds in-memory state. A bounded TTL keeps the memory footprint
  manageable on CPU Basic (16 GB RAM).

## Pros and Cons of the Options

### Option A: No protection

- Good, because zero infrastructure.
- Bad, because the worker falls over under burst traffic.
- Bad, because there is no 429 + `Retry-After` semantics -- the client sees
  502 from the Hugging Face proxy.

### Option B: Redis-backed limiter + cache

- Good, because it survives multi-worker scale-out.
- Bad, because it adds an external dependency (Redis instance, secret
  management, network hop).
- Bad, because it conflicts with the $0/month budget.
- Bad, because it is over-engineered for the single-worker reality.

### Option C (chosen): In-process limiter + cache

- Good, because no external dependency.
- Good, because it matches the single-worker truth.
- Good, because it is explicit, testable, and self-contained.
- Bad, because it does not scale beyond one worker (acknowledged).

### Option D: CDN-level rate limit

- Good, because it offloads protection to Cloudflare's edge.
- Bad, because Hugging Face Spaces routes traffic directly; putting
  Cloudflare in front requires DNS / domain control that the Space does not
  have by default.
- Bad, because it does not cover the response-cache need.

## More Information

- [ADR-0007](./adr-0007-deployment.md) -- deployment target and the
  $0/month budget
- [ADR-0015](./adr-0015-cascading-llm-provider-fallback.md) -- the
  complementary cascading-fallback layer
- MADR 4.0.0: <https://adr.github.io/madr/>
