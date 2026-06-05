---
title: "ADR-0023: Recuperación híbrida"
description: Por qué la recuperación fusiona candidatos de BM25 y densos con Reciprocal Rank Fusion y los reescala con un reordenador cross-encoder, degradándose con elegancia.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0023: Recuperación híbrida - BM25 + densa + RRF + reordenamiento con cross-encoder

- Estado: Aceptado
- Fecha: 2026-05-29

## Contexto

La capa de recuperación hacía aflorar el contexto con una única ruta densa (bi-encoder): el turno del usuario se incrusta con el prefijo de consulta de BGE y los subfragmentos más cercanos se leen de Chroma ([ADR-0004](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0004-rag-stack/)), luego se deduplican a tarjetas padre ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0021-parent-document-retrieval/)). La recuperación densa captura la similitud semántica pero pierde las coincidencias léxicas exactas cuando la consulta y una tarjeta comparten tokens poco frecuentes (el nombre de un fármaco, el modelo de un dispositivo, una unidad de dosis específica) que la incrustación suaviza. Un índice puramente léxico tiene la debilidad inversa: pierde la paráfrasis. Para un agente de adherencia a la medicación cuyo corpus es denso en entidades nombradas, ninguna de las dos señales por sí sola es suficiente.

El remedio estándar es la recuperación híbrida: ejecutar un generador léxico y uno denso en paralelo, fusionar sus rankings, luego reescalar los candidatos fusionados con un cross-encoder que lee la consulta y el candidato de forma conjunta. Este ADR registra las decisiones tomadas al añadir esa canalización.

## Decisión

Reemplazar el paso de recuperación solo densa con una canalización de tres etapas, condicionada a una bandera que está activada por defecto y se degrada con elegancia al comportamiento anterior.

1. **Dos generadores de candidatos en paralelo** sobre el mismo corpus de subfragmentos: BM25 (léxico) y la ruta densa de Chroma existente (semántica).
2. **Reciprocal Rank Fusion** combina las dos listas ordenadas en una sola sin calibración de puntuaciones entre los sistemas.
3. **Reordenamiento con cross-encoder** reescala los candidatos fusionados frente al texto de la consulta; los supervivientes se deduplican luego a padres ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0021-parent-document-retrieval/)), se truncan a `top_k`, y se filtran por el umbral existente de similitud mínima.

Las decisiones de ingeniería fijadas:

- **(A) Modelo del reordenador.** Primario `BAAI/bge-reranker-v2-m3` (~568MB), reordenamiento multilingüe de última generación. Respaldo documentado `BAAI/bge-reranker-base` (~110MB, ~3-5% nDCG@10 más bajo) si el primario no cabe en RAM o su tiempo de arranque en frío es inaceptable en el objetivo de despliegue. Los reordenadores de pago (Cohere, Voyage) quedan fuera de alcance aquí: añaden una dependencia externa de pago que el presupuesto de la demo excluye.
- **(B) Biblioteca de BM25.** `rank-bm25` (BM25Okapi): Python puro, sin dependencias compiladas, con licencia MIT. Añadida como dependencia de tiempo de ejecución principal (~30KB) para que la ruta híbrida sea importable en cada instalación en lugar de quedar condicionada a un extra.
- **(C) Ciclo de vida del índice de BM25.** Reconstruido al arranque de la aplicación a partir de la misma lista de fragmentos con la que se construyó el almacén denso; nunca serializado con pickle. El índice es pequeño (construcción subsegundo) y por eso nunca puede desincronizarse del corpus denso.
- **(D) Constante de RRF.** `k = 60` (Cormack et al. 2009), el valor por defecto canónico; expuesto como un ajuste para afinar.
- **(E) Tamaños del conjunto de candidatos.** Cada generador sobrerrecupera hasta `top_k * overfetch * 2`; el reordenador puntúa como máximo `reranker_max_input` (por defecto 32) candidatos fusionados; el conjunto final se trunca a `top_k`.
- **(F) Valor por defecto activado.** La híbrida está activada por defecto; una única bandera de entorno revierte a la ruta solo densa para comparación A/B o recuperación sin un redespliegue.
- **(G) Contrato de degradación.** Cuatro niveles observables mediante un atributo de span `agent.hybrid_path`: `full` (BM25 + densa + RRF + reordenamiento), `rrf_only` (reordenador no disponible), `dense_only` (índice de BM25 vacío), y la negativa-sin-coincidencia preexistente. El cargador del reordenador no devuelve nada ante cualquier fallo (archivos faltantes, OOM, sin red en el arranque en frío) y el nodo cae a `rrf_only` en lugar de hacer fallar la solicitud.
- **(H) Compatibilidad hacia atrás.** La ruta solo densa se preserva como el respaldo documentado y es alcanzable mediante la bandera de exclusión voluntaria; las pruebas la fijan.

## Alternativas consideradas

### A1: Híbrida nativa del almacén de vectores (filtro de metadatos de Chroma + densa)

Usar el filtrado `where` de Chroma junto a la búsqueda densa en lugar de un índice de BM25 aparte.

- Pro: una sola ruta de consulta; ningún índice aparte que construir.
- Contra: ata la semántica híbrida a un único almacén de vectores; el filtrado por metadatos no es BM25 y no ordena por frecuencia de término / frecuencia inversa de documento.
- Rechazada: la fusión en la capa del agente es agnóstica del proveedor (se sostiene en Chroma, pgvector, etc.) y da un ranking BM25 verdadero.

### A2: BM25 respaldado por Pyserini / Lucene

- Pro: de grado de producción, rápido a gran escala.
- Contra: ~250MB más un runtime de Java; muy por encima de la huella de la demo para un corpus de 158 subfragmentos.
- Rechazada por motivos de huella y de dependencia de tiempo de ejecución.

### A3: Publicar solo BM25 + densa + RRF, omitir el cross-encoder

- Pro: menor latencia por turno; ningún modelo de 568MB.
- Contra: RRF fusiona rankings pero no puede leer la consulta y el candidato de forma conjunta; el cross-encoder es donde proviene la mayor parte de la ganancia de precision@k.
- Rechazada por calidad. El contrato de degradación aún recurre exactamente a esta configuración (`rrf_only`) cuando el reordenador no está disponible, de modo que la ruta se ejercita y se soporta, solo que no es el valor por defecto.

### A4: Serializar el índice de BM25 a disco con pickle

- Pro: omitir la reconstrucción al arranque.
- Contra: añade una superficie de versionado que puede desincronizarse de la colección de Chroma, que es la fuente de la verdad.
- Rechazada: la reconstrucción es subsegundo; la corrección vence a un ahorro de arranque insignificante.

## Consecuencias

### Positivas

- El recall mejora estrictamente sobre la solo densa para cualquier corpus con recall positivo: el conjunto de candidatos fusionado es un superconjunto de los candidatos densos, de modo que las coincidencias solo léxicas que la incrustación perdió ahora son alcanzables.
- El cross-encoder eleva precision@k al reescalar el conjunto fusionado con atención completa de consulta+candidato.
- Cada degradación es observable mediante el atributo de span `agent.hybrid_path`, y una solicitud nunca falla solo porque un modelo no se cargó.

### Negativas

- La latencia por turno crece por la inferencia del reordenador (~50-150ms en CPU para hasta 32 candidatos) más la consulta de BM25 (~1ms), acotada al limitar el conjunto de entrada del reordenador.
- El primer arranque en frío descarga el reordenador de ~568MB; los arranques subsiguientes usan la caché. El modelo de respaldo más pequeño existe para objetivos con restricciones de huella.
- Las pruebas existentes que comprobaban el orden solo denso o las puntuaciones exactas deben migrar al contrato híbrido: las aserciones de superconjunto de recall se sostienen, las aserciones de orden exacto no.

### Neutrales

- La invariante de deduplicación por padre ([ADR-0021](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0021-parent-document-retrieval/)) no cambia: se ejecuta después de la fusión + reordenamiento, aún sobre identidades de subfragmento.
- La tokenización es minúsculas + eliminación de puntuación; la tokenización que tiene en cuenta el idioma para es-419 / pt-BR se difiere hasta que las métricas de recall lo justifiquen.

## Notas de implementación

- El índice de BM25 envuelve la implementación BM25Okapi de `rank-bm25`; la consulta devuelve copias del fragmento de contexto con la puntuación de BM25 fijada. Un corpus vacío rinde un resultado vacío, que es el disparador de degradación `dense_only`.
- La reciprocal rank fusion es una función pura; la identidad de fusión es el identificador del subfragmento porque la deduplicación por padre se ejecuta después de la fusión.
- El reordenador envuelve el cross-encoder de `sentence-transformers`; su cargador es un invocable a nivel de módulo que importa la biblioteca de forma perezosa, de modo que importar el módulo de recuperación nunca trae torch. El cargador no devuelve nada ante un fallo de carga (Decisión G).
- Ajustes: `retrieval_hybrid_enabled`, `rrf_k`, `reranker_model`, `reranker_max_input`.

## Trabajo futuro

- **Tokenización de BM25 que tiene en cuenta el idioma** para es-419 / pt-BR si las métricas de recall indican fallos léxicos en turnos que no están en inglés.
- **Expansión de consulta / HyDE / multiconsulta** como un paso aparte de calidad de recuperación si recall@k lo justifica.
- **Adaptadores de reordenadores de pago** (Cohere, Voyage) detrás del extra de nube existente, para despliegues que opten por una API de reordenamiento gestionada.

## Reversión

Establecer la bandera de entorno de exclusión de la híbrida para restaurar la ruta solo densa sin cambios de código; el índice de BM25 y el reordenador simplemente quedan sin uso. La ruta densa queda intacta por el trabajo de la híbrida y sigue siendo el respaldo.

## Véase también

- [ADR-0004](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0004-rag-stack/) (stack de RAG): el almacén denso + incrustador que esta canalización extiende.
- [ADR-0021](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0021-parent-document-retrieval/) (recuperación de documento padre): el paso de deduplicación por padre que se ejecuta después de la fusión + reordenamiento.
