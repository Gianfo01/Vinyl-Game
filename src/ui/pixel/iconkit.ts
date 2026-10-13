// Paleta e acabamento comuns aos ícones 16×16 (icons.ts e icons17.ts), no estilo do pacote de arte:
// cores-base quentes (tom 3 da rampa), relevo com luz de cima à esquerda e contorno #170e12.

import { HOUSE, INK, relief } from './finish';
import { C, type Px } from './px';

/** Cores-base dos ícones. O relevo gera luz (tom 4–5) e sombra arroxeada (tom 0–2) a partir delas. */
export const K = {
  ink: INK,
  white: C('#efe4cf'),
  cream: C('#e6d2a6'),
  grey: HOUSE.cromado,
  dgrey: C('#5c5662'),
  gold: C('#cc9a48'),
  dgold: C('#8a5a26'),
  red: C('#bc3c36'),
  dred: HOUSE.vinho,
  green: C('#5c9448'),
  dgreen: C('#386034'),
  blue: C('#4a78ac'),
  dblue: C('#304c7c'),
  teal: C('#3c9c96'),
  orange: C('#d47a34'),
  brown: C('#94522e'),
  dbrown: HOUSE.mogno,
  skin: C('#e2b08c'),
  pink: C('#d88c9c'),
  purple: C('#7c5298'),
  black: C('#2e2830'),
  glass: C('#9cc4d0'),
  amber: C('#dca640'),
  paper: C('#d8c4a0'),
  /** Brilho pontual (só em material brilhante). */
  shine: C('#fff6e0'),
};

const SPEC = new Set<number>([K.gold, K.dgold, K.grey, K.black, K.glass, K.white, K.amber, HOUSE.latao]);

/** Aplica relevo e contorno a um ícone recém-desenhado em cores-base. */
export function finishIcon(p: Px): void {
  relief(p, { mode: 'regions', r: 3, slope: 0.8, spec: (c) => SPEC.has(c) });
  p.outline(INK);
}
