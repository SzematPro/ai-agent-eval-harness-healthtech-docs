---
title: "ADR-0002: LLM vendor abstraction"
description: Why LLM access goes through a thin vendor-neutral client Protocol switched by a single environment variable.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0002: LLM vendor abstraction (thin `LLMClient` Protocol)

- Status: Accepted
- Date: 2026-03-18
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The agent calls a chat-completion endpoint several times per turn
(scope classifier, drafter, safety check, judge). The project's
thesis includes the claim that the agent is vendor-neutral
and that the same code base can run against OpenAI, Anthropic, Groq,
or Cerebras with a single environment variable. That claim has to be
honoured by code, not by documentation copy.

At the same time, the project is on a $0/month steady-state budget.
The default demo path has to run on a generous free tier (Groq, Llama
3.3 70B-versatile, 30 RPM / 1K RPD), and the CI eval-judge path has to
fit inside another generous free tier (Cerebras, 1M tokens/day). The
"premium" providers (OpenAI, Anthropic) must be plug-in-able from the
user's keys without code changes.

How do we expose a single, stable interface for LLM completions
inside the agent and inside the eval harness, while keeping access to
four vendors and the option to add more later?

## Decision Drivers

- One coherent call surface for the agent and the eval harness; no
  per-vendor branching in node code
- Free-tier-by-default: the demo path runs on Groq's free tier
  without keys from the user
- CI economics: judge runs on Cerebras's 1M-tokens/day free tier;
  PR-blocking deterministic scorers do not need an LLM at all
- Production-realism: a user with paid OpenAI or Anthropic keys gets
  a near-identical experience by flipping `LLM_PROVIDER`
- Avoid heavy framework lock-in: we want the freedom to drop
  LangChain provider adapters later without rewriting agent nodes
- Strong typing on requests and responses (Pydantic-typed messages),
  consistent with the `mypy --strict` posture

## Considered Options

- **Thin `LLMClient` Protocol** over LangChain `langchain-openai` +
  `langchain-anthropic` plus direct Groq / Cerebras adapters via
  OpenAI-compatible REST, switched by an `LLM_PROVIDER` environment
  variable
- **Direct LangChain `ChatModel` everywhere**: use
  `langchain_openai.ChatOpenAI`, `langchain_anthropic.ChatAnthropic`,
  etc. directly inside agent nodes
- **LiteLLM proxy / SDK**: call every provider through LiteLLM's
  OpenAI-shaped layer
- **Raw vendor SDKs only**: bypass any abstraction, write four sets
  of vendor-specific calls
- **OpenRouter (or similar router)**: one HTTP endpoint, many
  providers selected by model name

## Decision Outcome

Chosen option: **thin `LLMClient` Protocol**, with concrete adapters
that wrap LangChain's provider clients for OpenAI and Anthropic and
that call Groq / Cerebras directly through their OpenAI-compatible
REST endpoints. The Protocol exposes a small set of methods (chat
completion, streaming chat completion, token counting). Vendor
selection is a single environment variable
`LLM_PROVIDER in {openai, anthropic, groq, cerebras}`,
factory-resolved at process start.

This option preserves the option-value to swap LangChain out later
(the agent never imports LangChain types directly), gives the eval
harness a stable, testable interface, and matches the realism the
project needs: a user with paid keys flips an environment variable and
the same agent runs against their preferred vendor.

### Confirmation

- Every agent node and every eval scorer that needs an LLM imports the
  `LLMClient` Protocol, not a provider class
- A CI smoke test imports each adapter (OpenAI, Anthropic, Groq,
  Cerebras) and asserts they implement `LLMClient`
- A CI integration test exercises at least two providers end-to-end
  on a short canned prompt to validate the "vendor-agnostic" claim
- `LLM_PROVIDER` is documented in the project configuration reference
  and the example environment file

## Consequences

### Positive

- Agent and eval code talk to one Protocol; vendor swap is an
  environment change, not a code change
- The free-tier-by-default path (Groq for demo, Cerebras for judge)
  keeps steady-state cost at $0 while still demonstrating
  production-realistic patterns
- Production-realism: a technically rigorous reader can paste their
  OpenAI or Anthropic key and run the same flow
- The Protocol is small (six methods or fewer) and trivially mockable,
  which keeps unit-test surface tight
- LangChain stays an implementation detail of two adapters, not a
  framework woven through the codebase

### Negative

- Two of the adapters depend on LangChain provider packages
  (`langchain-openai`, `langchain-anthropic`); we accept this in
  exchange for not re-implementing tool-use, function-calling, and
  streaming nuances
- The OpenAI-compatible REST adapter for Groq and Cerebras has to
  handle edge cases (rate-limit headers, streaming chunk format)
  that LangChain handles for the first-party providers
- The Protocol surface has to evolve carefully; a breaking change in
  the Protocol means touching every adapter and every node

### Neutral

- The project carries four adapters; only one is active at runtime
- Tokens-per-turn and ms-per-turn instrumentation lives at the
  adapter layer, not at the call site
- Streaming is opt-in: the Protocol exposes a streaming method but
  the default flow does not require it

## Pros and Cons of the Options

### Thin `LLMClient` Protocol

- Good, because it gives one inspectable interface for all four
  providers
- Good, because vendor swap is a single environment variable
- Good, because mocking the Protocol makes unit tests cheap
- Bad, because we own the adapter code for Groq and Cerebras
- Bad, because Protocol evolution is a coordination cost

### Direct LangChain `ChatModel` everywhere

- Good, because LangChain already wraps every major vendor
- Bad, because nodes import LangChain types directly, which couples
  the agent to LangChain's class hierarchy and breaks the
  "vendor-neutral, framework-light" posture

### LiteLLM proxy / SDK

- Good, because LiteLLM gives a uniform OpenAI-shaped API across
  many providers
- Bad, because it adds a third-party translation layer between the
  agent and the upstream models, with its own bug surface and
  observability quirks
- Bad, because Groq's and Cerebras's free-tier rate-limit semantics
  are easier to honour by talking to them directly

### Raw vendor SDKs only

- Good, because zero abstraction overhead
- Bad, because every node would carry vendor-specific code; the
  "vendor-agnostic" claim becomes false in code

### OpenRouter (or similar router)

- Good, because one endpoint many models
- Bad, because it adds an intermediary that is not free at the
  volume an eval harness can drive, and obscures which provider
  actually served a given turn

## More Information

- LangChain OpenAI provider:
  <https://python.langchain.com/docs/integrations/providers/openai/>
- LangChain Anthropic provider:
  <https://python.langchain.com/docs/integrations/providers/anthropic/>
- Groq OpenAI-compatible API:
  <https://console.groq.com/docs/openai>
- Cerebras OpenAI-compatible API:
  <https://inference-docs.cerebras.ai/api-reference/chat-completions>
- MADR 4.0.0: <https://adr.github.io/madr/>
