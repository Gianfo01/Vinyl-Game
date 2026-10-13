// Rodada 29 (Submundo: qualquer personagem é alvo) — capturas do seletor de alvo com busca e do preset pelo menu de
// ações. Partida rápida pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR). Saída em docs/shots29crime/.
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5329 &   node scripts/shots29crime.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29crime';
const port = process.argv[3] ?? '5329';
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
  await p.evaluate(async () => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const off = await import('/src/ui/tutoff19.ts').catch(() => null);
    if (off) off.setTutorials19(st.store.prefs, false);
    st.store.game.player.cash = Math.max(st.store.game.player.cash, 5e7); // caixa para ver chance/custo sem o bloqueio de caixa
  });
  return p;
}
async function plans(p) {
  await p.evaluate(async () => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const vis = await import('/src/ui/vis.ts');
    const cm = await import('/src/ui/common.ts');
    vis.setTab('crime17', 'plans');
    st.store.area = 'crime';
    cm.rerender();
  });
  await p.waitForTimeout(900);
}
const shot = async (p, name, sel = '.tpick29') => { await p.mouse.move(2, 600); const el = p.locator(sel).first(); if (await el.count()) await el.scrollIntoViewIfNeeded().catch(() => {}); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
const search = async (p, q) => { const i = p.locator('.tpick29-q').first(); await i.fill(''); await i.type(q, { delay: 20 }); await p.waitForTimeout(400); };

// ---------------------------------------------------------------- desktop
const p = await start(1360, 900);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const T = await import('/src/sim/sys/crimetargets29.ts');
  const C = await import('/src/sim/sys/crime17.ts');
  const g = st.store.game;
  const bm = C.crimeById('blackmail');
  const all = T.candidates29(g, bm);
  const old = new Set(C.targetsFor(g, bm).map((x) => x.id));
  const prod = all.find((x) => x.id.startsWith('pd:') && !x.dead && !C.targetBlock17(g, bm, x.id)) ?? all.find((x) => x.grp === 'industry' && !x.dead && !C.targetBlock17(g, bm, x.id));
  const person = all.filter((x) => x.grp === 'person' && !old.has(x.id) && !C.targetBlock17(g, bm, x.id)).sort((a, b) => b.fame - a.fame)[0];
  const dead = all.find((x) => x.grp === 'person' && x.dead);
  return { year: g.year, prod: prod && { id: prod.id, name: prod.name }, person: person && { id: person.id, name: person.name }, dead: dead && { id: dead.id, name: dead.name }, n: all.length };
});
console.log(JSON.stringify(info));
await plans(p);
await shot(p, '01-planos-alvo-recolhido');
await p.locator('.tpick29-q').first().focus();
await p.waitForTimeout(300);
await shot(p, '01b-planos-sugestoes');
if (info.prod) {
  await search(p, info.prod.name.split(' ').slice(-1)[0]);
  await shot(p, '02-busca-industria');
  await p.locator('.tpick29-it:not([disabled])').first().click();
  await p.waitForTimeout(800);
  await shot(p, '03-alvo-escolhido-chance', '.tpick29 ~ .card, .card .chips, .card');
  // "Executar (planejar)": a operação jogável abre com o mesmo alvo (fora da antiga lista também)
  const ex = p.getByRole('button', { name: /Executar/ }).first();
  if (await ex.count()) { await ex.click().catch(() => {}); await p.waitForTimeout(1200); await p.mouse.move(2, 600); await p.screenshot({ path: `${out}/03b-operacao-mesmo-alvo.png` }); console.log('ok 03b'); await p.keyboard.press('Escape'); await p.waitForTimeout(400); await plans(p); }
}
if (info.dead) { await search(p, info.dead.name); await shot(p, '04-motivo-morto'); }
// ação contra ato com uma pessoa buscada: aparece o motivo "exige um artista"
await p.evaluate(async () => {
  const f = await import('/src/ui/sys/crimeform29.ts');
  const cm = await import('/src/ui/common.ts');
  f.crimeForm17.c = 'sabotage'; f.crimeForm17.target = ''; f.crimeForm17.q = '';
  cm.rerender();
});
await p.waitForTimeout(700);
if (info.person) { await search(p, info.person.name); await shot(p, '05-tipo-errado-motivo'); }
// menu de ações (clique direito) numa pessoa fora da antiga lista → "Mais opções no Submundo…" → formulário com o alvo
if (info.person) {
  await p.evaluate(async (pid) => {
    const st = await import('/src/ui/store.ts');
    const c = await import('/src/ui/ps/ctx27.ts');
    const a = document.querySelector('main h2, main h1, main button') ?? document.body;
    c.openCtx27(st.store.game, 'person', `p:${pid}`, a, { x: 420, y: 160 });
  }, info.person.id);
  await p.waitForTimeout(700);
  const dark = p.getByText(/Mais opções no Submundo/).first();
  if (await dark.count()) await dark.scrollIntoViewIfNeeded().catch(() => {});
  await p.screenshot({ path: `${out}/06-menu-pessoa.png` }); console.log('ok 06');
  if (await dark.count()) { await dark.click().catch(() => {}); await p.waitForTimeout(1000); }
  await shot(p, '07-preset-pelo-menu');
}
if (info.prod) {
  await p.evaluate(async (key) => {
    const st = await import('/src/ui/store.ts');
    const c = await import('/src/ui/ps/ctx27.ts');
    const a = document.querySelector('main h2, main h1, main button') ?? document.body;
    c.openCtx27(st.store.game, 'person', key, a, { x: 420, y: 160 });
  }, info.prod.id);
  await p.waitForTimeout(700);
  const pl = p.getByText(/Planejar: Chantagear/).first();
  if (await pl.count()) await pl.scrollIntoViewIfNeeded().catch(() => {});
  await p.screenshot({ path: `${out}/08-menu-industria.png` }); console.log('ok 08');
  if (await pl.count()) { await pl.click().catch(() => {}); await p.waitForTimeout(1000); }
  await shot(p, '09-preset-industria');
}
await p.context().close();

// ---------------------------------------------------------------- celular
const m = await start(390, 844);
await plans(m);
if (info.prod) await search(m, info.prod.name.split(' ')[0].slice(0, 3));
await shot(m, '10-celular-busca');
await b.close();
