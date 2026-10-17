// BUGS33 · item 5 — jogar em TELA CHEIA (Fullscreen API). Botão "Tela cheia" no menu de pausa, nas Opções do jogo e nas
// Opções da tela inicial; tecla Alt+Enter em qualquer tela (F11 continua sendo a tela cheia do navegador). A
// preferência vale só nesta sessão (sessionStorage): o navegador só deixa entrar em tela cheia com um gesto do jogador,
// então, ligada, ela volta no primeiro clique ou tecla depois de recarregar a página.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { toast } from '../common';
import { h } from '../dom';

const KEY33 = 'vtn:fs33';
const doc = (): Document | undefined => (typeof document === 'undefined' ? undefined : document);
/** O navegador deixa usar tela cheia aqui (não num iframe sem permissão, por exemplo). */
export const fsAble33 = (): boolean => !!doc()?.fullscreenEnabled && typeof doc()?.documentElement.requestFullscreen === 'function';
export const fsOn33 = (): boolean => !!doc()?.fullscreenElement;
const wantFs33 = (): boolean => { try { return sessionStorage.getItem(KEY33) === '1'; } catch { return false; } };
const setWant33 = (v: boolean): void => { try { if (v) sessionStorage.setItem(KEY33, '1'); else sessionStorage.removeItem(KEY33); } catch { /* sem armazenamento */ } };

/** Liga/desliga a tela cheia (precisa vir de um clique ou tecla). */
export async function toggleFs33(on = !fsOn33()): Promise<void> {
  const d = doc();
  if (!d) return;
  setWant33(on);
  try {
    if (on && !d.fullscreenElement) {
      if (!fsAble33()) { toast(t(l('Este navegador não deixa o jogo ocupar a tela inteira aqui. Use F11.', 'This browser does not let the game fill the screen here. Use F11.')), 'bad'); setWant33(false); return; }
      await d.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } else if (!on && d.fullscreenElement) await d.exitFullscreen();
  } catch { toast(t(l('Não deu para entrar em tela cheia agora. Tente de novo ou use F11.', 'Could not go fullscreen now. Try again or use F11.')), 'bad'); }
}

export const FS_LABEL33 = l('Tela cheia', 'Fullscreen');
export const FS_KEY33 = 'Alt Enter';

/** Caixa de marcar das Opções (jogo e tela inicial). */
export function fsOption33(): HTMLElement {
  const box = h('input', { type: 'checkbox', 'data-opt': 'fs33', checked: fsOn33(), disabled: !fsAble33(), onchange: (e: Event) => { void toggleFs33((e.target as HTMLInputElement).checked); } }) as HTMLInputElement;
  doc()?.addEventListener('fullscreenchange', () => { box.checked = fsOn33(); });
  return h('label', { class: 'check', title: fsAble33() ? '' : t(l('Indisponível neste navegador (use F11)', 'Unavailable in this browser (use F11)')) },
    box, ' ', t(FS_LABEL33), h('small', { class: 'muted' }, ` · ${FS_KEY33}`));
}

let installed33 = false;
/** Alt+Enter em qualquer tela; com a preferência ligada, volta à tela cheia no primeiro gesto depois de recarregar. */
export function installFs33(): void {
  const d = doc();
  if (installed33 || !d || typeof window === 'undefined') return;
  installed33 = true;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.altKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopImmediatePropagation(); void toggleFs33(); }
  }, true);
  // Esc/F11 do navegador saem da tela cheia: a preferência acompanha
  d.addEventListener('fullscreenchange', () => { if (!d.fullscreenElement && wantFs33()) setWant33(false); });
  const again = (e: Event): void => {
    if (!wantFs33() || fsOn33()) { if (!wantFs33()) off(); return; }
    if (e instanceof KeyboardEvent && e.key === 'Enter' && e.altKey) return; // o próprio Alt+Enter já trata
    void toggleFs33(true); off();
  };
  const off = (): void => { window.removeEventListener('pointerdown', again, true); window.removeEventListener('keydown', again, true); };
  if (wantFs33()) { window.addEventListener('pointerdown', again, true); window.addEventListener('keydown', again, true); }
}
