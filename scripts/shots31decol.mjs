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
}
if (mode === 'tela' || mode === 'tudo') {
  // tela real com exp5.nav LIGADO; partida nova no ano do exemplo; o estado só é mexido para montar o exemplo
  // (dinheiro, peças postas, encomenda); a tela em si só lê
  // entra no jogo pela tela inicial (nova run rápida); cada exemplo troca a partida por uma do ano certo
  await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
  await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click();
  for (let i = 0; i < 90; i++) { await p.waitForTimeout(1000); if (await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)) break; }
  await p.waitForTimeout(5000); // a nova run termina de montar (salvamento automático, cockpit) antes de trocarmos a partida
  const start = (o) => p.evaluate(async (o) => {
    const wg = await import('/src/sim/worldgen.ts');
    const botc = await import('/src/sim/bot.ts');
    const st = await import('/src/ui/store.ts');
    const tick = await import('/src/sim/tick.ts');
    const sw = await import('/src/sim/r31/switches.ts');
    const off = await import('/src/ui/tutoff19.ts');
    const c = await import('/src/ui/common.ts');
    const cx = await import('/src/sim/sys/campus18.ts');
    const ds = await import('/src/sim/r31/decoshop31.ts');
    const ui = await import('/src/ui/r31/decoshop31ui.ts');
    const ow = await import('/src/sim/sys/people/owner.ts');
    document.querySelectorAll('.overlay').forEach((e) => e.remove());
    if (!window.__decoShop) { window.__decoShop = 1; cx.CAMPUS_EXTRA28.push((s) => [{ id: 'shop:shots', kind: 'store', name: 'Disco & Bar', city: s.config.homeCity, lvl: 1, goto: { area: 'hq' }, kpi: [] }]); }
    const g = wg.createGame(botc.defaultConfig(`decol-${o.year}`, { startYear: o.year, scenario: 'established' }));
    g.tutorial = { step: 99, done: true, seen: [] };
    off.setTutorials19(st.store.prefs, false);
    tick.advanceWeek(g);
    sw.setSw(g, 'exp5.nav', true);
    ow.ownerOf(g).wealth += 5e9; g.player.cash += 5e9;
    if (o.run) await (new Function('g', 'ds', `return (async () => { ${o.run} })()`))(g, ds);
    for (const k of ['deco31-furniture', 'deco31-antique', 'deco31-hifi', 'deco31-gallery', 'deco31-place']) localStorage.setItem(`vtn31-seen:${k}`, '1');
    st.store.game = g;
    ui.DECO_UI31.tab = o.tab; ui.DECO_UI31.place = o.place ?? ''; ui.DECO_UI31.room = o.room ?? ''; ui.DECO_UI31.more = false;
    ui.openDecoShop31(o.tab);
    c.rerender();
    document.querySelectorAll('.overlay').forEach((e) => e.remove());
    return { year: g.year, area: st.store.area };
  }, o);
  const shot = async (name) => {
    await p.waitForTimeout(1500);
    await p.evaluate(() => { document.querySelectorAll('.overlay').forEach((e) => e.remove()); for (const e of document.querySelectorAll('body *')) if (/^Nova época/.test(e.textContent ?? '') && getComputedStyle(e).position === 'fixed') e.remove(); });
    await p.screenshot({ path: `${out}/deco-l-${name}.png` }); console.log('captura', name);
  };
  const only = process.env.ONLY;
  const cases = [];
  for (const k of ['furniture', 'antique', 'hifi', 'gallery']) for (const y of [1925, 1965, 2015]) cases.push([`${k}-${y}`, { year: y, tab: k }]);
  cases.push(['correio-1925', { year: 1925, tab: 'mail', run: "const d = ds.remoteCat31(g, 'mail'); ds.orderDeco31(g, d[2].id, 'mail', 'me'); ds.orderDeco31(g, d[9].id, 'mail', 'co');" }]);
  cases.push(['internet-2015', { year: 2015, tab: 'net', run: "const d = ds.remoteCat31(g, 'net'); ds.orderDeco31(g, d[4].id, 'net', 'me');" }]);
  cases.push(['entrega-chegando-2015', { year: 2015, tab: 'places', place: 'home', run: "const d = ds.remoteCat31(g, 'net').filter((x) => x.places.includes('home') && x.cat === 'hifi'); ds.orderDeco31(g, d[0].id, 'net', 'me'); for (const o of ds.decol31(g).ord) o.due = g.week; ds.deliverDeco31(g); const n = g.notifications?.[g.notifications.length - 1]; if (n) setTimeout(async () => (await import('/src/ui/common.ts')).toast(typeof n.text === 'string' ? n.text : n.text.pt, 'good'), 300);" }]);
  cases.push(['bar-decorado-1975', { year: 1975, tab: 'places', place: 'venue:b:shop:shots', room: 'bar', run: `
    const cat = await import('/src/data/deco31.ts'); const ob = await import('/src/sim/r31/object.ts');
    const want = (slot, n) => cat.DECO31.filter((d) => d.places.includes('venue') && d.slots[0] === slot && g.year >= d.from && (!d.to || g.year < d.to))[n];
    for (const [slot, n] of [['paper', 0], ['ground', 0], ['window', 0], ['ceiling', 0], ['wall', 0], ['wall', 1], ['floor', 0], ['floor', 1], ['desk', 0], ['sign', 0]]) {
      const d = want(slot, n); if (!d) continue; const r = ob.createObj(g, { modelId: 'deco:' + d.id, origin: 'shots', owner: 'label:player' }); if (r.ok) ds.moveTo31(g, r.v.id, 'venue:b:shop:shots', 'bar'); }` }]);
  for (const [name, o] of cases) { if (only && !name.includes(only)) continue; console.log(await start(o)); await shot(name); }
}
await b.close();
