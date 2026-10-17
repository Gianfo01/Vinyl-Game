// R31 · DECO-A — capturas da galeria da decoração. Uso: npx vite --host 127.0.0.1 --port 5891 &   node scripts/r31/shots-deco.mjs [pasta] [porta] [seções…]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5891';
const secs = process.argv.slice(4).length ? process.argv.slice(4) : ['moveis', 'quadros', 'plantas', 'luzes', 'som', 'colecao', 'padroes', 'janelas', 'letreiros', 'estilos', 'upgrades', 'comodos'];
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
for (const s of secs) {
  await p.goto(`http://127.0.0.1:${port}/docs/r31/mocks/deco/galeria-deco.html?s=${s}`);
  await p.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/deco-a-galeria-${s}.png`, fullPage: true });
  console.log('captura', s);
}
await b.close();
if (errs.length) { console.error('erros:', errs.length); process.exit(1); }
