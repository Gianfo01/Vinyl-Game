// R31 · onda 5 (POL5) — cenas fixas para o antes/depois do acabamento (exp5.nav ligado). Roda contra um vite do código
// "antes" e outro do "depois" e grava <pasta>/<cena>.png; a montagem lado a lado é do scripts/r31/pol5-pares.py.
// Uso: node scripts/r31/shots-pol5.mjs <pasta> <porta> [cenas]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2]; const port = process.argv[3] ?? '5891'; const only = process.argv[4]?.split(',');
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
p.setDefaultTimeout(120000);
const vp = (w, hh) => p.setViewportSize({ width: w, height: hh });
const start = (y, sc, hq, months = 2, house) => p.evaluate(async ([y, sc, hq, months, house]) => {
  const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts'); const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts'); const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts'); const c = await import('/src/ui/common.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const g = wg.createGame(botc.defaultConfig(`pol5-${y}-${sc}`, { startYear: y, scenario: sc }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < months; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  if (hq) g.player.hq = hq;
  if (house) { const ow = await import('/src/sim/sys/people/owner.ts'); ow.ownerOf(g).house = ow.HOUSES.findIndex((x) => x.id === house); }
  sw.setSw(g, 'exp5.nav', true);
  Object.assign(sh.SH5, { region: 'sede', paper: null, pause: false, help: false });
  document.querySelectorAll('.m5-ccard').forEach((e) => e.remove());
  st.store.game = g; c.rerender();
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
}, [y, sc, hq, months, house]);
const shot = async (name, wait = 1300) => { await p.waitForTimeout(wait); await p.evaluate(() => document.querySelectorAll('.overlay, .toast').forEach((e) => e.remove())); await p.mouse.move(2, 890); await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name); };
const keys = async (...ks) => { for (const k of ks) { await p.keyboard.press(k); await p.waitForTimeout(500); } };
const SC = {
  // 1. cabeçalho do papel nas molduras (claras, escuras e com textura) e épocas
  'cab-olheiro-2025': async () => { await start(2025, 'established', 4); await keys('5'); },
  'cab-fichario-1912': async () => { await start(1912, 'established', 1); await keys('a'); },
  'cab-secretaria-1962': async () => { await start(1962, 'established', 2); await keys('Shift+E'); },
  'cab-quadrobranco-1985': async () => { await start(1985, 'established', 3); await keys('u'); },
  'cab-revista-2005': async () => { await start(2005, 'established', 3); await keys('3'); },
  'cab-mural-1962': async () => { await start(1962, 'established', 2); await keys('4'); },
  'cab-diario-1912': async () => { await start(1912, 'established', 1); await keys('d'); },
  'cab-agenda-2025': async () => { await start(2025, 'established', 4); await keys('g'); },
  // 2. mural e quadro com elenco pequeno e médio
  'mural-1-artista-1985': async () => { await start(1985, 'from_zero', 1); await keys('4'); },
  'mural-4-artistas-2025': async () => { await start(2025, 'established', 4); await keys('4'); },
  'quadro-1-artista-1985': async () => { await start(1985, 'from_zero', 1); await keys('c'); },
  'quadro-4-artistas-1962': async () => { await start(1962, 'established', 2); await keys('c'); },
  // 3. varredura
  'sede-1912': async () => { await start(1912, 'established', 1); },
  'sede-1985': async () => { await start(1985, 'established', 3); },
  'casa-1912': async () => { await start(1912, 'established', 1); await keys('Shift+Digit2'); },
  'casa-2025': async () => { await start(2025, 'established', 4); await keys('Shift+Digit2'); },
  'mundo-depois-de-papel-2025': async () => { await start(2025, 'established', 4); await keys('w', 'Escape', 'Shift+Digit3'); await p.waitForTimeout(800); await p.evaluate(async () => { const v = await import('/src/ui/vis.ts'); v.setTab('worldHub', 'fossati31'); }); await keys('Shift+Digit4'); },
  'papel-antigo-espelho-2025': async () => { await start(2025, 'established', 4); await keys('v'); },
  'papel-antigo-cofrecasa-1985': async () => { await start(1985, 'established', 3); await keys('x'); },
  'fichario-2025': async () => { await start(2025, 'established', 4); await keys('a'); },
  'mapa-marcador-2025': async () => { await start(2025, 'established', 4); await keys('w'); },
  // pedidos do dono repassados pelo coordenador (janela baixa, mundo → cidade, bolso, painel do prédio)
  'janela-sede-1574x674': async () => { await vp(1574, 674); await start(1962, 'established', 2); },
  'janela-sede-1280x720': async () => { await vp(1280, 720); await start(1985, 'established', 3); },
  'janela-casa-larga-1280x720': async () => { await vp(1280, 720); await start(2025, 'established', 4, 2, 'ranch'); await keys('Shift+Digit2'); },
  'janela-mundo-1600x700': async () => { await vp(1600, 700); await start(1985, 'established', 3); await keys('Shift+Digit4'); },
  'janela-cidade-predio-1600x700': async () => { await vp(1600, 700); await start(1975, 'established', 2); await keys('Shift+Digit3'); await p.waitForTimeout(1200); await p.evaluate(() => document.querySelector('.w19-hs[data-id="pl:lon_bbc_radio"]')?.click()); },
  'mundo-clique-na-cidade': async () => { await vp(1440, 900); await start(1975, 'established', 2); await keys('Shift+Digit4'); await p.waitForTimeout(1200); await p.evaluate(async () => { const m = await import('/src/ui/r31/map5ui.ts'); const st = await import('/src/ui/store.ts'); m.pointWorld5(st.store.game, 'FRA'); }); await p.waitForTimeout(1200); await p.locator('.m5-cbtn:not(.primary)').first().click(); },
  'mundo-cidade-visitada': async () => { await vp(1440, 900); await start(1975, 'established', 2); await keys('Shift+Digit4'); await p.waitForTimeout(1200); await p.evaluate(async () => { const m = await import('/src/ui/r31/map5ui.ts'); const st = await import('/src/ui/store.ts'); m.pointWorld5(st.store.game, 'FRA'); }); await p.waitForTimeout(1200); await p.locator('.m5-cbtn:not(.primary)').first().click(); await p.waitForTimeout(700); if (await p.locator('.m5-cc-go').count()) await p.locator('.m5-cc-go').click(); },
  'bolso-fixar-sem-papel': async () => { await vp(1440, 900); await start(1962, 'established', 2); await p.locator('.b5-pin').click({ force: true }).catch(() => {}); },
};
for (const [k, f] of Object.entries(SC)) { if (only && !only.includes(k)) continue; await f(); await shot(k); }
await b.close();
