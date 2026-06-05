---
title: "ADR-0013: Estrategia de expansión del corpus"
description: Por qué la base de conocimiento y los corpus de evaluación se expanden añadiendo entradas sintéticas de dominio público en ocho nuevos dominios, con paridad de configuración regional y sin cambio de esquema.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0013: Estrategia de expansión del corpus

- Estado: Aceptado
- Fecha: 2026-05-25
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El corpus de la base de conocimiento contiene 12 tarjetas KB sintéticas a
través de cuatro dominios de condiciones (hipertensión, diabetes,
insuficiencia cardíaca, asma). El corpus de evaluación contiene 60 casos
dorados en inglés + 10 en español (es-419) + 10 en portugués (pt-BR). Ambos
usan el formato JSONL, documentado en la declaración de datos del proyecto.

El objetivo de expansión del corpus pide al menos cinco nuevos dominios de
condiciones. La extensión de detección fuera de dominio (ADR-0012) identifica
ocho nuevas categorías de dominio (adherencia-general, estatina, inhalador,
antidepresivo, cuidador, barreras-de-costo, carga-de-pastillas,
alfabetización-en-salud). Cada nuevo dominio necesita tarjetas KB para la
recuperación de RAG y casos de evaluación para la puntuación controlada por
CI.

Todos los datos nuevos deben ser sintéticos y de dominio público. El formato
JSONL existente y el arnés de evaluación deben permanecer sin cambios. Debe
mantenerse la paridad de configuración regional: cada nuevo caso de
evaluación debe existir en las tres configuraciones regionales (en, es-419,
pt-BR).

¿Cómo expandimos los corpus de KB y de evaluación a través de ocho nuevos
dominios manteniendo la consistencia de formato, la paridad de configuración
regional y datos 100% sintéticos de dominio público?

## Factores de la decisión

- **Política de solo sintéticos**: todos los datos deben ser sintéticos, sin
  datos reales de pacientes, sin fuentes propietarias.
- **Fuentes de dominio público**: las URL de origen de las tarjetas KB deben
  apuntar a fuentes de dominio público o con licencia libre (MedlinePlus, CDC,
  WHO). El campo de licencia de origen debe ser preciso.
- **Formato JSONL existente**: los formatos de tarjeta KB y de turno de
  evaluación están fijados por la canalización de RAG y el arnés de
  evaluación. Sin cambios de esquema.
- **Cobertura de evaluación en 3 configuraciones regionales**: cada nuevo caso
  de evaluación debe existir en en, es-419 y pt-BR con cobertura equivalente.
- **Calidad de recuperación de RAG**: 2-3 tarjetas KB por dominio deberían
  proporcionar suficiente superficie de recuperación para las áreas temáticas
  ampliadas.
- **Sin modificación de las entradas existentes**: las tarjetas KB y los casos
  de evaluación existentes son parte de la línea base confirmada. Los datos
  nuevos solo se añaden.

## Opciones consideradas

- **Opción A: Añadir a los archivos JSONL existentes con 2-3 tarjetas KB por
  dominio + 2-3 casos de evaluación por dominio por configuración regional**
- **Opción B: Un nuevo directorio de corpus con archivos por dominio**
- **Opción C: Tarjetas generadas por LLM con revisión humana**

## Resultado de la decisión

Opción elegida: **Opción A**, porque mantiene la consistencia de formato con
el corpus existente, no requiere cambios en la canalización de RAG ni en el
arnés de evaluación, y se alinea con la metodología de datos documentada.

Se agregarán ocho nuevos dominios con 2-3 tarjetas KB cada uno
(aproximadamente 18-24 nuevas tarjetas en total):

| Dominio | Descripción | Temas de ejemplo |
|--------|-------------|----------------|
| adherence-general | Patrones generales de adherencia a la medicación | Construcción de rutinas, estrategias de recordatorio, formación de hábitos |
| statin | Adherencia a la medicación con estatinas | Manejo del colesterol, efectos secundarios de las estatinas, persistencia con estatinas |
| inhaler | Técnica de inhalador y adherencia | Uso de controlador vs. de alivio, técnica de espaciador, planes de acción |
| antidepressant | Adherencia a la medicación antidepresiva | Persistencia con ISRS, preocupaciones de discontinuación, barreras de estigma |
| caregiver | Apoyo a la adherencia mediado por cuidadores | Comunicación con el cuidador, manejo compartido, recordatorios de medicación |
| cost-barriers | Barreras financieras a la adherencia | Cobertura de seguro, alternativas genéricas, asistencia con copagos |
| pill-burden | Polifarmacia y fatiga de pastillas | Estrategias de simplificación, terapia combinada, carga del régimen |
| health-literacy | Alfabetización en salud y adherencia | Comprensión de etiquetas de medicación, numeración en salud, lenguaje claro |

Para los casos de evaluación, se agregarán 2-3 casos dorados por dominio por
configuración regional:

| Configuración regional | Actual | Nuevos (aprox.) | Total (aprox.) |
|--------|---------|---------------|-----------------|
| en | 60 | 16-24 | 76-84 |
| es-419 | 10 | 16-24 | 26-34 |
| pt-BR | 10 | 16-24 | 26-34 |

Todas las nuevas tarjetas KB usan fuentes de dominio público (MedlinePlus,
CDC, WHO) con campos precisos de URL de origen y de licencia de origen. Todos
los nuevos casos de evaluación son sintéticos, etiquetados con el dominio
apropiado en sus metadatos, y diseñados para probar la recuperación y la
citación contra las nuevas tarjetas KB.

### Confirmación

- El corpus de tarjetas KB crece de 12 a 36 entradas.
- El corpus de evaluación en inglés crece en 16-24 entradas.
- El corpus de evaluación en español crece en 16-24 entradas.
- El corpus de evaluación en portugués crece en 16-24 entradas.
- Todas las nuevas entradas usan el esquema JSONL existente (sin cambios de
  formato).
- Los conteos de corpus de la declaración de datos se actualizan para reflejar
  la expansión.
- La canalización de RAG y el arnés de evaluación leen los archivos ampliados
  sin cambios de código.

## Consecuencias

### Positivas

- Cobertura de RAG más amplia a través de ocho nuevos dominios de adherencia a
  la medicación, mejorando la relevancia de la recuperación para la entrada de
  formato libre.
- La expansión del corpus de evaluación aumenta la cobertura controlada por CI
  de las nuevas áreas de dominio.
- Consistencia de formato: sin cambios en el esquema JSONL, en la canalización
  de RAG ni en el arnés de evaluación.
- Paridad de configuración regional mantenida: cada dominio tiene casos de
  evaluación en las tres configuraciones regionales.
- Todos los datos nuevos son sintéticos y de dominio público.

### Negativas

- El corpus de KB triplica su tamaño (de 12 a 36 tarjetas), lo que puede
  aumentar ligeramente la latencia de recuperación de Chroma. Aceptable a la
  escala de la demo.
- Generar 16-24 casos de evaluación por configuración regional es laborioso. La
  calidad debe verificarse manualmente antes de confirmar.
- Algunos nuevos dominios (p. ej., "adherencia-general") se solapan
  conceptualmente con tarjetas cruzadas de dominio existentes. La
  deduplicación requiere una revisión cuidadosa.
- Los conteos de la declaración de datos deben actualizarse cada vez que el
  corpus cambia, agregando un paso de mantenimiento de documentación.

### Neutrales

- Los nuevos ID de tarjeta KB usan prefijos específicos de dominio (p. ej.,
  `card-statin-*`, `card-inhaler-*`) para claridad y verificación de
  deduplicación.
- Los nuevos ID de caso de evaluación usan prefijos de dominio (p. ej.,
  `golden-statin-*`) consistentes con la nomenclatura existente.
- El arnés de evaluación ya analiza JSONL dinámicamente, por lo que no se
  necesitan cambios de código para soportar el corpus ampliado.

## Ventajas y desventajas de las opciones

### Opción A: Añadir a los archivos JSONL existentes (elegida)

- Buena, porque sin cambio de formato no hay modificaciones a la canalización
  de RAG ni al arnés de evaluación.
- Buena, porque la metodología de datos existente y el esquema JSONL siguen
  siendo autoritativos.
- Buena, porque añadir es más simple que crear una nueva estructura de
  directorios.
- Buena, porque el arnés de evaluación ya lee el archivo JSONL completo; las
  nuevas entradas se recogen automáticamente.
- Mala, porque un único archivo JSONL grande es más difícil de explorar que
  archivos por dominio.
- Mala, porque la verificación de deduplicación requiere escanear el archivo
  completo.

### Opción B: Un nuevo directorio de corpus con archivos por dominio

- Buena, porque los archivos por dominio son más fáciles de explorar y
  mantener.
- Buena, porque la verificación de deduplicación se acota al archivo del
  dominio.
- Mala, porque requiere cambiar la canalización de RAG y el arnés de
  evaluación para leer desde múltiples archivos.
- Mala, porque introduce una nueva estructura de directorios que no está en la
  metodología de datos.
- Mala, porque rompe la convención establecida de archivo único sin una razón
  convincente.

### Opción C: Tarjetas generadas por LLM con revisión humana

- Buena, porque la generación por LLM acelera la creación de tarjetas.
- Mala, porque el contenido médico generado por LLM requiere una revisión
  cuidadosa para evitar afirmaciones alucinadas.
- Mala, porque las URL de origen y los campos de licencia todavía deben
  verificarse manualmente.
- Mala, porque introduce una canalización de generación que actualmente no
  existe.
- Mala, porque los datos sintéticos deben ser demostrablemente de dominio
  público, lo que es más difícil de verificar para texto generado por LLM.

## Más información

- Detección fuera de dominio (ADR complementario): [ADR-0012](./adr-0012-free-form-out-of-domain-detection.md)
- Stack de RAG: [ADR-0004](./adr-0004-rag-stack.md)
- Política de datos: un corpus de solo sintéticos, sin conjuntos de datos
  restringidos por un acuerdo de uso de datos.
- MADR 4.0.0: <https://adr.github.io/madr/>
