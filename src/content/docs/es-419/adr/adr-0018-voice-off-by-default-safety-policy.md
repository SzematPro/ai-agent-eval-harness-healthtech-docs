---
title: "ADR-0018: Política de seguridad de voz desactivada por defecto"
description: Por qué el modo de voz opcional se publica desactivado por defecto, condicionado a un consentimiento explícito, y sin retener nunca el audio.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0018: Voz desactivada por defecto — Política de seguridad

- Estado: Aceptado
- Fecha: 2026-05-27 (retroactivo — la voz se publicó en v2.0.0)
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

[ADR-0014](./adr-0014-voice-extension.md) añadió la voz (TTS mediante ElevenLabs
`eleven_multilingual_v2`, STT mediante ElevenLabs Scribe) como una extensión de
la SPA de la demo. Ese ADR documenta el diseño, pero no codifica la postura de
seguridad para el estado por defecto del interruptor de voz.

La voz en una demo cercana a un ámbito regulado introduce una superficie de
consentimiento y riesgo distinta a la del texto:

- **Suplantación / deepfake**: una voz sintetizada puede
  malinterpretarse como una grabación de una persona real.
- **Privacidad**: el audio de STT se procesa en tránsito incluso cuando la demo
  no lo retiene; la carga del consentimiento es mayor que para el texto.
- **Autoridad de la señal de audio**: una voz que suena clínica puede
  escucharse como una instrucción incluso cuando el texto plantea una negativa.

La decisión es: ¿cuál es el estado por defecto del interruptor de voz para
una persona que visita el sitio por primera vez?

## Factores de decisión

- **Postura de consentimiento primero**: las demos cercanas a un ámbito regulado
  demuestran el consentimiento, no lo dan por sentado.
- **Exposición a deepfakes**: activar la voz por defecto pone una voz sintética
  en los oídos de cada visitante como primera impresión. Esa es la señal
  equivocada.
- **Paridad entre idiomas**: el valor por defecto debe ser uniforme en en / es-419 /
  pt-BR. Un idioma que tuviera un valor por defecto distinto sería difícil de
  justificar.
- **Reversibilidad**: la suscripción voluntaria debe poder revocarse en cualquier
  momento sin perder la experiencia de texto.

## Opciones consideradas

- **Opción A**: Voz activada por defecto; el interruptor funciona como un control
  de "silenciar".
- **Opción B**: Voz desactivada por defecto; el interruptor funciona como un
  control para "habilitar". Persistencia en `localStorage`.
- **Opción C**: Voz condicionada a un modal de privacidad explícito en cada
  sesión (sin persistencia).

## Resultado de la decisión

Opción elegida: **Opción B** — Voz desactivada por defecto, suscripción
voluntaria mediante el interruptor, con la suscripción persistida en
`localStorage` por dispositivo. La razón determinante es la postura de
consentimiento primero: una demo cercana a un ámbito regulado que habla en el
momento en que un visitante la abre ha elegido el valor por defecto equivocado.
La persistencia respeta el consentimiento previo del usuario sin insistir en
cada sesión; el aviso explícito en el pie "El audio NO se retiene" se muestra sin
importar el estado del interruptor, de modo que el contexto del consentimiento
nunca desaparece.

### Confirmación

- El interruptor de voz en la SPA de la demo está desmarcado por defecto.
- El interruptor lee y escribe una bandera `voice_enabled` en `localStorage`;
  su valor por defecto es `false`.
- Un modal de divulgación de voz, que aparece una sola vez por dispositivo, es la
  puerta de consentimiento que activa el interruptor.
- La nota de gobernanza sobre deepfakes y consentimiento documenta la política y
  hace referencia a este ADR (véase [política de consentimiento de voz y
  deepfakes](../governance/voice-consent-deepfake.md)).
- Paridad entre idiomas: el interruptor está desactivado por defecto en en, es-419, pt-BR;
  el modal de divulgación está completamente traducido en los tres.

## Consecuencias

### Positivas

- La experiencia de la primera visita es silenciosa. La decisión de consentimiento
  es del usuario, no de la demo.
- La exposición a deepfakes queda limitada a los usuarios que habilitaron la voz
  de forma explícita.
- El aviso del pie "El audio NO se retiene" mantiene el contexto del consentimiento
  visible en todo momento.
- Se garantiza la paridad entre idiomas.

### Negativas

- Un clic adicional para los usuarios que sí quieren la voz. Un costo pequeño de UX.

### Neutrales

- La persistencia en `localStorage` es por dispositivo. Un usuario con dos
  dispositivos configura la voz de forma independiente en cada uno. Eso es
  aceptable para una demo; un despliegue de producción migraría a una
  preferencia del lado del servidor si alguna vez publicara la voz.

## Pros y contras de las opciones

### Opción A: Voz activada por defecto

- Buena, porque el descubrimiento de la función de voz es sin fricción.
- Mala, porque una voz sintética se reproduce en la primera visita — el
  consentimiento es retroactivo, no previo.
- Mala, por la exposición a deepfakes para cada visitante.
- Mala, porque es difícil de justificar ante un revisor clínico.

### Opción B (elegida): Voz desactivada por defecto + suscripción voluntaria persistida

- Buena, porque pone el consentimiento primero.
- Buena, porque la exposición a deepfakes queda limitada a los usuarios suscritos.
- Buena, porque el modal de divulgación incluye el encuadre explícito de voz +
  privacidad.
- Mala, porque supone un clic adicional para los usuarios que quieren la voz.

### Opción C: Modal en cada sesión

- Buena, porque el consentimiento se reafirma en cada sesión.
- Mala, porque es un patrón de UX insistente. Provoca fatiga de consentimiento.
- Mala, porque a un usuario que dio su consentimiento ayer se le vuelve a preguntar
  hoy sin ninguna ganancia operativa.

## Más información

- [ADR-0014](./adr-0014-voice-extension.md) — diseño de la extensión de voz
- [Política de consentimiento de voz y deepfakes](../governance/voice-consent-deepfake.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
