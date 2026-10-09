import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { hall, hallExists } from '../src/sim/sys/rockhall9';

describe('Hall da Fama do Rock', () => {
  it('não existe antes de 1983 e empossa turmas a partir de 1986', () => {
    const s = createGame(defaultConfig('rh', { startYear: 1982, realNames: true }));
    expect(hallExists(s)).toBe(false);
    s.flags.sandbox = 1; // o teste é do Hall, não da saúde financeira do selo sem jogador
    for (let i = 0; i < 12 * 4 + 2; i++) advanceMonth(s);
    expect(hallExists(s)).toBe(true);
    const st = hall(s);
    expect(st.inducted.length).toBeGreaterThan(0);
    expect(Math.min(...st.inducted.map((x) => x.year))).toBeGreaterThanOrEqual(1986);
    for (const e of st.inducted.filter((x) => x.actId)) expect(s.year - s.acts[e.actId!].debutYear).toBeGreaterThanOrEqual(25);
  }, 300000);
});
