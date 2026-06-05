---
title: "ADR-0016: Armazenamento da Camada de Melhoria Contínua (Supabase)"
description: Por que logs de interação e sugestões de melhoria curadas pelo operador vivem no mesmo projeto Supabase que os dados operacionais da demo, com PII redigida na entrada.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0016: Armazenamento da Camada de Melhoria Contínua (Supabase)

- Status: Aceito
- Data: 2026-05-24
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

A Camada de Melhoria Contínua exige armazenamento persistente para duas
preocupações:

1. **Logs de interação**: cada turno da demo, anonimizado na entrada via redação
   de PII, com hashes de deduplicação, flags de conformidade, latência, custo e
   status de citação. Interações pendentes são clusterizadas por similaridade
   semântica e analisadas por um script em lote para produzir sugestões de
   melhoria. Retenção: 90 dias bruto, métricas agregadas 1 ano.

2. **Sugestões de melhoria**: propostas curadas pelo operador (novos cards de KB,
   refinamentos de card, casos de avaliação, ajustes de prompt, refinamentos de
   guardrail, lacunas de corpus) com um fluxo de revisão humana (pendente ->
   aprovado -> integrado). Retenção: indefinida para trilha de auditoria.

A ADR-0011 estabelece a camada gratuita do Supabase como o backend Postgres
gerenciado para dados operacionais da demo (chaves, sessões, consentimentos). As
tabelas de interação e de sugestão fazem parte do mesmo domínio de dados operacionais e
naturalmente se colocalizam com as tabelas de chaves de demo e de sessão
já provisionadas ali.

A camada de melhoria contínua tem requisitos específicos:

- PII redigida na entrada (texto bruto nunca armazenado)
- Curada pelo operador (nunca aplicada automaticamente)
- Processamento em lote (disparado pelo operador, não cron)
- Trilha de auditoria (quem aprovou o quê, quando, qual commit)
- Deduplicação anonimizada (hash sha256 da entrada redigida)

Onde devem viver os logs de interação e as sugestões de melhoria?

## Fatores da decisão

- **Colocalização com dados operacionais da demo**: o logger de interação escreve
  após cada turno; as tabelas de chaves de demo e de sessão já vivem no
  Supabase (ADR-0011). Consultas entre tabelas (por exemplo, "mostrar todas as interações
  para esta chave de demo") são naturais em um único banco de dados.
- **Redação de PII na entrada**: o backend de armazenamento nunca pode receber PII
  bruta. O módulo de redação roda antes do insert. O backend é um
  recebedor passivo de dados já anonimizados.
- **Fluxo curado pelo operador**: a tabela de sugestões de melhoria
  impõe uma restrição de check de status (pendente de revisão -> aprovado ->
  rejeitado -> integrado). Apenas o operador faz transição de status. O script em
  lote propõe, nunca aplica.
- **Hospedagem a $0/mês**: consistente com a ADR-0007 e a ADR-0011.
- **Painel consultável**: o operador revisa sugestões pendentes no
  painel do Supabase, a mesma interface usada para gerenciamento de chaves de demo.
- **Âncoras regulatórias**: GDPR Art. 25 (Privacidade por Concepção), HIPAA Safe
  Harbor (18 identificadores), Chile Ley 19.628 + Reforma 21.719 (anonimizado
  com finalidade de melhoria). A escolha de armazenamento precisa suportar esses
  requisitos.

## Opções consideradas

- **Supabase (mesmo projeto da ADR-0011)** (escolhida): as tabelas de interações e
  de sugestões de melhoria colocalizadas com chaves de demo, sessões de demo,
  etc. no mesmo Postgres de camada gratuita.
- **SQLite local no armazenamento persistente do Hugging Face**: sem fornecedor, mas
  o armazenamento persistente não é garantido para Spaces com SDK Docker, sem
  painel, sem consultas entre tabelas com chaves de demo.
- **Neon (projeto separado)**: fragmentaria os dados operacionais em
  duas instâncias de Postgres gerenciado sem benefício.
- **Firestore (NoSQL)**: encaixe ruim para esquema relacional (restrições de check de
  status, FK para chaves de demo, JSONB para flags de conformidade).
- **Arquivos CSV/JSONL no armazenamento persistente do Hugging Face**: somente anexação, sem
  capacidade de consulta, sem painel, sem transições de status para sugestões.

## Resultado da decisão

Opção escolhida: **Supabase camada gratuita, mesmo projeto estabelecido na
ADR-0011**, com as tabelas de interações e de sugestões de melhoria
implantadas ao lado das tabelas operacionais da demo.

O logger de interação se conecta ao grafo de execução do agente após o
nó de emissão de auditoria. Em cada turno ele:

1. Recebe o contexto completo do turno (entrada, resposta, citações, flags de
   conformidade, latência, custo).
2. Aplica redação de PII tanto na entrada do usuário QUANTO no texto da
   resposta (defesa em profundidade).
3. Computa um hash sha256 da entrada redigida para deduplicação.
4. Insere na tabela de interações (assíncrono, não bloqueante).
5. Se o Supabase estiver inacessível, registra localmente e avisa na UI; nunca bloqueia
   o fluxo do agente.

O script de melhoria em lote roda na máquina local do operador (não no
Space). Ele lê interações pendentes, clusteriza por similaridade
semântica, gera sugestões via análise de LLM e as persiste na
tabela de sugestões de melhoria com status "pendente de revisão". O
operador revisa no painel do Supabase e aprova/rejeita manualmente.

A restrição de check de status das sugestões de melhoria impõe: pendente
de revisão | aprovado | rejeitado | integrado. Apenas o operador pode
fazer transição de status. O script em lote apenas insere em "pendente de revisão". Nenhuma
mudança automatizada de status existe.

### Confirmação

- A tabela de interações tem colunas com PII redigida, um hash de deduplicação e uma
  coluna JSONB de flags de conformidade.
- A tabela de sugestões de melhoria tem uma restrição de check de status e
  campos de revisão do operador.
- Uma chave estrangeira vincula cada interação à sua chave de demo (consulta entre tabelas:
  "todas as interações para esta chave").
- Uma chave estrangeira vincula o uso de turnos de demo à sua interação (rastreamento de custo
  vinculado ao log de interação).
- O script em lote roda localmente e conecta ao Supabase via uma
  chave de service-role de uma variável de ambiente.
- Se o registro de melhoria estiver desabilitado para uma chave, o logger pula essa chave
  inteiramente.

## Consequências

### Positivas

- Todos os dados operacionais (chaves, sessões, interações, sugestões)
  colocalizados em um banco de dados. Consultas entre tabelas são naturais.
- O operador usa um único painel para todos os fluxos de revisão (gerenciamento de
  chaves + sugestões de melhoria).
- A redação de PII na entrada significa que o banco de dados nunca recebe PII bruta.
  Verificável: uma consulta por qualquer marcador não redigido na coluna de entrada
  anonimizada precisa retornar zero linhas.
- A camada gratuita (500 MB) é suficiente para demo de baixo volume (50-150 revisores x
  5-10 turnos = ~1000 linhas, bem abaixo do teto).
- O pgvector está disponível para clusterização semântica de interações no
  script em lote (reutilizando o mesmo modelo de embedding do RAG).

### Negativas

- Adiciona mais duas tabelas à superfície de migração do Supabase.
- O script em lote exige uma chave de service-role com acesso de escrita tanto à
  tabela de interações quanto à de sugestões de melhoria.
- Se o Supabase estiver fora do ar, o registro de interação degrada graciosamente (log
  local + aviso) mas os dados são perdidos para esses turnos.

### Neutras

- A tabela de interações tem uma política de retenção de 90 dias imposta pelo
  operador (manual ou via um script agendado). A camada gratuita do Supabase
  não impõe retenção automaticamente.
- As sugestões de melhoria são retidas indefinidamente como uma trilha de auditoria.
- O script em lote é disparado pelo operador, nunca automatizado. Isso é por
  concepção para IA regulada: o aprendizado online amplifica viés sem
  governança.

## Prós e contras das opções

### Supabase (mesmo projeto da ADR-0011)

- Bom, porque a colocalização habilita consultas entre tabelas (chaves + sessões +
  interações + sugestões)
- Bom, porque um único painel serve todos os fluxos do operador
- Bom, porque a redação de PII na entrada é verificável em um só lugar
- Bom, porque o pgvector está disponível para clusterização semântica
- Bom, porque é $0/mês, consistente com a ADR-0007 e a ADR-0011
- Ruim, porque adiciona superfície de migração para mais duas tabelas
- Ruim, porque o script em lote precisa de uma chave de service-role

### SQLite local no armazenamento persistente do Hugging Face

- Bom, porque é sem fornecedor
- Ruim, porque o armazenamento persistente não é garantido para SDK Docker
- Ruim, porque não há painel para revisão do operador
- Ruim, porque não há consultas entre tabelas com chaves de demo
- Ruim, porque há riscos de escrita concorrente

### Neon (projeto separado)

- Bom, porque é Postgres gerenciado
- Ruim, porque fragmenta os dados operacionais em duas instâncias
- Ruim, porque não há benefício sobre a colocalização

### Firestore (NoSQL)

- Bom, porque é gerenciado pelo Google
- Ruim, porque é um encaixe ruim para esquema relacional e transições de status

### CSV/JSONL no armazenamento persistente do Hugging Face

- Bom, porque é o armazenamento somente anexação mais simples possível
- Ruim, porque não há capacidade de consulta
- Ruim, porque não há transições de status para sugestões
- Ruim, porque não há painel

## Mais informações

- Supabase camada gratuita: <https://supabase.com/pricing>
- ADR-0011 (camada de dados, Supabase para dados operacionais da demo): [ADR-0011](./adr-0011-data-layer-supabase.md)
- ADR-0007 (alvo de implantação): [ADR-0007](./adr-0007-deployment.md)
- GDPR Art. 25 (Proteção de Dados por Concepção e por Padrão): <https://gdpr-info.eu/art-25-gdpr/>
- Desidentificação HIPAA Safe Harbor: <https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html>
- Chile Ley 19.628 + Reforma 21.719: <https://www.bcn.cl/leychile/navegar?idNorma=4125>
- MADR 4.0.0: <https://adr.github.io/madr/>
