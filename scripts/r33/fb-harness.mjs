// R33 · FICHAS33-B — harness comum das sondas e capturas (vite com VITE_EXP5NAV=1 na porta PORT, padrão 5893).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
export const PORT = process.env.PORT ?? '5893';
export async function browser() { return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); }
export async function page(b, { w = 1366, h = 768, lang = 'pt', textScale } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: lang === 'en' ? 'en-US' : 'pt-BR' });
  await ctx.addInitScript(([lang, ts]) => { const p = { reducedMotion: true, lang }; if (ts) p.textScale = ts; localStorage.setItem('vtn:prefs', JSON.stringify(p)); }, [lang, textScale]);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:${PORT}/`); await p.waitForTimeout(2500);
  p.setDefaultTimeout(120000);
  return p;
}
/** Partida pronta com a casca nova (mesmo caminho do pol5: worldgen + 2 meses do bot). */
export const start = (p, y = 1962, sc = 'established', months = 2, hq = 2) => p.evaluate(async ([y, sc, months, hq]) => {
  const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts'); const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts'); const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts'); const c = await import('/src/ui/common.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const g = wg.createGame(botc.defaultConfig(`fb-${y}-${sc}`, { startYear: y, scenario: sc }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < months; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  if (hq) g.player.hq = hq;
  sw.setSw(g, 'exp5.nav', true);
  Object.assign(sh.SH5, { region: 'sede', paper: null, pause: false, help: false });
  document.querySelectorAll('.m5-ccard').forEach((e) => e.remove());
  st.store.game = g; c.rerender();
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
}, [y, sc, months, hq]);
export const openOld = (p, area, tab) => p.evaluate(async ([area, tab]) => { const sh = await import('/src/ui/r31/shell5.ts'); sh.openPaper5(area, tab); }, [area, tab]);
export const closeAll = (p) => p.evaluate(async () => { const sh = await import('/src/ui/r31/shell5.ts'); Object.assign(sh.SH5, { paper: null, pause: false, help: false }); document.querySelectorAll('.overlay').forEach((e) => e.remove()); (await import('/src/ui/common.ts')).rerender(); });
