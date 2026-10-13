// R28 — registros dos ajustes do "peso do selo" (offers12.labelClout) num módulo-folha, sem imports de valor:
// labelrep28 (F8) registra aqui e offers12 lê daqui. Antes os vetores moravam em offers12 e, com o rival da F5
// (rivalsense28 → offers12) no mesmo ciclo de imports, labelrep28 podia rodar antes de offers12 inicializar (TDZ).
import type { L } from '../../data/world';
import type { GameState } from '../types';

/** r28 F8: ajustes da reputação de um selo NPC na visão do artista (processos, falências do CEO, escândalo do fundador). */
export const CLOUT_ADJ12: ((s: GameState, lbId: string) => number)[] = [];
/** …e o porquê que aparece nos contras do pacote. */
export const CLOUT_WHY12: ((s: GameState, lbId: string) => L | null)[] = [];
