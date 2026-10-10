// Rodada 18 (decide18) — interface das CONSEQUÊNCIAS: cada opção do cartão mostra "agora" × "depois" (com incerteza,
// sem spoiler), aposta com chance (tooltip encadeado), opção travada com o motivo e o relógio dos prazos curtos.
// Também a lista "Consequências pendentes" (Cockpit e Caixa) e a voz do remetente (relação/traços) na Caixa.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { conseq18, evKey18, fuzzy18, TONE18_TXT } from '../../sim/decide18';
import { dec18, gateOf18, odds18, pending18 } from '../../sim/sys/decide18';
import { per13 } from '../../sim/sys/persona13';
import type { InboxMsg } from '../../sim/sys/people/state';
import type { Decision, DecisionOption, GameState } from '../../sim/types';
import { dateOfDay, fmtL } from '../../sim/util';
import { monthName } from '../common';
import { h } from '../dom';
import { ic, portrait } from '../vis';
import './decide18.css';

const TONE_IC: Record<string, string> = { good: '▲', bad: '▼', mixed: '◆', miss: '·' };

/** Texto + prévias de uma opção (dentro do botão). */
export function decOptBody18(s: GameState, d: Decision, o: DecisionOption): (HTMLElement | null)[] {
  const c = conseq18(evKey18(d.eventId, o.id));
  const lock = o.id === d.defaultOption ? null : gateOf18(s, d.eventId, o.id, d.ctx);
  const od = odds18(s, d.eventId, o.id, d.ctx);
  const later = c?.later ?? [];
  return [
    h('span', { class: 'dc18-lb' }, lock ? '🔒 ' : '', t(o.label), od ? h('b', { class: `dc18-odds ${od.p >= 0.5 ? 'good' : 'bad'} why18`, 'data-why': 'dec18.odds', 'data-why-ctx': JSON.stringify({ d: d.id, opt: o.id }), tabindex: '0' }, ` ${Math.round(od.p * 100)}%`) : null),
    lock ? h('small', { class: 'dc18-lock' }, t(lock)) : null,
    c?.now || o.hint ? h('small', { class: 'dc18-now' }, h('b', null, t(l('Agora: ', 'Now: '))), t(c?.now ?? o.hint)) : null,
    later.length ? h('small', { class: 'dc18-later' }, h('b', null, t(l('Depois: ', 'Later: '))),
      later.map((e, i) => h('span', { class: `dc18-e ${e.tone}` }, i ? ' · ' : '', TONE_IC[e.tone], ' ', t(e.hint), ' ', h('i', null, `(${t(TONE18_TXT[e.tone])}, ${t(fuzzy18(typeof e.p === 'number' ? e.p : 0.5))}, ${e.in[0]}–${e.in[1]} ${t(l('meses', 'months'))})`)))) : null,
    c?.unlock ? h('small', { class: 'dc18-unl' }, '🔓 ', t(l('Abre opções em decisões futuras.', 'Opens options in future decisions.'))) : null,
  ];
}
export const decLocked18 = (s: GameState, d: Decision, o: DecisionOption): boolean => o.id !== d.defaultOption && !!gateOf18(s, d.eventId, o.id, d.ctx);

/** Relógio de prazo curto (decisões com ctx.dl18). */
export function decTimer18(s: GameState, d: Decision): HTMLElement | null {
  const dl = Number(d.ctx.dl18 ?? 0);
  if (!dl) return null;
  const n = Math.max(0, dl - s.week);
  return h('span', { class: `dc18-timer ${n <= 0 ? 'bad' : ''}` }, '⏱ ', n <= 0 ? t(l('vence nesta semana', 'expires this week')) : t(l('vence em {n} sem.', 'expires in {n} wk'), { n }));
}

function when(s: GameState, w: number): string {
  const d = dateOfDay(s.config.startYear, w * 7);
  return `${monthName(d.month)} ${d.year}`;
}

/** "Consequências pendentes": o que pode voltar, quando (janela) e com que incerteza. */
export function pendingView18(s: GameState, max = 6): HTMLElement {
  const P = pending18(s);
  const done = dec18(s).done.slice(0, 3);
  return h('section', { class: 'card dc18-pend', id: 'dc18-pend' },
    h('div', { class: 'ck14-head' }, h('h3', null, ic('clock'), ' ', h('span', { class: 'why18', 'data-why': 'dec18.pending', tabindex: '0' }, t(l('Consequências pendentes', 'Pending consequences'))), ' ', h('small', { class: 'muted' }, `(${P.length})`))),
    P.length ? h('ul', { class: 'dc18-pl' }, P.slice(0, max).map((x) => h('li', { class: x.tone },
      h('span', { class: 'dc18-ic' }, TONE_IC[x.tone]),
      h('span', null, h('b', null, t(x.t)), ' → ', t(x.o), h('br'), h('small', null, t(x.hint), ' · ', t(x.chance), ' · ', t(fmtL(l('entre {a} e {b}', 'between {a} and {b}'), { a: when(s, x.from), b: when(s, x.to) }))))))) :
      h('p', { class: 'muted small' }, t(l('Nada pendente: suas escolhas recentes não deixaram pontas soltas (ainda).', 'Nothing pending: your recent choices left no loose ends (yet).'))),
    P.length > max ? h('p', { class: 'muted small' }, t(l('+{n} outras', '+{n} more'), { n: P.length - max })) : null,
    done.length ? h('div', { class: 'dc18-done' }, h('small', { class: 'muted' }, t(l('Voltaram recentemente:', 'Came back recently:'))),
      h('ul', null, done.map(([w, ti, tx, tone]) => h('li', { class: tone }, TONE_IC[tone], ' ', h('small', null, when(s, w), ' — ', t(ti), ': ', t(tx)))))) : null,
  );
}

// ---------------------------------------------------------------- voz do remetente (relação e traços)

export interface Voice18 { cls: 'warm' | 'cold' | 'angry' | 'flat'; tag: L; open: L }
/** Como a pessoa escreve para você: relação (rel/confiança) e traços (persona13). Sem sorteio. */
export function voice18(s: GameState, m: InboxMsg): Voice18 | null {
  const pid = m.ref?.person ? String(m.ref.person) : '';
  const p = pid ? s.persons[pid] : undefined;
  const a = m.ref?.act ? s.acts[String(m.ref.act)] : p ? Object.values(s.acts).find((x) => x.members.includes(p.id)) : undefined;
  if (!p && !a) return null;
  const me = Object.values(s.persons).find((x) => x.isPlayer);
  const rel = p && me && p.rel[me.id] !== undefined ? p.rel[me.id] : a ? (a.trust - 50) * 1.6 : 0;
  const P = p ? per13(s, `p:${p.id}`) : null;
  const ego = P?.facets.ego ?? 50, emp = P?.facets.empatia ?? 50, hum = P?.facets.humor ?? 50, res = p?.resentment ?? 0;
  const nm = me?.name.split(' ')[0] ?? t(l('chefe', 'boss'));
  if (res > 45 || rel < -35) return { cls: 'angry', tag: l('irritado', 'irritated'), open: ego > 60 ? l('Vou direto ao ponto, já que ninguém me ouve.', 'Straight to the point, since no one listens to me.') : l('Preciso falar, e não é bom.', 'I need to say this, and it isn\'t good.') };
  if (rel > 35) return { cls: 'warm', tag: l('caloroso', 'warm'), open: hum > 60 ? fmtL(l('Fala, {n}! Senta que lá vem história.', 'Hey {n}! Grab a seat, here\'s a story.'), { n: nm }) : fmtL(l('{n}, obrigado por tudo até aqui.', '{n}, thanks for everything so far.'), { n: nm }) };
  if (rel < -10 || emp < 30) return { cls: 'cold', tag: l('seco', 'curt'), open: l('Segue o assunto.', 'Here\'s the matter.') };
  return { cls: 'flat', tag: l('cordial', 'cordial'), open: fmtL(l('Oi, {n}.', 'Hi, {n}.'), { n: nm }) };
}

/** Retrato do remetente (pixel art da pessoa; senão, iniciais coloridas). */
export function sender18(s: GameState, m: InboxMsg | undefined, from: string, size = 28): HTMLElement {
  const pid = m?.ref?.person ? String(m.ref.person) : '';
  const p = pid ? s.persons[pid] : undefined;
  if (p) return portrait(p, size);
  const a = m?.ref?.act ? s.acts[String(m.ref.act)] : undefined;
  const lead = a ? s.persons[a.leaderId ?? a.members[0]] : undefined;
  if (lead) return portrait(lead, size);
  let hue = 0;
  for (const ch of from) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  const ini = from.split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  return h('span', { class: 'portrait dc18-av', style: `width:${size}px;height:${size}px;background:hsl(${hue} 40% 42%)`, title: from }, ini || '?');
}
export const voiceTag18 = (v: Voice18): HTMLElement => h('span', { class: `dc18-voice ${v.cls}`, title: t(l('Tom da mensagem: relação e personalidade de quem escreve', 'Message tone: the writer\'s relationship and personality')) }, t(v.tag));
export const _dc18 = (x: L): string => t(x);
