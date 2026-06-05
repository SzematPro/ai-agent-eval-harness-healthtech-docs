---
title: "ADR-0009: Modelo juez de evaluación (Cerebras)"
description: Por qué el modelo juez de evaluación es Cerebras gpt-oss-120b, que reemplaza la elección anterior de Anthropic Haiku únicamente en el punto del modelo juez.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0009: Modelo juez de evaluación - Cerebras reemplaza la elección de Anthropic Claude Haiku en ADR-0003

- Estado: Aceptado
- Fecha: 2026-05-20
- Responsables de la decisión: Waldemar Szemat
- Reemplaza (en parte): [ADR-0003](./adr-0003-eval-harness.md), únicamente en la elección del modelo juez

## Contexto y planteamiento del problema

[ADR-0003](./adr-0003-eval-harness.md) ("Arnés de evaluación") se aceptó el
2026-03-18. Seleccionó la arquitectura general de evaluación (un núcleo
artesanal de pytest que orquesta DeepEval, Ragas, Phoenix y Promptfoo) y,
dentro de esa arquitectura, nombró a **Anthropic Claude Haiku** como el
juez LLM fijado para los evaluadores respaldados por juez (fundamentación,
fidelidad, alucinación, rúbricas de tono). ADR-0003 describió al juez como
un modelo Anthropic Haiku fijado, seleccionado mediante un parámetro de
modelo juez.

El arnés tal como se publica no ejecuta ese juez. El juez que el arnés
invoca hoy es **Cerebras** `gpt-oss-120b`: la configuración declara a
Cerebras como el proveedor del juez y `gpt-oss-120b` como el modelo juez, el
envoltorio del juez toma un cliente de Cerebras en la ruta de evaluación de
CI, y los evaluadores respaldados por juez se activan solo cuando hay una
clave de API de Cerebras presente. La documentación de despliegue, la
descripción general del proyecto y el informe de evaluación describen la
ruta del juez como gobernada por la presencia de una clave de API de
Cerebras. El arnés migró a Cerebras después de que ADR-0003 fuera aceptado,
por las razones de capa gratuita y latencia que se exponen a continuación;
el cambio se hizo en código pero nunca se registró como una decisión.

Cambiar el modelo juez después de que un ADR ha sido aceptado no es la
corrección de una errata. Según la propia convención de control de cambios
del proyecto (si un documento necesita relitigar o enmendar un ADR previo,
se presenta un nuevo ADR y se marca el antiguo como reemplazado), un cambio
sustantivo a una decisión registrada es en sí mismo una decisión y debe
registrarse. ¿Cómo registramos el cambio de modelo juez de modo que el
rastro de gobernanza sea honesto: el arnés ejecuta un juez de Cerebras,
ADR-0003 todavía dice Anthropic Claude Haiku, y ambos deben reconciliarse
sin borrar el registro histórico?

## Factores de la decisión

- **Realidad del código y la documentación.** La configuración, el
  envoltorio del juez, el adaptador de DeepEval, la descripción general del
  proyecto y el informe de evaluación más reciente ya describen una ruta de
  juez gobernada por Cerebras. El conjunto de ADR es el único lugar que
  todavía dice Anthropic Claude Haiku; la documentación debe converger en lo
  que el arnés realmente hace.
- **Presupuesto de capa gratuita.** La restricción permanente del proyecto
  es un estado estable de $0/mes. Cerebras ofrece una capa gratuita
  dimensionada para la carga de trabajo del juez (gran asignación diaria de
  tokens, sin tarjeta requerida); Anthropic Claude Haiku se factura por
  token. Un juez de capa gratuita mantiene la CI de evaluación dentro del
  margen de $0/mes sin un tope de tokens.
- **Superficie compatible con OpenAI.** Cerebras expone un endpoint de
  chat-completions compatible con OpenAI, por lo que el juez reutiliza la
  misma forma de adaptador (un cliente de Cerebras que refleja al cliente de
  Groq) que el arnés ya incluye. No se necesita un segundo SDK ni una forma
  de mensaje específica de Anthropic en la ruta del juez.
- **Honestidad del control de cambios.** La convención del proyecto exige un
  ADR reemplazante para cualquier revisión de una decisión previa. Una
  edición silenciosa al cuerpo de ADR-0003 violaría esa convención y
  borraría el hecho de que la elección del juez cambió.
- **Preservar el resto de ADR-0003.** Solo cambia la línea del modelo juez.
  El núcleo artesanal de pytest, la composición de DeepEval / Ragas /
  Phoenix / Promptfoo, y la estructura de tres flujos de trabajo (control de
  PR, juez nocturno, red team) siguen vigentes. El reemplazo debe acotarse al
  modelo juez y nada más.

## Opciones consideradas

- **Registrar a Cerebras como el juez mediante un nuevo ADR que reemplace a
  ADR-0003 en parte** (elegida): presentar ADR-0009, marcar ADR-0003 como
  reemplazado únicamente en el punto del modelo juez, mantener el cuerpo de
  ADR-0003 como el registro histórico.
- **Editar silenciosamente el cuerpo de ADR-0003** para reemplazar Anthropic
  Claude Haiku por Cerebras en todo el documento.
- **Revertir el arnés a un juez Anthropic Claude Haiku** para que el código
  coincida con el texto existente de ADR-0003.

## Resultado de la decisión

Opción elegida: **registrar a Cerebras como el juez de evaluación mediante
este ADR, que reemplaza a ADR-0003 únicamente en la elección del modelo
juez.** El juez de evaluación es Cerebras (`gpt-oss-120b` por defecto, detrás
de un parámetro de modelo juez configurable), accedido a través del
adaptador de cliente de Cerebras; los evaluadores respaldados por juez
(fundamentación, fidelidad, alucinación) se ejecutan solo cuando hay una
clave de API de Cerebras configurada, y el control determinista de PR se
ejecuta sin clave y sin ningún juez. Esta es la ruta de juez que el arnés
publica y ejecuta hoy. ADR-0003 conserva su estado `Aceptado` con una
anotación de "reemplazado en parte por ADR-0009"; su cuerpo se deja sin
cambios, porque un ADR reemplazado conserva su texto original como el
registro histórico (convención MADR). El resto de ADR-0003, todo lo que no
sea la elección del modelo juez, queda tal como está escrito.

Editar silenciosamente ADR-0003 fue rechazado: borraría el hecho de que la
decisión cambió y violaría la convención documentada de control de cambios
del proyecto. Revertir el arnés a Anthropic Claude Haiku fue rechazado:
reintroduciría una dependencia facturada por token en la ruta de evaluación
en contra de la restricción de $0/mes, y significaría reescribir código
funcional para que coincida con un documento obsoleto en lugar de lo
contrario.

### Confirmación

- La configuración declara a Cerebras como el proveedor del juez y
  `gpt-oss-120b` como el modelo juez; el adaptador de cliente de Cerebras y
  la ruta de Cerebras de la fábrica de LLM están cubiertos por pruebas
  unitarias.
- Los evaluadores respaldados por juez se activan solo cuando hay una clave
  de API de Cerebras presente; con la clave ausente, el informe de
  evaluación lleva un encabezado de juez deshabilitado y el control se
  ejecuta únicamente contra evaluadores deterministas.
- ADR-0003 lleva una anotación de "reemplazado en parte por ADR-0009" tanto
  en el estado de su frontmatter como en su línea de estado del cuerpo, y
  enlaza hacia adelante a este ADR.
- El índice de ADR lista a ADR-0009 y registra el reemplazo en su bitácora de
  reemplazos.

## Consecuencias

### Positivas

- El conjunto de ADR ahora coincide con el arnés: el juez que la
  documentación describe es el juez que el código ejecuta.
- El juez se mantiene dentro del margen de capa gratuita de $0/mes; sin
  facturación de Anthropic por token en la ruta de evaluación.
- El juez reutiliza el adaptador de cliente de Cerebras compatible con OpenAI
  que el arnés ya incluye; sin un segundo SDK en la ruta del juez.
- El rastro de control de cambios es honesto: el cambio de modelo juez se
  registra como una decisión, no se entierra en un diff de código.

### Negativas

- El conjunto de ADR ahora lleva su primer reemplazo, por lo que un lector
  tiene que seguir ADR-0003 hacia adelante hasta ADR-0009 para obtener el
  modelo juez actual. Mitigado por la anotación en ADR-0003 y la bitácora de
  reemplazos en el índice.
- Cerebras se convierte en una dependencia de capa gratuita de carga
  estructural en la ruta del juez; un cambio en sus términos de capa gratuita
  forzaría otra decisión de modelo juez. Una clave de API de Anthropic
  permanece conectable como la alternativa de juez de pago del operador, lo
  que acota este riesgo.

### Neutrales

- Un resumen vivo de las decisiones del proyecto se actualiza para nombrar a
  Cerebras como el modelo juez y para apuntar a este ADR.
- El id del modelo juez sigue siendo configurable; el valor por defecto
  cambia de una cadena de Claude Haiku a `gpt-oss-120b`, pero la superficie
  de anulación no cambia.
- Una clave de API de Anthropic sigue siendo un proveedor soportado y
  conectable por el usuario para una organización que prefiera ejecutar un
  juez de Anthropic de pago; este ADR cambia el juez por defecto, no el
  conjunto de proveedores seleccionables.

## Ventajas y desventajas de las opciones

### Registrar a Cerebras mediante un nuevo ADR que reemplaza a ADR-0003 en parte

- Buena, porque sigue la convención documentada de control de cambios del
  proyecto (un nuevo ADR para cualquier revisión de una decisión previa).
- Buena, porque mantiene el cuerpo de ADR-0003 intacto como el registro
  histórico de por qué el arnés se estructuró como lo hizo.
- Buena, porque converge el conjunto de ADR en lo que el código realmente
  hace sin reescribir la historia.
- Mala, porque introduce el primer enlace de reemplazo que un lector tiene
  que seguir.

### Editar silenciosamente el cuerpo de ADR-0003

- Buena, porque deja un único ADR-0003 internamente consistente.
- Mala, porque borra el hecho de que la elección del juez cambió después de
  que el ADR fuera aceptado.
- Mala, porque viola la propia convención del proyecto de que una revisión a
  una decisión registrada se presenta como un nuevo ADR.

### Revertir el arnés a un juez Anthropic Claude Haiku

- Buena, porque el código entonces coincidiría con el texto existente de
  ADR-0003 sin un nuevo ADR.
- Mala, porque reintroduce una dependencia facturada por token en la ruta de
  evaluación, en contra de la restricción de $0/mes.
- Mala, porque reescribe código funcional para que coincida con un documento
  obsoleto en lugar de actualizar el documento para que coincida con la
  realidad.

## Más información

- [ADR-0003: Arnés de evaluación](./adr-0003-eval-harness.md) (la decisión reemplazada en parte)
- [ADR-0002: Abstracción de proveedor de LLM](./adr-0002-llm-vendor-abstraction.md) (el Protocol de cliente LLM que implementa el adaptador del juez)
- Documentación de Cerebras Inference: <https://inference-docs.cerebras.ai/>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Rúbricas conscientes de características

El juez evalúa cinco dimensiones de rúbrica específicas de características
cuando un caso dorado lleva etiquetas de característica en sus metadatos. Las
características son: **voice** (voz), **i18n** (internacionalización), **pii**
(redacción de PII), **governance** (cobertura regulatoria) y **data_layer**
(control de claves de la capa de datos / visualización de costos).

- Un conjunto de plantillas de rúbrica de características define las cinco
  descripciones de rúbrica de características, cada una con criterios de
  puntuación concretos de 1.0 / 0.5 / 0.0.
- El evaluador de fundamentación extiende condicionalmente su rúbrica con
  entradas de característica cuando un caso lleva metadatos de característica.
  Los casos sin metadatos de característica producen una puntuación idéntica a
  la línea base.
- Las claves de puntuación de característica siguen el patrón `feature_{name}`
  (p. ej., `feature_voice`, `feature_i18n`).
- Un control de cobertura de características en CI verifica que las cinco
  categorías de característica tengan al menos un caso dorado y que ninguna
  dimensión de característica devuelva una justificación malformada en cada
  caso (detección de malformación). Las puntuaciones cero legítimas con
  justificaciones no malformadas no se marcan.
- Tolerancia de regresión: la evaluación del control acepta parámetros
  opcionales de agregados de línea base (+/- 0.05) y de línea base por
  configuración regional (+/- 0.08) para la detección de regresiones.

La selección del modelo juez (Cerebras `gpt-oss-120b`) no se ve afectada por
esta estructura de rúbrica.
