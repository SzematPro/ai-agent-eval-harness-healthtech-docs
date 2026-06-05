---
title: Glossary
description: Term expansions for the abbreviations and regulatory frameworks used across the reference implementation and its documentation.
---

:::caution[Reference documentation: not a medical device]
This documentation describes a public reference implementation evaluated on 100% synthetic data. It is a capability and readiness reference, not a compliance certification or legal advice, and it is not a medical device. It is not clinically validated and handles no production PHI.
:::

# Glossary

Term expansions for the abbreviations and proper-noun shorthand used
across the project, including the regulatory frameworks the agent
must respect. Each entry names the jurisdiction or standards body when
the term is sector-specific.

## Regulatory and standards bodies

| Term | Expansion | Jurisdiction / scope |
|---|---|---|
| **FDA** | Food and Drug Administration | United States |
| **WHO** | World Health Organization | International |
| **WHO EML** | WHO Essential Medicines List | International, drug catalogue |
| **MHRA** | Medicines and Healthcare products Regulatory Agency | United Kingdom |
| **EMA** | European Medicines Agency | European Union |
| **NAIC** | National Association of Insurance Commissioners | United States, state-level insurance regulators |
| **EIOPA** | European Insurance and Occupational Pensions Authority | European Union |
| **CMF** | Comisión para el Mercado Financiero | Chile, banking and securities regulator |
| **CNBV** | Comisión Nacional Bancaria y de Valores | Mexico, banking and securities regulator |
| **FFIEC** | Federal Financial Institutions Examination Council | United States, interagency banking standards |
| **OCC** | Office of the Comptroller of the Currency | United States, federal bank regulator |
| **NYDFS** | New York State Department of Financial Services | New York State |
| **ANMAT** | Administración Nacional de Medicamentos, Alimentos y Tecnología Médica | Argentina, drug and medical-device regulator |
| **ANVISA** | Agência Nacional de Vigilância Sanitária | Brazil, drug and medical-device regulator |
| **ISP** | Instituto de Salud Pública | Chile, drug and medical-device regulator |
| **COFEPRIS** | Comisión Federal para la Protección contra Riesgos Sanitarios | Mexico, drug and medical-device regulator |

## Banking and finance

| Term | Expansion | What it governs |
|---|---|---|
| **Reg E** | Regulation E (Electronic Fund Transfer Act, 12 CFR Part 1005) | US consumer EFT disputes, error-resolution timelines |
| **Reg Z** | Regulation Z (Truth in Lending Act, 12 CFR Part 1026) | US consumer-credit disclosures |
| **KYC** | Know Your Customer | Customer-identification programme under BSA / AML rules |
| **BSA** | Bank Secrecy Act | US anti-money-laundering recordkeeping and reporting |
| **AML** | Anti-Money Laundering | International controls against money-laundering and terrorism financing |
| **PLAFT** | Prevención del Lavado de Activos y Financiamiento del Terrorismo | LATAM Spanish term for the AML control programme |
| **SR 11-7** | Federal Reserve Supervisory Letter 11-7, "Guidance on Model Risk Management" | US bank model-risk governance |
| **Solvency II** | EU Directive 2009/138/EC, capital and supervisory framework for insurers | European Union insurance supervision |
| **DORA** | Digital Operational Resilience Act, EU Regulation 2022/2554 | EU financial-sector ICT and third-party risk |

## Healthcare

| Term | Expansion | Notes |
|---|---|---|
| **PHI** | Protected Health Information | HIPAA-defined data class |
| **HIPAA** | Health Insurance Portability and Accountability Act | US health-data privacy and security |
| **EHR** | Electronic Health Record | Clinical record system |
| **CDS** | Clinical Decision Support | Device-vs-non-device classification under FDA's CDS guidance |
| **MI** | Motivational Interviewing | Patient-engagement counselling approach |
| **CSV** | Computer System Validation | Traditional GxP validation framework |
| **CSA** | Computer Software Assurance | FDA's risk-based 2022 successor to CSV |

## Pharma compliance and GxP

| Term | Expansion | Notes |
|---|---|---|
| **SOP** | Standard Operating Procedure | Controlled procedural document |
| **GxP** | "Good x Practice" umbrella (GMP, GLP, GCP, GDP, GVP, GPvP) | Quality / regulatory framework family |
| **21 CFR Part 11** | US FDA regulation on electronic records and electronic signatures | Validation, audit trail, signature controls |
| **EU Annex 11** | EU GMP Annex 11, "Computerised Systems" | EU counterpart to 21 CFR Part 11 |
| **ICH E6(R3)** | International Council for Harmonisation, Good Clinical Practice revision 3 | Modernised GCP standard |

## AI governance and ML platform

| Term | Expansion | Notes |
|---|---|---|
| **LLM** | Large Language Model | Foundation-model family used by the agent |
| **RAG** | Retrieval-Augmented Generation | Pattern of grounding the LLM in a retrieved corpus |
| **KB** | Knowledge Base | The synthetic medication-adherence card corpus the agent retrieves over |
| **OTel** | OpenTelemetry | Vendor-neutral tracing and metrics protocol |
| **OpenInference** | LLM-specific OTel semantic conventions for spans | Sister project to OpenTelemetry |
| **EU AI Act** | Regulation (EU) 2024/1689 on artificial intelligence | EU AI risk-classification regime; Annex III lists high-risk systems |
| **GMLP** | Good Machine Learning Practice | FDA / MHRA / Health Canada joint guidance |
| **NIST AI RMF** | NIST AI Risk Management Framework | US voluntary AI risk-management standard |

## Data protection

| Term | Expansion | Jurisdiction |
|---|---|---|
| **PII** | Personally Identifiable Information | Generic privacy term |
| **GDPR** | General Data Protection Regulation, EU Regulation 2016/679 | European Union |
| **LGPD** | Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018 | Brazil |
| **Ley 19.628** | Ley sobre Protección de la Vida Privada | Chile, personal-data protection law |
| **FERPA** | Family Educational Rights and Privacy Act | United States, student records |
| **WCAG** | Web Content Accessibility Guidelines, W3C / WAI | International accessibility standard |

## Legal

| Term | Expansion | Notes |
|---|---|---|
| **UPL** | Unauthorised Practice of Law | Bar against non-lawyer legal advice in most jurisdictions |

## Telecom and regional infrastructure

| Term | Expansion | Notes |
|---|---|---|
| **VAS** | Value-Added Service | Carrier-billed messaging or premium SMS path; a LATAM low-bandwidth delivery channel |
| **LATAM** | Latin America | Twenty-country region from Mexico to Argentina, plus the Caribbean Spanish-speaking states |

## Engineering and operations

| Term | Expansion | Notes |
|---|---|---|
| **CI** | Continuous Integration | Per-commit build-and-test pipeline |
| **CD** | Continuous Deployment | Per-merge deploy pipeline |
| **SDK** | Software Development Kit | E.g. the Hugging Face Spaces "Docker SDK" build mode |
| **CPU Basic** | Hugging Face Spaces hardware tier | 2 vCPU, 16 GB RAM, free tier; the deploy target for this reference implementation |
| **TPM / RPM** | Tokens-per-minute / Requests-per-minute | LLM provider rate-limit dimensions |
| **PR** | Pull Request | The change-review unit; eval, cost, and red-team gates run on every PR |

---

This glossary covers the canonical terms used across the documentation
and ADRs. If a term is missing, the substantive source of truth lives
in [regulatory posture](regulatory-posture.md) (regulatory posture and
exclusions) and [data](data.md) (dataset licence audit and exclusion
list).
