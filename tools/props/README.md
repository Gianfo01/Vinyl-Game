# Props de Masters

Ilustrações de objetos em pixel art (vista 3/4 de cima, fundo transparente) para o jogo.
Há dois conjuntos, no mesmo padrão visual e na mesma numeração:

- **001–101 — originais**: desenhados à mão (enviados pelo autor; 061–063 não vieram). Ficam em
  `tools/props/fonte/`, já reduzidos para a grade nativa.
- **102 em diante — gerados**: desenhados por código em `tools/props/defs/*.ts` com o kit
  `tools/props/kit.ts`, que imita o acabamento dos originais.

## Saída (`assets/masters/`)

| Pasta | Conteúdo |
|---|---|
| `detalhe/` | Todos os props na **grade nativa** da arte (1 pixel de arte = 1 pixel; ~256 px no lado maior). |
| `jogo/` | Os mesmos na **densidade dos personagens de corpo inteiro** (pessoa em pé ≈ 78 px), com sombra no chão. |
| `manifest.json` | número, id, arquivo, nome PT/EN, categoria, era, origem (original/gerado) e tamanhos. |
| `pranchas/` | Pranchas de contato por categoria (`_detalhe` em fundo claro, `_jogo` em fundo escuro). |

Amplie sempre por vizinho mais próximo. Os originais enviados (≈1 254 px, arte ~5×) foram reduzidos para a
grade nativa em `tools/props/fonte/` por `tools/props/importar.ts`; é dessa pasta que o build lê.

## Comandos

```bash
npm run props                      # gera tudo: detalhe/, jogo/, manifest.json e pranchas/
npx tsx tools/props/render.ts --only violino,tuba --sheet /tmp/det.png --jogo /tmp/jogo.png   # iterar em alguns
npx tsx tools/props/render.ts --cat instrumento --sheet /tmp/det.png
npx tsx tools/props/importar.ts <pasta-com-png-originais>   # reimportar originais grandes
```

O passo a passo de produção (receitas, alturas `jogo`, lista de verificação e como dividir em lotes paralelos)
está na skill `.claude/skills/masters-props/SKILL.md`.

## Padrão visual (o que o kit faz por você)

- **Contorno externo** de 1 px em `INK` (#0a0a1c, azul-marinho quase preto) em volta da silhueta (`finish`).
- **Contorno interno por peça**: cada primitiva (ou `k.group`) vira uma peça com contorno escuro
  do próprio material e **chanfro automático** (1 px mais claro em cima/esquerda, mais escuro embaixo/direita).
- **Luz** de cima à esquerda; tampas (`top`) claras, frentes médias, laterais direitas escuras.
- **Rampas de material** (`M.*`) com 6–8 tons tiradas dos originais: madeira, latão/ouro,
  ferro, cromo, veludo, creme, papel, verde, petróleo, couro, vidro, tela…
- **Pontilhado** só na faixa de transição entre dois tons (nada de ruído aleatório).
- **Projeção oblíqua**: profundidade sobe para a direita (`KX = 0,55`, `KY = 0,42`).

## API do kit (resumo)

Coordenadas em pixels nativos da prancheta (padrão 256×256; `size` muda), x → direita, y → baixo.

- `k.box(x, y, w, h, d, mat, { tex, front, top, side, hideTop })` — caixa com canto frontal inferior
  esquerdo em (x, y). Devolve `{ fx, fy, fw, fh, dx, dy }` (retângulo da frente e deslocamento da profundidade).
- `k.rect(x, y, w, h, style)` / `k.quad(O, A, B, style)` / `k.poly(pts, style)` — faces planas.
  `style = { mat, l, grad, gradX, tex, radius, fn }`; `l` é a luz 0..1; `fn(u, v, s, t, x, y)` devolve luz ou `{ col }`.
- `k.ellipse(cx, cy, rx, ry, { mat, l, shade: 'flat'|'sphere'|'cone'|'disc' })`, `k.ring(...)`.
- `k.cylV(cx, baseY, rx, h, mat, { e, top })` — cilindro em pé (tampa elíptica).
- `k.cylH(x0, x1, cy, ry, mat)` — cilindro deitado.
- `k.tube(pontos, espessura, mat)` — tubo/haste/cabo sombreado ao longo de uma poligonal.
- Detalhes: `knob`, `screw`, `led`, `glow`, `vu`, `keys`, `scribble`, `grille`, `speaker`, `line`, `px`, `fill`.
- `k.group(() => { … })` junta várias primitivas numa peça só (um contorno em volta do conjunto).
- Texturas (`tex`): `wood`, `woodV`, `brushed`, `grille`, `mesh`, `fabric`, `leather`, `noise`, `stripes`.

## Como adicionar um prop

1. Escolha o próximo número livre e um `id` em minúsculas com `_` (como os originais: `violino`, `tv_1980`).
2. Escreva a entrada em um arquivo de `tools/props/defs/` (ou crie um e registre em `defs/index.ts`).
3. Rode `npx tsx tools/props/render.ts --only <id> --sheet /tmp/x.png`, compare com os originais e ajuste.
4. Rode `npm run props` para regenerar as pastas e o manifesto.
