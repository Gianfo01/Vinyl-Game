// Interface da rodada 11 para o empresário: bloco extra em cada agenciado (meta, comissão, turnê, imagem,
// propostas de gravadora, conflitos, assédio de rivais), aba de relatórios mensais e aba de roubar clientes.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import {
  CAMPAIGN_NAME, GOAL_NAME, acceptDeal, answerPoach, bookTour, campaignCost, canShop, conflictsOf, cxOf, imageCampaign, mgr11, poachBonus, poachChance, poachClient, prReady,
  rateChance, renegotiateRate, shopDeal, tourCost, tourReady, type Campaign, type PoachMove,
} from '../../sim/sys/manager11';
import { mgCandidates, mgGross, ventures, type Client } from '../../sim/sys/ventures9';
import { $, actLink, pill, rerender, toast } from '../common';
import { h, select } from '../dom';

const res = (x: { ok: boolean; text: L }) => { toast(t(x.text), x.ok ? 'good' : 'bad'); rerender(); };
const pct = (x: number) => `${Math.round(x * 100)}%`;
const btn = (label: string, fn: () => void, cls = 'btn small', dis = false) => h('button', { class: cls, disabled: dis, onclick: fn }, label);
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Bloco extra de cada agenciado no "Meus agenciados". */
export function clientExtras(s: GameState, c: Client): HTMLElement {
  const r = rngOf(s);
  const a = s.acts[c.actId];
  const x = cxOf(s, c.actId);
  const pitch = mgr11(s).pitches.find((p) => p.actId === c.actId);
  const cf = conflictsOf(s, c.actId);
  let rate = c.rate;
  let camp: Campaign = 'press';
  return h('div', { class: 'mgr11' },
    x.goal ? h('div', { class: 'small' }, t(l('Meta do artista', 'Client goal')), ': ', h('b', null, t(GOAL_NAME[x.goal])), h('span', { class: 'muted' }, ` · ${t(l('desde a semana', 'since week'))} ${x.goalW}`)) : null,
    cf.length ? h('ul', { class: 'small warn-list' }, cf.map((f) => h('li', null, pill(t(l('conflito', 'conflict')), 'warn'), ' ', t(f)))) : null,
    x.poach ? h('div', { class: 'row wrap small' }, pill(t(l('{b} oferece {p}%', '{b} offers {p}%'), { b: x.poach.by, p: Math.round(x.poach.rate * 100) }), 'bad'), ' ',
      ...(['match', 'bonus', 'ignore'] as PoachMove[]).map((m) => btn(m === 'bonus' ? t(l('Bônus de {v}', 'Bonus of {v}'), { v: $(poachBonus(s, a)) }) : t(m === 'match' ? l('Igualar comissão', 'Match commission') : l('Ignorar', 'Ignore')), () => res(answerPoach(s, r, a.id, m)), m === 'ignore' ? 'btn small ghost' : 'btn small'))) : null,
    h('div', { class: 'row wrap small' },
      t(l('Comissão', 'Commission')), ' ',
      select<number>(rate, [0.08, 0.1, 0.12, 0.15, 0.18, 0.2, 0.25].map((v) => ({ value: v, label: `${pct(v)}${v > c.rate ? ` (${pct(rateChance(s, c, v))})` : ''}` })), (v) => (rate = v)),
      btn(t(l('Propor', 'Propose')), () => res(renegotiateRate(s, r, a.id, rate))),
      btn(`${t(l('Marcar turnê', 'Book a tour'))} (${$(tourCost(s))})`, () => res(bookTour(s, r, a.id)), 'btn small', !tourReady(s, a.id)),
      select<Campaign>(camp, (['press', 'rebrand', 'charity'] as Campaign[]).map((k) => ({ value: k, label: `${t(CAMPAIGN_NAME[k])} (${$(campaignCost(s, k))})` })), (k) => (camp = k)),
      btn(t(l('Campanha', 'Campaign')), () => res(imageCampaign(s, r, a.id, camp)), 'btn small', !prReady(s, a.id)),
      canShop(s, a) && !pitch ? btn(t(l('Levar ao mercado', 'Shop a record deal')), () => res(shopDeal(s, r, a.id)), 'btn small primary') : null),
    pitch ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Gravadora', 'Label'), l('Adiantamento', 'Advance'), l('Royalty', 'Royalty'), l('Prazo', 'Term'), l('Sua comissão', 'Your cut'), l('', '')].map((y) => h('th', null, t(y))))),
      h('tbody', null, pitch.offers.map((o, i) => h('tr', null,
        h('td', null, o.party === 'player' ? h('span', null, s.config.companyName, ' ', pill(t(l('seu selo', 'your label')), 'warn')) : s.labels[o.party]?.name ?? '?'),
        h('td', null, $(o.advance)), h('td', null, pct(o.royalty)), h('td', null, `${o.term} ${t(l('meses', 'mo'))}`), h('td', null, $(Math.round(o.advance * c.rate))),
        h('td', null, btn(t(l('Fechar', 'Close')), () => res(acceptDeal(s, r, a.id, i)), 'btn tiny primary')))))) : null,
  );
}


export function reportsTab(s: GameState): HTMLElement {
  const st = mgr11(s);
  const reps = st.reports.slice().reverse();
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Fechamento de cada mês do escritório: comissões, satisfação e o que aconteceu. Conflitos expostos até hoje: {n}.', 'Each month\'s office close: commissions, satisfaction and what happened. Conflicts exposed so far: {n}.'), { n: st.exposed })),
    reps.length ? reps.map((rp) => h('div', { class: 'card' },
      h('div', { class: 'row between' }, h('h4', null, `${MONTHS[rp.m]} ${rp.y}`), h('b', null, $(rp.total))),
      h('table', { class: 'tbl compact' }, h('tbody', null, rp.lines.map((ln) => h('tr', null,
        h('td', null, s.acts[ln.actId] ? actLink(s, ln.actId) : '—'),
        h('td', null, $(ln.fee)),
        h('td', null, `${ln.sat} `, h('span', { class: ln.dsat > 0 ? 'good' : ln.dsat < 0 ? 'bad' : 'muted' }, ln.dsat > 0 ? `▲${ln.dsat}` : ln.dsat < 0 ? `▼${-ln.dsat}` : '·')),
        h('td', { class: 'small' }, ln.notes.map((n) => t(n)).join(' · ')))))))) : h('p', { class: 'muted' }, t(l('Nenhum relatório ainda: chegam no fim de cada mês com clientes.', 'No reports yet: they arrive at each month end once you have clients.'))),
  );
}

export function poachTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  let rate = 0.15;
  const cands = mgCandidates(s).filter((a) => a.fame >= 20).slice(0, 15);
  return h('div', null,
    h('p', { class: 'muted small' }, t(l('Artistas consagrados já têm empresário. Um bônus de assinatura (pago na hora, mesmo se recusarem) aumenta a chance — e os rivais fazem o mesmo com os seus.', 'Established acts already have managers. A signing bonus (paid upfront, even if they decline) raises the odds — and rivals do the same to yours.'))),
    h('div', { class: 'row wrap' }, t(l('Comissão proposta', 'Proposed commission')), ' ', select<number>(rate, [0.1, 0.12, 0.15, 0.18, 0.2].map((v) => ({ value: v, label: pct(v) })), (v) => (rate = v))),
    cands.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Artista', 'Act'), l('Fama', 'Fame'), l('Renda est./mês', 'Est. income/mo'), l('Bônus', 'Bonus'), l('Chance (15%)', 'Chance (15%)'), l('', '')].map((y) => h('th', null, t(y))))),
      h('tbody', null, cands.map((a) => h('tr', null, h('td', null, actLink(s, a.id)), h('td', null, String(Math.round(a.fame))), h('td', null, $(mgGross(s, a))), h('td', null, $(poachBonus(s, a))), h('td', null, pct(poachChance(s, a, 0.15))),
        h('td', null, btn(t(l('Roubar', 'Poach')), () => res(poachClient(s, r, a.id, rate)), 'btn tiny primary')))))) : h('p', { class: 'muted' }, t(l('Ninguém consagrado disponível agora.', 'No established act available now.'))),
    h('p', { class: 'small muted' }, `${t(l('Clientes', 'Clients'))}: ${ventures(s).mg.clients.length}`),
  );
}
