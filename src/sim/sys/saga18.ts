// Rodada 18 (long18: U5/U6/U8/U9/U11) — ANO EM REVISTA (balanço de dezembro com cartão compartilhável), BIOGRAFIA
// VIVA (prosa gerada dos Fatos, memórias e conquistas), DINASTIA JOGÁVEL (a "Casa" do selo: prestígio herdado,
// mandato por geração, saga no fim), DIFICULDADE ADAPTATIVA opcional (desligada por padrão; visível na Mesa com o
// porquê) e a curva do Mestre (dm18) lida no balanço — sem duplicar. As três perguntas do Cockpit saem de cockpit18().

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { queueCutscene, registerExt4, registerSimHook } from '../ext4';
import { emitFact, factsAbout, recentFacts } from '../facts17';
import { arTotal18, fin18, mIdx18 } from '../ledger18';
import { advisorTips18, type Goto18 } from '../inbox18';
import { bumpPerks, registerPerkSource } from '../perks';
import type { GameState } from '../types';
import { fmtL, playerActs, remember } from '../util';
import { dm18, PHASE18 } from './dm18';
import { heirs } from './heirs8';
import { items18 } from './inbox18';
import { allScores18, legacy18, mainPath18, pa18, pathDef18, pathEnding18, pathScore18, type PathId } from './paths18';
import { burn18, pol18 } from './policy18';
import { ownerOf } from './people/owner';
import { rv18 } from './review18';
import { stressOf } from '../stress17';

// ---------------------------------------------------------------- estado

export interface Year18 { y: number; cash0: number; cash1: number; rev: number; prof: number; n1: number; rels: number; best?: string; facts: L[]; gone: L[]; signed: number; left: number; path?: PathId; pathScore: number; tension: [number, number]; pm: { good: number; bad: number } }
export interface Gen18 { name: string; from: number; to?: number; path?: PathId; score?: number; mandate: string; done?: boolean; deeds: L[] }
export interface Saga18State { years: Year18[]; cash0: number; n1y: number; relY: number; signY: number; leftY: number; house: { name: string; prestige: number; gens: Gen18[]; lin: number }; adapt: { on: boolean; lvl: number; why: L[] } }
declare module '../ext4' { interface Ext4 { saga18: Saga18State } }
const fresh = (): Saga18State => ({ years: [], cash0: 0, n1y: 0, relY: 0, signY: 0, leftY: 0, house: { name: '', prestige: 0, gens: [], lin: 0 }, adapt: { on: false, lvl: 0, why: [] } });
registerExt4('saga18', fresh);
export const sg18 = (s: GameState): Saga18State => {
  const x = s.x4 as unknown as { saga18?: Saga18State };
  return (x.saga18 ??= fresh());
};
const real = (s: GameState, c: number) => Math.round(toReal(c, s.year));
const usd = (v: number) => `$${Math.round(v).toLocaleString('en-US')}`;

// ---------------------------------------------------------------- mandatos de geração (U8)

export const MANDATES18: Record<string, { name: L; test: (s: GameState, g: Gen18) => boolean }> = {
  build: { name: l('Construir o selo do zero', 'Build the label from scratch'), test: (s) => (mainPath18(s) ? pathScore18(s, mainPath18(s)!).score >= 35 : false) },
  heal: { name: l('Sanear as contas herdadas', 'Clean up the inherited books'), test: (s) => s.player.cash > burn18(s) * 6 && s.player.loans.length === 0 },
  name: { name: l('Restaurar o nome da Casa', 'Restore the House\'s name'), test: (s) => (s.player.reputation.institutional + s.player.reputation.artists) / 2 >= 60 },
  grow: { name: l('Levar a Casa além da fronteira', 'Take the House beyond the border'), test: (s) => s.player.territories.length >= 3 },
  keep: { name: l('Preservar o catálogo', 'Preserve the catalog'), test: (s) => pathScore18(s, 'catalog').score >= 50 },
  peak: { name: l('Superar o fundador', 'Surpass the founder'), test: (s, g) => legacy18(s).total > (sg18(s).house.gens[0]?.score ?? 0) + 10 && g.from < s.year },
};
function pickMandate(s: GameState): string {
  if (!sg18(s).house.gens.length) return 'build';
  if (s.player.cash < burn18(s) * 2 || s.player.loans.length > 1) return 'heal';
  if ((s.player.reputation.institutional + s.player.reputation.artists) / 2 < 45) return 'name';
  if (pathScore18(s, 'catalog').score >= 40) return 'keep';
  if (s.player.territories.length < 3) return 'grow';
  return 'peak';
}
function ensureHouse(s: GameState): void {
  const H = sg18(s).house, o = ownerOf(s);
  if (!H.name) H.name = fmtL(l('Casa {n}', 'House of {n}'), { n: o.name.split(' ').slice(-1)[0] }).pt;
  if (!H.gens.length) H.gens.push({ name: o.name, from: s.config.startYear, mandate: 'build', deeds: [] });
}
/** Troca de geração: fecha a anterior (pontua, prestígio), abre o mandato da nova. */
function succession(s: GameState): void {
  const S = sg18(s), H = S.house, lin = heirs(s).lineage.length;
  if (lin <= H.lin) return;
  H.lin = lin;
  const g = H.gens[H.gens.length - 1];
  const L18 = legacy18(s);
  if (g) {
    g.to = s.year; g.path = L18.best ?? undefined; g.score = L18.total;
    g.done = MANDATES18[g.mandate]?.test(s, g) ?? false;
    g.deeds = pa18(s).ach.filter((a) => a.y >= g.from).slice(-3).map((a) => a.t);
    H.prestige += Math.round(L18.total / 5 + (g.done ? 15 : 0));
  }
  const m = pickMandate(s);
  H.gens.push({ name: ownerOf(s).name, from: s.year, mandate: m, deeds: [] });
  const t = fmtL(l('{n} assume a {h} (geração {g}, prestígio {p}). Mandato: {m}.', '{n} takes over the {h} (generation {g}, prestige {p}). Mandate: {m}.'), { n: ownerOf(s).name, h: H.name, g: H.gens.length, p: H.prestige, m: MANDATES18[m].name });
  remember(s, 'house18', t, { important: true });
  emitFact(s, { kind: 'succession', actors: ['player'], severity: 50, visibility: 'public', tags: ['house'], text: t, src: 'saga18' });
  bumpPerks();
}
registerPerkSource('saga18', (s) => {
  const out = [] as { label: L; values: Record<string, number> }[];
  const H = sg18(s).house;
  if (H.gens.length >= 2 && H.prestige > 0) out.push({ label: fmtL(l('Prestígio da {h}', 'Prestige of the {h}'), { h: H.name }), values: { offer: Math.min(0.06, H.prestige / 1500), reputation: Math.min(1, H.prestige / 200) } });
  const A = sg18(s).adapt;
  if (A.on && Math.abs(A.lvl) >= 0.25) {
    const k = A.lvl;
    out.push({ label: l('Dificuldade adaptativa', 'Adaptive difficulty'), values: k < 0 ? { appeal: -k * 0.05, staffCost: k * 0.05 } : { appeal: -k * 0.04, offer: -k * 0.02 } });
  }
  return out;
});

// ---------------------------------------------------------------- dificuldade adaptativa (U11)

export function adaptRead18(s: GameState): { target: number; why: L[] } {
  const why: L[] = [];
  let t = 0;
  const run = s.player.cash / Math.max(1, burn18(s));
  if (s.player.cash < 0 || s.player.insolvencyMonths > 0) { t -= 2; why.push(l('caixa negativo', 'negative cash')); }
  else if (run < 3) { t -= 1; why.push(fmtL(l('fôlego curto ({m} meses)', 'short runway ({m} months)'), { m: run.toFixed(1) })); }
  const pm = rv18(s).pm.slice(0, 3);
  if (pm.length >= 2 && pm.filter((p) => p.tone === 'bad').length >= 2) { t -= 0.5; why.push(l('dois lançamentos recentes abaixo do esperado', 'two recent releases below expectations')); }
  if (run > 36) { t += 1; why.push(fmtL(l('caixa folgado ({m} meses)', 'comfortable cash ({m} months)'), { m: Math.round(run) })); }
  const best = allScores18(s)[0];
  if (best && best.score >= 75) { t += 1; why.push(fmtL(l('caminho "{p}" quase completo', 'path "{p}" nearly complete'), { p: pathDef18(best.id)!.name })); }
  return { target: clamp(t, -2, 2), why };
}
export function setAdapt18(s: GameState, on: boolean): void { const A = sg18(s).adapt; A.on = on; if (!on) A.lvl = 0; bumpPerks(); }

// ---------------------------------------------------------------- ano em revista (U5)

export function buildYear18(s: GameState): Year18 {
  const S = sg18(s), y = s.year;
  const f = fin18(s).y[y];
  const sum = (p: string) => Object.entries(f ?? {}).filter(([k]) => k.startsWith(p)).reduce((t, [, v]) => t + v, 0);
  const mine = new Set(playerActs(s));
  const rels = Object.values(s.releases).filter((r) => r.year === y && (r.owner === 'player' || s.acts[r.actId]?.playerBand) && !r.hist);
  const best = rels.sort((a, b) => a.peak - b.peak)[0];
  const facts = recentFacts(s, { months: 12, notSecret: true, minSev: 35, limit: 40 }).filter((x) => x.actors.some((a) => a === 'player' || mine.has(a))).sort((a, b) => b.severity - a.severity).slice(0, 5).map((x) => x.text);
  const gone = recentFacts(s, { months: 12, kinds: ['death', 'split', 'exit'], notSecret: true, limit: 20 }).filter((x) => x.actors.some((a) => mine.has(a) || s.persons[a]?.isPlayer)).slice(0, 4).map((x) => x.text);
  const curve = dm18(s).curve.filter((c) => c[0] > s.week - 52);
  const pm = rv18(s).pm.filter((p) => p.y === y);
  const m = mainPath18(s);
  return {
    y, cash0: S.cash0, cash1: s.player.cash, rev: f ? sum('rev:') : s.player.revenueByYear[y] ?? 0, prof: f ? sum('rev:') + sum('cost:') : s.player.profitByYear[y] ?? 0,
    n1: s.player.stats.number1s - S.n1y, rels: rels.length, best: best ? fmtL(l('"{t}" ({a}), pico nº {p}', '"{t}" ({a}), peak #{p}'), { t: best.title, a: s.acts[best.actId]?.name ?? '—', p: best.peak < 999 ? best.peak : '—' }).pt : undefined,
    facts, gone, signed: s.memory.filter((x) => x.kind === 'signed' && x.year === y).length, left: s.memory.filter((x) => x.kind === 'left' && x.year === y).length,
    path: m ?? undefined, pathScore: m ? pathScore18(s, m).score : 0,
    tension: curve.length ? [Math.min(...curve.map((c) => c[1])), Math.max(...curve.map((c) => c[1]))] : [0, 0],
    pm: { good: pm.filter((p) => p.tone === 'good').length, bad: pm.filter((p) => p.tone === 'bad').length },
  };
}
/** Texto do cartão compartilhável. */
export function yearCard18(s: GameState, Y: Year18, lang: 'pt' | 'en'): string {
  const L = (x: L) => x[lang];
  const lines = [
    `${s.config.companyName} — ${L(l('Ano em revista', 'Year in review'))} ${Y.y}`,
    `${L(l('Caixa', 'Cash'))}: ${usd(toReal(Y.cash0, Y.y))} → ${usd(toReal(Y.cash1, Y.y))} · ${L(l('Receita op.', 'Op. revenue'))} ${usd(toReal(Y.rev, Y.y))} · ${L(l('Resultado op.', 'Op. result'))} ${usd(toReal(Y.prof, Y.y))}`,
    `${L(l('Lançamentos', 'Releases'))}: ${Y.rels} · ${L(l('nº 1', '#1s'))}: ${Y.n1}${Y.best ? ` · ${L(l('Destaque', 'Highlight'))}: ${Y.best}` : ''}`,
    ...(Y.path ? [`${L(l('Caminho', 'Path'))}: ${L(pathDef18(Y.path)!.name)} (${Y.pathScore}/100)`] : []),
    ...Y.facts.slice(0, 3).map((f) => `• ${L(f)}`),
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------- biografia viva (U6)

/** Prosa a partir dos Fatos, memórias e conquistas: 'player' ou id de ato. */
export function bio18(s: GameState, who: string): L[] {
  const out: L[] = [];
  if (who === 'player') {
    const o = ownerOf(s), H = sg18(s).house;
    out.push(fmtL(l('{n} fundou {c} em {y}, em {h}.', '{n} founded {c} in {y}, in {h}.'), { n: H.gens[0]?.name ?? o.name, c: s.config.companyName, y: s.config.startYear, h: s.config.homeCity }));
    for (const a of pa18(s).ach.slice(0, 8)) out.push(a.t);
    const pm = rv18(s).pm, hit = pm.filter((p) => p.tone === 'good')[0], miss = pm.filter((p) => p.tone === 'bad')[0];
    if (hit) out.push(fmtL(l('Entre os acertos, "{t}": {x}', 'Among the hits, "{t}": {x}'), { t: hit.title, x: hit.text }));
    if (miss) out.push(fmtL(l('Nem tudo deu certo — "{t}": {x}', 'Not everything worked — "{t}": {x}'), { t: miss.title, x: miss.text }));
    for (const d of Object.keys(pa18(s).doc)) out.push(fmtL(l('A casa jurou a doutrina "{d}" em {y}.', 'The house swore the "{d}" doctrine in {y}.'), { d: d.replace('_', ' '), y: s.config.startYear + Math.floor(pa18(s).doc[d] / 52) }));
    if (H.gens.length > 1) out.push(fmtL(l('A {h} já está na geração {g}; hoje quem manda é {n}.', 'The {h} is now in generation {g}; today {n} is in charge.'), { h: H.name, g: H.gens.length, n: o.name }));
    const m = mainPath18(s);
    if (m) out.push(fmtL(l('Hoje, o selo é lembrado assim: {e}', 'Today the label is remembered like this: {e}'), { e: pathEnding18(s, m) }));
    return out;
  }
  const a = s.acts[who];
  if (!a) return out;
  out.push(fmtL(l('{a} se formou em {y}, em {c}, tocando {g}.', '{a} formed in {y}, in {c}, playing {g}.'), { a: a.name, y: a.formed, c: a.city, g: a.genre }));
  const fs = factsAbout(s, who, { limit: 60, notSecret: true }).slice().sort((x, y) => x.w - y.w);
  const key = fs.filter((f) => f.severity >= 35 || ['signing', 'split', 'award', 'chart', 'scandal', 'death', 'marriage', 'exit'].includes(f.kind)).slice(0, 10);
  for (const f of key) out.push(fmtL(l('{y}: {t}', '{y}: {t}'), { y: f.y, t: f.text }));
  const pm = rv18(s).pm.filter((p) => p.actId === who).slice(0, 2);
  for (const p of pm) out.push(fmtL(l('Sobre "{t}": {x}', 'On "{t}": {x}'), { t: p.title, x: p.text }));
  out.push(fmtL(l('Na conta: {h} sucessos no top 10, {n} nº 1, fama {f}.', 'Tally: {h} top-10 hits, {n} #1s, fame {f}.'), { h: a.hits, n: a.number1s, f: Math.round(a.fame) }));
  return out;
}

// ---------------------------------------------------------------- Cockpit: três perguntas (feedback #14)

export interface Q18 { t: L; tone: 'good' | 'bad' | 'info'; goto?: Goto18; why?: L }
export function cockpit18(s: GameState): { now: Q18[]; works: Q18[]; threats: Q18[] } {
  const now: Q18[] = [], works: Q18[] = [], threats: Q18[] = [];
  if (s.decisions.length) now.push({ tone: 'bad', t: fmtL(l('{n} decisão(ões) na mesa — ignoradas, vale a opção padrão.', '{n} decision(s) on the desk — if ignored, the default applies.'), { n: s.decisions.length }) });
  const ask = items18(s).filter((x) => x.msg?.actions?.length && !x.msg.resolved);
  if (ask.length) now.push({ tone: 'bad', t: fmtL(l('{n} mensagem(ns) pedem resposta: {x}.', '{n} message(s) need a reply: {x}.'), { n: ask.length, x: ask.slice(0, 2).map((x) => x.subject.pt).join('; ') }), goto: { area: 'cockpit' } });
  const exc = pol18(s).exc.filter((e) => e.w > s.week - 5);
  if (exc.length) now.push({ tone: 'bad', t: fmtL(l('{n} exceção(ões) às políticas: {x}', '{n} policy exception(s): {x}'), { n: exc.length, x: exc[0].t }), goto: { area: 'long18', tab: ['long18', 'policy'] } });
  const cnt = s.offers.filter((o) => o.status === 'counter').length;
  if (cnt) now.push({ tone: 'bad', t: fmtL(l('{n} contraproposta(s) esperando.', '{n} counter-offer(s) waiting.'), { n: cnt }), goto: { area: 'market' } });
  for (const id of playerActs(s)) {
    const a = s.acts[id], c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (c && c.party === 'player' && !a.playerBand && c.endWeek - s.week > 0 && c.endWeek - s.week <= 8 && !pol18(s).renew) now.push({ tone: 'bad', t: fmtL(l('Contrato de {a} vence em {w} semanas (renovação não delegada).', '{a}\'s contract ends in {w} weeks (renewal not delegated).'), { a: a.name, w: c.endWeek - s.week }), goto: { act: id } });
  }
  if (!now.length) now.push({ tone: 'good', t: l('Nada exige você agora: dá para avançar.', 'Nothing needs you right now: you can advance.') });
  // o que funciona / falha
  for (const p of rv18(s).pm.filter((x) => s.week - x.w < 30).slice(0, 3)) works.push({ tone: p.tone, t: fmtL(l('"{t}": {x}', '"{t}": {x}'), { t: p.title, x: p.text }), goto: { area: 'long18', tab: ['long18', 'pm'] } });
  const F = fin18(s).m, mi = mIdx18(s);
  const op = (a: number, b: number) => { let t = 0; for (let i = a; i < b; i++) { const m = F[mi - i]; if (m) for (const [k, v] of Object.entries(m)) if (k.startsWith('rev:') || k.startsWith('cost:')) t += v; } return t; };
  const r3 = op(1, 4), p3 = op(4, 7);
  works.push({ tone: r3 >= 0 ? 'good' : 'bad', t: fmtL(l('Resultado operacional dos últimos 3 meses: {v} (antes: {p}).', 'Operating result, last 3 months: {v} (before: {p}).'), { v: usd(toReal(r3, s.year)), p: usd(toReal(p3, s.year)) }), goto: { area: 'finance' } });
  const m = mainPath18(s);
  if (m) {
    const k = pathScore18(s, m).kpis;
    const bestK = k.slice().sort((a, b) => b.v / b.target - a.v / a.target)[0], worstK = k.slice().sort((a, b) => a.v / a.target - b.v / b.target)[0];
    if (bestK) works.push({ tone: 'good', t: fmtL(l('{p}: forte em "{k}".', '{p}: strong on "{k}".'), { p: pathDef18(m)!.name, k: bestK.label }), goto: { area: 'long18' } });
    if (worstK && worstK !== bestK) works.push({ tone: 'bad', t: fmtL(l('{p}: falta "{k}" ({v} de {g}).', '{p}: lacking "{k}" ({v} of {g}).'), { p: pathDef18(m)!.name, k: worstK.label, v: Math.round(worstK.v), g: worstK.target }), goto: { area: 'long18' } });
  }
  // ameaças
  const run = (s.player.cash + arTotal18(s)) / Math.max(1, burn18(s));
  if (run < 6) threats.push({ tone: 'bad', t: fmtL(l('Fôlego de {m} meses (caixa + a receber ÷ custo fixo).', 'Runway of {m} months (cash + receivables ÷ fixed costs).'), { m: run.toFixed(1) }), goto: { area: 'finance' } });
  const ap = fin18(s).ap.filter((b) => b.due <= mIdx18(s) + 3).reduce((t, b) => t + b.amt, 0);
  if (ap < 0) threats.push({ tone: 'bad', t: fmtL(l('Contas a pagar nos próximos 3 meses: {v}.', 'Payables due in the next 3 months: {v}.'), { v: usd(toReal(-ap, s.year)) }), goto: { area: 'finance' } });
  const ending = playerActs(s).filter((id) => { const c = s.contracts[s.acts[id]?.contractId ?? '']; return c && c.party === 'player' && c.endWeek - s.week > 8 && c.endWeek - s.week <= 26; }).length;
  if (ending) threats.push({ tone: 'info', t: fmtL(l('{n} contrato(s) vencem em até 6 meses.', '{n} contract(s) end within 6 months.'), { n: ending }), goto: { area: 'artists' } });
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) {
    const st = s.persons[pid]?.alive ? stressOf(s, pid) : null;
    if (st && (st.level === 'breaking' || st.level === 'strained')) { threats.push({ tone: 'bad', t: fmtL(l('{p} ({a}) está no limite (estresse {v}).', '{p} ({a}) is at the edge (stress {v}).'), { p: s.persons[pid].name, a: s.acts[id].name, v: Math.round(st.short) }), goto: { person: `p:${pid}` } }); break; }
  }
  for (const t of advisorTips18(s).filter((x) => x.cat === 'rival').slice(0, 1)) threats.push({ tone: 'bad', t: t.text, goto: t.goto });
  const D = dm18(s);
  if (D.ph === 'rising' || D.ph === 'climax') threats.push({ tone: D.ph === 'climax' ? 'bad' : 'info', t: fmtL(l('Mestre: {p} (tensão {v}) — {d}', 'DM: {p} (tension {v}) — {d}'), { p: PHASE18[D.ph].name, v: Math.round(D.t), d: PHASE18[D.ph].desc }), goto: { area: 'dm18' } });
  const A = sg18(s).adapt;
  if (A.on && Math.abs(A.lvl) >= 0.25) threats.push({ tone: 'info', t: fmtL(l('Dificuldade adaptativa {x}: {w}.', 'Adaptive difficulty {x}: {w}.'), { x: A.lvl < 0 ? l('aliviando', 'easing') : l('apertando', 'tightening'), w: A.why.map((x) => x.pt).join(', ') }), goto: { area: 'long18', tab: ['long18', 'diff'] } });
  if (!threats.length) threats.push({ tone: 'good', t: l('Nenhuma ameaça clara nos próximos meses.', 'No clear threat in the coming months.') });
  return { now, works, threats };
}

// ---------------------------------------------------------------- ganchos

registerSimHook('newgame', 'saga18', (s) => { sg18(s).cash0 = s.player.cash; ensureHouse(s); sg18(s).house.lin = heirs(s).lineage.length; });
registerSimHook('month', 'saga18', (s) => {
  ensureHouse(s);
  succession(s);
  const A = sg18(s).adapt;
  if (A.on) { const r = adaptRead18(s); const old = A.lvl; A.lvl = clamp(A.lvl + clamp(r.target - A.lvl, -0.25, 0.25), -2, 2); A.why = r.why; if (old !== A.lvl) bumpPerks(); }
});
registerSimHook('year', 'saga18', (s) => {
  const S = sg18(s);
  const Y = buildYear18(s);
  S.years.push(Y);
  if (S.years.length > 40) S.years.shift();
  S.cash0 = s.player.cash; S.n1y = s.player.stats.number1s;
  remember(s, 'year18', fmtL(l('Ano em revista {y}: receita op. {r}, resultado op. {p}, {n} lançamento(s).', 'Year in review {y}: op. revenue {r}, op. result {p}, {n} release(s).'), { y: Y.y, r: usd(real(s, Y.rev)), p: usd(real(s, Y.prof)), n: Y.rels }));
  queueCutscene(s, 'long18year', { y: Y.y });
});
