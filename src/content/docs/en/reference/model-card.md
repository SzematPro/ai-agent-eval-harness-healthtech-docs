---
title: Model card
description: CHAI Applied Model Card for the medication-adherence conversational agent - uses, warnings, trust ingredients, and key metrics.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Model card - medication-adherence conversational agent

> Structured after the **CHAI Applied Model Card** (Coalition for Health AI),
> draft template **v0.1** (`mc.chai.org/v0.1`, schema repository
> <https://github.com/coalition-for-health-ai/mc-schema>). v0.1 is the current
> published version of the template as of 2026-05-20; the template is a draft
> under public iteration. This card follows the v0.1 section order: header,
> Summary, Uses and Directions, Warnings, Trust Ingredients (AI System Facts
> plus Transparency Information), Key Metrics (the three CHAI principle-area
> columns), and Resources.
>
> The CHAI Applied Model Card was designed for an *applied AI solution* fielded
> inside a health organisation. This artefact is **not** such a solution: it is
> a public reference implementation, never deployed against
> real patients. The card is therefore completed honestly against what the code
> in this project actually does, and every field that does not apply to a
> non-deployed reference implementation says so explicitly rather than being
> left blank or invented. Read it alongside
> [regulatory posture](regulatory-posture.md) and [data](data.md).

---

## Header

| Field | Value |
|---|---|
| **Name** | Medication-adherence conversational agent (`ai-agent-eval-harness-healthtech`) |
| **Developer** | Waldemar Szemat. Public reference implementation; no corporate sponsor, no institutional partner, no external funding. |
| **Inquiries or to report an issue** | <waldemar@szemat.pro>. Security disclosure process in the [security policy](security.md). Issues: the public repository issue tracker. |
| **Release Stage** | Public reference implementation, `v2.1.0`. Not a commercial product, not a released medical device, not in clinical use. |
| **Release Date** | Initial public release 2026-05-14; current release `v2.1.0`. |
| **Global Availability** | Source code public under Apache-2.0. An optional interactive demo runs on Hugging Face Spaces (free tier) when the host's provider keys are configured. No geographic restriction and no marketing in any jurisdiction; it is a code artefact, not an offered service. |
| **Regulatory Approval, if applicable** | None. No FDA clearance, CE marking, MHRA notification, or any other regulatory authorisation has been sought or obtained. None is applicable: this is not a medical device (see Warnings and [regulatory posture](regulatory-posture.md)). |
| **Version** | `v2.1.0`. Versioning is semantic; the agent prompt, the knowledge base, and the eval corpus are versioned together with the code. |

---

## Summary

This is a multi-turn, **medication-adherence support agent** paired with a
CI-gated evaluation harness that grades it on every change. The agent helps a
synthetic patient persona with the *behavioural* side of taking medication as
prescribed: routine-building, reminders, motivational-interviewing-style
reflection on adherence barriers, and locale-aware conversation in English,
Latin-American Spanish (es-419), and Brazilian Portuguese (pt-BR). It does
**not** diagnose, dose, prescribe, or interpret clinical data; it is built to
sit on the general-wellness side of the FDA wellness / clinical-decision-support
boundary by construction.

The agent is a [LangGraph](https://github.com/langchain-ai/langgraph) `StateGraph`
fronted by a FastAPI surface, grounded by retrieval over a small synthetic
knowledge base, wrapped in deterministic guardrails (input validation, PII
redaction, scope classification, red-flag escalation, citation verification,
persona-stability), and instrumented end to end with OpenTelemetry +
OpenInference. Its defining feature is the **eval harness**: a hand-rolled
pytest core that drives the agent against curated golden datasets, dispatches
each turn to a stack of seven scorers (four deterministic, three judge-backed),
and fails the pull request when a safety, citation, or escalation metric
regresses.

The point of the artefact is the methodology - *build the measurement before
the agent, gate every change against it* - demonstrated on a healthcare worked
example. The pattern is industry-agnostic; the healthcare framing was chosen
because that is where the author has field experience.

**Keywords:** medication adherence, conversational agent, multi-turn,
LangGraph, retrieval-augmented generation, guardrails, LLM evaluation harness,
human-in-the-loop, general wellness, synthetic data, reference implementation.

---

## Uses and Directions

### Intended use and workflow

The agent is a **didactic and reference implementation** of a
patient-facing medication-adherence wellness coach and the eval harness that
governs it. Its intended use is to be read, run, forked, and extended by
engineers and AI peers studying how a multi-turn conversational health agent is
measured before it ships.

Within that frame, the agent's own conversational workflow is: a user turn
enters over `POST /chat`; a six-node LangGraph pipeline runs `intake` →
`guardrail_pre` → (conditional) `retrieve_context` → `generate_response` →
`guardrail_post` → `closing`; the response is returned with its citations and
its full guardrail-decision trace. The agent is built to **inform a patient's
own adherence behaviour**, never to inform, augment, or replace a clinician's
management decision.

Human oversight: an **optional** human-in-the-loop review step is available.
When enabled, a seventh node, `review_response`, is inserted between
`generate_response` and `guardrail_post`; it uses a LangGraph interrupt to
pause a high-risk-but-not-acute draft for a human reviewer to approve, edit, or
reject before the turn completes. This is a real graph pause, not a simulated
one. It is off by default, so the eval harness and the standard six-node graph
run with no pause behaviour. See the HITL note under *Known risks and
limitations*.

### Primary intended users

- **Engineers and AI practitioners** evaluating the architecture, the eval
  harness, and the guardrail design - the primary audience.
- **Technical and governance reviewers** assessing engineering and
  regulatory-posture rigour from the project.
- The agent's *in-fiction* end user is a **synthetic adult patient persona**
  managing a chronic medication regimen (hypertension, type-2 diabetes, HIV,
  warfarin anticoagulation, or asthma). No real patient is a user of this
  system; there is no real-world inclusion or exclusion criterion because there
  are no real-world users.

Prior knowledge expected of a real user, were this productised: it is a
consumer-facing wellness conversation and would require no clinical training to
read - which is exactly why the regulatory posture forbids it from ever
crossing into clinical advice.

### How to use

Clone the repository and run the project's check target (lint, type-check, the
full non-slow test suite), the eval targets (the eval harness), and, with a free
Groq API key, a live `POST /chat` turn. The optional interactive demo is a
hand-rolled single-page web app served from the same FastAPI process; it
carries a live Agent Execution Graph that visualizes the agent's LangGraph
run as each turn streams.

### Targeted patient population

Not applicable in the real-world sense. The agent is exercised exclusively
against **synthetic patient personas**, LLM-generated across five condition
clusters (hypertension, type-2 diabetes mellitus, HIV as the long-term-adherence
anchor, warfarin as the narrow-therapeutic-index anchor, asthma as the
PRN-vs-scheduled anchor). No persona corresponds to a real individual; see
[data](data.md).

### Cautioned out-of-scope settings and use cases

This artefact must **not** be used for any of the following. The list is the
canonical out-of-scope statement; it is enforced by the scope classifier, the
refusal templates, and the eval harness, and it is the same boundary
[regulatory posture](regulatory-posture.md) records in full.

- **Real clinical use of any kind.** Do not deploy this agent to speak to real
  patients or clinicians. It is not validated, not cleared, and not a product.
- **Diagnosis.** The agent never names, infers, or rules in/out a medical
  condition.
- **Dosing advice.** The agent never tells a user to take more, take less,
  double up after a missed dose, split, skip, or change a dosing schedule.
- **Prescription change.** The agent never advises starting, stopping,
  switching, substituting, or pausing a medication.
- **Interpretation of labs, imaging, or device readings.** The agent does not
  read a numerical clinical value back as interpretation.
- **Clinician-facing use.** The agent produces no HCP-facing summaries or
  clinical notes; it is patient-facing by design.
- **Emergency triage or emergency-services replacement.** On an acute red flag
  the agent surfaces emergency-services guidance and disengages; it is not a
  triage tool.
- **Training a production model on its outputs**, or using its synthetic data
  as a substitute for IRB-approved human-subject research.

A request that falls into a guardrail out-of-scope category (dosing,
diagnosis, interpretation, PII exfiltration, system-prompt extraction,
role-play override) is **refused** with a templated, locale-aware response. A
clinical question for which retrieval returns no knowledge-base card is
**refused on no-match**. See the limitation on near-miss off-corpus questions
under *Known risks and limitations*.

---

## Warnings

### Known risks and limitations

- **Not a medical device.** This software does not diagnose, prescribe, change
  doses, interpret labs or imaging, or interact with clinicians. No regulatory
  clearance has been sought or obtained. It is a reference implementation
  maintained for didactic and demonstration purposes.
- **Not clinically validated.** The eval harness measures groundedness, safety,
  citation correctness, escalation correctness, and refusal balance against
  *synthetic* golden labels. That is software testing, not a clinical trial,
  not a usability study, and not a substitute for either.
- **100% synthetic data; small single-domain knowledge base.** The knowledge
  base is **36** synthetic cards, all on medication adherence, paraphrased from
  DailyMed, MedlinePlus, and the WHO Essential Medicines List. It is a demo
  corpus, not a clinical knowledge base.
- **Near-miss off-corpus clinical questions are not refused.** This is the most
  important honest limitation. The agent reliably refuses on two paths: a
  *zero-hit* retrieval (the store returns nothing) and an out-of-scope
  *guardrail category*. It does **not** reliably refuse a clinical question
  that is off-corpus but semantically adjacent to the cards - for example an
  adherence question about a condition with no card. Such a question is
  answered against the closest-matching card instead. This was established
  empirically: because all the cards are medication-adherence content, an
  off-corpus adherence question is genuinely close to them in embedding
  space, and no similarity threshold separates off-corpus questions from
  genuine in-corpus cases without false-refusing the latter. The behaviour was re-measured across four embedder
  configurations under both L2 and cosine distance; every configuration leaves
  a negative separation gap. A retrieval similarity threshold
  (`retrieval_min_similarity`) ships **configurable but disabled by default**
  so a broader, more topically diverse corpus can enable it later; on the
  current small single-domain corpus it cannot be used. The cause is intrinsic
  to a small single-domain corpus, not to the embedder or the agent.
- **Generative-model behaviour is probabilistic.** The agent's answers are
  produced by a large language model. Deterministic guardrails bound the
  *safety-critical* surface (acute escalation, the enumerated refusal
  categories, citation verification), but the free-text content of an in-scope
  answer is the model's and can vary, be incomplete, or be wrong on detail. The
  deterministic CI gate proves the guardrails fire; it does not prove every
  generated sentence is correct.
- **HITL durability limitation.** When the optional human-in-the-loop review is
  enabled, the paused thread is held by a checkpointer. The demo configuration
  uses an **in-memory checkpointer**, so a paused thread does **not survive a
  process restart** - a restart loses any review awaiting sign-off. A durable
  Postgres-backed checkpointer is available and is selected automatically
  when a Postgres connection string is configured; durable deployments should
  use it.
- **Red-flag escalation is deterministic and rule-based, by design.** Acute red
  flags (suicidal ideation, anaphylaxis, acute cardiac chest pain, severe
  bleeding, severe asthma, stroke/FAST signs, hypertensive emergency) are
  detected by a versioned regex list that runs before the scope classifier and
  short-circuits the turn to an emergency template. Detection is intentionally
  **negation-blind**: per the design rationale a missed red flag costs far more
  than a benign over-escalation, so escalating on "no chest pain" is accepted.
  Sub-acute symptoms that are not on the acute list are deliberately left to
  the model and are a known live-run failure mode (see *Key Metrics*).
- **Demo-environment limits.** The optional Hugging Face Space runs on free-tier
  CPU: roughly 30-second cold start after idle, 2-5 seconds per turn, and a
  free-tier provider rate limit (~30 requests/minute) under which a burst of
  visitors will see HTTP 429s. A short-TTL response cache and a per-session
  rate limiter mitigate this; they are off by default so the test suite stays
  deterministic.

### Known biases or ethical considerations

- **US-English clinical-vocabulary bias in the synthetic data.** Personas and
  dialogues are LLM-generated and carry a known bias toward US-English clinical
  framing. The es-419 and pt-BR eval slices are held to the *same* thresholds
  as English, and a producer-critic generation loop partially corrects the
  bias, but residual locale bias is acknowledged in [data](data.md).
- **Knowledge-base cards are English.** The agent and the eval harness
  are locale-aware end to end, but the KB cards themselves are English. A
  localised KB pass is roadmap, not shipped.
- **Synthetic personas may not represent real adherence patterns.** Adherence
  distributions are sampled from published epidemiological ranges to avoid the
  over-adherence artefact of off-the-shelf synthetic-patient generators, but
  synthetic data cannot fully represent the diversity of a real patient
  population. The artefact is explicit that it is not built on, and not
  validated against, real patient data.
- **Motivational-interviewing fidelity is a subjective rubric.** MI fidelity is
  scored against a MITI-derived rubric; human MI raters disagree at known
  rates, so MI-fidelity is reported but is not a sole PR-gating metric.
- **Autonomy and oversight.** The design deliberately keeps the routing
  decision on acute red flags with a deterministic rule and a human operator,
  not the model, and refuses rather than guesses outside its lane - choices
  made to protect patient autonomy and keep a human accountable for
  high-stakes outcomes.

### Clinical risk level

**Not applicable - this is not a medical device and carries no clinical risk
classification.** Were the *same architecture* taken toward a real
patient-facing deployment, it would be assessed as a general-wellness tool
deliberately constructed to stay outside the medical-device definition (no
diagnosis, no dosing, no prescription change, no clinical-data interpretation,
patient-facing only). Such a deployment would still require an independent
regulatory review in its jurisdiction before any real use; this card does not
substitute for one.

---

## Trust Ingredients

### AI System Facts

- **Outcome(s) and output(s).** The output is a **multi-turn conversational
  text response** to a patient turn, in the requested locale, accompanied by a
  structured trace: the `[cite:CARD_ID]` citations extracted from the answer,
  the per-guardrail pass/fail decisions, and per-turn token/latency/cost
  accounting. It is not a prediction, classification, score, or
  recommendation in the clinical sense; clinically it is constrained to
  wellness conversation, refusal, or emergency escalation.
- **Model type.** A **generative** system: an orchestrated large-language-model
  agent. A LangGraph `StateGraph` orchestrates a single conversational agent
  over six nodes (`intake`, `guardrail_pre`, conditional `retrieve_context`,
  `generate_response`, `guardrail_post`, `closing`), plus the optional seventh
  `review_response` human-in-the-loop node. Conversation state is
  Pydantic-typed. The system integrates a vector store (Chroma, in-process)
  and the deterministic guardrail modules; it does not integrate an EHR or any
  medical device.
- **Foundation models used in the application.** The completion LLM is
  **configurable** behind a thin client Protocol, selected by the
  `LLM_PROVIDER` environment variable. The shipped default demo path is
  **Groq** serving `llama-3.3-70b-versatile`; **Cerebras** (`gpt-oss-120b` by
  default) is the configured fallback and the eval-judge provider. OpenAI and
  Anthropic adapters are also provided and user-pluggable. The cascading
  fallback retries a Groq rate-limit or transport failure on Cerebras, then on
  Anthropic. Specific model identifiers are configuration, not hard-coded, and
  are expected to be updated as providers iterate.
- **Input data source.** At run time the input is the **user's conversational
  turn(s)** sent to `POST /chat`. The agent's grounding source is the synthetic
  knowledge base. The system ingests no real patient data and no EHR.
- **Output/Input data type.** Free-text conversational messages (input and
  output), in English, es-419, or pt-BR. All data the system is built and
  evaluated on is **synthetic**, not real-world. The agent does **not** take,
  and is never trained on, the following as input features: race, ethnicity,
  language beyond the three UI locales, sexual orientation, gender identity,
  sex, date of birth, social determinants of health, or health-status
  assessments. There is therefore no demographic input feature set and no
  demographic representativeness claim to make - by deliberate design, the
  agent reasons only over the conversational turn and the retrieved card text.
- **Development data characterization.** The system is **not trained or
  fine-tuned** in this repository; it uses pre-trained foundation models as a
  service behind the client Protocol. There is consequently no training
  dataset and no training/test split to characterise for the agent itself. The
  two synthetic datasets that *are* shipped are an **evaluation corpus** and the
  **knowledge base**:
  - *Evaluation corpus* - **218 curated multi-turn cases**: 100 English
    (spanning golden, adversarial, and no-match categories), 59 es-419, 59
    pt-BR. LLM-generated from synthetic personas with a producer-critic loop,
    then 100% manually curated, then augmented with hand-authored adversarial
    seeds. Full methodology in [data](data.md).
  - *Knowledge base* - 36 synthetic cards paraphrased from DailyMed (FDA
    Structured Product Labeling, public domain), MedlinePlus (US NLM, public
    domain), and the WHO Essential Medicines List (paraphrased only). Each card
    carries `source_url`, `accessed_at`, and a provenance note.
  - *Retrieval embeddings* - the knowledge base is embedded with
    **`BAAI/bge-small-en-v1.5`** (384-dimensional, BGE family). Retrieval is
    asymmetric and instruction-aware: a query is prefixed with the BGE
    retrieval instruction and every vector is L2-normalised. A Voyage AI cloud
    embedder is the configurable alternative.
- **Bias mitigation approaches.** A producer-critic generation loop scores each
  synthetic turn on MI fidelity, scope-compliance, and groundedness and
  regenerates turns below threshold; the generator and critic are different
  model versions. The es-419 and pt-BR eval slices are held to the same
  thresholds as English (locale-parity scoring). 100% of generated turns are
  manually curated, including for accidentally-identifying detail and locale
  parity. Adherence distributions are sampled from published epidemiological
  ranges to counter the over-adherence artefact. The residual US-English
  vocabulary bias is documented rather than claimed solved. Because the agent
  takes no demographic input feature, the principal model-bias surface is the
  synthetic data itself, which is what these measures target.
- **Ongoing Maintenance.** The repository is the maintenance surface; there is
  no fielded deployment to monitor.
  - *Monitoring validity* - every change is gated by the eval harness on every
    pull request: a regression on citation, refusal, or escalation correctness
    fails the build. A nightly Promptfoo red-team workflow exercises the OWASP
    LLM Top 10 plus 13 hand-crafted adversarial cases.
  - *Monitoring fairness* - the three locale slices are scored under identical
    thresholds on every run, so a locale regression is a build failure.
  - *Update process* - the agent prompt, the knowledge base, and the eval
    corpus are versioned together with the code under semantic versioning. A
    change to the regulatory posture, the refusal set, or the escalation
    criteria requires an Architecture Decision Record and is recorded in the
    release notes.
  - *Risk correction* - a discovered red-team pattern is folded back into the
    adversarial seed bank; a discovered defect opens a tracked issue.
  - *Monitoring tools* - OpenTelemetry + OpenInference spans on every node,
    LLM call, and embedding call; per-turn token/latency/cost accounting; a
    strict, PR-blocking cost gate. Optional sinks: Langfuse Cloud and a
    self-hosted Phoenix.
  - *Anticipated improvements* - a localised knowledge-base pass and a broader,
    more topically diverse corpus that would let the retrieval similarity
    threshold be enabled.
- **Security and compliance environment practices.** No formal security
  accreditation (no SOC 2, ISO 27001, FedRAMP) - it is an open-source reference
  implementation, not a hosted service. Practised controls: dependencies pinned
  via the lockfile; Dependabot and secret-scanning enabled in CI; no secrets in
  the repository; a privacy invariant that the **user's message text is never
  written to a span, log, or trace attribute**, enforced by a dedicated unit
  test; PII redaction before any text reaches the LLM; a published security
  disclosure process in the [security policy](security.md). The design is mapped
  to FDA 2026 General-Wellness / Clinical-Decision-Support guidance, the WHO
  2024 guidance on large multi-modal models, MHRA Good Machine Learning
  Practice, and the EU AI Act model-governance articles in
  [regulatory posture](regulatory-posture.md).
- **Transparency, Intelligibility, and Accountability mechanisms.** Every
  `POST /chat` response carries its complete **guardrail-decision trace** and
  its **citation set**, in the same schema the eval harness scores against, so
  a reader can see exactly why the agent answered, refused, or escalated. The
  interactive demo renders that trace live in a backend-trace panel. Every
  in-scope clinical assertion must cite a knowledge-base card; an
  unverified-citation or missing-citation decision is surfaced. The optional
  human-in-the-loop step puts a person in the accountability path for
  high-risk drafts. Architecture Decision Records document the substantive
  design choices. Every demo response carries the inline disclaimer "This is a
  demonstration. Not medical advice.", checked by the eval harness as a safety
  invariant.

### Transparency Information

- **Funding source of the technical implementation.** None. The repository was
  authored by Waldemar Szemat with no external funding, no corporate sponsor,
  and no institutional partner.
- **3rd Party Information.** The system depends on third-party LLM and embedding
  providers, all reached over their public APIs and all selected by
  configuration: Groq, Cerebras, OpenAI, Anthropic (completion), and Voyage AI
  (embeddings); a baked-in `sentence-transformers` BGE model provides a
  zero-network embedding fallback. Key open-source components: LangGraph
  (orchestration), FastAPI (HTTP surface), Chroma (vector store), OpenTelemetry
  and OpenInference (tracing), DeepEval and a hand-rolled scorer core
  (evaluation), Promptfoo (red-team). Optional observability sinks: Langfuse
  Cloud, Arize Phoenix. No third party is integrated into a clinical decision.
- **Stakeholders consulted during design of the intervention.** As a
  single-author reference implementation, no external patients, providers, or
  advocacy groups were formally consulted. The design draws on the author's
  prior field experience leading engineering on a LATAM digital-health
  medication-adherence product, and on the published guidance documents
  enumerated in [regulatory posture](regulatory-posture.md). This is
  stated plainly because the CHAI card asks for it and the honest answer is
  "none, by the nature of the artefact".

---

## Key Metrics

> The CHAI Applied Model Card asks for metrics under three principle areas. The
> primary, reproducible, CI-enforced measurement of this project is the
> **deterministic eval gate**: it runs the real agent graph against the
> synthetic corpus with a stub LLM client (key-free, judge disabled), so
> the result is fully reproducible and isolates *guardrail* behaviour from
> model variability. The numbers below are that deterministic run. Metrics that
> depend on a live model (groundedness, faithfulness, hallucination, and live
> pass rates) are **not hard-coded here**: they are refreshed separately,
> because a live model's behaviour changes between runs and a model card must
> not freeze a number it cannot reproduce on demand.

### Usefulness, Usability, and Efficacy

- **Goal of metric(s).** Demonstrate that the agent grounds every clinical
  assertion in a verified knowledge-base card, and that a turn completes well
  within the per-turn cost and latency budget so the system is operable at
  $0/month on free-tier infrastructure.
- **Result.**
  - `citation_correctness` = **1.000** (no turn cited an unknown KB card id).
  - `citation_coverage` = **0.225** aggregate.
  - Cost / latency gate: **PASS**, strict mode, against the documented per-turn
    budgets (4,000 tokens in / 1,000 tokens out / 8,000 ms).
  - Live-model usability figures (per-turn tokens and latency on the Groq free
    tier) are refreshed separately.
- **Interpretation.** `citation_correctness = 1.000` means the citation
  guardrail never let a fabricated card id through on the corpus. The low
  `citation_coverage` is **expected and not a defect of the agent**: the
  deterministic stub LLM client emits no citation markers by design, so on the
  golden cases coverage reads 0.00 and only the no-match / adversarial cases
  that should carry no citation score 1.00. Real citation coverage is a
  live-model property and is measured in the live run. Coverage is reported but
  is not a PR-gating dimension.
- **Test Type.** *Internal*, reproducible, deterministic. The agent runs end to
  end with a stub LLM client and no API keys; results are identical across runs
  on the same code.
- **Testing Data Description.** The 218-case synthetic corpus: 100 English
  (spanning golden, adversarial, and no-match categories), 59 es-419, 59 pt-BR.
  Fully synthetic; see [data](data.md).
- **Validation Process and Justification.** Run by the eval target and by the
  CI eval workflow on every pull request. It is a software-engineering
  validation of guardrail and pipeline behaviour, **not** a clinical validation
  - the agent has not been, and makes no claim to have been, clinically
  validated.

### Fairness and Equity

- **Goal of metric(s).** Demonstrate that the agent's safety behaviour does not
  degrade across the three supported locales - that an es-419 or pt-BR user is
  held to the same safety bar as an English user.
- **Result.** All **218** corpus cases pass the deterministic gate, including
  all 59 es-419 and all 59 pt-BR cases; `refusal_correctness` = **1.000** and
  `escalation_correctness` = **1.000** across every locale slice. The gate
  applies one identical threshold set to all three locales.
- **Interpretation.** On the deterministic corpus there is **no locale gap** in
  safety behaviour: refusal and escalation correctness are uniform across en,
  es-419, and pt-BR. The honest caveat is that a live model can behave
  differently per locale - prior live runs surfaced es-419 adversarial misses
  that the deterministic guardrails do not - and that the underlying
  synthetic data carries a known US-English vocabulary bias (see *Known biases*).
  This metric concerns *locale* parity; the agent takes no race, sex, age, or
  other demographic input, so no demographic-subgroup performance breakdown is
  applicable.
- **Test Type.** *Internal*, deterministic, locale-stratified.
- **Testing Data Description.** The 59 es-419 and 59 pt-BR slices of the corpus,
  curated to the same bar as the English cases, scored against the same
  thresholds.
- **Validation Process and Justification.** Locale slices run on every pull
  request alongside English; a locale-specific regression fails the build.
  Justification: locale parity is a stated design property, so it is enforced
  rather than asserted.

### Safety and Reliability

- **Goal of metric(s).** Demonstrate that the agent (a) deterministically
  refuses the enumerated out-of-scope categories, (b) deterministically
  escalates acute red-flag turns to an emergency template, and (c) does both
  reproducibly, before any LLM is involved.
- **Result.**
  - `refusal_correctness` = **1.000** (every `must_refuse` case was refused;
    refusal-vs-over-refusal scored on two axes).
  - `escalation_correctness` = **1.000** (every `must_escalate` case surfaced an
    escalation template).
  - **Overall deterministic gate: PASS**, judge disabled.
  - In the offline red-team gate, all **13** hand-crafted adversarial cases are
    refused deterministically because the guardrail layer fires before the LLM
    node is reached.
  - Live-model safety behaviour (a lower, honest pass rate that surfaces the
    model's own sub-acute escalation and adversarial misses) and the live
    red-team measurement are refreshed separately with full provenance.
- **Interpretation.** The deterministic gate proves the *guardrail layer* is
  correct and reproducible: the acute-escalation regex list and the refusal
  categories fire as specified, key-free, on every run. It deliberately does
  **not** prove the agent is "jailbreak-proof" or robust to arbitrary prompt
  injection - that is a separate, live-run measurement. Two limitations bound
  this result honestly: (1) sub-acute symptoms not on the acute red-flag list
  are left to the model and are a known live-run failure mode; (2) a near-miss
  off-corpus clinical question is answered against the closest card rather than
  refused (see *Known risks and limitations*).
- **Test Type.** *Internal*, deterministic. The real agent graph runs with a
  stub LLM client; the safety guardrails are exercised exactly as in
  production because they run as graph nodes before generation.
- **Testing Data Description.** The 19 English adversarial and 5 no-match cases,
  the adversarial slices of es-419 and pt-BR, and the must-escalate cases across
  the corpus, plus the 13 hand-crafted red-team cases.
- **Validation Process and Justification.** The deterministic eval gate and the
  offline red-team gate run on every pull request; the live red-team runs
  nightly. A safety regression fails the build. Justification: the safety
  surface is the highest-consequence behaviour of a health agent, so it is
  pinned to deterministic, key-free, reproducible checks rather than to a
  model's good behaviour on the day.

---

## Resources

- **Evaluation References.** The eval harness, its scorers, and the gate logic
  are part of the published source; the latest deterministic report is
  generated by the eval target and reproducible on a clean clone. Live-run
  results are refreshed separately.
- **Clinical Trial.** None. No clinical trial has been conducted; none is
  applicable to a non-deployed reference implementation.
- **Peer Reviewed Publication(s).** None. This is an open-source reference
  artefact, not a research publication.
- **Reimbursement status.** Not applicable. The artefact is not a billable
  product or service.
- **Patient consent or disclosure required or suggested.** No patient consent
  is applicable because the system has no real patients and no real patient
  data; the dataset is fully synthetic and carries no PHI or PII (see the IRB
  statement in [data](data.md)). Disclosure *is* built in regardless:
  every demo response carries a persistent banner and an inline footer stating
  that it is a demonstration, uses synthetic data, is not a medical device, and
  that medical questions go to the user's clinician. Were the architecture ever
  productised for real users, explicit user disclosure and consent appropriate
  to the jurisdiction would be required.
- **Stakeholders consulted during design of the solution.** None formally
  consulted; see *Transparency Information* above. The design rests on the
  author's prior field experience and on published regulatory and ethics
  guidance.

### See also

- [regulatory posture](regulatory-posture.md) - the FDA / WHO / MHRA
  / EU AI Act boundary the design respects, and the canonical out-of-scope list.
- [data](data.md) - the synthetic dataset card (Google Data Cards
  Playbook format), generation methodology, license posture, IRB statement.
- [security policy](security.md) - security disclosure process.
- CHAI Applied Model Card (template followed by this document):
  <https://www.chai.org/workgroup/applied-model> and
  <https://github.com/coalition-for-health-ai/mc-schema>.
