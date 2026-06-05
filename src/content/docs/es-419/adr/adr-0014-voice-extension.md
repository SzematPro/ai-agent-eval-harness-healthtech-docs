---
title: "ADR-0014: Extensión de voz (ElevenLabs TTS + STT)"
description: Por qué la E/S de voz se agrega mediante ElevenLabs con TTS bajo demanda y STT Scribe, desactivada por defecto, sin retener nunca el audio, demostrando que la canalización es agnóstica al canal a $0/mes.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0014: Extensión de voz (ElevenLabs TTS + STT)

- Estado: Aceptado
- Fecha: 2026-05-24
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

La demo es un agente de adherencia a la medicación agnóstico al canal que
demuestra cómo construir sistemas basados en LLM para industrias reguladas
con citación verificable, cumplimiento y transparencia de costos. Una
superficie solo de texto no ejercita la modalidad de voz que los flujos de
trabajo regulados (telesalud, líneas directas de pacientes, accesibilidad)
requieren. Agregar entrada de voz (STT) y salida de voz (TTS) demuestra que
la canalización de procesamiento del agente (recuperación, exigencia de
citaciones, lógica de rechazo, auditoría) es genuinamente independiente del
canal, no acoplada a una superficie solo de texto.

La extensión debe respetar las restricciones que fijan los ADR existentes:

- Capa gratuita de Hugging Face Spaces, CPU Basic, base de $0/mes (ADR-0007).
- Proveedores de LLM Groq / Cerebras / Anthropic (ADR-0002).
- El contrato de respuesta JSON de `/chat` está congelado; cualquier nueva
  superficie no debe romper a los consumidores existentes.
- Capa gratuita de Supabase para datos operativos (ADR-0011, ADR-0016).

La capa de voz debe ser una extensión aditiva: desactivada por defecto, con
cero consumo de recursos hasta que el usuario opte por activarla, y
limpiamente separable de la ruta solo de texto para que el agente funcione de
forma idéntica sin ella.

¿Cómo agregamos E/S de voz a la demo de una manera que (a) demuestre que la
canalización de procesamiento es agnóstica al canal, (b) mantenga la base en
$0/mes, (c) no rompa el contrato congelado de `/chat`, y (d) rastree el costo
contra el esquema de contabilidad existente de Supabase?

## Factores de la decisión

- **Prueba de agnosticismo al canal**: la voz debe ser una superficie de
  primera clase, no un añadido posterior, para demostrar que la canalización
  de procesamiento es genuinamente independiente del canal.
- **Base de $0/mes**: la demo solo de texto sigue siendo gratuita. El consumo
  de voz es opcional y se presupuesta por separado.
- **Estabilidad del contrato**: el esquema JSON de `/chat` está congelado
  (ADR-0010). Los metadatos de voz deben viajar junto a ese esquema, no dentro
  de él.
- **Observabilidad de costos**: según ADR-0011 y ADR-0016, cada unidad
  facturable (tokens de LLM, caracteres de TTS, segundos de STT) debe
  rastrearse en Supabase para la contabilidad de costos posterior a la demo.
- **Superficie mínima de vendors**: el proyecto ya depende de Groq, Cerebras,
  Anthropic, Hugging Face y Supabase. La voz debería agregar un vendor
  (ElevenLabs), no dos.
- **Presupuesto de latencia**: la capa gratuita de Hugging Face Spaces ya
  tiene un arranque en frío de 10-30 s. La voz no debe agregar latencia no
  acotada a la experiencia de chat de ruta caliente.
- **Privacidad**: el audio de conversaciones relacionadas con la salud es
  sensible. El audio en bruto no debe persistirse; solo se registra el texto
  transcrito (después de la redacción de las barreras de seguridad según
  ADR-0005).

## Opciones consideradas

### TTS (texto a voz)

- **ElevenLabs `eleven_multilingual_v2`, bajo demanda (elegida)**: TTS por
  solicitud activado cuando el usuario hace clic en un botón de reproducción
  en un turno del asistente completado. Mapeo de voz apropiado al idioma:
  Sarah para es-419, Matilda para en-US, Bella para pt-BR.
- **Transmisión de TTS siempre activa**: audio empujado por el servidor en
  cada token del asistente. Rechazada: cada turno transmitido consume
  caracteres tanto si el usuario escucha como si no, agotando la cuota de la
  capa gratuita bajo una carga ligera de demo y agregando latencia al flujo de
  eventos SSE.
- **API `SpeechSynthesis` nativa del navegador**: sin dependencia de vendor,
  pero la calidad de voz es inconsistente entre navegadores y sistemas
  operativos; el contexto de salud exige una claridad que el TTS nativo no
  puede garantizar.

### STT (voz a texto)

- **ElevenLabs Scribe (elegida)**: STT diseñado para el propósito del mismo
  vendor, una clave de API, superficie de facturación consistente.
- **API Web Speech nativa del navegador**: sin dependencia de vendor, pero la
  calidad es demasiado baja para enunciados de contexto de salud (terminología
  médica, nombres de medicamentos, español/portugués con acento). Los errores
  en la transcripción se propagarían a la canalización de RAG y producirían
  respuestas inseguras.
- **OpenAI Whisper (API)**: alta calidad, pero agrega una segunda dependencia
  de vendor y una segunda superficie de facturación. La demo ya muestra
  ElevenLabs para TTS; usar un proveedor diferente para STT fragmenta la
  narrativa.

### Agente de voz (full-duplex)

- **Simulación de agente de voz full-duplex mediante ElevenLabs
  Conversational AI**: audio bidireccional en tiempo real. Aplazada: el modelo
  de costo es por minuto de tiempo conectado, la complejidad de implementación
  es sustancial, y el patrón de clic-para-reproducir + pulsar-para-hablar
  cubre la prueba de concepto de agnosticismo al canal. Documentada como una
  extensión opcional futura.
- **Sin voz en absoluto**: rechazada. Una superficie solo de texto no ejercita
  la modalidad de voz que los flujos de trabajo regulados exigen.

## Resultado de la decisión

Opción elegida: **extensión de voz de ElevenLabs con TTS bajo demanda
(`eleven_multilingual_v2`), ElevenLabs Scribe para STT, entrega de audio
clic-para-reproducir, y agente de voz full-duplex opcional como un hito
futuro.**

### TTS: ElevenLabs `eleven_multilingual_v2`, bajo demanda

Cada turno del asistente completado se renderiza en audio solo cuando el
usuario hace clic en el botón de reproducción en ese turno. La solicitud de
TTS es una llamada en segundo plano a la API de ElevenLabs; la URL de audio
resultante (o el blob en base64) se devuelve a la aplicación para su
reproducción. No se genera audio de forma proactiva.

Mapeo de voz por configuración regional:

| Configuración regional | ID de voz | Nombre |
|--------|----------|------|
| en-US | `XrExE9yKIg1WjnnlVkGX` | Matilda |
| es-419 | `yoZ06kpGZMiJkInNR0Gt` | Sarah |
| pt-BR | `tiBZYpS5hJTFXbHm5CwK` | Bella |

El mapeo es configurable y el operador puede anularlo sin un cambio de código.

### STT: ElevenLabs Scribe

El usuario graba audio mediante la API `MediaRecorder` del navegador (el
acceso al micrófono lo solicita el navegador). El blob grabado se envía al
backend, que lo reenvía al endpoint de ElevenLabs Scribe. El texto transcrito
reemplaza lo que habría sido la entrada escrita y entra a la canalización
normal de `/chat` (recuperación de RAG, barreras de seguridad, generación con
LLM). El blob de audio en bruto se descarta después de la transcripción; solo
se registra el texto, sujeto a la misma redacción de barreras de seguridad
que la entrada escrita (ADR-0005).

### Transporte de metadatos de audio: complemento SSE, no mutación de esquema

El esquema JSON de `ChatResponse` está congelado. Los metadatos de audio de
TTS (URL de audio, duración, conteo de caracteres) se transportan en un tipo
de evento SSE dedicado (`voice_audio`) emitido junto al evento de respuesta
existente. Los consumidores que no optan por la voz ignoran por completo el
tipo de evento. La respuesta JSON de `/chat` (cuando no se negocia SSE)
permanece sin cambios; el audio solo está disponible sobre el canal SSE con la
voz habilitada.

Esto es consistente con el patrón de ADR-0010: los nuevos tipos de evento
extienden la superficie SSE sin mutar el contrato JSON base.

### Modelo y seguimiento de costos

- Capa gratuita de ElevenLabs: 10,000 caracteres/mes de TTS. El STT Scribe
  tiene su propia asignación de capa gratuita.
- Para cargas de demo que excedan la capa gratuita, el operador la complementa
  con una clave de pago de ElevenLabs. La demo base (solo de texto) no se ve
  afectada.
- Según ADR-0011 y ADR-0016, los conteos de caracteres de TTS y los segundos
  de STT se rastrean en la tabla de uso de turnos de demo en Supabase junto a
  los conteos de tokens de LLM. Esto habilita la contabilidad de costos por
  sesión y por clave sin un sistema de facturación separado.

### Dependencia: SDK de ElevenLabs

El SDK de Python de ElevenLabs (versión 2.49.0, ya instalado en el proyecto)
es la única nueva dependencia en tiempo de ejecución. No se introducen SDK de
vendor adicionales.

### Valores por defecto de la interfaz

La voz está desactivada por defecto en la aplicación. Un interruptor en la
interfaz de chat la habilita. Cuando está desactivada, no se hacen llamadas
de TTS ni de STT, no se renderiza interfaz de audio, y el chat se comporta de
forma idéntica a la compilación previa a la voz. Esto asegura que la base de
$0/mes se preserve para cada sesión que no opte explícitamente por activarla.

### Agente de voz full-duplex: aplazado

Un agente de voz en tiempo real que use ElevenLabs Conversational AI
(WebSocket full-duplex) es arquitectónicamente compatible con esta extensión
pero se aplaza a un hito futuro. El TTS clic-para-reproducir y el STT
pulsar-para-hablar proporcionan evidencia suficiente de procesamiento
agnóstico al canal sin el costo y la complejidad de un WebSocket de audio
persistente.

### Confirmación

- La aplicación renderiza un interruptor de voz (por defecto DESACTIVADO) en la
  interfaz de chat.
- Cuando la voz está ACTIVADA, cada turno del asistente muestra un botón de
  reproducción; hacer clic en él activa una llamada de TTS y reproduce el audio
  devuelto.
- Cuando la voz está ACTIVADA, un botón de micrófono graba audio y lo envía al
  backend para la transcripción STT; el texto transcrito entra a la
  canalización de `/chat`.
- El esquema JSON de `ChatResponse` no cambia cuando no se negocia SSE.
- Los consumidores de SSE ven un nuevo tipo de evento `voice_audio`; los
  consumidores que lo ignoran no se ven afectados.
- La tabla de uso de turnos de demo en Supabase registra los caracteres de TTS
  y los segundos de STT por turno.
- La ruta solo de texto (voz DESACTIVADA) produce cero llamadas a la API de
  ElevenLabs.
- El SDK de ElevenLabs es la única nueva dependencia en tiempo de ejecución.

## Consecuencias

### Positivas

- **Validación de agnosticismo al canal**: la E/S de voz demuestra que la
  canalización de procesamiento funciona de forma idéntica a través de
  superficies de texto y de audio, no solo en teoría sino en una demo
  ejecutable.
- **Base de $0/mes preservada**: la voz está desactivada por defecto; las
  sesiones solo de texto no cuestan nada del lado de ElevenLabs.
- **Estabilidad del contrato**: el esquema JSON de `/chat` queda intacto. El
  audio viaja en un tipo de evento SSE separado, siguiendo el patrón de
  extensión de ADR-0010.
- **Un único vendor nuevo**: ElevenLabs maneja tanto TTS como STT. Sin un
  segundo vendor de voz, sin dependencia de OpenAI para Whisper.
- **Observabilidad de costos**: los caracteres de TTS y los segundos de STT se
  rastrean en la tabla existente de uso de turnos de demo en Supabase,
  habilitando el reporte de costos por sesión junto a los costos de LLM.
- **Privacidad por diseño**: el audio en bruto se procesa en tránsito y se
  descarta. Solo el texto transcrito se registra, sujeto a la redacción de las
  barreras de seguridad (ADR-0005).
- **Listo para el futuro**: el patrón de TTS + STT bajo demanda es un paso
  intermedio hacia la Conversational AI full-duplex sin una reescritura
  arquitectónica.

### Negativas

- **Techo de la capa gratuita de ElevenLabs**: 10,000 caracteres/mes de TTS
  son aproximadamente 2,000 palabras. El uso sostenido de la demo (sesiones de
  evaluadores, demostraciones en conferencias) lo agotará. El operador debe
  complementarlo con una clave de pago para períodos de alto tráfico.
- **Latencia en la primera llamada de TTS**: la solicitud de TTS bajo demanda
  agrega 1-3 segundos de latencia por turno. Esto es aceptable para
  clic-para-reproducir (el usuario espera una pausa) pero no sería aceptable
  para la transmisión siempre activa.
- **Nueva dependencia en tiempo de ejecución**: el SDK de ElevenLabs se suma
  al árbol de dependencias. El SDK está bien mantenido y la superficie de la
  API es estrecha (generar TTS, transcribir STT), pero es un paquete más que
  rastrear para actualizaciones de seguridad.
- **Permiso de micrófono del navegador**: el STT requiere que el usuario
  conceda acceso al micrófono. Algunas redes corporativas y navegadores lo
  restringen; el respaldo de entrada de texto siempre está disponible.

### Neutrales

- Se agrega un nuevo módulo de voz para el cliente de ElevenLabs, el renderizado
  de TTS y la transcripción STT.
- La aplicación gana un interruptor de voz, un botón de reproducción por turno
  y un botón de micrófono para la entrada. Cuando la voz está DESACTIVADA,
  estos elementos de interfaz están ocultos.
- El flujo de eventos SSE gana un tipo de evento `voice_audio`. Los
  consumidores de SSE existentes que no manejan este tipo de evento no se ven
  afectados (compatible hacia adelante por diseño).

## Ventajas y desventajas de las opciones

### ElevenLabs `eleven_multilingual_v2`, bajo demanda (elegida)

- Buena, porque clic-para-reproducir genera audio solo cuando se consume,
  manteniendo el uso de caracteres de TTS proporcional a las escuchas reales.
- Buena, porque `eleven_multilingual_v2` maneja en-US, es-419 y pt-BR con un
  único modelo, evitando el enrutamiento de modelos por idioma.
- Buena, porque el mapeo de voz por idioma (Sarah, Matilda, Bella) proporciona
  un tono apropiado a la configuración regional para el contexto de salud.
- Mala, porque la capa gratuita (10K caracteres/mes) es fácil de agotar bajo
  una carga de demo sostenida.
- Mala, porque la generación bajo demanda agrega 1-3 s de latencia por acción
  de reproducción.

### Transmisión de TTS siempre activa

- Buena, porque el usuario escucha el audio de inmediato sin un clic
  adicional.
- Mala, porque cada turno del asistente genera un renderizado de audio
  completo tanto si el usuario escucha como si no, multiplicando el consumo de
  caracteres por el número de turnos.
- Mala, porque la transmisión de audio intercalada con el flujo de eventos SSE
  aumenta el presupuesto de latencia y la complejidad del manejo de eventos
  del lado del cliente.
- Mala, porque el modelo de costo es impredecible bajo carga de demo.

### `SpeechSynthesis` nativa del navegador

- Buena, porque no hay dependencia de vendor ni cuota.
- Mala, porque la calidad de voz varía entre navegadores y sistemas
  operativos; la claridad del contexto de salud no está garantizada.
- Mala, porque no ejercita la integración con ElevenLabs, dejando la modalidad
  de voz sin demostrar.

### ElevenLabs Scribe para STT (elegida)

- Buena, porque está diseñado para el propósito por el mismo vendor, una clave
  de API, una superficie de facturación.
- Buena, porque maneja la terminología médica y la entrada multilingüe (en-US,
  es-419, pt-BR) mejor que las alternativas nativas del navegador.
- Mala, porque requiere una clave de API de ElevenLabs y consume la cuota de la
  capa gratuita de STT.

### API Web Speech nativa del navegador para STT

- Buena, porque no hay dependencia de vendor ni cuota.
- Mala, porque la calidad de transcripción es demasiado baja para los
  enunciados de salud (nombres de medicamentos, condiciones, entrada
  multilingüe con acento).
- Mala, porque los errores se propagan a la canalización de RAG y pueden
  producir respuestas inseguras o sin sentido.

### OpenAI Whisper (API) para STT

- Buena, porque Whisper es un modelo de STT bien conocido y de alta calidad.
- Mala, porque introduce una segunda dependencia de vendor (OpenAI) para una
  única capacidad, fragmentando la superficie de facturación y la narrativa.
- Mala, porque fragmenta la superficie de vendor de voz: la demo usa
  ElevenLabs para TTS, por lo que el STT debería venir del mismo proveedor para
  mantener unificadas la superficie de facturación y la superficie de
  integración.

### Agente de voz full-duplex (ElevenLabs Conversational AI)

- Buena, porque es la demostración más impresionante de las capacidades de
  ElevenLabs.
- Buena, porque el audio bidireccional en tiempo real es el patrón de grado de
  producción para agentes de voz.
- Mala, porque el modelo de costo es por minuto de tiempo conectado, que es
  más difícil de controlar bajo carga de demo.
- Mala, porque la complejidad de implementación (gestión de WebSocket, manejo
  de interrupciones, VAD) es sustancial para una implementación de referencia.
- Mala, porque el patrón de clic-para-reproducir + pulsar-para-hablar ya
  demuestra el procesamiento agnóstico al canal a menor costo y complejidad.

### Sin voz en absoluto

- Buena, porque no agrega costo, ni dependencia, ni complejidad.
- Mala, porque una superficie solo de texto no ejercita la modalidad de voz,
  dejando la afirmación de agnosticismo al canal sin respaldo de evidencia
  ejecutable.

## Más información

- Abstracción de proveedor de LLM: [ADR-0002](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/)
- Objetivo de despliegue y restricción de $0/mes: [ADR-0007](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/)
- Arquitectura de transmisión y patrón de extensión SSE: [ADR-0010](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0010-streaming-execution-graph/)
- Capa de datos y seguimiento de costos (Supabase): [ADR-0011](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0011-data-layer-supabase/)
- Mejora continua y almacenamiento de uso: [ADR-0016](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0016-continuous-improvement-storage/)
- Barreras de seguridad y redacción de privacidad: [ADR-0005](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/)
- Documentación de la API de ElevenLabs: <https://elevenlabs.io/docs/api-reference>
- Modelo `eleven_multilingual_v2` de ElevenLabs: <https://elevenlabs.io/docs/speech-synthesis/models>
- ElevenLabs Scribe STT: <https://elevenlabs.io/docs/capabilities/speech-to-text>
- Precios y límites de capa gratuita de ElevenLabs: <https://elevenlabs.io/pricing>
- MADR 4.0.0: <https://adr.github.io/madr/>
