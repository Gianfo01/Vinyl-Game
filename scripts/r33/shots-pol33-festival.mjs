// R33 · POL33-A item 2 — prints do festival ao ar livre (docs/r33/pol/festival-<ano>-<clima>.png). Uso: npx vite --port 5933 &  node scripts/r33/shots-pol33-festival.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto('http://127.0.0.1:5933/'); await p.waitForTimeout(3000);
for (const [y, m, c] of [[1889, 5, 'sol'], [1920, 8, 'nublado'], [1962, 6, 'sol'], [1975, 3, 'chuva'], [1995, 7, 'noite'], [2025, 10, 'sol'], [2035, 0, 'noite']]) {
  const u = await p.evaluate(async ([y, m, c]) => {
    await import('/src/sim/worldgen.ts');
    const f = await import('/src/ui/r33/festival33px.ts');
    const cv = document.createElement('canvas'); f.drawFestival33(cv, { year: y, month: m, clima: c });
    const o = document.createElement('canvas'); o.width = cv.width * 3; o.height = cv.height * 3; const g = o.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, o.width, o.height);
    return o.toDataURL('image/png');
  }, [y, m, c]);
  writeFileSync(`docs/r33/pol/festival-${y}-${c}.png`, Buffer.from(u.split(',')[1], 'base64')); console.log('captura', y, c);
}
await b.close();
