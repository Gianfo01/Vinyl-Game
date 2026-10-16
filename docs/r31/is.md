# R31 · onda 4 · I (Gente e interiores) + S (Submundo) — resumo e medição

## O que mudou para quem joga

- **Interiores em cena.** Os 12 interiores do Nosso mundo (casa de shows, loja de discos, rádio, estúdio, bar, jornal,
  sala de ensaio, gravadora rival, escritórios, prédio, hotel e loja de instrumentos) viraram cenas da onda 2: pessoas
  **e objetos** clicáveis com dica, rótulos, "mostrar tudo que é clicável", lista acessível e painel rápido no clique
  direito. A ação se resolve no painel embaixo da cena (palco → marcar data; bilheteria; cartaz → quem toca na semana;
  prateleira → seus discos e os mais vendidos; balcão → vitrine; cabine → pedir execução; mesa do diretor → parceria;
  mesa de som → alugar sessão; palquinho/bandas → descobrir talento; balcão do bar → conhecer gente; capa → manchete;
  parede de discos de ouro → catálogo do rival; recepção do hotel → quem está hospedado; parede de instrumentos → a loja
  da onda 3 ali dentro). Prédio seu ganha o ponto "Gestão".
- **Você lá dentro.** O seu personagem aparece em todo interior quando você está na cidade (com marcador); em turnê ou
  gravando fora, a cena avisa onde você está.
- **Gente de verdade.** Dono ≠ funcionário: cada lugar tem dono e equipe com funções próprias (vendedor, técnico,
  bilheteiro, bartender, locutor, recepcionista…), todos pessoas da base. Músicos sem contrato fazem **bico** (a ficha
  mostra os dois lados: "♪ Bartender na casa de shows · toca em X"); quem assina (com você ou um rival), passa a viver de
  música, morre ou é preso larga o emprego e a vaga é preenchida na virada do mês — primeiro por gente que já existe
  (músicos sem contrato, ex-artistas da cidade e do país); sem ninguém, nasce uma pessoa nova que existe de verdade. Na
  gravadora rival, o CEO (ficha do líder) e os artistas dela que estão na cidade. A presença segue a agenda: turnê fora,
  prisão e morte tiram a pessoa do lugar; quem tem data na cidade nesta semana está no cartaz da casa de shows.
- **Seu rastro no mundo.** Seu disco no toca-discos e na prateleira da loja, seu cartaz na porta da casa de shows, sua
  música no ar na rádio, seu artista no ensaio e no estúdio (com selo ★ no objeto).
- **Submundo na cidade.** Delegacia (com cadeia), beco do mercado negro e as fachadas das facções do país da sede
  (restaurante, boate, galpão no porto, cassino, barracão do baile, escritório — pelo tipo, país e época; até 3) ocupam
  prédios da cidade comum. As do país com base em outra cidade (ou de fora com operação aberta no país, pela regra da
  onda 3 U) aparecem como emissário no bar. Polícia pelo calor (viaturas e paradas).
  - **Sala dos fundos** (porta da fachada): chefe e tenentes conhecidos com ficha, a mesa com os pedidos e os envelopes
    (o que você deve e o que te devem) — aceitar, recusar, negociar prazo, pagar, aproximar-se, pedir empréstimo,
    denunciar (as funções do mob29/crime17).
  - **Baile**: com convite aberto, a fachada vira o baile — seu artista no palco, o chefe no camarote — tocar até o fim,
    sair antes ou chamar a imprensa.
  - **Delegacia**: as celas mostram quem está preso agora (seus e do mundo) com o tempo que falta — visitar, pagar
    fiança, advogado —; sua pasta com o detetive do caso, o que a polícia sabe e o calor; no caso indiciado, as saídas de
    sempre (advogado e julgamento, suborno, colaborar).
  - **Mercado negro**: estoque que gira na virada do mês — cópias piratas dos sucessos e equipamento roubado (objeto
    individual com a história) — e a relíquia roubada que já existe (receptador do crime17), com risco de apreensão e
    escândalo; a relíquia leva "mercado negro" na lista de donos.
  - **Mural de ligações** (Crime › Na sua cidade): fotos das facções do país e das de fora já contatadas, fios de guerra,
    laço de rua com artistas, cena/gênero e os seus pedidos, favores e dívidas — cada fio conta a história.

## Arquivos

- Motor: `src/sim/sys/gente31.ts` (vagas, bico, troca na virada do mês, conhecer/descobrir talento), `src/sim/sys/where31.ts`
  (agenda), `src/sim/sys/under31.ts` (submundo), pontes em `src/sim/sys/place27.ts` (`CREW27`, `UNDER27`, tipos `facade`,
  `police`, `market`), fonte `visit31` em `src/sim/scouting.ts`.
- Interface: `src/ui/r31/inside31model.ts` (modelo puro), `src/ui/r31/inside31.ts` (+ `.css`), `src/ui/r31/under31ui.ts`
  (aba Na sua cidade + mural), `src/ui/r31/gente31ui.ts` (linha na ficha), `src/ui/pixel/interior27.ts` (pessoas e
  geometria puras, salas do submundo, grade das celas), `src/ui/sys/place27ui.ts` e `campus18.ts` (o mapa abre a cena).
- Testes: `tests/r31-interiores.test.ts`, `tests/r31-submundo.test.ts`. Capturas: `docs/r31/shots/onda4-is-*.png`
  (`scripts/r31/shots-is.mjs`).
- Editor (regra 10): `gente31.quitFame`, `gente31.bico`, `gente31.month`; `under31.facades`, `under31.copyResale`,
  `under31.restock`, `under31.scene`. Interruptores: `gente31`, `under31`.

## Medição (ligado × desligado)

`npx tsx scripts/r31/measure.ts --jobs 3 --out docs/r31/is --label is` e `… --out docs/r31/is-off --label "is desligado" --sw gente31=false,under31=false`
(4 sementes × 5 eras × 36 meses; tabelas completas em `is.json` / `is-off.json` e `is-off.md`). Linhas sem diferença omitidas.

| Era | Métrica | Ligado | Desligado | Diferença |
|---|---|---:|---:|---:|
| 1900 | Pessoas no mundo | 465.5 | 464.0 | +1.5 |
| 1900 | ms/mês | 251.5 | 254.0 | -2.5 |
| 1955 | Caixa (US$ 2020) | 16,123.0 | 1,009.5 | +15,113.5 |
| 1955 | Patrimônio | 646,609.0 | 710,249.0 | -63,640.0 |
| 1955 | Fama | 17.0 | 16.5 | +0.5 |
| 1955 | Atos | 2.5 | 3.0 | -0.5 |
| 1955 | Receita último ano | 412,682.5 | 434,500.5 | -21,818.0 |
| 1955 | Pessoas no mundo | 1,025.5 | 1,018.5 | +7.0 |
| 1955 | Save JSON (MB) | 6.1 | 6.0 | +0.1 |
| 1955 | ms/mês | 604.0 | 601.0 | +3.0 |
| 1990 | ms/mês | 1,093.0 | 1,107.0 | -14.0 |
| 2012 | ms/mês | 1,817.0 | 1,776.0 | +41.0 |
| 2030 | ms/mês | 2,181.5 | 2,010.5 | +171.0 |

Partidas encerradas: ligado 2, desligado 2

Leitura:
- **1900, 1990, 2012 e 2030: números de jogo idênticos.** O robô não usa o mercado negro nem a fiança, e a troca de vagas
  só cria gente nova quando falta (aqui, quase nunca) — os atos e o caixa não mudam.
- **1955:** as pessoas novas (+7 na mediana) entram nos sistemas que percorrem todas as pessoas e mudam o rumo de uma
  partida do robô (um ato a menos numa semente, caixa +US$ 15 mil e patrimônio −US$ 64 mil na mediana) — efeito de
  segunda ordem, sem regra econômica nova envolvida.
- **Desempenho:** igual dentro do ruído (−14 a +41 ms/mês; 2030 +171 ms/mês com a máquina oscilando — a troca de vagas
  roda uma vez por mês e percorre só os atos da cidade). Save +0,1 MB no máximo.
- Limite: `--sw` desliga depois de criar a partida, então o "desligado" ainda tem as vagas da nova partida; mede-se a troca
  mensal e o mercado negro.
