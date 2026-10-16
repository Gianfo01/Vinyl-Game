// R31 · onda 4 (T2) — ganchos sem importação (evitam ciclo): quem já tinha a regra antiga chama o gancho; os sistemas novos
// (sim/sys/sealed31, sim/sys/customs31) preenchem `.f` ao carregar. Gancho vazio = regra antiga intacta.
import type { GameState } from '../types';

/** Empresa desmontada (desinvestimento sem comprador): devolve true quando os masters foram para a proposta fechada. */
export const SPLIT31: { f?: (s: GameState, lbId: string, rels: string[]) => boolean } = {};

/** Compra feita fora do país (martelo da casa de leilões): devolve true quando a carga passou para a alfândega real. */
export const IMPORT31: { f?: (s: GameState, o: { rid: string; price: number; from: string }) => boolean } = {};
