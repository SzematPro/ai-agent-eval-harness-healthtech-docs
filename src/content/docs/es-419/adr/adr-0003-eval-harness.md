---
title: "ADR-0003: Arnés de evaluación"
description: Por qué el arnés de evaluación es un núcleo pytest hecho a mano que orquesta DeepEval, Ragas, Phoenix y Promptfoo.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0003: Arnés de evaluación (núcleo pytest hecho a mano + evaluadores componibles)

- Estado: Accepted; reemplazado en parte por [ADR-0009](./adr-0009-judge-model-cerebras.md) en la elección del modelo juez
- Fecha: 2026-03-18
- Responsables de la decisión: Waldemar Szemat

> Nota de reemplazo: este ADR registra a Anthropic Claude Haiku como el juez
> LLM fijado. Esa elección específica queda reemplazada por
> [ADR-0009](./adr-0009-judge-model-cerebras.md), que registra a Cerebras
> (`gpt-oss-120b`) como el juez de evaluación que el arnés ejecuta hoy. El resto
> de este ADR (el núcleo pytest hecho a mano, la composición de DeepEval /
> Ragas / Phoenix / Promptfoo, los tres flujos de trabajo) sigue vigente. El
> cuerpo de abajo se mantiene sin cambios como registro histórico, según la
> convención de MADR de que un ADR reemplazado conserva su texto original.

## Contexto y planteamiento del problema

El arnés de evaluación es el centro de este proyecto. El agente
es el vehículo; el arnés es el artefacto. Un lector tiene que quedar
convencido de que el arnés es real: carga datasets de referencia JSONL,
ejecuta el agente de extremo a extremo, emite trazas por turno, puntúa esas
trazas a lo largo de diez dimensiones de evaluación y produce un veredicto que
bloquea el PR más un informe de formato más extenso.

Ninguna de las "plataformas de evaluación de agentes" listas para usar cubre
las diez dimensiones para un agente multi-turno del dominio de salud. DeepEval
es fuerte en métricas juzgadas estilo G-Eval y en métricas conversacionales;
Ragas es fuerte en RAG y en precisión de uso de herramientas; Phoenix da un
backend OTel con interfaz de trazado; Promptfoo es el runner canónico de
red-team / OWASP LLM Top 10. Un núcleo pytest hecho a mano que orquesta estas
bibliotecas es la menor cantidad de pegamento que entrega las diez dimensiones
mientras se mantiene portable.

¿Cómo estructuramos el arnés de evaluación para que (a) corra como un job
normal de pytest en CI, (b) los evaluadores deterministas bloqueen cada PR de
forma barata, (c) el LLM-como-juez corra cada noche sin reventar el presupuesto
del nivel gratuito, (d) los escenarios de red-team corran cada noche fuera de
banda y (e) cada evaluador pueda cambiarse o actualizarse sin reescribir el
runner?

## Impulsores de la decisión

- Cobertura de las diez dimensiones de evaluación a las que el proyecto se
  compromete
- Techo de costo de la compuerta del PR: solo evaluadores deterministas +
  LLM-barato en cada PR; LLM-como-juez cada noche
- Reproducibilidad: un contribuidor debe poder correr la suite de evaluación
  localmente y obtener el mismo veredicto que da CI
- Fijar el modelo juez con exactitud (proveedor + modelo + versión) para que la
  puntuación sea estable entre corridas
- Higiene de licencias: cada biblioteca de evaluación debe tener licencia
  permisiva (Apache 2 / MIT / ELv2 aceptables para herramientas)
- Evitar una "plataforma de evaluación de IA" SaaS de caja negra; el arnés
  tiene que ser portable y autoalojado

## Opciones consideradas

- **Núcleo pytest hecho a mano + DeepEval + Ragas + Phoenix +
  Promptfoo** con Anthropic Claude Haiku como el juez LLM fijado
  (elegida)
- **Un SaaS de un proveedor (Braintrust / Galileo / LangSmith Eval)**
- **DeepEval puro** como el arnés completo, con sus runners integrados de
  dataset e informe
- **Ragas puro** como el arnés completo
- **OpenAI Evals** como el runner

## Resultado de la decisión

Opción elegida: **núcleo pytest hecho a mano que orquesta DeepEval,
Ragas, Phoenix y Promptfoo**, con Anthropic Claude Haiku como el juez LLM
fijado (id del modelo detrás de una bandera de entorno, versión fijada). El
arnés tiene tres flujos de trabajo:

- **Bloqueo del PR**: evaluadores deterministas (regex, palabra clave,
  coincidencia de plantilla de rechazo, coincidencia de lista de escalamiento,
  verificación de citación requerida) más umbrales de DeepEval / Ragas que no
  requieren un LLM (p. ej. `FaithfulnessMetric` con un modelo Cerebras pequeño
  donde sea viable, `ToolCallAccuracy`). El PR falla en: fidelidad >= 0.85,
  alucinación <= 0.10, recall de escalamiento >= la barra configurada.
- **LLM-como-juez nocturno** (programado): G-Eval de DeepEval,
  `ConversationalGEval` para tono / empatía /
  idoneidad médica, Ragas
  `AgentGoalAccuracyWithReference`, `TopicAdherence`. Juez =
  una versión fijada de Anthropic Claude Haiku.
- **Red-team** (flujo de trabajo separado): dos capas. (a) Una compuerta de CI
  determinista y sin claves -- una evaluación de Promptfoo de los 13 casos
  adversariales hechos a mano; el shim conduce el agente real de LangGraph
  usando un cliente stub fuera de línea; la capa de barreras de seguridad del
  agente decide, no el LLM. (b) Una medición en vivo con clave separada -- una
  corrida de red-team de Promptfoo con Groq `llama-3.3-70b-versatile` como
  objetivo, OpenAI `gpt-4o` como generador de ataques y Groq como evaluador.
  No bloqueante; se esperan fallas reales y se documentan con
  procedencia.

Phoenix es el sumidero de observabilidad durante las corridas de evaluación:
cada turno emite spans OTel a través del cableado OpenInference existente del
proyecto (ver [ADR-0006](./adr-0006-observability.md)), Phoenix los recolecta,
y el arnés adjunta las URLs de traza de Phoenix al informe de evaluación.
Inspect AI (UK AISI) queda reservado como una tarea bonus de evaluación de
capacidades, opcional para el hito inicial.

Esta composición le da a las diez dimensiones de evaluación un hogar concreto,
mantiene barata la compuerta del PR y nunca depende de una plataforma de
evaluación cerrada.

### Confirmación

- La suite de evaluación corre el subconjunto de bloqueo del PR localmente y en
  CI; el job de CI falla en las violaciones de umbral configuradas
- Cada evaluador se implementa detrás de un pequeño Protocol `Scorer`; el
  runner no importa las bibliotecas de evaluadores directamente
- El id del modelo juez se lee de una variable de entorno `JUDGE_MODEL`, con
  valor por defecto de una cadena fijada de Claude Haiku; una prueba unitaria
  afirma que la cadena de fijación no está vacía y está bien formada
- Un informe nocturno de red-team se publica como artefacto

## Consecuencias

### Positivas

- Las diez dimensiones de evaluación tienen un evaluador nombrado; la tabla de
  evaluación publicada se mapea 1:1 con los módulos de evaluación
- La compuerta del PR es lo bastante barata y determinista como para correr en
  cada push sin quemar las cuotas del nivel gratuito
- El LLM-como-juez se mantiene nocturno y usa un Claude Haiku fijado, el modelo
  de Anthropic de menor costo por token que aún puntúa bien en las rúbricas de
  tono / empatía
- Phoenix autoalojado da un backend OTel real sin presión de cuota; su licencia
  ELv2 es aceptable para este caso de uso
- La suite OWASP LLM Top 10 de Promptfoo cubre una superficie de red-team que
  DeepEval / Ragas no cubren, fijada a un catálogo público de ataques
- El arnés es portable: sin lock-in de SaaS, cada dependencia es de código
  abierto

### Negativas

- Cuatro bibliotecas de evaluadores significan cuatro vías de actualización; lo
  mitigamos fijando versiones menores
- El núcleo hecho a mano es código real que mantenemos; gana su lugar al darnos
  control total sobre los umbrales y el formato del informe
- Las llamadas al juez Anthropic Haiku se facturan; la cadencia nocturna más un
  tope pequeño de tokens las mantienen dentro del sobre de $0/mes

### Neutrales

- El arnés emite dos artefactos por corrida, un informe JSON legible por máquina
  y un resumen en Markdown
- Inspect AI queda reservado como una tarea opcional de evaluación de
  capacidades; el hito inicial no depende de él
- Phoenix y Promptfoo corren en perfiles de Docker, no en el archivo principal
  de Compose, para mantener pequeña la imagen de la demo en vivo

## Pros y contras de las opciones

### Núcleo pytest hecho a mano + DeepEval + Ragas + Phoenix + Promptfoo

- Buena, porque cada biblioteca es la mejor de su clase para su porción
  (métricas juzgadas / métricas de RAG / backend OTel / red-team)
- Buena, porque pytest ya es el arnés de pruebas del proyecto
- Buena, porque cada evaluador es intercambiable detrás de un Protocol
- Mala, porque hay que mantener cuatro piezas móviles

### Un SaaS de un proveedor (Braintrust / Galileo / LangSmith Eval)

- Buena, porque la historia del dashboard es excelente de fábrica
- Mala, porque el proyecto debe correr con cero cuentas
- Mala, porque las definiciones de evaluación viven en la interfaz de otro

### DeepEval puro

- Buena, porque DeepEval tiene buenas métricas conversacionales
- Mala, porque las métricas de sabor RAG como `ToolCallAccuracy` son más
  idiomáticas en Ragas, y la superficie de red-team de Promptfoo queda sin
  cubrir

### Ragas puro

- Buena, porque Ragas es la biblioteca canónica de evaluación de RAG
- Mala, porque a Ragas le faltan las métricas conversacionales / de rúbrica de
  tono que necesitamos; territorio de DeepEval

### OpenAI Evals

- Buena, porque el formato es bien conocido
- Mala, porque el runner es centrado en OpenAI y no se mapea limpiamente a las
  evaluaciones de agentes multi-turno

## Más información

- Documentación de DeepEval: <https://docs.deepeval.com/>
- Documentación de Ragas: <https://docs.ragas.io/>
- Documentación de Phoenix (Arize):
  <https://docs.arize.com/phoenix>
- Documentación de Promptfoo: <https://www.promptfoo.dev/docs/intro/>
- OWASP LLM Top 10:
  <https://owasp.org/www-project-top-10-for-large-language-model-applications/>
- Inspect AI (UK AISI): <https://inspect.ai-safety-institute.org.uk/>
- Ficha del modelo Anthropic Claude Haiku:
  <https://docs.anthropic.com/en/docs/about-claude/models>
- Marco de niveles de severidad de alucinación de npj Digital Medicine (2025)
- MADR 4.0.0: <https://adr.github.io/madr/>
