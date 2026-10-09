// Rodada 16: fama regional — base por origem/idioma/alcance, desvio local por shows que some sem atividade,
// efeitos locais (público na cidade, exposição vista do país do jogador) e determinismo.
import { describe, expect, it } from 'vitest';
import { CITIES } from '../src/data/world';
import { countryOfCity } from '../src/data/geo';
import { defaultConfig } from '../src/sim/bot';
import { applyMods } from '../src/sim/ext4';
import { fameAt } from '../src/sim/famehook16';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { exposure, knownLevel } from '../src/sim/sys/fame15';
import { f16, fameIn, homeA3, worldFame16 } from '../src/sim/sys/fame16';

describe('fama regional 16', () => {
  it('base local, shows constroem o nome lá e o desvio decai', () => {
    const s = createGame(defaultConfig('r16-rf'));
    const a = Object.values(s.acts).find((x) => x.owner !== 'player' && !x.playerBand && homeA3(x) && x.status !== 'retired' && x.status !== 'split')!;
    a.fame = 40;
    const home = homeA3(a)!;
    const far = CITIES.find((c) => { const k = countryOfCity(c.id); return k && k !== home && c.market !== (CITIES.find((z) => z.id === a.city)?.market); })!;
    const fa3 = countryOfCity(far.id)!;
    expect(fameIn(s, a, home)).toBeGreaterThan(fameIn(s, a, fa3));
    expect(fameAt(s, a, far.id)).toBe(fameIn(s, a, fa3));
    expect(worldFame16(s, a)).toBeLessThan(fameIn(s, a, home));
    // público na cidade estrangeira cai (fama local menor que a global)
    expect(applyMods(s, 'cityDemand', 100, { act: a, cityId: far.id }).value).toBeLessThan(100);
    const b0 = fameIn(s, a, fa3);
    s.flags[`played:${a.id}:${far.id}`] = s.week;
    for (let i = 0; i < 3; i++) { advanceMonth(s); a.fame = 40; s.flags[`played:${a.id}:${far.id}`] = s.week; }
    const up = fameIn(s, a, fa3);
    expect(up).toBeGreaterThan(b0 + 3);
    expect((f16(s).m[a.id]?.[fa3] ?? 0) & 4).toBe(4);
    delete s.flags[`played:${a.id}:${far.id}`];
    for (let i = 0; i < 24; i++) { advanceMonth(s); a.fame = 40; }
    expect(fameIn(s, a, fa3)).toBeLessThan(up - 2);
    // cap de países guardados
    for (const d of Object.values(f16(s).d)) expect(Object.keys(d).filter((k) => !k.startsWith('r:')).length).toBeLessThanOrEqual(12);
  });
  it('exposição vista do país do jogador e determinismo', () => {
    const s = createGame(defaultConfig('r16-vis'));
    const me = countryOfCity(s.config.homeCity);
    const myMk = CITIES.find((c) => c.id === s.config.homeCity)?.market;
    const foreign = Object.values(s.acts).find((x) => x.owner !== 'player' && !x.playerBand && !s.knowledge[x.id] && homeA3(x) && homeA3(x) !== me && CITIES.find((c) => c.id === x.city)?.market !== myMk);
    if (foreign) {
      foreign.fame = 35;
      expect(knownLevel(s, foreign.id).exp).toBeLessThan(exposure(35));
    }
    const t1 = createGame(defaultConfig('r16-det')), t2 = createGame(defaultConfig('r16-det'));
    for (let i = 0; i < 3; i++) { advanceMonth(t1); advanceMonth(t2); }
    expect(JSON.stringify(f16(t1))).toBe(JSON.stringify(f16(t2)));
  });
});
