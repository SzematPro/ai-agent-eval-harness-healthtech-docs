---
title: Redacción de PII
description: Patrones de detección, integración en el pipeline y limitaciones de la redacción determinista de PII en la implementación de referencia pública.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Documentación de redacción de PII

> Documenta las capacidades de redacción de PII (información de identificación personal) de
> la implementación de referencia `ai-agent-eval-harness-healthtech`. Cubre los patrones de detección,
> la integración en el pipeline y las limitaciones del módulo actual de redacción de PII.
>
> Léase junto con la [evaluación de preparación para HIPAA](hipaa-readiness.md) y el
> [mapeo de la Ley 19.628 de Chile](chile-ley-19628.md).

## Arquitectura de la redacción de PII

### Integración en el pipeline

La redacción de PII se aplica en dos puntos del pipeline del agente:

1. **En la entrada (ingreso)**: La entrada del usuario se analiza en busca de patrones de PII antes de ser procesada
   por el pipeline del agente. La PII detectada se reemplaza con tokens de marcador de posición (p. ej.,
   `[EMAIL]`, `[PHONE]`, `[SSN]`). El texto redactado es lo que procesa el agente.

2. **En la salida (egreso)**: La salida del agente se analiza en busca de patrones de PII antes de devolverse
   al usuario. Esto captura los casos en que el LLM genera PII de forma inadvertida (p. ej.,
   repitiendo un número telefónico del contexto de la conversación).

La redacción se ejecuta en la capa de barreras de seguridad y está integrada en los nodos `guardrail_pre`
y `guardrail_post` del pipeline de LangGraph.

### Eventos de redacción en los spans de telemetría

Los eventos de redacción de PII se registran como atributos de spans de telemetría:

- `pii.redacted`: booleano que indica si ocurrió la redacción
- `pii.pattern_type`: el tipo de patrón que coincidió (p. ej., "email", "phone_us",
  "rut_chile")

El texto del mensaje del usuario nunca se incluye en los atributos del span (invariante de privacidad).

## Patrones de detección

### Tipos de PII detectados actualmente

| Tipo de PII | Patrón | Configuración regional | Ejemplo |
|----------|---------|--------|---------|
| **Direcciones de correo electrónico** | Regex simplificada de RFC 5322 | Universal | `user@example.com` -> `[EMAIL]` |
| **Números telefónicos de EE. UU.** | Formato NANP con prefijo +1 opcional | en (EE. UU.) | `+1 (555) 123-4567` -> `[PHONE]` |
| **Números telefónicos chilenos** | Prefijo +56, patrones de móvil (9) y fijo | es-419 (Chile) | `+56 9 1234 5678` -> `[PHONE]` |
| **Números telefónicos brasileños** | Prefijo +55, patrones de móvil (9 dígitos) y fijo | pt-BR (Brasil) | `+55 11 91234-5678` -> `[PHONE]` |
| **SSN de EE. UU.** | Formato `XXX-XX-XXXX` con validación de rango | en (EE. UU.) | `123-45-6789` -> `[SSN]` |
| **RUT chileno** | Formato `XX.XXX.XXX-X` con dígito verificador módulo 11 | es-419 (Chile) | `12.345.678-5` -> `[RUT]` |
| **CPF brasileño** | Formato `XXX.XXX.XXX-XX` con dígito verificador módulo 11 | pt-BR (Brasil) | `123.456.789-09` -> `[CPF]` |
| **DNI chileno** | Patrones de documentos de identidad nacionales | es-419 (Chile) | Varios formatos -> `[DNI]` |
| **Números de tarjeta de crédito** | Números de 13-19 dígitos con validación por algoritmo de Luhn | Universal | `4111 1111 1111 1111` -> `[CC]` |
| **Números de historia clínica (MRN)** | Patrones alfanuméricos comunes en sistemas de salud | en (EE. UU.) | `MRN-12345678` -> `[MRN]` |
| **Fechas de nacimiento (DOB)** | Formatos comunes de DOB (MM/DD/AAAA, DD/MM/AAAA) | Universal | `01/15/1990` -> `[DOB]` |

### Metodología de coincidencia de patrones

La detección de PII usa patrones de regex deterministas, no detección basada en LLM. Esto asegura:

- **Reproducibilidad**: La misma entrada siempre produce el mismo resultado de redacción
- **Determinismo**: La redacción de PII se ejecuta en la capa de barreras de seguridad, la cual prueba la
  compuerta determinista de CI (un cliente LLM stub, sin necesidad de claves de API)
- **Baja latencia**: La coincidencia por regex es rápida y agrega una sobrecarga insignificante al pipeline
- **Auditabilidad**: Las definiciones de patrones están bajo control de versiones y son revisables

### Verificaciones de validación

Algunos tipos de PII incluyen validación estructural más allá de la coincidencia de patrones:

- **Números de tarjeta de crédito**: Validados con el algoritmo de Luhn para reducir falsos positivos
  en secuencias arbitrarias de dígitos
- **RUT**: Validado con el algoritmo chileno de dígito verificador módulo 11
- **CPF**: Validado con el algoritmo brasileño de dígito verificador módulo 11
- **SSN**: Validado por rango para excluir rangos imposibles (p. ej., 000, 666, 900-999 en
  el número de área)

## Limitaciones

### Limitaciones conocidas de la detección basada en regex

1. **PII dependiente del contexto**: Los patrones de regex no pueden detectar PII que se infiere del contexto
   en lugar de estar formateada en un patrón reconocible. Por ejemplo, "mi nombre es Juan y
   vivo en la esquina de Main y Oak" contiene PII (nombre, ubicación) que ninguna regex
   puede extraer de forma confiable.

2. **Formatos nuevos**: Los nuevos formatos de números telefónicos, formatos de números de identificación o formatos de
   dirección que no cubren los patrones existentes pasarán sin ser detectados.

3. **Formatos internacionales**: Si bien el módulo cubre formatos de EE. UU., chilenos y brasileños,
   la PII de otras jurisdicciones puede no detectarse. La cobertura está alineada intencionalmente
   con las tres configuraciones regionales admitidas.

4. **PII parcial**: La PII fragmentada distribuida en varios mensajes (p. ej., el código de área en
   un mensaje y los dígitos restantes en el siguiente) no se detecta.

5. **Abreviaturas y jerga**: La PII expresada de manera informal (p. ej., "mi número es cinco
   cinco cinco uno dos tres cuatro" -- dígitos deletreados) no se detecta.

6. **Falsos positivos**: Los patrones de regex pueden ocasionalmente redactar contenido que no es PII pero que
   coincide con el formato de un patrón (p. ej., un código de producto de 9 dígitos que coincide con el formato de SSN). Las
   validaciones de Luhn y módulo 11 mitigan esto en los identificadores financieros.

### Lo que la redacción de PII NO hace

- **No impide que el LLM genere contenido similar a PII**: La redacción de salida
  captura los patrones de PII generados, pero un LLM sofisticado podría generar contenido
  cercano a PII sin coincidir con los patrones.
- **No redacta nombres**: Los nombres de personas no se redactan porque la detección confiable de nombres
  sin un modelo de NER produce tasas de falsos positivos inaceptables.
- **No redacta direcciones**: Las direcciones postales no se redactan debido a la amplia
  variación de formatos de dirección entre configuraciones regionales.
- **No redacta datos biométricos**: No se incluyen patrones de datos de huella dactilar, de voz ni de reconocimiento
  facial (el sistema no recolecta datos biométricos).
- **No proporciona privacidad diferencial**: La redacción de PII elimina identificadores directos
  pero no proporciona garantías matemáticas de privacidad.

## Estado actual

La implementación de referencia proporciona redacción determinista de PII que cubre los tipos de
identificadores más comunes en sus tres configuraciones regionales admitidas (EE. UU., Chile, Brasil). El
módulo de redacción se ejecuta en la capa de barreras de seguridad, lo prueba la compuerta determinista de CI
y registra los eventos de redacción en spans de telemetría.

Fortalezas clave:

1. **Determinista y reproducible**: La misma entrada, la misma redacción, siempre. Sin
   dependencia del comportamiento del LLM para la detección de PII.
2. **Cobertura multiconfiguración regional**: Patrones para identificadores de EE. UU., chilenos y brasileños,
   alineados con las tres configuraciones regionales admitidas.
3. **Validación estructural**: Algoritmo de Luhn para tarjetas de crédito, módulo 11 para RUT y CPF,
   validación de rango para SSN -- reduciendo los falsos positivos en los patrones más sensibles.
4. **Integración en el pipeline**: Redacción en las etapas de entrada y salida, integrada en
   los nodos de barreras de seguridad que prueba el arnés de evaluación.
5. **Traza de auditoría**: Eventos de redacción registrados en spans de telemetría con el tipo de patrón, lo que permite
   monitorear la frecuencia de redacción y la distribución de patrones.

## Camino a producción

Una redacción de PII de nivel de producción requeriría:

1. **Cobertura de patrones ampliada**: Tipos de PII adicionales (nombres mediante NER, direcciones, direcciones
   IP, identificadores de vehículos, patrones de datos biométricos, formatos de historia clínica
   de sistemas EHR específicos); cobertura para jurisdicciones adicionales más allá de EE. UU./Chile/Brasil

2. **Detección residual basada en LLM**: Una pasada secundaria de detección de PII basada en LLM para capturar
   la PII que los patrones de regex omiten (PII dependiente del contexto, formatos nuevos, PII parcial);
   aplicada como una verificación de segunda etapa tras la redacción basada en regex

3. **Métricas de calidad de redacción**: Medición automatizada de la precisión y la exhaustividad de la redacción
   frente a un conjunto de prueba etiquetado; seguimiento de las tasas de falsos positivos y falsos negativos;
   pruebas de regresión cuando se actualizan los patrones

4. **Revisión periódica de patrones**: Revisión regular de los patrones de PII frente a los formatos de datos
   emergentes, los nuevos tipos de identificadores y las regulaciones de privacidad en evolución; cadencia de actualización
   ligada al ciclo de revisión regulatoria

5. **Patrones específicos del dominio**: Si se despliega en contextos específicos de salud o financieros,
   patrones personalizados para formatos de identificadores específicos de la institución (p. ej., formatos de MRN
   de EHR específicos, formatos de identificación de seguros, formatos de números de cuenta)

6. **Registro de redacción para cumplimiento**: Más allá de los atributos actuales de los spans de telemetría,
   producción necesitaría registros de auditoría de redacción dedicados con políticas de conservación,
   controles de acceso e informes de cumplimiento

7. **Gestión de solicitudes de titulares de datos**: Mecanismos para que los titulares soliciten información
   sobre qué PII se detectó y se redactó; procedimientos de eliminación para cualquier metadato de redacción
   almacenado

## Véase también

- [Evaluación de preparación para HIPAA](hipaa-readiness.md) -- evaluación de preparación para HIPAA
- [Mapeo de la Ley 19.628 de Chile](chile-ley-19628.md) -- mapeo de protección de datos de Chile
- [Plan de registro de auditoría](audit-logging-plan.md) -- plan de registro de auditoría
- [Diseño de barreras de seguridad](../adr/adr-0005-guardrails.md) -- diseño de barreras de seguridad
