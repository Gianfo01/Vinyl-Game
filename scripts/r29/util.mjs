// R29 REORG — script Playwright (servidor: npx vite --port 5179). Ver docs/reorg29.md.
// node util.mjs <saida> <prefixo>  — abre Índice, Campanha e rotas por alias
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, pref] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', e => console.log('ERR', tag, e.message));
  await p.goto('http://localhost:5179/'); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  const run = async (fn, name) => { await p.evaluate(fn); await p.waitForTimeout(800); await p.screenshot({ path: `${out}/${pref}-${name}-${tag}.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); };
  await run(() => { location.hash = '#/s15'; }, 'alias-s15');
  console.log(tag, 'hash after s15:', await p.evaluate(() => location.hash));
  await p.evaluate(() => { location.hash = '#/submundo'; }); await p.waitForTimeout(600); console.log(tag, 'submundo ->', await p.evaluate(() => location.hash));
  await p.evaluate(() => { location.hash = '#/inbox'; }); await p.waitForTimeout(600); console.log(tag, 'inbox ->', await p.evaluate(() => location.hash));
  await run(() => { location.hash = '#/S17'; }, 'campanha');
  await p.evaluate(() => { location.hash = '#/cockpit'; }); await p.waitForTimeout(500);
  await run(() => { document.dispatchEvent(new CustomEvent('vtn15-palette')); }, 'x');
  // índice via paleta
  await p.evaluate(() => document.dispatchEvent(new CustomEvent('vtn15-palette'))); await p.waitForTimeout(400);
  await p.keyboard.type('indice'); await p.waitForTimeout(400); await p.keyboard.press('Enter'); await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/${pref}-indice-${tag}.png` }); await p.keyboard.press('Escape');
  await p.evaluate(() => document.dispatchEvent(new CustomEvent('vtn15-palette'))); await p.waitForTimeout(400);
  await p.keyboard.type('fraudes'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/${pref}-busca-fraudes-${tag}.png` }); await p.keyboard.press('Escape');
}
await b.close();
