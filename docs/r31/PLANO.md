# Masters 31 — plano mestre

Fonte completa (texto da página aprovada): `docs/r31/plano-pagina.md`. Mapas de apoio: `sistemas.md`, `plano-telas.md`,
`unificacao.md`, `conhecimento.md`, `carreiras.md`, `artistas-reliquias.md`. Regras de todos os agentes: `BRIEFING.md`.
Decisões e mudanças de valores de referência: `DECISOES.md`.

Formato: **ID · título** — tipo (interface / dados / ação / regra econômica) · depende de · teste · aceite.
Fluxo: onda N termina com build `Masters_31_ondaN.html`, enviada ao dono; a onda seguinte começa sem esperar aprovação.

## Onda 0 · contratos e ponto de partida
- **W0-DOC · plano, briefing, roteiro, scripts** — dados · — · `scripts/r31/smoke.mjs` · arquivos no repo, build e fumaça rodam.
- **W0-RNG · fim do sorteio único antigo** — regra · — · `tests/r31-rng.test.ts` (nenhum `rngOf`, nenhum caminho `perSystem19` falso) · goldens re-medidos com motivo.
- **W0-OP · opinião em fonte única** — dados · — · `tests/r31-contracts-opinion.test.ts` (escritas fora de `opinion.ts` só diminuem; lista de permitidos com contagem) · API `opinionOf/opine/setOpinion` em `src/sim/opinion.ts`; ficha e modificadores leem dela.
- **W0-KN · conhecimento em fonte única** — dados · — · `tests/r31-know.test.ts` · `src/sim/know.ts` com `know(s, observador, alvo)`; `estimate`/`knownLevel` passam por ele; larguras numa tabela só; faixa nunca centrada no valor real.
- **W0-AT · fila única de avisos (tipos)** — dados · — · teste de tipo · `src/sim/attention.ts` com item, prioridade, categoria, pendência; `notify` grava nela.
- **W0-FACT · registro único de acontecimentos** — regra · — · teste: `emitFact` com `diary`/`notify` gera diário e aviso por ouvinte · contrato pronto e usado nos sistemas novos.
- **W0-CAL · "nada tem data sem estar no calendário"** — regra · — · teste de varredura com lista de pendentes que só diminui.
- **W0-ROLE · tipo Papel** — dados · — · teste · `Role` (uma pessoa, vários papéis por época).
- **W0-CON · contratos compartilhados** — dados · — · testes de contrato · pendência única (id, dono, atalhos), destino (área, aba, intenção, pessoa, país, época, carreira), objeto (modelo ≠ instância; dono, quem está com ele, oferta), transação atribuída e totais duráveis, interruptores.
- **W0-RN · registro de nomes reais** — dados · — · teste de varredura · `src/data/realnames31.ts` vazio + teste.
- **W0-BASE · medição de referência da versão 30** — medição · — · `docs/r31/base30.md` · tempos (abrir telas, virar semana, salvar), tamanho do save, balanço em várias sementes e épocas, cliques numa lista fixa de tarefas.
- **Para seguir:** ponto de partida reproduzível; suíte verde; contradições dos documentos resolvidas.

## Onda 1 (31.1) · clareza
- **A · Menu e Hoje** — interface · W0-CON · percurso por carreira · menu ≤10 itens com faixas de Lugares; Hoje com 3 perguntas e linha do tempo única; Listas; Menu completo; cabeçalho único; topo enxuto; abas com "Mais"; contadores por pendência única.
- **B · Janelas dentro do jogo** — interface · — · teste que proíbe `alert/confirm/prompt` · ~40 janelas trocadas; perfil e PIN no jogo; arrastar arquivo.
- **C · Base dos estilos** — interface · — · contraste · preferência "automático pela era", tokens, daltonismo.
- **EDT · Editores** — ação · W0-CON · testes de editar/exportar/importar · editor na partida (dinheiro, pessoas, empresas, itens, cenas, eventos, mundo, ferramentas; assumir empresa, todas as carreiras, sem exaustão) e editor de base na tela inicial (editar, validar, salvar, juntar, exportar/importar arquivo ou código).
- **UNI-1 · Calendário e avisos** — dados · W0-CAL, W0-AT · varredura · calendário completo; avisos e caixas unificados.
- **O · Fundamentos** — interface · — · RN-03/04/09/15/27/28 · motivo do bloqueio antes do clique; estimado/reservado/a pagar; fato/cálculo/hipótese; painel rápido de ação; busca que abre a ação; favoritos; metas pessoais.

## Onda 2 (31.2) · cenas e gestão
- **J · Hoje e projetos em cena** (Mesa do chefe, Turnê mapa+calendário, Projeto musical).
- **K · Salas da sede** (personagem nas salas, cena-assinatura por carreira, Estúdio, Elenco, Equipe, Catálogo, Talentos, troféus e relíquias).
- **Q · Delegação estilo FM** (diretrizes, registro de automação, visão agregada).
- **V · Mecânicas em cena 1** (negociar, renovar, rescindir, contratar, demitir, punir, formação; modo de 2 cliques).
- **L · Arte** (salas por época e tamanho, objetos).

## Onda 3 (31.3) · economia, mercados e dados
- **D · Mercado** (pressão de mercado no lugar da penalização pós-1990; previsão pela mesma conta; transporte).
- **Y · Paradas por país** · **E · Bolsa** (valor real por empresa) · **P · Resultados por projeto**.
- **F · Conhecidos e conhecimento** (grafo todos×todos, 5 dimensões, 25 incoerências).
- **AP · Aparência e sex appeal** · **UNI-3** · **SOC · Sócios e compras** · **U · Facções por país** · **G · Objetos** ·
  **Z · Família e base nova** · **CAR · Carreiras que mudam o mundo**.

## Onda 4 (31.4) · mundo e conteúdo
- **UNI-4** (festival, casa de shows, turnê, empresário, rivais; cidades; segredos) · **H · Loja e cidade** ·
  **I · Gente e interiores** · **S · Submundo** · **T · Aeroporto, transporte e leilões** · **W · Mecânicas em cena 2** ·
  **R · Resultados e aprendizados** · **N · Extras** · **M · Estilos por época** · **X · Nomes e obras reais**.

- **Pedidos do dono durante a onda 4 (2026-10-16):** CAR2 (pendências das carreiras) · FIX (suíte verde) · ART (uniformizar
  assets das cenas, ex.: bateria) · ART2 (assets novos interativos) · FOS (casa da família Fossati e praça como cenas) ·
  VIT (vitrine do mês: interiores dinâmicos no estilo da loja de instrumentos, motor único) · LOTE (≥ 90% dos prédios do
  mapa são negócio, lote comprável ou casa de CEO/artista da cidade) · EMO (emojis da tela viram ícones em pixel art,
  fonte única em `ui/pixel/icons.ts`) · POL (acabamento visual de todas as cenas e mapas da onda 4: nada flutuando,
  sem placeholder, sem rótulo sobreposto; checagem automática em `tests/r31-pol.test.ts`) · T2 (leilão de catálogos/masters com proposta
  fechada, leilão silencioso do mercado negro, apreensão de carga na alfândega como mecânica) · AMOR (chamar qualquer adulto para sair, amantes com risco de descoberta,
  romance com gente do mercado, integrado a vida/família/segredos/opinião; família Fossati nunca é alvo).

## Onda 5 (31.5) · jogo explorável (pedido do dono, 2026-10-16) — mapa completo das telas: `docs/r31/onda5-mapa.md`
> Entra depois dos ajustes da build `Masters_31_onda4.html`. Objetivo: menos telas soltas e menos texto, no estilo Punch Club —
> cada função é um lugar, um objeto, uma porta ou uma pessoa. As telas atuais ficam por baixo (a camada nova é de navegação);
> números do jogo não mudam. Foco no PC (celular fica para depois).
> **Começo antecipado (pedido do dono, 2026-10-16):** enquanto a onda 4 termina, a onda 5 começa só pelo que não esbarra
> nela: ART5 (objetos e papéis em pixel art, `claude/r31-w5-art`), INI (tela inicial e nova run, `claude/r31-w5-ini`) e
> TEC (teclas, especificação de cada tela e esqueleto da navegação atrás de `exp5.nav`, `claude/r31-w5-tec`). A sede como
> centro, a retirada dos menus, a casa como "Você" e o mapa sem lista ficam para depois da build da onda 4 e dos ajustes.
- **Mocks** em `docs/r31/mocks/onda5/` (sede, fichário, casa, cidade, pausa). Decisão do dono (2026-10-16): a ideia está
  aprovada, mas o acabamento tem que ser polido na implementação:
  - interface toda em pixel art (molduras, botões, etiquetas e o bolso desenhados no estilo do jogo, não "chips" de site);
  - etiquetas pequenas que aparecem ao passar o mouse ou com Alt, e não todas de uma vez;
  - objetos novos desenhados de verdade (espelho, porta-retratos, telefone, calendário, garagem) e nada de placeholder;
  - mapa sem nomes amontoados;
  - fichário com retratos dos bonecos e cartões de papel em pixel art;
  - um passe de acabamento (regra POL) antes de cada entrega.
- **Mocks** em `docs/r31/mocks/onda5/` (sede, fichário, casa, cidade, pausa). Decisão do dono (2026-10-16): a ideia está
  aprovada, mas o acabamento tem que ser polido na implementação:
  - interface toda em pixel art (molduras, botões, etiquetas e o bolso desenhados no estilo do jogo, não "chips" de site);
  - etiquetas pequenas que aparecem ao passar o mouse ou com Alt, e não todas de uma vez;
  - objetos novos desenhados de verdade (espelho, porta-retratos, telefone, calendário, garagem) e nada de placeholder;
  - mapa sem nomes amontoados;
  - fichário com retratos dos bonecos e cartões de papel em pixel art;
  - um passe de acabamento (regra POL) antes de cada entrega.
- **Padrão visual aprovado (2026-10-16):** todas as telas seguem o padrão dos mocks do mural do elenco, do quadro de
  planejamento, da agenda e do bolso (`docs/r31/mocks/onda5/onda5-mock-elenco-*.png` e `onda5-mock-bolso-*.png`):
  - cada tela é um objeto do mundo aberto por cima da cena (cortiça, quadro, caderno, livro-caixa, revista, caixa de
    entrada da época), sem trocar de tela;
  - abas como marcadores do próprio objeto;
  - topo fixo (data, caixa, fama, avançar) e embaixo os botões de viagem com ícone e o bolso;
  - Esc fecha e cada objeto tem tecla própria.
- **EXP-1 · Sede como centro** — interface · aceite: as abas do topo somem; cada função abre por um objeto da sede.
  Mapa inicial: porta da rua → cidade (meu mundo); mapa-múndi → outros países/aeroporto; mural de cortiça → artistas
  conhecidos/elenco; arquivo de aço → contratos e catálogo; mesa com livro-caixa → Finanças; caderno na estante →
  Aprendizados; cofre → caixa e dívidas; telefone → agente/empresário/pedidos; secretária eletrônica (pisca) → avisos do mês;
  jornal → notícias e fatos; rádio/TV → paradas e mídia; calendário → agenda; estante de troféus → conquistas;
  porta-retrato → casa Fossati; porta interna → estúdio; quadro branco → reunião de lançamento; janela → clima da época e
  tendências. Funcionários parados na sede (A&R, assessoria, contador…) abrem o assunto deles (1–2 falas + "ver números").
  Salvar, configurações e ajuda num menu de pausa (Esc / engrenagem).
- **EXP-2 · Teclas de atalho** — interface · aceite: toda função da sede e do mapa tem tecla (ex.: M mapa, F finanças,
  A artistas, C contratos, G agenda, N notícias, T telefone, P paradas, Esc pausa, ? lista das teclas); o objeto mostra a
  tecla ao passar o mouse; teclas configuráveis; o "?" é ajuda, não volta a ser lista de navegação.
- **EXP-3 · Mapa sem lista** — interface · aceite: sai o modo "ver como lista" de todos os lugares (e o modo lista da sede,
  `ui/sys/hubs20.ts`); cidade navegável com nome ao passar o mouse, "!" em prédios com novidade, placas por tipo
  (lojas, shows, lotes à venda) que destacam os prédios, "ir até lá" a partir da agenda e dos avisos; viagem pela
  estação/ponto (outra cidade) e aeroporto (outro país). Andar e explorar não passam tempo.
- **EXP-4 · Papéis em vez de telas de texto** — interface · aceite: Finanças, contratos e paradas abrem como documento por
  cima da cena (fechar volta à mesma cena); texto corrido vira falas curtas.
- **EXP-5 · Sede que cresce** — interface/dados · aceite: garagem → escritório → prédio, por época e tamanho; cada objeto
  aparece quando a função é liberada, substituindo parte do tutorial em texto.
- **EXP-6 · "Você" vira a sua casa** — interface · aceite: a aba Você some; a casa (frente H, que já tem sala e garagem)
  vira o lugar da vida pessoal: espelho → ficha do personagem; cama → descansar/energia; calendário da cozinha → agenda
  pessoal; telefone de casa → contatos e chamar para sair (AMOR); instrumento na parede → praticar/aprender; escrivaninha →
  compor sozinho e memórias; gaveta/cofre → patrimônio pessoal; porta-retratos → parceiro, filhos e família (ficha "Coração");
  garagem → veículos; estante → hobbies; quarto das crianças aparece quando há filhos. Atividades fora (tocar num bar,
  academia, terapia, festa da indústria) viram lugares da cidade. A casa muda com a época e com o imóvel comprado.
- **EXP-7 · Artistas sem tela solta** — interface · aceite: o seu elenco fica no mural de cortiça da sede (polaroids; quem
  está ensaiando aparece no estúdio, quem espera reunião aparece na recepção); "todos os artistas conhecidos" vira o
  fichário de contatos (rolodex) da mesa: gavetas por letra/gênero/país, abas de ordenar e busca continuam (abre como papel
  por cima da cena, tecla A); prospectos ficam no caderno do olheiro; artistas de outros selos se encontram na cidade
  (casa de shows, rádio, festa). Muitos artistas pedem lista: ela continua, só que em forma de fichário, não de tela.
- **Ficha do personagem fica como está** (decisão do dono, 2026-10-16): só polimento — ícones em pixel art (EMO), retrato
  maior, "o que você sabe" mais claro, aba Coração (AMOR); abre de qualquer lugar (clicar na pessoa numa cena, no cartão do
  fichário ou no mural).
- **EXP-8 · Polimento geral (pedido do dono, 2026-10-16)** — interface/arte · aceite: passe completo de acabamento em
  todas as cenas, cenários, objetos, mapas, bonecos e telas, além do POL da onda 4. Inclui:
  - nada flutuando;
  - nenhum placeholder;
  - objetos que parecem o que são;
  - rótulos sem sobreposição;
  - cômodos mobiliados por época;
  - consistência de paleta e escala;
  - animações pequenas (luz, fumaça, gente andando);
  - a prévia da nova run e a tela inicial (abaixo).
- **EXP-9 · Nova run (rápida e completa)** — interface · mocks `onda5-mock-novarun-*.png` (aprovados pelo dono, 2026-10-16):
  - **Começo rápido:** uma ficha de inscrição só, com as 7 escolhas principais: quem é você (com editor de personagem:
    boneco do jogo, nome, idade, pele, cabelo, roupa, acessório, sortear; traço de personalidade opcional), cidade,
    carreira (6 + "mais" na completa), ano (régua com as eras), tamanho do começo (iniciante → em crise), dificuldade e duração. Além delas,
    dois interruptores (nomes reais; mundo segue a história real) e o botão "Começar". Links para configuração completa,
    cenários, código de run e carregar.
  - **Configuração completa:** as 6 etapas (Mundo, Personagem, Carreiras, Gravadoras, Regras e ritmo, Revisão) como
    marcadores à esquerda; o conteúdo na mesma ficha de papel; anterior/próxima embaixo; teclas { e }.
  - **Prévia "Sua história" à direita, no mesmo papel:**
    - a cena é desenhada na hora com a época, a cidade e a carreira escolhidas (`onda5-mock-novarun-previa.png`), e não é
      mais uma imagem parada fora do design;
    - o boneco do jogador;
    - o resumo em texto e as etiquetas das regras.
- **EXP-10 · Tela inicial com arte própria** — arte · mock `onda5-mock-inicio.png` (aprovado pelo dono, 2026-10-16):
  - **Cena musical feita com a própria arte do jogo** (bonecos `avatarSprite`, bateria/amplificadores/caixas/plateia de
    `stage31px`, horizonte `renderSky27` da cidade e da época; rascunho em `docs/r31/mocks/onda5/home-src/`) no lugar
    da sede: palco à noite, banda tocando, plateia, fachos de luz, lua de vinil e letreiro. A mesma cena é a prévia da
    nova run.
  - **Muda conforme a época sorteada ou a última partida:**
    - 1900: gramofone e piano;
    - 1960: amplificadores e bateria;
    - 2025: telão de LED e DJ.
  - **Menu:** Nova run, Continuar, Carregar, Cenários e Opções, com a dedicatória embaixo.
- **EXP-11 · Transições entre telas** — arte e interface · mocks `onda5-mock-transicao-{1..5}.png` (aprovado pelo dono, 2026-10-16):
  - **Viagem (Sede, Casa, Cidade, Mundo):** cortina de palco fecha, cartão do destino com o que espera lá, cortina abre
    no destino. 0,5 s no total; qualquer tecla ou clique pula.
  - **Objeto da sede:** sem cortina; zoom em pixel no objeto e o papel sobe (0,3 s). Esc faz o papel descer (0,15 s).
    Atalhos do bolso abrem direto, sem zoom.
  - **Mundo:** a rota anda no mapa com o transporte da época (navio/trem até 1949, avião depois), depois cortina com a
    passagem.
  - **Virada do mês:** a folha do calendário cai, o mês novo mostra só o que pede você e a sede volta com os "!".
  - **Por época:** veludo vermelho (1889–1949), veludo vinho (1950–79), lâminas de metal e neon (1980–2009), painel de
    LED (2010–40). O calendário da virada acompanha: folha de parede, relógio de virar, tela do celular.
  - **Opção:** transições completas, rápidas ou desligadas. Nunca bloqueiam nem atrasam a simulação.
- **EXP-13 · Ações no objeto, o mínimo de telas (pedido do dono, 2026-10-16)** — "essas telas assim não devem aparecer e sim ações ao clicar em objetos; a ideia é diminuir ao máximo essas telas":
  - Clicar num objeto abre um cartão pequeno em pixel AO LADO do objeto com as 2–6 ações e os 1–3 números que importam ali (ex.: espelho → aparência; cama → descansar, energia; escrivaninha → dinheiro pessoal). Fazer a ação é ali mesmo.
  - Página antiga inteira dentro do papel deixa de ser o padrão: só abre por "ver tudo ▸" no cartão ou pelo índice da pausa.
  - Informação vira coisa do mundo sempre que der (fama no jornal, saúde no espelho/cama, dinheiro na carteira/cofre).
- **EXP-12 · Tutorial guiado opcional** — interface · proposta aceita pelo dono em 2026-10-16 (sem mocks) · **feito (frente TUT, 2026-10-17; guia = mentor da época; ver DECISOES "31.5 TUT")**:
  - Entrada: "Aprender a jogar" na tela inicial, cenário "Primeiro selo" e chave "Tutorial guiado" na nova run rápida. Partida normal com semente fixa e acontecimentos roteirizados.
  - Foco: tela escurece, só o alvo fica recortado com o contorno "aceso"; guia fala num balão em pixel art; clique/tecla fora do alvo não faz nada ("primeiro aqui"); Esc = pular capítulo / sair.
  - Fazer, não ler: o passo conclui quando a ação é feita. Usa as transições da onda 5.
  - 12 capítulos (~15 min): sede e topo; caixa de entrada; fichário/jornal (contratar); mural/quadro (gravação); mesa de som; revista/quadro branco (lançar); virada do mês; livro-caixa; cidade (show); mundo (viagem); casa; teclas e bolso. Fim com diploma; o guia segue no telefone.
  - Modo dica (acende sem bloquear) para veteranos; capítulo extra curto por carreira. Alvos vêm de objects5/keys5. Guia: mentor da época ou alguém da família Fossati — escolha do dono pendente.
- Testes: robô de jogo e fumaça passam a "clicar no objeto" (ou usar a tecla); goldens iguais.

> **Etapa 2 liberada (dono, 2026-10-16: "podemos fazer o que falta da onda 5"):** frentes NAV (EXP-1, EXP-2), MAPA (EXP-3), PAPEL (EXP-4 + caixa de entrada), ELENCO (EXP-7) e CASA (EXP-5, EXP-6), todas atrás de `exp5.nav` desligado até a aprovação; TRN (EXP-11) e SALAS (EXP-8, salas antigas) já rodando. Regras em `docs/r31/onda5-cabecalho.md` (Etapa 2). Arte da ART5 (galeria `docs/r31/shots/onda5-art-galeria-*.png`: objetos, papéis, caixa de entrada) aprovada pelo dono em 2026-10-16.

## Onda 6 (31.6) · fechamento
> **Decisão do dono (2026-10-16):** ao terminar a onda 4, NÃO começar a próxima. Juntar tudo, gerar a build `Masters_31_onda4.html`
> com tudo, enviar ao dono e esperar os pedidos de ajuste. Depois vem a onda 5 (jogo explorável); o fechamento (antiga onda 5)
> virou onda 6 e fica para o final. Ajustada em 2026-10-16 para cobrir o que entrou na onda 4 e a nova onda 5.
- **FIM-1 · Metas e fim de jogo num motor só** (B.10) — inclui o que entrou depois do plano: carreiras que mudam o mundo
  (CAR/CAR2), sócios e compras (SOC), facções por país (U), resultados e aprendizados (R), família Fossati (só homenagem:
  nunca vira meta de perder). O fim de cada carreira aparece na sede (onda 5), não numa tela solta.
- **FIM-2 · Robôs das 12 carreiras** — primeiros 30 minutos e fim de jogo de cada uma, jogando pela navegação nova
  (objeto ou tecla da onda 5, nunca aba ou lista). Os robôs passam a usar também jabá, compras com antitruste, leilões,
  lotes/casas do mapa (LOTE) e vitrine do mês (VIT), para o balanço medir essas regras de verdade (hoje os robôs não as usam).
- **FIM-3 · Balanço com tudo ligado** — várias sementes e épocas; regra de ≈1× (começar em qualquer época dá resultado
  parecido). Para cada interruptor das ondas 3–4 (`car31.*`, `soc31.*`, `u31.*`, `under31.*`, `gente31.*`, `fam31.*`,
  `w31.*` jabá/antitruste, `bal31.mercy`, vitrine, lotes, `realNames`, `extras31`): medir ligado × desligado, decidir o
  padrão e se continua interruptor (editor) ou vira regra fixa. Trocar os números esperados dos testes de semente uma vez só.
- **FIM-4 · Limpeza** — apagar módulos órfãos: abas antigas e modos lista que a onda 5 tirou (`ui/sys/hubs20.ts` modo lista,
  navegação por abas), telas antigas que as cenas substituíram (lançamento, banco, compra, jabá), restos do atlas de
  equipamentos (`gear21.png` na sede isométrica antiga e na miniatura — ver `docs/r31/art-auditoria.md`), testes temporários.
- **FIM-5 · Suíte verde de verdade** — nenhuma falha "conhecida" sobrando (inclui o desempenho do r14-db, hoje ~2 000 ms/mês
  contra 1 500); testes de fumaça e robô clicando em objetos/teclas; teste adiado não conta como pronto.
- **FIM-6 · Salvar e carregar** — partidas novas sem perder nada, incluindo o estado novo (vitrine, lotes e casas, resultados
  e aprendizados, família, sócios, facções); medir o tamanho do save antes/depois. Saves antigos podem ser descartados.
- **FIM-7 · Desempenho contra a v30** — abrir cena, virar semana/mês (vitrine e praça mudam na virada), vendas por país,
  cidade com quase todo prédio sendo negócio/lote/casa, sede que cresce, salvar; empresa grande e partida longa.
- **FIM-8 · Acessibilidade (PC)** — todas as funções por teclado (teclas da onda 5, configuráveis, lista no "?"); zoom;
  movimento reduzido; nada só por cor; nada só ao passar o mouse (tecla para mostrar o nome de todos os prédios/objetos e as
  teclas na tela). Celular e toque continuam fora, salvo pedido do dono.
- **FIM-9 · Textos, ajuda e editor** — tutorial, ajuda e glossário falando de objetos, portas e teclas (não de abas); o
  pouco texto que sobrou revisado; tudo que é novo registrado no editor (interruptores, lotes, vitrine, cidade da casa Fossati).
- **FIM-10 · Arte final** — passada de consistência em todas as cenas, incluindo os objetos novos da sede (onda 5) e os
  assets interativos (ART2); pendências opcionais da família (olhos verdes, blusa de bolinhas) só se o dono pedir.
- **FIM-11 · Rodada de uso real do dono** — build `Masters_31.html`, fumaça, revisor; ajustes; só então a versão está pronta.
