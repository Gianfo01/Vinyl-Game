// Rodada 19 (onda 4, equilíbrio) — PRESTÍGIO SEM TETO FÁCIL. Em 5 anos o selo equilibrado chegava a 93–100 de reputação
// artística (cada sistema soma pontos direto no campo). No fechamento do mês, a alta do mês acima de 50 rende menos quanto
// mais perto do topo (×(100−antes)/50, mínimo ×0,1) e o que passa de 85 desbota 0,25/mês sem trabalho novo.
// Vale para as quatro reputações. Lê: reputação (todos os sistemas que a mexem). Escreve: reputação e o "por quê" (sat19).

import { clamp } from '../../core/rng';
import { l } from '../../data/world';
import { registerExplain } from '../explain18';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';

type RepK = keyof GameState['player']['reputation'];
const KEYS: RepK[] = ['artistic', 'commercial', 'artists', 'institutional'];
export interface Sat19 { prev: Partial<Record<RepK, number>>; cut: Partial<Record<RepK, number>> }
declare module '../ext4' { interface Ext4 { sat19: Sat19 } }
const fresh = (): Sat19 => ({ prev: {}, cut: {} });
registerExt4('sat19', fresh);
export function sat19(s: GameState): Sat19 {
  const x = s.x4 as unknown as { sat19?: Sat19 };
  return (x.sat19 ??= fresh());
}
/** Quanto da alta sobra perto do topo (1 até 50; 0,1 no máximo). */
export const satFactor19 = (before: number): number => (before <= 50 ? 1 : clamp((100 - before) / 50, 0.1, 1));
export const FADE19 = 85;

export function satMonth19(s: GameState): void {
  const st = sat19(s), R = s.player.reputation;
  for (const k of KEYS) {
    const before = st.prev[k] ?? R[k];
    let v = R[k];
    if (v > before && v > 50) { const kept = before + (v - before) * satFactor19(Math.max(50, before)); st.cut[k] = Math.round((v - kept) * 10) / 10; v = kept; } else st.cut[k] = 0;
    if (v > FADE19) v -= 0.25;
    R[k] = clamp(v, 0, 100);
    st.prev[k] = R[k];
  }
}
registerSimHook('month', 'sat19', (s) => satMonth19(s));

registerExplain('sat19', (s, c) => {
  const k = (String(c.k ?? 'artistic') as RepK);
  const v = s.player.reputation[k];
  if (v === undefined) return null;
  return {
    title: l('Reputação perto do topo', 'Reputation near the top'), value: Math.round(v), fmt: 'num',
    parts: [
      { label: l('Acima de 50, cada alta rende menos (×(100 − atual)/50)', 'Above 50, each gain yields less (×(100 − current)/50)'), value: `×${Math.round(satFactor19(v) * 100) / 100}` },
      ...(sat19(s).cut[k] ? [{ label: l('Perdido para o teto no último mês', 'Lost to the ceiling last month'), value: -(sat19(s).cut[k] ?? 0), tone: 'bad' as const }] : []),
      ...(v > FADE19 ? [{ label: l('Acima de 85 a fama desbota sem trabalho novo', 'Above 85 renown fades without new work'), value: -0.25, tone: 'bad' as const }] : []),
    ],
    note: l('Prestígio máximo é raro: só quem segue entregando se mantém lá.', 'Top prestige is rare: only those who keep delivering stay there.'),
  };
});
