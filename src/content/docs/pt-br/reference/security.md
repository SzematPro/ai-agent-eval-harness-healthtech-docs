---
title: Política de segurança
description: Modelo de ameaças, reporte de vulnerabilidades, cronograma de divulgação e higiene de dependências e segredos para a implementação de referência.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Política de segurança

## Modelo de ameaças

Esta é uma implementação de referência pública. Não há uma implantação de
produção que manipule dados reais de pacientes, nenhuma superfície de usuário
autenticada, nenhum armazenamento persistente de informação de identificação
pessoal, e nenhuma integração com qualquer sistema externo que contenha PHI. A
superfície de ataque é correspondentemente pequena. Os dois riscos que
importam, e que são tratados como dentro do escopo desta política, são o
vazamento de credenciais por meio de logs de CI ou diffs de PR (chaves de API
de provedores de LLM, provedores de embedding, backends de observabilidade) e a
comprometimento da cadeia de suprimentos via uma dependência Python maliciosa
ou por typosquatting que chegue ao lockfile.

Os riscos de segunda ordem que o design mitiga explicitamente: o agente nunca
ingere dados reais de pacientes nem mesmo em desenvolvimento (apenas personas e
diálogos gerados por LLM), o Space da demonstração ao vivo não registra o
conteúdo da conversa além do que a camada gratuita do Langfuse Cloud retém por
30 dias, cada cartão de KB carrega metadados de procedência e licença, e cada
afirmação clínica em uma saída do modelo deve citar um cartão da KB. Fora de
escopo: vulnerabilidades em um fork derivado que introduza uma implantação de
produção, vulnerabilidades na infraestrutura de provedores de LLM terceiros, e
alegações de segurança clínica sobre as saídas do modelo (o agente não é um
dispositivo médico - veja [postura regulatória](regulatory-posture.md)).

## Reportando uma vulnerabilidade

Escreva para <waldemar@szemat.pro> com `[SECURITY]` no assunto. Por favor,
inclua uma descrição, os passos de reprodução, o SHA de commit ou a tag de
release afetados e a severidade que você sugere. Confirmação de recebimento em
até 72 horas; o cronograma de triagem e remediação na primeira resposta. Não
abra uma issue pública para uma vulnerabilidade não corrigida.

A chave PGP está disponível mediante solicitação; se você precisar de uma para
o primeiro contato, peça no primeiro e-mail e ela será enviada por um canal
separado.

## Cronograma de divulgação

- **T+0**: reporte recebido.
- **T+72h**: confirmação de recebimento e decisão inicial de triagem.
- **T+30d** (alvo): correção disponível na `main`, aviso redigido.
- **T+90d** (teto): divulgação pública coordenada, salvo extensão mútua.

Crédito é oferecido pela divulgação responsável. A atribuição preferida de quem
reporta (nome, apelido, "anônimo") é honrada no aviso e nas notas de versão.

## Nunca PHI

Esta é uma restrição rígida, não uma aspiração. O repositório não deve conter
nenhuma informação de saúde protegida, nenhuma informação de identificação
pessoal, nenhum dado derivado de um registro real de paciente, nenhum dado sob
um Data Use Agreement (PhysioNet DUA, i2b2/n2c2 DUA, equivalentes), e nenhum
dataset cuja licença proíba a redistribuição (MedDialog, ChatDoctor /
HealthCareMagic-100K, MIMIC-IV, MIMIC-IV-Note, Asclepius). O cartão do dataset
em [dados](data.md) carrega a lista completa de exclusões e a justificativa.

Se um contribuidor propuser a adição de um dataset, o ônus da prova recai sobre
o PR para demonstrar (a) procedência sintética, (b) uma licença de
redistribuição permissiva e (c) ausência de risco de identificabilidade. Os PRs
que introduzam dados sem essa prova serão fechados.

## Higiene de dependências e segredos

- **O lockfile como fonte de verdade.** O lockfile é a fonte de verdade. O job
  de lint roda uma verificação de consistência do lockfile e cada sincronização
  de dependências roda em modo congelado, de modo que uma deriva do lockfile
  reprova o CI. A imagem de implantação também compila em modo congelado sem
  alternativa de re-resolução, reprovando o build da imagem de forma fechada
  diante de uma deriva.
- **O Dependabot** está habilitado para `pip` (via o manifesto do projeto
  gerenciado pelo `uv`), `github-actions` e `docker`. Os três ecossistemas são
  verificados **diariamente**, com no máximo cinco PRs abertos concorrentes por
  ecossistema.
- **Gate de CVE de dependências.** Um job de auditoria de dependências no CI
  exporta o conjunto de execução bloqueado e sem dependências de
  desenvolvimento e roda `pip-audit --strict` contra ele; qualquer
  vulnerabilidade conhecida reprova o job. Um aviso é excetuado com uma
  justificativa documentada: **CVE-2026-45829 ("ChromaToast")** é uma RCE
  pré-autenticação no servidor FastAPI standalone Python do ChromaDB
  (`chroma run`) e um vetor de coleção envenenada contra instâncias
  compartilhadas não confiáveis. Este projeto embute o ChromaDB in-process sobre
  uma coleção local autopopulada e nunca roda o servidor nem se conecta a uma
  instância estrangeira, então nenhum dos dois vetores se aplica; nenhuma
  correção upstream existe na 1.5.9. A exceção é removida quando um patch é
  entregue.
- **O escaneamento de segredos** está habilitado a nível do repositório (nativo
  do GitHub) e adicionalmente imposto por um job de CI `secret-scan`, que roda o
  `gitleaks` sobre todo o histórico da branch. Os PRs que introduzam um segredo
  de alta confiança são bloqueados no gate.
- **Os segredos de CI** (chaves de API de provedores e de observabilidade) são
  escopados a ambientes, não são expostos a builds de PR de forks e são
  rotacionados sob suspeita de vazamento.
- **Fixação de actions.** As GitHub Actions de terceiros e próprias nos
  workflows de CI, avaliação e red-team são fixadas a SHAs de commit (com a tag
  legível em um comentário ao final), de modo que uma tag movida não possa
  alterar o que roda em um job que porta segredos.
- **O hook de pre-commit** roda o `gitleaks` localmente sobre os arquivos em
  stage; instale-o por meio da configuração de pre-commit do projeto após a
  sincronização inicial de dependências.
- **Pin de dependência congelado.** O `rank-bm25` é intencionalmente fixado em
  sua versão final `0.2.2` (veja a [ADR-0023](../adr/adr-0023-hybrid-retrieval.md),
  Decisão B) - um pin deliberado de fim de vida, não desatualizado por
  negligência; o job de CI `pip-audit` ainda assim o controla por avisos.

## Postura regulatória

Veja a [postura regulatória](regulatory-posture.md) para o limite de
bem-estar/CDS da FDA que o design respeita, o guia de LMM da WHO que o projeto
acompanha e a lista explícita de coisas que o agente NÃO faz. Um reporte de
vulnerabilidade que alegue uma falha de classificação regulatória deveria
referenciar esse documento.

## Contato

<waldemar@szemat.pro>
