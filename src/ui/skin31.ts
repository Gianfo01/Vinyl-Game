// R31 (C) — estilo da interface por era: a parte com DOM. Grava no <html> o estilo efetivo (data-era-skin) e a década
// (data-era, só no automático), avisa discretamente quando a época troca o estilo e desenha a opção nas Opções.
// Só apresentação: não lê nem muda nada da simulação além do ano atual.

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { h } from './dom';
import { savePrefs, store } from './store';
import { SKINS31, resolveSkin31, skin31, skinNotice31, skinNoticeText31, skinOfYear31, skinPref31, type SkinId31, type SkinPref31 } from './skin31model';

let last: { sig: string; skin: SkinId31 } | null = null;

/** Chamado a cada desenho da partida: atributos no <html> e aviso de troca de época. */
export function applySkin31(year: number, sig: string): void {
  const root = document.documentElement;
  const pref = skinPref31(store.prefs);
  const skin = resolveSkin31(pref, year);
  root.dataset.eraSkin = skin;
  if (pref === 'auto') root.dataset.era = String(Math.floor(year / 10) * 10);
  else delete root.dataset.era;
  const prev = last && last.sig === sig ? last.skin : null; // partida nova ou carregada: sem aviso
  if (skinNotice31(prev, skin, pref, store.prefs.skinNotice31 !== false)) store.toast(t(skinNoticeText31(skin)), 'info');
  last = { sig, skin };
}

/** Grupo "Estilo da interface" nas Opções. */
export function settingsSkin31(rerender: () => void): HTMLElement {
  const p = store.prefs;
  const pref = skinPref31(p);
  const year = store.game?.year ?? NaN;
  const era = Number.isFinite(year) ? skin31(skinOfYear31(year)) : null;
  const now = skin31(resolveSkin31('auto', year));
  const opts: { value: SkinPref31; label: string }[] = [
    { value: 'auto', label: `${t(l('Automático pela época', 'Automatic by era'))} — ${t(l('agora', 'now'))}: ${t(now.name)}` },
    ...SKINS31.filter((s) => s.ready).map((s) => ({ value: s.id as SkinPref31, label: `${t(l('Fixo', 'Locked'))}: ${t(s.name)}` })),
  ];
  const sel = h('select', { onchange: (e: Event) => { p.skin31 = (e.target as HTMLSelectElement).value as SkinPref31; savePrefs(); rerender(); } },
    ...opts.map((o) => h('option', { value: o.value, selected: o.value === pref }, o.label))) as HTMLSelectElement;
  const hint = era && !era.ready
    ? t(l(`Época atual: ${era.name.pt} (${era.from}–${era.to}). Os estilos de cada época estão em preparação; até lá vale o Estúdio.`,
      `Current era: ${era.name.en} (${era.from}–${era.to}). The per-era styles are in the works; until then the Studio look applies.`))
    : t(l('As cenas em pixel não mudam; só a moldura da interface. Alto contraste e daltonismo valem por cima.', 'Pixel scenes do not change; only the interface frame. High contrast and colorblind modes apply on top.'));
  return h('div', { class: 'skin31-row' },
    h('label', null, t(l('Estilo da interface', 'Interface style')), sel),
    h('small', null, hint),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p.skinNotice31 !== false, disabled: pref !== 'auto', onchange: (e: Event) => { p.skinNotice31 = (e.target as HTMLInputElement).checked; savePrefs(); } }),
      t(l('Avisar quando a época trocar o estilo', 'Tell me when a new era changes the style'))));
}
