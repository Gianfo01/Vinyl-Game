// R33 · POL33-A item 1 — prints dos interiores (antes/depois do enquadramento). Uso: npx vite --port 5933 &  node scripts/r33/shots-pol33-int.mjs <sufixo> [flags exp33 ligadas, separadas por vírgula]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const suf = process.argv[2] ?? 'antes';
const flags = (process.argv[3] ?? '').split(',').filter(Boolean);
const out = 'docs/r33/pol';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1912, height: 867 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto('http://127.0.0.1:5933/'); await p.waitForTimeout(3500);
await p.evaluate(async (flags) => {
  const st = await import('/src/ui/store.ts'), bot = await import('/src/sim/bot.ts'), wg = await import('/src/sim/worldgen.ts');
  await import('/src/sim/r33/index.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const g = wg.createGame(bot.defaultConfig('pol33-int', { scenario: 'established', startYear: 1962, dbSize: 'small', homeCity: 'london' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  const off = await import('/src/ui/tutoff19.ts'); off.setTutorials19(st.store.prefs, false);
  for (const f of flags) sw.setSw(g, f, true);
  st.store.game = g; window.__g = g;
}, flags);
for (const k of ['venue', 'records', 'radio', 'studio', 'bar', 'press', 'rehearsal', 'instruments', 'school', 'museum', 'hotel']) {
  await p.evaluate(async (k) => {
    const pl = await import('/src/sim/sys/place27.ts'), ins = await import('/src/ui/r31/inside31.ts'), gen = await import('/src/sim/sys/gente31.ts');
    const g = window.__g;
    const ps = pl.places27(g, Array.from({ length: 18 }, (_, i) => 40 + i));
    const pc = ps.find((x) => x.k === k);
    const x = pc ? { id: `shot:${pc.id}`, k: pc.k, name: pc.name.pt, what: pc.what.pt, people: pc.people, year: g.year, city: g.config.homeCity, seed: g.config.seed, place: pc, org: pc.org }
      : { id: `shot:${k}`, k, name: k, people: gen.crew31(g, k) ?? [], year: g.year, city: g.config.homeCity, seed: g.config.seed };
    document.querySelectorAll('.shot31').forEach((e) => e.remove());
    const box = document.createElement('div'); box.className = 'shot31'; box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12141c;overflow:auto';
    box.append(ins.insideView31(g, x, () => {})); document.body.append(box);
  }, k);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/int-${k}-${suf}.png` }); console.log('captura', k);
}
await b.close();
