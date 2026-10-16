// R31 · onda 4 (H) — capturas da loja, da casa e da cidade de cada época (docs/r31/shots/onda4-h-*.png).
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-h.mjs [porta]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5871';
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
  for (let i = 0; i < (cfg.months ?? 2); i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  if (cfg.hq !== undefined) g.player.hq = cfg.hq;
  if (cfg.month !== undefined) g.month = cfg.month;
  if (cfg.rich) { g.player.cash += 5e9; }
  st.store.game = g; window.__g = g;
  return { y: g.year, m: g.month, city: g.config.homeCity };
}, [cfg]);
const area = async (a, sub) => { await p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts'); const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove()); st.store.area = a; if (sub) vis.setTab(sub[0], sub[1]); c.rerender();
}, [a, sub]); await p.waitForTimeout(1500); };
const shot = async (name, sel) => { await p.waitForTimeout(800); const el = sel ? await p.$(sel) : null; if (el) await el.screenshot({ path: `${out}/onda4-h-${name}.png` }); else await p.screenshot({ path: `${out}/onda4-h-${name}.png` }); console.log('captura', name); };
const noon = async () => { await p.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^Dia$/.test(b.textContent?.trim() ?? '')) b.click(); }); await p.waitForTimeout(600); };

console.log(await game({ seed: 'h31-rio', year: 1975, city: 'rio', real: true, months: 3 }));
await area('campus18'); await noon(); await shot('rio-1975', '.c27-frame');
console.log(await game({ seed: 'h31-sp', year: 1905, city: 'sao_paulo', real: true, months: 1 }));
await area('campus18'); await noon(); await shot('sp-1905', '.c27-frame');
console.log(await game({ seed: 'h31-ny', year: 2036, city: 'new_york', real: true, months: 1, hq: 4 }));
await area('campus18'); await noon(); await shot('ny-2036-44x32', '.c27-frame');
console.log(await game({ seed: 'h31-lon', year: 1965, city: 'london', real: false, months: 2 }));
await area('campus18'); await p.evaluate(() => { for (const b of document.querySelectorAll('button')) if (/^Noite$/.test(b.textContent?.trim() ?? '')) b.click(); }); await p.waitForTimeout(800); await shot('londres-1965-homenagens-noite', '.c27-frame');
// festival do mês (Rio: o do calendário mundial)
const fm = await p.evaluate(async () => { const c = await import('/src/data/catalog.ts'); return c.FESTIVALS.find((f) => f.city === 'rio' && f.month !== undefined && f.start <= 1990 && (f.end === undefined || f.end >= 1990))?.month; });
console.log('mês do festival', fm);
console.log(await game({ seed: 'h31-fest', year: 1990, city: 'rio', real: true, months: 1, month: fm ?? 0 }));
await area('campus18'); await noon(); await shot('rio-festival', '.c27-frame');
// loja e casa
console.log(await game({ seed: 'h31-shop', year: 1975, city: 'sao_paulo', real: true, months: 2, rich: true }));
await area('loja31'); await shot('loja-1975', '.sc31');
await p.evaluate(() => document.querySelector('.sc31-spot[data-spot^="item:"]')?.click()); await p.waitForTimeout(800); await shot('loja-compra');
await area('casa31'); await shot('casa-1975');
await b.close();
