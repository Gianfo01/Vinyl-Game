// Rodada 25 — parentesco real ampliado (src/data/kin25.ts: Gilsons/Gil e outras famílias) e formações completas
// (formação clássica fora do modo exato + src/data/lineups25.ts).
import { describe, expect, it } from 'vitest';
import { applyWorld17, newRunConfig20 } from '../src/sim/start17';
import { createGame } from '../src/sim/worldgen';
import { kinOf15, type Rel15 } from '../src/sim/sys/kin15';
import { canonKey, classicLineup25, realDataOf, REAL_ALL } from '../src/sim/sys/realworld';
import { KIN25 } from '../src/data/kin25';
import { REAL_CLASSIC } from '../src/data/realacts_classic';
import { REAL_ACTS } from '../src/data/realnames';
import type { GameState } from '../src/sim/types';

const game = (world: 'random' | 'exact', year: number, db: 'small' | 'large' | 'huge', seed = `r25-${year}`) => {
  const c = newRunConfig20({ seed, companyName: 'Selo' });
  applyWorld17(c, world); c.startYear = year; c.dbSize = db;
  return createGame(c);
};
const who = (s: GameState, n: string) => Object.values(s.persons).find((p) => p.name === n);
const rel = (s: GameState, a: string, b: string): Rel15 | undefined => { const A = who(s, a), B = who(s, b); return A && B ? kinOf15(s, A.id).find((k) => k.id === B.id)?.rel : undefined; };

describe('r25 parentesco real', () => {
  it('Gilsons: José é filho de Gilberto Gil; Francisco e João são netos, primos e sobrinhos de José', () => {
    const s = game('exact', 2021, 'large');
    for (const n of ['Gilberto Gil', 'José Gil', 'Francisco Gil', 'João Gil']) expect(who(s, n), n).toBeTruthy();
    expect(rel(s, 'José Gil', 'Gilberto Gil')).toBe('parent');
    expect(rel(s, 'Gilberto Gil', 'José Gil')).toBe('child');
    expect(rel(s, 'Francisco Gil', 'Gilberto Gil')).toBe('grandparent');
    expect(rel(s, 'Gilberto Gil', 'João Gil')).toBe('grandchild');
    expect(rel(s, 'Francisco Gil', 'João Gil')).toBe('cousin');
    expect(rel(s, 'João Gil', 'Francisco Gil')).toBe('cousin');
    expect(rel(s, 'Francisco Gil', 'José Gil')).toBe('uncle');
    expect(rel(s, 'José Gil', 'João Gil')).toBe('nephew');
    if (who(s, 'Preta Gil')) { expect(rel(s, 'Francisco Gil', 'Preta Gil')).toBe('parent'); expect(rel(s, 'José Gil', 'Preta Gil')).toBe('sibling'); }
  });

  it('kin25 só cita nomes do banco (ou parentes documentados ausentes) e é determinístico', () => {
    const names = new Set<string>();
    for (const a of REAL_ALL) { names.add(canonKey(a.n)); for (const m of a.m ?? []) names.add(canonKey(m[0])); }
    for (const [no, ex] of Object.entries(REAL_CLASSIC)) { names.add(canonKey(REAL_ACTS[+no]?.name ?? '')); for (const m of ex.m ?? []) names.add(canonKey(m[0])); }
    const absent = [...new Set(KIN25.flatMap(([a, , b]) => [a, b]))].filter((n) => !names.has(canonKey(n)));
    expect(absent).toEqual(['Nara Gil']);
    const a = game('exact', 1985, 'small', 'r25-det'), b = game('exact', 1985, 'small', 'r25-det');
    const dump = (s: GameState) => JSON.stringify(Object.keys(s.persons).sort().map((id) => kinOf15(s, id).map((k) => `${k.id}:${k.rel}`)));
    expect(dump(a)).toBe(dump(b));
    expect(rel(a, 'Gary Kemp', 'Martin Kemp')).toBe('sibling');
  });
});

describe('r25 formações', () => {
  it('formação clássica: banda que cresceu depois da estreia não fica presa à formação de estreia', () => {
    const ewf = REAL_ALL.find((a) => a.n === 'Earth, Wind & Fire')!;
    expect(classicLineup25(ewf.m!, ewf.d)?.size).toBe(5);
    expect(classicLineup25(REAL_ALL.find((a) => a.n === 'Coldplay')!.m!, 1998)).toBeUndefined();
    for (const [w, y] of [['random', 1975], ['random', 2005]] as const) {
      const s = game(w, y, 'small');
      const short: string[] = [];
      let seen = 0;
      for (const a of Object.values(s.acts)) {
        const d = realDataOf(a);
        if (!d?.m?.length || a.status === 'split' || a.status === 'retired') continue;
        const c = classicLineup25(d.m, d.d ?? a.debutYear);
        if (!c) continue;
        seen++;
        if (a.members.length < c.size) short.push(`${a.name} ${a.members.length}/${c.size}`);
      }
      expect(seen).toBeGreaterThan(0);
      expect(short).toEqual([]);
    }
  });

  it('formações completadas nos dados (lineups25)', () => {
    const m = (n: string) => REAL_ALL.find((a) => a.n === n)?.m?.length ?? 0;
    expect(m('Slipknot')).toBe(9);
    expect(m('NX Zero')).toBe(5);
    expect(m('CPM 22')).toBe(5);
    expect(m('Maroon 5')).toBe(8);
    const s = game('exact', 2021, 'small');
    const m5 = Object.values(s.acts).find((a) => a.name === 'Maroon 5');
    if (m5) expect(m5.members.length).toBe(6); // Adam, Jesse, James, Matt Flynn, PJ Morton, Sam Farrar
  });
});
