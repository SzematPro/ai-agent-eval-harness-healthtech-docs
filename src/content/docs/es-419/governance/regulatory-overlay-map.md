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
| `intake` | [Preparación para HIPAA](hipaa-readiness.md), [Ley 19.628 de Chile](chile-ley-19628.md), [CMF Norma 20](cmf-norma-20.md) | Manejo de entrada, ingreso de PII, cumplimiento jurisdiccional |
| `guardrail_pre` | [Redacción de PII](pii-redaction.md), [Modelo de amenazas OWASP ATLAS](owasp-atlas-threat-model.md), [Consentimiento de voz y deepfakes](voice-consent-deepfake.md) | Detección de PII, defensa adversarial, consentimiento de voz |
| `retrieve_context` | [Ficha de datos](data-card.md), [Plan de detección de deriva](drift-detection-plan.md) | Procedencia de datos, integridad de la base de conocimiento |
| `generate_response` | [NIST AI RMF](nist-ai-rmf.md), [Ley de IA de la UE](eu-ai-act.md), [Paridad de seguridad multilingüe](multilingual-safety-parity.md) | Gestión de riesgo, clasificación regulatoria, seguridad por configuración regional |
| `review_response` | [Plan de registro de auditoría](audit-logging-plan.md), [ISO 42001 / SOC 2](iso42001-soc2.md) | Auditoría con humano en el bucle, controles del sistema de gestión |
| `guardrail_post` | [Ficha de datos](data-card.md), [Plan de detección de deriva](drift-detection-plan.md), [Plan de registro de auditoría](audit-logging-plan.md) | Verificación de salida, integridad de citaciones, traza de auditoría |
| `closing` | [ISO 42001 / SOC 2](iso42001-soc2.md) | Finalización de la sesión, cumplimiento del sistema de gestión |

## Notas

- El mapeo es por *tipo* de nodo (no por instancia), de modo que se mantiene estable ante
  cambios de topología.
- `review_response` solo está presente cuando se habilita el paso de revisión con humano en el bucle;
  la superposición maneja con elegancia su ausencia.
- Los marcadores terminales (`start`, `end`) se excluyen del mapeo de gobernanza.
