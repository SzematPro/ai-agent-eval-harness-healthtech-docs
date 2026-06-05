---
title: "ADR-0011: Capa de datos (capa gratuita de Supabase)"
description: Por qué Postgres administrado en la capa gratuita de Supabase respalda los datos operativos de la demo, mientras Chroma sigue siendo el almacén vectorial de RAG, con hosting a $0/mes.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0011: Capa de datos -- capa gratuita de Supabase para los datos operativos de la demo

- Estado: Aceptado
- Fecha: 2026-05-24
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

Varias características de la demo introducen datos operativos que no encajan
con la postura en memoria de la demo actual:

- **Control de acceso por clave de demo**: claves configuradas por fila con
  TTL, topes de presupuesto, banderas de características, vinculación
  anonimizada de huella, limitación de tasa, seguimiento de costos. Estos
  datos deben persistir entre reinicios del Space y ser consultables por el
  operador.
- **Registro de interacciones**: registros de turnos anonimizados para la
  capa de mejora continua, con hashes de deduplicación y banderas de
  cumplimiento. Deben persistir durante una retención de 90 días y ser
  consultables por el script de mejora por lotes.
- **Métricas de solicitud de autoservicio, consentimiento y sesión**:
  solicitudes de clave, registros de consentimiento, seguimiento de sesiones.
  Deben persistir entre reinicios del Space y sobrevivir a los arranques en
  frío.

ADR-0007 fija el despliegue a la capa gratuita CPU Basic de Hugging Face
Spaces (único worker de uvicorn, valores por defecto en memoria, hosting a
$0/mes). ADR-0004 fija Chroma embebido para la recuperación de RAG. ADR-0001
ya provisiona una fábrica de checkpointer de Postgres para el estado durable
de las conversaciones.

Las nuevas tablas operativas (claves de demo, uso de turnos de demo,
interacciones, sugerencias de mejora, solicitudes de clave de demo,
consentimientos de clave de demo, sesiones de demo) necesitan un almacén
relacional que persista entre reinicios del Space, sea consultable tanto por
el backend de la demo como por el operador, y se mantenga a $0/mes de
hosting.

¿Cómo agregamos Postgres administrado para los datos operativos de la demo
sin violar la restricción de hosting de $0/mes y sin desplazar a Chroma como
el almacén vectorial de RAG?

## Factores de la decisión

- **Costo de hosting de $0/mes**: el operador no paga nada por
  infraestructura en estado estable (ADR-0007). Los presupuestos de API por
  clave para los revisores de la demo son costos de uso financiados por el
  operador, no costos de hosting.
- **Persistencia entre reinicios del Space**: el estado en memoria se pierde
  en el arranque en frío (suspensión por inactividad de 48 horas). Las claves
  de demo, los consentimientos y las sesiones deben sobrevivir.
- **Visibilidad del panel del operador**: el operador necesita una vista
  consultable de claves, solicitudes, sesiones e interacciones para revisión
  manual y decisiones de otorgamiento/revocación.
- **Ajuste de esquema relacional**: las siete tablas tienen claves foráneas,
  índices, restricciones de verificación y columnas JSONB. Un almacén
  relacional es el ajuste natural.
- **Superficie operativa nueva mínima**: una cadena de conexión como secreto
  del Space, sin nueva infraestructura que administrar.

## Opciones consideradas

- **Capa gratuita de Supabase (Postgres)** (elegida): 500 MB de Postgres
  administrado, pgvector disponible, auth opcional, panel incluido, seguridad
  a nivel de fila, la capa gratuita es estratégica (no promocional).
- **SQLite en el almacenamiento persistente de Hugging Face**: sin vendor,
  pero el almacenamiento persistente no está garantizado en los Spaces de
  Docker SDK, el acceso concurrente arriesga corrupción, y no hay panel para
  la revisión del operador.
- **Capa gratuita de Neon**: Postgres administrado similar, pero panel más
  débil y menos reconocimiento de marca para revisores empresariales.
- **Firestore (NoSQL)**: el modelo de documentos es un ajuste pobre para el
  esquema relacional (claves foráneas, restricciones de verificación,
  consultas JSONB).
- **Capa gratuita de PlanetScale**: basado en MySQL, retiró su capa gratuita
  en abril de 2024; ya no es $0/mes en adelante.
- **Turso (libSQL)**: base de datos de borde compatible con SQLite; agrega
  complejidad operativa para una demo de bajo volumen.

## Resultado de la decisión

Opción elegida: **la capa gratuita de Supabase como el backend de Postgres
administrado para los datos operativos de la demo**. Un proyecto de Supabase
aloja las siete tablas. La cadena de conexión se configura como un secreto
del Space (una URL de Supabase más una clave de servicio, o una única URL de
base de datos). El backend de la demo se conecta al arranque; si la conexión
falla, el agente continúa con un cumplimiento degradado de claves de demo y
registro de interacciones (modo de falla: registrar localmente, advertir en
la interfaz, no bloquear el flujo del agente).

La capa de RAG sigue siendo Chroma embebido (ADR-0004, sin cambios). Supabase
es para datos operativos, no para recuperación. Esta distinción es explícita:
Chroma es dueño del índice vectorial sobre las tarjetas de la base de
conocimiento; Supabase es dueño de las tablas relacionales para control de
acceso, consentimiento, sesiones y mejora.

El costo de hosting se mantiene en $0/mes: capa gratuita de Hugging Face
Spaces (ADR-0007) + capa gratuita de Supabase. Los presupuestos de API por
clave (Anthropic, ElevenLabs) son costos de uso financiados por el operador,
no costos de hosting.

### Confirmación

- Las migraciones de esquema despliegan las siete tablas con claves foráneas,
  índices y restricciones de verificación.
- El backend de la demo lee los parámetros de conexión a la base de datos al
  arranque y se conecta a Supabase.
- Si la conexión falla, el agente sirve turnos sin cumplimiento de claves de
  demo y registra una advertencia; el flujo del agente nunca se bloquea.
- El panel del operador en Supabase muestra claves, solicitudes, sesiones,
  interacciones y sugerencias en tiempo real.
- La conexión de Postgres para el checkpointer de LangGraph (ver ADR-0001)
  puede apuntar a la misma instancia de Supabase, compartiendo el pool de
  conexiones.

## Consecuencias

### Positivas

- El estado de las claves de demo, los registros de consentimiento y las
  sesiones persisten entre reinicios del Space y arranques en frío.
- El operador obtiene un panel en tiempo real sin construir uno.
- Postgres administrado demuestra un diseño de capa de datos consciente de
  producción.
- La capa gratuita (500 MB) es suficiente para el uso de bajo volumen de la
  demo (50-150 revisores x 5-10 turnos).
- pgvector está disponible para futuras agrupaciones semánticas en la capa de
  mejora.
- Unifica el almacenamiento de los datos operativos de la demo bajo un único
  backend, evitando el estado fragmentado.

### Negativas

- Agrega una dependencia en tiempo de ejecución de un servicio administrado
  externo. Si Supabase está caído, el cumplimiento de claves de demo se
  degrada (el agente todavía sirve turnos, pero sin control de acceso).
- La capa gratuita de Supabase tiene un límite de 500 MB; suficiente para la
  escala de la demo pero no para tráfico de producción sostenido.
- La latencia de conexión desde el Space a Supabase agrega unos pocos
  milisegundos por turno para la escritura del registro; aceptable a la escala
  de la demo.
- La clave de rol de servicio de Supabase es una credencial sensible; debe
  almacenarse como un secreto del Space, nunca codificada en el código.

### Neutrales

- Una nueva dependencia de un cliente de Supabase o un driver de Postgres.
- Las migraciones de esquema pasan a formar parte de la lista de verificación
  de despliegue.
- La capa gratuita no incluye recuperación a un punto en el tiempo; la pérdida
  de datos es posible en incidentes del lado de Supabase. Aceptable para los
  datos de la demo.

## Ventajas y desventajas de las opciones

### Capa gratuita de Supabase (Postgres)

- Buena, porque Postgres administrado persiste entre reinicios del Space
- Buena, porque el panel le da al operador visibilidad en tiempo real
- Buena, porque la capa gratuita es estratégica (impulsa la adopción de la
  plataforma), no promocional
- Buena, porque pgvector está disponible para futuras consultas semánticas
- Buena, porque demuestra una capa de datos de Postgres administrado incluso
  en la demo
- Mala, porque agrega una dependencia en tiempo de ejecución de un servicio
  externo
- Mala, porque la capa gratuita tiene un tope de 500 MB

### SQLite en el almacenamiento persistente de Hugging Face

- Buena, porque es una dependencia sin vendor
- Mala, porque el almacenamiento persistente no está garantizado para los
  Spaces de Docker SDK
- Mala, porque las escrituras concurrentes arriesgan corrupción
- Mala, porque no hay panel del operador

### Capa gratuita de Neon

- Buena, porque es una oferta de Postgres administrado similar
- Mala, porque tiene un panel más débil para la revisión del operador
- Mala, porque tiene menos reconocimiento de marca para revisores
  empresariales

### Firestore (NoSQL)

- Buena, porque está administrado por Google, capa gratuita generosa
- Mala, porque el modelo de documentos es un ajuste pobre para el esquema
  relacional
- Mala, porque no hay SQL, no hay claves foráneas, no hay restricciones de
  verificación

### Capa gratuita de PlanetScale

- Mala, porque la capa gratuita se retiró en abril de 2024

### Turso (libSQL)

- Buena, porque es compatible con SQLite con replicación de borde
- Mala, porque agrega complejidad operativa para una demo de bajo volumen

## Más información

- Capa gratuita de Supabase: <https://supabase.com/pricing>
- Panel de Supabase: <https://supabase.com/dashboard>
- ADR-0007 (objetivo de despliegue): [ADR-0007](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/)
- ADR-0004 (stack de RAG, sin cambios): [ADR-0004](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0004-rag-stack/)
- ADR-0001 (orquestación, fábrica de checkpointer de Postgres): [ADR-0001](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0001-orchestration/)
- ADR-0016 (elección de almacenamiento de la Capa de Mejora Continua): [ADR-0016](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0016-continuous-improvement-storage/)
- MADR 4.0.0: <https://adr.github.io/madr/>
