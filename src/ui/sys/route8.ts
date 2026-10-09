// Interface do roteiro de turnê com promotor (rodada 8): lista ordenada de paradas com distância,
// dias, custo de viagem, público e novidade; sugestões de rota compacta ou de expansão; mesa com o
// promotor (formato, cachê, bilheteria, apoio local, rider, intensidade, ingresso) e balanços das
// turnês encerradas com várias métricas.

import { l, marketById } from '../../data/world';
import { t } from '../../i18n/strings';
import { FORMAT_NAME, INTENSITY, bookRoutedTour, candidateCities, negotiateTour, orderCompact, route, routeLegs, suggestRoute, type DealTerms, type Intensity, type TourFormat } from '../../sim/sys/route8';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, N, actLink, cityName, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerSection } from '../registry';
import { chips, ic, stat } from '../vis';

const draft: { actId?: string; cities: string[]; start: number; terms: DealTerms } = {
  cities: [], start: 21,
  terms: { format: 'standard', fee: 1, split: 1, support: 1, rider: 1, intensity: 'normal', price: 1 },
};

const LVL3 = (a: string, b: string, c: string) => [l(a.split('|')[0], a.split('|')[1]), l(b.split('|')[0], b.split('|')[1]), l(c.split('|')[0], c.split('|')[1])];
const FEE = LVL3('Sem cachê garantido|No guarantee', 'Cachê médio|Mid guarantee', 'Cachê alto|High guarantee');
const SPLIT = LVL3('Bilheteria 50%|Door 50%', 'Bilheteria 65%|Door 65%', 'Bilheteria 80%|Door 80%');
const SUPPORT = LVL3('Sem apoio local|No local support', 'Imprensa local|Local press', 'Imprensa e equipe de rua|Press and street team');
const RIDER = LVL3('Rider básico|Basic rider', 'Rider padrão|Standard rider', 'Rider exigente|Demanding rider');

function move(i: number, d: number): void {
  const j = i + d;
  if (j < 0 || j >= draft.cities.length) return;
  [draft.cities[i], draft.cities[j]] = [draft.cities[j], draft.cities[i]];
  rerender();
}

export function routePlannerSection(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const title = t(l('Roteiro de turnê com promotor', 'Promoter tour routing'));
  if (!ids.length) return section(title, h('p', { class: 'muted' }, t(l('Nenhum artista no elenco ainda.', 'No artists on the roster yet.'))));
  if (!draft.actId || !ids.includes(draft.actId)) { draft.actId = ids[0]; draft.cities = []; }
  const act = s.acts[draft.actId];
  const opts = candidateCities(s, act.id, 40).filter((o) => !draft.cities.includes(o.cityId));
  const rt = routeLegs(s, act.id, draft.cities);
  const deal = draft.cities.length ? negotiateTour(s, act.id, draft.cities, draft.terms) : null;
  const T = draft.terms;
  const setT = <K extends keyof DealTerms>(k: K, v: DealTerms[K]) => { draft.terms = { ...draft.terms, [k]: v }; rerender(); };
  return section(title,
    h('p', { class: 'muted small' }, t(l('Turnê de terceiros: o promotor banca casas e produção local e divide a bilheteria. Cidades perto umas das outras saem baratas; rotas longas abrem mercados novos, cansam mais e custam viagem. A planilha de mapa acima continua sendo a turnê feita por conta própria.', 'Third-party tour: the promoter pays for venues and local production and splits the door. Nearby cities are cheap; long routes open new markets but tire the band and cost travel. The map planner above is still the do-it-yourself tour.'))),
    h('div', { class: 'row wrap' },
      h('label', null, t(l('Carreira', 'Career')), ' ', select(act.id, ids.map((id) => ({ value: id, label: s.acts[id].name })), (v) => { draft.actId = v; draft.cities = []; rerender(); })),
      h('button', { class: 'btn small', onclick: () => { draft.cities = suggestRoute(s, act.id, 'compact', 6); rerender(); } }, ic('tour-bus'), ' ', t(l('Rota compacta', 'Compact route'))),
      h('button', { class: 'btn small', onclick: () => { draft.cities = suggestRoute(s, act.id, 'expand', 6); rerender(); } }, ic('globe'), ' ', t(l('Rota de expansão', 'Expansion route'))),
      draft.cities.length > 2 ? h('button', { class: 'btn small ghost', onclick: () => { draft.cities = orderCompact(s, s.location[act.id] ?? act.city, draft.cities); rerender(); } }, t(l('Ordenar pela menor distância', 'Sort by shortest distance'))) : null,
      draft.cities.length ? h('button', { class: 'btn small ghost', onclick: () => { draft.cities = []; rerender(); } }, t(l('Limpar', 'Clear'))) : null,
    ),
    h('label', { class: 'small' }, t(l('Adicionar cidade', 'Add city')), ' ', select('', [{ value: '', label: t(l('— escolha (por público estimado) —', '— pick (by estimated audience) —')) }, ...opts.map((o) => ({ value: o.cityId, label: `${cityName(o.cityId)} · ~${N(o.demand)} · ${N(o.km)} km${o.newMarket ? ` · ${t(l('mercado novo', 'new market'))}` : ''}` }))], (v) => { if (v && draft.cities.length < 16) { draft.cities.push(v); rerender(); } })),
    draft.cities.length ? h('table', { class: 'tbl compact route8' },
      h('thead', null, h('tr', null, ...['#', t(l('Cidade', 'City')), 'km', t(l('Dias', 'Days')), t(l('Viagem', 'Travel')), t(l('Público', 'Audience')), t(l('Promotor', 'Promoter')), '', ''].map((x) => h('th', null, x)))),
      h('tbody', null, rt.legs.map((x, i) => h('tr', null,
        h('td', null, i + 1),
        h('td', null, h('b', null, cityName(x.cityId)), h('small', { class: 'muted' }, ` ${t(marketById[x.market]?.name)}`)),
        h('td', null, N(x.km)), h('td', null, x.days ? x.days.toFixed(1) : '0'), h('td', null, $(x.cost)), h('td', null, `~${N(x.demand)}`),
        h('td', { title: t(l('Relação com o promotor local (50 = neutra)', 'Relationship with the local promoter (50 = neutral)')) }, bar(x.rel, 100, x.rel >= 60 ? 'good' : x.rel < 40 ? 'bad' : '')),
        h('td', null, x.newCity ? pill(t(l('cidade nova', 'new city')), 'info') : null, x.newMarket ? pill(t(l('mercado novo', 'new market')), 'good') : null, x.visa ? pill(t(l('visto', 'visa')), 'warn') : null, x.demand < 60 ? pill(t(l('público baixo', 'low audience')), 'bad') : null),
        h('td', { class: 'nowrap' }, h('button', { class: 'link', 'aria-label': '↑', onclick: () => move(i, -1) }, '↑'), ' ', h('button', { class: 'link', 'aria-label': '↓', onclick: () => move(i, 1) }, '↓'), ' ', h('button', { class: 'link', 'aria-label': '✕', onclick: () => { draft.cities.splice(i, 1); rerender(); } }, '✕')),
      ))),
    ) : h('p', { class: 'muted small' }, t(l('Monte a rota: sugestão automática ou cidade a cidade.', 'Build the route: auto-suggest or city by city.'))),
    draft.cities.length ? chips(
      stat('globe', `${N(rt.km)} km`, l('Distância', 'Distance')), stat('calendar', `${Math.round(rt.days)}d`, l('Estrada (sem folgas)', 'Road days (no days off)')),
      stat('money', $(rt.travel), l('Viagem e vistos', 'Travel and visas')), stat('fans', `~${N(rt.demand)}`, l('Público potencial', 'Potential audience')),
      stat('sparkle', rt.newCities, l('Cidades novas', 'New cities')), stat('flag', rt.newMarkets, l('Mercados novos', 'New markets'), rt.newMarkets ? 'good' : ''),
    ) : null,
    h('h4', null, t(l('Mesa com o promotor', 'Promoter negotiation'))),
    h('div', { class: 'form grid2' },
      h('label', null, t(l('Formato', 'Format')), select<TourFormat>(T.format, (Object.keys(FORMAT_NAME) as TourFormat[]).map((k) => ({ value: k, label: t(FORMAT_NAME[k]) })), (v) => setT('format', v))),
      h('label', null, t(l('Cachê', 'Fee')), select<number>(T.fee, FEE.map((x, i) => ({ value: i, label: t(x) })), (v) => setT('fee', v as DealTerms['fee']))),
      h('label', null, t(l('Bilheteria', 'Door split')), select<number>(T.split, SPLIT.map((x, i) => ({ value: i, label: t(x) })), (v) => setT('split', v as DealTerms['split']))),
      h('label', null, t(l('Apoio local', 'Local support')), select<number>(T.support, SUPPORT.map((x, i) => ({ value: i, label: t(x) })), (v) => setT('support', v as DealTerms['support']))),
      h('label', null, t(l('Condições de produção', 'Production conditions')), select<number>(T.rider, RIDER.map((x, i) => ({ value: i, label: t(x) })), (v) => setT('rider', v as DealTerms['rider']))),
      h('label', null, t(l('Intensidade', 'Intensity')), select<Intensity>(T.intensity, (Object.keys(INTENSITY) as Intensity[]).map((k) => ({ value: k, label: t(INTENSITY[k].name) })), (v) => setT('intensity', v))),
      h('label', null, t(l('Ingresso', 'Ticket price')), select<number>(T.price, [0.7, 0.85, 1, 1.25, 1.5].map((m) => ({ value: m, label: `×${m}${m < 1 ? ` (${t(l('mais fãs', 'more fans'))})` : m > 1 ? ` (${t(l('mais caixa, menos fãs', 'more cash, fewer fans'))})` : ''}` })), (v) => setT('price', v))),
      h('label', null, t(l('Começa em (dias)', 'Starts in (days)')), select<number>(draft.start, [10, 21, 30, 45, 60, 90].map((d) => ({ value: d, label: `${d}` })), (v) => { draft.start = v; rerender(); })),
    ),
    deal ? h('div', { class: 'route8-deal' },
      deal.error ? h('p', { class: 'bad small' }, t(deal.error)) : h('div', null,
        h('div', { class: 'kv-grid small' },
          h('div', null, t(l('Força do selo', 'Your leverage')), ' ', bar(Math.max(0, deal.leverage), 100), ` ${Math.round(deal.leverage)}`),
          h('div', null, t(l('Peso do pedido', 'Weight of the ask')), ' ', bar(Math.max(0, deal.ask), 100, deal.ask > deal.leverage ? 'warn' : ''), ` ${Math.round(deal.ask)}`),
          h('div', null, t(l('Humor do promotor', 'Promoter mood')), ' ', bar(deal.mood, 100, deal.mood < 40 ? 'bad' : deal.mood > 60 ? 'good' : ''), ` ${Math.round(deal.mood)}`),
          h('div', null, t(l('Bilheteria para o artista', 'Artist door share')), ` ${Math.round(deal.doorShare * 100)}%`),
        ),
        deal.countered.length ? h('p', { class: 'warn small' }, ic('handshake'), ' ', t(l('Contraproposta: ', 'Counter-offer: ')), deal.countered.map((x) => t(x)).join(' · ')) : h('p', { class: 'good small' }, ic('handshake'), ' ', t(l('O promotor aceita os termos.', 'The promoter accepts the terms.'))),
        deal.partnerActId ? h('p', { class: 'small' }, t(l('Abertura para: ', 'Opening for: ')), actLink(s, deal.partnerActId)) : null,
        h('p', { class: 'muted small' }, t(l('Humor baixo azeda a relação com os promotores locais (público e acordos futuros). Apoio local e rider exigente custam fatia da bilheteria; intensidade alta cansa e aumenta acidentes.', 'Low mood sours relations with local promoters (future audiences and deals). Local support and a demanding rider cost door share; high intensity tires the band and raises accidents.'))),
        h('button', { class: 'btn primary', onclick: () => {
          const res = bookRoutedTour(s, act.id, draft.cities, draft.terms, draft.start);
          if ('pt' in res) { toast(t(res), 'bad'); return; }
          toast(t(l('Turnê fechada com o promotor!', 'Tour booked with the promoter!')), 'good');
          draft.cities = [];
          rerender();
        } }, ic('tour-bus'), ' ', t(deal.countered.length ? l('Aceitar contraproposta e fechar', 'Accept counter-offer and book') : l('Fechar turnê', 'Book tour'))),
      ),
    ) : null,
    reportsBlock(s),
  );
}

function reportsBlock(s: GameState): HTMLElement | null {
  const reps = route(s).reports;
  if (!reps.length) return null;
  return h('div', null,
    h('h4', null, t(l('Balanço das turnês', 'Tour reports'))),
    reps.map((r) => h('div', { class: 'tour' },
      h('header', null, ic('tour-bus'), ' ', h('b', null, r.name), ' ', actLink(s, r.actId), ' ', pill(t(FORMAT_NAME[r.format]))),
      chips(
        stat('money', $(r.profit), l('Resultado da turnê', 'Tour result'), r.profit >= 0 ? 'good' : 'bad'),
        stat('bank', $(r.labelNet), l('Para o selo', 'For the label'), r.labelNet >= 0 ? 'good' : 'bad'),
        stat('fans', `${r.newFans >= 0 ? '+' : ''}${N(r.newFans)}`, l('Fãs novos', 'New fans')),
        stat('disc', N(r.catalogUnits), l('Catálogo vendido', 'Catalog sold')),
        stat('newspaper', r.press.toFixed(1), l('Imprensa', 'Press'), r.press >= 0 ? 'good' : 'bad'),
        stat('handshake', `${r.rel >= 0 ? '+' : ''}${r.rel}`, l('Relação local', 'Local relations'), r.rel >= 0 ? 'good' : 'bad'),
        stat('warning', `${r.accidents} · +${r.fatigue}`, l('Acidentes · fadiga', 'Accidents · fatigue'), r.accidents ? 'bad' : ''),
        stat('globe', `${r.newCities}/${r.newMarkets}`, l('Cidades/mercados novos', 'New cities/markets')),
      ),
      h('small', { class: 'muted' }, t(l('{n} shows, {c} cancelados, {p} pessoas.', '{n} shows, {c} cancelled, {p} people.'), { n: r.shows, c: r.cancelled, p: N(r.attendance) })),
    )),
  );
}

registerSection('shows', { id: 'route8', order: 10, render: (s) => routePlannerSection(s) });

