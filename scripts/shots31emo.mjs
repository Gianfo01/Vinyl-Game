// R31 · onda 4 (EMO) — capturas antes/depois da troca de emojis por ícones em pixel art: cenas (lançamento, banco,
// negociação), salas (troféus, estúdio), loja, sede, casa Fossati, conquistas, avisos e Finanças; e a folha de ícones.
// Começa pela tela inicial como o jogador: NOVA RUN → COMEÇAR MINHA HISTÓRIA; depois avança pela simulação com o robô.
// Uso: npx vite --host 127.0.0.1 --port 5891 &   node scripts/shots31emo.mjs <antes|depois> [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const tag = process.argv[2] ?? 'depois';
const out = process.argv[3] ?? 'docs/r31/shots';
const port = process.argv[4] ?? '5891';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(120000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const util = await import('/src/sim/util.ts');
  const pj = await import('/src/sim/sys/project8.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 36; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  g.player.cash += 300000000;
  const a = util.playerActs(g)[0];
  if (a) pj.createProject(g, a, { type: 'lp' });
  window.__g = g;
  return { year: g.year, acts: util.playerActs(g).length };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(1300); await p.screenshot({ path: `${out}/onda4-emo-${name}-${tag}.png` }); console.log('captura', name); };
const clear = () => p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
const scene = async (kind) => p.evaluate(async (kind) => {
  const reg = await import('/src/ui/r31/scene31reg.ts');
  await import('/src/ui/r31/mech31.ts');
  const core = await import('/src/ui/r31/scene31core.ts');
  const g = window.__g;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const x = core.sceneTargets31(g, kind)[0];
  if (!x) return null;
  reg.sceneHook31.open(kind, x.id, 'scene');
  return x.name;
}, kind);
const area = async (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (sub) vis.setTab(sub[0], sub[1]);
  st.store.area = a;
  c.rerender();
}, [a, sub]);
// mostra um componente no lugar do conteúdo principal (só para a captura)
const mount = async (mod, fn, ...args) => p.evaluate(async ([mod, fn, args]) => {
  const m = await import(mod);
  const g = window.__g;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const host = document.querySelector('main') ?? document.body;
  const el = m[fn](g, ...args);
  host.replaceChildren(el);
  host.scrollTop = 0;
}, [mod, fn, args]);

for (const k of ['release', 'bank', 'nego']) {
  const n = await scene(k);
  if (!n) { console.error('sem alvo para', k); continue; }
  await p.evaluate(() => document.querySelector('.mc31')?.scrollIntoView({ block: 'start' }));
  await shot(`cena-${k}`);
}
await clear();
for (const id of ['trophy', 'studio']) {
  await p.evaluate(async (id) => { const s = await import('/src/ui/r31/salas31.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); s.openSala31(id); }, id);
  await shot(`sala-${id}`);
}
await area('hq'); await shot('sede');
await mount('/src/ui/r31/shop31.ts', 'shop31Tab'); await shot('loja');
await mount('/src/ui/sys/fossati31.ts', 'famTab31'); await shot('casa-fossati');
await p.evaluate(async () => {
  const a = await import('/src/ui/ach27.ts');
  const host = document.querySelector('main') ?? document.body;
  host.replaceChildren(a.gameAch27(window.__g, new Set()));
});
await shot('conquistas');
await area('desk'); await p.evaluate(() => document.querySelector('.alerts29, .al29, [class*="alert"]')?.scrollIntoView({ block: 'start' })); await shot('avisos');
await area('finance'); await shot('financas');
await area('home'); await shot('hoje');
if (tag === 'depois') {
  // folha com todos os ícones do mapa (nome + emojis que ele cobre)
  await p.evaluate(async () => {
    const e = await import('/src/ui/pixel/emo31.ts');
    const by = new Map();
    for (const [ch, v] of e.EMO31) by.set(v.icon, (by.get(v.icon) ?? '') + ch);
    const grid = document.createElement('div');
    grid.id = 'emo-folha';
    grid.style.cssText = 'position:absolute;left:0;top:0;width:1180px;z-index:99999;display:grid;grid-template-columns:repeat(10,1fr);gap:8px;padding:16px;background:#15212e;color:#f4e4b8;font:11px monospace';
    for (const [icon, chars] of by) {
      const c = document.createElement('div');
      c.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px;border:1px solid #2a3a4e';
      const img = document.createElement('img'); img.src = e.pxIconUrl31(icon, 3); img.width = img.height = 48; img.style.imageRendering = 'pixelated';
      const n = document.createElement('b'); n.textContent = icon;
      const s = document.createElement('span'); s.textContent = [...chars].map((ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase()}`).slice(0, 3).join(' ');
      s.style.opacity = '0.6'; s.style.fontSize = '9px';
      c.append(img, n, s); grid.append(c);
    }
    document.body.append(grid);
    window.scrollTo(0, 0);
  });
  await p.waitForTimeout(800);
  await (await p.$('#emo-folha')).screenshot({ path: `${out}/onda4-emo-folha.png` });
  console.log('captura folha');
}
await b.close();
console.log('ok:', out);
