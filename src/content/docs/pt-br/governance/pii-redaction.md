---
title: Redação de PII
description: Padrões de detecção, integração no pipeline e limitações da redação determinística de PII na implementação de referência pública.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Documentação de redação de PII

> Documenta as capacidades de redação de PII (Informação de Identificação Pessoal) da
> implementação de referência `ai-agent-eval-harness-healthtech`. Cobre os padrões de detecção,
> a integração no pipeline e as limitações do módulo atual de redação de PII.
>
> Leia em conjunto com a [avaliação de prontidão para HIPAA](hipaa-readiness.md) e o
> [mapeamento da Ley 19.628 do Chile](chile-ley-19628.md).

## Arquitetura de redação de PII

### Integração no pipeline

A redação de PII é aplicada em dois pontos do pipeline do agente:

1. **Na entrada (input)**: A entrada do usuário é varrida em busca de padrões de PII antes de ser
   processada pelo pipeline do agente. As PII detectadas são substituídas por tokens de marcação (por exemplo,
   `[EMAIL]`, `[PHONE]`, `[SSN]`). O texto redigido é o que o agente processa.

2. **Na saída (output)**: A saída do agente é varrida em busca de padrões de PII antes de ser retornada
   ao usuário. Isso captura casos em que o LLM gera PII inadvertidamente (por exemplo,
   ao repetir um número de telefone presente no contexto da conversa).

A redação é executada na camada de guardrails e está integrada aos nós `guardrail_pre`
e `guardrail_post` do pipeline do LangGraph.

### Eventos de redação nos spans de telemetria

Os eventos de redação de PII são registrados como atributos de span de telemetria:

- `pii.redacted`: booleano que indica se houve redação
- `pii.pattern_type`: o tipo de padrão correspondente (por exemplo, "email", "phone_us",
  "rut_chile")

O texto da mensagem do usuário nunca é incluído nos atributos do span (invariante de privacidade).

## Padrões de detecção

### Tipos de PII detectados atualmente

| Tipo de PII | Padrão | Configuração regional | Exemplo |
|----------|---------|--------|---------|
| **Endereços de e-mail** | Regex simplificado do RFC 5322 | Universal | `user@example.com` -> `[EMAIL]` |
| **Telefones dos EUA** | Formato NANP com prefixo +1 opcional | en (EUA) | `+1 (555) 123-4567` -> `[PHONE]` |
| **Telefones chilenos** | Prefixo +56, padrões de celular (9) e fixo | es-419 (Chile) | `+56 9 1234 5678` -> `[PHONE]` |
| **Telefones brasileiros** | Prefixo +55, padrões de celular (9 dígitos) e fixo | pt-BR (Brasil) | `+55 11 91234-5678` -> `[PHONE]` |
| **SSN dos EUA** | Formato `XXX-XX-XXXX` com validação de faixa | en (EUA) | `123-45-6789` -> `[SSN]` |
| **RUT chileno** | Formato `XX.XXX.XXX-X` com dígito verificador módulo 11 | es-419 (Chile) | `12.345.678-5` -> `[RUT]` |
| **CPF brasileiro** | Formato `XXX.XXX.XXX-XX` com dígito verificador módulo 11 | pt-BR (Brasil) | `123.456.789-09` -> `[CPF]` |
| **DNI chileno** | Padrões de documento nacional de identidade | es-419 (Chile) | Formatos diversos -> `[DNI]` |
| **Números de cartão de crédito** | Números de 13 a 19 dígitos com validação pelo algoritmo de Luhn | Universal | `4111 1111 1111 1111` -> `[CC]` |
| **Números de Prontuário Médico (MRN)** | Padrões alfanuméricos comuns em sistemas de saúde | en (EUA) | `MRN-12345678` -> `[MRN]` |
| **Datas de Nascimento (DOB)** | Formatos comuns de DOB (MM/DD/AAAA, DD/MM/AAAA) | Universal | `01/15/1990` -> `[DOB]` |

### Metodologia de correspondência de padrões

A detecção de PII usa padrões regex determinísticos, não detecção baseada em LLM. Isso garante:

- **Reprodutibilidade**: A mesma entrada sempre produz o mesmo resultado de redação
- **Determinismo**: A redação de PII é executada na camada de guardrails, que é testada pelo
  gate determinístico de CI (um cliente LLM stub, sem necessidade de chaves de API)
- **Baixa latência**: A correspondência por regex é rápida e adiciona uma sobrecarga desprezível ao pipeline
- **Auditabilidade**: As definições de padrões são versionadas e revisáveis

### Verificações de validação

Alguns tipos de PII incluem validação estrutural além da correspondência de padrões:

- **Números de cartão de crédito**: Validados com o algoritmo de Luhn para reduzir falsos positivos
  em sequências de dígitos arbitrárias
- **RUT**: Validado com o algoritmo chileno de dígito verificador módulo 11
- **CPF**: Validado com o algoritmo brasileiro de dígito verificador módulo 11
- **SSN**: Validado por faixa para excluir faixas impossíveis (por exemplo, 000, 666, 900-999 no
  número de área)

## Limitações

### Limitações conhecidas da detecção baseada em regex

1. **PII dependente de contexto**: Os padrões regex não conseguem detectar PII que é implícita pelo contexto
   em vez de formatada em um padrão reconhecível. Por exemplo, "meu nome é John e
   moro na esquina da Main com a Oak" contém PII (nome, localização) que nenhum regex
   consegue extrair de forma confiável.

2. **Formatos inéditos**: Novos formatos de número de telefone, de número de identificação ou de endereço
   não cobertos pelos padrões existentes passarão sem ser detectados.

3. **Formatos internacionais**: Embora o módulo cubra formatos dos EUA, do Chile e do Brasil,
   PII de outras jurisdições pode não ser detectada. A cobertura está intencionalmente
   alinhada às três configurações regionais suportadas.

4. **PII parcial**: PII fragmentada e espalhada por várias mensagens (por exemplo, o código de área em
   uma mensagem e os dígitos restantes na seguinte) não é detectada.

5. **Abreviações e gírias**: PII expressa de modo informal (por exemplo, "mi número es cinco
   cinco cinco uno dos tres cuatro" -- dígitos por extenso) não é detectada.

6. **Falsos positivos**: Os padrões regex podem ocasionalmente redigir conteúdo que não é PII, mas que por acaso
   corresponde a um formato de padrão (por exemplo, um código de produto de 9 dígitos que corresponde ao formato de SSN). As
   validações de Luhn e módulo 11 mitigam isso para os identificadores financeiros.

### O que a redação de PII NÃO faz

- **Não impede que o LLM gere conteúdo semelhante a PII**: A redação na saída
  captura padrões de PII gerados, mas um LLM sofisticado pode gerar conteúdo que
  é adjacente a PII sem corresponder aos padrões.
- **Não redige nomes**: Nomes pessoais não são redigidos porque a detecção confiável de nomes
  sem um modelo de NER produz taxas de falsos positivos inaceitáveis.
- **Não redige endereços**: Endereços de rua não são redigidos devido à ampla
  variação nos formatos de endereço entre as configurações regionais.
- **Não redige dados biométricos**: Nenhum padrão de impressão digital, impressão de voz ou reconhecimento
  facial está incluído (o sistema não coleta dados biométricos).
- **Não fornece privacidade diferencial**: A redação de PII remove identificadores diretos,
  mas não fornece garantias matemáticas de privacidade.

## Estado atual

A implementação de referência fornece redação determinística de PII que cobre os tipos de identificador
mais comuns em suas três configurações regionais suportadas (EUA, Chile, Brasil). O
módulo de redação é executado na camada de guardrails, é testado pelo gate determinístico de CI
e registra eventos de redação em spans de telemetria.

Pontos fortes principais:

1. **Determinística e reprodutível**: Mesma entrada, mesma redação, todas as vezes. Nenhuma
   dependência do comportamento do LLM para a detecção de PII.
2. **Cobertura multiconfiguração regional**: Padrões para identificadores dos EUA, do Chile e do Brasil,
   alinhados às três configurações regionais suportadas.
3. **Validação estrutural**: Algoritmo de Luhn para cartões de crédito, módulo 11 para RUT e CPF,
   validação de faixa para SSN -- reduzindo falsos positivos nos padrões mais sensíveis.
4. **Integração no pipeline**: Redação tanto na entrada quanto na saída, integrada aos
   nós de guardrails que são testados pelo harness de eval.
5. **Trilha de auditoria**: Eventos de redação registrados em spans de telemetria com o tipo de padrão, permitindo
   o monitoramento da frequência de redação e da distribuição de padrões.

## Caminho até produção

A redação de PII de nível de produção exigiria:

1. **Cobertura de padrões ampliada**: Tipos adicionais de PII (nomes via NER, endereços, endereços
   IP, identificadores de veículos, padrões de dados biométricos, formatos de prontuário médico
   de sistemas de EHR específicos); cobertura para jurisdições adicionais além de EUA/Chile/Brasil

2. **Detecção residual baseada em LLM**: Uma passagem secundária de detecção de PII baseada em LLM para capturar
   PII que os padrões regex não detectam (PII dependente de contexto, formatos inéditos, PII parcial);
   aplicada como uma verificação de segunda etapa após a redação baseada em regex

3. **Métricas de qualidade de redação**: Medição automatizada da precisão e do recall da redação
   contra um conjunto de teste rotulado; acompanhamento das taxas de falsos positivos e falsos negativos;
   teste de regressão quando os padrões são atualizados

4. **Revisão periódica de padrões**: Revisão regular dos padrões de PII frente a formatos de dados
   emergentes, novos tipos de identificador e regulações de privacidade em evolução; cadência de atualização
   atrelada ao ciclo de revisão regulatória

5. **Padrões específicos de domínio**: Se implantado em contextos específicos de saúde ou financeiros,
   padrões personalizados para formatos de identificador específicos da instituição (por exemplo, formatos específicos
   de MRN de EHR, formatos de ID de seguro, formatos de número de conta)

6. **Registro de redação para conformidade**: Além dos atributos de span de telemetria atuais,
   em produção seriam necessários logs de auditoria de redação dedicados com políticas de retenção,
   controles de acesso e relatórios de conformidade

7. **Tratamento de solicitações dos titulares**: Mecanismos para que os titulares solicitem informações
   sobre quais PII foram detectadas e redigidas; procedimentos de exclusão para quaisquer metadados de
   redação armazenados

## Veja também

- [Avaliação de prontidão para HIPAA](hipaa-readiness.md) -- avaliação de prontidão para HIPAA
- [Mapeamento da Ley 19.628 do Chile](chile-ley-19628.md) -- mapeamento de proteção de dados do Chile
- [Plano de registro de auditoria](audit-logging-plan.md) -- plano de registro de auditoria
- [Design de guardrails](../adr/adr-0005-guardrails.md) -- design de guardrails
