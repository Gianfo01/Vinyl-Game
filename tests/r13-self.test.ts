// Rodada 13: o artista do jogador é o próprio personagem — sem opiniões geradas nem "afinidade com você".
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { opinionsOf } from '../src/sim/sys/bonds9';
import { playerPerson } from '../src/sim/sys/life';
import '../src/sim/sys';

describe('r13 personagem = artista', () => {
  it('o líder da banda do jogador é o personagem e não tem opiniões geradas', () => {
    const s = createGame(defaultConfig('self13', { startYear: 1975, role: 'artist', bandName: 'Eu Mesmo' }));
    const p = playerPerson(s)!;
    const band = s.acts[s.player.bandActId!];
    expect(band.members).toContain(p.id);
    expect(p.isPlayer).toBe(true);
    const op = opinionsOf(s, p.id);
    expect(op.top.length + op.low.length).toBe(0);
  });
});
