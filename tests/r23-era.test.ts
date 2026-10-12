// r23: gênero da época (pioneiro), nota de origem gênero × cidade, formato com data alternativa, contadores e interrupções.
import { describe, expect, it } from 'vitest';
import { eraGenre23, cityGenreFit23, originNote23, formatArrival23 } from '../src/sim/genre23';
import { badge23, allClear23 } from '../src/sim/counters23';
import { interruptOf23, shouldInterrupt23 } from '../src/sim/interrupt23';
import { genreById } from '../src/data/world';

describe('r23 gênero da época', () => {
  it('Psicodelia em 1962 aparece como gênero-pai já nascido, com "pioneiro"', () => {
    const e = eraGenre23('psychedelic', 1962);
    expect(e.pioneer).toBe(true);
    expect(e.real).toBe('psychedelic');
    expect(e.id).not.toBe('psychedelic');
    expect(genreById[e.id].born).toBeLessThanOrEqual(1962);
  });
  it('Outlaw country em 1962 vira honky-tonk; em 1975 fica outlaw', () => {
    expect(eraGenre23('outlaw', 1962)).toEqual({ id: 'honky_tonk', pioneer: true, real: 'outlaw' });
    expect(eraGenre23('outlaw', 1975)).toEqual({ id: 'outlaw', pioneer: false, real: 'outlaw' });
  });
  it('gênero desconhecido passa direto', () => {
    expect(eraGenre23('nao_existe', 1950).pioneer).toBe(false);
  });
});

describe('r23 gênero × cidade', () => {
  it('ranchera em Odessa não combina e leva "diáspora mexicana"; na Cidade do México combina', () => {
    expect(cityGenreFit23('odesa', 'ranchera')).toBe(false);
    expect(originNote23('ranchera').pt).toBe('diáspora mexicana');
    expect(cityGenreFit23('mexico_city', 'ranchera')).toBe(true);
  });
  it('kayōkyoku em Vancouver não combina; rock combina em qualquer lugar', () => {
    expect(cityGenreFit23('vancouver', 'kayokyoku')).toBe(false);
    expect(originNote23('kayokyoku').pt).toContain('nipo');
    expect(cityGenreFit23('vancouver', 'psychedelic')).toBe(true);
  });
  it('formato: nota só quando a data desta história difere da real', () => {
    expect(formatArrival23({ cassette: 1961 }, 'cassette')).toEqual({ here: 1961, real: 1964 });
    expect(formatArrival23({ cassette: 1964 }, 'cassette')).toBeNull();
    expect(formatArrival23({}, 'airplay')).toBeNull();
  });
});

describe('r23 contadores', () => {
  it('"Nada exige você agora" (tom good) não conta', () => {
    const qs = [{ tone: 'good' }];
    expect(allClear23(qs)).toBe(true);
    expect(badge23(qs)).toEqual({ n: 0, dot: false });
  });
  it('só informação = ponto neutro, sem número', () => {
    expect(badge23([{ tone: 'info' }, { tone: 'good' }])).toEqual({ n: 0, dot: true });
  });
  it('problemas reais contam', () => {
    expect(badge23([{ tone: 'bad' }, { tone: 'info' }, { tone: 'bad' }])).toEqual({ n: 2, dot: false });
    expect(allClear23([{ tone: 'bad' }])).toBe(false);
  });
});

describe('r23 interrupções', () => {
  it('classes padrão e sobreposição por cena', () => {
    expect(interruptOf23({ kind: 'review', data: {} })).toBe('never');
    expect(interruptOf23({ kind: 'fair', data: {} })).toBe('never');
    expect(interruptOf23({ kind: 'awards', data: {} })).toBe('milestone');
    expect(interruptOf23({ kind: 'people_succession', data: {} })).toBe('always');
    expect(interruptOf23({ kind: 'scene17', data: { int23: 'always' } })).toBe('always');
    expect(interruptOf23({ kind: 'desconhecida', data: {} })).toBe('milestone');
  });
  it('preferência: só decisões / marcos também / tudo', () => {
    expect(shouldInterrupt23('always', 'decisions')).toBe(true);
    expect(shouldInterrupt23('milestone', 'decisions')).toBe(false);
    expect(shouldInterrupt23('milestone', 'milestones')).toBe(true);
    expect(shouldInterrupt23('never', 'milestones')).toBe(false);
    expect(shouldInterrupt23('never', 'all')).toBe(true);
  });
});
