---
title: "ADR-0019: Invariante de datos exclusivamente sintéticos"
description: Por qué el corpus de evaluación es 100% sintético a partir de fuentes de dominio público, con una lista de exclusión explícita y una carga de la prueba en el momento del PR.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0019: Invariante de datos exclusivamente sintéticos + lista de exclusión

- Estado: Aceptado
- Fecha: 2026-05-27 (retroactivo — invariante desde v0.4.0)
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El arnés de evaluación debe ser reproducible por cualquiera que bifurque el repo.
Un revisor que necesitara firmar un Acuerdo de Uso de Datos (DUA) antes de ejecutar
`make eval` se toparía con una verdadera barrera de fricción — y toda la
propuesta de la demo ("evaluación reproducible y validada por CI") quedaría
socavada.

Muchos conjuntos de datos de IA conversacional médica están restringidos por DUA (MIMIC,
ChatDoctor, MedDialog, n2c2 / i2b2). Mezclar cualquiera de ellos en el corpus de
evaluación propagaría el requisito de licenciamiento a cada bifurcación.

La política exclusivamente sintética también descarta por construcción el vector
de entrada de PHI: si ningún dato real de pacientes entra en el conjunto de
evaluación, ningún PHI puede filtrarse a través de él.

¿Cómo mantenemos el corpus de evaluación abierto y reproducible y, al mismo
tiempo, garantizamos que el proyecto nunca incorpore accidentalmente un conjunto
de datos restringido, y cómo hacemos que la política sea verificable por un lector
casual en 30 segundos?

## Factores de decisión

- **Reproducibilidad**: cada revisor puede ejecutar `make eval` sin
  fricción de licenciamiento.
- **Privacidad por construcción**: la ausencia de PHI en el corpus implica la
  ausencia de PHI a través del corpus.
- **Auditabilidad de licencias**: cada tarjeta de la KB y cada caso de evaluación
  lleva la atribución de su fuente y una etiqueta de licencia permisiva (CC0 o
  dominio público).
- **Verificabilidad**: un repaso de 30 segundos de la política debe convencer a un
  revisor de que la restricción es real y se hace cumplir.

## Opciones consideradas

- **Opción A**: Mezclar datos reales y sintéticos; evaluación reproducible
  condicionada a la aceptación de un DUA por usuario.
- **Opción B**: Exclusivamente sintético con fuentes de dominio público de
  organismos gubernamentales / ONG (MedlinePlus, DailyMed, WHO EML, etiquetas de
  la FDA).
- **Opción C**: Exclusivamente sintético con fuentes parafraseadas a partir de
  material licenciado (p. ej., guías clínicas licenciadas parafraseadas en
  turnos sintéticos de pacientes).

## Resultado de la decisión

Opción elegida: **Opción B** — exclusivamente sintético con fuentes de
dominio público, una lista de exclusión explícita de conjuntos de datos
restringidos por DUA, y una carga de la prueba en el momento del PR para
cualquier propuesta de un nuevo conjunto de datos.

La lista de exclusión (declarada en la política de seguridad del proyecto):

- **MIMIC** (MIT Critical Care DB) — DUA mediante PhysioNet
- **ChatDoctor** — licencia no comercial, diálogos de médicos formados en EE. UU.
- **MedDialog** — licencia no comercial
- **n2c2 / i2b2** — DUA mediante Harvard
- Cualquier otro conjunto de datos médicos restringido por DUA

La carga de la prueba en el PR para cualquier nueva fuente de datos propuesta:

1. Texto de la licencia citado en la descripción del PR, con un enlace a la fuente
   autoritativa.
2. Cadena de procedencia (quién la produjo originalmente, cuándo, qué ediciones
   aplicó el repo).
3. Aserción explícita de compatibilidad con Apache 2.0 (la postura de
   licenciamiento del proyecto según [ADR-0008](./adr-0008-licensing.md)).
4. El mantenedor revisa los tres puntos anteriores antes de fusionar el PR.

Todas las tarjetas de la KB y los casos de evaluación se publican con la
atribución de su fuente y una etiqueta de licencia permisiva en sus metadatos,
de modo que cualquiera que repase el corpus sintético pueda verificar la política
directamente.

### Confirmación

- La política de seguridad declara la lista de exclusión y el enunciado de la política.
- El directorio del conjunto de datos sintéticos lleva una auditoría de licencias
  por fuente.
- La [declaración de datos](../reference/data.md) publicada es la ficha del
  conjunto de datos con la procedencia por tarjeta.
- La [ficha de datos](../governance/data-card.md) de gobernanza es la vista
  orientada a la gobernanza de lo mismo.
- Antes de la fusión: la lista de verificación de revisión del PR incluye la
  puerta de carga de la prueba para cualquier archivo de datos nuevo.

## Consecuencias

### Positivas

- La evaluación es reproducible de extremo a extremo sin fricción de
  licenciamiento. El CI de cualquier bifurcación ejecuta `make eval` contra el
  corpus comprometido.
- La entrada de PHI queda descartada por construcción — no hay ninguna ruta
  ascendente.
- La afirmación "100% sintético, cero PHI" está respaldada por código (corpus
  comprometido) y por proceso (carga de la prueba en el PR).
- La auditoría de licencias es un repaso de 30 segundos del README, la declaración
  de datos y la lista de exclusión.

### Negativas

- El corpus es más pequeño de lo que rendiría mezclar MIMIC. La superficie de
  evaluación resultante es más estrecha; un agente de producción necesitaría
  evaluaciones licenciadas adicionales para una cobertura real.
- La restricción exclusivamente sintética descarta el uso de señales de deriva del
  mundo real (sin telemetría de desviación al estilo de MIMIC). El [plan de
  detección de deriva](../governance/drift-detection-plan.md) es honesto sobre
  esta brecha.
- Un colaborador que quiera añadir un conjunto de datos licenciado útil tiene que
  hacer el trabajo de (a) encontrar una alternativa de dominio público, o
  (b) producir una paráfrasis exclusivamente sintética, o (c) no aportar
  los datos. La opción (c) es aceptable para la etapa de este proyecto.

### Neutrales

- La lista de exclusión es una superficie de mantenimiento: cuando un nuevo
  conjunto de datos médicos restringido por DUA se vuelve muy conocido, debería
  añadirse a la lista de forma explícita, aunque la puerta de carga de la prueba
  lo detectaría de todos modos. Nombrarlo explícitamente hace que la política sea
  más rápida de verificar.

## Pros y contras de las opciones

### Opción A: Mezclar reales + sintéticos + DUA por usuario

- Buena, porque rinde un corpus más grande.
- Mala, porque cada bifurcación debe aceptar el DUA — un factor que mata la
  fricción en las revisiones abiertas.
- Mala, porque se abre una ruta de entrada de PHI; se necesitan nuevos controles
  para cerrarla.
- Mala, porque la afirmación "reproducible sin fricción de licenciamiento" deja
  de ser cierta.

### Opción B (elegida): Exclusivamente sintético, fuentes de dominio público

- Buena, porque pone la reproducibilidad primero.
- Buena, porque el PHI queda descartado por construcción.
- Buena, porque la auditoría es rápida — lista de exclusión + etiqueta de
  licencia por tarjeta.
- Mala, porque el corpus queda acotado por lo que cubren las fuentes de dominio
  público.

### Opción C: Exclusivamente sintético, parafraseado a partir de material licenciado

- Buena, porque ofrece una cobertura semántica más amplia.
- Mala, porque el panorama de licencias de una paráfrasis es turbio — la
  licencia original puede seguir aplicándose. Riesgo de una reclamación accidental
  de obra derivada.
- Mala, porque la auditoría es más lenta (cada tarjeta necesita una cadena de
  fuente de la paráfrasis, no solo una atribución).

## Más información

- [Declaración de datos](../reference/data.md) — ficha del conjunto de datos
- [Ficha de datos](../governance/data-card.md) — ficha del conjunto de datos orientada a la gobernanza
- [ADR-0004](./adr-0004-rag-stack.md) — stack de RAG (el consumidor del
  corpus sintético)
- [ADR-0008](./adr-0008-licensing.md) — postura de licenciamiento del proyecto
- MADR 4.0.0: <https://adr.github.io/madr/>
