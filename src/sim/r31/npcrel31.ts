// R31 CAR (sys/car31more.ts): gancho sem dependências para o disco de selo NPC passar pelo estúdio/editora do jogador
// (o gancho 'launch' só roda para lançamentos do jogador). Fica num módulo próprio para não criar ciclo de carga
// entre market.ts e os sistemas.
import type { GameState, Release } from '../types';

export const NPCREL31: { f?: (s: GameState, rel: Release) => void } = {};
