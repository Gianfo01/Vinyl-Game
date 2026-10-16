// R31 · onda 4 (FOS) — capturas da casa da família Fossati (3 épocas), da praça Efro e Lucia Fossati e da aba.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-fos.mjs [pasta] [porta]
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
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 150 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(60000);
await p.screenshot({ path: '/tmp/claude-0/after-start.png' });
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 4; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  try { localStorage.setItem('vtn31-seen:fos31-home', '1'); localStorage.setItem('vtn31-seen:fos31-square', '1'); localStorage.setItem('vtn31-scene-labels', '1'); } catch {}
  return { year: g.year };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name, sel) => {
  await p.waitForTimeout(1000);
  await p.evaluate(() => { for (const e of document.querySelectorAll('div,section,aside')) if (e.children.length < 12 && /^Nova época/.test(e.textContent ?? '')) e.remove(); });
  const el = sel ? await p.$(sel) : null;
  if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${out}/${name}.png` }); } else await p.screenshot({ path: `${out}/${name}.png` });
  console.log('captura', name, !!el);
};
const open = async (view, year, panel, extra) => p.evaluate(async ([view, year, panel, extra]) => {
  const fos = await import('/src/ui/r31/fos31.ts');
  const fam = await import('/src/sim/sys/fossati31.ts');
  const c = await import('/src/ui/common.ts');
  const g = window.__g;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (year) { g.year = year; fam.syncFam31(g); }
  if (extra === 'stolen') { const r = g.x4.relics9.list.find((x) => x.id === 'rl_efro_violin'); if (r) r.st = 'stolen'; }
  if (extra === 'back') { const r = g.x4.relics9.list.find((x) => x.id === 'rl_efro_violin'); if (r) r.st = 'owned'; }
  if (view === 'list') { fos.fosUi31.view = 'list'; const vis = await import('/src/ui/vis.ts'); const st = await import('/src/ui/store.ts'); vis.setTab('worldHub', 'fossati31'); st.store.area = 'world'; c.rerender(); return; }
  fos.openFos31(view, panel);
}, [view, year, panel, extra]);
const y0 = info.year;
await open('list'); await shot('onda4-fos-aba');
// o mapa da cidade com a Casa Fossati (painel do prédio aberto)
await p.evaluate(async () => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts'); st.store.area = 'campus18'; c.rerender(); });
await p.waitForTimeout(2500);
const casa = await p.$('[aria-label*="Casa Fossati"]');
if (casa) { await casa.click({ force: true }); } else console.error('sem a Casa Fossati no mapa');
await shot('onda4-fos-mapa');
await open('home', 1935, 'obj:violin'); await shot('onda4-fos-casa-1935', '.fos31');
await open('home', 1985, 'who:1', 'stolen'); await shot('onda4-fos-casa-1985', '.fos31');
await open('home', 2024, 'obj:antonella', 'back'); await shot('onda4-fos-casa-2024', '.fos31');
await open('square', y0, 'obj:plaque'); await shot('onda4-fos-praca', '.fos31');
// a praça num mês em que a família passeia (procura o mês)
const m = await p.evaluate(async () => { const fam = await import('/src/sim/sys/fossati31.ts'); const g = window.__g; for (let k = 0; k < 24; k++) { if (fam.famSquare31(g).includes('efro')) return g.month; g.month = (g.month + 1) % 12; } return -1; });
console.log('mês com família na praça', m);
await open('square', 0, 'who:0'); await shot('onda4-fos-praca-familia', '.fos31');
// os cinco em tamanho grande (visuais inspirados nas fotos da família)
await p.evaluate(async () => {
  const px = await import('/src/ui/pixel/fos31px.ts');
  const av = await import('/src/ui/pixel/avatar.ts');
  const data = await import('/src/data/fossati31.ts');
  const box = document.createElement('div'); box.id = 'fos31-sheet';
  box.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#2a2633;padding:16px;display:flex;gap:18px;font:13px sans-serif;color:#f4ecd8';
  for (const m of data.FAMILY31) {
    const look = px.fosLook31({ fam: m.id, look: { id: `fam:${m.id}`, age: m.age }, x: 0, pose: 'stand', dir: 'SE', name: m.name, role: { pt: '', en: '' } });
    const cell = document.createElement('div'); cell.style.textAlign = 'center';
    for (const dir of ['SE', 'SW']) {
      const a = av.avatarSprite(look, { year: 2024, pose: 'stand', dir });
      const c = document.createElement('canvas'); c.width = 24; c.height = 34; c.getContext('2d').drawImage(a.c, 0, 0);
      c.style.cssText = 'width:120px;height:170px;image-rendering:pixelated'; cell.append(c);
    }
    const n = document.createElement('div'); n.textContent = `${m.name} · ${m.age}`; cell.append(n); box.append(cell);
  }
  document.body.append(box);
});
await shot('onda4-fos-familia-visuais', '#fos31-sheet');
await b.close();
