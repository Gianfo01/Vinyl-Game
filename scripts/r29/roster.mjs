// R29 — capturas do Elenco (S04) com 2+ artistas: contrata pelo console de testes? Não: joga como "estabelecido".
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, pref] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', e => console.log('ERR', tag, e.message));
  const clear = async () => { for (let i = 0; i < 10; i++) { if (!(await p.$('.overlay'))) break; const later = p.getByRole('button', { name: /Decidir depois/ }).first(); if (await later.count()) await later.click().catch(() => {}); else await p.keyboard.press('Escape'); await p.waitForTimeout(350); } };
  await p.goto('http://localhost:5179/'); if (process.argv[6] === 'detail') await p.evaluate(() => localStorage.setItem('vtn29.rosterView', 'detail')); await p.waitForTimeout(1500);
  // cenário histórico com elenco (se houver), senão a run rápida
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(700);
  if (await p.$('#h27-start')) { await p.selectOption('#h27-start', 'established'); await p.waitForTimeout(400); }
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(3000);
  await clear();
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  for (const a of (process.argv[4] ?? 'artists').split(',')) {
    await p.evaluate((h) => { location.hash = h; }, `#/${a}`); await p.waitForTimeout(1200); await clear();
    await p.screenshot({ path: `${out}/${pref}-${a}-${tag}.png` });
    if (a === 'artists' && process.argv[5] === 'batch') {
      const cbs = await p.$$('.bb29-chips input'); for (const c of cbs.slice(0, 3)) await c.check().catch(() => {});
      await p.waitForTimeout(400);
      const btn = p.getByRole('button', { name: /Prévia da ação em lote/ }).first(); if (await btn.count()) { await btn.click(); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${pref}-lote-${tag}.png` }); await p.keyboard.press('Escape'); }
    }
  }
}
await b.close();
