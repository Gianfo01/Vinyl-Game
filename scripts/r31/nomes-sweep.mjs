// R31 · NOMES — varredura da interface inteira com "Nomes e obras reais" DESLIGADO: todas as páginas (e suas abas) e,
// com exp5.nav ligado, todos os objetos/papéis da onda 5. Em cada tela compara o texto mostrado com o filtro ligado e
// com o filtro zerado (mesmo estado): cada diferença é uma troca. Troca de texto que é rótulo da interface, número ou
// letra solta = defeito; o resto (nome de ato, pessoa, obra, gravadora) = esperado. Texto pintado em canvas: registra
// o texto antes do filtro e confere disp31(texto).
// Uso: npx vite --config scripts/vite5nw.config.mjs --host 127.0.0.1 --port 5931 &
//      node scripts/r31/nomes-sweep.mjs [porta] [saída.json]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? '/opt/node-tools/node_modules/playwright');
const port = process.argv[2] ?? '5931';
const outFile = process.argv[3] ?? 'docs/r31/nomes-sweep.json';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
await p.goto(`http://127.0.0.1:${port}/`); await p.waitForTimeout(3500);
p.setDefaultTimeout(120000);

// prepara: canvas registra o texto original (antes do filtro, que embrulha fillText por baixo)
await p.evaluate(() => {
  window.__cv = new Set();
  const P = CanvasRenderingContext2D.prototype;
  for (const k of ['fillText', 'strokeText']) { const f = P[k]; P[k] = function (t, ...a) { window.__cv.add(String(t)); return f.call(this, t, ...a); }; }
});

const start = (cfg) => p.evaluate(async (cfg) => {
  const wg = await import('/src/sim/worldgen.ts');
  const botc = await import('/src/sim/bot.ts');
  const st = await import('/src/ui/store.ts');
  const tick = await import('/src/sim/tick.ts');
  const bot = await import('/src/sim/playbot16.ts');
  const sw = await import('/src/sim/r31/switches.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const c = await import('/src/ui/common.ts');
  const rs = await import('/src/sim/r31/realshow31.ts');
  document.querySelectorAll('.overlay').forEach((e) => e.remove());
  const g = wg.createGame(botc.defaultConfig(cfg.seed, { startYear: cfg.year, realNames: cfg.real, scenario: 'established' }));
  g.tutorial = { step: 99, done: true, seen: [] };
  off.setTutorials19(st.store.prefs, false);
  for (let i = 0; i < cfg.months; i++) { bot.playMonth(g, 'balanced'); tick.advanceMonth(g); }
  if (cfg.nav) sw.setSw(g, 'exp5.nav', true);
  rs.setRealShown31(g, false);
  st.store.game = g; window.__g = g;
  c.rerender();
  return { year: g.year, show: rs.realShown31(g) };
}, cfg);

// texto da tela: nós de texto + title/aria-label/placeholder, em ordem do DOM
const grab = () => p.evaluate(() => {
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === 3) { const v = n.nodeValue; if (v && v.trim() && !/^(SCRIPT|STYLE)$/.test(n.parentElement?.tagName ?? '')) out.push(v); }
    else for (const a of ['title', 'aria-label', 'placeholder']) { const v = n.getAttribute?.(a); if (v && v.trim()) out.push(`@${a}:${v}`); }
  }
  return out;
});
const filter = (on) => p.evaluate(async (on) => {
  const d = await import('/src/data/realdisp31.ts'); const rs = await import('/src/sim/r31/realshow31.ts'); const c = await import('/src/ui/common.ts');
  if (on) { rs.setRealShown31(window.__g, true); rs.setRealShown31(window.__g, false); } else d.setDisplay31([], []);
  c.rerender();
}, on);

const swaps = new Map(); // "orig → mostrado" → { n, where }
let screens = 0, skipped = 0;
const capture = async (where) => {
  await p.waitForTimeout(350);
  const a = await grab();
  await filter(false); await p.waitForTimeout(250);
  const z = await grab();
  await filter(true); await p.waitForTimeout(150);
  screens++;
  if (a.length !== z.length) { skipped++; return; }
  for (let i = 0; i < a.length; i++) if (a[i] !== z[i]) {
    const k = `${z[i].trim()} → ${a[i].trim()}`;
    const e = swaps.get(k) ?? { n: 0, where: [] };
    e.n++; if (e.where.length < 3 && !e.where.includes(where)) e.where.push(where);
    swaps.set(k, e);
  }
};

const areas = await p.evaluate(async () => {
  const r = await import('/src/ui/registry.ts');
  const base = ['desk', 'plan', 'hq', 'charts', 'artists', 'market', 'media', 'catalog', 'creation', 'studio', 'releases', 'shows', 'world', 'business', 'finance', 'company', 'diary'];
  return [...new Set([...base, ...r.EXTRA_AREAS.map((x) => x.id)])];
});
const goArea = (a) => p.evaluate(async (a) => {
  const st = await import('/src/ui/store.ts'); const c = await import('/src/ui/common.ts');
  document.querySelectorAll('.overlay, .toast').forEach((e) => e.remove()); st.store.area = a; c.rerender();
}, a);
const tabs = () => p.evaluate(() => [...document.querySelectorAll('main [role="tab"], main .tabs button, main .tabs22 button')].length);
const clickTab = (i) => p.evaluate((i) => { const t = [...document.querySelectorAll('main [role="tab"], main .tabs button, main .tabs22 button')][i]; t?.click(); return t?.textContent?.trim().slice(0, 30); }, i);

const RUNS = [
  { seed: 'nomes-a', year: 1975, real: false, months: 6, nav: false },
  { seed: 'nomes-b', year: 2005, real: true, months: 6, nav: false },
  { seed: 'nomes-c', year: 1962, real: true, months: 6, nav: true },
  { seed: 'nomes-d', year: 2025, real: false, months: 6, nav: true },
];
for (const run of RUNS) {
  console.log('partida', JSON.stringify(run), JSON.stringify(await start(run)));
  if (!run.nav) {
    for (const a of areas) {
      await goArea(a); await capture(`${run.year}:${a}`);
      const n = Math.min(await tabs(), 14);
      for (let i = 0; i < n; i++) { const tn = await clickTab(i); await capture(`${run.year}:${a}/${tn}`); }
    }
  } else {
    await capture(`${run.year}:sede5`);
    const ids = await p.evaluate(async () => (await import('/src/ui/r31/objects5.ts')).objects5().map((o) => o.id));
    for (const id of ids) {
      const ok = await p.evaluate(async (id) => { const nav = await import('/src/ui/r31/nav5.ts'); document.querySelectorAll('.overlay, .toast').forEach((e) => e.remove()); return !!nav.open5(id); }, id);
      if (!ok) continue;
      await capture(`${run.year}:obj5/${id}`);
      const n = Math.min(await p.evaluate(() => document.querySelectorAll('[data-paper5] [role="tab"], [data-paper5] .tabs button, .m27-tabs button').length), 10);
      for (let i = 0; i < n; i++) {
        await p.evaluate((i) => [...document.querySelectorAll('[data-paper5] [role="tab"], [data-paper5] .tabs button, .m27-tabs button')][i]?.click(), i);
        await capture(`${run.year}:obj5/${id}#${i}`);
      }
    }
  }
}
// canvas: texto original que o filtro trocaria
const canvas = await p.evaluate(async () => { const d = await import('/src/data/realdisp31.ts'); return [...window.__cv].map((t) => [t, d.disp31(t)]).filter(([a, z]) => a !== z); });
await b.close();
const list = [...swaps.entries()].sort((x, y) => y[1].n - x[1].n).map(([k, v]) => ({ swap: k, ...v }));
writeFileSync(outFile, JSON.stringify({ screens, skipped, swaps: list, canvas, errors: [...new Set(errs)].slice(0, 30) }, null, 1));
console.log(`telas ${screens} (sem comparação: ${skipped}), trocas distintas ${list.length}, canvas ${canvas.length}, erros ${errs.length}`);
