---
title: "ADR-0024: Medición de recall de recuperación"
description: Por qué un evaluador determinista centrado solo en la recuperación reporta hit@k, recall@k y nDCG@k sobre las tarjetas recuperadas, aislado de la generación y la citación.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0024: Medición de recall de recuperación - recall@k / hit@k / nDCG@k

- Estado: Aceptado
- Fecha: 2026-05-29

## Contexto

La canalización de recuperación híbrida ([ADR-0023](./adr-0023-hybrid-retrieval.md)) hace aflorar un conjunto de las `k` mejores tarjetas
padre por turno. Hasta ahora la calidad de la recuperación se observaba solo de forma indirecta, mediante
métricas que acoplan la recuperación con la generación: un evaluador de cobertura de citaciones califica
si la *respuesta* citó una tarjeta esperada, y un evaluador de fundamentación respaldado
por un juez califica si la *respuesta* está respaldada por el contexto
recuperado. Ninguno aísla el paso de recuperación: un fallo de recuperación y un fallo de
citación son indistinguibles, y una regresión en la calidad del ranking es invisible
hasta que arrastra hacia abajo una métrica posterior.

Este ADR registra las decisiones de un evaluador determinista, centrado solo en la recuperación,
que califica si la recuperación puso la(s) tarjeta(s) relevante(s) en las `k` mejores,
independientemente de lo que el LLM hiciera luego con ellas.

## Decisión

Añadir un evaluador determinista, elegible para la puerta del PR, que lee los artefactos que el
runner ya captura (el contexto recuperado y el campo dorado disyuntivo del caso de evaluación
`must_cite_one_of`) y emite tres métricas por
caso con etiqueta dorada. `k` es el top-k de recuperación configurado (por defecto 4). La identidad de la
tarjeta es el identificador del padre cuando está presente, de lo contrario el identificador del fragmento (tras la expansión a padre, el id
es igual al de la tarjeta, consistente con el evaluador de corrección de citaciones). Las métricas
se calculan sobre los identificadores **recuperados**, nunca sobre los identificadores citados.

Las decisiones fijadas:

- **(A) Tríada de métricas.** Emitir `retrieval_hit_at_k`, `retrieval_recall_at_k`,
  y `retrieval_ndcg_at_k`.
  - `hit@k` = `1.0` si al menos una tarjeta dorada está en el top-k. Esta es la
    señal de éxito principal porque `must_cite_one_of` es **disyuntivo** -
    el contrato de citación requiere solo una de las tarjetas listadas.
  - `recall@k` = `|gold ∩ topk| / |gold|`. Reportado pero tratado como una
    **cota inferior conservadora**: bajo gold disyuntivo, hacer aflorar una de dos
    tarjetas aceptables obtiene 0.5 aunque el contrato se cumpla. El conjunto de métricas
    se llama "recall@4", de modo que se emite; la salvedad de la cota inferior se documenta
    aquí y en el informe.
  - `nDCG@k` = nDCG de ganancia binaria, la única señal sensible al ranking (la razón por la que
    [ADR-0023](./adr-0023-hybrid-retrieval.md) añadió un reordenador cross-encoder). Cada tarjeta dorada tiene relevancia 1
    (las etiquetas no llevan relevancia graduada); `DCG = Σ 1/log2(rank+2)` sobre las
    posiciones del top-k que contienen una tarjeta dorada (rango basado en 0); `IDCG` suma lo mismo
    sobre `min(|gold|, k)` posiciones ideales, de modo que nDCG nunca supera 1.0 cuando las doradas
    no caben todas en el top-k.
- **(B) Contrato de gold vacío.** Un caso con un `must_cite_one_of` vacío
  no aporta **ninguna clave de puntuación** (el evaluador devuelve un resultado vacío). El
  agregador promedia sobre las claves que están *presentes*, de modo que la omisión restringe la
  media del corpus al subconjunto con etiqueta dorada y rinde un `n` honesto. Devolver un
  `1.0` vacuo (como hace el evaluador de cobertura de citaciones para su propia puerta) inflaría la
  media a través de los casos de capacidad y los casos sin coincidencia que no tienen
  tarjeta relevante. Esta es la decisión determinante.
- **(C) Denominador.** Calificar cada caso con **etiqueta dorada**, indexado por la
  presencia de etiqueta en lugar del tipo de caso (de modo que un caso adversario que legítimamente
  lleve una tarjeta dorada igual se califica - la tarjeta correcta debe recuperarse
  incluso cuando la respuesta deba rehusarse). El informe desglosa dorado-vs-
  adversario y por idioma, cada uno con su propio `n`. Los deltas entre idiomas se
  presentan como indicativos, no comprobados por significancia (corpus por idioma pequeños, desiguales,
  redactados de forma independiente).
- **(D) Postura de la puerta: informe primero.** La métrica fluye hacia los agregados y
  se renderiza (markdown + stdout) con `n`. Una perilla de piso absoluto en vivo (una bandera de umbral
  de la CLI de evaluación para recall y otra para hit, con parámetros de palabra clave de puerta que
  aceptan un flotante o ninguno) se publica pero está **inactiva** por defecto, reflejando el
  precedente de la similitud mínima (publicar la métrica, diferir el cambio estricto hasta que una
  línea base en vivo justifique un número). Una prueba de integridad del conjunto de datos (cada identificador dorado
  resuelve a una tarjeta de la KB real) sí actúa como puerta de CI, de modo que un error de etiquetado se detecta
  y no puede hacerse pasar por un fallo de recuperación.
- **(E) La CLI de evaluación carece de almacén; la puerta en vivo es una prueba de integración.** La
  CLI ejecuta el grafo del agente sin almacén, de modo que el grafo descarta el nodo de recuperación
  y el contexto recuperado está vacío para cada caso. Los agregados de recuperación de la CLI
  son, por lo tanto, vacuos (y también lo son los evaluadores preexistentes de cobertura de citaciones
  / fundamentación por juez - una brecha preexistente, no introducida aquí).
  La puerta EN VIVO de recall de recuperación es una prueba de integración de extremo a extremo,
  que ingiere la KB real de 36 tarjetas en un Chroma temporal con el incrustador BGE real,
  ejecuta los casos con etiqueta dorada a través del nodo de recuperación densa real,
  y comprueba un piso de recall conservador (la solo densa es una cota inferior conservadora
  para la superficie híbrida; el reordenador de 568MB se queda apagado). Conectar un almacén
  a la CLI de evaluación - de modo que la puerta de la CLI también mida recuperación / citación /
  fundamentación - es un seguimiento rastreado (fuera del alcance de un
  incremento de evaluador de recall; también cambiaría las métricas de juez de puerta estricta de vacuas a
  vivas en el barrido indexado).

## Alternativas consideradas

### A1: solo recall@k (el nombre literal de la métrica)

- Contra: reporta mal el gold disyuntivo (1-de-2 tarjetas aceptables obtiene 0.5, una
  penalización falsa para una recuperación adecuada). Rechazada como métrica única/principal;
  conservada como cota inferior reportada junto a hit@k.

### A2: solo hit@k

- Pro: coincide exactamente con el contrato disyuntivo.
- Contra: ciega al ranking (una tarjeta dorada en la posición 4 obtiene lo mismo que en la posición 1), de modo que una
  regresión del reordenador es invisible. Rechazada como métrica única; conservada como
  principal, complementada por nDCG@k para la calidad del ranking.

### A3: relevancia graduada / MRR

- Rechazada: las etiquetas no llevan relevancia graduada que modelar, y MRR es
  monótonamente equivalente a nDCG sobre gold singleton e ill-defined bajo
  disyunción - una tercera clave correlacionada sin señal añadida.

### A4: puerta (bloquear CI) sobre un piso de recall en este incremento

- Contra: aún no existe una línea base en vivo; el conjunto dorado es una cota inferior disyuntiva;
  el `n` por idioma es tan bajo como 29. Un piso adivinado sería inestable o inútil.
  Rechazada a favor de informe-primero; el cambio del piso es un seguimiento enfocado
  una vez que exista una corrida de línea base.

### A5: confiar en la ruta de tolerancia a regresiones para "controlar" la métrica

- Rechazada: esa ruta es inerte en tiempo de ejecución. La puerta siempre se llama sin
  agregados de línea base; ningún archivo de línea base se carga ni se escribe en ninguna parte (un
  archivo de línea base + paso de CI se planificó antes pero solo aterrizaron los parámetros de la puerta).
  Poner una métrica "en agregados" por lo tanto no controla nada hoy. La
  perilla de piso absoluto es el único mecanismo en vivo; conectar un archivo de línea base
  comprometido es un trabajo aparte y mayor, fuera del alcance aquí.

## Consecuencias

### Positivas

- La calidad de la recuperación es observable de forma aislada; un fallo de recuperación ya no se
  confunde con un fallo de citación o de fundamentación.
- La tríada reporta tanto la tasa de éxito alineada con el contrato (hit@k) como la calidad
  del ranking (nDCG@k), con recall@k como una cifra familiar de cota inferior.
- El contrato de gold vacío mantiene la media del corpus honesta y hace aflorar `n`.

### Negativas

- recall@k subreporta bajo gold disyuntivo; los lectores deben usar hit@k como la
  cifra de éxito. Documentado, pero una mala lectura previsible.
- Las cifras por idioma (es-419 / pt-BR, n=29) son ruidosas; útiles para informes
  y detección gruesa de regresiones, no para comparación comprobada por significancia.

### Neutrales

- Ninguna nueva dependencia (solo matemáticas de la biblioteca estándar). El evaluador es determinista
  y añade un costo insignificante al barrido de evaluación.
- El piso activo se difiere; "la puerta incluye la métrica" se satisface
  con cálculo + renderizado + la perilla publicada-pero-inactiva + la prueba activa
  de integridad del conjunto de datos.

## Notas de implementación

- Los ayudantes de recall@k / hit@k / nDCG@k son funciones puras sobre secuencias de identificadores;
  deduplican los identificadores ordenados por primera ocurrencia antes de aplicar el corte de ranking,
  de modo que un duplicado perdido no pueda contar doble una ganancia ni ocultar una tarjeta posterior.
- El evaluador de recall de recuperación resuelve `k` a partir del top-k de recuperación configurado
  (existe una sobrescritura del constructor para pruebas deterministas) y está registrado en
  el bloque de evaluadores deterministas por defecto del runner.
- `n` se deriva en el escritor del informe / la CLI (conteo de informes que llevan las
  claves de recuperación), no en el tipo de retorno del agregador.

## Trabajo futuro

- **Activar el piso.** Una vez que se observe un agregado de línea base en vivo, fijar un
  umbral de recall basado en evidencia (objetivo ≈ 0.85, paralelo al
  piso de fidelidad; finalizado como lo observado menos un margen) en un seguimiento enfocado,
  hermano del aumento del valor por defecto de la similitud mínima.
- **Desacoplar la relevancia de la suficiencia de citación.** Si las cifras de recall lo justifican,
  añadir un campo explícito de identificadores-relevantes separado del disyuntivo
  `must_cite_one_of`, y ampliar la cobertura de gold sintético para es-419 / pt-BR
  hacia la paridad con en ([ADR-0019](./adr-0019-synthetic-only-data-invariant.md) exclusivamente sintético).
- **Conectar un archivo de línea base comprometido + paso de restauración/actualización de CI** para hacer
  que la ruta de tolerancia a regresiones esté en vivo para todas las dimensiones de agregado.

## Reversión

Eliminar el evaluador de recall de recuperación del conjunto por defecto del runner; la métrica
simplemente deja de calcularse. La canalización de recuperación ([ADR-0023](./adr-0023-hybrid-retrieval.md)) queda intacta.

## Véase también

- [ADR-0023](./adr-0023-hybrid-retrieval.md) (recuperación híbrida): la superficie que este evaluador mide.
- [ADR-0021](./adr-0021-parent-document-retrieval.md) (recuperación de documento padre): el paso de deduplicación por padre que define
  la identidad de tarjeta usada aquí.
- [ADR-0003](./adr-0003-eval-harness.md) (arnés de evaluación): la arquitectura de evaluador / runner / puerta extendida.
- [ADR-0019](./adr-0019-synthetic-only-data-invariant.md) (invariante de datos exclusivamente sintéticos): restringe cualquier ampliación de etiquetas doradas.
