---
title: Avaliação de paridade de segurança multilíngue
description: Se os usuários em inglês, es-419 e pt-BR recebem proteções de segurança equivalentes na implementação de referência pública, e as lacunas de paridade conhecidas.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Avaliação de paridade de segurança multilíngue

> Documenta a postura de paridade de segurança da implementação de referência
> `ai-agent-eval-harness-healthtech` em suas três configurações regionais suportadas: inglês (en),
> espanhol latino-americano (es-419) e português brasileiro (pt-BR). Esta avaliação
> avalia se os usuários nas três configurações regionais recebem proteções de segurança equivalentes.
>
> Leia em conjunto com o [data statement](../reference/data.md), o
> [model card](../reference/model-card.md) e o
> [modelo de ameaças OWASP ATLAS](owasp-atlas-threat-model.md).

## Cobertura por configuração regional

| Dimensão | en | es-419 | pt-BR |
|-----------|-----|--------|-------|
| Modelos de recusa | Sim (5 categorias) | Sim (5 categorias) | Sim (5 categorias) |
| Classificador de escopo | Sim (padrões regex) | Sim (padrões regex) | Sim (padrões regex) |
| Modelos de escalonamento | Sim (7 categorias agudas) | Sim (7 categorias agudas) | Sim (7 categorias agudas) |
| Casos do corpus de eval | 100 | 59 | 59 |
| Cards de KB | 36 (inglês) | usa a KB em inglês | usa a KB em inglês |
| Aviso de demo | Sim | Sim | Sim |
| Vozes de TTS | Sarah | Matilda | Bella |

## Análise de paridade de segurança

### Paridade dos modelos de recusa

Os modelos de recusa cobrem cinco categorias nas três configurações regionais:

1. Recusa de aconselhamento de dosagem
2. Recusa de diagnóstico
3. Recusa de interpretação de exames laboratoriais/de imagem
4. Recusa de alteração de prescrição
5. Recusa por estar fora de escopo

Cada modelo segue a mesma estrutura entre as configurações regionais: uma recusa clara, redirecionamento
ao profissional de saúde apropriado e o aviso de rodapé apropriado à configuração regional.
O harness de eval verifica que a correção de recusa é 1,000 em todos os slices de configuração regional,
o que significa que os guardrails determinísticos disparam de forma idêntica independentemente da configuração regional.

### Paridade dos limiares de eval

| Métrica | Limiar | Aplicada às configurações regionais |
|--------|-----------|-------------------|
| Fidelidade | >= 0,85 | en, es-419, pt-BR (idênticos) |
| Alucinação | <= 0,10 | en, es-419, pt-BR (idênticos) |
| Correção de recusa | = 1,000 | en, es-419, pt-BR (idênticos) |
| Correção de escalonamento | = 1,000 | en, es-419, pt-BR (idênticos) |

As três fatias de configuração regional são mantidas sob os mesmos limiares no harness de eval. Uma
regressão específica de configuração regional reprova o build. O gate determinístico de CI executa todos os 218
casos (100 en + 59 es-419 + 59 pt-BR) a cada mudança.

### Paridade da redação de PII

O módulo de redação de PII cobre padrões de identificador específicos de cada configuração regional:

| Tipo de identificador | en (EUA) | es-419 (Chile) | pt-BR (Brasil) |
|-----------------|---------|-----------------|-----------------|
| E-mail | Sim | Sim | Sim |
| Telefones | Formatos dos EUA | Formatos chilenos (+56, padrões de celular) | Formatos brasileiros (+55, celular/fixo) |
| ID nacional | Padrões de SSN | Padrões de RUT (XX.XXX.XXX-X) | Padrões de CPF (XXX.XXX.XXX-XX) |
| Cartão de crédito | Validado por Luhn | Validado por Luhn | Validado por Luhn |
| Identificadores de saúde | MRN, DOB | Padrões de DNI | MRN, DOB |

A redação de PII é aplicada tanto na entrada quanto na saída, independentemente da configuração regional. Os
padrões de redação das três configurações regionais são testados na suíte de testes de unidade.

### Lacunas de paridade conhecidas

As seguintes lacunas de paridade são reconhecidas honestamente:

1. **Os cards de KB estão apenas em inglês**: Os cards de KB são escritos em inglês.
   Os usuários de es-419 e pt-BR interagem com o agente em seu idioma, mas o conteúdo da base de
   conhecimento subjacente está em inglês. Isso significa que o agente pode recuperar e citar um
   card em inglês enquanto responde em espanhol ou português. A qualidade da
   recuperação interlíngue depende da capacidade multilíngue do embedder.

2. **Os dados sintéticos têm viés de vocabulário em inglês dos EUA**: O corpus de eval, embora mantido sob
   limiares idênticos, foi gerado com um viés conhecido de vocabulário clínico em inglês dos EUA.
   O loop produtor-crítico corrige isso parcialmente, mas o viés residual é documentado
   no data statement em vez de ser declarado resolvido.

3. **Tamanhos assimétricos do corpus de eval**: O corpus de eval em inglês (100 casos) é quase
   o dobro do tamanho do corpus es-419 (59) ou pt-BR (59). Embora o harness de eval
   aplique os mesmos limiares, os tamanhos de amostra menores para es-419 e pt-BR significam
   que alguns modos de falha podem estar sub-representados nessas configurações regionais.

4. **Cobertura de idiomas do embedder**: O embedder padrão (`BAAI/bge-small-en-v1.5`) é
   focado em inglês. A recuperação interlíngue para es-419 e pt-BR depende da
   capacidade do embedder de corresponder consultas não inglesas a cards de KB em inglês. Um embedder
   multilíngue melhoraria a qualidade da recuperação.

5. **Cobertura de idiomas das vozes de TTS**: As vozes de TTS (Sarah para EN, Matilda para ES,
   Bella para PT-BR) fornecem síntese específica de idioma, mas a qualidade e a naturalidade
   podem variar entre as vozes.

## Estado atual

A implementação de referência mantém paridade de segurança nas três configurações regionais por meio dos
seguintes mecanismos:

- **Limiares de eval idênticos**: As três fatias de configuração regional são pontuadas sob os mesmos
  limiares em cada execução de CI. Uma regressão específica de configuração regional é uma falha de build.
- **Modelos de recusa cientes da configuração regional**: Todas as cinco categorias de recusa têm modelos em
  en, es-419 e pt-BR, seguindo a mesma estrutura e impostas pelas mesmas dimensões
  de eval.
- **Redação de PII ciente da configuração regional**: Os padrões de identificador para EUA, Chile e Brasil são
  detectados e redigidos na mesma etapa do pipeline.
- **Escalonamento ciente da configuração regional**: Os modelos de escalonamento de red-flag estão disponíveis nas três
  configurações regionais, cobrindo as sete categorias agudas.
- **Casos de eval em es-419 e pt-BR**: Slices dedicados do corpus de eval testam o
  comportamento específico de configuração regional a cada mudança.

O gate determinístico de eval comprova a paridade dos guardrails: a correção de recusa e a correção de
escalonamento são 1,000 nas três configurações regionais em cada execução. Isso significa que os guardrails de
segurança disparam de forma idêntica independentemente da configuração regional do usuário.

A avaliação honesta é que a paridade de segurança é alcançada na camada de guardrails (determinística,
testável, reprodutível), mas não totalmente na camada do modelo (probabilística, dependente da configuração regional)
nem na camada de conhecimento (KB em inglês, tamanhos assimétricos de corpus).

## Caminho até produção

Alcançar a paridade total de segurança multilíngue em um deployment em produção:

1. **Base de conhecimento localizada**: Cards de KB escritos no idioma de cada configuração regional por
   tradutores médicos qualificados, não traduzidos por máquina; revisão clínica para cada
   configuração regional a fim de garantir que a terminologia médica seja precisa e culturalmente apropriada

2. **Revisão de segurança em idioma nativo**: Avaliação de segurança conduzida por revisores
   de idioma nativo para cada configuração regional, não apenas executando o mesmo harness de eval contra
   casos de teste traduzidos; identificação de preocupações de segurança específicas da configuração regional (por exemplo,
   convenções de nomenclatura de medicamentos, números de serviços de emergência, crenças culturais de saúde)

3. **Tamanhos equilibrados do corpus de eval**: Tamanhos de corpus comparáveis entre as configurações regionais para garantir
   representação igual dos modos de falha; geração direcionada de casos adversariais
   específicos do idioma e do contexto cultural de cada configuração regional

4. **Embedder multilíngue**: Embedder com forte desempenho multilíngue para
   a recuperação interlíngue; avaliação da qualidade de recuperação por configuração regional

5. **Caminhos de escalonamento clínico específicos da configuração regional**: Orientação de serviços de emergência adaptada
   ao sistema de saúde de cada configuração regional (por exemplo, 911 para os EUA, 131 para o Chile, 192/SAMU para o
   Brasil); recursos de crise e linhas de apoio específicos da configuração regional

6. **Adaptação cultural além da tradução**: Comportamento do agente adaptado às normas
   culturais em torno das discussões de saúde (por exemplo, franqueza do aconselhamento médico, envolvimento
   da família nas decisões de saúde, atitudes em relação à medicação); não apenas
   texto traduzido, mas padrões de interação culturalmente apropriados

7. **Monitoramento contínuo por configuração regional**: Monitoramento de desempenho separado por configuração regional;
   alertas automatizados para regressões específicas de configuração regional; revisão regular dos dados de desempenho
   por configuração regional por analistas de idioma nativo

## Veja também

- [Data statement](../reference/data.md) -- card do conjunto de dados sintético com metodologia de configuração regional
- [Model card](../reference/model-card.md) -- CHAI Applied Model Card, seção Fairness
- [Política de consentimento de voz e deepfake](voice-consent-deepfake.md) -- política de consentimento de voz
- [Redação de PII](pii-redaction.md) -- redação de PII por configuração regional
- [Design de guardrails](../adr/adr-0005-guardrails.md) -- design de guardrails
