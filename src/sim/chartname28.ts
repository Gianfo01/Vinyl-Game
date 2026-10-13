// Rodada 28 (F3, análise 10.2) — NOME DA PARADA PELO ANO. "WorldSound 100" e "WorldSound Albums" apareciam em 1889;
// "Billboard 200" (nome de 1992) em 1962. A parada mundial do jogo muda de nome como a referência real mudou:
//   músicas: catálogo dos fonógrafos (até 1912) → partituras mais vendidas (1913) → mais vendidos nas lojas (1940)
//            → WorldSound 100 (≈ Hot 100, 1958)
//   álbuns:  coleções de 78 rpm (até 1944) → LPs mais vendidos (1945) → Top LPs (1967) → WorldSound Albums (≈ Billboard 200, 1992)
// Com "nomes reais" ligado, vale o nome da Billboard da época. Puro (sem estado).

type W28 = 'singles' | 'albums';
const SINGLES: [number, string, string][] = [
  [0, 'Suplemento dos Fonógrafos', 'Phonograph Supplement'],
  [1913, 'WorldSound Partituras', 'Sheet Music Best Sellers'],
  [1940, 'WorldSound Mais Vendidos', 'Best Sellers in Stores'],
  [1958, 'WorldSound 100', 'Billboard Hot 100'],
];
const ALBUMS: [number, string, string][] = [
  [0, 'WorldSound Coleções 78', 'Record Album Sets'],
  [1945, 'WorldSound LPs', 'Best-Selling Popular Record Albums'],
  [1967, 'WorldSound Top LPs', 'Billboard Top LPs'],
  [1992, 'WorldSound Albums', 'Billboard 200'],
];
/** Nome da parada mundial no ano (fictício por padrão; o da Billboard com nomes reais). */
export function chartName28(which: W28, year: number, real = false): string {
  const list = which === 'singles' ? SINGLES : ALBUMS;
  let row = list[0];
  for (const x of list) if (year >= x[0]) row = x;
  return real ? row[2] : row[1];
}
