// Rodada 19 (Frente 0.6) — FACHADA ÚNICA DE RIVAIS. Cinco módulos falavam de rivais: `rivals.ts` (mês dos selos,
// falência), `rivals2.ts` (arquétipos, espionagem, segurança), `sys/rivals8.ts` (cartilhas e jogadas),
// `sys/rivals12.ts` (disputas na tela, distribuição e tensão) e `sys/rivalmind18.ts` (memória, alvo, pactos, sinais).
// Sistemas novos leem e escrevem rivalidade por aqui.
//
// Fonte única de cada número:
//   calor da rivalidade (você × selo) .. `s.rivalries[selo]`      → heat19 / addHeat19 / coolHeat19 (primitivas em util)
//   tensão com o distribuidor .......... rivals12 `Deal12.ten`     → tension19 (= rivals12.tension)
//   arquétipo / cartilha / perfil ....... rivals2 / rivals8         → rivalView19
//   intenções (alvo, pacto, sinais) .... rivalmind18 + jogadas de rivals8 + disputas abertas de rivals12 → intents19
// Leitura NUNCA cria estado (a memória do rival só é lida se já existir).
// Fatos-índice (emitIndexFact; ler com indexFacts): `rivalry_flare` (o calor cruza 50/75) e `rivalry_cool` (esfria de ≥50 para <20), emitidos por sys/facades19.ts.

import type { L } from '../data/world';
import { archetypeOf } from './rivals2';
import { observed18, type Mind18, type Sign18, mindOf18 } from './sys/rivalmind18';
import { playbookOf, rivalProfile, type Move, type PlaybookId, movesOf8 } from './sys/rivals8';
import { dealWith, openContests, rivalWho, type Contest } from './sys/rivals12';
import type { Act, GameState, Label } from './types';
import { addHeat, coolHeat, heatOf } from './util';

// ---------------------------------------------------------------- aliases (API antiga continua valendo)
export { ARCHETYPES, archetypeOf, buySecurity, spyOnRival } from './rivals2';
export { PLAYBOOKS, moveText, playbookOf, rivalProfile, rivals8, sceneName } from './sys/rivals8';
export { OPT_TXT, dealWith, endDeal, openContests, recentContests, respond, rivalWho, rivals12, tension as tension19 } from './sys/rivals12';
export { dependence18, mind18, observed18, rm18 } from './sys/rivalmind18';

// ---------------------------------------------------------------- calor
/** Calor da rivalidade com um selo (0 = nenhum; ~25 tenso; 50 rixa; 75+ guerra). */
export const heat19 = (s: GameState, lbId: string): number => heatOf(s, lbId);
/** Esquenta (d > 0). Com `max`, prende em 0..max. */
export const addHeat19 = (s: GameState, lbId: string, d: number, max?: number): number => addHeat(s, lbId, d, max);
/** Esfria `d` sem passar de 0. */
export const coolHeat19 = (s: GameState, lbId: string, d: number): number => coolHeat(s, lbId, d);
export type HeatBand19 = 'calm' | 'tense' | 'feud' | 'war';
export const heatBand19 = (v: number): HeatBand19 => (v >= 75 ? 'war' : v >= 50 ? 'feud' : v >= 25 ? 'tense' : 'calm');
export const HEAT_BAND19: Record<HeatBand19, L> = {
  calm: { pt: 'calma', en: 'calm' }, tense: { pt: 'tensa', en: 'tense' }, feud: { pt: 'rixa', en: 'feud' }, war: { pt: 'guerra', en: 'war' },
};

// ---------------------------------------------------------------- selos e atos rivais
/** Selos rivais ativos, do mais quente ao mais frio (empate: maior receita no ano). */
export function rivalLabels19(s: GameState, o: { min?: number; limit?: number } = {}): Label[] {
  return Object.values(s.labels).filter((x) => x.active && heatOf(s, x.id) >= (o.min ?? 0))
    .sort((a, b) => heatOf(s, b.id) - heatOf(s, a.id) || b.revenueYear - a.revenueYear).slice(0, o.limit ?? 999);
}
/** Atos em atividade de um selo rival (ou de todos os rivais, sem `lbId`). */
export function rivalActs19(s: GameState, lbId?: string): Act[] {
  return Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && (!lbId || a.owner === lbId) && s.labels[a.owner] && a.status !== 'retired' && a.status !== 'split')
    .sort((a, b) => b.fame - a.fame);
}

// archetypeOf memoriza no selo na 1ª leitura: a fachada lê numa cópia para não mudar o jogo.
const ro = (lb: Label): Label => (lb.archetype ? lb : { ...lb });

// ---------------------------------------------------------------- intenções
export interface Intents19 {
  lbId: string; heat: number; band: HeatBand19; playbook: PlaybookId; archetype: ReturnType<typeof archetypeOf>;
  target?: Mind18['target']; pact?: Mind18['pact']; signs: Sign18[]; read: L[]; moves: Move[]; contests: Contest[]; partner: boolean;
}
/** O que o selo quer de você: alvo e pacto (rivalmind18), sinais e leitura do analista, últimas jogadas (rivals8)
 *  e disputas abertas na sua tela (rivals12). */
export function intents19(s: GameState, lbId: string): Intents19 | undefined {
  const lb = s.labels[lbId];
  if (!lb) return undefined;
  const m = mindOf18(s, lbId);
  const obs = m ? observed18(s, lbId) : { signs: [], read: [] };
  const live = <T extends { until: number }>(x?: T): T | undefined => (x && x.until > s.week ? x : undefined);
  const heat = heatOf(s, lbId);
  return {
    lbId, heat, band: heatBand19(heat), playbook: playbookOf(ro(lb)), archetype: archetypeOf(ro(lb)),
    target: live(m?.target), pact: live(m?.pact), signs: obs.signs, read: obs.read,
    moves: movesOf8(s, lbId).slice(-6), contests: openContests(s).filter((c) => c.lb === lbId), partner: !!dealWith(s, lbId),
  };
}

export interface RivalView19 { lb: Label; who: L; heat: number; band: HeatBand19; playbook: PlaybookId; profile: ReturnType<typeof rivalProfile>; acts: number }
export function rivalView19(s: GameState, lbId: string): RivalView19 | undefined {
  const lb = s.labels[lbId];
  if (!lb) return undefined;
  const heat = heatOf(s, lbId);
  return { lb, who: rivalWho(s, lbId), heat, band: heatBand19(heat), playbook: playbookOf(ro(lb)), profile: rivalProfile(ro(lb)), acts: rivalActs19(s, lbId).length };
}

export const RIVAL_FACTS19 = ['rivalry_flare', 'rivalry_cool', 'rival_move', 'poach'] as const;
