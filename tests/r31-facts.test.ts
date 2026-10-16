// Masters 31 (onda 0, W0-FACT): registro único de acontecimentos. `emitFact` com `diary`/`notify` gera a entrada do
// diário e o aviso por ouvintes centrais (util.ts) — quem publica faz uma chamada só.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { l } from '../src/data/world';
import { emitFact, factSinks31, recentFacts } from '../src/sim/facts17';
import { attn } from '../src/sim/attention';
import type { GameState } from '../src/sim/types';

const game = (): GameState => createGame(defaultConfig('r31facts', { startYear: 1975 }));
const count = (s: GameState, pt: string) => ({
  diary: s.memory.filter((m) => m.text.pt === pt).length,
  notif: s.notifications.filter((n) => n.text.pt === pt).length,
  attn: attn(s).q.filter((x) => x.title.pt === pt).length,
});

describe('r31 W0-FACT · emitFact com diário e aviso', () => {
  it('os ouvintes centrais estão registrados', () => {
    expect(factSinks31()).toEqual(expect.arrayContaining(['diary', 'notify']));
  });

  it('um fato com diary/notify gera exatamente 1 entrada de diário e 1 aviso', () => {
    const s = game();
    const act = Object.values(s.acts)[0];
    const t = l('Fato de teste r31 com diário e aviso.', 'r31 test fact with diary and notice.');
    const f = emitFact(s, { kind: 'r31_test', actors: [act.id, 'player'], severity: 20, visibility: 'secret', tags: ['r31'], text: t, src: 'r31test', diary: { kind: 'r31d', important: true }, notify: 'bad' });
    expect(count(s, t.pt)).toEqual({ diary: 1, notif: 1, attn: 1 });
    const m = s.memory.find((x) => x.text.pt === t.pt)!;
    expect(m.kind).toBe('r31d');
    expect(m.actId).toBe(act.id); // primeiro ator que é ato
    expect(m.important).toBe(true);
    expect(s.notifications.find((n) => n.text.pt === t.pt)!.kind).toBe('bad');
    const it0 = attn(s).q.find((x) => x.title.pt === t.pt)!;
    expect(it0.prio).toBe(2);
    expect(it0.from).toBe('r31test');
    // as saídas não ficam guardadas no fato (nada a mais no save)
    expect(Object.keys(f)).not.toContain('diary');
    expect(Object.keys(f)).not.toContain('notify');
    expect(recentFacts(s, { kind: 'r31_test' }).length).toBe(1);
  });

  it('formas curtas: diary true / texto próprio; notify true / objeto com campos da fila', () => {
    const s = game();
    const t = l('Outro fato r31.', 'Another r31 fact.');
    const d = l('Texto próprio do diário r31.', 'Own r31 diary text.');
    emitFact(s, { kind: 'r31_test2', actors: ['player'], severity: 10, visibility: 'secret', text: t, diary: true, notify: true });
    expect(count(s, t.pt)).toEqual({ diary: 1, notif: 1, attn: 1 });
    expect(s.memory.find((x) => x.text.pt === t.pt)!.kind).toBe('r31_test2');
    emitFact(s, { kind: 'r31_test3', actors: ['player'], severity: 10, visibility: 'secret', text: t, diary: d, notify: { kind: 'good', cat: 'money', prio: 3, pendId: 'r31:p', dest: { area: 'finance' } } });
    expect(count(s, d.pt).diary).toBe(1);
    expect(attn(s).q.find((x) => x.pendId === 'r31:p')).toMatchObject({ cat: 'money', prio: 3, dest: { area: 'finance' } });
  });

  it('sem diary/notify o fato não escreve diário nem aviso', () => {
    const s = game();
    const t = l('Fato r31 silencioso.', 'Silent r31 fact.');
    emitFact(s, { kind: 'r31_quiet', actors: ['player'], severity: 10, visibility: 'secret', text: t });
    expect(count(s, t.pt)).toEqual({ diary: 0, notif: 0, attn: 0 });
  });
});
