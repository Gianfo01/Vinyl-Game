// Captura a galeria INT-2 pelo navegador (precisa do vite: npx vite --host 127.0.0.1 --port 5880).
// Uso: node scripts/r33/int2shot-gal.mjs "<query>" saida.png
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const [query, out] = [process.argv[2] ?? 's=ref', process.argv[3] ?? '/tmp/gal.png'];
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${process.env.PORT ?? 5880}/docs/r33/mocks/int2/galeria.html?${query}`);
await p.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true });
await b.close();
