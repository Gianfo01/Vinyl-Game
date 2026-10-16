// R29 (feat de pessoa, parte B) — capturas: convite de fora a UMA pessoa sua na caixa de entrada (a carta nomeia a pessoa;
// botões Aceitar só ela / Propor a banda inteira / Recusar) e o resultado; o convite rápido de pessoa(s) na aba Parcerias
// (preço de tabela e chance); um feat de pessoa feito pelo MUNDO (NPC × NPC) na ficha da convidada (Conexões ›
// Participações). Partida rápida pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29feat/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5349 &   node scripts/shots29featb.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29feat';
const port = process.argv[3] ?? '5349';
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
const snap = async (name) => { await p.mouse.move(1435, 900); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
const clean = () => p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay, [data-ctx27]').forEach((e) => e.remove()));

// prepara: um ato seu (banda) com músicas; convite de fora à voz da banda; um feat de pessoa do mundo
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts').catch(() => null);
  if (off) off.setTutorials19(st.store.prefs, false);
  const C = await import('/src/sim/contracts.ts');
  const Pr = await import('/src/sim/production.ts');
  const U = await import('/src/sim/util.ts'); const R19 = await import('/src/sim/rng19.ts');
  const R = await import('/src/core/rng.ts');
  const X = await import('/src/sim/sys/featp29.ts');
  const g = st.store.game;
  g.player.cash = Math.max(g.player.cash, 2e8);
  const live = (a) => (a.status === 'active' || a.status === 'emerging') && a.members.length >= 3 && a.members.every((m) => g.persons[m]?.alive && !g.persons[m].isPlayer);
  const free = Object.values(g.acts).filter((a) => live(a) && !a.owner && !a.playerBand).sort((a, b) => b.fame - a.fame);
  let mine = U.playerActs(g).map((id) => g.acts[id]).find((a) => a && a.members.length >= 2);
  if (!mine) { mine = free[2]; C.acceptOffer(g, mine, { ...C.defaultOffer(g, mine), id: 'shot-o', week: g.week, status: 'pending', advance: 0 }); }
  Pr.composeSongs(g, R19.rng19(g, 'act'), mine, 4);
  const voice = mine.members.find((m) => g.persons[m].role === 'vocal') ?? mine.members[0];
  X.npcPersonInvite29(g, R.Rng.fromSeed('shot-inv'), voice);
  // o mundo: um ato NPC credita alguém de outra banda
  const H = Object.values(g.acts).filter((a) => (a.status === 'active') && a.owner !== 'player' && !a.playerBand && a.fame >= 30 && a.members.length).sort((a, b) => b.fame - a.fame)[1];
  const gp = X.pickNpcGuest29(g, R.Rng.fromSeed('shot-npc'), H);
  const so = Pr.composeSongs(g, R.Rng.fromSeed('shot-c'), H, 1)[0];
  so.recorded = true;
  if (gp) X.attachNpcFeat29(g, H, so.id, [gp.pid], gp);
  const cm = await import('/src/ui/common.ts'); cm.rerender();
  return { mine: { id: mine.id, name: mine.name }, voice, vname: g.persons[voice].name, npc: gp && { pid: gp.pid, name: g.persons[gp.pid].name, host: H.name, title: so.title } };
});
console.log(JSON.stringify(info));

// 1) caixa de entrada: a carta do convite à pessoa
const nav = p.getByText(/^Caixa de entrada$/).first();
if (await nav.count()) { await nav.click(); await p.waitForTimeout(1200); }
const th = p.getByText(new RegExp(`quer a voz de ${info.vname}|quer ${info.vname}`)).first();
if (await th.count()) { await th.click(); await p.waitForTimeout(1000); }
await snap('11-caixa-convite-a-pessoa');
const acc = p.getByRole('button', { name: new RegExp(`Aceitar \\(só`) }).first();
if (await acc.count()) { await acc.click(); await p.waitForTimeout(1200); }
await snap('12-convite-aceito');
await clean();

// 2) Parcerias: convite rápido de pessoa com preço de tabela
await p.evaluate(async (aid) => { const st = await import('/src/ui/store.ts'); const cm = await import('/src/ui/common.ts'); const v = await import('/src/ui/vis.ts'); v.setTab('creation-write', 'cr-partners'); st.store.selectedAct = aid; st.store.area = 'creation'; cm.rerender(); }, info.mine.id);
await p.waitForTimeout(1200);
const q = p.locator('input[data-featq29]').first();
if (await q.count()) {
  await q.scrollIntoViewIfNeeded().catch(() => {});
  const pick = p.locator('.tpick29-it:not([disabled])').first();
  if (await pick.count()) { await pick.click(); await p.waitForTimeout(900); }
}
const quick = p.getByRole('button', { name: /Convite rápido \(pessoa\)/ }).first();
if (await quick.count()) await quick.scrollIntoViewIfNeeded().catch(() => {});
await snap('13-parcerias-convite-rapido-pessoa');

// 3) o mundo: a ficha da convidada lista o feat feito por um ato NPC
if (info.npc) {
  await p.evaluate(async (pid) => { document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove()); const m = await import('/src/ui/sys/people16.ts'); m.openPerson16(`p:${pid}`, 'connect29'); }, info.npc.pid);
  await p.waitForTimeout(1300);
  const tabC = p.locator('.modal button', { hasText: /Conexões/ }).first();
  if (await tabC.count()) { await tabC.click(); await p.waitForTimeout(900); }
  await snap('14-ficha-feat-do-mundo');
}
await b.close();
