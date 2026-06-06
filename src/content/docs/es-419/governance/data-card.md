---
title: Ficha de datos
description: Procedencia, postura de licenciamiento y alineación regulatoria del corpus de evaluación sintético y la base de conocimiento de la implementación de referencia pública.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Ficha de datos - Conjunto de evaluación sintético y base de conocimiento

> Este documento es el complemento orientado a la gobernanza de la [declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/).
> Mientras la declaración de datos proporciona la ficha completa del conjunto de datos según la estructura del Google Data Cards Playbook,
> este documento se centra en la trazabilidad de la procedencia, la postura de licenciamiento y la alineación
> regulatoria. Léase junto con la [ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) y la
> [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/).

## Descripción general

La distribución publicada incluye dos conjuntos de datos sintéticos, ambos confirmados como
JSONL bajo control de versiones:

1. **Corpus de evaluación** -- casos conversacionales multiturno curados en tres configuraciones regionales
   (en, es-419, pt-BR). Los casos cubren las categorías dorada, adversarial y de sin coincidencia
   con el comportamiento esperado de etiqueta dorada por turno.
2. **Tarjetas de la base de conocimiento** -- tarjetas estructuradas breves sobre contenido de adherencia a la medicación,
   cada una con metadatos de procedencia (`source_url`, `accessed_at`, `source_license`).

Ambos conjuntos de datos son 100% sintéticos, no contienen PHI ni PII, y son redistribuibles bajo la
licencia MIT. El código circundante es Apache-2.0.

## Procedencia de los datos

### Corpus de evaluación

| Propiedad | Valor |
|----------|-------|
| Formato | JSONL (un objeto JSON por línea) |
| Tamaño | 315 casos (105 en, 105 es-419, 105 pt-BR) |
| Generación | Generación alineada a persona/guion por LLM con bucle productor-crítico |
| Curaduría | 100% de revisión manual por el autor |
| Semillas adversariales | 25 redactadas a mano en inglés más porciones adversariales en es-419/pt-BR |
| Licencia | MIT |

La metodología de generación sigue un pipeline de cuatro etapas: creación de personas (cinco grupos de
condiciones muestreados de rangos epidemiológicos publicados), generación de diálogos con
puntuación productor-crítico sobre la fidelidad a la entrevista motivacional, el cumplimiento del alcance y la
fundamentación, curaduría manual de cada turno generado e inyección de casos adversariales redactados a mano.
La metodología completa se documenta en la [declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/).

### Tarjetas de la base de conocimiento

| Propiedad | Valor |
|----------|-------|
| Formato | JSONL (id, title, text, source_url, source_license, topics, accessed_at) |
| Tamaño | 36 tarjetas |
| Licencia | MIT (contenido parafraseado) |

Cada tarjeta es un resumen estructurado breve parafraseado de fuentes de dominio público:

- **DailyMed** (FDA Structured Product Labeling) -- obra del Gobierno de EE. UU., dominio público
- **MedlinePlus** (US National Library of Medicine) -- obra del Gobierno de EE. UU., dominio público
- **WHO Essential Medicines List** -- consultada para la selección de medicamentos; el contenido de las tarjetas
  se parafrasea de forma independiente, nunca textualmente

Una auditoría de licencias por fuente acompaña a los datos sintéticos. Las tarjetas sin procedencia
fallan la validación al momento de la carga.

### Corpus excluidos

Los siguientes corpus se excluyen explícitamente de la distribución en cualquier forma:

- MedDialog (licencia de uso solo académico)
- ChatDoctor / HealthCareMagic-100K (prohibición de redistribución en los términos de servicio)
- MIMIC-IV / MIMIC-IV-Note (el DUA de PhysioNet prohíbe la redistribución)
- i2b2 / n2c2 (el DUA institucional prohíbe la redistribución)
- Asclepius (CC-BY-NC-SA incompatible con la redistribución permisiva)

## Categorías de datos

El corpus de evaluación se organiza en tres categorías en todas las configuraciones regionales:

| Categoría | Descripción |
|----------|-------------|
| Dorada | Conversaciones de adherencia a la medicación dentro del alcance |
| Adversarial | Intentos de dosificación, diagnóstico, inyección de prompts y coerción de rol |
| Sin coincidencia | Preguntas clínicas sin coincidencia de tarjeta de KB |

La porción en inglés (105 casos) tiene el mismo tamaño que cada
porción no inglesa; las porciones es-419 y pt-BR (105 casos cada una)
incluyen cobertura tanto dorada como adversarial. La base de conocimiento comprende 36
tarjetas de contenido de adherencia a la medicación.

## Resumen de licenciamiento de fuentes

| Fuente | Licencia | Uso en la distribución |
|--------|---------|---------------------|
| DailyMed | Dominio público (Gob. de EE. UU.) | Contenido parafraseado de tarjetas de KB |
| MedlinePlus | Dominio público (Gob. de EE. UU.) | Contenido parafraseado de tarjetas de KB |
| WHO Essential Medicines List | CC-BY-NC-SA | Referencia para la selección de medicamentos; contenido parafraseado de forma independiente |
| Diálogos generados por LLM | MIT | Sin entrada con derechos de autor; salidas redistribuibles bajo MIT |
| Código | Apache-2.0 | Independiente de la licencia de datos |

## Estado actual

Esta implementación de referencia opera con datos 100% sintéticos. Ningún dato real de pacientes,
ningún dato real de EHR y ninguna información identificable entra en la distribución en ningún momento.
La verificación de aceptación de datos en CI rechaza cualquier archivo que no haya pasado una revisión
de identificabilidad.

Controles de gobernanza de datos clave que existen hoy:

- **Política exclusivamente sintética**: aplicada por el flujo de contribución y documentada en
  la [declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/)
- **Metadatos de procedencia**: cada tarjeta de KB lleva `source_url`, `accessed_at` y
  `source_license`; el cargador rechaza las tarjetas sin procedencia
- **Paridad entre configuraciones regionales**: el arnés de evaluación sujeta en, es-419 y pt-BR a umbrales idénticos
  en cada ejecución de CI
- **Control de versiones**: los archivos de datos son JSONL confirmado, versionado junto con el código bajo
  versionado semántico; los cambios al corpus de evaluación o la KB están controlados por compuertas
- **Declaración de IRB**: sin datos de sujetos humanos; la aprobación del IRB no aplica (véase la
  sección IRB de la declaración de datos)

Limitaciones conocidas heredadas de la [declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/):

- Corpus de dominio único; la cobertura es intencionalmente estrecha
- Sesgo de vocabulario clínico en inglés estadounidense en los datos sintéticos, corregido parcialmente por el
  bucle productor-crítico pero documentado como residual
- Las tarjetas de KB están en inglés; una KB localizada está en la hoja de ruta
- Las preguntas clínicas casi fuera de corpus no se rechazan de forma confiable (véase la ficha del modelo,
  "Riesgos y limitaciones conocidos")

## Camino a producción

Un despliegue real que maneje datos de pacientes necesitaría aumentar o reemplazar los conjuntos de datos
sintéticos y atender lo siguiente:

- **Gobernanza de datos reales de pacientes**: aprobación del IRB, consentimiento informado, acuerdos de
  tratamiento de datos y regulaciones de datos de salud específicas de cada jurisdicción (HIPAA, GDPR, Ley
  19.628 de Chile, etc.)
- **Expansión de la base de conocimiento clínica**: el corpus de la demo cubre cinco grupos de
  condiciones; un sistema de producción necesitaría una KB validada clínicamente con revisión
  clínica regular, verificación de fuentes y comprobaciones de vigencia
- **Monitoreo de calidad de datos**: pipelines automatizados para detectar deriva de datos, brechas de
  cobertura y degradación de la calidad de las etiquetas tanto en el corpus de evaluación como en las tarjetas de KB
- **Contenido localizado**: revisión clínica en lengua nativa para cada configuración regional, no solo
  traducción de contenido generado en inglés; rutas de escalamiento clínico específicas de cada configuración regional
- **Políticas de conservación y eliminación de datos**: la implementación de referencia no tiene
  datos de usuario persistentes; producción necesitaría calendarios de conservación, procedimientos de eliminación
  y gestión de solicitudes de acceso de los titulares de datos
- **Auditoría de sesgos**: evaluación sistemática de la representación demográfica en los datos de entrenamiento y
  de evaluación, más allá de las verificaciones de paridad entre configuraciones regionales vigentes

## Véase también

- [Declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/) -- ficha completa del conjunto de datos con metodología de generación
- [Ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) -- CHAI Applied Model Card del agente
- [Postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) -- límite FDA/WHO/MHRA/Ley de IA de la UE
- [Evaluación de preparación para HIPAA](/ai-agent-eval-harness-healthtech-docs/es-419/governance/hipaa-readiness/) -- documento de gobernanza específico de HIPAA
