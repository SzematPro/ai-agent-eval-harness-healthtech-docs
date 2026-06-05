---
title: HIPAA Readiness Assessment
description: An honest HIPAA readiness assessment of a synthetic-data reference implementation that handles no PHI and is not subject to HIPAA.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# HIPAA Readiness Assessment

Evaluates the `ai-agent-eval-harness-healthtech` reference implementation against
the US Health Insurance Portability and Accountability Act (HIPAA) Privacy, Security,
and Breach Notification Rules. This is an honest assessment: the system is a
reference implementation that does not handle PHI and is not subject to HIPAA.
The assessment identifies what exists today and what a PHI-handling deployment would need.

Read alongside the [regulatory posture](../reference/regulatory-posture.md) and the
[PII redaction documentation](pii-redaction.md).

## Applicability

HIPAA applies to covered entities (health plans, healthcare clearinghouses, healthcare
providers who conduct standard transactions electronically) and their business associates.
This reference implementation is none of these. It is a public code artefact, not a
covered entity, not a business associate, and not subject to HIPAA obligations.

The assessment below evaluates readiness should the same architecture be deployed in a
context where it would process PHI on behalf of a covered entity.

## Privacy Rule Assessment

| Requirement | Current State | Production Path |
|-------------|--------------|-----------------|
| **PHI handling** | No PHI present. The system uses 100% synthetic data (36 KB cards, 218 eval cases). No real patient data, no real EHR, no real clinical records. | A production deployment would need to define what constitutes PHI in its context, implement policies for PHI ingestion, processing, storage, and disposal, and ensure the minimum necessary standard is applied |
| **Minimum Necessary** | Not applicable -- no PHI handled | Access controls limiting PHI exposure to the minimum necessary for each function; role-based access with audit logging |
| **Patient rights** | Not applicable -- no real patients | Mechanisms for patients to access, amend, and receive an accounting of disclosures of their PHI; request processing within HIPAA timeframes |
| **Notice of Privacy Practices** | Demo disclaimer on every response ("This is a demonstration. Not medical advice.") | Formal Notice of Privacy Practices document; patient acknowledgement of receipt |

## Security Rule Assessment

### Administrative Safeguards

| Requirement (45 CFR 164.308) | Current State | Production Path |
|-------------------------------|--------------|-----------------|
| **Security management process** | Eval harness gates every change; architecture decision records document risk treatment; nightly red-team exercises adversarial testing | Formal risk analysis; risk management plan; sanction policy; information system activity review |
| **Assigned security responsibility** | Single-author project; no designated security officer | Designated security official responsible for developing and implementing security policies |
| **Workforce training** | Not applicable | Security awareness training for all workforce members; periodic refresher training; training on phishing, social engineering, and PHI handling |
| **Access management** | Repository-level access; no runtime user authentication for the demo API | Role-based access control; unique user identification; emergency access procedures; automatic logoff; encryption and decryption mechanisms |
| **Contingency planning** | No backup/recovery for demo data (in-memory checkpointer, no persistent storage) | Data backup plan; disaster recovery plan; emergency mode operation plan; testing and revision procedures |
| **Evaluation** | No formal security evaluation | Periodic technical and nontechnical evaluation; assessment of security measures against documented requirements |

### Physical Safeguards

| Requirement (45 CFR 164.310) | Current State | Production Path |
|-------------------------------|--------------|-----------------|
| **Facility access controls** | Not applicable (hosted on Hugging Face Spaces; no physical infrastructure controlled) | Physical access controls for any on-premises infrastructure; visitor logs; maintenance records |
| **Workstation security** | Not applicable | Physical safeguards for workstations accessing PHI; restricted access to authorised users |
| **Device and media controls** | Not applicable | Media disposal procedures; media re-use controls; accountability records for media movement |

### Technical Safeguards

| Requirement (45 CFR 164.312) | Current State | Production Path |
|-------------------------------|--------------|-----------------|
| **Access control** | No runtime user authentication for demo API; no PHI to protect | Unique user identification; emergency access procedure; automatic logoff; encryption and decryption of PHI at rest |
| **Audit controls** | OpenTelemetry spans with OpenInference semantic conventions on every node, LLM call, retrieval, and guardrail decision (see the [observability decision](../adr/adr-0006-observability.md)); Langfuse Cloud and Phoenix sinks | Comprehensive audit logging with tamper-evident storage; 6-year retention; query interface for audit review; real-time alerting on anomalous access patterns |
| **Integrity controls** | Eval harness detects behavioural regressions; the chat response schema is locked; synthetic data files are version-controlled | Electronic mechanisms to authenticate PHI; integrity controls to prevent unauthorised alteration; backup integrity verification |
| **Transmission security** | HTTPS on Hugging Face Spaces (platform-provided); API returns structured JSON | End-to-end encryption in transit (TLS 1.3 minimum); network segmentation; VPN for administrative access |

## Breach Notification Assessment

| Requirement (45 CFR 164.400-414) | Current State | Production Path |
|-----------------------------------|--------------|-----------------|
| **Breach definition** | No PHI to breach | Formal breach assessment process; documentation of incidents; risk-of-harm assessment for each suspected breach |
| **Notification to individuals** | Not applicable | Notification to affected individuals without unreasonable delay (within 60 days); written notification with required content |
| **Notification to HHS** | Not applicable | Annual log of breaches affecting fewer than 500 individuals; notification to HHS for breaches affecting 500 or more |
| **Notification to media** | Not applicable | Notification to prominent media outlets in the state for breaches affecting 500 or more individuals |

## Business Associate Considerations

A production deployment using external LLM providers (Groq, Cerebras, OpenAI, Anthropic)
to process PHI would need:

- **Business Associate Agreements (BAAs)** with each LLM provider, contractually
  obligating them to safeguard PHI
- Assurance that LLM providers do not retain or use PHI for model training
- Evaluation of each provider's HIPAA compliance posture
- Contractual provisions for breach notification, subcontractor management, and
  return/destruction of PHI at contract termination

As of 2026, most major LLM providers offer BAA-eligible tiers for enterprise customers.
The thin LLM client Protocol abstraction (see the
[LLM vendor abstraction decision](../adr/adr-0002-llm-vendor-abstraction.md)) supports
switching providers to ones with appropriate BAAs without code changes.

## Current State

The reference implementation is built with several HIPAA-aligned controls, despite not
being subject to HIPAA:

- **No PHI**: The system handles only synthetic data. No real patient data enters the
  repository, the demo, or the eval pipeline at any point. This is enforced by a
  data-acceptance check and documented in the [data statement](../reference/data.md).
- **PII redaction**: A redaction stage detects and redacts email, phone numbers (US, Chile,
  Brazil formats), RUT, CPF, DNI, SSN, credit card numbers (Luhn-validated), and PHI
  patterns (MRN, DOB) at both input and output stages.
- **No persistent storage**: The demo uses an in-memory checkpointer; user conversations
  are not persisted beyond the process lifetime. A durable Postgres-backed checkpointer
  is available when a database connection string is configured.
- **Audit trail**: OpenTelemetry spans with OpenInference semantic conventions wrap every
  node, LLM call, retrieval, and guardrail decision (see the
  [observability decision](../adr/adr-0006-observability.md)). The user's message text is
  explicitly excluded from spans (privacy invariant enforced by an automated test).
- **Privacy-by-design**: User message text never enters OpenTelemetry spans, logs, or trace
  attributes. This is a hard constraint enforced by an automated test invariant.
- **Secret management**: Secret scanning in CI prevents secrets from entering the repository;
  the dependency lockfile pins versions; automated dependency monitoring watches for
  vulnerabilities.

These controls demonstrate awareness of HIPAA principles but do not constitute HIPAA
compliance. The system has not undergone a formal risk analysis, has no designated
security officer, has no BAA with any LLM provider, and does not meet the Security Rule's
technical safeguard requirements for systems that process PHI.

## Production Path

To deploy this architecture in a HIPAA-regulated environment:

1. **Formal risk analysis**: Comprehensive assessment of threats and vulnerabilities to
   PHI confidentiality, integrity, and availability; documented risk treatment plan
2. **BAA execution**: Business Associate Agreements with all LLM providers processing PHI;
   contractual PHI safeguards; termination provisions for PHI return/destruction
3. **Encryption**: AES-256 encryption at rest for any PHI storage; TLS 1.3 minimum for
   PHI in transit; key management with hardware security modules for production keys
4. **Access controls**: Role-based access control with unique user identification;
   multi-factor authentication for administrative access; automatic session timeout
5. **Audit log retention**: 6-year retention of audit logs (HIPAA requirement);
   tamper-evident log storage; query interface for audit review and compliance reporting
6. **Contingency planning**: Data backup and disaster recovery procedures; emergency
   mode operation plan; regular testing of recovery procedures
7. **Workforce training**: HIPAA awareness training for all personnel; role-specific
   training for those handling PHI; periodic refresher training and phishing simulations
8. **Incident response**: Breach notification procedures meeting HIPAA timelines;
   incident classification and escalation; forensic investigation capability

The repository's existing patterns -- PII redaction, an OpenTelemetry audit trail, the
privacy invariant, guardrail-first architecture -- provide a substantive head start. The
gap is in the organisational, procedural, and contractual layers that a reference
implementation cannot demonstrate on its own.

## See Also

- [Regulatory posture](../reference/regulatory-posture.md) -- regulatory boundary
- [PII redaction](pii-redaction.md) -- PII redaction documentation
- [Audit logging plan](audit-logging-plan.md) -- audit logging plan
- [ISO 42001 / SOC 2 readiness](iso42001-soc2.md) -- ISO 42001 / SOC 2 readiness
- [Observability decision](../adr/adr-0006-observability.md) -- observability design
