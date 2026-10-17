// R31 · onda 5 (POL5) — TESTE de navegador: mundo → cidade → mundo por clique ("◂ Mundo"), por ⇧4 e por Esc, e o cartão da
// cidade antes de entrar. Sai com código 1 se algo falhar. Uso: node scripts/r31/check-pol5-mundo.mjs [pasta-capturas] [porta]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const out = process.argv[2]; const port = process.argv[3] ?? '5891';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(2500); p.setDefaultTimeout(120000);
await p.evaluate(async () => {
  const wg = await import('/src/sim/worldgen.ts'); const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts'); const sw = await import('/src/sim/r31/switches.ts'); const c = await import('/src/ui/common.ts'); const off = await import('/src/ui/tutoff19.ts');
  const g = wg.createGame(botc.defaultConfig('city', { startYear: 1975, scenario: 'established' }));
  off.setTutorials19(st.store.prefs, false); g.tutorial = { step: 99, done: true, seen: [] }; sw.setSw(g, 'exp5.nav', true); st.store.game = g; c.rerender();
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
});
const st = () => p.evaluate(() => ({ visit: !!document.querySelector('.m5-visit'), card: !!document.querySelector('.m5-ccard:not([hidden])'), map: !!document.querySelector('.wmap-canvas'), up: document.querySelector('.up5')?.textContent ?? null, pause: !!document.querySelector('.pz5') }));
const shot = async (n) => { await p.waitForTimeout(900); if (out) await p.screenshot({ path: `${out}/${n}.png` }); };
const toCountry = async () => { await p.evaluate(async () => { const m = await import('/src/ui/r31/map5ui.ts'); const st = await import('/src/ui/store.ts'); m.pointWorld5(st.store.game, 'FRA'); }); await p.waitForTimeout(1500); };
const pickCity = async () => { await p.locator('.m5-cbtn:not(.primary)').first().click(); await p.waitForTimeout(800); };
let ok = true; const check = (cond, msg) => { console.log(cond ? 'ok   ' : 'FALHA', msg); if (!cond) ok = false; };
await p.keyboard.press('Shift+Digit4'); await p.waitForTimeout(1500);
await toCountry(); await shot('city-0-pais');
await pickCity(); let s = await st(); await shot('city-1-cartao');
check(s.card && !s.visit, 'clicar na cidade abre o cartão antes de entrar');
await p.locator('.m5-cc-go').click(); await p.waitForTimeout(1500); s = await st(); await shot('city-2-visita');
check(s.visit && !!s.up, 'Ir para a cidade entra; botão ◂ Mundo à vista');
await p.locator('.up5').click(); await p.waitForTimeout(1200); s = await st(); check(!s.visit && s.map, 'clique em ◂ Mundo volta ao mapa');
await toCountry(); await pickCity(); await p.locator('.m5-cc-go').click(); await p.waitForTimeout(1500);
await p.keyboard.press('Shift+Digit4'); await p.waitForTimeout(1500); s = await st(); check(!s.visit && s.map, '⇧4 na cidade visitada volta ao mapa');
await toCountry(); await pickCity(); await p.locator('.m5-cc-go').click(); await p.waitForTimeout(1500);
await p.mouse.click(5, 300); await p.keyboard.press('Escape'); await p.waitForTimeout(1500); s = await st(); check(!s.visit && s.map && !s.pause, 'Esc na cidade visitada volta ao mapa (sem abrir a pausa)');
await toCountry(); await pickCity(); await p.keyboard.press('Escape'); await p.waitForTimeout(600); s = await st(); check(!s.card && !s.visit, 'Esc fecha o cartão sem entrar');
await shot('city-3-volta');
await b.close(); process.exit(ok ? 0 : 1);
