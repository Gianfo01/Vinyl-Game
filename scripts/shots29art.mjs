// Rodada 29 (arte) — capturas das telas do jogo onde as artes novas entram (antes × depois).
// Uso: npx vite --port 5331 &  node scripts/shots29art.mjs http://localhost:5331 docs/shots29art depois
//      (o "antes" roda o mesmo script contra um servidor do ramo base, com o rótulo "antes").
// Monta uma partida "established" em 1978 (tamanho pequeno), avança 2 semanas e abre cada tela: as funções de tela
// exportadas são desenhadas num painel de captura (mesmo CSS do jogo); as áreas registradas abrem pela navegação.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const base = process.argv[2] ?? 'http://localhost:5331';
const out = process.argv[3] ?? 'docs/shots29art';
const tag = process.argv[4] ?? 'depois';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1360, height: 900 }, locale: 'pt-BR' });
p.on('pageerror', (e) => console.error('PAGEERR', e.message));
await p.goto(`${base}/`); await p.waitForTimeout(2500);
p.setDefaultTimeout(0);
await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const tick = await import('/src/sim/tick.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const cfg = bot.defaultConfig('shots29art', { scenario: 'established', startYear: 1978 });
  cfg.dbSize = 'small';
  const g = wg.createGame(cfg);
  for (let i = 0; i < 6; i++) tick.advanceWeek(g);
  g.tutorial = { step: 99, done: true, seen: [] };
  st.store.game = g;
  off.setTutorials19(st.store.prefs, false);
  window.__g = g;
});

/** Desenha uma função de tela num painel por cima do jogo (mesmo CSS). */
const panel = async (name, code) => {
  await p.evaluate(async (code) => {
    document.querySelectorAll('.overlay,#shot29').forEach((e) => e.remove());
    const box = document.createElement('div');
    box.id = 'shot29';
    box.className = 'card';
    box.style.cssText = 'position:fixed;inset:16px;z-index:99999;overflow:auto;padding:16px;background:var(--bg,#1d1a1c)';
    document.body.append(box);
    const fn = new Function('g', 'box', `return (async () => { ${code} })()`);
    const el = await fn(window.__g, box);
    if (el) box.append(...[el].flat().filter(Boolean)); else box.remove(); // tela que abre sozinha (modal)
  }, code);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/game-${name}-${tag}.png` });
};
const go = async (name, area, tab) => {
  await p.keyboard.press('Escape');
  await p.evaluate(async ([area, tab]) => {
    document.querySelectorAll('.overlay,#shot29').forEach((e) => e.remove());
    const slot = await import('/src/ui/ps/slot25.ts'); const vis = await import('/src/ui/vis.ts');
    if (tab) vis.setTab(tab[0], tab[1]);
    slot.sedeNav25.go(area);
  }, [area, tab]);
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/game-${name}-${tag}.png` });
};

const actPick = `const a = Object.values(g.acts).filter((x) => x.owner === 'player').sort((x, y) => y.fame - x.fame)[0] ?? Object.values(g.acts).sort((x, y) => y.fame - x.fame)[0];`;
await panel('shows-porte', `const m = await import('/src/ui/panels/misc.ts'); return m.gigsSection20(g);`);
await panel('paradas', `const m = await import('/src/ui/panels/misc.ts'); return m.chartsPanel(g);`);
await panel('rivais', `const m = await import('/src/ui/panels/market.ts'); return m.rivals(g);`);
await panel('paises', `const m = await import('/src/ui/sys/charts7.ts'); const { COUNTRY_INFO } = await import('/src/data/countries.ts'); return COUNTRY_INFO.slice(0, 6).map((c) => m.countryCard(g, c));`);
await panel('generos-em-alta', `const m = await import('/src/ui/sys/trends17.ts'); return m.hotGenres17(g);`);
await panel('fandom', `const m = await import('/src/ui/panels/people.ts'); ${actPick} return m.fandomSection(g, a);`);
await panel('merch', `const m = await import('/src/ui/panels/tours.ts'); return m.merchSection(g);`);
await panel('movimentos', `const m = await import('/src/ui/sys/bonds9.ts'); return m.relTab(g);`);
await panel('casa-de-show', `const m = await import('/src/ui/sys/mapinfo17.ts'); const v = (await import('/src/sim/sys/venues17.ts')).VENUES17.find((x) => x.from <= g.year); m.openVenue17(g, v.id); return null;`);
await go('produtores', 'producers15');
await go('empresarios', 'managers14');
await go('fabricas', 'supply18');
await go('fanzines', 'zines19');
await go('caixa-de-entrada', 'cockpit', ['ck20', 'inbox']);
await b.close();
console.log('ok', out, tag);
