// Rodada 12: aba "Rotinas e selo" em Vida pessoal — cuidados automáticos (sempre / quando precisar /
// desligado) com o relatório do último mês, e o que da vida pessoal está pesando no selo agora
// (herdeiro e a visão dele, conflito de interesse, fitas-mestras) com o histórico desses cruzamentos.

import './story12.css';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { HOBBIES, energyLeft, maxEnergy, type HobbyId } from '../../sim/sys/life';
import { life12, ROUTINES, setRoutine, VISION_TXT, type RMode } from '../../sim/sys/life12';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { $, pill, rerender, section } from '../common';
import { h, select } from '../dom';

const MODES: { v: RMode; n: L }[] = [
  { v: 'off', n: l('Desligado', 'Off') }, { v: 'need', n: l('Quando precisar', 'When needed') }, { v: 'always', n: l('Todo mês', 'Every month') },
];
const STANCE: Record<string, L> = {
  groomed: l('preparado(a) como herdeiro(a)', 'groomed as heir'), testing: l('em teste com um selo próprio', 'testing with an imprint'),
  tested: l('testado(a), sem promessa', 'tested, no promise'), refused: l('recusado(a) — guarda mágoa', 'refused — holds a grudge'),
};

export function routinesTab(s: GameState): HTMLElement {
  const st = life12(s);
  const rep = st.rep;
  const plan = st.plan;
  const coi = st.coi ? s.acts[st.coi.act] : undefined;
  return h('div', { class: 'rt12' },
    section(t(l('Rotinas', 'Routines')),
      h('p', { class: 'muted small' }, t(l('Cuidados que se repetem rodam sozinhos no fim do mês, na ordem abaixo, usando o tempo livre que você não gastou ({e}/{m} sobrando agora). "Quando precisar" só age se a condição valer. Custos saem do seu patrimônio pessoal.', 'Repetitive care runs by itself at month end, in the order below, using the free time you did not spend ({e}/{m} left now). "When needed" acts only if the condition holds. Costs come out of your personal wealth.'), { e: energyLeft(s), m: maxEnergy(s) })),
      h('table', { class: 'tbl compact' }, h('tbody', null, ROUTINES.map((R) => h('tr', null,
        h('td', null, h('b', null, t(R.name)), R.id === 'hobby' ? h('span', null, ' ', select<HobbyId>(st.hobby, HOBBIES.map((x) => ({ value: x.id, label: `${t(x.name)} ($${x.cost})` })), (v) => { st.hobby = v; rerender(); })) : null),
        h('td', { class: 'small muted' }, t(R.cost), h('br'), t(l('quando precisar = ', 'when needed = ')), t(R.need)),
        h('td', null, select<RMode>(st.rt[R.id] ?? 'off', MODES.map((m) => ({ value: m.v, label: t(m.n) })), (v) => { setRoutine(s, R.id, v); rerender(); })))))),
      rep ? h('div', { class: 'small' }, h('b', null, t(l('Último mês: ', 'Last month: '))),
        rep.done.length ? rep.done.map((x) => t(x)).join(', ') : t(l('nada rodou', 'nothing ran')),
        ` · ${t(l('estresse', 'stress'))} ${rep.st >= 0 ? '+' : ''}${rep.st} · ${t(l('saúde', 'health'))} ${rep.h >= 0 ? '+' : ''}${rep.h} · ${$(rep.w)}`,
        rep.skip.length ? h('div', { class: 'bad' }, t(l('Não rodou: ', 'Skipped: ')), rep.skip.map((x) => t(x)).join(' · ')) : null) : null),
    section(t(l('Vida e selo', 'Life and label')),
      h('p', { class: 'muted small' }, t(l('Família, romance e dinheiro pessoal cruzam com o selo: o herdeiro chega com uma visão própria, namorar alguém do elenco gera favoritismo, vender o catálogo resolve o bolso e fere quem gravou. Os artistas lembram — veja a aba Arco de cada um.', 'Family, romance and personal money cross into the label: the heir arrives with their own vision, dating someone on the roster breeds favouritism, selling the catalog fixes your pocket and hurts those who recorded it. The acts remember — see each one\'s Arc tab.'))),
      h('ul', { class: 'small' },
        h('li', null, h('b', null, t(l('Herdeiro: ', 'Heir: '))), plan ? h('span', null, `${plan.name} — ${t(STANCE[plan.stance])}. `, t(l('Visão: ', 'Vision: ')), h('i', null, t(VISION_TXT[plan.vision][1])), ' — ', t(VISION_TXT[plan.vision][0]), '.') : t(ownerOf(s).kids.length ? l('nenhuma conversa ainda; filhos adultos podem trazer planos próprios.', 'no talk yet; adult kids may bring plans of their own.') : l('sem filhos na linha de sucessão.', 'no kids in the line of succession.'))),
        h('li', null, h('b', null, t(l('Conflito de interesse: ', 'Conflict of interest: '))), coi ? h('span', null, t(fmtL(l('você namora alguém de {a} desde {y}. ', 'you are dating someone in {a} since {y}. '), { a: coi.name, y: st.coi!.since })),
          st.coi!.fw ? pill(t(l('empresário independente cuida deles', 'independent manager handles them')), 'good') : pill(t(l('favoritismo: o resto do elenco perde confiança todo mês', 'favouritism: the rest of the roster loses trust monthly')), 'bad')) : t(l('nenhum.', 'none.')))),
      st.log.length ? h('ul', { class: 'small' }, st.log.slice(0, 10).map((x) => h('li', null, h('b', null, `${x.y} `), t(x.t)))) : null),
  );
}
