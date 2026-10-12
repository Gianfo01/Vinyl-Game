// Rodada 27 (C1) — auditoria dos personagens existentes (src/data/audit27.ts, kin27.ts, new27c1.ts): amostra das correções.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { kinOf15 } from '../src/sim/sys/kin15';
import { dedupKey27, REAL_ALL, realSongs22 } from '../src/sim/sys/realworld';
import { REAL_CLASSIC } from '../src/data/realacts_classic';
import { REAL_ACTS } from '../src/data/realnames';
import { COUNTRY_INFO19 } from '../src/data/countries19';
import { DEATHS27 } from '../src/data/audit27';
import { REAL_PRODS } from '../src/data/producers15';
import type { RealArtist, RealMember } from '../src/data/realtypes';
import type { Act, GameState } from '../src/sim/types';

const ra = (n: string): RealArtist => { const a = REAL_ALL.find((x) => x.n === n); if (!a) throw new Error(n); return a; };
const cl = (n: string) => { const no = Object.entries(REAL_ACTS).find(([, a]) => a.name === n)?.[0]; if (!no) throw new Error(n); return REAL_CLASSIC[+no]; };
const mem = (m: RealMember[] | undefined, n: string) => (m ?? []).filter((x) => x[0] === n);

describe('r27 auditoria: dados', () => {
  it('sem duplicatas: nenhum nome repetido em REAL_ALL nem com o catálogo clássico ("The X" = "X", "&" = "and")', () => {
    const seen = new Map<string, string>();
    for (const n of [...Object.values(REAL_ACTS).map((a) => a.name), ...REAL_ALL.map((a) => a.n)]) {
      const k = dedupKey27(n);
      expect(seen.get(k), `${n} × ${seen.get(k)}`).toBeUndefined();
      seen.set(k, n);
    }
    // as cópias unificadas continuam achando as músicas pelo nome alternativo
    expect(realSongs22({ catalogNo: 1000 + REAL_ALL.indexOf(ra('The Carpenters')) } as Act).length).toBeGreaterThan(0);
  });

  it('mortes erradas corrigidas: Kreutzmann vivo, Aston Barrett 2024, Gurianov 2013', () => {
    const gd = ra('Grateful Dead');
    expect(mem(gd.m, 'Bill Kreutzmann')[0][3]).toBeUndefined();
    expect(mem(ra('The Wailers').m, 'Aston Barrett')[0][3]).toBe(2024);
    expect(mem(cl('Bob Marley & The Wailers').m, 'Aston Barrett')[0][3]).toBe(2024);
    expect(mem(ra('Kino').m, 'Georgy Guryanov')[0][3]).toBe(2013);
  });

  it('mortes 2025–2026 em todas as cópias (solo e integrante)', () => {
    expect(mem(ra('Grateful Dead').m, 'Bob Weir')[0][3]).toBe(2026);
    expect(ra('Dolly Parton').x).toBe(2026);
    expect(ra('Dolly Parton').e).toBe(2026);
    expect(mem(ra('The Stone Roses').m, 'Mani')[0][3]).toBe(2025);
    for (const [n, y] of Object.entries(DEATHS27)) {
      for (const a of REAL_ALL) {
        if (a.n === n && !a.m?.length) expect(a.x, n).toBe(y);
        for (const m of mem(a.m, n)) expect(m[3], `${n} @ ${a.n}`).toBe(y);
      }
    }
  });

  it('voltas, fim, país e formação', () => {
    expect(cl('Oasis').rj?.[0][0]).toBe(2024);
    expect(ra('Jonas Brothers').rj?.[0][0]).toBe(2019);
    expect(ra('Alice in Chains').e).toBeUndefined();
    for (const n of ['Leslie Cheung', 'Anita Mui', 'Jacky Cheung', 'Andy Lau', 'Eason Chan', 'Beyond']) expect(ra(n).cn, n).toBe('HKG');
    expect(COUNTRY_INFO19.some((c) => c.a3 === 'HKG')).toBe(true);
    expect(REAL_ALL.filter((a) => a.n === 'Nicki Minaj')).toHaveLength(1);
    expect(ra('The Doors').f).toBe(1965);
    expect(ra('5 Seconds of Summer').d).toBe(2012);
  });

  it('Titãs e outras saídas marcadas; integrantes que faltavam', () => {
    const t = ra('Titãs').m!;
    const left = (n: string) => mem(t, n)[0][5];
    expect([left('Arnaldo Antunes'), left('Nando Reis'), left('Charles Gavin'), left('Paulo Miklos')]).toEqual([1992, 2002, 2010, 2016]);
    expect(mem(ra('Little Mix').m, 'Jesy Nelson')[0][5]).toBe(2020);
    expect(mem(ra('Linkin Park').m, 'Rob Bourdon')[0][5]).toBe(2017);
    expect(mem(ra('EXO').m, 'Chen')[0][5]).toBe(2024);
    expect(mem(ra('Grateful Dead').m, 'Donna Jean Godchaux')[0]).toEqual(['Donna Jean Godchaux', 'vocal', 1947, 2025, 1972, 1979]);
    expect(mem(cl('Fleetwood Mac').m, 'Bob Welch')).toHaveLength(1);
    expect(mem(ra('Red Hot Chili Peppers').m, 'John Frusciante')).toHaveLength(1); // r27 (F): uma linha, três passagens
    expect(mem(ra('Red Hot Chili Peppers').m, 'John Frusciante')[0][6]).toHaveLength(3);
    // colaboradores fora da formação
    expect(mem(cl('Dr. Dre').m, 'Snoop Dogg')).toHaveLength(0);
    expect(mem(cl('Luiz Gonzaga').m, 'Zé Dantas')).toHaveLength(0);
    expect(mem(ra('Gorillaz').m, 'Jamie Hewlett')).toHaveLength(0);
  });

  it('arquivo 1–2: Tom Capone, Beatles, Nara, 3T', () => {
    const cap = REAL_PRODS.find((p) => p.id === 'capone')!;
    expect([cap.born, cap.died, cap.to]).toEqual([1966, 2004, 2004]);
    expect(cap.w.some((w) => w[1] === 'Charlie Brown Jr.')).toBe(false);
    expect(REAL_PRODS.find((p) => p.id === 'bonadio')!.w.some((w) => w[0] === 'Transpiração Contínua Prolongada')).toBe(true);
    const beatles = cl('The Beatles').al!.map((r) => r[0]);
    for (const x of ['With the Beatles', 'Beatles for Sale', 'Help!', 'Let It Be']) expect(beatles).toContain(x);
    expect(ra('Nara Leão').al!.some((r) => r[0] === 'Os Meus Amigos São um Barato' && r[1] === 1977)).toBe(true);
    const t3 = ra('3T');
    expect(t3.ap).toEqual(['f']); // r27 (F): formação aproximada (1994); estreia em disco 1995 confirmada — continua no modo exato
    expect(t3.m!.map((m) => m[0])).toEqual(['Taj Jackson', 'Taryll Jackson', 'TJ Jackson']);
  });
});

describe('r27 auditoria: família no jogo', () => {
  const who = (s: GameState, n: string) => Object.values(s.persons).find((p) => p.name === n);
  const rel = (s: GameState, a: string, b: string) => { const A = who(s, a), B = who(s, b); return A && B ? kinOf15(s, A.id).find((k) => k.id === B.id)?.rel : undefined; };

  it('Michael Jackson: irmãos; Tito é PAI de Taj, Taryll e TJ (3T), que são irmãos', { timeout: 240000 }, () => {
    const s = createGame(defaultConfig('r27-kin', { startYear: 1999, realNames: true, dbSize: 'large', mode: 'historic' })); // r27 (F): no modo livre 8% dos atos somem por sorteio
    expect(rel(s, 'Janet Jackson', 'Michael Jackson')).toBe('sibling');
    for (const k of ['Taj Jackson', 'Taryll Jackson', 'TJ Jackson']) {
      expect(who(s, k), k).toBeTruthy();
      expect(rel(s, k, 'Tito Jackson'), k).toBe('parent');
    }
    expect(rel(s, 'Taj Jackson', 'TJ Jackson')).toBe('sibling');
    expect(rel(s, 'Taj Jackson', 'Michael Jackson')).toBe('uncle');
  });
});
