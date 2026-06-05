---
title: Modelo de ameaças OWASP LLM Top 10 e MITRE ATLAS
description: Um modelo de ameaças que mapeia o agente conversacional frente ao OWASP Top 10 para Aplicações de LLM e à matriz adversarial MITRE ATLAS.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Modelo de ameaças OWASP LLM Top 10 e MITRE ATLAS

Mapeia a implementação de referência `ai-agent-eval-harness-healthtech` frente ao
[OWASP Top 10 para Aplicações de LLM (2025)](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
e à matriz adversarial de ameaças [MITRE ATLAS](https://atlas.mitre.org/). Este
documento identifica quais ameaças são mitigadas por controles existentes, quais estão
parcialmente abordadas e quais exigem trabalho adicional para a implantação em produção.

Leia em conjunto com a [postura regulatória](../reference/regulatory-posture.md), o
[mapeamento do NIST AI RMF](nist-ai-rmf.md) e a [decisão de salvaguardas](../adr/adr-0005-guardrails.md).

## Escopo do modelo de ameaças

Este modelo de ameaças cobre a superfície do agente conversacional: a entrada do usuário chegando
pelo endpoint `POST /chat`, o processamento pelo pipeline LangGraph de seis nós e a
resposta retornada ao usuário. O modelo não cobre ameaças de nível de infraestrutura
(rede, host, contêiner) além de observar que a implementação de referência roda no
nível gratuito do Hugging Face Spaces e não é projetada para segurança de infraestrutura de produção.

## Mapeamento do OWASP Top 10 para Aplicações de LLM (2025)

### LLM01: Injeção de prompt

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | A entrada do usuário contém instruções projetadas para sobrepor o prompt do sistema ou manipular o comportamento do LLM |
| **Mitigações em vigor** | O classificador de escopo rejeita entradas fora de escopo antes do LLM; modelos de recusa para padrões de injeção conhecidos; o red-team noturno com Promptfoo submete 13 modelos de injeção do OWASP LLM Top 10 mais 19 casos adversariais elaborados manualmente |
| **Risco residual** | Técnicas inéditas de injeção de prompt não cobertas pelo classificador de escopo ou pelo banco de sementes adversariais podem contornar as salvaguardas determinísticas; o próprio LLM pode obedecer a jailbreaks bem elaborados após a camada de salvaguarda |
| **Controle** | Classificador de escopo, modelos de recusa e o banco de sementes adversariais |

### LLM02: Divulgação de informações sensíveis

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | O LLM revela prompts do sistema, detalhes internos de arquitetura ou PII do usuário em suas respostas |
| **Mitigações em vigor** | Redação de PII na entrada e na saída cobrindo e-mail, telefone (EUA/Chile/Brasil), RUT, CPF, DNI, SSN, cartão de crédito (Luhn), MRN, DOB; detecção de extração de prompt do sistema no classificador de escopo; invariante de privacidade: o texto da mensagem do usuário nunca entra em spans de OpenTelemetry (imposto por um teste automatizado); a varredura de segredos impede segredos no repositório |
| **Risco residual** | Os padrões de PII são baseados em regex e podem deixar passar formatos inéditos ou PII contextual; o LLM pode inferir PII a partir de contexto que não é PII |
| **Controle** | Etapa de redação de PII e classificador de escopo |

### LLM03: Vulnerabilidades da cadeia de suprimentos

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | Provedor de LLM comprometido, pesos de modelo envenenados ou dependência maliciosa |
| **Mitigações em vigor** | A abstração Protocol do cliente de LLM (veja a [decisão de abstração de fornecedor de LLM](../adr/adr-0002-llm-vendor-abstraction.md)) permite a troca de provedor sem alterações de código; o lockfile de dependências fixa todas as dependências; o monitoramento automatizado de dependências está habilitado; sem downloads de modelos em tempo de execução (modelos pré-treinados acessados via API) |
| **Risco residual** | Sem verificação da integridade do provedor de LLM; sem atestação de proveniência do modelo; a fixação de dependências evita drift, mas não evita um comprometimento inicial |
| **Controle** | A camada do cliente de LLM, o lockfile de dependências e o monitoramento automatizado de dependências |

### LLM04: Envenenamento de dados e de modelos

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | Dados de treinamento ou conteúdo da KB manipulados para produzir saídas prejudiciais |
| **Mitigações em vigor** | Dados 100% sintéticos com proveniência documentada (a declaração de dados); os cartões da KB carregam uma URL de origem e uma licença de origem; o arcabouço de avaliação detecta regressões comportamentais; alterações no corpus são submetidas a revisão |
| **Risco residual** | A geração de dados sintéticos usa saída de LLM (herdando vieses do modelo); sem detecção automatizada de drift do conteúdo da KB em relação ao material de origem |
| **Controle** | O corpus de dados sintéticos e o arcabouço de avaliação |

### LLM05: Tratamento inadequado de saídas

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | A saída do LLM é renderizada ou executada sem higienização (XSS, execução de código) |
| **Mitigações em vigor** | A renderização de SVG usa `createElementNS` e `textContent`, nunca `innerHTML`; a API retorna JSON estruturado; sem avaliação dinâmica de código sobre a saída do LLM; o schema de resposta do chat é fixo |
| **Risco residual** | Se consumidores a jusante renderizarem markdown da saída do LLM sem higienização, o XSS é possível; esta é uma preocupação do lado do consumidor |
| **Controle** | A camada de renderização do frontend e a camada da API |

### LLM06: Agência excessiva

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | O agente de LLM tem mais permissões ou capacidades do que o necessário |
| **Mitigações em vigor** | O classificador de escopo limita o agente a tópicos de adesão à medicação; os modelos de recusa bloqueiam dosagem, diagnóstico, alteração de prescrição, interpretação de exames; sem capacidades de uso de ferramentas (sem chamada de função, sem integrações de API, sem acesso ao sistema de arquivos); o agente não pode iniciar chamadas de rede de saída |
| **Risco residual** | A própria capacidade conversacional do agente é a "agência"; o risco é limitado pela superfície de recusa, mas não eliminado para tipos de solicitação inéditos |
| **Controle** | Classificador de escopo e modelos de recusa |

### LLM07: Vazamento do prompt do sistema

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | O usuário extrai o prompt do sistema por meio de prompts engenhosos |
| **Mitigações em vigor** | O classificador de escopo inclui padrões de detecção de extração do prompt do sistema; casos adversariais no corpus de avaliação testam a extração de prompt; o red-team noturno com Promptfoo inclui tentativas de extração |
| **Risco residual** | A detecção determinística de extração pode deixar passar técnicas inéditas; o conteúdo do prompt do sistema não é secreto (está no código-fonte), mas a exposição poderia auxiliar ataques direcionados |
| **Controle** | Classificador de escopo e o banco de sementes adversariais |

### LLM08: Fraquezas de vetores e embeddings

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | Embeddings envenenados, injeção indireta por meio do conteúdo da KB ou manipulação da recuperação |
| **Mitigações em vigor** | Os cartões da KB são 100% sintéticos e commitados (sem ingestão dinâmica); a recuperação retorna o texto de origem com imposição de citação; o arcabouço de avaliação verifica a exatidão da citação |
| **Risco residual** | A recuperação de quase acerto fora do corpus é uma lacuna conhecida (documentada no cartão do modelo); sem detecção de envenenamento de embeddings; o pequeno corpus de 36 cartões torna os limiares de similaridade pouco confiáveis |
| **Controle** | A camada de recuperação e o corpus da KB commitado |

### LLM09: Desinformação

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | O LLM gera informações de saúde plausíveis, porém incorretas |
| **Mitigações em vigor** | Imposição de citação: cada afirmação clínica deve citar um cartão da KB; recusa em caso de no-match na recuperação; o arcabouço de avaliação pontua fidelidade >= 0,85 e alucinação <= 0,10; aviso de demonstração em cada resposta |
| **Risco residual** | O modelo pode gerar informações incorretas que citam um cartão válido, mas deturpam seu conteúdo; o pontuador de alucinação captura a maioria, mas não todas as instâncias |
| **Controle** | A camada de salvaguarda e o arcabouço de avaliação |

### LLM10: Consumo ilimitado

| Propriedade | Valor |
|----------|-------|
| **Ameaça** | Esgotamento de recursos por meio de comprimento excessivo de entrada, prompts recursivos ou negação de serviço |
| **Mitigações em vigor** | Limites de comprimento de entrada no nó de admissão; portões de custo/latência no arcabouço de avaliação (4K tokens de entrada, 1K de saída, 8s por turno); limitação de taxa por sessão disponível (desativada por padrão para determinismo); o nível gratuito do Hugging Face Spaces tem limites de taxa embutidos |
| **Risco residual** | Sem detecção de prompts recursivos; sem disjuntor baseado em comprimento de entrada na camada HTTP |
| **Controle** | O grafo do agente e os portões de custo do arcabouço de avaliação |

## Mapeamento do MITRE ATLAS

A matriz MITRE ATLAS adapta o arcabouço MITRE ATT&CK para técnicas adversariais
específicas de IA. A tabela a seguir mapeia as técnicas do ATLAS relevantes para este sistema.

| Técnica do ATLAS | Aplicabilidade | Mitigação | Status |
|-----------------|--------------|------------|--------|
| **AML.T0000: Reconnaissance** | O atacante estuda o repositório de código aberto para entender a arquitetura | O repositório é público; os registros de decisões de arquitetura e a especificação são transparentes por concepção | Aceito -- a transparência é um recurso |
| **AML.T0002: Collect Public Data** | O atacante reúne cartões da KB, corpus de avaliação e prompt do sistema do repositório | Dados públicos; apenas sintéticos; sem conteúdo sensível | Aceito |
| **AML.T0010: ML Supply Chain Compromise** | Provedor de LLM ou dependência comprometida | O Protocol do cliente de LLM permite a troca de provedor; o lockfile de dependências fixa as dependências | Parcialmente mitigado |
| **AML.T0020: Poison Training Data** | Manipular os cartões da KB para injetar conteúdo adversarial | Dados 100% sintéticos; corpus submetido a revisão; metadados de proveniência | Mitigado |
| **AML.T0043: Craft Adversarial Data** | Criar entradas projetadas especificamente para contornar as salvaguardas | O corpus de avaliação inclui 19 casos adversariais; o red-team noturno com Promptfoo; o classificador de escopo rejeita padrões conhecidos | Parcialmente mitigado -- técnicas inéditas podem contornar |
| **AML.T0044: Full Memory Extraction** | Extrair o prompt do sistema por meio de conversa | O classificador de escopo inclui detecção de extração | Parcialmente mitigado |
| **AML.T0048: Prompt Injection** | Injetar instruções para sobrepor o comportamento do sistema | Classificador de escopo, modelos de recusa, salvaguardas pré-LLM | Parcialmente mitigado |
| **AML.T0051: LLM Jailbreak** | Contornar os controles de segurança para gerar conteúdo prejudicial | Arquitetura com salvaguardas antes do LLM; recusa para itens fora de escopo; escalonamento em sinais de alerta agudos | Parcialmente mitigado |
| **AML.T0054: Manipulate Content** | Influenciar a saída do LLM por meio da manipulação da KB | A KB são dados sintéticos commitados; sem ingestão dinâmica | Mitigado |
| **AML.T0058: Impact on Model Output** | Fazer o modelo produzir saídas incorretas ou prejudiciais | Imposição de citação; pontuação de fidelidade e alucinação; detecção de regressão do arcabouço de avaliação | Parcialmente mitigado |

## Estado atual

A implementação de referência mitiga os riscos mais críticos do OWASP LLM por meio de uma
abordagem de defesa em profundidade:

1. **Salvaguardas antes do LLM**: O classificador de escopo, a redação de PII, a detecção de
   escalonamento e os modelos de recusa rodam como nós determinísticos do grafo antes de o LLM ser
   invocado. Isso significa que as decisões mais críticas de segurança não dependem do comportamento
   do modelo.

2. **Testes adversariais contínuos**: O red-team noturno com Promptfoo, os 19 casos adversariais de
   avaliação e os 13 casos de red-team elaborados manualmente submetem o sistema a padrões de ataque
   conhecidos. Novos padrões descobertos pelas execuções de red-team são reincorporados ao
   banco de sementes adversariais.

3. **Arquitetura transparente**: Os registros de decisões de arquitetura, o cartão do modelo, a
   postura regulatória e o código-fonte público tornam visíveis o projeto e as limitações do
   sistema. A transparência reduz a assimetria entre atacante e defensor.

4. **Arcabouço de avaliação como portão de regressão**: Cada alteração é testada frente ao corpus
   completo de 218 casos. Uma regressão nas métricas de segurança, citação ou escalonamento reprova
   a build.

A avaliação honesta é de que essas mitigações são de nível de implementação de referência. Elas
demonstram o padrão de defesa em profundidade para aplicações de LLM; não fornecem
a mesma garantia que um programa de segurança de produção com recursos dedicados de red-team,
testes de penetração e avaliação formal de segurança.

## Caminho para produção

Uma implantação em produção precisaria fortalecer as mitigações em várias dimensões:

1. **Verificação da cadeia de suprimentos de modelos**: Atestação de proveniência do modelo,
   verificações de integridade do provedor, avaliações regulares de segurança do provedor,
   requisitos contratuais de segurança

2. **Filtragem de saída em escala**: Filtragem de saída em tempo real além dos atuais padrões de
   verificação de citação e de recusa; detecção de toxicidade; classificadores de segurança de
   conteúdo; escalonamento automatizado de saídas sinalizadas para revisão humana

3. **Testes adversariais avançados**: Recursos dedicados de red-team além da automação com Promptfoo;
   testes de penetração manuais; programa de recompensas; testes adversariais contínuos
   contra técnicas emergentes

4. **Segurança de embeddings**: Detecção de envenenamento de embeddings; verificação de integridade
   dos resultados de recuperação; ajuste de limiares de similaridade para corpora maiores

5. **Limitação de taxa e proteção de recursos**: Disjuntores baseados em comprimento de entrada;
   detecção de prompts recursivos; limitação de taxa de requisições; detecção de anomalias de custo;
   degradação graciosa sob carga

6. **Resposta a incidentes**: Manual formal de incidentes de segurança; classificação de severidade;
   procedimentos de notificação para usuários afetados; capacidade de análise forense; processo de
   revisão pós-incidente

7. **Monitoramento e alertas**: Detecção de anomalias em tempo real nas saídas do LLM; alertas
   automatizados sobre padrões de contorno de salvaguardas; painel para métricas relevantes de
   segurança

## Veja também

- [Postura regulatória](../reference/regulatory-posture.md) -- fronteira regulatória
- [Mapeamento do NIST AI RMF](nist-ai-rmf.md) -- mapeamento do NIST AI RMF
- [Classificação do Regulamento de IA da UE](eu-ai-act.md) -- classificação do Regulamento de IA da UE
- [Decisão de salvaguardas](../adr/adr-0005-guardrails.md) -- projeto de salvaguardas
- [Decisão de observabilidade](../adr/adr-0006-observability.md) -- projeto de observabilidade
- [Decisão de abstração de fornecedor de LLM](../adr/adr-0002-llm-vendor-abstraction.md) -- abstração de fornecedor de LLM
