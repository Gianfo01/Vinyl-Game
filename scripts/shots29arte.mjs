// R29 "arte consistente" — folhas de contato antes/depois (docs/arte29-consistencia.md).
// Uso: npx vite --port 5299 (na raiz) & node scripts/shots29arte.mjs <saída> [partes...]
// Partes: hq-garage … hq-campus, hqzoom, city, interiors, places, scenes14, art27 (tools/arte29c),
//         a29-<parte> (tools/artsheet29: places geo badges paper things people covers logos relics),
//         cut-new / cut-old (tools/cutsheet29). Depois rode scripts/pngq29.py para reduzir as PNG (paleta).
import { mkdirSync } from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const out = process.argv[2] ?? 'docs/shots29arte/antes';
const ALL = ['scene27', 'hq-garage', 'hq-shop', 'hq-loft', 'hq-building', 'hq-tower', 'hq-campus', 'hqzoom', 'city', 'interiors', 'places', 'scenes14', 'art27',
  'a29-places', 'a29-geo', 'a29-badges', 'a29-paper', 'a29-things', 'a29-people', 'a29-covers', 'a29-logos', 'a29-relics', 'cut-new', 'cut-old'];
const parts = process.argv.length > 3 ? process.argv.slice(3) : ALL;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const part of parts) {
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  pg.on('pageerror', (e) => console.error('PAGEERR', part, e.message));
  pg.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', part, m.text()); });
  const url = part.startsWith('a29-') ? `/tools/artsheet29/?part=${part.slice(4)}`
    : part.startsWith('cut-') ? `/tools/cutsheet29/?part=${part.slice(4)}&t=2.6` : `/tools/arte29c/?part=${part}`;
  await pg.goto(`http://localhost:5299${url}`, { waitUntil: 'networkidle' });
  await pg.waitForFunction(() => window.__done === true || document.querySelectorAll('canvas,img').length > 0, null, { timeout: 60000 }).catch(() => {});
  await pg.waitForTimeout(part === 'places' ? 1500 : 700);
  await pg.screenshot({ path: `${out}/${part}.png`, fullPage: true });
  await pg.close();
  console.log('ok', part);
}
await b.close();
