// Rodada 17 — o retrato envelhece com a pessoa, mantendo o rosto: cabelo grisalho aos poucos (alguns cedo,
// outros nunca, quem pinta não), entradas e calvície em parte dos homens, rugas (pés de galinha, olheiras,
// bigode chinês, testa) e, para alguns, uns quilos a mais depois dos 45. Vale para o jogador, NPCs e
// artistas reais (por cima do visual da fase). Tudo derivado do id (sem sorteio) e só na leitura do visual.

import { hashString } from '../../core/rng';
import type { Appearance } from '../../sim/types';

export interface AgeInfo { age: number; sx?: 'm' | 'f' | 'x' }
let AGE_FN: ((p: { id: string; born?: number }) => AgeInfo | undefined) | null = null;
export function setAgeResolver(fn: typeof AGE_FN): void { AGE_FN = fn; }
export const ageInfo = (p: { id: string; born?: number }): AgeInfo | undefined => AGE_FN?.(p);

/** Visual envelhecido (cópia). Idade < 36 devolve o próprio visual. */
export function ageLook(a: Appearance, age: number, seed: string, sx?: 'm' | 'f' | 'x'): Appearance {
  if (age < 36 || a.helm) return a;
  const h = hashString(`age17:${seed}`) >>> 0;
  const grayStart = 36 + (h % 22); // 36..57
  const dyed = a.hairColor >= 6 || a.roots !== undefined; // grisalho, platinado, tingido: não muda
  const gy = dyed ? 0 : Math.max(0, Math.min(10, Math.round((age - grayStart) / 2.6)));
  const male = (a.sx ?? sx) === 'm' || (!a.sx && sx !== 'f' && a.beard);
  const baldProne = male && (h >>> 5) % 100 < 42;
  const baldStart = 34 + ((h >>> 12) % 22);
  const bl = baldProne && a.hair > 0 ? (age >= baldStart + 14 ? 2 : age >= baldStart ? 1 : 0) : 0;
  const ag = age >= 70 ? 3 : age >= 56 ? 2 : age >= 42 ? 1 : 0;
  const heavy = age >= 46 && (h >>> 18) % 100 < 33 && a.body < 2 ? 1 : 0;
  if (!gy && !bl && !ag && !heavy) return a;
  return { ...a, ...(gy ? { gy } : {}), ...(bl ? { bl } : {}), ...(ag ? { ag } : {}), ...(heavy ? { body: a.body + 1 } : {}) };
}
