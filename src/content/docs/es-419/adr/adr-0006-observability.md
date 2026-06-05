---
title: "ADR-0006: Stack de observabilidad"
description: Por qué las trazas usan OpenTelemetry + OpenInference con Langfuse para la demo en vivo y Phoenix para las corridas de evaluación.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0006: Observabilidad (OpenTelemetry + OpenInference, Langfuse para la demo en vivo, Phoenix para las corridas de evaluación)

- Estado: Accepted
- Fecha: 2026-03-18
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El agente tiene dos modos operativos con necesidades de observabilidad
distintas. En la **demo en vivo** en Hugging Face Spaces, un lector llega a una
URL pública, navega por ahí y visita un dashboard que muestra la traza de su
conversación: qué nodo de LangGraph se disparó, cómo se veía la llamada al LLM,
qué recuperó el RAG, dónde se gastó el tiempo. Eso requiere un backend alojado y
de baja fricción con un nivel gratuito generoso.

En las **corridas de evaluación**, el objetivo es distinto: miles de turnos
automatizados producen trazas que el arnés inspecciona, persiste y adjunta a
los informes de PR. No hay humano en el bucle; las cuotas importan, los datos
deben quedarse locales, y la canalización tiene que correr fuera de línea si es
necesario. Eso requiere un backend autoalojado sin techo de cuota.

¿Cómo distribuimos ambos modos desde un solo formato de transmisión, mientras
mantenemos el costo de estado estable en $0/mes y evitamos el lock-in a
cualquier proveedor único de observabilidad?

## Impulsores de la decisión

- Un solo formato de transmisión entre modos; el agente emite trazas una vez,
  los sumideros las reciben una vez
- OpenTelemetry como el transporte porque es el estándar de la industria y está
  soportado por cada backend del conjunto
- OpenInference (convenciones semánticas de Arize para GenAI) como el esquema de
  atributos porque captura atributos específicos de LLM (prompts, completions,
  llamadas a herramientas, contextos de recuperación) que el OTel simple no
  captura
- Nivel gratuito lo bastante grande para una demo + URL pública con tráfico
  realista (~50K observaciones / mes)
- Backend en tiempo de evaluación que escale a miles de trazas por corrida sin
  preocupaciones de cuota
- Licencia permisiva en cada componente

## Opciones consideradas

- **OpenTelemetry + OpenInference; Langfuse Cloud Hobby para la demo en vivo,
  Phoenix autoalojado en Docker para las corridas de evaluación, Pydantic
  Logfire documentado como alternativa** (elegida)
- **Solo Phoenix**, usado para ambos modos (autoalojado en todas partes)
- **Solo Langfuse**, usado para ambos modos (vivo + evaluación)
- **Pydantic Logfire** como el único sumidero para ambos modos
- **Un solo proveedor alojado** (Helicone, Lunary, etc.) para ambos
  modos

## Resultado de la decisión

Opción elegida: emitir spans OTel anotados con convenciones semánticas de
OpenInference y enrutarlos a dos sumideros dependiendo del modo.

- **Demo en vivo**: Langfuse Cloud Hobby. El nivel gratuito provee 50K
  observaciones por mes, 30 días de retención, y una interfaz alojada que
  cualquier lector puede abrir a través de un enlace de dashboard público, sin
  registro requerido para ver una traza compartida. Esta es la pieza más
  pequeña de infraestructura que muestra una traza real de conversación con
  spans de LLM, recuperación y nivel de nodo.
- **En tiempo de evaluación**: Phoenix (Arize OSS) autoalojado en un perfil de
  Docker compose. El arnés levanta Phoenix junto al runner de evaluación de
  Python, envía spans hacia él, y adjunta las URLs de traza de Phoenix al
  informe Markdown de evaluación. La licencia ELv2 es aceptable para uso
  autoalojado de una sola organización. Sin llamada de red externa, sin cuota.
- **Alternativa documentada**: Pydantic Logfire (10M spans/mes gratis, vigente
  desde el 2026-01-01). Logfire se referencia en la referencia de observabilidad
  como un reemplazo directo de Langfuse para cualquier contribuidor que lo
  prefiera; el formato de transmisión OpenInference asegura que el cambio sea
  configuración, no código.

El esquema de atributos de OpenInference vive en la frontera agente / nodo; el
SDK de OTel se configura con dos exportadores que pueden habilitarse de forma
independiente por variables de entorno.

### Confirmación

- Una prueba unitaria afirma que cada nodo de LangGraph emite un span OTel
  anotado con atributos de OpenInference (la prueba inspecciona un colector de
  spans en memoria)
- La ruta de lanzamiento de la demo levanta la API en vivo con el exportador de
  Langfuse habilitado cuando se establece una clave pública de Langfuse; en caso
  contrario el exportador es una operación nula
- La ruta de lanzamiento de observabilidad levanta el perfil de Phoenix compose;
  la evaluación exporta spans hacia él cuando se establece un endpoint OTLP de
  Phoenix, y corre con el exportador en memoria de operación nula en caso
  contrario
- Un interruptor documentado en la referencia de observabilidad describe cómo
  enrutar a Pydantic Logfire en su lugar

## Consecuencias

### Positivas

- Un solo formato de transmisión, un solo modelo mental: el agente emite trazas
  una vez, los exportadores las enrutan
- La demo en vivo obtiene un dashboard alojado a $0 sin tarjeta de crédito vía
  Langfuse Hobby (50K observaciones / mes, 30 días de retención)
- Las corridas de evaluación están libres de cuota y son capaces de correr
  fuera de línea porque Phoenix es autoalojado en un perfil de Docker
- Los atributos de OpenInference llevan la semántica de GenAI (prompts,
  completions, llamadas a herramientas, contextos de recuperación) que cualquier
  backend de observabilidad de LLM puede renderizar
- Un cambio futuro de cualquiera de los sumideros es un cambio de configuración
  porque OpenInference es el esquema, no un formato específico de proveedor
- El proyecto señala familiaridad con tres opciones importantes de
  observabilidad de GenAI (Langfuse, Phoenix, Logfire)

### Negativas

- Dos backends significan dos lugares donde buscar datos de traza; la
  referencia de observabilidad documenta qué modo usa cuál
- Langfuse Hobby tiene un tope duro de 50K observaciones / mes sin facturación
  por excedente; el tráfico pico más allá del tope se descarta, lo que preserva
  la garantía de $0/mes
- La licencia ELv2 de Phoenix es permisiva para nuestro uso pero no es Apache
  2.0 / MIT; señalada en las notas de dependencias

### Neutrales

- El SDK de OTel y la instrumentación de OpenInference se vuelven parte de la
  superficie de dependencias de producción
- Una nueva variable de entorno controla qué exportador se habilita en tiempo de
  ejecución
- El informe Markdown de evaluación incluye enlaces de traza de Phoenix solo
  cuando el perfil de Phoenix compose está levantado

## Pros y contras de las opciones

### OTel + OpenInference; Langfuse Hobby (vivo) + Phoenix autoalojado (evaluación) + Logfire documentado

- Buena, porque divide las responsabilidades a lo largo del eje real de
  diferencia: dashboard alojado para la demo, autoalojado libre de cuota
  para las evaluaciones
- Buena, porque los atributos de OpenInference llevan la semántica de GenAI
  que cada backend entiende
- Buena, porque la alternativa documentada de Logfire muestra
  conciencia del espacio más amplio sin un tercer sumidero activo
- Mala, porque el contribuidor tiene que saber qué sumidero aloja cuáles
  trazas
- Mala, porque la licencia ELv2 de Phoenix requiere reconocimiento

### Solo Phoenix (vivo + evaluación)

- Buena, porque un solo backend en todas partes
- Mala, porque la demo en vivo necesitaría una instancia de Phoenix
  alojada, lo que contradice la postura de $0/mes; autoalojarlo
  en un Hugging Face Space añade presión de memoria y una interfaz pública
  menos pulida que Langfuse

### Solo Langfuse (vivo + evaluación)

- Buena, porque una sola interfaz alojada en todas partes
- Mala, porque las corridas de evaluación a volumen completo quemarían el
  tope de 50K observaciones rápidamente sin facturación por excedente, y los
  datos de evaluación no deberían tener que salir de la red local

### Pydantic Logfire como único sumidero

- Buena, porque 10M spans/mes gratis es el nivel gratuito más grande
- Mala, porque Logfire es el participante más nuevo (vigente desde el
  2026-01-01); la cobertura de OpenInference y la lectura multiproveedor
  son más fuertes con Langfuse + Phoenix
- Conservada como alternativa documentada en la referencia de observabilidad

### Un solo proveedor alojado (Helicone, Lunary, etc.)

- Buena, porque la superficie de integración es pequeña
- Mala, porque el proyecto ataría su historia de observabilidad a un solo
  proveedor; la señal demostrativa es más débil y el requisito de evaluación
  libre de cuota es más difícil de satisfacer

## Más información

- OpenTelemetry: <https://opentelemetry.io/>
- Convenciones semánticas de OpenInference (Arize):
  <https://github.com/Arize-ai/openinference>
- Precios de Langfuse Cloud Hobby:
  <https://langfuse.com/pricing>
- Documentación de Langfuse: <https://langfuse.com/docs>
- Documentación de Phoenix (Arize) autoalojado:
  <https://docs.arize.com/phoenix/deployment>
- Phoenix en GitHub (licencia ELv2):
  <https://github.com/Arize-ai/phoenix>
- Pydantic Logfire: <https://pydantic.dev/logfire>
- Precios de Pydantic Logfire:
  <https://pydantic.dev/logfire/pricing>
- MADR 4.0.0: <https://adr.github.io/madr/>
