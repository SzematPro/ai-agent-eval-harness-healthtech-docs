---
title: Clasificación y mapeo de la Ley de IA de la UE
description: Una clasificación honesta del nivel de riesgo según la Ley de IA de la UE y un mapeo de artículos para una implementación de referencia con datos sintéticos no comercializada en el mercado de la UE.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Clasificación y mapeo de la Ley de IA de la UE

Mapea la implementación de referencia `ai-agent-eval-harness-healthtech` frente al
[Reglamento (UE) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
(la Ley de IA de la UE). Este documento ofrece una clasificación honesta del sistema
según los niveles de riesgo de la Ley y mapea los artículos relevantes a los patrones
de gobernanza existentes del repositorio.

Léase junto con la [postura regulatoria](../reference/regulatory-posture.md) y el
[mapeo del NIST AI RMF](nist-ai-rmf.md).

## Clasificación del nivel de riesgo

### Clasificación: No es un sistema de IA de alto riesgo

La Ley de IA de la UE establece un marco de riesgo de cuatro niveles: prohibido, alto riesgo,
riesgo limitado (obligaciones de transparencia) y riesgo mínimo. La clasificación de este sistema:

| Nivel | Evaluación | Justificación |
|------|-----------|-----------|
| **Prohibido** (Art. 5) | No aplica | El sistema no despliega técnicas subliminales, no explota vulnerabilidades, no realiza puntuación social ni identificación biométrica en tiempo real |
| **Alto riesgo** (Anexo III) | No aplica | El sistema no está listado en ninguna categoría de alto riesgo del Anexo III. No lo usan autoridades públicas para la elegibilidad de prestaciones (Art. III.5(a)), la puntuación crediticia (Art. III.5(c)), el despacho de emergencias (Art. III.6(d)), ni ninguna otra enumeración del Anexo III |
| **Riesgo limitado** (Art. 50) | Potencialmente aplicable | Si se despliega como un chatbot que interactúa con ciudadanos de la UE, aplicarían las obligaciones de transparencia del Art. 50: se debe informar a los usuarios que están interactuando con un sistema de IA |
| **Riesgo mínimo** | Clasificación actual | Como implementación de referencia pública no comercializada en el mercado de la UE como producto o servicio, el sistema queda por debajo del umbral de la obligación de transparencia. No existe despliegue en la UE; la demostración en Hugging Face Spaces no se comercializa a usuarios de la UE |

### Por qué no es de alto riesgo según el Anexo III

El agente es un coach de bienestar para la adherencia a la medicación, orientado al paciente, que no:

- Clasifica llamadas de emergencia ni despacha a los primeros respondedores (Anexo III, punto 6(d))
- Evalúa la elegibilidad para servicios o prestaciones públicas (Anexo III, punto 5(a))
- Evalúa la solvencia crediticia (Anexo III, punto 5(c))
- Realiza identificación biométrica o reconocimiento de emociones
- Actúa como un dispositivo médico que requiera marcado CE bajo el MDR/IVDR
- Influye en elecciones, opera infraestructura crítica ni desempeña funciones de aplicación de la ley

La función de escalamiento ante señales de alarma reconoce siete patrones agudos y muestra
orientación sobre servicios de emergencia. Explícitamente no es una herramienta de triaje; no prioriza,
enruta ni despacha. La lógica de escalamiento es determinista y basada en reglas (una lista de patrones
con versiones), diseñada para que el operador humano, no el modelo, tenga la decisión de enrutamiento.

### Artículo 53: Consideraciones sobre IA de propósito general (GPAI)

La implementación de referencia usa modelos fundacionales (Groq, Cerebras, OpenAI, Anthropic)
detrás de un delgado Protocol del cliente LLM (véase la
[decisión de abstracción de proveedores de LLM](../adr/adr-0002-llm-vendor-abstraction.md)). No
comercializa por sí misma un modelo GPAI en el mercado de la UE. Las obligaciones de GPAI (documentación
técnica, cumplimiento de derechos de autor, resumen de los datos de entrenamiento) recaen sobre los
proveedores de los modelos, no sobre esta aplicación derivada.

## Mapa de relevancia artículo por artículo

| Artículo | Obligación | Cobertura actual | Brecha |
|---------|-----------|-----------------|-----|
| Art. 9 (Gestión de riesgos) | Identificación, análisis y mitigación continuos de riesgos | El arnés de evaluación identifica regresiones de seguridad/citación/escalamiento en cada cambio; los registros de decisiones de arquitectura documentan las decisiones de tratamiento del riesgo | No hay un sistema formal de gestión de riesgos con revisión periódica; no hay un registro de riesgos sistemático |
| Art. 10 (Datos y gobernanza de datos) | Gobernanza de datos de entrenamiento/validación, representatividad, examen de sesgos | La declaración de datos documenta la metodología de generación, la procedencia, las licencias y la lista de exclusiones; la puntuación de paridad entre locales examina el sesgo entre locales | La gobernanza de datos cubre solo conjuntos de datos sintéticos; no hay un marco de gobernanza de datos reales |
| Art. 11 + Anexo IV (Documentación técnica) | Descripción del sistema, especificaciones de diseño, métricas de rendimiento | La ficha del modelo (formato CHAI), la especificación del sistema, los registros de decisiones de arquitectura, la postura regulatoria, la declaración de datos | La documentación es exhaustiva para una implementación de referencia; el Anexo IV requiere un formato y una profundidad específicos |
| Art. 12 (Conservación de registros / logging) | Registro automático de eventos para la trazabilidad | Spans de OpenTelemetry y OpenInference en cada nodo, llamada al LLM, recuperación y decisión de barrera de seguridad (véase la [decisión de observabilidad](../adr/adr-0006-observability.md)); sumideros de Langfuse Cloud y Phoenix | El registro existe pero es de grado de observabilidad, no de grado de auditoría; no hay registros a prueba de manipulaciones; no hay un período de retención definido |
| Art. 13 (Transparencia y suministro de información) | Sistema diseñado para la transparencia; los usuarios comprenden los resultados | Rastro de decisiones de barrera de seguridad en cada respuesta; conjunto de citaciones en cada afirmación clínica; ficha del modelo pública; la respuesta de la demostración lleva un aviso | La transparencia es a nivel de respuesta; el Art. 13 requiere documentación orientada al implementador y explicaciones orientadas al usuario |
| Art. 14 (Supervisión humana) | Diseñado para una supervisión humana eficaz | Nodo opcional de revisión con humano en el ciclo mediante una interrupción de LangGraph (véase la [decisión del grafo de ejecución por streaming](../adr/adr-0010-streaming-execution-graph.md)); el operador humano puede aprobar/editar/rechazar borradores de alto riesgo | La revisión con humano en el ciclo está desactivada por defecto; no hay una interfaz de supervisión humana dedicada para el monitoreo; no hay documentación del mecanismo de anulación |
| Art. 15 (Exactitud, robustez, ciberseguridad) | Niveles apropiados de exactitud, robustez y ciberseguridad | Compuerta de evaluación determinista (218/218 aprobados); red-team nocturno; barreras de seguridad antes del LLM; redacción de PII; instrumentación de OpenTelemetry; escaneo de secretos en CI | La exactitud se mide sobre datos sintéticos; la robustez se prueba sobre un conjunto adversario curado; no hay pruebas de penetración ni evaluación formal de seguridad |
| Art. 17 (Sistema de gestión de la calidad) | SGC documentado para sistemas de alto riesgo | El arnés de evaluación como sistema de medición; control de cambios basado en registros de decisiones; compuertas de evaluación que bloquean cambios; notas de versión | No hay un SGC formal; no hay un manual de calidad; no hay un ciclo de auditoría interna |

## Estado actual

La implementación de referencia es un artefacto público de código, no un producto o servicio comercializado
en el mercado de la UE. Como tal, no está sujeta a las obligaciones de la Ley en este momento. La
evaluación anterior valora la preparación en caso de que la misma arquitectura se desplegara dentro de la UE.

Lo que el repositorio demuestra hoy:

- **Honestidad sobre el nivel de riesgo**: El sistema se clasifica explícitamente como no de alto riesgo, con una
  justificación clara vinculada a la enumeración del Anexo III
- **Patrones de gobernanza que se mapean a los artículos de la Ley de IA de la UE**: contratos de evaluación (Art. 9),
  procedencia de datos (Art. 10), documentación técnica (Art. 11), un rastro de auditoría de OpenTelemetry
  (Art. 12), transparencia de citaciones (Art. 13), un nodo de revisión con humano en el ciclo (Art. 14),
  compuertas de seguridad deterministas (Art. 15)
- **Sin exageraciones**: Este documento no afirma cumplimiento de la Ley de IA de la UE. El
  repositorio es una demostración de ingeniería consciente de la gobernanza, no una evaluación de
  conformidad

El documento de [postura regulatoria](../reference/regulatory-posture.md) registra la
frontera bienestar/CDS que mantiene al sistema del lado del bienestar general de la línea,
y las plantillas de rechazo hacen cumplir esa frontera en el código.

## Camino a producción

Desplegar esta arquitectura dentro del mercado de la UE requeriría:

1. **Obligaciones de transparencia (Art. 50)**: Si se clasifica como de riesgo limitado (chatbot),
   se debe informar a los usuarios que están interactuando con un sistema de IA. El aviso de la demostración
   aborda esto parcialmente; la divulgación formal requeriría revisión legal
2. **Evaluación de conformidad**: Si algún cambio de funcionalidad empuja al sistema hacia el Anexo III
   (por ejemplo, agregar CDS orientado al clínico, enrutamiento de despacho de emergencias), se requiere una
   evaluación de conformidad completa según la categoría correspondiente del Anexo III antes de la comercialización
3. **Registro ante la Oficina de IA de la UE**: Los sistemas de alto riesgo deben registrarse en la base de datos de la UE
   antes del despliegue; los sistemas de riesgo limitado pueden tener requisitos de notificación
4. **Documentación técnica (Anexo IV)**: Descripción formal del sistema, decisiones de diseño,
   gobernanza de los datos de entrenamiento, métricas de rendimiento, medidas de gestión de riesgos -- gran parte
   de lo cual se mapea a artefactos existentes del repositorio (la ficha del modelo, la especificación del sistema,
   los registros de decisiones de arquitectura) pero necesitaría reestructurarse al formato del Anexo IV
5. **Monitoreo posterior a la comercialización**: Recopilación y análisis sistemáticos de datos de rendimiento
   de las instancias desplegadas; reporte de incidentes a las autoridades de vigilancia del mercado
6. **Evaluación de impacto en la protección de datos (DPIA)**: Según el Art. 35 del RGPD si el sistema
   procesa datos personales a escala; requeriría un documento de DPIA separado
7. **Diseño de la supervisión humana**: Documentación formal de diseño para los mecanismos de supervisión humana,
   incluidos los procedimientos de anulación, los requisitos de competencia para los supervisores humanos y las
   rutas de escalamiento

Los patrones de gobernanza de este repositorio -- trazabilidad por registros de decisiones, control mediante
el arnés de evaluación, arquitectura con barreras de seguridad primero, instrumentación de OpenTelemetry --
proporcionan una base sólida para cumplir estos requisitos. Reducen el esfuerzo de "construir desde cero"
a "formalizar y extender patrones existentes".

## Véase también

- [Postura regulatoria](../reference/regulatory-posture.md) -- frontera regulatoria que el diseño respeta
- [Ficha del modelo](../reference/model-card.md) -- Ficha de Modelo Aplicada CHAI
- [Mapeo del NIST AI RMF](nist-ai-rmf.md) -- mapeo del NIST AI RMF
- [Modelo de amenazas OWASP / ATLAS](owasp-atlas-threat-model.md) -- modelo de amenazas
- [Decisión de barreras de seguridad](../adr/adr-0005-guardrails.md) -- diseño de barreras de seguridad
