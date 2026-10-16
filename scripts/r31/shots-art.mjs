// R31 · onda 4 (ART) — capturas do redesenho dos adereços no pixel art padrão: a sala Estúdio da sede (bateria e
// amplificador da fonte única stage31px) em duas épocas e a folha de adereços novos (bateria por época, amplificador
// grande/pequeno, caixa de som, plateia, grade) ampliada 4×. As cenas da cidade/submundo saem de shots-is.mjs com
// SHOT_PREFIX=onda4-art-; os lado a lado antes/depois são montados por scripts/r31/art-sidebyside.py.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-art.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = wg.createGame(bot.defaultConfig('shots-art', { scenario: 'established', startYear: 1975, dbSize: 'small', homeCity: 'rio' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  st.store.game = g;
  window.__g = g;
});
const shot = async (name, sel) => {
  await p.waitForTimeout(1200);
  const el = sel ? await p.$(sel) : null;
  if (el) await el.screenshot({ path: `${out}/onda4-art-${name}.png` }); else await p.screenshot({ path: `${out}/onda4-art-${name}.png` });
  console.log('captura', name);
};
const sala = async (id, year, hq) => p.evaluate(async ([id, year, hq]) => {
  const s31 = await import('/src/ui/r31/salas31.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = window.__g;
  g.year = year; g.player.hq = hq;
  s31.openSala31(id);
}, [id, year, hq]);
await sala('studio', 1975, 2); await shot('sala-estudio-1975', '.s31-stage');
await sala('studio', 2015, 4); await shot('sala-estudio-2015', '.s31-stage');
// folha de adereços (fonte única), 4×
await p.evaluate(async () => {
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const px = await import('/src/ui/pixel/px.ts');
  const st = await import('/src/ui/pixel/stage31px.ts');
  const pal = await import('/src/ui/pixel/palette.ts');
  const W = 250, H = 64, fy = 58;
  const bg = new px.Px(W, H);
  bg.rect(0, 0, W, H, px.C('#4a4466')); bg.rect(0, fy, W, H - fy, px.C('#2e2a3e'));
  const L = new px.Px(W, H);
  st.drumKit31(L, 8, fy, 1955, pal.paletteOf(1955).accent2);
  st.drumKit31(L, 50, fy, 1975, pal.paletteOf(1975).accent2);
  st.drumKit31(L, 92, fy, 2005, pal.paletteOf(2005).accent2);
  st.amp31(L, 130, fy, 1960, true); st.amp31(L, 150, fy, 1980, true); st.amp31(L, 170, fy, 1980, false);
  st.speaker31(L, 186, fy, 12, 30);
  L.outline(px.INK);
  const F = new px.Px(W, H);
  px.inked(F, (q) => st.crowd31(q, 196, 52, 4, fy, 1985, 7));
  bg.blit(L, 0, 0); bg.blit(F, 0, 0);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H); new Uint32Array(img.data.buffer).set(bg.d); ctx.putImageData(img, 0, 0);
  cv.style.cssText = `width:${W * 4}px;height:${H * 4}px;image-rendering:pixelated;display:block`;
  const box = document.createElement('div'); box.className = 'shot31'; box.style.cssText = 'position:fixed;left:0;top:0;z-index:9999;background:#12141c;padding:8px';
  box.append(cv); document.body.append(box);
});
await shot('props-depois', '.shot31');
console.log('erros', errs.length);
await b.close();
