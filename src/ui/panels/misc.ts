// Paradas, Mídia, Catálogo, Shows, Empresa, Diário e Sede.

import { FESTIVALS, MEDIA, VENUES } from '../../data/catalog';
import { BRANCH_LEVELS, CARDS, ENDINGS, EQUIPMENT, HQ_LEVELS, LEGACY_DIMS, STAFF_ROLES, TECHS, VENUE_TIERS, cardById } from '../../data/rules';
import { MARKETS, familyOf, l } from '../../data/world';
import { S, locale, t } from '../../i18n/strings';
import { availableEquipment, buyEquipment, fireStaff, loanOffer, managementLoad, monthlyCosts, openTerritory, takeLoan, territoryCost, upgradeCost, upgradeHq } from '../../sim/economy';
import { cardGoalDone, hqCapacityText, legacyTotal, milestones } from '../../sim/legacy';
import { festivalSlot, gigEstimate, maxVenueTier } from '../../sim/live';
import { availableChannels } from '../../sim/market';
import { pendingFeatures, unlockCost, unlockFeature } from '../../sim/era';
import { availableFormats, scheduleRelease, suggestedPress } from '../../sim/production';
import type { GameState } from '../../sim/types';
import { hasTech, money, playerActs, rngOf } from '../../sim/util';
import { careerSlotsUsed } from '../../sim/contracts';
import { $, N, memoText, actLink, branchName, cityName, cover, genreName, kv, labelLink, monthName, pill, releaseLink, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { openRelease } from '../ficha';
import { HqView, hqHooks } from '../hq';
import { copyText, store, tryDownload } from '../store';
import { inspect } from '../common';
import { CITIES, cityById, genreById } from '../../data/world';
import { nominal } from '../../core/money';
import { countryName, unitOfCity } from '../../data/geo';
import { planRoute } from '../../sim/travel';
import { WorldMap, glyphCanvas, transportName, type MapCity } from '../map';
import { activeToursSection, merchSection, tourPlannerSection } from './tours';
import { assignBranch, closeBranch, hqBlocker, hqCaps, upgradeBranch } from '../../sim/branches';
import { ic, tile } from '../vis';
import { crewProfileCell, crewRespecButton, crewSummary } from '../sys/crew8';
import { banner14, venueBanner14 } from '../sys/visuals14';

// ---------- Paradas ----------
export function chartsPanel(s: GameState): HTMLElement {
  const table = (which: 'singles' | 'albums') =>
    h('table', { class: 'tbl chart' },
      h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, t(S.last)), h('th', null, t(S.title)), h('th', null, t(l('Ato', 'Act'))), h('th', null, t(l('Selo', 'Label'))), h('th', null, t(S.weeks)), h('th', null, t(S.units)))),
      h('tbody', null, s.charts[which].slice(0, 40).map((e) => {
        const r = s.releases[e.releaseId];
        if (!r) return null;
        const mine = r.owner === 'player' || !!s.acts[r.actId]?.playerBand;
        const move = !e.last ? 'NEW' : e.last > e.pos ? '▲' : e.last < e.pos ? '▼' : '=';
        return h('tr', { class: mine ? 'mine' : '' },
          h('td', null, h('b', null, e.pos)),
          h('td', { class: move === '▲' || move === 'NEW' ? 'good' : move === '▼' ? 'bad' : 'muted' }, `${move} ${e.last || ''}`),
          h('td', null, releaseLink(s, r.id), r.certified ? pill(r.certified[0].toUpperCase(), 'gold') : null),
          h('td', null, actLink(s, r.actId)),
          h('td', null, labelLink(s, r.owner === 'indie' ? null : r.owner)),
          h('td', null, e.weeks),
          h('td', null, N(e.units)),
        );
      })),
    );
  const hot = Object.entries(s.genrePop).filter(([g]) => genreById[g]?.born <= s.year).sort((a, b) => b[1] - a[1]).slice(0, 10);
  return h('div', { class: 'panel charts' },
    h('div', { class: 'col-main' }, section(t(S.singles), table('singles')), section(t(S.albums), table('albums'))),
    h('aside', { class: 'col-side' },
      section(t(S.genres), h('ul', null, hot.map(([g, v]) => h('li', null, genreName(g), ' ', bar(v, 2.2))))),
      section(t(S.number1s), h('ul', { class: 'small' }, s.charts.number1History.slice(-15).reverse().map((n) => h('li', null, `${n.title} — ${n.act}`)))),
    ),
  );
}

// ---------- Mídia ----------
export function mediaPanel(s: GameState): HTMLElement {
  const outlets = MEDIA.filter((m) => m.start <= s.year && (!m.end || m.end >= s.year) && (m.name !== 'ClipNet' || hasTech(s, 'clipnet')) && (m.name !== 'ShareWave' || hasTech(s, 'p2p')));
  const rep = s.player.reputation;
  const known = TECHS.filter((x) => s.techDates[x.id] !== undefined && s.techDates[x.id] <= s.year);
  return h('div', { class: 'panel media' },
    h('div', { class: 'col-main' },
      banner14(s, 'media'),
      pendingFeatures(s).length ? section(t(l('Novidade disponível', 'New: available now')),
        h('p', { class: 'muted small' }, t(l('A tecnologia chegou, mas seu selo precisa de equipe e equipamento antes de usar.', 'The technology has arrived, but your label needs crew and gear before using it.'))),
        ...pendingFeatures(s).map((f) => h('div', { class: 'row' }, h('b', null, t(f.label)), h('small', { class: 'muted' }, f.blurb ? t(f.blurb) : ''),
          h('button', { class: 'btn small', disabled: s.player.cash < unlockCost(s, f), onclick: () => { const e = unlockFeature(s, f.id); toast(e ? t(e) : t(l('Desbloqueado.', 'Unlocked.')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Desbloquear', 'Unlock'))} ${$(unlockCost(s, f))}`)))) : null,
      section(t(l('Canais de campanha nesta era', 'Campaign channels in this era')),
        h('table', { class: 'tbl' }, h('thead', null, h('tr', null, h('th', null, t(S.channel)), h('th', null, t(l('Custo de alcance', 'Reach cost'))), h('th', null, t(l('Vendas', 'Sales'))), h('th', null, t(S.fame)), h('th', null, t(l('Prestígio', 'Prestige'))))),
          h('tbody', null, availableChannels(s).map((c) => h('tr', null, h('td', null, t(c.name)), h('td', null, $(money(s, c.reachCost))), h('td', null, bar(c.sales, 1.5)), h('td', null, bar(c.fame, 1.5)), h('td', null, bar(c.prestige, 1)))))),
      ),
      section(t(l('Veículos ativos', 'Active outlets')),
        h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, h('th', null, t(l('Veículo', 'Outlet'))), h('th', null, t(S.type)), h('th', null, t(l('Prestígio', 'Prestige'))), h('th', null, t(l('Alcance', 'Reach'))))),
          h('tbody', null, outlets.map((m) => h('tr', null, h('td', null, m.name), h('td', null, t(m.type)), h('td', null, bar(m.prestige)), h('td', null, bar(m.reach)))))),
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.reputation),
        kv(t(l('Artística', 'Artistic')), bar(rep.artistic)),
        kv(t(l('Comercial', 'Commercial')), bar(rep.commercial)),
        kv(t(l('Junto aos artistas', 'With artists')), bar(rep.artists)),
        kv(t(l('Institucional', 'Institutional')), bar(rep.institutional)),
      ),
      section(t(l('Tecnologias desta história', 'Technologies in this history')), h('ul', { class: 'small' }, known.map((x) => h('li', null, `${s.techDates[x.id]} — ${t(x.name)}`))),
        s.divergence.clipnet === 'no' && s.year > 1985 ? h('p', { class: 'small' }, t(l('Nesta run a rede de clipes nunca surgiu.', 'In this run the music-video network never appeared.'))) : null),
    ),
  );
}

// ---------- Catálogo ----------
export function catalogPanel(s: GameState): HTMLElement {
  const mine = Object.values(s.releases).filter((r) => r.owner === 'player' || s.acts[r.actId]?.playerBand).sort((a, b) => b.week - a.week);
  const reissue = (id: string) => {
    const r = s.releases[id];
    const act = s.acts[r.actId];
    if (!act) return;
    const res = scheduleRelease(s, rngOf(s), {
      actId: r.actId, type: r.type, songs: r.songs, title: `${r.title} (Remaster)`, formats: availableFormats(s),
      press: Math.round(suggestedPress(s, act, r.type) * 0.5), marketing: [], territories: s.player.territories, weeksAhead: 3, reissueOf: r.id,
    });
    if ('pt' in res) toast(t(res), 'bad');
    else toast(t(l('Reedição programada.', 'Reissue scheduled.')), 'good');
    rerender();
  };
  return h('div', { class: 'panel catalog' },
    section(`${t(S.areaCatalog)} (${mine.length})`,
      h('p', { class: 'muted small' }, t(l('Masters próprios geram cauda de catálogo. Obras com 8+ anos podem ser reeditadas (remaster), sobretudo com nostalgia em alta.', 'Owned masters earn a catalog tail. Works 8+ years old can be reissued (remaster), especially when nostalgia runs high.'))),
      h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', null, t(S.title)), h('th', null, t(l('Ato', 'Act'))), h('th', null, t(S.type)), h('th', null, t(l('Ano', 'Year'))), h('th', null, t(S.peak)), h('th', null, t(S.totalUnits)), h('th', null, t(S.revenue)), h('th', null, ''))),
        h('tbody', null, mine.slice(0, 120).map((r) => h('tr', { onclick: () => openRelease(r.id), class: 'clickable' },
          h('td', null, cover(s, r, 32)),
          h('td', null, r.title, r.certified ? pill(r.certified, 'gold') : null),
          h('td', null, actLink(s, r.actId)),
          h('td', null, r.type.toUpperCase()),
          h('td', null, r.year),
          h('td', null, r.peak < 999 ? `#${r.peak}` : '—'),
          h('td', null, N(r.totalUnits)),
          h('td', null, $(r.revenue)),
          h('td', null, s.year - r.year >= 8 && !r.reissueOf && r.owner === 'player' ? h('button', { class: 'btn small', onclick: (e: Event) => { e.stopPropagation(); reissue(r.id); } }, t(S.reissue)) : null),
        ))),
      ),
    ),
  );
}

// ---------- Mapa de turnê (demonstração do planejador) ----------
let tourMap: WorldMap | null = null;
let tourStops: string[] = [];

/** Põe uma cidade na rota do planejador de turnê (usado pela ficha da cidade no mapa). */
export function addTourStop(cityId: string): void {
  if (!tourStops.includes(cityId)) tourStops.push(cityId);
}
let tourSummary: HTMLElement | null = null;

function tourCrew(s: GameState): number {
  const a = playerActs(s).map((id) => s.acts[id])[0];
  return a ? a.members.length + 2 : 4;
}

/** Cidades com público/cena dos atos do jogador (verde), territórios abertos (neutro) e sem acesso (cinza). */
function tourCities(s: GameState): MapCity[] {
  const acts = playerActs(s).map((id) => s.acts[id]);
  const genres = new Set(acts.map((a) => a.genre));
  const homeCities = new Set(acts.map((a) => a.city));
  const scene = new Map<string, number>();
  for (const [k, v] of Object.entries(s.scenes)) {
    const [city, genre] = k.split(':');
    if (genres.has(genre) && v > 0) scene.set(city, Math.max(scene.get(city) ?? 0, v));
  }
  return CITIES.map((c) => {
    const audience = homeCities.has(c.id) || scene.has(c.id) || c.id === s.config.homeCity;
    const open = s.player.territories.includes(c.market);
    const order = tourStops.indexOf(c.id);
    return {
      id: c.id,
      color: audience ? 'var(--good)' : open ? 'var(--map-city)' : undefined,
      locked: !audience && !open,
      size: audience ? 1.15 : 1,
      badge: order >= 0 ? String(order + 1) : undefined,
    };
  });
}

function tourSummaryView(s: GameState): HTMLElement {
  const home = s.config.homeCity;
  const crew = tourCrew(s);
  if (!tourStops.length) {
    return h('p', { class: 'muted small' }, t(l('Clique nas cidades do mapa para montar uma rota a partir de {c} (equipe de {n}). Arraste para mover, role ou use +/− para zoom.', 'Click cities on the map to build a route from {c} (crew of {n}). Drag to pan; scroll or use +/− to zoom.'), { c: cityName(home), n: crew }));
  }
  const plan = planRoute(tourStops, home, s.year, s.month, crew);
  const money$ = (real: number) => $(nominal(real, s.year));
  const visaCell = (v: (typeof plan.legs)[number]['visa']) => {
    if (!v.needed) return h('span', { class: 'muted', title: t(v.reason) }, '—');
    const cls = v.boycott || v.denyChance > 0.5 ? 'bad' : v.denyChance > 0.1 ? 'warn' : '';
    return h('span', { title: t(v.reason) }, pill(`${v.processingDays}d · ${Math.round(v.denyChance * 100)}%`, cls));
  };
  const rows = plan.legs.map((g, i) => {
    const st = plan.stops[i];
    const unit = unitOfCity(g.to, st?.year ?? s.year);
    return h('tr', null,
      h('td', null, `${cityName(g.from)} → `, h('b', null, cityName(g.to)), h('div', { class: 'muted small' }, unit ? t(unit.name) : t(countryName(null)))),
      h('td', null, `${N(g.km)} km`),
      h('td', { class: 'nowrap' }, glyphCanvas(g.mode, 2), ' ', transportName(g.mode)),
      h('td', null, String(g.days).replace('.', getDecimal())),
      h('td', null, money$(g.costReal)),
      h('td', null, visaCell(g.visa)),
      h('td', { class: 'nowrap' }, st ? [glyphCanvas(st.climate.icon, 2), ` ${Math.round(st.climate.tempC)}°`] : null),
    );
  });
  const tt = plan.totals;
  // notas agrupadas: mesmo texto, várias cidades
  const grouped = new Map<string, string[]>();
  const addNote = (text: string, city?: string) => { const g = grouped.get(text) ?? []; if (city && !g.includes(city)) g.push(city); grouped.set(text, g); };
  for (const g of plan.legs) if (g.borderNote) addNote(t(g.borderNote));
  for (const v of tt.visas) addNote(t(v.reason), cityName(v.to));
  const notes = [...grouped.entries()].map(([text, cities]) => h('li', { class: /apartheid/.test(text) ? 'bad' : '' }, cities.length ? `${cities.join(', ')}: ${text}` : text));
  return h('div', null,
    h('table', { class: 'tbl compact route' },
      h('thead', null, h('tr', null, h('th', null, t(l('Trecho', 'Leg'))), h('th', null, t(l('Distância', 'Distance'))), h('th', null, t(l('Meio', 'Mode'))), h('th', null, t(l('Dias', 'Days'))), h('th', null, t(l('Custo', 'Cost'))), h('th', null, t(l('Visto', 'Visa'))), h('th', null, t(l('Clima', 'Weather'))))),
      h('tbody', null, rows),
      h('tfoot', null, h('tr', null, h('th', null, t(l('Total', 'Total'))), h('th', null, `${N(tt.km)} km`), h('th', null, ''), h('th', null, String(tt.days).replace('.', getDecimal())), h('th', null, money$(tt.costReal + tt.visaCostReal)),
        h('th', null, tt.visas.length ? pill(`${tt.visas.length} · ${tt.leadDays}d · ${Math.round(tt.maxDenyChance * 100)}%`, tt.boycott || tt.maxDenyChance > 0.5 ? 'bad' : tt.maxDenyChance > 0.1 ? 'warn' : '') : '—'), h('th', null, ''))),
    ),
    notes.length ? h('ul', { class: 'small route-notes' }, notes) : null,
    h('div', { class: 'row' },
      h('span', { class: 'muted small' }, t(l('Custos em valores de {y} (passagens + frete; vistos inclusos no total). Prazo de vistos corre antes da partida.', 'Costs in {y} money (fares + freight; visas included in the total). Visa processing runs before departure.'), { y: s.year })),
      h('button', { class: 'btn small ghost', onclick: () => { tourStops = []; refreshTour(s); } }, t(l('Limpar rota', 'Clear route'))),
    ),
  );
}

const getDecimal = () => (locale().startsWith('pt') ? ',' : '.');

function refreshTour(s: GameState): void {
  tourMap?.update({ cities: () => tourCities(s), selected: [...tourStops], route: tourStops.length ? [s.config.homeCity, ...tourStops] : [], crewSize: tourCrew(s) });
  if (tourSummary) {
    const next = tourSummaryView(s);
    tourSummary.replaceChildren(next);
  }
}

function tourMapSection(s: GameState): HTMLElement {
  tourStops = tourStops.filter((id) => cityById[id] && id !== s.config.homeCity);
  const opts = {
    getYear: () => store.game?.year ?? s.year,
    getMonth: () => store.game?.month ?? s.month,
    cities: () => tourCities(s),
    selected: [...tourStops],
    route: tourStops.length ? [s.config.homeCity, ...tourStops] : [],
    crewSize: tourCrew(s),
    mode: 'tour' as const,
    onCityClick: (id: string) => {
      if (id === s.config.homeCity) return;
      tourStops = tourStops.includes(id) ? tourStops.filter((x) => x !== id) : [...tourStops, id];
      refreshTour(s);
      rerender();
    },
  };
  if (!tourMap) tourMap = new WorldMap(opts);
  else tourMap.update(opts);
  tourSummary = h('div', { class: 'route-summary' }, tourSummaryView(s));
  return section(t(l('Mapa', 'Map')), tourMap.element, tourSummary);
}

// ---------- Shows ----------
export function showsPanel(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const fests = FESTIVALS.filter((f) => f.start <= s.year && !f.scouting);
  return h('div', { class: 'panel shows' },
    h('div', { class: 'col-main' },
      venueBanner14(s),
      tourMapSection(s),
      tourPlannerSection(s, tourStops),
      activeToursSection(s),
      merchSection(s),
      ids.length ? ids.map((id) => {
        const a = s.acts[id];
        const mt = maxVenueTier(s, a);
        return section(`${a.name} — ${t(S.gigs)}`,
          h('table', { class: 'tbl compact' },
            h('thead', null, h('tr', null, h('th', null, t(S.venue)), h('th', null, t(S.perDate)), h('th', null, t(S.revenue)), h('th', null, t(S.net)), h('th', null, t(S.fatigue)), h('th', null, ''))),
            h('tbody', null, VENUE_TIERS.map((v) => {
              const est = gigEstimate(s, a, v.id, 4);
              const ok = v.id <= mt;
              return h('tr', { class: ok ? '' : 'muted' },
                h('td', null, t(v.name), h('small', { class: 'muted' }, ` ${v.cap[0]}–${v.cap[1]}`)),
                h('td', null, ok ? `~${N(est.perDate)}` : '—'),
                h('td', null, ok ? $(est.revenue) : '—'),
                h('td', { class: est.net >= 0 ? 'good' : 'bad' }, ok ? $(est.net) : '—'),
                h('td', null, ok ? `+${Math.round(est.fatigue)}` : '—'),
                h('td', null, ok ? h('button', { class: 'btn small', onclick: () => {
                  const slots = s.delegated[a.id] !== false ? [] : [...(s.agenda[a.id] ?? [])];
                  s.agenda[a.id] = [...slots.filter((x) => x.action !== 'gigs'), { action: 'gigs', params: { tier: v.id, dates: 4 } }].slice(0, 4);
                  s.delegated[a.id] = false;
                  toast(t(l('Shows adicionados à agenda.', 'Gigs added to the agenda.')), 'good');
                  rerender();
                } }, t(l('Agendar 4 datas', 'Book 4 dates'))) : null),
              );
            })),
          ),
          h('p', { class: 'muted small' }, a.playerBand ? t(l('Bilheteria vai para você.', 'Box office goes to you.')) : t(l('Bilheteria é do artista; o selo só participa em contrato 360.', 'Box office belongs to the artist; the label only shares in a 360 deal.'))),
        );
      }) : section(t(S.gigs), h('p', null, t(S.noActs))),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.festivals), h('p', { class: 'muted small' }, t(l('Convites chegam de abril a agosto, por adequação, prestígio e rede.', 'Invitations arrive April–August, by fit, prestige and network.'))),
        h('ul', { class: 'small' }, fests.map((f) => h('li', null, h('b', null, f.name), ` · ${cityName(f.city)} · ${t(f.kind)} `,
          ...ids.map((id) => { const slot = festivalSlot(s, s.acts[id], f.prestige); const fit = f.focus.length === 0 || f.focus.includes(familyOf(s.acts[id].genre)); return slot && fit ? pill(`${s.acts[id].name}: ${slot}`, 'good') : null; }))))),
      section(t(S.venues), h('ul', { class: 'small' }, VENUES.map((v) => h('li', null, `${v.name} — ${cityName(v.city)} (${N(v.capacity)})`)))),
    ),
  );
}

// ---------- Empresa ----------
export function companyPanel(s: GameState): HTMLElement {
  const tabs: [typeof store.companyTab, string][] = [['finances', t(S.finances)], ['staff', t(S.staff)], ['hq', t(S.areaHq)], ['legacy', t(S.legacy)]];
  const tabBar = h('div', { class: 'tabs' }, tabs.map(([id, label]) => h('button', { class: store.companyTab === id ? 'on' : '', onclick: () => { store.companyTab = id; rerender(); } }, label)));
  let body: HTMLElement;
  if (store.companyTab === 'finances') body = finances(s);
  else if (store.companyTab === 'staff') body = staff(s);
  else if (store.companyTab === 'hq') body = hqTab(s);
  else body = legacyTab(s);
  return h('div', { class: 'panel company' }, tabBar, body);
}

const CAT_NAMES: Record<string, [string, string]> = {
  sales: ['Vendas (master)', 'Sales (master)'], publishing: ['Edição', 'Publishing'], live: ['Shows', 'Live'], live_costs: ['Custos de shows', 'Live costs'],
  royalties: ['Royalties pagos/recebidos', 'Royalties'], distribution: ['Distribuição', 'Distribution'], release: ['Fabricação e marketing', 'Manufacturing & marketing'],
  recording: ['Gravação', 'Recording'], advances: ['Adiantamentos', 'Advances'], rent: ['Aluguel', 'Rent'], salaries: ['Salários', 'Salaries'],
  scouting: ['Scouting', 'Scouting'], artist_dev: ['Desenvolvimento artístico', 'Artist development'], legal: ['Jurídico', 'Legal'], sync: ['Sync', 'Sync'],
  loans: ['Empréstimos', 'Loans'], financing: ['Financiamento', 'Financing'], equipment: ['Equipamento', 'Equipment'], hq: ['Sede', 'HQ'],
  marketing: ['Marketing avulso', 'Ad-hoc marketing'], taxes: ['Impostos', 'Taxes'], outsourcing: ['Terceirização', 'Outsourcing'], neural: ['Era neural', 'Neural era'], acquisitions: ['Aquisições', 'Acquisitions'], asset_sales: ['Venda de ativos', 'Asset sales'],
  overhead: ['Despesas gerais', 'Overhead'], promo: ['Promoção mínima de lançamentos', 'Baseline release promo'], dividends: ['Dividendos', 'Dividends'], owner_draw: ['Retiradas e aportes do dono', 'Owner draws and injections'],
};
export const catName = (c: string) => t(CAT_NAMES[c] ? l(CAT_NAMES[c][0], CAT_NAMES[c][1]) : l(c));

function finances(s: GameState): HTMLElement {
  const last = Object.entries(s.lastMonthLedger).sort((a, b) => b[1] - a[1]);
  const fixed = monthlyCosts(s);
  const offer = loanOffer(s);
  const years = Object.keys(s.player.revenueByYear).map(Number).sort((a, b) => b - a).slice(0, 12);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(S.byCategory), h('table', { class: 'tbl compact' }, h('tbody', null, last.map(([k, v]) => h('tr', null, h('td', null, catName(k)), h('td', { class: v >= 0 ? 'good' : 'bad' }, $(v))))))),
      section(t(S.yearly), !years.length ? h('p', { class: 'muted small' }, t(l('O primeiro ano fecha em dezembro; receita e resultado anuais aparecem aqui.', 'The first year closes in December; yearly revenue and result show up here.'))) : h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Ano', 'Year'))), h('th', null, t(S.revenue)), h('th', null, t(l('Resultado', 'Result'))))),
        h('tbody', null, years.map((y) => h('tr', null, h('td', null, y), h('td', null, $(s.player.revenueByYear[y] ?? 0)), h('td', { class: (s.player.profitByYear[y] ?? 0) >= 0 ? 'good' : 'bad' }, $(s.player.profitByYear[y] ?? 0))))))),
      section(t(S.ledger), h('table', { class: 'tbl compact' }, h('tbody', null, s.ledger.slice(-30).reverse().map((e) => h('tr', null, h('td', { class: 'muted' }, `${t(S.week)} ${e.week}`), h('td', null, memoText(e.memo)), h('td', null, catName(e.cat)), h('td', { class: e.amount >= 0 ? 'good' : 'bad' }, $(e.amount))))))),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.cash), h('div', { class: 'big' }, $(s.player.cash))),
      section(t(S.monthlyCosts),
        kv(t(l('Aluguel', 'Rent')), $(fixed.rent)), kv(t(l('Salários', 'Salaries')), $(fixed.salaries)), kv(t(l('Terceirização', 'Outsourcing')), $(fixed.outsourcing)), kv(t(l('Empréstimos', 'Loans')), $(fixed.loans)), kv(t(l('Manutenção', 'Maintenance')), $(fixed.equipment)),
        kv(t(S.mgmtLoad), h('span', { class: managementLoad(s) > 1 ? 'bad' : '' }, `${(managementLoad(s) * 100).toFixed(0)}%`)),
      ),
      section(t(S.loans),
        s.player.loans.map((ln) => kv(t(l('Saldo', 'Balance')), `${$(ln.balance)} · ${(ln.rate * 100).toFixed(1)}% a.a. · ${$(ln.monthly)}/m`)),
        offer ? h('div', null, h('p', { class: 'small' }, t(l('Oferta: {a} a {r}% ao ano, 36 meses.', 'Offer: {a} at {r}% a year, 36 months.'), { a: $(offer.amount), r: String(Math.round(offer.rate * 1000) / 10).replace('.', t(l(',', '.'))) })), h('button', { class: 'btn', disabled: s.player.loans.length >= 3, onclick: () => { takeLoan(s); rerender(); } }, t(S.takeLoan))) : h('p', { class: 'muted small' }, t(l('Sem crédito disponível (Sem Rede de Segurança).', 'No credit available (No Safety Net).'))),
      ),
    ),
  );
}

function staff(s: GameState): HTMLElement {
  const cap = hqCaps(s).staff;
  return section(`${t(S.staff)} ${s.player.staff.length}/${cap}`,
    crewSummary(s),
    s.player.staff.length ? h('table', { class: 'tbl' }, h('tbody', null, s.player.staff.map((st) => {
      const role = STAFF_ROLES.find((r) => r.id === st.role);
      const years = Math.max(0, (s.week - st.hiredWeek) / 52);
      return h('tr', null, h('td', null, st.name, h('div', { class: 'muted small' }, t(l('{y} ano(s) de casa', '{y} year(s) here'), { y: years.toFixed(1) }))), h('td', { title: t(role?.desc) }, t(role?.name)), h('td', null, crewProfileCell(s, st, { mine: true })), h('td', null, st.skill), h('td', null, $(st.salary)), h('td', null, crewRespecButton(s, st), ' ', h('button', { class: 'btn small ghost', onclick: () => { fireStaff(s, st.id); rerender(); } }, t(S.fire))));
    }))) : h('p', { class: 'muted' }, t(l('Sem equipe. Contrate em Mercado → Profissionais.', 'No staff. Hire in Market → Professionals.'))),
    h('h4', null, t(l('Funções', 'Roles'))),
    h('ul', { class: 'small' }, STAFF_ROLES.map((r) => h('li', null, h('b', null, t(r.name)), ' — ', t(r.desc)))),
  );
}

function hqLadder(s: GameState): HTMLElement {
  return h('div', { class: 'hq-ladder' }, HQ_LEVELS.map((lv, i) => {
    const blk = i > s.player.hq ? hqBlocker(s, lv) : null;
    return h('div', { class: `hq-step ${i === s.player.hq ? 'cur' : i < s.player.hq ? 'done' : blk ? 'locked' : ''}` },
      h('b', null, ic(i >= 4 ? (i === 5 ? 'rocket' : 'building') : 'house'), ' ', t(lv.name)),
      h('small', null, `${lv.careers} ${t(l('carreiras', 'careers'))} · ${lv.staff} ${t(l('equipe', 'staff'))} · ${lv.sessions} ${t(l('sessões', 'sessions'))}`),
      h('small', { class: 'muted' }, `${t(lv.reach)} · ${t(l('aluguel', 'rent'))} ${$(money(s, lv.rent))}/m`),
      lv.desc ? h('small', { class: 'muted' }, t(lv.desc)) : null,
      i === s.player.hq ? pill(t(l('atual', 'current')), 'good') : blk ? pill(t(blk), 'warn') : null);
  }));
}

export function branchesSection(s: GameState): HTMLElement {
  const acts = playerActs(s);
  return section(t(l('Filiais', 'Branches')),
    h('p', { class: 'muted small' }, t(l('A partir do Loft, abra filiais pelo mapa (Mundo → clique numa cidade). Cada filial soma carreiras, equipe e sessões, abre o mercado local e dá vantagem de público e garimpo na região.', 'From the Loft on, open branches from the map (World → click a city). Each branch adds careers, staff and sessions, opens the local market and boosts audiences and scouting in the region.'))),
    s.branches.length ? h('div', { class: 'branch-list' }, s.branches.map((b) => {
      const lv = BRANCH_LEVELS[b.level];
      const next = BRANCH_LEVELS[b.level + 1];
      const here = acts.filter((id) => s.branchOf[id] === b.id);
      return tile('building', `${t(cityById[b.city]?.name)} — ${t(lv.name)}`, [
        h('small', null, `+${lv.careers} ${t(l('carreiras', 'careers'))} · +${lv.staff} ${t(l('equipe', 'staff'))} · +${lv.sessions} ${t(l('sessões', 'sessions'))} · ${$(money(s, lv.rent))}/m`),
        h('div', { class: 'row wrap' }, here.length ? here.map((id) => actLink(s, id)) : h('small', { class: 'muted' }, t(l('Nenhum artista designado.', 'No artists assigned.')))),
        h('div', { class: 'row wrap' },
          next ? h('button', { class: 'btn small', onclick: () => { const e = upgradeBranch(s, b.id); toast(t(e ?? l('Filial ampliada!', 'Branch upgraded!')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Ampliar para', 'Upgrade to'))} ${t(next.name)} (${$(money(s, next.cost))})`) : null,
          h('button', { class: 'btn small ghost', onclick: () => { if (!confirm(t(l('Fechar esta filial? O investimento não volta.', 'Close this branch? The investment is not refunded.')))) return; closeBranch(s, b.id); rerender(); } }, t(l('Fechar filial', 'Close branch'))),
        ),
      ]);
    })) : null,
    s.branches.length && acts.length ? h('div', null, h('h4', null, t(l('Quem trabalha onde', 'Who works where'))),
      h('ul', { class: 'small' }, acts.map((id) => h('li', null, actLink(s, id), ' ',
        select(s.branchOf[id] ?? '', [{ value: '', label: t(l('Matriz', 'Main HQ')) }, ...s.branches.map((b) => ({ value: b.id, label: t(cityById[b.city]?.name) }))], (v) => { assignBranch(s, id, v || null); rerender(); }, { 'aria-label': t(l('Sede do artista', "Artist's HQ")) }))))) : null,
  );
}

function hqTab(s: GameState): HTMLElement {
  const up = upgradeCost(s);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(S.areaHq), h('p', null, t(hqCapacityText(s))), kv(t(l('Carreiras em uso', 'Careers in use')), `${careerSlotsUsed(s)}/${hqCaps(s).careers}`),
        hqLadder(s),
        up !== null ? (() => { const blk = hqBlocker(s); return h('div', { class: 'row' }, h('button', { class: 'btn primary', disabled: !!blk, title: blk ? t(blk) : '', onclick: () => { const e = upgradeHq(s); if (e) toast(t(e), 'bad'); rerender(); } }, ic('building'), ` ${t(S.upgrade)}: ${t(HQ_LEVELS[s.player.hq + 1].name)} (${$(up)})`), blk ? h('small', { class: 'muted' }, t(blk)) : null); })() : null,
      ),
      branchesSection(s),
      section(t(S.equipment), h('table', { class: 'tbl compact' }, h('tbody', null,
        s.player.equipment.map((id) => { const e = EQUIPMENT.find((x) => x.id === id)!; return h('tr', { class: 'mine' }, h('td', null, t(e.name)), h('td', null, branchName(e.branch)), h('td', null, '✓'), h('td', null, '')); }),
        availableEquipment(s).map((e) => h('tr', null, h('td', null, t(e.name), e.needsEngineer ? pill(t(l('requer engenheiro', 'needs engineer'))) : null), h('td', null, branchName(e.branch)), h('td', null, $(money(s, e.cost))), h('td', null, h('button', { class: 'btn small', onclick: () => { const err = buyEquipment(s, e.id); if (err) toast(t(err), 'bad'); rerender(); } }, t(S.buy))))),
      ))),
    ),
    h('aside', { class: 'col-side' },
      section(t(S.territories), h('ul', null, MARKETS.map((m) => h('li', null, t(m.name), ' ',
        s.player.territories.includes(m.id) ? pill('✓', 'good') : h('button', { class: 'btn small', onclick: () => { const e = openTerritory(s, m.id); if (e) toast(t(e), 'bad'); rerender(); } }, `${t(S.openMarket)} ${$(territoryCost(s, m.id))}`))))),
    ),
  );
}

function legacyTab(s: GameState): HTMLElement {
  const card = cardById[s.config.card];
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(`${t(S.legacy)} — ${legacyTotal(s)}`, LEGACY_DIMS.map((d) => kv(t(d.name), h('span', null, Math.round(s.player.legacy[d.id]), ' ', bar(s.player.legacy[d.id]))))),
      section(t(l('Marcos', 'Milestones')), h('ul', null, milestones(s).map((m) => h('li', { class: m.done ? 'good' : 'muted' }, m.done ? '☑ ' : '◻ ', t(m.text))))),
      section(t(l('Prêmios do selo', 'Label awards')), h('ul', { class: 'small' }, s.awards.filter((a) => a.byPlayer).slice(-20).reverse().map((a) => h('li', null, `${a.year} · ${a.category} · ${a.name}`)))),
    ),
    h('aside', { class: 'col-side' },
      card ? section(t(card.name), h('p', null, t(card.passive)), h('p', null, t(card.goal), ' ', pill(cardGoalDone(s) || s.player.goalsDone.includes(card.id) ? t(S.done) : t(S.pending)))) : null,
      section(t(l('Fim da história', 'End of the story')), h('p', { class: 'small muted' }, t(l('Em 2040 a run termina num dos 20 finais, escolhido pelo seu legado e pelas escolhas que você fizer até lá.', 'In 2040 the run ends in one of 20 endings, chosen by your legacy and the choices you make until then.'))), h('p', { class: 'small' }, `${ENDINGS.length} ${t(l('finais possíveis', 'possible endings'))}`)),
      section(t(l('Mutators', 'Mutators')), h('p', { class: 'small' }, s.config.mutators.length ? s.config.mutators.join(', ') : t(S.none))),
      section(t(l('Run', 'Run')), kv(t(S.seed), s.config.seed), kv(t(l('Assinatura', 'Signature')), s.signature), kv(t(S.mode), s.config.mode), kv(t(S.storyteller), s.config.storyteller)),
    ),
  );
}

// ---------- Diário ----------
let diaryImportant = true;
export function diaryPanel(s: GameState): HTMLElement {
  const entries = s.memory.filter((m) => !diaryImportant || m.important || m.kind === 'number1').slice().reverse();
  const byYear = new Map<number, typeof entries>();
  for (const e of entries) {
    if (!byYear.has(e.year)) byYear.set(e.year, []);
    byYear.get(e.year)!.push(e);
  }
  const exportTxt = () => {
    const lines = s.memory.filter((m) => m.important).map((m) => `${m.year}-${String(m.month + 1).padStart(2, '0')} ${t(m.text)}`);
    tryDownload(`diario-${s.signature}.txt`, `Masters — Run ${s.signature}\n${s.config.companyName}\n\n${lines.join('\n')}`, 'text/plain');
  };
  return h('div', { class: 'panel diary' },
    section(`${t(S.areaDiary)} — Run ${s.signature}`,
      h('div', { class: 'row' },
        h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: diaryImportant, onchange: (e: Event) => { diaryImportant = (e.target as HTMLInputElement).checked; rerender(); } }), t(l('Só fatos marcantes', 'Only landmark facts'))),
        h('button', { class: 'btn small ghost', onclick: exportTxt }, t(l('Exportar diário', 'Export diary'))),
        h('button', { class: 'btn small ghost', onclick: async () => { const txt = s.memory.filter((m) => m.important).map((m) => `${m.year}-${String(m.month + 1).padStart(2, '0')} ${t(m.text)}`).join('\n'); const ok = await copyText(`Masters — Run ${s.signature}\n${s.config.companyName}\n\n${txt}`); toast(ok ? t(l('Diário copiado.', 'Diary copied.')) : t(l('Não deu para copiar aqui.', 'Copy is not available here.')), ok ? 'good' : 'bad'); } }, t(l('Copiar diário', 'Copy diary'))),
      ),
      [...byYear.entries()].map(([y, list]) => h('div', { class: 'year' }, h('h4', null, y), h('ul', null, list.map((m) => h('li', null, h('span', { class: 'muted' }, monthName(m.month) + ' · '), t(m.text), m.actId ? h('span', null, ' ', actLink(s, m.actId)) : null))))),
    ),
  );
}

// ---------- Sede ----------
let hqView: HqView | null = null;
export function hqPanel(s: GameState): HTMLElement {
  hqView ??= new HqView(() => store.game);
  hqView.onSelect = (id) => (hqHooks.onAct ? hqHooks.onAct(id) : inspect.act(id));
  hqView.onSelectPerson = (id) => inspect.person(id);
  hqView.onSelectStaff = () => { store.area = 'company'; store.companyTab = 'staff'; rerender(); };
  hqView.refreshToolbar();
  const wrap = h('div', { class: 'hq-wrap' }, hqView.toolbar, hqView.stage);
  setTimeout(() => hqView?.start(), 0);
  const acts = playerActs(s).map((id) => s.acts[id]);
  return h('div', { class: 'panel hq' },
    h('div', { class: 'col-main' }, section(`${s.config.companyName} — ${t(HQ_LEVELS[s.player.hq].name)}`, wrap, h('p', { class: 'muted small' }, t(l('Balões mostram quem grava, compõe, ensaia, descansa, está à toa ou precisa de atenção (!); etiquetas mostram estúdio livre, gravando ou com fila. Clique no artista para ver a próxima decisão, no estúdio para abrir a sessão em andamento, no escritório para a equipe e nos troféus para a história da empresa. Arraste para mover, roda do mouse ou +/− para zoom, Home centraliza.', 'Bubbles show who is recording, writing, rehearsing, resting, idle or needs attention (!); tags show whether the studio is free, recording or has a queue. Click an artist for their next decision, the studio for the session in progress, the office for the team and the trophies for the company history. Drag to pan, mouse wheel or +/− to zoom, Home recenters.'))))),
    h('aside', { class: 'col-side' },
      hqHooks.side ? hqHooks.side(s) : section(t(l('Unidades por banda', 'Band units')), acts.length ? h('ul', { class: 'small' }, acts.map((a) => h('li', null, actLink(s, a.id), ` · ${t(S.fame)} ${Math.round(a.fame)} · `, t(l('agenda', 'agenda')), ': ', (s.agenda[a.id] ?? []).map((x) => x.action).join(', ') || '—'))) : h('p', { class: 'muted' }, t(S.noActs))),
      section(t(l('Capacidade', 'Capacity')), h('p', { class: 'small' }, t(hqCapacityText(s))), kv(t(S.mgmtLoad), `${(managementLoad(s) * 100).toFixed(0)}%`)),
      section(t(l('Cartas e mutators', 'Cards and mutators')), h('p', { class: 'small' }, t(CARDS.find((c) => c.id === s.config.card)?.name))),
    ),
  );
}

export function stopHq(): void {
  hqView?.stop();
}

void VENUES;
