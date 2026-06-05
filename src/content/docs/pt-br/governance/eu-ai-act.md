---
title: Classificação e mapeamento do Regulamento de IA da UE
description: Uma classificação honesta de nível de risco segundo o Regulamento de IA da UE e um mapeamento de artigos para uma implementação de referência com dados sintéticos não colocada no mercado da UE.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Classificação e mapeamento do Regulamento de IA da UE

Mapeia a implementação de referência `ai-agent-eval-harness-healthtech` frente ao
[Regulamento (UE) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
(o Regulamento de IA da UE). Este documento oferece uma classificação honesta do sistema
segundo os níveis de risco do Regulamento e mapeia os artigos relevantes aos padrões
de governança existentes do repositório.

Leia em conjunto com a [postura regulatória](../reference/regulatory-posture.md) e o
[mapeamento do NIST AI RMF](nist-ai-rmf.md).

## Classificação por nível de risco

### Classificação: Não é um sistema de IA de alto risco

O Regulamento de IA da UE estabelece um arcabouço de risco de quatro níveis: proibido, alto risco,
risco limitado (obrigações de transparência) e risco mínimo. A classificação deste sistema:

| Nível | Avaliação | Justificativa |
|------|-----------|-----------|
| **Proibido** (Art. 5) | Não se aplica | O sistema não emprega técnicas subliminares, não explora vulnerabilidades, não realiza pontuação social nem identificação biométrica em tempo real |
| **Alto risco** (Anexo III) | Não se aplica | O sistema não está listado em nenhuma categoria de alto risco do Anexo III. Não é usado por autoridades públicas para a elegibilidade a benefícios (Art. III.5(a)), para a pontuação de crédito (Art. III.5(c)), para o despacho de emergências (Art. III.6(d)), nem para qualquer outra enumeração do Anexo III |
| **Risco limitado** (Art. 50) | Potencialmente aplicável | Se implantado como um chatbot que interage com cidadãos da UE, aplicar-se-iam as obrigações de transparência do Art. 50: os usuários devem ser informados de que estão interagindo com um sistema de IA |
| **Risco mínimo** | Classificação atual | Como implementação de referência pública não colocada no mercado da UE como produto ou serviço, o sistema fica abaixo do limiar da obrigação de transparência. Não existe implantação na UE; a demonstração no Hugging Face Spaces não é comercializada a usuários da UE |

### Por que não é de alto risco segundo o Anexo III

O agente é um coach de bem-estar para a adesão à medicação, voltado ao paciente, que não:

- Triagem de chamadas de emergência nem despacho de primeiros socorristas (Anexo III, ponto 6(d))
- Avalia a elegibilidade a serviços ou benefícios públicos (Anexo III, ponto 5(a))
- Avalia a capacidade de crédito (Anexo III, ponto 5(c))
- Realiza identificação biométrica ou reconhecimento de emoções
- Atua como dispositivo médico que exige marcação CE segundo o MDR/IVDR
- Influencia eleições, opera infraestrutura crítica ou desempenha funções de aplicação da lei

O recurso de escalonamento por sinais de alerta reconhece sete padrões agudos e apresenta
orientações de serviços de emergência. Explicitamente, não é uma ferramenta de triagem; não
prioriza, não roteia e não despacha. A lógica de escalonamento é determinística e baseada em regras
(uma lista de padrões versionada), projetada de modo que o operador humano, e não o modelo,
mantenha a decisão de roteamento.

### Artigo 53: Considerações sobre IA de propósito geral (GPAI)

A implementação de referência usa modelos de fundação (Groq, Cerebras, OpenAI, Anthropic)
por trás de um fino Protocol de cliente de LLM (veja a
[decisão de abstração de fornecedor de LLM](../adr/adr-0002-llm-vendor-abstraction.md)). Ela não
coloca por si mesma um modelo GPAI no mercado da UE. As obrigações de GPAI (documentação técnica,
conformidade com direitos autorais, resumo dos dados de treinamento) recaem sobre os provedores dos
modelos, não sobre esta aplicação a jusante.

## Mapa de relevância artigo por artigo

| Artigo | Obrigação | Cobertura atual | Lacuna |
|---------|-----------|-----------------|-----|
| Art. 9 (Gestão de riscos) | Identificação, análise e mitigação contínuas de riscos | O arcabouço de avaliação identifica regressões de segurança/citação/escalonamento em cada alteração; os registros de decisões de arquitetura documentam as decisões de tratamento de riscos | Sem um sistema formal de gestão de riscos com revisão periódica; sem um registro sistemático de riscos |
| Art. 10 (Dados e governança de dados) | Governança dos dados de treinamento/validação, representatividade, exame de viés | A declaração de dados documenta a metodologia de geração, a proveniência, o licenciamento e a lista de exclusões; a pontuação de paridade entre locais examina o viés entre locais | A governança de dados cobre apenas conjuntos de dados sintéticos; sem arcabouço de governança de dados reais |
| Art. 11 + Anexo IV (Documentação técnica) | Descrição do sistema, especificações de projeto, métricas de desempenho | O cartão do modelo (formato CHAI), a especificação do sistema, os registros de decisões de arquitetura, a postura regulatória, a declaração de dados | A documentação é completa para uma implementação de referência; o Anexo IV exige formato e profundidade específicos |
| Art. 12 (Manutenção de registros / logging) | Registro automático de eventos para rastreabilidade | Spans de OpenTelemetry e OpenInference em cada nó, chamada de LLM, recuperação, decisão de salvaguarda (veja a [decisão de observabilidade](../adr/adr-0006-observability.md)); sinks Langfuse Cloud e Phoenix | O logging existe, mas é de nível de observabilidade, não de nível de auditoria; sem logs à prova de adulteração; sem período de retenção definido |
| Art. 13 (Transparência e prestação de informações) | Sistema projetado para transparência; usuários compreendem os resultados | Trace de decisões de salvaguarda em cada resposta; conjunto de citações em cada afirmação clínica; cartão do modelo público; a resposta da demonstração inclui aviso | A transparência é em nível de resposta; o Art. 13 exige documentação voltada ao implantador e explicações voltadas ao usuário |
| Art. 14 (Supervisão humana) | Projetado para supervisão humana eficaz | Nó opcional de revisão com humano no circuito que usa uma interrupção do LangGraph (veja a [decisão do grafo de execução em streaming](../adr/adr-0010-streaming-execution-graph.md)); o operador humano pode aprovar/editar/rejeitar rascunhos de alto risco | A revisão com humano no circuito está desativada por padrão; sem interface dedicada de supervisão humana para monitoramento; sem documentação do mecanismo de override |
| Art. 15 (Exatidão, robustez, cibersegurança) | Níveis apropriados de exatidão, robustez e cibersegurança | Portão de avaliação determinístico (218/218 aprovados); red-team noturno; salvaguardas antes do LLM; redação de PII; instrumentação com OpenTelemetry; varredura de segredos na CI | A exatidão é medida em dados sintéticos; a robustez é testada em um conjunto adversarial curado; sem teste de penetração nem avaliação formal de segurança |
| Art. 17 (Sistema de gestão da qualidade) | SGQ documentado para sistemas de alto risco | O arcabouço de avaliação como sistema de medição; controle de alterações baseado em registros de decisão; portões de avaliação que bloqueiam alterações; notas de versão | Sem SGQ formal; sem manual da qualidade; sem ciclo de auditoria interna |

## Estado atual

A implementação de referência é um artefato de código público, não um produto ou serviço colocado
no mercado da UE. Como tal, não está sujeita às obrigações do Regulamento neste momento. A
avaliação acima examina a prontidão caso a mesma arquitetura fosse implantada dentro da UE.

O que o repositório demonstra hoje:

- **Honestidade quanto ao nível de risco**: O sistema é explicitamente classificado como não sendo
  de alto risco, com uma justificativa clara vinculada à enumeração do Anexo III
- **Padrões de governança que se mapeiam a artigos do Regulamento de IA da UE**: contratos de
  avaliação (Art. 9), proveniência de dados (Art. 10), documentação técnica (Art. 11), uma trilha de
  auditoria com OpenTelemetry (Art. 12), transparência de citações (Art. 13), um nó de revisão com
  humano no circuito (Art. 14), portões de segurança determinísticos (Art. 15)
- **Sem alegações excessivas**: Este documento não afirma conformidade com o Regulamento de IA da
  UE. O repositório é uma demonstração de engenharia consciente de governança, não uma avaliação de
  conformidade

O documento de [postura regulatória](../reference/regulatory-posture.md) registra a fronteira entre
bem-estar e CDS que mantém o sistema do lado do bem-estar geral da linha, e os modelos de recusa
impõem essa fronteira em código.

## Caminho para produção

Implantar esta arquitetura no mercado da UE exigiria:

1. **Obrigações de transparência (Art. 50)**: Se classificado como risco limitado (chatbot), os
   usuários devem ser informados de que estão interagindo com um sistema de IA. O aviso da
   demonstração aborda isso parcialmente; uma divulgação formal exigiria revisão jurídica
2. **Avaliação de conformidade**: Se qualquer mudança de recurso levar o sistema ao Anexo III
   (por exemplo, adicionar CDS voltado a médicos, roteamento de despacho de emergências), uma
   avaliação de conformidade completa segundo a categoria pertinente do Anexo III é exigida antes
   da colocação no mercado
3. **Registro no Escritório de IA da UE**: Os sistemas de alto risco devem ser registrados na base
   de dados da UE antes da implantação; os sistemas de risco limitado podem ter requisitos de
   notificação
4. **Documentação técnica (Anexo IV)**: Descrição formal do sistema, escolhas de projeto,
   governança dos dados de treinamento, métricas de desempenho, medidas de gestão de riscos --
   grande parte das quais se mapeia a artefatos existentes do repositório (o cartão do modelo, a
   especificação do sistema, os registros de decisões de arquitetura), mas precisaria ser
   reestruturada no formato do Anexo IV
5. **Monitoramento pós-comercialização**: Coleta e análise sistemáticas de dados de desempenho das
   instâncias implantadas; comunicação de incidentes às autoridades de fiscalização do mercado
6. **Avaliação de impacto sobre a proteção de dados (DPIA)**: Segundo o Art. 35 do GDPR, se o
   sistema processar dados pessoais em escala; exigiria um documento de DPIA separado
7. **Projeto de supervisão humana**: Documentação formal de projeto dos mecanismos de supervisão
   humana, incluindo procedimentos de override, requisitos de competência dos supervisores humanos
   e caminhos de escalonamento

Os padrões de governança neste repositório -- rastreabilidade por registros de decisão, portões do
arcabouço de avaliação, arquitetura com salvaguardas em primeiro lugar, instrumentação com
OpenTelemetry -- oferecem uma base sólida para atender a esses requisitos. Eles reduzem o esforço
de "construir do zero" para "formalizar e estender padrões existentes".

## Veja também

- [Postura regulatória](../reference/regulatory-posture.md) -- a fronteira regulatória que o projeto respeita
- [Cartão do modelo](../reference/model-card.md) -- Cartão de Modelo Aplicado CHAI
- [Mapeamento do NIST AI RMF](nist-ai-rmf.md) -- mapeamento do NIST AI RMF
- [Modelo de ameaças OWASP / ATLAS](owasp-atlas-threat-model.md) -- modelo de ameaças
- [Decisão de salvaguardas](../adr/adr-0005-guardrails.md) -- projeto de salvaguardas
