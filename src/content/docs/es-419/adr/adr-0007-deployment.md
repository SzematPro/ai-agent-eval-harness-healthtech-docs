---
title: "ADR-0007: Objetivo de despliegue"
description: Por qué la demo pública corre en Hugging Face Spaces, Docker SDK, nivel gratuito CPU Basic, desde la misma imagen que CI.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0007: Objetivo de despliegue (Hugging Face Spaces, Docker SDK, nivel gratuito CPU Basic)

- Estado: Accepted
- Fecha: 2026-05-12
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

Esta es una implementación de referencia pública. Una URL de demo en vivo es en
sí misma una señal determinante: un lector está a dos desplazamientos de hacer
clic en un enlace que abre un agente conversacional multi-turno real en un
navegador. Esa URL debe ser alcanzable sin tarjeta de crédito, no debe
desaparecer en silencio cuando se retira un nivel gratuito, y debe correr la
misma imagen que el `Dockerfile` del proyecto construye localmente. Cualquier
divergencia entre la imagen de desarrollo y la imagen desplegada socava la
historia del arnés de evaluación; el punto central es que lo que corre en CI es
lo que corre en producción.

El agente es FastAPI / Uvicorn de un solo proceso, con un almacén Chroma
embebido y un embedder de fallback integrado, despachando llamadas de LLM a un
proveedor externo (Groq por defecto; ver
[ADR-0002](./adr-0002-llm-vendor-abstraction.md)). Sin GPU, sin pesos de modelo
que alojar, sin disco persistente más allá de la KB sintética de 30-50 tarjetas.

¿Cómo distribuimos una URL de demo pública y siempre alcanzable de este agente
por menos de $0 / mes, desde el mismo Dockerfile que el proyecto distribuye, de
una manera en que un operador pueda bifurcar y desplegar con un solo secreto,
durable frente a la reorganización de niveles gratuitos que ocurrió en varios
proveedores de PaaS entre 2023 y 2025?

## Impulsores de la decisión

- **$0 / mes bajo carga de demo**: la plataforma de demostración es de duración
  indefinida; el gasto recurrente se pagaría del bolsillo indefinidamente.
- **Una sola ruta de Dockerfile**: el despliegue debe construir desde el mismo
  `Dockerfile` que el proyecto distribuye. Sin divergencia de un Dockerfile
  exclusivo de producción.
- **Afinidad con el dominio de referencia de IA**: una URL
  `huggingface.co/spaces/...` señala "implementación de referencia de IA" en el
  momento en que un lector la ve. El host es parte del mensaje.
- **Baja fricción para el operador**: un bifurcar-y-desplegar debe alcanzar un
  estado verde con un solo secreto de despliegue, no un procedimiento de seis
  pasos con un prerrequisito de tarjeta de crédito.
- **Simplicidad de rollback**: los despliegues malos se revierten ya sea
  eliminando el último commit en el remoto del Space o haciendo push de un
  `git revert` en la rama predeterminada. Sin flujo de rollback del lado de la
  infraestructura.
- **Sin LFS, sin pesos de modelo**: el agente no tiene un artefacto grande que
  alojar junto al código; el embedder se descarga en la primera corrida
  dentro de la imagen.
- **Durabilidad del nivel gratuito**: elegir un host cuyo nivel gratuito esté
  anclado en la estrategia del host, no una promesa de página de inicio que se
  retira.

## Opciones consideradas

- **Hugging Face Spaces, Docker SDK, CPU Basic gratis** (elegida):
  mismo Dockerfile, 2 vCPU + 16 GB RAM, duerme tras 48 h de inactividad,
  despierta automáticamente en la siguiente solicitud, URL pública, sin tarjeta
  registrada.
- **Hugging Face Spaces, Gradio / Streamlit SDK**: mismo host, pero
  el SDK construye la interfaz; la superficie FastAPI que el proyecto distribuye
  no coincidiría con la imagen desplegada.
- **Render Web Service, nivel gratuito**: mismo objetivo de Dockerfile;
  duerme tras 15 minutos de inactividad con un arranque en frío de 30-60 s.
- **Fly.io, nivel gratuito**: el nivel gratuito original terminó en octubre de
  2024, reemplazado por una postura de crédito de prueba de $5 / mes.
- **Railway, nivel gratuito**: el plan gratuito se retiró en agosto de 2023 a
  favor de créditos de prueba de $5 / mes; no es $0 / mes.
- **Vercel, plan Hobby**: el timeout de función serverless de 10 s en
  Hobby mata cualquier stream de agente multi-turno una vez que el viaje de ida
  y vuelta del LLM excede el límite.
- **Cloudflare Workers AI**: una plataforma de enrutamiento de modelos más que
  un host Docker genérico; el stack de Python + Chroma embebido necesitaría
  reescribirse contra el runtime de Workers.
- **Streamlit Community Cloud**: gratis, pero ata la demo a una
  interfaz de Streamlit; la superficie FastAPI se vuelve inaccesible.
- **Modal**: créditos de prueba, luego pago por segundo; el estado estable no
  es $0 / mes.

## Resultado de la decisión

Opción elegida: **Hugging Face Spaces, Docker SDK, nivel gratuito CPU Basic**,
con **Render Web Service, nivel gratuito** documentado como la segunda opción
del operador en la referencia de despliegue y alcanzable desde el mismo
Dockerfile con un cambio de una variable de entorno (`$PORT`).

El Space vive en
`https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`
y lo construye el constructor de Docker de Hugging Face a partir del
`Dockerfile` del repositorio. La build se dispara por un flujo de trabajo de
despliegue, que refleja la rama predeterminada y cada etiqueta de versión en el
remoto del Space, intercambiando el README raíz por una tarjeta específica del
Space en un commit exclusivo de despliegue para que el front-matter YAML de HF
Spaces nunca toque el repositorio fuente. El commit de despliegue nunca se hace
push de vuelta al repositorio fuente; el Space es un espejo, no un objetivo de
colaboración. El despliegue está condicionado a un solo secreto de despliegue;
hasta que ese secreto se configure el flujo de trabajo falla rápido con un error
claro.

La elección del Docker SDK es determinante. Los SDKs de Gradio y Streamlit
construirían una interfaz alrededor de un punto de entrada de Python y
divergirían de la superficie FastAPI. Con el Docker SDK la misma imagen corre en
tres lugares: la laptop de un contribuidor (`docker run`), el arnés de
evaluación y la demo pública (HF Spaces). Una imagen, un modelo mental, un
conjunto de comportamientos bajo prueba.

El nivel CPU Basic (2 vCPU, 16 GB RAM, 50 GB efímeros) aloja cómodamente el
almacén Chroma embebido y el modelo de sentence-transformers integrado. Las
llamadas de LLM se despachan a un proveedor externo, de modo que el Space mismo
solo maneja la recuperación de RAG, la orquestación y el HTTP. El sueño por
inactividad de 48 horas produce un arranque en frío de 10-30 segundos en la
primera solicitud tras despertar; expuesto en la tarjeta del Space para que un
lector no se sorprenda.

### Confirmación

- Una corrida verde del flujo de trabajo de despliegue al hacer push a la rama
  predeterminada y en cada etiqueta de versión `v*`, con el secreto de
  despliegue configurado.
- Una URL pública alcanzable en
  `https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`.
- El Space responde `GET /health` con `200 OK` después de despertar.
- El Space responde `POST /chat` en modo demo contra un cliente stub fuera de
  línea (sin claves del lado del llamador requeridas para la demo pública).
- La referencia de despliegue documenta el bootstrap del operador (creación del
  Space, acuñación del token de despliegue, registro del secreto, primer
  despliegue).

## Consecuencias

### Positivas

- **$0 / mes** bajo carga de demo; HF Spaces no impone una
  cuota mensual en los Spaces Docker CPU Basic.
- **Mismo Dockerfile en todas partes**: desarrollo, CI, producción.
- **Ruta de operador de un solo secreto**: un solo secreto de despliegue es todo
  el onboarding para la historia de despliegue.
- **URL alineada con el dominio**: el host lleva parte de la señal del
  proyecto antes de que el lector lea el cuerpo.
- **Rollback trivial**: eliminar el commit malo en el Space, o hacer push
  de un `git revert` en la rama predeterminada y dejar que el siguiente
  despliegue lo refleje.
- **Sin alojamiento de pesos de modelo**: evita LFS, evita el nivel de
  almacenamiento en el host, mantiene la imagen por debajo de 1 GB.

### Negativas

- **Arranque en frío de 10-30 s** tras una ventana de inactividad de 48 horas;
  expuesto a los lectores en la tarjeta del Space.
- **Lock-in del constructor de HF Spaces**: una interrupción de HF retrasa un
  despliegue; el fallback de Render está documentado en la referencia de
  despliegue para esa contingencia.
- **Solo CPU**: el Space no puede alojar un LLM local; la demo
  depende de un proveedor externo para las completions. Por diseño (ver
  [ADR-0002](./adr-0002-llm-vendor-abstraction.md)).
- **El front-matter YAML en la tarjeta del Space** es incompatible con
  el renderizador de GitHub, por lo que el flujo de trabajo de despliegue tiene
  que intercambiar el README raíz en un commit exclusivo de despliegue.

### Neutrales

- Un nuevo flujo de trabajo de despliegue y un nuevo directorio de tarjeta del
  Space se vuelven parte del diseño del repositorio.
- Un secreto de despliegue se vuelve requerido para la demo en vivo; los
  contribuidores sin derechos de push desarrollan localmente sin él.
- El remoto del Space tolera force-push (es un espejo); el remoto fuente
  no. Los comentarios del flujo de trabajo hacen explícita esta asimetría para
  que un operador no transfiera la postura entre remotos.

## Pros y contras de las opciones

### Hugging Face Spaces, Docker SDK, CPU Basic gratis

- Buena, porque el host coincide con el dominio de referencia de IA del proyecto
  de un vistazo a la URL.
- Buena, porque el Docker SDK corre el `Dockerfile` del proyecto tal cual.
- Buena, porque el nivel gratuito de HF está anclado en los Spaces de comunidad
  que impulsan el tráfico del Hub; es poco probable que desaparezca con poco
  aviso.
- Buena, porque el rollback no tiene lado de infraestructura.
- Mala, porque la latencia de arranque en frío tras 48 horas de inactividad es
  visible.
- Mala, porque el front-matter YAML de la tarjeta del Space requiere un
  intercambio exclusivo de despliegue del README raíz.

### Hugging Face Spaces, Gradio / Streamlit SDK

- Buena, porque los SDKs distribuyen una interfaz alojada y opinada.
- Mala, porque la superficie de la demo diverge de la superficie FastAPI
  que el proyecto distribuye; lo desplegado deja de ser lo mismo
  que lo construido localmente.

### Render Web Service, nivel gratuito

- Buena, porque el mismo `Dockerfile` se despliega con un cambio de
  una variable de entorno (`$PORT`).
- Mala, porque el sueño por inactividad de 15 minutos es más agresivo que la
  ventana de 48 horas de HF Spaces, y el host no lleva señal de dominio
  de referencia de IA.

### Niveles gratuitos de Fly.io / Railway

- Mala, porque los niveles gratuitos históricos se retiraron (Fly.io
  octubre de 2024, Railway agosto de 2023) a favor de créditos de prueba;
  el estado estable no es $0 / mes.

### Vercel Hobby

- Mala, porque el timeout de función de 10 segundos mata cualquier stream de
  agente multi-turno una vez que el viaje de ida y vuelta del LLM lo excede.

### Cloudflare Workers AI

- Mala, porque el stack de Python + Chroma embebido tendría que ser
  reescrito contra el runtime de Workers.

### Streamlit Community Cloud

- Mala, porque la interfaz ata la demo a Streamlit; la superficie FastAPI
  se vuelve inaccesible.

### Modal

- Mala, porque los créditos de prueba expiran; el estado estable cuesta dinero.

## Más información

- Runbook del operador: [referencia de despliegue](../reference/deploy.md)
- Documentación del Docker SDK de Hugging Face Spaces:
  <https://huggingface.co/docs/hub/spaces-sdks-docker>
- Precios de Hugging Face (niveles de hardware de Spaces):
  <https://huggingface.co/pricing>
- Documentación del nivel gratuito de Render: <https://render.com/docs/free>
- Hilo de post-mortem del nivel gratuito de Fly.io:
  <https://community.fly.io/t/free-tier-is-dead/20651>
- Límites de runtime de funciones de Vercel:
  <https://vercel.com/docs/functions/runtimes#max-duration>
- MADR 4.0.0: <https://adr.github.io/madr/>

## Capa de resiliencia de despliegue

Tres primitivas por proceso se distribuyen para hacer que la demo del nivel
gratuito se degrade con elegancia bajo carga en lugar de exponer errores
upstream en bruto. Las tres se controlan por banderas de habilitación, de modo
que están desactivadas por defecto para pruebas deterministas y activadas para
el Space en vivo:

- **Limitador de tasa por sesión.** Un limitador de ventana deslizante por clave
  (por IP de cliente). Un llamador que excede el límite recibe un HTTP 429 con
  una cabecera `Retry-After` en lugar de un 502 en bruto. Ajustable mediante
  ajustes de máximo de solicitudes y segundos de ventana. Una dependencia
  deliberadamente no se añadió; el limitador en proceso mantiene la postura
  libre de framework.
- **Cadena de fallback de proveedor.** Un envoltorio alrededor del Protocol
  `LLMClient`: una falla transitoria de Groq (HTTP 429, 5xx, o una falla de
  transporte pelada) cae en cascada a través de Cerebras (fallback gratuito) y
  Anthropic (último recurso de pago) antes de que cualquier error alcance el
  frontend. Un 4xx que no es 429 es un error genuino del cliente y se re-lanza
  sin cambios. Consistente con la abstracción de proveedor de
  [ADR-0002](./adr-0002-llm-vendor-abstraction.md) -
  el fallback es un envoltorio a nivel de Protocol, no un cambio a nivel de
  nodo.
- **Caché de respuestas de TTL corto.** Una caché en proceso acotada y de TTL
  corto, indexada por la tupla normalizada (entrada, locale, modelo), de modo
  que los clics de "cargar ejemplo" de la SPA se sirven sin golpear al
  proveedor.

**Consecuencia de un solo worker.** Las tres primitivas son por proceso,
al igual que el checkpointer HITL en memoria (ver
[ADR-0001](./adr-0001-orchestration.md)). El Space, por lo tanto, corre un
solo worker de uvicorn por diseño; un segundo worker no compartiría el
limitador, la caché ni el estado del hilo en pausa. Un despliegue de múltiples
workers necesitaría un almacén compartido (Redis, Postgres), que está fuera de
alcance para la demo de $0. Esto está documentado en la referencia de despliegue
y en el comentario del `Dockerfile`.

**Embedder integrado.** El embedder predeterminado distribuido es
`BAAI/bge-small-en-v1.5`, compatible con CPU Basic en el nivel gratuito del
Space. Ver [ADR-0004](./adr-0004-rag-stack.md) para la decisión del embedder; la
postura de despliegue aquí no se ve afectada por la elección del modelo.
