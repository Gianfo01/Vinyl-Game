// Sede editável (Kairosoft / Two Point / Software Inc.): trocar a função das salas, comprar itens
// com efeito medido e aproveitar combos de vizinhança entre salas.

import { clamp, type Rng } from '../../../core/rng';
import { l, type L } from '../../../data/world';
import { LAYOUTS, type Room } from '../../../ui/pixel/scene';
import { registerSimHook } from '../../ext4';
import type { GameState, Song } from '../../types';
import { money, playerActs, post } from '../../util';
import { researchDone } from './research';

export type RoomKindId = Room['kind'];

export const ROOM_ITEMS: { id: string; name: L; room: RoomKindId; cost: number; max: number; desc: L }[] = [
  { id: 'isolation', name: l('Isolamento acústico', 'Acoustic treatment'), room: 'booth', cost: 3000, max: 3, desc: l('+1,5 de produção por música gravada.', '+1.5 production per recorded song.') },
  { id: 'console', name: l('Mesa de som de primeira', 'Top-tier mixing desk'), room: 'control', cost: 9000, max: 2, desc: l('+2 de produção por música gravada.', '+2 production per recorded song.') },
  { id: 'idea_board', name: l('Quadro de ideias', 'Idea board'), room: 'writing', cost: 800, max: 3, desc: l('+1,5 de originalidade por música composta.', '+1.5 originality per composed song.') },
  { id: 'piano', name: l('Piano de cauda', 'Grand piano'), room: 'writing', cost: 6000, max: 1, desc: l('+2 de melodia por música composta.', '+2 melody per composed song.') },
  { id: 'sofa', name: l('Sofás confortáveis', 'Comfy sofas'), room: 'lounge', cost: 1200, max: 3, desc: l('−1 de estresse por mês para quem está na sede.', '−1 stress a month for people at HQ.') },
  { id: 'arcade', name: l('Fliperama', 'Arcade cabinet'), room: 'lounge', cost: 2500, max: 2, desc: l('+1 de moral por mês.', '+1 morale a month.') },
  { id: 'meeting_table', name: l('Mesa de reunião', 'Meeting table'), room: 'meeting', cost: 2000, max: 1, desc: l('+0,2 de reputação institucional por mês.', '+0.2 institutional reputation a month.') },
  { id: 'rehearsal_pa', name: l('PA de ensaio', 'Rehearsal PA'), room: 'rehearsal', cost: 4000, max: 2, desc: l('+1,5 de performance por música gravada.', '+1.5 performance per recorded song.') },
  { id: 'trophy_case', name: l('Vitrine de troféus', 'Trophy cabinet'), room: 'trophy', cost: 3000, max: 1, desc: l('+0,2 de reputação artística por mês.', '+0.2 artistic reputation a month.') },
  { id: 'plants', name: l('Plantas', 'Plants'), room: 'office', cost: 300, max: 4, desc: l('+0,5 de moral por mês.', '+0.5 morale a month.') },
];
const itemById = Object.fromEntries(ROOM_ITEMS.map((x) => [x.id, x]));

/** Planta efetiva da matriz, com as trocas de função feitas pelo jogador. */
export function effectiveRooms(s: GameState, level = s.player.hq): Room[] {
  const lv = Math.max(0, Math.min(LAYOUTS.length - 1, level));
  const kinds = s.x4?.industry?.roomKinds?.[String(lv)] ?? {};
  return LAYOUTS[lv].rooms.map((r) => (kinds[r.id] ? { ...r, kind: kinds[r.id] as RoomKindId } : r));
}

/** Troca a função de duas salas (custa uma pequena reforma). */
export function swapRooms(s: GameState, a: string, b: string): L | null {
  const lv = String(Math.max(0, Math.min(LAYOUTS.length - 1, s.player.hq)));
  if (lv === '0') return l('A garagem é um ambiente só; não dá para separar salas.', 'The garage is one open space; rooms cannot be split.');
  const rooms = effectiveRooms(s);
  const ra = rooms.find((x) => x.id === a);
  const rb = rooms.find((x) => x.id === b);
  if (!ra || !rb || a === b) return l('Escolha duas salas diferentes.', 'Pick two different rooms.');
  const cost = money(s, 2500);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `roomswap:${a}:${b}:${s.week}`, -cost, 'hq', 'Reforma de salas');
  const map = (s.x4.industry.roomKinds[lv] ??= {});
  map[a] = rb.kind;
  map[b] = ra.kind;
  return null;
}

export function buyItem(s: GameState, id: string): L | null {
  const it = itemById[id];
  if (!it) return l('Inválido.', 'Invalid.');
  if (!effectiveRooms(s).some((r) => r.kind === it.room)) return l('A sede não tem a sala certa para este item.', "The HQ doesn't have the right room for this item.");
  const have = s.x4.industry.items[id] ?? 0;
  if (have >= it.max) return l('Já tem o máximo deste item.', 'You already have the maximum of this item.');
  const cost = money(s, it.cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `item:${id}:${have}:${s.week}`, -cost, 'hq', `Item: ${it.name.pt}`);
  s.x4.industry.items[id] = have + 1;
  return null;
}

function touches(a: Room, b: Room): boolean {
  const ax2 = a.x + a.w;
  const ay2 = a.y + a.h;
  const bx2 = b.x + b.w;
  const by2 = b.y + b.h;
  const vert = (ax2 === b.x || bx2 === a.x) && a.y < by2 && b.y < ay2;
  const horiz = (ay2 === b.y || by2 === a.y) && a.x < bx2 && b.x < ax2;
  return vert || horiz;
}

export const COMBOS: { a: RoomKindId; b: RoomKindId; name: L; effect: L }[] = [
  { a: 'writing', b: 'lounge', name: l('Composição ao lado do descanso', 'Writing next to the lounge'), effect: l('+1 de inspiração por mês', '+1 inspiration a month') },
  { a: 'control', b: 'booth', name: l('Técnica ao lado da cabine', 'Control room next to the booth'), effect: l('+1 de produção por música gravada', '+1 production per recorded song') },
  { a: 'rehearsal', b: 'booth', name: l('Ensaio ao lado da gravação', 'Rehearsal next to the live room'), effect: l('+1 de performance por música gravada', '+1 performance per recorded song') },
  { a: 'office', b: 'meeting', name: l('Escritório ao lado da reunião', 'Office next to meetings'), effect: l('+0,1 de reputação comercial por mês', '+0.1 commercial reputation a month') },
  { a: 'trophy', b: 'hall', name: l('Troféus no corredor', 'Trophies in the hallway'), effect: l('+0,5 de moral por mês', '+0.5 morale a month') },
];

export function activeCombos(s: GameState): typeof COMBOS {
  const rooms = effectiveRooms(s);
  return COMBOS.filter((c) => rooms.some((ra) => ra.kind === c.a && rooms.some((rb) => rb.kind === c.b && touches(ra, rb))));
}

function itemsMult(s: GameState): number {
  return researchDone(s, 'acoustic_lab') ? 1.5 : 1;
}

function has(s: GameState, id: string): number {
  return s.x4.industry.items[id] ?? 0;
}

function combo(s: GameState, a: RoomKindId, b: RoomKindId): boolean {
  return activeCombos(s).some((c) => c.a === a && c.b === b);
}

function onCompose(s: GameState, song: Song): void {
  if (s.acts[song.actId]?.owner !== 'player') return;
  const m = itemsMult(s);
  song.originality = clamp(song.originality + has(s, 'idea_board') * 1.5 * m, 0, 100);
  song.melody = clamp(song.melody + has(s, 'piano') * 2 * m, 0, 100);
}

function onRecord(s: GameState, song: Song): void {
  if (s.acts[song.actId]?.owner !== 'player') return;
  const m = itemsMult(s);
  song.production = clamp(song.production + (has(s, 'isolation') * 1.5 + has(s, 'console') * 2 + (combo(s, 'control', 'booth') ? 1 : 0)) * m, 0, 100);
  song.performance = clamp(song.performance + (has(s, 'rehearsal_pa') * 1.5 + (combo(s, 'rehearsal', 'booth') ? 1 : 0)) * m, 0, 100);
}

function onMonth(s: GameState, _r: Rng): void {
  const m = itemsMult(s);
  const stress = has(s, 'sofa') * m;
  const morale = (has(s, 'arcade') + has(s, 'plants') * 0.5 + (combo(s, 'trophy', 'hall') ? 0.5 : 0)) * m;
  const insp = combo(s, 'writing', 'lounge') ? 1 : 0;
  for (const id of playerActs(s)) for (const pid of s.acts[id].members) {
    const p = s.persons[pid];
    if (!p) continue;
    p.stress = clamp(p.stress - stress, 0, 100);
    p.morale = clamp(p.morale + morale, 0, 100);
    p.inspiration = clamp(p.inspiration + insp, 0, 100);
  }
  const rep = s.player.reputation;
  rep.institutional = clamp(rep.institutional + has(s, 'meeting_table') * 0.2, 0, 100);
  rep.artistic = clamp(rep.artistic + has(s, 'trophy_case') * 0.2, 0, 100);
  if (combo(s, 'office', 'meeting')) rep.commercial = clamp(rep.commercial + 0.1, 0, 100);
}

registerSimHook('compose', 'industry:rooms', (s, _r, a) => { if (a.song) onCompose(s, a.song); });
registerSimHook('record', 'industry:rooms', (s, _r, a) => { if (a.song) onRecord(s, a.song); });
registerSimHook('month', 'industry:rooms', (s, r) => onMonth(s, r));
