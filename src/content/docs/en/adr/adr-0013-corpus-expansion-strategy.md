---
title: "ADR-0013: Corpus expansion strategy"
description: Why the knowledge base and eval corpora expand by appending synthetic public-domain entries across eight new domains, with locale parity and no schema change.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0013: Corpus expansion strategy

- Status: Accepted
- Date: 2026-05-25
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The knowledge base corpus contains 12 synthetic KB cards across four
condition domains (hypertension, diabetes, heart failure, asthma). The
eval corpus contains 60 English + 10 Spanish (es-419) + 10 Portuguese
(pt-BR) golden cases. Both use JSONL format, documented in the project's
data statement.

The corpus expansion goal asks for at least five new condition domains.
The out-of-domain detection extension (ADR-0012) identifies eight new
domain categories (adherence-general, statin, inhaler, antidepressant,
caregiver, cost-barriers, pill-burden, health-literacy). Each new domain
needs KB cards for RAG retrieval and eval cases for CI-gated scoring.

All new data must be synthetic and public-domain. The existing JSONL
format and eval harness must remain unchanged. Locale parity must be
maintained: each new eval case must exist in all three locales (en,
es-419, pt-BR).

How do we expand the KB and eval corpora across eight new domains while
maintaining format consistency, locale parity, and 100% synthetic
public-domain data?

## Decision Drivers

- **Synthetic-only policy**: all data must be synthetic, no real patient
  data, no proprietary sources.
- **Public-domain sources**: KB card source URLs must point to
  public-domain or freely licensed sources (MedlinePlus, CDC, WHO). The
  source license field must be accurate.
- **Existing JSONL format**: the KB-card and eval-turn formats are locked
  by the RAG pipeline and eval harness. No schema changes.
- **Eval coverage across 3 locales**: every new eval case must exist in
  en, es-419, and pt-BR with equivalent coverage.
- **RAG retrieval quality**: 2-3 KB cards per domain should provide
  sufficient retrieval surface for the expanded topic areas.
- **No modification to existing entries**: existing KB cards and eval
  cases are part of the committed baseline. New data appends only.

## Considered Options

- **Option A: Append to existing JSONL files with 2-3 KB cards per domain
  + 2-3 eval cases per domain per locale**
- **Option B: A new corpus directory with per-domain files**
- **Option C: LLM-generated cards with human review**

## Decision Outcome

Chosen option: **Option A**, because it maintains format consistency with
the existing corpus, requires no changes to the RAG pipeline or eval
harness, and aligns with the documented data methodology.

Eight new domains will be added with 2-3 KB cards each (approximately
18-24 new cards total):

| Domain | Description | Example Topics |
|--------|-------------|----------------|
| adherence-general | General medication adherence patterns | Routine building, reminder strategies, habit formation |
| statin | Statin medication adherence | Cholesterol management, statin side effects, statin persistence |
| inhaler | Inhaler technique and adherence | Controller vs. reliever use, spacer technique, action plans |
| antidepressant | Antidepressant medication adherence | SSRI persistence, discontinuation concerns, stigma barriers |
| caregiver | Caregiver-mediated adherence support | Caregiver communication, shared management, medication reminders |
| cost-barriers | Financial barriers to adherence | Insurance coverage, generic alternatives, copay assistance |
| pill-burden | Polypharmacy and pill fatigue | Simplification strategies, combination therapy, regimen burden |
| health-literacy | Health literacy and adherence | Understanding medication labels, health numeracy, plain language |

For eval cases, 2-3 golden cases per domain per locale will be added:

| Locale | Current | New (approx.) | Total (approx.) |
|--------|---------|---------------|-----------------|
| en | 60 | 16-24 | 76-84 |
| es-419 | 10 | 16-24 | 26-34 |
| pt-BR | 10 | 16-24 | 26-34 |

All new KB cards use public-domain sources (MedlinePlus, CDC, WHO) with
accurate source URL and source license fields. All new eval cases are
synthetic, tagged with the appropriate domain in their metadata, and
designed to test retrieval and citation against the new KB cards.

### Confirmation

- The KB-card corpus grows from 12 to 36 entries.
- The English eval corpus grows by 16-24 entries.
- The Spanish eval corpus grows by 16-24 entries.
- The Portuguese eval corpus grows by 16-24 entries.
- All new entries use the existing JSONL schema (no format changes).
- The data statement's corpus counts are updated to reflect the expansion.
- The RAG pipeline and eval harness read the expanded files without code
  changes.

## Consequences

### Positive

- Broader RAG coverage across eight new medication-adherence domains,
  improving retrieval relevance for free-form input.
- Eval corpus expansion increases CI-gated coverage of the new domain
  areas.
- Format consistency: no changes to the JSONL schema, the RAG pipeline, or
  the eval harness.
- Locale parity maintained: each domain has eval cases in all three
  locales.
- All new data is synthetic and public-domain.

### Negative

- The KB corpus triples in size (12 to 36 cards), which may
  slightly increase Chroma retrieval latency. Acceptable at demo scale.
- Generating 16-24 eval cases per locale is labor-intensive. Quality must
  be verified manually before committing.
- Some new domains (e.g., "adherence-general") overlap conceptually with
  existing cross-domain cards. Deduplication requires careful review.
- The data statement's counts must be updated whenever the corpus changes,
  adding a documentation maintenance step.

### Neutral

- New KB card IDs use domain-specific prefixes (e.g., `card-statin-*`,
  `card-inhaler-*`) for clarity and dedup checking.
- New eval case IDs use domain prefixes (e.g., `golden-statin-*`)
  consistent with existing naming.
- The eval harness already parses JSONL dynamically, so no code changes
  are needed to support the expanded corpus.

## Pros and Cons of the Options

### Option A: Append to existing JSONL files (chosen)

- Good, because no format change means no RAG pipeline or eval harness
  modifications.
- Good, because the existing data methodology and JSONL schema remain
  authoritative.
- Good, because appending is simpler than creating a new directory
  structure.
- Good, because the eval harness already reads the full JSONL file; new
  entries are picked up automatically.
- Bad, because a single large JSONL file is harder to browse than
  per-domain files.
- Bad, because dedup checking requires scanning the full file.

### Option B: A new corpus directory with per-domain files

- Good, because per-domain files are easier to browse and maintain.
- Good, because dedup checking is scoped to the domain file.
- Bad, because it requires changing the RAG pipeline and eval harness to
  read from multiple files.
- Bad, because it introduces a new directory structure not in the data
  methodology.
- Bad, because it breaks the established single-file convention without a
  compelling reason.

### Option C: LLM-generated cards with human review

- Good, because LLM generation accelerates card creation.
- Bad, because LLM-generated medical content requires careful review to
  avoid hallucinated claims.
- Bad, because source URLs and license fields must still be manually
  verified.
- Bad, because it introduces a generation pipeline that does not currently
  exist.
- Bad, because the synthetic data must be demonstrably public-domain,
  which is harder to verify for LLM-generated text.

## More Information

- Out-of-domain detection (companion ADR): [ADR-0012](./adr-0012-free-form-out-of-domain-detection.md)
- RAG stack: [ADR-0004](./adr-0004-rag-stack.md)
- Data policy: a synthetic-only corpus, no datasets restricted by a data
  use agreement.
- MADR 4.0.0: <https://adr.github.io/madr/>
