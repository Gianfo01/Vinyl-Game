// Troca de língua sem lista suspensa (dono, 2026-10-17): usada na tela inicial e nas opções.
import { S, t, type Lang } from '../../i18n/strings';
import { h } from '../dom';
import { store } from '../store';
import './lang5.css';

/** Troca de língua sem lista suspensa (dono, 2026-10-17): dois botões PT | EN, o ativo marcado. */
export function langToggle5(onPick: (v: Lang) => void, cls = ''): HTMLElement {
  const cur: Lang = store.prefs.lang === 'en' ? 'en' : 'pt';
  return h('span', { class: `lang5 ${cls}`.trim(), role: 'group', 'aria-label': t(S.language) },
    ...(['pt', 'en'] as Lang[]).map((v) => h('button', { type: 'button', class: v === cur ? 'on' : '', 'aria-pressed': String(v === cur), onclick: () => { if (v !== cur) onPick(v); } }, v.toUpperCase())));
}
