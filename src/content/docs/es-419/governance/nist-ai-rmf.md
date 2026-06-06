---
title: Mapeo del Marco de Gestión de Riesgos de IA del NIST
description: Un mapeo honesto de una implementación de referencia con datos sintéticos frente a las cuatro funciones centrales del Marco de Gestión de Riesgos de IA del NIST.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Mapeo del Marco de Gestión de Riesgos de IA del NIST

Mapea la implementación de referencia `ai-agent-eval-harness-healthtech` frente al
[NIST AI RMF 1.0](https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence)
(AI 100-1, enero de 2023). El RMF define cuatro funciones centrales -- Gobernar, Mapear,
Medir, Gestionar -- cada una con subcategorías. Este documento evalúa qué
subcategorías aborda el repositorio hoy y cuáles requieren trabajo adicional
para un despliegue en producción.

Léase junto con la [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) y la
[ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/).

## Propósito

Esto no es una certificación del NIST AI RMF. No existe certificación para el RMF; es un
marco voluntario. El propósito de este documento es evaluar honestamente qué prácticas de
gestión de riesgos demuestra la implementación de referencia y dónde quedan brechas
para un despliegue en producción. La evaluación es sobre el repositorio tal como se entrega; una
instancia bifurcada o desplegada necesitaría su propia evaluación.

## Mapeo del marco

### GOBERNAR -- Establecer y mantener una cultura de gestión de riesgos de IA

| Subcategoría | Implementación actual | Evaluación de brechas |
|-------------|----------------------|----------------|
| GOV 1.1: Los requisitos legales y regulatorios se comprenden | Postura regulatoria documentada en la [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/); frontera de bienestar/CDS de la FDA, orientación de la OMS 2024, GMLP de la MHRA, artículos de la Ley de IA de la UE mapeados | Limitada a marcos de EE. UU./UE/Reino Unido/Chile; un sistema en producción necesitaría revisión legal específica de la jurisdicción para cada región de despliegue |
| GOV 1.2: La gestión de riesgos de IA está integrada en la gobernanza organizacional | Los registros de decisiones de arquitectura proporcionan trazabilidad; los cambios a la postura regulatoria, las barreras de seguridad o el escalamiento requieren un registro de decisión | No hay un comité de gobernanza formal ni una junta de revisión; implementación de referencia de autor único |
| GOV 1.3: Los roles y responsabilidades para el riesgo de IA están definidos | Propiedad clara de los módulos: barreras de seguridad, arnés de evaluación, observabilidad (spans de OpenTelemetry según la [decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/)) | No hay separación de funciones; el autor es desarrollador, revisor y operador |
| GOV 1.4: La tolerancia al riesgo está documentada y comunicada | Compuertas de umbral de evaluación documentadas: fidelidad >= 0.85, alucinación <= 0.10, corrección de rechazo = 1.000, corrección de escalamiento = 1.000 | Los umbrales son binarios aprobado/reprobado; no hay un marco gradual de aceptación de riesgos |
| GOV 1.5: Los sistemas de IA son transparentes | Rastro de decisiones de barrera de seguridad en cada respuesta; conjunto de citaciones en cada afirmación clínica; ficha del modelo en formato CHAI; postura regulatoria de acceso público | La transparencia es a nivel de respuesta; no hay un panel público de rendimiento del modelo |
| GOV 1.6: Existen políticas y procedimientos para el riesgo de IA | Proceso de divulgación de seguridad; escaneo de secretos en CI; política de no secretos; redacción de PII antes del LLM | Las políticas son a nivel de repositorio, no de grado empresarial; no hay un manual formal de respuesta a incidentes |
| GOV 1.7: Participación de las partes interesadas | Diseño informado por orientación regulatoria publicada (FDA, OMS, MHRA); ninguna parte interesada externa consultada formalmente (proyecto de autor único) | No hay junta asesora de pacientes, junta asesora clínica ni revisión ética externa |

### MAPEAR -- Comprender y contextualizar los riesgos de IA

| Subcategoría | Implementación actual | Evaluación de brechas |
|-------------|----------------------|----------------|
| MAP 1.1: Los propósitos previstos y los casos de uso están definidos | Sección "Usos e Indicaciones" de la ficha del modelo; lista de "Lo que el agente NO hace" de la postura regulatoria; enumeración de lo que queda fuera de alcance, aplicada por el arnés de evaluación | Definidos para la implementación de referencia; un producto desplegado necesitaría una delimitación de casos de uso específica del contexto |
| MAP 1.2: Se identifican los riesgos de IA interrelacionados | Limitación de casi-aciertos fuera del corpus documentada en la ficha del modelo; brecha de escalamiento subagudo reconocida; comportamiento probabilístico del modelo generativo documentado | No se realiza un análisis sistemático de la interacción entre riesgos (por ejemplo, cómo el sesgo de locale se compone con la recuperación de casi-aciertos) |
| MAP 1.3: Se comprenden las restricciones y limitaciones | Limitaciones honestas documentadas: KB de un solo dominio con 36 tarjetas, corpus de evaluación de 315 casos, sesgo de vocabulario de inglés estadounidense, escalamiento ciego a la negación, durabilidad en memoria para la revisión con humano en el ciclo | Las limitaciones están documentadas; no hay un registro de riesgos formal con puntuación de severidad |
| MAP 1.4: Se evalúa el impacto en individuos y grupos | El agente no usa características de entrada demográficas; la puntuación de paridad entre locales aborda la equidad entre locales | No hay evaluación de impacto demográfico más allá del locale; no hay evaluación del impacto en poblaciones con baja alfabetización en salud o acceso limitado a internet |
| MAP 2.1: Los componentes del sistema de IA están documentados | Registros de decisiones de arquitectura; la especificación del sistema; el grafo de seis nodos documentado en la [decisión de orquestación](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0001-orchestration/); los Datos del Sistema de IA de la ficha del modelo | La documentación es exhaustiva para la implementación de referencia; un sistema en producción necesitaría runbooks operativos |
| MAP 2.2: Se rastrea la procedencia de los datos | La declaración de datos y la ficha de datos documentan la procedencia completa del corpus de evaluación y las tarjetas de la KB; licencias de fuente por tarjeta | El rastreo de procedencia cubre solo los datos sintéticos entregados; no hay rastreo de linaje de datos para las entradas en tiempo de ejecución |
| MAP 2.3: Se identifican los riesgos de terceros | El Protocol del cliente LLM abstrae las dependencias de proveedores (véase la [decisión de abstracción de proveedores de LLM](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/)); los proveedores se listan en la Información de Terceros de la ficha del modelo | No hay una evaluación formal de riesgos de terceros; no hay BAA ni revisión contractual con los proveedores de LLM |
| MAP 3.1: Los riesgos de IA se evalúan en cada fase del ciclo de vida | El arnés de evaluación controla cada cambio; red-team nocturno con Promptfoo; umbrales de evaluación aplicados en CI | La evaluación de riesgos es continua vía CI pero está limitada a las dimensiones de evaluación puntuadas; no hay una revisión de riesgos organizacional más amplia en las compuertas del ciclo de vida |
| MAP 3.2: Se documentan los modos de falla y los impactos en cascada | Modos de falla de las barreras de seguridad: elusión de alcance, fallo de escalamiento, fabricación de citaciones; cada uno tiene una prueba en el arnés de evaluación | No hay un análisis formal de modos y efectos de falla (FMEA); los impactos en cascada a través de las fronteras del sistema no se evalúan |
| MAP 3.3: Se incorpora la retroalimentación de las partes interesadas | No hay un ciclo de retroalimentación de partes interesadas externas; diseño informado por orientación publicada y la experiencia de campo del autor | Un sistema en producción necesitaría canales estructurados de retroalimentación de pacientes, clínicos y responsables de cumplimiento |

### MEDIR -- Evaluar y rastrear los riesgos de IA

| Subcategoría | Implementación actual | Evaluación de brechas |
|-------------|----------------------|----------------|
| MEASURE 1.1: Se seleccionan métricas apropiadas | Siete dimensiones de puntuación: corrección de citaciones, cobertura de citaciones, corrección de rechazo, corrección de escalamiento, fidelidad, alucinación, costo/latencia; estratificadas por locale | Las métricas cubren seguridad y calidad; no hay métricas específicas de equidad más allá de la paridad entre locales; no hay métricas de impacto ambiental |
| MEASURE 1.2: Se evalúa el rendimiento del sistema de IA | Compuerta determinista en CI (un cliente stub determinista sin clave, 315 casos); ejecución nocturna con modelo en vivo; red-team con Promptfoo | La compuerta determinista es reproducible; las métricas con modelo en vivo no están congeladas en la ficha del modelo (se reportan en los informes de evaluación) |
| MEASURE 1.3: Los datos de evaluación son representativos | 315 casos a través de 3 locales (en, es-419, pt-BR); 5 grupos de condiciones; categorías de referencia (golden) + adversarias + sin coincidencia | Muestra pequeña; no hay estratificación demográfica (no se recopilan datos demográficos); sesgo de inglés estadounidense reconocido |
| MEASURE 2.1: Las métricas se documentan y comunican | Informes de evaluación publicados por ejecución; Métricas Clave de la ficha del modelo | Los informes se generan por ejecución; no hay un panel de seguimiento longitudinal |
| MEASURE 2.2: Se definen los umbrales de riesgo | Umbrales estrictos: fidelidad >= 0.85, alucinación <= 0.10; compuerta binaria: corrección de rechazo = 1.000, corrección de escalamiento = 1.000 | Los umbrales son nítidos pero no están ajustados al riesgo; no hay un marco de respuesta escalonado (por ejemplo, ámbar frente a rojo) |
| MEASURE 2.3: Existen mecanismos de monitoreo y retroalimentación | Evaluación en CI en cada cambio; red-team nocturno; spans de OpenTelemetry en cada nodo; sumideros de Langfuse Cloud y Phoenix (véase la [decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/)) | El monitoreo cubre la implementación de referencia; no hay alertas de producción, monitoreo de SLA ni una canalización de detección de degradación |
| MEASURE 3.1: Se evalúan el sesgo y la equidad | Paridad entre locales aplicada: umbrales idénticos para en, es-419, pt-BR; corrección de rechazo y escalamiento uniforme entre locales | No hay evaluación de subgrupos demográficos (el agente no toma ninguna entrada demográfica); el sesgo de locale se limita al vocabulario, no a la equidad de resultados |
| MEASURE 4.1: Los resultados de la medición se usan para la mejora | Los hallazgos del red-team se incorporan al banco de semillas adversarias; la regresión de evaluación bloquea cambios; las notas de versión rastrean los cambios relevantes para la seguridad | El ciclo de mejora es interno al repositorio; no hay alimentación de hallazgos de auditoría externa ni datos de vigilancia posterior a la comercialización |

### GESTIONAR -- Priorizar y actuar sobre los riesgos de IA

| Subcategoría | Implementación actual | Evaluación de brechas |
|-------------|----------------------|----------------|
| MANAGE 1.1: Las decisiones de tratamiento del riesgo se documentan | Los registros de decisiones de arquitectura documentan las decisiones de diseño que afectan el riesgo (la [decisión de barreras de seguridad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/), la [decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/), la [decisión del arnés de evaluación](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0003-eval-harness/), la [decisión del grafo de ejecución por streaming](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0010-streaming-execution-graph/)) | Los registros de decisiones recogen la intención de diseño; no hay un registro de riesgos formal con planes de tratamiento y aceptación del riesgo residual |
| MANAGE 1.2: Los sistemas de IA están diseñados para fallar de forma segura | Las barreras de seguridad se activan antes del LLM (clasificador de alcance, plantillas de rechazo, enrutador de escalamiento); la exigencia de citaciones rechaza ante una no coincidencia; eventos de error por streaming para fallas posteriores al primer byte | El manejo de casi-aciertos fuera del corpus es una brecha conocida; el escalamiento subagudo se deja al modelo |
| MANAGE 2.1: Se mitigan los riesgos de IA | Barreras de seguridad deterministas, arnés de evaluación, redacción de PII, un rastro de auditoría de OpenTelemetry, streaming negociado por contenido con eventos de error | Las mitigaciones son de grado de implementación de referencia; producción necesitaría capas adicionales (verificación de la cadena de suministro del modelo, filtrado de salida a escala) |
| MANAGE 2.2: Existen planes de respuesta a incidentes | Proceso de divulgación de seguridad; escaneo de secretos; limitaciones conocidas documentadas en la ficha del modelo | No hay un manual formal de respuesta a incidentes; no hay una rotación de guardia; no hay un esquema de clasificación de severidad |
| MANAGE 2.3: El monitoreo del sistema de IA es continuo | Evaluación en CI en cada cambio; red-team nocturno con Promptfoo; spans de OpenTelemetry en cada turno; compuertas de costo/latencia | El monitoreo es a nivel de repositorio; no hay alertas de producción, detección de anomalías ni reversión automatizada |
| MANAGE 3.1: Los riesgos de IA se comunican a las partes interesadas | La ficha del modelo, la postura regulatoria, la declaración de datos y los documentos de gobernanza de esta sección son públicos | La comunicación es pasiva (documentos publicados); no hay un proceso activo de notificación a las partes interesadas ante cambios de riesgo |
| MANAGE 4.1: Las políticas y procedimientos se mantienen | Control de cambios basado en registros de decisiones; la sección de control de cambios de la postura regulatoria requiere un registro de decisión para los cambios de alcance; las notas de versión rastrean los cambios | Las políticas son a nivel de repositorio; no hay un sistema de gestión de políticas empresarial; no hay un ciclo anual de revisión de políticas |

## Estado actual

La implementación de referencia demuestra prácticas del NIST AI RMF en las siguientes áreas:

- **GOBERNAR**: Trazabilidad basada en registros de decisiones, postura regulatoria documentada, decisiones
  transparentes de barreras de seguridad, ficha del modelo y postura regulatoria públicas
- **MAPEAR**: Casos de uso y fronteras de lo que queda fuera de alcance definidos, procedencia de datos documentada,
  modos de falla identificados (casi-aciertos fuera del corpus, escalamiento subagudo), declaraciones honestas
  de limitaciones
- **MEDIR**: Arnés de evaluación de siete dimensiones con compuerta determinista en CI, puntuación
  estratificada por locale, pruebas adversarias nocturnas, ejecución trazada con OpenTelemetry
- **GESTIONAR**: Arquitectura con barreras de seguridad antes del LLM, tratamiento del riesgo documentado en
  registros de decisiones, regresión de evaluación que bloquea cambios, proceso de divulgación pública

La evaluación anterior es honesta sobre lo que es una demostración de implementación de referencia
frente a un programa de gestión de riesgos de grado de producción. Las cuatro funciones se abordan
a la profundidad que un artefacto de referencia puede demostrar razonablemente: documentación estructurada,
medición automatizada, controles de seguridad deterministas y comunicación transparente.

Lo que el repositorio no tiene -- comités de gobernanza formales, registros de riesgos con
puntuación de severidad, manuales de respuesta a incidentes, evaluaciones de riesgos de terceros, marcos
graduales de aceptación de riesgos, canalizaciones de monitoreo en producción -- está documentado explícitamente
en la columna de Evaluación de brechas de cada subcategoría.

## Camino a producción

Un despliegue en producción necesitaría establecer:

1. **Estructura de gobernanza formal**: Comité de riesgos de IA, roles y responsabilidades definidos,
   separación de funciones entre desarrolladores y revisores, juntas asesoras de partes interesadas
   (paciente, clínica, ética)
2. **Registro de riesgos**: enumeración sistemática de los riesgos de IA con puntuación de severidad, evaluación
   de probabilidad, planes de tratamiento, aceptación del riesgo residual y asignación de responsable del riesgo
3. **Medición ampliada**: métricas de equidad más allá de la paridad entre locales, evaluación de impacto
   ambiental, evaluación de subgrupos demográficos donde corresponda, seguimiento longitudinal del rendimiento,
   detección automatizada de deriva
4. **Respuesta a incidentes**: manual formal de RI con clasificación de severidad, rutas de escalamiento,
   plantillas de comunicación, proceso de revisión posterior al incidente, procedimientos de notificación regulatoria
5. **Gobernanza de terceros**: evaluaciones de riesgos de los proveedores de LLM, BAA donde
   corresponda, revisión contractual del procesamiento de datos, verificación de la cadena de suministro de la
   procedencia del modelo
6. **Monitoreo continuo**: alertas de producción, detección de anomalías, reversión automatizada,
   alerta temprana de degradación, monitoreo de SLA, planificación de capacidad
7. **Preparación para auditorías**: automatización de la recopilación de evidencia, retención del registro de auditoría (6 años para
   HIPAA, según corresponda), registro a prueba de manipulaciones, interfaz de consulta para auditores

Los patrones del repositorio -- contratos de evaluación, trazabilidad por registros de decisiones, instrumentación
de OpenTelemetry, arquitectura con barreras de seguridad primero -- aceleran la construcción de cada una de estas
capacidades. Son la base, no la estructura terminada.

## Véase también

- [Postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) -- frontera de FDA/OMS/MHRA/Ley de IA de la UE
- [Ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) -- Ficha de Modelo Aplicada CHAI
- [Clasificación de la Ley de IA de la UE](/ai-agent-eval-harness-healthtech-docs/es-419/governance/eu-ai-act/) -- clasificación del nivel de riesgo de la Ley de IA de la UE
- [Modelo de amenazas OWASP / ATLAS](/ai-agent-eval-harness-healthtech-docs/es-419/governance/owasp-atlas-threat-model/) -- modelo de amenazas
- [Decisión de barreras de seguridad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/) -- diseño de barreras de seguridad
- [Decisión de observabilidad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/) -- diseño de observabilidad
