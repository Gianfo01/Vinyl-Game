// R31 · onda 2 · K + L — capturas das salas da sede em cena: sede com você e a faixa de salas, Estúdio (com sessão e
// painel de ação), Elenco, Equipe (1998, sede grande com andares esmaecidos), Catálogo, Talentos, Troféus e relíquias,
// cenas-assinatura de carreiras, a mesma sala em três épocas/tamanhos e a cena no topo da página do Elenco.
// Uso: npx vite --host 127.0.0.1 --port 5541 &   node scripts/r31/shots-onda2-K.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5541';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
p.setDefaultTimeout(60000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const util = await import('/src/sim/util.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const rl = await import('/src/sim/sys/relics9.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 8; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  const ids = util.playerActs(g);
  // uma sessão de estúdio em andamento (para a cena ter fita, takes e músicos)
  const a = g.acts[ids[0]];
  if (a && !g.sessions.some((x) => !x.done && x.actId === a.id)) {
    const song = a.songs[0] ?? 'k-song';
    g.sessions.push({ id: 'shot-k', actId: a.id, songIds: [song], approach: 'balanced', tier: 0, startDay: g.day, days: 8, dayDone: 3, takes: { [song]: [{ n: 1, quality: 58, note: { pt: 'ok', en: 'ok' } }, { n: 2, quality: 77, note: { pt: 'take mágico', en: 'magic take' } }] }, costPaid: 0, log: [] });
  }
  if (g.acts[ids[0]]) { const pid = g.acts[ids[0]].members[0]; if (g.persons[pid]) g.persons[pid].stress = 82; }
  // acervo para a sala de troféus (uma peça por faixa)
  const L = rl.relics(g).list;
  [[40, 'ticket', 'Ingresso do primeiro show'], [800, 'sticks', 'Baquetas cruzadas'], [9000, 'mic', 'Microfone da sessão'], [85000, 'guitar', 'Guitarra do festival'], [1200000, 'outfit', 'Figurino lendário']]
    .forEach(([v, k, n], i) => L.push({ id: `shot-rl${i}`, k, n: { pt: n, en: n }, y: g.year - 5 - i, own: [], st: 'player', v }));
  return { year: g.year, hq: g.player.hq, acts: ids.length };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name, sel) => {
  await p.waitForTimeout(1600);
  const el = sel ? await p.$(sel) : null;
  if (el) await el.screenshot({ path: `${out}/onda2-K-${name}.png` }); else await p.screenshot({ path: `${out}/onda2-K-${name}.png` });
  console.log('captura', name);
};
const sala = async (id, mut) => p.evaluate(async ([id, mut]) => {
  const s31 = await import('/src/ui/r31/salas31.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = window.__g;
  if (mut) { if (mut.year) g.year = mut.year; if (mut.hq !== undefined) g.player.hq = mut.hq; }
  s31.openSala31(id);
}, [id, mut ?? null]);
const area = async (a) => p.evaluate(async (a) => { const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts'); document.querySelectorAll('.overlay').forEach((e) => e.remove()); st.store.area = a; c.rerender(); }, a);

await area('sede25'); await shot('sede');
await sala('studio'); await shot('estudio', '.s31-page');
await p.click('.s31-hot[data-hot^="m:"]').catch(() => console.error('sem músico')); await shot('estudio-painel', '.s31-page');
await sala('roster'); await shot('elenco', '.s31-page');
await sala('team', { year: 1998, hq: 4 }); await shot('equipe-1998', '.s31-page');
await p.evaluate(async () => { const g = window.__g; g.year = g.config.startYear ?? g.year; });
const base = await p.evaluate(() => ({ y: window.__g.year, hq: window.__g.player.hq }));
await sala('catalog', { year: base.y, hq: 0 }); await shot('catalogo-garagem', '.s31-page');
await sala('catalog', { year: 1985, hq: 2 }); await shot('catalogo', '.s31-page');
await sala('talent', { year: 1975, hq: 2 }); await shot('talentos', '.s31-page');
await sala('trophy', { year: 1975, hq: 3 }); await shot('trofeus', '.s31-page');
for (const [c, y] of [['media', 1965], ['platform', 2018], ['critic', 1980], ['festival', 1972], ['screen', 1990], ['label', 1975]]) { await sala(`sig:${c}`, { year: y, hq: 2 }); await shot(`carreira-${c}`, '.s31-stage'); }
for (const [y, hq] of [[1930, 0], [1975, 2], [2015, 4]]) { await sala('studio', { year: y, hq }); await shot(`epoca-estudio-${y}`, '.s31-stage'); }
await p.evaluate(async () => { window.__g.year = 1975; window.__g.player.hq = 2; });
await area('artists'); await shot('topo-elenco');
await b.close();
