// r29 (arte): mais arte procedural no estilo antigo — lugares, geografia, insígnias, papéis, objetos, pessoas de
// bastidor, fotos de banda, capas/logos/cartazes novos e relíquias. Testa determinismo (mesma entrada → mesmos pixels),
// variedade (N sementes → muitas imagens distintas), cobertura (toda época × gênero × região desenha sem erro e com
// tinta) e compatibilidade (visuais salvos antes da rodada desenham pixel a pixel igual: hashes gravados antes).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CITIES, GENRES } from '../src/data/world';
import { COUNTRY_INFO } from '../src/data/countries';
import { coverPx, logoPx, posterPx } from '../src/ui/art';
import { pxHash28 } from '../src/ui/pixel/art28kit';
import { randomLook } from '../src/ui/pixel/avatar';
import { CHART_HEADS29, FAN_CHARGES29, awardSealPx29, chartHeaderPx29, fanBannerPx29, fanChargeOf29, genreBadgePx29, movementBadgePx29, statueOf29 } from '../src/ui/pixel/badge29';
import { COVER_LAYOUTS29, coverLayout29, coverLayoutPx29 } from '../src/ui/pixel/cover29';
import { CITY_CHARGES29, FLAG_CODES29, cityChargeOf29, cityCrestPx29, flagPx29, skylineThumbPx29 } from '../src/ui/pixel/geo29';
import { LOGO_STYLES29, logoStyle29, logoStylePx29 } from '../src/ui/pixel/logo29';
import { flavor27, OUTFIT27, OUTFIT_BASE } from '../src/ui/pixel/looks27';
import { DOCS29, MAGS29, casePx29, contractPx29, magCoverPx29, showCardPx29 } from '../src/ui/pixel/paper29';
import { PHOTOS29, STAFF29, bandPhotoPx29, fakeMembers29, staffPortraitPx29, staffRoleOf29 } from '../src/ui/pixel/people29';
import { PLACES29, SIGNS29, appIconPx29, placePx29, signPx29, venueKind29 } from '../src/ui/pixel/places29';
import { POSTERS29, posterKind29, posterPx29 } from '../src/ui/pixel/poster29';
import { RELIC_ARTS29, relicArtOf29, relicPx29 } from '../src/ui/pixel/relic29';
import { GEARS29, MERCH29, gearKindOf29, gearPx29, merchPx29, vehiclePx29 } from '../src/ui/pixel/things29';
import type { Px } from '../src/ui/pixel/px';
import { looksHashes } from './r29-looksbase';
import type { Appearance } from '../src/sim/types';

const YEARS = [1925, 1948, 1962, 1977, 1991, 2008, 2024, 2038];
const CITY_SAMPLE = ['new_york', 'london', 'rio', 'tokyo', 'kingston', 'lagos', 'paris', 'mexico_city', 'mumbai', 'berlin', 'sao_paulo', 'nashville', 'cairo', 'moscow', 'havana', 'seoul'];
const distinct = (ps: Px[]) => new Set(ps.map(pxHash28)).size;
const inked = (p: Px) => p.d.filter((c) => c >>> 24 > 0).length / p.d.length;

describe('r29 arte — determinismo', () => {
  it('mesma entrada → mesmos pixels (todas as categorias)', () => {
    const fs: (() => Px)[] = [
      () => placePx29('club', 'v1', 'Cavern Club', 1962, 'liverpool'), () => signPx29('Circo Voador', 1985, 'cv'), () => appIconPx29('Spotify', 2015),
      () => flagPx29('BRA'), () => cityCrestPx29('rio'), () => skylineThumbPx29('tokyo', 1988, true),
      () => genreBadgePx29('samba'), () => movementBadgePx29('mv1', 'punk', 1976), () => fanBannerPx29('f1', 'Army', 'BTS', 'kpop'), () => awardSealPx29('a', 'Grammy', 1970), () => chartHeaderPx29('HOT 100', 1985),
      () => contractPx29('c1', '360', 2005), () => magCoverPx29('Rolling Stone', 'glossy', 1972, { id: 'p1' }, 'X'), () => showCardPx29('s1', 'Soul Train', 'tv', 1974, { id: 'h1' }), () => casePx29('l1', 'courtroom', 1990),
      () => gearPx29('console', 'g'), () => merchPx29('tee', 33, 'Iron Crow', 'heavy_metal', 1984), () => vehiclePx29('bus', 1972, 't'),
      () => staffPortraitPx29({ id: 'x' }, 'producer', 1980), () => bandPhotoPx29(fakeMembers29('b', 4), 1969, 40, 30, 'faded', 3),
      () => coverLayoutPx29('photo_bleed', 9, 'Album', 'Banda', 'rock', 1977), () => logoStylePx29('gothic', 3, 'IC', 'heavy_metal', 1982), () => posterPx29('swirl', 4, 'IC', 1968, { bg: 0xff203040, fg: 0xffffffff, accent: 0xff2080ff, dark: 0xff101010, hue: 30 }),
      () => relicPx29('boombox', 'r', 1985), () => coverPx(4242, 'Disco', 'Banda', 'rock', 1977, 0.7), () => logoPx(4243, 'Iron Crow', 'heavy_metal', 1982), () => posterPx(4244, 'Os Mutantes', 'tropicalia', 1968),
    ];
    for (const f of fs) expect(pxHash28(f())).toBe(pxHash28(f()));
    // escolhas puras
    expect(coverLayout29(77, 'rock', 1977)).toBe(coverLayout29(77, 'rock', 1977));
    expect(flavor27(randomLook('d'), 'd', { year: 1980, genre: 'heavy_metal' })).toEqual(flavor27(randomLook('d'), 'd', { year: 1980, genre: 'heavy_metal' }));
  });
});

describe('r29 arte — variedade', () => {
  it('N sementes dão muitas imagens distintas', () => {
    const N = 40;
    const seeds = Array.from({ length: N }, (_, i) => `s${i}`);
    expect(distinct(seeds.map((s, i) => placePx29(PLACES29[i % PLACES29.length], s, `Casa ${i}`, YEARS[i % 8], CITY_SAMPLE[i % 16])))).toBeGreaterThanOrEqual(N - 2);
    expect(distinct(seeds.map((s, i) => placePx29('club', s, 'Clube', 1975, CITY_SAMPLE[i % 16])))).toBeGreaterThanOrEqual(30);
    expect(distinct(seeds.map((s) => appIconPx29(`App ${s}`)))).toBeGreaterThanOrEqual(N - 2);
    expect(distinct(CITIES.slice(0, 60).map((c) => cityCrestPx29(c.id)))).toBeGreaterThanOrEqual(55);
    expect(distinct(GENRES.map((g) => genreBadgePx29(g.id)))).toBeGreaterThanOrEqual(GENRES.length - 3);
    expect(distinct(seeds.map((s, i) => fanBannerPx29(s, `Fãs ${i}`, `Ato ${i}`, GENRES[i * 7 % GENRES.length].id)))).toBeGreaterThanOrEqual(N - 2);
    expect(distinct(seeds.map((s, i) => staffPortraitPx29({ id: s }, STAFF29[i % STAFF29.length], YEARS[i % 8])))).toBe(N);
    expect(distinct(seeds.map((s, i) => bandPhotoPx29(fakeMembers29(s), YEARS[i % 8], 40, 30, undefined, i)))).toBe(N);
    expect(distinct(seeds.map((s, i) => merchPx29(MERCH29[i % MERCH29.length], i * 13, `Ato ${i}`, 'rock', 1990)))).toBeGreaterThanOrEqual(N - 2);
    // capas: 120 discos → muitas capas e composições novas usadas
    const lays = new Set<string>();
    const covers: Px[] = [];
    for (let i = 0; i < 120; i++) { const g = GENRES[(i * 11) % GENRES.length].id; const y = 1950 + (i * 7) % 85; covers.push(coverPx(9000 + i * 37, `Disco ${i}`, `Ato ${i % 30}`, g, y, 0.7)); const l = coverLayout29(9000 + i * 37, g, y); if (l) lays.add(l); }
    expect(distinct(covers)).toBeGreaterThanOrEqual(110);
    expect(lays.size).toBeGreaterThanOrEqual(9);
    // logos: ~metade dos atos que ficavam no logo original ganha estilo novo
    let n29 = 0;
    for (let i = 0; i < 400; i++) if (logoStyle29(i * 17, GENRES[i % GENRES.length].id, 1990)) n29++;
    expect(n29).toBeGreaterThan(160); expect(n29).toBeLessThan(240);
    // cartazes de parede
    let np = 0;
    for (let i = 0; i < 200; i++) if (posterKind29(i * 13, 1980)) np++;
    expect(np).toBeGreaterThan(95); expect(np).toBeLessThan(145);
  });
});

describe('r29 arte — cobertura (tudo desenha, com tinta, em toda época/gênero/região)', () => {
  it('lugares, placas e streaming', () => {
    for (const k of PLACES29) for (const y of YEARS) for (const c of CITY_SAMPLE) expect(inked(placePx29(k, `${k}${c}`, 'Nome da Casa', y, c)), `${k} ${y} ${c}`).toBeGreaterThan(0.7);
    for (const k of SIGNS29) expect(inked(signPx29('Village Vanguard', 1970, 'vv', k))).toBeGreaterThan(0.5);
    expect(venueKind29(120)).toBe('club'); expect(venueKind29(2300, 'Ryman Auditorium')).toBe('theater'); expect(venueKind29(1500, 'Apollo Theater')).toBe('theater'); expect(venueKind29(70000)).toBe('stadium');
  });
  it('bandeiras, brasões e horizontes', () => {
    for (const a3 of [...FLAG_CODES29, ...COUNTRY_INFO.map((c) => c.a3)]) expect(inked(flagPx29(a3)), a3).toBeGreaterThan(0.4);
    const ch = new Set<string>();
    for (const c of CITIES) { expect(inked(cityCrestPx29(c.id)), c.id).toBeGreaterThan(0.4); ch.add(cityChargeOf29(c.id)); }
    expect(ch.size).toBeGreaterThanOrEqual(CITY_CHARGES29.length - 2);
    for (const c of CITY_SAMPLE) for (const y of [1930, 1965, 1995, 2035]) expect(inked(skylineThumbPx29(c, y))).toBeGreaterThan(0.9);
  });
  it('insígnias: todo gênero, facções, premiações e paradas de toda época', () => {
    for (const g of GENRES) { expect(inked(genreBadgePx29(g.id))).toBeGreaterThan(0.4); expect(inked(movementBadgePx29(g.id, g.id, g.born))).toBeGreaterThan(0.4); }
    for (const id of FAN_CHARGES29) expect(inked(fanBannerPx29(id, id, 'Ato', 'rock'))).toBeGreaterThan(0.4);
    expect(fanChargeOf29('x', 'Puristas', 'purist')).toBe('fist');
    for (const y of YEARS) expect(inked(awardSealPx29(`a${y}`, 'Prêmio', y))).toBeGreaterThan(0.3);
    expect(statueOf29('g', 'Grammy Awards', 1960)).toBe('gramophone');
    const heads = new Set<string>();
    for (let y = 1925; y <= 2040; y += 5) { const p = chartHeaderPx29('TOP 40', y); expect(inked(p)).toBeGreaterThan(0.9); heads.add(String(pxHash28(p))); }
    expect(heads.size).toBeGreaterThanOrEqual(CHART_HEADS29.length);
  });
  it('papéis, objetos e relíquias em toda época', () => {
    for (const k of DOCS29) expect(inked(contractPx29(k, 'CONTRATO', 1980, k))).toBeGreaterThan(0.5);
    for (const k of MAGS29) for (const y of YEARS) expect(inked(magCoverPx29('Revista', k, y, { id: `c${y}` }, 'MANCHETE'))).toBeGreaterThan(0.9);
    for (const y of YEARS) for (const k of ['tv', 'radio'] as const) expect(inked(showCardPx29(`s${y}`, 'Programa', k, y, { id: `h${y}` }))).toBeGreaterThan(0.6);
    for (const k of ['gavel', 'scales', 'courtroom'] as const) for (const y of YEARS) expect(inked(casePx29('c', k, y))).toBeGreaterThan(0.15);
    for (const k of GEARS29) expect(inked(gearPx29(k))).toBeGreaterThan(0.15);
    expect(gearKindOf29('g_808')).toBe('drumbox'); expect(gearKindOf29('g_ribbon44')).toBe('ribbon');
    for (const k of MERCH29) for (const g of ['rock', 'samba', 'house', 'kpop']) expect(inked(merchPx29(k, 7, 'Ato', g, 2015))).toBeGreaterThan(0.2);
    for (const m of ['van', 'bus', 'fly'] as const) for (const y of YEARS) expect(inked(vehiclePx29(m, y))).toBeGreaterThan(0.25);
    for (const a of RELIC_ARTS29) for (const y of YEARS) expect(inked(relicPx29(a, a, y, 'Peça'))).toBeGreaterThan(0.08);
    expect(relicArtOf29('prop', 'Sanfona de Luiz Gonzaga', 1950)).toBe('accordion');
    expect(relicArtOf29('prop', 'Boombox de Radio Raheem', 1989)).toBe('boombox');
    expect(relicArtOf29('guitar', 'Les Paul', 1970, 's', 'guitar')).toBeNull();
  });
  it('pessoas: toda função × época; foto da banda com 1–5 integrantes em todo tratamento', () => {
    for (const k of STAFF29) for (const y of YEARS) expect(inked(staffPortraitPx29({ id: `${k}${y}` }, k, y))).toBeGreaterThan(0.85);
    expect(staffRoleOf29('Produtor musical')).toBe('producer'); expect(staffRoleOf29('Crítica da Folha')).toBe('critic'); expect(staffRoleOf29('Advogado')).toBe('lawyer');
    for (const k of PHOTOS29) for (let n = 1; n <= 5; n++) expect(inked(bandPhotoPx29(fakeMembers29(`b${n}`, n), 1980, 40, 30, k, n))).toBeGreaterThan(0.95);
  });
  it('capas, logos e cartazes novos: toda composição/estilo × gênero × época', () => {
    for (const lay of COVER_LAYOUTS29) for (const y of YEARS) for (const g of ['bebop', 'samba', 'heavy_metal', 'hiphop', 'kpop', 'afrobeat']) expect(inked(coverLayoutPx29(lay, 31, 'Título', 'Ato', g, y)), `${lay} ${y} ${g}`).toBe(1);
    for (const st of LOGO_STYLES29) for (const g of ['rock', 'techno', 'country']) expect(inked(logoStylePx29(st, 5, 'AB', g, 1995))).toBeGreaterThan(0.15);
    for (const k of POSTERS29) expect(inked(posterPx29(k, 3, 'AB', 1980, { bg: 0xff203040, fg: 0xffffffff, accent: 0xff2080ff, dark: 0xff101010, hue: 30 }))).toBe(1);
    for (const g of GENRES.slice(0, 120)) for (const y of [1950, 1985, 2020]) { expect(inked(coverPx(h(g.id), 'T', 'A', g.id, y))).toBe(1); expect(inked(logoPx(h(g.id), 'Ato', g.id, y))).toBeGreaterThan(0.15); }
  });
});

describe('r29 arte — personagens', () => {
  it('visuais salvos antes da rodada desenham pixel a pixel igual (retrato em 4 épocas e sprite em 4 poses)', () => {
    const base = JSON.parse(readFileSync('tests/r29-looks-base.json', 'utf8')) as { looks: [string, Appearance][]; hashes: Record<string, number> };
    expect(base.looks.length).toBeGreaterThan(150);
    const now = looksHashes(base.looks);
    const diff = Object.keys(base.hashes).filter((k) => base.hashes[k] !== now[k]);
    expect(diff).toEqual([]);
  });
  it('roupas novas (26..33) e corpos 3/4 desenham e aparecem no gerador pela região/gênero', () => {
    expect(OUTFIT27.length + OUTFIT_BASE).toBe(34);
    const seen = new Set<number>(); let bodies = 0;
    const ctx = [{ year: 1995, genre: 'kpop', country: 'KOR' }, { year: 1975, genre: 'afrobeat', country: 'NGA' }, { year: 1955, genre: 'son', country: 'CUB' }, { year: 1988, genre: 'heavy_metal', country: 'USA' }, { year: 1982, genre: 'samba', country: 'BRA' }, { year: 1946, genre: 'bebop', country: 'USA' }, { year: 1986, genre: 'synthpop', country: 'GBR' }];
    for (const c of ctx) for (let i = 0; i < 300; i++) { const id = `g29${c.country}${i}`; const a = flavor27(randomLook(id), id, { ...c, family: undefined }); if (a.outfit >= 26) seen.add(a.outfit); if ((a.body ?? 0) >= 3) bodies++; }
    expect(seen.size).toBeGreaterThanOrEqual(6);
    expect(bodies).toBeGreaterThan(20);
  });
});

function h(s: string): number { let x = 7; for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return x; }
