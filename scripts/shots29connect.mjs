// R29 (CONNECT) — capturas antes/depois: página do ato (Integrantes → Ex-integrantes; Formação) e ficha da pessoa
// (Carreira → Atos; Trajetória; Alma → Bandas; Conexões) para um ex-integrante real (Syd Barrett, Pink Floyd, 1975).
// Uso: npx vite --port 5329 &   node scripts/shots29connect.mjs <pasta> [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29';
const port = process.argv[3] ?? '5329';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(3000);
p.setDefaultTimeout(0);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const cfg = bot.defaultConfig('r29c-0', { startYear: 1975, realNames: true });
  const g = wg.createGame(cfg);
  g.tutorial = { step: 99, done: true, seen: [] };
  st.store.game = g;
  off.setTutorials19(st.store.prefs, false);
  window.__g = g;
});
const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${name}.png` }); };
const person = async (name, tab) => p.evaluate(async ([name, tab]) => {
  const pg = await import('/src/ui/pages.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const x = Object.values(window.__g.persons).find((q) => q.name === name);
  if (x) pg.openPersonPage(x.id, tab);
  return !!x;
}, [name, tab]);
const act = async (name, tab) => p.evaluate(async ([name, tab]) => {
  const pg = await import('/src/ui/pages.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const a = Object.values(window.__g.acts).find((q) => q.name === name);
  if (a) pg.openActPage(a.id, tab);
  return !!a;
}, [name, tab]);

await act('Pink Floyd', 'members'); await shot('ato-pinkfloyd-integrantes');
await person('Syd Barrett', 'career'); await shot('pessoa-syd-carreira');
await person('Syd Barrett', 'path16'); await shot('pessoa-syd-trajetoria');
await person('Syd Barrett', 'soul9'); await shot('pessoa-syd-alma');
await person('Syd Barrett', 'connect29'); await shot('pessoa-syd-conexoes');
await person('Peter Green', 'career'); await shot('pessoa-petergreen-carreira');
await b.close();
console.log('ok:', out);
