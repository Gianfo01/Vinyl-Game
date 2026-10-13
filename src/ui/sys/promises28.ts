// Rodada 28 (fase 5, C7) — promessas visíveis: verba comprometida, prazo e multa na proposta (mesa e formulário)
// e na ficha do ato. O Cockpit lista as abertas no cartão "Próximos compromissos" (cockpit27model).

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { PROM28_GOAL, PROM28_NAME, promiseRows28, promiseTerms28, type PromKind28 } from '../../sim/sys/promises28';
import type { Act, GameState, Offer } from '../../sim/types';
import { $, pill } from '../common';
import { h } from '../dom';
import './promises28.css';

const KINDS: PromKind28[] = ['priority', 'tour', 'freedom'];

/** "verba $X · prazo N sem. · multa $Y" de uma promessa ainda não feita. */
export function promTermsText28(s: GameState, act: Act, kind: PromKind28, termMonths = 36): string {
  const tm = promiseTerms28(s, act, kind, Math.round(termMonths * 4.35));
  return [
    tm.budget > 0 ? t(l('verba {v}', 'budget {v}'), { v: $(tm.budget) }) : t(l('sem verba', 'no budget')),
    kind === 'freedom' ? t(l('o contrato todo', 'the whole deal')) : t(l('prazo {n} sem.', 'due in {n} wk'), { n: tm.weeks }),
    t(l('multa {v}', 'penalty {v}'), { v: $(tm.penalty) }),
  ].join(' · ');
}

/** Caixas de promessa com os termos ao lado (proposta: mesa r27 e formulário clássico). */
export function promiseChecks28(s: GameState, act: Act, o: Pick<Offer, 'promises' | 'termMonths'>, onChange: () => void): HTMLElement {
  return h('fieldset', { class: 'prom28' }, h('legend', null, t(l('Promessas (viram obrigação)', 'Promises (become obligations)'))),
    KINDS.map((k) => h('label', { class: 'check', title: t(l('Cumprir: {g}. A verba sai do caixa livre até cumprir; descumprir paga a multa ao artista.', 'To keep it: {g}. The budget leaves free cash until kept; breaking it pays the artist the penalty.'), { g: PROM28_GOAL[k] }) },
      h('input', { type: 'checkbox', checked: o.promises.includes(k), onchange: (e: Event) => { const on = (e.target as HTMLInputElement).checked; o.promises = on ? [...o.promises.filter((x) => x !== k), k] : o.promises.filter((x) => x !== k); onChange(); } }),
      ' ', h('b', null, t(PROM28_NAME[k])), ' ', h('small', { class: 'muted' }, `(${promTermsText28(s, act, k, o.termMonths)})`))));
}

/** Lista das promessas do contrato na ficha do ato: estado, verba, prazo e multa. */
export function promiseList28(s: GameState, actId: string): HTMLElement | null {
  const rows = promiseRows28(s, actId);
  if (!rows.length) return null;
  return h('ul', { class: 'prom28-list' }, rows.map((r) => h('li', null,
    h('b', null, t(PROM28_NAME[r.kind])), ' ',
    r.state === 'kept' ? pill(t(l('cumprida ✓', 'kept ✓')), 'good') : r.state === 'broken' ? pill(t(l('quebrada ✗', 'broken ✗')), 'bad')
      : r.met ? pill(t(l('atendida — verba sai na semana', 'met — budget goes out this week')), 'good')
      : pill(r.kind === 'freedom' ? t(l('vale o contrato todo', 'for the whole deal')) : t(l('{n} sem. para cumprir', '{n} wk left'), { n: Math.max(0, r.weeksLeft) }), r.weeksLeft < 8 && r.kind !== 'freedom' ? 'warn' : ''),
    h('small', { class: 'muted' }, ' ',
      r.budget > 0 ? t(l('verba {s}/{b}', 'budget {s}/{b}'), { s: $(r.spent), b: $(r.budget) }) : t(l('sem verba', 'no budget')),
      ' · ', t(l('cumprir: {g}', 'to keep: {g}'), { g: PROM28_GOAL[r.kind] }),
      ' · ', t(l('multa {v}', 'penalty {v}'), { v: $(r.penalty) }),
      r.owed > 0 ? h('span', null, ' · ', pill(t(l('devendo {v} ao artista', 'owing {v} to the artist'), { v: $(r.owed) }), 'bad')) : null))));
}
