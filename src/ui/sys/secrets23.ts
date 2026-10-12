// Rodada 23 — aba "O que sabemos" na ficha da pessoa e do ato: vínculos e segredos que o JOGADOR conhece (secrets23),
// com nível de certeza, fonte ("ouvido no estúdio com X, semana 40"), o que a imprensa sabe, e as ações
// (investigar, proteger, chantagear, vazar, negociar).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  CHAN23, DO23, KIND23, LVL23, act23, actCost23, eraK23, invCost23, invOdds23, investigate23, knownAbout23, mine23, sec23, subjAct23, type Do23,
} from '../../sim/sys/secrets23';
import type { GameState } from '../../sim/types';
import { pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { ACT_TABS, PERSON_TABS } from '../pages';

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const say = (x: L): void => { toast(T(x), 'info'); rerender(); };
const LV_CLS = ['', 'muted', 'warn', 'bad', 'bad'];

function box(s: GameState, subjs: string[]): HTMLElement | null {
  const rows = subjs.flatMap((sj) => knownAbout23(s, sj));
  const inv = sec23(s).inv.find((x) => subjs.includes(x.subj));
  const out: HTMLElement[] = [];
  for (const { sec, k } of rows) {
    const vis = KIND23[sec.kind].vis;
    const last = k.how.filter((x) => x.o === 'player').at(-1);
    const src = vis === 'assumed' ? T(CHAN23.self) : last ? `${T(last.t ?? CHAN23[last.ch])}` : '';
    const acts: HTMLElement[] = [];
    if (vis !== 'assumed' && k.p >= 2 && k.pr < 4 && !k.done) {
      for (const d of ['protect', 'blackmail', 'leak', 'negotiate', 'ignore'] as Do23[]) {
        if (d === 'blackmail' && mine23(s, sec.subject)) continue;
        const c = actCost23(s, sec, d);
        acts.push(h('button', { class: `btn small ${d === 'leak' || d === 'blackmail' ? 'warn' : ''}`, title: T(DO23[d].h), onclick: () => say(act23(s, sec.id, d)) }, `${T(DO23[d].n)}${c ? ` ($${Math.round(c / 100)})` : ''}`));
      }
    }
    out.push(h('div', { class: 'small', style: 'margin-bottom:8px' },
      h('p', null, pill(T(LVL23[k.p]), LV_CLS[k.p]), ' ', h('b', null, T(KIND23[sec.kind].n)), sec.data?.v ? ` (${sec.data.v})` : '', k.pr >= 2 && vis !== 'assumed' ? [' ', pill(`${T(l('imprensa', 'press'))}: ${T(LVL23[k.pr])}`, k.pr >= 4 ? 'bad' : 'warn')] : ''),
      src ? h('p', { class: 'muted' }, `${T(l('Fonte', 'Source'))}: ${src}${k.done ? ` · ${T(l('decidido', 'decided'))}: ${T(DO23[k.done].n)}` : ''}`) : null,
      vis !== 'assumed' && k.pr < 4 ? h('p', { class: 'muted' }, `${T(l('Se vazar', 'If leaked'))}: ${T(eraK23(s, sec).why)}`) : null,
      acts.length ? h('div', { class: 'row', style: 'gap:4px;flex-wrap:wrap' }, ...acts) : null,
    ));
  }
  const o = invOdds23(s);
  const target = subjs[0];
  out.push(h('div', { class: 'small' },
    inv ? h('p', { class: 'muted' }, T(l('Um detetive está no caso.', 'A detective is on the case.')))
      : h('button', { class: 'btn small', title: o.why.map(T).join(' · '), onclick: () => say(investigate23(s, target)) },
        `${T(l('Contratar detetive', 'Hire a detective'))} ($${Math.round(invCost23(s) / 100)}, ${Math.round(o.p * 100)}%)`)));
  if (!rows.length && !inv) out.unshift(h('p', { class: 'muted small' }, T(l('Nada além do que é público. Um detetive, a imprensa ou gente próxima podem trazer mais.', 'Nothing beyond what is public. A detective, the press or people close by may bring more.'))));
  return section(T(l('O que sabemos', 'What we know')), ...out);
}

PERSON_TABS.push((s, p) => (p.isPlayer ? null : { id: 'secrets23', label: l('O que sabemos', 'What we know'), icon: 'eye', render: () => {
  const a = subjAct23(s, `p:${p.id}`);
  return box(s, [`p:${p.id}`, ...(a && a.members.length === 1 ? [`a:${a.id}`] : [])]);
} }));
ACT_TABS.push((s, a) => ({ id: 'secrets23', label: l('O que sabemos', 'What we know'), icon: 'eye', render: () => box(s, [`a:${a.id}`, ...a.members.map((m) => `p:${m}`)]) }));
