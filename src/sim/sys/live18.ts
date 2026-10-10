// Rodada 18 (live18, feedback #8 + V1/V2/V3) — A turnê como operação: transporte, hospedagem, diárias, equipe,
// equipamento (próprio com frete × alugado), ensaio e adaptação do show, seguro, segurança de público e o promotor
// (local, que acerta na noite e às vezes contesta despesas; ou o gigante da época, que garante mais, cobra taxas do
// fã e paga a prazo). Porta × garantia × "o maior dos dois". Público local × tamanho da casa (80% de uma casa pequena
// vale mais que 50% de arena). Abrir para um artista maior = prejuízo agora, público novo depois.
// A estrada muda o artista: o show fica afiado, o entrosamento cresce (ou azeda: diárias ruins, cansaço → brigas),
// músicas novas crescem testadas ao vivo; experiência alimenta traj18/ability18 pelo gancho 'show'.
// Cada show e cada turnê guardam um POST-MORTEM (previsto × real com os fatores), lido pelo long18 e pela interface.
// Segurança de público: incidentes viram processo/escândalo; no modo "vida real exata" tragédias só como crônica real.
import { Rng, clamp } from '../../core/rng';
import { VENUE_TIERS } from '../../data/rules';
import { cityById, familyOf, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { registerExplain } from '../explain18';
import { addStress, relieveLong } from '../stress17';
import { TICKET, cityDemand } from '../tours';
import { KIT0, TOUR18, type Kit18, type KitInfo } from '../tourhook18';
import type { Act, GameState } from '../types';
import type { Tour, TourStop } from '../xtypes';
import { fmtL, money, notify, playerActs, post, remember, staffSkill } from '../util';
import { histMode } from '../history15';
import { postAR18 } from './econ18';
import { mIdx18 } from '../ledger18';
import { c12 } from './tour12';
import { fan18, pp18, ticketShock18 } from './fans18';
import { adjRel18 } from './agency18';

// ------------------------------------------------------------------ estado

export interface ShowPM18 { c: string; d: number; st: 'played' | 'cancelled'; tier: number; cap: number; e: number; a: number; ep: number; pay: number; merch: number; f: [L, number][]; n: L[]; ins?: number }
export interface TourPM18 {
  id: string; act: string; name: string; y: number; m: number; kit: Kit18; role: Tour['role']; deal: Tour['pay'];
  cost: [L, number][]; logistics: number; shows: ShowPM18[]; fans0: number; fin?: { sold: number; cap: number; pay: number; merch: number; fans: number; net: number; label: number; verdict: L; why: L[] };
}
interface Band18 { tight: number; chem: number; fights: number; grown: Record<string, number>; last?: number }
export interface Live18 {
  pm: TourPM18[]; band: Record<string, Band18>; fill: Record<string, number>; well: boolean; excl?: number; inc: { y: number; sev: number }[];
  chron: Record<string, 1>; done: Record<string, 1>; log: { y: number; m: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { live18: Live18 } }
const fresh = (): Live18 => ({ pm: [], band: {}, fill: {}, well: false, inc: [], chron: {}, done: {}, log: [] });
registerExt4('live18', fresh);
export const live18 = (s: GameState): Live18 => {
  const x = s.x4 as unknown as { live18?: Live18 };
  const v = (x.live18 ??= fresh());
  v.inc ??= []; v.chron ??= {}; v.done ??= {}; v.log ??= []; v.fill ??= {}; v.band ??= {}; v.pm ??= [];
  return v;
};
const logIt = (s: GameState, t: L) => { const v = live18(s); v.log.unshift({ y: s.year, m: s.month, t }); if (v.log.length > 30) v.log.length = 30; };
const mine = (s: GameState, a?: Act): a is Act => !!a && (a.owner === 'player' || !!a.playerBand);
const usd = (c: number) => `${c < 0 ? '−' : ''}$${Math.round(Math.abs(c) / 100).toLocaleString('en-US')}`;
export const band18 = (s: GameState, actId: string): Band18 => (live18(s).band[actId] ??= { tight: 20, chem: 0, fights: 0, grown: {} });
export const tourPM18 = (s: GameState, id: string): TourPM18 | undefined => live18(s).pm.find((x) => x.id === id);
export const tourPMs18 = (s: GameState, actId?: string): TourPM18[] => live18(s).pm.filter((x) => !actId || x.act === actId);
export const kitOf18 = (t: Tour): Kit18 => ({ ...KIT0, ...(t.kit18 ?? {}) });

// ------------------------------------------------------------------ época: transporte, promotores gigantes, normas de segurança

export const FLY_FROM18 = 1958;
export const GIANT_FROM18 = 1997;
/** Gigante de promoção/bilhetagem da época (nomes fictícios, modelados na consolidação real dos anos 1970–2010). */
export function giant18(s: GameState): { name: string; fee: number; promo: boolean } | null {
  if (s.year >= 2010) return { name: 'Apex Live Group', fee: 0.06, promo: true };
  if (s.year >= GIANT_FROM18) return { name: 'Apex Live', fee: 0.045, promo: true };
  if (s.year >= 1976) return { name: 'TicketMax', fee: 0.03, promo: false };
  return null;
}
/** Normas de segurança: antes de 1975 quase nada; tragédias reais (1979, 2000, 2021) endureceram as regras. */
export function safetyNorm18(s: GameState): number {
  const v = live18(s);
  let k = s.year < 1975 ? 1.6 : s.year < 1980 ? 1.35 : s.year < 2001 ? 1.1 : s.year < 2022 ? 0.95 : 0.85;
  if (histMode(s) !== 'strict') k *= 1 - 0.05 * Math.min(4, v.inc.filter((x) => x.sev >= 3).length);
  return k;
}
/** Crônica real (só no modo exato): tragédias de público que mudaram as normas. */
const CHRON18: { y: number; m: number; t: L }[] = [
  { y: 1969, m: 11, t: l('Altamont (Califórnia): segurança improvisada por motociclistas termina em morte durante um show gratuito. O "verão do amor" acaba ali.', 'Altamont (California): makeshift security by a biker gang ends in a death during a free concert. The "summer of love" ends there.') },
  { y: 1979, m: 11, t: l('Cincinnati: 11 mortos esmagados na entrada de um show com assentos livres. Várias cidades proíbem "festival seating".', 'Cincinnati: 11 crushed to death at the doors of a general-admission show. Several cities ban "festival seating".') },
  { y: 2000, m: 5, t: l('Roskilde (Dinamarca): 9 mortos na frente do palco principal. Festivais redesenham grades e corredores.', 'Roskilde (Denmark): 9 dead in front of the main stage. Festivals redesign barriers and aisles.') },
  { y: 2021, m: 10, t: l('Houston: 10 mortos numa multidão comprimida num festival de rap. Seguro e licenças ficam mais caros.', 'Houston: 10 dead in a crowd surge at a rap festival. Insurance and permits get pricier.') },
];

// ------------------------------------------------------------------ custo do kit (delta sobre o padrão)

export const KIT_TXT18 = {
  move: { van: l('Van (barato, cansa)', 'Van (cheap, tiring)'), bus: l('Ônibus de turnê', 'Tour bus'), fly: l('Avião (caro, descansa)', 'Fly (pricey, restful)') },
  bed: { cheap: l('Pousada barata', 'Cheap motels'), std: l('Hotel padrão', 'Standard hotels'), good: l('Hotel bom', 'Good hotels') },
  diem: [l('Diárias mínimas', 'Bare per diems'), l('Diárias normais', 'Normal per diems'), l('Diárias generosas', 'Generous per diems')],
  gear: { own: l('Equipamento próprio (frete)', 'Own gear (freight)'), rent: l('Alugar em cada cidade', 'Rent in each city') },
  reh: [l('Sem ensaio', 'No rehearsal'), l('1 semana de ensaio', '1 week of rehearsal'), l('Ensaio de produção (palco montado)', 'Production rehearsal (full stage)')],
  ins: [l('Sem seguro', 'Uninsured'), l('Seguro de cancelamento e responsabilidade', 'Cancellation and liability insurance')],
  sec: [l('Segurança da casa', 'House security'), l('Segurança profissional', 'Professional security'), l('Segurança reforçada + socorristas', 'Reinforced security + medics')],
  prom: { local: l('Promotores locais (acerto na noite)', 'Local promoters (settled on the night)'), giant: l('Promotor gigante (paga a prazo)', 'Major promoter (pays later)') },
};
const incidents3y = (s: GameState) => live18(s).inc.filter((x) => x.y >= s.year - 3).length;
export function premium18(s: GameState, gross: number, shows: number): number {
  return Math.round((gross * 0.035 + money(s, 40) * shows) * (1 + 0.15 * incidents3y(s)) * safetyNorm18(s));
}
const KC18 = new WeakMap<Kit18, [L, number][]>();
TOUR18.kit = (s, kit0, i) => {
  const k = { ...KIT0, ...(kit0 ?? {}) };
  const parts: [L, number][] = [], warn: L[] = [];
  const add = (t: L, v: number) => { v = Math.round(v); if (v) parts.push([t, v]); };
  const maxT = Math.max(0, ...i.tiers);
  if (k.move === 'van') { if (i.people > 9) warn.push(l('Gente demais para uma van: vai de ônibus.', 'Too many people for a van: going by bus.')); else add(KIT_TXT18.move.van, -0.3 * i.travel); }
  if (k.move === 'fly') { if (s.year < FLY_FROM18) warn.push(l('Turnê de avião ainda não é viável nesta época.', 'Flying tours are not viable yet in this era.')); else add(KIT_TXT18.move.fly, 0.8 * i.travel + money(s, 60) * i.people * i.shows * 0.3); }
  if (k.bed === 'cheap') add(KIT_TXT18.bed.cheap, -money(s, 16) * i.people * i.shows);
  if (k.bed === 'good') add(KIT_TXT18.bed.good, money(s, 22) * i.people * i.shows);
  if (k.diem === 0) add(KIT_TXT18.diem[0], -money(s, 12) * i.people * i.shows);
  if (k.diem === 2) add(KIT_TXT18.diem[2], money(s, 20) * i.people * i.shows);
  if (k.gear === 'rent') add(KIT_TXT18.gear.rent, i.tiers.reduce((t, x) => t + money(s, 110 * (x + 1)), 0) - 0.15 * i.travel);
  if (k.reh === 1) add(KIT_TXT18.reh[1], money(s, 60) * i.members * 5 + money(s, 300));
  if (k.reh === 2) add(KIT_TXT18.reh[2], money(s, 60) * i.people * 8 + money(s, 400 * (maxT + 1)) * 3);
  if (k.ins) add(KIT_TXT18.ins[1], premium18(s, i.gross, i.shows));
  if (k.sec) add(KIT_TXT18.sec[k.sec], i.tiers.reduce((t, x) => t + money(s, (k.sec === 2 ? 110 : 60) * Math.pow(x + 1, 1.5)), 0));
  if (k.prom === 'giant' && (s.year < GIANT_FROM18 || i.fame < 30)) warn.push(s.year < GIANT_FROM18 ? l('Ainda não há promotor nacional dominante: ficam os locais.', 'No dominant national promoter yet: local promoters it is.') : l('O gigante não se interessa por artista desse tamanho (fama < 30).', 'The major is not interested in an act this size (fame < 30).'));
  if (!k.ins && i.gross > money(s, 60000)) warn.push(l('Turnê grande sem seguro: um cancelamento pode custar caro.', 'Big tour uninsured: one cancellation can cost a lot.'));
  if (kit0) KC18.set(kit0, parts);
  return { total: parts.reduce((t, p) => t + p[1], 0), parts, warn };
};
export const kitCost18 = (s: GameState, kit: Kit18 | undefined, i: KitInfo) => TOUR18.kit!(s, kit, i);
const giantOk = (s: GameState, act: Act, k: Kit18) => (k.prom === 'giant' || !!live18(s).excl) && s.year >= GIANT_FROM18 && act.fame >= 30;

// ------------------------------------------------------------------ marcação: previsão guardada para o post-mortem

const PB = [0, 0.06, 0.14, 0.25];
function expSold(s: GameState, act: Act, t: Tour, st: TourStop): number {
  const pm = st.price / Math.max(1, money(s, TICKET[st.tier]));
  return Math.min(st.capacity, Math.round(cityDemand(s, act, st.cityId) * (t.role === 'opening' ? 0.3 : t.role === 'co' ? 1.2 : 1) * (1 + PB[t.production]) / Math.pow(pm, 1.2)));
}
function expPay(t: Tour, st: TourStop, sold: number, dem: number): number {
  const gross = sold * st.price, f = Math.min(st.capacity, dem) * st.price * 0.5;
  return t.pay === 'door' ? gross * 0.65 : t.pay === 'guarantee' ? f * 0.8 : t.pay === 'versus' ? Math.max(f * 0.55, gross * 0.6) : f * 0.4 + gross * 0.45;
}
TOUR18.planned = (s, t, kit, i) => {
  const act = s.acts[t.actId];
  if (!act) return;
  const k = { ...KIT0, ...(kit ?? {}) };
  if (live18(s).excl && s.year >= GIANT_FROM18 && act.fame >= 30) k.prom = 'giant';
  t.kit18 = k;
  const parts = (kit && KC18.get(kit)) ?? kitCost18(s, k, i).parts;
  const v = live18(s);
  v.pm.unshift({ id: t.id, act: act.id, name: t.name, y: s.year, m: s.month, kit: k, role: t.role, deal: t.pay, cost: parts, logistics: t.costReserved, fans0: act.fans.core + act.fans.active + act.fans.casual,
    shows: t.stops.map((st) => { const e = expSold(s, act, t, st); return { c: st.cityId, d: st.day, st: 'played', tier: st.tier, cap: st.capacity, e, a: 0, ep: Math.round(expPay(t, st, e, cityDemand(s, act, st.cityId))), pay: 0, merch: 0, f: [], n: [] }; }) });
  if (v.pm.length > 14) v.pm.length = 14;
};

// ------------------------------------------------------------------ qualidade do show

TOUR18.q = (s, t, st) => {
  const act = s.acts[t.actId];
  if (!act || !mine(s, act)) return 1;
  const k = kitOf18(t), b = band18(s, act.id);
  const n = t.stops.filter((x) => x.status === 'played').length;
  let q = 1;
  q *= k.reh === 0 ? (n < 2 ? 0.95 : 1) : k.reh === 1 ? (n < 4 ? 1.03 : 1) : (n < t.stops.length / 2 ? 1.05 : 1.03);
  q *= 1 + b.tight / 1250;
  q *= 1 + clamp(b.chem, -50, 50) / 600;
  if (k.gear === 'rent') q *= 0.98;
  const pm = st.price / Math.max(1, money(s, TICKET[st.tier]));
  if (Math.abs(pm - 1) > 0.05) q *= Math.pow(pm, 0.8 * (pp18(s, act) - 1));
  const g = giant18(s);
  if (g && giantOk(s, act, k)) q *= (1 - g.fee) * (st.tier >= 3 ? 1.08 : 1.03);
  return clamp(q, 0.75, 1.3);
};

// risco de acidente/cancelamento: logística e programa de bem-estar
registerMod('tourRisk', 'live18', (s, v, c) => {
  const a = c.act;
  if (!mine(s, a)) return null;
  const t = s.tours.find((x) => x.actId === a.id && x.status === 'running');
  let k = live18(s).well ? 0.85 : 1;
  if (t) { const kt = kitOf18(t); k *= (kt.reh === 2 ? 0.85 : 1) * (kt.gear === 'rent' ? 0.9 : 1) * (kt.move === 'fly' ? 0.95 : kt.move === 'van' ? 1.12 : 1); }
  return Math.abs(k - 1) > 0.01 ? { value: v * k, label: k < 1 ? l('Logística e cuidado com o grupo', 'Logistics and care for the group') : l('Logística precária', 'Shoestring logistics') } : null;
});
// casa cheia × casa vazia: escassez gera procura na volta; arena vazia gera estigma
registerMod('cityDemand', 'live18', (s, v, c) => {
  const a = c.act;
  if (!mine(s, a) || !c.cityId) return null;
  const f = live18(s).fill[`${a.id}:${c.cityId}`];
  if (f === undefined) return null;
  if (f >= 0.9) return { value: v * 1.12, label: l('Lotou da última vez (escassez)', 'Sold out last time (scarcity)') };
  if (f < 0.5) return { value: v * 0.9, label: l('Casa meio vazia da última vez', 'Half-empty house last time') };
  return null;
});

// ------------------------------------------------------------------ acerto do show

const pmShow = (s: GameState, t: Tour, st: TourStop): ShowPM18 | undefined => tourPM18(s, t.id)?.shows.find((x) => x.d === st.day && x.c === st.cityId);

TOUR18.settle = (s, _r, t, st, c) => {
  const act = s.acts[t.actId];
  if (!act || !mine(s, act)) return { pay: c.pay, merch: c.merch };
  const r = Rng.fromSeed(`${s.config.seed}:live18:${t.id}:${st.day}`);
  const k = kitOf18(t), v = live18(s), b = band18(s, act.id), notes: L[] = [];
  let pay = c.pay, merch = c.merch;
  const fill = st.sold / Math.max(1, st.capacity);
  // acordo: "o maior dos dois" (garantia menor ou porta menor, o que for maior)
  if (t.pay === 'versus' && t.role === 'headline') {
    const g = Math.round(c.forecast * 0.55), d = Math.round(c.gross * 0.6);
    pay = Math.max(g, d);
    notes.push(d >= g ? fmtL(l('Versus: a porta ({d}) superou a garantia ({g}).', 'Versus: the door ({d}) beat the guarantee ({g}).'), { d: usd(d), g: usd(g) }) : fmtL(l('Versus: valeu a garantia ({g}); a porta daria {d}.', 'Versus: the guarantee held ({g}); the door would have paid {d}.'), { d: usd(d), g: usd(g) }));
  }
  // promotor: gigante garante mais (e paga depois); local acerta na noite e às vezes contesta despesas
  const giant = giantOk(s, act, k);
  if (giant && t.pay !== 'door' && t.role === 'headline') { pay = Math.round(pay * (v.excl ? 1.15 : 1.1)); notes.push(l('Promotor gigante: garantia mais alta.', 'Major promoter: higher guarantee.')); }
  if (!giant && t.pay !== 'guarantee' && t.role === 'headline' && r.chance(0.3 * (1 - staffSkill(s, 'tour_manager') / 120))) {
    const cut = Math.round(pay * r.float(0.04, 0.12));
    const back = Math.round(cut * staffSkill(s, 'tour_manager') / 150);
    pay -= cut - back;
    notes.push(fmtL(l('Acerto: o promotor descontou {c} em "despesas da casa"{b}.', 'Settlement: the promoter deducted {c} in "house expenses"{b}.'), { c: usd(cut), b: back ? fmtL(l(' (o gerente de turnê recuperou {x})', ' (your tour manager clawed back {x})'), { x: usd(back) }) : '' }));
  }
  // poder de compra: merch e preço
  const pp = pp18(s, act);
  merch = Math.round(merch * Math.pow(pp, 0.6));
  const pm = c.priceMult;
  const shock = ticketShock18(s, act, pm);
  if (shock > 0.05) notes.push(l('Ingresso caro: parte dos fãs ficou de fora e reclamou.', 'Pricey tickets: some fans were shut out and complained.'));
  // casa cheia × vazia
  v.fill[`${act.id}:${st.cityId}`] = Math.round(fill * 100) / 100;
  if (fill >= 0.9) { act.momentum = clamp(act.momentum + 0.6, 0, 100); notes.push(l('Casa cheia: boca a boca e procura maior na próxima visita.', 'Full house: word of mouth and more demand next visit.')); }
  if (st.tier >= 3 && fill < 0.5) { act.momentum = clamp(act.momentum - 1.2, 0, 100); act.fame = clamp(act.fame - 0.15, 0, 100); notes.push(l('Arena meio vazia: a imprensa nota; melhor uma casa menor cheia.', 'Half-empty arena: the press notices; a smaller full room would have been better.')); }
  // abrir para um artista maior: perde dinheiro, ganha público compatível
  const partner = t.partnerActId ? s.acts[t.partnerActId] : undefined;
  if (t.role === 'opening' && partner) {
    const compat = familyOf(partner.genre) === familyOf(act.genre) ? 1 : 0.45;
    const gain = Math.round(st.sold * 0.03 * compat);
    act.fans.active += gain; act.fans.core += Math.round(gain * 0.08);
    notes.push(fmtL(l('Abertura para {p}: +{n} fãs ativos ({c} de compatibilidade).', 'Opening for {p}: +{n} active fans ({c} compatibility).'), { p: partner.name, n: gain, c: `${Math.round(compat * 100)}%` }));
  }
  // a estrada muda o artista
  const fatF = k.move === 'van' ? 1.35 : k.move === 'fly' && s.year >= FLY_FROM18 ? 0.7 : 1;
  const comfort = (k.bed === 'cheap' ? -1 : k.bed === 'good' ? 1 : 0) + (k.diem - 1);
  b.tight = clamp(b.tight + 2.5 * (1 - b.tight / 100), 0, 100);
  b.chem = clamp(b.chem + (fill >= 0.7 ? 0.6 : 0) + comfort * 0.4 - (c.fatigue > 60 ? 0.8 : 0), -50, 50);
  b.last = s.week;
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    p.fatigue = clamp(p.fatigue + (fatF - 1) * 3 - comfort * 0.4, 0, 100);
    p.morale = clamp(p.morale + comfort * 0.4, 0, 100);
    if (p.fatigue > 55) addStress(s, id, (live18(s).well ? 0.4 : 0.8) * (p.fatigue - 50) / 25, l('Cansaço da estrada', 'Road fatigue'));
  }
  // músicas novas crescem testadas ao vivo (passagem de som, bis)
  const fresh2 = act.songs.map((id) => s.songs[id]).filter((x) => x && !x.recorded).sort((a, z) => z.q - a.q).slice(0, 2);
  for (const so of fresh2) {
    const g = b.grown[so.id] ?? 0;
    if (g >= 6) continue;
    so.q = Math.min(100, so.q + 0.15); b.grown[so.id] = Math.round((g + 0.15) * 100) / 100;
    if (g < 3 && g + 0.15 >= 3) notes.push(fmtL(l('"{t}" cresceu na estrada: o arranjo ao vivo ficou melhor que a demo.', '"{t}" grew on the road: the live arrangement beat the demo.'), { t: so.title }));
  }
  // conflito: entrosamento baixo, cansaço e diárias ruins
  const live = act.members.filter((id) => s.persons[id]?.alive);
  if (live.length >= 2 && b.chem < -8 && r.chance(clamp(0.04 + (-b.chem - 8) / 300, 0, 0.25) * (v.well ? 0.5 : 1))) {
    const x = r.pick(live), y = r.pick(live.filter((z) => z !== x));
    adjRel18(s, `p:${x}`, `p:${y}`, -10, l('Briga na estrada', 'Fight on the road'));
    adjRel18(s, `p:${y}`, `p:${x}`, -10, l('Briga na estrada', 'Fight on the road'));
    addStress(s, x, 6, l('Briga na estrada', 'Fight on the road')); addStress(s, y, 6, l('Briga na estrada', 'Fight on the road'));
    b.fights++;
    const nx = s.persons[x]?.name ?? '?', ny = s.persons[y]?.name ?? '?';
    const tx = fmtL(l('{a}: {x} e {y} brigam no camarim em {c}. Cansaço e diárias apertadas.', '{a}: {x} and {y} fight backstage in {c}. Fatigue and tight per diems.'), { a: act.name, x: nx, y: ny, c: cityById[st.cityId]?.name ?? st.cityId });
    emitFact(s, { kind: 'road_fight', actors: [act.id, `p:${x}`, `p:${y}`], place: st.cityId, severity: 25, visibility: 'rumor', text: tx, tags: ['tour'], src: 'live18' });
    notes.push(tx);
  }
  // segurança de público
  const inc = crowd(s, r, t, st, act, k, fill);
  if (inc) notes.push(inc);
  // post-mortem do show
  const ps = pmShow(s, t, st);
  if (ps) {
    ps.a = st.sold; ps.pay = pay; ps.merch = merch;
    const planD = cityDemand(s, act, st.cityId) || 1;
    ps.f = [
      [l('Procura na cidade (agora × plano)', 'City demand (now × plan)'), Math.round(c.demand / Math.max(1, planD) * 100) / 100],
      [l('Qualidade do show', 'Show quality'), Math.round(c.quality / (1 + PB[t.production]) * 100) / 100],
      [l('Setlist (covers)', 'Setlist (covers)'), Math.round(c.cover * 100) / 100],
      [fmtL(l('Clima: {c}', 'Weather: {c}'), { c: c.clim }), 1],
      [l('Show afiado (estrada)', 'Tight show (road)'), Math.round((1 + b.tight / 1250) * 100) / 100],
      [l('Entrosamento', 'Chemistry'), Math.round((1 + b.chem / 600) * 100) / 100],
    ];
    ps.n = notes;
  }
  return { pay, merch };
};

TOUR18.book = (s, t, key, amount, memo) => {
  const act = s.acts[t.actId];
  if (!act || amount <= 0 || !giantOk(s, act, kitOf18(t))) return false;
  postAR18(s, key, amount, 'live', `${memo} (a prazo)`, 'promoter', mIdx18(s) + 1);
  return true;
};

// ------------------------------------------------------------------ segurança de público (V3)

const MOSH = new Set(['rock', 'hiphop', 'electronic']);
function crowd(s: GameState, r: Rng, t: Tour, st: TourStop, act: Act, k: Kit18, fill: number): L | null {
  const base = [0.002, 0.003, 0.005, 0.008, 0.012][st.tier] ?? 0.005;
  const p = base * (fill > 0.97 ? 2 : fill > 0.85 ? 1.3 : 0.8) * (MOSH.has(familyOf(act.genre)) ? 1.4 : 1) * safetyNorm18(s) * [1, 0.6, 0.35][k.sec] * (t.crew < 3 ? 1.2 : 1);
  if (!r.chance(p)) return null;
  const v = live18(s);
  const roll = r.next();
  let sev = roll < 0.85 ? 1 : roll < 0.98 ? 2 : 3;
  if (sev === 3 && histMode(s) === 'strict') sev = 2; // modo exato: tragédia só como crônica real
  const city = cityById[st.cityId]?.name ?? l(st.cityId);
  const cost = money(s, [0, 1500, 12000, 60000][sev] * (st.tier + 1));
  const covered = k.ins ? Math.round(cost * 0.85) : 0;
  post(s, `l18:inc:${t.id}:${st.day}`, -cost, 'legal', `Processo: incidente no show de ${act.name}`);
  if (covered) post(s, `l18:incins:${t.id}:${st.day}`, covered, 'other_income', `Seguro: incidente no show de ${act.name}`);
  v.inc.push({ y: s.year, sev }); if (v.inc.length > 20) v.inc.shift();
  const text = [
    l('', ''),
    fmtL(l('{a} em {c}: empurra-empurra na grade, feridos leves e um processo.', '{a} in {c}: a crush at the barrier, minor injuries and a lawsuit.'), { a: act.name, c: city }),
    fmtL(l('{a} em {c}: multidão comprimida, vários hospitalizados. Autoridades investigam a segurança.', '{a} in {c}: crowd surge, several hospitalised. Authorities investigate security.'), { a: act.name, c: city }),
    fmtL(l('{a} em {c}: tragédia na frente do palco, mortos na multidão (história alternativa).', '{a} in {c}: tragedy in front of the stage, deaths in the crowd (alternate history).'), { a: act.name, c: city }),
  ][sev];
  emitFact(s, { kind: 'crowd_incident', actors: [act.id, 'player'], place: st.cityId, severity: [0, 25, 55, 90][sev], text, tags: ['tour', 'safety'], src: 'live18', data: { sev } });
  if (sev >= 2) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - (sev === 3 ? 8 : 3), 0, 100);
    act.momentum = clamp(act.momentum - (sev === 3 ? 10 : 3), 0, 100);
    for (const id of act.members) addStress(s, id, sev === 3 ? 25 : 8, l('Incidente com o público', 'Crowd incident'));
    remember(s, 'crowd_incident', text, { actId: act.id, important: sev === 3 });
    notify(s, text, 'bad');
  }
  logIt(s, text);
  return fmtL(l('{t} Custo {c}{i}.', '{t} Cost {c}{i}.'), { t: text, c: usd(cost), i: covered ? fmtL(l(', seguro cobriu {x}', ', insurance covered {x}'), { x: usd(covered) }) : l(', sem seguro', ', uninsured') });
}

// ------------------------------------------------------------------ mês: cancelamentos e seguro, fim de turnê, bem-estar, crônica

const wellCost18 = (s: GameState) => money(s, 120) * playerActs(s).reduce((t, id) => t + (s.acts[id]?.members.length ?? 0), 0);
export { wellCost18 };

function closeTour(s: GameState, t: Tour, pm: TourPM18): void {
  const act = s.acts[t.actId];
  const played = pm.shows.filter((x) => x.st === 'played' && x.a > 0);
  const sold = played.reduce((a, x) => a + x.a, 0), cap = played.reduce((a, x) => a + x.cap, 0);
  const pay = played.reduce((a, x) => a + x.pay, 0), merch = played.reduce((a, x) => a + x.merch, 0);
  const ins = pm.shows.reduce((a, x) => a + (x.ins ?? 0), 0);
  const fans = act ? act.fans.core + act.fans.active + act.fans.casual - pm.fans0 : 0;
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  const share = act?.playerBand ? 1 : c?.model === '360' ? c.share360 : 0;
  const label = Math.round((pay + merch) * share) + ins - t.costReserved;
  const eSold = pm.shows.reduce((a, x) => a + x.e, 0);
  const why: L[] = [];
  why.push(fmtL(l('Público {a} de {e} previstos ({p}% do previsto; {f}% de ocupação).', 'Crowd {a} of {e} forecast ({p}% of forecast; {f}% full).'), { a: sold, e: eSold, p: Math.round(sold / Math.max(1, eSold) * 100), f: Math.round(sold / Math.max(1, cap) * 100) }));
  const canc = pm.shows.filter((x) => x.st === 'cancelled').length;
  if (canc) why.push(fmtL(l('{n} data(s) cancelada(s){i}.', '{n} date(s) cancelled{i}.'), { n: canc, i: ins ? fmtL(l('; o seguro devolveu {x}', '; insurance paid {x}'), { x: usd(ins) }) : '' }));
  why.push(share ? fmtL(l('Para o selo: {n} (sua parte {p}% de cachê e merch, menos a logística).', 'For the label: {n} (your {p}% of fees and merch, minus logistics).'), { n: usd(label), p: Math.round(share * 100) }) : fmtL(l('Para o selo: {n} (contrato clássico: a bilheteria é do artista; você pagou a logística por fãs e vendas).', 'For the label: {n} (classic deal: the box office is the act\'s; you paid logistics for fans and sales).'), { n: usd(label) }));
  if (fans) why.push(fmtL(l('{n} fãs a mais desde o anúncio.', '{n} more fans since the announcement.'), { n: fans }));
  const b = act ? band18(s, act.id) : undefined;
  if (b) why.push(fmtL(l('Show afiado {t}/100, entrosamento {c}{f}.', 'Show tightness {t}/100, chemistry {c}{f}.'), { t: Math.round(b.tight), c: Math.round(b.chem), f: b.fights ? fmtL(l(', {n} briga(s) no total', ', {n} fight(s) so far'), { n: b.fights }) : '' }));
  const ratio = sold / Math.max(1, eSold);
  const verdict = canc > played.length ? l('Turnê interrompida', 'Tour cut short') : ratio >= 1.1 ? l('Acima do previsto', 'Beat the forecast') : ratio >= 0.85 ? l('Dentro do previsto', 'On forecast') : l('Abaixo do previsto', 'Below forecast');
  pm.fin = { sold, cap, pay, merch, fans, net: pay + merch, label, verdict, why };
  if (act) {
    emitFact(s, { kind: 'tour_done', actors: [act.id], severity: Math.min(60, 10 + sold / 3000), text: fmtL(l('{a} fecha "{t}": {n} pessoas, {v}.', '{a} wraps "{t}": {n} people, {v}.'), { a: act.name, t: t.name, n: sold, v: verdict }), tags: ['tour'], src: 'live18', data: { sold, label } });
    pushInbox18(s, 'live18', { from: l('Gerente de turnê', 'Tour manager').pt, tone: label >= 0 || ratio >= 1 ? 'good' : 'bad', subject: fmtL(l('Post-mortem: {t}', 'Post-mortem: {t}'), { t: t.name }), body: fmtL(l('{v}. {w}', '{v}. {w}'), { v: verdict, w: why.map((x) => x.pt).join(' ') }), ref: { tour: t.id, act: act.id } });
  }
}

registerInboxKind('live18', { label: l('Estrada', 'Road'), cat: 'deals', icon: 'tour-bus', prio: 1, goto: () => ({ area: 'shows', label: l('Abrir shows', 'Open shows') }) });

export function liveMonth18(s: GameState): void {
  const v = live18(s);
  for (const t of s.tours) {
    const pm = tourPM18(s, t.id);
    if (!pm) continue;
    const act = s.acts[t.actId];
    // cancelamentos: com seguro, devolve parte da logística da data e do cachê previsto
    for (const st of t.stops) {
      if (st.status !== 'cancelled') continue;
      const ps = pm.shows.find((x) => x.d === st.day && x.c === st.cityId);
      if (!ps || ps.st === 'cancelled') continue;
      ps.st = 'cancelled';
      const k = kitOf18(t);
      if (st.note && k.ins) {
        const c = act?.contractId ? s.contracts[act.contractId] : undefined;
        const share = act?.playerBand ? 1 : c?.model === '360' ? c.share360 : 0;
        const amt = Math.round(t.costReserved / Math.max(1, t.stops.length) * 0.9 + ps.ep * share * 0.5);
        if (amt > 0) { post(s, `l18:ins:${t.id}:${st.day}`, amt, 'other_income', `Seguro de turnê: ${t.name}`); ps.ins = amt; }
        ps.n.push(fmtL(l('Cancelado ({w}); o seguro pagou {x}.', 'Cancelled ({w}); insurance paid {x}.'), { w: st.note, x: usd(amt) }));
      } else if (st.note) ps.n.push(fmtL(l('Cancelado ({w}); sem seguro, o prejuízo ficou com você.', 'Cancelled ({w}); uninsured, the loss is yours.'), { w: st.note }));
      else {
        ps.n.push(l('Cancelado por decisão sua: promotores locais lembram disso.', 'Cancelled by your decision: local promoters remember.'));
        const rel = c12(s).rel; rel[st.cityId] = clamp((rel[st.cityId] ?? 30) - 3, 0, 100);
      }
    }
    if ((t.status === 'done' || t.status === 'cancelled') && !pm.fin) closeTour(s, t, pm);
  }
  // estrada parada: o show perde o fio
  for (const id of Object.keys(v.band)) {
    const b = v.band[id];
    if (!s.acts[id]) { delete v.band[id]; continue; }
    if (!s.tours.some((t) => t.actId === id && t.status === 'running')) { b.tight = Math.max(10, b.tight - 2); b.chem *= 0.97; }
  }
  // programa de bem-estar (V3)
  if (v.well) {
    const cost = wellCost18(s);
    if (cost) post(s, `l18:well:${s.year}:${s.month}`, -cost, 'artist_dev', 'Programa de bem-estar do elenco');
    for (const id of playerActs(s)) { const a = s.acts[id]; if (!a) continue; a.trust = clamp(a.trust + 0.15, 0, 100); for (const pid of a.members) relieveLong(s, pid, 1.5); }
  }
  // crônica real (modo exato)
  if (histMode(s) === 'strict') for (const c of CHRON18) {
    const key = `${c.y}:${c.m}`;
    if (c.y === s.year && c.m === s.month && !v.chron[key]) { v.chron[key] = 1; emitFact(s, { kind: 'crowd_incident', actors: [], severity: 70, text: c.t, tags: ['safety', 'chron'], src: 'chron' }); logIt(s, c.t); }
  }
  // história alternativa: tragédias raras em shows de qualquer um (não só os seus)
  else if (s.year >= 1960) {
    const r = Rng.fromSeed(`${s.config.seed}:live18w:${s.year}:${s.month}`);
    if (r.chance(0.004 * safetyNorm18(s))) {
      const pool = Object.values(s.acts).filter((a) => a.status === 'active' && a.fame >= 55 && a.owner !== 'player' && !a.playerBand && MOSH.has(familyOf(a.genre)));
      if (pool.length) {
        const a = r.pick(pool);
        const text = fmtL(l('Tragédia num show de {a}: a multidão é esmagada contra a grade (história alternativa).', 'Tragedy at a {a} show: the crowd is crushed against the barrier (alternate history).'), { a: a.name });
        a.momentum = clamp(a.momentum - 10, 0, 100);
        v.inc.push({ y: s.year, sev: 3 }); if (v.inc.length > 20) v.inc.shift();
        emitFact(s, { kind: 'crowd_incident', actors: [a.id], place: a.city, severity: 80, text, tags: ['safety'], src: 'live18', data: { sev: 3 } });
        logIt(s, text);
      }
    }
  }
}
registerSimHook('month', 'live18', (s) => liveMonth18(s));

// exclusividade com o gigante (V2): bônus anual de assinatura × backlash por taxas e processo antitruste
registerSimHook('year', 'live18', (s) => {
  const v = live18(s);
  if (!v.excl || s.year < GIANT_FROM18) return;
  const n = playerActs(s).filter((id) => (s.acts[id]?.fame ?? 0) >= 30).length;
  if (n) post(s, `l18:excl:${s.year}`, money(s, 4000) * n, 'live', `${giant18(s)?.name}: bônus de exclusividade`);
  const r = Rng.fromSeed(`${s.config.seed}:live18x:${s.year}`);
  if (r.chance(s.year >= 2010 ? 0.12 : 0.07)) {
    const text = fmtL(l('Fãs e o governo atacam {g}: taxas abusivas e cambismo na revenda. Quem é exclusivo leva respingo.', 'Fans and regulators go after {g}: junk fees and resale scalping. Exclusive partners get splashed.'), { g: giant18(s)?.name ?? '' });
    emitFact(s, { kind: 'boycott', actors: ['player'], severity: 35, text, tags: ['antitrust', 'tickets'], src: 'live18' });
    s.player.reputation.artistic = clamp(s.player.reputation.artistic - 2, 0, 100);
    for (const id of playerActs(s)) { const f = fan18(s, id); if (f) f.loy = clamp(f.loy - 3, 0, 100); }
    notify(s, text, 'bad'); logIt(s, text);
  }
});

export function setExcl18(s: GameState, on: boolean): L | null {
  const v = live18(s);
  if (on && s.year < GIANT_FROM18) return l('Ainda não existe promotor nacional dominante.', 'No dominant national promoter exists yet.');
  if (on && !v.excl) { v.excl = s.year; const rel = c12(s).rel; for (const k of Object.keys(rel)) rel[k] = clamp(rel[k] - 10, 0, 100); logIt(s, fmtL(l('Exclusividade com {g}: garantias +15% e bônus anual; promotores locais esfriam.', 'Exclusive with {g}: guarantees +15% and a yearly bonus; local promoters cool off.'), { g: giant18(s)?.name ?? '' })); }
  if (!on) delete v.excl;
  return null;
}
export function setWell18(s: GameState, on: boolean): void { live18(s).well = on; }

// ------------------------------------------------------------------ playbot: kit sensato

export function botKit18(s: GameState, actId: string, gross: number, shows: number, km: number): Kit18 {
  const act = s.acts[actId];
  const k: Kit18 = { ...KIT0 };
  if (!act) return k;
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const share = act.playerBand ? 1 : c?.model === '360' ? c.share360 : 0;
  // contrato clássico: o selo só paga a logística — economiza; com parte da bilheteria, protege a receita
  if (act.fame < 30 && act.members.length <= 5 && share) k.move = 'van'; // banda própria pequena: van (cansa mais, custa menos)
  else if (share && km > shows * 900 && s.year >= FLY_FROM18 && act.fame >= 55) k.move = 'fly';
  if (share && gross * share > money(s, 40000)) k.ins = 1;
  if (share && shows >= 6 && act.fame >= 35) k.reh = 1;
  if (s.year >= GIANT_FROM18 && act.fame >= 45 && share) k.prom = 'giant';
  return k;
}

// ------------------------------------------------------------------ explicações e conselheiro

registerExplain('live18.show', (s, c) => {
  const pm = tourPM18(s, String(c.tour));
  const ps = pm?.shows[Number(c.i)];
  if (!pm || !ps) return null;
  return { title: fmtL(l('{c}: previsto × real', '{c}: forecast × actual'), { c: cityById[ps.c]?.name ?? ps.c }), value: `${ps.a}/${ps.e}`, fmt: 'text',
    parts: [...ps.f.map(([label, v]) => ({ label, value: v, fmt: 'mult' as const, tone: (v > 1.01 ? 'good' : v < 0.99 ? 'bad' : '') as 'good' | 'bad' | '' })), ...ps.n.map((n) => ({ label: n, fmt: 'text' as const }))],
    note: l('Fatores multiplicam a previsão do planejador; o resto é sorte da noite (±15%) e o teto da casa.', 'Factors multiply the planner forecast; the rest is the luck of the night (±15%) and the room cap.') };
});
registerExplain('live18.band', (s, c) => {
  const a = s.acts[String(c.act)];
  if (!a) return null;
  const b = band18(s, a.id);
  return { title: l('A estrada no artista', 'The road on the act'), value: Math.round(b.tight), parts: [
    { label: l('Show afiado (sobe a cada show, cai parado)', 'Tight show (rises each gig, fades off the road)'), value: Math.round(b.tight) },
    { label: l('Entrosamento (casa cheia, conforto × cansaço)', 'Chemistry (full rooms, comfort × fatigue)'), value: Math.round(b.chem), fmt: 'signed', tone: b.chem < -8 ? 'bad' : b.chem > 8 ? 'good' : '' },
    { label: l('Brigas na estrada', 'Road fights'), value: b.fights },
    { label: l('Músicas que cresceram ao vivo', 'Songs that grew live'), value: Object.values(b.grown).filter((x) => x >= 3).length },
  ], note: l('Show afiado: até +8% de público; entrosamento ±8%. Entrosamento negativo abre chance de briga.', 'Tight show: up to +8% draw; chemistry ±8%. Negative chemistry opens the door to fights.') };
});

registerAdvisorTip('live18', (s) => {
  const out = [];
  for (const t of s.tours) {
    if (t.status !== 'planned') continue;
    const pm = tourPM18(s, t.id), k = kitOf18(t);
    const gross = pm ? pm.shows.reduce((a, x) => a + x.e * (t.stops.find((y) => y.day === x.d)?.price ?? 0), 0) : 0;
    if (!k.ins && gross > money(s, 60000)) out.push({ id: `live18-ins-${t.id}`, level: 'warn' as const, cat: 'cash' as const, score: 45, text: fmtL(l('"{t}" está sem seguro.', '"{t}" is uninsured.'), { t: t.name }), why: [l('Acidente, clima, doença ou visto podem cancelar datas: sem seguro, a logística da data é perdida.', 'Accidents, weather, illness or visas can cancel dates: uninsured, that date\'s logistics are lost.')], goto: { area: 'shows' } });
  }
  for (const id of playerActs(s)) {
    const b = live18(s).band[id], a = s.acts[id];
    if (a && b && b.chem < -15) out.push({ id: `live18-chem-${id}`, level: 'warn' as const, cat: 'people' as const, score: 52, text: fmtL(l('{a}: o clima na estrada azedou.', '{a}: the mood on the road has soured.'), { a: a.name }), why: [l('Diárias e hospedagem ruins, cansaço e casas vazias derrubam o entrosamento.', 'Bad per diems and lodging, fatigue and empty rooms drag chemistry down.')], effect: l('Diárias normais/boas, hotel melhor ou programa de bem-estar.', 'Normal/generous per diems, better hotels or a wellness programme.'), goto: { act: id } });
  }
  return out;
});

export const liveLog18 = (s: GameState) => live18(s).log;
export const VENUE_NAME18 = (t: number) => VENUE_TIERS[t]?.name ?? l('?', '?');
