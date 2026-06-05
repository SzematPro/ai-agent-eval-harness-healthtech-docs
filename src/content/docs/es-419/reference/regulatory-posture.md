---
title: Postura regulatoria
description: La línea regulatoria que el diseño respeta, anclada a referencias de la FDA, la OMS, la MHRA y la Ley de IA de la UE, y por qué esto no es un dispositivo médico.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Postura regulatoria

> Este documento registra la línea regulatoria que el diseño respeta. Es
> la respuesta explícita a la pregunta "¿esto es un dispositivo médico?"
> La respuesta es no. El resto de este documento es el trabajo que costó
> poder decirlo sin que se nos mueva un músculo de la cara.

## Alcance de este documento

Esta es una implementación de referencia pública. No es un producto. No
está comercializada, distribuida ni puesta a disposición de profesionales
clínicos o pacientes para uso clínico. La audiencia son ingenieros y pares
de IA que leen el proyecto como un artefacto de referencia. Incluso con esa
audiencia, el diseño honra los límites regulatorios que aplicarían si el
mismo código alguna vez se llevara a producción. La intención es doble:
mantener la referencia libre de cualquier afirmación que la reclasificaría
como dispositivo, y demostrar una comprensión del límite lo bastante buena
como para construir dentro de él.

El límite está anclado a cuatro documentos de referencia, resumidos a
continuación.

## Documentos de referencia

### FDA - Artificial Intelligence-Enabled Device Software Functions: Lifecycle Management and Marketing Submission Recommendations (Borrador, enero de 2025)

Publicado el 7 de enero de 2025. La guía borrador describe el contenido de
la presentación de comercialización y las prácticas de gestión del ciclo de
vida que la FDA espera para las funciones de software de dispositivos
habilitados por IA, incluidos los planes de control de cambios
predeterminados para modelos que aprenden con el tiempo. Es la secuela
operativa de la guía final de 2024 sobre Planes de Control de Cambios
Predeterminados. El documento no decide por sí mismo si una pieza de
software es un dispositivo -esa pregunta se decide bajo la sección 520(o)
de la Ley FD&C y la guía relacionada de CDS / bienestar general más abajo-
pero establece las expectativas para cualquier producto que cruce hacia el
territorio de los dispositivos.

Esta implementación de referencia no es un dispositivo, así que no se
redacta el contenido de la presentación de comercialización. No obstante,
las expectativas del ciclo de vida se siguen como disciplina de diseño:
fichas de modelo + de conjunto de datos, versionado conjunto de modelo +
KB + prompts, un arnés de evaluación que controla los cambios,
observabilidad que registra trazas relevantes para producción.

URL: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/artificial-intelligence-enabled-device-software-functions-lifecycle-management-and-marketing>

### FDA - Guía revisada de Clinical Decision Support Software y guía revisada de General Wellness: Policy for Low Risk Devices (enero de 2026)

Publicada el 6 de enero de 2026. La guía revisada de CDS aclara los cuatro
criterios estatutarios bajo la sección 520(o)(1)(E) de la Ley FD&C que
eximen al software de CDS de ser regulado como dispositivo cuando el
software está destinado a un profesional de la salud, muestra de forma
transparente la base de su recomendación y le da al HCP un medio
independiente para revisar esa base. La guía revisada de bienestar general
reafirma que el software destinado a mantener o fomentar un estilo de vida
saludable, y no relacionado con el diagnóstico, la cura, la mitigación, la
prevención o el tratamiento de una enfermedad o afección, no es un
dispositivo. Las revisiones de 2026 ampliaron la categoría de bienestar
para incluir la detección no invasiva de parámetros fisiológicos cuando la
salida es únicamente con fines de bienestar, y estrecharon el alcance de
CDS en torno a las herramientas de única opción de tratamiento recomendado
y las salidas de probabilidad de riesgo.

El agente de esta implementación de referencia está orientado al paciente,
no orientado al clínico. Eso lo ubica firmemente fuera de la exención de
CDS independientemente de las revisiones de 2026, porque la exención de CDS
está condicionada a estar orientada al HCP con revisión independiente. El
agente, por lo tanto, debe evitar *cualquier* función que lo calificaría
como dispositivo bajo 520(o) en la ruta orientada al paciente: sin
diagnóstico, sin recomendación de tratamiento, sin cambio de prescripción,
sin interpretación de laboratorios/imágenes. El agente se mantiene del lado
del bienestar general de la línea -apoyo a la adherencia, fomento del
estilo de vida, reflexión al estilo de la EM- y se rehúsa a cualquier cosa
que cruzaría al otro lado. Las plantillas de rechazo y el clasificador de
alcance lo imponen; el arnés de evaluación mide el cumplimiento.

URL de CDS: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software>

### WHO - Ethics and governance of artificial intelligence for health: Guidance on large multi-modal models (enero de 2024)

Publicada el 18 de enero de 2024. La guía de la OMS es un marco de cuarenta
recomendaciones dirigido a gobiernos, proveedores de tecnología y sistemas
de salud. Los temas centrales que el diseño honra: transparencia sobre la
procedencia del modelo y de los datos de entrenamiento, responsabilidad por
las salidas, evitación de sesgos, protección de la autonomía del paciente y
supervisión humana en las decisiones de alto riesgo. Recomendaciones
específicas de la OMS operacionalizadas aquí: fichas de modelo y de
conjunto de datos (transparencia), citación por afirmación
(responsabilidad), paridad de locale en las evaluaciones (evitación de
sesgos), valores predeterminados de rechazo y escalamiento (protección de
la autonomía y supervisión humana).

URL: <https://www.who.int/publications/i/item/9789240084759>

### MHRA - Piloto AI Airlock y Good Machine Learning Practice

El piloto AI Airlock de la MHRA se desarrolló en el año fiscal 2024-2025
como un entorno regulatorio de pruebas (sandbox) para software como
dispositivo médico con componentes de IA generativa o de aprendizaje
automático. Cinco candidatos del sandbox completaron el piloto completo; un
informe del programa de sandbox se publicó en octubre de 2025. GMLP -Good
Machine Learning Practice- es una publicación conjunta de diez principios de
la MHRA, la FDA y Health Canada que enmarca cómo deben desarrollarse,
desplegarse y monitorearse los dispositivos médicos habilitados por ML. La
hoja de ruta de la MHRA de 2025 se compromete a publicar una guía alineada
con GMLP. El diseño sigue los diez principios de GMLP como disciplina de
diseño: experiencia multidisciplinaria, práctica de ingeniería sólida,
datos clínicamente relevantes, independencia entre entrenamiento y prueba,
foco en el desempeño del equipo humano-IA, pruebas sobre datos
representativos, transparencia hacia los usuarios, monitoreo del modelo
desplegado, reentrenamiento periódico y comunidad de usuarios informada.

URL:
- Programa AI Airlock: <https://www.gov.uk/government/news/ai-airlock-cersis-and-a-new-global-ai-network-for-health-regulators>
- Informe del piloto AI Airlock: <https://assets.publishing.service.gov.uk/media/68ee1fb88427701993d5e02c/AI_Airlock_Sandbox_Programme_Report_Final.pdf>
- Principios rectores de GMLP (espejo de la FDA): <https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development-guiding-principles>

### EU AI Act - Reglamento (UE) 2024/1689 (en vigor desde agosto de 2024, obligaciones de alto riesgo aplicables desde agosto de 2026)

Publicado el 13 de junio de 2024, entró en vigor el 1 de agosto de 2024,
con los artículos de prácticas prohibidas aplicables desde el 2 de febrero
de 2025 y el grueso de las obligaciones de los sistemas de alto riesgo
aplicables desde el 2 de agosto de 2026. La Ley clasifica los sistemas de
IA por nivel de riesgo. El Anexo III enumera los casos de uso de alto
riesgo que activan las obligaciones de evaluación de la conformidad,
gestión de riesgos, gobernanza de datos, documentación técnica, monitoreo
posterior a la comercialización y supervisión humana de la Sección 2 del
Capítulo III. Tres categorías del Anexo III son adyacentes al espacio de
diseño de esta implementación de referencia y vale la pena nombrarlas de
forma explícita:

- Anexo III punto 5(a) - sistemas de IA destinados a ser usados por
  autoridades públicas para evaluar la elegibilidad de personas físicas para
  servicios y prestaciones públicas esenciales.
- Anexo III punto 5(c) - sistemas de IA destinados a ser usados para evaluar
  la solvencia crediticia de personas físicas o establecer su puntaje de
  crédito.
- Anexo III punto 6(d) - sistemas de IA destinados a ser usados para
  despachar, o establecer prioridad en el despacho de, los primeros
  intervinientes de servicios de emergencia, incluso mediante triaje.

Un coach de bienestar para la adherencia a la medicación orientado al
paciente no es, en sí mismo, un sistema de alto riesgo del Anexo III. El
agente no realiza triaje de llamadas de emergencia, no asigna prestaciones
públicas, no califica la solvencia crediticia. La rama de "Escalamiento por
banderas rojas" del agente reconoce siete patrones agudos (ideación
suicida, anafilaxia, dolor torácico cardíaco agudo, hemorragia grave, asma
grave, ACV / signos FAST y emergencia hipertensiva) y muestra orientación
de los servicios de emergencia locales sin actuar como una herramienta de
triaje en sí misma. La lógica de escalamiento es deliberadamente
determinista y basada en reglas, de modo que el operador humano, no el
modelo, retiene la decisión de enrutamiento.

Donde la Ley de IA de la UE es más relevante para esta implementación de
referencia no es en la clasificación por nivel de riesgo del agente en sí,
sino en la postura de *gobernanza del modelo* que el arnés codifica. El
Artículo 9 (sistema de gestión de riesgos), el Artículo 10 (datos y
gobernanza de datos), el Artículo 11 + Anexo IV (documentación técnica), el
Artículo 12 (mantenimiento de registros), el Artículo 13 (transparencia),
el Artículo 14 (supervisión humana), el Artículo 15 (exactitud / robustez /
ciberseguridad) y el Artículo 17 (sistema de gestión de calidad) son la
superficie procedimental que un implementador de alto riesgo del Anexo III
tiene que satisfacer. El arnés que se entrega aquí se sitúa en esa capa
procedimental: contratos de evaluación con umbrales de aceptación
explícitos, fichas de datos que nombran cada fuente, puertas de costo y de
citación que bloquean PR, spans trazados con OpenInference para cada turno,
plantillas de rechazo con justificación legible por humanos y el enrutador
de escalamiento determinista del orquestador. Adoptar estos patrones en un
sistema del Anexo III dentro de una organización regulada acelera el
paquete de evidencia de los Artículos 9 + 10 + 12 + 14; no satisface esos
artículos por sí solo.

Para un operador aguas abajo cuyo propio sistema de IA *sí es* de alto
riesgo bajo el Anexo III (por ejemplo, un asistente de elegibilidad del
sector público o un chatbot de calificación crediticia), el patrón del arnés
se transfiere de tres maneras concretas: (i) el contrato de evaluación le da
al sistema de gestión de riesgos del Artículo 9 un artefacto comprobable;
(ii) el contrato de citación-requerida + rechazo-ante-no-coincidencia
estrecha la superficie donde la exactitud / robustez del Artículo 15 puede
fallar en silencio; (iii) la traza de OpenTelemetry por span le da al
mantenimiento de registros del Artículo 12 una columna vertebral agnóstica
al formato de cable y portable entre proveedores.

URL:
- Texto oficial del Reglamento (UE) 2024/1689: <https://eur-lex.europa.eu/eli/reg/2024/1689/oj>
- Lista consolidada del Anexo III: <https://artificialintelligenceact.eu/annex/3/>
- Oficina Europea de IA: <https://digital-strategy.ec.europa.eu/en/policies/ai-office>

## El límite bienestar / CDS que el diseño respeta

El diseño traza una línea dura: el agente es una herramienta de apoyo al
bienestar que aborda el comportamiento de adherencia a la medicación, no una
herramienta de decisión clínica. Concretamente:

- El usuario es un paciente, no un clínico. La exención de CDS está
  orientada al HCP; la vía de bienestar está orientada al paciente. El
  agente se mantiene orientado al paciente por esa razón.
- El agente aborda el lado *conductual* de la adherencia (motivación,
  rutina, recordatorios, reflexión al estilo de la EM sobre las barreras) y
  nunca el lado *clínico* (si el régimen es correcto, si cambiarlo, qué
  significan los laboratorios).
- El agente nunca sustituye una interacción con un clínico. Siempre lleva el
  descargo de responsabilidad de que las preguntas clínicas van al
  proveedor de salud del usuario, y escala banderas rojas agudas explícitas
  -las siete categorías deterministas (ideación suicida, anafilaxia, dolor
  torácico cardíaco agudo, hemorragia grave, asma grave, ACV / signos FAST,
  emergencia hipertensiva)- mostrando orientación de los servicios de
  emergencia y terminando la interacción dentro de la app. El patrón de
  embarazo + teratógeno lo maneja la capa del LLM y del prompt de sistema,
  no el enrutador determinista (necesita un léxico de nombres de fármacos
  que una lista de regex no puede cargar); consulta
  [ADR-0005](../adr/adr-0005-guardrails.md).

## Lo que el agente NO hace

Esta lista es la declaración canónica del comportamiento fuera de alcance.
La imponen el clasificador de alcance, las plantillas de rechazo y el arnés
de evaluación.

1. **Sin diagnóstico.** El agente nunca nombra, infiere ni confirma/descarta
   una afección médica. Si el usuario describe síntomas, el agente lo
   reconoce, fomenta el contacto con un clínico y (si los síntomas coinciden
   con una regla de escalamiento) muestra orientación de los servicios de
   emergencia.
2. **Sin consejo de dosificación.** El agente nunca le dice al usuario que
   tome más, tome menos, duplique tras una omisión, divida una dosis, salte
   una dosis o cambie un esquema de dosificación. Las preguntas de
   dosificación se rechazan y se redirigen al clínico prescriptor o al
   farmacéutico.
3. **Sin cambio de prescripción.** El agente nunca aconseja iniciar,
   detener, cambiar, sustituir o pausar un medicamento. La plantilla de
   rechazo nombra al clínico prescriptor como el contacto correcto.
4. **Sin interpretación de laboratorios, imágenes o lecturas de
   dispositivos.** El agente nunca lee valores numéricos de vuelta como
   interpretación clínica ("tu A1c de 7,4 significa…"). Reconoce que el
   usuario tiene los datos, fomenta la revisión por un clínico y se
   desentiende de la interpretación.
5. **Sin interacción orientada al clínico.** La superficie del agente es el
   paciente. No produce resúmenes orientados al HCP, notas clínicas
   estructuradas ni ningún artefacto dirigido al flujo de trabajo de un
   clínico. (Las herramientas orientadas al HCP estarían sujetas a la prueba
   de exención de CDS y cambiarían la postura regulatoria por completo).
6. **Sin reemplazo de los servicios de emergencia.** Ante cualquier
   disparador de escalamiento, el agente muestra el número de emergencia
   pertinente y se desentiende. No es una herramienta de triaje.
7. **Sin afirmación de validación clínica.** Ningún texto en ninguna
   respuesta del agente ni en ningún artefacto del proyecto afirmará que el
   sistema ha sido validado clínicamente, probado en ensayos o avalado por un
   organismo regulatorio.

## Descargos de responsabilidad requeridos en cada respuesta de la demo

Cada respuesta que el agente emite en la demo en vivo lleva dos artefactos:

- Un banner persistente en la UI de Spaces: "Implementación de referencia.
  Datos 100% sintéticos. No es un dispositivo médico. Solo para
  demostración. Habla con tu clínico para obtener asesoría médica. En una
  emergencia, llama a tus servicios de emergencia locales."
- Un pie de página en línea en cada turno del asistente, mostrado a través
  de la plantilla de respuesta: "Esto es una demostración. No es asesoría
  médica."

El arnés de evaluación verifica el pie de página en línea en cada turno y
trata su ausencia como una regresión de seguridad.

## Control de cambios para la postura regulatoria

Un cambio en este documento -ampliar el alcance del comportamiento permitido
del agente, estrechar la lista de rechazos, eliminar un descargo de
responsabilidad, cambiar los criterios de escalamiento- requiere un Registro
de Decisión de Arquitectura en el área de barreras de seguridad. El ADR es
el lugar para registrar la justificación, el nuevo límite y los cambios del
arnés de evaluación que lo imponen. Las notas de versión de ese cambio lo
registran en la sección de seguridad, porque la postura regulatoria es una
propiedad del sistema relevante para la seguridad.

## Consulta también

- [decisión de barreras de seguridad](../adr/adr-0005-guardrails.md) -
  diseño de las barreras de seguridad.
- [datos](data.md) - política de datos solo sintéticos y la
  lista completa de exclusiones.
- [política de seguridad](security.md) - política de divulgación.
