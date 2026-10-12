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
import { decLocked18, decOptBody18, decTimer18 } from '../sys/decide18';
import { ctxLine19 } from '../sys/ctx19';
import { folded19View } from '../sys/advance19';
import { fold21 } from '../ux21';

const CAT_ICON: Record<string, string> = {
  career: '🎼', people: '👥', band: '🎸', contract: '📜', market: '🏢', tech: '📡', culture: '🎨', scandal: '📰',
  health: '🩺', stage: '🎤', manufacturing: '🏭', world: '🌍', neural: '🧠', scouting: '🔎', business: '💼',
};

let openDec21 = ''; // r21e (§2.3.2): a primeira decisão abre inteira; as outras ficam numa linha até o clique

export function deskPanel(s: GameState): HTMLElement {
  const decisions = s.decisions.map((d, i) => (i > 0 && d.id !== openDec21)
    ? h('article', { class: 'decision dec21-compact' },
      h('header', null, h('span', { class: 'cat' }, CAT_ICON[d.cat] ?? '•'), h('h4', null, t(d.title)), decTimer18(s, d),
        h('button', { class: 'btn small', 'aria-expanded': 'false', onclick: () => { openDec21 = d.id; rerender(); } }, t(l('Decidir', 'Decide')))),
      h('p', { class: 'muted small' }, t(S.defaultIfIgnored), t(d.options.find((o) => o.id === d.defaultOption)?.label)))
    : h('article', { class: 'decision' },
      h('header', null, h('span', { class: 'cat' }, CAT_ICON[d.cat] ?? '•'), h('h4', null, t(d.title)), decTimer18(s, d)),
      h('p', null, t(d.text)),
      ctxLine19(s, d), // r19: contexto do ator (mágoas, favores, promessas, temperamento)
      h('div', { class: 'options' }, d.options.map((o) =>
        h('button', { class: `btn ${o.id === d.defaultOption ? 'ghost' : ''} ${decLocked18(s, d, o) ? 'dc18-locked' : ''}`, 'aria-disabled': String(decLocked18(s, d, o)), title: t(o.hint), onclick: () => { if (decLocked18(s, d, o)) return; resolveDecision(s, d.id, o.id); rerender(); } },
          ...decOptBody18(s, d, o), // r18 decide18: agora × depois, aposta, trava
        ),
      )),
      h('p', { class: 'muted small' }, t(S.defaultIfIgnored), t(d.options.find((o) => o.id === d.defaultOption)?.label)),
    ),
  );
  const counters = s.offers.filter((o) => o.status === 'counter');
  const pending = s.offers.filter((o) => o.status === 'pending');
  const recentNotes = s.notifications.filter((n) => !n.fold).slice(-12).reverse(); // r19: agrupados ficam no Resumo do mês
  const last = s.lastMonthLedger;
  const net = Object.values(last).reduce((t2, v) => t2 + v, 0);
  const myCharts = [...s.charts.singles, ...s.charts.albums].filter((e) => s.releases[e.releaseId]?.owner === 'player' || s.acts[s.releases[e.releaseId]?.actId]?.playerBand);
  const card = cardById[s.config.card];
  return h('div', { class: 'panel desk' },
    h('div', { class: 'col-main' },
      advisorSection(s),
      fold21('briefing', t(S.briefing), // r21 (§2.3.2): recolhido por padrão, estado nas prefs
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
      fold21('changed', t(S.whatChanged), // r21e: o cartão do topo já traz os 3 destaques; a lista inteira fica recolhida
        kv(t(S.lastMonth), h('span', { class: `${net >= 0 ? 'good' : 'bad'} why18`, 'data-why': 'cash.month', tabindex: '0' }, $(net))),
        myCharts.length ? h('ul', { class: 'small' }, myCharts.map((e) => h('li', null, h('span', { class: 'why18', 'data-why': 'chart.pos', 'data-why-ctx': JSON.stringify({ rel: e.releaseId, kind: s.charts.albums.includes(e) ? 'albums' : 'singles' }), tabindex: '0' }, `#${e.pos}`), ' ', releaseLink(s, e.releaseId), e.last ? h('span', { class: e.last > e.pos ? 'good' : e.last < e.pos ? 'bad' : 'muted' }, ` (${e.last > e.pos ? '▲' : e.last < e.pos ? '▼' : '='}${t(S.last)} ${e.last})`) : pill('NEW', 'good')))) : null,
        h('ul', { class: 'notes small' }, recentNotes.map((n) => h('li', { class: n.kind }, t(n.text)))),
        folded19View(s), // r19 B.5: avisos menores agrupados no mês
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.goals), h('ul', { class: 'goals' }, nextGoals(s).map((g) => h('li', null, '◻ ', t(g.text))))),
      card && card.id !== 'none' ? section(`${t(S.card)}: ${t(card.name)}`, h('p', { class: 'small' }, t(card.passive)), h('p', null, t(S.cardGoal), ': ', t(card.goal), ' ', pill(cardGoalDone(s) || s.player.goalsDone.includes(card.id) ? t(S.done) : t(S.pending), cardGoalDone(s) ? 'good' : ''))) : null,
      s.rumors.length ? fold21('rumors', `${t(S.rumors)} (${s.rumors.length})`, h('ul', { class: 'small' }, s.rumors.map((r) => h('li', null, t(r.text))))) : null, // r21e: recolhido
      fold21('willProcess', t(S.willProcess), h('ul', { class: 'small' },
        h('li', null, t(l('{n} agenda(s) de artistas', '{n} artist agenda(s)'), { n: playerActs(s).length })),
        h('li', null, t(l('{n} lançamento(s) programado(s)', '{n} scheduled release(s)'), { n: s.pendingReleases.length })),
        h('li', null, t(l('{n} oferta(s) a responder', '{n} offer(s) to answer'), { n: pending.length })),
        h('li', null, t(l('4–5 semanas de paradas, custos fixos e eventos', '4–5 chart weeks, fixed costs and events'))),
      )),
    ),
  );
}
