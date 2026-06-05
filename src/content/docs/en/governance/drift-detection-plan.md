---
title: Drift Detection Plan
description: Eval-harness-based drift detection in the reference implementation and the requirements for production-grade drift monitoring.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Drift Detection Plan

> Documents the drift detection capabilities of the `ai-agent-eval-harness-healthtech`
> reference implementation and the requirements for production-grade drift monitoring.
> Covers eval-harness-based drift detection, model performance regression, and knowledge
> base relevance monitoring.
>
> Read alongside the [model card](../reference/model-card.md) and the
> [audit logging plan](audit-logging-plan.md).

## Types of Drift

| Drift Type | Definition | Relevance to This System |
|-----------|------------|--------------------------|
| **Data drift** | Input data distribution changes over time | User queries may shift in topic, language mix, or complexity; KB content may become stale |
| **Concept drift** | Relationship between inputs and desired outputs changes | Medication adherence guidance evolves; clinical guidelines are updated; new medications enter the market |
| **Model drift** | Model performance degrades on the same inputs | LLM provider updates model weights; prompt changes affect output quality; embedding model changes affect retrieval |
| **Evaluation drift** | Eval corpus no longer represents real usage patterns | Eval cases become unrepresentative as user behaviour changes; adversarial landscape evolves |

## Current Drift Detection Mechanisms

### Eval Harness as Drift Detector

The primary drift detection mechanism in the reference implementation is the eval harness.
It is not a traditional drift-detection pipeline, but it serves a similar purpose by
detecting performance regressions that could indicate drift.

| Mechanism | What It Detects | Frequency | Trigger |
|-----------|----------------|-----------|---------|
| **Deterministic CI gate** | Guardrail regressions (refusal, escalation, citation) on the curated corpus | Every change | Build failure if any threshold breached |
| **Live eval run** | Model performance (faithfulness, hallucination) against a live LLM | Manual / nightly | Threshold breach recorded as a regression |
| **Nightly Promptfoo red-team** | Adversarial robustness against OWASP LLM Top 10 plus hand-crafted cases | Nightly | New adversarial pattern discovered |
| **Cost/latency gates** | Performance regression in token usage or latency | Every change | Per-turn budget exceeded |
| **Locale parity gate** | Locale-specific performance degradation | Every change | Locale threshold breach on any dimension |

### Eval Thresholds

| Dimension | Threshold | Drift Signal |
|-----------|-----------|-------------|
| Faithfulness | >= 0.85 | Drop below 0.85 suggests model output quality degraded or KB relevance shifted |
| Hallucination | <= 0.10 | Rise above 0.10 suggests the model is generating unsupported content |
| Refusal correctness | = 1.000 | Any miss means a guardrail regression (deterministic; should never happen) |
| Escalation correctness | = 1.000 | Any miss means an escalation regression (deterministic; should never happen) |
| Citation correctness | = 1.000 | Any fabricated citation means citation enforcement regressed |
| Cost | Per-turn token budget | Exceeding budget suggests prompt or response pattern changed |
| Latency | Per-turn latency budget | Regression suggests a provider or infrastructure change |

### Red-Team Adversarial Drift Detection

The Promptfoo nightly red-team serves as a specialised drift detector for adversarial
robustness. It exercises the system against:

- OWASP LLM Top 10 prompt-injection templates (evolving with Promptfoo updates)
- Hand-crafted adversarial cases covering dosing elicitation, diagnosis fishing,
  system-prompt extraction, role-coercion, and distress disclosure
- Adversarial slices in the es-419 and pt-BR eval corpora

When a new adversarial pattern is discovered (either by Promptfoo or by manual
investigation), it is folded back into the adversarial seed bank. This ensures the
eval corpus evolves with the threat landscape.

### Golden Corpus Stability

The eval corpus (218 cases across three locales) is a fixed golden dataset. It provides
a stable baseline against which performance is measured. Because the corpus is committed
and version-controlled, any performance change on the same corpus version must be due
to a change in the system (model, guardrails, retrieval, or prompts), not a change in
the test data.

The golden corpus is not a substitute for monitoring real usage patterns. It tests the
system against a known, curated set of scenarios; it does not detect whether the system
is encountering new types of queries in production.

## Current State

The reference implementation detects drift through eval-harness regression, not through
continuous monitoring. The mechanisms in place:

1. **Change-gated eval regression**: Every code change is tested against the curated corpus.
   A regression on any threshold fails the build, forcing investigation before merge.
   This catches model drift (if the LLM provider updates weights), guardrail drift (if
   a code change weakens a guardrail), and retrieval drift (if embedding or KB changes
   affect retrieval quality).

2. **Nightly adversarial testing**: Promptfoo exercises the system against evolving
   adversarial templates. A new bypass technique discovered by the nightly run is a
   form of adversarial drift detection.

3. **Locale parity enforcement**: The eval harness holds all three locales to the same
   thresholds, detecting locale-specific regressions that could indicate drift in the
   model's multilingual capability.

4. **Cost/latency budget enforcement**: Per-turn cost and latency budgets catch
   performance drift that could indicate provider changes, prompt bloat, or
   infrastructure degradation.

What is not in place:

- **No automated concept drift detection**: The system does not monitor whether its
  KB content is becoming stale relative to current clinical guidelines. KB card
  `accessed_at` dates are recorded but not automatically checked for recency.
- **No production monitoring**: No real-user data is collected or analysed for drift.
  The eval corpus is the only performance dataset.
- **No input distribution monitoring**: No tracking of query topic distribution,
  language mix, or complexity trends over time.
- **No automated re-evaluation cadence**: The eval harness runs on-demand (changes) and
  nightly (red-team); there is no scheduled comprehensive re-evaluation.

## Production Path

Production-grade drift detection would require:

1. **Automated drift detection pipeline**: Continuous monitoring of model performance
   against a held-out validation set; statistical tests for distribution shift in
   input features (query topics, language, complexity); automated alerting when drift
   exceeds defined thresholds

2. **Performance regression monitoring**: Longitudinal tracking of all eval dimensions
   (faithfulness, hallucination, refusal correctness, escalation correctness, citation
   correctness); trend analysis with confidence intervals; automated degradation alerts
   before thresholds are breached

3. **Concept drift detection for KB relevance**: Automated monitoring of KB card
   recency against source publications; scheduled re-crawling of source URLs to detect
   content changes; alerting when source content diverges from card content

4. **Scheduled re-evaluation cadence**: Weekly comprehensive eval runs against the
   full corpus; monthly live-model eval with updated thresholds; quarterly adversarial
   assessment with new attack techniques

5. **Input distribution monitoring**: Tracking of query topic distribution, language
   mix, and complexity over time; statistical tests for distribution shift; alerting
   when real usage patterns diverge significantly from the eval corpus

6. **Model version tracking**: Logging of LLM provider model versions on each eval run;
   correlation of performance changes with model version updates; rollback procedures
   for provider-initiated model changes

7. **Embedding drift detection**: Periodic re-embedding of the KB corpus; comparison
   of embedding distributions over time; alerting on significant shifts that could
   indicate embedder model changes

8. **Feedback loop**: User feedback collection (implicit and explicit); integration
   of feedback signals into the eval corpus; continuous improvement of the golden
   dataset based on production usage patterns

## See Also

- [Model card](../reference/model-card.md) -- CHAI Applied Model Card, Key Metrics
- [Data statement](../reference/data.md) -- dataset card with generation methodology
- [Audit logging plan](audit-logging-plan.md) -- audit logging plan
- [NIST AI RMF mapping](nist-ai-rmf.md) -- NIST AI RMF Measure function
- [Eval harness design](../adr/adr-0003-eval-harness.md) -- eval harness design
