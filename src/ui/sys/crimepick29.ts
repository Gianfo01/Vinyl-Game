// Rodada 29 — seletor de alvo com busca do Submundo › Planos (troca o <select> fixo de 40 nomes). Cobre todas as
// pessoas (artistas e indústria), atos e selos do ano (sim/sys/crimetargets29.ts), agrupados e com o nome à vista.
// Rápido num mundo enorme: busca enquanto digita, no máximo 30 resultados desenhados (nunca milhares de opções);
// a lista se redesenha sozinha a cada tecla, sem redesenhar a tela (o foco fica no campo).
// Quem não vale para a ação aparece desabilitado com o motivo (morto, você, seu elenco, tipo errado, época).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { CrimeDef17 } from '../../sim/sys/crime17';
import { TGRP29, cand29, search29, type TGrp29, type TRes29 } from '../../sim/sys/crimetargets29';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { ent27 } from '../ps/ent27';
import type { CrimeForm17 } from './crimeform29';
import './crimepick29.css';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
export const PICK_MAX29 = 30;
const SUGGEST29 = 8;
const ENT29: Record<TGrp29, 'person' | 'act' | 'label' | null> = { person: 'person', industry: 'person', act: 'act', label: 'label', other: null };
const label29 = (x: TRes29): string => (x.grp === 'other' ? T(x.hint) : x.name);

/** O seletor: alvo atual (nome, detalhe e motivo) + busca + resultados agrupados. `pick` escolhe e redesenha a tela. */
export function targetPicker29(s: GameState, d: CrimeDef17, form: CrimeForm17, pick: (id: string) => void, actor = 'player'): HTMLElement {
  const cur = form.target ? cand29(s, d, form.target) : null;
  const list = h('div', { class: 'tpick29-res', role: 'listbox', 'aria-label': T(l('Alvos encontrados', 'Targets found')) });
  const input = h('input', {
    type: 'search', class: 'tpick29-q', value: form.q ?? '', autocomplete: 'off', spellcheck: 'false',
    placeholder: T(form.target ? l('Trocar alvo: buscar pessoa, artista, produtor, crítico, selo…', 'Change target: search person, act, producer, critic, label…') : l('Buscar alvo: pessoa, artista, produtor, crítico, selo…', 'Search target: person, act, producer, critic, label…')),
    'aria-label': T(l('Buscar alvo', 'Search target')), 'aria-expanded': 'false',
    oninput: () => { form.q = input.value; draw(); show(true); },
    onfocus: () => show(true),
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') { const b = list.querySelector<HTMLButtonElement>('button.tpick29-it:not([disabled])'); if (b) { e.preventDefault(); b.click(); } }
      else if (e.key === 'ArrowDown') { const b = list.querySelector<HTMLButtonElement>('button.tpick29-it:not([disabled])'); if (b) { e.preventDefault(); b.focus(); } }
    },
  });
  function item(x: TRes29): HTMLElement {
    const on = x.id === form.target;
    const ent = ENT29[x.grp];
    return h('button', {
      class: `tpick29-it${on ? ' on' : ''}${x.block ? ' off' : ''}`, type: 'button', role: 'option', 'aria-selected': on ? 'true' : 'false',
      disabled: !!x.block, title: x.block ? T(x.block) : T(l('Escolher este alvo', 'Pick this target')),
      ...(ent ? ent27(ent, ent === 'person' && !x.id.includes(':') ? `p:${x.id}` : x.id) : {}),
      onclick: () => { form.q = ''; pick(x.id); },
      onkeydown: (e: KeyboardEvent) => {
        const el = e.currentTarget as HTMLElement;
        const all = [...list.querySelectorAll<HTMLButtonElement>('button.tpick29-it:not([disabled])')];
        const i = all.indexOf(el as HTMLButtonElement);
        if (e.key === 'ArrowDown' && all[i + 1]) { e.preventDefault(); all[i + 1].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (all[i - 1] ?? input).focus(); }
      },
    },
      h('b', null, label29(x)),
      x.grp !== 'other' && T(x.hint) ? h('span', { class: 'muted' }, ` · ${T(x.hint)}`) : null,
      x.block ? h('span', { class: 'tpick29-why' }, T(x.block)) : null);
  }
  function draw(): void {
    const q = (form.q ?? '').trim();
    const r = search29(s, d, q, q ? PICK_MAX29 : SUGGEST29, actor);
    list.replaceChildren();
    if (!r.list.length) { list.append(h('p', { class: 'muted small' }, T(q ? l('Ninguém com esse nome nesta época.', 'Nobody by that name in this era.') : l('Sem alvos possíveis.', 'No possible targets.')))); return; }
    if (!q) list.append(h('p', { class: 'muted small tpick29-head' }, T(l('Sugestões (os mais famosos) — digite para achar qualquer um:', 'Suggestions (the most famous) — type to find anyone:'))));
    let grp: TGrp29 | null = null;
    for (const x of r.list) {
      if (q && x.grp !== grp) { grp = x.grp; list.append(h('div', { class: 'tpick29-grp', role: 'presentation' }, T(TGRP29[x.grp]))); }
      list.append(item(x));
    }
    if (r.total > r.list.length) list.append(h('p', { class: 'muted small' }, T(l('Mais {n} — refine a busca.', '{n} more — refine the search.')).replace('{n}', String(r.total - r.list.length))));
  }
  // a lista fica aberta sem alvo, com texto na busca ou com o foco no seletor; com alvo escolhido, recolhe
  const open = (): boolean => !form.target || !!(form.q ?? '').trim();
  function show(on: boolean): void { list.hidden = !on; input.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  draw();
  show(open());
  return h('div', {
    class: 'tpick29',
    onfocusout: (e: FocusEvent) => { const to = e.relatedTarget as Node | null; const w = e.currentTarget as HTMLElement; if (to && w.contains(to)) return; show(open()); },
    onkeydown: (e: KeyboardEvent) => { if (e.key === 'Escape' && !list.hidden && form.target) { e.stopPropagation(); form.q = ''; input.value = ''; draw(); show(false); input.focus(); } },
  },
    h('div', { class: 'tpick29-cur' },
      h('span', { class: 'muted small' }, `${T(l('Alvo', 'Target'))}: `),
      cur ? h('b', null, label29(cur)) : h('span', { class: 'muted' }, T(l('nenhum — busque abaixo', 'none — search below'))),
      cur && cur.grp !== 'other' && T(cur.hint) ? h('span', { class: 'muted small' }, ` · ${T(cur.hint)}`) : null),
    input,
    list);
}
