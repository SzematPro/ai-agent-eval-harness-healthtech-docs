---
title: Chile Ley 19.628 Data Protection Mapping
description: How the public reference implementation maps to Chile's Ley 19.628 data protection principles, data subject rights, and sensitive data provisions.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Chile Ley 19.628 Data Protection Mapping

> Maps the `ai-agent-eval-harness-healthtech` reference implementation against
> [Ley 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599) (Chilean Law on
> Protection of Private Life / Proteccion de la Vida Privada), as amended through
> 2024. This document evaluates which data protection principles the reference
> implementation observes and what a Chilean deployment would require.
>
> Read alongside the [regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) and
> the [HIPAA readiness assessment](/ai-agent-eval-harness-healthtech-docs/en/governance/hipaa-readiness/).

## Legislative Context

Ley 19.628 regulates the treatment of personal data in Chile. Key amendments include
the 2018 modernisation (Law 21.099, aligning with GDPR principles) and subsequent
updates strengthening consent requirements, data subject rights, and cross-border
transfer provisions. The law applies to the treatment of personal data when the
responsible party (data controller) is domiciled in Chile or when the processing
uses means located in Chilean territory.

## Personal Data Principles Assessment

| Principle (Ley 19.628) | Current State | Production Path |
|------------------------|--------------|-----------------|
| **Lawfulness** (Art. 2) | No personal data collected. The system operates on 100% synthetic data. No real individuals' data is processed at any point. | Lawful basis for processing (consent, contractual necessity, legal obligation, or legitimate interest); documented legal basis for each processing activity |
| **Purpose limitation** (Art. 2) | Not applicable -- no personal data | Clear, specific, and explicit purpose for each data processing activity; purpose limitation enforced in system design |
| **Data minimisation** (Art. 2) | The system collects minimal runtime input: the user's conversational turn. PII is redacted before processing. No data is persisted beyond process lifetime (in-memory checkpointer). | Collect only data necessary for the stated purpose; periodic review of data collected; deletion of data no longer needed |
| **Accuracy** (Art. 2) | Not applicable -- no personal data | Mechanisms for data subjects to update or correct their data; data quality review procedures |
| **Storage limitation** (Art. 2) | No persistent storage of user data; conversations held in memory and lost on process restart | Defined retention periods; deletion procedures; data subject access and deletion request handling |
| **Security** (Art. 2) | PII redaction at input/output; OpenTelemetry audit trail; no secrets in the repository (automated secret scanning); HTTPS on the hosted demo | Technical and organisational security measures appropriate to the risk; encryption, access controls, breach notification procedures |
| **Transparency** (Art. 2) | Demo disclaimer on every response; public model card; published regulatory posture documents scope | Privacy notice accessible before data collection; clear language about data processing purposes, retention, and rights |

## Data Subject Rights

| Right (Ley 19.628) | Current State | Production Path |
|---------------------|--------------|-----------------|
| **Access** (Art. 12) | Not applicable -- no personal data stored | Mechanism for data subjects to request and receive confirmation of whether their data is being processed |
| **Rectification** (Art. 12) | Not applicable | Mechanism for data subjects to correct inaccurate data |
| **Deletion** (Art. 12) | Not applicable -- no persistent data | Mechanism for data subjects to request deletion of their data; deletion verification |
| **Opposition** (Art. 12) | Not applicable | Mechanism for data subjects to object to processing on legitimate grounds |
| **Portability** (implied by 2018 amendment) | Not applicable | Mechanism for data subjects to receive their data in a structured, machine-readable format |

## Sensitive Data Provisions

Ley 19.628 provides enhanced protections for sensitive personal data (health data,
biometric data, among others). Under the law, sensitive data may only be processed
with explicit written consent or when necessary for medical prevention, diagnosis,
or healthcare management.

| Aspect | Current State | Production Path |
|--------|--------------|-----------------|
| **Health data** | No real health data. All clinical content is synthetic. The agent discusses medication adherence with synthetic personas only. | Explicit consent for health data processing; purpose limitation to the healthcare context; enhanced security measures; access restricted to authorised healthcare personnel |
| **Biometric data** | No biometric data collected or processed | Explicit consent; purpose limitation; enhanced security; deletion when purpose is achieved |
| **Consent management** | Not applicable -- no personal data | Consent management platform; granular consent options; consent withdrawal mechanism; consent audit trail |

## Cross-Border Data Transfer

| Aspect | Current State | Production Path |
|--------|--------------|-----------------|
| **LLM provider data transfer** | User input is sent to LLM providers (Groq, Cerebras) over HTTPS. No personal data is present in the input (synthetic-only reference implementation). | Assessment of LLM provider jurisdictions; adequacy determination or appropriate safeguards for cross-border transfer; contractual provisions ensuring equivalent protection levels |
| **Observability data transfer** | Telemetry spans are sent to Langfuse Cloud and Phoenix. User message text is explicitly excluded from spans (privacy invariant). | Assessment of observability provider data residency; data processing agreements; exclusion of personal data from telemetry |

## Current State

The reference implementation handles no personal data and is therefore not subject to
Ley 19.628 obligations. However, the design incorporates several data-protection-aligned
practices:

- **No personal data**: The system operates on 100% synthetic data. No real individual's
  data enters the reference implementation, demo, or eval pipeline.
- **PII redaction**: The redaction layer detects and redacts identifiers relevant to Chilean
  users (RUT, Chilean phone number formats), alongside US and Brazilian identifiers,
  at both input and output stages.
- **No persistent storage**: The demo uses an in-memory checkpointer; no user data
  persists beyond the process lifetime.
- **Privacy invariant**: User message text never enters telemetry spans, logs, or trace
  attributes. This is a hard constraint enforced by a dedicated unit test.
- **es-419 locale support**: The eval corpus includes a dedicated es-419 slice, and refusal
  templates support Latin-American Spanish, demonstrating awareness of LATAM users.

The PII redaction patterns for Chilean identifiers (RUT format, Chilean phone number
prefixes) and the locale-aware refusal templates that support es-419 responses are part
of the deterministic guardrail layer.

## Production Path

Deploying this architecture for Chilean users in a context that processes personal data
would require:

1. **Data controller registration**: Registration with the Chilean data protection
   authority (if required for the specific processing activity)
2. **Consent management**: Explicit consent for personal data collection and processing;
   granular consent options; consent withdrawal mechanism; consent audit trail
3. **Privacy notice**: Clear, accessible privacy notice in Spanish describing data
   processing purposes, retention periods, and data subject rights
4. **Data Protection Officer (DPO)**: Appointment of a DPO or equivalent role
   responsible for data protection compliance
5. **Cross-border transfer assessment**: Evaluation of LLM provider data residency;
   contractual safeguards for data transferred outside Chile; adequacy determination
   or equivalent protection mechanisms
6. **Health data provisions**: If the system processes real health data, compliance
   with the enhanced protections for sensitive data under Ley 19.628, including
   explicit written consent and purpose limitation to healthcare management
7. **Data subject rights infrastructure**: Mechanisms for access, rectification,
   deletion, opposition, and portability requests; response within statutory timeframes
8. **Security measures**: Technical and organisational measures appropriate to the
   sensitivity of the data processed; regular security assessments; breach notification
   procedures

## See Also

- [Regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) -- regulatory boundary
- [CMF Norma 20 mapping](/ai-agent-eval-harness-healthtech-docs/en/governance/cmf-norma-20/) -- Chilean financial regulator mapping
- [HIPAA readiness assessment](/ai-agent-eval-harness-healthtech-docs/en/governance/hipaa-readiness/) -- HIPAA readiness assessment
- [PII redaction documentation](/ai-agent-eval-harness-healthtech-docs/en/governance/pii-redaction/) -- PII redaction documentation
- [Observability design](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/) -- observability design
