// R33 · INT-1 — um print por interior novo e época (docs/r33/mocks/int1/<lugar>-<ano>.png).
// Uso: npx vite --host 127.0.0.1 --port 5880 &   node scripts/r33/shots-int1.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r33/mocks/int1';
const port = process.argv[3] ?? '5880';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 800 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
for (const k of ['school', 'plant', 'museum', 'platform', 'agency', 'branch']) {
  await p.goto(`http://127.0.0.1:${port}/docs/r33/mocks/int1/galeria.html?k=${k}`);
  await p.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await p.waitForTimeout(300);
  for (const box of await p.$$('[data-year]')) {
    const y = await box.getAttribute('data-year');
    await box.screenshot({ path: `${out}/${k}-${y}.png` });
    console.log('captura', k, y);
  }
}
await b.close();
if (errs.length) { console.error('erros:', errs.length); process.exit(1); }
