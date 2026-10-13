// R29 REORG — script Playwright (servidor: npx vite --port 5179). Ver docs/reorg29.md.
// uso: node shots.mjs <prefixo> <saida> area1 area2 ...   (áreas especiais: _home _newrun _full)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [pref, out, ...areas] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const ctx = await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('ERR', tag, e.message));
  await p.goto('http://localhost:5179/');
  await p.waitForTimeout(2000);
  const shot = async (name) => { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/${pref}-${name}-${tag}.png` }); };
  if (areas.includes('_home')) await shot('home');
  await p.getByRole('button', { name: /NOVA RUN|NEW RUN/ }).first().click();
  await p.waitForTimeout(800);
  if (areas.includes('_newrun')) await shot('novarun');
  if (areas.includes('_full')) { await p.getByRole('button', { name: /Configuração completa/ }).first().click().catch(() => {}); await shot('novarun-completa'); await p.keyboard.press('Escape'); await p.goto('http://localhost:5179/'); await p.waitForTimeout(1500); await p.getByRole('button', { name: /NOVA RUN|NEW RUN/ }).first().click(); await p.waitForTimeout(800); }
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA|START MY STORY/ }).first().click();
  await p.waitForTimeout(3000);
  // fecha cutscenes/overlays
  for (let i = 0; i < 6; i++) { const ov = await p.$('.overlay'); if (!ov) break; await p.keyboard.press('Escape'); await p.waitForTimeout(400); }
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(400); } }
  for (const a of areas.filter(x => !x.startsWith('_'))) {
    await p.evaluate((h) => { location.hash = h; }, `#/${a}`);
    await p.waitForTimeout(900);
    for (let i = 0; i < 3; i++) { const ov = await p.$('.overlay'); if (!ov) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
    await shot(a.replace(/[^a-z0-9]+/gi, '_'));
  }
  await ctx.close();
}
await b.close();
