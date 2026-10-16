// R31 · onda 3 (F) — capturas: página Conhecidos (Você) e a ficha com a relação (5 dimensões) e "como se conheceram",
// mais a ficha de alguém que nunca te viu ("Não te conhece").
// Uso: npx vite --host 127.0.0.1 --port 5841 &   node scripts/r31/shots-onda3-F.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5841';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 1300 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const soc = await import('/src/sim/social31.ts');
  const c = await import('/src/ui/common.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.cash += 5_000_000_00;
  for (let i = 0; i < 10; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  // alguns encontros para a vitrine (ações reais do grafo: visita, palco, apresentação, rivalidade)
  const me = soc.meNode31(g);
  const ps = Object.values(g.persons).filter((x) => x.alive && !x.isPlayer).slice(0, 40);
  soc.meet31(g, me, ps[0].id, 'visit', { i: 62 });
  soc.meet31(g, ps[0].id, ps[1].id, 'record', { i: 55 });
  soc.meet31(g, me, ps[1].id, 'intro', { by: ps[0].id });
  soc.meet31(g, me, ps[2].id, 'festival');
  soc.shiftTie31(g, me, ps[3].id, { v: 45, t: -20, tBack: -25, r: -10, rBack: -12 }, 'rival');
  soc.shiftTie31(g, me, ps[0].id, { r: 25, rBack: 30, t: 20, tBack: 35 }, 'visit');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = 'known31';
  c.rerender();
  return { me, a: ps[0].id, stranger: ps[30].id, edges: soc.edgeCount31(g) };
});
console.log('jogo', JSON.stringify(info));
await p.waitForTimeout(1500);
await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
await p.waitForTimeout(500);
await p.screenshot({ path: `${out}/onda3-F-conhecidos.png`, fullPage: false });
console.log('captura conhecidos');
for (const [id, name] of [[info.a, 'ficha-relacao'], [info.stranger, 'ficha-nao-conhece']]) {
  await p.evaluate(async (pid) => { document.querySelectorAll('.overlay').forEach((e) => e.remove()); const pg = await import('/src/ui/pages.ts'); pg.openPersonPage(pid, 'rel'); }, id);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/onda3-F-${name}.png`, fullPage: false });
  console.log('captura', name);
}
await b.close();
