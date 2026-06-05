---
title: "ADR-0008: Licencia del código"
description: Por qué la licencia del código pasó de MIT a Apache 2.0 en v1.0.0 por la concesión explícita de patentes, el NOTICE y la cláusula de marca registrada.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# ADR-0008: Licencia del código - Apache 2.0

- Estado: Accepted
- Fecha: 2026-05-13
- Responsables de la decisión: Waldemar Szemat

## Contexto y planteamiento del problema

El proyecto se distribuyó en `v0.1.0` (2026-03-24) bajo la
Licencia MIT, declarada en el archivo de licencia, los metadatos del paquete, la
tarjeta de Hugging Face Spaces, el badge y el pie del README, y la postura de
licencia del proyecto. La elección inicial fue MIT porque es el camino más corto
a "código abierto permisivo" con la menor huella cognitiva; las alternativas no
se sopesaron por escrito en ese punto.

En v1.0.0 el proyecto se gradúa de un andamiaje a una implementación de
referencia insignia. Dos cambios hacen que valga la pena volver a litigar la
postura de licencia: (a) el panorama de patentes de IA en 2026 es materialmente
más agresivo de lo que era cuando MIT se volvió el predeterminado para
repositorios de código permisivo, y la ausencia de una concesión explícita de
patentes en MIT es el riesgo práctico más citado para un adoptante downstream
que incorpora un repositorio a un producto comercial; (b) el proyecto no debería
cerrar el valor de opción de relicenciar una bifurcación downstream (por ejemplo
Business Source License 1.1 o Elastic License 2.0) si eso alguna vez se vuelve
relevante, y la licencia base debería mantener ese camino abierto.

¿Cómo elegimos una licencia de código para v1.0.0 que señale "permisiva,
amigable para la adopción, creíble para empresas" a los mismos lectores para los
que se eligió MIT, mientras añade (i) una concesión explícita de patentes que
cubra ambos lados de la relación con el adoptante, (ii) atribución de archivo
NOTICE que sobreviva a las obras derivadas y (iii) una cláusula de marca
registrada que restrinja el uso downstream del nombre del proyecto y la
identidad del autor?

## Impulsores de la decisión

- **Explicitud de la concesión de patentes.** El panorama de patentes de IA de
  2026 (tasa creciente de solicitudes de NPE adyacentes a LLM, cartas públicas
  de la industria y plataformas de licenciamiento que señalan la ambigüedad de
  la concesión de patentes de MIT) hace que una concesión implícita de patentes
  de MIT sea un riesgo determinante para cualquier adoptante empresarial que
  incorpore el arnés a producción. La sección 3 de Apache 2.0 otorga una
  licencia de patentes explícita y libre de regalías de cada contribuidor y su
  cláusula de terminación-ante-demanda es un disuasivo contra un contribuidor
  downstream que demanda sobre el mismo código.
- **Atribución NOTICE.** La sección 4(d) de Apache 2.0 requiere que los
  distribuidores de obras derivadas incluyan el archivo NOTICE upstream. Para
  una implementación de referencia cuya señal principal es el nombre del autor,
  esto preserva la cadena de atribución cuando el arnés se bifurca hacia un
  producto privado. MIT requiere el aviso de copyright pero no lo fija a un
  archivo NOTICE separado del código fuente.
- **Protección de marca registrada.** La sección 6 de Apache 2.0 explícitamente
  retiene el permiso para usar los nombres comerciales, marcas registradas,
  marcas de servicio o nombres de producto del licenciante excepto para uso
  descriptivo. Esto protege el nombre del proyecto y la identidad del autor de
  ser reciclados en la marca de una bifurcación sin pasar por la vía de la marca
  registrada. MIT guarda silencio sobre marcas registradas.
- **Paridad de perfil de adopción con MIT.** Apache 2.0 está en el nivel
  "popular" de la OSI junto con MIT y BSD-3-Clause y lleva permisos
  aproximadamente equivalentes: uso comercial, modificación, distribución, uso
  privado, sublicenciamiento. Un lector que habría adoptado MIT adoptará Apache
  2.0; la señal del proyecto no cambia.
- **Opcionalidad para un camino futuro de relicenciamiento.** Relicenciar una
  bifurcación a BUSL 1.1 o ELv2 es sencillo desde Apache 2.0 porque el código
  original se mantiene Apache y solo la bifurcación lleva cualquier restricción
  añadida. Desde MIT el camino es equivalente en mecánica pero se lee como una
  contribución más débil del lado de la fuente (sin cadena de atribución NOTICE,
  sin concesión de patentes en la capa base).
- **Paridad de tono con proyectos serios de IA.** Kubernetes, TensorFlow,
  Apache Airflow, Apache Beam y la mayor parte de los proyectos de la Apache
  Software Foundation se distribuyen bajo Apache 2.0. La licencia la lee un
  evaluador técnico o un revisor de adquisiciones empresariales como una señal
  de "código abierto de grado de producción", no de "hack de fin de semana
  publicado permisivamente". El costo de señal es cero respecto a MIT y el
  beneficio es no trivial para la audiencia para la que está escrito este
  proyecto.
- **Compatibilidad de licencia con el conjunto de dependencias del proyecto.** El
  grafo completo de dependencias (LangGraph, adaptadores de LangChain, FastAPI,
  Pydantic, Chroma, sentence-transformers, DeepEval, Ragas, Phoenix,
  OpenInference, OpenTelemetry, Langfuse, Promptfoo) es ya sea Apache 2.0 o
  permisivo compatible (MIT, BSD). Apache 2.0 no introduce ninguna nueva
  restricción de compatibilidad dentro del conjunto de dependencias; la
  distribución downstream de Apache 2.0 no está restringida por las licencias
  upstream.

## Opciones consideradas

- **Apache License 2.0** (elegida): permisiva, concesión explícita de
  patentes, atribución NOTICE, cláusula de marca registrada.
- **MIT License** (status quo): permisiva, sin concesión explícita de
  patentes, sin requisito de atribución NOTICE, sin cláusula de marca
  registrada.
- **Business Source License 1.1 (BUSL)**: fuente disponible, código abierto
  de tiempo diferido (típicamente se convierte a Apache 2.0 después de
  cuatro años), restricción de uso comercial mientras tanto.
- **Elastic License v2 (ELv2)**: fuente disponible, niega el uso de
  servicio gestionado alojado y prohíbe eliminar los avisos de licencia o
  garantía.
- **GNU AGPL v3**: copyleft, requiere divulgación de fuente para el
  uso en red de derivados. La garantía más fuerte de libertad del usuario.
- **GNU GPL v3**: copyleft para uso fuera de red, requiere
  divulgación de fuente de derivados que se distribuyen.
- **Licencia dual (MIT para no comercial + licencia comercial)**:
  amigable upstream para bifurcaciones de aficionados mientras reserva el uso
  pagado.
- **CC-BY-4.0**: atribución de creative-commons; pensada para contenido
  y datos, no para código fuente (la FSF y la OSI aconsejan no usarla
  para software). No aplicable a la cuestión de la licencia de código, conservada
  en la lista de opciones como el contraste que ancla por qué la respuesta no
  es una licencia de la familia CC.

## Resultado de la decisión

Opción elegida: **Apache License 2.0**, porque añade las tres
propiedades (concesión explícita de patentes, atribución NOTICE, cláusula de
marca registrada) sin cambiar la señal de amigabilidad para la adopción para la
que estaba optimizando la elección inicial de MIT, y porque preserva la
opcionalidad de bifurcar-y-relicenciar bajo BUSL 1.1 o ELv2 mientras mantiene la
base abierta sin cambios. Las familias copyleft (AGPL, GPL) se leen como
hostiles a la adopción para la audiencia principal (evaluadores técnicos,
revisores de adquisiciones empresariales) y limitarían la integración downstream
en código de producto cerrado. BUSL y ELv2 son las elecciones correctas para una
*capa productizada* si y cuando se distribuya una; son la elección equivocada
para la *implementación de referencia* cuyo propósito es ser leída, bifurcada,
adaptada e integrada.

### Confirmación

- El archivo de licencia en la raíz del repositorio es equivalente byte a byte
  al texto canónico de Apache 2.0 en
  <https://www.apache.org/licenses/LICENSE-2.0.txt> con un bloque de copyright
  prellenado añadido debajo del APPENDIX.
- Un archivo NOTICE en la raíz del repositorio lleva el nombre del proyecto, la
  línea de copyright de 2026, el párrafo de atribución al autor y un
  puntero a la licencia.
- Los metadatos del paquete declaran el identificador SPDX `Apache-2.0` y
  llevan el clasificador Apache Software License aprobado por la OSI.
- El front-matter de la tarjeta de Hugging Face Spaces declara
  `license: apache-2.0`.
- La fila de badges del README lleva un escudo Apache-2.0; la sección de
  licencia nombra la nueva licencia y apunta a los archivos de licencia y NOTICE.
- La postura de licencia del proyecto nombra Apache 2.0 y enlaza de vuelta a este
  ADR.
- CI está verde en la versión v1.0.0 (lint + verificación de tipos + suite de
  pruebas, más las pruebas de integración de Postgres condicionadas a omisión,
  contra la compuerta de cobertura).

## Consecuencias

### Positivas

- **La concesión explícita de patentes** reduce el riesgo determinante que un
  adoptante empresarial hereda al incorporar el arnés a un
  producto comercial.
- **La atribución NOTICE** preserva la identidad del autor a través de
  bifurcaciones y obras derivadas, que es la señal principal
  que el proyecto lleva.
- **La cláusula de marca registrada** estrecha la superficie que una bifurcación
  puede explotar para aprovecharse del nombre del proyecto o la identidad del
  autor en una marca derivada.
- **Alineación de tono de licencia** con Kubernetes, TensorFlow, la
  Apache Software Foundation y la mayoría de los proyectos OSS
  creíbles para empresas.
- **Mantiene abierta una opción futura de relicenciamiento**: la capa base de
  Apache es el sustrato estándar a partir del cual se construye una bifurcación
  BUSL 1.1 o ELv2.
- **Cero delta de fricción de adopción** vs MIT para las audiencias para las que
  está escrito este proyecto; los contribuidores downstream pueden integrar
  código Apache 2.0 en código permisivo, copyleft y propietario con
  la misma mecánica que permite MIT.

### Negativas

- **Ceremonia de comentario de cabecera.** El texto modelo "How to apply" de
  Apache 2.0 es convencional pero no obligatorio a nivel de archivo. El proyecto
  deja el texto modelo a los archivos de licencia y NOTICE y no
  reajusta una cabecera por archivo, lo que es consistente con cómo muchas
  bases de código Apache-2.0 se distribuyen.
- **Pie de README ligeramente más pesado.** El pie de Apache 2.0 incorpora
  un segundo archivo (NOTICE) y una línea de atribución más larga que el
  unilineal de MIT. Costo aceptable.
- **Alfabetización de licencias del recién llegado.** Un contribuidor por
  primera vez puede leer el texto de licencia más largo y asumir más fricción de
  la que hay. Mitigado por la postura de licencia del proyecto y este ADR
  estando a dos clics de distancia.

### Neutrales

- **El archivo NOTICE se vuelve parte del diseño del repo.** Un nuevo
  archivo de nivel superior se une a la licencia, el README, la política de
  seguridad, la guía de contribución y la postura de licencia del proyecto en la
  raíz.
- **Actualización del identificador SPDX.** Las herramientas que leen el campo
  `license` del paquete (uv, pip, la detección de licencias de GitHub)
  re-analizan el nuevo valor SPDX `Apache-2.0`; sin cambio de comportamiento en
  la build.
- **Declaraciones de licencia de datos intactas.** La declaración de datos y la
  documentación de datos sintéticos continúan describiendo el plano de datos
  sintéticos bajo su postura existente por fuente (dominio público
  del gobierno de EE. UU., WHO-EML parafraseado, diálogos generados
  redistribuibles bajo MIT). El cambio de licencia de código no se propaga
  a las declaraciones de licencia de datos porque el licenciamiento de datos es
  una preocupación separada con restricciones upstream separadas.

## Pros y contras de las opciones

### Apache License 2.0

- Buena, porque añade la concesión explícita de patentes que le falta a MIT.
- Buena, porque la atribución NOTICE de la sección 4(d) preserva la
  señal que el proyecto lleva en obras derivadas.
- Buena, porque la cláusula de marca registrada de la sección 6 estrecha la
  superficie de reciclaje de marca.
- Buena, porque es del nivel popular de la OSI y se lee como
  creíble para empresas.
- Buena, porque no cierra una futura bifurcación BUSL / ELv2.
- Mala, porque el texto modelo de cabecera "How to apply" es una ceremonia más
  que el bloque de copyright de tres líneas de MIT.

### MIT License (status quo)

- Buena, porque es la licencia permisiva más corta y la más
  familiar para un lector casual.
- Mala, porque no tiene concesión explícita de patentes; el riesgo de patentes
  downstream hereda la ambigüedad upstream.
- Mala, porque no tiene requisito de atribución NOTICE; una
  cadena de atribución solo sobrevive por convención.
- Mala, porque guarda silencio sobre marcas registradas; el nombre del proyecto y
  la identidad del autor viajan con la marca de una bifurcación sin
  restricción contractual.

### Business Source License 1.1 (BUSL)

- Buena, porque permite al autor reservar el uso comercial por una
  ventana definida antes de que la fuente se convierta a Apache 2.0.
- Mala, porque es fuente disponible, no código abierto por la
  definición de la OSI; pierde la señal de adopción de "código abierto
  permisivo" de la que depende el proyecto.
- Mala, porque es la licencia correcta para una capa productizada,
  no para una implementación de referencia pública cuyo propósito es ser
  leída, bifurcada y reutilizada.

### Elastic License v2 (ELv2)

- Buena, porque niega el uso de servicio gestionado alojado por terceros
  del código.
- Mala, porque, como BUSL, es fuente disponible, no código abierto;
  el mismo desajuste de audiencia.

### GNU AGPL v3

- Buena, porque es la garantía copyleft más fuerte para los usuarios
  de derivados en red.
- Mala, porque limita la adopción por integradores empresariales que
  tendrían que liberar sus integraciones propietarias.
- Mala, porque la audiencia principal lee AGPL como
  hostil a las adquisiciones y el badge del README lleva un efecto
  inhibidor sobre la audiencia a la que apunta el proyecto.

### GNU GPL v3

- Buena, porque es la licencia copyleft canónica y bien
  entendida.
- Mala, porque la propagación copyleft a través de obras derivadas
  limita la adopción en contextos de código cerrado de la misma manera que
  AGPL, con la confusión adicional de que GPL aplica a la
  distribución y AGPL aplica al uso en red.

### Licencia dual (MIT + comercial)

- Buena, porque reserva el camino de ingresos comerciales mientras
  mantiene un upstream amigable para aficionados.
- Mala, porque introduce fricción en el momento de la adopción
  ("¿qué licencia me aplica?") y duplica la superficie operativa
  para el proyecto.

### CC-BY-4.0

- Mala, porque las familias de Creative Commons no están diseñadas para
  código fuente; la OSI no lista CC-BY entre las licencias de software
  aprobadas, y la FSF aconseja no usarla para código.

## Más información

- Texto canónico de Apache License 2.0:
  <https://www.apache.org/licenses/LICENSE-2.0>
- Choose a License - Apache 2.0:
  <https://choosealicense.com/licenses/apache-2.0/>
- OSI: Apache License 2.0:
  <https://opensource.org/license/apache-2-0>
- Guía de la Apache Software Foundation sobre los archivos NOTICE:
  <https://www.apache.org/legal/src-headers.html>
- ADR adyacente: [ADR-0007: Objetivo de despliegue](/ai-agent-eval-harness-healthtech-docs/es-419/adr/adr-0007-deployment/)
- MADR 4.0.0: <https://adr.github.io/madr/>
