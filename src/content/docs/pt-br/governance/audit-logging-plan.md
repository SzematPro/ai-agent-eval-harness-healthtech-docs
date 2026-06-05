---
title: Plano de registro de auditoria
description: O que a implementação de referência registra hoje via OpenTelemetry, o que ela não registra e o que um deployment regulado precisaria para um registro de nível de auditoria.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Plano de registro de auditoria

> Documenta as capacidades de registro de auditoria da implementação de referência
> `ai-agent-eval-harness-healthtech` e os requisitos para um registro de auditoria de nível de produção.
> Este plano cobre o que é registrado hoje, o que não é registrado e o que um deployment
> regulado precisaria.
>
> Leia em conjunto com o [design de observabilidade](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0006-observability/) e a
> [avaliação de prontidão para HIPAA](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/hipaa-readiness/).

## Arquitetura de registro

### Infraestrutura de registro atual

A implementação de referência usa o OpenTelemetry (OTel) com as convenções semânticas do
OpenInference como espinha dorsal de observabilidade. Cada operação significativa no pipeline
do agente é encapsulada em um span do OTel.

| Componente | O que é registrado | Atributos do span |
|-----------|---------------|-----------------|
| **nó intake** | Início do turno, ID da conversa, configuração regional | `conversation.id`, `interaction.locale` |
| **nó guardrail_pre** | Decisões de guardrail por verificação (escopo, PII, escalonamento, extração) | `guardrail.decision`, `guardrail.category`, `guardrail.reason`, aprovado/reprovado por verificação |
| **nó retrieve_context** | Consulta de recuperação, IDs dos cards recuperados, pontuações de similaridade | `retrieval.query_hash`, `retrieval.card_ids`, `retrieval.similarity_scores` |
| **nó generate_response** | Provedor de LLM, modelo, uso de tokens, latência | `llm.provider`, `llm.model`, `llm.tokens_in`, `llm.tokens_out`, `llm.duration_ms` |
| **nó guardrail_post** | Verificações de guardrail pós-geração (citação, estabilidade de persona) | `guardrail.citation_check`, `guardrail.persona_stability` |
| **nó closing** | Conclusão do turno, resumo geral dos guardrails | `turn.status`, `turn.duration_ms`, `turn.guardrail_summary` |
| **redação de PII** | Eventos de redação, tipos de padrão correspondentes | `pii.redacted`, `pii.pattern_type` |

### Invariante de privacidade

Uma restrição rígida imposta por um teste de unidade dedicado:
**o texto da mensagem do usuário nunca é escrito em nenhum span, log ou atributo de trace**. Essa
invariante garante que os dados de observabilidade não possam ser usados para reconstruir conversas dos usuários.

### Sinks de observabilidade

| Sink | Propósito | Retenção | Acesso |
|------|---------|-----------|--------|
| **Langfuse Cloud Hobby** | Observabilidade da demo ao vivo; 50K observações/mês | 30 dias | Dashboard do Langfuse (autenticado) |
| **Phoenix auto-hospedado** | Observabilidade das execuções de eval; profile do Docker Compose | Baseada em sessão (limpa ao reiniciar) | Interface do Phoenix (local) |
| **Formato de fio do OTel** | Formato de span portátil e neutro em relação a fornecedores | N/A (apenas formato de fio) | Exportável para qualquer backend compatível com OTel |

## O que é registrado para auditoria hoje

| Evento | Registrado | Detalhes |
|-------|--------|---------|
| Início/conclusão do turno do agente | Sim | ID do turno, duração, ordem de execução dos nós |
| Decisões de guardrail | Sim | Aprovado/reprovado por verificação, motivo, categoria |
| Resultado da classificação de escopo | Sim | Dentro do escopo / fora do escopo / categoria de recusa |
| Gatilhos de escalonamento | Sim | Categoria aguda correspondente, modelo de escalonamento utilizado |
| Eventos de recusa | Sim | Slug do modelo de recusa, categoria, configuração regional |
| Eventos de redação de PII | Sim | Tipo de padrão correspondente, se houve redação (sim/não) |
| Invocação do LLM | Sim | Provedor, modelo, uso de tokens, latência |
| Resultados de recuperação | Sim | IDs dos cards recuperados, pontuações de similaridade |
| Verificação de citações | Sim | Aprovado/reprovado na verificação de citação, IDs dos cards citados |
| Contabilização de custo/latência | Sim | Contagens de tokens por turno, detalhamento de latência |

## O que NÃO é registrado para auditoria hoje

| Evento | Por que não | Requisito de produção |
|-------|---------|----------------------|
| Conteúdo da mensagem do usuário | Invariante de privacidade: o texto do usuário nunca é registrado | Em produção pode ser necessário registrar o conteúdo do usuário sob acesso controlado; exige criptografia, controles de acesso e políticas de retenção |
| Conteúdo da resposta do LLM | Mesmo princípio de privacidade aplicado às saídas | Em produção pode ser necessário registrar as respostas para garantia de qualidade; exige os mesmos controles que o conteúdo do usuário |
| Identidade/autenticação do usuário | Nenhuma autenticação de usuário na demo; acesso anônimo | Em produção seria necessário registrar a identidade do usuário para controle de acesso e trilha de auditoria |
| Ciclo de vida da sessão | Nenhuma sessão persistente na demo (checkpointer em memória) | Em produção seria necessário registrar início/fim da sessão, duração e rotatividade |
| Mudanças de configuração | Nenhuma mudança de configuração em tempo de execução na demo | Em produção seria necessária uma trilha de auditoria de mudanças de configuração com quem/o quê/quando |
| Ações administrativas | Nenhuma interface de administração na demo | Em produção seria necessário registrar ações administrativas (mudanças de modelo, atualizações de limiar, gestão de usuários) |
| Exportação / acesso a dados | Nenhuma capacidade de exportação de dados | Em produção seria necessário registrar eventos de acesso, exportação e compartilhamento de dados |

## Estado atual

A implementação de referência fornece registro de nível de observabilidade, não registro de nível de auditoria.
A distinção é importante:

- **Registro de observabilidade** (o que existe): projetado para depuração, monitoramento de desempenho
  e insight de desenvolvimento. Os spans são efêmeros, retidos por 30 dias (Langfuse) ou
  somente por sessão (Phoenix), e não atendem aos requisitos de evidência de adulteração, retenção ou controle
  de acesso do registro de auditoria em ambientes regulados.

- **Registro de auditoria** (o que seria necessário): projetado para conformidade regulatória, reconstrução
  de incidentes e defensabilidade jurídica. Exige armazenamento à prova de adulteração, retenção de
  longo prazo (6 anos para HIPAA), controles de acesso baseados em papéis e interfaces de consulta para
  auditores.

Os spans do OTel com as convenções semânticas do OpenInference fornecem o formato de fio correto
e a estrutura de atributos para o registro de auditoria. A lacuna está na infraestrutura de sink: nenhum
armazenamento à prova de adulteração, nenhuma política de retenção definida, nenhum controle de acesso e nenhuma interface
de consulta além dos dashboards de observabilidade.

Pontos fortes principais do registro atual:

1. **Cobertura abrangente**: Cada nó no pipeline do agente emite spans com
   atributos estruturados. Nenhuma operação acontece sem ser registrada.
2. **Privacidade desde o design**: O texto do usuário é excluído dos spans por invariante, não por
   convenção. Um log de auditoria de produção precisaria readicionar o texto do usuário sob condições
   controladas.
3. **Formato portátil**: O formato de fio do OTel é neutro em relação a fornecedores. Os spans podem ser roteados para qualquer
   backend (Elasticsearch, Datadog, Splunk, um armazenamento de auditoria personalizado) sem alterar a
   instrumentação.
4. **Convenções semânticas**: As convenções do OpenInference fornecem um schema de atributos
   padronizado para aplicações de LLM, tornando os logs interpretáveis entre ferramentas e equipes.

## Caminho até produção

O registro de auditoria de nível de produção exigiria:

1. **Armazenamento de logs à prova de adulteração**: Armazenamento de logs append-only com verificação
   criptográfica de integridade (por exemplo, encadeamento de hash, árvores de Merkle ou armazenamento imutável
   de provedor de nuvem); detecção de qualquer modificação ou exclusão de log

2. **Políticas de retenção**: Retenção de 6 anos para dados regulados pela HIPAA; requisitos de retenção
   específicos da jurisdição; imposição automatizada de retenção e exclusão segura no vencimento

3. **Controles de acesso**: Acesso baseado em papéis aos logs de auditoria; separação entre equipes
   operacionais (que podem visualizar os logs) e equipes de segurança (que podem verificar a integridade dos logs);
   auditoria do próprio acesso aos logs de auditoria

4. **Interface de consulta**: Log de auditoria pesquisável com filtros por intervalo de tempo, usuário,
   tipo de evento, decisão de guardrail e resultado; relatórios exportáveis para auditorias de conformidade

5. **Reconstrução da linha do tempo de incidentes**: Capacidade de reconstruir uma linha do tempo completa de
   eventos para qualquer conversa ou usuário; cruzamento de referências entre decisões de guardrail,
   invocações do LLM e resultados de recuperação

6. **Registro de conteúdo do usuário (com controles)**: Se o conteúdo da mensagem do usuário e da resposta precisar
   ser registrado para garantia de qualidade ou fins regulatórios: criptografia em repouso,
   descriptografia com controle de acesso, acesso de finalidade limitada e procedimentos de exclusão

7. **Alertas sobre eventos de auditoria**: Alertas em tempo real sobre padrões anômalos (por exemplo, pico
   nas taxas de recusa, falhas de redação de PII, gatilhos de escalonamento); integração com
   fluxos de resposta a incidentes

8. **Relatórios de conformidade**: Geração automatizada de relatórios de conformidade a partir dos dados do log de
   auditoria; pacotes de evidências para auditorias regulatórias; dashboards de resumo para os responsáveis pela conformidade

9. **Exportação e portabilidade de logs**: Capacidade de exportar logs de auditoria em formatos padrão
   para ferramentas externas de auditoria, submissões regulatórias ou migração entre backends de log

## Veja também

- [Design de observabilidade](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0006-observability/) -- design de observabilidade
- [Avaliação de prontidão para HIPAA](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/hipaa-readiness/) -- avaliação de prontidão para HIPAA
- [Redação de PII](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/pii-redaction/) -- documentação de redação de PII
- [Prontidão para ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/iso42001-soc2/) -- prontidão para ISO 42001 / SOC 2
- [Plano de detecção de deriva](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/drift-detection-plan/) -- plano de detecção de deriva
