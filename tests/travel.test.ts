import { describe, expect, it } from 'vitest';
import geoFile from '../src/data/geo/countries.json';
import { countryIndexAt, countryOfCity, politicalUnitsAt, setGeoData, unitOfCity, type GeoFile } from '../src/data/geo';
import { CITIES } from '../src/data/world';
import { climateAt, haversineKm, planRoute, transportAt, travelLeg } from '../src/sim/travel';

describe('distâncias', () => {
  it('haversine bate com distâncias conhecidas', () => {
    // Nova York–Londres ≈ 5.570 km; São Paulo–Rio ≈ 360 km
    expect(haversineKm(40.71, -74.0, 51.51, -0.13)).toBeGreaterThan(5500);
    expect(haversineKm(40.71, -74.0, 51.51, -0.13)).toBeLessThan(5650);
    expect(haversineKm(-23.55, -46.63, -22.91, -43.17)).toBeGreaterThan(330);
    expect(haversineKm(-23.55, -46.63, -22.91, -43.17)).toBeLessThan(390);
    expect(haversineKm(10, 10, 10, 10)).toBe(0);
  });
});

describe('transporte por era', () => {
  it('antes de 1940 cruza oceanos de navio, em uma a duas semanas', () => {
    const leg = travelLeg('new_york', 'london', 1935, 4);
    expect(leg.mode).toBe('ship');
    expect(leg.days).toBeGreaterThanOrEqual(7);
    expect(leg.days).toBeLessThanOrEqual(14);
  });
  it('anos 1950 voam de hélice; depois de 1960, a jato e mais barato com o tempo', () => {
    expect(transportAt(1950, 5500, false).mode).toBe('prop_plane');
    expect(travelLeg('new_york', 'london', 1965, 4).mode).toBe('jet');
    expect(transportAt(2000, 5500, false).costReal).toBeLessThan(transportAt(1965, 5500, false).costReal);
  });
  it('trechos curtos no mesmo continente vão por terra', () => {
    expect(transportAt(1930, 800, true).mode).toBe('train');
    expect(transportAt(1975, 400, true).mode).toBe('bus');
    expect(transportAt(2036, 600, true).mode).toBe('hyperloop');
  });
});

describe('vistos', () => {
  it('mesma unidade política dispensa visto; colônia e metrópole também', () => {
    expect(travelLeg('rio', 'sao_paulo', 1960, 5).visa.needed).toBe(false);
    expect(travelLeg('london', 'lagos', 1950, 5).visa.needed).toBe(false);
    expect(travelLeg('london', 'lagos', 1970, 5).visa.needed).toBe(true);
  });
  it('Berlim Ocidental pertence à RFA durante a divisão', () => {
    expect(unitOfCity('berlin', 1975)?.id).toBe('BRD');
    expect(unitOfCity('berlin', 1995)?.id).toBe('DEU');
    expect(travelLeg('london', 'berlin', 1975, 5).borderNote).toBeDefined();
  });
  it('Cortina de Ferro: Ocidente × URSS', async () => {
    const { visaBetween } = await import('../src/sim/travel');
    const { unitOfCountry } = await import('../src/data/geo');
    const v55 = visaBetween(unitOfCountry('USA', 1955), unitOfCountry('RUS', 1955), 1955);
    const v75 = visaBetween(unitOfCountry('USA', 1975), unitOfCountry('RUS', 1975), 1975);
    const v95 = visaBetween(unitOfCountry('USA', 1995), unitOfCountry('RUS', 1995), 1995);
    expect(v55.needed).toBe(true);
    expect(v55.processingDays).toBeGreaterThanOrEqual(45);
    expect(v55.denyChance).toBeGreaterThan(0.3);
    expect(v75.denyChance).toBeLessThan(v55.denyChance); // détente
    expect(v95.denyChance).toBeLessThan(0.1);
    expect(unitOfCountry('UKR', 1980).id).toBe('SUN');
    expect(unitOfCountry('UKR', 1995).id).toBe('UKR');
  });
  it('embargo EUA–Cuba bloqueia na prática', () => {
    expect(travelLeg('new_york', 'havana', 1955, 5).visa.denyChance).toBeLessThan(0.2);
    const leg = travelLeg('new_york', 'havana', 1975, 5);
    expect(leg.visa.needed).toBe(true);
    expect(leg.visa.denyChance).toBeGreaterThan(0.85);
  });
  it('apartheid: boicote cultural 1980–1991', () => {
    expect(travelLeg('london', 'johannesburg', 1985, 5).visa.boycott).toBe(true);
    expect(travelLeg('london', 'johannesburg', 1995, 5).visa.boycott).toBeFalsy();
  });
  it('vistos ficam mais simples depois de 2030', () => {
    const v = travelLeg('tokyo', 'seoul', 2035, 5).visa;
    expect(v.processingDays).toBeLessThanOrEqual(5);
  });
});

describe('clima', () => {
  it('monção em Mumbai em julho', () => {
    const c = climateAt('mumbai', 6);
    expect(c.kind).toBe('monsoon');
    expect(c.outdoorFactor).toBeLessThan(0.8);
    expect(c.cancelRisk).toBeGreaterThan(0.05);
  });
  it('hemisfério sul tem estações invertidas', () => {
    expect(climateAt('sydney', 0).tempC).toBeGreaterThan(climateAt('sydney', 6).tempC);
    expect(climateAt('buenos_aires', 0).tempC).toBeGreaterThan(climateAt('buenos_aires', 6).tempC);
    expect(climateAt('london', 6).tempC).toBeGreaterThan(climateAt('london', 0).tempC);
  });
  it('neve em inverno de alta latitude, furacões no Caribe', () => {
    expect(climateAt('stockholm', 0).kind).toBe('snow');
    expect(climateAt('havana', 8).kind).toBe('storm');
  });
  it('é determinístico e dentro dos limites', () => {
    for (const c of CITIES) for (let m = 0; m < 12; m++) {
      const a = climateAt(c.id, m);
      expect(a).toEqual(climateAt(c.id, m));
      expect(a.outdoorFactor).toBeGreaterThanOrEqual(0.5);
      expect(a.outdoorFactor).toBeLessThanOrEqual(1.1);
      expect(a.cancelRisk).toBeLessThanOrEqual(0.15);
    }
  });
});

describe('rota', () => {
  it('soma trechos, vistos e clima por parada', () => {
    const r = planRoute(['london', 'paris', 'havana'], 'new_york', 1975, 5, 6);
    expect(r.legs).toHaveLength(3);
    expect(r.stops).toHaveLength(3);
    expect(r.totals.km).toBe(r.legs.reduce((a, g) => a + g.km, 0));
    expect(r.totals.maxDenyChance).toBeGreaterThan(0.85); // equipe americana em Havana: embargo, mesmo vindo de Paris
    expect(r.stops[0].climate.kind).toBeDefined();
  });
});

describe('geografia', () => {
  setGeoData(geoFile as unknown as GeoFile);
  it('todas as cidades têm país', () => {
    for (const c of CITIES) expect(countryOfCity(c.id)).toBeTruthy();
    expect(countryOfCity('sao_paulo')).toBe('BRA');
    expect(countryOfCity('mumbai')).toBe('IND');
  });
  it('ponto-em-polígono', () => {
    const geo = setGeoData(geoFile as unknown as GeoFile);
    expect(geo.countries[countryIndexAt(geo, -47.9, -15.8)].a3).toBe('BRA');
    expect(geo.countries[countryIndexAt(geo, 2.35, 46.5)].a3).toBe('FRA');
    expect(countryIndexAt(geo, -30, 30)).toBe(-1); // Atlântico
  });
  it('uniões históricas por ano', () => {
    const u80 = politicalUnitsAt(1980);
    const sun = u80.find((u) => u.id === 'SUN');
    expect(sun?.members).toHaveLength(15);
    expect(u80.find((u) => u.id === 'DDR')?.bloc).toBe('east');
    expect(politicalUnitsAt(1995).find((u) => u.id === 'SUN')).toBeUndefined();
    expect(politicalUnitsAt(1930).find((u) => u.id === 'BRI')?.members).toContain('BGD');
    expect(politicalUnitsAt(1960).find((u) => u.id === 'VDR')).toBeDefined();
    expect(politicalUnitsAt(1950).find((u) => u.id === 'NGA')?.colonialPower).toBe('GBR');
  });
});
