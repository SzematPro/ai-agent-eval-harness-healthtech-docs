---
title: "ADR-0024: Medição de recall da recuperação"
description: Por que um avaliador determinístico focado apenas na recuperação reporta hit@k, recall@k e nDCG@k sobre os cartões recuperados, isolado da geração e da citação.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0024: Medição de recall da recuperação - recall@k / hit@k / nDCG@k

- Status: Aceito
- Data: 2026-05-29

## Contexto

O pipeline de recuperação híbrida ([ADR-0023](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0023-hybrid-retrieval/)) apresenta um conjunto top-`k` de cartões
pais por turno. Até agora, a qualidade da recuperação era observada apenas de forma indireta, por
métricas que acoplam recuperação com geração: um avaliador de cobertura de citação avalia
se a *resposta* citou um cartão esperado, e um avaliador de fundamentação
apoiado em juiz avalia se a *resposta* é respaldada pelo contexto
recuperado. Nenhum deles isola o passo de recuperação: uma falha de recuperação e uma falha
de citação são indistinguíveis, e uma regressão na qualidade da classificação é invisível
até arrastar uma métrica posterior para baixo.

Esta ADR registra as decisões para um avaliador determinístico, focado apenas na recuperação,
que avalia se a recuperação colocou o(s) cartão(ões) relevante(s) no top-`k`,
independentemente do que o LLM fez com eles em seguida.

## Decisão

Adicionar um avaliador determinístico, elegível para portão de PR, que lê os artefatos que o
runner já captura (o contexto recuperado e o campo gold disjuntivo do caso de avaliação
`must_cite_one_of`) e emite três métricas por
caso que carrega gold. `k` é o top-k de recuperação configurado (padrão 4). A identidade do
cartão é o id do pai onde presente, caso contrário o id do chunk (após a expansão para o pai, o id
é igual ao id do cartão, consistente com o avaliador de correção de citação). As métricas
são calculadas sobre os ids **recuperados**, nunca os ids citados.

As escolhas fixadas:

- **(A) Tríade de métricas.** Emitir `retrieval_hit_at_k`, `retrieval_recall_at_k`
  e `retrieval_ndcg_at_k`.
  - `hit@k` = `1.0` se ao menos um cartão gold estiver no top-k. Este é o
    sinal de sucesso principal porque `must_cite_one_of` é **disjuntivo** -
    o contrato de citação exige apenas um dos cartões listados.
  - `recall@k` = `|gold ∩ topk| / |gold|`. Reportado, mas tratado como um
    **limite inferior conservador**: sob gold disjuntivo, apresentar um de dois
    cartões aceitáveis pontua 0.5, mesmo que o contrato seja cumprido. O conjunto de métricas
    nomeia "recall@4", então é emitido; a ressalva do limite inferior está documentada
    aqui e no relatório.
  - `nDCG@k` = nDCG de ganho binário, o único sinal sensível à classificação (a razão pela
    qual a [ADR-0023](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0023-hybrid-retrieval/) adicionou um reranker cross-encoder). Cada cartão gold tem relevância 1
    (os rótulos não carregam relevância graduada); `DCG = Σ 1/log2(rank+2)` sobre
    as posições top-k que contêm um cartão gold (rank com base 0); `IDCG` soma o mesmo
    sobre `min(|gold|, k)` posições ideais, de modo que o nDCG nunca excede 1.0 quando os cartões gold
    não cabem todos no top-k.
- **(B) Contrato de gold vazio.** Um caso com um `must_cite_one_of` vazio
  contribui com **nenhuma chave de score** (o avaliador retorna um resultado vazio). O
  agregador faz a média sobre as chaves que estão *presentes*, de modo que a omissão restringe a
  média do corpus ao subconjunto que carrega gold e produz um `n` honesto. Retornar um
  `1.0` vacuoso (como o avaliador de cobertura de citação faz para seu próprio portão) inflaria a
  média entre os casos de capacidade e os casos de nenhuma correspondência que não têm
  cartão relevante. Esta é a decisão determinante.
- **(C) Denominador.** Pontuar cada caso que **carrega gold**, com chave na presença
  do rótulo em vez do tipo de caso (de modo que um caso adversarial que legitimamente
  carregue um cartão gold ainda seja avaliado - o cartão certo deve ser recuperado
  mesmo quando a resposta precisa recusar). O relatório separa golden-vs-
  adversarial e por localidade, cada um com seu próprio `n`. Os deltas entre localidades são
  apresentados como indicativos, não testados quanto à significância (corpora de localidade pequenos,
  desiguais e de autoria independente).
- **(D) Postura de portão: relatório primeiro.** A métrica flui para os agregados e
  é renderizada (markdown + stdout) com `n`. Um knob de piso absoluto ao vivo (um sinalizador de limiar
  da CLI de avaliação para recall e um para hit, com parâmetros de palavra-chave de portão que
  aceitam um float ou nenhum) é entregue, mas tem como padrão **inativo**, espelhando o
  precedente da similaridade mínima (entregar a métrica, adiar a virada estrita até que uma
  linha de base ao vivo justifique um número). Um teste de integridade do conjunto de dados (cada id gold
  resolve para um cartão real da KB) gatilha ativamente a CI, de modo que um bug de rotulagem é capturado
  e não pode se passar por uma falha de recuperação.
- **(E) A CLI de avaliação é sem store; o portão ao vivo é um teste de integração.** A
  CLI roda o grafo do agente sem store, então o grafo descarta o nó de recuperação
  e o contexto recuperado fica vazio para cada caso. Os agregados de recuperação da CLI
  são, portanto, vacuosos (assim como os preexistentes avaliadores de cobertura de
  citação / fundamentação por juiz - uma lacuna preexistente, não introduzida
  aqui). O portão de recall da recuperação AO VIVO é um teste de integração de ponta a ponta,
  que ingere a KB real de 36 cartões em um Chroma temporário com o embedder BGE real,
  roda os casos que carregam gold pelo nó de recuperação densa real
  e afirma um piso de recall conservador (apenas denso é um limite inferior conservador
  para a superfície híbrida; o reranker de 568MB fica desligado). Conectar um store
  à CLI de avaliação - para que o portão da CLI também meça recuperação / citação /
  fundamentação - é um acompanhamento rastreado (fora do escopo para um
  incremento de avaliador de recall; também viraria as métricas de juiz com portão rígido de vacuosas para
  ao vivo na varredura por chave).

## Alternativas consideradas

### A1: apenas recall@k (o nome literal da métrica)

- Contras: reporta erroneamente o gold disjuntivo (1-de-2 cartões aceitáveis pontua 0.5, uma
  penalidade falsa para uma recuperação adequada). Rejeitada como a métrica única/principal;
  mantida como um limite inferior reportado junto ao hit@k.

### A2: apenas hit@k

- Prós: corresponde exatamente ao contrato disjuntivo.
- Contras: cego à classificação (gold na posição 4 pontua o mesmo que a posição 1), de modo que uma
  regressão do reranker é invisível. Rejeitada como a métrica única; mantida como a
  principal, complementada pelo nDCG@k para a qualidade da classificação.

### A3: relevância graduada / MRR

- Rejeitada: os rótulos não carregam relevância graduada para modelar, e o MRR é
  monotonicamente equivalente ao nDCG sobre gold singleton e mal definido sob
  disjunção - uma terceira chave correlacionada sem sinal adicional.

### A4: portão (bloquear CI) em um piso de recall neste incremento

- Contras: nenhuma linha de base ao vivo existe ainda; o conjunto gold é um limite inferior disjuntivo;
  o `n` por localidade chega a ser tão baixo quanto 29. Um piso chutado seria instável ou inútil.
  Rejeitada em favor do relatório primeiro; a virada do piso é um acompanhamento focado
  assim que existir uma execução de linha de base.

### A5: confiar no caminho de tolerância a regressão para "garantir o portão" da métrica

- Rejeitada: esse caminho é inerte em tempo de execução. O portão é sempre chamado sem
  agregados de linha de base; nenhum arquivo de linha de base é carregado ou gravado em lugar algum (um
  arquivo de linha de base + passo de CI foi escopado antes, mas apenas os parâmetros de portão chegaram a
  ser entregues). Colocar uma métrica "nos agregados" portanto não garante portão algum hoje. O
  knob de piso absoluto é o único mecanismo ao vivo; conectar um arquivo de linha de base versionado
  é um trabalho separado e maior, fora do escopo aqui.

## Consequências

### Positivas

- A qualidade da recuperação é observável isoladamente; uma falha de recuperação não é mais
  confundida com uma falha de citação ou de fundamentação.
- A tríade reporta tanto a taxa de sucesso alinhada ao contrato (hit@k) quanto a qualidade
  da classificação (nDCG@k), com o recall@k como um número familiar de limite inferior.
- O contrato de gold vazio mantém a média do corpus honesta e expõe o `n`.

### Negativas

- O recall@k sub-reporta sob gold disjuntivo; os leitores devem usar o hit@k como o
  número de sucesso. Documentado, mas uma leitura equivocada previsível.
- Os números por localidade (es-419 / pt-BR, n=29) são ruidosos; utilizáveis para relatório
  e detecção grosseira de regressão, não para comparação testada quanto à significância.

### Neutras

- Nenhuma nova dependência (apenas matemática da biblioteca padrão). O avaliador é determinístico
  e adiciona custo desprezível à varredura de avaliação.
- O piso ativo é adiado; "o portão inclui a métrica" é satisfeito
  por computação + renderização + o knob entregue-mas-inativo + o teste ativo de
  integridade do conjunto de dados.

## Notas de implementação

- Os helpers de recall@k / hit@k / nDCG@k são funções puras sobre sequências de ids;
  eles deduplicam os ids classificados pela primeira ocorrência antes de aplicar o corte de classificação,
  de modo que uma duplicata perdida não possa contar duplamente um ganho ou esconder um cartão posterior.
- O avaliador de recall da recuperação resolve `k` a partir do top-k de recuperação configurado
  (um override de construtor existe para testes determinísticos) e é registrado no
  bloco padrão de avaliadores determinísticos do runner.
- O `n` é derivado no escritor de relatório / CLI (contagem de relatórios que carregam as
  chaves de recuperação), não no tipo de retorno do agregador.

## Trabalho futuro

- **Virar o piso.** Assim que um agregado de linha de base ao vivo for observado, definir um
  limiar de recall baseado em evidências (alvo ≈ 0.85, paralelo ao
  piso de fidelidade; finalizado como observado-menos-folga) em um acompanhamento focado,
  irmão da elevação do padrão de similaridade mínima.
- **Desacoplar relevância de suficiência de citação.** Se os números de recall justificarem,
  adicionar um campo explícito de ids-relevantes separado do disjuntivo
  `must_cite_one_of`, e expandir a cobertura de gold sintético para es-419 / pt-BR
  rumo à paridade com en ([ADR-0019](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0019-synthetic-only-data-invariant/) somente sintético).
- **Conectar um arquivo de linha de base versionado + passo de restauração/atualização na CI** para tornar o
  caminho de tolerância a regressão ativo para todas as dimensões de agregado.

## Reversão

Remover o avaliador de recall da recuperação do conjunto padrão do runner; a métrica
simplesmente deixa de ser calculada. O pipeline de recuperação ([ADR-0023](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0023-hybrid-retrieval/)) permanece intocado.

## Veja também

- [ADR-0023](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0023-hybrid-retrieval/) (recuperação híbrida): a superfície que este avaliador mede.
- [ADR-0021](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0021-parent-document-retrieval/) (recuperação de documento pai): o passo de deduplicação por pai que define
  a identidade de cartão usada aqui.
- [ADR-0003](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0003-eval-harness/) (harness de avaliação): a arquitetura de avaliador / runner / portão estendida.
- [ADR-0019](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0019-synthetic-only-data-invariant/) (invariante de dados somente sintéticos): restringe qualquer expansão de rótulos gold.
