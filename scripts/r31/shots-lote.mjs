// R31 · onda 4 (LOTE) — capturas do registro de lotes (docs/r31/shots/onda4-lote-*.png): mapa com as funções marcadas
// (2 cidades × 2 épocas), casa de artista, casa de CEO, terreno à venda e terreno comprado.
// Uso: npx vite --host 127.0.0.1 --port 5880 &   node scripts/r31/shots-lote.mjs [porta]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5880';
const out = 'docs/r31/shots';
mkdirSync(out, { recursive: true });
const exe = `/opt/pw-browsers/${readdirSync('/opt/pw-browsers').find((d) => d.startsWith('chromium-'))}/chrome-linux/chrome`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1500, height: 1300 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
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
  if (cfg.rich) g.player.cash += 5e9;
  for (let i = 0; i < (cfg.months ?? 2); i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g; window.__g = g;
  const lm = await import('/src/ui/pixel/lots31map.ts');
  const c31 = lm.cityLots31(g);
  return { y: g.year, city: g.config.homeCity, cover: Math.round(c31.cover * 100), homes: c31.places.filter((x) => x.k === 'home').map((x) => `${x.lot}:${x.people.some((y) => !y.away) ? 1 : 0}:${x.lot31?.who}`), sale: c31.sale.map((x) => `${x.lot}:${x.opt}`) };
}, [cfg]);
const area = async (a) => { await p.evaluate(async ([a]) => {
  const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove()); st.store.area = a; c.rerender();
}, [a]); await p.waitForTimeout(1500); };
const shot = async (name, sel) => { await p.waitForTimeout(800); const el = sel ? await p.$(sel) : null; if (el) await el.screenshot({ path: `${out}/onda4-lote-${name}.png` }); else await p.screenshot({ path: `${out}/onda4-lote-${name}.png` }); console.log('captura', name); };
const btn = async (re) => { await p.evaluate((src) => { const r = new RegExp(src); for (const x of document.querySelectorAll('button')) if (r.test(x.textContent?.trim() ?? '')) { x.click(); return; } }, re.source); await p.waitForTimeout(700); };
const click = async (sel) => { await p.evaluate((sel) => document.querySelector(sel)?.click(), sel); await p.waitForTimeout(900); };

// mapa com as funções marcadas: 2 cidades × 2 épocas
for (const [seed, year, city, name] of [['lote-sp1', 1975, 'sao_paulo', 'sp-1975'], ['lote-sp2', 2036, 'sao_paulo', 'sp-2036'], ['lote-ny1', 1925, 'new_york', 'ny-1925'], ['lote-ny2', 2012, 'new_york', 'ny-2012']]) {
  console.log(await game({ seed, year, city, real: true, months: 2 }));
  await area('campus18'); await btn(/^Dia$/);
  await p.evaluate(() => { for (const x of document.querySelectorAll('button')) if (/^Funções$/.test(x.textContent?.trim() ?? '') && x.getAttribute('aria-pressed') !== 'true') x.click(); }); await p.waitForTimeout(800);
  await shot(`mapa-${name}`, '.c27-frame');
}
// casas: família/CEO/artista em São Paulo 2036
const info = await game({ seed: 'lote-casa', year: 2036, city: 'sao_paulo', real: true, months: 2, rich: true });
console.log(info);
await area('campus18'); await btn(/^Dia$/);
const enter = async (who, name) => {
  const hs = info.homes.filter((x) => x.split(':').slice(2).join(':').startsWith(who));
  const h = hs.find((x) => x.split(':')[1] === '1') ?? hs[0];
  if (!h) { console.log('sem casa para', who); return; }
  const lot = h.split(':')[0];
  await click(`.w19-hs[data-id="pl:${lot}"]`);
  await click('.c2-enter');
  await p.waitForTimeout(1200);
  await btn(/^Entendi$/);
  await click('[data-spot="who"]');
  await shot(name, '.c2-in.in31');
  await btn(/Voltar à cidade/);
};
await enter('p:', 'casa-artista');
await enter('l:', 'casa-ceo');
await enter('fam', 'casa-fossati');
// terreno à venda e comprado
await area('campus18'); await btn(/^Dia$/);
const lot = info.sale.find((x) => x.endsWith(':lot31'))?.split(':')[0] ?? info.sale[0]?.split(':')[0];
await click(`.w19-hs[data-id="lot:${lot}"]`);
await shot('terreno-a-venda');
await p.evaluate(async ([lot]) => { const m = await import('/src/sim/sys/lots31.ts'); console.log(JSON.stringify(m.buyLot31(window.__g, +lot))); }, [lot]);
await area('campus18'); await btn(/^Dia$/);
await click(`.w19-hs[data-id="lot:${lot}"]`);
await shot('terreno-comprado');
// painel rápido da cidade (lotes)
await click('.c27-pn .w19-x');
await btn(/Lotes da cidade/);
await shot('painel-cidade');
await b.close();
