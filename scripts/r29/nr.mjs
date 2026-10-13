// R29 — capturas das 6 etapas da Nova run completa (NR01–NR06). node scripts/r29/nr.mjs <saida> <prefixo>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, pref] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', e => console.log('ERR', tag, e.message));
  await p.goto('http://localhost:5179/'); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Configuração completa/ }).first().click(); await p.waitForTimeout(1200);
  const tabs = await p.$$('.ng-tabs [role=tab]');
  for (let i = 0; i < tabs.length; i++) {
    await (await p.$$('.ng-tabs [role=tab]'))[i].click(); await p.waitForTimeout(600);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${out}/${pref}-NR0${i + 1}-${tag}.png` });
  }
}
await b.close();
