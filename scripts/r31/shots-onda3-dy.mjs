// R31 · onda 3 (D/Y) — capturas: transporte por trecho no planejador de turnê, explicação das vendas com a pressão de
// mercado e a parada do Japão (artistas da casa).
// Uso: npx vite --host 127.0.0.1 --port 5833 &   node scripts/r31/shots-onda3-dy.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5833';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 1300 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
// 1) planejador: etapa Logística com o transporte por trecho (rota com travessia de oceano)
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const tp = await import('/src/ui/panels/tours.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const tick = await import('/src/sim/tick.ts');
  const g = wg.createGame(bot.defaultConfig('r31-shot-dy60', { startYear: 1960, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
  for (let i = 0; i < 3; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const main = document.querySelector('main') ?? document.body;
  main.innerHTML = '';
  const sec = tp.tourPlannerSection(g, ['new_york', 'london', 'paris', 'tokyo'], undefined, 2);
  main.appendChild(sec);
  sec.querySelectorAll('details.legs31').forEach((d) => { d.open = true; });
  return { year: g.year };
});
console.log('jogo', JSON.stringify(info));
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/onda3-dy-transporte.png`, fullPage: false });
// 2) explicação das vendas de um lançamento do jogador em 2012 (pressão de mercado) e 3) parada do Japão
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const tick = await import('/src/sim/tick.ts');
  const g = wg.createGame(bot.defaultConfig('r31-shot-dy', { startYear: 2012, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  for (let i = 0; i < 8; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g;
  window.__g = g;
});
await p.evaluate(async () => {
  const g = window.__g;
  const f = await import('/src/ui/ficha.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const rel = Object.values(g.releases).filter((r) => r.owner === 'player' && r.autopsy?.some((x) => x.key === 'pressure31')).sort((a, b) => b.totalUnits - a.totalUnits)[0];
  if (rel) f.openRelease(rel.id);
});
await p.waitForTimeout(1200);
await p.evaluate(() => { const m = document.querySelector('.modal'); const t = [...(m?.querySelectorAll('h4') ?? [])].find((h) => /Autópsia|explica/i.test(h.textContent ?? '')); t?.scrollIntoView(); });
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/onda3-dy-vendas.png`, fullPage: false });
await p.evaluate(async () => {
  const g = window.__g;
  const ch = await import('/src/ui/sys/charts7.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const main = document.querySelector('main') ?? document.body;
  main.innerHTML = '';
  main.appendChild(ch.countryChartsTab(g));
});
await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/onda3-dy-paradas.png`, fullPage: false });
console.log('capturas onda3-dy');
await b.close();
