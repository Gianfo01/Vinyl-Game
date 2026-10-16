// R31 · onda 4 (UNI-4) — capturas das fusões que aparecem na tela: sua rádio como estação do mercado (Mídia › Rádio),
// a confiança do cliente no escritório de empresário (Gestão de artistas) e as casas num registro só (Shows).
// Começa pela tela inicial como o jogador: NOVA RUN → COMEÇAR MINHA HISTÓRIA; depois o robô joga e a cena é preparada
// pelas funções do jogo (fundar rádio, pôr artista na programação, aceitar cliente).
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/shots31uni4.mjs [pasta] [porta]
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
p.setDefaultTimeout(180000); // primeira compilação do vite pode demorar com a máquina carregada
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
  const v9 = await import('/src/sim/sys/ventures9.ts');
  const m12 = await import('/src/sim/sys/media12.ts');
  const g = st.store.game;
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  g.player.cash += 50_000_000;
  for (let i = 0; i < 12; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  v9.foundVenture(g, 'media', 'label', { media: 'radio', name: 'Rádio Vinil FM' });
  const v = v9.ventures(g).list.find((x) => x.kind === 'media');
  const mine = util.playerActs(g);
  if (v && mine[0]) { m12.medOf(g, v.id); m12.setSlot(g, v.id, 0, 'rotation', mine[0]); if (mine[1]) m12.setSlot(g, v.id, 1, 'premiere', mine[1]); }
  // um cliente de empresário (a satisfação virou a confiança da ficha)
  const cand = Object.values(g.acts).filter((a) => a.owner && a.owner !== 'player' && a.status === 'active').sort((a, b) => b.fame - a.fame)[3];
  if (cand) v9.ventures(g).mg.clients.push({ actId: cand.id, rate: 0.15, since: g.week, earned: 0 });
  for (let i = 0; i < 2; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__g = g;
  return { year: g.year, radio: v?.id, mine };
});
console.log('jogo', JSON.stringify(info));
const shot = async (name) => { await p.waitForTimeout(900); await p.screenshot({ path: `${out}/onda4-uni4-${name}.png` }); console.log('captura', name); };
const area = async (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  st.store.area = a;
  if (sub) vis.setTab(sub[0], sub[1]);
  c.rerender();
}, [a, sub]);

await area('media', ['mediaHub', 'radio18']);
await p.evaluate(() => [...document.querySelectorAll('h2,h3,.section-title')].find((e) => /Estações/.test(e.textContent ?? ''))?.scrollIntoView({ block: 'start' }));
await shot('radio');
await area('management', ['management9', 'roster']);
await shot('empresario');
await area('ventures', null);
await shot('empreendimentos');
await b.close();
