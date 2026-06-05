---
title: "ADR-0006: Stack de observabilidade"
description: Por que os traces usam OpenTelemetry + OpenInference com Langfuse para a demo ao vivo e Phoenix para execuções de avaliação.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0006: Observabilidade (OpenTelemetry + OpenInference, Langfuse para a demo ao vivo, Phoenix para execuções de avaliação)

- Status: Accepted
- Data: 2026-03-18
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

O agente tem dois modos operacionais com necessidades diferentes de
observabilidade. Na **demo ao vivo** no Hugging Face Spaces, um leitor chega
em uma URL pública, clica por aí e visita um dashboard que mostra
o trace de sua conversa: qual nó do LangGraph disparou, como
ficou a chamada ao LLM, o que o RAG recuperou, onde o tempo foi gasto.
Isso pede um backend hospedado, de baixo atrito e com um nível gratuito
generoso.

Nas **execuções de avaliação**, o objetivo é diferente: milhares de turnos
automatizados produzem traces que o harness inspeciona, persiste e anexa
a relatórios de PR. Nenhum humano está no circuito; cotas importam, os dados
devem permanecer locais, e o pipeline tem que rodar offline se necessário. Isso
pede um backend auto-hospedado sem teto de cota.

Como distribuímos ambos os modos a partir de um único formato de transmissão,
mantendo o custo de regime permanente em $0/mês e evitando lock-in a qualquer
fornecedor único de observabilidade?

## Direcionadores da Decisão

- Um formato de transmissão entre os modos; o agente emite traces uma vez, os
  sinks os recebem uma vez
- OpenTelemetry como o transporte porque é o padrão da indústria
  e é suportado por todo backend do conjunto
- OpenInference (convenções semânticas da Arize para GenAI) como o
  esquema de atributos porque ele captura atributos específicos de LLM
  (prompts, completions, chamadas de ferramentas, contextos de recuperação) que
  o OTel simples não captura
- Nível gratuito grande o suficiente para uma demo + URL pública com
  tráfego realista (~50K observações / mês)
- Backend em tempo de avaliação que escala para milhares de traces por execução
  sem preocupações de cota
- Licenciamento permissivo em todo componente

## Opções Consideradas

- **OpenTelemetry + OpenInference; Langfuse Cloud Hobby para a demo
  ao vivo, Phoenix auto-hospedado em Docker para execuções de avaliação,
  Pydantic Logfire documentado como alternativa** (escolhida)
- **Somente Phoenix**, usado para ambos os modos (auto-hospedado em todo lugar)
- **Somente Langfuse**, usado para ambos os modos (ao vivo + avaliação)
- **Pydantic Logfire** como o único sink para ambos os modos
- **Um único fornecedor hospedado** (Helicone, Lunary, etc.) para ambos os
  modos

## Resultado da Decisão

Opção escolhida: emitir spans OTel anotados com convenções semânticas
OpenInference e roteá-los para dois sinks dependendo do
modo.

- **Demo ao vivo**: Langfuse Cloud Hobby. O nível gratuito fornece 50K
  observações por mês, retenção de 30 dias e uma UI hospedada que
  qualquer leitor pode abrir por um link de dashboard público, sem cadastro
  necessário para ver um trace compartilhado. Esta é a menor peça de
  infraestrutura que mostra um trace de conversa real com LLM,
  recuperação e spans em nível de nó.
- **Tempo de avaliação**: Phoenix (Arize OSS) auto-hospedado em um perfil
  Docker compose. O harness sobe o Phoenix junto com o
  runner de avaliação Python, envia spans para ele e anexa as
  URLs de trace do Phoenix ao relatório de avaliação em Markdown. A licença ELv2 é
  aceitável para uso auto-hospedado, de organização única. Nenhuma chamada de rede
  externa, nenhuma cota.
- **Alternativa documentada**: Pydantic Logfire (10M spans/mês
  gratuitos, vigente a partir de 2026-01-01). O Logfire é referenciado na
  referência de observabilidade como um substituto direto do Langfuse para
  qualquer contribuidor que o prefira; o formato de transmissão OpenInference
  garante que a troca seja configuração, não código.

O esquema de atributos OpenInference vive no limite agente / nó;
o SDK do OTel é configurado com dois exporters que podem ser
habilitados de forma independente por variáveis de ambiente.

### Confirmação

- Um teste unitário verifica que todo nó do LangGraph emite um span OTel
  anotado com atributos OpenInference (o teste inspeciona
  um coletor de spans em memória)
- O caminho de lançamento da demo sobe a API ao vivo com o exporter
  do Langfuse habilitado quando uma chave pública do Langfuse está definida;
  caso contrário o exporter é um no-op
- O caminho de lançamento de observabilidade sobe o perfil compose do Phoenix;
  a avaliação exporta spans para ele quando um endpoint OTLP do Phoenix está
  definido, e roda com o exporter em memória no-op caso contrário
- Uma chave documentada na referência de observabilidade descreve como
  rotear para o Pydantic Logfire em vez disso

## Consequências

### Positivas

- Um formato de transmissão, um modelo mental: o agente emite traces uma vez,
  os exporters os roteiam
- A demo ao vivo ganha um dashboard hospedado a $0 sem um cartão de
  crédito via Langfuse Hobby (50K observações / mês, retenção de
  30 dias)
- As execuções de avaliação são livres de cota e capazes de rodar offline porque
  o Phoenix é auto-hospedado em um perfil Docker
- Os atributos OpenInference carregam a semântica de GenAI (prompts,
  completions, chamadas de ferramentas, contextos de recuperação) que qualquer
  backend de observabilidade de LLM consegue renderizar
- Uma troca futura de qualquer sink é uma mudança de configuração porque
  o OpenInference é o esquema, não um formato específico de fornecedor
- O projeto sinaliza familiaridade com três grandes
  opções de observabilidade de GenAI (Langfuse, Phoenix, Logfire)

### Negativas

- Dois backends significam dois lugares para procurar dados de trace; a
  referência de observabilidade documenta qual modo usa qual
- O Langfuse Hobby tem um teto rígido de 50K observações / mês sem
  cobrança por excedente; o tráfego de pico além do teto é descartado,
  o que preserva a garantia de $0/mês
- A licença ELv2 do Phoenix é permissiva para nosso uso mas não é
  Apache 2.0 / MIT; sinalizado nas notas de dependência

### Neutras

- O SDK do OTel e a instrumentação OpenInference se tornam parte
  da superfície de dependência de produção
- Uma nova variável de ambiente controla qual exporter é habilitado em
  tempo de execução
- O relatório de avaliação em Markdown inclui links de trace do Phoenix apenas
  quando o perfil compose do Phoenix está no ar

## Prós e Contras das Opções

### OTel + OpenInference; Langfuse Hobby (ao vivo) + Phoenix auto-hospedado (avaliação) + Logfire documentado

- Boa, porque divide responsabilidades ao longo do eixo real
  de diferença: dashboard hospedado para a demo, auto-hospedado livre
  de cota para as avaliações
- Boa, porque os atributos OpenInference carregam a semântica de GenAI
  que todo backend entende
- Boa, porque a alternativa documentada do Logfire mostra
  consciência do espaço mais amplo sem um terceiro sink ativo
- Ruim, porque o contribuidor tem que saber qual sink hospeda quais
  traces
- Ruim, porque a licença ELv2 do Phoenix exige reconhecimento

### Somente Phoenix (ao vivo + avaliação)

- Boa, porque um backend em todo lugar
- Ruim, porque a demo ao vivo precisaria de uma instância Phoenix
  hospedada, o que contradiz a postura de $0/mês; auto-hospedar
  em um Hugging Face Space adiciona pressão de memória e uma UI pública
  menos polida que a do Langfuse

### Somente Langfuse (ao vivo + avaliação)

- Boa, porque uma UI hospedada em todo lugar
- Ruim, porque as execuções de avaliação em volume total queimariam o
  teto de 50K observações rapidamente sem cobrança por excedente, e os dados
  de avaliação não deveriam ter que deixar a rede local

### Pydantic Logfire como único sink

- Boa, porque 10M spans/mês gratuitos é o maior nível gratuito
- Ruim, porque o Logfire é o entrante mais novo (vigente a partir de
  2026-01-01); a cobertura de OpenInference e a leitura
  multi-fornecedor são mais fortes com Langfuse + Phoenix
- Mantido como alternativa documentada na referência de observabilidade

### Único fornecedor hospedado (Helicone, Lunary, etc.)

- Boa, porque a superfície de integração é pequena
- Ruim, porque o projeto atrelaria sua história de observabilidade a um
  fornecedor; o sinal demonstrativo é mais fraco e o requisito livre de cota
  do lado da avaliação é mais difícil de satisfazer

## Mais Informações

- OpenTelemetry: <https://opentelemetry.io/>
- Convenções semânticas OpenInference (Arize):
  <https://github.com/Arize-ai/openinference>
- Preços do Langfuse Cloud Hobby:
  <https://langfuse.com/pricing>
- Documentação do Langfuse: <https://langfuse.com/docs>
- Documentação do Phoenix (Arize) auto-hospedado:
  <https://docs.arize.com/phoenix/deployment>
- Phoenix no GitHub (licença ELv2):
  <https://github.com/Arize-ai/phoenix>
- Pydantic Logfire: <https://pydantic.dev/logfire>
- Preços do Pydantic Logfire:
  <https://pydantic.dev/logfire/pricing>
- MADR 4.0.0: <https://adr.github.io/madr/>
