// Rodada 19 (Frente 8, onda 4 — ux19): ganchos aditivos do app.ts (sem importar sistemas aqui, evita ciclo).
//  has: divulgação progressiva (a página entra no menu?) · navFoot: rodapé do menu ("mostrar tudo")
//  end: bloco extra da tela de fim (epitáfio, "por que perdi?", conquistas e herança)
import type { GameState } from '../sim/types';

export const UX19UI: {
  has: null | ((g: GameState, area: string) => boolean);
  navFoot: null | ((g: GameState) => HTMLElement | null);
  end: null | ((g: GameState) => HTMLElement | null);
} = { has: null, navFoot: null, end: null };
