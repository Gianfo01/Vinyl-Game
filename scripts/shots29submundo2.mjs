// Rodada 29b (Submundo) — capturas: Cockpit "Favores e dívidas", crime digital (card com emblema de chip), votação de
// prêmio comprada no planejador, e facções × cenas (card da organização e "A cena e o submundo" na página do ato).
// Partida rápida pela tela inicial (NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR); o ano é ajustado para mostrar cada época.
// Uso (servidor rodando):  npx vite --port 5331 &   node scripts/shots29submundo2.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29submundo';
const port = process.argv[3] ?? '5331';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 180000 });
await p.waitForTimeout(1500);
const click = async (re) => { await p.getByRole('button', { name: re }).first().click({ timeout: 60000 }); await p.waitForTimeout(800); };
await click(/NOVA RUN|NEW RUN/i);
await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay, .scene-overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
const shot = async (name) => { await p.mouse.move(2, 600); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${name}.png` }); console.log('ok', name); };
const go = async (area, tab) => {
  await p.evaluate(async ([area, tab]) => {
    document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts'); const vis = await import('/src/ui/vis.ts'); const cm = await import('/src/ui/common.ts');
    if (tab) vis.setTab(tab[0], tab[1]); st.store.area = area; cm.rerender();
  }, [area, tab]);
  await p.waitForTimeout(1000);
};
// estado de exemplo (ano 2012: crime digital e funk no Rio): favor devido, pedido com prazo, cena do funk
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts').catch(() => null);
  if (off) off.setTutorials19(st.store.prefs, false);
  const g = st.store.game;
  g.year = 2012; g.player.cash = Math.max(g.player.cash, 5e8);
  const M = await import('/src/sim/sys/mob29.ts');
  const C = await import('/src/sim/sys/crime17.ts');
  let mine = Object.values(g.acts).find((a) => a.owner === 'player');
  if (!mine) { const wg = await import('/src/sim/worldgen.ts'); const u = await import('/src/sim/util.ts'); const R19 = await import('/src/sim/rng19.ts'); mine = wg.spawnProceduralAct(g, R19.rng19(g, 'act'), { city: 'rio', genre: 'funk_carioca', fame: 30 }); mine.owner = 'player'; }
  const v = Object.values(g.acts).find((a) => a.owner !== 'player' && a.status === 'active' && a.fame > 5 && a.debutYear <= 1962);
  if (v) M.hire29(g, 'fleak', 'cy:leak', v.id);
  const o = C.orgById(g, 'fleak');
  const fav = M.owed29(g, o).find((h) => h.src === 'mob29');
  if (fav) M._mob29.ask29(g, o, 'cut', fav.id);
  if (mine) { mine.genre = 'funk_carioca'; mine.city = 'rio'; const cv = C.orgById(g, 'cv'); M._mob29.ask29(g, cv, 'baile', undefined, mine.id); }
  return { mine: mine?.id, v: v?.id };
});
console.log(JSON.stringify(info));
await go('cockpit', ['ck20', 'panel']);
const fc = p.locator('.ck27-favors').first(); if (await fc.count()) await fc.scrollIntoViewIfNeeded().catch(() => {});
await shot('10-cockpit-favores');
await go('crime', ['crime17', 'orgs']);
const cy = p.locator('section.card', { hasText: 'Vazamento Zero' }).first(); if (await cy.count()) { await cy.scrollIntoViewIfNeeded().catch(() => {}); await cy.locator('details').evaluateAll((ds) => ds.forEach((d) => { d.open = true; })); }
await shot('11-crime-digital-card');
const cvc = p.locator('section.card', { hasText: 'Comando Vermelho' }).first(); if (await cvc.count()) { await cvc.scrollIntoViewIfNeeded().catch(() => {}); }
await shot('12-cv-cena-funk');
// planejador: manipular a votação de um prêmio
await p.evaluate(async (v) => { const f = await import('/src/ui/sys/crimeform29.ts'); f.crimeForm17.c = 'award_rig'; f.crimeForm17.actor = 'player'; f.crimeForm17.method = 'bots'; f.crimeForm17.cat = 'gramo'; if (v) f.crimeForm17.target = v; }, info.mine);
await go('crime', ['crime17', 'plans']);
const cc = p.locator('.card .chips').first(); if (await cc.count()) await cc.scrollIntoViewIfNeeded().catch(() => {});
await shot('13-planos-premio-comprado');
// página do ato: "A cena e o submundo"
if (info.mine) {
  await p.evaluate(async (id) => { const pg = await import('/src/ui/pages.ts'); pg.openActPage(id, 'connect29'); }, info.mine);
  await p.waitForTimeout(1200);
  const tb = p.getByRole('tab', { name: /Conexões/ }).first(); if (await tb.count()) { await tb.click().catch(() => {}); await p.waitForTimeout(600); }
  await shot('14-ato-cena-submundo');
}
await b.close();
