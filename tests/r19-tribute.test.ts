import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { factListeners19, recentFacts } from '../src/sim/facts17';
import { fandomRec19 } from '../src/sim/fandom19';
import { calendar19 } from '../src/sim/calendar19';
import { explain18 } from '../src/sim/explain18';
import { P } from '../src/sim/sys/people/state';
import { band18 } from '../src/sim/sys/live18';
import { cine18 } from '../src/sim/sys/cine18';
import { valuation17 } from '../src/sim/sys/sale17';
import { birth19, demand19, documentary19, fakeFarewell19, kindsNow19, license19, soundalike19, sue19, t19 } from '../src/sim/sys/tribute19';
import { decide19, revivalMonth19, rv19, stage19 } from '../src/sim/sys/revival19';
import type { Act, GameState, Release } from '../src/sim/types';

const kinds = (s: GameState, k: string) => recentFacts(s, { kind: k, months: 600 });
function setup(seed: string, year: number): { s: GameState; a: Act; r: Rng } {
  const s = createGame(defaultConfig(seed, { startYear: year }));
  s.config.history = 'loose';
  const a = Object.values(s.acts).find((x) => !x.catalogNo && !x.playerBand && x.members.length >= 3 && x.members.every((p) => s.persons[p]?.alive))!;
  a.fame = 72; a.legend = true;
  return { s, a, r: Rng.fromSeed(`${seed}|t`) };
}
function oldRel(s: GameState, a: Act, year: number, owner = 'player'): Release {
  const rel: Release = { id: `rt-${a.id}-${year}`, actId: a.id, owner, type: 'single', title: `Canção de ${year}`, songs: a.songs.slice(0, 1), week: 0, year, q: 62, appeal: 30,
    formats: [], stock: 0, pressed: 0, marketing: [], marketingE: 0, territories: ['na'], weekly: [], totalUnits: 150000, revenue: 0, peak: 0, weeksOnChart: 0, lastPos: 0, coverSeed: 1, shortage: 0, live: false };
  s.releases[rel.id] = rel; a.releases.push(rel.id);
  return rel;
}

describe('r19 9.1 tribute19 — tributos e covers', () => {
  it('eras: baile 1889+, imitador 1970+, YouTube 2006+, voz de IA 2020+', () => {
    expect(kindsNow19(1900)).toEqual(['dance']);
    expect(kindsNow19(1975)).toContain('imperson');
    expect(kindsNow19(1975)).not.toContain('yt');
    expect(kindsNow19(2010)).toContain('yt');
    expect(kindsNow19(2010)).not.toContain('ai');
    expect(kindsNow19(2021)).toContain('ai');
  });

  it('cadeia 1: banda separa → tributo → sósia contratado na reunião → fãs divididos → documentário', () => {
    const { s, a, r } = setup('r19-trib-c1', 1988);
    const old = oldRel(s, a, 1975, a.owner ?? 'indie');
    a.status = 'split';
    // 1) tributo nasce com gente de verdade (CA/PA) e um sósia vocal
    const t = birth19(s, r, a, 'show')!;
    expect(t).toBeTruthy();
    expect(t.mem.length).toBeGreaterThanOrEqual(4);
    expect(t.sa && s.persons[t.sa]?.role).toBe('vocal');
    expect(t.q).toBeGreaterThan(0);
    expect(kinds(s, 'tribute_born').length).toBe(1);
    const dSplit = demand19(s, t).v;
    expect(dSplit).toBeGreaterThan(0);
    // 2) reunião sem a voz original: o sósia vira o substituto oficial
    for (const p of a.members) if (s.persons[p].role === 'vocal' || s.persons[p].role === 'mc') s.persons[p].alive = false;
    const chem0 = band18(s, a.id).chem, haters0 = fandomRec19(s, a.id).haters ?? 0;
    const shots0 = cine18(s).log.length;
    expect(soundalike19(s, t.id)).toBeNull();
    expect(a.members).toContain(t19(s).hired[a.id]);
    expect(a.status).toBe('active');
    expect(kinds(s, 'soundalike_hired').length).toBe(1);
    // 3) reunião esvazia o tributo; banda recomeça a química; fãs se dividem; cena na Cinemateca
    expect(demand19(s, t).v).toBeLessThan(dSplit);
    expect(band18(s, a.id).chem).toBeLessThan(chem0 + 1);
    expect(t19(s).split[a.id]).toBeTruthy();
    expect(fandomRec19(s, a.id).haters ?? 0).toBeGreaterThanOrEqual(haters0);
    expect(cine18(s).log.length).toBe(shots0 + 1);
    expect(t19(s).doc[a.id]).toBeGreaterThan(s.week);
    // 4) documentário → fato + calor de sucesso tardio na faixa antiga (liga com a cadeia 2)
    documentary19(s, a.id);
    expect(kinds(s, 'release').some((f) => f.tags.includes('documentary'))).toBe(true);
    expect(rv19(s).c[old.id]?.h ?? 0).toBeGreaterThan(0);
  });

  it('selo: licença paga royalty todo mês e entra no calendário; processo e despedida falsa são fatos com ouvinte', () => {
    const { s, a, r } = setup('r19-trib-lab', 1995);
    a.owner = 'player'; a.status = 'retired';
    const t = birth19(s, r, a, 'imperson')!;
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'trib19_lab')).toBe(true);
    expect(license19(s, t.id)).toBeNull();
    expect(kinds(s, 'tribute_licensed').length).toBe(1);
    t.until = s.week + 3;
    expect(calendar19(s, { weeks: 6 }).some((d) => d.id === `tribute19-lic-${t.id}`)).toBe(true);
    const lic0 = s.player.totals.licensing ?? 0;
    advanceMonth(s);
    expect(s.player.totals.licensing ?? 0).toBeGreaterThan(lic0);
    expect(explain18(s, 'trib19.demand', { t: t.id })?.parts.length).toBeGreaterThan(3);
    const t2 = birth19(s, r, a, 'show')!;
    fakeFarewell19(s, t2);
    expect(kinds(s, 'fake_farewell').length).toBe(1);
    expect(sue19(s, t2.id)).toBeNull();
    expect(kinds(s, 'tribute_sued').length).toBe(1);
    expect(t2.lic).toBe(2);
    expect(calendar19(s, { weeks: 26 }).some((d) => d.id === `tribute19-court-${t2.id}`)).toBe(true);
    const ids = factListeners19().map((x) => x.id);
    for (const id of ['tribute19:rights', 'tribute19:lic', 'tribute19:court', 'tribute19:live', 'tribute19:fans_split', 'tribute19:cine', 'tribute19:fake', 'tribute19:spark', 'revival19:fans', 'revival19:cert', 'revival19:market']) expect(ids, id).toContain(id);
  });

  it('cadeia 2: fracasso de 1983 → remix → comercial → série → revival → certificação → valor do catálogo', () => {
    const { s, a } = setup('r19-rev-c2', 2003);
    a.owner = 'player'; a.fame = 50;
    const rel = oldRel(s, a, 1983);
    const cat0 = valuation17(s).cat, fans0 = a.fans.casual;
    expect(stage19(s, rel.id, 'remix')).toBeNull();
    expect(stage19(s, rel.id, 'tv_ad')).toBeNull();
    const x = stage19(s, rel.id, 'series')!;
    expect(x).toBeTruthy();
    expect(kinds(s, 'revival_hit').length).toBe(1);
    expect(P(s).inbox.some((m) => m.ref?.k18 === 'rev19_dec')).toBe(true);
    expect(t19(s).spark[a.id]).toBeGreaterThan(s.week); // tributos ganham faísca
    decide19(s, x.id, 'reissue');
    expect(kinds(s, 'catalog_rerelease').length).toBe(1);
    for (let i = 0; i < 8; i++) revivalMonth19(s);
    expect(rel.certified).toBeTruthy();
    expect(kinds(s, 'late_cert').length).toBeGreaterThanOrEqual(1);
    expect(s.player.stats.gold + s.player.stats.platinum).toBeGreaterThan(0);
    expect(a.fans.casual).toBeGreaterThan(fans0);
    expect(valuation17(s).cat).toBeGreaterThan(cat0);
    expect(explain18(s, 'rev19.units', { rv: x.id })?.value).toBeGreaterThan(0);
  });
});
