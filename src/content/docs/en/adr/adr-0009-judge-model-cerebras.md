---
title: "ADR-0009: Eval judge model (Cerebras)"
description: Why the evaluation judge model is Cerebras gpt-oss-120b, superseding the earlier Anthropic Haiku choice on the judge-model point only.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0009: Eval judge model - Cerebras supersedes the Anthropic Claude Haiku choice in ADR-0003

- Status: Accepted
- Date: 2026-05-20
- Decision-makers: Waldemar Szemat
- Supersedes (in part): [ADR-0003](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0003-eval-harness/), on the judge-model choice only

## Context and Problem Statement

[ADR-0003](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0003-eval-harness/) ("Eval harness") was accepted on
2026-03-18. It selected the overall eval architecture (a hand-rolled
pytest core orchestrating DeepEval, Ragas, Phoenix, and Promptfoo) and,
inside that architecture, named **Anthropic Claude Haiku** as the pinned
LLM judge for the judge-backed scorers (groundedness, faithfulness,
hallucination, tone rubrics). ADR-0003 described the judge as a pinned
Anthropic Haiku model, selected through a judge-model setting.

The harness as it ships does not run that judge. The judge the harness
invokes today is **Cerebras** `gpt-oss-120b`: the configuration declares
Cerebras as the judge provider and `gpt-oss-120b` as the judge model, the
judge wrapper takes a Cerebras client on the eval-CI path, and the
judge-backed scorers activate only when a Cerebras API key is present.
The deployment documentation, the project overview, and the eval report
all describe the judge path as governed by the presence of a Cerebras API
key. The harness moved to Cerebras after ADR-0003 was accepted, for the
free-tier and latency reasons set out below; the change was made in code
but never recorded as a decision.

Changing the judge model after an ADR has been accepted is not a typo
correction. Per the project's own change-control convention (if a
write-up needs to re-litigate or amend a previous ADR, file a new ADR and
mark the old one superseded), a substantive change to a recorded decision
is itself a decision and must be recorded. How do we record the
judge-model change so the governance trail is honest: the harness runs a
Cerebras judge, ADR-0003 still says Anthropic Claude Haiku, and the two
must be reconciled without erasing the historical record?

## Decision Drivers

- **Code-and-docs reality.** The configuration, the judge wrapper, the
  DeepEval adapter, the project overview, and the latest eval report
  already describe a Cerebras-governed judge path. The ADR set is the one
  place that still says Anthropic Claude Haiku; the documentation must
  converge on what the harness actually does.
- **Free-tier budget.** The project's standing constraint is a $0/month
  steady state. Cerebras offers a free tier sized for the judge workload
  (large daily token allowance, no card required); Anthropic Claude Haiku
  is billed per token. A free-tier judge keeps the eval CI inside the
  $0/month envelope without a token cap.
- **OpenAI-compatible surface.** Cerebras exposes an OpenAI-compatible
  chat-completions endpoint, so the judge reuses the same adapter shape
  (a Cerebras client mirroring the Groq client) the harness already ships.
  No second SDK and no Anthropic-specific message shape are needed on the
  judge path.
- **Change-control honesty.** The project's convention requires a
  superseding ADR for any revision of a prior decision. A silent edit to
  ADR-0003's body would violate that convention and erase the fact that
  the judge choice changed.
- **Preserve the rest of ADR-0003.** Only the judge-model line changes.
  The hand-rolled pytest core, the DeepEval / Ragas / Phoenix / Promptfoo
  composition, and the three-workflow structure (PR-gating, nightly
  judge, red-team) all still hold. The supersede must be scoped to the
  judge model and nothing else.

## Considered Options

- **Record Cerebras as the judge via a new ADR that supersedes ADR-0003
  in part** (chosen): file ADR-0009, mark ADR-0003 superseded on the
  judge-model point only, keep ADR-0003's body as the historical record.
- **Silently edit ADR-0003's body** to replace Anthropic Claude Haiku
  with Cerebras throughout.
- **Revert the harness to an Anthropic Claude Haiku judge** so the code
  matches the existing ADR-0003 text.

## Decision Outcome

Chosen option: **record Cerebras as the eval judge via this ADR, which
supersedes ADR-0003 on the judge-model choice only.** The eval judge is
Cerebras (`gpt-oss-120b` by default, behind a configurable judge-model
setting), reached through the Cerebras client adapter; the judge-backed
scorers (groundedness, faithfulness, hallucination) run only when a
Cerebras API key is set, and the deterministic PR gate runs key-free
without any judge. This is the judge path the harness ships and runs
today. ADR-0003 keeps its `Accepted` status with a "superseded in part by
ADR-0009" annotation; its body is left unchanged, because a superseded
ADR retains its original text as the historical record (MADR convention).
The remainder of ADR-0003, everything other than the judge-model choice,
stands as written.

Silently editing ADR-0003 was rejected: it would erase the fact that the
decision changed and would violate the project's documented change-control
convention. Reverting the harness to Anthropic Claude Haiku was rejected:
it would re-introduce a per-token billed dependency on the eval path
against the $0/month constraint, and would mean rewriting working code to
match a stale document rather than the reverse.

### Confirmation

- The configuration declares Cerebras as the judge provider and
  `gpt-oss-120b` as the judge model; the Cerebras client adapter and the
  LLM factory's Cerebras path are covered by unit tests.
- The judge-backed scorers activate only when a Cerebras API key is
  present; with the key absent, the eval report carries a judge-disabled
  header and the gate runs against deterministic scorers only.
- ADR-0003 carries a "superseded in part by ADR-0009" annotation in both
  its frontmatter status and its body status line, and links forward to
  this ADR.
- The ADR index lists ADR-0009 and records the supersession in its
  supersession log.

## Consequences

### Positive

- The ADR set now matches the harness: the judge the documentation
  describes is the judge the code runs.
- The judge stays inside the $0/month free-tier envelope; no per-token
  Anthropic billing on the eval path.
- The judge reuses the OpenAI-compatible Cerebras client adapter the
  harness already ships; no second SDK on the judge path.
- The change-control trail is honest: the judge-model change is recorded
  as a decision, not buried in a code diff.

### Negative

- The ADR set now carries its first supersession, so a reader has to
  follow ADR-0003 forward to ADR-0009 to get the current judge model.
  Mitigated by the annotation on ADR-0003 and the supersession log in the
  index.
- Cerebras becomes a load-bearing free-tier dependency on the judge path;
  a change to its free-tier terms would force another judge-model
  decision. An Anthropic API key remains pluggable as the operator's paid
  judge alternative, which bounds this risk.

### Neutral

- A living summary of project decisions is updated to name Cerebras as
  the judge model and to point at this ADR.
- The judge model id stays configurable; the default changes from a
  Claude Haiku string to `gpt-oss-120b`, but the override surface is
  unchanged.
- An Anthropic API key stays a supported, user-pluggable provider for an
  organisation that prefers to run a paid Anthropic judge; this ADR
  changes the default judge, not the set of selectable providers.

## Pros and Cons of the Options

### Record Cerebras via a new ADR that supersedes ADR-0003 in part

- Good, because it follows the project's documented change-control
  convention (a new ADR for any revision of a prior decision).
- Good, because it keeps ADR-0003's body intact as the historical record
  of why the harness was structured as it was.
- Good, because it converges the ADR set on what the code actually does
  without rewriting history.
- Bad, because it introduces the first supersession link a reader has to
  follow.

### Silently edit ADR-0003's body

- Good, because it leaves a single, internally consistent ADR-0003.
- Bad, because it erases the fact that the judge choice changed after the
  ADR was accepted.
- Bad, because it violates the project's own convention that a revision to
  a recorded decision is filed as a new ADR.

### Revert the harness to an Anthropic Claude Haiku judge

- Good, because the code would then match the existing ADR-0003 text with
  no new ADR.
- Bad, because it re-introduces a per-token billed dependency on the eval
  path, against the $0/month constraint.
- Bad, because it rewrites working code to match a stale document instead
  of updating the document to match reality.

## More Information

- [ADR-0003: Eval harness](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0003-eval-harness/) (the superseded-in-part decision)
- [ADR-0002: LLM vendor abstraction](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/) (the LLM client Protocol the judge adapter implements)
- Cerebras Inference documentation: <https://inference-docs.cerebras.ai/>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Feature-aware rubrics

The judge evaluates five feature-specific rubric dimensions when a golden
case carries feature tags in its metadata. The features are: **voice**,
**i18n** (internationalization), **pii** (PII redaction), **governance**
(regulatory coverage), and **data_layer** (data-layer key gating / cost
display).

- A set of feature rubric templates defines the five feature rubric
  descriptions, each with concrete 1.0 / 0.5 / 0.0 scoring criteria.
- The groundedness scorer conditionally extends its rubric with feature
  entries when a case carries feature metadata. Cases without feature
  metadata produce identical scoring to the baseline.
- Feature score keys follow the pattern `feature_{name}` (e.g.,
  `feature_voice`, `feature_i18n`).
- A CI feature-coverage gate verifies that all five feature categories
  have at least one golden case and that no feature dimension returns a
  malformed rationale on every case (malformed detection). Legitimate zero
  scores with non-malformed rationales are not flagged.
- Regression tolerance: the gate evaluation accepts optional baseline
  aggregates (+/- 0.05) and baseline per-locale (+/- 0.08) parameters for
  regression detection.

The judge-model selection (Cerebras `gpt-oss-120b`) is unchanged by this
rubric structure.
