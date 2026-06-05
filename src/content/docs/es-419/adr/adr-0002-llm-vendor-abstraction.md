---
title: "ADR-0002: Abstracción de proveedor de LLM"
description: Por qué el acceso al LLM pasa por un Protocol de cliente delgado y neutral respecto al proveedor, conmutado por una sola variable de entorno.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0002: Abstracción de proveedor de LLM (Protocol `LLMClient` delgado)

- Estado: Accepted
- Fecha: 2026-03-18
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El agente llama a un endpoint de chat-completion varias veces por turno
(clasificador de alcance, redactor, verificación de seguridad, juez). La tesis
del proyecto incluye la afirmación de que el agente es neutral respecto al
proveedor y de que la misma base de código puede correr contra OpenAI,
Anthropic, Groq o Cerebras con una sola variable de entorno. Esa afirmación
tiene que ser honrada por el código, no por el texto de la documentación.

Al mismo tiempo, el proyecto opera con un presupuesto de estado estable de
$0/mes. La ruta predeterminada de la demo tiene que correr en un nivel gratuito
generoso (Groq, Llama 3.3 70B-versatile, 30 RPM / 1K RPD), y la ruta del juez
de evaluación de CI tiene que caber dentro de otro nivel gratuito generoso
(Cerebras, 1M tokens/día). Los proveedores "premium" (OpenAI, Anthropic) deben
poder conectarse desde las claves del usuario sin cambios de código.

¿Cómo exponemos una interfaz única y estable para las completions de LLM dentro
del agente y dentro del arnés de evaluación, manteniendo el acceso a cuatro
proveedores y la opción de añadir más más adelante?

## Impulsores de la decisión

- Una superficie de llamada coherente para el agente y el arnés de evaluación;
  sin ramificación por proveedor en el código de los nodos
- Nivel gratuito por defecto: la ruta de la demo corre en el nivel gratuito de
  Groq sin claves del usuario
- Economía de CI: el juez corre en el nivel gratuito de 1M tokens/día de
  Cerebras; los evaluadores deterministas que bloquean el PR no necesitan un
  LLM en absoluto
- Realismo de producción: un usuario con claves de pago de OpenAI o Anthropic
  obtiene una experiencia casi idéntica al cambiar `LLM_PROVIDER`
- Evitar un lock-in pesado de framework: queremos la libertad de descartar los
  adaptadores de proveedor de LangChain más adelante sin reescribir los nodos
  del agente
- Tipado fuerte en solicitudes y respuestas (mensajes tipados con Pydantic),
  consistente con la postura `mypy --strict`

## Opciones consideradas

- **Protocol `LLMClient` delgado** sobre `langchain-openai` +
  `langchain-anthropic` de LangChain más adaptadores directos de Groq /
  Cerebras vía REST compatible con OpenAI, conmutado por una variable de
  entorno `LLM_PROVIDER`
- **`ChatModel` de LangChain directo en todas partes**: usar
  `langchain_openai.ChatOpenAI`, `langchain_anthropic.ChatAnthropic`,
  etc. directamente dentro de los nodos del agente
- **Proxy / SDK de LiteLLM**: llamar a cada proveedor a través de la capa con
  forma de OpenAI de LiteLLM
- **Solo SDKs de proveedor en bruto**: evitar toda abstracción, escribir cuatro
  conjuntos de llamadas específicas por proveedor
- **OpenRouter (o un router similar)**: un endpoint HTTP, muchos proveedores
  seleccionados por nombre de modelo

## Resultado de la decisión

Opción elegida: **Protocol `LLMClient` delgado**, con adaptadores concretos
que envuelven los clientes de proveedor de LangChain para OpenAI y Anthropic y
que llaman a Groq / Cerebras directamente a través de sus endpoints REST
compatibles con OpenAI. El Protocol expone un pequeño conjunto de métodos
(chat completion, chat completion en streaming, conteo de tokens). La selección
de proveedor es una sola variable de entorno
`LLM_PROVIDER in {openai, anthropic, groq, cerebras}`,
resuelta por fábrica al inicio del proceso.

Esta opción preserva el valor de opción de cambiar LangChain más adelante (el
agente nunca importa tipos de LangChain directamente), le da al arnés de
evaluación una interfaz estable y testeable, y coincide con el realismo que el
proyecto necesita: un usuario con claves de pago cambia una variable de entorno
y el mismo agente corre contra su proveedor preferido.

### Confirmación

- Cada nodo del agente y cada evaluador de evaluación que necesita un LLM
  importa el Protocol `LLMClient`, no una clase de proveedor
- Una prueba de humo de CI importa cada adaptador (OpenAI, Anthropic, Groq,
  Cerebras) y afirma que implementan `LLMClient`
- Una prueba de integración de CI ejercita al menos dos proveedores de extremo
  a extremo sobre un prompt corto enlatado para validar la afirmación
  "agnóstico al proveedor"
- `LLM_PROVIDER` está documentado en la referencia de configuración del
  proyecto y en el archivo de entorno de ejemplo

## Consecuencias

### Positivas

- El código del agente y de la evaluación habla con un solo Protocol; el cambio
  de proveedor es un cambio de entorno, no un cambio de código
- La ruta de nivel gratuito por defecto (Groq para la demo, Cerebras para el
  juez) mantiene el costo de estado estable en $0 mientras sigue demostrando
  patrones realistas de producción
- Realismo de producción: un lector técnicamente riguroso puede pegar su clave
  de OpenAI o Anthropic y correr el mismo flujo
- El Protocol es pequeño (seis métodos o menos) y trivialmente simulable, lo que
  mantiene ajustada la superficie de pruebas unitarias
- LangChain sigue siendo un detalle de implementación de dos adaptadores, no un
  framework tejido a través de la base de código

### Negativas

- Dos de los adaptadores dependen de paquetes de proveedor de LangChain
  (`langchain-openai`, `langchain-anthropic`); aceptamos esto a cambio de no
  reimplementar los matices de uso de herramientas, llamada a funciones y
  streaming
- El adaptador REST compatible con OpenAI para Groq y Cerebras tiene que
  manejar casos límite (cabeceras de límite de tasa, formato de chunk de
  streaming) que LangChain maneja para los proveedores propios
- La superficie del Protocol tiene que evolucionar con cuidado; un cambio que
  rompe compatibilidad en el Protocol significa tocar cada adaptador y cada
  nodo

### Neutrales

- El proyecto lleva cuatro adaptadores; solo uno está activo en tiempo de
  ejecución
- La instrumentación de tokens-por-turno y ms-por-turno vive en la capa del
  adaptador, no en el sitio de la llamada
- El streaming es opcional: el Protocol expone un método de streaming pero el
  flujo predeterminado no lo requiere

## Pros y contras de las opciones

### Protocol `LLMClient` delgado

- Buena, porque da una interfaz inspeccionable para los cuatro
  proveedores
- Buena, porque el cambio de proveedor es una sola variable de entorno
- Buena, porque simular el Protocol hace baratas las pruebas unitarias
- Mala, porque somos dueños del código del adaptador para Groq y Cerebras
- Mala, porque la evolución del Protocol es un costo de coordinación

### `ChatModel` de LangChain directo en todas partes

- Buena, porque LangChain ya envuelve a cada proveedor importante
- Mala, porque los nodos importan tipos de LangChain directamente, lo que acopla
  el agente a la jerarquía de clases de LangChain y rompe la postura
  "neutral respecto al proveedor, ligera en framework"

### Proxy / SDK de LiteLLM

- Buena, porque LiteLLM da una API uniforme con forma de OpenAI a través de
  muchos proveedores
- Mala, porque añade una capa de traducción de terceros entre el agente y los
  modelos upstream, con su propia superficie de errores y peculiaridades de
  observabilidad
- Mala, porque las semánticas de límite de tasa del nivel gratuito de Groq y
  Cerebras son más fáciles de honrar hablando con ellos directamente

### Solo SDKs de proveedor en bruto

- Buena, porque cero sobrecarga de abstracción
- Mala, porque cada nodo llevaría código específico por proveedor; la
  afirmación "agnóstico al proveedor" se vuelve falsa en el código

### OpenRouter (o un router similar)

- Buena, porque un endpoint y muchos modelos
- Mala, porque añade un intermediario que no es gratuito al volumen que un arnés
  de evaluación puede generar, y oscurece qué proveedor sirvió realmente un
  turno dado

## Más información

- Proveedor OpenAI de LangChain:
  <https://python.langchain.com/docs/integrations/providers/openai/>
- Proveedor Anthropic de LangChain:
  <https://python.langchain.com/docs/integrations/providers/anthropic/>
- API compatible con OpenAI de Groq:
  <https://console.groq.com/docs/openai>
- API compatible con OpenAI de Cerebras:
  <https://inference-docs.cerebras.ai/api-reference/chat-completions>
- MADR 4.0.0: <https://adr.github.io/madr/>
