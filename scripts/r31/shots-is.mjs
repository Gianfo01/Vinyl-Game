// R31 · onda 4 (I + S) — capturas: interiores em cena (casa de shows, loja, rádio, estúdio, bar, gravadora rival, hotel,
// loja de instrumentos), entrar pelo mapa (clique no prédio → Entrar), ficha com o bico, submundo (fachada, sala dos fundos,
// baile, delegacia com cadeia, mercado negro) e o mural de ligações.
// Uso: npx vite --host 127.0.0.1 --port 5850 &   node scripts/r31/shots-is.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5850';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
// partida pronta pelo motor (Rio, 1985, selo estabelecido)
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const g = wg.createGame(bot.defaultConfig('shots-is', { scenario: 'established', startYear: 1985, dbSize: 'small', homeCity: 'rio' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  const off = await import('/src/ui/tutoff19.ts');
  off.setTutorials19(st.store.prefs, false);
  try { localStorage.setItem('vtn31-seen:in31-venue', '1'); } catch { /* */ }
  for (let i = 0; i < 3; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  st.store.game = g;
  window.__g = g;
  // um preso na delegacia e um convite de baile para as capturas do submundo
  const cr = await import('/src/sim/sys/crime17.ts');
  const mob = await import('/src/sim/sys/mob29.ts');
  const un = await import('/src/sim/sys/under31.ts');
  const util = await import('/src/sim/util.ts');
  const other = Object.values(g.acts).find((a) => a.owner !== 'player' && a.city === 'rio' && a.members.length && a.status !== 'retired');
  if (other) cr.jailPerson(g, other.members[0], 'BRA', 5, { pt: 'Porte de drogas', en: 'Drug possession' });
  const mine = util.playerActs(g);
  if (mine[0]) cr.jailPerson(g, g.acts[mine[0]].members[0], 'BRA', 2, { pt: 'Briga num bar', en: 'Bar fight' });
  const o = un.underOrgs31(g).here.find((x) => un.facadeOf31(g, x) === 'barracao' || un.facadeOf31(g, x) === 'club') ?? un.underOrgs31(g).here[0];
  if (o && mine[0]) mob._mob29.ask29(g, cr.orgById(g, o.id), 'baile', undefined, mine[0]);
  return { year: g.year, org: o?.id };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda4-is-${name}.png` }); console.log('captura', name); };
const area = async (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = a;
  if (sub) vis.setTab(sub[0], sub[1]);
  c.rerender();
}, [a, sub]);
// 1) pelo mapa: clicar num lugar e entrar
await area('campus18');
await p.waitForTimeout(2500);
const ids = await p.evaluate(() => [...document.querySelectorAll('.w19-hs[data-id^="pl:"], .w19-hs[data-id^="nb:"]')].map((e) => e.getAttribute('data-id')));
console.log('lugares no mapa', ids.length);
if (ids.length) {
  await p.locator(`.w19-hs[data-id="${ids[0]}"]`).first().click({ force: true });
  await p.waitForTimeout(800);
  await p.getByRole('button', { name: /Entrar \(ver por dentro\)/ }).first().click({ timeout: 8000 }).catch(() => console.error('sem botão Entrar'));
  await p.waitForTimeout(1200);
  await shot('mapa-entrar');
}
// 2) cada interior (mesma cena do mapa), num quadro do tamanho da página
const inside = async (k, name, panel, org) => {
  const ok = await p.evaluate(async ([k, panel, org]) => {
    const pl = await import('/src/sim/sys/place27.ts');
    const ins = await import('/src/ui/r31/inside31.ts');
    const gen = await import('/src/sim/sys/gente31.ts');
    const g = window.__g;
    const lots = Array.from({ length: 18 }, (_, i) => 40 + i);
    const ps = pl.places27(g, lots);
    const pc = ps.find((x) => x.k === k && (!org || x.org === org)) ?? ps.find((x) => x.k === k);
    const x = pc ? { id: `shot:${pc.id}`, k: pc.k, name: pc.name.pt, what: pc.what.pt, people: pc.people, year: g.year, city: g.config.homeCity, seed: g.config.seed, place: pc, org: pc.org }
      : { id: `shot:${k}`, k, name: k, people: gen.crew31(g, k) ?? [], year: g.year, city: g.config.homeCity, seed: g.config.seed };
    document.querySelectorAll('.shot31').forEach((e) => e.remove());
    const box = document.createElement('div');
    box.className = 'shot31';
    box.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#12141c;overflow:auto';
    const el = ins.insideView31(g, x, () => {});
    box.append(el);
    document.body.append(box);
    return !!pc;
  }, [k, panel, org]);
  if (panel) await p.locator(`.shot31 .sc31-spot[data-spot="${panel}"]`).first().click({ force: true }).catch(() => console.error('sem ponto', panel));
  await shot(name);
  return ok;
};
await inside('venue', 'casa-de-shows', 'bill');
await inside('records', 'loja-de-discos', 'shelf');
await inside('radio', 'radio', 'booth');
await inside('studio', 'estudio', 'desk');
await inside('bar', 'bar', 'counter');
await inside('label', 'gravadora-rival', 'gold');
await inside('hotel', 'hotel', 'desk');
await inside('instruments', 'loja-de-instrumentos', null);
// ficha de quem faz bico
await p.evaluate(async () => {
  document.querySelectorAll('.shot31').forEach((e) => e.remove());
  const gen = await import('/src/sim/sys/gente31.ts');
  const c = await import('/src/ui/common.ts');
  const j = Object.values(gen.gente31(window.__g).j).find((x) => x.bico);
  if (j) c.inspect.person(j.p);
});
await shot('ficha-bico');
await p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
// 3) submundo
await inside('police', 'delegacia', 'cells');
await inside('market', 'mercado-negro', 'crates');
await inside('facade', 'fachada-baile', 'stage', info.org);
await p.evaluate(async () => {
  document.querySelectorAll('.shot31').forEach((e) => e.remove());
});
await area('crime', ['crime17', 'city31']);
await p.waitForTimeout(1500);
await shot('submundo-cidade');
await p.evaluate(() => document.querySelector('.in31-mural')?.scrollIntoView({ block: 'start' }));
await shot('mural');
// sala dos fundos: entrar pela porta da fachada
await p.evaluate(async () => {
  const un = await import('/src/sim/sys/under31.ts');
  const mob = await import('/src/sim/sys/mob29.ts');
  for (const a of mob.asks29(window.__g)) if (a.k === 'baile') mob.refuse29(window.__g, a.id);
  void un;
});
await inside('facade', 'fachada', null, info.org);
await p.locator('.shot31 .sc31-spot[data-spot="back"]').first().click({ force: true }).catch(() => console.error('sem porta'));
await p.waitForTimeout(800);
await inside('facade', 'sala-dos-fundos', 'table', info.org);
console.log('erros', errs.length);
await b.close();
