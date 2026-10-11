// Rodada 19 (Frente 1, grupo B + 11.10 + 11.11) — MALHA DE LIGAÇÕES B. Cada ligação = regra + gancho + "porquê"
// (explain18) + fato com ouvinte real:
//  1. Sessão × qualidade × CA/PA: músico de estúdio forte sobe a dimensão certa do disco (quality18) e ensina o
//     elenco (ability18: experiência de estúdio e "mentor" na sessão); músico fraco puxa a dimensão para baixo.
//     Fato `session_mark` → moral do elenco (bom) ou confiança do ato (ruim).
//  2. Câmbio por submercado: receita lançada na moeda local (econ18, por mercado → submercado de regions18); crise
//     cambial no submercado (tabela histórica; fora do modo exato, sorteada depois do início) vira linha "Câmbio"
//     no livro (cat. `fx`). Fato `fx_crisis` → selos e atos que dependem do submercado sofrem.
//  3. Inteligência de rivais: espionagem (rivals2) e analista revelam a intenção escondida (rivalmind18 via rivals19)
//     no relatório de mercado (report18). Fato `rival_intel` → carta: pacto, vazar o plano ou ignorar; pacto pode
//     terminar em traição (`pact_betrayal` → carta: processar, retaliar, perdoar).
//  4. Campus × moral da equipe × qualidade × atração de talento (campus18 → lealdade, dimensão técnica, propostas).
//  5. Prestígio × crítica × júri: o júri (awards19/ceremonies8) lê o caminho escolhido (paths18). Fato `jury_nod`.
//  6. (11.10) Obra atrasada vira carta com ecos; investimento destrava bônus de qualidade/descoberta
//     (`campus_invest`); incêndio/desastre vira carta de seguro (`insurance_claim`).
//  7. (11.11) Ofertas de selo ao artista (artist18) pela PA e pelo olho do A&R (`pa_bet`); selos NPC disputam o
//     mesmo jovem que você achou no discover18 (`talent_race`).

import { clamp, hashString, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { subById18, SUBS18, subOfA3_18 } from '../../data/regions18';
import { familyOf, l, type L } from '../../data/world';
import { registerConseq18, type Fx18 } from '../decide18';
import { registerExt4, registerOfferMod, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { histMode, scriptedReal } from '../history15';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { fin18, mIdx18 } from '../ledger18';
import { rng19 } from '../rng19';
import { addHeat19, coolHeat19, heat19, mind18, playbookOf, rm18 } from '../rivals19';
import type { Act, GameState, Label, Release } from '../types';
import { fmtL, money, notify, playerActs, post, staffSkill } from '../util';
import { ab18, ability18 } from './ability18';
import { A18_HOOK19, type Offer18 } from './artist18';
import { ag17, crewById } from './agenda17';
import { CAMPUS19, buildings18, campus18, PROJ18, renoCost18, rushProj18, startProj18, CONTRACTORS18, type Proj18 } from './campus18';
import { GRAMO_ADJ, GRAMO_CATS, NOMS_MONTH, nominees, type GramoCat } from './ceremonies8';
import { dec18 } from './decide18';
import { addLead18, disc18 } from './discover18';
import { fxRate18 } from './econ18';
import { headline19 } from './factlink19';
import { critYear18, pa18, pathScore18 } from './paths18';
import { P } from './people/state';
/** carreira da equipe só se já existir (criar antes da hora mudaria o nível inicial do staff) */
const careerAt = (s: GameState, id: string) => P(s).career[id];
import { DIM18, registerDimAdj18, mine18, dims18, type DimAdj18, type Dim18 } from './quality18';
import { reg18, subName18, subW18 } from './regions18';
import { REP_NOTES19 } from './report18';
import { hbMaxQ18, sess18 } from './session18';
import { spawnProceduralAct } from '../worldgen';
import { cashWhy20, freeCash20 } from '../oblig20';

// ---------------------------------------------------------------- estado

export interface L19B {
  /** lançamentos já marcados pela sessão */
  sm: Record<string, 1>;
  /** crises cambiais sorteadas (história alternativa) e já anunciadas */
  fxr: { sub: string; from: number; to: number; r: number }[];
  fxs: Record<string, number>;
  /** última perda cambial por submercado [ano, mês, valor] */
  fxl: Record<string, [number, number, number]>;
  /** intenções reveladas: selo → semana de início do alvo revelado */
  rv: Record<string, number>;
  /** campus: obras já vistas, último placar */
  cs: Record<string, number>;
  cv: number;
  /** seguro patrimonial */
  ins?: { since: number; prem: number; claims: number };
  /** júri: ano já anunciado; corrida por talento já disparada */
  jy: number;
  race: Record<string, 1>;
  /** apostas de PA nas ofertas do artista: oferta → [PA estimada, olho] */
  bet: Record<string, [number, number]>;
}
declare module '../ext4' { interface Ext4 { l19b: L19B } }
const fresh = (): L19B => ({ sm: {}, fxr: [], fxs: {}, fxl: {}, rv: {}, cs: {}, cv: 0, jy: 0, race: {}, bet: {} });
registerExt4('l19b', fresh);
export function l19b(s: GameState): L19B {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.l19b ??= fresh()) as L19B;
  for (const [k, v] of Object.entries(fresh())) (st as unknown as Record<string, unknown>)[k] ??= v;
  return st;
}
const rng = (s: GameState) => rng19(s, 'l19b', () => Rng.fromSeed(`${s.config.seed}|l19b|${s.week}`));
const mIdx = (s: GameState) => s.year * 12 + s.month;
const $k = (c: number) => `$${Math.round(c / 100).toLocaleString('en-US')}`;

// Tipos de fato novos: registrados em ../factmatrix19.ts (LINKS19B), com produtor e ouvintes.

// ================================================================ 1. sessão × qualidade × CA/PA

/** Dimensão que cada grupo de sessão mexe: seção rítmica → imediatismo (groove), orquestra/coral → emoção, turma de estúdio → técnica. */
const CREW_DIM: Record<string, Dim18> = { wrecking: 'tech', section: 'tech', ateam: 'tech', pros: 'tech', locals: 'tech', funk: 'imm', mgs: 'imm', hi: 'imm', swampers: 'imm', mfsb: 'emo', orch: 'emo', choir: 'emo' };
/** pontos na dimensão por qualidade efetiva (já com o desconto de gênero fora da praia) */
export const sessPts19 = (q: number): number => (q >= 0.72 ? Math.round((q - 0.6) * 22) : q < 0.45 ? -Math.round((0.45 - q) * 22 + 1) : 0);
const relMk = (s: GameState, rel: Release) => mIdx(s) - Math.round((s.week - rel.week) / 4.35);

export function sessAdj19(s: GameState, rel: Release, act: Act): DimAdj18[] {
  const out: DimAdj18[] = [];
  const m = relMk(s, rel);
  for (const x of ag17(s).sess) {
    if (x.actId !== act.id || x.kind === 'backing' || x.start > m || x.until < m - 1) continue;
    const c = crewById(x.crew);
    const v = sessPts19(x.q);
    if (!c || !v) continue;
    const nm = c.name && s.config.realNames ? l(c.name, c.name) : c.alt;
    out.push({ d: CREW_DIM[c.id] ?? 'tech', v, why: fmtL(v > 0 ? l('Músicos de sessão fortes: {n}', 'Strong session players: {n}') : l('Músicos de sessão fracos: {n}', 'Weak session players: {n}'), { n: nm }) });
  }
  const hb = sess18(s).hb;
  if (hb && hb.strike <= s.week && act.owner === 'player' && familyOf(act.genre) === hb.fam) {
    const v = sessPts19(hb.q * (hb.rent ? 0.85 : 1));
    if (v) out.push({ d: 'imm', v, why: fmtL(l('Banda da casa: {n}', 'House band: {n}'), { n: hb.name }) });
  }
  return out;
}
registerDimAdj18('links19b:session', sessAdj19);

// gravar com quem toca muito ensina: experiência de estúdio extra e "mentor" de sessão (ability18)
registerSimHook('record', 'links19b:session', (s, _r, a) => {
  const so = a.song, act = so && s.acts[so.actId];
  if (!so || !act || act.owner !== 'player') return;
  const m = mIdx(s);
  let q = 0;
  for (const x of ag17(s).sess) if (x.actId === act.id && x.kind !== 'backing' && x.start <= m && x.until >= m) q = Math.max(q, x.q);
  const hb = sess18(s).hb;
  if (hb && hb.strike <= s.week && familyOf(act.genre) === hb.fam) q = Math.max(q, hb.q);
  if (q < 0.72) return;
  const st = ab18(s);
  let ca = 0, n = 0;
  for (const pid of act.members) {
    if (!s.persons[pid]?.alive) continue;
    const e = (st.e[pid] ??= [0, 0, 0, 0]);
    e[1] += 0.5; e[3] = Math.max(e[3], Math.round(q * 170));
    ca += ability18(s, `p:${pid}`)?.ca ?? 0; n++;
  }
  // a banda também aprende tocando com gente boa
  if (hb && n && ca / n >= 120) hb.q = clamp(hb.q + 0.003, 0.4, hbMaxQ18(hb));
});

registerExplain('l19b.session', (s, c) => {
  const rel = s.releases[String(c.rel)], act = rel && s.acts[rel.actId];
  if (!rel || !act) return null;
  const adj = sessAdj19(s, rel, act);
  if (!adj.length) return null;
  return { title: l('Músicos de sessão no disco', 'Session players on the record'), value: adj.reduce((t, x) => t + x.v, 0), fmt: 'signed',
    parts: adj.map((x) => ({ label: fmtL(l('{w} → {d}', '{w} → {d}'), { w: x.why, d: DIM18[x.d].name }), value: x.v, fmt: 'signed' as const, tone: x.v > 0 ? 'good' as const : 'bad' as const })),
    note: l('Fortes (qualidade ≥ 0,72) somam na dimensão deles e ensinam o elenco (experiência de estúdio); fracos (< 0,45) puxam para baixo. Fora do gênero, metade.', 'Strong (quality ≥ 0.72) add to their dimension and teach the roster (studio experience); weak (< 0.45) drag it down. Off-genre, half.') };
});
onFact('session_mark', (s, f) => {
  const a = f.actors.map((id) => s.acts[id]).find(Boolean);
  if (!a) return;
  if (f.tags.includes('good')) for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.morale = clamp(p.morale + 2, 0, 100); }
  else a.trust = clamp(a.trust - 1, 0, 100); // "puseram músico barato no nosso disco"
}, 'links19b:session');

function monthSession(s: GameState): void {
  const st = l19b(s);
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    for (const rid of act?.releases ?? []) {
      const rel = s.releases[rid];
      if (!rel || st.sm[rid] || s.week - rel.week > 5 || s.week < rel.week) continue;
      st.sm[rid] = 1;
      const adj = sessAdj19(s, rel, act);
      const v = adj.reduce((t, x) => t + x.v, 0);
      if (Math.abs(v) < 3) continue;
      const best = adj.slice().sort((x, y) => Math.abs(y.v) - Math.abs(x.v))[0];
      emitFact(s, { kind: 'session_mark', actors: [act.id, 'player'], severity: 15 + Math.min(20, Math.abs(v) * 2), visibility: v > 0 ? 'public' : 'rumor', tags: [v > 0 ? 'good' : 'bad', 'session', best.d], src: 'links19b',
        text: fmtL(v > 0 ? l('"{t}", de {a}: {w} levantam {d}.', '"{t}" by {a}: {w} lift its {d}.') : l('"{t}", de {a}: {w} derrubam {d}.', '"{t}" by {a}: {w} drag down its {d}.'), { t: rel.title, a: act.name, w: best.why, d: DIM18[best.d].name }) });
    }
  }
  const ks = Object.keys(st.sm);
  if (ks.length > 200) for (const k of ks.slice(0, ks.length - 120)) delete st.sm[k];
}

// ================================================================ 2. câmbio por submercado

interface FxDef19 { sub: string; from: number; to: number; r: number; why: L }
/** Crises cambiais reais por submercado (as que a tabela por região do econ18 não cobre). */
export const FX19: FxDef19[] = [
  { sub: 'uk', from: 1976, to: 1976, r: 0.08, why: l('crise da libra e socorro do FMI', 'sterling crisis and IMF bailout') },
  { sub: 'uk', from: 1992, to: 1992, r: 0.1, why: l('Quarta-feira Negra: a libra sai do mecanismo europeu', 'Black Wednesday: sterling leaves the ERM') },
  { sub: 'mx', from: 1994, to: 1995, r: 0.25, why: l('crise da tequila: o peso perde metade do valor', 'tequila crisis: the peso loses half its value') },
  { sub: 'east_eu', from: 1990, to: 1993, r: 0.2, why: l('transição pós-comunista e hiperinflação', 'post-communist transition and hyperinflation') },
  { sub: 'east_eu', from: 1998, to: 1998, r: 0.22, why: l('moratória russa: o rublo desaba', 'Russian default: the rouble collapses') },
  { sub: 'br', from: 1999, to: 1999, r: 0.15, why: l('desvalorização do real', 'the real is devalued') },
  { sub: 'br', from: 2015, to: 2016, r: 0.08, why: l('recessão e dólar acima de 4 reais', 'recession and the dollar above 4 reais') },
  { sub: 'cone', from: 2018, to: 2023, r: 0.2, why: l('peso argentino em queda livre', 'Argentine peso in free fall') },
  { sub: 'andes', from: 2013, to: 2021, r: 0.3, why: l('hiperinflação na Venezuela', 'Venezuelan hyperinflation') },
  { sub: 'in', from: 1991, to: 1991, r: 0.12, why: l('crise da balança de pagamentos na Índia', 'Indian balance-of-payments crisis') },
  { sub: 'mena', from: 2018, to: 2023, r: 0.12, why: l('lira turca e libra libanesa despencam', 'Turkish lira and Lebanese pound plunge') },
  { sub: 'west', from: 2016, to: 2016, r: 0.15, why: l('naira desvalorizada na Nigéria', 'Nigerian naira devalued') },
  { sub: 'west', from: 2023, to: 2023, r: 0.2, why: l('naira flutua e perde metade do valor', 'naira floated and loses half its value') },
  { sub: 'south', from: 2001, to: 2001, r: 0.08, why: l('o rand perde um terço do valor', 'the rand loses a third of its value') },
];
const ALT_WHY = l('crise cambial (história alternativa)', 'currency crisis (alternate history)');

export function fxCrises19(s: GameState, y = s.year): { sub: string; r: number; why: L; from: number }[] {
  const out: { sub: string; r: number; why: L; from: number }[] = [];
  for (const c of FX19) if (y >= c.from && y <= c.to && scriptedReal(s, c.from)) out.push(c);
  for (const c of l19b(s).fxr) if (y >= c.from && y <= c.to) out.push({ ...c, why: ALT_WHY });
  // a tabela do econ18 já cobre o mercado inteiro: não cobra duas vezes
  return out.filter((c) => subById18[c.sub] && !fxRate18(subById18[c.sub].mk, y));
}
/** Exposição do mês ao submercado: receita faturada lá (fatia do mercado) + títulos a receber. */
export function fxSub19(s: GameState, sub: string, r: number): { flow: number; ar: number; loss: number } {
  const d = subById18[sub];
  if (!d) return { flow: 0, ar: 0, loss: 0 };
  const f = fin18(s), mi = mIdx18(s);
  const w = subW18(sub, s.year);
  const M = f.m[mi] ?? {}, P = f.m[mi - 1] ?? {};
  const flow = Math.max(0, M[`mk:${d.mk}`] ?? P[`mk:${d.mk}`] ?? 0) * w;
  const ar = f.ar.filter((b) => b.mk === d.mk).reduce((t, b) => t + Math.max(0, b.amt), 0) * w;
  return { flow: Math.round(flow), ar: Math.round(ar), loss: Math.round(r * (0.25 * flow + ar / 12)) };
}
function monthFx(s: GameState): void {
  const st = l19b(s);
  // fora do modo exato, depois do início: crises sorteadas (o mundo é outro)
  if (s.month === 0 && histMode(s) !== 'strict' && s.year >= Math.max(1950, s.config.startYear)) {
    const r = rng(s);
    for (const sub of SUBS18) if (!st.fxr.some((c) => c.sub === sub.id && c.to >= s.year - 4) && r.chance(0.012)) st.fxr.push({ sub: sub.id, from: s.year, to: s.year + r.int(0, 1), r: Math.round(r.float(0.08, 0.25) * 100) / 100 });
    st.fxr = st.fxr.filter((c) => c.to >= s.year - 10);
  }
  for (const c of fxCrises19(s)) {
    const key = `${c.sub}:${c.from}`;
    const ex = fxSub19(s, c.sub, c.r);
    if (!st.fxs[key]) {
      st.fxs[key] = s.year;
      const lbs = Object.values(s.labels).filter((lb) => lb.active && subOfA3_18(countryOfCity(lb.city)) === c.sub).map((x) => x.id);
      const acts = playerActs(s).filter((id) => s.acts[id] && subOfA3_18(countryOfCity(s.acts[id].city)) === c.sub);
      emitFact(s, { kind: 'fx_crisis', actors: [...(ex.flow || ex.ar ? ['player'] : []), ...acts, ...lbs.slice(0, 6)], severity: Math.round(25 + c.r * 100), visibility: 'public', tags: ['fx', 'bad', c.sub], src: 'links19b',
        text: fmtL(l('Crise cambial em {s}: {w}.', 'Currency crisis in {s}: {w}.'), { s: subName18(c.sub), w: c.why }) });
    }
    if (ex.loss >= money(s, 50)) {
      post(s, `fx19:${c.sub}:${mIdx(s)}`, -ex.loss, 'fx', `Câmbio: crise em ${subName18(c.sub).pt}`);
      st.fxl[c.sub] = [s.year, s.month, ex.loss];
    }
  }
}
onFact('fx_crisis', (s, f) => {
  const sub = f.tags.find((t) => subById18[t]);
  for (const id of f.actors) {
    const lb = s.labels[id];
    if (lb) { lb.cash = Math.round(lb.cash * 0.95); continue; } // selo dali: vendas na moeda que derreteu
    const a = s.acts[id];
    if (a) a.momentum = clamp(a.momentum - 3, -100, 100); // fã da terra não compra disco importado
  }
  if (sub) { const g = reg18(s); g.log.unshift({ y: s.year, m: s.month, sub, g: '', d: 0, text: f.text }); if (g.log.length > 60) g.log.length = 60; }
  if (f.severity >= 45) headline19(s, f.text, 2);
}, 'links19b:fx');
registerExplain('fx19.sub', (s, c) => {
  const live = fxCrises19(s);
  const pick = c.sub ? live.filter((x) => x.sub === String(c.sub)) : live;
  if (!pick.length) return null;
  const parts: WhyPart[] = [];
  let tot = 0;
  for (const x of pick) {
    const e = fxSub19(s, x.sub, x.r);
    tot += e.loss;
    parts.push({ label: fmtL(l('{s}: {w} (−{r}%/ano)', '{s}: {w} (−{r}%/yr)'), { s: subName18(x.sub), w: x.why, r: Math.round(x.r * 100) }), value: -e.loss, fmt: 'money', tone: 'bad',
      note: fmtL(l('Receita do mês lá {f}; a receber {a}', 'This month\'s revenue there {f}; receivable {a}'), { f: $k(e.flow), a: $k(e.ar) }) });
  }
  return { title: l('Câmbio por submercado', 'FX by submarket'), value: -tot, fmt: 'money', parts, note: l('Receita é faturada na moeda local: perde 25% da desvalorização no mês e os títulos a receber perdem pelo tempo parado. Quem fatura no submercado em crise paga a conta.', 'Revenue is booked in local currency: it loses 25% of the devaluation within the month and receivables lose by the time they sit. Whoever bills in the crisis submarket pays.') };
});

// ================================================================ 3. inteligência de rivais (rivalmind18 × report18 via rivals19)

const TREACH = new Set(['vulture', 'fund', 'tech']);
/** Chance de o rival trair um pacto (pela cartilha). */
export const treachery19 = (s: GameState, lb: Label): number => (TREACH.has(playbookOf(lb.archetype ? lb : { ...lb })) ? 0.45 : 0.2) + clamp(heat19(s, lb.id) / 400, 0, 0.2);

/** O que você sabe da intenção escondida: espionado nos últimos 6 meses ou analista bom (habilidade 60+). */
export function intelOn19(s: GameState, lbId: string): boolean {
  const w = Number(s.flags[`intel:${lbId}`] ?? -999);
  return s.week - w <= 26 || staffSkill(s, 'analyst') >= 60 && heat19(s, lbId) >= 25;
}
REP_NOTES19.push((s) => {
  const out: L[] = [];
  for (const [id, w0] of Object.entries(l19b(s).rv)) {
    const lb = s.labels[id], m = rm18(s).m[id];
    if (!lb?.active || !m?.target || m.target.until <= s.week || m.target.since !== w0) continue;
    const a = m.target.k === 'act' ? s.acts[m.target.id] : undefined;
    out.push(fmtL(l('Inteligência: {b} mira {t} ({w}).', 'Intelligence: {b} is after {t} ({w}).'), { b: lb.name, t: a ? a.name : m.target.id.replace(/_/g, ' '), w: m.target.why }));
  }
  return out.slice(0, 2);
});
function monthIntel(s: GameState): void {
  const st = l19b(s);
  for (const [id, m] of Object.entries(rm18(s).m)) {
    const lb = s.labels[id];
    if (!lb?.active || !m.target || m.target.until <= s.week || st.rv[id] === m.target.since || !intelOn19(s, id)) continue;
    st.rv[id] = m.target.since;
    const a = m.target.k === 'act' ? s.acts[m.target.id] : undefined;
    emitFact(s, { kind: 'rival_intel', actors: [id, ...(a ? [a.id] : [])], severity: 20, visibility: 'secret', tags: ['rival', 'intel', m.target.k], src: 'links19b',
      text: fmtL(l('Você descobriu: {b} mira {t}.', 'You found out: {b} is after {t}.'), { b: lb.name, t: a ? a.name : m.target.id.replace(/_/g, ' ') }) });
  }
  // pactos: o rival trai quando o calor sobe (decisão: processar, retaliar, perdoar)
  const r = rng(s);
  for (const [id, m] of Object.entries(rm18(s).m)) {
    const lb = s.labels[id];
    if (!lb?.active || !m.pact || m.pact.until <= s.week || heat19(s, id) < 35) continue;
    if (!r.chance(0.02 * treachery19(s, lb) / 0.3)) continue;
    betray19(s, lb);
  }
}
/** O rival rompe o pacto: mira o seu artista mais importante e leva clientes. */
export function betray19(s: GameState, lb: Label): void {
  const m = mind18(s, lb.id);
  if (!m.pact) return;
  m.pact = undefined;
  const top = playerActs(s).map((id) => s.acts[id]).filter(Boolean).sort((x, y) => y.fame - x.fame)[0];
  if (top) m.target = { k: 'act', id: top.id, since: s.week, until: s.week + 52, why: l('rompeu o pacto e foi direto ao seu artista', 'broke the pact and went straight for your act') };
  emitFact(s, { kind: 'pact_betrayal', actors: [lb.id, 'player', ...(top ? [top.id] : [])], severity: 45, visibility: 'public', tags: ['rival', 'bad', 'betrayal'], src: 'links19b',
    text: fmtL(l('{b} rompe o pacto com {c} e corteja {a}.', '{b} breaks its pact with {c} and courts {a}.'), { b: lb.name, c: s.config.companyName, a: top?.name ?? '—' }) });
}
onFact('rival_intel', (s, f) => {
  const lb = s.labels[f.actors[0]];
  if (!lb || s.config.role === 'artist') return;
  const a = s.acts[f.actors[1] ?? ''];
  pushInbox18(s, 'l19b_intel', { from: l('Inteligência de mercado', 'Market intelligence').pt, tone: 'info', ref: { lb: lb.id, ...(a ? { act: a.id } : {}) }, weeks: 6,
    subject: fmtL(l('{b} quer {t}', '{b} wants {t}'), { b: lb.name, t: a ? a.name : l('o seu espaço', 'your space') }),
    body: fmtL(l('{t} Pacto de não agressão: o alvo sai da mira, com uma taxa de distribuição cruzada (pode ser traído). Vazar o plano: a imprensa expõe o rival, ele desiste, mas a rixa esquenta.', '{t} Non-aggression pact: the target is dropped, with a cross-distribution fee (may be betrayed). Leaking the plan: the press exposes the rival and they back off, but the feud heats up.'), { t: f.text }),
    actions: [{ id: 'pact', label: l('Propor pacto', 'Propose a pact') }, { id: 'leak', label: l('Vazar o plano', 'Leak the plan') }, { id: 'ignore', label: l('Só observar', 'Just watch') }] });
}, 'links19b:intel');
onFact('pact_betrayal', (s, f) => {
  const lb = s.labels[f.actors[0]];
  if (!lb) return;
  addHeat19(s, lb.id, 15, 100);
  if (s.config.role === 'artist') return;
  pushInbox18(s, 'l19b_betray', { from: lb.name, tone: 'bad', ref: { lb: lb.id, ...(f.actors[2] ? { act: f.actors[2] } : {}) }, weeks: 6,
    subject: fmtL(l('Traição: {b} rompeu o pacto', 'Betrayal: {b} broke the pact'), { b: lb.name }), body: f.text,
    actions: [{ id: 'sue', label: l('Processar pelo contrato', 'Sue over the contract') }, { id: 'hit', label: l('Retaliar (roubar um artista deles)', 'Retaliate (poach one of theirs)') }, { id: 'forgive', label: l('Deixar passar', 'Let it go') }] });
}, 'links19b:betray');
registerInboxKind('l19b_intel', { label: l('Inteligência', 'Intelligence'), cat: 'decision', icon: 'eye', prio: 2, goto: () => ({ area: 'labels' }),
  handle: (s, m, act) => {
    const lb = s.labels[String(m.ref?.lb ?? '')];
    if (!lb?.active) return l('O selo já não existe.', 'The label is gone.');
    const md = mind18(s, lb.id);
    if (act === 'pact') {
      const fee = money(s, 6000);
      post(s, `l19b:pact:${lb.id}:${s.week}`, -fee, 'distribution', `Pacto com ${lb.name}`);
      md.target = undefined;
      md.pact = { since: s.week, until: s.week + 104, disputes: 0, riv: heat19(s, lb.id) };
      coolHeat19(s, lb.id, 10);
      return fmtL(l('Pacto com {b}: o alvo sai da mira por 2 anos (taxa mensal de distribuição cruzada).', 'Pact with {b}: the target is off for 2 years (monthly cross-distribution fee).'), { b: lb.name });
    }
    if (act === 'leak') {
      md.target = undefined;
      addHeat19(s, lb.id, 15, 100);
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
      headline19(s, fmtL(l('Vazou: {b} planejava tomar artistas de {c}.', 'Leaked: {b} planned to take {c}\'s acts.'), { b: lb.name, c: s.config.companyName }), 2);
      return l('O plano saiu nos jornais: o rival recua, mas agora é guerra aberta.', 'The plan hit the papers: the rival backs off, but now it is open war.');
    }
    return l('Você guarda a informação e observa.', 'You keep the information and watch.');
  } });
registerInboxKind('l19b_betray', { label: l('Traição', 'Betrayal'), cat: 'decision', icon: 'swords', prio: 2, goto: () => ({ area: 'labels' }),
  handle: (s, m, act) => {
    const lb = s.labels[String(m.ref?.lb ?? '')];
    if (!lb) return l('O selo já não existe.', 'The label is gone.');
    if (act === 'sue') { post(s, `l19b:sue:${lb.id}:${s.week}`, -money(s, 8000), 'legal', `Processo contra ${lb.name}`); return l('Advogados contratados: a sentença sai em alguns meses.', 'Lawyers hired: the ruling comes in a few months.'); }
    if (act === 'hit') {
      const tgt = Object.values(s.acts).filter((a) => a.owner === lb.id && a.status !== 'retired' && a.status !== 'split').sort((x, y) => y.fame - x.fame)[0];
      addHeat19(s, lb.id, 10, 100);
      if (tgt) { tgt.trust = clamp(tgt.trust - 10, 0, 100); return fmtL(l('Você corteja {a}, de {b}: a confiança dele no selo cai.', 'You court {a}, from {b}: their trust in the label drops.'), { a: tgt.name, b: lb.name }); }
      return l('Retaliação anunciada — o mercado assiste.', 'Retaliation announced — the market watches.');
    }
    coolHeat19(s, lb.id, 10);
    s.player.reputation.artists = clamp(s.player.reputation.artists + 1, 0, 100);
    return l('Você deixa passar: parece maior que a briga.', 'You let it go: you look bigger than the fight.');
  } });
const lbOf = (f: Fx18): Label | undefined => f.s.labels[String(f.c.lb ?? '')];
registerConseq18('ib:l19b_intel:pact', { now: l('Alvo fora da mira; taxa mensal.', 'Target dropped; monthly fee.'), later: [{ in: [6, 18], p: (s, c) => { const lb = s.labels[String(c.lb)]; return lb ? treachery19(s, lb) : 0; }, tone: 'bad', hint: l('Pacto com rival dura enquanto convém a ele.', 'A pact with a rival lasts while it suits them.'),
  when: (s, c) => !!rm18(s).m[String(c.lb)]?.pact && !!s.labels[String(c.lb)]?.active,
  fx: (f) => { const lb = lbOf(f)!; betray19(f.s, lb); return fmtL(l('{b} rompeu o pacto que você propôs.', '{b} broke the pact you proposed.'), { b: lb.name }); } }] });
registerConseq18('ib:l19b_intel:leak', { later: [{ in: [2, 8], p: 0.45, tone: 'mixed', hint: l('A imprensa lembra quem vazou.', 'The press remembers who leaked.'),
  fx: (f) => { const lb = lbOf(f); if (lb) addHeat19(f.s, lb.id, 5, 100); f.rep('commercial', 1).rep('institutional', -1); return fmtL(l('{b} devolve com boatos sobre você; o mercado admira sua firmeza.', '{b} hits back with rumors about you; the market admires your nerve.'), { b: lb?.name ?? '?' }); } }] });
registerConseq18('ib:l19b_betray:sue', { later: [{ in: [3, 9], p: 0.55, tone: 'good', hint: l('A sentença pode sair a seu favor.', 'The ruling may go your way.'),
  fx: (f) => { const lb = lbOf(f); if (lb) lb.cash -= money(f.s, 30000); f.cash(30000, 'Indenização por quebra de pacto', 'other_income'); return fmtL(l('Justiça condena {b} a indenizar você.', 'Court orders {b} to compensate you.'), { b: lb?.name ?? '?' }); },
  miss: (f) => { f.cash(-4000, 'Custas do processo perdido', 'legal'); return l('Você perdeu o processo: o pacto era vago demais.', 'You lost the case: the pact was too vague.'); } }] });
registerConseq18('ib:l19b_betray:hit', { later: [{ in: [2, 6], p: 0.5, tone: 'mixed', hint: l('Guerra de selos tem baixas dos dois lados.', 'Label wars have casualties on both sides.'),
  fx: (f) => { const lb = lbOf(f); if (lb) addHeat19(f.s, lb.id, 10, 100); f.rep('artists', -1).momentum(3); return l('A retaliação vira manchete: seu elenco ganha embalo, artistas desconfiam do clima.', 'The retaliation makes headlines: your roster gains momentum, artists distrust the climate.'); } }] });
registerConseq18('ib:l19b_betray:forgive', { later: [{ in: [6, 14], p: 0.4, tone: 'good', hint: l('Quem perdoa às vezes ganha um devedor.', 'Forgiveness sometimes earns a debtor.'),
  fx: (f) => { const lb = lbOf(f); if (lb) coolHeat19(f.s, lb.id, 15); f.rep('institutional', 2); return fmtL(l('{b} reconhece em público que errou com você.', '{b} admits in public it wronged you.'), { b: lb?.name ?? '?' }); } }] });
registerExplain('l19b.intel', (s, c) => {
  const lb = s.labels[String(c.lb)];
  if (!lb) return null;
  const w = Number(s.flags[`intel:${lb.id}`] ?? -999);
  return { title: fmtL(l('O que você sabe de {b}', 'What you know about {b}'), { b: lb.name }), value: intelOn19(s, lb.id) ? 1 : 0, fmt: 'num', parts: [
    { label: l('Espionagem nos últimos 6 meses', 'Espionage in the last 6 months'), value: s.week - w <= 26 ? 1 : 0, fmt: 'num' },
    { label: l('Habilidade do analista (60+ lê rivais tensos)', 'Analyst skill (60+ reads tense rivals)'), value: staffSkill(s, 'analyst'), fmt: 'num' },
    { label: l('Calor da rivalidade', 'Rivalry heat'), value: heat19(s, lb.id), fmt: 'num' },
    { label: l('Chance de trair um pacto', 'Chance of betraying a pact'), value: treachery19(s, lb), fmt: 'pct', tone: 'bad' }],
    note: l('Sinais públicos mostram só o que o rival deixa ver; espionagem e analista revelam o alvo escondido no relatório de mercado.', 'Public signs show only what the rival lets you see; espionage and an analyst reveal the hidden target in the market report.') };
});

// ================================================================ 4. campus × moral × qualidade × talento

/** Placar do campus: obras prontas, prédios reformados, sede; dano pesa. */
export function campusScore19(s: GameState): { v: number; why: [L, number][] } {
  const c = campus18(s), why: [L, number][] = [];
  for (const k of ['store', 'sign', 'dorm', 'park'] as const) if (c.built[k]) why.push([PROJ18[k].name, k === 'dorm' ? 2 : 1]);
  const ren = Object.values(c.ren).filter((y) => s.year - y <= 12).length;
  if (ren) why.push([l('Prédios reformados (12 anos)', 'Renovated buildings (12 years)'), Math.min(3, ren)]);
  if (s.player.hq >= 3) why.push([l('Sede grande', 'Large HQ'), 1]);
  const dmg = Object.keys(c.dmg).length;
  if (dmg) why.push([l('Prédio danificado', 'Damaged building'), -3 * dmg]);
  return { v: why.reduce((t, x) => t + x[1], 0), why };
}
const unl = (s: GameState, k: string, years: number): boolean => { const w = dec18(s).unl[k]; return w !== undefined && s.week - w <= years * 52; };
registerDimAdj18('links19b:campus', (s, rel) => {
  if (!mine18(s, rel)) return [];
  const out: DimAdj18[] = [];
  const c = campusScore19(s).v;
  if (c >= 3) out.push({ d: 'tech', v: Math.min(3, c - 2), why: l('Estrutura do campus (salas, equipe descansada)', 'Campus facilities (rooms, rested team)') });
  else if (c < 0) out.push({ d: 'tech', v: -2, why: l('Gravando em espaço provisório (prédio danificado)', 'Recording in temporary space (damaged building)') });
  if (unl(s, 'campus19:studio', 6)) { out.push({ d: 'tech', v: 2, why: l('Estúdio reformado: som melhor', 'Renovated studio: better sound') }); out.push({ d: 'emo', v: 1, why: l('Estúdio reformado: ambiente que inspira', 'Renovated studio: an inspiring room') }); }
  return out;
});
registerOfferMod('links19b:campus', (s, act) => {
  if (act.owner === 'player') return null;
  const v = campusScore19(s).v;
  if (v >= 3) return { delta: Math.min(0.04, v * 0.008), reason: fmtL(l('Gostou do campus do selo (placar {v}).', 'Liked the label\'s campus (score {v}).'), { v }) };
  if (v < 0) return { delta: Math.max(-0.05, v * 0.01), reason: l('Viu a sede danificada: dúvida se o selo aguenta.', 'Saw the damaged HQ: doubts the label can cope.') };
  return null;
});
function monthCampus(s: GameState): void {
  const st = l19b(s), c = campus18(s);
  const { v } = campusScore19(s);
  // moral da equipe acompanha o lugar de trabalho (só quando há algo a sentir)
  if (v) for (const m of s.player.staff) {
    const cr = careerAt(s, m.id), tgt = clamp(55 + v * 4, 30, 85);
    if (!cr) continue;
    if (v > 0 && cr.loyalty < tgt) cr.loyalty = clamp(cr.loyalty + 0.5, 0, 100);
    else if (v < 0 && cr.loyalty > tgt) cr.loyalty = clamp(cr.loyalty - 0.5, 0, 100);
  }
  st.cv = v;
  // investimento entregue → fato (o ouvinte destrava o bônus)
  // 1º mês: só registra o que já existia (prédios do início não contam como investimento novo)
  const first = !st.cs._i;
  st.cs._i = 1;
  const seen = (k: string, y: number) => { if (st.cs[k] === y) return true; st.cs[k] = y; return first; };
  for (const [k, b] of Object.entries(c.built)) if (b && !seen(`b:${k}`, b.y) && (k === 'dorm' || k === 'park'))
    emitFact(s, { kind: 'campus_invest', actors: ['player'], place: s.config.homeCity, severity: 20, visibility: 'public', tags: ['good', 'campus', 'scout'], src: 'links19b', text: fmtL(l('{c} abre {n}: artistas jovens passam a aparecer.', '{c} opens {n}: young artists start dropping by.'), { c: s.config.companyName, n: PROJ18[k as 'dorm'].name }) });
  for (const [id, y] of Object.entries(c.ren)) if (!seen(`r:${id}`, y) && (id === 'hq' || id.startsWith('v:')))
    emitFact(s, { kind: 'campus_invest', actors: ['player'], place: s.config.homeCity, severity: 20, visibility: 'public', tags: ['good', 'campus', 'studio'], src: 'links19b', text: fmtL(l('{c} reforma o prédio e o estúdio: som novo.', '{c} renovates the building and studio: a new sound.'), { c: s.config.companyName }) });
  // bônus de descoberta: casa dos artistas/praça trazem um jovem da cidade por trimestre
  if (unl(s, 'campus19:scout', 8) && s.month % 3 === 1 && s.config.role !== 'artist') {
    const r = rng(s);
    if (r.chance(0.5)) {
      const a = spawnProceduralAct(s, r, { city: s.config.homeCity });
      a.potential = clamp(a.potential + 5, 0, 99);
      addLead18(s, r, a, 'referral', 2, 8, l('Apareceu no campus (casa dos artistas / praça dos fãs).', 'Showed up at the campus (artists\' house / fan plaza).'));
      notify(s, fmtL(l('{a} apareceu no campus pedindo uma chance — está na sua lista de descobertas.', '{a} showed up at the campus asking for a shot — now on your discovery list.'), { a: a.name }), 'info');
    }
  }
}
onFact('campus_invest', (s, f) => {
  const k = f.tags.includes('studio') ? 'campus19:studio' : 'campus19:scout';
  dec18(s).unl[k] = s.week;
  for (const m of s.player.staff) { const cr = careerAt(s, m.id); if (cr) cr.loyalty = clamp(cr.loyalty + 3, 0, 100); }
}, 'links19b:campus');
registerExplain('l19b.campus', (s) => {
  const c = campusScore19(s);
  return { title: l('Campus: moral, qualidade e atração', 'Campus: morale, quality and attraction'), value: c.v, fmt: 'num', parts: c.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const, tone: value > 0 ? 'good' as const : 'bad' as const })),
    note: l('Placar 3+: técnica do disco +1 a +3, propostas a artistas mais aceitas, lealdade da equipe sobe até 55+4×placar. Dano: espaço provisório, técnica −2, lealdade cai. Reforma de estúdio destrava som melhor por 6 anos; casa dos artistas/praça trazem jovens.', 'Score 3+: record technique +1 to +3, offers to acts more accepted, staff loyalty rises up to 55+4×score. Damage: temporary space, technique −2, loyalty falls. A studio renovation unlocks better sound for 6 years; artists\' house/fan plaza bring young talent.') };
});

// ================================================================ 6. (11.10) obras e seguro como decisões

CAMPUS19.delay = (s, p, why) => {
  pushInbox18(s, 'l19b_delay', { from: CONTRACTORS18[p.q].name.pt, tone: 'bad', ref: { proj: p.id }, weeks: 4,
    subject: l('Obra atrasada: o que fazer?', 'Works delayed: what now?'),
    body: fmtL(l('{w}. Faltam {m} meses. Hora extra recupera 1 mês por {v} (pressa no canteiro arrisca acidente). Trocar por uma construtora melhor custa 10% do que falta e corta 1 mês. Aceitar: segue o ritmo (a vizinhança pode reclamar).', '{w}. {m} months left. Overtime recovers 1 month for {v} (a rushed site risks accidents). Switching to a better builder costs 10% of the remainder and cuts 1 month. Accepting: same pace (neighbours may complain).'),
      { w: why, m: p.left, v: $k(Math.round(p.cost * 0.12)) }),
    actions: [{ id: 'rush', label: l('Pagar hora extra', 'Pay overtime') }, ...(p.q < 2 ? [{ id: 'swap', label: l('Trocar de construtora', 'Switch builder') }] : []), { id: 'accept', label: l('Aceitar o atraso', 'Accept the delay') }] });
  return true;
};
/** Troca de construtora: paga 10% do que falta, sobe um nível, corta 1 mês. */
export function swapBuilder19(s: GameState, p: Proj18): L | null {
  if (p.q >= 2) return l('Já é a melhor construtora.', 'Already the best builder.');
  const rest = Math.max(0, p.cost + p.over - p.paid);
  const fee = Math.round(rest * 0.1);
  if (freeCash20(s) < fee) return cashWhy20(s, fee, l('Caixa insuficiente.', 'Not enough cash.'));
  post(s, `campus18:${p.id}:swap`, -fee, 'capex', 'Obra: troca de construtora');
  p.paid += fee;
  p.cost += Math.round(rest * (CONTRACTORS18[p.q + 1].cost / CONTRACTORS18[p.q].cost - 1));
  p.q += 1; p.left = Math.max(1, p.left - 1);
  return null;
}
registerInboxKind('l19b_delay', { label: l('Obras', 'Construction'), cat: 'decision', icon: 'building', prio: 2, goto: () => ({ area: 'campus18', label: l('Ver no mapa', 'See on the map') }),
  handle: (s, m, act) => {
    const p = campus18(s).proj.find((x) => x.id === String(m.ref?.proj ?? ''));
    if (!p) return l('A obra já terminou.', 'The works are done.');
    if (act === 'rush') return rushProj18(s, p.id) ?? l('Hora extra paga: um mês a menos.', 'Overtime paid: one month less.');
    if (act === 'swap') return swapBuilder19(s, p) ?? fmtL(l('Nova construtora no canteiro: {c}.', 'New builder on site: {c}.'), { c: CONTRACTORS18[p.q].name });
    return l('A obra segue no ritmo do empreiteiro.', 'The works go on at the contractor\'s pace.');
  } });
const projLive = (s: GameState, c: Record<string, string | number>) => campus18(s).proj.some((x) => x.id === String(c.proj));
registerConseq18('ib:l19b_delay:rush', { now: l('−1 mês de obra.', '−1 month of works.'), later: [{ in: [1, 3], p: 0.25, tone: 'bad', hint: l('Pressa no canteiro tem preço.', 'A rushed site has a price.'), when: projLive,
  fx: (f) => { f.cash(-3000, 'Acidente de obra: indenização', 'capex').rep('institutional', -1); return l('Acidente no canteiro: um operário ferido, fiscalização e indenização.', 'Accident on site: an injured worker, inspectors and compensation.'); } }] });
registerConseq18('ib:l19b_delay:swap', { later: [{ in: [2, 6], p: 0.5, tone: 'good', hint: l('Construtora nova costuma caprichar para ganhar o cliente.', 'A new builder usually goes the extra mile to win you over.'),
  fx: (f) => { dec18(f.s).unl['campus19:studio'] = f.s.week; return l('A construtora nova caprichou na acústica: o estúdio soa melhor.', 'The new builder nailed the acoustics: the studio sounds better.'); } }] });
registerConseq18('ib:l19b_delay:accept', { later: [{ in: [2, 6], p: 0.35, tone: 'bad', hint: l('Obra parada incomoda a vizinhança.', 'Stalled works annoy the neighbours.'), when: projLive,
  fx: (f) => { f.cash(-1200, 'Multa da prefeitura (obra parada)', 'misc').rep('institutional', -1); return l('Vizinhos reclamam do canteiro parado: a prefeitura multa.', 'Neighbours complain about the stalled site: the city fines you.'); } }] });

/** Seguro patrimonial (incêndio, enchente, tumulto). Prêmio mensal pelo tamanho da sede. */
export const insPrem19 = (s: GameState): number => money(s, 120 + s.player.hq * 90) * (1 + 0.3 * (l19b(s).ins?.claims ?? 0));
export function buyIns19(s: GameState, on = true): L | null {
  const st = l19b(s);
  if (!on) { st.ins = undefined; return null; }
  if (s.year < 1900) return l('Ainda não há seguradoras para isso.', 'No insurers for this yet.');
  st.ins = { since: s.week, prem: insPrem19(s), claims: st.ins?.claims ?? 0 };
  return null;
}
CAMPUS19.dmg = (s, f, target) => {
  const st = l19b(s), arson = f.tags.includes('crime') || f.tags.includes('arson') || f.src === 'crime17';
  pushInbox18(s, 'l19b_ins', { from: st.ins ? 'Seguradora' : 'Defesa civil', tone: 'bad', ref: { b: target, ars: arson ? 1 : 0 }, weeks: 6,
    subject: l('Prédio danificado: e agora?', 'Building damaged: now what?'),
    body: fmtL(st.ins ? l('{t} Você tem seguro: a indenização cobre 75% da reforma (o prêmio sobe). Reconstruir já com a construtora premium sai caro, mas pode render um prédio melhor. Esperar: aluguel provisório todo mês.', '{t} You are insured: the payout covers 75% of the renovation (the premium rises). Rebuilding now with the premium builder is pricey but may yield a better building. Waiting: temporary rent every month.')
      : l('{t} Sem seguro. Reconstruir já com a construtora premium sai caro, mas pode render um prédio melhor. Esperar: aluguel provisório todo mês.', '{t} Uninsured. Rebuilding now with the premium builder is pricey but may yield a better building. Waiting: temporary rent every month.'), { t: f.text }),
    actions: [...(st.ins ? [{ id: 'claim', label: l('Acionar o seguro', 'Claim insurance') }] : []), { id: 'rebuild', label: l('Reconstruir já', 'Rebuild now') }, { id: 'wait', label: l('Esperar', 'Wait') }] });
  return true;
};
registerInboxKind('l19b_ins', { label: l('Seguro', 'Insurance'), cat: 'decision', icon: 'shield', prio: 2, goto: () => ({ area: 'campus18', label: l('Ver no mapa', 'See on the map') }),
  handle: (s, m, act) => {
    const st = l19b(s), id = String(m.ref?.b ?? '');
    if (!campus18(s).dmg[id]) return l('O prédio já foi reformado.', 'The building was already renovated.');
    const b = buildings18(s).find((x) => x.id === id);
    if (act === 'claim' && st.ins && b) {
      const pay = Math.round(renoCost18(s, b) * 0.75);
      post(s, `l19b:ins:${id}:${s.week}`, pay, 'other_income', 'Seguro: indenização do prédio');
      st.ins.claims += 1; st.ins.prem = insPrem19(s);
      emitFact(s, { kind: 'insurance_claim', actors: ['player'], place: s.config.homeCity, severity: 20, visibility: 'rumor', tags: [m.ref?.ars ? 'arson' : 'accident', 'campus'], src: 'links19b', text: fmtL(l('Seguradora paga {v} a {c} pelo prédio danificado.', 'Insurer pays {c} {v} for the damaged building.'), { v: $k(pay), c: s.config.companyName }) });
      const e = startProj18(s, 'reno', -1, 1, id);
      return e ? fmtL(l('Indenização de {v} recebida. A reforma não começou: {e}', '{v} payout received. The renovation did not start: {e}'), { v: $k(pay), e }) : fmtL(l('Indenização de {v}; reforma iniciada com a construtora padrão.', '{v} payout; renovation started with the standard builder.'), { v: $k(pay) });
    }
    if (act === 'rebuild') return startProj18(s, 'reno', -1, 2, id) ?? l('Reconstrução iniciada com a construtora premium.', 'Rebuild started with the premium builder.');
    return l('O prédio fica como está; o aluguel provisório continua.', 'The building stays as is; the temporary rent goes on.');
  } });
registerConseq18('ib:l19b_ins:claim', { later: [{ in: [2, 6], p: (_s, c) => (Number(c.ars) ? 0.5 : 0.12), tone: 'bad', hint: l('A seguradora pode mandar um perito.', 'The insurer may send an adjuster.'),
  fx: (f) => { f.cash(-6000, 'Seguro: indenização revista pelo perito', 'other_income'); return l('O perito da seguradora contesta parte da indenização e pede o dinheiro de volta.', 'The insurer\'s adjuster disputes part of the payout and claws money back.'); } }] });
registerConseq18('ib:l19b_ins:rebuild', { later: [{ in: [4, 10], p: 0.5, tone: 'good', hint: l('Reconstruir do zero pode sair melhor que o original.', 'Rebuilding from scratch may beat the original.'),
  fx: (f) => { dec18(f.s).unl['campus19:studio'] = f.s.week; f.rep('institutional', 1); return l('O prédio reconstruído ficou melhor que o antigo: acústica nova e equipe orgulhosa.', 'The rebuilt building beats the old one: new acoustics and a proud team.'); } }] });
registerConseq18('ib:l19b_ins:wait', { later: [{ in: [3, 9], p: 0.4, tone: 'bad', hint: l('Prédio fechado chama atenção.', 'A shut building draws attention.'), when: (s, c) => !!campus18(s).dmg[String(c.b)],
  fx: (f) => { f.cash(-2000, 'Invasão e segurança do prédio danificado', 'misc').rep('institutional', -1); return l('O prédio danificado foi invadido: segurança extra e a imprensa local de olho.', 'The damaged building was broken into: extra security and the local press watching.'); } }] });
onFact('insurance_claim', (s) => {
  const ins = l19b(s).ins;
  if (ins && ins.claims >= 2) { ins.prem = Math.round(ins.prem * 1.1); notify(s, l('A seguradora reajusta o seu prêmio: cliente com muitos sinistros.', 'The insurer raises your premium: a client with many claims.'), 'bad'); }
}, 'links19b:ins');
registerAdvisorTip('links19b', (s) => {
  const c = campus18(s);
  if (s.config.role === 'artist' || l19b(s).ins || s.year < 1900 || s.player.hq < 2 || !(c.proj.length || Object.keys(c.built).length)) return [];
  return [{ id: 'l19b-ins', level: 'info', cat: 'cash', score: 30, text: l('O campus não tem seguro patrimonial.', 'The campus has no property insurance.'),
    why: [l('Incêndio, enchente ou tumulto: sem seguro, a reforma sai toda do caixa.', 'Fire, flood or riot: uninsured, the whole renovation comes out of cash.')],
    effect: fmtL(l('Prêmio de {v}/mês; cobre 75% da reforma.', '{v}/month premium; covers 75% of the renovation.'), { v: $k(insPrem19(s)) }),
    run: { label: l('Contratar seguro', 'Buy insurance'), fn: (s2) => buyIns19(s2) ?? l('Seguro contratado.', 'Insurance bought.') } }];
});

// ================================================================ 5. prestígio × crítica × júri

/** O júri lê o caminho que o selo escolheu (paths18) e a crítica do disco. */
export function pathJury19(s: GameState, rel: Release, cat?: string): { v: number; why: [L, number][] } {
  const why: [L, number][] = [];
  if (!mine18(s, rel)) return { v: 0, why };
  const path = pa18(s).chosen; // o júri lê o caminho que você ESCOLHEU (não o detectado)
  if (!path) return { v: 0, why };
  const crit = (rel.criticN ?? 0) > 0 && rel.critic !== undefined ? rel.critic - critYear18(s, rel.year).avg : 0;
  if (path === 'prestige') {
    const sc = pathScore18(s, 'prestige').score;
    if (sc >= 20) why.push([l('Selo cult de prestígio: o júri conhece a grife', 'Cult prestige label: the jury knows the brand'), Math.min(4, Math.round(sc / 20))]);
    if (crit > 0) why.push([l('Crítica acima da média do ano', 'Reviews above the year\'s average'), Math.min(3, Math.round(crit / 4))]);
  } else if (path === 'indie' && crit > 0) why.push([l('Independente íntegro com boa crítica', 'Principled indie with good reviews'), 2]);
  else if (path === 'major') {
    if (crit < 0) why.push([l('Selo de paradas: o júri desconfia de quem só pensa em vender', 'Chart label: the jury distrusts those who only chase sales'), -3]);
    else if (cat === 'record') why.push([l('Hit de rádio de uma grande gravadora', 'A major\'s radio hit'), 1]);
  } else if (path === 'artist' && (cat === 'newcomer' || cat === 'performance')) why.push([l('Artista com autonomia: o júri gosta de voz própria', 'Artist with autonomy: the jury likes an own voice'), 2]);
  else if (path === 'studio') { const d = dims18(s, rel); if (d && d.tech >= 70) why.push([l('Estúdio especializado: técnica impecável', 'Specialist studio: flawless technique'), 2]); }
  return { v: clamp(why.reduce((t, x) => t + x[1], 0), -6, 6), why };
}
GRAMO_ADJ.push((s, relId, cat) => { const rel = s.releases[relId]; return rel ? pathJury19(s, rel, cat).v : 0; });
registerExplain('l19b.jury', (s, c) => {
  const rel = s.releases[String(c.rel)];
  if (!rel) return null;
  const j = pathJury19(s, rel, c.cat ? String(c.cat) : undefined);
  if (!j.why.length) return null;
  return { title: l('O júri leu o seu caminho', 'The jury read your path'), value: j.v, fmt: 'signed', parts: j.why.map(([label, value]) => ({ label, value, fmt: 'signed' as const, tone: value > 0 ? 'good' as const : 'bad' as const })),
    note: l('Pontos de indicação/vitória pelo caminho escolhido (Caminhos) e pela crítica do disco comparada à média do ano. Teto ±6.', 'Nomination/win points from the chosen path (Paths) and the record\'s reviews versus the year\'s average. Cap ±6.') };
});
function monthJury(s: GameState): void {
  const st = l19b(s);
  if (s.month !== NOMS_MONTH || st.jy === s.year) return;
  for (const c of GRAMO_CATS) {
    const ids = nominees(s, c.id as GramoCat) ?? [];
    for (const id of ids) {
      const rel = s.releases[id];
      if (!rel || !mine18(s, rel) || pathJury19(s, rel, c.id).v < 3) continue;
      st.jy = s.year;
      emitFact(s, { kind: 'jury_nod', actors: [rel.actId, 'player'], severity: 35, visibility: 'public', tags: ['good', 'awards', pa18(s).chosen ?? ''], src: 'links19b',
        text: fmtL(l('Júri indica "{t}" ({c}): o caminho de {s} pesou na votação.', 'Jury nominates "{t}" ({c}): {s}\'s path weighed in the vote.'), { t: rel.title, c: c.name, s: s.config.companyName }) });
      return;
    }
  }
}
onFact('jury_nod', (s, f) => {
  s.player.reputation.artistic = clamp(s.player.reputation.artistic + 1, 0, 100);
  headline19(s, f.text, 2);
}, 'links19b:jury');

// ================================================================ 7. (11.11) PA nas ofertas e corrida pelo jovem

/** Olho do A&R do selo NPC (0..1): fixo por selo, maior em quem desenvolve talento. */
export function labelEye19(s: GameState, lb: Label): number {
  const h = hashString(`${s.config.seed}|eye19|${lb.id}`) / 4294967296;
  return clamp(0.3 + h * 0.4 + (lb.strategy === 'develop' ? 0.18 : 0) + (lb.family === 'A' ? 0.05 : 0), 0.2, 0.95);
}
/** PA média verdadeira do ato e a que o selo enxerga (olho ruim puxa para a média de 100). */
export function paSeen19(s: GameState, lb: Label, a: Act): { pa: number; ca: number; seen: number; eye: number } {
  let pa = 0, ca = 0, n = 0;
  for (const id of a.members) { const x = ability18(s, `p:${id}`); if (x) { pa += x.pa; ca += x.ca; n++; } }
  pa = n ? pa / n : 90; ca = n ? ca / n : 80;
  const eye = labelEye19(s, lb);
  return { pa: Math.round(pa), ca: Math.round(ca), seen: Math.round(pa * eye + 100 * (1 - eye)), eye };
}
A18_HOOK19.dev = (s, lb, a) => {
  const x = paSeen19(s, lb, a);
  const room = clamp((x.seen - x.ca) / 60, 0, 1);
  return lb.strategy === 'develop' ? 0.25 + 0.2 * room : x.eye >= 0.55 && room >= 0.4 ? 0.12 : 0;
};
A18_HOOK19.adj = (s, o: Offer18) => {
  if (o.k !== 'record' && o.k !== 'dev') return;
  const lb = s.labels[o.lb], a = Object.values(s.acts).find((x) => x.playerBand);
  if (!lb || !a) return;
  const x = paSeen19(s, lb, a);
  const f = clamp(1 + (x.seen - 100) / 250, 0.85, 1.3);
  if (o.k === 'record') o.adv = Math.round(o.adv * f / 100) * 100;
  else o.stip = Math.round((o.stip ?? 0) * f / 100) * 100;
  l19b(s).bet[o.id] = [x.seen, Math.round(x.eye * 100) / 100];
  if (f >= 1.12) {
    o.why = [...o.why, fmtL(l('o selo apostou no seu potencial {p}', 'the label bet on your potential {p}'), { p: x.seen })];
    emitFact(s, { kind: 'pa_bet', actors: [a.id, lb.id], severity: 18, visibility: 'rumor', tags: ['good', 'artist18', 'potential'], src: 'links19b', text: fmtL(l('{b} aposta no potencial de {a}.', '{b} bets on {a}\'s potential.'), { b: lb.name, a: a.name }) });
  } else if (f <= 0.92) o.why = [...o.why, fmtL(l('o A&R deles não viu muito potencial ({p})', 'their A&R did not see much potential ({p})'), { p: x.seen })];
  const ks = Object.keys(l19b(s).bet);
  if (ks.length > 40) delete l19b(s).bet[ks[0]];
};
onFact('pa_bet', (s, f) => {
  const a = s.acts[f.actors[0]];
  if (a) for (const pid of a.members) { const p = s.persons[pid]; if (p?.alive) p.inspiration = clamp(p.inspiration + 3, 0, 100); } // "alguém acredita na gente"
}, 'links19b:pabet');
registerExplain('a18.pa19', (s, c) => {
  const o = String(c.o), b = l19b(s).bet[o];
  if (!b) return null;
  return { title: l('A aposta do selo no seu potencial', 'The label\'s bet on your potential'), value: b[0], fmt: 'num', parts: [
    { label: l('Potencial que o A&R deles enxerga', 'Potential their A&R sees'), value: b[0], fmt: 'num' },
    { label: l('Olho do A&R (1 = vê o teto real)', 'A&R eye (1 = sees the real ceiling)'), value: b[1], fmt: 'num' }],
    note: l('Adiantamento e mesada de desenvolvimento escalam com a PA enxergada: ×0,85 a ×1,3. A&R ruim puxa a leitura para a média (100); selo que desenvolve talento enxerga melhor e propõe mais contratos de desenvolvimento.', 'Advance and development stipend scale with the perceived PA: ×0.85 to ×1.3. A poor A&R pulls the read toward average (100); development labels see better and offer more development deals.') };
});

/** Achado seu com PA alta e jovem: um selo NPC de bom olho entra na disputa (prazo de 4 semanas). */
function monthRace(s: GameState): void {
  if (s.config.role === 'artist') return;
  const st = l19b(s), d = disc18(s), r = rng(s);
  for (const ld of d.leads) {
    const a = s.acts[ld.a];
    if (!a || a.owner || d.hot[a.id] || st.race[a.id] || s.week - ld.w > 13) continue;
    const ages = a.members.map((id) => s.persons[id]).filter((p) => p?.alive).map((p) => s.year - p.born);
    if (!ages.length || Math.min(...ages) > 24) continue;
    const lbs = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 40000));
    if (!lbs.length) continue;
    const lb = r.weighted(lbs, (x) => labelEye19(s, x) * (x.strategy === 'develop' ? 2 : 1))!;
    const x = paSeen19(s, lb, a);
    if (x.seen < 125 || !r.chance(0.08 * x.eye)) continue;
    st.race[a.id] = 1;
    d.hot[a.id] = { lb: lb.id, w: s.week + 4 };
    emitFact(s, { kind: 'talent_race', actors: [a.id, lb.id], severity: 22, visibility: 'rumor', tags: ['scout', 'rival', 'potential'], src: 'links19b', text: fmtL(l('{l} também quer {a}: o A&R deles viu potencial {p}.', '{l} also wants {a}: their A&R saw potential {p}.'), { l: lb.name, a: a.name, p: x.seen }) });
    pushInbox18(s, 'disc18_hot', { from: lb.name, tone: 'bad', ref: { act: a.id }, weeks: 4,
      subject: fmtL(l('Corrida pelo talento: {l} quer {a}', 'Talent race: {l} wants {a}'), { l: lb.name, a: a.name }),
      body: fmtL(l('O A&R de {l} (olho {e}) enxerga potencial {p} em {a}. Assine antes: em 4 semanas eles fecham.', '{l}\'s A&R (eye {e}) sees potential {p} in {a}. Sign first: in 4 weeks they close.'), { l: lb.name, e: Math.round(x.eye * 100) / 100, p: x.seen, a: a.name }),
      actions: [{ id: 'go', label: l('Fazer proposta', 'Make an offer') }, { id: 'no', label: l('Deixar ir', 'Let it go') }] });
    return; // uma corrida por mês
  }
}
onFact('talent_race', (s, f) => { const lb = f.actors[1]; if (s.labels[lb]) addHeat19(s, lb, 3, 100); }, 'links19b:race');

// ---------------------------------------------------------------- mês

registerSimHook('month', 'links19b', (s) => {
  monthSession(s);
  monthFx(s);
  if (s.config.role !== 'artist') monthIntel(s);
  monthCampus(s);
  monthJury(s);
  monthRace(s);
  const ins = l19b(s).ins;
  if (ins) post(s, `l19b:prem:${mIdx(s)}`, -ins.prem, 'admin', 'Seguro patrimonial');
});
