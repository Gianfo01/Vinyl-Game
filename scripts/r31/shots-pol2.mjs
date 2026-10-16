// R31 · onda 4 (POL2) — capturas dos estados vazios: diretoria sem ninguém, quadro do lançamento sem equipe,
// sala de troféus vazia, elenco com vaga livre e o mapa no zoom afastado com os letreiros das rádios/TVs reais.
// Uso: npx vite --host 127.0.0.1 --port 5891 &   node scripts/r31/shots-pol2.mjs [porta] [pasta] [prefixo]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5891';
const out = process.argv[3] ?? 'docs/r31/shots';
const pre = process.argv[4] ?? 'onda4-pol2';
mkdirSync(out, { recursive: true });
const exe = `/opt/pw-browsers/${readdirSync('/opt/pw-browsers').find((d) => d.startsWith('chromium-'))}/chrome-linux/chrome`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1400, height: 1000 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(120000);
const game = (cfg) => p.evaluate(async ([cfg]) => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const c = bot.defaultConfig(cfg.seed, { startYear: cfg.year, homeCity: cfg.city });
  c.dbSize = 'small'; c.realNames = !!cfg.real;
  const g = wg.createGame(c);
  g.tutorial = { step: 99, done: true, seen: [] };
  const off = await import('/src/ui/tutoff19.ts'); off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < (cfg.months ?? 2); i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  if (cfg.nostaff) g.player.staff = []; // só para a captura do estado vazio (ninguém à mesa)
  st.store.game = g; window.__g = g;
  return { y: g.year, m: g.month };
}, [cfg]);
const area = async (a) => { await p.evaluate(async ([a]) => {
  const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove()); st.store.area = a; c.rerender();
}, [a]); await p.waitForTimeout(1500); };
const shot = async (name, sel) => { await p.waitForTimeout(1000); const el = sel ? await p.$(sel) : null; if (el) await el.screenshot({ path: `${out}/${pre}-${name}.png` }); else await p.screenshot({ path: `${out}/${pre}-${name}.png` }); console.log('captura', name, !!el); };

if (process.argv[5] !== 'outdoor') {
console.log(await game({ seed: 'pol2-dir', year: 1962, city: 'rio', months: 1, nostaff: true }));
await area('hq');
await p.evaluate(async () => { (await import('/src/ui/act27/board27.ts')).openBoard27(); });
await shot('diretoria-vazia', '.overlay .modal, .overlay');
console.log(await game({ seed: 'pol2-rel', year: 1962, city: 'rio', months: 14, nostaff: true }));
await area('hq');
await p.evaluate(async () => {
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = window.__g; const util = await import('/src/sim/util.ts'); const pj = await import('/src/sim/sys/project8.ts');
  const a = util.playerActs(g)[0]; if (a) pj.createProject(g, a.id ?? a, { type: 'lp' });
  const reg = await import('/src/ui/r31/scene31reg.ts'); await import('/src/ui/r31/mech31.ts');
  const core = await import('/src/ui/r31/scene31core.ts');
  const x = core.sceneTargets31(g, 'release')[0]; if (x) reg.sceneHook31.open('release', x.id, 'scene');
});
await p.evaluate(() => document.querySelector('.mc31')?.scrollIntoView({ block: 'start' }));
await shot('lancamento-sem-equipe', '.overlay .modal, .overlay');
await p.evaluate(async () => { document.querySelectorAll('.overlay').forEach((e) => e.remove()); (await import('/src/ui/r31/salas31.ts')).openSala31('trophy'); });
await shot('trofeus-vazia', '.overlay .modal, .overlay');
await p.evaluate(async () => { document.querySelectorAll('.overlay').forEach((e) => e.remove()); (await import('/src/ui/r31/salas31.ts')).openSala31('roster'); });
await shot('elenco-vaga', '.overlay .modal, .overlay');
for (const [seed, year, city] of [['pol2-rio', 1975, 'rio'], ['pol2-sp', 1990, 'sao_paulo'], ['pol2-ny', 1965, 'new_york']]) {
  console.log(await game({ seed, year, city, real: true, months: 2 }));
  await area('campus18');
  await p.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^Dia$/.test(b.textContent?.trim() ?? '')) b.click(); }); await p.waitForTimeout(600);
  await shot(`mapa-${city}-${year}`, '.c27-frame');
}
}
// outdoors (POL2): paradas, artista em alta, lançamento e turnê chegando — 3 épocas (pintado, neon, LED)
for (const [seed, year, city] of [['pol2-od1', 1935, 'london'], ['pol2-od2', 1975, 'rio'], ['pol2-od3', 2015, 'new_york']]) {
  console.log(await game({ seed, year, city, real: true, months: 8 }));
  console.log(await p.evaluate(async () => { // turnê marcada na cidade (só para a captura mostrar o painel da turnê)
    const g = window.__g; const a = Object.values(g.acts).filter((x) => x.fame >= 20 && Object.values(g.releases).some((r) => r.actId === x.id)).sort((x, y) => y.fame - x.fame)[3];
    if (a) g.tours.push({ id: 'shot-t', actId: a.id, name: 'x', stops: [{ cityId: g.config.homeCity, day: g.day + 5, tier: 1, price: 0, capacity: 1, sold: 0, merch: 0, status: 'scheduled', travelDays: 0 }], setlist: [], minutes: 60, production: 0, role: 'headline', crew: 0, pay: 'door', costReserved: 0, revenue: 0, costs: 0, status: 'planned', log: [], accidents: 0 });
    const c = await import('/src/sim/r31/city31.ts'); return c.billboards31(g).map((b) => `${b.kind}:${b.act}`).join(' | ');
  }));
  await area('campus18');
  await p.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^(Noite)$/.test(b.textContent?.trim() ?? '')) b.click(); }); await p.waitForTimeout(600);
  await shot(`outdoor-${city}-${year}`, '.c27-frame');
}
await b.close();
