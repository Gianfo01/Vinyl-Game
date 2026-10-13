# Personagens reais — sprites no estilo Masters

3.130 personagens: as 3.125 pessoas reais do jogo (`REAL_ALL` + os 100 atos-arquétipo do catálogo) mais 5 homônimos
separados (ex.: `Roger Taylor (Queen)` × `Roger Taylor (Duran Duran)`).

- `corpo/<slug>.png`: corpo inteiro **96×152** nativo (personagem com ~125 px, virado 3/4 para a esquerda,
  luz de cima à esquerda). Exibir sempre em escala inteira com `image-rendering: pixelated` (2× = 192×304).
- `busto/<slug>.png`: retrato **64×64** recortado do mesmo desenho (substituto do retrato 32×32 de `portraitPx`).
- `index.json`: `{nome: {ano, arquivo, conf, ref, papel, genero, atos}}`. `ano` = fase retratada; `conf` = confiança
  da semelhança (alta / media / baixa); `ref` = o que foi retratado.
- `_mosaico.png`: todos os bustos numa imagem (prévia).

Gerado pela skill `.claude/skills/masters-artist-sprites/` a partir das fichas em `specs/lotes/lote_NN.jsonl`:
`python3 scripts/export.py specs/lotes/lote_??.jsonl --out ../../../art/personagens` (≈1 min).
Para corrigir alguém: edite a linha dele no lote e exporte de novo.

No jogo (r27 CHAR): `npm run people27` empacota tudo em `src/assets/people27/` (folhas WebP sem perdas + índice) e
`src/ui/pixel/people27.ts` casa o `name` da pessoa (modo nomes reais) com o índice; homônimos pelo ato.
Depois de exportar de novo, rode `npm run people27`.
