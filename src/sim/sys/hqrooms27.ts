// r27 (I1) — SALAS E ANDARES COMPRÁVEIS da sede. Mudar de nível (HQ_LEVELS) dá a casca e as salas do jogo
// (estúdio, lounge, escritório, A&R, palco, recepção); as salas extras (estúdio B, sala de imprensa, arquivo de
// fitas, sala de reunião, sala de ensaio, jurídico, marketing, jardim, estúdio imersivo, reforma do lounge) e os
// ANDARES de cima dos prédios grandes vêm fechados: o jogador compra cada um, paga a obra (preço da época × preço
// da cidade e do bairro), espera a construção (meses) e passa a pagar a manutenção mensal. Cada um tem efeito
// real, sempre por mecanismos que já existem: vagas da sede (hqCaps: equipe, carreiras, sessões de estúdio) e
// perks (bilheteria, apelo, vendas, scouting, contratos, moral, estresse, qualidade).
//
// Salas compradas são do selo (equipamento e mobília vão junto na mudança): se a sede nova tem a mesma sala, ela
// já abre — desde que o andar dela esteja montado. Andares são do prédio: na mudança, os novos vêm vazios.
//
// `hqRooms27(s)` é PURA (só lê): o estado de cada sala/andar do nível atual — o interior (ui/ps/hqpx27.ts) e o
// exterior no "Nosso mundo" (campus18px/city27) leem daqui. Estado em `s.x4.hqr27` (versionado).

import { HQ_LEVELS } from '../../data/rules';
import { cityById, l, type L, type MarketId } from '../../data/world';
import { HQ_CAPS27, type HqCaps } from '../branches';
import { registerExt4, registerSimHook } from '../ext4';
import { addAsset } from '../finance';
import { bumpPerks, registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import type { GameState } from '../types';
import { fmtL, money, notify, post, remember } from '../util';
import { cashWhy20, freeCash20 } from '../oblig20';
import { hoodStats19 } from './hood19';

// ---------------------------------------------------------------- catálogo

/** Salas compráveis (os ids batem com as células do desenho em hqpx27.ts). 'loungeVip' é reforma do lounge, sem célula. */
export type Buy27 = 'rehearsal' | 'archive' | 'meeting' | 'studioB' | 'press' | 'legal' | 'marketing' | 'garden' | 'neural' | 'loungeVip';
export const BUY27: Buy27[] = ['rehearsal', 'archive', 'meeting', 'studioB', 'press', 'legal', 'marketing', 'garden', 'neural', 'loungeVip'];

export interface Fx27 { caps?: Partial<HqCaps>; perks?: PerkValues }
export interface RoomDef27 {
  id: Buy27; name: L; desc: L; icon: string;
  /** dólares reais (2020) da obra; manutenção mensal; meses de obra */
  cost: number; upkeep: number; months: number;
  fx: Fx27; fxText: L;
}

export const ROOM_DEFS27: Record<Buy27, RoomDef27> = {
  rehearsal: { id: 'rehearsal', name: l('Sala de ensaio', 'Rehearsal room'), desc: l('Isolamento, retorno e palco marcado no chão: a banda chega pronta para a estrada.', 'Soundproofing, monitors and a stage taped on the floor: the band hits the road ready.'), icon: 'guitar', cost: 18000, upkeep: 250, months: 1, fx: { perks: { showRevenue: 0.04 } }, fxText: l('+4% de bilheteria nos shows', '+4% box office at shows') },
  archive: { id: 'archive', name: l('Arquivo de fitas', 'Tape archive'), desc: l('Acervo catalogado e sala de escuta: o A&R compara demos com o que já deu certo.', 'A catalogued vault and a listening room: A&R compares demos with what already worked.'), icon: 'cd', cost: 30000, upkeep: 300, months: 2, fx: { perks: { signals: 0.5, scoutAccuracy: 0.02 } }, fxText: l('A&R: +0,5 sinal por avaliação e leitura 2% mais precisa', 'A&R: +0.5 signal per assessment and 2% sharper reads') },
  meeting: { id: 'meeting', name: l('Sala de reunião', 'Meeting room'), desc: l('Mesa grande para empresários, advogados e banda: mais carreiras sem perder o controle.', 'A big table for managers, lawyers and bands: more careers without losing control.'), icon: 'handshake', cost: 35000, upkeep: 400, months: 1, fx: { caps: { careers: 2 } }, fxText: l('+2 carreiras na capacidade da sede', '+2 careers of HQ capacity') },
  studioB: { id: 'studioB', name: l('Estúdio B', 'Studio B'), desc: l('Uma segunda técnica com aquário: duas gravações ao mesmo tempo sem fila.', 'A second control room and live room: two sessions at once with no queue.'), icon: 'mic', cost: 120000, upkeep: 1500, months: 3, fx: { caps: { sessions: 1 } }, fxText: l('+1 sessão de estúdio ao mesmo tempo', '+1 studio session at a time') },
  press: { id: 'press', name: l('Sala de imprensa', 'Press room'), desc: l('Coletivas, entrevistas e audições para jornalistas dentro de casa.', 'Press conferences, interviews and listening sessions for journalists in-house.'), icon: 'newspaper', cost: 60000, upkeep: 700, months: 2, fx: { perks: { appeal: 0.03 } }, fxText: l('+3% de apelo nos lançamentos (divulgação)', '+3% release appeal (publicity)') },
  legal: { id: 'legal', name: l('Jurídico', 'Legal'), desc: l('Advogados no andar: contratos revisados antes de assinar.', 'Lawyers on the floor: contracts reviewed before signing.'), icon: 'contract', cost: 50000, upkeep: 800, months: 2, fx: { perks: { advance: -0.03, offer: 0.01 } }, fxText: l('Adiantamentos 3% menores e ofertas um pouco mais fortes', '3% smaller advances and slightly stronger offers') },
  marketing: { id: 'marketing', name: l('Marketing', 'Marketing'), desc: l('Quadro de campanhas, rádio e lojas: o disco aparece onde se vende.', 'Campaign board, radio and retail: the record shows up where it sells.'), icon: 'chart-up', cost: 55000, upkeep: 800, months: 2, fx: { perks: { chartUnits: 0.03 } }, fxText: l('+3% de vendas nas paradas', '+3% chart sales') },
  garden: { id: 'garden', name: l('Jardim suspenso', 'Hanging garden'), desc: l('Plantas, luz natural e silêncio entre uma sessão e outra.', 'Plants, daylight and quiet between sessions.'), icon: 'heart', cost: 90000, upkeep: 900, months: 3, fx: { perks: { stress: -0.05, morale: 0.4 } }, fxText: l('Elenco mais feliz (+0,4 de moral/mês) e 5% menos estresse', 'Happier roster (+0.4 morale/month) and 5% less stress') },
  neural: { id: 'neural', name: l('Estúdio imersivo', 'Immersive studio'), desc: l('Som espacial, telas envolventes e captação de última geração.', 'Spatial audio, wraparound screens and cutting-edge capture.'), icon: 'mic', cost: 260000, upkeep: 3000, months: 4, fx: { caps: { sessions: 1 }, perks: { songQ: 0.8 } }, fxText: l('+1 sessão de estúdio e +0,8 de qualidade nas gravações', '+1 studio session and +0.8 recording quality') },
  loungeVip: { id: 'loungeVip', name: l('Reforma do lounge', 'Lounge makeover'), desc: l('Bar, sofás novos, discos de ouro na parede: o elenco gosta de passar o dia ali.', 'A bar, new sofas, gold records on the wall: the roster likes hanging out there.'), icon: 'guitar', cost: 15000, upkeep: 150, months: 1, fx: { perks: { morale: 0.3, trust: 2 } }, fxText: l('+0,3 de moral/mês e +2 de confiança inicial dos artistas', '+0.3 morale/month and +2 starting trust from acts') },
};

export interface FloorDef27 { floor: number; name: L; cost: number; upkeep: number; months: number; staff: number }
export interface Level27 { floors: number; buyFloors: FloorDef27[]; rooms: { id: Buy27; floor: number }[] }

const F = (floor: number, pt: string, en: string, cost: number, upkeep: number, months: number, staff: number): FloorDef27 => ({ floor, name: l(pt, en), cost, upkeep, months, staff });
/** Por nível da sede (HQ_LEVELS): andares (0 = térreo), andares a montar e salas compráveis com o andar de cada uma. */
export const LEVELS27: Level27[] = [
  { floors: 1, buyFloors: [], rooms: [] },
  { floors: 2, buyFloors: [], rooms: [{ id: 'rehearsal', floor: 0 }, { id: 'loungeVip', floor: 1 }] },
  { floors: 3, buyFloors: [F(2, 'Mezanino', 'Mezzanine', 45000, 600, 2, 2)], rooms: [{ id: 'loungeVip', floor: 1 }, { id: 'rehearsal', floor: 2 }, { id: 'archive', floor: 2 }] },
  { floors: 4, buyFloors: [F(3, 'Último andar', 'Top floor', 160000, 2500, 4, 3)], rooms: [{ id: 'loungeVip', floor: 1 }, { id: 'meeting', floor: 2 }, { id: 'studioB', floor: 3 }, { id: 'press', floor: 3 }] },
  { floors: 5, buyFloors: [F(3, 'Andar corporativo', 'Corporate floor', 420000, 6000, 5, 4), F(4, 'Cobertura', 'Penthouse floor', 480000, 7000, 6, 3)],
    rooms: [{ id: 'studioB', floor: 1 }, { id: 'loungeVip', floor: 2 }, { id: 'legal', floor: 3 }, { id: 'marketing', floor: 3 }, { id: 'meeting', floor: 3 }, { id: 'press', floor: 4 }, { id: 'archive', floor: 4 }] },
  { floors: 5, buyFloors: [F(3, 'Ala de negócios', 'Business wing', 900000, 12000, 6, 5), F(4, 'Terraço verde', 'Green terrace', 1000000, 12000, 7, 3)],
    rooms: [{ id: 'neural', floor: 1 }, { id: 'loungeVip', floor: 2 }, { id: 'legal', floor: 3 }, { id: 'marketing', floor: 3 }, { id: 'press', floor: 3 }, { id: 'garden', floor: 4 }, { id: 'studioB', floor: 4 }, { id: 'archive', floor: 4 }] },
];
export const level27 = (hq: number): Level27 => LEVELS27[Math.max(0, Math.min(LEVELS27.length - 1, Math.floor(hq)))];
/** Obra num prédio maior custa mais (pé-direito, elevador, acabamento). */
const LVL_MUL27 = [1, 1, 1.1, 1.3, 1.6, 2];
/** Preço relativo da construção por mercado da cidade-sede (o bairro ajusta por cima). */
export const MARKET_PRICE27: Record<MarketId, number> = { na: 1, eu: 0.95, oceania: 0.9, asia: 0.85, latam: 0.65, br: 0.6, africa: 0.5 };

export const floorId27 = (hq: number, floor: number): string => `floor:${hq}:${floor}`;

// ---------------------------------------------------------------- estado

export interface Job27 { id: string; start: number; done: number }
export interface Hqr27State { v: 1; own: Partial<Record<Buy27, true>>; floors: Record<string, true>; jobs: Job27[] }
declare module '../ext4' { interface Ext4 { hqr27: Hqr27State } }
const VER27 = 1;
const fresh = (): Hqr27State => ({ v: VER27, own: {}, floors: {}, jobs: [] });
registerExt4('hqr27', fresh);

/** Estado (cria/reinicia se faltar ou se a versão mudou — saves antigos não precisam ser compatíveis). */
export function hqr27(s: GameState): Hqr27State {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  let st = x.hqr27 as Hqr27State | undefined;
  if (!st || st.v !== VER27) { st = fresh(); x.hqr27 = st; }
  return st;
}
const peek27 = (s: GameState): Hqr27State => {
  const st = (s as unknown as { x4?: { hqr27?: Hqr27State } }).x4?.hqr27;
  return st && st.v === VER27 ? st : fresh();
};
const mIdx = (s: GameState): number => s.year * 12 + s.month;

// ---------------------------------------------------------------- preços

/** Multiplicador da cidade-sede: mercado × bairro (aluguel do bairro, 0,85–1,30). */
export function cityMul27(s: GameState): number {
  const m = MARKET_PRICE27[cityById[s.config.homeCity]?.market as MarketId] ?? 1;
  let hood = 1;
  try { hood = hoodStats19(s).rent; } catch { hood = 1; }
  return Math.round(m * hood * 100) / 100;
}
const hqOf = (s: GameState): number => Math.max(0, Math.min(HQ_LEVELS.length - 1, s.player.hq ?? 0));
/** Custo da obra em centavos nominais (época × cidade × tamanho do prédio). */
export function roomCost27(s: GameState, id: Buy27 | string): number {
  const fl = floorDef27(s, id);
  const base = fl ? fl.cost : ROOM_DEFS27[id as Buy27]?.cost ?? 0;
  return Math.round(money(s, base * (fl ? 1 : LVL_MUL27[hqOf(s)])) * cityMul27(s));
}
export function roomUpkeep27(s: GameState, id: Buy27 | string): number {
  const fl = floorDef27(s, id);
  return Math.round(money(s, fl ? fl.upkeep : ROOM_DEFS27[id as Buy27]?.upkeep ?? 0) * cityMul27(s));
}
function floorDef27(s: GameState, id: string): FloorDef27 | undefined {
  if (!id.startsWith('floor:')) return undefined;
  const [, hq, f] = id.split(':');
  if (Number(hq) !== hqOf(s)) return undefined;
  return level27(hqOf(s)).buyFloors.find((x) => x.floor === Number(f));
}

// ---------------------------------------------------------------- leitura pura

export type Status27 = 'open' | 'locked' | 'building';
export interface Unit27 {
  id: string; kind: 'room' | 'floor' | 'upgrade'; name: L; desc: L; icon: string;
  /** andar (0 = térreo) */
  floor: number; status: Status27;
  /** custo da obra e manutenção mensal (centavos nominais); meses de obra */
  cost: number; upkeep: number; months: number;
  /** meses até ficar pronta (obra em andamento); 0 se aberta; = months se ainda não comprada */
  eta: number;
  effect: L; fx: Fx27;
  /** por que ainda não dá para comprar (andar fechado); null = pode (se houver caixa) */
  blocked: L | null;
  /** já é do selo (veio da sede anterior) — abre sozinha quando o andar ficar pronto */
  owned?: boolean;
}

/** Estado de cada sala comprável e andar do nível atual da sede (PURO: não muda o jogo). */
export function hqRooms27(s: GameState): Unit27[] {
  const hq = hqOf(s);
  const lv = level27(hq);
  const st = peek27(s);
  const now = mIdx(s);
  const job = (id: string) => st.jobs.find((j) => j.id === id);
  const out: Unit27[] = [];
  const floorOpen = (f: number) => !lv.buyFloors.some((x) => x.floor === f) || !!st.floors[floorId27(hq, f)];
  for (const fd of lv.buyFloors) {
    const id = floorId27(hq, fd.floor);
    const j = job(id);
    const status: Status27 = st.floors[id] ? 'open' : j ? 'building' : 'locked';
    const names = lv.rooms.filter((r) => r.floor === fd.floor).map((r) => ROOM_DEFS27[r.id].name);
    out.push({
      id, kind: 'floor', name: fd.name, icon: 'building', floor: fd.floor, status,
      desc: fmtL(l('Andar vazio no osso: piso, elétrica, ar e divisórias. Depois abre espaço para: {r}.', 'A bare shell floor: flooring, wiring, air and partitions. Then it makes room for: {r}.'), { r: names.map((x) => x.pt).join(', ') }),
      cost: roomCost27(s, id), upkeep: roomUpkeep27(s, id), months: fd.months, eta: status === 'open' ? 0 : j ? Math.max(1, j.done - now) : fd.months,
      effect: fmtL(l('+{n} vagas de equipe e libera as salas do andar', '+{n} staff seats and unlocks the floor\'s rooms'), { n: fd.staff }), fx: { caps: { staff: fd.staff } }, blocked: null,
    });
  }
  for (const r of lv.rooms) {
    const d = ROOM_DEFS27[r.id];
    const j = job(r.id);
    const fo = floorOpen(r.floor);
    const owned = !!st.own[r.id];
    const status: Status27 = j ? 'building' : owned && fo ? 'open' : 'locked';
    out.push({
      id: r.id, kind: r.id === 'loungeVip' ? 'upgrade' : 'room', name: d.name, desc: d.desc, icon: d.icon, floor: r.floor, status,
      cost: owned ? 0 : roomCost27(s, r.id), upkeep: roomUpkeep27(s, r.id), months: d.months, eta: status === 'open' ? 0 : j ? Math.max(1, j.done - now) : owned ? 0 : d.months,
      effect: d.fxText, fx: d.fx, owned: owned || undefined,
      blocked: status !== 'locked' ? null : !fo ? (owned ? l('Equipamento já é seu: abre quando o andar ficar pronto.', 'You already own the gear: it opens when the floor is ready.') : l('Monte o andar primeiro.', 'Fit out the floor first.')) : null,
    });
  }
  return out;
}

/** Só as unidades abertas, sem calcular preços (barato: hqCaps e perks chamam isto o tempo todo). */
function openUnits27(s: GameState): { id: string; name: L; fx: Fx27 }[] {
  const hq = hqOf(s);
  const lv = level27(hq);
  const st = peek27(s);
  if (!lv.rooms.length && !lv.buyFloors.length) return [];
  const out: { id: string; name: L; fx: Fx27 }[] = [];
  const busy = new Set(st.jobs.map((j) => j.id));
  for (const fd of lv.buyFloors) { const id = floorId27(hq, fd.floor); if (st.floors[id]) out.push({ id, name: fd.name, fx: { caps: { staff: fd.staff } } }); }
  const floorOpen = (f: number) => !lv.buyFloors.some((x) => x.floor === f) || !!st.floors[floorId27(hq, f)];
  for (const r of lv.rooms) if (st.own[r.id] && !busy.has(r.id) && floorOpen(r.floor)) out.push({ id: r.id, name: ROOM_DEFS27[r.id].name, fx: ROOM_DEFS27[r.id].fx });
  return out;
}

/** Soma de capacidade das salas e andares abertos (entra em hqCaps). */
export function capsAdd27(s: GameState): HqCaps {
  const c: HqCaps = { careers: 0, staff: 0, sessions: 0, equipment: 0 };
  for (const u of openUnits27(s)) for (const [k, v] of Object.entries(u.fx.caps ?? {})) c[k as keyof HqCaps] += v ?? 0;
  return c;
}
/** Manutenção mensal total das salas e andares abertos. */
export function upkeep27(s: GameState): number {
  return openUnits27(s).reduce((t, u) => t + roomUpkeep27(s, u.id), 0);
}

// ---------------------------------------------------------------- ações

/** Por que não dá para comprar agora (null = pode). */
export function buyBlocker27(s: GameState, id: string): L | null {
  const u = hqRooms27(s).find((x) => x.id === id);
  if (!u) return l('Esta sala não existe nesta sede.', 'This room does not exist in this HQ.');
  if (u.status === 'open') return l('Já está aberta.', 'Already open.');
  if (u.status === 'building') return l('Obra em andamento.', 'Under construction.');
  if (u.blocked) return u.blocked;
  if (freeCash20(s) < u.cost) return cashWhy20(s, u.cost, l('Caixa insuficiente.', 'Not enough cash.'));
  return null;
}

/** Compra e começa a obra (paga agora; abre quando a obra terminar). */
export function buyRoom27(s: GameState, id: string): L | null {
  const err = buyBlocker27(s, id);
  if (err) return err;
  const u = hqRooms27(s).find((x) => x.id === id)!;
  const st = hqr27(s);
  post(s, `hqr27:${id}`, -u.cost, 'hq', `Obra na sede: ${u.name.pt}`);
  addAsset(s, { kind: 'building', name: fmtL(l('Sede: {n}', 'HQ: {n}'), { n: u.name }), cost: u.cost, lifeMonths: u.kind === 'floor' ? 360 : 180 });
  st.jobs.push({ id, start: mIdx(s), done: mIdx(s) + u.months });
  notify(s, fmtL(l('Obra começou: {n} (pronta em {m} {u}).', 'Construction started: {n} (ready in {m} {u}).'), { n: u.name, m: u.months, u: u.months === 1 ? l('mês', 'month') : l('meses', 'months') }), 'info');
  return null;
}

/** Abre na hora, sem custo (testes, cenários e ferramentas de depuração). */
export function grantRoom27(s: GameState, id: string): void {
  const st = hqr27(s);
  st.jobs = st.jobs.filter((j) => j.id !== id);
  if (id.startsWith('floor:')) st.floors[id] = true;
  else if ((BUY27 as string[]).includes(id)) st.own[id as Buy27] = true;
  bumpPerks();
}

/** Fim de mês: obras prontas abrem; salas e andares abertos pagam manutenção. */
export function month27(s: GameState): void {
  const st = hqr27(s);
  const now = mIdx(s);
  const done = st.jobs.filter((j) => j.done <= now);
  if (done.length) {
    st.jobs = st.jobs.filter((j) => j.done > now);
    for (const j of done) {
      if (j.id.startsWith('floor:')) st.floors[j.id] = true;
      else st.own[j.id as Buy27] = true;
      const nm = j.id.startsWith('floor:') ? (level27(Number(j.id.split(':')[1])).buyFloors.find((f) => f.floor === Number(j.id.split(':')[2]))?.name ?? l('Andar', 'Floor')) : ROOM_DEFS27[j.id as Buy27]?.name ?? l('Sala', 'Room');
      remember(s, 'hq', fmtL(l('Obra pronta na sede: {n}.', 'HQ construction finished: {n}.'), { n: nm }));
      notify(s, fmtL(l('Obra pronta: {n} já está em uso.', 'Construction done: {n} is now in use.'), { n: nm }), 'good');
    }
    bumpPerks();
  }
  const up = upkeep27(s);
  if (up > 0) post(s, `hqr27up:${s.year}:${s.month}`, -up, 'hq', 'Manutenção das salas e andares da sede');
}

registerSimHook('month', 'hqr27', (s) => month27(s));

registerPerkSource('hqr27', (s) => {
  const out: PerkEntry[] = [];
  for (const u of openUnits27(s)) if (u.fx.perks) out.push({ label: fmtL(l('Sede: {n}', 'HQ: {n}'), { n: u.name }), values: u.fx.perks });
  return out;
});

HQ_CAPS27.f = (s, c) => {
  const a = capsAdd27(s);
  c.careers += a.careers; c.staff += a.staff; c.sessions += a.sessions; c.equipment += a.equipment;
};

/** r27: andares da sede vistos de fora (mapa da cidade): total do nível menos os andares ainda não comprados; obra = andaime. */
export function hqFloors27(s: GameState): { open: number; building: boolean } {
  const lv = level27(hqOf(s));
  const us = hqRooms27(s).filter((u) => u.kind === 'floor');
  return { open: Math.max(1, lv.floors - us.filter((u) => u.status !== 'open').length), building: us.some((u) => u.status === 'building') };
}
