// Uso: node scripts/r31/salas5/shoot.mjs <porta> <antes|depois> <pasta>
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const [port, m, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const exe = `/opt/pw-browsers/${readdirSync('/opt/pw-browsers').find((d) => d.startsWith('chromium-'))}/chrome-linux/chrome`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
const scenes = (process.env.SCENES ?? 'composicao,estudio,guerra,crise,coletiva,escandalo,estrada,golpe').split(',');
for (const s of scenes) for (const y of [1935, 1975, 2015]) {
  let ok = false;
  for (let k = 0; k < 3 && !ok; k++) {
    await p.goto(`http://127.0.0.1:${port}/scripts/r31/salas5/index.html?m=${m}&s=${s}&y=${y}`);
    try { await p.waitForFunction(() => document.title === 'ok', null, { timeout: 30000 }); ok = true; } catch { /* tenta de novo */ }
  }
  if (!ok) { console.error('falhou', s, y); continue; }
  await p.waitForTimeout(300);
  await p.locator('#cv').screenshot({ path: `${out}/${s}-${y}.png` });
  console.log(s, y);
}
await b.close();
