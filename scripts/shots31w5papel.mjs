// R31 onda 5 (PAPEL, EXP-4) — capturas dos papéis com exp5.nav LIGADO: cada papel em 3 épocas e a caixa de entrada nas
// 6 aparências. Partidas criadas por época (createGame), alguns meses jogados pelo robô para haver conteúdo.
// Uso: npx vite --host 127.0.0.1 --port 5873 --config <config sem watch> &   node scripts/shots31w5papel.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5873';
const only = process.argv[4];
const years = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(60000);
const game = (y) => p.evaluate(async (y) => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const tick = await import('/src/sim/tick.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const c = await import('/src/ui/common.ts');
  const g = wg.createGame(bot.defaultConfig(`papel-${y}`, { startYear: y, companyName: 'Selo Agulha' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 8; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  sw.setSw(g, 'exp5.nav', true);
  st.store.game = g;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  c.rerender();
  return g.year;
}, y);
const open = (id) => p.evaluate(async (id) => {
  const nav = await import('/src/ui/r31/nav5.ts');
  document.querySelectorAll('.overlay, .toast').forEach((e) => e.remove());
  nav.open5(id);
  return !!document.querySelector(`main [data-paper5="${id}"]`);
}, id);
const shot = async (name) => { await p.waitForTimeout(900); await p.evaluate(() => document.querySelectorAll('.overlay, .toast').forEach((e) => e.remove())); await p.screenshot({ path: `${out}/onda5-papel-${name}.png` }); console.log('captura', name); };
const PAPERS = ['livrocaixa', 'cofre', 'arquivoaco', 'revista', 'olheiro', 'quadrobranco', 'jornal', 'radiotv', 'secretaria', 'telefone', 'quadrometas', 'diario', 'caderno', 'graficos', 'contador'];
const LOOK = { 1912: 'escrivaninha', 1962: 'telegrama', 1978: 'fax', 1995: 'tubo', 2005: 'plana', 2025: 'celular' };
for (const y of [1912, 1962, 1978, 1995, 2005, 2025].filter((y) => !years || years.includes(y))) {
  const yr = await game(y);
  console.log('partida', y, '→', yr);
  if (await open('correspondencia')) {
    await p.evaluate(() => document.querySelector('main .m27-row')?.click());
    await shot(`caixa-${LOOK[y]}`);
  } else console.error('sem caixa', y);
  if (![1912, 1962, 2025].includes(y)) continue;
  for (const id of PAPERS) {
    if (only && !only.split(',').includes(id)) continue;
    if (await open(id)) await shot(`${id}-${y}`); else console.error('sem papel', id, y);
  }
}
await b.close();
