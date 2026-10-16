// R31 · onda 5 (ART5) — capturas da galeria da arte nova (objetos por época e estado, papéis, caixa de entrada, ícones).
// Uso: npx vite --host 127.0.0.1 --port 5880 &   node scripts/r31/shots-exp5art.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5880';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1500, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
for (const s of ['recepcao', 'sala', 'reuniao', 'casa', 'papeis', 'caixa', 'icones']) {
  await p.goto(`http://127.0.0.1:${port}/docs/r31/mocks/onda5/galeria-art.html?s=${s}`);
  await p.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/onda5-art-galeria-${s}.png`, fullPage: true });
  console.log('captura', s);
}
await b.close();
if (errs.length) { console.error('erros:', errs.length); process.exit(1); }
