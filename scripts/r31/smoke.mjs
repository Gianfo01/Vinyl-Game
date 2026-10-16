// Masters 31 — teste de fumaça da build de arquivo único: abre no Chromium, começa uma partida nova,
// avança alguns meses pelo botão do topo e falha se houver erro de página ou se o jogo não avançar.
// Uso: node scripts/r31/smoke.mjs Masters_31_ondaN.html [meses]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pwPath = process.env.PLAYWRIGHT_PATH ?? (() => { try { return require.resolve('playwright'); } catch { return '/opt/node-tools/node_modules/playwright'; } })();
const { chromium } = require(pwPath);
const file = resolve(process.argv[2] ?? 'Masters_31.html');
const months = Number(process.argv[3] ?? 6);
const exe = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b = await chromium.launch(require('node:fs').existsSync(exe) ? { executablePath: exe } : {});
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('dialog', (d) => { errs.push('janela do navegador: ' + d.message()); d.dismiss(); });
await p.goto('file://' + file); await p.waitForTimeout(4000);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(5000);
const label = async () => (await p.locator('.topbar, .t5').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160);
const before = await label();
for (let i = 0; i < months; i++) {
  for (let k = 0; k < 3; k++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150); }
  await p.locator('.overlay button, .modal button').filter({ hasText: /OK|Fechar|Continuar|Entendi|Pular/i }).first().click({ timeout: 800 }).catch(() => {});
  await p.locator('.topbar .advance .btn.primary').first().click({ timeout: 8000 }).catch(() => p.keyboard.press('Control+Enter'));
  await p.waitForTimeout(1500);
  await p.getByText(/Aceitar padrões e avançar|Accept defaults and advance/).first().click({ timeout: 1500 }).catch(() => {});
  await p.waitForTimeout(2000);
}
const after = await label();
await p.screenshot({ path: resolve('dist-single/smoke.png') }).catch(() => {});
await b.close();
console.log('antes:', before); console.log('depois:', after);
if (errs.length) { console.error('ERROS:\n' + errs.join('\n')); process.exit(1); }
if (before === after) { console.error('o topo não mudou: o jogo não avançou'); process.exit(1); }
console.log('fumaça ok');
