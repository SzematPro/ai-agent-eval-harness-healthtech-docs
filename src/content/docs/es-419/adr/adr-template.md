---
title: "ADR-NNNN: Título corto"
description: Plantilla MADR 4.0.0 para nuevos registros de decisiones de arquitectura en esta implementación de referencia.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-NNNN: Título corto

- Estado: Proposed
- Fecha: YYYY-MM-DD
- Responsables de la decisión: Waldemar Szemat
- Consultados: (opcional)
- Informados: (opcional)

## Contexto y planteamiento del problema

Describe el contexto arquitectónico, las fuerzas en juego y el
planteamiento concreto del problema en dos a cuatro párrafos cortos.

Un planteamiento del problema bien formulado se lee como una pregunta: "¿Cómo
hacemos ...?" Haz explícito el alcance: qué está dentro y qué queda
deliberadamente fuera.

## Impulsores de la decisión

- Impulsor 1: una propiedad que la opción elegida debe satisfacer
- Impulsor 2: una restricción que no podemos violar (licencia, presupuesto
  del nivel gratuito, línea regulatoria, presupuesto de latencia)
- Impulsor 3: una señal demostrativa / didáctica que queremos que la
  implementación de referencia transmita
- Impulsor 4: una evolución futura que debería seguir siendo barata (cambiar
  de proveedor, cambiar de almacén, cambiar de framework)

## Opciones consideradas

- **Opción A**: resumen en una línea
- **Opción B**: resumen en una línea
- **Opción C**: resumen en una línea

## Resultado de la decisión

Opción elegida: **Opción X**, porque (un párrafo: la razón más determinante,
más las razones de segundo orden, más cómo la opción preserva el valor de
opción de cambiar más adelante).

### Confirmación

¿Cómo sabremos que se honró la decisión? (p. ej. job de CI, verificación de
tipos, prueba de importación, compuerta de evaluación, lista de verificación
de revisión manual).

## Consecuencias

### Positivas

- De tres a seis consecuencias positivas concretas (qué se vuelve más fácil,
  qué se vuelve más barato, qué demuestra ahora la implementación de
  referencia)

### Negativas

- De tres a seis costos honestos (presión de lock-in, curva de aprendizaje,
  carga operativa, salvedad de licencia)

### Neutrales

- De tres a seis cosas que cambian pero que no son ni claramente buenas ni
  malas (nueva superficie de abstracción, nueva dependencia en el lockfile)

## Pros y contras de las opciones

### Opción A

- Buena, porque ...
- Buena, porque ...
- Mala, porque ...
- Mala, porque ...

### Opción B

- Buena, porque ...
- Mala, porque ...

### Opción C

- Buena, porque ...
- Mala, porque ...

## Más información

- Documentación upstream: `https://example.com/docs`
- Artículo de apoyo: `https://example.com/blog`
- MADR 4.0.0: <https://adr.github.io/madr/>
