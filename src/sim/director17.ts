// Rodada 17 — DIRETOR CRIATIVO = NARRADOR (unificados). O narrador escolhido no Novo Jogo (RunConfig.storyteller)
// é o diretor criativo da partida: além do ritmo dos eventos do mês e da voz das notícias (narrator13), ele decide
// quanto drama joga em TODOS os personagens (orçamento de situações, quantas entre NPCs), o tom (situações boas ×
// ruins) e quanta liberdade os NPCs têm para mudar o mundo (romper com empresários e selos, abrir gravadoras, trocar
// de carreira, guerras de preço…). A "liberdade do diretor" (RunConfig.freedom17) escala só o mundo dos NPCs.
// Puro: sem estado, sem sorteio.

import { l, type L } from '../data/world';
import type { GameState, StorytellerId } from './types';

export type Freedom17 = 'tight' | 'normal' | 'wild';
export interface Dir17 {
  /** multiplicador do orçamento de drama mensal */
  drama: number;
  /** teto de situações entre NPCs por mês */
  npc: number;
  /** multiplicador das jogadas dos NPCs no mundo (npc17) */
  world: number;
  /** −1 (sombrio) … +1 (luminoso): puxa situações ruins ou boas para a frente da fila */
  tone: number;
  /** o que o diretor faz (uma linha, para o Novo Jogo e o painel Mundo vivo) */
  how: L;
}

export const DIR17: Record<StorytellerId, Dir17> = {
  maestro: { drama: 1, npc: 3, world: 1, tone: 0, how: l('Situações em ondas para todos; NPCs com liberdade normal.', 'Situations in waves for everyone; NPCs with normal freedom.') },
  brisa: { drama: 0.7, npc: 2, world: 0.7, tone: 0.3, how: l('Poucas situações e mais leves; o mundo muda devagar.', 'Few, lighter situations; the world changes slowly.') },
  acaso: { drama: 1, npc: 3, world: 1.1, tone: 0, how: l('Situações sem curva nenhuma; NPCs imprevisíveis.', 'Situations with no curve at all; unpredictable NPCs.') },
  cronista: { drama: 0.9, npc: 3, world: 1.3, tone: 0, how: l('Pensa em décadas: NPCs mudam muito de carreira, abrem e fecham selos.', 'Thinks in decades: NPCs change careers a lot, open and close labels.') },
  tabloide: { drama: 1.3, npc: 5, world: 1.2, tone: -0.5, how: l('Muito drama para todo mundo, quase sempre escandaloso; rixas e rompimentos públicos.', 'Lots of drama for everyone, usually scandalous; public feuds and break-ups.') },
  poeta: { drama: 0.8, npc: 3, world: 0.9, tone: 0.6, how: l('Prefere situações de amor, arte e superação; menos crises.', 'Prefers situations about love, art and overcoming; fewer crises.') },
  cinico: { drama: 1.15, npc: 4, world: 1.15, tone: -0.4, how: l('Situações duras, NPCs calculistas: guerras de preço, aliciamento, traições.', 'Harsh situations, calculating NPCs: price wars, poaching, betrayals.') },
  locutor: { drama: 1.1, npc: 4, world: 1, tone: 0.2, how: l('Ritmo rápido de situações, com viradas e boas notícias no ar.', 'Fast pace of situations, with twists and good news on air.') },
};

export const FREEDOM17: Record<Freedom17, { name: L; desc: L; world: number; npc: number }> = {
  tight: { name: l('Contida', 'Restrained'), desc: l('NPCs mudam pouco: elencos e selos estáveis, quase nada de selos novos.', 'NPCs change little: stable rosters and labels, hardly any new labels.'), world: 0.55, npc: -1 },
  normal: { name: l('Normal', 'Normal'), desc: l('NPCs rompem, trocam de selo, abrem gravadoras e adotam estratégias de vez em quando.', 'NPCs break up, switch labels, open labels and adopt strategies now and then.'), world: 1, npc: 0 },
  wild: { name: l('Solta', 'Unleashed'), desc: l('O diretor tem carta branca: cada partida fica muito diferente (mais rupturas, selos novos, guerras).', 'The director has free rein: every run turns out very different (more break-ups, new labels, wars).'), world: 1.6, npc: 2 },
};

export const freedomOf = (s: GameState): Freedom17 => ((s.config as { freedom17?: Freedom17 }).freedom17 ?? 'normal');

/** Perfil efetivo do diretor nesta partida (narrador × liberdade). */
export function dir17(s: GameState): Dir17 {
  const d = DIR17[s.config.storyteller] ?? DIR17.maestro;
  const f = FREEDOM17[freedomOf(s)];
  return { ...d, world: d.world * f.world, npc: Math.max(1, d.npc + f.npc) };
}
