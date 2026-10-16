// Rodada 19 (onda 5, B.5 — auditoria 8 §5): antes de avançar, a lista de cartões que vão valer a resposta padrão
// ("decidir agora" / "aceitar padrões"), com a opção de não perguntar de novo (Configurações). Também: o resumo dos avisos agrupados
// (r31 UNI-1: vista da fila única de atenção).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { autoResolve19 } from '../../sim/sys/budget19';
import { foldedSince } from '../../sim/attention';
import type { GameState } from '../../sim/types';
import { modal, rerender } from '../common';
import { h } from '../dom';
import { savePrefs, store } from '../store';

type Mode = 'week' | 'month' | 'quarter' | 'event' | 'until';
/** true = abriu o diálogo (o avanço espera a resposta e chama `go`). */
export function askAdvance19(g: GameState, mode: Mode, go: () => void): boolean {
  if (store.prefs.ask19 === false) return false;
  const xs = autoResolve19(g, mode);
  if (!xs.length) return false;
  let close = () => {};
  const body = h('div', { class: 'adv19' },
    h('p', null, t(l('{n} cartão(ões) vão valer a resposta padrão se você avançar agora:', '{n} card(s) will take the default answer if you advance now:'), { n: xs.length })),
    h('ul', { class: 'small' }, xs.map((x) => h('li', null, h('b', null, t(x.title)), ' → ', h('i', null, t(x.def)), ' ', h('span', { class: 'muted' }, `(${t(x.why)})`)))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => { close(); store.area = 'cockpit' as typeof store.area; rerender(); setTimeout(() => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' }), 50); } }, t(l('Decidir agora', 'Decide now'))),
      h('button', { class: 'btn primary', onclick: () => { close(); go(); } }, t(l('Aceitar padrões e avançar', 'Accept defaults and advance')))),
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', onchange: (e: Event) => { store.prefs.ask19 = !(e.target as HTMLInputElement).checked; savePrefs(); } }), ' ', t(l('Não perguntar de novo (dá para religar em Configurações)', 'Do not ask again (re-enable in Settings)'))));
  close = modal(t(l('Antes de avançar', 'Before advancing')), body);
  return true;
}

/** Linha para o diálogo de Configurações. */
export const settings19 = (): HTMLElement => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: store.prefs.ask19 !== false, onchange: (e: Event) => { store.prefs.ask19 = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Avisar antes de avançar quando cartões vão valer o padrão', 'Warn before advancing when cards will take the default')));

/** Avisos e mensagens menores agrupados neste mês (vista da fila única: os itens dos boletins semanais). */
export function folded19View(s: GameState): HTMLElement | null {
  const xs = foldedSince(s, s.clock.monthStartWeek);
  if (!xs.length) return null;
  return h('details', { class: 'small' }, h('summary', null, t(l('Agrupados no boletim este mês: {n} item(ns) menor(es)', 'Grouped in the bulletin this month: {n} minor item(s)'), { n: xs.length })), h('ul', null, xs.slice().reverse().map((x) => h('li', null, t(x.title)))));
}

