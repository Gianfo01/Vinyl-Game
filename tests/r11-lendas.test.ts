// Rodada 11 — Lendas: negociar relíquias com o dono, lance fechado no leilão, emprestar, expor e doar.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { acceptCounter, addRelic, donateRelic, lendRelic, negotiateRelic, openingBid, placeBid, relics, toggleExhibit } from '../src/sim/sys/relics9';

const mk = (seed: string) => createGame(defaultConfig(seed, {}));

describe('relíquias (rodada 11)', () => {
  it('negociação: aceita, contrapropõe ou recusa; recusa impõe espera', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const s = mk(`r11-neg-${i}`);
      s.player.cash = 1e12;
      const a = Object.values(s.acts)[0];
      const rl = addRelic(s, 'guitar', l('Guitarra', 'Guitar'), a.id, a.members[0], 20000);
      const r = negotiateRelic(s, rl.id, i % 2 ? 1.7 : 1);
      expect('r' in r).toBe(true);
      if (!('r' in r)) continue;
      seen.add(r.r);
      if (r.r === 'accept') expect(rl.st).toBe('player');
      if (r.r === 'counter') { expect(rl.ctr!.p).toBeGreaterThan(0); expect(acceptCounter(s, rl.id)).toBeNull(); expect(rl.st).toBe('player'); }
      if (r.r === 'refuse') { expect(rl.st).toBe('kept'); expect('pt' in (negotiateRelic(s, rl.id, 2) as object)).toBe(true); }
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });

  it('lance fechado alto vence o leilão; acervo pode ser exposto, emprestado e doado', () => {
    const s = mk('r11-bid');
    s.player.cash = 1e12;
    const a = Object.values(s.acts)[0];
    const rl = addRelic(s, 'tape', l('Fitas', 'Tapes'), a.id, undefined, 10000);
    rl.st = 'auction';
    rl.au = s.week + 2;
    expect(placeBid(s, rl.id, openingBid(s, rl) - 1)).not.toBeNull();
    expect(placeBid(s, rl.id, openingBid(s, rl) * 3)).toBeNull();
    for (let i = 0; i < 2; i++) advanceMonth(s);
    expect(rl.st).toBe('player');
    expect(toggleExhibit(s, rl.id)).toBeNull();
    expect(rl.ex).toBe(1);
    const cash = s.player.cash;
    expect(lendRelic(s, rl.id)).toBeNull();
    expect(s.player.cash).toBeGreaterThan(cash);
    expect(rl.ln).toBeTruthy();
    const rep = s.player.reputation.artistic;
    expect(donateRelic(s, rl.id)).toBeNull();
    expect(rl.st).toBe('museum');
    expect(s.player.reputation.artistic).toBeGreaterThanOrEqual(Math.min(100, rep + 1));
    expect(relics(s).list.includes(rl)).toBe(true);
  });
});
