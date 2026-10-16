// R31 · onda 4 (AMOR) — capturas: ficha Coração (par, caso, risco, quem sabe), encontro em cena em três épocas,
// descoberta em cena, pedido no painel de um interior e no menu de pessoa (com o motivo da recusa).
// Uso: npx vite --host 127.0.0.1 --port 5874 &   node scripts/r31/shots-amor.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5874';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 150 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(60000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 3; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  try { for (const k of ['amor31-date', 'amor31-found', 'in31-bar']) localStorage.setItem(`vtn31-seen:${k}`, '1'); localStorage.setItem('vtn31-scene-labels', '1'); } catch {}
  return { year: g.year };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name, sel) => {
  await p.waitForTimeout(1000);
  await p.evaluate(() => { for (const e of document.querySelectorAll('div,section,aside')) if (e.children.length < 12 && /^Nova época/.test(e.textContent ?? '')) e.remove(); document.querySelectorAll('.toast, .toasts').forEach((e) => e.remove()); });
  // barras grudadas (abas, topo) não cobrem o recorte: viram estáticas só para a foto
  await p.evaluate(() => { for (const e of document.querySelectorAll('body *')) { const ps = getComputedStyle(e).position; if ((ps === 'sticky' || ps === 'fixed') && !e.closest('.overlay')) e.style.position = 'static'; } });
  const el = sel ? await p.$(sel) : null;
  if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${out}/${name}.png` }); } else await p.screenshot({ path: `${out}/${name}.png` });
  console.log('captura', name, !!el);
};
// prepara: um par do mundo que aceita (pela conta do jogo), um caso com outra pessoa e alguém que já sabe
const setup = await p.evaluate(async () => {
  const am = await import('/src/sim/sys/amor31.ts');
  const life = await import('/src/sim/sys/life.ts');
  const own = await import('/src/sim/sys/people/owner.ts');
  const g = window.__g;
  const ready = () => { life.life(g).used = -20; own.ownerOf(g).wealth = Math.max(own.ownerOf(g).wealth, 50_000_000); };
  ready();
  const adults = Object.values(g.persons).filter((x) => x.alive && !x.isPlayer && g.year - x.born >= 22 && g.year - x.born <= 50).sort((a, b) => (a.id < b.id ? -1 : 1));
  const out = { partner: '', lover: '', refused: '' };
  for (const x of adults) {
    const k = `p:${x.id}`;
    if (am.askLock31(g, k)) continue;
    const ok = am.askRoll31(g, k) < am.askOdds31(g, k).p;
    if (!out.partner && ok) { am.askOut31(g, k); out.partner = x.name; ready(); continue; }
    if (out.partner && !out.lover && ok) { am.askOut31(g, k); out.lover = x.name; ready(); continue; }
    if (!out.refused && !ok) out.refused = k;
    if (out.partner && out.lover && out.refused) break;
  }
  const st = am.amor31(g);
  const close = Object.values(g.persons).find((x) => x.alive && !x.isPlayer && x.name !== out.partner && x.name !== out.lover);
  if (close) st.knows.push(`p:${close.id}`);
  life.life(g).partner.affinity = 64;
  return out;
});
console.log('preparo', JSON.stringify(setup));
const heart = async () => p.evaluate(async () => {
  const st = await import('/src/ui/store.ts'); const vis = await import('/src/ui/vis.ts'); const c = await import('/src/ui/common.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = 'personal'; vis.setTab('life-personal', 'heart17'); c.rerender();
});
await heart(); await shot('onda4-amor-coracao', '.am31-heart');
// encontro em cena: três épocas
const dateAt = async (year, place) => {
  await p.evaluate(async ([year]) => { window.__g.year = year; }, [year]);
  await heart();
  await p.waitForTimeout(600);
  const open = await p.$('.am31-heart button[aria-expanded="false"]');
  if (open) await open.click();
  await p.waitForTimeout(600);
  const btn = p.locator('.am31-places button', { hasText: place }).first();
  if (await btn.count()) await btn.click(); else console.error('sem lugar', place);
  await p.waitForTimeout(800);
};
const y0 = info.year;
await dateAt(1935, 'Baile'); await shot('onda4-amor-encontro-1935', '.am31');
await dateAt(1962, 'Restaurante'); await shot('onda4-amor-encontro-1962', '.am31');
await dateAt(1984, 'Discoteca'); await shot('onda4-amor-encontro-1984', '.am31');
await dateAt(2024, 'Cinema'); await shot('onda4-amor-encontro-2024', '.am31');
await p.evaluate(async ([y]) => { window.__g.year = y; }, [y0]);
// descoberta
await p.evaluate(async () => { const lv = await import('/src/sim/sys/love17.ts'); const life = await import('/src/sim/sys/life.ts'); life.life(window.__g).fame = 55; lv.discoverAffair17(window.__g, { pt: 'Uma carta esquecida no paletó.', en: 'A letter left in a jacket.' }); });
await heart(); await shot('onda4-amor-descoberta', '.am31-heart .am31-row:last-child');
// pedido num interior (bar da cidade): clica numa pessoa do mundo
await p.evaluate(async () => {
  const pl = await import('/src/sim/sys/place27.ts'); const cm = await import('/src/ui/sys/campus18.ts');
  const g = window.__g;
  const lots = Array.from({ length: 40 }, (_, i) => 20 + i);
  const bar = pl.places27(g, lots).find((x) => x.k === 'bar' || x.k === 'venue');
  window.__bar = bar?.id;
  if (bar) cm.openInside18(bar.id);
});
await p.waitForTimeout(2500);
// clica nas pessoas até achar uma com o pedido no painel (gente do mundo; equipe sem ficha não tem)
const spots = await p.$$('.sc31-spot[data-spot^="who:"]');
let found = false;
for (const sp of spots) { await sp.click({ force: true }); await p.waitForTimeout(400); if (await p.$('.in31-pane .am31-ask')) { found = true; break; } }
if (!found) console.error('ninguém com pedido no interior');
await p.evaluate(() => { const d = document.querySelector('.in31-pane details.am31-why'); if (d) d.open = true; });
await shot('onda4-amor-interior', '.in31 .in31-body');
// menu de pessoa: recusa recente (motivo + quando) no pedido
if (setup.refused) {
  await p.evaluate(async ([k]) => { const am = await import('/src/sim/sys/amor31.ts'); const life = await import('/src/sim/sys/life.ts'); life.life(window.__g).used = -20; am.askOut31(window.__g, k); const ui = await import('/src/ui/r31/amor31ui.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); ui.openAsk31(window.__g, k); }, [setup.refused]);
  await shot('onda4-amor-recusa', '.overlay .modal, .overlay');
}
await b.close();
