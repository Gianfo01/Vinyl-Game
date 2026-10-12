// r25: formações de artistas reais que não tinham lista de integrantes (banda virava uma pessoa só com o nome da banda).
// Lotes 1–5: classificação solo × grupo + integrantes; lotes w: conferidos na web (Wikipedia etc.) e têm prioridade.
import type { RealMember } from './realtypes';
import { MEMBERS25_1 } from './members25_1';
import { MEMBERS25_2 } from './members25_2';
import { MEMBERS25_3 } from './members25_3';
import { MEMBERS25_4 } from './members25_4';
import { MEMBERS25_5 } from './members25_5';

const WEB25: Record<string, RealMember[]>[] = [];
export const MEMBERS25: Record<string, RealMember[]> = Object.assign({}, MEMBERS25_1, MEMBERS25_2, MEMBERS25_3, MEMBERS25_4, MEMBERS25_5);
for (const w of WEB25) for (const [k, v] of Object.entries(w)) if (v.length || !MEMBERS25[k]?.length) MEMBERS25[k] = v;

/** Preenche `m` só de quem não tinha integrantes; grupo sem formação conhecida continua como está. */
export function applyMembers25<T extends { n: string; m?: RealMember[] }>(xs: T[]): number {
  let n = 0;
  for (const a of xs) {
    if (a.m?.length) continue;
    const m = MEMBERS25[a.n];
    if (m?.length) { a.m = m.map((x) => [...x] as RealMember); n++; }
  }
  return n;
}
