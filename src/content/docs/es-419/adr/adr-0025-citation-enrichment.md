---
title: "ADR-0025: Enriquecimiento de citaciones del lado del servidor"
description: Por qué la API deriva la URL de origen, la licencia y la puntuación de relevancia de la citación del lado del servidor a partir del contexto recuperado, de modo que el modelo nunca emite URLs.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0025: Enriquecimiento de citaciones del lado del servidor

- Estado: Aceptado
- Fecha: 2026-05-31

## Contexto

El popover de citación necesita tres datos por cada tarjeta de la KB citada para renderizar un resumen de tarjeta útil: la URL de origen, la licencia y una puntuación de relevancia. Estos campos están ausentes del modelo de citación existente (que lleva solo el identificador de la tarjeta y el span), y la SPA no tiene acceso independiente a los metadatos verificados de la KB — es de solo lectura sobre la carga útil de la respuesta del chat.

Se consideraron dos enfoques de enriquecimiento:

1. **Enriquecimiento del lado del cliente.** La SPA llama a un nuevo endpoint de metadatos de tarjeta para obtener los metadatos en el momento del renderizado.
2. **Enriquecimiento del lado del servidor (elegido).** La capa de la API deriva los campos a partir del contexto recuperado ya presente en el estado del agente y los adjunta a los objetos de citación antes de serializar la respuesta del chat.

Se eligió el enriquecimiento del lado del servidor porque los metadatos de la KB ya están en memoria en el momento de construir la respuesta (los objetos de fragmento de contexto en el contexto recuperado), el LLM nunca debe emitir URLs para preservar la restricción de honestidad ([ADR-0020](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0020-structured-agent-reply/)), y añadir un nuevo endpoint público solo para los datos del popover ampliaría la superficie de la API sin un beneficio proporcional.

El contrato de citaciones de la respuesta del chat ([ADR-0020](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0020-structured-agent-reply/)) es compatible hacia atrás: los tres campos nuevos tienen "ausente" por defecto, de modo que los consumidores existentes (evaluadores de evaluación, puerta de red team, arnés de certificación) que leen solo el identificador de la tarjeta no se ven afectados.

## Decisión

Extender el modelo de citación con tres campos opcionales y poblarlos del lado del servidor en el momento de construir la respuesta a partir de los metadatos verificados de la tarjeta en Chroma, indexados por el identificador de la tarjeta.

1. **Tres campos opcionales aditivos en la citación:**
   - `source_url` — la URL de origen de la tarjeta de la KB, del campo de origen del fragmento de contexto.
   - `source_license` — la licencia, de los metadatos del fragmento de contexto.
   - `retrieved_score` — la puntuación de relevancia del reordenador normalizada a 0-100.

2. **Enriquecimiento del lado del servidor** — un ayudante privado llamado durante la construcción de la respuesta, inmediatamente después de la reconciliación de citaciones. Construye una búsqueda del identificador del fragmento al fragmento sobre el contexto recuperado, luego para cada citación:
   - Fija la URL de origen y la licencia a partir del fragmento de contexto coincidente.
   - Fija la puntuación de relevancia solo cuando la ruta híbrida es `full` (la ruta del reordenador cross-encoder).

3. **Etiqueta de ruta híbrida en el estado del agente** — una nueva etiqueta opcional (`full`, `rrf_only`, `dense_only`, o ausente). Escrita por el nodo de recuperación junto al contexto recuperado, leída en el momento de construir la respuesta.

4. **El LLM nunca emite URLs.** El enriquecimiento deriva la URL de origen y la licencia exclusivamente del campo de origen del fragmento de contexto y sus metadatos — ambos se originan en el conjunto de datos verificado y sintético de la KB ingerido al arranque. Ninguna cadena emitida por el modelo se convierte en una URL mostrada.

## Decisiones de ingeniería fijadas

**(A) Normalización de la puntuación.** El cross-encoder del reordenador emite un logit. La puntuación normalizada es `round(100 / (1 + exp(-logit)))` — la función sigmoide escalada a [0, 100] y redondeada a un flotante de valor entero. Esto da un porcentaje de relevancia de 0-100 en la ruta híbrida `full`.

**(B) La puntuación está ausente en las rutas que no son full.** Cuando la ruta híbrida es `rrf_only`, `dense_only`, o ausente, la puntuación de relevancia siempre está ausente. Las puntuaciones de RRF y las similitudes de coseno densas están en escalas incompatibles y no pueden compararse con los logits del reordenador; emitirlas como si fueran comparables sería engañoso.

**(C) Degradación con elegancia.** Cada elemento de enriquecimiento se envuelve de modo que un fallo devuelve la citación original sin cambios. Un fragmento faltante, un origen vacío o un campo de metadatos defectuoso rinde un valor ausente en el campo correspondiente en lugar de una respuesta de error. El ayudante nunca lanza una excepción.

**(D) La clave de búsqueda es el slug desnudo de la tarjeta.** Tras la deduplicación por padre en el nodo de recuperación, el identificador del fragmento de contexto es igual al identificador del padre, igual al slug de la tarjeta (p. ej., `card-hyp-01`). No hay separador `::` en la clave de búsqueda. Un identificador de subfragmento (`card-hyp-01::00`) nunca coincidiría con el identificador de tarjeta de una citación porque las citaciones están a granularidad de tarjeta ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0021-parent-document-retrieval/)).

**(E) Los campos opcionales aditivos preservan la compatibilidad hacia atrás.** Una citación construida solo a partir de un identificador de tarjeta aún se construye con los tres campos nuevos ausentes. Los evaluadores de evaluación, la puerta de red team y el arnés de certificación leen solo el identificador de la tarjeta; no se ven afectados.

**(F) Entrega dividida.** Este ADR cubre el backend. El renderizado del popover de citación del frontend (la URL de origen como un enlace seguro, una comprobación de URL que protege contra XSS, el chip del popover) es un incremento de frontend aparte, cubierto por su propio plan de implementación. El backend aterriza de forma independiente y está en verde antes de que comience el frontend.

## Alternativas consideradas

### Opción A: solo identificador de tarjeta + span (estado actual, sin enriquecimiento)

Mantener el modelo de citación sin cambios. El popover de la SPA renderiza solo el slug del identificador de la tarjeta y el extracto del span.

- Pro: cero cambios en el backend; cero riesgo.
- Contra: el popover no transmite ningún enlace de origen legible por humanos ni señal de relevancia; el requisito no se cumple.
- Rechazada: el responsable eligió el enriquecimiento completo del lado del servidor.

### Opción C: emitir siempre una puntuación de relevancia sin importar la ruta híbrida

Emitir una puntuación de relevancia en cada ruta usando la puntuación disponible (rango de RRF, coseno denso, logit del reordenador) normalizada a [0, 100] mediante fórmulas específicas de cada ruta.

- Pro: siempre muestra una puntuación en el popover.
- Contra: los tres tipos de puntuación están en escalas fundamentalmente distintas (RRF ~1/(1+rank), coseno denso (0, 1], logit del reordenador no acotado). La comparación entre rutas no tiene sentido y es activamente engañosa. Normalizar cada una a [0, 100] oculta la incompatibilidad de escalas.
- Rechazada: la restricción de honestidad fijó esto en el resumen de planificación.

### Opción D: enriquecimiento del lado del cliente mediante un nuevo endpoint de metadatos de tarjeta

Añadir un endpoint público que la SPA llama para obtener los metadatos de la tarjeta bajo demanda.

- Pro: sin cambios en el esquema existente de respuesta del chat.
- Contra: superficie de API adicional; latencia al abrir el popover; la SPA no tiene una ruta confiable para distinguir los metadatos de tarjeta sintetizados de los alucinados por el modelo.
- Rechazada: el enriquecimiento del lado del servidor es más simple y ya tiene los datos en memoria.

## Consecuencias

**Positivas:**
- El popover de citación tiene todos los datos que necesita sin un nuevo endpoint de API.
- El cortafuegos de URLs del LLM se preserva: la SPA nunca recibe una URL que el modelo haya generado.
- La puerta de evaluación, la regresión de evaluadores y el arnés de certificación no se ven afectados por los campos opcionales aditivos (confirmado por una corrida de regresión: 160 pruebas de citación/evaluador pasan).
- La mitad del backend de la función aterriza de forma independiente y está en verde antes de que comience cualquier trabajo de frontend.

**Negativas / riesgos:**
- La puntuación de relevancia está ausente en la mayoría de los despliegues donde el cross-encoder no está cargado (arranque en frío, restringidos por RAM, configuraciones solo densas). El popover debe manejar el valor ausente con elegancia.
- Una tarjeta de la KB ingerida sin campo de origen en los metadatos de Chroma rinde una URL de origen ausente; esto se manifiesta como un popover sin enlace. El conjunto de datos sintético actual pobla el origen para cada tarjeta, de modo que esto es un riesgo de conjunto de datos degradado, no un caso común.

**Referencias cruzadas:**
- [ADR-0020](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0020-structured-agent-reply/) — Respuesta estructurada del agente (el contrato de citaciones de respuesta del chat compatible hacia atrás que este ADR extiende)
- [ADR-0023](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0023-hybrid-retrieval/) — Recuperación híbrida (la etiqueta de ruta híbrida y la semántica de logits del reordenador que este ADR lee)
