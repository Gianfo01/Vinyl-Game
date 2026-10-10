// Rodada 18 (supply18): fábricas com fila por época, data perdida, distribuidor (taxa/prazo/reserva),
// relatório de mercado e acordos de desenvolvimento/imprint/pacotes.

import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { composeSongs, recordSongs, scheduleRelease } from '../src/sim/production';
import { advanceMonth, advanceWeek } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { baseQueue18, book18, lateOf18, physMix18, setDist18, setLatePol18, sup18 } from '../src/sim/sys/supply18';
import { postSalesAR18 } from '../src/sim/sys/econ18';
import { fin18 } from '../src/sim/ledger18';
import { makeReport18 } from '../src/sim/sys/report18';
import { deals18, startDev18 } from '../src/sim/sys/deals18';
import { rivalSignOk } from '../src/sim/sys/gate14';
import { PKG18, applyPkg18 } from '../src/sim/sys/contracts18';

function withRelease(seed: string, year: number) {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  s.player.cash += 50_000_000_00; s.player.initialCash += 50_000_000_00;
  const songs = composeSongs(s, r, act, 1);
  recordSongs(s, r, act, songs.map((x) => x.id), 1, 'balanced');
  return { s, r, act, songs };
}

describe('supply18', () => {
  it('fila histórica: vinil 2021 de 22 semanas, mistura física soma 1', () => {
    expect(baseQueue18('vinyl', 2019)).toBe(8);
    expect(baseQueue18('vinyl', 2021)).toBe(22);
    expect(baseQueue18('polycarbonate', 2021)).toBeLessThan(4);
    for (const y of [1945, 1975, 1990, 2005, 2021]) {
      const m = physMix18(y);
      expect(Object.values(m).reduce((t, x) => t + x, 0)).toBeCloseTo(1, 1);
    }
  });

  it('em 2021 o vinil atrasa; a política "adiar" empurra a data e "lançar" segura o estoque', () => {
    const { s, r, act, songs } = withRelease('sup18-a', 2021);
    setLatePol18(s, 'postpone');
    const pr = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'Vinil', formats: ['lp'], press: 5000, marketing: [], territories: [...s.player.territories], weeksAhead: 2 });
    expect('id' in pr).toBe(true);
    if (!('id' in pr)) return;
    const w0 = pr.week;
    const b = book18(s, pr)!;
    expect(lateOf18(s, pr, b).weeks).toBeGreaterThan(5);
    advanceWeek(s);
    expect(pr.week).toBeGreaterThan(w0);

    const z = withRelease('sup18-b', 2021);
    setLatePol18(z.s, 'launch');
    const p2 = scheduleRelease(z.s, z.r, { actId: z.act.id, type: 'single', songs: [z.songs[0].id], title: 'Atrasado', formats: ['lp'], press: 5000, marketing: [], territories: [...z.s.player.territories], weeksAhead: 1 });
    expect('id' in p2).toBe(true);
    advanceMonth(z.s);
    const rel = Object.values(z.s.releases).find((x) => x.title === 'Atrasado')!;
    expect(rel).toBeTruthy();
    expect(sup18(z.s).rel[rel.id]?.late ?? 0).toBeGreaterThan(5);
    expect(z.s.x4.industry.orders.some((o) => o.releaseId === rel.id && o.ready > z.s.week)).toBe(true);
    expect(z.s.player.cash).toBe(z.s.player.initialCash + z.s.player.totalPosted);
  });

  it('rede independente: taxa menor, prazo maior e reserva de devolução 6 meses depois', () => {
    const { s, r, act, songs } = withRelease('sup18-c', 1975);
    expect(setDist18(s, 'indie_net')).toBeNull();
    expect(s.flags.distLag18).toBe(1);
    expect(s.flags.distFeeAdj18).toBeLessThan(0);
    const pr = scheduleRelease(s, r, { actId: act.id, type: 'single', songs: [songs[0].id], title: 'X', formats: ['single45'], press: 1000, marketing: [], territories: [...s.player.territories], weeksAhead: 1 });
    expect('id' in pr).toBe(true);
    advanceMonth(s);
    const rel = Object.values(s.releases).find((x) => x.title === 'X')!;
    const f = fin18(s);
    const before = f.ar.length;
    postSalesAR18(s, rel, 'test', 100000, 'sales', 'teste');
    const dues = f.ar.slice(before).filter((b) => b.who === 'dist').map((b) => b.due);
    expect(f.ar.some((b) => b.who === 'dist')).toBe(true);
    if (dues.length >= 2) expect(Math.max(...dues) - Math.min(...dues)).toBeGreaterThanOrEqual(6);
  });

  it('relatório de mercado: formatos por país e fila das prensas', () => {
    const s = createGame(defaultConfig('sup18-d', { startYear: 1985 }));
    const rp = makeReport18(s);
    const na = rp.mix.na!;
    expect(na.phys).toBeGreaterThan(0.5);
    expect(na.vinyl + na.tape + na.cd + na.shellac).toBeCloseTo(na.phys, 2);
    expect(rp.queue.vinyl).toBeGreaterThan(0);
  });

  it('desenvolvimento bloqueia rivais; pacotes de serviços viram modelo distribuição', () => {
    const s = createGame(defaultConfig('sup18-e', { startYear: 1990 }));
    const r = rngOf(s);
    s.player.cash += 10_000_000; s.player.initialCash += 10_000_000;
    let ok = false;
    for (let i = 0; i < 12 && !ok; i++) {
      const a = spawnProceduralAct(s, r, { city: s.config.homeCity });
      a.fame = 2; a.owner = null;
      s.week += 1;
      ok = startDev18(s, a.id, 12).ok;
      if (ok) {
        const lb = Object.values(s.labels).find((x) => x.active)!;
        expect(rivalSignOk(s, lb.id, a)).toBe(false);
        expect(deals18(s).dev[a.id]).toBeTruthy();
      }
    }
    expect(ok).toBe(true);
    expect(PKG18.some((p) => p.id === 'services')).toBe(true);
    const a = spawnProceduralAct(s, r, { city: s.config.homeCity });
    const o = defaultOffer(s, a);
    applyPkg18(o, 'pd');
    expect(o.model).toBe('distribution');
    expect(o.distributionFee).toBeCloseTo(0.18);
  });
});
