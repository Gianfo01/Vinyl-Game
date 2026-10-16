// R31 · onda 5 (INI) — capturas da tela inicial (3 épocas), do começo rápido, da configuração completa (2 etapas) e
// da prévia "Sua história" (3 escolhas). Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31ini5.mjs [porta]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5871';
const out = 'docs/r31/shots';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = async (last) => {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  if (last) await ctx.addInitScript((v) => { localStorage.setItem('vtn:ini5last:default', JSON.stringify(v)); localStorage.setItem('vtn:prefs', JSON.stringify({ reducedMotion: true, lang: 'pt' })); }, last);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
  return p;
};
const shot = async (p, name, o = {}) => { await p.waitForTimeout(800); await p.screenshot({ path: `${out}/onda5-ini-${name}.png`, ...o }); console.log('captura', name); };
for (const [y, c, car] of [[1905, 'rio', 'musician'], [1962, 'london', 'label'], [2025, 'new_york', 'festival']]) {
  const p = await page({ year: y, city: c, career: car });
  await shot(p, `inicio-${y}`);
  await p.context().close();
}
const p = await page({ year: 1962, city: 'london', career: 'label' });
await p.click('[data-h5="new"]'); await p.waitForTimeout(1200);
await shot(p, 'rapido');
// prévia em 3 escolhas: época, cidade e carreira mudam a cena na hora
const pick = async (year, city, career) => {
  await p.evaluate(([year, city, career]) => {
    const r = document.querySelector('.n5-ruler'); r.value = String(year); r.dispatchEvent(new Event('input', { bubbles: true }));
    const s = document.querySelector('[data-n5="city"]'); s.value = city; s.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector(`[data-career="${career}"]`)?.click();
  }, [year, city, career]);
  await p.waitForTimeout(900);
};
for (const [y, c, car] of [[1905, 'rio', 'musician'], [1962, 'london', 'label'], [2025, 'new_york', 'festival']]) {
  await pick(y, c, car);
  await shot(p, `previa-${y}`, { clip: await p.locator('.n5-prev').boundingBox() });
}
await pick(1962, 'london', 'label');
await p.click('[data-n5="full"]'); await p.waitForTimeout(1500);
await shot(p, 'completo-mundo', { fullPage: true });
await p.keyboard.press('}'); await p.keyboard.press('}'); await p.waitForTimeout(600);
await shot(p, 'completo-carreiras');
await p.keyboard.press('{'); await p.keyboard.press('{'); await p.waitForTimeout(400);
await p.evaluate(() => { const d = document.querySelector('.db31'); d.open = true; d.querySelector('[data-a3="BRA"]')?.click(); d.scrollIntoView({ block: 'center' }); });
await shot(p, 'completo-paises');
await b.close();
