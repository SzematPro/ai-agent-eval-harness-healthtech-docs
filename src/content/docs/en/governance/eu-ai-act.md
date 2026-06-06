---
title: EU AI Act Classification and Mapping
description: An honest EU AI Act risk-tier classification and article mapping for a synthetic-data reference implementation not placed on the EU market.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# EU AI Act Classification and Mapping

Maps the `ai-agent-eval-harness-healthtech` reference implementation against
[Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
(the EU AI Act). This document provides an honest classification of the system
under the Act's risk tiers and maps relevant articles to the repository's
existing governance patterns.

Read alongside the [regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) and the
[NIST AI RMF mapping](/ai-agent-eval-harness-healthtech-docs/en/governance/nist-ai-rmf/).

## Risk-Tier Classification

### Classification: Not a High-Risk AI System

The EU AI Act establishes a four-tier risk framework: prohibited, high-risk, limited-risk
(transparency obligations), and minimal-risk. This system's classification:

| Tier | Assessment | Rationale |
|------|-----------|-----------|
| **Prohibited** (Art. 5) | Does not apply | The system does not deploy subliminal techniques, exploit vulnerabilities, conduct social scoring, or perform real-time biometric identification |
| **High-risk** (Annex III) | Does not apply | The system is not listed under any Annex III high-risk category. It is not used by public authorities for benefit eligibility (Art. III.5(a)), credit scoring (Art. III.5(c)), emergency dispatch (Art. III.6(d)), or any other Annex III enumeration |
| **Limited-risk** (Art. 50) | Potentially applicable | If deployed as a chatbot interacting with EU citizens, Art. 50 transparency obligations would apply: users must be informed they are interacting with an AI system |
| **Minimal-risk** | Current classification | As a public reference implementation not placed on the EU market as a product or service, the system falls below the transparency obligation threshold. No EU deployment exists; the Hugging Face Spaces demo is not marketed to EU users |

### Why This Is Not Annex III High-Risk

The agent is a medication-adherence wellness coach, patient-facing, that does not:

- Triage emergency calls or dispatch first responders (Annex III point 6(d))
- Evaluate eligibility for public services or benefits (Annex III point 5(a))
- Assess creditworthiness (Annex III point 5(c))
- Perform biometric identification or emotion recognition
- Act as a medical device requiring CE marking under the MDR/IVDR
- Influence elections, operate critical infrastructure, or perform law enforcement functions

The red-flag escalation feature recognises ten acute patterns and surfaces emergency-services
guidance. It is explicitly not a triage tool; it does not prioritise, route, or dispatch.
The escalation logic is deterministic and rule-based (a versioned pattern list), designed so
the human operator, not the model, holds the routing decision.

### Article 53: General-Purpose AI (GPAI) Considerations

The reference implementation uses foundation models (Groq, Cerebras, OpenAI, Anthropic)
behind a thin LLM client Protocol (see the
[LLM vendor abstraction decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/)). It does not
itself place a GPAI model on the EU market. The GPAI obligations (technical documentation,
copyright compliance, training-data summary) fall on the model providers, not on this
downstream application.

## Article-by-Article Relevance Map

| Article | Obligation | Current Coverage | Gap |
|---------|-----------|-----------------|-----|
| Art. 9 (Risk management) | Continuous identification, analysis, mitigation of risks | Eval harness identifies safety/citation/escalation regressions on every change; architecture decision records document risk treatment decisions | No formal risk-management system with periodic review; no systematic risk-register |
| Art. 10 (Data and data governance) | Training/validation data governance, representativeness, bias examination | The data statement documents generation methodology, provenance, licensing, exclusion list; locale-parity scoring examines cross-locale bias | Data governance covers synthetic datasets only; no real-data governance framework |
| Art. 11 + Annex IV (Technical documentation) | System description, design specifications, performance metrics | Model card (CHAI format), the system specification, the architecture decision records, the regulatory posture, the data statement | Documentation is thorough for a reference implementation; Annex IV requires specific format and depth |
| Art. 12 (Record-keeping / logging) | Automatic logging of events for traceability | OpenTelemetry and OpenInference spans on every node, LLM call, retrieval, guardrail decision (see the [observability decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/)); Langfuse Cloud and Phoenix sinks | Logging exists but is observability-grade, not audit-grade; no tamper-evident logs; no defined retention period |
| Art. 13 (Transparency and provision of information) | System designed for transparency; users understand outcomes | Guardrail-decision trace on every response; citation set on every clinical assertion; public model card; demo response carries disclaimer | Transparency is response-level; Art. 13 requires deployer-facing documentation and user-facing explanations |
| Art. 14 (Human oversight) | Designed for effective human oversight | Optional human-in-the-loop review node using a LangGraph interrupt (see the [streaming execution graph decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0010-streaming-execution-graph/)); human operator can approve/edit/reject high-risk drafts | Human-in-the-loop review is off by default; no dedicated human-oversight interface for monitoring; no override mechanism documentation |
| Art. 15 (Accuracy, robustness, cybersecurity) | Appropriate levels of accuracy, robustness, and cybersecurity | Deterministic eval gate (315/315 pass); nightly red-team; guardrails-before-LLM; PII redaction; OpenTelemetry instrumentation; secret scanning in CI | Accuracy measured on synthetic data; robustness tested on curated adversarial set; no penetration testing or formal security assessment |
| Art. 17 (Quality management system) | Documented QMS for high-risk systems | Eval harness as measurement system; decision-record-based change control; change-blocking eval gates; release notes | No formal QMS; no quality manual; no internal audit cycle |

## Current State

The reference implementation is a public code artefact, not a product or service placed on
the EU market. As such, it is not subject to the Act's obligations at this time. The
assessment above evaluates readiness should the same architecture be deployed within the EU.

What the repository demonstrates today:

- **Risk-tier honesty**: The system is explicitly classified as not high-risk, with a
  clear rationale tied to Annex III enumeration
- **Governance patterns that map to EU AI Act articles**: eval contracts (Art. 9),
  data provenance (Art. 10), technical documentation (Art. 11), an OpenTelemetry audit trail
  (Art. 12), citation transparency (Art. 13), a human-in-the-loop review node (Art. 14),
  deterministic safety gates (Art. 15)
- **No overclaiming**: This document does not assert EU AI Act compliance. The
  repository is a demonstration of governance-aware engineering, not a conformity
  assessment

The [regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) document records the
wellness/CDS boundary that keeps the system on the general-wellness side of the line,
and the refusal templates enforce that boundary in code.

## Production Path

Deploying this architecture within the EU market would require:

1. **Transparency obligations (Art. 50)**: If classified as limited-risk (chatbot),
   users must be informed they are interacting with an AI system. The demo disclaimer
   partially addresses this; formal disclosure would need legal review
2. **Conformity assessment**: If any feature change pushes the system into Annex III
   (e.g., adding clinician-facing CDS, emergency dispatch routing), a full conformity
   assessment under the relevant Annex III category is required before market placement
3. **EU AI Office registration**: High-risk systems must be registered in the EU database
   before deployment; limited-risk systems may have notification requirements
4. **Technical documentation (Annex IV)**: Formal system description, design choices,
   training-data governance, performance metrics, risk-management measures -- much of
   which maps to existing repository artefacts (the model card, the system specification,
   the architecture decision records) but would need restructuring into the Annex IV format
5. **Post-market monitoring**: Systematic collection and analysis of performance data
   from deployed instances; incident reporting to market-surveillance authorities
6. **Data protection impact assessment (DPIA)**: Under GDPR Art. 35 if the system
   processes personal data at scale; would require a separate DPIA document
7. **Human oversight design**: Formal design documentation for human-oversight mechanisms,
   including override procedures, competency requirements for human overseers, and
   escalation paths

The governance patterns in this repository -- decision-record traceability, eval harness
gating, guardrail-first architecture, OpenTelemetry instrumentation -- provide a strong
foundation for meeting these requirements. They reduce the effort from "build from scratch"
to "formalise and extend existing patterns."

## See Also

- [Regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) -- regulatory boundary the design respects
- [Model card](/ai-agent-eval-harness-healthtech-docs/en/reference/model-card/) -- CHAI Applied Model Card
- [NIST AI RMF mapping](/ai-agent-eval-harness-healthtech-docs/en/governance/nist-ai-rmf/) -- NIST AI RMF mapping
- [OWASP / ATLAS threat model](/ai-agent-eval-harness-healthtech-docs/en/governance/owasp-atlas-threat-model/) -- threat model
- [Guardrails decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/) -- guardrails design
