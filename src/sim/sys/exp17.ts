// Rodada 17 (nav/carreiras) — experiência no ofício: cada degrau de notoriedade de uma carreira (Conhecido
// local → Nacional → Internacional → Lenda) faz ela pesar menos na sua agenda (você já tem contatos, rotina
// e equipe que sabe o caminho). Aparece na página da carreira com o porquê. Sem sorteio.

import type { GameState } from '../types';
import { careerDef, careers, registerLoad } from './careers12';
import { tierOf } from './notoriety14';

/** Fração da carga da carreira poupada por degrau (Desconhecido … Lenda). */
export const EXP_RELIEF17 = [0, 0.15, 0.25, 0.35, 0.45];
const tier = (s: GameState, id: string): number => tierOf((s.x4 as unknown as { noto14?: { v?: Record<string, number> } })?.noto14?.v?.[id] ?? 0);
/** Quanto da agenda a experiência devolve nesta carreira (0–0,2). */
export const expRelief17 = (s: GameState, id: string): number => (careerDef(id)?.load ?? 0) * EXP_RELIEF17[tier(s, id)];

registerLoad('exp17', (s) => -careers(s).active.reduce((t, id) => t + expRelief17(s, id), 0));
