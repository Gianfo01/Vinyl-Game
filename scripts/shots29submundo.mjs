// Rodada 29 (Submundo: famílias) — capturas do card da organização (medidor, ligações, pedidos, interações), do laço
// documentado nos dois lados (organização × ficha), do menu de ações ("Contratar {família} para… ›") e do planejador
// com a família como executora. Partida rápida pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR).
// Uso (servidor de desenvolvimento rodando):  npx vite --port 5330 &   node scripts/shots29submundo.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29submundo';
const port = process.argv[3] ?? '5330';
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
    st.store.game.player.cash = Math.max(st.store.game.player.cash, 5e8);
  });
  return p;
}
const go = async (p, tab) => {
  await p.evaluate(async (tab) => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts'); const vis = await import('/src/ui/vis.ts'); const cm = await import('/src/ui/common.ts');
    vis.setTab('crime17', tab); st.store.area = 'crime'; cm.rerender();
  }, tab);
  await p.waitForTimeout(900);
};
const shot = async (p, name) => { await p.mouse.move(2, 600); await p.waitForTimeout(250); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
const card = async (p, re) => { const c = p.locator('section.card', { hasText: re }).first(); if (await c.count()) { await c.scrollIntoViewIfNeeded().catch(() => {}); await p.evaluate(() => window.scrollBy(0, -60)); } return c; };

const p = await start(1360, 900);
// estado de exemplo: um serviço contratado (favor devido) e a família cobrando
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const M = await import('/src/sim/sys/mob29.ts');
  const C = await import('/src/sim/sys/crime17.ts');
  const O = await import('/src/sim/sys/orglinks29.ts');
  const g = st.store.game;
  const home = C.a3Of(g, g.config.homeCity);
  const fam = C.orgs17(g).find((o) => !o.real && o.rackets.includes('clubs')) ?? C.orgs17(g)[0];
  const v = Object.values(g.acts).find((a) => a.owner !== 'player' && a.status === 'active' && a.fame > 5 && C.a3Of(g, a.city) === home);
  const hired = v ? M.hire29(g, fam.id, 'sabotage', v.id) : null;
  M.doMob29(g, fam.id, 'pizzo_pay');
  const fav = M.owed29(g, fam).find((h) => h.src === 'mob29');
  if (fav) M._mob29.ask29(g, fam, 'sign', fav.id);
  const sin = O.resolveWho29(g, 'Frank Sinatra');
  return { year: g.year, fam: fam.id, famName: fam.name.pt, v: v?.id, vp: v?.members[0], hired: hired?.text.pt, sinatra: sin, outfit: O.orgLinks29(g, 'outfit').length };
});
console.log(JSON.stringify(info));
await go(p, 'orgs');
await shot(p, '01-organizacoes-pedidos');
await card(p, info.famName);
await p.locator('section.card', { hasText: info.famName }).first().locator('details').evaluateAll((ds) => ds.forEach((d) => { d.open = true; }));
await p.waitForTimeout(300);
await shot(p, '02-card-familia-medidor-pedido');
await p.locator('section.card', { hasText: info.famName }).first().locator('.card').first().scrollIntoViewIfNeeded().catch(() => {});
await shot(p, '02b-card-familia-negocios');
if (info.outfit) { await card(p, 'Chicago Outfit'); const d = p.locator('section.card', { hasText: 'Chicago Outfit' }).locator('details').first(); if (await d.count()) await d.evaluate((e) => { e.open = true; }); await shot(p, '03-outfit-laco-documentado'); }
if (info.sinatra) {
  await p.evaluate(async (pid) => { const pg = await import('/src/ui/pages.ts'); pg.openPersonPage(pid, 'connect29'); }, info.sinatra.slice(2));
  await p.waitForTimeout(1200);
  const tabBtn = p.getByRole('tab', { name: /Conexões/ }).first();
  if (await tabBtn.count()) { await tabBtn.click().catch(() => {}); await p.waitForTimeout(600); }
  await shot(p, '04-ficha-sinatra-submundo');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
}
// menu de ações: organização e "Contratar ›" numa pessoa
const ctx = async (ent, id, name, re) => {
  await p.evaluate(async ([ent, id]) => {
    const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/ps/ctx27.ts');
    const a = document.querySelector('main h2, main h1, main button') ?? document.body;
    c.openCtx27(st.store.game, ent, id, a, { x: 430, y: 120 });
  }, [ent, id]);
  await p.waitForTimeout(700);
  if (re) { const x = p.locator('.cx27-menu').getByText(re).first(); if (await x.count()) await x.scrollIntoViewIfNeeded().catch(() => {}); }
  await shot(p, name);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
};
await ctx('org', info.fam, '05-menu-familia', /Contratar a família para/);
if (info.vp) {
  await ctx('person', `p:${info.vp}`, '06-menu-pessoa-contratar', /Contratar .* para/);
  await ctx('org', `hire29:${info.fam}|p:${info.vp}`, '07-submenu-servicos');
}
// planejador com a família como executora
await p.evaluate(async ([fam, vp]) => { const f = await import('/src/ui/sys/crimeform29.ts'); f.presetHire29(fam, 'assault'); if (vp) f.crimeForm17.target = vp; }, [info.fam, info.vp]);
await go(p, 'plans');
const card2 = p.locator('.card .chips').first(); if (await card2.count()) await card2.scrollIntoViewIfNeeded().catch(() => {});
await shot(p, '08-planos-contratar-familia');
await p.context().close();

const m = await start(390, 844);
await m.evaluate(async () => { const st = await import('/src/ui/store.ts'); const M = await import('/src/sim/sys/mob29.ts'); const C = await import('/src/sim/sys/crime17.ts'); const g = st.store.game; const fam = C.orgs17(g).find((o) => !o.real) ?? C.orgs17(g)[0]; M.doMob29(g, fam.id, 'club'); });
await go(m, 'orgs');
const mc = m.locator('section.card').first(); if (await mc.count()) await mc.scrollIntoViewIfNeeded().catch(() => {});
await m.mouse.move(2, 600); await m.screenshot({ path: `${out}/09-celular-card.png` }); console.log('ok 09');
await b.close();
