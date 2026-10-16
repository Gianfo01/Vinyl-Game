// R31 · onda 2 (J) — capturas das cenas: Mesa do chefe (Hoje), Turnê (mapa + calendário) e Projeto musical (rua).
// Uso: npx vite --host 127.0.0.1 --port 5431 &   node scripts/r31/shots-onda2-J.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5431';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 200)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const util = await import('/src/sim/util.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const pj = await import('/src/sim/sys/project8.ts');
  const tours = await import('/src/sim/tours.ts');
  const c = await import('/src/ui/common.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 8; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  const ids = util.playerActs(g);
  const id = ids[0];
  let proj = null, tour = null;
  if (id) {
    const x = pj.createProject(g, id, { type: 'lp' });
    proj = typeof x === 'object' && 'id' in x ? x.id : x.pt;
    const busy = g.tours.some((t) => t.actId === id && (t.status === 'planned' || t.status === 'running'));
    if (!busy) {
      g.player.cash += 5000000; // só para a captura: a logística da turnê cabe no caixa
      const cities = ['rio', 'sao_paulo', 'salvador', 'recife', 'bh', 'buenos_aires', 'lisbon'].filter((c0) => c0 !== g.config.homeCity).slice(0, 5);
      const r = tours.planTour(g, { actId: id, cities, startInDays: 6, priceMult: 1, minutes: 45, setlist: [], production: 1, role: 'headline', crew: 2, pay: 'door' });
      tour = 'id' in r ? r.id : r.pt;
    }
  }
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  try { localStorage.removeItem('vtn31-seen:desk'); localStorage.setItem('vtn31-seen:tour', '1'); localStorage.setItem('vtn31-seen:proj', '1'); } catch { /* */ }
  c.rerender();
  return { year: g.year, acts: ids.map((x) => g.acts[x].name), proj, tour, decisions: g.decisions.length };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name, sel) => {
  await p.waitForTimeout(1200);
  if (sel) await p.evaluate((s0) => document.querySelector(s0)?.scrollIntoView({ block: 'start' }), sel);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name);
};
const area = async (a, sub) => p.evaluate(async ([a0, sub0]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (sub0) vis.setTab(sub0[0], sub0[1]);
  st.store.area = a0;
  c.rerender();
}, [a, sub]);
// 1) Hoje = Mesa do chefe (primeira visita mostra o que é cada objeto)
await area('cockpit', ['ck20', 'panel']);
await shot('onda2-J-mesa-primeira', '.sc31-desk');
await p.evaluate(() => { localStorage.setItem('vtn31-seen:desk', '1'); });
await area('cockpit', ['ck20', 'panel']);
await shot('onda2-J-mesa', '.sc31-desk');
await p.locator('.sc31-desk [data-spot="phone"]').first().hover().catch(() => {});
await shot('onda2-J-mesa-dica');
await p.locator('.sc31-desk [data-spot="phone"]').first().click().catch((e) => console.error('sem telefone', e.message));
await shot('onda2-J-mesa-telefone');
await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
await p.getByRole('checkbox', { name: /Mostrar tudo que é clicável/ }).first().check().catch(() => {});
await shot('onda2-J-mesa-clicaveis', '.sc31-desk');
await p.getByRole('checkbox', { name: /Mostrar tudo que é clicável/ }).first().uncheck().catch(() => {});
await p.getByRole('button', { name: 'Ver como lista' }).first().click().catch(() => {});
await shot('onda2-J-mesa-lista', '.sc31-desk');
await p.getByRole('button', { name: 'Cena', exact: true }).first().click().catch(() => {});
// 2) Turnê: mapa + calendário
await area('shows', ['showsHub', 'tours']);
await p.waitForTimeout(2500); // contornos dos países carregam sob demanda
await area('shows', ['showsHub', 'tours']);
await shot('onda2-J-turne', '.sc31-tour');
await p.locator('.sc31-tour [data-spot="bus"]').first().click().catch(() => console.error('sem ônibus'));
await shot('onda2-J-turne-onibus');
await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
// 3) Projeto musical: a rua
await area('project');
await shot('onda2-J-projeto', '.sc31-proj');
await p.locator('.sc31-proj .sc31-spot.lvl-normal[data-spot^="stage:"]').first().click().catch(() => console.error('sem etapa'));
await shot('onda2-J-projeto-etapa');
await b.close();
