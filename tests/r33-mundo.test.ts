// R33 · MUNDO — crises reais, censura e memes/bolhas atrás de exp33.* (desligados). Poucos casos, sem jogo longo.
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { applyMods, runSimHooks } from '../src/sim/ext4';
import { emitFact } from '../src/sim/facts17';
import { setSw } from '../src/sim/r31/switches';
import { CRISES33, SW_CENSURA33, SW_CRISE33, SW_MEMES33, creditCrisis33, crises33, intensity33, mundo33, mundoNow33, pulse33, MUNDO33_EVENTS } from '../src/sim/r33/mundo33';
import { MORE_EVENTS } from '../src/sim/events_more';
import { EVENTS } from '../src/sim/events';
import { playerActs } from '../src/sim/util';
import type { GameState, Release } from '../src/sim/types';

const mk = (year: number, month: number): GameState => {
  const s = createGame(defaultConfig('mundo33', { startYear: 1960 }));
  s.year = year; s.month = month;
  return s;
};
const rel = (formats: string[]): Release => ({ id: 'rel_mundo33', actId: 'x', territories: ['na', 'eu'], formats } as unknown as Release);

describe('r33 mundo — interruptores desligados', () => {
  it('desligado: nenhuma crise, crédito normal, nenhuma mudança nas vendas e nos shows', () => {
    const s = mk(2008, 10);
    expect(crises33(s)).toEqual([]);
    expect(creditCrisis33(s)).toMatchObject({ active: false, rateAdd: 0, limitMult: 1, freeze: false });
    expect(pulse33(s)).toBe(0);
    expect(applyMods(s, 'chartUnits', 1000, { release: rel(['cd']) }).value).toBe(1000);
    expect(applyMods(s, 'showRevenue', 1000, { cityId: 'london' }).value).toBe(1000);
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(s.economy.recession).toBe(false);
    expect(mundoNow33(s)).toEqual([]);
  });
  it('os cartões novos estão registrados e todos têm texto bilíngue', () => {
    expect(MUNDO33_EVENTS.length).toBe(CRISES33.length + 2);
    for (const e of MUNDO33_EVENTS) { expect(EVENTS).toContain(e); expect(e.title.pt && e.title.en && e.text.pt && e.text.en).toBeTruthy(); expect(e.options.length).toBeGreaterThanOrEqual(2); }
    expect(MORE_EVENTS.some((e) => e.id.startsWith('crise33_'))).toBe(false);
  });
});

describe('r33 mundo — crises (exp33.crise)', () => {
  it('2008: crédito aperta e congela, shows e vendas físicas caem mais que as digitais', () => {
    const s = mk(2008, 9); setSw(s, SW_CRISE33, true);
    const c = CRISES33.find((x) => x.id === 'gfc08')!;
    expect(intensity33(c, s)).toBe(1);
    const cr = creditCrisis33(s);
    expect(cr.active && cr.freeze).toBe(true);
    expect(cr.rateAdd).toBeGreaterThan(0.04); expect(cr.limitMult).toBeLessThan(0.6); expect(cr.haircut).toBeGreaterThan(0.2);
    expect(applyMods(s, 'showRevenue', 1000, { cityId: 'london' }).value).toBeLessThan(900);
    const cd = applyMods(s, 'chartUnits', 1000, { release: rel(['cd']) }).value;
    const st = applyMods(s, 'chartUnits', 1000, { release: rel(['streaming']) }).value;
    expect(cd).toBeLessThan(900); expect(st).toBeGreaterThan(cd);
  });
  it('a largada liga a recessão uma vez, tranca o banco e a recuperação alivia', () => {
    const s = mk(1929, 9); setSw(s, SW_CRISE33, true);
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(s.economy.recession).toBe(true);
    expect((s.flags.m19nolend ?? 0)).toBeGreaterThan(s.week);
    const n = mundo33(s).fired['start:crash29'];
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(mundo33(s).fired['start:crash29']).toBe(n);
    const c = CRISES33.find((x) => x.id === 'crash29')!;
    const i0 = intensity33(c, s);
    s.year = 1933; s.month = 6;
    expect(intensity33(c, s)).toBeLessThan(i0);
    s.year = 1940;
    expect(intensity33(c, s)).toBe(0);
  });
});

describe('r33 mundo — memes e bolhas (exp33.memes)', () => {
  it('meme dá fôlego curto; bolha infla, estoura e aperta o crédito', () => {
    const s = mk(2021, 3); setSw(s, SW_MEMES33, true);
    emitFact(s, { kind: 'culture31', actors: ['player'], severity: 25, visibility: 'public', tags: ['culture31', 'bolha'], src: 'extras31', data: { pop: 'nft' }, text: { pt: 'x', en: 'x' } });
    emitFact(s, { kind: 'culture31', actors: ['player'], severity: 12, visibility: 'public', tags: ['culture31', 'meme'], src: 'extras31', data: { pop: 'm1' }, text: { pt: 'y', en: 'y' } });
    expect(mundo33(s).fx.map((f) => f.kind).sort()).toEqual(['bolha', 'meme']);
    expect(pulse33(s)).toBeGreaterThan(0);
    expect(applyMods(s, 'chartUnits', 1000, { release: rel(['streaming']) }).value).toBeGreaterThan(1000);
    s.week += 30;
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(mundo33(s).burst.nft).toBeDefined();
    expect(pulse33(s)).toBeLessThan(0);
    expect(creditCrisis33(s).active).toBe(true);
    s.week += 40;
    expect(pulse33(s)).toBe(0);
    expect(creditCrisis33(s).active).toBe(false);
  });
});

describe('r33 mundo — censura (exp33.censura)', () => {
  it('pressão do regime sobe só com censura alta e só com o interruptor ligado', () => {
    const s = mk(1970, 5);
    const a = Object.values(s.acts)[0];
    a.owner = 'player'; a.status = 'active';
    expect(playerActs(s)).toContain(a.id);
    a.city = 'rio';
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(mundo33(s).pressure[a.id] ?? 0).toBe(0);
    setSw(s, SW_CENSURA33, true);
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(mundo33(s).pressure[a.id] ?? 0).toBeGreaterThan(0);
    s.year = 2000;
    runSimHooks('month', s, Rng.fromSeed('x'));
    expect(mundo33(s).pressure[a.id]).toBeLessThan(30);
  });
});
