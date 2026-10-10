// Rodada 17 — catálogo de RELÍQUIAS REAIS (interface mínima). O agente de dados (E) pode preencher mais peças
// com registerRelics17([...]) a partir de um arquivo de dados; o crime17 semeia as peças no acervo vivo do
// relics9 quando o ano chega (nunca antes: respeita a era) e marca onde ficam (cidade) para roubos e polícia.
// Valores em dólares reais (o relics9 converte com money()). Só peças documentadas (leilões/museus públicos).

import { l, type L } from '../data/world';
import type { RelicKind } from './sys/relics9';

export interface RelicDef17 {
  id: string;
  n: L;
  k: RelicKind;
  /** nome do ato/pessoa real de origem (liga ao ato do jogo quando existir) */
  who: string;
  /** ano a partir do qual a peça existe */
  y: number;
  /** valor em dólares reais (último leilão/estimativa pública) */
  v: number;
  /** cidade onde costuma ficar (museu/coleção) */
  city: string;
  /** dono atual por extenso (texto livre) */
  owner: string;
  story?: L;
}

export const RELICS17: RelicDef17[] = [];
const seen = new Set<string>();
/** Adiciona peças ao catálogo (ignora ids repetidos). */
export function registerRelics17(defs: RelicDef17[]): void {
  for (const d of defs) if (!seen.has(d.id)) { seen.add(d.id); RELICS17.push(d); }
}

registerRelics17([
  { id: 'carmen_turban', n: l('Turbante de frutas de Carmen Miranda', 'Carmen Miranda\'s fruit turban'), k: 'outfit', who: 'Carmen Miranda', y: 1941, v: 60000, city: 'rio', owner: 'Museu Carmen Miranda',
    story: l('O turbante virou símbolo do Brasil em Hollywood.', 'The turban became Brazil\'s symbol in Hollywood.') },
  { id: 'elvis_d18', n: l('Violão Martin D-18 de Elvis Presley (Sun Records)', 'Elvis Presley\'s Martin D-18 (Sun Records)'), k: 'guitar', who: 'Elvis Presley', y: 1954, v: 300000, city: 'memphis', owner: 'colecionador particular',
    story: l('Tocado nas primeiras gravações da Sun, em Memphis.', 'Played on the first Sun sessions in Memphis.') },
  { id: 'lennon_daylife', n: l('Letra manuscrita de "A Day in the Life" (John Lennon)', 'Handwritten "A Day in the Life" lyrics (John Lennon)'), k: 'lyrics', who: 'The Beatles', y: 1967, v: 1200000, city: 'london', owner: 'colecionador anônimo',
    story: l('Leiloada por 1,2 milhão de dólares em 2010.', 'Auctioned for $1.2 million in 2010.') },
  { id: 'hendrix_strat', n: l('Stratocaster branca de Jimi Hendrix (Woodstock)', 'Jimi Hendrix\'s white Stratocaster (Woodstock)'), k: 'guitar', who: 'Jimi Hendrix', y: 1969, v: 1300000, city: 'seattle', owner: 'Museum of Pop Culture',
    story: l('A guitarra do hino americano em Woodstock; comprada por Paul Allen em 1998.', 'The guitar of the Woodstock anthem; bought by Paul Allen in 1998.') },
  { id: 'mj_glove', n: l('Luva de strass de Michael Jackson (Motown 25)', 'Michael Jackson\'s rhinestone glove (Motown 25)'), k: 'outfit', who: 'Michael Jackson', y: 1983, v: 350000, city: 'los_angeles', owner: 'colecionador particular',
    story: l('A luva do primeiro moonwalk na TV.', 'The glove of the first televised moonwalk.') },
  { id: 'cobain_d18e', n: l('Violão Martin D-18E de Kurt Cobain (MTV Unplugged)', 'Kurt Cobain\'s Martin D-18E (MTV Unplugged)'), k: 'guitar', who: 'Nirvana', y: 1993, v: 6000000, city: 'seattle', owner: 'colecionador particular',
    story: l('Vendido por 6 milhões de dólares em 2020.', 'Sold for $6 million in 2020.') },
  { id: 'biggie_crown', n: l('Coroa do "Rei de Nova York" (The Notorious B.I.G.)', 'The "King of New York" crown (The Notorious B.I.G.)'), k: 'outfit', who: 'The Notorious B.I.G.', y: 1997, v: 594750, city: 'new_york', owner: 'colecionador particular',
    story: l('Usada no último ensaio de fotos; leiloada em 2020.', 'Worn at the last photo shoot; auctioned in 2020.') },
]);
