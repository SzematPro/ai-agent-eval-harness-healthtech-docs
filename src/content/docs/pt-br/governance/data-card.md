---
title: Data Card
description: Proveniência, postura de licenciamento e alinhamento regulatório do corpus sintético de avaliação e da base de conhecimento da implementação de referência pública.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Data Card - Conjunto de eval sintético e base de conhecimento

> Este documento é o complemento voltado à governança do [data statement](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/data/).
> Enquanto o data statement fornece o card completo do conjunto de dados segundo a estrutura do Google Data Cards Playbook,
> este documento foca na rastreabilidade de proveniência, na postura de licenciamento e no alinhamento
> regulatório. Leia em conjunto com o [model card](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/) e a
> [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/).

## Visão geral

A distribuição publicada inclui dois conjuntos de dados sintéticos, ambos versionados
como JSONL sob controle de versão:

1. **Corpus de eval** -- casos conversacionais multiturno curados em três configurações regionais
   (en, es-419, pt-BR). Os casos cobrem as categorias golden, adversarial e no-match,
   com comportamento esperado de gold-label por turno.
2. **Cards da base de conhecimento** -- cards curtos e estruturados sobre conteúdo de adesão à medicação,
   cada um com metadados de proveniência (`source_url`, `accessed_at`, `source_license`).

Ambos os conjuntos de dados são 100% sintéticos, não carregam PHI nem PII e são redistribuíveis sob a
licença MIT. O código ao redor é Apache-2.0.

## Proveniência dos dados

### Corpus de eval

| Propriedade | Valor |
|----------|-------|
| Formato | JSONL (um objeto JSON por linha) |
| Tamanho | 218 casos (100 en, 59 es-419, 59 pt-BR) |
| Geração | Geração alinhada a personas/roteiros por LLM com loop produtor-crítico |
| Curadoria | Revisão 100% manual pelo autor |
| Sementes adversariais | 19 elaboradas manualmente em inglês mais slices adversariais em es-419/pt-BR |
| Licença | MIT |

A metodologia de geração segue um pipeline de quatro etapas: criação de personas (cinco clusters de
condições amostrados a partir de faixas epidemiológicas publicadas), geração de diálogos com
pontuação produtor-crítico quanto à fidelidade à entrevista motivacional, à conformidade de escopo e à
ancoragem, curadoria manual de cada turno gerado e injeção manual de casos adversariais.
A metodologia completa está documentada no [data statement](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/data/).

### Cards da base de conhecimento

| Propriedade | Valor |
|----------|-------|
| Formato | JSONL (id, title, text, source_url, source_license, topics, accessed_at) |
| Tamanho | 36 cards |
| Licença | MIT (conteúdo parafraseado) |

Cada card é um resumo curto e estruturado parafraseado de fontes de domínio público:

- **DailyMed** (FDA Structured Product Labeling) -- obra do Governo dos EUA, domínio público
- **MedlinePlus** (US National Library of Medicine) -- obra do Governo dos EUA, domínio público
- **WHO Essential Medicines List** -- consultada para a seleção de medicamentos; o conteúdo dos cards
  é parafraseado de forma independente, nunca literal

Uma auditoria de licença por fonte acompanha os dados sintéticos. Cards sem proveniência
falham na validação no momento do carregamento.

### Corpora excluídos

Os seguintes corpora são explicitamente excluídos da distribuição sob qualquer forma:

- MedDialog (licença somente para uso acadêmico)
- ChatDoctor / HealthCareMagic-100K (proibição de redistribuição nos termos de serviço)
- MIMIC-IV / MIMIC-IV-Note (a DUA do PhysioNet proíbe a redistribuição)
- i2b2 / n2c2 (a DUA institucional proíbe a redistribuição)
- Asclepius (CC-BY-NC-SA incompatível com redistribuição permissiva)

## Categorias de dados

O corpus de eval está organizado em três categorias em todas as configurações regionais:

| Categoria | Descrição |
|----------|-------------|
| Golden | Conversas de adesão à medicação dentro do escopo |
| Adversarial | Tentativas de dosagem, diagnóstico, prompt-injection e coerção de papel |
| No-match | Perguntas clínicas sem card de KB correspondente |

O slice em inglês (100 casos) é o maior -- quase o dobro do tamanho de cada
slice não inglês; os slices es-419 e pt-BR (59 casos cada)
incluem cobertura golden e adversarial. A base de conhecimento é composta por 36
cards de conteúdo de adesão à medicação.

## Resumo de licenciamento das fontes

| Fonte | Licença | Uso na distribuição |
|--------|---------|---------------------|
| DailyMed | Domínio público (Gov. EUA) | Conteúdo de card de KB parafraseado |
| MedlinePlus | Domínio público (Gov. EUA) | Conteúdo de card de KB parafraseado |
| WHO Essential Medicines List | CC-BY-NC-SA | Referência para seleção de medicamentos; conteúdo parafraseado de forma independente |
| Diálogos gerados por LLM | MIT | Nenhuma entrada protegida por direitos autorais; saídas redistribuíveis sob MIT |
| Código | Apache-2.0 | Independente da licença dos dados |

## Estado atual

Esta implementação de referência opera com dados 100% sintéticos. Nenhum dado real de paciente,
nenhum dado real de EHR e nenhuma informação identificável entra na distribuição em qualquer ponto.
A verificação de aceitação de dados no CI rejeita qualquer arquivo que não tenha passado por uma revisão
de identificabilidade.

Controles de governança de dados que existem hoje:

- **Política somente sintética**: imposta pelo fluxo de contribuição e documentada no
  [data statement](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/data/)
- **Metadados de proveniência**: cada card de KB carrega `source_url`, `accessed_at` e
  `source_license`; o loader rejeita cards sem proveniência
- **Paridade entre configurações regionais**: o harness de eval mantém en, es-419 e pt-BR sob limiares idênticos
  em cada execução de CI
- **Controle de versão**: os arquivos de dados são versionados como JSONL, junto com o código sob
  versionamento semântico; mudanças no corpus de eval ou na KB passam por gate de mudança
- **Declaração de IRB**: nenhum dado de sujeito humano; a aprovação de IRB não é aplicável (veja a
  seção de IRB do data statement)

Limitações conhecidas herdadas do [data statement](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/data/):

- Corpus de domínio único; a cobertura é intencionalmente estreita
- Viés de vocabulário clínico em inglês dos EUA nos dados sintéticos, parcialmente corrigido pelo
  loop produtor-crítico, mas documentado como residual
- Os cards de KB estão em inglês; uma KB localizada está no roadmap
- Perguntas clínicas near-miss fora do corpus não são recusadas de forma confiável (veja o model card,
  "Riscos e limitações conhecidos")

## Caminho até produção

Um deployment real que trate dados de pacientes precisaria aumentar ou substituir os conjuntos de dados
sintéticos e abordar o seguinte:

- **Governança de dados reais de pacientes**: aprovação de IRB, consentimento informado, acordos de
  tratamento de dados e regulações de dados de saúde específicas da jurisdição (HIPAA, GDPR, Ley 19.628
  do Chile, etc.)
- **Expansão da base de conhecimento clínica**: o corpus da demo cobre cinco clusters de
  condições; um sistema de produção precisaria de uma KB clinicamente validada com revisão
  clínica regular, verificação de fontes e checagens de atualidade
- **Monitoramento da qualidade dos dados**: pipelines automatizados para detectar deriva de dados, lacunas
  de cobertura e degradação da qualidade dos rótulos tanto no corpus de eval quanto nos cards de KB
- **Conteúdo localizado**: revisão clínica em idioma nativo para cada configuração regional, não apenas a
  tradução de conteúdo gerado em inglês; caminhos de escalonamento clínico específicos da configuração regional
- **Políticas de retenção e exclusão de dados**: a implementação de referência não tem
  dados persistentes de usuário; em produção seriam necessários cronogramas de retenção, procedimentos de exclusão
  e tratamento de solicitações de acesso dos titulares
- **Auditoria de viés**: avaliação sistemática da representação demográfica nos dados de treinamento e
  avaliação, além das checagens de paridade entre configurações regionais já em vigor

## Veja também

- [Data statement](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/data/) -- card completo do conjunto de dados com metodologia de geração
- [Model card](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/) -- CHAI Applied Model Card para o agente
- [Postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) -- fronteira FDA/WHO/MHRA/EU AI Act
- [Avaliação de prontidão para HIPAA](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/hipaa-readiness/) -- documento de governança específico para HIPAA
