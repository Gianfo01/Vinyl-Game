// R33 · POL33-A — ajudante dos scripts de print: abre o jogo pelo fluxo real (NOVA RUN → ano → COMEÇAR MINHA HISTÓRIA → Esc → Continuar).
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
export const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
export async function open(port = 5933, year = 1962) {
  const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1912, height: 867 }, locale: 'pt-BR' });
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.addInitScript(() => { window.__imp = (path) => { const e = performance.getEntriesByType('resource').map((x) => x.name).find((n) => n.includes(path + '?t=') || n.endsWith(path)); return import(e ?? path); }; });
  await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
  await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1200);
  await p.evaluate((y) => { const i = document.querySelector('input[data-n5=year]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, String(y)); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, year);
  await p.locator('button', { hasText: 'COMEÇAR MINHA' }).first().click({ force: true }); await p.waitForTimeout(3500);
  await p.keyboard.press('Escape'); await p.waitForTimeout(2000);
  for (let i = 0; i < 4; i++) { const has = await p.evaluate(async () => !!(await window.__imp('/src/ui/store.ts')).store.game); if (has) break; await p.locator('button', { hasText: /ontinuar/ }).first().click({ force: true, timeout: 3000 }).catch(() => {}); await p.waitForTimeout(2000); }
  await p.locator('button', { hasText: /^Começar$/ }).first().click({ force: true, timeout: 2000 }).catch(() => {}); await p.waitForTimeout(500);
  return { b, p };
}
