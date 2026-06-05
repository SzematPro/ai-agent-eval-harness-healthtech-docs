---
title: "ADR-0005: Guardrails and regulatory posture"
description: Why scope classification, refusal templates, and red-flag escalation are first-class modules tied to a regulatory line.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0005: Guardrails (scope classifier + refusal templates + escalation as first-class modules)

- Status: Accepted
- Date: 2026-03-18
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The agent is a medication-adherence conversational support tool. It
is not a medical device, not FDA-cleared, not clinically validated,
and it is built on 100% synthetic data. To stay credibly on that
side of the line, the design contract tracks the FDA 2026 General
Wellness and Clinical Decision Support Software final guidances
(issued 2026-01-06), the WHO LMM guidance, and broad international
awareness (MHRA, EU AI Act). The regulatory posture reference is the
long-form companion to this ADR.

The architectural question is concrete: where do safety-relevant
behaviours live? If scope-compliance, refusal, and escalation are
prompt-engineering tricks scattered inside one system prompt, they
are not auditable, not testable, and drift with every prompt edit.
If they are first-class modules with their own files, tests, and
eval slices, they become inspectable artefacts.

How do we make the guardrail surface inspectable, testable, and tied
1:1 to a regulatory posture, without turning the agent into a
keyword-blacklist toy?

## Decision Drivers

- The agent must not diagnose, prescribe, change doses, interpret
  labs / imaging, or interact with clinicians; the FDA 2026 General
  Wellness / CDS line is the contract
- Every clinical assertion must cite a KB card; refusal on no-match
  is default, not a special case
- Red-flag escalation has a hard-coded list paired with an eval
  slice; false negatives cost much more than false positives
- The guardrail layer must be replaceable: a future implementation
  could plug in NeMo Guardrails, Guardrails AI, or LLM Guard
- The audit story must read to a non-engineer (clinical reviewer,
  reviewer familiar with SaMD)

## Considered Options

- **Three first-class guardrail modules**: a scope classifier plus
  refusal-template selector, red-flag detection plus handoff
  orchestration, and calibrated refusal templates (chosen)
- **NVIDIA NeMo Guardrails** as the guardrail engine, with Colang
  rails encoding the same constraints
- **Guardrails AI** with structured-output validators
- **Single big system prompt** encoding all rules inline
- **Outsource to the LLM**, with no programmatic guardrail layer at
  all

## Decision Outcome

Chosen option: **scope classifier + refusal templates + escalation /
handoff as first-class guardrail modules**, with the design contract
pinned to the FDA 2026 General Wellness / CDS Software guidance line.
The guardrail layer is a small Python package, not a YAML / DSL
engine; the three modules expose typed functions that the LangGraph
nodes call explicitly:

- The scope classifier runs on every user turn before drafting;
  out-of-scope verdicts route directly to a refusal node
- The refusal renderer selects a calibrated, localised refusal
  template that does not over-refuse benign questions
- The escalation detector evaluates the hard-coded red-flag list
  (suicidality, chest pain, signs of stroke, severe allergic
  reaction, sudden visual disturbance on warfarin, pregnancy +
  teratogen, etc.) and can trigger a LangGraph `interrupt()` for the
  HITL path

The agent's design contract is explicit in the regulatory posture
reference and this ADR: it does NOT diagnose, prescribe, change doses,
interpret labs / imaging, or interact with clinicians. Every clinical
assertion must cite a KB card by id; if no card matches, the agent
refuses with a templated, locale-aware response. NeMo Guardrails and
Guardrails AI are documented alternatives; the Protocol-shaped
interfaces allow a future contributor to swap implementations without
rewriting the agent graph.

### Confirmation

- Eval slice for scope-compliance: no dosing-advice elicitation, no
  diagnosis fishing, correct refusal templates
- Eval slice for escalation correctness: precision and recall against
  a gold red-flag set, false-negative weight much greater than
  false-positive in the scorer
- Eval slice for refusal-vs-over-refusal balance: benign queries on
  adherence, MI, side effects, and pill ID must not be refused
- The regulatory posture reference lists prohibited behaviours,
  mirrored by a docstring in the guardrails package
- Citation-required check is a deterministic PR-gate scorer

## Consequences

### Positive

- Guardrail behaviour is inspectable: a reader (or a clinical
  reviewer) opens three modules and sees exactly what the agent
  will and will not do
- The eval harness has named slices for the safety dimensions,
  not "trust the prompt"
- The design contract is small, written in plain English in the
  regulatory posture reference, and reproduced in this ADR;
  drift is detectable by diff
- The "What this is NOT" bullets are enforced by code, not by tone
- A future swap to NeMo Guardrails or Guardrails AI replaces
  implementations behind the same Protocol, without touching
  the LangGraph nodes

### Negative

- The team owns the refusal templates and the red-flag list; both
  reviewed on a cadence
- A keyword-flavoured scope classifier is less expressive than a
  full guardrail DSL; mitigated by using the LLM as the
  classifier behind the Protocol, not static regex
- Escalation correctness depends on the red-flag list, treated as
  a versioned artefact

### Neutral

- The project gains three small modules and one dataset of refusal
  templates and red-flag triggers
- The Protocol-shaped design keeps a NeMo / Guardrails AI swap as
  a future option, not a current dependency
- The regulatory posture lives in three places (this ADR, the
  regulatory posture reference, the "What this is NOT" summary) that
  must stay in sync

## Pros and Cons of the Options

### Three first-class guardrail modules

- Good, because the surface is auditable in Python, not YAML
- Good, because the eval harness calls into the modules directly
  to assert against the red-flag list and refusal templates
- Good, because a future swap to NeMo Guardrails or Guardrails AI
  is a Protocol-level change
- Bad, because the team owns the template and red-flag data
- Bad, because a keyword-flavoured classifier is less expressive
  than a guardrail DSL on edge cases

### NVIDIA NeMo Guardrails

- Good, because Colang gives a declarative rails DSL with an
  active community
- Bad, because it adds a new runtime dependency and a new
  language to learn
- Bad, because the rails engine becomes the source of truth, not
  typed Python; the eval harness has to wrap Colang

### Guardrails AI

- Good, because the structured-output validation story is strong
- Bad, because the framework centres on validating LLM output
  structure, not on refusal / escalation decisions; that logic
  would still live elsewhere

### Single big system prompt

- Good, because zero new code
- Bad, because constraints are not inspectable, not testable, and
  not auditable; prompt edits silently regress safety

### Outsource to the LLM (no programmatic layer)

- Good, because the LLM's safety tuning catches many adversarial
  patterns
- Bad, because safety-by-prompt-only is not defensible for a
  healthtech reference implementation

## More Information

- FDA "General Wellness: Policy for Low-Risk Devices" (2026 final,
  issued 2026-01-06):
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices>
- FDA "Clinical Decision Support Software" (2026 final):
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software>
- WHO "Ethics and governance of AI for health: Guidance on LMMs":
  <https://www.who.int/publications/i/item/9789240084759>
- MHRA "Software and AI as a Medical Device":
  <https://www.gov.uk/government/publications/software-and-artificial-intelligence-ai-as-a-medical-device>
- NVIDIA NeMo Guardrails: <https://github.com/NVIDIA/NeMo-Guardrails>
- Guardrails AI: <https://www.guardrailsai.com/docs>
- Companion document: [regulatory posture](../reference/regulatory-posture.md)
- MADR 4.0.0: <https://adr.github.io/madr/>

## As-built escalation router

**Escalation mechanism.** The escalation module runs a deterministic
regex red-flag list inside the pre-guardrail node, before the scope
classifier; on a match it emits an `escalation` decision whose metadata
carries a structured handoff payload (`category`, `severity`,
`matched_terms`, `subcategories`, `template_slug`) and short-circuits
the turn to a locale-aware escalation template. The metadata payload is
the typed seam a human-in-the-loop `interrupt()` path could consume in
the future; the deterministic short-circuit is the shipped path because
it is compatible with the key-free single-pass eval harness.

**Red-flag list location.** The list is an inline, diff-tracked module
constant, consistent with the inline regex constants of the scope
classifier and the inline templates of the refusal module. The list is
inspectable, drift is detectable by diff, and review happens on the same
cadence as the rest of the guardrails module.

**Acute red-flag taxonomy.** The deterministic escalation router covers
seven acute categories: suicidal ideation, anaphylaxis / severe
allergic reaction, acute cardiac chest pain, severe bleeding, severe
asthma / acute breathing difficulty, **stroke / FAST signs**, and
**hypertensive emergency**. This seven-category set is the one the
escalation module ships, the one the published red-flag list documents,
and the one the regulatory posture reference records.
Escalation-recall is held to >= 0.95. Detection is intentionally
negation-blind - a deliberate high-recall choice driven by the
false-negative-cost asymmetry stated above (escalating on "no chest
pain" is an accepted false positive; a missed red flag is not).

**Two patterns deferred to the prompt layer** (not the deterministic
router): sudden visual disturbance on an anticoagulant, and the
pregnancy + teratogen co-occurrence. The pregnancy + teratogen case is
a conjunction pattern that needs a drug-name lexicon a flat regex list
cannot carry; it is handled by the prompt layer in the interim. The
deferral is recorded in the escalation module docstring.
