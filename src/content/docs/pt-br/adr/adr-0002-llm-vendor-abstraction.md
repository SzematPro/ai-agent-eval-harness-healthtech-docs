---
title: "ADR-0002: Abstração de fornecedor de LLM"
description: Por que o acesso ao LLM passa por um Protocol de cliente fino e neutro em relação a fornecedores, alternado por uma única variável de ambiente.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0002: Abstração de fornecedor de LLM (Protocol `LLMClient` fino)

- Status: Accepted
- Data: 2026-03-18
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

O agente chama um endpoint de chat-completion várias vezes por turno
(classificador de escopo, redator, verificação de segurança, juiz). A
tese do projeto inclui a afirmação de que o agente é neutro em relação a
fornecedores e de que a mesma base de código pode rodar contra OpenAI,
Anthropic, Groq ou Cerebras com uma única variável de ambiente. Essa
afirmação tem que ser honrada por código, não por texto de documentação.

Ao mesmo tempo, o projeto está em um orçamento de regime permanente de
$0/mês. O caminho padrão da demo tem que rodar em um nível gratuito generoso
(Groq, Llama 3.3 70B-versatile, 30 RPM / 1K RPD), e o caminho do juiz de
avaliação em CI tem que caber em outro nível gratuito generoso (Cerebras, 1M de
tokens/dia). Os provedores "premium" (OpenAI, Anthropic) devem ser plugáveis a
partir das chaves do usuário sem mudanças de código.

Como expomos uma interface única e estável para completions de LLM
dentro do agente e dentro do harness de avaliação, mantendo o acesso a
quatro fornecedores e a opção de adicionar mais depois?

## Direcionadores da Decisão

- Uma superfície de chamada coerente para o agente e o harness de avaliação;
  sem ramificação por fornecedor no código dos nós
- Nível gratuito por padrão: o caminho da demo roda no nível gratuito do Groq
  sem chaves do usuário
- Economia de CI: o juiz roda no nível gratuito de 1M de tokens/dia do Cerebras;
  os avaliadores determinísticos que bloqueiam PRs não precisam de LLM nenhum
- Realismo de produção: um usuário com chaves pagas de OpenAI ou Anthropic
  obtém uma experiência quase idêntica ao alternar o `LLM_PROVIDER`
- Evitar lock-in pesado de framework: queremos a liberdade de descartar
  os adaptadores de provedor da LangChain depois sem reescrever os nós do agente
- Tipagem forte em requisições e respostas (mensagens tipadas com Pydantic),
  consistente com a postura `mypy --strict`

## Opções Consideradas

- **Protocol `LLMClient` fino** sobre LangChain `langchain-openai` +
  `langchain-anthropic` mais adaptadores diretos Groq / Cerebras via
  REST compatível com OpenAI, alternado por uma variável de ambiente
  `LLM_PROVIDER`
- **`ChatModel` direto da LangChain em todo lugar**: usar
  `langchain_openai.ChatOpenAI`, `langchain_anthropic.ChatAnthropic`,
  etc. diretamente dentro dos nós do agente
- **Proxy / SDK do LiteLLM**: chamar todos os provedores pela camada
  no formato OpenAI do LiteLLM
- **Somente SDKs nativos dos fornecedores**: ignorar qualquer abstração,
  escrever quatro conjuntos de chamadas específicas de fornecedor
- **OpenRouter (ou roteador similar)**: um endpoint HTTP, muitos
  provedores selecionados por nome de modelo

## Resultado da Decisão

Opção escolhida: **Protocol `LLMClient` fino**, com adaptadores
concretos que envolvem os clientes de provedor da LangChain para OpenAI e
Anthropic e que chamam o Groq / Cerebras diretamente pelos seus endpoints
REST compatíveis com OpenAI. O Protocol expõe um pequeno conjunto de métodos
(chat completion, chat completion com streaming, contagem de tokens). A seleção
de fornecedor é uma única variável de ambiente
`LLM_PROVIDER in {openai, anthropic, groq, cerebras}`,
resolvida por fábrica na inicialização do processo.

Esta opção preserva o valor de opção de trocar a LangChain depois
(o agente nunca importa tipos da LangChain diretamente), dá ao harness de
avaliação uma interface estável e testável, e corresponde ao realismo que o
projeto precisa: um usuário com chaves pagas alterna uma variável de ambiente e
o mesmo agente roda contra o fornecedor de sua preferência.

### Confirmação

- Todo nó do agente e todo avaliador de avaliação que precise de um LLM importa
  o Protocol `LLMClient`, não uma classe de provedor
- Um smoke test de CI importa cada adaptador (OpenAI, Anthropic, Groq,
  Cerebras) e verifica que eles implementam `LLMClient`
- Um teste de integração de CI exercita pelo menos dois provedores de ponta a
  ponta com um prompt enlatado curto para validar a afirmação "agnóstico de
  fornecedor"
- O `LLM_PROVIDER` é documentado na referência de configuração do projeto
  e no arquivo de ambiente de exemplo

## Consequências

### Positivas

- O código do agente e da avaliação conversa com um Protocol; a troca de
  fornecedor é uma mudança de ambiente, não uma mudança de código
- O caminho de nível gratuito por padrão (Groq para a demo, Cerebras para o
  juiz) mantém o custo de regime permanente em $0 enquanto ainda demonstra
  padrões realistas de produção
- Realismo de produção: um leitor tecnicamente rigoroso pode colar sua
  chave de OpenAI ou Anthropic e rodar o mesmo fluxo
- O Protocol é pequeno (seis métodos ou menos) e trivialmente mockável,
  o que mantém enxuta a superfície de testes unitários
- A LangChain permanece um detalhe de implementação de dois adaptadores, não um
  framework tecido por toda a base de código

### Negativas

- Dois dos adaptadores dependem de pacotes de provedor da LangChain
  (`langchain-openai`, `langchain-anthropic`); aceitamos isso em
  troca de não reimplementar nuances de uso de ferramentas, function-calling e
  streaming
- O adaptador REST compatível com OpenAI para Groq e Cerebras tem que
  lidar com casos de borda (cabeçalhos de rate-limit, formato de chunk de
  streaming) que a LangChain trata para os provedores nativos
- A superfície do Protocol precisa evoluir com cuidado; uma mudança
  incompatível no Protocol significa tocar cada adaptador e cada nó

### Neutras

- O projeto carrega quatro adaptadores; apenas um está ativo em tempo de
  execução
- A instrumentação de tokens-por-turno e ms-por-turno fica na
  camada de adaptador, não no ponto de chamada
- O streaming é opcional: o Protocol expõe um método de streaming mas
  o fluxo padrão não o exige

## Prós e Contras das Opções

### Protocol `LLMClient` fino

- Boa, porque dá uma interface inspecionável para os quatro
  provedores
- Boa, porque a troca de fornecedor é uma única variável de ambiente
- Boa, porque mockar o Protocol torna os testes unitários baratos
- Ruim, porque somos donos do código de adaptador para Groq e Cerebras
- Ruim, porque a evolução do Protocol é um custo de coordenação

### `ChatModel` direto da LangChain em todo lugar

- Boa, porque a LangChain já envolve todo fornecedor importante
- Ruim, porque os nós importam tipos da LangChain diretamente, o que acopla
  o agente à hierarquia de classes da LangChain e quebra a
  postura "neutra em relação a fornecedores, leve em framework"

### Proxy / SDK do LiteLLM

- Boa, porque o LiteLLM dá uma API uniforme no formato OpenAI entre
  muitos provedores
- Ruim, porque adiciona uma camada de tradução de terceiros entre o
  agente e os modelos upstream, com sua própria superfície de bugs e
  peculiaridades de observabilidade
- Ruim, porque a semântica de rate-limit do nível gratuito do Groq e do
  Cerebras é mais fácil de honrar conversando diretamente com eles

### Somente SDKs nativos dos fornecedores

- Boa, porque zero sobrecarga de abstração
- Ruim, porque cada nó carregaria código específico de fornecedor; a
  afirmação "agnóstico de fornecedor" se torna falsa no código

### OpenRouter (ou roteador similar)

- Boa, porque um endpoint para muitos modelos
- Ruim, porque adiciona um intermediário que não é gratuito no
  volume que um harness de avaliação consegue gerar, e obscurece qual provedor
  de fato atendeu um dado turno

## Mais Informações

- Provedor OpenAI da LangChain:
  <https://python.langchain.com/docs/integrations/providers/openai/>
- Provedor Anthropic da LangChain:
  <https://python.langchain.com/docs/integrations/providers/anthropic/>
- API compatível com OpenAI do Groq:
  <https://console.groq.com/docs/openai>
- API compatível com OpenAI do Cerebras:
  <https://inference-docs.cerebras.ai/api-reference/chat-completions>
- MADR 4.0.0: <https://adr.github.io/madr/>
