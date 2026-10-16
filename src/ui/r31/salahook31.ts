// R31 · onda 2 · K — ganchos leves das salas em cena (sem importar a pilha de telas: a sede e o app só chamam isto).
// Preenchidos por ui/r31/salas31.ts.
import type { GameState } from '../../sim/types';

export const salaHook31: {
  /** abre a cena de uma sala ('studio', 'roster', 'team', 'catalog', 'talent', 'trophy', 'sig:<carreira>') */
  open?: (id: string) => void;
  /** a sala da sede (corte) tem cena e o jogador não pediu para pular as cenas */
  roomScene?: (room: string) => string | null;
  /** faixa "Salas em cena" logo abaixo do prédio da sede */
  strip?: (s: GameState) => HTMLElement | null;
  /** cena no topo de uma página (Elenco, Equipe, Catálogo, Estúdio, Talentos, Lendas) e se ela substitui a ilustração */
  top?: (area: string, s: GameState) => HTMLElement | null;
  owns?: (area: string) => boolean;
} = {};
