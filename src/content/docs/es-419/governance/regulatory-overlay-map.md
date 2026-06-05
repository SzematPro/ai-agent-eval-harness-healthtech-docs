---
title: Mapa de superposición regulatoria
description: Mapeo de los documentos de gobernanza a los tipos de nodos ejecutables del grafo de ejecución del agente para la implementación de referencia pública.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Mapa de superposición regulatoria

Mapeo autoritativo de los documentos de gobernanza a los tipos de nodos ejecutables del grafo de
ejecución del agente. La demo expone este mismo mapeo en su interfaz, de modo que cada nodo de
la máquina de estados del agente enlaza con los documentos de gobernanza relevantes para él.

| Tipo de nodo | Documentos de gobernanza | Resumen de relevancia |
|-----------|----------------|-------------------|
| `intake` | [Preparación para HIPAA](/ai-agent-eval-harness-healthtech-docs/es-419/governance/hipaa-readiness/), [Ley 19.628 de Chile](/ai-agent-eval-harness-healthtech-docs/es-419/governance/chile-ley-19628/), [CMF Norma 20](/ai-agent-eval-harness-healthtech-docs/es-419/governance/cmf-norma-20/) | Manejo de entrada, ingreso de PII, cumplimiento jurisdiccional |
| `guardrail_pre` | [Redacción de PII](/ai-agent-eval-harness-healthtech-docs/es-419/governance/pii-redaction/), [Modelo de amenazas OWASP ATLAS](/ai-agent-eval-harness-healthtech-docs/es-419/governance/owasp-atlas-threat-model/), [Consentimiento de voz y deepfakes](/ai-agent-eval-harness-healthtech-docs/es-419/governance/voice-consent-deepfake/) | Detección de PII, defensa adversarial, consentimiento de voz |
| `retrieve_context` | [Ficha de datos](/ai-agent-eval-harness-healthtech-docs/es-419/governance/data-card/), [Plan de detección de deriva](/ai-agent-eval-harness-healthtech-docs/es-419/governance/drift-detection-plan/) | Procedencia de datos, integridad de la base de conocimiento |
| `generate_response` | [NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/es-419/governance/nist-ai-rmf/), [Ley de IA de la UE](/ai-agent-eval-harness-healthtech-docs/es-419/governance/eu-ai-act/), [Paridad de seguridad multilingüe](/ai-agent-eval-harness-healthtech-docs/es-419/governance/multilingual-safety-parity/) | Gestión de riesgo, clasificación regulatoria, seguridad por configuración regional |
| `review_response` | [Plan de registro de auditoría](/ai-agent-eval-harness-healthtech-docs/es-419/governance/audit-logging-plan/), [ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/es-419/governance/iso42001-soc2/) | Auditoría con humano en el bucle, controles del sistema de gestión |
| `guardrail_post` | [Ficha de datos](/ai-agent-eval-harness-healthtech-docs/es-419/governance/data-card/), [Plan de detección de deriva](/ai-agent-eval-harness-healthtech-docs/es-419/governance/drift-detection-plan/), [Plan de registro de auditoría](/ai-agent-eval-harness-healthtech-docs/es-419/governance/audit-logging-plan/) | Verificación de salida, integridad de citaciones, traza de auditoría |
| `closing` | [ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/es-419/governance/iso42001-soc2/) | Finalización de la sesión, cumplimiento del sistema de gestión |

## Notas

- El mapeo es por *tipo* de nodo (no por instancia), de modo que se mantiene estable ante
  cambios de topología.
- `review_response` solo está presente cuando se habilita el paso de revisión con humano en el bucle;
  la superposición maneja con elegancia su ausencia.
- Los marcadores terminales (`start`, `end`) se excluyen del mapeo de gobernanza.
