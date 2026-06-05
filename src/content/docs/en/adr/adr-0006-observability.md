---
title: "ADR-0006: Observability stack"
description: Why traces use OpenTelemetry + OpenInference with Langfuse for the live demo and Phoenix for eval runs.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0006: Observability (OpenTelemetry + OpenInference, Langfuse for live demo, Phoenix for eval runs)

- Status: Accepted
- Date: 2026-03-18
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The agent has two operational modes with different observability
needs. In the **live demo** on Hugging Face Spaces, a reader lands
on a public URL, clicks around, and visits a dashboard that shows
the trace of their conversation: which LangGraph node fired, what
the LLM call looked like, what RAG retrieved, where time was spent.
That calls for a hosted, low-friction backend with a generous free
tier.

In the **eval runs**, the goal is different: thousands of automated
turns produce traces the harness inspects, persists, and attaches
to PR reports. No human is in the loop; quotas matter, data must
stay local, and the pipeline has to run offline if necessary. That
calls for a self-hosted backend with no quota ceiling.

How do we ship both modes from one wire format, while keeping
$0/month steady-state cost and avoiding lock-in to any single
observability vendor?

## Decision Drivers

- One wire format across modes; the agent emits traces once, sinks
  receive them once
- OpenTelemetry as the transport because it is the industry
  standard and is supported by every backend in the slate
- OpenInference (Arize semantic conventions for GenAI) as the
  attribute schema because it captures LLM-specific attributes
  (prompts, completions, tool calls, retrieval contexts) that
  plain OTel does not
- Free tier large enough for a demo + public URL with
  realistic traffic (~50K observations / month)
- Eval-time backend that scales to thousands of traces per run
  without quota concerns
- Permissive licensing on every component

## Considered Options

- **OpenTelemetry + OpenInference; Langfuse Cloud Hobby for live
  demo, Phoenix self-hosted in Docker for eval runs, Pydantic
  Logfire documented as an alternative** (chosen)
- **Phoenix only**, used for both modes (self-hosted everywhere)
- **Langfuse only**, used for both modes (live + eval)
- **Pydantic Logfire** as the single sink for both modes
- **A single hosted vendor** (Helicone, Lunary, etc.) for both
  modes

## Decision Outcome

Chosen option: emit OTel spans annotated with OpenInference
semantic conventions and route them to two sinks depending on the
mode.

- **Live demo**: Langfuse Cloud Hobby. The free tier provides 50K
  observations per month, 30-day retention, and a hosted UI that
  any reader can open through a public dashboard link, no signup
  required to view a shared trace. This is the smallest piece of
  infrastructure that shows a real conversation trace with LLM,
  retrieval, and node-level spans.
- **Eval-time**: Phoenix (Arize OSS) self-hosted in a Docker
  compose profile. The harness brings Phoenix up alongside the
  Python eval runner, sends spans into it, and attaches the
  Phoenix trace URLs to the eval Markdown report. ELv2 license is
  acceptable for self-hosted, single-org use. No external network
  call, no quota.
- **Documented alternative**: Pydantic Logfire (10M spans/month
  free, effective 2026-01-01). Logfire is referenced in the
  observability reference as a drop-in for Langfuse for any
  contributor who prefers it; the OpenInference wire format
  ensures the swap is configuration, not code.

The OpenInference attribute schema lives at the agent / node
boundary; the OTel SDK is configured with two exporters that can be
enabled independently by environment variables.

### Confirmation

- A unit test asserts that every LangGraph node emits an OTel
  span annotated with OpenInference attributes (the test inspects
  an in-memory span collector)
- The demo launch path brings the live API up with the Langfuse
  exporter enabled when a Langfuse public key is set; otherwise the
  exporter is a no-op
- The observability launch path brings up the Phoenix compose
  profile; the eval exports spans to it when a Phoenix OTLP endpoint
  is set, and runs with the no-op in-memory exporter otherwise
- A documented switch in the observability reference describes how to
  route to Pydantic Logfire instead

## Consequences

### Positive

- One wire format, one mental model: the agent emits traces once,
  exporters route them
- The live demo gets a hosted dashboard at $0 without a credit
  card via Langfuse Hobby (50K observations / month, 30-day
  retention)
- Eval runs are quota-free and offline-capable because Phoenix is
  self-hosted in a Docker profile
- OpenInference attributes carry the GenAI semantics (prompts,
  completions, tool calls, retrieval contexts) any
  LLM-observability backend can render
- A future swap of either sink is a configuration change because
  OpenInference is the schema, not a vendor-specific format
- The project signals familiarity with three major
  GenAI-observability options (Langfuse, Phoenix, Logfire)

### Negative

- Two backends means two places to look for trace data; the
  observability reference documents which mode uses which
- Langfuse Hobby hard-caps at 50K observations / month without
  overage billing; spike traffic beyond the cap is dropped,
  which preserves the $0/month guarantee
- Phoenix's ELv2 license is permissive for our usage but not
  Apache 2.0 / MIT; flagged in the dependency notes

### Neutral

- The OTel SDK and OpenInference instrumentation become part of
  the production dependency surface
- A new environment variable controls which exporter is enabled at
  runtime
- The eval Markdown report includes Phoenix trace links only when
  the Phoenix compose profile is up

## Pros and Cons of the Options

### OTel + OpenInference; Langfuse Hobby (live) + Phoenix self-hosted (eval) + Logfire documented

- Good, because it splits responsibilities along the actual axis
  of difference: hosted dashboard for the demo, quota-free
  self-hosted for evals
- Good, because OpenInference attributes carry GenAI semantics
  every backend understands
- Good, because the documented Logfire alternative shows
  awareness of the broader space without a third active sink
- Bad, because the contributor has to know which sink hosts which
  traces
- Bad, because Phoenix's ELv2 license requires acknowledgement

### Phoenix only (live + eval)

- Good, because one backend everywhere
- Bad, because the live demo would need a hosted Phoenix
  instance, which contradicts the $0/month posture; self-hosting
  on a Hugging Face Space adds memory pressure and a less
  polished public UI than Langfuse

### Langfuse only (live + eval)

- Good, because one hosted UI everywhere
- Bad, because eval runs at full volume would burn the
  50K-observation cap quickly with no overage billing, and eval
  data should not have to leave the local network

### Pydantic Logfire as single sink

- Good, because 10M spans/month free is the largest free tier
- Bad, because Logfire is the newest entrant (effective
  2026-01-01); OpenInference coverage and the multi-vendor
  reading are stronger with Langfuse + Phoenix
- Kept as a documented alternative in the observability reference

### Single hosted vendor (Helicone, Lunary, etc.)

- Good, because the integration surface is small
- Bad, because the project would tie its observability story to one
  vendor; demonstration signal is weaker and the eval-side quota-free
  requirement is harder to satisfy

## More Information

- OpenTelemetry: <https://opentelemetry.io/>
- OpenInference semantic conventions (Arize):
  <https://github.com/Arize-ai/openinference>
- Langfuse Cloud Hobby pricing:
  <https://langfuse.com/pricing>
- Langfuse documentation: <https://langfuse.com/docs>
- Phoenix (Arize) self-hosted documentation:
  <https://docs.arize.com/phoenix/deployment>
- Phoenix on GitHub (ELv2 license):
  <https://github.com/Arize-ai/phoenix>
- Pydantic Logfire: <https://pydantic.dev/logfire>
- Pydantic Logfire pricing:
  <https://pydantic.dev/logfire>
- MADR 4.0.0: <https://adr.github.io/madr/>
