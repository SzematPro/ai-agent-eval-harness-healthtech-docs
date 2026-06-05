---
title: "ADR-0001: Orchestration framework"
description: Why the agent control flow is built on LangGraph 1.x as an explicit, inspectable, durable state graph.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0001: Orchestration framework (LangGraph 1.0)

- Status: Accepted
- Date: 2026-03-18
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The reference implementation is a multi-turn medication-adherence
conversational agent. The agent has explicit control-flow obligations:
classify scope, retrieve from a small knowledge base, draft a response,
run a safety check, decide whether to escalate, and request a
human-in-the-loop pause on high-risk turns. Conversation state must
survive a process restart so that a paused turn can resume after a
clinician (or, in the demo, a reviewer) acknowledges the escalation.

The eval harness, in turn, has to be able to drive that agent
end-to-end in a deterministic way, inspect intermediate node traces,
and replay golden conversations. The chosen orchestration framework
therefore has to expose the agent as a graph of explicit nodes and
edges (not as a black-box "agent loop"), provide durable state, and
support an `interrupt`-style HITL primitive.

How do we structure the agent's control flow so that it is auditable
at every node, can be paused and resumed durably, and is portable
across LLM vendors and self-hosted deployments?

## Decision Drivers

- Explicit state machine: the architecture is "agent as an inspectable
  graph", not "agent as an opaque while-loop"
- Durable persistence: the conversation state must survive a process
  restart (Postgres-ready) so the eval harness and the demo can
  replay turns
- First-class human-in-the-loop primitive (`interrupt()`) for the
  red-flag / high-risk path
- Vendor-neutral: the framework must not force a specific LLM provider
  or hosted runtime
- Maturity signal: a stable major release (1.x), not a 0.x library,
  because this is a public reference implementation
- License: permissive enough to ship inside a distributed Docker image
  under Apache 2.0

## Considered Options

- **LangGraph 1.0**: explicit `StateGraph`, durable checkpointers
  including Postgres, native `interrupt()` HITL, vendor-neutral,
  reached 1.0 GA on 2025-10-22
- **CrewAI**: role-based "crew of agents" abstraction, sequential or
  hierarchical processes, less granular graph topology
- **Microsoft Agent Framework**: Microsoft's 2025 unification of
  Semantic Kernel and AutoGen, strong Azure tooling, vendor lean
- **Claude Agent SDK**: Anthropic's first-party agent SDK, ergonomic
  but locks the agent's control loop to a single model family
- **Pydantic AI**: typed, ergonomic Python-native agent framework
  building on Pydantic schemas, lighter on explicit graph semantics
- **AutoGen v0.2 / Swarm**: earlier multi-agent conversation patterns,
  superseded / deprecated by 2026

## Decision Outcome

Chosen option: **LangGraph 1.0**. It is the only option in the slate
that combines an explicit, inspectable `StateGraph` topology, a durable
checkpointer story that includes a Postgres saver, a native
`interrupt()` primitive for HITL, and a stable 1.x major release line
(GA on 2025-10-22, see the LangChain changelog). It is also the
framework that maps most cleanly to how the eval harness wants to
drive the agent: load a checkpoint, replay turns from a JSONL fixture,
and assert on node-level state. The "agent is a graph of named nodes"
mental model is exactly the architecture story this project tells.

### Confirmation

- The graph is declared once as a `StateGraph` with named nodes and
  explicit edges; `mypy --strict` type-checks the state schema
- The eval harness drives the agent via the graph's public API, not by
  calling internal helpers, so a swap to a different orchestrator
  would surface in the runner's test suite
- The compiled graph accepts an injected checkpointer; the demo build
  uses an in-memory saver, and a Postgres saver factory is opt-in by
  environment variable and covered by an integration test

## Consequences

### Positive

- The agent's control flow is documented by the graph itself; the C4
  state-machine diagram and the code stay in sync because both are
  derived from the same `StateGraph` definition
- Durable persistence via a Postgres saver is a one-line swap from the
  in-memory checkpointer used in tests, which makes the
  "production-ready persistence" posture defensible
- `interrupt()` gives the HITL escalation path a primitive that the
  HITL unit tests can assert on directly (the graph really did pause,
  not "the agent decided to stop"); the eval runner runs with HITL
  disabled and never exercises the pause
- LangGraph is vendor-neutral: nodes call the project's `LLMClient`
  Protocol, not a LangChain-specific provider object, so the
  abstraction in [ADR-0002](./adr-0002-llm-vendor-abstraction.md) is
  preserved
- 1.0 GA status (2025-10-22) signals that the framework is past the
  0.x churn window typical of agent libraries

### Negative

- LangGraph inherits some of the broader LangChain ecosystem's surface
  area (imports, transitive deps); we keep the surface small by
  pinning versions and importing only `langgraph`, not the full
  `langchain` mega-package
- The framework prescribes a state-graph idiom; a contributor who
  prefers a free-form agent loop has to learn it
- A meaningful migration to another orchestrator later would touch
  every node in the graph, even though the LLM and RAG abstractions
  would survive unchanged

### Neutral

- The project gains a `langgraph` dependency in the lockfile
- The eval harness has to know how to load a `StateGraph` checkpoint;
  this is a small adapter, not a structural change
- LangChain remains an indirect dependency surface; this is documented
  explicitly and the minor version is pinned

## Pros and Cons of the Options

### LangGraph 1.0

- Good, because `StateGraph` makes the topology explicit and
  inspectable
- Good, because a Postgres saver gives durable conversation state for
  free
- Good, because `interrupt()` is a first-class HITL primitive
- Good, because 1.0 GA in October 2025 stabilises the API surface
- Bad, because the LangChain ecosystem proximity adds dependency
  surface
- Bad, because contributors must learn the state-graph idiom

### CrewAI

- Good, because the role-based abstraction reads well in marketing
  copy
- Bad, because crews are coarser than the per-node topology the eval
  harness wants
- Bad, because the HITL story is less first-class than LangGraph's
  `interrupt()`

### Microsoft Agent Framework

- Good, because Semantic Kernel + AutoGen unification is well-engineered
- Good, because Azure integrations are first-class
- Bad, because the framework's centre of gravity is Azure / Microsoft
  stack, which conflicts with the vendor-neutral posture of this
  project

### Claude Agent SDK

- Good, because the ergonomics are excellent
- Bad, because it locks the agent's control loop to Anthropic models
  and breaks the multi-vendor evidence the project wants to show

### Pydantic AI

- Good, because the typed, Pydantic-first API is pleasant to write
- Bad, because the explicit-state-machine posture is weaker; the
  framework leans on agent-as-typed-function more than
  agent-as-graph
- Kept as an alternate candidate for a future migration scenario

### AutoGen v0.2 / Swarm

- Bad, because both lines are deprecated by 2026 and have been
  superseded by Microsoft Agent Framework (AutoGen) and the broader
  agent-framework field (Swarm)

## More Information

- LangGraph 1.0 GA announcement (2025-10-22):
  <https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available>
- LangGraph documentation: <https://langchain-ai.github.io/langgraph/>
- LangGraph `interrupt` / HITL guide:
  <https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/>
- LangGraph durable checkpointers:
  <https://langchain-ai.github.io/langgraph/concepts/persistence/>
- MADR 4.0.0: <https://adr.github.io/madr/>

## As-built graph and checkpointer

**As-built graph topology.** The shipped graph is six nodes: `intake`,
`guardrail_pre`, a conditional `retrieve_context`, `generate_response`,
`guardrail_post`, and `closing`. A conditional edge skips
`retrieve_context` when a pre-guardrail failure (a refusal or an acute
escalation) is already present, so a short-circuited turn does not pay
for retrieval.

**`interrupt()` HITL.** When HITL is enabled (an environment flag), a
seventh node, `review_response`, is inserted between `generate_response`
and `guardrail_post`. It calls LangGraph `interrupt()` to pause a
high-risk-but-not-acute draft - an unverified citation, a missing
citation, or persona drift, classified by the review module - so a human
reviewer can approve, edit, or reject the draft. A dedicated resume
endpoint resumes the paused thread. The node's pre-`interrupt()` body
only reads state, so it is safe to re-run when `interrupt()` re-executes
its host node on resume. HITL is off by default: the standard six-node
graph and the eval harness run with no pause behaviour, and an
`interrupt()`-based path remains incompatible with the key-free
single-pass eval harness, which is why it is opt-in. Acute red flags are
NOT routed through `interrupt()`: they short-circuit upstream in
`guardrail_pre` to an emergency template (see
[ADR-0005](./adr-0005-guardrails.md)) and `review_response` never pauses
them.

**Checkpointer factory.** The checkpointer factory returns an in-memory
`MemorySaver` by default and an `AsyncPostgresSaver` when a Postgres DSN
is set; both paths receive a hardened serializer carrying an allowlist of
the custom Pydantic types the graph checkpoints (this also mitigates
CVE-2026-28277 / GHSA-g48c-2wqr-h844). The demo Space uses the in-memory
path, so a paused HITL thread does not survive a Space restart, a cold
start, or a second worker - a documented single-worker free-tier
limitation. Postgres is the durable answer and is selected automatically
by setting the DSN.

**State diagrams.** The C4-style state diagrams are hand-authored
Mermaid, not generated from the compiled `StateGraph`. They are kept in
sync with the code by review; the inline node list is the
closest-to-code description and the authoritative one.

**LangGraph version.** The pin is `langgraph>=1.0.10`, resolved to the
current 1.x line. The `>=1.0.10` floor ensures a fresh install cannot
resolve a pre-patch version vulnerable to CVE-2026-28277.
