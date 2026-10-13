# R29 — Arte consistente

Pedido do autor (print da sede "SELO AGULHA" na garagem, à noite): *"algumas artes não estão consistentes com as
outras, verifique em todos os lugares, inclusive cutscenes, e ajuste isso (veja a casa e o carro como exemplo)"*.

A casa da família e a van da garagem eram preenchimentos chapados, sem contorno, sem sombra e com formas "de vetor",
ao lado de móveis e bonecos com contorno INK de 1 px, rampas de tom e textura. A causa: em `hqpx27.paint27` a mobília
é pintada numa camada própria e contornada (`q.outline(INK)`), mas a casa, a rua, os vizinhos, o telhado etc. iam
direto no buffer de fundo, onde o contorno nunca acontece. O mesmo padrão (objeto pintado em cima de um fundo opaco,
logo sem borda para o `outline` achar) se repetia nas ilustrações das páginas, nas cenas animadas, nos veículos e
fachadas do r29, nas cenas de criação e no mapa da cidade.

Não é troca de estilo: o alvo é o pixel art que já existe (o HD foi revertido antes e continua fora).

## Regras do estilo (o que foi imposto)

1. **Contorno INK de 1 px na silhueta** de todo objeto em primeiro/segundo plano (`#170e12`, o `INK` do `px.ts`).
   Céus, horizontes distantes, paredes, pisos, luzes e véus translúcidos **não** ganham contorno.
2. **Volume em 2–3 tons pela rampa do estilo** (`lv`/`tint`): borda de cima e da esquerda um tom acima (luz),
   de baixo e da direita um tom abaixo (sombra arroxeada). Material brilhante pode usar o tom 5 (reflexo).
3. **Luz de cima à esquerda** em tudo (fio de luz em cima das fiadas, telhado: água esquerda clara e direita escura,
   aresta esquerda dos prédios clara e direita em meia-sombra, calota com brilho no canto de cima à esquerda).
4. **Coordenadas inteiras e nada de antialiasing**: polígonos e elipses no `<canvas>` são varridos por linha com
   `fillRect` inteiro (`ctxPoly`/`ctxEllipse`), não com `beginPath()/fill()`.
5. **Escala inteira**: sprites e quadros são ampliados 1×, 2×, 3× (vizinho mais próximo, `imageSmoothingEnabled=false`);
   nada de 1,25× / 1,6× nem de `width: 100%` que deixa pixels de larguras diferentes (`fitIntPx`).
6. **Textura no lugar de chapado**: tábuas/tijolo/siding, telhas em fiadas, moldura + peitoril + cortina nas janelas,
   vidro com reflexo diagonal, pneu em 2 tons, ferro com fio de luz.
7. **Determinismo**: nada de aleatoriedade nova; as texturas usam `noise(x, y, semente)` ou o rng local do pintor.
   Simulação (`src/sim/**`) intocada.

## Ferramentas novas (src/ui/pixel/px.ts)

- `inked(dst, draw, ink, { relief })` — reescrito: camada reaproveitada (pool) e contorno só na caixa usada (mesmo
  resultado de antes, bem mais barato — dá para contornar cada objeto de uma cena animada). Novo `relief`: volume pela
  silhueta. Só pixels quase opacos (alfa > 150) formam a silhueta; o contorno só ocupa pixels vazios — cones de luz,
  halos e vidros não ganham borda.
- `fitIntPx(canvas, w, { max, host, on })` — mantém o canvas em escala inteira da largura disponível.
- `ctxPoly(ctx, pts)` / `ctxEllipse(ctx, cx, cy, rx, ry)` — polígono/elipse sem antialiasing no `<canvas>`.
- `ink27(k, draw, relief = true)` (art27kit) — objeto das ilustrações/cenas numa camada com relevo e contorno; halos e
  cones pedidos lá dentro ficam para depois (`k.defer`) e são pintados por cima, fora da silhueta.

## O que foi corrigido (arquivo: função — antes → depois)

### Sede em corte (`src/ui/ps/hqpx27.ts`)
- `house` — casa da família: retângulo chapado com listras, triângulo marrom e janelas amarelas → camada com contorno
  INK; revestimento por época (tábuas até 1959, tijolo 1960–89, siding de vinil depois) com fio de luz por fiada e
  lado direito em meia-sombra; sombra do beiral; soco de pedra; telhado de telhas em fiadas (água esquerda clara,
  direita escura, testeira); chaminé de tijolo (antes de 1990), antena de TV (1960–89), calha e antena parabólica
  (1990+); janelas com moldura, peitoril, cortinas, cruz, reflexo e luz quente vazando na parede; venezianas até 1989;
  porta almofadada com bandeira, maçaneta de latão, degrau e luz de varanda; caixa de correio; arbusto.
- `van` — elipse + retângulos chapados → perfil desenhado por linhas (furgão arredondado / Kombi saia-e-blusa com "V" /
  minivan de capô inclinado), lataria em 3 tons (teto na luz, flanco, saia na sombra), friso, vidros com moldura e
  reflexo diagonal, para-brisa, vinco da porta e maçaneta, para-choques cromados, farol e lanterna, caixa de roda
  escura, pneu em 2 tons e calota com brilho. (A camada da mobília já dava o contorno.)
- `neighbours` — blocos chapados com janelas 4×6 → contorno INK, cornija com luz/sombra, aresta clara/escura, fiadas
  (antes de 1960), janelas com moldura, peitoril e vidro aceso em degradê (ou apagado com reflexo, às vezes alguém na
  janela), porta com bandeira acesa no térreo. Continuam mais escuros que a sede (plano de trás).
- `street` (postes) — linha de 1 px e retângulo → poste em 2 tons com base, braço e luminária com vidro aceso, lampião
  a gás antes de 1940, contorno INK; halo do bulbo por cima.
- `shell` — paredes externas ganham aresta esquerda clara / direita em meia-sombra e contorno INK na silhueta;
  platibanda com rufo, sombra e contorno; telhado da garagem (polígono chapado com riscos fracionários) → fiadas com
  fio de luz, ondas, cumeeira clara, beiral escuro e contorno; caixa-d'água (retângulos) → aduelas com luz, aros de
  ferro, tampa em 2 águas, pés com travessa, contorno; escada de incêndio (linhas soltas) → ferro em 2 tons, grade
  com balaústres, degraus, contorno.
- `crown27` (coroa da torre/campus) → contorno INK (o chanfro do vidro contemporâneo agora recorta para transparente,
  em vez de pintar a cor do céu por cima).
- `sign` (letreiros da sede e dos interiores) → placa com contorno INK.
- Calhambeque x van na garagem: o ovo estacionava por cima da van (não cabem os dois na vaga) → com o calhambeque
  ativo, ele substitui a van (`Plan27.garageTaken`, marcado por `drawHqCutaway27` quando há objeto na vaga 'garage').
- Os interiores da cidade (`interior27.ts`) reaproveitam `prim27` (rua, vizinhos, postes, placa) e ficam iguais.

### Ovos da sede e do mapa (`src/ui/sys/eggs27.ts`)
- `drawJalopy` (calhambeque) e `drawBusker` (músico das 3h) — `fillRect` chapado direto no contexto → sprite Px com
  rampas, luz de cima à esquerda e contorno INK, em cache (mesma assinatura, mesma posição).

### Mapa da cidade (`src/ui/pixel/campus18px.ts`)
- `vehicle`, `tourBus` — retângulos chapados → contorno INK (como prédios e árvores do mapa), fio de luz no teto, saia
  em sombra.
- `ambient 'flood'` e `worldCanvas18` (chão em losango) — `beginPath/fill` com antialiasing → `ctxPoly`.

### Ilustrações das páginas e cenas antigas (`src/ui/ps/art27kit.ts`, `src/ui/ps/art27.ts`)
- Kit: `speaker, micStand, drums, amp, guitar, piano, desk, chair, lampDesk, phone, typewriter, computer, tvSet, radio,
  jukebox, shelf, poster, windowPane, trophy, candle, console27, recLight, tourVehicle, policeCar, pressCam, press,
  stackDiscs` — chapados sem contorno → `ink27` (relevo + contorno; luzes por cima). `crowd` → contorno na silhueta da
  plateia (sem relevo: continua em contraluz).
- Pintores (`P.*` e `paintCrime`): 50 objetos que eram pintados em linha com `R()` ganharam `ink27`: palco e mesas dos
  olheiros (anr), esteira, caixotes e celular gigante (releases), palco (shows), teatro da turnê com marquise e porta
  (tour), tendas, palco/treliça/telão e faixa (festival), quadro das paradas (charts), rotativa, fax, telão e manchete
  (press), cofre, placar, arquivo e calendário (finance), quadro de avisos (team), fachadas do Tin Pan Alley, quadro de
  royalties e partituras voando (rights), palco e prateleiras (awards), colchão, sofás (you, family), porta-retratos,
  mesa de jantar, brinquedo (family), balcão, garrafas, mesa do DJ, globo (night), papel do contrato (signing), fachada
  e porta, repórteres e van da TV (door), moldura do memorial, porta (leave), mesa de jogo (crime).

### Cenas animadas r29 (`src/ui/pixel/cenas29.ts`)
- `car29` — retângulos chapados → camada com relevo e contorno, vinco, reflexo no vidro, calota com brilho (halo do
  farol por cima). `sil` (silhuetas: juiz, galeria, família) → contorno. Bandeiras do tribunal, porta e janelas da sede
  nova, aparador e calendário (tech), palco e banquinho (retire), toldo, balcão e poste do camelô (bootleg), mesa de
  som (payola), guitarra largada (split), porta acesa (poach), case novo (join), mesa do restaurante (steal),
  calendários (vow_kept, vow_broken, era) → `ink27`.
- Os quadros de todas as cenas passam pelo mesmo `paintCut29`/`paintArt27`, então o tocador (`cut27.ts`), o álbum e a
  folha de contato veem o mesmo resultado.

### Storyboards (`src/ui/pixel/cine18.ts`)
- Holograma ampliado 1,25× / 1,6× (pixels desiguais) → 1× no palco holográfico e 2× nos outros lugares.
- Halo/sombra do holograma, tapete vermelho, vidro e taça do troféu feitos com `ellipse/arc/fill` (bordas suavizadas)
  → `ctxEllipse`, `ctxPoly` e linhas inteiras.

### Arte r29 (`things29.ts`, `places29.ts`)
- `vehiclePx29` (van/ônibus/avião) — o fundo (céu e chão) enchia o quadro, então o `p.outline` final não achava borda
  e o veículo saía chapado → veículo em camada com relevo e contorno INK; calota com brilho.
- `placePx29` (fachadas 32×32) — mesmo problema (o céu enchia o quadro) → o céu vai para o fundo e a fachada ganha
  contorno INK na silhueta.

### Cenas de criação (`src/ui/act27/scene27.ts`)
- `paintTable27` (violão, mesa, papéis, cartas) e `paintStudio27` (microfone, amplificador, bateria) → camada com
  relevo e contorno INK.

### Escala inteira (`scenes14.ts/.css`, `places/view.ts`, `sys/scenes.css`)
- `scene14` (cartão/faixa) e `placeView` (cenas antigas e `view17`) usavam `width: 100%` (escala fracionária) →
  `fitIntPx` (1×/2×/3×; abaixo de 1× cai para 100%); os pontos de interesse do `scene14` acompanham o tamanho real do
  canvas; larguras máximas ajustadas para caber 2× (faixa) e 3× (cartão) exatos.

## O que ficou de fora (e por quê)

- **Céu, horizonte e marcos ao fundo da sede** (`sky`, `skyline`, `landmarks27`) e **horizontes das cenas**
  (`skyline` do kit): são plano de fundo, propositalmente chapados e escuros (perspectiva atmosférica). Os marcos já
  tinham contorno escuro translúcido.
- **Bonecos de 2 px do mapa** (`person` em `campus18px`) e **postes de 1 px do mapa**: contorno dobraria a largura e
  transformaria multidões em borrões; à escala do mapa leem como "gente ao longe".
- **Paredes, pisos, cortinas e telões de fundo** das ilustrações: são planos de cenário, como as paredes da sede.
- **Ícones e cartões r29** (insígnias, papéis, capas, logos, relíquias, pessoas): já seguiam o estilo (contorno
  `OUT28`, `bevel`); conferidos nas folhas e mantidos.
- **Destaques de seleção no mapa** (`strokeStyle` do lote/prédio escolhido): é interface (piscante), não arte.
- `src/ui/map.ts` e `src/ui/hq.ts` (mapa-múndi vetorial e a sede antiga, fora das telas atuais) não foram mexidos.
- `cenas20.vdisc20/ground20` (elipses com antialiasing) não têm mais quem chame — ficaram como estavam.

## Como conferir

- Folhas de contato: `docs/shots29arte/antes/*.png` e `docs/shots29arte/depois/*.png` (mesmos nomes):
  sede em 6 cascas × 6 épocas (`hq-*`), garagem ampliada com casa/van/calhambeque (`hqzoom`), mapa da cidade dia/noite
  (`city`), interiores (`interiors`), lugares animados (`places`), cenas14 (`scenes14`), ilustrações das páginas
  (`art27`), cenas de criação (`scene27`), cenas animadas novas e antigas (`cut-new`, `cut-old`) e as folhas da arte
  r29 (`a29-*`).
- Gerar de novo: `npx vite --port 5299` na raiz, `node scripts/shots29arte.mjs <pasta> [partes]` e
  `python3 scripts/pngq29.py <pasta> docs/shots29arte/<antes|depois>` (PNG em paleta). O harness novo é
  `tools/arte29c/` (`?part=hq-garage|…|hqzoom|city|interiors|places|scenes14|art27|scene27`); as partes `a29-*` e
  `cut-*` usam `tools/artsheet29` e `tools/cutsheet29`.
