// R29 REORG — script Playwright (servidor: npx vite --port 5179). Ver docs/reorg29.md.
// M48: sem rolagem horizontal global em 390×844 e 1440×900, com textos extremos (nome de selo enorme) em todas as páginas do menu
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const res = {};
for (const [vw, vh, tag] of [[390, 844, 'mob'], [1440, 900, 'desk']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:5179/'); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(600);
  // nome extremo no campo do selo, se existir
  const name = p.locator('input[type=text]').first();
  if (await name.count()) { await name.fill('Gravadora Internacional de Discos Fonográficos e Fitas Magnéticas Extraordinariamente Longas Ltda'); }
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  const areas = await p.evaluate(() => []);
  const ids = ['cockpit','sede25','hq','campus18','plan','goals','diary','artists','people','dyn18','contracts19','market','knownacts27','directory','talent18','management','managers14','producers15','project','creation','songmkt27','studio','releases','catalog','tribute19','media19','shows','cal17','live19','festivals','awards','rockhall','mundo27','known27','news17','charts','labels','industry','regions18','market19a','media','critics','zines19','world','world17','after18','regions19','crime','fakes19','lendas','movements','society18','dm18','finance','business','supply18','agenda17','team','company','firm19','long18','calendar19','rights18','careers','ventures','you','personal','wealth','night14','scenes17','cp17-label'];
  const bad = [];
  for (const a of ids) {
    await p.evaluate((h) => { location.hash = h; }, `#/${a}`); await p.waitForTimeout(350);
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, area: location.hash }));
    if (o.sw > o.cw + 1) bad.push(`${a}:${o.sw}>${o.cw}`);
  }
  res[tag] = { checked: ids.length, overflow: bad, errors: errs.slice(0, 5) };
}
console.log(JSON.stringify(res, null, 1));
await b.close();
