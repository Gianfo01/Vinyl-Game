// R31 · W0-CON — OBJETO. Modelo de item (`ItemModel`: "Stratocaster 1954", "violino") ≠ objeto individual (`ObjInst`:
// ESTA guitarra, com id, origem, dono, quem está com ela e histórico). Oferta (loja, leilão, museu, venda direta) aponta
// para a INSTÂNCIA. Invariantes:
//  1. uma instância está em no máximo uma oferta (não há a mesma peça em duas lojas, no museu e no leilão ao mesmo tempo);
//  2. compra acontece uma vez (`takeOffer` remove a oferta; a segunda tentativa falha);
//  3. roubo muda `holder` (quem está com ela), nunca `owner` (de quem é); só o dono oferta;
//  4. o histórico não se perde: passando do teto, as entradas antigas são compactadas num resumo (não descartadas).
// Estado em `x4.obj31`. Sistemas antigos (relics9, goods8, loja) migram para cá nas ondas seguintes (B.18, G).

import { registerExt4 } from '../ext4';
import type { GameState } from '../types';
import { sw } from './switches';

export interface ItemModel { id: string; kind: string; /** peça única no mundo (relíquia): no máximo uma instância */ unique?: boolean }

/** Lugar/agente: 'player', 'p:<pessoa>', 'act:<ato>', 'label:<selo>', 'shop:<loja>', 'museum:<id>', 'auction:<id>', 'world'… */
export type Holder = string;
export type ObjEvK = 'create' | 'transfer' | 'offer' | 'withdraw' | 'sold' | 'steal' | 'recover';
export interface ObjEv { w: number; k: ObjEvK; from?: Holder; to?: Holder; offer?: string; price?: number }
export interface ObjInst {
  id: string;
  modelId: string;
  /** de onde veio: 'catalog', 'shop', 'heir', 'gift', 'craft'… */
  origin: string;
  owner: Holder;
  holder: Holder;
  /** oferta em que está (no máximo uma) */
  offer?: string;
  history: ObjEv[];
  /** entradas antigas compactadas: contagem por tipo e primeira semana */
  old?: { n: Partial<Record<ObjEvK, number>>; since: number };
}
export interface ObjOffer { id: string; objId: string; venue: Holder; price: number; since: number }
export interface Obj31St { objs: Record<string, ObjInst>; offers: Record<string, ObjOffer>; n: number }

declare module '../ext4' { interface Ext4 { obj31: Obj31St } }
const fresh = (): Obj31St => ({ objs: {}, offers: {}, n: 0 });
registerExt4('obj31', fresh);
export function obj31(s: GameState): Obj31St {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  return (x.obj31 ??= fresh()) as Obj31St;
}

const MODELS = new Map<string, ItemModel>();
export function registerItemModel(m: ItemModel): void { MODELS.set(m.id, m); }
export const itemModel = (id: string): ItemModel | undefined => MODELS.get(id);

export const HIST_CAP31 = 40;
function log(s: GameState, o: ObjInst, e: Omit<ObjEv, 'w'>): void {
  o.history.push({ w: s.week, ...e });
  if (o.history.length <= HIST_CAP31) return;
  const cut = o.history.splice(0, o.history.length - HIST_CAP31 / 2);
  o.old ??= { n: {}, since: cut[0].w };
  for (const ev of cut) o.old.n[ev.k] = (o.old.n[ev.k] ?? 0) + 1;
}

/** Resultado de uma operação: `ok` ou o motivo da recusa (texto interno, a interface traduz pelo código). */
export type ObjRes<T = true> = { ok: true; v: T } | { ok: false; why: 'no_obj' | 'no_offer' | 'in_offer' | 'not_owner_holding' | 'unique_exists' | 'no_model' };
function fail<T>(s: GameState, why: Extract<ObjRes, { ok: false }>['why']): ObjRes<T> {
  if (sw<boolean>(s, 'contracts31.strict')) throw new Error(`obj31: ${why}`);
  return { ok: false, why };
}

export function createObj(s: GameState, a: { modelId: string; origin: string; owner: Holder; holder?: Holder }): ObjRes<ObjInst> {
  const m = MODELS.get(a.modelId);
  if (!m) return fail(s, 'no_model');
  const st = obj31(s);
  if (m.unique && Object.values(st.objs).some((o) => o.modelId === m.id)) return fail(s, 'unique_exists');
  const o: ObjInst = { id: `ob${++st.n}`, modelId: m.id, origin: a.origin, owner: a.owner, holder: a.holder ?? a.owner, history: [] };
  log(s, o, { k: 'create', to: o.owner });
  st.objs[o.id] = o;
  return { ok: true, v: o };
}

/** Põe a peça à venda/exposição. Só o dono, com a peça em mãos, e fora de qualquer outra oferta. */
export function offer(s: GameState, objId: string, venue: Holder, price: number): ObjRes<ObjOffer> {
  const st = obj31(s);
  const o = st.objs[objId];
  if (!o) return fail(s, 'no_obj');
  if (o.offer) return fail(s, 'in_offer');
  if (o.holder !== o.owner) return fail(s, 'not_owner_holding');
  const of: ObjOffer = { id: `of${++st.n}`, objId, venue, price: Math.round(price), since: s.week };
  st.offers[of.id] = of;
  o.offer = of.id;
  log(s, o, { k: 'offer', to: venue, offer: of.id, price: of.price });
  return { ok: true, v: of };
}

export function withdraw(s: GameState, offerId: string): ObjRes {
  const st = obj31(s);
  const of = st.offers[offerId];
  if (!of) return fail(s, 'no_offer');
  delete st.offers[offerId];
  const o = st.objs[of.objId];
  if (o && o.offer === offerId) { delete o.offer; log(s, o, { k: 'withdraw', from: of.venue, offer: offerId }); }
  return { ok: true, v: true };
}

/** Passa a propriedade (venda direta, presente, herança): dono e quem está com ela mudam; sai de qualquer oferta. */
export function transfer(s: GameState, objId: string, to: Holder): ObjRes {
  const o = obj31(s).objs[objId];
  if (!o) return fail(s, 'no_obj');
  if (o.offer) withdraw(s, o.offer);
  const from = o.owner;
  o.owner = to; o.holder = to;
  log(s, o, { k: 'transfer', from, to });
  return { ok: true, v: true };
}

/** Compra pela oferta: acontece uma vez (a oferta deixa de existir). O dinheiro é de quem chama (`post`). */
export function takeOffer(s: GameState, offerId: string, buyer: Holder): ObjRes<ObjOffer> {
  const st = obj31(s);
  const of = st.offers[offerId];
  if (!of) return fail(s, 'no_offer');
  const o = st.objs[of.objId];
  if (!o) return fail(s, 'no_obj');
  delete st.offers[offerId];
  delete o.offer;
  const from = o.owner;
  o.owner = buyer; o.holder = buyer;
  log(s, o, { k: 'sold', from, to: buyer, offer: offerId, price: of.price });
  return { ok: true, v: of };
}

/** Roubo: muda quem está com a peça, não o dono; sai da oferta. */
export function steal(s: GameState, objId: string, thief: Holder): ObjRes {
  const o = obj31(s).objs[objId];
  if (!o) return fail(s, 'no_obj');
  if (o.offer) withdraw(s, o.offer);
  const from = o.holder;
  o.holder = thief;
  log(s, o, { k: 'steal', from, to: thief });
  return { ok: true, v: true };
}

/** Recuperação: a peça volta para as mãos do dono. */
export function recover(s: GameState, objId: string): ObjRes {
  const o = obj31(s).objs[objId];
  if (!o) return fail(s, 'no_obj');
  const from = o.holder;
  o.holder = o.owner;
  log(s, o, { k: 'recover', from, to: o.owner });
  return { ok: true, v: true };
}

export const objsHeldBy = (s: GameState, h: Holder): ObjInst[] => Object.values(obj31(s).objs).filter((o) => o.holder === h);
export const objsOwnedBy = (s: GameState, h: Holder): ObjInst[] => Object.values(obj31(s).objs).filter((o) => o.owner === h);
export const offersAt = (s: GameState, venue: Holder): ObjOffer[] => Object.values(obj31(s).offers).filter((x) => x.venue === venue);

/** Varredura das invariantes: lista de problemas (vazia = tudo certo). */
export function objInvariants(s: GameState): string[] {
  const st = obj31(s);
  const bad: string[] = [];
  const perObj = new Map<string, number>();
  const perModel = new Map<string, number>();
  for (const of of Object.values(st.offers)) {
    const o = st.objs[of.objId];
    if (!o) { bad.push(`oferta ${of.id} aponta para peça inexistente ${of.objId}`); continue; }
    if (o.offer !== of.id) bad.push(`oferta ${of.id} não bate com a peça ${o.id} (${o.offer ?? 'sem oferta'})`);
    if (o.holder !== o.owner) bad.push(`oferta ${of.id}: peça ${o.id} fora das mãos do dono`);
    perObj.set(o.id, (perObj.get(o.id) ?? 0) + 1);
  }
  for (const [id, n] of perObj) if (n > 1) bad.push(`peça ${id} em ${n} ofertas`);
  for (const o of Object.values(st.objs)) {
    if (o.offer && !st.offers[o.offer]) bad.push(`peça ${o.id} marca oferta inexistente ${o.offer}`);
    perModel.set(o.modelId, (perModel.get(o.modelId) ?? 0) + 1);
  }
  for (const [m, n] of perModel) if (MODELS.get(m)?.unique && n > 1) bad.push(`modelo único ${m} com ${n} peças`);
  return bad;
}
