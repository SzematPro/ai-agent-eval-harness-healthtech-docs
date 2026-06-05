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
| `intake` | [Prontidão para HIPAA](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/hipaa-readiness/), [Ley 19.628 do Chile](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/chile-ley-19628/), [CMF Norma 20](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/cmf-norma-20/) | Tratamento de entrada, ingresso de PII, conformidade jurisdicional |
| `guardrail_pre` | [Redação de PII](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/pii-redaction/), [Modelo de ameaças OWASP ATLAS](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/owasp-atlas-threat-model/), [Consentimento de voz e deepfake](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/voice-consent-deepfake/) | Detecção de PII, defesa adversarial, consentimento de voz |
| `retrieve_context` | [Data card](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/data-card/), [Plano de detecção de deriva](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/drift-detection-plan/) | Proveniência de dados, integridade da base de conhecimento |
| `generate_response` | [NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/nist-ai-rmf/), [EU AI Act](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/eu-ai-act/), [Paridade de segurança multilíngue](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/multilingual-safety-parity/) | Gestão de risco, classificação regulatória, segurança por configuração regional |
| `review_response` | [Plano de registro de auditoria](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/audit-logging-plan/), [ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/iso42001-soc2/) | Auditoria com humano no loop, controles do sistema de gestão |
| `guardrail_post` | [Data card](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/data-card/), [Plano de detecção de deriva](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/drift-detection-plan/), [Plano de registro de auditoria](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/audit-logging-plan/) | Verificação de saída, integridade de citações, trilha de auditoria |
| `closing` | [ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/iso42001-soc2/) | Finalização da sessão, conformidade do sistema de gestão |

## Notas

- O mapeamento é por *tipo* de nó (não por instância), de modo que permanece estável diante de
  mudanças de topologia.
- `review_response` só está presente quando a etapa de revisão com humano no loop está habilitada;
  a sobreposição lida com sua ausência de forma graciosa.
- Os marcadores terminais (`start`, `end`) são excluídos do mapeamento de governança.
