# Masters — Bíblia consolidada de organização, jogabilidade, UI, UX, design e layout

**Edição consolidada e ampliada · 13/10/2026 · Base: Masters 27**

**Um documento único para preservar a profundidade do jogo e redesenhar o acesso, a compreensão e o ritmo.** A proposta anterior foi incorporada integralmente, incluindo M01–M30, jornadas, regras de preservação e critérios; a expansão acrescenta M31–M50, especificações de 17 telas, uma configuração completa de Nova run e direção visual ilustrada. A Parte IX acrescenta exemplos visuais das próprias telas do Masters, com explicação do layout e vínculo às especificações.

> Nenhuma mecânica, personagem, texto, evento, cena, referência, possibilidade de ação ou campanha deve ser removida para tornar o jogo mais organizado. Reorganizar a atenção não é reduzir a simulação.

**Como usar:** o documento diferencia observações anteriores, propostas e [INFERÊNCIA]. Os capítulos de tela não são prova de implementação. O aprofundamento de Nova run identifica seus campos efetivamente inspecionados e o que continua sendo sugestão. O branch não foi inspecionado nem o HTML alterado.

**Precedência de arquitetura:** as decisões finais da Parte VIII resolvem endereços e prioridades; as telas da Parte III são especificações de apresentação e não novos macromenus. Referências cruzadas não duplicam entidades ou ações. O detalhe de Nova run complementa S17, usando a mesma ficha/modelo de campanha.

## Navegação do documento

- [Parte I — Proposta original completa: organização e M01–M30](#parte-i)
- [Parte II — Sistema global de informação, UI, UX, design e layout](#parte-ii)
- [Parte III — Reorganização detalhada de 17 telas](#parte-iii)
- [Parte IV — Nova run completa: campos, dependências e revisão](#parte-iv)
- [Parte V — Ampliação da jogabilidade: M31–M50](#parte-v)
- [Parte VI — Consolidação das telas e fontes compartilhadas](#parte-vi)
- [Parte VII — Direção visual ilustrada](#parte-vii)
- [Parte VIII — Integração final, prioridades e critérios cruzados](#parte-viii)
- [Parte IX — Atlas visual das telas do Masters](#parte-ix)

**Telas detalhadas:** S01 Cockpit; S02 Correspondência / Inbox; S03 Agenda e fechamento; S04 Elenco e gestão de pessoas; S05 Ficha de artista/banda e formação; S06 Scouting e funil de talentos; S07 Negociação e contrato; S08 Projeto musical e repertório; S09 Estúdio e gravação; S10 Lançamento e catálogo; S11 Ao vivo: show ou turnê; S12 Sede e operação; S13 Finanças e compromissos; S14 Mundo e exploração; S15 Submundo e fraudes; S16 Você: trajetória e legado; S17 Central da campanha. Nova run completa tem capítulo próprio na Parte IV.

**Formato:** todas as partes, user stories e critérios estão no Word/PDF/Markdown; JSON agrega especificações, campos e backlog. Não foram atribuídos prazos ou efeitos futuros como fatos.


<a id="parte-i"></a>

## Parte I — Proposta original completa: organização e M01–M30

**Proposta de evolução baseada no Masters 27 · 13/10/2026**

**Minha recomendação principal: manter a profundidade da simulação e mudar a forma de acessá-la.** O jogador não precisa de menos sistemas; precisa saber o que está acontecendo, onde agir, o que depende de quê e por que uma escolha produziu determinado resultado.

> **Não retirar conteúdo. Não esconder funcionalidades como se não existissem. Não transformar o jogo em um painel de trabalho. Organizar a atenção, preservar a liberdade e tornar as consequências legíveis.**

As ideias abaixo são propostas de design, não funcionalidades implementadas. Algumas ampliam recursos já presentes e outras integram o que você já pediu. Não fiz uma nova auditoria do branch nesta rodada. **[INFERÊNCIA]** Os ganhos esperados de clareza, fluidez e diversão são hipóteses a validar com jogadores, não resultados medidos.

### 1. O significado prático de “sem tirar nada”

Antes de redesenhar, estabelecer um contrato de preservação:

1. **Toda mecânica continua existindo:** contratos, artistas, formação, repertório, gravação, lançamentos, shows, sede, vida pessoal, mundo, política, submundo, fraudes, fãs, rivais e as demais áreas.
2. **Todo conteúdo permanece consultável:** textos completos, eventos, cenas, personagens, relações, históricos, relatórios e referências visuais.
3. **Toda ação mantém um caminho de acesso:** pela sua área canônica, pelo índice completo ou por busca. Um filtro não pode apagar uma capacidade da navegação.
4. **Preferências visuais não alteram regras:** escolher uma interface guiada ou compacta não muda probabilidades, custos, calendário ou acesso à informação que o jogador legitimamente conhece.
5. **História e sigilo do jogo são preservados:** organizar informação não pode revelar talento real, intenções secretas de rivais ou resultados futuros que deveriam permanecer desconhecidos.
6. **Delegar é uma escolha:** o jogador pode operar manualmente, delegar apenas rotinas ou retomar controle. O padrão não pode assinar contratos ou gastar caixa silenciosamente.
7. **Nada é automaticamente descartado ao resumir:** o resumo aponta para o registro original e o conteúdo integral.
8. **Mudanças de interface não devem exigir uma campanha nova:** preferências e layouts devem ficar separados do estado da simulação sempre que possível. Qualquer exceção precisa de justificativa, backup e estratégia de compatibilidade.

**Reorganizar não é amputar.** Uma lista completa recolhida em um menu é diferente de uma funcionalidade sem rota, sem busca e sem explicação. O primeiro caso organiza; o segundo remove a capacidade na prática.

### 2. Como eu estruturaria a experiência

#### 2.1 Manter os oito grupos principais, não inventar outro labirinto

Eu manteria a estrutura que a versão 27 começou a estabelecer. A proposta é tornar os destinos estáveis e previsíveis, não trocar os nomes e posições a cada release.

1. **Cockpit:** Agora, correspondência/inbox, compromissos, fechamento e visão da campanha.
2. **Sede:** prédio, ambientes, equipamentos, operação e presença na cidade; equipe operacional por aqui, com vínculo para a ficha em Pessoas.
3. **Pessoas:** elenco, integrantes, recrutamento, olheiros, empresários, produtores e relações.
4. **Projetos:** composição, repertório, gravação, lançamentos, catálogo e demais projetos criativos existentes.
5. **Ao vivo:** shows, turnês, festivais, agenciamento e locais, respeitando o papel escolhido.
6. **Mundo:** mercados, paradas, cenas, mídia, política, cultura, história, rivais e **Submundo** como destino explícito. Definir a relação de Fraudes com Submundo sem deixar uma rota órfã.
7. **Gestão:** finanças, contratos, compromissos empresariais, jurídico e demais controles existentes.
8. **Você:** personagem, carreira, vida pessoal, relações, legado e álbum/cronologia pessoal.

Isso é uma **proposta de endereço**, não um inventário exaustivo do código. Nenhuma página pode desaparecer por não estar listada neste desenho: o inventário completo de rotas deve ser feito antes da alteração.

Uma área pode ser relevante em vários lugares, mas deve ter **um endereço canônico**. Exemplo: contrato aparece no artista, na inbox e na Gestão; todos abrem o mesmo contrato, não três versões dele.

#### 2.2 Acrescentar uma segunda navegação: “o que quero fazer?”

O menu organiza assuntos. Um jogador também pensa em intenções:

1. Encontrar e contratar alguém.
2. Preparar e lançar um disco.
3. Organizar um show ou uma turnê.
4. Resolver uma crise.
5. Melhorar a sede.
6. Entender por que o caixa mudou.
7. Explorar o mundo e sua história.
8. Desenvolver a trajetória do personagem.

Essas intenções viram atalhos para fluxos existentes, não novos sistemas obrigatórios. “Lançar um disco” deve levar ao projeto, apontar o próximo pré-requisito e permitir abrir qualquer etapa em detalhe.

#### 2.3 Três níveis de apresentação, com acesso contínuo

**Visão rápida:** situação, próximo passo, prazo, responsável e consequência relevante. Não exibir todos os atributos simultaneamente.

**Detalhe:** ficha ou projeto completo, decisões e informações que sustentam a ação.

**Histórico e regras:** registros anteriores, relações, evolução, fórmulas explicáveis, documentos e conteúdo integral permitido pelas regras da campanha.

Não usaria a palavra “avançado” para tudo que fica no terceiro nível: parece dizer que o jogador comum não deve explorar. “Detalhes e histórico” comunica melhor.

A consistência de navegação, o retorno previsível e múltiplas formas de localizar conteúdo são recomendados pela diretriz XAG 112. A proposta para o Masters aplica esses princípios sem pressupor que eles, sozinhos, aumentem diversão. [1]

#### 2.4 Desenho textual do Cockpit

```text
MASTERS | data completa | caixa e variação | salvar | avançar

AGORA
- Situação mais importante + motivo + prazo + abrir
- Próxima decisão relevante + resposta padrão declarada
- Compromisso de um projeto acompanhado
Ver todas as pendências — contagem por tipo

MINHA CAMPANHA
Objetivo escolhido | próximo marco | situação do personagem

PROJETOS ACOMPANHADOS
Projeto | etapa | impedimento ou próximo passo | abrir

PRÓXIMAS DATAS
Agenda conjunta: elenco, estúdio, shows, contratos e promessas

MUNDO E HISTÓRIA
Destaques relevantes | explorar tudo | cenas e registros

PERSONALIZAR | ÍNDICE COMPLETO | BUSCAR
```

O bloco Agora já existe na 27: **não estou propondo refazê-lo do zero**. Eu ampliaria seu critério de seleção, rastreabilidade e personalização. Um limite de três destaques não pode esconder um quarto risco crítico: mostrar um aviso explícito e permitir abrir a fila inteira.

### 3. Trinta melhorias concretas

**Prioridades:** P0 = fundação/consistência; P1 = fluxo e controle; P2 = aprofundamento opcional. Não representam status de implementação. A sequência de entrega aparece depois das ideias.

#### M01 — Um catálogo único de todas as páginas e ações

**Tipo: integração estrutural · Prioridade: P0.**

Criar uma fonte única que descreva cada destino: identificador estável, nome, aliases, grupo, condição de disponibilidade, atalhos e vínculo para a ajuda. Essencial, Completa, busca e links contextuais devem consultar a mesma fonte. Hoje o caso Submundo mostra por que organizações paralelas podem divergir.

“Não disponível nesta era” deve continuar localizável no índice, com explicação. Isso preserva conteúdo sem tornar disponível uma mecânica antes da hora. Submundo/Crime, artista/ato e disco/lançamento são exemplos de aliases, não de páginas novas.

**User story:** Eu como jogador, Quero encontrar qualquer área pelo nome que reconheço, Para explorar todos os sistemas sem conhecer os identificadores internos.

**Aceite:** inventário anterior e posterior com todos os destinos preservados; nenhuma rota sem endereço; aliases chegam à mesma área; disponibilidade e motivo aparecem no índice.

#### M02 — Atalhos por intenção, além do menu por assunto

**Tipo: nova camada de acesso · Prioridade: P1.**

Adicionar atalhos “Quero contratar”, “Quero lançar”, “Quero fazer uma turnê” e “Quero entender meu caixa”. Eles usam as etapas existentes. Não introduzir um assistente obrigatório que impeça navegação livre.

O fluxo reconhece o contexto: uma gravadora sem elenco começa no recrutamento; um artista com repertório pronto não precisa passar pela contratação. Papéis secundários continuam acessíveis, mesmo que os atalhos principais sejam personalizados.

**User story:** Eu como jogador, Quero entrar no fluxo pelo objetivo que tenho, Para agir sem descobrir antes qual módulo contém cada etapa.

**Aceite:** cada atalho resolve para uma etapa existente; contexto muda a recomendação sem apagar alternativas; sair do fluxo preserva o trabalho e permite retomar.

#### M03 — Um padrão consistente de resumo, detalhe e histórico

**Tipo: ampliação da apresentação · Prioridade: P0.**

Aplicar o mesmo padrão a artista, disco, contrato, projeto, evento e lugar. No resumo, mostrar o que importa para decidir. Em detalhe, expor todos os campos. Em histórico, mostrar registros e alterações.

Texto curto não substitui texto completo. Um botão “Entender esta situação” abre a explicação. O estado de expansão pode ser lembrado por preferência. Informação imprescindível para confirmar uma ação não fica escondida atrás de um tooltip.

**User story:** Eu como jogador, Quero escolher quanto detalhe vejo sem perder informações, Para alternar entre gestão rápida e exploração profunda.

**Aceite:** conteúdo integral acessível; mesma hierarquia nas fichas; resumo aponta ao registro original; preferências não modificam a simulação.

#### M04 — Uma mesa personalizável com favoritos e acompanhamentos

**Tipo: ampliação de recursos de navegação já presentes · Prioridade: P1.**

Aproveitar favoritos e acesso recente existentes para permitir acompanhar entidades e projetos, não apenas páginas. O jogador escolhe quais artistas, lançamentos e compromissos aparecem no Cockpit.

Não criar outro dashboard obrigatório. São blocos dentro do Cockpit, com uma opção de restaurar o layout. Uma página favorita, uma mensagem estrelada e um artista acompanhado são objetos diferentes; seus estados não devem ser confundidos.

**User story:** Eu como jogador, Quero acompanhar o que considero importante na minha campanha, Para organizar a atenção conforme meu estilo de jogo.

**Aceite:** acompanhamento persistente; remover um bloco não remove o conteúdo; riscos críticos continuam visíveis; favoritos de página não alteram estrelas da inbox.

#### M05 — Ficha contextual sem perder a página de origem

**Tipo: melhoria de navegação · Prioridade: P0.**

Ao clicar em uma pessoa, contrato ou lançamento, abrir um painel contextual no desktop. Ele mostra o essencial e oferece “Abrir ficha completa”. No mobile, usar uma tela dedicada com retorno consistente.

O ganho principal é não perder comparação, filtros e posição de scroll quando o jogador consulta alguém. Isso ajuda scouting, agenda, negociação e leitura de mensagens. Não empilhar cinco modais uns sobre os outros.

**User story:** Eu como jogador, Quero consultar uma ficha e voltar ao ponto exato de onde saí, Para investigar sem reiniciar meu raciocínio.

**Aceite:** voltar restaura filtro, seleção, scroll e foco; abrir ficha completa preserva origem; teclado e toque têm caminhos equivalentes.

#### M06 — A mesma linguagem de interface em todas as áreas

**Tipo: padronização · Prioridade: P0.**

Usar componentes comuns para títulos, abas, filtros, chips de status, botões, estados vazios, erros e avisos. A ação principal deve ocupar uma posição previsível; botões destrutivos precisam ser distinguíveis.

Padronizar também significados: “agendado” não é “em andamento”; “proposta” não é “contrato”; “estimado” não é “confirmado”. Não impor a mesma quantidade de indicadores a todas as páginas — consistência não significa uniformidade artificial.

**User story:** Eu como jogador, Quero reconhecer estados e controles em qualquer área, Para aprender uma interação e reutilizá-la no restante do jogo.

**Aceite:** glossário de estados; componentes compartilhados; foco previsível; erro explica causa e ação possível; rótulos longos não viram siglas incompreensíveis.

#### M07 — Um registro de ocorrências alimentando várias vistas

**Tipo: integração da inbox, decisões e história já solicitadas · Prioridade: P0.**

Uma decisão, sua mensagem, seu compromisso e sua consequência devem compartilhar referências. Cockpit, inbox, agenda e diário são vistas da mesma ocorrência, não cópias desconectadas.

Uma notícia pode aparecer em vários contextos sem gerar múltiplas tarefas ou ações duplicadas. Preservar textos originais e o canal da era: carta, telefonema ou e-mail. Não transformar correspondência de 1962 em e-mail literal apenas para imitar uma interface moderna.

**User story:** Eu como jogador, Quero reconhecer a mesma ocorrência nas diferentes telas, Para acompanhar sua evolução sem responder duas vezes nem perder o histórico.

**Aceite:** identificador estável; resposta processada uma vez; navegação entre mensagem, decisão e consequência; todas as versões originais consultáveis.

#### M08 — Cada projeto como uma sequência visível de etapas

**Tipo: ampliação dos projetos existentes · Prioridade: P1.**

Exibir objetivo, etapa atual, dependências, recursos, orçamento, responsável e próximo passo. Para um disco: repertório → preparação → gravação → acabamento → lançamento → acompanhamento. A sequência não precisa ser rígida; gravação e planejamento podem coexistir quando as regras permitem.

Clicar em uma etapa abre o módulo completo. O projeto funciona como ligação entre sistemas, não como uma tela alternativa com regras próprias. Adaptar o modelo a turnê, festival, expansão de sede e outras iniciativas existentes.

**User story:** Eu como jogador, Quero ver as dependências de um projeto, Para entender o que falta e planejar sem alternar entre páginas às cegas.

**Aceite:** uma única fonte de progresso; etapas refletem o estado real; atividades paralelas visíveis; custo gasto e comprometido separados; nenhum módulo perde acesso direto.

#### M09 — Agenda única com capacidade e conflitos explícitos

**Tipo: integração de agendas existentes · Prioridade: P0.**

Reunir compromissos de artistas, integrantes, estúdio, equipe, shows e personagem em vistas semanais e mensais. Mostrar dias livres e conflito de recurso, não apenas eventos em uma lista.

Ações delegadas aparecem com responsável, origem e condição de cancelamento. Se uma composição já ocupa a agenda, a interface deve oferecer “Ver tarefa” ou “Reagendar”, não tentar criar outra e retornar um erro genérico.

**User story:** Eu como jogador, Quero visualizar ocupação e conflitos de todos os envolvidos, Para coordenar meus projetos sem duplicar tarefas ou comprometer recursos incompatíveis.

**Aceite:** compromissos manuais e automáticos na mesma vista; conflito identifica o recurso; mudança atualiza o projeto; custo de cancelar fica explícito antes da ação.

#### M10 — Uma revisão útil antes de avançar o tempo

**Tipo: ampliação do fechamento já existente · Prioridade: P0.**

Antes de avançar, mostrar o que realmente será afetado: decisões próximas do prazo, resposta padrão, custos comprometidos, trabalhos em execução e próximos marcos. Não transformar toda passagem de semana em uma reunião com dez confirmações.

Permitir resolver uma decisão, aceitar conscientemente seus padrões ou voltar. A revisão deve explicar por que um item é importante; não classificar automaticamente toda escolha como obrigatória.

**User story:** Eu como jogador, Quero entender o que vai acontecer quando avanço, Para controlar o ritmo sem sofrer consequências invisíveis de ações pendentes.

**Aceite:** padrões escritos por decisão; nenhum custo conhecido omitido; informação estimada identificada; o avanço executa exatamente o estado revisado; nenhum clique duplicado processa dois turnos.

#### M11 — Avanço rápido com critérios compreensíveis e checkpoints

**Tipo: ampliação de “Até…” e critérios de parada existentes · Prioridade: P1.**

Preservar o avanço por semana, mês e trimestre. Melhorar o avanço até evento: conclusão de projeto, resposta de negociação, prazo, falta de caixa, crise ou marco acompanhado.

Ao parar, explicar qual critério foi acionado. Definir a política para decisões que surgem durante a execução: pausar, aplicar uma regra previamente escolhida ou delegar dentro de limites. Não usar o avanço rápido como licença para ignorar acontecimentos importantes.

**User story:** Eu como jogador, Quero avançar até algo relevante com uma política clara de interrupção, Para evitar meses vazios sem perder controle da campanha.

**Aceite:** critérios visíveis e editáveis; checkpoint confirmado antes do lote quando suportado; parada informa o motivo; processamento respeita as mesmas regras do avanço manual.

#### M12 — Delegação com mandato, limites e prestação de contas

**Tipo: ampliação da autonomia existente · Prioridade: P1.**

Dar à equipe um mandato: objetivo, teto de gasto, recursos permitidos e situações que exigem retorno. Exemplo: observar talentos de uma cena sem contratar ninguém e sem ultrapassar o orçamento escolhido.

A equipe entrega um relatório do que fez, do que não conseguiu e do que precisa do jogador. Automatizar rotina não pode automatizar a personalidade da campanha. Retomar controle deve ser simples, preservando trabalhos já iniciados.

**User story:** Eu como gestor, Quero delegar rotinas com limites verificáveis, Para reduzir cliques sem abrir mão das decisões que definem meu estilo.

**Aceite:** delegação opt-in; nenhum gasto acima do teto; contratos/crises fora do mandato retornam ao jogador; ações aparecem na agenda e no histórico; cancelamento declara efeitos.

#### M13 — Cartões de decisão que explicam o trade-off sem revelar o futuro

**Tipo: melhoria de decisão · Prioridade: P0.**

Padronizar decisões com contexto, opções, custo conhecido, prazo, reversibilidade e pessoas afetadas. Diferenciar efeito garantido pela regra de resultado incerto. Estimativas dependem do conhecimento de olheiros e equipe, não de acesso aos valores secretos.

Um aviso “pode desagradar fãs” deve indicar de onde veio a avaliação e a incerteza, sem transformar cada resultado numa porcentagem falsa. O jogador continua podendo escolher alternativas arriscadas, artísticas ou pessoais.

**User story:** Eu como jogador, Quero compreender as diferenças entre opções, Para escolher conscientemente sem transformar a simulação em um problema com resposta única.

**Aceite:** fatos e estimativas distintos; nenhuma revelação de atributos ocultos; custos conhecidos visíveis; alternativas não são ranqueadas automaticamente como certa/errada.

#### M14 — Consequências com vínculo à decisão original

**Tipo: integração à história do jogador já solicitada · Prioridade: P1.**

Depois de uma ação importante, registrar o que aconteceu, o que o jogo pode atribuir diretamente à escolha e o que decorreu de outros fatores. Ligar a ocorrência à decisão original e ao projeto ou relação afetada.

Não afirmar “seu marketing causou o hit” apenas porque ocorreu antes dele. Quando a simulação não registra causalidade suficiente, apresentar fatores observados e incerteza. A explicação deve servir ao aprendizado e à história da campanha.

**User story:** Eu como jogador, Quero relacionar escolhas e consequências com honestidade, Para aprender e reconhecer a trajetória que estou construindo.

**Aceite:** vínculo persistente; efeito imediato e diferido diferenciados; registro não inventa causalidade; escolha e texto completo permanecem revisitáveis.

#### M15 — Pré-requisitos transformados em ações, não em becos sem saída

**Tipo: ampliação dos orientadores existentes · Prioridade: P0.**

Todo impedimento deve responder “o que falta?”, “por que falta?” e “como resolver?”. Se não existe faixa escrita, oferecer compor, escolher repertório disponível ou cover conforme as regras. Se o recurso está ocupado, abrir agenda e alternativas válidas.

Não habilitar uma ação que a regra proíbe. A melhoria é indicar caminhos sem obrigar o jogador a memorizar as relações entre sistemas. Usar um resolvedor comum para que projeto, agenda e botão contem a mesma história.

**User story:** Eu como jogador, Quero receber caminhos válidos quando uma ação está impedida, Para resolver o pré-requisito sem precisar adivinhar o funcionamento do jogo.

**Aceite:** motivo específico; ao menos um caminho quando existir; nenhum botão promete solução impossível; tarefa já agendada é reconhecida; estados se atualizam após resolver.

#### M16 — Primeiro ciclo jogável por papel, sem “modo bebê”

**Tipo: evolução do onboarding existente · Prioridade: P1.**

Criar uma orientação opcional para concluir um primeiro ciclo real. Para gravadora: encontrar artista → avaliar → negociar → preparar repertório → gravar → lançar → interpretar resultado. Outros papéis recebem suas próprias jornadas; um festival não precisa começar assinando um músico.

Usar a campanha real, sem garantir sucesso artificial. Permitir sair, retomar e consultar uma instrução específica depois. Tutoriais interativos e objetivos revisitáveis são recomendados pela XAG 109. [2]

**User story:** Eu como novo jogador, Quero aprender meu papel executando um ciclo real, Para entender o jogo sem ler todo o manual antes de começar.

**Aceite:** percurso adaptado ao papel e à era; sem bônus ocultos; nenhum conteúdo bloqueado por não concluir tutorial; instruções disponíveis sob demanda.

#### M17 — “Onde eu estava?” ao retomar um save

**Tipo: melhoria de continuidade · Prioridade: P1.**

Ao carregar, oferecer uma retomada curta: objetivo acompanhado, projetos em curso, compromissos próximos e últimas escolhas importantes. Cada item abre sua origem; o jogador pode ignorar o painel e entrar diretamente.

Não simular acontecimentos durante a ausência se o jogo não tem passagem de tempo offline. A mensagem descreve a data da campanha e o checkpoint salvo, não inventa “o que aconteceu enquanto você estava fora”. Saves descritivos e revisão da história são recomendações da XAG 109. [2]

**User story:** Eu como jogador que ficou dias sem jogar, Quero recuperar o contexto da campanha, Para retomar minhas decisões sem reler todo o arquivo.

**Aceite:** data/versão do save visíveis; estado vem do checkpoint carregado; nenhum avanço implícito; links restauram contexto; briefing pode ser desativado.

#### M18 — Densidade, tipografia e controles ajustáveis

**Tipo: acessibilidade e conforto · Prioridade: P0.**

Preservar a pixel art nos personagens e ambientes, mas não obrigar texto longo a usar uma fonte decorativa minúscula. Oferecer densidade confortável e compacta, tamanho de texto, contraste e redução de animações.

Não depender só de cor para risco, estado ou seleção. Botões, listas e fichas precisam funcionar por teclado e toque. Preferências ficam salvas. As recomendações de legibilidade, espaçamento, remapeamento e persistência têm apoio nas Game Accessibility Guidelines. [3]

**User story:** Eu como jogador, Quero ajustar a leitura e os controles sem alterar o jogo, Para jogar confortavelmente no meu dispositivo e nas minhas condições de acesso.

**Aceite:** reflow sem perda de campos; foco visível; ícones com rótulo; nenhuma ação exige hover; preferências persistentes e restauração disponíveis.

#### M19 — Mobile com atalhos escolhidos e acesso ao menu inteiro

**Tipo: evolução do layout mobile já melhorado · Prioridade: P1.**

No celular, evitar oito rótulos comprimidos em uma faixa. Proponho até quatro atalhos escolhidos pelo jogador mais “Menu”, que abre os oito grupos completos. Essa quantidade é ponto de partida de design, não padrão validado.

Correspondência, ficha e decisão abrem em tela dedicada; retorno restaura posição. Toda tabela grande tem uma vista equivalente de cartões, comparação ou lista de campos. Não substituir uma tabela completa por um resumo irreversível.

**User story:** Eu como jogador no celular, Quero alcançar todas as áreas com controles legíveis, Para usar o jogo completo sem depender de uma tela grande.

**Aceite:** menu integral acessível; atalhos configuráveis; campos completos preservados; nenhuma interação depende de arrastar; testar teclado virtual e dispositivo físico.

#### M20 — Presets de apresentação independentes da dificuldade

**Tipo: organização configurável · Prioridade: P1.**

Oferecer presets **Guiado**, **Livre** e **Contemplativo**, como configurações de apresentação. Guiado destaca próximos passos; Livre expõe acompanhamento amplo; Contemplativo prioriza cenas escolhidas e deixa a gestão disponível.

Não chamar um deles de “Completo” se os demais também preservam todo o jogo. Separar esse ajuste de dificuldade, fidelidade histórica e comportamento do narrador. Quem escolhe menos interrupções continua recebendo o registro integral.

**User story:** Eu como jogador, Quero ajustar quanto acompanhamento e interrupção recebo, Para jogar no meu ritmo sem mudar as regras ou perder conteúdo.

**Aceite:** mesmas regras e acesso; mudanças reversíveis; resumo aponta para originais; decisões com prazo seguem política explícita; escolha de apresentação não altera RNG.

#### M21 — Comparação com contexto e confiabilidade das informações

**Tipo: ampliação da comparação de scouting existente · Prioridade: P1.**

Manter a comparação lado a lado e acrescentar critérios escolhidos: custo, adequação à estratégia, capacidade conhecida, agenda e restrições. Exibir origem, data e confiabilidade de cada informação.

Não criar um “melhor artista” universal. Um candidato barato e conhecido pode ser melhor para uma situação; outro pode oferecer ambição artística com maior incerteza. Dados faltantes devem permanecer faltantes, não virar zero ou uma pontuação inventada.

**User story:** Eu como gestor, Quero comparar alternativas segundo minha estratégia e o que realmente sei, Para escolher sem confundir rumores com valores confirmados.

**Aceite:** unidades e datas consistentes; desconhecido distinto de baixo; comparação não revela atributos secretos; filtros/seleção persistem após consultar fichas.

#### M22 — Relações como uma rede navegável, com alternativa em lista

**Tipo: aprofundamento de relações existentes · Prioridade: P2.**

Criar uma vista opcional das ligações entre artistas, integrantes, empresários, rivais e facções. Selecionar uma relação mostra seu tipo, o que é conhecido e acontecimentos relevantes.

Não desenhar o mundo inteiro de uma vez. Começar pela entidade selecionada e expandir. A representação gráfica precisa de uma lista equivalente; não tornar o arraste do mapa a única forma de acesso. Relações desconhecidas não podem aparecer como revelação involuntária.

**User story:** Eu como jogador, Quero explorar as relações conhecidas de uma pessoa ou grupo, Para entender conflitos e alianças sem consultar fichas desconectadas.

**Aceite:** gráfico e lista equivalentes; fonte e data da informação; relações ocultas respeitadas; limites de renderização não eliminam conteúdo; expansão progressiva.

#### M23 — Mundo relevante sem transformar o restante em conteúdo morto

**Tipo: organização do mundo existente · Prioridade: P1.**

Oferecer filtros de contexto: minha cidade, gêneros acompanhados, mercados de atuação e pessoas observadas. Acrescentar “Explorar o mundo inteiro” sempre visível e um indicador de que um filtro está ativo.

Separar relevância atual de possibilidade de exploração. O jogador deve poder seguir uma cena estrangeira, cultura ou rival mesmo sem operar ali. O filtro muda a vista, não desliga acontecimentos do mundo ou elimina sua história.

**User story:** Eu como jogador, Quero alternar entre o mundo relevante para minha operação e a exploração completa, Para não me perder em notícias sem abrir mão da riqueza da simulação.

**Aceite:** filtro explícito e removível; simulação idêntica; busca global fora do filtro; todo conteúdo permitido continua no arquivo; acontecimentos fora do foco não são apagados.

#### M24 — Uma cena importante conectada à escolha e ao que veio depois

**Tipo: integração às cenas e narrativa já solicitadas · Prioridade: P1.**

Cada cena significativa deve oferecer contexto, pessoas envolvidas, relação com uma decisão e acesso à consequência quando disponível. Após rever uma cena, permitir voltar ao projeto, pessoa ou período correspondente.

Manter opções de assistir, ler transcrição e rever mais tarde conforme a política escolhida. Cena não é decoração que interrompe uma planilha, nem tutorial disfarçado: deve ampliar a percepção de conquista, conflito ou vínculo.

**User story:** Eu como jogador, Quero reconhecer por que uma cena importa para minha campanha, Para sentir minhas decisões sem perder a continuidade da gestão.

**Aceite:** cena ligada ao registro de origem; replay sem processar escolha novamente; transcrição integral; áudio opcional; nenhuma consequência narrativa se perde por adiar apresentação.

#### M25 — Enciclopédia contextual ligada aos próprios termos do jogo

**Tipo: ampliação da ajuda e arquivo existentes · Prioridade: P2.**

Um termo como royalties, recoupment, formação, certificação ou censura abre explicação curta e conteúdo completo. A ajuda deve usar exemplos da era e do papel, sem preencher a ficha com um manual inteiro.

Distinguir regra do jogo, dado histórico documentado e resultado da simulação. “O que realmente aconteceu” não pode ser apresentado como destino garantido em uma campanha livre. A enciclopédia é um destino explorável, não só um tooltip.

**User story:** Eu como jogador, Quero entender termos e regras a partir da tela em que estou, Para aprender sem abandonar a campanha nem confundir história real e simulação.

**Aceite:** explicação curta e integral; links estáveis; política histórica indicada; ajuda acessível sem hover; nenhum conteúdo depende exclusivamente de áudio.

#### M26 — Revisão de fase da campanha, não um relatório repetitivo a cada turno

**Tipo: aprofundamento do feedback · Prioridade: P2.**

Nos marcos escolhidos — primeiro lançamento, consolidação do selo, mudança de era, expansão ou crise superada — mostrar o que mudou na campanha e quais novas possibilidades existem.

A revisão não precisa ser obrigatória nem limitar-se a lucro. Uma trajetória artística, regional, política ou pessoal pode ter valor. Ela reúne ocorrências reais da campanha; não inventa uma história genérica baseada apenas em contadores.

**User story:** Eu como jogador, Quero perceber mudanças significativas ao longo da campanha, Para reconhecer progresso e escolher novos rumos além de acumular dinheiro.

**Aceite:** marcos rastreáveis; revisão pode ser adiada/revista; valores e conquistas ligados à escolha do jogador; novas possibilidades não tornam antigas áreas inacessíveis.

#### M27 — Planejamento de cenários sem prometer resultados

**Tipo: nova ferramenta opcional · Prioridade: P2.**

Antes de investir em turnê, disco ou sede, comparar cenários de custos conhecidos, disponibilidade e receitas estimadas. Mostrar premissas e faixas, não previsão infalível de sucesso.

Começar com orçamento e agenda, sem executar a simulação inteira em uma cópia. Um sandbox de planejamento mais sofisticado exigiria clonagem segura de estado/RNG e prevenção de vazamentos; é uma dependência técnica maior, não uma entrega rápida garantida.

**User story:** Eu como gestor, Quero comparar planos com premissas explícitas, Para avaliar riscos sem conhecer o futuro nem comprometer recursos antes da decisão.

**Aceite:** cálculo não altera campanha/RNG; valores conhecidos e estimados distintos; premissas editáveis; plano só vira compromisso por ação explícita.

#### M28 — Coleções e objetivos pessoais opcionais

**Tipo: aprofundamento do prazer de exploração · Prioridade: P2.**

Permitir ao jogador acompanhar interesses: produzir uma sequência de discos, conhecer uma cena, reconstruir uma formação, documentar lugares ou desenvolver um artista. Reaproveitar metas e conquistas existentes antes de inventar outra moeda de progresso.

Não obrigar a completar coleções para avançar. O valor é escolher uma história pessoal dentro da riqueza do mundo, não preencher uma checklist de conteúdo irrelevante. Objetivos podem ser abandonados sem punição artificial.

**User story:** Eu como jogador, Quero acompanhar interesses próprios além das metas econômicas, Para encontrar caminhos de diversão coerentes com minha campanha.

**Aceite:** opt-in; sem bloqueio de mecânicas; progresso rastreável; informação secreta não revelada; metas existentes não duplicadas; abandonar não apaga registros históricos.

#### M29 — Performance sem cortar artistas, cenas ou referências

**Tipo: melhoria técnica · Prioridade: P1.**

Carregar e decodificar visuais quando necessários, reutilizar imagens repetidas, renderizar listas por demanda e reduzir reconstruções completas da interface. Na lista longa, busca e filtros operam sobre todos os registros, mesmo quando só uma parte está desenhada.

Preservar a distribuição offline/single-file se esse for o requisito. Deduplicação e decodificação tardia são diferentes de apagar assets. Referências e conteúdo histórico mantêm acesso; não remover os desenhos para melhorar um benchmark.

**User story:** Eu como jogador, Quero que o jogo responda bem com todo o seu conteúdo, Para explorar campanhas grandes sem precisar de um computador potente.

**Aceite:** inventário preservado; busca cobre registros não renderizados; navegação por teclado funciona em listas virtualizadas; recursos offline verificados; testes em campanha grande.

#### M30 — “Passaporte da campanha”: regras, build e preservação

**Tipo: clareza e continuidade · Prioridade: P0.**

Uma ficha persistente mostra versão do jogo, data da campanha, papéis, dificuldade, política histórica, seed quando apropriado e compatibilidade do save. A configuração distingue apresentação, regras do mundo e identidade dos personagens.

Ao atualizar, informar o que mudou e como preservar campanhas. Não orientar a excluir saves incompatíveis como primeiro caminho. Guardar backups e abrir a campanha na versão correspondente é melhor que perder progresso por uma reorganização visual.

**User story:** Eu como jogador, Quero consultar as regras e a compatibilidade da minha campanha, Para interpretar o mundo corretamente e atualizar sem perder meu progresso.

**Aceite:** ficha corresponde ao estado real; incompatibilidade não sobrescreve arquivo; preferências não mudam regras; alteração de política exige regra de migração explícita quando suportada.

### 4. Como não duplicar o que você já pediu

Seu pacote atual continua sendo a base. Eu encaixaria as ideias nele assim:

1. **Inbox estilo FM/e-mail:** continuar a entrega já solicitada. M05 e M07 acrescentam retorno de contexto e identidade entre ocorrência, decisão e consequência; não são outra inbox concorrente.
2. **História pessoal, cenas e final:** M14, M17, M24 e M26 conectam esses recursos às escolhas e à retomada. Não abrir uma segunda implementação de story mode.
3. **Submundo:** corrigir os destinos existentes. M01 impede que o mesmo problema reapareça quando o menu mudar.
4. **Formação e múltiplas funções:** continuar a correção temporal/modelo. M03 e M06 padronizam como os dados aparecem. Um novo layout não substitui a correção das datas.
5. **Bonecos e assinatura visual:** preservar o estilo escolhido. M18 melhora legibilidade sem descaracterizar arte; M29 evita que a diversidade visual piore a resposta da interface.
6. **Promessas e rivais:** continuar os comportamentos planejados. M09, M12 e M14 tornam os compromissos acompanháveis e a autonomia auditável, sem duplicar lógica de contratos.
7. **Início/fim e sandbox:** M30 declara a política da campanha; M17 e M24 ajudam a revisitar. Não criar outro relógio ou outra regra de término.

**A proposta não é somar 30 sistemas novos.** É organizar o acesso, integrar estruturas e reservar poucas ampliações opcionais para depois que a experiência base estiver consistente.

### 5. Quatro jornadas que o jogo deveria tornar naturais

#### 5.1 Quero lançar meu primeiro disco

1. Escolher a intenção no Cockpit ou acessar Projetos diretamente.
2. Verificar se existe artista e repertório adequados. Se faltar algo, abrir a etapa correspondente.
3. Criar ou retomar o projeto existente, sem duplicação.
4. Escolher repertório e preparação, consultando fichas sem perder o contexto.
5. Agendar recursos; ver conflitos e alternativas.
6. Definir as decisões de produção e lançamento permitidas pela era.
7. Revisar custos, prazos e compromissos antes de avançar.
8. Avançar manualmente ou até um marco, conforme política explícita.
9. Receber resultado financeiro e criativo, com fontes e limitações.
10. Ver o registro e a cena relacionados, e decidir o próximo movimento.

O fluxo orienta, mas não impede ir ao Submundo, visitar a sede ou negociar outra coisa no meio da jornada.

#### 5.2 Quero resolver uma crise sem perder a campanha de vista

1. Abrir a ocorrência na inbox ou no Cockpit.
2. Ler contexto, prazo e opções conhecidas.
3. Consultar pessoas/relações em painel contextual.
4. Comparar custos e efeitos certos/incertos.
5. Escolher ou declarar conscientemente que aceita o padrão.
6. Ver a ocorrência mudar de estado e criar compromissos, se houver.
7. Acompanhar consequência na mesma thread/registro.
8. Voltar ao projeto anterior com filtros e posição preservados.

A crise cria drama por suas escolhas e consequências, não por desorientar a navegação.

#### 5.3 Quero explorar o mundo sem jogar só pela eficiência

1. Escolher Mundo inteiro ou um contexto acompanhado.
2. Abrir cidade, cena, época ou relação de interesse.
3. Consultar informações, história e pessoas conhecidas.
4. Seguir um interesse opcional ou simplesmente explorar.
5. Encontrar caminhos para ações existentes: scout, show, repertório, imprensa, política ou submundo quando válidos.
6. Manter registros e objetivos escolhidos no acompanhamento.
7. Voltar ao Cockpit sem que a exploração tenha desligado a simulação ou criado tarefas obrigatórias artificiais.

**Diversão não é sinônimo de maximizar caixa.** O design precisa permitir curiosidade, experimentação, risco artístico e histórias memoráveis.

#### 5.4 Quero voltar depois de duas semanas sem jogar

1. Escolher um save com versão, data e contexto legíveis.
2. Receber a retomada opcional do que estava em curso.
3. Abrir um compromisso ou projeto acompanhado.
4. Consultar decisões recentes e cenas sem executar novamente seus efeitos.
5. Ajustar o acompanhamento e continuar a partir do checkpoint real.

### 6. Onde eu começaria: ordem de entrega

#### Etapa A — Garantir preservação e coerência

1. Inventário completo de rotas, ações, conteúdo e estados de disponibilidade — M01.
2. Separação de preferências e regras/passaporte — M30.
3. Padrão de resumo/detalhe/histórico e componentes — M03 e M06.
4. Ficha contextual e retorno confiável — M05.
5. Fonte comum de ocorrências e vínculos — M07.

**Saída:** nenhuma área órfã, todos os destinos localizáveis e a mesma entidade/ocorrência reconhecida nas diferentes telas.

#### Etapa B — Fechar um ciclo realmente fluido

1. Próximo passo e resolução de impedimentos — M15.
2. Projeto com dependências — M08.
3. Agenda e capacidade integradas — M09.
4. Decisões com trade-offs claros — M13.
5. Revisão antes do avanço — M10.
6. Orientação inicial por papel — M16.

**Saída:** completar um primeiro ciclo sem precisar descobrir regras por erro ou consultar uma explicação fora do jogo.

#### Etapa C — Reduzir repetição sem remover agência

1. Avanço por critério — M11.
2. Delegação com mandato — M12.
3. Acompanhamentos pessoais — M04.
4. Atalhos por intenção — M02.
5. Retomada de save — M17.
6. Legibilidade e mobile — M18 e M19, com ajustes acessíveis básicos antecipados se necessário.
7. Performance — M29, tratada em paralelo sempre que uma alteração causar regressão.

**Saída:** menos navegação repetitiva e mais controle consciente do ritmo.

#### Etapa D — Tornar a profundidade mais prazerosa

1. Presets de apresentação — M20.
2. Comparação contextual — M21.
3. Mundo contextual e inteiro — M23.
4. Relações conhecidas — M22.
5. Consequências e cenas conectadas — M14 e M24.
6. Enciclopédia, revisões de fase e interesses — M25, M26 e M28.
7. Planejamento de cenários — M27, começando pelo orçamento, não por um clone de simulação.

**Saída:** exploração e trajetória pessoal mais legíveis, sem transformar a campanha numa execução mecânica de tarefas.

**Não prometo prazos aqui.** O esforço depende de como o estado, as rotas e os eventos estão estruturados no código. Antes de estimar, fazer uma leitura técnica curta das fundações e reaproveitar os módulos existentes.

### 7. Regras técnicas para não perder nada na reorganização

#### 7.1 Separar simulação e apresentação

1. O motor determina estado, custos, tempo, escolhas e consequências.
2. Uma camada de consulta calcula o que pode ser apresentado ao jogador, respeitando o conhecimento disponível.
3. Preferências definem densidade, acompanhamento e interrupções.
4. Ações de interface enviam comandos aos mesmos validadores, qualquer que seja a tela de origem.
5. A renderização apresenta o resultado sem alterar RNG ou regras por conta própria.

[INFERÊNCIA] Essa separação tende a reduzir divergências e ações duplicadas, mas sua viabilidade deve ser verificada no bundle atual. Não exige reescrever tudo antes de obter melhorias pequenas.

#### 7.2 Entidades e ocorrências com identidade estável

Um artista, contrato, projeto ou decisão mantém seu ID em todas as vistas. Uma mensagem pode referenciar a mesma ocorrência sem criar outra ação. A resposta é idempotente: repetição de clique não cobra duas vezes ou assina duas vezes.

**Unificar referência não significa apagar textos duplicados que tenham valor narrativo.** Uma carta e uma reportagem sobre o mesmo fato podem ser dois documentos distintos, ligados à mesma ocorrência.

#### 7.3 Disponibilidade não é desaparecimento

1. No índice completo, registrar destinos e suas condições.
2. Na área contextual, mostrar o que é relevante agora.
3. Quando uma ação não pode acontecer, explicar era, papel, recurso ou pré-requisito.
4. Na busca, permitir encontrar a explicação sem oferecer execução inválida.
5. Não liberar informação secreta apenas porque o índice é completo.

#### 7.4 Preservação de assets e performance

Identificar visuais únicos, referências, sprites e textos completos antes de otimizar. Usar índices e reutilização para evitar cópias desnecessárias; carregar/decodificar por demanda quando possível. Se uma distribuição modular for considerada, manter uma opção completa/offline e declarar como todos os conteúdos continuam acessíveis.

**Não aceitar “ficou leve porque removemos 2.000 artistas”.** Isso quebra o objetivo da proposta.

### 8. Como provar que ficou melhor sem perder conteúdo

#### 8.1 Teste de preservação

1. Inventariar todas as rotas e ações antes do redesenho.
2. Relacionar cada uma ao destino depois da alteração.
3. Verificar aliases, contexto, disponibilidade e índice completo.
4. Comparar inventário de artistas, cenas, relações, documentos e assets por identificadores estáveis; contagem sozinha não prova equivalência.
5. Testar importação/exportação e backups, respeitando compatibilidade entre versões.
6. Executar partidas com a mesma seed e o mesmo conjunto de comandos, ignorando apenas diferenças de apresentação, para detectar alterações acidentais na simulação.
7. Validar que modo de apresentação, ordenação e favoritos não mudam os resultados do motor.

#### 8.2 Teste de jogabilidade

Aplicar as mesmas tarefas na versão de referência e na reorganizada: encontrar Submundo, preparar um disco, explicar uma variação de caixa, resolver um conflito de agenda e retomar uma campanha.

Observar:

1. Conclusão sem ajuda externa.
2. Tempo gasto em navegação, separado do tempo legítimo de ler e decidir.
3. Retornos desnecessários e perda de contexto.
4. Erros por pré-requisito não compreendido.
5. Compreensão da resposta padrão e das consequências.
6. Facilidade de encontrar conteúdo completo.
7. Sensação de controle, interesse e vontade de continuar.

Reduzir cliques não é o único objetivo. Um clique que abre uma escolha interessante pode ser melhor que uma automação silenciosa.

#### 8.3 Metas iniciais propostas, não resultados

1. **Preservação:** nenhum destino inventariado fica sem acesso ou explicação; nenhum registro/asset é descartado pela mudança de UI.
2. **Localização:** tarefas frequentes têm um caminho de acesso pelo contexto ou por busca sem depender de um termo interno desconhecido.
3. **Compreensão:** jogadores conseguem explicar o próximo pré-requisito e a resposta padrão antes do avanço.
4. **Controle:** ninguém relata contratação, gasto ou consequência por uma delegação que não autorizou.
5. **Continuidade:** consultar ficha e voltar não perde filtros/posição; carregar não cria passagem de tempo não prevista.
6. **Performance:** nenhuma regressão significativa nas tarefas frequentes; definir o orçamento quantitativo após medir dispositivos-alvo.

Evitar criar metas percentuais de retenção ou diversão sem baseline. Se usar telemetria, começar com coleta mínima, preferencialmente local no teste, e não armazenar textos pessoais da campanha ou introduzir envio externo sem decisão explícita.

### 9. O que eu não faria

1. Não reduzir o banco de artistas, cenários, histórias ou referências para simplificar a experiência.
2. Não criar doze novos menus para apresentar as novas ideias.
3. Não manter duas árvores de navegação com nomes e destinos diferentes sem fonte comum.
4. Não transformar toda decisão em um modal obrigatório.
5. Não adicionar novos narradores/assistentes concorrentes ao narrador já escolhido.
6. Não usar uma pontuação única para dizer qual artista ou escolha é “melhor”.
7. Não converter todos os eventos em tarefas operacionais: parte do prazer é explorar e acompanhar histórias.
8. Não exigir metas econômicas para liberar conteúdo pessoal ou cultural já existente.
9. Não permitir que preferências de apresentação mudem dificuldade ou fidelidade histórica sem aviso.
10. Não chamar um componente isolado de entrega concluída se o fluxo não funciona de ponta a ponta.
11. Não prometer migração de save antes de testar o schema.
12. Não aumentar o pacote de conteúdo antes de fechar os principais vínculos de interface e estado.

### 10. Briefing pronto para encaminhar

> Quero reorganizar o Masters sem remover nenhuma mecânica, personagem, página, texto, evento, cena, referência ou possibilidade de ação. Aproveitem os oito grupos existentes e criem um catálogo único de rotas/aliases para Essencial, Completa, busca e links contextuais. O índice integral deve continuar acessível, com explicação de indisponibilidade por era/papel quando necessário. Padronizem resumo, detalhe e histórico; consultas devem preservar origem, filtros, scroll e foco. Conectem ocorrência, inbox, decisão, compromisso e consequência por IDs estáveis, sem duplicar execução nem apagar documentos. Projetos devem mostrar etapas/dependências, agenda e recursos; ações impedidas precisam explicar o motivo e abrir caminhos válidos. O avanço deve declarar respostas padrão e compromissos; delegação é opt-in, limitada e auditável. Preservem a liberdade de explorar o mundo e a trajetória pessoal, em vez de transformar tudo em tarefa de produtividade. Preferências de leitura/interrupção não mudam regras, RNG ou informação disponível. Validem o inventário antes/depois, o ciclo completo por papel, compatibilidade de saves e mobile. A inbox, formação histórica, bonecos, promessas e final já em desenvolvimento são dependências desta integração, não implementações paralelas. Comecem pelas fundações e por um ciclo completo; deixem rede de relações, coleções e planejamento sofisticado para depois.


<a id="parte-ii"></a>

## Parte II — Sistema global de informação, UI, UX, design e layout

### G01 — A regra do redesenho: melhorar o acesso, não reduzir o jogo

O novo layout deve separar três perguntas: **onde estou**, **o que posso decidir** e **onde encontro o restante**. Informação decorativa pode perder destaque; informação existente não pode perder acesso. Dados essenciais à decisão ficam perto da ação, e o conteúdo integral mantém um destino claro.

**[INFERÊNCIA]** O maior ganho provável está em consistência e continuidade entre telas, não em aumentar o número de painéis. Essa hipótese precisa ser validada no ciclo completo. A aparência mais limpa não prova que a jogabilidade melhorou.

A base visual deve preservar as decisões já tomadas: personagens procedurais no estilo antigo; ambientes e cidade com o visual novo; ícones, capas e logos conforme sua reversão solicitada. Não transformar o redesenho de UI em uma nova substituição de arte. Os desenhos de referência continuam preservados.

#### Três dimensões independentes

1. **Papel e regras da campanha:** o que o jogador pode fazer e qual simulação está em vigor.
2. **Conhecimento do jogador/personagem:** o que é confirmado, observado, estimado, rumor ou desconhecido.
3. **Preferência de apresentação:** o que fica em destaque, a densidade da tela e como interrupções são apresentadas.

Um preset visual não pode alterar as duas primeiras dimensões. Uma tela enxuta não pode mostrar a probabilidade secreta de um hit para compensar menos texto.

### G02 — Endereço canônico e modelo de navegação

Preservar os oito macromenus. Todos os destinos derivam de um registro comum. Uma tela recebe nome estável, aliases, grupo, entidade relacionada, condição de disponibilidade, caminho de retorno e referência de ajuda.

A distribuição proposta das responsabilidades é:

1. **Cockpit:** decisão do presente, acompanhamento, correspondência e revisão de passagem do tempo.
2. **Sede:** recursos físicos e operação; equipe aparece em contexto com link para sua ficha canônica.
3. **Pessoas:** pessoas e atos musicais; lista, ficha, formação, recrutamento e relações conhecidas.
4. **Projetos:** iniciativas criativas, repertório, produção, lançamentos e catálogo.
5. **Ao vivo:** entidades de evento/turnê e suas vistas logísticas, artísticas e financeiras.
6. **Mundo:** exploração e contexto; paradas, mercados, cidades, cenas, mídia, política, rivais, cultura e entrada própria do Submundo.
7. **Gestão:** contratos e finanças, com os mesmos objetos referenciados por artistas/projetos.
8. **Você:** personagem e trajetória, com vínculos às decisões e aos acontecimentos de toda a campanha.

Preferências, ajuda, índice completo e ficha da campanha são **utilidades globais**, não mais quatro macromenus. A central de campanha pode abrir pela tela inicial, pelo salvar/carregar ou por configurações, mas consulta a mesma campanha.

#### Breadcrumbs e retorno

Mostrar o caminho de endereço e, separadamente, a origem da investigação. “Pessoas › Banda › Formação” diz onde a entidade mora; “Voltar à comparação” restaura o contexto de onde foi aberta.

1. Abrir entidade na ficha contextual.
2. Se necessário, abrir sua página integral.
3. Restaurar origem, seleção, filtros, scroll e foco ao voltar.
4. Manter uma opção de retornar ao Cockpit sem perder trabalhos em rascunho.
5. Sinalizar alterações não salvas antes de uma saída que realmente as descartaria.

Não perguntar ao usuário a cada navegação inofensiva. Confirmação é útil quando há perda efetiva, custo ou irreversibilidade, não como decoração de todos os botões.

#### A busca como índice de capacidades, não apenas de títulos

A busca deve aceitar nomes de páginas, entidades, intenções e aliases. Os resultados precisam dizer seu tipo: área, pessoa, projeto, ocorrência, documento ou ajuda. Buscar “Submundo” não pode apresentar somente um artigo de ajuda quando existe uma área acessível.

Distinguir nomes duplicados pelo tipo e contexto. Uma pessoa e uma banda podem compartilhar parte do nome; o resultado deve informar qual entidade será aberta. Não revelar conteúdos narrativos ainda secretos por autocompletar.

A XAG 112 recomenda navegação consistente, mais de uma forma de localizar conteúdo complexo e retorno previsível. Esses princípios sustentam o registro único, o índice e a restauração de contexto. [1]

### G03 — Classificar informações pelo papel na decisão

Toda informação deve pertencer a uma categoria explícita:

1. **Identidade:** de quem/qual projeto estamos falando.
2. **Situação:** estado atual e data à qual ele se refere.
3. **Decisão:** opções disponíveis e seus trade-offs conhecidos.
4. **Restrição:** prazo, orçamento, capacidade, era ou pré-requisito.
5. **Explicação:** origem do dado, regra ou fator observado.
6. **Evolução:** comparação com outro período e registros anteriores.
7. **Narrativa:** documento, cena, relação ou significado da ocorrência.

Não misturar essas categorias em uma longa ficha sem subtítulos. Em uma negociação, o retrato identifica; o prazo restringe; a oferta decide; a história da relação contextualiza. Cada elemento tem uma função diferente.

#### O que deve permanecer visível

Identidade, etapa/status, prazo relevante, custo conhecido comprometido, ação principal e qualquer condição necessária para interpretar a ação. O que aparece nesse conjunto varia por tela; não impor quatro KPIs idênticos a todo o jogo.

#### O que pode ir para detalhe

Distribuições extensas de atributos, documentos anteriores, explicações de fórmulas, série histórica e texto narrativo integral. Mover significa oferecer acesso nomeado e fácil, não esconder atrás de um ícone sem rótulo.

#### O que não pode ficar somente em tooltip

Custo, prazo, consequência de resposta padrão, restrição de disponibilidade, condição de cancelamento e motivo de incompatibilidade de save. Tooltip serve para complementar; não pode ser a única fonte de uma informação necessária.

### G04 — Um contrato de dados por campo

Definir para cada campo: nome legível, origem, unidade, período de referência, disponibilidade, atualização e regras de apresentação. A tela não deve decidir sozinha o significado do campo.

Exemplos:

1. **Caixa:** estoque de dinheiro na data atual, não receita do mês.
2. **Variação de caixa:** diferença entre dois pontos definidos; mostrar o período.
3. **Resultado:** indicar se o indicador segue caixa ou outro regime do jogo; não inventar contabilidade não implementada.
4. **Orçamento do projeto:** separar aprovado, gasto e compromisso já assumido; projeção é uma categoria diferente.
5. **Fôlego:** identificar despesas/premissas usadas; se não existe projeção válida, dizer indisponível em vez de exibir uma precisão falsa.
6. **Habilidade:** distinguir atributo conhecido de avaliação do olheiro. Não mostrar segredo por uma mudança de componente.
7. **Popularidade/fama:** mostrar escala e população/contexto quando a regra tiver essas distinções. Uma fama global não pode ser apresentada como notoriedade local sem conversão explícita.
8. **Formação:** pessoa, funções, intervalo válido e fonte da política histórica. Contador depende do mesmo conjunto temporal exibido.
9. **Royalties:** percentual e base de incidência definida pelo contrato. Um número sem sua base não basta.
10. **Data de evento:** data da campanha e origem da informação, sem confundir data de gravação do save com tempo do mundo.

“Desconhecido”, “não aplicável”, “zero”, “estimado” e “não atualizado” são estados diferentes. Usar um traço para todos eles deixa a tela compacta, mas ambígua.

#### Precisão e arredondamento

A apresentação pode arredondar no resumo, preservando precisão na ficha. Finanças usam centavos internamente quando esse é o modelo vigente; um resumo em unidades inteiras deve permitir abrir o valor preciso. Não exibir uma diferença visual entre partes de uma soma como se fosse um erro sem considerar arredondamento.

Moeda, período e sinal aparecem no lugar de decisão. Abreviações são opcionais em modo compacto, com expansão legível. Nenhum dado crítico deve depender de reconhecer siglas internas.

### G05 — Estrutura espacial desktop, tablet e celular

Os números abaixo são **parâmetros iniciais de proposta**, não medidas universais de acessibilidade nem benchmarks aprovados. O layout deve mudar quando o conteúdo deixar de caber, incluindo zoom e ampliação de texto.

#### Desktop amplo

1. Barra superior discreta com data completa, estado de save, busca e controle de tempo. Ponto de partida: cerca de 64 CSS px de altura, ajustável quando conteúdo exigir.
2. Navegação lateral com os oito grupos e utilidades; largura inicial na faixa de 216–248 CSS px.
3. Área principal flexível com título, filtro/contexto e corpo de decisão.
4. Inspetor contextual opcional com largura inicial na faixa de 320–400 CSS px, apenas quando houver espaço útil.
5. Quando o inspetor prejudicar leitura, abri-lo como painel temporário ou página; não espremer o corpo.

Não obrigar duas barras superiores completas, com data/caixa duplicados e dezenas de atalhos. Um contexto local pode complementar a barra global, mas precisa trazer informação diferente.

#### Tablet e desktop estreito

A faixa de 768–1199 CSS px é uma hipótese inicial para testes, não um limite fixo do dispositivo. Menu pode recolher mantendo rótulos acessíveis; inspetor vira painel; listas reduzem colunas e preservam os campos completos em detalhe.

Evitar mostrar ícones isolados sem significado. Um menu recolhido precisa de expansão por clique/toque, sem depender de hover.

#### Celular

Uma coluna, ação principal claramente localizada e navegação inferior com atalhos escolhidos mais Menu completo. O número proposto de atalhos é configuração inicial, não motivo para excluir destinos.

1. Título e contexto antes do conteúdo.
2. Identidade e situação em bloco curto.
3. Informação necessária à próxima ação.
4. Detalhes em listas/abas nomeadas, sem eliminar os campos originais.
5. Ações em área estável que não cubra o conteúdo nem o teclado virtual.
6. Retorno com posição e estado preservados.

Tabelas largas podem manter sua vista original disponível e oferecer alternativa de cartões, lista de campos ou comparação por um critério. “Mobile simplificado” não pode significar jogo incompleto.

#### Sticky sem sufocar a leitura

Fixar no máximo o necessário ao contexto atual: identidade, ação relevante ou cabeçalho de comparação. Testar a área real restante com teclado aberto, zoom, legendas e mensagens de erro. Fixar tudo transforma uma melhora de navegação numa tela quase sem conteúdo.

### G06 — Direção visual: um jogo de música, não um ERP genérico

A atmosfera deve surgir de personagens, ambientes, capas, objetos, retratos, registros e cenas — não de ruído em todo espaço vazio. O contraste entre arte expressiva e controles claros ajuda a manter identidade.

#### Paleta semântica proposta

Usar azul/noite como base e superfícies discretamente diferentes; ouro quente como ação principal/ênfase; uma cor de informação/planejamento; verde para conclusão válida; âmbar para atenção; vermelho para risco/erro. **Esses são papéis de cor, não códigos HEX finais aprovados.**

Toda cor importante acompanha texto, ícone ou forma. Um artista não deve receber vermelho apenas por ser artisticamente controverso: risco econômico, risco de agenda e preferência artística são coisas distintas.

Reservar saturação para decisão e exceção. Dez cards dourados simultâneos anulam a prioridade. Fundos de cards podem usar borda e espaçamento em vez de sombras/glows pesados.

#### Tipografia e densidade

1. Fonte de leitura limpa para descrições, negociações, documentos e números.
2. Fonte temática/decorativa em títulos curtos ou identidade, sem impor pixel font ao corpo inteiro.
3. Hierarquia consistente de título, subtítulo, corpo, metadado e anotação.
4. Ponto de partida de corpo em 16 CSS px e metadados legíveis; preferências permitem ampliar. Não confundir CSS px com pontos de plataformas nativas.
5. Evitar peso muito fino e texto cinza quase invisível sobre azul.
6. Limitar largura de leitura e comprimento de linha; uma carta não deve atravessar todo um monitor ultrawide.
7. Alinhar valores comparáveis e usar algarismos tabulares quando a fonte permitir.

A XAG 102 orienta contraste de pelo menos 4,5:1 para texto/informação de tamanho padrão e 3:1 para elementos de grande escala e texto de elementos inativos, com definições próprias de escala por plataforma. Para o Masters web, adotaria **4,5:1 como alvo inicial conservador para texto informativo**, inclusive ao reorganizar sobre fundos ilustrados, verificando os estados reais. [4]

#### Espaçamento, bordas e agrupamento

Adotar tokens de espaçamento reutilizáveis, por exemplo 4, 8, 12, 16, 24 e 32 CSS px, como proposta inicial. Grupos relacionados ficam próximos; seções diferentes ganham separação. Um card não é necessário para cada frase.

Manter cantos/bordas coerentes com o estilo atual. O redesign deve melhorar contraste e organização sem importar uma estética corporativa que apague a identidade musical.

#### Ícones

Ícone acompanha verbo em ações importantes. “Disco” pode representar lançamento, repertório ou catálogo; o rótulo esclarece o destino. Preservar ícones escolhidos, com variantes de foco/seleção e nomes acessíveis. Não atribuir função só por um desenho parecido com o do módulo anterior.

### G07 — Componentes que merecem padronização

#### Cartão de situação

Identidade, status, data/prazo, origem do dado, próximo passo e link para detalhe. Um cartão precisa dizer por que está na tela: acompanhamento do jogador, risco com prazo, mudança recente ou destaque do mundo.

#### Linha de lista

Nome/tipo, status, poucos campos comparáveis e ação de abrir. Ações secundárias ficam acessíveis, mas não tornam a linha uma barra com oito botões. Seleção em lote é diferente de abrir a entidade; o controle deve deixar isso claro.

#### Comparação

Critérios e unidades comuns, origem/confiança dos dados, alinhamento visual e campos desconhecidos explícitos. Não calcular uma nota global para decidir automaticamente pelo jogador.

#### Formulário de plano/oferta

Agrupar campos por decisão: recurso, prazo, dinheiro, compromisso e opção criativa. Mostrar unidade junto do campo. Validar perto da entrada sem apagar texto válido. Manter rascunho e resumo antes do compromisso real.

#### Card de ocorrência/decisão

Contexto, prazo, opções, custo conhecido, padrão de ausência de resposta e vínculos para entidades. Corpo integral e narrativa permanecem acessíveis. Um destaque no Cockpit não é cópia executável diferente da mensagem na inbox.

#### Registro de consequência

Decisão original, efeito observado, fatores que a regra permite explicar e links para história/projeto/pessoa. Não confundir correlação narrativa com causalidade registrada.

#### Documento/cena

Conteúdo completo com autoria/canal/data da campanha, opções de leitura/replay e referências. Ações operacionais não aparecem sobre a imagem de modo que tapem a cena; a transcrição integral é outra forma de acesso, não substituição obrigatória.

### G08 — Estados de interface que precisam de projeto, não improviso

#### Vazio

Distinguir “não há dados ainda” de “seu filtro não encontrou resultados” e “essa capacidade não está disponível”. Oferecer o próximo caminho válido e acesso ao universo/índice completo quando apropriado.

#### Carregando

Preservar estrutura e informar operação. Skeleton pode representar layout, sem fingir conteúdo. Durante processamento do tempo, mostrar progresso real quando disponível e impedir execução duplicada. Não inventar porcentagem de conclusão se o motor não sabe calculá-la.

#### Erro de entrada

Explicar campo, motivo e correção. Manter os demais valores. Não usar um toast efêmero como único aviso de que o orçamento é inválido.

#### Conflito de recursos

Identificar recurso, período e projeto afetado; oferecer consulta e reagendamento permitido. Dizer se cancelar tem custo. Um indicador vermelho sem texto não resolve o planejamento.

#### Informação parcial ou desatualizada

Exibir fonte/data e limite do conhecimento. Permitir buscar atualização por mecânicas existentes, se houver. Não mascarar um relatório antigo como dado atual.

#### Indisponível por regra

Mostrar causa: era, papel, pré-requisito, sigilo ou incompatibilidade. Não sugerir que um upgrade visual desbloqueia uma regra histórica inexistente. Para sigilo, explicar o limite sem revelar o segredo.

#### Salvo, salvando e falha de save

Distinguir alteração em memória, checkpoint confirmado e exportação de arquivo. A barra não pode dizer “salvo” antes da confirmação do armazenamento. Em falha, preservar estado quando possível e oferecer exportação/diagnóstico existente, sem prometer sincronização não testada.

#### Ação irreversível

Mostrar efeito real e condição de cancelamento. Confirmar de forma proporcional e gerar checkpoint quando suportado. O botão de voltar não pode prometer desfazer uma contratação já processada.

### G09 — Foco, teclado, toque e comportamento de modais

1. Usar controles semânticos e nomes acessíveis, não somente elementos visuais clicáveis.
2. Foco segue ordem de leitura e permanece visível.
3. Um modal contém seu foco e permite sair pelo caminho adequado, preservando estado.
4. Ao fechar, foco volta ao controle que o abriu ou ao próximo destino lógico.
5. Não abrir modal por cima de modal para consultar todas as fichas; preferir um inspetor reutilizável ou página.
6. Atalhos não disparam enquanto o jogador digita em um campo e não devem sobrescrever comandos críticos do sistema sem alternativa.
7. Busca, voltar, abrir detalhe e resolver decisão precisam de alternativas sem mouse.
8. Arrastar calendário ou mapa pode existir como conveniência, mas sempre há comando equivalente.
9. Botões de toque devem ter área e separação confortáveis. Uma meta inicial de cerca de 44 CSS px de área é proposta para testes web, não conversão direta de pontos nativos.

A documentação da Apple apoia texto ampliável, controles suficientemente dimensionados e espaçados, alternativas a gestos e a não dependência de cor/som. Suas dimensões são específicas de plataforma; não devem ser copiadas como obrigação universal de CSS. [5]

### G10 — Ritmo de informação, som e animação

Classificar apresentação por importância e preferência, não apenas por frequência. Uma mudança de era ou ruptura de relação pode merecer espaço; vinte atualizações rotineiras podem ir para um boletim com links individuais.

1. **Crítico com prazo:** visibilidade persistente e política explícita de avanço.
2. **Operacional acompanhado:** card ou atualização no projeto.
3. **Histórico/narrativo:** registro integral e apresentação conforme preferência.
4. **Ambiental:** mundo/arquivo, com acesso a todo o conteúdo.

Não descartar a ocorrência quando o jogador escolhe menos interrupções. Não classificar tudo como crítico para garantir cliques.

Sons podem distinguir conclusão, aviso e cena; permitir volumes separados e silêncio. Toda informação sonora importante tem equivalente visual/textual. Animação deve orientar mudança de estado, não atrasar ações repetidas. Oferecer movimento reduzido e evitar piscadas persistentes.

Na prática, o ritmo bom alterna planejamento, decisão, execução e interpretação. Não significa aumentar a velocidade de processamento a ponto de o jogador não perceber o que escolheu.

### G11 — Padrões de escrita e informação que tornam a tela compreensível

Usar verbos específicos: “Abrir negociação”, “Agendar gravação”, “Consultar contrato”. “Continuar” só é suficiente quando o próximo passo está claro. Evitar “Confirmar” sem nomear o compromisso.

Uma explicação de impedimento segue o formato: **situação → motivo → caminho válido**. Exemplo proposto: “Esta faixa ainda não pode ser gravada: falta repertório concluído. Ver composição ou selecionar outra faixa.” Adaptar a regra à implementação real, não impor esse exemplo onde o jogo permita outra solução.

Uma informação econômica segue: **valor → unidade/base → período → condição**. Uma promessa segue: **entrega → prazo → responsável → consequência conhecida**. Uma avaliação segue: **observação → fonte → data → confiabilidade/limite**.

Escolher um vocabulário de produto e manter aliases. Ato é um termo útil de modelo, mas não precisa substituir “artista/banda” em toda frase visível. Texto de era pode enriquecer correspondência sem atrapalhar o entendimento de botões.

### G12 — Reorganização não é reescrita total

Entregar em fatias de fluxo, começando por um ciclo completo. Um novo componente pode adaptar o estado antigo antes de exigir um modelo novo. Não mover todas as páginas num único commit sem mapa de rotas e testes.

1. Registrar os identificadores e relações existentes.
2. Criar o registro canônico com aliases/redirects.
3. Padronizar leitura e links sem mudar regras.
4. Integrar agenda/projeto/decisão por um fluxo piloto.
5. Validar preservação e simulação.
6. Expandir o padrão para as outras telas.
7. Só introduzir novas mecânicas quando forem distintas de melhorias de apresentação.

No plano técnico, testar também campanha grande, lista longa, ficha com histórico extenso, geração de visuais sob demanda e modo offline. Performance não é uma autorização para cortar conteúdo.


<a id="parte-iii"></a>

## Parte III — Reorganização detalhada de 17 telas

### S01 — Cockpit

#### 1. Tarefa principal e limites

O Cockpit deve oferecer uma leitura rápida do estado atual do jogo, destacar o que pede atenção, permitir acompanhar indicadores e próximos marcos e abrir caminhos para explorar as áreas existentes. É a tela de orientação e decisão imediata, não um centro alternativo de gestão de mensagens.

**Limite:** esta análise cobre apenas S01. Não redesenha o corpo da inbox, sua lista, detalhe, categorias ou ações. Se um assunto do bloco Agora tiver origem em mensagem, a proposta é mostrar um resumo curto e um atalho para a inbox/destino canônico existente, sem duplicar a mensagem, estado ou ação.

#### 2. Estado conhecido a reaproveitar

**Observação anterior — briefing comum:** o produto organiza oito grupos principais: Cockpit, Sede, Pessoas, Projetos, Ao vivo, Mundo, Gestão e Você. O Cockpit apresenta indicadores de mês, caixa, fôlego e fama; o bloco Agora prioriza até três assuntos. Busca por Ctrl+K, modos Essencial/Completa, favoritos de páginas e avanço por diferentes períodos/“Até já” já existem. Há tutorial que explica a tela inicial.

Esses pontos são a base disponível, não uma auditoria nova nem prova de que todo save preenche todos os dados. Não há evidência fornecida sobre fórmulas, moedas, atualização, ordenação do Agora, critérios dos marcos ou regras de disponibilidade; devem ser mostrados somente quando o estado existente os fornece. Informação desconhecida não deve virar zero. O avanço temporal não deve ser apresentado como simples navegação se a ação realmente altera o save: manter explícita sua ação e confirmação conforme o comportamento atual. A proposta não muda regra, RNG, segredo, calendário ou disponibilidade histórica.

#### 3. Hierarquia de informação

- **Topo / permanente:** identidade da tela, período atual, quatro indicadores (mês, caixa, fôlego, fama), acesso à busca Ctrl+K, modo Essencial/Completa e caminho para os oito grupos. Os indicadores permanecem identificáveis e com unidade/período explícitos quando conhecidos. Sem valor confiável, exibir “desconhecido/não disponível”, nunca um zero substituto.
- **Corpo / decisão:** “Agora”, com no máximo os três assuntos existentes prioritários e um próximo passo contextual; em seguida, acompanhamento escolhido pelo jogador e próximos marcos que o estado atual efetivamente conhece. Cada item conduz à entidade/tela canônica, não cria cópia de tarefa ou ocorrência. **PROPOSTA:** esclarecer motivo, fonte e disponibilidade de cada item sem inventar causalidade.
- **Detalhe:** abrir contexto sob demanda: significado disponível do indicador, fonte/data/confiabilidade se existentes, situação do marco, dependências conhecidas e ação válida. O detalhe complementa, não esconde, campos essenciais para uma decisão.
- **Histórico:** acesso ao período anterior ou à cronologia/histórico existente, com período claramente rotulado. Não presumir que existe log completo ou reconstruir causa retrospectivamente. Comparações indisponíveis devem dizer isso.

#### 4. Reorganização espacial

**Desktop — wireframe textual (PROPOSTA):**

```text
[Masters / Cockpit] [período]       [Ctrl+K Buscar] [Essencial | Completa]
[8 grupos existentes, sem novos macromenus]
[Mês] [Caixa] [Fôlego] [Fama] — valor + unidade/período + indicação de fonte se conhecida
[Agora: até 3 assuntos]                 [Acompanhar: seleções do jogador]
[Próximos marcos e dependências conhecidas]       [Período anterior / histórico]
```

Usar largura para deixar Agora e acompanhamento legíveis em paralelo; marcos e histórico formam uma faixa abaixo ou painel adjacente, sem empurrar a navegação para um nono grupo. Ações de avançar período ficam separadas visualmente dos atalhos de consulta.

**Mobile — wireframe textual (PROPOSTA):**

```text
[Cockpit] [período] [buscar]
[4 indicadores em cartões empilhados ou faixa acessível]
[Agora: cartões completos, um por linha]
[Acompanhar] [Próximos marcos]
[Menu dos 8 grupos] [período/histórico] [ação de avanço separada]
```

A amostra anterior de 390×844 reportou barras somando cerca de 116 px e oito destinos pequenos no rodapé; é observação da amostra, não auditoria física. Mobile deve usar composição própria: menu acessível para os mesmos oito grupos, alvos de toque adequados, ordem vertical e detalhes expansíveis, sem depender de hover, arrasto, cor ou som. Todos os indicadores, ações e campos essenciais continuam acessíveis, mesmo que exijam rolagem; não substituir acesso por uma versão reduzida sem rota para o conjunto completo.

#### 5. Campos concretos

A fonte específica e a semântica de alguns valores não foram confirmadas no briefing. A interface deve consumir o estado existente e expor a unidade/período quando disponíveis, sem deduzir fórmula.

- **Período/mês atual** — topo; calendário/estado temporal do save; mês/ano conforme fornecido; disponibilidade ligada ao calendário do save.
- **Caixa** — topo; estado financeiro do save; valor monetário e moeda somente se informados, período/snapshot conforme fonte; indisponível ou desconhecido se ausente.
- **Fôlego** — topo; estado que alimenta o indicador existente; unidade e janela precisam ser as fornecidas pelo sistema; não reinterpretar; desconhecido se não calculável.
- **Fama** — topo; estado que alimenta o indicador existente; unidade/escala e período conforme fornecidos; não inventar escala.
- **Assunto Agora** — corpo; ocorrência/tarefa já selecionada pelo sistema; unidade por item, prazo se existir; até três conforme comportamento observado; vazio se nenhum assunto elegível.
- **Origem/entidade do assunto** — detalhe do cartão Agora; entidade canônica do estado; ID/tipo e localização; disponível se houver referência válida, senão sem atalho quebrado.
- **Próxima ação** — cartão Agora/detalhe; ação válida do destino associado; unidade por ação; apenas se o sistema a disponibilizar, não sugerir ação inválida.
- **Item acompanhado** — corpo; configuração de acompanhamento existente ou, se aprovada, preferência proposta; valor/unidade segundo o indicador; somente itens elegíveis e selecionados.
- **Próximo marco** — corpo/detalhe; calendário, projeto ou progressão já presente no save; data/período e critério conforme fornecidos; não exibir prazo ou condição inferidos como fato.
- **Modo de apresentação** — topo/configuração; preferência Essencial ou Completa já existente; valor categórico, sem período; disponibilidade conforme modo atual.
- **Favorito** — navegação; configuração de página existente; destino categórico; disponível conforme configuração do jogador.
- **Avanço temporal** — controle separado; mecanismo de avanço existente; período ou opção “Até já”; disponível apenas segundo condições e regras atuais do jogo.

#### 6. Fluxo principal

1. Ao entrar, apresentar período e indicadores do estado atual, preservando os modos Essencial/Completa.
2. Ler Agora; selecionar um item abre o destino canônico e seu contexto, sem abrir uma segunda inbox.
3. Consultar acompanhamento ou marcos; abrir detalhe apenas quando necessário para fonte, critério, dependência ou ação disponível.
4. Explorar por um dos oito grupos, Ctrl+K ou favorito; manter cada destino sob seu grupo canônico e permitir retornar ao Cockpit.
5. Para mudar período, navegar pelo mecanismo existente. Para avançar o tempo, usar a ação existente com revisão/confirmação compatível com o fluxo atual; não confundir avanço com consulta de histórico.
6. Reabrir o Cockpit e confirmar que período, seleção e dados refletem o estado resultante do save.

#### 7. Estados aplicáveis

- **Vazio:** nenhum assunto Agora ou marco elegível; explicar “nenhum item disponível neste estado” e manter navegação/indicadores. Não inventar tarefas.
- **Carregando:** skeletons identificados para indicadores e cartões, sem exibir zeros temporários nem habilitar avanço antes de o estado estar pronto.
- **Erro:** informar qual bloco falhou; preservar o restante da tela, oferecer tentar novamente e não simular valores válidos.
- **Conflito:** se um dado mudou desde a abertura (por exemplo, após avanço ou ação noutro destino), atualizar do estado canônico e sinalizar a atualização; evitar sobrescrever escolha ou atribuir causa não verificada.
- **Indisponível:** distinguir valor desconhecido, dado não fornecido e ação indisponível por condição do jogo; informar o que permanece acessível, sem revelar conteúdo sigiloso nem contornar disponibilidade histórica.

#### 8. Melhorias novas — PROPOSTAS

As prioridades P0/P1/P2 abaixo são prioridade de proposta, não status, prazo ou esforço confirmado. Ganhos esperados são **[INFERÊNCIA]**.

##### UX-S01-01 — Cartões Agora rastreáveis
- **Tipo:** apresentação/integração. **Prioridade:** P1. **Dependências:** M03, M07, M25.
- **User story:** Eu como jogador, Quero entender por que cada assunto aparece no Agora e abrir sua origem, Para decidir o próximo passo sem perder contexto.
- **Critérios:** no máximo três itens; título e resumo existentes; fonte/motivo apenas quando conhecidos; referência ao ID/entidade canônica; ação abre destino único; vazio e indisponível têm texto distinto; nenhuma mensagem é duplicada.
- **Risco:** motivo derivado pode inventar causalidade; não mostrar justificativa não verificada. **[INFERÊNCIA]** Deve reduzir mudança de contexto sem explicação.

##### UX-S01-02 — Indicadores com unidade e comparação explícita
- **Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M03, M21.
- **User story:** Eu como jogador, Quero interpretar os quatro indicadores com seu período e fonte confiáveis, Para comparar o estado sem confundir estimativas com fatos.
- **Critérios:** mês, caixa, fôlego e fama conservam os valores existentes; mostram moeda/unidade, período, fonte/data e incerteza somente se disponíveis; desconhecido não aparece como zero; comparação histórica é rotulada e não fabricada.
- **Risco:** unidade ou baseline inferida engana decisões; quando não confirmada, usar rótulo neutro e não comparar. **[INFERÊNCIA]** Aumenta interpretabilidade sem alterar as mecânicas.

##### UX-S01-03 — Faixa de marcos baseada no estado existente
- **Tipo:** integração/apresentação. **Prioridade:** P1. **Dependências:** M08, M09, M10, M11, M26.
- **User story:** Eu como jogador, Quero ver os próximos marcos e dependências conhecidas no Cockpit, Para planejar sem avançar o tempo às cegas.
- **Critérios:** só listar marcos provenientes de sistemas existentes; mostrar data/condição/dependência apenas quando verificadas; distinguir consulta de avanço; acesso ao destino original; ausência de marcos tem estado vazio; nenhuma nova regra ou alerta altera RNG.
- **Risco:** marcos incompletos ou estimados podem parecer garantidos; rotular fonte e incerteza e não extrapolar calendário. **[INFERÊNCIA]** Facilita planejamento da próxima sessão.

##### UX-S01-04 — Exploração por intenção mantendo os oito grupos
- **Tipo:** apresentação/integração. **Prioridade:** P2. **Dependências:** M01, M02, M18, M19, M25.
- **User story:** Eu como jogador, Quero chegar a um destino por busca, favorito ou grupo existente, Para explorar o jogo sem memorizar onde cada função mora.
- **Critérios:** manter os oito grupos e nomes/destinos canônicos; preservar Ctrl+K, Essencial/Completa e favoritos existentes; menu mobile alcançável por toque e teclado; atalhos cruzados abrem o mesmo destino/ID; não adicionar macromenu nem duplicar inbox.
- **Risco:** reorganização visual pode esconder destinos; testar cobertura de todas as rotas e oferecer acesso integral em ambos os modos. **[INFERÊNCIA]** Pode reduzir esforço de navegação.

#### 9. Preservação e testes

Preservar integralmente dados, mecânicas, conteúdo, ações, regras, IDs, sigilo, disponibilidade histórica, avanço temporal e oito grupos. Reutilizar entidades/destinos existentes; favoritos e modos seguem preferências de apresentação, nunca dificuldade ou política histórica. Não remover informação essencial ao decidir; abas/detalhes devem dar acesso ao conteúdo integral. Inbox continua sendo única e canônica. Propostas não são implementação comprovada.

**Testes de aceitação:** (1) conferir que os oito grupos, Ctrl+K, Essencial/Completa, favoritos e avanço temporal permanecem acessíveis; (2) percorrer item Agora até seu destino e validar que ID/ação são os mesmos, inclusive quando a origem for mensagem; (3) validar campos, unidades e desconhecidos contra o save, sem inserir zero/fórmula inventados; (4) verificar vazio, carregamento, erro, conflito e indisponibilidade sem quebrar os demais blocos; (5) testar desktop e viewport móvel de referência, navegação por teclado/leitor de tela e toque, contraste sem dependência exclusiva de cor; (6) comparar antes/depois do avanço apenas estados realmente alterados, sem afirmar balanceamento, causalidade ou precisão não verificados.

### S02 — Correspondência / Inbox

#### Tarefa principal e limites

A Inbox é a superfície de triagem, leitura e encaminhamento de correspondências. Permite reconhecer itens relevantes, abrir mensagem/conversa integral, gerir leitura/estrela/arquivo e, quando existe vínculo explícito, alcançar a decisão correspondente. Este capítulo cobre apenas S02: lista/detalhe, filtros, threads, ações de leitura/estrela/arquivo, ligação a decisão e desktop/mobile. Deve haver um destino canônico; atalhos de outras áreas levam ao mesmo item/ID, sem criar Inbox concorrente.

#### Base observada e limites da evidência

**Observação anterior da revisão Masters 27:** existem categorias não lidas, importantes, pedem resposta e adiadas/arquivo; os cartões expandem inline. Lista/detalhe, estrela própria e tela cheia mobile estavam solicitados/em desenvolvimento, o que não confirma conclusão. Ações de leitura/estrela/arquivo fazem parte do escopo, mas não comprovam implementação ou semântica interna. O branch mencionado não foi inspecionado. Esquema de dados, estados persistidos, canais, IDs/threads, retenção e vínculos com decisões não foram verificados; permanecem desconhecidos. Não se propõe alterar regras, RNG, sigilo, disponibilidade histórica nem conteúdo do jogo.

#### Hierarquia de informação

- **Topo/permanente:** título Correspondência, filtros ativos e contagem de não lidas somente se disponível. Ausência não aparece como zero. Navegação e ações acessíveis; estado não depende só de cor.
- **Corpo/decisão:** lista de mensagens/conversas com assunto/trecho, remetente/participantes e data apenas quando fornecidos. Distinguir não lida, importante, pede resposta e adiada/arquivo; não inferir prioridade narrativa. Ordenação padrão é proposta, não diagnóstico.
- **Detalhe:** conteúdo integral, metadados existentes, estado individual e ações explícitas. “Decisão relacionada” só aparece para vínculo real e abre entidade/ID canônico. Não criar decisão ou presumir que mensagem exige resposta.
- **Histórico:** mensagens da thread em ordem temporal apenas se a relação for verificada; mudanças de estado somente se registradas. Separar eventos de inferências; não fabricar autor, data ou causa.

#### Reorganização espacial proposta

**Desktop — lista e detalhe lado a lado:**

```text
Correspondência [filtro ativo] [pesquisa/contagem, se disponíveis]
[Todas | Não lidas | Importantes | Pedem resposta | Adiadas | Arquivo]
┌ Lista: estado • assunto/trecho • data ┬ Detalhe da seleção ───────────────┐
│ itens/mensagens                       │ remetente/participantes • data    │
│ ...                                   │ conteúdo integral / thread        │
│                                       │ decisão relacionada (se vinculada)│
│                                       │ [Lida/não lida] [★] [Adiar/Arquivar]│
└───────────────────────────────────────┴───────────────────────────────────┘
```

Manter lista, seleção e filtro ao abrir/fechar detalhe. Ações têm rótulo e confirmação visual; oferecer desfazer para arquivar somente se reversão existir. Nenhum controle depende de hover.

**Mobile — lista e detalhe em telas/estados distintos:**

```text
Correspondência [filtros] [filtro ativo]
[cartão: estado + assunto/trecho + remetente/data]
Ao abrir: [← lista/filtro preservado]
Assunto e participantes/data • mensagem ou thread integral
Decisão relacionada (se existir)
[Marcar lida/não lida] [★] [Adiar] [Arquivar]
```

Voltar restaura filtro e posição aproximada. Ações ficam alcançáveis por toque, sem depender de arrastar, hover, cor ou som. A composição muda entre plataformas, não os campos/ações.

#### Campos concretos

“Por mensagem/thread” define unidade de interface, não periodicidade. Disponibilidade descreve evidência, não garantia no save.

- **Categoria/filtro** — Local: topo/lista; fonte: categorias observadas; unidade: caixa; disponibilidade: observado para não lidas, importantes, pedem resposta e adiadas/arquivo.
- **Assunto/identificador legível** — Local: cartão/detalhe; fonte: registro, esquema não verificado; unidade: mensagem/thread; disponibilidade: [INFERÊNCIA], só se fornecido.
- **Trecho de prévia** — Local: cartão; fonte: conteúdo da mensagem; unidade: mensagem; disponibilidade: [INFERÊNCIA], leitura rápida sem substituir texto integral.
- **Remetente/participantes** — Local: cartão/detalhe; fonte: metadados não verificados; unidade: mensagem/thread; disponibilidade: desconhecida, não inventar pessoa/papel.
- **Canal** — Local: detalhe e, se útil, cartão; fonte: metadado existente; unidade: mensagem; disponibilidade: desconhecida; se fornecido, mostrar contexto de era (carta/telefone/e-mail) sem impor canal.
- **Data/ordem temporal** — Local: cartão/detalhe/histórico; fonte: timestamp existente; unidade: instante/data; disponibilidade: não confirmada, não fabricar.
- **Estado de leitura** — Local: marcador, detalhe e filtro; fonte: estado da correspondência; unidade: mensagem; disponibilidade: categoria não lidas observada, persistência/alternância não verificadas.
- **Importante/estrela** — Local: marcador e ação; fonte: estado de importância; unidade: mensagem/thread conforme semântica; disponibilidade: categoria importantes observada, estrela própria solicitada/em desenvolvimento.
- **Pede resposta** — Local: filtro/marcador; fonte: classificação existente, regra desconhecida; unidade: mensagem; disponibilidade: categoria observada, sem obrigação automática.
- **Adiada/arquivo** — Local: filtro/estado do item; fonte: estado da caixa; unidade: mensagem/thread; disponibilidade: categorias observadas, sem prazo ou retenção confirmados.
- **Identidade/membros da thread** — Local: detalhe/histórico; fonte: relação persistida; unidade: conversa; disponibilidade: não confirmada; agrupar apenas com IDs/relação confiáveis.
- **Referência à decisão** — Local: detalhe contextual; fonte: vínculo explícito a entidade/ID canônico; unidade: ação/decisão; disponibilidade: não confirmada, ocultar sem vínculo.

#### Fluxo principal

1. Abrir Correspondência como destino canônico, sem macromenu novo e preservando os oito grupos existentes.
2. Selecionar Todas ou categoria observada; filtros combináveis são [PROPOSTA], dependem de semântica definida. Indicar seleção ativa e opção de limpar.
3. Percorrer a lista; não lida/importante/pede resposta/adiada são sinais independentes, não prioridade narrativa.
4. Abrir item: detalhe adjacente no desktop; tela própria no mobile preservando filtro/posição.
5. Ler conteúdo integral e mensagens relacionadas apenas com vínculo comprovado. Marcação de leitura explícita ou regra claramente indicada; não marcar silenciosamente apenas ao abrir.
6. Estrelar, adiar ou arquivar por ação identificada; refletir somente estado confirmado. Desfazer apenas se suportado.
7. Se houver vínculo explícito, “Abrir decisão relacionada” leva ao ID canônico e preserva contexto de origem (M05/M07); não cria nem altera decisão.
8. Voltar à mesma Inbox/filtro/posição. Atalho externo retorna à origem, sem criar lista paralela.

#### Estados e contingências

- **Carregando:** estrutura esqueleto; contagem provisória não é zero; ações aguardam item identificado.
- **Vazio geral:** informar que não há correspondências disponíveis, sem sugerir exclusão/falha de conteúdo.
- **Filtro vazio:** informar ausência de correspondências e oferecer limpar/alterar filtros, preservando os dados.
- **Erro:** mensagem legível e tentar novamente; preservar filtro/seleção e não perder ação pendente silenciosamente.
- **Conflito/desatualização:** [PROPOSTA] reconciliar pela fonte autoritativa, informar resultado e não mostrar estado de leitura/estrela/arquivo não confirmado.
- **Indisponível/não vinculado:** mostrar conteúdo disponível; não exibir ação quebrada nem inventar vínculo. Campos ausentes — canal, data, thread, contagem — continuam desconhecidos, nunca zero.

#### Melhorias propostas específicas

Todas são **PROPOSTAS**, não fatos implementados. P0/P1/P2 indicam prioridade sugerida, não status, prazo ou esforço confirmado.

##### UX-S02-01 — Leitura persistente em lista/detalhe responsiva
- **Tipo/prioridade:** apresentação / P1. **Dependências:** M03, M06, M18, M19.
- **User story:** Eu como pessoa jogadora, Quero ler uma correspondência sem perder a lista e o filtro, Para retomar a triagem com menos navegação repetida.
- **Critérios:** desktop mantém lista e detalhe; mobile usa tela própria; voltar restaura filtro/posição; texto integral legível e controles acessíveis por toque/teclado.
- **Risco:** [INFERÊNCIA] layout pode esconder informação inline; comparar campos e preservar acesso integral.

##### UX-S02-02 — Filtros visíveis e triagem inequívoca
- **Tipo/prioridade:** apresentação / P1. **Dependências:** M02, M03, M06, M18.
- **User story:** Eu como pessoa jogadora, Quero identificar e trocar rapidamente entre categorias da Inbox, Para priorizar a leitura sem confundir estados diferentes.
- **Critérios:** categorias observadas acessíveis no topo; filtro nomeado e limpável; importante/não lida/pede resposta/adiada não se substituem; contadores só com fonte; combinações somente com semântica definida.
- **Risco:** [INFERÊNCIA] combinações ambíguas podem ocultar itens; testar cada filtro e combinações aprovadas.

##### UX-S02-03 — Threads e ações por item com estado confirmado
- **Tipo/prioridade:** integração / P1. **Dependências:** M03, M06, M07, M18.
- **User story:** Eu como pessoa jogadora, Quero consultar a conversa e controlar leitura, estrela e arquivo por item, Para organizar a Inbox sem alterar mensagens relacionadas por engano.
- **Critérios:** agrupar só relações verificadas; distinguir estado da mensagem/thread; leitura, estrela, adiar e arquivar têm controles nomeados e confirmação visual; estado confirmado consistente entre lista/detalhe; desfazer só se suportado.
- **Risco:** [INFERÊNCIA] ação na thread pode afetar membros indevidos; explicitar escopo e testar conversas com vários itens.

##### UX-S02-04 — Atalho à decisão canônica com retorno contextual
- **Tipo/prioridade:** integração / P1. **Dependências:** M05, M07, M15, M18.
- **User story:** Eu como pessoa jogadora, Quero abrir a decisão explicitamente ligada a uma correspondência, Para continuar a ação no contexto correto sem duplicar registros.
- **Critérios:** atalho só com vínculo/ID verificáveis; rótulo identifica destino; não cria/altera decisão; origem/filtro/seleção retomáveis; vínculo ausente/inválido não gera ação enganosa.
- **Risco:** [INFERÊNCIA] vínculo incorreto atribui causalidade inexistente; preservar proveniência e não inferir pelo texto.

#### Preservação e testes

Preservar categorias, mensagens, textos integrais, eventos e ações; reorganização não apaga/reclassifica dados. Atalhos levam ao mesmo item/ID/ação canônica. Desconhecido não vira zero: canal, data, remetente, thread e decisão aparecem apenas se presentes e confiáveis. Preferência visual não altera dificuldade, política histórica, sigilo ou RNG. Detalhe não oculta texto necessário; mudança de layout não remove acesso a arquivos/estados.

Testes propostos, não executados: (1) percorrer categorias, filtrar e limpar; (2) verificar lista/detalhe desktop, mobile, retorno ao filtro/posição e operação sem hover; (3) comparar estados antes/depois de ler, estrelar, adiar e arquivar, incluindo conflito e thread com vários itens, sem duplicar/perder; (4) testar ausência, validade e invalidez de vínculo, abrindo apenas ID canônico; (5) verificar campos ausentes, datas/contagens desconhecidas, texto integral, foco/teclado/toque e estados vazio, carregando e erro.

### S03 — Agenda e fechamento

#### 1. Tarefa principal e limites

**Objetivo.** Coordenar atividades e recursos numa visão semanal ou mensal, tornar conflitos e limites legíveis e oferecer uma revisão explícita antes de avançar o período. O “fechamento” desta tela é uma conferência do período e de suas pendências; não é um segundo motor de tempo nem uma nova regra de encerramento. A tela deve encaminhar a ação ao avanço já existente.

**Observação anterior verificada.** A revisão comum informa que já há avanço por diferentes períodos e uma opção “Até”, além dos indicadores mês, caixa, fôlego e fama no Cockpit. Também informa que o fechamento financeiro reconciliou nos três meses testados, inclusive um com custo extra. Isso não demonstra o funcionamento de uma agenda S03, não valida a economia de décadas nem autoriza atribuir à tela campos ou regras que não foram auditados. Não há diagnóstico confirmado de defeito nesta tela.

**Limite de escopo.** S03 organiza a leitura, a coordenação e a checagem anterior ao avanço. Não recalcula datas, não executa simulação paralela, não muda RNG, sigilo, disponibilidade histórica, política ou regras de capacidade. Conflitos, bloqueios e critérios devem vir da fonte que já decide essas condições; a interface os explica e encaminha para a entidade/ação original. Não inserir novo macromenu: acomodar o destino dentro dos oito grupos preservados, com atalhos cruzados para a mesma entidade e ID. O grupo proprietário/caminho canônico ainda deve ser confirmado na integração, em vez de inferido aqui.

#### 2. Estado conhecido e fonte de verdade

Além dos fatos observados acima, o restante da descrição de dados e comportamento abaixo é **[INFERÊNCIA]** e precisa ser validado contra a implementação, sem nova leitura ampla do JavaScript. PROPOSTA: cada compromisso, pessoa, projeto, recurso, conflito, bloqueio e ocorrência mantém sua própria identidade; a agenda referencia esses registros em vez de cloná-los. Datas, disponibilidade, uso/capacidade, avisos e situação de revisão devem trazer período e, quando calculados, fonte, data da atualização e incerteza. Dado ausente é “desconhecido/não informado”, nunca zero, livre ou sem conflito por conveniência.

Quando valores financeiros estiverem disponíveis na fonte do fechamento existente, S03 pode exibir um resumo contextual ou link para o detalhe original. Não deve recalcular saldos nem sugerir que reconciliação de três meses é prova de equilíbrio de longo prazo. Texto legível é prioridade; pixel art permanece em ambientes/personagens. Nenhuma ação depende apenas de cor, hover, arrastar ou som.

#### 3. Hierarquia de informação

- **Topo/permanente:** campanha e contexto de era; período em foco e alternância Semana/Mês; indicador da fonte/atualização quando aplicável; retorno ao contexto de origem; resumo acessível do estado da revisão. A ação de avançar é a existente e não deve ser duplicada.
- **Corpo/decisão:** agenda ordenada do intervalo; responsáveis/recursos associados; capacidade e sua unidade/período; conflitos e itens que pedem atenção; critérios que impedem ou permitem a revisão conforme as regras de origem. Mostrar o que exige decisão primeiro, sem esconder a lista integral.
- **Detalhe:** ao selecionar um cartão, abrir ficha contextual da entidade original com seus campos, disponibilidade, dependências, ações válidas e caminho de volta à agenda preservado. O detalhe não cria uma cópia editável.
- **Histórico:** revisões/avanços e ocorrências passadas, com data/período, identificadores e origem quando existentes. Não fabricar sequência nem atribuição causal. Se não houver histórico, explicar isso em vez de preencher com zeros.

#### 4. Reorganização espacial

##### Desktop — PROPOSTA

Wireframe textual: `Cabeçalho [campanha | era/data | Semana/Mês | fonte/atualização]` → `Faixa [resumo do período | capacidade/limites | avisos]` → `Coluna esquerda [calendário do período + filtros] | Centro [agenda ordenada e selecionável] | Coluna direita [recursos/capacidade + conflitos]` → `Rodapé persistente [critérios de parada | itens por resolver | rever detalhes | Avançar (ação existente)]`.

A semana pode organizar dias/linhas de tempo e o mês uma grade com contagem textual, mantendo uma lista acessível de todos os itens e um resumo de conflitos. Filtros não devem ocultar itens necessários à decisão sem indicação, contador e ação de limpar. Navegação por teclado, toque e leitor de tela deve alcançar os mesmos campos e ações. Evitar drag-and-drop como único meio de alocação; se a origem já oferecer uma ação de atribuição, disponibilizar controles explícitos equivalentes.

##### Mobile — PROPOSTA

O briefing registra amostra de 390×844 com barras totalizando cerca de 116 px, área principal de cerca de 728 px e oito destinos pequenos na barra inferior; trata-se de observação amostral, não auditoria física. Não acrescentar um nono destino. Wireframe textual: `Cabeçalho compacto [contexto | Semana/Mês]` → `Aviso/critério prioritário, em texto` → `Resumo [capacidade, período e quantidade de conflitos]` → `Lista vertical por dia, cartões expansíveis` → `Aba/alternância de conteúdo [Agenda | Recursos | Histórico] sem perder campos` → `Barra fixa [revisar pendências | ação de avanço existente]`.

No celular, trocar calendário denso por lista vertical e seletor de intervalo; manter o mesmo conteúdo e ações do desktop. Cartões devem expandir por toque e teclado, ter rótulo e estado textual além da cor. A barra fixa não cobre conteúdo, foco ou avisos; rolagem e retorno à origem preservam o período selecionado.

#### 5. Campos concretos

Disponibilidades abaixo são condicionais: onde a fonte não expuser o dado, mostrar indisponível/não informado e não deduzir ausência. As fontes dos registros estão **[INFERÊNCIA]** até confirmação de integração.

- **Intervalo selecionado** — Local: topo/controle de período. Fonte: seleção de visualização e estado temporal compartilhado; não é cálculo local do motor. Unidade: semana ou mês, data de início/fim conforme calendário de campanha. Disponibilidade: sempre que a campanha tiver contexto temporal; caso contrário, estado não informado.
- **Data/era de referência** — Local: topo e detalhe do período. Fonte: estado compartilhado da campanha/tempo. Unidade: data e era configuradas. Disponibilidade: se a fonte retornar valor; preservar contexto de era nos canais e textos.
- **Compromissos/eventos** — Local: calendário e lista central; detalhe vincula entidade. Fonte: registro original do evento/ação/projeto. Unidade: ocorrência e sua data ou intervalo. Disponibilidade: apenas itens existentes e retornados para o intervalo; lista vazia não implica falha.
- **Responsável/recurso associado** — Local: cartão e painel Recursos. Fonte: associação na entidade original de pessoa/equipe/recurso. Unidade: por compromisso/período. Disponibilidade: somente quando houver atribuição conhecida; caso contrário, “não informado”.
- **Disponibilidade do recurso** — Local: painel Recursos e ficha contextual. Fonte: estado de disponibilidade mantido pela origem. Unidade: intervalo da agenda (com granularidade própria da origem). Disponibilidade: se fornecida; não presumir livre por falta de registro.
- **Capacidade e utilização** — Local: resumo do período e painel Recursos. Fonte: valores e regras retornados pela origem de capacidade. Unidade: a unidade que a fonte usa por período (não inventar benchmark ou converter sem equivalência). Disponibilidade: valor, fonte e atualização explícitos; desconhecido se ausente.
- **Conflito/impedimento** — Local: aviso no topo, cartão relacionado e painel de conflitos. Fonte: conflito/critério reconhecido pela regra original e IDs das entidades relacionadas. Unidade: ocorrência por período/entidades. Disponibilidade: mostrar identificador, motivo e caminho válido quando fornecidos; “sem dados” não equivale a “sem conflitos”.
- **Critérios de parada** — Local: faixa de revisão persistente antes de avançar. Fonte: critérios de gate existentes; especificação/integração a confirmar. Unidade: por avanço/período e critério. Disponibilidade: cada critério em estado explícito — atendido, pendente, bloqueado ou desconhecido — conforme a fonte; S03 não inventa gate.
- **Pendências de decisão** — Local: checklist pré-avançar e ficha da entidade. Fonte: tarefas/decisões originais vinculadas ao período. Unidade: item/ocorrência. Disponibilidade: se a fonte expuser pendências; preservar proprietário, ID e ação permitida.
- **Resumo financeiro do fechamento** — Local: detalhe/atalho contextual, não como novo cálculo no cabeçalho. Fonte: fechamento financeiro original. Unidade: período financeiro usado pela origem, normalmente mês se assim configurado. Disponibilidade: somente quando já fornecido; valores ausentes seguem desconhecidos. Reconciliação em três meses é a única observação prévia, não uma garantia geral.
- **Histórico da revisão/avanço** — Local: aba Histórico/detalhe. Fonte: log ou registro de eventos existente. Unidade: data/período e evento. Disponibilidade: apenas entradas existentes, com ID/origem; sem log, indicar que histórico não está disponível.

#### 6. Fluxo principal

1. Abrir S03 por um caminho canônico já incluído nos grupos existentes ou por atalho contextual; conservar origem, filtro e campanha.
2. Selecionar Semana ou Mês e intervalo. A interface só consulta/organiza o período; o motor de tempo continua sendo o existente.
3. Examinar agenda, responsáveis e capacidade; filtrar sem perder acesso à lista completa e abrir a ficha original quando necessário.
4. Revisar conflitos, dependências e pendências. Se houver ação válida, executá-la na entidade original; atualizações retornam à mesma agenda e registram a fonte.
5. Abrir a revisão pré-avançar: conferir critérios de parada, estados desconhecidos, decisões pendentes e, se disponível, o resumo financeiro original.
6. Se a fonte indicar impedimento, explicar o motivo e oferecer caminho válido sem contornar regra. Se o usuário optar por avançar, invocar a ação existente uma única vez.
7. Depois do retorno do motor, atualizar a visualização e acrescentar ao histórico somente os eventos/IDs que a origem registrar; não atribuir causas não confirmadas.

#### 7. Estados da interface

- **Vazio:** intervalo sem itens; distinguir “nenhum item retornado” de falha ou indisponibilidade, manter o seletor de período e oferecer limpar filtros.
- **Carregando:** estado progressivo por seção, preservar cabeçalho e evitar números provisórios apresentados como finais.
- **Erro:** identificar seção/fonte afetada; oferecer tentar novamente e manter os dados já carregados como desatualizados, com indicação explícita. Não simular sucesso.
- **Conflito:** expor motivo, entidades/IDs e ação válida ou explicação de bloqueio; não resolver automaticamente nem apenas colorir.
- **Indisponível/desconhecido:** diferenciar recurso indisponível, dado não fornecido e dado igual a zero; mostrar origem e, se disponível, quando atualizar.
- **Bloqueio pré-avançar:** apresentar critérios pendentes/bloqueados e ação de resolução válida. Não habilitar bypass local.
- **Atualização simultânea:** **[INFERÊNCIA]** se registros puderem mudar durante a revisão, sinalizar divergência e recarregar o trecho afetado antes de repetir qualquer ação.
- **Avanço em andamento/concluído:** usar feedback/estado do motor existente; impedir disparo duplicado enquanto a mesma ação estiver pendente e recuperar o resumo confirmado ao concluir.

#### 8. Melhorias específicas — PROPOSTA

Prioridades abaixo são recomendação, não status, prazo ou esforço confirmado. Ganhos esperados são **[INFERÊNCIA]**.

##### UX-S03-01 — Visão de agenda por semana/mês com lista integral

**Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M03, M04, M09, M18. **User story:** “Eu como coordenador da campanha, Quero alternar entre semana e mês mantendo uma lista completa dos compromissos, Para comparar o período e encontrar decisões sem perder itens.” **Critérios:** alternância preserva intervalo e contexto; cada cartão aponta para entidade original; lista pode ser percorrida por teclado/toque; filtros indicam itens ocultos e têm limpeza clara; desconhecidos não viram zeros. **Risco:** grade mensal pode condensar informação e ocultar conflito; exigir lista equivalente e avisos textuais. **Ganho esperado [INFERÊNCIA]:** leitura mais rápida sem reduzir acesso. 

##### UX-S03-02 — Painel de capacidade e conflitos ligados às fontes

**Tipo:** integração. **Prioridade:** P1. **Dependências:** M07, M08, M12, M14, M15, M21. **User story:** “Eu como gerente de recursos, Quero ver capacidade, conflito e entidade relacionada na mesma revisão, Para resolver apenas o que a fonte reconhece e entender limites.” **Critérios:** valores exibem unidade/período, fonte e atualização quando disponíveis; cada conflito liga aos mesmos IDs; ausência é identificada como desconhecida; resolução chama ação válida da origem e registra retorno. **Risco:** ausência de fonte consolidada pode induzir um agregado inventado; ocultar o cálculo e declarar indisponibilidade até integração confiável. **Ganho esperado [INFERÊNCIA]:** menos troca de contexto e menos interpretação equivocada.

##### UX-S03-03 — Revisão pré-avançar com critérios e bloqueios explicados

**Tipo:** integração. **Prioridade:** P1. **Dependências:** M10, M11, M15, M18, M20. **User story:** “Eu como jogador, Quero conferir critérios de parada e pendências antes do avanço existente, Para decidir com clareza sem contornar regras.” **Critérios:** usa o resultado do gate original; distingue atendido, pendente, bloqueado e desconhecido; oferece caminho válido à origem; avanço chama somente o comando existente e tem proteção contra repetição enquanto pendente. **Risco:** critério novo na tela divergir da regra do motor; não criar critério sem contrato verificável com a fonte. **Ganho esperado [INFERÊNCIA]:** avanço mais previsível e menos retrabalho por decisões esquecidas.

##### UX-S03-04 — Histórico rastreável de revisão e fechamento

**Tipo:** integração. **Prioridade:** P1. **Dependências:** M03, M07, M14, M21. **User story:** “Eu como jogador, Quero consultar o que foi revisado e quais eventos a origem registrou, Para retomar o período sem atribuir consequências não comprovadas.” **Critérios:** lista apenas eventos existentes, com data/período, IDs e origem; separa observação de causalidade; se não houver log, explica indisponibilidade; resumo financeiro, quando exibido, aponta para fechamento original. **Risco:** falta de log não pode ser suprida por histórico inventado; manter seção vazia informativa até uma fonte legítima existir. **Ganho esperado [INFERÊNCIA]:** retomada mais confiável e comparação de períodos sem alegações causais indevidas.

#### 9. Preservação e testes

**Preservação:** conservar integralmente mecânicas, pessoas, registros, páginas, textos, eventos, ações e campanhas. A agenda referencia IDs canônicos e atalhos cruzados, não cria duplicatas nem novo motor, ação de avanço ou menu principal. Não alterar RNG, sigilo, disponibilidade histórica, política, regras de capacidade ou dificuldade. Preferências visuais ficam separadas das regras; contexto de era acompanha os canais sem prejudicar legibilidade. Abas não retiram acesso aos dados essenciais ou à lista completa. Manter interface utilizável por teclado e toque, com texto independente de cor/som/hover. Não remover conteúdo para obter performance.

**Testes:**

- Verificar que alternar semana/mês não altera estado temporal, RNG, campanha ou ação de avanço; validar que “Até” e outros comandos temporais existentes continuam sendo os únicos motores.
- Conferir paridade de campos, entidades, IDs e ações entre desktop/mobile; testar 390×844 como referência amostral, zoom, rolagem, foco e barras fixas sem encobrir conteúdo.
- Testar período vazio, filtros ativos, capacidade ausente, dado zero explicitamente retornado, recurso desconhecido, fonte atrasada e erro parcial: nunca colapsar esses estados.
- Testar conflito com origem conhecida, impedimento sem caminho disponível, múltiplas entidades ligadas e alteração simultânea; validar mensagens e ausência de resolução automática.
- Testar gate atendido, pendente, bloqueado e desconhecido, garantindo que somente o resultado da fonte controla o avanço e que não há disparo duplicado.
- Validar que um resumo financeiro, se exibido, corresponde ao detalhe/fechamento original e não generaliza a reconciliação observada em três meses.
- Verificar histórico com e sem registros; IDs e datas devem vir da origem, sem atribuição causal inferida.
- Auditoria manual de texto, teclado, toque, leitor de tela e estados: nenhuma ação só por cor, hover, drag ou som; filtros e abas não eliminam acesso integral.

### S04 — Elenco e gestão de pessoas

#### 1. Tarefa principal e limites

**Objetivo.** Dar à pessoa gestora uma visão operacional, filtrável e acessível dos atos musicais e das pessoas sob sua gestão, permitindo localizar, agrupar, selecionar e executar ações em lote seguras sem perder o acesso às fichas completas existentes. “Ato” significa aqui ato musical (por exemplo, artista/banda), não uma ação do usuário. Ato e pessoa são tipos de entidade distintos; uma relação entre eles deve ser apresentada como relação, não como identidade.

**Escopo desta tela:** listagem; busca e filtros; grupos; seleção; ações em lote cujo suporte e elegibilidade sejam confirmados. Esta tela não redesenha fichas, não cria outro destino de navegação nem altera regras do jogo, RNG, sigilo ou disponibilidade histórica. Uma prévia compacta pode expor contexto mínimo e um link à ficha existente, sem substituir essa ficha.

**Observação anterior:** a arquitetura conhecida tem oito grupos principais, um deles “Pessoas”, e busca Ctrl+K; não há no briefing uma verificação específica da composição, dos campos ou das ações atuais de S04. Portanto, não se afirma que qualquer item desta proposta já esteja implementado, nem se diagnostica defeito. [INFERÊNCIA] S04 deve ser o destino canônico de gestão do elenco dentro de “Pessoas”; atalhos vindos de busca, cockpit ou outros pontos devem abrir o mesmo registro/ID, não cópias concorrentes. [PROPOSTA] Usar essa tela como índice e ponto de ação, deixando a ficha como contexto completo.

#### 2. Reuso e regras de apresentação

Reaproveitar os oito grupos de navegação e os meios existentes de busca; não acrescentar macromenu. O briefing confirma capacidades globais como favoritos de páginas e organização Essencial/Completa, mas não confirma se S04 tem filtros, grupos editáveis, seleção ou ações em lote. Apresentá-las somente se já suportadas ou como melhorias propostas claramente sujeitas a validação. Manter entidade, ação e ID compartilhados por todos os atalhos (M01/M07). Não deduzir “ativo”, “livre”, “contratado”, prioridade ou risco com base em ausência de dado. Valor desconhecido deve aparecer como “não informado”/indisponível, nunca como zero. Estimativas, quando houver fonte no produto, devem carregar fonte, data e incerteza.

#### 3. Hierarquia informacional

- **Topo/permanente:** título “Elenco e gestão de pessoas”; escopo ativo (todos, atos ou pessoas); busca; filtros aplicados resumidos em chips removíveis; contador de resultados; botão de limpar filtros; botão de seleção/contagem. No modo de seleção, barra de ações substitui ações unitárias sem ocultar o contexto do filtro. Ordem e estado selecionado permanecem identificáveis por texto e ícone, não apenas por cor.
- **Corpo/decisão:** linhas compactas (desktop) ou cartões condensados (mobile), cada qual com nome, tipo de entidade, relação/grupo e os poucos indicadores operacionais que tenham fonte e disponibilidade confirmadas. Cada linha mostra seleção explícita e acesso à ficha completa. Separar atos de pessoas com cabeçalho/etiqueta de tipo; não duplicar um integrante como ato. Grupos e filtros reduzem a lista sem apagar entidades nem mudar seu estado no jogo.
- **Detalhe:** painel lateral no desktop ou expansão navegável no mobile mostra só resumo útil para distinguir registros: tipo, relações relevantes, grupo(s), informação de gestão disponível e links de origem. Exibir campos conforme permissão e disponibilidade. A ficha existente continua sendo o local de consulta integral; não replicá-la dentro de S04.
- **Histórico:** cronologia compacta de eventos vinculados ao mesmo ID, se a fonte existente fornecer esses eventos. Mostrar data/período, evento e origem; separar observação de inferência e nunca inventar causalidade. Link para registro de origem. Se não houver histórico, explicitar isso sem sugerir que nada ocorreu.

#### 4. Organização espacial

**Desktop — wireframe textual:** `Pessoas / Elenco e gestão` + busca e escopo; segunda faixa de filtros e grupos ativos; contador e seleção; lista principal em linhas `□ | nome + tipo | grupo/relação | status confirmado | última referência confirmada | abrir`; seleção abre barra contextual com ações elegíveis; clique na linha abre resumo lateral, e link explícito abre a ficha existente. Colunas opcionais podem ser ocultadas pelo usuário, mas não retiradas do conjunto de campos nem tornar inacessível dado essencial à decisão. Teclado deve alcançar filtros, linhas, seleção, ações e painel em ordem previsível.

**Mobile — wireframe textual:** cabeçalho compacto com título e busca; escopo e filtros em botão de abertura que mostra quantidade ativa; grupo atual como chip; cada cartão põe nome/tipo e seleção na primeira linha, contexto essencial abaixo e “Abrir ficha” claramente acionável. Ao selecionar, barra fixa inferior com contador, “Mais ações” e limpar seleção, acima da navegação global sem sobreposição. A lista conserva acesso a todos os campos e ações, mas não simula colunas desktop. Toque, leitor de tela e teclado externo não dependem de hover, arrastar, cor ou som. Validar alturas reais em telas pequenas; as medidas do cockpit conhecidas não são medição de S04.

#### 5. Campos previstos e disponibilidade

A lista abaixo é uma proposta de contrato de apresentação: fonte significa sistema de origem desejado, não fonte técnica inspecionada. Campo sem dado verificável deve ser omitido ou marcado “não informado”; filtros só oferecem valores efetivamente disponíveis. Unidades e disponibilidade concretas dependem da entidade/fonte.

1. **Nome de exibição** — linha/cartão e topo do resumo; cadastro da própria entidade; texto, sem período; esperado para ato e pessoa, sujeito a registro carregado.
2. **Tipo de entidade (ato/pessoa)** — etiqueta na linha, filtro de escopo e resumo; tipo do registro canônico; enumeração, sem período; apenas se tipo estiver identificado.
3. **Grupo(s)** — chip/coluna, filtro e resumo; associação de grupo existente/aprovada; conjunto de rótulos, estado atual; disponível só se existir associação persistida. Não inventar grupos ou associação automática.
4. **Relação com outro registro** — linha secundária/resumo; vínculo canônico entre ato e pessoa; relação, estado atual; somente vínculos explícitos e acessíveis.
5. **Função/posição de gestão** — resumo e filtro se suportado; cadastro/contrato/estrutura de gestão de origem, ainda não verificado; rótulo, vigente na data da fonte; não inferir papel ausente.
6. **Estado de gestão** — coluna/filtro; estado do sistema de origem a confirmar; enumeração, vigente na data consultada; mostrar apenas valores documentados, sem fabricar taxonomia.
7. **Próximo compromisso ou referência** — linha secundária/resumo e ordenação opcional; agenda/evento canônico, se integrado; data e hora ou intervalo do evento; disponível apenas se registro existente e compatível com período/configuração. Ausência não significa agenda vazia.
8. **Última interação/evento** — linha/resumo/histórico; ocorrência ou mensagem ligada pelo ID, se houver integração; data/hora e tipo de evento; disponibilidade limitada ao histórico acessível. Não concluir “sem contato” quando desconhecido.
9. **Responsável atribuído** — detalhe e filtro opcional; fonte de atribuição de gestão a validar; pessoa/identificador, vigente na data da fonte; não mostrar nem permitir alteração se não existir campo autorizado.
10. **Indicador/alerta de gestão** — detalhe; alerta explícito do sistema de origem, se existente; categoria + data de atualização; não calcular risco por conta própria nem usar cor como único sinal.

#### 6. Fluxo e ações em lote

1. Entrar em Pessoas > Elenco e gestão ou chegar por atalho de intenção; resolver para o mesmo registro e ID canônico.
2. Definir escopo (atos/pessoas/todos), buscar e combinar filtros/grupos; cada filtro ativo é anunciado e removível. Atualizar resultados sem apagar seleção silenciosamente.
3. Comparar linhas por tipo e campos disponíveis; abrir resumo compacto quando necessário; abrir ficha existente para decisão detalhada.
4. Selecionar um ou mais registros. Mostrar quantidade, tipos e filtros que originaram a seleção. Se a lista mudar, manter seleção identificável e alertar antes de aplicar ação a registros que saíram dos filtros.
5. **Ação em lote permitida nesta proposta:** adicionar ou remover associação a um grupo organizacional já existente/aprovado, após prévia de elegibilidade, total de afetados, exclusões e confirmação. Só incluir entidades compatíveis; se algumas não puderem receber a ação, explicar quais e por quê antes de confirmar. Atualizar resultado e histórico apenas após confirmação bem-sucedida.
6. Desfazer seleção e retornar à lista sem alteração. Abrir ficha para ação individual já existente.

Nenhum lote para assinar/encerrar contrato, pagar, enviar mensagem, mudar resultado do jogo ou executar outra ação irreversível é proposto. Tais ações devem continuar no contexto individual/fluxo já previsto, com suas confirmações e regras; só podem aparecer aqui se previamente verificadas, não forem duplicadas e a regra permitir. Grupos editáveis ou novas ações exigem validação explícita de modelo, persistência e autorização; não são fatos implementados.

#### 7. Estados

- **Carregando:** skeleton com estrutura de linha/cartão e filtros indisponíveis identificados; não exibir contagem falsa nem habilitar lote.
- **Vazio inicial:** distinguir ausência de registros sob gestão (se retorno confiável) de dados ainda não carregados; oferecer retorno à navegação/ajuda, sem criar perfil fictício.
- **Sem resultados:** informar que busca/filtros não encontraram correspondência; manter filtros visíveis, permitir limpar e preservar conjunto de dados.
- **Erro:** manter contexto e seleção em segurança; explicar falha de carregamento/ação, oferecer tentar novamente; não converter erro em lista vazia nem repetir mutação automaticamente.
- **Conflito:** seleção contém registro atualizado, removido ou inelegível desde a leitura; mostrar divergência e exigir revisão da prévia. Ação parcial só se o sistema confirmar precisamente os itens afetados; do contrário, não aplicar.
- **Indisponível/sem permissão:** indicar campo ou ação não disponível e, quando possível, motivo/fonte; não inferir estado e não oferecer controle desabilitado sem explicação.
- **Sucesso:** confirmar quantidade efetivamente atualizada, manter filtros e seleção coerentes, e mostrar link para histórico/origem quando disponível.

#### 8. Melhorias específicas propostas (não implementadas)

1. **UX-S04-01 — Tipo e relação distinguíveis na lista**. **Tipo:** apresentação. **Prioridade:** P1 (prioridade, não prazo/status). **Dependências:** M03, M06, M18, M22. **User story:** “Eu como gestora do elenco, Quero distinguir atos de pessoas e seus vínculos na lista, Para abrir o registro certo sem confundir entidades relacionadas.” **Critérios:** todas as linhas indicam tipo em texto; relação aponta ao registro canônico; foco/seleção é acessível por teclado e toque; campos ausentes não viram valores inferidos. **Risco:** poluição visual ou duplicação se vínculos forem apresentados como entidade repetida.
2. **UX-S04-02 — Filtros e grupos com estado recuperável**. **Tipo:** apresentação/integração. **Prioridade:** P1. **Dependências:** M01, M02, M04, M06. **User story:** “Eu como gestora do elenco, Quero combinar escopo, busca, grupos e filtros, Para reencontrar rapidamente o subconjunto relevante.” **Critérios:** filtros combinados mostram chips, contagem baseada em retorno real e limpeza individual/total; sem valores disponíveis, filtro não finge existir; estado de seleção é comunicado ao mudar resultados. **Risco:** filtros sem semântica comum ou grupos duplicados em destinos diferentes.
3. **UX-S04-03 — Prévia e confirmação de lote organizacional**. **Tipo:** mecânica opcional. **Prioridade:** P1. **Dependências:** M12, M15, M18, M30. **User story:** “Eu como gestora do elenco, Quero revisar uma alteração de grupo antes de aplicá-la a várias entidades, Para evitar mudanças acidentais e saber exatamente quem será afetado.” **Critérios:** só expõe adicionar/remover grupo existente e autorizado; lista elegíveis/excluídos e razão; requer confirmação inequívoca; erro/conflito impede repetição silenciosa; registra ID e resultado quando o histórico permitir. **Risco:** aplicação parcial ou associação inconsistente; depende de modelo/persistência já aprovado, não deve criar estado paralelo.
4. **UX-S04-04 — Histórico compacto ligado a ocorrências**. **Tipo:** integração. **Prioridade:** P2. **Dependências:** M03, M07, M14, M21. **User story:** “Eu como gestora do elenco, Quero consultar referências recentes e sua origem, Para entender o contexto sem atribuir causas que os dados não provam.” **Critérios:** eventos mostram data, fonte e ID de origem quando disponíveis; sem histórico se declara indisponível; fatos e estimativas são diferenciados; link abre o destino canônico. **Risco:** cobertura incompleta pode ser interpretada como ausência de atividade.

#### 9. Preservação e testes

Preservar todas as entidades, nomes, vínculos, campos, páginas, textos, eventos, cenas, referências, ações e campanhas existentes. A lista é uma camada de acesso: não apaga, funde, migra, renomeia nem altera o estado de uma entidade; ato e pessoa conservam identidade e histórico. Atalhos compartilham o mesmo ID e destino (M01/M07); campos deslocados para o resumo/ficha continuam acessíveis integralmente. Não remover conteúdo para ganhar performance (M29), nem alterar save, dificuldade, RNG, sigilo ou regra histórica. Mudanças de grupo e lote devem ser reversíveis/auditáveis quando a fonte permitir, respeitando M12/M15/M30.

Testar: (a) relação pessoa–ato e múltiplos registros sem duplicação de identidade; (b) combinações de escopo, busca, filtros, grupos, resultados vazios e desconhecidos; (c) teclado, leitor de tela, zoom, toque e largura mobile com barra inferior sem cobrir conteúdo; (d) seleção, elegibilidade mista, prévia, cancelamento, confirmação, conflito, falha e repetição segura do lote; (e) entradas por busca/atalhos resolvendo no mesmo ID; (f) resumo/histórico com origem e permissão; (g) que valores não informados não se tornem zeros, status ou alertas inventados; (h) regressão de acesso às fichas existentes e preservação de conteúdo/saves. Validar contra implementação antes de registrar qualquer proposta como capacidade disponível.

### S05 — Ficha de artista/banda e formação

#### Tarefa e limites

A S05 é o dossiê de um ato musical — artista ou banda. **PROPOSTA:** reunir identidade, formação atual e passada, funções, datas de entrada/saída, fichas individuais, contratos e história, respondendo quem participou, quando, com que função e onde consultar contexto.

Escopo: leitura/navegação, sem alterar regras, RNG, sigilo, disponibilidade histórica ou conteúdo. Reusar destinos/atalhos para a mesma entidade (M01/M05), sem macromenu. O branch não foi inspecionado; este capítulo não audita HTML nem confirma implementação.

#### Evidência anterior e lacunas

- **Observação anterior:** uma formação dos Beatles foi vista com intervalos anuais; a precisão mensal para Pete/Ringo não foi comprovada. Não afirmar que todo integrante tem meses disponíveis.
- **Observação anterior:** fichas examinadas exibem instrumentos e canto; funções combinadas uniformes foram solicitadas, não demonstradas.
- **Observação anterior:** proposta contratual testada inclui adiantamento, royalty, prazo, discos devidos, controle criativo, paciência e ações negociais. Sistemas de promessas existem; o seletor nessa negociação não foi demonstrado. Integrar a entrega solicitada, sem duplicá-la.
- **Observação anterior:** história do selo/jogador e álbuns de cenas existem; protagonismo pessoal, cenas faltantes, story mode, fim configurável e álbum final com áudio estão em desenvolvimento. Não contar bases antigas como inovação entregue.

Essas observações não confirmam cobertura, modelo técnico ou vínculos. Confirmar fontes na integração. Dado não encontrado é desconhecido, não zero ou prova de ausência. Mostrar precisão original, fonte e incerteza quando disponíveis; não completar mês em intervalo anual.

#### Hierarquia da informação

- **Topo/permanente:** nome, tipo do ato, ID canônico, retorno e mês de referência quando conhecido; atalhos a ficha individual, contratos e história abrem entidades existentes.
- **Corpo/decisão:** formação no período, atuais em relação ao mês selecionado e ex-integrantes em seção acessível. Cada cartão reúne funções, intervalo conhecido e link individual. Distinguir conflitos/incompletudes textualmente; sem mês de referência, não classificar alguém como atual por suposição.
- **Detalhe:** perfil, instrumentos/canto, funções, precisão/proveniência de datas e termos contratuais. Campo ausente não vira zero; associação contratual não se infere por proximidade temporal.
- **Histórico:** mudanças, marcos e eventos com ligação rastreável, período, referência e precisão da fonte. Sequência temporal não prova causalidade: separar registro de interpretação.

#### Reorganização espacial

**Desktop — wireframe textual (PROPOSTA):**

```text
[← retorno] [Nome do ato · artista/banda] [mês de referência]
[Resumo da formação] [Ficha individual] [Contratos] [História]
┌ Formação (principal) ────────────────────────┐ ┌ Contexto ──────────────┐
│ Atuais: pessoa · funções · intervalo · link  │ │ Contratos · termos/fonte│
│ Ex-integrantes [controle explícito]           │ │ Marcos e história       │
└──────────────────────────────────────────────┘ └────────────────────────┘
[Detalhes completos e proveniência no fluxo da página]
```

Formação em destaque; contexto complementa, sem substituir acesso integral. Ex-integrantes só se agrupam por controle explícito. Atalhos preservam origem e retorno.

**Mobile — wireframe textual (PROPOSTA, estrutura própria):**

```text
[←] Nome do ato [ações nomeadas]
[Artista/banda] · [referência temporal]
[Formação] [Contratos] [História]
Atuais no período · [pessoa] [funções] [início] [Abrir ficha]
Ex-integrantes [mostrar/ocultar]
[intervalos e proveniência]
[Contratos e história empilhados]
```

Empilhar blocos mantendo campos/ações desktop em alvos tocáveis e rotulados. Não miniaturizar os oito destinos nem depender de arrastar, hover, cor ou som; período/fonte legíveis.

#### Campos concretos e disponibilidade

Fontes são candidatas lógicas, não nomes de tabelas nem garantias; origem técnica não foi mapeada. N/D = não verificado.

- **Nome do ato** — topo — ficha/entidade do ato (técnica N/D) — sem unidade — identidade central; cobertura geral N/D.
- **Tipo (artista/banda)** — topo — ficha do ato (N/D) — categoria — cobertura geral não confirmada.
- **Mês de referência** — topo — calendário/estado de simulação (N/D) — mês/ano — depende de contexto temporal; fonte a confirmar.
- **Nome e ID do integrante** — formação/link individual — vínculo da formação à ficha (N/D) — pessoa/ID — fichas observadas; vínculo por ID a validar.
- **Situação atual/ex no período** — cartão — período + referência (derivação proposta) — mês/ano — só derivável com datas e referência conhecidas.
- **Funções no ato** — cartão/detalhe — vínculo pessoa–ato (N/D) — lista combinável — instrumentos/canto observados; funções combinadas uniformes não demonstradas.
- **Instrumentos** — detalhe da pessoa — ficha individual; vínculo a confirmar — lista — observados em fichas examinadas, cobertura geral N/D.
- **Canto/vocal** — detalhe da pessoa — ficha individual; vínculo a confirmar — lista/descrição — observado; cobertura geral N/D.
- **Início e fim de participação** — cartão/linha do tempo — período da formação (N/D) — mês/ano ou precisão original — revisão anterior comprovou intervalos anuais no caso examinado; granularidade mensal geral N/D.
- **Contratos associados** — bloco Contratos — registro e ligação ao ato (N/D) — contrato/período — proposta testada; associação por ato não confirmada.
- **Termos contratuais** — detalhe do contrato — proposta/registro (N/D) — moeda, %, prazo, quantidade/condição — campos vistos: adiantamento, royalty, prazo, discos devidos, controle criativo; valores por ato N/D.
- **Marco/evento histórico** — bloco História — história/álbum de cenas e referência (origem específica N/D) — data/período original — bases existem; vínculo completo com formação não verificado.
- **Fonte, precisão e confiança** — junto ao campo/evento — metadado de origem (N/D) — fonte/data/qualificador — **PROPOSTA** de exibir quando fornecido, sem fabricar confiabilidade.

#### Fluxo principal

1. Entrar por destino canônico ou atalho de busca/pessoa/projeto/contrato/história; abrir a mesma ficha/ID (M01/M05).
2. Confirmar ato e mês de referência; sem contexto temporal, não rotular atuais por suposição.
3. Consultar formação, funções e intervalos na precisão de origem; alternar para ex-integrantes por controle explícito.
4. Abrir ficha individual e retornar preservando período, filtro e posição.
5. Consultar contratos/termos e voltar; marcar vínculo incerto ou informação indisponível, sem inferir.
6. Consultar história com referência; não atribuir causalidade de entrada/saída sem evidência explícita.

#### Estados

- **Vazio:** separar ato sem integrantes no período de dados não carregados; permitir mudar referência ou abrir histórico disponível.
- **Carregando:** indicar blocos em carga, sem skeleton semelhante a dado real.
- **Erro:** identificar bloco e permitir repetir/retornar sem apagar conteúdo exibido.
- **Conflito:** mostrar versões divergentes com fonte/precisão; não escolher silenciosamente.
- **Indisponível/desconhecido:** distinguir não registrado, vínculo não confirmado e fonte inacessível; nunca zero/inexistência.
- **Parcial:** exibir dados sustentados, lacunas e precisão original (ano sem mês).

#### Melhorias propostas (não implementadas)

- **UX-S05-01 — Linha do tempo mensal da formação.** Tipo: apresentação; prioridade P0 (não é status, prazo ou esforço); dependências M03, M06, M18, M21. **User story:** “Eu como gestor do ato, Quero comparar integrantes por mês, Para entender a formação sem perder a precisão disponível.” Critérios: ordenar períodos; mostrar mês só com suporte da fonte; preservar ano sem mês; distinguir período aberto/desconhecido/encerrado e mostrar proveniência/conflito. Risco: precisão falsa se não houver granularidade mensal. **Ganho esperado [INFERÊNCIA]:** leitura mais clara sem mudar cronologia armazenada.
- **UX-S05-02 — Funções combinadas por período.** Tipo: apresentação; prioridade P1; dependências M05, M06, M18. **User story:** “Eu como gestor do ato, Quero ver todas as funções de cada integrante no período, Para compreender sua contribuição sem alternar entre rótulos isolados.” Critérios: funções múltiplas textuais; vínculo temporal só quando sustentado; preservar instrumentos/canto e sinalizar função não registrada. Risco: confundir função histórica com atual. **Ganho esperado [INFERÊNCIA]:** comparação mais rápida, preservando dados existentes.
- **UX-S05-03 — Navegação contextual entre ato, pessoas e contratos.** Tipo: integração; prioridade P1; dependências M01, M05, M22. **User story:** “Eu como gestor do ato, Quero abrir fichas individuais e contratos ligados a partir do dossiê, Para investigar detalhes e retornar sem perder contexto.” Critérios: IDs canônicos; vínculo confirmado/não confirmado visível; retorno restaura período/posição; sem cadastro paralelo nem seletor duplicado de promessas. Risco: associação falsa por vínculo incorreto/duplicado. **Ganho esperado [INFERÊNCIA]:** menos perda de contexto.
- **UX-S05-04 — História rastreável da formação e dos contratos.** Tipo: apresentação; prioridade P1; dependências M03, M07, M14, M21, M24. **User story:** “Eu como gestor do ato, Quero consultar mudanças e marcos com sua fonte, Para distinguir registro histórico de interpretação.” Critérios: data na precisão original, referência/cena quando existente, fonte/incerteza; separar evento de inferência causal; não inventar cena ou relação. Risco: visual sugerir causalidade não registrada. **Ganho esperado [INFERÊNCIA]:** trajetória mais verificável sem converter interpretação em fato.

#### Preservação e testes

Preservar conteúdo, entidades/IDs/relações, fichas, termos, contratos/promessas, história e cenas. Reorganização mantém acesso integral, regras, RNG, sigilo, disponibilidade histórica, dificuldade e os oito grupos. Separar preferências de apresentação; preservar offline/single-file se mantido. Não sugerir excluir saves nem afirmar compatibilidade não testada.

Testar atalhos/IDs, limites mensais, ano sem mês, funções/vínculos, retorno à ficha, contratos parciais, história sem causalidade presumida e todos os estados. Verificar teclado, leitor de tela, toque e legibilidade desktop/mobile sem depender de hover/cor/arrastar/som. Na integração, testar round-trip, compatibilidade sem apagar saves e desempenho/offline. São testes propostos; não se executou a aplicação.

### S06 — Scouting e funil de talentos

#### 1. Tarefa principal e limites

Esta tela concentra **descoberta, avaliação e comparação de talentos**, distinção entre informação conhecida e rumor, registro de fonte e confiança, shortlist e passagem contextual ao contrato. O objetivo é permitir que a pessoa responsável decida quem merece acompanhamento e qual próximo passo é justificável, sem converter informação incompleta em fato nem esconder incertezas.

**Observação anterior:** o briefing comum não registra inspeção funcional de S06 nem confirma nomes de campos, regras de scouting, filtros, escalas de avaliação ou estados implementados nesta tela. Portanto, nenhuma funcionalidade abaixo é afirmada como existente. Também não se deve inferir defeito por falta dessa auditoria. Estão estabelecidos apenas princípios comuns: manter os oito grupos principais, preservar entidades e ações, mostrar origem/data/incerteza de estimativas, distinguir desconhecido de zero, manter acesso integral ao conteúdo e não alterar regras, RNG, sigilo ou disponibilidade histórica. As soluções deste capítulo são **PROPOSTA**; ganhos de usabilidade indicados são **[INFERÊNCIA]**.

S06 não é uma inbox paralela nem um novo macromenu. Acesso pode vir do catálogo único de destinos e de atalhos cruzados, sempre levando ao mesmo talento/ID e à mesma shortlist. Avaliações apresentadas aqui não mudam, por si, atributos, disponibilidade ou resultado de negociação. O contrato continua sendo uma etapa/fluxo de contrato existente, se disponível; S06 deve encaminhar o contexto e não duplicar seus termos ou ações negociais.

#### 2. Reaproveitamento e princípios

Reaproveitar qualquer cadastro, observação, notícia, relatório, pessoa ou estado de negociação já existente e identificável pelo sistema; evitar recriar dados em uma camada visual concorrente. Preservar texto original, autoria, datas, histórico e vínculos. Como a existência e a estrutura desses dados em S06 não foram verificadas, a implementação deve primeiro mapear as fontes canônicas e expor lacunas, sem preencher campos ausentes com valores presumidos.

Cada afirmação deve ter rótulo legível — por exemplo, conhecida, rumor ou não verificada — e uma fonte identificável ou “fonte não registrada”; confiança não deve ser confundida com verdade. Exibir data/período e incerteza quando houver. Não consolidar fontes contraditórias como um fato único. Preferências de apresentação não podem alterar dificuldade, sigilo, regras históricas ou RNG. Texto informativo é legível; pixel art fica restrita a personagens e ambientes. Todas as ações são acessíveis por toque e teclado, sem depender de hover, cor ou som.

#### 3. Hierarquia de informação

- **Topo/permanente:** nome e identidade do talento; etapa atual do funil; indicador de informação conhecida/rumor quando aplicável; origem de navegação e voltar; ação principal contextual (abrir ficha, incluir/remover da shortlist ou encaminhar para revisão contratual). Não exibir classificação global sem base documentada.
- **Corpo/decisão:** resumo de perfil e disponibilidade conhecida, evidências mais relevantes, avaliação registrada e lacunas; comparação lado a lado quando selecionada; shortlist ordenável segundo critério escolhido, sem ocultar itens por padrão. Deixar “desconhecido”, “não registrado” e zero visualmente distintos.
- **Detalhe:** ficha completa, competências e atributos que existam na fonte, notas do avaliador, justificativa e fonte de cada informação, grau/confiança e data, divergências, filtros e explicação de campos. Não inventar escalas ou métricas.
- **Histórico:** mudanças de etapa, entrada/saída da shortlist, notas e avaliações, atualizações de fonte/rumor, encaminhamentos e resultados de tentativas que já sejam registrados. Linha do tempo ordenável, com autor/data quando disponível; preservar registros originais, não inferir causalidade.

#### 4. Reorganização espacial

**Desktop — wireframe textual (PROPOSTA):** cabeçalho com talento/fase e ações; coluna esquerda estreita para busca, filtros e shortlist; centro amplo para lista de descoberta e seleção; painel lateral de ficha/resumo de evidências; quando comparar, centro vira matriz de candidatos selecionados e o detalhe abre sob demanda, sem perder filtros ou contexto. Histórico é uma seção expansível abaixo da ficha, não um destino separado. A informação essencial à decisão permanece visível ou alcançável em um passo explícito.

**Mobile — wireframe textual (PROPOSTA):** cabeçalho compacto com identidade/fase e voltar; faixa de ações acessíveis e atalhos para busca e shortlist; lista de cartões em coluna única com estado conhecido/rumor em texto; ficha e evidências em seções empilhadas; comparação como cartões alinhados por campo, com alternância explícita de talento, mantendo rótulos e valores; ação “Avançar para contrato” em área fixa apenas quando há encaminhamento válido e confirmação. Filtros abrem painel completo, mantendo os mesmos campos e ações da versão desktop. Não tentar comprimir uma tabela larga nem exigir arrastar cartões.

#### 5. Campos concretos e proveniência

A lista abaixo é uma **proposta de contrato de apresentação**, não confirmação de campos atualmente gravados. Fonte indica a fonte canônica que deve ser localizada; se não existir, mostrar indisponível/não registrado. Disponibilidade histórica obedece às regras do jogo.

1. **Nome e identificador do talento** — localização: topo/ficha; fonte: entidade canônica de pessoa/talento; unidade: não aplicável; disponibilidade: enquanto entidade identificável.
2. **Etapa do funil** — topo e shortlist; fonte: estado canônico de acompanhamento, se existir; unidade: etapa/evento; disponibilidade: conforme sistema, sem criar avanço automático.
3. **Informação conhecida/rumor** — cartão e evidências; fonte: registro original de informação; unidade: afirmação; disponibilidade: por afirmação, respeitando sigilo e época.
4. **Fonte/origem** — detalhe de cada afirmação; fonte: metadado original (pessoa, publicação ou canal), ou “não registrada”; unidade: fonte/evento; disponibilidade: quando conhecida e autorizada.
5. **Confiança/incerteza** — ao lado da afirmação; fonte: valor explicitamente registrado ou regra explicável já existente; unidade: escala original ou qualitativa, nunca escala inventada; disponibilidade: se houver dado, senão “não avaliada”.
6. **Data ou período da informação** — evidência e histórico; fonte: timestamp/período original; unidade: data ou intervalo; disponibilidade: se registrado, indicando precisão disponível.
7. **Atributos/competências** — ficha e comparação; fonte: ficha canônica; unidade: unidade/escala definida pela própria fonte; disponibilidade: conforme época, conhecimento e regra, sem completar lacunas.
8. **Avaliação e nota justificativa** — detalhe da ficha; fonte: observação/avaliação vinculada ao avaliador; unidade: escala original ou texto; disponibilidade: apenas se registrada, identificando autoria e data.
9. **Disponibilidade para contato/contrato** — resumo e revisão de avanço; fonte: estado canônico ou requisito da etapa contratual; unidade: estado/condição e período conhecido; disponibilidade: apenas quando verificável, respeitando época.
10. **Shortlist e prioridade** — lista de shortlist; fonte: estado de acompanhamento e ordenação escolhida; unidade: inclusão e posição/critérios explícitos; disponibilidade: conforme suporte existente; não converter posição em qualidade.
11. **Condição/termos do contrato** — somente resumo de encaminhamento; fonte: tela/sistema canônico de contrato; unidade: termos conforme fonte; disponibilidade: após transição válida e quando acessível; não duplicar edição/negociação.
12. **Histórico de eventos** — seção histórica; fonte: log/eventos originais; unidade: evento com data/autor se registrados; disponibilidade: conforme retenção existente; não criar causalidade.

#### 6. Fluxo principal

1. Abrir S06 pela navegação canônica, atalho contextual ou retorno a um talento, preservando origem e filtros.
2. Buscar/filtrar descobertas disponíveis; explicitar quando lista vazia não significa inexistência de talentos.
3. Selecionar uma pessoa e conferir ficha, disponibilidade e afirmações com fonte, data e confiança.
4. Registrar ou revisar avaliação/notas apenas se a mecânica existente permitir; identificar autor, data e incerteza.
5. Comparar candidatos usando campos equivalentes, exibindo dados faltantes como desconhecidos e fontes divergentes em separado.
6. Incluir, remover ou reordenar talentos na shortlist com ação explícita, preservando histórico e critério de ordenação.
7. Rever o resumo e impedimentos aplicáveis antes de avançar; encaminhar ao fluxo canônico de contrato com o mesmo ID e contexto. Não presumir oferta, contratação ou sucesso.

#### 7. Melhorias específicas propostas

As prioridades abaixo são prioridade de desenho, não status, prazo ou esforço confirmado.

##### UX-S06-01 — Funil compacto com retorno de contexto
**Tipo:** apresentação/integração. **Prioridade:** P1. **Dependências:** M01, M02, M03, M05, M07. **User story:** “Eu como responsável por talentos, Quero encontrar candidatos e retomar a ficha de onde vim, Para comparar sem perder contexto.” **Critérios:** busca e atalhos abrem uma ficha canônica; filtros e origem sobrevivem ao retorno; cada candidato mantém ID único; estado sem resultados oferece limpar filtros sem sugerir ausência histórica. **Risco:** criar índice duplicado ou associar pessoa errada; validar identidade e compatibilidade antes de migração.

##### UX-S06-02 — Cartão de evidência com proveniência explícita
**Tipo:** apresentação. **Prioridade:** P0. **Dependências:** M03, M05, M13, M14, M21. **User story:** “Eu como avaliador, Quero distinguir fato, rumor e informação não verificada com origem e data, Para calibrar minha decisão.” **Critérios:** cada afirmação mostra rótulo, fonte/data quando existentes e confiança somente quando registrada; ausência aparece como não registrada; divergências permanecem separadas; nenhum valor desconhecido é convertido em zero. **Risco:** uma confiança visual parecer verdade objetiva; usar linguagem neutra, legenda textual e escala original.

##### UX-S06-03 — Comparação de candidatos com lacunas visíveis
**Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M03, M18, M21, M22. **User story:** “Eu como responsável por scouting, Quero comparar candidatos por campos equivalentes e rastreáveis, Para entender diferenças sem ocultar incertezas.” **Critérios:** comparação mostra campo, unidade/escala de origem e fonte; lacunas e períodos diferentes são explicitados; seleção e remoção funcionam por teclado e toque; ordenação é escolhida pelo usuário e não apresentada como recomendação automática. **Risco:** falsa comparabilidade entre eras ou escalas; identificar incompatibilidade e não normalizar sem regra existente.

##### UX-S06-04 — Revisão de avanço da shortlist ao contrato
**Tipo:** integração/apresentação. **Prioridade:** P1. **Dependências:** M05, M08, M10, M11, M13, M15. **User story:** “Eu como responsável pelo elenco, Quero revisar o que se sabe e os impedimentos antes de encaminhar um talento, Para iniciar o próximo fluxo sem presumir um acordo.” **Critérios:** revisão resume identidade, evidências principais, desconhecidos e impedimentos disponíveis; confirmação é explícita; encaminhamento conserva ID e abre o fluxo canônico; não cria oferta ou contrato paralelo nem altera termos. **Risco:** usuário interpretar avanço como contratação garantida; rotular claramente como encaminhamento e preservar o estado anterior.

#### 8. Preservação e testes

Preservar todos os candidatos/pessoas, IDs, campos, notas, textos, fontes, eventos, ordem original quando significativa, vínculos e ações já existentes. A reorganização não deve apagar dados ao ocultá-los em seções; manter acesso integral e um caminho claro para retornar ao estado anterior. Não criar macromenu além dos oito grupos, inbox, escala, dado, atalho ou contrato concorrente. Evitar cortes de conteúdo para ganhar desempenho; qualquer otimização deve manter o conteúdo e o comportamento offline/single-file se esse requisito continuar vigente. Salvar a entidade e a trilha de auditoria pelo mecanismo existente e não orientar exclusão de saves.

Testar: (1) candidatos com informação documentada, rumor, fontes conflitantes, sem fonte, sem data e totalmente desconhecidos; (2) zero verdadeiro versus ausente; (3) comparação de escalas/períodos iguais e incompatíveis; (4) shortlist vazia, múltiplos candidatos e retorno por atalho preservando ID/filtros; (5) envio ao contrato com impedimento, cancelamento e retorno, confirmando que não houve contratação implícita nem duplicação de termos; (6) estados de carregamento, erro, conflito de atualização e dado historicamente indisponível; (7) teclado/foco/leitor de tela, contraste sem depender de cor, toque e mobile 390×844, garantindo campos e ações essenciais; (8) round-trip de save, integridade dos IDs e preservação dos registros antes/depois; (9) desempenho sem remoção de dados e sem regressão de uso offline, se aplicável. Critérios devem ser validados contra as regras e fontes canônicas existentes antes de implementação.

### S07 — Negociação e contrato

#### 1. Tarefa principal e limites

Esta tela acompanha a oferta e a negociação de contrato: termos da proposta, opções e ações disponíveis, promessas relacionadas, reação à oferta, identificação da versão em análise e compromissos depois da assinatura. O propósito é permitir que a pessoa entenda o que está sendo oferecido, compare alternativas sem perder o contexto e confirme conscientemente uma decisão. **PROPOSTA:** organizar esses momentos em uma única tela contextual, sem criar outro destino principal ou uma segunda caixa de entrada.

**Observação anterior:** uma proposta contratual foi testada com adiantamento, royalty, prazo, discos devidos, controle criativo, paciência e ações negociais. Sistemas internos de promessas existem; não foi demonstrado um seletor de promessas nessa negociação. Negociação e orientação foram examinadas no código. Isso confirma campos e sistemas citados, não a implementação de toda a jornada, de versões históricas, de um registro de reação ou de compromissos pós-assinatura. O loop completo não foi reexecutado.

Use somente valores que o estado do jogo fornecer. Reação, opção, versão, obrigação, data ou consequência não verificadas devem aparecer como “não informada”, “não disponível” ou “não confirmada”, conforme o caso — nunca como zero, compromisso cumprido ou previsão. Estimativas, caso existam, precisam de fonte, data e incerteza. A proposta de UI não deve alterar regras, RNG, disponibilidade histórica, sigilo ou conteúdo de negociação. **[INFERÊNCIA]** Uma distinção visual entre termos confirmados, opções e promessas pode reduzir confusão, desde que não seja apresentada como evidência de efeito no resultado da negociação.

#### 2. Estado conhecido a reaproveitar

Manter os sete elementos da proposta já observados — adiantamento, royalty, prazo, discos devidos, controle criativo, paciência e ações negociais — em vez de reconstruí-los em paralelo. A existência do sistema de promessas é ponto de integração, não prova de que o seletor ou a associação ao contrato estejam implementados. Se houver ação de resposta ou assinatura, a tela deve invocar a ação canônica existente e receber dela o resultado; não deve simular aceitação, recusa ou efeito provável. Atalhos para histórico, promessas ou mensagens devem abrir o destino existente e preservar a origem/contexto; não criar inbox concorrente.

#### 3. Hierarquia de informação

- **Topo / permanente:** contexto da negociação e estado da oferta ativa; indicação legível da versão e da última atualização somente se fornecidas pela origem; alertas de conflito ou dado ausente; acesso claro a voltar e à ação principal disponível. Nenhum indicador presume que uma oferta esteja aceita ou assinada.
- **Corpo / decisão:** termos contratuais lado a lado; opções ou contrapropostas disponíveis; ações negociais oferecidas pelo sistema, com trade-offs apenas quando explicitados pela fonte. Promessas associadas e consequências confirmadas ficam próximas do termo relevante, sem esconder cláusulas essenciais em abas.
- **Detalhe:** definição do campo, unidade/base, origem, período e explicação de incerteza, quando existentes; conteúdo integral de cláusulas e condições; justificativa para indisponibilidade. Não calcular equivalências nem preencher lacunas sem suporte.
- **Histórico:** versões, reações, eventos e compromissos anteriores apenas quando registrados pelo estado canônico. Cada ocorrência deve conservar seu identificador compartilhado e origem. Se não houver histórico rastreável, declarar essa limitação, em vez de criar retrospectiva inferida.

#### 4. Reorganização espacial

**Desktop — wireframe textual:** cabeçalho compacto com contexto e estado da oferta; abaixo, coluna central larga com proposta atual e termos em blocos alinhados; painel lateral com opções/ações e resumo de promessas efetivamente vinculadas; faixa inferior fixa para revisar, responder ou assinar conforme ações habilitadas. Histórico e definições abrem em painel de detalhe sem ocultar os termos principais. A comparação não substitui a proposta ativa.

**Mobile — wireframe textual:** cabeçalho curto com estado e versão; cartões em uma coluna na ordem dos termos decisivos; controles de opção/ação junto ao termo correspondente; seção recolhível para explicações e histórico; barra de ação fixa inferior com rótulo textual e confirmação explícita. Todos os campos e ações disponíveis no desktop permanecem alcançáveis; nenhuma operação depende de hover, arrastar, cor ou som. Usar controles de toque, foco visível e leitura legível.

#### 5. Campos concretos

A fonte primária é o estado da negociação/proposta fornecido pelo jogo; a disponibilidade abaixo descreve o que foi observado, não garante presença em qualquer situação histórica.

- **Adiantamento** — corpo, termos; proposta contratual testada; valor e moeda exatamente como fornecidos; campo observado, valor da oferta corrente depende da origem.
- **Royalty** — corpo, termos; proposta testada; percentual e base/período somente se fornecidos; campo observado, não deduzir base ausente.
- **Prazo** — corpo, termos; proposta testada; duração e unidade da origem; campo observado, unidade concreta não especificada no briefing.
- **Discos devidos** — corpo, termos; proposta testada; quantidade de discos; campo observado.
- **Controle criativo** — corpo, termos; proposta testada; direito/opção conforme representação original; campo observado, não converter para escala inventada.
- **Paciência** — corpo, negociação; proposta testada; medida/unidade definida pela origem, se houver; campo observado, escala não especificada.
- **Ações negociais** — corpo, controles; ações da negociação; ação discreta disponível no estado atual; ações foram testadas, catálogo e disponibilidade situacional não detalhados.
- **Reação à oferta** — corpo, depois da resposta; resultado da negociação, se fornecido; texto/categoria/valor e momento conforme origem; apresentação ou persistência não verificadas.
- **Versão da oferta** — topo e histórico; identificador/registro de proposta, se existir; número ou identificador e data da origem; versionamento não demonstrado.
- **Promessas associadas** — corpo, vínculo do contrato; sistema interno de promessas; descrição, responsável e prazo somente se existentes; sistema existe, seletor/vínculo nesta negociação não demonstrado.
- **Estado da assinatura** — topo e revisão; estado canônico do contrato; enumeração/status da origem; transição e disponibilidade não verificadas.
- **Compromissos pós-assinatura** — detalhe e acompanhamento; registro de promessas/contrato, se conectado; prazo, responsável e status conforme origem; exposição nesta tela não demonstrada.

#### 6. Fluxo

1. Abrir a negociação pela entrada canônica disponível e manter o contexto de origem.
2. Carregar a oferta ativa; mostrar termos conhecidos, unidade, origem e dados ausentes sem preencher lacunas.
3. Apresentar somente opções e ações realmente habilitadas. Se houver comparação, separar oferta corrente de alternativas.
4. Antes de responder, destacar mudanças e trade-offs explicitamente retornados pelo sistema; não prever reação nem resultado.
5. Permitir consultar promessas pelo sistema existente; associação ao contrato só ocorre se a integração canônica permitir.
6. Antes de assinar, revisar termos integrais, versão identificável se houver, promessas vinculadas e pendências confirmadas.
7. Enviar a ação de assinatura existente e atualizar a tela apenas após confirmação do estado canônico.
8. Depois da assinatura confirmada, mostrar compromissos e prazos existentes, com links de retorno a seus destinos canônicos; registrar histórico somente quando houver evento/ID real.

#### 7. Estados

- **Vazio:** nenhuma proposta fornecida; informar indisponibilidade e preservar navegação de retorno, sem sugerir rejeição ou valor zero.
- **Carregando:** indicar que proposta, opções ou estado estão sendo obtidos; bloquear apenas ações que dependam desses dados.
- **Erro:** explicar qual informação/ação falhou, manter valores anteriores identificados como desatualizados quando aplicável, oferecer nova tentativa segura e evitar envio duplicado.
- **Conflito:** se oferta exibida divergir da corrente, interromper confirmação, mostrar versões/fontes disponíveis e pedir recarga/revisão; não escolher silenciosamente uma delas.
- **Indisponível:** diferenciar campo não aplicável, desconhecido e ainda não conectado (ex.: seletor de promessas não demonstrado); manter o restante da proposta acessível.
- **Assinatura pendente/confirmada:** não inferir sucesso de uma solicitação pendente; só exibir compromissos como pós-assinatura quando a confirmação do estado chegar.

#### 8. Melhorias propostas (não implementadas)

##### UX-S07-01 — Quadro fiel da oferta
**Tipo:** apresentação. **Prioridade:** P1 (prioridade de proposta, não prazo ou esforço). **Dependências:** M03, M13, M18, M21. **User story:** Eu como pessoa que negocia, Quero ler todos os termos da oferta com unidades e origem, Para decidir sem confundir dado ausente com valor zero. **Critérios:** exibe os sete termos observados; mantém conteúdo essencial visível; sinaliza campo desconhecido/indisponível; não altera valores nem regras. **Risco:** sumarização pode omitir base ou condição; preservar texto integral e fonte. **[INFERÊNCIA]** Deve melhorar a leitura comparável da oferta.

##### UX-S07-02 — Comparação identificada de ofertas
**Tipo:** integração. **Prioridade:** P1. **Dependências:** M03, M07, M13, M14, M21. **User story:** Eu como pessoa que negocia, Quero comparar a oferta ativa às versões registradas, Para entender o que mudou antes de responder. **Critérios:** comparar apenas versões fornecidas; indicar origem e data/ID quando existirem; destacar diferenças sem atribuir causalidade; se versionamento não existir, informar que não há comparação disponível. **Risco:** a UI pode dar aparência de histórico auditável a dados não persistidos; não fabricar snapshots. **[INFERÊNCIA]** Pode reduzir erros de comparação.

##### UX-S07-03 — Vínculo explícito de promessas
**Tipo:** integração. **Prioridade:** P1. **Dependências:** M05, M07, M08, M12, M14, M25. **User story:** Eu como pessoa que negocia, Quero consultar e vincular promessas existentes ao contrato, Para acompanhar apenas compromissos realmente assumidos. **Critérios:** consultar o sistema existente; distinguir promessa proposta de aceita/vinculada; exibir responsável, prazo e ID só se presentes; não criar duplicata nem prometer automaticamente. **Risco:** duplicação ou exposição de compromisso não confirmado; manter fonte canônica e confirmação explícita. **[INFERÊNCIA]** Pode tornar compromissos mais rastreáveis.

##### UX-S07-04 — Revisão e acompanhamento da assinatura
**Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M09, M10, M11, M15, M17, M25. **User story:** Eu como pessoa prestes a assinar, Quero revisar termos e pendências e depois localizar obrigações confirmadas, Para concluir com clareza e retomar o acompanhamento. **Critérios:** resumo pré-assinatura mantém acesso integral às cláusulas; confirmação usa estado canônico; pendências e compromissos pós-assinatura só aparecem se registrados; links levam às áreas canônicas, sem segunda inbox. **Risco:** confundir lembrete com obrigação contratual ou sinalizar assinatura antes da confirmação; rotular fonte e estado. **[INFERÊNCIA]** Pode facilitar a retomada após assinar.

#### 9. Preservação e testes

Preservar textos, valores, opções, ações negociais, promessas, eventos, sigilo e regras existentes; não remover acesso integral ao contrato ao reorganizar conteúdo. Não expor informação secreta em resumo, histórico, notificação ou link. Preferências visuais não podem mudar dificuldade nem disponibilidade histórica. A nova camada deve reutilizar entidades e IDs compartilhados, registrar dados desconhecidos como desconhecidos e evitar inventar previsões. Desktop e mobile mantêm o mesmo conjunto de campos e ações, com estruturas próprias.

Testar: fidelidade dos sete termos observados e suas unidades; campos ausentes sem conversão para zero; versões com e sem ID; comparação sem causalidade inventada; promessas existentes, não vinculadas e vinculadas sem duplicatas; ações de resposta disponíveis/indisponíveis; erro, repetição e conflito sem envio ou assinatura dupla; assinatura pendente versus confirmada; compromissos sem prazo/responsável conhecido; sigilo em cada estado; navegação contextual de ida e volta; teclado, leitor de tela, foco, toque e legibilidade em desktop e viewport mobile. Validar que nenhum teste altera RNG, regras ou estado histórico além da ação deliberada do jogador.

### S08 — Projeto musical e repertório

#### 1. Tarefa principal e limites

**Objetivo:** propor uma página central para acompanhar um projeto musical e tomar decisões de composição e repertório. A tela deve reunir, em contexto, projetos/faixas, dependências, responsáveis, orçamento e etapas, permitindo entender o que está pronto, o que depende de outra coisa e qual é o próximo passo válido. A S08 pertence ao grupo **Projetos** já existente; não é um novo macromenu nem uma segunda fonte de verdade.

**Limite explícito:** não redesenhar as interfaces internas de estúdio/gravação nem de lançamento. A S08 pode oferecer acesso contextual às ações já existentes, caso estejam disponíveis, sem substituir essas páginas, duplicar seus fluxos ou alterar suas regras. Nenhuma proposta abaixo confirma que uma ação ou campo esteja implementado.

#### 2. Evidências e base a reaproveitar

**Observação anterior do briefing:** a arquitetura tem oito grupos principais, incluindo Projetos; o Cockpit tem indicadores de mês, caixa, fôlego e fama, além do bloco Agora; busca Ctrl+K e modos Essencial/Completa também existem. O loop inteiro composição/gravação/lançamento não foi reexecutado na versão avaliada. A S08 não foi auditada campo a campo e não há evidência fornecida sobre sua implementação específica.

Portanto, a proposta parte da entidade e do estado canônicos do projeto, sem inventar dados, disponibilidade, fórmulas ou defeitos atuais. Reaproveitar acesso do grupo Projetos e as convenções existentes, mas manter visíveis a origem, o período e a incerteza de resumos. Se dado não existir ou não puder ser carregado, mostrar “não disponível/não conhecido”, nunca zero ou conclusão presumida. Atalhos para outras telas devem carregar o mesmo projeto, faixa e identificador; não criar cópias concorrentes. A expectativa de reduzir trocas de tela e facilitar a retomada é **[INFERÊNCIA]**, não resultado medido.

#### 3. Hierarquia de informações

- **Topo / permanente:** nome do projeto; indicador de etapa corrente somente se houver estado correspondente; e um resumo compacto de repertório, dependências e orçamento, cada dado acompanhado de estado de disponibilidade. Ações contextuais existentes, como abrir detalhe ou continuar um fluxo, não devem parecer novos comandos de jogo.
- **Corpo / decisão:** repertório como lista legível de composições/faixas, com identidade estável, estado conhecido e relação com etapas; dependências em lista ou grafo com relação, condição e origem explícitas; responsáveis por projeto/faixa/etapa; etapas e marcos numa sequência com condição conhecida; orçamento separado em valores planejados, realizados e estimados somente quando cada conceito existir no estado. Destacar impedimentos sem inferir causalidade.
- **Detalhe:** ao selecionar uma faixa, etapa, dependência, pessoa ou rubrica, mostrar seus campos disponíveis, vínculo à entidade de origem, unidade/período, data/fonte e ações válidas. Não esconder dados essenciais à decisão em abas exclusivas; detalhe expansível deve preservar acesso integral.
- **Histórico:** cronologia de eventos conhecidos do próprio projeto, vinculando evento e entidade pelos IDs existentes e exibindo data, ator/origem e alteração apenas quando forem dados registrados. Não atribuir motivo ou consequência não rastreada.

#### 4. Reorganização espacial

**Desktop — wireframe textual:**

```text
[Projetos / caminho] [Nome do projeto]                    [ações existentes]
[Etapa conhecida] [Repertório] [Dependências] [Orçamento: valor + fonte/período]
┌───────────────────────────────────┬──────────────────────────────┐
│ Repertório / faixas               │ Etapas e próximos critérios  │
│ linhas selecionáveis, estados,    │ dependências/impedimentos    │
│ vínculos e acesso ao detalhe      │ responsáveis                 │
├───────────────────────────────────┤ Orçamento e incerteza         │
│ Histórico do projeto              │ fonte, período e atualização  │
└───────────────────────────────────┴──────────────────────────────┘
```

O espaço principal prioriza a lista de repertório; a coluna contextual concentra relações e decisões sem transformar a página em um editor de estúdio ou de lançamento. O resumo fica no topo, mas não substitui os dados detalhados. Em tela estreita ou zoom, as colunas refluem para uma única coluna, sem rolagem horizontal obrigatória.

**Mobile — wireframe textual:**

```text
[← Projetos] [Nome curto do projeto]
[Etapa] [Repertório] [Dependências] [Orçamento]
[Próximo item / critério conhecido]
[Faixas — cartões em lista]
[Dependências e responsáveis]
[Etapas] [Orçamento e fonte]
[Histórico] [mais ações existentes]
```

No mobile, cartões empilhados e resumos compactos substituem a composição em colunas. Links de seção funcionam como atalhos explícitos, não escondem campos/ações e mantêm o acesso à página completa. Alvos de toque, foco, rótulos e estados precisam funcionar sem hover, arrastar, cor ou som. A navegação deve permanecer dentro do grupo Projetos, sem adicionar destinos à barra inferior.

#### 5. Campos concretos e proveniência

A disponibilidade de todos os campos específicos da S08 permanece **não verificada**. A fonte proposta é o estado canônico do projeto e suas entidades relacionadas; confirmar no produto se cada campo existe antes de apresentá-lo. “—” ou “não conhecido” não deve ser substituído por zero.

- **Nome/identificador do projeto** — cabeçalho; entidade Projeto; unidade: texto/ID, sem período; disponibilidade: base necessária, campo da tela não auditado.
- **Etapa corrente** — resumo e bloco de etapas; estado de etapa do Projeto; unidade: etapa/estado, sem período; não auditado, exibir somente se existente.
- **Composições/faixas do repertório** — corpo; coleção de itens relacionados ao Projeto; unidade: item/faixa; não auditado, lista vazia só se confirmada como vazia.
- **Estado de cada faixa** — linha e detalhe; estado registrado no item/faixa; unidade: estado, sem período; não auditado, não inferir progresso.
- **Dependências entre itens/etapas** — corpo e detalhe; relações do projeto; unidade: relação; não auditado, mostrar relação apenas se registrada.
- **Condição da dependência/impedimento** — junto à relação; estado da entidade de origem; unidade: estado, no período atual; não auditado, distinguir bloqueado de desconhecido.
- **Responsável(is)** — corpo/detalhe junto ao escopo correspondente; atribuição registrada no projeto/faixa/etapa; unidade: pessoa/função; não auditado, não presumir responsável único.
- **Orçamento planejado** — resumo e bloco financeiro; rubricas/estado financeiro vinculados ao projeto; moeda e período conforme a fonte do jogo; não auditado, mostrar só se houver base identificada.
- **Custo realizado** — detalhe do orçamento; custos efetivamente registrados; moeda, período e data conforme a fonte; não auditado, ausente é desconhecido, não zero.
- **Estimativa/variação prevista** — bloco financeiro; cálculo ou estimativa existente, com método/fonte e data; moeda e horizonte explícitos; não auditado, não criar estimativa silenciosa.
- **Marcos e critérios de etapa** — bloco de etapas; registros e critérios existentes; unidade: marco/condição, período conforme o calendário do jogo; não auditado, não criar pré-requisitos.
- **Eventos recentes** — histórico; log/eventos vinculados ao projeto; unidade: evento e data/hora/calendário conforme fonte; não auditado, não sintetizar causalidade.

#### 6. Fluxo principal

1. Entrar em **Projetos** por navegação existente, busca ou atalho contextual; selecionar o projeto pelo identificador/nome, sem criar destino duplicado.
2. Ler o resumo, verificando período, fonte e disponibilidade dos números. Abrir a seção pertinente sem perder o contexto do projeto.
3. Examinar repertório; selecionar faixa para consultar apenas os dados e ações que o estado existente disponibiliza.
4. Seguir uma dependência até seu item de origem ou destino; quando bloqueada, mostrar o vínculo e o caminho válido informado pelo sistema, não uma causa presumida.
5. Rever responsáveis, etapas, orçamento e histórico em contexto; distinguir realizado, planejado e estimado.
6. Acionar, se aplicável, um comando existente para prosseguir ao fluxo correspondente. A S08 não efetua avanço automático nem altera regras. Retorno a S08 preserva projeto, seleção e posição quando possível.

#### 7. Melhorias propostas

As propostas são **PROPOSTA**, não fatos implementados; prioridades P0/P1/P2 são categorias de prioridade, não prazo, esforço ou status. Ganhos são esperados e **[INFERÊNCIA]**.

##### UX-S08-01 — Resumo de projeto ancorado à entidade
- **Tipo:** apresentação; **prioridade:** P1; **dependências:** M03, M08, M18.
- **User story:** Eu como gerente do projeto, Quero ver repertório, etapa, dependências e orçamento num resumo contextual, Para retomar e decidir sem perder a referência do projeto.
- **Critérios:** resumo usa os IDs canônicos; cada valor mostra unidade/período e disponibilidade; desconhecido não aparece como zero; cada seção leva ao detalhe completo; ações existentes mantêm seu destino.
- **Risco:** resumo pode omitir uma nuance crítica. Mitigar mantendo acesso integral e indicação de fonte/data.
- **Ganho esperado [INFERÊNCIA]:** menor custo de orientação e retomada.

##### UX-S08-02 — Dependências legíveis e rastreáveis
- **Tipo:** apresentação/integração; **prioridade:** P1; **dependências:** M08, M14, M15, M22.
- **User story:** Eu como responsável por uma faixa, Quero inspecionar suas dependências e impedimentos com origem explícita, Para entender o próximo caminho válido sem confundir correlação com causa.
- **Critérios:** oferecer lista acessível além de qualquer grafo; relações usam IDs compartilhados e direção/rótulo compreensíveis; status desconhecido é distinto de bloqueio; abrir origem/destino conserva o projeto; nenhuma relação é criada por inferência da UI.
- **Risco:** relação visual simplificada pode sugerir causalidade ou direção errada. Mitigar rotulagem explícita e validação de dados de origem.
- **Ganho esperado [INFERÊNCIA]:** leitura mais rápida de interdependências.

##### UX-S08-03 — Orçamento com proveniência e incerteza
- **Tipo:** apresentação; **prioridade:** P1; **dependências:** M03, M13, M21.
- **User story:** Eu como gestor do projeto, Quero comparar valores financeiros disponíveis com suas fontes e períodos, Para avaliar o orçamento sem tratar estimativa como gasto confirmado.
- **Critérios:** separar previsto, realizado e estimado só quando a fonte os distinguir; indicar moeda/unidade, período, atualização e incerteza; ausente não equivale a zero; valores agregados são rastreáveis às rubricas disponíveis.
- **Risco:** soma de períodos ou classes incompatíveis. Mitigar não agregar sem unidade/período compatível e mostrar a origem.
- **Ganho esperado [INFERÊNCIA]:** mais confiança ao interpretar números.

##### UX-S08-04 — Revisão de etapa sem avanço implícito
- **Tipo:** integração/apresentação; **prioridade:** P2; **dependências:** M10, M11, M15, M08.
- **User story:** Eu como líder do projeto, Quero revisar os critérios conhecidos da etapa e os impedimentos antes de sair para uma ação existente, Para escolher conscientemente o próximo passo sem avanço involuntário.
- **Critérios:** exibir apenas critérios que a regra/estado atual informar; deixar claro o que é desconhecido ou indisponível; nenhuma checklist introduz requisito nem executa avanço; ação leva ao destino existente e requer confirmação própria se já prevista.
- **Risco:** checklist ser entendida como regra nova. Mitigar fonte visível e não apresentar orientação inferida como bloqueio de jogo.
- **Ganho esperado [INFERÊNCIA]:** menos tentativas ambíguas e mais clareza sobre transições.

#### 8. Estados, preservação e testes

**Estados a especificar:** carregando (estrutura e rótulo, sem número provisório); sem projetos (orientação e acesso ao fluxo já existente); projeto sem repertório (vazio confirmado, diferente de lista ainda não carregada); dados parciais/desconhecidos (identificar cada campo); indisponível por regra/estado (explicar a condição conhecida e não contornar a restrição); impedimento (relação, origem e próximo caminho válido se conhecido); erro de carregamento (mensagem acionável e nova tentativa sem descartar seleção); conflito de edição simultânea (comparar estado atual e preservar alterações, nunca sobrescrever silenciosamente); valor desatualizado (data/fonte); e possível excesso de orçamento apenas se houver comparação e limiar já definidos pelo sistema. Não afirmar que esses estados atuais existem.

**Preservação:** manter integralmente nomes, faixas/composições, pessoas, relações, valores, períodos, eventos, regras, disponibilidade histórica e ações do jogo. Não alterar RNG, dificuldade, política, calendário ou fluxo de estúdio/lançamento. Usar IDs e vínculos compartilhados nas superfícies cruzadas; não multiplicar projetos, tarefas ou eventos. Não eliminar acesso integral ao mover conteúdo para detalhes. Apresentação Essencial/Completa é distinta de dificuldade. Se requisitos de entrega offline/single-file continuarem vigentes, a solução deve preservá-los e evitar cortes de conteúdo; otimização não é justificativa para remoção.

**Testes de aceitação/regressão propostos (não executados):**
- Navegação a partir de Projetos, busca e atalho contextual mantém um único projeto/ID e retorna à seleção anterior.
- Campos ausentes, zero real, lista vazia confirmada e dado ainda carregando são visualmente distintos; valores mostram unidade, período e fonte.
- Totais financeiros só agregam unidades/períodos compatíveis; estimativas não viram gastos realizados.
- Dependências mantêm sentido e IDs, abrem registros relacionados e não fabricam causa nem critério de avanço.
- Teclado/foco/leitor de tela e toque funcionam sem hover, cor, som ou arrastar; verificar reflow em desktop e em 390×844, considerando a referência observada de aproximadamente 116 px de barras e 728 px de área principal, sem tratar isso como auditoria física completa.
- Estados de erro, conflito, indisponibilidade e retorno preservam seleção e alterações válidas; verificar round-trip de save para campos comparáveis, sem alegar compatibilidade de saves que não foi testada.
- Regressão confirma que estúdio e lançamento continuam em suas telas próprias, as regras/RNG não mudam e nenhuma ação duplicada foi introduzida.

### S09 — Estúdio e gravação

#### 1. Tarefa principal e limites

**Objetivo:** conduzir uma sessão de estúdio, conferindo projeto, equipe/equipamento, faixas aptas, capacidade, custos, escolha criativa existente e resultados conhecidos. A tela não cria música, arte, equipamento, pessoas, faixas, resultados ou regras.

**Observação anterior:** a revisão comum não reexecutou o loop composição/gravação/lançamento na versão 27. Não se afirma como S09 funciona, quais campos existem ou quais resultados produz. A proposta depende de dados e ações já existentes; ausência significa desconhecido/não informado, nunca zero ou conteúdo inventado.

O escopo limita-se à sessão e dependências imediatas. Negociação, composição, lançamento e gestão ficam nos destinos canônicos, com atalhos para a mesma entidade/ação/ID. Sem macromenu adicional ou segunda tela concorrente. Respeitar regras, sigilo e disponibilidade histórica.

#### 2. O que reaproveitar e princípios

Consumir fontes canônicas de sessão, faixa, pessoa, equipamento, capacidade e custos, sem registros concorrentes. A revisão confirmou oito grupos, Ctrl+K, Essencial/Completa, favoritos e avanço por períodos, mas não confirmou elementos específicos de S09. Preservar grupos e usar atalhos contextuais.

UI não altera RNG, sigilo, elegibilidade, disponibilidade histórica ou consequência. Estimativas exibem fonte, período e incerteza quando conhecidos e ficam separadas do realizado. Leitura legível; teclado e toque sem depender de hover, cor, arrasto ou som. Desktop/mobile preservam campos, ações e acesso integral.

#### 3. Hierarquia de informação

- **Topo/permanente:** título, projeto/sessão, etapa e data/período quando disponíveis; impedimento ou próxima ação válida; retorno ao projeto e navegação global.
- **Corpo/decisão:** faixas aptas e motivos, equipe/equipamento, capacidade, custos estimados versus realizados e escolha existente com certeza explícita. Ação só quando permitida.
- **Detalhe:** funções, disponibilidade de equipamento, critérios de aptidão, decomposição de custos e efeitos informados; manter fonte/entidade e retorno à sessão.
- **Histórico:** eventos registrados, em ordem temporal e com IDs compartilhados; não presumir causalidade.

#### 4. Reorganização espacial

**Desktop — PROPOSTA:** manter grupos globais; cabeçalho de projeto/sessão/estado; duas colunas: decisão (aptidão, escolha, ação) e recursos (equipe, equipamento, capacidade, custos). Detalhes/histórico abaixo, recolhíveis mas sem ocultar o essencial. Resumo fixo opcional não pode encobrir conteúdo nem foco.

Wireframe textual:

```text
[Grupos globais / busca]  [Projeto › Sessão] [estado e período]
[Faixas aptas + motivos] [Escolha criativa + efeito/conhecido]
[Equipe + equipamento]  [Capacidade] [Estimado | realizado]
[Ação permitida] [Detalhes da sessão] [Histórico]
```

**Mobile — PROPOSTA:** manter barra global e empilhar cabeçalho, aptidão, escolha, equipe/equipamento, capacidade/custos e ação junto à justificativa. Detalhe/histórico abaixo com controles explícitos; resumo recolhível não substitui dados. Sem colunas estreitas, alvos pequenos ou gesto obrigatório.

Wireframe textual:

```text
[Barra global existente] [Projeto / Sessão / estado]
[Faixas aptas: situação e motivo]
[Escolha criativa: opções existentes e efeito conhecido]
[Equipe + equipamento] [Capacidade] [Custos]
[Ação permitida] [Detalhes] [Histórico]
```

#### 5. Campos concretos

Campos propostos; as fontes são entidades canônicas, não confirmação de atributos na versão 27. Sem dado, indicar indisponibilidade, não zero.

- **Projeto/álbum associado** — topo; vínculo do projeto/sessão; unidade: entidade; disponibilidade: se vínculo registrado.
- **Identificador e etapa da sessão** — topo; estado da sessão; unidade: ID/etapa; disponibilidade: se sessão existente e estado exposto.
- **Data/período e estúdio/local** — topo/detalhe; calendário e local vinculados à sessão; unidade: data/período e local; disponibilidade: somente se conhecidos.
- **Faixas e aptidão** — corpo; estado das faixas no projeto e critérios do jogo; unidade: faixa/estado; disponibilidade: apenas faixas relacionadas, razões quando fornecidas.
- **Equipe e funções** — corpo/detalhe; elenco associado à sessão e ficha da pessoa; unidade: pessoa/função; disponibilidade: integrantes e papéis existentes, sem inventar função combinada.
- **Equipamento** — corpo/detalhe; inventário/atribuições ligados à sessão; unidade: item/estado; disponibilidade: se jogo fornece vínculo e condição.
- **Capacidade** — corpo; capacidade e ocupação que a simulação atribui à sessão/estúdio; unidade: unidade nativa do sistema por sessão/período; disponibilidade: quando informada, sem benchmark presumido.
- **Duração/tempo reservado** — detalhe; agenda/estado da sessão; unidade: tempo por sessão; disponibilidade: se dado conhecido.
- **Custo estimado** — corpo; cálculo/orçamento associado à sessão; unidade: moeda por sessão, com período, fonte, data e incerteza se existirem; disponibilidade: só quando calculado.
- **Custo realizado** — corpo/detalhe; lançamentos financeiros da sessão; unidade: moeda por sessão; disponibilidade: após registro, separado do estimado.
- **Escolha criativa disponível** — corpo; opções já fornecidas pela simulação; unidade: opção/seleção; disponibilidade: somente quando a escolha está aberta.
- **Efeito conhecido da escolha** — corpo/detalhe; informação de consequência apresentada pelo jogo; unidade: texto/indicador e horizonte divulgado; disponibilidade: mostrar desconhecido ou não divulgado quando aplicável, sem prever causalidade.
- **Resultado da sessão** — histórico; registro oficial do jogo; unidade: resultado por sessão/faixa; disponibilidade: apenas após conhecido/registrado.

#### 6. Fluxo

1. Entrar pelo projeto/faixa ou destino canônico, preservando sessão e origem.
2. Conferir identidade/etapa; se desconhecidas, retornar ao projeto sem selecionar sessão arbitrária.
3. Verificar aptidão/motivos e abrir destinos existentes para pré-requisitos.
4. Revisar equipe, equipamento e capacidade, distinguindo indisponibilidade de dado ausente.
5. Conferir custos estimados versus realizados e respectivas fontes/períodos.
6. Comparar e selecionar apenas escolhas existentes; revisar efeitos declarados antes de confirmar.
7. Executar ação permitida; mostrar resultados só quando registrados e manter histórico/retorno.

#### 7. Estados

- **Vazio:** sem sessão/projeto; motivo conhecido e entrada existente, sem inventar sessão.
- **Carregando:** indicar estado, manter contexto e evitar ação duplicada ou confirmação prematura.
- **Erro:** explicar falha; preservar último contexto confirmado e oferecer tentar novamente/retornar, sem presumir sucesso.
- **Conflito:** pedir atualização e bloquear confirmação contraditória; não sobrescrever silenciosamente.
- **Indisponível:** distinguir dado ausente/não revelado/não aplicável/ação bloqueada quando conhecido; nunca mostrar zero como substituto.
- **Bloqueado:** mostrar somente motivos e caminhos existentes; não garantir que resolvê-los libera a faixa.
- **Concluído:** mostrar resultado oficial apenas após registro; desconhecido não é projetado.

#### 8. Melhorias propostas específicas de S09

As quatro melhorias abaixo são **PROPOSTAS**, não funcionalidades implementadas. “P1/P2” é prioridade indicativa.

##### UX-S09-01 — Resumo de sessão com trilha de contexto
- **Tipo:** apresentação/integração. **Prioridade:** P1. **Dependências:** M03, M05, M06, M07.
- **User story:** Eu como produtor, Quero entender de qual projeto e sessão estou cuidando, Para retomar a gravação sem perder contexto.
- **Critérios:** cabeçalho mostra apenas identificador, projeto e estado disponíveis; links levam à entidade canônica e retornam à origem; detalhe e histórico preservam IDs; ausência de dado fica explícita.
- **Risco:** resumir demais pode ocultar uma distinção de sessão; manter acesso completo ao detalhe.

##### UX-S09-02 — Aptidão e capacidade explicáveis
- **Tipo:** apresentação/integração. **Prioridade:** P1. **Dependências:** M13, M15, M21.
- **User story:** Eu como produtor, Quero ver quais faixas estão aptas e por quê, Para decidir o próximo passo sem confundir impedimentos com indisponibilidade.
- **Critérios:** cada estado usa apenas critério fornecido; diferencia bloqueio, ausência de dado e não aplicável quando conhecidos; atalhos abrem o destino existente; capacidade mostra unidade/período e origem ou “não informado”.
- **Risco:** critérios incompletos podem parecer garantia de elegibilidade; explicitar limites e não inferir liberação.

##### UX-S09-03 — Custos estimados e realizados rastreáveis
- **Tipo:** apresentação/integração. **Prioridade:** P1. **Dependências:** M03, M14, M21.
- **User story:** Eu como gestor do selo, Quero distinguir previsão de custo e gasto registrado, Para avaliar o compromisso financeiro da sessão com transparência.
- **Critérios:** estimado e realizado ocupam rótulos separados; moeda, unidade, período, fonte/data e incerteza aparecem quando disponíveis; dado ausente não vira zero; correções preservam histórico e não atribuem causalidade.
- **Risco:** estimativa tratada como cobrança confirmada; rotular claramente natureza e confiabilidade.

##### UX-S09-04 — Escolha criativa com efeitos e resultado separados
- **Tipo:** apresentação/integração. **Prioridade:** P2. **Dependências:** M10, M13, M14, M21.
- **User story:** Eu como artista, Quero revisar as opções criativas existentes e o que se sabe sobre seus efeitos, Para confirmar uma escolha consciente sem receber previsões inventadas.
- **Critérios:** exibir somente opções selecionáveis pelo estado atual do jogo; separar efeito conhecido, desconhecido e resultado já registrado; revisão precede confirmação quando a ação permitir; nenhuma opção ou consequência nova é criada.
- **Risco:** linguagem de apresentação sugerir que efeito incerto é garantido; separar explicitamente certeza, fonte e resultado observado.

#### 9. Preservação e testes

Preservar ações, condições, dados, regras, disponibilidade, sigilo, IDs, custos, aptidão e resultados; não remover nem duplicar conteúdo. Atalhos apontam a entidades existentes. Não adicionar música/arte, pessoas, faixas, efeitos ou dados fictícios. Reordenação mantém acesso integral, save/load e retorno à origem; não presume compatibilidade nem instrui exclusão de saves.

Testes propostos: (1) entrar pelo projeto/faixa e conferir sessão/ID, origem e destino canônico; (2) distinguir ausente, zero real e valor conhecido; (3) validar aptidão sem alterar RNG; (4) conferir estimado/realizado, fonte, unidade, período e incerteza; (5) confirmar escolha apenas em estado permitido, sem efeito inventado; (6) validar histórico/resultado registrado sem causalidade presumida; (7) percorrer estados com teclado e toque; (8) comparar desktop/mobile quanto a campos, ações, legibilidade, foco e acesso; (9) confirmar que não surgiu macromenu ou artefato visual.

### S10 — Lançamento e catálogo

#### 1. Tarefa principal e limites

**Objetivo.** Preparar formato, capa, verba e data de um lançamento conforme a era; revisar e publicar; acompanhar retornos criativos e financeiros; e localizar lançamentos num catálogo pesquisável.

O escopo é apenas S10. Não redefine composição/gravação, regras econômicas, calendário, RNG, sigilo ou disponibilidade histórica, nem cria uma área paralela de projetos/finanças. A mesma entidade deve ligar preparação, publicação, retornos e catálogo. Toda reorganização abaixo é **PROPOSTA**, não implementação.

**Observação anterior:** a revisão de Masters 27 não reexecutou o loop completo de composição/gravação/lançamento. Logo, não comprovou a implementação desta tela nem autoriza diagnosticar defeitos. A reconciliação financeira foi verificada em três meses, inclusive um com custo extra, mas isso não valida retornos de lançamentos. Os tópicos deste capítulo são o escopo solicitado, não fatos de implementação.

#### 2. O que reaproveitar do estado conhecido

Reaproveitar catálogo de destinos/aliases, busca por intenção, resumo/detalhe/histórico e IDs compartilhados (M01–M03, M07); estados consistentes, dependências e revisão antes de avançar (M06, M08, M10); impedimentos com caminho válido, legibilidade e comparação com fonte/confiabilidade (M15, M18, M21); apresentação independente de dificuldade (M20). Manter os oito grupos existentes, sem macromenu novo. Comunicação pode refletir a era sem prejudicar legibilidade. Não presumir integrações não verificadas.

#### 3. Hierarquia da informação

- **Topo/permanente:** obra/lançamento, era, estado (rótulos como rascunho/pronto/publicado são proposta), campos necessários e ação disponível. Explicar indisponibilidade histórica.
- **Corpo/decisão:** antes de publicar, formato, capa, verba planejada e data, com efeitos conhecidos, fonte e certeza; em seguida, revisão do que será confirmado. Depois, retornos criativos e financeiros separados entre observado, estimado e ainda indisponível.
- **Detalhe:** atributos do formato/capa, decomposição de verba disponível, datas/restrições, fonte/confiabilidade dos retornos e metadados do catálogo. Desconhecido não é zero.
- **Histórico:** mudanças, snapshot da configuração publicada, data/evento de publicação e retornos recebidos. Vincular consequências à fonte; não inventar causalidade entre escolhas e desempenho.

#### 4. Reorganização espacial

**Desktop — PROPOSTA:** cabeçalho com obra/era/estado; preparação à esquerda, resumo/revisão à direita. Após publicar, priorizar retornos sem esconder a configuração original; histórico em seção/aba acessível. Catálogo usa busca, filtros, lista e ficha na mesma área funcional. Não depender de hover.

Wireframe: `Topo [obra/era/estado] [Salvar] [Publicar]` → `Esquerda [Formato] [Capa] [Verba] [Data] | Direita [Disponibilidade] [Fonte/certeza] [Resumo]` → `Revisar` → `Retornos [Criativo] [Financeiro] [Histórico]`. Catálogo: `[Buscar] [Filtros] → lista + ficha`.

**Mobile — PROPOSTA:** uma coluna, topo compacto e etapas verticais com rótulo/valor atual; revisão em etapa própria antes de publicar. Publicado: resumo de retorno primeiro, detalhes e cronologia depois. Catálogo: busca no topo, filtros em painel acionado por toque, resultados em lista e ficha em tela cheia. Voltar preserva consulta/posição. Campos e ações permanecem disponíveis com controles explícitos, teclado/foco e alvos de toque; sem depender de cor ou som.

#### 5. Campos concretos e proveniência

As origens abaixo são conceituais propostas: a revisão não confirmou o modelo de dados desta tela. Mostrar período, fonte e incerteza quando aplicável.

- **Formato** — Local: preparação, revisão, ficha. Fonte: configuração do lançamento (a confirmar). Unidade: categoria por lançamento. Disponível na preparação conforme obra/era.
- **Capa** — Local: preparação e ficha. Fonte: referência de arte selecionada; catálogo/origem a confirmar. Unidade: uma referência por versão publicada. Escolha pré-publicação.
- **Verba planejada** — Local: preparação, revisão e detalhe. Fonte: decisão/configuração do lançamento. Unidade: moeda do jogo por lançamento. Não é gasto realizado.
- **Data pretendida** — Local: preparação. Fonte: agenda/contexto temporal existente, não verificado. Unidade: data do jogo. Sujeita a era/regras existentes.
- **Era/contexto** — Local: topo, explicação de disponibilidade e filtro. Fonte: estado temporal da obra/campanha (a confirmar). Unidade: era/período. Desconhecida se não puder ser determinada.
- **Estado de publicação** — Local: topo, catálogo e ficha. Fonte: registro canônico/evento proposto, não confirmado. Unidade: estado por lançamento. Antes/depois conforme evento real.
- **Data efetiva de publicação** — Local: resumo pós-publicação e histórico. Fonte: evento de publicação a confirmar. Unidade: data do jogo. Distinguir da pretendida; só exibir quando registrada.
- **Retorno criativo** — Local: painel pós-publicação, detalhe e histórico. Fonte: eventos/avaliações, caso existam. Unidade: período/evento indicado pela fonte. Sem consolidar sem fonte.
- **Retorno financeiro** — Local: painel pós-publicação e detalhe. Fonte: registros financeiros do jogo, a confirmar. Unidade: moeda e período contábil. Ausência não significa zero.
- **Gasto realizado vs. verba planejada** — Local: detalhe financeiro. Fonte: lançamentos realizados, se discriminados. Unidade: moeda por período. Manter plano e realizado separados.
- **Metadados pesquisáveis (título, formato, era, estado)** — Local: catálogo/filtros. Fonte: registro canônico a confirmar. Unidade: atributos do item. Campo vazio não é inventado.
- **Fonte/confiabilidade do retorno** — Local: detalhe/comparação. Fonte: evento ou registro fundamentador. Unidade: referência e data/período de atualização. Marcar indisponível se desconhecida.

#### 6. Fluxo numerado e estados

1. Abrir S10 pela obra ou catálogo; confirmar obra/era e retomar rascunho associado se houver, sem presumir autosave.
2. Escolher formato e capa entre opções válidas; comparar somente efeitos cuja fonte esteja disponível.
3. Informar verba planejada e data; explicar restrições e apontar caminho válido. Preferência visual não muda regras.
4. Revisar os quatro campos, separar estimativa de compromisso e confirmar publicação intencionalmente.
5. Exibir resultado e preservar configuração publicada. Conforme registrados, mostrar retornos por período/fonte, sem causalidade não demonstrada.
6. Buscar por texto/filtros; abrir ficha/histórico e voltar preservando consulta.

Estados a projetar/testar: **vazio** — orientar seleção da obra ou explicar catálogo sem itens; **carregando** — indicador textual, sem duplicar ações; **erro** — mensagem acionável, escolhas preservadas e repetição possível; **conflito** — mostrar versão/diferenças, manter rascunho recuperável e pedir decisão, nunca sobrescrever silenciosamente; **indisponível** — explicar restrição histórica e não oferecer ação inválida. Distinguir retorno ainda não recebido de zero. Mensagens não dependem só de cor/som.

#### 7. Melhorias específicas — PROPOSTAS

P1/P2 indicam prioridade de design, não status, prazo ou esforço. Ganhos esperados são **[INFERÊNCIA]**.

- **UX-S10-01 — Revisão comparável pré-publicação.** Tipo: apresentação; P1; deps.: M03, M10, M13, M21. User story: “Eu como responsável pelo selo, Quero revisar formato, capa, verba e data com fonte e certeza, Para confirmar sabendo o que é fato ou estimativa”. Critérios: quatro campos no resumo; plano não rotulado como gasto; incerteza explícita; voltar preserva escolhas. Risco: alertas excessivos. [INFERÊNCIA] Pode reduzir erro de confirmação.
- **UX-S10-02 — Snapshot e linha do tempo.** Tipo: integração; P1; deps.: M03, M07, M14. User story: “Eu como responsável pelo selo, Quero ligar configuração publicada e retornos ao mesmo lançamento, Para rastrear o ocorrido sem depender da memória”. Critérios: referência/ID compartilhado; snapshot distingue planejado/publicado; retorno mostra fonte/período ou indisponibilidade; sem causalidade inventada. Risco: fontes podem não ter granularidade/IDs. [INFERÊNCIA] Aumenta rastreabilidade.
- **UX-S10-03 — Busca e filtros preserváveis.** Tipo: apresentação; P1; deps.: M01, M02, M03, M18. User story: “Eu como jogador, Quero localizar lançamentos por texto e atributos, Para reabrir e comparar fichas sem destinos duplicados”. Critérios: teclado/toque; ficha e resultado usam mesmo ID; voltar mantém consulta/posição; ausências não viram valores falsos. Risco: índice ou filtros desatualizados podem ocultar itens. [INFERÊNCIA] Pode reduzir tempo de busca.
- **UX-S10-04 — Explicar disponibilidade histórica por campo.** Tipo: apresentação; P2; deps.: M15, M20, M25. User story: “Eu como jogador, Quero entender por que formato ou data não está disponível nesta era, Para escolher alternativa permitida sem confundir apresentação e regra”. Critérios: motivo textual junto ao campo; alternativas válidas acionáveis; não alterar dificuldade/regras; não usar somente cor. Risco: simplificar regra ou expor sigilo; validar com sistema existente. [INFERÊNCIA] Pode melhorar compreensão das restrições.

#### 8. Preservação e testes

Preservar regras, RNG, sigilo, disponibilidade temporal, conteúdo/eventos, metadados e referências de arte. Não descartar rascunhos nem converter desconhecido em zero. Detalhe/histórico continuam acessíveis; separar verba de despesa, data pretendida de publicação efetiva e observado de estimado. Catálogo reutiliza entidade/ID/ação canônicos, sem duplicação. Texto legível; desktop e mobile distintos; sem dependência exclusiva de hover, arraste, cor ou som.

Testes propostos: (1) preparar–revisar–publicar–retornar–buscar e verificar mesmo ID/snapshot; (2) testar datas, formatos e indisponibilidades em mais de uma era, sem mudar regras/RNG; (3) conferir verba, gasto e retorno por período contra fontes do jogo, mantendo lacunas desconhecidas; (4) testar busca, ficha, histórico, estados e teclado/toque em desktop e mobile 390×844; (5) testar save/load e round-trip de configurações, referências e histórico, sem excluir saves legados. A amostra anterior sem overflow global não aprova esta tela.

### S11 — Ao vivo: show ou turnê

#### 1. Tarefa principal e limites

**Objetivo.** Proposta de um workspace para consultar e acompanhar um evento ao vivo — show isolado ou turnê — reunindo locais, itinerário, capacidade, custos, elenco, conflitos, desempenho e história em torno de uma única entidade canônica. O usuário deve conseguir entender o estado do evento, localizar a próxima decisão ou pendência e abrir o detalhe relacionado sem perder o contexto.

**Limite e evidência.** A revisão anterior confirmou que “Ao vivo” é um dos oito grupos principais, mas não verificou em detalhe a interface, os campos nem as regras de shows/turnês. Portanto, nenhum campo, cálculo, conflito ou fluxo abaixo é apresentado como implementação existente. A estrutura e os ganhos esperados são **[INFERÊNCIA]** e as soluções são **PROPOSTA**. Não reauditar nem alterar mecânicas, RNG, elegibilidade histórica, sigilo ou disponibilidade de dados. Manter-se dentro de “Ao vivo”, sem criar novo macromenu. A turnê e o show são duas modalidades da mesma entidade de evento; datas, paradas e apresentações relacionadas são vistas/ocorrências vinculadas, não destinos concorrentes.

#### 2. Reaproveitamento e princípios

**Observação anterior:** a arquitetura geral tem oito grupos; busca Ctrl+K, modos Essencial/Completa, favoritos e avanço por períodos já existem. Reaproveitar o catálogo/destino canônico, busca e preferências existentes, sem duplicar acesso. O capítulo não conclui que qualquer campo específico de S11 já esteja armazenado.

**PROPOSTA:** o resumo e as vistas de itinerário, local, elenco, conflitos, desempenho e história abrem a mesma entidade e preservam seu ID. Uma ocorrência (por exemplo, uma parada ou apresentação) recebe referência compartilhada e volta ao evento de origem. Exibir desconhecido como “não informado/não disponível”, nunca como zero. Estimativas mostram fonte, data e incerteza; separar previsto de realizado e fatos de projeções. A organização em abas não pode ocultar informação essencial para uma decisão.

#### 3. Hierarquia de informação

- **Topo / permanente:** nome e ID do evento/turnê, modalidade (show/turnê), período e estado registrados; indicador de fonte/atualização e alertas/pendências confirmados. Ações de retorno, busca e navegação ficam nos padrões globais; não depender de hover.
- **Corpo / decisão:** próximo marco registrado, parada/apresentação relevante, situação do itinerário, conflitos identificados por registros de origem e resumo de custos/capacidade/desempenho quando houver dados comparáveis. Cada cartão informa período, unidade, fonte e se é previsto ou realizado. Nenhuma agregação é presumida.
- **Detalhe:** vistas relacionadas de locais, datas e itinerário, capacidade, custos discriminados, elenco e funções, conflito com origem/entidade afetada, métricas de desempenho e registros associados. Acesso a todos os dados sem exigir uma escolha de dificuldade ou política histórica.
- **Histórico:** linha temporal ordenada de alterações e ocorrências registradas, com data, autor/origem quando disponíveis, ID, antes/depois quando armazenado e link para a parada, apresentação ou cena correspondente. Não atribuir causalidade sem evidência.

#### 4. Reorganização espacial

**Desktop — PROPOSTA:** manter cabeçalho compacto da entidade e navegação contextual em tabs ou lista lateral para “Visão geral”, “Itinerário”, “Locais”, “Elenco”, “Conflitos”, “Desempenho” e “Histórico”. O corpo da visão geral usa uma coluna principal para sequência de paradas/próximo marco e uma coluna secundária para alertas e cartões de capacidade, custos e desempenho. Uma seção de detalhe pode ocupar a largura toda. Filtros de período e estado indicam escopo, não mudam regras. Wireframe textual: `Ao vivo > [Evento/ID | modalidade | período | estado]` / `[Visão geral] [Itinerário] [Locais] [Elenco] [Conflitos] [Desempenho] [Histórico]` / `paradas e próximo marco (principal) | alertas e resumos com fonte (lateral)` / `detalhes da seleção + histórico relacionado`.

**Mobile — PROPOSTA:** estrutura diferente, mantendo campos e ações: cabeçalho de duas linhas com nome/estado e ID/período; resumo vertical com pendências; controle de vistas acessível por abas roláveis com rótulos legíveis ou seletor explícito; cartões em coluna e detalhes expansíveis com botão claro. Itinerário como lista cronológica, não mapa obrigatório nem drag-and-drop. Wireframe textual: `[← Ao vivo] [Evento/ID]` / `[estado • período]` / `[resumo e alertas]` / `[Visão geral v]` / `[cartão da parada + abrir detalhes]` / `[fonte • período]` / `[ver histórico]`. Preservar acesso a todos os campos, ações e foco por teclado/toque; nenhum dado dependerá apenas de cor, som ou hover.

#### 5. Campos concretos

Disponibilidade abaixo significa **disponibilidade a confirmar na implementação**, não garantia de que o dado já exista. Para todos, omitir ou explicitar “não informado” quando ausentes. “Fonte de estado” indica origem lógica a validar, não uma tabela/campo confirmado.

- **Identidade/modalidade** — Local: topo. Fonte: registro canônico do evento (a confirmar). Unidade/período: ID estável; modalidade por evento. Disponibilidade: não verificada.
- **Período e fuso** — Local: topo e detalhe do evento/parada. Fonte: datas do evento e do local (a confirmar). Unidade/período: data/hora local e fuso, intervalo. Disponibilidade: não verificada.
- **Local e cidade** — Local: cartão da parada e vista Locais. Fonte: registro de local/recinto e endereço (a confirmar). Unidade/período: recinto por parada; cidade/região. Disponibilidade: não verificada.
- **Sequência do itinerário** — Local: vista Itinerário. Fonte: relações evento–parada (a confirmar). Unidade/período: ordem e data por parada. Disponibilidade: não verificada.
- **Capacidade registrada** — Local: cartão e detalhe do local. Fonte: registro do recinto ou dado associado (a confirmar). Unidade/período: pessoas/assentos por recinto e data de referência. Disponibilidade: não verificada; não inferir capacidade restante.
- **Custos previstos e realizados** — Local: resumo e detalhe de custos. Fonte: registros financeiros atribuídos ao evento/parada (a confirmar). Unidade/período: moeda e período/evento; exibir categorias e fonte. Disponibilidade: não verificada; totais somente quando houver dados conciliáveis.
- **Elenco e funções** — Local: vista Elenco e cartão da parada quando aplicável. Fonte: atribuições do evento e fichas de pessoas (a confirmar). Unidade/período: pessoa/função por evento ou parada; validade temporal. Disponibilidade: não verificada.
- **Conflito, origem e impacto** — Local: alerta no resumo e vista Conflitos. Fonte: registro do conflito e entidades relacionadas (a confirmar). Unidade/período: ocorrência, intervalo e entidade afetada. Disponibilidade: não verificada; não criar conflito por suposição.
- **Métrica de desempenho** — Local: vista Desempenho e resumo. Fonte: registro de resultado/indicador (a confirmar). Unidade/período: unidade nativa de cada métrica e por apresentação/período. Disponibilidade: não verificada; comparar somente métricas equivalentes.
- **Histórico e alterações** — Local: vista Histórico e detalhe da entidade. Fonte: eventos de histórico/auditoria (a confirmar). Unidade/período: ocorrência com data e ID. Disponibilidade: não verificada.
- **Próximo marco/estado** — Local: topo e resumo. Fonte: estado registrado do evento/itinerário (a confirmar). Unidade/período: marco por evento, data quando existente. Disponibilidade: não verificada; não calcular prazo ausente.

#### 6. Fluxo

1. Entrar por Ao vivo ou localizar o destino canônico por busca/favorito; preservar o contexto global.
2. Selecionar show/turnê e validar nome, ID e modalidade antes de agir.
3. Ler estado, período, fontes e resumo; identificar quais informações são desconhecidas.
4. Abrir itinerário ou parada para conferir local, data e capacidade registrada.
5. Consultar elenco e custos conforme o escopo do evento; distinguir previsto de realizado.
6. Abrir conflito para ver origem, intervalo e entidades afetadas; voltar à mesma ocorrência sem perder filtros.
7. Consultar desempenho com unidade/período e fonte visíveis; não somar medidas incompatíveis.
8. Revisar histórico ligado à entidade/ocorrência e retornar à visão geral. Qualquer avanço, edição ou decisão segue os comandos e regras já existentes, não definidos por esta proposta.

#### 7. Estados

- **Vazio:** nenhum evento/turnê no escopo ou nenhum registro para aquela vista; explicar o escopo e oferecer retorno/busca. Não sugerir zero de capacidade, custo ou desempenho.
- **Carregando:** indicar qual vista está carregando; manter cabeçalho e contexto e impedir leitura de dado parcial como final.
- **Erro:** mensagem legível, preservar seleção e filtros, permitir tentar novamente ou voltar; não descartar mudanças não salvas.
- **Conflito:** mostrar registro/origem, período e entidade afetada; estado não equivale a resolução. Se conflito não puder ser verificado, comunicar indisponibilidade em vez de ocultá-lo ou inferi-lo.
- **Indisponível:** explicar quando dado não existe, não foi verificado ou não pode ser consultado; manter distinção entre ausente, desconhecido e não aplicável.
- **Sem resultados/filtro:** dizer qual filtro/intervalo está ativo e permitir limpar; não substituir por indicadores inventados.

#### 8. Melhorias propostas

Prioridade indica importância proposta (não status, prazo ou esforço). Ganhos esperados são **[INFERÊNCIA]**.

##### UX-S11-01 — Resumo rastreável do evento

**Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M03, M18, M21. **User story:** “Eu como gestor de turnê, Quero entender o estado do evento num resumo com fontes, Para decidir o que consultar sem confundir estimativa com resultado.” **Critérios:** ID/modalidade/período sempre visíveis; cartões mostram período/unidade/fonte e previsto vs. realizado; dados desconhecidos aparecem como desconhecidos; teclado e toque alcançam todas as ações. **Risco:** resumo pode sugerir certeza/totalização inexistente; bloquear agregações sem fonte comparável. **[INFERÊNCIA]** Reduzir alternância entre vistas para orientação inicial.

##### UX-S11-02 — Itinerário como relação da entidade única

**Tipo:** integração. **Prioridade:** P1. **Dependências:** M01, M07, M22. **User story:** “Eu como responsável pelo evento, Quero percorrer paradas e apresentações ligadas ao mesmo evento, Para manter contexto e identidade ao consultar cada local.” **Critérios:** navegação preserva ID canônico; cada parada mostra somente campos existentes e sua fonte; voltar restaura a origem; show isolado permanece compreensível sem itinerário artificial. **Risco:** duplicação ou migração de entidades; não alterar IDs/dados e testar round-trip. **[INFERÊNCIA]** Melhorar rastreabilidade entre tour e suas ocorrências.

##### UX-S11-03 — Conflito com proveniência e caminho de retorno

**Tipo:** integração. **Prioridade:** P1. **Dependências:** M05, M07, M14, M15, M21. **User story:** “Eu como produtor, Quero abrir o registro que fundamenta um conflito, Para avaliar a pendência sem presumir causa ou resolução.” **Critérios:** exibir origem, data/período, afetados e confiabilidade quando disponíveis; oferecer retorno à entidade/ocorrência; diferenciar conflito confirmado de informação indisponível; não alterar regras de disponibilidade. **Risco:** falsa causalidade ou exposição de informação; respeitar sigilo e rotular relações como registradas, não causais. **[INFERÊNCIA]** Tornar a investigação da pendência mais auditável.

##### UX-S11-04 — Desempenho e história comparáveis

**Tipo:** apresentação. **Prioridade:** P2. **Dependências:** M03, M14, M21, M24, M26. **User story:** “Eu como artista, Quero revisar resultados e marcos registrados por apresentação, Para aprender com a turnê sem atribuir causalidade não comprovada.” **Critérios:** cada métrica conserva unidade, fonte, período e ocorrência; comparação só entre medidas equivalentes; histórico liga mudança/resultado à ocorrência ou cena quando essa relação existir; ausência de dado permanece explícita. **Risco:** narrativa de causa-efeito ou métrica enganosa; apresentar associação e fonte sem causalidade inventada. **[INFERÊNCIA]** Facilitar leitura longitudinal sem apagar o registro original.

#### 9. Preservação e testes

**Preservação — PROPOSTA:** adicionar somente apresentação e ligações para dados existentes. Preservar os oito grupos, destino canônico, aliases e atalhos; identidade/IDs de evento e ocorrências; campos completos, histórico e links de origem; regras, RNG, sigilo, disponibilidade e dados históricos. Não remover acesso integral por preferência Essencial/Completa; não converter desconhecido em zero, nem estimativa em fato. Separar preferências de apresentação de dificuldade/política histórica. Em alterações de organização, migração reversível e compatibilidade com saves devem conservar seleção, vínculos e histórico; não orientar exclusão de saves.

**Testes — PROPOSTA:**

- Abrir o destino por grupo, busca, favorito e atalho cruzado; confirmar um único evento/ID e retorno consistente.
- Cobrir show isolado e turnê com várias paradas; testar ordem, período, local e escopo da ocorrência sem criar paradas fictícias.
- Verificar cada campo contra fonte/ID e período; validar vazio, desconhecido, unidade, estimativa/realizado e omissão honesta.
- Confirmar totais somente quando conciliáveis; impedir comparação de unidades/períodos incompatíveis e valores zero fabricados.
- Simular conflito, conflito indisponível e conflito resolvido (se o estado existir); conferir origem, sigilo, entidades afetadas e ausência de causalidade presumida.
- Testar histórico com e sem autor, cena ou referência relacionada; ausência não bloqueia acesso ao registro.
- Exercitar estados vazio, carregando, erro, filtro sem resultado, conflito e indisponível com preservação de seleção e filtros.
- Comparar desktop e mobile: mesmos campos e ações, layout adaptado, foco/teclado, toque, ampliação e leitura sem depender de cor, hover ou som.
- Fazer round-trip de save antes/depois da reorganização e conferir IDs, campos, histórico, ordem e links; verificar modo offline/single-file caso esse requisito seja mantido.

### S12 — Sede e operação

#### 1. Tarefa e limites da tela

**S12** reúne a leitura e o acesso à sede e à operação física da organização. Seu escopo é prédio e ambientes, objetos e equipamentos, capacidade, condição e uso; expansão e operação; equipe; e um **endereço canônico** da sede, reutilizável em todos os pontos da interface que se referem ao mesmo lugar. A proposta organiza informação e caminhos de ação sem presumir quais ações ou variáveis existem no jogo atual.

A tela deve responder rapidamente: “onde fica?”, “o que existe nesse espaço?”, “em que condição está?”, “para que está sendo usado?”, “qual capacidade é conhecida?” e “quem ou o que está ligado à operação?”. Expansão, manutenção ou atribuição de equipe só podem aparecer como ações se já forem permitidas pelo estado, pela era e pelas regras vigentes; esta especificação não cria custos, estoques, prazos, efeitos, disponibilidade histórica ou mecânicas novas. Endereço desconhecido deve ser identificado como desconhecido, nunca substituído por zero ou endereço fictício.

#### 2. Base conhecida e limites de evidência

**Observação anterior:** Sede é um dos oito grupos principais do Cockpit. A revisão comum não confirmou o esquema de dados, o inventário, as capacidades, as condições, as ações nem os subdestinos específicos de S12; este capítulo não os apresenta como fatos implementados. A revisão também identificou o desejo de preservar o catálogo de 3.130 desenhos como referência, artes anteriores (ícones, capas e logos), bonecos procedurais em retratos/fichas/palco e arte de ambientes/cidade nova. O requisito desta tela é preservar a arte ambiente nova; a apresentação abaixo não substitui nem descarta esses ativos.

**Proposta:** tratar o estado existente do jogo como fonte de verdade. Conectar prédio, ambiente, equipamento, equipe e endereço às entidades já existentes, quando mapeáveis; exibir fonte, período e incerteza para valores derivados. Onde o mapeamento ou o dado não estiver disponível, marcar “não confirmado/não disponível” sem inventar uma lacuna da implementação. O endereço é uma referência canônica, não cópias editáveis divergentes em cada sala ou equipamento. Os oito grupos continuam intactos; S12 não cria macromenu.

#### 3. Hierarquia de informação

- **Topo/permanente:** nome da sede conforme o estado, endereço canônico (ou estado explícito “desconhecido”), estado geral disponível e período/era do jogo quando fornecidos. Atalhos de volta e ajuda contextual ficam no enquadramento já usado pelo produto; nenhuma informação essencial depende de hover.
- **Corpo/decisão:** lista ou planta navegável de prédios e ambientes, com rótulo textual, função/uso, condição e capacidade apenas quando conhecidos. Um resumo de operação e equipe relaciona pessoas e dependências sem reduzir detalhes a um indicador sem explicação. A expansão aparece como caminho contextual se elegível, com pré-condições e consequências conhecidas, não como promessa de resultado.
- **Detalhe:** ficha de prédio, ambiente, objeto/equipamento ou equipe; endereço canônico vinculado; fonte, unidade/período, data e incerteza dos valores; ações válidas no contexto. Elementos decorativos não substituem rótulos e informações legíveis.
- **Histórico:** alterações e eventos já registrados ligados às mesmas entidades/IDs, em ordem temporal, com origem e período disponíveis. Não fabricar causalidade nem preencher histórico ausente. O histórico complementa, mas não esconde, dados necessários para a decisão atual.

#### 4. Reorganização espacial

**Desktop — wireframe textual:**

```text
[ Sede · identidade | endereço canônico | período | ajuda ]
[ Resumo de operação e alertas confirmados                         ]
[ Prédios/ambientes/objetos ] [ Planta/lista + arte ambiente nova ] [ Ficha contextual ]
[ Equipe e expansão (atalhos contextuais) ] [ Histórico da entidade selecionada ]
```

A área central pode usar ilustração/planta apenas se o recurso visual correspondente existir; alternativa de lista textual deve permanecer disponível. Selecionar um prédio atualiza a ficha no mesmo contexto e realça sua relação com ambientes/objetos. Em larguras menores, a ficha pode ocupar uma vista dedicada, preservando retorno à origem. Endereço e status de conhecimento ficam próximos à identidade, não escondidos em abas. A densidade visual não deve fazer arte pixelada comprometer leitura do texto.

**Mobile — estrutura própria:**

```text
[ Sede · período ]
[ Endereço canônico / desconhecido ]
[ Resumo: operação · condição/capacidade conhecidas ]
[ Prédios e ambientes: cartões tocáveis com rótulos ]
[ Equipe | expansão elegível | histórico ]
[ Detalhe em tela inteira: voltar à lista/contexto ]
```

Priorizar rolagem vertical, alvos de toque claros e detalhe em tela inteira com retorno explícito à seleção de origem. Planta e ilustração são complementares à lista, nunca a única navegação. Os campos e ações disponíveis permanecem os mesmos do desktop, adaptados sem depender de hover, arraste, cor ou som. Os oito grupos principais continuam acessíveis no menu já existente, sem replicar a barra inferior congestionada como requisito desta tela.

#### 5. Campos concretos

A tabela de campos abaixo descreve o contrato de apresentação proposto, **não** uma confirmação de que esses atributos estão hoje persistidos. “Estado do jogo” significa a entidade/registro canônico já disponível após mapeamento; a fonte técnica exata precisa ser verificada na integração, sem nova auditoria ampla. Unidades e períodos só são mostrados quando fornecidos pelo dado.

- **Endereço canônico** — localização: cabeçalho e ficha da sede; fonte: registro de endereço associado à entidade sede (a confirmar); unidade/período: texto/endereço, sem período salvo se versionado; disponibilidade: endereço conhecido ou rótulo explícito desconhecido.
- **Identidade da sede** — localização: cabeçalho; fonte: entidade sede no estado do jogo; unidade/período: nome/identificador; disponibilidade: conforme estado, nunca inventar nome substituto.
- **Prédio/ambiente** — localização: lista/planta e ficha; fonte: entidade espacial existente (mapeamento a confirmar); unidade/período: nome/tipo; disponibilidade: somente locais registrados.
- **Objeto/equipamento** — localização: inventário do ambiente e ficha; fonte: entidade de objeto/equipamento (a confirmar); unidade/período: quantidade/unidade apenas se o estado as definir; disponibilidade: conforme registro.
- **Capacidade** — localização: resumo e detalhe do local; fonte: atributo ou cálculo já existente, com indicação se derivado; unidade/período: unidade e período definidos pela fonte, senão “não informado”; disponibilidade: apenas se conhecida; desconhecido não equivale a zero.
- **Condição** — localização: cartão e ficha; fonte: estado registrado da entidade; unidade/período: escala/unidade e data/período da fonte; disponibilidade: só quando fornecida, com legenda textual.
- **Uso/função atual** — localização: cartão e detalhe; fonte: relação de uso já existente; unidade/período: função e período efetivo se disponíveis; disponibilidade: sem vínculo confirmado, indicar “não informado”.
- **Estado operacional** — localização: resumo de operação e ficha; fonte: estado atual da sede/local/equipamento; unidade/período: categoria e instante/período da fonte; disponibilidade: refletir somente estados existentes.
- **Expansão e pré-condições** — localização: bloco de expansão/contexto de ação; fonte: regras e elegibilidade atuais do jogo; unidade/período: recursos, custos ou duração apenas nas unidades já usadas pelo sistema; disponibilidade: mostrar ação somente quando elegível, senão explicar impedimento conhecido.
- **Equipe vinculada** — localização: resumo e relações da ficha; fonte: atribuições de pessoas já existentes; unidade/período: pessoa/função e período se definido; disponibilidade: mostrar relações presentes, não presumir equipe vazia.
- **Operação/encargos** — localização: resumo ou detalhe operacional; fonte: estado financeiro/operacional existente, se houver ligação explícita; unidade/período: unidade monetária e período da fonte; disponibilidade: condicional, não criar custo estimado.
- **Histórico** — localização: seção de histórico da entidade; fonte: eventos existentes com IDs compartilhados; unidade/período: data/turno/era conforme registro; disponibilidade: apenas eventos retidos pelo jogo.

#### 6. Fluxo principal

1. Abrir Sede pelo destino já existente entre os oito grupos; preservar contexto e seleção anterior quando possível.
2. Ler identidade, período e endereço canônico. Se desconhecido, reconhecer a incerteza sem bloquear o restante da consulta.
3. Percorrer prédios/ambientes em lista; usar planta/arte como visão complementar, se disponível.
4. Selecionar local, objeto ou equipamento para consultar capacidade, condição, uso e fonte/período na ficha contextual.
5. Seguir relações até equipe ou operação e retornar ao objeto de origem sem perder a seleção.
6. Abrir expansão apenas se ação e elegibilidade existirem; revisar pré-condições e efeitos conhecidos antes de confirmar, obedecendo ao fluxo atual do jogo.
7. Consultar histórico para distinguir estado atual de eventos passados. A tela não avança o tempo nem altera RNG por abrir previsões ou detalhes.

#### 7. Estados

- **Carregando:** manter cabeçalho/retorno estáveis e indicar carregamento no conteúdo; não apresentar zeros como placeholders.
- **Vazio:** explicar que não há registros para o recorte atual apenas quando o estado confirmar lista vazia; oferecer retorno ou filtros válidos, se existirem.
- **Erro:** informar falha de leitura/ação sem apagar o último contexto estável; permitir tentar novamente quando suportado.
- **Conflito:** se a fonte indicar versão desatualizada ou conflito de gravação, não resolver silenciosamente; apresentar estado atual e opção de recarregar/continuar conforme mecanismo existente.
- **Indisponível/desconhecido:** diferenciar falta de dado, falta de integração e ação historicamente indisponível. Não converter nenhum desses estados em “zero”, “vazio” ou defeito comprovado.
- **Sem histórico:** dizer que não há eventos disponíveis no histórico consultável, sem inferir que nada aconteceu.

#### 8. Melhorias propostas — não implementadas

Todas são **PROPOSTA**, não retrato do produto atual. Prioridades indicam importância relativa, não prazo, esforço ou status.

##### UX-S12-01 — Endereço canônico e vínculos de localização

- **Tipo/prioridade:** integração; P1. **Dependências:** M01, M05, M07, M14, M30.
- **User story:** Eu como gestor da sede, Quero consultar um endereço canônico associado à sede e aos seus espaços, Para evitar referências divergentes ao mesmo local.
- **Critérios:** um endereço/ID de localização compartilhado é exibido nos contextos ligados; desconhecido é explícito; atalhos cruzados abrem a mesma entidade e preservam origem; histórico e compatibilidade respeitam IDs existentes.
- **Risco:** endereços ou locais legados sem mapeamento podem gerar falsa correspondência; requer reconciliação conservadora, não fusão automática.

##### UX-S12-02 — Ficha espacial com capacidade, condição e uso

- **Tipo/prioridade:** apresentação; P1. **Dependências:** M03, M05, M18, M21, M23.
- **User story:** Eu como operador, Quero comparar ambientes e equipamentos pelos atributos conhecidos, Para entender a situação da sede sem perder detalhes ou incertezas.
- **Critérios:** lista e ficha têm rótulos textuais; cada valor informa fonte/unidade/período quando disponível; dados ausentes são distintos de zero; desktop oferece lista sem depender da planta e mobile mantém os mesmos campos.
- **Risco:** combinar unidades ou períodos incompatíveis induziria comparação enganosa; não calcular agregado sem regra e fonte identificadas.

##### UX-S12-03 — Operação, equipe e expansão contextual

- **Tipo/prioridade:** integração; P1. **Dependências:** M08, M09, M12, M15, M27.
- **User story:** Eu como responsável pela operação, Quero ver equipe, dependências e opções de expansão junto ao espaço relacionado, Para avaliar uma ação válida sem navegar por referências desconectadas.
- **Critérios:** relações apontam para entidades originais; ação aparece somente se disponível no estado atual; impedimentos conhecidos têm caminho válido de retorno; qualquer projeção identifica premissas e não altera RNG/regras.
- **Risco:** sugestão pode parecer execução garantida; separar claramente consulta, projeção e confirmação da ação existente.

##### UX-S12-04 — Arte ambiente preservada com navegação textual equivalente

- **Tipo/prioridade:** apresentação; P2. **Dependências:** M06, M18, M23, M29.
- **User story:** Eu como jogador, Quero reconhecer os ambientes por sua arte nova sem depender apenas da imagem, Para explorar a sede mantendo leitura e acessibilidade.
- **Critérios:** arte ambiente nova permanece associada ao ambiente correspondente; texto, rótulo e lista continuam disponíveis; arte não é substituída por placeholders, nem oculta capacidade/condição/uso; preferência visual não muda dificuldade ou política histórica.
- **Risco:** associações de arte ausentes ou assets de diferentes eras podem ser atribuídos ao lugar errado; manter vínculo e procedência, com fallback textual em vez de inventar imagem.

#### 9. Preservação e testes

Preservar entidades, ações, regras, RNG, sigilo, disponibilidade histórica, textos e IDs compartilhados; manter os oito grupos, os atalhos cruzados e o acesso integral à informação. Não criar segunda inbox nem duplicar mecânicas de outra tela. Manter arte ambiente nova e catálogo de desenhos como referência; não substituir ícones/capas/logos anteriores ou bonecos procedurais das áreas pertinentes. Se houver export/import ou save/load, garantir round-trip das referências e compatibilidade sem apagar conteúdo. Apresentação, idioma, zoom e modo visual devem continuar separados de dificuldade e política histórica.

Testar: endereço conhecido, desconhecido e vínculo entre subentidades; dados de capacidade com unidades/períodos distintos e ausentes; condição/uso sem valor; inventário vazio real versus indisponível; expansão elegível e impedida; equipe vinculada e sem dado; erro e conflito sem perda de contexto; histórico com e sem eventos; origem/retorno de atalhos e IDs; layout desktop e viewport móvel, navegação por teclado e toque, contraste textual independente da arte e leitura por tecnologia assistiva; preservação dos assets ambiente e funcionamento equivalente sem imagem. Verificar que nenhuma sugestão muda regra, RNG ou disponibilidade histórica e que nenhuma informação desconhecida aparece como zero.

### S13 — Finanças e compromissos

#### 1. Tarefa principal e limites

**Objetivo.** Apresentar saldo, fluxo, resultado, ledger e despesas, distinguindo valores realizados, comprometidos e estimados. A pessoa entende o que ocorreu, está assumido ou é projeção, avalia o fôlego e localiza a origem de lançamentos sem confundir previsão com fato.

**Limite de escopo.** A tela organiza informação, sem alterar regras de cálculo/pagamento, RNG, disponibilidade histórica ou dificuldade. Referência contratual abre o registro e identifica obrigações; não reproduz editor, negociação ou ações de contrato. O fluxo fica no destino canônico, com atalhos que preservem entidade, ação e ID.

#### 2. Estado conhecido e cautelas

**Observação anterior:** o Cockpit já exibe indicadores de mês, caixa e fôlego. Em três meses testados, o fechamento financeiro reconciliou, inclusive em um mês com custo extra. Isso não comprova balanceamento de décadas, nem atesta a composição visual, a fonte ou a disponibilidade de cada campo desta tela.

**[INFERÊNCIA]** A tela pode reunir valores, lançamentos e projeções hoje distribuídos. Os campos especificam leitura a ligar às fontes existentes; não afirmam que já sejam exibidos. Dado ausente para era, período ou save é desconhecido/não disponível, nunca zero. Projeção mostra fonte, data e incerteza; não inventar taxa, horizonte ou precisão.

**PROPOSTA:** distinguir em filtros/legendas: realizado (contabilizado), comprometido (obrigação ainda não realizada) e estimado (projeção). Não somar categorias sem explicar o total. Saldo realizado é a base; compromissos e estimativas são cenários separados, sem alterar o ledger.

#### 3. Hierarquia da informação

- **Topo/permanente:** saldo realizado, período e fôlego com base/horizonte; cartões separados, com rótulo textual para realizado, comprometido e estimado. Ações: período, natureza e ajuda.
- **Corpo/decisão:** entradas, saídas, resultado líquido e despesas por categoria. Comparação das três naturezas explicita período e separa projeção de fechamento; destaques abrem registros.
- **Detalhe:** ledger cronológico pesquisável com data, descrição, valor, categoria, natureza, origem e vínculo contratual. Linha expandida revela metadados e abre origem; vínculo não verificável é sinalizado, não inferido.
- **Histórico:** períodos e fechamentos reconciliados com registros originais. Comparação opcional exige unidade/período compatíveis e não reescreve resultados.

#### 4. Reorganização espacial

**Desktop — wireframe textual:** cabeçalho, período e filtros; cartões de Saldo realizado, Fôlego, Resultado e Compromissos; duas colunas (fluxo/comparação e despesas); ledger pesquisável na largura inferior; seleção abre painel lateral com origem, contrato e histórico, sem substituir o destino canônico.

**Mobile — wireframe textual:** título/período; cartões verticais (saldo e fôlego primeiro); seletor acessível Realizado / Comprometido / Estimado; fluxo e despesas recolhíveis; ledger em lista com data, descrição, valor e natureza escrita; detalhe em tela cheia, com retorno a filtros/posição. Sem dependência de hover, arraste, cor ou som. Layout difere do desktop, mas conserva campos/ações.

#### 5. Campos e disponibilidade

Fontes esperadas, a confirmar nos modelos existentes; “ledger/fechamento” não atesta nome de tabela nem implementação.

- **Saldo realizado** — topo; ledger/fechamento; moeda no período; disponível se contabilizado, senão desconhecido.
- **Entradas realizadas** — corpo/fluxo; lançamentos de entrada; moeda por período; se houver registros.
- **Saídas realizadas** — corpo/fluxo; lançamentos de saída; moeda por período; se houver registros.
- **Resultado líquido** — corpo; receitas menos despesas no fechamento; moeda por período; quando verificável.
- **Compromissos pendentes** — topo/ledger; obrigação e origem; moeda e vencimento/período; quando identificável.
- **Estimativa de saldo/fluxo** — corpo; projeção existente; moeda/horizonte; se suportada, com fonte, data e incerteza.
- **Fôlego** — topo; indicador ou cálculo autorizado; período/horizonte e unidade; somente se fonte/base disponíveis.
- **Despesas por categoria** — corpo; ledger agregado; moeda por período/categoria; taxonomia existente, sem alterar regras.
- **Lançamento do ledger** — detalhe/histórico; registro original; moeda/data do evento; conforme registros do save.
- **Natureza do valor** — filtro/ledger; estado de contabilização da fonte; categoria por período; não inferir sem metadados.
- **Origem/vínculo contratual** — detalhe; referência/ID existente; identificador, sem unidade; link se verificável.
- **Data e incerteza da estimativa** — junto à estimativa; metadados da projeção; data/texto por atualização; indisponível se ausentes, sem fabricar valores.

#### 6. Fluxo principal

1. Abrir Finanças pelo destino existente ou atalho cruzado que mantenha tela/entidade.
2. Ler período, saldo e fôlego; conferir unidade, horizonte e indisponibilidades.
3. Filtrar período/natureza; atualizar fluxo, resultado, despesas e ledger sem misturar estados.
4. Abrir categoria/linha para metadados; ao voltar, preservar busca e filtros.
5. Abrir eventual vínculo contratual no destino canônico; retornar à posição original sem duplicar negociação.
6. Consultar histórico/fechamento; comparar sem alterar registros ou proveniência.

#### 7. Estados da tela

- **Vazio:** explicar ausência no período/filtro e permitir período alternativo/limpeza; não mostrar zero sem saldo conhecido.
- **Carregando:** preservar cabeçalho/filtros; indicar região carregada, sem apresentar provisório como final.
- **Erro:** mensagem, escopo e nova tentativa; preservar filtros e não substituir valor por zero.
- **Conflito:** divergência de totais, registros, período ou unidade mostra valores e origem com aviso; não escolher silenciosamente nem corrigir dados.
- **Indisponível:** distinguir dado ausente/não rastreável de zero, vazio e erro. Projeção sem fonte/data/incerteza suficiente não é previsão confiável.

#### 8. Melhorias propostas (não implementadas)

- **UX-S13-01 — Comparador de natureza financeira** (**apresentação**, **P1**). Dependências: M03, M06, M13, M21. **User story:** “Eu como gestor do selo, Quero alternar entre realizado, comprometido e estimado, Para entender o caixa sem confundir lançamentos com projeções.” **Critérios:** cada valor indica natureza, período e unidade; filtros atualizam fluxo, despesas e ledger; estimativa apresenta fonte/data/incerteza quando disponíveis; dados ausentes não são convertidos em zero. **Risco:** somas ambíguas ou estimativa interpretada como caixa confirmado.
- **UX-S13-02 — Ledger com proveniência navegável** (**integração**, **P1**). Dependências: M05, M07, M18, M21, M25. **User story:** “Eu como gestor do selo, Quero abrir a origem de cada lançamento financeiro, Para conferir por que o valor aparece no período.” **Critérios:** linha revela metadados disponíveis; vínculo contratual abre o registro canônico por ID; voltar restaura filtros/posição; origem desconhecida é rotulada como não verificada. **Risco:** vínculo incorreto ou duplicação de ação contratual.
- **UX-S13-03 — Fôlego com base e horizonte explícitos** (**apresentação**, **P1**). Dependências: M03, M06, M13, M21, M25. **User story:** “Eu como gestor do selo, Quero entender a base do indicador de fôlego, Para avaliar a leitura sem presumir um período ou uma certeza que não foram informados.” **Critérios:** mostrar período/horizonte, base e unidade quando disponíveis; distinguir indicador indisponível de zero; não inventar projeção nem alterar cálculo. **Risco:** confiança excessiva em interpretação não coberta pelo cálculo existente.
- **UX-S13-04 — Despesas e períodos comparáveis** (**apresentação**, **P2**). Dependências: M03, M06, M18, M21, M29. **User story:** “Eu como gestor do selo, Quero filtrar despesas e consultar fechamentos anteriores, Para localizar variações preservando os registros de cada período.” **Critérios:** categoria e período ficam visíveis; comparação exige períodos/unidades compatíveis e mostra fonte; histórico abre lançamentos originais; filtros são utilizáveis em teclado e toque. **Risco:** agregação ou comparação entre bases incompatíveis.

#### 9. Preservação e testes

**Preservação:** manter lançamentos, valores, datas, descrições, categorias, vínculos e fechamentos acessíveis; filtros/abas mudam apresentação, não dados ou contabilização. Separar projeções, sem alterar RNG ou criar compromissos. Atalhos contratuais levam ao fluxo canônico. Manter oito grupos, acessibilidade textual/teclado/toque e estruturas desktop/mobile; preferências visuais não controlam dificuldade/política histórica. Não remover dados por otimização.

**Testes propostos:** reconciliar total e ledger nos cenários observados, inclusive custo extra; testar três naturezas e unidade/arredondamento sem alterar fonte; diferenciar ausência, zero, erro e conflito; verificar origem válida/ausente e retorno contratual sem duplicação; confirmar que histórico não muda; exercitar busca/filtros por teclado e toque em desktop e mobile 390×844; explicar/bloquear comparações incompatíveis e exigir proveniência/incerteza para estimativas.

### S14 — Mundo e exploração

#### 1. Tarefa principal e limites

**Objetivo.** PROPOSTA: oferecer um workspace para explorar cidades, cenas, mercados, paradas, política, cultura e rivais, comparando o que importa ao contexto atual com o universo inteiro. Deve permitir transitar entre descoberta espacial e leitura por lista sem privilegiar uma em detrimento da outra: o mapa e o workspace dão acesso equivalente às mesmas entidades e ações.

**Limite.** S14 reorganiza a apresentação e a navegação de informações do mundo; não simula nem altera o mundo. Não cria novos lugares, eventos, mercados, relações, políticas, rivalidades ou disponibilidade histórica. Não muda regras, RNG, sigilo, cronologia nem condições de acesso. Toda entidade continua sujeita ao estado já existente no jogo.

**[OBSERVAÇÃO ANTERIOR]** A navegação tem oito grupos principais, incluindo Mundo; mapa e política já são relacionados no acesso existente. Há história do selo/jogador, álbuns de cenas, facções/fandom e bases de sandbox. Esses recursos preexistentes devem ser reaproveitados, não apresentados como novidades desta proposta. O briefing não comprova a implementação de um workspace S14 específico, nem um defeito do mapa. **[INFERÊNCIA]** Um recorte por relevância pode agilizar a exploração, mas não deve implicar que o restante do universo desapareceu.

#### 2. Fontes de estado e princípios

**[INFERÊNCIA]** As fontes autoritativas adequadas são os registros de mundo/localizações, dados de cenas e entidades vinculadas, estado atual da simulação e histórico já persistido pelo jogo. O briefing não identificou nomes de tabelas, APIs nem cobertura de cada entidade; portanto, essa proposta não afirma que todos os campos abaixo já existam. A interface deve apresentar a fonte e a data do dado quando disponíveis. Estimativas devem explicitar fonte, data e incerteza; ausência de dado é “desconhecido”, nunca zero.

Uma cidade, parada ou rival selecionado no mapa e no workspace abre a mesma ficha, com ID, ações permitidas e estado. Atalhos de Mundo, política, cenas ou outros destinos devem convergir para essa ficha, não duplicar o objeto. Nenhum dado essencial a uma decisão fica inacessível por estar em outra aba.

#### 3. Hierarquia da informação

- **Topo/permanente:** contexto da carreira/selo, período corrente conforme o jogo, título “Mundo”, controle de escopo **Relevante agora / Universo inteiro**, busca e alternância Mapa/Exploração. O escopo é uma preferência de apresentação; as oito categorias principais permanecem intactas.
- **Corpo/decisão:** lista/cartões ou marcadores de cidades, cenas, mercados, paradas, política, cultura e rivais. Cada resultado indica nome, tipo, localização, estado conhecido e motivo de relevância, se o sistema fornecer justificativa. Mapa e lista usam o mesmo conjunto filtrado e mantêm navegação para todo o universo.
- **Detalhe:** ficha contextual do elemento selecionado, ações atualmente válidas, relações e vínculos a cenas/histórico. Agrupa informação por tema; não inventa ações nem consequências. Exibe indisponibilidade e incerteza sem ocultar o elemento.
- **Histórico:** eventos, visitas e mudanças registrados, em ordem temporal e com origem conhecida. Se não houver registro, dizer que o histórico não está disponível; não inferir causalidade a partir de coincidência temporal.

#### 4. Reorganização espacial

**Desktop — PROPOSTA (wireframe textual):**

```text
[Contexto/período]  Mundo > Exploração   [Buscar…] [Relevante agora | Universo inteiro]
[Filtros por tipo: Cidades · Cenas · Mercados · Paradas · Política · Cultura · Rivais]
┌────────────────────── Mapa (60%) ──────────────────┬── Explorar (40%) ──┐
│ Marcadores legíveis, legenda e foco selecionado     │ Lista/cartões       │
│                                                     │ com motivo/estado   │
└─────────────────────────────────────────────────────┴─────────────────────┘
[Seleção abre ficha contextual; histórico e vínculos em seções acessíveis]
```

A lista pode ocupar o corpo enquanto mapa continua acessível por alternância, sem depender de arrastar painéis. No mapa e na lista, foco/seleção é identificável por contorno e rótulo, não só por cor. Se houver muitos resultados, filtros e busca refinam a apresentação, mas “Universo inteiro” sempre oferece acesso integral aos dados elegíveis no jogo.

**Mobile — PROPOSTA:** usar área de título/contexto compacta, busca, seletor de escopo e filtros acessíveis; alternância explícita **Mapa / Lista**, com a mesma seleção preservada. Wireframe: `[Mundo · período] [Buscar]`; `[Relevante agora | Universo inteiro]`; `[Tipos — filtros]`; `[Mapa | Lista]`; `[resultado selecionado / Abrir ficha]`. A ficha ocupa tela inteira com voltar claro, e detalhes/histórico são seções expansíveis. A navegação global continua nos oito grupos existentes e não depende só de hover, gesto de arrastar, cor ou som. Não pressupor que a barra atual tenha espaço livre; a tarefa propõe uma estrutura móvel dedicada, não uma auditoria física.

#### 5. Campos concretos

As localizações abaixo são propostas de interface. Fontes são categorias conceituais, pois a inspeção anterior não confirmou schemas ou disponibilidade de cada campo. Unidade/período deve seguir a resolução nativa do jogo e nunca ser convertida para uma precisão não suportada.

- **Nome e tipo** — resultado/ficha; registro da entidade do mundo; texto/categoria, sem período; disponível quando a entidade estiver definida no estado carregado.
- **Localização e coordenadas** — mapa e ficha; estado geográfico da entidade; local/coordenada nativa, sem período; coordenada só se existente; ausente = “não informado”.
- **Relevância ao contexto atual** — selo/cartão e filtro; regras/metadados de contexto do jogo, se disponíveis; período corrente da simulação; opcional, com razão/fonte; desconhecida quando não computável.
- **Disponibilidade/condição de acesso** — cartão/ficha/ação; estado e regras vigentes no jogo; estado no período corrente; mostrar somente se informado pelo sistema; desconhecido não equivale a indisponível.
- **Mercado/atividade local** — ficha de mercado; dados nativos do local/simulação; unidade original e período a que se refere; mostrar se houver dado; estimativa com fonte/data/incerteza.
- **Cena ou vínculo narrativo** — ficha, seção de vínculos; cena/álbum de cenas já existente; evento ou data nativa; apenas cenas efetivamente ligadas; sem completar cenas faltantes.
- **Política e cultura** — detalhes temáticos; entidades/estado cultural e político já existente; período conforme fonte; cada dimensão só quando registrada; sem síntese especulativa.
- **Rival ou facção relacionada** — seção de relações; registros de rivais/facções/fandom já existentes; estado corrente ou intervalo registrado; não criar associação por proximidade geográfica.
- **Visitas e eventos anteriores** — histórico; log/histórico persistido; cronologia nativa do jogo; só eventos efetivamente registrados, ID/origem quando disponível.
- **Fonte, data e confiança** — metadados junto ao campo; proveniência do estado/estimativa; data da coleta e unidade pertinentes; quando existente; não inventar score de confiança se não houver.

#### 6. Fluxo principal

1. Abrir Mundo > Exploração, ou chegar a um elemento por um atalho/Mundo/mapa; preservar o destino de origem para voltar.
2. Selecionar **Relevante agora** ou **Universo inteiro**. O primeiro recorta a apresentação sem apagar o catálogo total; a razão só é apresentada quando conhecida.
3. Refinar por busca e tipo. A busca inclui cidades, cenas, mercados, paradas, política, cultura e rivais que estejam disponíveis no estado atual, sem criar novos aliases de entidade. **[INFERÊNCIA]** Aliases já previstos no catálogo único de destinos devem encaminhar ao mesmo resultado canônico.
4. Selecionar resultado na lista ou marcador. A seleção sincronizada abre ficha com o mesmo ID e as mesmas ações em ambos os modos.
5. Consultar detalhes, vínculos e histórico. Seguir um vínculo abre a entidade correspondente e permite retornar à origem.
6. Executar uma ação somente se ela já for permitida nessa situação pelo jogo. S14 não confirma nem altera regras; a revisão/confirmação continua no fluxo nativo da ação.

#### 7. Estados

- **Carregando:** manter contexto e controles; indicar carregamento de mapa/lista sem apresentar resultado parcial como universo completo.
- **Vazio:** diferenciar “nenhum resultado neste recorte/filtro” de “nenhuma entidade conhecida”; oferecer limpar filtros, ampliar escopo ou retornar ao mapa. Não fabricar conteúdo.
- **Erro:** preservar escopo/consulta e seleção anterior, indicar o que não carregou e oferecer tentar novamente; evitar exibir cache como atual sem marcá-lo.
- **Conflito:** se mapa/lista ou fontes divergirem, sinalizar os valores e origens conhecidos, conservar o ID canônico e não escolher silenciosamente uma versão nem inferir causa.
- **Indisponível:** mostrar por que a ficha/ação não está acessível somente quando essa razão vier do jogo; manter outras informações e oferecer caminho válido, se houver.
- **Desconhecido/parcial:** rotular campos ausentes e a cobertura do resultado. Um resultado incompleto não deve ser descrito como inexistente nem como zero.

#### 8. Melhorias propostas

Prioridades P0/P1/P2 são ordem de importância proposta, não status, prazo ou esforço confirmado.

##### UX-S14-01 — Um mapa, duas formas de explorar

**Tipo:** integração; **prioridade:** P1; **dependências:** M01, M03, M19, M22, M23. **PROPOSTA.** Sincronizar mapa e lista pelo mesmo ID, seleção, escopo e filtros; navegação cruzada retoma a entidade e o ponto de origem. **User story:** “Eu como explorador do mundo, Quero alternar entre mapa e lista sem perder a seleção, Para chegar às mesmas entidades e ações por qualquer forma de exploração”. **Critérios:** marcador/cartão abrem a mesma ficha e ID; filtros/escopo são coerentes; retorno preserva origem; teclado e toque alcançam ambas as vistas. **Risco:** sincronização mal definida pode exibir estado desatualizado; tratar conflito explicitamente, sem escolher fonte por conveniência.

##### UX-S14-02 — Relevância explicável sem esconder o universo

**Tipo:** apresentação; **prioridade:** P1; **dependências:** M03, M21, M23, M28. **PROPOSTA.** Alternância clara entre recorte relevante e universo inteiro, mostrando razão, fonte e período quando realmente disponíveis. **User story:** “Eu como jogador que planeja a exploração, Quero entender por que um lugar é relevante e ver o universo completo, Para escolher meu próximo destino sem perder alternativas”. **Critérios:** escopo sempre visível; universo inteiro acessível; razão ausente indicada como desconhecida; datas/fonte/incerteza acompanham estimativas. **Risco:** relevância percebida como recomendação oficial ou ranking; rotular o critério real e não fabricar prioridade.

##### UX-S14-03 — Ficha contextual com vínculos rastreáveis

**Tipo:** integração; **prioridade:** P1; **dependências:** M05, M07, M14, M24, M25. **PROPOSTA.** Ficha única para local, cena, mercado, ator/facção e demais tipos disponíveis, com relações e eventos registrados claramente separados de inferências. **User story:** “Eu como jogador investigando um local, Quero ver seus vínculos e histórico com a origem identificada, Para compreender o contexto sem confundir associação com causalidade”. **Critérios:** cada vínculo abre a entidade correta; eventos têm origem/ID quando existentes; falta de dado não gera cena ou causa; retorno à ficha preserva contexto. **Risco:** sugerir causalidade ou revelar informação sigilosa; exibir somente relações autorizadas e marcar explicitamente fatos versus inferências.

##### UX-S14-04 — Exploração móvel e operável sem gestos exclusivos

**Tipo:** apresentação; **prioridade:** P1; **dependências:** M06, M18, M19. **PROPOSTA.** Alternância Mapa/Lista, filtros acessíveis e ficha em tela cheia adequados ao espaço móvel, sem novas macrocategorias. **User story:** “Eu como jogador em dispositivo móvel, Quero buscar e abrir qualquer resultado sem depender de gestos precisos, Para explorar o mundo com os mesmos campos e ações do desktop”. **Critérios:** todos os campos/ações acessíveis; foco e seleção discerníveis sem cor; teclado/leitor e toque têm controles explícitos; mapa tem alternativa em lista; oito grupos preservados. **Risco:** compactação esconder informação decisória; manter escopo, estado, disponibilidade e acesso à ficha visíveis.

#### 9. Preservação e testes

**Preservação.** Manter os oito grupos de navegação, o mapa e todos os dados, ações, relações, cenas, mercados, facções/fandom, história e bases de sandbox já existentes. S14 não substitui nem duplica o mapa como fonte, não remove opções da visão completa, não altera regras/RNG/sigilo/disponibilidade histórica, nem cria conteúdo por preencher lacunas. Atalhos cruzados usam a mesma entidade/ID. Preferências visuais ficam separadas de dificuldade e política histórica. Conteúdo desconhecido fica explicitamente desconhecido.

**Testes propostos.** (1) Paridade: abrir a mesma entidade via mapa, lista e atalho e comparar ID, estado e ações elegíveis. (2) Escopo: alternar relevante/universo inteiro, limpar filtros, buscar cada categoria e verificar acesso ao conjunto completo conhecido, sem contar itens ausentes como zero. (3) Proveniência: validar fonte/período/data/incerteza e apresentação de desconhecido; sem benchmark numérico inventado. (4) Relações: cena, rival/facção e histórico somente quando vinculados no estado, sem causalidade inventada; verificar sigilo. (5) Estados: dados lentos, vazio, falha, divergência e indisponibilidade, com contexto preservado e sem cache silencioso. (6) Interação responsiva: desktop e mobile, teclado, leitor de tela, toque, foco, filtros e caminho de retorno; conferir campos e ações equivalentes. (7) Regressão: validar que destinos cruzados permanecem no grupo Mundo, que política mantém seu acesso e que nenhuma ação ou mecânica foi modificada.

### S15 — Submundo e fraudes

#### Tarefa, limites e base conhecida

**Objetivo.** Dar uma entrada própria e segura para consultar os assuntos de crime e fraudes do jogo, seus riscos conhecidos, oportunidades e ocorrências; quando fizer sentido, permitir retornar ao mesmo assunto nas áreas de mídia e jurídico. A tela organiza e contextualiza informação de jogo — não ensina crime real, fraude, ocultação, evasão ou exploração de pessoas/sistemas. Descrições de delitos devem permanecer narrativas e abstratas, sem passos executáveis, ferramentas, alvos ou aconselhamento operacional.

**Observação anterior:** a área Submundo existe na organização Completa; na organização Essencial, Crime ainda aparece dentro de Mapa e política. A busca “Submundo” retorna ajuda, enquanto “Crime” encontra a área. Fraudes está em Imprensa. A arquitetura nova deve decidir um destino canônico e oferecer atalhos cruzados. Essas constatações não provam defeito ou ausência de conteúdo em outras configurações, nem determinam regras ou disponibilidade de simulação.

**Escopo desta tela:** entrada e navegação entre Crime, Fraudes, riscos, oportunidades e ocorrências; leitura resumida e acesso ao detalhe/histórico; ligação com mídia e jurídico. Não reescreve as áreas de mídia ou jurídico, não cria um macromenu, não altera regras, RNG, sigilo, fatos históricos ou opções de dificuldade e não presume ações/efeitos existentes. A solução abaixo é **PROPOSTA**; disponibilidade de dados e entidades específicas precisa ser confirmada contra o estado real do jogo. Não houve nova navegação ou inspeção de código.

#### Reaproveitamento e princípios

**Reaproveitar como observação:** a entrada existente em Completa, a descoberta atual por “Crime” e o conteúdo de Fraudes em Imprensa. Não duplicar Fraudes numa inbox ou num segundo sistema editorial. **[INFERÊNCIA]** A discrepância entre rótulos e locais pode dificultar a descoberta; recomenda-se resolver com um destino canônico sob um dos oito grupos já existentes, preservando aliases e atalhos. A localização do item no grupo “Mundo” é uma proposta de navegação, não uma constatação.

O catálogo M01 define destino e aliases; M02 acesso por intenção; M03 resumo/detalhe/histórico; M05 retorno/restauração de origem; M07 IDs compartilhados de ocorrência; M13 certeza e trade-offs; M14 consequências rastreáveis sem causalidade inventada; M15 impedimentos e caminhos válidos; M18 acessibilidade; M19 mobile com atalhos/menu completo; M21 fonte e confiabilidade; M23 contexto de mundo; M25 ajuda contextual. Acesso por grupo Essencial/Completa não deve criar duas telas ou conjuntos de dados concorrentes. Informação desconhecida é “não informado”, nunca zero ou risco inexistente. Toda estimativa proposta deve mostrar fonte, data/período e incerteza quando disponíveis.

#### Hierarquia da informação

- **Topo / permanente:** título “Submundo e fraudes”, contexto temporal do jogo quando disponível, seletor de seção (Crime, Fraudes, Riscos, Oportunidades, Ocorrências), busca/filtros, e link contextual de retorno à origem. Manter uma indicação legível da origem da informação e do período selecionado; não fixar níveis de risco sem dado.
- **Corpo / decisão:** resumo dos assuntos relevantes ao contexto atual, com separação visual entre risco, oportunidade e ocorrência; cartões com resumo, estado/período, indicação de certeza/fonte e vínculos de mídia/jurídico, se existirem. A ordenação deve ser explícita (por relevância do contexto ou período) e controlável, sem converter uma hipótese em urgência factual.
- **Detalhe:** narrativa não operacional, entidades relacionadas apenas quando confirmadas pelo estado, fonte/data/confiabilidade, impactos já registrados e relações a outras ocorrências. Ações de mídia/jurídico são atalhos de navegação ao destino canônico correspondente, não botões que executam consequências não verificadas.
- **Histórico:** ocorrências anteriores identificadas por ID estável, com período e estado registrado; mostrar mudanças apenas quando houver registros comparáveis. Não inferir causa, sucesso, culpa, nexo ou resultado ausente.

#### Reorganização espacial

**Desktop (wireframe textual, PROPOSTA):**

`[Mundo ▸ Submundo e fraudes] [Período/contexto] [Voltar à origem]`

`[Crime] [Fraudes] [Riscos] [Oportunidades] [Ocorrências] [Buscar]`

`[Resumo contextual e avisos de fonte/certeza] | [Lista de cartões: resumo · período · status · ID]`

`[Detalhe selecionado: narrativa segura · fonte · relações] [Abrir em Mídia] [Abrir em Jurídico]`

A coluna/lista mantém a seleção ao abrir o detalhe; em telas estreitas de desktop pode recolher-se sem remover acesso aos filtros e histórico. Os dois atalhos aparecem apenas quando existe uma relação válida. Navegação por teclado e foco visível substituem dependência de hover.

**Mobile (390×844 como referência de amostra previamente observada, não garantia universal; PROPOSTA):** manter a navegação global existente, sem adicionar destinos à barra inferior. Cabeçalho compacto com título, período e retorno à origem; seções em seletor rolável com rótulos textuais; busca/filtros em painel acessível; cartões em coluna, detalhe em tela dedicada ou expansão claramente acionável. No detalhe, atalhos de Mídia/Jurídico ficam próximos do vínculo contextual e também acessíveis sem rolagem extrema. Ordem linear: resumo → dados/certeza → ocorrências relacionadas → atalhos → histórico. Usar toque, teclado/leitor de tela e texto além de cor; no retorno, preservar seção, filtros, posição e entidade selecionada quando possível.

#### Campos e proveniência

Os campos abaixo são um **contrato de apresentação proposto**, não uma afirmação de que o jogo já armazena todos eles. Fonte preferencial é a entidade canônica do estado de campanha/ocorrência, com identificador compartilhado segundo M07; se inexistente ou inacessível, mostrar indisponível em vez de fabricar dados.

- **Seção / categoria** — topo e filtros; destino canônico/aliases M01 e taxonomia de campanha (**[INFERÊNCIA]**, confirmar); unidade: categoria; disponibilidade: rótulo sempre, conteúdo conforme configuração/contexto.
- **ID da ocorrência** — cartão, detalhe e histórico; ID compartilhado M07 (**PROPOSTA**); unidade: identificador; disponível somente quando houver ocorrência registrada.
- **Resumo narrativo** — cartão/detalhe; texto de ocorrência ou conteúdo do estado do jogo (**fonte exata a confirmar**); unidade: narrativa; pode estar ausente, nunca substituir por instrução operacional.
- **Estado registrado** — cartão/detalhe; estado explícito da entidade/ocorrência (**[INFERÊNCIA]**); unidade: estado discreto; mostrar “não informado” quando não existir.
- **Período/contexto temporal** — topo/cartão/detalhe; data/período do estado de jogo (**fonte exata a confirmar**); unidade: período do jogo; informar granularidade disponível, sem falsa precisão.
- **Risco conhecido e base** — seção Riscos/detalhe; apenas avaliações ou fatos já registrados, fonte e confiabilidade M21 (**fonte/modelo a confirmar**); unidade: categoria/nível já disponível, nunca número inventado; indisponível se não calculado.
- **Oportunidade registrada** — seção Oportunidades/detalhe; estado da campanha ou registro explícito (**[INFERÊNCIA]**); unidade: descrição/estado, sem prometer ganho; mostrar apenas se houver dado.
- **Entidades relacionadas** — detalhe/ocorrências relacionadas; relações explícitas no estado, sem atribuição presumida (**fonte a confirmar**); unidade: pessoas/grupos/itens conforme jogo; omitir ou indicar desconhecido quando não confirmado.
- **Fonte e confiança** — detalhe e identificação junto a estimativas; registro de origem, data e grau de confiabilidade M21 (**PROPOSTA**); unidade: fonte/data/escala existente; se não houver metadados, informar que não foram fornecidos.
- **Vínculo de mídia** — detalhe/atalho; referência à entidade/ação canônica da área de Imprensa, onde Fraudes já aparece (**observação de localização; relação concreta a confirmar**); unidade: link/ID; disponível apenas quando vínculo válido.
- **Vínculo jurídico** — detalhe/atalho; destino jurídico canônico e entidade correspondente (**fonte/rota a confirmar**); unidade: link/ID; se a rota/registro não existir no contexto, não simular disponibilidade.
- **Linha do tempo** — histórico; registros datados da mesma entidade/ID M07 (**PROPOSTA**); unidade: evento por período; ausência de registro é ausência de dado, não prova de que nada ocorreu.

#### Fluxo principal

1. Entrar pelo catálogo de destinos/alias, pela busca por “Crime”/“Submundo” ou por atalho contextual de mídia/jurídico; todos levam à mesma tela canônica e entidade (PROPOSTA M01/M02).
2. Selecionar seção e período; filtros indicam claramente o escopo e podem ser limpos sem perder o contexto global.
3. Ler resumo, status e origem; abrir cartão para detalhe, sem revelar instruções de prática de delitos.
4. Consultar ocorrências relacionadas pelo ID compartilhado, separando fato registrado, avaliação e dado desconhecido.
5. Usar “Abrir em Mídia” ou “Abrir em Jurídico” para navegar ao mesmo registro/assunto, guardando origem, filtros e seleção para retorno (M05/M07).
6. Voltar à tela e continuar na mesma posição; se não houver vínculo válido, exibir estado indisponível e caminho de volta, não ação simulada.

#### Estados

- **Carregando:** esqueleto textual com rótulos da seção, sem números/indicadores provisórios interpretáveis como zero.
- **Vazio:** distinguir “nenhuma ocorrência registrada neste período/filtro” de “não há dados disponíveis”; oferecer limpar filtros e trocar período sem alterar a campanha.
- **Erro:** mensagem acionável e repetição de leitura; manter filtros/contexto e, se houver último dado em cache, marcá-lo claramente com data e como possivelmente desatualizado.
- **Conflito:** mostrar valores/fontes e períodos lado a lado com indicação de divergência; não fazer média, eleger culpado nem sobrescrever uma fonte silenciosamente. Resolver somente por critério de estado já existente.
- **Indisponível:** explicar se a seção, dado ou destino de mídia/jurídico não existe neste contexto/configuração. Não alterar disponibilidade histórica ou regras; oferecer retorno válido.

#### Melhorias propostas específicas

Cada item é **PROPOSTA**, não status de implementação; P0/P1/P2 expressa prioridade relativa, não prazo, esforço ou confirmação.

- **UX-S15-01 — Destino canônico com aliases de intenção.** Tipo: integração; prioridade P1; dependências: M01, M02, M19, M25. User story: “Eu como jogador, Quero abrir Crime/Submundo/Fraudes pelo mesmo destino canônico, Para encontrar o assunto sem manter áreas concorrentes.” Critérios: aliases atuais encaminham à S15; entrada Essencial e Completa chega à mesma entidade; manter atalhos de origem e não criar macromenu. Risco: mudança de rótulo pode tornar entradas conhecidas menos previsíveis; preservar aliases e validar descoberta.
- **UX-S15-02 — Cartão de risco/oportunidade com proveniência explícita.** Tipo: apresentação; prioridade P1; dependências: M03, M13, M21, M23. User story: “Eu como jogador, Quero distinguir fatos, avaliações e incertezas, Para interpretar riscos e oportunidades sem tratar estimativas como certezas.” Critérios: cada dado mostra fonte/período/confiança quando disponíveis; ausências são rotuladas; nenhuma nota numérica nova é inventada; detalhe preserva contexto. Risco: excesso de metadados pode competir com leitura; usar resumo e detalhe sem ocultar informação essencial.
- **UX-S15-03 — Ocorrência compartilhada e retorno Mídia/Jurídico.** Tipo: integração; prioridade P1; dependências: M05, M07, M14, M15. User story: “Eu como jogador, Quero abrir a mesma ocorrência nas áreas relacionadas e retornar ao ponto de origem, Para acompanhar o assunto sem duplicar registros nem perder contexto.” Critérios: link usa o mesmo ID; destino só aparece quando válido; retorno restaura origem/filtros/seleção; nenhuma causalidade ou consequência é criada pelo atalho. Risco: vínculos ausentes ou inconsistentes; mostrar indisponibilidade e preservar o registro de origem.
- **UX-S15-04 — Navegação móvel por seção e detalhe.** Tipo: apresentação; prioridade P2; dependências: M18, M19, M03, M05. User story: “Eu como jogador em dispositivo móvel, Quero alternar seções, ler um detalhe e retornar sem perder meu lugar, Para consultar ocorrências com controles acessíveis.” Critérios: não acrescenta item à barra inferior global; todas as ações funcionam por toque e teclado/leitor de tela; rótulos não dependem de cor/hover; retorno restaura contexto quando possível. Risco: tela compacta pode ocultar filtros ou atalhos; testar em viewport estreito e deixar ações essenciais diretamente acessíveis.

#### Preservação e testes

Preservar integralmente mecânicas, personagens, páginas, textos, eventos, cenas, referências, ações e campanhas existentes. Não apagar a entrada atual em Completa, a descoberta por “Crime”, nem a localização de Fraudes em Imprensa antes de confirmar migração, aliases e equivalência. Nenhuma proposta altera regras, RNG, sigilo, historicidade, dificuldade ou disponibilidade; nenhuma consequência se torna real pelo simples ato de navegar. Manter compatibilidade de saves, destinos M01 e contexto de origem M05; se aliases forem consolidados, validar que salvamentos antigos e atalhos continuam resolvendo para o mesmo destino. Não retirar conteúdo para caber em mobile; reorganizar apresentação preservando acesso integral.

Testes de aceitação/regressão: (1) buscar “Submundo”, “Crime” e “Fraudes” em Essencial e Completa e confirmar destino canônico/aliases; (2) conferir que nenhum novo macromenu ou segunda inbox foi criado e Fraudes continua alcançável por Imprensa; (3) abrir ocorrência em S15, Mídia e Jurídico e confirmar ID, entidade, origem, filtros e retorno; (4) testar vazio, filtros sem resultado, fonte ausente, conflito, erro e vínculo inexistente sem converter desconhecido em zero; (5) conferir fonte, data/período, confiança e limites de precisão; (6) validar desktop, viewport móvel, teclado, leitor de tela, foco, alvos de toque e contraste sem depender apenas de cor/hover/som; (7) confirmar save/load, aliases e histórico sem mudanças de RNG/regras; (8) revisão editorial de todo texto para garantir que não contenha instruções operacionais de crime ou fraude.

### S16 — Você: trajetória e legado

#### 1. Tarefa principal e limites

**Objetivo.** Reunir, dentro do grupo de navegação **Você** já existente, uma leitura da trajetória do jogador/personagem e dos elementos de vida pessoal, relações, escolhas e consequências, capítulos, álbum e encerramento ou continuidade em sandbox. A tela deve ajudar a entender “o que aconteceu, o que está em curso e que caminhos de leitura/jogo estão disponíveis”, sem transformar uma narrativa ainda em desenvolvimento em uma história já fechada.

**Limite.** Este capítulo cobre apenas S16. A proposta não cria macromenu, não estabelece regras de story mode, não define uma conclusão canônica, nem altera disponibilidade histórica, sigilo, dificuldade, RNG ou mecânicas. Cada seção e atalho deve levar ao destino/entidade já canônicos, com os mesmos IDs e ações, não a cópias. Apresentação ou organização sugerida não significa que uma função já foi implementada.

#### 2. Base conhecida e cautelas

**Observações da revisão anterior (briefing comum):** os oito grupos do produto incluem Você; existem história do selo/jogador, álbuns de cenas, facções/fandom e bases de sandbox. Protagonismo pessoal, cenas faltantes, definição de story mode, fim configurável e álbum final com áudio estão em desenvolvimento. O briefing não comprova a tela, o esquema de dados, o grau de completude ou as interações específicas destes recursos; tampouco permite declarar que algo está ausente do produto inteiro. A tela S16 deve expor claramente o que existe e o que está em elaboração, sem antecipar promessas como conteúdo disponível.

**Regras para a leitura narrativa:** separar fato registrado de interpretação e de conteúdo ainda desconhecido. Uma consequência só deve ser atribuída a uma escolha quando houver relação causal registrada; correlação temporal ou coincidência não basta. Se o jogo não tiver dado, exibir “não registrado/indisponível” em vez de zero, relação rompida, cena perdida ou encerramento. Indicar período e origem dos registros quando disponíveis; granularidade mensal ou precisão equivalente não pode ser presumida. Dificuldade e preferências de apresentação permanecem distintas.

#### 3. Hierarquia da informação

- **Topo/permanente:** identidade/contexto da trajetória (era ou período disponível), capítulo/marco atual quando registrado, indicador de continuidade (story mode, sandbox ou estado desconhecido apenas se essa informação existir) e retorno à origem. É proposta de prioridade visual, não confirmação de campos existentes.
- **Corpo/decisão:** sequência de capítulos/marcos; vida pessoal e relações; escolhas e consequências ligadas a ocorrências; álbum/cenas; opção de explorar/continuar ou consultar encerramento/sandbox quando habilitado. Organizar em seções recolhíveis, mas manter essenciais à decisão acessíveis sem esconder o conteúdo integral.
- **Detalhe:** ficha contextual de personagem/relação, detalhe do evento ou capítulo, proveniência e grau de certeza; abrir sem perder seleção e origem (M05, M21, M24). Mostrar distinção explícita entre dado registrado, inferência e conteúdo em desenvolvimento.
- **Histórico:** linha temporal filtrável de capítulos, escolhas e ocorrências; versões/alterações somente se o jogo realmente as registrar. A ordenação é por período fornecido pelo estado, nunca por data inventada.

#### 4. Reorganização espacial

**Desktop — PROPOSTA.** Preservar cabeçalho e navegação global nos oito grupos. Dentro de Você, cabeçalho compacto de trajetória/período e continuidade; abaixo, área principal em duas colunas: esquerda com linha de capítulos e marcos; direita com painel contextual alternável entre relações/vida pessoal, escolhas-consequências e álbum. A faixa inferior ou painel expandido apresenta histórico integral e filtros. Seleção abre detalhe lateral com fonte, período, certeza e links para a entidade/ocorrência original. Nada depende de hover ou cor exclusiva.

Wireframe textual:

```text
[Grupos globais — Você ativo] [Busca/ajuda]
[Trajetória | período disponível | capítulo/continuidade se registrado]
[Capítulos e marcos        ] [Relações | Escolhas | Álbum]
[linha temporal selecionada] [resumo + abrir detalhe]
[Histórico integral / filtros / ocorrências vinculadas]
```

**Mobile — PROPOSTA.** Não comprimir as duas colunas desktop. Manter os oito destinos globais conforme estrutura existente, sem criar macromenu; conteúdo S16 em coluna única, ordem: contexto/retorno, marco atual, capítulos, relações, escolhas-consequências, álbum e continuidade/final. Usar cartões expansíveis com botão de detalhe de alvo amplo; detalhe ocupa tela cheia com retorno persistente à seção e item de origem. Ações e campos equivalentes aos do desktop, ainda que reordenados. Texto de leitura legível; pixel art reservada a personagens/ambientes. Sem dependência de drag, som ou hover.

```text
[Você · voltar] [contexto/período]
[marco atual se conhecido]
[Capítulos] [Relações] [Escolhas] [Álbum]
[cartões em coluna única → detalhe em tela cheia]
[Histórico] [continuar/explorar, apenas se habilitado]
```

#### 5. Campos candidatos e disponibilidade

A posição abaixo é proposta. **Fonte concreta/esquema de save não foi inspecionado**; fonte indica o registro que deve ser validado antes de implementação. “Base referida” significa que o briefing atesta a existência do conceito, não a presença do campo nesta tela.

- **Período/era:** topo e filtro do histórico; fonte: calendário/estado da campanha a validar; unidade: era/ano ou precisão nativa; disponibilidade: granularidade não verificada.
- **Capítulo/marco atual:** topo e trilha; fonte: progresso narrativo salvo a validar; unidade: capítulo/marco; disponibilidade: formato e status não verificados.
- **História do selo/jogador:** seção trajetória; fonte: história existente mencionada no briefing, registro a validar; unidade: eventos/capítulos; disponibilidade: conceito existente, detalhamento da tela não verificado.
- **Perfil/vida pessoal do protagonista:** seção pessoal; fonte: estado/personagem a validar; unidade: atributo ou registro textual; disponibilidade: protagonismo pessoal em desenvolvimento.
- **Relações e participantes:** seção relações, lista e possível grafo; fonte: registros relacionais/personagens a validar; unidade: par de entidades/estado no período; disponibilidade: campos e histórico não verificados.
- **Escolha registrada:** corpo e histórico; fonte: ocorrência/decisão canônica a validar; unidade: ocorrência/ID; disponibilidade: existência e cobertura não verificadas nesta tela.
- **Consequência vinculada:** detalhe da escolha e histórico; fonte: evento resultante e vínculo causal explícito a validar; unidade: ocorrência/efeito; disponibilidade: não atribuir sem vínculo registrado.
- **Facção/fandom:** relações ou contexto de mundo; fonte: estado de facções/fandom mencionado no briefing; unidade: entidade/estado por período; disponibilidade: base existente, integração em S16 não verificada.
- **Capítulos/cenas:** trilha e álbum; fonte: catálogo de capítulos/cenas a validar; unidade: capítulo/cena; disponibilidade: álbuns de cenas existem; cenas faltantes estão em desenvolvimento.
- **Álbum e mídia:** seção álbum; fonte: álbum de cenas existente e recursos audiovisuais a validar; unidade: cena/áudio; disponibilidade: álbum existente; áudio do álbum final em desenvolvimento.
- **Modo de continuidade/story mode:** topo ou ação final; fonte: configuração/estado de campanha a validar; unidade: modo/sessão; disponibilidade: definição do story mode em desenvolvimento.
- **Final/encerramento configurável:** seção de continuidade; fonte: configuração narrativa a validar; unidade: opção/estado final; disponibilidade: em desenvolvimento; não exibir como configurável até disponível.
- **Sandbox e retomada:** ação de continuidade; fonte: bases de sandbox e save correspondente, mencionadas no briefing; unidade: sandbox/campanha; disponibilidade: base existente, caminhos e regras não verificados.

#### 6. Fluxo principal

1. A pessoa abre **Você** pelo grupo existente e entra no destino canônico S16; a tela preserva contexto de origem e retorno.
2. Consulta o resumo de trajetória, período e capítulo apenas quando registrados. Se algum dado não estiver disponível, vê a lacuna explicitamente, sem valor substituto.
3. Seleciona capítulo/marco para ler detalhe e eventos associados; a ficha contextual retorna ao mesmo ponto.
4. Abre relações ou vida pessoal para consultar registros por entidade e período; alterna lista/grafo somente se a representação for suportada, sempre com lista equivalente.
5. Percorre uma escolha até consequências vinculadas; distingue consequência confirmada de interpretação e pode abrir a ocorrência original.
6. Consulta o álbum de cenas; mídia não carregada não apaga o registro textual nem bloqueia navegação.
7. Usa continuidade/final/sandbox somente se o estado do jogo os habilitar. A tela indica requisito ou indisponibilidade real sem simular bloqueio nem prometer conteúdo em desenvolvimento.

#### 7. Estados

- **Vazio:** não há registros para a categoria/período selecionado. Explicar que não há dado registrado; oferecer limpar filtros e voltar à trajetória, sem sugerir que a pessoa não tenha relações ou escolhas.
- **Carregando:** manter cabeçalho, origem e esqueleto textual; anunciar estado acessivelmente, sem depender de animação.
- **Erro:** explicar que os registros não puderam ser carregados, preservar filtro/seleção e oferecer tentar novamente/retornar. Não converter erro em vazio.
- **Conflito:** em divergência entre estado salvo e detalhe associado, não sobrescrever nem escolher uma versão silenciosamente; mostrar versões/fontes disponíveis e encaminhar à retomada segura.
- **Indisponível:** distinguir bloqueio real, recurso ainda em desenvolvimento e ausência de informação. Desabilitar apenas ação não habilitada, explicar o motivo e preservar navegação para dados disponíveis.

#### 8. Melhorias — PROPOSTAS, não implementações

Prioridades expressam relevância de proposta, não status, prazo ou esforço. Ganhos descritos como esperados são **[INFERÊNCIA]**.

##### UX-S16-01 — Linha de trajetória com proveniência
- **Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M03, M14, M21, M26.
- **User story:** Eu como jogador, Quero percorrer capítulos e marcos com período e fonte, Para entender minha trajetória sem confundir ausência de dado com evento.
- **Critérios:** ordenar apenas por período nativo; mostrar origem e incerteza quando disponíveis; lacunas são rotuladas como desconhecidas; item abre detalhe e retorna à mesma posição; não cria nem altera eventos. **[INFERÊNCIA]** Pode reduzir o esforço para reconstituir a trajetória.
- **Risco:** ordenar por datas incompletas aparenta precisão; mitigar exibindo a unidade real e sem inventar granularidade.

##### UX-S16-02 — Registro de escolhas e consequências rastreáveis
- **Tipo:** integração. **Prioridade:** P1. **Dependências:** M07, M13, M14, M24.
- **User story:** Eu como jogador, Quero ver escolhas ligadas às ocorrências que as confirmam, Para distinguir consequência registrada de interpretação.
- **Critérios:** reutilizar IDs canônicos; abrir ocorrência associada; mostrar consequência apenas com vínculo causal registrado; marcar inferência como inferência; dado ausente não vira efeito negativo/zero. **[INFERÊNCIA]** Pode aumentar a confiança na leitura de causa e efeito.
- **Risco:** associação causal falsa; exigir vínculo verificável e oferecer “sem vínculo confirmado”.

##### UX-S16-03 — Relações pessoais como lista e grafo contextual
- **Tipo:** apresentação. **Prioridade:** P1. **Dependências:** M05, M22, M23.
- **User story:** Eu como jogador, Quero consultar relações por pessoa e período em lista ou grafo, Para compreender vínculos sem perder o contexto histórico.
- **Critérios:** lista equivalente sempre disponível; detalhe mostra entidade, período e fonte quando registrados; relação desconhecida não é renderizada como ruptura; navegação de retorno restaura seleção; nenhum dado novo é inferido da geometria do grafo. **[INFERÊNCIA]** Pode facilitar comparar relações ao longo da trajetória.
- **Risco:** grafo sugere vínculo ou intensidade não existente; usar somente arestas e estados sustentados por dados e rótulos textuais.

##### UX-S16-04 — Álbum e continuidade sem antecipar conteúdo
- **Tipo:** integração. **Prioridade:** P1. **Dependências:** M05, M09, M15, M17, M19, M20, M30.
- **User story:** Eu como jogador, Quero abrir cenas e retomar ou explorar sandbox conforme o estado disponível, Para escolher como continuar sem perder conteúdo nem confundir preferências com regras.
- **Critérios:** reutilizar cena/IDs do álbum; áudio ausente não impede acesso ao registro; identificar story mode/final configurável como indisponível enquanto não habilitados; preservar escolha de retomada e save; continuidade não altera RNG, dificuldade ou política histórica; desktop e mobile oferecem as mesmas ações. **[INFERÊNCIA]** Pode tornar a transição entre leitura e retomada mais clara.
- **Risco:** UI anunciar recurso ainda em desenvolvimento como entregue; refletir disponibilidade real do estado e não tratar roadmap como ação executável.

#### 9. Preservação e testes

**Preservação.** Manter todos os oito grupos e o destino canônico dentro de Você; não criar menu ou inbox paralelos. Reusar entidades, ações e IDs de personagem, evento, capítulo, cena, relação e sandbox. Não remover história, cenas, facções/fandom ou bases existentes ao reorganizar; manter acesso integral apesar de resumo, filtros e abas. Não tornar dado desconhecido igual a zero, nem atribuir causalidade sem vínculo. Não modificar saves por mera visualização, nem dificuldade, RNG, sigilo, cronologia ou disponibilidade histórica. Estados de desenvolvimento são rótulos de disponibilidade, não fatos jogáveis. Preferências visuais ficam separadas da dificuldade; conteúdo textual segue legível e interfaces acessíveis por teclado/toque. Compatibilidade e migração devem preservar round-trip dos saves, sem orientar exclusão.

**Testes sugeridos (PROPOSTA):**

1. Abrir S16 pela navegação global e por atalho cruzado; confirmar um único destino/IDs e retorno ao ponto de origem.
2. Validar cada campo contra sua fonte real, granularidade e disponibilidade; cobrir fonte desconhecida, dado vazio e período impreciso sem conversões inventadas.
3. Verificar que escolha, evento e consequência só se conectam com vínculo confirmado, e que abrir/fechar detalhe não altera estado ou ordem original.
4. Comparar contagem/acesso a capítulos, cenas, relações e dados antes/depois da reorganização; conferir que filtros não ocultam acesso integral.
5. Testar carregamento, erro, conflito e indisponibilidade; erro não pode virar tela vazia e recurso em desenvolvimento não pode parecer acionável.
6. Conferir teclado, foco, leitor de tela/nomes textuais, contraste não exclusivo por cor, alvos de toque e legibilidade em 390×844; desktop e mobile têm os mesmos campos e ações sem exigir hover/drag/som.
7. Abrir álbum sem áudio e com conteúdo de mídia indisponível; texto e navegação permanecem utilizáveis.
8. Fazer round-trip de save válido e verificar que a consulta S16 não muda dados narrativos, dificuldade, RNG, sigilo nem elegibilidade histórica de conteúdo.

### S17 — Central da campanha

#### 1. Tarefa e limites

S17 é proposta como workspace de ciclo de vida da campanha: iniciar **Nova run**, retomar uma campanha existente ou consultar sua ficha/passaporte. No mesmo lugar, a pessoa deve entender parâmetros da run, preferências de apresentação, identidade do save e ações disponíveis para carregar, exportar e preservar. Criar, retomar e consultar são estados de uma ficha contextual, não fluxos desconectados.

O escopo é setup, leitura de parâmetros, preferências independentes, ficha/passaporte e saves. Não acrescenta mecânicas, modos, macromenus, regras ou campanha paralela; não altera regras, RNG, sigilo, dificuldade ou disponibilidade histórica. Opções sem comprovação ficam fora do setup, e dados desconhecidos não são mostrados como zero.

#### 2. Reaproveitamento e limites da evidência

**[OBSERVAÇÃO ANTERIOR]** O briefing registra que Save 23 foi recusado pela versão 27 e orienta não recomendar sua exclusão. O round-trip Save 27→27 preservou os campos comparados, sem demonstrar preservação universal. O HTML chegou a cerca de 17 MB; otimizar sem retirar conteúdo e manter offline/single-file caso esse requisito continue válido. Não foi verificado se S17 já possui campos de setup, passaporte ou ações de save; o branch mencionado tampouco foi inspecionado.

**[INFERÊNCIA]** Uma ficha com estados legíveis pode ajudar a distinguir configuração da run de preferências pessoais, mas isso não diagnostica defeito atual. Formatos, metadados e compatibilidade além dos dois casos citados são desconhecidos. Nenhuma proposta abaixo é funcionalidade comprovadamente implementada.

#### 3. Hierarquia da informação

- **Topo/permanente:** título, campanha selecionada, estado (nova, retomável ou consulta), ação contextual e save em foco. Oferecer Nova run, Retomar e Consultar conforme disponibilidade validada; nunca sobrescrever silenciosamente.
- **Corpo/decisão:** setup e parâmetros confirmados; preferências de apresentação separadas de dificuldade/política histórica; na retomada, identificação do arquivo, compatibilidade conhecida e ações. Confirmar substituição de contexto em memória.
- **Detalhe:** ficha/passaporte expansível com parâmetros integrais e metadados realmente disponíveis (formato/versão, origem/data, progresso/marcos). Explicar indisponibilidade; expansão não deve ocultar dados essenciais para decidir.
- **Histórico:** operações de carregar/exportar e saves apenas se registrados por fonte verificável. Sem fonte, dizer “sem histórico disponível”, não “nunca ocorreu” nem atribuir causalidade.

#### 4. Organização espacial

**Desktop — wireframe textual:** cabeçalho com campanha/estado e ações; coluna principal com seletor ou formulário Nova run e parâmetros agrupados; lateral com Preferências de apresentação e bloco separado de regras/dificuldade/política. Abaixo, ficha integral e histórico. Na retomada, arquivo, compatibilidade e Carregar/Exportar/Consultar aparecem juntos; detalhes técnicos podem ser recolhidos, nunca os avisos.

**Mobile — wireframe textual:** cabeçalho compacto; seletor e ação primária; coluna única na ordem campanha → parâmetros → preferências → arquivo/compatibilidade → ficha → histórico. Ações explícitas e alcançáveis, sem hover/arraste; resumo expansível mantém avisos, fonte e incerteza junto aos valores. Mesmos campos e ações do desktop, com estrutura própria para toque.

#### 5. Campos, fontes e disponibilidade

Os campos abaixo são **PROPOSTA** de organização, não evidência de implementação. Fonte ou granularidade não verificadas devem permanecer desconhecidas.

- **Nome/ID da campanha** — topo/ficha; metadado do save ou entrada do setup; por campanha; só se presente/editável no fluxo real.
- **Estado nova/retomável/consulta** — topo; seleção e resultado de leitura/validação; estado da sessão; retomável somente após validação.
- **Parâmetros e valores de setup** — corpo/detalhe; configuração da run/save, a confirmar; por run e unidade nativa; apenas opções comprovadamente suportadas.
- **Dificuldade** — corpo, bloco próprio; configuração efetiva/persistida, fonte a confirmar; por run; exibir somente se disponível.
- **Política histórica** — corpo, bloco próprio; configuração efetiva/persistida, a confirmar; por run; nunca misturar com apresentação.
- **Preferências de apresentação** — seção independente do corpo; armazenamento/escopo não verificados; por preferência/sessão conforme fonte; mostrar valores confirmados, sem supor persistência ou efeito na campanha.
- **Período/data corrente** — ficha/detalhe; estado persistido, se houver; unidade nativa, precisão desconhecida; não inventar granularidade mensal.
- **Progresso/marcos** — ficha/histórico; eventos/campos persistidos; por marco e período nativo; opcional, sem narrativa causal não registrada.
- **Versão/formato do save** — corpo/passaporte; cabeçalho/metadados legíveis; por arquivo; ausência não comprova compatibilidade.
- **Compatibilidade/validação** — junto ao arquivo e a Carregar; resultado real do carregador; por tentativa/build; distinguir compatível, incompatível e não determinado.
- **Data/origem/tamanho do save** — passaporte; metadados do arquivo/sistema se expostos; por arquivo; sem deduzir valor ausente.
- **Operações carregar/exportar/preservar** — controles/histórico; resultado verificável; por operação; sucesso só após conclusão, e histórico pode não existir.

#### 6. Fluxo

1. Abrir S17 e escolher Nova run, Retomar ou Consultar; conservar seleção ao abrir detalhes.
2. Em Nova run, revisar apenas parâmetros confirmados, com valores/unidades; separar preferências pessoais e não introduzir opção não verificada.
3. Ajustar apresentação em seção independente; deixar claro que não altera gameplay e não sobrescreve configuração de campanha sem aviso.
4. Para retomar, selecionar arquivo e ler passaporte, validação, compatibilidade e desconhecidos; consulta não carrega.
5. Confirmar início/carga e reportar resultado real. Se substituir contexto em memória, identificar o que será substituído e pedir confirmação.
6. Exportar por ação explícita; indicar destino/resultado somente se confirmado, preservar original e validar export quando possível. Falha não equivale a preservação.

#### 7. Estados

- **Vazio:** sem seleção; oferecer criar, escolher arquivo ou ajuda; não inferir que nunca houve save.
- **Carregando:** indicar objeto/etapa; bloquear só ações conflitantes; sem percentual inventado.
- **Pronto — nova / retomada:** setup revisável ou passaporte com ações validadas.
- **Consulta:** ficha somente leitura; esclarecer que não carregou partida.
- **Erro:** identificar operação; conservar seleção/original; oferecer tentar novamente/voltar, sem prometer recuperação não testada.
- **Conflito/incompatível:** explicar versão/build conhecida; não converter, sobrescrever ou recomendar exclusão. Save 23 recusado pela 27 é um caso, não uma regra universal.
- **Indisponível/não determinado:** distinguir campo ausente, incompatibilidade e falta de validação; mostrar desconhecido, não zero.
- **Exportação interrompida:** declarar que não há export confirmado e preservar a origem.

#### 8. Melhorias propostas — não implementadas

P0/P1 expressam importância proposta, não prazo, status ou esforço confirmado.

##### UX-S17-01 — Ficha única de ciclo de vida
- **Tipo/prioridade:** apresentação, P0. **Dependências:** M03 resumo/detalhe/histórico; M05 ficha contextual; M17 retomada de save; M18 legibilidade/teclado/toque.
- **User story:** Eu como jogador, Quero criar, retomar ou consultar pela mesma ficha contextual, Para entender meu estado e escolher ação compatível.
- **Critérios:** identidade comum aos três estados; ação principal depende de estado/validação; consulta não carrega; abrir detalhe conserva seleção; campo sem fonte aparece desconhecido.
- **Risco:** estado retomável incorreto induzir carga inválida. **[INFERÊNCIA] Ganho esperado:** tornar o próximo passo mais claro e reduzir troca de contexto.

##### UX-S17-02 — Preferências explicitamente independentes
- **Tipo/prioridade:** apresentação, P0. **Dependências:** M06 estados/componentes consistentes; M18 acessibilidade; M20 apresentação independente de dificuldade.
- **User story:** Eu como jogador, Quero ajustar apresentação sem confundi-la com regras ou dificuldade, Para personalizar leitura sem alterar a campanha.
- **Critérios:** apresentação em seção separada; exibir escopo/fonte conhecidos; não alterar save silenciosamente; controles por toque/teclado, sem depender de cor.
- **Risco:** persistência de preferência não verificada. **[INFERÊNCIA] Ganho esperado:** reforçar confiança de que a apresentação não muda a simulação.

##### UX-S17-03 — Passaporte e compatibilidade honesta
- **Tipo/prioridade:** integração, P0. **Dependências:** M05 ficha; M17 retomada; M21 fonte/confiabilidade; M30 passaporte/compatibilidade.
- **User story:** Eu como jogador, Quero consultar proveniência e compatibilidade conhecida antes de carregar, Para não confundir incompatibilidade com arquivo perdido ou vazio.
- **Critérios:** somente metadados lidos; indicar contexto/build validado quando houver; separar incompatível de não determinado; não excluir/sobrescrever original; tratar Save 23/27 como caso específico.
- **Risco:** metadado parcial pode parecer garantia integral. **[INFERÊNCIA] Ganho esperado:** apoiar decisão informada e reduzir ação irreversível equivocada.

##### UX-S17-04 — Exportação com confirmação verificável
- **Tipo/prioridade:** integração, P1. **Dependências:** M17 retomada; M18 acessibilidade; M29 performance sem cortes; M30 passaporte.
- **User story:** Eu como jogador, Quero exportar e preservar o save sem remover conteúdo nem substituir a origem, Para poder retomar a campanha com segurança.
- **Critérios:** ação explícita informa destino/resultado reais; mantém original; sucesso só após conclusão; erro/interrupção próprios; round-trip compara campos definidos; otimização preserva conteúdo e offline/single-file se ainda requerido.
- **Risco:** export parcial ou incompatibilidade futura; um round-trip não prova preservação geral. **[INFERÊNCIA] Ganho esperado:** facilitar cópias e tornar explícitos os limites de confiança.

#### 9. Preservação e testes

Preservar sistemas, campanhas, regras, textos, eventos, cenas, referências, opções existentes, dados e conteúdo integral dos saves; S17 reorganiza informação e não cria ação não suportada. Não descartar campos desconhecidos, converter formato sem confirmação ou recomendar exclusão. Manter original/proveniência e não prometer compatibilidade retroativa. Preferências de apresentação continuam distintas de dificuldade e política histórica. Otimização de tamanho não retira conteúdo e mantém offline/single-file enquanto requisito vigente. Controles e avisos devem funcionar sem hover, cor ou som; não ocultar dados essenciais.

Testar: tela sem save (vazio não é zero/nunca salvou); setup revisável e consulta sem carga; retomada com validação real; arquivos inválidos/incompatíveis/não determinados sem exclusão ou sobrescrita; erro/cancelamento de export sem falso sucesso; round-trip 27→27 comparando os mesmos campos do teste anterior, sem extrapolar; Save 23 recusado pela 27 sem recomendar exclusão; independência de preferências e ausência de alteração em regras/dificuldade/RNG; teclado, toque e todos os avisos em mobile; e, se houver otimização, conteúdo integral e operação offline/single-file aplicável. Branch não inspecionado: este plano não afirma implementação atual.


<a id="parte-iv"></a>

## Parte IV — Nova run completa: campos, dependências e revisão

> **Escopo deste capítulo:** somente a configuração de **Nova run COMPLETA**, como complemento ao panorama amplo de telas. Os controles rápidos da primeira tela de nova run não são usados como inventário da tela completa.

### 1. Evidência, limites e nomenclatura

**[OBSERVAÇÃO DIRETA — código e interface]** A tela completa real, em `/home/ubuntu/upload/Masters_27.html`, é aberta por **Nova run → Configuração completa**. Foi observada em Chromium Playwright headless, contexto novo e isolado, em `http://127.0.0.1:8766/Masters_27.html`, idioma PT, viewport 1440×1000. Foram abertas apenas as etapas e detalhes, sem editar valores nem acionar **Começar run**; nenhum erro de página ocorreu. Não se reutilizou o perfil Chromium/CDP de `probe.py`, nem save/campanha existente. O screenshot temporário do formulário completo e a extração de DOM são evidências de apoio na pasta do job; o inventário destinado a integração está em `nova_run_inventario.json`.

A tela completa tem seis etapas e um resumo lateral persistente: **1 Mundo; 2 Personagem; 3 Modo; 4 Gravadoras; 5 Regras e ritmo; 6 Revisão**. Existem quatro atalhos de configuração — Recomendado, Historiador, Sandbox e Desafio —, navegação direta por etapa, Anterior/Continuar, “Revisar e começar”, recolhimento de seções e revisão com botões Editar. A etapa Revisão mostra os valores e avisos, possui copiar código da partida, usar código, restaurar padrão e Começar run. **O rótulo Recomendado e os valores da instância não estabelecem o que cada preset grava nem um default universal.**

**[OBSERVAÇÃO DIRETA — código]** A lógica de geração exige semente preenchida; erro de geração preserva configuração e semente para nova tentativa. O texto de ajuda diz que mesma semente + mesma configuração + mesma versão do jogo dão o mesmo começo. Fonte delimitada: `script_0.js` linhas 467436–467449 e 468210–468253. A revisão calcula a data final exibida a partir do ano inicial e duração: por exemplo, início 1962, duração 10 anos → dezembro de 1971; não foi encontrado campo independente de ano final (`467599–467640`).

**[LIMITE]** `script_0.js` (582.020 linhas) foi pesquisado e lido apenas em trechos delimitados; não foi lido integralmente. O runner `/home/ubuntu/masters27_review/probe.py` conecta ao Chromium/CDP existente, portanto não foi executado para esta verificação. Não se iniciou campanha, não se fez pesquisa externa nem se inspecionou branch. Os defaults registrados abaixo são o estado recém-aberto observado na instância e/ou explicitamente marcados pelo código como PADRÃO; não são uma promessa de default para qualquer cenário. Condições dependentes de era/papel que não foram exercitadas estão marcadas como confirmadas no código, mas não testadas por combinações.

### 2. Arquitetura proposta, sem reduzir capacidade

**[PROPOSTA]** Preservar as seis etapas, todas as opções e seus agrupamentos. Não transformar o “guiado” em uma seleção menor: trata-se de duas apresentações sobre o mesmo objeto de rascunho completo.

- **Modo Formulário completo (padrão recomendado):** seis etapas acessíveis diretamente, sumário lateral em desktop e resumo fixo compacto em mobile; seções expansíveis não escondem aviso de incompatibilidade, default herdado ou campo inválido. Cada opção permanece alcançável, inclusive listas filtradas de cidades, gêneros, trajetórias, gravadoras e mutators. Filtros podem facilitar busca, mas não eliminar nem substituir opções.
- **Modo Guiado (opcional):** perguntas curtas por decisão, apenas reordenando e explicando os mesmos campos; “ver todos os parâmetros” abre a etapa/campo correspondente no formulário completo. Valor escrito no guiado aparece imediatamente no formulário e vice-versa; nunca cria outro modelo de run.
- **Revisão/compromisso:** congelar uma representação (“snapshot”) do rascunho, exibir configuração efetiva, origem de defaults, seed, versão do motor, condição de era/papel e avisos. O botão final confirma exatamente esse snapshot. Se qualquer escolha mudar, invalidar a confirmação e atualizar a revisão antes da geração.
- **Rascunho:** autosave local explicitamente identificado como rascunho, com restaurar/desfazer alteração, sem iniciar campanha. A persistência atual de rascunho não foi verificada; não afirmar que já existe.
- **Desktop:** tabs fixas de 6 etapas; formulário central; resumo e contagem de avisos à direita; ação Continuar/Revisar no rodapé. Revisão é uma tela própria e fonte única do texto de geração.
- **Mobile:** mesma ordem, campos, opções e ações em coluna única; lista de etapas em seletor acessível sem depender de tabs minúsculas; resumo recolhível mas avisos e ações primárias visíveis; botão de geração após rolagem e sempre disponível sem ocultar erros. Sem hover, arraste ou cor como única pista.

Wireframe desktop: `Nova run / status do rascunho → etapas [Mundo | Personagem | Modo | Gravadoras | Regras e ritmo | Revisão] → formulário integral → resumo/avisos contextual → navegação → Revisão final → confirmar snapshot → gerar`. Mobile: `Nova run → etapa atual + progresso → formulário → avisos inline → próximo/anterior → revisão integral → confirmação explícita → gerar`.

### 3. Inventário de campos — listas, sem tabela

Na lista abaixo, **Observado** significa que nome/tipo/valor/opções constam no código ou na captura. “Inventário bruto” em `nova_run_inventario.json` mantém arrays de opções e rótulos completos, inclusive os longos; referências evitam reproduzir no capítulo centenas de cidades, gêneros e gravadoras. **[PROPOSTA]** marca controle novo, não existente comprovado. Localizações são propostas de arquitetura, não alegações sobre coordenadas atuais.

#### Etapa 1 — Mundo

- **Modelo de mundo** — Observado; cartões/radio; opções: Reais em mundo aleatório (marcado PADRÃO), Fidelidade histórica, Real até o início/história alternativa depois, Real até o início/sem estreias reais depois, Universo ficcional, Caos histórico. Default observado: Reais em mundo aleatório. Fonte: DOM de Mundo; `script_0.js` linhas 467458–467483 e texto de comparação. Dependências/condição: define identidade, começo e futuro; modo Caos é exceção às restrições históricas/tecnológicas regulares. Validação: explicar impacto antes da seleção e sinalizar escolhas sem suporte; efeito em campanha: identidade, trajetória, catálogo e disponibilidade simulados ou históricos. Localização proposta: Mundo, primeiro campo.
- **Identidade/contrato histórico** — Observado como opções Real, Simulado e Época coerente com explicação por modo; não se deve apresentá-los como três seletores independentes sem confirmar o controle, pois a tela também exibe comparação/matriz. Defaults efetivos da instância: Real, Simulado, Época coerente. Fonte: tela e resumo de revisão. Localização proposta: imediatamente depois do modelo, em ficha de “o que muda”.
- **Linha do tempo tecnológica** — Observado; select: Datas reais fixas, Perto das datas reais (janela de anos), Sorteada (caos); default Perto das datas reais. Fonte: DOM e `script_0.js` antes de 467436. Dependência: relação com modo de mundo/caos; valor final só deve ser editável quando disponível. Efeito: disponibilidade/timing da tecnologia. Localização: Mundo > avançado.
- **Ano de início** — Observado; number `min=1889`, `max=2039`, default 1962; UI também fornece marcos cronológicos nomeados. Fonte: DOM e `467465–467479`. Opções de marco completas preservadas no inventário bruto. Dependências: tecnologia, artistas/gravadoras ativas, carreira/atividade disponível e cenário; alterar ano atualiza sugestões de gravadora. Validação: inteiro dentro do intervalo efetivamente suportado pelo campo; a interação para valores inválidos além do intervalo não foi testada. Efeito: ponto inicial da campanha.
- **História prévia** — Observado; select: Nenhuma, 10, 20 e 40 anos; default Nenhuma (0). Fonte: DOM e resumo. Dependência: contexto anterior ao início, não duração futura. Efeito: estado prévio inicial. Localização: Mundo, próximo ao ano.
- **Tamanho da base** — Observado como 4 escolhas: Pequena (~304 personagens/213 artistas), Média (~601/416), Grande (~951/635), Enorme (~1.217/773); Média está selecionada no rascunho capturado. A revisão escreve `medium`; não afirmar qual dos quatro é default universal. Efeito/troca de precisão/performance: detalhes devem vir do próprio controle, não foram extrapolados. Localização: Mundo, avançado.
- **Semente do mundo** — Observado; texto editável e ação Sortear outro mundo. A instância gerou `loop-h7f5`; não é valor fixo. Fonte: `467436–467449`, controle real e revisão. Dependência: mesma configuração e versão para reproduzir começo; string vazia bloqueia gerar com erro inline observado. Proposta opcional: checkbox “seed reproduzível explícita”/sorteio, manter seed exata no snapshot. Localização: Mundo e Revisão.

#### Etapa 2 — Personagem

- **Nome e apelido** — Observado; texto, vazio/placeholder “(gerado)” e “opcional”; default sem nome/apelido definido (geração aleatória); `vIo(r)`/`yIo(r)` compõem ficha. Fonte: texto da etapa e DOM. Efeito: identidade em notícias/diálogos; validações de tamanho/caracteres não verificadas. Localização: Personagem > Identidade.
- **Sexo** — Observado; radio Masculino/Feminino/Outro; o DOM carregado aponta valor `x`/Outro, mas a descrição “vazio = sorteado” é presente para alguns controles e o significado de um valor explícito `x` como default inicial não deve ser assumido além da captura. Mostrar como “Outro” no estado observado; validar se campo opcional pode ficar não escolhido. Fonte: DOM bruto.
- **Idade** — Observado; number 18–70, default 30 na captura. Efeito/impacto de carreira aparece no helper; validação de inteiro/limites deve corresponder ao motor. Fonte: DOM.
- **Cidade natal** — Observado; select com 250 opções e vazio significa cidade da sede; default vazio (usar cidade-sede). Todas as opções são mantidas no inventário bruto. Dependência: cidade-sede. Efeito descrito: contatos de infância/cena local. Localização: Personagem > Identidade.
- **Trajetória** — Observado; select com 17 opções, default Músico(a) em atividade. Opções completas no inventário bruto. Helper diz que altera atributos-base, instrumento, patrimônio/dívidas etc.; diferenças exatas de cada trajetória não presumidas. Localização: Personagem > Trajetória.
- **Instrumento principal** — Observado; select com 10 opções: Vocal, Guitarra, Baixo, Bateria, Teclados, Sopros, Cordas, DJ, Produção, MC; default Guitarra. Helper: banda/jam, visual e crescimento de habilidades. Localização: Personagem > Música.
- **Gênero do coração** — Observado; select com 158 opções mais “(nenhum)”, default nenhum. Helper informa bônus para atos da mesma família. Preservar catálogo completo no inventário bruto. Localização: Personagem > Música.
- **Visual** — Observado; 7 opções (Clássico, Roqueiro, Hippie/boêmio, Streetwear, Glamour, Vanguarda, Casual); default Casual. Efeito explicitado no controle: pequenos bônus sociais e aparência; opções integrais no inventário. Localização: Personagem > Apresentação do personagem, sem confundir com preferência visual da UI.
- **Orientação, vida pública, estado civil, filhos, visão política e religião** — Observado: orientação Heterossexual/Gay-lésbica/Bissexual/Assexual (default Heterossexual); vida pública Assumida/No armário (default Assumida); estado civil Solteiro(a)/Casado(a)/Divorciado(a)/Viúvo(a) (default Solteiro(a)); filhos number 0–4, default 0; visão política (sorteado), Esquerda, Centro-esquerda, Centro, Centro-direita, Direita, Apolítico (default sorteado); religião sorteada mais 10 opções (default sorteada). Tipos: select/range numérico conforme DOM. Localização proposta: separar “relações/identidade” de preferências de apresentação e indicar repercussões e sensibilidade dos dados antes de editar. Não esconder nem remover opções.
- **Traços de personalidade** — Observado como cartões multisseleção; nenhum selecionado no resumo. Existem opostos e efeitos descritos por cartão; array íntegro preservado no JSON bruto. Dependências: incompatibilidades de traços opostos devem ser validadas conforme motor; limite de seleção exato não verificado. Localização: Personagem > Traços.
- **Ambição** — Observado; cartões, default Legado; há várias ambições, lista completa no inventário bruto. Efeito aparece no cartão; seleção/revisão deve refletir um único valor se assim exigir o componente.

#### Etapa 3 — Modo

- **Atividades principais** — Observado como cartões multisseleção; default Gravadora. Dez atividades observadas: Gravadora, Empresário, Dono de festival, Agente/promotor de shows, Dono de casa de shows, Dono de estúdio/produtor, Editor musical, Dono de mídia, Dono de plataforma, Músico. Descrição: papel resulta das atividades; outras definem alocação de tempo. Carreiras de época só abrem no ano correto. Fonte: DOM da etapa e `467495–467507`; condições concretas não foram exercitadas. Validação: disponibilidade por ano e capacidade/tempo segundo regra visível, sem esconder carreira indisponível; manter explicação e motivo. Efeito: atividade e papel no mundo.
- **Ponto de partida** — Observado; cartões Do zero (default), Selo emergente e Empresa estabelecida; os textos especificam caixa, elenco/catálogo/equipe e maior custo/risco. Fonte: DOM e `467495–467507`.
- **Ajuste fino do começo** — Observado como seção expansível; deixa valores em branco para usar defaults de cenário. Inclui caixa da empresa e patrimônio pessoal (number `min=0`, passo 1000, placeholders 45000/5000; valores reais vazios no default), sede inicial (padrão + Garagem/Estúdio pequeno/Loft/Complexo), estúdio/mobília (padrão + Vazio/Básico/Completo), formação 1–6 pessoas, estágio de carreira (padrão + Garagem/Cena local/Em ascensão/Estabelecido/Estrela), atos contratados (padrão + 0,1,2,3,4,5,6,8), funcionários (padrão + 0,1,2,3,4,6,8), mercados abertos (padrão + Só cidade/Cidade e vizinhos/Mundo todo). Defaults observados para todos: vazio/padrão do cenário; placeholders não são valores aplicados. Fonte: `script_0.js` 466778–466900 e DOM. Condições por carreira/papel podem ocultar/alterar campos; não inferir invariância. Efeito: estado econômico/operacional inicial.
- **Fundar/assumir gravadora** — Observado na área Modo para run com gravadora: cartões “Fundar um selo novo” (default) e “Assumir uma gravadora existente”; escolha de empresa pesquisável por nome/cidade no takeover. Dependência: atividade Gravadora; resumido como “assumir gravadora (ignora o ponto de partida)” quando aplicável. Fonte: DOM e `467819–467892`. Validar empresa disponível na era, revelar efeito de substituir ponto de partida antes de aplicar. Não generalizar esta escolha para outros papéis.
- **Nome da empresa e cidade-sede** — Observado; texto default “Selo Agulha” e select de cidade default Londres; helper: cidade define mercado/cena/concorrência; em takeover vale a cidade da gravadora assumida. Efeito nome não altera números. Catálogo completo de 249 cidades no inventário. Localização: Modo > Empresa.

#### Etapa 4 — Gravadoras

- **Forma de início das gravadoras** — Observado, cartões: Pela história (marcado PADRÃO), Aleatório, Todos iguais, Mundo virado, Gigantes, Todas novatas; efeitos descritos no controle. Default Pela história. Fonte: DOM e resumo. Localização: Gravadoras > Como começam.
- **Quantidade de rivais** — Observado; range 0–100 step 1; valor 32 na instância. Lista de entidades e número efetivo se atualizam com ano/cidade/mundo. Fonte: DOM; dependências comprovadas por texto da etapa: ano, cidade-sede ou mundo mudam sugestão. Validação: limites visíveis do input; não tratar 32 como invariável.
- **Lista de gravadoras** — Observado, seleção por checkbox pesquisável, filtros Todas, Marcadas, Majors, Indies e outras, Da sua região; 87 entidades no catálogo da instância; 32 marcadas naquele rascunho. Todas as entidades, cidades/ano/tipos e seleção inicial estão no snapshot bruto. Não congelar o catálogo observado como lista universal: inventário pode variar por era/mundo. Localização: abaixo do resumo e filtros.
- **Fundadas depois do início** — Observado; select As da lista (padrão; default), Todas do catálogo (mais selos ao longo das décadas), Nenhuma. Dependência: escolha da lista; efeito altera entrada posterior de empresas, conforme texto. Fonte: DOM e `467819–467905`.

#### Etapa 5 — Regras e ritmo

- **Dificuldade** — Observado; Fácil, Normal (PADRÃO), Difícil; default Normal. O texto associa multiplicador de caixa inicial, precisão de previsão e custo de aquisições. Fonte `467538–467582`.
- **Ajuste fino por eixo** — Observado em disclosure: Público e mercado; Custos; Rivais; Talento disponível. Quatro ranges `min=-2`, `max=2`, `step=1`, default 0. As descrições definem direção de efeito; default neutro. Fonte DOM e `467583–467597`. Efeito soma modificadores próprios, não deve ser rotulado como nova dificuldade sem esclarecer.
- **Duração da partida** — Observado; Sem fim, 10, 20 e 30 anos; default Sem fim (`runYears17=0`). Com prazo, pontuação/patente em dezembro do último ano; pode continuar depois. Fonte `467599–467640`. **Não existe ano final independente comprovado.**
- **Diretor criativo/narrador** — Observado; 8 cartões: Maestro (default), Brisa, Acaso, Cronista, Tabloide, Poeta, Veterano cínico, Locutor de rádio; descrições de frequência/estilo de eventos no DOM bruto e `467643–467658`/`field_summary.txt`. Não misturar apresentação textual do narrador com nível de dificuldade.
- **Liberdade do diretor (mundo NPC)** — Observado; Contida, Normal, Solta; default Normal, configurado com `r.freedom17 ?? "normal"` (`467661–467684`). Descrição capturada para Normal: NPCs ocasionalmente rompem, trocam de selo, abrem gravadoras/adotam estratégias.
- **Ironman** — Observado, toggle default não; um save, sem desfazer/carregar pontos antigos, não substitui backup do navegador. Fonte `467687–467705`.
- **Tutoriais e dicas** — Observado, toggle ligado no resumo; helper afirma preferência deste navegador aplicável a todas as partidas (`467708–467719`). Portanto não é automaticamente opção de campanha: separar escopo e não salvar como regra da run.
- **Filtros de conteúdo** — Observado, multisseleção; default nenhum. Seis temas: Drogas e dependência; Morte e luto; Violência e acidentes; Crimes e corrupção; Polêmicas e boicotes; Traição, armário e escândalos amorosos. Temas marcados ficam fora da partida. Fonte `467721–467743` e definição `CHe` próxima a 466? conforme código.
- **Mutators** — Observado, seleção múltipla de regras especiais que mudam o mundo inteiro; nenhum selecionado no resumo. Opções e efeitos completos estão no inventário bruto; hover é mencionado na UI, mas proposta substitui dependência de hover por descrição persistente/focável. Fonte `467745–467771`.

#### Etapa 6 — Revisão e controles de run

- **Revisão integral** — Observado: Mundo/Contrato/ano/história prévia/base/seed; Personagem/nome/trajetória/traços/ambição; Modo/atividades/papel/cenário/empresa/cidade; Gravadoras/lista e origem; Regras/duração/Ironman/filtros/tutoriais/narrador/mutators. Editar reabre etapa. Fonte `467802–467915`, `468010–468064` e DOM.
- **Semente/código** — Observado: copiar código, usar código, restaurar padrão; o conteúdo/schema do código não foi inspecionado para não disparar fluxo. Seed não deve aparecer como valor fixo; na proposta, código exportado corresponde ao mesmo snapshot revisado.
- **Compromisso final** — Observado: Começar run em revisão. Antes do clique, proposta exige texto “Vou gerar exatamente esta configuração”, seed e versão do motor, diferenças de preset e avisos pendentes; nenhum botão de setup deve iniciar implicitamente ao trocar etapa. Só então criar campanha.
- **Ano final explícito — [PROPOSTA, não observado]** — Nova opção entre duração e revisão, independente do período inicial, com derivação bidirecional claramente exibida: usuário escolhe “sem fim”, duração ou ano final. Se início for 1962 e fim 1971, informar equivalência 10 anos pela regra real existente e confirmar se o último ano é inclusivo. Não declarar regra de inclusão até inventário/validação do motor. Localização: Regras e ritmo; resumo junto ao ano inicial.
- **Preferências de apresentação e som — [PROPOSTA, não observadas nesta tela]** — Criar painel opcional separado de gameplay, dificuldade, política histórica e filtros: preferências visuais/de leitura, animação, música/efeitos/volume, legenda/feedback háptico, somente se houver controles já suportados fora desta tela. Defaults, nomes, persistência e efeito permanecem “não verificados”; inventariar antes de implementar. Não prometer slider ou mute existente. Localização: painel separado antes da revisão, sem alterar o motor da run.

### 4. Dependências e estados esperados

**[OBSERVAÇÃO DIRETA]** Ano define tecnologia, formatos, gêneros vivos, gravadoras existentes e artistas em atividade. A tela informa que carreiras de época, como plataforma, só ficam disponíveis no ano certo. Sugestões/lista de gravadoras mudam por ano, cidade-sede e mundo. Papel é derivado das atividades escolhidas; a área de assumir gravadora é condicional à atividade de gravadora. Ponto de partida e takeover não são escolhas independentes: no takeover a tela resume que o ponto de partida é ignorado. Semente vazia bloqueia a geração. Valores em branco na personalização significam “default do cenário”, não zero.

**[PROPOSTA] Estados para cada campo/combinação:** carregando opção contextual sem destruir rascunho; carregado; alterado/não revisado; default herdado; indisponível nesta era/papel com motivo e alternativa; inválido (inline, junto ao campo); conflito de escolhas com ação clara; aviso não bloqueante; pronto para gerar; geração em curso; falha sem perda de seed/configuração; sucesso com ID e passaporte. Uma mudança que invalida campos deve preservar os valores anteriores, marcar os campos e explicar o que será ignorado ou ajustado; não apagar silenciosamente.

### 5. Melhorias propostas (não implementadas)

Prioridades são recomendações, não prazo/status. Cada melhoria é aditiva e mantém os controles e opções existentes.

#### NR-01 — Dois caminhos, um único rascunho
- **Tipo:** integração/usabilidade; **prioridade:** P0; **dependências:** seis etapas existentes, M03/M05/M18.
- **User story:** Eu como jogador novo ou experiente, Quero alternar entre configuração guiada e formulário completo, Para receber orientação sem perder nenhum controle ou valor.
- **Critérios:** ambos editam o mesmo objeto tipado; campo atualizado aparece nos dois; cada pergunta guiada tem “abrir no formulário”; todas as listas e opções da tela completa continuam acessíveis; progresso/valores sobrevivem à navegação e retorno; nenhum caminho gera antes da revisão.
- **Risco:** divergência entre modelos se houver serialização dupla; mitigar com schema único e teste bidirecional.

#### NR-02 — Ano final independente, compatível com duração existente
- **Tipo:** funcionalidade nova de configuração; **prioridade:** P0; **dependências:** cálculo real de duração e placar, revisão.
- **User story:** Eu como jogador, Quero definir ano final além de uma duração relativa, Para planejar campanha por período histórico explícito.
- **Critérios:** deixar claro que hoje o código observado só tem duração 0/10/20/30; novo campo rotulado como proposta até suportado pelo motor; regra de ano inclusivo confirmada no motor antes de persistir; validação `fim ≥ início`; mudanças em início/fim recalculam duração exibida sem perda; “Sem fim” incompatível com fim preenchido explica prioridade e pede escolha; revisão mostra ambas representações e regra.
- **Risco:** desalinhamento entre UI, encerramento e placar; não lançar antes de teste de equivalência e save/round-trip.

#### NR-03 — Snapshot revisado é exatamente o que se gera
- **Tipo:** integração/segurança de configuração; **prioridade:** P0; **dependências:** seed, código de run, review, M10/M21/M30.
- **User story:** Eu como jogador, Quero confirmar o snapshot completo com seed e versão, Para que a campanha comece exatamente como revisei e possa ser reproduzida.
- **Critérios:** gerar hash/versão da configuração imutável; revisão lista defaults herdados, seed, jogo e avisos; botão confirma hash; qualquer mudança invalida revisão; falha mantém o mesmo rascunho/seed; repetir com mesma versão/configuração/seed produz mesmo começo conforme contrato observado.
- **Risco:** não determinismo real não coberto pela promessa da semente; validar RNG e dependências externas antes de anunciar reprodutibilidade.

#### NR-04 — Condições de era/papel transparentes sem podar opções
- **Tipo:** apresentação/integração; **prioridade:** P0; **dependências:** dados de era, atividades e cidade/mundo.
- **User story:** Eu como jogador, Quero ver por que uma atividade, pessoa ou gravadora está disponível ou não nesta era e papel, Para escolher conscientemente sem perder acesso às opções existentes.
- **Critérios:** manter a opção e registrar estado (disponível, futura, histórica, incompatível ou desconhecida); indicar regra e ano de referência; mudança de ano/papel recalcula escolhas derivadas sem apagar seleção; revisão mostra disponibilidade efetiva e valor não aplicado; teclado e toque acessam todos os filtros e itens.
- **Risco:** explicar condição como regra histórica mais certa do que os dados permitem; fonte/certeza acompanham cada mensagem.

#### NR-05 — Revisão de papel, fundar/assumir e início personalizado
- **Tipo:** integração; **prioridade:** P1; **dependências:** seleção multicarreira, cenários, custom start e catálogo de gravadoras.
- **User story:** Eu como jogador que escolhe mais de uma atividade, Quero saber qual papel e quais controles de empresa serão aplicados, Para evitar que um início personalizado ou takeover seja ignorado sem perceber.
- **Critérios:** exibir papel derivado das atividades; mostrar condição de takeover apenas quando aplicável; contraste explícito entre Do zero/Emergente/Estabelecida e Fundar/Assumir; valores brancos marcados como “default do cenário”, nunca 0; ao assumir, mostrar empresa, era, cidade e parâmetros substituídos; confirmação antes de descartar campos incompatíveis.
- **Risco:** combinações válidas do motor podem ser indevidamente bloqueadas; validação vem do motor, mensagens não criam restrição.

#### NR-06 — Presets reversíveis e auditáveis
- **Tipo:** apresentação; **prioridade:** P1; **dependências:** Recomendado/Historiador/Sandbox/Desafio.
- **User story:** Eu como jogador, Quero ver exatamente quais campos um preset altera e desfazer sua aplicação, Para usar atalhos sem perder controle fino.
- **Critérios:** preservar os quatro presets observados; aplicar ao mesmo rascunho; mostrar antes/depois por campo e o que permanece; permitir desfazer; preset não apaga opções personalizadas ocultas; revisão identifica preset e alterações manuais posteriores; não atribuir efeitos não inventariados.
- **Risco:** semântica atual de preset não foi auditada; inventariar os mapas reais antes de publicar a comparação.

#### NR-07 — Validação contextual e compatibilidades explicadas
- **Tipo:** integração; **prioridade:** P0; **dependências:** campos condicionais e schema de campanha.
- **User story:** Eu como jogador, Quero receber erros no campo e uma explicação de cada incompatibilidade, Para corrigir a configuração antes de gerar.
- **Critérios:** seed vazia, limites, dependências era/papel, takeover, ano final e regras mutuamente exclusivas mostram texto/ligação para corrigir; avisos preservam rascunho; revisão aponta etapa e campo; foco vai ao primeiro erro; falha da geração mantém configuração e seed; sem percentuais de progresso inventados.
- **Risco:** validação UI diferir da validação do motor; regras compartilhadas ou validação dupla de paridade.

#### NR-08 — Revisão e edição no mobile/acessível
- **Tipo:** apresentação; **prioridade:** P1; **dependências:** M18/M19 e o formulário atual.
- **User story:** Eu como jogador em tela pequena ou teclado, Quero navegar, comparar e corrigir todos os parâmetros, Para confirmar a run com a mesma segurança do desktop.
- **Critérios:** 6 etapas acessíveis com nome/etapa atual; todos os campos/opções e filtros alcançáveis por toque/teclado/leitor de tela; erros associados; revisão navegável; aviso não depende de cor/hover/som; layout reflow sem perda de conteúdo; Começar run só na revisão.
- **Risco:** reduzir lista/descrição para caber e ocultar escolha; testar cobertura de cada campo contra o inventário bruto.

#### NR-09 — Apresentação e som separados de gameplay
- **Tipo:** apresentação, opcional e ainda não verificada; **prioridade:** P2; **dependências:** inventário da tela Opções/global e preferências persistidas.
- **User story:** Eu como jogador, Quero ajustar apresentação e áudio sem alterar regras, Para personalizar conforto e legibilidade sem mudar a simulação.
- **Critérios:** só expor controles com suporte real; registrar escopo/persistência/defaults confirmados; não alterar dificuldade, política histórica, filtros ou seed; aviso claro quando preferência for global ao navegador; sem controle essencial apenas por som/visual.
- **Risco:** duplicar preferências globais ou insinuar recurso de som não existente; implementar somente após inventário específico.

### 6. Validações, compromisso e testes de aceite

1. Abrir Nova run completa em contexto limpo: seis etapas, todos os campos/opções listados no bruto, default observado e estado atual; entrar/sair do caminho guiado não altera dados.
2. Revisar regras de ano início (1889–2039), idade (18–70), filhos (0–4), dinheiro não negativo/step observado, número de rivais (0–100) e quatro ranges de dificuldade (−2…+2). Confirmar também validação de valores colados/digitados; range HTML não substitui a validação do motor.
3. Testar ano/carreiros em períodos diferentes sem iniciar campanha para verificar disponibilidade e mensagens; testar atividades sem Gravadora, múltiplas atividades, setor plataforma antes/depois de sua abertura, empresa fundar/assumir e alternativas de cenário. Registrar combos realmente aceitos; não assumir qualquer bloqueio por inferência.
4. Testar cidade-sede, mundo, ano e seleção de gravadoras atualizando sugestão sem perder marcadores; todos os 87 itens vistos no estado 1962/Londres e os filtros devem continuar alcançáveis; catálogo em outras condições deve ser inventariado separadamente.
5. Testar duração Sem fim/10/20/30; confirmar aritmética mostrada pela revisão e se regra final é inclusiva. A opção independente de ano final é proposta até validação de motor.
6. Seed vazia deve manter erro inline e não gerar; “Sortear outro mundo” altera somente a seed/configuração explicitada; falha da geração mantém seed e rascunho; mesma configuração+seed+versão segue garantia real somente depois de teste de reprodução.
7. Revisão final compara campo a campo o snapshot; alterações exigem nova confirmação; código copiado/colado mantém opções e seed; “restaurar padrão” confirma quais escopos altera e não apaga save/campanha existente.
8. Filtros de conteúdo devem remover apenas temas selecionados; Ironman deve conservar a advertência sobre backup; tutorial é preferência do navegador (não campanha); narrador, liberdade e mutators mantêm explicação integral e teclado.
9. Usabilidade: teclado, leitor de tela, 390×844, zoom/reflow, listas longas e erro inline. A revisão e geração não podem ser acessíveis apenas por hover, arraste, cor ou som.
10. Nenhum desses testes requer campanha completa para validar o formulário. Um teste de geração pode usar ambiente isolado somente depois de aprovado o snapshot, nunca profile/save existente.

### 7. Implementação e preservação

**[PROPOSTA]** Definir um schema canônico versionado para `world`, `character`, `activities/role`, `company/start`, `labels`, `rules`, `seed` e preferências opcionais. Validadores recebem esse schema e dados de disponibilidade com período/condição/source. As duas apresentações (Completo e Guiado), sumário, código de run e gerador leem o mesmo objeto; não manter formulários paralelos. Persistir drafts separadamente de saves; a criação só ocorre após confirmação explícita. Relatar desconhecidos como desconhecidos, manter a opção original e sua razão de indisponibilidade. Testar serialização/deserialização do conjunto integral e compatibilidade antes de otimização. Não remover personagens, cidades, categorias de mundo, atividades, empresas, estilos, opções de dificuldade ou conteúdo histórico para reduzir complexidade.

**Propostas versus implementação:** melhorias NR-01…NR-09 e campos ano final/apresentação/som são sugestões; somente itens marcados **Observado** são evidência. O inventário bruto mantém captura de origem e controles/options observados; em caso de divergência, rever a interface/versão do arquivo original antes de tratar este documento como especificação de motor.


<a id="parte-v"></a>

## Parte V — Ampliação da jogabilidade: M31–M50

Estas propostas complementam M01–M30 e as especificações de telas. **Não são vinte novos sistemas obrigatórios.** Parte organiza dados/decisões já existentes; parte pode exigir mudança do motor e deve ser tratada como mecânica opcional futura. Nenhuma mudança de regra deve ser introduzida disfarçada de redesign visual.

**[INFERÊNCIA]** Os efeitos esperados sobre diversão, agência, imersão e compreensão precisam ser validados em campanhas reais. Não atribuo uma nova nota ao jogo por estas ideias nem prometo retenção ou balanceamento.

### M31 — Identidade estratégica da campanha sem uma resposta “certa”

**Tipo: apresentação/integração · Prioridade: P1 · Depende de M04, M13 e M28.**

Permitir que o jogador descreva o rumo que quer acompanhar: selo de nicho, descoberta de artistas, catálogo comercial, experimentação, cena regional ou carreira pessoal. O plano é uma referência voluntária para organizar acompanhamento e comparação. Não deve ser um bônus econômico automático.

Confrontar decisões com o plano, sem proibi-las: contratar um artista caro pode contrariar o orçamento e ainda representar uma escolha deliberada. Rever a estratégia não apaga acontecimentos ou pune mudança de opinião.

**User story:** Eu como jogador, Quero acompanhar a identidade que escolhi para minha campanha, Para avaliar decisões pelo meu objetivo e não por uma pontuação universal.

**Aceite:** plano opcional/editável; comparação explica critérios; nenhum atributo secreto é exposto; mudança de plano não altera RNG nem apaga histórico.

### M32 — Brief criativo conectado às escolhas musicais existentes

**Tipo: integração; nova regra somente se aprovada · Prioridade: P2 · Depende de M08, M13 e M24.**

No projeto, reunir a intenção criativa: referência de repertório, direção de produção, relação com público e restrições conhecidas. Reutilizar escolhas já disponíveis; não criar parâmetros fictícios que prometem mudar o som sem efeito real.

Se uma intenção registrada servir apenas para organização/narrativa, declarar isso. Se influenciar a simulação no futuro, especificar seu efeito e balanceamento. Evitar que escolher o rótulo “experimental” crie uma solução mecânica sempre superior.

**User story:** Eu como gestor de um projeto musical, Quero registrar e acompanhar uma direção criativa, Para perceber coerência entre repertório, produção e apresentação do lançamento.

**Aceite:** intenção organizacional separada de regra; escolhas existentes mantidas; conflitos criativos explicados sem prever sucesso; registro acessível no álbum/histórico quando vinculado.

### M33 — Desenvolvimento de artista como compromisso observável

**Tipo: integração; possível mecânica opcional · Prioridade: P2 · Depende de M09, M12 e M14.**

Reunir treino, repertório, descanso e atividade profissional já existentes em um plano de desenvolvimento acompanhado. Exibir os compromissos, o que foi cumprido e evolução observada pela informação disponível.

Não prometer “ganhe dez pontos em três meses” se a regra não garante isso. A personalidade do artista e as oportunidades continuam importantes; um plano não pode virar uma barra de experiência automática que elimina a incerteza musical.

**User story:** Eu como gestor de artistas, Quero acompanhar um plano de desenvolvimento com atividades e resultados observáveis, Para investir em uma trajetória sem confundir intenção e garantia.

**Aceite:** capacidade/agenda respeitadas; estimativa distinta de resultado; plano usa ações reais; cancelamento mostra compromissos; ausência de crescimento não é escondida.

### M34 — Preparação de show conectando palco, elenco e logística

**Tipo: integração; ampliar regras só com especificação · Prioridade: P1 · Depende de M09, M13 e M15.**

Antes do evento, reunir repertório, formação válida, recursos, local e compromissos. Ensaios/passagem de som só aparecem como ações se existirem ou forem desenvolvidos explicitamente; não adicionar um botão sem execução.

A preparação deve revelar conflitos conhecidos e permitir escolhas, não garantir um show perfeito. Multifunções são exibidas com clareza, sem presumir que um integrante pode executar duas tarefas incompatíveis simultaneamente quando o motor não suporta isso.

**User story:** Eu como responsável por um show, Quero revisar a preparação artística e logística na mesma entidade de evento, Para evitar incoerências e assumir riscos conscientemente.

**Aceite:** formação da data do evento; equipamentos/capacidade vinculados; ações não implementadas não são oferecidas como prontas; palco e planejamento usam a mesma fonte.

### M35 — Promessas como tensão contínua, não texto esquecido no contrato

**Tipo: integração ao pacote já solicitado · Prioridade: P1 · Depende de M07, M09, M13 e M14.**

Cada promessa aceita deve ter dono, prazo, forma de comprovação e estado. Acompanhá-la em contrato, projeto e agenda pela mesma referência. O jogador enxerga cedo quando suas decisões ameaçam um compromisso.

A consequência deve seguir a regra, respeitando o que era conhecido ao assinar. Não acrescentar punições retroativas nem uma tarefa por frase narrativa. Reaproveitar a base de promessas em desenvolvimento.

**User story:** Eu como negociador, Quero acompanhar os compromissos assumidos e seus conflitos com meus planos, Para construir confiança ou aceitar conscientemente o custo de rompê-los.

**Aceite:** proposta/aceita/cumprida/descumprida separadas; prazos claros; uma ocorrência canônica; consequência rastreável; sem regras ocultas introduzidas pela UI.

### M36 — Pequenas conquistas com significado, sem tempestade de notificações

**Tipo: apresentação/narrativa · Prioridade: P2 · Depende de M07, M24 e M26.**

Reconhecer marcos reais e relevantes: primeiro lançamento, primeiro palco, retorno de uma relação, reconhecimento em um mercado ou superação de um conflito. Usar arte/cena/texto proporcional e um link para o registro.

O marco não precisa conceder moeda ou bônus. Não celebrar cada clique nem atribuir um prêmio inexistente. Se a campanha ainda não registra aquele marco, primeiro definir o evento/fonte; não inferir a partir de uma contagem ambígua.

**User story:** Eu como jogador, Quero reconhecer momentos importantes da campanha, Para sentir progresso e lembrar histórias além dos indicadores econômicos.

**Aceite:** gatilho verificável; apresentação pode ser adiada; replay não concede efeito novamente; marco único não dispara repetidamente; conteúdo integral preservado.

### M37 — Rivais legíveis no comportamento, não oniscientes

**Tipo: integração e possível melhoria do motor rival · Prioridade: P2 · Depende de M13, M21 e M23.**

Tornar observáveis os sinais públicos de um rival: movimentos, ofertas conhecidas, foco de mercado e reação a oportunidades. A estratégia pode variar e mudar; não revelar caixa secreto ou planos privados apenas porque o painel é novo.

A inteligência rival já solicitada precisa de cenários de teste: restrição financeira, disputa por alvo compatível e resposta a uma oferta. Se o rival muda comportamento por uma regra, registrar o que é publicamente perceptível sem explicar seus segredos.

**User story:** Eu como jogador, Quero interpretar movimentos públicos de rivais sem conhecer suas informações secretas, Para reagir a uma competição que parece coerente e justa.

**Aceite:** separar fato/rumor; teste com restrições distintas; nenhuma informação privada exposta; desempenho do motor não melhora só por escrever uma justificativa depois.

### M38 — Fracasso compreensível e caminhos de recuperação quando válidos

**Tipo: integração; novas alternativas exigem regra própria · Prioridade: P1 · Depende de M13, M14, M15 e M30.**

Uma derrota, crise ou projeto ruim deve explicar o que é conhecido e quais ações existentes ainda são possíveis: renegociar, reduzir compromissos, mudar plano, vender recurso quando permitido ou encerrar de forma clara.

Não prometer resgate se a regra determina insolvência definitiva. Se uma alternativa de recuperação for criada, ela tem custo e consequência definidos e não altera silenciosamente campanhas antigas. Preservar save/registro para rever a trajetória.

**User story:** Eu como jogador em dificuldade, Quero entender a situação e as alternativas realmente disponíveis, Para decidir como reagir sem ser enganado por uma interface otimista.

**Aceite:** causa conhecida/inferida distinta; alternativas validadas; final não dispara em loop; nenhuma recuperação gratuita implícita; progresso preservável conforme compatibilidade.

### M39 — Memória de relações ligada a acontecimentos concretos

**Tipo: integração; mecânica nova somente se necessária · Prioridade: P2 · Depende de M07, M14 e M22.**

No relacionamento, mostrar compromissos e acontecimentos registrados: oferta aceita, divergência criativa, prazo cumprido, conflito ou colaboração. Não reconstruir uma relação causal com base apenas em um número de confiança.

Isso permite ler a pessoa como parte da história, não como um atributo isolado. Se o jogo não tem memória de determinados eventos, registrar a lacuna e propor o modelo explicitamente; não gerar lembranças falsas.

**User story:** Eu como jogador, Quero consultar acontecimentos conhecidos que marcaram uma relação, Para compreender seu contexto e decidir como agir depois.

**Aceite:** eventos com ID e período; sigilo respeitado; numeração não substitui texto; mudança de relação só explicada quando sustentada pela regra.

### M40 — Transições de era como contexto jogável

**Tipo: integração de mundo, disponibilidade e projeto · Prioridade: P1 · Depende de M15, M23, M25 e M30.**

Quando formatos, tecnologia, mercados ou regras mudarem, mostrar o que se tornou possível, o que perdeu viabilidade e quais projetos/recursos são afetados. Preservar todo o catálogo histórico como consulta, respeitando disponibilidade de execução.

Em modo simulado, não apresentar a história real como destino inevitável. A transição depende da política de mundo; seu aviso precisa dizer se é regra vigente, fato documental ou tendência conhecida.

**User story:** Eu como jogador de uma campanha longa, Quero entender as mudanças de contexto de uma era, Para adaptar decisões sem perder o vínculo com o mundo que construí.

**Aceite:** política histórica indicada; projetos afetados rastreáveis; opções antigas permanecem consultáveis; nenhum desbloqueio inventado; alerta proporcional.

### M41 — Operações em lote com prévia, sem decisões irreversíveis automáticas

**Tipo: UI/integração · Prioridade: P1 · Depende de M06, M13 e M18.**

Permitir ações reversíveis e suportadas em várias entidades: acompanhar, atribuir rótulo, organizar grupo ou arquivar mensagens. Cada item mostra elegibilidade e exceção. A prévia explica o que será alterado antes de aplicar.

Não generalizar isso para assinar vários contratos, lançar vários discos ou dispensar integrantes sem desenhar as consequências. Uma ação em lote não pode ignorar regras diferentes por pessoa, projeto ou era.

**User story:** Eu como jogador com muitos registros, Quero organizar vários itens com prévia e exceções claras, Para reduzir repetição sem assumir compromissos por engano.

**Aceite:** seleção não abre entidade; elegibilidade individual; resultado parcial explícito; nenhum item excluído silenciosamente; ações irreversíveis fora do lote inicial.

### M42 — Rascunhos persistentes e edição com conflito explícito

**Tipo: UI/confiabilidade · Prioridade: P0 · Depende de M05, M06 e M30.**

Manter os valores de uma proposta/plano quando o jogador consulta outra ficha, volta ou encontra um erro. Distinguir rascunho de compromisso executado. Explicar o escopo de persistência e qualquer falha ao salvar rascunho.

Se o estado da campanha mudou desde a edição, mostrar o conflito e pedir revisão antes de processar. Não reaplicar uma oferta antiga a um contexto novo sem aviso. Preferências e rascunhos não alteram o RNG por serem abertos.

**User story:** Eu como jogador, Quero preservar meu rascunho e reconhecer mudanças do contexto, Para investigar e corrigir sem perder trabalho ou executar um plano desatualizado.

**Aceite:** rascunho identificado; erro conserva campos válidos; revisão usa estado atual; consulta não executa; persistência real, não prometida por um ícone.

### M43 — Histórico de navegação e links de contexto restauráveis

**Tipo: UX/integração · Prioridade: P1 · Depende de M01 e M05.**

Além de favoritos, manter recents e origem com entidade, seção, período e filtro. Um link para “esta formação neste mês” é diferente de um link para a ficha atual. Mostrar quando a entidade mudou ou deixou de estar disponível.

Não expor dados da campanha em um link público. A referência pode ser interna ao arquivo/sessão e deve respeitar versões de save. Histórico de navegação não é histórico do mundo.

**User story:** Eu como jogador, Quero voltar a um contexto consultado anteriormente, Para comparar e investigar sem reconstruir meus filtros.

**Aceite:** período e seleção restaurados; ID estável; entidade ausente recebe explicação; nenhuma referência torna secreta informação pública por acidente; não altera calendário.

### M44 — Alertas configuráveis com um histórico integral

**Tipo: UX/integração · Prioridade: P1 · Depende de M04, M07 e M20.**

O jogador escolhe quais assuntos acompanha e como recebe apresentação: destaque, boletim ou registro. Alertas com prazo ou consequência mantêm política explícita; reduzir barulho não significa escolher uma resposta automaticamente.

Mostrar o que foi silenciado e onde está o histórico. Um filtro de notificações não desliga a simulação de fãs, rivais ou mercados. Respeitar o preset, com possibilidade de personalizar por categoria.

**User story:** Eu como jogador, Quero ajustar a apresentação de alertas mantendo os registros, Para controlar interrupções sem perder informação ou agência.

**Aceite:** preferências persistem; prazos não somem; registro íntegro; silêncio não altera regra nem resposta padrão; ação crítica não depende de toast temporário.

### M45 — Linguagem econômica e de calendário sem ambiguidade

**Tipo: informação/UI · Prioridade: P0 · Depende de M03, M06 e M13.**

Padronizar unidades, período e relação temporal nos indicadores: agora, último fechamento, período escolhido e projeção. Distinguir caixa, receita, custo e resultado, conforme as regras existentes, sem inventar um regime contábil diferente.

Em agenda, diferenciar data proposta, confirmada, concluída e prazo de resposta. Um aviso de “dois dias” precisa dizer em relação a qual referência. A formatação pode ser compacta, mas o significado precisa ser aberto em detalhe.

**User story:** Eu como jogador, Quero entender a unidade e a referência temporal de cada indicador, Para comparar dados e planejar sem interpretar números desconectados.

**Aceite:** período explícito; centavos preservados onde vigente; somas compatíveis; datas completas em decisões; abreviações expansíveis.

### M46 — Audição e feedback musical opcionais, contextualizados

**Tipo: apresentação; conteúdo sonoro novo requer produção própria · Prioridade: P2 · Depende de M18 e M24.**

Quando houver áudio no jogo, associar prévia ao repertório/projeto e declarar se é demonstração, trecho procedural ou representação narrativa. Não dar a entender que uma prévia genérica é o resultado musical real de todas as escolhas de produção.

Permitir ouvir, parar e silenciar; separar música, efeitos e voz. O jogador pode avaliar indicadores/texto sem áudio. Não adicionar geração musical online obrigatória ou custo externo para uma campanha offline.

**User story:** Eu como jogador, Quero acessar o áudio com contexto e controles claros, Para enriquecer a experiência musical sem depender de som ou confundir demonstração e resultado.

**Aceite:** áudio opcional; sem autoplay obrigatório; equivalentes textuais; vínculo claro; controles acessíveis; nenhuma dependência externa oculta.

### M47 — Comparar períodos e versões sem apagar o passado

**Tipo: informação/integração · Prioridade: P1 · Depende de M03, M14 e M21.**

Permitir comparar a mesma entidade em períodos ou versões realmente registrados: formação, oferta, plano, desempenho ou orçamento. Mostrar o que mudou e se os dados são comparáveis.

Não reconstruir versões ausentes com o estado atual. Uma alteração de proposta não apaga a anterior; um perfil antigo não é interpretado como ficha válida hoje. Nem todo histórico precisa virar gráfico.

**User story:** Eu como jogador, Quero comparar registros reais de uma entidade ao longo do tempo, Para compreender evolução sem perder a precisão e o contexto.

**Aceite:** snapshots identificados; ausência explícita; bases compatíveis; consulta não muda estado; datas e valores antigos preservados.

### M48 — Testes de layout com conteúdo extremo, não apenas a tela bonita

**Tipo: qualidade de design · Prioridade: P0 · Depende de M06, M18, M19 e M29.**

Projetar com nomes longos, muitas funções, histórico extenso, várias moedas/períodos, carta longa, ausência de retrato, lista grande e erro em múltiplos campos. Adicionar zoom, teclado virtual, contraste e movimento reduzido.

Um mockup com três itens não prova que o layout aguenta uma campanha de décadas. A tela deve reflow sem perder campos ou ações; os dados sintéticos de teste precisam ser identificados como teste, nunca usados na narrativa do jogador.

**User story:** Eu como jogador de uma campanha complexa, Quero que a interface comporte informação extensa e situações excepcionais, Para continuar usando todo o jogo sem quebra de leitura ou ação.

**Aceite:** casos extremos definidos; nenhum campo crítico cortado sem expansão; foco/restauração; teste físico mobile; ausência de overflow global desnecessário.

### M49 — Um núcleo de decisões interessantes, não uma fila de tarefas

**Tipo: game design/integração · Prioridade: P1 · Depende de M13, M20 e M28.**

Revisar o ciclo e classificar o que é decisão estratégica, escolha criativa, rotina operacional, exploração e consequência. Facilitar rotinas; preservar espaço para escolhas que produzem histórias. Evitar que um botão “resolver tudo” selecione o mesmo caminho dominante.

As alternativas devem ter contextos e restrições distintos, não apenas preço crescente para sucesso crescente. Se balanceamento precisar mudar, fazê-lo como iniciativa própria, com testes longos, e não como efeito colateral da UI.

**User story:** Eu como jogador, Quero dedicar atenção às escolhas que definem minha campanha, Para sentir agência sem ser sobrecarregado por repetição operacional.

**Aceite:** classificação do ciclo; nenhuma automação silenciosa de escolha importante; caminhos artísticos/pessoais viáveis conforme as regras; teste de estratégias diferentes sem garantia prévia de equilíbrio.

### M50 — Configuração de campanha como decisão compreensível

**Tipo: UI/UX/integração · Prioridade: P0 · Depende de M16, M20 e M30.**

A configuração completa deve explicar o que cada parâmetro muda, como combina com outros e o que ficará no save. Separar personalidade/identidade, papel/recursos, época/mundo, regras/dificuldade e apresentação. O modo rápido é um preset da mesma configuração, não um motor alternativo.

A especificação aprofundada de Nova run neste documento define os grupos, campos verificados e propostas de revisão. Opções não verificadas não devem receber um default inventado. Ano final independente, quando proposto, não pode ser apresentado como existente se o jogo usa duração.

**User story:** Eu como jogador iniciando uma campanha, Quero revisar opções e efeitos com todas as configurações acessíveis, Para começar uma experiência coerente sem depender de tentativa e erro.

**Aceite:** rápido/completo usam o mesmo modelo; todas as opções existentes preservadas; defaults de origem identificados; incompatibilidades não resetam silenciosamente; revisão e geração usam o mesmo snapshot validado.


<a id="parte-vi"></a>

## Parte VI — Consolidação das telas e fontes compartilhadas

### Escopo e regra de evidência

Esta consolidação combina o briefing comum e apenas os capítulos S01–S17 declarados produzidos com sucesso. Não refaz as propostas individuais, não altera arquivos dos especialistas e não cria capítulos ausentes. “Observado” significa evidência já registrada na revisão do Masters 27; “proposto” é decisão de arquitetura desta consolidação, ainda não implementação. Lacuna de inspeção não prova ausência nem defeito. O branch não foi inspecionado; a jornada completa de composição–gravação–lançamento não foi reexecutada.

A revisão confirmou exatamente oito macromenus: **Cockpit, Sede, Pessoas, Projetos, Ao vivo, Mundo, Gestão e Você**. A organização resolve uma casa por destino, sem aumentar esse conjunto. Como várias propostas não verificaram a localização atual, os caminhos assinalados **[PROPOSTA]** são uma alocação canônica recomendada, não descrição do produto instalado.

### Destinos canônicos e casa nos oito grupos

1. **Cockpit:** Destino(s) canônico(s) consolidado(s): S01 Cockpit; S02 Correspondência/Inbox; atalho global a S17 Central da campanha; Status da localização: S01 é observado. S02 e S17 ficam aqui por proposta; S17 não substitui o painel S01..
2. **Sede:** Destino(s) canônico(s) consolidado(s): S12 Sede e operação; Status da localização: O grupo existe; subdestino e campos de S12 são propostas..
3. **Pessoas:** Destino(s) canônico(s) consolidado(s): S04 Elenco e gestão; S05 Ficha de artista/banda; S06 Scouting; atalho ao contrato S07; Status da localização: S04 identifica Pessoas como grupo e destino proposto. Demais destinos são propostas, ligados por IDs; não se fundem em uma tela..
4. **Projetos:** Destino(s) canônico(s) consolidado(s): S08 Projeto musical e repertório; S09 Estúdio e gravação; S10 Lançamento e catálogo; Status da localização: S08 afirma pertencer a Projetos. S09/S10 são destinos relacionados, não telas internas redesenhadas por S08..
5. **Ao vivo:** Destino(s) canônico(s) consolidado(s): S11 Show ou turnê; Status da localização: O grupo é observado; S11 é proposta. Show e turnê são modalidades de uma entidade, não destinos concorrentes..
6. **Mundo:** Destino(s) canônico(s) consolidado(s): S14 Mundo e exploração; S15 Submundo e fraudes; Status da localização: S14 é proposta de workspace. S15 é proposta de destino em Mundo; manter as antigas entradas como aliases até validação..
7. **Gestão:** Destino(s) canônico(s) consolidado(s): S03 Agenda e fechamento; S07 Negociação e contrato; S13 Finanças e compromissos; Status da localização: Alocação proposta. S03 explicitamente deixa a propriedade do grupo em aberto; esta decisão a resolve sem alegar que já está assim..
8. **Você:** Destino(s) canônico(s) consolidado(s): S16 Você: trajetória e legado; Status da localização: O grupo existe; destino e campos específicos são proposta..


A lista acima enumera **17 destinos canônicos**, não 17 macromenus. A implantação deve validar cada caminho contra a navegação real antes de redirecionar. Para evitar uma ambiguidade residual, S02 é uma única caixa sob Cockpit; S03 fica sob Gestão, mas apenas coordena revisão de período e aciona o motor temporal já existente; S17 é uma utilidade global de campanha/save, acessível pelo Cockpit, separada do resumo S01 e da história pessoal S16.

### Aliases, sobreposições e limites de tela

- **S01/S02:** o bloco Agora pode resumir uma correspondência e abrir a Inbox pelo mesmo item/ID. Filtros, thread, texto integral e ações de ler/estrelar/adiar/arquivar pertencem só a S02. Não há segunda inbox no Cockpit.
- **S04–S07:** S04 é índice operacional de atos e pessoas, mantendo seus tipos de entidade separados. S05 é dossiê de um ato musical e remete à ficha individual; não substitui o cadastro de pessoas. S06 trata descoberta/avaliação/shortlist e encaminha, sem contratar, ao fluxo canônico S07. Avaliação ou correspondência só compartilha pessoa/ID após vínculo verificável; não fundir ato, indivíduo, candidato e contrato.
- **S08–S10:** S08 é visão contextual do projeto/repertório; S09 é sessão de estúdio; S10 é preparação/publicação/retorno e catálogo. São etapas/destinos distintos ligados por IDs quando existentes. S08 não redesenha estúdio nem lançamento; o encadeamento completo continua não verificado.
- **S07/S13:** negociar, revisar e assinar permanecem em S07 e no fluxo contratual original. S13 mostra lançamentos, compromissos e origem financeira, com atalho ao mesmo contrato; não reimplementa editor, negociação, promessa ou assinatura. S05 e S06 também não criam seletor ou negociação paralelos.
- **S11/S12/S14:** S11 mantém uma entidade de evento e sub-registros de paradas/apresentações. S12 é a referência canônica da sede/endereço; Mundo pode localizar ou abrir o mesmo lugar, sem manter endereço divergente. Em S14, mapa e lista são vistas da mesma entidade/ficha/ID, não duas fontes.
- **S15:** consolidar os termos **Crime**, **Submundo** e **Fraudes** como aliases de intenção para S15, proposto sob Mundo; não migrar nem retirar abruptamente os pontos de entrada observados: Submundo em Completa, Crime em Mapa e política na Essencial e Fraudes em Imprensa. Imprensa e Jurídico seguem donos de seus próprios registros; atalhos de S15 só aparecem com vínculo válido e preservam origem. “Riscos” e “Oportunidades” são seções/filtros internos, não macromenus.
- **S16/S17:** S16 narra trajetória, relações, cenas e continuidade apenas se disponíveis; S17 distingue criar, consultar e retomar campanha/save. Base existente de história, álbum de cenas, facções/fandom e sandbox não é novidade desta proposta. Story mode, cenas faltantes, final configurável e áudio do álbum final estão em desenvolvimento; não expor como ações prontas.

### Contrato das fontes compartilhadas

Campos repetidos devem vir da **mesma fonte autoritativa**, não de cópias mantidas por cada tela. Isso não autoriza somar conceitos diferentes: mostrar denominador, moeda, período, granularidade e estado junto do valor.

1. **Tempo e avanço:** S01, S03, S05, S10–S11, S13–S14, S16–S17 leem o calendário/período do save. S03 pode filtrar semana/mês; consulta, mudança de período exibido e histórico não avançam a campanha. Somente o comando existente avança tempo, uma vez, após suas próprias condições.
2. **Entidades, IDs e contexto de retorno:** catálogo de destino (M01), ficha contextual (M05) e ocorrência/IDs compartilhados (M07) suportam atalhos Agora–Inbox, pessoa–ato–contrato, projeto–sessão–lançamento, evento–parada, sede–local, mapa–ficha e escolha–ocorrência. Referências de tipo distinto nunca são fundidas apenas por nome ou proximidade.
3. **Finanças:** saldo/caixa e fechamento/ledger alimentam a apresentação financeira de S01/S03/S13; rubricas de projeto, sessão, lançamento, evento e sede só se integram ao mesmo registro financeiro quando houver vínculo verificável. S13 é a leitura central proposta do ledger; nenhum resumo deve criar um total paralelo.
4. **Pessoas e compromissos:** registro de pessoas/atos e relações sustenta S04–S06, equipes em S09/S11/S12 e vínculos de S05/S07. Promessas/obrigações associadas a contrato podem aparecer em S07 e S13 apenas se forem o mesmo compromisso canônico; separar promessa proposta, aceita, contratada e paga.
5. **Ocorrências e proveniência:** fonte, data, período, confiança, unidade, incerteza e histórico devem ser reutilizados como registrados em S02–S16. Log incompleto não significa ausência de evento; uma sequência não demonstra causalidade. Fonte ou confiança ausente não pode ser inventada.
6. **Regras, disponibilidade e save:** estado/ruleset autoritativo decide elegibilidade, conflito, ação habilitada, segredo e disponibilidade histórica; UI explica, não contorna. Em S17, versão/metadados do arquivo não equivalem a validação do carregador. Save 23 recusado por 27 e round-trip 27→27 são casos delimitados, não promessa de compatibilidade geral.
7. **Arte e navegação geográfica:** cada asset mantém o vínculo/origem existente. Preservar catálogo de 3.130 desenhos como referência, ícones/capas/logos anteriores, bonecos procedurais e arte ambiente nova; imagem não substitui texto, lista ou localização canônica.

### Inconsistências resolvidas e contraindicações

Foram normalizadas quatro ambiguidades: (1) grupo de S03 — alocação proposta a Gestão, sem alterar o motor; (2) S02 pertence ao Cockpit e S17 é uma utilidade global acessível por ele, com propósitos e IDs próprios; (3) S15 — proposta de alvo único para três rótulos e rotas antigas, sem apagar os acessos observados; (4) S04/S05/S06/S07 e S08/S09/S10 — índice, ficha, scouting, transação e etapas musicais continuam separadas, com links rastreáveis. Conflitos de fonte devem ser exibidos, não silenciosamente conciliados.

Não converter desconhecido, ausente, não carregado, não registrado, zero real e indisponível em um único estado. Não inferir capacidade livre, agenda sem conflito, risco zero, relação rompida, contrato aceito, compromisso pago, ganho, causalidade ou precisão mensal. Não calcular previsão ou agregar moedas/períodos/unidades incompatíveis. Não expor segredo em cartão, busca, histórico ou notificação. Não oferecer ação irreversível em lote; a exceção proposta em S04 limita-se a associação a grupo existente, com elegibilidade, prévia e confirmação, e depende de modelo autorizado. Não usar dificuldade/apresentação como atalho para disponibilidade histórica.

### Dependências e prioridade de integração

A base de implementação é M01–M07 (roteamento, IDs, resumo/detalhe/histórico, retorno contextual e estados consistentes). Depois vêm M08–M15 (relações, agenda, revisão/avanço, delegação limitada, trade-offs, proveniência causal, impedimentos), que exigem contratos claros com os motores existentes. M16–M25 dão onboarding, save, acesso, separação de apresentação, mundo, cenas e ajuda; M26–M30 preservam marcos, planejamento sem RNG, interesses opcionais, performance sem cortes e compatibilidade. Regras completas no briefing comum permanecem intactas; nenhum M é removido, renumerado ou substituído.

Ordem recomendada — **prioridade de arquitetura, não cronograma/esforço/status**:

- **P0 — validação de contrato:** confirmar caminhos/IDs e fontes técnicas; resolver alias sem migração destrutiva; definir distinções entre zero/desconhecido, realizado/comprometido/estimado, snapshot/atual e consulta/avanço; verificar retorno e sigilo. Sem essa base, não implementar indicadores derivados nem redirecionamentos.
- **P0 — infraestrutura comum:** roteador de destino único, aliases conservados, retorno à origem, apresentação consistente de proveniência/estado e layouts desktop/mobile acessíveis. Priorizar integrações cruzadas necessárias a Cockpit/Inbox, People/contrato/finanças e projeto–estúdio–lançamento.
- **P1 — composição por domínio:** aplicar layouts e detalhes de cada tela, inclusive mapa/lista, agenda/revisão, histórico e seções contextuais, condicionados às fontes reais e aos testes de regressão.

Os P0/P1/P2 usados por especialistas são importância local sugerida; não indicam que algo exista, esteja aprovado ou tenha data/esforço. A validação de aceitação deve comparar conteúdo e IDs antes/depois, desktop e mobile, save round-trip dentro dos casos observados, estados de erro/vazio/conflito e acessibilidade. Nenhuma prioridade autoriza cortes de conteúdo, alteração de RNG, segredo, regras ou disponibilidade histórica.


<a id="parte-vii"></a>

## Parte VII — Direção visual ilustrada

### Capturas de referência: estado observado do Masters 27

Estas capturas vêm dos testes anteriores. Desktop e mobile emulado não representam todo dispositivo/papel ou uma campanha longa.

![Masters 27 observado em desktop: referência da identidade e da hierarquia existente.](imagens/masters27_atual_desktop.png)

![Masters 27 observado em mobile emulado: referência da organização atual e área útil.](imagens/masters27_atual_mobile.png)

### Conceitos visuais: direção, não implementação

Os mockups abaixo são **ilustrações de proposta geradas**, não telas funcionais nem especificação pixel-perfect. O texto das partes II, III e IV é a fonte autoritativa. Dados, ícones, imagens de ambiente e composição são ilustrativos; não representam aprovação de novos logos, artes ou cortes de conteúdo. Em implementação, limitar banners decorativos para não consumir a área de decisão e preservar a arte escolhida pelo usuário. Campos de Nova run nos desenhos precisam de validação contra o inventário, não podem ser tratados como opções já prontas.

![Conceito de Cockpit desktop: navegação estável, ações atuais, jornada e acompanhamento contextual.](imagens/conceito_cockpit_desktop.png)

A figura mostra o contraste entre atmosfera musical e controles legíveis. A área de acompanhamento pode virar painel em telas estreitas. Data, caixa e riscos críticos reais não podem ser omitidos na implementação só porque esta ilustração os reduz.

![Conceito de correspondência desktop: lista de triagem separada do documento e de suas ações.](imagens/conceito_inbox_desktop.png)

O canal pode ser carta, telefonema ou e-mail conforme a era. Ler, estrelar e arquivar não equivalem a decidir; decisões com prazo permanecem acompanháveis. Valores presentes no desenho são ilustrativos.

![Conceito mobile: uma coluna, ações tocáveis e menu completo acessível.](imagens/conceito_mobile.png)

O objetivo é hierarquia e conforto, não esconder conteúdo. A implementação precisa reflow com zoom, teclado e texto ampliado, sem fixar uma grande área decorativa ou cobrir o corpo com ações.

![Conceito de Nova run completa: grupos de configuração e resumo com dependências, sem apresentar defaults como fatos.](imagens/conceito_nova_run_completa.png)

As categorias e os campos ilustrados são uma direção de organização. Inventário, opções reais e propostas estão explicitamente separados na Parte IV; revisão e geração precisam usar o mesmo snapshot validado.



<a id="parte-viii"></a>

## Parte VIII — Integração final, prioridades e critérios cruzados

### Uma organização canônica para o documento inteiro

As rotas abaixo são **propostas de organização**, não descrições de implementação no HTML. Elas resolvem os pontos em que capítulos exploratórios sugeriram endereços diferentes. **Esta decisão editorial prevalece sobre a localização de trabalho mencionada em capítulos individuais.** Os links antigos devem funcionar como aliases; não remover acesso para impor a nova árvore.

1. **Cockpit:** S01 painel; S02 correspondência/inbox. Agenda e fechamento são atalhos contextuais para S03, não outra agenda.
2. **Sede:** S12 sede e operação, com links às pessoas e recursos canônicos.
3. **Pessoas:** S04 elenco; S05 ficha de ato/formação e fichas individuais vinculadas; S06 scouting. Negociar abre a entidade/fluxo S07 por referência, sem duplicar contratos.
4. **Projetos:** S08 projeto/repertório; S09 sessão de estúdio; S10 lançamento/catálogo. Mantêm estados e entidades distintos quando o motor os distingue.
5. **Ao vivo:** S11 workspace de show/turnê. Modalidades e paradas reaproveitam as entidades existentes; não forçar migração de modelo por uma preferência visual.
6. **Mundo:** S14 exploração; S15 entrada Submundo com áreas relacionadas. Fraudes deve ser uma seção/destino específico referenciado por S15 e por Imprensa, não ser fundido indiscriminadamente com Crime.
7. **Gestão:** S03 agenda/revisão; S07 proposta/contrato; S13 finanças/compromissos. Artistas, mensagens e projetos abrem o mesmo contrato em contexto. A mudança de endereço é proposta, não alteração já realizada.
8. **Você:** S16 trajetória/legado.
9. **Utilidades globais, sem novo macromenu:** S17 central da campanha, ficha/passaporte, salvar/carregar, ajuda e preferências. Pode ser alcançada pelo Cockpit e barra global. A Nova run completa é o estado de criação aprofundado na especificação NR, não um segundo gerador de mundo.

#### Três refinamentos para evitar confusão

**Contrato não é pessoa.** A origem de uma negociação pode ser Scouting/Pessoas, mas seu registro, versão e compromissos precisam ter um endereço consistente. Se o projeto mantiver o endereço atual em Pessoas por compatibilidade, o índice deve declarar essa decisão e atualizar todos os aliases; não manter dois contratos.

**Submundo é agrupamento, não sinônimo de toda ocorrência.** Crime, Fraudes e Submundo podem ser aliases de busca para chegar à seção adequada; não significa mesclar IDs, textos, regras ou histórico. A ocorrência continua ligada à mídia/jurídico quando existe essa relação.

**Agenda é uma coordenação, não outro motor temporal.** Pode ser aberta por qualquer projeto, pessoa ou Cockpit. Selecionar uma semana no calendário é consulta; avançar o tempo é um comando distinto.

### Prioridades normalizadas

Neste documento, P0 significa fundação/consistência e preservação; P1 significa fluxo e controle; P2 significa aprofundamento opcional. São prioridades propostas, não status, prazos, custo ou esforço verificado. Um capítulo pode marcar uma melhoria como P0 localmente; a ordem global depende de seus pré-requisitos.

A sequência ampliada reaproveita as quatro etapas da proposta anterior:

1. **Fundação:** M01, M03, M05–M07, M18, M30, M42, M45, M48 e M50. Registro, identidade, tipos de estado, leitura, defaults/configuração e preservação.
2. **Um ciclo completo:** S01/S02 → S06/S07 → S08/S09/S10 → S13/S16, com S03 coordenando recursos e tempo. Outros papéis recebem seus próprios percursos, sem serem obrigados a seguir a jornada de gravadora.
3. **Escala e conforto:** M04, M11, M12, M17, M19, M29, M41, M43 e M44. Lotes reversíveis, continuidade, rascunhos, ritmo e performance.
4. **Profundidade escolhida:** M31–M40, M46, M47, M49 e demais propostas P2, respeitando dependências. Mudanças efetivas do motor exigem especificação e balanceamento próprios.

Isso não substitui a integração R28 já pedida. A formação mensal, os bonecos, a inbox FM, as promessas, as cenas e o final precisam ser conectados às mesmas fontes, não refeitos como módulos paralelos.

### Um contrato de preservação por alteração de tela

Antes de aplicar qualquer redesenho, registrar:

1. Rotas/ações afetadas e seus aliases.
2. Entidades, documentos e assets que a tela consulta.
3. Campos essenciais para decidir e onde aparecerão.
4. Campos movidos para detalhe/histórico e seu caminho de acesso.
5. Regras, sigilo e calendário que não podem mudar.
6. Preferências/rascunhos que precisam persistir separadamente.
7. Como o retorno e o foco serão restaurados.
8. Como testar vazio, erro, conflito, indisponível e conteúdo extremo.
9. Como exportar/carregar sem perder campanha nem prometer compatibilidade inexistente.

A aprovação de uma tela depende de fluxo e preservação, não de ela se parecer com um mockup. Uma arte de conceito é um apoio de direção, não a especificação do comportamento.

### Critérios cruzados de aceite

1. **Cobertura:** cada rota/ação inventariada tem correspondência depois do redesenho ou indisponibilidade explicada pela regra, nunca exclusão silenciosa.
2. **Consistência:** identidade, formação temporal, oferta, agenda, ledger e situação de projeto vêm das mesmas fontes nas telas que os mostram.
3. **Agência:** avançar/delegar/lote não processam decisões fora da autorização escolhida; padrões estão visíveis.
4. **Conhecimento:** estimativas não viram fatos; ausência não vira zero; segredo não aparece na busca ou nos cards.
5. **Contexto:** abrir e voltar preserva seleção, período, filtros, scroll e foco quando aquele contexto permanece válido.
6. **Configuração:** rápido/guiado/completo revisam o mesmo modelo; gerar usa a configuração validada, sem reroll ou mudança invisível entre revisão e início.
7. **Compatibilidade:** alteração de layout/pref não exige save novo por padrão; se exigir, explicar tecnicamente, preservar backup e não instruir exclusão.
8. **Acesso:** teclado, toque, zoom, texto ampliado e alternativas textuais mantêm as capacidades essenciais e conteúdo completo.
9. **Performance:** testar campanhas pequenas e grandes, não só o painel vazio; medir dispositivos-alvo antes de impor metas numéricas.
10. **Narrativa:** cenas e documentos permanecem revisitáveis; replay não executa efeitos novamente; a revisão final representa aquela campanha, não um roteiro genérico.

### Uso dos arquivos de especificação

O Markdown é a fonte legível e versionável. Word e PDF contêm o mesmo documento completo, incluindo as imagens. O JSON reúne M01–M50, as especificações das telas, o aprofundamento de Nova run e os respectivos critérios.

Os capítulos de tela usam IDs UX-Sxx-yy; as melhorias gerais usam M01–M50; Nova run usa NR-xx. Uma melhoria local pode detalhar uma geral — isso é rastreabilidade, não uma promessa de que cada ID corresponde a uma funcionalidade independente nova.


<a id="parte-ix"></a>

## Parte IX — Atlas visual das telas do Masters

**Exemplos do próprio Masters, no mesmo sentido do Cockpit já apresentado.** Este conjunto reúne as 17 telas propostas, as seis etapas da configuração completa de Nova run e o exemplo mobile. Não são referências de Football Manager ou de outros jogos.

Cada imagem ilustra hierarquia, agrupamento e posição relativa das informações. **Não é tela implementada, especificação pixel-perfect nem lista completa de campos.** Texto, regras e critérios nas partes II–IV continuam autoritativos. Valores e personagens de exemplo são fictícios; uma legenda não comprova efeito ou precisão do motor.

**Cuidados ao implementar:** rótulos, estados selecionados, datas, valores, exemplos de arte e tipos visuais de controle não comprovam regra ou default. No setup, a barra deve usar Salvar rascunho/Continuar/Revisar, nunca avançar a simulação. Traços e ambições mantêm os controles e opções reais do inventário, mesmo que o desenho use campos ilustrativos. Ícones extras de Campanha/Submundo são atalhos/seções, não novos macromenus. A marca e a arte definitivas continuam as escolhidas pelo usuário.

**[INFERÊNCIA]** O ganho esperado de orientação e jogabilidade deve ser validado no fluxo real. Não copiar um rótulo ou bloco do desenho para criar uma regra inexistente. Todo conteúdo fora do enquadramento precisa permanecer alcançável em detalhe, histórico ou seção nomeada.

### S01 — Cockpit

![Cockpit — referência visual conceitual do Masters, não implementada.](imagens/conceito_cockpit_desktop.png)

**Organização demonstrada:** Navegação estável, bloco Agora, etapa do projeto e acompanhamento contextual.

**Aplicação e preservação:** O Cockpit resume a situação e encaminha à entidade canônica; não executa uma segunda versão da inbox, da agenda ou do projeto. O banner artístico deve ocupar menos espaço no produto real se competir com prazo, caixa e decisões.

**Ler junto com:** Parte III — S01.

### S02 — Correspondência / inbox

![Correspondência / inbox — referência visual conceitual do Masters, não implementada.](imagens/conceito_inbox_desktop.png)

**Organização demonstrada:** Lista de triagem separada da leitura integral e das ações da mensagem.

**Aplicação e preservação:** A lista apresenta remetente, assunto, prévia, categoria e situação; o documento selecionado mostra o conteúdo completo. Estrelar ou arquivar não equivale a decidir. Em eras antigas, a linguagem de carta preserva o padrão de leitura sem chamar tudo de e-mail.

**Ler junto com:** Parte III — S02.

### S03 — Agenda e fechamento

![Agenda e fechamento — referência visual conceitual do Masters, não implementada.](imagens/mockups/S03_agenda.png)

**Organização demonstrada:** Planejamento por pessoa/recurso, conflitos conhecidos e revisão antes do avanço.

**Aplicação e preservação:** A agenda centraliza contexto temporal e reservas; o painel explica a origem do conflito. Consultar calendário não avança o motor. Datas, capacidades e políticas de parada efetivas precisam vir da regra, não do desenho.

**Ler junto com:** Parte III — S03.

### S04 — Elenco e pessoas

![Elenco e pessoas — referência visual conceitual do Masters, não implementada.](imagens/mockups/S04_elenco.png)

**Organização demonstrada:** Índice operacional com tipos de entidade explícitos e uma ficha contextual lateral.

**Aplicação e preservação:** Uma banda, um artista e um integrante não são a mesma entidade. A seleção abre contexto e links; a ficha completa mantém todos os dados. Filtros e ações em lote não podem implicar contratação ou dispensa automática.

**Ler junto com:** Parte III — S04.

### S05 — Ficha de artista/banda e formação

![Ficha de artista/banda e formação — referência visual conceitual do Masters, não implementada.](imagens/mockups/S05_ficha_formacao.png)

**Organização demonstrada:** Formação no período, funções combinadas e ex-integrantes acessíveis.

**Aplicação e preservação:** Integrantes exibidos, contador e palco devem usar a mesma formação temporal. As pessoas ilustradas são fictícias. Datas só podem ganhar precisão mensal se a fonte a sustentar. O painel relaciona contratos e história sem duplicar os registros.

**Ler junto com:** Parte III — S05.

### S06 — Scouting e funil de talentos

![Scouting e funil de talentos — referência visual conceitual do Masters, não implementada.](imagens/mockups/S06_scouting.png)

**Organização demonstrada:** Descoberta, avaliação, comparação e encaminhamento à negociação, com proveniência.

**Aplicação e preservação:** O relatório distingue observação, rumor e informação desatualizada. A lista ajuda a comparar o que é conhecido, sem revelar atributo secreto ou prever sucesso garantido. Negociar abre S07 pelo mesmo alvo, não contrata pela shortlist.

**Ler junto com:** Parte III — S06.

### S07 — Negociação e contrato

![Negociação e contrato — referência visual conceitual do Masters, não implementada.](imagens/mockups/S07_negociacao.png)

**Organização demonstrada:** Termos agrupados, compromissos e revisão da oferta antes da resposta.

**Aplicação e preservação:** Adiantamento, royalty e sua base, prazo e entregas ficam juntos. Rascunho, proposta e contrato assinado são estados diferentes. Promessas aqui ilustradas dependem da integração solicitada; não se presume seletor já entregue.

**Ler junto com:** Parte III — S07.

### S08 — Projeto musical e repertório

![Projeto musical e repertório — referência visual conceitual do Masters, não implementada.](imagens/mockups/S08_projeto.png)

**Organização demonstrada:** Etapa, faixas, dependências, recursos e orçamento do mesmo projeto.

**Aplicação e preservação:** A faixa selecionada leva à ação válida e ao detalhe completo. O projeto coordena o ciclo; estúdio e lançamento continuam destinos próprios. Nenhuma porcentagem desenhada deve substituir um estado ou uma regra real.

**Ler junto com:** Parte III — S08.

### S09 — Estúdio e gravação

![Estúdio e gravação — referência visual conceitual do Masters, não implementada.](imagens/mockups/S09_estudio.png)

**Organização demonstrada:** Seleção de faixas, equipe/equipamento, direção e revisão da sessão.

**Aplicação e preservação:** O impedimento deve trazer motivo e caminho de correção. Agendar sessão não é executá-la; o tempo e os custos seguem o motor existente. A arte de estúdio é contexto, não substitui os campos de planejamento.

**Ler junto com:** Parte III — S09.

### S10 — Lançamento e catálogo

![Lançamento e catálogo — referência visual conceitual do Masters, não implementada.](imagens/mockups/S10_lancamento.png)

**Organização demonstrada:** Preparação, publicação, retorno e catálogo distinguindo plano de realizado.

**Aplicação e preservação:** A revisão reúne faixas, capa, formato disponível e verba. Catálogo e histórico preservam cada lançamento e seus vínculos. O conceito não promete vendas, posições ou formatos disponíveis fora de sua era.

**Ler junto com:** Parte III — S10.

### S11 — Ao vivo: show e turnê

![Ao vivo: show e turnê — referência visual conceitual do Masters, não implementada.](imagens/mockups/S11_ao_vivo.png)

**Organização demonstrada:** Apresentações e preparação artística/logística com contexto de um evento.

**Aplicação e preservação:** Show e turnê podem compartilhar um workspace sem forçar migração do modelo. Formação na data, agenda e recursos precisam ser validados. O inspector encaminha às fontes; uma miniatura de palco não é prova de show pronto.

**Ler junto com:** Parte III — S11.

### S12 — Sede e operação

![Sede e operação — referência visual conceitual do Masters, não implementada.](imagens/mockups/S12_sede.png)

**Organização demonstrada:** Ambiente explorável combinado com lista textual e ficha do recurso.

**Aplicação e preservação:** A ilustração mantém atmosfera; decisões de sala, equipamento e uso aparecem em controles legíveis. Mapa da sede e lista devem abrir o mesmo recurso. Não aplicar upgrades ou custos só por clicar na imagem.

**Ler junto com:** Parte III — S12.

### S13 — Finanças e compromissos

![Finanças e compromissos — referência visual conceitual do Masters, não implementada.](imagens/mockups/S13_financas.png)

**Organização demonstrada:** Realizado, comprometido e estimado separados, com ledger e origem.

**Aplicação e preservação:** Os valores do produto devem indicar moeda, período e fonte. A referência não é cálculo financeiro nem demonstra reconciliação. Um resumo abre a mesma movimentação ou contrato canônico, sem criar um total paralelo.

**Ler junto com:** Parte III — S13.

### S14 — Mundo e exploração

![Mundo e exploração — referência visual conceitual do Masters, não implementada.](imagens/mockups/S14_mundo.png)

**Organização demonstrada:** Mapa atmosférico, alternativa de lista e contexto de um local.

**Aplicação e preservação:** O cenário desenhado é fictício, não mapa geográfico exato. Filtros mudam a apresentação; o universo integral continua acessível. Os destinos do mapa e da lista precisam compartilhar ID e a entrada Submundo permanece encontrável.

**Ler junto com:** Parte III — S14.

### S15 — Submundo e fraudes

![Submundo e fraudes — referência visual conceitual do Masters, não implementada.](imagens/mockups/S15_submundo.png)

**Organização demonstrada:** Ocorrências com origem, situação do conhecimento e vínculos à decisão.

**Aplicação e preservação:** Submundo organiza acesso, não transforma toda fraude em crime nem funde textos e IDs. Rumor, análise e registro confirmado têm rótulos diferentes. A apresentação é ficcional e abstrata; os atalhos preservam origem e contexto.

**Ler junto com:** Parte III — S15.

### S16 — Você: trajetória e legado

![Você: trajetória e legado — referência visual conceitual do Masters, não implementada.](imagens/mockups/S16_trajetoria.png)

**Organização demonstrada:** História registrada, relações, compromissos e álbum de cenas.

**Aplicação e preservação:** O personagem procedural e os marcos são ilustrativos. O histórico real precisa se apoiar em eventos da campanha. Rever uma cena não processa suas consequências novamente; cenas futuras ou faltantes não são tratadas como entregues.

**Ler junto com:** Parte III — S16.

### S17 — Central da campanha

![Central da campanha — referência visual conceitual do Masters, não implementada.](imagens/mockups/S17_campanhas.png)

**Organização demonstrada:** Criar, retomar e consultar como estados claros, com passaporte e validação.

**Aplicação e preservação:** A central é utilidade global, não um novo macromenu. Consultar não carrega; validar não promete compatibilidade universal. Preservar o original e distinguir rascunho, save em memória e exportação confirmada.

**Ler junto com:** Parte III — S17.

### NR01 — Nova run — Mundo

![Nova run — Mundo — referência visual conceitual do Masters, não implementada.](imagens/mockups/NR01_mundo.png)

**Organização demonstrada:** Modelo de mundo, período/contexto, tecnologia, base e semente.

**Aplicação e preservação:** A navegação mantém as seis etapas verificadas. As opções abreviadas no desenho têm acesso à descrição completa; valores de exemplo não são defaults universais. A revisão recebe as escolhas do mesmo rascunho.

**Ler junto com:** Parte IV — Etapa 1 e NR-01/NR-03/NR-04.

### NR02 — Nova run — Personagem

![Nova run — Personagem — referência visual conceitual do Masters, não implementada.](imagens/mockups/NR02_personagem.png)

**Organização demonstrada:** Identidade, trajetória/música, vida/relações e personalidade em grupos.

**Aplicação e preservação:** A densidade deve reflow em telas pequenas sem excluir dados do personagem. Visual do personagem não é preferência de UI. Campos sensíveis descrevem um personagem fictício; opções completas e efeitos conhecidos permanecem consultáveis.

**Ler junto com:** Parte IV — Etapa 2 e NR-01/NR-08.

### NR03 — Nova run — Modo

![Nova run — Modo — referência visual conceitual do Masters, não implementada.](imagens/mockups/NR03_modo_gravadoras.png)

**Organização demonstrada:** Atividades, cenário inicial, empresa e ajustes finos com papel derivado.

**Aplicação e preservação:** Multicarreira e fundar/assumir precisam mostrar quais controles se aplicam. O desenho apresenta rótulos curtos com acesso ao texto integral. Assumir uma empresa não pode descartar ajustes silenciosamente; Gravadoras tem vista própria na imagem seguinte.

**Ler junto com:** Parte IV — Etapa 3 e NR-05/NR-07.

### NR06 — Nova run — Gravadoras

![Nova run — Gravadoras — referência visual conceitual do Masters, não implementada.](imagens/mockups/NR06_gravadoras.png)

**Organização demonstrada:** Forma de início, rivais, seleção pesquisável e empresas futuras.

**Aplicação e preservação:** As entidades desenhadas são fictícias; a lista real depende de ano/cidade/mundo. Filtros preservam acesso às opções. Alterar contexto deve explicar seleções afetadas e mostrar quantidade efetiva, sem usar uma lista fixa como catálogo universal.

**Ler junto com:** Parte IV — Etapa 4 e NR-04/NR-07.

### NR04 — Nova run — Regras e ritmo

![Nova run — Regras e ritmo — referência visual conceitual do Masters, não implementada.](imagens/mockups/NR04_regras_ritmo.png)

**Organização demonstrada:** Dificuldade, duração, narrativa, liberdade, Ironman, filtros e mutators.

**Aplicação e preservação:** Tutorial é separado como preferência do navegador. A imagem não acrescenta ano final independente como se fosse existente; essa melhoria permanece NR-02. Controles visuais/áudio propostos não podem alterar regras silenciosamente.

**Ler junto com:** Parte IV — Etapa 5 e NR-02/NR-07/NR-09.

### NR05 — Nova run — Revisão

![Nova run — Revisão — referência visual conceitual do Masters, não implementada.](imagens/mockups/NR05_revisao_validada.png)

**Organização demonstrada:** Resumo integral com edição por seção e compromisso final distinto.

**Aplicação e preservação:** Seed, versão, defaults herdados e avisos precisam corresponder à configuração efetiva. O contrato de snapshot é proposta a validar; o desenho não comprova determinismo. A seed precisa estar definida antes de confirmar a geração. Alterar escolha exige nova revisão antes de gerar.

**Ler junto com:** Parte IV — Etapa 6 e NR-03/NR-06/NR-07.

### MOBILE01 — Cockpit mobile

![Cockpit mobile — referência visual conceitual do Masters, não implementada.](imagens/conceito_mobile.png)

**Organização demonstrada:** Uma coluna, próximo passo e acesso ao Menu completo.

**Aplicação e preservação:** A navegação inferior é atalho, não limite do conteúdo. Testar zoom, teclado e tamanho de texto. Não fixar tantas barras que a leitura fique sem espaço; as informações críticas continuam visíveis e todos os campos acessíveis.

**Ler junto com:** Parte II — G05/G09 e Parte III — S01.

## Referências

[1]: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/112 "Xbox Accessibility Guideline 112 — UI navigation"
[2]: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109 "Xbox Accessibility Guideline 109 — Objective clarity"
[3]: https://gameaccessibilityguidelines.com/full-list/ "Game Accessibility Guidelines — Full list"
[4]: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/102 "Xbox Accessibility Guideline 102 — Contrast"
[5]: https://developer.apple.com/design/human-interface-guidelines/accessibility "Apple Human Interface Guidelines — Accessibility"

