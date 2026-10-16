// R31 · onda 3 (CAR) — capturas: grade da rádio, palcos (aberturas), degraus e fim de jogo, cena-assinatura da mídia
// com as decisões em 1 clique, painel rápido de um artista e as playlists da plataforma (partida de 2016).
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-car.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(60000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const v9 = await import('/src/sim/sys/ventures9.ts');
  const M = await import('/src/sim/sys/car31media.ts');
  const venue = await import('/src/sim/sys/live/venue.ts');
  const v12 = await import('/src/sim/sys/venue12.ts');
  const C = await import('/src/sim/sys/careers12.ts');
  const S = await import('/src/sim/sys/car31stage.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.cash += 5_000_000_000;
  v9.foundVenture(g, 'media', 'label', { media: 'radio', city: g.config.homeCity });
  C.startCareer(g, 'media'); C.startCareer(g, 'venue');
  const v = M.mediaVentures31(g)[0];
  let i = 0;
  for (const r of M.cands31(g, v, 40)) { if (!M.addGrid31(g, v.id, r.id, i < 4 ? 'heavy' : i < 10 ? 'mid' : 'light')) i++; if (i >= 14) break; }
  const vn = venue.buyVenue(g, 'club', g.config.homeCity, 'Casa do Porto');
  const acts = Object.values(g.acts).filter((a) => a.owner !== 'player' && a.status === 'active').sort((a, b) => b.fame - a.fame);
  v12.addNight12(g, { k: 'original', day: 'fri', deal: 'door', actId: acts[0]?.id });
  v12.addNight12(g, { k: 'residency', day: 'sat', deal: 'door', actId: acts[1]?.id });
  for (let k = 0; k < 4; k++) tick.advanceMonth(g);
  const n = S.venueNow31(g)?.x.prog[0];
  const small = Object.values(g.acts).filter((a) => a.status !== 'retired' && a.fame < 25).sort((a, b) => a.fame - b.fame)[0];
  if (n && small) S.setOpener31(g, n.id, small.id);
  window.__g = g;
  return { year: g.year, grid: M.stRo31(g, v).grid.length, share: M.stRo31(g, v).share, venue: typeof vn === 'object', act: acts[0]?.id };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(1000); await p.screenshot({ path: `${out}/onda3-car-${name}.png` }); console.log('captura', name); };
const area = async (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (sub) vis.setTab(sub[0], sub[1]);
  st.store.area = a;
  c.rerender();
}, [a, sub]);
await area('car31', ['car31', 'media']); await shot('radio-grade');
await p.evaluate(() => window.scrollTo(0, 99999)); await shot('radio-diario');
await area('car31', ['car31', 'stage']); await shot('palcos');
await area('car31', ['car31', 'prog']); await shot('degraus');
await area('sala31', ['sala31', 'sig:media']); await shot('cena-midia');
await p.locator('.s31-hot, [data-hot], button').filter({ hasText: /Grade de programação|Cabine no ar/ }).first().click({ timeout: 6000 }).catch(() => console.error('sem ponto da grade na cena'));
await shot('cena-midia-painel');
if (info.act) {
  await p.evaluate(async (id) => { const q = await import('/src/ui/r31/quick31.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); q.openQuick31(window.__g, { kind: 'act', id }); }, info.act);
  await shot('painel-rapido');
}
// plataforma: partida nova em 2016
const okp = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const tick = await import('/src/sim/tick.ts');
  const v9 = await import('/src/sim/sys/ventures9.ts');
  const P = await import('/src/sim/sys/car31plat.ts');
  const C = await import('/src/sim/sys/careers12.ts');
  const g = wg.createGame(bot.defaultConfig('car-shot', { startYear: 2016 }));
  g.tutorial = { step: 99, done: true, seen: [] };
  g.player.cash += 5_000_000_000;
  v9.foundVenture(g, 'platform', 'label', {});
  C.startCareer(g, 'platform');
  const v = P.platVentures31(g)[0];
  v.subs = 6_000_000;
  P.cands31p(g, 20).forEach((r, i) => P.addList31(g, v.id, 'top', r.id, i));
  tick.advanceMonth(g);
  st.store.game = g;
  window.__g = g;
  return P.platRo31(g, v.id).lists.top.length;
});
console.log('plataforma', okp);
await area('car31', ['car31', 'plat']); await shot('plataforma');
await b.close();
