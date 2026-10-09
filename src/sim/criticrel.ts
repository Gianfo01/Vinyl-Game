// Relação do selo com cada crítico (rodada 8): mandar cópia antecipada, chamar para uma audição
// fechada ou rebater uma resenha em público mudam a relação, que pesa um pouco nas notas futuras dos
// seus lançamentos. Jabá descoberto vira escândalo.

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { registerExt4 } from './ext4';
import type { GameState } from './types';
import { fmtL, money, notify, post } from './util';

export interface CritRelState { rel: Record<string, number>; last: Record<string, number> }

declare module './ext4' { interface Ext4 { critrel: CritRelState } }
registerExt4('critrel', () => ({ rel: {}, last: {} }));
export const critRel = (s: GameState): CritRelState => (s as unknown as { x4: { critrel: CritRelState } }).x4.critrel;

/** −50 (inimizade) … +50 (simpatia). */
export const relWith = (s: GameState, critic: string): number => critRel(s).rel[critic] ?? 0;

/** Ajuste nas notas (escala 0–10): no máximo ±0,5. */
export function criticRelBonus(s: GameState, critic: string): number {
  return clamp(relWith(s, critic) / 100, -0.5, 0.5);
}

export type CritAction = 'advance' | 'listening' | 'rebut';
export const CRIT_ACTIONS: { id: CritAction; name: L; desc: L; cost: number; cooldown: number }[] = [
  { id: 'advance', name: l('Mandar cópia antecipada', 'Send an advance copy'), desc: l('Barato e educado: a relação melhora um pouco.', 'Cheap and polite: the relationship improves a little.'), cost: 150, cooldown: 8 },
  { id: 'listening', name: l('Audição fechada com jantar', 'Private listening with dinner'), desc: l('Melhora bastante, mas há risco de virar notícia de jabá.', 'Improves a lot, but it may become a payola story.'), cost: 900, cooldown: 16 },
  { id: 'rebut', name: l('Rebater a última resenha em público', 'Publicly rebut the last review'), desc: l('Rende atenção e fãs fiéis, mas o crítico vira inimigo.', 'Brings attention and loyal fans, but the critic becomes an enemy.'), cost: 0, cooldown: 26 },
];

export function criticAction(s: GameState, r: Rng, critic: string, act: CritAction): L | null {
  const st = critRel(s);
  const def = CRIT_ACTIONS.find((x) => x.id === act)!;
  const key = `${critic}:${act}`;
  if ((st.last[key] ?? -999) + def.cooldown > s.week) return l('Cedo demais para repetir.', 'Too soon to repeat.');
  const cost = money(s, def.cost);
  if (cost && s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  if (cost) post(s, `crit:${key}`, -cost, 'marketing', `Relação com crítico: ${critic}`);
  st.last[key] = s.week;
  const cur = relWith(s, critic);
  if (act === 'advance') st.rel[critic] = clamp(cur + 6, -50, 50);
  else if (act === 'listening') {
    st.rel[critic] = clamp(cur + 15, -50, 50);
    if (r.chance(0.12)) {
      st.rel[critic] = clamp(cur - 10, -50, 50);
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
      notify(s, fmtL(l('Vazou: jantar com {c} vira notícia de jabá.', 'Leaked: dinner with {c} becomes a payola story.'), { c: critic }), 'bad');
    }
  } else {
    st.rel[critic] = clamp(cur - 25, -50, 50);
    s.player.reputation.artists = clamp(s.player.reputation.artists + 2, 0, 100);
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 1, 0, 100);
  }
  // mantém o mapa enxuto
  const keys = Object.keys(st.last);
  if (keys.length > 120) for (const k of keys.slice(0, keys.length - 120)) delete st.last[k];
  return null;
}
