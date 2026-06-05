---
title: "ADR-0001: Framework de orquestación"
description: Por qué el flujo de control del agente se construye sobre LangGraph 1.x como un grafo de estado explícito, inspeccionable y durable.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0001: Framework de orquestación (LangGraph 1.0)

- Estado: Accepted
- Fecha: 2026-03-18
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

La implementación de referencia es un agente conversacional multi-turno de
adherencia a la medicación. El agente tiene obligaciones explícitas de flujo
de control: clasificar el alcance, recuperar de una pequeña base de
conocimiento, redactar una respuesta, ejecutar una verificación de seguridad,
decidir si escalar y solicitar una pausa con humano en el bucle en los turnos
de alto riesgo. El estado de la conversación debe sobrevivir a un reinicio del
proceso para que un turno en pausa pueda reanudarse después de que un clínico
(o, en la demo, un revisor) reconozca el escalamiento.

El arnés de evaluación, a su vez, tiene que poder conducir ese agente de
extremo a extremo de forma determinista, inspeccionar las trazas de los nodos
intermedios y reproducir conversaciones de referencia. Por lo tanto, el
framework de orquestación elegido tiene que exponer el agente como un grafo de
nodos y aristas explícitos (no como un "bucle de agente" de caja negra),
proporcionar estado durable y soportar una primitiva HITL de tipo
`interrupt`.

¿Cómo estructuramos el flujo de control del agente para que sea auditable en
cada nodo, pueda pausarse y reanudarse de forma durable y sea portable entre
proveedores de LLM y despliegues autoalojados?

## Impulsores de la decisión

- Máquina de estados explícita: la arquitectura es "agente como grafo
  inspeccionable", no "agente como bucle while opaco"
- Persistencia durable: el estado de la conversación debe sobrevivir a un
  reinicio del proceso (listo para Postgres) para que el arnés de evaluación
  y la demo puedan reproducir turnos
- Primitiva de humano en el bucle de primera clase (`interrupt()`) para la
  ruta de señal de alerta / alto riesgo
- Neutral respecto al proveedor: el framework no debe forzar un proveedor de
  LLM ni un runtime alojado específico
- Señal de madurez: una versión mayor estable (1.x), no una biblioteca 0.x,
  porque esta es una implementación de referencia pública
- Licencia: lo bastante permisiva como para distribuirse dentro de una imagen
  Docker distribuida bajo Apache 2.0

## Opciones consideradas

- **LangGraph 1.0**: `StateGraph` explícito, checkpointers durables
  incluyendo Postgres, HITL `interrupt()` nativo, neutral respecto al
  proveedor, alcanzó GA 1.0 el 2025-10-22
- **CrewAI**: abstracción de "tripulación de agentes" basada en roles,
  procesos secuenciales o jerárquicos, topología de grafo menos granular
- **Microsoft Agent Framework**: la unificación de 2025 de Microsoft de
  Semantic Kernel y AutoGen, fuerte instrumental de Azure, inclinación hacia
  un proveedor
- **Claude Agent SDK**: el SDK de agentes propio de Anthropic, ergonómico
  pero que ata el bucle de control del agente a una sola familia de modelos
- **Pydantic AI**: framework de agentes tipado, ergonómico y nativo de Python
  construido sobre esquemas de Pydantic, más ligero en semántica explícita de
  grafos
- **AutoGen v0.2 / Swarm**: patrones anteriores de conversación multi-agente,
  reemplazados / descontinuados para 2026

## Resultado de la decisión

Opción elegida: **LangGraph 1.0**. Es la única opción del conjunto que
combina una topología `StateGraph` explícita e inspeccionable, una historia de
checkpointer durable que incluye un saver de Postgres, una primitiva
`interrupt()` nativa para HITL y una línea de versión mayor 1.x estable (GA el
2025-10-22, ver el changelog de LangChain). También es el framework que se
mapea con mayor limpieza a cómo el arnés de evaluación quiere conducir el
agente: cargar un checkpoint, reproducir turnos desde un fixture JSONL y
afirmar sobre el estado a nivel de nodo. El modelo mental "el agente es un
grafo de nodos nombrados" es exactamente la historia de arquitectura que
cuenta este proyecto.

### Confirmación

- El grafo se declara una sola vez como un `StateGraph` con nodos nombrados y
  aristas explícitas; `mypy --strict` verifica los tipos del esquema de estado
- El arnés de evaluación conduce el agente a través de la API pública del
  grafo, no llamando a helpers internos, de modo que un cambio a otro
  orquestador se manifestaría en la suite de pruebas del runner
- El grafo compilado acepta un checkpointer inyectado; la build de la demo usa
  un saver en memoria, y una fábrica de saver de Postgres es activable por
  variable de entorno y está cubierta por una prueba de integración

## Consecuencias

### Positivas

- El flujo de control del agente está documentado por el grafo mismo; el
  diagrama de máquina de estados C4 y el código se mantienen en sincronía
  porque ambos derivan de la misma definición `StateGraph`
- La persistencia durable mediante un saver de Postgres es un cambio de una
  línea desde el checkpointer en memoria usado en las pruebas, lo que hace
  defendible la postura de "persistencia lista para producción"
- `interrupt()` le da a la ruta de escalamiento HITL una primitiva sobre la
  que las pruebas unitarias de HITL pueden afirmar directamente (el grafo
  realmente se pausó, no "el agente decidió detenerse"); el runner de
  evaluación corre con HITL desactivado y nunca ejercita la pausa
- LangGraph es neutral respecto al proveedor: los nodos llaman al Protocol
  `LLMClient` del proyecto, no a un objeto de proveedor específico de
  LangChain, de modo que se preserva la abstracción de
  [ADR-0002](./adr-0002-llm-vendor-abstraction.md)
- El estado GA 1.0 (2025-10-22) indica que el framework ya pasó la ventana de
  agitación 0.x típica de las bibliotecas de agentes

### Negativas

- LangGraph hereda parte de la superficie del ecosistema más amplio de
  LangChain (importaciones, dependencias transitivas); mantenemos pequeña la
  superficie fijando versiones e importando solo `langgraph`, no el
  mega-paquete `langchain` completo
- El framework prescribe un idioma de grafo de estado; un contribuidor que
  prefiera un bucle de agente en formato libre tiene que aprenderlo
- Una migración significativa a otro orquestador más adelante tocaría cada
  nodo del grafo, aunque las abstracciones de LLM y RAG sobrevivirían sin
  cambios

### Neutrales

- El proyecto gana una dependencia `langgraph` en el lockfile
- El arnés de evaluación tiene que saber cómo cargar un checkpoint de
  `StateGraph`; esto es un adaptador pequeño, no un cambio estructural
- LangChain sigue siendo una superficie de dependencia indirecta; esto está
  documentado explícitamente y la versión menor está fijada

## Pros y contras de las opciones

### LangGraph 1.0

- Buena, porque `StateGraph` hace la topología explícita e
  inspeccionable
- Buena, porque un saver de Postgres da estado de conversación durable de
  forma gratuita
- Buena, porque `interrupt()` es una primitiva HITL de primera clase
- Buena, porque la GA 1.0 en octubre de 2025 estabiliza la superficie de la API
- Mala, porque la proximidad al ecosistema de LangChain añade superficie de
  dependencia
- Mala, porque los contribuidores deben aprender el idioma de grafo de estado

### CrewAI

- Buena, porque la abstracción basada en roles se lee bien en texto de
  marketing
- Mala, porque las tripulaciones son más gruesas que la topología por nodo que
  quiere el arnés de evaluación
- Mala, porque la historia de HITL es menos de primera clase que el
  `interrupt()` de LangGraph

### Microsoft Agent Framework

- Buena, porque la unificación de Semantic Kernel + AutoGen está bien diseñada
- Buena, porque las integraciones de Azure son de primera clase
- Mala, porque el centro de gravedad del framework es el stack de Azure /
  Microsoft, lo que entra en conflicto con la postura neutral respecto al
  proveedor de este proyecto

### Claude Agent SDK

- Buena, porque la ergonomía es excelente
- Mala, porque ata el bucle de control del agente a los modelos de Anthropic y
  rompe la evidencia multiproveedor que el proyecto quiere mostrar

### Pydantic AI

- Buena, porque la API tipada y centrada en Pydantic es agradable de escribir
- Mala, porque la postura de máquina de estados explícita es más débil; el
  framework se apoya en el agente-como-función-tipada más que en el
  agente-como-grafo
- Conservada como candidata alterna para un escenario de migración futuro

### AutoGen v0.2 / Swarm

- Mala, porque ambas líneas están descontinuadas para 2026 y han sido
  reemplazadas por Microsoft Agent Framework (AutoGen) y el campo más amplio de
  frameworks de agentes (Swarm)

## Más información

- Anuncio de GA de LangGraph 1.0 (2025-10-22):
  <https://changelog.langchain.com/announcements/langgraph-1-0-is-now-generally-available>
- Documentación de LangGraph: <https://langchain-ai.github.io/langgraph/>
- Guía de `interrupt` / HITL de LangGraph:
  <https://langchain-ai.github.io/langgraph/concepts/human_in_the_loop/>
- Checkpointers durables de LangGraph:
  <https://langchain-ai.github.io/langgraph/concepts/persistence/>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Grafo y checkpointer tal como se construyó

**Topología del grafo tal como se construyó.** El grafo distribuido tiene seis
nodos: `intake`, `guardrail_pre`, un `retrieve_context` condicional,
`generate_response`, `guardrail_post` y `closing`. Una arista condicional
omite `retrieve_context` cuando ya está presente una falla de pre-guardrail
(un rechazo o un escalamiento agudo), de modo que un turno cortocircuitado no
paga por la recuperación.

**HITL con `interrupt()`.** Cuando HITL está habilitado (una bandera de
entorno), se inserta un séptimo nodo, `review_response`, entre
`generate_response` y `guardrail_post`. Llama a `interrupt()` de LangGraph
para pausar un borrador de alto riesgo pero no agudo - una citación no
verificada, una citación faltante o desviación de persona, clasificado por el
módulo de revisión - de modo que un revisor humano pueda aprobar, editar o
rechazar el borrador. Un endpoint de reanudación dedicado reanuda el hilo en
pausa. El cuerpo del nodo previo a `interrupt()` solo lee estado, por lo que es
seguro re-ejecutarlo cuando `interrupt()` vuelve a ejecutar su nodo anfitrión
al reanudar. HITL está desactivado por defecto: el grafo estándar de seis nodos
y el arnés de evaluación corren sin comportamiento de pausa, y una ruta basada
en `interrupt()` sigue siendo incompatible con el arnés de evaluación de un
solo paso y sin claves, razón por la cual es opcional. Las señales de alerta
agudas NO se enrutan a través de `interrupt()`: cortocircuitan aguas arriba en
`guardrail_pre` hacia una plantilla de emergencia (ver
[ADR-0005](./adr-0005-guardrails.md)) y `review_response` nunca las pausa.

**Fábrica de checkpointer.** La fábrica de checkpointer devuelve un
`MemorySaver` en memoria por defecto y un `AsyncPostgresSaver` cuando se
establece un DSN de Postgres; ambas rutas reciben un serializador endurecido
que lleva una lista de permitidos de los tipos Pydantic personalizados que el
grafo registra en checkpoint (esto también mitiga
CVE-2026-28277 / GHSA-g48c-2wqr-h844). El Space de la demo usa la ruta en
memoria, por lo que un hilo HITL en pausa no sobrevive a un reinicio del Space,
un arranque en frío ni un segundo worker - una limitación documentada del
nivel gratuito de un solo worker. Postgres es la respuesta durable y se
selecciona automáticamente al establecer el DSN.

**Diagramas de estado.** Los diagramas de estado estilo C4 están escritos a
mano en Mermaid, no generados a partir del `StateGraph` compilado. Se mantienen
en sincronía con el código mediante revisión; la lista de nodos en línea es la
descripción más cercana al código y la autoritativa.

**Versión de LangGraph.** La fijación es `langgraph>=1.0.10`, resuelta a la
línea 1.x actual. El piso `>=1.0.10` asegura que una instalación nueva no pueda
resolver una versión previa al parche vulnerable a CVE-2026-28277.
