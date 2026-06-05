---
title: Mapa de sobreposição regulatória
description: Mapeamento dos documentos de governança aos tipos de nós executáveis do grafo de execução do agente na implementação de referência pública.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Mapa de sobreposição regulatória

Mapeamento autoritativo dos documentos de governança aos tipos de nós executáveis do grafo de
execução do agente. A demo expõe esse mesmo mapeamento em sua interface, de modo que cada nó na
máquina de estados do agente vincula-se aos documentos de governança relevantes para ele.

| Tipo de nó | Documentos de governança | Resumo de relevância |
|-----------|----------------|-------------------|
| `intake` | [Prontidão para HIPAA](hipaa-readiness.md), [Ley 19.628 do Chile](chile-ley-19628.md), [CMF Norma 20](cmf-norma-20.md) | Tratamento de entrada, ingresso de PII, conformidade jurisdicional |
| `guardrail_pre` | [Redação de PII](pii-redaction.md), [Modelo de ameaças OWASP ATLAS](owasp-atlas-threat-model.md), [Consentimento de voz e deepfake](voice-consent-deepfake.md) | Detecção de PII, defesa adversarial, consentimento de voz |
| `retrieve_context` | [Data card](data-card.md), [Plano de detecção de deriva](drift-detection-plan.md) | Proveniência de dados, integridade da base de conhecimento |
| `generate_response` | [NIST AI RMF](nist-ai-rmf.md), [EU AI Act](eu-ai-act.md), [Paridade de segurança multilíngue](multilingual-safety-parity.md) | Gestão de risco, classificação regulatória, segurança por configuração regional |
| `review_response` | [Plano de registro de auditoria](audit-logging-plan.md), [ISO 42001 / SOC 2](iso42001-soc2.md) | Auditoria com humano no loop, controles do sistema de gestão |
| `guardrail_post` | [Data card](data-card.md), [Plano de detecção de deriva](drift-detection-plan.md), [Plano de registro de auditoria](audit-logging-plan.md) | Verificação de saída, integridade de citações, trilha de auditoria |
| `closing` | [ISO 42001 / SOC 2](iso42001-soc2.md) | Finalização da sessão, conformidade do sistema de gestão |

## Notas

- O mapeamento é por *tipo* de nó (não por instância), de modo que permanece estável diante de
  mudanças de topologia.
- `review_response` só está presente quando a etapa de revisão com humano no loop está habilitada;
  a sobreposição lida com sua ausência de forma graciosa.
- Os marcadores terminais (`start`, `end`) são excluídos do mapeamento de governança.
