Você é um agente da Onda 5 (31.5 · jogo explorável) do Masters 31 (TypeScript/Vite, sessão própria na nuvem, ramo de trabalho criado a partir de `claude/friendly-brown-vpsmfl`). Faça `git merge origin/claude/friendly-brown-vpsmfl` no início e de novo antes de terminar.

Leia primeiro:
- `docs/r31/BRIEFING.md`: regras duras — determinismo, explorar não muda o mundo, fontes únicas, textos bilíngues, registro no editor.
- `docs/r31/DECISOES.md`.
- A seção "Onda 5" de `docs/r31/PLANO.md` (EXP-1 a EXP-10, padrão visual aprovado, lista de polimento).
- `docs/r31/onda5-mapa.md`: o mapa de todas as telas, caixa de entrada por época, botões de viagem, artistas e agenda.
- Os mocks APROVADOS pelo dono em `docs/r31/mocks/onda5/` (`onda5-mock-*.png` e os `.html` que os geram). Eles são o padrão visual de TODAS as telas.

Momento: a onda 4 ainda tem sessões mexendo na interface (VIT vitrine, LOTE prédios do mapa, POL acabamento, AMOR namoro). Por isso esta etapa da onda 5:
- só cria arquivos novos ou mexe em pontos mínimos e bem delimitados;
- não remove menus, abas ou telas antigas;
- deixa tudo novo atrás de um interruptor `exp5.*` em `src/sim/r31/switches.ts`, registrado no editor e DESLIGADO por padrão, a não ser que o seu pedido diga outra coisa.

Arte:
- Só o pixel art do jogo, desenhado por código como o resto: `src/ui/pixel/px.ts` (Px, volume, inked…), `avatarSprite`/`randomLook` (`avatar.ts`), `stage31px.ts`, `props31.ts`, `renderSky27` (`skyline27.ts`), `icons.ts`/`icons31.ts`, `font.ts`; estilo da sede e das salas (`src/ui/ps/hq*`, `src/ui/r31/salas31px.ts`).
- Nada de emoji (use `emo31`/ícones).
- Regra de acabamento: nada flutuando, nenhum placeholder, objetos que parecem o que são, rótulos sem sobrepor nem cortar.

Testes:
- Rode os testes afetados, os goldens (r27-p2a, r27-p2b, r27-m3, r16-playbot) e `npx tsc --noEmit`.
- Rode a suíte inteira uma vez no fim (`npx vitest run --maxWorkers=3`). Falhas que também acontecem no ramo principal não são suas; diga quais são.
- Os goldens não devem mudar: esta etapa é de interface e arte.

Capturas:
- Playwright em `docs/r31/shots/onda5-<id>-*.png` (modelo `scripts/shots29demo.mjs`, `--host 127.0.0.1`, porta livre 5800–5999; encerre o vite).
- Se o vite der ENOSPC de watchers, rode com uma config sem watch (`server: { watch: null, hmr: false }`).

Commits terminando com:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_011XM6gk992aeaeJ7tjK8svn

Ao terminar: push no seu ramo e relatório final curto em português no chat, com:
- o que mudou;
- capturas;
- testes da suíte inteira;
- hash final.

Não abra PR e não notifique a sessão da wiki.
