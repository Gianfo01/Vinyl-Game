// R33 · INT-2 — prints dos lugares novos e das lojas, pelo caminho do jogo (bonecos, casca do corte e prédio isométrico).
// Uso: npx vite --host 127.0.0.1 --port 5880 &   node scripts/r33/int2shots.mjs   → docs/r33/mocks/int2/*.png
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const IDS = ['bank', 'court', 'hospital', 'stadium', 'jazz', 'nightclub', 'church', 'tvstudio', 'adagency', 'samba', 'festival', 'print', 'pirate', 'station', 'port'];
const out = process.argv[2] ?? 'docs/r33/mocks/int2';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
for (const [name, q] of [...IDS.map((id) => [id, `s=sheet&id=${id}`]), ['lojas', 's=lojas']]) {
  await p.goto(`http://127.0.0.1:${process.env.PORT ?? 5880}/docs/r33/mocks/int2/galeria.html?${q}`);
  await p.waitForSelector('body[data-ready="1"]', { timeout: 60000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log('print', name);
}
await b.close();
if (errs.length) process.exit(1);
