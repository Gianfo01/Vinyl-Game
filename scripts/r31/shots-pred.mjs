// R31 · onda 4 (PRED) — capturas da arte por tipo de prédio: mapa antes/depois (Londres 1965, Rio 1975, Nova York 2012,
// São Paulo 2036) e galeria com todos os tipos lado a lado por época (docs/r31/shots/onda4-pred-*.png).
// Uso: npx vite --host 127.0.0.1 --port 5881 &   node scripts/r31/shots-pred.mjs [porta] [antes|depois|galeria|tudo]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5881';
const mode = process.argv[3] ?? 'tudo';
const out = 'docs/r31/shots';
mkdirSync(out, { recursive: true });
const exe = `/opt/pw-browsers/${readdirSync('/opt/pw-browsers').find((d) => d.startsWith('chromium-'))}/chrome-linux/chrome`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1500, height: 1300 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(180000);
const game = (cfg) => p.evaluate(async ([cfg]) => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const c = bot.defaultConfig(cfg.seed, { startYear: cfg.year, homeCity: cfg.city });
  c.dbSize = 'small'; c.realNames = true;
  const g = wg.createGame(c);
  g.tutorial = { step: 99, done: true, seen: [] };
  const off = await import('/src/ui/tutoff19.ts'); off.setTutorials19(st.store.prefs, false);
  g.player.cash += 5e8;
  for (let i = 0; i < 3; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g; window.__g = g;
  return { y: g.year, city: g.config.homeCity };
}, [cfg]);
const area = async (a) => { await p.evaluate(async ([a]) => {
  const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove()); st.store.area = a; c.rerender();
}, [a]); await p.waitForTimeout(1500); };
const btn = async (re) => { await p.evaluate((src) => { const r = new RegExp(src); for (const x of document.querySelectorAll('button')) if (r.test(x.textContent?.trim() ?? '')) { x.click(); return; } }, re.source); await p.waitForTimeout(700); };

if (mode === 'antes' || mode === 'depois' || mode === 'tudo') {
  const tag = mode === 'tudo' ? 'depois' : mode;
  for (const [seed, year, city, name] of [['pred-lon', 1965, 'london', 'londres-1965'], ['pred-rio', 1975, 'rio', 'rio-1975'], ['pred-ny', 2012, 'new_york', 'ny-2012'], ['pred-sp', 2036, 'sao_paulo', 'sp-2036']]) {
    console.log(await game({ seed, year, city }));
    await area('campus18'); await btn(/^Dia$/);
    await p.waitForTimeout(800);
    const el = await p.$('.c27-frame');
    await (el ?? p).screenshot({ path: `${out}/onda4-pred-mapa-${name}-${tag}.png` });
    console.log('captura', name, tag);
  }
}
if (mode === 'galeria' || mode === 'tudo') {
  // galeria: todos os tipos lado a lado, uma imagem por época (cada célula = o sprite do mapa ampliado 3×)
  const eras = [[1905, '1889-1919'], [1935, '1920-1949'], [1962, '1950-1969'], [1978, '1970-1989'], [2000, '1990-2009'], [2030, '2010-2040']];
  for (const [year, nm] of eras) {
    const url = await p.evaluate(async ([year]) => {
      const px = await import('/src/ui/pixel/campus18px.ts');
      const pr = await import('/src/ui/pixel/pred31.ts');
      const font = await import('/src/ui/pixel/font.ts');
      const arts = pr.ART31_ALL;
      const cols = 7, cw = 150, ch = 190, sc = 2, k = 2;
      const rows = Math.ceil(arts.length / cols);
      const cv = document.createElement('canvas'); cv.width = cols * cw * sc; cv.height = rows * ch * sc + 12 * sc;
      const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#7a9a58'; ctx.fillRect(0, 0, cv.width, cv.height);
      const small = document.createElement('canvas'); small.width = cols * cw; small.height = rows * ch + 12;
      const s2 = small.getContext('2d'); s2.imageSmoothingEnabled = false;
      s2.fillStyle = '#7a9a58'; s2.fillRect(0, 0, small.width, small.height);
      font.drawText(s2, `PREDIOS ${year}`, 4, 3, '#170e12');
      arts.forEach((a, i) => {
        const cx = (i % cols) * cw, cy = Math.floor(i / cols) * ch + 12;
        s2.fillStyle = (i + Math.floor(i / cols)) % 2 ? '#86a464' : '#7a9a58'; s2.fillRect(cx, cy, cw, ch);
        const sp = px.artSprite31(a, year, 7 + i);
        const ox = Math.round(cx + cw / 2 - (sp.door[0] - sp.x) * k), oy = Math.round(cy + ch - 16 - (sp.door[1] - sp.y) * k - 6);
        s2.drawImage(sp.c, ox, oy, sp.c.width * k, sp.c.height * k);
        s2.globalAlpha = 0.6; s2.drawImage(sp.lc, ox, oy, sp.c.width * k, sp.c.height * k); s2.globalAlpha = 1;
        s2.fillStyle = '#fbf6ea'; s2.fillRect(cx + 2, cy + ch - 9, cw - 4, 8);
        font.drawText(s2, pr.ART31_TAG[a], cx + 4, cy + ch - 8, '#170e12');
      });
      ctx.drawImage(small, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/png');
    }, [year]);
    writeFileSync(`${out}/onda4-pred-galeria-${nm}.png`, Buffer.from(url.split(',')[1], 'base64'));
    console.log('galeria', nm);
  }
}
await b.close();
