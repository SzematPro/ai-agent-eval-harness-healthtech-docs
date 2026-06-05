---
title: "ADR-0007: Deployment target"
description: Why the public demo runs on Hugging Face Spaces, Docker SDK, CPU Basic free tier, from the same image as CI.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0007: Deployment target (Hugging Face Spaces, Docker SDK, CPU Basic free tier)

- Status: Accepted
- Date: 2026-05-12
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

This is a public reference implementation. A live demo URL is itself a
load-bearing signal: a reader is two scrolls away from clicking a link
that opens a real multi-turn conversational agent in a browser. That
URL must be reachable without a credit card, must not silently
disappear when a free tier is rolled back, and must run the same
image the project's `Dockerfile` builds locally. Any divergence
between the development image and the deployed image undermines
the eval harness story; the whole point is that what runs in CI is
what runs in prod.

The agent is single-process FastAPI / Uvicorn, with an embedded
Chroma store and a baked-in fallback embedder, dispatching LLM calls
to an external provider (Groq by default; see
[ADR-0002](./adr-0002-llm-vendor-abstraction.md)). No GPU, no model
weight to host, no persistent disk beyond the 30-50 card synthetic KB.

How do we ship a public, always-reachable demo URL of this agent
under $0 / month, from the same Dockerfile the project ships, in a way
an operator can fork-and-deploy with one secret, durable against
the free-tier reshuffle that happened across several PaaS providers
between 2023 and 2025?

## Decision Drivers

- **$0 / month under demo load**: the demonstration platform is open-ended;
  recurring spend would be paid out of pocket indefinitely.
- **Single Dockerfile path**: the deploy must build from the same
  `Dockerfile` the project ships. No production-only Dockerfile
  divergence.
- **AI-reference domain affinity**: a `huggingface.co/spaces/...`
  URL signals "AI reference implementation" the moment a reader
  sees it. The host is part of the message.
- **Low operator friction**: a fork-and-deploy must reach a green
  state with one deploy secret, not a six-step procedure with a
  credit-card prerequisite.
- **Rollback simplicity**: bad deploys are reverted either by
  deleting the latest commit on the Space remote or by pushing a
  `git revert` on the default branch. No infra-side rollback flow.
- **No LFS, no model weights**: the agent has no large artefact to
  host alongside the code; the embedder is downloaded on first run
  inside the image.
- **Free-tier durability**: pick a host whose free tier is
  anchored in the host's strategy, not a homepage promise that
  gets withdrawn.

## Considered Options

- **Hugging Face Spaces, Docker SDK, CPU Basic free** (chosen):
  same Dockerfile, 2 vCPU + 16 GB RAM, sleeps after 48 h of idle,
  auto-wakes on next request, public URL, no card on file.
- **Hugging Face Spaces, Gradio / Streamlit SDK**: same host, but
  the SDK builds the UI; the FastAPI surface the project ships would
  not match the deployed image.
- **Render Web Service, free tier**: same Dockerfile target;
  sleeps after 15 minutes of idle with a 30-60 s cold start.
- **Fly.io, free tier**: the original free tier ended in October
  2024, replaced by a $5 / month trial-credit posture.
- **Railway, free tier**: free plan withdrawn in August 2023 in
  favour of $5 / month trial credits; not $0 / month.
- **Vercel, Hobby plan**: serverless function timeout of 10 s on
  Hobby kills any multi-turn agent stream once the LLM round-trip
  exceeds the limit.
- **Cloudflare Workers AI**: a model-routing platform rather than
  a generic Docker host; the Python + embedded Chroma stack would
  need rewriting against the Workers runtime.
- **Streamlit Community Cloud**: free, but binds the demo to a
  Streamlit UI; the FastAPI surface becomes inaccessible.
- **Modal**: trial credits, then pay-per-second; steady state is
  not $0 / month.

## Decision Outcome

Chosen option: **Hugging Face Spaces, Docker SDK, CPU Basic free
tier**, with **Render Web Service, free tier** documented as the
operator's second choice in the deploy reference and reachable from
the same Dockerfile with one environment-variable change (`$PORT`).

The Space lives at
`https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`
and is built by Hugging Face's Docker builder from the repository's
`Dockerfile`. The build is triggered by a deploy workflow, which
mirrors the default branch and every release tag onto the Space
remote, swapping the root README for a Space-specific card in a
deploy-only commit so the HF Spaces YAML front-matter never touches
the source repository. The deploy commit is never pushed back to the
source repository; the Space is a mirror, not a collaboration target.
The deploy is gated on a single deploy secret; until that secret is
configured the workflow fails fast with a clear error.

The Docker SDK choice is load-bearing. The Gradio and Streamlit
SDKs would build a UI around a Python entry point and diverge from
the FastAPI surface. With the Docker SDK the same image runs in three
places: a contributor's laptop (`docker run`), the eval harness, and
the public demo (HF Spaces). One image, one mental model, one set of
behaviours under test.

The CPU Basic tier (2 vCPU, 16 GB RAM, 50 GB ephemeral) comfortably
hosts the embedded Chroma store and the baked-in
sentence-transformers model. LLM calls are dispatched to an
external provider, so the Space itself only handles RAG retrieval,
orchestration, and HTTP. The 48-hour idle sleep produces a 10-30
second cold start on the first request after wake; surfaced in the
Space card so a reader is not surprised.

### Confirmation

- A green deploy-workflow run on push to the default branch and on
  every `v*` release tag, with the deploy secret configured.
- A reachable public URL at
  `https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`.
- The Space answers `GET /health` with `200 OK` after wake.
- The Space answers `POST /chat` in demo mode against an offline stub
  client (no caller-side keys required for the public demo).
- The deploy reference documents the operator bootstrap (Space
  creation, deploy-token minting, secret registration, first deploy).

## Consequences

### Positive

- **$0 / month** under demo load; HF Spaces does not enforce a
  per-month quota on Docker CPU Basic Spaces.
- **Same Dockerfile everywhere**: development, CI, production.
- **One-secret operator path**: a single deploy secret is the entire
  onboarding for the deploy story.
- **Domain-aligned URL**: the host carries part of the project's
  signal before the reader reads the body.
- **Trivial rollback**: delete the bad commit on the Space, or push
  a `git revert` on the default branch and let the next deploy mirror
  it.
- **No model-weight hosting**: avoids LFS, avoids the storage tier
  on the host, keeps the image under 1 GB.

### Negative

- **Cold start of 10-30 s** after a 48-hour idle window; surfaced
  to readers in the Space card.
- **HF Spaces builder lock-in**: an HF outage delays a deploy; the
  Render fallback is documented in the deploy reference for that
  contingency.
- **CPU-only**: the Space cannot host a local LLM; the demo
  depends on an external provider for completions. By design (see
  [ADR-0002](./adr-0002-llm-vendor-abstraction.md)).
- **YAML front-matter in the Space card** is incompatible with
  GitHub's renderer, so the deploy workflow has to swap the root
  README in a deploy-only commit.

### Neutral

- A new deploy workflow and a new Space-card directory become part of
  the repository layout.
- A deploy secret becomes required for the live demo; contributors
  without push rights develop locally without it.
- The Space remote tolerates force-push (it is a mirror); the source
  remote does not. The workflow comments make this asymmetry explicit
  so an operator does not transfer the posture across remotes.

## Pros and Cons of the Options

### Hugging Face Spaces, Docker SDK, CPU Basic free

- Good, because the host matches the project's AI-reference domain
  in one glance at the URL.
- Good, because the Docker SDK runs the project's `Dockerfile` as-is.
- Good, because HF's free tier is anchored in community Spaces
  driving Hub traffic; unlikely to disappear on short notice.
- Good, because rollback has no infra side.
- Bad, because cold-start latency after 48-hour idle is visible.
- Bad, because the Space-card YAML front-matter requires a
  deploy-only swap of the root README.

### Hugging Face Spaces, Gradio / Streamlit SDK

- Good, because the SDKs ship an opinionated, hosted UI.
- Bad, because the demo surface diverges from the FastAPI surface
  the project ships; the deployed thing stops being the same thing
  as the locally-built thing.

### Render Web Service, free tier

- Good, because the same `Dockerfile` deploys with one
  environment-variable change (`$PORT`).
- Bad, because the 15-minute idle sleep is more aggressive than HF
  Spaces' 48-hour window, and the host carries no AI-reference
  domain signal.

### Fly.io / Railway free tiers

- Bad, because the historical free tiers were withdrawn (Fly.io
  October 2024, Railway August 2023) in favour of trial credits;
  steady state is not $0 / month.

### Vercel Hobby

- Bad, because the 10-second function timeout kills any multi-turn
  agent stream once the LLM round-trip exceeds it.

### Cloudflare Workers AI

- Bad, because the Python + embedded Chroma stack would have to be
  rewritten against the Workers runtime.

### Streamlit Community Cloud

- Bad, because the UI binds the demo to Streamlit; the FastAPI
  surface becomes inaccessible.

### Modal

- Bad, because trial credits expire; steady state costs money.

## More Information

- Operator runbook: [deploy reference](../reference/deploy.md)
- Hugging Face Spaces Docker SDK docs:
  <https://huggingface.co/docs/hub/spaces-sdks-docker>
- Hugging Face pricing (Spaces hardware tiers):
  <https://huggingface.co/pricing>
- Render free-tier docs: <https://render.com/docs/free>
- Fly.io free-tier post-mortem thread:
  <https://community.fly.io/t/free-tier-is-dead/20651>
- Vercel function runtime limits:
  <https://vercel.com/docs/functions/runtimes#max-duration>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Deployment-resilience layer

Three per-process primitives ship to make the free-tier demo degrade
gracefully under load rather than surface raw upstream errors. All
three are driven by enable flags so they are off by default for
deterministic tests and on for the live Space:

- **Per-session rate limiter.** A per-key (per client IP) sliding-window
  limiter. An over-limit caller receives an HTTP 429 with a
  `Retry-After` header instead of a raw 502. Tunable via maximum
  requests and window-seconds settings. A dependency was deliberately
  not added; the in-process limiter keeps the framework-free posture.
- **Provider fallback chain.** A wrapper around the `LLMClient` Protocol:
  a transient Groq failure (HTTP 429, 5xx, or a bare transport failure)
  cascades through Cerebras (free fallback) and Anthropic (paid last
  resort) before any error reaches the frontend. A non-429 4xx is a
  genuine client error and is re-raised unchanged. Consistent with the
  [ADR-0002](./adr-0002-llm-vendor-abstraction.md) vendor abstraction -
  the fallback is a Protocol-level wrapper, not a node-level change.
- **Short-TTL response cache.** A bounded, short-TTL in-process cache
  keyed on the normalized (input, locale, model) tuple, so the SPA
  "load example" clicks are served without hitting the provider.

**Single-worker consequence.** All three primitives are per-process,
as is the in-memory HITL checkpointer (see
[ADR-0001](./adr-0001-orchestration.md)). The Space therefore runs a
single uvicorn worker by design; a second worker would not share the
limiter, the cache, or the paused-thread state. A multi-worker
deployment would need a shared store (Redis, Postgres), which is out of
scope for the $0 demo. This is documented in the deploy reference and
the `Dockerfile` comment.

**Baked-in embedder.** The shipped default embedder is
`BAAI/bge-small-en-v1.5`, CPU-Basic-friendly on the Space free tier.
See [ADR-0004](./adr-0004-rag-stack.md) for the embedder decision; the
deployment posture here is unaffected by the model choice.
