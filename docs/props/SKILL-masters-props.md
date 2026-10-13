---
name: masters-props
description: Produz props (objetos em pixel art) para o jogo Masters no mesmo padrão dos 98 originais desenhados à mão e compatíveis com os personagens de corpo inteiro — instrumentos, equipamento de estúdio, palco, mídia, escritório, imprensa, prêmios, turnê, ambiente e era neural. Use quando pedirem novos assets/props/objetos/itens para Masters, mais variações dos assets existentes, ou revisão/ajuste de props já gerados.
---

# Props de Masters

Props são ilustrações de objetos em **pixel art, vista 3/4 de cima** (vemos a frente, a tampa e a lateral
direita), fundo transparente. Cada prop existe em duas escalas:

- **detalhe** — a arte na grade nativa (~256 px no lado maior), como os originais.
- **jogo** — a mesma arte reduzida para a densidade dos **personagens de corpo inteiro** (pessoa em pé ≈ 78 px),
  com sombra elíptica no chão. É o que conversa com os personagens em cena (fundo escuro `#231c1f`).

Os props **não são pintados à mão aqui**: cada um é um pequeno programa em `tools/props/defs/*.ts` que usa o kit
`tools/props/kit.ts`. O kit já entrega contorno, chanfro, sombras entre peças, rampas de material e projeção — o
trabalho é **modelar a forma em volumes** e **escolher materiais e detalhes**.

## Antes de começar (sempre)

1. Leia `tools/props/README.md` (API do kit) e os exemplos aprovados em `tools/props/defs/amostra.ts`.
2. Abra as pranchas de referência dos originais: `assets/masters/pranchas/<categoria>_detalhe.png`
   (e `_jogo.png`). Originais individuais, na grade nativa: `tools/props/fonte/NNN_id.png`.
   Se não existirem, rode `npm run props` primeiro.
3. Confira o maior número usado (`assets/masters/manifest.json` ou `grep -h "n: " tools/props/defs/*.ts`) e não
   repita `id` nem objeto que já exista (os originais 001–101 estão em `tools/props/originais-meta.ts`).

## Fluxo por lote

1. **Planeje a lista** (tabela): número, `id` (minúsculas com `_`, ano no fim quando houver versões por era:
   `tv_1980`), nome PT/EN, categoria, era `[ano, ano]` e altura `jogo` (tabela abaixo).
2. **Um arquivo por lote** em `tools/props/defs/<lote>.ts` exportando `PropDef[]`; registre em `defs/index.ts`.
3. Para cada prop: modele (receitas abaixo), renderize, **olhe as duas pranchas**, corrija. Até 3 rodadas por prop:
   ```bash
   npx tsx tools/props/render.ts --only id1,id2 --sheet /tmp/det.png --jogo /tmp/jogo.png
   ```
   Leia as duas imagens com a ferramenta de leitura de imagem e compare com a prancha dos originais da categoria.
4. Passe a **lista de verificação** (abaixo) no lote inteiro.
5. `npx tsc --noEmit -p .` e `npm run props` (regera `assets/masters/`: detalhe, jogo, manifesto e pranchas).
6. Mostre ao usuário as pranchas novas (`assets/masters/pranchas/*`) antes de dar o lote por pronto.

### Para produzir em escala (vários lotes em paralelo)

Divida a lista por categoria em lotes de 10–16 props e dê **um arquivo de defs por agente** (sem dois agentes no
mesmo arquivo; ninguém edita `kit.ts` — se faltar algo no kit, o agente cria um helper local no próprio arquivo e
avisa). Reserve faixas de números por lote (ex.: 110–129, 130–149) para não colidir. Modelo de pedido ao agente:

> Leia `.claude/skills/masters-props/SKILL.md` e siga o fluxo. Seu lote: `tools/props/defs/<lote>.ts`, números
> <faixa>, itens: <tabela n | id | nome | name | cat | era | jogo>. Não edite outros arquivos além do seu e de uma
> linha em `defs/index.ts`. Ao final, devolva o caminho das pranchas `--sheet` e `--jogo` do lote e uma linha por
> prop com o que ficou fraco.

Depois de todos, quem coordena roda `npm run props`, revisa as pranchas por categoria e devolve os fracos.

## Receitas (como dar volume)

Coordenadas em pixels da prancheta (padrão 256×256, `size` muda), y para baixo. A profundidade sobe para a direita
(`KX = 0,55`, `KY = 0,42`): uma caixa de profundidade `d` mostra a tampa com altura `d·0,42` e a lateral com
largura `d·0,55`. **Desenhe de trás para a frente**: corpo → painéis embutidos → botões/detalhes → brilhos.

- **Móvel/aparelho em caixa** → `k.rbox(x, yBase, w, h, d, raio, mat, { front, wall })`. Profundidade entre 30 % e
  60 % da largura (tampa bem visível, como nos originais). Painéis embutidos: `k.rect(...)` com `{ cast: 0 }` ou um
  `rbox` raso (d 2–4) por cima da frente. Cantoneiras: `k.corner(x, y, 11, 'tl'|'tr'|'bl'|'br')`.
- **Forma qualquer com espessura** (corpo de instrumento, fone, placa recortada) → `k.extrude(pontos, d, mat, { front, wall })`.
  Os pontos são o contorno da **frente**; as paredes de cima/direita aparecem sozinhas.
- **Superfície inclinada / volumes 3D de verdade** → use `P(ox, oy, x, y, z)` para projetar pontos 3D e monte faces
  com `k.poly` dentro de um `k.group` (ver o telefone de disco em `amostra.ts`): lateral (l ≈ 0,25), rampa
  (l ≈ 0,6), platô (l ≈ 0,85), e uma linha de brilho na quina.
- **Botões, tambores, rodas, pratos, bolachas** → `k.disc(cx, cy, rx, ry, espessura, mat, { front: { shade: 'sphere' | 'disc' | 'cone' } })`.
- **Cilindro em pé** (pistão, vaso, coluna) → `k.cylV`. **Deitado** (rolo, cano) → `k.cylH`.
- **Hastes, pernas, tripés, alças, cabos, tubos de metal** → `k.tube(pontos, espessura, mat)`.
- **Disco de vinil/CD** → `k.ellipse` com `fn` de sulcos (ver `vitrola_maleta_1960` e `disco_platina`).
- **Telas, LEDs, lâmpadas** → `k.rect` com mat `screen`/`glass` + `k.led(x, y, GLOW.cor)` / `k.glow(...)`.
- **Grades de alto-falante e tecidos** → `tex: 'mesh' | 'grille' | 'fabric'`; madeira `tex: 'wood' | 'woodV'`; couro/tolex `tex: 'leather'`.
- **Papel com texto** → `k.scribble`. Teclas → `k.keys` ou fileiras de `k.disc`. VU → `k.vu`.

Materiais (`M.*`): `wood`, `woodDark`, `woodLight`, `gold`, `brass`, `copper`, `iron`, `black` (carvão quente,
não azul), `steel`, `chrome`, `red`, `velvet`, `cream`, `paper`, `green`, `emerald`, `teal`, `blue`, `navy`,
`purple`, `orange`, `yellow`, `pink`, `leather`, `rubber`, `plastic`, `beige`, `glass`, `screen`, `skin`, `plant`,
`terracotta`, `white`. Nada de cor solta fora das rampas (exceto `GLOW` e linhas de detalhe).

## Altura `jogo` (pessoa em pé = 78 px)

Escala real com exagero nos pequenos para continuarem legíveis:

| Objeto | jogo |
|---|---|
| objetos de mão (celular, fita, CD, contrato, pedal) | 12–18 |
| objetos de mesa (telefone, rádio, máquina de escrever, sampler, troféu) | 18–30 |
| amplificador, cofre, poltrona, caixa, quadro na parede | 30–40 |
| instrumentos em pé no suporte, mesas, bateria, teclados | 40–56 |
| armários, máquinas, refletores em tripé, estantes, harpa | 56–80 |
| veículos | 50–70 (encolhidos de propósito) |

## Lista de verificação (cada prop)

- [ ] **Profundidade**: tampa e lateral direita visíveis em tudo que tem volume; nada parece recortado em papel.
- [ ] **Três luzes**: tampa clara, frente média com gradiente para baixo, lateral escura. Quinas com brilho.
- [ ] **Peças separadas** por contorno/sombra (o kit faz se cada peça for uma primitiva ou `group`).
- [ ] **Acabamento dos originais**: frisos/cantoneiras/parafusos de latão ou cromo, botões com brilho, textura
      discreta (madeira, couro, tela) — nenhuma área grande de um tom só.
- [ ] **Silhueta legível na prancha `--jogo`**: dá para dizer o que é ao lado do boneco de 78 px. Se não der,
      engrosse partes finas (hastes ≥ 4 px no detalhe), aumente contraste ou suba o `jogo`.
- [ ] **Paleta**: só materiais do kit; preto é carvão quente; sombras puxam para o roxo (o kit já faz).
- [ ] **Era** coerente com o objeto e com o jogo (1889–2040); versões por década têm visual da década.
- [ ] Sem pixels soltos, sem peças flutuando, objeto centrado e apoiado na base.

## Armadilhas comuns

- Detalhe desenhado antes do corpo fica escondido: a ordem é sempre de trás para a frente.
- `extrude` com pontos de frente fora de ordem (cruzando) gera paredes erradas: liste o contorno em sequência.
- Para pôr algo **sobre** uma face sem sombra projetada, use `{ cast: 0 }`; para encaixe/recuo, deixe o padrão (2 px).
- Formas finas (cordas, ponteiros) somem na escala de jogo; use `k.line` só para detalhe, nunca para estrutura.
- Não copie formas de marcas reais (logotipos): use frisos, placas e riscos genéricos.

## Estilo de referência dos personagens

Os personagens de corpo inteiro do jogo (Sinatra, Elvis, Hendrix…) têm: pixel grosso (~78 px de altura), contorno
escuro, 3–4 tons por material, luz de cima à esquerda, sombra elíptica escura sob os pés e fundo `#231c1f`. A escala
`jogo` existe para que os props fiquem com essa mesma densidade. Se o usuário fornecer a imagem de referência,
guarde-a como `.claude/skills/masters-props/referencia-personagens.png` e compare as pranchas `--jogo` com ela.
