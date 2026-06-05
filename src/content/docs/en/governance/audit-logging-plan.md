---
title: Audit Logging Plan
description: What the reference implementation logs today via OpenTelemetry, what it does not, and what a regulated deployment would need for audit-grade logging.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Audit Logging Plan

> Documents the audit logging capabilities of the `ai-agent-eval-harness-healthtech`
> reference implementation and the requirements for production-grade audit logging.
> This plan covers what is logged today, what is not logged, and what a regulated
> deployment would need.
>
> Read alongside the [observability design](../adr/adr-0006-observability.md) and the
> [HIPAA readiness assessment](hipaa-readiness.md).

## Logging Architecture

### Current Logging Infrastructure

The reference implementation uses OpenTelemetry (OTel) with OpenInference semantic
conventions as its observability backbone. Every significant operation in the agent
pipeline is wrapped in an OTel span.

| Component | What Is Logged | Span Attributes |
|-----------|---------------|-----------------|
| **intake node** | Turn start, conversation ID, locale | `conversation.id`, `interaction.locale` |
| **guardrail_pre node** | Guardrail decisions per check (scope, PII, escalation, extraction) | `guardrail.decision`, `guardrail.category`, `guardrail.reason`, per-check pass/fail |
| **retrieve_context node** | Retrieval query, retrieved card IDs, similarity scores | `retrieval.query_hash`, `retrieval.card_ids`, `retrieval.similarity_scores` |
| **generate_response node** | LLM provider, model, token usage, latency | `llm.provider`, `llm.model`, `llm.tokens_in`, `llm.tokens_out`, `llm.duration_ms` |
| **guardrail_post node** | Post-generation guardrail checks (citation, persona stability) | `guardrail.citation_check`, `guardrail.persona_stability` |
| **closing node** | Turn completion, overall guardrail summary | `turn.status`, `turn.duration_ms`, `turn.guardrail_summary` |
| **PII redaction** | Redaction events, pattern types matched | `pii.redacted`, `pii.pattern_type` |

### Privacy Invariant

A hard constraint enforced by a dedicated unit test:
**the user's message text is never written to any span, log, or trace attribute**. This
invariant ensures that observability data cannot be used to reconstruct user conversations.

### Observability Sinks

| Sink | Purpose | Retention | Access |
|------|---------|-----------|--------|
| **Langfuse Cloud Hobby** | Live demo observability; 50K observations/month | 30 days | Langfuse dashboard (authenticated) |
| **Phoenix self-hosted** | Eval-run observability; Docker Compose profile | Session-based (cleared on restart) | Phoenix UI (local) |
| **OTel wire format** | Portable, vendor-neutral span format | N/A (wire format only) | Exportable to any OTel-compatible backend |

## What Is Audit-Logged Today

| Event | Logged | Details |
|-------|--------|---------|
| Agent turn start/completion | Yes | Turn ID, duration, node execution order |
| Guardrail decisions | Yes | Per-check pass/fail, reason, category |
| Scope classification result | Yes | In-scope / out-of-scope / refusal category |
| Escalation triggers | Yes | Acute category matched, escalation template used |
| Refusal events | Yes | Refusal template slug, category, locale |
| PII redaction events | Yes | Pattern type matched, redaction occurred (yes/no) |
| LLM invocation | Yes | Provider, model, token usage, latency |
| Retrieval results | Yes | Card IDs retrieved, similarity scores |
| Citation verification | Yes | Citation check pass/fail, cited card IDs |
| Cost/latency accounting | Yes | Per-turn token counts, latency breakdown |

## What Is NOT Audit-Logged Today

| Event | Why Not | Production Requirement |
|-------|---------|----------------------|
| User message content | Privacy invariant: user text never logged | Production may need to log user content under controlled access; requires encryption, access controls, and retention policies |
| LLM response content | Same privacy principle applied to outputs | Production may need to log responses for quality assurance; requires same controls as user content |
| User identity / authentication | No user authentication in the demo; anonymous access | Production would need user identity logging for access control and audit trail |
| Session lifecycle | No persistent sessions in demo (in-memory checkpointer) | Production would need session start/end, duration, and turnover logging |
| Configuration changes | No runtime configuration changes in demo | Production would need configuration change audit trail with who/what/when |
| Administrative actions | No admin interface in demo | Production would need admin action logging (model changes, threshold updates, user management) |
| Export / data access | No data export capability | Production would need logging of data access, export, and sharing events |

## Current State

The reference implementation provides observability-grade logging, not audit-grade logging.
The distinction is important:

- **Observability logging** (what exists): designed for debugging, performance monitoring,
  and development insight. Spans are ephemeral, retained for 30 days (Langfuse) or
  session-only (Phoenix), and do not meet the tamper-evidence, retention, or access-control
  requirements of audit logging in regulated environments.

- **Audit logging** (what would be needed): designed for regulatory compliance, incident
  reconstruction, and legal defensibility. Requires tamper-evident storage, long-term
  retention (6 years for HIPAA), role-based access controls, and query interfaces for
  auditors.

The OTel spans with OpenInference semantic conventions provide the right wire format
and attribute structure for audit logging. The gap is in the sink infrastructure: no
tamper-evident storage, no defined retention policy, no access controls, and no query
interface beyond the observability dashboards.

Key strengths of the current logging:

1. **Comprehensive coverage**: Every node in the agent pipeline emits spans with
   structured attributes. No operation happens unlogged.
2. **Privacy-by-design**: User text is excluded from spans by invariant, not by
   convention. A production audit log would need to add user text back under controlled
   conditions.
3. **Portable format**: OTel wire format is vendor-neutral. Spans can be routed to any
   backend (Elasticsearch, Datadog, Splunk, a custom audit store) without changing the
   instrumentation.
4. **Semantic conventions**: OpenInference conventions provide a standardised attribute
   schema for LLM applications, making logs interpretable across tools and teams.

## Production Path

Production-grade audit logging would require:

1. **Tamper-evident log storage**: Append-only log storage with cryptographic integrity
   verification (e.g., hash chaining, Merkle trees, or cloud-provider immutable storage);
   detection of any log modification or deletion

2. **Retention policies**: 6-year retention for HIPAA-regulated data; jurisdiction-specific
   retention requirements; automated retention enforcement and secure deletion at expiry

3. **Access controls**: Role-based access to audit logs; separation between operational
   teams (who can view logs) and security teams (who can verify log integrity);
   audit of audit-log access itself

4. **Query interface**: Searchable audit log with filters for time range, user,
   event type, guardrail decision, and outcome; exportable reports for compliance audits

5. **Incident timeline reconstruction**: Ability to reconstruct a complete timeline of
   events for any given conversation or user; cross-referencing between guardrail
   decisions, LLM invocations, and retrieval results

6. **User content logging (with controls)**: If user message and response content must
   be logged for quality assurance or regulatory purposes: encryption at rest,
   access-controlled decryption, purpose-limited access, and deletion procedures

7. **Alerting on audit events**: Real-time alerts on anomalous patterns (e.g., spike
   in refusal rates, PII redaction failures, escalation triggers); integration with
   incident response workflows

8. **Compliance reporting**: Automated generation of compliance reports from audit log
   data; evidence packages for regulatory audits; summary dashboards for compliance officers

9. **Log export and portability**: Ability to export audit logs in standard formats
   for external audit tools, regulatory submissions, or migration between log backends

## See Also

- [Observability design](../adr/adr-0006-observability.md) -- observability design
- [HIPAA readiness assessment](hipaa-readiness.md) -- HIPAA readiness assessment
- [PII redaction](pii-redaction.md) -- PII redaction documentation
- [ISO 42001 / SOC 2 readiness](iso42001-soc2.md) -- ISO 42001 / SOC 2 readiness
- [Drift detection plan](drift-detection-plan.md) -- drift detection plan
