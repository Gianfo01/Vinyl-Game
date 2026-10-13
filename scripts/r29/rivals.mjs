// R29 — capturas do "Nível dos rivais" na Nova run rápida e na completa (servidor: npx vite --port 5181).
// node scripts/r29/rivals.mjs <saida>   — ver docs/rivais29.md
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out = 'docs/shots29rivais', port = '5181'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', (e) => console.log('ERR', tag, e.message));
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  // Nova run rápida
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  await p.selectOption('#h27-start', 'emerging'); await p.waitForTimeout(200);
  await p.selectOption('#h27-rivals', 'giants'); await p.waitForTimeout(300);
  await p.locator('.h27-status').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/rapida-gigantes-${tag}.png` });
  console.log(tag, 'status rápida:', (await p.textContent('.h27-status'))?.slice(0, 160));
  await p.selectOption('#h27-rivals', 'hipster'); await p.waitForTimeout(300);
  await p.locator('.h27-status').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/rapida-hipster-${tag}.png` });
  await p.selectOption('#h27-rivals', 'giants'); await p.waitForTimeout(200);
  // configuração completa pré-preenchida (mesmo rascunho): etapa "Gravadoras e rivais"
  await p.getByRole('button', { name: /Configuração completa/ }).first().click(); await p.waitForTimeout(1500);
  const tabs = await p.$$('.ng-tabs [role=tab]');
  await tabs[3].click(); await p.waitForTimeout(700);
  await p.locator('.ng29-rivals').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/completa-rivais-${tag}.png` });
  // escolhe "Um líder dominante" no cartão e vai à revisão
  await p.locator('[data-rivals29="leader"] input').check(); await p.waitForTimeout(900);
  await p.locator('.ng29-rivals').scrollIntoViewIfNeeded();
  await p.screenshot({ path: `${out}/completa-lider-${tag}.png` });
  const t2 = await p.$$('.ng-tabs [role=tab]');
  await t2[t2.length - 1].click(); await p.waitForTimeout(900);
  await p.evaluate(() => { const el = [...document.querySelectorAll('.ng-summary-full td, .ng-summary-full dd, .ng-summary-full span, .ng-summary-full li')].find((e) => /rival dominante/.test(e.textContent ?? '')); el?.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/completa-revisao-${tag}.png` });
  console.log(tag, 'revisão:', await p.evaluate(() => [...document.querySelectorAll('.ng-summary-full *')].map((e) => e.textContent).find((x) => x && /rival dominante/.test(x) && x.length < 80)));
}
// a partida começa de verdade com o nível escolhido (sem erro de página)
{
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
  let errs = 0;
  p.on('pageerror', (e) => { errs++; console.log('ERR jogo', e.message); });
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  await p.selectOption('#h27-rivals', 'leader'); await p.waitForTimeout(200);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(4000);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  await p.screenshot({ path: `${out}/jogo-lider-desk.png` });
  console.log('jogo iniciado; erros de página:', errs);
}
await b.close();
