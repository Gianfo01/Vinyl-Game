# Arte das cenas, do mapa e do campus — passe de estilo (r20)

Alinha as cenas cinemáticas, o campus/marcos e o mapa ao estilo oficial do pacote de equipamentos
(`art/pack-equipamentos-v1/_folha.png`) e dos personagens (`docs/arte-artistas/_sheet.png`), seguindo as regras de
`.claude/skills/masters-artist-sprites/SKILL.md`.

## Inventário

| Arquivo | O que desenha | Mudou? |
|---|---|---|
| `src/ui/pixel/cine18.ts` / `.css` | tocador de storyboards: objetos de cena, efeitos (luz, clima, confete, envelope), cartazes, faixa, plateia e atores sobre o fundo de `places/*` | sim (TS); CSS sem mudança |
| `src/ui/pixel/moment16.ts` | só escolhe local/cena por momento e época (função pura, sem desenho) | não: já varia por era e porte |
| `src/ui/pixel/landmarks19px.ts` | silhuetas dos marcos no horizonte do campus | sim |
| `src/ui/pixel/campus18px.ts` | quarteirões isométricos, prédios por estilo de época, obras, veículos, pedestres, clima, dia/noite, placas | sim |
| `src/ui/map.ts` + bloco `--map-*` de `src/styles.css` | mapa-múndi: fronteiras do ano, blocos, mercados, rotas, cidades, glifos | sim |
| `src/ui/pixel/cenas20.ts` (novo) | utilitários deste passe: rampa de 6 tons, bloco/disco com volume, sombra de contato, luz ambiente, relevo + contorno em `Px` | novo |
| `tools/arte-cenas/` (novo) | bancada visual (Vite) para capturar antes/depois por ano e tema | novo |

`cenas20.ts` porta `ramp()` do `scripts/px.py` da skill (sombra arroxeada → luz quente, tom 5 só em brilho) sem
tocar `px.ts`/`palette.ts`, que são de outra frente.

## Diagnóstico (antes)

- **Contorno**: prédios, objetos de cena, cartazes e marcos não tinham contorno; o mapa usava `#2a1f1a`. O pacote usa
  `#170e12` em tudo.
- **Sombreamento**: caixas e objetos com uma cor chapada (face direita só `-22%` de brilho, sem matiz); sem linha
  interna na quina; sem sombra de contato sob pessoas.
- **Paleta**: céu/horizonte e sombras frios (azul-cinza `#5a6478`, noite `rgba(14,18,52)`, holofote preto puro);
  cores primárias saturadas no confete, troféu, câmeras e cartazes, longe de mogno/latão/vinho/cromado.
- **Iluminação**: nada indicava luz vinda de cima à esquerda (nem faces, nem copas, nem marcadores do mapa).
- **Densidade de detalhe**: objetos de 1–2 cores ao lado dos bonecos e fundos mais detalhados; marcos eram recortes
  de uma cor só.
- **Mapa**: oceano azul frio e terra pálida sem volume; marcadores achatados.

## O que mudou

**Cenas (cine18)**
- Objetos refeitos com volume e contorno: tapete vinho com lado da sombra e franja de latão, cordões de veludo em
  pedestais cromados, câmeras com lente cromada, púlpito de mogno com placa de latão, troféu como gramofone de latão
  com brilho, caixão de mogno envernizado, velas com halo, flores com cabo, guarda-chuvas sombreados, martelo,
  caneta, telão (moldura de mogno até 1960), placar em latão/cromado, mesa envernizada, grade cromada.
- Cartazes da plateia viram papelão com contorno e cabo de mogno; faixa (banner) em placa vinho com filete de latão;
  envelope com contorno e lacre de cera.
- Pessoas: sombra de contato sob plateia e atores (as silhuetas/avatares continuam os de `avatar.ts`; os sprites HD
  de artistas **não** foram integrados). Marcador de destaque em latão.
- Luz ambiente da casa por cima do quadro: calor no alto à esquerda, sombra arroxeada no canto oposto.
- Efeitos: confete na paleta da casa (com dois acentos), holofote escurece com sombra arroxeada, refletores em gel
  quente antes de 1965 e coloridos depois, chuva com tom arroxeado e gotas com brilho, pirotecnia com núcleo quente,
  fumaça com luz.

**Campus**
- Faces das caixas pela rampa: face direita no tom 2 (sombra arroxeada), faixa alta da face esquerda no tom 4,
  aresta frontal do telhado na luz e quina vertical como linha interna escura; vidro das janelas com reflexo (tom 5)
  no canto de cima à esquerda — só vidro é "material brilhante".
- Contorno `#170e12` em todo sprite de prédio; árvores com copa em volume e contorno; pedestres com silhueta escura e
  sombra; veículos com contorno, luz em cima e sombra embaixo; placas com volume.
- Chão, asfalto e calçada mais quentes; céu com luz quente no horizonte; horizonte e marcos em violeta de distância;
  noite arroxeada. A variação por época (estilos 1889→2040, veículos, postes) e estação/clima continua igual.

**Marcos** — cada forma é desenhada num buffer, ganha relevo (borda de cima/esquerda acesa, de baixo/direita na
sombra) e contorno misturado ao corpo (estão longe), e só então é colada; a luz de aviso fica fora do relevo.

**Mapa** — oceano e terra mais quentes (claro e escuro), costa no tom de contorno da casa; a terra projeta uma sombra
arroxeada para baixo/direita; marcadores de cidade viram gemas com sombra, faceta e brilho; placas dos glifos de
transporte e selos com moldura de latão sobre creme. Cores de dados (paleta política, blocos, mercados, rotas) mantêm a
mesma separação de matiz; fronteiras do ano, hachura de colônia, divisas internas e Cortina de Ferro intocadas.

## Restrições respeitadas

- Movimento reduzido: tudo o que foi adicionado é estático ou usa os mesmos ramos `still`/`reduced()` já existentes.
- Temas claro/escuro: o mapa lê as variáveis `--map-*` (nova `--map-shadow` nos dois temas); cenas e campus são
  canvas próprios, como antes.
- Sem mudanças em simulação, saves, textos, `palette.ts`, `px.ts`, `tiles.ts`, `scene.ts`, `places/*`, `sprites.ts`,
  `avatar.ts`, `icons*.ts`, `art.ts`.

## Validação

- `npm ci`, `npm run typecheck`, `npm test`.
- Capturas (Playwright + Chromium em `/opt/pw-browsers`) pela bancada `tools/arte-cenas/index.html?year=…&theme=…`,
  antes/depois em 1935, 1975 e 2030, nos temas claro e escuro: `docs/arte-cenas/{ano}-{tema}-{antes|depois}.png`.
  Cada captura tem seis quadros de cena (tapete, palco com envelope, estádio/teatro, funeral na chuva, tribunal com
  neve, assinatura com holograma), o campus de dia e de noite, a faixa de marcos e o mapa com rota.

## Para depois

- O fundo das cenas vem de `places/*` (de outra frente); quando ele for restilizado, a luz ambiente de `grade20`
  pode ficar mais fraca (parâmetro `k`).
- Integração dos sprites HD de artistas fica com o dono dos sprites.
