// Rodada 18 — iniciativas de NPCs movidas por motivos: meses sem gatilho são quietos; um fato forte gera uma
// iniciativa com porquê; numa partida longa aparecem iniciativas boas, neutras e ruins.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { emitFact } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ag18, agencyMonth18, toneOf18, VERBS18 } from '../src/sim/sys/agency18';
import { leadOf18 } from '../src/sim/sys/feud18';
import { playerActs } from '../src/sim/util';
import '../src/sim/sys';

const cfg = (seed: string) => defaultConfig(seed, { startYear: 1990, mode: 'historic', realNames: true, history: 'free' });

describe('r18 agency (motivos)', () => {
  it('35+ iniciativas, com 10+ de cada tom', () => {
    expect(VERBS18.length).toBeGreaterThanOrEqual(35);
    for (const t of ['good', 'neutral', 'bad'] as const) expect(VERBS18.filter((v) => toneOf18(v) === t).length).toBeGreaterThanOrEqual(10);
  });

  it('sem gatilho, ninguém age; um fato forte gera iniciativa com porquê', () => {
    const s = createGame(cfg('r18-ag1'));
    const st = ag18(s);
    st.mot = {}; st.inc = {};
    const n0 = st.n;
    for (let i = 0; i < 6; i++) expect(agencyMonth18(s, Rng.fromSeed(`q${i}`))).toEqual([]);
    expect(st.n).toBe(n0);
    const mine = new Set(playerActs(s));
    const acts = Object.values(s.acts).filter((a) => a.status === 'active' && !mine.has(a.id) && leadOf18(s, a) && !leadOf18(s, a)!.isPlayer && leadOf18(s, a)!.alive).slice(0, 2);
    const [x, y] = acts.map((a) => leadOf18(s, a)!);
    const txt = { pt: `${y.name} humilha ${x.name} numa entrevista.`, en: `${y.name} humiliates ${x.name} in an interview.` };
    for (let i = 0; i < 2; i++) emitFact(s, { kind: 'statement', actors: [y.id, x.id], severity: 100, visibility: 'public', tags: ['beef'], text: txt, src: 'test' });
    expect(st.mot[`p:${x.id}>p:${y.id}`]?.v[0]).toBeGreaterThan(90);
    let row;
    for (let i = 0; i < 12 && !row; i++) row = agencyMonth18(s, Rng.fromSeed(`t${i}`)).find((r) => r.a === `p:${x.id}`);
    expect(row).toBeTruthy();
    expect(row!.why?.pt).toContain(txt.pt);
  }, 120000);

  it('partida longa: boas, neutras e ruins; poucas por mês', () => {
    const s = createGame(cfg('r18-ag2'));
    let quiet = 0;
    for (let i = 0; i < 60; i++) { const n0 = ag18(s).n; advanceMonth(s); if (ag18(s).n === n0) quiet++; }
    const nt = ag18(s).nt;
    console.log('NT', JSON.stringify(nt), quiet);
    expect(nt.good ?? 0).toBeGreaterThan(0);
    expect(nt.neutral ?? 0).toBeGreaterThan(0);
    expect(nt.bad ?? 0).toBeGreaterThan(0);
    expect(quiet).toBeGreaterThan(10);
    expect(ag18(s).log.some((r) => r.why)).toBe(true);
  }, 600000);
});
