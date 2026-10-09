// Rodada 15 — produtores reais: só na época certa, som próprio, cachê com relação, obras sem futuro, nome gerado, demanda rival.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { availableProducers, PRODUCERS, soundOf } from '../src/sim/studio';
import { REAL_PRODS, prodById } from '../src/data/producers15';
import { activeProds, dinner, feeOf, p15, prodName, worksOf, opOf, prodDefId } from '../src/sim/sys/producers15';
import { opine } from '../src/sim/sys/persona13';
import { per13 } from '../src/sim/sys/persona13';
import { l } from '../src/data/world';

describe('r15 produtores reais', () => {
  it('tem ~50, entram no catálogo só na época certa e com som próprio', () => {
    expect(REAL_PRODS.length).toBeGreaterThanOrEqual(48);
    const s = createGame(defaultConfig('r15-p', { startYear: 1964, realNames: true, mode: 'historic' }));
    const ids = availableProducers(s).map((p) => p.id);
    expect(ids).toContain('rp_martin');
    expect(ids).toContain('rp_spector');
    expect(ids).not.toContain('rp_dre');
    expect(ids).not.toContain('rp_finneas');
    expect(PRODUCERS.find((p) => p.id === 'rp_spector')!.real).toBe('spector');
    expect(soundOf(PRODUCERS.find((p) => p.id === 'rp_spector')!).name.en).toBe('Wall of Sound');
    expect(activeProds(s).some((p) => p.id === 'dre')).toBe(false);
  });

  it('obras só até o ano atual, nome gerado sem nomes reais, pessoa completa', () => {
    const s = createGame(defaultConfig('r15-n', { startYear: 1980, realNames: true, mode: 'historic' }));
    const lange = prodById.lange;
    expect(worksOf(s, lange).map((w) => w[2]).every((y) => y <= 1980)).toBe(true);
    expect(worksOf(s, lange).length).toBe(2);
    expect(per13(s, 'pd:lange')!.name).toBe('Mutt Lange');
    const f = createGame(defaultConfig('r15-n', { startYear: 1980, realNames: false, mode: 'historic' }));
    expect(prodName(f, lange)).not.toBe('Mutt Lange');
    expect(worksOf(f, lange)).toEqual([]);
    expect(availableProducers(f).find((p) => p.id === 'rp_lange')!.name).toBe(prodName(f, lange));
  });

  it('relação muda cachê e pode causar recusa; rivais ocupam a agenda', () => {
    const s = createGame(defaultConfig('r15-f', { startYear: 1985, realNames: true, mode: 'historic' }));
    const p = prodById.rubin;
    const base = feeOf(s, p);
    opine(s, 'pd:rubin', 60, l('teste', 'test'));
    expect(opOf(s, p)).toBeGreaterThan(30);
    expect(feeOf(s, p)).toBeLessThan(base);
    opine(s, 'pd:rubin', -150, l('teste', 'test'));
    expect(availableProducers(s).some((x) => x.id === 'rp_rubin')).toBe(false);
    s.player.cash = 1e9;
    expect(dinner(s, 'rubin').ok).toBe(true);
    let booked = 0;
    for (let i = 0; i < 36; i++) { advanceMonth(s); booked += Object.keys(p15(s).book).length; }
    expect(Object.values(p15(s).credits).flat().some((c) => !c.you)).toBe(true);
    expect(booked).toBeGreaterThan(0);
    expect(Object.keys(s.producerBusy).some((k) => k.startsWith('rp_') && k !== prodDefId('x'))).toBe(true);
  });
});
