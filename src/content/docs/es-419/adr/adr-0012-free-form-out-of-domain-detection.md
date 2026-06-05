---
title: "ADR-0012: Entrada de formato libre con detección fuera de dominio"
description: Por qué el clasificador determinista de alcance gana detección fuera de dominio consciente del tema, dando a la entrada benigna fuera de tema un redireccionamiento amable en lugar de un rechazo tajante.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0012: Entrada de formato libre con detección fuera de dominio

- Estado: Aceptado
- Fecha: 2026-05-25
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El clasificador de alcance (ADR-0005) usa un modelo binario de
aprobado/rechazado: un mensaje del usuario está o bien dentro del alcance
(apoyo de bienestar para la adherencia a la medicación) o bien fuera del
alcance (dosificación, diagnóstico, interpretación, extracción de PII, juego
de roles). Los mensajes fuera del alcance reciben un rechazo tajante.

Este modelo binario funciona para violaciones claras de los límites, pero no
maneja el punto intermedio: mensajes que están fuera del alcance de la
adherencia a la medicación pero que no son peligrosos ni violan los límites.
Por ejemplo, "¿qué clima hace hoy?" o "cuéntame un chiste" son mensajes
benignos fuera de tema que deberían recibir un redireccionamiento amable de
vuelta al alcance, no un rechazo escueto que se lee como un error del sistema.

El objetivo de la entrada de formato libre pide que el agente maneje la
entrada conversacional de forma más natural. Anteriormente, un usuario que
preguntara "¿puedes ayudarme a entender mis números de colesterol?" recibía
un rechazo tajante porque toca la interpretación de laboratorio. Una mejor
experiencia detectaría el dominio (colesterol, adherencia a estatinas) y
proporcionaría una respuesta acotada que redirige hacia aquello en lo que el
agente puede ayudar.

¿Cómo extendemos el clasificador de alcance para distinguir entre "fuera de
tema pero benigno" y "fuera del alcance y peligroso" sin agregar costos de
llamadas al LLM ni romper el comportamiento existente de las barreras de
seguridad?

## Factores de la decisión

- **Capa determinista de costo cero**: la detección fuera de dominio no debe
  requerir una llamada al LLM. El clasificador basado en reglas debe manejar
  esto sin aumentar el costo por turno (ADR-0005, ADR-0007).
- **Compatibilidad hacia atrás**: los mensajes existentes dentro del alcance
  deben seguir pasando. Los patrones existentes de rechazo fuera del alcance
  (dosificación, diagnóstico, interpretación) deben seguir disparándose. Sin
  regresión en la cobertura de las barreras de seguridad.
- **Respaldo consciente de la configuración regional**: el mensaje de
  respaldo amable debe estar disponible en las tres configuraciones
  regionales (en, es-419, pt-BR), consistente con el patrón existente de
  plantilla de rechazo (ADR-0005).
- **Observabilidad**: las interacciones fuera de dominio deben ser rastreables
  mediante atributos de span de OpenTelemetry para el análisis de mejora
  continua (ADR-0006).
- **Patrón de clasificador único**: la extensión debe vivir en el clasificador
  de alcance existente, no en un nuevo módulo separado, para mantener la
  superficie de auditoría de un único clasificador.

## Opciones consideradas

- **Opción A: Extender el clasificador de alcance con clasificación consciente
  del tema y metadatos fuera de dominio**
- **Opción B: Un nuevo módulo separado fuera de dominio**
- **Opción C: Un clasificador fuera de dominio basado en LLM**

## Resultado de la decisión

Opción elegida: **Opción A**, porque preserva el patrón de clasificador único,
no agrega un nuevo módulo, no requiere una llamada al LLM y es consistente con
la arquitectura existente del clasificador de alcance.

La extensión agrega patrones de palabras clave de dominio al clasificador de
alcance basado en reglas para ocho nuevos dominios de adherencia a la
medicación (adherencia-general, estatina, inhalador, antidepresivo, cuidador,
barreras-de-costo, carga-de-pastillas, alfabetización-en-salud). Cuando un
mensaje coincide con un patrón de palabra clave de dominio pero no dispara
ningún patrón de rechazo existente, el clasificador marca la decisión de
barrera de seguridad como fuera de dominio mientras la deja pasar de todos
modos. El mensaje avanza por el grafo, pero el nodo `guardrail_pre` detecta el
marcador de fuera de dominio y lo enruta a una plantilla de respaldo amable
(un nuevo slug `out-of-domain`) en lugar de a la recuperación de RAG.

Se agrega un nuevo slug de plantilla de rechazo `out-of-domain` con variantes
por configuración regional. La plantilla es conversacional, no un rechazo
tajante: nombra aquello en lo que el agente puede ayudar e invita al usuario a
reformular dentro del alcance.

Los spans de OpenTelemetry en el nodo `guardrail_pre` ganan dos nuevos
atributos: `interaction.out_of_domain` (booleano) e
`interaction.detected_category` (cadena, el dominio coincidente o "general"
para lo fuera de tema que no es de dominio).

### Confirmación

- El clasificador de alcance se extiende con un mapeo de palabras clave de
  dominio desde ocho nombres de dominio a patrones de regex.
- La decisión de barrera de seguridad gana un campo de fuera de dominio
  (booleano) cuando se detectan palabras clave de dominio.
- Las plantillas de rechazo ganan un slug `out-of-domain` con variantes en,
  es-419 y pt-BR.
- Los spans de OpenTelemetry en `guardrail_pre` emiten los atributos
  `interaction.out_of_domain` e `interaction.detected_category`.
- Los patrones de rechazo existentes (dosificación, diagnóstico,
  interpretación, PII, juego de roles) se disparan sin cambios.
- Las pruebas unitarias cubren la detección fuera de dominio.
- Las pruebas unitarias cubren el slug de plantilla `out-of-domain`.

## Consecuencias

### Positivas

- La entrada de formato libre obtiene una respuesta conversacional en lugar de
  un rechazo tajante, mejorando la experiencia del usuario.
- Sin nuevo módulo, sin nueva llamada al LLM, sin nuevo costo: extiende la
  capa determinista basada en reglas existente.
- La superficie de auditoría de un único clasificador se preserva; todas las
  decisiones de alcance fluyen a través de un clasificador.
- Las interacciones fuera de dominio son observables mediante OpenTelemetry
  para el análisis de mejora continua.
- Las palabras clave de dominio amplían la cobertura de recuperación de RAG al
  identificar áreas temáticas relevantes.

### Negativas

- El clasificador de alcance crece en complejidad con el diccionario de
  palabras clave de dominio. Los patrones de regex deben ajustarse con cuidado
  para evitar falsos positivos (p. ej., "costo" no debería coincidir con "a
  toda costa" en un contexto no médico).
- El respaldo fuera de dominio sigue siendo una respuesta de plantilla, no una
  contextual. El agente no puede interactuar con contenido fuera de tema
  incluso cuando sería seguro hacerlo.
- La detección de dominio basada en regex es limitada: coincide con palabras
  clave, no con intención semántica. Un mensaje como "me preocupa el precio de
  mi medicación" podría no coincidir con el patrón de barreras-de-costo si la
  formulación se aparta de la regex.

### Neutrales

- La decisión de barrera de seguridad gana una nueva clave de fuera de
  dominio. Los consumidores posteriores ya leen los metadatos de la decisión
  como un dict, por lo que esto es compatible hacia atrás.
- Los spans de OpenTelemetry ganan dos nuevos atributos. Los paneles y
  consultas existentes no se ven afectados (los nuevos atributos son
  aditivos).
- Las ocho categorías de dominio son un conjunto inicial. Se pueden agregar
  más dominios extendiendo el mapeo de palabras clave de dominio sin cambio
  arquitectónico.

## Ventajas y desventajas de las opciones

### Opción A: Extender el clasificador de alcance con clasificación consciente del tema (elegida)

- Buena, porque preserva el patrón de clasificador único y la superficie de
  auditoría.
- Buena, porque sin nuevo módulo no hay nuevo grafo de importaciones, ni nuevo
  archivo de prueba, ni nuevo cableado.
- Buena, porque la detección basada en regex es determinista, comprobable y de
  costo cero.
- Buena, porque es consistente con cómo ya funciona el clasificador de alcance
  (patrones de regex para categorías de rechazo).
- Mala, porque el clasificador de alcance crece en tamaño y complejidad de
  regex.
- Mala, porque los patrones de regex son frágiles para el lenguaje natural; la
  deriva semántica en la formulación del usuario puede evadir la detección.

### Opción B: Un nuevo módulo separado fuera de dominio

- Buena, porque separación de responsabilidades: la detección fuera de dominio
  es una responsabilidad distinta.
- Mala, porque introduce un segundo módulo clasificador, fragmentando la
  superficie de auditoría.
- Mala, porque el grafo necesitaría llamar a dos clasificadores en secuencia,
  agregando complejidad de cableado.
- Mala, porque duplica la infraestructura de regex ya presente en el
  clasificador de alcance.

### Opción C: Un clasificador fuera de dominio basado en LLM

- Buena, porque la comprensión semántica maneja el lenguaje natural mejor que
  la regex.
- Buena, porque el clasificador de alcance basado en LLM existente ya
  proporciona una segunda pasada basada en modelo.
- Mala, porque cada turno incurre en un costo de llamada al LLM, incluso para
  mensajes benignos fuera de tema.
- Mala, porque agrega latencia a la ruta `guardrail_pre` (1-3 segundos por
  turno).
- Mala, porque viola el requisito de la capa determinista de costo cero para la
  ruta basada en reglas.

## Más información

- ADR de barreras de seguridad: [ADR-0005](./adr-0005-guardrails.md)
- ADR de observabilidad: [ADR-0006](./adr-0006-observability.md)
- Estrategia de expansión del corpus (ADR complementario): [ADR-0013](./adr-0013-corpus-expansion-strategy.md)
- MADR 4.0.0: <https://adr.github.io/madr/>
