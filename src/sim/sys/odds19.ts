// Rodada 19 (Frente B.3 — auditoria 8 §3): toda tela de negociação mostra a chance calculada com os termos
// selecionados pela MESMA função que o sorteio usa. O registro liga cada tela ao par (chance mostrada, sorteio);
// o teste tests/r19-fix-b.test.ts sorteia com um Rng fixo e confere, para vários termos, que "aceitou" ⇔ u < chance.
import { l, type L } from '../../data/world';
import type { Rng } from '../../core/rng';
import type { GameState } from '../types';
import { a18, counter18, counterOdds18, type Ask18 } from './artist18';
import { pitchAct, pitchOdds8, type FestTier } from './fests8';
import { poachChance, poachClient, rateChance, renegotiateRate } from './manager11';
import { mandateChance, negotiateMandate } from './manager12';
import { admChance18, takeAdm18, r18 } from './rights18';
import { bookingChance, inviteAct, inviteChance, mgChance, pitchClient, signBooking, ventures } from './ventures9';

export interface Odds19 {
  /** tela onde a chance aparece (para a ajuda e o teste de cobertura) */
  screen: L;
  /** chance mostrada, com os termos escolhidos */
  chance: (s: GameState, a: unknown[]) => number;
  /** o sorteio de verdade; true = a outra parte aceitou */
  roll: (s: GameState, r: Rng, a: unknown[]) => boolean;
}
export const ODDS19: Record<string, Odds19> = {};
export function registerOdds19(id: string, d: Odds19): void { ODDS19[id] = d; }

const vById = (s: GameState, id: unknown) => ventures(s).list.find((v) => v.id === id)!;
const act = (s: GameState, id: unknown) => s.acts[id as string];
const clientOf = (s: GameState, id: unknown) => ventures(s).mg.clients.find((c) => c.actId === id)!;
type Args = unknown[];

registerOdds19('mg.pitch', { screen: l('Empresário › Prospectar', 'Manager › Prospect'),
  chance: (s, [a, rate]: Args) => mgChance(s, act(s, a), rate as number),
  roll: (s, r, [a, rate]: Args) => pitchClient(s, r, a as string, rate as number).ok });
registerOdds19('mg.poach', { screen: l('Empresário › Roubar clientes', 'Manager › Poach clients'),
  chance: (s, [a, rate]: Args) => poachChance(s, act(s, a), rate as number),
  roll: (s, r, [a, rate]: Args) => poachClient(s, r, a as string, rate as number).ok });
registerOdds19('mg.rate', { screen: l('Empresário › Renegociar comissão', 'Manager › Renegotiate commission'),
  chance: (s, [a, rate]: Args) => rateChance(s, clientOf(s, a), rate as number),
  roll: (s, r, [a, rate]: Args) => renegotiateRate(s, r, a as string, rate as number).ok });
registerOdds19('mg.mandate', { screen: l('Empresário › Mandato', 'Manager › Mandate'),
  chance: (s, [a, m]: Args) => mandateChance(s, a as string, m as Parameters<typeof mandateChance>[2]),
  roll: (s, r, [a, m]: Args) => negotiateMandate(s, r, a as string, m as Parameters<typeof mandateChance>[2]).ok });
registerOdds19('booking.sign', { screen: l('Agência de shows › Oferecer agenciamento', 'Booking agency › Offer booking'),
  chance: (s, [v, a, rate]: Args) => bookingChance(s, vById(s, v), act(s, a), rate as number),
  roll: (s, r, [v, a, rate]: Args) => signBooking(s, r, v as string, a as string, rate as number).ok });
registerOdds19('fest.invite', { screen: l('Festival › Convidar artista', 'Festival › Invite act'),
  chance: (s, [v, a]: Args) => inviteChance(s, vById(s, v), act(s, a)),
  roll: (s, r, [v, a]: Args) => inviteAct(s, r, v as string, a as string).ok });
registerOdds19('fest.pitch', { screen: l('Festivais › Oferecer um artista seu', 'Festivals › Pitch one of your acts'),
  chance: (s, [fi, a, tier, fee]: Args) => pitchOdds8(s, fi as number, a as string, tier as FestTier, fee as number),
  roll: (s, r, [fi, a, tier, fee]: Args) => pitchAct(s, r, fi as number, a as string, tier as FestTier, fee as number).result === 'accepted' });
registerOdds19('artist.counter', { screen: l('Artista › Propostas › Contrapropor', 'Artist › Offers › Counter'),
  chance: (s, [o, ask]: Args) => counterOdds18(s, a18(s).offers.find((x) => x.id === o)!, ask as Ask18).p,
  roll: (s, r, [o, ask]: Args) => counter18(s, o as string, ask as Ask18, r).ok });
registerOdds19('pub.admin', { screen: l('Direitos › Editora › Propostas', 'Rights › Publishing › Offers'),
  chance: (s, [, fee]: Args) => admChance18(s, fee as number),
  roll: (s, r, [id, fee]: Args) => { takeAdm18(s, id as string, fee as number, r); return r18(s).adm.some((c) => c.id === id); } });
