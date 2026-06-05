---
title: Cartão do modelo
description: "CHAI Applied Model Card para o agente conversacional de adesão à medicação: usos, avisos, ingredientes de confiança e métricas-chave."
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Cartão do modelo - agente conversacional de adesão à medicação

> Estruturado segundo o **CHAI Applied Model Card** (Coalition for Health AI),
> template em rascunho **v0.1** (`mc.chai.org/v0.1`, repositório de esquema
> <https://github.com/coalition-for-health-ai/mc-schema>). A v0.1 é a versão
> publicada atual do template em 2026-05-20; o template é um rascunho sob
> iteração pública. Este cartão segue a ordem das seções da v0.1: cabeçalho,
> Resumo, Usos e Instruções, Avisos, Ingredientes de Confiança (Fatos do
> Sistema de IA mais Informações de Transparência), Métricas-chave (as três
> colunas de áreas de princípio do CHAI) e Recursos.
>
> O CHAI Applied Model Card foi projetado para uma *solução de IA aplicada*
> implantada dentro de uma organização de saúde. Este artefato **não** é tal
> solução: é uma implementação de referência pública, nunca implantada contra
> pacientes reais. O cartão é, portanto, preenchido honestamente em relação ao
> que o código deste projeto realmente faz, e todo campo que não se aplica a
> uma implementação de referência não implantada diz isso explicitamente em
> vez de ser deixado em branco ou inventado. Leia-o junto com
> [postura regulatória](regulatory-posture.md) e [dados](data.md).

---

## Cabeçalho

| Campo | Valor |
|---|---|
| **Nome** | Agente conversacional de adesão à medicação (`ai-agent-eval-harness-healthtech`) |
| **Desenvolvedor** | Waldemar Szemat. Implementação de referência pública; sem patrocinador corporativo, sem parceiro institucional, sem financiamento externo. |
| **Consultas ou para reportar um problema** | <waldemar@szemat.pro>. Processo de divulgação de segurança na [política de segurança](security.md). Issues: o rastreador de issues do repositório público. |
| **Estágio de lançamento** | Implementação de referência pública, `v2.1.0`. Não é um produto comercial, não é um dispositivo médico lançado, não está em uso clínico. |
| **Data de lançamento** | Lançamento público inicial em 2026-05-14; lançamento atual `v2.1.0`. |
| **Disponibilidade global** | Código-fonte público sob Apache-2.0. Uma demonstração interativa opcional roda no Hugging Face Spaces (camada gratuita) quando as chaves de provedor do host estão configuradas. Sem restrição geográfica e sem comercialização em qualquer jurisdição; é um artefato de código, não um serviço oferecido. |
| **Aprovação regulatória, se aplicável** | Nenhuma. Nenhuma autorização da FDA, marcação CE, notificação da MHRA ou qualquer outra autorização regulatória foi buscada ou obtida. Nenhuma é aplicável: isto não é um dispositivo médico (veja Avisos e [postura regulatória](regulatory-posture.md)). |
| **Versão** | `v2.1.0`. O versionamento é semântico; o prompt do agente, a base de conhecimento e o corpus de avaliação são versionados em conjunto com o código. |

---

## Resumo

Este é um **agente de apoio à adesão à medicação** multi-turno, combinado com
um arcabouço de avaliação controlado por CI que o avalia a cada alteração. O
agente ajuda uma persona de paciente sintética com o lado *comportamental* de
tomar a medicação conforme prescrito: construção de rotina, lembretes,
reflexão no estilo entrevista motivacional sobre as barreiras de adesão e
conversa ciente de locale em inglês, espanhol latino-americano (es-419) e
português brasileiro (pt-BR). Ele **não** diagnostica, dosa, prescreve ou
interpreta dados clínicos; é construído para se situar do lado de
general-wellness do limite bem-estar / clinical-decision-support da FDA por
construção.

O agente é um `StateGraph` do
[LangGraph](https://github.com/langchain-ai/langgraph) por trás de uma
superfície FastAPI, fundamentado por recuperação sobre uma pequena base de
conhecimento sintética, envolto em salvaguardas determinísticas (validação de
entrada, redação de PII, classificação de escopo, escalonamento por sinais de
alerta, verificação de citações, estabilidade de persona) e instrumentado de
ponta a ponta com OpenTelemetry + OpenInference. Sua característica definidora
é o **arcabouço de avaliação**: um núcleo pytest feito à mão que conduz o
agente contra datasets golden curados, despacha cada turno a uma pilha de sete
scorers (quatro determinísticos, três apoiados em juiz) e reprova o pull
request quando uma métrica de segurança, citação ou escalonamento regride.

O ponto do artefato é a metodologia - *construir a medição antes do agente,
controlar cada alteração contra ela* - demonstrada em um exemplo prático de
saúde. O padrão é agnóstico de setor; o enquadramento de saúde foi escolhido
porque é onde o autor tem experiência de campo.

**Palavras-chave:** adesão à medicação, agente conversacional, multi-turno,
LangGraph, geração aumentada por recuperação, salvaguardas, arcabouço de
avaliação de LLM, human-in-the-loop, general wellness, dados sintéticos,
implementação de referência.

---

## Usos e Instruções

### Uso pretendido e fluxo de trabalho

O agente é uma **implementação didática e de referência** de um coach de
bem-estar para adesão à medicação voltado ao paciente e o arcabouço de
avaliação que o governa. Seu uso pretendido é ser lido, executado, bifurcado e
estendido por engenheiros e pares de IA que estudam como um agente de saúde
conversacional multi-turno é medido antes de ser entregue.

Dentro desse enquadramento, o próprio fluxo de trabalho conversacional do
agente é: um turno do usuário entra por `POST /chat`; um pipeline LangGraph de
seis nós executa `intake` → `guardrail_pre` → (condicional) `retrieve_context`
→ `generate_response` → `guardrail_post` → `closing`; a resposta é retornada
com suas citações e seu trace completo de decisões de salvaguarda. O agente é
construído para **informar o próprio comportamento de adesão de um paciente**,
nunca para informar, ampliar ou substituir a decisão de manejo de um
profissional de saúde.

Supervisão humana: uma etapa **opcional** de revisão human-in-the-loop está
disponível. Quando habilitada, um sétimo nó, `review_response`, é inserido
entre `generate_response` e `guardrail_post`; ele usa uma interrupção do
LangGraph para pausar um rascunho de alto-risco-mas-não-agudo para que um
revisor humano aprove, edite ou rejeite antes de o turno ser concluído. Esta é
uma pausa real do grafo, não simulada. Está desligada por padrão, então o
arcabouço de avaliação e o grafo padrão de seis nós rodam sem comportamento de
pausa. Veja a nota sobre HITL em *Riscos e limitações conhecidos*.

### Usuários principais pretendidos

- **Engenheiros e praticantes de IA** que avaliam a arquitetura, o arcabouço
  de avaliação e o design das salvaguardas - o público principal.
- **Revisores técnicos e de governança** que avaliam o rigor de engenharia e
  de postura regulatória do projeto.
- O usuário final *na ficção* do agente é uma **persona de paciente adulto
  sintética** gerenciando um regime de medicação crônica (hipertensão,
  diabetes tipo 2, HIV, anticoagulação com varfarina ou asma). Nenhum paciente
  real é usuário deste sistema; não há critério de inclusão ou exclusão do
  mundo real porque não há usuários do mundo real.

Conhecimento prévio esperado de um usuário real, caso isto fosse
produtizado: é uma conversa de bem-estar voltada ao consumidor e não exigiria
treinamento clínico para ler - que é exatamente por que a postura regulatória
proíbe que ela cruze para o aconselhamento clínico.

### Como usar

Clone o repositório e execute o alvo de verificação do projeto (lint,
verificação de tipos, a suíte de testes completa não lenta), os alvos de
avaliação (o arcabouço de avaliação) e, com uma chave de API gratuita da Groq,
um turno ao vivo de `POST /chat`. A demonstração interativa opcional é um app
web de página única feito à mão, servido a partir do mesmo processo FastAPI;
ela carrega um Agent Execution Graph ao vivo que visualiza a execução do
LangGraph do agente conforme cada turno é transmitido.

### População de pacientes-alvo

Não aplicável no sentido do mundo real. O agente é exercitado exclusivamente
contra **personas de pacientes sintéticas**, geradas por LLM em cinco clusters
de condições (hipertensão, diabetes mellitus tipo 2, HIV como âncora de
adesão de longo prazo, varfarina como âncora de índice terapêutico estreito,
asma como âncora de PRN-versus-agendado). Nenhuma persona corresponde a um
indivíduo real; veja [dados](data.md).

### Cenários e casos de uso fora de escopo, com advertência

Este artefato **não** deve ser usado para nenhum dos itens a seguir. A lista é
a declaração canônica de fora de escopo; é imposta pelo classificador de
escopo, pelos modelos de recusa e pelo arcabouço de avaliação, e é o mesmo
limite que a [postura regulatória](regulatory-posture.md) registra por
completo.

- **Uso clínico real de qualquer tipo.** Não implante este agente para falar
  com pacientes ou profissionais de saúde reais. Não é validado, não é
  liberado e não é um produto.
- **Diagnóstico.** O agente nunca nomeia, infere ou inclui/exclui uma condição
  médica.
- **Orientação de dosagem.** O agente nunca diz a um usuário para tomar mais,
  tomar menos, dobrar a dose após um esquecimento, dividir, pular ou alterar
  um cronograma de dosagem.
- **Alteração de prescrição.** O agente nunca aconselha iniciar, parar, trocar,
  substituir ou pausar uma medicação.
- **Interpretação de exames, imagens ou leituras de dispositivos.** O agente
  não lê um valor clínico numérico de volta como interpretação.
- **Uso voltado ao profissional de saúde.** O agente não produz resumos
  voltados ao profissional nem notas clínicas; é voltado ao paciente por
  design.
- **Triagem de emergência ou substituição de serviços de emergência.** Diante
  de um sinal de alerta agudo, o agente exibe orientação de serviços de
  emergência e se desengaja; não é uma ferramenta de triagem.
- **Treinar um modelo de produção com suas saídas**, ou usar seus dados
  sintéticos como substituto de pesquisa com seres humanos aprovada por IRB.

Uma solicitação que se enquadre em uma categoria de salvaguarda fora de escopo
(dosagem, diagnóstico, interpretação, exfiltração de PII, extração do prompt
de sistema, sobreposição de papel por role-play) é **recusada** com uma
resposta templada e ciente de locale. Uma pergunta clínica para a qual a
recuperação não retorna nenhum cartão da base de conhecimento é **recusada por
não-correspondência**. Veja a limitação sobre perguntas fora do corpus quase
correspondentes em *Riscos e limitações conhecidos*.

---

## Avisos

### Riscos e limitações conhecidos

- **Não é um dispositivo médico.** Este software não diagnostica, prescreve,
  altera doses, interpreta exames ou imagens, nem interage com profissionais
  de saúde. Nenhuma liberação regulatória foi buscada ou obtida. É uma
  implementação de referência mantida para fins didáticos e de demonstração.
- **Não é clinicamente validada.** O arcabouço de avaliação mede
  fundamentação, segurança, correção de citações, correção de escalonamento e
  equilíbrio de recusas contra rótulos golden *sintéticos*. Isso é teste de
  software, não um ensaio clínico, não um estudo de usabilidade e não um
  substituto de nenhum dos dois.
- **Dados 100% sintéticos; pequena base de conhecimento de domínio único.** A
  base de conhecimento são **36** cartões sintéticos, todos sobre adesão à
  medicação, parafraseados do DailyMed, do MedlinePlus e da WHO Essential
  Medicines List. É um corpus de demonstração, não uma base de conhecimento
  clínica.
- **Perguntas clínicas fora do corpus quase correspondentes não são
  recusadas.** Esta é a limitação honesta mais importante. O agente recusa de
  forma confiável em dois caminhos: uma recuperação *com zero acertos* (o
  armazenamento não retorna nada) e uma *categoria de salvaguarda* fora de
  escopo. Ele **não** recusa de forma confiável uma pergunta clínica que está
  fora do corpus mas é semanticamente adjacente aos cartões - por exemplo,
  uma pergunta de adesão sobre uma condição sem cartão. Tal pergunta é
  respondida contra o cartão de correspondência mais próxima. Isso foi
  estabelecido empiricamente: porque todos os cartões são conteúdo de adesão à
  medicação, uma pergunta de adesão fora do corpus está genuinamente próxima
  deles no espaço de embeddings, e nenhum limiar de similaridade separa as
  perguntas fora do corpus dos casos genuinamente dentro do corpus sem recusar
  falsamente estes últimos. O comportamento foi remensurado em quatro
  configurações de embedder sob distância L2 e cosseno; toda configuração deixa
  uma lacuna de separação negativa. Um limiar de similaridade de recuperação
  (`retrieval_min_similarity`) é entregue **configurável, mas desativado por
  padrão**, para que um corpus mais amplo e mais diverso em tópicos possa
  habilitá-lo depois; no atual corpus pequeno de domínio único, ele não pode
  ser usado. A causa é intrínseca a um corpus pequeno de domínio único, não ao
  embedder nem ao agente.
- **O comportamento do modelo generativo é probabilístico.** As respostas do
  agente são produzidas por um grande modelo de linguagem. Salvaguardas
  determinísticas delimitam a superfície *crítica para a segurança*
  (escalonamento agudo, as categorias de recusa enumeradas, verificação de
  citações), mas o conteúdo em texto livre de uma resposta dentro de escopo é
  do modelo e pode variar, ser incompleto ou estar errado em algum detalhe. O
  gate determinístico de CI prova que as salvaguardas disparam; não prova que
  cada frase gerada está correta.
- **Limitação de durabilidade do HITL.** Quando a revisão human-in-the-loop
  opcional está habilitada, a thread pausada é mantida por um checkpointer. A
  configuração da demo usa um **checkpointer em memória**, então uma thread
  pausada **não sobrevive a um reinício do processo** - um reinício perde
  qualquer revisão aguardando aprovação. Um checkpointer durável apoiado em
  Postgres está disponível e é selecionado automaticamente quando uma string
  de conexão do Postgres está configurada; implantações duráveis devem usá-lo.
- **O escalonamento por sinais de alerta é determinístico e baseado em regras,
  por design.** Sinais de alerta agudos (ideação suicida, anafilaxia, dor
  torácica cardíaca aguda, sangramento grave, asma grave, AVC/sinais FAST,
  emergência hipertensiva) são detectados por uma lista de regex versionada
  que roda antes do classificador de escopo e curto-circuita o turno para um
  modelo de emergência. A detecção é intencionalmente **cega a negação**: pela
  justificativa de design, um sinal de alerta perdido custa muito mais do que
  um sobre-escalonamento benigno, então escalar diante de "sem dor torácica" é
  aceito. Sintomas subagudos que não estão na lista aguda são deliberadamente
  deixados ao modelo e são um modo de falha conhecido em execução ao vivo
  (veja *Métricas-chave*).
- **Limites do ambiente de demonstração.** O Space opcional do Hugging Face
  roda em CPU de camada gratuita: cerca de 30 segundos de arranque a frio após
  inatividade, 2-5 segundos por turno e um limite de taxa do provedor da
  camada gratuita (~30 requisições/minuto) sob o qual uma rajada de visitantes
  verá HTTP 429s. Um cache de respostas de TTL curto e um limitador de taxa
  por sessão mitigam isso; estão desligados por padrão para que a suíte de
  testes permaneça determinística.

### Vieses conhecidos ou considerações éticas

- **Viés de vocabulário clínico em inglês dos EUA nos dados sintéticos.**
  Personas e diálogos são gerados por LLM e carregam um viés conhecido em
  direção ao enquadramento clínico em inglês dos EUA. As fatias de avaliação
  es-419 e pt-BR são mantidas nos *mesmos* limiares que o inglês, e um loop de
  geração produtor-crítico corrige parcialmente o viés, mas o viés residual de
  locale é reconhecido em [dados](data.md).
- **Os cartões da base de conhecimento estão em inglês.** O agente e o
  arcabouço de avaliação são cientes de locale de ponta a ponta, mas os
  próprios cartões da KB estão em inglês. Uma passagem de localização da KB é
  roteiro, não está entregue.
- **Personas sintéticas podem não representar padrões reais de adesão.** As
  distribuições de adesão são amostradas a partir de faixas epidemiológicas
  publicadas para evitar o artefato de superadesão dos geradores de pacientes
  sintéticos de prateleira, mas dados sintéticos não conseguem representar
  plenamente a diversidade de uma população real de pacientes. O artefato é
  explícito quanto a não ser construído sobre, nem validado contra, dados
  reais de pacientes.
- **A fidelidade à entrevista motivacional é uma rubrica subjetiva.** A
  fidelidade de MI é avaliada contra uma rubrica derivada da MITI; avaliadores
  humanos de MI divergem em taxas conhecidas, então a fidelidade de MI é
  reportada, mas não é uma métrica única que controla o PR.
- **Autonomia e supervisão.** O design deliberadamente mantém a decisão de
  roteamento dos sinais de alerta agudos com uma regra determinística e um
  operador humano, não com o modelo, e recusa em vez de adivinhar fora de sua
  alçada - escolhas feitas para proteger a autonomia do paciente e manter um
  humano responsável por desfechos de alto risco.

### Nível de risco clínico

**Não aplicável - isto não é um dispositivo médico e não carrega
classificação de risco clínico.** Caso a *mesma arquitetura* fosse levada em
direção a uma implantação real voltada ao paciente, ela seria avaliada como
uma ferramenta de general-wellness deliberadamente construída para permanecer
fora da definição de dispositivo médico (sem diagnóstico, sem dosagem, sem
alteração de prescrição, sem interpretação de dados clínicos, apenas voltada
ao paciente). Tal implantação ainda exigiria uma revisão regulatória
independente em sua jurisdição antes de qualquer uso real; este cartão não
substitui uma dessas revisões.

---

## Ingredientes de Confiança

### Fatos do Sistema de IA

- **Desfecho(s) e saída(s).** A saída é uma **resposta textual conversacional
  multi-turno** a um turno do paciente, no locale solicitado, acompanhada de um
  trace estruturado: as citações `[cite:CARD_ID]` extraídas da resposta, as
  decisões de aprovação/reprovação por salvaguarda e a contabilidade de
  tokens/latência/custo por turno. Não é uma predição, classificação,
  pontuação ou recomendação no sentido clínico; clinicamente, está restrita a
  conversa de bem-estar, recusa ou escalonamento de emergência.
- **Tipo de modelo.** Um sistema **generativo**: um agente de grande modelo de
  linguagem orquestrado. Um `StateGraph` do LangGraph orquestra um único agente
  conversacional ao longo de seis nós (`intake`, `guardrail_pre`,
  `retrieve_context` condicional, `generate_response`, `guardrail_post`,
  `closing`), mais o sétimo nó `review_response` human-in-the-loop opcional. O
  estado da conversa é tipado com Pydantic. O sistema integra um armazenamento
  vetorial (Chroma, in-process) e os módulos determinísticos de salvaguarda;
  ele não integra um EHR nem qualquer dispositivo médico.
- **Modelos de fundação usados na aplicação.** O LLM de completamento é
  **configurável** por trás de um Protocol de cliente fino, selecionado pela
  variável de ambiente `LLM_PROVIDER`. O caminho de demonstração padrão
  entregue é a **Groq** servindo `llama-3.3-70b-versatile`; a **Cerebras**
  (`gpt-oss-120b` por padrão) é o fallback configurado e o provedor do
  juiz-de-avaliação. Adaptadores da OpenAI e da Anthropic também são fornecidos
  e plugáveis pelo usuário. O fallback em cascata reenvia uma falha de limite
  de taxa ou de transporte da Groq para a Cerebras, depois para a Anthropic.
  Identificadores específicos de modelo são configuração, não codificados em
  rígido, e espera-se que sejam atualizados conforme os provedores iteram.
- **Fonte de dados de entrada.** Em tempo de execução, a entrada é o(s)
  **turno(s) conversacional(is) do usuário** enviado(s) a `POST /chat`. A fonte
  de fundamentação do agente é a base de conhecimento sintética. O sistema não
  ingere nenhum dado real de paciente e nenhum EHR.
- **Tipo de dados de saída/entrada.** Mensagens conversacionais em texto livre
  (entrada e saída), em inglês, es-419 ou pt-BR. Todos os dados sobre os quais
  o sistema é construído e avaliado são **sintéticos**, não do mundo real. O
  agente **não** toma, e nunca é treinado sobre, os seguintes como
  características de entrada: raça, etnia, idioma além dos três locales da
  interface, orientação sexual, identidade de gênero, sexo, data de nascimento,
  determinantes sociais da saúde ou avaliações de estado de saúde. Não há,
  portanto, um conjunto de características de entrada demográficas e nenhuma
  alegação de representatividade demográfica a fazer - por design deliberado, o
  agente raciocina apenas sobre o turno conversacional e o texto do cartão
  recuperado.
- **Caracterização dos dados de desenvolvimento.** O sistema **não é treinado
  nem ajustado** neste repositório; ele usa modelos de fundação pré-treinados
  como serviço por trás do Protocol de cliente. Não há, consequentemente,
  dataset de treinamento nem divisão treino/teste a caracterizar para o próprio
  agente. Os dois datasets sintéticos que *são* entregues são um **corpus de
  avaliação** e a **base de conhecimento**:
  - *Corpus de avaliação* - **218 casos multi-turno curados**: 100 em inglês
    (abrangendo as categorias golden, adversarial e de não-correspondência), 59
    es-419, 59 pt-BR. Gerados por LLM a partir de personas sintéticas com um
    loop produtor-crítico, depois 100% curados manualmente, depois aumentados
    com sementes adversariais redigidas à mão. Metodologia completa em
    [dados](data.md).
  - *Base de conhecimento* - 36 cartões sintéticos parafraseados do DailyMed
    (FDA Structured Product Labeling, domínio público), do MedlinePlus (US NLM,
    domínio público) e da WHO Essential Medicines List (apenas parafraseada).
    Cada cartão carrega `source_url`, `accessed_at` e uma nota de procedência.
  - *Embeddings de recuperação* - a base de conhecimento é embutida com
    **`BAAI/bge-small-en-v1.5`** (384 dimensões, família BGE). A recuperação é
    assimétrica e ciente de instrução: uma consulta é prefixada com a instrução
    de recuperação BGE e todo vetor é normalizado em L2. Um embedder em nuvem
    da Voyage AI é a alternativa configurável.
- **Abordagens de mitigação de viés.** Um loop de geração produtor-crítico
  avalia cada turno sintético quanto à fidelidade de MI, conformidade de escopo
  e fundamentação, e regenera os turnos abaixo do limiar; o gerador e o crítico
  são versões diferentes de modelo. As fatias de avaliação es-419 e pt-BR são
  mantidas nos mesmos limiares que o inglês (avaliação com paridade de locale).
  100% dos turnos gerados são curados manualmente, inclusive quanto a detalhes
  acidentalmente identificadores e à paridade de locale. As distribuições de
  adesão são amostradas a partir de faixas epidemiológicas publicadas para
  contrapor o artefato de superadesão. O viés residual de vocabulário em inglês
  dos EUA é documentado em vez de declarado resolvido. Como o agente não toma
  nenhuma característica de entrada demográfica, a principal superfície de viés
  do modelo são os próprios dados sintéticos, que é o que estas medidas
  visam.
- **Manutenção contínua.** O repositório é a superfície de manutenção; não há
  implantação em campo a monitorar.
  - *Monitoramento de validade* - toda alteração é controlada pelo arcabouço de
    avaliação em cada pull request: uma regressão na correção de citação,
    recusa ou escalonamento reprova o build. Um workflow noturno de red-team com
    Promptfoo exercita o OWASP LLM Top 10 mais 13 casos adversariais feitos à
    mão.
  - *Monitoramento de equidade* - as três fatias de locale são avaliadas sob
    limiares idênticos em cada execução, então uma regressão de locale é uma
    reprovação de build.
  - *Processo de atualização* - o prompt do agente, a base de conhecimento e o
    corpus de avaliação são versionados em conjunto com o código sob
    versionamento semântico. Uma mudança na postura regulatória, no conjunto de
    recusas ou nos critérios de escalonamento exige um Architecture Decision
    Record e é registrada nas notas de versão.
  - *Correção de risco* - um padrão de red-team descoberto é reincorporado ao
    banco de sementes adversariais; um defeito descoberto abre uma issue
    rastreada.
  - *Ferramentas de monitoramento* - spans OpenTelemetry + OpenInference em cada
    nó, chamada de LLM e chamada de embedding; contabilidade de
    tokens/latência/custo por turno; um gate de custo estrito que bloqueia o PR.
    Sinks opcionais: Langfuse Cloud e um Phoenix auto-hospedado.
  - *Melhorias previstas* - uma passagem de localização da base de conhecimento
    e um corpus mais amplo e mais diverso em tópicos que permitiria habilitar o
    limiar de similaridade de recuperação.
- **Práticas de ambiente de segurança e conformidade.** Nenhuma acreditação
  formal de segurança (sem SOC 2, ISO 27001, FedRAMP) - é uma implementação de
  referência open-source, não um serviço hospedado. Controles praticados:
  dependências fixadas via o lockfile; Dependabot e secret-scanning habilitados
  no CI; sem segredos no repositório; um invariante de privacidade de que o
  **texto da mensagem do usuário nunca é escrito em um span, log ou atributo de
  trace**, imposto por um teste de unidade dedicado; redação de PII antes de
  qualquer texto chegar ao LLM; um processo publicado de divulgação de
  segurança na [política de segurança](security.md). O design é mapeado ao guia
  de General-Wellness / Clinical-Decision-Support de 2026 da FDA, ao guia de
  2024 da WHO sobre grandes modelos multimodais, ao Good Machine Learning
  Practice da MHRA e aos artigos de governança de modelo do EU AI Act em
  [postura regulatória](regulatory-posture.md).
- **Mecanismos de transparência, inteligibilidade e responsabilização.** Toda
  resposta de `POST /chat` carrega seu **trace completo de decisões de
  salvaguarda** e seu **conjunto de citações**, no mesmo esquema contra o qual o
  arcabouço de avaliação avalia, para que um leitor possa ver exatamente por
  que o agente respondeu, recusou ou escalou. A demonstração interativa
  renderiza esse trace ao vivo em um painel de trace de backend. Toda afirmação
  clínica dentro de escopo deve citar um cartão da base de conhecimento; uma
  decisão de citação-não-verificada ou citação-ausente é exibida. A etapa
  opcional human-in-the-loop coloca uma pessoa no caminho de responsabilização
  para rascunhos de alto risco. Os Architecture Decision Records documentam as
  escolhas substantivas de design. Toda resposta da demonstração carrega o
  aviso inline "Esta é uma demonstração. Não é aconselhamento médico.",
  verificado pelo arcabouço de avaliação como um invariante de segurança.

### Informações de Transparência

- **Fonte de financiamento da implementação técnica.** Nenhuma. O repositório
  foi escrito por Waldemar Szemat sem financiamento externo, sem patrocinador
  corporativo e sem parceiro institucional.
- **Informações de terceiros.** O sistema depende de provedores terceiros de
  LLM e de embedding, todos alcançados por suas APIs públicas e todos
  selecionados por configuração: Groq, Cerebras, OpenAI, Anthropic
  (completamento) e Voyage AI (embeddings); um modelo BGE de
  `sentence-transformers` embutido fornece um fallback de embedding sem rede.
  Componentes open-source principais: LangGraph (orquestração), FastAPI
  (superfície HTTP), Chroma (armazenamento vetorial), OpenTelemetry e
  OpenInference (tracing), DeepEval e um núcleo de scorer feito à mão
  (avaliação), Promptfoo (red-team). Sinks opcionais de observabilidade:
  Langfuse Cloud, Arize Phoenix. Nenhum terceiro está integrado a uma decisão
  clínica.
- **Partes interessadas consultadas durante o design da intervenção.** Como uma
  implementação de referência de autor único, nenhum paciente, profissional ou
  grupo de defesa externo foi formalmente consultado. O design se apoia na
  experiência de campo prévia do autor liderando a engenharia de um produto de
  saúde digital de adesão à medicação na América Latina, e nos documentos de
  orientação publicados enumerados em
  [postura regulatória](regulatory-posture.md). Isto é declarado claramente
  porque o cartão do CHAI pede e a resposta honesta é "nenhuma, pela natureza
  do artefato".

---

## Métricas-chave

> O CHAI Applied Model Card pede métricas sob três áreas de princípio. A
> medição primária, reproduzível e imposta por CI deste projeto é o **gate
> determinístico de avaliação**: ele roda o grafo real do agente contra o
> corpus sintético com um cliente LLM stub (sem chave, juiz desativado), de
> modo que o resultado é totalmente reproduzível e isola o comportamento de
> *salvaguarda* da variabilidade do modelo. Os números abaixo são essa
> execução determinística. Métricas que dependem de um modelo ao vivo
> (fundamentação, fidelidade, alucinação e taxas de aprovação ao vivo) **não
> estão codificadas em rígido aqui**: elas são atualizadas separadamente,
> porque o comportamento de um modelo ao vivo muda entre execuções e um cartão
> do modelo não deve congelar um número que não consegue reproduzir sob
> demanda.

### Utilidade, Usabilidade e Eficácia

- **Objetivo da(s) métrica(s).** Demonstrar que o agente fundamenta toda
  afirmação clínica em um cartão verificado da base de conhecimento, e que um
  turno se conclui bem dentro do orçamento de custo e latência por turno, de
  modo que o sistema seja operável a $0/mês em infraestrutura de camada
  gratuita.
- **Resultado.**
  - `citation_correctness` = **1,000** (nenhum turno citou um id de cartão da
    KB desconhecido).
  - `citation_coverage` = **0,225** agregado.
  - Gate de custo / latência: **PASS**, modo estrito, contra os orçamentos por
    turno documentados (4.000 tokens de entrada / 1.000 tokens de saída /
    8.000 ms).
  - Os números de usabilidade do modelo ao vivo (tokens e latência por turno na
    camada gratuita da Groq) são atualizados separadamente.
- **Interpretação.** `citation_correctness = 1,000` significa que a salvaguarda
  de citação nunca deixou passar um id de cartão fabricado no corpus. A baixa
  `citation_coverage` é **esperada e não é um defeito do agente**: o cliente LLM
  stub determinístico não emite marcadores de citação por design, então nos
  casos golden a cobertura lê 0,00 e apenas os casos de
  não-correspondência / adversariais que não devem carregar nenhuma citação
  pontuam 1,00. A cobertura real de citações é uma propriedade do modelo ao
  vivo e é medida na execução ao vivo. A cobertura é reportada, mas não é uma
  dimensão que controla o PR.
- **Tipo de teste.** *Interno*, reproduzível, determinístico. O agente roda de
  ponta a ponta com um cliente LLM stub e sem chaves de API; os resultados são
  idênticos entre execuções no mesmo código.
- **Descrição dos dados de teste.** O corpus sintético de 218 casos: 100 em
  inglês (abrangendo as categorias golden, adversarial e de
  não-correspondência), 59 es-419, 59 pt-BR. Totalmente sintético; veja
  [dados](data.md).
- **Processo de validação e justificativa.** Executado pelo alvo de avaliação e
  pelo workflow de CI de avaliação em cada pull request. É uma validação de
  engenharia de software do comportamento das salvaguardas e do pipeline,
  **não** uma validação clínica - o agente não foi, e não alega ter sido,
  clinicamente validado.

### Justiça e Equidade

- **Objetivo da(s) métrica(s).** Demonstrar que o comportamento de segurança do
  agente não se degrada entre os três locales suportados - que um usuário
  es-419 ou pt-BR é mantido na mesma barra de segurança que um usuário em
  inglês.
- **Resultado.** Todos os **218** casos do corpus passam no gate determinístico,
  incluindo todos os 59 casos es-419 e todos os 59 casos pt-BR;
  `refusal_correctness` = **1,000** e `escalation_correctness` = **1,000** em
  cada fatia de locale. O gate aplica um conjunto idêntico de limiares aos três
  locales.
- **Interpretação.** No corpus determinístico **não há lacuna de locale** no
  comportamento de segurança: a correção de recusa e de escalonamento é uniforme
  entre en, es-419 e pt-BR. A ressalva honesta é que um modelo ao vivo pode se
  comportar de forma diferente por locale - execuções ao vivo anteriores
  revelaram falhas adversariais em es-419 que as salvaguardas determinísticas
  não revelam - e que os dados sintéticos subjacentes carregam um viés conhecido
  de vocabulário em inglês dos EUA (veja *Vieses conhecidos*). Esta métrica diz
  respeito à paridade de *locale*; o agente não toma nenhuma entrada de raça,
  sexo, idade ou outra demografia, então nenhum detalhamento de desempenho por
  subgrupo demográfico é aplicável.
- **Tipo de teste.** *Interno*, determinístico, estratificado por locale.
- **Descrição dos dados de teste.** As fatias de 59 casos es-419 e 59 casos
  pt-BR do corpus, curadas na mesma barra que os casos em inglês, avaliadas
  contra os mesmos limiares.
- **Processo de validação e justificativa.** As fatias de locale rodam em cada
  pull request junto com o inglês; uma regressão específica de locale reprova o
  build. Justificativa: a paridade de locale é uma propriedade de design
  declarada, então é imposta em vez de afirmada.

### Segurança e Confiabilidade

- **Objetivo da(s) métrica(s).** Demonstrar que o agente (a) recusa
  deterministicamente as categorias fora de escopo enumeradas, (b) escala
  deterministicamente os turnos com sinais de alerta agudos para um modelo de
  emergência e (c) faz ambos de forma reproduzível, antes de qualquer LLM
  estar envolvido.
- **Resultado.**
  - `refusal_correctness` = **1,000** (todo caso `must_refuse` foi recusado;
    recusa-versus-sobre-recusa avaliada em dois eixos).
  - `escalation_correctness` = **1,000** (todo caso `must_escalate` exibiu um
    modelo de escalonamento).
  - **Gate determinístico geral: PASS**, juiz desativado.
  - No gate offline de red-team, todos os **13** casos adversariais feitos à mão
    são recusados deterministicamente porque a camada de salvaguarda dispara
    antes de o nó do LLM ser alcançado.
  - O comportamento de segurança do modelo ao vivo (uma taxa de aprovação mais
    baixa e honesta que revela as próprias falhas do modelo de escalonamento
    subagudo e adversariais) e a medição de red-team ao vivo são atualizados
    separadamente com procedência completa.
- **Interpretação.** O gate determinístico prova que a *camada de salvaguarda* é
  correta e reproduzível: a lista de regex de escalonamento agudo e as
  categorias de recusa disparam conforme especificado, sem chave, em cada
  execução. Ele deliberadamente **não** prova que o agente é "à prova de
  jailbreak" nem robusto a injeção de prompt arbitrária - isso é uma medição
  separada, em execução ao vivo. Duas limitações delimitam este resultado
  honestamente: (1) sintomas subagudos que não estão na lista de sinais de
  alerta agudos são deixados ao modelo e são um modo de falha conhecido em
  execução ao vivo; (2) uma pergunta clínica fora do corpus quase
  correspondente é respondida contra o cartão mais próximo em vez de recusada
  (veja *Riscos e limitações conhecidos*).
- **Tipo de teste.** *Interno*, determinístico. O grafo real do agente roda com
  um cliente LLM stub; as salvaguardas de segurança são exercitadas exatamente
  como em produção porque rodam como nós do grafo antes da geração.
- **Descrição dos dados de teste.** Os 19 casos adversariais em inglês e os 5
  casos de não-correspondência, as fatias adversariais de es-419 e pt-BR e os
  casos de must-escalate ao longo do corpus, mais os 13 casos de red-team feitos
  à mão.
- **Processo de validação e justificativa.** O gate determinístico de avaliação
  e o gate offline de red-team rodam em cada pull request; o red-team ao vivo
  roda todas as noites. Uma regressão de segurança reprova o build.
  Justificativa: a superfície de segurança é o comportamento de maior
  consequência de um agente de saúde, então é fixada a verificações
  determinísticas, sem chave e reproduzíveis em vez de ao bom comportamento de
  um modelo no dia.

---

## Recursos

- **Referências de avaliação.** O arcabouço de avaliação, seus scorers e a
  lógica do gate fazem parte do código publicado; o relatório determinístico
  mais recente é gerado pelo alvo de avaliação e é reproduzível em um clone
  limpo. Os resultados de execução ao vivo são atualizados separadamente.
- **Ensaio clínico.** Nenhum. Nenhum ensaio clínico foi conduzido; nenhum é
  aplicável a uma implementação de referência não implantada.
- **Publicação(ões) revisada(s) por pares.** Nenhuma. Este é um artefato de
  referência open-source, não uma publicação de pesquisa.
- **Status de reembolso.** Não aplicável. O artefato não é um produto ou serviço
  faturável.
- **Consentimento ou divulgação do paciente exigido ou sugerido.** Nenhum
  consentimento de paciente é aplicável porque o sistema não tem pacientes reais
  nem dados reais de pacientes; o dataset é totalmente sintético e não carrega
  nenhum PHI ou PII (veja a declaração de IRB em [dados](data.md)). A divulgação
  *está* embutida de qualquer forma: toda resposta da demonstração carrega um
  banner persistente e um rodapé inline declarando que é uma demonstração, usa
  dados sintéticos, não é um dispositivo médico e que questões médicas vão ao
  profissional de saúde do usuário. Caso a arquitetura fosse algum dia
  produtizada para usuários reais, a divulgação explícita ao usuário e o
  consentimento apropriados à jurisdição seriam exigidos.
- **Partes interessadas consultadas durante o design da solução.** Nenhuma
  formalmente consultada; veja *Informações de Transparência* acima. O design se
  apoia na experiência de campo prévia do autor e em orientações regulatórias e
  éticas publicadas.

### Veja também

- [postura regulatória](regulatory-posture.md) - o limite FDA / WHO / MHRA
  / EU AI Act que o design respeita, e a lista canônica de fora de escopo.
- [dados](data.md) - o cartão do dataset sintético (formato Google Data Cards
  Playbook), metodologia de geração, postura de licença, declaração de IRB.
- [política de segurança](security.md) - processo de divulgação de segurança.
- CHAI Applied Model Card (template seguido por este documento):
  <https://www.chai.org/workgroup/applied-model> e
  <https://github.com/coalition-for-health-ai/mc-schema>.
