---
title: "Mapeamento de gestão de risco de modelos da CMF Norma 20"
description: "Como os padrões de governança da implementação de referência se mapeiam aos princípios de gestão de risco de modelos da CMF Norma 20 do Chile para instituições financeiras."
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Mapeamento de gestão de risco de modelos da CMF Norma 20

> Mapeia a implementação de referência `ai-agent-eval-harness-healthtech` frente à
> [Norma de Carácter General N.º 20](https://www.cmfchile.cl/portal/principal/613/w3-channel.html) (CMF NCG 20),
> a regulação da Comisión para el Mercado Financiero (CMF) do Chile sobre requisitos de
> capital baseados em risco e gestão de risco de modelos para instituições financeiras. Embora
> este sistema não seja um produto financeiro, os padrões de governança que ele demonstra --
> documentação de modelos, harness de eval, guardrails, observabilidade -- mapeiam-se diretamente
> aos princípios de gestão de risco de modelos que as entidades reguladas pela CMF devem seguir.
>
> Leia em conjunto com a [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) e o
> [mapeamento do NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/nist-ai-rmf/).

## Aplicabilidade

A CMF Norma 20 se aplica a bancos, instituições financeiras e outras entidades reguladas pela
Comisión para el Mercado Financiero do Chile. Esta implementação de referência não é
um produto financeiro, não é oferecida por uma entidade regulada pela CMF e não está sujeita aos
requisitos da Norma 20.

O propósito deste mapeamento é demonstrar que os padrões de governança desta
implementação de referência se alinham aos princípios de gestão de risco de modelos que os
reguladores financeiros de todo o mundo esperam. Uma instituição financeira que avalie esta arquitetura para
uso interno (por exemplo, um chatbot de atendimento ao cliente assistido por IA, um pipeline de processamento
de documentos, uma ferramenta de monitoramento de conformidade) consideraria estes padrões transferíveis.

## Mapeamento dos princípios de gestão de risco de modelos

### Desenvolvimento e documentação de modelos

| Princípio da Norma 20 | Implementação atual | Avaliação de lacunas |
|---------------------|----------------------|----------------|
| **Inventário de modelos** | O model card (no formato CHAI Applied Model Card) documenta o propósito do agente, entradas, saídas, modelos de fundação, fontes de dados, métricas de desempenho e limitações | O inventário cobre um modelo; uma instituição financeira precisaria de um inventário de modelos que cobrisse todos os modelos em uso, com classificação por nível de risco |
| **Documentação de modelos** | Os registros de decisão de arquitetura documentam as decisões de design; o model card fornece a documentação em nível de modelo; o data statement documenta os conjuntos de dados | A documentação é completa para uma implementação de referência de propósito único; em produção seriam necessários relatórios de validação de modelos, análises de sensibilidade e avaliações de limitações para cada modelo |
| **Solidez conceitual** | StateGraph do LangGraph com seis nós e responsabilidades explícitas por nó (intake, guardrail_pre, retrieve_context, generate_response, guardrail_post, closing); os guardrails são executados antes do LLM; imposição de citações em cada afirmação clínica | A arquitetura é bem estruturada e testável; um modelo financeiro precisaria de revisão conceitual independente por especialistas de domínio |

### Validação de modelos

| Princípio da Norma 20 | Implementação atual | Avaliação de lacunas |
|---------------------|----------------------|----------------|
| **Validação independente** | O harness de eval atua como um sistema de medição independente; o gate de CI impõe os limiares sem possibilidade de override pelo desenvolvedor; um cliente stub determinístico isola o comportamento dos guardrails da variabilidade do modelo | O harness de eval é construído pelo mesmo autor do sistema; a verdadeira independência exige uma equipe de validação separada |
| **Análise de resultados** | Gate de eval determinístico: todos os casos curados passam; correção de recusa = 1,000; correção de escalonamento = 1,000; fidelidade >= 0,85; alucinação <= 0,10 | A análise cobre dados sintéticos; em produção seria necessária a análise de resultados sobre dados reais de transações com testes de significância estatística |
| **Benchmarking** | Pontuação estratificada por configuração regional (en, es-419, pt-BR mantidos sob limiares idênticos); benchmarking adversarial (OWASP LLM Top 10 do Promptfoo mais casos elaborados manualmente) | O benchmarking cobre as dimensões de eval definidas; aplicações financeiras precisariam de benchmarks do setor e comparação com pares |
| **Análise de sensibilidade** | Limiar de similaridade de recuperação configurável testado em várias configurações de embedder; a abstração do provedor de LLM permite testes de troca de provedor | Análise de sensibilidade limitada; modelos financeiros precisariam de testes de sensibilidade sistemáticos nos parâmetros-chave e de cenários de estresse |

### Governança de modelos

| Princípio da Norma 20 | Implementação atual | Avaliação de lacunas |
|---------------------|----------------------|----------------|
| **Comitê de governança** | Os registros de decisão de arquitetura capturam a trilha de decisões; o harness de eval faz o gate de cada mudança; a postura regulatória exige um registro de decisão para mudanças de escopo | Nenhum comitê de governança formal; projeto de autor único; em produção seria necessário um comitê de governança de modelos com representação multifuncional |
| **Classificação por nível de risco** | A postura regulatória classifica o sistema como de bem-estar geral (não é um dispositivo médico); o mapeamento do EU AI Act o classifica como de risco mínimo | A classificação é autoavaliada para um modelo; instituições financeiras precisam de um framework de níveis de risco que cubra todos os modelos |
| **Gestão de mudanças** | Os registros de decisão documentam as mudanças; o harness de eval detecta regressões a cada mudança; o versionamento semântico acompanha as releases | A gestão de mudanças é em nível de repositório; em produção seriam necessários fluxos formais de aprovação de mudanças, validação pré-deployment e procedimentos de rollback |
| **Monitoramento contínuo** | Eval no CI a cada mudança; red-team noturno com Promptfoo; spans de telemetria em cada nó; gates de custo/latência; sinks de observabilidade Langfuse Cloud e Phoenix | O monitoramento cobre a implementação de referência; em produção seriam necessários monitoramento contínuo de desempenho do modelo, detecção de deriva e alertas automatizados |

### Monitoramento de desempenho de modelos

| Princípio da Norma 20 | Implementação atual | Avaliação de lacunas |
|---------------------|----------------------|----------------|
| **Acompanhamento de desempenho** | Gate de eval determinístico com limiares explícitos; relatórios de eval gerados a cada execução | O acompanhamento é por execução; em produção seriam necessários dashboards de desempenho longitudinais, análise de tendências e detecção automatizada de degradação |
| **Monitoramento de limiares** | Limiares rígidos: fidelidade >= 0,85, alucinação <= 0,10, correção de recusa = 1,000, correção de escalonamento = 1,000; gate binário aprovado/reprovado | Os limiares são binários; aplicações financeiras precisariam de limiares graduados (verde/âmbar/vermelho) com procedimentos de escalonamento |
| **Detecção de deriva** | O harness de eval é executado a cada mudança contra um corpus golden fixo; o red-team noturno exercita o sistema; nenhuma detecção automatizada de deriva de conceito | A implementação de referência usa detecção manual de deriva (regressão de eval); em produção seriam necessários detecção automatizada de deriva, baselines de desempenho e reavaliação agendada |
| **Relatório de exceções** | A regressão de eval reprova o build; as limitações conhecidas são documentadas no model card | O tratamento de exceções é build aprovado ou reprovado; em produção seriam necessários fluxos de relatório de exceções, documentação de aceitação de risco e notificação à alta direção |

## Estado atual

A implementação de referência demonstra padrões de governança de gestão de risco de modelos
que são diretamente transferíveis a um ambiente regulado pela CMF:

1. **Documentação de modelos**: O model card fornece documentação abrangente do modelo
   em um formato padronizado (CHAI Applied Model Card), incluindo propósito, limitações,
   métricas de desempenho e riscos conhecidos.

2. **Harness de eval como sistema de medição**: O harness de eval é um sistema de medição
   independente que avalia o agente contra casos curados em sete dimensões,
   com limiares determinísticos impostos no CI. Isso se mapeia diretamente aos requisitos de
   validação de modelos da Norma 20.

3. **Guardrails como controles**: O classificador de escopo, os modelos de recusa e o roteador
   de escalonamento atuam como controles determinísticos que delimitam o comportamento do modelo. Em
   aplicações financeiras, controles análogos limitariam as saídas do modelo a ações aprovadas.

4. **Observabilidade como monitoramento**: Os spans de telemetria com as convenções semânticas
   do OpenInference fornecem monitoramento em tempo real de cada decisão do modelo, permitindo a
   reconstrução da trilha de auditoria e o acompanhamento de desempenho. Isso se mapeia aos requisitos
   de monitoramento contínuo da Norma 20.

5. **Controle de mudanças baseado em registros de decisão**: Cada decisão de design substantiva é documentada
   em um registro de decisão de arquitetura, fornecendo a trilha de decisões que os comitês de governança
   de modelos exigem.

6. **Limitações transparentes**: O model card e a postura regulatória documentam honestamente as limitações
   conhecidas -- tratamento de casos near-miss fora do corpus, lacunas de escalonamento subagudo,
   comportamento probabilístico do modelo. Essa transparência é um ponto forte de governança.

## Caminho até produção

Adaptar estes padrões para uma instituição financeira regulada pela CMF:

1. **Comitê de governança de modelos**: Comitê multifuncional (risco, conformidade, TI,
   negócios) com autoridade para aprovar, restringir ou descontinuar modelos
2. **Inventário de modelos e framework de níveis de risco**: Inventário abrangente de todos os modelos
   com classificação por nível de risco alinhada às expectativas da CMF; modelos de maior risco
   recebem validação e monitoramento mais intensivos
3. **Validação independente de modelos**: Equipe de validação dedicada e independente do
   desenvolvimento dos modelos; relatórios de validação que cubram solidez conceitual, análise de resultados,
   análise de sensibilidade e benchmarking
4. **Monitoramento contínuo de desempenho**: Detecção automatizada de deriva, baselines de
   desempenho, acompanhamento longitudinal e alertas automatizados de degradação
5. **Gestão formal de mudanças**: Fluxos de aprovação de mudanças com validação
   pré-deployment, procedimentos de rollback e monitoramento pós-deployment
6. **Gestão de exceções**: Tratamento documentado de exceções com aceitação de risco,
   notificação à alta direção e planos de remediação
7. **Relatórios regulatórios**: Relatórios periódicos de risco de modelos à alta direção e à
   CMF; mudanças materiais nos modelos reportadas dentro dos prazos exigidos

Os padrões de governança desta implementação de referência -- contratos de eval, rastreabilidade
por registros de decisão, guardrails antes do LLM, instrumentação de telemetria, documentação honesta
de limitações -- fornecem uma base sólida. Eles são os blocos de construção procedimentais e técnicos
que uma entidade regulada pela CMF montaria em um framework formal de gestão de risco
de modelos.

## Veja também

- [Postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) -- fronteira regulatória
- [Model card](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/) -- CHAI Applied Model Card
- [Mapeamento do NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/nist-ai-rmf/) -- mapeamento do NIST AI RMF
- [Mapeamento da Ley 19.628 do Chile](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/chile-ley-19628/) -- mapeamento de proteção de dados do Chile
- [Plano de detecção de deriva](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/drift-detection-plan/) -- plano de detecção de deriva
- [Design de guardrails](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0005-guardrails/) -- design de guardrails
