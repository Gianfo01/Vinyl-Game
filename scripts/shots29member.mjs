// R29 (integrante) — capturas da oferta a um integrante específico: clique direito num integrante de banda →
// "Oferecer a {nome}… ›" → submenu (solo com rescisão/aliciamento, entrar/substituir, equipe, sessão, projeto, feat) →
// mesa de negociação do solo → resultado; e o painel "Ações" da ficha. Partida rápida pela tela inicial
// (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29member/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5341 &   node scripts/shots29member.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29member';
const port = process.argv[3] ?? '5341';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function start(vw, vh) {
  const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: vw, height: vh } });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.error('PAGEERR', e.message));
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 180000 });
  await p.waitForTimeout(1500);
  const click = async (re) => { await p.getByRole('button', { name: re }).first().click({ timeout: 60000 }); await p.waitForTimeout(800); };
  await click(/NOVA RUN|NEW RUN/i);
  await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
  await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay, .scene-overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  return p;
}
/** Prepara: caixa, uma banda sua (para "Entrar em…") e escolhe uma banda de selo rival e uma livre. */
async function setup(p) {
  return p.evaluate(async () => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts').catch(() => null);
    if (off) off.setTutorials19(st.store.prefs, false);
    const C = await import('/src/sim/contracts.ts');
    const g = st.store.game;
    g.player.cash = Math.max(g.player.cash, 2e8);
    const live = (a) => (a.status === 'active' || a.status === 'emerging') && a.members.length >= 3 && a.members.every((m) => g.persons[m]?.alive && !g.persons[m].isPlayer);
    const acts = Object.values(g.acts).filter(live).sort((a, b) => b.fame - a.fame);
    const rival = acts.find((a) => a.owner && a.owner !== 'player' && g.labels[a.owner]?.active);
    const free = acts.filter((a) => !a.owner && !a.playerBand);
    const mine = free[1] ?? free[0];
    if (mine && !Object.values(g.acts).some((a) => a.owner === 'player' && a.members.length >= 2)) C.acceptOffer(g, mine, { ...C.defaultOffer(g, mine), id: 'shot-o', week: g.week, status: 'pending', advance: 0 });
    const other = free.find((a) => a !== mine);
    // alguém da banda rival que não seja o líder (a voz, de preferência)
    const pick = (a) => a.members.find((m) => m !== a.leaderId && g.persons[m].role === 'vocal') ?? a.members.find((m) => m !== a.leaderId) ?? a.members[0];
    const cm = await import('/src/ui/common.ts');
    cm.rerender();
    return { year: g.year, rival: rival && { id: rival.id, name: rival.name, lb: g.labels[rival.owner].name, pid: pick(rival), pname: g.persons[pick(rival)].name },
      other: other && { id: other.id, name: other.name, pid: pick(other), pname: g.persons[pick(other)].name }, mine: mine && { id: mine.id, name: mine.name } };
  });
}
const openAct = (p, id) => p.evaluate(async (id) => { document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove()); const cm = await import('/src/ui/common.ts'); cm.inspect.act(id); }, id);
/** Clique direito de verdade no nome do integrante (marca data-ent); sem o nome na tela, abre o menu pelo mesmo código. */
async function rightClickPerson(p, pid) {
  const el = p.locator(`[data-ent="person"][data-id="p:${pid}"]`).first();
  if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click({ button: 'right' }); }
  else await p.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', `p:${pid}`, document.querySelector('.modal h2, main h2, main h1') ?? document.body, { x: 420, y: 140 }); }, pid);
  await p.waitForTimeout(700);
}
const snap = async (p, name, keep = false) => { if (!keep) await p.mouse.move(1435, 900); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };

// ---------------------------------------------------------------- desktop
const p = await start(1440, 920);
const info = await setup(p);
console.log(JSON.stringify(info));
const T = info.rival ?? info.other;
await openAct(p, T.id);
await p.waitForTimeout(1200);
await snap(p, '00-ficha-da-banda');
await rightClickPerson(p, T.pid);
const off = p.locator('.cx27 [data-act="person.offer29"]').first();
if (await off.count()) await off.scrollIntoViewIfNeeded().catch(() => {});
await snap(p, '01-clique-direito-oferecer');
if (await off.count()) { await off.click(); await p.waitForTimeout(800); }
await snap(p, '02-submenu-oferecer');
// passa o mouse no item do solo (dica com o motivo/nota)
const solo = p.locator('.cx27 [data-act^="mo.solo:"]').first();
if (await solo.count()) { await solo.hover(); await p.waitForTimeout(300); await solo.click(); await p.waitForTimeout(1500); }
await snap(p, '03-mesa-do-solo');
// fecha o acordo: proposta generosa e aceita a contraproposta (o mesmo caminho da tela)
for (let i = 0; i < 6; i++) {
  const acc = p.getByRole('button', { name: /Aceitar a contraproposta/ }).first();
  if (await acc.count()) { await acc.click(); await p.waitForTimeout(600); break; }
  const adv = p.locator('.n27-fields input[type="number"]').first();
  if (await adv.count()) { const v = Number(await adv.inputValue()); await adv.fill(String(Math.round(v * 2.2))); }
  const prop = p.getByRole('button', { name: /^Propor$/ }).first();
  if (!(await prop.count())) break;
  await prop.click(); await p.waitForTimeout(600);
}
await snap(p, '04-mesa-resultado');
const fechar = p.locator('.n27-end button').first();
if (await fechar.count()) { await fechar.click(); await p.waitForTimeout(900); }
await p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove()));
await snap(p, '05-aviso-saida-da-banda');
const after = await p.evaluate(async (bid) => {
  const st = await import('/src/ui/store.ts');
  const K = await import('/src/sim/sys/connect29.ts');
  const g = st.store.game, a = g.acts[bid];
  return { members: a.members.map((m) => g.persons[m]?.name), ex: K.exMembers29(g, a).map((x) => g.persons[x.pid]?.name).slice(-4), log: g.memory.slice(-5).map((m) => `${m.kind}: ${m.text.pt}`) };
}, T.id);
console.log(JSON.stringify(after));
await openAct(p, T.id);
await p.waitForTimeout(1200);
const tabI = p.locator('.modal button', { hasText: /Integrantes/ }).first();
if (await tabI.count()) { await tabI.click(); await p.waitForTimeout(900); }
const ex = p.getByText(/Ex-integrantes/).first();
if (await ex.count()) await ex.scrollIntoViewIfNeeded().catch(() => {});
await snap(p, '06-banda-com-ex-integrante');
// outra banda: "Entrar em …" (troca de banda) pelo submenu
if (info.other) {
  await openAct(p, info.other.id);
  await p.waitForTimeout(1200);
  await rightClickPerson(p, info.other.pid);
  const o2 = p.locator('.cx27 [data-act="person.offer29"]').first();
  if (await o2.count()) { await o2.click(); await p.waitForTimeout(800); }
  const join = p.locator('.cx27 [data-act^="mo.join:"]:not(.off)').first();
  if (await join.count()) await join.hover();
  await snap(p, '07-submenu-entrar-na-sua-banda', true);
  if (await join.count()) { await join.click(); await p.waitForTimeout(1200); }
  await snap(p, '08-resultado-entrar');
  // ficha de outro integrante da mesma banda (ainda não é seu): painel "Ações" com o mesmo item, habilitado
  const other2 = await p.evaluate(async ([bid, pid]) => { const st = await import('/src/ui/store.ts'); return st.store.game.acts[bid].members.find((m) => m !== pid); }, [info.other.id, info.other.pid]);
  const sheet = async (pid, name) => {
    await p.evaluate(async (pid) => { document.querySelectorAll('.overlay, .scene-overlay, [data-ctx27]').forEach((e) => e.remove()); const m = await import('/src/ui/sys/people16.ts'); m.openPerson16(`p:${pid}`); }, pid);
    await p.waitForTimeout(1200);
    const acts = p.locator('summary', { hasText: /Ações com esta pessoa/ }).first();
    if (await acts.count()) { await acts.click(); await p.waitForTimeout(800); }
    const row = p.locator('.pa18-row[data-act="person.offer29"]').first();
    if (await row.count()) await row.scrollIntoViewIfNeeded().catch(() => {});
    await snap(p, name);
    return row;
  };
  const row = await sheet(other2 ?? info.other.pid, '09-ficha-acoes-oferecer');
  // o botão da ficha abre o mesmo submenu (ancorado no botão)
  const btn = row.locator('button').first();
  if (await btn.count()) { await btn.click(); await p.waitForTimeout(900); }
  await snap(p, '09b-ficha-submenu');
  // quem acabou de entrar na sua banda: o item fica desabilitado com o motivo
  await sheet(info.other.pid, '09c-ficha-ja-e-seu');
}
await p.context().close();

// ---------------------------------------------------------------- celular (folha inferior)
const m = await start(390, 844);
const i2 = await setup(m);
const T2 = i2.rival ?? i2.other;
await m.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', `mo29:${pid}`, document.querySelector('main h2, main h1, main button') ?? document.body, undefined, true); }, T2.pid);
await m.waitForTimeout(800);
await snap(m, '10-submenu-celular-390');
await m.context().close();
await b.close();
