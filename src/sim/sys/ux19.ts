// Rodada 19 (Frente 8, onda 4: P3, P8, P12, P4, 11.13, 11.14) — EXPERIÊNCIA DA PARTIDA (`ux19`).
//  • Transição de década/era (P8, 11.13): ao virar a década, ao chegar uma era de negócio (eras8) ou uma tecnologia-chave
//    (gravação elétrica 1925, LP 1948, multipista/rock 1955, clipes 1981, P2P 1999, streaming 2008…) grava uma `Turn19`
//    com o que mudou (tecnologia, gêneros, leis e mercado — só o que já aconteceu), o resumo da sua década (saga18),
//    as jogadas dos rivais (postura deles na era nova e últimas jogadas do rivals8) e 2–3 metas sugeridas.
//    Fato `era_turn` → ouvinte `ux19:era` (manchete press9 + Diário). Metas de abertura por época (inclusive 1889).
//  • Metas (`Goal19`): checadas todo mês, sem sorteio; cumprir dá +1 de reputação e o fato `era_goal` (ouvinte
//    `ux19:goal`: moral do elenco +2 e Diário). Prazo no calendar19 (kind other), dica do Conselheiro e porquê `ux19.goal`.
//  • Recibo de decisão (P3): ouvinte de decisões grava o que foi escolhido e quantos ecos ficaram pendentes (decide18);
//    a interface soma o "o que mudou agora" (antes × depois). Explicação `ux19.receipt`.
//  • "Por que perdi?" (P12): `lossCauses19` cruza ledger18 (fin18: 24 meses), fatos graves (facts17 + causeChain),
//    ecos que voltaram mal (dec18) e a explicação do caixa → 3 causas com "o que teria ajudado". Porquê `ux19.loss`.
//  • Fim (11.14): `epitaph19` (anos, legado, melhor disco, maior escândalo, caminho), cadeias de história (CHAINS19,
//    ouvintes onFact) e medalhas por caminho; a herança opcional (`applyHeir19`) entra pelo ledger (financiamento).
//  • Divulgação progressiva (P4): `unlocked19(s, área)` — tempo de jogo OU gatilho do sistema; aberto fica aberto.

import { clamp } from '../../core/rng';
import { toReal } from '../../core/money';
import { GENRES, genreById, l, type L } from '../../data/world';
import { TECHS } from '../../data/rules';
import { H19 } from '../../data/hist19';
import { registerDeadline } from '../calendar19';
import { registerDecisionListener, registerExt4, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { causeChain, emitFact, onFact, recentFacts, type Fact } from '../facts17';
import { fanTotal } from '../fandom';
import { registerAdvisorTip } from '../inbox18';
import { fin18, mIdx18, opProfit18, sumP18 } from '../ledger18';
import { eventById } from '../events';
import type { GameState } from '../types';
import { fmtL, playerActs, post, remember } from '../util';
import { dec18 } from './decide18';
import { ERA_SHIFTS, currentEra, eraYear, stanceOf, type EraId } from './eras8';
import { headline19 } from './factlink19';
import { legacy18, mainPath18, pathDef18, pathEnding18, PATHS18, pathScore18, tierOf, type PathId } from './paths18';
import { burn18 } from './policy18';
import { moveText, rivals8 } from './rivals8';
import { sg18 } from './saga18';
import { CHAINS19, DISC19, HEIRS19, KEY_TECH19, eraBand19, type GoalSpec19 } from './ux19data';

// ---------------------------------------------------------------- estado
export interface DecSum19 { y0: number; y1: number; rev: number; prof: number; rels: number; n1: number; signed: number; left: number; cash0: number; cash1: number; best: string[]; facts: L[] }
export interface Change19 { k: 'tech' | 'genre' | 'law' | 'market' | 'era'; t: L; x?: L }
export interface Turn19 { y: number; k: 'decade' | 'era' | 'tech'; name: L; era?: EraId; changes: Change19[]; sum: DecSum19; rivals: L[]; goals: string[]; seen?: 1 }
export interface Goal19 { id: string; spec: GoalSpec19; w0: number; due: number; base: number; src: 'open' | 'turn'; y: number; done?: number; fail?: number }
export interface Rc19 { id: string; w: number; ev: string; t: L; o: L; th?: string; n: number; d?: Record<string, number>; seen?: 1 }
export interface Ux19State { ly: number; era: string; turns: Turn19[]; goals: Goal19[]; rc: Rc19[]; ch: Record<string, number[]>; un: Record<string, number>; heir?: { id: string; w: number; from?: string }; seq: number; /** cartão de abertura já mostrado */ os?: 1 }
declare module '../ext4' { interface Ext4 { ux19: Ux19State } }
const fresh = (): Ux19State => ({ ly: 0, era: '', turns: [], goals: [], rc: [], ch: {}, un: {}, seq: 0 });
registerExt4('ux19', fresh);
export function ux19(s: GameState): Ux19State {
  const x = s.x4 as unknown as { ux19?: Ux19State };
  const st = (x.ux19 ??= fresh());
  st.turns ??= []; st.goals ??= []; st.rc ??= []; st.ch ??= {}; st.un ??= {}; st.seq ??= 0;
  return st;
}

export const monthsPlayed19 = (s: GameState): number => (s.year - s.config.startYear) * 12 + s.month;
const W_MONTH = 4.35;

// ---------------------------------------------------------------- metas
const stats = (s: GameState) => s.player.stats;
const myRels = (s: GameState, w0: number) => Object.values(s.releases).filter((r) => r.owner === 'player' && r.week >= w0);
const rosterFans = (s: GameState) => playerActs(s).reduce((t, id) => t + (s.acts[id] ? fanTotal(s.acts[id]) : 0), 0);

/** Valor atual de uma meta (o alvo é `spec.n`). */
export function goalNow19(s: GameState, g: Goal19): number {
  const n = g.spec;
  switch (n.tpl) {
    case 'rel': return myRels(s, g.w0).length;
    case 'lp': return myRels(s, g.w0).filter((r) => r.type === 'lp').length;
    case 'single': return myRels(s, g.w0).filter((r) => r.type === 'single').length;
    case 'top10': return myRels(s, g.w0).filter((r) => r.peak <= 10).length;
    case 'n1': return Math.max(0, stats(s).number1s - g.base);
    case 'sign': return Math.max(0, stats(s).signed - g.base);
    case 'reserve': { const b = Math.max(1, burn18(s)); return Math.floor(Math.max(0, s.player.cash) / b); }
    case 'fans': return rosterFans(s);
    case 'art': return Math.round(s.player.reputation.artistic);
    case 'comm': return Math.round(s.player.reputation.commercial);
    case 'terr': return s.player.territories.length;
    case 'fam': return playerActs(s).filter((id) => genreById[s.acts[id]?.genre ?? '']?.family === n.fam).length;
    case 'noLoan': return s.player.loans.length === 0 && s.player.cash > 0 ? 1 : 0;
  }
  return 0;
}
export const goalText19 = (g: Goal19): L => fmtL(g.spec.t, { n: g.spec.n >= 1000 ? g.spec.n.toLocaleString('pt-BR') : g.spec.n });

function addGoal(s: GameState, spec: GoalSpec19, src: Goal19['src']): Goal19 {
  const U = ux19(s);
  const base = spec.tpl === 'n1' ? stats(s).number1s : spec.tpl === 'sign' ? stats(s).signed : 0;
  const g: Goal19 = { id: `g${++U.seq}`, spec, w0: s.week, due: s.week + Math.round(spec.months * W_MONTH), base, src, y: s.year };
  U.goals.push(g);
  if (U.goals.length > 24) U.goals.splice(0, U.goals.length - 24);
  return g;
}
export const activeGoals19 = (s: GameState): Goal19[] => ux19(s).goals.filter((g) => !g.done && !g.fail);

/** Metas sugeridas para uma faixa de época: abertura = 3 primeiras; viradas giram pelo resto (sem repetir as ativas). */
export function suggest19(s: GameState, y: number, n: number, offset: number): GoalSpec19[] {
  const band = eraBand19(y), act = new Set(activeGoals19(s).map((g) => g.spec.tpl));
  const pool = band.goals.map((_, i) => band.goals[(i + offset) % band.goals.length]).filter((x) => !act.has(x.tpl));
  return pool.slice(0, n);
}

/** Metas de abertura por época (1889 incluso). Chamado no newgame; seguro chamar de novo (não duplica). */
export function openingGoals19(s: GameState): Goal19[] {
  const U = ux19(s);
  if (U.goals.some((g) => g.src === 'open')) return U.goals.filter((g) => g.src === 'open');
  return suggest19(s, s.config.startYear, 3, 0).map((x) => addGoal(s, x, 'open'));
}

function checkGoals(s: GameState): void {
  for (const g of activeGoals19(s)) {
    const v = goalNow19(s, g);
    // metas de "segurar" (caixa, sem dívida) só contam depois de 1 ano (ou perto do prazo): não valem no 1º mês
    const hold = (g.spec.tpl === 'reserve' || g.spec.tpl === 'noLoan') && s.week < Math.min(g.w0 + 52, g.due - 4);
    if (v >= g.spec.n && !hold) {
      g.done = s.week;
      const rp = s.player.reputation, k = g.spec.tpl === 'art' || g.spec.tpl === 'lp' ? 'artistic' : g.spec.tpl === 'reserve' || g.spec.tpl === 'noLoan' ? 'institutional' : 'commercial';
      rp[k] = clamp(rp[k] + 1, 0, 100);
      emitFact(s, { kind: 'era_goal', actors: ['player'], severity: 20, visibility: 'public', tags: ['ux19', g.src, g.spec.tpl, 'good'], text: fmtL(l('Meta cumprida: {t}.', 'Goal met: {t}.'), { t: goalText19(g) }), src: 'ux19', data: { g: g.id } });
    } else if (s.week > g.due) g.fail = s.week;
  }
}

// ---------------------------------------------------------------- viradas de década/era
const inRange = (y: number | undefined, a: number, b: number) => y !== undefined && y > a && y <= b;

/** O que mudou entre `y0` (exclusivo) e `y` — só o que já aconteceu nesta partida. */
export function changes19(s: GameState, y0: number, y: number): Change19[] {
  const out: Change19[] = [];
  y = Math.min(y, s.year + (s.month === 11 ? 1 : 0));
  for (const tc of TECHS) if (inRange(s.techDates[tc.id], y0, y)) out.push({ k: 'tech', t: tc.name });
  for (const g of GENRES) if (g.born > s.config.startYear && inRange(g.born, y0, y)) out.push({ k: 'genre', t: g.name });
  for (const h of H19) {
    if (!inRange(h.y, y0, y) || (h.tech && !(s.techDates[h.tech] <= s.year))) continue;
    if (h.k === 'law') out.push({ k: 'law', t: h.t, x: h.x });
    else if (h.k === 'deal' || h.k === 'crisis' || h.k === 'wave') out.push({ k: 'market', t: h.t, x: h.x });
  }
  for (const e of ERA_SHIFTS) if (inRange(eraYear(s, e.id), y0, y)) out.push({ k: 'era', t: e.name, x: e.model });
  // listas curtas: 4 por tipo
  const cnt: Record<string, number> = {};
  return out.filter((c) => (cnt[c.k] = (cnt[c.k] ?? 0) + 1) <= 4);
}

/** Resumo da década (ou do trecho desde o início) a partir do "Ano em revista" do saga18. */
export function decadeSum19(s: GameState, y0: number, y1: number): DecSum19 {
  const ys = sg18(s).years.filter((x) => x.y >= y0 && x.y <= y1);
  const sum = (f: (x: (typeof ys)[number]) => number) => ys.reduce((t, x) => t + f(x), 0);
  return {
    y0, y1, rev: sum((x) => x.rev), prof: sum((x) => x.prof), rels: sum((x) => x.rels), n1: sum((x) => x.n1), signed: sum((x) => x.signed), left: sum((x) => x.left),
    cash0: ys[0]?.cash0 ?? s.player.initialCash, cash1: ys[ys.length - 1]?.cash1 ?? s.player.cash,
    best: ys.map((x) => x.best).filter((x): x is string => !!x).slice(-3), facts: ys.flatMap((x) => x.facts).slice(-4),
  };
}

/** Jogadas dos rivais: postura na era nova (eras8) e a última jogada registrada (rivals8). */
export function rivalMoves19(s: GameState, era?: EraId): L[] {
  const lbs = Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.revenueYear - a.revenueYear).slice(0, 3);
  const log = rivals8(s)?.log ?? {};
  return lbs.map((lb) => {
    const st = era ? stanceOf(s, lb.id, era) : undefined;
    const mv = (log[lb.id] ?? []).slice(-1)[0];
    if (st) return fmtL(l('{lb} aposta em "{st}".', '{lb} bets on "{st}".'), { lb: lb.name, st: st.name });
    if (mv) return fmtL(l('{lb}: {m}', '{lb}: {m}'), { lb: lb.name, m: moveText(mv) });
    return fmtL(l('{lb} segue o plano de sempre.', '{lb} sticks to its usual plan.'), { lb: lb.name });
  });
}

function turnName(k: Turn19['k'], y: number, era?: EraId, tech?: string): L {
  if (k === 'era' && era) return fmtL(l('Nova era: {e}', 'New era: {e}'), { e: ERA_SHIFTS.find((e) => e.id === era)!.name });
  if (k === 'tech' && tech) return fmtL(l('Chegou: {t}', 'It\'s here: {t}'), { t: TECHS.find((x) => x.id === tech)?.name ?? tech });
  return fmtL(l('Os anos {d}', 'The {d}s'), { d: y });
}

/** Era de negócio vigente no ano `y` (mesma ordem do eras8.erasSoFar). */
export function eraAt19(s: GameState, y: number): EraId {
  const xs = ERA_SHIFTS.map((e, i) => ({ e, i, y: eraYear(s, e.id) })).filter((x) => x.y !== undefined && x.y <= y).sort((a, b) => a.y! - b.y! || a.i - b.i);
  return (xs[xs.length - 1]?.e ?? ERA_SHIFTS[0]).id;
}

/** Cria a virada que abre o ano `y` (público para os testes). Roda no fechamento de dezembro (gancho 'year'). */
export function makeTurn19(s: GameState, k: Turn19['k'], era?: EraId, tech?: string, y = s.year): Turn19 {
  const U = ux19(s);
  const prev = U.turns[U.turns.length - 1]?.y ?? s.config.startYear;
  const y0 = k === 'decade' ? Math.max(s.config.startYear, y - 10) : Math.max(s.config.startYear, prev);
  const ch = changes19(s, k === 'decade' ? y - 10 : Math.min(prev, y - 1), y);
  const goals = suggest19(s, y, U.turns.length % 2 ? 2 : 3, 3 + U.turns.length).map((x) => addGoal(s, x, 'turn').id);
  const T: Turn19 = { y, k, name: turnName(k, y, era, tech), era, changes: ch, sum: decadeSum19(s, y0, y - 1), rivals: rivalMoves19(s, era), goals };
  U.turns.push(T);
  if (U.turns.length > 30) U.turns.splice(0, U.turns.length - 30);
  emitFact(s, { kind: 'era_turn', actors: ['player'], severity: 30, visibility: 'public', tags: ['ux19', k, ...(era ? [era] : []), ...(tech ? [tech] : [])], text: T.name, src: 'ux19', data: { y, k } });
  return T;
}

/** Fechamento do ano: a virada é do ano seguinte (`Y`). Uma por ano, na ordem era › tecnologia-chave › década. */
function yearTurn(s: GameState): void {
  const U = ux19(s), Y = s.year + 1;
  if (U.ly >= Y) return;
  U.ly = Y;
  const era = eraAt19(s, Y);
  const tech = KEY_TECH19.find((t) => s.techDates[t] === Y);
  if (U.era && U.era !== era) makeTurn19(s, 'era', era, undefined, Y);
  else if (tech) makeTurn19(s, 'tech', undefined, tech, Y);
  else if (Y % 10 === 0) makeTurn19(s, 'decade', undefined, undefined, Y);
  U.era = era;
}

registerSimHook('newgame', 'ux19', (s) => { const U = ux19(s); U.ly = s.year; U.era = currentEra(s).id; openingGoals19(s); });
registerSimHook('year', 'ux19', (s) => yearTurn(s));
registerSimHook('month', 'ux19', (s) => {
  const U = ux19(s);
  if (!U.ly) { U.ly = s.year; U.era = currentEra(s).id; openingGoals19(s); }
  checkGoals(s);
  for (const a of Object.keys(DISC19)) if (!U.un[a] && unlocked19(s, a)) U.un[a] = s.week;
});

onFact('era_turn', (s, f) => {
  headline19(s, f.text, 2);
  remember(s, 'era19', fmtL(l('Virada: {t}.', 'Turning point: {t}.'), { t: f.text }), { important: true });
}, 'ux19:era');
onFact('era_goal', (s, f) => {
  for (const id of playerActs(s)) for (const m of s.acts[id]?.members ?? []) { const p = s.persons[m]; if (p?.alive && !p.isPlayer) p.morale = clamp(p.morale + 2, 0, 100); }
  remember(s, 'goal19', f.text, { important: f.tags.includes('turn') });
}, 'ux19:goal');

// ---------------------------------------------------------------- recibo de decisão
registerDecisionListener('ux19', (s, ev, opt, ctx) => {
  const d = s.decisions.find((x) => x.eventId === ev && x.ctx === ctx);
  const def = eventById[ev], o = def?.options.find((x) => x.id === opt);
  if (!o) return;
  const U = ux19(s), th = dec18(s).th[0];
  const mine = th && th.w === s.week && d && th.t === d.title ? th : undefined;
  U.rc.unshift({ id: `r${++U.seq}`, w: s.week, ev, t: d?.title ?? def.title, o: o.label, th: mine?.id, n: mine?.n ?? 0 });
  if (U.rc.length > 30) U.rc.length = 30;
});
/** Ecos do recibo: pendentes (ainda na fila) e os que já voltaram (com o tom). */
export function receiptEchoes19(s: GameState, r: Rc19): { pend: number; back: { t: L; tone: string }[] } {
  if (!r.th) return { pend: 0, back: [] };
  const D = dec18(s);
  return { pend: D.q.filter((e) => e.id.startsWith(`${r.th}.`)).length, back: D.done.filter((x) => x[4] === r.th).map((x) => ({ t: x[2], tone: x[3] })) };
}

// ---------------------------------------------------------------- por que perdi?
export interface Cause19 { k: string; t: L; v: number; help: L; when?: number; chain?: L[] }
const GRP19: Record<string, [L, L]> = {
  pay: [l('Folha de pagamento pesada', 'Heavy payroll'), l('Equipe do tamanho da receita; políticas de folha (Rumo do selo).', 'Staff sized to revenue; payroll policies (Label course).')],
  ovh: [l('Custos fixos (sede, aluguel, equipamentos)', 'Fixed costs (HQ, rent, equipment)'), l('Sede menor ou dividida; vender equipamento parado.', 'Smaller or shared HQ; sell idle gear.')],
  mkt: [l('Marketing sem retorno', 'Marketing without return'), l('Campanhas só para discos com pós-venda bom (Post-mortems).', 'Campaigns only for records with good post-mortems.')],
  ar: [l('Adiantamentos que não recuperaram', 'Advances that never recouped'), l('Adiantamento pela PA e pelo histórico; cláusula de recuperação.', 'Advances by PA and track record; recoupment clause.')],
  cogs: [l('Custo de produção e prensagem', 'Production and pressing costs'), l('Tiragens menores; contrato de capacidade na fábrica.', 'Smaller runs; capacity contract with the plant.')],
  int: [l('Juros da dívida', 'Debt interest'), l('Menos empréstimos; renegociar ou vender um ativo antes do vermelho.', 'Fewer loans; renegotiate or sell an asset before the red.')],
};
const FACT_HELP19: Record<string, L> = {
  scandal: l('Gestão de crise cedo (assessoria, desculpas) e seguro.', 'Early crisis management (PR, apology) and insurance.'),
  split: l('Cuidar da dinâmica da banda antes do racha.', 'Tend the band dynamics before the split.'),
  exit: l('Renovar com tempo e manter a confiança do artista.', 'Renew early and keep the artist\'s trust.'),
  death: l('Seguro de pessoa-chave e catálogo diversificado.', 'Key-person insurance and a diversified catalog.'),
  tour_cancel: l('Seguro de turnê e agenda com folga.', 'Tour insurance and a schedule with slack.'),
  debt_called: l('Respeitar os covenants do banco (dívida ≤ receita).', 'Respect the bank covenants (debt ≤ revenue).'),
  case_ruling: l('Acordo antes da sentença.', 'Settle before the ruling.'),
  cancel_wave: l('Responder rápido na janela de 2 semanas.', 'Answer fast within the 2-week window.'),
  bond_default: l('Lastro com catálogo que rende, não o que se espera.', 'Back bonds with catalog that earns, not what is hoped.'),
};

/** As causas do vermelho (top 3 por impacto), a partir de ledger18, fatos e ecos. */
export function lossCauses19(s: GameState, n = 3): Cause19[] {
  const F = fin18(s), now = mIdx18(s), out: Cause19[] = [];
  const win = (a: number, b: number) => { const o: Record<string, number> = {}; for (let i = now - b; i < now - a; i++) for (const [k, v] of Object.entries(F.m[i] ?? {})) o[k] = (o[k] ?? 0) + v; return o; };
  const last = win(0, 12), prev = win(12, 24);
  const rev = Math.max(1, sumP18(last, 'rev:'));
  for (const [g, [t, help]] of Object.entries(GRP19)) {
    const c = -(g === 'int' ? last['nonop:int'] ?? 0 : last[`cost:${g}`] ?? 0);
    if (c > rev * 0.15) out.push({ k: `cost:${g}`, t, v: Math.round((c / rev) * 100), help });
  }
  const r0 = sumP18(prev, 'rev:'), r1 = sumP18(last, 'rev:');
  if (r0 > 0 && r1 < r0 * 0.8) out.push({ k: 'rev', t: fmtL(l('Receita caiu {p}% em 12 meses', 'Revenue fell {p}% in 12 months'), { p: Math.round((1 - r1 / r0) * 100) }), v: Math.round((1 - r1 / r0) * 100), help: l('Lançar com regularidade e ter renda fora do disco (shows, edição, sync).', 'Release steadily and earn beyond records (live, publishing, sync).') });
  const op = opProfit18(last);
  if (op < 0 && !out.length) out.push({ k: 'op', t: l('Prejuízo operacional contínuo', 'Persistent operating loss'), v: 40, help: l('Cortar o que não paga (DRE em Finanças) antes de crescer.', 'Cut what does not pay (P&L in Finance) before growing.') });
  const mine = new Set(['player', ...playerActs(s)]);
  const bad = recentFacts(s, { months: 30, minSev: 40 }).filter((f) => f.actors.some((a) => mine.has(a)) && (FACT_HELP19[f.kind] || f.tags.includes('bad')));
  for (const f of bad.slice(0, 6)) out.push({ k: `fact:${f.kind}`, t: f.text, v: f.severity, help: FACT_HELP19[f.kind] ?? l('Ler o "por quê" do fato e agir antes da próxima vez.', 'Read the fact\'s "why" and act before the next time.'), when: f.w, chain: causeChain(s, f, 4).map((x: Fact) => x.text) });
  const echoes = dec18(s).done.filter((x) => x[3] === 'bad' && x[0] > s.week - 104).slice(0, 2);
  for (const [w, ti, tx] of echoes) out.push({ k: 'echo', t: fmtL(l('"{t}" voltou mal: {x}', '"{t}" came back badly: {x}'), { t: ti, x: tx }), v: 35, help: l('Ver as "Consequências pendentes" antes de escolher a opção arriscada.', 'Check "Pending consequences" before picking the risky option.'), when: w });
  const seen = new Set<string>();
  return out.sort((a, b) => b.v - a.v).filter((c) => !seen.has(c.k) && !!seen.add(c.k)).slice(0, n);
}
registerExplain('ux19.loss', (s) => {
  const C = lossCauses19(s);
  if (!C.length) return null;
  return { title: l('Por que o caixa afundou', 'Why the cash sank'), value: C.length, fmt: 'num',
    parts: C.map((c): WhyPart => ({ label: c.t, value: c.v, fmt: 'num', tone: 'bad', note: c.help })),
    note: l('Peso: custo ÷ receita dos últimos 12 meses (%), queda de receita (%) ou gravidade do fato (0–100).', 'Weight: cost ÷ revenue over the last 12 months (%), revenue drop (%) or fact severity (0–100).') };
});
/** Quase-falência: caixa negativo ou meses de insolvência. */
export const nearLoss19 = (s: GameState): boolean => s.player.cash < 0 || s.player.insolvencyMonths > 0;

// ---------------------------------------------------------------- fim de partida: epitáfio, cadeias, medalhas
export interface Epitaph19 { name: string; y0: number; y1: number; legacy: number; path?: PathId; pathName?: L; ending?: L; best?: { title: string; act: string; peak: number; rev: number }; scandal?: L; stats: { k: L; v: number }[]; chains: { id: string; n: number; all: boolean }[]; medals: { id: PathId; tier: number }[] }
export function chainProgress19(s: GameState): { id: string; n: number; all: boolean }[] {
  const ch = ux19(s).ch;
  return CHAINS19.map((c) => ({ id: c.id, n: (ch[c.id] ?? []).length, all: (ch[c.id] ?? []).length >= c.steps.length }));
}
export function epitaph19(s: GameState): Epitaph19 {
  const rels = Object.values(s.releases).filter((r) => r.owner === 'player');
  const b = rels.sort((x, y) => y.revenue - x.revenue || x.peak - y.peak)[0];
  const sc = recentFacts(s, { kind: 'scandal' }).filter((f) => f.actors.some((a) => a === 'player' || s.acts[a]?.owner === 'player')).sort((x, y) => y.severity - x.severity)[0];
  const L18 = legacy18(s), p = mainPath18(s) ?? L18.best ?? undefined;
  const st = s.player.stats;
  return {
    name: s.config.companyName, y0: s.config.startYear, y1: s.ended?.year ?? s.year, legacy: L18.total, path: p ?? undefined, pathName: p ? pathDef18(p)?.name : undefined, ending: p ? pathEnding18(s, p) : undefined,
    best: b ? { title: b.title, act: s.acts[b.actId]?.name ?? '', peak: b.peak, rev: Math.round(toReal(b.revenue, s.year) / 100) } : undefined,
    scandal: sc?.text,
    stats: [{ k: l('Lançamentos', 'Releases'), v: st.releases }, { k: l('Nº 1', '#1s'), v: st.number1s }, { k: l('Top 10', 'Top 10s'), v: st.top10s }, { k: l('Prêmios', 'Awards'), v: st.awards }, { k: l('Contratados', 'Signed'), v: st.signed }],
    chains: chainProgress19(s),
    medals: PATHS18.map((x) => ({ id: x.id, tier: tierOf(pathScore18(s, x.id).score) })).filter((x) => x.tier > 0),
  };
}

for (const c of CHAINS19) c.steps.forEach((st, i) => {
  for (const k0 of st.k) {
    const [kind, tag] = k0.split('#');
    onFact(kind, (s, f) => {
      if (tag && !f.tags.includes(tag)) return;
      const arr = (ux19(s).ch[c.id] ??= []);
      if (!arr.includes(i)) arr.push(i);
    }, `ux19:chain:${c.id}:${k0}`);
  }
});

// ---------------------------------------------------------------- herança entre partidas (opcional)
export function applyHeir19(s: GameState, id: string, from?: string): L | null {
  const U = ux19(s);
  if (U.heir) return l('A herança já foi usada nesta partida.', 'The legacy was already used in this run.');
  if (monthsPlayed19(s) > 3) return l('A herança só pode ser aceita nos 3 primeiros meses.', 'The legacy can only be taken in the first 3 months.');
  const H = HEIRS19.find((x) => x.id === id);
  if (!H) return l('Herança desconhecida.', 'Unknown legacy.');
  U.heir = { id, w: s.week, from };
  if (id === 'cash') post(s, 'heir19', Math.round(s.player.initialCash * 0.05), 'owner_capital', 'Herança: poupança da família');
  else if (id === 'rep') for (const k of ['artistic', 'commercial', 'artists', 'institutional'] as const) s.player.reputation[k] = clamp(s.player.reputation[k] + 2, 0, 100);
  else if (id === 'ear') {
    const home = s.config.homeCity;
    const xs = Object.values(s.acts).filter((a) => !a.owner && a.city === home && !s.knowledge[a.id] && a.status !== 'retired').sort((a, b) => b.potential - a.potential || a.id.localeCompare(b.id)).slice(0, 2);
    for (const a of xs) s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'monitoring', bias: 0, updatedWeek: s.week, source: 'heir19' };
  }
  remember(s, 'heir19', fmtL(l('Herança aceita: {h}{f}.', 'Legacy taken: {h}{f}.'), { h: H.name, f: from ? fmtL(l(' (de {x})', ' (from {x})'), { x: from }) : '' }), { important: true });
  return null;
}

// ---------------------------------------------------------------- divulgação progressiva
const relsAny = (s: GameState) => Object.values(s.releases).some((r) => r.owner === 'player');
/** Gatilhos dos sistemas: a área abre antes do prazo quando passa a importar. */
const TRIG19: Record<string, (s: GameState) => boolean> = {
  rights18: relsAny, supply18: relsAny, critics: relsAny, market19a: (s) => Object.values(s.releases).some((r) => r.owner === 'player' && r.peak <= 40),
  dyn18: (s) => playerActs(s).some((id) => (s.acts[id]?.members.length ?? 0) >= 2),
  contracts19: (s) => playerActs(s).length >= 2, firm19: (s) => s.player.staff.length >= 3,
  regions18: (s) => s.player.territories.length >= 2, regions19: (s) => s.player.territories.length >= 2,
  tribute19: (s) => playerActs(s).some((id) => (s.acts[id]?.fame ?? 0) >= 50),
  crime: (s) => recentFacts(s, { months: 12, tag: 'crime', actor: 'player', limit: 1 }).length > 0,
  dm18: (s) => recentFacts(s, { months: 12, minSev: 50, actor: 'player', limit: 1 }).length > 0,
};
export function unlocked19(s: GameState, area: string): boolean {
  const m = DISC19[area];
  if (m === undefined) return true;
  const U = ux19(s);
  if (U.un[area] !== undefined) return true;
  return monthsPlayed19(s) >= m || !!TRIG19[area]?.(s);
}
export const lockedAreas19 = (s: GameState): string[] => Object.keys(DISC19).filter((a) => !unlocked19(s, a));

// ---------------------------------------------------------------- calendário, Conselheiro, porquês
registerDeadline('ux19', (s, from, to) => activeGoals19(s).filter((g) => g.due >= from && g.due <= to)
  .map((g) => ({ id: `ux19:${g.id}`, w: g.due, kind: 'other' as const, t: goalText19(g), d: fmtL(l('Meta da era: {v} de {n}', 'Era goal: {v} of {n}'), { v: goalNow19(s, g), n: g.spec.n }), tone: 'info' as const, goto: { area: 'goals' } })));

registerAdvisorTip('ux19', (s) => {
  const G = activeGoals19(s).map((g) => ({ g, v: goalNow19(s, g) })).filter((x) => x.v < x.g.spec.n && x.g.due - s.week <= 13);
  return G.slice(0, 1).map(({ g, v }) => ({ id: `ux19-${g.id}`, level: 'info' as const, cat: 'career' as const, score: 28,
    text: fmtL(l('Meta da era vencendo: {t} ({v}/{n}).', 'Era goal running out: {t} ({v}/{n}).'), { t: goalText19(g), v, n: g.spec.n }),
    why: [l('Metas cumpridas dão +1 de reputação e moral ao elenco.', 'Met goals give +1 reputation and roster morale.')], goto: { area: 'goals' } }));
});

registerExplain('ux19.goal', (s, ctx) => {
  const g = ux19(s).goals.find((x) => x.id === ctx.g);
  if (!g) return null;
  const v = goalNow19(s, g);
  return { title: goalText19(g), value: `${v}/${g.spec.n}`, fmt: 'text',
    parts: [{ label: l('Desde', 'Since'), value: g.y, fmt: 'text' }, { label: l('Semanas até o prazo', 'Weeks to deadline'), value: Math.max(0, g.due - s.week), fmt: 'num' },
      { label: l('Origem', 'Source'), value: g.src === 'open' ? 'abertura' : 'virada', fmt: 'text' }],
    note: l('Conta só o que aconteceu depois que a meta apareceu. Recompensa: +1 de reputação e moral do elenco +2.', 'Counts only what happened after the goal appeared. Reward: +1 reputation and roster morale +2.') };
});

registerExplain('ux19.receipt', (s, ctx) => {
  const r = ux19(s).rc.find((x) => x.id === ctx.r);
  if (!r) return null;
  const e = receiptEchoes19(s, r);
  const parts: WhyPart[] = Object.entries(r.d ?? {}).map(([k, v]) => ({ label: k, value: v, fmt: k === 'cash' ? 'money' : 'signed', tone: v > 0 ? 'good' : v < 0 ? 'bad' : '' }));
  parts.push({ label: l('Ecos pendentes', 'Pending echoes'), value: e.pend, fmt: 'num', why: { key: 'dec18.pending' } });
  for (const b of e.back) parts.push({ label: b.t, tone: b.tone === 'good' ? 'good' : b.tone === 'bad' ? 'bad' : '' });
  return { title: fmtL(l('{t} → {o}', '{t} → {o}'), { t: r.t, o: r.o }), value: e.pend, fmt: 'num', parts, note: l('"Agora" = diferença entre antes e depois do clique; "depois" = ecos agendados pelo decide18.', '"Now" = difference between before and after the click; "later" = echoes scheduled by decide18.') };
});
