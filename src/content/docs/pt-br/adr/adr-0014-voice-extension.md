---
title: "ADR-0014: Extensão de voz (ElevenLabs TTS + STT)"
description: Por que a E/S de voz é adicionada via ElevenLabs TTS sob demanda e Scribe STT, desligada por padrão, áudio nunca retido, provando que o pipeline é agnóstico de canal a $0/mês.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0014: Extensão de voz (ElevenLabs TTS + STT)

- Status: Aceito
- Data: 2026-05-24
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

A demo é um agente de adesão a medicamentos agnóstico de canal que
demonstra como construir sistemas baseados em LLM para indústrias reguladas com
citação verificável, conformidade e transparência de custo. Uma superfície apenas de
texto não exercita a modalidade de voz que fluxos de trabalho regulados
(telessaúde, centrais de atendimento ao paciente, acessibilidade) exigem. Adicionar entrada de voz
(STT) e saída de voz (TTS) demonstra que o pipeline de processamento do agente
-- recuperação, aplicação de citação, lógica de recusa, auditoria -- é
genuinamente independente de canal, não acoplado a uma superfície apenas de texto.

A extensão precisa respeitar as restrições que as ADRs existentes travam:

- Hugging Face Spaces camada gratuita, CPU Basic, baseline de $0/mês (ADR-0007).
- Provedores de LLM Groq / Cerebras / Anthropic (ADR-0002).
- O contrato de resposta JSON de `/chat` está congelado; qualquer nova superfície não pode
  quebrar consumidores existentes.
- Supabase camada gratuita para dados operacionais (ADR-0011, ADR-0016).

A camada de voz precisa ser uma extensão aditiva: desligada por padrão, consumo de
recursos zero até o usuário optar por ativá-la, e claramente separável do
caminho apenas de texto para que o agente funcione de forma idêntica sem ela.

Como adicionamos E/S de voz à demo de uma forma que (a) prove que o
pipeline de processamento é agnóstico de canal, (b) mantenha o baseline em
$0/mês, (c) não quebre o contrato travado de `/chat` e (d) rastreie o
custo contra o esquema de contabilidade existente do Supabase?

## Fatores da decisão

- **Prova de agnosticismo de canal**: a voz precisa ser uma superfície de primeira classe, não um
  acréscimo improvisado, para demonstrar que o pipeline de processamento é
  genuinamente independente de canal.
- **Baseline de $0/mês**: a demo apenas de texto permanece gratuita. O consumo de
  voz é opcional e orçado separadamente.
- **Estabilidade de contrato**: o esquema JSON de `/chat` está congelado (ADR-0010).
  Os metadados de voz precisam trafegar ao lado, não dentro, desse esquema.
- **Observabilidade de custo**: conforme a ADR-0011 e a ADR-0016, toda unidade faturável
  (tokens de LLM, caracteres de TTS, segundos de STT) precisa ser rastreada no Supabase para
  contabilidade de custo pós-demo.
- **Superfície mínima de fornecedor**: o projeto já depende de Groq,
  Cerebras, Anthropic, Hugging Face e Supabase. A voz deve adicionar um
  fornecedor (ElevenLabs), não dois.
- **Orçamento de latência**: a camada gratuita do Hugging Face Spaces já tem um
  cold start de 10-30 s. A voz não pode adicionar latência ilimitada à
  experiência de chat no caminho quente.
- **Privacidade**: áudio de conversas relacionadas a saúde é sensível. Áudio
  bruto não pode ser persistido; apenas o texto transcrito é registrado (após
  a redação dos guardrails conforme a ADR-0005).

## Opções consideradas

### TTS (text-to-speech)

- **ElevenLabs `eleven_multilingual_v2`, sob demanda (escolhida)**: TTS por
  requisição disparado pelo usuário clicando em um botão de reprodução em um turno do
  assistente já concluído. Mapeamento de voz apropriado ao idioma: Sarah para es-419,
  Matilda para en-US, Bella para pt-BR.
- **TTS streaming sempre ativo**: áudio empurrado pelo servidor a cada token do assistente.
  Rejeitada: cada turno transmitido consome caracteres quer o usuário
  escute ou não, estourando a cota da camada gratuita sob carga leve de demo
  e adicionando latência ao stream de eventos SSE.
- **API `SpeechSynthesis` nativa do navegador**: sem dependência de fornecedor, mas a
  qualidade de voz é inconsistente entre navegadores e SOs; o contexto
  de saúde exige uma clareza que o TTS nativo não pode garantir.

### STT (speech-to-text)

- **ElevenLabs Scribe (escolhida)**: STT feito sob medida do mesmo fornecedor,
  uma chave de API, superfície de faturamento consistente.
- **API Web Speech nativa do navegador**: sem dependência de fornecedor, mas a qualidade é
  baixa demais para enunciados de contexto de saúde (terminologia médica, nomes de
  medicamentos, espanhol/português com sotaque). Erros na transcrição se
  propagariam para o pipeline de RAG e produziriam respostas inseguras.
- **OpenAI Whisper (API)**: alta qualidade, mas adiciona uma segunda dependência de
  fornecedor e uma segunda superfície de faturamento. A demo já exibe
  ElevenLabs para TTS; usar um provedor diferente para STT fragmenta a
  narrativa.

### Agente de voz (full-duplex)

- **Simulação de agente de voz full-duplex via ElevenLabs Conversational AI**:
  áudio bidirecional em tempo real. Adiada: o modelo de custo é por minuto de
  tempo conectado, a complexidade de implementação é substancial, e o padrão
  de clicar-para-reproduzir + push-to-talk cobre a prova de conceito de agnosticismo de
  canal. Documentada como uma extensão opcional futura.
- **Nenhuma voz**: rejeitada. Uma superfície apenas de texto não exercita a
  modalidade de voz que fluxos de trabalho regulados exigem.

## Resultado da decisão

Opção escolhida: **extensão de voz ElevenLabs com TTS sob demanda
(`eleven_multilingual_v2`), ElevenLabs Scribe para STT, entrega de áudio por
clicar-para-reproduzir, e agente de voz full-duplex opcional como um marco futuro.**

### TTS: ElevenLabs `eleven_multilingual_v2`, sob demanda

Cada turno do assistente já concluído é renderizado em áudio apenas quando o usuário
clica no botão de reprodução naquele turno. A requisição de TTS é uma chamada em
segundo plano à API do ElevenLabs; a URL de áudio resultante (ou blob base64) é
retornada ao aplicativo para reprodução. Nenhum áudio é gerado proativamente.

Mapeamento de voz por localidade:

| Localidade | ID da voz | Nome |
|--------|----------|------|
| en-US | `XrExE9yKIg1WjnnlVkGX` | Matilda |
| es-419 | `yoZ06kpGZMiJkInNR0Gt` | Sarah |
| pt-BR | `tiBZYpS5hJTFXbHm5CwK` | Bella |

O mapeamento é configurável e pode ser sobreposto pelo operador sem uma
mudança de código.

### STT: ElevenLabs Scribe

O usuário grava áudio via a API `MediaRecorder` do navegador (acesso ao
microfone solicitado pelo navegador). O blob gravado é enviado ao backend,
que o encaminha ao endpoint ElevenLabs Scribe. O texto transcrito
substitui o que teria sido a entrada digitada e entra no pipeline normal de
`/chat` (recuperação de RAG, guardrails, geração de LLM). O blob de áudio
bruto é descartado após a transcrição; apenas o texto é registrado,
sujeito à mesma redação de guardrail que a entrada digitada (ADR-0005).

### Transporte de metadados de áudio: sidecar SSE, não mutação de esquema

O esquema JSON do `ChatResponse` está congelado. Os metadados de áudio do TTS (URL do áudio,
duração, contagem de caracteres) são carregados em um tipo de evento SSE dedicado
(`voice_audio`) emitido ao lado do evento de resposta existente. Consumidores
que não optam por voz ignoram o tipo de evento inteiramente. A resposta JSON de
`/chat` (quando o SSE não é negociado) permanece inalterada; o áudio
só está disponível pelo canal SSE com voz habilitada.

Isso é consistente com o padrão da ADR-0010: novos tipos de evento estendem a
superfície SSE sem mutar o contrato JSON base.

### Modelo de custo e rastreamento

- Camada gratuita do ElevenLabs: 10.000 caracteres/mês de TTS. O Scribe STT tem sua
  própria alocação de camada gratuita.
- Para cargas de demo que excedam a camada gratuita, o operador complementa com
  uma chave paga do ElevenLabs. A demo baseline (apenas de texto) não é afetada.
- Conforme a ADR-0011 e a ADR-0016, contagens de caracteres de TTS e segundos de STT são
  rastreados na tabela de uso de turnos de demo no Supabase ao lado de contagens de tokens
  de LLM. Isso habilita contabilidade de custo por sessão e por chave sem um
  sistema de faturamento separado.

### Dependência: SDK do ElevenLabs

O SDK Python do ElevenLabs (versão 2.49.0, já instalado no
projeto) é a única nova dependência em tempo de execução. Nenhum SDK de fornecedor adicional é
introduzido.

### Padrões da UI

A voz está desligada por padrão no aplicativo. Um botão de alternância na UI do chat a habilita.
Quando desligada, nenhuma chamada de TTS ou STT é feita, nenhuma UI de áudio é renderizada, e o
chat se comporta de forma idêntica à build pré-voz. Isso garante que o baseline de $0/mês
seja preservado para toda sessão que não opte explicitamente por ativá-la.

### Agente de voz full-duplex: adiado

Um agente de voz em tempo real usando ElevenLabs Conversational AI (WebSocket
full-duplex) é arquiteturalmente compatível com esta extensão, mas é
adiado para um marco futuro. O TTS por clicar-para-reproduzir e o STT por push-to-talk
fornecem evidência suficiente de processamento agnóstico de canal sem o
custo e a complexidade de um WebSocket de áudio persistente.

### Confirmação

- O aplicativo renderiza um botão de alternância de voz (padrão DESLIGADO) na UI do chat.
- Quando a voz está LIGADA, cada turno do assistente mostra um botão de reprodução; clicá-lo
  dispara uma chamada de TTS e reproduz o áudio retornado.
- Quando a voz está LIGADA, um botão de microfone grava áudio e o envia ao
  backend para transcrição STT; o texto transcrito entra no pipeline de `/chat`.
- O esquema JSON do `ChatResponse` permanece inalterado quando o SSE não é negociado.
- Consumidores SSE veem um novo tipo de evento `voice_audio`; consumidores que o ignoram
  não são afetados.
- A tabela de uso de turnos de demo no Supabase registra caracteres de TTS e segundos de STT
  por turno.
- O caminho apenas de texto (voz DESLIGADA) produz zero chamadas à API do ElevenLabs.
- O SDK do ElevenLabs é a única nova dependência em tempo de execução.

## Consequências

### Positivas

- **Validação de agnosticismo de canal**: a E/S de voz prova que o pipeline de
  processamento funciona de forma idêntica entre superfícies de texto e de áudio, não apenas em
  teoria, mas em uma demo executável.
- **Baseline de $0/mês preservado**: a voz está desligada por padrão; sessões apenas de
  texto não custam nada do lado do ElevenLabs.
- **Estabilidade de contrato**: o esquema JSON de `/chat` fica intocado. O áudio
  trafega em um tipo de evento SSE separado, seguindo o padrão de extensão da ADR-0010.
- **Único fornecedor novo**: o ElevenLabs trata tanto TTS quanto STT. Sem segundo
  fornecedor de voz, sem dependência do OpenAI para o Whisper.
- **Observabilidade de custo**: caracteres de TTS e segundos de STT são rastreados na
  tabela de uso de turnos de demo existente no Supabase, habilitando relatório de custo por
  sessão ao lado dos custos de LLM.
- **Privacidade por concepção**: o áudio bruto é processado em trânsito e descartado.
  Apenas o texto transcrito é registrado, sujeito à redação de guardrail
  (ADR-0005).
- **Pronto para o futuro**: o padrão de TTS + STT sob demanda é um trampolim para
  o Conversational AI full-duplex sem uma reescrita arquitetural.

### Negativas

- **Teto da camada gratuita do ElevenLabs**: 10.000 caracteres/mês de TTS são aproximadamente
  2.000 palavras. Uso de demo sustentado (sessões de avaliadores,
  demonstrações em conferências) vai esgotá-lo. O operador precisa complementar com uma
  chave paga para períodos de alto tráfego.
- **Latência na primeira chamada de TTS**: a requisição de TTS sob demanda adiciona 1-3
  segundos de latência por turno. Isso é aceitável para clicar-para-reproduzir (o
  usuário espera uma espera) mas não seria aceitável para streaming sempre ativo.
- **Nova dependência em tempo de execução**: o SDK do ElevenLabs adiciona à árvore de
  dependências. O SDK é bem mantido e a superfície de API é estreita (gerar
  TTS, transcrever STT), mas é mais um pacote a acompanhar para atualizações de
  segurança.
- **Permissão de microfone do navegador**: o STT exige que o usuário conceda
  acesso ao microfone. Algumas redes corporativas e navegadores restringem isso;
  o fallback de entrada de texto está sempre disponível.

### Neutras

- Um novo módulo de voz é adicionado para o cliente ElevenLabs, renderização de TTS e
  transcrição de STT.
- O aplicativo ganha um botão de alternância de voz, um botão de reprodução por turno e um botão de
  microfone para entrada. Quando a voz está DESLIGADA, esses elementos de UI ficam ocultos.
- O stream de eventos SSE ganha um tipo de evento `voice_audio`. Consumidores SSE
  existentes que não tratam esse tipo de evento não são afetados
  (compatíveis com o futuro por concepção).

## Prós e contras das opções

### ElevenLabs `eleven_multilingual_v2`, sob demanda (escolhida)

- Bom, porque clicar-para-reproduzir gera áudio apenas quando consumido, mantendo
  o uso de caracteres de TTS proporcional às escutas reais.
- Bom, porque `eleven_multilingual_v2` trata en-US, es-419 e pt-BR
  com um único modelo, evitando roteamento de modelo por idioma.
- Bom, porque o mapeamento de voz por idioma (Sarah, Matilda, Bella)
  fornece tom apropriado à localidade para o contexto de saúde.
- Ruim, porque a camada gratuita (10K caracteres/mês) é fácil de esgotar sob
  carga de demo sustentada.
- Ruim, porque a geração sob demanda adiciona 1-3 s de latência por ação de reprodução.

### TTS streaming sempre ativo

- Bom, porque o usuário ouve o áudio imediatamente sem um clique extra.
- Ruim, porque cada turno do assistente gera uma renderização completa de áudio quer
  o usuário escute ou não, multiplicando o consumo de caracteres pelo número
  de turnos.
- Ruim, porque o áudio em streaming intercalado com o stream de eventos SSE
  aumenta o orçamento de latência e a complexidade do tratamento de eventos
  no lado do cliente.
- Ruim, porque o modelo de custo é imprevisível sob carga de demo.

### `SpeechSynthesis` nativo do navegador

- Bom, porque não há dependência de fornecedor nem cota.
- Ruim, porque a qualidade de voz varia entre navegadores e SOs;
  a clareza do contexto de saúde não é garantida.
- Ruim, porque não exercita a integração com o ElevenLabs, deixando a
  modalidade de voz não comprovada.

### ElevenLabs Scribe para STT (escolhida)

- Bom, porque é feito sob medida pelo mesmo fornecedor, uma chave de API, uma
  superfície de faturamento.
- Bom, porque trata terminologia médica e entrada multilíngue
  (en-US, es-419, pt-BR) melhor do que alternativas nativas do navegador.
- Ruim, porque exige uma chave de API do ElevenLabs e consome a cota da camada gratuita do
  STT.

### API Web Speech nativa do navegador para STT

- Bom, porque não há dependência de fornecedor nem cota.
- Ruim, porque a qualidade de transcrição é baixa demais para enunciados de saúde
  (nomes de medicamentos, condições, entrada multilíngue com sotaque).
- Ruim, porque erros se propagam para o pipeline de RAG e podem produzir
  respostas inseguras ou sem sentido.

### OpenAI Whisper (API) para STT

- Bom, porque o Whisper é um modelo de STT conhecido e de alta qualidade.
- Ruim, porque introduz uma segunda dependência de fornecedor (OpenAI) para uma
  única capacidade, fragmentando a superfície de faturamento e a narrativa.
- Ruim, porque fragmenta a superfície de fornecedor de voz: a demo usa
  ElevenLabs para TTS, então o STT deve vir do mesmo provedor para manter a
  superfície de faturamento e a superfície de integração unificadas.

### Agente de voz full-duplex (ElevenLabs Conversational AI)

- Bom, porque é a demonstração mais impressionante das capacidades do ElevenLabs.
- Bom, porque áudio bidirecional em tempo real é o padrão de nível de produção
  para agentes de voz.
- Ruim, porque o modelo de custo é por minuto de tempo conectado, o que é
  mais difícil de controlar sob carga de demo.
- Ruim, porque a complexidade de implementação (gerenciamento de WebSocket,
  tratamento de interrupção, VAD) é substancial para uma implementação de
  referência.
- Ruim, porque o padrão de clicar-para-reproduzir + push-to-talk já prova
  processamento agnóstico de canal a custo e complexidade menores.

### Nenhuma voz

- Bom, porque não adiciona nenhum custo, nenhuma dependência, nenhuma complexidade.
- Ruim, porque uma superfície apenas de texto não exercita a modalidade de voz,
  deixando a afirmação de agnosticismo de canal sem suporte de evidência executável.

## Mais informações

- Abstração de fornecedor de LLM: [ADR-0002](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0002-llm-vendor-abstraction/)
- Alvo de implantação e restrição de $0/mês: [ADR-0007](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0007-deployment/)
- Arquitetura de streaming e padrão de extensão SSE: [ADR-0010](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0010-streaming-execution-graph/)
- Camada de dados e rastreamento de custo (Supabase): [ADR-0011](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0011-data-layer-supabase/)
- Melhoria contínua e armazenamento de uso: [ADR-0016](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0016-continuous-improvement-storage/)
- Guardrails e redação de privacidade: [ADR-0005](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0005-guardrails/)
- Documentação da API do ElevenLabs: <https://elevenlabs.io/docs/api-reference>
- Modelo `eleven_multilingual_v2` do ElevenLabs: <https://elevenlabs.io/docs/speech-synthesis/models>
- ElevenLabs Scribe STT: <https://elevenlabs.io/docs/capabilities/speech-to-text>
- Preços e limites de camada gratuita do ElevenLabs: <https://elevenlabs.io/pricing>
- MADR 4.0.0: <https://adr.github.io/madr/>
