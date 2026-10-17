# REDES33 — feed de redes sociais e Jornal reformulado

Interruptor `exp33.redes` (ligado). Decisões em `docs/r31/DECISOES.md`.

- Sim: `src/sim/r33/redes33.ts` (feed, ações, hack, viral, live), `frases33.ts` + `frases33data.ts` + `frases33tone.ts` (motor de frases), `jornal33.ts` (seções, publicações por época, classificados, cartas).
- UI: `src/ui/r33/redes33ui.ts` (Jornal, Redes, cartões), `redes33px.ts` (ícone, cabeçalho, miniaturas em Px), `redes33.css`, `redes33phone.ts` (registro no celular/PC).
- Registro do app para a casca: `redesApp33` / `registerRedesApp33` (genérico) e `redes33phone.ts` (liga em `registerPhoneApp33`/`registerPcApp33`).
- Prints: `docs/r33/redes/` (`node scripts/r33/shots-redes.mjs`, com `npx vite --port 5893`).
- Teste: `tests/r33-redes.test.ts`.
