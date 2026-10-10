// Rodada 17 — crime: organizações por era, chances visíveis com o porquê, regras de história (sem assassinato de
// gente real), casos → indiciamento → delação/julgamento, relíquias reais + mercado negro, NPCs tramando e
// determinismo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { facts17 } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import {
  CRIMES17, commitCrime, crime17, crimeOdds, feedCase, isReal, orgs17, resolveCase, returnHot, seedRelics17, sellHot, trialOdds,
} from '../src/sim/sys/crime17';
import { relics } from '../src/sim/sys/relics9';
import '../src/sim/sys/crimenpc17';
import type { GameState } from '../src/sim/types';

const fictional = (s: GameState) => Object.values(s.acts).filter((a) => !a.catalogNo && a.owner !== 'player' && !a.playerBand && a.members.some((m) => s.persons[m]?.alive)).sort((a, b) => b.fame - a.fame)[0];
const realAct = (s: GameState) => Object.values(s.acts).find((a) => a.catalogNo && a.members.some((m) => s.persons[m]?.alive));

describe('r17 crime', () => {
  it('organizações seguem a era e a região', () => {
    const s = createGame(defaultConfig('r17-c1', { startYear: 1960, mode: 'historic', realNames: true }));
    const ids = orgs17(s).map((o) => o.id);
    expect(ids).toContain('outfit');
    expect(ids).toContain('kray');
    expect(ids).not.toContain('cv');
    expect(ids).not.toContain('medellin');
    expect(orgs17(s).find((o) => o.id === 'fnoite')!.city).toBe('london');
  });

  it('chances visíveis, sem assassinato de pessoa real, e consequências (fato, calor, obrigação)', () => {
    const s = createGame(defaultConfig('r17-c2', { startYear: 1975, mode: 'historic', realNames: true }));
    s.player.cash = 1e7;
    const ra = realAct(s);
    if (ra) {
      const pid = ra.members.find((m) => s.persons[m]?.alive)!;
      expect(isReal(s, pid)).toBe(true);
      // r18: só o modo "Vida real exata" protege gente real; os outros são história alternativa
      expect(crimeOdds(s, { actor: 'player', target: pid, partners: [] }, 'murder').block).toBeNull();
      s.config.history = 'strict';
      expect(crimeOdds(s, { actor: 'player', target: pid, partners: [] }, 'murder').block).not.toBeNull();
      s.config.history = 'loose';
    }
    const fa = fictional(s);
    const pid = fa.members.find((m) => s.persons[m]?.alive)!;
    const od = crimeOdds(s, { actor: 'player', target: pid, partners: [], org: 'fnoite' }, 'assault');
    expect(od.block).toBeNull();
    expect(od.why.length).toBeGreaterThan(0);
    expect(od.p).toBeGreaterThan(0.05);
    const n0 = facts17(s).f.length;
    const res = commitCrime(s, 'assault', { actor: 'player', target: pid, partners: [], org: 'fnoite' });
    expect(typeof res === 'object' && 'ok' in res).toBe(true);
    expect(facts17(s).f.length).toBeGreaterThan(n0);
    expect(facts17(s).f.some((f) => f.kind === 'crime' && f.tags.includes('assault'))).toBe(true);
    expect(Object.values(crime17(s).heat).some((h) => h > 0)).toBe(true);
    expect(crime17(s).log.at(-1)!.c).toBe('assault');
  });

  it('caso: provas → indiciamento → delação fecha com multa', () => {
    const s = createGame(defaultConfig('r17-c3', { startYear: 1980 }));
    s.player.cash = 1e7;
    const cs = feedCase(s, 'player', 'USA', 80, 60, true);
    feedCase(s, 'player', 'USA', 5, 60, true);
    expect(cs.rico).toBe(1);
    expect(trialOdds(s, cs).why.length).toBeGreaterThan(1);
    advanceMonth(s);
    expect(cs.stage).toBe('charged');
    const cash = s.player.cash;
    resolveCase(s, cs.id, 'plea');
    expect(cs.stage).toBe('closed');
    expect(s.player.cash).toBeLessThan(cash);
  });

  it('relíquias reais chegam na era e o roubo passa pelo mercado negro', () => {
    const s = createGame(defaultConfig('r17-c4', { startYear: 1970, mode: 'historic', realNames: true }));
    s.player.cash = 1e7;
    advanceMonth(s); seedRelics17(s);
    const names = relics(s).list.map((x) => x.n.en);
    expect(names.some((n) => n.includes('Hendrix'))).toBe(true);
    expect(names.some((n) => n.includes('Cobain'))).toBe(false);
    const rl = relics(s).list.find((x) => x.n.en.includes('Hendrix'))!;
    let stolen = false;
    for (let i = 0; i < 30 && !stolen; i++) {
      if (rl.st !== 'museum' && rl.st !== 'kept') { rl.st = 'museum'; }
      const r = commitCrime(s, 'steal_relic', { actor: 'player', target: rl.id, partners: [] });
      stolen = typeof r === 'object' && 'ok' in r && r.ok;
      s.week += 1;
    }
    expect(stolen).toBe(true);
    expect(crime17(s).stash).toContain(rl.id);
    const cash = s.player.cash;
    const msg = sellHot(s, rl.id, 0);
    expect(msg.pt.length).toBeGreaterThan(0);
    expect(crime17(s).stash).not.toContain(rl.id);
    expect(s.player.cash !== cash || rl.st === 'kept').toBe(true);
    expect(returnHot(s, rl.id).pt).toMatch(/esconderijo/);
  });

  it('NPCs tramam por anos sem assassinar gente real (modo exato), e é determinístico', () => {
    const run = () => {
      const s = createGame(defaultConfig('r17-c5', { startYear: 1985, mode: 'historic', realNames: true, history: 'strict' }));
      for (let i = 0; i < 24; i++) advanceMonth(s);
      return s;
    };
    const a = run(), b = run();
    const st = crime17(a);
    expect(st.log.length).toBeGreaterThan(2);
    for (const e of st.log.filter((x) => x.c === 'murder')) { expect(isReal(a, e.target)).toBe(false); expect(isReal(a, e.actor)).toBe(false); }
    expect(st.log.map((x) => x.c + x.target)).toEqual(crime17(b).log.map((x) => x.c + x.target));
    expect(CRIMES17.filter((c) => c.extra).length).toBeGreaterThanOrEqual(3);
  }, 240000);
});
