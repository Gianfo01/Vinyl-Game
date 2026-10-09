// Rodada 9 (F): dilemas pessoais, 5 unidades de tempo livre, novidades de época e save em texto.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { ownerOf } from '../src/sim/sys/people/owner';
import { ENERGY_PER_MONTH, energyLeft, maxEnergy } from '../src/sim/sys/life';
import { DILEMMAS, dilemmas, takeDilemma } from '../src/sim/sys/dilemmas9';
import { isUnlocked, pendingFeatures, unlockFeature } from '../src/sim/era';
import { availableChannels } from '../src/sim/market';
import { money } from '../src/sim/util';
import { exportSaveText, importSaveText, store } from '../src/ui/store';

const mk = (seed: string, startYear: number) => createGame(defaultConfig(seed, { startYear }));

describe('tempo livre', () => {
  it('são 5 unidades por mês, uma ocupada pela banda', () => {
    expect(ENERGY_PER_MONTH).toBe(5);
    const s = mk('r9-energy', 1985);
    expect(maxEnergy(s)).toBeGreaterThanOrEqual(4);
    expect(energyLeft(s)).toBeGreaterThanOrEqual(4);
  });
});

describe('dilemas pessoais', () => {
  it('opções têm custo e efeitos; consequência atrasada acontece depois', () => {
    const s = mk('r9-dil', 1985);
    ownerOf(s).wealth = money(s, 100000);
    ownerOf(s).stress = 50;
    expect(DILEMMAS.every((d) => d.opts.length >= 2 && d.opts.length <= 4)).toBe(true);
    const w0 = ownerOf(s).wealth;
    expect(takeDilemma(s, 'burnout', 'clinic')).toBeNull();
    expect(ownerOf(s).wealth).toBeLessThan(w0);
    expect(ownerOf(s).stress).toBeLessThan(50);
    expect(takeDilemma(s, 'burnout', 'rest')).not.toBeNull(); // cooldown
    expect(takeDilemma(s, 'old_friend', 'refuse')).toBeNull();
    expect(dilemmas(s).pending.length).toBe(1);
    for (let i = 0; i < 5; i++) advanceMonth(s);
    expect(dilemmas(s).pending.length).toBe(0);
  });
  it('opção com requisito fica bloqueada sem parceiro', () => {
    const s = mk('r9-gate', 1985);
    expect(takeDilemma(s, 'partner_trip', 'trip')).not.toBeNull();
  });
});

describe('novidades de época', () => {
  it('clipe só existe depois do ano e exige desbloqueio; depois disso aparece como canal', () => {
    const old = mk('r9-era-a', 1960);
    expect(availableChannels(old).some((c) => c.id === 'music_video')).toBe(false);
    const s = mk('r9-era-b', 1975);
    expect(isUnlocked(s, 'music_video')).toBe(false);
    s.year = Math.max(s.year, (s.techDates.clipnet ?? 1981) + 1);
    expect(pendingFeatures(s).some((f) => f.id === 'music_video')).toBe(true);
    expect(availableChannels(s).some((c) => c.id === 'music_video')).toBe(false);
    s.player.cash = 1e12;
    expect(unlockFeature(s, 'music_video')).toBeNull();
    expect(availableChannels(s).some((c) => c.id === 'music_video')).toBe(true);
  });
  it('save antigo (sem registro) começa com o que já existia desbloqueado', () => {
    const s = mk('r9-era-c', 1995);
    delete (s.x4 as unknown as Record<string, unknown>).era9;
    expect(isUnlocked(s, 'music_video')).toBe(true);
  });
});

describe('save em texto', () => {
  it('exporta, importa (texto compactado e JSON puro) e continua rodando', async () => {
    const s = mk('r9-save', 1985);
    for (let i = 0; i < 8; i++) advanceMonth(s);
    store.game = s;
    const text = await exportSaveText();
    expect(text.startsWith('VTN1:')).toBe(true);
    const g = await importSaveText(`  ${text.slice(0, 40)}\n${text.slice(40)}  `);
    expect(g.signature).toBe(s.signature);
    expect(g.year).toBe(s.year);
    expect(g.month).toBe(s.month);
    expect(g.player.cash).toBe(s.player.cash);
    expect(Object.keys(g.acts).length).toBe(Object.keys(s.acts).length);
    const g2 = await importSaveText(JSON.stringify(s));
    expect(g2.player.cash).toBe(s.player.cash);
    for (let i = 0; i < 6; i++) advanceMonth(g);
    expect(g.year * 12 + g.month).toBeGreaterThan(s.year * 12 + s.month);
    await expect(importSaveText('lixo')).rejects.toThrow();
    await expect(importSaveText('{"a":1}')).rejects.toThrow();
  });
});
