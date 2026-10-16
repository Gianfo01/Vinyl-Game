// r28 F8 (B7/B8): cenas do golpe de NPC, do holograma e da briga de herdeiros no tocador do cut27 — detecção pelos
// fatos reais (agency18, post18/afterlife19), uma vez por janela, escolhas com efeito e quadro pintado.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { emitFact } from '../src/sim/facts17';
import type { Act, GameState } from '../src/sim/types';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { CUT27, choose27, cutModel27, cutOfFact27, scan27 } from '../src/ui/ps/cut27model';
import { BRIDGE27 } from '../src/ui/ps/cut27';
import { rng19 } from '../src/sim/rng19';

const game = (): GameState => { const c = defaultConfig('r28cut', { scenario: 'established', startYear: 1990 } as Parameters<typeof defaultConfig>[1]); (c as { dbSize?: string }).dbSize = 'small'; return createGame(c); };
const myAct = (s: GameState): Act => { const a = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity, fame: 60 }); a.owner = 'player'; return a; };
const npcAct = (s: GameState): Act => Object.values(s.acts).find((a) => a.owner && a.owner !== 'player')!;

describe('r28 F8 — cenas de golpe, holograma e herdeiros', () => {
  it('catálogo e ponte das atividades', () => {
    for (const k of ['coup', 'holo', 'heirs'] as const) { expect(CUT27[k].tier).toBe('major'); expect(CUT27[k].choices.length).toBeGreaterThanOrEqual(3); }
    expect(BRIDGE27.npc_coup).toBe('coup'); expect(BRIDGE27.hologram_tour).toBe('holo'); expect(BRIDGE27.heirs_fight).toBe('heirs');
  });
  it('golpe só quando VOCÊ é o alvo; holograma e herdeiros só de ato seu', () => {
    const s = game(); const a = myAct(s); const n = npcAct(s);
    const ag = (A: string, T: string, kind: 'poach' | 'law' = 'poach') => ({ kind, actors: [A, T], tags: ['bad', 'ag18'], severity: 40, visibility: 'public' as const });
    expect(cutOfFact27(s, ag(n.id, 'player'))).toBe('coup');
    expect(cutOfFact27(s, ag(n.id, a.members[0], 'law'))).toBe('coup');
    expect(cutOfFact27(s, ag('player', n.id))).toBeNull(); // você atacando não é golpe contra você
    expect(cutOfFact27(s, { ...ag(n.id, 'player'), tags: ['bad'] })).toBeNull(); // sem a marca da agency18
    expect(cutOfFact27(s, { kind: 'hologram', actors: [a.id, 'player', a.members[0]], tags: ['posthumous'], severity: 40, visibility: 'public' })).toBe('holo');
    expect(cutOfFact27(s, { kind: 'hologram', actors: [n.id, n.owner!], tags: ['posthumous', 'alt'], severity: 40, visibility: 'public' })).toBeNull();
    expect(cutOfFact27(s, { kind: 'dispute', actors: [a.id], tags: ['posthumous', 'estate', 'law'], severity: 40, visibility: 'public' })).toBe('heirs');
    expect(cutOfFact27(s, { kind: 'estate_suit', actors: [a.id, 'p1'], tags: ['posthumous', 'law', 'heirs'], severity: 40, visibility: 'public' })).toBe('heirs');
    expect(cutOfFact27(s, { kind: 'dispute', actors: [n.id], tags: ['posthumous', 'estate'], severity: 40, visibility: 'public' })).toBeNull();
  });
  it('scan: fato real vira cena com o ato certo; uma por janela; escolha paga pelo livro-razão uma vez', () => {
    const s = game(); const a = myAct(s); const n = npcAct(s);
    scan27(s);
    emitFact(s, { kind: 'poach', actors: [n.id, a.members[0], a.id], severity: 40, visibility: 'rumor', tags: ['bad', 'ag18'], text: l('Um rival tenta levar o seu artista.', 'A rival tries to take your artist.'), src: 'test' });
    const got = scan27(s);
    expect(got.map((d) => d.key)).toEqual(['coup']);
    expect(got[0].actId).toBe(a.id);
    emitFact(s, { kind: 'law', actors: [n.id, 'player'], severity: 40, visibility: 'public', tags: ['law', 'ag18'], text: l('Outro golpe', 'Another coup'), src: 'test' });
    expect(scan27(s)).toEqual([]); // um golpe por trimestre vira cena
    const cash = s.player.cash;
    expect(choose27(s, got[0], 'lawyer')).toBeTruthy();
    expect(s.player.cash).toBeLessThan(cash);
    const c2 = s.player.cash;
    expect(choose27(s, got[0], 'lawyer')).toBeNull();
    expect(s.player.cash).toBe(c2);
    emitFact(s, { kind: 'hologram', actors: [a.id, 'player', a.members[0]], severity: 50, visibility: 'public', tags: ['posthumous', 'holo_tour', 'good'], text: l('Holograma', 'Hologram'), src: 'test' });
    const h = scan27(s);
    expect(h.map((d) => d.key)).toEqual(['holo']);
    expect(h[0].pid).toBe(a.members[0]);
    const m = cutModel27(s, h[0]);
    expect(m.figs.length).toBeGreaterThan(0);
  });
});
