// Rodada 29 (arte) — folhas de contato (tools/artsheet29) em PNG. Uso: npx vite tools/artsheet29 --port 5299 & node scripts/sheets29.mjs [saída] [partes...]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29art';
const parts = process.argv.length > 3 ? process.argv.slice(3) : ['places', 'geo', 'badges', 'paper', 'things', 'people', 'covers', 'logos', 'relics'];
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const part of parts) {
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  pg.on('pageerror', (e) => console.error('PAGEERR', part, e.message));
  pg.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', part, m.text()); });
  await pg.goto(`http://localhost:5299/?part=${part}`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: `${out}/sheet-${part}.png`, fullPage: true });
  await pg.close();
}
await b.close();
console.log('ok', out);
