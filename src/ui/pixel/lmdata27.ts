// Rodada 27 (I2b) — marcos que só existem no mapa do "Nosso mundo" (não mexem na simulação: nada de `music`).
// Cada um com o ano real de construção (e de demolição, quando houve); o desenho está em lmiso27.ts.
// city27.ts junta esta lista a LMX27 e os pesos a LMW27 (uma linha cada).

import { l } from '../../data/world';
import type { Landmark19, LmShape } from '../../data/landmarks19';

const m = (id: string, city: string, pt: string, en: string, from: number, sh: LmShape, fpt: string, fen: string, to?: number): Landmark19 =>
  ({ id, city, n: l(pt, en), from, sh, fact: l(fpt, fen), ...(to ? { to } : {}) });

export const LMX27B: Landmark19[] = [
  m('la_capitol', 'los_angeles', 'Torre da Capitol Records', 'Capitol Records Tower', 1956, 'needle', 'A torre redonda, como uma pilha de discos, foi inaugurada em 1956; a luz do topo pisca "Hollywood" em código Morse.', 'The round tower, like a stack of records, opened in 1956; the rooftop light blinks "Hollywood" in Morse code.'),
  m('nash_parthenon', 'nashville', 'Partenon de Nashville', 'Nashville Parthenon', 1897, 'temple', 'Réplica em tamanho real do Partenon, erguida para a Exposição do Centenário do Tennessee em 1897 (refeita em concreto nos anos 1920).', 'Full-scale replica of the Parthenon, built for the 1897 Tennessee Centennial Exposition (rebuilt in concrete in the 1920s).'),
  m('mem_stax', 'memphis', 'Stax (antigo Capitol Theatre)', 'Stax (old Capitol Theatre)', 1960, 'studio', 'A gravadora ocupou o velho cinema da McLemore Avenue em 1960; a marquise anunciava "Soul City USA". O prédio original foi demolido em 1989.', 'The label moved into the old McLemore Avenue cinema in 1960; the marquee read "Soul City USA". The original building was torn down in 1989.', 1989),
  m('det_rencen', 'detroit', 'Renaissance Center', 'Renaissance Center', 1977, 'spire', 'As torres cilíndricas de vidro à beira do rio Detroit abriram em 1977.', 'The cylindrical glass towers on the Detroit River opened in 1977.'),
  m('chi_water', 'chicago', 'Torre d\'Água', 'Water Tower', 1869, 'castle', 'A torre de calcário de 1869 foi um dos poucos prédios a sobreviver ao Grande Incêndio de 1871.', 'The 1869 limestone tower was one of the few buildings to survive the Great Fire of 1871.'),
  m('par_sacre', 'paris', 'Sacré-Cœur', 'Sacré-Cœur', 1914, 'dome', 'A basílica branca no alto de Montmartre ficou pronta em 1914 (consagrada em 1919).', 'The white basilica atop Montmartre was finished in 1914 (consecrated in 1919).'),
  m('rio_lapa', 'rio', 'Arcos da Lapa', 'Lapa Arches', 1750, 'arch', 'O aqueduto colonial de 1750; desde 1896 o bondinho de Santa Teresa passa por cima dele.', 'The 1750 colonial aqueduct; since 1896 the Santa Teresa tram has run across the top.'),
  m('kgn_devon', 'kingston', 'Devon House', 'Devon House', 1881, 'hall', 'Mansão de 1881 do primeiro milionário negro da Jamaica, George Stiebel.', 'The 1881 mansion of Jamaica\'s first Black millionaire, George Stiebel.'),
  m('kgn_marley', 'kingston', '56 Hope Road (Tuff Gong)', '56 Hope Road (Tuff Gong)', 1975, 'studio', 'Bob Marley comprou a casa em 1975 e montou ali o estúdio Tuff Gong; virou museu em 1986.', 'Bob Marley bought the house in 1975 and set up the Tuff Gong studio there; it became a museum in 1986.'),
  m('lag_carter', 'lagos', 'Ponte Carter', 'Carter Bridge', 1901, 'bridge', 'A primeira ponte entre a Ilha de Lagos e o continente abriu em 1901 (refeita nos anos 1970).', 'The first bridge between Lagos Island and the mainland opened in 1901 (rebuilt in the 1970s).'),
  m('lag_theatre', 'lagos', 'Teatro Nacional', 'National Theatre', 1976, 'dome', 'O teatro em forma de quepe militar foi aberto em 1976 para o festival FESTAC 77.', 'The theatre shaped like a military cap opened in 1976 for the FESTAC 77 festival.'),
  m('lag_mainland', 'lagos', 'Ponte do Terceiro Continente', 'Third Mainland Bridge', 1990, 'bridge', 'Com quase 12 km sobre a lagoa, foi aberta em 1990.', 'Almost 12 km long across the lagoon, it opened in 1990.'),
  m('syd_tower', 'sydney', 'Torre de Sydney', 'Sydney Tower', 1981, 'needle', 'A torre com a "torreta" dourada abriu em 1981.', 'The tower with the golden turret opened in 1981.'),
];

/** Peso de ícone dos novos marcos (quanto maior, mais cedo entra entre os 4 do mapa). */
export const LMW27B: Record<string, number> = {
  la_capitol: 8, nash_parthenon: 6, mem_stax: 8, det_rencen: 9, chi_water: 8, par_sacre: 8, rio_lapa: 5, kgn_devon: 5, kgn_marley: 9,
  lag_carter: 5, lag_theatre: 10, lag_mainland: 7, syd_tower: 7,
};
