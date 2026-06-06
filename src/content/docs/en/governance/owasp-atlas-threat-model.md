---
title: OWASP LLM Top 10 and MITRE ATLAS Threat Model
description: A threat model mapping the conversational agent against the OWASP Top 10 for LLM Applications and the MITRE ATLAS adversarial matrix.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# OWASP LLM Top 10 and MITRE ATLAS Threat Model

Maps the `ai-agent-eval-harness-healthtech` reference implementation against
the [OWASP Top 10 for LLM Applications (2025)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
and the [MITRE ATLAS](https://atlas.mitre.org/) adversarial threat matrix. This
document identifies which threats are mitigated by existing controls, which are
partially addressed, and which require additional work for production deployment.

Read alongside the [regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/), the
[NIST AI RMF mapping](/ai-agent-eval-harness-healthtech-docs/en/governance/nist-ai-rmf/), and the [guardrails decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/).

## Threat Model Scope

This threat model covers the conversational agent surface: user input entering via
the `POST /chat` endpoint, processing through the six-node LangGraph pipeline, and the
response returned to the user. The model does not cover infrastructure-level threats
(network, host, container) beyond noting that the reference implementation runs on the
Hugging Face Spaces free tier and is not designed for production infrastructure security.

## OWASP Top 10 for LLM Applications (2025) Mapping

### LLM01: Prompt Injection

| Property | Value |
|----------|-------|
| **Threat** | User input contains instructions designed to override the system prompt or manipulate the LLM's behaviour |
| **Mitigations in place** | The scope classifier rejects out-of-scope inputs before the LLM; refusal templates for known injection patterns; the Promptfoo nightly red-team exercises 13 OWASP LLM Top 10 injection templates plus 25 hand-crafted adversarial cases |
| **Residual risk** | Novel prompt-injection techniques not covered by the scope classifier or adversarial seed bank may bypass deterministic guardrails; the LLM itself may comply with well-crafted jailbreaks after the guardrail layer |
| **Control** | Scope classifier, refusal templates, and the adversarial seed bank |

### LLM02: Sensitive Information Disclosure

| Property | Value |
|----------|-------|
| **Threat** | The LLM reveals system prompts, internal architecture details, or user PII in its responses |
| **Mitigations in place** | PII redaction at input and output covering email, phone (US/Chile/Brazil), RUT, CPF, DNI, SSN, credit card (Luhn), MRN, DOB; system-prompt extraction detection in the scope classifier; privacy invariant: user message text never enters OpenTelemetry spans (enforced by an automated test); secret scanning prevents secrets in the repository |
| **Residual risk** | PII patterns are regex-based and may miss novel formats or contextual PII; the LLM may infer PII from non-PII context |
| **Control** | PII redaction stage and scope classifier |

### LLM03: Supply Chain Vulnerabilities

| Property | Value |
|----------|-------|
| **Threat** | Compromised LLM provider, poisoned model weights, or malicious dependency |
| **Mitigations in place** | The LLM client Protocol abstraction (see the [LLM vendor abstraction decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/)) allows provider switching without code changes; the dependency lockfile pins all dependencies; automated dependency monitoring is enabled; no runtime model downloads (pre-trained models accessed via API) |
| **Residual risk** | No verification of LLM provider integrity; no model provenance attestation; dependency pinning prevents drift but does not prevent initial compromise |
| **Control** | The LLM client layer, the dependency lockfile, and automated dependency monitoring |

### LLM04: Data and Model Poisoning

| Property | Value |
|----------|-------|
| **Threat** | Training data or KB content manipulated to produce harmful outputs |
| **Mitigations in place** | 100% synthetic data with documented provenance (the data statement); KB cards carry a source URL and source license; the eval harness detects behavioural regressions; corpus changes are gated on review |
| **Residual risk** | Synthetic data generation uses LLM output (inheriting model biases); no automated detection of KB content drift from source material |
| **Control** | The synthetic data corpus and the eval harness |

### LLM05: Improper Output Handling

| Property | Value |
|----------|-------|
| **Threat** | LLM output is rendered or executed without sanitisation (XSS, code execution) |
| **Mitigations in place** | SVG rendering uses `createElementNS` and `textContent`, never `innerHTML`; the API returns structured JSON; no dynamic code evaluation on LLM output; the chat response schema is locked |
| **Residual risk** | If downstream consumers render markdown from LLM output without sanitisation, XSS is possible; this is a consumer-side concern |
| **Control** | The frontend rendering layer and the API layer |

### LLM06: Excessive Agency

| Property | Value |
|----------|-------|
| **Threat** | The LLM agent has more permissions or capabilities than necessary |
| **Mitigations in place** | The scope classifier limits the agent to medication-adherence topics; refusal templates block dosing, diagnosis, prescription change, lab interpretation; no tool-use capabilities (no function calling, no API integrations, no file system access); the agent cannot initiate outbound network calls |
| **Residual risk** | The agent's conversational capability is itself the "agency"; the risk is bounded by the refusal surface but not eliminated for novel request types |
| **Control** | Scope classifier and refusal templates |

### LLM07: System Prompt Leakage

| Property | Value |
|----------|-------|
| **Threat** | User extracts the system prompt through clever prompting |
| **Mitigations in place** | The scope classifier includes system-prompt extraction detection patterns; adversarial cases in the eval corpus test for prompt extraction; the nightly Promptfoo red-team includes extraction attempts |
| **Residual risk** | Deterministic extraction detection may miss novel techniques; the system prompt content is not secret (it is in the source code), but exposure could aid targeted attacks |
| **Control** | Scope classifier and the adversarial seed bank |

### LLM08: Vector and Embedding Weaknesses

| Property | Value |
|----------|-------|
| **Threat** | Poisoned embeddings, indirect injection through KB content, or retrieval manipulation |
| **Mitigations in place** | KB cards are 100% synthetic and committed (no dynamic ingestion); retrieval returns source text with citation enforcement; the eval harness verifies citation correctness |
| **Residual risk** | Near-miss off-corpus retrieval is a known gap (documented in the model card); no embedding-poisoning detection; the small 36-card corpus makes similarity thresholds unreliable |
| **Control** | The retrieval layer and the committed KB corpus |

### LLM09: Misinformation

| Property | Value |
|----------|-------|
| **Threat** | The LLM generates plausible but incorrect health information |
| **Mitigations in place** | Citation enforcement: every clinical assertion must cite a KB card; refusal on retrieval no-match; the eval harness scores faithfulness >= 0.85 and hallucination <= 0.10; demo disclaimer on every response |
| **Residual risk** | The model may generate incorrect information that cites a valid card but misrepresents its content; the hallucination scorer catches most but not all instances |
| **Control** | The guardrail layer and the eval harness |

### LLM10: Unbounded Consumption

| Property | Value |
|----------|-------|
| **Threat** | Resource exhaustion through excessive input length, recursive prompts, or denial-of-service |
| **Mitigations in place** | Input length limits in the intake node; cost/latency gates in the eval harness (4K tokens in, 1K out, 8s per turn); per-session rate limiting available (off by default for determinism); the Hugging Face Spaces free tier has built-in rate limits |
| **Residual risk** | No recursive-prompt detection; no input-length-based circuit breaker at the HTTP layer |
| **Control** | The agent graph and the eval harness cost gates |

## MITRE ATLAS Mapping

The MITRE ATLAS matrix adapts the MITRE ATT&CK framework for AI-specific adversarial
techniques. The following table maps ATLAS techniques relevant to this system.

| ATLAS Technique | Applicability | Mitigation | Status |
|-----------------|--------------|------------|--------|
| **AML.T0000: Reconnaissance** | Attacker studies the open-source repo to understand architecture | Repository is public; the architecture decision records and specification are transparent by design | Accepted -- transparency is a feature |
| **AML.T0002: Collect Public Data** | Attacker gathers KB cards, eval corpus, system prompt from repo | Public data; synthetic only; no sensitive content | Accepted |
| **AML.T0010: ML Supply Chain Compromise** | Compromised LLM provider or dependency | The LLM client Protocol allows provider switching; the dependency lockfile pins dependencies | Partially mitigated |
| **AML.T0020: Poison Training Data** | Manipulate KB cards to inject adversarial content | 100% synthetic data; review-gated corpus; provenance metadata | Mitigated |
| **AML.T0043: Craft Adversarial Data** | Create inputs specifically designed to bypass guardrails | The eval corpus includes 25 adversarial cases; the Promptfoo nightly red-team; the scope classifier rejects known patterns | Partially mitigated -- novel techniques may bypass |
| **AML.T0044: Full Memory Extraction** | Extract system prompt through conversation | The scope classifier includes extraction detection | Partially mitigated |
| **AML.T0048: Prompt Injection** | Inject instructions to override system behaviour | Scope classifier, refusal templates, pre-LLM guardrails | Partially mitigated |
| **AML.T0051: LLM Jailbreak** | Bypass safety controls to generate harmful content | Guardrails-before-LLM architecture; refusal on out-of-scope; escalation on acute red flags | Partially mitigated |
| **AML.T0054: Manipulate Content** | Influence LLM output through KB manipulation | The KB is committed synthetic data; no dynamic ingestion | Mitigated |
| **AML.T0058: Impact on Model Output** | Cause the model to produce incorrect or harmful output | Citation enforcement; faithfulness and hallucination scoring; eval harness regression detection | Partially mitigated |

## Current State

The reference implementation mitigates the most critical OWASP LLM risks through a
defense-in-depth approach:

1. **Guardrails before LLM**: The scope classifier, PII redaction, escalation detection,
   and refusal templates run as deterministic graph nodes before the LLM is invoked.
   This means the most safety-critical decisions do not depend on model behaviour.

2. **Continuous adversarial testing**: The Promptfoo nightly red-team, the 25 adversarial
   eval cases, and the 13 hand-crafted red-team cases exercise the system against known
   attack patterns. New patterns discovered by red-team runs are folded back into the
   adversarial seed bank.

3. **Transparent architecture**: The architecture decision records, the model card, the
   regulatory posture, and the public source code make the system's design and limitations
   visible. Transparency reduces the asymmetry between attacker and defender.

4. **Eval harness as regression gate**: Every change is tested against the full 315-case
   corpus. A regression in safety, citation, or escalation metrics fails the build.

The honest assessment is that these mitigations are reference-implementation-grade. They
demonstrate the pattern of defense-in-depth for LLM applications; they do not provide
the same assurance as a production security programme with dedicated red-team resources,
penetration testing, and formal security assessment.

## Production Path

A production deployment would need to strengthen mitigations across several dimensions:

1. **Model supply chain verification**: Model provenance attestation, provider integrity
   checks, regular provider security assessments, contractual security requirements

2. **Output filtering at scale**: Real-time output filtering beyond the current
   citation-check and refusal patterns; toxicity detection; content safety classifiers;
   automated escalation of flagged outputs for human review

3. **Advanced adversarial testing**: Dedicated red-team resources beyond Promptfoo
   automation; manual penetration testing; bounty programme; continuous adversarial
   testing against emerging techniques

4. **Embedding security**: Embedding-poisoning detection; retrieval-result integrity
   verification; similarity-threshold tuning for larger corpora

5. **Rate limiting and resource protection**: Input-length circuit breakers; recursive-prompt
   detection; request-rate limiting; cost anomaly detection; graceful degradation under load

6. **Incident response**: Formal security incident playbook; severity classification;
   notification procedures for affected users; forensic analysis capability; post-incident
   review process

7. **Monitoring and alerting**: Real-time anomaly detection on LLM outputs; automated
   alerting on guardrail bypass patterns; dashboard for security-relevant metrics

## See Also

- [Regulatory posture](/ai-agent-eval-harness-healthtech-docs/en/reference/regulatory-posture/) -- regulatory boundary
- [NIST AI RMF mapping](/ai-agent-eval-harness-healthtech-docs/en/governance/nist-ai-rmf/) -- NIST AI RMF mapping
- [EU AI Act classification](/ai-agent-eval-harness-healthtech-docs/en/governance/eu-ai-act/) -- EU AI Act classification
- [Guardrails decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0005-guardrails/) -- guardrails design
- [Observability decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0006-observability/) -- observability design
- [LLM vendor abstraction decision](/ai-agent-eval-harness-healthtech-docs/en/adr/adr-0002-llm-vendor-abstraction/) -- LLM vendor abstraction
