// R31 onda 5 (CASA) — capturas da casa como "Você" e da sede que cresce, com exp5.nav LIGADO:
// casa em aluguel / apartamento / casa / mansão em épocas diferentes; sede em garagem / escritório / andar / prédio; maquete (tecla 2).
// O estado é mexido SÓ para montar cada exemplo (ano, moradia, nível da sede); a interface em si só lê.
// Uso: npx vite --host 127.0.0.1 --port 5891 &   node scripts/shots31casa5.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5891';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  st.store.game.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  sw.setSw(st.store.game, 'exp5.nav', true);
  for (const k of ['casa31', 'sede25']) localStorage.setItem(`vtn31-seen:${k}`, '1');
});
const shot = async (name, sel) => {
  await p.waitForTimeout(1300);
  const el = sel ? await p.$(sel) : null;
  if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${out}/onda5-casa-${name}.png` }); }
  else await p.screenshot({ path: `${out}/onda5-casa-${name}.png` });
  console.log('captura', name);
};
const setup = (o) => p.evaluate(async (o) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const ow = await import('/src/sim/sys/people/owner.ts');
  const g = st.store.game;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (o.year) g.year = o.year;
  if (o.house !== undefined) ow.ownerOf(g).house = o.house < 0 ? -1 : ow.HOUSES.findIndex((h) => h.id === o.house);
  if (o.kids !== undefined) { const k = ow.ownerOf(g).kids; k.length = 0; for (let i = 0; i < o.kids; i++) k.push({ name: `Filho ${i + 1}`, born: g.year - 6 - i * 3 }); }
  if (o.hq !== undefined) g.player.hq = o.hq;
  if (o.gold !== undefined) g.player.stats.gold = o.gold;
  st.store.area = o.area;
  c.rerender();
}, o);
const cases = [
  ['aluguel-1905', { year: 1905, house: -1, kids: 0, gold: 0, area: 'casa31' }],
  ['apartamento-1975', { year: 1975, house: 'apartment', kids: 1, gold: 1, area: 'casa31' }],
  ['casa-1962', { year: 1962, house: 'suburb', kids: 2, gold: 2, area: 'casa31' }],
  ['mansao-2025', { year: 2025, house: 'smart', kids: 2, gold: 3, area: 'casa31' }],
  ['mansao-1935', { year: 1935, house: 'artdeco', kids: 0, gold: 1, area: 'casa31' }],
  ['sede-garagem-1962', { year: 1962, hq: 0, area: 'sede25' }],
  ['sede-escritorio-1975', { year: 1975, hq: 1, area: 'sede25' }],
  ['sede-andar-1990', { year: 1990, hq: 2, area: 'sede25' }],
  ['sede-predio-2000', { year: 2000, hq: 4, area: 'sede25' }],
  ['maquete-1975', { year: 1975, hq: 1, area: 'hq' }],
];
const only = process.env.ONLY;
for (const [name, o] of cases) {
  if (only && !name.includes(only)) continue;
  await setup(o);
  await shot(name);
}
// bilhete de marcadores (espelho) e cartão de sala na sede
if (!only || only === 'extra') {
  await setup({ year: 1975, house: 'apartment', kids: 1, area: 'casa31' });
  await p.locator('.r5-spot[aria-label^="Espelho"]').first().click(); await shot('marcadores-espelho');
  await setup({ year: 1975, hq: 1, area: 'sede25' });
  await p.locator('.r5-spot[aria-label^="Sua sala"]').first().click(); await shot('sede-sala-objetos');
}
await b.close();
