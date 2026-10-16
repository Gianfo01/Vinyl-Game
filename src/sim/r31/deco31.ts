// R31 · DECO-M — MOTOR DA DECORAÇÃO: lugares (slots) por cômodo da casa, sala da sede e estabelecimento; colocar, tirar,
// trocar e mover a MESMA instância entre lugares; níveis dos itens obrigatórios; efeitos pequenos com teto.
//
//  • Item decorativo = objeto único do registro (r31/object): modelo `deco:<id>` (catálogo src/data/deco31.ts) e
//    `upg:<id>` (nível de um item obrigatório). Dono/história/oferta/roubo como qualquer objeto; este arquivo só guarda
//    ONDE a peça está posta (`at`: lugar → peça) e o nível instalado de cada obrigatório (`req`: lugar → peça).
//  • Lugares: `decoPlaces31(s)` lê a casa (todas as moradias), a sede (salas abertas pelo degrau e pela planta) e os
//    estabelecimentos (`registerDecoVenues31`, a DECO-L acrescenta os seus). PURO: abrir a cena não muda nada.
//  • Obrigatórios (`REQ31`): nunca saem; `setReq31` só troca o nível/acabamento (o nível anterior volta para a gaveta).
//  • Efeitos (`decoFx31`): soma por cômodo com teto `DECO_CAP31`, soma geral com teto `DECO_TOTAL_CAP31`. Sem peças
//    postas = 0 em tudo (os robôs não compram: goldens iguais). Lido pelos ganchos já existentes (ver `DECO_HOOK31`).
//  • Peça que deixou de ser sua (vendida, roubada, presenteada) sai do lugar na leitura (`decoSane31`, no gancho do mês).
// Estado em `x4.deco31`. Interruptor `deco31` (ligado): desligado, nada aparece e os efeitos são 0.

import { l, type L } from '../../data/world';
import {
  DECO31, DECO_CAP31, DECO_TOTAL_CAP31, REQ31, UPG31, decoDef31, inLine31, reqDef31, upgDef31, vintagePrice31,
  type DecoDef31, type DecoFxK31, type DecoPlace31, type DecoSlot31, type UpgDef31,
} from '../../data/deco31';
import { registerExt4, registerSimHook } from '../ext4';
import { HOUSES, ownerOf } from '../sys/people/owner';
import { hqRooms27 } from '../sys/hqrooms27';
import { ventures } from '../sys/ventures9';
import type { GameState } from '../types';
import { fmtL, money } from '../util';
import { homes31 } from './city31';
import { registerEditable, registerRunnable } from './editor';
import { createObj, obj31, registerModelResolver, removeObj, type Holder, type ObjInst } from './object';
import { CO31, ME31 } from './relic31';
import { registerSwitch, sw } from './switches';
import { purse } from './purse31';
import { cashWhy20, freeCash20 } from '../oblig20';
import { withTxn } from './txn';
import { playerActs, post } from '../util';
import { registerMod } from '../ext4';
import { registerPerkSource, type PerkValues } from '../perks';
import { HQ_CAPS27 } from '../branches';
import { builtVenue } from '../sys/venuestore27';
import { nightDeco12 } from '../sys/venue12';
import { festDeco19 } from '../sys/fest12';
import { opine } from '../opinion';

registerSwitch({
  id: 'deco31', def: true, scope: 'game',
  desc: l('Decoração: arrumar casa, sede e estabelecimentos (itens com efeito pequeno e upgrades dos obrigatórios).',
    'Decoration: arrange home, HQ and venues (items with small effects and upgrades of the fixed items).'),
});
export const decoOn31 = (s: GameState): boolean => sw<boolean>(s, 'deco31');

// ---------------------------------------------------------------- modelos no registro de objetos

registerModelResolver('deco:', (id) => (decoDef31(id.slice(5)) ? { id, kind: 'deco' } : undefined));
registerModelResolver('upg:', (id) => (upgDef31(id.slice(4)) ? { id, kind: 'upgrade' } : undefined));
export const decoOfObj31 = (o: ObjInst | undefined): DecoDef31 | undefined => (o?.modelId.startsWith('deco:') ? decoDef31(o.modelId.slice(5)) : undefined);
export const upgOfObj31 = (o: ObjInst | undefined): UpgDef31 | undefined => (o?.modelId.startsWith('upg:') ? upgDef31(o.modelId.slice(4)) : undefined);

// ---------------------------------------------------------------- estado

export interface Deco31St {
  /** lugar (`place|room|spot`) → id da peça posta */
  at: Record<string, string>;
  /** obrigatório (`place|room|req`) → id da peça do nível instalado (sem entrada = nível 0) */
  req: Record<string, string>;
}
declare module '../ext4' { interface Ext4 { deco31: Deco31St } }
const fresh = (): Deco31St => ({ at: {}, req: {} });
registerExt4('deco31', fresh);
export function deco31(s: GameState): Deco31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.deco31 ??= fresh()) as Deco31St;
}
/** Leitura sem criar o estado (explorar não muda o mundo). */
const peek = (s: GameState): Deco31St => ((s as unknown as { x4?: { deco31?: Deco31St } }).x4?.deco31 ?? fresh());

// ---------------------------------------------------------------- lugares

/** Um ponto de encaixe num cômodo: tipo de lugar e posição relativa na cena (0..1, para a interface ancorar). */
export interface DecoSpot31 { id: string; slot: DecoSlot31; x: number; y: number }
export interface DecoRoom31 { id: string; name: L; spots: DecoSpot31[]; req: string[] }
export interface DecoPlaceDef31 { key: string; kind: DecoPlace31; name: L; rooms: DecoRoom31[] }

/** Cômodo-modelo: superfícies (papel, piso, janela, teto) + `n` paredes, `f` chão, `d` mesa. */
function room(id: string, name: L, n: number, f: number, d: number, extra: { window?: boolean; sign?: boolean; req?: string[] } = {}): DecoRoom31 {
  const sp: DecoSpot31[] = [
    { id: 'paper', slot: 'paper', x: 0.5, y: 0.3 }, { id: 'ground', slot: 'ground', x: 0.5, y: 0.95 }, { id: 'ceil', slot: 'ceiling', x: 0.5, y: 0.04 },
  ];
  if (extra.window !== false) sp.push({ id: 'win', slot: 'window', x: 0.5, y: 0.32 });
  if (extra.sign) sp.push({ id: 'sign', slot: 'sign', x: 0.5, y: 0.02 });
  for (let i = 0; i < n; i++) sp.push({ id: `w${i + 1}`, slot: 'wall', x: (i + 1) / (n + 1), y: 0.36 });
  for (let i = 0; i < f; i++) sp.push({ id: `f${i + 1}`, slot: 'floor', x: (i + 0.5) / f, y: 0.86 });
  for (let i = 0; i < d; i++) sp.push({ id: `d${i + 1}`, slot: 'desk', x: 0.35 + 0.3 * (i / Math.max(1, d - 1 || 1)), y: 0.62 });
  return { id, name, spots: sp, req: extra.req ?? [] };
}

const HOME_L: Record<string, L> = {
  sala: l('Sala', 'Living room'), quarto: l('Quarto', 'Bedroom'), escritorio: l('Escritório', 'Study'), criancas: l('Quarto das crianças', "Kids' room"), garagem: l('Garagem', 'Garage'),
};
/** Cômodos por tamanho de moradia (a mansão tem mais lugares por cômodo). */
function homeRooms(house: number): DecoRoom31[] {
  const id = house < 0 ? 'tenement' : HOUSES[house]?.id ?? '';
  const big = ['artdeco', 'palacete', 'modernist', 'ranch', 'smart'].includes(id);
  const mid = big || ['townhouse', 'chalet', 'suburb'].includes(id);
  const apt = mid || ['apartment', 'loft', 'penthouse'].includes(id);
  const k = big ? 2 : 1;
  const out = [room('sala', HOME_L.sala, 2 * k, 2 * k, 1), room('quarto', HOME_L.quarto, 1 * k, 1 * k, 1, { req: ['cama'] })];
  if (apt) out.push(room('escritorio', HOME_L.escritorio, 1 * k, 1, 2));
  if (mid) out.push(room('criancas', HOME_L.criancas, 1, 1, 0), room('garagem', HOME_L.garagem, 1, 1, 0, { window: false }));
  return out;
}

const SEDE_L: Record<string, L> = {
  office: l('Escritório', 'Office'), anr: l('A&R', 'A&R'), lobby: l('Recepção', 'Reception'), studio: l('Estúdio', 'Studio'), stage: l('Palco', 'Stage'),
  lounge: l('Lounge', 'Lounge'), meeting: l('Reunião', 'Meeting room'), rehearsal: l('Ensaio', 'Rehearsal'), archive: l('Arquivo', 'Archive'),
  legal: l('Financeiro', 'Finance'), marketing: l('Pesquisa', 'Research'), press: l('Imprensa', 'Press'), studioB: l('Estúdio B', 'Studio B'),
  garden: l('Jardim', 'Garden'), neural: l('Sala imersiva', 'Immersive room'), loungeVip: l('Lounge VIP', 'VIP lounge'),
};
const SEDE_REQ: Record<string, string[]> = {
  office: ['telefone', 'arquivoaco', 'cofre', 'livrocaixa', 'fichario', 'mesames', 'radiotv'],
  studio: ['mesasom'], studioB: ['mesasom'], rehearsal: ['piano'], stage: ['palco'], meeting: ['mesareuniao'],
};
/** Salas da sede pelo degrau (garagem → prédio) e pelas salas compradas abertas. */
function sedeRooms(s: GameState): DecoRoom31[] {
  const hq = Math.max(0, s.player.hq ?? 0);
  const ids = ['office', 'studio'];
  if (hq >= 1) ids.push('lobby', 'anr');
  if (hq >= 2) ids.push('lounge', 'stage');
  for (const u of hqRooms27(s)) if (u.kind === 'room' && u.status === 'open' && SEDE_L[u.id] && !ids.includes(u.id)) ids.push(u.id);
  const k = hq >= 3 ? 2 : 1;
  return ids.map((id) => room(id, SEDE_L[id], 1 + k, k + (hq >= 2 ? 1 : 0), id === 'office' || id === 'anr' ? 2 : 1, { sign: id === 'lobby' || (id === 'office' && hq === 0), req: SEDE_REQ[id] }));
}

// estabelecimentos: provedores (DECO-L acrescenta bar/loja do selo, casa de shows, imóveis do LOTE…)
export type VenueProvider31 = (s: GameState) => DecoPlaceDef31[];
const VENUES: [string, VenueProvider31][] = [];
export function registerDecoVenues31(id: string, fn: VenueProvider31): void {
  const i = VENUES.findIndex(([x]) => x === id);
  if (i >= 0) VENUES[i] = [id, fn]; else VENUES.push([id, fn]);
}
const VK_L: Record<string, L> = { studio: l('Estúdio', 'Studio'), festival: l('Festival', 'Festival') };
registerDecoVenues31('ventures9', (s) => ventures(s).list.filter((v) => v.kind === 'studio' || v.kind === 'festival').map((v) => ({
  key: `venue:${v.id}`, kind: 'venue' as const, name: l(`${VK_L[v.kind].pt} · ${v.name}`, `${VK_L[v.kind].en} · ${v.name}`),
  rooms: v.kind === 'studio'
    ? [room('studio', SEDE_L.studio, 2, 2, 1, { sign: true, req: ['mesasom'] }), room('lounge', SEDE_L.lounge, 2, 2, 1)]
    : [room('stage', SEDE_L.stage, 2, 3, 0, { sign: true, window: false, req: ['palco'] }), room('bar', l('Bar', 'Bar'), 2, 3, 1, { window: false })],
})));

/** Todos os lugares decoráveis do jogador (PURO). */
export function decoPlaces31(s: GameState): DecoPlaceDef31[] {
  if (!decoOn31(s)) return [];
  const o = ownerOf(s);
  const out: DecoPlaceDef31[] = [{ key: 'home', kind: 'home', name: l('Casa', 'Home'), rooms: homeRooms(o.house) }];
  for (const h of homes31(s)) out.push({ key: `abroad:${h.city}`, kind: 'home', name: HOUSES[h.house]?.name ?? l('Casa', 'Home'), rooms: homeRooms(h.house) });
  out.push({ key: 'sede', kind: 'sede', name: l('Sede', 'HQ'), rooms: sedeRooms(s) });
  for (const [, fn] of VENUES) out.push(...fn(s));
  return out;
}
export const decoPlace31 = (s: GameState, key: string): DecoPlaceDef31 | undefined => decoPlaces31(s).find((p) => p.key === key);

/** Chave de um lugar: `place|room|spot`. */
export const spotKey31 = (place: string, room: string, spot: string): string => `${place}|${room}|${spot}`;
export function parseSpot31(k: string): { place: string; room: string; spot: string } { const [place, room, spot] = k.split('|'); return { place, room, spot }; }
function findSpot(s: GameState, key: string): { p: DecoPlaceDef31; r: DecoRoom31; sp: DecoSpot31 } | undefined {
  const { place, room: rid, spot } = parseSpot31(key);
  const p = decoPlace31(s, place);
  const r = p?.rooms.find((x) => x.id === rid);
  const sp = r?.spots.find((x) => x.id === spot);
  return p && r && sp ? { p, r, sp } : undefined;
}

// ---------------------------------------------------------------- posse

/** Peças decorativas e de upgrade do jogador (suas ou da empresa) que estão nas mãos dele. */
export const mine31 = (o: ObjInst): boolean => (o.owner === ME31 || o.owner === CO31) && o.holder === o.owner && !o.offer;
export function decoOwned31(s: GameState): ObjInst[] {
  return Object.values(peekObjs(s)).filter((o) => (o.modelId.startsWith('deco:') || o.modelId.startsWith('upg:')) && mine31(o));
}
const peekObjs = (s: GameState): Record<string, ObjInst> => (s as unknown as { x4?: { obj31?: { objs: Record<string, ObjInst> } } }).x4?.obj31?.objs ?? {};
/** Onde a peça está posta (chave do lugar) ou undefined (na gaveta). */
export function whereIs31(s: GameState, objId: string): string | undefined {
  const st = peek(s);
  for (const [k, v] of Object.entries(st.at)) if (v === objId) return k;
  for (const [k, v] of Object.entries(st.req)) if (v === objId) return k;
  return undefined;
}
/** A gaveta: o que você tem e não está posto (filtrado pelo tipo de lugar, se dado). */
export function drawer31(s: GameState, slot?: DecoSlot31, kind?: DecoPlace31): ObjInst[] {
  const used = new Set([...Object.values(peek(s).at), ...Object.values(peek(s).req)]);
  return decoOwned31(s).filter((o) => {
    if (used.has(o.id)) return false;
    const d = decoOfObj31(o);
    if (!d) return !slot; // upgrades aparecem na gaveta geral
    return (!slot || d.slots.includes(slot)) && (!kind || d.places.includes(kind));
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
}

// ---------------------------------------------------------------- colocar, tirar, trocar, mover

export type DecoWhy31 = 'off' | 'no_spot' | 'no_obj' | 'not_mine' | 'wrong_slot' | 'wrong_place' | 'req' | 'wrong_req';
export const DECO_WHY31: Record<DecoWhy31, L> = {
  off: l('A decoração está desligada.', 'Decoration is switched off.'),
  no_spot: l('Esse lugar não existe aqui.', 'That spot does not exist here.'),
  no_obj: l('Peça não encontrada.', 'Item not found.'),
  not_mine: l('A peça não está com você.', 'You do not have this item.'),
  wrong_slot: l('Essa peça não encaixa nesse lugar.', 'This item does not fit that spot.'),
  wrong_place: l('Essa peça não combina com este lugar.', 'This item does not suit this place.'),
  req: l('Item obrigatório: só troca de modelo ou sobe de nível.', 'Fixed item: it can only change model or level up.'),
  wrong_req: l('Esse modelo é de outro item.', 'That model belongs to another item.'),
};
export type DecoRes31 = { ok: true; moved?: string; swapped?: string } | { ok: false; why: DecoWhy31 };

/** Põe a peça no lugar. Se ela já estava noutro lugar, MOVE (mesma instância). Se o lugar estava ocupado, a peça que
 *  estava lá vai para o lugar de onde a nova saiu (troca) quando cabe; senão, para a gaveta. */
export function placeDeco31(s: GameState, objId: string, key: string): DecoRes31 {
  if (!decoOn31(s)) return { ok: false, why: 'off' };
  const f = findSpot(s, key);
  if (!f) return { ok: false, why: 'no_spot' };
  const o = obj31(s).objs[objId];
  const d = decoOfObj31(o);
  if (!o || !d) return { ok: false, why: 'no_obj' };
  if (!mine31(o)) return { ok: false, why: 'not_mine' };
  if (!d.slots.includes(f.sp.slot)) return { ok: false, why: 'wrong_slot' };
  if (!d.places.includes(f.p.kind)) return { ok: false, why: 'wrong_place' };
  const st = deco31(s);
  const from = Object.entries(st.at).find(([, v]) => v === objId)?.[0];
  if (from === key) return { ok: true };
  const prev = st.at[key];
  if (from) delete st.at[from];
  st.at[key] = objId;
  let swapped: string | undefined;
  if (prev && from) {
    const pd = decoOfObj31(obj31(s).objs[prev]);
    const ff = findSpot(s, from);
    if (pd && ff && pd.slots.includes(ff.sp.slot) && pd.places.includes(ff.p.kind)) { st.at[from] = prev; swapped = prev; }
  }
  return { ok: true, moved: from, swapped };
}

/** Tira a peça do lugar (volta para a gaveta; continua sua). */
export function takeDeco31(s: GameState, key: string): DecoRes31 {
  if (!decoOn31(s)) return { ok: false, why: 'off' };
  const st = deco31(s);
  if (st.req[key]) return { ok: false, why: 'req' };
  if (!st.at[key]) return { ok: false, why: 'no_spot' };
  delete st.at[key];
  return { ok: true };
}

/** Chave do obrigatório: `place|room|req`. */
export const reqKey31 = (place: string, room: string, req: string): string => `${place}|${room}|${req}`;
/** Nível instalado do obrigatório (0 = o que veio). */
export function reqLevel31(s: GameState, key: string): { lv: number; upg?: UpgDef31; objId?: string } {
  const id = peek(s).req[key];
  const u = id ? upgOfObj31(peekObjs(s)[id]) : undefined;
  return u ? { lv: u.lv, upg: u, objId: id } : { lv: 0 };
}
/** Troca o modelo/acabamento do obrigatório pela peça de upgrade `objId`; o nível anterior volta para a gaveta.
 *  `objId` vazio volta ao modelo de fábrica (o item nunca some). */
export function setReq31(s: GameState, key: string, objId: string): DecoRes31 {
  if (!decoOn31(s)) return { ok: false, why: 'off' };
  const { place, room: rid, spot: req } = parseSpot31(key);
  const r = decoPlace31(s, place)?.rooms.find((x) => x.id === rid);
  if (!r || !r.req.includes(req)) return { ok: false, why: 'no_spot' };
  const st = deco31(s);
  if (!objId) { delete st.req[key]; return { ok: true }; }
  const o = obj31(s).objs[objId];
  const u = upgOfObj31(o);
  if (!o || !u) return { ok: false, why: 'no_obj' };
  if (!mine31(o)) return { ok: false, why: 'not_mine' };
  if (u.req !== req) return { ok: false, why: 'wrong_req' };
  const from = Object.entries(st.req).find(([, v]) => v === objId)?.[0];
  if (from && from !== key) delete st.req[from];
  const prev = st.req[key];
  st.req[key] = objId;
  return { ok: true, moved: from, swapped: prev };
}

/** Limpa lugares cuja peça deixou de ser sua (vendida, roubada, presenteada, sumiu). Chamado no mês e ao carregar. */
export function decoSane31(s: GameState): number {
  const st = peek(s);
  const objs = peekObjs(s);
  let n = 0;
  for (const m of [st.at, st.req]) for (const [k, id] of Object.entries(m)) if (!objs[id] || !mine31(objs[id])) { delete m[k]; n++; }
  return n;
}
registerSimHook('month', 'deco31', (s) => { if (decoOn31(s)) decoSane31(s); });

// ---------------------------------------------------------------- comprar (catálogo direto; a DECO-L tem as lojas)

/** Preço da peça neste ano (novo, ou vintage fora de linha), em dinheiro da época. */
export const decoPrice31 = (s: GameState, d: { price: number; from: number; to?: number }): number => money(s, vintagePrice31(d, s.year));
/** Compra direta do catálogo (para você ou para a empresa). A DECO-L troca por lojas/vitrine; isto é o caminho mínimo. */
export function buyDeco31(s: GameState, modelId: string, how: 'me' | 'co'): { ok: true; obj: ObjInst } | { ok: false; why: L } {
  if (!decoOn31(s)) return { ok: false, why: DECO_WHY31.off };
  const d = modelId.startsWith('deco:') ? decoDef31(modelId.slice(5)) : modelId.startsWith('upg:') ? upgDef31(modelId.slice(4)) : undefined;
  if (!d) return { ok: false, why: DECO_WHY31.no_obj };
  if (s.year < d.from) return { ok: false, why: fmtL(l('Ainda não existe (a partir de {y}).', 'Not available yet (from {y}).'), { y: d.from }) };
  const price = decoPrice31(s, d);
  if (how === 'me') {
    const o = ownerOf(s);
    if (o.wealth < price) return { ok: false, why: l('Patrimônio pessoal insuficiente.', 'Not enough personal wealth.') };
    purse(s, -price, 'goods', 'deco31:buy', { who: o, ben: 'me' });
  } else {
    if (freeCash20(s) < price) return { ok: false, why: cashWhy20(s, price, l('Caixa da empresa insuficiente.', 'Not enough company cash.')) };
    withTxn({ payer: 'label', owner: 'label', beneficiary: 'label' }, () => post(s, `deco31:${modelId}`, -price, 'acquisitions', `Decoração: ${d.name.pt}`));
  }
  const r = createObj(s, { modelId, origin: inLine31(d, s.year) ? 'shop' : 'antique', owner: how === 'me' ? ME31 : CO31 });
  if (!r.ok) return { ok: false, why: DECO_WHY31.no_obj };
  return { ok: true, obj: r.v };
}

// ---------------------------------------------------------------- efeitos

/** Efeito de cada lugar e geral, com teto (PURO). `scope`: 'home' (todas as casas), 'sede', a chave de um estabelecimento,
 *  ou 'venue' (todos os estabelecimentos). Sem peças = 0. */
export function decoFx31(s: GameState, k: DecoFxK31, scope: string): number {
  if (!decoOn31(s)) return 0;
  const st = peek(s);
  if (!Object.keys(st.at).length && !Object.keys(st.req).length) return 0;
  const objs = peekObjs(s);
  const per = new Map<string, number>();
  const add = (key: string, v: number) => {
    const { place, room: rid } = parseSpot31(key);
    const ok = scope === place || (scope === 'home' && (place === 'home' || place.startsWith('abroad:'))) || (scope === 'venue' && place.startsWith('venue:'));
    if (!ok) return;
    const rk = `${place}|${rid}`;
    per.set(rk, (per.get(rk) ?? 0) + v);
  };
  for (const [key, id] of Object.entries(st.at)) { const o = objs[id]; const f = o && mine31(o) ? decoOfObj31(o)?.fx : undefined; if (f?.k === k) add(key, f.v); }
  for (const [key, id] of Object.entries(st.req)) { const o = objs[id]; const f = o && mine31(o) ? upgOfObj31(o)?.fx : undefined; if (f?.k === k) add(key, f.v); }
  let t = 0;
  for (const v of per.values()) t += Math.min(DECO_CAP31[k], v);
  return Math.round(Math.min(DECO_TOTAL_CAP31[k], t) * 1000) / 1000;
}

/** Conjunto completo de um estilo num cômodo (conquista): estilos com 4+ peças do mesmo estilo num cômodo. */
export function decoSets31(s: GameState): { room: string; style: string }[] {
  const per = new Map<string, Map<string, number>>();
  const objs = peekObjs(s);
  for (const [key, id] of Object.entries(peek(s).at)) {
    const d = decoOfObj31(objs[id]);
    if (!d || d.style === 'any') continue;
    const { place, room: rid } = parseSpot31(key);
    const m = per.get(`${place}|${rid}`) ?? new Map<string, number>();
    m.set(d.style, (m.get(d.style) ?? 0) + 1);
    per.set(`${place}|${rid}`, m);
  }
  const out: { room: string; style: string }[] = [];
  for (const [r, m] of per) for (const [st, n] of m) if (n >= 4) out.push({ room: r, style: st });
  return out;
}

// ---------------------------------------------------------------- editor

const modelOpts = () => [...DECO31.map((d) => ({ value: `deco:${d.id}`, label: d.name })), ...UPG31.map((u) => ({ value: `upg:${u.id}`, label: fmtL(l('{r} nível {n}: {m}', '{r} level {n}: {m}'), { r: reqDef31(u.req)?.name.pt ?? u.req, n: u.lv, m: u.name.pt }) }))];
registerRunnable({
  id: 'deco31.give', area: 'items', label: l('Dar peça de decoração (para você)', 'Give a decoration item (to you)'),
  arg: { kind: 'select', label: l('Peça', 'Item'), options: () => modelOpts() },
  run: (s, _t, arg) => { const r = createObj(s, { modelId: String(arg), origin: 'gift', owner: ME31 }); return r.ok ? l('Peça entregue na gaveta.', 'Item delivered to the drawer.') : { ok: false, text: DECO_WHY31.no_obj }; },
});
registerRunnable({
  id: 'deco31.take', area: 'items', label: l('Tirar peça de decoração (some do jogo)', 'Remove a decoration item (gone from the game)'),
  arg: { kind: 'select', label: l('Peça', 'Item'), options: (s) => decoOwned31(s).map((o) => ({ value: o.id, label: (decoOfObj31(o) ?? upgOfObj31(o))?.name ?? l('Peça', 'Item') })) },
  run: (s, _t, arg) => { const id = String(arg); const r = removeObj(s, id); decoSane31(s); return r.ok ? l('Peça removida.', 'Item removed.') : { ok: false, text: DECO_WHY31.no_obj }; },
});
registerRunnable({
  id: 'deco31.place', area: 'items', label: l('Mudar peça de lugar (peça → lugar)', 'Move an item (item → spot)'),
  arg: { kind: 'text', label: l('peça>lugar (ex.: ob12>sede|office|w1)', 'item>spot (e.g. ob12>sede|office|w1)') },
  run: (s, _t, arg) => { const [id, key] = String(arg).split('>'); const r = placeDeco31(s, id ?? '', key ?? ''); return r.ok ? l('Peça posta.', 'Item placed.') : { ok: false, text: DECO_WHY31[r.why] }; },
});
registerEditable({
  id: 'deco31.placed', area: 'items', label: l('Peças postas (só leitura)', 'Placed items (read only)'), kind: 'text', raw: true,
  get: (s) => String(Object.keys(peek(s).at).length + Object.keys(peek(s).req).length),
  set: () => l('Use "Mudar peça de lugar".', 'Use "Move an item".'),
});

/** Para os ganchos: o que cada efeito alimenta (documentação viva para a medição em DECISOES). */
export const DECO_HOOK31: Record<DecoFxK31, L> = {
  rest: l('energia/descanso em casa', 'energy/rest at home'),
  prestige: l('prestígio da sede nas reuniões', 'HQ prestige in meetings'),
  crowd: l('público dos negócios', 'audience at your venues'),
  opinion: l('opinião de quem visita', 'opinion of visitors'),
  cap: l('capacidade das salas', 'room capacity'),
  rec: l('qualidade de gravação', 'recording quality'),
};
export const REQ_OF31 = REQ31;
export type { Holder };

// ---------------------------------------------------------------- ganchos (só funções que já existem; 0 sem peças)

registerDecoVenues31('venue12', (s) => {
  const v = builtVenue(s);
  return v ? [{ key: 'venue:club', kind: 'venue' as const, name: l(`Casa de shows · ${v.name}`, `Venue · ${v.name}`),
    rooms: [room('stage', SEDE_L.stage, 2, 2, 0, { sign: true, window: false, req: ['palco'] }), room('bar', l('Bar', 'Bar'), 2, 3, 1, { window: false })] }] : [];
});
// descanso → menos estresse acumulado na semana (perk 'stress', fração negativa); prestígio → nota da oferta (perk 'offer')
registerPerkSource('deco31', (s) => {
  const rest = decoFx31(s, 'rest', 'home');
  const pre = decoFx31(s, 'prestige', 'sede');
  if (!rest && !pre) return [];
  const v: PerkValues = {};
  if (rest) v.stress = -rest;
  if (pre) v.offer = Math.round(pre * 50) / 100; // 0.06 de prestígio → +0.03 na nota da oferta (0.05 = "bom")
  return [{ label: l('Decoração', 'Decoration'), values: v }];
});
// gravação → qualidade das faixas gravadas (estúdio da sede ou o seu estúdio)
registerMod('songQ', 'deco31', (s, value) => {
  const r = Math.min(DECO_TOTAL_CAP31.rec, decoFx31(s, 'rec', 'sede') + decoFx31(s, 'rec', 'venue'));
  return r ? { value: value * (1 + r), label: l('Estúdio bem equipado', 'Well-equipped studio') } : null;
});
// capacidade → uma sessão a mais (≥2%) e uma vaga de equipe a mais (≥4%) na sede
const prevCaps = HQ_CAPS27.f;
HQ_CAPS27.f = (s, c) => {
  prevCaps?.(s, c);
  const k = decoFx31(s, 'cap', 'sede');
  if (k >= 0.02) c.sessions += 1;
  if (k >= 0.04) c.staff += 1;
};
// público → ocupação da casa de shows (pontos de ocupação) e procura do festival
nightDeco12.f = (s) => decoFx31(s, 'crowd', 'venue:club');
festDeco19.f = (s, why) => {
  const c = decoFx31(s, 'crowd', 'venue');
  if (!c) return 1;
  why.push(l('Decoração caprichada atrai um pouco mais de gente.', 'Careful decoration draws a few more people.'));
  return 1 + c;
};
// opinião → quem trabalha com você e passa pela sede gosta um pouco mais (via opinion.ts, uma vez por mês)
registerSimHook('month', 'deco31op', (s) => {
  const v = decoFx31(s, 'opinion', 'sede') + decoFx31(s, 'opinion', 'home');
  if (!v) return;
  const d = Math.round(v * 25 * 10) / 10; // 0.04 → +1 ponto no mês
  for (const id of playerActs(s)) for (const pid of (s.acts[id]?.members ?? []).slice(0, 1)) opine(s, `p:${pid}`, d, l('Gostou do ambiente da sede.', 'Liked the feel of the HQ.'));
});
