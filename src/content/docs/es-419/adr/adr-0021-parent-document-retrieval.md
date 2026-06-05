---
title: "ADR-0021: Recuperación de documento padre"
description: Por qué la recuperación hace coincidir fragmentos pequeños de subtarjeta pero presenta tarjetas padre completas al modelo, manteniendo las citaciones a nivel de tarjeta.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0021: Recuperación de documento padre — fragmentación en subtarjetas con citación a nivel de tarjeta

- Estado: Aceptado
- Fecha: 2026-05-28
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

Anteriormente, la capa de RAG trataba cada tarjeta de la KB como una unidad de
recuperación atómica: el corpus sintético tiene 36 tarjetas; la ingesta incrustaba el título y
el texto de cada tarjeta como un único vector de pasaje; el almacén de Chroma tenía
36 filas; el nodo de recuperación devolvía las K tarjetas más cercanas, y el
LLM consumía tarjetas completas.

Esto está limitado en precisión de dos formas concretas:

1. Una consulta específica ("¿se supone que debo tomarlo con el estómago vacío?")
   compite contra el vector de la tarjeta completa, que mezcla la oración
   relevante con párrafos no relacionados sobre rutinas de adherencia, efectos
   secundarios y apoyo al estilo de vida. La señal de coincidencia se diluye.
2. La tarjeta mediana del corpus tiene ~1100 caracteres y el p90 es de ~1500
   caracteres; las tarjetas no son patológicamente largas, pero son lo bastante
   largas como para que la fragmentación semántica de subtarjetas mejore de forma
   medible la unidad de coincidencia en el momento de la incrustación sin cambiar
   la unidad de contexto en el momento del prompt (el LLM aún se beneficia de ver
   la tarjeta completa).

Esta mejora de la precisión de recuperación debía incorporarse antes de apilar la
recuperación híbrida (BM25 + densa + reordenador + RRF) y un evaluador centrado
solo en la recuperación (recall@k) encima de ella. ¿Cómo mejoramos la precisión
de recuperación sin romper el contrato de citación (los marcadores `[cite:card-X]`, el campo
`must_cite_one_of: ["card-..."]` de los casos dorados de evaluación, los chips de
citación de la SPA, el corpus de red team) ni aumentar la huella de instalación?

## Factores de decisión

- **Precisión de recuperación**: la unidad de coincidencia a nivel de vector debe
  ser lo bastante pequeña como para que las consultas específicas encuentren el
  pasaje correcto; las consultas más amplias aún deben hacer aflorar la tarjeta
  correcta.
- **Calidad del contexto del LLM**: la unidad en el momento del prompt debe seguir
  siendo lo bastante grande como para que el LLM tenga la señal entre párrafos que
  necesita para producir respuestas fundamentadas; las tarjetas completas ya son
  la unidad correcta aquí.
- **Estabilidad del contrato de citación**: la extracción de citaciones, la
  verificación de citaciones, los casos dorados de evaluación, el renderizado de
  chips de la SPA y el corpus de red team citan todos a nivel de tarjeta.
  Migrarlos a citaciones a nivel de fragmento multiplica el radio de impacto y
  quedaba fuera del alcance de esta mejora.
- **Huella de instalación**: el objetivo de despliegue corre en un nivel de CPU
  pequeño (16GB de RAM, 2 vCPU). Añadir una dependencia de fragmentación pesada
  añadiría ~80MB y un barrido de similitud de incrustaciones O(n²) por tarjeta en
  la ingesta. Esto es desproporcionado para un corpus de 36 tarjetas.
- **Compatibilidad hacia adelante**: el diseño elegido debe producir vectores de
  subfragmento sobre los que la posterior canalización híbrida (BM25 + reordenador
  + RRF) pueda operar, y el paso de deduplicación por identificador de padre debe
  producir aciertos de padre que el posterior evaluador recall@k pueda medir.

## Opciones consideradas

- **Opción A**: mantener el modelo "1 tarjeta = 1 fragmento" y mejorar la
  recuperación únicamente con una mejor incrustación. Difiere por completo la
  fragmentación.
- **Opción B**: citación a nivel de fragmento (fragmentos de subtarjeta; el LLM
  cita el identificador del fragmento coincidente; la SPA deriva el título del
  padre a partir de los metadatos del fragmento en el momento del renderizado).
- **Opción C**: recuperación de documento padre — fragmentos de subtarjeta en el
  momento de la ingesta, deduplicación por identificador de padre en el momento de
  la recuperación, presentar el texto de la tarjeta padre al LLM, con las
  citaciones a nivel de tarjeta.

## Resultado de la decisión

Opción elegida: **Opción C** — recuperación de documento padre con
fragmentación de subtarjetas y citación a nivel de tarjeta.

La razón determinante es el factor de estabilidad del contrato de citación:
la estrategia C es la única opción que mejora la precisión de recuperación
dejando intacta toda superficie que consume citaciones (extracción de
citaciones, verificación de citaciones, el `must_cite_one_of` dorado de la
evaluación, los chips de citación de la SPA, el corpus de red team). La
estrategia A deja precisión sobre la mesa; la estrategia B tiene el perfil de
precisión correcto, pero requiere una migración costosa del contrato de citación a
través de cinco superficies, más los cambios en la SPA necesarios para derivar el
título del padre en el momento del renderizado.

La canalización de fragmentación divide una tarjeta en una lista de
subfragmentos. El algoritmo es un divisor de prioridad de separadores recursivo
con reempaquetado voraz y una ventana de solapamiento alineada a palabras:

- Tamaño objetivo del fragmento: 384 caracteres (~96 tokens a 4 caracteres/token).
- Solapamiento: 64 caracteres (~16 tokens), antepuestos a cada fragmento después
  del primero, recortados al siguiente límite de palabra para que los fragmentos
  nunca empiecen a mitad de palabra.
- Prioridad de separadores: salto de párrafo, salto de línea, luego puntuación de
  oración, luego límite de palabra. Cuando ningún separador cabe en el
  presupuesto, el divisor recurre con la siguiente prioridad; cuando no queda
  ninguno, fragmenta de forma forzada por índice de carácter.
- Prefijo de título: aplicado solo al primer subfragmento. Los subfragmentos
  subsiguientes llevan texto de solo cuerpo. Los metadatos de texto del padre
  almacenados en la fila de Chroma siempre llevan el texto completo de la tarjeta
  padre.

El modelo de fragmento de contexto gana dos campos opcionales con valores por
defecto que preservan la compatibilidad binaria: un `parent_id` (el identificador
de la tarjeta padre) y un `chunk_index` (la posición del subfragmento). Los campos
existentes (id, source, text, score, metadata) no cambian.

La canalización de ingesta escribe una fila de Chroma por subfragmento: el
identificador de la fila es `{card.id}::{chunk_index:02d}`, el identificador del
padre es el de la tarjeta, y los metadatos llevan el cuerpo completo de la tarjeta
padre (~1100 caracteres de mediana; muy dentro del límite de Chroma de 16 KB de
metadatos por valor), el título del padre y los metadatos existentes de la tarjeta
(license, topics, accessed_at). La reingesta es de arrasar y reconstruir: un
objetivo `make ingest-clean` elimina el almacén local de Chroma antes de volver a
ejecutar `make ingest`.

El nodo de recuperación sobrerrecupera `top_k * retrieval_overfetch_multiplier`
subfragmentos (multiplicador por defecto 3), deduplica por identificador de padre
conservando la mejor puntuación por padre, expande cada acierto superviviente a un
fragmento de contexto padre (id igual al identificador del padre, texto igual al
texto del padre almacenado, índice de fragmento 0, mejor puntuación de hermano), y
trunca a `top_k` padres. El umbral `min_similarity` opera sobre las puntuaciones
de mejor-por-padre posteriores a la deduplicación (invariante semántica: la puerta
antigua se disparaba cuando el mejor acierto de tarjeta estaba por debajo del
umbral; la nueva puerta se dispara cuando la mejor tarjeta, a través de cualquiera
de sus subfragmentos, está por debajo del umbral).

La migración se publicó en tres etapas:

1. **Aditiva**: ampliar el modelo de fragmento de contexto con los dos campos
   opcionales; añadir el módulo de fragmentación; reescribir la ingesta para que
   emita subfragmentos; encauzar el identificador del padre y el índice del
   fragmento a través del viaje de ida y vuelta de Chroma; añadir un paso de
   deduplicación por padre en el nodo de recuperación con una rama de seguridad que
   no hace nada cuando cada fragmento es su propio padre (el comportamiento
   anterior); añadir el ajuste del multiplicador de sobrerrecuperación.
2. **Migración de pruebas**: actualizar los fixtures y las pruebas de recuperación
   para sembrar subfragmentos en la capa del almacén y comprobar la vista de padre
   posterior a la deduplicación; reingerir el corpus sintético a través de la
   canalización fragmentada; ejecutar la puerta de evaluación contra Groq /
   Cerebras en vivo y confirmar la paridad de recall@k (o una mejora) frente a la
   línea base anterior.
3. **Eliminación atómica**: eliminar la rama de seguridad; exigir un identificador
   de padre en cada fila ingerida; descartar los casos de prueba heredados del nodo
   de recuperación.

### Confirmación

- Una prueba de fragmentación fija el algoritmo del divisor contra las
  expectativas de la forma del corpus (3-4 fragmentos para la tarjeta mediana;
  preferencia por el salto de párrafo sobre el salto de oración; solapamiento
  alineado a palabras; respaldo de fragmentación forzada cuando ningún separador
  cabe).
- Las pruebas de ingesta comprueban el número de fragmentos por tarjeta, el formato
  del identificador del fragmento, y el viaje de ida y vuelta del identificador del
  padre / índice del fragmento / texto del padre.
- Las pruebas del nodo de recuperación cubren la deduplicación por padre con
  múltiples padres y múltiples subfragmentos cada uno; la puerta `min_similarity`
  sobre la puntuación de mejor-por-padre; y el multiplicador de sobrerrecuperación
  que garantiza que el conjunto posterior a la deduplicación sea de al menos
  `top_k` cuando el corpus lo permita.
- Una auditoría posterior a la migración confirma cero referencias a la rama de
  seguridad en el código de recuperación de producción.

## Consecuencias

### Positivas

- La precisión de recuperación mejora en consultas específicas: una incrustación
  de pasaje a nivel de oración coincide con la consulta mejor que una mezcla de
  tarjeta completa.
- El contrato de citación no cambia. Los marcadores `[cite:card-X]`, la
  verificación de citaciones, los arreglos `must_cite_one_of` dorados de la
  evaluación, los chips de citación de la SPA y el corpus de red team siguen
  operando sobre identificadores de tarjeta; la expansión a padre en el nodo de
  recuperación hace que la forma del fragmento de contexto presentado sea
  indistinguible de antes en las capas del agente y del prompt.
- La mejora de recuperación híbrida hereda un almacén de vectores granular por
  fragmento listo para la indexación BM25 y el reescalado con el cross-encoder
  `bge-reranker-v2-m3`; el paso de deduplicación por padre se convierte en el punto
  natural de fusión para las listas de fragmentos combinadas por RRF.
- El evaluador recall@k mide sobre los identificadores de padre que salen del
  contexto recuperado, lo que coincide con la forma de la expectativa dorada de la
  evaluación sin cambios.
- Cero nuevas dependencias de pip. El divisor recursivo son ~80 líneas de
  Python puro; la huella de instalación no cambia.

### Negativas

- La colección de Chroma crece de ~36 filas a ~120 filas en el
  corpus sintético actual. La latencia de las consultas no se ve afectada (sigue
  siendo subsegundo), pero el uso de disco crece ~3x. Aceptable a esta escala.
- La reingesta es ahora una operación de arrasar y reconstruir (`make ingest-clean`)
  en lugar de una inserción idempotente. Un almacén obsoleto que contuviera las
  formas de fila anteriores mezcladas con filas de subfragmento haría tropezar la
  deduplicación por padre de formas impredecibles; la contrapartida es un objetivo
  Make adicional a cambio de cordura operativa.
- El nodo de recuperación gana un multiplicador de sobrerrecuperación (por defecto 3) y un
  ayudante de deduplicación, extraídos más tarde a una primitiva de recuperación
  compartida cuando la recuperación híbrida necesitó el mismo patrón de fusión.

### Neutrales

- El contexto del prompt del LLM tiene una forma idéntica a la anterior: el bloque
  de contexto recibe una lista de fragmentos de contexto donde el identificador de
  cada fragmento es igual al de la tarjeta padre y su texto es igual al de la
  tarjeta padre. La regla de truncamiento de 600 caracteres sigue acotando el
  tamaño del prompt.
- La semántica de `min_similarity` pasa de "la mejor puntuación de tarjeta por
  debajo del umbral" a "la mejor puntuación de subfragmento por debajo del umbral
  en cualquier tarjeta". En un corpus sano, ambas son equivalentes para el disparo
  de la puerta; el nuevo comportamiento es ligeramente más permisivo en tarjetas
  donde un único subfragmento fuerte eleva por encima del umbral a un padre por lo
  demás débil (que es la dirección deseada).

## Pros y contras de las opciones

### Opción A: quedarse con "1 tarjeta = 1 fragmento"

- Buena, porque no hay cambios de ingesta/recuperación.
- Mala, porque la precisión de recuperación en consultas específicas sigue diluida.
- Mala, porque la recuperación híbrida y el evaluador recall@k heredan el
  mismo techo de precisión.

### Opción B: citación a nivel de fragmento

- Buena, porque la unidad de recuperación y la unidad de citación son
  consistentes.
- Mala, porque la migración toca la extracción de citaciones, la verificación de
  citaciones, el arreglo `must_cite_one_of` de cada caso dorado de la evaluación, la
  ruta de renderizado de chips de citación de la SPA y el corpus de red team.
- Mala, porque la unidad de contexto del LLM se convierte por defecto en el texto
  del subfragmento, lo que pierde la señal de fundamentación entre párrafos —
  exactamente la contrapartida que la recuperación de documento padre está diseñada
  para evitar.

### Opción C (elegida): recuperación de documento padre con citación a nivel de tarjeta

- Buena, porque la unidad de coincidencia en el momento de la recuperación es
  pequeña y precisa.
- Buena, porque la unidad del prompt del LLM sigue siendo la tarjeta padre completa.
- Buena, porque toda superficie que consume citaciones no cambia.
- Buena, porque la canalización híbrida y el evaluador recall@k heredan
  las primitivas correctas sin más reestructuración.
- Mala, porque el número de filas de Chroma crece ~3x (aceptable; se preserva la
  latencia de consulta subsegundo).

## Más información

- [ADR-0001](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0001-orchestration/) — estado del agente y LangGraph;
  define la forma del fragmento de contexto.
- [ADR-0004](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0004-rag-stack/) — stack de incrustaciones y almacén
  persistente de Chroma.
- [ADR-0005](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/) — contrato de extracción y
  verificación de citaciones; sin cambios por este ADR.
- [ADR-0020](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0020-structured-agent-reply/) — respuesta estructurada del
  agente; el fragmento de contexto expandido a padre mantiene la invariante de
  contexto del LLM de la que depende el prompt de modo JSON.
- MADR 4.0.0: <https://adr.github.io/madr/>
