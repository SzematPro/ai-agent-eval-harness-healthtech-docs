---
title: Política de consentimiento de voz y deepfakes
description: Marco de consentimiento para la integración de voz, conciencia del riesgo de deepfakes y la política de manejo de datos de audio de la implementación de referencia pública.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Política de consentimiento de voz y deepfakes

> Documenta el marco de consentimiento para la integración de voz de la
> implementación de referencia `ai-agent-eval-harness-healthtech`, incluidos los mecanismos
> de consentimiento, la conciencia del riesgo de deepfakes y la política de manejo de datos de voz.
>
> Léase junto con la [postura regulatoria](../reference/regulatory-posture.md) y la
> [decisión de diseño de la extensión de voz](../adr/adr-0014-voice-extension.md).

## Descripción general de la integración de voz

La implementación de referencia incluye capacidades de voz opcionales mediante la integración de TTS/STT de ElevenLabs:
texto a voz para las respuestas del agente y voz a texto para la entrada del usuario.
La voz es una función opcional, DESACTIVADA por defecto, con un interruptor persistido en el navegador.
Los metadatos de voz se transportan en eventos sidecar de streaming en lugar de en el esquema de respuesta
del chat, lo que preserva el contrato de respuesta estable y la inmutabilidad del esquema.

## Marco de consentimiento

### Mecanismos de consentimiento actuales

| Mecanismo | Implementación | Ubicación |
|-----------|---------------|----------|
| **Interruptor de voz** | Opcional mediante interruptor en la UI; por defecto DESACTIVADO; persistido en el navegador | SPA del frontend |
| **Detección de funciones** | Verificación de capacidades del navegador (`navigator.mediaDevices`, `MediaRecorder`); desactivación elegante si no es compatible | Módulo de detección de funciones del frontend |
| **Modal de divulgación** | Modal de divulgación previo al permiso que explica: qué datos se capturan, cómo se procesan y que el audio NO se conserva | Componente modal del frontend |
| **Aviso de "audio NO conservado"** | Mostrado en varias ubicaciones: modal de divulgación, panel de configuración de voz, indicador de activación del micrófono y sección de ayuda/preguntas frecuentes | UI del frontend |
| **Límite de duración de grabación** | Duración máxima de grabación de 30 segundos por turno | Aplicación en el frontend |
| **Visibilidad del micrófono** | Indicador visual cuando el micrófono está activo; sigue los indicadores de permiso del navegador | Superposición de UI del frontend |

### Flujo de consentimiento

1. El usuario abre la configuración de voz o hace clic en el micrófono por primera vez
2. Aparece el modal de divulgación que explica: la entrada de voz se convierte a texto mediante STT,
   la procesa el agente y el audio NO se almacena ni se transmite más allá del
   servicio de STT
3. El usuario reconoce la divulgación
4. Aviso de permiso del navegador para el acceso al micrófono (UI nativa del navegador)
5. Si se concede: se activa el interruptor de voz y se muestra el indicador del micrófono al grabar
6. Si se deniega: regreso elegante a la entrada solo de texto

### Lo que los datos de voz NO son

- Los datos de voz NO se almacenan de forma persistente
- Los datos de voz NO se usan para el entrenamiento de modelos
- Los datos de voz NO se comparten con terceros más allá del servicio de STT
- Los datos biométricos de voz NO se recolectan ni se analizan
- Las grabaciones de voz NO se conservan tras el procesamiento de STT

## Conciencia del riesgo de deepfakes

### Evaluación de amenazas

Los sistemas de IA habilitados por voz conllevan riesgos inherentes de deepfakes que deben reconocerse
y mitigarse:

| Riesgo | Evaluación | Mitigación |
|------|-----------|------------|
| **Clonación de voz a partir de la entrada del usuario** | El audio del usuario lo procesa el STT (voz a texto) y no se usa para la síntesis de voz; ningún modelo de voz se entrena con el audio del usuario | Procesamiento solo por STT; sin pipeline de entrenamiento de modelos de voz; el audio no se conserva tras el STT |
| **Suplantación con voz sintética** | El TTS genera las respuestas del agente con voces de ElevenLabs (Sarah/EN, Matilda/ES, Bella/PT-BR); estos son modelos de voz con licencia, no clones de personas reales | Solo voces de TTS con licencia; sin entrenamiento de voz personalizado; sin capacidad de clonación de la voz del usuario |
| **Uso indebido de la salida de voz del agente** | La salida de TTS del agente podría ser grabada por los usuarios y tergiversada como la voz de una persona real | Aviso legal de la demo en cada respuesta ("Esto es una demostración. No es asesoría médica."); la voz de TTS es claramente sintética |
| **Generación de deepfakes a partir de contenido de salud** | Las salidas de un agente de salud habilitado por voz podrían usarse para generar asesoría médica falsa convincente | Las barreras de seguridad impiden la asesoría clínica (dosificación, diagnóstico, cambio de prescripción); exigencia de citaciones; rechazo de lo fuera de alcance |

### Medidas contra deepfakes

1. **Sin capacidad de clonación de voz**: El sistema proporciona salida de TTS con voces de ElevenLabs
   con licencia. No entrena, ajusta ni clona ninguna voz. Ningún audio del usuario
   se almacena ni se usa para la síntesis.

2. **Voz sintética transparente**: La salida de TTS es claramente sintética. El modal de
   divulgación informa a los usuarios que las respuestas del agente las genera la IA y las pronuncia una
   voz sintética.

3. **Las barreras de seguridad aplican por igual a la voz**: El mismo clasificador de alcance, las plantillas de rechazo
   y el enrutador de escalamiento que rigen las interacciones de texto aplican a la voz. Una solicitud de voz
   de asesoría de dosificación se rechaza igual que una solicitud de texto.

4. **Sin persistencia de audio**: La entrada de audio la procesa el STT y se descarta. La salida de audio
   se genera por respuesta y no se almacena. No se escriben archivos de audio en disco
   ni se persisten en ningún sistema de almacenamiento.

## Estado actual

La integración de voz es opcional y está DESACTIVADA por defecto. El marco de consentimiento descrito
arriba está implementado; las decisiones de diseño que rigen la voz se recogen en el registro de
decisión de la extensión de voz.

Restricciones clave de diseño que protegen a los usuarios:

- **La voz es opcional**: El interruptor está DESACTIVADO por defecto; los usuarios deben habilitar la voz explícitamente
- **Detección de funciones con desactivación elegante**: Si el navegador no es compatible con
  `navigator.mediaDevices` o `MediaRecorder`, los controles de voz se ocultan; la interfaz
  de texto funciona sin degradación
- **Divulgación antes del permiso**: El modal de divulgación aparece antes del aviso de permiso
  del micrófono del navegador, lo que brinda a los usuarios información antes de tomar una decisión
- **Audio NO conservado**: Este compromiso se declara en varias ubicaciones y lo aplica la
  arquitectura: ningún archivo de audio se escribe en ningún almacenamiento en ningún punto del pipeline
- **Límite de grabación de 30 segundos**: Evita la grabación indefinida; aplicado del lado del cliente
- **Las mismas barreras de seguridad que para el texto**: La entrada de voz se transcribe a texto y se procesa a través
  del mismo pipeline de LangGraph de seis nodos con barreras de seguridad idénticas

El marco de consentimiento sigue el principio de que el consentimiento debe ser informado, específico
y libremente otorgado. El modal de divulgación previo al permiso asegura que los usuarios comprendan qué
sucede con sus datos de voz antes de conceder el acceso al micrófono.

## Camino a producción

Un despliegue en producción con voz necesitaría reforzar el marco de consentimiento y de
deepfakes:

1. **Flujo de consentimiento de voz explícito**: Captura formal del consentimiento con marca de tiempo y texto
   de consentimiento versionado; mecanismo de retiro del consentimiento; traza de auditoría del consentimiento para el
   cumplimiento regulatorio
2. **Capacidad de detección de deepfakes**: Si el sistema procesa entrada de voz en un contexto
   donde la suplantación es un riesgo, integrar autenticación de voz o detección de deepfakes
   para verificar que el hablante no esté usando audio sintetizado
3. **Política de biometría de voz**: Si alguna vez se recolecta biometría de voz (no planificado),
   consentimiento expreso conforme a las leyes de privacidad biométrica aplicables (p. ej., BIPA de Illinois,
   GDPR Art. 9); políticas de conservación y destrucción de datos biométricos
4. **Procedimientos de conservación y eliminación de audio**: Si se conserva algún audio para aseguramiento
   de calidad o depuración, definir plazos de conservación, procedimientos de eliminación y controles
   de acceso; ofrecer a los usuarios la capacidad de solicitar la eliminación
5. **Consentimiento entre jurisdicciones**: Los requisitos de consentimiento de voz varían según la jurisdicción;
   un despliegue en producción necesitaría flujos de consentimiento sensibles a la jurisdicción (p. ej., el GDPR
   exige consentimiento expreso; algunas jurisdicciones exigen notificaciones de grabación)
6. **Accesibilidad**: Asegurar que la interacción por voz sea accesible para usuarios con discapacidades
   del habla; ofrecer un respaldo de texto en todo momento; no hacer de la voz el único método de
   entrada para ninguna función crítica
7. **Datos de voz de menores**: Si el sistema pudiera ser usado por menores, protecciones
   adicionales conforme a COPPA (EE. UU.), GDPR Art. 8 (UE) y la Ley 19.628 (Chile) para
   datos de menores

## Véase también

- [Postura regulatoria](../reference/regulatory-posture.md) -- límite regulatorio
- [Ficha del modelo](../reference/model-card.md) -- CHAI Applied Model Card
- [Paridad de seguridad multilingüe](multilingual-safety-parity.md) -- seguridad multilingüe
- [Evaluación de preparación para HIPAA](hipaa-readiness.md) -- preparación para HIPAA
- [Diseño de la extensión de voz](../adr/adr-0014-voice-extension.md) -- diseño de la extensión de voz
