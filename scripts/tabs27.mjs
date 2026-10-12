// Rodada 27 — gera src/ui/ps/tabsreg27.ts: o registro de TODAS as abas internas de cada página
// (sem depender do que a pessoa já abriu). Percorre o jogo num navegador: para cada página, abre cada aba
// (e as abas dentro das abas) e anota chave, id, rótulo em pt e en e a trilha de abas-mãe.
//
// Uso (com o servidor de desenvolvimento rodando):
//   npx vite --port 5327 &
//   node scripts/tabs27.mjs http://localhost:5327/ [caminho do chrome] [arquivo de saída]
// Requer playwright-core (não é dependência do jogo; instale à parte).
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [,, url = 'http://localhost:5173/', exe, dest] = process.argv;
const b = await chromium.launch(exe ? { executablePath: exe } : {});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url); await p.waitForTimeout(2500);
p.setDefaultTimeout(0);

const out = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  const wg = await import('/src/sim/worldgen.ts');
  const bot = await import('/src/sim/bot.ts');
  const tick = await import('/src/sim/tick.ts');
  const i18n = await import('/src/i18n/strings.ts');
  const vis = await import('/src/ui/vis.ts');
  const slot = await import('/src/ui/ps/slot25.ts');
  const nav25 = await import('/src/ui/ps/nav25.ts');
  const nav17 = await import('/src/ui/nav17.ts');
  const reg = await import('/src/ui/registry.ts');
  const off = await import('/src/ui/tutoff19.ts');
  const YEARS = [1962, 1988, 2012];
  const ALL = ['label', 'musician', 'manager', 'booking', 'festival', 'venue', 'studio', 'publisher', 'media', 'platform', 'screen', 'critic'];
  const found = new Map(); // area|trail|key|id → def
  let cur = null; // estado sendo desenhado
  const strips = new Map(); // area → Map(sig → {key, items, trail})
  const prev = vis.tabHook25.f;
  vis.tabHook25.f = (key, items, trail) => {
    prev?.(key, items, trail);
    if (!cur || document.querySelector('.overlay')) return;
    const area = st.store.area;
    const tr = trail.map((x) => [x[0], x[1]]);
    const sig = JSON.stringify([tr, key]);
    const m = strips.get(area) ?? new Map(); strips.set(area, m);
    if (!m.has(sig)) m.set(sig, { key, trail: tr, items: items.map((i) => i.id) });
    for (const it of items) {
      const k = `${area}|${JSON.stringify(tr)}|${key}|${it.id}`;
      const lbl = String(it.label ?? '').trim();
      if (!lbl) continue;
      const d = found.get(k) ?? { area, key, id: it.id, pt: '', en: '', trail: tr, ys: [] };
      if (!d[cur.lang]) d[cur.lang] = lbl;
      if (!d.ys.includes(cur.year)) d.ys.push(cur.year);
      found.set(k, d);
    }
  };
  const areas = [...new Set([...nav25.KNOWN25, ...nav17.ORDER17.map((id) => nav17.CAREER_PAGE17[id].area), ...reg.EXTRA_AREAS.map((a) => a.id)])];
  for (const year of YEARS) {
    const cfg = bot.defaultConfig('tabs27-' + year, { scenario: 'established', startYear: year });
    cfg.dbSize = 'small';
    cfg.careers = { main: ALL };
    const g = wg.createGame(cfg);
    for (let i = 0; i < 2; i++) tick.advanceWeek(g);
    g.tutorial = { step: 99, done: true, seen: [] };
    st.store.game = g;
    off.setTutorials19(st.store.prefs, false);
    for (const lang of ['pt', 'en']) {
      i18n.setLang(lang); st.store.prefs.lang = lang;
      for (const a of areas) {
        strips.clear();
        const seenStates = new Set();
        const queue = [[]]; // trilhas de abas a abrir
        let guard = 0;
        while (queue.length && guard++ < 120) {
          const path = queue.shift();
          const ps = JSON.stringify(path);
          if (seenStates.has(ps)) continue;
          seenStates.add(ps);
          for (const [k, i] of path) vis.setTab(k, i);
          cur = { lang, year };
          try { slot.sedeNav25.go?.(a); } catch { /* página quebrada não para a coleta */ }
          cur = null;
          document.querySelector('.overlay')?.remove();
          if (st.store.area !== a) break; // redirecionada (tela absorvida): a página dona é percorrida por si
          for (const s of strips.get(a)?.values() ?? []) {
            // só abre abas de faixas cuja trilha é um prefixo do caminho atual (filhas do estado atual)
            const base = s.trail;
            for (const id of s.items) {
              const np = [...base, [s.key, id]];
              const nps = JSON.stringify(np);
              if (!seenStates.has(nps) && np.length <= 3) queue.push(np);
            }
          }
        }
      }
    }
  }
  vis.tabHook25.f = prev;
  return [...found.values()].map((d) => {
    // janela de anos: a aba só existe a partir de/até onde foi vista (não vista num ano percorrido = ausente)
    const i0 = YEARS.findIndex((y) => d.ys.includes(y)), i1 = YEARS.length - 1 - [...YEARS].reverse().findIndex((y) => d.ys.includes(y));
    return { ...d, y0: i0 > 0 ? YEARS[i0 - 1] + 1 : 0, y1: i1 < YEARS.length - 1 ? YEARS[i1 + 1] - 1 : 0 };
  });
});
await b.close();

// chaves dinâmicas (ex.: fest12:<id do festival>, ficha de um artista) não valem entre partidas
const dyn = (k) => /[:]|_\d|\d{3,}/.test(k);
const rows = out.filter((d) => !dyn(d.key) && !d.trail.some(([k]) => dyn(k)) && (d.pt || d.en));
rows.sort((a, b) => (a.area + JSON.stringify(a.trail) + a.key).localeCompare(b.area + JSON.stringify(b.trail) + b.key));
const esc = (s) => JSON.stringify(s);
const lines = rows.map((d) => `  [${esc(d.area)}, ${esc(d.key)}, ${esc(d.id)}, ${esc(d.pt || d.en)}, ${esc(d.en || d.pt)}${d.trail.length || d.y0 || d.y1 ? `, ${JSON.stringify(d.trail)}` : ''}${d.y0 || d.y1 ? `, [${d.y0}, ${d.y1}]` : ''}],`);
writeFileSync(dest ?? new URL('../src/ui/ps/tabsreg27.ts', import.meta.url), `// GERADO por scripts/tabs27.mjs — não edite à mão (rode o script de novo quando abas mudarem).
// Rodada 27: todas as abas internas de cada página, para o menu em árvore e a busca (Ctrl+K)
// acharem abas que a pessoa nunca abriu. [área, chave da faixa, id da aba, rótulo pt, rótulo en, trilha de abas-mãe,
// anos [de, até] em que a aba existe (0 = sem limite; ausente = sempre)]
export type TabRow27 = [string, string, string, string, string, [string, string][]?, [number, number]?];
export const TABS_REG27: TabRow27[] = [
${lines.join('\n')}
];
`);
console.log('abas:', rows.length, 'páginas:', new Set(rows.map((d) => d.area)).size);
