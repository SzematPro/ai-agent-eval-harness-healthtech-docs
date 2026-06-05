---
title: Glosario
description: Expansiones de términos para las abreviaturas y los marcos regulatorios usados en la implementación de referencia y su documentación.
---

:::caution[Documentación de referencia: no es un dispositivo médico]
Esta documentación describe una implementación de referencia pública evaluada con datos 100% sintéticos. Es una referencia de capacidades y preparación, no una certificación de cumplimiento ni asesoría legal, y no es un dispositivo médico. No está validada clínicamente y no maneja PHI de producción.
:::

# Glosario

Expansiones de términos para las abreviaturas y la notación abreviada de
nombres propios usadas en el proyecto, incluidos los marcos regulatorios
que el agente debe respetar. Cada entrada indica la jurisdicción o el
organismo de normalización cuando el término es específico de un sector.

## Organismos regulatorios y de normalización

| Término | Expansión | Jurisdicción / alcance |
|---|---|---|
| **FDA** | Food and Drug Administration | Estados Unidos |
| **WHO** | World Health Organization (Organización Mundial de la Salud) | Internacional |
| **WHO EML** | WHO Essential Medicines List (Lista de Medicamentos Esenciales de la OMS) | Internacional, catálogo de medicamentos |
| **MHRA** | Medicines and Healthcare products Regulatory Agency | Reino Unido |
| **EMA** | European Medicines Agency | Unión Europea |
| **NAIC** | National Association of Insurance Commissioners | Estados Unidos, reguladores de seguros a nivel estatal |
| **EIOPA** | European Insurance and Occupational Pensions Authority | Unión Europea |
| **CMF** | Comisión para el Mercado Financiero | Chile, regulador bancario y de valores |
| **CNBV** | Comisión Nacional Bancaria y de Valores | México, regulador bancario y de valores |
| **FFIEC** | Federal Financial Institutions Examination Council | Estados Unidos, estándares bancarios interinstitucionales |
| **OCC** | Office of the Comptroller of the Currency | Estados Unidos, regulador bancario federal |
| **NYDFS** | New York State Department of Financial Services | Estado de Nueva York |
| **ANMAT** | Administración Nacional de Medicamentos, Alimentos y Tecnología Médica | Argentina, regulador de medicamentos y dispositivos médicos |
| **ANVISA** | Agência Nacional de Vigilância Sanitária | Brasil, regulador de medicamentos y dispositivos médicos |
| **ISP** | Instituto de Salud Pública | Chile, regulador de medicamentos y dispositivos médicos |
| **COFEPRIS** | Comisión Federal para la Protección contra Riesgos Sanitarios | México, regulador de medicamentos y dispositivos médicos |

## Banca y finanzas

| Término | Expansión | Qué rige |
|---|---|---|
| **Reg E** | Regulation E (Electronic Fund Transfer Act, 12 CFR Part 1005) | Disputas de EFT de consumidores en EE. UU., plazos de resolución de errores |
| **Reg Z** | Regulation Z (Truth in Lending Act, 12 CFR Part 1026) | Divulgaciones de crédito al consumidor en EE. UU. |
| **KYC** | Know Your Customer (Conoce a tu Cliente) | Programa de identificación de clientes bajo las reglas BSA / AML |
| **BSA** | Bank Secrecy Act | Registro y reporte antilavado de dinero en EE. UU. |
| **AML** | Anti-Money Laundering (Antilavado de Dinero) | Controles internacionales contra el lavado de dinero y el financiamiento del terrorismo |
| **PLAFT** | Prevención del Lavado de Activos y Financiamiento del Terrorismo | Término en español de LATAM para el programa de control AML |
| **SR 11-7** | Carta de Supervisión 11-7 de la Reserva Federal, "Guidance on Model Risk Management" | Gobernanza del riesgo de modelos bancarios en EE. UU. |
| **Solvency II** | Directiva de la UE 2009/138/CE, marco de capital y supervisión para aseguradoras | Supervisión de seguros en la Unión Europea |
| **DORA** | Digital Operational Resilience Act, Reglamento de la UE 2022/2554 | Riesgo de TIC y de terceros del sector financiero de la UE |

## Salud

| Término | Expansión | Notas |
|---|---|---|
| **PHI** | Protected Health Information (Información de Salud Protegida) | Clase de datos definida por HIPAA |
| **HIPAA** | Health Insurance Portability and Accountability Act | Privacidad y seguridad de los datos de salud en EE. UU. |
| **EHR** | Electronic Health Record (Historia Clínica Electrónica) | Sistema de registro clínico |
| **CDS** | Clinical Decision Support (Soporte a la Decisión Clínica) | Clasificación dispositivo-vs-no-dispositivo bajo la guía de CDS de la FDA |
| **MI** | Motivational Interviewing (Entrevista Motivacional) | Enfoque de consejería para la participación del paciente |
| **CSV** | Computer System Validation (Validación de Sistemas Informáticos) | Marco tradicional de validación GxP |
| **CSA** | Computer Software Assurance (Aseguramiento del Software) | Sucesor basado en riesgo de la FDA (2022) de CSV |

## Cumplimiento farmacéutico y GxP

| Término | Expansión | Notas |
|---|---|---|
| **SOP** | Standard Operating Procedure (Procedimiento Operativo Estándar) | Documento procedimental controlado |
| **GxP** | Paraguas "Good x Practice" (GMP, GLP, GCP, GDP, GVP, GPvP) | Familia de marcos de calidad / regulatorios |
| **21 CFR Part 11** | Regulación de la FDA de EE. UU. sobre registros y firmas electrónicas | Validación, traza de auditoría, controles de firma |
| **EU Annex 11** | Anexo 11 de las GMP de la UE, "Computerised Systems" | Contraparte de la UE de 21 CFR Part 11 |
| **ICH E6(R3)** | International Council for Harmonisation, Buenas Prácticas Clínicas revisión 3 | Estándar de GCP modernizado |

## Gobernanza de IA y plataforma de ML

| Término | Expansión | Notas |
|---|---|---|
| **LLM** | Large Language Model (Modelo de Lenguaje Grande) | Familia de modelos fundacionales que usa el agente |
| **RAG** | Retrieval-Augmented Generation (Generación Aumentada por Recuperación) | Patrón de fundamentar el LLM en un corpus recuperado |
| **KB** | Knowledge Base (Base de Conocimiento) | El corpus sintético de tarjetas de adherencia a la medicación sobre el que recupera el agente |
| **OTel** | OpenTelemetry | Protocolo de trazas y métricas neutral respecto del proveedor |
| **OpenInference** | Convenciones semánticas de OTel específicas para LLM en spans | Proyecto hermano de OpenTelemetry |
| **EU AI Act** | Regulation (EU) 2024/1689 sobre inteligencia artificial | Régimen de clasificación de riesgo de IA de la UE; el Anexo III lista los sistemas de alto riesgo |
| **GMLP** | Good Machine Learning Practice (Buenas Prácticas de Aprendizaje Automático) | Guía conjunta de la FDA / MHRA / Health Canada |
| **NIST AI RMF** | NIST AI Risk Management Framework | Estándar voluntario de gestión de riesgos de IA de EE. UU. |

## Protección de datos

| Término | Expansión | Jurisdicción |
|---|---|---|
| **PII** | Personally Identifiable Information (Información de Identificación Personal) | Término genérico de privacidad |
| **GDPR** | General Data Protection Regulation, Reglamento de la UE 2016/679 | Unión Europea |
| **LGPD** | Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018 | Brasil |
| **Ley 19.628** | Ley sobre Protección de la Vida Privada | Chile, ley de protección de datos personales |
| **FERPA** | Family Educational Rights and Privacy Act | Estados Unidos, registros estudiantiles |
| **WCAG** | Web Content Accessibility Guidelines, W3C / WAI | Estándar internacional de accesibilidad |

## Legal

| Término | Expansión | Notas |
|---|---|---|
| **UPL** | Unauthorised Practice of Law (Ejercicio No Autorizado del Derecho) | Prohibición de asesoría legal por no abogados en la mayoría de las jurisdicciones |

## Telecomunicaciones e infraestructura regional

| Término | Expansión | Notas |
|---|---|---|
| **VAS** | Value-Added Service (Servicio de Valor Agregado) | Mensajería facturada por el operador o ruta de SMS premium; un canal de entrega de bajo ancho de banda en LATAM |
| **LATAM** | América Latina | Región de veinte países desde México hasta Argentina, más los estados hispanohablantes del Caribe |

## Ingeniería y operaciones

| Término | Expansión | Notas |
|---|---|---|
| **CI** | Continuous Integration (Integración Continua) | Canalización de build-y-prueba por commit |
| **CD** | Continuous Deployment (Despliegue Continuo) | Canalización de despliegue por merge |
| **SDK** | Software Development Kit (Kit de Desarrollo de Software) | P. ej., el modo de build "Docker SDK" de Hugging Face Spaces |
| **CPU Basic** | Nivel de hardware de Hugging Face Spaces | 2 vCPU, 16 GB RAM, nivel gratuito; el destino de despliegue de esta implementación de referencia |
| **TPM / RPM** | Tokens por minuto / Solicitudes por minuto | Dimensiones de límite de tasa del proveedor de LLM |
| **PR** | Pull Request | La unidad de revisión de cambios; las puertas de evaluación, costo y red-team se ejecutan en cada PR |

---

Este glosario cubre los términos canónicos usados en la documentación y los
ADR. Si falta un término, la fuente de verdad sustantiva vive en la
[postura regulatoria](/ai-agent-eval-harness-healthtech-docs/es-419/reference/regulatory-posture/) (postura regulatoria y
exclusiones) y en [datos](/ai-agent-eval-harness-healthtech-docs/es-419/reference/data/) (auditoría de licencias del conjunto de
datos y lista de exclusiones).
