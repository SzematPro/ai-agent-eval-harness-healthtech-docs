---
title: Plan de detección de deriva
description: Detección de deriva basada en el arnés de evaluación en la implementación de referencia y los requisitos para el monitoreo de deriva de nivel de producción.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Plan de detección de deriva

> Documenta las capacidades de detección de deriva de la implementación de referencia
> `ai-agent-eval-harness-healthtech` y los requisitos para el monitoreo de deriva de nivel de producción.
> Cubre la detección de deriva basada en el arnés de evaluación, la regresión del desempeño del modelo y el
> monitoreo de la relevancia de la base de conocimiento.
>
> Léase junto con la [ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) y el
> [plan de registro de auditoría](/ai-agent-eval-harness-healthtech-docs/es-419/governance/audit-logging-plan/).

## Tipos de deriva

| Tipo de deriva | Definición | Relevancia para este sistema |
|-----------|------------|--------------------------|
| **Deriva de datos** | La distribución de los datos de entrada cambia con el tiempo | Las consultas de los usuarios pueden cambiar en tema, mezcla de idiomas o complejidad; el contenido de la KB puede quedar obsoleto |
| **Deriva de concepto** | Cambia la relación entre las entradas y las salidas deseadas | La orientación sobre adherencia a la medicación evoluciona; las guías clínicas se actualizan; nuevos medicamentos entran al mercado |
| **Deriva del modelo** | El desempeño del modelo se degrada sobre las mismas entradas | El proveedor de LLM actualiza los pesos del modelo; los cambios de prompt afectan la calidad de la salida; los cambios del modelo de embeddings afectan la recuperación |
| **Deriva de evaluación** | El corpus de evaluación ya no representa los patrones de uso reales | Los casos de evaluación dejan de ser representativos a medida que cambia el comportamiento del usuario; el panorama adversarial evoluciona |

## Mecanismos actuales de detección de deriva

### El arnés de evaluación como detector de deriva

El principal mecanismo de detección de deriva en la implementación de referencia es el arnés de evaluación.
No es un pipeline tradicional de detección de deriva, pero cumple un propósito similar al
detectar regresiones de desempeño que podrían indicar deriva.

| Mecanismo | Qué detecta | Frecuencia | Disparador |
|-----------|----------------|-----------|---------|
| **Compuerta determinista de CI** | Regresiones de barreras de seguridad (rechazo, escalamiento, citación) sobre el corpus curado | Cada cambio | Falla de compilación si se incumple cualquier umbral |
| **Ejecución de evaluación en vivo** | Desempeño del modelo (fidelidad, alucinación) frente a un LLM en vivo | Manual / nocturna | Incumplimiento de umbral registrado como regresión |
| **Red-team nocturno con Promptfoo** | Robustez adversarial frente a OWASP LLM Top 10 más casos elaborados a mano | Nocturna | Nuevo patrón adversarial descubierto |
| **Compuertas de costo/latencia** | Regresión de desempeño en el uso de tokens o la latencia | Cada cambio | Presupuesto por turno excedido |
| **Compuerta de paridad entre configuraciones regionales** | Degradación de desempeño específica de una configuración regional | Cada cambio | Incumplimiento de umbral de configuración regional en cualquier dimensión |

### Umbrales de evaluación

| Dimensión | Umbral | Señal de deriva |
|-----------|-----------|-------------|
| Fidelidad | >= 0.85 | Una caída por debajo de 0.85 sugiere que la calidad de la salida del modelo se degradó o que la relevancia de la KB cambió |
| Alucinación | <= 0.10 | Un aumento por encima de 0.10 sugiere que el modelo está generando contenido sin respaldo |
| Corrección de rechazo | = 1.000 | Cualquier fallo significa una regresión de barreras de seguridad (determinista; nunca debería ocurrir) |
| Corrección de escalamiento | = 1.000 | Cualquier fallo significa una regresión de escalamiento (determinista; nunca debería ocurrir) |
| Corrección de citación | = 1.000 | Cualquier citación fabricada significa que la exigencia de citaciones se degradó |
| Costo | Presupuesto de tokens por turno | Exceder el presupuesto sugiere que el patrón de prompt o respuesta cambió |
| Latencia | Presupuesto de latencia por turno | Una regresión sugiere un cambio de proveedor o de infraestructura |

### Detección de deriva adversarial mediante red-team

El red-team nocturno de Promptfoo funciona como un detector de deriva especializado para la robustez
adversarial. Ejercita el sistema frente a:

- Plantillas de inyección de prompts del OWASP LLM Top 10 (que evolucionan con las actualizaciones de Promptfoo)
- Casos adversariales elaborados a mano que cubren la obtención de dosificación, la búsqueda de diagnóstico,
  la extracción del prompt de sistema, la coerción de rol y la divulgación de angustia
- Porciones adversariales en los corpus de evaluación es-419 y pt-BR

Cuando se descubre un nuevo patrón adversarial (ya sea por Promptfoo o por investigación
manual), se reincorpora al banco de semillas adversariales. Esto asegura que el
corpus de evaluación evolucione con el panorama de amenazas.

### Estabilidad del corpus dorado

El corpus de evaluación (218 casos en tres configuraciones regionales) es un conjunto de datos dorado fijo. Proporciona
una línea base estable contra la cual se mide el desempeño. Como el corpus está confirmado
y bajo control de versiones, cualquier cambio de desempeño sobre la misma versión del corpus debe deberse
a un cambio en el sistema (modelo, barreras de seguridad, recuperación o prompts), no a un cambio en
los datos de prueba.

El corpus dorado no sustituye el monitoreo de los patrones de uso reales. Prueba el
sistema frente a un conjunto conocido y curado de escenarios; no detecta si el sistema
está encontrando nuevos tipos de consultas en producción.

## Estado actual

La implementación de referencia detecta la deriva mediante la regresión del arnés de evaluación, no mediante
monitoreo continuo. Los mecanismos vigentes:

1. **Regresión de evaluación controlada por compuerta**: Cada cambio de código se prueba contra el corpus curado.
   Una regresión en cualquier umbral reprueba la compilación, lo que obliga a investigar antes de la fusión.
   Esto captura la deriva del modelo (si el proveedor de LLM actualiza pesos), la deriva de las barreras de seguridad (si
   un cambio de código debilita una barrera) y la deriva de recuperación (si los cambios de embeddings o de la KB
   afectan la calidad de la recuperación).

2. **Pruebas adversariales nocturnas**: Promptfoo ejercita el sistema frente a plantillas
   adversariales en evolución. Una nueva técnica de elusión descubierta por la ejecución nocturna es una
   forma de detección de deriva adversarial.

3. **Aplicación de paridad entre configuraciones regionales**: El arnés de evaluación sujeta las tres configuraciones regionales a los mismos
   umbrales, lo que detecta regresiones específicas de configuración regional que podrían indicar deriva en la
   capacidad multilingüe del modelo.

4. **Aplicación de presupuesto de costo/latencia**: Los presupuestos de costo y latencia por turno capturan la
   deriva de desempeño que podría indicar cambios de proveedor, inflación de prompts o
   degradación de infraestructura.

Lo que no está vigente:

- **Sin detección automatizada de deriva de concepto**: El sistema no monitorea si su
  contenido de KB está quedando obsoleto en relación con las guías clínicas actuales. Las fechas
  `accessed_at` de las tarjetas de KB se registran pero no se comprueban automáticamente para la vigencia.
- **Sin monitoreo en producción**: No se recolectan ni se analizan datos de usuarios reales para la deriva.
  El corpus de evaluación es el único conjunto de datos de desempeño.
- **Sin monitoreo de la distribución de entrada**: Sin seguimiento de la distribución de temas de consulta,
  la mezcla de idiomas o las tendencias de complejidad a lo largo del tiempo.
- **Sin cadencia automatizada de reevaluación**: El arnés de evaluación se ejecuta bajo demanda (cambios) y de
  forma nocturna (red-team); no hay una reevaluación integral programada.

## Camino a producción

Una detección de deriva de nivel de producción requeriría:

1. **Pipeline automatizado de detección de deriva**: Monitoreo continuo del desempeño del modelo
   frente a un conjunto de validación reservado; pruebas estadísticas de cambio de distribución en
   las características de entrada (temas de consulta, idioma, complejidad); alertas automatizadas cuando la deriva
   excede umbrales definidos

2. **Monitoreo de regresión de desempeño**: Seguimiento longitudinal de todas las dimensiones de evaluación
   (fidelidad, alucinación, corrección de rechazo, corrección de escalamiento, corrección de
   citación); análisis de tendencias con intervalos de confianza; alertas automatizadas de degradación
   antes de que se incumplan los umbrales

3. **Detección de deriva de concepto para la relevancia de la KB**: Monitoreo automatizado de la
   vigencia de las tarjetas de KB frente a las publicaciones fuente; reindexación programada de las URL fuente para detectar
   cambios de contenido; alertas cuando el contenido fuente diverge del contenido de la tarjeta

4. **Cadencia programada de reevaluación**: Ejecuciones integrales de evaluación semanales frente al
   corpus completo; evaluación mensual con modelo en vivo y umbrales actualizados; evaluación adversarial
   trimestral con nuevas técnicas de ataque

5. **Monitoreo de la distribución de entrada**: Seguimiento de la distribución de temas de consulta, la mezcla
   de idiomas y la complejidad a lo largo del tiempo; pruebas estadísticas de cambio de distribución; alertas
   cuando los patrones de uso reales divergen significativamente del corpus de evaluación

6. **Seguimiento de versiones de modelo**: Registro de las versiones de modelo del proveedor de LLM en cada ejecución de evaluación;
   correlación de los cambios de desempeño con las actualizaciones de versión del modelo; procedimientos de reversión
   ante cambios de modelo iniciados por el proveedor

7. **Detección de deriva de embeddings**: Reindexación periódica del corpus de la KB; comparación
   de las distribuciones de embeddings a lo largo del tiempo; alertas ante cambios significativos que podrían
   indicar cambios en el modelo de embeddings

8. **Bucle de retroalimentación**: Recolección de retroalimentación de usuarios (implícita y explícita); integración
   de las señales de retroalimentación en el corpus de evaluación; mejora continua del conjunto de datos
   dorado a partir de los patrones de uso en producción

## Véase también

- [Ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) -- CHAI Applied Model Card, métricas clave
- [Declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/) -- ficha del conjunto de datos con metodología de generación
- [Plan de registro de auditoría](/ai-agent-eval-harness-healthtech-docs/es-419/governance/audit-logging-plan/) -- plan de registro de auditoría
- [Mapeo del NIST AI RMF](/ai-agent-eval-harness-healthtech-docs/es-419/governance/nist-ai-rmf/) -- función Measure del NIST AI RMF
- [Diseño del arnés de evaluación](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0003-eval-harness/) -- diseño del arnés de evaluación
