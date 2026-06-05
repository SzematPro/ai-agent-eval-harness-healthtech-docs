---
title: Regulatory Overlay Map
description: Mapping of governance documents to the executable node types in the agent execution graph for the public reference implementation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Regulatory Overlay Map

Authoritative mapping of governance documents to executable node types in the agent
execution graph. The demo surfaces this same mapping in its interface, so each node in
the agent state machine links to the governance documents relevant to it.

| Node Type | Governance Docs | Relevance Summary |
|-----------|----------------|-------------------|
| `intake` | [HIPAA readiness](hipaa-readiness.md), [Chile Ley 19.628](chile-ley-19628.md), [CMF Norma 20](cmf-norma-20.md) | Input handling, PII ingress, jurisdictional compliance |
| `guardrail_pre` | [PII redaction](pii-redaction.md), [OWASP ATLAS threat model](owasp-atlas-threat-model.md), [Voice consent and deepfake](voice-consent-deepfake.md) | PII detection, adversarial defense, voice consent |
| `retrieve_context` | [Data card](data-card.md), [Drift detection plan](drift-detection-plan.md) | Data provenance, knowledge base integrity |
| `generate_response` | [NIST AI RMF](nist-ai-rmf.md), [EU AI Act](eu-ai-act.md), [Multilingual safety parity](multilingual-safety-parity.md) | Risk management, regulatory classification, locale safety |
| `review_response` | [Audit logging plan](audit-logging-plan.md), [ISO 42001 / SOC 2](iso42001-soc2.md) | Human-in-the-loop audit, management system controls |
| `guardrail_post` | [Data card](data-card.md), [Drift detection plan](drift-detection-plan.md), [Audit logging plan](audit-logging-plan.md) | Output verification, citation integrity, audit trail |
| `closing` | [ISO 42001 / SOC 2](iso42001-soc2.md) | Session finalization, management system compliance |

## Notes

- The mapping is by node *type* (not instance), so it remains stable across
  topology changes.
- `review_response` is only present when the human-in-the-loop review step is enabled;
  the overlay gracefully handles its absence.
- Terminal markers (`start`, `end`) are excluded from governance mapping.
