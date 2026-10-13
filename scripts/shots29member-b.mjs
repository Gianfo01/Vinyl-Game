// R29 (integrante, B) — capturas da oferta a uma pessoa SEM banda (pessoa livre da formação real, rw.free29, ou músico
// livre): ficha da pessoa + clique direito ("Oferecer a {nome}… ›" com a nota "Sem banda") e o submenu (assinar como
// solo, montar uma banda, entrar numa banda sua, sessão, projeto, equipe, feat). Partida rápida (NOVA RUN → COMEÇAR MINHA
// HISTÓRIA, pt-BR). Saída em docs/shots29member/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5341 &   node scripts/shots29member-b.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29member';
const port = process.argv[3] ?? '5341';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 1440, height: 920 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 180000 });
await p.waitForTimeout(1500);
const click = async (re) => { await p.getByRole('button', { name: re }).first().click({ timeout: 60000 }); await p.waitForTimeout(800); };
await click(/NOVA RUN|NEW RUN/i);
await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay, .scene-overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
const info = await p.evaluate(async () => {
  document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts').catch(() => null);
  if (off) off.setTutorials19(st.store.prefs, false);
  const C = await import('/src/sim/contracts.ts');
  const M = await import('/src/sim/sys/member29.ts');
  const R = await import('/src/sim/sys/realworld.ts');
  const g = st.store.game;
  g.player.cash = Math.max(g.player.cash, 2e8);
  // uma banda sua (para "Entrar em…")
  const live = (a) => (a.status === 'active' || a.status === 'emerging') && a.members.length >= 3 && a.members.every((m) => g.persons[m]?.alive && !g.persons[m].isPlayer);
  if (!Object.values(g.acts).some((a) => a.owner === 'player' && a.members.length >= 2)) {
    const mine = Object.values(g.acts).filter((a) => live(a) && !a.owner && !a.playerBand).sort((a, b) => b.fame - a.fame)[1];
    if (mine) C.acceptOffer(g, mine, { ...C.defaultOffer(g, mine), id: 'shot-o', week: g.week, status: 'pending', advance: 0 });
  }
  const free = Object.keys(R.rw(g).free29 ?? {}).filter((id) => M.freeAgent29(g, id));
  const pick = free.sort((a, b) => (g.acts[R.rw(g).free29[b]]?.fame ?? 0) - (g.acts[R.rw(g).free29[a]]?.fame ?? 0))[0]
    ?? Object.keys(g.persons).find((id) => M.freeAgent29(g, id) && M.refAct29(g, id));
  const cm = await import('/src/ui/common.ts');
  cm.rerender();
  return { year: g.year, pid: pick, name: g.persons[pick]?.name, real: free.includes(pick), ref: g.acts[R.rw(g).free29?.[pick] ?? '']?.name ?? null, nFree: free.length };
});
console.log(JSON.stringify(info));
const snap = async (name) => { await p.mouse.move(1435, 900); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
// ficha da pessoa livre e o clique direito no nome dela
await p.evaluate(async (pid) => { const m = await import('/src/ui/sys/people16.ts'); m.openPerson16(`p:${pid}`); }, info.pid);
await p.waitForTimeout(1200);
const nameEl = p.locator(`.modal [data-ent="person"][data-id="p:${info.pid}"]`).first();
if (await nameEl.count()) await nameEl.click({ button: 'right' });
else await p.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', `p:${pid}`, document.querySelector('.modal h2') ?? document.body, { x: 420, y: 140 }); }, info.pid);
await p.waitForTimeout(700);
const off = p.locator('.cx27 [data-act="person.offer29"]').first();
if (await off.count()) await off.scrollIntoViewIfNeeded().catch(() => {});
await snap('11-sem-banda-clique-direito');
if (await off.count()) { await off.click(); await p.waitForTimeout(800); }
else await p.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', `mo29:${pid}`, document.querySelector('.modal h2') ?? document.body, { x: 420, y: 140 }); }, info.pid);
await snap('12-sem-banda-submenu');
// assinar como solo: a mesa de sempre
const solo = p.locator('.cx27 [data-act="mo.solo:free"]').first();
if (await solo.count()) { await solo.click(); await p.waitForTimeout(1500); }
await snap('13-sem-banda-mesa-do-solo');
await b.close();
