// Rodada 12 — o dono de PLATAFORMA: proposta de valor, contratos por tamanho de detentor de direitos com
// renovação, planos pago/gratuito com anúncios, curadoria humana x recomendação, motivos de saída dos
// assinantes, modelo de repasse e transparência, exclusividades e dependência, política de conteúdo sintético.
// Estende platformMonth de ventures9. Suas escolhas de descoberta empurram artistas e cenas do mundo.

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerSimHook } from '../ext4';
import type { Act, GameState, Label } from '../types';
import { fmtL, money, notify, remember } from '../util';
import { standingOf } from './standing9';
import { funds, ventures, vpay, type Venture } from './ventures9';
import { activeAct, res, seedRng, v12, venture } from './ventures12';

export type Prop = 'broad' | 'niche' | 'discovery' | 'hifi' | 'closeness';
export type Crit = 'popular' | 'new' | 'diverse' | 'editorial';
export type Model = 'prorata' | 'usercentric';
export type Synth = 'allow' | 'label' | 'ban';
export type Size = 'major' | 'mid' | 'indie';
export interface Term { payout: number; until: number; excl: number }
export interface Renew { labelId: string; payout: number; mg: number; w: number }
export interface PlatX {
  prop: Prop; free: number; price: number; human: number; crit: Crit; model: Model; synth: Synth; curators: number; trust: number; trans: number; lastReport: number;
  terms: Record<string, Term>; churn: Record<string, number>; picks: { actId: string; why: L }[]; dil?: Renew; cool: number; conv: number; notes: L[];
}
export const PROPS: Record<Prop, { name: L; desc: L; target: number; churn: number; price: number }> = {
  broad: { name: l('Catálogo amplo', 'Broad catalog'), desc: l('"Tudo, em um só lugar": exige catálogo gigante e contratos com todos.', '"Everything in one place": needs a huge catalog and deals with everyone.'), target: 1.1, churn: 0, price: 1 },
  niche: { name: l('Nicho', 'Niche'), desc: l('Um gênero ou cena, catálogo menor, assinantes fiéis (churn baixo).', 'One genre or scene, smaller catalog, loyal subscribers (low churn).'), target: 0.7, churn: -0.006, price: 1.1 },
  discovery: { name: l('Descoberta', 'Discovery'), desc: l('Vende a curadoria: depende de curadores ou de um bom algoritmo.', 'Sells curation: depends on curators or a good algorithm.'), target: 0.95, churn: 0, price: 1 },
  hifi: { name: l('Alta fidelidade', 'Hi-fi'), desc: l('Som lossless: público que aceita preço premium, mas a tecnologia só amadurece depois de 2015.', 'Lossless sound: audience accepts premium pricing, but the tech matures after 2015.'), target: 0.6, churn: -0.002, price: 1.35 },
  closeness: { name: l('Artista–fã', 'Fan–artist closeness'), desc: l('Sessões, bastidores e repasse maior aos pequenos: lealdade e confiança dos artistas.', 'Sessions, backstage and higher payouts to small acts: loyalty and artist trust.'), target: 0.75, churn: -0.004, price: 1.05 },
};
export const CRIT_NAME: Record<Crit, L> = { popular: l('Popularidade', 'Popularity'), new: l('Novidade', 'Newness'), diverse: l('Diversidade de gêneros/cenas', 'Genre/scene diversity'), editorial: l('Curadoria editorial', 'Editorial curation') };
export const SIZE_NAME: Record<Size, L> = { major: l('Major', 'Major'), mid: l('Médio', 'Mid-size'), indie: l('Independente', 'Indie') };
export const SIZE_MIN: Record<Size, number> = { major: 0.7, mid: 0.62, indie: 0.55 };
export const sizeOf = (lb: Label): Size => (lb.family === 'A' || lb.roster.length >= 8 ? 'major' : lb.family === 'B' || lb.roster.length >= 4 ? 'mid' : 'indie');
export const synthOn = (s: GameState): boolean => s.year >= 2018;
export const hifiOk = (s: GameState): boolean => s.year >= 2015;

export const platOf = (s: GameState, vid: string): PlatX => (v12(s).plat[vid] ??= { prop: 'broad', free: 0, price: 1, human: 50, crit: 'popular', model: 'prorata', synth: 'label', curators: 0, trust: 50, trans: 0, lastReport: 0, terms: {}, churn: {}, picks: [], cool: 0, conv: 0, notes: [] });
const plat = (s: GameState, vid: string) => venture(s, vid, 'platform');
const pnote = (x: PlatX, t: L) => { x.notes.unshift(t); if (x.notes.length > 8) x.notes.pop(); };
export function termOf(s: GameState, v: Venture, x: PlatX, id: string): Term { return (x.terms[id] ??= { payout: v.payout ?? 0.65, until: s.year + 3, excl: 0 }); }
export function effPayout(s: GameState, x: PlatX, id: string, v: Venture): number {
  const lb = s.labels[id], t = x.terms[id];
  const sz = lb ? sizeOf(lb) : 'mid';
  return (t?.payout ?? v.payout ?? 0.65) + (x.model === 'usercentric' ? (sz === 'indie' ? 0.04 : sz === 'major' ? -0.03 : 0) : 0) + (x.prop === 'closeness' && sz === 'indie' ? 0.03 : 0);
}
export function catalogOf(s: GameState, v: Venture): { own: number; total: number } {
  const own = Object.values(s.releases).filter((q) => q.owner === 'player').length;
  const total = own + v.deals!.reduce((t, id) => t + (s.labels[id]?.roster.length ?? 0) * 8, 0);
  return { own, total };
}
export const dependence = (s: GameState, v: Venture, id: string): number => {
  const c = catalogOf(s, v);
  return c.total ? (s.labels[id]?.roster.length ?? 0) * 8 / c.total : 0;
};
export function discoveryQuality(s: GameState, v: Venture, x: PlatX): { dq: number; algo: number; cur: number } {
  const need = Math.ceil(1 + (v.subs ?? 0) / 200000);
  const cur = 0.85 * Math.min(1, x.curators / need);
  const algo = clamp((s.year - 2005) / 18, 0.1, 0.95) * Math.min(1, 0.5 + Math.log10((v.subs ?? 0) + 10) / 8);
  const h = x.human / 100;
  return { dq: h * cur + (1 - h) * algo, algo, cur };
}

export function configure(s: GameState, vid: string, o: Partial<Pick<PlatX, 'prop' | 'free' | 'price' | 'human' | 'crit' | 'model' | 'synth'>>): { ok: boolean; text: L } {
  const v = plat(s, vid), x = v && platOf(s, vid);
  if (!v || !x) return res(false, l('Inválido.', 'Invalid.'));
  if (o.prop && o.prop !== x.prop) { x.trust = clamp(x.trust - 3, 0, 100); v.rep = clamp(v.rep - 2, 0, 100); }
  if (o.synth && o.synth !== x.synth && !synthOn(s)) return res(false, l('Conteúdo sintético ainda não é um assunto nesta época.', 'Synthetic content is not an issue in this era yet.'));
  Object.assign(x, o);
  x.price = clamp(Math.round(x.price * 100) / 100, 0.7, 1.6); x.human = clamp(Math.round(x.human), 0, 100);
  return res(true, l('Configuração atualizada.', 'Configuration updated.'));
}
export const curatorCost = (s: GameState): number => money(s, 2500);
export function setCurators(s: GameState, vid: string, n: number): void { const x = v12(s).plat[vid]; if (x) x.curators = clamp(Math.round(n), 0, 6); }

export function buyExclusive(s: GameState, vid: string, labelId: string): { ok: boolean; text: L } {
  const v = plat(s, vid), x = v && platOf(s, vid), lb = s.labels[labelId];
  if (!v || !x || !lb || !v.deals!.includes(labelId)) return res(false, l('Só com gravadoras já licenciadas.', 'Only with labels already licensed.'));
  const t = termOf(s, v, x, labelId);
  if (t.excl > s.year) return res(false, l('Já é exclusivo.', 'Already exclusive.'));
  const c = money(s, 60000) * (sizeOf(lb) === 'major' ? 3 : sizeOf(lb) === 'mid' ? 1.5 : 0.8);
  if (funds(s, v.owner) < c) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -c, `excl:${vid}:${labelId}`, `Exclusividade ${lb.name}`, v);
  t.excl = s.year + 2;
  return res(true, fmtL(l('{b} lança com exclusividade na {v} por 2 anos. Atenção à dependência.', '{b} launches exclusively on {v} for 2 years. Mind the dependence.'), { b: lb.name, v: v.name }));
}

export type RenewMode = 'accept' | 'counter' | 'refuse' | 'exclusive';
/** Cenário: a gravadora exige melhores termos para renovar. */
export function resolveRenewal(s: GameState, r: Rng, vid: string, mode: RenewMode): { ok: boolean; text: L } {
  const v = plat(s, vid), x = v && platOf(s, vid), d = x?.dil, lb = d && s.labels[d.labelId];
  if (!v || !x || !d || !lb) return res(false, l('Nada a renovar.', 'Nothing to renew.'));
  const t = termOf(s, v, x, lb.id), dep = dependence(s, v, lb.id), st = standingOf(s, lb.id);
  const pay = (m: number) => { vpay(s, v.owner, -Math.round(d.mg * m), `mg:${vid}:${lb.id}`, `Garantia mínima ${lb.name}`, v); };
  if (mode !== 'refuse' && funds(s, v.owner) < d.mg * (mode === 'exclusive' ? 1.5 : mode === 'counter' ? 0.5 : 1)) return res(false, l('Sem dinheiro para a garantia mínima.', 'Not enough money for the minimum guarantee.'));
  if (mode === 'accept') { x.dil = undefined; pay(1); t.payout = d.payout; t.until = s.year + 3; st.trust = clamp(st.trust + 2, 0, 100); return res(true, fmtL(l('Você aceita: repasse de {b} sobe para {p}%. Margem menor, catálogo seguro.', 'You accept: {b}\'s payout rises to {p}%. Thinner margin, catalog secure.'), { b: lb.name, p: Math.round(d.payout * 100) })); }
  if (mode === 'exclusive') { x.dil = undefined; pay(1.5); t.payout = Math.round((d.payout - 0.03) * 100) / 100; t.until = s.year + 3; t.excl = s.year + 2; return res(true, fmtL(l('{b} aceita repasse de {p}% em troca de exclusividade de 2 anos. Seu destino agora depende dela.', '{b} takes {p}% in exchange for a 2-year exclusive. Your fate now depends on them.'), { b: lb.name, p: Math.round(t.payout * 100) })); }
  if (mode === 'counter') {
    x.dil = undefined;
    const p = clamp(0.5 - dep * 0.7 + v.rep / 250 + (x.trust - 50) / 300 + (v.deals!.length > 3 ? 0.1 : 0), 0.08, 0.85);
    if (r.chance(p)) { pay(0.5); t.payout = Math.round(((d.payout + t.payout) / 2) * 100) / 100; t.until = s.year + 2; return res(true, fmtL(l('Meio-termo fechado com {b}: {p}% por 2 anos.', 'Compromise with {b}: {p}% for 2 years.'), { b: lb.name, p: Math.round(t.payout * 100) })); }
    if (r.chance(0.5)) return pull(s, v, x, lb, l('A contraproposta azedou a conversa: a gravadora leva o catálogo embora.', 'The counteroffer soured talks: the label takes its catalog away.'));
    pay(1); t.payout = d.payout; t.until = s.year + 1; return res(false, fmtL(l('{b} endurece e só renova por 1 ano, no preço dela ({p}%).', '{b} hardens: 1-year renewal, at its price ({p}%).'), { b: lb.name, p: Math.round(d.payout * 100) }));
  }
  x.dil = undefined;
  return pull(s, v, x, lb, l('Você recusa. A gravadora cumpre a ameaça e retira o catálogo.', 'You refuse. The label makes good on its threat and pulls its catalog.'));
}
function pull(s: GameState, v: Venture, x: PlatX, lb: Label, why: L): { ok: boolean; text: L } {
  const dep = dependence(s, v, lb.id);
  v.deals = v.deals!.filter((q) => q !== lb.id); delete x.terms[lb.id];
  v.subs = Math.round(v.subs! * (1 - dep * 0.35));
  x.trust = clamp(x.trust + (sizeOf(lb) === 'major' ? 2 : 0), 0, 100);
  const t = fmtL(l('{w} Perda imediata de ~{p}% dos assinantes (dependência).', '{w} Immediate loss of ~{p}% subscribers (dependence).'), { w: why, p: Math.round(dep * 35) });
  pnote(x, t);
  return res(false, t);
}

export function publishReport(s: GameState, vid: string): { ok: boolean; text: L } {
  const v = plat(s, vid), x = v && platOf(s, vid);
  if (!v || !x) return res(false, l('Inválido.', 'Invalid.'));
  if (x.lastReport === s.year) return res(false, l('O relatório deste ano já saiu.', 'This year\'s report is already out.'));
  const c = money(s, 3000);
  if (funds(s, v.owner) < c) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -c, `rep:${vid}`, 'Relatório de transparência', v);
  x.lastReport = s.year; x.trans = 100;
  const p = v.payout ?? 0.65;
  const d = p >= 0.65 ? 8 : p >= 0.55 ? 2 : -7;
  x.trust = clamp(x.trust + d, 0, 100);
  if (d < 0) { v.rep = clamp(v.rep - 3, 0, 100); notify(s, fmtL(l('Artistas protestam contra os centavos por stream revelados no relatório de {v}.', 'Artists protest the cents-per-stream revealed in {v}\'s report.'), { v: v.name }), 'bad'); }
  return res(d >= 0, d >= 8 ? l('Transparência vira ponto forte: confiança +8.', 'Transparency becomes a strength: trust +8.') : d > 0 ? l('Relatório honesto, mas morno: confiança +2.', 'Honest but lukewarm report: trust +2.') : l('Os números expostos revelam repasse baixo: confiança −7. Transparência exige pagar o justo.', 'The exposed numbers show low payouts: trust −7. Transparency demands fair pay.'));
}

export function fanSession(s: GameState, r: Rng, vid: string, actId: string): { ok: boolean; text: L } {
  const v = plat(s, vid), x = v && platOf(s, vid), a = s.acts[actId];
  if (!v || !x || !activeAct(a)) return res(false, l('Inválido.', 'Invalid.'));
  if (x.cool > s.week) return res(false, l('Aguarde a próxima sessão.', 'Wait for the next session.'));
  const c = money(s, 2500);
  if (funds(s, v.owner) < c) return res(false, l('Sem dinheiro.', 'Not enough money.'));
  vpay(s, v.owner, -c, `fan:${vid}`, `Sessão com fãs: ${a.name}`, v);
  x.cool = s.week + 4;
  const k = x.prop === 'closeness' ? 2 : 1;
  a.momentum = clamp(a.momentum + 4 * k, 0, 100); x.trust = clamp(x.trust + k, 0, 100);
  if (r.chance(0.2 * k)) a.fame = clamp(a.fame + 1, 0, 100);
  const key = `${a.city}:${a.genre}`; if (a.fame < 40) s.scenes[key] = clamp((s.scenes[key] ?? 0) + 1.5 * k, 0, 100);
  return res(true, fmtL(l('Sessão exclusiva de {a} para assinantes{x}.', 'Exclusive {a} session for subscribers{x}.'), { a: a.name, x: x.prop === 'closeness' ? l(' (sua proposta amplifica o efeito)', ' (your proposition amplifies it)') : '' }));
}

const REASONS = ['price', 'catalog', 'discovery', 'quality', 'payouts', 'synth'] as const;
export const REASON_NAME: Record<(typeof REASONS)[number], L> = { price: l('Preço alto', 'High price'), catalog: l('Faltam músicas', 'Missing music'), discovery: l('Descoberta fraca', 'Weak discovery'), quality: l('Qualidade de áudio', 'Audio quality'), payouts: l('Desconfiança (repasses)', 'Distrust (payouts)'), synth: l('Conteúdo sintético', 'Synthetic content') };

function picks(s: GameState, r: Rng, v: Venture, x: PlatX): void {
  const n = 3 + v.level, reach = clamp((v.subs ?? 0) / 250000, 0.3, 2);
  const h = x.human / 100, hasCur = x.curators > 0;
  const pool = Object.values(s.acts).filter((a) => activeAct(a) && a.debutYear <= s.year && !(x.synth === 'ban' && a.archetype === 'synthetic'));
  const eff = x.crit === 'editorial' ? (hasCur ? 0.6 + 0.4 * h : 0.3) : x.crit === 'popular' ? 1 - h * 0.4 : 0.7 + (1 - h) * 0.3;
  let list: Act[] = [], why: L = l('', '');
  if (x.crit === 'popular') { list = [...pool].sort((a, b) => b.fame - a.fame).slice(0, n); why = l('Critério popularidade: quem já é grande leva mais ouvintes.', 'Popularity criterion: the already-big get more listeners.'); }
  else if (x.crit === 'new') { list = [...pool].filter((a) => s.year - a.debutYear <= 2).sort((a, b) => b.momentum - a.momentum).slice(0, n); why = l('Critério novidade: estreantes com momento alto.', 'Newness criterion: debutants with high momentum.'); }
  else if (x.crit === 'diverse') { const seen = new Set<string>(); for (const a of [...pool].sort((p, q) => p.fame - q.fame)) { if (!seen.has(a.genre) && list.length < n) { seen.add(a.genre); list.push(a); } } why = l('Critério diversidade: um destaque por gênero, os menores primeiro.', 'Diversity criterion: one pick per genre, smallest first.'); }
  else { list = [...pool].filter((a) => a.fame < 45).sort((a, b) => (b.potential + b.momentum) - (a.potential + a.momentum)).slice(0, n); if (!hasCur) list = list.slice(0, 1); why = hasCur ? l('Curadoria editorial: sua equipe aposta em quem tem potencial.', 'Editorial curation: your team bets on potential.') : l('Sem curadores, a curadoria editorial praticamente não existe.', 'Without curators, editorial curation barely exists.'); }
  x.picks = list.map((a) => ({ actId: a.id, why }));
  for (const a of list) {
    a.momentum = clamp(a.momentum + 2.5 * reach * eff, 0, 100);
    if (r.chance(0.06 * reach * eff)) a.fame = clamp(a.fame + 1, 0, 100);
    if (a.fame < 35) { const k = `${a.city}:${a.genre}`; s.scenes[k] = clamp((s.scenes[k] ?? 0) + 0.8 * reach * eff, 0, 100); }
  }
}

function platMonth12(s: GameState, r: Rng, v: Venture): void {
  const x = platOf(s, v.id), P = PROPS[x.prop];
  const dealIds = v.deals!.slice();
  for (const id of dealIds) termOf(s, v, x, id);
  for (const id of Object.keys(x.terms)) if (!v.deals!.includes(id)) delete x.terms[id];
  const gross = v.subs! * money(s, 8) * 0.25;
  const share = (id: string) => dependence(s, v, id);
  // preço e plano gratuito
  vpay(s, v.owner, gross * (x.price * P.price - 1), `price12:${v.id}`, `Ajuste de preço ${v.name}`, v);
  const freeUsers = v.subs! * x.free;
  const adRev = freeUsers * money(s, 0.9) * (0.7 + x.trust / 200);
  vpay(s, v.owner, adRev * (1 - (v.payout ?? 0.65) * 0.6), `freeads:${v.id}`, `Anúncios do plano gratuito ${v.name}`, v);
  // termos por detentor: diferença entre o contrato e o repasse global que ventures9 já cobrou
  let diff = 0;
  for (const id of dealIds) diff += share(id) * (effPayout(s, x, id, v) - (v.payout ?? 0.65));
  vpay(s, v.owner, -gross * diff * (dealIds.length ? 1 : 0), `terms12:${v.id}`, `Repasses contratuais ${v.name}`, v);
  // conteúdo sintético
  if (synthOn(s) && x.synth === 'allow') vpay(s, v.owner, gross * 0.03, `synth12:${v.id}`, `Catálogo sintético barato ${v.name}`, v);
  // saída de assinantes: motivos explicados
  const { dq } = discoveryQuality(s, v, x);
  const cat = catalogOf(s, v).total;
  const R: Record<string, number> = {
    price: Math.max(0, x.price * P.price - 1.05) * 0.06 * (x.prop === 'hifi' && hifiOk(s) ? 0.4 : 1),
    catalog: x.prop === 'broad' ? Math.max(0, (70 - cat) / 70) * 0.03 : Math.max(0, (30 - cat) / 30) * 0.015,
    discovery: Math.max(0, 0.55 - dq) * 0.05 * (x.prop === 'discovery' ? 1.6 : 1),
    quality: x.prop === 'hifi' && !hifiOk(s) ? 0.03 : 0,
    payouts: Math.max(0, 50 - x.trust) / 50 * 0.025,
    synth: synthOn(s) && x.synth === 'allow' ? (x.prop === 'niche' || x.prop === 'closeness' || x.prop === 'discovery' ? 0.012 : 0.005) : 0,
  };
  let tot = 0;
  for (const k of REASONS) { R[k] = Math.round(R[k] * 1000) / 10; tot += R[k]; }
  x.churn = R;
  const conv = freeUsers * 0.012 * (0.5 + dq);
  x.conv = Math.round(conv);
  const exclB = dealIds.reduce((t, id) => t + (termOf(s, v, x, id).excl > s.year ? share(id) * 0.25 : 0), 0);
  v.subs = Math.max(0, Math.round(v.subs! * (1 - tot / 100 * 0.4 + P.churn * 0.5 + exclB * 0.02 - x.free * 0.003) + conv));
  v.subs = Math.round(v.subs * (1 + (P.target - 1) * 0.02));
  // confiança: repasse, transparência, sintético
  const tgt = 40 + ((v.payout ?? 0.65) - 0.5) * 80 + (x.trans > 0 ? 6 : 0) + (x.synth === 'ban' && synthOn(s) ? 6 : x.synth === 'allow' && synthOn(s) ? -6 : 0) + (x.model === 'usercentric' ? 4 : 0) + (x.prop === 'closeness' ? 5 : 0);
  x.trust = clamp(x.trust + (tgt - x.trust) * 0.1, 0, 100);
  x.trans = Math.max(0, x.trans - 8);
  if (v.subs > 0) picks(s, r, v, x);
  // insatisfação e renovação
  for (const id of dealIds) {
    const lb = s.labels[id], t = x.terms[id];
    if (!lb || !t) continue;
    const gap = SIZE_MIN[sizeOf(lb)] - effPayout(s, x, id, v);
    if (gap > 0.02 && r.chance(gap * 0.6)) { const o = pull(s, v, x, lb, fmtL(l('{b} acha o repasse abaixo do praticado para {k} e sai.', '{b} finds the payout below what {k} labels get and leaves.'), { b: lb.name, k: SIZE_NAME[sizeOf(lb)] })); notify(s, o.text, 'bad'); }
  }
  if (!x.dil) {
    const due = v.deals!.filter((id) => s.labels[id] && termOf(s, v, x, id).until <= s.year && (s.year > termOf(s, v, x, id).until || s.month >= 6)).sort((a, b) => share(b) - share(a))[0];
    if (due) {
      const lb = s.labels[due], t = x.terms[due], sz = sizeOf(lb);
      const payout = Math.round(clamp(Math.max(t.payout, SIZE_MIN[sz]) + (sz === 'major' ? 0.06 : sz === 'mid' ? 0.04 : 0.02), 0.4, 0.88) * 100) / 100;
      x.dil = { labelId: due, payout, mg: Math.round(money(s, 30000 + lb.roster.length * 4000) * (sz === 'major' ? 2 : 1)), w: s.week };
      notify(s, fmtL(l('{b} ({k}) exige melhores termos para renovar: repasse {p}% e garantia mínima. Decida na plataforma.', '{b} ({k}) demands better terms to renew: {p}% payout and a minimum guarantee. Decide at the platform.'), { b: lb.name, k: SIZE_NAME[sz], p: Math.round(payout * 100) }), 'event');
    }
  } else if (s.week - x.dil.w > 12) {
    const lb = s.labels[x.dil.labelId], t = lb && termOf(s, v, x, lb.id);
    if (lb && t) { t.payout = x.dil.payout; t.until = s.year + 3; vpay(s, v.owner, -x.dil.mg, `mg:${v.id}:${lb.id}`, `Garantia mínima ${lb.name}`, v); notify(s, fmtL(l('Sem resposta, {b} renova nos termos dos advogados dela.', 'With no reply, {b} renews on its lawyers\' terms.'), { b: lb.name }), 'bad'); }
    x.dil = undefined;
  }
  // curadores humanos
  vpay(s, v.owner, -x.curators * curatorCost(s), `cur12:${v.id}`, `Curadores ${v.name}`, v);
  if (v.subs > 500000 && s.month === 0) remember(s, 'plat12', fmtL(l('{v} passa de {n} mil assinantes.', '{v} passes {n}k subscribers.'), { v: v.name, n: Math.floor(v.subs / 1000) }));
}

registerSimHook('month', 'ventures12:platform', (s) => {
  const r = seedRng(s, 'ventures12:platform');
  for (const v of ventures(s).list) if (v.kind === 'platform') platMonth12(s, r, v);
});
