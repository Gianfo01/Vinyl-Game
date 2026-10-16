// R31 · onda 3 (P) — capturas: Finanças › Resultados (por artista e por projeto), Seu bolso, ficha do artista › Resultados.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-onda3-P.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 1500 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g8 = await import('/src/sim/sys/goods8.ts');
  const ow = await import('/src/sim/sys/people/owner.ts');
  const rs = await import('/src/sim/r31/results31.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.cash += 2_000_000_00;
  for (let i = 0; i < 14; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  ow.withdraw(g, 2_000_000);
  g8.buyGood(g, 'car_family', 'label');
  g8.buyGood(g, 'piano_grand');
  for (let i = 0; i < 2; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  return { bal: rs.results31Balance(g), rows: rs.resultsReport31(g, 'artist').rows.length };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name, fn) => {
  await p.evaluate(fn);
  await p.waitForTimeout(1200);
  await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/onda3-p-${name}.png`, fullPage: false });
  console.log('captura', name);
};
await shot('artista', async () => {
  const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts'); const v = await import('/src/ui/vis.ts'); const m = await import('/src/ui/r31/results31mini.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  m.RES31.dim = 'artist'; v.setTab('business-finance', 'results31'); st.store.area = 'finance'; c.rerender();
});
await shot('projeto', async () => {
  const c = await import('/src/ui/common.ts'); const m = await import('/src/ui/r31/results31mini.ts');
  m.RES31.dim = 'project'; c.rerender();
});
await shot('bolso', async () => {
  const c = await import('/src/ui/common.ts'); const v = await import('/src/ui/vis.ts');
  v.setTab('business-finance', 'purse31'); c.rerender();
});
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts'); const pg = await import('/src/ui/pages.ts'); const u = await import('/src/sim/util.ts');
  const id = u.playerActs(st.store.game)[0]; if (id) pg.openActPage(id, 'results31');
});
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/onda3-p-ficha.png`, fullPage: false });
console.log('captura ficha');
await b.close();
