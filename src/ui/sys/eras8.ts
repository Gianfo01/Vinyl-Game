// Interface das eras de negócio (rodada 8): era atual e o seu modelo de negócio, posturas escolhidas
// (com peso, que cai a cada era nova), troca de rumo (pivô) e o que os selos rivais adotaram.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { PIVOT_COST, PIVOT_WEEKS, activeStances, currentEra, era8, erasSoFar, eraYear, pivotStance, rivalStances, type StanceDef, type StanceFx } from '../../sim/sys/eras8';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, labelLink, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { registerSection, registerTab } from '../registry';
import { ic, setTab } from '../vis';
import { store } from '../store';

const FX_NAMES: Record<keyof StanceFx, L> = {
  appeal: l('apelo', 'appeal'), single: l('singles', 'singles'), ep: l('EPs', 'EPs'), lp: l('LPs', 'LPs'), fresh: l('discos novos', 'new records'),
  reissue: l('reedições', 'reissues'), units: l('vendas', 'sales'), tail: l('discos de 3–12 meses', '3–12 month records'), catalog: l('catálogo', 'catalog'),
  show: l('shows', 'shows'), press: l('prensagem', 'pressing'), synth: l('sintéticos', 'synthetic'), human: l('humanos', 'human'),
};

function fxChips(st: StanceDef, weight: number): HTMLElement {
  const items = (Object.entries(st.fx) as [keyof StanceFx, number][]).filter(([, v]) => v !== 1).map(([k, v]) => {
    const eff = (v - 1) * weight;
    const good = k === 'press' ? eff < 0 : eff > 0;
    return pill(`${t(FX_NAMES[k])} ${eff > 0 ? '+' : ''}${Math.round(eff * 100)}%`, good ? 'good' : 'bad');
  });
  return h('span', { class: 'fx-chips' }, ...items);
}

function eraPanel(s: GameState): HTMLElement {
  const cur = currentEra(s);
  const st = era8(s);
  const act = activeStances(s, 'player');
  const mine = act.find((x) => x.era.id === cur.id)?.stance;
  const waitPivot = Math.max(0, PIVOT_WEEKS - (s.week - st.pivot));
  const asked = s.decisions.find((d) => d.eventId === `era8_${cur.id}`);
  return h('div', { class: 'panel era8' },
    h('div', { class: 'col-main' },
      section(`${t(l('Era atual', 'Current era'))}: ${t(cur.name)}`,
        h('p', { class: 'lead' }, t(cur.model)),
        cur.stances.length ? h('div', { class: 'cards stances' }, cur.stances.map((x) => {
          const on = mine?.id === x.id;
          return h('article', { class: `tile stance ${on ? 'on' : ''}` },
            h('div', { class: 'tile-body' },
              h('b', null, t(x.name), ' ', on ? pill(t(l('sua postura', 'your stance')), 'good') : null),
              h('small', null, t(x.desc)), fxChips(x, 1),
              h('small', { class: 'muted' }, t(l('Rivais: {n}', 'Rivals: {n}'), { n: rivalStances(s, cur.id).find((r) => r.stance.id === x.id)?.labels.length ?? 0 })),
              !on && !asked ? h('button', { class: 'btn small', disabled: waitPivot > 0, title: waitPivot ? t(l('Carência: {n} semanas', 'Cooldown: {n} weeks'), { n: waitPivot }) : '', onclick: () => {
                if (!confirm(t(l('Mudar de rumo custa {v} e um pouco de reputação comercial. Confirmar?', 'Changing course costs {v} and some commercial reputation. Confirm?'), { v: $(money(s, PIVOT_COST)) }))) return;
                const e = pivotStance(s, x.id);
                toast(t(e ?? l('Nova postura adotada.', 'New stance adopted.')), e ? 'bad' : 'good');
                rerender();
              } }, t(l('Mudar para esta', 'Switch to this'))) : null,
            ));
        })) : h('p', { class: 'muted' }, t(l('Ainda não há uma virada de modelo de negócio: rádio e partituras mandam.', 'No business-model shift yet: radio and sheet music rule.'))),
        asked ? h('p', { class: 'small' }, ic('calendar'), ' ', t(l('A decisão desta era está na sua mesa (se ninguém responder, vale a última opção).', 'This era\'s decision is on your desk (if unanswered, the last option applies).'))) : null,
      ),
      section(t(l('Linha do tempo das eras', 'Era timeline')),
        h('ol', { class: 'era-line' }, erasSoFar(s).map((e) => {
          const y = eraYear(s, e.id);
          const a = act.find((x) => x.era.id === e.id);
          const c = st.chosen[e.id];
          return h('li', { class: `on ${e.id === cur.id ? 'cur' : ''}` },
            h('b', null, t(e.name)), ' ', h('span', { class: 'muted' }, y !== undefined && Number.isFinite(y) ? String(y) : t(l('início', 'start'))),
            a ? h('div', { class: 'small' }, t(a.stance.name), ' ', c?.auto ? pill(t(l('padrão', 'default'))) : null, ' ', pill(t(l('peso {p}%', 'weight {p}%'), { p: Math.round(a.weight * 100) })), ' ', fxChips(a.stance, a.weight)) : null,
          );
        })),
        h('p', { class: 'muted small' }, t(l('A próxima virada ninguém sabe qual será: fique de olho nos rumores e no noticiário.', 'Nobody knows what the next shift will be: keep an eye on rumors and the news.'))),
        h('p', { class: 'muted small' }, t(l('Posturas antigas continuam valendo, mas pesam menos a cada era nova: o que era tocar bem um selo muda com a tecnologia.', 'Old stances still apply but weigh less with each new era: what running a label well means changes with technology.'))),
      ),
    ),
    h('aside', { class: 'col-side' },
      cur.stances.length ? section(t(l('O que os rivais escolheram', 'What rivals chose')),
        rivalStances(s, cur.id).map((r) => h('div', { class: 'small' }, h('b', null, t(r.stance.name)), ` (${r.labels.length})`,
          h('div', null, r.labels.slice(0, 6).map((id) => h('span', null, labelLink(s, id), ' '))))),
      ) : null,
    ),
  );
}

registerTab('business', { id: 'era8', label: l('Era e estratégia', 'Era and strategy'), icon: 'clock', order: 1, render: eraPanel, badge: (s) => (s.decisions.some((d) => d.eventId.startsWith('era8_')) ? 1 : undefined) });

registerSection('desk', {
  id: 'era8', order: 30, render: (s) => {
    const cur = currentEra(s);
    const mine = activeStances(s, 'player').find((x) => x.era.id === cur.id)?.stance;
    return section(`${t(l('Era', 'Era'))}: ${t(cur.name)}`,
      h('p', { class: 'small' }, t(cur.model)),
      mine ? h('p', { class: 'small' }, t(l('Sua postura: ', 'Your stance: ')), h('b', null, t(mine.name)), ' ', fxChips(mine, 1)) : null,
      h('button', { class: 'btn small ghost', onclick: () => { setTab('business', 'era8'); store.area = 'business'; rerender(); } }, ic('clock'), ' ', t(l('Era e estratégia', 'Era and strategy'))),
    );
  },
});
