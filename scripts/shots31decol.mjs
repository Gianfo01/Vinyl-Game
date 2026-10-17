// R31 DECO-L — capturas: prédios das lojas de decoração em 3 épocas, cena de estabelecimento decorado e peças por loja.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31decol.mjs [porta] [arte|tela|tudo]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5871';
const mode = process.argv[3] ?? 'tudo';
const out = 'docs/r31/shots';
mkdirSync(out, { recursive: true });
const exe = `/opt/pw-browsers/${readdirSync('/opt/pw-browsers').find((d) => d.startsWith('chromium-'))}/chrome-linux/chrome`;
const b = await chromium.launch({ executablePath: exe });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
p.setDefaultTimeout(120000);
const save = (name, url) => { writeFileSync(`${out}/deco-l-${name}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('captura', name); };
if (mode === 'arte' || mode === 'tudo') {
  // prédios: 4 lojas × 3 épocas (sprite do mapa ampliado)
  save('predios', await p.evaluate(async () => {
    const px = await import('/src/ui/pixel/campus18px.ts');
    const font = await import('/src/ui/pixel/font.ts');
    const arts = [['furniture', 'MOVEIS'], ['antique', 'ANTIQUARIO'], ['hifi', 'ELETRONICOS'], ['gallery', 'GALERIA']];
    const years = [1910, 1962, 2025];
    const cw = 160, ch = 170, k = 2;
    const sm = document.createElement('canvas'); sm.width = cw * years.length; sm.height = ch * arts.length + 14;
    const c = sm.getContext('2d'); c.imageSmoothingEnabled = false;
    c.fillStyle = '#7a9a58'; c.fillRect(0, 0, sm.width, sm.height);
    years.forEach((y, j) => font.drawText(c, String(y), j * cw + cw / 2 - 8, 4, '#170e12'));
    arts.forEach(([a, tag], i) => years.forEach((y, j) => {
      const cx = j * cw, cy = i * ch + 14;
      c.fillStyle = (i + j) % 2 ? '#86a464' : '#7a9a58'; c.fillRect(cx, cy, cw, ch);
      const sp = px.artSprite31(a, y, 11 + i);
      const ox = Math.round(cx + cw / 2 - (sp.door[0] - sp.x) * k), oy = Math.round(cy + ch - 18 - (sp.door[1] - sp.y) * k);
      c.drawImage(sp.c, ox, oy, sp.c.width * k, sp.c.height * k);
      c.globalAlpha = 0.6; c.drawImage(sp.lc, ox, oy, sp.c.width * k, sp.c.height * k); c.globalAlpha = 1;
      c.fillStyle = '#fbf6ea'; c.fillRect(cx + 2, cy + ch - 10, cw - 4, 9); font.drawText(c, tag, cx + 5, cy + ch - 9, '#170e12');
    }));
    const big = document.createElement('canvas'); big.width = sm.width * 2; big.height = sm.height * 2;
    const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, big.width, big.height);
    return big.toDataURL('image/png');
  }));
  // bar decorado em 3 épocas (cena do estabelecimento com peças do catálogo da DECO-M)
  save('bar-decorado', await p.evaluate(async () => {
    const dp = await import('/src/ui/pixel/decol31px.ts');
    const cat = await import('/src/data/deco31.ts');
    const font = await import('/src/ui/pixel/font.ts');
    const pick = (y, slot, k) => cat.DECO31.filter((d) => d.places.includes('venue') && d.slots[0] === slot && y >= d.from && (!d.to || y < d.to))[k];
    const room = { id: 'bar', spots: [{ id: 'paper', slot: 'paper', x: .5, y: .3 }, { id: 'ground', slot: 'ground', x: .5, y: .95 }, { id: 'ceil', slot: 'ceiling', x: .5, y: .04 }, { id: 'w1', slot: 'wall', x: .25, y: .36 }, { id: 'w2', slot: 'wall', x: .75, y: .36 }, { id: 'f1', slot: 'floor', x: .15, y: .86 }, { id: 'f2', slot: 'floor', x: .5, y: .86 }, { id: 'f3', slot: 'floor', x: .85, y: .86 }, { id: 'd1', slot: 'desk', x: .5, y: .62 }, { id: 'sign', slot: 'sign', x: .5, y: .02 }] };
    const years = [1928, 1975, 2020];
    const W = dp.SCENE_W31, H = dp.SCENE_H31;
    const sm = document.createElement('canvas'); sm.width = W * 3 + 8; sm.height = H + 14;
    const c = sm.getContext('2d'); c.imageSmoothingEnabled = false; c.fillStyle = '#1c1a20'; c.fillRect(0, 0, sm.width, sm.height);
    years.forEach((y, j) => {
      const items = [];
      for (const [slot, k, x] of [['paper', 0, .5], ['ground', 0, .5], ['ceiling', 0, .5], ['wall', 0, .25], ['wall', 1, .75], ['floor', 0, .15], ['floor', 1, .85], ['desk', 0, .5], ['sign', 0, .5]]) {
        const d = pick(y, slot, k); if (d) items.push({ d, slot, x, y: slot === 'floor' ? .86 : .36 });
      }
      c.drawImage(dp.estScene31(room, items, y, true), j * (W + 4), 14);
      font.drawText(c, `BAR ${y}`, j * (W + 4) + 4, 4, '#f4ecd8');
    });
    const big = document.createElement('canvas'); big.width = sm.width * 2; big.height = sm.height * 2;
    const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(sm, 0, 0, big.width, big.height);
    return big.toDataURL('image/png');
  }));
}
await b.close();
