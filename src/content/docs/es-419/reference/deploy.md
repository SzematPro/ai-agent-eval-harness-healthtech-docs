---
title: Despliegue
description: "Notas de despliegue para la implementación de referencia: Hugging Face Spaces bajo el Docker SDK, configuración de ejecución, streaming, rollback y rutas de respaldo."
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Despliegue

> Notas de despliegue para `ai-agent-eval-harness-healthtech`. El destino de
> despliegue primario canónico es **Hugging Face Spaces** bajo el **Docker
> SDK**. Las rutas de respaldo (Render, Docker local) están documentadas al
> final.

## Por qué Hugging Face Spaces

El destino de demostración es una URL de demo pública, de costo cero y
siempre activa que cualquiera puede abrir con un clic. HF Spaces, Docker
SDK, nivel **CPU Basic** nos da:

- 2 vCPU, 16 GB RAM, 50 GB de disco efímero.
- Una URL HTTPS pública sin requisito de tarjeta registrada.
- Reconstrucción automática de la imagen en cada push a la rama `main` del
  Space.
- Se duerme tras 48 h de tráfico cero; se despierta automáticamente en la
  siguiente solicitud.

Los compromisos son: un arranque en frío de 10-30 s tras un sueño, y los
techos de recursos anteriores. Ambos son aceptables para una plataforma de
demostración.

El repo del Space (`SzematPro/ai-agent-eval-harness-healthtech`) es un
espejo de destino de despliegue del repositorio canónico de GitHub; no es
un repo de colaboración separado. Cada despliegue es un force-push desde el
flujo de trabajo de GitHub.

## Historia del despliegue (el camino feliz)

1. Un commit llega a `main` del repo de GitHub (o se hace push de una
   etiqueta de versión que coincide con `v*`, o el flujo de trabajo se
   despacha manualmente).
2. El flujo de trabajo de despliegue se ejecuta en `ubuntu-latest`.
   Verifica que el secreto `HF_TOKEN` esté presente, configura la identidad
   git de despliegue, sustituye el README específico del Space por el README
   raíz (que lleva el front-matter YAML de HF Spaces), elimina los medios
   binarios (los GIF y PNG son recursos del README de GitHub, no archivos de
   ejecución del Space; Hugging Face rechaza los push crudos que portan
   blobs binarios), construye una rama `deploy` **huérfana** de un solo
   commit (sin historial) y hace force-push de esa rama al `main` del remoto
   del Space.
3. Hugging Face detecta el push, reconstruye la imagen de Docker desde el
   mismo `Dockerfile` que el repo incluye y pone en línea la nueva revisión.
4. La tarjeta del Space en huggingface.co refleja los valores declarados en
   el README específico del Space; la URL de la demo en vivo es
   <https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech>.

El commit de despliegue **nunca** se vuelve a hacer push al repo de GitHub;
existe solo en el remoto del Space, que es un espejo de despliegue y tolera
el force-push. La rama `main` de GitHub y las etiquetas de GitHub nunca se
fuerzan con push.

## Bootstrap - configuración única

El primer despliegue necesita que exista el secreto de repo de GitHub
`HF_TOKEN`. Hasta que exista, el flujo de trabajo falla de inmediato con un
mensaje claro y la tarjeta del Space en huggingface.co mostrará el marcador
de posición del README.

### 1. Crear el Space

1. Inicia sesión en <https://huggingface.co> como `SzematPro`.
2. New Space -> nombre `ai-agent-eval-harness-healthtech`, SDK = Docker,
   visibilidad = Public.
3. Después de crear el Space vacío, toma nota de la URL del remoto:
   `https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech`.

### 2. Acuñar un token de HF con alcance de escritura

1. Ve a <https://huggingface.co/settings/tokens>.
2. Crea un token con el rol de **escritura** (el de solo lectura no alcanza:
   el flujo de trabajo hace push al remoto del Space).
3. Copia el token; HF solo lo muestra una vez.

### 3. Registrar el secreto en el repo de GitHub

1. Abre la página de configuración de secretos de Actions del repositorio de
   GitHub.
2. New repository secret. Nombre: `HF_TOKEN`. Valor: el token del paso 2.
3. Dispara el flujo de trabajo de despliegue manualmente para confirmar que
   el primer despliegue se completa.

El flujo de trabajo de despliegue es la ruta de despliegue automatizada. El
*primer* despliegue también puede hacerse a mano haciendo push del árbol de
trabajo directamente al remoto git del Space, lo que pone el Space en línea
sin esperar al push del origen de GitHub. El despliegue manual sustituye el
README específico del Space por el README raíz y elimina los medios
binarios que Hugging Face rechaza; el flujo de trabajo automatizado hace lo
mismo en cada push.

## Configuración de ejecución (Space de HF)

El Space en vivo se configura por completo a través de los secretos y las
variables del Space que lee la configuración de la aplicación
(pydantic-settings; los nombres de las variables de entorno son los nombres
de campo en mayúsculas). Configura los valores sensibles como **Secrets** y
el resto como **Variables** en la página **Settings -> Variables and
secrets** del Space.

Secrets:

- `GROQ_API_KEY` - proveedor de LLM primario.
- `CEREBRAS_API_KEY` - proveedor de LLM de respaldo; su presencia es lo que
  activa el cliente de fallback de Groq a Cerebras.

Variables: `LLM_PROVIDER=groq`, `AUTO_INGEST_ON_STARTUP=1`,
`CHROMA_PERSIST_DIR=/tmp/chroma`, `CHROMA_COLLECTION=kb_main`,
`EMBEDDING_PROVIDER=sentence-transformers`,
`SENTENCE_TRANSFORMER_MODEL=BAAI/bge-small-en-v1.5`,
`EMBEDDING_DEVICE=cpu`, `HITL_ENABLED=1`, `LLM_FALLBACK_ENABLED=1`,
`RATE_LIMIT_ENABLED=1`, `RESPONSE_CACHE_ENABLED=1`,
`ENVIRONMENT=production`.

El Space ingiere la base de conocimiento incorporada fresca en una colección
de Chroma vacía en el primer arranque; el modelo de embeddings
`BAAI/bge-small-en-v1.5` se descarga de Hugging Face en el primer inicio. El
checkpointer es el `MemorySaver` en memoria (una limitación del nivel
gratuito de un solo worker: un hilo de HITL pausado no sobrevive a un
reinicio del Space); la cadena de conexión durable de Postgres se deja sin
configurar. El limitador de tasa, el fallback de proveedor y la caché de
respuestas son todos por proceso; no aumentes la cantidad de workers de
uvicorn, porque un segundo worker no los compartiría.

## Streaming (SSE) y el proxy inverso

El Grafo de Ejecución del Agente se alimenta de un modo de streaming de
server-sent-events (SSE) en `POST /chat` y `POST /chat/resume`: una
solicitud que porta `Accept: text/event-stream` obtiene un cuerpo
`text/event-stream` de eventos de ejecución por nodo en lugar del
`ChatResponse` JSON. El diseño de streaming está registrado en
[ADR-0010](../adr/adr-0010-streaming-execution-graph.md).

Para que el grafo en vivo se sienta vivo, esos eventos deben llegar al
navegador *de forma incremental* -a medida que cada nodo se ejecuta- en
lugar de ser almacenados en búfer y entregados como un solo bloque al final
del turno. La aplicación cumple su parte: las respuestas de streaming
configuran `Cache-Control: no-cache` y `X-Accel-Buffering: no`, y el
servidor vacía cada registro SSE a medida que la API `astream` de LangGraph
lo produce. `X-Accel-Buffering: no` es, sin embargo, una **pista específica
de nginx**. No se garantiza contractualmente que el proxy de borde de
Hugging Face Spaces la respete, así que si el SSE realmente fluye de forma
incremental en el Space en vivo es un hecho de despliegue que tiene que
**verificarse en el Space desplegado**, no asumirse.

### La verificación de entrega incremental con `curl -N`

`curl -N` (`--no-buffer`) desactiva el búfer de salida del propio curl, así
que lo que ves llegar es lo que el proxy entregó. Contra el Space
desplegado, emite una solicitud de streaming:

```bash
curl -N -X POST \
  https://szematpro-ai-agent-eval-harness-healthtech.hf.space/chat \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"messages":[{"role":"user","content":"What is medication adherence?"}]}'
```

Para hacer explícito el temporizado, antepón a cada línea una marca de
tiempo:

```bash
curl -N -X POST \
  https://szematpro-ai-agent-eval-harness-healthtech.hf.space/chat \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{"messages":[{"role":"user","content":"What is medication adherence?"}]}' \
  | while IFS= read -r line; do printf '%s  %s\n' "$(date +%T.%N)" "$line"; done
```

- **PASS** - los registros SSE llegan de forma incremental: primero el
  evento `graph_topology`, luego los eventos `node_started` /
  `node_completed` espaciados a lo largo del turno, y después
  `turn_completed`. Con la variante con marca de tiempo, las líneas llevan
  tiempos visiblemente distintos. El proxy no almacenó en búfer; el grafo en
  vivo es genuinamente en vivo.
- **FAIL** - todos los registros caen de golpe al final del turno (las
  marcas de tiempo están todas dentro de unos pocos milisegundos entre sí).
  El proxy almacenó la respuesta en búfer; el grafo en vivo se degrada a un
  volcado posterior al turno.

Un FAIL debe resolverse antes de la publicación: ya sea con una corrección
de configuración del proxy o, si el borde de HF genuinamente no puede
hacerse fluir, con una decisión honesta de alcance registrada antes de la
publicación. Una versión no debe afirmar tener un grafo de ejecución en
vivo si el grafo en vivo es silenciosamente un volcado posterior al turno.

### Resultado registrado

El código de streaming está verificado de extremo a extremo: una solicitud
`curl -N` contra el Space desplegado devuelve los registros SSE de forma
incremental y las respuestas de streaming portan `Cache-Control:
no-cache` y `X-Accel-Buffering: no`. La puerta de publicación exigió que
esta verificación diera PASS en el Space en vivo antes de etiquetar.

## Rollback

La rama `main` del Space se reconstruye desde el `main` de GitHub en cada
corrida de despliegue, así que el procedimiento de rollback es asimétrico:

- **Si un mal commit llegó al Space pero no al `main` de GitHub**: elimina
  el último commit del `main` del Space desde
  <https://huggingface.co/spaces/SzematPro/ai-agent-eval-harness-healthtech/tree/main>.
  El siguiente push desde el `main` del repo de GitHub restaura el estado de
  despliegue.
- **Si un mal commit llegó al `main` de GitHub**: revírtelo en GitHub (un
  nuevo commit `git revert` en `main`); el flujo de trabajo de despliegue
  se vuelve a ejecutar y el Space toma la reversión.

Nunca hagas `git push --force` al `main` de GitHub para deshacer un
despliegue; solo el remoto del Space tolera los force-push (es un espejo, no
una fuente de verdad).

## Probar la imagen de Docker localmente

El Space ejecuta el mismo `Dockerfile` que el repo incluye. Para hacerle una
prueba de humo:

```bash
docker build . -t ai-agent-eval-harness:dev
docker run -p 7860:7860 ai-agent-eval-harness:dev
```

Luego golpea `http://localhost:7860/health` en otra terminal. La imagen:

- se ejecuta como un usuario `app` no root,
- escucha en el puerto 7860 (el predeterminado de HF Spaces),
- escribe solo en `/tmp` y en el virtualenv de la app,
- inicia `uvicorn` con la app de FastAPI.

La base de Docker es `python:3.12-slim`; la etapa de ejecución agrega
`ca-certificates` y `curl` únicamente. No se requiere GPU.

## Compromisos y límites conocidos

- **Arranque en frío**: 10-30 s tras un sueño por 48 h de inactividad; HF
  despierta el Space en la primera solicitud entrante. Para una plataforma
  de demostración esto es aceptable.
- **Techos de recursos**: 2 vCPU y 16 GB RAM. El agente es `uvicorn` de un
  solo proceso; el almacén Chroma embebido y el modelo de
  sentence-transformers incorporado caben cómodamente bajo este presupuesto.
- **Almacenamiento efímero**: 50 GB y se reinicia en cada reconstrucción.
  Cualquier cosa que necesite durabilidad (reportes de evaluación, trazas)
  va a los artefactos de GitHub Actions, no al disco del Space.
- **Sin GPU en el nivel gratuito**: la demo se ejecuta deliberadamente solo
  en CPU; las llamadas al LLM se despachan al proveedor externo configurado
  (Groq por defecto).
- **Cuotas del nivel gratuito**: HF Spaces no impone una cuota mensual sobre
  los Spaces de Docker CPU Basic; consulta
  <https://huggingface.co/pricing> para los términos vigentes.

## Rutas de despliegue de respaldo

- **Render** (nivel gratuito, sin probar): el mismo `Dockerfile` debería
  ejecutarse con el servicio configurado para escuchar en el `$PORT`
  provisto por Render. No hay un `render.yaml` versionado y esta ruta no se
  ha ejercitado; es una alternativa documentada, no un despliegue
  automatizado ni verificado.
- **Docker local**: el comando `docker run` anterior, útil para el
  desarrollo local y para verificar la cordura de la imagen antes de una
  etiqueta de versión.
