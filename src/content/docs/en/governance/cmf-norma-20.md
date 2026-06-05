---
title: CMF Norma 20 Model Risk Management Mapping
description: How the reference implementation's governance patterns map to Chile's CMF Norma 20 model risk management principles for financial institutions.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# CMF Norma 20 Model Risk Management Mapping

> Maps the `ai-agent-eval-harness-healthtech` reference implementation against
> [Norma de Caracter General No. 20](https://www.cmfchile.cl/institucional/normativa/normativa.php) (CMF NCG 20),
> the Chilean Comision para el Mercado Financiero (CMF) regulation on risk-based
> capital requirements and model risk management for financial institutions. While
> this system is not a financial product, the governance patterns it demonstrates --
> model documentation, eval harness, guardrails, observability -- map directly to
> the model risk management principles that CMF-regulated entities must follow.
>
> Read alongside the [regulatory posture](../reference/regulatory-posture.md) and
> the [NIST AI RMF mapping](nist-ai-rmf.md).

## Applicability

CMF Norma 20 applies to banks, financial institutions, and other entities regulated by
the Chilean Comision para el Mercado Financiero. This reference implementation is not
a financial product, is not offered by a CMF-regulated entity, and is not subject to
Norma 20 requirements.

The purpose of this mapping is to demonstrate that the governance patterns in this
reference implementation align with model risk management principles that financial
regulators worldwide expect. A financial institution evaluating this architecture for
internal use (e.g., an AI-assisted customer service chatbot, a document processing
pipeline, a compliance monitoring tool) would find these patterns transferable.

## Model Risk Management Principles Mapping

### Model Development and Documentation

| Norma 20 Principle | Current Implementation | Gap Assessment |
|---------------------|----------------------|----------------|
| **Model inventory** | The model card (CHAI Applied Model Card format) documents the agent's purpose, inputs, outputs, foundation models, data sources, performance metrics, and limitations | Inventory covers one model; a financial institution would need a model inventory covering all models in use with risk-tier classification |
| **Model documentation** | Architecture decision records document design decisions; the model card provides model-level documentation; the data statement documents the datasets | Documentation is thorough for a single-purpose reference implementation; production would need model validation reports, sensitivity analyses, and limitation assessments for each model |
| **Conceptual soundness** | Six-node LangGraph StateGraph with explicit node responsibilities (intake, guardrail_pre, retrieve_context, generate_response, guardrail_post, closing); guardrails run before the LLM; citation enforcement on every clinical assertion | Architecture is well-structured and testable; a financial model would need independent conceptual review by domain experts |

### Model Validation

| Norma 20 Principle | Current Implementation | Gap Assessment |
|---------------------|----------------------|----------------|
| **Independent validation** | Eval harness acts as an independent measurement system; the CI gate enforces thresholds without developer override; a deterministic stub client isolates guardrail behaviour from model variability | Eval harness is built by the same author as the system; true independence requires a separate validation team |
| **Outcome analysis** | Deterministic eval gate: all curated cases pass; refusal correctness = 1.000; escalation correctness = 1.000; faithfulness >= 0.85; hallucination <= 0.10 | Analysis covers synthetic data; production would need outcome analysis on real transaction data with statistical significance testing |
| **Benchmarking** | Locale-stratified scoring (en, es-419, pt-BR held to identical thresholds); adversarial benchmarking (Promptfoo OWASP LLM Top 10 plus hand-crafted cases) | Benchmarking covers the defined eval dimensions; financial applications would need industry benchmarks and peer comparison |
| **Sensitivity analysis** | Configurable retrieval similarity threshold tested across several embedder configurations; the LLM provider abstraction enables provider-swap testing | Limited sensitivity analysis; financial models would need systematic sensitivity testing across key parameters and stress scenarios |

### Model Governance

| Norma 20 Principle | Current Implementation | Gap Assessment |
|---------------------|----------------------|----------------|
| **Governance committee** | Architecture decision records capture the decision trail; the eval harness gates every change; the regulatory posture requires a decision record for scope changes | No formal governance committee; single-author project; production would need a model governance committee with cross-functional representation |
| **Risk-tier classification** | The regulatory posture classifies the system as general-wellness (not a medical device); the EU AI Act mapping classifies it as minimal-risk | Classification is self-assessed for one model; financial institutions need a risk-tier framework covering all models |
| **Change management** | Decision records document changes; the eval harness detects regressions on every change; semantic versioning tracks releases | Change management is repository-level; production would need formal change approval workflows, pre-deployment validation, and rollback procedures |
| **Ongoing monitoring** | CI eval on every change; nightly Promptfoo red-team; telemetry spans on every node; cost/latency gates; Langfuse Cloud and Phoenix observability sinks | Monitoring covers the reference implementation; production would need continuous model performance monitoring, drift detection, and automated alerting |

### Model Performance Monitoring

| Norma 20 Principle | Current Implementation | Gap Assessment |
|---------------------|----------------------|----------------|
| **Performance tracking** | Deterministic eval gate with explicit thresholds; eval reports generated on each run | Tracking is per-run; production would need longitudinal performance dashboards, trend analysis, and automated degradation detection |
| **Threshold monitoring** | Hard thresholds: faithfulness >= 0.85, hallucination <= 0.10, refusal correctness = 1.000, escalation correctness = 1.000; binary pass/fail gate | Thresholds are binary; financial applications would need graduated thresholds (green/amber/red) with escalation procedures |
| **Drift detection** | Eval harness runs on every change against a fixed golden corpus; nightly red-team exercises the system; no automated concept drift detection | Reference implementation uses manual drift detection (eval regression); production would need automated drift detection, performance baselines, and scheduled re-evaluation |
| **Exception reporting** | Eval regression fails the build; known limitations documented in the model card | Exception handling is build-fail-or-pass; production would need exception reporting workflows, risk acceptance documentation, and senior management notification |

## Current State

The reference implementation demonstrates model risk management governance patterns
that are directly transferable to a CMF-regulated environment:

1. **Model documentation**: The model card provides comprehensive model documentation
   in a standardised format (CHAI Applied Model Card), including purpose, limitations,
   performance metrics, and known risks.

2. **Eval harness as measurement system**: The eval harness is an independent measurement
   system that evaluates the agent against curated cases across seven dimensions,
   with deterministic thresholds enforced in CI. This maps directly to the model
   validation requirements in Norma 20.

3. **Guardrails as controls**: The scope classifier, refusal templates, and escalation
   router act as deterministic controls that bound model behaviour. In financial
   applications, analogous controls would limit model outputs to approved actions.

4. **Observability as monitoring**: Telemetry spans with OpenInference semantic conventions
   provide real-time monitoring of every model decision, enabling audit trail
   reconstruction and performance tracking. This maps to the ongoing monitoring
   requirements in Norma 20.

5. **Decision-record-based change control**: Every substantive design decision is documented
   in an architecture decision record, providing the decision trail that model governance
   committees require.

6. **Transparent limitations**: The model card and the regulatory posture document known
   limitations honestly -- near-miss off-corpus handling, sub-acute escalation gaps,
   probabilistic model behaviour. This transparency is a governance strength.

## Production Path

Adapting these patterns for a CMF-regulated financial institution:

1. **Model governance committee**: Cross-functional committee (risk, compliance, IT,
   business) with authority to approve, restrict, or retire models
2. **Model inventory and risk-tier framework**: Comprehensive inventory of all models
   with risk-tier classification aligned to CMF expectations; higher-risk models
   receive more intensive validation and monitoring
3. **Independent model validation**: Dedicated validation team independent of model
   development; validation reports covering conceptual soundness, outcome analysis,
   sensitivity analysis, and benchmarking
4. **Continuous performance monitoring**: Automated drift detection, performance
   baselines, longitudinal tracking, and automated alerting on degradation
5. **Formal change management**: Change approval workflows with pre-deployment
   validation, rollback procedures, and post-deployment monitoring
6. **Exception management**: Documented exception handling with risk acceptance,
   senior management notification, and remediation plans
7. **Regulatory reporting**: Periodic model risk reports to senior management and
   CMF; material model changes reported within required timeframes

The governance patterns in this reference implementation -- eval contracts, decision-record
traceability, guardrails-before-LLM, telemetry instrumentation, honest limitation
documentation -- provide a strong foundation. They are the procedural and technical
building blocks that a CMF-regulated entity would assemble into a formal model risk
management framework.

## See Also

- [Regulatory posture](../reference/regulatory-posture.md) -- regulatory boundary
- [Model card](../reference/model-card.md) -- CHAI Applied Model Card
- [NIST AI RMF mapping](nist-ai-rmf.md) -- NIST AI RMF mapping
- [Chile Ley 19.628 mapping](chile-ley-19628.md) -- Chile data protection mapping
- [Drift detection plan](drift-detection-plan.md) -- drift detection plan
- [Guardrails design](../adr/adr-0005-guardrails.md) -- guardrails design
