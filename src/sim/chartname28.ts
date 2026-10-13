// Rodada 28 (F3, análise 10.2) — NOME DA PARADA PELO ANO. "WorldSound 100" e "WorldSound Albums" apareciam em 1889;
// "Billboard 200" (nome de 1992) em 1962. A parada mundial do jogo muda de nome como a referência real mudou:
//   músicas: catálogo dos fonógrafos (até 1912) → partituras mais vendidas (1913) → mais vendidos nas lojas (1940)
//            → WorldSound 100 (≈ Hot 100, 1958)
//   álbuns:  coleções de 78 rpm (até 1944) → LPs mais vendidos (1945) → Top LPs (1967) → WorldSound Albums (≈ Billboard 200, 1992)
// Com "nomes reais" ligado, vale o nome da Billboard da época. Puro (sem estado).

import type { L } from '../data/world';

type W28 = 'singles' | 'albums';
/** [ano, fictício pt, fictício en, real (Billboard)] */
const SINGLES: [number, string, string, string][] = [
  [0, 'Suplemento dos Fonógrafos', 'Phonograph Supplement', 'Phonograph Supplement'],
  [1913, 'WorldSound Partituras', 'WorldSound Sheet Music', 'Sheet Music Best Sellers'],
  [1940, 'WorldSound Mais Vendidos', 'WorldSound Best Sellers', 'Best Sellers in Stores'],
  [1958, 'WorldSound 100', 'WorldSound 100', 'Billboard Hot 100'],
];
const ALBUMS: [number, string, string, string][] = [
  [0, 'WorldSound Coleções 78', 'WorldSound 78 Album Sets', 'Record Album Sets'],
  [1945, 'WorldSound LPs', 'WorldSound LPs', 'Best-Selling Popular Record Albums'],
  [1967, 'WorldSound Top LPs', 'WorldSound Top LPs', 'Billboard Top LPs'],
  [1992, 'WorldSound Albums', 'WorldSound Albums', 'Billboard 200'],
];
const row = (which: W28, year: number) => { const list = which === 'singles' ? SINGLES : ALBUMS; let r = list[0]; for (const x of list) if (year >= x[0]) r = x; return r; };
/** Nome da parada mundial no ano, nas duas línguas (fictício por padrão; o da Billboard com nomes reais). */
export function chartNameL28(which: W28, year: number, real = false): L {
  const r = row(which, year);
  return real ? { pt: r[3], en: r[3] } : { pt: r[1], en: r[2] };
}
/** Versão texto (português) para quem precisa de string. */
export function chartName28(which: W28, year: number, real = false): string {
  return chartNameL28(which, year, real).pt;
}
