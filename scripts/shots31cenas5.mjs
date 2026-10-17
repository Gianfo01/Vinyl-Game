// R31 onda 5 (CENAS5) — capturas ANTES (exp5.nav desligado, a moldura de hoje) e DEPOIS (ligado: só o cenário navegável)
// de cada tipo de cena de lugar, em 2 épocas (Londres 1965 e Nova York 2005). Cada captura sai em <pasta>/raw/ e o
// script confere no DOM do "depois" que não há os botões antigos nem a caixa de ajuda (relatório em <pasta>/raw/check.json).
// Uso: npx vite --host 127.0.0.1 --port 5891 &   node scripts/shots31cenas5.mjs [pasta] [porta]
//      python3 scripts/r31/cenas5grid.py [pasta]   (junta antes|depois × 2 épocas em onda5-cenas5-<tipo>-antes-depois.png)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const out = process.argv[2] ?? 'docs/r31/shots';
const port = process.argv[3] ?? '5891';
mkdirSync(`${out}/raw`, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.error('CONSOLE', m.text().slice(0, 300)); });
p.setDefaultTimeout(30000);
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
await p.getByText('NOVA RUN', { exact: false }).first().click(); await p.waitForTimeout(1500);
await p.getByText('COMEÇAR MINHA HISTÓRIA', { exact: false }).first().click(); await p.waitForTimeout(4000);
for (let i = 0; i < 60 && !(await p.evaluate(async () => !!(await import('/src/ui/store.ts')).store.game)); i++) await p.waitForTimeout(1000);

const newGame = (city, year, months) => p.evaluate(async ([city, year, months]) => {
  const st = await import('/src/ui/store.ts');
  const bot = await import('/src/sim/bot.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const tick = await import('/src/sim/tick.ts');
  const pb = await import('/src/sim/playbot16.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const cfg = bot.defaultConfig(`cenas5-${city}-${year}`, { startYear: year, homeCity: city });
  cfg.dbSize = 'small';
  const g = wg.createGame(cfg);
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < months; i++) { pb.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  window.__G5 = JSON.stringify(g);
  return { year: g.year, city: g.config.homeCity };
}, [city, year, months]);

/** Recarrega a mesma partida (cópia limpa) com exp5.nav ligado ou desligado. */
const load = (nav) => p.evaluate(async (nav) => {
  const st = await import('/src/ui/store.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = JSON.parse(window.__G5);
  sw.setSw(g, 'exp5.nav', nav);
  st.store.game = g;
  sh.SH5.paper = null; sh.SH5.pause = false; sh.SH5.help = false; sh.SH5.region = 'sede';
  st.store.area = 'sede25';
  (await import('/src/ui/common.ts')).rerender();
  await new Promise((r) => setTimeout(r, 700));
}, nav);

/** Abre a cena `sc` do jeito de cada modo (desligado: página/interior de hoje; ligado: pela casca). */
const open = (sc, nav) => p.evaluate(async ([sc, nav]) => {
  const st = await import('/src/ui/store.ts');
  const c = await import('/src/ui/common.ts');
  const vis = await import('/src/ui/vis.ts');
  const sh = await import('/src/ui/r31/shell5.ts');
  const cp = await import('/src/ui/sys/campus18.ts');
  const g = st.store.game;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (sc.inside) {
    if (nav) { sh.travel5go('cidade'); await wait(900); } else { st.store.area = 'campus18'; c.rerender(); await wait(900); }
    const hs = [...document.querySelectorAll('.w19-hs[data-id]')];
    const re = new RegExp(sc.inside, 'i');
    const el = sc.inside.startsWith('fos31') ? null : hs.find((e) => re.test(e.getAttribute('aria-label') ?? ''));
    const id = sc.inside.startsWith('fos31') ? sc.inside : el?.getAttribute('data-id');
    if (!id) return `sem lugar ${sc.inside}: ${hs.slice(0, 40).map((e) => e.getAttribute('aria-label')).join(' | ')}`;
    cp.openInside18(id);
    await wait(900);
    if (sc.panel) { document.querySelector(`.c2-in [data-spot="${sc.panel}"]`)?.click(); await wait(400); }
    return 'ok';
  }
  if (sc.tab) vis.setTab(sc.tab[0], sc.tab[1]);
  if (sc.mech) {
    const m = await import('/src/ui/r31/mech31.ts');
    if (nav) { sh.travel5go('sede'); await wait(600); }
    m.openScene31(sc.mech, sc.mid === 'city' ? g.config.homeCity : sc.mid, 'scene');
    await wait(700);
    return 'ok';
  }
  if (nav) sh.show5(sc.area, sc.tab); else { st.store.area = sc.area; c.rerender(); }
  await wait(900);
  return 'ok';
}, [sc, nav]);

/** O que o "depois" ainda mostra da moldura antiga (deve ser nada). */
const check = () => p.evaluate(() => {
  const txt = (sel) => [...document.querySelectorAll(sel)].map((e) => e.textContent?.trim() ?? '');
  const btns = txt('button, label');
  return {
    lista: btns.filter((x) => /Ver como lista|See as a list|View as list/.test(x)).length,
    mostrarTudo: btns.filter((x) => /Mostrar tudo que é clicável/.test(x)).length,
    rotulos: btns.filter((x) => /^Rótulos/.test(x)).length,
    ajudaTracejada: document.querySelectorAll('.sc31-intro, .s31-intro, .mc31-tip').length,
    pontos: document.querySelectorAll('.sc31-pts, .s31-points').length,
    voltarCidade: btns.filter((x) => /Voltar à cidade/.test(x)).length,
    cenas: document.querySelectorAll('.sc5, .cn5-sala, .mc5-stage').length,
    pontosNaCena: document.querySelectorAll('.sc5 [data-spot], .cn5-sala [data-hot], .mc5-stage [data-mc31]').length,
    faixa: txt('.cn5-where').join(' / '),
  };
});

const SCENES = [
  { id: 'interior', inside: 'Rádio AM|AM/FM|Rádio FM|estação de rádio' },
  { id: 'vitrine', inside: 'discos|records|disco' },
  { id: 'loja', area: 'loja31' },
  { id: 'aeroporto', area: 'airport31' },
  { id: 'leiloes', area: 'auction31' },
  { id: 'beco', area: 'bauc31' },
  { id: 'alfandega', area: 'customs31' },
  { id: 'casa', area: 'casa31' },
  { id: 'festival', inside: 'casa de shows|sala de concerto' },
  { id: 'sala', area: 'sala31', tab: ['sala31', 'studio'] },
  { id: 'mecanica', mech: 'bank', mid: 'city' },
  { id: 'fossati', inside: 'fos31:square' },
];
const report = {};
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
for (const [city, year, months] of [['london', 1965, 6], ['new_york', 2005, 6]]) {
  console.log('jogo', JSON.stringify(await newGame(city, year, months)));
  for (const sc of SCENES.filter((x) => !ONLY || ONLY.includes(x.id))) {
    for (const nav of [false, true]) {
      await load(nav);
      const r = await open(sc, nav);
      if (r !== 'ok') console.error(sc.id, year, r);
      await p.waitForTimeout(1300);
      const name = `${sc.id}-${year}-${nav ? 'depois' : 'antes'}`;
      await p.screenshot({ path: `${out}/raw/${name}.png` });
      if (nav) {
        report[`${sc.id}-${year}`] = await check();
        // Alt: nomes e tudo o que é clicável; "?": ajuda do lugar
        await p.keyboard.down('Alt'); await p.waitForTimeout(300);
        await p.screenshot({ path: `${out}/raw/${sc.id}-${year}-alt.png` });
        await p.keyboard.up('Alt');
      }
      console.log('captura', name, r);
    }
  }
}
writeFileSync(`${out}/raw/check${ONLY ? '-' + ONLY.join('-') : ''}.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
await b.close();
