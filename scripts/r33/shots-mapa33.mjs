// R33 · MAPA33 — prints da cidade expandida (docs/r33/mocks/mapa33/*.png): 1962 e 2025 em Londres (rio), Sydney (porto/baía) e Rio (mar, morro, Quadra do samba).
// Uso: npx vite --host 127.0.0.1 --port 5933 &   node scripts/r33/shots-mapa33.mjs [porta]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5933';
const out = 'docs/r33/mocks/mapa33';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1400, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
for (const [city, year] of [['london', 1962], ['london', 2025], ['sydney', 2025], ['rio', 1962], ['rio', 2025]]) {
  for (const on of [true, false]) {
    const url = await p.evaluate(async ([city, year, on]) => {
      const bot = await import('/src/sim/bot.ts'), wg = await import('/src/sim/worldgen.ts'), tk = await import('/src/sim/tick.ts');
      const sw = await import('/src/sim/r31/switches.ts'), cp = await import('/src/sim/sys/campus18.ts'), ui = await import('/src/ui/sys/campus18.ts');
      await import('/src/sim/r33/index.ts');
      const cfg = bot.defaultConfig(`mapa33-${city}-${year}`, { startYear: year, homeCity: city });
      cfg.dbSize = 'small';
      const g = wg.createGame(cfg); tk.advanceWeek(g);
      if (on) { sw.setSw(g, 'exp33.mapa', true); cp.campus18(g).dist = cp.DIST18.length - 1; }
      else cp.campus18(g).dist = cp.DIST_BASE18 - 1;
      const cv = ui.campusThumb18(g).querySelector('canvas');
      // plano: contorno e número dos lotes (amarelo = lotes novos 58–83, magenta = os de sempre) sobre a mesma cena
      const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height;
      const x = c2.getContext('2d'); x.drawImage(cv, 0, 0);
      const gh = on ? 40 : 32, ox = gh * 8 + 6, iso = (gx, gy) => [ox + (gx - gy) * 8, 76 + (gx + gy) * 4];
      cp.LOTS18.forEach((L, i) => {
        if (i >= (on ? 84 : 58)) return;
        const q = [iso(L.gx, L.gy), iso(L.gx + L.w, L.gy), iso(L.gx + L.w, L.gy + L.d), iso(L.gx, L.gy + L.d)];
        x.strokeStyle = i >= 58 ? '#ffe040' : '#e060e0'; x.beginPath(); x.moveTo(...q[0]); q.slice(1).forEach((z) => x.lineTo(...z)); x.closePath(); x.stroke();
        const c = iso(L.gx + L.w / 2, L.gy + L.d / 2); x.font = '8px monospace'; x.fillStyle = '#000'; x.fillText(String(i), c[0] - 5, c[1] + 1); x.fillStyle = '#fff'; x.fillText(String(i), c[0] - 6, c[1]);
      });
      return [cv.toDataURL('image/png'), c2.toDataURL('image/png')];
    }, [city, year, on]);
    writeFileSync(`${out}/${city}-${year}-${on ? 'expandida' : 'antes'}.png`, Buffer.from(url[0].split(',')[1], 'base64'));
    if (on) writeFileSync(`${out}/${city}-${year}-plano.png`, Buffer.from(url[1].split(',')[1], 'base64'));
    console.log('captura', city, year, on ? 'expandida' : 'antes');
  }
}
await b.close();
