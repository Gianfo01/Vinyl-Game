// Mesa do mês: briefing (até 5 itens), cartões de decisão com custo/prazo/risco,
// o que mudou, metas visíveis e rumores (GDD §6, §22, §24).

import { cardById } from '../../data/rules';
import { l } from '../../data/world';
import { S, t } from '../../i18n/strings';
import { acceptCounter, withdrawOffer } from '../../sim/contracts';
import { resolveDecision } from '../../sim/events';
import { cardGoalDone, nextGoals } from '../../sim/legacy';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, actLink, kv, pill, releaseLink, rerender, section } from '../common';
import { h } from '../dom';
import { advisorSection } from '../advisor';
import { decisionThumb14 } from '../sys/visuals14';

const CAT_ICON: Record<string, string> = {
  career: '🎼', people: '👥', band: '🎸', contract: '📜', market: '🏢', tech: '📡', culture: '🎨', scandal: '📰',
  health: '🩺', stage: '🎤', manufacturing: '🏭', world: '🌍', neural: '🧠', scouting: '🔎', business: '💼',
};

export function deskPanel(s: GameState): HTMLElement {
  const decisions = s.decisions.map((d) =>
    h('article', { class: 'decision' },
      decisionThumb14(s, d),
      h('header', null, h('span', { class: 'cat' }, CAT_ICON[d.cat] ?? '•'), h('h4', null, t(d.title))),
      h('p', null, t(d.text)),
      h('div', { class: 'options' }, d.options.map((o) =>
        h('button', { class: `btn ${o.id === d.defaultOption ? 'ghost' : ''}`, title: t(o.hint), onclick: () => { resolveDecision(s, d.id, o.id); rerender(); } },
          h('span', null, t(o.label)), o.hint ? h('small', null, t(o.hint)) : null,
        ),
      )),
      h('p', { class: 'muted small' }, t(S.defaultIfIgnored), t(d.options.find((o) => o.id === d.defaultOption)?.label)),
    ),
  );
  const counters = s.offers.filter((o) => o.status === 'counter');
  const pending = s.offers.filter((o) => o.status === 'pending');
  const recentNotes = s.notifications.slice(-12).reverse();
  const last = s.lastMonthLedger;
  const net = Object.values(last).reduce((t2, v) => t2 + v, 0);
  const myCharts = [...s.charts.singles, ...s.charts.albums].filter((e) => s.releases[e.releaseId]?.owner === 'player' || s.acts[s.releases[e.releaseId]?.actId]?.playerBand);
  const card = cardById[s.config.card];
  return h('div', { class: 'panel desk' },
    h('div', { class: 'col-main' },
      advisorSection(s),
      section(t(S.briefing),
        s.briefing.length ? h('ul', { class: 'briefing' }, s.briefing.map((n) => h('li', { class: n.kind }, t(n.text)))) : h('p', { class: 'muted' }, t(l('Mês tranquilo.', 'A quiet month.'))),
      ),
      section(`${t(S.decisions)} (${s.decisions.length})`, decisions.length ? h('div', { class: 'decisions' }, decisions) : h('p', { class: 'muted' }, t(S.noDecisions))),
      counters.length || pending.length ? section(t(S.pendingOffers),
        h('ul', null,
          counters.map((o) => h('li', null, actLink(s, o.actId), ' ', pill(t(l('contraproposta', 'counter-offer')), 'warn'), ` ${t(S.advanceAmt)}: ${$(o.advance)} `,
            h('button', { class: 'btn small primary', onclick: () => { acceptCounter(s, o.id); rerender(); } }, t(S.acceptCounter)),
            h('button', { class: 'btn small ghost', onclick: () => { withdrawOffer(s, o.id); s.offers = s.offers.filter((x) => x !== o); rerender(); } }, t(S.withdraw)))),
          pending.map((o) => h('li', null, actLink(s, o.actId), ' ', pill(t(l('aguardando resposta', 'awaiting answer'))), ` ${$(o.advance)} `, h('button', { class: 'btn small ghost', onclick: () => { withdrawOffer(s, o.id); rerender(); } }, t(S.withdraw)))),
        ),
      ) : null,
      section(t(S.whatChanged),
        kv(t(S.lastMonth), h('span', { class: net >= 0 ? 'good' : 'bad' }, $(net))),
        myCharts.length ? h('ul', { class: 'small' }, myCharts.map((e) => h('li', null, `#${e.pos} `, releaseLink(s, e.releaseId), e.last ? h('span', { class: e.last > e.pos ? 'good' : e.last < e.pos ? 'bad' : 'muted' }, ` (${e.last > e.pos ? '▲' : e.last < e.pos ? '▼' : '='}${t(S.last)} ${e.last})`) : pill('NEW', 'good')))) : null,
        h('ul', { class: 'notes small' }, recentNotes.map((n) => h('li', { class: n.kind }, t(n.text)))),
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.goals), h('ul', { class: 'goals' }, nextGoals(s).map((g) => h('li', null, '◻ ', t(g.text))))),
      card && card.id !== 'none' ? section(`${t(S.card)}: ${t(card.name)}`, h('p', { class: 'small' }, t(card.passive)), h('p', null, t(S.cardGoal), ': ', t(card.goal), ' ', pill(cardGoalDone(s) || s.player.goalsDone.includes(card.id) ? t(S.done) : t(S.pending), cardGoalDone(s) ? 'good' : ''))) : null,
      s.rumors.length ? section(t(S.rumors), h('ul', { class: 'small' }, s.rumors.map((r) => h('li', null, t(r.text))))) : null,
      section(t(S.willProcess), h('ul', { class: 'small' },
        h('li', null, t(l('{n} agenda(s) de artistas', '{n} artist agenda(s)'), { n: playerActs(s).length })),
        h('li', null, t(l('{n} lançamento(s) programado(s)', '{n} scheduled release(s)'), { n: s.pendingReleases.length })),
        h('li', null, t(l('{n} oferta(s) a responder', '{n} offer(s) to answer'), { n: pending.length })),
        h('li', null, t(l('4–5 semanas de paradas, custos fixos e eventos', '4–5 chart weeks, fixed costs and events'))),
      )),
    ),
  );
}
