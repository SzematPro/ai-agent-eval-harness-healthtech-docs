---
title: Plan de registro de auditoría
description: Qué registra hoy la implementación de referencia mediante OpenTelemetry, qué no, y qué necesitaría un despliegue regulado para un registro de nivel de auditoría.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Plan de registro de auditoría

> Documenta las capacidades de registro de auditoría de la implementación de referencia
> `ai-agent-eval-harness-healthtech` y los requisitos para un registro de auditoría de nivel de producción.
> Este plan cubre qué se registra hoy, qué no se registra y qué necesitaría un despliegue
> regulado.
>
> Léase junto con el [diseño de observabilidad](../adr/adr-0006-observability.md) y la
> [evaluación de preparación para HIPAA](hipaa-readiness.md).

## Arquitectura de registro

### Infraestructura de registro actual

La implementación de referencia usa OpenTelemetry (OTel) con las convenciones semánticas de OpenInference
como su columna vertebral de observabilidad. Cada operación significativa del pipeline del agente
se envuelve en un span de OTel.

| Componente | Qué se registra | Atributos del span |
|-----------|---------------|-----------------|
| **nodo intake** | Inicio del turno, ID de la conversación, configuración regional | `conversation.id`, `interaction.locale` |
| **nodo guardrail_pre** | Decisiones de las barreras de seguridad por verificación (alcance, PII, escalamiento, extracción) | `guardrail.decision`, `guardrail.category`, `guardrail.reason`, aprobado/reprobado por verificación |
| **nodo retrieve_context** | Consulta de recuperación, IDs de tarjetas recuperadas, puntuaciones de similitud | `retrieval.query_hash`, `retrieval.card_ids`, `retrieval.similarity_scores` |
| **nodo generate_response** | Proveedor de LLM, modelo, uso de tokens, latencia | `llm.provider`, `llm.model`, `llm.tokens_in`, `llm.tokens_out`, `llm.duration_ms` |
| **nodo guardrail_post** | Verificaciones de barreras de seguridad posteriores a la generación (citación, estabilidad de la persona) | `guardrail.citation_check`, `guardrail.persona_stability` |
| **nodo closing** | Finalización del turno, resumen general de las barreras de seguridad | `turn.status`, `turn.duration_ms`, `turn.guardrail_summary` |
| **redacción de PII** | Eventos de redacción, tipos de patrones coincidentes | `pii.redacted`, `pii.pattern_type` |

### Invariante de privacidad

Una restricción estricta que aplica una prueba unitaria dedicada:
**el texto del mensaje del usuario nunca se escribe en ningún span, registro o atributo de traza**. Este
invariante asegura que los datos de observabilidad no puedan usarse para reconstruir las conversaciones de los usuarios.

### Sumideros de observabilidad

| Sumidero | Propósito | Conservación | Acceso |
|------|---------|-----------|--------|
| **Langfuse Cloud Hobby** | Observabilidad de la demo en vivo; 50K observaciones/mes | 30 días | Panel de Langfuse (autenticado) |
| **Phoenix autoalojado** | Observabilidad de las ejecuciones de evaluación; perfil de Docker Compose | Por sesión (se borra al reiniciar) | UI de Phoenix (local) |
| **Formato de cable OTel** | Formato de span portable y neutral respecto del proveedor | N/A (solo formato de cable) | Exportable a cualquier backend compatible con OTel |

## Qué se registra hoy para auditoría

| Evento | Registrado | Detalles |
|-------|--------|---------|
| Inicio/finalización del turno del agente | Sí | ID del turno, duración, orden de ejecución de nodos |
| Decisiones de las barreras de seguridad | Sí | Aprobado/reprobado por verificación, motivo, categoría |
| Resultado de la clasificación de alcance | Sí | Dentro de alcance / fuera de alcance / categoría de rechazo |
| Disparadores de escalamiento | Sí | Categoría aguda coincidente, plantilla de escalamiento utilizada |
| Eventos de rechazo | Sí | Slug de la plantilla de rechazo, categoría, configuración regional |
| Eventos de redacción de PII | Sí | Tipo de patrón coincidente, si ocurrió redacción (sí/no) |
| Invocación del LLM | Sí | Proveedor, modelo, uso de tokens, latencia |
| Resultados de recuperación | Sí | IDs de tarjetas recuperadas, puntuaciones de similitud |
| Verificación de citaciones | Sí | Aprobado/reprobado de la verificación de citación, IDs de tarjetas citadas |
| Contabilidad de costo/latencia | Sí | Conteos de tokens por turno, desglose de latencia |

## Qué NO se registra hoy para auditoría

| Evento | Por qué no | Requisito de producción |
|-------|---------|----------------------|
| Contenido del mensaje del usuario | Invariante de privacidad: el texto del usuario nunca se registra | Producción puede necesitar registrar el contenido del usuario bajo acceso controlado; requiere cifrado, controles de acceso y políticas de conservación |
| Contenido de la respuesta del LLM | El mismo principio de privacidad aplicado a las salidas | Producción puede necesitar registrar las respuestas para aseguramiento de calidad; requiere los mismos controles que el contenido del usuario |
| Identidad / autenticación del usuario | Sin autenticación de usuario en la demo; acceso anónimo | Producción necesitaría registro de identidad de usuario para el control de acceso y la traza de auditoría |
| Ciclo de vida de la sesión | Sin sesiones persistentes en la demo (checkpointer en memoria) | Producción necesitaría registro de inicio/fin de sesión, duración y rotación |
| Cambios de configuración | Sin cambios de configuración en tiempo de ejecución en la demo | Producción necesitaría una traza de auditoría de cambios de configuración con quién/qué/cuándo |
| Acciones administrativas | Sin interfaz de administración en la demo | Producción necesitaría registro de acciones de administración (cambios de modelo, actualizaciones de umbrales, gestión de usuarios) |
| Exportación / acceso a datos | Sin capacidad de exportación de datos | Producción necesitaría registro de eventos de acceso, exportación y compartición de datos |

## Estado actual

La implementación de referencia proporciona registro de nivel de observabilidad, no registro de nivel de auditoría.
La distinción es importante:

- **Registro de observabilidad** (lo que existe): diseñado para depuración, monitoreo de desempeño
  y comprensión durante el desarrollo. Los spans son efímeros, se conservan 30 días (Langfuse) o
  solo por sesión (Phoenix), y no cumplen los requisitos de evidencia de manipulación, conservación o
  control de acceso del registro de auditoría en entornos regulados.

- **Registro de auditoría** (lo que se necesitaría): diseñado para el cumplimiento regulatorio, la reconstrucción de
  incidentes y la defensibilidad legal. Requiere almacenamiento con evidencia de manipulación, conservación
  a largo plazo (6 años para HIPAA), controles de acceso basados en roles e interfaces de consulta para
  auditores.

Los spans de OTel con las convenciones semánticas de OpenInference proporcionan el formato de cable
y la estructura de atributos adecuados para el registro de auditoría. La brecha está en la infraestructura del sumidero: sin
almacenamiento con evidencia de manipulación, sin política de conservación definida, sin controles de acceso y sin interfaz de
consulta más allá de los paneles de observabilidad.

Fortalezas clave del registro actual:

1. **Cobertura integral**: Cada nodo del pipeline del agente emite spans con
   atributos estructurados. Ninguna operación ocurre sin registrarse.
2. **Privacidad por diseño**: El texto del usuario se excluye de los spans por invariante, no por
   convención. Un registro de auditoría de producción necesitaría reincorporar el texto del usuario bajo condiciones
   controladas.
3. **Formato portable**: El formato de cable de OTel es neutral respecto del proveedor. Los spans pueden enrutarse a cualquier
   backend (Elasticsearch, Datadog, Splunk, un almacén de auditoría personalizado) sin cambiar la
   instrumentación.
4. **Convenciones semánticas**: Las convenciones de OpenInference proporcionan un esquema de atributos
   estandarizado para aplicaciones de LLM, lo que hace los registros interpretables entre herramientas y equipos.

## Camino a producción

Un registro de auditoría de nivel de producción requeriría:

1. **Almacenamiento de registros con evidencia de manipulación**: Almacenamiento de registros de solo anexar con verificación
   de integridad criptográfica (p. ej., encadenamiento de hashes, árboles de Merkle o almacenamiento inmutable del proveedor de nube);
   detección de cualquier modificación o eliminación de registros

2. **Políticas de conservación**: Conservación de 6 años para datos regulados por HIPAA; requisitos de
   conservación específicos de cada jurisdicción; aplicación automatizada de la conservación y eliminación segura al vencimiento

3. **Controles de acceso**: Acceso basado en roles a los registros de auditoría; separación entre los equipos
   operativos (que pueden ver los registros) y los equipos de seguridad (que pueden verificar la integridad de los registros);
   auditoría del propio acceso al registro de auditoría

4. **Interfaz de consulta**: Registro de auditoría con búsqueda y filtros por rango de tiempo, usuario,
   tipo de evento, decisión de barrera de seguridad y resultado; informes exportables para auditorías de cumplimiento

5. **Reconstrucción de la línea de tiempo de incidentes**: Capacidad de reconstruir una línea de tiempo completa de
   eventos para cualquier conversación o usuario dado; correlación cruzada entre las decisiones de las barreras de
   seguridad, las invocaciones del LLM y los resultados de recuperación

6. **Registro de contenido del usuario (con controles)**: Si el contenido de los mensajes y las respuestas del usuario debe
   registrarse para aseguramiento de calidad o fines regulatorios: cifrado en reposo,
   descifrado con control de acceso, acceso limitado por finalidad y procedimientos de eliminación

7. **Alertas sobre eventos de auditoría**: Alertas en tiempo real ante patrones anómalos (p. ej., un repunte
   en las tasas de rechazo, fallas de redacción de PII, disparadores de escalamiento); integración con
   los flujos de respuesta a incidentes

8. **Informes de cumplimiento**: Generación automatizada de informes de cumplimiento a partir de los datos del registro de
   auditoría; paquetes de evidencia para auditorías regulatorias; paneles de resumen para los responsables de cumplimiento

9. **Exportación y portabilidad de registros**: Capacidad de exportar registros de auditoría en formatos estándar
   para herramientas de auditoría externas, presentaciones regulatorias o migración entre backends de registro

## Véase también

- [Diseño de observabilidad](../adr/adr-0006-observability.md) -- diseño de observabilidad
- [Evaluación de preparación para HIPAA](hipaa-readiness.md) -- evaluación de preparación para HIPAA
- [Redacción de PII](pii-redaction.md) -- documentación de redacción de PII
- [Preparación para ISO 42001 / SOC 2](iso42001-soc2.md) -- preparación para ISO 42001 / SOC 2
- [Plan de detección de deriva](drift-detection-plan.md) -- plan de detección de deriva
