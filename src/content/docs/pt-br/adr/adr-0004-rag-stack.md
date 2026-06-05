---
title: "ADR-0004: Stack de RAG"
description: Por que a recuperação usa Chroma embarcado com um embedder BGE consciente de instruções e um caminho documentado de banco de dados vetorial gerenciado.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0004: Stack de RAG (Chroma embarcado + embeddings da Voyage AI)

- Status: Accepted
- Data: 2026-03-18
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

O agente fundamenta cada afirmação clínica em uma pequena base de
conhecimento de 30 a 50 cartões cobrindo resumos de interações entre
medicamentos, barreiras de adesão, pontos de conversa de entrevista
motivacional e critérios de escalonamento. As fontes da KB são restritas a
material de domínio público ou devidamente atribuído: DailyMed (FDA SPL),
MedlinePlus (governo dos EUA) e entradas parafraseadas da Lista de
Medicamentos Essenciais da WHO. A camada de recuperação não precisa de
escalonamento horizontal; ela precisa ser barata, reproduzível e
autocontida dentro da imagem Docker que distribuímos.

Ao mesmo tempo, esta é uma implementação de referência. Ela tem que mostrar
quando um armazenamento vetorial embarcado é a escolha certa e quando um banco
de dados vetorial gerenciado é a escolha certa. A narrativa é "comece embarcado,
documente o caminho gerenciado".

Como escolhemos um armazenamento vetorial e um modelo de embeddings que (a)
rodem a $0 sem contas externas na demo padrão, (b) demonstrem consciência de
banco de dados vetorial gerenciado como caminho alternativo, (c) correspondam à
qualidade à qual o LLM-como-juiz vai nos cobrar e (d) mantenham
reprodutibilidade determinística para o harness de avaliação?

## Direcionadores da Decisão

- Zero serviços externos para o caminho padrão da demo; o armazenamento
  vetorial deve funcionar dentro da imagem Docker
- Reprodutibilidade: a mesma KB mais o mesmo modelo de embeddings mais a mesma
  consulta devem produzir a mesma recuperação, para que o avaliador de
  fundamentação seja estável
- Custo: gratuito na escala da demo (50 cartões ou menos, centenas de consultas
  por dia), com uma alternativa gerenciada de nível gratuito documentada
- Qualidade de embeddings: a avaliação do juiz penalizará a recuperação fraca
  por meio de `FaithfulnessMetric` e `HallucinationMetric`; o
  modelo de embeddings primário deveria ser um recente e forte, com um fallback
  offline embutido se nenhuma chave de API for configurada
- Licença: cada componente com licença permissiva; os embeddings gerados
  para a KB são distribuídos dentro da imagem sem custo por consulta em
  tempo de execução se o fallback offline for usado

## Opções Consideradas

- **Chroma embarcado (DuckDB+Parquet) + Voyage AI `voyage-3.5` como
  embeddings primários, `sentence-transformers BAAI/bge-large-en-v1.5`
  como fallback offline embutido** (escolhida)
- **Nível gratuito do Qdrant Cloud + Voyage AI `voyage-3.5`**: serviço
  gerenciado, nível gratuito generoso, mas dependência externa
- **FAISS** como armazenamento embarcado: alto desempenho, mas a
  história de metadados é mais fina que a do Chroma
- **Postgres + pgvector**: coalocado com o saver
  Postgres do LangGraph, mas adiciona superfície operacional para uma KB de 50 cartões
- **OpenAI `text-embedding-3-large`** como modelo de embeddings

## Resultado da Decisão

Opção escolhida: **Chroma embarcado como o armazenamento vetorial primário, com
Voyage AI `voyage-3.5` como o modelo de embeddings primário e
`sentence-transformers BAAI/bge-large-en-v1.5` como o fallback offline
embutido**. O nível gratuito do Qdrant Cloud está documentado como o caminho
alternativo gerenciado; é a resposta certa para qualquer leitor cujo
caso de uso tenha mais de ~50K chunks ou precise de um dashboard hospedado.

A Voyage AI dá 200 milhões de tokens gratuitos na família `voyage-3.5` para
novos usuários, o que excede em muito o que a KB precisa (o
corpus inteiro de 50 cartões é embarcado em menos de um milhão de tokens). O
fallback de sentence-transformers é embutido na imagem Docker, de modo que a
demo roda com zero chaves de API externas se o usuário preferir; o harness
escolhe o fallback automaticamente quando nenhuma chave de API da Voyage está
definida.

A escolha mantém a demo ao vivo a custo zero, dá uma alternativa limpa de
banco de dados gerenciado para os leitores que a queiram, e usa dois caminhos
de embeddings que ambos pontuam bem nos benchmarks de recuperação.

### Confirmação

- O arquivo Compose padrão roda o Chroma embarcado; nenhum serviço externo
  é necessário para subir a demo
- Um arquivo Compose opcional declara uma configuração de Qdrant Cloud com
  passos de cadastro de nível gratuito documentados, exercitada em um teste de
  integração manual
- A fábrica de embedder seleciona a Voyage AI se uma chave de API da Voyage
  estiver definida, e recorre ao modelo local de sentence-transformers caso
  contrário; um teste unitário exercita ambos os ramos
- A build da KB escreve um manifesto com id do modelo, versão do
  modelo, dimensão do embedding e SHA-256 de cada cartão, para que o harness
  de avaliação possa verificar que a superfície de recuperação é a esperada

## Consequências

### Positivas

- A demo roda offline: nenhum serviço externo é necessário, o que
  mantém rápido e determinístico o caminho de despertar do Hugging Face Space
- O harness de avaliação vê uma superfície de recuperação determinística (Chroma
  + embeddings fixados + hash do manifesto), exatamente o que o avaliador
  de fundamentação precisa
- A Voyage AI `voyage-3.5` é um modelo de embeddings recente e forte
  (anunciado em 2025-05-20); o nível de 200M tokens gratuitos cobre a KB
  muitas vezes
- O fallback offline remove a leitura de "precisa de uma chave de API" para
  qualquer leitor que queira clonar e executar
- O Qdrant Cloud como caminho alternativo documentado permite que o projeto
  sinalize consciência de banco de dados vetorial gerenciado sem herdar o risco
  de suspensão do nível gratuito

### Negativas

- O modelo `sentence-transformers` embutido aumenta o tamanho da imagem
  Docker; aceito porque remove o modo de falha de "os embeddings precisam
  de uma ida e volta pela internet"
- O Chroma embarcado escala mal além de centenas de milhares de
  chunks; irrelevante para uma KB de 50 cartões mas vale a pena sinalizar
- Dois caminhos de embeddings significam duas assinaturas de recuperação; o hash
  do manifesto torna a diferença auditável, mas os resultados de avaliação
  devem ser comparados dentro de um caminho de embeddings, não entre eles

### Neutras

- O projeto ganha as dependências `chromadb` e `voyageai`
- A imagem carrega os pesos de `sentence-transformers`;
  intencional e documentado
- Uma migração futura para o Qdrant Cloud é uma troca em nível de Protocol,
  não uma reescrita: a abstração de armazenamento cobre ambos os backends

## Prós e Contras das Opções

### Chroma embarcado + Voyage AI primário + bge-large-en-v1.5 fallback

- Boa, porque o caminho padrão roda com zero serviços
  externos
- Boa, porque o nível gratuito de 200M tokens da Voyage AI cobre a KB
- Boa, porque o fallback offline remove a leitura de
  "precisa-de-uma-chave"
- Boa, porque o harness de avaliação vê uma superfície de recuperação
  determinística
- Ruim, porque a imagem Docker cresce por causa do modelo de fallback embutido
- Ruim, porque o Chroma embarcado não escala para centenas de milhares de chunks

### Nível gratuito do Qdrant Cloud + Voyage AI

- Boa, porque o dashboard gerenciado e o nível gratuito (1 GB, sem
  cartão) são generosos
- Ruim, porque a demo dependeria de um serviço externo e da política de
  contas do Qdrant; cada leitor teria que se cadastrar
- Mantida como alternativa documentada

### FAISS embarcado

- Boa, porque o FAISS é rápido e testado em batalha
- Ruim, porque a ergonomia de metadados + filtragem é mais fraca que a do
  Chroma

### Postgres + pgvector

- Boa, porque o Postgres já é usado para o saver de estado da conversa
- Ruim, porque coalocar o estado da conversa e o armazenamento
  vetorial complica a operação para uma KB de 50 cartões, e distribuir
  Postgres para a recuperação contradiz a postura embarcada por padrão

### OpenAI `text-embedding-3-large`

- Boa, porque é um modelo de embeddings forte e bem conhecido
- Ruim, porque forçaria a demo a exigir uma chave de OpenAI
  só para a recuperação, e de todo modo não há um fallback offline
  limpo com qualidade comparável fora dos sentence-transformers

## Mais Informações

- Documentação do Chroma: <https://docs.trychroma.com/>
- Nível gratuito do Qdrant Cloud:
  <https://qdrant.tech/documentation/cloud/>
- Anúncio da Voyage AI `voyage-3.5` (2025-05-20):
  <https://blog.voyageai.com/2025/05/20/voyage-3-5/>
- Preços e nível de tokens gratuitos da Voyage AI:
  <https://docs.voyageai.com/docs/pricing>
- Model card do `BAAI/bge-small-en-v1.5`:
  <https://huggingface.co/BAAI/bge-small-en-v1.5>
- DailyMed (FDA SPL): <https://dailymed.nlm.nih.gov/dailymed/>
- MedlinePlus: <https://medlineplus.gov/>
- Lista de Medicamentos Essenciais da WHO:
  <https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Embedder e recuperação assimétrica tal como construídos

**Embedder padrão: `BAAI/bge-small-en-v1.5`.** O padrão distribuído é
`BAAI/bge-small-en-v1.5`: um modelo de 384 dimensões, de aproximadamente 130 MB,
escolhido porque é confortavelmente compatível com CPU Basic no nível gratuito
do Hugging Face Space mantendo uma forte qualidade de recuperação.

**A recuperação é assimétrica e consciente de instruções.** A família BGE
v1.5 é ajustada por instruções e assimétrica. O código distribuído honra isso:
uma consulta é embarcada com o prefixo documentado de instrução de
recuperação do BGE (`Represent this sentence for searching relevant passages: `);
uma passagem é embarcada sem prefixo; cada vetor é normalizado por L2 para que
a busca por produto interno do Chroma se comporte como similaridade de cosseno. Um
modelo simétrico de propósito geral (por exemplo `all-MiniLM-L6-v2`) não recebe
prefixo de instrução. Usada sem o tratamento assimétrico, a qualidade de
recuperação do BGE se degrada; a camada de recuperação é construída para
aplicá-lo.

**A Voyage como a alternativa configurável em nuvem.** A fábrica de embedder
resolve a Voyage quando uma chave de API da Voyage está definida e o modelo BGE
local caso contrário; a demo roda a $0 sem chaves no caminho local.

**O limiar de similaridade de recuperação é distribuído desativado.** Existe um
ajuste de similaridade mínima de recuperação mas por padrão ele é 0.0
(desativado). No corpus de KB de domínio único um limiar não consegue separar
uma pergunta clínica fora do corpus por pouco de uma genuinamente dentro do
corpus sem recusar falsamente esta última. O agente recusa diante de uma
recuperação de zero acertos; uma pergunta fora do corpus por pouco é respondida
contra o cartão mais próximo. O limiar é deixado no lugar, desativado, para que
um corpus mais amplo e tematicamente mais diverso possa habilitá-lo mais tarde.
Ver a [model card](../reference/model-card.md) para a limitação completa.
