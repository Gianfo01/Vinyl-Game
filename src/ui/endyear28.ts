// Rodada 28 (F4, decisão do autor) — o jogador escolhe o ano de INÍCIO e o de FIM na Nova run (rápida e completa).
// O Recomendado sugere um fim (25 anos), editável; "Sem fim" é o sandbox. Ao chegar no fim, o storyboard oferece
// "Continuar em sandbox" (end28.ts). Por baixo é o mesmo prazo de sempre (config.runYears17 = fim − início + 1).

import { l } from '../data/world';
import { t } from '../i18n/strings';
import { END_MAX28, REC_YEARS28, endOf28, yearsFor28 } from '../sim/start28data';
import { h } from './dom';
import './end28.css';

export interface EndField28 { el: HTMLElement; refresh: () => void }

/** Campo "Ano de fim" + "Sem fim (sandbox)" + linha de ajuda. `get/set` leem e gravam os anos de partida (0 = sem fim). */
export function endYearField28(start: () => number, get: () => number, set: (years: number) => void, id = 'ny28-end'): EndField28 {
  const err = h('small', { class: 'bad', role: 'alert' });
  const note = h('small', { class: 'muted ny28-note' });
  const input = h('input', { type: 'number', id, min: start(), max: END_MAX28, step: 1, inputmode: 'numeric',
    onchange: (e: Event) => {
      const raw = Number((e.target as HTMLInputElement).value);
      if (!(raw >= start() && raw <= END_MAX28)) { err.textContent = t(l('Escolha um ano entre {a} e {b}.', 'Pick a year between {a} and {b}.'), { a: start(), b: END_MAX28 }); return; }
      err.textContent = '';
      set(yearsFor28(start(), raw));
      refresh();
    } }) as HTMLInputElement;
  const endless = h('input', { type: 'checkbox', id: `${id}-free`, onchange: (e: Event) => { set((e.target as HTMLInputElement).checked ? 0 : REC_YEARS28); err.textContent = ''; refresh(); } }) as HTMLInputElement;
  const rec = h('button', { type: 'button', class: 'link ny28-rec', onclick: () => { set(REC_YEARS28); err.textContent = ''; refresh(); } });
  function refresh(): void {
    const y = get();
    const end = endOf28(start(), y);
    input.min = String(start());
    input.disabled = end === null;
    input.value = end === null ? '' : String(end);
    endless.checked = end === null;
    rec.textContent = t(l('Recomendado: {n} anos (até {y})', 'Recommended: {n} years (to {y})'), { n: REC_YEARS28, y: start() + REC_YEARS28 - 1 });
    rec.hidden = y === REC_YEARS28;
    note.textContent = end === null
      ? t(l('Sem fim: o jogo segue enquanto você (e seus herdeiros) quiserem.', 'No end: the game goes on as long as you (and your heirs) want.'))
      : t(l('{n} anos. Em dezembro de {y}: storyboard da sua história, pontuação e a opção de continuar em sandbox.', '{n} years. In December {y}: your story\'s storyboard, score and the option to keep playing in sandbox.'), { n: y, y: end });
  }
  refresh();
  const el = h('div', { class: 'ny28' },
    h('label', { class: 'h27-field', for: id }, h('span', null, t(l('Ano de fim', 'End year'))), input, err),
    h('label', { class: 'check ny28-free', for: `${id}-free` }, endless, ' ', t(l('Sem fim (sandbox)', 'No end (sandbox)'))),
    h('div', { class: 'small' }, note, ' ', rec));
  return { el, refresh };
}
