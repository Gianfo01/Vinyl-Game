// Rodada 23 (A) — QUANDO UMA CENA INTERROMPE. Só interrompe o que tem consequência material (decisão) ou é marco
// excepcional; o resto vai para a caixa de entrada e fica no Álbum de cenas para rever depois.
//   'always'    decisão com consequência (sucessão, tribunal, evento de vida com escolha, resultado da run)
//   'milestone' marco (prêmio, nº 1, Hall, despedida, IPO, casamento/nascimento...)
//   'never'     rotina (crítica, entrevista, feira, rádio, vinhetas, show comum...)
// A preferência do jogador decide o corte: 'decisions' (só decisões), 'milestones' (marcos também, padrão), 'all' (tudo).
// Uma cena pode trazer `data.int23` para sobrepor a classe do tipo (ex.: scene17 maior vs. menor).

import type { Cutscene } from './ext4';

export type Interrupt23 = 'always' | 'milestone' | 'never';
export type IntPref23 = 'decisions' | 'milestones' | 'all';

/** Classe padrão por tipo de cena (tipos ausentes contam como 'milestone'). */
export const INTERRUPT23: Record<string, Interrupt23> = {
  // decisões com consequência material
  people_succession: 'always', lifeEvent: 'always', court: 'always', appeal: 'always',
  scenarioResult: 'always', challengeResult: 'always', run17Result: 'always', farewell: 'always',
  // marcos
  awards: 'milestone', number1: 'milestone', hall: 'milestone', hologram: 'milestone', ipo: 'milestone',
  goldfx: 'milestone', sublabel: 'milestone', long18year: 'milestone', cine18: 'milestone', life: 'milestone',
  moment16: 'milestone', festivalDay: 'milestone', w4_probe: 'milestone',
  // rotina: vai para a caixa de entrada
  review: 'never', interview: 'never', radio: 'never', vignette: 'never', fair: 'never', club: 'never',
  store: 'never', street: 'never', factory: 'never', clinic: 'never', mansion: 'never', videoset: 'never',
  busfx: 'never', agm: 'never', liveShow: 'never', sublabel_info: 'never', scene17: 'never',
};

const VALID = new Set<Interrupt23>(['always', 'milestone', 'never']);

/** Classe de uma cena (sobreposição em `data.int23` > tipo > 'milestone'). */
export function interruptOf23(cs: Pick<Cutscene, 'kind' | 'data'>): Interrupt23 {
  const o = cs.data?.int23 as Interrupt23 | undefined;
  if (o && VALID.has(o)) return o;
  return INTERRUPT23[cs.kind] ?? 'milestone';
}

/** A cena interrompe o jogador com esta preferência? */
export function shouldInterrupt23(level: Interrupt23, pref: IntPref23 = 'milestones'): boolean {
  if (pref === 'all') return true;
  if (level === 'always') return true;
  if (level === 'milestone') return pref === 'milestones';
  return false;
}

/** Preferência corrente (a interface atualiza a partir das Configurações; sem interface vale o padrão). */
export const INT_PREF23: { v: IntPref23 } = { v: 'milestones' };
