// R31 (C) + onda 4 (M) — estilo da interface por era: a parte com DOM. Grava no <html> o estilo efetivo (data-era-skin)
// e a década (data-era, só no automático), avisa na virada da época com ações (voltar ao anterior / fixar este / Opções)
// e desenha o grupo "Visual da interface" nas Opções (grade de estilos com amostra e pré-visualização).
// Só apresentação: não lê nem muda nada da simulação além do ano atual.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { h } from './dom';
import { savePrefs, store } from './store';
import { SKINS31, resolveSkin31, skin31, skinBack31, skinNotice31, skinNoticeText31, skinOfYear31, skinPref31, type SkinId31, type SkinPref31 } from './skin31model';

let last: { sig: string; skin: SkinId31 } | null = null;
/** Preenchido pelo app (abre as Opções) — evita ciclo de imports. */
export const skinHook31: { options?: () => void; rerender?: () => void } = {};

/** Troca animada (opcional; o CSS desliga com movimento reduzido). */
function fade31(): void {
  if (!store.prefs.skinAnim31) return;
  const root = document.documentElement;
  root.classList.remove('skin31-fade');
  void root.offsetWidth;
  root.classList.add('skin31-fade');
  setTimeout(() => root.classList.remove('skin31-fade'), 600);
}

/** Muda a preferência e redesenha (usado pelo aviso e pelas Opções). */
function setPref31(v: SkinPref31): void {
  store.prefs.skin31 = v;
  savePrefs();
  fade31();
  skinHook31.rerender?.();
}

/** Aviso discreto na virada: faixa com o texto e três ações; some sozinho depois de 12 s. */
function notice31(prev: SkinId31, next: SkinId31): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  host.querySelector('.skin31-notice')?.remove();
  let el: HTMLElement | null = null;
  const close = () => { el?.classList.add('out'); setTimeout(() => el?.remove(), 450); };
  const act = (label: string, fn: () => void) => h('button', { type: 'button', class: 'btn small', onclick: () => { close(); fn(); } }, label);
  el = h('div', { class: 'skin31-notice', role: 'status', 'data-skin31': next },
    h('p', null, t(skinNoticeText31(next))),
    h('div', { class: 'row' },
      act(t(skinBack31(prev)), () => setPref31(prev)),
      act(t(l('Fixar este', 'Lock this one')), () => setPref31(next)),
      act(t(l('Opções…', 'Options…')), () => skinHook31.options?.()),
      h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Fechar aviso', 'Close notice')), onclick: close }, '✕')));
  host.appendChild(el);
  setTimeout(close, 12000);
}

/** Chamado a cada desenho da partida: atributos no <html> e aviso de troca de época. */
export function applySkin31(year: number, sig: string): void {
  const root = document.documentElement;
  const pref = skinPref31(store.prefs);
  const skin = resolveSkin31(pref, year);
  if (root.dataset.eraSkin && root.dataset.eraSkin !== skin && last?.sig === sig) fade31();
  root.dataset.eraSkin = skin;
  if (pref === 'auto') root.dataset.era = String(Math.floor(year / 10) * 10);
  else delete root.dataset.era;
  const prev = last && last.sig === sig ? last.skin : null; // partida nova ou carregada: sem aviso
  if (prev && skinNotice31(prev, skin, pref, store.prefs.skinNotice31 !== false)) notice31(prev, skin);
  last = { sig, skin };
}

/** Grupo "Visual da interface" nas Opções: menu (acessível) + grade de amostras + pré-visualização. */
export function settingsSkin31(rerender: () => void): HTMLElement {
  const p = store.prefs;
  const pref = skinPref31(p);
  const year = store.game?.year ?? NaN;
  const era = Number.isFinite(year) ? skin31(skinOfYear31(year)) : null;
  const now = skin31(resolveSkin31('auto', year));
  const years = (id: SkinId31) => { const s = skin31(id); return s.id === 'estudio' ? t(l('clássico', 'classic')) : `${s.from}–${s.to}`; };
  const choose = (v: SkinPref31) => { p.skin31 = v; savePrefs(); fade31(); rerender(); };
  const opts: { value: SkinPref31; label: string }[] = [
    { value: 'auto', label: `${t(l('Automático pela época', 'Automatic by era'))} — ${t(l('agora', 'now'))}: ${t(now.name)}${era ? ` (${era.from}–${era.to})` : ''}` },
    ...SKINS31.filter((s) => s.ready).map((s) => ({ value: s.id as SkinPref31, label: `${t(l('Fixo', 'Locked'))}: ${t(s.name)}` })),
  ];
  const sel = h('select', { 'aria-label': t(l('Estilo da interface', 'Interface style')), onchange: (e: Event) => choose((e.target as HTMLSelectElement).value as SkinPref31) },
    ...opts.map((o) => h('option', { value: o.value, selected: o.value === pref }, o.label))) as HTMLSelectElement;
  // pré-visualizar: com o botão ligado, passar o mouse (ou o foco) num estilo mostra-o; sair da grade volta ao atual
  let preview = false;
  const root = document.documentElement;
  const restore = () => { root.dataset.eraSkin = resolveSkin31(pref, year); };
  const peek = (id: SkinId31) => { if (preview) root.dataset.eraSkin = id; };
  const pvBtn = h('button', { type: 'button', class: 'btn small', 'aria-pressed': 'false', onclick: (e: Event) => {
    preview = !preview; (e.currentTarget as HTMLElement).setAttribute('aria-pressed', String(preview)); if (!preview) restore();
  } }, t(l('Pré-visualizar', 'Preview')));
  const card = (v: SkinPref31) => {
    const s = v === 'auto' ? null : skin31(v);
    const sw = s ? h('span', { class: 'skin31-sw', 'aria-hidden': 'true' }, ...s.sw.map((c) => h('i', { style: `background:${c}` }))) : h('span', { class: 'skin31-sw auto', 'aria-hidden': 'true' });
    return h('li', null, h('button', {
      type: 'button', class: 'skin31-card', role: 'radio', 'aria-checked': String(v === pref), 'data-skin': v,
      onclick: () => choose(v), onpointerenter: () => s && peek(s.id), onfocus: () => s && peek(s.id),
    }, sw,
    h('b', null, h('span', { class: 'skin31-aa', 'aria-hidden': 'true' }, 'Aa'), s ? t(s.name).replace(/ \(.*\)$/, '') : t(l('Automático', 'Automatic'))),
    h('small', null, s ? years(s.id) : t(l('pela época', 'by era')))));
  };
  const grid = h('ul', { class: 'skin31-grid', role: 'radiogroup', 'aria-label': t(l('Estilos', 'Styles')), onpointerleave: () => preview && restore(), onfocusout: (e: FocusEvent) => { if (preview && !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) restore(); } },
    card('auto'), card('estudio'), ...SKINS31.filter((s) => s.ready && s.id !== 'estudio').map((s) => card(s.id)));
  return h('fieldset', { class: 'skin31 skin31-row' },
    h('legend', null, t(l('Visual da interface', 'Interface look'))),
    sel,
    h('div', { class: 'row' }, pvBtn),
    grid,
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.skinNotice31 !== false, disabled: pref !== 'auto', onchange: (e: Event) => { p.skinNotice31 = (e.target as HTMLInputElement).checked; savePrefs(); } }),
      t(l('Avisar quando uma nova época trocar o visual', 'Tell me when a new era changes the look'))),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: !!p.skinAnim31, onchange: (e: Event) => { p.skinAnim31 = (e.target as HTMLInputElement).checked; savePrefs(); } }),
      t(l('Animar a troca (respeita "movimento reduzido")', 'Animate the change (respects "reduced motion")'))),
    h('p', { class: 'skin31-note' }, t(l('Só aparência: nenhuma regra muda. As cenas em pixel ficam iguais; alto contraste, daltonismo e tamanho do texto continuam valendo por cima de qualquer visual.',
      'Looks only: no rule changes. Pixel scenes stay the same; high contrast, colorblind modes and text size still apply on top of any look.'))));
}
