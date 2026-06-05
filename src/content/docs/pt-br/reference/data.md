---
title: Cartão do dataset
description: O corpus de avaliação sintético e a base de conhecimento - metodologia de geração, procedência, postura de licença, lista de exclusões e declaração de IRB.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Cartão do dataset - conjunto de avaliação sintético e KB

> Estruturado segundo o Google Data Cards Playbook
> (<https://sites.research.google/datacardsplaybook/>). Os quinze temas do
> Data Cards Playbook são condensados nos que se aplicam a um conjunto de
> avaliação sintético para uma implementação de referência pública.

## Resumo

A distribuição inclui dois datasets sintéticos. Ambos são 100% sintéticos e
ambos são redistribuíveis sob a licença MIT. O código que os envolve é
licenciado separadamente sob Apache-2.0 (veja a seção Declaração de licença);
a licença dos dados e a licença do código são independentes.

1. **Corpus de avaliação** - 218 casos conversacionais multi-turno curados
   entre um paciente simulado e o agente: 100 em inglês (abrangendo casos
   golden, adversariais, de não-correspondência e de domínio expandido), 59
   es-419 e 59 pt-BR. Cada caso é rotulado com as dimensões de avaliação que
   exercita (conformidade de escopo, fundamentação, alucinação, escalonamento,
   fidelidade de MI, estabilidade de persona, tom empático, locale,
   contabilidade de latência/custo, equilíbrio de recusas) e o comportamento
   esperado de rótulo golden (modelo de recusa correto, flag de escalonamento
   correta, conjunto de citações).
2. **Cartões da base de conhecimento** - 36 cartões curtos e estruturados sobre
   conteúdo de adesão à medicação em oito domínios: hipertensão, T2DM, HIV,
   varfarina, asma, estatinas, técnica de inalador, adesão a antidepressivos,
   apoio ao cuidador, barreiras de custo, carga de comprimidos, letramento em
   saúde, padrões de barreiras de adesão e pontos de conversa de entrevista
   motivacional. Cada cartão carrega `source_url`, `accessed_at` e uma nota de
   procedência/paráfrase.

Ambos os datasets são entregues como JSONL versionado na distribuição
publicada: o corpus de avaliação como arquivos separados por locale e a base de
conhecimento como um único arquivo de cartões. Uma auditoria de licença por
fonte acompanha os dados. Envelopes de design iniciais ("50-200 turnos" e
"30-50 cartões") eram provisórios; as contagens acima são o que a distribuição
atual entrega.

## Autoria e financiamento

Escrito por Waldemar Szemat como uma implementação de referência pública.
Sem financiamento externo. Sem patrocinador corporativo. Sem parceiro
institucional. Os datasets sintéticos são publicados sob a licença MIT. O
código que os envolve é licenciado sob Apache-2.0 (foi MIT até a v0.6.0 e
mudou na v1.0.0, veja [ADR-0008](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0008-licensing/)); as decisões
de licença dos dados e de licença do código são independentes.

## Motivação

Os corpora públicos de diálogo médico existentes são ou incompatíveis em
licença com a redistribuição permissiva (MedDialog, ChatDoctor /
HealthCareMagic, Asclepius), sob um Data Use Agreement que proíbe a
redistribuição (MIMIC-IV, MIMIC-IV-Note, i2b2/n2c2), ou foram coletados sem o
consentimento informado dos participantes para treinamento de LLM a jusante.
Uma implementação de referência que se propõe a avaliar um agente de saúde
conversacional não deveria depender de nenhum desses corpora, ponto final. O
conjunto de avaliação sintético é a resposta: ele pode ser reproduzido,
redistribuído, modificado e auditado sem tocar em um Data Use Agreement e sem
envolver um único registro real de paciente.

A motivação também é pedagógica. Engenheiros e pares de IA que leem este
projeto devem conseguir inspecionar o conjunto de avaliação por completo,
reproduzir sua geração e entender o que cada semente adversarial é projetada
para provocar.

## Uso pretendido

Uso pretendido primário: conduzir o arcabouço de avaliação nesta implementação
de referência, comparar configurações do mesmo design de agente e fornecer uma
referência pública contra a qual outros agentes de saúde conversacionais
multi-turno possam ser comparados nas dez dimensões de avaliação.

Uso pretendido secundário: um exemplo didático para a construção de um conjunto
de avaliação sintético sob o enquadramento do Data Cards Playbook.

Usos fora de escopo: treinar um modelo de produção destinado à interação com
pacientes reais; validação clínica de qualquer alegação clínica; substituição
de pesquisa com seres humanos aprovada por IRB; benchmarking de ferramentas de
clinical decision support (o dataset é voltado ao paciente, não ao profissional
de saúde, por design - veja [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/)).

## Sujeito primário dos dados

Personas sintéticas. Não há sujeitos humanos de dados. As personas são
totalmente geradas por LLM por meio de uma etapa de geração alinhada a
persona-e-roteiro. Nenhuma persona corresponde a um indivíduo real.
Nenhum PHI está presente. Nenhum PII está presente. Nenhum registro médico
real está presente.

Esta é uma política rígida e é imposta pela verificação de aceitação de
dataset: o fluxo de contribuição rejeita qualquer arquivo de dados que não
tenha passado por uma revisão de identificabilidade.

## Metodologia de geração

O pipeline roda em quatro estágios.

**Estágio 1 - Personas.** Uma etapa de geração de personas por LLM produz
personas de pacientes sintéticas em cinco clusters de condições: hipertensão,
diabetes mellitus tipo 2, HIV (a âncora de adesão de longo prazo), varfarina
(âncora de índice terapêutico estreito) e asma (âncora de PRN-versus-agendado).
As distribuições de adesão são amostradas a partir de faixas epidemiológicas
publicadas para evitar o artefato de superadesão comum aos geradores de
pacientes sintéticos de prateleira.

**Estágio 2 - Geração de diálogo.** Cada persona é alimentada em uma etapa de
geração por LLM que segue o padrão alinhado a persona/roteiro (estilo SynDial e
Script-Strategy Aligned Generation). Um loop produtor-crítico avalia cada turno
gerado em três eixos (fidelidade à entrevista motivacional, conformidade de
escopo, fundamentação contra a KB); os turnos abaixo do limiar são regenerados.
O gerador e o crítico são versões diferentes de modelo; o loop é registrado e
os logs são versionados junto com o JSONL resultante.

**Estágio 3 - Curadoria.** O autor revisa manualmente 100% dos turnos gerados.
O trabalho de curadoria foca em (a) realismo da voz do paciente, (b) fidelidade
ao comportamento esperado de rótulo golden, (c) remoção de qualquer detalhe
acidentalmente identificador e (d) paridade de locale (turnos es-419 e pt-BR
mantidos na mesma barra que os turnos en-US).

**Estágio 4 - Casos adversariais.** Os casos adversariais são redigidos à mão e
incorporados ao corpus de avaliação (19 dos casos em inglês são adversariais,
mais fatias adversariais em es-419 e pt-BR). Eles cobrem: elicitação de
orientação de dosagem, sondagem de diagnóstico, injeção de prompt (extração do
prompt de sistema, coerção de papel, templates de jailbreak do OWASP-LLM Top
10), revelação de sofrimento, revelação de evento adverso e estresse de
fidelidade de MI (interrupção, negação, ambivalência). Cada caso tem uma única
asserção determinante no rótulo golden. Um conjunto separado de 13 casos de
red-team feitos à mão é entregue para o gate de red-team do Promptfoo.

O que a distribuição entrega a partir deste pipeline é a saída curada: os
datasets JSONL versionados. A própria ferramenta de geração (configs de
personas, templates de prompt de diálogo, a rubrica do crítico) foi o aparato
de trabalho e não faz parte do conjunto de artefatos entregue; a metodologia
acima é o registro de como o corpus foi construído.

## Expansão do corpus

A expansão do corpus acrescentou 24 novos cartões de KB e 138 novos casos de
avaliação em oito domínios de adesão à medicação, seguindo a estratégia de
acrescentar-ao-existente decidida na
[ADR-0013](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0013-corpus-expansion-strategy/).

### Novos domínios de cartões de KB (24 cartões, 3 por domínio)

| Domínio | IDs dos cartões |
|--------|----------|
| Adesão a estatinas | `card-statin-myopathy`, `card-statin-memory`, `card-statin-grapefruit` |
| Técnica de inalador | `card-inhaler-technique`, `card-inhaler-maintenance`, `card-inhaler-action-plan` |
| Adesão a antidepressivos | `card-antidepressant-ssri`, `card-antidepressant-discontinuation`, `card-antidepressant-stigma` |
| Apoio ao cuidador | `card-caregiver-burnout`, `card-caregiver-communication`, `card-caregiver-resources` |
| Barreiras de custo | `card-cost-barriers-insurance`, `card-cost-barriers-generic`, `card-cost-barriers-programs` |
| Carga de comprimidos | `card-pill-burden-simplification`, `card-pill-burden-polypill`, `card-pill-burden-adherence` |
| Letramento em saúde | `card-health-literacy-numeracy`, `card-health-literacy-communication`, `card-health-literacy-resources` |
| Adesão geral | `card-adherence-measurement`, `card-adherence-technology`, `card-adherence-social-support` |

### Novas contagens de casos de avaliação

| Locale | Antes da expansão | Depois da expansão | Novos casos |
|--------|----------------|----------------|-----------|
| en | 60 | 100 | +40 |
| es-419 | 10 | 59 | +49 |
| pt-BR | 10 | 59 | +49 |
| **Total** | **80** | **218** | **+138** |

Todos os novos dados são 100% sintéticos, com fontes de domínio público
(publicações do governo dos EUA, WHO EML parafraseada). Os IDs dos cartões usam
prefixos específicos de domínio para rastreabilidade.

## Procedência das fontes dos cartões de KB

Os cartões da base de conhecimento são resumos curtos e estruturados derivados
de três fontes públicas. A cópia literal é proibida; a paráfrase com citação é
exigida.

- **DailyMed** - FDA Structured Product Labeling, domínio público (obra do
  governo dos EUA). <https://dailymed.nlm.nih.gov/>
- **MedlinePlus** - informação de saúde ao consumidor da US National Library of
  Medicine, domínio público (obra do governo dos EUA).
  <https://medlineplus.gov/>
- **WHO Essential Medicines List** - publicada sob CC-BY-NC-SA; a EML é
  consultada como referência para a seleção de medicamentos no pool de personas,
  mas o conteúdo dos cartões é parafraseado, nunca copiado literalmente. A
  cláusula não comercial não vincula o conteúdo parafraseado dos cartões porque
  o conteúdo dos cartões é expresso de forma independente.
  <https://list.essentialmeds.org/>

Cada cartão de KB carrega `id`, `title`, `text`, `source_url`,
`source_license`, `topics` e `accessed_at` (data ISO-8601). O esquema do cartão
é imposto pelo carregador; cartões sem procedência reprovam na validação.

## Declaração de licença

A licença do código e a licença dos dados são declarações separadas e
independentes.

- **Código: Apache-2.0.** O código foi MIT até a v0.6.0 e mudou para Apache-2.0
  na v1.0.0; a justificativa está na
  [ADR-0008](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0008-licensing/).
- **Corpus de avaliação sintético: MIT**, distribuído dentro do repositório.
- **Cartões de KB sintéticos: MIT** para o conteúdo parafraseado dos cartões; a
  atribuição ao DailyMed / MedlinePlus / WHO EML é preservada nos metadados de
  procedência do cartão como cortesia e como trilha de verificabilidade.
- **Diálogos gerados por LLM: redistribuíveis sob MIT** (nenhum material de
  entrada protegido por direitos autorais foi usado; as saídas não estão
  sujeitas às restrições de dados de treinamento de um provedor de modelo porque
  não incluem prompts protegidos por direitos autorais).

## Lista de exclusões

Os corpora a seguir são explicitamente excluídos deste repositório sob qualquer
forma (bruta, derivada, agregado-estatístico, sinal-de-treinamento). A exclusão
é imposta pela verificação de aceitação de dados.

- **MedDialog** - uso acadêmico apenas; os espelhos públicos não carregam uma
  licença favorável à redistribuição.
- **ChatDoctor / HealthCareMagic-100K** - os termos de serviço da comunidade de
  origem proíbem a redistribuição do corpus raspado.
- **MIMIC-IV** - o Credentialed Health Data Use Agreement do PhysioNet proíbe a
  redistribuição.
- **MIMIC-IV-Note** - o DUA do PhysioNet proíbe a redistribuição; postura
  idêntica à do MIMIC-IV.
- **i2b2** e **n2c2** corpora de desafio - o Data Use Agreement institucional
  proíbe a redistribuição.
- **Asclepius** - a cláusula não comercial CC-BY-NC-SA é incompatível com a
  postura de redistribuição permissiva do repositório.

Qualquer pull request que introduza um arquivo derivado de um dos corpora
excluídos será fechado. A verificação de aceitação de novos arquivos de dados
exige ou uma declaração de licença permissiva ou uma declaração de procedência
sintética.

## O que é entregue e como inspecioná-lo

A distribuição entrega os próprios datasets curados e rotulados em golden como
JSONL versionado e controlado por versão. Um leitor não os regenera; eles são
inspecionáveis por completo diretamente no repositório:

- Os casos de avaliação em inglês (100 casos abrangendo as categorias golden,
  adversarial, de não-correspondência e de domínio expandido).
- Os casos de avaliação es-419 (59 casos).
- Os casos de avaliação pt-BR (59 casos).
- A base de conhecimento de 36 cartões.
- Uma auditoria de licença por fonte e as notas de procedência dos cartões.
- Os 13 casos de red-team feitos à mão conduzidos pelo gate do Promptfoo.

O corpus de avaliação é consumido pelo arcabouço para a fatia em inglês e para
os três locales em conjunto; cada execução grava um relatório legível por
máquina e um legível por humanos. O gate determinístico de CI roda sem chave
contra um cliente LLM stub, então o veredito do gate é reproduzível em qualquer
clone limpo sem chaves de API. A metodologia de geração que produziu o corpus
está documentada na seção *Metodologia de geração* acima; o artefato entregue é
a saída curada, não um pipeline de regeneração.

## Declaração de IRB

Este dataset não contém dados de seres humanos. As personas sintéticas são
geradas por LLM por meio de um pipeline alinhado a persona/roteiro. Nenhuma
informação identificadora está presente. Nenhum paciente real foi contatado,
observado ou consentido como parte deste trabalho. A aprovação de um Conselho
de Revisão Institucional (IRB) é, portanto, não aplicável.

Se um usuário a jusante desejar estender o dataset com dados de seres humanos,
esse usuário é responsável por obter a aprovação apropriada de IRB ou comitê de
ética em sua jurisdição. O autor deste repositório não estende, não endossa nem
supervisiona nenhuma extensão dessas.

## Questões em aberto e limitações conhecidas

- **Cobertura.** O corpus de 218 casos e a base de conhecimento de 36 cartões
  são pequenos em relação à superfície que um agente de saúde conversacional
  real encontra. O corpus é intencionalmente estreito: é um conjunto de
  avaliação, não um conjunto de treinamento, e seu trabalho é exercitar as dez
  dimensões de avaliação com rótulos golden claros. Um corpus mais amplo e mais
  diverso em tópicos é roteiro; ele também permitiria habilitar o limiar de
  similaridade de recuperação (`retrieval_min_similarity`, entregue desativado)
  - veja a limitação de fora do corpus quase correspondente no
  [cartão do modelo](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/). A expansão do corpus acrescentou 24
  cartões de KB e 138 casos de avaliação em 8 novos domínios, documentada na
  [ADR-0013](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0013-corpus-expansion-strategy/).
- **Paridade de locale.** es-419 e pt-BR são mantidos na mesma barra no
  arcabouço de avaliação, mas a geração de personas subjacente tem um viés
  conhecido em direção ao vocabulário clínico em inglês dos EUA. O loop
  produtor-crítico corrige parcialmente isso; o viés residual é documentado em
  vez de declarado resolvido. Os 36 cartões de KB estão em inglês; uma passagem
  de localização da KB é roteiro.
- **Subjetividade da rubrica de fidelidade de MI.** A fidelidade à entrevista
  motivacional é medida contra uma rubrica derivada da MITI, mas avaliadores
  humanos de MI divergem em taxas conhecidas. O arcabouço reporta a divergência
  entre avaliadores separadamente e não controla os PRs apenas pela pontuação de
  fidelidade de MI.
- **Atualidade da KB.** O campo `accessed_at` de cada cartão congela a data da
  fonte. Fontes públicas podem mudar por baixo da citação ao longo do tempo; o
  conteúdo do cartão é parafraseado de forma independente, então uma fonte que
  mudou não altera o que o agente recupera, mas o link de procedência pode ficar
  desatualizado. Atualizar a procedência dos cartões é uma tarefa de manutenção,
  não um gate automatizado.
- **Completude das sementes adversariais.** O banco de sementes é curado, não
  exaustivo. O gerador OWASP-LLM Top 10 do Promptfoo expande a superfície todas
  as noites, e novos padrões são reincorporados ao banco de sementes na
  descoberta.

## Veja também

- [cartão do modelo](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/) - o cartão do modelo do agente, em formato
  CHAI Applied Model Card.
- [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) - o limite regulatório que os
  dados respeitam.
- [política de segurança](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/security/) - política de divulgação e a restrição
  rígida de "nunca PHI".
- Google Data Cards Playbook: <https://sites.research.google/datacardsplaybook/>.
- Formato CHAI Applied Model Card: <https://www.chai.org/workgroup/applied-model>.
