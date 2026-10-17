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
if (mode === 'tela' || mode === 'tudo') {
  // tela real com exp5.nav LIGADO; o estado é mexido SÓ para montar cada exemplo (ano, dinheiro, peças); a tela só lê
  await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
  await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
  for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
  await p.evaluate(async () => {
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts');
    const sw = await import('/src/sim/r31/switches.ts');
    const cx = await import('/src/sim/sys/campus18.ts');
    const g = st.store.game;
    g.tutorial = { step: 99, done: true, seen: [] };
    off.setTutorials19(st.store.prefs, false);
    sw.setSw(g, 'exp5.nav', true);
    // a loja do selo (com bar) para o exemplo de estabelecimento decorado
    cx.CAMPUS_EXTRA28.push((s) => [{ id: 'shop:shots', kind: 'store', name: 'Loja do Selo', city: s.config.homeCity, lvl: 1, goto: { area: 'hq' }, kpi: [] }]);
    for (const k of Object.keys(localStorage)) if (k.startsWith('vtn31-seen')) localStorage.removeItem(k);
    for (const k of ['deco31-furniture', 'deco31-antique', 'deco31-hifi', 'deco31-gallery', 'deco31-place']) localStorage.setItem(`vtn31-seen:${k}`, '1');
  });
  const setup = (o) => p.evaluate(async (o) => {
    const st = await import('/src/ui/store.ts');
    const c = await import('/src/ui/common.ts');
    const ds = await import('/src/sim/r31/decoshop31.ts');
    const ui = await import('/src/ui/r31/decoshop31ui.ts');
    const ow = await import('/src/sim/sys/people/owner.ts');
    const g = st.store.game;
    document.querySelectorAll('.overlay').forEach((e) => e.remove());
    if (o.year && g.year !== o.year) { g.year = o.year; ds.restockDeco31(g, 'edit'); }
    ow.ownerOf(g).wealth = Math.max(ow.ownerOf(g).wealth, 5e9); g.player.cash = Math.max(g.player.cash, 5e9);
    if (o.run) await (new Function('g', 'ds', o.run))(g, ds);
    ui.openDecoShop31(o.tab);
    if (o.place) { const m = await import('/src/ui/r31/decoshop31ui.ts'); m.DECO_UI31.place = o.place; m.DECO_UI31.room = o.room ?? ''; }
    c.rerender();
  }, o);
  const shot = async (name) => {
    await p.waitForTimeout(1400);
    await p.evaluate(() => { for (const e of document.querySelectorAll('body *')) if (/^Nova época/.test(e.textContent ?? '') && getComputedStyle(e).position === 'fixed') e.remove(); });
    await p.screenshot({ path: `${out}/deco-l-${name}.png` }); console.log('captura', name);
  };
  const only = process.env.ONLY;
  const cases = [];
  for (const k of ['furniture', 'antique', 'hifi', 'gallery']) for (const y of [1925, 1965, 2015]) cases.push([`${k}-${y}`, { year: y, tab: k }]);
  cases.push(['correio-1925', { year: 1925, tab: 'mail', run: "const d = ds.remoteCat31(g, 'mail'); ds.orderDeco31(g, d[2].id, 'mail', 'me'); ds.orderDeco31(g, d[9].id, 'mail', 'co');" }]);
  cases.push(['internet-2015', { year: 2015, tab: 'net', run: "const d = ds.remoteCat31(g, 'net'); ds.orderDeco31(g, d[4].id, 'net', 'me');" }]);
  cases.push(['entrega-chegando-2015', { year: 2015, tab: 'places', place: 'home', run: "for (const o of ds.decol31(g).ord) o.due = g.week; ds.deliverDeco31(g); const n = g.notifications?.[g.notifications.length - 1]; if (n) (await import('/src/ui/common.ts')).toast(typeof n.text === 'string' ? n.text : n.text.pt, 'good');" }]);
  cases.push(['bar-decorado-1975', { year: 1975, tab: 'places', place: 'venue:b:shop:shots', room: 'bar', run: `
    const cat = await import('/src/data/deco31.ts'); const ob = await import('/src/sim/r31/object.ts');
    const want = (slot, n) => cat.DECO31.filter((d) => d.places.includes('venue') && d.slots[0] === slot && g.year >= d.from && (!d.to || g.year < d.to))[n];
    for (const [slot, n] of [['paper', 0], ['ground', 0], ['window', 0], ['ceiling', 0], ['wall', 0], ['wall', 1], ['floor', 0], ['floor', 1], ['desk', 0], ['sign', 0]]) {
      const d = want(slot, n); if (!d) continue; const r = ob.createObj(g, { modelId: 'deco:' + d.id, origin: 'shots', owner: 'label:player' }); if (r.ok) ds.moveTo31(g, r.v.id, 'venue:b:shop:shots'); }` }]);
  for (const [name, o] of cases) { if (only && !name.includes(only)) continue; await setup(o); await shot(name); }
}
await b.close();
