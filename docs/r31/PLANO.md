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
  fechada, leilão silencioso do mercado negro, apreensão de carga na alfândega como mecânica).

## Onda 5 (31.5) · jogo explorável (pedido do dono, 2026-10-16)
> Entra depois dos ajustes da build `Masters_31_onda4.html`. Objetivo: menos telas soltas e menos texto, no estilo Punch Club —
> cada função é um lugar, um objeto, uma porta ou uma pessoa. As telas atuais ficam por baixo (a camada nova é de navegação);
> números do jogo não mudam. Foco no PC (celular fica para depois).
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
- Testes: robô de jogo e fumaça passam a "clicar no objeto" (ou usar a tecla); goldens iguais.

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
