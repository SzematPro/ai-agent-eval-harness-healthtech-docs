---
title: Glossário
description: Expansões de termos para as abreviaturas e os arcabouços regulatórios usados ao longo da implementação de referência e de sua documentação.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Glossário

Expansões de termos para as abreviaturas e a notação abreviada de nomes
próprios usadas ao longo do projeto, incluindo os arcabouços regulatórios
que o agente deve respeitar. Cada entrada indica a jurisdição ou o órgão de
normalização quando o termo é específico de um setor.

## Órgãos regulatórios e de normalização

| Termo | Expansão | Jurisdição / escopo |
|---|---|---|
| **FDA** | Food and Drug Administration | Estados Unidos |
| **WHO** | World Health Organization (Organização Mundial da Saúde) | Internacional |
| **WHO EML** | WHO Essential Medicines List (Lista de Medicamentos Essenciais da OMS) | Internacional, catálogo de medicamentos |
| **MHRA** | Medicines and Healthcare products Regulatory Agency | Reino Unido |
| **EMA** | European Medicines Agency | União Europeia |
| **NAIC** | National Association of Insurance Commissioners | Estados Unidos, reguladores de seguros a nível estadual |
| **EIOPA** | European Insurance and Occupational Pensions Authority | União Europeia |
| **CMF** | Comisión para el Mercado Financiero | Chile, regulador bancário e de valores mobiliários |
| **CNBV** | Comisión Nacional Bancaria y de Valores | México, regulador bancário e de valores mobiliários |
| **FFIEC** | Federal Financial Institutions Examination Council | Estados Unidos, padrões bancários interinstitucionais |
| **OCC** | Office of the Comptroller of the Currency | Estados Unidos, regulador bancário federal |
| **NYDFS** | New York State Department of Financial Services | Estado de Nova York |
| **ANMAT** | Administración Nacional de Medicamentos, Alimentos y Tecnología Médica | Argentina, regulador de medicamentos e dispositivos médicos |
| **ANVISA** | Agência Nacional de Vigilância Sanitária | Brasil, regulador de medicamentos e dispositivos médicos |
| **ISP** | Instituto de Salud Pública | Chile, regulador de medicamentos e dispositivos médicos |
| **COFEPRIS** | Comisión Federal para la Protección contra Riesgos Sanitarios | México, regulador de medicamentos e dispositivos médicos |

## Bancário e finanças

| Termo | Expansão | O que rege |
|---|---|---|
| **Reg E** | Regulation E (Electronic Fund Transfer Act, 12 CFR Part 1005) | Disputas de EFT de consumidores nos EUA, prazos de resolução de erros |
| **Reg Z** | Regulation Z (Truth in Lending Act, 12 CFR Part 1026) | Divulgações de crédito ao consumidor nos EUA |
| **KYC** | Know Your Customer (Conheça Seu Cliente) | Programa de identificação de clientes sob as regras BSA / AML |
| **BSA** | Bank Secrecy Act | Registro e reporte antilavagem de dinheiro nos EUA |
| **AML** | Anti-Money Laundering (Antilavagem de Dinheiro) | Controles internacionais contra a lavagem de dinheiro e o financiamento do terrorismo |
| **PLAFT** | Prevención del Lavado de Activos y Financiamiento del Terrorismo | Termo em espanhol da América Latina para o programa de controle AML |
| **SR 11-7** | Carta de Supervisão 11-7 do Federal Reserve, "Guidance on Model Risk Management" | Governança do risco de modelos bancários nos EUA |
| **Solvency II** | Diretiva da UE 2009/138/CE, arcabouço de capital e supervisão para seguradoras | Supervisão de seguros na União Europeia |
| **DORA** | Digital Operational Resilience Act, Regulamento da UE 2022/2554 | Risco de TIC e de terceiros do setor financeiro da UE |

## Saúde

| Termo | Expansão | Notas |
|---|---|---|
| **PHI** | Protected Health Information (Informação de Saúde Protegida) | Classe de dados definida pela HIPAA |
| **HIPAA** | Health Insurance Portability and Accountability Act | Privacidade e segurança dos dados de saúde nos EUA |
| **EHR** | Electronic Health Record (Prontuário Eletrônico de Saúde) | Sistema de registro clínico |
| **CDS** | Clinical Decision Support (Suporte à Decisão Clínica) | Classificação dispositivo-versus-não-dispositivo sob o guia de CDS da FDA |
| **MI** | Motivational Interviewing (Entrevista Motivacional) | Abordagem de aconselhamento para o engajamento do paciente |
| **CSV** | Computer System Validation (Validação de Sistemas Computadorizados) | Arcabouço tradicional de validação GxP |
| **CSA** | Computer Software Assurance (Garantia de Software) | Sucessor baseado em risco da FDA (2022) do CSV |

## Conformidade farmacêutica e GxP

| Termo | Expansão | Notas |
|---|---|---|
| **SOP** | Standard Operating Procedure (Procedimento Operacional Padrão) | Documento procedimental controlado |
| **GxP** | Guarda-chuva "Good x Practice" (GMP, GLP, GCP, GDP, GVP, GPvP) | Família de arcabouços de qualidade / regulatórios |
| **21 CFR Part 11** | Regulamento da FDA dos EUA sobre registros e assinaturas eletrônicas | Validação, trilha de auditoria, controles de assinatura |
| **EU Annex 11** | Anexo 11 das GMP da UE, "Computerised Systems" | Contraparte da UE do 21 CFR Part 11 |
| **ICH E6(R3)** | International Council for Harmonisation, Boas Práticas Clínicas revisão 3 | Padrão de GCP modernizado |

## Governança de IA e plataforma de ML

| Termo | Expansão | Notas |
|---|---|---|
| **LLM** | Large Language Model (Grande Modelo de Linguagem) | Família de modelos de fundação usada pelo agente |
| **RAG** | Retrieval-Augmented Generation (Geração Aumentada por Recuperação) | Padrão de fundamentar o LLM em um corpus recuperado |
| **KB** | Knowledge Base (Base de Conhecimento) | O corpus sintético de cartões de adesão à medicação sobre o qual o agente recupera |
| **OTel** | OpenTelemetry | Protocolo de tracing e métricas neutro em relação ao fornecedor |
| **OpenInference** | Convenções semânticas de OTel específicas para LLM em spans | Projeto irmão do OpenTelemetry |
| **EU AI Act** | Regulation (EU) 2024/1689 sobre inteligência artificial | Regime de classificação de risco de IA da UE; o Anexo III lista os sistemas de alto risco |
| **GMLP** | Good Machine Learning Practice (Boas Práticas de Aprendizado de Máquina) | Guia conjunto da FDA / MHRA / Health Canada |
| **NIST AI RMF** | NIST AI Risk Management Framework | Padrão voluntário de gestão de risco de IA dos EUA |

## Proteção de dados

| Termo | Expansão | Jurisdição |
|---|---|---|
| **PII** | Personally Identifiable Information (Informação de Identificação Pessoal) | Termo genérico de privacidade |
| **GDPR** | General Data Protection Regulation, Regulamento da UE 2016/679 | União Europeia |
| **LGPD** | Lei Geral de Proteção de Dados Pessoais, Lei 13.709/2018 | Brasil |
| **Ley 19.628** | Ley sobre Protección de la Vida Privada | Chile, lei de proteção de dados pessoais |
| **FERPA** | Family Educational Rights and Privacy Act | Estados Unidos, registros estudantis |
| **WCAG** | Web Content Accessibility Guidelines, W3C / WAI | Padrão internacional de acessibilidade |

## Jurídico

| Termo | Expansão | Notas |
|---|---|---|
| **UPL** | Unauthorised Practice of Law (Exercício Não Autorizado do Direito) | Vedação ao aconselhamento jurídico por não advogados na maioria das jurisdições |

## Telecom e infraestrutura regional

| Termo | Expansão | Notas |
|---|---|---|
| **VAS** | Value-Added Service (Serviço de Valor Agregado) | Mensageria faturada pela operadora ou rota de SMS premium; um canal de entrega de baixa largura de banda na América Latina |
| **LATAM** | América Latina | Região de vinte países do México à Argentina, mais os estados de língua espanhola do Caribe |

## Engenharia e operações

| Termo | Expansão | Notas |
|---|---|---|
| **CI** | Continuous Integration (Integração Contínua) | Pipeline de build-e-teste por commit |
| **CD** | Continuous Deployment (Implantação Contínua) | Pipeline de implantação por merge |
| **SDK** | Software Development Kit (Kit de Desenvolvimento de Software) | Ex.: o modo de build "Docker SDK" do Hugging Face Spaces |
| **CPU Basic** | Nível de hardware do Hugging Face Spaces | 2 vCPU, 16 GB RAM, camada gratuita; o destino de implantação desta implementação de referência |
| **TPM / RPM** | Tokens por minuto / Requisições por minuto | Dimensões de limite de taxa do provedor de LLM |
| **PR** | Pull Request | A unidade de revisão de mudanças; os gates de avaliação, custo e red-team rodam em cada PR |

---

Este glossário cobre os termos canônicos usados ao longo da documentação e
dos ADRs. Se um termo estiver faltando, a fonte de verdade substantiva vive
na [postura regulatória](regulatory-posture.md) (postura regulatória e
exclusões) e em [dados](data.md) (auditoria de licença do dataset e lista de
exclusões).
