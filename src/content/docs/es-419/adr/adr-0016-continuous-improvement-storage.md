---
title: "ADR-0016: Almacenamiento de la Capa de Mejora Continua (Supabase)"
description: Por qué los registros de interacciones y las sugerencias de mejora curadas por el operador viven en el mismo proyecto de Supabase que los datos operativos de la demo, con PII redactada al ingreso.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0016: Almacenamiento de la Capa de Mejora Continua (Supabase)

- Estado: Aceptado
- Fecha: 2026-05-24
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

La Capa de Mejora Continua requiere almacenamiento persistente para dos
asuntos:

1. **Registros de interacciones**: cada turno de la demo, anonimizado al
   ingreso mediante redacción de PII, con hashes de deduplicación, banderas de
   cumplimiento, latencia, costo y estado de citación. Las interacciones
   pendientes se agrupan por similitud semántica y se analizan mediante un
   script por lotes para producir sugerencias de mejora. Retención: 90 días en
   bruto, métricas agregadas 1 año.

2. **Sugerencias de mejora**: propuestas curadas por el operador (nuevas
   tarjetas KB, refinamientos de tarjetas, casos de evaluación, ajustes de
   prompts, refinamientos de barreras de seguridad, brechas de corpus) con un
   flujo de trabajo de revisión humana (pendiente -> aprobada -> integrada).
   Retención: indefinida para el rastro de auditoría.

ADR-0011 establece la capa gratuita de Supabase como el backend de Postgres
administrado para los datos operativos de la demo (claves, sesiones,
consentimientos). Las tablas de interacciones y sugerencias son parte del
mismo dominio de datos operativos y se ubican naturalmente junto a las tablas
de claves de demo y sesiones ya provisionadas allí.

La capa de mejora continua tiene requisitos específicos:

- PII redactada al ingreso (nunca se almacena texto en bruto)
- Curada por el operador (nunca se aplica de forma automática)
- Procesamiento por lotes (activado por el operador, no por cron)
- Rastro de auditoría (quién aprobó qué, cuándo, qué commit)
- Deduplicación anonimizada (hash sha256 de la entrada redactada)

¿Dónde deberían vivir los registros de interacciones y las sugerencias de
mejora?

## Factores de la decisión

- **Colocación junto a los datos operativos de la demo**: el registrador de
  interacciones escribe después de cada turno; las tablas de claves de demo y
  sesiones ya viven en Supabase (ADR-0011). Las consultas entre tablas (p.
  ej., "mostrar todas las interacciones de esta clave de demo") son naturales
  en una única base de datos.
- **Redacción de PII al ingreso**: el backend de almacenamiento nunca debe
  recibir PII en bruto. El módulo de redacción se ejecuta antes de la
  inserción. El backend es un receptor pasivo de datos ya anonimizados.
- **Flujo de trabajo curado por el operador**: la tabla de sugerencias de
  mejora aplica una restricción de verificación de estado (pendiente de
  revisión -> aprobada -> rechazada -> integrada). Solo el operador transita
  el estado. El script por lotes propone, nunca aplica.
- **Hosting de $0/mes**: consistente con ADR-0007 y ADR-0011.
- **Panel consultable**: el operador revisa las sugerencias pendientes en el
  panel de Supabase, la misma interfaz usada para la gestión de claves de
  demo.
- **Anclas regulatorias**: GDPR Art. 25 (Privacidad por Diseño), HIPAA Safe
  Harbor (18 identificadores), Chile Ley 19.628 + Reforma 21.719 (anonimizado
  con un propósito de mejora). La elección de almacenamiento debe soportar
  estos requisitos.

## Opciones consideradas

- **Supabase (mismo proyecto que ADR-0011)** (elegida): las tablas de
  interacciones y de sugerencias de mejora ubicadas junto a las claves de
  demo, las sesiones de demo, etc. en el mismo Postgres de capa gratuita.
- **SQLite local en el almacenamiento persistente de Hugging Face**: sin
  vendor, pero el almacenamiento persistente no está garantizado para los
  Spaces de Docker SDK, sin panel, sin consultas entre tablas con las claves
  de demo.
- **Neon (proyecto separado)**: fragmentaría los datos operativos a través de
  dos instancias de Postgres administrado sin beneficio.
- **Firestore (NoSQL)**: ajuste pobre para el esquema relacional
  (restricciones de verificación de estado, clave foránea a las claves de
  demo, JSONB para las banderas de cumplimiento).
- **Archivos CSV/JSONL en el almacenamiento persistente de Hugging Face**:
  solo de adición, sin capacidad de consulta, sin panel, sin transiciones de
  estado para las sugerencias.

## Resultado de la decisión

Opción elegida: **capa gratuita de Supabase, mismo proyecto establecido en
ADR-0011**, con las tablas de interacciones y de sugerencias de mejora
desplegadas junto a las tablas operativas de la demo.

El registrador de interacciones se engancha al grafo de ejecución del agente
después del nodo de emisión de auditoría. En cada turno:

1. Recibe el contexto completo del turno (entrada, respuesta, citaciones,
   banderas de cumplimiento, latencia, costo).
2. Aplica redacción de PII tanto sobre la entrada del usuario COMO sobre el
   texto de respuesta (defensa en profundidad).
3. Computa un hash sha256 de la entrada redactada para la deduplicación.
4. Inserta en la tabla de interacciones (asíncrono, no bloqueante).
5. Si Supabase es inalcanzable, registra localmente y advierte en la
   interfaz; nunca bloquea el flujo del agente.

El script de mejora por lotes se ejecuta en la máquina local del operador (no
en el Space). Lee las interacciones pendientes, las agrupa por similitud
semántica, genera sugerencias mediante análisis con LLM y las persiste en la
tabla de sugerencias de mejora con estado "pendiente de revisión". El operador
revisa en el panel de Supabase y aprueba/rechaza manualmente.

La restricción de verificación de estado de las sugerencias de mejora aplica:
pendiente de revisión | aprobada | rechazada | integrada. Solo el operador
puede transitar el estado. El script por lotes solo inserta en "pendiente de
revisión". No existe ningún cambio de estado automatizado.

### Confirmación

- La tabla de interacciones tiene columnas con PII redactada, un hash de
  deduplicación y una columna JSONB de banderas de cumplimiento.
- La tabla de sugerencias de mejora tiene una restricción de verificación de
  estado y campos de revisión del operador.
- Una clave foránea vincula cada interacción con su clave de demo (consulta
  entre tablas: "todas las interacciones de esta clave").
- Una clave foránea vincula el uso de turnos de demo con su interacción
  (seguimiento de costos vinculado al registro de interacciones).
- El script por lotes se ejecuta localmente y se conecta a Supabase mediante
  una clave de rol de servicio desde una variable de entorno.
- Si el registro de mejora está deshabilitado para una clave, el registrador
  omite esa clave por completo.

## Consecuencias

### Positivas

- Todos los datos operativos (claves, sesiones, interacciones, sugerencias)
  ubicados juntos en una única base de datos. Las consultas entre tablas son
  naturales.
- El operador usa un único panel para todos los flujos de trabajo de revisión
  (gestión de claves + sugerencias de mejora).
- La redacción de PII al ingreso significa que la base de datos nunca recibe
  PII en bruto. Verificable: una consulta de cualquier marcador no redactado en
  la columna de entrada anonimizada debe devolver cero filas.
- La capa gratuita (500 MB) es suficiente para la demo de bajo volumen (50-150
  revisores x 5-10 turnos = ~1000 filas, muy por debajo del tope).
- pgvector está disponible para la agrupación semántica de interacciones en el
  script por lotes (reutilizando el mismo modelo de incrustación que RAG).

### Negativas

- Agrega dos tablas más a la superficie de migración de Supabase.
- El script por lotes requiere una clave de rol de servicio con acceso de
  escritura tanto a la tabla de interacciones como a la de sugerencias de
  mejora.
- Si Supabase está caído, el registro de interacciones se degrada con
  elegancia (registro local + advertencia) pero los datos se pierden para esos
  turnos.

### Neutrales

- La tabla de interacciones tiene una política de retención de 90 días aplicada
  por el operador (manual o mediante un script programado). La capa gratuita de
  Supabase no aplica la retención de forma automática.
- Las sugerencias de mejora se retienen indefinidamente como un rastro de
  auditoría.
- El script por lotes es activado por el operador, nunca automatizado. Esto es
  por diseño para la IA regulada: el aprendizaje en línea amplifica el sesgo
  sin gobernanza.

## Ventajas y desventajas de las opciones

### Supabase (mismo proyecto que ADR-0011)

- Buena, porque la colocación habilita consultas entre tablas (claves +
  sesiones + interacciones + sugerencias)
- Buena, porque un único panel sirve a todos los flujos de trabajo del
  operador
- Buena, porque la redacción de PII al ingreso es verificable en un único
  lugar
- Buena, porque pgvector está disponible para la agrupación semántica
- Buena, porque $0/mes, consistente con ADR-0007 y ADR-0011
- Mala, porque agrega superficie de migración para dos tablas más
- Mala, porque el script por lotes necesita una clave de rol de servicio

### SQLite local en el almacenamiento persistente de Hugging Face

- Buena, porque es sin vendor
- Mala, porque el almacenamiento persistente no está garantizado para Docker
  SDK
- Mala, porque no hay panel para la revisión del operador
- Mala, porque no hay consultas entre tablas con las claves de demo
- Mala, porque hay riesgos de escritura concurrente

### Neon (proyecto separado)

- Buena, porque es Postgres administrado
- Mala, porque fragmenta los datos operativos a través de dos instancias
- Mala, porque no hay beneficio sobre la colocación

### Firestore (NoSQL)

- Buena, porque está administrado por Google
- Mala, porque es un ajuste pobre para el esquema relacional y las transiciones
  de estado

### CSV/JSONL en el almacenamiento persistente de Hugging Face

- Buena, porque es el almacenamiento de solo adición más simple posible
- Mala, porque no hay capacidad de consulta
- Mala, porque no hay transiciones de estado para las sugerencias
- Mala, porque no hay panel

## Más información

- Capa gratuita de Supabase: <https://supabase.com/pricing>
- ADR-0011 (capa de datos, Supabase para los datos operativos de la demo): [ADR-0011](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0011-data-layer-supabase/)
- ADR-0007 (objetivo de despliegue): [ADR-0007](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/)
- GDPR Art. 25 (Protección de Datos por Diseño y por Defecto): <https://gdpr-info.eu/art-25-gdpr/>
- Desidentificación HIPAA Safe Harbor: <https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html>
- Chile Ley 19.628 + Reforma 21.719: <https://www.bcn.cl/leychile/navegar?idNorma=4125>
- MADR 4.0.0: <https://adr.github.io/madr/>
