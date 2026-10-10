// R18 rights18: obra × gravação, sociedades por mercado (taxa, prazo, caixa preta), caução por disputa, bloqueio de usos,
// precedentes em datas reais, rescisão de 35 anos, avaliação de catálogo e "metadados limpos".
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { cityById } from '../src/data/world';
import { fin18 } from '../src/sim/ledger18';
import { exploitBlock } from '../src/sim/rights';
import { skillById } from '../src/sim/sys/persona/skills';
import { bbTotal18, catVal18, homeMk18, openDispute18, precMonth18, precMul18, pubRoute18, r18, rate18, resolveDispute18, termWindow18 } from '../src/sim/sys/rights18';
import type { GameState, Release } from '../src/sim/types';

const mk = (seed: string, y = 1990) => createGame(defaultConfig(seed, { startYear: y }));

function rel(s: GameState, id: string, terr: string[], year = s.year, na = false): Release {
  const act = Object.values(s.acts).find((a) => a.songs.length && a.members.length && !a.playerBand && (!na || cityById[a.city]?.market === 'na'))!;
  const song = s.songs[act.songs[0]];
  song.releaseId = id;
  const r = { id, actId: act.id, owner: 'player', type: 'album', title: 'T', songs: [song.id], week: s.week, year, q: 50, appeal: 50, formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: terr, weekly: [1000], totalUnits: 1000, revenue: 100000, peak: 50, weeksOnChart: 1, lastPos: 0, coverSeed: 1, shortage: 0, live: true } as unknown as Release;
  s.releases[id] = r;
  return r;
}

describe('r18 rights', () => {
  it('edição passa pelas sociedades: exterior paga depois e perde mais; metadados reduzem a caixa preta', () => {
    const s = mk('r18r-1');
    const home = homeMk18(s), away = home === 'eu' ? 'asia' : 'eu';
    expect(rate18(s, away, 'perf').lag).toBeGreaterThan(rate18(s, home, 'perf').lag);
    expect(rate18(s, away, 'perf').bb).toBeGreaterThan(rate18(s, home, 'perf').bb * 0.99);
    const r = rel(s, 'r18rel1', [home, away]);
    const before = fin18(s).ar.filter((x) => x.cat === 'publishing').length;
    pubRoute18(s, r, 100000);
    expect(fin18(s).ar.filter((x) => x.cat === 'publishing').length).toBeGreaterThan(before);
    const bb1 = bbTotal18(s);
    expect(bb1).toBeGreaterThan(0);
    r18(s).bb = [];
    r18(s).pol.reg = true;
    s.week += 1;
    pubRoute18(s, r, 100000);
    expect(bbTotal18(s)).toBeLessThan(bb1);
  });

  it('disputa de crédito congela a edição em caução, bloqueia sync e libera ao reconhecer', () => {
    const s = mk('r18r-2');
    const r = rel(s, 'r18rel2', [homeMk18(s)]);
    const so = s.songs[r.songs[0]];
    const d = openDispute18(s, so, r, '', 'Fulano', 'credit', 0.3);
    pubRoute18(s, r, 50000);
    expect(r18(s).esc[so.id]).toBeGreaterThan(0);
    expect(exploitBlock(s, r, 'sync')).not.toBeNull();
    resolveDispute18(s, d.id, 'give');
    expect(r18(s).esc[so.id]).toBeUndefined();
    expect(exploitBlock(s, r, 'sync')).toBeNull();
  });

  it('precedentes só valem na data real (Grand Upright, dez/1991)', () => {
    const s = mk('r18r-3', 1990);
    precMonth18(s);
    expect(precMul18(s, 'sampleSuit')).toBe(1);
    s.year = 1992; s.month = 0;
    precMonth18(s);
    const p = r18(s).prec.grandupright;
    expect(p?.y).toBe(1992);
    expect(precMul18(s, 'sampleSuit')).toBe(p?.flip ? 1 : 2);
  });

  it('rescisão americana: cessão de 1980 vence em 2015; catálogo concentrado vale menos que diversificado', () => {
    const s = mk('r18r-4', 2005);
    const r = rel(s, 'r18rel4', ['na'], 1980, true);
    expect(termWindow18(s, r)).toBe(2015);
    const one = rel(s, 'r18c1', ['na']);
    one.weekly = Array(52).fill(1000); one.totalUnits = 52000; one.revenue = 1000000;
    const two = rel(s, 'r18c2', ['na']);
    two.actId = Object.values(s.acts).find((a) => a.id !== one.actId)!.id;
    two.weekly = Array(52).fill(10); two.totalUnits = 520; two.revenue = 10000;
    const conc = catVal18(s, [one, two]);
    two.revenue = 1000000; two.weekly = Array(52).fill(1000); two.totalUnits = 52000;
    const bal = catVal18(s, [one, two]);
    expect(bal.mult).toBeGreaterThan(conc.mult);
  });

  it('metadados limpos não dão mais bônus de vendas', () => {
    const v = skillById.dg_meta.values as Record<string, number>;
    expect(v.chartUnits).toBeUndefined();
    expect(v.metadata).toBeGreaterThan(0);
  });
});
