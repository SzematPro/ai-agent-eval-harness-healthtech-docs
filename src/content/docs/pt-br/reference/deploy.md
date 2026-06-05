---
title: Implantação
description: Notas de implantação para a implementação de referência - Hugging Face Spaces sob o Docker SDK, configuração de runtime, streaming, rollback e caminhos de backup.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Implantação

> Notas de implantação para o `ai-agent-eval-harness-healthtech`. O destino de
> implantação primário canônico é o **Hugging Face Spaces** sob o **Docker SDK**.
> Os caminhos de backup (Render, Docker local) estão documentados no final.

## Por que o Hugging Face Spaces

O destino da demonstração é uma URL de demo pública, de custo zero e sempre
ativa que qualquer pessoa pode abrir em um clique. O HF Spaces, Docker SDK,
nível **CPU Basic** nos dá:

- 2 vCPU, 16 GB RAM, 50 GB de disco efêmero.
- Uma URL HTTPS pública sem exigência de cartão cadastrado.
- Reconstrução automática da imagem a cada push para a branch `main` do Space.
- Dorme após 48 h de tráfego zero; acorda automaticamente na próxima
  requisição.

As contrapartidas são: um arranque a frio de 10-30 s após um sono, e os tetos
de recursos acima. Ambos são aceitáveis para uma plataforma de demonstração.

O repositório do Space (`SzematPro/ai-agent-eval-harness-healthtech`) é um
espelho de destino de implantação do repositório canônico do GitHub - não é um
repositório de colaboração separado. Cada implantação é um force-push a partir
do workflow do GitHub.

## A história da implantação (o caminho feliz)

1. Um commit cai na `main` do repositório do GitHub (ou uma tag de release que
   corresponde a `v*` é enviada, ou o workflow é disparado manualmente).
2. O workflow de implantação roda em `ubuntu-latest`. Ele verifica que o
   segredo `HF_TOKEN` está presente, configura a identidade git de implantação,
   substitui o README específico do Space pelo README raiz (que carrega o
   front-matter YAML do HF Spaces), remove a mídia binária (os GIFs e PNGs são
   ativos do README do GitHub, não arquivos de runtime do Space - o Hugging
   Face rejeita pushes brutos que carregam blobs binários), compila uma branch
   `deploy` **órfã** de commit único (sem histórico) e faz force-push dessa
   branch para a `main` do remoto do Space.
3. O Hugging Face detecta o push, reconstrói a imagem Docker a partir do mesmo
   `Dockerfile` que o repositório entrega e coloca a nova revisão online.
4. O card do Space em huggingface.co reflete os valores declarados no README
   específico do Space; a URL da demo ao vivo é
   <https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech>.

O commit de implantação **nunca** é enviado de volta ao repositório do GitHub;
ele existe apenas no remoto do Space, que é um espelho de implantação e tolera
o force-push. A branch `main` do GitHub e as tags do GitHub nunca recebem
force-push.

## Bootstrap - configuração única

A primeira implantação precisa que o segredo de repositório `HF_TOKEN` do
GitHub exista. Até que ele exista, o workflow falha rápido com uma mensagem
clara e o card do Space em huggingface.co renderizará o placeholder do README.

### 1. Criar o Space

1. Faça login em <https://huggingface.co> como `SzematPro`.
2. New Space -> nome `ai-agent-eval-harness-healthtech`, SDK = Docker,
   visibilidade = Public.
3. Depois que o Space vazio for criado, anote a URL do remoto:
   `https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`.

### 2. Gerar um token do HF com escopo de escrita

1. Vá para <https://huggingface.co/settings/tokens>.
2. Crie um token com o papel **write** (somente leitura não é suficiente - o
   workflow faz push para o remoto do Space).
3. Copie o token; o HF só o mostra uma vez.

### 3. Registrar o segredo no repositório do GitHub

1. Abra a página de configurações de secrets do Actions do repositório do
   GitHub.
2. New repository secret. Nome: `HF_TOKEN`. Valor: o token do passo 2.
3. Dispare o workflow de implantação manualmente para confirmar que a primeira
   implantação se conclui.

O workflow de implantação é o caminho de implantação automatizado. A
*primeira* implantação também pode ser feita manualmente fazendo push da
árvore de trabalho diretamente para o remoto git do Space, o que faz o Space
ir ao ar sem esperar o push da origem do GitHub. A implantação manual
substitui o README específico do Space pelo README raiz e remove a mídia
binária que o Hugging Face rejeita; o workflow automatizado faz a mesma coisa
em cada push.

## Configuração de runtime (Space do HF)

O Space ao vivo é configurado inteiramente por meio de segredos e variáveis do
Space lidos pelas configurações da aplicação (pydantic-settings; os nomes de
variáveis de ambiente são os nomes dos campos em maiúsculas). Defina valores
sensíveis como **Secrets** e o restante como **Variables** na página
**Settings -> Variables and secrets** do Space.

Secrets:

- `GROQ_API_KEY` - provedor de LLM primário.
- `CEREBRAS_API_KEY` - provedor de LLM de fallback; a presença dele é o que
  ativa o cliente de fallback Groq-para-Cerebras.

Variables: `LLM_PROVIDER=groq`, `AUTO_INGEST_ON_STARTUP=1`,
`CHROMA_PERSIST_DIR=/tmp/chroma`, `CHROMA_COLLECTION=kb_main`,
`EMBEDDING_PROVIDER=sentence-transformers`,
`SENTENCE_TRANSFORMER_MODEL=BAAI/bge-small-en-v1.5`,
`EMBEDDING_DEVICE=cpu`, `HITL_ENABLED=1`, `LLM_FALLBACK_ENABLED=1`,
`RATE_LIMIT_ENABLED=1`, `RESPONSE_CACHE_ENABLED=1`,
`ENVIRONMENT=production`.

O Space ingere a base de conhecimento embutida de forma fresca em uma coleção
Chroma vazia no primeiro boot; o modelo de embedding `BAAI/bge-small-en-v1.5`
é baixado do Hugging Face na primeira inicialização. O checkpointer é o
`MemorySaver` em memória (uma limitação de worker único da camada gratuita -
uma thread HITL pausada não sobrevive a um reinício do Space); a string de
conexão durável do Postgres é deixada sem definir. O limitador de taxa, o
fallback de provedor e o cache de respostas são todos por processo; não
aumente a contagem de workers do uvicorn, porque um segundo worker não os
compartilharia.

## Streaming (SSE) e o proxy reverso

O Agent Execution Graph é alimentado por um modo de streaming server-sent-events
(SSE) em `POST /chat` e `POST /chat/resume`: uma requisição que carrega
`Accept: text/event-stream` recebe um corpo `text/event-stream` de eventos de
execução por nó em vez do `ChatResponse` em JSON. O design de streaming está
registrado na
[ADR-0010](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0010-streaming-execution-graph/).

Para que o grafo ao vivo pareça ao vivo, esses eventos precisam chegar ao
navegador *incrementalmente* - conforme cada nó roda - em vez de serem
armazenados em buffer e entregues como um único bloco no fim do turno. A
aplicação faz a sua parte: as respostas de streaming definem
`Cache-Control: no-cache` e `X-Accel-Buffering: no`, e o servidor descarrega
cada registro SSE conforme a API `astream` do LangGraph o produz.
`X-Accel-Buffering: no` é, no entanto, uma **dica específica do nginx**. O proxy
de borda do Hugging Face Spaces não é contratualmente garantido a honrá-la,
então se o SSE de fato transmite incrementalmente no Space ao vivo é um fato de
implantação que precisa ser **verificado no Space implantado**, não presumido.

### A verificação de entrega incremental com `curl -N`

`curl -N` (`--no-buffer`) desabilita o próprio buffer de saída do curl, então o
que você vê chegar é o que o proxy entregou. Contra o Space implantado, emita
uma requisição de streaming:

```bash
curl -N -X POST \
  https://szematpro-ai-agent-eval-harness-healthtech.hf.space/chat \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"messages":[{"role":"user","content":"What is medication adherence?"}]}'
```

Para tornar o tempo explícito, prefixe cada linha com um carimbo de tempo:

```bash
curl -N -X POST \
  https://szematpro-ai-agent-eval-harness-healthtech.hf.space/chat \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"messages":[{"role":"user","content":"What is medication adherence?"}]}' \
  | while IFS= read -r line; do printf '%s  %s\n' "$(date +%T.%N)" "$line"; done
```

- **PASS** - os registros SSE chegam incrementalmente: o evento
  `graph_topology` primeiro, depois os eventos `node_started` / `node_completed`
  espaçados ao longo do turno, depois `turn_completed`. Com a variante com
  carimbo de tempo, as linhas carregam tempos visivelmente diferentes. O proxy
  não armazenou em buffer; o grafo ao vivo é genuinamente ao vivo.
- **FAIL** - todos os registros chegam de uma vez no fim do turno (os carimbos
  de tempo estão todos a poucos milissegundos uns dos outros). O proxy
  armazenou a resposta em buffer; o grafo ao vivo degrada para um despejo
  pós-turno.

Um FAIL deve ser resolvido antes do release: seja por uma correção de
configuração do proxy, seja, se a borda do HF genuinamente não puder ser feita
para transmitir, por uma decisão de escopo honesta registrada antes do release.
Um release não deve alegar um grafo de execução ao vivo se o grafo ao vivo é
silenciosamente um despejo pós-turno.

### Resultado registrado

O código de streaming é verificado de ponta a ponta: uma requisição `curl -N`
contra o Space implantado retorna os registros SSE incrementalmente e as
respostas de streaming carregam `Cache-Control: no-cache` e
`X-Accel-Buffering: no`. O gate de release exigiu que esta verificação passasse
(PASS) no Space ao vivo antes de marcar a tag.

## Rollback

A branch `main` do Space é reconstruída a partir da `main` do GitHub em cada
execução de implantação, então o procedimento de rollback é assimétrico:

- **Se um commit ruim caiu no Space, mas não na `main` do GitHub**: exclua o
  commit mais recente na `main` do Space em
  <https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech/tree/main>.
  O próximo push da `main` do repositório do GitHub restaura o estado de
  implantação.
- **Se um commit ruim caiu na `main` do GitHub**: reverta-o no GitHub (um novo
  commit de `git revert` na `main`); o workflow de implantação roda novamente e
  o Space pega a reversão.

Nunca faça `git push --force` para a `main` do GitHub para desfazer uma
implantação; apenas o remoto do Space tolera force-pushes (é um espelho, não
uma fonte de verdade).

## Testar a imagem Docker localmente

O Space roda o mesmo `Dockerfile` que o repositório entrega. Para fazer um
smoke-test:

```bash
docker build . -t ai-agent-eval-harness:dev
docker run -p 7860:7860 ai-agent-eval-harness:dev
```

Em seguida, acesse `http://localhost:7860/health` em outro terminal. A imagem:

- roda como um usuário `app` não-root,
- escuta na porta 7860 (o padrão do HF Spaces),
- escreve apenas em `/tmp` e no virtualenv da aplicação,
- inicia o `uvicorn` com o app FastAPI.

A base Docker é `python:3.12-slim`; o estágio de runtime adiciona apenas
`ca-certificates` e `curl`. Nenhuma GPU é necessária.

## Contrapartidas e limites conhecidos

- **Arranque a frio**: 10-30 s após um sono de 48 h de inatividade; o HF acorda
  o Space na primeira requisição recebida. Para uma plataforma de demonstração
  isto é aceitável.
- **Tetos de recursos**: 2 vCPU e 16 GB RAM. O agente é um `uvicorn` de
  processo único; o armazenamento Chroma embedded e o modelo
  sentence-transformers embutido cabem confortavelmente sob este orçamento.
- **Armazenamento efêmero**: 50 GB e reiniciado a cada reconstrução. Qualquer
  coisa que precise de durabilidade (relatórios de avaliação, traces) vai para
  os artefatos do GitHub Actions, não para o disco do Space.
- **Sem GPU na camada gratuita**: a demonstração roda deliberadamente apenas em
  CPU; as chamadas de LLM são despachadas ao provedor externo configurado (Groq
  por padrão).
- **Cotas da camada gratuita**: o HF Spaces não impõe uma cota mensal em Spaces
  Docker CPU Basic; consulte <https://huggingface.co/pricing> para os termos
  atuais.

## Caminhos de implantação de backup

- **Render** (camada gratuita, não testado): o mesmo `Dockerfile` deveria rodar
  com o serviço configurado para escutar na `$PORT` fornecida pelo Render.
  Nenhum `render.yaml` é versionado e este caminho não foi exercitado; é uma
  alternativa documentada, não uma implantação automatizada ou verificada.
- **Docker local**: o comando `docker run` acima, útil para o desenvolvimento
  local e para a verificação de sanidade da imagem antes de uma tag de release.
