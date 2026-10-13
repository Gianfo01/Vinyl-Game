// R29 (feat de pessoa) — peças da interface do feat com PESSOA específica, usadas pela tela de sempre (round8.openFeatModal):
//  • featPicker29: busca enquanto digita sobre as pessoas com papel musical (nome da pessoa ou da banda), no máximo
//    FEAT_PICK_MAX29 resultados, agrupados pelo ato de casa; quem não pode aparece desabilitado com o motivo;
//  • featChips29: as pessoas já escolhidas (nome, papel, fama, banda) com ✕ para tirar.
// Mesmo visual do seletor do Submundo (crimepick29.css). Sem registro de seção/aba: importar este módulo não muda a ordem.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { FEAT_MAX_P29, featPersons29, homeAct29, searchFeatPersons29 } from '../../sim/sys/featp29';
import { personFame } from '../../sim/sys/fame15';
import { roleName29 } from '../../sim/sys/member29';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { ent27 } from '../ps/ent27';
import { actLink } from '../common';
import { openPersonPage } from '../pages';
import './crimepick29.css';

export const FEAT_PICK_MAX29 = 24;
const T = (x: L): string => t(x);

/** Busca de pessoas para o feat. `pick` recebe o id escolhido; `q` guarda o texto entre redesenhos da tela. */
export function featPicker29(s: GameState, hostId: string, chosen: string[], pick: (pid: string) => void, q: { v: string }): HTMLElement {
  const list = h('div', { class: 'tpick29-res', role: 'listbox', 'aria-label': T(l('Pessoas encontradas', 'People found')) });
  const input = h('input', {
    type: 'search', class: 'tpick29-q', value: q.v, autocomplete: 'off', spellcheck: 'false', 'data-featq29': '1',
    placeholder: T(l('Buscar pessoa ou banda (ex.: Freddie, Queen)…', 'Search person or band (e.g. Freddie, Queen)…')),
    'aria-label': T(l('Buscar pessoa para o feat', 'Search person for the feature')),
    oninput: () => { q.v = input.value; draw(); },
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === 'Enter') { const b = list.querySelector<HTMLButtonElement>('button.tpick29-it:not([disabled])'); if (b) { e.preventDefault(); b.click(); } }
      else if (e.key === 'ArrowDown') { const b = list.querySelector<HTMLButtonElement>('button.tpick29-it:not([disabled])'); if (b) { e.preventDefault(); b.focus(); } }
    },
  });
  const draw = (): void => {
    const groups = searchFeatPersons29(s, hostId, q.v, FEAT_PICK_MAX29);
    const full = chosen.length >= FEAT_MAX_P29;
    list.replaceChildren(...[
      !q.v.trim() ? h('p', { class: 'muted small' }, T(l('Sugestões: as pessoas disponíveis mais famosas. Digite para buscar qualquer integrante, solo ou músico.', 'Suggestions: the most famous available people. Type to search any member, soloist or musician.'))) : null,
      full ? h('p', { class: 'warn small' }, T(l('No máximo 4 pessoas por faixa.', 'At most 4 people per track.'))) : null,
      ...groups.flatMap((g) => [
        h('div', { class: 'tpick29-grp' }, g.name || T(l('Sem banda agora', 'No band right now'))),
        ...g.rows.map((x) => {
          const on = chosen.includes(x.pid);
          const why = x.block ?? (on ? l('Já escolhida.', 'Already picked.') : full ? l('Limite de pessoas.', 'People limit.') : null);
          return h('button', {
            type: 'button', class: `tpick29-it${on ? ' on' : ''}`, role: 'option', disabled: !!why, title: why ? T(why) : null, ...ent27('person', `p:${x.pid}`),
            onclick: () => { if (!why) { q.v = ''; pick(x.pid); } },
          }, h('b', null, x.name), h('small', { class: 'muted' }, ` · ${T(roleName29(x.role))} · ${T(l('fama', 'fame'))} ${Math.round(x.fame)}`),
          why && x.block ? h('span', { class: 'tpick29-why' }, T(x.block)) : null);
        }),
      ]),
      !groups.length ? h('p', { class: 'muted small' }, T(l('Ninguém encontrado com esse nome.', 'Nobody found with that name.'))) : null,
    ].filter((x): x is NonNullable<typeof x> => !!x));
  };
  draw();
  return h('div', { class: 'tpick29' }, input, list);
}

/** As pessoas escolhidas, com ✕ para tirar. */
export function featChips29(s: GameState, persons: string[], drop: (pid: string) => void): HTMLElement {
  return h('div', { class: 'row wrap', style: 'gap:6px' }, ...persons.map((pid) => {
    const p = s.persons[pid];
    const A = homeAct29(s, pid);
    return h('span', { class: 'pill', style: 'display:inline-flex;align-items:center;gap:4px' },
      h('b', { ...ent27('person', `p:${pid}`) }, p?.name ?? '?'),
      h('small', null, `${p ? T(roleName29(p.role)) : ''} · ${T(l('fama', 'fame'))} ${Math.round(personFame(s, pid).v)}${A ? ` · ${A.name}` : ''}`),
      h('button', { type: 'button', class: 'btn small ghost', 'aria-label': `${T(l('Tirar', 'Remove'))} ${p?.name ?? ''}`, onclick: () => drop(pid) }, '✕'));
  }));
}

/** Crédito do convidado de uma faixa: o ato (link) e/ou as pessoas (nome com o menu de pessoa). null = sem convidado. */
export function featCredit29(s: GameState, songId: string, actId?: string): HTMLElement | null {
  const ps = featPersons29(s, songId);
  if (!actId && !ps.length) return null;
  const xs: (HTMLElement | string)[] = actId ? [actLink(s, actId)] : [];
  for (const pid of ps) {
    if (xs.length) xs.push(' & ');
    xs.push(h('button', { type: 'button', class: 'link', ...ent27('person', `p:${pid}`), onclick: (e: Event) => { e.stopPropagation(); openPersonPage(pid); } }, s.persons[pid]?.name ?? '?'));
  }
  return h('span', null, ...xs);
}

/** "Pessoa específica…": abre o feat negociado de sempre (round8) já no modo pessoa — sob demanda (não muda a ordem). */
export function featPersonButton29(s: GameState, hostId: string, songId?: string, disabled = false): HTMLElement {
  return h('button', {
    type: 'button', class: 'btn small ghost', disabled,
    title: T(l('Convidar só um integrante, artista solo ou músico — sem a banda inteira (negociação do feat).', 'Invite just a member, soloist or musician — not the whole band (feature negotiation).')),
    onclick: () => { void import('./round8').then((m) => m.openFeatModal(s, { host: hostId, song: songId, mode: 'person' })); },
  }, T(l('Pessoa específica…', 'Specific person…')));
}
