// R31 · onda 4 (T2) — SALA DE ABERTURA DOS ENVELOPES: modelo PURO (sem DOM). Mesa do leiloeiro judicial (cartório até
// 1960, sala de reunião depois, telão de transmissão a partir de 2005), o edital na parede, a urna, os envelopes na
// mesa e quem está disputando (pessoas que já existem: o líder do selo, se você conhece; senão só o timbre). Lê de
// sim/sys/sealed31. Montar o modelo nunca muda o estado nem gira sorteio.
import { l, type L } from '../../data/world';
import {
  CAUSE31, myEnvelope31, parties31, sealedOn31, sellable31, tenders31, type Env31, type Party31, type Tender31,
} from '../../sim/sys/sealed31';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import type { Spot31 } from './scene31model';

export const SEAL_W31 = 320;
export const SEAL_H31 = 180;
/** cadeiras do lado de lá da mesa (até 5 representantes) */
export const SEAT_XS_S31 = [92, 132, 188, 228, 268];
export type SRoom31 = 'notary' | 'board' | 'stream';
export const sroomOf31 = (y: number): SRoom31 => (y < 1960 ? 'notary' : y < 2005 ? 'board' : 'stream');
export interface SSeat31 { p: Party31; x: number; y: number }
export interface Seal31 {
  W: number; H: number; year: number; room: SRoom31; on: boolean;
  /** editais abertos e atas recentes para escolher */
  picks: Tender31[];
  t?: Tender31;
  /** ata (abertura já feita) */
  done: boolean;
  /** envelopes na mesa: na ata, os abertos (do menor ao maior); antes, só a contagem */
  env: Env31[];
  sealedN: number;
  mine: number;
  seats: SSeat31[];
  sellable: number;
  spots: Spot31[];
  title: L;
}
export function sealed31Model(s: GameState, o: { id?: string; opened?: number } = {}): Seal31 {
  const on = sealedOn31(s);
  const open = tenders31(s);
  const recent = on ? (s.x4 as unknown as { sealed31?: { done?: Tender31[] } }).sealed31?.done?.slice(0, 4) ?? [] : [];
  const picks = [...open, ...recent];
  const t = picks.find((x) => x.id === o.id) ?? picks[0];
  const done = !!t && t.st === 'done';
  const ps = t && !done ? parties31(s, t) : [];
  const mine = t && !done ? myEnvelope31(s, t.id) : 0;
  const seats: SSeat31[] = done
    ? (t?.env ?? []).filter((e) => e.who !== 'player').slice(0, SEAT_XS_S31.length).map((e, i) => ({ p: { who: e.who, name: l(e.name, e.name), kind: e.who.startsWith('fund:') ? 'fund' : 'label', k: 0, hints: [] }, x: SEAT_XS_S31[i], y: 96 }))
    : ps.slice(0, SEAT_XS_S31.length).map((p, i) => ({ p, x: SEAT_XS_S31[i], y: 96 }));
  const env = done ? t?.env ?? [] : [];
  const sealedN = done ? 0 : ps.length + (mine ? 1 : 0);
  const room = sroomOf31(s.year);
  const spots: Spot31[] = [];
  const sp = (x: Omit<Spot31, 'go'> & { panel: string }): void => { const { panel, ...rest } = x; spots.push({ ...rest, go: { panel } }); };
  sp({ id: 'door', x: 2, y: 52, w: 22, h: 46, label: l('Saída', 'Exit'), tip: l('Volta para Finanças › Dívida e catálogo.', 'Back to Finance › Debt and catalog.'), panel: 'door' });
  sp({ id: 'edital', x: 28, y: 12, w: 64, h: 54, label: l('Edital na parede', 'Tender notice'), tip: t ? fmtL(l('{n}: {k} master(s), {c}.', '{n}: {k} master(s), {c}.'), { n: t.name, k: t.rels.length, c: CAUSE31[t.cause] }) : l('Nenhum edital aberto agora.', 'No tender open right now.'), panel: 'edital',
    badge: open.length ? { text: String(open.length), level: 'info' } : undefined });
  sp({ id: 'notary', x: 148, y: 76, w: 26, h: 30, label: l('Leiloeiro judicial', 'Court auctioneer'), tip: done ? l('Abre os envelopes um por um, do menor para o maior.', 'Opens the envelopes one by one, from lowest to highest.') : t ? fmtL(l('Abertura em {w} semana(s), na virada do mês.', 'Opening in {w} week(s), at the turn of the month.'), { w: Math.max(0, t.ends - s.week) }) : l('Sem abertura marcada.', 'No opening scheduled.'), panel: 'notary',
    badge: done ? { text: l('ata', 'minutes'), level: 'info' } : t && t.ends - s.week <= 1 ? { text: l('hoje', 'today'), level: 'soon' } : undefined });
  if (t && !done && t.from !== 'player') sp({ id: 'urn', x: 32, y: 106, w: 34, h: 54, label: l('Urna dos envelopes', 'Envelope urn'), tip: mine ? l('Seu envelope já está lá: a proposta é única e secreta.', 'Your envelope is already in: the bid is single and secret.') : l('Entregar a sua proposta fechada (uma só, secreta).', 'Deliver your sealed bid (just one, secret).'), panel: 'urn',
    badge: mine ? { text: l('entregue', 'delivered'), level: 'info', sym: '✉' } : undefined });
  sp({ id: 'table', x: 84, y: 104, w: 140, h: 22, label: l('Envelopes na mesa', 'Envelopes on the table'), tip: done ? l('Os envelopes abertos, com o valor de cada um.', 'The opened envelopes, with each amount.') : fmtL(l('{n} envelope(s) lacrado(s). Ninguém vê o valor antes da abertura.', '{n} sealed envelope(s). Nobody sees the amount before the opening.'), { n: sealedN }), panel: done ? 'notary' : 'table' });
  for (const [i, x] of seats.entries()) sp({ id: `seat:${i}`, x: x.x - 10, y: x.y - 32, w: 20, h: 32, label: x.p.name, quiet: true,
    tip: x.p.k ? l('Alguém que você conhece: veja as pistas.', 'Someone you know: see the hints.') : l('Só um timbre no envelope.', 'Just a letterhead on the envelope.'), panel: `seat:${i}` });
  sp({ id: 'sell', x: 276, y: 40, w: 36, h: 58, label: l('Arquivo: vender catálogo', 'Files: sell catalog'), tip: l('Pôr masters seus em proposta fechada: você recebe o maior envelope.', 'Put masters of yours up for sealed bids: you get the highest envelope.'), panel: 'sell' });
  const title = t ? fmtL(l('Abertura dos envelopes · {n}', 'Envelope opening · {n}'), { n: t.name }) : l('Sala de abertura dos envelopes', 'Envelope opening room');
  return { W: SEAL_W31, H: SEAL_H31, year: s.year, room, on, picks, t, done, env, sealedN, mine, seats, sellable: on ? sellable31(s).length : 0, spots, title };
}
export const ROOM_S31: Record<SRoom31, L> = {
  notary: l('Cartório do leiloeiro', 'Auctioneer\'s office'), board: l('Sala de reuniões', 'Meeting room'), stream: l('Sala com transmissão ao vivo', 'Room with a live stream'),
};
