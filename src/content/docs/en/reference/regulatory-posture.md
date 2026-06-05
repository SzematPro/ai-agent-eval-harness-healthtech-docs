---
title: Regulatory posture
description: The regulatory line the design respects, anchored against FDA, WHO, MHRA, and EU AI Act references, and why this is not a medical device.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Regulatory posture

> This document records the regulatory line the design respects. It is
> the explicit answer to the question "is this thing a medical device?"
> The answer is no. The rest of this document is the work it took to be
> able to say that with a straight face.

## Scope of this document

This is a public reference implementation. It is not a product. It is
not marketed, distributed, or made available to clinicians or patients
for clinical use. The audience is engineers and AI peers reading the
project as a reference artefact. Even with that audience, the design
honours the regulatory boundaries that would apply if the same code
were ever taken to production. The intent is twofold: keep the
reference free of any claim that would re-classify it as a device, and
demonstrate an understanding of the boundary well enough to build
inside it.

The boundary is anchored against four reference documents, summarised
below.

## Reference documents

### FDA - Artificial Intelligence-Enabled Device Software Functions: Lifecycle Management and Marketing Submission Recommendations (Draft, January 2025)

Published 7 January 2025. The draft guidance describes the marketing
submission contents and lifecycle-management practices the FDA expects
for AI-enabled device software functions, including predetermined
change control plans for models that learn over time. It is the
operational sequel to the 2024 final guidance on Predetermined Change
Control Plans. The document does not by itself decide whether a piece
of software is a device - that question is decided under section
520(o) of the FD&C Act and the related CDS / general-wellness guidance
below - but it sets the expectations for any product that crosses into
device territory.

This reference implementation is not a device, so the marketing-submission
contents are not authored. The lifecycle expectations are nonetheless
tracked as design discipline: model + dataset cards, versioning of model
+ KB + prompts together, an eval harness that gates changes, observability
that records production-relevant traces.

URL: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/artificial-intelligence-enabled-device-software-functions-lifecycle-management-and-marketing>

### FDA - Revised Clinical Decision Support Software guidance and revised General Wellness: Policy for Low Risk Devices (January 2026)

Published 6 January 2026. The revised CDS guidance clarifies the four
statutory criteria under section 520(o)(1)(E) of the FD&C Act that
exempt CDS software from being regulated as a device when the software
is intended for a health-care professional, displays the basis for its
recommendation transparently, and gives the HCP an independent means to
review that basis. The revised general-wellness guidance reaffirms that
software intended to maintain or encourage a healthy lifestyle, and
unrelated to the diagnosis, cure, mitigation, prevention, or treatment
of a disease or condition, is not a device. The 2026 revisions
broadened the wellness category to include non-invasive sensing of
physiological parameters when output solely for wellness purposes, and
narrowed the CDS scope around single-recommended-treatment-option tools
and risk-probability outputs.

The agent in this reference implementation is patient-facing, not
clinician-facing. That places it firmly outside the CDS exemption
regardless of the 2026 revisions, because the CDS exemption is
conditioned on HCP-facing-with-independent-review. The agent therefore
must avoid *any* function that would qualify it as a device under 520(o)
on the patient-facing path: no diagnosis, no treatment recommendation,
no prescription change, no labs/imaging interpretation. The agent stays
on the general-wellness side of the line - adherence support, lifestyle
encouragement, MI-style reflection - and refuses anything that would
cross over. Refusal templates and the scope classifier enforce this; the
eval harness measures compliance.

CDS URL: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software>

### WHO - Ethics and governance of artificial intelligence for health: Guidance on large multi-modal models (January 2024)

Published 18 January 2024. The WHO guidance is a forty-recommendation
framework addressed to governments, technology providers, and health
systems. The core themes the design honours: transparency
about model and training-data provenance, accountability for outputs,
avoidance of bias, protection of patient autonomy, and human oversight
on high-stakes decisions. Specific WHO recommendations operationalised
here: model and dataset cards (transparency), citation-on-assertion
(accountability), locale parity in evals (bias avoidance), refusal and
escalation defaults (autonomy protection and human oversight).

URL: <https://www.who.int/publications/i/item/9789240084759>

### MHRA - AI Airlock pilot and Good Machine Learning Practice

The MHRA's AI Airlock pilot ran in the 2024-2025 financial year as a
regulatory sandbox for software-as-a-medical-device with generative AI
or machine-learning components. Five sandbox candidates completed the
full pilot; a sandbox programme report was published in October 2025.
GMLP - Good Machine Learning Practice - is a ten-principle joint
publication from the MHRA, FDA, and Health Canada that frames how
ML-enabled medical devices should be developed, deployed, and
monitored. The 2025 MHRA roadmap commits to a GMLP-aligned guidance
publication. The design tracks the ten GMLP principles as design
discipline: multi-disciplinary expertise, sound engineering practice,
clinically relevant data, training-test independence, focus on the
performance of the human-AI team, testing on representative data,
transparency to users, deployed-model monitoring, periodic re-training,
and informed user community.

URLs:
- AI Airlock programme: <https://www.gov.uk/government/news/ai-airlock-cersis-and-a-new-global-ai-network-for-health-regulators>
- AI Airlock pilot report: <https://assets.publishing.service.gov.uk/media/68ee1fb88427701993d5e02c/AI_Airlock_Sandbox_Programme_Report_Final.pdf>
- GMLP guiding principles (FDA mirror): <https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development-guiding-principles>

### EU AI Act - Regulation (EU) 2024/1689 (in force August 2024, high-risk obligations applicable August 2026)

Published 13 June 2024, entered into force 1 August 2024, with the
prohibited-practices articles applicable from 2 February 2025 and the
bulk of the high-risk-system obligations applicable from 2 August 2026.
The Act classifies AI systems by risk tier. Annex III enumerates the
high-risk use cases that trigger the conformity-assessment,
risk-management, data-governance, technical-documentation,
post-market-monitoring, and human-oversight obligations of Chapter III
Section 2. Three Annex III categories are adjacent to the design space
of this reference implementation and worth naming explicitly:

- Annex III point 5(a) - AI systems intended to be used by public
  authorities to evaluate the eligibility of natural persons for
  essential public services and benefits.
- Annex III point 5(c) - AI systems intended to be used to evaluate
  the creditworthiness of natural persons or establish their credit
  score.
- Annex III point 6(d) - AI systems intended to be used to dispatch,
  or to establish priority in the dispatching of, emergency-service
  first-responders, including by triage.

A patient-facing medication-adherence wellness coach is not, in itself,
an Annex III high-risk system. The agent does not triage emergency
calls, does not allocate public benefits, does not score
creditworthiness. The "Red-flag escalation" branch of the agent
recognises seven acute patterns (suicidal ideation, anaphylaxis, acute
cardiac chest pain, severe bleeding, severe asthma, stroke / FAST
signs, and hypertensive emergency) and surfaces local emergency-services
guidance without acting as a triage tool itself. The escalation logic
is deliberately deterministic and rule-based so that the human
operator, not the model, holds the routing decision.

Where the EU AI Act is most relevant to this reference implementation is
not in the risk-tier classification of the agent itself but in the
*model-governance* posture the harness encodes. Article 9
(risk-management system), Article 10 (data and data governance),
Article 11 + Annex IV (technical documentation), Article 12
(record-keeping), Article 13 (transparency), Article 14 (human
oversight), Article 15 (accuracy / robustness / cybersecurity), and
Article 17 (quality-management system) are the procedural surface a
high-risk Annex III deployer has to satisfy. The harness shipped here
sits in that procedural layer: eval contracts with explicit acceptance
thresholds, data cards naming each source, PR-blocking cost and
citation gates, OpenInference-traced spans for every turn, refusal
templates with human-readable rationale, and the orchestrator's
deterministic escalation router. Adopting these patterns into an
Annex III system inside a regulated organisation accelerates the
Article 9 + 10 + 12 + 14 evidence pack; it does not satisfy those
articles on its own.

For a downstream operator whose own AI system *is* Annex III high-risk
(for example, a public-sector eligibility assistant or a credit-scoring
chatbot), the harness pattern transfers in three concrete ways:
(i) the eval contract gives the risk-management system in Article 9 a
testable artefact; (ii) the citation-required + refusal-on-no-match
contract narrows the surface where Article 15 accuracy / robustness can
fail silently; (iii) the per-span OpenTelemetry trace gives the
record-keeping in Article 12 a wire-format-agnostic, vendor-portable
backbone.

URLs:
- Regulation (EU) 2024/1689 official text: <https://eur-lex.europa.eu/eli/reg/2024/1689/oj>
- Annex III consolidated list: <https://artificialintelligenceact.eu/annex/3/>
- European AI Office: <https://digital-strategy.ec.europa.eu/en/policies/ai-office>

## The wellness / CDS boundary the design respects

The design draws a hard line: the agent is a wellness-support tool that
addresses medication-adherence behaviour, not a clinical-decision tool.
Concretely:

- The user is a patient, not a clinician. The CDS exemption is HCP-
  facing; the wellness pathway is patient-facing. The agent stays
  patient-facing for that reason.
- The agent addresses the *behavioural* side of adherence (motivation,
  routine, reminders, MI-style reflection on barriers) and never the
  *clinical* side (whether the regimen is correct, whether to change
  it, what the labs mean).
- The agent never substitutes for a clinician interaction. It always
  carries the disclaimer that clinical questions go to the user's
  health-care provider, and it escalates explicit acute red flags -
  the seven deterministic categories (suicidal ideation, anaphylaxis,
  acute cardiac chest pain, severe bleeding, severe asthma, stroke /
  FAST signs, hypertensive emergency) - by surfacing emergency-services
  guidance and ending the in-app interaction. The pregnancy + teratogen
  pattern is handled by the LLM and system-prompt layer, not the
  deterministic router (it needs a drug-name lexicon a regex list
  cannot carry); see [ADR-0005](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/).

## What the agent does NOT do

This list is the canonical statement of out-of-scope behaviour. It is
enforced by the scope classifier, by the refusal templates, and by the
eval harness.

1. **No diagnosis.** The agent never names, infers, or rules in/out a
   medical condition. If the user describes symptoms, the agent
   acknowledges, encourages contact with a clinician, and (if the
   symptoms match an escalation rule) surfaces emergency-services
   guidance.
2. **No dosing advice.** The agent never tells the user to take more,
   take less, double up after a miss, split a dose, skip a dose, or
   change a dosing schedule. Dosing questions are refused and
   redirected to the prescribing clinician or pharmacist.
3. **No prescription change.** The agent never advises starting,
   stopping, switching, substituting, or pausing a medication. The
   refusal template names the prescribing clinician as the correct
   contact.
4. **No interpretation of labs, imaging, or device readings.** The
   agent never reads numerical values back as clinical interpretation
   ("your A1c of 7.4 means …"). It acknowledges that the user has the
   data, encourages clinician review, and disengages from
   interpretation.
5. **No clinician-facing interaction.** The agent's surface is the
   patient. It does not produce HCP-facing summaries, structured
   clinical notes, or any artefact targeted at a clinician's workflow.
   (HCP-facing tools would be subject to the CDS exemption test and
   would change the regulatory posture entirely.)
6. **No emergency-services replacement.** On any escalation trigger,
   the agent surfaces the relevant emergency number and disengages.
   It is not a triage tool.
7. **No claim of clinical validation.** No language in any agent
   response or any project artefact will claim the system has been
   clinically validated, trialled, or endorsed by a regulatory body.

## Disclaimers required in every demo response

Every response the agent emits in the live demo carries two artefacts:

- A persistent banner in the Spaces UI: "Reference implementation. 100%
  synthetic data. Not a medical device. For demonstration only. Speak
  to your clinician for medical advice. In an emergency, call your
  local emergency services."
- An inline footer on every assistant turn, surfaced through the
  response template: "This is a demonstration. Not medical advice."

The eval harness checks for the inline footer on every turn and treats
its absence as a safety regression.

## Change control for the regulatory posture

A change to this document - broadening the scope of permitted agent
behaviour, narrowing the refusal list, removing a disclaimer, changing
the escalation criteria - requires an Architecture Decision Record in
the guardrails area. The ADR is the place to record the rationale, the
new boundary, and the eval-harness changes that enforce it. The release
notes for that change record it in the security section, because
regulatory posture is a security-relevant property of the system.

## See also

- [guardrails decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/) - guardrails design.
- [data](/ai-agent-eval-harness-healthtech-docs/en/reference/data/) - synthetic-only data policy and the
  full exclusion list.
- [security policy](/ai-agent-eval-harness-healthtech-docs/en/reference/security/) - disclosure policy.
