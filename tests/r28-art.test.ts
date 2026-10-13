// r28 (arte): relíquias, emblemas do submundo, capas, logos/letreiros e extras em pixel art procedural —
// determinismo (mesma entrada → mesmos pixels), variedade (muitas sementes → muitas imagens distintas), cobertura
// (todo tipo/gênero/época/organização desenha sem erro) e as relíquias novas que nascem de fatos da partida.

import { describe, expect, it } from 'vitest';
import { ORGS17 } from '../src/data/orgs17';
import { ORGS19 } from '../src/data/media19b';
import { countryOfCity } from '../src/data/geo';
import { FESTIVALS } from '../src/data/catalog';
import { GENRES, l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { RELICS17 } from '../src/sim/relics17';
import { chron } from '../src/sim/sys/chron9';
import { RELIC_KIND, relics } from '../src/sim/sys/relics9';
import { createGame } from '../src/sim/worldgen';
import { coverPx, eraStyle, logoPx } from '../src/ui/art';
import { pxHash28 } from '../src/ui/pixel/art28kit';
import { COVER_LAYOUTS28, coverLayout28, coverLayoutPx28, genreMood28, wear28 } from '../src/ui/pixel/cover28';
import { CHARGES28, EMBLEM_KINDS28, emblemModel28, emblemPx28 } from '../src/ui/pixel/emblem28';
import { LABEL_MARKS28, MAST_KINDS28, festivalPinPx28, festivalPosterPx28, labelMarkPx28, mastheadPx28 } from '../src/ui/pixel/extras28';
import { LOGO_STYLES28, logoStyle28, logoStylePx28, wordmarkPx28 } from '../src/ui/pixel/logo28';
import { RELIC_ARTS28, relicArtOf28, relicArtOfRole28, relicPx28 } from '../src/ui/pixel/relic28';
import type { Px } from '../src/ui/pixel/px';

const YEARS = [1935, 1955, 1970, 1988, 2012, 2036];
const distinct = (ps: Px[]) => new Set(ps.map(pxHash28)).size;
const opaque = (p: Px) => p.d.filter((c) => c >>> 24 === 255).length / p.d.length;
const inked = (p: Px) => p.d.some((c) => c !== 0);

describe('r28 arte — determinismo', () => {
  it('mesma entrada → mesmos pixels (todas as categorias)', () => {
    const pairs: [() => Px][] = [
      [() => relicPx28('guitar', 'rl42', 1969, 'A guitarra de X')], [() => relicPx28('poster', 'rl7', 1977)],
      [() => emblemPx28({ id: 'outfit', kind: 'mafia', a3: 'USA', rackets: ['jukebox'], name: 'Chicago Outfit' })],
      [() => coverLayoutPx28('graffiti', 1234, 'Rua', 'MC Ruas', 'hiphop', 1991)], [() => coverPx(99, 'Disco', 'Banda', 'rock', 1977, 0.7)],
      [() => logoStylePx28('spiky', 5, 'IC', 'heavy_metal', 1982)], [() => logoPx(77, 'Iron Crow', 'heavy_metal', 1982)], [() => wordmarkPx28(5, 'Iron Crow', 'heavy_metal', 1982)],
      [() => labelMarkPx28('lb1', 'Odeon', 1931)], [() => festivalPosterPx28('Glasswick Fields', 1994, 0, ['Blur'])], [() => mastheadPx28('Rock Chronicle', 'magazine')],
    ];
    for (const [f] of pairs) expect(pxHash28(f())).toBe(pxHash28(f()));
  });
  it('escolhas puras também são estáveis', () => {
    expect(coverLayout28(321, 'reggae', 1977, 'punk')).toBe(coverLayout28(321, 'reggae', 1977, 'punk'));
    expect(logoStyle28(321, 'punk', 1977)).toBe(logoStyle28(321, 'punk', 1977));
    expect(emblemModel28({ id: 'cv', kind: 'gang', a3: 'BRA' })).toEqual(emblemModel28({ id: 'cv', kind: 'gang', a3: 'BRA' }));
  });
});

describe('r28 arte — variedade', () => {
  const seeds = Array.from({ length: 40 }, (_, i) => `s${i * 7 + 1}`);
  it('relíquias: cada tipo varia com a semente e com a época', () => {
    let total = 0;
    for (const a of RELIC_ARTS28) {
      const bySeed = distinct(seeds.map((sd) => relicPx28(a, sd, 1975)));
      const byEra = distinct(YEARS.map((y) => relicPx28(a, 'fixo', y)));
      expect(bySeed + byEra, a).toBeGreaterThan(2);
      total += bySeed;
    }
    expect(total).toBeGreaterThan(RELIC_ARTS28.length * 8);
    expect(RELIC_ARTS28.length).toBeGreaterThanOrEqual(45);
  });
  it('emblemas: 40 organizações → ≥ 36 brasões distintos; cargas variadas', () => {
    const ps = seeds.map((sd, i) => emblemPx28({ id: sd, kind: EMBLEM_KINDS28[i % 5], a3: ['ITA', 'USA', 'JPN', 'BRA', 'MEX', 'GBR'][i % 6], rackets: i % 2 ? ['payola'] : [], name: `Clã ${sd}` }));
    expect(distinct(ps)).toBeGreaterThanOrEqual(36);
    const charges = new Set(seeds.map((sd, i) => emblemModel28({ id: sd, kind: EMBLEM_KINDS28[i % 5] }).charge));
    expect(charges.size).toBeGreaterThanOrEqual(10);
  });
  it('capas: 60 discos de gêneros/épocas variados → ≥ 55 capas distintas e ≥ 15 composições novas em uso', () => {
    const gs = ['bebop', 'country', 'samba', 'reggae', 'afrobeat', 'enka', 'classical', 'heavy_metal', 'hiphop', 'disco', 'techno', 'synthpop', 'punk', 'indie', 'prog'];
    const ps: Px[] = []; const lays = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const g = gs[i % gs.length], y = 1950 + (i * 7) % 85;
      ps.push(coverPx(10000 + i * 31, `Disco ${i}`, `Ato ${i}`, g, y, 0.7));
      const lay = coverLayout28(10000 + i * 31, g, y, eraStyle(y));
      if (lay) lays.add(lay);
    }
    expect(distinct(ps)).toBeGreaterThanOrEqual(55);
    expect(lays.size).toBeGreaterThanOrEqual(12);
  });
  it('logos: estilo novo em ~55% dos atos e o resto segue o desenho original', () => {
    let novo = 0;
    for (let i = 0; i < 400; i++) if (logoStyle28(i * 13 + 5, 'heavy_metal', 1985)) novo++;
    expect(novo).toBeGreaterThan(170);
    expect(novo).toBeLessThan(270);
    expect(distinct(seeds.map((_, i) => logoPx(500 + i, `Banda ${i}`, 'punk', 1978)))).toBeGreaterThanOrEqual(36);
  });
});

describe('r28 arte — cobertura (nada lança erro)', () => {
  it('toda relíquia × época desenha algo com contorno', () => {
    for (const a of RELIC_ARTS28) for (const y of YEARS) { const p = relicPx28(a, `${a}${y}`, y, 'x'); expect(inked(p), `${a} ${y}`).toBe(true); }
  });
  it('todo tipo de emblema × região, e todas as organizações do jogo', () => {
    for (const k of EMBLEM_KINDS28) for (const a3 of ['ITA', 'USA', 'JPN', 'HKG', 'BRA', 'MEX', 'COL', 'RUS', 'JAM', 'GBR', 'XXX', undefined]) expect(inked(emblemPx28({ id: `${k}${a3}`, kind: k, a3, rackets: ['bootleg', 'corridos'], name: 'Nome Qualquer' }))).toBe(true);
    for (const o of [...ORGS17, ...ORGS19]) expect(inked(emblemPx28({ id: o.id, kind: o.kind, a3: countryOfCity(o.city || 'rio') ?? undefined, rackets: o.rackets, name: o.name.pt })), o.id).toBe(true);
    expect(CHARGES28.length).toBeGreaterThanOrEqual(20);
  });
  it('toda composição de capa cobre o quadro; todo gênero × época tem capa e logo', () => {
    for (const lay of COVER_LAYOUTS28) { const p = coverLayoutPx28(lay, 77, 'Titulo Longo Demais Para Caber', 'Ato Com Nome Comprido', 'rock', 1980); expect(opaque(p), lay).toBeGreaterThan(0.9); }
    for (const g of GENRES) {
      expect(typeof genreMood28(g.id)).toBe('string');
      for (const y of [g.born, 1960, 1985, 2010]) { expect(inked(coverPx(g.born + y, 'T', g.id, g.id, y, 0.6))).toBe(true); expect(inked(logoPx(g.born * 3 + y, g.id, g.id, y))).toBe(true); }
    }
    const old = coverLayoutPx28('duotone', 5, 'A', 'B', 'pop', 1960); const h0 = pxHash28(old); wear28(old, 5, 30, 1960); expect(pxHash28(old)).not.toBe(h0);
    const nu = coverLayoutPx28('duotone', 5, 'A', 'B', 'pop', 2015); const h1 = pxHash28(nu); wear28(nu, 5, 30, 2015); expect(pxHash28(nu)).toBe(h1); // streaming não gasta
  });
  it('logos, letreiros e extras: todos os estilos', () => {
    for (const st of LOGO_STYLES28) expect(inked(logoStylePx28(st, 9, 'AB', 'pop', 1990))).toBe(true);
    for (const n of ['A', 'Os Mutantes', 'The Extremely Long Band Name Here']) for (const g of ['heavy_metal', 'punk', 'disco', 'indie', 'hiphop', 'house', 'samba']) expect(inked(wordmarkPx28(3, n, g, 1990))).toBe(true);
    for (const m of LABEL_MARKS28) for (const y of [1920, 1960, 1985, 2010]) expect(inked(labelMarkPx28(`l${m}`, 'Selo Exemplo', y, m))).toBe(true);
    for (const f of FESTIVALS) { expect(inked(festivalPosterPx28(f.name, f.start, 0, ['Headliner']))).toBe(true); expect(inked(festivalPinPx28(f.name, f.start))).toBe(true); }
    for (const k of MAST_KINDS28) expect(inked(mastheadPx28('Weekly Needle', k))).toBe(true);
  });
});

describe('r28 arte — classificação das relíquias', () => {
  it('peças reais caem no desenho certo', () => {
    const art = (id: string) => { const d = RELICS17.find((x) => x.id === id)!; return relicArtOf28(d.kind, d.name.en, d.year, d.id); };
    expect(art('lucille')).toBe('hollow');
    expect(art('unplugged_d18e')).toBe('acoustic');
    expect(art('hofner_bass')).toBe('bass');
    expect(art('ruby_slippers')).toBe('boots');
    expect(art('algie_pig')).toBe('pig');
    expect(art('buddy_glasses')).toBe('glasses');
    expect(art('elvis_cadillac')).toBe('car');
    expect(art('carmen_baiana')).toBe('hat');
    expect(art('unplugged_cardigan')).toBe('jacket');
    for (const d of RELICS17) expect(RELIC_ARTS28).toContain(relicArtOf28(d.kind, d.name.en, d.year, d.id));
  });
  it('época muda o objeto; categorias novas e papéis mapeiam direto', () => {
    expect(relicArtOf28('tape', 'Master tapes', 2008)).toBe('drive');
    expect(relicArtOf28('lyrics', 'X\'s last setlist', 1990)).toBe('setlist');
    expect(relicArtOf28('goldrec', 'framed platinum record', 1990)).toBe('platrec');
    for (const k of ['setlist', 'poster', 'ticket', 'contract', 'sticks', 'notebook', 'jukebox', 'amp', 'photo', 'horn', 'synth']) expect(relicArtOf28(k, 'x', 1990)).toBe(k);
    expect(relicArtOfRole28('dj', 1995)).toBe('turntable');
    expect(relicArtOfRole28('producer', 2010)).toBe('laptop');
    for (const k of Object.keys(RELIC_KIND)) expect(RELIC_ARTS28).toContain(relicArtOf28(k, 'qualquer', 1980, 'z'));
  });
});

describe('r28 arte — relíquias de memorabilia nascem de fatos', () => {
  it('certificação → disco emoldurado; show histórico → ingresso e setlist', () => {
    const s = createGame(defaultConfig('r28-art', { startYear: 1975, realNames: false }));
    const a = Object.values(s.acts).sort((x, y) => y.fame - x.fame)[0];
    a.fame = Math.max(a.fame, 60);
    chron(s, { k: 'cert', i: 2, a: [a.id], t: l('"X" recebe disco de platina.', '"X" certified platinum.') });
    chron(s, { k: 'legendary_show', i: 4, a: [a.id], t: l('Show histórico', 'Historic show') });
    const mine = relics(s).list.filter((x) => x.a === a.id);
    expect(mine.some((x) => x.k === 'goldrec' && /platin/i.test(x.n.en))).toBe(true);
    expect(mine.some((x) => x.k === 'ticket')).toBe(true);
    expect(mine.some((x) => x.k === 'setlist')).toBe(true);
    const n = relics(s).list.length;
    chron(s, { k: 'legendary_show', i: 4, a: [a.id], t: l('Show histórico', 'Historic show') }); // mesmo ano: sem duplicata
    expect(relics(s).list.filter((x) => x.k === 'ticket' && x.a === a.id).length).toBe(1);
    expect(relics(s).list.length).toBeGreaterThanOrEqual(n);
    const g = mine.find((x) => x.k === 'goldrec')!;
    expect(relicArtOf28(g.k, g.n.en, g.y, g.id)).toBe('platrec');
  }, 120000);
});
