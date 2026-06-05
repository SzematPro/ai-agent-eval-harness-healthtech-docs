---
title: "ADR-0022: Token Streaming"
description: Why streamed token deltas use LangGraph's custom stream mode and a separate streaming client Protocol, shipped first for the default provider.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0022: Token Streaming — LangGraph Custom Stream + Streaming Client Protocol

- Status: Accepted
- Date: 2026-05-28

## Context

The agent's response-generation node buffered the entire LLM response before downstream parsing, citation verification, and the SSE node-completed event fired. The user-visible latency was therefore the wall-clock from first token to last token, plus the parse step, before anything appeared in the SPA. On a 500-token JSON-mode reply at Groq's typical 250 tok/s, that is ~2 seconds of silence between the node-started event and the first character of the assistant message.

The deployed Groq endpoint already exposes a Server-Sent-Events streaming surface (`chat/completions` with `stream: true`); the per-token deltas arrive on the wire as the model generates them. The SPA already runs an EventSource against the chat endpoint and consumes per-node SSE lifecycle events ([ADR-0010](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0010-streaming-execution-graph/)). The infrastructure to surface the deltas exists; this ADR records the design decisions made when wiring the two ends together.

## Decision

Three coupled decisions:

1. **Cross-boundary mechanism: LangGraph custom stream.** The response-generation node emits a custom stream event (`{"event": "token_delta", "delta": "..."}`) for each token chunk it receives from the adapter. The FastAPI streaming handler requests LangGraph's `custom` stream mode alongside the existing modes; chunks from `custom` are routed to SSE `token_delta` records via a small mapping helper.

2. **Adapter API: separate streaming client Protocol.** A streaming client Protocol extends the base LLM client Protocol with an async `stream(messages, params)` method returning an async iterator of token deltas. Both Protocols are runtime-checkable. Adapters that expose streaming implement both Protocols; adapters that do not stay base-Protocol only. The agent's streaming branch routes by an isinstance check and falls back to the buffered completion call for non-streaming adapters.

3. **Scope: Groq-only at launch.** The streaming branch shipped for the Groq client and the in-process stub (for tests). The Cerebras, OpenAI, Anthropic, and fallback clients deliberately stayed buffered-only. Cerebras and OpenAI use the same OpenAI-compatible SSE shape and can be added with one-line adapter changes when warranted; Anthropic's SSE shape differs and needs its own adapter work. The fallback client is not streaming-aware: on a primary-stream failure mid-flight, the consumer surfaces an SSE error event and the SPA shows a retry. A cascading-stream future-state is documented under "Future work".

## Alternatives considered

### A1: Out-of-band queue instead of LangGraph custom stream

Pass a queue from the FastAPI handler into the graph via the runnable config. The node pushes deltas onto the queue; the handler reads from the queue concurrently with the graph stream.

- Pro: Works on any LangGraph version; pre-existing pattern in async Python codebases.
- Con: Introduces out-of-band state that the test layer has to set up; ordering between the queue's deltas and the existing stream chunks is not graph-native and has to be enforced by the handler.
- Rejected: the pinned LangGraph version already provides a documented native stream-writer API.

### A2: Extend the completion method with a per-token callback

One Protocol method; streaming is a callback the adapter invokes per token.

- Pro: No new Protocol class.
- Con: Every adapter signature changes; static typing cannot distinguish streaming vs non-streaming adapters; the callback type is harder to reason about than an async iterator.
- Rejected: structural typing via a separate Protocol is the more idiomatic Python pattern.

### A3: Stream for every adapter that supports it (Cerebras + OpenAI included)

Maximises streaming coverage by extending Cerebras and OpenAI adapters at the same time.

- Pro: more user wins per increment.
- Con: Cerebras and OpenAI streaming under the cascading fallback tier-switching is not validated; could leak half-streamed responses on a fallback; the cascade design itself is buffered-only (per the fallback design in [ADR-0002](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/)).
- Deferred: noted as future work below.

### A4: SPA renders deltas in a separate panel; main message area still buffers

Two render targets: a debug-style raw stream panel, plus the main message area that waits for turn completion.

- Pro: No replace-on-completion glitch.
- Con: Fails the user-visible goal (the whole point of token streaming is the ChatGPT-style materialisation in the main area).
- Rejected: progressive render in the main area is the user-facing payoff.

## Consequences

### Positive

- Reduces perceived latency to first token from ~2s (full-response buffer) to ~80ms (first token on the wire) on a typical Groq generation.
- The streaming surface is purely additive on the SSE wire: clients that don't subscribe to the new event name silently ignore it per W3C SSE semantics.
- The buffered completion path is preserved unchanged for every non-streaming adapter, every JSON chat request, and the eval CLI. Backward compatibility holds for those paths.
- The new Protocol surface is small (one method, one type); test doubles are simple.

### Negative

- The cascading fallback is bypassed when streaming. On a Groq primary-stream failure, the consumer sees an SSE error event and must retry. Cascading-fallback for streamed turns is a future-state design that this ADR does not commit to.
- The SPA's progressive render must handle partial-JSON states (the LLM is JSON-mode under [ADR-0020](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0020-structured-agent-reply/); tokens arrive as `{"kind":"...","text":"..."}` character by character). The render layer strips the JSON envelope and renders only the inner `text` value; a partial `"text":"...` requires careful UI logic.
- The streaming chunk's latency figure is the cumulative time since the stream opened; the per-chunk wall-clock delta is not reported because it is rarely meaningful for downstream accounting.

### Neutral

- The SSE wire-format adds one new event name (`token_delta`); the existing event names (`graph_topology`, `node_started`, `node_completed`, `paused`, `turn_completed`, `error`, `interaction_logged`, `cost_updated`) are untouched.

## Implementation notes

- The token-delta payload carries the delta string, a finish reason, token-in / token-out counts, a cumulative latency figure, the model name, and a small metadata map. Intermediate chunks carry a null finish reason and zero token counts; the terminal chunk carries the per-turn accounting.
- Stream retry covers only the initial connection establishment (3 attempts, exponential backoff). Mid-stream failures raise immediately.
- The OpenAI-compatible streaming request sets `stream=True` plus `stream_options={"include_usage": True}` so the terminal chunk carries usage across all OpenAI-compatible providers.
- The chunk-to-token-delta parser is provider-agnostic and shared, so future Cerebras / OpenAI streaming adapters reuse it.

## Future work

- **Cerebras streaming**: a one-line adapter change reusing the shared transport helpers. Deferred until a measured need surfaces.
- **OpenAI streaming**: same shape as Cerebras.
- **Anthropic streaming**: different SSE wire shape (event-typed chunks); needs its own adapter implementation.
- **Cascading-stream fallback**: the design challenge is that on a primary mid-stream failure the consumer has already buffered partial tokens; retrying on the fallback re-streams from the start, breaking ordering. A possible design is "stop and replay from the start on the fallback" with the SPA discarding the partial buffer on the secondary's first chunk. Not in scope at launch; would land on its own.

## Rollback

Reverting the SPA change restores the buffered render with no other code changes. The streaming infrastructure stays in place (it is harmless when the SPA does not consume the new event). The Protocol surface and the transport helpers can stay because they are unused by the buffered code paths.

## See also

- [ADR-0002](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/) (LLM vendor abstraction): the Protocol surface this ADR extends.
- [ADR-0010](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0010-streaming-execution-graph/) (streaming execution graph): the SSE framework this ADR adds an event to.
- [ADR-0020](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0020-structured-agent-reply/) (structured agent reply): the JSON-mode contract that streamed deltas carry through verbatim.
