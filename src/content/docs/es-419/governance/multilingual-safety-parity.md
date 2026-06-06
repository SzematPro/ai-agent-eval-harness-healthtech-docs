---
title: Evaluación de paridad de seguridad multilingüe
description: Si los usuarios en inglés, es-419 y pt-BR reciben protecciones de seguridad equivalentes en la implementación de referencia pública, y las brechas de paridad conocidas.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Evaluación de paridad de seguridad multilingüe

> Documenta la postura de paridad de seguridad de la implementación de referencia
> `ai-agent-eval-harness-healthtech` en sus tres configuraciones regionales admitidas: inglés (en),
> español latinoamericano (es-419) y portugués brasileño (pt-BR). Esta evaluación
> determina si los usuarios en las tres configuraciones regionales reciben protecciones de seguridad equivalentes.
>
> Léase junto con la [declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/), la
> [ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) y el
> [modelo de amenazas OWASP ATLAS](/ai-agent-eval-harness-healthtech-docs/es-419/governance/owasp-atlas-threat-model/).

## Cobertura por configuración regional

| Dimensión | en | es-419 | pt-BR |
|-----------|-----|--------|-------|
| Plantillas de rechazo | Sí (10 plantillas) | Sí (10 plantillas) | Sí (10 plantillas) |
| Clasificador de alcance | Sí (patrones de regex) | Sí (patrones de regex) | Sí (patrones de regex) |
| Plantillas de escalamiento | Sí (2 plantillas; 10 subcategorías) | Sí (2 plantillas; 10 subcategorías) | Sí (2 plantillas; 10 subcategorías) |
| Casos del corpus de evaluación | 105 | 105 | 105 |
| Tarjetas de KB | 36 (inglés) | usa la KB en inglés | usa la KB en inglés |
| Aviso legal de la demo | Sí | Sí | Sí |
| Voces de TTS | Sarah | Matilda | Bella |

## Análisis de paridad de seguridad

### Paridad de plantillas de rechazo

Las plantillas de rechazo están completamente localizadas en las tres configuraciones
regionales (10 plantillas cada una, sin herencia del inglés), cubriendo:

1. Rechazo de asesoría de dosificación (`out-of-scope-dosing`)
2. Rechazo de diagnóstico (`out-of-scope-diagnosis`)
3. Rechazo de interpretación de laboratorio/imágenes/dispositivos (`out-of-scope-interpretation`)
4. Rechazo de manejo de PII (`pii-blocked`, `out-of-scope-pii`)
5. Rechazo de entrada malformada (`input-malformed`)
6. Rechazo por falta de fuente verificada (`no-context`)
7. Rechazo meta de autorrevelación / juego de roles (`out-of-scope-meta`)
8. Rechazo genérico por estar fuera de alcance (`default`)
9. Repliegue elegante por estar fuera de dominio (`out-of-domain`)

Cada plantilla sigue la misma estructura en todas las configuraciones regionales: un rechazo claro, redirección
al profesional de salud apropiado y el aviso legal de pie adecuado a la configuración regional.
El arnés de evaluación verifica que la corrección de rechazo sea 1.000 en todas las porciones por configuración regional,
lo que significa que las barreras de seguridad deterministas se activan de forma idéntica independientemente de la configuración regional.

### Paridad de umbrales de evaluación

| Métrica | Umbral | Aplicado a las configuraciones regionales |
|--------|-----------|-------------------|
| Fidelidad | >= 0.85 | en, es-419, pt-BR (idéntico) |
| Alucinación | <= 0.10 | en, es-419, pt-BR (idéntico) |
| Corrección de rechazo | = 1.000 | en, es-419, pt-BR (idéntico) |
| Corrección de escalamiento | = 1.000 | en, es-419, pt-BR (idéntico) |

Las tres porciones por configuración regional se sujetan a los mismos umbrales en el arnés de evaluación. Una
regresión específica de configuración regional reprueba la compilación. La compuerta determinista de CI ejecuta los 315
casos (105 en + 105 es-419 + 105 pt-BR) en cada cambio: las porciones no inglesas son
traducciones completas del maestro en inglés con etiquetas de comportamiento idénticas y
los mismos card-ids de referencia, de modo que cada configuración regional ejercita los mismos escenarios.

### Paridad de redacción de PII

El módulo de redacción de PII cubre patrones de identificadores específicos de cada configuración regional:

| Tipo de identificador | en (EE. UU.) | es-419 (Chile) | pt-BR (Brasil) |
|-----------------|---------|-----------------|-----------------|
| Correo electrónico | Sí | Sí | Sí |
| Números telefónicos | Formatos de EE. UU. | Formatos chilenos (+56, patrones de móvil) | Formatos brasileños (+55, móvil/fijo) |
| Identificación nacional | Patrones de SSN | Patrones de RUT (XX.XXX.XXX-X) | Patrones de CPF (XXX.XXX.XXX-XX) |
| Tarjeta de crédito | Validada con Luhn | Validada con Luhn | Validada con Luhn |
| Identificadores de salud | MRN, DOB | DNI + registro clínico (ficha/historia clínica, expediente) | contexto de CPF, registro clínico (prontuário, registro hospitalar, atendimento) |

La redacción de PII se aplica tanto en la etapa de entrada como en la de salida, independientemente de la configuración regional. Los
patrones de redacción para las tres configuraciones regionales se prueban en el conjunto de pruebas unitarias.

### Brechas de paridad conocidas

Las siguientes brechas de paridad se reconocen honestamente:

1. **Las tarjetas de KB están solo en inglés**: Las tarjetas de KB están escritas en inglés.
   Los usuarios de es-419 y pt-BR interactúan con el agente en su idioma, pero el contenido subyacente
   de la base de conocimiento está en inglés. Esto significa que el agente puede recuperar y citar una
   tarjeta en inglés mientras responde en español o portugués. La calidad de la
   recuperación translingüe depende de la capacidad multilingüe del embedder.

2. **Los datos sintéticos tienen sesgo de vocabulario en inglés estadounidense**: El corpus de evaluación, aunque se sujeta a
   umbrales idénticos, se generó con un sesgo conocido de vocabulario clínico en inglés estadounidense.
   El bucle productor-crítico corrige esto parcialmente, pero el sesgo residual se documenta
   en la declaración de datos en lugar de declararse resuelto.

3. **El corpus de evaluación es simétrico entre configuraciones regionales**: las porciones en, es-419 y
   pt-BR contienen cada una los mismos 105 escenarios con etiquetas de comportamiento idénticas y los mismos
   card-ids de referencia, de modo que ninguna configuración regional queda submuestreada respecto al inglés.
   La calidad de la recuperación translingüe aún depende del embedder en inglés (véase la brecha 4), pero la
   cobertura de escenarios es igual.

4. **Cobertura de idiomas del embedder**: El embedder por defecto (`BAAI/bge-small-en-v1.5`) está
   enfocado en inglés. La recuperación translingüe para es-419 y pt-BR depende de la
   capacidad del embedder para emparejar consultas no inglesas con tarjetas de KB en inglés. Un embedder
   multilingüe mejoraría la calidad de la recuperación.

5. **Cobertura de idiomas de las voces de TTS**: Las voces de TTS (Sarah para EN, Matilda para ES,
   Bella para PT-BR) proporcionan síntesis específica por idioma, pero la calidad y la naturalidad
   pueden variar entre voces.

## Estado actual

La implementación de referencia mantiene la paridad de seguridad en tres configuraciones regionales mediante
los siguientes mecanismos:

- **Umbrales de evaluación idénticos**: Las tres porciones por configuración regional se puntúan bajo los mismos
  umbrales en cada ejecución de CI. Una regresión específica de configuración regional es una falla de compilación.
- **Plantillas de rechazo sensibles a la configuración regional**: Las diez plantillas de rechazo tienen versiones nativas en
  en, es-419 y pt-BR, que siguen la misma estructura y se exigen mediante las mismas dimensiones
  de evaluación.
- **Redacción de PII sensible a la configuración regional**: Los patrones de identificadores para EE. UU., Chile y Brasil se
  detectan y se redactan en la misma etapa del pipeline.
- **Escalamiento sensible a la configuración regional**: Las plantillas de escalamiento por señal de alerta están disponibles en las
  tres configuraciones regionales (dos plantillas: emergencia médica y crisis
  de salud mental), cubriendo las diez subcategorías agudas (incluida la coocurrencia
  de embarazo + teratógeno).
- **Casos de evaluación de es-419 y pt-BR**: Porciones dedicadas del corpus de evaluación prueban el
  comportamiento específico de cada configuración regional en cada cambio.

La compuerta determinista de evaluación demuestra la paridad de las barreras de seguridad: la corrección de rechazo y la corrección
de escalamiento son 1.000 en las tres configuraciones regionales en cada ejecución. Esto significa que las barreras de seguridad
se activan de forma idéntica independientemente de la configuración regional del usuario.

La evaluación honesta es que la paridad de seguridad se logra en la capa de barreras de seguridad (determinista,
comprobable, reproducible) y en la capa de cobertura de evaluación (un corpus simétrico de 105 casos por
configuración regional), pero no plenamente en la capa del modelo (probabilística, dependiente de la
configuración regional) ni en la capa de conocimiento (las tarjetas de KB siguen en inglés).

## Camino a producción

Lograr una paridad de seguridad multilingüe plena en un despliegue en producción:

1. **Base de conocimiento localizada**: Tarjetas de KB escritas en el idioma de cada configuración regional por
   traductores médicos calificados, no traducidas por máquina; revisión clínica para cada
   configuración regional para asegurar que la terminología médica sea precisa y culturalmente apropiada

2. **Revisión de seguridad en lengua nativa**: Evaluación de seguridad realizada por revisores
   de lengua nativa para cada configuración regional, no solo ejecutando el mismo arnés de evaluación frente a
   casos de prueba traducidos; identificación de preocupaciones de seguridad específicas de cada configuración regional (p. ej.,
   convenciones de nomenclatura de medicamentos, números de servicios de emergencia, creencias de salud culturales)

3. **Tamaños equilibrados del corpus de evaluación**: Tamaños de corpus comparables entre configuraciones regionales para asegurar
   una representación equitativa de los modos de falla; generación dirigida de casos adversariales
   específicos del idioma y el contexto cultural de cada configuración regional

4. **Embedder multilingüe**: Embedder con sólido desempeño multilingüe para la
   recuperación translingüe; evaluación de la calidad de recuperación por configuración regional

5. **Rutas de escalamiento clínico específicas de cada configuración regional**: Orientación sobre servicios de emergencia adaptada
   al sistema de salud de cada configuración regional (p. ej., 911 para EE. UU., 131 para Chile, 192/SAMU para
   Brasil); recursos de crisis y líneas de ayuda específicos de cada configuración regional

6. **Adaptación cultural más allá de la traducción**: Comportamiento del agente adaptado a las normas
   culturales en torno a las conversaciones de salud (p. ej., la franqueza de la asesoría médica, la participación
   de la familia en las decisiones de salud, las actitudes hacia la medicación); no solo
   texto traducido, sino patrones de interacción culturalmente apropiados

7. **Monitoreo continuo por configuración regional**: Monitoreo de desempeño separado por configuración regional;
   alertas automatizadas ante regresiones específicas de configuración regional; revisión regular de los datos de
   desempeño por configuración regional a cargo de analistas de lengua nativa

## Véase también

- [Declaración de datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/) -- ficha del conjunto de datos sintético con metodología por configuración regional
- [Ficha del modelo](/ai-agent-eval-harness-healthtech-docs/es-419/reference/model-card/) -- CHAI Applied Model Card, sección de equidad
- [Política de consentimiento de voz y deepfakes](/ai-agent-eval-harness-healthtech-docs/es-419/governance/voice-consent-deepfake/) -- política de consentimiento de voz
- [Redacción de PII](/ai-agent-eval-harness-healthtech-docs/es-419/governance/pii-redaction/) -- redacción de PII por configuración regional
- [Diseño de barreras de seguridad](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/) -- diseño de barreras de seguridad
