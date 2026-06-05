---
title: "ADR-0007: Alvo de implantação"
description: Por que a demo pública roda no Hugging Face Spaces, Docker SDK, nível gratuito CPU Basic, a partir da mesma imagem da CI.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0007: Alvo de implantação (Hugging Face Spaces, Docker SDK, nível gratuito CPU Basic)

- Status: Accepted
- Data: 2026-05-12
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

Esta é uma implementação de referência pública. Uma URL de demo ao vivo é em si
um sinal determinante: um leitor está a dois scrolls de clicar em um link
que abre um agente conversacional multi-turno real em um navegador. Essa
URL deve ser alcançável sem um cartão de crédito, não deve sumir
silenciosamente quando um nível gratuito for revertido, e deve rodar a mesma
imagem que o `Dockerfile` do projeto constrói localmente. Qualquer divergência
entre a imagem de desenvolvimento e a imagem implantada compromete
a história do harness de avaliação; o ponto inteiro é que o que roda em CI é
o que roda em produção.

O agente é FastAPI / Uvicorn de processo único, com um armazenamento
Chroma embarcado e um embedder de fallback embutido, despachando chamadas de LLM
para um provedor externo (Groq por padrão; ver
[ADR-0002](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/)). Sem GPU, sem peso de
modelo para hospedar, sem disco persistente além da KB sintética de 30-50 cartões.

Como distribuímos uma URL de demo pública e sempre alcançável deste agente
por menos de $0 / mês, a partir do mesmo Dockerfile que o projeto distribui, de
uma forma que um operador possa fazer fork e implantar com um único segredo,
durável contra a reorganização de níveis gratuitos que aconteceu em vários
provedores PaaS entre 2023 e 2025?

## Direcionadores da Decisão

- **$0 / mês sob carga da demo**: a plataforma de demonstração é aberta;
  gastos recorrentes seriam pagos do próprio bolso indefinidamente.
- **Caminho de Dockerfile único**: a implantação deve construir a partir do
  mesmo `Dockerfile` que o projeto distribui. Sem divergência de Dockerfile
  exclusivo de produção.
- **Afinidade com o domínio de referência de IA**: uma URL
  `huggingface.co/spaces/...` sinaliza "implementação de referência de IA" no
  momento em que um leitor a vê. O host é parte da mensagem.
- **Baixo atrito para o operador**: um fork-e-implanta deve atingir um
  estado verde com um único segredo de implantação, não um procedimento de
  seis passos com pré-requisito de cartão de crédito.
- **Simplicidade de rollback**: implantações ruins são revertidas seja
  deletando o último commit no remote do Space, seja fazendo push de um
  `git revert` na branch padrão. Sem fluxo de rollback do lado da infra.
- **Sem LFS, sem pesos de modelo**: o agente não tem nenhum artefato grande para
  hospedar junto ao código; o embedder é baixado na primeira execução
  dentro da imagem.
- **Durabilidade do nível gratuito**: escolher um host cujo nível gratuito esteja
  ancorado na estratégia do host, não em uma promessa de homepage que
  é retirada.

## Opções Consideradas

- **Hugging Face Spaces, Docker SDK, CPU Basic gratuito** (escolhida):
  mesmo Dockerfile, 2 vCPU + 16 GB RAM, dorme após 48 h de ociosidade,
  acorda automaticamente na próxima requisição, URL pública, sem cartão registrado.
- **Hugging Face Spaces, SDK Gradio / Streamlit**: mesmo host, mas
  o SDK constrói a UI; a superfície FastAPI que o projeto distribui não
  corresponderia à imagem implantada.
- **Render Web Service, nível gratuito**: mesmo alvo de Dockerfile;
  dorme após 15 minutos de ociosidade com um cold start de 30-60 s.
- **Fly.io, nível gratuito**: o nível gratuito original terminou em outubro
  de 2024, substituído por uma postura de crédito de teste de $5 / mês.
- **Railway, nível gratuito**: plano gratuito retirado em agosto de 2023 em
  favor de créditos de teste de $5 / mês; não é $0 / mês.
- **Vercel, plano Hobby**: timeout de função serverless de 10 s no
  Hobby mata qualquer stream de agente multi-turno assim que a ida e volta do
  LLM excede o limite.
- **Cloudflare Workers AI**: uma plataforma de roteamento de modelos em vez de
  um host Docker genérico; o stack Python + Chroma embarcado precisaria
  ser reescrito contra o runtime do Workers.
- **Streamlit Community Cloud**: gratuito, mas atrela a demo a uma
  UI Streamlit; a superfície FastAPI fica inacessível.
- **Modal**: créditos de teste, depois pague-por-segundo; o regime permanente
  não é $0 / mês.

## Resultado da Decisão

Opção escolhida: **Hugging Face Spaces, Docker SDK, nível gratuito CPU
Basic**, com **Render Web Service, nível gratuito** documentado como a
segunda escolha do operador na referência de implantação e alcançável a partir
do mesmo Dockerfile com uma mudança de variável de ambiente (`$PORT`).

O Space vive em
`https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`
e é construído pelo builder Docker do Hugging Face a partir do
`Dockerfile` do repositório. A build é disparada por um workflow de implantação, que
espelha a branch padrão e cada tag de release no remote do Space,
trocando o README raiz por um card específico do Space em um
commit exclusivo de implantação, de modo que o front-matter YAML do HF Spaces nunca toque
o repositório de origem. O commit de implantação nunca recebe push de volta para o
repositório de origem; o Space é um espelho, não um alvo de colaboração.
A implantação é condicionada a um único segredo de implantação; até que esse segredo seja
configurado o workflow falha rápido com um erro claro.

A escolha do Docker SDK é determinante. Os SDKs Gradio e Streamlit
construiriam uma UI ao redor de um ponto de entrada Python e divergiriam da
superfície FastAPI. Com o Docker SDK a mesma imagem roda em três
lugares: o laptop de um contribuidor (`docker run`), o harness de avaliação e
a demo pública (HF Spaces). Uma imagem, um modelo mental, um conjunto de
comportamentos sob teste.

O nível CPU Basic (2 vCPU, 16 GB RAM, 50 GB efêmeros) hospeda
confortavelmente o armazenamento Chroma embarcado e o modelo
sentence-transformers embutido. As chamadas de LLM são despachadas para um
provedor externo, então o próprio Space só lida com recuperação de RAG,
orquestração e HTTP. O sono por ociosidade de 48 horas produz um cold start de
10-30 segundos na primeira requisição após acordar; exposto no
card do Space para que um leitor não seja surpreendido.

### Confirmação

- Uma execução verde do workflow de implantação no push para a branch padrão e em
  cada tag de release `v*`, com o segredo de implantação configurado.
- Uma URL pública alcançável em
  `https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`.
- O Space responde a `GET /health` com `200 OK` após acordar.
- O Space responde a `POST /chat` em modo demo contra um cliente stub offline
  (sem chaves do lado do chamador necessárias para a demo pública).
- A referência de implantação documenta o bootstrap do operador (criação do Space,
  geração do token de implantação, registro do segredo, primeira implantação).

## Consequências

### Positivas

- **$0 / mês** sob carga da demo; o HF Spaces não impõe uma
  cota mensal em Spaces Docker CPU Basic.
- **Mesmo Dockerfile em todo lugar**: desenvolvimento, CI, produção.
- **Caminho de operador com um segredo**: um único segredo de implantação é todo o
  onboarding para a história de implantação.
- **URL alinhada ao domínio**: o host carrega parte do
  sinal do projeto antes de o leitor ler o corpo.
- **Rollback trivial**: delete o commit ruim no Space, ou faça push de
  um `git revert` na branch padrão e deixe a próxima implantação espelhá-lo.
- **Sem hospedagem de pesos de modelo**: evita LFS, evita o nível de armazenamento
  no host, mantém a imagem abaixo de 1 GB.

### Negativas

- **Cold start de 10-30 s** após uma janela de ociosidade de 48 horas; exposto
  aos leitores no card do Space.
- **Lock-in do builder do HF Spaces**: uma indisponibilidade do HF atrasa uma
  implantação; o fallback do Render é documentado na referência de implantação para essa
  contingência.
- **Somente CPU**: o Space não consegue hospedar um LLM local; a demo
  depende de um provedor externo para completions. Por design (ver
  [ADR-0002](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/)).
- **O front-matter YAML no card do Space** é incompatível com
  o renderizador do GitHub, então o workflow de implantação tem que trocar o README
  raiz em um commit exclusivo de implantação.

### Neutras

- Um novo workflow de implantação e um novo diretório de card do Space se tornam parte
  do layout do repositório.
- Um segredo de implantação se torna necessário para a demo ao vivo; contribuidores
  sem direitos de push desenvolvem localmente sem ele.
- O remote do Space tolera force-push (ele é um espelho); o remote de origem
  não. Os comentários do workflow tornam essa assimetria explícita
  para que um operador não transfira a postura entre remotes.

## Prós e Contras das Opções

### Hugging Face Spaces, Docker SDK, CPU Basic gratuito

- Boa, porque o host corresponde ao domínio de referência de IA do projeto
  em uma olhada na URL.
- Boa, porque o Docker SDK roda o `Dockerfile` do projeto como está.
- Boa, porque o nível gratuito do HF está ancorado em Spaces comunitários
  que geram tráfego para o Hub; improvável de sumir de uma hora para outra.
- Boa, porque o rollback não tem lado de infra.
- Ruim, porque a latência de cold start após 48 horas de ociosidade é visível.
- Ruim, porque o front-matter YAML do card do Space exige uma
  troca do README raiz exclusiva de implantação.

### Hugging Face Spaces, SDK Gradio / Streamlit

- Boa, porque os SDKs distribuem uma UI opinativa e hospedada.
- Ruim, porque a superfície da demo diverge da superfície FastAPI
  que o projeto distribui; a coisa implantada deixa de ser a mesma coisa
  que a coisa construída localmente.

### Render Web Service, nível gratuito

- Boa, porque o mesmo `Dockerfile` implanta com uma
  mudança de variável de ambiente (`$PORT`).
- Ruim, porque o sono por ociosidade de 15 minutos é mais agressivo que a
  janela de 48 horas do HF Spaces, e o host não carrega nenhum sinal de
  domínio de referência de IA.

### Níveis gratuitos do Fly.io / Railway

- Ruim, porque os níveis gratuitos históricos foram retirados (Fly.io
  outubro de 2024, Railway agosto de 2023) em favor de créditos de teste;
  o regime permanente não é $0 / mês.

### Vercel Hobby

- Ruim, porque o timeout de função de 10 segundos mata qualquer stream de
  agente multi-turno assim que a ida e volta do LLM o excede.

### Cloudflare Workers AI

- Ruim, porque o stack Python + Chroma embarcado teria que ser
  reescrito contra o runtime do Workers.

### Streamlit Community Cloud

- Ruim, porque a UI atrela a demo ao Streamlit; a superfície FastAPI
  fica inacessível.

### Modal

- Ruim, porque os créditos de teste expiram; o regime permanente custa dinheiro.

## Mais Informações

- Runbook do operador: [referência de implantação](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/deploy/)
- Documentação do Docker SDK do Hugging Face Spaces:
  <https://huggingface.co/docs/hub/spaces-sdks-docker>
- Preços do Hugging Face (níveis de hardware dos Spaces):
  <https://huggingface.co/pricing>
- Documentação do nível gratuito do Render: <https://render.com/docs/free>
- Thread de post-mortem do nível gratuito do Fly.io:
  <https://community.fly.io/t/free-tier-is-dead/20651>
- Limites de runtime de função do Vercel:
  <https://vercel.com/docs/functions/runtimes#max-duration>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Camada de resiliência de implantação

Três primitivas por processo são distribuídas para fazer a demo de nível gratuito
degradar graciosamente sob carga em vez de expor erros upstream crus. Todas as
três são acionadas por flags de habilitação para que fiquem desligadas por padrão para
testes determinísticos e ligadas para o Space ao vivo:

- **Rate limiter por sessão.** Um limiter de janela deslizante por chave
  (por IP de cliente). Um chamador acima do limite recebe um HTTP 429 com um
  cabeçalho `Retry-After` em vez de um 502 cru. Ajustável via configurações de
  máximo de requisições e segundos da janela. Uma dependência foi deliberadamente
  não adicionada; o limiter em processo mantém a postura sem framework.
- **Cadeia de fallback de provedor.** Um wrapper em torno do Protocol `LLMClient`:
  uma falha transitória do Groq (HTTP 429, 5xx ou uma falha de transporte
  pura) cascateia por Cerebras (fallback gratuito) e Anthropic (último
  recurso pago) antes que qualquer erro alcance o frontend. Um 4xx que não seja 429 é um
  erro genuíno de cliente e é relançado inalterado. Consistente com a
  abstração de fornecedor do [ADR-0002](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/) -
  o fallback é um wrapper em nível de Protocol, não uma mudança em nível de nó.
- **Cache de resposta com TTL curto.** Um cache em processo limitado e de TTL curto,
  chaveado na tupla normalizada (entrada, localidade, modelo), de modo que os cliques de
  "carregar exemplo" da SPA sejam atendidos sem atingir o provedor.

**Consequência de worker único.** Todas as três primitivas são por processo,
assim como o checkpointer HITL em memória (ver
[ADR-0001](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0001-orchestration/)). O Space, portanto, roda um
único worker uvicorn por design; um segundo worker não compartilharia o
limiter, o cache ou o estado de thread pausada. Uma implantação multi-worker
precisaria de um armazenamento compartilhado (Redis, Postgres), o que está fora
de escopo para a demo de $0. Isso é documentado na referência de implantação e
no comentário do `Dockerfile`.

**Embedder embutido.** O embedder padrão distribuído é
`BAAI/bge-small-en-v1.5`, compatível com CPU Basic no nível gratuito do Space.
Ver [ADR-0004](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0004-rag-stack/) para a decisão do embedder; a
postura de implantação aqui não é afetada pela escolha do modelo.
