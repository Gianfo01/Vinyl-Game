// Rodada 14 — empresários reais: pessoas completas, só na época certa, clientes históricos, exigências nas propostas.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { defaultOffer, evaluateOffer } from '../src/sim/contracts';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { ATTR13_IDS, opine, per13 } from '../src/sim/sys/persona13';
import { activeMgrs, demandOf, inFeud, m14, managersMonth, mgrName, repOf, rosterOf } from '../src/sim/sys/managers14';
import { mgrById } from '../src/data/managers14';
import { realDataOf } from '../src/sim/sys/realworld';
import { mgChance, ventures } from '../src/sim/sys/ventures9';
import { Rng } from '../src/core/rng';
import { l } from '../src/data/world';

describe('r14 empresários', () => {
  it('são pessoas completas, só aparecem na época certa e com nome real ou gerado', () => {
    const s = createGame(defaultConfig('r14-m', { startYear: 1964, realNames: true, mode: 'historic' }));
    const ids = activeMgrs(s).map((m) => m.id);
    expect(ids).toContain('epstein');
    expect(ids).not.toContain('braun');
    expect(ids).not.toContain('mclaren');
    const P = per13(s, 'e:grant')!;
    expect(P.kind).toBe('manager');
    expect(P.name).toBe('Peter Grant');
    for (const a of ATTR13_IDS) expect(P.attrs[a]).toBeGreaterThan(0);
    expect(P.attrs.neg).toBe(90);
    const f = createGame(defaultConfig('r14-m', { startYear: 1964, realNames: false, mode: 'historic' }));
    expect(mgrName(f, mgrById.grant)).not.toBe('Peter Grant');
    expect(per13(f, 'e:grant')!.name).toBe(mgrName(f, mgrById.grant));
    expect(per13(f, 'e:grant')!.attrs.neg).toBe(90);
  });

  it('liga clientes históricos só no intervalo real e pesa nas propostas', () => {
    const s = createGame(defaultConfig('r14-c', { startYear: 1963, realNames: true, mode: 'historic' }));
    for (let i = 0; i < 2; i++) advanceMonth(s);
    const beatles = Object.values(s.acts).find((a) => realDataOf(a)?.n === 'The Beatles')!;
    expect(beatles).toBeTruthy();
    expect(repOf(s, beatles.id)?.id).toBe('epstein');
    expect(rosterOf(s, 'epstein').map((a) => a.id)).toContain(beatles.id);
    // proposta sem promessa por escrito não atende o "fabricante de imagem"
    const o = defaultOffer(s, beatles);
    expect(demandOf(s, mgrById.epstein, beatles, o).ok).toBe(false);
    const ev = evaluateOffer(s, beatles, o);
    expect(ev.reasons.some((x) => x.pt.includes('negocia por'))).toBe(true);
    const better = evaluateOffer(s, beatles, { ...o, promises: [{ kind: 'single', week: s.week + 20 } as never] });
    expect(better.score).toBeGreaterThan(ev.score);
    // concorrência na carreira de empresário
    const before = mgChance(s, beatles, 0.15);
    delete m14(s).rep[beatles.id];
    expect(mgChance(s, beatles, 0.15)).toBeGreaterThanOrEqual(before);
  });

  it('roubar cliente gera rixa; opinião no fundo do poço também', () => {
    const s = createGame(defaultConfig('r14-f', { startYear: 1970, realNames: true, mode: 'historic' }));
    advanceMonth(s);
    const zep = Object.values(s.acts).find((a) => realDataOf(a)?.n === 'Led Zeppelin');
    expect(zep).toBeTruthy();
    expect(repOf(s, zep!.id)?.id).toBe('grant');
    ventures(s).mg.clients.push({ actId: zep!.id, rate: 0.15, since: s.week, sat: 60, earned: 0 });
    managersMonth(s, Rng.fromSeed('t'));
    expect(repOf(s, zep!.id)).toBeNull();
    expect(inFeud(s, 'grant')).toBe(true);
    opine(s, 'e:klein', -100, l('teste', 'test'));
    managersMonth(s, Rng.fromSeed('t2'));
    expect(inFeud(s, 'klein')).toBe(true);
  });
});
