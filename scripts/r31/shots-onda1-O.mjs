// R31 · O — capturas: busca Ctrl+K "contratar …" e o painel rápido com motivo do bloqueio; favoritos e metas.
// Uso: npx vite --port 5331 &   node scripts/r31/shots-onda1-O.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5331';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const util = await import('/src/sim/util.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const fut = await import('/src/sim/future.ts');
  const mine = await import('/src/sim/r31/mine.ts');
  const c = await import('/src/ui/common.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 6; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  const ids = util.playerActs(g);
  const rival = Object.values(g.acts).filter((a) => !ids.includes(a.id) && fut.visibleAct(g, a) && a.status === 'active').sort((x, y) => y.fame - x.fame)[0];
  if (ids[0]) mine.toggleFav31(g, 'act', { area: 'artists', actId: ids[0] });
  mine.toggleFav31(g, 'screen', { area: 'finance' }, { pt: 'Finanças', en: 'Finance' });
  mine.addGoal31(g, { kind: 'releases', target: 3 });
  mine.addGoal31(g, { kind: 'cash', target: g.player.cash * 2 + 100000 });
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  c.rerender();
  return { rival: rival?.name, mine: ids.map((id) => g.acts[id].name) };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name); };
// 1) Ctrl+K "contratar <rival>" → lista com o motivo; Enter abre o painel rápido
await p.keyboard.press('Control+k'); await p.waitForTimeout(700);
await p.keyboard.type(`contratar ${(info.rival ?? '').split(' ')[0]}`, { delay: 30 }); await p.waitForTimeout(900);
await shot('onda1-O-busca');
await p.keyboard.press('Enter'); await p.waitForTimeout(900);
await shot('onda1-O-painel');
// 2) favoritos e metas
await p.evaluate(async () => { document.querySelectorAll('.overlay').forEach((e) => e.remove()); const st = await import('/src/ui/store.ts'); const q = await import('/src/ui/r31/quick31.ts'); q.openMine31(st.store.game); });
await shot('onda1-O-metas');
await b.close();
