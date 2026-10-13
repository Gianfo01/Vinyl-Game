// R29 REORG — script Playwright (servidor: npx vite --port 5179). Ver docs/reorg29.md.
// node cycle.mjs <saida> <prefixo>: começa, avança 3 meses, fotografa calendário/cockpit; recarrega e continua (retomada)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, pref] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', tag, e.message));
  const clear = async () => { for (let i = 0; i < 10; i++) { const later = p.getByRole('button', { name: /Decidir depois|Fechar|Pular|Continuar$/ }).first(); if (await p.$('.overlay, [role=dialog]')) { if (await later.count()) await later.click().catch(() => {}); else await p.keyboard.press('Escape'); await p.waitForTimeout(400); } else break; } };
  await p.goto('http://localhost:5179/'); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(2500);
  await clear();
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => { const e = new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }); window.dispatchEvent(e); });
    await p.waitForTimeout(2500);
    for (let k = 0; k < 10; k++) { const ov = await p.$('.overlay'); if (!ov) break; const btn = await p.$('.overlay button.primary, .overlay .btn.primary'); if (btn) { await btn.click().catch(() => {}); } else await p.keyboard.press('Escape'); await p.waitForTimeout(500); }
  }
  console.log(tag, 'date', await p.evaluate(() => document.querySelector('.top, header')?.textContent?.slice(0, 80)));
  await p.evaluate(() => { location.hash = '#/calendar19'; }); await p.waitForTimeout(1000); await clear();
  await p.screenshot({ path: `${out}/${pref}-calendar19-${tag}.png`, fullPage: false });
  const rv = await p.$('.rv29'); if (rv) await rv.screenshot({ path: `${out}/${pref}-revisao-${tag}.png` });
  await p.evaluate(() => { location.hash = '#/cockpit/ck20=panel'; }); await p.waitForTimeout(1000); await clear();
  await p.screenshot({ path: `${out}/${pref}-cockpit-${tag}.png` });
  await p.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 1e6; window.scrollTo(0, 1e6); }); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/${pref}-cockpit-fim-${tag}.png` });
  // recarrega e continua (retomada)
  await p.reload(); await p.waitForTimeout(1800);
  await p.click('.h27-cont'); await p.waitForTimeout(3000);
  for (let i = 0; i < 4; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.screenshot({ path: `${out}/${pref}-retomada-${tag}.png` });
  await ctx.close();
}
await b.close();
