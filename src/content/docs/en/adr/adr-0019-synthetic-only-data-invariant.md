---
title: "ADR-0019: Synthetic-Only Data Invariant"
description: Why the evaluation corpus is 100% synthetic from public-domain sources, with an explicit exclusion list and a PR-time burden of proof.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# ADR-0019: Synthetic-Only Data Invariant + Exclusion List

- Status: Accepted
- Date: 2026-05-27 (retroactive — invariant since v0.4.0)
- Decision-makers: Waldemar Szemat

## Context and Problem Statement

The eval harness must be reproducible by anyone who forks the repo.
A reviewer who needs to sign a Data Use Agreement (DUA) before running
`make eval` would face a real friction barrier — and the demo's whole
pitch ("CI-gated, reproducible eval") would be undermined.

Many medical conversational-AI datasets are DUA-restricted (MIMIC,
ChatDoctor, MedDialog, n2c2 / i2b2). Mixing any of them into the eval
corpus would propagate the licensing requirement to every fork.

Synthetic-only also forecloses the PHI-ingress vector by construction:
if no real patient data enters the eval set, no PHI can leak through
the eval set.

How do we keep the eval corpus open and reproducible while ensuring
the project never accidentally ingests a restricted dataset, and how
do we make the policy verifiable by a casual reader in 30 seconds?

## Decision Drivers

- **Reproducibility**: every reviewer can `make eval` without
  licensing friction.
- **Privacy by construction**: no PHI in the corpus means no PHI
  through the corpus.
- **License auditability**: every KB card and every eval case carries
  source attribution and a permissive license tag (CC0 or public
  domain).
- **Verifiability**: a 30-second scan of the policy must convince a
  reviewer the constraint is real and enforced.

## Considered Options

- **Option A**: Mix real and synthetic data; reproducible eval gated
  on per-user DUA acceptance.
- **Option B**: Synthetic-only with sources from public-domain
  government / NGO sources (MedlinePlus, DailyMed, WHO EML, FDA
  labels).
- **Option C**: Synthetic-only with paraphrased-from-licensed
  sources (e.g., licensed clinical guidelines paraphrased into
  synthetic patient turns).

## Decision Outcome

Chosen option: **Option B** — synthetic-only with public-domain
sources, an explicit exclusion list of DUA-restricted datasets, and a
PR-time burden of proof for any new dataset proposal.

The exclusion list (stated in the project's security policy):

- **MIMIC** (MIT Critical Care DB) — DUA via PhysioNet
- **ChatDoctor** — non-commercial license, US-trained doctor dialogues
- **MedDialog** — non-commercial license
- **n2c2 / i2b2** — DUA via Harvard
- Any other DUA-gated medical dataset

The PR burden of proof for any proposed new data source:

1. License text quoted in the PR description, link to authoritative
   source.
2. Provenance chain (who originally produced it, when, what edits
   the repo applied).
3. Explicit compatibility assertion against Apache 2.0 (the project's
   license posture per [ADR-0008](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0008-licensing/)).
4. The maintainer reviews the three items above before the PR is
   merged.

All KB cards and eval cases ship with source attribution and a
permissive license tag in their metadata, so anyone scanning the
synthetic corpus can verify the policy directly.

### Confirmation

- The security policy states the exclusion list and policy statement.
- The synthetic dataset directory carries a per-source license audit.
- The published [data statement](/ai-agent-eval-harness-healthtech-docs/en/reference/data/) is the dataset
  card with provenance per card.
- The governance [data card](/ai-agent-eval-harness-healthtech-docs/en/governance/data-card/) is the
  governance-facing view of the same.
- Pre-merge: the PR review checklist includes the burden-of-proof gate
  for any new data file.

## Consequences

### Positive

- Eval is reproducible end-to-end without licensing friction. Any
  fork's CI runs `make eval` against the committed corpus.
- PHI ingress is foreclosed by construction — there is no upstream
  path.
- The "100% synthetic, zero PHI" claim is backed by code (committed
  corpus) and process (PR burden of proof).
- License audit is a 30-second scan of the README, the data statement,
  and the exclusion list.

### Negative

- The corpus is smaller than mixing in MIMIC would yield. The
  resulting eval surface is narrower; a production agent would need
  additional licensed evals for true coverage.
- The synthetic-only constraint forecloses the use of real-world
  drift signals (no MIMIC-style deviation telemetry). The [drift
  detection plan](/ai-agent-eval-harness-healthtech-docs/en/governance/drift-detection-plan/) is honest
  about this gap.
- A contributor who wants to add a useful licensed dataset has to do
  the work of either (a) finding a public-domain alternative, or
  (b) producing a synthetic-only paraphrase, or (c) not contributing
  the data. Option (c) is acceptable for this project's stage.

### Neutral

- The exclusion list is a maintenance surface: when a new
  DUA-restricted medical dataset becomes well-known, it should be
  added to the list explicitly even though the burden-of-proof gate
  would catch it anyway. Explicit naming makes the policy faster to
  verify.

## Pros and Cons of the Options

### Option A: Mix real + synthetic + per-user DUA

- Good, because larger corpus.
- Bad, because every fork must accept the DUA — friction killer for
  open reviews.
- Bad, because PHI ingress path opens; need new controls to close it.
- Bad, because the "reproducible without licensing friction" claim
  is no longer true.

### Option B (chosen): Synthetic-only, public-domain sources

- Good, because reproducibility-first.
- Good, because PHI foreclosed by construction.
- Good, because the audit is fast — exclusion list + per-card
  license tag.
- Bad, because corpus is bounded by what public-domain sources cover.

### Option C: Synthetic-only, paraphrased-from-licensed

- Good, because broader semantic coverage.
- Bad, because the license picture of a paraphrase is murky — the
  original license may still attach. Risk of accidental
  derivative-work claim.
- Bad, because the audit is slower (every card needs a paraphrase-
  source chain, not just an attribution).

## More Information

- [Data statement](/ai-agent-eval-harness-healthtech-docs/en/reference/data/) — dataset card
- [Data card](/ai-agent-eval-harness-healthtech-docs/en/governance/data-card/) — governance-facing dataset card
- [ADR-0004](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0004-rag-stack/) — RAG stack (the consumer of
  the synthetic corpus)
- [ADR-0008](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0008-licensing/) — project licensing posture
- MADR 4.0.0: <https://adr.github.io/madr/>
