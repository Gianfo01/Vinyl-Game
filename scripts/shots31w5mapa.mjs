// R31 onda 5 (MAPA · EXP-3) — capturas da cidade e do mundo só pelo mapa, com exp5.nav LIGADO: cidade em 3 cidades/
// épocas, prédio aberto, busca (Ctrl K) apontando, mundo em 1925/1985/2025 com o painel do país, cidade de outro país.
// Uso: npx vite --host 127.0.0.1 --port 5874 &   node scripts/shots31w5mapa.mjs [pasta] [porta]
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5874';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(30000);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);
const shot = async (name) => { await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/onda5-mapa-${name}.png` }); console.log('captura', name); };
/** Partida nova na cidade/ano, com exp5.nav ligado e alguns meses jogados pelo robô (prédios, lançamentos, turnês). */
const newGame = (city, year, months = 6) => p.evaluate(async ([city, year, months]) => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const cfg = bot.defaultConfig(`mapa5-${city}-${year}`, { startYear: year, homeCity: city });
  cfg.dbSize = 'small';
  const g = wg.createGame(cfg);
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < months; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  sw.setSw(g, 'exp5.nav', true);
  st.store.game = g;
  (await import('/src/ui/common.ts')).rerender(); // a casca nova se instala no primeiro desenho
  await new Promise((r) => setTimeout(r, 800));
  return { year: g.year, city: g.config.homeCity };
}, [city, year, months]);
/** Vai à cidade ou ao mundo pela casca nova (viagem de região); outras páginas como antes. */
const area = (a, sub) => p.evaluate(async ([a, sub]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const m = await import('/src/ui/r31/map5ui.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  if (sub) vis.setTab(sub[0], sub[1]);
  m.WORLD5.city = undefined; m.WORLD5.country = undefined;
  if (sh.shell5On(st.store.game) && (a === 'campus18' || a === 'world')) { sh.travel5go(a === 'campus18' ? 'cidade' : 'mundo'); return; }
  st.store.area = a;
  c.rerender();
}, [a, sub]);
const top = () => p.evaluate(() => { const e = document.querySelector('.m5-visit, .map27, .c27-main'); const sc = e?.closest('.reg5, main, .page21-host'); e?.scrollIntoView({ block: 'start' }); void sc; });

for (const [city, year, name] of [['rio', 1975, 'rio1975'], ['london', 1965, 'londres1965'], ['new_york', 2005, 'novayork2005']]) {
  console.log('jogo', JSON.stringify(await newGame(city, year)));
  await area('campus18'); await p.waitForTimeout(2500); await top(); await shot(`cidade-${name}`);
  if (name === 'rio1975') {
    // teclado: foco no mapa, setas andam de prédio em prédio (a dica acompanha)
    await p.locator('.m5-city .w19-vp').first().focus();
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowRight']) { await p.keyboard.press(k); await p.waitForTimeout(250); }
    await shot('cidade-teclado');
    // prédio aberto (clicar no prédio = painel do prédio, entrar = interior)
    const pl = p.locator('.w19-hs.fill.m5-has-bang:not([hidden])').first();
    await pl.evaluate((e) => e.click()).catch(() => console.error('sem lugar'));
    await shot('cidade-predio-aberto');
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    // busca (Ctrl K) apontando um prédio
    await p.mouse.click(5, 450);
    await p.keyboard.press('Control+k'); await p.waitForTimeout(800);
    await p.keyboard.type('radio', { delay: 40 }); await p.waitForTimeout(1200);
    await shot('busca-lista');
    const opt = p.locator('.p15-item', { hasText: 'Cidade ·' }).first();
    if (await opt.count()) { await opt.click(); await p.waitForTimeout(1500); await top(); await shot('busca-apontando'); } else console.error('busca sem resultado de cidade');
  }
}
for (const year of [1925, 1985, 2025]) {
  console.log('jogo', JSON.stringify(await newGame('rio', year, 3)));
  await area('world', ['worldHub', 'map27']); await p.waitForTimeout(2500);
  // abre um país pelo painel (Alemanha / Europa: mostra as fronteiras da época)
  await p.evaluate(async (year) => {
    const m = await import('/src/ui/r31/map5ui.ts');
    const st = await import('/src/ui/store.ts');
    m.pointWorld5(st.store.game, year === 1985 ? 'DEU' : year === 1925 ? 'FRA' : 'BRA');
  }, year);
  await p.waitForTimeout(2200); await top(); await shot(`mundo-${year}`);
  if (year === 1985) { // cidade de outro país (clicar na cidade do painel do país = mapa dela)
    await p.locator('.m5-country .m5-cbtn').first().click().catch(() => console.error('sem cidade no painel'));
    await p.waitForTimeout(1500); await top(); await shot('mundo-cidade-visitada');
    await p.locator('.m5-vs').first().click().catch(() => console.error('sem lugar na cidade'));
    await p.waitForTimeout(600); await shot('mundo-cidade-lugar');
  }
}
await b.close();
