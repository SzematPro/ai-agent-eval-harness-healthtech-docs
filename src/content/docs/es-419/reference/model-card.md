---
title: Ficha del modelo
description: "CHAI Applied Model Card para el agente conversacional de adherencia a la medicación: usos, advertencias, ingredientes de confianza y métricas clave."
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Ficha del modelo - agente conversacional de adherencia a la medicación

> Estructurada según la **CHAI Applied Model Card** (Coalition for Health AI),
> plantilla borrador **v0.1** (`mc.chai.org/v0.1`, repositorio del esquema
> <https://github.com/coalition-for-health-ai/mc-schema>). v0.1 es la versión
> publicada actual de la plantilla a fecha de 2026-05-20; la plantilla es un
> borrador en iteración pública. Esta ficha sigue el orden de secciones de
> v0.1: encabezado, Resumen, Usos e Indicaciones, Advertencias, Ingredientes
> de Confianza (Datos del Sistema de IA más Información de Transparencia),
> Métricas Clave (las tres columnas de áreas de principios de CHAI) y
> Recursos.
>
> La CHAI Applied Model Card fue diseñada para una *solución de IA aplicada*
> desplegada dentro de una organización de salud. Este artefacto **no** es esa
> solución: es una implementación de referencia pública, nunca desplegada
> contra pacientes reales. La ficha, por lo tanto, se completa con honestidad
> respecto de lo que el código de este proyecto realmente hace, y cada campo
> que no aplica a una implementación de referencia no desplegada lo dice de
> forma explícita en lugar de dejarse en blanco o inventarse. Léela junto a
> la [postura regulatoria](regulatory-posture.md) y los [datos](data.md).

---

## Encabezado

| Campo | Valor |
|---|---|
| **Nombre** | Agente conversacional de adherencia a la medicación (`ai-agent-eval-harness-healthtech`) |
| **Desarrollador** | Waldemar Szemat. Implementación de referencia pública; sin patrocinador corporativo, sin socio institucional, sin financiamiento externo. |
| **Consultas o para reportar una incidencia** | <waldemar@szemat.pro>. Proceso de divulgación de seguridad en la [política de seguridad](security.md). Incidencias: el rastreador de incidencias del repositorio público. |
| **Etapa de publicación** | Implementación de referencia pública, `v2.1.0`. No es un producto comercial, no es un dispositivo médico publicado, no está en uso clínico. |
| **Fecha de publicación** | Publicación pública inicial 2026-05-14; publicación actual `v2.1.0`. |
| **Disponibilidad global** | Código fuente público bajo Apache-2.0. Una demo interactiva opcional se ejecuta en Hugging Face Spaces (nivel gratuito) cuando las claves de proveedor del host están configuradas. Sin restricción geográfica y sin comercialización en ninguna jurisdicción; es un artefacto de código, no un servicio ofrecido. |
| **Aprobación regulatoria, si aplica** | Ninguna. No se ha buscado ni obtenido autorización de la FDA, marcado CE, notificación a la MHRA ni ninguna otra autorización regulatoria. Ninguna es aplicable: esto no es un dispositivo médico (consulta las Advertencias y la [postura regulatoria](regulatory-posture.md)). |
| **Versión** | `v2.1.0`. El versionado es semántico; el prompt del agente, la base de conocimiento y el corpus de evaluación se versionan junto con el código. |

---

## Resumen

Este es un **agente de apoyo a la adherencia a la medicación** multi-turno
emparejado con un arnés de evaluación controlado por CI que lo califica en
cada cambio. El agente ayuda a una persona-paciente sintética con el lado
*conductual* de tomar la medicación según lo prescrito: construcción de
rutinas, recordatorios, reflexión al estilo de la entrevista motivacional
sobre las barreras de adherencia y conversación consciente del locale en
inglés, español latinoamericano (es-419) y portugués brasileño (pt-BR).
**No** diagnostica, dosifica, prescribe ni interpreta datos clínicos; está
construido para situarse del lado del bienestar general del límite de
bienestar / soporte a la decisión clínica de la FDA por construcción.

El agente es un `StateGraph` de [LangGraph](https://github.com/langchain-ai/langgraph)
con una superficie de FastAPI al frente, fundamentado por recuperación sobre
una pequeña base de conocimiento sintética, envuelto en barreras de seguridad
deterministas (validación de input, redacción de PII, clasificación de
alcance, escalamiento por banderas rojas, verificación de citación,
estabilidad de persona) e instrumentado de extremo a extremo con
OpenTelemetry + OpenInference. Su característica definitoria es el **arnés de
evaluación**: un núcleo de pytest hecho a mano que impulsa al agente contra
conjuntos de datos golden curados, despacha cada turno a una pila de siete
scorers (cuatro deterministas, tres respaldados por juez) y hace fallar el
pull request cuando una métrica de seguridad, citación o escalamiento sufre
una regresión.

El punto del artefacto es la metodología -*construir la medición antes que el
agente, controlar cada cambio contra ella*- demostrada en un ejemplo
trabajado de salud. El patrón es agnóstico a la industria; el encuadre de
salud se eligió porque es donde el autor tiene experiencia de campo.

**Palabras clave:** adherencia a la medicación, agente conversacional,
multi-turno, LangGraph, generación aumentada por recuperación, barreras de
seguridad, arnés de evaluación de LLM, humano en el bucle, bienestar general,
datos sintéticos, implementación de referencia.

---

## Usos e indicaciones

### Uso previsto y flujo de trabajo

El agente es una **implementación didáctica y de referencia** de un coach de
bienestar para la adherencia a la medicación orientado al paciente y del
arnés de evaluación que lo gobierna. Su uso previsto es ser leído, ejecutado,
bifurcado (fork) y extendido por ingenieros y pares de IA que estudian cómo
se mide un agente conversacional de salud multi-turno antes de que se
publique.

Dentro de ese marco, el propio flujo de trabajo conversacional del agente es:
un turno de usuario entra por `POST /chat`; una canalización de LangGraph de
seis nodos ejecuta `intake` → `guardrail_pre` → (condicional)
`retrieve_context` → `generate_response` → `guardrail_post` → `closing`; la
respuesta se devuelve con sus citaciones y su traza completa de decisiones de
las barreras de seguridad. El agente está construido para **informar el
propio comportamiento de adherencia de un paciente**, nunca para informar,
aumentar ni reemplazar la decisión de manejo de un clínico.

Supervisión humana: un paso opcional de revisión con humano en el bucle
(human-in-the-loop) está disponible. Cuando se habilita, un séptimo nodo,
`review_response`, se inserta entre `generate_response` y `guardrail_post`;
usa una interrupción de LangGraph para pausar un borrador de alto riesgo pero
no agudo para que un revisor humano lo apruebe, edite o rechace antes de que
el turno se complete. Esta es una pausa real del grafo, no una simulada. Está
desactivada por defecto, así que el arnés de evaluación y el grafo estándar de
seis nodos se ejecutan sin comportamiento de pausa. Consulta la nota de HITL
bajo *Riesgos y limitaciones conocidos*.

### Usuarios primarios previstos

- **Ingenieros y profesionales de IA** que evalúan la arquitectura, el arnés
  de evaluación y el diseño de las barreras de seguridad: la audiencia
  primaria.
- **Revisores técnicos y de gobernanza** que evalúan el rigor de ingeniería y
  de postura regulatoria del proyecto.
- El usuario final *dentro de la ficción* del agente es una **persona-paciente
  adulta sintética** que maneja un régimen de medicación crónica
  (hipertensión, diabetes tipo 2, VIH, anticoagulación con warfarina o asma).
  Ningún paciente real es usuario de este sistema; no hay criterio de
  inclusión o exclusión del mundo real porque no hay usuarios del mundo real.

Conocimiento previo esperado de un usuario real, de ser esto un producto: es
una conversación de bienestar orientada al consumidor y no requeriría
entrenamiento clínico para leerse -que es exactamente por lo que la postura
regulatoria le prohíbe cruzar alguna vez hacia la asesoría clínica.

### Cómo usarlo

Clona el repositorio y ejecuta el target de verificación del proyecto (lint,
verificación de tipos, la suite completa de pruebas no lentas), los targets de
evaluación (el arnés de evaluación) y, con una clave de API gratuita de Groq,
un turno en vivo de `POST /chat`. La demo interactiva opcional es una
aplicación web de una sola página hecha a mano y servida desde el mismo
proceso de FastAPI; lleva un Grafo de Ejecución del Agente en vivo que
visualiza la corrida de LangGraph del agente a medida que cada turno se
transmite.

### Población de pacientes objetivo

No aplica en el sentido del mundo real. El agente se ejercita exclusivamente
contra **personas-paciente sintéticas**, generadas por LLM a lo largo de
cinco grupos de afecciones (hipertensión, diabetes mellitus tipo 2, VIH como
el ancla de adherencia a largo plazo, warfarina como el ancla de índice
terapéutico estrecho, asma como el ancla de PRN-vs-programado). Ninguna
persona corresponde a un individuo real; consulta los [datos](data.md).

### Entornos y casos de uso fuera de alcance con advertencia

Este artefacto **no** debe usarse para ninguno de los siguientes. La lista es
la declaración canónica de lo que está fuera de alcance; la imponen el
clasificador de alcance, las plantillas de rechazo y el arnés de evaluación, y
es el mismo límite que la [postura regulatoria](regulatory-posture.md)
registra en su totalidad.

- **Uso clínico real de cualquier tipo.** No despliegues este agente para
  hablar con pacientes o clínicos reales. No está validado, no está autorizado
  y no es un producto.
- **Diagnóstico.** El agente nunca nombra, infiere ni confirma/descarta una
  afección médica.
- **Consejo de dosificación.** El agente nunca le dice a un usuario que tome
  más, tome menos, duplique tras una dosis omitida, divida, salte o cambie un
  esquema de dosificación.
- **Cambio de prescripción.** El agente nunca aconseja iniciar, detener,
  cambiar, sustituir o pausar un medicamento.
- **Interpretación de laboratorios, imágenes o lecturas de dispositivos.** El
  agente no lee un valor clínico numérico de vuelta como interpretación.
- **Uso orientado al clínico.** El agente no produce resúmenes orientados al
  HCP ni notas clínicas; está orientado al paciente por diseño.
- **Triaje de emergencia o reemplazo de los servicios de emergencia.** Ante
  una bandera roja aguda, el agente muestra orientación de los servicios de
  emergencia y se desentiende; no es una herramienta de triaje.
- **Entrenar un modelo de producción con sus salidas**, o usar sus datos
  sintéticos como sustituto de la investigación con sujetos humanos aprobada
  por un IRB.

Una solicitud que cae en una categoría fuera de alcance de las barreras de
seguridad (dosificación, diagnóstico, interpretación, exfiltración de PII,
extracción del prompt de sistema, anulación por juego de roles) se **rechaza**
con una respuesta plantillada y consciente del locale. Una pregunta clínica
para la cual la recuperación no devuelve ninguna tarjeta de la base de
conocimiento se **rechaza por no coincidencia**. Consulta la limitación sobre
las preguntas casi-coincidentes fuera del corpus bajo *Riesgos y limitaciones
conocidos*.

---

## Advertencias

### Riesgos y limitaciones conocidos

- **No es un dispositivo médico.** Este software no diagnostica, prescribe,
  cambia dosis, interpreta laboratorios o imágenes, ni interactúa con
  clínicos. No se ha buscado ni obtenido autorización regulatoria. Es una
  implementación de referencia mantenida con fines didácticos y de
  demostración.
- **No está validado clínicamente.** El arnés de evaluación mide
  fundamentación, seguridad, corrección de citaciones, corrección de
  escalamiento y balance de rechazos contra etiquetas doradas *sintéticas*.
  Eso es prueba de software, no un ensayo clínico, no un estudio de usabilidad
  y no un sustituto de ninguno de los dos.
- **Datos 100% sintéticos; base de conocimiento pequeña y de un solo
  dominio.** La base de conocimiento son **36** tarjetas sintéticas, todas
  sobre adherencia a la medicación, parafraseadas de DailyMed, MedlinePlus y
  la WHO Essential Medicines List. Es un corpus de demo, no una base de
  conocimiento clínica.
- **Las preguntas clínicas casi-coincidentes fuera del corpus no se
  rechazan.** Esta es la limitación honesta más importante. El agente rechaza
  de forma confiable en dos rutas: una recuperación de *cero aciertos* (el
  almacén no devuelve nada) y una *categoría de barrera de seguridad* fuera de
  alcance. **No** rechaza de forma confiable una pregunta clínica que está
  fuera del corpus pero semánticamente adyacente a las tarjetas -por ejemplo,
  una pregunta de adherencia sobre una afección sin tarjeta. Tal pregunta se
  responde contra la tarjeta más cercana en su lugar. Esto se estableció
  empíricamente: como todas las tarjetas son contenido de adherencia a la
  medicación, una pregunta de adherencia fuera del corpus está genuinamente
  cerca de ellas en el espacio de embeddings, y ningún umbral de similitud
  separa las preguntas fuera del corpus de los casos genuinos dentro del
  corpus sin rechazar falsamente estos últimos. El comportamiento se volvió a
  medir a lo largo de cuatro configuraciones de embedder bajo distancia tanto
  L2 como coseno; cada configuración deja una brecha de separación negativa.
  Un umbral de similitud de recuperación (`retrieval_min_similarity`) se
  entrega **configurable pero desactivado por defecto** para que un corpus más
  amplio y temáticamente más diverso pueda habilitarlo más adelante; en el
  corpus actual, pequeño y de un solo dominio, no puede usarse. La causa es
  intrínseca a un corpus pequeño y de un solo dominio, no al embedder ni al
  agente.
- **El comportamiento del modelo generativo es probabilístico.** Las
  respuestas del agente las produce un modelo de lenguaje grande. Las barreras
  de seguridad deterministas acotan la superficie *crítica para la seguridad*
  (escalamiento agudo, las categorías de rechazo enumeradas, verificación de
  citación), pero el contenido de texto libre de una respuesta dentro de
  alcance es del modelo y puede variar, ser incompleto o estar equivocado en
  algún detalle. La puerta de CI determinista prueba que las barreras de
  seguridad se disparan; no prueba que cada oración generada sea correcta.
- **Limitación de durabilidad de HITL.** Cuando la revisión opcional con
  humano en el bucle está habilitada, el hilo pausado lo retiene un
  checkpointer. La configuración de la demo usa un **checkpointer en
  memoria**, así que un hilo pausado **no sobrevive a un reinicio del
  proceso** -un reinicio pierde cualquier revisión que esté esperando
  aprobación. Un checkpointer durable respaldado por Postgres está disponible
  y se selecciona automáticamente cuando se configura una cadena de conexión
  de Postgres; los despliegues durables deberían usarlo.
- **El escalamiento por banderas rojas es determinista y basado en reglas,
  por diseño.** Las banderas rojas agudas (ideación suicida, anafilaxia,
  dolor torácico cardíaco agudo, hemorragia grave, asma grave, ACV/signos
  FAST, emergencia hipertensiva) las detecta una lista de regex versionada que
  se ejecuta antes del clasificador de alcance y hace cortocircuito del turno
  hacia una plantilla de emergencia. La detección es intencionalmente **ciega
  a la negación**: según la justificación de diseño, una bandera roja perdida
  cuesta mucho más que un sobre-escalamiento benigno, así que escalar ante "no
  hay dolor torácico" se acepta. Los síntomas subagudos que no están en la
  lista aguda se dejan deliberadamente al modelo y son un modo de falla
  conocido en las corridas en vivo (consulta *Métricas clave*).
- **Límites del entorno de demo.** El Hugging Face Space opcional se ejecuta
  en CPU de nivel gratuito: arranque en frío de aproximadamente 30 segundos
  tras la inactividad, 2-5 segundos por turno y un límite de tasa del
  proveedor de nivel gratuito (~30 solicitudes/minuto) bajo el cual una ráfaga
  de visitantes verá HTTP 429. Una caché de respuestas de TTL corto y un
  limitador de tasa por sesión lo mitigan; están desactivados por defecto para
  que la suite de pruebas siga siendo determinista.

### Sesgos conocidos o consideraciones éticas

- **Sesgo de vocabulario clínico en inglés de EE. UU. en los datos
  sintéticos.** Las personas y los diálogos se generan con LLM y portan un
  sesgo conocido hacia el encuadre clínico en inglés de EE. UU. Los segmentos
  de evaluación en es-419 y pt-BR se sostienen a los *mismos* umbrales que el
  inglés, y un bucle de generación productor-crítico corrige parcialmente el
  sesgo, pero el sesgo de locale residual se reconoce en los [datos](data.md).
- **Las tarjetas de la base de conocimiento están en inglés.** El agente y el
  arnés de evaluación son conscientes del locale de extremo a extremo, pero
  las tarjetas de la KB en sí están en inglés. Una pasada de KB localizada
  está en la hoja de ruta, no entregada.
- **Las personas sintéticas pueden no representar patrones reales de
  adherencia.** Las distribuciones de adherencia se muestrean de rangos
  epidemiológicos publicados para evitar el artefacto de sobre-adherencia de
  los generadores de pacientes sintéticos de uso general, pero los datos
  sintéticos no pueden representar plenamente la diversidad de una población
  real de pacientes. El artefacto es explícito en que no está construido
  sobre, ni validado contra, datos reales de pacientes.
- **La fidelidad de la entrevista motivacional es una rúbrica subjetiva.** La
  fidelidad de EM se puntúa contra una rúbrica derivada de MITI; los
  evaluadores humanos de EM discrepan a tasas conocidas, así que la fidelidad
  de EM se reporta pero no es una métrica única de control de PR.
- **Autonomía y supervisión.** El diseño deliberadamente mantiene la decisión
  de enrutamiento sobre las banderas rojas agudas con una regla determinista y
  un operador humano, no el modelo, y se rehúsa en lugar de adivinar fuera de
  su carril -elecciones hechas para proteger la autonomía del paciente y
  mantener a un humano responsable de los resultados de alto riesgo.

### Nivel de riesgo clínico

**No aplica - esto no es un dispositivo médico y no porta clasificación de
riesgo clínico.** Si la *misma arquitectura* se llevara hacia un despliegue
real orientado al paciente, se evaluaría como una herramienta de bienestar
general deliberadamente construida para mantenerse fuera de la definición de
dispositivo médico (sin diagnóstico, sin dosificación, sin cambio de
prescripción, sin interpretación de datos clínicos, orientada al paciente
únicamente). Tal despliegue igualmente requeriría una revisión regulatoria
independiente en su jurisdicción antes de cualquier uso real; esta ficha no
sustituye una.

---

## Ingredientes de confianza

### Datos del sistema de IA

- **Resultado(s) y salida(s).** La salida es una **respuesta de texto
  conversacional multi-turno** a un turno del paciente, en el locale
  solicitado, acompañada de una traza estructurada: las citaciones
  `[cite:CARD_ID]` extraídas de la respuesta, las decisiones de aprobado/fallo
  por barrera de seguridad y la contabilidad de tokens/latencia/costo por
  turno. No es una predicción, clasificación, puntaje ni recomendación en el
  sentido clínico; clínicamente está restringida a conversación de bienestar,
  rechazo o escalamiento de emergencia.
- **Tipo de modelo.** Un sistema **generativo**: un agente de modelo de
  lenguaje grande orquestado. Un `StateGraph` de LangGraph orquesta un único
  agente conversacional sobre seis nodos (`intake`, `guardrail_pre`,
  `retrieve_context` condicional, `generate_response`, `guardrail_post`,
  `closing`), más el séptimo nodo opcional `review_response` con humano en el
  bucle. El estado de la conversación está tipado con Pydantic. El sistema
  integra un almacén de vectores (Chroma, en proceso) y los módulos
  deterministas de barreras de seguridad; no integra un EHR ni ningún
  dispositivo médico.
- **Modelos fundacionales usados en la aplicación.** El LLM de completación es
  **configurable** detrás de un delgado Protocol de cliente, seleccionado por
  la variable de entorno `LLM_PROVIDER`. La ruta de demo predeterminada que se
  entrega es **Groq** sirviendo `llama-3.3-70b-versatile`; **Cerebras**
  (`gpt-oss-120b` por defecto) es el respaldo configurado y el proveedor juez
  de evaluación. También se proveen adaptadores de OpenAI y Anthropic,
  conectables por el usuario. El fallback en cascada reintenta un límite de
  tasa de Groq o una falla de transporte en Cerebras, luego en Anthropic. Los
  identificadores específicos de modelo son configuración, no están
  codificados de forma fija, y se espera que se actualicen a medida que los
  proveedores iteren.
- **Fuente de datos de entrada.** En tiempo de ejecución, el input es el/los
  **turno(s) conversacional(es) del usuario** enviado(s) a `POST /chat`. La
  fuente de fundamentación del agente es la base de conocimiento sintética. El
  sistema no ingiere ningún dato real de paciente ni ningún EHR.
- **Tipo de datos de salida/entrada.** Mensajes conversacionales de texto
  libre (entrada y salida), en inglés, es-419 o pt-BR. Todos los datos sobre
  los que el sistema se construye y evalúa son **sintéticos**, no del mundo
  real. El agente **no** toma, y nunca se entrena con, lo siguiente como
  rasgos de entrada: raza, etnia, idioma más allá de los tres locales de la
  UI, orientación sexual, identidad de género, sexo, fecha de nacimiento,
  determinantes sociales de la salud o evaluaciones del estado de salud. No
  hay, por lo tanto, un conjunto de rasgos de entrada demográficos ni ninguna
  afirmación de representatividad demográfica que hacer -por diseño
  deliberado, el agente razona únicamente sobre el turno conversacional y el
  texto de la tarjeta recuperada.
- **Caracterización de los datos de desarrollo.** El sistema **no se entrena
  ni se afina** en este repositorio; usa modelos fundacionales preentrenados
  como servicio detrás del Protocol del cliente. En consecuencia, no hay
  conjunto de datos de entrenamiento ni división entrenamiento/prueba que
  caracterizar para el agente en sí. Los dos conjuntos de datos sintéticos que
  *sí* se entregan son un **corpus de evaluación** y la **base de
  conocimiento**:
  - *Corpus de evaluación* - **218 casos multi-turno curados**: 100 en inglés
    (que abarcan las categorías golden, adversarial y de no-coincidencia), 59
    en es-419, 59 en pt-BR. Generados por LLM a partir de personas sintéticas
    con un bucle productor-crítico, luego curados manualmente al 100%, luego
    aumentados con semillas adversariales escritas a mano. Metodología completa
    en los [datos](data.md).
  - *Base de conocimiento* - 36 tarjetas sintéticas parafraseadas de DailyMed
    (FDA Structured Product Labeling, dominio público), MedlinePlus (US NLM,
    dominio público) y la WHO Essential Medicines List (solo parafraseada).
    Cada tarjeta lleva `source_url`, `accessed_at` y una nota de procedencia.
  - *Embeddings de recuperación* - la base de conocimiento se embebe con
    **`BAAI/bge-small-en-v1.5`** (384 dimensiones, familia BGE). La
    recuperación es asimétrica y consciente de instrucciones: una consulta se
    prefija con la instrucción de recuperación de BGE y cada vector se
    normaliza con L2. Un embedder en la nube de Voyage AI es la alternativa
    configurable.
- **Enfoques de mitigación de sesgos.** Un bucle de generación
  productor-crítico puntúa cada turno sintético en fidelidad de EM,
  cumplimiento de alcance y fundamentación y regenera los turnos por debajo
  del umbral; el generador y el crítico son versiones de modelo distintas. Los
  segmentos de evaluación en es-419 y pt-BR se sostienen a los mismos umbrales
  que el inglés (puntuación de paridad de locale). El 100% de los turnos
  generados se cura manualmente, incluso por detalles que identifiquen
  accidentalmente y por paridad de locale. Las distribuciones de adherencia se
  muestrean de rangos epidemiológicos publicados para contrarrestar el
  artefacto de sobre-adherencia. El sesgo de vocabulario residual en inglés de
  EE. UU. se documenta en lugar de declararse resuelto. Como el agente no toma
  ningún rasgo de entrada demográfico, la principal superficie de sesgo del
  modelo son los datos sintéticos en sí, que es lo que estas medidas atacan.
- **Mantenimiento continuo.** El repositorio es la superficie de
  mantenimiento; no hay un despliegue desplegado que monitorear.
  - *Monitoreo de validez* - cada cambio lo controla el arnés de evaluación en
    cada pull request: una regresión en corrección de citación, rechazo o
    escalamiento hace fallar el build. Un flujo de trabajo nocturno de
    red-team de Promptfoo ejercita el OWASP LLM Top 10 más 13 casos
    adversariales hechos a mano.
  - *Monitoreo de equidad* - los tres segmentos de locale se puntúan bajo
    umbrales idénticos en cada corrida, así que una regresión de locale es una
    falla del build.
  - *Proceso de actualización* - el prompt del agente, la base de conocimiento
    y el corpus de evaluación se versionan junto con el código bajo versionado
    semántico. Un cambio en la postura regulatoria, el conjunto de rechazos o
    los criterios de escalamiento requiere un Registro de Decisión de
    Arquitectura y se registra en las notas de versión.
  - *Corrección de riesgos* - un patrón de red-team descubierto se reincorpora
    al banco de semillas adversariales; un defecto descubierto abre una
    incidencia rastreada.
  - *Herramientas de monitoreo* - spans de OpenTelemetry + OpenInference en
    cada nodo, llamada al LLM y llamada de embedding; contabilidad de
    tokens/latencia/costo por turno; una puerta de costo estricta y bloqueante
    de PR. Destinos opcionales: Langfuse Cloud y un Phoenix autohospedado.
  - *Mejoras anticipadas* - una pasada de base de conocimiento localizada y un
    corpus más amplio y temáticamente más diverso que permitiría habilitar el
    umbral de similitud de recuperación.
- **Prácticas del entorno de seguridad y cumplimiento.** Sin acreditación
  formal de seguridad (sin SOC 2, ISO 27001, FedRAMP) -es una implementación
  de referencia de código abierto, no un servicio hospedado. Controles
  practicados: dependencias ancladas mediante el lockfile; Dependabot y
  escaneo de secretos habilitados en CI; sin secretos en el repositorio; un
  invariante de privacidad según el cual el **texto del mensaje del usuario
  nunca se escribe en un span, registro o atributo de traza**, impuesto por
  una prueba unitaria dedicada; redacción de PII antes de que cualquier texto
  llegue al LLM; un proceso publicado de divulgación de seguridad en la
  [política de seguridad](security.md). El diseño está mapeado a la guía de
  General-Wellness / Clinical-Decision-Support de la FDA 2026, la guía de la
  OMS 2024 sobre modelos multimodales grandes, las Good Machine Learning
  Practice de la MHRA y los artículos de gobernanza de modelos de la Ley de IA
  de la UE en la [postura regulatoria](regulatory-posture.md).
- **Mecanismos de transparencia, inteligibilidad y responsabilidad.** Cada
  respuesta de `POST /chat` lleva su **traza completa de decisiones de las
  barreras de seguridad** y su **conjunto de citaciones**, en el mismo esquema
  contra el que puntúa el arnés de evaluación, de modo que un lector pueda ver
  exactamente por qué el agente respondió, se rehusó o escaló. La demo
  interactiva renderiza esa traza en vivo en un panel de traza del backend.
  Cada afirmación clínica dentro de alcance debe citar una tarjeta de la base
  de conocimiento; una decisión de citación-no-verificada o de
  citación-faltante se expone. El paso opcional con humano en el bucle pone a
  una persona en la ruta de responsabilidad para los borradores de alto
  riesgo. Los Registros de Decisión de Arquitectura documentan las elecciones
  de diseño sustantivas. Cada respuesta de la demo lleva el descargo de
  responsabilidad en línea "Esto es una demostración. No es asesoría médica.",
  verificado por el arnés de evaluación como un invariante de seguridad.

### Información de transparencia

- **Fuente de financiamiento de la implementación técnica.** Ninguna. El
  repositorio fue escrito por Waldemar Szemat sin financiamiento externo, sin
  patrocinador corporativo y sin socio institucional.
- **Información de terceros.** El sistema depende de proveedores externos de
  LLM y de embeddings, todos alcanzados a través de sus API públicas y todos
  seleccionados por configuración: Groq, Cerebras, OpenAI, Anthropic
  (completación) y Voyage AI (embeddings); un modelo BGE de
  `sentence-transformers` incorporado provee un respaldo de embeddings sin
  red. Componentes clave de código abierto: LangGraph (orquestación), FastAPI
  (superficie HTTP), Chroma (almacén de vectores), OpenTelemetry y
  OpenInference (trazado), DeepEval y un núcleo de scorer hecho a mano
  (evaluación), Promptfoo (red-team). Destinos de observabilidad opcionales:
  Langfuse Cloud, Arize Phoenix. Ningún tercero está integrado en una decisión
  clínica.
- **Partes interesadas consultadas durante el diseño de la intervención.**
  Como implementación de referencia de un solo autor, no se consultó
  formalmente a pacientes externos, proveedores ni grupos de defensa. El
  diseño se apoya en la experiencia de campo previa del autor liderando la
  ingeniería de un producto de adherencia a la medicación de salud digital en
  LATAM, y en los documentos de guía publicados enumerados en la
  [postura regulatoria](regulatory-posture.md). Esto se declara con
  franqueza porque la ficha de CHAI lo pide y la respuesta honesta es
  "ninguna, por la naturaleza del artefacto".

---

## Métricas clave

> La CHAI Applied Model Card pide métricas bajo tres áreas de principios. La
> medición primaria, reproducible y forzada por CI de este proyecto es la
> **puerta de evaluación determinista**: ejecuta el grafo real del agente
> contra el corpus sintético con un cliente LLM de prueba (stub) (sin claves,
> juez desactivado), de modo que el resultado es plenamente reproducible y
> aísla el comportamiento de las *barreras de seguridad* de la variabilidad
> del modelo. Los números de abajo son esa corrida determinista. Las métricas
> que dependen de un modelo en vivo (fundamentación, fidelidad, alucinación y
> tasas de aprobación en vivo) **no están codificadas de forma fija aquí**: se
> refrescan por separado, porque el comportamiento de un modelo en vivo cambia
> entre corridas y una ficha de modelo no debe congelar un número que no pueda
> reproducir a demanda.

### Utilidad, usabilidad y eficacia

- **Objetivo de la(s) métrica(s).** Demostrar que el agente fundamenta cada
  afirmación clínica en una tarjeta verificada de la base de conocimiento, y
  que un turno se completa cómodamente dentro del presupuesto de costo y
  latencia por turno para que el sistema sea operable a $0/mes en
  infraestructura de nivel gratuito.
- **Resultado.**
  - `citation_correctness` = **1.000** (ningún turno citó un id de tarjeta de
    KB desconocido).
  - `citation_coverage` = **0.225** agregado.
  - Puerta de costo / latencia: **PASS**, modo estricto, contra los
    presupuestos por turno documentados (4.000 tokens de entrada / 1.000
    tokens de salida / 8.000 ms).
  - Las cifras de usabilidad del modelo en vivo (tokens y latencia por turno
    en el nivel gratuito de Groq) se refrescan por separado.
- **Interpretación.** `citation_correctness = 1.000` significa que la barrera
  de seguridad de citación nunca dejó pasar un id de tarjeta fabricado en el
  corpus. La baja `citation_coverage` es **esperada y no un defecto del
  agente**: el cliente LLM de prueba (stub) determinista no emite marcadores
  de citación por diseño, así que en los casos golden la cobertura lee 0,00 y
  solo los casos de no-coincidencia / adversariales que no deberían portar
  citación puntúan 1,00. La cobertura real de citaciones es una propiedad del
  modelo en vivo y se mide en la corrida en vivo. La cobertura se reporta pero
  no es una dimensión de control de PR.
- **Tipo de prueba.** *Interna*, reproducible, determinista. El agente se
  ejecuta de extremo a extremo con un cliente LLM de prueba (stub) y sin
  claves de API; los resultados son idénticos entre corridas sobre el mismo
  código.
- **Descripción de los datos de prueba.** El corpus sintético de 218 casos:
  100 en inglés (que abarcan las categorías golden, adversarial y de
  no-coincidencia), 59 en es-419, 59 en pt-BR. Plenamente sintético; consulta
  los [datos](data.md).
- **Proceso de validación y justificación.** Ejecutada por el target de
  evaluación y por el flujo de trabajo de CI de evaluación en cada pull
  request. Es una validación de ingeniería de software del comportamiento de
  las barreras de seguridad y de la canalización, **no** una validación
  clínica -el agente no ha sido, y no afirma haber sido, validado
  clínicamente.

### Imparcialidad y equidad

- **Objetivo de la(s) métrica(s).** Demostrar que el comportamiento de
  seguridad del agente no se degrada a lo largo de los tres locales soportados
  -que un usuario de es-419 o pt-BR se sostiene a la misma barra de seguridad
  que un usuario de inglés.
- **Resultado.** Los **218** casos del corpus pasan la puerta determinista,
  incluidos los 59 de es-419 y los 59 de pt-BR; `refusal_correctness` =
  **1.000** y `escalation_correctness` = **1.000** a lo largo de cada segmento
  de locale. La puerta aplica un conjunto de umbrales idéntico a los tres
  locales.
- **Interpretación.** En el corpus determinista **no hay brecha de locale** en
  el comportamiento de seguridad: la corrección de rechazo y de escalamiento
  es uniforme a lo largo de en, es-419 y pt-BR. La advertencia honesta es que
  un modelo en vivo puede comportarse de forma distinta por locale -corridas
  en vivo previas surfacearon fallos adversariales en es-419 que las barreras
  de seguridad deterministas no tienen- y que los datos sintéticos subyacentes
  portan un sesgo conocido de vocabulario en inglés de EE. UU. (consulta
  *Sesgos conocidos*). Esta métrica concierne a la paridad de *locale*; el
  agente no toma raza, sexo, edad ni ningún otro input demográfico, así que no
  hay desglose de desempeño por subgrupo demográfico aplicable.
- **Tipo de prueba.** *Interna*, determinista, estratificada por locale.
- **Descripción de los datos de prueba.** Los segmentos de 59 de es-419 y 59
  de pt-BR del corpus, curados a la misma barra que los casos en inglés,
  puntuados contra los mismos umbrales.
- **Proceso de validación y justificación.** Los segmentos de locale se
  ejecutan en cada pull request junto al inglés; una regresión específica de
  locale hace fallar el build. Justificación: la paridad de locale es una
  propiedad de diseño declarada, así que se impone en lugar de afirmarse.

### Seguridad y confiabilidad

- **Objetivo de la(s) métrica(s).** Demostrar que el agente (a) rechaza de
  forma determinista las categorías enumeradas fuera de alcance, (b) escala de
  forma determinista los turnos de banderas rojas agudas a una plantilla de
  emergencia y (c) hace ambas cosas de forma reproducible, antes de que se
  involucre ningún LLM.
- **Resultado.**
  - `refusal_correctness` = **1.000** (cada caso `must_refuse` fue rechazado;
    rechazo-vs-sobre-rechazo puntuado en dos ejes).
  - `escalation_correctness` = **1.000** (cada caso `must_escalate` surfaceó
    una plantilla de escalamiento).
  - **Puerta determinista general: PASS**, juez desactivado.
  - En la puerta de red-team sin conexión, los **13** casos adversariales
    hechos a mano se rechazan de forma determinista porque la capa de barreras
    de seguridad se dispara antes de alcanzar el nodo del LLM.
  - El comportamiento de seguridad del modelo en vivo (una tasa de aprobación
    más baja y honesta que surfacea el propio escalamiento subagudo del modelo
    y los fallos adversariales) y la medición de red-team en vivo se refrescan
    por separado con procedencia completa.
- **Interpretación.** La puerta determinista prueba que la *capa de barreras
  de seguridad* es correcta y reproducible: la lista de regex de escalamiento
  agudo y las categorías de rechazo se disparan según lo especificado, sin
  claves, en cada corrida. Deliberadamente **no** prueba que el agente sea "a
  prueba de jailbreak" ni robusto ante una inyección de prompts arbitraria
  -esa es una medición separada, de corrida en vivo. Dos limitaciones acotan
  este resultado con honestidad: (1) los síntomas subagudos que no están en la
  lista de banderas rojas agudas se dejan al modelo y son un modo de falla
  conocido en las corridas en vivo; (2) una pregunta clínica casi-coincidente
  fuera del corpus se responde contra la tarjeta más cercana en lugar de
  rechazarse (consulta *Riesgos y limitaciones conocidos*).
- **Tipo de prueba.** *Interna*, determinista. El grafo real del agente se
  ejecuta con un cliente LLM de prueba (stub); las barreras de seguridad se
  ejercitan exactamente como en producción porque se ejecutan como nodos del
  grafo antes de la generación.
- **Descripción de los datos de prueba.** Los 19 casos adversariales en
  inglés y los 5 de no-coincidencia, los segmentos adversariales de es-419 y
  pt-BR, y los casos que deben escalar a lo largo del corpus, más los 13 casos
  de red-team hechos a mano.
- **Proceso de validación y justificación.** La puerta de evaluación
  determinista y la puerta de red-team sin conexión se ejecutan en cada pull
  request; el red-team en vivo se ejecuta cada noche. Una regresión de
  seguridad hace fallar el build. Justificación: la superficie de seguridad es
  el comportamiento de mayor consecuencia de un agente de salud, así que se
  ancla a verificaciones deterministas, sin claves y reproducibles en lugar de
  al buen comportamiento de un modelo en un día dado.

---

## Recursos

- **Referencias de evaluación.** El arnés de evaluación, sus scorers y la
  lógica de la puerta son parte del código fuente publicado; el último reporte
  determinista lo genera el target de evaluación y es reproducible en un clon
  limpio. Los resultados de las corridas en vivo se refrescan por separado.
- **Ensayo clínico.** Ninguno. No se ha realizado ningún ensayo clínico;
  ninguno es aplicable a una implementación de referencia no desplegada.
- **Publicación(es) revisada(s) por pares.** Ninguna. Este es un artefacto de
  referencia de código abierto, no una publicación de investigación.
- **Estado de reembolso.** No aplica. El artefacto no es un producto ni
  servicio facturable.
- **Consentimiento o divulgación del paciente requerido o sugerido.** No hay
  consentimiento del paciente aplicable porque el sistema no tiene pacientes
  reales ni datos reales de pacientes; el conjunto de datos es plenamente
  sintético y no porta PHI ni PII (consulta la declaración del IRB en los
  [datos](data.md)). La divulgación *sí* está integrada de todos modos: cada
  respuesta de la demo lleva un banner persistente y un pie de página en línea
  que declaran que es una demostración, que usa datos sintéticos, que no es un
  dispositivo médico y que las preguntas médicas van al clínico del usuario. Si
  la arquitectura alguna vez se convirtiera en producto para usuarios reales,
  se requeriría la divulgación y el consentimiento explícitos del usuario
  apropiados a la jurisdicción.
- **Partes interesadas consultadas durante el diseño de la solución.** Ninguna
  consultada formalmente; consulta la *Información de transparencia* anterior.
  El diseño se apoya en la experiencia de campo previa del autor y en la guía
  regulatoria y de ética publicada.

### Consulta también

- [postura regulatoria](regulatory-posture.md) - el límite de la FDA / OMS /
  MHRA / Ley de IA de la UE que el diseño respeta, y la lista canónica de lo
  que está fuera de alcance.
- [datos](data.md) - la ficha del conjunto de datos sintético (formato Google
  Data Cards Playbook), metodología de generación, postura de licencias,
  declaración del IRB.
- [política de seguridad](security.md) - proceso de divulgación de seguridad.
- CHAI Applied Model Card (plantilla seguida por este documento):
  <https://www.chai.org/workgroup/applied-model> y
  <https://github.com/coalition-for-health-ai/mc-schema>.
