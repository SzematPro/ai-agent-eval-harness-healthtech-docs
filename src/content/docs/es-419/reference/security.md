---
title: Política de seguridad
description: Modelo de amenazas, reporte de vulnerabilidades, cronograma de divulgación e higiene de dependencias y secretos para la implementación de referencia.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Política de seguridad

## Modelo de amenazas

Esta es una implementación de referencia pública. No hay un despliegue de
producción que maneje datos reales de pacientes, ni una superficie de
usuario autenticada, ni un almacén persistente de información de
identificación personal, ni integración con ningún sistema externo que
contenga PHI. La superficie de ataque es, en consecuencia, pequeña. Los
dos riesgos que importan, y que se tratan como dentro del alcance de esta
política, son la filtración de credenciales a través de registros de CI o
de diffs de PR (claves de API de proveedores de LLM, proveedores de
embeddings, backends de observabilidad) y la vulneración de la cadena de
suministro mediante una dependencia de Python maliciosa o por
typosquatting que llegue al lockfile.

Los riesgos de segundo orden que el diseño mitiga explícitamente: el
agente nunca ingiere datos reales de pacientes ni siquiera en desarrollo
(solo personas y diálogos generados por LLM), el Space de la demo en vivo
no registra el contenido de la conversación más allá de lo que el plan
gratuito de Langfuse Cloud retiene durante 30 días, cada tarjeta de la KB
lleva metadatos de procedencia y licencia, y cada afirmación clínica en
una salida del modelo debe citar una tarjeta de la KB.
Fuera de alcance: las vulnerabilidades en un fork derivado que introduzca
un despliegue de producción, las vulnerabilidades en la infraestructura de
proveedores de LLM de terceros y las afirmaciones de seguridad clínica
sobre las salidas del modelo (el agente no es un dispositivo médico;
consulta la [postura regulatoria](regulatory-posture.md)).

## Reporte de una vulnerabilidad

Escribe a <waldemar@szemat.pro> con `[SECURITY]` en el asunto. Por favor
incluye una descripción, los pasos de reproducción, el SHA de commit o la
etiqueta de versión afectados y la severidad que sugieres. Acuse de recibo
dentro de 72 horas; el cronograma de triaje y remediación se indica en la
primera respuesta. No abras una incidencia pública para una vulnerabilidad
sin corregir.

La clave PGP está disponible a pedido; si necesitas una para el primer
contacto, solicítala en el primer correo y se enviará por un canal
separado.

## Cronograma de divulgación

- **T+0**: reporte recibido.
- **T+72h**: acuse de recibo y decisión inicial de triaje.
- **T+30d** (objetivo): corrección disponible en `main`, aviso redactado.
- **T+90d** (tope): divulgación pública coordinada salvo que se acuerde
  mutuamente una extensión.

Se ofrece crédito por la divulgación responsable. La atribución preferida
por quien reporta (nombre, alias, "anónimo") se respeta en el aviso y en
las notas de versión.

## Nada de PHI, nunca

Esta es una restricción dura, no una aspiración. El repositorio no debe
contener ninguna información de salud protegida, ninguna información de
identificación personal, ningún dato derivado de un registro real de
paciente, ningún dato bajo un Acuerdo de Uso de Datos (PhysioNet DUA,
i2b2/n2c2 DUA, equivalentes), ni ningún conjunto de datos cuya licencia
prohíba la redistribución (MedDialog, ChatDoctor / HealthCareMagic-100K,
MIMIC-IV, MIMIC-IV-Note, Asclepius). La ficha de datos en
[datos](data.md) incluye la lista completa de exclusiones y la
justificación.

Si una persona contribuyente propone agregar un conjunto de datos, la
carga de la prueba recae en el PR para demostrar (a) procedencia
sintética, (b) una licencia de redistribución permisiva y (c) ausencia de
riesgo de identificabilidad. Los PR que introduzcan datos sin esa prueba
se cerrarán.

## Higiene de dependencias y secretos

- **El lockfile como fuente de verdad.** El lockfile es la fuente de
  verdad. El job de lint ejecuta una verificación de consistencia del
  lockfile y cada sincronización de dependencias se ejecuta en modo
  congelado, de modo que una deriva del lockfile hace fallar la CI. La
  imagen de despliegue también se construye en modo congelado sin
  alternativa de re-resolución, fallando el build de la imagen de forma
  cerrada ante una deriva.
- **Dependabot** está habilitado para `pip` (a través del manifiesto del
  proyecto gestionado por `uv`), `github-actions` y `docker`. Los tres
  ecosistemas se revisan **a diario**, con un máximo de cinco PR abiertos
  concurrentes por ecosistema.
- **Puerta de CVE de dependencias.** Un job de auditoría de dependencias
  en CI exporta el conjunto de ejecución bloqueado y sin dependencias de
  desarrollo y ejecuta `pip-audit --strict` contra él; cualquier
  vulnerabilidad conocida hace fallar el job. Se exceptúa un aviso con una
  justificación documentada: **CVE-2026-45829 ("ChromaToast")** es una RCE
  pre-autenticación en el servidor FastAPI standalone de Python de ChromaDB
  (`chroma run`) y un vector de colección envenenada contra instancias
  compartidas no confiables. Este proyecto embebe ChromaDB en proceso sobre
  una colección local autopoblada y nunca ejecuta el servidor ni se conecta
  a una instancia ajena, así que no aplica ninguno de los dos vectores; no
  existe corrección upstream a fecha de 1.5.9. La excepción se elimina
  cuando se publique un parche.
- **El escaneo de secretos** está habilitado a nivel del repositorio
  (nativo de GitHub) y además es impuesto por un job de CI `secret-scan`,
  que ejecuta `gitleaks` sobre todo el historial de la rama. Los PR que
  introduzcan un secreto de alta confianza se bloquean en la puerta.
- **Los secretos de CI** (claves de API de proveedores y de
  observabilidad) están acotados a entornos, no se exponen a builds de PR
  desde forks y se rotan ante la sospecha de filtración.
- **Anclaje de acciones.** Las GitHub Actions de terceros y propias en los
  flujos de trabajo de CI, evaluación y red-team están ancladas a SHA de
  commit (con la etiqueta legible en un comentario al final) de modo que
  una etiqueta movida no pueda cambiar lo que se ejecuta en un job que
  porta secretos.
- **Hook de pre-commit** ejecuta `gitleaks` localmente sobre los archivos
  en stage; instálalo a través de la configuración de pre-commit del
  proyecto después de la sincronización inicial de dependencias.
- **Pin de dependencia congelado.** `rank-bm25` está anclado
  intencionalmente en su versión final `0.2.2` (consulta
  [ADR-0023](../adr/adr-0023-hybrid-retrieval.md), Decisión B): un pin
  deliberado de fin de vida, no un descuido por desatención; el job de CI
  `pip-audit` igualmente lo controla por avisos.

## Postura regulatoria

Consulta la [postura regulatoria](regulatory-posture.md) para conocer el
límite de bienestar/CDS de la FDA que el diseño respeta, la guía de la OMS
sobre LMM que el proyecto sigue y la lista explícita de cosas que el agente
NO hace. Un reporte de vulnerabilidad que afirme una falla de clasificación
regulatoria debería referenciar ese documento.

## Contacto

<waldemar@szemat.pro>
