---
title: "ADR-0022: Streaming de tokens"
description: Por qué los deltas de tokens transmitidos usan el modo de stream personalizado de LangGraph y un Protocolo de cliente de streaming aparte, publicado primero para el proveedor por defecto.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0022: Streaming de tokens — stream personalizado de LangGraph + Protocolo de cliente de streaming

- Estado: Aceptado
- Fecha: 2026-05-28

## Contexto

El nodo de generación de respuesta del agente almacenaba en búfer la respuesta completa del LLM antes de que se dispararan el análisis posterior, la verificación de citaciones y el evento SSE de nodo completado. La latencia visible para el usuario era, por lo tanto, el tiempo de reloj desde el primer token hasta el último token, más el paso de análisis, antes de que apareciera algo en la SPA. En una respuesta de modo JSON de 500 tokens a los típicos 250 tok/s de Groq, eso son ~2 segundos de silencio entre el evento de nodo iniciado y el primer carácter del mensaje del asistente.

El endpoint de Groq desplegado ya expone una superficie de streaming de Server-Sent-Events (`chat/completions` con `stream: true`); los deltas por token llegan por la red a medida que el modelo los genera. La SPA ya ejecuta un EventSource contra el endpoint de chat y consume los eventos del ciclo de vida SSE por nodo ([ADR-0010](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0010-streaming-execution-graph/)). La infraestructura para hacer aflorar los deltas existe; este ADR registra las decisiones de diseño tomadas al conectar los dos extremos.

## Decisión

Tres decisiones acopladas:

1. **Mecanismo entre límites: stream personalizado de LangGraph.** El nodo de generación de respuesta emite un evento de stream personalizado (`{"event": "token_delta", "delta": "..."}`) por cada bloque de tokens que recibe del adaptador. El manejador de streaming de FastAPI solicita el modo de stream `custom` de LangGraph junto a los modos existentes; los bloques de `custom` se enrutan a registros SSE `token_delta` mediante un pequeño ayudante de mapeo.

2. **API del adaptador: Protocolo de cliente de streaming aparte.** Un Protocolo de cliente de streaming extiende el Protocolo base de cliente de LLM con un método asíncrono `stream(messages, params)` que devuelve un iterador asíncrono de deltas de tokens. Ambos Protocolos son comprobables en tiempo de ejecución. Los adaptadores que exponen streaming implementan ambos Protocolos; los adaptadores que no lo hacen se quedan solo con el Protocolo base. La rama de streaming del agente enruta mediante una comprobación isinstance y recurre a la llamada de completado en búfer para los adaptadores sin streaming.

3. **Alcance: solo Groq en el lanzamiento.** La rama de streaming se publicó para el cliente de Groq y el stub en proceso (para las pruebas). Los clientes de Cerebras, OpenAI, Anthropic y de respaldo se quedaron deliberadamente solo en modo búfer. Cerebras y OpenAI usan la misma forma SSE compatible con OpenAI y pueden añadirse con cambios de adaptador de una línea cuando se justifique; la forma SSE de Anthropic difiere y necesita su propio trabajo de adaptador. El cliente de respaldo no es consciente del streaming: ante un fallo del stream primario a mitad de vuelo, el consumidor hace aflorar un evento de error SSE y la SPA muestra un reintento. Un estado futuro de stream en cascada está documentado en "Trabajo futuro".

## Alternativas consideradas

### A1: Cola fuera de banda en lugar del stream personalizado de LangGraph

Pasar una cola desde el manejador de FastAPI al grafo mediante la configuración del runnable. El nodo empuja los deltas a la cola; el manejador lee de la cola de forma concurrente con el stream del grafo.

- Pro: Funciona en cualquier versión de LangGraph; es un patrón preexistente en bases de código asíncronas de Python.
- Contra: Introduce un estado fuera de banda que la capa de pruebas tiene que configurar; el orden entre los deltas de la cola y los bloques de stream existentes no es nativo del grafo y tiene que imponerlo el manejador.
- Rechazada: la versión fijada de LangGraph ya proporciona una API nativa documentada de escritura de stream.

### A2: Extender el método de completado con una retrollamada por token

Un método de Protocolo; el streaming es una retrollamada que el adaptador invoca por token.

- Pro: Sin nueva clase de Protocolo.
- Contra: Cambia la firma de cada adaptador; el tipado estático no puede distinguir adaptadores con streaming de los que no lo tienen; el tipo de la retrollamada es más difícil de razonar que un iterador asíncrono.
- Rechazada: el tipado estructural mediante un Protocolo aparte es el patrón de Python más idiomático.

### A3: Hacer streaming para cada adaptador que lo soporte (Cerebras + OpenAI incluidos)

Maximiza la cobertura de streaming extendiendo los adaptadores de Cerebras y OpenAI al mismo tiempo.

- Pro: más beneficios para el usuario por incremento.
- Contra: El streaming de Cerebras y OpenAI bajo el cambio de nivel del respaldo en cascada no está validado; podría filtrar respuestas a medio transmitir en un respaldo; el diseño en cascada en sí mismo es solo de búfer (según el diseño de respaldo en [ADR-0002](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/)).
- Diferida: anotada como trabajo futuro más abajo.

### A4: La SPA renderiza los deltas en un panel aparte; el área principal del mensaje aún almacena en búfer

Dos destinos de renderizado: un panel de stream en bruto al estilo de depuración, más el área principal del mensaje que espera la finalización del turno.

- Pro: Sin el fallo de reemplazo al completar.
- Contra: Incumple el objetivo visible para el usuario (todo el sentido del streaming de tokens es la materialización al estilo de ChatGPT en el área principal).
- Rechazada: el renderizado progresivo en el área principal es la recompensa de cara al usuario.

## Consecuencias

### Positivas

- Reduce la latencia percibida hasta el primer token de ~2s (búfer de respuesta completa) a ~80ms (primer token en la red) en una generación típica de Groq.
- La superficie de streaming es puramente aditiva en la red SSE: los clientes que no se suscriben al nuevo nombre de evento lo ignoran silenciosamente según la semántica SSE del W3C.
- La ruta de completado en búfer se preserva sin cambios para cada adaptador sin streaming, cada solicitud de chat JSON y la CLI de evaluación. La compatibilidad hacia atrás se mantiene para esas rutas.
- La nueva superficie de Protocolo es pequeña (un método, un tipo); los dobles de prueba son simples.

### Negativas

- El respaldo en cascada se omite al hacer streaming. Ante un fallo del stream primario de Groq, el consumidor ve un evento de error SSE y debe reintentar. El respaldo en cascada para turnos transmitidos es un diseño de estado futuro al que este ADR no se compromete.
- El renderizado progresivo de la SPA debe manejar estados de JSON parcial (el LLM está en modo JSON según [ADR-0020](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0020-structured-agent-reply/); los tokens llegan como `{"kind":"...","text":"..."}` carácter por carácter). La capa de renderizado descarta la envoltura JSON y renderiza solo el valor interno `text`; un `"text":"...` parcial requiere una lógica de UI cuidadosa.
- La cifra de latencia del bloque de streaming es el tiempo acumulado desde que se abrió el stream; el delta de tiempo de reloj por bloque no se reporta porque rara vez es significativo para la contabilidad posterior.

### Neutrales

- El formato de la red SSE añade un nuevo nombre de evento (`token_delta`); los nombres de evento existentes (`graph_topology`, `node_started`, `node_completed`, `paused`, `turn_completed`, `error`, `interaction_logged`, `cost_updated`) quedan intactos.

## Notas de implementación

- La carga útil del token-delta lleva la cadena del delta, una razón de finalización, los conteos de tokens de entrada / salida, una cifra de latencia acumulada, el nombre del modelo y un pequeño mapa de metadatos. Los bloques intermedios llevan una razón de finalización nula y conteos de tokens en cero; el bloque terminal lleva la contabilidad por turno.
- El reintento del stream cubre solo el establecimiento de la conexión inicial (3 intentos, retroceso exponencial). Los fallos a mitad de stream se lanzan de inmediato.
- La solicitud de streaming compatible con OpenAI establece `stream=True` más `stream_options={"include_usage": True}` para que el bloque terminal lleve el uso en todos los proveedores compatibles con OpenAI.
- El analizador de bloque a token-delta es agnóstico del proveedor y compartido, de modo que los futuros adaptadores de streaming de Cerebras / OpenAI lo reutilizan.

## Trabajo futuro

- **Streaming de Cerebras**: un cambio de adaptador de una línea reutilizando los ayudantes de transporte compartidos. Diferido hasta que surja una necesidad medida.
- **Streaming de OpenAI**: misma forma que Cerebras.
- **Streaming de Anthropic**: forma de red SSE distinta (bloques con tipo de evento); necesita su propia implementación de adaptador.
- **Respaldo de stream en cascada**: el reto de diseño es que ante un fallo del primario a mitad de stream el consumidor ya ha almacenado en búfer tokens parciales; reintentar en el respaldo retransmite desde el principio, rompiendo el orden. Un diseño posible es "detener y reproducir desde el principio en el respaldo" con la SPA descartando el búfer parcial en el primer bloque del secundario. Fuera del alcance en el lanzamiento; se incorporaría por su cuenta.

## Reversión

Revertir el cambio de la SPA restaura el renderizado en búfer sin ningún otro cambio de código. La infraestructura de streaming queda en su sitio (es inofensiva cuando la SPA no consume el nuevo evento). La superficie de Protocolo y los ayudantes de transporte pueden quedarse porque las rutas de código en búfer no los usan.

## Véase también

- [ADR-0002](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/) (abstracción de proveedor de LLM): la superficie de Protocolo que este ADR extiende.
- [ADR-0010](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0010-streaming-execution-graph/) (grafo de ejecución con streaming): el marco SSE al que este ADR añade un evento.
- [ADR-0020](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0020-structured-agent-reply/) (respuesta estructurada del agente): el contrato de modo JSON que los deltas transmitidos llevan a través sin cambios.
