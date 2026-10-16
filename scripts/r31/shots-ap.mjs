// R31 · onda 3 (AP) — capturas da aparência: bloco na ficha, tela de cuidados (3 formas de pagar), recusa com
// "Insistir", opção "Pressão estética" e o boneco antes/depois (forma e estilo).
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-ap.mjs [pasta] [porta]
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
for (let i = 0; i < 240 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(60000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const util = await import('/src/sim/util.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 6; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  let mine = util.playerActs(g);
  if (!mine.length) {
    const a = Object.values(g.acts).find((x) => x.status === 'active' && x.members.length);
    a.owner = 'player'; mine = util.playerActs(g);
  }
  const a = g.acts[mine[0]];
  g.player.cash += 1e9; a.cash = (a.cash ?? 0) + 1e9;
  window.__g = g;
  return { year: g.year, act: a.id, pid: a.members[0] };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda3-ap-${name}.png` }); console.log('captura', name); };
const clear = () => p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));

// 1) ficha com o bloco Aparência (antes)
await p.evaluate(async (pid) => { const f = await import('/src/ui/sys/persona13.ts'); f.openFicha13(`p:${pid}`); }, info.pid);
await p.getByRole('button', { name: /Ficha completa/ }).first().click({ timeout: 8000 }).catch(() => p.getByRole('tab', { name: /Ficha completa/ }).first().click({ timeout: 4000 }).catch(() => console.error('sem Ficha completa'))); await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('.look31')?.scrollIntoView({ block: 'center' })); await shot('ficha');
await clear();
// 2) tela de cuidados
await p.evaluate(async (pid) => { const u = await import('/src/ui/r31/look31ui.ts'); u.openLook31(window.__g, pid); }, info.pid);
await shot('cuidados');
// 3) recusa com "Insistir" (cirurgia num artista que não quer)
const refused = await p.evaluate(async (pid) => {
  const L = await import('/src/sim/look31.ts');
  for (let i = 0; i < 12; i++) { window.__g.week++; const r = L.doLook31(window.__g, pid, 'surgery', 'co'); if (r.refused) return true; if (r.ok) return false; }
  return false;
}, info.pid);
console.log('recusou', refused);
await clear();
await p.evaluate(async (pid) => { const u = await import('/src/ui/r31/look31ui.ts'); u.openLook31(window.__g, pid); }, info.pid);
const btn = p.locator('.look31-svc li').filter({ hasText: 'Cirurgia plástica' }).getByRole('button', { name: /Pela empresa/ }).first();
await btn.click({ timeout: 5000 }).catch(() => console.error('sem botão de cirurgia'));
await p.waitForTimeout(600); await p.evaluate(() => document.querySelector('.look31-svc .card.bad')?.scrollIntoView({ block: 'center' }));
await shot('recusa');
await clear();
// 4) depois de academia + estilista: ficha e boneco mudam
await p.evaluate(async (pid) => {
  const L = await import('/src/sim/look31.ts');
  for (let i = 0; i < 4; i++) { window.__g.week++; L.doLook31(window.__g, pid, 'gym', 'co', { insist: true }); }
  L.doLook31(window.__g, pid, 'style', 'co', { insist: true });
  L.doLook31(window.__g, pid, 'consult', 'co', { insist: true });
  (await import('/src/ui/common.ts')).rerender();
}, info.pid);
await p.evaluate(async (pid) => { const f = await import('/src/ui/sys/persona13.ts'); f.openFicha13(`p:${pid}`); }, info.pid);
await p.getByRole('button', { name: /Ficha completa/ }).first().click({ timeout: 8000 }).catch(() => p.getByRole('tab', { name: /Ficha completa/ }).first().click({ timeout: 4000 }).catch(() => console.error('sem Ficha completa'))); await p.waitForTimeout(800);
await p.evaluate(() => document.querySelector('.look31')?.scrollIntoView({ block: 'center' })); await shot('ficha-depois');
await clear();
// 5) boneco antes/depois (sprite do jogo, mesma pessoa)
await p.evaluate(async (pid) => {
  const av = await import('/src/ui/pixel/avatar.ts');
  const c = await import('/src/ui/common.ts');
  const dom = await import('/src/ui/dom.ts');
  const g = window.__g;
  const per = g.persons[pid];
  const after = av.portraitCanvas(per, g, 5);
  const keep = g.x4.look31.p[pid]; delete g.x4.look31.p[pid];
  const before = av.portraitCanvas({ ...per, id: per.id }, g, 5);
  g.x4.look31.p[pid] = keep;
  c.modal('Boneco: antes × depois', dom.h('div', { class: 'row' }, dom.h('div', null, dom.h('p', null, 'Antes'), before), dom.h('div', null, dom.h('p', null, 'Depois (forma e estilo)'), after)));
}, info.pid);
await shot('boneco');
await clear();
// 6) opção Pressão estética
await p.evaluate(async () => {
  const u = await import('/src/ui/r31/look31ui.ts');
  const c = await import('/src/ui/common.ts');
  const dom = await import('/src/ui/dom.ts');
  c.modal('Opções (trecho)', dom.h('div', { class: 'form' }, u.settingsLook31()));
});
await shot('opcao');
await b.close();
