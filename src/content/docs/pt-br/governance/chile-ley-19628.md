---
title: "Mapeamento de proteção de dados da Ley 19.628 do Chile"
description: "Como a implementação de referência pública se mapeia aos princípios de proteção de dados, aos direitos dos titulares e às disposições sobre dados sensíveis da Ley 19.628 do Chile."
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Mapeamento de proteção de dados da Ley 19.628 do Chile

> Mapeia a implementação de referência `ai-agent-eval-harness-healthtech` frente à
> [Ley 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599) (Lei chilena sobre
> Proteção da Vida Privada / Protección de la Vida Privada), com suas alterações até
> 2024. Este documento avalia quais princípios de proteção de dados a implementação
> de referência observa e o que um deployment chileno exigiria.
>
> Leia em conjunto com a [postura regulatória](../reference/regulatory-posture.md) e a
> [avaliação de prontidão para HIPAA](hipaa-readiness.md).

## Contexto legislativo

A Ley 19.628 regula o tratamento de dados pessoais no Chile. As alterações principais incluem
a modernização de 2018 (Lei 21.099, que se alinha aos princípios do GDPR) e atualizações
posteriores que reforçam os requisitos de consentimento, os direitos dos titulares e as
disposições sobre transferência transfronteiriça. A lei se aplica ao tratamento de dados
pessoais quando o responsável (controlador de dados) tem domicílio no Chile ou quando o
tratamento utiliza meios localizados em território chileno.

## Avaliação dos princípios de dados pessoais

| Princípio (Ley 19.628) | Estado atual | Caminho até produção |
|------------------------|--------------|-----------------|
| **Licitude** (Art. 2) | Nenhum dado pessoal é coletado. O sistema opera com dados 100% sintéticos. Em nenhum momento são tratados dados de pessoas reais. | Base legal para o tratamento (consentimento, necessidade contratual, obrigação legal ou interesse legítimo); base legal documentada para cada atividade de tratamento |
| **Limitação de finalidade** (Art. 2) | Não aplicável -- nenhum dado pessoal | Finalidade clara, específica e explícita para cada atividade de tratamento de dados; limitação de finalidade aplicada no design do sistema |
| **Minimização de dados** (Art. 2) | O sistema coleta entrada mínima em tempo de execução: o turno conversacional do usuário. As PII são redigidas antes do processamento. Nenhum dado persiste além do tempo de vida do processo (checkpointer em memória). | Coletar apenas os dados necessários para a finalidade declarada; revisão periódica dos dados coletados; exclusão dos dados que não são mais necessários |
| **Exatidão** (Art. 2) | Não aplicável -- nenhum dado pessoal | Mecanismos para que os titulares atualizem ou corrijam seus dados; procedimentos de revisão da qualidade dos dados |
| **Limitação de armazenamento** (Art. 2) | Nenhum armazenamento persistente de dados do usuário; as conversas ficam em memória e se perdem ao reiniciar o processo | Períodos de retenção definidos; procedimentos de exclusão; tratamento de solicitações de acesso e exclusão dos titulares |
| **Segurança** (Art. 2) | Redação de PII na entrada/saída; trilha de auditoria com OpenTelemetry; nenhum segredo no repositório (varredura automatizada de segredos); HTTPS na demo hospedada | Medidas de segurança técnicas e organizacionais apropriadas ao risco; criptografia, controles de acesso, procedimentos de notificação de violações |
| **Transparência** (Art. 2) | Aviso de demo em cada resposta; model card público; documentos de postura regulatória publicados delimitam o escopo | Aviso de privacidade acessível antes da coleta de dados; linguagem clara sobre finalidades do tratamento, retenção e direitos |

## Direitos dos titulares dos dados

| Direito (Ley 19.628) | Estado atual | Caminho até produção |
|---------------------|--------------|-----------------|
| **Acesso** (Art. 12) | Não aplicável -- nenhum dado pessoal armazenado | Mecanismo para que os titulares solicitem e recebam confirmação sobre se seus dados estão sendo tratados |
| **Retificação** (Art. 12) | Não aplicável | Mecanismo para que os titulares corrijam dados inexatos |
| **Exclusão** (Art. 12) | Não aplicável -- nenhum dado persistente | Mecanismo para que os titulares solicitem a exclusão de seus dados; verificação da exclusão |
| **Oposição** (Art. 12) | Não aplicável | Mecanismo para que os titulares se oponham ao tratamento por motivos legítimos |
| **Portabilidade** (implícita na alteração de 2018) | Não aplicável | Mecanismo para que os titulares recebam seus dados em formato estruturado e legível por máquina |

## Disposições sobre dados sensíveis

A Ley 19.628 prevê proteções reforçadas para dados pessoais sensíveis (dados de saúde,
dados biométricos, entre outros). Sob a lei, dados sensíveis só podem ser tratados
com consentimento expresso por escrito ou quando necessário para prevenção médica, diagnóstico
ou gestão de cuidados de saúde.

| Aspecto | Estado atual | Caminho até produção |
|--------|--------------|-----------------|
| **Dados de saúde** | Nenhum dado real de saúde. Todo o conteúdo clínico é sintético. O agente discute adesão à medicação apenas com personas sintéticas. | Consentimento expresso para o tratamento de dados de saúde; limitação de finalidade ao contexto de cuidados de saúde; medidas de segurança reforçadas; acesso restrito a profissionais de saúde autorizados |
| **Dados biométricos** | Nenhum dado biométrico coletado ou tratado | Consentimento expresso; limitação de finalidade; segurança reforçada; exclusão quando a finalidade for cumprida |
| **Gestão de consentimento** | Não aplicável -- nenhum dado pessoal | Plataforma de gestão de consentimento; opções de consentimento granulares; mecanismo de retirada de consentimento; trilha de auditoria do consentimento |

## Transferência transfronteiriça de dados

| Aspecto | Estado atual | Caminho até produção |
|--------|--------------|-----------------|
| **Transferência de dados a provedores de LLM** | A entrada do usuário é enviada a provedores de LLM (Groq, Cerebras) por HTTPS. Não há dados pessoais na entrada (implementação de referência somente sintética). | Avaliação das jurisdições dos provedores de LLM; determinação de adequação ou salvaguardas apropriadas para a transferência transfronteiriça; cláusulas contratuais que assegurem níveis equivalentes de proteção |
| **Transferência de dados de observabilidade** | Os spans de telemetria são enviados ao Langfuse Cloud e ao Phoenix. O texto da mensagem do usuário é explicitamente excluído dos spans (invariante de privacidade). | Avaliação da residência de dados do provedor de observabilidade; acordos de tratamento de dados; exclusão de dados pessoais da telemetria |

## Estado atual

A implementação de referência não manipula nenhum dado pessoal e, portanto, não está sujeita às
obrigações da Ley 19.628. Ainda assim, o design incorpora diversas práticas
alinhadas à proteção de dados:

- **Nenhum dado pessoal**: O sistema opera com dados 100% sintéticos. Nenhum dado de
  pessoa real entra na implementação de referência, na demo ou no pipeline de eval.
- **Redação de PII**: A camada de redação detecta e redige identificadores relevantes para usuários
  chilenos (RUT, formatos de telefone chilenos), além de identificadores dos EUA e do Brasil,
  tanto na entrada quanto na saída.
- **Nenhum armazenamento persistente**: A demo usa um checkpointer em memória; nenhum dado de usuário
  persiste além do tempo de vida do processo.
- **Invariante de privacidade**: O texto da mensagem do usuário nunca entra em spans de telemetria, logs ou
  atributos de trace. Esta é uma restrição rígida imposta por um teste de unidade dedicado.
- **Suporte ao idioma es-419**: O corpus de eval inclui um slice dedicado em es-419, e os modelos
  de recusa suportam o espanhol latino-americano, demonstrando consciência dos usuários da LATAM.

Os padrões de redação de PII para identificadores chilenos (formato RUT, prefixos de telefone
chilenos) e os modelos de recusa cientes da configuração regional que suportam respostas em es-419 fazem parte
da camada determinística de guardrails.

## Caminho até produção

Implantar esta arquitetura para usuários chilenos em um contexto que trate dados pessoais
exigiria:

1. **Registro do controlador de dados**: Registro junto à autoridade chilena de proteção
   de dados (se exigido para a atividade de tratamento específica)
2. **Gestão de consentimento**: Consentimento expresso para a coleta e o tratamento de dados pessoais;
   opções de consentimento granulares; mecanismo de retirada de consentimento; trilha de auditoria do consentimento
3. **Aviso de privacidade**: Aviso de privacidade claro e acessível em espanhol que descreva as finalidades
   do tratamento de dados, os períodos de retenção e os direitos dos titulares
4. **Encarregado de Proteção de Dados (DPO)**: Nomeação de um DPO ou função equivalente
   responsável pela conformidade com a proteção de dados
5. **Avaliação de transferência transfronteiriça**: Avaliação da residência de dados dos provedores de LLM;
   salvaguardas contratuais para os dados transferidos para fora do Chile; determinação de adequação
   ou mecanismos de proteção equivalentes
6. **Disposições sobre dados de saúde**: Se o sistema tratar dados reais de saúde, conformidade
   com as proteções reforçadas para dados sensíveis sob a Ley 19.628, incluindo
   consentimento expresso por escrito e limitação de finalidade à gestão de cuidados de saúde
7. **Infraestrutura para direitos dos titulares**: Mecanismos para solicitações de acesso, retificação,
   exclusão, oposição e portabilidade; resposta dentro dos prazos legais
8. **Medidas de segurança**: Medidas técnicas e organizacionais apropriadas à
   sensibilidade dos dados tratados; avaliações de segurança regulares; procedimentos de notificação
   de violações

## Veja também

- [Postura regulatória](../reference/regulatory-posture.md) -- fronteira regulatória
- [Mapeamento da CMF Norma 20](cmf-norma-20.md) -- mapeamento do regulador financeiro chileno
- [Avaliação de prontidão para HIPAA](hipaa-readiness.md) -- avaliação de prontidão para HIPAA
- [Documentação de redação de PII](pii-redaction.md) -- documentação de redação de PII
- [Design de observabilidade](../adr/adr-0006-observability.md) -- design de observabilidade
