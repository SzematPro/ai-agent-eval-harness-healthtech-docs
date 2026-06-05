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
| `intake` | [HIPAA readiness](/ai-agent-eval-harness-healthtech-docs/en/governance/hipaa-readiness/), [Chile Ley 19.628](/ai-agent-eval-harness-healthtech-docs/en/governance/chile-ley-19628/), [CMF Norma 20](/ai-agent-eval-harness-healthtech-docs/en/governance/cmf-norma-20/) | Input handling, PII ingress, jurisdictional compliance |
| `guardrail_pre` | [PII redaction](/ai-agent-eval-harness-healthtech-docs/en/governance/pii-redaction/), [OWASP ATLAS threat model](/ai-agent-eval-harness-healthtech-docs/en/governance/owasp-atlas-threat-model/), [Voice consent and deepfake](/ai-agent-eval-harness-healthtech-docs/en/governance/voice-consent-deepfake/) | PII detection, adversarial defense, voice consent |
| `retrieve_context` | [Data card](/ai-agent-eval-harness-healthtech-docs/en/governance/data-card/), [Drift detection plan](/ai-agent-eval-harness-healthtech-docs/en/governance/drift-detection-plan/) | Data provenance, knowledge base integrity |
| `generate_response` | [NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/en/governance/nist-ai-rmf/), [EU AI Act](/ai-agent-eval-harness-healthtech-docs/en/governance/eu-ai-act/), [Multilingual safety parity](/ai-agent-eval-harness-healthtech-docs/en/governance/multilingual-safety-parity/) | Risk management, regulatory classification, locale safety |
| `review_response` | [Audit logging plan](/ai-agent-eval-harness-healthtech-docs/en/governance/audit-logging-plan/), [ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/en/governance/iso42001-soc2/) | Human-in-the-loop audit, management system controls |
| `guardrail_post` | [Data card](/ai-agent-eval-harness-healthtech-docs/en/governance/data-card/), [Drift detection plan](/ai-agent-eval-harness-healthtech-docs/en/governance/drift-detection-plan/), [Audit logging plan](/ai-agent-eval-harness-healthtech-docs/en/governance/audit-logging-plan/) | Output verification, citation integrity, audit trail |
| `closing` | [ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/en/governance/iso42001-soc2/) | Session finalization, management system compliance |

## Notes

- The mapping is by node *type* (not instance), so it remains stable across
  topology changes.
- `review_response` is only present when the human-in-the-loop review step is enabled;
  the overlay gracefully handles its absence.
- Terminal markers (`start`, `end`) are excluded from governance mapping.
