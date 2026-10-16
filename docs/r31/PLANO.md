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

## Onda 5 (31.5) · fechamento
> **Decisão do dono (2026-10-16):** ao terminar a onda 4, NÃO começar a onda 5. Juntar tudo, gerar a build `Masters_31_onda4.html`
> com tudo, enviar ao dono e esperar os pedidos de ajuste. A onda 5 fica para o final, depois dos ajustes.
- Metas e fim de jogo num motor só; robôs das 12 carreiras; balanço com tudo ligado; salvar/carregar; desempenho contra a
  v30; acessibilidade; regressão completa.
