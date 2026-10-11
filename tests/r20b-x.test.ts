// Rodada 20b (X) — parceria de TV respeita o caixa livre (B4) e as salas da sede apontam para ações do registro.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import type { GameState, Offer } from '../src/sim/types';
import '../src/sim/sys';
import { FR18, becomePartner18, partnerFee18, partnerQuote18, tv18 } from '../src/sim/sys/tv18';
import { freeCash20 } from '../src/sim/oblig20';
import { ROOM_ACTIONS20, action20 } from '../src/ui/actions20';

function game(): GameState {
  const s = createGame(defaultConfig('r20b-x'));
  const st = tv18(s);
  st.cur = { id: 'tvx', fr: FR18[0].id, y: s.year, stage: 'casting', cont: [] };
  return s;
}
const fee = (s: GameState) => partnerFee18(s, FR18[0]);
const snap = (s: GameState) => JSON.stringify({ c: s.player.cash, t: tv18(s).cur });

describe('r20b X — parceria de TV e caixa livre', () => {
  it('com caixa livre suficiente: cotação sem bloqueio e assinatura debita uma vez', () => {
    const s = game();
    s.player.cash = fee(s) * 3;
    const q = partnerQuote18(s);
    expect(q.block).toBeNull();
    expect(q.cost).toBe(fee(s));
    expect(q.free).toBe(freeCash20(s));
    const c0 = s.player.cash;
    expect(becomePartner18(s)).toBeNull();
    expect(tv18(s).cur!.partner).toBe('player');
    expect(c0 - s.player.cash).toBe(fee(s));
    expect(partnerQuote18(s).block).not.toBeNull();
  });

  it('caixa reservado em oferta pendente bloqueia com motivo e não muda estado', () => {
    const s = game();
    s.player.cash = fee(s) + 100;
    const actId = Object.keys(s.acts)[0];
    s.offers.push({ id: 'ofx', actId, model: 'standard', advance: 5000, royalty: 0.1, termMonths: 12, releasesOwed: 1, creativeControl: false, publishing: false, share360: 0, promises: [], week: 0, status: 'pending' } as unknown as Offer);
    const q = partnerQuote18(s);
    expect(q.reserved).toBeGreaterThanOrEqual(5000);
    expect(q.block?.pt).toMatch(/reservado/);
    expect(q.block?.en.length).toBeGreaterThan(5);
    const before = snap(s);
    expect(becomePartner18(s)).not.toBeNull();
    expect(snap(s)).toBe(before);
    // oferta recusada libera a reserva
    s.offers[s.offers.length - 1].status = 'rejected';
    if (freeCash20(s) >= fee(s)) expect(partnerQuote18(s).block).toBeNull();
  });

  it('caixa curto: motivo "insuficiente" e nada muda', () => {
    const s = game();
    s.player.cash = fee(s) - 1;
    expect(partnerQuote18(s).block?.pt).toMatch(/insuficiente/);
    const before = snap(s);
    expect(becomePartner18(s)).not.toBeNull();
    expect(snap(s)).toBe(before);
  });

  it('salas da sede: toda ação de sala existe no registro único', () => {
    for (const [room, id] of Object.entries(ROOM_ACTIONS20)) expect(action20(id), room).toBeTruthy();
  });
});
