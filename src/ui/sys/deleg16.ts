// Rodada 16 — painel "Delegar": agentes de shows e promotores recebem ordens permanentes e prestam contas.
// Fica na tela de Equipe (Empresa) e na página do ato ("Agenciado por").

import { MARKETS, l } from '../../data/world';
import { VENUE_TIERS } from '../../data/rules';
import { t } from '../../i18n/strings';
import { ORDER_CAP, KINDS, addOrder, d16, delegates, eligibleActs, handlersOf, kindsOf, letGo, matchOffer, ordersOf, qLabel, quality, removeOrder, toggleOrder, type Order16, type OrderKind } from '../../sim/sys/deleg16';
import { tiersOpen } from '../../sim/sys/tour12';
import { liveOf } from '../../sim/sys/live/state';
import type { GameState, StaffMember } from '../../sim/types';
import { $, actLink, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerPageTab, registerSection } from '../registry';
import { store } from '../store';

interface Draft { kind: OrderKind; actId: string; market: string; tier: number; floor: number; budget: number; per: number }
const drafts: Record<string, Draft> = {};
const draftOf = (st: StaffMember): Draft => (drafts[st.id] ??= { kind: kindsOf(st.role)[0], actId: '', market: '', tier: -1, floor: 0, budget: 200, per: 1 });
const num = (v: number, on: (n: number) => void, w = 70) => h('input', { type: 'number', value: v, min: 0, style: `width:${w}px`, onchange: (e: Event) => on(Math.max(0, Number((e.target as HTMLInputElement).value) || 0)) });
const toneCls = (x: string) => (x === 'bad' ? 'bad' : x === 'good' ? 'good' : 'muted');

function orderText(s: GameState, o: Order16): string {
  const a = o.actId ? s.acts[o.actId]?.name : t(l('todos os atos', 'all acts'));
  const mk = o.market ? t(MARKETS.find((m) => m.id === o.market)?.name) : t(l('qualquer região', 'any region'));
  const tier = o.tier >= 0 ? t(VENUE_TIERS[o.tier]?.name) : t(l('porte automático', 'auto size'));
  switch (o.kind) {
    case 'tour': return `${a} · ${mk} · ${tier} · ${o.per} ${t(l('show(s)/mês', 'show(s)/mo'))} · ${t(l('piso', 'floor'))} ${$(o.floor * 100)}`;
    case 'fees': return `${a} · ${t(l('piso', 'floor'))} ${$(o.floor * 100)} · ${o.per} ${t(l('show(s)/mês', 'show(s)/mo'))}`;
    case 'festival': return `${o.per} ${t(l('atração(ões)/mês', 'act(s)/mo'))} · ${t(l('teto por atração', 'ceiling per act'))} ${o.budget ? $(o.budget * 100) : '—'} · ${t(l('fama mín.', 'min fame'))} ${o.tier >= 0 ? o.tier * 15 : 10}`;
    case 'promo': return `${a} · ${mk} · ${t(l('orçamento', 'budget'))} ${$(o.budget * 100)}/${t(l('mês', 'mo'))}`;
    default: return `${a} · ${t(l('orçamento', 'budget'))} ${$(o.budget * 100)}/${t(l('mês', 'mo'))}`;
  }
}

function newForm(s: GameState, st: StaffMember): HTMLElement {
  const d = draftOf(st), kinds = kindsOf(st.role);
  const acts = eligibleActs(s);
  if (!kinds.includes(d.kind)) d.kind = kinds[0];
  const needAct = d.kind === 'tour' || d.kind === 'radio' || d.kind === 'labelnight';
  const anyAct = d.kind === 'fees' || d.kind === 'promo';
  const open = tiersOpen(s);
  return h('div', { class: 'panel small' },
    h('b', null, t(l('Nova ordem', 'New order'))), ' ',
    select<string>(d.kind, kinds.map((k) => ({ value: k as string, label: t(KINDS[k].name) })), (v) => { d.kind = v as OrderKind; rerender(); }), ' ',
    needAct || anyAct ? select<string>(d.actId, [{ value: '', label: needAct ? t(l('Escolha o ato…', 'Pick the act…')) : t(l('Todos os atos', 'All acts')) }, ...acts.map((a) => ({ value: a.id, label: a.name }))], (v) => { d.actId = v; }) : null, ' ',
    d.kind === 'tour' || d.kind === 'promo' ? select<string>(d.market, [{ value: '', label: t(l('Qualquer região', 'Any region')) }, ...MARKETS.map((m) => ({ value: m.id as string, label: t(m.name) }))], (v) => { d.market = v; }) : null, ' ',
    d.kind === 'tour' ? select<number>(d.tier, [{ value: -1, label: t(l('Porte automático', 'Auto size')) }, ...open.map((i) => ({ value: i, label: t(VENUE_TIERS[i].name) }))], (v) => { d.tier = Number(v); }) : null,
    d.kind === 'festival' ? select<number>(d.tier, [{ value: -1, label: t(l('Fama mín. 10', 'Min fame 10')) }, ...[1, 2, 3, 4].map((i) => ({ value: i, label: `${t(l('Fama mín.', 'Min fame'))} ${i * 15}` }))], (v) => { d.tier = Number(v); }) : null, ' ',
    d.kind === 'tour' || d.kind === 'fees' ? h('label', null, t(l('Piso de cachê $', 'Fee floor $')), ' ', num(d.floor, (n) => { d.floor = n; })) : null, ' ',
    d.kind !== 'tour' && d.kind !== 'fees' ? h('label', null, d.kind === 'festival' ? t(l('Teto por atração $', 'Ceiling per act $')) : t(l('Orçamento/mês $', 'Budget/mo $')), ' ', num(d.budget, (n) => { d.budget = n; })) : null, ' ',
    d.kind === 'tour' || d.kind === 'fees' || d.kind === 'festival' || d.kind === 'promo' ? h('label', null, t(l('Quantidade/mês', 'Per month')), ' ', select<number>(d.per, [1, 2, 3].map((n) => ({ value: n, label: String(n) })), (v) => { d.per = Number(v); })) : null, ' ',
    h('button', { class: 'btn small', onclick: () => { const e = addOrder(s, st.id, d.kind, { actId: d.actId || undefined, market: d.market as never, tier: d.tier, floor: d.floor, budget: d.budget, per: d.per }); toast(t(e ?? l('Ordem dada: executa no próximo fechamento do mês.', 'Order given: it runs at the next month close.')), e ? 'bad' : 'good'); rerender(); } }, t(l('Delegar', 'Delegate'))),
    h('div', { class: 'muted small' }, t(KINDS[d.kind].desc)));
}

function card(s: GameState, st: StaffMember): HTMLElement {
  const d = d16(s), q = quality(s, st), mine = ordersOf(s, st.id), pend = d.pend.find((p) => p.staffId === st.id);
  const logs = d.log.filter((x) => x.staffId === st.id).slice(0, 8);
  const active = mine.filter((o) => o.on).length;
  return h('div', { class: 'panel' },
    h('div', { class: 'row' }, h('b', null, st.name), ' ', pill(t(st.role === 'promoter' ? l('Promotor', 'Promoter') : l('Agente de shows', 'Booking agent'))), ' ', pill(`${t(l('qualidade', 'quality'))}: ${t(qLabel(q.q))}`, q.q >= 0.6 ? 'good' : q.q < 0.4 ? 'bad' : ''), ' ',
      pill(`${active}/${ORDER_CAP} ${t(l('ordens', 'orders'))}`, active > ORDER_CAP ? 'bad' : ''), ' ', h('span', { class: 'muted small' }, `${$(st.salary)}/${t(l('mês', 'mo'))}`)),
    h('div', { class: 'muted small' }, q.why.map((x) => t(x)).join(' · '), ' — ', t(l(`risco de erro por ordem ~${Math.round(q.err * 100)}%`, `mistake risk per order ~${Math.round(q.err * 100)}%`))),
    pend ? h('div', { class: 'panel bad small' }, t(l('Selo rival fez uma proposta por esta pessoa.', 'A rival label made an offer for this person.')), ' ',
      h('button', { class: 'btn small', onclick: () => { const e = matchOffer(s, st.id); toast(t(e ?? l('Oferta coberta.', 'Offer matched.')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Cobrir', 'Match'))} +${$(pend.raise)}`), ' ',
      h('button', { class: 'btn small', onclick: () => { letGo(s, st.id); rerender(); } }, t(l('Deixar ir', 'Let go')))) : null,
    mine.length ? h('table', { class: 'tbl compact' }, h('tbody', null, mine.map((o) => h('tr', null,
      h('td', null, h('b', null, t(KINDS[o.kind].name))), h('td', { class: 'small' }, orderText(s, o)),
      h('td', null, h('button', { class: 'btn small', onclick: () => { toggleOrder(s, o.id); rerender(); } }, o.on ? t(l('Pausar', 'Pause')) : t(l('Retomar', 'Resume'))), ' ', h('button', { class: 'btn small', onclick: () => { removeOrder(s, o.id); rerender(); } }, t(l('Remover', 'Remove'))))))))
      : h('p', { class: 'muted small' }, t(l('Sem ordens: este profissional não faz nada sozinho. Dê uma ordem permanente.', 'No orders: this person does nothing on their own. Give a standing order.'))),
    newForm(s, st),
    logs.length ? h('details', { open: true }, h('summary', { class: 'small' }, t(l('Prestação de contas', 'Results log'))),
      h('ul', { class: 'small' }, logs.map((x) => h('li', { class: toneCls(x.tone) }, h('span', { class: 'muted' }, `${t(l('sem.', 'wk'))} ${x.w} · `), t(x.t))))) : null);
}

registerSection('company', {
  id: 'deleg16', order: 25,
  render: (s) => {
    if (store.companyTab !== 'staff') return null;
    const ds = delegates(s);
    return section(t(l('Delegar a agentes e promotores', 'Delegate to agents and promoters')),
      h('p', { class: 'muted small' }, t(l('Contrate "Agente de shows" e "Promotor" na lista de profissionais. Cada um cuida de até 3 ordens permanentes, executadas no fechamento do mês. A qualidade depende de habilidade, atributos e notoriedade do selo; eles erram, e selos rivais tentam levá-los.', 'Hire a "Booking agent" and a "Promoter" from the professionals list. Each handles up to 3 standing orders, run at month close. Quality depends on skill, attributes and label notoriety; they make mistakes, and rival labels try to poach them.'))),
      ds.length ? ds.map((st) => card(s, st)) : h('p', { class: 'muted small' }, t(l('Ninguém contratado ainda para esses cargos.', 'Nobody hired for these roles yet.'))),
      !liveOf(s).fests.length ? h('p', { class: 'muted small' }, t(l('Ordem "Preencher festival" só aparece com festival próprio.', 'The "Fill festival slots" order needs a festival of your own.'))) : null);
  },
});

registerPageTab('act', {
  id: 'deleg16', label: l('Agenciado por', 'Handled by'), icon: 'handshake', order: 42,
  when: (s, id) => eligibleActs(s).some((a) => a.id === id) && (delegates(s).length > 0 || d16(s).log.some((x) => x.actId === id)),
  render: (s, id) => {
    const hs = handlersOf(s, id), logs = d16(s).log.filter((x) => x.actId === id).slice(0, 8);
    return h('div', null,
      hs.length ? h('p', { class: 'small' }, t(l('Agenciado por', 'Handled by')), ': ', hs.map((x) => `${x.st.name} (${x.kinds.map((k) => t(KINDS[k].name)).join(', ')})`).join(' · '))
        : h('p', { class: 'muted small' }, t(l('Nenhum agente ou promotor cuida deste ato. Delegue em Empresa › Equipe.', 'No agent or promoter handles this act. Delegate in Company › Staff.'))),
      logs.length ? h('ul', { class: 'small' }, logs.map((x) => h('li', { class: toneCls(x.tone) }, t(x.t)))) : null,
      actLink(s, id));
  },
});
