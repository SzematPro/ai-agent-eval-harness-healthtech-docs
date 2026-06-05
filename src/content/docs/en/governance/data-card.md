---
title: Data Card
description: Provenance, licensing posture, and regulatory alignment for the synthetic evaluation corpus and knowledge base of the public reference implementation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Data Card - Synthetic Eval Set and Knowledge Base

> This document is the governance-facing companion to the [data statement](../reference/data.md).
> Where the data statement provides the full dataset card under the Google Data Cards Playbook structure,
> this document focuses on provenance traceability, licensing posture, and regulatory
> alignment. Read alongside the [model card](../reference/model-card.md) and the
> [regulatory posture](../reference/regulatory-posture.md).

## Overview

The published distribution includes two synthetic datasets, both committed as
version-controlled JSONL:

1. **Eval corpus** -- curated multi-turn conversational cases across three locales
   (en, es-419, pt-BR). Cases cover golden, adversarial, and no-match
   categories with gold-label expected behaviour per turn.
2. **Knowledge-base cards** -- short structured cards on medication-adherence content,
   each with provenance metadata (`source_url`, `accessed_at`, `source_license`).

Both datasets are 100% synthetic, carry no PHI or PII, and are redistributable under the
MIT license. The surrounding code is Apache-2.0.

## Data Provenance

### Eval Corpus

| Property | Value |
|----------|-------|
| Format | JSONL (one JSON object per line) |
| Size | 218 cases (100 en, 59 es-419, 59 pt-BR) |
| Generation | LLM persona/script-aligned generation with producer-critic loop |
| Curation | 100% manual review by the author |
| Adversarial seeds | 19 hand-authored English plus adversarial slices in es-419/pt-BR |
| Licence | MIT |

Generation methodology follows a four-stage pipeline: persona creation (five condition
clusters sampled from published epidemiological ranges), dialogue generation with
producer-critic scoring on motivational-interviewing fidelity, scope compliance, and
groundedness, manual curation of every generated turn, and hand-authored adversarial
case injection. Full methodology is documented in the [data statement](../reference/data.md).

### Knowledge-Base Cards

| Property | Value |
|----------|-------|
| Format | JSONL (id, title, text, source_url, source_license, topics, accessed_at) |
| Size | 36 cards |
| Licence | MIT (paraphrased content) |

Each card is a short structured summary paraphrased from public-domain sources:

- **DailyMed** (FDA Structured Product Labeling) -- US Government work, public domain
- **MedlinePlus** (US National Library of Medicine) -- US Government work, public domain
- **WHO Essential Medicines List** -- consulted for medication selection; card content
  is independently paraphrased, never verbatim

A per-source license audit accompanies the synthetic data. Cards without provenance
fail validation at load time.

### Excluded Corpora

The following corpora are explicitly excluded from the distribution in any form:

- MedDialog (academic-use-only licence)
- ChatDoctor / HealthCareMagic-100K (terms-of-service redistribution prohibition)
- MIMIC-IV / MIMIC-IV-Note (PhysioNet DUA forbids redistribution)
- i2b2 / n2c2 (institutional DUA forbids redistribution)
- Asclepius (CC-BY-NC-SA incompatible with permissive redistribution)

## Data Categories

The eval corpus is organised into three categories across all locales:

| Category | Description |
|----------|-------------|
| Golden | In-scope medication-adherence conversations |
| Adversarial | Dosing, diagnosis, prompt-injection, role-coercion attempts |
| No-match | Clinical questions with no KB card match |

The English slice (100 cases) is the largest -- almost twice the size of each
non-English slice; the es-419 and pt-BR slices (59 cases each)
include both golden and adversarial coverage. The knowledge base comprises 36
medication-adherence content cards.

## Source Licensing Summary

| Source | Licence | Usage in Distribution |
|--------|---------|---------------------|
| DailyMed | Public domain (US Gov) | Paraphrased KB card content |
| MedlinePlus | Public domain (US Gov) | Paraphrased KB card content |
| WHO Essential Medicines List | CC-BY-NC-SA | Medication selection reference; content paraphrased independently |
| LLM-generated dialogues | MIT | No copyrighted input; outputs redistributable under MIT |
| Code | Apache-2.0 | Independent from data licence |

## Current State

This reference implementation operates on 100% synthetic data. No real patient data,
no real EHR data, and no identifiable information enters the distribution at any point.
The data-acceptance check in CI rejects any file that has not passed an identifiability
review.

Key data governance controls that exist today:

- **Synthetic-only policy**: enforced by the contribution workflow and documented in
  the [data statement](../reference/data.md)
- **Provenance metadata**: every KB card carries `source_url`, `accessed_at`, and
  `source_license`; the loader rejects cards without provenance
- **Locale parity**: the eval harness holds en, es-419, and pt-BR to identical thresholds
  on every CI run
- **Version control**: data files are committed JSONL, versioned with the code under
  semantic versioning; changes to the eval corpus or KB are change-gated
- **IRB statement**: no human-subject data; IRB approval is not applicable (see the
  data statement IRB section)

Known limitations carried from the [data statement](../reference/data.md):

- Single-domain corpus; coverage is intentionally narrow
- US-English clinical vocabulary bias in synthetic data, partially corrected by the
  producer-critic loop but documented as residual
- KB cards are English; a localised KB is on the roadmap
- Near-miss off-corpus clinical questions are not reliably refused (see the model card
  "Known risks and limitations")

## Production Path

A real deployment handling patient data would need to augment or replace the synthetic
datasets and address the following:

- **Real patient data governance**: IRB approval, informed consent, data processing
  agreements, and jurisdiction-specific health-data regulations (HIPAA, GDPR, Chile
  Ley 19.628, etc.)
- **Clinical knowledge base expansion**: the demo corpus covers five condition
  clusters; a production system would need a clinically validated KB with regular
  clinical review, source verification, and recency checks
- **Data quality monitoring**: automated pipelines for detecting data drift, coverage
  gaps, and label quality degradation in both the eval corpus and KB cards
- **Localised content**: native-language clinical review for each locale, not just
  translation of English-generated content; locale-specific clinical escalation paths
- **Data retention and deletion policies**: the reference implementation has no
  persistent user data; production would need retention schedules, deletion procedures,
  and data-subject access request handling
- **Bias audit**: systematic assessment of demographic representation in training and
  evaluation data, beyond the locale-parity checks currently in place

## See Also

- [Data statement](../reference/data.md) -- full dataset card with generation methodology
- [Model card](../reference/model-card.md) -- CHAI Applied Model Card for the agent
- [Regulatory posture](../reference/regulatory-posture.md) -- FDA/WHO/MHRA/EU AI Act boundary
- [HIPAA readiness assessment](hipaa-readiness.md) -- HIPAA-specific governance doc
