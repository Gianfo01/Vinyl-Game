// R31 onda 4 (N · Extras e X · Nomes e obras reais) — capturas: tela inicial com a dedicatória e o link de créditos,
// créditos, aba Mundo › Extras (2027: filme, ficção, cultura pop), conquistas bloqueadas com nome e como ganhar, e o
// comparador com "Nomes e obras reais" ligado e desligado.
// Uso: npx vite --host 127.0.0.1 --port 5931 &   node scripts/r31/shots-onda4-nx.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5931';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(120000);
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda4-nx-${name}.png` }); console.log('captura', name); };
await shot('abertura');
await p.locator('[data-link="credits31"]').first().click(); await p.waitForTimeout(600);
await shot('creditos');
await p.keyboard.press('Escape');
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(4000);

const box = async (fn, arg) => p.evaluate(async ([src, arg]) => {
  const f = new Function('arg', `return (async () => { ${src} })()`);
  document.querySelectorAll('#nx31').forEach((e) => e.remove());
  const el = await f(arg);
  if (!el) return false;
  const bx = document.createElement('div');
  bx.id = 'nx31';
  bx.setAttribute('style', 'position:fixed;inset:0;overflow:auto;z-index:9999;background:var(--bg,#111);padding:18px');
  bx.appendChild(el);
  document.body.appendChild(bx);
  return true;
}, [fn, arg]);

// Extras em 2027 (filme, bandas de ficção, cultura pop)
await box(`
  const wg = await import('/src/sim/worldgen.ts'); const bot = await import('/src/sim/bot.ts'); const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts'); const st = await import('/src/ui/store.ts');
  const g = wg.createGame(bot.defaultConfig('shots-nx-2026', { startYear: 2026, realNames: true }));
  g.tutorial = { step: 99, done: true, seen: [] };
  for (let i = 0; i < 4; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g; window.__g = g;
  const ui = await import('/src/ui/sys/extras31.ts');
  return ui.extrasTab31(g);
`);
await shot('extras-2027');

// conquistas: bloqueadas com nome e como ganhar; secretas "???"
await box(`
  const ui = await import('/src/ui/ach27.ts');
  return ui.gameAch27(window.__g, new Set());
`);
await shot('conquistas');

// comparador: nomes reais ligados e desligados (só exibição)
for (const on of [true, false]) {
  await box(`
    const wg = await import('/src/sim/worldgen.ts'); const bot = await import('/src/sim/bot.ts');
    const rs = await import('/src/sim/r31/realshow31.ts'); const st = await import('/src/ui/store.ts');
    const g = window.__g65 ?? (window.__g65 = wg.createGame(bot.defaultConfig('shots-nx-1965', { startYear: 1965, realNames: true })));
    st.store.game = g;
    rs.setRealShown31(g, arg);
    document.querySelectorAll('.overlay, .modal-back, dialog').forEach((e) => e.remove());
    const ids = Object.values(g.acts).filter((a) => a.catalogNo && a.fame > 20).sort((a, b) => b.fame - a.fame).slice(0, 3).map((a) => a.id);
    for (const id of ids) g.knowledge[id] = { actId: id, degree: 2, stage: 'monitoring', bias: 0, updatedWeek: g.week, source: 'watch' };
    const cmp = await import('/src/ui/compare.ts');
    cmp.compareActs(g, ids);
    return null;
  `, on);
  await shot(on ? 'nomes-reais-ligado' : 'nomes-reais-desligado');
}
await b.close();
