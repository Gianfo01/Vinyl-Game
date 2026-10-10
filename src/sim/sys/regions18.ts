// Rodada 18 (regions18, feedback #11) — GEOGRAFIA EM CAMADAS. As 7 regiões continuam sendo a visão geral (paradas,
// relevância, fama por região e saves antigos não mudam), mas cada região se abre em submercados com dados por época
// (src/data/regions18/*): a antiga "Ásia e Oriente Médio" vira Japão, Coreia, Grande China, Sudeste Asiático, Índia e
// Oriente Médio. Cada submercado tem peso, poder de compra, idiomas, plataformas/canais locais, parceiros de
// distribuição, barreiras (censura, cotas, vistos, aprovação, pirataria) e custo de entrada.
// - O apelo de um lançamento num território = média dos submercados (peso × gosto × acesso × barreiras) dividida pela
//   conta antiga da região: neutro em média, mas agora um gênero pode ser enorme na Coreia e nada na Índia.
// - Afinidades MUDAM na partida: viradas históricas (Hallyu, Despacito, Afrobeats; fora do modo exato com tamanho e
//   chance sorteados), diásporas (Windrush, magrebinos na França, indianos no Golfo), seus hits no top 10 de um país
//   (o gênero ganha público ali), virais de qualquer ato, cenas em alta e colaborações entre fronteiras.
// - Você entra num submercado por um LICENCIADO (barato, adiantamento, alcance médio) ou um ESCRITÓRIO próprio (caro,
//   aluguel, plataformas locais a favor); versões no idioma local; circuitos com regras próprias (circuits18.ts).

import { clamp, Rng } from '../../core/rng';
import { CIRCS18, DIAS18, SHIFTS18, ramp18, subById18, subOfA3_18, SUBS18, subsOf18, type Barrier18, type Partner18, type Plat18, type Sub18 } from '../../data/regions18';
import { countryOfCity } from '../../data/geo';
import { MARKETS, MARKET_PREF, cityById, familyOf, genreById, l, type L, type MarketId } from '../../data/world';
import { histMode } from '../history15';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { registerExplain, type WhyPart } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, playerActs, post } from '../util';
import { ch7 } from './charts7';
import { nudge16 } from './fame16';

export interface Loc18 { mode: 'lic' | 'own'; since: number; partner: string; until?: number }
export interface RegLog18 { y: number; m: number; sub: string; g: string; d: number; text: L }
export interface Reg18State {
  loc: Record<string, Loc18>;
  /** afinidade permanente (viradas históricas) e dinâmica (hits, virais, colaborações; decai) */
  perm: Record<string, Record<string, number>>;
  dyn: Record<string, Record<string, number>>;
  /** versão no idioma local: ato → sub → até o ano */
  ver: Record<string, Record<string, number>>;
  /** circuitos por ato */
  circ: Record<string, string[]>;
  /** master vendido a marketer (Alaba): ato → ano */
  sold: Record<string, number>;
  seen: Record<string, 1>;
  log: RegLog18[];
  cd: Record<string, number>;
}
declare module '../ext4' { interface Ext4 { regions18: Reg18State } }
const fresh = (): Reg18State => ({ loc: {}, perm: {}, dyn: {}, ver: {}, circ: {}, sold: {}, seen: {}, log: [], cd: {} });
registerExt4('regions18', fresh);
export function reg18(s: GameState): Reg18State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.regions18 ??= fresh()) as Reg18State;
  st.loc ??= {}; st.perm ??= {}; st.dyn ??= {}; st.ver ??= {}; st.circ ??= {}; st.sold ??= {}; st.seen ??= {}; st.log ??= []; st.cd ??= {};
  return st;
}

const tl = (x: L) => x.pt;
export const subName18 = (id: string): L => subById18[id]?.name ?? l(id);
export const mkName18 = (mk: MarketId): L => MARKETS.find((m) => m.id === mk)?.name ?? l(mk);
const live = (y: number, o: { from: number; to?: number }) => y >= o.from && (o.to === undefined || y <= o.to);
export const plats18 = (sub: Sub18, y: number): Plat18[] => sub.plats.filter((p) => live(y, p));
export const partner18 = (sub: Sub18, y: number): Partner18 | undefined => sub.partners.filter((p) => live(y, p)).sort((a, b) => b.from - a.from)[0];
export const bars18 = (sub: Sub18, y: number): Barrier18[] => sub.bars.filter((b) => live(y, b));
/** Nome do parceiro/plataforma respeitando o modo de nomes (real só fora do modo genérico). */
export const realNames18 = (s: GameState): boolean => !!s.config.realNames;
export const pName18 = (s: GameState, p: { name: string; alt?: L }): string => (realNames18(s) || !p.alt ? p.name : tl(p.alt));

// ---------------------------------------------------------------- pesos e gostos

/** Peso do submercado dentro da sua região (soma 1 entre irmãos). */
export function subW18(id: string, y: number): number {
  const sub = subById18[id];
  if (!sub) return 0;
  const sib = subsOf18(sub.mk);
  const tot = sib.reduce((t, x) => t + ramp18(x.share, y), 0);
  return tot ? ramp18(sub.share, y) / tot : 0;
}
/** Gosto de base (dados por época) por gênero; cai para a família e, por fim, para a preferência da região. */
export function tasteBase18(sub: Sub18, g: string, y: number): number {
  const fam = familyOf(g);
  const fb = MARKET_PREF[sub.mk][fam] ?? 0.6;
  const eras = sub.taste;
  if (!eras.length) return fb;
  let i = 0;
  while (i + 1 < eras.length && eras[i + 1][0] <= y) i++;
  const va = eras[i][1][g] ?? eras[i][1][fam] ?? fb;
  const b = eras[i + 1];
  if (!b || y <= eras[i][0]) return va;
  const vb = b[1][g] ?? b[1][fam] ?? fb;
  return va + ((vb - va) * (y - eras[i][0])) / (b[0] - eras[i][0]);
}
export function dias18(sub: string, g: string, y: number): { v: number; names: L[] } {
  const fam = familyOf(g);
  let v = 0; const names: L[] = [];
  for (const d of DIAS18) if (d.to === sub && y >= d.y && (d.g.includes(g) || d.g.includes(fam))) { v += d.w * Math.min(1, (y - d.y + 5) / 20); names.push(d.name); }
  return { v, names };
}
export function aff18(s: GameState, sub: string, g: string): { perm: number; dyn: number } {
  const st = reg18(s), fam = familyOf(g);
  const P = st.perm[sub] ?? {}, D = st.dyn[sub] ?? {};
  return { perm: (P[g] ?? 0) + (P[fam] ?? 0) * 0.5, dyn: (D[g] ?? 0) + (D[fam] ?? 0) * 0.5 };
}
/** Preferência efetiva do submercado pelo gênero (escala de MARKET_PREF). */
export function pref18(s: GameState, sub: Sub18, g: string, y = s.year): number {
  const a = aff18(s, sub.id, g);
  return Math.max(0.1, tasteBase18(sub, g, y) + dias18(sub.id, g, y).v + a.perm + a.dyn);
}
export const actLang18 = (act: Act): string => cityById[act.city]?.lang ?? 'en';
export const actSub18 = (act: Act): string | undefined => subOfA3_18(countryOfCity(act.city));
const hit18 = (b: Barrier18, g: string): boolean => !b.hit?.length || b.hit.includes(g) || b.hit.includes(familyOf(g));
/** Barreiras que pesam sobre o ato no submercado (apelo; vistos ficam para os shows). */
export function barMult18(s: GameState, sub: Sub18, act: Act, shows = false): { v: number; why: L[] } {
  let v = 1; const why: L[] = [];
  const home = actSub18(act) === sub.id;
  const loc = act.owner === 'player' ? reg18(s).loc[sub.id] : undefined;
  const ready = loc && !(loc.until && loc.until > s.week);
  for (const b of bars18(sub, s.year)) {
    if ((b.kind === 'visa') !== shows) continue;
    if (b.foreign && home) continue;
    if (!hit18(b, act.genre)) continue;
    let m = b.mult;
    if (ready && (b.kind === 'approval' || b.kind === 'visa')) m = 1 - (1 - m) * (loc!.mode === 'own' ? 0.4 : 0.6);
    v *= m; why.push(b.name);
  }
  return { v, why };
}
/** Acesso do jogador ao submercado (licenciado/escritório, idioma, versão local). NPCs = 1. */
export function access18(s: GameState, sub: Sub18, act: Act): { v: number; why: L } {
  if (act.owner !== 'player') return { v: 1, why: l('selo próprio do ato', 'the act\'s own label') };
  const st = reg18(s);
  const loc = st.loc[sub.id];
  const ver = (st.ver[act.id]?.[sub.id] ?? 0) >= s.year;
  const lang = sub.langs.includes(actLang18(act)) || ver;
  let v = lang ? 1 : 0.96;
  let why = lang ? (ver ? l('versão no idioma local', 'local-language version') : l('mesmo idioma', 'same language')) : l('idioma estrangeiro, sem parceiro', 'foreign language, no partner');
  if (st.sold[act.id] && sub.mk === 'africa') { v *= 0.6; why = l('master vendido a marketer', 'master sold to a marketer'); }
  if (loc && !(loc.until && loc.until > s.week)) {
    const pb = plats18(sub, s.year).filter((p) => p.kind !== 'piracy').reduce((t, p) => t + p.boost, 0);
    v *= loc.mode === 'own' ? 1.1 + Math.min(0.12, pb) : 1.04 + Math.min(0.06, pb / 2);
    why = loc.mode === 'own' ? l('escritório local + plataformas', 'local office + platforms') : l('licenciado local', 'local licensee');
  }
  if (ver) v *= 1.05;
  return { v, why };
}
const eff = (p: number, pos: number) => p + (1 - p) * (pos / 100) * 0.5;

export interface Fit18 { sub: string; w: number; pref: number; acc: number; bar: number; v: number }
/** Ajuste do apelo no território (razão entre a conta por submercados e a conta antiga). */
export function mkFit18(s: GameState, mk: MarketId, act: Act, y = s.year): { ratio: number; subs: Fit18[] } {
  const subs = subsOf18(mk);
  const base = eff(MARKET_PREF[mk][familyOf(act.genre)] ?? 0.6, act.positioning);
  if (!subs.length || base <= 0) return { ratio: 1, subs: [] };
  let num = 0; const out: Fit18[] = [];
  for (const sub of subs) {
    const w = subW18(sub.id, y);
    if (w <= 0) continue;
    const pref = pref18(s, sub, act.genre, y), acc = access18(s, sub, act).v, bar = barMult18(s, sub, act).v;
    const v = w * eff(pref, act.positioning) * acc * bar;
    num += v; out.push({ sub: sub.id, w, pref, acc, bar, v });
  }
  return { ratio: num / base, subs: out };
}
/** Ajuste do lançamento inteiro (média ponderada pelos territórios). */
export function relFit18(s: GameState, territories: MarketId[], act: Act): number {
  let num = 0, den = 0;
  for (const mk of territories) {
    const m = MARKETS.find((x) => x.id === mk);
    if (!m) continue;
    const size = m.size(s.year), base = eff(MARKET_PREF[mk][familyOf(act.genre)] ?? 0.6, act.positioning);
    den += size * base; num += size * base * mkFit18(s, mk, act).ratio;
  }
  return den ? clamp((num / den) * 1.02, 0.55, 1.5) : 1; // 1,02: calibra a média dos atos para ~1 (neutro)
}

registerMod('appeal', 'regions18', (s, value, ctx) => {
  const rel = ctx.release, act = ctx.act;
  if (!rel || !act || !rel.territories?.length) return null;
  const r = relFit18(s, rel.territories, act);
  if (Math.abs(r - 1) < 0.005) return null;
  return { value: value * r, label: r > 1 ? l('Submercados a favor (gosto, parceiros, idioma)', 'Sub-markets in favour (taste, partners, language)') : l('Submercados contra (gosto, idioma, barreiras)', 'Sub-markets against (taste, language, barriers)') };
});

/** Shows: vistos de trabalho, diáspora no público e circuitos (só para seus atos nos circuitos). */
registerMod('cityDemand', 'regions18', (s, value, ctx) => {
  const act = ctx.act, cid = ctx.cityId;
  if (!act || !cid) return null;
  const subId = subOfA3_18(countryOfCity(cid));
  const sub = subId ? subById18[subId] : undefined;
  if (!sub) return null;
  let m = barMult18(s, sub, act, true).v;
  const home = actSub18(act);
  if (home && home !== sub.id) for (const d of DIAS18) if (d.o === home && d.to === sub.id && s.year >= d.y && (d.g.includes(act.genre) || d.g.includes(familyOf(act.genre)))) m *= 1 + d.w * 0.4;
  if (act.owner === 'player') for (const cid2 of reg18(s).circ[act.id] ?? []) {
    const c = CIRCS18.find((x) => x.id === cid2);
    if (c?.show && (c.sub === sub.id || (c.id === 'palenque' && sub.id === 'latino'))) m *= c.peak?.includes(s.month) ? c.show * 1.5 : c.show;
  }
  return Math.abs(m - 1) < 0.005 ? null : { value: value * m, label: m >= 1 ? l('Circuito local e diáspora', 'Local circuit and diaspora') : l('Vistos e barreiras', 'Visas and barriers') };
});

// ---------------------------------------------------------------- entrar num submercado

export const isOpen18 = (s: GameState, sub: Sub18): boolean => s.player.territories.includes(sub.mk);
export function locCost18(s: GameState, sub: Sub18, mode: 'lic' | 'own'): number {
  const m = MARKETS.find((x) => x.id === sub.mk)!;
  const base = (3000 + 30000 * subW18(sub.id, s.year) * m.size(s.year)) * sub.entry * (0.6 + 0.4 * Math.min(1, ramp18(sub.pp, s.year)));
  return money(s, Math.round(base * (mode === 'own' ? 3 : 1)));
}
export const rent18 = (s: GameState, sub: Sub18): number => money(s, Math.round(500 * sub.entry));
export const advance18 = (s: GameState, sub: Sub18): number => money(s, Math.round((partner18(sub, s.year)?.adv ?? 0) * 0.25));
export function locBlock18(s: GameState, sub: Sub18, mode: 'lic' | 'own'): L | null {
  if (!isOpen18(s, sub)) return fmtL(l('Abra primeiro o mercado {m} (acordo de distribuição da região).', 'First open the {m} market (regional distribution deal).'), { m: mkName18(sub.mk) });
  if (reg18(s).loc[sub.id]?.mode === mode) return l('Já está assim.', 'Already set up.');
  if (mode === 'lic' && !partner18(sub, s.year)) return l('Nenhum parceiro local nesta época.', 'No local partner in this era.');
  if (mode === 'own' && bars18(sub, s.year).some((b) => b.kind === 'approval' && b.mult <= 0.5)) return l('Mercado fechado a estrangeiros: só por licença com o parceiro estatal.', 'Market closed to foreigners: only via licence with the state partner.');
  if (s.player.cash < locCost18(s, sub, mode)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function localize18(s: GameState, subId: string, mode: 'lic' | 'own'): L | null {
  const sub = subById18[subId];
  if (!sub) return l('Submercado desconhecido.', 'Unknown sub-market.');
  const b = locBlock18(s, sub, mode);
  if (b) return b;
  const st = reg18(s), p = partner18(sub, s.year);
  post(s, `reg18:${sub.id}:${mode}`, -locCost18(s, sub, mode), 'distribution', `${mode === 'own' ? 'Escritório' : 'Licenciado'} ${tl(sub.name)}`);
  const appr = bars18(sub, s.year).some((x) => x.kind === 'approval');
  const prev = st.loc[sub.id];
  st.loc[sub.id] = { mode, since: s.week, partner: mode === 'lic' ? pName18(s, p!) : s.config.companyName, until: appr && !prev ? s.week + 17 : undefined };
  if (mode === 'lic' && !prev) post(s, `reg18adv:${sub.id}`, advance18(s, sub), 'licensing', `Adiantamento do licenciado ${p ? pName18(s, p) : ''}`);
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 25, visibility: 'public', tags: ['good', 'market', sub.id], src: 'regions18',
    text: fmtL(mode === 'own' ? l('{c} abre escritório em {s}.', '{c} opens an office in {s}.') : l('{c} licencia o catálogo em {s} com {p}.', '{c} licenses its catalogue in {s} to {p}.'), { c: s.config.companyName, s: sub.name, p: p ? pName18(s, p) : '' }) });
  return null;
}
export function closeLoc18(s: GameState, subId: string): void {
  const st = reg18(s);
  if (!st.loc[subId]) return;
  delete st.loc[subId];
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 15, visibility: 'public', tags: ['market', subId], src: 'regions18', text: fmtL(l('{c} fecha a operação em {s}.', '{c} closes its operation in {s}.'), { c: s.config.companyName, s: subName18(subId) }) });
}

/** Versão no idioma local (BoA em japonês, Beatles em alemão, Shakira em inglês). */
export const verCost18 = (s: GameState): number => money(s, 4000);
export function verBlock18(s: GameState, actId: string, subId: string): L | null {
  const a = s.acts[actId], sub = subById18[subId];
  if (!a || a.owner !== 'player' || !sub) return l('Ato ou submercado inválido.', 'Invalid act or sub-market.');
  if (sub.langs.includes(actLang18(a))) return l('O ato já canta no idioma local.', 'The act already sings in the local language.');
  if ((reg18(s).ver[actId]?.[subId] ?? 0) >= s.year) return l('Já há versão local em circulação.', 'A local version is already out.');
  if (s.player.cash < verCost18(s)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}
export function version18(s: GameState, actId: string, subId: string): L | null {
  const b = verBlock18(s, actId, subId);
  if (b) return b;
  const a = s.acts[actId], sub = subById18[subId];
  post(s, `reg18ver:${actId}`, -verCost18(s), 'recording', `Versão local ${a.name} (${tl(sub.name)})`);
  (reg18(s).ver[actId] ??= {})[subId] = s.year + 3;
  a.fans.core = Math.round(a.fans.core * 0.98);
  return fmtL(l('{a} grava versões em {s}: idioma deixa de pesar ali por 3 anos (+5%). Alguns fãs de casa torcem o nariz (−2% núcleo).', '{a} records versions for {s}: language stops counting against them there for 3 years (+5%). Some home fans grumble (−2% core).'), { a: a.name, s: sub.name });
}

// ---------------------------------------------------------------- colaboração entre fronteiras

export function collabPartner18(s: GameState, subId: string, exclude?: string): Act | undefined {
  const sub = subById18[subId];
  if (!sub) return undefined;
  let best: Act | undefined;
  for (const a of Object.values(s.acts)) {
    if (a.id === exclude || a.owner === 'player' || a.status === 'retired' || a.status === 'split' || a.fame < 15) continue;
    if (subOfA3_18(countryOfCity(a.city)) !== subId) continue;
    if (!best || a.fame > best.fame) best = a;
  }
  return best;
}
export const collabCost18 = (s: GameState, subId: string): number => money(s, Math.round(6000 * (subById18[subId]?.entry ?? 1)));
export function collabOdds18(s: GameState, act: Act, partner: Act): { p: number; why: L[] } {
  const p = clamp(0.45 + (act.fame - partner.fame * 0.6) / 100, 0.15, 0.9);
  return { p, why: [fmtL(l('Base 45%; sua fama {a} contra 60% da fama dele ({b}).', 'Base 45%; your fame {a} vs 60% of theirs ({b}).'), { a: Math.round(act.fame), b: Math.round(partner.fame * 0.6) })] };
}
export function collab18(s: GameState, actId: string, subId: string): L {
  const a = s.acts[actId], sub = subById18[subId];
  if (!a || a.owner !== 'player' || !sub) return l('Inválido.', 'Invalid.');
  const st = reg18(s), k = `${actId}:${subId}`;
  if ((st.cd[k] ?? -1) > s.week) return l('Já tentaram este ano.', 'Already tried this year.');
  const pt = collabPartner18(s, subId, actId);
  if (!pt) return l('Nenhum astro local disponível.', 'No local star available.');
  const cost = collabCost18(s, subId);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  st.cd[k] = s.week + 52;
  const r = Rng.fromSeed(`${s.config.seed}|reg18c|${k}|${s.week}`);
  const ok = r.chance(collabOdds18(s, a, pt).p);
  post(s, `reg18col:${actId}`, -(ok ? cost : Math.round(cost / 2)), 'promo', `Colaboração ${a.name} × ${pt.name}`);
  if (!ok) return fmtL(l('{b} recusou o feat (metade do custo em viagens e demos).', '{b} turned the feature down (half the cost spent on travel and demos).'), { b: pt.name });
  addAff18(s, subId, a.genre, 0.12, true, fmtL(l('Feat {a} × {b} apresenta o {g} ao público local.', 'The {a} × {b} feature introduces {g} to local audiences.'), { a: a.name, b: pt.name, g: genreById[a.genre]?.name ?? l(a.genre) }));
  const home = actSub18(a);
  if (home && home !== subId) addAff18(s, home, pt.genre, 0.06, true, fmtL(l('{b} ganha ouvintes no país de {a}.', '{b} gains listeners in {a}\'s country.'), { a: a.name, b: pt.name }));
  nudge16(s, a.id, sub.a3[0], 6);
  a.feats = (a.feats ?? 0) + 1;
  emitFact(s, { kind: 'deal', actors: [a.id, pt.id], severity: 35, visibility: 'public', tags: ['good', 'collab', 'crossover', subId], src: 'regions18', text: fmtL(l('{a} grava com {b}: ponte entre {h} e {s}.', '{a} records with {b}: a bridge between {h} and {s}.'), { a: a.name, b: pt.name, h: home ? subName18(home) : l('?'), s: sub.name }) });
  return fmtL(l('Feat fechado com {b}: +0,12 de afinidade pelo {g} em {s}, +6 de fama ali.', 'Feature done with {b}: +0.12 affinity for {g} in {s}, +6 fame there.'), { b: pt.name, g: genreById[a.genre]?.name ?? l(a.genre), s: sub.name });
}

// ---------------------------------------------------------------- afinidades que mudam

export function addAff18(s: GameState, subId: string, g: string, d: number, dyn: boolean, text: L): void {
  const st = reg18(s);
  const box = ((dyn ? st.dyn : st.perm)[subId] ??= {});
  box[g] = clamp((box[g] ?? 0) + d, -0.8, dyn ? 1 : 1.5);
  st.log.push({ y: s.year, m: s.month, sub: subId, g, d, text });
  if (st.log.length > 80) st.log.splice(0, st.log.length - 80);
}
const homeOfGenre = (g: string, y: number): Sub18 | undefined => { let b: Sub18 | undefined, bv = 0; for (const x of SUBS18) { const v = tasteBase18(x, g, y); if (v > bv) { bv = v; b = x; } } return b; };

function shifts(s: GameState): void {
  const st = reg18(s), exact = histMode(s) === 'strict';
  for (const sh of SHIFTS18) {
    const k = `sh:${sh.y}:${sh.sub}:${sh.g}`;
    if (st.seen[k] || sh.y > s.year) continue;
    st.seen[k] = 1;
    const past = sh.y < s.config.startYear;
    let d = sh.d;
    if (!exact && !past) {
      const r = Rng.fromSeed(`${s.config.seed}|reg18sh|${k}`);
      if (!r.chance(0.7)) continue;
      d *= r.float(0.5, 1.5);
    }
    const home = homeOfGenre(sh.g, s.year)?.id;
    const targets = sh.sub === '*' ? SUBS18.filter((x) => x.id !== home && tasteBase18(x, sh.g, s.year) < 2) : [subById18[sh.sub]].filter(Boolean);
    for (const t of targets) { const box = (st.perm[t.id] ??= {}); box[sh.g] = clamp((box[sh.g] ?? 0) + d * (sh.sub === '*' ? 1 : 1), -0.8, 1.5); }
    if (past) continue;
    st.log.push({ y: s.year, m: s.month, sub: sh.sub, g: sh.g, d, text: fmtL(l('{n}: {w}', '{n}: {w}'), { n: sh.name, w: sh.why }) });
    const mine = playerActs(s).some((id) => s.acts[id]?.genre === sh.g || familyOf(s.acts[id]?.genre ?? '') === sh.g);
    emitFact(s, { kind: 'chart', actors: [], severity: 30, visibility: 'public', tags: ['trend', 'crossover', sh.g], src: 'regions18', text: fmtL(l('{n} — o {g} ganha público {w}.', '{n} — {g} finds new audiences {w}.'), { n: sh.name, g: genreById[sh.g]?.name ?? l(sh.g), w: sh.sub === '*' ? l('no mundo', 'worldwide') : fmtL(l('em {s}', 'in {s}'), { s: subName18(sh.sub) }) }) });
    if (mine) pushInbox18(s, 'regions18', { from: tl(l('Analista de mercados', 'Market analyst')), subject: fmtL(l('{n}: seu gênero viaja', '{n}: your genre travels'), { n: sh.name }), body: fmtL(l('{w} Afinidade +{d} {s}. Vale abrir/localizar esses submercados.', '{w} Affinity +{d} {s}. Worth opening/localising those sub-markets.'), { w: sh.why, d: d.toFixed(2), s: sh.sub === '*' ? l('em quase todo o mundo', 'almost everywhere') : fmtL(l('em {s}', 'in {s}'), { s: subName18(sh.sub) }) }), tone: 'good' });
  }
}
/** Seus lançamentos no top 10 de um país fora da casa do gênero abrem público ali (o gênero "chega"). */
function hits(s: GameState): void {
  const st = reg18(s), peaks = ch7(s)?.peaks ?? {};
  for (const [relId, ks] of Object.entries(peaks)) {
    const rel = s.releases[relId], act = rel && s.acts[rel.actId];
    if (!rel || !act || s.week - rel.week > 30) continue;
    for (const [k, pos] of Object.entries(ks)) {
      if (pos > 10) continue;
      const subId = subOfA3_18(k.split(':')[0]);
      if (!subId) continue;
      const key = `h:${relId}:${subId}`;
      if (st.seen[key]) continue;
      st.seen[key] = 1;
      const sub = subById18[subId];
      if (tasteBase18(sub, act.genre, s.year) >= 1.6 || actSub18(act) === subId) continue;
      const boost = 0.08 * (st.ver[act.id]?.[subId] ? 1.5 : 1) * ((st.circ[act.id] ?? []).includes('perreo') ? 1.3 : 1);
      addAff18(s, subId, act.genre, boost, true, fmtL(l('"{t}" de {a} no top 10: o {g} ganha público em {s}.', '"{t}" by {a} hits the top 10: {g} finds an audience in {s}.'), { t: rel.title, a: act.name, g: genreById[act.genre]?.name ?? l(act.genre), s: sub.name }));
      emitFact(s, { kind: 'chart', actors: [act.id], severity: 40, visibility: 'public', tags: ['good', 'crossover', subId, act.genre], src: 'regions18', text: fmtL(l('{a} abre caminho para o {g} em {s}.', '{a} opens the way for {g} in {s}.'), { a: act.name, g: genreById[act.genre]?.name ?? l(act.genre), s: sub.name }) });
      notify(s, fmtL(l('🌏 {a} emplacou em {s}: o {g} ganhou público lá (afinidade +{d}).', '🌏 {a} broke through in {s}: {g} gained an audience there (affinity +{d}).'), { a: act.name, s: sub.name, g: genreById[act.genre]?.name ?? l(act.genre), d: boost.toFixed(2) }), 'good');
    }
  }
  // limpa chaves velhas de hits (só lançamentos recentes contam)
  const ks = Object.keys(st.seen).filter((k) => k.startsWith('h:'));
  if (ks.length > 400) for (const k of ks.slice(0, ks.length - 300)) delete st.seen[k];
}
function decay(s: GameState): void {
  const st = reg18(s);
  for (const box of Object.values(st.dyn)) for (const [g, v] of Object.entries(box)) { const n = v * 0.985; if (Math.abs(n) < 0.01) delete box[g]; else box[g] = n; }
}
function rents(s: GameState): void {
  const st = reg18(s);
  for (const [id, loc] of Object.entries(st.loc)) {
    const sub = subById18[id];
    if (!sub) { delete st.loc[id]; continue; }
    if (loc.until && loc.until <= s.week) { delete loc.until; notify(s, fmtL(l('Aprovação saiu: {s} liberado para o seu catálogo.', 'Approval granted: {s} is open to your catalogue.'), { s: sub.name }), 'good'); }
    if (loc.mode === 'own') post(s, `reg18rent:${id}`, -rent18(s, sub), 'overhead', `Escritório ${tl(sub.name)}`);
    if (!s.player.territories.includes(sub.mk)) delete st.loc[id];
  }
}

// virais de qualquer ato e cenas em alta mexem nas afinidades de todos os submercados
onFact('chart', (s, f) => {
  if (f.src === 'regions18') return;
  const st = reg18(s);
  if (f.tags.includes('viral') && f.actors[0]) {
    const a = s.acts[f.actors[0]];
    if (!a) return;
    const home = actSub18(a);
    for (const sub of SUBS18) if (sub.id !== home) { const b = (st.dyn[sub.id] ??= {}); b[a.genre] = clamp((b[a.genre] ?? 0) + 0.04, -0.8, 1); }
    st.log.push({ y: s.year, m: s.month, sub: '*', g: a.genre, d: 0.04, text: fmtL(l('Viral de {a}: o {g} soa no mundo todo.', '{a}\'s viral hit: {g} plays worldwide.'), { a: a.name, g: genreById[a.genre]?.name ?? l(a.genre) }) });
  } else if (f.tags.includes('trend') && f.tags[1] && genreById[f.tags[1]]) {
    const g = f.tags[1];
    for (const sub of SUBS18) { const b = (st.dyn[sub.id] ??= {}); b[g] = clamp((b[g] ?? 0) + 0.02, -0.8, 1); }
  }
}, 'regions18');

registerSimHook('month', 'regions18', (s) => {
  shifts(s);
  hits(s);
  decay(s);
  rents(s);
});

registerInboxKind('regions18', { label: l('Mercados', 'Markets'), cat: 'world', icon: 'globe', prio: 1, goto: () => ({ area: 'regions18' }) });

// ---------------------------------------------------------------- explicações e conselheiro

registerExplain('regions18.sub', (s, c) => {
  const sub = subById18[String(c.sub)], act = c.act ? s.acts[String(c.act)] : undefined;
  if (!sub) return null;
  const g = act?.genre ?? String(c.g ?? 'pop');
  const a = aff18(s, sub.id, g), d = dias18(sub.id, g, s.year);
  const parts: WhyPart[] = [
    { label: l('Gosto da época (dados)', 'Era taste (data)'), value: Math.round(tasteBase18(sub, g, s.year) * 100) / 100, fmt: 'num' },
    { label: d.names.length ? fmtL(l('Diáspora: {n}', 'Diaspora: {n}'), { n: d.names.map(tl).join(', ') }) : l('Diáspora', 'Diaspora'), value: Math.round(d.v * 100) / 100, fmt: 'signed' },
    { label: l('Viradas históricas', 'Historical shifts'), value: Math.round(a.perm * 100) / 100, fmt: 'signed' },
    { label: l('Hits, virais, feats (decai)', 'Hits, virals, features (decays)'), value: Math.round(a.dyn * 100) / 100, fmt: 'signed', tone: a.dyn > 0 ? 'good' : '' },
  ];
  if (act) {
    const acc = access18(s, sub, act), bar = barMult18(s, sub, act);
    parts.push({ label: fmtL(l('Acesso: {w}', 'Access: {w}'), { w: acc.why }), value: Math.round(acc.v * 100) / 100, fmt: 'mult' });
    if (bar.why.length) parts.push({ label: bar.why.map(tl).join(' · '), value: Math.round(bar.v * 100) / 100, fmt: 'mult', tone: 'bad' });
  }
  return { title: fmtL(l('Preferência em {s}', 'Preference in {s}'), { s: sub.name }), value: Math.round(pref18(s, sub, g) * 100) / 100, fmt: 'num', parts, note: l('Escala da região (1 = neutro, 2+ = gênero da casa). Peso no apelo = peso do submercado × preferência × acesso × barreiras.', 'Region scale (1 = neutral, 2+ = home genre). Appeal weight = sub-market weight × preference × access × barriers.') };
});
registerExplain('regions18.fit', (s, c) => {
  const act = s.acts[String(c.act)], mk = c.mk as MarketId | undefined;
  if (!act) return null;
  if (mk) {
    const f = mkFit18(s, mk, act);
    return { title: fmtL(l('{a} em {m}', '{a} in {m}'), { a: act.name, m: mkName18(mk) }), value: Math.round(f.ratio * 100) / 100, fmt: 'mult',
      parts: f.subs.map((x) => ({ label: subName18(x.sub), value: `${Math.round(x.w * 100)}% · ${x.pref.toFixed(2)} · ×${(x.acc * x.bar).toFixed(2)}`, fmt: 'text' as const, why: { key: 'regions18.sub', ctx: { sub: x.sub, act: act.id } } })),
      note: l('Peso · preferência · acesso×barreiras de cada submercado, comparados à conta antiga da região.', 'Weight · preference · access×barriers per sub-market, compared with the old region-wide sum.') };
  }
  const t = (c.t as MarketId[] | undefined) ?? s.player.territories;
  return { title: l('Ajuste geográfico do lançamento', 'Release geographic fit'), value: Math.round(relFit18(s, t, act) * 100) / 100, fmt: 'mult',
    parts: t.filter((m) => subsOf18(m).length > 1).map((m) => ({ label: mkName18(m), value: Math.round(mkFit18(s, m, act).ratio * 100) / 100, fmt: 'mult' as const, why: { key: 'regions18.fit', ctx: { act: act.id, mk: m } } })),
    note: l('Multiplica o apelo; limitado entre ×0,55 e ×1,5.', 'Multiplies appeal; capped between ×0.55 and ×1.5.') };
});

registerAdvisorTip('regions18', (s) => {
  const out: ReturnType<Parameters<typeof registerAdvisorTip>[1]> = [];
  const st = reg18(s), acts = playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && !a.playerBand);
  if (!acts.length) return out;
  // o submercado aberto mais promissor ainda sem parceiro
  let best: { sub: Sub18; v: number } | undefined;
  for (const sub of SUBS18) {
    if (!isOpen18(s, sub) || st.loc[sub.id] || subsOf18(sub.mk).length < 2 || !partner18(sub, s.year)) continue;
    const v = acts.reduce((t, a) => t + subW18(sub.id, s.year) * (MARKETS.find((m) => m.id === sub.mk)?.size(s.year) ?? 0) * pref18(s, sub, a.genre) * (sub.langs.includes(actLang18(a)) ? 0.5 : 1), 0);
    if (!best || v > best.v) best = { sub, v };
  }
  if (best && best.v > 0.25) out.push({ id: `reg18-loc-${best.sub.id}`, level: 'info', cat: 'opportunity', score: 30 + Math.min(25, best.v * 20),
    text: fmtL(l('{s}: seu elenco tem público, mas você entra sem parceiro local.', '{s}: your roster has an audience there, but you go in without a local partner.'), { s: best.sub.name }),
    why: [l('Sem licenciado/escritório, idioma estrangeiro pesa −4% e as plataformas locais não ajudam.', 'Without a licensee/office, a foreign language costs −4% and local platforms do not help.')],
    effect: fmtL(l('Licenciado: {c} (adiantamento {a}); acesso ×1,04+.', 'Licensee: {c} (advance {a}); access ×1.04+.'), { c: `$${Math.round(locCost18(s, best.sub, 'lic') / 100).toLocaleString('en-US')}`, a: `$${Math.round(advance18(s, best.sub) / 100).toLocaleString('en-US')}` }),
    goto: { area: 'regions18' } });
  return out;
});

export const circ18 = (id: string) => CIRCS18.find((c) => c.id === id);
/** Para a interface: quanto de apelo o lançamento ganharia/perderia hoje nos territórios abertos. */
export const previewFit18 = (s: GameState, act: Act): number => relFit18(s, s.player.territories, act);
