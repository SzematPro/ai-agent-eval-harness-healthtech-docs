---
title: PII Redaction
description: Detection patterns, pipeline integration, and limitations of the deterministic PII redaction in the public reference implementation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# PII Redaction Documentation

> Documents the PII (Personally Identifiable Information) redaction capabilities of
> the `ai-agent-eval-harness-healthtech` reference implementation. Covers the detection
> patterns, pipeline integration, and limitations of the current PII redaction module.
>
> Read alongside the [HIPAA readiness assessment](hipaa-readiness.md) and the
> [Chile Ley 19.628 mapping](chile-ley-19628.md).

## PII Redaction Architecture

### Pipeline Integration

PII redaction is applied at two points in the agent pipeline:

1. **At-ingress (input)**: User input is scanned for PII patterns before being processed
   by the agent pipeline. Detected PII is replaced with placeholder tokens (e.g.,
   `[EMAIL]`, `[PHONE]`, `[SSN]`). The redacted text is what the agent processes.

2. **At-egress (output)**: Agent output is scanned for PII patterns before being returned
   to the user. This catches cases where the LLM inadvertently generates PII (e.g.,
   echoing a phone number from the conversation context).

The redaction runs in the guardrail layer and is integrated into the `guardrail_pre`
and `guardrail_post` nodes of the LangGraph pipeline.

### Redaction Events in Telemetry Spans

PII redaction events are recorded as telemetry span attributes:

- `pii.redacted`: boolean indicating whether redaction occurred
- `pii.pattern_type`: the type of pattern that was matched (e.g., "email", "phone_us",
  "rut_chile")

User message text is never included in the span attributes (privacy invariant).

## Detection Patterns

### Currently Detected PII Types

| PII Type | Pattern | Locale | Example |
|----------|---------|--------|---------|
| **Email addresses** | RFC 5322 simplified regex | Universal | `user@example.com` -> `[EMAIL]` |
| **US phone numbers** | NANP format with optional +1 prefix | en (US) | `+1 (555) 123-4567` -> `[PHONE]` |
| **Chilean phone numbers** | +56 prefix, mobile (9) and landline patterns | es-419 (Chile) | `+56 9 1234 5678` -> `[PHONE]` |
| **Brazilian phone numbers** | +55 prefix, mobile (9-digit) and landline patterns | pt-BR (Brazil) | `+55 11 91234-5678` -> `[PHONE]` |
| **US SSN** | `XXX-XX-XXXX` format with range validation | en (US) | `123-45-6789` -> `[SSN]` |
| **Chilean RUT** | `XX.XXX.XXX-X` format with module-11 check digit | es-419 (Chile) | `12.345.678-5` -> `[RUT]` |
| **Brazilian CPF** | `XXX.XXX.XXX-XX` format with module-11 check digit | pt-BR (Brazil) | `123.456.789-09` -> `[CPF]` |
| **Chilean DNI** | National identity document patterns | es-419 (Chile) | Various formats -> `[DNI]` |
| **Credit card numbers** | 13-19 digit numbers with Luhn algorithm validation | Universal | `4111 1111 1111 1111` -> `[CC]` |
| **Medical Record Numbers (MRN)** | Alphanumeric patterns common in healthcare systems | en (US) | `MRN-12345678` -> `[MRN]` |
| **Dates of Birth (DOB)** | Common DOB formats (MM/DD/YYYY, DD/MM/YYYY) | Universal | `01/15/1990` -> `[DOB]` |

### Pattern Matching Methodology

PII detection uses deterministic regex patterns, not LLM-based detection. This ensures:

- **Reproducibility**: The same input always produces the same redaction result
- **Determinism**: PII redaction runs in the guardrail layer, which is tested by the
  deterministic CI gate (a stub LLM client, no API keys required)
- **Low latency**: Regex matching is fast and adds negligible overhead to the pipeline
- **Auditability**: Pattern definitions are version-controlled and reviewable

### Validation Checks

Some PII types include structural validation beyond pattern matching:

- **Credit card numbers**: Validated using the Luhn algorithm to reduce false positives
  on arbitrary digit sequences
- **RUT**: Validated using the Chilean module-11 check digit algorithm
- **CPF**: Validated using the Brazilian module-11 check digit algorithm
- **SSN**: Range-validated to exclude impossible ranges (e.g., 000, 666, 900-999 in
  the area number)

## Limitations

### Known Limitations of Regex-Based Detection

1. **Context-dependent PII**: Regex patterns cannot detect PII that is implied by context
   rather than formatted in a recognisable pattern. For example, "my name is John and
   I live at the corner of Main and Oak" contains PII (name, location) that no regex
   can reliably extract.

2. **Novel formats**: New phone number formats, ID number formats, or address formats
   not covered by the existing patterns will pass through undetected.

3. **International formats**: While the module covers US, Chilean, and Brazilian formats,
   PII from other jurisdictions may not be detected. The coverage is intentionally
   aligned with the three supported locales.

4. **Partial PII**: Fragmented PII spread across multiple messages (e.g., area code in
   one message, remaining digits in the next) is not detected.

5. **Abbreviations and slang**: PII expressed informally (e.g., "mi numero es cinco
   cinco cinco uno dos tres cuatro" -- spelled-out digits) is not detected.

6. **False positives**: The regex patterns may occasionally redact non-PII that happens
   to match a pattern format (e.g., a 9-digit product code matching SSN format). The
   Luhn and module-11 validations mitigate this for financial identifiers.

### What PII Redaction Does NOT Do

- **Does not prevent the LLM from generating PII-like content**: The output redaction
  catches generated PII patterns, but a sophisticated LLM might generate content that
  is PII-adjacent without matching the patterns.
- **Does not redact names**: Personal names are not redacted because reliable name
  detection without an NER model produces unacceptable false-positive rates.
- **Does not redact addresses**: Street addresses are not redacted due to the wide
  variation in address formats across locales.
- **Does not redact biometric data**: No fingerprint, voiceprint, or facial recognition
  data patterns are included (the system does not collect biometric data).
- **Does not provide differential privacy**: PII redaction removes direct identifiers
  but does not provide mathematical privacy guarantees.

## Current State

The reference implementation provides deterministic PII redaction covering the most
common identifier types across its three supported locales (US, Chile, Brazil). The
redaction module runs in the guardrail layer, is tested by the deterministic CI gate,
and logs redaction events to telemetry spans.

Key strengths:

1. **Deterministic and reproducible**: Same input, same redaction, every time. No
   dependency on LLM behaviour for PII detection.
2. **Multi-locale coverage**: Patterns for US, Chilean, and Brazilian identifiers,
   aligned with the three supported locales.
3. **Structural validation**: Luhn algorithm for credit cards, module-11 for RUT and CPF,
   range validation for SSN -- reducing false positives on the most sensitive patterns.
4. **Pipeline integration**: Redaction at both input and output stages, integrated into
   the guardrail nodes that are tested by the eval harness.
5. **Audit trail**: Redaction events logged in telemetry spans with pattern type, enabling
   monitoring of redaction frequency and pattern distribution.

## Production Path

Production-grade PII redaction would require:

1. **Expanded pattern coverage**: Additional PII types (names via NER, addresses, IP
   addresses, vehicle identifiers, biometric data patterns, medical record formats
   from specific EHR systems); coverage for additional jurisdictions beyond US/Chile/Brazil

2. **LLM-based residual detection**: A secondary LLM-based PII detection pass to catch
   PII that regex patterns miss (context-dependent PII, novel formats, partial PII);
   applied as a second-stage check after regex-based redaction

3. **Redaction quality metrics**: Automated measurement of redaction precision and recall
   against a labelled test set; tracking of false-positive and false-negative rates;
   regression testing when patterns are updated

4. **Periodic pattern review**: Regular review of PII patterns against emerging data
   formats, new identifier types, and evolving privacy regulations; update cadence
   tied to regulatory review cycle

5. **Domain-specific patterns**: If deployed in specific healthcare or financial contexts,
   custom patterns for institution-specific identifier formats (e.g., specific EHR MRN
   formats, insurance ID formats, account number formats)

6. **Redaction logging for compliance**: Beyond the current telemetry span attributes,
   production would need dedicated redaction audit logs with retention policies,
   access controls, and compliance reporting

7. **Data subject request handling**: Mechanisms for data subjects to request information
   about what PII was detected and redacted; deletion procedures for any stored
   redaction metadata

## See Also

- [HIPAA readiness assessment](hipaa-readiness.md) -- HIPAA readiness assessment
- [Chile Ley 19.628 mapping](chile-ley-19628.md) -- Chile data protection mapping
- [Audit logging plan](audit-logging-plan.md) -- audit logging plan
- [Guardrails design](../adr/adr-0005-guardrails.md) -- guardrails design
