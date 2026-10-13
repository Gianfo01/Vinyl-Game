// R29 — capturas do gênero sugerido (cidade × ano) na Nova run rápida e na ficha completa.
// Servidor: npx vite --port 5191. Uso: node scripts/r29/genero.mjs <saida> [porta]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, port = '5191'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', (e) => console.log('ERR', tag, e.message));
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  await p.click('[data-career=musician]'); await p.waitForTimeout(300);
  if (!(await p.$('.c29-more[open]'))) { await p.click('.c29-more > summary'); await p.waitForTimeout(200); }
  const genre = async () => p.evaluate(() => { const s = document.querySelector('#c29-genre'); return s ? s.options[s.selectedIndex]?.textContent : null; });
  const at = async (name) => { await p.evaluate(() => document.querySelector('#c29-genre')?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}-${tag}.png` }); };
  console.log(tag, 'Londres 1962:', await genre());
  await at('genero-londres-1962');
  await p.selectOption('#h27-city', 'rio'); await p.waitForTimeout(300);
  console.log(tag, 'Rio 1962:', await genre());
  await at('genero-rio-1962');
  await p.fill('#h27-year', '1975'); await p.dispatchEvent('#h27-year', 'change');
  await p.selectOption('#h27-city', 'new_york'); await p.waitForTimeout(300);
  console.log(tag, 'Nova York 1975:', await genre());
  await p.click('.c29-art .c29-inrow .c29-dice'); await p.waitForTimeout(200);
  console.log(tag, 'Nova York 1975 após 🎲:', await genre());
  await at('genero-ny-1975-dado');
  await p.fill('#h27-year', '2010'); await p.dispatchEvent('#h27-year', 'change');
  await p.selectOption('#h27-city', 'atlanta'); await p.waitForTimeout(300);
  console.log(tag, 'Atlanta 2010:', await genre());
  await at('genero-atlanta-2010');
  // ficha completa (Modo → bloco da banda)
  await p.click('.h27-full'); await p.waitForTimeout(1200);
  const tabs = await p.$$('.ng-tabs [role=tab]');
  if (tabs[2]) { await tabs[2].click(); await p.waitForTimeout(600); }
  await p.evaluate(() => document.querySelector('.band-box')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  console.log(tag, 'completa:', await p.evaluate(() => { const s = document.querySelector('.band-box select'); return s ? s.options[s.selectedIndex]?.textContent : null; }));
  await p.screenshot({ path: `${out}/genero-completa-${tag}.png` });
}
await b.close();
