// R31 · DECO-A — prova antes/depois da arte no modo Arrumar (casa e sede arrumadas, mesa de som), 1962 e 2025.
// Mesmo roteiro de scripts/shots31deco.mjs (DECO-M). Uso: npx vite --config scripts/vite5nw.config.mjs --host 127.0.0.1 --port 5873 &
//   node scripts/r31/shots-deco-arrumar.mjs [pasta] [porta] [antes|depois]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5873';
const tag = process.argv[4] ?? 'depois';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3000);
p.setDefaultTimeout(60000);
const start = (year, hq, region) => p.evaluate(async ([year, hq, region]) => {
  const wg = await import('/src/sim/worldgen.ts');
  const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const c = await import('/src/ui/common.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const ow = await import('/src/sim/sys/people/owner.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = wg.createGame(botc.defaultConfig(`deco-${year}`, { startYear: year, scenario: 'established' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.hq = hq;
  const hs = { 1925: 'townhouse', 1962: 'suburb', 2025: 'modernist' }[year];
  ow.ownerOf(g).house = ow.HOUSES.findIndex((x) => x.id === hs);
  sw.setSw(g, 'exp5.nav', true);
  sh.SH5.region = region; sh.SH5.paper = null; sh.SH5.pause = false; sh.SH5.help = false;
  st.store.game = g;
  c.rerender();
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  return { year: g.year, hq: g.player.hq };
}, [year, hq, region]);
// arruma o cômodo com peças da época (o estilo da época primeiro), como o jogador faria pela gaveta
const furnish = (place, room) => p.evaluate(async ([place, room]) => {
  const st = await import('/src/ui/store.ts');
  const D = await import('/src/data/deco31.ts');
  const M = await import('/src/sim/r31/deco31.ts');
  const O = await import('/src/sim/r31/object.ts');
  const U = await import('/src/ui/r31/deco5.ts');
  const s = st.store.game;
  const pl = M.decoPlaces31(s).find((x) => x.key === place);
  const r = pl.rooms.find((x) => x.id === room);
  const era = ['nouveau', 'deco', 'fifties', 'seventies', 'eighties', 'nineties', 'minimal', 'smart'].filter((k) => D.STYLE31_FROM[k] <= s.year).pop();
  const used = new Set();
  let n = 0;
  for (const bx of U.lay5(place, r).boxes) {
    if (bx.kind !== 'spot') continue;
    const ok = (d) => d.slots.includes(bx.slot) && d.places.includes(pl.kind) && D.inLine31(d, s.year) && !used.has(d.id) && (bx.slot !== 'floor' || d.w <= 56);
    const d = D.DECO31.find((x) => ok(x) && x.style === era) ?? D.DECO31.filter(ok).sort((a, b2) => b2.from - a.from)[0];
    if (!d) continue;
    used.add(d.id);
    const o = O.createObj(s, { modelId: `deco:${d.id}`, origin: 'shop', owner: 'player' });
    if (o.ok && M.placeDeco31(s, o.v.id, bx.key).ok) n++;
  }
  // e duas peças a mais na gaveta
  for (const d of D.DECO31.filter((x) => D.inLine31(x, s.year) && x.slots.includes('wall') && !used.has(x.id)).slice(0, 3)) O.createObj(s, { modelId: `deco:${d.id}`, origin: 'shop', owner: 'player' });
  return n;
}, [place, room]);
const arrumar = (place, room) => p.evaluate(async ([place, room]) => { const U = await import('/src/ui/r31/deco5.ts'); U.closeArrumar5(); U.openArrumar5(place); if (room) { document.querySelectorAll('.deco5-room').forEach((b) => { if (b.textContent === room) b.click(); }); } }, [place, room]);
const roomsOf = (place) => p.evaluate(async (place) => { const M = await import('/src/sim/r31/deco31.ts'); const st = await import('/src/ui/store.ts'); return M.decoPlaces31(st.store.game).find((x) => x.key === place).rooms.map((r) => [r.id, r.name.pt]); }, place);
const shot = async (name) => { await p.waitForTimeout(1000); await p.screenshot({ path: `${out}/deco-a-arrumar-${tag}-${name}.png` }); console.log('captura', name); };

for (const [y, hq] of [[1962, 2], [2025, 3]]) {
  console.log(await start(y, hq, 'casa'));
  await shot(`casa-cena-${y}`);
  for (const nm of ['Quarto', 'Garagem', 'Escritório']) { const b = p.locator('.r5-rbtn', { hasText: nm }); if (await b.count()) { await b.first().click(); await p.waitForTimeout(900); await shot(`casa-cena-${nm.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}-${y}`); } }
  await p.keyboard.press('Shift+O');
  for (const [rid, rn] of await roomsOf('home')) { console.log('peças', await furnish('home', rid)); await arrumar('home', rn); await shot(`casa-${rid}-${y}`); }
  await p.keyboard.press('Escape');
  console.log(await start(y, hq, 'sede'));
  for (const [rid, rn] of await roomsOf('sede')) { console.log('peças', await furnish('sede', rid)); await arrumar('sede', rn); await shot(`sede-${rid}-${y}`); }
  // mesa de som: de fábrica e depois do upgrade (estúdio da sede)
  if (y !== 1925) {
    await p.locator('.deco5-room', { hasText: 'Estúdio' }).first().click();
    await p.locator('.deco5-spot.req').first().click();
    await p.evaluate(async () => {
      const D = await import('/src/data/deco31.ts'); const M = await import('/src/sim/r31/deco31.ts'); const O = await import('/src/sim/r31/object.ts'); const st = await import('/src/ui/store.ts');
      const s = st.store.game;
      const u = D.UPG31.filter((x) => x.req === 'mesasom' && D.inLine31(x, s.year)).sort((a, b2) => b2.lv - a.lv)[0];
      const o = O.createObj(s, { modelId: `upg:${u.id}`, origin: 'shop', owner: 'label:player' });
      M.setReq31(s, M.reqKey31('sede', 'studio', 'mesasom'), o.v.id);
    });
    await p.locator('.deco5-room.on').click(); await p.locator('.deco5-spot.req').first().click(); await shot(`mesasom-${y}`);
  }
  await p.keyboard.press('Escape');
}
await b.close();
