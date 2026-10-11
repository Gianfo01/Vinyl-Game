// R19 (frentes 0.3 e 11.4): todo perfil do lote de equilíbrio (bot realista + adversários) roda 1 ano sem exceção.
import { describe, expect, it } from 'vitest';
import { ADV19, BASE19, exploit19, runBot19, summarize19, type Bot19 } from '../src/sim/balance19';

describe('r19 bots de equilíbrio', () => {
  const bots: Bot19[] = [...BASE19, ...ADV19.map((a) => a.id)];
  for (const bot of bots) it(`${bot} joga 1 ano`, () => {
    const r = runBot19({ bot, start: 1975, seed: 'r19-bots', years: 1 });
    expect(Number.isFinite(r.worth)).toBe(true);
    expect(r.endYear).toBeGreaterThanOrEqual(1975);
    const s = summarize19([r]);
    expect(exploit19(s, s).flag).toBe(false);
  }, 60000);
});
