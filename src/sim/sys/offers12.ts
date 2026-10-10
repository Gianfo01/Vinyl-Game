// Rodada 12 — negociação por PACOTE. Um contrato deixa de ser "adiantamento + royalty" e vira um pacote
// coerente em quatro blocos: dinheiro (adiantamento, royalty), autonomia (controle criativo, aprovação de A&R),
// direitos (master, reversão, edição, 360) e compromissos (discos, prazo, verba de turnê e marketing
// prometida, território). O artista pesa cada bloco pela ambição, pelos traços, pelo sonho (soul9) e pela
// memória do que já viveu — e compara a sua proposta com as dos selos rivais para o mesmo artista.
//
// Reuso: `DealPackage`, `artistWeights`, `scorePackage`, `rivalPackages` e `comparePackages` não dependem
// do papel do jogador (o empresário pode montar pacotes de várias gravadoras e comparar do lado do cliente).

import { clamp, hashString } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import type { ContractModel } from '../../data/rules';
import { registerOfferMod } from '../ext4';
import { registerSimHook } from '../ext4';
import { expectedAdvance } from '../contracts';
import { mainAmbition } from '../people';
import { defaultRights } from '../rights';
import type { Act, ContractPromise, GameState, Offer, RightsTerms } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { dreamOf, type DreamId } from './soul9';

// ---------------------------------------------------------------- tipos reutilizáveis

export type ArApproval = 'label' | 'joint' | 'artist';
export const AR_NAME: Record<ArApproval, L> = {
  label: l('o selo escolhe singles e produtor', 'label picks singles and producer'),
  joint: l('decisão conjunta', 'joint decision'),
  artist: l('o artista tem a palavra final', 'artist has the final say'),
};
export type Dim = 'money' | 'autonomy' | 'rights' | 'commit' | 'label';
export const DIMS: Dim[] = ['money', 'autonomy', 'rights', 'commit', 'label'];
export const DIM_NAME: Record<Dim, L> = {
  money: l('Dinheiro', 'Money'), autonomy: l('Autonomia', 'Autonomy'), rights: l('Direitos', 'Rights'),
  commit: l('Compromissos', 'Commitments'), label: l('Força do selo', 'Label clout'),
};

/** Pacote completo de uma proposta (valores em centavos do jogo). */
export interface DealPackage {
  /** 'player' | id do selo rival | outro rótulo livre */
  from: string;
  name: string;
  model: ContractModel;
  advance: number;
  royalty: number;
  creativeControl: boolean;
  ar: ArApproval;
  master: RightsTerms['master'];
  reversionYears: number;
  pubShare: number;
  share360: number;
  albums: number;
  termMonths: number;
  tourSupport: number;
  marketing: number;
  scope: RightsTerms['scope'];
  promises: ContractPromise['kind'][];
  /** força do selo 0..1 (reputação, alcance) */
  clout: number;
}
export interface PackageScore { total: number; dims: Record<Dim, number>; pros: L[]; cons: L[] }
export type Weights = Record<Dim, number>;

/** Campos extras da oferta (rodada 12). */
export interface OfferPk12 { ar: ArApproval; tour: number; mkt: number }
declare module '../types' {
  interface Offer { pk12?: OfferPk12 }
}

// ---------------------------------------------------------------- ruído controlado (sem consumir Rng)

/** 0..1 determinístico por chave — variação que muda mês a mês, sem mexer no gerador do jogo. */
export function hu(s: GameState, key: string): number {
  return hashString(`${s.config.seed}|r12|${key}`) / 4294967296;
}
const monthKey = (s: GameState) => s.year * 12 + s.month;

// ---------------------------------------------------------------- pesos do artista

const DREAM_TILT: Partial<Record<DreamId, Partial<Weights>>> = {
  critics: { autonomy: 0.08 }, producer: { autonomy: 0.06, rights: 0.03 }, label: { rights: 0.1 },
  legend: { rights: 0.05, label: 0.04 }, grammy: { label: 0.07, commit: 0.03 }, family: { commit: -0.05, money: 0.05 },
  home: { commit: -0.03, autonomy: 0.03 }, solo: { autonomy: 0.06 },
};
const TRAIT_TILT: Record<string, Partial<Weights>> = {
  spendthrift: { money: 0.07 }, ambitious: { money: 0.03, label: 0.04 }, frugal: { money: -0.04, rights: 0.03 },
  generous: { money: -0.03 }, rebel: { autonomy: 0.06 }, purist: { autonomy: 0.05 }, experimental: { autonomy: 0.04 },
  big_ego: { label: 0.05, autonomy: 0.03 }, insecure: { commit: 0.05 }, anxious: { commit: 0.04 }, opportunist: { money: 0.05, commit: -0.03 },
  loyal: { commit: 0.03 }, workaholic: { commit: 0.04 },
};

export interface WeightInfo { w: Weights; why: L[] }

/** Quanto cada bloco importa para este artista (soma 1) e por quê. */
export function artistWeights(s: GameState, act: Act): WeightInfo {
  const amb = mainAmbition(s, act);
  const w: Weights = { money: 0.26, autonomy: 0.18, rights: 0.16, commit: 0.2, label: 0.2 };
  const why: L[] = [];
  const A: Record<string, Partial<Weights>> = {
    money: { money: 0.14 }, security: { money: 0.08, commit: 0.08 }, art: { autonomy: 0.14, rights: 0.04 }, freedom: { autonomy: 0.12, rights: 0.08 },
    critics: { autonomy: 0.1 }, fame: { label: 0.12, commit: 0.04 }, status: { label: 0.1, money: 0.04 }, legacy: { rights: 0.14 },
  };
  const add = (t?: Partial<Weights>, k = 1) => { if (t) for (const d of DIMS) w[d] += (t[d] ?? 0) * k; };
  add(A[amb]);
  const AMB_TXT: Record<string, L> = {
    money: l('Ambição: dinheiro — o adiantamento fala alto.', 'Ambition: money — the advance talks.'),
    security: l('Ambição: segurança — querem garantias e verba prometida.', 'Ambition: security — they want guarantees and pledged budgets.'),
    art: l('Ambição: arte — autonomia acima de tudo.', 'Ambition: art — autonomy above all.'),
    freedom: l('Ambição: liberdade — autonomia e masters.', 'Ambition: freedom — autonomy and masters.'),
    critics: l('Ambição: crítica — querem decidir o próprio som.', 'Ambition: critics — they want to decide their own sound.'),
    fame: l('Ambição: fama — força do selo e alcance.', 'Ambition: fame — label clout and reach.'),
    status: l('Ambição: status — selo grande e cheque grande.', 'Ambition: status — big label, big check.'),
    legacy: l('Ambição: legado — os masters importam.', 'Ambition: legacy — the masters matter.'),
  };
  if (AMB_TXT[amb]) why.push(AMB_TXT[amb]);
  const members = act.members.map((id) => s.persons[id]).filter(Boolean);
  const n = Math.max(1, members.length);
  const dreams: Record<string, number> = {};
  for (const p of members) {
    for (const tr of p.traits ?? []) add(TRAIT_TILT[tr], 1 / n);
    try { const d = dreamOf(s, p); dreams[d] = (dreams[d] ?? 0) + 1; add(DREAM_TILT[d], 1 / n); } catch { /* pessoa sem alma calculável */ }
  }
  const topDream = Object.entries(dreams).sort((a, b) => b[1] - a[1])[0]?.[0] as DreamId | undefined;
  const DREAM_WHY: Partial<Record<DreamId, L>> = {
    critics: l('Sonham com o respeito da crítica: aprovação de A&R pesa.', 'They dream of critical respect: A&R approval matters.'),
    label: l('Sonham com o próprio selo: querem os masters de volta um dia.', 'They dream of their own label: they want their masters back someday.'),
    grammy: l('Sonham com prêmios: querem um selo que empurre.', 'They dream of awards: they want a label that pushes.'),
    family: l('Sonham com uma vida longe da estrada: prazo curto e dinheiro na mão.', 'They dream of a life off the road: short term and cash in hand.'),
    legend: l('Querem virar lenda: catálogo e alcance.', 'They want to become legends: catalog and reach.'),
    producer: l('Querem produzir: controle do estúdio.', 'They want to produce: control of the studio.'),
  };
  if (topDream && DREAM_WHY[topDream]) why.push(DREAM_WHY[topDream]!);
  // memória: o que o artista já viveu com selos
  const mem = s.memory.filter((m) => m.actId === act.id);
  if (mem.some((m) => m.kind === 'broken_promise')) { w.commit += 0.06; why.push(l('Já tiveram promessa quebrada: desconfiam de compromissos verbais.', 'They had a promise broken: wary of verbal pledges.')); }
  if (mem.some((m) => m.kind === 'left')) { w.autonomy += 0.05; w.rights += 0.03; why.push(l('Saíram mal de um selo antes: querem cláusulas de saída e autonomia.', 'They left a label badly before: they want autonomy and exit terms.')); }
  if (mem.some((m) => m.kind === 'sniped')) w.label += 0.03;
  for (const d of DIMS) w[d] = Math.max(0.03, w[d]);
  const tot = DIMS.reduce((x, d) => x + w[d], 0);
  for (const d of DIMS) w[d] /= tot;
  return { w, why };
}

// ---------------------------------------------------------------- pontuação de um pacote

const reachOf = (s: GameState) => clamp(s.player.territories.length / 6 + s.player.reputation.commercial / 200 + s.player.reputation.artists / 300, 0.1, 1);

export function labelClout(s: GameState, from: string): number {
  if (from === 'player') return reachOf(s);
  const lb = s.labels[from];
  if (!lb) return 0.4;
  return clamp(lb.reputation / 100 * 0.6 + (lb.family === 'A' ? 0.35 : lb.family === 'D' ? 0.2 : lb.family === 'B' ? 0.1 : 0.15) + lb.roster.length / 200, 0.1, 1);
}

/** Notas 0..1 por bloco do ponto de vista do artista + total ponderado. */
export function scorePackage(s: GameState, act: Act, p: DealPackage, wi = artistWeights(s, act)): PackageScore {
  const exp = expectedAdvance(s, act);
  const advU = clamp(toReal(p.advance, s.year) / Math.max(1, exp), 0, 2.2);
  const expRoy = p.model === 'distribution' ? 0.8 : 0.14 + act.fame / 600;
  const royU = clamp(p.royalty / expRoy, 0, 2);
  const dims = {} as Record<Dim, number>;
  dims.money = clamp(advU * 0.32 + royU * 0.18, 0, 1);
  dims.autonomy = clamp((p.creativeControl ? 0.45 : 0.1) + (p.ar === 'artist' ? 0.45 : p.ar === 'joint' ? 0.25 : 0) + (p.model === 'distribution' || p.model === 'licensing' ? 0.15 : 0), 0, 1);
  const rev = p.master === 'artist' ? 0.55 : p.master === 'shared' ? 0.35 : 0;
  dims.rights = clamp(0.25 + rev + (p.master !== 'artist' && p.reversionYears > 0 ? clamp((30 - p.reversionYears) / 60, 0, 0.35) : 0) - p.pubShare * 0.4 - p.share360 * 0.8, 0, 1);
  const pledge = toReal(p.tourSupport + p.marketing, s.year) / Math.max(1, exp);
  const yrs = p.termMonths / 12;
  dims.commit = clamp(0.3 + clamp(pledge, 0, 1.5) * 0.3 + p.promises.length * 0.06 - Math.max(0, yrs - 3) * 0.06 - Math.max(0, p.albums - 3) * 0.05
    + (p.scope === 'world' ? 0.08 : p.scope === 'home' ? -0.08 : 0), 0, 1);
  dims.label = clamp(p.clout, 0, 1);
  const total = DIMS.reduce((x, d) => x + dims[d] * wi.w[d], 0);
  const pros: L[] = [];
  const cons: L[] = [];
  if (advU >= 1.3) pros.push(l('cheque acima do esperado', 'check above expectations')); else if (advU < 0.7) cons.push(l('adiantamento baixo', 'low advance'));
  if (p.ar === 'artist' || p.creativeControl) pros.push(l('liberdade no estúdio', 'freedom in the studio')); else if (wi.w.autonomy > 0.22) cons.push(l('o selo decide o som', 'the label decides the sound'));
  if (p.master !== 'label') pros.push(l('masters na mão do artista', 'masters in the artist\'s hands')); else if (p.reversionYears > 0) pros.push(fmtL(l('masters voltam em {y} anos', 'masters revert in {y} years'), { y: p.reversionYears }));
  else if (wi.w.rights > 0.2) cons.push(l('masters do selo para sempre', 'label owns the masters forever'));
  if (p.share360 > 0) cons.push(fmtL(l('{p}% de shows e merch para o selo (menos quando o ato fica famoso; teto anual)', '{p}% of live and merch to the label (less once the act is famous; yearly cap)'), { p: Math.round(p.share360 * 100) }));
  if (pledge > 0.4) pros.push(l('verba de turnê/marketing garantida', 'guaranteed tour/marketing budget'));
  if (yrs > 4) cons.push(l('prazo longo', 'long term'));
  if (p.clout > 0.7) pros.push(l('selo forte e com alcance', 'strong label with reach'));
  return { total, dims, pros, cons };
}

// ---------------------------------------------------------------- conversões

export function packageFromOffer(s: GameState, o: Omit<Offer, 'id' | 'week' | 'status'>, from = 'player', name = s.config.companyName): DealPackage {
  const r = o.rights ?? defaultRights(o.model, o.publishing);
  return {
    from, name, model: o.model, advance: o.advance, royalty: o.model === 'distribution' ? 1 - (o.distributionFee ?? 0.2) : o.royalty,
    creativeControl: o.creativeControl, ar: o.pk12?.ar ?? (o.creativeControl ? 'joint' : 'label'), master: r.master, reversionYears: r.reversionYears,
    pubShare: r.pubShare, share360: o.model === '360' ? Math.max(0.1, o.share360) : 0, albums: o.releasesOwed, termMonths: o.termMonths,
    tourSupport: o.pk12?.tour ?? 0, marketing: o.pk12?.mkt ?? 0, scope: r.scope, promises: [...o.promises], clout: labelClout(s, from),
  };
}

/** Disputa: o artista é visível o bastante para atrair rivais? */
export function contested(s: GameState, act: Act): boolean {
  return !act.owner && (act.fame > 8 || (!!act.catalogNo && s.year >= act.debutYear));
}

/** Propostas dos rivais para este artista neste mês (determinísticas; só selos ativos e com caixa). */
export function rivalPackages(s: GameState, act: Act): DealPackage[] {
  if (!contested(s, act)) return [];
  const mk = monthKey(s);
  const labels = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 40000) && x.founded <= s.year)
    .map((lb) => ({ lb, k: lb.aggression + hu(s, `${act.id}:${lb.id}:${mk}`) * 0.8 - (act.fame < 20 && lb.family === 'A' ? 0.3 : 0) }))
    .sort((a, b) => b.k - a.k);
  const n = act.fame > 30 ? 2 : act.fame > 14 || hu(s, `${act.id}:n:${mk}`) < 0.5 ? 1 : 0;
  const exp = expectedAdvance(s, act);
  return labels.slice(0, n).map(({ lb }) => {
    const v = (k: string) => hu(s, `${act.id}:${lb.id}:${mk}:${k}`);
    const major = lb.family === 'A';
    const indie = lb.family === 'B' || lb.strategy === 'niche' || lb.strategy === 'develop';
    const p: DealPackage = {
      from: lb.id, name: lb.name, model: major && v('m') < 0.35 && s.year >= 2002 ? '360' : indie && v('m') < 0.3 ? 'licensing' : 'classic',
      advance: money(s, Math.round(exp * (major ? 1.15 + v('a') * 0.6 : indie ? 0.6 + v('a') * 0.5 : 0.85 + v('a') * 0.5) / 100) * 100),
      royalty: Math.round((0.12 + act.fame / 700 + (indie ? 0.04 : 0) + v('r') * 0.04) * 100) / 100,
      creativeControl: indie ? v('c') < 0.7 : v('c') < 0.2, ar: indie ? (v('ar') < 0.5 ? 'artist' : 'joint') : v('ar') < 0.25 ? 'joint' : 'label',
      master: indie && v('ms') < 0.35 ? 'shared' : 'label', reversionYears: indie && v('rv') < 0.5 ? 10 + Math.round(v('rv2') * 10) : 0,
      pubShare: lb.family === 'D' || major ? 0.5 : 0, share360: 0, albums: major ? 4 : 3, termMonths: major ? 48 : 36,
      tourSupport: money(s, Math.round(exp * (major ? 0.3 + v('t') * 0.4 : v('t') * 0.25) / 100) * 100),
      marketing: money(s, Math.round(exp * (major ? 0.4 + v('k') * 0.5 : 0.1 + v('k') * 0.25) / 100) * 100),
      scope: major ? 'world' : v('sc') < 0.5 ? 'region' : 'world', promises: [], clout: labelClout(s, lb.id),
    };
    if (p.model === '360') p.share360 = 0.15 + Math.round(v('36') * 2) * 0.05;
    if (p.model === 'licensing') { p.master = 'artist'; p.reversionYears = 2; }
    return p;
  });
}

export interface CompareRow { pkg: DealPackage; score: PackageScore; rank: number }
export interface Comparison { rows: CompareRow[]; weights: WeightInfo; best: CompareRow; mine?: CompareRow; verdict: L }

/** Lado a lado: pontua todos os pacotes com os pesos do artista e explica quem leva vantagem. */
export function comparePackages(s: GameState, act: Act, pkgs: DealPackage[]): Comparison {
  const wi = artistWeights(s, act);
  const rows = pkgs.map((pkg) => ({ pkg, score: scorePackage(s, act, pkg, wi), rank: 0 })).sort((a, b) => b.score.total - a.score.total);
  rows.forEach((r, i) => (r.rank = i + 1));
  const best = rows[0];
  const mine = rows.find((r) => r.pkg.from === 'player');
  let verdict: L = l('Sem concorrência na mesa.', 'No competition on the table.');
  if (mine && rows.length > 1) {
    if (mine === best) {
      const second = rows[1];
      verdict = fmtL(l('Sua proposta lidera; {r} vem atrás ({d} pontos).', 'Your offer leads; {r} trails ({d} points).'), { r: second.pkg.name, d: Math.round((mine.score.total - second.score.total) * 100) });
    } else {
      const gap = DIMS.map((d) => ({ d, x: (best.score.dims[d] - mine.score.dims[d]) * wi.w[d] })).sort((a, b) => b.x - a.x)[0];
      verdict = fmtL(l('{r} está na frente, sobretudo em {d}.', '{r} is ahead, mostly on {d}.'), { r: best.pkg.name, d: DIM_NAME[gap.d] });
    }
  }
  return { rows, weights: wi, best, mine, verdict };
}

/** Humor do mês do artista: variação escondida (−0,06..+0,06) que torna a fórmula menos óbvia. */
export function moodOf(s: GameState, act: Act): number {
  return (hu(s, `mood:${act.id}:${monthKey(s)}`) - 0.5) * 0.12;
}

// ---------------------------------------------------------------- integração com evaluateOffer
// Só pesa nas propostas montadas como pacote (o bot e os rivais seguem a avaliação antiga).

registerOfferMod('offers12', (s, act, o) => {
  if (!o.pk12) return null;
  const mine = packageFromOffer(s, o);
  const wi = artistWeights(s, act);
  const sc = scorePackage(s, act, mine, wi);
  // A&R e verba prometida (evaluateOffer não conhece) + sotaque pessoal dos pesos
  let delta = (mine.ar === 'artist' ? 0.4 : mine.ar === 'joint' ? 0.18 : 0) * wi.w.autonomy;
  const pledge = toReal(mine.tourSupport + mine.marketing, s.year) / Math.max(1, expectedAdvance(s, act));
  delta += clamp(pledge, 0, 1.5) * 0.45 * wi.w.commit;
  if (o.promises.length && s.memory.some((m) => m.actId === act.id && m.kind === 'broken_promise')) delta -= o.promises.length * 0.04;
  const rivals = rivalPackages(s, act);
  let reason: L | undefined;
  if (rivals.length) {
    const cmp = comparePackages(s, act, [mine, ...rivals]);
    if (cmp.best.pkg.from !== 'player') {
      delta -= clamp((cmp.best.score.total - sc.total) * 1.1, 0, 0.3);
      reason = cmp.verdict;
    } else delta += 0.03;
  }
  delta += moodOf(s, act);
  return { delta, reason };
});

// ---------------------------------------------------------------- compromissos depois da assinatura

export interface Pledge12 { actId: string; contractId: string; ar: ArApproval; tour: number; mkt: number; paid: number; months: number; broken?: boolean; week: number }
export interface Offers12State { pledges: Pledge12[]; seen: string[] }
declare module '../ext4' {
  interface Ext4 { offers12: Offers12State }
}
export function off12(s: GameState): Offers12State {
  const x = s as unknown as { x4: Record<string, unknown> };
  x.x4 ??= {};
  const st = (x.x4.offers12 ??= { pledges: [], seen: [] }) as Offers12State;
  st.pledges ??= []; st.seen ??= [];
  return st;
}
export const pledgeOf = (s: GameState, contractId?: string) => (contractId ? off12(s).pledges.find((p) => p.contractId === contractId) : undefined);

/** Parcela mensal (12 meses): marketing vira fama/embalo; apoio de turnê vira público. Sem caixa = promessa quebrada. */
export function payPledges(s: GameState): void {
  const st = off12(s);
  for (const o of s.offers) {
    if (o.status !== 'accepted' || !o.pk12 || st.seen.includes(o.id)) continue;
    st.seen.push(o.id);
    const act = s.acts[o.actId];
    if (!act?.contractId || act.owner !== 'player') continue;
    st.pledges.push({ actId: act.id, contractId: act.contractId, ar: o.pk12.ar, tour: o.pk12.tour, mkt: o.pk12.mkt, paid: 0, months: 0, week: s.week });
  }
  if (st.seen.length > 60) st.seen = st.seen.slice(-60);
  for (const p of st.pledges) {
    const act = s.acts[p.actId];
    const c = s.contracts[p.contractId];
    if (!act || !c || act.contractId !== p.contractId) continue;
    // A&R: quem queria liberdade e não tem perde paciência; quem tem a palavra final fica mais tranquilo
    const amb = mainAmbition(s, act);
    const free = amb === 'art' || amb === 'freedom' || amb === 'critics';
    if (p.ar === 'artist') act.trust = clamp(act.trust + 0.4, 0, 100);
    else if (p.ar === 'label' && free) act.trust = clamp(act.trust - 0.3, 0, 100);
    if (p.broken || p.months >= 12 || p.tour + p.mkt <= 0) continue;
    const due = Math.round((p.tour + p.mkt) / 12);
    if (s.player.cash < due) {
      p.broken = true;
      act.trust = clamp(act.trust - 14, 0, 100);
      s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
      remember(s, 'broken_promise', fmtL(l('O selo não pagou a verba prometida a {a}.', 'The label failed to pay {a} the pledged budget.'), { a: act.name }), { actId: act.id, important: true });
      notify(s, fmtL(l('Sem caixa para a verba prometida a {a}: promessa quebrada.', 'No cash for the budget pledged to {a}: promise broken.'), { a: act.name }), 'bad');
      continue;
    }
    post(s, `pledge12:${p.contractId}:${p.months}`, -due, 'marketing', `Verba contratual ${act.name}`);
    p.paid += due; p.months += 1;
    const exp = Math.max(1, expectedAdvance(s, act));
    const mk = toReal(p.mkt / 12, s.year) / exp;
    const tr = toReal(p.tour / 12, s.year) / exp;
    act.fame = clamp(act.fame + mk * 1.2 * (1 - act.fame / 100), 0, 100);
    act.momentum = clamp(act.momentum + mk * 6 + tr * 4, 0, 100);
    act.fans.casual += Math.round(tr * 600 + mk * 300);
    if (p.months === 12) notify(s, fmtL(l('Verba contratual de {a} cumprida: o artista sentiu o apoio.', '{a}\'s contractual budget delivered: the act felt supported.'), { a: act.name }), 'good');
    if (p.months === 12) act.trust = clamp(act.trust + 5, 0, 100);
  }
  st.pledges = st.pledges.filter((p) => s.contracts[p.contractId] && s.contracts[p.contractId].endWeek >= s.week);
}

registerSimHook('month', 'offers12', (s) => payPledges(s));
