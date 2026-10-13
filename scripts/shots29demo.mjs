// R29 (DEMO) — capturas do público por idade e região: aba Público (seu ato e uma estrela), Artistas › Público e mídia,
// Paradas (idade de quem ouve cada estilo), Mundo (camada Fãs por idade), Projeto (público-alvo) e Cockpit (dica).
// Começa pela tela inicial como o jogador: NOVA RUN → COMEÇAR MINHA HISTÓRIA; depois avança 18 meses pela simulação.
// Uso: npx vite --port 5330 &   node scripts/shots29demo.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29demo';
const port = process.argv[3] ?? '5330';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
await p.screenshot({ path: '/tmp/shots29demo-start.png' });
p.setDefaultTimeout(60000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const util = await import('/src/sim/util.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 18; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  const mine = util.playerActs(g);
  const star = Object.values(g.acts).filter((a) => !mine.includes(a.id) && a.status === 'active').sort((x, y) => y.fame - x.fame)[0];
  return { year: g.year, mine, star: star?.id, starName: star?.name };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name); };
const area = async (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = a;
  if (sub) vis.setTab(sub[0], sub[1]);
  c.rerender();
}, [a, sub]);
const actPage = async (id, tab) => p.evaluate(async ([id, tab]) => {
  const pg = await import('/src/ui/pages.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  pg.openActPage(id, tab);
}, [id, tab]);

if (info.mine[0]) {
  await actPage(info.mine[0], 'demo29'); await shot('ato-publico');
  await p.evaluate(() => document.querySelector('.d29-pools')?.scrollIntoView({ block: 'start' })); await shot('ato-nucleo-selos');
}
if (info.star) { await actPage(info.star, 'demo29'); await shot('estrela-publico'); }
await area('artists', ['artists20', 'audience']);
await p.getByRole('radio', { name: 'Ficha detalhada' }).first().click({ timeout: 8000 }).catch(() => console.error('sem Ficha detalhada'));
await p.waitForTimeout(800);
await p.getByRole('tab', { name: /Público e mídia/ }).first().click({ timeout: 8000 }).catch(() => console.error('sem aba Público e mídia'));
await p.evaluate(() => document.querySelector('.d29-top')?.scrollIntoView({ block: 'center' })); await shot('artistas-publico');
await area('charts', ['chartsHub', 'more']);
console.log('seção paradas', await p.evaluate(() => { const e = [...document.querySelectorAll('h2,h3,summary')].find((x) => /Quem ouve cada estilo/i.test(x.textContent ?? '')); e?.scrollIntoView({ block: 'start' }); return !!e; })); await shot('paradas-idade');
console.log('voto do público', await p.evaluate(() => { const e = [...document.querySelectorAll('h2,h3')].find((x) => /Voto do Público/i.test(x.textContent ?? '')); e?.scrollIntoView({ block: 'start' }); return !!e; })); await shot('paradas-voto-publico');
await area('world');
await p.getByRole('button', { name: 'Fãs por idade' }).first().click({ timeout: 8000 }).catch(() => console.error('sem botão Fãs por idade'));
await p.waitForTimeout(1500); await p.evaluate(() => document.querySelector('.map27-map, .wmap')?.scrollIntoView({ block: 'start' })); await shot('mapa-idade');
// projeto: abre um projeto do primeiro ato (fluxo de sempre; só a vista nova é capturada)
const okp = await p.evaluate(async () => {
  const pj = await import('/src/sim/sys/project8.ts');
  const util = await import('/src/sim/util.ts');
  const id = util.playerActs(window.__g)[0];
  if (!id) return false;
  const x = pj.createProject(window.__g, id, { type: 'lp' });
  return typeof x === 'object' && 'id' in x;
});
if (okp) { await area('project'); await p.evaluate(() => document.querySelector('.d29-aud')?.scrollIntoView({ block: 'center' })); await shot('projeto-publico'); }
await area('desk');
await p.getByRole('tab', { name: /Mesa do mês/ }).first().click({ timeout: 8000 }).catch(() => console.error('sem Mesa do mês'));
await p.waitForTimeout(800);
await p.getByRole('button', { name: /Ver mais/ }).first().click({ timeout: 4000 }).catch(() => {});
console.log('dica no cockpit', await p.evaluate(() => { const e = [...document.querySelectorAll('li,p,div')].reverse().find((x) => x.children.length < 6 && /Público jovem|Seu público envelheceu/.test(x.textContent ?? '')); e?.scrollIntoView({ block: 'center' }); return e ? e.textContent.slice(0, 80) : null; }));
await shot('cockpit-dica');
await b.close();
console.log('ok:', out);
