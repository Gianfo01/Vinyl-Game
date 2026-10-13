// Rodada 29 (REORG, M20) — interface dos presets de apresentação (em Opções). Prévia do que muda, aplicar e desfazer.
// Lê e grava store.prefs (vtn:prefs) e a vista do menu (view27); a partida não é tocada.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { INT_PREF23 } from '../../sim/interrupt23';
import { rerender } from '../common';
import { h } from '../dom';
import { savePrefs, store } from '../store';
import { applyDensity20 } from '../sys/ui20';
import { setView27, view27 } from './hub27model';
import { KEY_L29, PRESETS29, applyPreset29, detectPreset29, presetDiff29, type PresetId29, type PresetPrefs29, valL29 } from './presets29model';

const UNDO = 'vtn29.presetUndo';
const current = (): PresetPrefs29 => ({ ...(store.prefs as unknown as PresetPrefs29), menuView: view27() });
function write(p: PresetPrefs29): void {
  const { menuView, ...rest } = p;
  Object.assign(store.prefs, rest);
  if (menuView === 'simple' || menuView === 'full') setView27(menuView);
  INT_PREF23.v = (store.prefs.interrupt23 ?? 'milestones');
  savePrefs();
  applyDensity20();
}

/** Bloco de Opções: Guiado / Livre / Contemplativo, com prévia, aplicar e desfazer. */
export function presetsSettings29(): HTMLElement {
  const box = h('fieldset', { class: 'pr29' });
  let pick: PresetId29 | null = null;
  const draw = () => {
    const cur = current();
    const now = detectPreset29(cur);
    const diff = pick ? presetDiff29(cur, pick) : [];
    let undo: PresetPrefs29 | null = null;
    try { undo = JSON.parse(localStorage.getItem(UNDO) ?? 'null') as PresetPrefs29 | null; } catch { undo = null; }
    box.replaceChildren(
      h('legend', null, t(l('Estilo de apresentação', 'Presentation style'))),
      h('p', { class: 'small muted' }, t(l('Muda só como o jogo se apresenta (densidade, dicas, interrupções e ritmo). Regras, chances, custos, dificuldade e modo história não mudam.', 'Changes only how the game presents itself (density, tips, interruptions and pace). Rules, odds, costs, difficulty and story mode do not change.'))),
      h('div', { class: 'seg27', role: 'radiogroup', 'aria-label': t(l('Estilo de apresentação', 'Presentation style')) },
        ...PRESETS29.map((p) => h('button', { type: 'button', role: 'radio', 'aria-checked': (pick ?? now) === p.id ? 'true' : 'false', class: (pick ?? now) === p.id ? 'on' : '', onclick: () => { pick = p.id; draw(); } }, t(p.name))),
        h('span', { class: 'small muted pr29-now' }, now === 'custom' ? t(l('atual: personalizado', 'current: custom')) : t(l('atual: {p}', 'current: {p}'), { p: t(PRESETS29.find((x) => x.id === now)!.name) }))),
      pick ? h('div', { class: 'pr29-prev' },
        h('p', { class: 'small' }, t(PRESETS29.find((x) => x.id === pick)!.desc)),
        diff.length ? h('ul', { class: 'small' }, diff.map((d) => h('li', null, t(KEY_L29[d.key]), ': ', h('s', null, t(valL29(d.from))), ' → ', h('b', null, t(valL29(d.to)))))) : h('p', { class: 'small muted' }, t(l('Nada muda: já está assim.', 'Nothing changes: already set.'))),
        h('button', { type: 'button', class: 'btn small primary', disabled: !diff.length, onclick: () => { try { localStorage.setItem(UNDO, JSON.stringify(cur)); } catch { /* ignora */ } write(applyPreset29(cur, pick!)); pick = null; draw(); rerender(); } }, t(l('Aplicar este estilo', 'Apply this style')))) : '',
      undo ? h('button', { type: 'button', class: 'btn small ghost', onclick: () => { write(undo!); try { localStorage.removeItem(UNDO); } catch { /* ignora */ } draw(); rerender(); } }, t(l('Desfazer o último estilo aplicado', 'Undo the last applied style'))) : '');
  };
  draw();
  return box;
}
