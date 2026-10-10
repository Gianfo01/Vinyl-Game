// Planejador de turnê sobre a rota do mapa: setlist, produção, papel (headline/co/abertura),
// equipe, forma de pagamento, previsão e confirmação; turnês ativas com o status de cada data.

import { VENUE_TIERS } from '../../data/rules';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { cancelTour, estimateTour, planTour, type TourPlan } from '../../sim/tours';
import { produceMerch } from '../../sim/brands';
import type { GameState } from '../../sim/types';
import type { Tour } from '../../sim/xtypes';
import { money, playerActs } from '../../sim/util';
import { $, N, actLink, cityName, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { chips, dailyTimeline, ic, stat } from '../vis';
import { visibleAct } from '../../sim/future';
import { forecastTour } from '../../sim/sys/explain12';
import { forecastBox } from '../sys/explain12';
import { fameText } from '../../sim/sys/fame15';
import { labelTourNet16, sizedDraft16, suggestRoute16 } from '../../sim/route16';
import { kitDraft18, kitForm18 } from '../sys/live18';

const draft: Omit<TourPlan, 'cities' | 'actId'> & { actId?: string } = { startInDays: 21, priceMult: 1, minutes: 60, setlist: [], production: 1, role: 'headline', crew: 4, pay: 'door' };

const PROD = [l('Básica', 'Basic'), l('Luzes e telão', 'Lights and screens'), l('Cenografia', 'Stage design'), l('Espetáculo', 'Spectacle')];

export function tourPlannerSection(s: GameState, stops: string[], setStops?: (ids: string[]) => void): HTMLElement {
  const ids = playerActs(s);
  if (!ids.length) return section(t(l('Planejar turnê', 'Plan a tour')), h('p', { class: 'muted' }, t(l('Nenhum artista no elenco para levar à estrada.', 'No artists on the roster to take on the road.'))));
  if (!draft.actId || !ids.includes(draft.actId)) draft.actId = ids[0];
  const act = s.acts[draft.actId];
  const recorded = act.songs.map((id) => s.songs[id]).filter((x) => x?.recorded).sort((a, b) => b.q - a.q);
  const need = Math.ceil(draft.minutes / 4);
  draft.setlist = recorded.slice(0, need).map((x) => x.id);
  const others = Object.values(s.acts).filter((x) => visibleAct(s, x) && x.id !== act.id && x.status === 'active' && Math.abs(x.fame - act.fame) < 30).sort((a, b) => b.fame - a.fame).slice(0, 20);
  const plan: TourPlan = { ...draft, actId: act.id, cities: stops, kit: kitDraft18() };
  const est = stops.length ? estimateTour(s, plan) : null;
  return section(t(l('Planejar turnê', 'Plan a tour')),
    h('div', { class: 'form grid2' },
      h('label', null, t(l('Carreira', 'Career')), select(act.id, ids.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { draft.actId = v; rerender(); })),
      h('label', null, t(l('Começa em (dias)', 'Starts in (days)')), select(draft.startInDays, [7, 14, 21, 30, 45, 60, 90, 180].map((d) => ({ value: d, label: `${d}` })), (v) => { draft.startInDays = v; rerender(); })),
      h('label', null, t(l('Tempo de palco', 'Set length')), select(draft.minutes, [30, 45, 60, 90].map((m) => ({ value: m as TourPlan['minutes'], label: `${m} min` })), (v) => { draft.minutes = v; rerender(); })),
      h('label', null, t(l('Produção de palco', 'Stage production')), select(draft.production, PROD.map((p, i) => ({ value: i, label: t(p) })), (v) => { draft.production = v; rerender(); })),
      h('label', null, t(l('Papel', 'Billing')), select(draft.role, [{ value: 'headline' as const, label: t(l('Atração principal', 'Headliner')) }, { value: 'co' as const, label: t(l('Co-headline', 'Co-headline')) }, { value: 'opening' as const, label: t(l('Abertura', 'Opening act')) }], (v) => { draft.role = v; rerender(); })),
      draft.role !== 'headline' ? h('label', null, t(l('Parceiro', 'Partner')), select(draft.partnerActId ?? '', [{ value: '', label: '—' }, ...others.map((x) => ({ value: x.id, label: `${x.name} (★${fameText(s, x.id)})` }))], (v) => { draft.partnerActId = v || undefined; rerender(); })) : null,
      h('label', null, t(l('Equipe técnica', 'Road crew')), select(draft.crew, [1, 2, 4, 6, 10, 16].map((n) => ({ value: n, label: `${n}` })), (v) => { draft.crew = v; rerender(); })),
      h('label', null, t(l('Ingresso', 'Ticket price')), select(draft.priceMult, [0.6, 0.8, 1, 1.25, 1.5, 2].map((m) => ({ value: m, label: `×${m}` })), (v) => { draft.priceMult = v; rerender(); })),
      h('label', null, t(l('Pagamento', 'Pay deal')), select(draft.pay, [{ value: 'door' as const, label: t(l('Bilheteria (65% líquida)', 'Door (65% net)')) }, { value: 'guarantee' as const, label: t(l('Cachê fixo', 'Flat fee')) }, { value: 'hybrid' as const, label: t(l('Garantia + 45%', 'Guarantee + 45%')) }, { value: 'versus' as const, label: t(l('Garantia ou porta (o maior)', 'Guarantee vs door (higher)')) }], (v) => { draft.pay = v; rerender(); })),
    ),
    kitForm18(s, plan, est),
    h('p', { class: 'small' }, ic('disc'), ' ', t(l('Setlist: {n} gravações próprias ({q} necessárias){c}.', 'Setlist: {n} own recordings ({q} needed){c}.'), { n: draft.setlist.length, q: need, c: draft.setlist.length < need ? t(l(' — o resto vira covers, com penalidade', ' — the rest will be covers, with a penalty')) : '' })),
    !stops.length ? h('p', { class: 'muted small' }, t(l('Monte a rota clicando nas cidades do mapa acima.', 'Build the route by clicking cities on the map above.'))) : null,
    setStops ? routeHintRow(s, act.id, setStops) : null,
    est ? h('div', null,
      chips(stat('tour-bus', stops.length, l('Datas', 'Dates')), stat('globe', `${N(est.km)} km`, l('Distância', 'Distance')), stat('calendar', `${est.days}d`, l('Duração', 'Duration')),
        stat('money', $(est.logistics), l('Logística (reservada agora)', 'Logistics (booked now)')), stat('chart-up', $(est.expectedRevenue), l('Bilheteria bruta prevista', 'Expected gross box office')), stat('shirt', $(est.expectedMerch), l('Merch previsto', 'Expected merch')),
        est.visas ? stat('key', est.visas, l('Vistos', 'Visas'), 'warn') : null),
      h('div', { class: 'tour-stops' }, est.stops.map((st) => h('span', { class: 'stop' }, ic(st.travelDays > 1 ? 'plane' : 'tour-bus'), h('b', null, cityName(st.cityId)), h('small', null, t(VENUE_TIERS[st.tier].name))))),
      ((n) => h('p', { class: `small ${n.net < 0 && -n.net > s.player.cash * 0.25 ? 'bad' : 'muted'}` }, ic('money'), ' ', t(n.why), n.net < 0 && -n.net > s.player.cash * 0.25 ? t(l(' Atenção: é mais de 1/4 do caixa.', ' Warning: that is over 1/4 of your cash.')) : ''))(labelTourNet16(s, act.id, est)),
      est.warnings.length ? h('ul', { class: 'small warn' }, est.warnings.map((w) => h('li', null, ic('warning'), ' ', t(w)))) : null,
      forecastBox(forecastTour(s, plan, est)),
      h('button', { class: 'btn primary', onclick: () => {
        const res = planTour(s, plan);
        if ('pt' in res) toast(t(res), 'bad');
        else {
          toast(t(l('Turnê marcada! A logística foi reservada.', 'Tour booked! Logistics reserved.')), 'good');
          rerender();
        }
      } }, ic('tour-bus'), ' ', t(l('Confirmar turnê', 'Confirm tour'))),
    ) : null,
  );
}

function stopIcon(st: Tour['stops'][number]): string {
  return st.status === 'played' ? 'trophy' : st.status === 'cancelled' ? 'warning' : 'calendar';
}

export function activeToursSection(s: GameState): HTMLElement | null {
  const tours = s.tours.filter((x) => x.status === 'planned' || x.status === 'running' || (x.status === 'done' && s.day - (x.stops.at(-1)?.day ?? 0) < 120));
  if (!tours.length) return null;
  return section(t(l('Turnês', 'Tours')), tours.map((tr) => h('div', { class: 'tour' },
    h('header', null, ic('tour-bus', 2), h('b', null, tr.name), ' ', actLink(s, tr.actId), ' ', pill(t({ planned: l('marcada', 'booked'), running: l('na estrada', 'on the road'), done: l('encerrada', 'finished'), cancelled: l('cancelada', 'cancelled') }[tr.status]), tr.status === 'running' ? 'good' : ''),
      chips(stat('money', $(tr.revenue), l('Receita', 'Revenue')), stat('fans', N(tr.stops.reduce((x, y) => x + y.sold, 0)), l('Público', 'Attendance')), tr.accidents ? stat('warning', tr.accidents, l('Acidentes', 'Accidents'), 'bad') : null),
      tr.status === 'planned' || tr.status === 'running' ? h('button', { class: 'btn small ghost', onclick: () => { const e = cancelTour(s, tr.id); if (e) toast(t(e), 'bad'); rerender(); } }, t(l('Cancelar (devolve metade)', 'Cancel (half refunded)'))) : null),
    h('div', { class: 'tour-stops' }, tr.stops.map((st) => h('span', { class: `stop ${st.status}`, title: st.note ? t(st.note) : '' }, ic(stopIcon(st)), h('b', null, cityName(st.cityId)), st.status === 'played' ? h('small', null, `${N(st.sold)}/${N(st.capacity)}`) : st.note ? h('small', null, t(st.note)) : null))),
    dailyTimeline(s, tr.actId, 6),
  )));
}

export function merchSection(s: GameState): HTMLElement {
  const ids = playerActs(s);
  return section(t(l('Merch', 'Merch')), h('div', { class: 'cards' }, ids.map((id) => {
    const a = s.acts[id];
    const m = s.merch[id];
    return h('div', { class: 'tile' }, h('div', { class: 'tile-ic' }, ic('shirt', 2)), h('div', { class: 'tile-body' },
      h('b', null, a.name),
      m ? chips(stat('shirt', N(m.stock), l('Estoque', 'Stock')), stat('money', $(m.revenue), l('Receita', 'Revenue')), stat('sparkle', m.quality, l('Qualidade', 'Quality'))) : h('small', { class: 'muted' }, t(l('Sem linha de merch.', 'No merch line.'))),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: () => { const e = produceMerch(s, id, 300, 50); toast(e ? t(e) : t(l('300 peças produzidas.', '300 pieces produced.')), e ? 'bad' : 'good'); rerender(); } }, `+300 (${$(money(s, 300 * 4 + 300))})`),
        h('button', { class: 'btn small ghost', onclick: () => { const e = produceMerch(s, id, 1000, 80); toast(e ? t(e) : t(l('Linha premium produzida.', 'Premium line produced.')), e ? 'bad' : 'good'); rerender(); } }, `+1000 premium`),
      ),
    ));
  })));
}

/** Rodada 16: botão de rota sugerida (cidades de maior procura) com o porquê. */
function routeHintRow(s: GameState, actId: string, setStops: (ids: string[]) => void): HTMLElement {
  const r = suggestRoute16(s, actId);
  return h('div', { class: 'row wrap' },
    h('button', { class: 'btn small', disabled: !r.ids.length, title: t(r.why), onclick: () => { Object.assign(draft, sizedDraft16(s, actId)); setStops(r.ids); toast(t(r.why), 'info'); } }, ic('globe'), ' ', t(l('Sugerir rota (maior procura)', 'Suggest route (top demand)'))),
    h('small', { class: 'muted' }, t(r.why)));
}
