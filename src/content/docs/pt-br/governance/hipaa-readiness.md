---
title: Avaliação de prontidão para a HIPAA
description: Uma avaliação honesta de prontidão para a HIPAA de uma implementação de referência com dados sintéticos que não manipula nenhuma PHI e não está sujeita à HIPAA.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Avaliação de prontidão para a HIPAA

Avalia a implementação de referência `ai-agent-eval-harness-healthtech` frente às Regras
de Privacidade, de Segurança e de Notificação de Violações da Health Insurance Portability
and Accountability Act (HIPAA) dos EUA. Esta é uma avaliação honesta: o sistema é uma
implementação de referência que não manipula PHI e não está sujeita à HIPAA.
A avaliação identifica o que existe hoje e o que uma implantação que manipule PHI exigiria.

Leia em conjunto com a [postura regulatória](../reference/regulatory-posture.md) e a
[documentação de redação de PII](pii-redaction.md).

## Aplicabilidade

A HIPAA se aplica a entidades cobertas (planos de saúde, câmaras de compensação de saúde,
prestadores de saúde que conduzem transações padronizadas eletronicamente) e a seus parceiros
de negócios. Esta implementação de referência não é nenhum desses. É um artefato de código
público, não uma entidade coberta, não um parceiro de negócios e não está sujeita às
obrigações da HIPAA.

A avaliação abaixo examina a prontidão caso a mesma arquitetura fosse implantada em um
contexto no qual processaria PHI em nome de uma entidade coberta.

## Avaliação da Regra de Privacidade

| Requisito | Estado atual | Caminho para produção |
|-------------|--------------|-----------------|
| **Manipulação de PHI** | Nenhuma PHI presente. O sistema usa dados 100% sintéticos (36 KB de cartões, 218 casos de avaliação). Sem dados reais de pacientes, sem EHR real, sem registros clínicos reais. | Uma implantação em produção precisaria definir o que constitui PHI em seu contexto, implementar políticas para ingestão, processamento, armazenamento e descarte de PHI, e garantir a aplicação do padrão do mínimo necessário |
| **Mínimo necessário** | Não aplicável -- nenhuma PHI manipulada | Controles de acesso que limitam a exposição de PHI ao mínimo necessário para cada função; acesso baseado em papéis com registro de auditoria |
| **Direitos do paciente** | Não aplicável -- nenhum paciente real | Mecanismos para que os pacientes acessem, corrijam e recebam uma prestação de contas das divulgações de sua PHI; processamento de solicitações dentro dos prazos da HIPAA |
| **Aviso de Práticas de Privacidade** | Aviso de demonstração em cada resposta ("Isto é uma demonstração. Não é aconselhamento médico.") | Documento formal de Aviso de Práticas de Privacidade; reconhecimento de recebimento pelo paciente |

## Avaliação da Regra de Segurança

### Salvaguardas administrativas

| Requisito (45 CFR 164.308) | Estado atual | Caminho para produção |
|-------------------------------|--------------|-----------------|
| **Processo de gestão de segurança** | O arcabouço de avaliação valida cada alteração; os registros de decisões de arquitetura documentam o tratamento de riscos; exercícios noturnos de red-team submetem o sistema a testes adversariais | Análise formal de riscos; plano de gestão de riscos; política de sanções; revisão da atividade do sistema de informação |
| **Responsabilidade de segurança atribuída** | Projeto de autor único; nenhum encarregado de segurança designado | Encarregado de segurança designado, responsável por desenvolver e implementar as políticas de segurança |
| **Treinamento da força de trabalho** | Não aplicável | Treinamento de conscientização em segurança para todos os membros da força de trabalho; treinamento de reciclagem periódico; treinamento sobre phishing, engenharia social e manipulação de PHI |
| **Gestão de acessos** | Acesso em nível de repositório; nenhuma autenticação de usuário em tempo de execução para a API de demonstração | Controle de acesso baseado em papéis; identificação única de usuário; procedimentos de acesso de emergência; encerramento automático de sessão; mecanismos de criptografia e descriptografia |
| **Planejamento de contingência** | Sem backup/recuperação para os dados de demonstração (checkpointer em memória, sem armazenamento persistente) | Plano de backup de dados; plano de recuperação de desastres; plano de operação em modo de emergência; procedimentos de teste e revisão |
| **Avaliação** | Nenhuma avaliação formal de segurança | Avaliação técnica e não técnica periódica; verificação das medidas de segurança frente aos requisitos documentados |

### Salvaguardas físicas

| Requisito (45 CFR 164.310) | Estado atual | Caminho para produção |
|-------------------------------|--------------|-----------------|
| **Controles de acesso às instalações** | Não aplicável (hospedado no Hugging Face Spaces; nenhuma infraestrutura física controlada) | Controles de acesso físico para qualquer infraestrutura local; registros de visitantes; registros de manutenção |
| **Segurança das estações de trabalho** | Não aplicável | Salvaguardas físicas para estações de trabalho que acessam PHI; acesso restrito a usuários autorizados |
| **Controles de dispositivos e mídia** | Não aplicável | Procedimentos de descarte de mídia; controles de reutilização de mídia; registros de responsabilidade para a movimentação de mídia |

### Salvaguardas técnicas

| Requisito (45 CFR 164.312) | Estado atual | Caminho para produção |
|-------------------------------|--------------|-----------------|
| **Controle de acesso** | Nenhuma autenticação de usuário em tempo de execução para a API de demonstração; nenhuma PHI a proteger | Identificação única de usuário; procedimento de acesso de emergência; encerramento automático de sessão; criptografia e descriptografia de PHI em repouso |
| **Controles de auditoria** | Spans de OpenTelemetry com convenções semânticas OpenInference em cada nó, chamada de LLM, recuperação e decisão de salvaguarda (veja a [decisão de observabilidade](../adr/adr-0006-observability.md)); sinks Langfuse Cloud e Phoenix | Registro de auditoria abrangente com armazenamento à prova de adulteração; retenção de 6 anos; interface de consulta para revisão de auditoria; alertas em tempo real sobre padrões de acesso anômalos |
| **Controles de integridade** | O arcabouço de avaliação detecta regressões comportamentais; o schema de resposta do chat é fixo; os arquivos de dados sintéticos têm versionamento controlado | Mecanismos eletrônicos para autenticar PHI; controles de integridade para impedir alteração não autorizada; verificação de integridade dos backups |
| **Segurança de transmissão** | HTTPS no Hugging Face Spaces (fornecido pela plataforma); a API retorna JSON estruturado | Criptografia ponta a ponta em trânsito (TLS 1.3 no mínimo); segmentação de rede; VPN para acesso administrativo |

## Avaliação da Notificação de Violações

| Requisito (45 CFR 164.400-414) | Estado atual | Caminho para produção |
|-----------------------------------|--------------|-----------------|
| **Definição de violação** | Nenhuma PHI a ser violada | Processo formal de avaliação de violações; documentação de incidentes; avaliação do risco de dano para cada suspeita de violação |
| **Notificação aos indivíduos** | Não aplicável | Notificação aos indivíduos afetados sem demora injustificada (dentro de 60 dias); notificação por escrito com o conteúdo exigido |
| **Notificação ao HHS** | Não aplicável | Registro anual de violações que afetam menos de 500 indivíduos; notificação ao HHS para violações que afetam 500 ou mais |
| **Notificação à imprensa** | Não aplicável | Notificação aos principais veículos de imprensa do estado para violações que afetam 500 ou mais indivíduos |

## Considerações sobre parceiros de negócios

Uma implantação em produção que use provedores externos de LLM (Groq, Cerebras, OpenAI, Anthropic)
para processar PHI precisaria de:

- **Acordos de Parceiro de Negócios (BAAs)** com cada provedor de LLM, obrigando-os
  contratualmente a proteger a PHI
- Garantia de que os provedores de LLM não retêm nem usam PHI para treinamento de modelos
- Avaliação da postura de conformidade com a HIPAA de cada provedor
- Disposições contratuais para notificação de violações, gestão de subcontratados e
  devolução/destruição de PHI no encerramento do contrato

Em 2026, a maioria dos principais provedores de LLM oferece níveis elegíveis a BAA para clientes
empresariais. A fina abstração Protocol do cliente de LLM (veja a
[decisão de abstração de fornecedor de LLM](../adr/adr-0002-llm-vendor-abstraction.md)) permite
trocar de provedor por outros com BAAs apropriados sem alterações de código.

## Estado atual

A implementação de referência é construída com vários controles alinhados à HIPAA, apesar de não
estar sujeita à HIPAA:

- **Sem PHI**: O sistema manipula apenas dados sintéticos. Nenhum dado real de paciente entra no
  repositório, na demonstração ou no pipeline de avaliação em momento algum. Isso é imposto por
  uma verificação de aceitação de dados e documentado na [declaração de dados](../reference/data.md).
- **Redação de PII**: Uma etapa de redação detecta e redige e-mail, números de telefone (formatos
  dos EUA, do Chile e do Brasil), RUT, CPF, DNI, SSN, números de cartão de crédito (validados por
  Luhn) e padrões de PHI (MRN, DOB) tanto na entrada quanto na saída.
- **Sem armazenamento persistente**: A demonstração usa um checkpointer em memória; as conversas
  dos usuários não são persistidas além do tempo de vida do processo. Um checkpointer durável
  baseado em Postgres está disponível quando uma string de conexão com o banco de dados é
  configurada.
- **Trilha de auditoria**: Spans de OpenTelemetry com convenções semânticas OpenInference envolvem
  cada nó, chamada de LLM, recuperação e decisão de salvaguarda (veja a
  [decisão de observabilidade](../adr/adr-0006-observability.md)). O texto da mensagem do usuário é
  explicitamente excluído dos spans (invariante de privacidade imposto por um teste automatizado).
- **Privacidade desde a concepção**: O texto da mensagem do usuário nunca entra em spans de
  OpenTelemetry, logs ou atributos de trace. Esta é uma restrição rígida imposta por um invariante
  de teste automatizado.
- **Gestão de segredos**: A varredura de segredos na CI impede que segredos entrem no repositório;
  o lockfile de dependências fixa as versões; o monitoramento automatizado de dependências observa
  vulnerabilidades.

Esses controles demonstram consciência dos princípios da HIPAA, mas não constituem conformidade com
a HIPAA. O sistema não passou por uma análise formal de riscos, não tem encarregado de segurança
designado, não tem BAA com nenhum provedor de LLM e não atende aos requisitos de salvaguardas
técnicas da Regra de Segurança para sistemas que processam PHI.

## Caminho para produção

Para implantar esta arquitetura em um ambiente regulado pela HIPAA:

1. **Análise formal de riscos**: Avaliação abrangente das ameaças e vulnerabilidades à
   confidencialidade, à integridade e à disponibilidade da PHI; plano documentado de tratamento de
   riscos
2. **Celebração de BAAs**: Acordos de Parceiro de Negócios com todos os provedores de LLM que
   processam PHI; salvaguardas contratuais de PHI; disposições de encerramento para
   devolução/destruição de PHI
3. **Criptografia**: Criptografia AES-256 em repouso para qualquer armazenamento de PHI; TLS 1.3 no
   mínimo para PHI em trânsito; gestão de chaves com módulos de segurança em hardware para chaves de
   produção
4. **Controles de acesso**: Controle de acesso baseado em papéis com identificação única de usuário;
   autenticação multifator para acesso administrativo; expiração automática de sessão
5. **Retenção de logs de auditoria**: Retenção de 6 anos dos logs de auditoria (requisito da HIPAA);
   armazenamento de logs à prova de adulteração; interface de consulta para revisão de auditoria e
   relatórios de conformidade
6. **Planejamento de contingência**: Procedimentos de backup de dados e recuperação de desastres;
   plano de operação em modo de emergência; testes regulares dos procedimentos de recuperação
7. **Treinamento da força de trabalho**: Treinamento de conscientização sobre a HIPAA para todo o
   pessoal; treinamento específico por papel para quem manipula PHI; treinamento de reciclagem
   periódico e simulações de phishing
8. **Resposta a incidentes**: Procedimentos de notificação de violações que atendam aos prazos da
   HIPAA; classificação e escalonamento de incidentes; capacidade de investigação forense

Os padrões já existentes no repositório -- redação de PII, uma trilha de auditoria com
OpenTelemetry, o invariante de privacidade, a arquitetura com salvaguardas em primeiro lugar --
oferecem um avanço substantivo. A lacuna está nas camadas organizacionais, processuais e
contratuais que uma implementação de referência não pode demonstrar por conta própria.

## Veja também

- [Postura regulatória](../reference/regulatory-posture.md) -- fronteira regulatória
- [Redação de PII](pii-redaction.md) -- documentação de redação de PII
- [Plano de registro de auditoria](audit-logging-plan.md) -- plano de registro de auditoria
- [Prontidão para ISO 42001 / SOC 2](iso42001-soc2.md) -- prontidão para ISO 42001 / SOC 2
- [Decisão de observabilidade](../adr/adr-0006-observability.md) -- projeto de observabilidade
