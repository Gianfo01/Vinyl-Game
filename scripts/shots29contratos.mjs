// R29 (contratos+) — capturas dos três modelos novos (empresariamento, produção, joint venture) e das carreiras sem
// "fase 4": Nova run (cartões de atividade), ficha de ato de selo rival ("Propor empresariamento"), a proposta/mesa,
// o formulário com produção e JV, a aba "Acordos especiais" do Mercado de contratos (S07) e a ficha de Direitos.
// Partida rápida (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29contratos/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5343 &   node scripts/shots29contratos.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29contratos';
const port = process.argv[3] ?? '5343';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 1440, height: 920 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 240000 });
await p.waitForTimeout(1500);
const snap = async (name) => { await p.mouse.move(1435, 900); await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
const esc = async (n = 3) => { for (let i = 0; i < n; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(250); } };
const click = async (re) => { await p.getByRole('button', { name: re }).first().click({ timeout: 60000 }); await p.waitForTimeout(800); };

await click(/NOVA RUN|NEW RUN/i);
await p.waitForTimeout(800);
await snap('01-nova-run-atividades');
await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay, .scene-overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
{ const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }

const info = await p.evaluate(async () => {
  document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
  const st = await import('/src/ui/store.ts');
  for (let i = 0; i < 120 && !st.store.game; i++) await new Promise((r) => setTimeout(r, 500)); // a partida rápida pode demorar a nascer
  const off = await import('/src/ui/tutoff19.ts').catch(() => null);
  if (off) off.setTutorials19(st.store.prefs, false);
  const C = await import('/src/sim/contracts.ts');
  const T = await import('/src/sim/terms29.ts');
  const R = await import('/src/sim/rights.ts');
  const P = await import('/src/sim/production.ts');
  const K = await import('/src/sim/sys/contracts29.ts');
  const S = await import('/src/sim/scout20.ts');
  const { Rng } = await import('/src/core/rng.ts');
  const g = st.store.game;
  g.player.cash = Math.max(g.player.cash, 2e8);
  const live = (a) => (a.status === 'active' || a.status === 'emerging') && a.members.length >= 1 && a.members.some((m) => g.persons[m]?.alive);
  const npc = Object.values(g.acts).filter((a) => a.owner && a.owner !== 'player' && g.labels[a.owner] && live(a) && a.fame >= 5).sort((a, b) => b.fame - a.fame);
  const free = Object.values(g.acts).filter((a) => !a.owner && live(a) && S.scoutEligible20(g, a).ok && a.fame >= 3).sort((a, b) => b.fame - a.fame);
  const sign = (a, model, tweak) => {
    const o = C.defaultOffer(g, a); T.applyModel29(o, model); o.rights = R.defaultRights(o.model, o.publishing); tweak?.(o);
    const offer = C.makeOffer(g, o) ?? { ...o, id: `shot-${model}`, week: g.week, status: 'pending' };
    C.acceptOffer(g, a, offer);
  };
  const m = npc[3] ?? npc[0];
  sign(m, 'management', (o) => { o.advance = 0; o.promises = ['tour']; });
  const pa = free[2];
  sign(pa, 'production', (o) => { o.advance = 0; });
  const r = Rng.fromSeed('shots29contratos');
  const songs = P.composeSongs(g, r, pa, 3); P.recordSongs(g, r, pa, songs.map((x) => x.id), 2, 'balanced', 'act');
  const pc = Object.values(g.contracts).find((c) => c.actId === pa.id && c.model === 'production');
  const lbs = K.deliveryLabels29(g, pc.id);
  if (lbs[0]) K.deliverMasters29(g, pc.id, lbs[0].id, 'license');
  const ja = free[3];
  sign(ja, 'jv', (o) => { o.advance = 1_500_000; o.x29 = { artistShare: 0.4, target: 3 }; });
  for (const a of [m, pa, ja]) { g.knowledge[a.id] = { ...(g.knowledge[a.id] ?? { source: 'press', stage: 'monitoring' }), degree: 5 }; }
  const cm = await import('/src/ui/common.ts');
  cm.rerender();
  return { year: g.year, managed: m.name, mId: m.id, other: (npc[0].id === m.id ? npc[1] : npc[0]).id, otherName: (npc[0].id === m.id ? npc[1] : npc[0]).name, prod: pa.name, jv: ja.name, jvId: ja.id, freeId: free[0].id, freeName: free[0].name, deliveries: pc.x29?.deliveries?.length ?? 0 };
});
console.log(JSON.stringify(info));

// ficha de um ato de selo rival: "Propor empresariamento"
await p.evaluate(async (id) => { const m = await import('/src/ui/pages.ts'); m.openActPage(id); }, info.other);
await p.waitForTimeout(1200);
await snap('02-ficha-ato-de-selo-rival-propor-empresariamento');
const prop = p.getByRole('button', { name: /Propor empresariamento/ }).first();
if (await prop.count()) { await prop.click(); await p.waitForTimeout(1500); }
await snap('03-proposta-empresariamento');
await esc(4);

// o formulário (proposta única) já em Produção e depois em Joint venture
await p.evaluate(async (id) => { document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove()); const f = await import('/src/ui/ficha.ts'); f.openOffer(id, true, 'production'); }, info.freeId);
await p.waitForTimeout(1200);
await snap('04-formulario-producao');
await p.evaluate(() => {
  const sel = [...document.querySelectorAll('.modal select')].find((x) => [...x.options].some((o) => o.value === 'jv'));
  if (sel) { sel.value = 'jv'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
});
await p.waitForTimeout(800);
await snap('05-formulario-joint-venture');
await esc(4);

// a mesa r27 com o modelo escolhido (empresariamento para ato de selo rival)
await p.evaluate(async (id) => {
  document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
  const st = await import('/src/ui/store.ts'); const C = await import('/src/sim/contracts.ts'); const T = await import('/src/sim/terms29.ts'); const R = await import('/src/sim/rights.ts');
  const n = await import('/src/ui/act27/negotiate27.ts');
  const g = st.store.game; const a = g.acts[id];
  const o = C.defaultOffer(g, a); T.applyModel29(o, 'management'); o.rights = R.defaultRights('management');
  n.openNego27(id, o);
}, info.other);
await p.waitForTimeout(1200);
const pr = p.getByRole('button', { name: /^Propor$/ }).first();
if (await pr.count()) { await pr.click(); await p.waitForTimeout(800); }
await snap('06-mesa-r27-empresariamento');
await esc(4);

// Mercado de contratos (S07) → Acordos especiais
await p.evaluate(() => { document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove()); location.hash = '#/S07'; });
await p.waitForTimeout(1500);
const tab = p.getByRole('tab', { name: /Acordos especiais/ }).first();
if (await tab.count()) { await tab.click(); await p.waitForTimeout(800); }
else { const bt = p.getByRole('button', { name: /Acordos especiais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(800); } }
await snap('07-contratos-acordos-especiais');

// Direitos (Negócios → Direitos): os três modelos com o status certo
await p.evaluate(() => { location.hash = '#/business'; });
await p.waitForTimeout(1500);
{ const more = p.getByRole('button', { name: /mais$/ }).first(); if (await more.count()) { await more.click(); await p.waitForTimeout(600); } }
const rt = p.getByRole('tab', { name: /^Direitos/ }).first();
if (await rt.count()) { await rt.click(); await p.waitForTimeout(800); }
else { const bt = p.getByRole('button', { name: /^Direitos/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(800); } else { const it = p.getByText(/^Direitos/).first(); if (await it.count()) { await it.click(); await p.waitForTimeout(800); } } }
{ const hd = p.getByText(/Acordos e direitos/).first(); if (await hd.count()) { await hd.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -120)); await p.waitForTimeout(400); } }
await snap('08-direitos-acordos');

// ficha do ato empresariado: dossiê "Contratos e selos"
await p.evaluate(async (id) => { const m = await import('/src/ui/pages.ts'); m.openActPage(id); }, info.mId);
await p.waitForTimeout(1200);
for (const re of [/^Mais/, /Negócios e direitos/]) { if (await p.getByRole('tab', { name: /Contratos e selos/ }).count()) break; const g1 = p.locator('.modal').getByRole('button', { name: re }).first(); if (await g1.count()) { await g1.click(); await p.waitForTimeout(600); } }
{ const grp = p.locator('.modal').getByRole('button', { name: /Negócios e direitos/ }).first(); if (await grp.count()) { await grp.click(); await p.waitForTimeout(600); } else { const g2 = p.locator('.modal').getByRole('tab', { name: /Negócios e direitos/ }).first(); if (await g2.count()) { await g2.click(); await p.waitForTimeout(600); } } }
const dt = p.getByRole('tab', { name: /Contratos e selos/ }).first();
if (await dt.count()) { await dt.click(); await p.waitForTimeout(800); }
else { const bt = p.getByRole('button', { name: /Contratos e selos/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(800); } }
await snap('09-ficha-ato-empresariado-contratos');
await b.close();
