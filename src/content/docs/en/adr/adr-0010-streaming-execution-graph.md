---
title: "ADR-0010: Streaming the agent execution graph to the UI"
description: Why per-node agent execution events stream to the browser over SSE, opt-in via Accept-header negotiation, without breaking the JSON chat contract.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0010: Streaming the agent execution graph to the UI over SSE

- Status: Accepted
- Date: 2026-05-21
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

A later release added a live Agent Execution Graph to the demo
single-page app: a left-to-right pipeline that lights up node by node as
the agent's LangGraph executes, and that visually encodes per-node latency
and the turn outcome. This ADR records the one architecturally
significant decision that feature forces.

Before this feature, the agent is driven request/response. `POST /chat`
invokes the compiled LangGraph graph, waits for the whole turn to finish,
and returns a single `ChatResponse` JSON document. The app's backend-trace
panel renders that document after the turn completes. There is no
mechanism for the browser to learn that `guardrail_pre` has finished and
`retrieve_context` has started while the turn is still running. A
node-by-node visualization needs exactly that: per-node progress events
delivered to the browser as they happen.

The agent already produces the underlying per-node data. The
observability decision (ADR-0006) wired OpenTelemetry spans around every
graph node, every LLM call, every retrieval, and every guardrail
decision, each carrying timing and attributes. The per-node measurement
exists. What does not exist is a path that *emits* per-node events to a
browser as the turn runs. The LangGraph framework chosen in ADR-0001
provides the source for that path: the compiled graph exposes a streaming
API that yields an event per node lifecycle step, alongside the
non-streaming invocation the request/response code uses.

LangGraph's streaming-API surface evolved during 2026: the API the
implementation uses is the LangGraph streaming API recommended at
implementation time. The decision recorded here, an SSE transport
negotiated through the `Accept` header and opt-in over the existing
endpoints, is independent of which specific LangGraph streaming API
ultimately feeds it; the implementation selects the then-current
recommended API.

Two constraints bound the answer. First, the existing `POST /chat` and
`POST /chat/resume` JSON contract must not break: programmatic callers,
and the project's own tests of the JSON path, must keep working
byte-for-byte. The eval harness is not among the affected callers - it
drives the agent through the graph builder and the non-streaming
invocation directly and never calls the HTTP endpoint - but general
HTTP-API consumers are. Second, the single-page app is framework-free and
zero-dependency by construction (ADR-0007); whatever transport is chosen,
the browser side must consume it with vanilla JavaScript and no library.

How do we deliver per-node agent-execution events to the browser in real
time, so the app can render a live execution graph, without breaking the
existing `/chat` JSON contract and without adding a client-side
dependency?

## Decision Drivers

- **One-directional, server-to-client flow.** The browser needs to
  *receive* a sequence of node events. It does not need to *send* anything
  mid-turn; the turn is already fully specified by the initial `POST /chat`
  body. The transport should match that shape and not carry the cost of a
  capability the feature does not use.
- **Backward compatibility of the `/chat` JSON contract.** An existing
  programmatic caller, and every existing test of the JSON path, must
  receive the unchanged `ChatResponse`. The streaming behaviour must be
  opt-in, not a breaking change to the default response.
- **Zero new client-side dependency.** The app is framework-free; the
  browser must consume the stream with a built-in API and vanilla
  JavaScript. No client library may be introduced.
- **Reuse the existing graph and the existing per-node data.** The
  streaming path must drive off the compiled graph already built in the
  FastAPI lifespan and the per-node spans ADR-0006 already wired. It must
  not build a second graph or re-implement per-node measurement.
- **Deployability on the free-tier demo host.** The transport must work
  through the Hugging Face Spaces Docker-SDK proxy (ADR-0007) on CPU
  Basic, with a single uvicorn worker, at $0/month.
- **Engineering legibility.** A clean streaming surface driven from a
  LangGraph streaming API over the compiled graph should read as a
  deliberate transport choice, not an incidental one.

## Considered Options

- **Server-sent events (SSE), opt-in via `Accept`-header content
  negotiation** (chosen): `POST /chat` and `POST /chat/resume` return a
  `text/event-stream` body when the request carries
  `Accept: text/event-stream`, and the unchanged `ChatResponse` JSON
  otherwise.
- **WebSocket**: a new bidirectional `ws://` endpoint carrying the
  per-node events.
- **Client polling**: the browser repeatedly requests a turn-status
  endpoint until the turn completes.
- **No streaming; render the graph post-turn**: keep non-streaming
  invocation, draw the final node path once from the `ChatResponse`.

Within the SSE option, the event schema itself was a sub-decision. AG-UI,
an emerging 2026 agent-to-UI event protocol, was considered as the wire
schema for the per-node events. For this self-contained demo the project
instead uses a small bespoke SSE event schema (six events, enumerated in
the Decision Outcome below) that is sufficient for the Agent Execution
Graph and carries no external-protocol surface area. AG-UI-compatible
event naming is noted as a possible future alignment if the project ever
needs to interoperate with an AG-UI client.

## Decision Outcome

Chosen option: **server-sent events, opt-in through `Accept`-header
content negotiation on the existing `/chat` and `/chat/resume`
endpoints.** When a request carries `Accept: text/event-stream`, the
endpoint returns an SSE stream of six event types: an opening
`graph_topology` event carrying the real compiled-graph node set and
edges, then `node_started`, `node_completed`, `paused`, and `error`
events as the turn runs, and a terminal `turn_completed` that carries the
full `ChatResponse`. The backend drives that stream from a LangGraph
streaming API over the compiled graph already held in application state.
When a request carries any other `Accept`, the endpoint behaves exactly as
the request/response path: it invokes the graph and returns the
`ChatResponse` JSON.

SSE is the load-bearing choice because the data flow is strictly
one-directional. The browser receives a stream of node events; it never
needs to send a frame back mid-turn. SSE is a one-directional
server-to-client protocol and is therefore an exact fit, where WebSocket
would add a full-duplex channel, a separate non-HTTP endpoint, and
connection-lifecycle handling for a back-channel the feature never uses.
SSE is also consumed with no client library, which keeps the app's
zero-dependency line. The browser's built-in `EventSource` API cannot be
used here: `EventSource` issues a `GET` and cannot send a request body or
custom headers, whereas `/chat` and `/chat/resume` are `POST` endpoints
that take a JSON body and must carry `Accept: text/event-stream`. The app
instead consumes the stream with the `fetch` API it already uses for
`/chat`: it reads the streaming response body through
`response.body.getReader()`, decodes the bytes with `TextDecoder`, and
parses the `text/event-stream` frames itself. This is a small amount of
vanilla JavaScript and adds no dependency. And SSE rides plain HTTP, so it
traverses the Hugging Face Spaces proxy without a protocol upgrade.

Making streaming opt-in through content negotiation is the second
load-bearing choice. The `Accept` header is HTTP's own mechanism for a
client to state which representation it wants. Keying the streaming
behaviour on `Accept: text/event-stream` means the JSON contract is
untouched for every caller that does not ask for the stream: same endpoint
path, same method, same `ChatResponse` schema, same status codes. The
streaming mode is purely additive. This preserves the option-value of the
`/chat` surface: the streaming path and the JSON path coexist on one
endpoint, and a future change to either does not disturb the other.

The streaming path adds an emission layer, not a new agent. It uses a
LangGraph streaming API over the same compiled graph the lifespan already
builds; the graph builder is unchanged, the node code is unchanged, the
per-node OpenTelemetry spans from ADR-0006 are unchanged. The decision is
to *stream what already runs*, not to re-architect the agent.

The non-streaming options were rejected. WebSocket buys bidirectionality
the feature does not need, at the cost of a second endpoint and more
lifecycle code. Polling produces a sawtooth of requests, cannot deliver a
node event at the instant it happens, and on a free-tier host wastes the
per-session request budget ADR-0007 rate-limits. Rendering the graph only
post-turn from the `ChatResponse` is the honest fallback (and is the app's
degradation path), but as the primary experience it discards the entire
live, node-by-node effect that is the point of the feature.

### Backward-compatibility contract

The streaming mode is additive and opt-in. The contract is:

- A `POST /chat` or `POST /chat/resume` request with
  `Accept: text/event-stream` receives a `text/event-stream` response.
- A request with any other `Accept` value - including `application/json`,
  `*/*`, and a missing `Accept` header - receives the `ChatResponse` JSON:
  identical schema, field names, and status codes.
- The SSE stream's terminal `turn_completed` event carries the full
  `ChatResponse` payload, so a streaming client ends the turn with exactly
  the data a JSON client receives.
- On the `/chat/resume` stream, the `turn_completed` event also carries a
  `human_wait_ms` measurement. This value lives on the SSE event envelope,
  not inside the `ChatResponse` object: the `ChatResponse` schema stays
  byte-for-byte identical on both the JSON and the streaming path, and
  `human_wait_ms` is observable only to a streaming resume client.
- The eval harness is unaffected: it invokes the graph through the graph
  builder directly and never issues an HTTP `/chat` request. Content
  negotiation exists for general HTTP-API consumers, not for the harness.

### Deployment note: the Space proxy must not buffer the stream

SSE depends on each event reaching the browser as it is flushed. A reverse
proxy that buffers the response body defeats the feature: the browser
would receive every node event at once, at end of turn. The Hugging Face
Spaces Docker-SDK deployment (ADR-0007) sits behind such a proxy. The
streaming response will therefore set `X-Accel-Buffering: no` and
`Cache-Control: no-cache`, and the streaming handler will flush each SSE
record as the LangGraph streaming API yields it. `X-Accel-Buffering: no`
is an nginx-specific hint, however, and the Hugging Face Spaces proxy is
not guaranteed to honor it: the header is necessary but not provably
sufficient. The implementation must therefore verify on the live Space
that events actually arrive incrementally (for example a `curl -N` check
against the deployed endpoint observing events land one by one rather than
as a single end-of-turn block), and the deployment runbook records both
the header and that verification step. The single-uvicorn-worker posture
recorded in ADR-0007 is compatible with SSE: an SSE response is one
long-lived HTTP response on the worker, not shared state.

### Confirmation

The decision was implemented and confirmed compliant against the
following criteria:

- The `/chat` and `/chat/resume` endpoints branch on the request `Accept`
  header: `text/event-stream` returns a streaming response, every other
  value returns the `ChatResponse` JSON. Both branches are covered by
  tests, including a regression test asserting the JSON path is
  byte-for-byte unchanged.
- The streaming branch drives off a LangGraph streaming API over the
  compiled graph in application state; the graph builder remains
  unchanged, which the unchanged agent-graph unit tests continue to
  verify.
- A streaming test asserts the SSE event sequence (opening
  `graph_topology`, then the per-node and terminal events) for a normal
  turn, a refused turn (with a skipped `retrieve_context`), a HITL-paused
  turn, and a turn that errors mid-stream, against the documented event
  schema.
- The quality-gate suite and the eval harness pass, confirming the
  streaming addition did not disturb the non-HTTP execution path.
- The deployment documentation records the proxy no-buffering requirement
  and the live-Space incremental-delivery verification step.

## Consequences

### Positive

- The browser receives per-node execution events in real time, which is
  the enabling capability for the live Agent Execution Graph.
- The `/chat` JSON contract is untouched: streaming is opt-in through
  `Accept`, so no existing programmatic caller and no existing JSON-path
  test changes behaviour.
- No client-side dependency is added; the app stays framework-free and
  consumes the `text/event-stream` body with vanilla JavaScript.
- The streaming path reuses the compiled graph and the per-node spans the
  project already builds; it is an emission layer, not a second agent.
- SSE rides plain HTTP, so it deploys through the Hugging Face Spaces proxy
  with no protocol upgrade and stays inside the $0/month posture.
- A clean LangGraph-streaming-to-SSE surface is a concrete demonstration
  of streaming-agent engineering.

### Negative

- The `/chat` and `/chat/resume` handlers gain a second code path; the
  endpoints now have a JSON branch and a streaming branch to keep in step,
  which is more surface to test and maintain.
- SSE delivery depends on no proxy buffering the response; a misconfigured
  reverse proxy silently degrades the live effect to a post-turn dump. The
  `X-Accel-Buffering: no` header is an nginx-specific hint and is not
  guaranteed to be honored by the Hugging Face Spaces proxy, so it is
  necessary but not provably sufficient; the implementation must verify
  incremental delivery on the live Space (see the deployment note). This
  is an operational dependency that did not exist before.
- A long-lived SSE response occupies a worker connection for the duration
  of the turn; on the single-worker free-tier Space this bounds
  concurrency, consistent with the existing single-worker posture but
  worth stating.
- A long-lived SSE response must be cancelled when the client disconnects.
  If the browser closes the connection (tab closed, navigation away) and
  the handler does not notice, the graph run keeps executing and the
  single free-tier worker stays occupied with work no one will read,
  leaking the one worker the Space has. The streaming handler must detect
  client disconnect and abort the in-flight graph run rather than letting
  it run to completion unobserved.
- SSE robustness across idle proxies needs explicit care. The stream must
  emit a per-event `id` field and periodic heartbeat comment lines (`:`
  keep-alive lines) so an idle intermediary does not treat a quiet
  connection as dead and drop it. This matters most during a HITL pause:
  between the `paused` event and the human's resume the stream can be idle
  for a long time, and without heartbeats that idle window is exactly when
  a proxy is likely to close the connection.
- SSE is one-directional by design: if a future feature ever needs a
  mid-turn client-to-server message, SSE cannot carry it and that feature
  would need a different transport. This is an accepted limit, not a
  current cost.

### Neutral

- The agent's execution path is unchanged: the graph builder, the node
  code, the guardrails, the RAG path, and the OpenTelemetry spans are all
  as they were. The decision adds emission, not behaviour.
- The `ChatResponse` schema is unchanged; it is now also carried as the
  `data` of the terminal `turn_completed` SSE event.
- The SSE event schema becomes a new public contract surface: six events
  (`graph_topology`, `node_started`, `node_completed`, `paused`, `error`,
  `turn_completed`), documented and versioned with the project.
- A LangGraph streaming API becomes a used part of the already-pinned
  LangGraph dependency; no new package enters the lockfile. Which specific
  streaming API is used is an implementation choice (the LangGraph
  streaming surface evolved during 2026) and does not change this
  decision, which is about the SSE transport and the `Accept`-negotiated
  opt-in.

## Pros and Cons of the Options

### SSE, opt-in via `Accept`-header content negotiation

- Good, because SSE is one-directional server-to-client, which exactly
  matches a node-event feed that needs no client back-channel.
- Good, because content negotiation keeps the `ChatResponse` JSON contract
  byte-for-byte intact for every non-streaming caller.
- Good, because the browser consumes `text/event-stream` with the built-in
  `fetch` API and a streaming body reader, no client library, holding the
  zero-dependency line.
- Good, because SSE rides plain HTTP and traverses the Hugging Face Spaces
  proxy with no protocol upgrade.
- Good, because the stream is driven from a LangGraph streaming API over
  the existing compiled graph; no second graph, no new measurement code.
- Bad, because the `/chat` handlers gain a second code path to keep in
  step with the JSON path.
- Bad, because correct delivery depends on no proxy buffering the response
  body.

### WebSocket

- Good, because it is a mature, widely-supported real-time transport.
- Good, because it could carry a future mid-turn client-to-server message
  without a transport change.
- Bad, because the feature's data flow is strictly one-directional;
  full-duplex is a capability paid for and never used.
- Bad, because it requires a separate non-HTTP endpoint and explicit
  connection-lifecycle handling, more surface than SSE for the same
  result.
- Bad, because a `ws://` upgrade is a less trivial path through the
  free-tier proxy than a plain-HTTP streaming response.

### Client polling

- Good, because it needs no streaming primitive on either side and is
  trivial to implement.
- Bad, because it cannot deliver a node event at the instant the node
  starts; the live, node-by-node effect degrades to a coarse,
  poll-interval-quantised approximation.
- Bad, because it produces a burst of HTTP requests per turn, wasting the
  per-session request budget ADR-0007 rate-limits on the free-tier demo.

### No streaming; render the graph post-turn

- Good, because it adds zero new endpoint behaviour and is the honest
  degradation path when SSE is unavailable.
- Bad, because as the primary experience it discards the entire live,
  node-by-node visualization that is the point of the feature; the graph
  would only ever show a finished turn.

## More Information

- [ADR-0001: Orchestration framework](./adr-0001-orchestration.md) -
  LangGraph, the source of the streaming API and the compiled graph the
  stream is driven from.
- [ADR-0006: Observability stack](./adr-0006-observability.md) - the
  per-node OpenTelemetry spans that already measure node timing.
- [ADR-0007: Deployment target](./adr-0007-deployment.md) - Hugging Face
  Spaces, the single-worker posture, and the proxy the SSE stream must
  traverse unbuffered.
- WHATWG HTML server-sent events specification:
  <https://html.spec.whatwg.org/multipage/server-sent-events.html>
- LangGraph streaming documentation:
  <https://langchain-ai.github.io/langgraph/how-tos/streaming/>
- AG-UI agent-to-UI event protocol (considered for the event schema, noted
  as a possible future alignment): <https://ag-ui.com/>
- MADR 4.0.0: <https://adr.github.io/madr/>
