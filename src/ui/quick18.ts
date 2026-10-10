// Rodada 18 (item 15, base) — utilitários de usabilidade sem efeitos colaterais (importáveis por qualquer painel):
// estado vazio que explica o porquê e o próximo passo, paginação de listas longas (com "mostrar mais"), ações
// rápidas na linha do ato (página, conversar, dinâmica, hype com o porquê) e confirmação só onde é irreversível.

import { l, type L } from './../data/world';
import { t } from '../i18n/strings';
import { actHype } from '../sim/sys/hype12';
import { canTalk, talk } from '../sim/sys/people/talks';
import { stressOf } from '../sim/stress17';
import type { Act, GameState } from '../sim/types';
import { inspect, modal, rerender, toast } from './common';
import { h } from './dom';
import { store } from './store';
import { setTab } from './vis';
import './sys/core18.css';

/** Estado vazio: o que é, por que está vazio e um botão para resolver. */
export function emptyState18(what: L, why: L, act?: { label: L; run: () => void }): HTMLElement {
  return h('div', { class: 'empty18', role: 'note' }, h('b', null, t(what)), ' ', t(why), act ? h('div', null, h('button', { class: 'btn small', onclick: act.run }, t(act.label), ' →')) : null);
}

const PAGES = new Map<string, number>();
/** Paginação: devolve a fatia visível e o botão "mostrar mais" (estado por chave, só nesta sessão da interface). */
export function pager18<T>(key: string, items: T[], size = 30): { items: T[]; more: HTMLElement | null } {
  const n = PAGES.get(key) ?? size;
  const shown = items.slice(0, n);
  const more = items.length > n
    ? h('div', { class: 'pager18' }, h('span', { class: 'muted' }, t(l('{a} de {b}', '{a} of {b}'), { a: n, b: items.length })),
      h('button', { class: 'btn small ghost', onclick: () => { PAGES.set(key, n + size); rerender(); } }, t(l('Mostrar mais {k}', 'Show {k} more'), { k: Math.min(size, items.length - n) })),
      h('button', { class: 'btn small ghost', onclick: () => { PAGES.set(key, items.length); rerender(); } }, t(l('Mostrar tudo', 'Show all'))))
    : null;
  return { items: shown, more };
}

/** Confirmação só para o irreversível (vender, dispensar, demitir, apagar). */
export function confirm18(title: L, text: L, yes: L, run: () => void): void {
  let close = () => {};
  const body = h('div', null, h('p', null, t(text)),
    h('div', { class: 'row wrap' }, h('button', { class: 'btn primary', onclick: () => { close(); run(); } }, t(yes)), h('button', { class: 'btn ghost', onclick: () => close() }, t(l('Cancelar', 'Cancel')))));
  close = modal(t(title), body);
}

/** Botões rápidos na linha de um ato do elenco (sem precisar abrir a página). */
export function actQuick18(s: GameState, a: Act): HTMLElement {
  const lead = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members.find((m) => !s.persons[m]?.isPlayer);
  const blk = lead ? canTalk(s, lead) : l('Sem integrantes.', 'No members.');
  const hv = Math.round(actHype(s, a.id));
  const worst = a.members.map((m) => (s.persons[m]?.alive ? stressOf(s, m) : null)).filter(Boolean).sort((x, y) => y!.short - x!.short)[0];
  const stop = (e: Event) => e.stopPropagation();
  return h('span', { class: 'qa18', onclick: stop },
    h('span', { class: 'pill why18', 'data-why': 'act.hype', 'data-why-ctx': JSON.stringify({ act: a.id }), tabindex: '0', title: t(l('Hype agora', 'Hype now')) }, `🔥${hv}`),
    worst && (worst.level === 'strained' || worst.level === 'breaking') ? h('span', { class: `pill ${worst.level === 'breaking' ? 'bad' : 'warn'}`, title: t(l('Alguém sob estresse', 'Someone under stress')) }, '⚠') : null,
    h('button', { class: 'btn small ghost', title: t(l('Página do artista', 'Artist page')), 'aria-label': t(l('Página do artista', 'Artist page')), onclick: () => inspect.act(a.id) }, '🔎'),
    lead ? h('button', { class: 'btn small ghost', disabled: !!blk, title: t(blk ?? l('Elogiar o líder (moral)', 'Praise the leader (morale)')), 'aria-label': t(l('Elogiar o líder', 'Praise the leader')), onclick: () => { const r = talk(s, lead, 'praise'); toast(t(r.text), r.ok ? 'good' : 'bad'); rerender(); } }, '💬') : null,
    a.members.length >= 2 ? h('button', { class: 'btn small ghost', title: t(l('Dinâmica da banda', 'Band dynamics')), 'aria-label': t(l('Dinâmica da banda', 'Band dynamics')), onclick: () => { setTab('dyn18', 'band'); store.area = 'dyn18' as typeof store.area; rerender(); } }, '👥') : null,
  );
}
