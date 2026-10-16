// R31 · onda 4 (X) — teste de varredura do interruptor "Nomes e obras reais": com a exibição desligada nenhum nome real
// escapa (atos reais, integrantes, discos, selos, festivais, veículos, bandas de ficção, cenários); toda fonte de nome
// real tem homenagem; a família Fossati nunca é trocada; ligar de novo devolve o nome real ao ato nascido inventado.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { REALNAMES31 } from '../src/data/realnames31';
import { FICTION31 } from '../src/data/fiction31';
import { CUR31 } from '../src/data/cur31';
import { POP31 } from '../src/data/pop31';
import { homage31 } from '../src/data/homage31';
import { disp31, setDisplay31 } from '../src/data/realdisp31';
import { allRealNames31, realPairsOff31, realShown31, setRealShown31, syncRealShow31 } from '../src/sim/r31/realshow31';
import { REAL_ALL, realDataOf } from '../src/sim/sys/realworld';
import { REAL_ACTS } from '../src/data/realnames';
import type { GameState } from '../src/sim/types';

const words = (s: string, w: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(s);

describe('X · varredura de nomes reais', () => {
  it('homenagem determinística e diferente do nome real', () => {
    for (const n of ['The Beatles', 'Elvis Presley', 'U2', 'ABBA', 'Os Mutantes']) {
      expect(homage31(n)).toBe(homage31(n));
      expect(homage31(n)).not.toBe(n);
    }
  });

  it('toda fonte de nome real tem homenagem (registro + bases)', () => {
    const all = new Set(allRealNames31());
    const missing: string[] = [];
    for (const r of Object.values(REALNAMES31)) if (!all.has(r.real)) missing.push(r.real);
    for (const a of REAL_ALL) { if (!all.has(a.n)) missing.push(a.n); for (const m of a.m ?? []) if (!all.has(m[0])) missing.push(m[0]); }
    for (const a of Object.values(REAL_ACTS)) if (!all.has(a.name)) missing.push(a.name);
    for (const f of FICTION31) { if (!all.has(f.n)) missing.push(f.n); for (const m of f.m) if (!all.has(m)) missing.push(m); }
    for (const p of POP31) for (const [r] of p.refs) if (!all.has(r)) missing.push(r);
    for (const c of CUR31) if ((c.area === 'artista' || c.area === 'ficcao' || c.area === 'marca' || c.area === 'tv') && !all.has(c.nome)) missing.push(c.nome);
    expect(missing).toEqual([]);
  });

  it('homenagem nunca contém o nome real inteiro (registro e tabela)', () => {
    const bad: string[] = [];
    for (const [id, r] of Object.entries(REALNAMES31)) if (words(r.substituto, r.real)) bad.push(id);
    for (const [a, b] of realPairsOff31().names) if (words(b, a)) bad.push(a);
    expect(bad).toEqual([]);
  });

  it('família Fossati nunca é trocada', () => {
    const p = realPairsOff31();
    setDisplay31(p.names, p.titles);
    for (const n of ['Efro Fossati', 'Lucia Fossati', 'Sonia Fossati', 'Antonella Fossati', 'Para Efro, Lucia, Antonella e Sonia']) expect(disp31(n)).toBe(n);
    setDisplay31([], []);
  });

  for (const year of [1965, 2005]) {
    it(`partida com nomes reais (${year}) e exibição desligada: nenhum ato, integrante ou disco real aparece`, () => {
      const s: GameState = createGame(defaultConfig(`x31-${year}`, { startYear: year, realNames: true }));
      for (let i = 0; i < 3; i++) advanceMonth(s);
      expect(realShown31(s)).toBe(true);
      setRealShown31(s, false);
      expect(realShown31(s)).toBe(false);
      const names = realPairsOff31().names.map(([a]) => a);
      const leaks: string[] = [];
      let checked = 0;
      for (const a of Object.values(s.acts)) {
        const real = a.catalogNo ? (realDataOf(a)?.n ?? REAL_ACTS[a.catalogNo]?.name) : undefined;
        if (!real || a.name !== real) continue;
        checked++;
        const shown = disp31(a.name);
        if (shown === real) leaks.push(`ato ${real}`);
        for (const pid of a.members) {
          const pn = s.persons[pid]?.name;
          if (pn && disp31(pn) === pn && names.includes(pn)) leaks.push(`integrante ${pn}`);
        }
      }
      for (const r of Object.values(s.releases)) {
        const a = s.acts[r.actId];
        if (!a?.catalogNo) continue;
        const shown = disp31(r.title);
        const realAct = realDataOf(a);
        if (realAct?.al?.some((x) => x[0] === r.title) && shown === r.title) leaks.push(`disco ${r.title}`);
      }
      // frase com nomes reais em qualquer ponto
      const sample = names.slice(0, 400);
      for (const n of sample) { const out = disp31(`Hoje, ${n} lançou um disco.`); if (words(out, n)) leaks.push(`frase ${n}`); }
      expect(checked).toBeGreaterThan(5);
      expect(leaks.slice(0, 20)).toEqual([]);
      setRealShown31(s, true);
      expect(disp31('The Beatles')).toBe('The Beatles');
    });
  }

  it('partida com nomes inventados: ligar a exibição devolve o nome real ao ato', () => {
    const s: GameState = createGame(defaultConfig('x31-fic', { startYear: 1970, realNames: false }));
    advanceMonth(s);
    setRealShown31(s, true);
    const a = Object.values(s.acts).find((x) => x.catalogNo && realDataOf(x) && realDataOf(x)!.n !== x.name);
    expect(a).toBeTruthy();
    expect(disp31(a!.name)).toBe(realDataOf(a!)!.n);
    setRealShown31(s, false);
    syncRealShow31(s);
    expect(disp31(a!.name)).toBe(a!.name);
    setDisplay31([], []);
  });
});
