---
title: Modelo de amenazas OWASP LLM Top 10 y MITRE ATLAS
description: Un modelo de amenazas que mapea el agente conversacional frente al OWASP Top 10 para Aplicaciones de LLM y la matriz adversaria MITRE ATLAS.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Modelo de amenazas OWASP LLM Top 10 y MITRE ATLAS

Mapea la implementación de referencia `ai-agent-eval-harness-healthtech` frente al
[OWASP Top 10 para Aplicaciones de LLM (2025)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
y la matriz adversaria de amenazas [MITRE ATLAS](https://atlas.mitre.org/). Este
documento identifica qué amenazas mitigan los controles existentes, cuáles están
parcialmente abordadas y cuáles requieren trabajo adicional para el despliegue en producción.

Léase junto con la [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/), el
[mapeo del NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/es-419/governance/nist-ai-rmf/) y la [decisión de barreras de seguridad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/).

## Alcance del modelo de amenazas

Este modelo de amenazas cubre la superficie del agente conversacional: la entrada del usuario que ingresa
por el endpoint `POST /chat`, el procesamiento a través de la canalización LangGraph de seis nodos, y la
respuesta devuelta al usuario. El modelo no cubre las amenazas a nivel de infraestructura
(red, host, contenedor) más allá de señalar que la implementación de referencia se ejecuta en la
capa gratuita de Hugging Face Spaces y no está diseñada para la seguridad de infraestructura en producción.

## Mapeo del OWASP Top 10 para Aplicaciones de LLM (2025)

### LLM01: Inyección de prompts

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | La entrada del usuario contiene instrucciones diseñadas para anular el prompt del sistema o manipular el comportamiento del LLM |
| **Mitigaciones implementadas** | El clasificador de alcance rechaza las entradas fuera de alcance antes del LLM; plantillas de rechazo para patrones de inyección conocidos; el red-team nocturno de Promptfoo pone a prueba 13 plantillas de inyección del OWASP LLM Top 10 más 25 casos adversarios elaborados a mano |
| **Riesgo residual** | Técnicas novedosas de inyección de prompts no cubiertas por el clasificador de alcance o el banco de semillas adversarias podrían eludir las barreras de seguridad deterministas; el propio LLM podría cumplir con jailbreaks bien elaborados después de la capa de barreras de seguridad |
| **Control** | Clasificador de alcance, plantillas de rechazo y el banco de semillas adversarias |

### LLM02: Divulgación de información sensible

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | El LLM revela prompts del sistema, detalles internos de la arquitectura o PII del usuario en sus respuestas |
| **Mitigaciones implementadas** | Redacción de PII en entrada y salida que cubre correo electrónico, teléfono (EE. UU./Chile/Brasil), RUT, CPF, DNI, SSN, tarjeta de crédito (Luhn), MRN, fecha de nacimiento; detección de extracción del prompt del sistema en el clasificador de alcance; invariante de privacidad: el texto del mensaje del usuario nunca entra en los spans de OpenTelemetry (aplicado por una prueba automatizada); el escaneo de secretos previene secretos en el repositorio |
| **Riesgo residual** | Los patrones de PII se basan en expresiones regulares y podrían pasar por alto formatos novedosos o PII contextual; el LLM podría inferir PII a partir de un contexto sin PII |
| **Control** | Etapa de redacción de PII y clasificador de alcance |

### LLM03: Vulnerabilidades de la cadena de suministro

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | Proveedor de LLM comprometido, pesos de modelo envenenados o dependencia maliciosa |
| **Mitigaciones implementadas** | La abstracción de Protocol del cliente LLM (véase la [decisión de abstracción de proveedores de LLM](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/)) permite cambiar de proveedor sin cambios en el código; el archivo de bloqueo de dependencias fija todas las dependencias; el monitoreo automatizado de dependencias está habilitado; sin descargas de modelos en tiempo de ejecución (los modelos preentrenados se acceden vía API) |
| **Riesgo residual** | No hay verificación de la integridad del proveedor de LLM; no hay atestación de procedencia del modelo; la fijación de dependencias previene la deriva pero no previene un compromiso inicial |
| **Control** | La capa del cliente LLM, el archivo de bloqueo de dependencias y el monitoreo automatizado de dependencias |

### LLM04: Envenenamiento de datos y modelos

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | Datos de entrenamiento o contenido de la KB manipulados para producir salidas dañinas |
| **Mitigaciones implementadas** | Datos 100% sintéticos con procedencia documentada (la declaración de datos); las tarjetas de la KB llevan una URL de fuente y una licencia de fuente; el arnés de evaluación detecta regresiones de comportamiento; los cambios al corpus están sujetos a revisión |
| **Riesgo residual** | La generación de datos sintéticos usa salida de LLM (heredando los sesgos del modelo); no hay detección automatizada de la deriva del contenido de la KB respecto del material de origen |
| **Control** | El corpus de datos sintéticos y el arnés de evaluación |

### LLM05: Manejo inadecuado de la salida

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | La salida del LLM se renderiza o ejecuta sin saneamiento (XSS, ejecución de código) |
| **Mitigaciones implementadas** | El renderizado de SVG usa `createElementNS` y `textContent`, nunca `innerHTML`; la API devuelve JSON estructurado; sin evaluación dinámica de código sobre la salida del LLM; el esquema de respuesta del chat está bloqueado |
| **Riesgo residual** | Si los consumidores aguas abajo renderizan markdown de la salida del LLM sin saneamiento, el XSS es posible; esto es una preocupación del lado del consumidor |
| **Control** | La capa de renderizado del frontend y la capa de la API |

### LLM06: Agencia excesiva

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | El agente LLM tiene más permisos o capacidades de los necesarios |
| **Mitigaciones implementadas** | El clasificador de alcance limita el agente a temas de adherencia a la medicación; las plantillas de rechazo bloquean dosificación, diagnóstico, cambio de prescripción, interpretación de laboratorios; sin capacidades de uso de herramientas (sin llamadas a funciones, sin integraciones de API, sin acceso al sistema de archivos); el agente no puede iniciar llamadas de red salientes |
| **Riesgo residual** | La capacidad conversacional del agente es en sí misma la "agencia"; el riesgo está acotado por la superficie de rechazo pero no eliminado para tipos de solicitud novedosos |
| **Control** | Clasificador de alcance y plantillas de rechazo |

### LLM07: Fuga del prompt del sistema

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | El usuario extrae el prompt del sistema mediante un prompting ingenioso |
| **Mitigaciones implementadas** | El clasificador de alcance incluye patrones de detección de extracción del prompt del sistema; casos adversarios en el corpus de evaluación prueban la extracción de prompts; el red-team nocturno de Promptfoo incluye intentos de extracción |
| **Riesgo residual** | La detección determinista de extracción podría pasar por alto técnicas novedosas; el contenido del prompt del sistema no es secreto (está en el código fuente), pero su exposición podría facilitar ataques dirigidos |
| **Control** | Clasificador de alcance y el banco de semillas adversarias |

### LLM08: Debilidades de vectores y embeddings

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | Embeddings envenenados, inyección indirecta a través del contenido de la KB o manipulación de la recuperación |
| **Mitigaciones implementadas** | Las tarjetas de la KB son 100% sintéticas y están confirmadas (sin ingesta dinámica); la recuperación devuelve el texto de origen con exigencia de citaciones; el arnés de evaluación verifica la corrección de las citaciones |
| **Riesgo residual** | La recuperación de casi-aciertos fuera del corpus es una brecha conocida (documentada en la ficha del modelo); no hay detección de envenenamiento de embeddings; el pequeño corpus de 36 tarjetas hace que los umbrales de similitud sean poco fiables |
| **Control** | La capa de recuperación y el corpus de la KB confirmado |

### LLM09: Desinformación

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | El LLM genera información de salud plausible pero incorrecta |
| **Mitigaciones implementadas** | Exigencia de citaciones: cada afirmación clínica debe citar una tarjeta de la KB; rechazo ante una no coincidencia de recuperación; el arnés de evaluación puntúa fidelidad >= 0.85 y alucinación <= 0.10; aviso de demostración en cada respuesta |
| **Riesgo residual** | El modelo podría generar información incorrecta que cita una tarjeta válida pero tergiversa su contenido; el puntuador de alucinación atrapa la mayoría de los casos, pero no todos |
| **Control** | La capa de barreras de seguridad y el arnés de evaluación |

### LLM10: Consumo sin límites

| Propiedad | Valor |
|----------|-------|
| **Amenaza** | Agotamiento de recursos mediante longitud de entrada excesiva, prompts recursivos o denegación de servicio |
| **Mitigaciones implementadas** | Límites de longitud de entrada en el nodo de ingreso; compuertas de costo/latencia en el arnés de evaluación (4K tokens de entrada, 1K de salida, 8s por turno); limitación de tasa por sesión disponible (desactivada por defecto para el determinismo); la capa gratuita de Hugging Face Spaces tiene límites de tasa integrados |
| **Riesgo residual** | No hay detección de prompts recursivos; no hay un disyuntor basado en la longitud de entrada en la capa HTTP |
| **Control** | El grafo del agente y las compuertas de costo del arnés de evaluación |

## Mapeo de MITRE ATLAS

La matriz MITRE ATLAS adapta el marco MITRE ATT&CK para técnicas adversarias
específicas de la IA. La siguiente tabla mapea las técnicas de ATLAS relevantes para este sistema.

| Técnica de ATLAS | Aplicabilidad | Mitigación | Estado |
|-----------------|--------------|------------|--------|
| **AML.T0000: Reconocimiento** | El atacante estudia el repositorio de código abierto para comprender la arquitectura | El repositorio es público; los registros de decisiones de arquitectura y la especificación son transparentes por diseño | Aceptado -- la transparencia es una característica |
| **AML.T0002: Recopilar datos públicos** | El atacante reúne las tarjetas de la KB, el corpus de evaluación, el prompt del sistema desde el repositorio | Datos públicos; solo sintéticos; sin contenido sensible | Aceptado |
| **AML.T0010: Compromiso de la cadena de suministro de ML** | Proveedor de LLM o dependencia comprometidos | El Protocol del cliente LLM permite cambiar de proveedor; el archivo de bloqueo de dependencias fija las dependencias | Parcialmente mitigado |
| **AML.T0020: Envenenar datos de entrenamiento** | Manipular las tarjetas de la KB para inyectar contenido adversario | Datos 100% sintéticos; corpus sujeto a revisión; metadatos de procedencia | Mitigado |
| **AML.T0043: Elaborar datos adversarios** | Crear entradas diseñadas específicamente para eludir las barreras de seguridad | El corpus de evaluación incluye 25 casos adversarios; el red-team nocturno de Promptfoo; el clasificador de alcance rechaza patrones conocidos | Parcialmente mitigado -- técnicas novedosas podrían eludir |
| **AML.T0044: Extracción completa de la memoria** | Extraer el prompt del sistema mediante la conversación | El clasificador de alcance incluye detección de extracción | Parcialmente mitigado |
| **AML.T0048: Inyección de prompts** | Inyectar instrucciones para anular el comportamiento del sistema | Clasificador de alcance, plantillas de rechazo, barreras de seguridad previas al LLM | Parcialmente mitigado |
| **AML.T0051: Jailbreak de LLM** | Eludir los controles de seguridad para generar contenido dañino | Arquitectura con barreras de seguridad antes del LLM; rechazo ante lo que queda fuera de alcance; escalamiento ante señales de alarma agudas | Parcialmente mitigado |
| **AML.T0054: Manipular contenido** | Influir en la salida del LLM mediante la manipulación de la KB | La KB es de datos sintéticos confirmados; sin ingesta dinámica | Mitigado |
| **AML.T0058: Impacto en la salida del modelo** | Hacer que el modelo produzca una salida incorrecta o dañina | Exigencia de citaciones; puntuación de fidelidad y alucinación; detección de regresiones del arnés de evaluación | Parcialmente mitigado |

## Estado actual

La implementación de referencia mitiga los riesgos más críticos del OWASP LLM mediante un
enfoque de defensa en profundidad:

1. **Barreras de seguridad antes del LLM**: El clasificador de alcance, la redacción de PII, la detección de escalamiento
   y las plantillas de rechazo se ejecutan como nodos deterministas del grafo antes de invocar el LLM.
   Esto significa que las decisiones más críticas para la seguridad no dependen del comportamiento del modelo.

2. **Pruebas adversarias continuas**: El red-team nocturno de Promptfoo, los 25 casos
   adversarios de evaluación y los 13 casos de red-team elaborados a mano ponen a prueba el sistema frente a
   patrones de ataque conocidos. Los nuevos patrones descubiertos por las ejecuciones de red-team se reincorporan al
   banco de semillas adversarias.

3. **Arquitectura transparente**: Los registros de decisiones de arquitectura, la ficha del modelo, la
   postura regulatoria y el código fuente público hacen visibles el diseño y las limitaciones del
   sistema. La transparencia reduce la asimetría entre atacante y defensor.

4. **Arnés de evaluación como compuerta de regresión**: Cada cambio se prueba frente al corpus completo de 315
   casos. Una regresión en las métricas de seguridad, citación o escalamiento hace fallar la construcción.

La evaluación honesta es que estas mitigaciones son de grado de implementación de referencia. Ellas
demuestran el patrón de defensa en profundidad para aplicaciones de LLM; no proporcionan
la misma garantía que un programa de seguridad de producción con recursos de red-team dedicados,
pruebas de penetración y evaluación formal de seguridad.

## Camino a producción

Un despliegue en producción necesitaría reforzar las mitigaciones en varias dimensiones:

1. **Verificación de la cadena de suministro del modelo**: Atestación de procedencia del modelo, verificaciones de integridad
   del proveedor, evaluaciones periódicas de seguridad del proveedor, requisitos contractuales de seguridad

2. **Filtrado de salida a escala**: Filtrado de salida en tiempo real más allá de los actuales
   patrones de verificación de citaciones y rechazo; detección de toxicidad; clasificadores de seguridad de contenido;
   escalamiento automatizado de las salidas marcadas para revisión humana

3. **Pruebas adversarias avanzadas**: Recursos de red-team dedicados más allá de la automatización de
   Promptfoo; pruebas de penetración manuales; programa de recompensas; pruebas adversarias
   continuas frente a técnicas emergentes

4. **Seguridad de embeddings**: Detección de envenenamiento de embeddings; verificación de la integridad de los
   resultados de recuperación; ajuste de umbrales de similitud para corpus más grandes

5. **Limitación de tasa y protección de recursos**: Disyuntores basados en la longitud de entrada; detección de prompts
   recursivos; limitación de la tasa de solicitudes; detección de anomalías de costo; degradación elegante bajo carga

6. **Respuesta a incidentes**: Manual formal de incidentes de seguridad; clasificación de severidad;
   procedimientos de notificación para los usuarios afectados; capacidad de análisis forense; proceso de revisión
   posterior al incidente

7. **Monitoreo y alertas**: Detección de anomalías en tiempo real sobre las salidas del LLM; alertas
   automatizadas ante patrones de elusión de las barreras de seguridad; panel para métricas relevantes para la seguridad

## Véase también

- [Postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) -- frontera regulatoria
- [Mapeo del NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/es-419/governance/nist-ai-rmf/) -- mapeo del NIST AI RMF
- [Clasificación de la Ley de IA de la UE](/ai-agent-eval-harness-healthtech-docs/es-419/governance/eu-ai-act/) -- clasificación de la Ley de IA de la UE
- [Decisión de barreras de seguridad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/) -- diseño de barreras de seguridad
- [Decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/) -- diseño de observabilidad
- [Decisión de abstracción de proveedores de LLM](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/) -- abstracción de proveedores de LLM
