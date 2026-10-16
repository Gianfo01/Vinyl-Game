// R31 onda 3 (G · Objetos) — capturas: loja da cidade (estoque do mês, vitrine, três formas de compra), ficha de
// relíquia com nível e motivos (sem "próximo"), o violino do Efro e a sala de troféus com os níveis reais.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31G.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(4000);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 90 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
await p.screenshot({ path: "/tmp/claude-0/-home-user-Vinyl-Game/c8f687c8-5e2c-55d8-895e-ad382da4cd65/scratchpad/start.png" });
p.setDefaultTimeout(120000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const tick = await import('/src/sim/tick.ts');
  const own = await import('/src/sim/sys/people/owner.ts');
  const r9 = await import('/src/sim/sys/relics9.ts');
  const r31 = await import('/src/sim/r31/relic31.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 3; i++) tick.advanceMonth(g);
  own.ownerOf(g).wealth = Math.max(own.ownerOf(g).wealth, 5e9);
  g.player.cash = Math.max(g.player.cash, 5e9);
  // uma peça com história para a ficha (acontecimentos de verdade com id)
  const rl = r9.addRelic(g, 'guitar', { pt: 'A guitarra creme de 1958', en: 'The 1958 cream guitar' }, undefined, undefined, 85000, 1958);
  rl.own[0] = ['Fábrica', 1958, 'origem'];
  rl.own.push(['Zé Rocha', 1959, 'compra'], ['Lua Nova (colecionador)', 1960, 'leilão']);
  r31.relicEvent31(rl, 'demo:show', 'show', 1959);
  r31.relicEvent31(rl, 'demo:gold', 'gold', 1959);
  r31.relicEvent31(rl, 'demo:broke', 'broke', 1960);
  rl.st = 'player'; r31.syncRelic31(g, rl);
  window.__g = g; window.__rl = rl.id;
  return { year: g.year, rl: rl.id };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/onda3-g-${name}.png` }); console.log('captura', name); };
const area = async (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = a;
  for (const [k, v] of sub ?? []) vis.setTab(k, v);
  c.rerender();
}, [a, sub]);
await area('wealth', [['life-wealth', 'goods8'], ['goods8', 'store31']]);
await shot('loja');
await p.evaluate(() => document.querySelector('.card .btn.small')?.scrollIntoView({ block: 'center' }));
await p.getByRole('button', { name: /Dar de presente/ }).first().click({ timeout: 8000 }).catch(() => console.error('sem botão de presente'));
await shot('loja-presente');
await p.evaluate(async () => { const l = await import('/src/ui/sys/lendas9.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); l.openRelic(window.__g, window.__rl); });
await shot('ficha-nivel');
await p.evaluate(async () => { const l = await import('/src/ui/sys/lendas9.ts'); const r31 = await import('/src/sim/r31/relic31.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); l.openRelic(window.__g, r31.EFRO_VIOLIN_ID); });
await shot('violino-efro');
await p.evaluate(async () => { const s = await import('/src/ui/r31/salas31.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); s.openSala31('trophy'); });
await shot('trofeus');
await b.close();
