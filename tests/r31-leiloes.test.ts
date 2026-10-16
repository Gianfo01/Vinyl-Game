// R31 · onda 4 (T): casa de leilões — pregões no calendário, lotes que não se repetem, plateia de pessoas que já
// existem, o lance não revela o teto secreto (know.ts), a cena e o martelo usam a mesma conta, representante com
// limite, consignação com comissão, alfândega e interruptor.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { calendar19 } from '../src/sim/calendar19';
import { advanceWeek } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { setSw } from '../src/sim/r31/switches';
import { ownerOf } from '../src/sim/sys/people/owner';
import { addRelic, openingBid, relics, type Relic } from '../src/sim/sys/relics9';
import {
  assignLots31, auction31, bidders31, closeSession31, consign31, ensureSessions31, hammer31, hint31, ladder31, raise31, roomOf31, sessionOf31,
} from '../src/sim/sys/auction31';
import { rngSnapshot19 } from '../src/sim/rng19';
import '../src/sim/sys';

const mk = (seed: string, y = 1985) => createGame(defaultConfig(seed, { startYear: y, realNames: false }));
const rich = (s: GameState) => { ownerOf(s).wealth = 1e12; s.player.cash = 1e12; };
function lot(s: GameState, v = 40000): Relic {
  const rl = addRelic(s, 'guitar', { pt: 'Guitarra de teste', en: 'Test guitar' }, undefined, undefined, v, s.year - 10);
  rl.st = 'auction'; rl.au = s.week + 13; // como o relics9 abre um leilão
  ensureSessions31(s);
  assignLots31(s);
  return rl;
}

describe('r31 T · casa de leilões', () => {
  it('pregões com data e catálogo antecipado; aparecem no calendário', () => {
    const s = mk('auc-cal');
    const rl = lot(s);
    const se = sessionOf31(s, rl.id)!;
    expect(se).toBeTruthy();
    expect(se.w).toBeGreaterThanOrEqual(s.week + 2);
    expect(se.w).toBeLessThanOrEqual(rl.au!); // o martelo é no fechamento do mês do leilão de sempre
    const ids = calendar19(s, { weeks: 30 }).map((d) => d.id);
    expect(ids).toContain(`auc31:${se.id}`);
    // local todo mês, grande a cada 3, prestígio a cada 6
    const hs = auction31(s).sess.map((x) => x.house);
    expect(hs.filter((h) => h === 'local').length).toBeGreaterThanOrEqual(5);
    expect(hs.filter((h) => h === 'prestige').length).toBeGreaterThanOrEqual(1);
  });

  it('plateia de pessoas do jogo; pistas só para quem você conhece e nunca o teto', () => {
    const s = mk('auc-bid');
    const rl = lot(s, 300000);
    const se = sessionOf31(s, rl.id)!;
    const bs = bidders31(s, se.id, rl);
    expect(bs.length).toBeGreaterThanOrEqual(2);
    for (const b of bs.filter((x) => x.kind !== 'phone')) expect(b.key.startsWith('p:') ? !!s.persons[b.key.slice(2)] : b.key.startsWith('l:')).toBe(true);
    for (const b of bs) {
      const h = hint31(s, b, openingBid(s, rl));
      expect(JSON.stringify(h)).not.toContain(String(b.max));
      if (h.k === 0) expect(h.spend ?? h.keen ?? h.hesitant).toBeUndefined();
    }
    // explorar não muda o mundo: montar a plateia e a escada não gira sorteio nem muda a peça
    const snap = rngSnapshot19(s), before = JSON.stringify(rl);
    ladder31(s, se.id, rl, openingBid(s, rl) * 3);
    bidders31(s, se.id, rl);
    expect(rngSnapshot19(s)).toBe(snap);
    expect(JSON.stringify(rl)).toBe(before);
  });

  it('a cena e o martelo usam a mesma conta: limite alto vence pelo 2º maior + degrau', () => {
    const s = mk('auc-win');
    rich(s);
    const rl = lot(s);
    const se = sessionOf31(s, rl.id)!;
    const top = Math.max(...bidders31(s, se.id, rl).map((b) => b.max));
    expect(raise31(s, rl.id, top * 2)).toBeNull();
    const lad = ladder31(s, se.id, rl);
    expect(lad.lead).toBe('player');
    const cash = s.player.cash;
    const row = hammer31(s, se, rl.id)!;
    expect(row[3]).toBe(1);
    expect(row[2]).toBe(lad.price);
    expect(rl.st).toBe('player');
    expect(cash - s.player.cash).toBeGreaterThanOrEqual(lad.price);
  });

  it('sem lance seu, alguém da plateia leva; lote não volta a pregão sem trocar de dono', () => {
    const s = mk('auc-npc');
    const rl = lot(s);
    const se = sessionOf31(s, rl.id)!;
    closeSession31(s, se);
    expect(rl.st === 'kept' || rl.st === 'player').toBe(true);
    expect(se.done).toBe(1);
    const sold = se.res!.find((x) => x[0] === rl.id)!;
    if (sold[2] === 0) { // sem venda: voltou ao dono e não repete
      rl.st = 'auction';
      assignLots31(s);
      expect(rl.st).toBe('kept');
    } else {
      expect(rl.own.at(-1)![2]).toBe('leilão');
    }
  });

  it('consignação: sua peça vai ao pregão e você recebe o martelo menos a comissão', () => {
    const s = mk('auc-cons');
    const rl = addRelic(s, 'guitar', { pt: 'Minha guitarra', en: 'My guitar' }, undefined, undefined, 60000, s.year - 20);
    rl.st = 'player';
    expect(consign31(s, rl.id)).toBeNull();
    const se = sessionOf31(s, rl.id)!;
    expect(se).toBeTruthy();
    expect(raise31(s, rl.id, 1e9)).not.toBeNull(); // não dá lance no próprio lote
    const cash = s.player.cash;
    const row = hammer31(s, se, rl.id)!;
    if (row[2] > 0) expect(Math.round(s.player.cash - cash)).toBe(Math.round(row[2] * 0.85));
    else expect(rl.st).toBe('player');
  });

  it('o motor fecha o pregão sozinho na semana do martelo', () => {
    const s = mk('auc-run');
    const rl = lot(s);
    const se = sessionOf31(s, rl.id)!;
    for (let i = 0; i < 40 && !se.done; i++) advanceWeek(s);
    expect(se.done).toBe(1);
    expect(relics(s).list.find((x) => x.id === rl.id)?.st).not.toBe('auction');
  });

  it('desligado: nenhum pregão e o leilão do relics9 segue como antes', () => {
    const s = mk('auc-off');
    setSw(s, 'auction31', false);
    const rl = addRelic(s, 'guitar', { pt: 'X', en: 'X' }, undefined, undefined, 40000, s.year - 10);
    rl.st = 'auction'; rl.au = s.week + 13;
    for (let i = 0; i < 6; i++) advanceWeek(s);
    expect(sessionOf31(s, rl.id)).toBeUndefined();
  });

  it('a sala muda com a época', () => {
    expect(roomOf31(1900)).toBe('salon');
    expect(roomOf31(1975)).toBe('hall');
    expect(roomOf31(2003)).toBe('screen');
    expect(roomOf31(2020)).toBe('app');
  });
});
