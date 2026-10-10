// Rodada 18 (ability18) — estrelas de habilidade (atual cheia, potencial em contorno com a faixa de incerteza).
// Módulo sem efeitos colaterais (pode ser importado pelos painéis sem ciclo de registro).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import type { Act, GameState, StaffMember } from '../sim/types';
import { fmtL } from '../sim/util';
import { abilityStaff18, actEst18, est18 } from '../sim/sys/ability18';
import { pill } from './common';
import { h } from './dom';
import { why18 } from './explain18';
import './sys/ability18.css';

const T = (x: L) => t(x);
const st5 = (v: number) => Math.round(Math.max(0.5, Math.min(5, v / 40)) * 2) / 2;
const pct = (v: number) => `${Math.max(0, Math.min(100, v / 2))}%`;

/** Cinco estrelas: atual (cheias), potencial em contorno (faixa de incerteza em tom mais claro). */
export function stars18(ca: number, paLo: number, paHi: number, big = false): HTMLElement {
  const tip = fmtL(l('Atual ★{c} · potencial ★{a}–{b}', 'Current ★{c} · potential ★{a}–{b}'), { c: st5(ca), a: st5(paLo), b: st5(paHi) });
  const lay = (cls: string, w: number, ch: string) => h('span', { class: cls, style: `width:${pct(w)}` }, ch.repeat(5));
  return h('span', { class: `ab18-st${big ? ' big' : ''}`, title: T(tip), 'aria-label': T(tip), role: 'img' },
    h('span', { class: 'ab18-base' }, '☆'.repeat(5)), lay('ab18-hi', paHi, '★'), lay('ab18-lo', paLo, '★'), lay('ab18-ca', ca, '★'));
}
/** Estrelas de qualquer pessoa (com o "por quê" ao passar o mouse). */
export function personStars18(s: GameState, key: string, big = false): HTMLElement | null {
  const e = est18(s, key);
  if (!e) return null;
  return why18(s, 'ability.pa', { key }, stars18(e.ca, e.paLo, e.paHi, big));
}
export function actStars18(s: GameState, a: Act): HTMLElement | null {
  const e = actEst18(s, a);
  return e ? stars18(e.ca, e.paLo, e.paHi) : null;
}
export function staffStars18(s: GameState, st: StaffMember): HTMLElement {
  const v = abilityStaff18(s, st);
  return stars18(v.ca, Math.max(v.ca, v.pa - 15), Math.min(200, v.pa + 15));
}

/** Linha compacta para listas (elenco, mercado, scouting). */
export function abilityCell18(s: GameState, a: Act): HTMLElement | null {
  const e = actEst18(s, a);
  if (!e) return null;
  const best = e.best ? est18(s, `p:${e.best}`) : null;
  const tag = best && best.report[0] ? best.report[0] : null;
  const ages = a.members.map((id) => s.year - (s.persons[id]?.born ?? s.year));
  const prospect = Math.min(...ages) < 24 && (e.paLo + e.paHi) / 2 - e.ca >= 30;
  return h('span', { class: 'ab18-cell', title: tag ? T(tag) : '' }, stars18(e.ca, e.paLo, e.paHi), prospect ? pill(T(l('promessa', 'prospect')), 'good') : null);
}
