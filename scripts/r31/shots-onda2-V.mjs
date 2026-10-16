// R31 · onda 2 (V) — capturas das cenas de mecânica (negociar, renovar, rescindir, contratar, demitir, punir, formação),
// do modo de 2 cliques e da mesa de negociação com o palco.
// Uso: npx vite --host 127.0.0.1 --port 5731 &   node scripts/r31/shots-onda2-V.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5731';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(20000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const info = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const core = await import('/src/ui/r31/scene31core.ts');
  const c = await import('/src/ui/common.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < 8; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  g.player.cash += 20_000_000;
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  c.rerender();
  const t = {};
  for (const k of core.SCENE_KINDS31) t[k] = core.sceneTargets31(g, k).find((x) => core.sceneModel31(g, k, { id: x.id }))?.id ?? null;
  return t;
});
console.log('alvos', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}.png` }); console.log('captura', name); };
const clear = () => p.evaluate(() => document.querySelectorAll('.overlay').forEach((e) => e.remove()));
for (const k of ['nego', 'renew', 'rescind', 'hire', 'fire', 'punish', 'lineup']) {
  if (!info[k]) { console.log('sem alvo', k); continue; }
  await clear();
  await p.evaluate(async ([kind, id]) => { const m = await import('/src/ui/r31/scene31.ts'); m.openScene31(kind, id, 'scene'); }, [k, info[k]]);
  await shot(`onda2-V-${k}`);
}
// clique num balão (o que a pessoa está sentindo) e a decisão (renovar)
if (info.renew) {
  await clear();
  await p.evaluate(async (id) => { const m = await import('/src/ui/r31/scene31.ts'); m.openScene31('renew', id, 'scene'); }, info.renew);
  await p.waitForTimeout(600);
  await p.locator('.sc31-pt.side-them').first().click();
  await p.locator('[data-choice31="renew"]').first().click({ trial: false }).catch(() => {});
  await shot('onda2-V-renew-decidido');
}
// modo de 2 cliques ("Sempre rápido"): painel curto com números e escolhas
if (info.rescind) {
  await clear();
  await p.evaluate(async (id) => { const m = await import('/src/ui/r31/scene31.ts'); m.openScene31('rescind', id, 'quick'); }, info.rescind);
  await shot('onda2-V-2cliques');
}
// a mesa de negociação de sempre, agora com o palco
if (info.nego) {
  await clear();
  await p.evaluate(async (id) => { const m = await import('/src/ui/act27/negotiate27.ts'); m.openNego27(id); }, info.nego);
  await p.waitForTimeout(600);
  await p.getByText('Propor', { exact: true }).first().click().catch(() => {});
  await shot('onda2-V-mesa');
}
await b.close();
