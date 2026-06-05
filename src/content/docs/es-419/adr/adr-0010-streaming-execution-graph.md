---
title: "ADR-0010: Transmisión del grafo de ejecución del agente a la interfaz"
description: Por qué los eventos de ejecución del agente por nodo se transmiten al navegador sobre SSE, opcional mediante negociación de cabecera Accept, sin romper el contrato JSON de chat.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0010: Transmisión del grafo de ejecución del agente a la interfaz sobre SSE

- Estado: Aceptado
- Fecha: 2026-05-21
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

Una versión posterior agregó un Grafo de Ejecución del Agente en vivo a la
aplicación de página única (SPA) de la demo: una canalización de izquierda a
derecha que se ilumina nodo por nodo a medida que se ejecuta el LangGraph del
agente, y que codifica visualmente la latencia por nodo y el resultado del
turno. Este ADR registra la única decisión arquitectónicamente significativa
que esa característica obliga a tomar.

Antes de esta característica, el agente se maneja por solicitud/respuesta.
`POST /chat` invoca el grafo compilado de LangGraph, espera a que termine
todo el turno y devuelve un único documento JSON `ChatResponse`. El panel de
traza de backend de la aplicación renderiza ese documento después de que el
turno se completa. No hay mecanismo para que el navegador se entere de que
`guardrail_pre` ha terminado y `retrieve_context` ha comenzado mientras el
turno todavía está en ejecución. Una visualización nodo por nodo necesita
exactamente eso: eventos de progreso por nodo entregados al navegador a
medida que ocurren.

El agente ya produce los datos subyacentes por nodo. La decisión de
observabilidad (ADR-0006) cableó spans de OpenTelemetry alrededor de cada
nodo del grafo, cada llamada al LLM, cada recuperación y cada decisión de
barrera de seguridad, cada uno con tiempos y atributos. La medición por nodo
existe. Lo que no existe es una ruta que *emita* eventos por nodo a un
navegador a medida que el turno se ejecuta. El framework LangGraph elegido en
ADR-0001 provee la fuente para esa ruta: el grafo compilado expone una API de
transmisión que produce un evento por cada paso del ciclo de vida del nodo,
junto a la invocación no transmitida que usa el código de
solicitud/respuesta.

La superficie de la API de transmisión de LangGraph evolucionó durante 2026:
la API que usa la implementación es la API de transmisión de LangGraph
recomendada al momento de la implementación. La decisión registrada aquí, un
transporte SSE negociado a través de la cabecera `Accept` y opcional sobre
los endpoints existentes, es independiente de cuál API de transmisión
específica de LangGraph la alimente en última instancia; la implementación
selecciona la API recomendada vigente en ese momento.

Dos restricciones acotan la respuesta. Primero, el contrato JSON existente de
`POST /chat` y `POST /chat/resume` no debe romperse: los llamadores
programáticos, y las propias pruebas del proyecto de la ruta JSON, deben
seguir funcionando byte por byte. El arnés de evaluación no está entre los
llamadores afectados (maneja el agente a través del constructor del grafo y la
invocación no transmitida directamente y nunca llama al endpoint HTTP) pero
los consumidores generales de la API HTTP sí lo están. Segundo, la
aplicación de página única es libre de frameworks y de dependencias por
construcción (ADR-0007); cualquiera que sea el transporte elegido, el lado del
navegador debe consumirlo con JavaScript puro y sin biblioteca.

¿Cómo entregamos eventos de ejecución del agente por nodo al navegador en
tiempo real, para que la aplicación pueda renderizar un grafo de ejecución en
vivo, sin romper el contrato JSON existente de `/chat` y sin agregar una
dependencia del lado del cliente?

## Factores de la decisión

- **Flujo unidireccional, de servidor a cliente.** El navegador necesita
  *recibir* una secuencia de eventos de nodo. No necesita *enviar* nada a
  mitad del turno; el turno ya está completamente especificado por el cuerpo
  inicial de `POST /chat`. El transporte debe coincidir con esa forma y no
  cargar con el costo de una capacidad que la característica no usa.
- **Compatibilidad hacia atrás del contrato JSON de `/chat`.** Un llamador
  programático existente, y cada prueba existente de la ruta JSON, deben
  recibir el `ChatResponse` sin cambios. El comportamiento de transmisión
  debe ser opcional, no un cambio rompedor de la respuesta por defecto.
- **Cero dependencias nuevas del lado del cliente.** La aplicación es libre
  de frameworks; el navegador debe consumir el flujo con una API incorporada
  y JavaScript puro. No se puede introducir ninguna biblioteca de cliente.
- **Reutilizar el grafo existente y los datos existentes por nodo.** La ruta
  de transmisión debe manejarse desde el grafo compilado ya construido en el
  lifespan de FastAPI y los spans por nodo que ADR-0006 ya cableó. No debe
  construir un segundo grafo ni reimplementar la medición por nodo.
- **Capacidad de despliegue en el host de demo de capa gratuita.** El
  transporte debe funcionar a través del proxy del Docker SDK de Hugging Face
  Spaces (ADR-0007) en CPU Basic, con un único worker de uvicorn, a $0/mes.
- **Legibilidad de ingeniería.** Una superficie de transmisión limpia
  manejada desde una API de transmisión de LangGraph sobre el grafo compilado
  debe leerse como una elección de transporte deliberada, no incidental.

## Opciones consideradas

- **Eventos enviados por el servidor (SSE), opcionales mediante negociación
  de contenido por cabecera `Accept`** (elegida): `POST /chat` y
  `POST /chat/resume` devuelven un cuerpo `text/event-stream` cuando la
  solicitud lleva `Accept: text/event-stream`, y el JSON `ChatResponse` sin
  cambios en caso contrario.
- **WebSocket**: un nuevo endpoint bidireccional `ws://` que transporta los
  eventos por nodo.
- **Sondeo del cliente**: el navegador solicita repetidamente un endpoint de
  estado de turno hasta que el turno se completa.
- **Sin transmisión; renderizar el grafo después del turno**: mantener la
  invocación no transmitida, dibujar la ruta final de nodos una vez a partir
  del `ChatResponse`.

Dentro de la opción SSE, el esquema de eventos en sí fue una subdecisión.
AG-UI, un protocolo emergente de eventos de agente a interfaz de 2026, se
consideró como el esquema de cable para los eventos por nodo. Para esta demo
autocontenida el proyecto usa en cambio un pequeño esquema de eventos SSE a
medida (seis eventos, enumerados en el Resultado de la decisión más abajo)
que es suficiente para el Grafo de Ejecución del Agente y no carga con
superficie de protocolo externo. La denominación de eventos compatible con
AG-UI se anota como una posible alineación futura si el proyecto alguna vez
necesita interoperar con un cliente AG-UI.

## Resultado de la decisión

Opción elegida: **eventos enviados por el servidor, opcionales a través de
negociación de contenido por cabecera `Accept` en los endpoints existentes
`/chat` y `/chat/resume`.** Cuando una solicitud lleva
`Accept: text/event-stream`, el endpoint devuelve un flujo SSE de seis tipos
de evento: un evento inicial `graph_topology` que lleva el conjunto real de
nodos y aristas del grafo compilado, luego eventos `node_started`,
`node_completed`, `paused` y `error` a medida que el turno se ejecuta, y un
`turn_completed` terminal que lleva el `ChatResponse` completo. El backend
maneja ese flujo desde una API de transmisión de LangGraph sobre el grafo
compilado ya mantenido en el estado de la aplicación. Cuando una solicitud
lleva cualquier otro `Accept`, el endpoint se comporta exactamente como la
ruta de solicitud/respuesta: invoca el grafo y devuelve el JSON
`ChatResponse`.

SSE es la elección de carga estructural porque el flujo de datos es
estrictamente unidireccional. El navegador recibe un flujo de eventos de
nodo; nunca necesita enviar un frame de vuelta a mitad del turno. SSE es un
protocolo unidireccional de servidor a cliente y por lo tanto es un ajuste
exacto, donde WebSocket agregaría un canal full-duplex, un endpoint separado
no HTTP y manejo del ciclo de vida de la conexión para un canal de retorno
que la característica nunca usa. SSE también se consume sin biblioteca de
cliente, lo que mantiene la línea de cero dependencias de la aplicación. La
API `EventSource` incorporada del navegador no se puede usar aquí:
`EventSource` emite un `GET` y no puede enviar un cuerpo de solicitud ni
cabeceras personalizadas, mientras que `/chat` y `/chat/resume` son endpoints
`POST` que toman un cuerpo JSON y deben llevar `Accept: text/event-stream`.
La aplicación consume en cambio el flujo con la API `fetch` que ya usa para
`/chat`: lee el cuerpo de respuesta transmitido a través de
`response.body.getReader()`, decodifica los bytes con `TextDecoder` y analiza
los frames `text/event-stream` por sí misma. Esto es una pequeña cantidad de
JavaScript puro y no agrega dependencias. Y SSE viaja sobre HTTP plano, por
lo que atraviesa el proxy de Hugging Face Spaces sin una actualización de
protocolo.

Hacer que la transmisión sea opcional a través de negociación de contenido es
la segunda elección de carga estructural. La cabecera `Accept` es el propio
mecanismo de HTTP para que un cliente indique qué representación quiere.
Condicionar el comportamiento de transmisión a `Accept: text/event-stream`
significa que el contrato JSON queda intacto para cada llamador que no pide el
flujo: misma ruta de endpoint, mismo método, mismo esquema `ChatResponse`,
mismos códigos de estado. El modo de transmisión es puramente aditivo. Esto
preserva el valor de opción de la superficie `/chat`: la ruta de transmisión
y la ruta JSON coexisten en un endpoint, y un cambio futuro en cualquiera de
las dos no perturba a la otra.

La ruta de transmisión agrega una capa de emisión, no un nuevo agente. Usa
una API de transmisión de LangGraph sobre el mismo grafo compilado que el
lifespan ya construye; el constructor del grafo no cambia, el código de los
nodos no cambia, los spans de OpenTelemetry por nodo de ADR-0006 no cambian.
La decisión es *transmitir lo que ya se ejecuta*, no rearquitectar el agente.

Las opciones no transmitidas fueron rechazadas. WebSocket compra
bidireccionalidad que la característica no necesita, a costa de un segundo
endpoint y más código de ciclo de vida. El sondeo produce un diente de sierra
de solicitudes, no puede entregar un evento de nodo en el instante en que
ocurre, y en un host de capa gratuita desperdicia el presupuesto de
solicitudes por sesión que ADR-0007 limita por tasa. Renderizar el grafo solo
después del turno a partir del `ChatResponse` es el respaldo honesto (y es la
ruta de degradación de la aplicación), pero como experiencia principal
descarta todo el efecto en vivo, nodo por nodo, que es el sentido de la
característica.

### Contrato de compatibilidad hacia atrás

El modo de transmisión es aditivo y opcional. El contrato es:

- Una solicitud `POST /chat` o `POST /chat/resume` con
  `Accept: text/event-stream` recibe una respuesta `text/event-stream`.
- Una solicitud con cualquier otro valor de `Accept` (incluyendo
  `application/json`, `*/*` y una cabecera `Accept` ausente) recibe el JSON
  `ChatResponse`: esquema, nombres de campo y códigos de estado idénticos.
- El evento terminal `turn_completed` del flujo SSE lleva la carga útil
  completa de `ChatResponse`, de modo que un cliente de transmisión termina el
  turno con exactamente los datos que recibe un cliente JSON.
- En el flujo de `/chat/resume`, el evento `turn_completed` también lleva una
  medición `human_wait_ms`. Este valor vive en el sobre del evento SSE, no
  dentro del objeto `ChatResponse`: el esquema `ChatResponse` se mantiene
  byte por byte idéntico tanto en la ruta JSON como en la de transmisión, y
  `human_wait_ms` es observable solo para un cliente de reanudación que
  transmite.
- El arnés de evaluación no se ve afectado: invoca el grafo a través del
  constructor del grafo directamente y nunca emite una solicitud HTTP
  `/chat`. La negociación de contenido existe para los consumidores generales
  de la API HTTP, no para el arnés.

### Nota de despliegue: el proxy del Space no debe almacenar en búfer el flujo

SSE depende de que cada evento llegue al navegador a medida que se vacía. Un
proxy inverso que almacena en búfer el cuerpo de respuesta derrota la
característica: el navegador recibiría cada evento de nodo a la vez, al final
del turno. El despliegue del Docker SDK de Hugging Face Spaces (ADR-0007) se
sitúa detrás de un proxy de ese tipo. La respuesta de transmisión por lo
tanto establecerá `X-Accel-Buffering: no` y `Cache-Control: no-cache`, y el
manejador de transmisión vaciará cada registro SSE a medida que la API de
transmisión de LangGraph lo produzca. `X-Accel-Buffering: no` es, sin
embargo, una pista específica de nginx, y no se garantiza que el proxy de
Hugging Face Spaces la respete: la cabecera es necesaria pero no
demostrablemente suficiente. La implementación por lo tanto debe verificar en
el Space en vivo que los eventos realmente lleguen de forma incremental (por
ejemplo, una verificación `curl -N` contra el endpoint desplegado que observe
que los eventos lleguen uno por uno en lugar de como un único bloque de fin de
turno), y el manual de operaciones de despliegue registra tanto la cabecera
como ese paso de verificación. La postura de único worker de uvicorn
registrada en ADR-0007 es compatible con SSE: una respuesta SSE es una única
respuesta HTTP de larga duración en el worker, no estado compartido.

### Confirmación

La decisión se implementó y se confirmó conforme a los siguientes criterios:

- Los endpoints `/chat` y `/chat/resume` se ramifican según la cabecera
  `Accept` de la solicitud: `text/event-stream` devuelve una respuesta
  transmitida, cualquier otro valor devuelve el JSON `ChatResponse`. Ambas
  ramas están cubiertas por pruebas, incluyendo una prueba de regresión que
  afirma que la ruta JSON queda byte por byte sin cambios.
- La rama de transmisión se maneja desde una API de transmisión de LangGraph
  sobre el grafo compilado en el estado de la aplicación; el constructor del
  grafo permanece sin cambios, lo que las pruebas unitarias del grafo del
  agente sin cambios siguen verificando.
- Una prueba de transmisión afirma la secuencia de eventos SSE (el inicial
  `graph_topology`, luego los eventos por nodo y terminales) para un turno
  normal, un turno rechazado (con un `retrieve_context` omitido), un turno
  pausado por HITL y un turno que falla a mitad del flujo, contra el esquema
  de eventos documentado.
- La suite del control de calidad y el arnés de evaluación pasan, lo que
  confirma que la adición de transmisión no perturbó la ruta de ejecución no
  HTTP.
- La documentación de despliegue registra el requisito de no almacenamiento en
  búfer del proxy y el paso de verificación de entrega incremental en el Space
  en vivo.

## Consecuencias

### Positivas

- El navegador recibe eventos de ejecución por nodo en tiempo real, que es la
  capacidad habilitadora para el Grafo de Ejecución del Agente en vivo.
- El contrato JSON de `/chat` queda intacto: la transmisión es opcional a
  través de `Accept`, por lo que ningún llamador programático existente y
  ninguna prueba existente de la ruta JSON cambian de comportamiento.
- No se agrega dependencia del lado del cliente; la aplicación se mantiene
  libre de frameworks y consume el cuerpo `text/event-stream` con JavaScript
  puro.
- La ruta de transmisión reutiliza el grafo compilado y los spans por nodo
  que el proyecto ya construye; es una capa de emisión, no un segundo agente.
- SSE viaja sobre HTTP plano, por lo que se despliega a través del proxy de
  Hugging Face Spaces sin actualización de protocolo y se mantiene dentro de
  la postura de $0/mes.
- Una superficie limpia de transmisión-de-LangGraph-a-SSE es una
  demostración concreta de ingeniería de agentes con transmisión.

### Negativas

- Los manejadores de `/chat` y `/chat/resume` ganan una segunda ruta de
  código; los endpoints ahora tienen una rama JSON y una rama de transmisión
  que mantener sincronizadas, que es más superficie para probar y mantener.
- La entrega de SSE depende de que ningún proxy almacene en búfer la
  respuesta; un proxy inverso mal configurado degrada silenciosamente el
  efecto en vivo a un volcado posterior al turno. La cabecera
  `X-Accel-Buffering: no` es una pista específica de nginx y no se garantiza
  que el proxy de Hugging Face Spaces la respete, por lo que es necesaria pero
  no demostrablemente suficiente; la implementación debe verificar la entrega
  incremental en el Space en vivo (ver la nota de despliegue). Esta es una
  dependencia operativa que no existía antes.
- Una respuesta SSE de larga duración ocupa una conexión del worker durante la
  duración del turno; en el Space de capa gratuita de único worker esto acota
  la concurrencia, consistente con la postura existente de único worker pero
  vale la pena señalarlo.
- Una respuesta SSE de larga duración debe cancelarse cuando el cliente se
  desconecta. Si el navegador cierra la conexión (pestaña cerrada, navegación
  fuera) y el manejador no lo nota, la ejecución del grafo sigue
  ejecutándose y el único worker de capa gratuita permanece ocupado con
  trabajo que nadie leerá, drenando el único worker que tiene el Space. El
  manejador de transmisión debe detectar la desconexión del cliente y abortar
  la ejecución del grafo en curso en lugar de dejarla ejecutarse hasta
  completarse sin ser observada.
- La robustez de SSE a través de proxies inactivos necesita cuidado
  explícito. El flujo debe emitir un campo `id` por evento y líneas de
  comentario de latido periódicas (líneas de mantenimiento de conexión `:`)
  para que un intermediario inactivo no trate una conexión silenciosa como
  muerta y la descarte. Esto importa más durante una pausa de HITL: entre el
  evento `paused` y la reanudación del humano el flujo puede estar inactivo
  por mucho tiempo, y sin latidos esa ventana inactiva es exactamente cuando
  es probable que un proxy cierre la conexión.
- SSE es unidireccional por diseño: si una característica futura alguna vez
  necesita un mensaje de cliente a servidor a mitad del turno, SSE no puede
  transportarlo y esa característica necesitaría un transporte diferente. Este
  es un límite aceptado, no un costo actual.

### Neutrales

- La ruta de ejecución del agente no cambia: el constructor del grafo, el
  código de los nodos, las barreras de seguridad, la ruta de RAG y los spans
  de OpenTelemetry están todos como estaban. La decisión agrega emisión, no
  comportamiento.
- El esquema `ChatResponse` no cambia; ahora también se transporta como la
  `data` del evento SSE terminal `turn_completed`.
- El esquema de eventos SSE se convierte en una nueva superficie de contrato
  público: seis eventos (`graph_topology`, `node_started`, `node_completed`,
  `paused`, `error`, `turn_completed`), documentados y versionados con el
  proyecto.
- Una API de transmisión de LangGraph se convierte en una parte usada de la
  dependencia LangGraph ya fijada; ningún paquete nuevo entra al archivo de
  bloqueo. Cuál API de transmisión específica se usa es una elección de
  implementación (la superficie de transmisión de LangGraph evolucionó durante
  2026) y no cambia esta decisión, que trata del transporte SSE y de la
  activación opcional negociada por `Accept`.

## Ventajas y desventajas de las opciones

### SSE, opcional mediante negociación de contenido por cabecera `Accept`

- Buena, porque SSE es unidireccional de servidor a cliente, lo que coincide
  exactamente con un flujo de eventos de nodo que no necesita canal de retorno
  del cliente.
- Buena, porque la negociación de contenido mantiene el contrato JSON de
  `ChatResponse` byte por byte intacto para cada llamador que no transmite.
- Buena, porque el navegador consume `text/event-stream` con la API `fetch`
  incorporada y un lector de cuerpo transmitido, sin biblioteca de cliente,
  manteniendo la línea de cero dependencias.
- Buena, porque SSE viaja sobre HTTP plano y atraviesa el proxy de Hugging
  Face Spaces sin actualización de protocolo.
- Buena, porque el flujo se maneja desde una API de transmisión de LangGraph
  sobre el grafo compilado existente; sin un segundo grafo, sin código nuevo
  de medición.
- Mala, porque los manejadores de `/chat` ganan una segunda ruta de código
  que mantener sincronizada con la ruta JSON.
- Mala, porque la entrega correcta depende de que ningún proxy almacene en
  búfer el cuerpo de respuesta.

### WebSocket

- Buena, porque es un transporte en tiempo real maduro y ampliamente
  soportado.
- Buena, porque podría transportar un futuro mensaje de cliente a servidor a
  mitad del turno sin un cambio de transporte.
- Mala, porque el flujo de datos de la característica es estrictamente
  unidireccional; el full-duplex es una capacidad pagada y nunca usada.
- Mala, porque requiere un endpoint separado no HTTP y manejo explícito del
  ciclo de vida de la conexión, más superficie que SSE para el mismo
  resultado.
- Mala, porque una actualización `ws://` es una ruta menos trivial a través
  del proxy de capa gratuita que una respuesta transmitida sobre HTTP plano.

### Sondeo del cliente

- Buena, porque no necesita primitiva de transmisión en ninguno de los lados y
  es trivial de implementar.
- Mala, porque no puede entregar un evento de nodo en el instante en que el
  nodo comienza; el efecto en vivo, nodo por nodo, se degrada a una
  aproximación gruesa, cuantizada por el intervalo de sondeo.
- Mala, porque produce una ráfaga de solicitudes HTTP por turno, desperdiciando
  el presupuesto de solicitudes por sesión que ADR-0007 limita por tasa en la
  demo de capa gratuita.

### Sin transmisión; renderizar el grafo después del turno

- Buena, porque no agrega ningún comportamiento nuevo de endpoint y es la ruta
  de degradación honesta cuando SSE no está disponible.
- Mala, porque como experiencia principal descarta toda la visualización en
  vivo, nodo por nodo, que es el sentido de la característica; el grafo solo
  mostraría alguna vez un turno terminado.

## Más información

- [ADR-0001: Framework de orquestación](./adr-0001-orchestration.md) -
  LangGraph, la fuente de la API de transmisión y del grafo compilado desde el
  que se maneja el flujo.
- [ADR-0006: Stack de observabilidad](./adr-0006-observability.md) - los
  spans de OpenTelemetry por nodo que ya miden el tiempo de los nodos.
- [ADR-0007: Objetivo de despliegue](./adr-0007-deployment.md) - Hugging Face
  Spaces, la postura de único worker y el proxy que el flujo SSE debe
  atravesar sin búfer.
- Especificación WHATWG HTML de eventos enviados por el servidor:
  <https://html.spec.whatwg.org/multipage/server-sent-events.html>
- Documentación de transmisión de LangGraph:
  <https://langchain-ai.github.io/langgraph/how-tos/streaming/>
- Protocolo de eventos de agente a interfaz AG-UI (considerado para el esquema
  de eventos, anotado como una posible alineación futura): <https://ag-ui.com/>
- MADR 4.0.0: <https://adr.github.io/madr/>
