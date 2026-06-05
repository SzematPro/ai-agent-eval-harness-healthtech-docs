---
title: Dataset card
description: The synthetic eval corpus and knowledge base - generation methodology, provenance, license posture, exclusion list, and IRB statement.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Dataset card - synthetic eval set and KB

> Structured after the Google Data Cards Playbook
> (<https://sites.research.google/datacardsplaybook/>). The Data Cards
> Playbook's fifteen themes are condensed to the ones that bear on a
> synthetic eval set for a public reference implementation.

## Summary

The distribution includes two synthetic datasets. Both are 100% synthetic
and both are redistributable under the MIT license. The code that
surrounds them is licensed separately under Apache-2.0 (see the
License declaration section); the data license and the code license
are independent.

1. **Eval corpus** - 218 curated multi-turn conversational cases between
   a simulated patient and the agent: 100 English (spanning golden,
   adversarial, no-match, and expanded-domain cases), 59 es-419, and 59 pt-BR.
   Each case is labelled with the eval dimensions it exercises
   (scope-compliance, groundedness, hallucination, escalation, MI
   fidelity, persona stability, empathic tone, locale, latency/cost
   accounting, refusal balance) and the gold-label expected behaviour
   (correct refusal template, correct escalation flag, citation set).
2. **Knowledge-base cards** - 36 short, structured cards on
   medication-adherence content across eight domains: hypertension,
   T2DM, HIV, warfarin, asthma, statins, inhaler technique,
   antidepressant adherence, caregiver support, cost barriers, pill
   burden, health literacy, adherence-barrier patterns, and
   motivational-interviewing talking points. Each card carries
   `source_url`, `accessed_at`, and a provenance/paraphrase note.

Both datasets ship as committed JSONL in the published distribution:
the eval corpus as separate per-locale files and the knowledge base as a
single card file. A per-source license audit accompanies the data.
Early design envelopes ("50-200 turns" and "30-50 cards") were
provisional; the counts above are what the current distribution ships.

## Authorship and funding

Authored by Waldemar Szemat as a public reference implementation.
No external funding. No corporate sponsor. No institutional partner.
The synthetic datasets are published under the MIT license. The
surrounding code is licensed under Apache-2.0 (it was MIT through
v0.6.0 and switched at v1.0.0, see
[ADR-0008](../adr/adr-0008-licensing.md)); the
data-license and code-license decisions are independent.

## Motivation

Existing public medical-dialogue corpora are either license-incompatible
with permissive redistribution (MedDialog, ChatDoctor / HealthCareMagic,
Asclepius), under a Data Use Agreement that forbids redistribution
(MIMIC-IV, MIMIC-IV-Note, i2b2/n2c2), or were collected without
informed consent of the participants for downstream LLM training.
A reference implementation that purports to evaluate a conversational
health agent should not rely on any of those corpora, full stop. The
synthetic eval set is the answer: it can be reproduced, redistributed,
modified, and audited without touching a Data Use Agreement and
without involving a single real patient record.

The motivation is also pedagogical. Engineers and AI peers reading
this project should be able to inspect the eval set in full,
reproduce its generation, and understand what each adversarial seed is
designed to elicit.

## Intended use

Primary intended use: drive the eval harness in this reference
implementation, benchmark configurations of the same agent design, and
provide a public reference against which other multi-turn conversational
health agents can be compared on the ten eval dimensions.

Secondary intended use: a teaching example for the construction of a
synthetic eval set under the Data Cards Playbook framing.

Out-of-scope uses: training a production model intended for real
patient interaction; clinical validation of any clinical claim;
substitution for IRB-approved human-subject research; benchmarking
clinical decision support tools (the dataset is patient-facing, not
clinician-facing, by design - see
[regulatory posture](regulatory-posture.md)).

## Primary data subject

Synthetic personas. There are no human data subjects. Personas are
fully LLM-generated via a persona-and-script-aligned generation step.
No persona corresponds to a real individual.
No PHI is present. No PII is present. No real medical record is
present.

This is a hard policy and is enforced by the dataset-acceptance check:
the contribution workflow rejects any data file that has not passed an
identifiability review.

## Generation methodology

The pipeline runs in four stages.

**Stage 1 - Personas.** An LLM persona-generation step produces
synthetic patient personas across five condition clusters:
hypertension, type-2 diabetes mellitus, HIV (the long-term-adherence
anchor), warfarin (narrow-therapeutic-index anchor), and asthma
(PRN-vs-scheduled anchor). Adherence distributions are sampled from
published epidemiological ranges to avoid the over-adherence artefact
common to off-the-shelf synthetic-patient generators.

**Stage 2 - Dialogue generation.** Each persona is fed into an LLM
generation step that follows the persona/script-aligned pattern
(SynDial-style and Script-Strategy Aligned Generation). A
producer-critic loop scores each generated turn on three axes
(motivational-interviewing fidelity, scope-compliance, groundedness
against the KB); turns below the threshold are regenerated. The
generator and critic are different model versions; the loop is logged
and the logs are committed alongside the resulting JSONL.

**Stage 3 - Curation.** The author manually reviews 100% of the
generated turns. Curation work focuses on (a) realism of the patient
voice, (b) faithfulness to the gold-label expected behaviour, (c)
removal of any accidentally-identifying detail, and (d) locale parity
(es-419 and pt-BR turns held to the same bar as en-US turns).

**Stage 4 - Adversarial cases.** Adversarial cases are hand-authored
and folded into the eval corpus (19 of the English cases are
adversarial, plus adversarial slices in es-419 and pt-BR). They cover:
dosing-advice elicitation, diagnosis fishing, prompt-injection
(system-prompt extraction, role-coercion, jailbreak templates from the
OWASP-LLM Top 10), distress disclosure, adverse-event disclosure, and
MI-fidelity stress (interruption, denial, ambivalence). Each case has
a single load-bearing assertion in the gold label. A separate set of
13 hand-crafted red-team cases ships for the Promptfoo red-team gate.

What the distribution ships from this pipeline is the curated
output: the committed JSONL datasets. The generation tooling itself
(persona configs, dialogue prompt templates, the critic rubric) was the
working apparatus and is not part of the shipped artefact set; the
methodology above is the record of how the corpus was built.

## Corpus expansion

The corpus expansion appended 24 new KB cards and 138 new eval cases
across eight medication-adherence domains, following the append-to-existing
strategy decided in
[ADR-0013](../adr/adr-0013-corpus-expansion-strategy.md).

### New KB card domains (24 cards, 3 per domain)

| Domain | Card IDs |
|--------|----------|
| Statin adherence | `card-statin-myopathy`, `card-statin-memory`, `card-statin-grapefruit` |
| Inhaler technique | `card-inhaler-technique`, `card-inhaler-maintenance`, `card-inhaler-action-plan` |
| Antidepressant adherence | `card-antidepressant-ssri`, `card-antidepressant-discontinuation`, `card-antidepressant-stigma` |
| Caregiver support | `card-caregiver-burnout`, `card-caregiver-communication`, `card-caregiver-resources` |
| Cost barriers | `card-cost-barriers-insurance`, `card-cost-barriers-generic`, `card-cost-barriers-programs` |
| Pill burden | `card-pill-burden-simplification`, `card-pill-burden-polypill`, `card-pill-burden-adherence` |
| Health literacy | `card-health-literacy-numeracy`, `card-health-literacy-communication`, `card-health-literacy-resources` |
| Adherence general | `card-adherence-measurement`, `card-adherence-technology`, `card-adherence-social-support` |

### New eval case counts

| Locale | Before expansion | After expansion | New cases |
|--------|----------------|----------------|-----------|
| en | 60 | 100 | +40 |
| es-419 | 10 | 59 | +49 |
| pt-BR | 10 | 59 | +49 |
| **Total** | **80** | **218** | **+138** |

All new data is 100% synthetic with public-domain sources (US government
publications, WHO EML paraphrased). Card IDs use domain-specific prefixes
for traceability.

## Source provenance for KB cards

The knowledge-base cards are short, structured summaries derived from
three public sources. Verbatim copying is forbidden; paraphrase with
citation is required.

- **DailyMed** - FDA Structured Product Labeling, public domain (US
  Government work). <https://dailymed.nlm.nih.gov/>
- **MedlinePlus** - US National Library of Medicine consumer health
  information, public domain (US Government work).
  <https://medlineplus.gov/>
- **WHO Essential Medicines List** - published under CC-BY-NC-SA;
  the EML is consulted as a reference for medication selection in the
  persona pool, but card content is paraphrased, never copied
  verbatim. The non-commercial clause does not bind the paraphrased
  card content because the card content is independently expressed.
  <https://list.essentialmeds.org/>

Each KB card carries `id`, `title`, `text`, `source_url`,
`source_license`, `topics`, and `accessed_at` (ISO-8601 date). The card
schema is enforced by the loader; cards without provenance fail
validation.

## License declaration

The code license and the data license are separate, independent
declarations.

- **Code: Apache-2.0.** The code was MIT through v0.6.0 and switched
  to Apache-2.0 at v1.0.0; the rationale is in
  [ADR-0008](../adr/adr-0008-licensing.md).
- **Synthetic eval corpus: MIT**, distributed inside the repository.
- **Synthetic KB cards: MIT** for the paraphrased card content;
  attribution to DailyMed / MedlinePlus / WHO EML preserved in the
  card provenance metadata as a courtesy and as a verifiability trail.
- **LLM-generated dialogues: redistributable under MIT** (no input
  copyrighted material was used; outputs are not subject to a model
  provider's training-data restrictions because they do not include
  copyrighted prompts).

## Exclusion list

The following corpora are explicitly excluded from this repository in
any form (raw, derivative, statistical-aggregate, training-signal).
The exclusion is enforced by the data-acceptance check.

- **MedDialog** - academic-use only; the public mirrors do not carry a
  redistribution-friendly license.
- **ChatDoctor / HealthCareMagic-100K** - the source community's terms
  of service forbid redistribution of the scraped corpus.
- **MIMIC-IV** - PhysioNet Credentialed Health Data Use Agreement
  forbids redistribution.
- **MIMIC-IV-Note** - PhysioNet DUA forbids redistribution; identical
  posture to MIMIC-IV.
- **i2b2** and **n2c2** challenge corpora - institutional Data Use
  Agreement forbids redistribution.
- **Asclepius** - CC-BY-NC-SA non-commercial clause is incompatible
  with the repository's permissive-redistribution posture.

Any pull request that introduces a file derived from one of the
excluded corpora will be closed. The acceptance check for new data
files requires either a permissive-license declaration or a synthetic-
provenance statement.

## What ships and how to inspect it

The distribution ships the curated, gold-labelled datasets
themselves as committed, version-controlled JSONL. A reader does not
regenerate them; they are inspectable in full directly in the repository:

- The English eval cases (100 cases spanning golden, adversarial,
  no-match, and expanded-domain categories).
- The es-419 eval cases (59 cases).
- The pt-BR eval cases (59 cases).
- The 36-card knowledge base.
- A per-source license audit and the card-provenance notes.
- The 13 hand-crafted red-team cases driven by the Promptfoo gate.

The eval corpus is consumed by the harness for the English slice and for
all three locales together; each run writes a machine-readable and a
human-readable report. The deterministic CI gate runs key-free against a
stub LLM client, so the gate verdict is reproducible on any clean clone
with no API keys. The generation methodology that produced the corpus is
documented in the *Generation methodology* section above; the shipped
artefact is the curated output, not a regeneration pipeline.

## IRB statement

This dataset contains no human-subject data. Synthetic personas are
LLM-generated through a persona/script-aligned pipeline. No
identifying information is present. No real
patient was contacted, observed, or consented as part of this work.
Institutional Review Board approval is therefore not applicable.

If a downstream user wishes to extend the dataset with human-subject
data, that user is responsible for obtaining the appropriate IRB or
ethics-committee approval in their jurisdiction. The author of this
repository does not extend, vouch for, or supervise any such
extension.

## Open questions and known limitations

- **Coverage.** The 218-case corpus and the 36-card knowledge base are
  small relative to the surface a real conversational health agent
  encounters. The corpus is intentionally narrow: it is an eval set,
  not a training set, and its job is to exercise the ten eval
  dimensions with clear gold labels. A broader, more topically diverse
  corpus is roadmap; it would also let the retrieval similarity
  threshold (`retrieval_min_similarity`, shipped disabled) be enabled -
  see the near-miss off-corpus limitation in
  [model card](model-card.md). The corpus expansion added 24 KB cards
  and 138 eval cases across 8 new domains, documented in
  [ADR-0013](../adr/adr-0013-corpus-expansion-strategy.md).
- **Locale parity.** es-419 and pt-BR are held to the same bar in
  the eval harness, but the underlying persona generation has a known
  bias toward US-English clinical vocabulary. The producer-critic
  loop partially corrects for this; the residual bias is documented
  rather than claimed solved. The 36 KB cards are English; a localised
  KB pass is roadmap.
- **MI-fidelity rubric subjectivity.** Motivational-interviewing
  fidelity is measured against an MITI-derived rubric, but human MI
  raters disagree at known rates. The harness reports inter-rater
  disagreement separately and does not gate PRs on the MI-fidelity
  score alone.
- **KB recency.** Each card's `accessed_at` field freezes the source
  date. Public sources may move underneath the citation over time; the
  card content is independently paraphrased, so a moved source does not
  change what the agent retrieves, but the provenance link can go
  stale. Refreshing card provenance is a maintenance task, not an
  automated gate.
- **Adversarial-seed completeness.** The seed bank is curated, not
  exhaustive. Promptfoo's OWASP-LLM Top 10 generator expands the
  surface nightly, and new patterns are folded back into the seed bank
  on discovery.

## See also

- [model card](model-card.md) - the model card for the agent,
  in CHAI Applied Model Card format.
- [regulatory posture](regulatory-posture.md) - the
  regulatory boundary the data respects.
- [security policy](security.md) - disclosure policy and the
  "no PHI ever" hard constraint.
- Google Data Cards Playbook: <https://sites.research.google/datacardsplaybook/>.
- CHAI Applied Model Card format: <https://www.chai.org/workgroup/applied-model>.
