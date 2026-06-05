---
title: Ficha de datos
description: "El corpus de evaluación sintético y la base de conocimiento: metodología de generación, procedencia, postura de licencias, lista de exclusiones y declaración del IRB."
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Ficha de datos - conjunto de evaluación sintético y KB

> Estructurada según el Google Data Cards Playbook
> (<https://sites.research.google/datacardsplaybook/>). Los quince temas del
> Data Cards Playbook se condensan en los que inciden sobre un conjunto de
> evaluación sintético para una implementación de referencia pública.

## Resumen

La distribución incluye dos conjuntos de datos sintéticos. Ambos son 100%
sintéticos y ambos son redistribuibles bajo la licencia MIT. El código que
los rodea está licenciado por separado bajo Apache-2.0 (consulta la sección
de Declaración de licencias); la licencia de los datos y la licencia del
código son independientes.

1. **Corpus de evaluación** - 218 casos conversacionales multi-turno
   curados entre un paciente simulado y el agente: 100 en inglés (que
   abarcan casos golden, adversariales, de no-coincidencia y de dominio
   expandido), 59 en es-419 y 59 en pt-BR. Cada caso está etiquetado con las
   dimensiones de evaluación que ejercita (cumplimiento de alcance,
   fundamentación, alucinación, escalamiento, fidelidad de EM, estabilidad
   de persona, tono empático, locale, contabilidad de latencia/costo,
   balance de rechazos) y el comportamiento esperado de etiqueta dorada
   (plantilla de rechazo correcta, bandera de escalamiento correcta,
   conjunto de citaciones).
2. **Tarjetas de la base de conocimiento** - 36 tarjetas cortas y
   estructuradas sobre contenido de adherencia a la medicación a lo largo de
   ocho dominios: hipertensión, DM2, VIH, warfarina, asma, estatinas,
   técnica de inhalador, adherencia a antidepresivos, apoyo al cuidador,
   barreras de costo, carga de pastillas, alfabetización en salud, patrones
   de barreras de adherencia y puntos de conversación de entrevista
   motivacional. Cada tarjeta lleva `source_url`, `accessed_at` y una nota
   de procedencia/paráfrasis.

Ambos conjuntos de datos se entregan como JSONL versionado en la
distribución publicada: el corpus de evaluación como archivos separados por
locale y la base de conocimiento como un único archivo de tarjetas. Una
auditoría de licencias por fuente acompaña los datos. Los rangos iniciales
de diseño ("50-200 turnos" y "30-50 tarjetas") eran provisionales; los
conteos anteriores son lo que la distribución actual entrega.

## Autoría y financiamiento

Escrito por Waldemar Szemat como una implementación de referencia pública.
Sin financiamiento externo. Sin patrocinador corporativo. Sin socio
institucional. Los conjuntos de datos sintéticos se publican bajo la
licencia MIT. El código que los rodea está licenciado bajo Apache-2.0 (fue
MIT hasta la v0.6.0 y cambió en la v1.0.0, consulta
[ADR-0008](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0008-licensing/)); las decisiones de licencia de
los datos y del código son independientes.

## Motivación

Los corpus públicos existentes de diálogo médico o son incompatibles en
licencia con la redistribución permisiva (MedDialog, ChatDoctor /
HealthCareMagic, Asclepius), están bajo un Acuerdo de Uso de Datos que
prohíbe la redistribución (MIMIC-IV, MIMIC-IV-Note, i2b2/n2c2), o fueron
recolectados sin el consentimiento informado de los participantes para
entrenamiento de LLM aguas abajo. Una implementación de referencia que
pretende evaluar un agente conversacional de salud no debería depender de
ninguno de esos corpus, punto. El conjunto de evaluación sintético es la
respuesta: puede reproducirse, redistribuirse, modificarse y auditarse sin
tocar un Acuerdo de Uso de Datos y sin involucrar un solo registro real de
paciente.

La motivación también es pedagógica. Los ingenieros y pares de IA que lean
este proyecto deberían poder inspeccionar el conjunto de evaluación
completo, reproducir su generación y entender qué está diseñado para
provocar cada semilla adversarial.

## Uso previsto

Uso previsto primario: impulsar el arnés de evaluación de esta
implementación de referencia, comparar (benchmark) configuraciones del mismo
diseño de agente y proporcionar una referencia pública contra la cual otros
agentes conversacionales de salud multi-turno puedan compararse en las diez
dimensiones de evaluación.

Uso previsto secundario: un ejemplo didáctico para la construcción de un
conjunto de evaluación sintético bajo el encuadre del Data Cards Playbook.

Usos fuera de alcance: entrenar un modelo de producción destinado a la
interacción con pacientes reales; validación clínica de cualquier
afirmación clínica; sustitución de la investigación con sujetos humanos
aprobada por un IRB; benchmarking de herramientas de soporte a la decisión
clínica (el conjunto de datos está orientado al paciente, no orientado al
clínico, por diseño; consulta la
[postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/)).

## Sujeto primario de los datos

Personas sintéticas. No hay sujetos humanos de datos. Las personas se
generan por completo con LLM mediante un paso de generación alineado a
persona-y-guion. Ninguna persona corresponde a un individuo real.
No hay PHI presente. No hay PII presente. No hay ningún registro médico real
presente.

Esta es una política dura y la impone la verificación de aceptación del
conjunto de datos: el flujo de trabajo de contribución rechaza cualquier
archivo de datos que no haya pasado una revisión de identificabilidad.

## Metodología de generación

La canalización se ejecuta en cuatro etapas.

**Etapa 1 - Personas.** Un paso de generación de personas con LLM produce
personas de pacientes sintéticas a lo largo de cinco grupos de afecciones:
hipertensión, diabetes mellitus tipo 2, VIH (el ancla de adherencia a largo
plazo), warfarina (ancla de índice terapéutico estrecho) y asma (ancla de
PRN-vs-programado). Las distribuciones de adherencia se muestrean de rangos
epidemiológicos publicados para evitar el artefacto de sobre-adherencia
común en los generadores de pacientes sintéticos de uso general.

**Etapa 2 - Generación de diálogo.** Cada persona se alimenta a un paso de
generación con LLM que sigue el patrón alineado a persona/guion (estilo
SynDial y Script-Strategy Aligned Generation). Un bucle productor-crítico
puntúa cada turno generado en tres ejes (fidelidad de entrevista
motivacional, cumplimiento de alcance, fundamentación contra la KB); los
turnos por debajo del umbral se regeneran. El generador y el crítico son
versiones de modelo distintas; el bucle se registra y los registros se
versionan junto al JSONL resultante.

**Etapa 3 - Curaduría.** El autor revisa manualmente el 100% de los turnos
generados. El trabajo de curaduría se enfoca en (a) el realismo de la voz
del paciente, (b) la fidelidad al comportamiento esperado de etiqueta
dorada, (c) la eliminación de cualquier detalle que identifique
accidentalmente y (d) la paridad de locale (los turnos en es-419 y pt-BR se
sostienen al mismo estándar que los turnos en en-US).

**Etapa 4 - Casos adversariales.** Los casos adversariales se escriben a
mano y se incorporan al corpus de evaluación (19 de los casos en inglés son
adversariales, más segmentos adversariales en es-419 y pt-BR). Cubren:
elicitación de consejo de dosificación, pesca de diagnóstico, inyección de
prompts (extracción del prompt de sistema, coerción de rol, plantillas de
jailbreak del OWASP-LLM Top 10), revelación de angustia, revelación de
eventos adversos y estrés de fidelidad de EM (interrupción, negación,
ambivalencia). Cada caso tiene una única afirmación portante en la etiqueta
dorada. Un conjunto separado de 13 casos de red-team hechos a mano se
entrega para la puerta de red-team de Promptfoo.

Lo que la distribución entrega de esta canalización es la salida curada: los
conjuntos de datos JSONL versionados. El propio instrumental de generación
(configuraciones de persona, plantillas de prompt de diálogo, la rúbrica del
crítico) fue el aparato de trabajo y no es parte del conjunto de artefactos
entregados; la metodología anterior es el registro de cómo se construyó el
corpus.

## Expansión del corpus

La expansión del corpus agregó 24 nuevas tarjetas de KB y 138 nuevos casos
de evaluación a lo largo de ocho dominios de adherencia a la medicación,
siguiendo la estrategia de agregar-a-lo-existente decidida en
[ADR-0013](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0013-corpus-expansion-strategy/).

### Nuevos dominios de tarjetas de KB (24 tarjetas, 3 por dominio)

| Dominio | IDs de tarjeta |
|--------|----------|
| Adherencia a estatinas | `card-statin-myopathy`, `card-statin-memory`, `card-statin-grapefruit` |
| Técnica de inhalador | `card-inhaler-technique`, `card-inhaler-maintenance`, `card-inhaler-action-plan` |
| Adherencia a antidepresivos | `card-antidepressant-ssri`, `card-antidepressant-discontinuation`, `card-antidepressant-stigma` |
| Apoyo al cuidador | `card-caregiver-burnout`, `card-caregiver-communication`, `card-caregiver-resources` |
| Barreras de costo | `card-cost-barriers-insurance`, `card-cost-barriers-generic`, `card-cost-barriers-programs` |
| Carga de pastillas | `card-pill-burden-simplification`, `card-pill-burden-polypill`, `card-pill-burden-adherence` |
| Alfabetización en salud | `card-health-literacy-numeracy`, `card-health-literacy-communication`, `card-health-literacy-resources` |
| Adherencia general | `card-adherence-measurement`, `card-adherence-technology`, `card-adherence-social-support` |

### Conteos de nuevos casos de evaluación

| Locale | Antes de la expansión | Después de la expansión | Casos nuevos |
|--------|----------------|----------------|-----------|
| en | 60 | 100 | +40 |
| es-419 | 10 | 59 | +49 |
| pt-BR | 10 | 59 | +49 |
| **Total** | **80** | **218** | **+138** |

Todos los datos nuevos son 100% sintéticos con fuentes de dominio público
(publicaciones del gobierno de EE. UU., WHO EML parafraseada). Los IDs de
tarjeta usan prefijos específicos de dominio para la trazabilidad.

## Procedencia de las fuentes de las tarjetas de KB

Las tarjetas de la base de conocimiento son resúmenes cortos y estructurados
derivados de tres fuentes públicas. La copia verbatim está prohibida; se
exige paráfrasis con citación.

- **DailyMed** - FDA Structured Product Labeling, dominio público (obra del
  Gobierno de EE. UU.). <https://dailymed.nlm.nih.gov/>
- **MedlinePlus** - información de salud para el consumidor de la US National
  Library of Medicine, dominio público (obra del Gobierno de EE. UU.).
  <https://medlineplus.gov/>
- **WHO Essential Medicines List** - publicada bajo CC-BY-NC-SA;
  la EML se consulta como referencia para la selección de medicamentos en el
  conjunto de personas, pero el contenido de las tarjetas se parafrasea,
  nunca se copia verbatim. La cláusula no comercial no obliga al contenido
  parafraseado de las tarjetas porque el contenido de las tarjetas se expresa
  de forma independiente.
  <https://list.essentialmeds.org/>

Cada tarjeta de KB lleva `id`, `title`, `text`, `source_url`,
`source_license`, `topics` y `accessed_at` (fecha ISO-8601). El esquema de
la tarjeta lo impone el cargador; las tarjetas sin procedencia fallan la
validación.

## Declaración de licencias

La licencia del código y la licencia de los datos son declaraciones
separadas e independientes.

- **Código: Apache-2.0.** El código fue MIT hasta la v0.6.0 y cambió a
  Apache-2.0 en la v1.0.0; la justificación está en
  [ADR-0008](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0008-licensing/).
- **Corpus de evaluación sintético: MIT**, distribuido dentro del
  repositorio.
- **Tarjetas de KB sintéticas: MIT** para el contenido parafraseado de las
  tarjetas; la atribución a DailyMed / MedlinePlus / WHO EML se preserva en
  los metadatos de procedencia de la tarjeta como cortesía y como rastro de
  verificabilidad.
- **Diálogos generados por LLM: redistribuibles bajo MIT** (no se usó ningún
  material de entrada con derechos de autor; las salidas no están sujetas a
  las restricciones de datos de entrenamiento de un proveedor de modelos
  porque no incluyen prompts con derechos de autor).

## Lista de exclusiones

Los siguientes corpus están explícitamente excluidos de este repositorio en
cualquier forma (crudo, derivado, agregado estadístico, señal de
entrenamiento). La exclusión la impone la verificación de aceptación de
datos.

- **MedDialog** - solo uso académico; los espejos públicos no llevan una
  licencia amigable con la redistribución.
- **ChatDoctor / HealthCareMagic-100K** - los términos de servicio de la
  comunidad de origen prohíben la redistribución del corpus extraído.
- **MIMIC-IV** - el Acuerdo de Uso de Datos de Salud Acreditados de
  PhysioNet prohíbe la redistribución.
- **MIMIC-IV-Note** - el DUA de PhysioNet prohíbe la redistribución;
  postura idéntica a la de MIMIC-IV.
- Los corpus de desafío **i2b2** y **n2c2** - el Acuerdo de Uso de Datos
  institucional prohíbe la redistribución.
- **Asclepius** - la cláusula no comercial CC-BY-NC-SA es incompatible con
  la postura de redistribución permisiva del repositorio.

Cualquier pull request que introduzca un archivo derivado de uno de los
corpus excluidos será cerrado. La verificación de aceptación para nuevos
archivos de datos exige o bien una declaración de licencia permisiva o bien
una declaración de procedencia sintética.

## Qué se entrega y cómo inspeccionarlo

La distribución entrega los propios conjuntos de datos curados y con
etiqueta dorada como JSONL versionado y bajo control de versiones. Un lector
no los regenera; son inspeccionables por completo directamente en el
repositorio:

- Los casos de evaluación en inglés (100 casos que abarcan las categorías
  golden, adversarial, de no-coincidencia y de dominio expandido).
- Los casos de evaluación en es-419 (59 casos).
- Los casos de evaluación en pt-BR (59 casos).
- La base de conocimiento de 36 tarjetas.
- Una auditoría de licencias por fuente y las notas de procedencia de las
  tarjetas.
- Los 13 casos de red-team hechos a mano impulsados por la puerta de
  Promptfoo.

El corpus de evaluación lo consume el arnés para el segmento en inglés y
para los tres locales juntos; cada corrida escribe un reporte legible por
máquina y uno legible por humanos. La puerta de CI determinista se ejecuta
sin claves contra un cliente LLM de prueba (stub), de modo que el veredicto
de la puerta es reproducible en cualquier clon limpio sin claves de API. La
metodología de generación que produjo el corpus está documentada en la
sección *Metodología de generación* anterior; el artefacto entregado es la
salida curada, no una canalización de regeneración.

## Declaración del IRB

Este conjunto de datos no contiene datos de sujetos humanos. Las personas
sintéticas se generan con LLM a través de una canalización alineada a
persona/guion. No hay ninguna información identificatoria presente. Ningún
paciente real fue contactado, observado ni consentido como parte de este
trabajo. La aprobación de un Comité de Ética de Investigación (Institutional
Review Board) no es, por lo tanto, aplicable.

Si un usuario aguas abajo desea extender el conjunto de datos con datos de
sujetos humanos, ese usuario es responsable de obtener la aprobación
apropiada del IRB o del comité de ética en su jurisdicción. El autor de este
repositorio no extiende, avala ni supervisa ninguna extensión de ese tipo.

## Preguntas abiertas y limitaciones conocidas

- **Cobertura.** El corpus de 218 casos y la base de conocimiento de 36
  tarjetas son pequeños en relación con la superficie que un agente
  conversacional de salud real encuentra. El corpus es intencionalmente
  estrecho: es un conjunto de evaluación, no un conjunto de entrenamiento, y
  su trabajo es ejercitar las diez dimensiones de evaluación con etiquetas
  doradas claras. Un corpus más amplio y temáticamente más diverso está en la
  hoja de ruta; también permitiría habilitar el umbral de similitud de
  recuperación (`retrieval_min_similarity`, entregado desactivado); consulta
  la limitación de las preguntas casi-coincidentes fuera del corpus en la
  [ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/). La expansión del corpus agregó 24
  tarjetas de KB y 138 casos de evaluación a lo largo de 8 nuevos dominios,
  documentada en
  [ADR-0013](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0013-corpus-expansion-strategy/).
- **Paridad de locale.** es-419 y pt-BR se sostienen al mismo estándar en el
  arnés de evaluación, pero la generación de personas subyacente tiene un
  sesgo conocido hacia el vocabulario clínico en inglés de EE. UU. El bucle
  productor-crítico lo corrige parcialmente; el sesgo residual se documenta
  en lugar de declararse resuelto. Las 36 tarjetas de KB están en inglés; una
  pasada de KB localizada está en la hoja de ruta.
- **Subjetividad de la rúbrica de fidelidad de EM.** La fidelidad de
  entrevista motivacional se mide contra una rúbrica derivada de MITI, pero
  los evaluadores humanos de EM discrepan a tasas conocidas. El arnés reporta
  la discrepancia entre evaluadores por separado y no condiciona los PR al
  puntaje de fidelidad de EM por sí solo.
- **Vigencia de la KB.** El campo `accessed_at` de cada tarjeta congela la
  fecha de la fuente. Las fuentes públicas pueden moverse por debajo de la
  citación con el tiempo; el contenido de la tarjeta se parafrasea de forma
  independiente, así que una fuente movida no cambia lo que el agente
  recupera, pero el enlace de procedencia puede quedar obsoleto. Refrescar la
  procedencia de las tarjetas es una tarea de mantenimiento, no una puerta
  automatizada.
- **Completitud de las semillas adversariales.** El banco de semillas es
  curado, no exhaustivo. El generador del OWASP-LLM Top 10 de Promptfoo
  expande la superficie cada noche, y los nuevos patrones se incorporan al
  banco de semillas al descubrirse.

## Consulta también

- [ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) - la ficha del modelo para el agente,
  en formato CHAI Applied Model Card.
- [postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) - el
  límite regulatorio que los datos respetan.
- [política de seguridad](/ai-agent-eval-harness-healthtech-docs/es-419/reference/security/) - política de divulgación y la
  restricción dura de "nada de PHI nunca".
- Google Data Cards Playbook: <https://sites.research.google/datacardsplaybook/>.
- Formato CHAI Applied Model Card: <https://www.chai.org/workgroup/applied-model>.
