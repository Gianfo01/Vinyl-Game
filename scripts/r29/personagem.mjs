// R29 — capturas do "Seu personagem" da Nova run rápida (selo e artista vocal + guitarra) e dos chips na ficha completa.
// Servidor: npx vite --port 5191. Uso: node scripts/r29/personagem.mjs <saida> [porta]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, port = '5191'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [vw, vh, tag] of [[1440, 900, 'desk'], [390, 844, 'mob']]) {
  const p = await (await b.newContext({ viewport: { width: vw, height: vh }, locale: 'pt-BR' })).newPage();
  p.on('pageerror', (e) => console.log('ERR', tag, e.message));
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(800);
  const shot = async (name) => {
    await p.evaluate(() => document.querySelector('.c29')?.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${name}-${tag}.png` });
  };
  // 1) selo (padrão): bloco com nome/idade sorteados
  await shot('rapida-selo');
  if (tag === 'mob') { await p.click('.c29-more > summary'); await p.waitForTimeout(300); await shot('rapida-selo-aberto'); }
  // 2) artista: vocal + guitarra, banda de 4 com nome sorteado
  await p.click('[data-career=musician]'); await p.waitForTimeout(400);
  if (tag === 'mob' && !(await p.$('.c29-more[open]'))) { await p.click('.c29-more > summary'); await p.waitForTimeout(200); }
  await p.selectOption('#c29-role', 'vocal');
  await p.click('.c29 .c29-chip[data-role=guitar]');
  await p.selectOption('#c29-members', '4');
  await p.click('.c29-bandname .c29-dice');
  await p.waitForTimeout(300);
  await shot('rapida-artista');
  await p.click('.c29 .c29-chip[data-role=keys]'); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('.c29-roles')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${out}/rapida-artista-limite-${tag}.png` });
  console.log(tag, 'status:', await p.textContent('.h27-status'));
  console.log(tag, 'overflow:', await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth));
  // 3) ficha completa (Personagem) recebe o rascunho: mesmos chips
  await p.click('.h27-full'); await p.waitForTimeout(1200);
  const tabs = await p.$$('.ng-tabs [role=tab]');
  if (tabs[1]) { await tabs[1].click(); await p.waitForTimeout(600); }
  await p.evaluate(() => document.querySelector('.ng29-roles')?.scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/completa-instrumentos-${tag}.png` });
}
await b.close();
