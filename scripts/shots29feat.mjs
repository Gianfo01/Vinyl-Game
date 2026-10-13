// R29 (feat de pessoa) — capturas do feat com integrante/pessoa específica: clique direito num integrante →
// "Convidar {nome} para um feat…" (Música e projetos) → a tela do feat de sempre já no modo "Pessoa(s) específica(s)" →
// busca enquanto digita (agrupada pela banda) → duas pessoas → resposta; o submenu "Oferecer a…" com "Participação (feat)
// de {nome}"; a ficha da pessoa (Conexões › Participações); o projeto com "Pessoa específica…"; e a tela no celular.
// Partida rápida pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29feat/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5347 &   node scripts/shots29feat.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29feat';
const port = process.argv[3] ?? '5347';
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
/** Prepara: caixa, um ato seu com músicas inéditas e escolhe uma banda de selo rival e uma livre (a voz de cada). */
async function setup(p) {
  return p.evaluate(async () => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts').catch(() => null);
    if (off) off.setTutorials19(st.store.prefs, false);
    const C = await import('/src/sim/contracts.ts');
    const P = await import('/src/sim/production.ts');
    const U = await import('/src/sim/util.ts');
    const F = await import('/src/sim/sys/feats8.ts');
    const g = st.store.game;
    g.player.cash = Math.max(g.player.cash, 2e8);
    const live = (a) => (a.status === 'active' || a.status === 'emerging') && a.members.length >= 3 && a.members.every((m) => g.persons[m]?.alive && !g.persons[m].isPlayer);
    const acts = Object.values(g.acts).filter(live).sort((a, b) => b.fame - a.fame);
    const rival = acts.find((a) => a.owner && a.owner !== 'player' && g.labels[a.owner]?.active);
    const free = acts.filter((a) => !a.owner && !a.playerBand);
    let mine = U.playerActs(g).map((id) => g.acts[id]).find((a) => a && a.members.length);
    if (!mine) { mine = free[2] ?? free[0]; C.acceptOffer(g, mine, { ...C.defaultOffer(g, mine), id: 'shot-o', week: g.week, status: 'pending', advance: 0 }); }
    if (F.featSongs(g, mine.id).length < 3) P.composeSongs(g, U.rngOf(g), mine, 4);
    const other = free.find((a) => a !== mine);
    const pick = (a) => a.members.find((m) => g.persons[m].role === 'vocal') ?? a.members.find((m) => m !== a.leaderId) ?? a.members[0];
    const cm = await import('/src/ui/common.ts');
    cm.rerender();
    return { year: g.year, mine: { id: mine.id, name: mine.name },
      rival: rival && { id: rival.id, name: rival.name, lb: g.labels[rival.owner].name, pid: pick(rival), pname: g.persons[pick(rival)].name },
      other: other && { id: other.id, name: other.name, pid: pick(other), pname: g.persons[pick(other)].name, pid2: other.members.find((m) => m !== pick(other)) } };
  });
}
const clean = (p) => p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay, [data-ctx27]').forEach((e) => e.remove()));
const openAct = (p, id) => p.evaluate(async (id) => { document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove()); const cm = await import('/src/ui/common.ts'); cm.inspect.act(id); }, id);
/** Clique direito de verdade no nome do integrante (marca data-ent); sem o nome na tela, abre o menu pelo mesmo código. */
async function rightClickPerson(p, key) {
  const el = p.locator(`[data-ent="person"][data-id="${key}"]`).first();
  if (await el.count()) { await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click({ button: 'right' }); }
  else await p.evaluate(async (key) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', key, document.querySelector('.modal h2, main h2, main h1') ?? document.body, { x: 420, y: 140 }); }, key);
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
await rightClickPerson(p, `p:${T.pid}`);
const it0 = p.locator('.cx27 [data-act="person.feat29"]').first();
if (await it0.count()) { await it0.scrollIntoViewIfNeeded().catch(() => {}); await it0.hover(); }
await snap(p, '01-clique-direito-convidar-feat', true);
if (await it0.count()) { await it0.click(); await p.waitForTimeout(1500); }
await snap(p, '02-feat-pessoa-pre-escolhida');
// busca enquanto digita: pelo nome da banda livre (agrupado pelo ato de casa)
const q = p.locator('input[data-featq29]').first();
if (info.other && (await q.count())) { await q.fill(info.other.name.slice(0, 5)); await p.waitForTimeout(700); }
await snap(p, '03-busca-por-banda', true);
// escolhe a segunda pessoa (a voz da banda livre): crédito "A & B"
const pick2 = info.other ? p.locator(`.tpick29-it[data-id="p:${info.other.pid}"]`).first() : null;
if (pick2 && (await pick2.count())) { await pick2.click(); await p.waitForTimeout(900); }
await snap(p, '04-duas-pessoas');
// propõe com o dobro do cachê de referência e mostra a resposta
const fee = p.locator('.modal input[type="number"]').first();
if (await fee.count()) { const v = Number(await fee.inputValue()); await fee.fill(String(Math.round(v * 2))); await fee.dispatchEvent('change'); await p.waitForTimeout(400); }
const prop = p.getByRole('button', { name: /Propor e ouvir a resposta/ }).first();
if (await prop.count()) { await prop.click(); await p.waitForTimeout(1200); }
await snap(p, '05-resposta');
await clean(p);
// garante um feat fechado para a ficha: pelo mesmo fechamento da tela (closeFeat29)
const done = await p.evaluate(async ([pid, hid]) => {
  const st = await import('/src/ui/store.ts');
  const F = await import('/src/sim/sys/feats8.ts');
  const X = await import('/src/sim/sys/featp29.ts');
  const g = st.store.game;
  const so = F.featSongs(g, hid)[0];
  if (so && !g.memory.some((m) => m.kind === 'feature' && m.pid === pid)) X.closeFeat29(g, so.id, { persons: [pid] }, X.fairFeat29(g, hid, { persons: [pid] }), 0);
  const cm = await import('/src/ui/common.ts'); cm.rerender();
  return Object.values(g.songs).filter((x) => /\(feat\. /.test(x.title)).map((x) => x.title).slice(-3);
}, [T.pid, info.mine.id]);
console.log(JSON.stringify(done));
await p.evaluate(async (pid) => { const m = await import('/src/ui/sys/people16.ts'); m.openPerson16(`p:${pid}`, 'connect29'); }, T.pid);
await p.waitForTimeout(1300);
const tabC = p.locator('.modal button', { hasText: /Conexões/ }).first();
if (await tabC.count()) { await tabC.click(); await p.waitForTimeout(900); }
await snap(p, '06-ficha-participacoes');
await clean(p);
// submenu "Oferecer a…": "Participação (feat) de {nome}" (a pessoa, não a banda)
if (info.other) {
  await p.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts'); c.openCtx27(st.store.game, 'person', `mo29:${pid}`, document.querySelector('main h2, main h1, main button') ?? document.body, { x: 520, y: 120 }); }, info.other.pid2 ?? info.other.pid);
  await p.waitForTimeout(800);
  const f = p.locator('.cx27 [data-act="mo.feat"]').first();
  if (await f.count()) { await f.scrollIntoViewIfNeeded().catch(() => {}); await f.hover(); }
  await snap(p, '07-oferecer-participacao', true);
  if (await f.count()) { await f.click(); await p.waitForTimeout(1500); }
  await snap(p, '08-participacao-abre-com-a-pessoa');
  await clean(p);
}
// composição › parcerias: "Pessoa específica…" ao lado do convite do ato
await p.evaluate(async (aid) => {
  const st = await import('/src/ui/store.ts'); const cm = await import('/src/ui/common.ts'); const v = await import('/src/ui/vis.ts');
  v.setTab('creation-write', 'cr-partners'); st.store.selectedAct = aid; st.store.area = 'creation'; cm.rerender();
}, info.mine.id).catch((e) => console.error('goArea', e.message));
await p.waitForTimeout(1200);
const part = p.getByRole('button', { name: /Pessoa específica/ }).first();
if (await part.count()) { await part.scrollIntoViewIfNeeded().catch(() => {}); }
await snap(p, '09-composicao-pessoa-especifica');
await p.context().close();

// ---------------------------------------------------------------- celular
const m = await start(390, 844);
const i2 = await setup(m);
const T2 = i2.rival ?? i2.other;
await m.evaluate(async (pid) => { const st = await import('/src/ui/store.ts'); const r8 = await import('/src/ui/sys/round8.ts'); const M = await import('/src/sim/sys/member29.ts'); r8.openFeatModal(st.store.game, M.memberFeatPreset29(st.store.game, pid)); }, T2.pid);
await m.waitForTimeout(1200);
const q2 = m.locator('input[data-featq29]').first();
if (await q2.count()) { await q2.fill(T2.pname.slice(0, 3)); await m.waitForTimeout(600); }
await snap(m, '10-feat-pessoa-celular-390', true);
await m.context().close();
await b.close();
