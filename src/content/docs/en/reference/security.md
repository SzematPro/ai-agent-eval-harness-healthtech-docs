---
title: Security policy
description: Threat model, vulnerability reporting, disclosure timeline, and dependency and secret hygiene for the reference implementation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Security policy

## Threat model

This is a public reference implementation. There is no
production deployment that handles real patient data, no authenticated
user surface, no persistent store of personally identifying information,
and no integration with any external system that holds PHI. The attack
surface is correspondingly small. The two risks that matter, and that
are treated as in-scope for this policy, are credential leakage through
CI logs or PR diffs (API keys for LLM providers, embedding providers,
observability backends) and supply-chain compromise via a malicious or
typosquatted Python dependency reaching the lockfile.

The second-order risks the design explicitly mitigates: the agent never
ingests real patient data even in development (LLM-generated personas
and dialogues only), the live-demo Space does not log conversation content
beyond what Langfuse Cloud's free tier retains for 30 days, every KB
card carries provenance and license metadata, and every clinical
assertion in a model output is required to cite a card from the KB.
Out of scope: vulnerabilities in a downstream fork that introduces a
production deployment, vulnerabilities in third-party LLM provider
infrastructure, and clinical-safety claims about model outputs (the
agent is not a medical device - see
[regulatory posture](regulatory-posture.md)).

## Reporting a vulnerability

Email <waldemar@szemat.pro> with `[SECURITY]` in the subject. Please
include a description, reproduction steps, the affected commit SHA or
release tag, and your suggested severity. Acknowledgement within 72
hours; triage and remediation timeline in the first reply. Do not open
a public issue for an unfixed vulnerability.

PGP key is available on request; if you need one for first contact, ask
in the first email and it will be sent over a separate channel.

## Disclosure timeline

- **T+0**: report received.
- **T+72h**: acknowledgement and initial triage decision.
- **T+30d** (target): fix available on `main`, advisory drafted.
- **T+90d** (cap): coordinated public disclosure unless mutually
  extended.

Credit is offered for responsible disclosure. The reporter's preferred
attribution (name, handle, "anonymous") is honoured in the advisory and
the release notes.

## No PHI, ever

This is a hard constraint, not an aspiration. The repository must not
contain any protected health information, any personally identifying
information, any data derived from a real patient record, any data
under a Data Use Agreement (PhysioNet DUA, i2b2/n2c2 DUA, equivalent),
and any dataset whose license forbids redistribution
(MedDialog, ChatDoctor / HealthCareMagic-100K, MIMIC-IV, MIMIC-IV-Note,
Asclepius). The dataset card in [data](data.md) carries
the full exclusion list and the rationale.

If a contributor proposes a dataset addition, the burden of proof is on
the PR to demonstrate (a) synthetic provenance, (b) a permissive
redistribution license, and (c) no identifiability risk. PRs that
introduce data without that proof will be closed.

## Dependency and secret hygiene

- **Lockfile as source of truth.** The lockfile is the source of truth.
  The lint job runs a lockfile consistency check and every dependency
  sync runs frozen, so lockfile drift fails CI. The deploy image also
  builds frozen with no re-resolve fallback, failing the image build
  closed on drift.
- **Dependabot** is enabled for `pip` (via the `uv`-managed project
  manifest), `github-actions`, and `docker`. All three ecosystems are
  checked **daily**, with at most five concurrent open PRs per
  ecosystem.
- **Dependency CVE gate.** A dependency-audit CI job exports the locked,
  non-dev runtime set and runs `pip-audit --strict` against it; any
  known vulnerability fails the job. One advisory is excepted with a
  documented justification: **CVE-2026-45829 ("ChromaToast")** is a
  pre-auth RCE in ChromaDB's standalone Python FastAPI server
  (`chroma run`) and a poisoned-collection vector against untrusted
  shared instances. This project embeds ChromaDB in-process over a
  local, self-populated collection and never runs the server or connects
  to a foreign instance, so neither vector applies; no upstream fix
  exists as of 1.5.9. The exception is removed when a patch ships.
- **Secret scanning** is enabled at the repository level (GitHub native)
  and additionally enforced by a `secret-scan` CI job, which runs
  `gitleaks` over the full branch history. PRs that introduce a
  high-confidence secret are blocked at the gate.
- **CI secrets** (provider and observability API keys) are scoped to
  environments, not exposed to forked-PR builds, and rotated on
  suspicion of leak.
- **Action pinning.** Third-party and first-party GitHub Actions in the
  CI, eval, and red-team workflows are pinned to commit SHAs (with the
  human-readable tag in a trailing comment) so a moved tag cannot change
  what runs in a secret-bearing job.
- **Pre-commit hook** runs `gitleaks` locally on staged files; install
  it through the project's pre-commit configuration after the initial
  dependency sync.
- **Frozen dependency pin.** `rank-bm25` is intentionally pinned at its
  final release `0.2.2` (see [ADR-0023](../adr/adr-0023-hybrid-retrieval.md), Decision B) -
  a deliberate end-of-life pin, not stale-by-neglect; the `pip-audit` CI
  job still gates it for advisories.

## Regulatory posture

See [regulatory posture](regulatory-posture.md) for the
FDA wellness/CDS boundary the design respects, the WHO LMM guidance the
project tracks, and the explicit list of things the agent does NOT do.
A vulnerability report that asserts a regulatory-classification failure
should reference that document.

## Contact

<waldemar@szemat.pro>
