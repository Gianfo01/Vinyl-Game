// R31 · onda 1 (A) — capturas do menu "mundo primeiro": Hoje (3 perguntas + linha do tempo), Sede com a faixa
// "Lugares" e Listas (≤ 6 abas + Mais). Começa pela tela inicial como o jogador e avança alguns meses pelo robô.
// Uso: npx vite --port 5331 &   node scripts/r31/shots-onda1A.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5331';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => { errs.push(e.message); console.error('PAGEERR', e.message); });
await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(60000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const c = await import('/src/ui/common.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 8; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove());
  st.store.area = 'cockpit';
  c.rerender();
  return { year: g.year, month: g.month };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(1000); document; await p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay, aside.tutorial, .tip18').forEach((e) => e.remove())); await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name); };
const clickEntry = async (id) => { await p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay').forEach((e) => e.remove())); await p.locator(`[data-entry31="${id}"] > .nav-head`).first().click(); await p.waitForTimeout(900); };

// 1. Hoje
await clickEntry('hoje');
await shot('onda1-A-hoje');
// 2. Sede (cena + faixa Lugares)
await clickEntry('sede');
await p.evaluate(() => document.querySelector('.places31')?.scrollIntoView({ block: 'start' }));
await shot('onda1-A-sede-lugares');
// 3. Listas (Finanças: abas + Mais)
await clickEntry('listas');
await p.locator('.lists31-tabs button', { hasText: 'Finanças' }).first().click().catch(() => console.error('sem aba Finanças'));
await p.waitForTimeout(900);
await shot('onda1-A-listas');
// conferências rápidas (sem captura)
const chk = await p.evaluate(() => ({
  entries: document.querySelectorAll('.nav31 > .nav31-e').length,
  crumbs: [...document.querySelectorAll('.crumbs15 li')].map((x) => x.textContent?.trim()),
  tabsMax: Math.max(0, ...[...document.querySelectorAll('main .tabs[role=tablist]')].map((t) => [...t.querySelectorAll(':scope > button[role=tab]')].filter((b) => getComputedStyle(b).display !== 'none').length)),
  top: [...document.querySelectorAll('.topbar > *')].map((x) => x.className || x.tagName),
}));
console.log('conferir', JSON.stringify(chk));
// rotas antigas continuam abrindo
for (const a of ['desk', 'inbox', 'finance', 'tour12', 'identity', 'directory']) {
  await p.evaluate((a) => { location.hash = `#/${a}`; }, a);
  await p.waitForTimeout(700);
  console.log('rota', a, '→', await p.evaluate(async () => (await import('/src/ui/store.ts')).store.area));
}
console.log('erros', errs.length);
await b.close();
