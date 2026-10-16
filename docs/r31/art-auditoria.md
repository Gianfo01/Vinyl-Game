# R31 · onda 4 (ART) — auditoria de arte das cenas de interiores, submundo e sede

Pedido do dono: nas cenas de interiores e submundo alguns assets estão num estilo diferente do resto — o exemplo é a
**bateria no palco da casa de shows**, que destoa do pixel art do jogo. Alvo: todos os assets dessas cenas no estilo
padrão (vista lateral/3/4, luz de cima à esquerda, contorno INK `#170e12`, rampas de 6 tons de `lv`, coordenadas
inteiras, escala dos bonecos de 34 px — `docs/arte29-consistencia.md`, skill `masters-artist-sprites`).

Capturas **antes**: `docs/r31/shots/onda4-is-*.png` (e `onda2-K-epoca-estudio-1975.png` para a sala Estúdio).
Capturas **depois**: `docs/r31/shots/onda4-art-*.png`; lado a lado: `onda4-art-*-lado-a-lado.png`.
Como refazer: `npx vite --host 127.0.0.1 --port 5871 &`, `SHOT_PREFIX=onda4-art- node scripts/r31/shots-is.mjs docs/r31/shots 5871`,
`node scripts/r31/shots-art.mjs docs/r31/shots 5871` e `python3 scripts/r31/art-sidebyside.py`.

## Cenas abertas

Casa de shows, bar, estúdio, loja de discos, loja de instrumentos, rádio, hotel, gravadora rival, fachada, sala dos
fundos, baile, delegacia, mercado negro, mural de ligações, submundo na cidade; salas da sede (salas31: Estúdio,
Elenco, Equipe, Catálogo, Talentos, Troféus, Reunião); cenas scene31*/mech31 (mesa do mês, negociação, contratação,
renovação); ilustrações das páginas (art27/cenas29) onde o mesmo objeto aparece.

## O que destoava (e foi corrigido)

| # | Objeto | Onde aparecia | Problema | Correção |
|---|--------|---------------|----------|----------|
| 1 | **Bateria** | palco da casa de shows, estúdio da cidade, loja de instrumentos, sala de ensaio, sala Estúdio da sede (salas31), corte da sede (hqpx27) | sprite do atlas do "pacote de equipamentos" (`src/assets/gear21.png`): arte em alta resolução **reduzida** — meio-tons borrados, paleta própria (vermelhos/dourados saturados), sem a rampa de 6 tons, contorno irregular, luz não vinha da esquerda | redesenhada pixel a pixel em `drumKit31` (`src/ui/pixel/stage31px.ts`): bumbo de frente com pele em 3 tons (luz em cima à esquerda), garras do aro, faixa com a marca; caixa, dois tons, surdo como cilindros (aro cromado, casco em rampa, fio de luz, canoplas); chimbal e prato de latão com luz/sombra; estantes em 2 tons. Casco pela época (perolado < 1960, cor de destaque < 1990, preto depois). Contorno INK pela camada da cena. |
| 2 | **Amplificador** (grande) | casa de shows, estúdio, sala de ensaio, sala Estúdio da sede | mesmo atlas reduzido (caixa marrom borrada, tela sem trama) | `amp31`: tweed listrado (< 1965) ou tolex, alça, painel com botões, tela de pano em trama fina com o cone adivinhado, plaquinha, cantoneiras; luz em cima/esquerda, sombra embaixo/direita. |
| 3 | **Bateria/amplificador/caixa das ilustrações** (art27kit: páginas, cena de fim de banda) | outra bateria, menor que os bonecos (≈ 22×16 ao lado de bonecos de 34 px) — o mesmo objeto desenhado em dois lugares | as ilustrações chamam a mesma fonte (`drumKit31`/`amp31`/`speaker31`) com a tonalização da época (`k.c`) — escala dos bonecos e um só desenho. |
| 4 | **Plateia** (casa de shows, baile) | retângulos chapados (`ctx.fillRect`) direto no canvas, sem contorno, sem volume, cabeça 6×6 quadrada | `crowd31`: gente de costas na largura de um boneco, ombros arredondados pegando a luz do palco, borda esquerda clara/direita na sombra, vinco das costas, cabeça 8×8 com cabelo e brilho, orelhas, braços para cima; camada contornada com INK. Altura limitada para a banda no palco continuar à vista. |
| 5 | **Grade das celas** (delegacia) | barras de 1 px chapadas (`ctx.fillRect`), sem luz nem sombra | `bars31`: barra com fio de luz à esquerda e lado na sombra, trilhos e travessa com relevo, fechadura; cela com juntas do bloco e catre com cobertor e travesseiro. |
| 6 | **Caixas de som do baile/boate** | bloco preto com dois discos chapados | `speaker31` (fonte única com as ilustrações): gabinete com relevo, cones com borda de espuma, sombreados e cúpula, corneta. |
| 7 | **Cofre** (sala dos fundos) | bloco cinza com um disco | porta embutida com relevo, dobradiças, segredo sombreado com marca, manopla de 3 raios, pés. |
| 8 | **Caixotes** (galpão, mercado negro) | blocos com uma linha | tábuas com fio de luz, sarrafos nas pontas, estêncil. |
| 9 | **Roleta** (cassino) | bloco verde e duas elipses | mesa com borda de madeira e feltro, roda com casas vermelhas/pretas e cubo de latão, pilhas de fichas. |
| 10 | **Porta dos fundos** | dois desenhos diferentes da mesma porta (interior27: retângulo liso; salas31px: porta com almofadas) | uma só `prim27.door` (batente, duas almofadas com luz embaixo, maçaneta de latão; papel com horário na sala Estúdio). |
| 11 | **Mural de ligações** (fotos dos chefes, artistas e você) | todas as fotos iguais: círculo bege sobre retângulo preto (não é o boneco do jogo); cortiça em padrão de módulo repetido; moldura chapada | foto com o **retrato do boneco** (`portraitPx`, o mesmo das fichas) — chefe, primeiro integrante, você; sépia antes de 1960; cena = disco; polaroide com relevo e contorno INK; cortiça com grão determinístico (`noise`) em 3 tons e sombra da moldura; moldura de madeira com luz/sombra; fio com sombra. |

Uma fonte por objeto: o atlas deixou de ser lido pelas cenas (`gearPx` removido de `gear21.ts`, sem uso); bateria,
amplificador, caixa de som e porta têm um desenho só.

## Conferido e já no padrão (sem mudança)

Prateleiras, garrafas, balcão, caixotes de discos, toca-discos, cabine e mesa de som, fita de rolo, espuma, piano,
guitarras penduradas, mesas e cadeiras, sofá, TV, planta, janela, quadro de cortiça, arquivo, discos de ouro, cartaz,
letreiro, luzes e moldura do corte (hqpx27/interior27, contorno pela camada de adereços); bonecos (avatarSprite);
salas da sede (salas31px) além da bateria/amplificador/porta; cenas scene31/mech31 (mesa, negociação, contratação,
renovação — pintadas por `paintTable27`/`paintRoom31` com o mesmo kit); fachada e mapa da cidade.

## Fora destas cenas (registrado, não mexido)

- Sede isométrica antiga (`src/ui/hq.ts` → `sprites.ts`/`furniture`) e a miniatura da tabela de equipamentos
  (`equipmentThumb`, `src/ui/panels/misc.ts`) ainda desenham com o atlas `gear21.png` (outra projeção, isométrica);
  converter exige desenhar cada peça na vista isométrica — fica para uma rodada própria.

## Teste

`tests/r31-art.test.ts`: os adereços novos são opacos ou vazios (sem meio-tom de antialiasing), com poucas cores e
contorno INK, determinísticos, na escala dos bonecos (`AV_H`), e nenhuma cena (sede em corte, interiores, salas,
ilustrações, mural, cenas mech) importa o atlas.
