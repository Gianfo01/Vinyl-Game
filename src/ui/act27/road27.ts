// r27 (P2B) — TURNÊ NO MAPA (interface). Duas janelas:
//   • Planejar: o mapa-múndi (ui/map.ts) com a rota cidade por cidade; ao lado, uma ficha por parada com trecho
//     (km, dias, meio, custo, visto), casa e ingresso, público previsto, economia da praça (cities27), cenas vivas
//     (scenes27), clima e a chance de evento de estrada. Marcar = tours.planTour pelo motor sys/road27.
//   • Diário de estrada: os eventos das próximas datas (van, fronteira, promotor, festa, imprensa, doença, temporal)
//     em cartas "mais segura × mais lucrativa"; o que você não decidir, a equipe decide no dia.
// Motor: src/sim/sys/road27.ts (puro). Teclado: Tab/Enter; botões ▲▼✕ reordenam a rota.

import { VENUE_TIERS } from '../../data/rules';
import { CITIES, cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  autoPick27, basePlan27, bookRoute27, ev27, isRoad27, overPolicy27, pendingRoad27, resolveRoad27, road27, roadKindName27, roadSummary27, routeView27,
  type RoadEv27, type RoadKind27, type StopView27,
} from '../../sim/sys/road27';
import { cityDemand, type TourPlan } from '../../sim/tours';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, N, cityName, modal, rerender, toast } from '../common';
import { h, select } from '../dom';
import { WorldMap, type MapCity } from '../map';
import { kpiRow27, statusChip27 } from '../ps/ui27';
import { store } from '../store';
import { cutscene27, reduced27 } from './mode27';
import { paintRoad27, type Sky27, put27 } from './px27b';
import { drawScene27 } from './scene27';
import './act27.css';
import './p2b27.css';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dateTxt = (d: { year: number; month: number; dom: number }) => `${d.dom} ${MONTHS[d.month]} ${d.year}`;
const SKY: Record<RoadKind27, Sky27> = { van: 'day', border: 'day', promoter: 'dusk', party: 'night', press: 'day', ill: 'dusk', weather: 'storm' };

function roadCanvas(s: GameState, o: { sky?: Sky27; broken?: boolean; border?: boolean }): HTMLCanvasElement {
  const cv = h('canvas', { class: 'a27-scene', role: 'img', 'aria-label': t(l('A van na estrada', 'The van on the road')) }) as HTMLCanvasElement;
  let f = 0;
  const paint = () => drawScene27(cv, paintRoad27(s.year, { ...o, frame: f }), s.year, []);
  paint();
  if (!reduced27()) { const tick = () => { if (!cv.isConnected && f > 2) return; f += 1; if (f % 4 === 0) paint(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  return cv;
}

// ================================================================ 1. planejar no mapa

export function openRoute27(actId0?: string, cities0: string[] = []): void {
  const s = store.game;
  if (!s) return;
  const ids = playerActs(s).filter((id) => { const a = s.acts[id]; return a && a.status !== 'retired' && a.status !== 'split'; });
  if (!ids.length) { toast(t(l('Nenhum artista para levar à estrada.', 'No act to take on the road.')), 'bad'); return; }
  let actId = actId0 && ids.includes(actId0) ? actId0 : ids[0];
  let cities: string[] = cities0.filter((c) => !!cityById[c]);
  const opt: Partial<TourPlan> = { startInDays: 21, priceMult: 1 };
  let ins: 0 | 1 = 0;
  let move: 'van' | 'bus' | 'fly' = 'van';
  let demandCache = new Map<string, number>();
  const demandOf = () => { if (demandCache.size) return demandCache; const a = s.acts[actId]; for (const c of CITIES) demandCache.set(c.id, a ? cityDemand(s, a, c.id) : 0); return demandCache; };
  const plan = (): TourPlan => basePlan27(s, actId, cities, { ...opt, kit: { move, bed: 'std', diem: 1, gear: 'own', reh: 0, ins, sec: 0, prom: 'local' } });

  const root = h('div', { class: 'a27 p2b-route' });
  const side = h('div', { class: 'p2b-side' });
  const mapCities = (): MapCity[] => {
    const dm = demandOf();
    const max = Math.max(1, ...dm.values());
    return CITIES.map((c) => {
      const v = dm.get(c.id) ?? 0, i = cities.indexOf(c.id);
      return { id: c.id, color: v >= max * 0.35 ? 'var(--good)' : v >= 30 ? 'var(--map-city)' : undefined, size: 0.9 + Math.min(0.5, v / max), badge: i >= 0 ? String(i + 1) : undefined, locked: v < 5 && i < 0 };
    });
  };
  const home = () => s.location[actId] ?? s.acts[actId]?.city ?? s.config.homeCity;
  const map = new WorldMap({
    getYear: () => s.year, getMonth: () => s.month, cities: mapCities, selected: [], route: [], crewSize: 6, mode: 'tour',
    onCityClick: (id) => { if (id === home() && !cities.length) return; cities = cities.includes(id) ? cities.filter((x) => x !== id) : [...cities, id]; refresh(); },
    cityTipExtra: (id) => { const v = demandOf().get(id) ?? 0; return h('small', null, t(l('Público potencial: ~{n}', 'Potential crowd: ~{n}'), { n: N(v) })); },
  });

  const stopCard = (x: StopView27, i: number): HTMLElement => {
    const tierN = VENUE_TIERS[x.tier]?.name;
    const fill = Math.round((x.expSold / Math.max(1, x.capacity)) * 100);
    return h('li', { class: 'p2b-stop' },
      h('div', { class: 'p2b-stop-h' },
        h('b', null, `${i + 1}. `, cityName(x.cityId)), ' ', h('small', { class: 'muted' }, t(x.econ.country), ' · ', dateTxt(x.date)),
        h('span', { class: 'p2b-ord' },
          h('button', { class: 'btn tiny ghost', disabled: i === 0, 'aria-label': t(l('Antes', 'Earlier')), onclick: () => { [cities[i - 1], cities[i]] = [cities[i], cities[i - 1]]; refresh(); } }, '▲'),
          h('button', { class: 'btn tiny ghost', disabled: i === cities.length - 1, 'aria-label': t(l('Depois', 'Later')), onclick: () => { [cities[i + 1], cities[i]] = [cities[i], cities[i + 1]]; refresh(); } }, '▼'),
          h('button', { class: 'btn tiny ghost', 'aria-label': t(l('Tirar {c}', 'Remove {c}'), { c: cityName(x.cityId) }), onclick: () => { cities = cities.filter((c) => c !== x.cityId); refresh(); } }, '✕'))),
      h('div', { class: 'p2b-grid' },
        h('span', null, '🚐 ', x.km ? `${N(x.km)} km · ${x.travelDays.toFixed(1)}d · ${$(x.legCost)}` : t(l('sem viagem', 'no travel'))),
        h('span', null, '🎟 ', t(tierN ?? l('Casa', 'Venue')), ` · ${N(x.capacity)} · ${$(x.price)}`),
        h('span', { class: fill >= 80 ? 'good' : fill < 35 ? 'bad' : '' }, '👥 ', t(l('~{n} ({p}%) · {g}', '~{n} ({p}%) · {g}'), { n: N(x.expSold), p: fill, g: $(x.gross) })),
        h('span', null, '💰 ', t(l('poder de compra {b} · ingresso ×{p} · mídia {m}', 'buying power {b} · ticket ×{p} · media {m}'), { b: x.econ.buy, p: x.econ.price, m: x.econ.media }))),
      h('div', { class: 'p2b-chips' },
        x.scene ? statusChip27(`${t(x.scene.name)} · ${t(x.scene.phase)}`, 'accent', t(l('Cena viva aqui: mais público para o seu som', 'A live scene here: bigger crowds for your sound'))) : null,
        x.localScene > 0 ? statusChip27(t(l('cena local {v}', 'local scene {v}'), { v: x.localScene }), 'info') : null,
        x.visa ? statusChip27(t(l('visto · {p}% recusa', 'visa · {p}% refusal'), { p: Math.round(x.visaDeny * 100) }), x.visaDeny > 0.3 ? 'bad' : 'warn') : null,
        x.weather.risk > 0.01 ? statusChip27(`${t(x.weather.label)} · ${Math.round(x.weather.risk * 100)}%`, 'warn') : statusChip27(t(x.weather.label), 'neutral'),
        ...x.econ.laws.slice(0, 2).map((w) => statusChip27(t(w), 'warn')),
        statusChip27(t(l('estrada: {p}% · {k}', 'road: {p}% · {k}'), { p: Math.round(x.roadOdds * 100), k: x.likely.map((k) => t(roadKindName27(k))).join(', ') }), 'neutral', t(l('Chance de um evento de estrada nesta data e os mais prováveis', 'Chance of a road event on this date and the most likely ones')))),
    );
  };

  const refresh = () => {
    map.update({ cities: mapCities, selected: [...cities], route: cities.length ? [home(), ...cities] : [] });
    const rv = cities.length ? routeView27(s, plan()) : null;
    const act = s.acts[actId];
    const head = h('div', { class: 'p2b-tools' },
      h('label', null, t(l('Artista', 'Act')), ' ', select(actId, ids.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { actId = v; cities = []; demandCache = new Map(); refresh(); })),
      h('label', null, t(l('Saída', 'Departure')), ' ', select(String(opt.startInDays), ['14', '21', '35', '56'].map((d) => ({ value: d, label: t(l('em {d} dias', 'in {d} days'), { d }) })), (v) => { opt.startInDays = Number(v); refresh(); })),
      h('label', null, t(l('Ingresso', 'Ticket')), ' ', select(String(opt.priceMult), ['0.8', '1', '1.25', '1.5'].map((d) => ({ value: d, label: `×${d}` })), (v) => { opt.priceMult = Number(v); refresh(); })),
      h('label', null, t(l('Transporte', 'Transport')), ' ', select(move, [{ value: 'van', label: t(l('van', 'van')) }, { value: 'bus', label: t(l('ônibus', 'bus')) }, { value: 'fly', label: t(l('avião', 'plane')) }], (v) => { move = v as typeof move; refresh(); })),
      h('label', null, h('input', { type: 'checkbox', checked: !!ins, onchange: () => { ins = ins ? 0 : 1; refresh(); } }), ' ', t(l('Seguro de turnê', 'Tour insurance'))));
    const kp = rv ? kpiRow27([
      { label: l('Custo (logística)', 'Cost (logistics)'), value: $(rv.est.logistics) },
      { label: l('Receita prevista', 'Expected revenue'), value: $(rv.est.expectedRevenue + rv.est.expectedMerch) },
      { label: l('Saldo previsto', 'Expected net'), value: $(rv.net), tone: rv.net < 0 ? 'bad' : 'good' },
      { label: l('Dias na estrada', 'Days on the road'), value: String(rv.days) },
      { label: l('Riscos', 'Risks'), value: String(rv.est.warnings.length + rv.est.visas), tone: rv.est.warnings.length ? 'warn' : 'good' },
    ]) : null;
    put27(side, 
      head,
      !rv ? h('p', { class: 'muted' }, t(l('Clique nas cidades do mapa para montar a rota a partir de {c}. Verde = público forte para {a}.', 'Click cities on the map to build the route from {c}. Green = strong crowd for {a}.'), { c: cityName(home()), a: act?.name ?? '' })) : null,
      kp,
      rv ? h('ol', { class: 'p2b-stops', 'aria-label': t(l('Paradas da turnê', 'Tour stops')) }, rv.stops.map(stopCard)) : null,
      rv?.est.warnings.length ? h('ul', { class: 'small p2b-warn' }, rv.est.warnings.slice(0, 5).map((w) => h('li', null, t(w)))) : null,
      h('div', { class: 'row a27-actions' },
        cities.length ? h('button', { class: 'btn ghost', onclick: () => { cities = []; refresh(); } }, t(l('Limpar rota', 'Clear route'))) : null,
        h('button', { class: 'btn primary', disabled: !rv, onclick: () => book() }, t(l('Marcar a turnê', 'Book the tour')))),
    );
  };

  const book = () => {
    const r = bookRoute27(s, plan());
    if (!('id' in r)) { toast(t(r), 'bad'); return; }
    cutscene27('tour_booked', { actId, tourId: r.id, cities: cities.length });
    toast(t(l('{t} marcada: {n} cidades. Os eventos de estrada aparecem no Diário.', '{t} booked: {n} cities. Road events show up in the Journal.'), { t: r.name, n: cities.length }), 'good');
    close();
    openRoad27(r.id);
  };

  root.append(roadCanvas(s, { sky: 'day' }), h('div', { class: 'p2b-cols' }, h('div', { class: 'p2b-map' }, map.element), side));
  refresh();
  const close = modal(t(l('Turnê no mapa — planejar', 'Tour on the map — plan')), root, { wide: true, onClose: () => { map.destroy(); rerender(); } });
}

// ================================================================ 2. diário de estrada

export function openRoad27(tourId: string): void {
  const s = store.game;
  if (!s) return;
  const tr = s.tours.find((x) => x.id === tourId);
  if (!tr || !isRoad27(s, tourId)) { toast(t(l('Turnê não encontrada.', 'Tour not found.')), 'bad'); return; }
  const root = h('div', { class: 'a27 p2b-road' });
  const view = (flash?: { t: L; tone: string }) => {
    const pend = pendingRoad27(s, 35).filter((x) => x.t.id === tourId);
    const R = road27(s).tours[tourId];
    const sum = roadSummary27(s, tourId);
    const next = pend[0];
    const played = tr.stops.filter((x) => x.status === 'played');
    put27(root, 
      roadCanvas(s, next ? { sky: SKY[next.ev.k], broken: next.ev.k === 'van', border: next.ev.k === 'border' } : { sky: 'dusk' }),
      h('div', { class: 'a27-head' }, h('b', null, tr.name), ' · ', s.acts[tr.actId]?.name ?? '', ' · ',
        t(l('{p}/{n} datas tocadas', '{p}/{n} dates played'), { p: played.length, n: tr.stops.length }), ' · ',
        t(l('eventos: {e} (você {m}, equipe {a})', 'events: {e} (you {m}, staff {a})'), { e: sum.events, m: sum.mine, a: sum.auto })),
      flash ? h('p', { class: `a27-event ${flash.tone}`, role: 'status' }, t(flash.t)) : null,
      pend.length
        ? h('div', { class: 'p2b-evs' }, pend.slice(0, 4).map((x) => evCard(s, x.ev, x.st.cityId, x.st.day, (msg, tone) => view({ t: msg, tone }))))
        : h('p', { class: 'muted' }, t(l('Nada pela frente nas próximas semanas. Avance o tempo: os eventos aparecem até 5 semanas antes de cada data.', 'Nothing ahead in the coming weeks. Advance time: events show up to 5 weeks before each date.'))),
      h('h4', null, t(l('Na estrada até aqui', 'On the road so far'))),
      h('ul', { class: 'small a27-feed' },
        R.log.slice(0, 10).map((x) => h('li', { class: x.tone }, t(x.t))),
        played.slice(-6).reverse().map((st) => h('li', { class: st.sold >= st.capacity * 0.8 ? 'good' : st.sold < st.capacity * 0.3 ? 'bad' : '' }, t(l('{c}: {n}/{cap} ingressos.', '{c}: {n}/{cap} tickets.'), { c: cityName(st.cityId), n: N(st.sold), cap: N(st.capacity) }), R.ev[st.day] ? h('small', { class: 'muted' }, ' — ', t(roadKindName27(R.ev[st.day].k))) : null))),
      h('p', { class: 'small muted' }, t(l('Cada data é resolvida pelo show de sempre (bilheteria, merch, fãs, fama, cansaço); a sua escolha vira ajuste daquela noite.', 'Each date is settled by the usual show (box office, merch, fans, fame, fatigue); your choice becomes that night\'s adjustment.'))),
      h('div', { class: 'row a27-actions' }, h('button', { class: 'btn primary', onclick: () => close() }, t(l('Fechar', 'Close')))),
    );
    (root.querySelector('.p2b-opt:not([disabled])') as HTMLElement | null)?.focus();
  };
  view();
  const close = modal(t(l('Diário de estrada', 'Road journal')), root, { wide: true, onClose: () => rerender() });
}

function evCard(s: GameState, ev: RoadEv27, cityId: string, day: number, done: (t: L, tone: string) => void): HTMLElement {
  const auto = autoPick27(s, ev);
  const d = cityById[cityId] ? cityName(cityId) : cityId;
  const dd = day - (s.day + s.clock.dayInMonth);
  return h('section', { class: 'p2b-ev' },
    h('header', null, h('b', null, t(ev.title)), ' · ', d, ' ', h('small', { class: 'muted' }, t(l('em {n} dias', 'in {n} days'), { n: Math.max(0, dd) }))),
    h('p', null, t(ev.text)),
    h('div', { class: 'p2b-opts' }, ev.opts.map((o, i) => {
      const pol = overPolicy27(s, o.cost);
      const broke = o.cost > s.player.cash;
      const v = ev27(o);
      return h('button', { class: `p2b-opt ${o.safe ? 'safe' : o.p !== undefined ? 'bold' : ''}`, disabled: broke, onclick: () => {
        const r = resolve27(s, ev.tourId, day, i);
        if (typeof r === 'string') { toast(r, 'bad'); return; }
        if (!r.ok) cutscene27('road_trouble', { tourId: ev.tourId, kind: ev.k });
        done(r.t, r.ok ? (r.skip ? 'warn' : 'good') : 'bad');
      } },
      h('b', null, t(o.label)),
      h('small', null, t(o.hint)),
      h('span', { class: 'p2b-tags' },
        o.cost ? statusChip27($(o.cost), broke ? 'bad' : 'neutral') : statusChip27(t(l('grátis', 'free')), 'neutral'),
        o.p !== undefined ? statusChip27(t(l('chance {p}%', 'chance {p}%'), { p: Math.round(o.p * 100) }), o.p >= 0.7 ? 'good' : o.p < 0.5 ? 'bad' : 'warn') : statusChip27(t(l('certo', 'certain')), 'good'),
        o.safe ? statusChip27(t(l('mais segura', 'safer')), 'info') : v >= 1.03 ? statusChip27(t(l('mais lucrativa', 'more profitable')), 'accent') : null,
        o.cancel ? statusChip27(t(l('data cai', 'date lost')), 'bad') : null,
        pol ? statusChip27(t(l('fora da política', 'outside policy')), 'warn', t(pol)) : null,
        i === auto ? statusChip27(t(l('a equipe escolheria', 'staff would pick')), 'neutral') : null));
    })));
}
function resolve27(s: GameState, tourId: string, day: number, i: number): { ok: boolean; t: L; skip: boolean } | string {
  const r = resolveRoad27(s, tourId, day, i);
  if (!('k' in r)) return t(r);
  return { ok: r.ok, t: r.t, skip: !!r.skip };
}

/** Linha de entrada no painel de turnês: "Jogar" planejamento no mapa e diário das turnês de estrada. */
export const roadTours27 = (s: GameState): { id: string; name: string }[] => s.tours.filter((x) => (x.status === 'planned' || x.status === 'running') && isRoad27(s, x.id)).map((x) => ({ id: x.id, name: x.name }));
