---
title: "ADR-0004: Stack de RAG"
description: Por qué la recuperación usa Chroma embebido con un embedder BGE consciente de instrucciones y una ruta documentada de base de datos vectorial gestionada.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0004: Stack de RAG (Chroma embebido + embeddings de Voyage AI)

- Estado: Accepted
- Fecha: 2026-03-18
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El agente fundamenta cada afirmación clínica en una pequeña base de
conocimiento de 30 a 50 tarjetas que cubren resúmenes de interacciones entre
medicamentos, barreras de adherencia, puntos de conversación de entrevista
motivacional y criterios de escalamiento. Las fuentes de la KB se restringen a
material de dominio público o debidamente atribuido: DailyMed (FDA SPL),
MedlinePlus (gobierno de EE. UU.) y entradas parafraseadas de la Lista de
Medicamentos Esenciales de la WHO. La capa de recuperación no necesita escalado
horizontal; necesita ser barata, reproducible y autocontenida dentro de la
imagen Docker que distribuimos.

Al mismo tiempo, esta es una implementación de referencia. Tiene que mostrar
cuándo un almacén vectorial embebido es la decisión correcta y cuándo una base
de datos vectorial gestionada es la decisión correcta. La narrativa es
"empieza embebido, documenta la ruta gestionada".

¿Cómo elegimos un almacén vectorial y un modelo de embeddings que (a) corran a
$0 sin cuentas externas en la demo predeterminada, (b) demuestren conciencia de
base de datos vectorial gestionada como ruta alternativa, (c) coincidan con la
calidad a la que el LLM-como-juez nos exigirá y (d) mantengan reproducibilidad
determinista para el arnés de evaluación?

## Impulsores de la decisión

- Cero servicios externos para la ruta predeterminada de la demo; el almacén
  vectorial debe funcionar dentro de la imagen Docker
- Reproducibilidad: la misma KB más el mismo modelo de embeddings más la misma
  consulta deben producir la misma recuperación, para que el evaluador de
  fundamentación sea estable
- Costo: gratuito a escala de demo (50 tarjetas o menos, cientos de consultas
  por día), con una alternativa gestionada de nivel gratuito documentada
- Calidad de embeddings: la evaluación del juez penalizará la recuperación débil
  a través de `FaithfulnessMetric` y `HallucinationMetric`; el modelo de
  embeddings primario debería ser uno reciente y fuerte, con un fallback fuera
  de línea integrado si no se configura una clave de API
- Licencia: cada componente con licencia permisiva; los embeddings generados
  para la KB se distribuyen dentro de la imagen sin costo por consulta en
  tiempo de ejecución si se usa el fallback fuera de línea

## Opciones consideradas

- **Chroma embebido (DuckDB+Parquet) + Voyage AI `voyage-3.5` como
  embeddings primarios, `sentence-transformers BAAI/bge-large-en-v1.5`
  como fallback fuera de línea integrado** (elegida)
- **Nivel gratuito de Qdrant Cloud + Voyage AI `voyage-3.5`**: servicio
  gestionado, nivel gratuito generoso, pero dependencia externa
- **FAISS** como almacén embebido: alto rendimiento, pero la historia de
  metadatos es más delgada que la de Chroma
- **Postgres + pgvector**: ubicado junto al saver de Postgres de LangGraph,
  pero añade superficie operativa para una KB de 50 tarjetas
- **OpenAI `text-embedding-3-large`** como modelo de embeddings

## Resultado de la decisión

Opción elegida: **Chroma embebido como almacén vectorial primario, con
Voyage AI `voyage-3.5` como modelo de embeddings primario y
`sentence-transformers BAAI/bge-large-en-v1.5` como fallback fuera de línea
integrado**. El nivel gratuito de Qdrant Cloud está documentado como la ruta
alternativa gestionada; es la respuesta correcta para cualquier lector cuyo
caso de uso tenga más de ~50K fragmentos o necesite un dashboard alojado.

Voyage AI da 200 millones de tokens gratuitos en la familia `voyage-3.5` a los
usuarios nuevos, lo que excede por mucho lo que la KB necesita (el corpus
entero de 50 tarjetas se embebe en menos de un millón de tokens). El fallback de
sentence-transformers está integrado en la imagen Docker, de modo que la demo
corre con cero claves de API externas si el usuario lo prefiere; el arnés
escoge el fallback automáticamente cuando no se establece una clave de API de
Voyage.

La elección mantiene la demo en vivo a costo cero, da una alternativa limpia de
base de datos gestionada para los lectores que la quieran, y usa dos rutas de
embeddings que ambas puntúan bien en los benchmarks de recuperación.

### Confirmación

- El archivo Compose predeterminado corre Chroma embebido; no se requiere
  ningún servicio externo para levantar la demo
- Un archivo Compose opcional declara una configuración de Qdrant Cloud con
  pasos de registro de nivel gratuito documentados, ejercitada en una prueba de
  integración manual
- La fábrica de embedder selecciona Voyage AI si se establece una clave de API
  de Voyage, y recurre al modelo local de sentence-transformers en caso
  contrario; una prueba unitaria ejercita ambas ramas
- La build de la KB escribe un manifiesto con id del modelo, versión del
  modelo, dimensión del embedding y SHA-256 de cada tarjeta, para que el arnés
  de evaluación pueda afirmar que la superficie de recuperación es la esperada

## Consecuencias

### Positivas

- La demo corre fuera de línea: no se requiere ningún servicio externo, lo que
  mantiene rápida y determinista la ruta de despertar del Hugging Face Space
- El arnés de evaluación ve una superficie de recuperación determinista (Chroma
  + embeddings fijados + hash del manifiesto), exactamente lo que el evaluador
  de fundamentación necesita
- Voyage AI `voyage-3.5` es un modelo de embeddings reciente y fuerte
  (anunciado el 2025-05-20); el nivel de 200M tokens gratuitos cubre la KB
  muchas veces
- El fallback fuera de línea elimina la lectura de "necesita una clave de API"
  para cualquier lector que quiera clonar y ejecutar
- Qdrant Cloud como ruta alternativa documentada permite que el proyecto señale
  conciencia de base de datos vectorial gestionada sin heredar el riesgo de
  suspensión del nivel gratuito

### Negativas

- El modelo `sentence-transformers` integrado se suma al tamaño de la imagen
  Docker; aceptado porque elimina el modo de falla de "los embeddings necesitan
  un viaje de ida y vuelta por internet"
- Chroma embebido escala mal más allá de cientos de miles de fragmentos;
  irrelevante para una KB de 50 tarjetas pero vale la pena señalarlo
- Dos rutas de embeddings significan dos firmas de recuperación; el hash del
  manifiesto hace auditable la diferencia, pero los resultados de evaluación
  deben compararse dentro de una sola ruta de embeddings, no entre ellas

### Neutrales

- El proyecto gana las dependencias `chromadb` y `voyageai`
- La imagen lleva los pesos de `sentence-transformers`;
  intencional y documentado
- Una migración futura a Qdrant Cloud es un cambio a nivel de Protocol,
  no una reescritura: la abstracción del almacén cubre ambos backends

## Pros y contras de las opciones

### Chroma embebido + Voyage AI primario + bge-large-en-v1.5 fallback

- Buena, porque la ruta predeterminada corre con cero servicios
  externos
- Buena, porque el nivel gratuito de 200M tokens de Voyage AI cubre la KB
- Buena, porque el fallback fuera de línea elimina la lectura de
  "necesita-una-clave"
- Buena, porque el arnés de evaluación ve una superficie de recuperación
  determinista
- Mala, porque la imagen Docker crece por el modelo de fallback integrado
- Mala, porque Chroma embebido no escala a cientos de miles de fragmentos

### Nivel gratuito de Qdrant Cloud + Voyage AI

- Buena, porque el dashboard gestionado y el nivel gratuito (1 GB, sin
  tarjeta) son generosos
- Mala, porque la demo dependería de un servicio externo y de la política de
  cuentas de Qdrant; cada lector tendría que registrarse
- Conservada como alternativa documentada

### FAISS embebido

- Buena, porque FAISS es rápido y probado en batalla
- Mala, porque la ergonomía de metadatos + filtrado es más débil que la de
  Chroma

### Postgres + pgvector

- Buena, porque Postgres ya se usa para el saver de estado de la conversación
- Mala, porque ubicar juntos el estado de la conversación y el almacenamiento
  vectorial complica la operación para una KB de 50 tarjetas, y distribuir
  Postgres para la recuperación contradice la postura embebida por defecto

### OpenAI `text-embedding-3-large`

- Buena, porque es un modelo de embeddings fuerte y bien conocido
- Mala, porque forzaría a la demo a requerir una clave de OpenAI
  solo para la recuperación, y de todos modos no hay un fallback fuera de línea
  limpio con calidad comparable fuera de sentence-transformers

## Más información

- Documentación de Chroma: <https://docs.trychroma.com/>
- Nivel gratuito de Qdrant Cloud:
  <https://qdrant.tech/documentation/cloud/>
- Anuncio de Voyage AI `voyage-3.5` (2025-05-20):
  <https://blog.voyageai.com/2025/05/20/voyage-3-5/>
- Precios y nivel de tokens gratuitos de Voyage AI:
  <https://docs.voyageai.com/docs/pricing>
- Ficha del modelo `BAAI/bge-small-en-v1.5`:
  <https://huggingface.co/BAAI/bge-small-en-v1.5>
- DailyMed (FDA SPL): <https://dailymed.nlm.nih.gov/dailymed/>
- MedlinePlus: <https://medlineplus.gov/>
- Lista de Medicamentos Esenciales de la WHO:
  <https://www.who.int/groups/expert-committee-on-selection-and-use-of-essential-medicines/essential-medicines-lists>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Embedder y recuperación asimétrica tal como se construyó

**Embedder predeterminado: `BAAI/bge-small-en-v1.5`.** El predeterminado
distribuido es `BAAI/bge-small-en-v1.5`: un modelo de 384 dimensiones, de
aproximadamente 130 MB, elegido porque es cómodamente compatible con CPU Basic
en el nivel gratuito del Hugging Face Space mientras mantiene una calidad de
recuperación fuerte.

**La recuperación es asimétrica y consciente de instrucciones.** La familia BGE
v1.5 está afinada por instrucciones y es asimétrica. El código distribuido lo
honra: una consulta se embebe con el prefijo documentado de instrucción de
recuperación de BGE (`Represent this sentence for searching relevant passages: `);
un pasaje se embebe sin prefijo; cada vector se normaliza con L2 para que la
búsqueda por producto interno de Chroma se comporte como similitud de coseno. Un
modelo simétrico de propósito general (por ejemplo `all-MiniLM-L6-v2`) no recibe
prefijo de instrucción. Usada sin el manejo asimétrico, la calidad de
recuperación de BGE se degrada; la capa de recuperación está construida para
aplicarlo.

**Voyage como la alternativa configurable en la nube.** La fábrica de embedder
resuelve Voyage cuando se establece una clave de API de Voyage y el modelo BGE
local en caso contrario; la demo corre a $0 sin claves en la ruta local.

**El umbral de similitud de recuperación se distribuye desactivado.** Existe un
ajuste de similitud mínima de recuperación pero por defecto es 0.0
(desactivado). En el corpus de KB de un solo dominio un umbral no puede separar
una pregunta clínica fuera de corpus por poco de una genuinamente dentro de
corpus sin rechazar falsamente esta última. El agente rechaza ante una
recuperación de cero coincidencias; una pregunta fuera de corpus por poco se
responde contra la tarjeta más cercana. El umbral se deja en su lugar,
desactivado, para que un corpus más amplio y temáticamente más diverso pueda
habilitarlo más adelante. Ver la
[ficha del modelo](../reference/model-card.md) para la limitación completa.
