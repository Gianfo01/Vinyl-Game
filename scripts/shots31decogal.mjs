// R31 · DECO-M — galeria das peças (desenho provisório do modo Arrumar) ao lado dos objetos da onda 5, para conferir o padrão.
// Uso: vite em 5873 (vite5nw) e node scripts/shots31decogal.mjs [pasta] [porta]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5873';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(2500);
for (const [cat, year] of [['furniture', 1962], ['art', 1962], ['plant+lamp', 1980], ['hifi', 1980], ['collect', 1935], ['light+sign', 2025], ['upg', 2025]]) {
  await p.evaluate(async ([cat, year]) => {
    const D = await import('/src/data/deco31.ts');
    const X = await import('/src/ui/r31/deco5px.ts');
    const E = await import('/src/ui/pixel/exp5px.ts');
    const px = await import('/src/ui/pixel/px.ts');
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin:0;background:#2a2f3a;font:11px sans-serif;color:#ddd';
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:10px;align-items:flex-end';
    const add = (pp, label) => { const c = px.upscale(pp.canvas(), pp.w * 3, pp.h * 3); c.style.imageRendering = 'pixelated'; const f = document.createElement('figure'); f.style.cssText = 'margin:0;text-align:center;background:#c8b89a;padding:4px'; const cap = document.createElement('div'); cap.textContent = label; cap.style.cssText = 'color:#222;max-width:140px'; f.append(c, cap); wrap.append(f); };
    for (const o of ['filing', 'safe', 'phone', 'radiotv', 'bed', 'mirror']) add(E.obj5Px(o, year), `exp5:${o}`);
    if (cat === 'upg') { for (const r of ['mesasom', 'piano', 'palco']) for (let lv = 0; lv <= 4; lv++) { const u = D.UPG31.filter((x) => x.req === r && x.lv === lv).pop(); if (lv && !u) continue; add(X.reqPx5(r, lv, year, u), `${r} ${lv}`); } }
    else for (const d of D.DECO31.filter((x) => cat.split('+').includes(x.cat) && x.w > 0)) add(X.decoPx5(d, Math.max(d.from, Math.min(year, (d.to ?? 9999) - 1))), d.id);
    document.body.append(wrap);
  }, [cat, year]);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/deco-m-galeria-${cat.replace('+', '-')}.png`, fullPage: true });
  console.log('galeria', cat);
}
await b.close();
