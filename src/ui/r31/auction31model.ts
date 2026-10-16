// R31 · onda 4 (T) — CASA DE LEILÕES em cena: modelo PURO (sem DOM). Monta a sala da época (salão com lustre,
// auditório, tela de lances online, aplicativo), o lote no pedestal com o brilho do nível, a lista de donos na tela
// atrás, o leiloeiro, a plateia com plaquinhas (pessoas que já existem; quem você conhece mostra pistas, quem não
// conhece é só um rosto), o catálogo na parede e o balcão de consignação. Tudo lê de sim/sys/auction31 (a mesma conta
// do martelo: `ladder31`). Montar o modelo nunca muda o estado nem gira sorteio.

import { cityById, l, type L } from '../../data/world';
import { know, know3 } from '../../sim/know';
import { relicMeasure31, TIER_NAME31 } from '../../sim/r31/relic31';
import {
  auction31, auctionOn31, bidders31, consignable31, hint31, HOUSE31, houseName31, ladder31, openSessions31, roomOf31, type Bidder31, type Hint31, type Ladder31, type Room31, type Sess31,
} from '../../sim/sys/auction31';
import { relics, type Relic } from '../../sim/sys/relics9';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import type { Spot31 } from './scene31model';

export const AUC_W31 = 320;
export const AUC_H31 = 180;
export const SEAT_XS31 = [36, 76, 116, 204, 244, 284, 156];

export interface Seat31 {
  b: Bidder31;
  x: number; y: number;
  /** nome (se você conhece) ou "plaquinha nº" */
  label: L;
  plate: number;
  hint: Hint31;
  /** já baixou a plaquinha (preço em que saiu) */
  outAt?: number;
  lead: boolean;
}
export interface Auc31 {
  W: number; H: number; year: number; room: Room31;
  on: boolean;
  sess?: Sess31;
  /** pregões abertos com lotes (para escolher) */
  picks: Sess31[];
  lot?: Relic;
  lotIdx: number;
  tier: number;
  tierName?: L;
  lad?: Ladder31;
  /** dia do pregão (a sala está cheia e o martelo bate nesta semana) */
  today: boolean;
  seats: Seat31[];
  mine: number;
  cons: boolean;
  consignable: number;
  spots: Spot31[];
  title: L;
}

const plateOf = (b: Bidder31): number => 10 + (Math.abs([...b.key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 89);

export function auction31Model(s: GameState, o: { sessId?: string; lotIdx?: number } = {}): Auc31 {
  const on = auctionOn31(s);
  const room = roomOf31(s.year);
  const picks = on ? openSessions31(s).filter((x) => x.lots.length) : [];
  const sess = picks.find((x) => x.id === o.sessId) ?? picks[0];
  const lotIdx = sess ? Math.max(0, Math.min(sess.lots.length - 1, o.lotIdx ?? 0)) : 0;
  const lot = sess ? relics(s).list.find((x) => x.id === sess.lots[lotIdx]) : undefined;
  const today = !!sess && sess.w === s.week;
  const st = on ? auction31(s) : undefined;
  const cons = !!(lot && st?.cons[lot.id]);
  const lad = sess && lot ? ladder31(s, sess.id, lot) : undefined;
  const m = lot ? relicMeasure31(s, lot) : undefined;
  const bs = sess && lot ? bidders31(s, sess.id, lot).filter((b) => b.kind !== 'phone' || b.name) : [];
  const seats: Seat31[] = bs.slice(0, SEAT_XS31.length - 1).map((b, i) => {
    const hint = hint31(s, b, today && lad ? lad.price : 0);
    const known = b.kind === 'phone' ? 1 : (() => { try { return know3(know(s, b.kind === 'artist' ? b.key.slice(2) : b.key)); } catch { return 0; } })();
    const plate = plateOf(b);
    const label = b.kind === 'phone' ? l(`Telefone: ${b.name}`, `Phone: ${b.name}`) : known >= 1 ? l(b.name, b.name) : fmtL(l('Plaquinha nº {n}', 'Paddle no. {n}'), { n: plate });
    const out = lad?.out.find((x) => x.key === b.key);
    return { b, x: SEAT_XS31[i], y: i % 2 ? 160 : 140, label, plate, hint, outAt: today ? out?.at : undefined, lead: today && lad?.lead === b.key };
  });
  const spots: Spot31[] = [];
  const sp = (x: Omit<Spot31, 'go'> & { panel: string }): void => { const { panel, ...rest } = x; spots.push({ ...rest, go: { panel } }); };
  sp({ id: 'door', x: 2, y: 58, w: 22, h: 52, label: l('Saída (lista de relíquias)', 'Exit (relic list)'), tip: l('Volta para a lista completa de relíquias, com a ficha de cada uma.', 'Back to the full relic list, with each piece\'s record.'), panel: 'door' });
  if (lot) {
    sp({ id: 'lot', x: 146, y: 46, w: 28, h: 64, label: l('Lote no pedestal', 'Lot on the pedestal'), tip: fmtL(l('{n} — {t}. Clique para ver a ficha e o lance inicial.', '{n} — {t}. Click to see its record and opening bid.'), { n: lot.n, t: m ? TIER_NAME31[m.tier - 1] : l('') }), panel: 'lot',
      badge: cons ? { text: l('seu', 'yours'), level: 'info' } : lot.bid ? { text: l('seu limite', 'your limit'), level: 'normal', sym: '✋' } : undefined });
    sp({ id: 'screen', x: 96, y: 6, w: 128, h: 38, label: l('Lista de donos', 'Owner list'), tip: l('Quem já teve a peça, em ordem: o comprador entra no fim da lista.', 'Who has owned the piece, in order: the buyer joins the end of the list.'), panel: 'owners' });
    sp({ id: 'gavel', x: 36, y: 62, w: 36, h: 48, label: l('Leiloeiro', 'Auctioneer'), tip: today ? l('Pregão hoje: o leiloeiro conduz o ritmo e bate o martelo.', 'Sale today: the auctioneer sets the pace and brings the hammer down.') : fmtL(l('Próximo martelo: semana {w}. Deixe um representante com limite.', 'Next hammer: week {w}. Leave a representative with a limit.'), { w: sess!.w - s.week }), panel: 'bid',
      badge: today ? { text: l('hoje', 'today'), level: 'soon' } : undefined });
    if (!cons) sp({ id: 'you', x: 150, y: 150, w: 20, h: 30, label: l('Sua plaquinha', 'Your paddle'), tip: l('Levantar a plaquinha (lance por rodada) ou deixar um limite para o representante.', 'Raise your paddle (a bid per round) or leave a limit for your representative.'), panel: 'bid',
      badge: lad?.lead === 'player' ? { text: l('na frente', 'leading'), level: 'normal', sym: '★' } : undefined });
    for (const [i, x] of seats.entries()) sp({ id: `seat:${i}`, x: x.x - 10, y: x.y - 30, w: 20, h: 32, label: x.label, quiet: true,
      tip: x.hint.k ? l('Alguém que você conhece: veja as pistas.', 'Someone you know: see the hints.') : l('Só um rosto na plateia.', 'Just a face in the crowd.'), panel: `seat:${i}`,
      badge: x.lead ? { text: l('lance', 'bid'), level: 'info', sym: '✋' } : x.outAt !== undefined ? { text: l('saiu', 'out'), level: 'info', sym: '–' } : undefined });
  }
  sp({ id: 'catalog', x: 236, y: 14, w: 64, h: 66, label: l('Catálogo na parede', 'Catalogue on the wall'), tip: l('Os próximos pregões e os lotes de cada um, com as datas do calendário.', 'Upcoming sales and their lots, with the calendar dates.'), panel: 'catalog',
    badge: picks.length ? { text: String(picks.reduce((t, x) => t + x.lots.length, 0)), level: 'info' } : undefined });
  sp({ id: 'consign', x: 262, y: 100, w: 54, h: 34, label: l('Balcão de consignação', 'Consignment desk'), tip: fmtL(l('Vender uma peça sua no próximo pregão (comissão da casa {c}%).', 'Sell a piece of yours at the next sale (house commission {c}%).'), { c: Math.round((st?.fee ?? 0.15) * 100) }), panel: 'consign' });
  const title = sess ? fmtL(l('{h} · {k}', '{h} · {k}'), { h: houseName31(s, sess.house, sess.city), k: HOUSE31[sess.house].name }) : l('Casa de leilões', 'Auction house');
  return { W: AUC_W31, H: AUC_H31, year: s.year, room, on, sess, picks, lot, lotIdx, tier: m?.tier ?? 1, tierName: m ? TIER_NAME31[m.tier - 1] : undefined, lad, today, seats,
    mine: lot?.bid ?? 0, cons, consignable: consignable31(s).length, spots, title };
}

export const ROOM_NAME31: Record<Room31, L> = {
  salon: l('Salão com lustre', 'Chandelier salon'), hall: l('Auditório', 'Auditorium'), screen: l('Tela de lances online', 'Online bidding screen'), app: l('Lances pelo aplicativo', 'Bidding by app'),
};
export const cityName31 = (id: string): L => cityById[id]?.name ?? l(id, id);
