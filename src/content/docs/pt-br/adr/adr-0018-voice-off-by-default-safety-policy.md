---
title: "ADR-0018: Voz DESLIGADA por padrão — política de segurança"
description: Por que o modo de voz opcional é entregue DESLIGADO por padrão, condicionado a consentimento explícito, e com o áudio nunca retido.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0018: Voz DESLIGADA por padrão — política de segurança

- Status: Aceito
- Data: 2026-05-27 (retroativo — a voz foi entregue na v2.0.0)
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e definição do problema

A [ADR-0014](./adr-0014-voice-extension.md) adicionou voz (TTS via ElevenLabs
`eleven_multilingual_v2`, STT via ElevenLabs Scribe) como uma extensão da
SPA da demo. Aquela ADR captura o design, mas não codifica a postura de
segurança para o estado padrão do interruptor de voz.

A voz em uma demo próxima a um contexto regulado introduz uma superfície de
consentimento e de risco diferente da do texto:

- **Falsificação de identidade / deepfake**: uma voz sintetizada pode ser
  mal interpretada como a gravação de uma pessoa real.
- **Privacidade**: o áudio de STT é processado em trânsito mesmo quando a demo
  não o retém; o ônus do consentimento é maior do que para texto.
- **Autoridade do sinal de áudio**: uma voz que soa clínica pode ser ouvida
  como instrução mesmo quando o texto enquadra uma recusa.

A decisão é: qual é o estado padrão do interruptor de voz para
um visitante de primeira vez?

## Fatores de decisão

- **Postura de consentimento em primeiro lugar**: demos próximas a um contexto
  regulado demonstram consentimento, elas não o presumem.
- **Exposição a deepfake**: deixar a voz LIGADA por padrão coloca uma voz
  sintética nos ouvidos de cada visitante como primeira impressão. Esse é o sinal
  errado.
- **Paridade de localidade**: o padrão deve ser uniforme entre en / es-419 /
  pt-BR. Uma localidade com um padrão diferente seria difícil de defender.
- **Reversibilidade**: o opt-in deve ser revogável a qualquer momento sem perder
  a experiência de texto.

## Opções consideradas

- **Opção A**: Voz LIGADA por padrão; o interruptor é um recurso de "silenciar".
- **Opção B**: Voz DESLIGADA por padrão; o interruptor é um recurso de
  "habilitar". Persistência em `localStorage`.
- **Opção C**: Voz condicionada a um modal de privacidade explícito a cada
  sessão (sem persistência).

## Resultado da decisão

Opção escolhida: **Opção B** — Voz DESLIGADA por padrão, opt-in via interruptor,
opt-in persistido em `localStorage` por dispositivo. A razão determinante é a
postura de consentimento em primeiro lugar: uma demo próxima a um contexto
regulado que fala no momento em que um visitante a abre escolheu o padrão errado.
A persistência respeita o consentimento anterior do usuário sem incomodar a cada
sessão; o aviso explícito no rodapé "Áudio NÃO retido" é exibido independentemente
do estado do interruptor, de modo que o contexto de consentimento nunca desaparece.

### Confirmação

- O interruptor de voz na SPA da demo tem como padrão desmarcado.
- O interruptor lê e grava um sinalizador `voice_enabled` em `localStorage`;
  seu valor padrão é `false`.
- Um modal de divulgação de voz, exibido uma única vez por dispositivo, é o portão
  de consentimento que liga o interruptor.
- A nota de governança sobre deepfake e consentimento documenta a política e
  referencia esta ADR (consulte [política de consentimento de voz e
  deepfake](../governance/voice-consent-deepfake.md)).
- Paridade de localidade: o interruptor está DESLIGADO por padrão em en, es-419,
  pt-BR; o modal de divulgação é totalmente traduzido nas três.

## Consequências

### Positivas

- A experiência na primeira visita é silenciosa. A decisão de consentimento é do
  usuário, não da demo.
- A exposição a deepfake fica limitada aos usuários que habilitaram a voz
  explicitamente.
- O aviso de rodapé "Áudio NÃO retido" carrega o contexto de consentimento de
  forma visível o tempo todo.
- A paridade de localidade é imposta.

### Negativas

- Um clique extra para usuários que ativamente querem voz. Pequeno custo de UX.

### Neutras

- A persistência em `localStorage` é por dispositivo. Um usuário em dois
  dispositivos configura a voz de forma independente em cada um. Isso é aceitável
  para uma demo; uma implantação de produção migraria para uma preferência no lado
  do servidor caso algum dia entregasse voz.

## Prós e contras das opções

### Opção A: Voz LIGADA por padrão

- Boa, porque descoberta sem atrito do recurso de voz.
- Ruim, porque uma voz sintética toca na primeira visita — o consentimento é
  retroativo, não prévio.
- Ruim, por causa da exposição a deepfake para cada visitante.
- Ruim, porque é difícil de defender diante de um revisor clínico.

### Opção B (escolhida): Voz DESLIGADA por padrão + opt-in persistido

- Boa, porque consentimento em primeiro lugar.
- Boa, porque a exposição a deepfake fica limitada aos usuários que fizeram opt-in.
- Boa, porque o modal de divulgação carrega o enquadramento explícito de voz +
  privacidade.
- Ruim, por causa de um clique extra para usuários que querem voz.

### Opção C: Modal a cada sessão

- Boa, porque o consentimento é reafirmado a cada sessão.
- Ruim, por causa do padrão de UX que incomoda. Gera fadiga de consentimento.
- Ruim, porque um usuário que consentiu ontem é perguntado novamente hoje
  sem ganho operacional algum.

## Mais informações

- [ADR-0014](./adr-0014-voice-extension.md) — design da extensão de voz
- [Política de consentimento de voz e deepfake](../governance/voice-consent-deepfake.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
