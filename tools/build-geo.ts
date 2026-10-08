// Pré-processa Natural Earth 1:110m (pacote world-atlas, TopoJSON) num formato compacto do jogo.
// Uso: npx tsx tools/build-geo.ts
//
// Saídas:
//  - src/data/geo/countries.json  formas (arcos quantizados com delta + polígonos por país + lados de cada arco)
//                                 carregado sob demanda (import dinâmico) pelo mapa.
//  - src/data/geo/meta.json       nomes EN/PT por ISO alpha-3 e país de cada cidade (ponto-em-polígono),
//                                 importado de forma estática pela lógica de viagem.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CITIES } from '../src/data/world';
import { countryIndexAt, decodeGeo, locateCountry, type GeoFile } from '../src/data/geo';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const countriesLib = require('i18n-iso-countries');
countriesLib.registerLocale(require('i18n-iso-countries/langs/pt.json'));
countriesLib.registerLocale(require('i18n-iso-countries/langs/en.json'));

interface Topo {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
  objects: { countries: { geometries: { type: string; id?: string; properties: { name: string }; arcs: number[][] | number[][][] }[] } };
}

const atlasPath = require.resolve('world-atlas/countries-110m.json');
const atlasVersion = JSON.parse(readFileSync(join(dirname(atlasPath), 'package.json'), 'utf8')).version as string;
const topo = JSON.parse(readFileSync(atlasPath, 'utf8')) as Topo;

/** graus por unidade quantizada */
const Q = 0.04;

// Ids ausentes no Natural Earth 110m (territórios com reconhecimento limitado)
const SPECIAL: Record<string, { a3: string; pt: string }> = {
  'N. Cyprus': { a3: 'XNC', pt: 'Chipre do Norte' },
  Somaliland: { a3: 'XSL', pt: 'Somalilândia' },
  Kosovo: { a3: 'XKX', pt: 'Kosovo' },
};

// Nomes em PT mais curtos/usuais que os do pacote, quando diferem.
const PT_OVERRIDE: Record<string, string> = {
  USA: 'Estados Unidos', GBR: 'Reino Unido', RUS: 'Rússia', KOR: 'Coreia do Sul', PRK: 'Coreia do Norte',
  COD: 'RD do Congo', COG: 'Congo', IRN: 'Irã', SYR: 'Síria', LAO: 'Laos', VNM: 'Vietnã', TZA: 'Tanzânia',
  BOL: 'Bolívia', VEN: 'Venezuela', MDA: 'Moldávia', MKD: 'Macedônia do Norte', CZE: 'Tchéquia', TWN: 'Taiwan',
  PSE: 'Palestina', CIV: 'Costa do Marfim', SWZ: 'Essuatíni', FLK: 'Ilhas Malvinas', ATF: 'Terras Austrais Francesas',
  BIH: 'Bósnia e Herzegovina', DOM: 'República Dominicana', CAF: 'República Centro-Africana', ESH: 'Saara Ocidental',
  // grafias do português do Brasil
  KEN: 'Quênia', GRL: 'Groenlândia', BEN: 'Benin', MDG: 'Madagascar', KWT: 'Kuwait', ARM: 'Armênia', POL: 'Polônia',
  ROU: 'Romênia', LVA: 'Letônia', EST: 'Estônia', SVN: 'Eslovênia', NCL: 'Nova Caledônia', YEM: 'Iêmen', MMR: 'Mianmar',
  DJI: 'Djibuti', QAT: 'Catar', NLD: 'Países Baixos (Holanda)', ATA: 'Antártida',
};
const EN_OVERRIDE: Record<string, string> = {
  USA: 'United States', GBR: 'United Kingdom', RUS: 'Russia', KOR: 'South Korea', PRK: 'North Korea', COD: 'DR Congo',
  COG: 'Congo', IRN: 'Iran', SYR: 'Syria', LAO: 'Laos', VNM: 'Vietnam', TZA: 'Tanzania', BOL: 'Bolivia', VEN: 'Venezuela',
  MDA: 'Moldova', MKD: 'North Macedonia', CZE: 'Czechia', TWN: 'Taiwan', PSE: 'Palestine', CIV: "Côte d'Ivoire",
  BIH: 'Bosnia and Herzegovina', DOM: 'Dominican Republic', CAF: 'Central African Republic', FLK: 'Falkland Islands',
  ESH: 'Western Sahara', ATF: 'French Southern Lands', GNQ: 'Equatorial Guinea', SLB: 'Solomon Islands', SSD: 'South Sudan', SWZ: 'Eswatini',
};

// 1) arcos: decodifica, requantiza e codifica em delta
const [sx, sy] = topo.transform.scale;
const [tx, ty] = topo.transform.translate;
const arcs: number[][] = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  const pts: [number, number][] = [];
  for (const [dx, dy] of arc) {
    x += dx;
    y += dy;
    const lon = x * sx + tx;
    const lat = y * sy + ty;
    const qx = Math.round((lon + 180) / Q);
    const qy = Math.round((Math.max(-90, lat) + 90) / Q);
    const last = pts[pts.length - 1];
    if (!last || last[0] !== qx || last[1] !== qy) pts.push([qx, qy]);
  }
  if (pts.length === 1) pts.push([pts[0][0], pts[0][1]]);
  const out: number[] = [];
  let px = 0;
  let py = 0;
  for (const [qx, qy] of pts) {
    out.push(qx - px, qy - py);
    px = qx;
    py = qy;
  }
  return out;
});

// 2) países
const sides: number[][] = arcs.map(() => []);
const countries: GeoFile['countries'] = [];
for (const g of topo.objects.countries.geometries) {
  const name = g.properties.name;
  let a3: string = g.id ? countriesLib.numericToAlpha3(g.id) : undefined;
  let pt: string;
  let en = name;
  if (!a3) {
    const sp = SPECIAL[name];
    if (!sp) throw new Error(`sem código: ${name}`);
    a3 = sp.a3;
    pt = sp.pt;
  } else {
    pt = PT_OVERRIDE[a3] ?? countriesLib.getName(a3, 'pt') ?? name;
    en = EN_OVERRIDE[a3] ?? name;
  }
  const polys: number[][][] = g.type === 'Polygon' ? [g.arcs as number[][]] : (g.arcs as number[][][]);
  const idx = countries.length;
  for (const poly of polys) for (const ring of poly) for (const ref of ring) {
    const ai = ref < 0 ? ~ref : ref;
    if (!sides[ai].includes(idx)) sides[ai].push(idx);
  }
  countries.push({ id: g.id ?? a3, a3, en, pt, p: polys });
}

const file: GeoFile = {
  v: 1,
  q: Q,
  arcs,
  sides: sides.map((s) => [s[0] ?? -1, s[1] ?? -1]),
  countries,
};
const outDir = join(root, 'src/data/geo');
const json = JSON.stringify(file);
writeFileSync(join(outDir, 'countries.json'), json);

// 3) meta: nomes + país de cada cidade
const geo = decodeGeo(file);
const cities: Record<string, string> = {};
for (const c of CITIES) {
  const ci = locateCountry(geo, c.lon, c.lat);
  if (countryIndexAt(geo, c.lon, c.lat) < 0) console.log(`  ${c.id}: no mar na escala 1:110m → ${ci >= 0 ? geo.countries[ci].a3 : "?"}`);
  if (ci >= 0) cities[c.id] = geo.countries[ci].a3;
}
const names: Record<string, [string, string]> = {};
for (const c of countries) names[c.a3] = [c.en, c.pt];
const meta = { source: `Natural Earth 1:110m via world-atlas@${atlasVersion}`, names, cities };
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta));

console.log(`countries.json: ${(json.length / 1024).toFixed(1)} KB, ${countries.length} países, ${arcs.length} arcos`);
console.log(`meta.json: ${(JSON.stringify(meta).length / 1024).toFixed(1)} KB, ${Object.keys(cities).length}/${CITIES.length} cidades localizadas`);
