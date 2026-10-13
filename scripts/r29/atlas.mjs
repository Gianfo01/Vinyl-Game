// R29 REORG — capturas das telas no estilo do Atlas (servidor: npx vite --port 5179). node scripts/r29/atlas.mjs <saida> <prefixo>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, pref] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', e => console.log('ERR', tag, e.message));
  const clear = async () => { for (let i = 0; i < 10; i++) { if (!(await p.$('.overlay'))) break; const later = p.getByRole('button', { name: /Decidir depois/ }).first(); if (await later.count()) await later.click().catch(() => {}); else await p.keyboard.press('Escape'); await p.waitForTimeout(350); } };
  await p.goto('http://localhost:5179/'); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(2500);
  await clear();
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  for (let i = 0; i < 3; i++) { await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }))); await p.waitForTimeout(2500); await clear(); }
  for (const a of (process.argv[4] ?? 'calendar19,finance,market,directory,contracts19,you,crime,hq,shows,mundo27,agenda17').split(',')) {
    await p.evaluate((h) => { location.hash = h; }, `#/${a}`); await p.waitForTimeout(1000); await clear();
    await p.screenshot({ path: `${out}/${pref}-${a}-${tag}.png` });
  }
  await p.evaluate(() => { location.hash = '#/s17'; }); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${pref}-campanha-${tag}.png` });
}
await b.close();
