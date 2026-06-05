---
title: Política de consentimento de voz e deepfake
description: Framework de consentimento para a integração de voz, conscientização sobre riscos de deepfake e a política de tratamento de dados de áudio da implementação de referência pública.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# Política de consentimento de voz e deepfake

> Documenta o framework de consentimento para a integração de voz da
> implementação de referência `ai-agent-eval-harness-healthtech`, incluindo mecanismos de
> consentimento, conscientização sobre riscos de deepfake e a política de tratamento de dados de voz.
>
> Leia em conjunto com a [postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) e o
> [registro de decisão da extensão de voz](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0014-voice-extension/).

## Visão geral da integração de voz

A implementação de referência inclui capacidades opcionais de voz por meio da integração TTS/STT
do ElevenLabs: text-to-speech para as respostas do agente e speech-to-text para a entrada do usuário.
A voz é um recurso opt-in, DESLIGADO por padrão, com um toggle persistido no navegador.
Os metadados de voz são transportados em eventos sidecar de streaming, e não no schema
de resposta do chat, preservando o contrato de resposta estável e a imutabilidade do schema.

## Framework de consentimento

### Mecanismos de consentimento atuais

| Mecanismo | Implementação | Localização |
|-----------|---------------|----------|
| **Toggle de voz** | Opt-in via toggle na interface; padrão DESLIGADO; persistido no navegador | SPA do frontend |
| **Detecção de recursos** | Verificação de capacidade do navegador (`navigator.mediaDevices`, `MediaRecorder`); desativação graciosa se não houver suporte | Módulo de detecção de recursos do frontend |
| **Modal de divulgação** | Modal de divulgação pré-permissão que explica: quais dados são capturados, como são processados e que o áudio NÃO é retido | Componente de modal do frontend |
| **Aviso "Áudio NÃO retido"** | Exibido em vários locais: modal de divulgação, painel de configurações de voz, indicador de ativação do microfone e seção de ajuda/FAQ | Interface do frontend |
| **Limite de duração da gravação** | Duração máxima de gravação de 30 segundos por turno | Imposição no frontend |
| **Visibilidade do microfone** | Indicador visual quando o microfone está ativo; segue os indicadores de permissão do navegador | Overlay da interface do frontend |

### Fluxo de consentimento

1. O usuário abre as configurações de voz ou clica no microfone pela primeira vez
2. O modal de divulgação aparece explicando: a entrada de voz é convertida em texto via STT,
   processada pelo agente, e o áudio NÃO é armazenado nem transmitido além do
   serviço de STT
3. O usuário reconhece a divulgação
4. Solicitação de permissão do navegador para acesso ao microfone (interface nativa do navegador)
5. Se concedida: o toggle de voz é ativado e o indicador do microfone é exibido durante a gravação
6. Se negada: fallback gracioso para entrada somente por texto

### O que os dados de voz NÃO são

- Os dados de voz NÃO são armazenados de forma persistente
- Os dados de voz NÃO são usados para treinamento de modelos
- Os dados de voz NÃO são compartilhados com terceiros além do serviço de STT
- Dados biométricos de voz NÃO são coletados nem analisados
- As gravações de voz NÃO são retidas após o processamento por STT

## Conscientização sobre riscos de deepfake

### Avaliação de ameaças

Sistemas de IA habilitados para voz carregam riscos inerentes de deepfake que devem ser reconhecidos
e mitigados:

| Risco | Avaliação | Mitigação |
|------|-----------|------------|
| **Clonagem de voz a partir da entrada do usuário** | O áudio do usuário é processado por STT (speech-to-text) e não é usado para síntese de voz; nenhum modelo de voz é treinado com o áudio do usuário | Processamento somente por STT; nenhum pipeline de treinamento de modelo de voz; áudio não retido após o STT |
| **Personificação por voz sintética** | O TTS gera as respostas do agente usando vozes do ElevenLabs (Sarah/EN, Matilda/ES, Bella/PT-BR); são modelos de voz licenciados, não clones de pessoas reais | Apenas vozes de TTS licenciadas; nenhum treinamento de voz personalizado; nenhuma capacidade de clonagem da voz do usuário |
| **Uso indevido da saída de voz do agente** | A saída de TTS do agente poderia ser gravada por usuários e apresentada falsamente como a voz de uma pessoa real | Aviso de demo em cada resposta ("Esta é uma demonstração. Não é aconselhamento médico."); a voz do TTS é claramente sintética |
| **Geração de deepfake a partir de conteúdo de saúde** | As saídas de um agente de saúde habilitado para voz poderiam ser usadas para gerar aconselhamento médico falso e convincente | Os guardrails impedem aconselhamento clínico (dosagem, diagnóstico, alteração de prescrição); imposição de citações; recusa quando fora de escopo |

### Medidas antideepfake

1. **Nenhuma capacidade de clonagem de voz**: O sistema fornece saída de TTS usando vozes
   licenciadas do ElevenLabs. Ele não treina, ajusta nem clona nenhuma voz. Nenhum áudio do
   usuário é armazenado ou usado para síntese.

2. **Voz sintética transparente**: A saída de TTS é claramente sintética. O modal de divulgação
   informa aos usuários que as respostas do agente são geradas por IA e faladas por uma
   voz sintética.

3. **Os guardrails se aplicam igualmente à voz**: O mesmo classificador de escopo, os mesmos modelos de recusa
   e o mesmo roteador de escalonamento que governam as interações por texto se aplicam à voz. Uma solicitação por voz
   de aconselhamento de dosagem é recusada exatamente como seria uma solicitação por texto.

4. **Nenhuma persistência de áudio**: A entrada de áudio é processada por STT e descartada. A saída de áudio
   é gerada por resposta e não é armazenada. Nenhum arquivo de áudio é gravado em disco
   nem persistido em qualquer sistema de armazenamento.

## Estado atual

A integração de voz é opt-in e DESLIGADA por padrão. O framework de consentimento descrito
acima está implementado; as decisões de design que governam a voz estão registradas no registro de
decisão da extensão de voz.

Restrições de design principais que protegem os usuários:

- **A voz é opt-in**: O toggle assume o valor DESLIGADO por padrão; os usuários devem habilitar a voz explicitamente
- **Detecção de recursos com desativação graciosa**: Se o navegador não suportar
  `navigator.mediaDevices` ou `MediaRecorder`, os controles de voz são ocultados; a interface
  de texto funciona sem degradação
- **Divulgação antes da permissão**: O modal de divulgação aparece antes da solicitação de permissão
  de microfone do navegador, dando aos usuários informações antes de tomarem uma decisão
- **Áudio NÃO retido**: Esse compromisso é declarado em vários locais e é imposto pela
  arquitetura: nenhum arquivo de áudio é gravado em qualquer armazenamento em nenhum ponto do pipeline
- **Limite de gravação de 30 segundos**: Impede gravação indefinida; imposto no lado do cliente
- **Mesmos guardrails que o texto**: A entrada de voz é transcrita em texto e processada por meio do
  mesmo pipeline do LangGraph com seis nós e guardrails idênticos

O framework de consentimento segue o princípio de que o consentimento deve ser informado, específico
e dado livremente. O modal de divulgação pré-permissão garante que os usuários entendam o que
acontece com seus dados de voz antes de concederem acesso ao microfone.

## Caminho até produção

Um deployment em produção com voz precisaria reforçar o framework de consentimento e
deepfake:

1. **Fluxo explícito de consentimento de voz**: Captura formal de consentimento com timestamp e texto de
   consentimento versionado; mecanismo de retirada de consentimento; trilha de auditoria do consentimento para
   conformidade regulatória
2. **Capacidade de detecção de deepfake**: Se o sistema processar entrada de voz em um contexto
   em que a personificação seja um risco, integrar autenticação de voz ou detecção de deepfake
   para verificar que o falante não está usando áudio sintetizado
3. **Política de biometria de voz**: Se a biometria de voz vier a ser coletada (não planejado),
   consentimento expresso sob as leis de privacidade biométrica aplicáveis (por exemplo, BIPA de Illinois,
   GDPR Art. 9); políticas de retenção e destruição de dados biométricos
4. **Procedimentos de retenção e exclusão de áudio**: Se algum áudio for retido para garantia
   de qualidade ou depuração, definir períodos de retenção, procedimentos de exclusão e controles de
   acesso; oferecer aos usuários a capacidade de solicitar a exclusão
5. **Consentimento entre jurisdições**: Os requisitos de consentimento de voz variam por jurisdição;
   um deployment em produção precisaria de fluxos de consentimento cientes da jurisdição (por exemplo, o GDPR
   exige consentimento expresso; algumas jurisdições exigem aviso de gravação)
6. **Acessibilidade**: Garantir que a interação por voz seja acessível a usuários com deficiências
   de fala; fornecer fallback de texto a todo momento; não tornar a voz o único método de entrada
   para nenhuma função crítica
7. **Dados de voz de crianças**: Se o sistema puder ser usado por menores, proteções
   adicionais sob a COPPA (EUA), o GDPR Art. 8 (UE) e a Ley 19.628 (Chile) para
   dados de crianças

## Veja também

- [Postura regulatória](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/regulatory-posture/) -- fronteira regulatória
- [Model card](/ai-agent-eval-harness-healthtech-docs/pt-br/reference/model-card/) -- CHAI Applied Model Card
- [Paridade de segurança multilíngue](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/multilingual-safety-parity/) -- segurança multilíngue
- [Avaliação de prontidão para HIPAA](/ai-agent-eval-harness-healthtech-docs/pt-br/governance/hipaa-readiness/) -- prontidão para HIPAA
- [Design da extensão de voz](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0014-voice-extension/) -- design da extensão de voz
