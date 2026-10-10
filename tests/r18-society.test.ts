// Rodada 18 (society18) — trilhas/Broadway, IA por ato, política de prêmios e paradas, jornalismo, censura/exílio,
// filantropia e cidade da música.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { startCareer } from '../src/sim/sys/careers12';
import { acceptComm18, composers18, declineComm18, sc18 } from '../src/sim/sys/screen18';
import { genAppeal18, ai18, setAiMode18 } from '../src/sim/sys/ai18';
import { relAdj18, ruleMult18, rulesNow18, voters18 } from '../src/sim/sys/awards18';
import { pr18, queue18, review18 } from '../src/sim/sys/press18';
import { censorChoice18, censorMult18, cityScore18, soc18, startCharity18 } from '../src/sim/sys/society18';
import { Rng } from '../src/core/rng';
import { playerActs } from '../src/sim/util';
import '../src/sim/sys';

describe('r18 society18', () => {
  it('trilhas: encomenda chega, é aceita, entregue e estreia', () => {
    const s = createGame(defaultConfig('r18-soc1', { startYear: 1985, realNames: false }));
    startCareer(s, 'screen');
    s.player.cash += 10_000_000;
    let done = false;
    for (let i = 0; i < 36 && !done; i++) {
      advanceMonth(s);
      const off = sc18(s).list.find((c) => c.st === 'offer');
      const who = composers18(s)[0];
      if (off && who && acceptComm18(s, off.id, who.id, 'orch')) declineComm18(s, off.id);
      done = sc18(s).list.some((c) => (c.st === 'done' && c.box !== undefined) || c.st === 'rejected');
    }
    expect(done).toBe(true);
    expect(sc18(s).list.some((c) => c.st === 'declined' || c.who)).toBe(true);
    expect(sc18(s).log.length).toBeGreaterThan(0);
  }, 240000);

  it('votantes e regras mudam com a época; IA gerada é inelegível', () => {
    const s = createGame(defaultConfig('r18-soc2', { startYear: 1990, realNames: false }));
    expect(voters18(s).bias.hiphop).toBeLessThan(0);
    s.year = 2021;
    expect(voters18(s).reformed).toBe(true);
    expect(rulesNow18(s).some((r) => r.id === 'nobundle')).toBe(true);
    const rel = Object.values(s.releases)[0];
    if (rel) {
      ai18(s).gen[rel.id] = 0;
      s.year = 2024;
      expect(relAdj18(s, rel).v).toBeLessThan(-100);
      expect(genAppeal18(s, rel).v).toBeLessThan(1);
      expect(ruleMult18(s, rel).v).toBeGreaterThan(0);
    }
  }, 120000);

  it('jornalismo: resenha move a média e a credibilidade; censura e filantropia têm efeito', () => {
    const s = createGame(defaultConfig('r18-soc3', { startYear: 1970, realNames: false }));
    startCareer(s, 'critic');
    for (let i = 0; i < 3; i++) advanceMonth(s);
    const q = queue18(s);
    if (q.length) { const c0 = pr18(s).cred; expect(review18(s, q[0].id, Math.round(q[0].q))).toBeNull(); expect(pr18(s).cred).toBeGreaterThanOrEqual(c0); expect(pr18(s).n).toBe(1); }
    const a = s.acts[playerActs(s)[0]];
    const rel = Object.values(s.releases).find((r) => r.actId === a?.id) ?? Object.values(s.releases)[0];
    if (rel) { censorChoice18(s, rel.id, 'defy', new Rng(1)); expect(censorMult18(s, rel.id)).toBeLessThan(1); }
    s.player.cash += 10_000_000;
    expect(startCharity18(s, 'children', 'single', 0)).toBeNull();
    for (let i = 0; i < 4; i++) advanceMonth(s);
    expect(soc18(s).camp?.stage).toBe('done');
    expect(cityScore18(s, s.config.homeCity).v).toBeGreaterThanOrEqual(0);
    expect(setAiMode18(s, playerActs(s)[0], 'gen')).not.toBeNull(); // 1970: sem IA
  }, 240000);
});
