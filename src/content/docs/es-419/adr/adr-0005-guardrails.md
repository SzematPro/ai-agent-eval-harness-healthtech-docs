---
title: "ADR-0005: Barreras de seguridad y postura regulatoria"
description: Por qué la clasificación de alcance, las plantillas de rechazo y el escalamiento por señal de alerta son módulos de primera clase atados a una línea regulatoria.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0005: Barreras de seguridad (clasificador de alcance + plantillas de rechazo + escalamiento como módulos de primera clase)

- Estado: Accepted
- Fecha: 2026-03-18
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El agente es una herramienta conversacional de apoyo a la adherencia a la
medicación. No es un dispositivo médico, no está autorizado por la FDA, no está
validado clínicamente, y se construye con datos 100% sintéticos. Para
mantenerse de forma creíble de ese lado de la línea, el contrato de diseño
sigue las guías finales de la FDA 2026 General Wellness y Clinical Decision
Support Software (emitidas el 2026-01-06), la guía LMM de la WHO y una amplia
conciencia internacional (MHRA, EU AI Act). La referencia de postura
regulatoria es el complemento de formato largo de este ADR.

La pregunta arquitectónica es concreta: ¿dónde viven los comportamientos
relevantes para la seguridad? Si el cumplimiento de alcance, el rechazo y el
escalamiento son trucos de ingeniería de prompts dispersos dentro de un solo
prompt de sistema, no son auditables, no son testeables y derivan con cada
edición del prompt. Si son módulos de primera clase con sus propios archivos,
pruebas y porciones de evaluación, se convierten en artefactos inspeccionables.

¿Cómo hacemos que la superficie de barreras de seguridad sea inspeccionable,
testeable y atada 1:1 a una postura regulatoria, sin convertir el agente en un
juguete de lista negra de palabras clave?

## Impulsores de la decisión

- El agente no debe diagnosticar, prescribir, cambiar dosis, interpretar
  laboratorios / imágenes ni interactuar con clínicos; la línea FDA 2026
  General Wellness / CDS es el contrato
- Toda afirmación clínica debe citar una tarjeta de KB; el rechazo ante una
  no-coincidencia es lo predeterminado, no un caso especial
- El escalamiento por señal de alerta tiene una lista codificada en duro
  emparejada con una porción de evaluación; los falsos negativos cuestan mucho
  más que los falsos positivos
- La capa de barreras de seguridad debe ser reemplazable: una implementación
  futura podría conectar NeMo Guardrails, Guardrails AI o LLM Guard
- La historia de auditoría debe leerse para un no-ingeniero (revisor clínico,
  revisor familiarizado con SaMD)

## Opciones consideradas

- **Tres módulos de barreras de seguridad de primera clase**: un clasificador
  de alcance más selector de plantilla de rechazo, detección de señal de alerta
  más orquestación de derivación, y plantillas de rechazo calibradas (elegida)
- **NVIDIA NeMo Guardrails** como el motor de barreras de seguridad, con rails
  Colang que codifican las mismas restricciones
- **Guardrails AI** con validadores de salida estructurada
- **Un solo prompt de sistema grande** que codifique todas las reglas en línea
- **Tercerizar al LLM**, sin capa programática de barreras de seguridad en
  absoluto

## Resultado de la decisión

Opción elegida: **clasificador de alcance + plantillas de rechazo +
escalamiento / derivación como módulos de barreras de seguridad de primera
clase**, con el contrato de diseño fijado a la línea de la guía FDA 2026
General Wellness / CDS Software. La capa de barreras de seguridad es un pequeño
paquete de Python, no un motor YAML / DSL; los tres módulos exponen funciones
tipadas que los nodos de LangGraph llaman explícitamente:

- El clasificador de alcance corre en cada turno del usuario antes de redactar;
  los veredictos fuera de alcance se enrutan directamente a un nodo de rechazo
- El renderizador de rechazo selecciona una plantilla de rechazo calibrada y
  localizada que no rechaza en exceso preguntas benignas
- El detector de escalamiento evalúa la lista de señales de alerta codificada
  en duro (suicidalidad, dolor de pecho, signos de accidente cerebrovascular,
  reacción alérgica severa, perturbación visual súbita en warfarina, embarazo +
  teratógeno, etc.) y puede disparar un `interrupt()` de LangGraph para la ruta
  HITL

El contrato de diseño del agente es explícito en la referencia de postura
regulatoria y en este ADR: NO diagnostica, prescribe, cambia dosis, interpreta
laboratorios / imágenes ni interactúa con clínicos. Toda afirmación clínica
debe citar una tarjeta de KB por id; si ninguna tarjeta coincide, el agente
rechaza con una respuesta basada en plantilla y consciente del locale. NeMo
Guardrails y Guardrails AI son alternativas documentadas; las interfaces con
forma de Protocol permiten que un contribuidor futuro cambie implementaciones
sin reescribir el grafo del agente.

### Confirmación

- Porción de evaluación para cumplimiento de alcance: sin elicitación de
  consejo de dosificación, sin pesca de diagnóstico, plantillas de rechazo
  correctas
- Porción de evaluación para corrección del escalamiento: precisión y recall
  contra un conjunto de oro de señales de alerta, peso del falso negativo mucho
  mayor que el del falso positivo en el evaluador
- Porción de evaluación para el balance rechazo-vs-rechazo-en-exceso: las
  consultas benignas sobre adherencia, EM, efectos secundarios e identificación
  de píldoras no deben ser rechazadas
- La referencia de postura regulatoria lista los comportamientos prohibidos,
  reflejados por un docstring en el paquete de barreras de seguridad
- La verificación de citación requerida es un evaluador determinista de la
  compuerta del PR

## Consecuencias

### Positivas

- El comportamiento de las barreras de seguridad es inspeccionable: un lector (o
  un revisor clínico) abre tres módulos y ve exactamente lo que el agente
  hará y no hará
- El arnés de evaluación tiene porciones nombradas para las dimensiones de
  seguridad, no "confía en el prompt"
- El contrato de diseño es pequeño, escrito en inglés sencillo en la referencia
  de postura regulatoria, y reproducido en este ADR; la deriva es detectable
  por diff
- Los puntos de "Lo que esto NO es" se hacen cumplir por código, no por tono
- Un cambio futuro a NeMo Guardrails o Guardrails AI reemplaza
  implementaciones detrás del mismo Protocol, sin tocar los nodos de LangGraph

### Negativas

- El equipo es dueño de las plantillas de rechazo y de la lista de señales de
  alerta; ambas revisadas con una cadencia
- Un clasificador de alcance con sabor a palabras clave es menos expresivo que
  un DSL completo de barreras de seguridad; mitigado usando el LLM como
  clasificador detrás del Protocol, no regex estática
- La corrección del escalamiento depende de la lista de señales de alerta,
  tratada como un artefacto versionado

### Neutrales

- El proyecto gana tres módulos pequeños y un dataset de plantillas de rechazo
  y disparadores de señales de alerta
- El diseño con forma de Protocol mantiene un cambio a NeMo / Guardrails AI como
  una opción futura, no una dependencia actual
- La postura regulatoria vive en tres lugares (este ADR, la referencia de
  postura regulatoria, el resumen de "Lo que esto NO es") que deben mantenerse
  en sincronía

## Pros y contras de las opciones

### Tres módulos de barreras de seguridad de primera clase

- Buena, porque la superficie es auditable en Python, no en YAML
- Buena, porque el arnés de evaluación llama directamente a los módulos
  para afirmar contra la lista de señales de alerta y las plantillas de rechazo
- Buena, porque un cambio futuro a NeMo Guardrails o Guardrails AI
  es un cambio a nivel de Protocol
- Mala, porque el equipo es dueño de los datos de plantillas y señales de alerta
- Mala, porque un clasificador con sabor a palabras clave es menos expresivo
  que un DSL de barreras de seguridad en los casos límite

### NVIDIA NeMo Guardrails

- Buena, porque Colang da un DSL declarativo de rails con una
  comunidad activa
- Mala, porque añade una nueva dependencia de runtime y un nuevo
  lenguaje que aprender
- Mala, porque el motor de rails se convierte en la fuente de verdad, no el
  Python tipado; el arnés de evaluación tiene que envolver Colang

### Guardrails AI

- Buena, porque la historia de validación de salida estructurada es fuerte
- Mala, porque el framework se centra en validar la estructura de la salida del
  LLM, no en las decisiones de rechazo / escalamiento; esa lógica
  seguiría viviendo en otra parte

### Un solo prompt de sistema grande

- Buena, porque cero código nuevo
- Mala, porque las restricciones no son inspeccionables, no son testeables y
  no son auditables; las ediciones del prompt regresan la seguridad en silencio

### Tercerizar al LLM (sin capa programática)

- Buena, porque el afinamiento de seguridad del LLM captura muchos patrones
  adversariales
- Mala, porque la seguridad-por-prompt-únicamente no es defendible para una
  implementación de referencia de healthtech

## Más información

- FDA "General Wellness: Policy for Low-Risk Devices" (final 2026,
  emitida el 2026-01-06):
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-wellness-policy-low-risk-devices>
- FDA "Clinical Decision Support Software" (final 2026):
  <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software>
- WHO "Ethics and governance of AI for health: Guidance on LMMs":
  <https://www.who.int/publications/i/item/9789240084759>
- MHRA "Software and AI as a Medical Device":
  <https://www.gov.uk/government/publications/software-and-artificial-intelligence-ai-as-a-medical-device>
- NVIDIA NeMo Guardrails: <https://github.com/NVIDIA/NeMo-Guardrails>
- Guardrails AI: <https://www.guardrailsai.com/docs>
- Documento complementario: [postura regulatoria](../reference/regulatory-posture.md)
- MADR 4.0.0: <https://adr.github.io/madr/>

## Enrutador de escalamiento tal como se construyó

**Mecanismo de escalamiento.** El módulo de escalamiento ejecuta una lista
determinista de señales de alerta por regex dentro del nodo de pre-guardrail,
antes del clasificador de alcance; ante una coincidencia emite una decisión de
`escalation` cuyos metadatos llevan una carga útil estructurada de derivación
(`category`, `severity`, `matched_terms`, `subcategories`, `template_slug`) y
cortocircuita el turno hacia una plantilla de escalamiento consciente del
locale. La carga útil de metadatos es la costura tipada que una ruta de humano
en el bucle con `interrupt()` podría consumir en el futuro; el cortocircuito
determinista es la ruta distribuida porque es compatible con el arnés de
evaluación de un solo paso y sin claves.

**Ubicación de la lista de señales de alerta.** La lista es una constante de
módulo en línea y rastreada por diff, consistente con las constantes de regex en
línea del clasificador de alcance y las plantillas en línea del módulo de
rechazo. La lista es inspeccionable, la deriva es detectable por diff, y la
revisión ocurre con la misma cadencia que el resto del módulo de barreras de
seguridad.

**Taxonomía de señales de alerta agudas.** El enrutador de escalamiento
determinista cubre siete categorías agudas: ideación suicida, anafilaxia /
reacción alérgica severa, dolor de pecho cardíaco agudo, sangrado severo, asma
severa / dificultad respiratoria aguda, **accidente cerebrovascular / signos
FAST** y **emergencia hipertensiva**. Este conjunto de siete categorías es el
que el módulo de escalamiento distribuye, el que la lista publicada de señales
de alerta documenta y el que la referencia de postura regulatoria registra.
El recall de escalamiento se mantiene en >= 0.95. La detección es
intencionalmente ciega a la negación - una decisión deliberada de alto recall
impulsada por la asimetría del costo del falso negativo señalada arriba
(escalar ante "sin dolor de pecho" es un falso positivo aceptado; una señal de
alerta omitida no lo es).

**Dos patrones diferidos a la capa de prompt** (no al enrutador determinista):
perturbación visual súbita en un anticoagulante, y la co-ocurrencia de embarazo
+ teratógeno. El caso de embarazo + teratógeno es un patrón de conjunción que
necesita un léxico de nombres de medicamentos que una lista plana de regex no
puede llevar; lo maneja la capa de prompt mientras tanto. La diferición se
registra en el docstring del módulo de escalamiento.
