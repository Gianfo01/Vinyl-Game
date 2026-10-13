// r27 (LIN) — formação real na data inicial: quem está na banda é quem tem a passagem cobrindo o ano/mês de início; quem
// saiu antes vira ex-integrante; entradas/saídas futuras da formação de identidade são agendadas no mês documentado.
// Também: ato real não surge antes da formação real (Hendrix Experience), funções múltiplas e o selo "Integrantes".
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { applyWorld17 } from '../src/sim/start17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { realDataOf, rw } from '../src/sim/sys/realworld';
import { roleLine27, rolesOf27 } from '../src/sim/sys/roles27';
import { catCount17 } from '../src/ui/popcat17';
import type { Act, GameState } from '../src/sim/types';

const game = (world: string, year: number, seed = 'r27-lineup') => {
  const c = defaultConfig(seed, { startYear: year, homeCity: 'london' });
  applyWorld17(c, world);
  const s = createGame(c);
  s.flags.sandbox = 1; // o teste é das formações, não da saúde financeira do selo sem jogador (advanceMonth para se acabar)
  return s;
};
const actOf = (s: GameState, n: string): Act | undefined => Object.values(s.acts).find((a) => realDataOf(a)?.n === n);
const names = (s: GameState, a: Act) => a.members.map((id) => s.persons[id]?.name);
const formerNames = (s: GameState, a: Act) => (rw(s).former[a.id] ?? []).map((f) => s.persons[f.personId]?.name);
const person = (s: GameState, n: string) => Object.values(s.persons).find((p) => p.name === n)!;

describe('r27 LIN: Beatles em 1962', () => {
  it('jan/1962: John, Paul, George e Pete Best; Stuart é ex-integrante; Ringo entra em agosto no lugar de Pete', () => {
    const s = game('exact', 1962);
    const b = actOf(s, 'The Beatles')!;
    expect(b).toBeTruthy();
    expect(names(s, b).sort()).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Pete Best']);
    expect(formerNames(s, b)).toEqual(['Stuart Sutcliffe']);
    expect(rw(s).sched.filter((e) => e.actId === b.id && (e.kind === 'join' || e.kind === 'leave')).map((e) => [e.kind, e.year, e.mo])).toEqual(
      expect.arrayContaining([['join', 1962, 7], ['leave', 1962, 7]]));
    while (s.year === 1962 && s.month < 6) advanceMonth(s);
    expect(names(s, b)).toContain('Pete Best'); // julho: ainda o Pete
    while (s.year < 1963) advanceMonth(s);
    expect(names(s, b).sort()).toEqual(['George Harrison', 'John Lennon', 'Paul McCartney', 'Ringo Starr']);
    expect(formerNames(s, b).sort()).toEqual(['Pete Best', 'Stuart Sutcliffe']);
    expect(b.members).toHaveLength(4);
    // selo da categoria "Integrantes" = integrantes atuais (não o número de abas Integrantes + Formação)
    expect(catCount17([{ id: 'members', count: b.members.length }, { id: 'lineup16' }])).toBe(4);
    expect(catCount17([{ id: 'disco' }, { id: 'songs' }])).toBe(2);
  });

  it('mundo aleatório (padrão): ninguém de outra época como atual; Ringo agendado; mesma regra em 1975', () => {
    let checked = 0;
    for (const seed of ['r27l-a', 'r27l-b', 'r27l-c', 'r27l-d', 'r27l-e', 'r27l-f']) {
      const s = game('random', 1962, seed);
      const b = actOf(s, 'The Beatles');
      if (!b || b.debutYear !== 1962) continue; // presença e ano de estreia são sorteados no mundo aleatório
      checked++;
      expect(names(s, b)).toHaveLength(4);
      expect(names(s, b)).not.toContain('Ringo Starr');
      expect(names(s, b)).not.toContain('Stuart Sutcliffe');
      expect(formerNames(s, b)).toContain('Stuart Sutcliffe');
      expect(rw(s).sched.some((e) => e.actId === b.id && e.kind === 'join' && e.m?.[0] === 'Ringo Starr' && e.lin === 1)).toBe(true);
      for (let i = 0; i < 12; i++) advanceMonth(s); // a limpeza de saves antigos não apaga a formação de identidade
      if (b.status === 'active' || b.status === 'emerging') expect(names(s, b)).toContain('Ringo Starr');
    }
    expect(checked).toBeGreaterThan(0);
    const s = game('random', 1975, 'r27l-75');
    const st = actOf(s, 'The Rolling Stones');
    if (st && (st.status === 'active' || st.status === 'emerging') && st.debutYear === 1963) {
      expect(names(s, st)).not.toContain('Brian Jones');
      expect(names(s, st)).not.toContain('Mick Taylor');
    }
  });
});

describe('r27 LIN: Hendrix Experience só depois da formação (1966)', () => {
  it('não aparece em 1964–65 (antes surgia 2 anos antes da estreia, com Mitch Mitchell de 16 anos)', () => {
    const s = game('exact', 1964);
    const seen: number[] = [];
    while (s.year < 1967) {
      advanceMonth(s);
      if (actOf(s, 'The Jimi Hendrix Experience')) seen.push(s.year);
    }
    expect(seen.length).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(1966);
    const a = actOf(s, 'The Jimi Hendrix Experience')!;
    expect(a.formed).toBeGreaterThanOrEqual(1966);
    const mitch = a.members.map((id) => s.persons[id]).find((p) => p.name === 'Mitch Mitchell')!;
    expect(s.year - mitch.born).toBeGreaterThanOrEqual(20);
  });
});

describe('r27 LIN: várias funções por integrante', () => {
  it('Hendrix guitarra · vocal; McCartney baixo · vocal; Phil Collins canta só a partir de 1975', () => {
    const s = game('exact', 1969);
    const jimi = person(s, 'Jimi Hendrix'), paul = person(s, 'Paul McCartney');
    expect(rolesOf27(s, jimi)).toEqual(['guitar', 'vocal']);
    expect(roleLine27(s, jimi)).toEqual({ pt: 'Guitarra · Vocal', en: 'Guitar · Vocals' });
    expect(rolesOf27(s, paul).slice(0, 2)).toEqual(['bass', 'vocal']);
    expect(roleLine27(s, paul, 2).pt).toBe('Baixo · Vocal');
    expect(jimi.role).toBe('guitar'); // a função principal (a que a simulação usa) não muda
    // [função, ano]: Phil Collins é baterista; vocal só desde 1975
    const phil = { role: 'drums' as const, name: 'Phil Collins', roles27: undefined };
    expect(rolesOf27({ ...s, year: 1971 } as GameState, phil)).toEqual(['drums']);
    expect(rolesOf27({ ...s, year: 1980 } as GameState, phil)).toEqual(['drums', 'vocal']);
    // saves antigos sem o campo caem na tabela pelo nome; modo ficcional sem nome real e sem campo = só a principal
    const old = { ...jimi, roles27: undefined };
    expect(rolesOf27(s, old)).toEqual(['guitar', 'vocal']);
    expect(rolesOf27({ ...s, config: { ...s.config, realNames: false } } as GameState, old)).toEqual(['guitar']);
  });
});
