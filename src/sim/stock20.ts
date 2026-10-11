// Rodada 20 (B25) — SENTINELA DE ESTOQUE ILIMITADO (schema documentado; sem migração).
//
// Release.stock = Infinity marca "estoque não modelado": lançamentos de NPC (launchNpcRelease) e de catálogo real
// (realworld) não têm prensagem/fábrica — vendem tudo o que a procura pede. Só o jogador tem estoque numérico.
// JSON não tem Infinity: no save o valor vira `null`. Não há reviver; por isso TODO consumidor deve:
//   1. guardar pelo dono (rel.owner === 'player') antes de ler o estoque — é o que supply/supply18/era1889 fazem; ou
//   2. usar unlimitedStock20(rel), que trata Infinity e null (save recarregado) como o mesmo sentinela.
// Nunca testar só `rel.stock !== Infinity`: depois de um save/load o null passa nesse teste e vira estoque 0.
// O teste r20-G3 faz o round-trip e confere que o comportamento do NPC é o mesmo antes e depois.
import type { Release } from './types';

/** Estoque não modelado (Infinity em memória, null depois de JSON). */
export const unlimitedStock20 = (rel: Pick<Release, 'stock'>): boolean => rel.stock === Infinity || rel.stock == null;
