---
title: "ADR-0011: Camada de dados (Supabase camada gratuita)"
description: Por que um Postgres gerenciado na camada gratuita do Supabase sustenta os dados operacionais da demo, enquanto o Chroma permanece como o armazenamento de vetores do RAG, com hospedagem a $0/mês.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0011: Camada de dados -- Supabase camada gratuita para dados operacionais da demo

- Status: Aceito
- Data: 2026-05-24
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

Vários recursos da demo introduzem dados operacionais que não se encaixam na
postura em memória da demo atual:

- **Controle de acesso por chave de demo**: chaves configuradas por linha com TTL, tetos
  de orçamento, feature flags, vínculo de fingerprint anonimizado, limitação de taxa,
  rastreamento de custo. Esses dados precisam persistir entre reinícios do Space e ser
  consultáveis pelo operador.
- **Registro de interações**: logs de turno anonimizados para a camada de melhoria
  contínua, com hashes de deduplicação e flags de conformidade. Precisam persistir
  por uma retenção de 90 dias e ser consultáveis pelo script de melhoria em lote.
- **Solicitação self-service, consentimento e métricas de sessão**: solicitações de
  chave, registros de consentimento, rastreamento de sessão. Precisam persistir entre reinícios
  do Space e sobreviver a cold starts.

A ADR-0007 fixa a implantação no Hugging Face Spaces CPU Basic camada gratuita
(worker único uvicorn, padrões em memória, hospedagem a $0/mês). A ADR-0004
fixa o Chroma embutido para recuperação de RAG. A ADR-0001 já provisiona uma
fábrica de checkpointer Postgres para estado durável de conversa.

As novas tabelas operacionais (chaves de demo, uso de turnos de demo, interações,
sugestões de melhoria, solicitações de chave de demo, consentimentos de chave de demo, sessões
de demo) precisam de um armazenamento relacional que persista entre reinícios do Space, seja
consultável tanto pelo backend da demo quanto pelo operador, e permaneça a $0/mês
de hospedagem.

Como adicionamos um Postgres gerenciado para dados operacionais da demo sem violar
a restrição de hospedagem a $0/mês e sem deslocar o Chroma como o armazenamento de
vetores do RAG?

## Fatores da decisão

- **Custo de hospedagem a $0/mês**: o operador não paga nada por infraestrutura em
  estado estável (ADR-0007). Orçamentos de API por chave para os revisores da demo são
  custos de uso financiados pelo operador, não custos de hospedagem.
- **Persistência entre reinícios do Space**: o estado em memória é perdido no cold
  start (sono por inatividade de 48 horas). Chaves de demo, consentimentos e sessões precisam
  sobreviver.
- **Visibilidade do painel do operador**: o operador precisa de uma visão consultável
  de chaves, solicitações, sessões e interações para revisão manual e
  decisões de conceder/revogar.
- **Encaixe do esquema relacional**: todas as sete tabelas têm chaves estrangeiras, índices,
  restrições de check e colunas JSONB. Um armazenamento relacional é o encaixe
  natural.
- **Superfície operacional nova mínima**: uma string de conexão como um segredo do
  Space, nenhuma nova infraestrutura para gerenciar.

## Opções consideradas

- **Supabase camada gratuita (Postgres)** (escolhida): 500 MB de Postgres
  gerenciado, pgvector disponível, auth opcional, painel incluído, segurança em
  nível de linha, camada gratuita estratégica (não promocional).
- **SQLite no armazenamento persistente do Hugging Face**: sem fornecedor, mas
  o armazenamento persistente não é garantido em Spaces com SDK Docker, o acesso
  concorrente arrisca corrupção, e não há painel para revisão do operador.
- **Neon camada gratuita**: Postgres gerenciado similar, mas painel mais fraco e
  menos reconhecimento de marca para revisores corporativos.
- **Firestore (NoSQL)**: o modelo de documento é um encaixe ruim para o esquema
  relacional (FKs, restrições de check, consultas JSONB).
- **PlanetScale camada gratuita**: baseado em MySQL, retirou sua camada gratuita em abril
  de 2024; não é $0/mês daqui para frente.
- **Turso (libSQL)**: banco de dados de borda compatível com SQLite; adiciona complexidade
  operacional para uma demo de baixo volume.

## Resultado da decisão

Opção escolhida: **Supabase camada gratuita como o backend Postgres gerenciado para
dados operacionais da demo**. Um projeto Supabase hospeda todas as sete tabelas. A
string de conexão é configurada como um segredo do Space (uma URL do Supabase mais
uma chave de serviço, ou uma única URL de banco de dados). O backend da demo conecta no
startup; se a conexão falhar, o agente continua com aplicação degradada da
chave de demo e registro de interações (modo de falha: registrar localmente,
avisar na UI, não bloquear o fluxo do agente).

A camada de RAG permanece Chroma embutido (ADR-0004, inalterada). O Supabase é
para dados operacionais, não recuperação. Essa distinção é explícita: o Chroma
detém o índice de vetores sobre os cards da base de conhecimento; o Supabase detém as
tabelas relacionais de controle de acesso, consentimento, sessões e melhoria.

O custo de hospedagem permanece $0/mês: Hugging Face Spaces camada gratuita (ADR-0007)
+ Supabase camada gratuita. Orçamentos de API por chave (Anthropic, ElevenLabs) são
custos de uso financiados pelo operador, não custos de hospedagem.

### Confirmação

- As migrações de esquema implantam as sete tabelas com FKs, índices e restrições
  de check.
- O backend da demo lê as configurações de conexão do banco de dados no startup e
  conecta ao Supabase.
- Se a conexão falhar, o agente serve turnos sem aplicação da chave de
  demo e registra um aviso; o fluxo do agente nunca é bloqueado.
- O painel do operador no Supabase mostra chaves, solicitações, sessões,
  interações e sugestões em tempo real.
- A conexão Postgres para o checkpointer do LangGraph (veja a ADR-0001)
  pode apontar para a mesma instância Supabase, compartilhando o pool de conexões.

## Consequências

### Positivas

- O estado das chaves de demo, registros de consentimento e sessões persistem entre reinícios
  do Space e cold starts.
- O operador ganha um painel em tempo real sem construir um.
- O Postgres gerenciado demonstra um projeto de camada de dados ciente de produção.
- A camada gratuita (500 MB) é suficiente para o uso de demo de baixo volume (50-150
  revisores x 5-10 turnos).
- O pgvector está disponível para futura clusterização semântica na camada de
  melhoria.
- Unifica o armazenamento dos dados operacionais da demo sob um backend,
  evitando estado fragmentado.

### Negativas

- Adiciona uma dependência em tempo de execução de um serviço gerenciado externo. Se o Supabase estiver
  fora do ar, a aplicação da chave de demo degrada (o agente ainda serve turnos, mas
  sem controle de acesso).
- A camada gratuita do Supabase tem um limite de 500 MB; suficiente para a escala da demo, mas não
  para tráfego de produção sustentado.
- A latência de conexão do Space ao Supabase adiciona alguns milissegundos
  por turno para a escrita do log; aceitável na escala da demo.
- A chave de service-role do Supabase é uma credencial sensível; precisa ser armazenada
  como um segredo do Space, nunca embutida no código.

### Neutras

- Uma nova dependência de um cliente Supabase ou de um driver Postgres.
- As migrações de esquema tornam-se parte do checklist de implantação.
- A camada gratuita não inclui recuperação a um ponto no tempo; a perda de dados é
  possível em incidentes do lado do Supabase. Aceitável para dados de demo.

## Prós e contras das opções

### Supabase camada gratuita (Postgres)

- Bom, porque o Postgres gerenciado persiste entre reinícios do Space
- Bom, porque o painel dá ao operador visibilidade em tempo real
- Bom, porque a camada gratuita é estratégica (impulsiona a adoção da plataforma), não
  promocional
- Bom, porque o pgvector está disponível para futuras consultas semânticas
- Bom, porque demonstra uma camada de dados Postgres gerenciada mesmo na
  demo
- Ruim, porque adiciona uma dependência em tempo de execução de um serviço externo
- Ruim, porque a camada gratuita tem um teto de 500 MB

### SQLite no armazenamento persistente do Hugging Face

- Bom, porque é uma dependência sem fornecedor
- Ruim, porque o armazenamento persistente não é garantido para Spaces com SDK Docker
- Ruim, porque escritas concorrentes arriscam corrupção
- Ruim, porque não há painel do operador

### Neon camada gratuita

- Bom, porque é uma oferta de Postgres gerenciado similar
- Ruim, porque o painel é mais fraco para revisão do operador
- Ruim, porque tem menos reconhecimento de marca para revisores corporativos

### Firestore (NoSQL)

- Bom, porque é gerenciado pelo Google, com camada gratuita generosa
- Ruim, porque o modelo de documento é um encaixe ruim para o esquema relacional
- Ruim, porque não há SQL, não há FKs, não há restrições de check

### PlanetScale camada gratuita

- Ruim, porque a camada gratuita foi retirada em abril de 2024

### Turso (libSQL)

- Bom, porque é compatível com SQLite com replicação de borda
- Ruim, porque adiciona complexidade operacional para uma demo de baixo volume

## Mais informações

- Supabase camada gratuita: <https://supabase.com/pricing>
- Painel do Supabase: <https://supabase.com/dashboard>
- ADR-0007 (alvo de implantação): [ADR-0007](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0007-deployment/)
- ADR-0004 (pilha de RAG, inalterada): [ADR-0004](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0004-rag-stack/)
- ADR-0001 (orquestração, fábrica de checkpointer Postgres): [ADR-0001](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0001-orchestration/)
- ADR-0016 (escolha de armazenamento da Camada de Melhoria Contínua): [ADR-0016](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0016-continuous-improvement-storage/)
- MADR 4.0.0: <https://adr.github.io/madr/>
