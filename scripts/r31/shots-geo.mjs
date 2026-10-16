// R31 · onda 4 (GEO) — capturas do mapa da cidade por geografia real (docs/r31/capturas/geo/<fase>-<cidade>-<ano>.png).
// Uso: npx vite --host 127.0.0.1 --port 5890 &   node scripts/r31/shots-geo.mjs <fase: antes|depois> [porta] [cidade,cidade…]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const fase = process.argv[2] ?? 'depois', port = process.argv[3] ?? '5890';
const only = process.argv[4]?.split(',');
const out = 'docs/r31/capturas/geo';
mkdirSync(out, { recursive: true });
const exe = `/opt/pw-browsers/${readdirSync('/opt/pw-browsers').find((d) => d.startsWith('chromium-'))}/chrome-linux/chrome`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1500, height: 1300 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(180000);
const CITIES = ['rio', 'salvador', 'lisbon', 'sydney', 'new_york', 'london', 'paris', 'sao_paulo', 'hong_kong', 'madrid'];
const YEARS = [1930, 1975, 2030];
for (const city of CITIES) {
  if (only && !only.includes(city)) continue;
  for (const year of YEARS) {
    await p.evaluate(async ([city, year]) => {
      const st = await import('/src/ui/store.ts');
      const bot = await import('/src/sim/bot.ts');
      const wg = await import('/src/sim/worldgen.ts');
      const tick = await import('/src/sim/tick.ts');
      const pb = await import('/src/sim/playbot16.ts');
      const c = bot.defaultConfig(`geo-${city}-${year}`, { startYear: year, homeCity: city });
      c.dbSize = 'small'; c.realNames = true;
      const g = wg.createGame(c);
      g.tutorial = { step: 99, done: true, seen: [] };
      const off = await import('/src/ui/tutoff19.ts'); off.setTutorials19(st.store.prefs, false);
      for (let i = 0; i < 1; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
      st.store.game = g;
      const cm = await import('/src/ui/common.ts');
      document.querySelectorAll('.overlay').forEach((e) => e.remove()); st.store.area = 'campus18'; cm.rerender();
    }, [city, year]);
    await p.waitForTimeout(1500);
    await p.evaluate(() => { for (const x of document.querySelectorAll('button')) if (/^Dia$/.test(x.textContent?.trim() ?? '')) x.click(); });
    await p.waitForTimeout(1200);
    const el = await p.$('.c27-frame');
    const f = `${out}/${fase}-${city}-${year}.png`;
    if (el) await el.screenshot({ path: f }); else await p.screenshot({ path: f });
    console.log('captura', f);
  }
}
await b.close();
