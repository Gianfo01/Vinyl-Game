// R31 onda 5 (ACOES5, EXP-13) — capturas do CARTÃO DE AÇÕES ao lado do objeto, com exp5.nav LIGADO, em 3 épocas:
// casa (espelho, cama, escrivaninha/cofre), sede (livro-caixa, mesa de som, maquete), cidade (bar) e mundo (mapa);
// e o antes/depois do espelho da casa (antes: a página antiga inteira dentro do papel; depois: o cartão).
// O estado é mexido SÓ para montar cada exemplo (ano); a interface em si só lê.
// Uso: npx vite --host 127.0.0.1 --port 5893 --config scripts/vite5nw.config.mjs &   node scripts/shots31acoes5.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5893';
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
  const c = await import('/src/ui/common.ts');
  st.store.game.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  sw.setSw(st.store.game, 'exp5.nav', true);
  for (const k of ['casa31', 'sede25', 'campus18', 'world']) localStorage.setItem(`vtn31-seen:${k}`, '1');
  c.rerender();
});
const clean = () => p.evaluate(() => {
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  for (const e of document.querySelectorAll('body *')) if (/^Nova época/.test(e.textContent ?? '') && getComputedStyle(e).position === 'fixed') e.remove();
});
const shot = async (name) => { await p.waitForTimeout(900); await clean(); await p.screenshot({ path: `${out}/onda5-acoes5-${name}.png` }); console.log('captura', name); };
/** Vai à região (viagem da casca) no ano pedido. */
const go = (o) => p.evaluate(async (o) => {
  const st = await import('/src/ui/store.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const ac = await import('/src/ui/r31/acoes5.ts');
  ac.close5();
  if (o.year) st.store.game.year = o.year;
  sh.SH5.paper = null; sh.SH5.pause = false;
  sh.travel5go(o.region);
}, o);
/** Clica no objeto desenhado (data-obj); sem desenho na cena, abre pela tecla do objeto (cartão no meio da tela). */
const card = async (id) => {
  await p.waitForTimeout(700); await clean();
  const el = p.locator(`[data-obj="${id}"]`).first();
  if (await el.count()) { await el.scrollIntoViewIfNeeded(); await el.click({ force: true }); }
  else await p.evaluate(async (id) => { (await import('/src/ui/r31/nav5.ts')).open5(id); }, id);
  await p.waitForSelector('.ac5', { timeout: 5000 }).catch(() => console.error('sem cartão', id));
};
const only = process.env.ONLY;
const cases = [
  // [nome, região, ano, objeto]
  ['casa-espelho-1905', 'casa', 1905, 'espelho'], ['casa-cama-1962', 'casa', 1962, 'cama'], ['casa-espelho-2025', 'casa', 2025, 'espelho'],
  ['casa-calendario-1962', 'casa', 1962, 'calcozinha'], ['casa-retratos-2025', 'casa', 2025, 'retratoscasa'],
  ['sede-livrocaixa-1905', 'sede', 1905, 'livrocaixa'], ['sede-mesasom-1962', 'sede', 1962, 'mesasom'], ['sede-maquete-2025', 'sede', 2025, 'maquete'],
  ['sede-jornal-1962', 'sede', 1962, 'jornal'],
  ['cidade-bar-1905', 'cidade', 1905, 'bar'], ['cidade-banco-1962', 'cidade', 1962, 'banco'], ['cidade-loja-2025', 'cidade', 2025, 'loja'],
  ['mundo-mapa-1905', 'mundo', 1905, 'mapa'], ['mundo-telex-1962', 'mundo', 1962, 'telex'], ['mundo-cultura-2025', 'mundo', 2025, 'cultura'],
];
for (const [name, region, year, id] of cases) {
  if (only && !name.includes(only)) continue;
  await go({ region, year });
  await card(id);
  await shot(name);
}
// antes/depois do espelho da casa (1962): antes = a página antiga inteira no papel (o que o dono viu); depois = o cartão
if (!only || only === 'espelho') {
  await go({ region: 'casa', year: 1962 });
  await p.evaluate(async () => { const ac = await import('/src/ui/r31/acoes5.ts'); const nv = await import('/src/ui/r31/nav5.ts'); ac.passThrough5(() => nv.open5('espelho')); });
  await shot('espelho-antes');
  await go({ region: 'casa', year: 1962 });
  await card('espelho');
  await shot('espelho-depois');
}
await b.close();
