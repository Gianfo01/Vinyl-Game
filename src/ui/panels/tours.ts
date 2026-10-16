// Planejador de turnê sobre a rota do mapa: setlist, produção, papel (headline/co/abertura),
// equipe, forma de pagamento, previsão e confirmação; turnês ativas com o status de cada data.

import { lockBtn31 } from '../r31/lock31';
import { tourLock31 } from '../r31/quick31core';
import { cashLock31 } from '../../sim/r31/lock';
import { VENUE_TIERS } from '../../data/rules';
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { cancelTour, estimateTour, legOptions31, planTour, type TourEstimate, type TourPlan, tourList } from '../../sim/tours';
import { on31 } from '../../sim/r31/market31';
import { activeMembers } from '../../sim/capacity';
import type { TransportMode } from '../../sim/travel';
import { draftConflicts20 } from '../../sim/sys/shows20';
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
import { labelTourNet16, sizedDraft16, suggestRoute16 } from '../../sim/sys/road27';
import { kitDraft18, kitForm18 } from '../sys/live18';
import { changeTour20, futureStops20, tourChangeQuote20, type TourChange20 } from '../../sim/sys/showops20';
import { FLY_FROM18, KIT_TXT18 } from '../../sim/sys/live18';
import { KIT0, type Kit18 } from '../../sim/tourhook18';
import { openRoad27 } from '../act27/road27'; // r27 (P2B)
import { bookTour27 } from '../act27/flow27p2'; // r27 FLOW2: "Confirmar turnê" abre a turnê no mapa (rápido dentro)
import { isRoad27 } from '../../sim/sys/road27';
import { tourMark27 } from '../act27/flow27';
import { a29 } from '../art29ui'; // r29 (arte)
import { merchImg29, vehicleImg29 } from '../pixel/things29';

const draft: Omit<TourPlan, 'cities' | 'actId'> & { actId?: string } = { startInDays: 21, priceMult: 1, minutes: 60, setlist: [], production: 1, role: 'headline', crew: 4, pay: 'door' };
/** R31 D: transporte escolhido por trecho ("de>para" → meio); trecho sem escolha = automático pela época. */
const legPick31: Record<string, TransportMode> = {};
const legModes31 = (s: GameState, actId: string, stops: string[]): (TransportMode | undefined)[] => {
  let prev = s.location[actId] ?? s.acts[actId]?.city ?? '';
  return stops.map((c) => { const k = `${prev}>${c}`; prev = c; return legPick31[k]; });
};
/** R31 D: escolha do transporte de cada trecho (opções reais da época; custo × tempo × cansaço). */
function legChooser31(s: GameState, actId: string, stops: string[], crew: number): HTMLElement | null {
  if (!on31(s, 'd31.transport') || !stops.length) return null;
  const act = s.acts[actId];
  const people = activeMembers(s, act).length + Math.max(1, crew);
  let prev = s.location[actId] ?? act.city;
  const rows: HTMLElement[] = [];
  for (const c of stops) {
    const from = prev, k = `${from}>${c}`;
    prev = c;
    const ops = legOptions31(s, from, c, people);
    if (ops.length < 2) continue;
    const cur = legPick31[k] ?? ops[0].mode;
    rows.push(h('label', null, `${cityName(from)} → ${cityName(c)}`, select(cur, ops.map((o) => ({ value: o.mode, label: `${t(o.name)}${o.auto ? ` (${t(l('automático', 'automatic'))})` : ''} · ${o.days}d · ${$(o.cost)} · ${t(l('cansaço', 'fatigue'))} +${String(o.fatigue).replace('.', t(l(',', '.')))}` })), (v) => { if (v === ops[0].mode) delete legPick31[k]; else legPick31[k] = v; rerender(); })));
  }
  if (!rows.length) return null;
  return h('details', { class: 'legs31' }, h('summary', null, ic('globe'), ' ', t(l('Transporte por trecho (padrão: automático pela época)', 'Transport per leg (default: automatic by era)'))),
    h('p', { class: 'small muted' }, t(l('Navio é lento, barato e cansa pouco; trem é o meio-termo; avião é rápido e caro. As datas da turnê mudam com a escolha.', 'Ships are slow, cheap and restful; trains are the middle ground; planes are fast and pricey. Tour dates shift with the choice.'))),
    h('div', { class: 'form' }, ...rows));
}

/** R31 (O): o painel rápido abre o planejador já no artista escolhido. */
export function setTourAct31(actId: string): void { draft.actId = actId; }

const PROD = [l('Básica', 'Basic'), l('Luzes e telão', 'Lights and screens'), l('Cenografia', 'Stage design'), l('Espetáculo', 'Spectacle')];

/** r20: etapas do planejamento (rota → datas/locais → logística → ingressos/merch → revisão). */
export const TOUR_STEPS20: L[] = [l('Rota', 'Route'), l('Datas e locais', 'Dates and venues'), l('Logística', 'Logistics'), l('Ingressos e merch', 'Tickets and merch'), l('Revisão', 'Review')];

/** r20: conflitos da turnê em rascunho (lógica em sim/sys/shows20), em texto. */
export function tourConflicts20(s: GameState, actId: string, est: TourEstimate): { hard: L[]; soft: L[] } {
  const c = draftConflicts20(s, actId, est.stops);
  return { hard: c.hard.map((x) => l(`${cityName(x.city)}: já há data marcada nessa semana (${cityName(x.other)})`, `${cityName(x.city)}: already booked that week (${cityName(x.other)})`)), soft: c.soft };
}

/** r20: painel vivo de custo, receita e risco (sempre à vista em todas as etapas). */
export function tourLivePanel20(s: GameState, est: TourEstimate | null, actId: string): HTMLElement {
  if (!est) return h('div', { class: 'live20 muted small', role: 'status' }, ic('money'), ' ', t(l('Escolha cidades para ver custo, receita e risco.', 'Pick cities to see cost, revenue and risk.')));
  const net = est.expectedRevenue + est.expectedMerch - est.logistics;
  const cf = tourConflicts20(s, actId, est);
  const risk = est.warnings.length + cf.hard.length + cf.soft.length + (est.visas ? 1 : 0);
  return h('div', { class: 'live20', role: 'status', 'aria-live': 'polite' },
    chips(stat('money', $(est.logistics), l('Custo (logística)', 'Cost (logistics)')), stat('chart-up', $(est.expectedRevenue + est.expectedMerch), l('Receita prevista (bruta + merch)', 'Expected revenue (gross + merch)')),
      stat('bank', $(net), l('Saldo previsto', 'Expected net'), net < 0 ? 'bad' : 'good'),
      stat('warning', String(risk), l('Riscos', 'Risks'), cf.hard.length ? 'bad' : risk ? 'warn' : 'good')),
    cf.hard.length ? h('small', { class: 'bad' }, ic('warning'), ' ', t(l('{n} conflito(s) duro(s) — veja a revisão', '{n} hard conflict(s) — see review'), { n: cf.hard.length })) : null);
}

/** r20: rascunho atual (para o hub calcular o painel vivo sem duplicar o estimador). */
export function tourDraftEstimate20(s: GameState, stops: string[]): { est: TourEstimate | null; actId: string | null } {
  const ids = playerActs(s);
  if (!ids.length) return { est: null, actId: null };
  const actId = draft.actId && ids.includes(draft.actId) ? draft.actId : ids[0];
  const plan: TourPlan = { ...draft, actId, cities: stops, kit: kitDraft18(), legModes: legModes31(s, actId, stops) };
  return { est: stops.length ? estimateTour(s, plan) : null, actId };
}

export function tourPlannerSection(s: GameState, stops: string[], setStops?: (ids: string[]) => void, step?: number): HTMLElement {
  const ids = playerActs(s);
  if (!ids.length) return section(t(l('Planejar turnê', 'Plan a tour')), h('p', { class: 'muted' }, t(l('Nenhum artista no elenco para levar à estrada.', 'No artists on the roster to take on the road.'))));
  if (!draft.actId || !ids.includes(draft.actId)) draft.actId = ids[0];
  const act = s.acts[draft.actId];
  const recorded = act.songs.map((id) => s.songs[id]).filter((x) => x?.recorded).sort((a, b) => b.q - a.q);
  const need = Math.ceil(draft.minutes / 4);
  draft.setlist = recorded.slice(0, need).map((x) => x.id);
  const others = Object.values(s.acts).filter((x) => visibleAct(s, x) && x.id !== act.id && x.status === 'active' && Math.abs(x.fame - act.fame) < 30).sort((a, b) => b.fame - a.fame).slice(0, 20);
  const plan: TourPlan = { ...draft, actId: act.id, cities: stops, kit: kitDraft18(), legModes: legModes31(s, act.id, stops) };
  const est = stops.length ? estimateTour(s, plan) : null;
  const all = step === undefined;
  const on = (k: number) => all || step === k;
  const fActor = h('label', null, t(l('Carreira', 'Career')), select(act.id, ids.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { draft.actId = v; rerender(); }));
  const fStart = h('label', null, t(l('Começa em (dias)', 'Starts in (days)')), select(draft.startInDays, [7, 14, 21, 30, 45, 60, 90, 180].map((d) => ({ value: d, label: `${d}` })), (v) => { draft.startInDays = v; rerender(); }));
  const fMin = h('label', null, t(l('Tempo de palco', 'Set length')), select(draft.minutes, [30, 45, 60, 90].map((m) => ({ value: m as TourPlan['minutes'], label: `${m} min` })), (v) => { draft.minutes = v; rerender(); }));
  const fProd = h('label', null, t(l('Produção de palco', 'Stage production')), select(draft.production, PROD.map((p, i) => ({ value: i, label: t(p) })), (v) => { draft.production = v; rerender(); }));
  const fRole = h('label', null, t(l('Papel', 'Billing')), select(draft.role, [{ value: 'headline' as const, label: t(l('Atração principal', 'Headliner')) }, { value: 'co' as const, label: t(l('Co-headline', 'Co-headline')) }, { value: 'opening' as const, label: t(l('Abertura', 'Opening act')) }], (v) => { draft.role = v; rerender(); }));
  const fPartner = draft.role !== 'headline' ? h('label', null, t(l('Parceiro', 'Partner')), select(draft.partnerActId ?? '', [{ value: '', label: '—' }, ...others.map((x) => ({ value: x.id, label: `${x.name} (★${fameText(s, x.id)})` }))], (v) => { draft.partnerActId = v || undefined; rerender(); })) : null;
  const fCrew = h('label', null, t(l('Equipe técnica', 'Road crew')), select(draft.crew, [1, 2, 4, 6, 10, 16].map((n) => ({ value: n, label: `${n}` })), (v) => { draft.crew = v; rerender(); }));
  const fPrice = h('label', null, t(l('Ingresso', 'Ticket price')), select(draft.priceMult, [0.6, 0.8, 1, 1.25, 1.5, 2].map((m) => ({ value: m, label: `×${m}` })), (v) => { draft.priceMult = v; rerender(); }));
  const fPay = h('label', null, t(l('Pagamento', 'Pay deal')), select(draft.pay, [{ value: 'door' as const, label: t(l('Bilheteria (65% líquida)', 'Door (65% net)')) }, { value: 'guarantee' as const, label: t(l('Cachê fixo', 'Flat fee')) }, { value: 'hybrid' as const, label: t(l('Garantia + 45%', 'Guarantee + 45%')) }, { value: 'versus' as const, label: t(l('Garantia ou porta (o maior)', 'Guarantee vs door (higher)')) }], (v) => { draft.pay = v; rerender(); }));
  const form = all ? [fActor, fStart, fMin, fProd, fRole, fPartner, fCrew, fPrice, fPay]
    : step === 0 ? [fActor] : step === 1 ? [fStart, fMin, fRole, fPartner] : step === 2 ? [fProd, fCrew] : step === 3 ? [fPrice, fPay] : [];
  const cf = est && on(4) ? tourConflicts20(s, act.id, est) : null;
  return section(t(l('Planejar turnê', 'Plan a tour')),
    form.some(Boolean) ? h('div', { class: 'form grid2' }, ...form) : null,
    on(2) ? kitForm18(s, plan, est) : null,
    on(2) ? legChooser31(s, act.id, stops, draft.crew) : null,
    on(1) ? h('p', { class: 'small' }, ic('disc'), ' ', t(l('Setlist: {n} gravações próprias ({q} necessárias){c}.', 'Setlist: {n} own recordings ({q} needed){c}.'), { n: draft.setlist.length, q: need, c: draft.setlist.length < need ? t(l(' — o resto vira covers, com penalidade', ' — the rest will be covers, with a penalty')) : '' })) : null,
    !stops.length && on(0) ? h('p', { class: 'muted small' }, t(all ? l('Monte a rota clicando nas cidades do mapa acima.', 'Build the route by clicking cities on the map above.') : l('Monte a rota clicando nas cidades do mapa ou na lista de cidades.', 'Build the route by clicking cities on the map or in the city list.'))) : null,
    setStops && on(0) ? routeHintRow(s, act.id, setStops) : null,
    !all && step === 1 && est ? h('div', { class: 'tour-stops' }, est.stops.map((st) => h('span', { class: 'stop' }, ic(st.travelDays > 1 ? 'plane' : 'tour-bus'), h('b', null, cityName(st.cityId)), h('small', null, t(VENUE_TIERS[st.tier].name), ` · ${N(st.capacity)}`)))) : null,
    !all && step === 3 && est ? chips(stat('chart-up', $(est.expectedRevenue), l('Bilheteria bruta prevista', 'Expected gross box office')), stat('shirt', $(est.expectedMerch), l('Merch previsto', 'Expected merch')), s.merch[act.id] ? stat('shirt', N(s.merch[act.id].stock), l('Estoque de merch', 'Merch stock')) : null) : null,
    est && on(4) ? h('div', null,
      chips(stat('tour-bus', stops.length, l('Datas', 'Dates')), stat('globe', `${N(est.km)} km`, l('Distância', 'Distance')), stat('calendar', `${est.days}d`, l('Duração', 'Duration')),
        stat('money', $(est.logistics), l('Logística (reservada agora)', 'Logistics (booked now)')), stat('chart-up', $(est.expectedRevenue), l('Bilheteria bruta prevista', 'Expected gross box office')), stat('shirt', $(est.expectedMerch), l('Merch previsto', 'Expected merch')),
        est.visas ? stat('key', est.visas, l('Vistos', 'Visas'), 'warn') : null),
      h('div', { class: 'tour-stops' }, est.stops.map((st) => h('span', { class: 'stop' }, ic(st.travelDays > 1 ? 'plane' : 'tour-bus'), h('b', null, cityName(st.cityId)), h('small', null, t(VENUE_TIERS[st.tier].name))))),
      ((n) => h('p', { class: `small ${n.net < 0 && -n.net > s.player.cash * 0.25 ? 'bad' : 'muted'}` }, ic('money'), ' ', t(n.why), n.net < 0 && -n.net > s.player.cash * 0.25 ? t(l(' Atenção: é mais de 1/4 do caixa.', ' Warning: that is over 1/4 of your cash.')) : ''))(labelTourNet16(s, act.id, est)),
      est.warnings.length ? h('ul', { class: 'small warn' }, est.warnings.map((w) => h('li', null, ic('warning'), ' ', t(w)))) : null,
      cf && (cf.hard.length || cf.soft.length) ? h('div', { class: 'conf20' },
        cf.hard.length ? h('div', null, h('b', { class: 'bad' }, ic('lock'), ' ', t(l('Conflitos duros (o artista estaria em dois lugares)', 'Hard conflicts (the act would be in two places)'))), h('ul', { class: 'small' }, cf.hard.map((x) => h('li', null, t(x))))) : null,
        cf.soft.length ? h('div', null, h('b', { class: 'warn' }, ic('fans'), ' ', t(l('Conflitos brandos (disputa de público — a mesma conta entra no acerto do show)', 'Soft conflicts (audience competition — the same math applies at settlement)'))), h('ul', { class: 'small' }, cf.soft.map((x) => h('li', null, t(x))))) : null) : null,
      forecastBox(forecastTour(s, plan, est)),
      lockBtn31([ic('tour-bus'), ' ', t(l('Confirmar turnê', 'Confirm tour'))], tourLock31(s, act) ?? cashLock31(s, est.logistics, l('Caixa insuficiente para reservar a logística.', 'Not enough cash to book logistics.')), () => bookTour27(s, act.id, stops, draft.startInDays, () => {
        const res = planTour(s, plan);
        if ('pt' in res) toast(t(res), 'bad');
        else {
          toast(t(l('Turnê marcada! A logística foi reservada.', 'Tour booked! Logistics reserved.')), 'good');
          afterBook20?.();
          rerender();
        }
      }), { cls: 'btn primary' }), // R31 (RN-04): turnê já marcada, pausa ou caixa aparecem antes do clique
    ) : null,
    !all && step === 4 && !est ? h('p', { class: 'muted small' }, t(l('Sem rota ainda: volte à etapa Rota.', 'No route yet: go back to the Route step.'))) : null,
  );
}

/** r20: depois de marcar, o hub abre a operação da turnê. */
let afterBook20: (() => void) | null = null;
export function onTourBooked20(fn: () => void): void { afterBook20 = fn; }
/** r20: aplica a política de uma turnê anterior ao rascunho (sem repetir a rota). */
export function copyTourPolicy20(tr: Tour): void {
  Object.assign(draft, { actId: tr.actId, minutes: tr.minutes, production: tr.production, role: tr.role, partnerActId: tr.partnerActId, crew: tr.crew, pay: tr.pay });
}

function stopIcon(st: Tour['stops'][number]): string {
  return st.status === 'played' ? 'trophy' : st.status === 'cancelled' ? 'warning' : 'calendar';
}

export function activeToursSection(s: GameState): HTMLElement | null {
  const tours = tourList(s).filter((x) => x.status === 'planned' || x.status === 'running' || (x.status === 'done' && s.day - (x.stops.at(-1)?.day ?? 0) < 120));
  if (!tours.length) return null;
  return section(t(l('Turnês', 'Tours')), tours.map((tr) => h('div', { class: 'tour' },
    h('header', null, a29(vehicleImg29(({ ...KIT0, ...(tr.kit18 ?? {}) } as Kit18).move, s.year, tr.id, 64)), h('b', null, tr.name), /* r29: veículo da época */ ' ', actLink(s, tr.actId), ' ', pill(t({ planned: l('marcada', 'booked'), running: l('na estrada', 'on the road'), done: l('encerrada', 'finished'), cancelled: l('cancelada', 'cancelled') }[tr.status]), tr.status === 'running' ? 'good' : ''),
      chips(stat('money', $(tr.revenue), l('Receita', 'Revenue')), stat('fans', N(tr.stops.reduce((x, y) => x + y.sold, 0)), l('Público', 'Attendance')), tr.accidents ? stat('warning', tr.accidents, l('Acidentes', 'Accidents'), 'bad') : null),
      tr.status === 'planned' || tr.status === 'running' ? h('button', { class: 'btn small ghost', onclick: () => { const e = cancelTour(s, tr.id); if (e) toast(t(e), 'bad'); rerender(); } }, t(l('Cancelar (devolve metade)', 'Cancel (half refunded)'))) : null,
      tourMark27(s, tr.id), // r27 FLOW: o próximo show é jogado no avanço (Jogar / Resolver rápido), não num botão à parte
      isRoad27(s, tr.id) && (tr.status === 'planned' || tr.status === 'running') ? h('button', { class: 'btn small ghost', onclick: () => openRoad27(tr.id) }, t(l('Diário de estrada', 'Road journal'))) : null), // r27 (P2B; FLOW2: os eventos também chegam no Avançar)
    h('div', { class: 'tour-stops' }, tr.stops.map((st) => h('span', { class: `stop ${st.status}`, title: st.note ? t(st.note) : '' }, ic(stopIcon(st)), h('b', null, cityName(st.cityId)), st.status === 'played' ? h('small', null, `${N(st.sold)}/${N(st.capacity)}`) : st.note ? h('small', null, t(st.note)) : null))),
    tr.status === 'planned' || tr.status === 'running' ? tourChangeForm20(s, tr) : null,
    dailyTimeline(s, tr.actId, 6),
  )));
}

// r20b (Z2): alterar kit, equipe e ingresso das datas futuras depois de marcar (prévia = lançamento)
const chg20 = new Map<string, TourChange20>();
const chgOpen20 = new Set<string>();
function tourChangeForm20(s: GameState, tr: Tour): HTMLElement | null {
  if (!playerActs(s).includes(tr.actId) || !futureStops20(s, tr).length) return null;
  const ch = chg20.get(tr.id) ?? {};
  const cur: Kit18 = { ...KIT0, ...(tr.kit18 ?? {}), ...(ch.kit ?? {}) };
  const setK = <K extends keyof Kit18>(k: K, v: Kit18[K]) => { chg20.set(tr.id, { ...ch, kit: { ...(ch.kit ?? {}), [k]: v } }); rerender(); };
  const opt = <V extends string | number>(o: Record<string, L> | L[], keys: V[]) => keys.map((k) => ({ value: k, label: t((o as Record<string, L>)[k as unknown as string]) }));
  const q = tourChangeQuote20(s, tr.id, ch);
  const dirty = !!ch.kit || ch.crew !== undefined || ch.priceMult !== undefined;
  const sign = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${$(Math.abs(v))}`;
  return h('details', { class: 'tourchg20', open: chgOpen20.has(tr.id) ? true : undefined, ontoggle: (e: Event) => { if ((e.currentTarget as HTMLDetailsElement).open) chgOpen20.add(tr.id); else chgOpen20.delete(tr.id); } },
    h('summary', null, ic('pen'), ' ', t(l('Alterar datas futuras ({n})', 'Change future dates ({n})'), { n: futureStops20(s, tr).length })),
    h('p', { class: 'small muted' }, t(l('Vale só para datas ainda não jogadas; shows jogados não mudam. O promotor é contrato. Reduzir serviços devolve metade da economia (multa de cancelamento).', 'Applies only to dates not yet played; played shows never change. The promoter is a contract. Cutting services refunds half the savings (cancellation fee).'))),
    h('div', { class: 'form grid2' },
      h('label', null, t(l('Transporte', 'Transport')), select(cur.move, opt(KIT_TXT18.move, (s.year >= FLY_FROM18 ? ['van', 'bus', 'fly'] : ['van', 'bus']) as Kit18['move'][]), (v) => setK('move', v))),
      h('label', null, t(l('Hospedagem', 'Lodging')), select(cur.bed, opt(KIT_TXT18.bed, ['cheap', 'std', 'good'] as Kit18['bed'][]), (v) => setK('bed', v))),
      h('label', null, t(l('Diárias', 'Per diems')), select(cur.diem, opt(KIT_TXT18.diem, [0, 1, 2] as Kit18['diem'][]), (v) => setK('diem', Number(v) as Kit18['diem']))),
      h('label', null, t(l('Equipamento', 'Gear')), select(cur.gear, opt(KIT_TXT18.gear, ['own', 'rent'] as Kit18['gear'][]), (v) => setK('gear', v))),
      tr.status === 'planned' ? h('label', null, t(l('Ensaio', 'Rehearsal')), select(cur.reh, opt(KIT_TXT18.reh, [0, 1, 2] as Kit18['reh'][]), (v) => setK('reh', Number(v) as Kit18['reh']))) : null,
      h('label', null, t(l('Seguro', 'Insurance')), select(cur.ins, opt(KIT_TXT18.ins, [0, 1] as Kit18['ins'][]), (v) => setK('ins', Number(v) as Kit18['ins']))),
      h('label', null, t(l('Segurança do público', 'Crowd security')), select(cur.sec, opt(KIT_TXT18.sec, [0, 1, 2] as Kit18['sec'][]), (v) => setK('sec', Number(v) as Kit18['sec']))),
      h('label', null, t(l('Equipe técnica', 'Road crew')), select(ch.crew ?? tr.crew, [...new Set([1, 2, 4, 6, 10, 16, tr.crew])].sort((a, b) => a - b).map((n) => ({ value: n, label: `${n}` })), (v) => { chg20.set(tr.id, { ...ch, crew: Number(v) }); rerender(); })),
      h('label', null, t(l('Ingresso (datas futuras)', 'Ticket (future dates)')), select(ch.priceMult ?? 0, [{ value: 0, label: t(l('manter', 'keep')) }, ...[0.6, 0.8, 1, 1.25, 1.5, 2].map((m) => ({ value: m, label: `×${m}` }))], (v) => { chg20.set(tr.id, { ...ch, priceMult: Number(v) ? Number(v) : undefined }); rerender(); })),
    ),
    dirty ? h('div', { class: 'small', role: 'status' },
      chips(stat('bank', sign(q.delta), l('Logística das datas futuras (diferença)', 'Future-date logistics (difference)'), q.delta > 0 ? 'warn' : 'good'),
        q.fee ? stat('warning', $(q.fee), l('Multa de cancelamento', 'Cancellation fee'), 'warn') : null,
        stat('money', sign(q.cash), l('Efeito no caixa agora', 'Cash effect now'), q.cash < 0 ? 'warn' : 'good'),
        stat('fans', sign(q.revAfter - q.revBefore), l('Bilheteria prevista (mesma conta do planejamento)', 'Expected box office (same math as planning)'))),
      q.parts.length ? h('ul', null, q.parts.map(([n, v]) => h('li', null, `${t(n)}${v ? `: ${sign(v)}` : ''}`))) : null,
      q.warn.length ? h('ul', { class: 'warn' }, q.warn.map((w) => h('li', null, t(w)))) : null,
      !q.ok && q.why ? h('p', { class: 'bad' }, t(q.why)) : null) : null,
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small primary', disabled: !dirty || !q.ok ? true : undefined, title: q.why ? t(q.why) : undefined, onclick: () => { const r = changeTour20(s, tr.id, ch); if ('ok' in r) { chg20.delete(tr.id); toast(t(l('Turnê alterada.', 'Tour changed.')), 'good'); } else toast(t(r), 'bad'); rerender(); } }, t(l('Aplicar alteração', 'Apply change'))),
      dirty ? h('button', { class: 'btn small ghost', onclick: () => { chg20.delete(tr.id); rerender(); } }, t(l('Descartar', 'Discard'))) : null));
}

export function merchSection(s: GameState): HTMLElement {
  const ids = playerActs(s);
  return section(t(l('Merch', 'Merch')), h('div', { class: 'cards' }, ids.map((id) => {
    const a = s.acts[id];
    const m = s.merch[id];
    return h('div', { class: 'tile' }, h('div', { class: 'tile-ic' }, merchImg29(s.year >= 1968 ? 'tee' : 'button', a.logoSeed, a.name, a.genre, s.year, 32)), h('div', { class: 'tile-body' }, // r29: produto com o logo
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
