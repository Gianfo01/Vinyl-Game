// Página do Hall da Fama do Rock (rodada 9): só aparece depois da fundação (1983).
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { HALL_CATS, HALL_CEREMONY_MONTH, HALL_FIRST_CLASS, HALL_FOUNDED, HALL_WAIT, LOBBY_COST, answerPerform, eligibleActs, hall, hallExists, hallName, hallScore, lobby } from '../../sim/sys/rockhall9';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, actLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerArea } from '../registry';

const mine = (s: GameState, id: string): boolean => s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand;

function hallArea(s: GameState): HTMLElement {
  const st = hall(s);
  const byYear = new Map<number, typeof st.inducted>();
  for (const e of st.inducted) byYear.set(e.year, [...(byYear.get(e.year) ?? []), e]);
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const soon = eligibleActs(s).filter((a) => mine(s, a.id)).sort((a, b) => hallScore(s, b) - hallScore(s, a)).slice(0, 6);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(hallName(s)),
        h('p', { class: 'muted small' }, t(l('Fundado em {f}; primeira turma em {c}. Artistas ficam elegíveis {w} anos depois da estreia. Indicados em outubro, posse em janeiro. Entrar dá fama, fãs novos e um surto de vendas do catálogo.', 'Founded in {f}; first class in {c}. Acts become eligible {w} years after their debut. Nominees in October, induction in January. Getting in brings fame, new fans and a catalog sales surge.'), { f: HALL_FOUNDED, c: HALL_FIRST_CLASS, w: HALL_WAIT })),
        st.noms ? h('div', null,
          h('h4', null, t(l('Indicados à turma de {y}', 'Nominees for the class of {y}'), { y: st.noms.year })),
          h('ul', { class: 'small' }, st.noms.ids.map((id) => h('li', { class: mine(s, id) ? 'mine' : '' }, actLink(s, id),
            mine(s, id) ? h('span', null, ' ', ...([1, 2, 3] as const).map((lv) => h('button', { class: 'btn small ghost', title: t(l('Campanha junto aos votantes; o nível 3 pode pegar mal.', 'Campaign with voters; level 3 may backfire.')), onclick: () => { const e = lobby(s, rngOf(s), id, lv); toast(t(e ?? l('Campanha feita.', 'Campaign done.')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Campanha', 'Campaign'))} ${lv} · ${$(money(s, LOBBY_COST[lv]))}`))) : null))),
          h('p', { class: 'muted small' }, t(l('Turma anunciada em {m}/{y}.', 'Class announced in {m}/{y}.'), { m: HALL_CEREMONY_MONTH + 1, y: st.noms.year })),
        ) : h('p', { class: 'muted small' }, t(l('Sem indicados no momento: a lista sai em outubro.', 'No nominees right now: the list comes out in October.'))),
      ),
      section(t(l('Turmas', 'Classes')), years.length ? h('div', null, years.map((y) => h('div', { class: 'hall' },
        h('h4', null, String(y)),
        ...byYear.get(y)!.map((e) => h('div', { class: `plaque ${e.player || (e.actId && mine(s, e.actId)) ? 'mine' : ''}` }, '🏆 ', e.actId ? actLink(s, e.actId) : h('b', null, e.name), h('small', null, ` · ${t(HALL_CATS[e.cat])}`))),
      ))) : h('p', { class: 'muted small' }, t(l('Ninguém empossado ainda.', 'No one inducted yet.')))),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('Convites para tocar', 'Invitations to perform')), st.perform.filter((p) => p.ans === undefined).length
        ? h('ul', { class: 'small' }, st.perform.filter((p) => p.ans === undefined).map((p) => h('li', null, actLink(s, p.actId), ' ',
          h('button', { class: 'btn small primary', onclick: () => { answerPerform(s, p.actId, true); toast(t(l('Apresentação marcada: fama e fãs.', 'Performance booked: fame and fans.')), 'good'); rerender(); } }, t(l('Tocar', 'Perform'))),
          h('button', { class: 'btn small ghost', onclick: () => { answerPerform(s, p.actId, false); rerender(); } }, t(l('Recusar', 'Decline'))))))
        : h('p', { class: 'muted small' }, t(l('Artistas seus empossados recebem convite para tocar na cerimônia.', 'Your inducted acts are invited to play the ceremony.')))),
      section(t(l('Seus elegíveis', 'Your eligible acts')), soon.length
        ? h('ul', { class: 'small' }, soon.map((a) => h('li', null, actLink(s, a.id), h('small', { class: 'muted' }, ` · ${Math.round(hallScore(s, a))} pts`))))
        : h('p', { class: 'muted small' }, t(l('Nenhum artista seu tem {w}+ anos de carreira ainda.', 'None of your acts has {w}+ years of career yet.'), { w: HALL_WAIT }))),
    ),
  );
}

registerArea({ id: 'rockhall', label: l('Hall da Fama', 'Hall of Fame'), icon: 'trophy', key: 'r', render: hallArea, visible: hallExists, badge: (s) => hall(s).perform.filter((p) => p.ans === undefined).length || undefined });
