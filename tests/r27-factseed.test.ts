// r27: reações de NPC (npc17) não dependem da numeração global dos fatos. Antes a semente era `f${seq}`: um fato a
// mais de qualquer sistema deslocava os ids seguintes e mudava quem o selo dispensava ou bancava depois de um escândalo.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { emitFact, factSeedKey17 } from '../src/sim/facts17';
import { l } from '../src/data/world';
import { okAct17 } from '../src/sim/sys/npc17';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';

const scandals = (s: GameState, ids: string[]): Record<string, string | null> => {
  for (const id of ids) emitFact(s, { kind: 'scandal', actors: [id], severity: 80, visibility: 'public', text: l(`Escândalo de ${s.acts[id].name}`, `${s.acts[id].name} scandal`), src: 'test' });
  return Object.fromEntries(ids.map((id) => [id, s.acts[id].owner ?? null]));
};

describe('r27 — semente das reações de NPC pelo conteúdo do fato', () => {
  it('a chave não usa o id e muda com o conteúdo', () => {
    const f = { kind: 'scandal' as const, actors: ['a1'], w: 10, text: l('x', 'x') };
    expect(factSeedKey17(f)).toBe(factSeedKey17({ ...f }));
    expect(factSeedKey17(f)).not.toBe(factSeedKey17({ ...f, text: l('y', 'y') }));
    expect(factSeedKey17(f)).not.toContain('f1');
  });
  it('um fato extra sem relação não muda quem o selo NPC dispensa ou banca', () => {
    const mk = () => createGame(defaultConfig('r27-factseed', { startYear: 1985 }));
    const a = mk(), b = mk();
    const ids = Object.values(a.acts).filter((x) => okAct17(a, x) && !!x.owner && !!a.labels[x.owner]).slice(0, 12).map((x) => x.id);
    expect(ids.length).toBeGreaterThan(4);
    // em b, outro sistema emite um fato a mais antes (desloca o contador global de ids)
    emitFact(b, { kind: 'hire', actors: ['player'], severity: 10, visibility: 'public', text: l('Contratação sem relação', 'Unrelated hire'), src: 'test' });
    const ra = scandals(a, ids), rb = scandals(b, ids);
    expect(rb).toEqual(ra);
  });
});
