---
title: "ADR-0013: Estratégia de expansão do corpus"
description: Por que a base de conhecimento e os corpora de avaliação expandem anexando entradas sintéticas de domínio público em oito novos domínios, com paridade de localidade e sem mudança de esquema.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0013: Estratégia de expansão do corpus

- Status: Aceito
- Data: 2026-05-25
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

O corpus da base de conhecimento contém 12 cards de KB sintéticos em quatro
domínios de condição (hipertensão, diabetes, insuficiência cardíaca, asma). O
corpus de avaliação contém 60 casos golden em inglês + 10 em espanhol (es-419) + 10 em português
(pt-BR). Ambos usam o formato JSONL, documentado na declaração de dados do projeto.

O objetivo de expansão do corpus pede ao menos cinco novos domínios de condição.
A extensão de detecção fora de domínio (ADR-0012) identifica oito novas
categorias de domínio (adherence-general, statin, inhaler, antidepressant,
caregiver, cost-barriers, pill-burden, health-literacy). Cada novo domínio
precisa de cards de KB para recuperação de RAG e casos de avaliação para pontuação com gate na CI.

Todos os novos dados precisam ser sintéticos e de domínio público. O formato JSONL
existente e o arcabouço de avaliação precisam permanecer inalterados. A paridade de localidade precisa ser
mantida: cada novo caso de avaliação precisa existir em todas as três localidades (en,
es-419, pt-BR).

Como expandimos os corpora de KB e de avaliação em oito novos domínios mantendo
a consistência de formato, a paridade de localidade e dados 100% sintéticos de
domínio público?

## Fatores da decisão

- **Política de apenas sintético**: todos os dados precisam ser sintéticos, sem dados reais de
  paciente, sem fontes proprietárias.
- **Fontes de domínio público**: as URLs de origem dos cards de KB precisam apontar para
  fontes de domínio público ou de licença livre (MedlinePlus, CDC, WHO). O
  campo de licença de origem precisa ser preciso.
- **Formato JSONL existente**: os formatos de card de KB e de turno de avaliação estão travados
  pelo pipeline de RAG e pelo arcabouço de avaliação. Sem mudanças de esquema.
- **Cobertura de avaliação em 3 localidades**: cada novo caso de avaliação precisa existir em
  en, es-419 e pt-BR com cobertura equivalente.
- **Qualidade de recuperação de RAG**: 2-3 cards de KB por domínio devem fornecer
  superfície de recuperação suficiente para as áreas de tópico expandidas.
- **Sem modificação de entradas existentes**: cards de KB e casos de avaliação
  existentes fazem parte da baseline commitada. Novos dados apenas anexam.

## Opções consideradas

- **Opção A: Anexar aos arquivos JSONL existentes com 2-3 cards de KB por domínio
  + 2-3 casos de avaliação por domínio por localidade**
- **Opção B: Um novo diretório de corpus com arquivos por domínio**
- **Opção C: Cards gerados por LLM com revisão humana**

## Resultado da decisão

Opção escolhida: **Opção A**, porque mantém a consistência de formato com
o corpus existente, não exige mudanças no pipeline de RAG ou no arcabouço de
avaliação, e se alinha à metodologia de dados documentada.

Oito novos domínios serão adicionados com 2-3 cards de KB cada (aproximadamente
18-24 novos cards no total):

| Domínio | Descrição | Tópicos de exemplo |
|--------|-------------|----------------|
| adherence-general | Padrões gerais de adesão a medicamentos | Construção de rotina, estratégias de lembrete, formação de hábito |
| statin | Adesão a medicamentos do tipo estatina | Manejo do colesterol, efeitos colaterais de estatinas, persistência de estatinas |
| inhaler | Técnica e adesão ao inalador | Uso de controlador vs. resgate, técnica de espaçador, planos de ação |
| antidepressant | Adesão a medicamentos antidepressivos | Persistência de ISRS, preocupações com descontinuação, barreiras de estigma |
| caregiver | Apoio à adesão mediado por cuidador | Comunicação do cuidador, manejo compartilhado, lembretes de medicação |
| cost-barriers | Barreiras financeiras à adesão | Cobertura de plano de saúde, alternativas genéricas, auxílio com copagamento |
| pill-burden | Polifarmácia e fadiga de comprimidos | Estratégias de simplificação, terapia combinada, peso do regime |
| health-literacy | Letramento em saúde e adesão | Compreensão de bulas de medicamentos, numeracia em saúde, linguagem simples |

Para casos de avaliação, 2-3 casos golden por domínio por localidade serão adicionados:

| Localidade | Atual | Novos (aprox.) | Total (aprox.) |
|--------|---------|---------------|-----------------|
| en | 60 | 16-24 | 76-84 |
| es-419 | 10 | 16-24 | 26-34 |
| pt-BR | 10 | 16-24 | 26-34 |

Todos os novos cards de KB usam fontes de domínio público (MedlinePlus, CDC, WHO) com
campos de URL de origem e de licença de origem precisos. Todos os novos casos de avaliação são
sintéticos, marcados com o domínio apropriado em seus metadados e
projetados para testar recuperação e citação contra os novos cards de KB.

### Confirmação

- O corpus de cards de KB cresce de 12 para 36 entradas.
- O corpus de avaliação em inglês cresce em 16-24 entradas.
- O corpus de avaliação em espanhol cresce em 16-24 entradas.
- O corpus de avaliação em português cresce em 16-24 entradas.
- Todas as novas entradas usam o esquema JSONL existente (sem mudanças de formato).
- As contagens de corpus da declaração de dados são atualizadas para refletir a expansão.
- O pipeline de RAG e o arcabouço de avaliação leem os arquivos expandidos sem mudanças
  de código.

## Consequências

### Positivas

- Cobertura de RAG mais ampla em oito novos domínios de adesão a medicamentos,
  melhorando a relevância de recuperação para entrada em texto livre.
- A expansão do corpus de avaliação aumenta a cobertura com gate na CI das novas
  áreas de domínio.
- Consistência de formato: sem mudanças no esquema JSONL, no pipeline de RAG ou no
  arcabouço de avaliação.
- Paridade de localidade mantida: cada domínio tem casos de avaliação em todas as três
  localidades.
- Todos os novos dados são sintéticos e de domínio público.

### Negativas

- O corpus de KB triplica de tamanho (12 para 36 cards), o que pode
  aumentar ligeiramente a latência de recuperação do Chroma. Aceitável na escala da demo.
- Gerar 16-24 casos de avaliação por localidade é trabalhoso. A qualidade precisa
  ser verificada manualmente antes do commit.
- Alguns novos domínios (por exemplo, "adherence-general") se sobrepõem conceitualmente a
  cards multidomínio existentes. A deduplicação exige revisão cuidadosa.
- As contagens da declaração de dados precisam ser atualizadas sempre que o corpus muda,
  adicionando uma etapa de manutenção de documentação.

### Neutras

- Novos IDs de card de KB usam prefixos específicos de domínio (por exemplo, `card-statin-*`,
  `card-inhaler-*`) para clareza e checagem de deduplicação.
- Novos IDs de caso de avaliação usam prefixos de domínio (por exemplo, `golden-statin-*`)
  consistentes com a nomenclatura existente.
- O arcabouço de avaliação já analisa JSONL dinamicamente, então nenhuma mudança de código
  é necessária para suportar o corpus expandido.

## Prós e contras das opções

### Opção A: Anexar aos arquivos JSONL existentes (escolhida)

- Bom, porque nenhuma mudança de formato significa nenhuma modificação no pipeline de RAG ou no arcabouço de
  avaliação.
- Bom, porque a metodologia de dados e o esquema JSONL existentes permanecem
  autoritativos.
- Bom, porque anexar é mais simples do que criar uma nova estrutura de
  diretório.
- Bom, porque o arcabouço de avaliação já lê o arquivo JSONL completo; novas
  entradas são captadas automaticamente.
- Ruim, porque um único arquivo JSONL grande é mais difícil de navegar do que
  arquivos por domínio.
- Ruim, porque a checagem de deduplicação exige varrer o arquivo completo.

### Opção B: Um novo diretório de corpus com arquivos por domínio

- Bom, porque arquivos por domínio são mais fáceis de navegar e manter.
- Bom, porque a checagem de deduplicação é delimitada ao arquivo do domínio.
- Ruim, porque exige mudar o pipeline de RAG e o arcabouço de avaliação para
  ler de múltiplos arquivos.
- Ruim, porque introduz uma nova estrutura de diretório não presente na
  metodologia de dados.
- Ruim, porque quebra a convenção estabelecida de arquivo único sem uma
  razão convincente.

### Opção C: Cards gerados por LLM com revisão humana

- Bom, porque a geração por LLM acelera a criação de cards.
- Ruim, porque conteúdo médico gerado por LLM exige revisão cuidadosa para
  evitar afirmações alucinadas.
- Ruim, porque URLs de origem e campos de licença ainda precisam ser verificados
  manualmente.
- Ruim, porque introduz um pipeline de geração que atualmente não
  existe.
- Ruim, porque os dados sintéticos precisam ser comprovadamente de domínio público,
  o que é mais difícil de verificar para texto gerado por LLM.

## Mais informações

- Detecção fora de domínio (ADR companheira): [ADR-0012](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0012-free-form-out-of-domain-detection/)
- Pilha de RAG: [ADR-0004](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0004-rag-stack/)
- Política de dados: um corpus apenas sintético, sem datasets restritos por um acordo
  de uso de dados.
- MADR 4.0.0: <https://adr.github.io/madr/>
