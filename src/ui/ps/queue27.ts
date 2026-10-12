// Rodada 27 — uma janela por vez. No começo da partida várias camadas disputavam a tela (metas de abertura,
// passo do tutorial, dica "Primeira vez", tour da página e avisos). Agora há uma fila com prioridade:
//   1. metas de abertura (modal, ux19)  2. passo do tutorial (cartão, tutorial.ts)  3. dicas de 1ª vez (tutorial18)
// O tour da página não abre sozinho: só quando a pessoa aperta "?" (depois do tutorial da primeira partida).
// Avisos (toasts) podem coexistir, mas ficam atrás de qualquer modal (nav27.css).
// A decisão é pura (testável); quem mostra cada camada pergunta `mayShow27` antes e registra quando está pendente.

import type { GameState } from '../../sim/types';

export type Ov27 = 'opening' | 'tutorial' | 'tip' | 'tour';
/** Ordem de prioridade (o primeiro pendente passa na frente). */
export const OV_ORDER27: Ov27[] = ['opening', 'tutorial', 'tip', 'tour'];

/** Pura: a camada `kind` pode aparecer agora? Nenhuma de prioridade maior pendente e nada mais na tela. */
export function mayShowPure27(kind: Ov27, due: Ov27[], otherOnScreen: boolean): boolean {
  if (otherOnScreen) return false;
  const i = OV_ORDER27.indexOf(kind);
  return !due.some((d) => OV_ORDER27.indexOf(d) < i);
}
/** Pura: quem é a próxima camada a aparecer (ou nenhuma, se algo já está na tela). */
export function nextOverlay27(due: Ov27[], onScreen: boolean): Ov27 | null {
  if (onScreen) return null;
  return OV_ORDER27.find((k) => due.includes(k)) ?? null;
}

/** Pendências registradas por quem mostra cada camada (ux19: metas; tutorial.ts: passo do tutorial). */
const DUE: Partial<Record<Ov27, (g: GameState) => boolean>> = {};
const KICK: Partial<Record<Ov27, () => void>> = {};
/** `kick` (opcional) pede para a camada aparecer já (chamado depois de cada desenho, se ela for a próxima). */
export function registerOverlay27(kind: Ov27, due: (g: GameState) => boolean, kick?: () => void): void { DUE[kind] = due; if (kick) KICK[kind] = kick; }
export function due27(g: GameState): Ov27[] {
  return OV_ORDER27.filter((k) => { try { return !!DUE[k]?.(g); } catch { return false; } });
}

/** O que conta como "outra camada na tela" para cada tipo (o próprio tipo não se bloqueia). */
const SCREEN: Record<Ov27, string> = {
  opening: '.overlay, .scene-overlay',
  tutorial: '.tour18', // modal por cima: o cartão fica escondido por CSS e volta sozinho quando o modal fecha
  tip: '.overlay, .scene-overlay, .tour18, aside.tutorial',
  tour: '.overlay, .scene-overlay, aside.tutorial, .tip18',
};
/** Depois de cada desenho da tela: chama a próxima camada pendente (se nada estiver na tela). */
export function kick27(g: GameState): void {
  const due = due27(g);
  const on = typeof document !== 'undefined' && !!document.querySelector('.overlay, .scene-overlay, .tour18');
  const k = nextOverlay27(due, on);
  if (k) KICK[k]?.();
}
export function mayShow27(kind: Ov27, g: GameState): boolean {
  const on = typeof document !== 'undefined' && !!document.querySelector(SCREEN[kind]);
  return mayShowPure27(kind, due27(g), on);
}
