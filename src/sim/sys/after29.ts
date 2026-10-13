// R29 (CONNECT): lista do que roda no fim do newgame do realworld (depois que os atos reais existem). Módulo sem imports
// de propósito: realworld ↔ lineup16 formam um ciclo e a ordem dos ganchos 'newgame' dependia da ordem dos imports.
import type { GameState } from '../types';
export const RW_AFTER_NEWGAME: ((s: GameState) => void)[] = [];
