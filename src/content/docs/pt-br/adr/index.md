---
title: Registros de Decisão de Arquitetura
description: Índice dos registros de decisão de arquitetura por trás da implementação de referência do AI Agent Eval Harness.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Registros de Decisão de Arquitetura

Esta seção reúne os Registros de Decisão de Arquitetura (ADRs) da
implementação de referência `ai-agent-eval-harness-healthtech`. Cada ADR
captura uma decisão arquiteturalmente significativa que é difícil ou
cara de reverter e explica por que ela foi tomada.

## Convenções

- **Formato**: [MADR 4.0.0](https://adr.github.io/madr/). O template
  canônico é [o template de ADR](./adr-template.md). Copie-o para qualquer
  nova decisão; não invente estruturas ad-hoc.
- **Ciclo de vida do status**: `Proposed` -> `Accepted` -> `Superseded`. Um
  ADR substituído nunca é excluído; ele é renomeado para preservar o registro
  histórico e aponta adiante para o ADR que o substitui.
- **Nomenclatura de arquivos**: `ADR-NNNN-kebab-title`, sequência de quatro
  dígitos preenchida com zeros à esquerda, título em kebab minúsculo. Reserve o
  próximo número ao iniciar um rascunho para evitar condições de corrida.
- **Escopo de um ADR**: uma decisão por arquivo. Se um texto precisar
  reabrir a discussão de um ADR anterior, registre um novo ADR e marque o antigo
  como `Superseded by ADR-NNNN`.
- **Tom**: inglês técnico, sem texto de marketing, sem emojis, sem
  travessões. Toda afirmação sobre framework / fornecedor / versão cita uma
  fonte primária (notas de versão, documentação oficial, registro da FDA, etc.).

## Índice

| ID | Título | Status | Resumo em uma linha |
|----|-------|--------|------------------|
| [ADR-0001](./adr-0001-orchestration.md) | Framework de orquestração | Accepted | LangGraph 1.x em vez de CrewAI, Microsoft Agent Framework, Claude Agent SDK, Pydantic AI, AutoGen. Grafo de seis nós com um nó HITL `review_response` opcional via `interrupt()` e uma fábrica de checkpointer `MemorySaver` / `AsyncPostgresSaver`. |
| [ADR-0002](./adr-0002-llm-vendor-abstraction.md) | Abstração de fornecedor de LLM | Accepted | Um Protocol `LLMClient` fino sobre adaptadores LangChain mais Groq / Cerebras diretos via REST compatível com OpenAI, alternado por uma variável de ambiente `LLM_PROVIDER`. |
| [ADR-0003](./adr-0003-eval-harness.md) | Harness de avaliação | Accepted; substituído em parte pelo ADR-0009 | Núcleo artesanal em pytest + DeepEval + Ragas + Phoenix + Promptfoo. A escolha do modelo juiz (Anthropic Claude Haiku) é substituída pelo ADR-0009. |
| [ADR-0004](./adr-0004-rag-stack.md) | Stack de RAG | Accepted | Chroma embarcado como primário com `BAAI/bge-small-en-v1.5` como embedder padrão usando recuperação assimétrica consciente de instruções; Qdrant Cloud e Voyage AI documentados como alternativas em nuvem. |
| [ADR-0005](./adr-0005-guardrails.md) | Guardrails e postura regulatória | Accepted | Classificador de escopo, templates de recusa e um roteador de escalonamento determinístico de sete categorias como módulos de primeira classe; contrato de design = linha de orientação FDA 2026 General Wellness / CDS Software. |
| [ADR-0006](./adr-0006-observability.md) | Stack de observabilidade | Accepted | Formato de transmissão OpenTelemetry + OpenInference; Langfuse Cloud Hobby para a demo ao vivo, Phoenix auto-hospedado para execuções de avaliação, Pydantic Logfire documentado como alternativa. |
| [ADR-0007](./adr-0007-deployment.md) | Alvo de implantação | Accepted | Hugging Face Spaces, Docker SDK, nível gratuito CPU Basic; Render Web Service documentado como a segunda escolha do operador. Camada de resiliência de implantação: rate limiter por sessão, fallback de provedor Groq -> Cerebras -> Anthropic, cache de resposta com TTL curto. |
| [ADR-0008](./adr-0008-licensing.md) | Licença de código | Accepted | Licença de código alterada de MIT para Apache 2.0 na v1.0.0. |
| ADR-0009 | Modelo juiz da avaliação | Accepted | O juiz da avaliação é o Cerebras (`gpt-oss-120b`); substitui a escolha do juiz Anthropic Claude Haiku no ADR-0003. |
| ADR-0010 | Streaming do grafo de execução do agente para a UI | Accepted | O Agent Execution Graph da v1.1 transmite eventos por nó para a SPA via server-sent events, com adesão opcional por negociação de conteúdo via cabeçalho `Accept`; o contrato JSON `/chat` da v1.0.0 permanece inalterado. Não substitui nada. |
| ADR-0011 | Camada de dados (Supabase para dados operacionais da demo) | Accepted | Postgres gerenciado no nível gratuito do Supabase para chaves da demo, interações, sugestões de melhoria, solicitações de chaves da demo, consentimentos de chaves da demo, sessões da demo e uso de turnos da demo. O RAG continua sendo Chroma (ADR-0004, inalterado). |
| ADR-0012 | Detecção de fora de domínio em texto livre | Accepted | Guarda de escopo em dois estágios: um classificador baseado em regras (regex + palavra-chave) admite turnos dentro de domínio e recusa fora de escopo de alta confiança; um juiz LLM resolve turnos ambíguos de meio-termo. Falha aberta quando o juiz está indisponível. |
| ADR-0013 | Estratégia de expansão do corpus | Accepted | Estratégia de acréscimo ao existente: novos domínios adicionados sobre o corpus da v1.0.0 em vez de substituí-lo. Novos cartões de KB e turnos de avaliação ampliam a cobertura em oito domínios de adesão a medicamentos; paridade de localidade mantida entre en / es-419 / pt-BR. |
| ADR-0014 | Extensão de voz (ElevenLabs TTS + STT) | Accepted | ElevenLabs `eleven_multilingual_v2` para TTS sob demanda com clique para reproduzir e mapeamento de voz por localidade; ElevenLabs Scribe para STT; metadados de áudio no sidecar SSE (contrato JSON inalterado); voz DESLIGADA por padrão. Agente de voz full-duplex adiado. |
| ADR-0015 | Fallback em cascata de provedor de LLM | Accepted | Cascata tipada de erros transitórios Groq -> Cerebras -> Anthropic. Um 4xx que não seja 429 não é repetido (preservação de cota). O provedor que respondeu é etiquetado em `metadata` para atribuição honesta de custo. |
| ADR-0016 | Armazenamento da Camada de Melhoria Contínua | Accepted | Logs de interação e sugestões de melhoria coalocados no mesmo projeto Postgres gerenciado (ADR-0011). PII redigida na entrada. Curado pelo operador, nunca aplicado automaticamente. |
| ADR-0017 | Camada de resiliência de implantação no nível gratuito | Accepted | Rate limiter de janela deslizante em processo (IP consciente de proxy) + cache de resposta com TTL, ambos limitados e residentes em memória. Sem Redis, sem serviço externo. Design de worker único; escalonamento multi-worker exige estado externo. |
| ADR-0018 | Voz DESLIGADA por padrão - política de segurança | Accepted | O alternador de voz vem DESLIGADO por padrão na primeira visita. A adesão é persistida no `localStorage`. Postura de consentimento em primeiro lugar; um aviso de rodapé "Áudio NÃO retido" fica visível independentemente do estado do alternador. Paridade de localidade entre en / es-419 / pt-BR. |
| ADR-0019 | Invariante de dados exclusivamente sintéticos + lista de exclusão | Accepted | Corpus de avaliação 100% sintético a partir de fontes de domínio público (MedlinePlus, DailyMed, WHO EML, rótulos da FDA). Lista de exclusão explícita: MIMIC, ChatDoctor, MedDialog, n2c2/i2b2. Ônus da prova no PR para qualquer novo conjunto de dados (licença + procedência + compatibilidade). |
| ADR-0020 | Resposta estruturada do agente (esquema Pydantic + modo JSON do LLM) | Accepted | O agente emite uma resposta estruturada validada por Pydantic via modo JSON do LLM em vez de prosa livre, de modo que os avaliadores de recusa / escalonamento leiam campos explícitos em vez de inferir intenção a partir do texto. |
| ADR-0021 | Recuperação de documento pai (chunking de subcartão, citação em nível de cartão) | Accepted | Os cartões de KB são divididos em passagens de subcartão para embedding/recuperação e, em seguida, deduplicados de volta para o cartão pai para citação, melhorando o recall enquanto mantém as citações em nível de cartão. |
| ADR-0022 | Streaming de tokens (stream customizado do LangGraph + cliente de streaming) | Accepted | Deltas de LLM por token são transmitidos para a SPA pela superfície SSE existente (ADR-0010), de modo que a mensagem do assistente seja renderizada enquanto é gerada, em vez de após um buffer de resposta completa. |
| ADR-0023 | Recuperação híbrida (BM25 + densa + RRF + rerank com cross-encoder) | Accepted | A recuperação somente densa é substituída por um pipeline de três estágios condicionado por flag - geradores léxico (BM25) + denso em paralelo, fusão por reciprocal-rank e, em seguida, rerank com cross-encoder - degradando graciosamente para o caminho denso anterior. |
| ADR-0024 | Medição de recall de recuperação (recall@k / hit@k / nDCG@k) | Accepted | A qualidade da recuperação é medida diretamente com recall@k / hit@k / nDCG@k contra cartões relevantes rotulados, desacoplando a pontuação de recuperação de métricas acopladas à geração, como cobertura de citação. |
| ADR-0025 | Enriquecimento de citação no lado do servidor | Accepted | O modelo `Citation` ganha `source_url`, `source_license` e `retrieved_score` opcionais, enriquecidos no lado do servidor no nó de encerramento, de modo que o popover de citação da SPA renderize sem um segundo ida e volta à KB. |

## Registro de substituições

- **ADR-0009 substitui o ADR-0003 em parte** (2026-05-20): a escolha do
  modelo juiz da avaliação. O ADR-0003 nomeou o Anthropic Claude Haiku; o ADR-0009
  registra que o harness executa um juiz Cerebras. O ADR-0003 mantém seu
  status `Accepted` e seu corpo original como registro histórico; apenas
  a linha do modelo juiz é substituída.

## Referências

- [MADR: Markdown Any Decision Records](https://adr.github.io/madr/)
- [Documenting Architecture Decisions, Michael Nygard, 2011](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
