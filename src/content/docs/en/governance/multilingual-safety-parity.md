---
title: Multilingual Safety Parity Assessment
description: Whether users in English, es-419, and pt-BR receive equivalent safety protections in the public reference implementation, and the known parity gaps.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Multilingual Safety Parity Assessment

> Documents the safety parity posture of the `ai-agent-eval-harness-healthtech`
> reference implementation across its three supported locales: English (en),
> Latin-American Spanish (es-419), and Brazilian Portuguese (pt-BR). This assessment
> evaluates whether users in all three locales receive equivalent safety protections.
>
> Read alongside the [data statement](/ai-agent-eval-harness-healthtech-docs/en/reference/data/), the
> [model card](/ai-agent-eval-harness-healthtech-docs/en/reference/model-card/), and the
> [OWASP ATLAS threat model](/ai-agent-eval-harness-healthtech-docs/en/governance/owasp-atlas-threat-model/).

## Locale Coverage

| Dimension | en | es-419 | pt-BR |
|-----------|-----|--------|-------|
| Refusal templates | Yes (5 categories) | Yes (5 categories) | Yes (5 categories) |
| Scope classifier | Yes (regex patterns) | Yes (regex patterns) | Yes (regex patterns) |
| Escalation templates | Yes (7 acute categories) | Yes (7 acute categories) | Yes (7 acute categories) |
| Eval corpus cases | 100 | 59 | 59 |
| KB cards | 36 (English) | uses English KB | uses English KB |
| Demo disclaimer | Yes | Yes | Yes |
| Voice TTS voices | Sarah | Matilda | Bella |

## Safety Parity Analysis

### Refusal Template Parity

The refusal templates cover five categories in all three locales:

1. Dosing advice refusal
2. Diagnosis refusal
3. Lab/imaging interpretation refusal
4. Prescription change refusal
5. Out-of-scope refusal

Each template follows the same structure across locales: a clear refusal, redirection
to the appropriate healthcare professional, and the locale-appropriate footer disclaimer.
The eval harness verifies that refusal correctness is 1.000 across all locale slices,
meaning the deterministic guardrails fire identically regardless of locale.

### Eval Threshold Parity

| Metric | Threshold | Applied to Locales |
|--------|-----------|-------------------|
| Faithfulness | >= 0.85 | en, es-419, pt-BR (identical) |
| Hallucination | <= 0.10 | en, es-419, pt-BR (identical) |
| Refusal correctness | = 1.000 | en, es-419, pt-BR (identical) |
| Escalation correctness | = 1.000 | en, es-419, pt-BR (identical) |

All three locale slices are held to the same thresholds in the eval harness. A
locale-specific regression fails the build. The deterministic CI gate runs all 218
cases (100 en + 59 es-419 + 59 pt-BR) on every change.

### PII Redaction Parity

The PII redaction module covers locale-specific identifier patterns:

| Identifier Type | en (US) | es-419 (Chile) | pt-BR (Brazil) |
|-----------------|---------|-----------------|-----------------|
| Email | Yes | Yes | Yes |
| Phone numbers | US formats | Chilean formats (+56, mobile patterns) | Brazilian formats (+55, mobile/landline) |
| National ID | SSN patterns | RUT patterns (XX.XXX.XXX-X) | CPF patterns (XXX.XXX.XXX-XX) |
| Credit card | Luhn-validated | Luhn-validated | Luhn-validated |
| Health identifiers | MRN, DOB | DNI patterns | MRN, DOB |

PII redaction is applied at both input and output stages, regardless of locale. The
redaction patterns for all three locales are tested in the unit test suite.

### Known Parity Gaps

The following parity gaps are acknowledged honestly:

1. **KB cards are English only**: The KB cards are written in English.
   es-419 and pt-BR users interact with the agent in their language, but the underlying
   knowledge base content is English. This means the agent may retrieve and cite an
   English-language card while responding in Spanish or Portuguese. The quality of
   cross-lingual retrieval depends on the embedder's multilingual capability.

2. **Synthetic data has US-English vocabulary bias**: The eval corpus, while held to
   identical thresholds, was generated with a known US-English clinical vocabulary bias.
   The producer-critic loop partially corrects this, but residual bias is documented
   in the data statement rather than claimed solved.

3. **Asymmetric eval corpus sizes**: The English eval corpus (100 cases) is almost
   twice the size of either the es-419 (59) or pt-BR (59) corpus. While the eval harness
   applies the same thresholds, the smaller sample sizes for es-419 and pt-BR mean
   that some failure modes may be under-represented in those locales.

4. **Embedder language coverage**: The default embedder (`BAAI/bge-small-en-v1.5`) is
   English-focused. Cross-lingual retrieval for es-419 and pt-BR relies on the
   embedder's ability to match non-English queries to English KB cards. A multilingual
   embedder would improve retrieval quality.

5. **Voice TTS language coverage**: The TTS voices (Sarah for EN, Matilda for ES,
   Bella for PT-BR) provide language-specific synthesis, but the quality and naturalness
   may vary across voices.

## Current State

The reference implementation maintains safety parity across three locales through
the following mechanisms:

- **Identical eval thresholds**: All three locale slices are scored under the same
  thresholds on every CI run. A locale-specific regression is a build failure.
- **Locale-aware refusal templates**: All five refusal categories have templates in
  en, es-419, and pt-BR, following the same structure and enforced by the same eval
  dimensions.
- **Locale-aware PII redaction**: Identifier patterns for US, Chile, and Brazil are
  detected and redacted in the same pipeline stage.
- **Locale-aware escalation**: Red-flag escalation templates are available in all
  three locales, covering the seven acute categories.
- **es-419 and pt-BR eval cases**: Dedicated eval corpus slices test
  locale-specific behaviour on every change.

The deterministic eval gate proves guardrail parity: refusal correctness and escalation
correctness are 1.000 across all three locales on every run. This means the safety
guardrails fire identically regardless of the user's locale.

The honest assessment is that safety parity is achieved at the guardrail layer (deterministic,
testable, reproducible) but not fully at the model layer (probabilistic, locale-dependent)
or the knowledge layer (English KB, asymmetric corpus sizes).

## Production Path

Achieving full multilingual safety parity in a production deployment:

1. **Localised knowledge base**: KB cards written in each locale's language by
   qualified medical translators, not machine-translated; clinical review for each
   locale to ensure medical terminology is accurate and culturally appropriate

2. **Native-language safety review**: Safety evaluation conducted by native-language
   reviewers for each locale, not just by running the same eval harness against
   translated test cases; identification of locale-specific safety concerns (e.g.,
   medication naming conventions, emergency service numbers, cultural health beliefs)

3. **Balanced eval corpus sizes**: Comparable corpus sizes across locales to ensure
   equal representation of failure modes; targeted generation of adversarial cases
   specific to each locale's language and cultural context

4. **Multilingual embedder**: Embedder with strong multilingual performance for
   cross-lingual retrieval; evaluation of retrieval quality per locale

5. **Locale-specific clinical escalation paths**: Emergency services guidance tailored
   to each locale's healthcare system (e.g., 911 for US, 131 for Chile, 192/SAMU for
   Brazil); locale-specific crisis resources and helplines

6. **Cultural adaptation beyond translation**: Agent behaviour adapted to cultural
   norms around health discussions (e.g., directness of medical advice, family
   involvement in healthcare decisions, attitudes toward medication); not just
   translated text but culturally appropriate interaction patterns

7. **Continuous locale monitoring**: Separate performance monitoring per locale;
   automated alerting on locale-specific regressions; regular review of locale
   performance data by native-language analysts

## See Also

- [Data statement](/ai-agent-eval-harness-healthtech-docs/en/reference/data/) -- synthetic dataset card with locale methodology
- [Model card](/ai-agent-eval-harness-healthtech-docs/en/reference/model-card/) -- CHAI Applied Model Card, Fairness section
- [Voice consent and deepfake policy](/ai-agent-eval-harness-healthtech-docs/en/governance/voice-consent-deepfake/) -- voice consent policy
- [PII redaction](/ai-agent-eval-harness-healthtech-docs/en/governance/pii-redaction/) -- PII redaction per locale
- [Guardrails design](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/) -- guardrails design
