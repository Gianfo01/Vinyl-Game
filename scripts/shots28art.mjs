// Rodada 28 (arte) — capturas das artes novas: folhas de contato (tools/artsheet28) e telas do jogo onde elas
// aparecem (Lendas › Relíquias, Submundo › Organizações, Fraudes, Festivais, Premiações, Críticos, ficha do selo,
// página do artista, museu). Saída em docs/shots28art/.
//
// Uso (dois servidores de desenvolvimento rodando):
//   npx vite tools/artsheet28 --port 5199 &   npx vite --port 5327 &
//   node scripts/shots28art.mjs [pasta de saída]
// Requer playwright (não é dependência do jogo; usa o instalado globalmente, ou PLAYWRIGHT_PATH).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots28art';
mkdirSync(out, { recursive: true });
const b = await chromium.launch();

// ---- folhas de contato
for (const part of ['relics', 'covers', 'emblems', 'logos', 'extras']) {
  const pg = await b.newPage({ viewport: { width: 1200, height: 800 } });
  pg.on('pageerror', (e) => console.error('PAGEERR', part, e.message));
  await pg.goto(`http://localhost:5199/?part=${part}`, { waitUntil: 'networkidle' });
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `${out}/sheet-${part}.png`, fullPage: true });
  await pg.close();
}

// ---- telas do jogo
const p = await b.newPage({ viewport: { width: 1360, height: 900 } });
p.on('pageerror', (e) => console.error('PAGEERR game', e.message));
await p.goto('http://localhost:5327/'); await p.waitForTimeout(2500);
p.setDefaultTimeout(0);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const tick = await import('/src/sim/tick.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const rl = await import('/src/sim/sys/relics9.ts');
  const ch = await import('/src/sim/sys/chron9.ts');
  const w = await import('/src/data/world.ts');
  const cfg = bot.defaultConfig('shots28art', { scenario: 'established', startYear: 1978 });
  cfg.dbSize = 'small';
  const g = wg.createGame(cfg);
  for (let i = 0; i < 2; i++) tick.advanceWeek(g);
  g.tutorial = { step: 99, done: true, seen: [] };
  const acts = Object.values(g.acts).sort((a, b) => b.fame - a.fame).slice(0, 6);
  for (const a of acts) { a.fame = Math.max(a.fame, 60); ch.chron(g, { k: 'legendary_show', i: 4, a: [a.id], t: w.l('Show histórico', 'Historic show') }); }
  ch.chron(g, { k: 'cert', i: 2, a: [acts[0].id], t: w.l('"X" recebe disco de platina.', '"X" certified platinum.') });
  const kinds = ['jukebox', 'amp', 'poster', 'contract', 'notebook', 'photo', 'horn', 'synth', 'sticks', 'tape', 'outfit', 'car', 'glasses', 'prop'];
  kinds.forEach((k, i) => { const r = rl.addRelic(g, k, w.l(`Peça de exemplo ${i + 1}`, `Sample piece ${i + 1} (${k})`), acts[i % 6].id, undefined, 20000 + i * 5000, 1950 + i * 5); if (i % 3 === 0) r.st = 'player'; else if (i % 3 === 1) { r.st = 'auction'; r.au = g.week + 10; } });
  st.store.game = g;
  off.setTutorials19(st.store.prefs, false);
  window.__g28 = g;
});
const go = async (area, tab) => p.evaluate(async ([area, tab]) => {
  const slot = await import('/src/ui/ps/slot25.ts'); const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (tab) vis.setTab(tab[0], tab[1]);
  slot.sedeNav25.go(area);
}, [area, tab]);
const shot = async (name) => { await p.waitForTimeout(600); await p.screenshot({ path: `${out}/${name}.png` }); };

await go('lendas', ['lendas9', 'relics']); await shot('game-lendas-reliquias');
await p.evaluate(async () => { const m = await import('/src/ui/sys/lendas9.ts'); const r = await import('/src/sim/sys/relics9.ts'); const x = r.relics(window.__g28).list.find((y) => y.k === 'jukebox') ?? r.relics(window.__g28).list[0]; m.openRelic(window.__g28, x.id); });
await shot('game-reliquia-ficha');
await go('lendas', ['lendas9', 'relics18']); await shot('game-acervo-vivo');
await go('crime', ['crime17', 'orgs']); await shot('game-submundo-organizacoes');
await go('fakes19', ['fakes19', 'g']); await shot('game-fraudes');
await go('festivals'); await shot('game-festivais');
await p.evaluate(async () => { const m = await import('/src/ui/sys/hubs8.ts'); m.openFestivalPage(6); }); await shot('game-festival-cartaz');
await go('awards'); await shot('game-premiacoes');
await go('critics'); await shot('game-criticos');
await p.evaluate(async () => { const c = await import('/src/ui/common.ts'); const g = window.__g28; const lb = Object.values(g.labels).find((x) => x.active); c.inspect.label(lb.id); }); await shot('game-ficha-selo');
await p.evaluate(async () => { const c = await import('/src/ui/common.ts'); const g = window.__g28; const a = Object.values(g.acts).sort((x, y) => y.fame - x.fame)[0]; document.querySelectorAll('.overlay').forEach((e) => e.remove()); c.inspect.act(a.id); }); await shot('game-pagina-artista');
await go('releases'); await shot('game-lancamentos');
await b.close();
console.log('ok:', out);
