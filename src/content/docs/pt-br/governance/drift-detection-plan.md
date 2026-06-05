---
title: Plano de detecção de deriva
description: Detecção de deriva baseada no harness de eval na implementação de referência e os requisitos para um monitoramento de deriva de nível de produção.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Plano de detecção de deriva

> Documenta as capacidades de detecção de deriva da implementação de referência
> `ai-agent-eval-harness-healthtech` e os requisitos para um monitoramento de deriva de nível de produção.
> Cobre a detecção de deriva baseada no harness de eval, a regressão de desempenho do modelo e o monitoramento
> de relevância da base de conhecimento.
>
> Leia em conjunto com o [model card](../reference/model-card.md) e o
> [plano de registro de auditoria](audit-logging-plan.md).

## Tipos de deriva

| Tipo de deriva | Definição | Relevância para este sistema |
|-----------|------------|--------------------------|
| **Deriva de dados** | A distribuição dos dados de entrada muda ao longo do tempo | As consultas dos usuários podem mudar de tema, mistura de idiomas ou complexidade; o conteúdo da KB pode ficar desatualizado |
| **Deriva de conceito** | A relação entre entradas e saídas desejadas muda | As orientações de adesão à medicação evoluem; as diretrizes clínicas são atualizadas; novos medicamentos entram no mercado |
| **Deriva de modelo** | O desempenho do modelo se degrada com as mesmas entradas | O provedor de LLM atualiza os pesos do modelo; mudanças de prompt afetam a qualidade da saída; mudanças no modelo de embedding afetam a recuperação |
| **Deriva de avaliação** | O corpus de eval deixa de representar os padrões reais de uso | Os casos de eval ficam não representativos à medida que o comportamento do usuário muda; o cenário adversarial evolui |

## Mecanismos atuais de detecção de deriva

### O harness de eval como detector de deriva

O principal mecanismo de detecção de deriva na implementação de referência é o harness de eval.
Não é um pipeline tradicional de detecção de deriva, mas cumpre um propósito semelhante ao
detectar regressões de desempenho que poderiam indicar deriva.

| Mecanismo | O que detecta | Frequência | Gatilho |
|-----------|----------------|-----------|---------|
| **Gate determinístico de CI** | Regressões de guardrail (recusa, escalonamento, citação) no corpus curado | A cada mudança | Falha de build se algum limiar for violado |
| **Execução de eval ao vivo** | Desempenho do modelo (fidelidade, alucinação) contra um LLM ao vivo | Manual / noturna | Violação de limiar registrada como regressão |
| **Red-team noturno com Promptfoo** | Robustez adversarial contra o OWASP LLM Top 10 mais casos elaborados manualmente | Noturna | Novo padrão adversarial descoberto |
| **Gates de custo/latência** | Regressão de desempenho no uso de tokens ou na latência | A cada mudança | Orçamento por turno excedido |
| **Gate de paridade entre configurações regionais** | Degradação de desempenho específica de uma configuração regional | A cada mudança | Violação de limiar de configuração regional em qualquer dimensão |

### Limiares de eval

| Dimensão | Limiar | Sinal de deriva |
|-----------|-----------|-------------|
| Fidelidade | >= 0,85 | Queda abaixo de 0,85 sugere que a qualidade da saída do modelo se degradou ou que a relevância da KB mudou |
| Alucinação | <= 0,10 | Aumento acima de 0,10 sugere que o modelo está gerando conteúdo sem suporte |
| Correção de recusa | = 1,000 | Qualquer falha significa uma regressão de guardrail (determinística; nunca deveria acontecer) |
| Correção de escalonamento | = 1,000 | Qualquer falha significa uma regressão de escalonamento (determinística; nunca deveria acontecer) |
| Correção de citações | = 1,000 | Qualquer citação fabricada significa que a imposição de citações regrediu |
| Custo | Orçamento de tokens por turno | Exceder o orçamento sugere que o padrão de prompt ou de resposta mudou |
| Latência | Orçamento de latência por turno | A regressão sugere uma mudança de provedor ou de infraestrutura |

### Detecção de deriva adversarial pelo red-team

O red-team noturno do Promptfoo serve como um detector de deriva especializado para a robustez
adversarial. Ele exercita o sistema contra:

- Templates de prompt-injection do OWASP LLM Top 10 (que evoluem com as atualizações do Promptfoo)
- Casos adversariais elaborados manualmente cobrindo elicitação de dosagem, sondagem de diagnóstico,
  extração de prompt do sistema, coerção de papel e divulgação de sofrimento
- Slices adversariais nos corpora de eval es-419 e pt-BR

Quando um novo padrão adversarial é descoberto (seja pelo Promptfoo ou por investigação
manual), ele é reincorporado ao banco de sementes adversariais. Isso garante que o
corpus de eval evolua junto com o cenário de ameaças.

### Estabilidade do corpus golden

O corpus de eval (218 casos em três configurações regionais) é um conjunto de dados golden fixo. Ele fornece
uma baseline estável contra a qual o desempenho é medido. Como o corpus é versionado
e está sob controle de versão, qualquer mudança de desempenho na mesma versão do corpus deve decorrer
de uma mudança no sistema (modelo, guardrails, recuperação ou prompts), não de uma mudança nos
dados de teste.

O corpus golden não substitui o monitoramento dos padrões reais de uso. Ele testa o
sistema contra um conjunto conhecido e curado de cenários; ele não detecta se o sistema
está encontrando novos tipos de consultas em produção.

## Estado atual

A implementação de referência detecta deriva por meio da regressão do harness de eval, não por meio de
monitoramento contínuo. Os mecanismos em vigor:

1. **Regressão de eval com gate de mudança**: Cada mudança de código é testada contra o corpus curado.
   Uma regressão em qualquer limiar reprova o build, forçando a investigação antes do merge.
   Isso captura deriva de modelo (se o provedor de LLM atualizar os pesos), deriva de guardrail (se
   uma mudança de código enfraquecer um guardrail) e deriva de recuperação (se mudanças de embedding ou de KB
   afetarem a qualidade da recuperação).

2. **Teste adversarial noturno**: O Promptfoo exercita o sistema contra templates adversariais
   em evolução. Uma nova técnica de bypass descoberta pela execução noturna é uma
   forma de detecção de deriva adversarial.

3. **Imposição de paridade entre configurações regionais**: O harness de eval mantém as três configurações regionais sob os mesmos
   limiares, detectando regressões específicas de configuração regional que poderiam indicar deriva na
   capacidade multilíngue do modelo.

4. **Imposição de orçamento de custo/latência**: Os orçamentos de custo e latência por turno capturam
   deriva de desempenho que poderia indicar mudanças de provedor, inchaço de prompt ou
   degradação de infraestrutura.

O que não está em vigor:

- **Nenhuma detecção automatizada de deriva de conceito**: O sistema não monitora se o
  conteúdo de sua KB está ficando desatualizado em relação às diretrizes clínicas atuais. As datas
  `accessed_at` dos cards de KB são registradas, mas não são verificadas automaticamente quanto à atualidade.
- **Nenhum monitoramento em produção**: Nenhum dado de usuário real é coletado ou analisado em busca de deriva.
  O corpus de eval é o único conjunto de dados de desempenho.
- **Nenhum monitoramento da distribuição de entradas**: Nenhum acompanhamento da distribuição de temas das consultas,
  da mistura de idiomas ou das tendências de complexidade ao longo do tempo.
- **Nenhuma cadência automatizada de reavaliação**: O harness de eval é executado sob demanda (mudanças) e
  à noite (red-team); não há reavaliação abrangente agendada.

## Caminho até produção

A detecção de deriva de nível de produção exigiria:

1. **Pipeline automatizado de detecção de deriva**: Monitoramento contínuo do desempenho do modelo
   contra um conjunto de validação reservado; testes estatísticos para mudança de distribuição nas
   features de entrada (temas das consultas, idioma, complexidade); alertas automatizados quando a deriva
   exceder os limiares definidos

2. **Monitoramento de regressão de desempenho**: Acompanhamento longitudinal de todas as dimensões de eval
   (fidelidade, alucinação, correção de recusa, correção de escalonamento, correção de
   citações); análise de tendências com intervalos de confiança; alertas automatizados de degradação
   antes que os limiares sejam violados

3. **Detecção de deriva de conceito para a relevância da KB**: Monitoramento automatizado da
   atualidade dos cards de KB em relação às publicações de origem; recrawling agendado das URLs de origem para detectar
   mudanças de conteúdo; alertas quando o conteúdo de origem divergir do conteúdo do card

4. **Cadência de reavaliação agendada**: Execuções de eval abrangentes semanais contra o
   corpus completo; eval mensal com modelo ao vivo e limiares atualizados; avaliação adversarial
   trimestral com novas técnicas de ataque

5. **Monitoramento da distribuição de entradas**: Acompanhamento da distribuição de temas das consultas, da mistura
   de idiomas e da complexidade ao longo do tempo; testes estatísticos para mudança de distribuição; alertas
   quando os padrões reais de uso divergirem significativamente do corpus de eval

6. **Acompanhamento de versão de modelo**: Registro das versões de modelo do provedor de LLM em cada execução de eval;
   correlação das mudanças de desempenho com as atualizações de versão do modelo; procedimentos de rollback
   para mudanças de modelo iniciadas pelo provedor

7. **Detecção de deriva de embedding**: Reembedding periódico do corpus de KB; comparação
   das distribuições de embedding ao longo do tempo; alertas para mudanças significativas que poderiam
   indicar mudanças no modelo de embedding

8. **Loop de feedback**: Coleta de feedback dos usuários (implícito e explícito); integração
   dos sinais de feedback ao corpus de eval; melhoria contínua do conjunto de dados
   golden com base nos padrões reais de uso em produção

## Veja também

- [Model card](../reference/model-card.md) -- CHAI Applied Model Card, Key Metrics
- [Data statement](../reference/data.md) -- card do conjunto de dados com metodologia de geração
- [Plano de registro de auditoria](audit-logging-plan.md) -- plano de registro de auditoria
- [Mapeamento do NIST AI RMF](nist-ai-rmf.md) -- função Measure do NIST AI RMF
- [Design do harness de eval](../adr/adr-0003-eval-harness.md) -- design do harness de eval
