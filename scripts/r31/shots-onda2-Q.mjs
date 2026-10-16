// R31 · onda 2 (Q) — captura da tela de delegação (Sede › Diretoria).
// Uso: npx vite --host 127.0.0.1 --port 5631 &   node scripts/r31/shots-onda2-Q.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5631';
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
  const dl = await import('/src/sim/deleg31.ts');
  const ct = await import('/src/sim/contracts.ts');
  const c = await import('/src/ui/common.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.cash += 5_000_000_00;
  const hire = (role, skill, name) => g.player.staff.push({ id: `shot-${role}`, name, role, skill, salary: 250000, hiredWeek: g.week });
  hire('anr', 78, 'Marta Quintal'); hire('producer', 64, 'Duda Freire'); hire('legal', 55, 'Otávio Lins'); hire('booking_agent', 70, 'Lenny Sachs'); hire('promoter', 48, 'Wanda Pritchard');
  const free = Object.values(g.acts).filter((a) => ct.offerEligible29(g, a, 'classic').ok && !g.knowledge[a.id]).slice(0, 25);
  for (const a of free) g.knowledge[a.id] = { actId: a.id, degree: 3, stage: 'investigating', bias: 0, updatedWeek: g.week, source: 'shot' };
  dl.applyPreset31(g, 'mid');
  dl.setDir31(g, 'anr', { ask: 6000, per: 2, genres: [free[0]?.genre].filter(Boolean) });
  dl.setDir31(g, 'exec', { minQ: 55 });
  for (let i = 0; i < 4; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = 'deleg31';
  c.rerender();
  return { log: dl.autoLog31(g, { n: 5 }).map((e) => e.t.pt), asks: dl.asks31(g).length };
});
console.log('jogo', JSON.stringify(info));
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/onda2-Q.png`, fullPage: false });
console.log('captura onda2-Q');
await b.close();
