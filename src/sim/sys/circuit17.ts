// Rodada 17 (F) — Circuito: festivais, empresários, prêmios e extras de negócio.
// • Guerra de headliners: na primavera dois festivais disputam o seu maior ato com cachê inflado e
//   exclusividade — aceitar um recusa o outro (que guarda mágoa: seus atos ficam fora dele por 2 anos).
// • Turnê de reunião (extra): bandas separadas/aposentadas há 8+ anos com fama recebem proposta; você banca
//   a garantia; os membros topam conforme tempo, dinheiro e mágoa (holds17); nostalgia paga.
// • Financiamento coletivo (extra, 2009+; 2003+ no jazz): os fãs pagam o disco antes — vira PROMESSA
//   (holds17). Entregou em 12 meses: fãs mais fiéis. Não entregou: escândalo de dinheiro e mágoa.
// • Prêmios entram na avaliação do selo (sale17); empresários protegem imagem (image17) e acionam
//   cláusula de pessoa-chave na venda do selo (sale17).
// Geradores próprios por mês.

import { Rng, clamp } from '../../core/rng';
import { FESTIVALS } from '../../data/catalog';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { grantHold, holdsBetween } from '../holds17';
import { scandal } from '../scandal17';
import type { Act, GameState } from '../types';
import { fmtL, money, notify, nextId, post } from '../util';
import { acceptInvite, declineInvite, festFee, fest8 } from './fests8';

export interface War17 { id: string; act: string; a: string; b: string; fa: number; fb: number; until: number }
export interface Reunion17 { id: string; act: string; cost: number; p: number; est: number; until: number }
export interface Crowd17 { act: string; goal: number; raised: number; start: number; due: number; hold?: string; done?: 'ok' | 'broken' }
export interface C17 { wars: War17[]; snub: Record<number, number>; reunions: Reunion17[]; reunited: Record<string, number>; crowd: Crowd17[]; log: { y: number; t: L }[] }
declare module '../ext4' { interface Ext4 { circ17: C17 } }
const fresh = (): C17 => ({ wars: [], snub: {}, reunions: [], reunited: {}, crowd: [], log: [] });
registerExt4('circ17', fresh);
export const c17 = (s: GameState): C17 => { const x = s.x4 as unknown as { circ17?: C17 }; return (x.circ17 ??= fresh()); };
const log = (s: GameState, t: L) => { const st = c17(s); st.log.unshift({ y: s.year, t }); if (st.log.length > 30) st.log.pop(); };
const $ = (v: number) => `$${Math.round(v / 100).toLocaleString('en-US')}`;

// ---------------------------------------------------------------- guerra de headliners

export function pickWar(s: GameState, id: string, side: 'a' | 'b'): L | null {
  const st = c17(s), w = st.wars.find((x) => x.id === id);
  if (!w || w.until < s.week) return l('Proposta expirada.', 'Offer expired.');
  const inv = side === 'a' ? w.a : w.b, other = side === 'a' ? w.b : w.a;
  const otherFi = fest8(s).invites.find((x) => x.id === other)?.fi;
  const e = acceptInvite(s, inv);
  if (e) return e;
  declineInvite(s, other);
  if (otherFi !== undefined) st.snub[otherFi] = s.year + 2;
  st.wars = st.wars.filter((x) => x !== w);
  const a = s.acts[w.act];
  const t = fmtL(l('{a} fecha exclusividade de headliner; {o} fica de fora e guarda mágoa.', '{a} signs an exclusive headline slot; {o} is left out and holds a grudge.'), { a: a?.name ?? '', o: otherFi !== undefined ? FESTIVALS[otherFi]?.name ?? '' : '' });
  log(s, t);
  emitFact(s, { kind: 'deal', actors: [w.act, 'player'], severity: 45, visibility: 'public', tags: ['deal', 'festival'], text: t, src: 'circuit17' });
  return null;
}
export const snubbed = (s: GameState, fi: number): boolean => (c17(s).snub[fi] ?? 0) >= s.year;

function warMonth(s: GameState, r: Rng): void {
  const st = c17(s);
  st.wars = st.wars.filter((w) => w.until >= s.week);
  // festival preterido não convida mais seus atos por 2 anos
  const f0 = fest8(s);
  f0.invites = f0.invites.filter((x) => !(snubbed(s, x.fi) && s.acts[x.actId]?.owner === 'player'));
  if (s.month !== 2 || st.wars.length) return;
  const star = Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand && a.fame >= 60 && (a.status === 'active' || a.status === 'emerging')).sort((a, b) => b.fame - a.fame)[0];
  if (!star) return;
  const f8 = fest8(s);
  const eds = f8.editions.filter((e) => !e.done && e.year === s.year && e.month > s.month && !e.lineup.some((x) => x.actId === star.id) && !snubbed(s, e.fi) && FESTIVALS[e.fi]);
  if (eds.length < 2) return;
  const two = eds.map((e) => ({ e, v: FESTIVALS[e.fi].prestige + (FESTIVALS[e.fi].focus.includes(familyOf(star.genre)) ? 20 : 0) + r.next() * 10 })).sort((a, b) => b.v - a.v).slice(0, 2);
  const mk = (fi: number) => { const fee = Math.round(festFee(s, FESTIVALS[fi], star, 'headline') * r.float(1.25, 1.6)); const id = nextId(s, 'fi'); f8.invites.push({ id, fi, actId: star.id, tier: 'headline', fee, expires: s.week + 6 }); return { id, fee }; };
  const A = mk(two[0].e.fi), B = mk(two[1].e.fi);
  st.wars.push({ id: `war17:${s.year}`, act: star.id, a: A.id, b: B.id, fa: A.fee, fb: B.fee, until: s.week + 6 });
  notify(s, fmtL(l('Guerra de headliners: {f1} e {f2} disputam {a} com exclusividade.', 'Headliner war: {f1} and {f2} fight over {a} with exclusivity.'), { f1: FESTIVALS[two[0].e.fi].name, f2: FESTIVALS[two[1].e.fi].name, a: star.name }), 'event');
}

// ---------------------------------------------------------------- reunião

const alive = (s: GameState, a: Act) => a.members.filter((id) => s.persons[id]?.alive);
export function reunionCands(s: GameState): Act[] {
  return Object.values(s.acts).filter((a) => (a.status === 'split' || a.status === 'retired') && a.fame >= 40 && alive(s, a).length >= 2 && s.week - a.lastRelease > 416 && (c17(s).reunited[a.id] ?? 0) < s.year - 5);
}
export function reunionTerms(s: GameState, a: Act): { cost: number; p: number; est: number; why: [L, number][] } {
  const yrs = Math.max(0, (s.week - a.lastRelease) / 52);
  const cost = money(s, 20000 + a.fame * a.fame * 120);
  const grudge = alive(s, a).reduce((t, id) => t + holdsBetween(s, id, 'player').filter((h) => h.kind === 'grievance').length, 0);
  const why: [L, number][] = [[l('Base', 'Base'), 0.35], [fmtL(l('{y} anos separados: saudade e contas', '{y} years apart: nostalgia and bills'), { y: Math.round(yrs) }), Math.min(0.25, yrs / 60)], [l('Garantia generosa', 'Generous guarantee'), 0.1]];
  if (grudge) why.push([l('Mágoas com você', 'Grudges against you'), -0.15 * grudge]);
  if (a.status === 'split') why.push([l('Separação foi briga', 'The split was a fight'), -0.1]);
  const p = clamp(why.reduce((t, x) => t + x[1], 0), 0.05, 0.9);
  const est = Math.round(money(s, a.fame * a.fame * 420) * (1 + Math.min(1, yrs / 25)));
  return { cost, p, est, why };
}
export function stageReunion(s: GameState, actId: string): { ok: boolean; text: L } {
  const a = s.acts[actId];
  if (!a || !reunionCands(s).includes(a)) return { ok: false, text: l('Indisponível.', 'Unavailable.') };
  const T = reunionTerms(s, a);
  if (s.player.cash < T.cost) return { ok: false, text: l('Caixa insuficiente para a garantia.', 'Not enough cash for the guarantee.') };
  const st = c17(s);
  st.reunited[a.id] = s.year;
  const r = Rng.fromSeed(`${s.config.seed}:reu17:${a.id}:${s.year}`);
  if (!r.chance(T.p)) {
    post(s, `reu17x:${a.id}`, -Math.round(T.cost * 0.1), 'live', `Advogados da reunião: ${a.name}`);
    const t = fmtL(l('{a}: um dos membros vetou a reunião. Você paga só os advogados.', '{a}: one member vetoed the reunion. You pay only the lawyers.'), { a: a.name });
    log(s, t);
    return { ok: false, text: t };
  }
  const rev = Math.round(T.est * r.float(0.7, 1.35));
  post(s, `reu17:${a.id}`, rev - T.cost, 'live', `Turnê de reunião: ${a.name}`);
  a.fame = clamp(a.fame + 6, 0, 100); a.fans.casual = Math.round(a.fans.casual * 1.1); a.momentum = clamp(a.momentum + 20, 0, 100);
  for (const id of alive(s, a)) grantHold(s, { holder: 'player', target: id, kind: 'favor', strength: 30, months: 36, src: 'circuit17', text: fmtL(l('Você reuniu {a} e encheu o bolso de todo mundo.', 'You reunited {a} and filled everyone\'s pockets.'), { a: a.name }), quiet: true });
  const t = fmtL(l('Turnê de reunião de {a}: {r} de bilheteria, lucro de {p}. A nostalgia vende.', '{a} reunion tour: {r} gross, {p} profit. Nostalgia sells.'), { a: a.name, r: $(rev), p: $(rev - T.cost) });
  log(s, t);
  emitFact(s, { kind: 'show', actors: [a.id, 'player'], severity: 60, visibility: 'public', tags: ['good', 'reunion'], text: t, src: 'circuit17' });
  return { ok: true, text: t };
}

// ---------------------------------------------------------------- financiamento coletivo

export const crowdOpen = (s: GameState, a: Act) => s.year >= 2009 || (s.year >= 2003 && familyOf(a.genre) === 'blues_jazz');
export function crowdEst(s: GameState, a: Act): number { return Math.round(a.fans.core * money(s, 9) * (0.5 + a.trust / 100) + a.fans.active * money(s, 0.4)); }
export function launchCrowd(s: GameState, actId: string, goal: number): { ok: boolean; text: L } {
  const a = s.acts[actId];
  if (!a || (a.owner !== 'player' && !a.playerBand)) return { ok: false, text: l('Ato não é seu.', 'Not your act.') };
  if (!crowdOpen(s, a)) return { ok: false, text: l('Financiamento coletivo ainda não existe.', 'Crowdfunding does not exist yet.') };
  const st = c17(s);
  if (st.crowd.some((c) => c.act === actId && !c.done)) return { ok: false, text: l('Já há uma campanha em aberto.', 'A campaign is already open.') };
  const r = Rng.fromSeed(`${s.config.seed}:crowd17:${actId}:${s.week}`);
  const raised = Math.round(crowdEst(s, a) * r.float(0.7, 1.3));
  if (raised < goal) {
    a.momentum = clamp(a.momentum - 3, 0, 100);
    const t = fmtL(l('Campanha de {a} não bateu a meta ({r} de {g}): tudo ou nada — nada.', '{a}\'s campaign missed its goal ({r} of {g}): all or nothing — nothing.'), { a: a.name, r: $(raised), g: $(goal) });
    log(s, t);
    return { ok: false, text: t };
  }
  post(s, `crowd17:${actId}:${s.week}`, Math.round(raised * 0.92), 'financing', `Financiamento coletivo: ${a.name}`);
  const h = grantHold(s, { holder: actId, target: 'player', kind: 'promise', strength: 50, months: 14, src: 'circuit17', text: fmtL(l('Os fãs pagaram adiantado o disco de {a}: entregar em 12 meses.', 'Fans prepaid {a}\'s record: deliver within 12 months.'), { a: a.name }) });
  st.crowd.push({ act: actId, goal, raised, start: s.week, due: s.week + 52, hold: h.id });
  const t = fmtL(l('Fãs de {a} financiam o próximo disco: {r} arrecadados (taxa da plataforma 8%). Agora é entregar.', '{a} fans fund the next record: {r} raised (8% platform fee). Now deliver.'), { a: a.name, r: $(raised) });
  log(s, t);
  emitFact(s, { kind: 'deal', actors: [actId, 'player'], severity: 40, visibility: 'public', tags: ['good', 'fans', 'crowdfunding'], text: t, src: 'circuit17' });
  return { ok: true, text: t };
}

function crowdMonth(s: GameState): void {
  for (const c of c17(s).crowd) {
    if (c.done) continue;
    const a = s.acts[c.act];
    if (!a) { c.done = 'broken'; continue; }
    const delivered = Object.values(s.releases).some((r) => r.actId === c.act && r.week > c.start && r.type !== 'single');
    if (delivered) {
      c.done = 'ok';
      a.fans.core = Math.round(a.fans.core * 1.05); a.trust = clamp(a.trust + 4, 0, 100);
      log(s, fmtL(l('{a} entregou o disco financiado pelos fãs: promessa cumprida.', '{a} delivered the fan-funded record: promise kept.'), { a: a.name }));
    } else if (s.week > c.due) {
      c.done = 'broken';
      a.fans.core = Math.round(a.fans.core * 0.9);
      const t = fmtL(l('Um ano depois, nada do disco de {a} que os fãs pagaram. "Golpe", dizem nas redes.', 'A year later, still no {a} record the fans paid for. "Scam", they say online.'), { a: a.name });
      log(s, t);
      scandal(s, a.id, 'money', 35, t, {});
    }
  }
}

// ---------------------------------------------------------------- reunião: propostas de promotores

function reunionMonth(s: GameState, r: Rng): void {
  const st = c17(s);
  st.reunions = st.reunions.filter((x) => x.until >= s.week);
  if (st.reunions.length >= 2 || !r.chance(0.15)) return;
  const cs = reunionCands(s).filter((a) => !st.reunions.some((x) => x.act === a.id)).sort((a, b) => b.fame - a.fame).slice(0, 5);
  if (!cs.length) return;
  const a = r.pick(cs), T = reunionTerms(s, a);
  st.reunions.push({ id: `reu:${a.id}:${s.week}`, act: a.id, cost: T.cost, p: T.p, est: T.est, until: s.week + 12 });
  notify(s, fmtL(l('Promotores sondam: e uma turnê de reunião de {a}? (Negócios → Circuito)', 'Promoters ask: what about an {a} reunion tour? (Business → Circuit)'), { a: a.name }), 'info');
}

registerSimHook('month', 'circuit17', (s) => {
  const r = Rng.fromSeed(`${s.config.seed}:circ17:${s.year}:${s.month}`);
  warMonth(s, r);
  reunionMonth(s, r);
  crowdMonth(s);
});
