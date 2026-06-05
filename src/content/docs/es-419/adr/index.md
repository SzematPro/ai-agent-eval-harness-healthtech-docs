---
title: Registros de decisiones de arquitectura
description: Índice de los registros de decisiones de arquitectura detrás de la implementación de referencia AI Agent Eval Harness.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Registros de decisiones de arquitectura

Esta sección contiene los registros de decisiones de arquitectura (ADR) de
la implementación de referencia `ai-agent-eval-harness-healthtech`. Cada ADR
captura una decisión arquitectónicamente significativa que es difícil o
costosa de revertir y explica por qué se tomó.

## Convenciones

- **Formato**: [MADR 4.0.0](https://adr.github.io/madr/). La plantilla
  canónica es [la plantilla de ADR](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-template/). Cópiala para cualquier
  decisión nueva; no inventes estructuras ad-hoc.
- **Ciclo de vida del estado**: `Proposed` -> `Accepted` -> `Superseded`. Un
  ADR reemplazado nunca se elimina; se renombra para conservar el registro
  histórico y enlaza hacia adelante al ADR que lo reemplaza.
- **Nomenclatura de archivos**: `ADR-NNNN-kebab-title`, secuencia de cuatro
  dígitos rellenada con ceros, título en kebab y minúsculas. Reserva el
  siguiente número al iniciar un borrador para evitar colisiones.
- **Alcance de un ADR**: una decisión por archivo. Si un escrito necesita
  volver a litigar un ADR anterior, registra un ADR nuevo y marca el antiguo
  como `Superseded by ADR-NNNN`.
- **Tono**: inglés técnico, sin texto de marketing, sin emojis, sin
  guiones largos. Toda afirmación sobre un framework, proveedor o versión
  cita una fuente primaria (notas de versión, documentación oficial, registro
  de la FDA, etc.).

## Índice

| ID | Título | Estado | Resumen en una línea |
|----|-------|--------|------------------|
| [ADR-0001](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0001-orchestration/) | Framework de orquestación | Accepted | LangGraph 1.x por encima de CrewAI, Microsoft Agent Framework, Claude Agent SDK, Pydantic AI, AutoGen. Grafo de seis nodos con un nodo HITL `review_response` opcional basado en `interrupt()` y una fábrica de checkpointer `MemorySaver` / `AsyncPostgresSaver`. |
| [ADR-0002](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/) | Abstracción de proveedor de LLM | Accepted | Un Protocol `LLMClient` delgado sobre adaptadores de LangChain más Groq / Cerebras de forma directa vía REST compatible con OpenAI, conmutado por una variable de entorno `LLM_PROVIDER`. |
| [ADR-0003](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0003-eval-harness/) | Arnés de evaluación | Accepted; reemplazado en parte por ADR-0009 | Núcleo pytest hecho a mano + DeepEval + Ragas + Phoenix + Promptfoo. La elección del modelo juez (Anthropic Claude Haiku) queda reemplazada por ADR-0009. |
| [ADR-0004](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0004-rag-stack/) | Stack de RAG | Accepted | Chroma embebido como primario con `BAAI/bge-small-en-v1.5` como embedder predeterminado usando recuperación asimétrica consciente de instrucciones; Qdrant Cloud y Voyage AI documentados como alternativas en la nube. |
| [ADR-0005](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0005-guardrails/) | Barreras de seguridad y postura regulatoria | Accepted | Clasificador de alcance, plantillas de rechazo y un enrutador de escalamiento determinista de siete categorías como módulos de primera clase; contrato de diseño = línea de la guía FDA 2026 General Wellness / CDS Software. |
| [ADR-0006](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0006-observability/) | Stack de observabilidad | Accepted | Formato de transmisión OpenTelemetry + OpenInference; Langfuse Cloud Hobby para la demo en vivo, Phoenix autoalojado para las corridas de evaluación, Pydantic Logfire documentado como alternativa. |
| [ADR-0007](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/) | Objetivo de despliegue | Accepted | Hugging Face Spaces, Docker SDK, nivel gratuito CPU Basic; Render Web Service documentado como la segunda opción del operador. Capa de resiliencia de despliegue: limitador de tasa por sesión, fallback de proveedor Groq -> Cerebras -> Anthropic, caché de respuestas de TTL corto. |
| [ADR-0008](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0008-licensing/) | Licencia del código | Accepted | La licencia del código pasó de MIT a Apache 2.0 en v1.0.0. |
| ADR-0009 | Modelo juez de la evaluación | Accepted | El juez de la evaluación es Cerebras (`gpt-oss-120b`); reemplaza la elección del juez Anthropic Claude Haiku de ADR-0003. |
| ADR-0010 | Transmisión del grafo de ejecución del agente a la interfaz | Accepted | El grafo de ejecución del agente v1.1 transmite eventos por nodo a la SPA mediante server-sent events, activable por negociación de contenido vía cabecera `Accept`; el contrato JSON de `/chat` de v1.0.0 no cambia. No reemplaza nada. |
| ADR-0011 | Capa de datos (Supabase para los datos operativos de la demo) | Accepted | Postgres gestionado del nivel gratuito de Supabase para las claves de la demo, interacciones, sugerencias de mejora, solicitudes de claves de demo, consentimientos de claves de demo, sesiones de demo y uso de turnos de demo. El RAG sigue siendo Chroma (ADR-0004, sin cambios). |
| ADR-0012 | Detección de fuera de dominio en formato libre | Accepted | Guarda de alcance en dos etapas: un clasificador basado en reglas (regex + palabra clave) admite los turnos dentro del dominio y rechaza los que están fuera de alcance con alta confianza; un juez LLM resuelve los turnos ambiguos del término medio. Falla en modo abierto cuando el juez no está disponible. |
| ADR-0013 | Estrategia de expansión del corpus | Accepted | Estrategia de añadir sobre lo existente: los dominios nuevos se agregan encima del corpus v1.0.0 en lugar de reemplazarlo. Las tarjetas de KB y los turnos de evaluación nuevos amplían la cobertura a ocho dominios de adherencia a la medicación; se mantiene la paridad de locale entre en / es-419 / pt-BR. |
| ADR-0014 | Extensión de voz (ElevenLabs TTS + STT) | Accepted | ElevenLabs `eleven_multilingual_v2` para TTS por clic bajo demanda con mapeo de voz por locale; ElevenLabs Scribe para STT; metadatos de audio en el sidecar SSE (contrato JSON sin cambios); voz DESACTIVADA por defecto. El agente de voz full-duplex queda diferido. |
| ADR-0015 | Fallback en cascada de proveedor de LLM | Accepted | Cascada tipada de errores transitorios Groq -> Cerebras -> Anthropic. Los 4xx que no son 429 no se reintentan (preservación de cuota). El proveedor que responde se etiqueta en `metadata` para una atribución honesta de costos. |
| ADR-0016 | Almacenamiento de la capa de mejora continua | Accepted | Los registros de interacciones y las sugerencias de mejora se ubican juntos en el mismo proyecto Postgres gestionado (ADR-0011). La PII se redacta en el ingreso. Curado por el operador, nunca aplicado de forma automática. |
| ADR-0017 | Capa de resiliencia de despliegue del nivel gratuito | Accepted | Limitador de tasa de ventana deslizante en proceso (IP consciente de proxy) + caché de respuestas con TTL, ambos acotados y residentes en memoria. Sin Redis, sin servicio externo. Diseño de un solo worker; el escalado a múltiples workers requiere estado externo. |
| ADR-0018 | Voz DESACTIVADA por defecto - política de seguridad | Accepted | El interruptor de voz queda DESACTIVADO por defecto en la primera visita. La activación se persiste en `localStorage`. Postura de consentimiento primero; un aviso al pie "El audio NO se conserva" permanece visible sin importar el estado del interruptor. Paridad de locale entre en / es-419 / pt-BR. |
| ADR-0019 | Invariante de datos solo sintéticos + lista de exclusión | Accepted | Corpus de evaluación 100% sintético a partir de fuentes de dominio público (MedlinePlus, DailyMed, WHO EML, etiquetas de la FDA). Lista de exclusión explícita: MIMIC, ChatDoctor, MedDialog, n2c2/i2b2. Carga de la prueba en el PR para cualquier dataset nuevo (licencia + procedencia + compatibilidad). |
| ADR-0020 | Respuesta estructurada del agente (esquema Pydantic + modo JSON del LLM) | Accepted | El agente emite una respuesta estructurada validada por Pydantic mediante el modo JSON del LLM en lugar de prosa libre, de modo que los evaluadores de rechazo / escalamiento leen campos explícitos en vez de inferir la intención a partir del texto. |
| ADR-0021 | Recuperación de documento padre (fragmentación en sub-tarjetas, citación a nivel de tarjeta) | Accepted | Las tarjetas de KB se fragmentan en pasajes de sub-tarjeta para el embedding/recuperación, y luego se de-duplican de vuelta a la tarjeta padre para la citación, mejorando el recall mientras las citaciones se mantienen a nivel de tarjeta. |
| ADR-0022 | Transmisión de tokens (stream personalizado de LangGraph + cliente de streaming) | Accepted | Los deltas del LLM por token se transmiten a la SPA sobre la superficie SSE existente (ADR-0010) para que el mensaje del asistente se renderice mientras se genera en lugar de después de un búfer de respuesta completa. |
| ADR-0023 | Recuperación híbrida (BM25 + denso + RRF + reordenamiento con cross-encoder) | Accepted | La recuperación solo densa se reemplaza por una canalización de tres etapas activable por bandera - generadores léxicos (BM25) + densos en paralelo, fusión por rango recíproco y luego reordenamiento con cross-encoder - degradándose con elegancia a la ruta densa previa. |
| ADR-0024 | Medición de recall de recuperación (recall@k / hit@k / nDCG@k) | Accepted | La calidad de la recuperación se mide directamente con recall@k / hit@k / nDCG@k contra las tarjetas relevantes etiquetadas, desacoplando la puntuación de recuperación de métricas acopladas a la generación como la cobertura de citaciones. |
| ADR-0025 | Enriquecimiento de citaciones del lado del servidor | Accepted | El modelo `Citation` gana los campos opcionales `source_url`, `source_license` y `retrieved_score`, enriquecidos del lado del servidor en el nodo de cierre, para que el popover de citaciones de la SPA se renderice sin un segundo viaje de ida y vuelta a la KB. |

## Registro de reemplazos

- **ADR-0009 reemplaza en parte a ADR-0003** (2026-05-20): la elección del
  modelo juez de la evaluación. ADR-0003 nombró a Anthropic Claude Haiku;
  ADR-0009 registra que el arnés ejecuta un juez Cerebras. ADR-0003 conserva
  su estado `Accepted` y su cuerpo original como registro histórico; solo la
  línea del modelo juez queda reemplazada.

## Referencias

- [MADR: Markdown Any Decision Records](https://adr.github.io/madr/)
- [Documenting Architecture Decisions, Michael Nygard, 2011](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
