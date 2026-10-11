// Rodada 19 (world19/hood19) — o BAIRRO da sede: nome e caráter por cidade e época (bairros musicais
// documentados) e clima da cidade (chuva/sol/neve). Cidades sem entrada usam um ciclo genérico.

import { l, type L } from './world';

export interface Hood19 { from: number; to: number; n: L; d: L }
const h = (from: number, to: number, pt: string, en: string, dpt: string, den: string): Hood19 => ({ from, to, n: l(pt, en), d: l(dpt, den) });

export const HOODS19: Record<string, Hood19[]> = {
  new_york: [h(0, 1930, 'Tin Pan Alley', 'Tin Pan Alley', 'A rua das editoras de partituras: pianos tocando em todas as janelas.', 'The sheet-music publishers\' street: pianos playing in every window.'),
    h(1930, 1958, 'Harlem', 'Harlem', 'Clubes de jazz, salões de baile e o Apollo.', 'Jazz clubs, ballrooms and the Apollo.'),
    h(1958, 1978, 'Greenwich Village', 'Greenwich Village', 'Cafés de folk, poetas e porões.', 'Folk cafés, poets and basements.'),
    h(1978, 2003, 'SoHo', 'SoHo', 'Lofts industriais viraram estúdios e galerias.', 'Industrial lofts turned into studios and galleries.'),
    h(2003, 9999, 'Williamsburg', 'Williamsburg', 'Bandas novas, bares em galpões e aluguel subindo.', 'New bands, warehouse bars and rising rents.')],
  london: [h(0, 1958, 'Denmark Street', 'Denmark Street', 'A "Tin Pan Alley" de Londres: editoras e lojas de instrumentos.', 'London\'s "Tin Pan Alley": publishers and instrument shops.'),
    h(1958, 1978, 'Soho', 'Soho', 'Clubes, cafés e estúdios na mesma quadra.', 'Clubs, cafés and studios on the same block.'),
    h(1978, 2000, 'Camden', 'Camden', 'Mercado, pubs com palco e cena alternativa.', 'Market, pubs with stages and an alternative scene.'),
    h(2000, 9999, 'Shoreditch', 'Shoreditch', 'Galpões criativos, grafite e startups.', 'Creative warehouses, graffiti and startups.')],
  rio: [h(0, 1958, 'Lapa', 'Lapa', 'Boêmia, samba e cabarés sob os Arcos.', 'Bohemia, samba and cabarets under the Arches.'),
    h(1958, 1990, 'Copacabana', 'Copacabana', 'Boates, apartamentos e a bossa nova.', 'Nightclubs, apartments and bossa nova.'),
    h(1990, 9999, 'Lapa', 'Lapa', 'A Lapa renasce: rodas de samba e casarões restaurados.', 'Lapa reborn: samba circles and restored townhouses.')],
  sao_paulo: [h(0, 1960, 'Centro', 'Downtown', 'Rádios, teatros e confeitarias.', 'Radio stations, theatres and tearooms.'),
    h(1960, 1990, 'Rua Augusta', 'Rua Augusta', 'Boates, a jovem guarda e lojas de disco.', 'Nightclubs, Jovem Guarda and record shops.'),
    h(1990, 9999, 'Vila Madalena', 'Vila Madalena', 'Bares, ateliês e estúdios em casas.', 'Bars, workshops and home studios.')],
  tokyo: [h(0, 1960, 'Ginza', 'Ginza', 'Cafés com vitrola e salões de dança.', 'Record-player cafés and dance halls.'),
    h(1960, 1990, 'Shinjuku', 'Shinjuku', 'Cafés de jazz e casas de rock.', 'Jazz cafés and rock houses.'),
    h(1990, 9999, 'Shimokitazawa', 'Shimokitazawa', 'Casas de show pequenas, brechós e bandas indie.', 'Small live houses, thrift shops and indie bands.')],
  paris: [h(0, 1940, 'Montmartre', 'Montmartre', 'Cabarés, pintores e acordeões.', 'Cabarets, painters and accordions.'),
    h(1940, 1970, 'Saint-Germain-des-Prés', 'Saint-Germain-des-Prés', 'Caves de jazz e existencialistas.', 'Jazz cellars and existentialists.'),
    h(1970, 2000, 'Pigalle', 'Pigalle', 'Lojas de instrumentos e clubes noturnos.', 'Instrument shops and night clubs.'),
    h(2000, 9999, 'Belleville', 'Belleville', 'Bares, grafite e estúdios baratos (por pouco tempo).', 'Bars, graffiti and cheap studios (for now).')],
  berlin: [h(0, 1961, 'Friedrichstraße', 'Friedrichstraße', 'Cabarés e salões de variedades.', 'Cabarets and variety halls.'),
    h(1961, 2005, 'Kreuzberg', 'Kreuzberg', 'Ocupações, punk e estúdios perto do Muro.', 'Squats, punk and studios near the Wall.'),
    h(2005, 9999, 'Friedrichshain', 'Friedrichshain', 'Clubes de techno em usinas antigas.', 'Techno clubs in old power plants.')],
  los_angeles: [h(0, 1960, 'Hollywood', 'Hollywood', 'Estúdios de cinema e de discos lado a lado.', 'Film and record studios side by side.'),
    h(1960, 1990, 'Sunset Strip', 'Sunset Strip', 'Clubes de rock e outdoors gigantes.', 'Rock clubs and giant billboards.'),
    h(1990, 9999, 'Silver Lake', 'Silver Lake', 'Cena indie, cafés e casas com estúdio.', 'Indie scene, cafés and houses with studios.')],
  nashville: [h(0, 1955, 'Lower Broadway', 'Lower Broadway', 'Honky-tonks e o Ryman.', 'Honky-tonks and the Ryman.'),
    h(1955, 9999, 'Music Row', 'Music Row', 'Casas viraram editoras e estúdios.', 'Houses turned into publishers and studios.')],
  memphis: [h(0, 9999, 'Beale Street', 'Beale Street', 'Blues, clubes e lojas de penhor.', 'Blues, clubs and pawn shops.')],
  new_orleans: [h(0, 1917, 'Storyville', 'Storyville', 'Salões onde o jazz nasceu.', 'Halls where jazz was born.'),
    h(1917, 9999, 'French Quarter', 'French Quarter', 'Bandas de metais nas esquinas.', 'Brass bands on every corner.')],
  detroit: [h(0, 1959, 'Paradise Valley', 'Paradise Valley', 'Clubes de jazz e blues.', 'Jazz and blues clubs.'),
    h(1959, 9999, 'West Grand Boulevard', 'West Grand Boulevard', 'Casas-estúdio e linha de montagem de hits.', 'House studios and a hit assembly line.')],
  chicago: [h(0, 1955, 'Bronzeville', 'Bronzeville', 'Blues elétrico e salões de baile.', 'Electric blues and ballrooms.'),
    h(1955, 1975, 'Record Row', 'Record Row', 'Gravadoras e distribuidoras na S. Michigan Ave.', 'Labels and distributors on S. Michigan Ave.'),
    h(1975, 9999, 'Wicker Park', 'Wicker Park', 'House music, bares e lofts.', 'House music, bars and lofts.')],
  liverpool: [h(0, 9999, 'Mathew Street', 'Mathew Street', 'Porões, armazéns e o porto.', 'Cellars, warehouses and the docks.')],
  manchester: [h(0, 9999, 'Northern Quarter', 'Northern Quarter', 'Armazéns de algodão viraram clubes.', 'Cotton warehouses turned into clubs.')],
  kingston: [h(0, 9999, 'Orange Street', 'Orange Street', 'A "Beat Street": lojas de disco e sound systems.', '"Beat Street": record shops and sound systems.')],
  buenos_aires: [h(0, 1960, 'Abasto', 'Abasto', 'Tango no mercado e nos cafés.', 'Tango in the market and the cafés.'),
    h(1960, 9999, 'San Telmo', 'San Telmo', 'Casarões, feiras e milongas.', 'Old houses, fairs and milongas.')],
  havana: [h(0, 9999, 'Vedado', 'Vedado', 'Cabarés, hotéis e orquestras.', 'Cabarets, hotels and orchestras.')],
  seattle: [h(0, 9999, 'Capitol Hill', 'Capitol Hill', 'Bares com palco e garagens.', 'Bars with stages and garages.')],
};
const GEN19: Hood19[] = [
  h(0, 1950, 'Centro antigo', 'Old downtown', 'Teatros, rádios e lojas de partitura.', 'Theatres, radio stations and sheet-music shops.'),
  h(1950, 1990, 'Bairro boêmio', 'Bohemian quarter', 'Bares com palco, gráficas e aluguel barato.', 'Bars with stages, print shops and cheap rent.'),
  h(1990, 9999, 'Distrito criativo', 'Creative district', 'Galpões reformados, cafés e aluguel em alta.', 'Refurbished warehouses, cafés and rising rents.'),
];
export const hoodAt19 = (city: string, year: number): Hood19 => { const xs = HOODS19[city] ?? GEN19; return xs.find((x) => year >= x.from && year < x.to) ?? xs[xs.length - 1]; };

/** Clima: probabilidade extra de chuva (0..1) e se neva no inverno. */
export const CLIMATE19: Record<string, { rain: number; snow?: boolean; sun?: boolean }> = {
  london: { rain: 0.6 }, manchester: { rain: 0.7 }, liverpool: { rain: 0.6 }, dublin: { rain: 0.65 }, seattle: { rain: 0.65 }, vancouver: { rain: 0.6 },
  rio: { rain: 0.15, sun: true }, los_angeles: { rain: 0.05, sun: true }, miami: { rain: 0.3, sun: true }, havana: { rain: 0.2, sun: true }, kingston: { rain: 0.2, sun: true },
  salvador: { rain: 0.2, sun: true }, sydney: { rain: 0.2, sun: true }, cairo: { rain: 0.02, sun: true }, las_vegas: { rain: 0.02, sun: true }, mexico_city: { rain: 0.3 },
  new_york: { rain: 0.3, snow: true }, chicago: { rain: 0.3, snow: true }, detroit: { rain: 0.3, snow: true }, boston: { rain: 0.3, snow: true }, toronto: { rain: 0.3, snow: true },
  montreal: { rain: 0.3, snow: true }, moscow: { rain: 0.3, snow: true }, stockholm: { rain: 0.35, snow: true }, berlin: { rain: 0.35, snow: true },
};
