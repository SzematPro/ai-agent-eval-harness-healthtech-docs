---
title: "ADR-0012: Free-form input with out-of-domain detection"
description: Why the deterministic scope classifier gains topic-aware out-of-domain detection, giving benign off-topic input a graceful nudge instead of a hard refusal.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0012: Free-form input with out-of-domain detection

- Status: Accepted
- Date: 2026-05-25
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The scope classifier (ADR-0005) uses a binary pass/fail model: a user
message is either in-scope (medication adherence wellness support) or
out-of-scope (dosing, diagnosis, interpretation, PII extraction,
role-play). Out-of-scope messages receive a hard refusal.

This binary model works for clear boundary violations, but it does not
handle the middle ground: messages that are outside medication-adherence
scope but are not dangerous or boundary-violating. For example, "what's
the weather today?" or "tell me a joke" are benign off-topic messages that
should get a graceful nudge back to scope, not a terse refusal that reads
as a system error.

The free-form input goal asks the agent to handle conversational input
more naturally. Previously, a user asking "can you help me understand my
cholesterol numbers?" received a hard refusal because it touches lab
interpretation. A better experience would detect the domain (cholesterol,
statin adherence) and provide a scoped response that redirects to what the
agent can help with.

How do we extend the scope classifier to distinguish between "off-topic
but benign" and "out-of-scope and dangerous" without adding LLM call costs
or breaking existing guardrail behavior?

## Decision Drivers

- **Zero-cost deterministic layer**: the out-of-domain detection must not
  require an LLM call. The rule-based classifier must handle this without
  increasing per-turn cost (ADR-0005, ADR-0007).
- **Backward compatibility**: existing in-scope messages must still pass.
  Existing out-of-scope rejection patterns (dosing, diagnosis,
  interpretation) must still fire. No regression in guardrail coverage.
- **Locale-aware fallback**: the graceful fallback message must be
  available in all three locales (en, es-419, pt-BR), consistent with the
  existing refusal template pattern (ADR-0005).
- **Observability**: out-of-domain interactions must be trackable via
  OpenTelemetry span attributes for continuous improvement analysis
  (ADR-0006).
- **Single classifier pattern**: the extension should live in the existing
  scope classifier, not in a new separate module, to maintain the single
  classifier audit surface.

## Considered Options

- **Option A: Extend the scope classifier with topic-aware classification
  and out-of-domain metadata**
- **Option B: A new separate out-of-domain module**
- **Option C: An LLM-based out-of-domain classifier**

## Decision Outcome

Chosen option: **Option A**, because it preserves the single-classifier
pattern, adds no new module, requires no LLM call, and is consistent with
the existing scope-classifier architecture.

The extension adds domain keyword patterns to the rule-based scope
classifier for eight new medication-adherence domains (adherence-general,
statin, inhaler, antidepressant, caregiver, cost-barriers, pill-burden,
health-literacy). When a message matches a domain keyword pattern but does
not trigger any existing rejection pattern, the classifier marks the
guardrail decision as out-of-domain while still passing it. The message
proceeds through the graph, but the `guardrail_pre` node detects the
out-of-domain marker and routes it to a graceful fallback template (a new
`out-of-domain` slug) instead of RAG retrieval.

A new `out-of-domain` refusal template slug is added with locale variants.
The template is conversational, not a hard refusal: it names what the
agent can help with and invites the user to rephrase within scope.

OpenTelemetry spans in the `guardrail_pre` node gain two new attributes:
`interaction.out_of_domain` (boolean) and `interaction.detected_category`
(string, the matched domain or "general" for non-domain off-topic).

### Confirmation

- The scope classifier is extended with a domain-keywords mapping from
  eight domain names to regex patterns.
- The guardrail decision gains an out-of-domain field (boolean) when
  domain keywords are detected.
- The refusal templates gain an `out-of-domain` slug with en, es-419, and
  pt-BR variants.
- OpenTelemetry spans in `guardrail_pre` emit `interaction.out_of_domain`
  and `interaction.detected_category` attributes.
- Existing rejection patterns (dosing, diagnosis, interpretation, PII,
  role-play) fire unchanged.
- Unit tests cover out-of-domain detection.
- Unit tests cover the `out-of-domain` template slug.

## Consequences

### Positive

- Free-form input gets a conversational response instead of a hard
  refusal, improving user experience.
- No new module, no new LLM call, no new cost -- extends the existing
  deterministic rule-based layer.
- The single-classifier audit surface is preserved; all scope decisions
  flow through one classifier.
- Out-of-domain interactions are observable via OpenTelemetry for
  continuous improvement analysis.
- Domain keywords expand RAG retrieval coverage by identifying relevant
  topic areas.

### Negative

- The scope classifier grows in complexity with the domain keyword
  dictionary. The regex patterns must be carefully tuned to avoid false
  positives (e.g., "cost" should not match "at all costs" in a non-medical
  context).
- The out-of-domain fallback is still a template response, not a
  contextual one. The agent cannot engage with off-topic content even when
  it would be safe to do so.
- Regex-based domain detection is limited: it matches keywords, not
  semantic intent. A message like "I'm worried about the price of my
  medication" might not match the cost-barriers pattern if the phrasing
  diverges from the regex.

### Neutral

- The guardrail decision gains a new out-of-domain key. Downstream
  consumers already read the decision metadata as a dict, so this is
  backward-compatible.
- OpenTelemetry spans gain two new attributes. Existing dashboards and
  queries are unaffected (new attributes are additive).
- The eight domain categories are a starting set. More domains can be
  added by extending the domain-keywords mapping without architectural
  change.

## Pros and Cons of the Options

### Option A: Extend the scope classifier with topic-aware classification (chosen)

- Good, because it preserves the single-classifier pattern and audit
  surface.
- Good, because no new module means no new import graph, no new test file,
  no new wiring.
- Good, because regex-based detection is deterministic, testable, and
  zero-cost.
- Good, because it is consistent with how the scope classifier already
  works (regex patterns for rejection categories).
- Bad, because the scope classifier grows in size and regex complexity.
- Bad, because regex patterns are brittle for natural language; semantic
  drift in user phrasing may evade detection.

### Option B: A new separate out-of-domain module

- Good, because separation of concerns: out-of-domain detection is a
  distinct responsibility.
- Bad, because it introduces a second classifier module, fragmenting the
  audit surface.
- Bad, because the graph would need to call two classifiers in sequence,
  adding wiring complexity.
- Bad, because it duplicates the regex infrastructure already present in
  the scope classifier.

### Option C: An LLM-based out-of-domain classifier

- Good, because semantic understanding handles natural language better
  than regex.
- Good, because the existing LLM scope classifier already provides a
  model-based second pass.
- Bad, because every turn incurs an LLM call cost, even for benign
  off-topic messages.
- Bad, because it adds latency to the `guardrail_pre` path (1-3 seconds
  per turn).
- Bad, because it violates the zero-cost deterministic layer requirement
  for the rule-based path.

## More Information

- Guardrails ADR: [ADR-0005](./adr-0005-guardrails.md)
- Observability ADR: [ADR-0006](./adr-0006-observability.md)
- Corpus expansion strategy (companion ADR): [ADR-0013](./adr-0013-corpus-expansion-strategy.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
