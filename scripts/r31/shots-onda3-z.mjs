// R31 onda 3 (Z · Família e base nova) — capturas da aba Mundo › Família Fossati: a família na época do início, depois
// do almoço da Lucia e numa partida de 2030 (Sonia empresária, escola de idiomas da Antonella).
// Uso: npx vite --host 127.0.0.1 --port 5893 &   node scripts/r31/shots-onda3-z.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5893';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(120000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 3; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  return { year: g.year };
});
console.log('jogo', JSON.stringify(info));
const show = async (mode) => p.evaluate(async (mode) => {
  const ui = await import('/src/ui/sys/fossati31.ts');
  const fam = await import('/src/sim/sys/fossati31.ts');
  let g = window.__g;
  if (mode === 'lunch') fam.luciaLunch31(g);
  if (mode === '2030') {
    const wg = await import('/src/sim/worldgen.ts');
    const bot = await import('/src/sim/bot.ts');
    g = wg.createGame(bot.defaultConfig('shots-z-2030', { startYear: 2030, scenario: 'established', realNames: true }));
    g.player.cash += 1e9;
    const a = (await import('/src/sim/util.ts')).playerActs(g)[0];
    if (a) fam.langSchool31(g, a, 'it');
  }
  document.querySelectorAll('.overlay, #z31').forEach((e) => e.remove());
  const box = document.createElement('div');
  box.id = 'z31';
  box.setAttribute('style', 'position:fixed;inset:0;overflow:auto;z-index:9999;background:var(--bg,#111);padding:18px');
  document.body.appendChild(box);
  box.appendChild(ui.famTab31(g));
  return true;
}, mode);
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda3-z-${name}.png` }); console.log('captura', name); };
if (await show('start')) await shot('familia');
if (await show('lunch')) await shot('almoco');
if (await show('2030')) await shot('2030');
await b.close();
