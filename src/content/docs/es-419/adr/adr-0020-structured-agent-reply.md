---
title: "ADR-0020: Respuesta estructurada del agente"
description: Por qué el agente emite una respuesta estructurada validada (esquema de Pydantic más modo JSON por proveedor) en lugar de depender de la coincidencia de subcadenas sobre prosa.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0020: Respuesta estructurada del agente — esquema de Pydantic + modo JSON del LLM

- Estado: Aceptado
- Fecha: 2026-05-27
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

Anteriormente, el agente emitía prosa libre, y los evaluadores de corrección de
la negativa y de la escalación decidían "¿se rehusó el agente?" /
"¿escaló el agente?" coincidiendo subcadenas de la prosa contra
tablas de marcadores solo en inglés.

Esto es frágil de tres formas concretas:

1. Las tablas de marcadores están solo en inglés. El arnés incluye los idiomas
   es-419 y pt-BR ([ADR-0001](./adr-0001-orchestration.md)), pero los
   evaluadores no pueden ver una negativa en esos idiomas a menos que la prosa
   contenga por casualidad las subcadenas en inglés. Una expresión regular
   multilingüe distinta existía en paralelo en la capa de barreras de seguridad —
   dos capas de marcadores paralelas que derivan de forma independiente.
2. Añadir una nueva subplantilla de negativa (se añadieron seis:
   `input-malformed`, `out-of-scope-dosing`, `out-of-scope-diagnosis`,
   `out-of-scope-interpretation`, `out-of-scope-pii`,
   `out-of-scope-meta`) requiere ampliar la tabla de marcadores; una subcadena
   omitida califica silenciosamente una negativa como una respuesta.
3. La señal de la puerta de evaluación es, estructuralmente, una coincidencia de
   subcadenas n-de-N sobre prosa que el modelo puede parafrasear legítimamente.
   Dos negativas semánticamente idénticas pueden obtener una calificación de 1.0 y
   0.0 según la elección de palabras.

La mejora hacia un dominio de agente estructurado necesitaba que el contrato fuera
robusto antes de apilar encima la recuperación con RAG y un evaluador centrado
solo en la recuperación. ¿Cómo hacemos que el discriminador sea estructural en
lugar de basado en prosa, manteniendo sin cambios el renderizado del texto del
asistente existente en la SPA?

## Factores de decisión

- **Corrección estructural**: el discriminador no debe depender de la elección de
  palabras de la prosa ni del idioma.
- **Portabilidad entre proveedores**: el contrato debe funcionar en Groq, OpenAI,
  Cerebras, Anthropic y el stub en proceso. La cobertura del modo JSON varía
  marcadamente entre proveedores.
- **Compatibilidad hacia atrás**: las pruebas existentes, la puerta de evaluación y
  la SPA deben seguir funcionando durante la migración. Sin una reescritura de "big
  bang".
- **Señal de evaluación**: el tipo estructurado se mapea directamente a las
  expectativas must_refuse / must_escalate que los casos de evaluación ya
  llevan, de modo que el evaluador se convierte en una comprobación de
  discriminador de una sola línea.
- **Presupuesto de spans**: los atributos de traza para la respuesta estructurada
  deben caber en el presupuesto de observabilidad existente (política de spans con
  solo metadatos de [ADR-0006](./adr-0006-observability.md)).

## Opciones consideradas

- **Opción A**: Mantener la prosa + ampliar las tablas de marcadores de subcadenas
  por idioma + añadir capas de expresiones regulares por idioma.
- **Opción B**: Migrar cada adaptador al uso de herramientas nativo con una
  única herramienta `agent_reply` cuyo esquema imponga la envoltura.
- **Opción C**: Añadir un esquema de Pydantic `AgentReply`, solicitar el modo JSON
  por proveedor (cada adaptador degrada con cortesía a la mejor superficie de
  JSON disponible), validar en la capa del agente, consumir el
  discriminador en la capa del evaluador y dejar obsoleta la coincidencia de
  subcadenas en tres etapas.

## Resultado de la decisión

Opción elegida: **Opción C** — esquema de Pydantic + modo JSON por
proveedor + obsolescencia escalonada de la capa de subcadenas.

La única razón determinante es la asimetría entre proveedores del
soporte de uso de herramientas: Anthropic ofrece uso de herramientas de forma
nativa, los proveedores compatibles con OpenAI (Groq, OpenAI, Cerebras) ofrecen
`response_format={"type":"json_schema",...}` directamente, y la ruta del
cliente stub no necesita ninguno de los dos. La opción B forzaría a los
adaptadores compatibles con OpenAI a tomar un desvío innecesario hacia el uso de
herramientas solo para igualar a Anthropic. La opción C deja que cada adaptador
use su idioma nativo y la capa del agente valida una forma agnóstica del
proveedor a la salida.

La respuesta estructurada es una pequeña envoltura validada con cuatro campos:

- `kind` — uno de `refusal`, `answer` o `escalation` (el
  discriminador que leen los evaluadores).
- `text` — el mensaje del asistente renderizado en el idioma (no vacío).
- `citations` — la lista de identificadores de fragmentos de la KB que respaldan la respuesta.
- `rationale` — una breve explicación interna (con longitud acotada).

La migración se publicó en tres etapas:

1. **Aditiva**: incorporar el esquema; ampliar la solicitud de completado y
   los tipos de resultado con campos opcionales de modo JSON; encauzar la carga
   útil del modo JSON a través del transporte compartido; fijar la respuesta
   estructurada en el estado del agente desde el nodo de generación de respuesta y
   los ayudantes de emisión de negativa / respuesta / escalación; hacer que los
   evaluadores prefieran el `kind` estructurado cuando esté presente y recurran a
   los marcadores de subcadenas cuando esté ausente.
2. **Migración de pruebas**: reescribir las aserciones de negativa / escalación /
   evaluador para que lean el nuevo discriminador `kind`.
3. **Eliminación atómica**: eliminar las tablas de marcadores de subcadenas y los
   ayudantes de coincidencia de prosa; eliminar las ramas de respaldo; migrar el
   sitio de llamada posterior a las barreras de seguridad para que consuma la
   respuesta estructurada cuando esté disponible.

La postura del modo JSON por proveedor:

- **Groq / OpenAI / Cerebras**: nativo
  `response_format={"type":"json_schema","json_schema":{...,"strict":true}}`
  mediante el constructor de cargas útiles compartido compatible con OpenAI.
- **Anthropic**: sin bandera nativa; inyectar un preámbulo de modo JSON en el
  mensaje del sistema y analizar la respuesta con tolerancia. La migración al uso
  de herramientas se difiere (las cascadas hacia Anthropic son poco frecuentes; el
  enfoque del preámbulo mantiene ese proveedor utilizable sin una reescritura más
  profunda del adaptador).
- **Stub**: emite una envoltura de respuesta predefinida reutilizando las
  heurísticas existentes que tienen en cuenta el idioma.
- **Respaldo**: relevo transparente; el campo de solicitud de modo JSON
  sobrevive sin cambios a lo largo de primario → respaldo → último recurso.

### Confirmación

- Una prueba dedicada fija la forma del esquema y el viaje de ida y vuelta.
- Cada prueba de adaptador comprueba la forma de la carga útil de modo JSON en la solicitud
  y el campo estructurado en la respuesta.
- Cada prueba de integración del grafo comprueba que el `kind` de la respuesta
  estructurada coincide con la ruta esperada.
- Una auditoría posterior a la migración confirma cero referencias a las antiguas
  tablas de marcadores de subcadenas dentro de la capa de evaluación.

## Consecuencias

### Positivas

- El discriminador es invariante al idioma y sobrevive a cualquier paráfrasis
  que emita el modelo.
- Añadir una nueva subplantilla de negativa es una rama de tipo de respuesta de una
  sola línea, no una ampliación de la tabla de marcadores.
- Los evaluadores se vuelven triviales: una única comprobación de igualdad del
  discriminador por caso.
- La envoltura estructurada es el portador natural para la posterior
  mejora de spans de citación y el evaluador de recuperación-recall.
- La señal de evaluación se vuelve estructural; las paráfrasis con la misma
  semántica obtienen una calificación idéntica.

### Negativas

- Las respuestas de Anthropic bajo el modo JSON pagan ~50 tokens de entrada por
  turno por el preámbulo del esquema. Las cascadas hacia Anthropic son poco
  frecuentes en una configuración con Groq como primario, de modo que el costo
  acumulado es pequeño, pero distinto de cero.
- Se añade una nueva superficie de abstracción (la envoltura de respuesta y su
  enumeración de tipos) a la API pública del paquete del agente.
- La capa de transporte gana dos campos de solicitud opcionales y un
  campo de resultado opcional; los adaptadores de proveedor deben respetarlos o
  documentar por qué no lo hacen.

### Neutrales

- El contrato de renderizado de la SPA no cambia: el contenido del último mensaje
  sigue recibiendo el `text` renderizado en el idioma. La envoltura estructurada
  es observable en el estado del agente y en los spans de traza, pero no
  en el flujo SSE (la ampliación de los tipos de evento de SSE se manejó por
  separado en el streaming de tokens).
- La temperatura para las llamadas en modo JSON se reduce a 0.0; las rutas de
  forma libre mantienen el valor por defecto existente de 0.2.

## Pros y contras de las opciones

### Opción A: ampliar las tablas de marcadores por idioma

- Buena, porque no requiere cambios en los adaptadores.
- Mala, porque las tablas de marcadores crecen con cada nuevo idioma y
  cada nueva subplantilla; la deriva entre los marcadores de la capa de evaluación y
  la expresión regular de la capa de barreras de seguridad empeora.
- Mala, porque la señal de evaluación sigue acoplada a la prosa; las paráfrasis
  aún se califican mal.

### Opción B: uso de herramientas nativo en todos los proveedores

- Buena, porque el esquema se impone en el límite del proveedor.
- Mala, porque Groq / OpenAI / Cerebras adquieren un desvío de uso de herramientas que
  no necesitan (ya ofrecen json_schema directamente).
- Mala, porque la tasa de activación del uso de herramientas (el modelo decidiendo
  cuándo llamar a la herramienta) es un modo de fallo adicional que no existe con un
  `response_format` forzado.

### Opción C (elegida): esquema de Pydantic + modo JSON por proveedor + obsolescencia escalonada

- Buena, porque cada adaptador usa su idioma nativo.
- Buena, porque la migración es escalonada y reversible en cada
  punto de control.
- Buena, porque la envoltura estructurada es el portador natural para
  los posteriores spans de citación y el evaluador centrado solo en la recuperación.
- Mala, porque la falta de una bandera nativa en Anthropic obliga a una
  postura de preámbulo de prompt + análisis tolerante que otros adaptadores no
  necesitan.

## Más información

- [ADR-0001](./adr-0001-orchestration.md) — estado del agente y LangGraph
- [ADR-0002](./adr-0002-llm-vendor-abstraction.md) — Protocolo del cliente
  de LLM
- [ADR-0003](./adr-0003-eval-harness.md) — Protocolo del evaluador
- [ADR-0005](./adr-0005-guardrails.md) — contrato de negativa y escalación
- [ADR-0006](./adr-0006-observability.md) — política de spans con solo
  metadatos
- MADR 4.0.0: <https://adr.github.io/madr/>
