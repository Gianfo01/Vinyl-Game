// Rodada 23 — membros de organizações criminosas: recrutamento ao longo dos anos (modo livre), nada de gente real
// no modo "Vida real exata", persistência no save (JSON) e o cartão quando a segurança descobre um funcionário seu.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { resolveDecision } from '../src/sim/events';
import { advanceMonth } from '../src/sim/tick';
import { createGame, genStaff } from '../src/sim/worldgen';
import { a3Of, crime17, isReal, orgs17 } from '../src/sim/sys/crime17';
import '../src/sim/sys/crimenpc17';
import { _crimemem23, mem23, moleCard23, recruitOdds } from '../src/sim/sys/crimemem23';
import { leaders } from '../src/sim/sys/leaders10';
import type { GameState } from '../src/sim/types';

/** Simula N meses só dos sistemas de membros (rápido), avançando o calendário. */
function months(s: GameState, n: number, tag: string): void {
  for (let i = 0; i < n; i++) {
    const r = Rng.fromSeed(`${tag}:${i}`);
    _crimemem23.memberMonth(s, r);
    _crimemem23.recruitMonth(s, r);
    s.week += 4;
    if (++s.month > 12) { s.month = 1; s.year++; }
  }
}
const realKey = (s: GameState, k: string): boolean => (k.startsWith('p:') ? isReal(s, k.slice(2)) : k.startsWith('l:') ? !!leaders(s).L[k.slice(2)]?.real : false);

describe('r23 membros do crime', () => {
  it('recrutamento acontece ao longo dos anos num mundo livre (com o porquê)', { timeout: 400000 }, () => {
    const s = createGame(defaultConfig('r23-m1', { startYear: 1985, mode: 'historic', realNames: true }));
    s.config.history = 'loose';
    advanceMonth(s); // o gancho mensal roda sem erro
    months(s, 120, 'm1');
    const M = Object.entries(mem23(s));
    expect(M.length).toBeGreaterThan(0);
    for (const [, m] of M) {
      expect(m.why.length).toBeGreaterThan(0);
      expect(orgs17(s, true).some((o) => o.id === m.o)).toBe(true);
    }
    // gente real, quando entra, fica no máximo no boato
    for (const [k, m] of M) if (realKey(s, k)) expect(m.k).toBeLessThan(2);
  });

  it('modo Vida real exata: nenhuma pessoa/selo real vira membro nem comete crime inventado', { timeout: 400000 }, () => {
    const s = createGame(defaultConfig('r23-m2', { startYear: 1985, mode: 'historic', realNames: true }));
    s.config.history = 'strict';
    const n0 = crime17(s).log.length;
    months(s, 120, 'm2');
    for (const k of Object.keys(mem23(s))) expect(realKey(s, k)).toBe(false);
    for (const e of crime17(s).log.slice(n0)) if (e.actor !== 'player') expect(isReal(s, e.actor)).toBe(false);
    const rp = Object.values(s.persons).find((p) => p.alive && isReal(s, p.id));
    if (rp) expect(recruitOdds(s, `p:${rp.id}`).p).toBe(0);
  });

  it('membros persistem no save (ida e volta em JSON)', () => {
    const s = createGame(defaultConfig('r23-m3', { startYear: 1990 }));
    const o = orgs17(s).find((x) => x.a3 === a3Of(s, s.config.homeCity))!;
    const p = Object.values(s.persons).find((x) => x.alive && !x.isPlayer)!;
    _crimemem23.join(s, `p:${p.id}`, o, [], Rng.fromSeed('j'));
    const raw = JSON.parse(JSON.stringify(s)) as GameState;
    const m = mem23(raw)[`p:${p.id}`];
    expect(m).toBeTruthy();
    expect(m.o).toBe(o.id);
    expect(m.rk).toBe(0);
  });

  it('funcionário seu descoberto como membro vira cartão de decisão (demitir/denunciar/manter)', () => {
    const s = createGame(defaultConfig('r23-m4', { startYear: 1990 }));
    if (!s.player.staff.length) s.player.staff.push(genStaff(s, Rng.fromSeed('st'), 'admin', 50));
    const st = s.player.staff[0];
    const key = `s:${st.id}`;
    const o = orgs17(s).find((x) => x.a3 === a3Of(s, s.config.homeCity))!;
    _crimemem23.join(s, key, o, [], Rng.fromSeed('j2'));
    const d = moleCard23(s, key)!;
    expect(d).toBeTruthy();
    expect(s.decisions.some((x) => x.id === d.id && x.eventId === 'sit17:crime23_mole')).toBe(true);
    expect(d.options.map((x) => x.id)).toEqual(['fire', 'report', 'keep']);
    expect(mem23(s)[key].k).toBe(2);
    expect(resolveDecision(s, d.id, 'report')).toBe(true);
    expect(mem23(s)[key]).toBeUndefined();
    expect(crime17(s).gone23!.at(-1)!.how).toBe('informant');
    expect(crime17(s).pw23![o.id]).toBeLessThan(0);
  });
});
