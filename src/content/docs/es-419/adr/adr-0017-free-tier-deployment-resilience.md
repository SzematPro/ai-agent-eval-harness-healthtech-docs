---
title: "ADR-0017: Capa de Resiliencia de Despliegue en Capa Gratuita"
description: Por qué la demo protege su único worker de capa gratuita con un limitador de tasa de ventana deslizante en proceso y una caché de respuestas TTL acotada, sin Redis, a $0/mes.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0017: Capa de Resiliencia de Despliegue en Capa Gratuita

- Estado: Aceptado
- Fecha: 2026-05-27 (registrado retroactivamente; la capa de resiliencia se publicó en una versión anterior)
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

La demo vive en Hugging Face Spaces, capa gratuita CPU Basic, único worker de
uvicorn (ADR-0007). La URL del Space se comparte públicamente. Una breve
ráfaga de visitantes curiosos (una publicación que es recogida, una mención en
una conferencia) puede disparar el tráfico más rápido de lo que el agente
puede responder.

Sin protección, el worker encola turnos hasta que o bien el bucle de eventos
del worker se queda atrás y los tiempos de espera caen en cascada, o bien el
proxy de Hugging Face Spaces devuelve 502 Bad Gateway. Ambos resultados
convierten un momento público en una demo rota.

¿Cómo protegemos al worker de las ráfagas de solicitudes concurrentes
manteniendo el costo operativo de $0/mes y la simplicidad de un único worker,
sin introducir Redis?

## Factores de la decisión

- **Presupuesto operativo de $0/mes** (ADR-0007): sin Redis, sin servicio de
  limitación de tasa administrado.
- **Simplicidad de un único worker**: el diseño de despliegue es un proceso de
  uvicorn por Space; compartir el estado de limitación de tasa entre workers no
  es una preocupación actual.
- **Semántica de reintento transparente**: el cliente (la aplicación) debe
  saber cuándo reintentar. `Retry-After` es la cabecera de carga estructural.
- **La demo sobrevive a ráfagas de entrada idéntica**: cuando diez espectadores
  hacen clic en el mismo escenario de ejemplo, el worker debería computar la
  respuesta una sola vez.

## Opciones consideradas

- **Opción A**: Sin protección. El worker maneja cada solicitud hasta que se
  cae.
- **Opción B**: Limitador de tasa de ventana deslizante respaldado por Redis +
  caché de respuestas.
- **Opción C**: Limitador de tasa de ventana deslizante en proceso + caché de
  respuestas TTL en proceso, ambos basados en una firma de solicitud
  normalizada. Memoria acotada.
- **Opción D**: Usar un límite de tasa a nivel de CDN (Cloudflare frente a
  Hugging Face Spaces).

## Resultado de la decisión

Opción elegida: **Opción C** -- una capa de resiliencia en proceso con un
limitador de tasa de ventana deslizante y una caché de respuestas TTL, ambos
acotados y residentes en memoria. La razón individual de mayor carga
estructural es el presupuesto de $0/mes: cualquier dependencia externa para la
limitación de tasa viola la postura de despliegue. El diseño en proceso
también coincide con la verdad de un único worker: no hay un segundo worker con
el cual coordinarse.

Comportamiento:

- El limitador de tasa se basa en la IP del cliente (consciente del proxy, de
  modo que la cabecera `X-Forwarded-For` se respeta detrás del proxy inverso de
  Hugging Face Spaces). Una ventana deslizante con un conteo acotado de
  solicitudes por ventana rechaza las ráfagas con HTTP 429 y una pista
  `Retry-After`.
- La caché de respuestas se basa en una tupla normalizada de (texto,
  configuración regional, modelo). Un TTL corto mantiene la memoria acotada. Las
  entradas idénticas dentro de la ventana del TTL devuelven la respuesta en
  caché, evitando un gasto redundante de LLM.
- La caché NUNCA se usa para un turno pausado (HITL): un borrador pausado no es
  una respuesta final y no debe servirse a una sesión diferente como si lo
  fuera.

### Confirmación

- El limitador de tasa y la caché están implementados en un módulo de
  resiliencia dedicado.
- Las pruebas unitarias cubren: la decisión de límite de tasa bajo ráfaga, un
  acierto de caché ante entrada idéntica, un fallo de caché ante una
  configuración regional o un modelo diferente, sin caché en los turnos
  pausados, y la propagación de `Retry-After`.
- El limitador se aplica antes del trabajo del agente, y la caché se aplica
  alrededor de la invocación del agente.

## Consecuencias

### Positivas

- La demo sobrevive a las ráfagas de tráfico sin infraestructura externa.
- El tráfico de entrada idéntica (el patrón de "todos hicieron clic en el mismo
  ejemplo") cuesta cero gasto de LLM en las repeticiones dentro del TTL de la
  caché.
- La semántica de HTTP 429 + `Retry-After` es transparente y amable con el
  cliente.
- El presupuesto de $0/mes se preserva.

### Negativas

- La protección es por worker. Un despliegue con escalado horizontal (uvicorn
  multi-worker detrás de un balanceador de carga) necesitaría externalizar el
  limitador y la caché a Redis. El diseño es honesto sobre esta limitación,
  registrada como una brecha de preparación para producción en el informe de
  rendimiento.
- El reinicio del worker pierde el estado de la caché. El tráfico de arranque
  en frío paga el costo completo de LLM hasta que la caché se calienta.
- El limitador basado en IP es grueso: un NAT corporativo presenta a toda la
  organización como una única IP. El conteo de ventana acotada debe ajustarse
  para no penalizar el tráfico legítimo con NAT; el ajuste actual es
  intencionalmente indulgente.

### Neutrales

- La decisión de límite de tasa agrega una verificación en proceso por
  solicitud. El costo de latencia es de menos de un milisegundo.
- La caché agrega estado en memoria. Un TTL acotado mantiene la huella de
  memoria manejable en CPU Basic (16 GB de RAM).

## Ventajas y desventajas de las opciones

### Opción A: Sin protección

- Buena, porque cero infraestructura.
- Mala, porque el worker se cae bajo tráfico de ráfaga.
- Mala, porque no hay semántica de 429 + `Retry-After`: el cliente ve un 502
  del proxy de Hugging Face.

### Opción B: Limitador + caché respaldados por Redis

- Buena, porque sobrevive al escalado horizontal multi-worker.
- Mala, porque agrega una dependencia externa (instancia de Redis, gestión de
  secretos, salto de red).
- Mala, porque entra en conflicto con el presupuesto de $0/mes.
- Mala, porque es sobreingeniería para la realidad de un único worker.

### Opción C (elegida): Limitador + caché en proceso

- Buena, porque no hay dependencia externa.
- Buena, porque coincide con la verdad de un único worker.
- Buena, porque es explícita, comprobable y autocontenida.
- Mala, porque no escala más allá de un worker (reconocido).

### Opción D: Límite de tasa a nivel de CDN

- Buena, porque delega la protección al borde de Cloudflare.
- Mala, porque Hugging Face Spaces enruta el tráfico directamente; poner
  Cloudflare al frente requiere control de DNS / dominio que el Space no tiene
  por defecto.
- Mala, porque no cubre la necesidad de la caché de respuestas.

## Más información

- [ADR-0007](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/) -- objetivo de despliegue y el
  presupuesto de $0/mes
- [ADR-0015](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0015-cascading-llm-provider-fallback/) -- la capa
  complementaria de respaldo en cascada
- MADR 4.0.0: <https://adr.github.io/madr/>
