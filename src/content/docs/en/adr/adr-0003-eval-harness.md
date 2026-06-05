---
title: "ADR-0003: Eval harness"
description: Why the eval harness is a hand-rolled pytest core orchestrating DeepEval, Ragas, Phoenix, and Promptfoo.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0003: Eval harness (hand-rolled pytest core + composable scorers)

- Status: Accepted; superseded in part by [ADR-0009](./adr-0009-judge-model-cerebras.md) on the judge-model choice
- Date: 2026-03-18
- Decision-makers: Waldemar Szemat

> Supersession note: this ADR records Anthropic Claude Haiku as the
> pinned LLM judge. That specific choice is superseded by
> [ADR-0009](./adr-0009-judge-model-cerebras.md), which records Cerebras
> (`gpt-oss-120b`) as the eval judge the harness runs today. The rest of
> this ADR (the hand-rolled pytest core, the DeepEval / Ragas / Phoenix /
> Promptfoo composition, the three workflows) still stands. The body
> below is kept unchanged as the historical record, per the MADR
> convention that a superseded ADR retains its original text.

## Context and Problem Statement

The eval harness is the centre of this project. The agent
is the vehicle; the harness is the artefact. A reader has to come away
convinced that the harness is real: it loads JSONL golden datasets,
runs the agent end-to-end, emits per-turn traces, scores those traces
along ten evaluation dimensions, and produces a PR-gating verdict plus
a longer-form report.

None of the off-the-shelf "agent eval platforms" cover all ten
dimensions for a multi-turn health-domain agent. DeepEval is strong
on G-Eval-style judged metrics and on conversational metrics; Ragas
is strong on RAG and on tool-use accuracy; Phoenix gives an OTel
backend with tracing UI; Promptfoo is the canonical red-team / OWASP
LLM Top 10 runner. A hand-rolled pytest core that orchestrates these
libraries is the smallest amount of glue that delivers all ten
dimensions while staying portable.

How do we structure the eval harness so that (a) it runs as a normal
pytest job in CI, (b) deterministic scorers gate every PR cheaply,
(c) LLM-as-judge runs nightly without blowing the free-tier budget,
(d) red-team scenarios run nightly out-of-band, and (e) every scorer
can be swapped or upgraded without rewriting the runner?

## Decision Drivers

- Coverage of the ten evaluation dimensions the project commits to
- PR-gate cost ceiling: deterministic + cheap-LLM scorers only on
  every PR; LLM-as-judge nightly
- Reproducibility: a contributor must be able to run the eval suite
  locally and get the same verdict CI gives
- Pin the judge model exactly (provider + model + version) so the
  scoring is stable across runs
- License hygiene: every scorer library must be permissively
  licensed (Apache 2 / MIT / ELv2 acceptable for tooling)
- Avoid a black-box "AI evaluation platform" SaaS; the harness has
  to be portable and self-hosted

## Considered Options

- **Hand-rolled pytest core + DeepEval + Ragas + Phoenix +
  Promptfoo** with Anthropic Claude Haiku as the pinned LLM judge
  (chosen)
- **One vendor SaaS (Braintrust / Galileo / LangSmith Eval)**
- **Pure DeepEval** as the entire harness, with its built-in
  dataset and report runners
- **Pure Ragas** as the entire harness
- **OpenAI Evals** as the runner

## Decision Outcome

Chosen option: **hand-rolled pytest core orchestrating DeepEval,
Ragas, Phoenix, and Promptfoo**, with Anthropic Claude Haiku as the
pinned LLM judge (model id behind an environment flag, version
pinned). The harness has three workflows:

- **PR-gating**: deterministic scorers (regex, keyword,
  refusal-template match, escalation-list match, citation-required
  check) plus DeepEval / Ragas thresholds that do not require an LLM
  (e.g. `FaithfulnessMetric` with a small Cerebras model where viable,
  `ToolCallAccuracy`). PR fails on: faithfulness >= 0.85, hallucination
  <= 0.10, escalation recall >= the configured bar.
- **Nightly LLM-as-judge** (scheduled): DeepEval G-Eval,
  `ConversationalGEval` for tone / empathy /
  medical-appropriateness, Ragas
  `AgentGoalAccuracyWithReference`, `TopicAdherence`. Judge =
  a pinned Anthropic Claude Haiku version.
- **Red-team** (separate workflow): two layers. (a) A deterministic,
  key-free CI gate -- a Promptfoo evaluation of the 13 hand-crafted
  adversarial cases; the shim drives the real LangGraph agent using an
  offline stub client; the agent's guardrail layer decides, not the
  LLM. (b) A separate keyed live measurement -- a Promptfoo red-team
  run with Groq `llama-3.3-70b-versatile` as the target, OpenAI
  `gpt-4o` as the attack generator, and Groq as the grader.
  Non-blocking; real failures are expected and documented with
  provenance.

Phoenix is the observability sink during eval runs: every turn
emits OTel spans through the project's existing OpenInference
wiring (see [ADR-0006](./adr-0006-observability.md)), Phoenix collects
them, and the harness attaches Phoenix's trace URLs to the eval report.
Inspect AI (UK AISI) is reserved as a bonus capability-eval task,
optional for the initial milestone.

This composition gives all ten eval dimensions a concrete home,
keeps the PR gate cheap, and never depends on a closed eval
platform.

### Confirmation

- The eval suite runs the PR-gating subset locally and in CI; the
  CI job fails on the configured threshold violations
- Every scorer is implemented behind a small `Scorer` Protocol; the
  runner does not import scorer libraries directly
- The judge model id is read from a `JUDGE_MODEL` environment
  variable, defaulting to a pinned Claude Haiku string; a unit test
  asserts the pin string is non-empty and well-formed
- A nightly red-team report is published as an artifact

## Consequences

### Positive

- All ten eval dimensions have a named scorer; the published eval
  table maps 1:1 onto the eval modules
- PR gate is cheap and deterministic enough to run on every push
  without burning free-tier quotas
- LLM-as-judge stays nightly and uses a pinned Claude Haiku, the
  lowest-cost-per-token Anthropic model that still scores well on
  tone / empathy rubrics
- Phoenix self-hosted gives a real OTel backend without quota
  pressure; its ELv2 license is acceptable for this use case
- Promptfoo's OWASP LLM Top 10 suite covers a red-team surface
  DeepEval / Ragas do not, pinned to a public attack catalogue
- The harness is portable: no SaaS lock-in, every dependency is
  open source

### Negative

- Four scorer libraries means four upgrade tracks; we mitigate
  by pinning minor versions
- The hand-rolled core is real code we maintain; it earns its
  keep by giving us full control over thresholds and report
  format
- Anthropic Haiku judge calls are billed; nightly cadence plus a
  small token cap keep them inside the $0/month envelope

### Neutral

- The harness emits two artefacts per run, a machine-readable
  JSON report and a Markdown summary
- Inspect AI is reserved as an optional capability-eval task; the
  initial milestone does not depend on it
- Phoenix and Promptfoo run in Docker profiles, not in the main
  Compose file, to keep the live-demo image small

## Pros and Cons of the Options

### Hand-rolled pytest core + DeepEval + Ragas + Phoenix + Promptfoo

- Good, because each library is best-in-class for its slice
  (judged metrics / RAG metrics / OTel backend / red-team)
- Good, because pytest is already the project test harness
- Good, because every scorer is swappable behind a Protocol
- Bad, because four moving parts have to be maintained

### One vendor SaaS (Braintrust / Galileo / LangSmith Eval)

- Good, because the dashboard story is excellent out of the box
- Bad, because the project must run with zero accounts
- Bad, because the eval definitions live in someone else's UI

### Pure DeepEval

- Good, because DeepEval has good conversational metrics
- Bad, because RAG-flavoured metrics like `ToolCallAccuracy` are
  more idiomatic in Ragas, and Promptfoo's red-team surface is
  uncovered

### Pure Ragas

- Good, because Ragas is the canonical RAG-eval library
- Bad, because Ragas lacks the conversational / tone-rubric
  metrics we need; DeepEval territory

### OpenAI Evals

- Good, because the format is well-known
- Bad, because the runner is OpenAI-centric and does not map
  cleanly onto multi-turn agent evals

## More Information

- DeepEval documentation: <https://deepeval.com/>
- Ragas documentation: <https://docs.ragas.io/>
- Phoenix (Arize) documentation:
  <https://docs.arize.com/phoenix>
- Promptfoo documentation: <https://www.promptfoo.dev/docs/intro/>
- OWASP LLM Top 10:
  <https://owasp.org/www-project-top-10-for-large-language-model-applications/>
- Inspect AI (UK AISI): <https://inspect.ai-safety-institute.org.uk/>
- Anthropic Claude Haiku model card:
  <https://docs.anthropic.com/en/docs/about-claude/models>
- npj Digital Medicine hallucination severity-tier framework (2025)
- MADR 4.0.0: <https://adr.github.io/madr/>
