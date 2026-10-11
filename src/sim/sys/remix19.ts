// Rodada 19 (Frente 9.4) — REMIX, DJs E WHITE LABELS (`remix19`). O remix de 12" (1975+) pega uma faixa ANTIGA (de
// preferência um fracasso) e a leva às pistas: chance pelo encaixe do DJ com o gênero (media18 djFit18), fama do DJ,
// qualidade da faixa e o teste de pista do white label (1985+, prensagem anônima: barata, mede a pista, pode vazar).
// Remix que pega → `remix_hit` (vendas por 4 meses, calor no sucesso tardio do revival19, fama do DJ) e, para o seu
// ato, convite de RESIDÊNCIA de DJ (Paradise Garage 1977–87, Haçienda 1982–97, Ibiza 1989+ na temporada, Berlim 1991+,
// Las Vegas 2012+ ou a sua própria casa do venues17) → `dj_residency` (cachê mensal, fama, cansaço; casa própria ganha
// reputação). DJs também pedem para remixar seus fracassos antigos (Caixa rmx19_offer: deixar 50/50, comprar o remix,
// recusar). Ouve media18: concurso de remix (o DJ vencedor cobra metade) e nº 1 nas pistas (convite de residência).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerDeadline } from '../calendar19';
import { registerConseq18 } from '../decide18';
import { registerExplain, type WhyPart } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact, onFact } from '../facts17';
import { pushInbox18, registerInboxKind } from '../inbox18';
import { rng19 } from '../rng19';
import { addStress } from '../stress17';
import type { Act, GameState, Release } from '../types';
import { fmtL, money, playerActs, post } from '../util';
import { headline19 } from './factlink19';
import { addHype } from './hype12';
import { djFee18, djFit18, ensureDjs18, media18, type Dj18 } from './media18';
import { cnt19, link19, log19, mineA19, mineR19, safe19, usd19, xs19, type Log19 } from './mkb19';
import { v17, vdef } from './venues17';

export const REMIX_FROM19 = 1975;
export const WHITE_FROM19 = 1985;
export type ResV19 = 'garage' | 'hacienda' | 'ibiza' | 'berlin' | 'vegas' | 'own';
export const RES19: Record<ResV19, { name: L; city: string; from: number; to?: number; fee: number; fame: number; sea?: [number, number]; real: L }> = {
  garage: { name: l('Paradise Garage (Nova York)', 'Paradise Garage (New York)'), city: 'nyc', from: 1977, to: 1987, fee: 1500, fame: 0.8, real: l('Larry Levan tocou lá de 1977 a 1987; o som da casa virou "garage".', 'Larry Levan played there 1977–1987; the house sound became "garage".') },
  hacienda: { name: l('Haçienda (Manchester)', 'Haçienda (Manchester)'), city: 'manchester', from: 1982, to: 1997, fee: 1200, fame: 0.7, real: l('Casa da Factory Records; noites de acid house em 1988.', 'Factory Records\' club; acid-house nights in 1988.') },
  ibiza: { name: l('Superclube em Ibiza (temporada)', 'Ibiza superclub (season)'), city: 'ibiza', from: 1989, fee: 6000, fame: 1.2, sea: [5, 9], real: l('Amnesia, Pacha, Ku/Privilege: residências de verão de junho a outubro.', 'Amnesia, Pacha, Ku/Privilege: summer residencies June to October.') },
  berlin: { name: l('Clube de techno em Berlim', 'Berlin techno club'), city: 'berlin', from: 1991, fee: 2500, fame: 0.9, real: l('Tresor (1991), depois Berghain (2004): noites de fim de semana sem fim.', 'Tresor (1991), later Berghain (2004): endless weekend nights.') },
  vegas: { name: l('Residência em Las Vegas', 'Las Vegas residency'), city: 'lasvegas', from: 2012, fee: 30000, fame: 1.5, real: l('A era EDM levou DJs a contratos de cassino milionários (Hakkasan, Wynn, 2013+).', 'The EDM era took DJs to million-dollar casino deals (Hakkasan, Wynn, 2013+).') },
  own: { name: l('Sua própria casa', 'Your own venue'), city: '', from: 1975, fee: 800, fame: 0.5, real: l('A sua casa ganha reputação com uma noite fixa de DJ.', 'Your venue gains reputation with a fixed DJ night.') },
};
export interface Rmx19 { id: string; rel: string; dj: string; djn: string; w: number; due: number; k: 'club' | 'offer'; split: number; ok?: boolean; until?: number; base?: number; mo?: number; u?: number; v?: number }
export interface Res19 { id: string; act: string; v: ResV19; own?: string; from: number; until: number; fee: number; earned: number }
export interface Remix19 extends Log19 { rx: Rmx19[]; res: Res19[]; wl: Record<string, [number, number, number]>; disc: Record<string, number>; resAsk: Record<string, number>; seq: number }
declare module '../ext4' { interface Ext4 { remix19: Remix19 } }
const fresh = (): Remix19 => ({ rx: [], res: [], wl: {}, disc: {}, resAsk: {}, seq: 0, log: [], n: {} });
registerExt4('remix19', fresh);
export const rmx19 = (s: GameState): Remix19 => xs19(s, 'remix19', fresh);
const rng = (s: GameState) => rng19(s, 'remix19', () => Rng.fromSeed(`${s.config.seed}|rmx19|${s.week}`));
export const remixOpen19 = (s: GameState): boolean => s.year >= REMIX_FROM19;
export const whiteOpen19 = (s: GameState): boolean => s.year >= WHITE_FROM19;
/** Faixa antiga elegível para remix de catálogo (3+ anos). */
export const remixable19 = (s: GameState, rel?: Release): rel is Release => !!rel && !rel.reissueOf && s.year - rel.year >= 3 && rel.q >= 30 && !!s.acts[rel.actId];
const flop = (rel: Release) => !rel.peak || rel.peak > 20;
const activeRx = (s: GameState, relId: string) => rmx19(s).rx.find((x) => x.rel === relId && (x.ok === undefined || (x.until ?? 0) > s.week));

/** Chance de o remix pegar, com o porquê. */
export function remixOdds19(s: GameState, rel: Release, dj: Dj18): { p: number; why: WhyPart[] } {
  const fit = djFit18(s, dj, rel), wl = rmx19(s).wl[rel.id];
  const why: WhyPart[] = [
    { label: l('Base', 'Base'), value: 0.12, fmt: 'pct' },
    { label: l('Encaixe do DJ com o gênero', 'DJ fit with the genre'), value: fit * 0.25, fmt: 'pct' },
    { label: fmtL(l('Fama do DJ ({f})', 'DJ fame ({f})'), { f: Math.round(dj.fame) }), value: dj.fame / 400, fmt: 'pct' },
    { label: fmtL(l('Qualidade da faixa ({q})', 'Track quality ({q})'), { q: Math.round(rel.q) }), value: (rel.q - 50) / 300, fmt: 'pct' },
  ];
  if (flop(rel)) why.push({ label: l('Fracasso na época: a história "injustiçada" ajuda', 'A flop back then: the "overlooked gem" story helps'), value: 0.05, fmt: 'pct', tone: 'good' });
  if (wl) why.push({ label: fmtL(l('Teste de white label: pista {v}/100', 'White-label test: floor {v}/100'), { v: wl[0] }), value: (wl[0] - 50) / 250, fmt: 'pct', tone: wl[0] >= 50 ? 'good' : 'bad' });
  const p = clamp(why.reduce((t, x) => t + Number(x.value ?? 0), 0), 0.05, 0.85);
  return { p, why };
}
const remixCost19 = (s: GameState, dj: Dj18) => Math.round(djFee18(s, dj) * 0.8 * (rmx19(s).disc[dj.id] ? 0.5 : 1));
export const remixCostOf19 = remixCost19;

/** Encomendar remix de clube de uma faixa antiga sua (sai em 1 mês). */
export function remix19(s: GameState, relId: string, djId: string): L | null {
  const rel = s.releases[relId];
  if (!remixOpen19(s)) return l('O remix de 12" nasce com a disco, em 1975.', 'The 12" remix is born with disco, in 1975.');
  if (!mineR19(s, rel) || !remixable19(s, rel)) return l('Escolha uma faixa sua com 3+ anos.', 'Pick a track of yours that is 3+ years old.');
  if (activeRx(s, relId)) return l('Esta faixa já tem um remix na pista.', 'This track already has a remix out.');
  const dj = ensureDjs18(s).find((d) => d.id === djId);
  if (!dj) return l('Escolha um DJ.', 'Pick a DJ.');
  const c = remixCost19(s, dj);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `rmx19:${relId}:${s.week}`, -c, 'recording', `Remix de catálogo ${dj.name}: ${rel.title}`);
  const st = rmx19(s);
  st.rx.push({ id: `rx${++st.seq}`, rel: relId, dj: dj.id, djn: dj.name, w: s.week, due: s.week + 4, k: 'club', split: 1 });
  cnt19(st, 'club');
  return null;
}
function resolveRx(s: GameState, x: Rmx19, r: Rng): void {
  const rel = s.releases[x.rel], dj = media18(s).djs.find((d) => d.id === x.dj);
  if (!rel) { x.ok = false; return; }
  const p = dj ? remixOdds19(s, rel, dj).p : 0.2;
  x.ok = r.chance(p);
  const st = rmx19(s), a = s.acts[rel.actId];
  if (!x.ok) {
    log19(s, st, fmtL(l('O remix de "{t}" por {d} passa despercebido nas pistas.', '{d}\'s remix of "{t}" goes unnoticed in the clubs.'), { t: rel.title, d: x.djn }));
    return;
  }
  x.until = s.week + 17; x.mo = 0; x.u = 0; x.v = 0;
  x.base = Math.round(12000 * (0.5 + rel.q / 100) * (0.6 + (dj?.fame ?? 30) / 100) * (s.year >= 2008 ? 1.4 : 1));
  if (dj) { dj.fame = clamp(dj.fame + 8, 0, 100); dj.hits++; }
  cnt19(st, 'hit');
  const tx = fmtL(l('Remix de {d} faz "{t}" ({y}) de {a} explodir nas pistas.', '{d}\'s remix makes "{t}" ({y}) by {a} explode in the clubs.'), { d: x.djn, t: rel.title, y: rel.year, a: a?.name ?? '?' });
  log19(s, st, tx);
  emitFact(s, { kind: 'remix_hit', actors: [rel.actId, mineR19(s, rel) ? 'player' : rel.owner], severity: Math.round(30 + (a?.fame ?? 0) / 5 + (flop(rel) ? 6 : 0)), visibility: 'public', tags: ['remix19', x.k, flop(rel) ? 'flop' : 'hit', 'good'], text: tx, src: 'remix19', data: { rel: rel.id, dj: x.dj } });
}

/** White label: prensagem anônima para testar a pista (barata; pode vazar). */
export const whiteCost19 = (s: GameState) => money(s, 450);
export function whiteLabel19(s: GameState, relId: string): L | null {
  const rel = s.releases[relId], st = rmx19(s);
  if (!whiteOpen19(s)) return l('White labels são da era house/techno (1985+).', 'White labels belong to the house/techno era (1985+).');
  if (!mineR19(s, rel)) return l('Lançamento inválido.', 'Invalid release.');
  if (st.wl[relId] && s.week - st.wl[relId][1] < 26) return l('Já testado neste semestre.', 'Already tested this half-year.');
  const c = whiteCost19(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `wl19:${relId}:${s.week}`, -c, 'manufacturing', `White label: ${rel.title}`);
  const r = rng(s), djs = ensureDjs18(s);
  const fit = djs.length ? Math.max(...djs.map((d) => djFit18(s, d, rel))) : 0.5;
  const v = Math.round(clamp(rel.q * 0.55 + fit * 35 + r.normal(0, 12), 0, 100));
  const leak = r.chance(0.15) ? 1 : 0;
  st.wl[relId] = [v, s.week, leak];
  cnt19(st, 'white');
  const tx = fmtL(l('Um 12" sem rótulo de "{t}" circula entre DJs: pista {v}/100{x}.', 'An unlabelled 12" of "{t}" circulates among DJs: floor {v}/100{x}.'), { t: rel.title, v, x: leak ? l(' — e vazou em pirata', ' — and it leaked as a bootleg') : '' });
  log19(s, st, tx);
  emitFact(s, { kind: 'white_label', actors: [rel.actId, 'player'], severity: 15 + Math.round(v / 6), visibility: 'rumor', tags: ['remix19', v >= 60 ? 'good' : 'mixed', ...(leak ? ['leak'] : [])], text: tx, src: 'remix19', data: { rel: rel.id, v, leak } });
  return null;
}

// ---------------------------------------------------------------- residências de DJ

export const resOpen19 = (s: GameState): ResV19[] => (Object.keys(RES19) as ResV19[]).filter((k) => s.year >= RES19[k].from && (!RES19[k].to || s.year <= RES19[k].to!) && (k !== 'own' || v17(s).own.length > 0));
export const resFee19 = (s: GameState, k: ResV19, a: Act) => money(s, RES19[k].fee * (0.5 + a.fame / 80));
/** O ato pode ser residente (é DJ/eletrônico ou tem remix/nº 1 nas pistas). */
export function djAct19(s: GameState, a?: Act): boolean {
  if (!a) return false;
  if (a.members.some((p) => s.persons[p]?.role === 'dj')) return true;
  return rmx19(s).rx.some((x) => x.ok && s.releases[x.rel]?.actId === a.id) || Object.keys(media18(s).clubTop ?? {}).some((id) => s.releases[id]?.actId === a.id);
}
export function residency19(s: GameState, actId: string, k: ResV19, months = 6): L | null {
  const a = s.acts[actId], st = rmx19(s);
  if (!mineA19(a)) return l('Ato inválido.', 'Invalid act.');
  if (!resOpen19(s).includes(k)) return l('Esse clube não existe nesta época.', 'That club does not exist in this era.');
  if (st.res.some((x) => x.act === actId && x.until > s.week)) return l('O ato já tem residência.', 'The act already has a residency.');
  const own = k === 'own' ? v17(s).own[0]?.id : undefined;
  const x: Res19 = { id: `rs${++st.seq}`, act: actId, v: k, own, from: s.week, until: s.week + Math.round(months * 4.33), fee: resFee19(s, k, a), earned: 0 };
  st.res.push(x); if (st.res.length > 30) st.res.splice(0, st.res.length - 30);
  cnt19(st, 'res');
  const tx = fmtL(l('{a} assina residência: {v}, {m} meses.', '{a} signs a residency: {v}, {m} months.'), { a: a.name, v: RES19[k].name, m: months });
  log19(s, st, tx);
  emitFact(s, { kind: 'dj_residency', actors: [a.id, 'player'], severity: 20 + Math.round(RES19[k].fame * 15), visibility: 'public', tags: ['remix19', k], text: tx, src: 'remix19', data: { res: x.id, v: k, ...(own ? { own } : {}) } });
  return null;
}
function askResidency(s: GameState, a: Act, why: L): void {
  const st = rmx19(s), opts = resOpen19(s).filter((k) => k !== 'own').slice(-2);
  if (!opts.length || (st.resAsk[a.id] ?? -999) > s.week - 104 || st.res.some((x) => x.act === a.id && x.until > s.week)) return;
  st.resAsk[a.id] = s.week;
  pushInbox18(s, 'rmx19_res', { from: RES19[opts[opts.length - 1]].name.pt, subject: fmtL(l('Residência de DJ para {a}?', 'A DJ residency for {a}?'), { a: a.name }), tone: 'good',
    body: fmtL(l('{w} Um clube quer {a} toda semana: cachê de {f}/mês por 6 meses, fama nas pistas — e noites longas (cansaço e estresse).', '{w} A club wants {a} every week: {f}/month for 6 months, club fame — and long nights (fatigue and stress).'), { w: why, a: a.name, f: usd19(resFee19(s, opts[opts.length - 1], a)) }),
    ref: { act: a.id, v: opts[opts.length - 1] }, actions: [{ id: 'take', label: l('Aceitar', 'Accept') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 6 });
}
registerInboxKind('rmx19_res', { label: l('Residência de DJ', 'DJ residency'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'media19' }),
  handle: (s, m, act) => (act === 'take' ? residency19(s, String(m.ref?.act), String(m.ref?.v) as ResV19) ?? l('Residência assinada.', 'Residency signed.') : l('Você recusa: o ato fica livre para gravar.', 'You decline: the act stays free to record.')) });
registerConseq18('ib:rmx19_res:take', { now: l('Cachê mensal, fama nas pistas, cansaço.', 'Monthly fee, club fame, fatigue.'), later: [{ in: [3, 8], p: 0.3, tone: 'mixed', hint: l('Noites longas cobram um preço — ou criam uma lenda.', 'Long nights take a toll — or make a legend.'),
  fx: (f) => (f.r.chance(0.5) ? (f.fame(2).momentum(5), l('Uma noite histórica na residência vira lenda entre os clubbers.', 'A legendary residency night becomes clubber folklore.')) : (f.mood('fatigue', 12).mood('stress', 8), l('As noites sem fim derrubam o ato: cansaço e estresse.', 'Endless nights wear the act down: fatigue and stress.'))) }] });
registerConseq18('ib:rmx19_res:no', { later: [{ in: [2, 6], p: 0.25, tone: 'bad', hint: l('O clube pode chamar outro.', 'The club may call someone else.'),
  fx: (f) => (f.momentum(-4), l('O clube chamou um rival, que virou o nome da temporada.', 'The club booked a rival, who became the name of the season.')) }] });

// DJ quer remixar seu fracasso antigo
function offerRemix(s: GameState, rel: Release, dj: Dj18): void {
  pushInbox18(s, 'rmx19_offer', { from: dj.name, subject: fmtL(l('{d} quer remixar "{t}" ({y})', '{d} wants to remix "{t}" ({y})'), { d: dj.name, t: rel.title, y: rel.year }), tone: 'info',
    body: fmtL(l('Um DJ em alta achou a faixa num sebo e quer levá-la às pistas. Deixar: sem custo, renda do remix 50/50. Comprar o remix: você paga {c} e fica com tudo. Recusar: a faixa fica como está.', 'A rising DJ found the track in a bargain bin and wants to take it to the clubs. Allow: no cost, remix income 50/50. Buy the remix: you pay {c} and keep everything. Decline: the track stays as it is.'), { c: usd19(remixCost19(s, dj)) }),
    ref: { rel: rel.id, dj: dj.id, act: rel.actId }, actions: [{ id: 'allow', label: l('Deixar (50/50)', 'Allow (50/50)') }, { id: 'buy', label: l('Comprar o remix', 'Buy the remix') }, { id: 'no', label: l('Recusar', 'Decline') }], weeks: 6 });
}
registerInboxKind('rmx19_offer', { label: l('Pedido de remix', 'Remix request'), cat: 'deals', icon: 'disc', prio: 1, goto: () => ({ area: 'media19' }),
  handle: (s, m, act) => {
    const rel = s.releases[String(m.ref?.rel)], dj = media18(s).djs.find((d) => d.id === String(m.ref?.dj)), st = rmx19(s);
    if (!rel || !dj) return l('Já passou.', 'Already over.');
    if (act === 'no') return l('Você recusa; o DJ procura outra faixa.', 'You decline; the DJ looks for another track.');
    if (act === 'buy') { const c = remixCost19(s, dj); if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.'); post(s, `rmx19b:${rel.id}:${s.week}`, -c, 'recording', `Remix ${dj.name}: ${rel.title}`); }
    st.rx.push({ id: `rx${++st.seq}`, rel: rel.id, dj: dj.id, djn: dj.name, w: s.week, due: s.week + 4, k: 'offer', split: act === 'buy' ? 1 : 0.5 });
    cnt19(st, 'offer');
    return act === 'buy' ? l('Remix comprado: sai no mês que vem, renda toda sua.', 'Remix bought: out next month, all income yours.') : l('Remix liberado: sai no mês que vem, renda dividida.', 'Remix allowed: out next month, income split.');
  } });
registerConseq18('ib:rmx19_offer:allow', { now: l('Sem custo; metade da renda do remix.', 'No cost; half the remix income.'), later: [{ in: [6, 18], p: 0.2, tone: 'mixed', hint: l('O DJ pode crescer — com ou sem você.', 'The DJ may grow — with or without you.'),
  fx: (f) => (f.rep('artists', 1), l('O DJ virou estrela e cita você como quem abriu a porta: artistas notam.', 'The DJ became a star and credits you for opening the door: artists notice.')) }] });
registerConseq18('ib:rmx19_offer:buy', { later: [{ in: [3, 9], p: 0.2, tone: 'bad', hint: l('O DJ pode achar que pagou pouco.', 'The DJ may feel underpaid.'),
  fx: (f) => (f.rep('artists', -1), l('O DJ reclama em entrevistas que você comprou barato o remix que mudou a faixa.', 'The DJ complains in interviews that you bought cheap the remix that changed the track.')) }] });
registerConseq18('ib:rmx19_offer:no', { later: [{ in: [4, 12], p: 0.2, tone: 'bad', hint: l('Um pirata pode fazer sem pedir.', 'A bootlegger may do it without asking.'),
  fx: (f) => (f.fame(1), l('Um remix pirata da faixa toca nas pistas sem render um centavo: fama sobe, caixa não.', 'A bootleg remix of the track plays in clubs without earning a cent: fame up, cash not.')) }] });

// ---------------------------------------------------------------- mês

export function remixMonth19(s: GameState): void {
  if (!remixOpen19(s)) return;
  const st = rmx19(s), r = rng(s);
  for (const x of st.rx) if (x.ok === undefined && x.due <= s.week) resolveRx(s, x, r);
  // remixes que pegaram: vendas por 4 meses
  for (const x of st.rx) {
    if (!x.ok || (x.until ?? 0) <= s.week) continue;
    const rel = s.releases[x.rel];
    if (!rel) continue;
    const u = Math.round((x.base ?? 0) * 0.7 ** (x.mo ?? 0) * (0.85 + r.next() * 0.3));
    x.mo = (x.mo ?? 0) + 1;
    const v = Math.round(u * money(s, s.year >= 2008 ? 0.3 : 0.9));
    rel.totalUnits += u; rel.revenue += v; x.u = (x.u ?? 0) + u; x.v = (x.v ?? 0) + v;
    if (mineR19(s, rel)) post(s, `rmx19s:${x.id}:${s.year}-${s.month}`, Math.round(v * x.split), 'sales', `Remix nas pistas: ${rel.title}`);
  }
  // residências
  for (const x of st.res) {
    if (x.until <= s.week) continue;
    const a = s.acts[x.act], R = RES19[x.v];
    if (!a) continue;
    if (R.sea && (s.month < R.sea[0] || s.month > R.sea[1])) continue;
    x.earned += x.fee;
    post(s, `res19:${x.id}:${s.year}-${s.month}`, x.fee, 'live', `Residência ${R.name.pt}: ${a.name}`);
    a.fame = clamp(a.fame + R.fame * 0.4, 0, 100);
    for (const p of a.members) if (s.persons[p]?.alive) addStress(s, p, 1.5, l('Noites de residência', 'Residency nights'));
    if (x.own) { const o = v17(s).own.find((y) => y.id === x.own); if (o) o.rep = clamp(o.rep + 0.5, 0, 100); }
  }
  // DJs pedem fracassos antigos (seus) e remixam os de NPCs
  const djs = ensureDjs18(s);
  if (!djs.length) return;
  if (r.chance(0.05)) {
    const pool = playerActs(s).flatMap((id) => s.acts[id]?.releases ?? []).map((id) => s.releases[id]).filter((x): x is Release => remixable19(s, x) && flop(x) && !activeRx(s, x.id) && s.year - x.year >= 8);
    const rel = r.weighted(pool, (x) => (x.q / 50) ** 2), dj = rel && r.weighted(djs, (d) => djFit18(s, d, rel) + 0.1);
    if (rel && dj) offerRemix(s, rel, dj);
  }
  if (r.chance(0.03)) {
    const pool = Object.values(s.releases).filter((x) => !mineR19(s, x) && remixable19(s, x) && s.year - x.year >= 10 && x.type === 'single');
    const rel = r.weighted(pool, (x) => (x.q / 50) ** 2 * (flop(x) ? 1.5 : 1)), dj = rel && r.pick(djs);
    if (rel && dj) { st.rx.push({ id: `rx${++st.seq}`, rel: rel.id, dj: dj.id, djn: dj.name, w: s.week, due: s.week, k: 'club', split: 0 }); resolveRx(s, st.rx[st.rx.length - 1], r); }
  }
  st.rx = st.rx.filter((x) => x.ok === undefined || (x.until ?? 0) > s.week - 52).slice(-40);
}
registerSimHook('month', 'remix19', (s) => remixMonth19(s));

// ---------------------------------------------------------------- ouvintes

// remix_hit: o remixado sobe no streaming/nas lojas (stream18 lê hypeBoost) e no hype; manchete; residência para o seu ato
onFact('remix_hit', (s, f) => {
  const rel = s.releases[String(f.data?.rel ?? '')];
  if (!rel) return;
  rel.hypeBoost = Math.min(0.5, (rel.hypeBoost ?? 0) + 0.2);
  rel.live = true;
  addHype(s, `a:${rel.actId}`, 'remix19', l('Remix nas pistas', 'Remix in the clubs'), 8);
  const a = s.acts[rel.actId];
  if (a) a.fame = clamp(a.fame + 1.5, 0, 100);
  if (mineR19(s, rel)) link19(s, 'remix', fmtL(l('"{t}": remix nas pistas → hype +8 e streaming/lojas ×1,2.', '"{t}": club remix → hype +8 and streaming/stores ×1.2.'), { t: rel.title }));
}, 'remix19:stream');
onFact('remix_hit', (s, f) => {
  headline19(s, f.text, f.severity >= 45 ? 2 : 1);
  const a = s.acts[f.actors[0]];
  if (a && mineA19(a)) safe19(() => askResidency(s, a, l('O remix tomou as pistas.', 'The remix took over the clubs.')));
}, 'remix19:res');
// white label: boa pista = boato e hype na faixa; vazamento = pirata (fãs casuais sem receita)
onFact('white_label', (s, f) => {
  const rel = s.releases[String(f.data?.rel ?? '')], v = Number(f.data?.v ?? 0);
  if (!rel) return;
  if (v >= 60) addHype(s, `r:${rel.id}`, 'white19', l('White label quente nas pistas', 'Hot white label in the clubs'), Math.round((v - 50) / 4));
  const a = s.acts[rel.actId];
  if (f.data?.leak && a) { a.fans.casual += Math.round(300 + v * 10); rel.appeal *= 0.97; }
  link19(s, 'remix', fmtL(l('White label de "{t}": pista {v}/100 → chance do remix {d}.', 'White label of "{t}": floor {v}/100 → remix odds {d}.'), { t: rel.title, v, d: v >= 50 ? '+' : '−' }));
}, 'remix19:white');
// residência: casa própria ganha reputação; manchete
onFact('dj_residency', (s, f) => {
  const own = String(f.data?.own ?? '');
  if (own) { const o = v17(s).own.find((x) => x.id === own); if (o) { o.rep = clamp(o.rep + 4, 0, 100); link19(s, 'remix', fmtL(l('Noite fixa de DJ na {v}: reputação da casa +4.', 'Fixed DJ night at {v}: venue reputation +4.'), { v: vdef(own)?.name ?? own })); } }
  headline19(s, f.text, 1);
}, 'remix19:venue');
// media18: o vencedor do concurso de remix cobra metade; nº 1 nas pistas → convite de residência
onFact('remix_contest', (s) => { const st = rmx19(s), d = media18(s).djs[media18(s).djs.length - 1]; if (d) st.disc[d.id] = s.week; }, 'remix19:contest');
onFact('club_chart', (s, f) => { const a = s.acts[f.actors[0]]; if (a && mineA19(a) && remixOpen19(s)) safe19(() => askResidency(s, a, l('Nº 1 na parada de clubes.', 'No. 1 on the club chart.'))); }, 'remix19:club');

// ---------------------------------------------------------------- calendário e porquê
registerDeadline('remix19', (s, from, to) => [
  ...rmx19(s).rx.filter((x) => x.ok === undefined && x.due >= from && x.due <= to && mineR19(s, s.releases[x.rel])).map((x) => ({ id: `remix19-rx-${x.id}`, w: x.due, kind: 'release' as const, t: fmtL(l('Remix de "{t}" chega às pistas', '"{t}" remix hits the clubs'), { t: s.releases[x.rel]?.title ?? '?' }), tone: 'info' as const, goto: { area: 'media19' } })),
  ...rmx19(s).res.filter((x) => x.until >= from && x.until <= to && mineA19(s.acts[x.act])).map((x) => ({ id: `remix19-res-${x.id}`, w: x.until, kind: 'contract' as const, t: fmtL(l('Fim da residência de {a}', '{a}\'s residency ends'), { a: s.acts[x.act]?.name ?? '?' }), tone: 'info' as const, goto: { area: 'media19' } })),
]);
registerExplain('rmx19.odds', (s, c) => {
  const rel = s.releases[String(c.rel ?? '')], dj = media18(s).djs.find((d) => d.id === String(c.dj ?? ''));
  if (!rel || !dj) return null;
  const { p, why } = remixOdds19(s, rel, dj);
  return { title: fmtL(l('Chance do remix de "{t}" pegar', 'Odds the "{t}" remix catches on'), { t: rel.title }), value: p, fmt: 'pct', parts: why, note: l('Se pegar: vendas por 4 meses, calor no sucesso tardio e convite de residência.', 'If it catches: 4 months of sales, late-hit heat and a residency offer.') };
});
