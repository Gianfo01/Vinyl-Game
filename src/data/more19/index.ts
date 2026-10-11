// Rodada 19 (Frente 10, WP0) — índice dos pacotes de dados da onda 2. Cada pacote tem um arquivo-vaga já ligado
// (wp_a … wp_j): o agente do pacote só edita/cria arquivos dele; ninguém edita este índice nem os módulos consumidores.
// Os ganchos (append-only, sem duplicar id/nome) ficam em: realworld.REAL_ALL, producers15.REAL_PRODS,
// managers14.REAL_MGRS, labels10.EXTRA_LABELS/REAL_EXECS, venues17.VENUES17, catalog.STUDIOS/FESTIVALS,
// content.AWARDS/CHARTS, rights18.SOCS18, world4/milestones.MILESTONES. GEAR19 é tabela nova (gear19).
// A ordem dos pacotes abaixo é fixa (catalogNo dos artistas = posição em REAL_ALL): não reordene.

import { PACK as WP_A } from './wp_a';
import { PACK as WP_B } from './wp_b';
import { PACK as WP_C } from './wp_c';
import { PACK as WP_D1 } from './wp_d1';
import { PACK as WP_D2 } from './wp_d2';
import { PACK as WP_D3 } from './wp_d3';
import { PACK as WP_E } from './wp_e';
import { PACK as WP_F } from './wp_f';
import { PACK as WP_G } from './wp_g';
import { PACK as WP_H } from './wp_h';
import { PACK as WP_I } from './wp_i';
import { PACK as WP_J } from './wp_j';
import { LEGACY_FORERUNNERS19 } from './legacy';
import type { Gear19, Pack19, Studio19 } from './types';

export type { Gear19, Pack19, Studio19 } from './types';
export const PACKS19: Pack19[] = [WP_A, WP_B, WP_C, WP_D1, WP_D2, WP_D3, WP_E, WP_F, WP_G, WP_H, WP_I, WP_J];

const cat = <K extends Exclude<keyof Pack19, 'id'>>(k: K): NonNullable<Pack19[K]> => PACKS19.flatMap((p) => (p[k] ?? []) as unknown[]) as unknown as NonNullable<Pack19[K]>;
export const ARTISTS19 = cat('artists');
export const PRODS19 = cat('producers');
export const MGRS19 = cat('managers');
export const LABELS19 = cat('labels');
export const EXECS19 = cat('execs');
export const VENUES19 = cat('venues');
export const STUDIOS19: Studio19[] = cat('studios');
export const GEAR19: Gear19[] = cat('gear');
export const FESTS19 = cat('festivals');
export const AWARDS19 = cat('awards');
export const CHARTS19 = cat('charts');
export const SOCS19 = cat('societies');
export const MILESTONES19 = cat('milestones');
/** precursores aceitos pelo validador (estreia antes do nascimento do gênero), por nome normalizado */
export const FORERUNNERS19 = new Set([...LEGACY_FORERUNNERS19, ...cat('forerunners')].map((n) => norm19(n)));
/** nome normalizado (o mesmo de realworld.norm16): minúsculas, sem acento nem pontuação */
export function norm19(n: string): string {
  return n.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
}
