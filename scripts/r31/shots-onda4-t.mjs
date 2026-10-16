// R31 onda 4 (T · Aeroporto, transporte e leilões) — capturas das cenas: aeroporto em quatro épocas (estação e porto,
// campo de pouso, terminal, jatos + hangar + holograma), casa de leilões em quatro salas (salão com lustre, auditório,
// tela online, aplicativo) e o painel de lance no dia do pregão.
// Uso: npx vite --host 127.0.0.1 --port 5871 &   node scripts/r31/shots-onda4-t.mjs [pasta] [porta]
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
p.setDefaultTimeout(180000);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const off = await import('/src/ui/tutoff19.ts');
  st.store.game.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  try { localStorage.setItem('vtn31-seen:airport', '1'); localStorage.setItem('vtn31-seen:auction', '1'); localStorage.setItem('vtn31-scene-labels', '1'); } catch { /* */ }
});
/** Monta uma partida no ano pedido e mostra a área (só leitura da tela; o preparo do estado é do roteiro). */
const show = async (area, year, prep) => p.evaluate(async ([area, year, prep]) => {
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const reg = await import('/src/ui/registry.ts');
  const tick = await import('/src/sim/tick.ts');
  const r9 = await import('/src/sim/sys/relics9.ts');
  const au = await import('/src/sim/sys/auction31.ts');
  const tr = await import('/src/sim/sys/travel31.ts');
  const util = await import('/src/sim/util.ts');
  const g = wg.createGame(bot.defaultConfig(`shots-t-${year}`, { startYear: year, realNames: false }));
  g.player.cash += 5e9;
  for (let i = 0; i < 3; i++) tick.advanceMonth(g);
  let mine = util.playerActs(g)[0];
  if (!mine) { const a = Object.values(g.acts).filter((x) => x.members.length && !x.owner).sort((x, y) => y.fame - x.fame)[0]; a.owner = 'player'; mine = a.id; }
  if (prep === 'lots') {
    for (const [k, v, n] of [['guitar', 380000, 'Guitarra do show de despedida'], ['outfit', 60000, 'Figurino da turnê'], ['lyrics', 12000, 'Letra manuscrita']]) {
      const rl = r9.addRelic(g, k, { pt: n, en: n }, undefined, undefined, v, year - 12);
      rl.own[0][0] = 'Herdeiros de um maestro'; rl.own.push(['Colecionador de Lisboa', year - 4, 'compra']);
      rl.st = 'auction';
    }
    au.ensureSessions31(g); au.assignLots31(g);
    const se = au.openSessions31(g).find((x) => x.lots.length);
    if (se) se.w = g.week; // dia do pregão
  }
  if (prep === 'sea') { const ks = tr.cruiseOpen31(g); if (ks[0]) tr.bookCruise31(g, mine, ks[0], tr.linerPorts31(g)[0]); }
  window.__g = g;
  document.querySelectorAll('.overlay, #t31').forEach((e) => e.remove());
  const box = document.createElement('div');
  box.id = 't31';
  box.setAttribute('style', 'position:fixed;inset:0;overflow:auto;z-index:9999;background:var(--bg,#111);padding:18px');
  document.body.appendChild(box);
  const a = reg.EXTRA_AREAS.find((x) => x.id === area);
  if (!a) return false;
  box.appendChild(a.render(g));
  return true;
}, [area, year, prep ?? '']);
const shot = async (name) => { await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/onda4-t-${name}.png` }); console.log('captura', name); };
for (const [y, n, prep] of [[1910, 'aeroporto-1910-estacao', ''], [1925, 'aeroporto-1925-campo', 'sea'], [1950, 'aeroporto-1950-terminal', ''], [2030, 'aeroporto-2030-jatos', '']]) {
  if (await show('airport31', y, prep)) await shot(n);
}
for (const [y, n] of [[1905, 'leilao-1905-salao'], [1978, 'leilao-1978-auditorio'], [2004, 'leilao-2004-tela'], [2025, 'leilao-2025-app']]) {
  if (await show('auction31', y, 'lots')) await shot(n);
}
// painel de lance no dia do pregão (clica na sua plaquinha)
if (await show('auction31', 1978, 'lots')) {
  await p.locator('#t31 [data-spot="you"]').first().click({ timeout: 8000 }).catch(() => console.error('sem plaquinha'));
  await shot('leilao-lance');
}
if (await show('airport31', 2030, '')) {
  await p.locator('#t31 [data-spot="holo"]').first().click({ timeout: 8000 }).catch(() => console.error('sem holograma'));
  await shot('aeroporto-holograma');
}
if (await show('airport31', 1985, '')) {
  await p.locator('#t31 [data-spot="sea"]').first().click({ timeout: 8000 }).catch(() => console.error('sem cais'));
  await shot('aeroporto-cruzeiro');
}
await b.close();
