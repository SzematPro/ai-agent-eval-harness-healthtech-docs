---
title: Postura regulatória
description: A linha regulatória que o design respeita, ancorada nas referências da FDA, da WHO, da MHRA e do EU AI Act, e por que isto não é um dispositivo médico.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Postura regulatória

> Este documento registra a linha regulatória que o design respeita. É
> a resposta explícita à pergunta "esta coisa é um dispositivo médico?"
> A resposta é não. O restante deste documento é o trabalho que foi
> preciso para poder dizer isso com seriedade.

## Escopo deste documento

Esta é uma implementação de referência pública. Não é um produto. Não é
comercializada, distribuída ou disponibilizada a profissionais de saúde ou
pacientes para uso clínico. O público são engenheiros e pares de IA que
leem o projeto como um artefato de referência. Mesmo com esse público, o
design honra os limites regulatórios que se aplicariam se o mesmo código
fosse algum dia levado à produção. A intenção é dupla: manter a referência
livre de qualquer alegação que a reclassificasse como dispositivo, e
demonstrar uma compreensão do limite boa o suficiente para construir
dentro dele.

O limite é ancorado em quatro documentos de referência, resumidos
abaixo.

## Documentos de referência

### FDA - Artificial Intelligence-Enabled Device Software Functions: Lifecycle Management and Marketing Submission Recommendations (Rascunho, janeiro de 2025)

Publicado em 7 de janeiro de 2025. O rascunho de guia descreve o conteúdo
da submissão de comercialização e as práticas de gestão de ciclo de vida
que a FDA espera para funções de software de dispositivo habilitadas por
IA, incluindo planos predeterminados de controle de mudanças para modelos
que aprendem ao longo do tempo. É a sequência operacional do guia final de
2024 sobre Planos Predeterminados de Controle de Mudanças. O documento não
decide por si só se uma peça de software é um dispositivo - essa questão é
decidida sob a seção 520(o) do FD&C Act e os guias relacionados de CDS /
general-wellness abaixo - mas estabelece as expectativas para qualquer
produto que cruze para o território de dispositivo.

Esta implementação de referência não é um dispositivo, então o conteúdo da
submissão de comercialização não é redigido. As expectativas de ciclo de
vida são, ainda assim, acompanhadas como disciplina de design: cartões de
modelo + dataset, versionamento conjunto de modelo + KB + prompts, um
arcabouço de avaliação que controla as mudanças, observabilidade que
registra traces relevantes para produção.

URL: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/artificial-intelligence-enabled-device-software-functions-lifecycle-management-and-marketing>

### FDA - Revised Clinical Decision Support Software guidance and revised General Wellness: Policy for Low Risk Devices (janeiro de 2026)

Publicado em 6 de janeiro de 2026. O guia revisado de CDS esclarece os
quatro critérios estatutários sob a seção 520(o)(1)(E) do FD&C Act que
isentam o software de CDS de ser regulado como dispositivo quando o
software se destina a um profissional de saúde, exibe a base de sua
recomendação de forma transparente e dá ao profissional um meio
independente de revisar essa base. O guia revisado de general-wellness
reafirma que software destinado a manter ou incentivar um estilo de vida
saudável, e não relacionado ao diagnóstico, cura, mitigação, prevenção ou
tratamento de uma doença ou condição, não é um dispositivo. As revisões de
2026 ampliaram a categoria de bem-estar para incluir o sensoriamento não
invasivo de parâmetros fisiológicos quando a saída se destina unicamente a
fins de bem-estar, e estreitaram o escopo de CDS em torno de ferramentas
de opção-única-de-tratamento-recomendado e de saídas de probabilidade de
risco.

O agente desta implementação de referência é voltado ao paciente, não ao
profissional de saúde. Isso o coloca firmemente fora da isenção de CDS
independentemente das revisões de 2026, porque a isenção de CDS está
condicionada a ser voltada-ao-profissional-com-revisão-independente. O
agente, portanto, deve evitar *qualquer* função que o qualificaria como
dispositivo sob a 520(o) no caminho voltado ao paciente: sem diagnóstico,
sem recomendação de tratamento, sem alteração de prescrição, sem
interpretação de exames/imagens. O agente permanece do lado de
general-wellness da linha - apoio à adesão, incentivo a hábitos de vida,
reflexão no estilo MI - e recusa qualquer coisa que cruzaria a linha. Os
modelos de recusa e o classificador de escopo impõem isso; o arcabouço de
avaliação mede a conformidade.

CDS URL: <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/clinical-decision-support-software>

### WHO - Ethics and governance of artificial intelligence for health: Guidance on large multi-modal models (janeiro de 2024)

Publicado em 18 de janeiro de 2024. O guia da WHO é um arcabouço de
quarenta recomendações dirigido a governos, fornecedores de tecnologia e
sistemas de saúde. Os temas centrais que o design honra: transparência
sobre a procedência do modelo e dos dados de treinamento,
responsabilização pelas saídas, prevenção de viés, proteção da autonomia
do paciente e supervisão humana em decisões de alto risco. Recomendações
específicas da WHO operacionalizadas aqui: cartões de modelo e dataset
(transparência), citação-na-afirmação (responsabilização), paridade de
locale nas avaliações (prevenção de viés), padrões de recusa e escalonamento
(proteção da autonomia e supervisão humana).

URL: <https://www.who.int/publications/i/item/9789240084759>

### MHRA - AI Airlock pilot and Good Machine Learning Practice

O piloto AI Airlock da MHRA ocorreu no ano fiscal de 2024-2025 como um
sandbox regulatório para software-como-dispositivo-médico com componentes
de IA generativa ou aprendizado de máquina. Cinco candidatos de sandbox
concluíram o piloto completo; um relatório do programa de sandbox foi
publicado em outubro de 2025. GMLP - Good Machine Learning Practice - é uma
publicação conjunta de dez princípios da MHRA, da FDA e da Health Canada
que enquadra como dispositivos médicos habilitados por ML devem ser
desenvolvidos, implantados e monitorados. O roteiro de 2025 da MHRA se
compromete com a publicação de um guia alinhado ao GMLP. O design acompanha
os dez princípios do GMLP como disciplina de design: expertise
multidisciplinar, prática sólida de engenharia, dados clinicamente
relevantes, independência entre treino e teste, foco no desempenho da
equipe humano-IA, testes com dados representativos, transparência para os
usuários, monitoramento do modelo implantado, retreinamento periódico e
comunidade de usuários informada.

URLs:
- Programa AI Airlock: <https://www.gov.uk/government/news/ai-airlock-cersis-and-a-new-global-ai-network-for-health-regulators>
- Relatório do piloto AI Airlock: <https://assets.publishing.service.gov.uk/media/68ee1fb88427701993d5e02c/AI_Airlock_Sandbox_Programme_Report_Final.pdf>
- Princípios orientadores do GMLP (espelho da FDA): <https://www.fda.gov/medical-devices/software-medical-device-samd/good-machine-learning-practice-medical-device-development-guiding-principles>

### EU AI Act - Regulation (EU) 2024/1689 (em vigor desde agosto de 2024, obrigações de alto risco aplicáveis em agosto de 2026)

Publicado em 13 de junho de 2024, entrou em vigor em 1 de agosto de 2024,
com os artigos de práticas proibidas aplicáveis a partir de 2 de fevereiro
de 2025 e o grosso das obrigações de sistemas de alto risco aplicáveis a
partir de 2 de agosto de 2026. O Act classifica os sistemas de IA por
nível de risco. O Anexo III enumera os casos de uso de alto risco que
acionam as obrigações de avaliação de conformidade, gestão de risco,
governança de dados, documentação técnica, monitoramento pós-mercado e
supervisão humana do Capítulo III Seção 2. Três categorias do Anexo III
são adjacentes ao espaço de design desta implementação de referência e
merecem ser nomeadas explicitamente:

- Anexo III ponto 5(a) - sistemas de IA destinados a serem usados por
  autoridades públicas para avaliar a elegibilidade de pessoas físicas a
  serviços e benefícios públicos essenciais.
- Anexo III ponto 5(c) - sistemas de IA destinados a serem usados para
  avaliar a capacidade de crédito de pessoas físicas ou estabelecer sua
  pontuação de crédito.
- Anexo III ponto 6(d) - sistemas de IA destinados a serem usados para
  despachar, ou para estabelecer prioridade no despacho de, equipes de
  primeira resposta de serviços de emergência, inclusive por triagem.

Um coach de bem-estar para adesão à medicação voltado ao paciente não é,
em si, um sistema de alto risco do Anexo III. O agente não faz triagem de
chamadas de emergência, não aloca benefícios públicos, não pontua
capacidade de crédito. O ramo de "Escalonamento por sinais de alerta" do
agente reconhece dez padrões agudos (ideação suicida, anafilaxia, dor
torácica cardíaca aguda, sangramento grave, asma grave, AVC / sinais FAST,
emergência hipertensiva, hipoglicemia grave, overdose / intenção letal
e coocorrência gravidez + teratógeno) e exibe orientação local de serviços de
emergência sem atuar como ferramenta de triagem em si. A lógica de
escalonamento é deliberadamente determinística e baseada em regras, de modo
que o operador humano, não o modelo, detenha a decisão de roteamento.

Onde o EU AI Act é mais relevante para esta implementação de referência
não é na classificação por nível de risco do próprio agente, mas na postura
de *governança de modelo* que o arcabouço codifica. O Artigo 9 (sistema de
gestão de risco), o Artigo 10 (dados e governança de dados), o Artigo 11 +
Anexo IV (documentação técnica), o Artigo 12 (manutenção de registros), o
Artigo 13 (transparência), o Artigo 14 (supervisão humana), o Artigo 15
(precisão / robustez / cibersegurança) e o Artigo 17 (sistema de gestão de
qualidade) são a superfície procedimental que um implantador de alto risco
do Anexo III precisa satisfazer. O arcabouço entregue aqui se situa nessa
camada procedimental: contratos de avaliação com limiares de aceitação
explícitos, cartões de dados que nomeiam cada fonte, gates de custo e
citação que bloqueiam o PR, spans rastreados via OpenInference para cada
turno, modelos de recusa com justificativa legível por humanos e o roteador
determinístico de escalonamento do orquestrador. Adotar esses padrões em um
sistema do Anexo III dentro de uma organização regulada acelera o pacote de
evidências dos Artigos 9 + 10 + 12 + 14; não satisfaz esses artigos por si
só.

Para um operador a jusante cujo próprio sistema de IA *seja* de alto risco
do Anexo III (por exemplo, um assistente de elegibilidade do setor público
ou um chatbot de pontuação de crédito), o padrão do arcabouço se transfere
de três formas concretas: (i) o contrato de avaliação dá ao sistema de
gestão de risco do Artigo 9 um artefato testável; (ii) o contrato de
citação-obrigatória + recusa-quando-não-há-correspondência estreita a
superfície onde a precisão / robustez do Artigo 15 pode falhar
silenciosamente; (iii) o trace OpenTelemetry por span dá à manutenção de
registros do Artigo 12 uma espinha dorsal agnóstica de formato de fio e
portável entre fornecedores.

URLs:
- Texto oficial do Regulation (EU) 2024/1689: <https://eur-lex.europa.eu/eli/reg/2024/1689/oj>
- Lista consolidada do Anexo III: <https://artificialintelligenceact.eu/annex/3/>
- European AI Office: <https://digital-strategy.ec.europa.eu/en/policies/ai-office>

## O limite bem-estar / CDS que o design respeita

O design traça uma linha rígida: o agente é uma ferramenta de apoio ao
bem-estar que aborda o comportamento de adesão à medicação, não uma
ferramenta de decisão clínica. Concretamente:

- O usuário é um paciente, não um profissional de saúde. A isenção de CDS é
  voltada ao profissional; o caminho de bem-estar é voltado ao paciente. O
  agente permanece voltado ao paciente por esse motivo.
- O agente aborda o lado *comportamental* da adesão (motivação, rotina,
  lembretes, reflexão no estilo MI sobre as barreiras) e nunca o lado
  *clínico* (se o regime está correto, se deve ser alterado, o que os
  exames significam).
- O agente nunca substitui uma interação com um profissional de saúde. Ele
  sempre carrega o aviso de que questões clínicas devem ir ao profissional
  de saúde do usuário, e escala sinais de alerta agudos explícitos - as sete
  categorias determinísticas (ideação suicida, anafilaxia, dor torácica
  cardíaca aguda, sangramento grave, asma grave, AVC / sinais FAST,
  emergência hipertensiva) - exibindo orientação de serviços de emergência e
  encerrando a interação no aplicativo. O padrão gravidez + teratógeno é
  tratado pela camada do LLM e do prompt de sistema, não pelo roteador
  determinístico (ele precisa de um léxico de nomes de medicamentos que uma
  lista de regex não consegue carregar); veja
  [ADR-0005](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0005-guardrails/).

## O que o agente NÃO faz

Esta lista é a declaração canônica do comportamento fora de escopo. Ela é
imposta pelo classificador de escopo, pelos modelos de recusa e pelo
arcabouço de avaliação.

1. **Sem diagnóstico.** O agente nunca nomeia, infere ou inclui/exclui uma
   condição médica. Se o usuário descreve sintomas, o agente acolhe,
   incentiva o contato com um profissional de saúde e (se os sintomas
   correspondem a uma regra de escalonamento) exibe orientação de serviços
   de emergência.
2. **Sem orientação de dosagem.** O agente nunca diz ao usuário para tomar
   mais, tomar menos, dobrar a dose após um esquecimento, dividir uma dose,
   pular uma dose ou alterar um cronograma de dosagem. Perguntas de dosagem
   são recusadas e redirecionadas ao profissional prescritor ou ao
   farmacêutico.
3. **Sem alteração de prescrição.** O agente nunca aconselha iniciar,
   parar, trocar, substituir ou pausar uma medicação. O modelo de recusa
   nomeia o profissional prescritor como o contato correto.
4. **Sem interpretação de exames, imagens ou leituras de dispositivos.** O
   agente nunca lê valores numéricos de volta como interpretação clínica
   ("seu A1c de 7,4 significa …"). Ele reconhece que o usuário tem os dados,
   incentiva a revisão por um profissional e se desengaja da interpretação.
5. **Sem interação voltada ao profissional de saúde.** A superfície do
   agente é o paciente. Ele não produz resumos voltados ao profissional,
   notas clínicas estruturadas ou qualquer artefato direcionado ao fluxo de
   trabalho de um profissional. (Ferramentas voltadas ao profissional
   estariam sujeitas ao teste da isenção de CDS e mudariam inteiramente a
   postura regulatória.)
6. **Sem substituição de serviços de emergência.** A qualquer gatilho de
   escalonamento, o agente exibe o número de emergência relevante e se
   desengaja. Não é uma ferramenta de triagem.
7. **Sem alegação de validação clínica.** Nenhuma linguagem em qualquer
   resposta do agente ou em qualquer artefato do projeto alegará que o
   sistema foi clinicamente validado, testado em ensaio ou endossado por um
   órgão regulador.

## Avisos exigidos em toda resposta da demonstração

Toda resposta que o agente emite na demonstração ao vivo carrega dois
artefatos:

- Um banner persistente na interface do Spaces: "Implementação de
  referência. Dados 100% sintéticos. Não é um dispositivo médico. Apenas
  para demonstração. Fale com seu profissional de saúde para obter
  aconselhamento médico. Em uma emergência, ligue para os serviços de
  emergência locais."
- Um rodapé inline em cada turno do assistente, exibido por meio do modelo
  de resposta: "Esta é uma demonstração. Não é aconselhamento médico."

O arcabouço de avaliação verifica o rodapé inline em cada turno e trata sua
ausência como uma regressão de segurança.

## Controle de mudanças da postura regulatória

Uma mudança neste documento - ampliar o escopo do comportamento permitido
do agente, estreitar a lista de recusas, remover um aviso, alterar os
critérios de escalonamento - exige um Architecture Decision Record na área
de salvaguardas. O ADR é o lugar para registrar a justificativa, o novo
limite e as mudanças no arcabouço de avaliação que o impõem. As notas de
versão dessa mudança a registram na seção de segurança, porque a postura
regulatória é uma propriedade do sistema relevante para a segurança.

## Veja também

- [decisão de salvaguardas](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0005-guardrails/) - design das salvaguardas.
- [dados](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/data/) - política de dados exclusivamente sintéticos e a
  lista completa de exclusões.
- [política de segurança](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/security/) - política de divulgação.
