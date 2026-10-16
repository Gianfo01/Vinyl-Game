// R31 · onda 4 (VIT) — capturas da vitrine do mês: o mesmo lugar em 2 meses seguidos e em 3 épocas (1935, 1975, 2015),
// com o painel do item aberto; outros lugares (instrumentos, bar, beco com a fita pirata, gravadora rival, casa de shows,
// feira da época) e a lista. Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-vit.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/onda4-vit-${name}.png` }); console.log('captura', name); };
const newGame = (year) => p.evaluate(async (year) => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const g = wg.createGame(bot.defaultConfig(`shots-vit-${year}`, { scenario: 'established', startYear: year, dbSize: 'small', homeCity: 'rio' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  const off = await import('/src/ui/tutoff19.ts');
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 3; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g; window.__g = g;
  try { for (const k of ['records', 'bar', 'radio', 'studio', 'hotel', 'venue', 'market', 'instruments', 'label']) localStorage.setItem(`vtn31-seen:in31-${k}`, '1'); } catch { /* */ }
  return g.year;
}, year);
const nextMonth = () => p.evaluate(async () => { const tick = await import('/src/sim/tick.ts'); const pb = await import('/src/sim/playbot16.ts'); pb.playMonth(window.__g, 'balanced'); tick.advanceMonth(window.__g); });
const inside = async (k, name, spot, extra) => {
  await p.evaluate(async ([k, extra]) => {
    const pl = await import('/src/sim/sys/place27.ts');
    const ins = await import('/src/ui/r31/inside31.ts');
    const gen = await import('/src/sim/sys/gente31.ts');
    const g = window.__g;
    const ps = pl.places27(g, Array.from({ length: 18 }, (_, i) => 40 + i));
    const pc = ps.find((x) => x.k === k);
    const x = pc ? { id: `shot:${pc.id}:${g.year}:${g.month}`, k: pc.k, name: pc.name.pt, what: pc.what.pt, people: pc.people, year: g.year, city: g.config.homeCity, seed: g.config.seed, place: pc, org: pc.org }
      : { id: `shot:${k}:${g.year}:${g.month}`, k, name: k, people: gen.crew31(g, k) ?? [], year: g.year, city: g.config.homeCity, seed: g.config.seed };
    document.querySelectorAll('.shot31').forEach((e) => e.remove());
    const box = document.createElement('div');
    box.className = 'shot31';
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12141c;overflow:auto';
    const render = () => { box.replaceChildren(ins.insideView31(g, x, () => {})); };
    window.__rerender31 = render;
    render();
    document.body.append(box);
    void extra;
  }, [k, extra ?? null]);
  for (const sp of [].concat(spot ?? [])) {
    await p.locator(`.shot31 .sc31-spot[data-spot^="${sp}"]`).first().click({ force: true }).catch(() => console.error('sem ponto', sp));
    await p.waitForTimeout(400);
    if (sp === 'vit:fair') await p.evaluate(() => window.__rerender31?.());
  }
  await p.evaluate(() => document.querySelector('.shot31 .in31-pane')?.scrollIntoView({ block: 'end' }));
  await shot(name);
};
for (const y of [1935, 1975, 2015]) {
  await newGame(y);
  await inside('records', `loja-${y}-mes1`, 'vit:v');
  await nextMonth();
  await inside('records', `loja-${y}-mes2`, 'vit:v');
}
// outros lugares (1975)
await newGame(1975);
await inside('instruments', 'instrumentos', 'vit:v');
await inside('bar', 'bar', 'vit:list');
await inside('venue', 'casa-de-shows', 'vit:v');
await inside('label', 'gravadora', 'vit:list');
await inside('market', 'beco', 'vit:list');
await inside('studio', 'estudio', 'vit:v');
// a feira da época (entra pela loja de discos)
for (const y of [1935, 1985, 2015]) {
  await newGame(y);
  await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); void st; });
  await inside('records', `feira-${y}`, ['vit:fair', 'vit:v']);
}
console.log('erros', errs.length);
await b.close();
