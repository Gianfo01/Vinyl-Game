// R31 · onda 5 (NAV) — capturas da casca nova com exp5.nav ligado: sede em 3 épocas, papel aberto, pausa, bolso e
// ajuda de teclas. Uso: npx vite --config scripts/vite5nw.config.mjs --host 127.0.0.1 --port 5871 &
//                       node scripts/shots31nav5.mjs [pasta] [porta] [só]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
const only = process.argv[4];
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
p.setDefaultTimeout(60000);
const start = (year, months, hq, pocket) => p.evaluate(async ([year, months, hq, pocket]) => {
  const wg = await import('/src/sim/worldgen.ts');
  const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const c = await import('/src/ui/common.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const ex = await import('/src/sim/r31/exp5.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = wg.createGame(botc.defaultConfig(`nav5-${year}`, { startYear: year, scenario: 'established' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < months; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  if (hq) g.player.hq = hq;
  sw.setSw(g, 'exp5.nav', true);
  for (const id of pocket) ex.pocketAdd5(g, id);
  sh.SH5.region = 'sede'; sh.SH5.paper = null; sh.SH5.pause = false; sh.SH5.help = false;
  st.store.game = g;
  c.rerender();
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  return { year: g.year, hq: g.player.hq };
}, [year, months, hq, pocket]);
const shot = async (name) => { await p.waitForTimeout(1200); await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove())); await p.screenshot({ path: `${out}/onda5-nav-${name}.png` }); console.log('captura', name); };
const key = async (k) => { await p.keyboard.press(k); await p.waitForTimeout(900); };
const want = (n) => !only || only.split(',').includes(n);

if (want('sede')) for (const [y, hq] of [[1905, 1], [1962, 2], [1985, 3], [2025, 4]]) {
  console.log(await start(y, 3, hq, ['livrocaixa', 'fichario', 'olheiro', 'quadrobranco', 'revista']));
  await shot(`sede-${y}`);
}
if (want('papel')) {
  console.log(await start(1962, 3, 2, ['livrocaixa', 'fichario', 'olheiro', 'quadrobranco', 'revista', 'correspondencia']));
  await key('z'); await shot('papel-livrocaixa');
  await key('Escape'); await key('e'); await shot('papel-caixa');
  await key('Escape');
  await key('u'); await shot('bolso-quadro');
  await key('Escape');
}
if (want('pausa')) {
  await key('Escape'); await shot('pausa');
  await key('Escape');
}
if (want('teclas')) {
  await key('?'); await shot('teclas');
  await key('Escape');
}
if (want('alt')) {
  await p.keyboard.down('Alt'); await shot('alt-nomes'); await p.keyboard.up('Alt');
}
if (want('viagem')) {
  if (only) console.log(await start(1962, 3, 2, ['livrocaixa']));
  await key('Shift+Digit3'); await shot('cidade');
  await key('Shift+Digit2'); await shot('casa');
  await key('Shift+Digit4'); await shot('mundo');
  await key('w'); await shot('mundo-papel'); await key('Escape');
  await key('h'); await shot('volta-sede');
}
if (want('clique')) {
  console.log(await start(1962, 3, 2, ['livrocaixa']));
  await p.locator('.s5-room[data-room="office"]').click(); await shot('sala-lista'); await key('Escape');
  await p.locator('.s5-obj[data-obj="mesames"]').click(); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/onda5-nav-zoom-meio.png` });
  await shot('papel-mesa');
  await key('}'); await shot('papel-marcador2');
  await key('Escape');
  await p.locator('.rc5-i').first().click(); await shot('ir-ate-la');
  await key('Escape'); await shot('flash');
}
await b.close();
