// R31 onda 4 (T2 · proposta fechada, leilão silencioso e alfândega) — capturas das três cenas novas em épocas
// diferentes e dos painéis principais (urna, abertura dos envelopes, folha de lances, carga parada).
// Uso: npx vite --host 127.0.0.1 --port 5872 &   node scripts/r31/shots-onda4-t2.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5872';
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
  try { for (const k of ['sealed', 'bauc', 'customs']) localStorage.setItem(`vtn31-seen:${k}`, '1'); localStorage.setItem('vtn31-scene-labels', '1'); } catch { /* */ }
});
/** Monta uma partida no ano pedido, prepara o estado do roteiro e mostra a área (a tela só lê). */
const show = async (area, year, prep) => p.evaluate(async ([area, year, prep]) => {
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const reg = await import('/src/ui/registry.ts');
  const tick = await import('/src/sim/tick.ts');
  const r9 = await import('/src/sim/sys/relics9.ts');
  const m19 = await import('/src/sim/sys/money19.ts');
  const se = await import('/src/sim/sys/sealed31.ts');
  const ba = await import('/src/sim/sys/bauc31.ts');
  const cu = await import('/src/sim/sys/customs31.ts');
  const cr = await import('/src/sim/sys/crime17.ts');
  const ui = await import('/src/ui/r31/sealed31ui.ts');
  const g = wg.createGame(bot.defaultConfig(`shots-t2-${year}`, { startYear: year, realNames: false }));
  g.player.cash += 5e9;
  for (let i = 0; i < 2; i++) tick.advanceMonth(g);
  const catalog = (n) => {
    const lbs = Object.values(g.labels).filter((x) => x.active).sort((a, c) => (a.id < c.id ? -1 : 1));
    const lb = lbs[0];
    const rels = Object.values(g.releases).filter((r) => r.owner !== 'player').slice(0, n);
    for (const r of rels) { r.owner = lb.id; r.revenue = Math.max(r.revenue, 6e6); r.totalUnits = Math.max(r.totalUnits, 20000); r.year = g.year - 3; }
    for (const x of lbs.slice(1, 5)) { x.strategy = 'buy_catalog'; x.cash = Math.max(x.cash, 5e8); }
    return { lb: lb.id, rels };
  };
  if (prep === 'tender') {
    const c = catalog(6);
    const a = m19.openAuction19(g, c.lb, g.labels[c.lb].name, c.rels, 'bankrupt');
    for (const x of Object.values(g.labels).filter((y) => y.active && y.id !== c.lb).slice(0, 3)) a.bids.push({ who: x.id, name: x.name, amt: Math.round(a.ask * 1.2), w: g.week });
  }
  if (prep === 'opened') {
    const c = catalog(6);
    const t = se.openTender31(g, 'estate', 'estate:x', 'Espólio de um maestro', c.rels);
    if (t) { se.deliver31(g, t.id, Math.round(t.fair * 1.05)); se.openEnvelopes31(g, t); ui.sealedUi31.id = t.id; ui.sealedUi31.opened = 99; }
  }
  if (prep === 'sheet' || prep === 'hot') {
    const rl = r9.addRelic(g, 'guitar', { pt: 'Guitarra do festival', en: 'Festival guitar' }, undefined, undefined, 90000, year - 15);
    rl.st = 'stolen';
    delete g.x4.bauc31;
    ba.newSheet31(g);
    const sh = ba.sheet31(g);
    if (sh) { for (const x of sh.lots) for (const y of x.lines) y.w = g.week; const lot = sh.lots[0]; ba.writeBid31(g, lot.id, ba.top31(g, lot).need); }
    if (prep === 'hot') cr.addHeat(g, 'player', cr.a3Of(g, g.config.homeCity), 80);
  }
  if (prep === 'cargo') {
    const a = r9.addRelic(g, 'outfit', { pt: 'Figurino da turnê', en: 'Tour outfit' }, undefined, undefined, 40000, year - 10); a.st = 'player';
    const b2 = r9.addRelic(g, 'guitar', { pt: 'Guitarra sem nota', en: 'Guitar with no invoice' }, undefined, undefined, 70000, year - 20); b2.st = 'stolen'; cr.crime17(g).stash.push(b2.id);
    const c1 = cu.ship31(g, { n: a.n, k: 'relic', ref: a.id, v: 4_000_000, law: 'legal', from: 'paris', src: 'auction31' });
    const c2 = cu.ship31(g, { n: b2.n, k: 'relic', ref: b2.id, v: 2_500_000, law: 'stolen', from: 'new_york', src: 'bauc31' });
    c1.arrive = g.week; c2.arrive = g.week; cu.customsMonth31(g);
    const r3 = r9.addRelic(g, 'lyrics', { pt: 'Letra manuscrita', en: 'Handwritten lyrics' }, undefined, undefined, 9000, year - 5); r3.st = 'player';
    cu.ship31(g, { n: r3.n, k: 'relic', ref: r3.id, v: 900_000, law: 'legal', from: 'london', src: 'auction31' });
  }
  window.__g = g;
  document.querySelectorAll('.overlay, #t31').forEach((e) => e.remove());
  const box = document.createElement('div');
  box.id = 't31';
  box.setAttribute('style', 'position:fixed;inset:0;overflow:auto;z-index:40;background:var(--bg,#111);padding:18px');
  document.body.appendChild(box);
  const a = reg.EXTRA_AREAS.find((x) => x.id === area);
  if (!a) return false;
  box.appendChild(a.render(g));
  return true;
}, [area, year, prep ?? '']);
const shot = async (name, keep = false) => { if (!keep) await p.mouse.move(1350, 890); await p.waitForTimeout(1200); await p.screenshot({ path: `${out}/onda4-t2-${name}.png` }); console.log('captura', name); };
const click = async (spot) => p.locator(`#t31 [data-spot="${spot}"]`).first().click({ timeout: 8000 }).catch(() => console.error('sem ponto', spot));

if (await show('sealed31', 1950, 'tender')) await shot('envelope-1950-cartorio');
if (await show('sealed31', 1985, 'opened')) await shot('envelope-1985-abertura');
if (await show('sealed31', 2015, 'tender')) { await shot('envelope-2015-transmissao'); await click('urn'); await shot('envelope-urna', true); }
if (await show('sealed31', 1985, 'opened')) { await click('notary'); await shot('envelope-ata', true); }
if (await show('bauc31', 1972, 'sheet')) { await shot('beco-1972-folha'); await click('sheet'); await shot('beco-folha-painel', true); }
if (await show('bauc31', 2012, 'hot')) await shot('beco-2012-viatura');
if (await show('customs31', 1925, 'cargo')) await shot('alfandega-1925-porto');
if (await show('customs31', 1985, 'cargo')) { await shot('alfandega-1985-aeroporto'); await click('crate:1'); await shot('alfandega-carga', true); }
if (await show('customs31', 2015, 'cargo')) await shot('alfandega-2015-scanner');
await b.close();
