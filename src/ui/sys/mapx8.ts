// Ficha jogável das cidades e países no mapa (rodada 8): cena local (atos da cidade, clubes, líder das
// paradas), e ações — viajar, conhecer a cena, olheiro avulso, divulgação, rota da turnê, distribuição
// local, casa na cidade e noites nos clubes. Também as camadas novas (fãs por país, gênero, rivais,
// paradas e "você").

import { MARKETS, cityById, l, type L, type MarketId } from '../../data/world';
import { countryOfCity, marketOfCountry } from '../../data/geo';
import { t } from '../../i18n/strings';
import { openTerritory, territoryCost } from '../../sim/economy';
import { board, countryLeader } from '../../sim/sys/charts7';
import { GOODS, buyGood, canReachCity, goodAvailable, goodPrice, residences, venueNight } from '../../sim/sys/goods8';
import {
  convertCost, convertTrial, fansByCountry, isHere, localDistribution, mapx, meetScene, ownerCity, promoBlocker, promoCost, promoTrip, scoutCity, scoutCityCost,
  travelBlocker, travelQuote, travelTo, trialCost,
} from '../../sim/sys/mapx8';
import type { GameState } from '../../sim/types';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, N, actLink, genreName, ownerName, pill, releaseLink, rerender, toast } from '../common';
import { h, select } from '../dom';
import type { MapOverlay } from '../map';
import { addTourStop } from '../panels/misc';
import { store } from '../store';
import { ic } from '../vis';

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object);
function run(res: unknown, ok?: L): void {
  if (res === null || res === undefined) { if (ok) toast(t(ok), 'good'); }
  else if (isL(res)) toast(t(res), 'bad');
  else if (typeof res === 'object' && 'text' in (res as object)) toast(t((res as { text: L }).text), 'good');
  rerender();
}

const btn = (label: string, onclick: () => void, opts: { primary?: boolean; disabled?: boolean; title?: string } = {}) =>
  h('button', { class: `btn small ${opts.primary ? 'primary' : ''}`, disabled: opts.disabled, title: opts.title, onclick }, label);

let promoAct = '';

/** Cena local: atos da cidade, líder das paradas do país e da região. */
export function cityScene(s: GameState, cityId: string): HTMLElement {
  const city = cityById[cityId];
  const acts = Object.values(s.acts).filter((a) => a.city === cityId && (a.status === 'active' || a.status === 'emerging') && !a.deceased).sort((a, b) => b.fame - a.fame).slice(0, 8);
  const a3 = countryOfCity(cityId);
  const lead = a3 ? countryLeader(s, a3) : undefined;
  const reg = s.regionCharts[city.market]?.[0];
  return h('div', null,
    lead || reg ? h('div', { class: 'small' }, h('small', { class: 'muted' }, t(l('No topo das paradas', 'Top of the charts'))),
      h('ul', { class: 'small' },
        lead && s.releases[lead.relId] ? h('li', null, ic('chart-up'), ` ${t(l('País', 'Country'))}: `, releaseLink(s, lead.relId), ' — ', actLink(s, s.releases[lead.relId].actId)) : null,
        reg && s.releases[reg] ? h('li', null, ic('chart-up'), ` ${t(l('Região', 'Region'))}: `, releaseLink(s, reg), ' — ', actLink(s, s.releases[reg].actId)) : null)) : null,
    acts.length ? h('div', null, h('small', { class: 'muted' }, t(l('Artistas da cidade', 'Local acts'))),
      h('table', { class: 'tbl compact' }, h('tbody', null, acts.map((a) => h('tr', null,
        h('td', null, actLink(s, a.id)),
        h('td', { class: 'small muted' }, genreName(a.genre)),
        h('td', { class: 'small' }, `${t(l('fama', 'fame'))} ${Math.round(a.fame)}`),
        h('td', { class: 'small' }, a.owner ? ownerName(s, a.owner) : s.knowledge[a.id] ? pill(t(l('no radar', 'on radar')), 'good') : pill(t(l('livre', 'unsigned')), 'warn'))))))) : h('p', { class: 'muted small' }, t(l('Nenhum artista ativo baseado aqui.', 'No active acts based here.'))),
  );
}

/** Ações na cidade. */
export function cityActions(s: GameState, cityId: string): HTMLElement {
  const city = cityById[cityId];
  const m = mapx(s);
  const r = () => rngOf(s);
  const here = isHere(s, cityId);
  const q = travelQuote(s, cityId);
  const tErr = travelBlocker(s, cityId);
  const mk = city.market as MarketId;
  const open = s.player.territories.includes(mk);
  const trial = m.trials[mk];
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && (a.status === 'active' || a.status === 'emerging') && !a.deceased);
  if (!acts.some((a) => a.id === promoAct)) promoAct = acts[0]?.id ?? '';
  const pErr = promoAct ? promoBlocker(s, cityId, promoAct) : l('Sem artistas no selo.', 'No acts on the label.');
  const job = m.scoutJobs.find((j) => j.city === cityId);
  const promos = m.promos.filter((p) => p.city === cityId && p.until > s.week);
  const home = GOODS.find((d) => d.city === cityId && goodAvailable(s, d));
  const ownsHome = residences(s).includes(cityId);
  const reach = canReachCity(s, cityId);
  const clubs = reach ? s.clubs.filter((c) => c.city === cityId && !c.closed).sort((a, b) => b.prestige - a.prestige).slice(0, 3) : [];
  const where = ownerCity(s);
  return h('div', { class: 'map-actions' },
    h('small', { class: 'muted' }, t(l('Ações', 'Actions'))),
    // viagem
    h('div', { class: 'row wrap' },
      here ? pill(t(l('você está aqui até a semana {w}', 'you are here until week {w}'), { w: m.here!.until }), 'good') : null,
      here ? btn(`${t(l('Conhecer a cena', 'Meet the scene'))} ⏱`, () => run(meetScene(s, r(), cityId)), { primary: true }) : null,
      !here && cityId !== s.config.homeCity ? btn(`${t(l('Viajar até lá', 'Travel there'))} (${$(q.cost)}${q.energy ? ` · ${'⏱'.repeat(q.energy)}` : ''})`, () => run(travelTo(s, r(), cityId)), { disabled: !!tErr, title: tErr ? t(tErr) : t(l('{km} km, {d} dias. Do seu bolso. Três semanas na cidade.', '{km} km, {d} days. From your pocket. Three weeks in the city.'), { km: N(q.km), d: q.days }) }) : null,
      cityId === s.config.homeCity && where !== s.config.homeCity ? btn(`${t(l('Voltar para casa', 'Go back home'))} (${$(q.cost)})`, () => run(travelTo(s, r(), cityId))) : null,
      q.plane ? pill(t(l('voo particular', 'private flight')), 'good') : null,
      q.visa && !here ? pill(t(l('visto: {p}% de recusa', 'visa: {p}% refusal'), { p: Math.round(q.deny * 100) }), q.deny > 0.3 ? 'bad' : 'warn') : null,
    ),
    // olheiro, divulgação, turnê
    h('div', { class: 'row wrap' },
      job ? pill(t(l('olheiro trabalhando (volta na semana {w})', 'scout working (back in week {w})'), { w: job.due }), 'good')
        : btn(`${t(l('Olheiro avulso', 'Freelance scout'))} (${$(scoutCityCost(s, cityId))})`, () => run(scoutCity(s, cityId), l('Olheiro a caminho.', 'Scout on the way.')), { title: t(l('Volta em 3 semanas com 2 nomes da cena local (3 e mais detalhados se você estiver lá ou tiver casa).', 'Back in 3 weeks with 2 names from the local scene (3, more detailed, if you are there or own a home).')) }),
      acts.length ? h('span', { class: 'row' },
        select(promoAct, acts.map((a) => ({ value: a.id, label: a.name })), (v) => { promoAct = v; rerender(); }),
        btn(`${t(l('Turnê de divulgação', 'Promo trip'))} (${$(promoCost(s, cityId))})`, () => run(promoTrip(s, cityId, promoAct)), { disabled: !!pErr, title: pErr ? t(pErr) : t(l('Rádios, lojas e imprensa: fãs agora e +30% de público na cidade por 3 meses (+6% na região). Rende mais com você presente.', 'Radio, shops and press: fans now and +30% audience in the city for 3 months (+6% in the region). Better with you there.')) })) : null,
      acts.length ? btn(t(l('Pôr na rota da turnê', 'Add to tour route')), () => { addTourStop(cityId); store.area = 'shows'; toast(t(l('Cidade adicionada ao planejador de turnê.', 'City added to the tour planner.')), 'good'); rerender(); }) : null,
    ),
    promos.length ? h('div', { class: 'chips' }, promos.map((p) => pill(t(l('divulgando {a} até a semana {w}', 'promoting {a} until week {w}'), { a: s.acts[p.actId]?.name ?? '?', w: p.until }), 'good'))) : null,
    // distribuição
    h('div', { class: 'row wrap' },
      !open ? btn(`${t(l('Distribuidora local: teste de 1 ano', 'Local distributor: 1-year trial'))} (${$(trialCost(s, mk))})`, () => run(localDistribution(s, cityId), l('Mercado aberto em teste.', 'Market opened on trial.')), { title: t(l('Abre o mercado já por 30% do preço; depois efetive ou ele fecha.', 'Opens the market now for 30% of the price; confirm later or it closes.')) }) : null,
      !open ? btn(`${t(l('Abrir mercado de vez', 'Open the market for good'))} (${$(territoryCost(s, mk))})`, () => run(openTerritory(s, mk), l('Mercado aberto.', 'Market opened.'))) : null,
      open && trial !== undefined ? h('span', { class: 'row' }, pill(t(l('teste até a semana {w}', 'trial until week {w}'), { w: trial }), 'warn'), btn(`${t(l('Efetivar distribuição', 'Confirm distribution'))} (${$(convertCost(s, mk))})`, () => run(convertTrial(s, mk), l('Distribuição efetivada.', 'Distribution confirmed.')), { primary: true })) : null,
      open && trial === undefined ? pill(t(l('você distribui aqui', 'you distribute here')), 'good') : null,
    ),
    // casa e noites
    home || ownsHome ? h('div', { class: 'row wrap' },
      ownsHome ? pill(t(l('você tem casa aqui', 'you own a home here')), 'good')
        : home ? btn(`${t(l('Comprar', 'Buy'))}: ${t(home.name)} (${$(goodPrice(s, home))})`, () => run(buyGood(s, home.id), l('Casa comprada!', 'Home bought!')), { title: t(l('Do seu bolso. +6% de público aqui, sinais da cena e acesso aos clubes sem viajar.', 'From your pocket. +6% audience here, scene signals and club access without travelling.')) }) : null) : null,
    clubs.length ? h('div', { class: 'row wrap' }, clubs.map((c) => btn(`${t(l('Noite no {c}', 'Night at {c}'), { c: c.name })} (${$(money(s, 150 + c.prestige * 4))}) ⏱`, () => run(venueNight(s, r(), c.id))))) : null,
    !reach ? h('small', { class: 'muted' }, t(l('Viaje até aqui (ou tenha casa/filial) para frequentar os clubes e conhecer a cena.', 'Travel here (or own a home/branch) to go to the clubs and meet the scene.'))) : null,
  );
}

/** Extras da ficha de país: fãs, líder das paradas e distribuição. */
export function countryExtra(s: GameState, a3: string): HTMLElement {
  const mk = marketOfCountry(a3);
  const fans = fansByCountry(s).get(a3) ?? 0;
  const lead = countryLeader(s, a3);
  const mine = board(s, a3, 'songs').filter((row) => s.releases[row.relId]?.owner === 'player').slice(0, 3);
  const open = s.player.territories.includes(mk);
  return h('div', null,
    h('p', { class: 'small' }, ic('fans'), ` ${N(fans)} ${t(l('fãs potenciais dos seus artistas', 'potential fans of your acts'))}`),
    lead && s.releases[lead.relId] ? h('p', { class: 'small' }, ic('chart-up'), ` ${t(l('Nº 1', 'No. 1'))}: `, releaseLink(s, lead.relId), ' — ', actLink(s, s.releases[lead.relId].actId)) : null,
    mine.length ? h('ul', { class: 'small' }, mine.map((row) => h('li', null, `#${row.pos} `, releaseLink(s, row.relId)))) : null,
    !open ? h('button', { class: 'btn small', onclick: () => run(openTerritory(s, mk), l('Mercado aberto.', 'Market opened.')) }, `${t(l('Abrir mercado', 'Open market'))}: ${t(MARKETS.find((x) => x.id === mk)!.name)} (${$(territoryCost(s, mk))})`) : null,
  );
}

/** Ícones pessoais no mapa: casas, onde você está, divulgação e olheiros. */
export function personalOverlays(s: GameState, icon: (city: string, g: 'home' | 'you' | 'promo' | 'scout') => void, push: (o: MapOverlay) => void): void {
  for (const c of new Set(residences(s))) icon(c, 'home');
  const m = mapx(s);
  if (m.here && m.here.until >= s.week) {
    icon(m.here.city, 'you');
    push({ kind: 'arc', from: s.config.homeCity, to: m.here.city, color: 'var(--accent)', dashed: true, width: 1.4 });
  }
  for (const c of new Set(m.promos.filter((p) => p.until > s.week).map((p) => p.city))) icon(c, 'promo');
  for (const j of m.scoutJobs) icon(j.city, 'scout');
}
