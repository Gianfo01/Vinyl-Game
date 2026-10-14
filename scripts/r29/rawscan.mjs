// R29 (menus/dados crus) — varredura automática da interface atrás de DADO CRU aparecendo para o jogador e de NOMES
// sem menu de ações (clique direito). Abre uma partida de meio de jogo (bot realista jogando N anos, nomes reais),
// passa por todas as áreas do menu (e as abas de cada uma) e pelas fichas principais (artista do elenco, artista rival,
// integrante, produtor, empresário, chefe de selo, gravadora, lançamento, cidade, casa de shows), clicando em todas as
// abas de cada ficha, e procura:
//   • dado cru: undefined / NaN / null / [object Object], ids de módulo (real27, ability18, x4…), chaves internas
//     (camelCase, snake_case), ids com prefixo ('p:…', 'o:…'), valores de enum sem tradução (rhythm, harmonica…),
//     "Mais dados · …" (o despejo genérico que saiu do dossiê);
//   • nomes de entidades (artistas, pessoas, gravadoras, cidades, casas, lançamentos) mostrados SEM `data-ent`
//     (sem clique direito) — a lista de onde falta.
// Servidor: npx vite --port 5293 (sem `playwright install`: usa o Chromium de /opt/pw-browsers/chromium).
// Uso: node scripts/r29/rawscan.mjs [porta=5293] [anos=6] [saída.json] [--strict]
//   --strict → código de saída 1 se achar dado cru (para rodar em CI local).
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pwPath = process.env.PLAYWRIGHT_PATH ?? '/opt/node22/lib/node_modules/playwright';
const { chromium } = require(pwPath);
const args = process.argv.slice(2).filter((x) => !x.startsWith('--'));
const strict = process.argv.includes('--strict');
const [port = '5293', years = '6', outFile = ''] = args;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' })).newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
/** Abre o jogo, começa uma run e troca a partida por uma de meio de jogo: o bot realista joga N anos (nomes reais),
 *  no MESMO módulo da página (o Vite serve /src). Se a página recarregar no meio (ex.: o Vite recarrega quando um
 *  arquivo muda), a varredura chama de novo — a semente é fixa, a partida é a mesma. */
async function boot() {
  await p.goto(`http://localhost:${port}/`);
  await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /NOVA RUN/ }).first().click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: /COMEÇAR MINHA HISTÓRIA/ }).first().click(); await p.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
  { const bt = p.getByRole('button', { name: /Desativar todos os tutoriais/ }).first(); if (await bt.count()) { await bt.click(); await p.waitForTimeout(300); } }
  return p.evaluate(async (yrs) => {
    const st = await import('/src/ui/store.ts');
    const pb = await import('/src/sim/playbot16.ts');
    const bot = await import('/src/sim/bot.ts');
    const cfg = bot.defaultConfig('rawscan29', { startYear: 1975, scenario: 'established', realNames: true });
    const { state } = pb.simulatePlayer(cfg, Number(yrs));
    st.store.game = state;
    window.__g29 = state; // se alguma tela voltar ao menu inicial, a varredura recoloca a partida
    st.store.area = 'desk';
    st.store.rerender();
    const reg = await import('/src/ui/registry.ts');
    const base = ['desk', 'plan', 'hq', 'charts', 'artists', 'market', 'media', 'catalog', 'creation', 'studio', 'releases', 'shows', 'world', 'business', 'finance', 'company', 'diary'];
    const extra = reg.EXTRA_AREAS.filter((a) => { try { return !a.visible || a.visible(state); } catch { return false; } }).map((a) => a.id);
    return { year: state.year, areas: [...new Set([...base, ...extra])] };
  }, years);
}
/** Garante a partida na página (recarregou? começa de novo). */
async function ensure() {
  const ok = await p.evaluate(() => !!window.__g29).catch(() => false);
  if (!ok) { errors.push('página recarregou: partida refeita'); await boot(); }
}
const info = await boot();
console.log(`partida: ano ${info.year}, ${info.areas.length} áreas`);

// ---------------------------------------------------------------- a varredura (roda na página)
const SCAN = async (where) => {
  const st = await import('/src/ui/store.ts');
  const s = st.store.game ?? window.__g29;
  const W = window;
  if (!W.__raw29) {
    const raw = await import('/src/ui/ps/raw29.ts'); // o MESMO detector do teste (tests/r29-ui-raw.test.ts)
    const names = new Map();
    const STOP = new Set(['Elenco', 'Balanço', 'Agenda', 'Mercado', 'Estúdio', 'Shows', 'Notícias', 'Contratos', 'Finanças', 'Mundo', 'Equipe']);
    const add = (n, kind) => { const x = typeof n === 'string' ? n.trim() : ''; if (x.length >= 4 && !STOP.has(x) && !names.has(x)) names.set(x, kind); };
    const w = await import('/src/data/world.ts');
    for (const c of Object.values(w.cityById ?? {})) add(c.name, 'city');
    for (const a of Object.values(s.acts)) add(a.name, 'act');
    for (const x of Object.values(s.labels)) add(x.name, 'label');
    for (const x of Object.values(s.persons)) add(x.name, 'person');
    for (const x of Object.values(s.releases)) if ((x.title ?? '').length >= 6) add(x.title, 'release');
    const v = await import('/src/sim/sys/venues17.ts');
    for (const x of v.VENUES17 ?? []) add(x.name, 'venue');
    const cm = await import('/src/ui/ps/ctx27model.ts');
    W.__raw29 = { hits: raw.rawHits29, names, byName: (x) => cm.nameHit29(s, x) };
  }
  const { hits, names, byName } = W.__raw29;
  const path = (el) => { const out = []; let e = el; for (let i = 0; i < 5 && e && e !== document.body; i++, e = e.parentElement) out.push(`${e.tagName.toLowerCase()}${e.classList.length ? `.${[...e.classList].slice(0, 3).join('.')}` : ''}`); return out.join(' < '); };
  // títulos da própria ficha, abas, migalhas, rótulos de KPI e seletores não são "nomes soltos"
  const NOT_NAME = 'h1, h2, .pg-head h3, .ficha-head h3, .dos13-head h3, .in29i-id h3, [role=tab], .tabs, .crumbs15, nav, .kpi27-l, option, title, .cx27, .am20, .modal-head, label.check, .act-picker, .chip27';
  const issues = [];
  const roots = [...document.querySelectorAll('.overlay')];
  const root = roots.length ? roots[roots.length - 1] : document.querySelector('main') ?? document.body;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const el = n.parentElement;
    if (!el || el.closest('script, style, svg, [hidden], [aria-hidden="true"], input, textarea, select, .cx27, .sr-only')) continue;
    const txt = (n.textContent ?? '').trim();
    if (!txt) continue;
    for (const x of hits(txt)) issues.push({ where, kind: x.kind, m: x.m, txt: txt.slice(0, 160), path: path(el) });
    // nome sem clique direito
    const kind = names.get(txt);
    // sem marca explícita: o clique direito ainda acha a entidade pelo nome exato (ps/ctx27model.nameHit29)? então é
    // 'pelo-nome' (coberto pela rede de segurança); senão 'sem-menu' (nome ambíguo: precisa de marca explícita)
    if (kind && !el.closest('[data-ent][data-id]') && !el.closest(NOT_NAME)) issues.push({ where, kind: byName(txt) ? 'pelo-nome' : 'sem-menu', m: kind, txt, path: path(el) });
  }
  return issues;
};

const all = [];
const scan = async (where) => { try { all.push(...(await p.evaluate(SCAN, where))); } catch (e) { errors.push(`${where}: ${e.message}`); } };
/** clica em cada aba (role=tab) do container e varre de novo */
const tabs = async (where, sel) => {
  const n = await p.$$eval(`${sel} [role=tab]`, (xs) => xs.length).catch(() => 0);
  for (let i = 0; i < Math.min(n, 16); i++) {
    const tb = (await p.$$(`${sel} [role=tab]`))[i];
    if (!tb) continue;
    const label = ((await tb.textContent()) ?? '').trim().slice(0, 30);
    try { await tb.click({ timeout: 1500 }); } catch { continue; }
    await p.waitForTimeout(250);
    await scan(`${where} › ${label}`);
  }
};
const closeAll = async () => {
  try { for (let i = 0; i < 5; i++) { if (!(await p.$('.overlay'))) break; await p.keyboard.press('Escape'); await p.waitForTimeout(150); } await p.evaluate(() => document.querySelectorAll('.overlay, .scene-overlay').forEach((x) => x.remove())); }
  catch { await p.waitForTimeout(1500); await ensure(); } // a página navegou (recarga do Vite): refaz a partida
};

for (const a of info.areas) {
  await ensure();
  await closeAll();
  const lost = await p.evaluate(async (id) => { const st = await import('/src/ui/store.ts'); const lost = !st.store.game; if (lost) st.store.game = window.__g29; st.store.area = id; st.store.rerender(); return lost; }, a).catch(() => false);
  if (lost) errors.push(`a partida sumiu antes de ${a} (recolocada)`);
  await p.waitForTimeout(350);
  await scan(`área ${a}`);
  await tabs(`área ${a}`, 'main');
}

// fichas
await ensure();
const sheets = await p.evaluate(async () => {
  const st = await import('/src/ui/store.ts');
  if (!st.store.game) { st.store.game = window.__g29; st.store.area = 'desk'; st.store.rerender(); }
  const s = st.store.game;
  const mine = Object.values(s.acts).filter((a) => a.owner === 'player');
  const rival = Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.status !== 'retired').sort((x, y) => y.fame - x.fame);
  const out = [];
  if (mine[0]) out.push(['act', mine[0].id], ['person', `p:${mine[0].members[0]}`]);
  if (rival[0]) out.push(['act', rival[0].id], ['person', `p:${rival[0].members[0]}`], ['label', rival[0].owner]);
  const rel = Object.values(s.releases).filter((r) => r.peak).sort((x, y) => (x.peak ?? 999) - (y.peak ?? 999))[0];
  if (rel) out.push(['release', rel.id]);
  out.push(['city', s.config.homeCity]);
  const v = await import('/src/sim/sys/venues17.ts');
  const ven = (v.VENUES17 ?? []).find((x) => x.from <= s.year && (!x.to || x.to >= s.year));
  if (ven) out.push(['venue', ven.id]);
  for (const pre of ['pd:', 'e:', 'l:', 'c:']) {
    const el = [...document.querySelectorAll(`[data-ent=person][data-id^="${pre}"]`)][0];
    if (el) out.push(['person', el.dataset.id]);
  }
  return out;
});
// pessoas com prefixo (produtor, empresário, chefe, crítico): procura nas áreas onde aparecem
for (const area of ['market', 'business', 'company', 'media', 'world']) {
  await ensure();
  await closeAll();
  await p.evaluate(async (id) => { const st = await import('/src/ui/store.ts'); if (!st.store.game) st.store.game = window.__g29; st.store.area = id; st.store.rerender(); }, area);
  await p.waitForTimeout(300);
  const more = await p.$$eval('[data-ent=person][data-id]', (xs) => [...new Set(xs.map((x) => x.dataset.id).filter((id) => /^(pd|e|l|c|s):/.test(id)))].slice(0, 3));
  for (const id of more) if (!sheets.some((x) => x[1] === id)) sheets.push(['person', id]);
}
for (const [kind, id] of sheets) {
  await ensure();
  await closeAll();
  await p.evaluate(async ([k, i]) => {
    const c = await import('/src/ui/common.ts');
    if (k === 'act') c.inspect.act(i);
    else if (k === 'release') c.inspect.release(i);
    else if (k === 'label') c.inspect.label(i);
    else if (k === 'city') c.inspect.city(i);
    else if (k === 'person') { const m = await import('/src/ui/sys/people16.ts'); m.openPerson16(i); }
    else if (k === 'venue') { const st = await import('/src/ui/store.ts'); const m = await import('/src/ui/sys/mapinfo17.ts'); m.openVenue17(st.store.game, i); }
  }, [kind, id]);
  await p.waitForTimeout(500);
  const where = `ficha ${kind} ${id}`;
  await scan(where);
  await tabs(where, '.overlay:last-of-type');
  // r29 (menus): o painel "Ações" da ficha — abre e varre
  const det = await p.$('.overlay:last-of-type details.pa18-d > summary');
  if (det) { await det.click().catch(() => {}); await p.waitForTimeout(300); await scan(`${where} › Ações`); }
}
await closeAll();

// ---------------------------------------------------------------- relatório
const key = (x) => `${x.kind}|${x.m}|${x.path}`;
const seen = new Map();
for (const x of all) { const k = key(x); const e = seen.get(k); if (e) e.n++; else seen.set(k, { ...x, n: 1 }); }
const rows = [...seen.values()];
const raw = rows.filter((x) => x.kind !== 'sem-menu' && x.kind !== 'pelo-nome');
const nomenu = rows.filter((x) => x.kind === 'sem-menu');
const byname = rows.filter((x) => x.kind === 'pelo-nome');
console.log(`\n== dado cru: ${raw.length} ocorrência(s) distintas`);
for (const x of raw.slice(0, 120)) console.log(`[${x.kind}] ${x.m} ×${x.n} — ${x.where}\n    “${x.txt}”\n    ${x.path}`);
console.log(`\n== nomes sem marca explícita, cobertos pelo nome exato (rede de segurança do clique direito): ${byname.length} lugar(es)`);
for (const x of byname.slice(0, 40)) console.log(`[${x.m}] “${x.txt}” — ${x.where}\n    ${x.path}`);
console.log(`\n== nomes SEM clique direito (nem marca nem nome único): ${nomenu.length} lugar(es) distintos`);
const byPath = new Map();
for (const x of nomenu) { const k = `${x.m}|${x.path}`; const e = byPath.get(k); if (e) { e.n += x.n; e.where.add(x.where); } else byPath.set(k, { ...x, where: new Set([x.where]) }); }
for (const x of [...byPath.values()].sort((a, c) => c.n - a.n).slice(0, 150)) console.log(`[${x.m}] ×${x.n} “${x.txt}” — ${[...x.where].slice(0, 2).join(' | ')}\n    ${x.path}`);
if (errors.length) console.log(`\n== erros da página (${errors.length})\n${[...new Set(errors)].slice(0, 30).join('\n')}`);
if (outFile) writeFileSync(outFile, JSON.stringify({ year: info.year, raw, byname, nomenu: [...byPath.values()].map((x) => ({ ...x, where: [...x.where] })), errors }, null, 1));
await b.close();
if (strict && raw.length) process.exit(1);
