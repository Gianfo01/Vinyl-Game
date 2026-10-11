// R19 (frentes 0.3 e 11.4): todo perfil do lote de equilíbrio (bot realista + adversários) joga sem exceção.
// Rápido por padrão: cada perfil joga 3 meses (adversários 2) numa base pequena, com os inícios em rodízio pelas eras
// (1889/1955/1975/2005) — cobre as estratégias em mais épocas que antes. BALANCE_FULL=1: 1 ano cada a partir de 1975,
// base média (a versão antiga).
import { describe, expect, it } from 'vitest';
import { ADV19, BASE19, START19, exploit19, runBot19, summarize19, type Bot19 } from '../src/sim/balance19';

const FULL = !!process.env.BALANCE_FULL;

describe('r19 bots de equilíbrio', () => {
  const bots: Bot19[] = [...BASE19, ...ADV19.map((a) => a.id)];
  bots.forEach((bot, i) => it(`${bot} joga ${FULL ? '1 ano' : 'alguns meses'}`, () => {
    const base = (BASE19 as Bot19[]).includes(bot);
    const r = FULL
      ? runBot19({ bot, start: 1975, seed: 'r19-bots', years: 1 })
      : runBot19({ bot, start: START19[i % START19.length], seed: 'r19-bots', years: (base ? 3 : 2) / 12, db: 'small' });
    expect(Number.isFinite(r.worth)).toBe(true);
    expect(r.endYear).toBeGreaterThanOrEqual(r.start);
    const s = summarize19([r]);
    expect(exploit19(s, s).flag).toBe(false);
  }, 60000));
});
