// R31 · onda 4 (W + R) — capturas: cenas do lote 2 (quadro do lançamento, banco, reunião de compra, jabá na rádio),
// uma cena antiga com a faixa de elenco (compor) e Finanças › Aprendizados.
// Começa pela tela inicial como o jogador: NOVA RUN → COMEÇAR MINHA HISTÓRIA; depois avança pela simulação com o robô.
// Uso: npx vite --host 127.0.0.1 --port 5874 &   node scripts/shots31w4wr.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5874';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(120000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const r18 = await import('/src/sim/sys/radio18.ts');
  const util = await import('/src/sim/util.ts');
  const pj = await import('/src/sim/sys/project8.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 48; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  g.player.cash += 300000000;
  r18.ensureStations18(g);
  const a = util.playerActs(g)[0];
  if (a) pj.createProject(g, a, { type: 'lp' });
  window.__g = g;
  return { year: g.year, acts: util.playerActs(g).length };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/onda4-wr-${name}.png` }); console.log('captura', name); };
const clear = () => p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
const scene = async (kind, pick) => p.evaluate(async ([kind, pick]) => {
  const reg = await import('/src/ui/r31/scene31reg.ts');
  await import('/src/ui/r31/mech31.ts');
  const core = await import('/src/ui/r31/scene31core.ts');
  const g = window.__g;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const ts = core.sceneTargets31(g, kind);
  const x = pick === 'free' ? ts.find((y) => core.sceneModel31(g, kind, { id: y.id })?.choices.some((c) => !c.lock)) ?? ts[0] : ts[0];
  if (!x) return null;
  reg.sceneHook31.open(kind, x.id, 'scene');
  return x.name;
}, [kind, pick]);

for (const [k, pick] of [['release'], ['bank'], ['buy', 'free'], ['jaba'], ['jabain']]) {
  const n = await scene(k, pick);
  if (!n) { console.error('sem alvo para', k); continue; }
  await p.evaluate(() => document.querySelector('.mc31')?.scrollIntoView({ block: 'start' }));
  await shot(`cena-${k}`);
  if (k === 'release') { // modo de 2 cliques
    await p.getByRole('button', { name: /Pular cena/ }).first().click().catch(() => console.error('sem Pular cena'));
    await shot('cena-release-rapido');
  }
}
await clear();
// cena antiga (compor) com a faixa de elenco
const okc = await p.evaluate(async () => {
  const c = await import('/src/ui/act27/compose27.ts');
  const util = await import('/src/sim/util.ts');
  const id = util.playerActs(window.__g)[0];
  if (!id) return false;
  c.openCompose27(window.__g, id);
  return !!document.querySelector('.mc31-cast');
});
console.log('faixa de elenco no compor', okc);
await shot('cena-antiga-compor');
await clear();
// Finanças › Aprendizados
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  vis.setTab('business-finance', 'learn31');
  st.store.area = 'finance';
  c.rerender();
});
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelector('.lrn31-view')?.scrollIntoView({ block: 'start' }));
await shot('aprendizados');
await p.evaluate(() => [...document.querySelectorAll('h2,h3')].find((x) => /Coortes/.test(x.textContent ?? ''))?.scrollIntoView({ block: 'start' }));
await shot('coortes');
await b.close();
