# Masters 31 — roteiro local (seu PC) e build

O fluxo padrão roda tudo na nuvem. O PC é reforço opcional.

## Preparar (uma vez)
```bash
git clone https://github.com/Gianfo01/Vinyl-Game.git && cd Vinyl-Game
git checkout claude/friendly-brown-vpsmfl
npm ci
```

## Testes
```bash
npx tsc --noEmit
npx vitest run                    # suíte inteira
npx vitest run tests/r31-*.test.ts   # só os da R31
npm run balance:quick             # balanço rápido em várias sementes
```

## Build de arquivo único (o Masters_XX.html)
```bash
node scripts/r31/build-single.mjs Masters_31_onda0.html
```
Faz `vite build` com tudo embutido e junta JS e CSS no HTML (via `scripts/r31/inline.py`, precisa de Python 3).

## Teste de fumaça (abre a build no Chromium e joga algumas semanas)
```bash
node scripts/r31/smoke.mjs Masters_31_onda0.html
```
Precisa do Playwright (`npm i -D playwright` se não tiver) e de um Chromium. Na nuvem o caminho é
`/opt/pw-browsers/chromium`; no PC o Playwright usa o dele (`npx playwright install chromium`).

## Passagem nuvem ↔ PC
Cada passagem diz: commit exato, comandos, sementes, resultado esperado, arquivos gerados e quem é o próximo.
Um lado por vez no ramo.
