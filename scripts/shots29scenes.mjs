// Rodada 29 (cenas) — capturas: folhas de contato (tools/cutsheet29) e cenas dentro do jogo (partida rápida pela
// tela inicial: NOVA RUN → COMEÇAR MINHA HISTÓRIA, pt-BR), mais o Álbum de cenas e o storyboard. Saída em docs/shots29scenes/.
// Uso (servidores de desenvolvimento rodando):
//   npx vite tools/cutsheet29 --port 5299 &   npx vite --port 5327 &
//   node scripts/shots29scenes.mjs [pasta] [porta do jogo] [prefixo] [cenas separadas por vírgula]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/shots29scenes';
const port = process.argv[3] ?? '5327';
const pre = process.argv[4] ?? 'jogo';
const keys = (process.argv[5] ?? 'split,holo,coup,heirs,tech,plat,leg,court').split(',');
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ locale: 'pt-BR', viewport: { width: 1360, height: 900 } });
const p = await ctx.newPage();
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle', timeout: 180000 });
await p.waitForTimeout(1500);
const click = async (re) => { const el = p.getByRole('button', { name: re }).first(); await el.click({ timeout: 60000 }); await p.waitForTimeout(800); };
await click(/NOVA RUN|NEW RUN/i);
await click(/COMEÇAR MINHA HISTÓRIA|START MY STORY/i);
await p.waitForTimeout(2500);
for (let i = 0; i < 6; i++) { const ov = await p.$('.scene-overlay button.icon, .overlay button.icon'); if (!ov) break; await ov.click().catch(() => {}); await p.waitForTimeout(300); }
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts').catch(() => null);
  if (off) off.setTutorials19(st.store.prefs, false);
  const g = st.store.game;
  const wg = await import('/src/sim/worldgen.ts');
  const u = await import('/src/sim/util.ts'); const R19 = await import('/src/sim/rng19.ts');
  let a = Object.values(g.acts).find((x) => x.owner === 'player');
  if (!a) { a = wg.spawnProceduralAct(g, R19.rng19(g, 'act'), { city: g.config.homeCity, fame: 55 }); a.owner = 'player'; }
  window.__a29 = a.id;
});
for (const k of keys) {
  await p.evaluate(async (k) => {
    document.querySelectorAll('.scene-overlay').forEach((e) => e.remove());
    const st = await import('/src/ui/store.ts');
    const ext = await import('/src/sim/ext4.ts');
    const reg = await import('/src/ui/registry.ts');
    const M = await import('/src/ui/ps/cut27model.ts');
    const cm = await import('/src/ui/common.ts');
    const g = st.store.game; const a = g.acts[window.__a29];
    const T = { tech: 'Streaming', verdict: 'Sentença: plágio — vitória do selo.', plat: a.releases.length ? g.releases[a.releases[0]].title : 'Hino da Rua', split: `Sem o baterista, ${a.name} chega ao fim.`, coup: 'Um rival tenta levar o seu artista.', heirs: 'Os herdeiros disputam o catálogo.', court: 'Plágio: a editora pede metade dos direitos.' };
    const d = { key: k, ref: `shot:${k}`, actId: a.id, pid: a.members[0], p: g.persons[a.members[0]]?.name, a: a.name, year: g.year, week: g.week, t: T[k] ?? `${a.name} em turnê`, city: 'tokyo' };
    const cs = ext.queueCutscene(g, 'cut27', { title: M.CUT27[k].title, d, actId: a.id, int23: 'always' });
    try { const al = await import('/src/ui/ps/album29.ts'); al.log29(g, cs, d); } catch { /* checkout antigo */ }
    reg.openCutscene(g, cs, cm.rerender);
  }, k);
  await p.waitForTimeout(3200);
  await p.screenshot({ path: `${out}/${pre}-${k}-meio.png` });
  const skip = p.getByRole('button', { name: /Pular|Skip/ }).first();
  await skip.click().catch(() => {});
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${out}/${pre}-${k}-escolhas.png` });
  const ch = p.locator('.cut27-choices button').first();
  if (await ch.count()) { await ch.click().catch(() => {}); await p.waitForTimeout(500); await p.screenshot({ path: `${out}/${pre}-${k}-resultado.png` }); }
}
// Álbum de cenas (seção "Cenas animadas") e storyboard
await p.evaluate(async () => {
  document.querySelectorAll('.scene-overlay').forEach((e) => e.remove());
  const slot = await import('/src/ui/ps/slot25.ts');
  slot.sedeNav25.go('scenes17');
});
await p.waitForTimeout(1500);
const sec = p.locator('.alb29');
if (await sec.count()) await sec.first().scrollIntoViewIfNeeded();
await p.screenshot({ path: `${out}/${pre}-album.png` });
await p.evaluate(async () => { const e = await import('/src/ui/end28.ts'); const st = await import('/src/ui/store.ts'); e.openStory28(st.store.game); });
await p.waitForTimeout(1200);
const alb = p.locator('.sb28-album');
if (await alb.count()) await alb.first().scrollIntoViewIfNeeded();
await p.screenshot({ path: `${out}/${pre}-storyboard.png` });
await b.close();
