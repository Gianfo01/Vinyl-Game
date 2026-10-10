// Rodada 17 (D) — imprensa viva: notícias/boatos com origem e alcance, veículos por era, críticos reais,
// ações do jogador (plantar, responder), situação de crítica e motivos de hype variados. Determinismo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { activeCritics } from '../src/sim/media';
import { outletsIn } from '../src/sim/outlets17';
import { momentumParts17 } from '../src/sim/hype17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { feed17, m17, outlets17, plantOdds, plantRumor, respond, respondOdds, TPL17 } from '../src/sim/sys/media17';
import { hypeOf } from '../src/sim/sys/hype12';
import { playerActs } from '../src/sim/util';
import type { GameState } from '../src/sim/types';

const run = (s: GameState, n: number) => { for (let i = 0; i < n; i++) advanceMonth(s); };

describe('r17 mídia', () => {
  it('veículos e críticos respeitam a era', () => {
    const ids = (y: number) => outletsIn(y).map((o) => o.id);
    expect(ids(1955)).not.toContain('twitter');
    expect(ids(2012)).toContain('twitter');
    expect(ids(2012)).not.toContain('newsworld'); // fechou em 2011
    const s = createGame(defaultConfig('r17-m0', { startYear: 1975 }));
    const names = activeCritics(s).map((c) => c.name);
    expect(names).toContain('Lester Bangs');
    expect(names).not.toContain('Anthony Fantano');
  });

  it('notícias e boatos nascem com origem e alcance, mais para os famosos; determinístico', () => {
    const mk = () => { const s = createGame(defaultConfig('r17-m1', { startYear: 1985 })); run(s, 10); return s; };
    const s = mk(), s2 = mk();
    const st = m17(s);
    expect(st.st.length).toBeGreaterThan(3);
    expect(st.st.length).toBe(m17(s2).st.length);
    const ol = new Set(outlets17(s).map((o) => o.id));
    for (const x of st.st.slice(0, 20)) { expect(ol.has(x.out)).toBe(true); expect(x.reach.length).toBeGreaterThan(0); }
    const fameOf = (id?: string) => (id ? s.acts[id]?.fame ?? 0 : 0);
    const avg = st.st.reduce((t, x) => t + fameOf(x.a), 0) / st.st.length;
    const world = Object.values(s.acts).filter((a) => a.status === 'active').reduce((t, a, _i, arr) => t + a.fame / arr.length, 0);
    expect(avg).toBeGreaterThan(world);
  });

  it('jogador planta boato e responde a boato sobre o próprio artista', () => {
    const s = createGame(defaultConfig('r17-m2', { startYear: 1990 }));
    s.player.cash += 10_000_000;
    const npc = Object.values(s.acts).filter((a) => a.owner !== 'player' && a.status === 'active').sort((a, b) => b.fame - a.fame)[0];
    const tab = outlets17(s).find((o) => o.line === 'tabloid')!;
    const od = plantOdds(s, npc.id, 'diva', tab.id);
    expect(od.ok).toBe(true);
    expect(od.cost).toBeGreaterThan(0);
    expect(plantRumor(s, npc.id, 'diva', tab.id).ok).toBe(true);
    expect(plantOdds(s, npc.id, 'diva', tab.id).ok).toBe(false); // recarga
    const mine = playerActs(s)[0];
    if (mine) {
      let res = plantRumor(s, mine, 'deathhoax', tab.id);
      for (let i = 0; i < 6 && !feed17(s, { act: mine, open: true }).length; i++) { s.week += 9; res = plantRumor(s, mine, 'deathhoax', tab.id); }
      expect(res.ok).toBe(true);
      const sto = feed17(s, { act: mine, open: true })[0];
      if (sto) {
        expect(respondOdds(s, sto.id, 'confirm').ok).toBe(false); // boato de morte é falso
        expect(respond(s, sto.id, 'deny').ok).toBe(true);
        expect(sto.resp).toBe('deny');
      }
    }
    expect(TPL17.every((t) => t.name.pt && t.t.en)).toBe(true);
  });

  it('hype: motivos variam por ato (não é mais o mesmo texto/valor para todos)', () => {
    const s = createGame(defaultConfig('r17-m3', { startYear: 1995 }));
    run(s, 6);
    const acts = Object.values(s.acts).filter((a) => a.status === 'active' && a.momentum >= 60).slice(0, 12);
    const tops = acts.map((a) => momentumParts17(s, a, Math.max(1, (a.momentum - 45) * 0.4))[0]);
    expect(new Set(tops.map((x) => x.t.pt)).size).toBeGreaterThan(Math.min(2, acts.length - 1));
    const parts = acts.map((a) => hypeOf(s, `a:${a.id}`).parts.map((p) => p.t.pt)).flat();
    expect(parts.filter((t) => t.startsWith('Momento recente')).length).toBe(0);
  });
});
