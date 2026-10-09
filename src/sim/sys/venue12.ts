// Carreira de dono de casa de shows (rodada 12), por cima da casa própria do sistema "live": calendário
// fixo de programação (noites autorais, residências, festas, eventos privados, aluguel), público
// frequente que confia na curadoria, relação com artistas e produtores locais, três tipos de acordo
// (aluguel fixo, divisão de porta, produção própria), reformas com efeito específico, equipe e
// manutenção pela programação, vizinhança (barulho e horário) e três metas: clube de referência,
// rede de casas ou espaço grande. A aleatoriedade usa gerador próprio (semente + mês).

import { Rng, clamp } from '../../core/rng';
import { cityById, l, type L } from '../../data/world';
import { deferEvents, registerExt4, registerSimHook } from '../ext4';
import { emitEvent, type EventDef } from '../events';
import type { Act, GameState } from '../types';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { monthIndex } from '../capacity';
import { isMine, liveOf, type OwnVenue } from './live/state';
import { VENUE_KINDS, venueKind } from './live/venue';

export type NightK = 'original' | 'residency' | 'party' | 'private' | 'rental';
export type DealK = 'rent' | 'door' | 'own';
export type DayK = 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type UpK = 'sound' | 'access' | 'dressing' | 'stage' | 'flow';
export type Goal = 'reference' | 'chain' | 'big';
export interface Night { id: string; k: NightK; day: DayK; deal: DealK; actId?: string; name: string; age: number; idn: number; last?: { att: number; net: number } }
export interface Branch { id: string; city: string; name: string; y: number }
export interface V12 {
  key: string; prog: Night[]; regulars: number; scene: number; neigh: number; cond: number; staff: number; maint: number; ups: Partial<Record<UpK, number>>;
  rel: Record<string, number>; hist: { y: number; m: number; net: number; att: number; reg: number }[]; notes: { w: number; t: L }[];
  goal: Goal; branches: Branch[]; refMonths: number; done: Partial<Record<Goal, number>>; quietUntil: number; corpAt: number;
}

declare module '../ext4' { interface Ext4 { venue12: { v: V12 | null } } }
registerExt4('venue12', () => ({ v: null }));
const keyOf = (v: OwnVenue) => `${v.cityId}:${v.boughtYear}:${v.name}`;
export function v12(s: GameState): V12 | null {
  const x = s.x4 as unknown as { venue12?: { v: V12 | null } };
  x.venue12 ??= { v: null };
  const v = liveOf(s).venue;
  if (!v) return null;
  if (!x.venue12.v || x.venue12.v.key !== keyOf(v)) {
    x.venue12.v = { key: keyOf(v), prog: [], regulars: 15, scene: 30, neigh: 60, cond: 80, staff: 2, maint: 1, ups: {}, rel: {}, hist: [], notes: [], goal: 'reference', branches: [], refMonths: 0, done: {}, quietUntil: 0, corpAt: 0 };
  }
  return x.venue12.v;
}

// ---------------------------------------------------------------- dados

export const NIGHTS: Record<NightK, { name: L; desc: L; occ: number; price: number; noise: number; idn: number; staff: number }> = {
  original: { name: l('Noite autoral', 'Original night'), desc: l('Curadoria da casa com artistas locais. Constrói identidade e público fiel; começa vazia.', 'House-curated night with local acts. Builds identity and regulars; starts empty.'), occ: 0.3, price: 12, noise: 1.5, idn: 3, staff: 1 },
  residency: { name: l('Residência', 'Residency'), desc: l('O mesmo artista toda semana. Fiéis dele viram fiéis da casa.', 'The same act every week. Their fans become the house\'s regulars.'), occ: 0.35, price: 15, noise: 1.2, idn: 2.5, staff: 1 },
  party: { name: l('Festa', 'Party'), desc: l('DJ e bar cheio: muito dinheiro no bar, muito barulho, pouca identidade.', 'DJ and a packed bar: lots of bar money, lots of noise, little identity.'), occ: 0.5, price: 10, noise: 3, idn: 0.8, staff: 2 },
  private: { name: l('Evento privado', 'Private event'), desc: l('Empresas e casamentos pagam a noite fechada. Dinheiro certo, nada de público fiel.', 'Companies and weddings pay for the closed night. Sure money, no regulars.'), occ: 0.9, price: 0, noise: 1, idn: 0, staff: 1 },
  rental: { name: l('Aluguel a produtor', 'Producer rental'), desc: l('Um produtor local leva a noite; a casa recebe o combinado.', 'A local promoter runs the night; the house gets the agreed share.'), occ: 0.3, price: 12, noise: 1.5, idn: 1, staff: 1 },
};
export const DEALS: Record<DealK, { name: L; desc: L }> = {
  rent: { name: l('Aluguel fixo', 'Fixed rent'), desc: l('A casa recebe um valor fixo; o risco é do produtor. Identidade cresce devagar.', 'The house gets a fixed fee; the promoter takes the risk. Identity grows slowly.') },
  door: { name: l('Divisão de porta', 'Door split'), desc: l('35% da porta para a casa, 65% para os artistas. Justo: a cena local gosta.', '35% of the door to the house, 65% to the artists. Fair: the local scene likes it.') },
  own: { name: l('Produção própria', 'Own production'), desc: l('A casa paga cachê e divulgação e fica com a porta. Mais risco, identidade mais rápida.', 'The house pays fee and promo and keeps the door. More risk, faster identity.') },
};
export const DAYS: Record<DayK, { name: L; occ: number; late: number }> = {
  wed: { name: l('Quarta', 'Wednesday'), occ: -0.06, late: 0.8 }, thu: { name: l('Quinta', 'Thursday'), occ: 0.03, late: 0.9 },
  fri: { name: l('Sexta', 'Friday'), occ: 0.12, late: 1.25 }, sat: { name: l('Sábado', 'Saturday'), occ: 0.14, late: 1.25 }, sun: { name: l('Domingo', 'Sunday'), occ: -0.02, late: 0.7 },
};
export const UPS: Record<UpK, { name: L; desc: L; f: number }> = {
  sound: { name: l('Isolamento acústico', 'Soundproofing'), desc: l('Barulho para a vizinhança −65%: festas e noites longas sem multa.', 'Noise for the neighbours −65%: parties and late nights without fines.'), f: 0.12 },
  access: { name: l('Acessibilidade', 'Accessibility'), desc: l('Rampas, banheiro adaptado, área reservada: +4% de ocupação, fiéis mais velhos, vizinhança e reputação institucional.', 'Ramps, adapted toilets, a reserved area: +4% occupancy, older regulars, neighbours and institutional reputation.'), f: 0.07 },
  dressing: { name: l('Camarins', 'Dressing rooms'), desc: l('Artistas tratados bem: relação com a cena sobe mais rápido e cachês locais −15%.', 'Artists treated well: scene relations rise faster and local fees −15%.'), f: 0.05 },
  stage: { name: l('Palco e luz', 'Stage and lights'), desc: l('Shows melhores: +6% de ocupação nas noites com artista e identidade mais rápida.', 'Better shows: +6% occupancy on nights with acts and faster identity.'), f: 0.1 },
  flow: { name: l('Circulação', 'Circulation'), desc: l('Saídas, bares e chapelaria redesenhados: capacidade +15% e menos desgaste.', 'Exits, bars and cloakroom redesigned: capacity +15% and less wear.'), f: 0.1 },
};
export const GOALS: Record<Goal, { name: L; desc: L }> = {
  reference: { name: l('Clube de referência cultural', 'Cultural reference club'), desc: l('Fiéis 70+, cena 65+ e duas noites com identidade 60+ por 12 meses.', 'Regulars 70+, scene 65+ and two nights with identity 60+ for 12 months.') },
  chain: { name: l('Rede de casas', 'Venue chain'), desc: l('Abrir três filiais que vivem da marca (fiéis e identidade).', 'Open three branches that live off the brand (regulars and identity).') },
  big: { name: l('Espaço grande', 'Big space'), desc: l('Mudar para um teatro ou arena sem perder o público (fiéis 60+ no espaço novo).', 'Move to a theatre or arena without losing the crowd (regulars 60+ in the new space).') },
};

const note = (s: GameState, x: V12, t: L) => { x.notes.push({ w: s.week, t }); if (x.notes.length > 30) x.notes.shift(); };
const scale = (s: GameState, v: OwnVenue) => venueKind(v.kind).cap / 400;
export const effCap = (v: OwnVenue, x: V12) => Math.round(venueKind(v.kind).cap * (x.ups.flow ? 1.15 : 1));
export const localActs = (s: GameState, v: OwnVenue): Act[] => Object.values(s.acts).filter((a) => a.city === v.cityId && a.status !== 'retired' && a.status !== 'split' && a.members.length > 0 && (isMine(s, a.id) || a.fame < 55)).sort((a, b) => b.fame - a.fame).slice(0, 24);
export const localFee = (s: GameState, x: V12, a: Act) => (isMine(s, a.id) ? 0 : Math.round(money(s, 150 + a.fame * a.fame * 4) * (x.ups.dressing ? 0.85 : 1) * ((x.rel[a.id] ?? 30) >= 60 ? 0.8 : 1)));
export function staffNeed(x: V12): number { return Math.max(1, Math.ceil(x.prog.reduce((t, n) => t + NIGHTS[n.k].staff, 0) * 0.8)); }

// ---------------------------------------------------------------- previsão por noite

export interface NightEst { att: number; occ: number; door: number; bar: number; house: number; cost: number; net: number; why: L[] }
export function nightEst(s: GameState, v: OwnVenue, x: V12, n: Night): NightEst {
  const K = NIGHTS[n.k];
  const why: L[] = [];
  const act = n.actId ? s.acts[n.actId] : undefined;
  let occ = K.occ + DAYS[n.day].occ + x.regulars / 250 * (n.k === 'original' || n.k === 'residency' ? 1.3 : 0.6) + n.idn / 400 + x.scene / 500 + v.acoustics * 0.04;
  if (act) { occ += act.fame / 250 + ((x.rel[act.id] ?? 30) >= 60 ? 0.05 : 0); if (x.ups.stage) occ += 0.06; }
  if (x.ups.access) occ += 0.04;
  if (x.cond < 40) { occ -= 0.1; why.push(l('Casa malconservada: −10% de público.', 'Run-down house: −10% crowd.')); }
  if (x.staff < staffNeed(x)) { occ -= 0.06; why.push(l('Equipe curta para a programação: filas e atendimento ruim.', 'Staff too thin for the programme: queues and poor service.')); }
  const quiet = monthIndex(s) < x.quietUntil;
  if (quiet && (n.k === 'party' || DAYS[n.day].late > 1)) { occ -= 0.08; why.push(l('Horário reduzido por acordo com a vizinhança.', 'Shorter hours agreed with the neighbours.')); }
  if (n.k === 'private') occ = 0.9;
  occ = clamp(occ, 0.06, 1);
  const att = Math.round(effCap(v, x) * occ);
  const sc = scale(s, v);
  const door = n.k === 'private' ? 0 : att * money(s, K.price + (act ? act.fame / 10 : 0));
  const bar = att * money(s, 2 + v.bar * 1.5) * (n.k === 'party' ? 0.8 : 0.5) * (quiet ? 0.85 : 1);
  let house = bar;
  let cost = money(s, 60 * K.staff) * Math.pow(sc, 0.7);
  if (n.k === 'private') house += money(s, venueKind(v.kind).rent * 3);
  else if (n.deal === 'rent') { house += money(s, venueKind(v.kind).rent) * 0.9; why.push(l('Aluguel fixo: a porta é do produtor.', 'Fixed rent: the door belongs to the promoter.')); }
  else if (n.deal === 'door') house += door * 0.35;
  else { house += door; cost += (act ? localFee(s, x, act) : money(s, 120 * sc)) + money(s, 80 * sc); }
  const per = { att, occ, door, bar, house, cost, net: 0, why };
  per.att *= 4; per.door *= 4; per.bar *= 4; per.house = Math.round(house * 4); per.cost = Math.round(cost * 4); per.net = per.house - per.cost;
  return per;
}

export function monthEst12(s: GameState): { house: number; cost: number; net: number; maint: number; staff: number; branches: number } | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return null;
  let house = 0, cost = 0;
  for (const n of x.prog) { const e = nightEst(s, v, x, n); house += e.house; cost += e.cost; }
  const sc = Math.pow(scale(s, v), 0.7);
  const staff = money(s, 900) * x.staff * sc;
  const maint = money(s, [0, 600, 1500][x.maint]) * sc;
  const branches = x.branches.length * Math.round(money(s, 5000) * (x.regulars / 70) * (0.6 + bestIdn(x) / 150) - money(s, 3200));
  return { house: Math.round(house), cost: Math.round(cost), net: Math.round(house - cost - staff - maint + branches), maint: Math.round(maint), staff: Math.round(staff), branches };
}
const bestIdn = (x: V12) => x.prog.reduce((t, n) => Math.max(t, n.idn), 0);

// ---------------------------------------------------------------- ações

function freeRentals(v: OwnVenue, x: V12): void {
  v.rentalNights = Math.max(0, Math.min(v.rentalNights, 26 - v.ownNights - x.prog.length * 4));
}

export function addNight12(s: GameState, o: { k: NightK; day: DayK; deal: DealK; actId?: string; name?: string }): L | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return l('Sem casa de shows.', 'No venue.');
  if (x.prog.some((n) => n.day === o.day)) return l('Esse dia da semana já tem programação fixa.', 'That weekday already has a fixed night.');
  if (o.k === 'residency' && !o.actId) return l('Residência precisa de um artista.', 'A residency needs an act.');
  if (o.actId && (x.rel[o.actId] ?? 30) < 15 && !isMine(s, o.actId)) return l('Esse artista não quer mais tocar na sua casa (relação ruim).', 'That act no longer wants to play your house (bad relations).');
  const deal: DealK = o.k === 'private' ? 'rent' : o.k === 'rental' ? 'rent' : o.deal;
  const a = o.actId ? s.acts[o.actId] : undefined;
  x.prog.push({ id: nextId(s, 'vn12'), k: o.k, day: o.day, deal, actId: o.actId, name: o.name?.trim() || (a ? `${a.name} — ${NIGHTS[o.k].name.pt}` : NIGHTS[o.k].name.pt), age: 0, idn: 0 });
  freeRentals(v, x);
  return null;
}

export function dropNight12(s: GameState, id: string): void {
  const x = v12(s);
  const n = x?.prog.find((y) => y.id === id);
  if (!x || !n) return;
  x.prog = x.prog.filter((y) => y !== n);
  if (n.age >= 6) {
    const hit = Math.round(n.idn / 8);
    x.regulars = clamp(x.regulars - hit, 0, 100);
    note(s, x, fmtL(l('"{n}" acabou depois de {m} meses: −{h} de confiança dos frequentadores.', '"{n}" ended after {m} months: −{h} regulars\' trust.'), { n: n.name, m: n.age, h: hit }));
  }
  if (n.actId) x.rel[n.actId] = clamp((x.rel[n.actId] ?? 30) - 10, 0, 100);
}

export function setDeal12(s: GameState, id: string, deal: DealK): void {
  const x = v12(s);
  const n = x?.prog.find((y) => y.id === id);
  if (!x || !n || n.k === 'private' || n.k === 'rental' || n.deal === deal) return;
  n.deal = deal;
  if (n.age >= 3) { n.idn = Math.max(0, n.idn - 5); note(s, x, fmtL(l('Novo acordo em "{n}": a noite perde um pouco da cara.', 'New deal on "{n}": the night loses some of its character.'), { n: n.name })); }
}

export const upCost = (s: GameState, v: OwnVenue, u: UpK) => money(s, venueKind(v.kind).price * UPS[u].f);
export function upgrade12(s: GameState, u: UpK): L | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return l('Sem casa de shows.', 'No venue.');
  if (x.ups[u]) return l('Já feito.', 'Already done.');
  const c = upCost(s, v, u);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `v12up:${u}`, -c, 'investments', `Reforma: ${UPS[u].name.pt} (${v.name})`);
  x.ups[u] = s.year;
  if (u === 'access') s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
  if (u === 'sound') x.neigh = clamp(x.neigh + 10, 0, 100);
  note(s, x, fmtL(l('Reforma pronta: {u}.', 'Renovation done: {u}.'), { u: UPS[u].name }));
  return null;
}

export function setStaff12(s: GameState, n: number): void { const x = v12(s); if (x) x.staff = clamp(Math.round(n), 1, 12); }
export function setMaint12(s: GameState, n: number): void { const x = v12(s); if (x) x.maint = clamp(Math.round(n), 0, 2); }
export function setGoal12(s: GameState, g: Goal): void { const x = v12(s); if (x) x.goal = g; }

export function neighFund12(s: GameState): L | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return l('Sem casa de shows.', 'No venue.');
  const c = money(s, 1500 * Math.pow(scale(s, v), 0.6));
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `v12nb:${monthIndex(s)}`, -c, 'live_costs', `Fundo do bairro (${v.name})`);
  x.neigh = clamp(x.neigh + 12, 0, 100);
  note(s, x, l('Você financiou a praça e a limpeza da rua: a vizinhança respira.', 'You funded the square and street cleaning: the neighbours relax.'));
  return null;
}
export function quiet12(s: GameState): void {
  const x = v12(s);
  if (!x) return;
  x.quietUntil = monthIndex(s) + 6;
  x.neigh = clamp(x.neigh + 8, 0, 100);
  note(s, x, l('Acordo de horário por 6 meses: menos barulho, festas e noites de fim de semana rendem menos.', '6-month hours agreement: less noise, parties and weekend nights earn less.'));
}

export const branchCost = (s: GameState) => money(s, VENUE_KINDS[0].price * 1.3);
export function branch12(s: GameState, city: string): L | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return l('Sem casa de shows.', 'No venue.');
  if (!cityById[city] || city === v.cityId || x.branches.some((b) => b.city === city)) return l('Escolha outra cidade.', 'Pick another city.');
  if (x.regulars < 55 || bestIdn(x) < 50) return l('A marca ainda não se sustenta fora de casa (fiéis 55+ e uma noite com identidade 50+).', 'The brand cannot travel yet (regulars 55+ and one night with identity 50+).');
  const c = branchCost(s);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `v12br:${city}`, -c, 'investments', `Filial ${v.name} em ${cityById[city].name.pt}`);
  x.branches.push({ id: nextId(s, 'br'), city, name: `${v.name} ${cityById[city].name.pt}`, y: s.year });
  x.regulars = clamp(x.regulars - 3, 0, 100);
  note(s, x, fmtL(l('Filial aberta em {c}. A atenção dividida custa um pouco à casa-mãe.', 'Branch opened in {c}. Divided attention costs the flagship a little.'), { c: cityById[city].name }));
  if (x.branches.length >= 3 && !x.done.chain) { x.done.chain = s.year; remember(s, 'venue12', fmtL(l('{v} vira rede: {n} casas.', '{v} becomes a chain: {n} venues.'), { v: v.name, n: x.branches.length + 1 }), { important: true }); }
  return null;
}

export function biggerCost(s: GameState, v: OwnVenue): number {
  const i = VENUE_KINDS.findIndex((k) => k.id === v.kind);
  const nk = VENUE_KINDS[i + 1];
  return nk ? Math.max(0, money(s, nk.price) - Math.round(v.price * 0.6)) : 0;
}
export function bigger12(s: GameState): L | null {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return l('Sem casa de shows.', 'No venue.');
  const i = VENUE_KINDS.findIndex((k) => k.id === v.kind);
  const nk = VENUE_KINDS[i + 1];
  if (!nk || s.year < nk.minYear) return l('Não há espaço maior disponível.', 'No bigger space available.');
  const c = biggerCost(s, v);
  if (s.player.cash < c) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `v12big:${nk.id}`, -c, 'investments', `Mudança para ${nk.name.pt}: ${v.name}`);
  v.kind = nk.id;
  v.price = money(s, nk.price);
  x.regulars = Math.round(x.regulars * 0.75);
  for (const n of x.prog) n.idn = Math.round(n.idn * 0.8);
  x.ups = {};
  x.neigh = 60;
  x.cond = 90;
  note(s, x, fmtL(l('Mudança para {k}: 25% dos frequentadores sentem falta da sala pequena; reformas recomeçam do zero.', 'Moved to a {k}: 25% of regulars miss the small room; renovations start over.'), { k: nk.name }));
  remember(s, 'venue12', fmtL(l('{v} muda para um espaço maior ({k}).', '{v} moves to a bigger space ({k}).'), { v: v.name, k: nk.name }), { important: true });
  return null;
}

// ---------------------------------------------------------------- festa corporativa (cenário)

const CORP: EventDef = {
  id: 'v12_corp', cat: 'business', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true,
  title: l('Uma empresa quer a sexta inteira', 'A company wants the whole Friday'),
  text: l('Uma empresa oferece {amountTxt} para fechar a casa numa sexta para a festa de fim de ano. Só que sexta é "{night}", a noite que construiu a cara da casa.', 'A company offers {amountTxt} to book the house on a Friday for its year-end party. But Friday is "{night}", the night that built the house\'s identity.'),
  options: [
    { id: 'take', label: l('Aceitar e cancelar a noite tradicional', 'Accept and cancel the traditional night'), hint: l('Dinheiro alto; fiéis, artistas e cena sentem.', 'Big money; regulars, artists and the scene feel it.'), apply: (s, _r, c) => corp(s, 'take', String(c.nid), Number(c.amount)) },
    { id: 'move', label: l('Aceitar e mudar a noite para quinta', 'Accept and move the night to Thursday'), hint: l('Metade do estrago; quinta enche menos.', 'Half the damage; Thursday fills less.'), apply: (s, _r, c) => corp(s, 'move', String(c.nid), Number(c.amount)) },
    { id: 'no', label: l('Recusar: a sexta é do público', 'Decline: Friday belongs to the crowd'), hint: l('Fiéis e cena reconhecem.', 'Regulars and the scene notice.'), apply: (s, _r, c) => corp(s, 'no', String(c.nid), 0) },
  ],
};
deferEvents([CORP]);

export function corp(s: GameState, how: 'take' | 'move' | 'no', nid: string, amount: number): void {
  const v = liveOf(s).venue;
  const x = v12(s);
  const n = x?.prog.find((y) => y.id === nid);
  if (!v || !x || !n) return;
  if (how === 'no') {
    x.regulars = clamp(x.regulars + 3, 0, 100);
    x.scene = clamp(x.scene + 2, 0, 100);
    note(s, x, fmtL(l('Você recusou a festa corporativa para manter "{n}": a cena comentou.', 'You turned down the corporate party to keep "{n}": the scene noticed.'), { n: n.name }));
    return;
  }
  const cash = money(s, amount) * (how === 'move' ? 0.85 : 1);
  post(s, `v12corp:${monthIndex(s)}`, Math.round(cash), 'live', `Festa corporativa (${v.name})`);
  if (how === 'take') {
    x.regulars = clamp(x.regulars - 10, 0, 100);
    x.scene = clamp(x.scene - 5, 0, 100);
    n.idn = Math.round(n.idn * 0.7);
    if (n.actId) x.rel[n.actId] = clamp((x.rel[n.actId] ?? 30) - 15, 0, 100);
    note(s, x, fmtL(l('A festa corporativa pagou bem, mas "{n}" foi cancelada: fiéis −10, identidade da noite −30%.', 'The corporate party paid well, but "{n}" was cancelled: regulars −10, night identity −30%.'), { n: n.name }));
  } else {
    const thu = x.prog.find((y) => y.day === 'thu' && y !== n);
    if (thu) thu.day = 'fri';
    n.day = 'thu';
    n.idn = Math.max(0, n.idn - 8);
    x.regulars = clamp(x.regulars - 3, 0, 100);
    note(s, x, fmtL(l('"{n}" mudou para quinta: os fiéis seguiram, a noite enche menos.', '"{n}" moved to Thursday: regulars followed, the night fills less.'), { n: n.name }));
  }
}

// ---------------------------------------------------------------- mês

function venue12Month(s: GameState): void {
  const v = liveOf(s).venue;
  const x = v12(s);
  if (!v || !x) return;
  const r = Rng.fromSeed(`${s.config.seed}:venue12:${monthIndex(s)}`);
  const e = monthEst12(s)!;
  let att = 0;
  let noise = 0;
  for (const n of x.prog) {
    const ne = nightEst(s, v, x, n);
    const k = NIGHTS[n.k];
    att += ne.att;
    n.age += 1;
    n.idn = clamp(n.idn + k.idn * (n.deal === 'own' ? 1.3 : n.deal === 'door' ? 1 : 0.5) * (x.ups.stage && n.actId ? 1.2 : 1) * (ne.occ > 0.5 ? 1 : 0.6), 0, 100);
    n.last = { att: ne.att, net: ne.net };
    noise += k.noise * DAYS[n.day].late;
    const a = n.actId ? s.acts[n.actId] : undefined;
    if (a) {
      x.rel[a.id] = clamp((x.rel[a.id] ?? 30) + (n.deal === 'door' ? 2 : n.deal === 'own' ? 1.5 : 0.5) * (x.ups.dressing ? 1.4 : 1), 0, 100);
      a.fans.casual += Math.round(ne.att * 0.05);
      a.fans.core += Math.round(ne.att * 0.004 * (n.k === 'residency' ? 2 : 1));
      if (!isMine(s, a.id)) a.cash += n.deal === 'door' ? Math.round(ne.door * 0.65) : n.deal === 'own' ? localFee(s, x, a) * 4 : 0;
    }
    if (n.k === 'original' || n.k === 'residency') x.regulars += n.age >= 3 ? 0.9 * (ne.occ > 0.4 ? 1 : 0.5) : 0.2;
    if (n.deal === 'door' || n.k === 'original') x.scene += 0.5;
    if (n.k === 'private' && DAYS[n.day].late > 1) x.regulars -= 0.6;
  }
  post(s, 'v12:rev', e.house + Math.max(0, e.branches), 'live', `Programação ${v.name}`);
  post(s, 'v12:cost', -(e.cost + e.staff + e.maint + Math.max(0, -e.branches)), 'live_costs', `Equipe, cachês e manutenção ${v.name}`);
  // desgaste e manutenção
  const wear = x.prog.reduce((t, n) => t + (n.k === 'party' ? 2 : 1), 0) * (x.ups.flow ? 0.7 : 1);
  x.cond = clamp(x.cond - wear + [0, 3, 6][x.maint], 0, 100);
  if (x.cond < 30 && r.chance(0.25)) {
    const c = money(s, 3000 * Math.pow(scale(s, v), 0.7));
    post(s, 'v12:fix', -c, 'live_costs', `Conserto de emergência ${v.name}`);
    x.cond += 15;
    note(s, x, l('Pane elétrica no meio da noite: conserto de emergência. Manutenção em dia evitaria.', 'Power failure mid-night: emergency repair. Regular maintenance would have prevented it.'));
  }
  // vizinhança
  const quiet = monthIndex(s) < x.quietUntil;
  noise *= (x.ups.sound ? 0.35 : 1) * (quiet ? 0.5 : 1);
  x.neigh = clamp(x.neigh + 1.5 - noise * 0.45 + (x.ups.access ? 0.3 : 0), 0, 100);
  if (x.neigh < 25 && r.chance(0.35)) {
    const fine = money(s, 2000 * Math.pow(scale(s, v), 0.6));
    post(s, 'v12:fine', -fine, 'live_costs', `Multa por barulho ${v.name}`);
    x.quietUntil = Math.max(x.quietUntil, monthIndex(s) + 3);
    x.neigh += 10;
    note(s, x, l('Fiscalização após queixas de barulho: multa e horário reduzido por 3 meses. Isolamento acústico ou acordo com o bairro evitam.', 'Inspection after noise complaints: a fine and shorter hours for 3 months. Soundproofing or a deal with the neighbourhood prevents it.'));
    notify(s, fmtL(l('{v}: multa por barulho.', '{v}: noise fine.'), { v: v.name }), 'bad');
  }
  x.regulars = clamp(x.regulars - 0.4 + (x.ups.access ? 0.1 : 0), 0, 100);
  x.scene = clamp(x.scene - 0.3, 0, 100);
  x.hist.push({ y: s.year, m: s.month, net: e.net, att, reg: Math.round(x.regulars) });
  if (x.hist.length > 24) x.hist.shift();
  // metas
  const strong = x.prog.filter((n) => (n.k === 'original' || n.k === 'residency') && n.idn >= 60).length;
  x.refMonths = x.regulars >= 70 && x.scene >= 65 && strong >= 2 ? x.refMonths + 1 : Math.max(0, x.refMonths - 1);
  if (x.refMonths >= 12 && !x.done.reference) {
    x.done.reference = s.year;
    s.player.reputation.artistic = clamp(s.player.reputation.artistic + 5, 0, 100);
    remember(s, 'venue12', fmtL(l('{v} vira referência cultural da cidade.', '{v} becomes the city\'s cultural landmark.'), { v: v.name }), { important: true });
    notify(s, fmtL(l('{v} é agora uma referência cultural.', '{v} is now a cultural landmark.'), { v: v.name }), 'good');
  }
  if (v.kind !== 'club' && x.regulars >= 60 && !x.done.big) {
    x.done.big = s.year;
    remember(s, 'venue12', fmtL(l('{v} enche o espaço grande com o próprio público.', '{v} fills the big space with its own crowd.'), { v: v.name }), { important: true });
  }
  // festa corporativa: uma sexta tradicional
  const fri = x.prog.find((n) => n.day === 'fri' && n.k !== 'private' && n.idn >= 30);
  if (fri && monthIndex(s) - x.corpAt >= 8 && r.chance(0.08)) {
    x.corpAt = monthIndex(s);
    emitEvent(s, r, CORP.id, { nid: fri.id, night: fri.name, amount: venueKind(v.kind).rent * 7 });
  }
}

registerSimHook('month', 'venue12', (s) => venue12Month(s));
