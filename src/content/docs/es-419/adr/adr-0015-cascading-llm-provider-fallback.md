---
title: "ADR-0015: Cascada de respaldo de proveedores de LLM"
description: Por qué el paso de completado del LLM cae en cascada de Groq a Cerebras a Anthropic solo ante errores transitorios, preservando la cuota y atribuyendo el costo al proveedor que responde.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0015: Cascada de respaldo de proveedores de LLM (Groq → Cerebras → Anthropic)

- Estado: Aceptado
- Fecha: 2026-05-27 (registrado retroactivamente como parte del pulido posterior al lanzamiento; la cascada se publicó en una versión anterior)
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El agente de la demo se ejecuta en Hugging Face Spaces, capa gratuita CPU
Basic, único worker (ADR-0007). El proveedor de LLM primario es Groq
`llama-3.3-70b-versatile` a $0 de costo. La cuota de la capa gratuita se
comparte entre todos los usuarios del Space, por lo que una breve ráfaga de
visitantes curiosos puede limitar por tasa al primario mientras un espectador
está a mitad de una conversación. Un `429 Too Many Requests` devuelto a un
espectador de la demo en vivo es inaceptable.

¿Cómo degradamos con elegancia cuando el proveedor primario devuelve un error
transitorio, sin quemar la cuota del secundario ante fallas no transitorias y
sin mentir en el libro mayor de costos sobre cuál proveedor realmente
respondió?

El alcance es: el paso de completado del LLM dentro del grafo del agente. La
cascada es invisible para el esquema de estado del agente y para la barrera de
seguridad de citación.

## Factores de la decisión

- **Preservación de cuota**: un 4xx que no sea un 429 (p. ej., 400
  malformado, 401 clave incorrecta) NO debe disparar la cascada. Quemar la
  cuota del secundario ante un 400 determinista desperdicia capacidad que el
  tráfico legítimo futuro necesitará.
- **Atribución de costos**: el libro mayor de costos debe registrar el
  proveedor que realmente respondió, no el que intentamos primero. De lo
  contrario, los paneles de costos mienten.
- **Portabilidad de proveedores**: ADR-0002 definió el Protocol de cliente
  LLM. La cascada debe componerse a nivel del cliente, no filtrarse al grafo
  del agente ni al arnés de evaluación.
- **Transparencia de fallas**: cuando todos los proveedores fallan, el usuario
  ve un HTTP 503 reintentable y amable con un `Retry-After`, no un rastro de
  pila.

## Opciones consideradas

- **Opción A**: Un único proveedor con solo reintento ante errores
  transitorios. Sin cascada.
- **Opción B**: Cascada que reintenta cada error en el siguiente proveedor
  (ingenua).
- **Opción C**: Cascada con clasificador tipado de errores transitorios; un
  4xx que no es 429 NO se reintenta; el proveedor que responde se etiqueta en
  los metadatos.
- **Opción D**: Servicio de gateway externo (Portkey, LiteLLM Router,
  OpenRouter) que maneja la cascada frente al agente.

## Resultado de la decisión

Opción elegida: **Opción C** -- Cascada con clasificador tipado de errores
transitorios y atribución al proveedor que responde. La razón individual de
mayor carga estructural es la preservación de cuota: el proyecto demuestra una
postura consciente de los costos (controles de costo en CI, presupuesto por
turno), y una cascada ingenua duplicaría silenciosamente el gasto de tokens de
entrada ante fallas 4xx deterministas. La Opción D fue rechazada porque
agregar un servicio externo para una demo de un único proceso es
sobreingeniería operativa a esta escala; la abstracción a nivel de Protocol en
ADR-0002 hace que la cascada en proceso sea trivial de escribir.

La cadena de cascada es:

1. **Primario**: Groq `llama-3.3-70b-versatile` (capa gratuita dentro de la
   cuota)
2. **Respaldo 1**: Cerebras `gpt-oss-120b` (también amigable con la capa
   gratuita, el modelo juez bajo ADR-0009; reutilizado como respaldo de
   completado)
3. **Respaldo 2**: Anthropic `claude-haiku-4-5-20251001` (escotilla de escape
   de pago cuando ambas capas gratuitas se agotan)

El clasificador de transitorios reconoce tres clases como reintentables:

- HTTP 429 (límite de tasa)
- HTTP 5xx (error de servidor)
- Falla de transporte (sin estado HTTP, p. ej. reinicio de conexión)

Todo lo demás (4xx distinto de 429) se lanza de inmediato. El no reintento de
los 4xx que no son 429 es la decisión de carga estructural de preservación de
cuota.

El proveedor que responde se etiqueta en los metadatos del resultado de
completado para que el acumulador de costos registre el gasto contra el
proveedor correcto.

### Confirmación

- Las pruebas unitarias cubren: Groq 429 → éxito de Cerebras, Groq 5xx →
  éxito de Cerebras, falla de transporte de Groq → éxito de Cerebras, Groq
  401 → sin respaldo (lanza), todos-los-proveedores-fallan → 503 al llamador,
  proveedores mixtos con atribución correcta.
- La prueba del libro mayor de costos afirma que el proveedor registrado en
  cada unidad de costo es el proveedor que responde, no el proveedor
  solicitado.

## Consecuencias

### Positivas

- La demo sobrevive a una ráfaga de cuota de Groq sin intervención del
  operador.
- La escotilla de escape de Anthropic limita el costo total de la demo a una
  pequeña cifra acotada en USD por turno (de la tabla de precios por
  proveedor).
- La atribución de costos es honesta de extremo a extremo.
- El código del agente y el arnés de evaluación son ajenos a la cascada.
- Preservación de cuota: un error 4xx determinista no desperdicia el
  presupuesto de capa gratuita del secundario.

### Negativas

- Tres proveedores deben configurarse en producción. Los operadores que solo
  quieren un proveedor pueden fijar un único proveedor y omitir la cascada,
  pero la superficie por defecto es la cascada completa.
- Una falla en Anthropic cuesta USD reales aunque el objetivo de la demo sea
  $0. El control de costo protege contra el gasto descontrolado fallando la CI
  cuando el promedio del corpus excede el presupuesto por turno.
- Los errores conscientes de la configuración regional en la ruta de la
  cascada todavía no están localizados: el cuerpo del HTTP 503 devuelve
  inglés. (Registrado como trabajo futuro.)

### Neutrales

- El clasificador de transitorios es una superficie de mantenimiento; la nueva
  semántica HTTP de proveedores (p. ej., un hipotético 425 Too Early) necesita
  agregarse manualmente.
- La cascada agrega dos viajes de ida y vuelta HTTP en el peor de los casos. El
  presupuesto de latencia por turno configurado acomoda esto.

## Ventajas y desventajas de las opciones

### Opción A: Un único proveedor, solo reintento

- Buena, porque es operativamente simple: un proveedor, una configuración.
- Buena, porque el reintento está bien entendido en la capa de transporte
  HTTP.
- Mala, porque no cubre un 429 sostenido (agotamiento de cuota).
- Mala, porque la demo muere cuando la ventana de cuota de la capa gratuita de
  Groq expira.

### Opción B: Cascada ingenua (reintentar cada error)

- Buena, porque la demo sobrevive a los errores transitorios.
- Mala, porque un 400/401 determinista desperdicia la cuota del secundario
  intentando "reintentar" algo que nunca tendrá éxito.
- Mala, porque la atribución de costos se vuelve ambigua (¿el presupuesto de
  qué proveedor afectó este turno?).

### Opción C (elegida): Cascada tipada con atribución

- Buena, porque preserva la cuota (el 4xx que no es 429 se queda en el
  primario).
- Buena, porque es honesta con el costo (los metadatos registran el proveedor
  que responde).
- Buena, porque es portable entre proveedores en la juntura del Protocol
  (ADR-0002).
- Mala, porque agrega una superficie de mantenimiento (el clasificador de
  transitorios).

### Opción D: Servicio de gateway externo

- Buena, porque retira la lógica de cascada del proyecto.
- Buena, porque algunos gateways agregan observabilidad gratis.
- Mala, porque agrega una dependencia externa, un salto de red y un costo
  operativo para una demo de un único proceso.
- Mala, porque entra en conflicto con la postura de despliegue de $0/mes.

## Más información

- [ADR-0002](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0002-llm-vendor-abstraction/) -- abstracción de proveedor
  de LLM (el Protocol sobre el que se compone la cascada)
- [ADR-0007](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/) -- objetivo de despliegue y los
  factores detrás de la capa de resiliencia
- [ADR-0017](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0017-free-tier-deployment-resilience/) -- el limitador de
  tasa en proceso complementario y la caché de respuestas
- MADR 4.0.0: <https://adr.github.io/madr/>
