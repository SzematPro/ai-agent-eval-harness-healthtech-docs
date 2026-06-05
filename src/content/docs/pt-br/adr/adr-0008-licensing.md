---
title: "ADR-0008: Licença de código"
description: Por que a licença de código mudou de MIT para Apache 2.0 na v1.0.0 pela concessão explícita de patentes, NOTICE e cláusula de marca registrada.
---

:::caution[Documentação de referência: não é um dispositivo médico]
Esta documentação descreve uma implementação de referência pública avaliada com dados 100% sintéticos. É uma referência de capacidades e prontidão, não uma certificação de conformidade nem aconselhamento jurídico, e não é um dispositivo médico. Não é clinicamente validada e não manipula PHI de produção.
:::

# ADR-0008: Licença de código - Apache 2.0

- Status: Accepted
- Data: 2026-05-13
- Responsáveis pela decisão: Waldemar Szemat

## Contexto e Definição do Problema

O projeto foi distribuído na `v0.1.0` (2026-03-24) sob a
Licença MIT, declarada no arquivo de licença, nos metadados do pacote, no
card do Hugging Face Spaces, no badge e no rodapé do README, e na
postura de licença do projeto. A escolha inicial foi MIT porque é o
caminho mais curto para "código aberto permissivo" com a menor pegada
cognitiva; as alternativas não foram ponderadas por escrito naquele ponto.

Na v1.0.0 o projeto passa de um scaffold a uma implementação de referência
de carro-chefe. Duas mudanças fazem a postura de licença valer a pena ser
reabordada: (a) o cenário de patentes de IA em 2026 é materialmente mais
agressivo do que era quando o MIT se tornou o padrão para repositórios de código
permissivo, e a ausência de uma concessão explícita de patentes no MIT é
o risco prático mais citado para um adotante posterior que puxa um
repositório para um produto comercial; (b) o projeto não deveria
inviabilizar o valor de opção de relicenciar um fork posterior (por exemplo,
Business Source License 1.1 ou Elastic License 2.0) se isso algum dia
se tornar relevante, e a licença base deveria manter esse caminho aberto.

Como escolhemos uma licença de código para a v1.0.0 que sinalize "permissiva,
amigável à adoção, com credibilidade empresarial" para os mesmos leitores para
os quais o MIT foi escolhido, ao mesmo tempo adicionando (i) uma concessão
explícita de patentes cobrindo ambos os lados da relação com o adotante, (ii)
atribuição via arquivo NOTICE que sobrevive a obras derivadas, e (iii) uma
cláusula de marca registrada que restringe o uso posterior do nome do projeto e
da identidade do autor?

## Direcionadores da Decisão

- **Explicitação da concessão de patentes.** O cenário de patentes de IA de 2026
  (taxa crescente de registros de NPE adjacentes a LLM, cartas públicas da indústria
  e plataformas de licenciamento apontando a ambiguidade da concessão de patentes
  do MIT) torna uma concessão implícita de patentes do MIT um risco determinante para qualquer
  adotante empresarial que puxa o harness para produção. A Apache
  2.0, seção 3, concede uma licença de patentes explícita e livre de royalties de
  cada contribuidor e sua cláusula de rescisão-em-caso-de-processo é um dissuasor
  contra um contribuidor posterior que processe pelo mesmo código.
- **Atribuição via NOTICE.** A Apache 2.0, seção 4(d), exige que
  distribuidores de obras derivadas incluam o arquivo NOTICE
  upstream. Para uma implementação de referência cujo sinal primário é o
  nome do autor, isso preserva a cadeia de atribuição quando o harness
  é forkado para um produto privado. O MIT exige o aviso de
  copyright mas não o fixa a um arquivo NOTICE separado do código-fonte.
- **Proteção de marca registrada.** A Apache 2.0, seção 6, explicitamente retém
  permissão para usar os nomes comerciais, marcas registradas, marcas de
  serviço ou nomes de produto do licenciante exceto para uso descritivo. Isso protege
  o nome do projeto e a identidade do autor de serem reciclados em
  uma marca de fork sem passar pela via de marca registrada. O MIT é
  silencioso quanto a marcas registradas.
- **Paridade de perfil de adoção com o MIT.** A Apache 2.0 está no nível
  "popular" da OSI ao lado do MIT e do BSD-3-Clause e carrega
  permissões aproximadamente equivalentes: uso comercial,
  modificação, distribuição, uso privado, sublicenciamento. Um leitor
  que teria adotado MIT adotará Apache 2.0; o sinal do projeto
  permanece inalterado.
- **Opcionalidade para um caminho futuro de relicenciamento.** Relicenciar um fork
  para BUSL 1.1 ou ELv2 é direto a partir da Apache 2.0 porque o
  código original permanece Apache e apenas o fork carrega qualquer restrição
  adicionada. A partir do MIT o caminho é equivalente na mecânica mas se lê
  como uma contribuição mais fraca do lado da fonte (sem cadeia de atribuição via
  NOTICE, sem concessão de patentes na camada base).
- **Paridade de tom com projetos sérios de IA.** Kubernetes, TensorFlow,
  Apache Airflow, Apache Beam e a maior parte dos projetos da Apache Software
  Foundation são distribuídos sob Apache 2.0. A licença é lida por
  um avaliador técnico ou um revisor de compras empresarial como um
  sinal de "código aberto de nível de produção", não "hack de fim de semana
  publicado permissivamente". O custo do sinal é zero em relação ao MIT
  e o ganho é não trivial para o público para o qual este projeto é
  escrito.
- **Compatibilidade de licença com o conjunto de dependências do projeto.** O
  grafo completo de dependências (LangGraph, adaptadores LangChain, FastAPI,
  Pydantic, Chroma, sentence-transformers, DeepEval, Ragas,
  Phoenix, OpenInference, OpenTelemetry, Langfuse, Promptfoo) é
  ou Apache 2.0 ou permissivo compatível (MIT, BSD). A Apache 2.0
  não introduz nenhuma nova restrição de compatibilidade dentro do conjunto de
  dependências; a distribuição posterior sob Apache 2.0 não é restringida pelas
  licenças upstream.

## Opções Consideradas

- **Apache License 2.0** (escolhida): permissiva, concessão explícita de patentes,
  atribuição via NOTICE, cláusula de marca registrada.
- **Licença MIT** (status quo): permissiva, sem concessão explícita de patentes,
  sem requisito de atribuição via NOTICE, sem cláusula de marca registrada.
- **Business Source License 1.1 (BUSL)**: source-available, código aberto
  com atraso temporal (tipicamente converte para Apache 2.0 após
  quatro anos), restrição de uso comercial no intervalo.
- **Elastic License v2 (ELv2)**: source-available, nega uso como serviço
  gerenciado hospedado e proíbe a remoção de avisos de licenciamento ou
  de garantia.
- **GNU AGPL v3**: copyleft, exige divulgação de código-fonte para
  uso em rede de derivados. A mais forte garantia de liberdade de usuário.
- **GNU GPL v3**: copyleft para uso fora de rede, exige
  divulgação de código-fonte de derivados que sejam distribuídos.
- **Licença dupla (MIT para não comercial + licença comercial)**:
  amigável a montante para forks de hobbyistas reservando o uso pago.
- **CC-BY-4.0**: atribuição creative-commons; destinada a conteúdo
  e dados, não a código-fonte (a FSF e a OSI desaconselham-na
  para software). Não aplicável à questão da licença de código, mantida
  na lista de opções como o contraponto que ancora por que a resposta
  não é uma licença da família CC.

## Resultado da Decisão

Opção escolhida: **Apache License 2.0**, porque ela adiciona as três
propriedades (concessão explícita de patentes, atribuição via NOTICE, cláusula
de marca registrada) sem mudar o sinal de amigabilidade à adoção que a escolha
inicial do MIT estava otimizando, e porque ela preserva a
opcionalidade de fazer fork e relicenciar sob BUSL 1.1 ou ELv2 mantendo
a base aberta inalterada. As famílias copyleft (AGPL, GPL) são lidas como
hostis à adoção para o público primário (avaliadores técnicos,
revisores de compras empresariais) e limitariam a integração posterior
em código de produto fechado. BUSL e ELv2 são escolhas corretas para uma
*camada produtizada* se e quando uma for distribuída; elas são a escolha errada
para a *implementação de referência* cujo propósito é ser lida, forkada,
adaptada e integrada.

### Confirmação

- O arquivo de licença na raiz do repositório é byte-equivalente ao
  texto canônico da Apache 2.0 em
  <https://www.apache.org/licenses/LICENSE-2.0.txt> com um bloco de
  copyright pré-preenchido anexado abaixo do APPENDIX.
- Um arquivo NOTICE na raiz do repositório carrega o nome do projeto, a
  linha de copyright de 2026, o parágrafo de atribuição-ao-autor e um
  ponteiro para a licença.
- Os metadados do pacote declaram o identificador SPDX `Apache-2.0` e
  carregam o classificador Apache Software License aprovado pela OSI.
- O front-matter do card do Hugging Face Spaces declara
  `license: apache-2.0`.
- A linha de badges do README carrega um shield Apache-2.0; a seção de licença
  nomeia a nova licença e aponta para os arquivos de licença e NOTICE.
- A postura de licença do projeto nomeia a Apache 2.0 e aponta de volta para este
  ADR.
- A CI está verde no release v1.0.0 (lint + verificação de tipos + suíte de testes,
  mais testes de integração com Postgres condicionados a skip, contra o gate de cobertura).

## Consequências

### Positivas

- **Concessão explícita de patentes** reduz o risco determinante que um
  adotante empresarial herda ao puxar o harness para um
  produto comercial.
- **Atribuição via NOTICE** preserva a identidade do autor através de
  forks e obras derivadas, que é o sinal primário
  que o projeto carrega.
- **Cláusula de marca registrada** estreita a superfície que um fork pode explorar para
  pegar carona no nome do projeto ou na identidade do autor em uma marca
  derivada.
- **Alinhamento de tom de licença** com Kubernetes, TensorFlow, a
  Apache Software Foundation e a maioria dos projetos OSS
  com credibilidade empresarial.
- **Mantém uma opção futura de relicenciamento aberta**: a camada base Apache
  é o substrato padrão a partir do qual um fork BUSL 1.1 ou ELv2 é
  construído.
- **Delta zero de atrito de adoção** vs MIT para os públicos para os quais este
  projeto é escrito; contribuidores posteriores podem integrar
  código Apache 2.0 em código permissivo, copyleft e proprietário com
  a mesma mecânica que o MIT permite.

### Negativas

- **Cerimônia de comentário de cabeçalho.** O boilerplate "How to apply" da
  Apache 2.0 é convencional mas não obrigatório em nível de arquivo. O projeto
  deixa o boilerplate para os arquivos de licença e NOTICE e não
  retrofita um cabeçalho por arquivo, o que é consistente com como muitas
  bases de código Apache-2.0 são distribuídas.
- **Rodapé de README ligeiramente mais pesado.** O rodapé da Apache 2.0 puxa
  um segundo arquivo (NOTICE) e uma linha de atribuição mais longa que a
  one-liner do MIT. Custo aceitável.
- **Letramento de licenciamento para recém-chegados.** Um contribuidor de
  primeira viagem pode ler o texto de licença mais longo e supor mais atrito do que
  há. Mitigado pela postura de licença do projeto e por este ADR estarem a dois
  cliques de distância.

### Neutras

- **O arquivo NOTICE se torna parte do layout do repo.** Um novo arquivo de
  nível superior junta-se à licença, ao README, à política de segurança, ao guia de
  contribuição e à postura de licença do projeto na raiz.
- **Atualização do identificador SPDX.** Ferramental que lê o campo `license`
  do pacote (uv, pip, detecção de licença do GitHub) reanalisa
  o novo valor SPDX `Apache-2.0`; nenhuma mudança comportamental no
  build.
- **Declarações de licença de dados intocadas.** A declaração de dados e a
  documentação de dados sintéticos continuam a descrever o plano de dados
  sintéticos sob sua postura existente por fonte (domínio público
  do governo dos EUA, WHO-EML parafraseado, diálogos gerados
  redistribuíveis sob MIT). A mudança da licença de código não se propaga
  para as declarações de licença de dados porque o licenciamento de dados é uma
  preocupação separada com restrições upstream separadas.

## Prós e Contras das Opções

### Apache License 2.0

- Boa, porque adiciona a concessão explícita de patentes que falta ao MIT.
- Boa, porque a atribuição via NOTICE da seção 4(d) preserva o
  sinal que o projeto carrega em obras derivadas.
- Boa, porque a cláusula de marca registrada da seção 6 estreita a
  superfície de reciclagem de marca.
- Boa, porque é do nível popular da OSI e se lê como
  com credibilidade empresarial.
- Boa, porque não inviabiliza um futuro fork BUSL / ELv2.
- Ruim, porque o cabeçalho boilerplate "How to apply" é uma
  cerimônia a mais que o bloco de copyright de três linhas do MIT.

### Licença MIT (status quo)

- Boa, porque é a licença permissiva mais curta e a mais
  familiar a um leitor casual.
- Ruim, porque não tem concessão explícita de patentes; o risco de patentes
  posterior herda a ambiguidade upstream.
- Ruim, porque não tem requisito de atribuição via NOTICE; uma
  cadeia de atribuição só sobrevive por convenção.
- Ruim, porque é silenciosa quanto a marcas registradas; o nome do projeto e a
  identidade do autor viajam com a marca de um fork sem restrição
  contratual.

### Business Source License 1.1 (BUSL)

- Boa, porque permite ao autor reservar uso comercial por uma
  janela definida antes que o código-fonte converta para Apache 2.0.
- Ruim, porque é source-available, não código aberto pela definição da
  OSI; perde o sinal de adoção "código aberto permissivo"
  do qual o projeto depende.
- Ruim, porque é a licença certa para uma camada produtizada,
  não para uma implementação de referência pública cujo propósito é ser
  lida, forkada e reutilizada.

### Elastic License v2 (ELv2)

- Boa, porque nega uso de terceiros como serviço gerenciado hospedado
  do código.
- Ruim, porque, como a BUSL, é source-available, não código aberto;
  mesmo descasamento de público.

### GNU AGPL v3

- Boa, porque é a mais forte garantia copyleft para usuários
  de derivados em rede.
- Ruim, porque limita a adoção por integradores empresariais que
  teriam que liberar suas integrações proprietárias.
- Ruim, porque o público primário lê a AGPL como
  hostil a compras e o badge do README carrega um efeito
  inibidor sobre o público que o projeto mira.

### GNU GPL v3

- Boa, porque é a licença copyleft canônica e bem
  compreendida.
- Ruim, porque a propagação copyleft através de obras derivadas
  limita a adoção em contextos de código fechado da mesma forma que a
  AGPL, com a confusão adicional de que a GPL se aplica à
  distribuição e a AGPL se aplica ao uso em rede.

### Licença dupla (MIT + comercial)

- Boa, porque reserva o caminho de receita comercial enquanto
  mantém um upstream amigável a hobbyistas.
- Ruim, porque introduz atrito no momento da adoção
  ("qual licença se aplica a mim?") e dobra a superfície operacional
  do projeto.

### CC-BY-4.0

- Ruim, porque as famílias Creative Commons não são projetadas para
  código-fonte; a OSI não lista a CC-BY entre as licenças de software
  aprovadas, e a FSF desaconselha usá-la para código.

## Mais Informações

- Texto canônico da Apache License 2.0:
  <https://www.apache.org/licenses/LICENSE-2.0>
- Choose a License - Apache 2.0:
  <https://choosealicense.com/licenses/apache-2.0/>
- OSI: Apache License 2.0:
  <https://opensource.org/license/apache-2-0>
- Orientação da Apache Software Foundation sobre arquivos NOTICE:
  <https://www.apache.org/legal/src-headers.html>
- ADR adjacente: [ADR-0007: Alvo de implantação](/ai-agent-eval-harness-healthtech-docs/pt-br/adr/adr-0007-deployment/)
- MADR 4.0.0: <https://adr.github.io/madr/>
