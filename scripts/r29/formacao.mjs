// R29 (formação) — capturas: escolha "Formação inicial das bandas reais" na Nova run completa e, numa Nova run rápida de
// 1962, a página dos Beatles com 4 integrantes (Ringo) e Pete Best como pessoa livre (sem banda, sem "ex-integrante").
// Servidor: npx vite --port 5183. Uso: node scripts/r29/formacao.mjs [saida] [porta] — ver docs/formacao29.md.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out = 'docs/shots29formacao', port = '5183'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const url = `http://localhost:${port}/`;
const closeOverlays = async (p) => {
  for (let i = 0; i < 8; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first();
  if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); }
};
const search = async (p, q) => {
  await p.evaluate(() => document.dispatchEvent(new CustomEvent('vtn15-palette'))); await p.waitForTimeout(400);
  await p.keyboard.type(q); await p.waitForTimeout(700);
};

// 1) Nova run completa: etapa Mundo, cartão "Qual mundo você quer?" com a escolha da formação
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', (e) => console.log('ERR', tag, e.message));
  await p.goto(url); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Configuração completa/ }).first().click(); await p.waitForTimeout(1500);
  await p.locator('.ng29-lineup').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/completa-formacao-${tag}.png` });
  console.log(tag, 'cartão:', (await p.textContent('.ng29-lineup'))?.slice(0, 200));
  await p.locator('[data-lineup29="original"] input').check(); await p.waitForTimeout(600);
  await p.locator('.ng29-lineup').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/completa-original-${tag}.png` });
  const tabs = await p.$$('.ng-tabs [role=tab]');
  await tabs[tabs.length - 1].click(); await p.waitForTimeout(900);
  await p.evaluate(() => { const el = [...document.querySelectorAll('.ng-summary-full *')].find((e) => /Formação inicial/.test(e.textContent ?? '') && (e.textContent ?? '').length < 80); el?.scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/completa-revisao-${tag}.png` });
}

// 2) Nova run rápida de 1962 (padrão): tenta sementes (a semente é sorteada) até os Beatles estarem no mundo
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  let ok = false;
  for (let tries = 0; tries < 12 && !ok; tries++) {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('ERR jogo', e.message));
    await p.goto(url); await p.waitForTimeout(1500);
    await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
    await p.fill('#h27-year', '1962'); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(4000);
    await closeOverlays(p);
    await search(p, 'The Beatles');
    const hit = p.locator('.pal15-list li, .pal15 li, [role=option]').filter({ hasText: /The Beatles/ }).first();
    if (!(await hit.count())) { console.log('tentativa', tries, 'sem Beatles'); await p.close(); continue; }
    await hit.click(); await p.waitForTimeout(1200);
    const txt = await p.textContent('body');
    if (!/John Lennon/.test(txt ?? '')) { console.log('tentativa', tries, 'página sem integrantes'); await p.close(); continue; }
    ok = true;
    await p.screenshot({ path: `${out}/rapida-beatles-1962-desk.png` });
    const mem = await p.evaluate(() => [...document.querySelectorAll('h4')].map((x) => x.textContent).join(' | '));
    console.log('seções:', mem.slice(0, 300));
    await p.locator('.overlay button').filter({ hasText: /^.?\s*Integrantes/ }).first().click(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/rapida-beatles-integrantes-desk.png` });
    await p.locator('.overlay button').filter({ hasText: /Formação/ }).first().click(); await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/rapida-beatles-formacao-desk.png` });
    console.log('aba Formação:', (await p.textContent('.overlay'))?.replace(/\s+/g, ' ').match(/Formação.{0,500}/g)?.slice(-1)[0]);
    console.log('aba Integrantes:', (await p.textContent('.overlay'))?.replace(/\s+/g, ' ').match(/Integrantes.{0,400}/g)?.slice(-1)[0]);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400); await closeOverlays(p);
    await search(p, 'Pete Best');
    const pete = p.locator('.pal15-list li, .pal15 li, [role=option]').filter({ hasText: /Pete Best/ }).first();
    if (await pete.count()) {
      await pete.click(); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${out}/rapida-pete-best-livre-desk.png` });
      console.log('Pete Best:', (await p.textContent('body'))?.match(/Pete Best.{0,300}/)?.[0]);
    } else console.log('Pete Best não achado na busca');
  }
  console.log('Beatles achados:', ok);
}
await b.close();
