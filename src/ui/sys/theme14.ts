// Rodada 14 — botão claro/escuro no topo. Preferência em store.prefs.theme (localStorage via savePrefs,
// que já protege com try/catch); 'auto' (padrão) segue prefers-color-scheme do sistema.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { applyPrefs, savePrefs, store } from '../store';
import './theme14.css';

export function effectiveTheme(): 'light' | 'dark' {
  const p = store.prefs.theme;
  if (p === 'light' || p === 'dark') return p;
  try { return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; } catch { return 'light'; }
}

export function toggleTheme(): void {
  store.prefs.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
  savePrefs();
  applyPrefs();
}

export function themeButton(onChange: () => void): HTMLElement {
  const dark = effectiveTheme() === 'dark';
  const lbl = t(dark ? l('Mudar para tema claro', 'Switch to light theme') : l('Mudar para tema escuro', 'Switch to dark theme'));
  return h('button', { class: 'icon theme14', 'aria-label': lbl, title: lbl, 'aria-pressed': dark ? 'true' : 'false', onclick: () => { toggleTheme(); onChange(); } }, dark ? '☀' : '☾');
}
