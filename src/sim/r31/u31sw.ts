// R31 · onda 3 (U) — interruptor das facções por país (módulo à parte, sem dependências, para o crime17 e o mob29
// lerem sem ciclo). Ligado: só as facções do país onde você está agem direto; as de fora vêm pelo intermediário; as
// facções crescem, encolhem e entram nos países vizinhos uma vez por ano. Desligado: a regra antiga (alcance pelo poder).
import { l } from '../../data/world';
import type { GameState } from '../types';
import { registerSwitch, sw } from './switches';

export const SW_U31 = 'u31';
registerSwitch({
  id: SW_U31, def: true, scope: 'game',
  desc: l('Facções por país: só as do seu país agem direto; as de fora pelo intermediário (mais caro, mais lento, com risco de traição); as facções crescem e entram nos países vizinhos.',
    'Factions by country: only those in your country act directly; foreign ones through the broker (dearer, slower, with a risk of betrayal); factions grow and move into neighbouring countries.'),
});
export const u31On = (s: GameState): boolean => sw<boolean>(s, SW_U31);
