---
title: Mapeamento do NIST AI Risk Management Framework
description: Um mapeamento honesto de uma implementação de referência com dados sintéticos frente às quatro funções centrais do NIST AI Risk Management Framework.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Mapeamento do NIST AI Risk Management Framework

Mapeia a implementação de referência `ai-agent-eval-harness-healthtech` frente ao
[NIST AI RMF 1.0](https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence)
(AI 100-1, janeiro de 2023). O RMF define quatro funções centrais -- Govern, Map,
Measure, Manage -- cada uma com subcategorias. Este documento avalia quais
subcategorias o repositório aborda hoje e quais exigem trabalho adicional
para uma implantação em produção.

Leia em conjunto com a [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) e o
[cartão do modelo](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/).

## Finalidade

Isto não é uma certificação do NIST AI RMF. Não existe certificação para o RMF; trata-se de um
arcabouço voluntário. A finalidade deste documento é avaliar honestamente quais práticas de gestão
de riscos a implementação de referência demonstra e onde permanecem lacunas para uma implantação em
produção. A avaliação é frente ao repositório tal como entregue; uma instância bifurcada ou
implantada precisaria de sua própria avaliação.

## Mapeamento do arcabouço

### GOVERN -- Estabelecer e manter uma cultura de gestão de riscos de IA

| Subcategoria | Implementação atual | Avaliação de lacunas |
|-------------|----------------------|----------------|
| GOV 1.1: Os requisitos legais e regulatórios são compreendidos | Postura regulatória documentada na [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/); fronteira bem-estar/CDS da FDA, orientação da OMS de 2024, GMLP da MHRA, artigos do Regulamento de IA da UE mapeados | Limitado aos arcabouços dos EUA/UE/Reino Unido/Chile; um sistema em produção precisaria de revisão jurídica específica por jurisdição para cada região de implantação |
| GOV 1.2: A gestão de riscos de IA está incorporada à governança organizacional | Os registros de decisões de arquitetura fornecem rastreabilidade; alterações na postura regulatória, nas salvaguardas ou no escalonamento exigem um registro de decisão | Sem comitê de governança ou conselho de revisão formal; implementação de referência de autor único |
| GOV 1.3: Os papéis e responsabilidades pelo risco de IA estão definidos | Propriedade clara dos módulos: salvaguardas, arcabouço de avaliação, observabilidade (spans de OpenTelemetry conforme a [decisão de observabilidade](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0006-observability/)) | Sem segregação de funções; o autor é desenvolvedor, revisor e operador |
| GOV 1.4: A tolerância a riscos é documentada e comunicada | Portões de limiar de avaliação documentados: fidelidade >= 0,85, alucinação <= 0,10, exatidão de recusa = 1,000, exatidão de escalonamento = 1,000 | Os limiares são binários de aprovado/reprovado; sem arcabouço graduado de aceitação de riscos |
| GOV 1.5: Os sistemas de IA são transparentes | Trace de decisões de salvaguarda em cada resposta; conjunto de citações em cada afirmação clínica; cartão do modelo no formato CHAI; postura regulatória acessível ao público | A transparência é em nível de resposta; sem painel público de desempenho do modelo |
| GOV 1.6: Há políticas e procedimentos para o risco de IA | Processo de divulgação de segurança; varredura de segredos na CI; política de não usar segredos; redação de PII antes do LLM | As políticas são em nível de repositório, não de nível empresarial; sem manual formal de resposta a incidentes |
| GOV 1.7: Engajamento das partes interessadas | Projeto informado por orientações regulatórias publicadas (FDA, OMS, MHRA); nenhuma parte interessada externa consultada formalmente (projeto de autor único) | Sem conselho consultivo de pacientes, conselho consultivo clínico ou revisão ética externa |

### MAP -- Compreender e contextualizar os riscos de IA

| Subcategoria | Implementação atual | Avaliação de lacunas |
|-------------|----------------------|----------------|
| MAP 1.1: As finalidades pretendidas e os casos de uso estão definidos | Seção "Uses and Directions" do cartão do modelo; lista "O que o agente NÃO faz" da postura regulatória; enumeração de itens fora de escopo imposta pelo arcabouço de avaliação | Definidos para a implementação de referência; um produto implantado precisaria de delimitação de casos de uso específica do contexto |
| MAP 1.2: Os riscos de IA inter-relacionados são identificados | Limitação de quase acerto fora do corpus documentada no cartão do modelo; lacuna de escalonamento subagudo reconhecida; comportamento probabilístico de modelos generativos documentado | A análise sistemática de interação entre riscos (por exemplo, como o viés de local se combina com a recuperação de quase acerto) não é realizada |
| MAP 1.3: As restrições e limitações são compreendidas | Limitações honestas documentadas: KB de domínio único com 36 cartões, corpus de avaliação de 315 casos, viés de vocabulário inglês dos EUA, escalonamento cego a negações, durabilidade em memória para a revisão com humano no circuito | As limitações estão documentadas; sem registro formal de riscos com pontuação de severidade |
| MAP 1.4: O impacto sobre indivíduos e grupos é avaliado | Nenhuma característica demográfica de entrada usada pelo agente; a pontuação de paridade entre locais aborda a equidade entre locais | Sem avaliação de impacto demográfico além do local; sem avaliação de impacto sobre populações com baixa literacia em saúde ou acesso limitado à internet |
| MAP 2.1: Os componentes do sistema de IA estão documentados | Os registros de decisões de arquitetura; a especificação do sistema; o grafo de seis nós documentado na [decisão de orquestração](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0001-orchestration/); os AI System Facts do cartão do modelo | A documentação é completa para a implementação de referência; um sistema em produção precisaria de runbooks operacionais |
| MAP 2.2: A proveniência dos dados é rastreada | A declaração de dados e o cartão de dados documentam a proveniência completa do corpus de avaliação e dos cartões da KB; licenciamento da fonte por cartão | O rastreamento de proveniência cobre apenas os dados sintéticos entregues; sem rastreamento de linhagem de dados para entradas em tempo de execução |
| MAP 2.3: Os riscos de terceiros são identificados | O Protocol do cliente de LLM abstrai as dependências de provedor (veja a [decisão de abstração de fornecedor de LLM](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/)); provedores listados na seção 3rd Party Information do cartão do modelo | Sem avaliação formal de riscos de terceiros; sem BAA ou revisão contratual com os provedores de LLM |
| MAP 3.1: Os riscos de IA são avaliados em cada fase do ciclo de vida | O arcabouço de avaliação valida cada alteração; red-team noturno com Promptfoo; limiares de avaliação impostos na CI | A avaliação de riscos é contínua via CI, mas limitada às dimensões de avaliação pontuadas; sem revisão organizacional de riscos mais ampla nos portões do ciclo de vida |
| MAP 3.2: Os modos de falha e os impactos em cascata estão documentados | Modos de falha das salvaguardas: contorno de escopo, falha de escalonamento, fabricação de citação; cada um tem um teste no arcabouço de avaliação | Sem análise formal de modos de falha e efeitos (FMEA); impactos em cascata através das fronteiras do sistema não avaliados |
| MAP 3.3: O retorno das partes interessadas é incorporado | Sem ciclo de retorno de partes interessadas externas; projeto informado por orientações publicadas e pela experiência de campo do autor | Um sistema em produção precisaria de canais estruturados de retorno de pacientes, médicos e responsáveis pela conformidade |

### MEASURE -- Avaliar e acompanhar os riscos de IA

| Subcategoria | Implementação atual | Avaliação de lacunas |
|-------------|----------------------|----------------|
| MEASURE 1.1: As métricas apropriadas são selecionadas | Sete dimensões de pontuação: exatidão de citação, cobertura de citação, exatidão de recusa, exatidão de escalonamento, fidelidade, alucinação, custo/latência; estratificadas por local | As métricas cobrem segurança e qualidade; sem métricas específicas de equidade além da paridade entre locais; sem métricas de impacto ambiental |
| MEASURE 1.2: O desempenho do sistema de IA é avaliado | Portão de CI determinístico (um cliente stub determinístico sem chaves, 315 casos); execução noturna com modelo ao vivo; red-team com Promptfoo | O portão determinístico é reproduzível; as métricas de modelo ao vivo não estão congeladas no cartão do modelo (são reportadas nos relatórios de avaliação) |
| MEASURE 1.3: Os dados de avaliação são representativos | 315 casos em 3 locais (en, es-419, pt-BR); 5 agrupamentos de condições; categorias golden + adversarial + no-match | Amostra pequena; sem estratificação demográfica (nenhum dado demográfico coletado); viés de inglês dos EUA reconhecido |
| MEASURE 2.1: As métricas são documentadas e comunicadas | Relatórios de avaliação publicados por execução; Key Metrics do cartão do modelo | Os relatórios são gerados por execução; sem painel de acompanhamento longitudinal |
| MEASURE 2.2: Os limiares de risco estão definidos | Limiares rígidos: fidelidade >= 0,85, alucinação <= 0,10; portão binário: exatidão de recusa = 1,000, exatidão de escalonamento = 1,000 | Os limiares são nítidos, mas não ajustados ao risco; sem arcabouço de resposta em camadas (por exemplo, âmbar vs. vermelho) |
| MEASURE 2.3: Existem mecanismos de monitoramento e retorno | Avaliação de CI em cada alteração; red-team noturno; spans de OpenTelemetry em cada nó; sinks Langfuse Cloud e Phoenix (veja a [decisão de observabilidade](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0006-observability/)) | O monitoramento cobre a implementação de referência; sem alertas de produção, monitoramento de SLA ou pipeline de detecção de degradação |
| MEASURE 3.1: O viés e a equidade são avaliados | Paridade entre locais imposta: limiares idênticos para en, es-419, pt-BR; exatidão de recusa e de escalonamento uniforme entre locais | Sem avaliação de subgrupos demográficos (o agente não recebe entradas demográficas); o viés de local limita-se ao vocabulário, não à equidade de resultados |
| MEASURE 4.1: Os resultados de medição são usados para melhoria | Achados de red-team incorporados ao banco de sementes adversariais; a regressão de avaliação bloqueia alterações; as notas de versão registram alterações relevantes à segurança | O ciclo de melhoria é interno ao repositório; sem achados de auditoria externa nem fluxo de dados de vigilância pós-comercialização |

### MANAGE -- Priorizar e agir sobre os riscos de IA

| Subcategoria | Implementação atual | Avaliação de lacunas |
|-------------|----------------------|----------------|
| MANAGE 1.1: As decisões de tratamento de riscos são documentadas | Os registros de decisões de arquitetura documentam decisões de projeto que afetam o risco (a [decisão de salvaguardas](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0005-guardrails/), a [decisão de observabilidade](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0006-observability/), a [decisão do arcabouço de avaliação](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0003-eval-harness/), a [decisão do grafo de execução em streaming](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0010-streaming-execution-graph/)) | Os registros de decisão registram a intenção de projeto; sem registro formal de riscos com planos de tratamento e aceitação de risco residual |
| MANAGE 1.2: Os sistemas de IA são projetados para falhar com segurança | As salvaguardas disparam antes do LLM (classificador de escopo, modelos de recusa, roteador de escalonamento); a imposição de citação recusa em caso de no-match; eventos de erro em streaming para falhas após o primeiro byte | A manipulação de quase acerto fora do corpus é uma lacuna conhecida; o escalonamento subagudo é deixado para o modelo |
| MANAGE 2.1: Os riscos de IA são mitigados | Salvaguardas determinísticas, arcabouço de avaliação, redação de PII, uma trilha de auditoria com OpenTelemetry, streaming com negociação de conteúdo e eventos de erro | As mitigações são de nível de implementação de referência; a produção precisaria de camadas adicionais (verificação da cadeia de suprimentos de modelos, filtragem de saída em escala) |
| MANAGE 2.2: Existem planos de resposta a incidentes | Processo de divulgação de segurança; varredura de segredos; limitações conhecidas documentadas no cartão do modelo | Sem manual formal de resposta a incidentes; sem rotação de plantão; sem esquema de classificação de severidade |
| MANAGE 2.3: O monitoramento do sistema de IA é contínuo | Avaliação de CI em cada alteração; red-team noturno com Promptfoo; spans de OpenTelemetry em cada turno; portões de custo/latência | O monitoramento é em nível de repositório; sem alertas de produção, detecção de anomalias ou rollback automatizado |
| MANAGE 3.1: Os riscos de IA são comunicados às partes interessadas | O cartão do modelo, a postura regulatória, a declaração de dados e os documentos de governança desta seção são públicos | A comunicação é passiva (documentos publicados); sem processo ativo de notificação às partes interessadas sobre mudanças de risco |
| MANAGE 4.1: As políticas e os procedimentos são mantidos | Controle de alterações baseado em registros de decisão; a seção de controle de alterações da postura regulatória exige um registro de decisão para mudanças de escopo; as notas de versão registram alterações | As políticas são em nível de repositório; sem sistema empresarial de gestão de políticas; sem ciclo anual de revisão de políticas |

## Estado atual

A implementação de referência demonstra práticas do NIST AI RMF nas seguintes áreas:

- **GOVERN**: Rastreabilidade baseada em registros de decisão, postura regulatória documentada,
  decisões de salvaguarda transparentes, cartão do modelo e postura regulatória públicos
- **MAP**: Casos de uso e fronteiras de fora de escopo definidos, proveniência de dados documentada,
  modos de falha identificados (quase acerto fora do corpus, escalonamento subagudo), declarações
  honestas de limitações
- **MEASURE**: Arcabouço de avaliação de sete dimensões com portão de CI determinístico, pontuação
  estratificada por local, testes adversariais noturnos, execução rastreada com OpenTelemetry
- **MANAGE**: Arquitetura com salvaguardas antes do LLM, tratamento de riscos documentado por
  registros de decisão, regressão de avaliação que bloqueia alterações, processo público de
  divulgação

A avaliação acima é honesta sobre o que é uma demonstração de implementação de referência versus
um programa de gestão de riscos de nível de produção. As quatro funções são abordadas na
profundidade que um artefato de referência pode razoavelmente demonstrar: documentação estruturada,
medição automatizada, controles de segurança determinísticos e comunicação transparente.

O que o repositório não tem -- comitês formais de governança, registros de riscos com pontuação de
severidade, manuais de resposta a incidentes, avaliações de riscos de terceiros, arcabouços
graduados de aceitação de riscos, pipelines de monitoramento em produção -- está documentado
explicitamente na coluna de Avaliação de lacunas de cada subcategoria.

## Caminho para produção

Uma implantação em produção precisaria estabelecer:

1. **Estrutura formal de governança**: Comitê de risco de IA, papéis e responsabilidades definidos,
   segregação de funções entre desenvolvedores e revisores, conselhos consultivos de partes
   interessadas (pacientes, clínicos, ética)
2. **Registro de riscos**: enumeração sistemática dos riscos de IA com pontuação de severidade,
   avaliação de probabilidade, planos de tratamento, aceitação de risco residual e atribuição de
   responsável pelo risco
3. **Medição ampliada**: métricas de equidade além da paridade entre locais, avaliação de impacto
   ambiental, avaliação de subgrupos demográficos onde aplicável, acompanhamento longitudinal de
   desempenho, detecção automatizada de drift
4. **Resposta a incidentes**: manual formal de RI com classificação de severidade, caminhos de
   escalonamento, modelos de comunicação, processo de revisão pós-incidente, procedimentos de
   notificação regulatória
5. **Governança de terceiros**: avaliações de riscos de fornecedores para os provedores de LLM, BAA
   quando aplicável, revisão contratual para o processamento de dados, verificação da cadeia de
   suprimentos para a proveniência dos modelos
6. **Monitoramento contínuo**: alertas de produção, detecção de anomalias, rollback automatizado,
   alerta antecipado de degradação, monitoramento de SLA, planejamento de capacidade
7. **Prontidão para auditoria**: automação da coleta de evidências, retenção de logs de auditoria
   (6 anos para a HIPAA, conforme aplicável), logging à prova de adulteração, interface de consulta
   para auditores

Os padrões do repositório -- contratos de avaliação, rastreabilidade por registros de decisão,
instrumentação com OpenTelemetry, arquitetura com salvaguardas em primeiro lugar -- aceleram a
construção de cada uma dessas capacidades. Eles são a fundação, não a estrutura acabada.

## Veja também

- [Postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) -- fronteira FDA/OMS/MHRA/Regulamento de IA da UE
- [Cartão do modelo](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/) -- Cartão de Modelo Aplicado CHAI
- [Classificação do Regulamento de IA da UE](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/eu-ai-act/) -- classificação por nível de risco do Regulamento de IA da UE
- [Modelo de ameaças OWASP / ATLAS](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/owasp-atlas-threat-model/) -- modelo de ameaças
- [Decisão de salvaguardas](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0005-guardrails/) -- projeto de salvaguardas
- [Decisão de observabilidade](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0006-observability/) -- projeto de observabilidade
