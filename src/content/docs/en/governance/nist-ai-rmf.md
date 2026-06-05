---
title: NIST AI Risk Management Framework Mapping
description: An honest mapping of a synthetic-data reference implementation against the four core functions of the NIST AI Risk Management Framework.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# NIST AI Risk Management Framework Mapping

Maps the `ai-agent-eval-harness-healthtech` reference implementation against
[NIST AI RMF 1.0](https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence)
(AI 100-1, January 2023). The RMF defines four core functions -- Govern, Map,
Measure, Manage -- each with subcategories. This document evaluates which
subcategories the repository addresses today and which require additional work
for a production deployment.

Read alongside the [regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) and the
[model card](/ai-agent-eval-harness-healthtech-docs/en/reference/model-card/).

## Purpose

This is not a NIST AI RMF certification. No certification exists for the RMF; it is a
voluntary framework. The purpose of this document is to honestly assess which risk
management practices the reference implementation demonstrates and where gaps remain
for a production deployment. The assessment is against the repository as-shipped; a
forked or deployed instance would need its own assessment.

## Framework Mapping

### GOVERN -- Establish and Maintain AI Risk Management Culture

| Subcategory | Current Implementation | Gap Assessment |
|-------------|----------------------|----------------|
| GOV 1.1: Legal and regulatory requirements are understood | Regulatory posture documented in the [regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/); FDA wellness/CDS boundary, WHO 2024 guidance, MHRA GMLP, EU AI Act articles mapped | Limited to US/EU/UK/Chile frameworks; a production system would need jurisdiction-specific legal review for each deployment region |
| GOV 1.2: AI risk management is embedded in organisational governance | Architecture decision records provide traceability; changes to regulatory posture, guardrails, or escalation require a decision record | No formal governance committee or review board; single-author reference implementation |
| GOV 1.3: Roles and responsibilities for AI risk are defined | Clear module ownership: guardrails, eval harness, observability (OpenTelemetry spans per the [observability decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/)) | No separation of duties; author is developer, reviewer, and operator |
| GOV 1.4: Risk tolerance is documented and communicated | Documented eval threshold gates: faithfulness >= 0.85, hallucination <= 0.10, refusal correctness = 1.000, escalation correctness = 1.000 | Thresholds are binary pass/fail; no graduated risk-acceptance framework |
| GOV 1.5: AI systems are transparent | Guardrail-decision trace on every response; citation set on every clinical assertion; model card in CHAI format; regulatory posture publicly accessible | Transparency is at the response level; no public-facing model-performance dashboard |
| GOV 1.6: Policies and procedures for AI risk are in place | Security disclosure process; secret scanning in CI; no-secrets policy; PII redaction before LLM | Policies are repository-level, not enterprise-grade; no formal incident-response playbook |
| GOV 1.7: Stakeholder engagement | Design informed by published regulatory guidance (FDA, WHO, MHRA); no external stakeholders formally consulted (single-author project) | No patient advisory board, clinical advisory board, or external ethics review |

### MAP -- Understand and Contextualise AI Risks

| Subcategory | Current Implementation | Gap Assessment |
|-------------|----------------------|----------------|
| MAP 1.1: Intended purposes and use cases are defined | Model card "Uses and Directions" section; regulatory posture "What the agent does NOT do" list; out-of-scope enumeration enforced by eval harness | Defined for the reference implementation; a deployed product would need context-specific use-case scoping |
| MAP 1.2: Interrelated AI risks are identified | Near-miss off-corpus limitation documented in the model card; sub-acute escalation gap acknowledged; generative-model probabilistic behaviour documented | Systematic cross-risk interaction analysis (e.g., how locale bias compounds with near-miss retrieval) is not performed |
| MAP 1.3: Constraints and limitations are understood | Honest limitations documented: 36-card single-domain KB, 218-case eval corpus, US-English vocabulary bias, negation-blind escalation, in-memory durability for human-in-the-loop review | Limitations are documented; no formal risk-register with severity scoring |
| MAP 1.4: Impact to individuals and groups is assessed | No demographic input features used by the agent; locale-parity scoring addresses cross-locale fairness | No demographic impact assessment beyond locale; no assessment of impact on populations with low health literacy or limited internet access |
| MAP 2.1: AI system components are documented | Architecture decision records; the system specification; the six-node graph documented in the [orchestration decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0001-orchestration/); model card AI System Facts | Documentation is thorough for the reference implementation; a production system would need operational runbooks |
| MAP 2.2: Data provenance is tracked | The data statement and data card document full provenance for the eval corpus and KB cards; source licensing per card | Provenance tracking covers only the shipped synthetic data; no data-lineage tracking for runtime inputs |
| MAP 2.3: Third-party risks are identified | The LLM client Protocol abstracts provider dependencies (see the [LLM vendor abstraction decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/)); providers listed in the model card 3rd Party Information | No formal third-party risk assessment; no BAA or contractual review with LLM providers |
| MAP 3.1: AI risks are assessed at each lifecycle phase | Eval harness gates every change; nightly Promptfoo red-team; eval thresholds enforced in CI | Risk assessment is continuous via CI but limited to the eval dimensions scored; no broader organisational risk review at lifecycle gates |
| MAP 3.2: Failure modes and cascading impacts are documented | Guardrail failure modes: scope bypass, escalation miss, citation fabrication; each has a test in the eval harness | No formal failure-mode-and-effects analysis (FMEA); cascading impacts across system boundaries not assessed |
| MAP 3.3: Stakeholder feedback is incorporated | No external stakeholder feedback loop; design informed by published guidance and author field experience | A production system would need structured feedback channels from patients, clinicians, and compliance officers |

### MEASURE -- Assess and Track AI Risks

| Subcategory | Current Implementation | Gap Assessment |
|-------------|----------------------|----------------|
| MEASURE 1.1: Appropriate metrics are selected | Seven scorer dimensions: citation correctness, citation coverage, refusal correctness, escalation correctness, faithfulness, hallucination, cost/latency; locale-stratified | Metrics cover safety and quality; no fairness-specific metrics beyond locale parity; no environmental impact metrics |
| MEASURE 1.2: AI system performance is evaluated | Deterministic CI gate (a key-free deterministic stub client, 218 cases); nightly live-model run; Promptfoo red-team | Deterministic gate is reproducible; live-model metrics are not frozen in the model card (reported in the eval reports) |
| MEASURE 1.3: Evaluation data is representative | 218 cases across 3 locales (en, es-419, pt-BR); 5 condition clusters; golden + adversarial + no-match categories | Small sample; no demographic stratification (no demographic data collected); US-English bias acknowledged |
| MEASURE 2.1: Metrics are documented and communicated | Eval reports published per run; model card Key Metrics | Reports are generated per-run; no longitudinal tracking dashboard |
| MEASURE 2.2: Risk thresholds are defined | Hard thresholds: faithfulness >= 0.85, hallucination <= 0.10; binary gate: refusal correctness = 1.000, escalation correctness = 1.000 | Thresholds are crisp but not risk-adjusted; no tiered response framework (e.g., amber vs red) |
| MEASURE 2.3: Monitoring and feedback mechanisms exist | CI eval on every change; nightly red-team; OpenTelemetry spans on every node; Langfuse Cloud and Phoenix sinks (see the [observability decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/)) | Monitoring covers the reference implementation; no production alerting, SLA monitoring, or degradation-detection pipeline |
| MEASURE 3.1: Bias and fairness are evaluated | Locale parity enforced: identical thresholds for en, es-419, pt-BR; refusal and escalation correctness uniform across locales | No demographic subgroup evaluation (agent takes no demographic input); locale bias limited to vocabulary, not outcome equity |
| MEASURE 4.1: Measurement results are used for improvement | Red-team findings folded into adversarial seed bank; eval regression blocks changes; release notes track safety-relevant changes | Improvement loop is within-repository; no external audit findings or post-market surveillance data feed |

### MANAGE -- Prioritise and Act on AI Risks

| Subcategory | Current Implementation | Gap Assessment |
|-------------|----------------------|----------------|
| MANAGE 1.1: Risk treatment decisions are documented | Architecture decision records document design decisions affecting risk (the [guardrails decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/), the [observability decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/), the [eval harness decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0003-eval-harness/), the [streaming execution graph decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0010-streaming-execution-graph/)) | Decision records record design intent; no formal risk-register with treatment plans and residual risk acceptance |
| MANAGE 1.2: AI systems are designed for safe failure | Guardrails fire before LLM (scope classifier, refusal templates, escalation router); citation enforcement refuses on no-match; streaming error events for post-first-byte failures | Near-miss off-corpus handling is a known gap; sub-acute escalation is left to the model |
| MANAGE 2.1: AI risks are mitigated | Deterministic guardrails, eval harness, PII redaction, an OpenTelemetry audit trail, content-negotiated streaming with error events | Mitigations are reference-implementation-grade; production would need additional layers (model supply-chain verification, output filtering at scale) |
| MANAGE 2.2: Incident response plans exist | Security disclosure process; secret scanning; known limitations documented in the model card | No formal incident-response playbook; no on-call rotation; no severity classification scheme |
| MANAGE 2.3: AI system monitoring is ongoing | CI eval on every change; nightly Promptfoo red-team; OpenTelemetry spans on every turn; cost/latency gates | Monitoring is repository-level; no production alerting, anomaly detection, or automated rollback |
| MANAGE 3.1: AI risks are communicated to stakeholders | The model card, regulatory posture, data statement, and the governance docs in this section are public | Communication is passive (published documents); no active stakeholder notification process for risk changes |
| MANAGE 4.1: Policies and procedures are maintained | Decision-record-based change control; the regulatory posture change-control section requires a decision record for scope changes; release notes track changes | Policies are repository-level; no enterprise policy-management system; no annual policy review cycle |

## Current State

The reference implementation demonstrates NIST AI RMF practices in the following areas:

- **GOVERN**: Decision-record-based traceability, documented regulatory posture, transparent
  guardrail decisions, public model card and regulatory posture
- **MAP**: Defined use cases and out-of-scope boundaries, documented data provenance,
  identified failure modes (near-miss off-corpus, sub-acute escalation), honest
  limitation statements
- **MEASURE**: Seven-dimension eval harness with deterministic CI gate, locale-stratified
  scoring, nightly adversarial testing, OpenTelemetry-traced execution
- **MANAGE**: Guardrails-before-LLM architecture, decision-record-documented risk treatment,
  eval regression blocking changes, public disclosure process

The assessment above is honest about what is a reference-implementation demonstration
versus a production-grade risk management programme. The four functions are addressed
at the depth a reference artefact can reasonably demonstrate: structured documentation,
automated measurement, deterministic safety controls, and transparent communication.

What the repository does not have -- formal governance committees, risk registers with
severity scoring, incident-response playbooks, third-party risk assessments, graduated
risk-acceptance frameworks, production monitoring pipelines -- is documented explicitly
in the Gap Assessment column of each subcategory.

## Production Path

A production deployment would need to establish:

1. **Formal governance structure**: AI risk committee, defined roles and responsibilities,
   separation of duties between developers and reviewers, stakeholder advisory boards
   (patient, clinical, ethics)
2. **Risk register**: systematic enumeration of AI risks with severity scoring, likelihood
   assessment, treatment plans, residual risk acceptance, and risk owner assignment
3. **Expanded measurement**: fairness metrics beyond locale parity, environmental impact
   assessment, demographic subgroup evaluation where applicable, longitudinal performance
   tracking, automated drift detection
4. **Incident response**: formal IR playbook with severity classification, escalation paths,
   communication templates, post-incident review process, regulatory notification procedures
5. **Third-party governance**: vendor risk assessments for LLM providers, BAA where
   applicable, contractual review for data processing, supply-chain verification for
   model provenance
6. **Continuous monitoring**: production alerting, anomaly detection, automated rollback,
   degradation early-warning, SLA monitoring, capacity planning
7. **Audit readiness**: evidence collection automation, audit log retention (6 years for
   HIPAA, as applicable), tamper-evident logging, query interface for auditors

The repository's patterns -- eval contracts, decision-record traceability, OpenTelemetry
instrumentation, guardrail-first architecture -- accelerate building each of these
capabilities. They are the foundation, not the finished structure.

## See Also

- [Regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) -- FDA/WHO/MHRA/EU AI Act boundary
- [Model card](/ai-agent-eval-harness-healthtech-docs/en/reference/model-card/) -- CHAI Applied Model Card
- [EU AI Act classification](/ai-agent-eval-harness-healthtech-docs/en/governance/eu-ai-act/) -- EU AI Act risk-tier classification
- [OWASP / ATLAS threat model](/ai-agent-eval-harness-healthtech-docs/en/governance/owasp-atlas-threat-model/) -- threat model
- [Guardrails decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/) -- guardrails design
- [Observability decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/) -- observability design
