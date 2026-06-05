---
title: Mapeo de protección de datos de la Ley 19.628 de Chile
description: Cómo la implementación de referencia pública se mapea a los principios de protección de datos, los derechos de los titulares y las disposiciones sobre datos sensibles de la Ley 19.628 de Chile.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Mapeo de protección de datos de la Ley 19.628 de Chile

> Mapea la implementación de referencia `ai-agent-eval-harness-healthtech` frente a la
> [Ley 19.628](https://www.bcn.cl/leychile/navegar?idNorma=141599) (Ley chilena sobre
> Protección de la Vida Privada), con sus modificaciones hasta
> 2024. Este documento evalúa qué principios de protección de datos observa la
> implementación de referencia y qué requeriría un despliegue en Chile.
>
> Léase junto con la [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) y la
> [evaluación de preparación para HIPAA](/ai-agent-eval-harness-healthtech-docs/es-419/governance/hipaa-readiness/).

## Contexto legislativo

La Ley 19.628 regula el tratamiento de datos personales en Chile. Entre las modificaciones
clave se cuentan la modernización de 2018 (Ley 21.099, que la alinea con los principios del
GDPR) y actualizaciones posteriores que refuerzan los requisitos de consentimiento, los
derechos de los titulares y las disposiciones sobre transferencias transfronterizas. La ley
aplica al tratamiento de datos personales cuando el responsable (controlador de datos) está
domiciliado en Chile o cuando el tratamiento utiliza medios situados en territorio chileno.

## Evaluación de los principios sobre datos personales

| Principio (Ley 19.628) | Estado actual | Camino a producción |
|------------------------|--------------|-----------------|
| **Licitud** (Art. 2) | No se recolectan datos personales. El sistema opera con datos 100% sintéticos. En ningún momento se procesan datos de personas reales. | Base legal para el tratamiento (consentimiento, necesidad contractual, obligación legal o interés legítimo); base legal documentada para cada actividad de tratamiento |
| **Limitación de la finalidad** (Art. 2) | No aplica -- sin datos personales | Finalidad clara, específica y explícita para cada actividad de tratamiento de datos; limitación de la finalidad aplicada en el diseño del sistema |
| **Minimización de datos** (Art. 2) | El sistema recolecta una entrada mínima en tiempo de ejecución: el turno conversacional del usuario. La PII se redacta antes del procesamiento. No se persiste ningún dato más allá de la vida del proceso (checkpointer en memoria). | Recolectar solo los datos necesarios para la finalidad declarada; revisión periódica de los datos recolectados; eliminación de los datos que ya no se necesitan |
| **Exactitud** (Art. 2) | No aplica -- sin datos personales | Mecanismos para que los titulares actualicen o corrijan sus datos; procedimientos de revisión de calidad de los datos |
| **Limitación del almacenamiento** (Art. 2) | Sin almacenamiento persistente de datos de usuario; las conversaciones se mantienen en memoria y se pierden al reiniciar el proceso | Plazos de conservación definidos; procedimientos de eliminación; gestión de solicitudes de acceso y eliminación de los titulares |
| **Seguridad** (Art. 2) | Redacción de PII en la entrada y la salida; traza de auditoría con OpenTelemetry; sin secretos en el repositorio (escaneo automatizado de secretos); HTTPS en la demo alojada | Medidas de seguridad técnicas y organizativas apropiadas al riesgo; cifrado, controles de acceso, procedimientos de notificación de brechas |
| **Transparencia** (Art. 2) | Aviso legal de la demo en cada respuesta; ficha del modelo pública; los documentos de postura regulatoria publicados delimitan el alcance | Aviso de privacidad accesible antes de la recolección de datos; lenguaje claro sobre las finalidades del tratamiento, la conservación y los derechos |

## Derechos de los titulares de datos

| Derecho (Ley 19.628) | Estado actual | Camino a producción |
|---------------------|--------------|-----------------|
| **Acceso** (Art. 12) | No aplica -- no se almacenan datos personales | Mecanismo para que los titulares soliciten y reciban confirmación de si se están tratando sus datos |
| **Rectificación** (Art. 12) | No aplica | Mecanismo para que los titulares corrijan datos inexactos |
| **Eliminación** (Art. 12) | No aplica -- sin datos persistentes | Mecanismo para que los titulares soliciten la eliminación de sus datos; verificación de la eliminación |
| **Oposición** (Art. 12) | No aplica | Mecanismo para que los titulares se opongan al tratamiento por motivos legítimos |
| **Portabilidad** (implícita en la modificación de 2018) | No aplica | Mecanismo para que los titulares reciban sus datos en un formato estructurado y legible por máquina |

## Disposiciones sobre datos sensibles

La Ley 19.628 establece protecciones reforzadas para los datos personales sensibles (datos de
salud, datos biométricos, entre otros). Conforme a la ley, los datos sensibles solo pueden
tratarse con consentimiento expreso y por escrito o cuando sean necesarios para la prevención,
el diagnóstico médico o la gestión de la atención de salud.

| Aspecto | Estado actual | Camino a producción |
|--------|--------------|-----------------|
| **Datos de salud** | Sin datos de salud reales. Todo el contenido clínico es sintético. El agente conversa sobre adherencia a la medicación únicamente con personas sintéticas. | Consentimiento expreso para el tratamiento de datos de salud; limitación de la finalidad al contexto de la atención de salud; medidas de seguridad reforzadas; acceso restringido a personal de salud autorizado |
| **Datos biométricos** | No se recolectan ni se procesan datos biométricos | Consentimiento expreso; limitación de la finalidad; seguridad reforzada; eliminación cuando se cumple la finalidad |
| **Gestión del consentimiento** | No aplica -- sin datos personales | Plataforma de gestión del consentimiento; opciones de consentimiento granulares; mecanismo de retiro del consentimiento; traza de auditoría del consentimiento |

## Transferencia transfronteriza de datos

| Aspecto | Estado actual | Camino a producción |
|--------|--------------|-----------------|
| **Transferencia de datos a proveedores de LLM** | La entrada del usuario se envía a proveedores de LLM (Groq, Cerebras) por HTTPS. No hay datos personales en la entrada (implementación de referencia exclusivamente sintética). | Evaluación de las jurisdicciones de los proveedores de LLM; determinación de adecuación o salvaguardas apropiadas para la transferencia transfronteriza; cláusulas contractuales que garanticen niveles de protección equivalentes |
| **Transferencia de datos de observabilidad** | Los spans de telemetría se envían a Langfuse Cloud y Phoenix. El texto del mensaje del usuario se excluye explícitamente de los spans (invariante de privacidad). | Evaluación de la residencia de datos de los proveedores de observabilidad; acuerdos de tratamiento de datos; exclusión de datos personales de la telemetría |

## Estado actual

La implementación de referencia no maneja datos personales y, por lo tanto, no está sujeta a
las obligaciones de la Ley 19.628. No obstante, el diseño incorpora varias
prácticas alineadas con la protección de datos:

- **Sin datos personales**: El sistema opera con datos 100% sintéticos. Ningún dato de una
  persona real entra en la implementación de referencia, la demo o el pipeline de evaluación.
- **Redacción de PII**: La capa de redacción detecta y redacta identificadores relevantes para los usuarios
  chilenos (RUT, formatos de números telefónicos chilenos), junto con identificadores
  estadounidenses y brasileños, tanto en la entrada como en la salida.
- **Sin almacenamiento persistente**: La demo usa un checkpointer en memoria; ningún dato de usuario
  persiste más allá de la vida del proceso.
- **Invariante de privacidad**: El texto del mensaje del usuario nunca entra en los spans de telemetría, los registros ni
  los atributos de las trazas. Esta es una restricción estricta que aplica una prueba unitaria dedicada.
- **Soporte de la configuración regional es-419**: El corpus de evaluación incluye una porción dedicada en es-419, y las
  plantillas de rechazo admiten el español latinoamericano, lo que demuestra conciencia de los usuarios de LATAM.

Los patrones de redacción de PII para identificadores chilenos (formato RUT, prefijos de números
telefónicos chilenos) y las plantillas de rechazo sensibles a la configuración regional que admiten respuestas en es-419 forman parte
de la capa determinista de barreras de seguridad.

## Camino a producción

Desplegar esta arquitectura para usuarios chilenos en un contexto que procese datos personales
requeriría:

1. **Registro del controlador de datos**: Registro ante la autoridad chilena de protección de datos
   (si se requiere para la actividad de tratamiento específica)
2. **Gestión del consentimiento**: Consentimiento expreso para la recolección y el tratamiento de datos personales;
   opciones de consentimiento granulares; mecanismo de retiro del consentimiento; traza de auditoría del consentimiento
3. **Aviso de privacidad**: Aviso de privacidad claro y accesible en español que describa las
   finalidades del tratamiento de datos, los plazos de conservación y los derechos de los titulares
4. **Delegado de Protección de Datos (DPO)**: Designación de un DPO o rol equivalente
   responsable del cumplimiento en materia de protección de datos
5. **Evaluación de transferencias transfronterizas**: Evaluación de la residencia de datos de los proveedores de LLM;
   salvaguardas contractuales para los datos transferidos fuera de Chile; determinación de adecuación
   o mecanismos de protección equivalentes
6. **Disposiciones sobre datos de salud**: Si el sistema procesa datos de salud reales, cumplimiento
   de las protecciones reforzadas para datos sensibles conforme a la Ley 19.628, incluido
   el consentimiento expreso y por escrito y la limitación de la finalidad a la gestión de la atención de salud
7. **Infraestructura de derechos de los titulares**: Mecanismos para solicitudes de acceso, rectificación,
   eliminación, oposición y portabilidad; respuesta dentro de los plazos legales
8. **Medidas de seguridad**: Medidas técnicas y organizativas apropiadas a la
   sensibilidad de los datos tratados; evaluaciones de seguridad periódicas; procedimientos de
   notificación de brechas

## Véase también

- [Postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) -- límite regulatorio
- [Mapeo de la CMF Norma 20](/ai-agent-eval-harness-healthtech-docs/es-419/governance/cmf-norma-20/) -- mapeo del regulador financiero chileno
- [Evaluación de preparación para HIPAA](/ai-agent-eval-harness-healthtech-docs/es-419/governance/hipaa-readiness/) -- evaluación de preparación para HIPAA
- [Documentación de redacción de PII](/ai-agent-eval-harness-healthtech-docs/es-419/governance/pii-redaction/) -- documentación de redacción de PII
- [Diseño de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/) -- diseño de observabilidad
