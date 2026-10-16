// Masters 31 (31.3 · F) — "Conhecidos" (Você): as pessoas que você conhece, com a relação (intimidade, afeto, respeito,
// confiança, rivalidade) e como se conheceram. Filtros por tipo, por proximidade e busca. Só lê (explorar não muda o mundo).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { closeness31 } from '../../sim/social31';
import { CLOSE31_TXT, howMet31, myKnown31, type Known31 } from '../../sim/sys/social31sys';
import type { GameState } from '../../sim/types';
import { pill, rerender } from '../common';
import { h, select } from '../dom';
import { registerArea } from '../registry';
import { openFicha13 } from './persona13';

const F = { q: '', kind: 'all' as 'all' | Known31['kind'], close: 'all' as 'all' | 'friends' | 'rivals' | 'cold', how: 'all' };

const KIND_TXT: Record<Known31['kind'] | 'all', L> = {
  all: l('Todos', 'Everyone'), person: l('Artistas e pessoas', 'Artists and people'), leader: l('Líderes de selo', 'Label heads'),
  staff: l('Sua equipe', 'Your staff'), critic: l('Críticos', 'Critics'), other: l('Outros', 'Others'),
};
const signed = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}`;
const tone = (v: number) => (v >= 15 ? 'good' : v <= -15 ? 'bad' : '');

function match(s: GameState, k: Known31): boolean {
  if (F.kind !== 'all' && k.kind !== F.kind) return false;
  if (F.close === 'friends' && closeness31(k.t.i) < 2) return false;
  if (F.close === 'rivals' && k.t.v < 30) return false;
  if (F.close === 'cold' && closeness31(k.t.i) > 0) return false;
  if (F.how !== 'all' && k.t.how !== F.how) return false;
  const q = F.q.trim().toLowerCase();
  return !q || k.name.toLowerCase().includes(q) || t(howMet31(s, k.t)).toLowerCase().includes(q);
}

export function knownPage31(s: GameState): HTMLElement {
  const all = myKnown31(s);
  const list = all.filter((k) => match(s, k));
  const hows = [...new Set(all.map((k) => k.t.how))].sort();
  const sel = (id: string, v: string, opts: [string, L][], set: (x: string) => void) =>
    select<string>(v, opts.map(([value, label]) => ({ value, label: t(label) })), (x) => { set(x); rerender(); }, { id });
  return h('div', { class: 'known31' },
    h('p', { class: 'muted small' }, t(l('Quem você conhece e como. Intimidade esfria sem contato; presentes, favores e trabalho bem-sucedido aproximam. Quem nunca te viu não aparece aqui.', 'Who you know and how. Closeness cools without contact; gifts, favors and successful work bring people closer. People who never met you are not listed.'))),
    h('div', { class: 'row wrap' },
      h('input', { type: 'search', placeholder: t(l('Buscar nome ou como se conheceram', 'Search name or how you met')), value: F.q, oninput: (e: Event) => { F.q = (e.target as HTMLInputElement).value; rerender(); } }),
      sel('k31-kind', F.kind, (Object.keys(KIND_TXT) as (keyof typeof KIND_TXT)[]).map((k) => [k, KIND_TXT[k]]), (x) => { F.kind = x as typeof F.kind; }),
      sel('k31-close', F.close, [['all', l('Qualquer proximidade', 'Any closeness')], ['friends', l('Amigos e próximos', 'Friends and close')], ['rivals', l('Rivais e inimigos', 'Rivals and enemies')], ['cold', l('Só conhecidos', 'Acquaintances only')]], (x) => { F.close = x as typeof F.close; }),
      sel('k31-how', F.how, [['all', l('Qualquer encontro', 'Any meeting')], ...hows.map((x): [string, L] => [x, howMet31(s, { ...all.find((k) => k.t.how === x)!.t, by: undefined, since: 0 })])], (x) => { F.how = x; }),
    ),
    h('p', { class: 'muted small' }, t(l('{n} de {m} conhecidos.', '{n} of {m} acquaintances.'), { n: list.length, m: all.length })),
    list.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ...[l('Nome', 'Name'), l('Relação', 'Relationship'), l('Afeto', 'Affection'), l('Respeito', 'Respect'), l('Confiança', 'Trust'), l('Como se conheceram', 'How you met')].map((x) => h('th', null, t(x))))),
      h('tbody', null, list.slice(0, 200).map((k) => h('tr', null,
        h('td', null, h('button', { class: 'link', onclick: () => openFicha13(k.kind === 'person' ? `p:${k.id}` : k.id) }, k.name), ' ', h('small', { class: 'muted' }, t(KIND_TXT[k.kind]))),
        h('td', null, k.t.v >= 30 ? pill(t(k.t.v >= 60 ? l('inimigo', 'enemy') : l('rival', 'rival')), 'bad') : pill(t(CLOSE31_TXT[closeness31(k.t.i)]), closeness31(k.t.i) >= 2 ? 'good' : '')),
        h('td', { class: tone(k.op ?? 0) }, k.op === null ? '—' : signed(k.op)),
        h('td', { class: tone(k.t.rBack) }, signed(k.t.rBack)),
        h('td', { class: tone(k.t.tBack) }, signed(k.t.tBack)),
        h('td', { class: 'small' }, t(howMet31(s, k.t))),
      ))))) : h('p', { class: 'muted' }, t(l('Ninguém com esses filtros.', 'Nobody with these filters.'))),
  );
}

registerArea({ id: 'known31', label: l('Conhecidos', 'Acquaintances'), icon: 'handshake', key: '', render: knownPage31 });
