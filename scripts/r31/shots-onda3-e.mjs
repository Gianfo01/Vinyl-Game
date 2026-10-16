// R31 onda 3 (E · Bolsa) — capturas da ficha "Por que vale isso" na aba Bolsa (Você › Bens e investimentos ›
// Investimentos): o seu selo antes do IPO, um selo rival listado aberto e as notícias do pregão com o motivo.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-onda3-e.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5871';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(120000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 14; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  const bo = await import('/src/sim/sys/bolsa10.ts');
  return { year: g.year, labels: Object.keys(bo.bolsa(g).lbl).length };
});
console.log('jogo', JSON.stringify(info));
const show = async (which) => p.evaluate(async (which) => {
  const ui = await import('/src/ui/sys/bolsa10.ts');
  const bo = await import('/src/sim/sys/bolsa10.ts');
  const g = window.__g;
  document.querySelectorAll('.overlay, #e31').forEach((e) => e.remove());
  const box = document.createElement('div');
  box.id = 'e31';
  box.setAttribute('style', 'position:fixed;inset:0;overflow:auto;z-index:9999;background:var(--bg,#111);padding:18px');
  document.body.appendChild(box);
  if (which === 'me') { box.appendChild(ui.whySheet31(g, 'player', true)); return true; }
  const lbId = Object.keys(bo.bolsa(g).lbl).find((k) => g.labels[k]?.active);
  if (which === 'rival' && lbId) { box.appendChild(ui.whySheet31(g, lbId, true)); return true; }
  if (which === 'tab') { box.appendChild(ui.investmentsTab(g)); return true; }
  return false;
}, which);
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda3-e-${name}.png` }); console.log('captura', name); };
if (await show('me')) await shot('seu-selo');
if (await show('rival')) await shot('rival');
if (await show('tab')) await shot('pregao');
await b.close();
