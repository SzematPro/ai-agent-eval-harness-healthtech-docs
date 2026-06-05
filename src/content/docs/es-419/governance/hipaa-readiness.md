---
title: Evaluación de preparación para HIPAA
description: Una evaluación honesta de la preparación para HIPAA de una implementación de referencia con datos sintéticos que no maneja PHI y no está sujeta a HIPAA.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Evaluación de preparación para HIPAA

Evalúa la implementación de referencia `ai-agent-eval-harness-healthtech` frente a
las Reglas de Privacidad, Seguridad y Notificación de Brechas de la Ley estadounidense
de Portabilidad y Responsabilidad de los Seguros de Salud (HIPAA). Esta es una evaluación
honesta: el sistema es una implementación de referencia que no maneja PHI y no está sujeta
a HIPAA. La evaluación identifica lo que existe hoy y lo que necesitaría un despliegue que
maneje PHI.

Léase junto con la [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) y la
[documentación de redacción de PII](/ai-agent-eval-harness-healthtech-docs/es-419/governance/pii-redaction/).

## Aplicabilidad

HIPAA aplica a las entidades cubiertas (planes de salud, cámaras de compensación de salud,
proveedores de salud que realizan transacciones estándar de forma electrónica) y a sus
socios comerciales. Esta implementación de referencia no es ninguno de ellos. Es un
artefacto público de código, no una entidad cubierta, no un socio comercial, y no está
sujeta a las obligaciones de HIPAA.

La evaluación a continuación valora la preparación en caso de que la misma arquitectura se
desplegara en un contexto en el que procesaría PHI en nombre de una entidad cubierta.

## Evaluación de la Regla de Privacidad

| Requisito | Estado actual | Camino a producción |
|-------------|--------------|-----------------|
| **Manejo de PHI** | No hay PHI presente. El sistema usa datos 100% sintéticos (36 KB de tarjetas, 218 casos de evaluación). Sin datos reales de pacientes, sin EHR real, sin registros clínicos reales. | Un despliegue en producción necesitaría definir qué constituye PHI en su contexto, implementar políticas para la ingesta, el procesamiento, el almacenamiento y la eliminación de PHI, y asegurar que se aplique el estándar de mínimo necesario |
| **Mínimo necesario** | No aplica -- no se maneja PHI | Controles de acceso que limiten la exposición de PHI al mínimo necesario para cada función; acceso basado en roles con registro de auditoría |
| **Derechos del paciente** | No aplica -- no hay pacientes reales | Mecanismos para que los pacientes accedan, corrijan y reciban un registro de las divulgaciones de su PHI; procesamiento de solicitudes dentro de los plazos de HIPAA |
| **Aviso de Prácticas de Privacidad** | Aviso de demostración en cada respuesta ("Esto es una demostración. No es asesoría médica.") | Documento formal de Aviso de Prácticas de Privacidad; acuse de recibo por parte del paciente |

## Evaluación de la Regla de Seguridad

### Salvaguardas administrativas

| Requisito (45 CFR 164.308) | Estado actual | Camino a producción |
|-------------------------------|--------------|-----------------|
| **Proceso de gestión de seguridad** | El arnés de evaluación controla cada cambio; los registros de decisiones de arquitectura documentan el tratamiento del riesgo; ejercicios nocturnos de red-team ponen a prueba el sistema de forma adversaria | Análisis formal de riesgos; plan de gestión de riesgos; política de sanciones; revisión de la actividad del sistema de información |
| **Responsabilidad de seguridad asignada** | Proyecto de autor único; sin responsable de seguridad designado | Funcionario de seguridad designado, responsable de desarrollar e implementar las políticas de seguridad |
| **Capacitación del personal** | No aplica | Capacitación en concientización sobre seguridad para todos los miembros del personal; capacitación periódica de actualización; capacitación sobre phishing, ingeniería social y manejo de PHI |
| **Gestión de acceso** | Acceso a nivel del repositorio; sin autenticación de usuario en tiempo de ejecución para la API de demostración | Control de acceso basado en roles; identificación única de usuario; procedimientos de acceso de emergencia; cierre de sesión automático; mecanismos de cifrado y descifrado |
| **Planificación de contingencia** | Sin respaldo/recuperación para los datos de demostración (checkpointer en memoria, sin almacenamiento persistente) | Plan de respaldo de datos; plan de recuperación ante desastres; plan de operación en modo de emergencia; procedimientos de prueba y revisión |
| **Evaluación** | Sin evaluación formal de seguridad | Evaluación técnica y no técnica periódica; valoración de las medidas de seguridad frente a los requisitos documentados |

### Salvaguardas físicas

| Requisito (45 CFR 164.310) | Estado actual | Camino a producción |
|-------------------------------|--------------|-----------------|
| **Controles de acceso a instalaciones** | No aplica (alojado en Hugging Face Spaces; sin infraestructura física controlada) | Controles de acceso físico para cualquier infraestructura local; registros de visitantes; registros de mantenimiento |
| **Seguridad de estaciones de trabajo** | No aplica | Salvaguardas físicas para las estaciones de trabajo que acceden a PHI; acceso restringido a usuarios autorizados |
| **Controles de dispositivos y medios** | No aplica | Procedimientos de eliminación de medios; controles de reutilización de medios; registros de responsabilidad sobre el movimiento de medios |

### Salvaguardas técnicas

| Requisito (45 CFR 164.312) | Estado actual | Camino a producción |
|-------------------------------|--------------|-----------------|
| **Control de acceso** | Sin autenticación de usuario en tiempo de ejecución para la API de demostración; sin PHI que proteger | Identificación única de usuario; procedimiento de acceso de emergencia; cierre de sesión automático; cifrado y descifrado de PHI en reposo |
| **Controles de auditoría** | Spans de OpenTelemetry con convenciones semánticas de OpenInference en cada nodo, llamada al LLM, recuperación y decisión de barrera de seguridad (véase la [decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/)); sumideros de Langfuse Cloud y Phoenix | Registro de auditoría integral con almacenamiento a prueba de manipulaciones; retención de 6 años; interfaz de consulta para la revisión de auditorías; alertas en tiempo real ante patrones de acceso anómalos |
| **Controles de integridad** | El arnés de evaluación detecta regresiones de comportamiento; el esquema de respuesta del chat está bloqueado; los archivos de datos sintéticos están bajo control de versiones | Mecanismos electrónicos para autenticar PHI; controles de integridad para prevenir alteraciones no autorizadas; verificación de integridad de los respaldos |
| **Seguridad de la transmisión** | HTTPS en Hugging Face Spaces (provisto por la plataforma); la API devuelve JSON estructurado | Cifrado de extremo a extremo en tránsito (TLS 1.3 como mínimo); segmentación de red; VPN para acceso administrativo |

## Evaluación de la Notificación de Brechas

| Requisito (45 CFR 164.400-414) | Estado actual | Camino a producción |
|-----------------------------------|--------------|-----------------|
| **Definición de brecha** | Sin PHI que pueda ser vulnerada | Proceso formal de evaluación de brechas; documentación de incidentes; evaluación del riesgo de daño para cada presunta brecha |
| **Notificación a las personas** | No aplica | Notificación a las personas afectadas sin demora irrazonable (dentro de 60 días); notificación escrita con el contenido requerido |
| **Notificación a HHS** | No aplica | Registro anual de brechas que afecten a menos de 500 personas; notificación a HHS para brechas que afecten a 500 o más |
| **Notificación a los medios** | No aplica | Notificación a medios de comunicación destacados del estado para brechas que afecten a 500 o más personas |

## Consideraciones sobre socios comerciales

Un despliegue en producción que use proveedores externos de LLM (Groq, Cerebras, OpenAI, Anthropic)
para procesar PHI necesitaría:

- **Acuerdos de Socio Comercial (BAA)** con cada proveedor de LLM, obligándolos
  contractualmente a salvaguardar el PHI
- Garantía de que los proveedores de LLM no retienen ni usan el PHI para el entrenamiento de modelos
- Evaluación de la postura de cumplimiento de HIPAA de cada proveedor
- Disposiciones contractuales para la notificación de brechas, la gestión de subcontratistas y la
  devolución/destrucción del PHI al término del contrato

A partir de 2026, la mayoría de los principales proveedores de LLM ofrecen planes elegibles para BAA
a clientes empresariales. La delgada abstracción de Protocol del cliente LLM (véase la
[decisión de abstracción de proveedores de LLM](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/)) permite
cambiar a proveedores con los BAA apropiados sin cambios en el código.

## Estado actual

La implementación de referencia se construyó con varios controles alineados con HIPAA, a pesar de
no estar sujeta a HIPAA:

- **Sin PHI**: El sistema maneja únicamente datos sintéticos. Ningún dato real de pacientes ingresa al
  repositorio, a la demostración ni a la canalización de evaluación en ningún momento. Esto se aplica
  mediante una verificación de aceptación de datos y se documenta en la [declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/).
- **Redacción de PII**: Una etapa de redacción detecta y redacta correo electrónico, números de teléfono
  (formatos de EE. UU., Chile, Brasil), RUT, CPF, DNI, SSN, números de tarjeta de crédito (validados con Luhn)
  y patrones de PHI (MRN, fecha de nacimiento) tanto en la etapa de entrada como en la de salida.
- **Sin almacenamiento persistente**: La demostración usa un checkpointer en memoria; las conversaciones
  de los usuarios no se conservan más allá de la vida del proceso. Hay disponible un checkpointer durable
  respaldado por Postgres cuando se configura una cadena de conexión a base de datos.
- **Rastro de auditoría**: Spans de OpenTelemetry con convenciones semánticas de OpenInference envuelven cada
  nodo, llamada al LLM, recuperación y decisión de barrera de seguridad (véase la
  [decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/)). El texto del mensaje del usuario se
  excluye explícitamente de los spans (invariante de privacidad aplicado por una prueba automatizada).
- **Privacidad por diseño**: El texto del mensaje del usuario nunca entra en los spans, registros ni
  atributos de traza de OpenTelemetry. Esta es una restricción estricta aplicada por un invariante de prueba
  automatizado.
- **Gestión de secretos**: El escaneo de secretos en CI evita que los secretos entren al repositorio;
  el archivo de bloqueo de dependencias fija las versiones; el monitoreo automatizado de dependencias
  vigila las vulnerabilidades.

Estos controles demuestran conciencia de los principios de HIPAA, pero no constituyen cumplimiento de
HIPAA. El sistema no ha pasado por un análisis formal de riesgos, no tiene un responsable de seguridad
designado, no tiene ningún BAA con ningún proveedor de LLM, y no cumple los requisitos de salvaguardas
técnicas de la Regla de Seguridad para sistemas que procesan PHI.

## Camino a producción

Para desplegar esta arquitectura en un entorno regulado por HIPAA:

1. **Análisis formal de riesgos**: Evaluación integral de amenazas y vulnerabilidades a la
   confidencialidad, integridad y disponibilidad del PHI; plan documentado de tratamiento del riesgo
2. **Ejecución de BAA**: Acuerdos de Socio Comercial con todos los proveedores de LLM que procesen PHI;
   salvaguardas contractuales del PHI; disposiciones de terminación para la devolución/destrucción del PHI
3. **Cifrado**: Cifrado AES-256 en reposo para cualquier almacenamiento de PHI; TLS 1.3 como mínimo para
   el PHI en tránsito; gestión de claves con módulos de seguridad de hardware para las claves de producción
4. **Controles de acceso**: Control de acceso basado en roles con identificación única de usuario;
   autenticación multifactor para el acceso administrativo; tiempo de espera automático de sesión
5. **Retención del registro de auditoría**: Retención de 6 años de los registros de auditoría (requisito de HIPAA);
   almacenamiento de registros a prueba de manipulaciones; interfaz de consulta para la revisión de auditorías y los informes de cumplimiento
6. **Planificación de contingencia**: Procedimientos de respaldo de datos y recuperación ante desastres; plan
   de operación en modo de emergencia; pruebas periódicas de los procedimientos de recuperación
7. **Capacitación del personal**: Capacitación en concientización sobre HIPAA para todo el personal; capacitación
   específica por rol para quienes manejan PHI; capacitación periódica de actualización y simulaciones de phishing
8. **Respuesta a incidentes**: Procedimientos de notificación de brechas que cumplan los plazos de HIPAA;
   clasificación y escalamiento de incidentes; capacidad de investigación forense

Los patrones existentes del repositorio -- redacción de PII, un rastro de auditoría de OpenTelemetry, el
invariante de privacidad, la arquitectura con barreras de seguridad primero -- proporcionan una ventaja
sustancial. La brecha está en las capas organizacionales, procedimentales y contractuales que una
implementación de referencia no puede demostrar por sí sola.

## Véase también

- [Postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) -- frontera regulatoria
- [Redacción de PII](/ai-agent-eval-harness-healthtech-docs/es-419/governance/pii-redaction/) -- documentación de redacción de PII
- [Plan de registro de auditoría](/ai-agent-eval-harness-healthtech-docs/es-419/governance/audit-logging-plan/) -- plan de registro de auditoría
- [Preparación para ISO 42001 / SOC 2](/ai-agent-eval-harness-healthtech-docs/es-419/governance/iso42001-soc2/) -- preparación para ISO 42001 / SOC 2
- [Decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/) -- diseño de observabilidad
