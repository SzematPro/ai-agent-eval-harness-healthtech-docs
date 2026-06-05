---
title: Mapeo de gestión de riesgo de modelos de la CMF Norma 20
description: Cómo los patrones de gobernanza de la implementación de referencia se mapean a los principios de gestión de riesgo de modelos de la CMF Norma 20 de Chile para instituciones financieras.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Mapeo de gestión de riesgo de modelos de la CMF Norma 20

> Mapea la implementación de referencia `ai-agent-eval-harness-healthtech` frente a la
> [Norma de Carácter General N.º 20](https://www.cmfchile.cl/portal/principal/613/w3-channel.html) (CMF NCG 20),
> la regulación de la Comisión para el Mercado Financiero (CMF) de Chile sobre requisitos
> de capital basados en riesgo y gestión de riesgo de modelos para instituciones financieras. Aunque
> este sistema no es un producto financiero, los patrones de gobernanza que demuestra --
> documentación del modelo, arnés de evaluación, barreras de seguridad, observabilidad -- se mapean directamente a
> los principios de gestión de riesgo de modelos que las entidades reguladas por la CMF deben seguir.
>
> Léase junto con la [postura regulatoria](../reference/regulatory-posture.md) y el
> [mapeo del NIST AI RMF](nist-ai-rmf.md).

## Aplicabilidad

La CMF Norma 20 aplica a bancos, instituciones financieras y otras entidades reguladas por
la Comisión para el Mercado Financiero de Chile. Esta implementación de referencia no es
un producto financiero, no es ofrecida por una entidad regulada por la CMF y no está sujeta a
los requisitos de la Norma 20.

El propósito de este mapeo es demostrar que los patrones de gobernanza de esta
implementación de referencia se alinean con los principios de gestión de riesgo de modelos que los
reguladores financieros de todo el mundo esperan. Una institución financiera que evalúe esta arquitectura para
uso interno (p. ej., un chatbot de atención al cliente asistido por IA, un pipeline de procesamiento de
documentos, una herramienta de monitoreo de cumplimiento) encontraría estos patrones transferibles.

## Mapeo de los principios de gestión de riesgo de modelos

### Desarrollo y documentación del modelo

| Principio de la Norma 20 | Implementación actual | Evaluación de brechas |
|---------------------|----------------------|----------------|
| **Inventario de modelos** | La ficha del modelo (formato CHAI Applied Model Card) documenta el propósito del agente, las entradas, las salidas, los modelos fundacionales, las fuentes de datos, las métricas de desempeño y las limitaciones | El inventario cubre un solo modelo; una institución financiera necesitaría un inventario de modelos que cubra todos los modelos en uso con clasificación por nivel de riesgo |
| **Documentación del modelo** | Los registros de decisiones de arquitectura documentan las decisiones de diseño; la ficha del modelo aporta la documentación a nivel de modelo; la declaración de datos documenta los conjuntos de datos | La documentación es exhaustiva para una implementación de referencia de propósito único; producción necesitaría informes de validación de modelos, análisis de sensibilidad y evaluaciones de limitaciones para cada modelo |
| **Solidez conceptual** | StateGraph de LangGraph de seis nodos con responsabilidades explícitas por nodo (intake, guardrail_pre, retrieve_context, generate_response, guardrail_post, closing); las barreras de seguridad se ejecutan antes del LLM; exigencia de citaciones en cada afirmación clínica | La arquitectura está bien estructurada y es comprobable; un modelo financiero necesitaría una revisión conceptual independiente por parte de expertos del dominio |

### Validación del modelo

| Principio de la Norma 20 | Implementación actual | Evaluación de brechas |
|---------------------|----------------------|----------------|
| **Validación independiente** | El arnés de evaluación actúa como un sistema de medición independiente; la compuerta de CI exige umbrales sin posibilidad de anulación por parte del desarrollador; un cliente stub determinista aísla el comportamiento de las barreras de seguridad de la variabilidad del modelo | El arnés de evaluación lo construye el mismo autor que el sistema; la verdadera independencia requiere un equipo de validación separado |
| **Análisis de resultados** | Compuerta de evaluación determinista: todos los casos curados pasan; corrección de rechazo = 1.000; corrección de escalamiento = 1.000; fidelidad >= 0.85; alucinación <= 0.10 | El análisis cubre datos sintéticos; producción necesitaría análisis de resultados sobre datos de transacciones reales con pruebas de significancia estadística |
| **Comparación con referencias** | Puntuación estratificada por configuración regional (en, es-419, pt-BR sujetos a umbrales idénticos); comparación adversarial (Promptfoo OWASP LLM Top 10 más casos elaborados a mano) | La comparación cubre las dimensiones de evaluación definidas; las aplicaciones financieras necesitarían referencias del sector y comparación con pares |
| **Análisis de sensibilidad** | Umbral de similitud de recuperación configurable probado en varias configuraciones de embedder; la abstracción del proveedor de LLM permite probar el intercambio de proveedores | Análisis de sensibilidad limitado; los modelos financieros necesitarían pruebas de sensibilidad sistemáticas en parámetros clave y escenarios de estrés |

### Gobernanza del modelo

| Principio de la Norma 20 | Implementación actual | Evaluación de brechas |
|---------------------|----------------------|----------------|
| **Comité de gobernanza** | Los registros de decisiones de arquitectura recogen la trazabilidad de las decisiones; el arnés de evaluación controla cada cambio; la postura regulatoria exige un registro de decisión para los cambios de alcance | Sin comité de gobernanza formal; proyecto de un solo autor; producción necesitaría un comité de gobernanza de modelos con representación interfuncional |
| **Clasificación por nivel de riesgo** | La postura regulatoria clasifica el sistema como de bienestar general (no un dispositivo médico); el mapeo de la Ley de IA de la UE lo clasifica como de riesgo mínimo | La clasificación es autoevaluada para un solo modelo; las instituciones financieras necesitan un marco de niveles de riesgo que cubra todos los modelos |
| **Gestión de cambios** | Los registros de decisiones documentan los cambios; el arnés de evaluación detecta regresiones en cada cambio; el versionado semántico rastrea las versiones | La gestión de cambios es a nivel de repositorio; producción necesitaría flujos formales de aprobación de cambios, validación previa al despliegue y procedimientos de reversión |
| **Monitoreo continuo** | Evaluación en CI en cada cambio; red-team nocturno con Promptfoo; spans de telemetría en cada nodo; compuertas de costo/latencia; sumideros de observabilidad Langfuse Cloud y Phoenix | El monitoreo cubre la implementación de referencia; producción necesitaría monitoreo continuo del desempeño del modelo, detección de deriva y alertas automatizadas |

### Monitoreo del desempeño del modelo

| Principio de la Norma 20 | Implementación actual | Evaluación de brechas |
|---------------------|----------------------|----------------|
| **Seguimiento del desempeño** | Compuerta de evaluación determinista con umbrales explícitos; informes de evaluación generados en cada ejecución | El seguimiento es por ejecución; producción necesitaría paneles de desempeño longitudinales, análisis de tendencias y detección automatizada de degradación |
| **Monitoreo de umbrales** | Umbrales estrictos: fidelidad >= 0.85, alucinación <= 0.10, corrección de rechazo = 1.000, corrección de escalamiento = 1.000; compuerta binaria de aprobado/reprobado | Los umbrales son binarios; las aplicaciones financieras necesitarían umbrales graduados (verde/ámbar/rojo) con procedimientos de escalamiento |
| **Detección de deriva** | El arnés de evaluación se ejecuta en cada cambio contra un corpus dorado fijo; el red-team nocturno ejercita el sistema; sin detección automatizada de deriva de concepto | La implementación de referencia usa detección de deriva manual (regresión de evaluación); producción necesitaría detección automatizada de deriva, líneas base de desempeño y reevaluación programada |
| **Reporte de excepciones** | Una regresión de evaluación reprueba la compilación; las limitaciones conocidas se documentan en la ficha del modelo | El manejo de excepciones es aprobar-o-reprobar la compilación; producción necesitaría flujos de reporte de excepciones, documentación de aceptación de riesgo y notificación a la alta dirección |

## Estado actual

La implementación de referencia demuestra patrones de gobernanza de gestión de riesgo de modelos
directamente transferibles a un entorno regulado por la CMF:

1. **Documentación del modelo**: La ficha del modelo aporta documentación integral del modelo
   en un formato estandarizado (CHAI Applied Model Card), que incluye propósito, limitaciones,
   métricas de desempeño y riesgos conocidos.

2. **El arnés de evaluación como sistema de medición**: El arnés de evaluación es un sistema de medición
   independiente que evalúa al agente frente a casos curados en siete dimensiones,
   con umbrales deterministas exigidos en CI. Esto se mapea directamente a los requisitos de
   validación de modelos de la Norma 20.

3. **Las barreras de seguridad como controles**: El clasificador de alcance, las plantillas de rechazo y el enrutador
   de escalamiento actúan como controles deterministas que acotan el comportamiento del modelo. En aplicaciones
   financieras, controles análogos limitarían las salidas del modelo a acciones aprobadas.

4. **La observabilidad como monitoreo**: Los spans de telemetría con convenciones semánticas de OpenInference
   aportan monitoreo en tiempo real de cada decisión del modelo, lo que permite la reconstrucción de la
   traza de auditoría y el seguimiento del desempeño. Esto se mapea a los requisitos de monitoreo
   continuo de la Norma 20.

5. **Control de cambios basado en registros de decisiones**: Cada decisión de diseño sustantiva se documenta
   en un registro de decisión de arquitectura, lo que aporta la trazabilidad de las decisiones que los comités
   de gobernanza de modelos requieren.

6. **Limitaciones transparentes**: La ficha del modelo y la postura regulatoria documentan honestamente las
   limitaciones conocidas -- el manejo de casos casi fuera de corpus, las brechas de escalamiento subagudo y
   el comportamiento probabilístico del modelo. Esta transparencia es una fortaleza de gobernanza.

## Camino a producción

Adaptar estos patrones para una institución financiera regulada por la CMF:

1. **Comité de gobernanza de modelos**: Comité interfuncional (riesgo, cumplimiento, TI,
   negocio) con autoridad para aprobar, restringir o retirar modelos
2. **Inventario de modelos y marco de niveles de riesgo**: Inventario integral de todos los modelos
   con clasificación por nivel de riesgo alineada con las expectativas de la CMF; los modelos de mayor riesgo
   reciben validación y monitoreo más intensivos
3. **Validación independiente del modelo**: Equipo de validación dedicado e independiente del desarrollo
   del modelo; informes de validación que cubran solidez conceptual, análisis de resultados,
   análisis de sensibilidad y comparación con referencias
4. **Monitoreo continuo del desempeño**: Detección automatizada de deriva, líneas base de
   desempeño, seguimiento longitudinal y alertas automatizadas ante degradación
5. **Gestión formal de cambios**: Flujos de aprobación de cambios con validación previa al despliegue,
   procedimientos de reversión y monitoreo posterior al despliegue
6. **Gestión de excepciones**: Manejo documentado de excepciones con aceptación de riesgo,
   notificación a la alta dirección y planes de remediación
7. **Reporte regulatorio**: Informes periódicos de riesgo de modelos a la alta dirección y a la
   CMF; cambios materiales de modelos reportados dentro de los plazos requeridos

Los patrones de gobernanza de esta implementación de referencia -- contratos de evaluación, trazabilidad
basada en registros de decisiones, barreras-de-seguridad-antes-del-LLM, instrumentación de telemetría y documentación
honesta de limitaciones -- aportan una base sólida. Son los bloques de construcción procedimentales y técnicos
que una entidad regulada por la CMF ensamblaría en un marco formal de gestión de riesgo de
modelos.

## Véase también

- [Postura regulatoria](../reference/regulatory-posture.md) -- límite regulatorio
- [Ficha del modelo](../reference/model-card.md) -- CHAI Applied Model Card
- [Mapeo del NIST AI RMF](nist-ai-rmf.md) -- mapeo del NIST AI RMF
- [Mapeo de la Ley 19.628 de Chile](chile-ley-19628.md) -- mapeo de protección de datos de Chile
- [Plan de detección de deriva](drift-detection-plan.md) -- plan de detección de deriva
- [Diseño de barreras de seguridad](../adr/adr-0005-guardrails.md) -- diseño de barreras de seguridad
