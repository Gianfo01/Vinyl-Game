// R29 — capturas de "Gravadoras no início" na Nova run rápida e na completa (servidor: npx vite --port 5181).
// node scripts/r29/labels.mjs <saida> <porta>   — ver docs/gravadoras29.md
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out = 'docs/shots29rivais', port = '5181'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', (e) => console.log('ERR', tag, e.message));
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  await p.fill('#h27-year', '1990'); await p.press('#h27-year', 'Tab'); await p.waitForTimeout(300);
  await p.selectOption('#h27-start', 'emerging');
  await p.selectOption('#h27-rivals', 'giants');
  await p.selectOption('#h27-labels', 'some'); await p.waitForTimeout(300);
  await p.locator('.h27-status').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/gravadoras-rapida-${tag}.png` });
  console.log(tag, 'rápida:', (await p.textContent('.h27-status b'))?.trim());
  // carreira de estúdio: aparece "Concorrentes no início"
  await p.locator('[data-career="studio"]').click(); await p.waitForTimeout(300);
  await p.selectOption('#h27-ven', 'many'); await p.waitForTimeout(300);
  await p.locator('.h27-status').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/gravadoras-rapida-estudio-${tag}.png` });
  console.log(tag, 'estúdio:', (await p.textContent('.h27-status b'))?.trim());
  // configuração completa pré-preenchida → etapa 4
  await p.getByRole('button', { name: /Configuração completa/ }).first().click(); await p.waitForTimeout(1500);
  await (await p.$$('.ng-tabs [role=tab]'))[3].click(); await p.waitForTimeout(700);
  await p.locator('.ng29-labels').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/gravadoras-completa-${tag}.png` });
  // até mais: número exato, porte, frequência, busca de reais
  await p.locator('.ng29-labels .ng22-seg button', { hasText: 'Número exato' }).click(); await p.waitForTimeout(900);
  await p.locator('#ng29-count').fill('14'); await p.locator('#ng29-count').dispatchEvent('change'); await p.waitForTimeout(400);
  await p.locator('.ng29-labels .ng22-seg button', { hasText: 'Poucas majors grandes' }).click(); await p.waitForTimeout(300);
  await p.locator('.ng29-labels .ng22-seg button', { hasText: 'Frequente' }).click(); await p.waitForTimeout(300);
  await p.locator('.ng29-incl-d summary').click(); await p.waitForTimeout(200);
  await p.fill('#ng29-search', 'mo'); await p.waitForTimeout(400);
  const inc = p.locator('[data-l29^="inc:"]').first();
  if (await inc.count()) { await inc.click(); await p.waitForTimeout(300); }
  await p.locator('.ng29-labels').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/gravadoras-completa-fino-${tag}.png`, fullPage: false });
  await p.locator('.ng29-incl').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/gravadoras-completa-incluir-${tag}.png` });
  const t2 = await p.$$('.ng-tabs [role=tab]');
  await t2[t2.length - 1].click(); await p.waitForTimeout(900);
  await p.evaluate(() => { const el = [...document.querySelectorAll('.ng-summary-full dd')].find((e) => /gravadoras/.test(e.textContent ?? '')); el?.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/gravadoras-revisao-${tag}.png` });
  console.log(tag, 'revisão:', await p.evaluate(() => [...document.querySelectorAll('.ng-summary-full dd')].map((e) => e.textContent).filter((x) => x && /gravadoras|Frequente/.test(x)).join(' | ')));
}
{
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
  let errs = 0;
  p.on('pageerror', (e) => { errs++; console.log('ERR jogo', e.message); });
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  await p.selectOption('#h27-labels', 'crowded'); await p.waitForTimeout(200);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(4500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.screenshot({ path: `${out}/gravadoras-jogo-desk.png` });
  console.log('jogo iniciado; erros de página:', errs);
}
await b.close();
