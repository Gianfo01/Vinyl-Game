// Rodada 29 — módulo-folha das GRAVADORAS ESCOLHIDAS na Nova run (config.labels29). Só tipos e registros: o worldgen,
// o lifecycle (novo selo independente), o rivals (falência e fusões) e o npc17 (NPCs abrem/fundem selos) consultam estes
// ganchos; quem os preenche é src/sim/sys/labels29start.ts. Sem `config.labels29` todos devolvem falso/nada e o
// fluxo de sempre segue intacto (nenhum sorteio a mais, nenhum a menos).

import type { GameState, Label, RunConfig } from './types';

/** Escolhas de gravadoras da Nova run (todas opcionais; ausente = o mundo de sempre). */
export interface Labels29 {
  /** atalho da Nova run rápida: poucas (3–5), algumas (6–10), muitas (11–20), mercado lotado (21–40) */
  n?: 'few' | 'some' | 'many' | 'crowded' | 'huge'; // R29: 'huge' = indústria gigante (41–120), sem teto depois de 1950
  /** número exato de gravadoras rivais no início (configuração completa; vale por cima do atalho) */
  count?: number;
  /** % de gravadoras reais (do catálogo) entre as iniciais; o resto é inventado no estilo da época (padrão 100) */
  real?: number;
  /** distribuição de porte: muitas indies pequenas, misto (padrão) ou poucas majors grandes */
  size?: 'indies' | 'mixed' | 'majors';
  /** onde ficam: na sua região, região ampliada (casa + América do Norte + Europa) ou o mundo todo (padrão) */
  spread?: 'home' | 'region' | 'world';
  /** quantos selos NOVOS aparecem durante a run (sorteado por ano; padrão "normal") */
  freq?: 'none' | 'rare' | 'normal' | 'frequent' | 'chaotic';
  /** 'off' = gravadoras rivais não fecham nem se fundem (falência vira socorro) */
  life?: 'off';
  /** gravadoras reais incluídas à força / excluídas */
  inc?: string[];
  exc?: string[];
  /** concorrentes da sua carreira no início (estúdios, festivais, agências…): atalho da rápida ou número exato */
  vn?: 'none' | 'few' | 'some' | 'many';
  ven?: number;
}

/** A parte "gravadoras" está ligada? (concorrentes da carreira, sozinhos, não mexem nas gravadoras) */
export const labelsOn29 = (cfg: Pick<RunConfig, 'labels29' | 'scenario17' | 'takeover'>): boolean => {
  const x = cfg.labels29;
  if (!x || cfg.scenario17) return false;
  return x.n !== undefined || x.count !== undefined || x.real !== undefined || x.size !== undefined || x.spread !== undefined || x.freq !== undefined || x.life !== undefined || !!x.inc?.length || !!x.exc?.length;
};

/** Ganchos preenchidos por sys/labels29start.ts (ausentes = comportamento de sempre). */
export const LB29: {
  /** antes do mundo: escolhe as reais e o número (grava em cfg.labels) */
  prep?: (cfg: RunConfig) => void;
  /** selo inventado nº i no começo (nome e cidade da época, porte pela distribuição) */
  gen?: (s: GameState, cfg: RunConfig, i: number) => { name: string; city: string; family: Label['family']; founded: number } | undefined;
  /** o lifecycle não abre o selo independente de sempre (a frequência sorteada assume) */
  newRival?: (s: GameState) => boolean;
  /** NPCs não abrem selos (frequência "nenhuma") */
  noFound?: (s: GameState) => boolean;
  /** rivais não fecham nem se fundem */
  noClose?: (s: GameState) => boolean;
} = {};
