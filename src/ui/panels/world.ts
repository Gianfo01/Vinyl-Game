// Mundo: mapa de mercados e cenas, geopolítica, movimentos e moda, clubes, paradas por gênero e
// região, recordes, Hall dos Ecos e documentários.

import { CITIES, FAMILIES, MARKETS, cityById, l } from '../../data/world';
import { t } from '../../i18n/strings';
import { activeGeo, buyClub } from '../../sim/culture';
import { activeCensorship } from '../../sim/media';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, N, actLink, cityName, genreName, pill, releaseLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { WorldMap, type MapCity } from '../map';
import { store } from '../store';
import { ic, stat, chips, tabs, tile } from '../vis';

let worldMap: WorldMap | null = null;
let focusCity: string | null = null;

function mapCities(s: GameState): MapCity[] {
  const movementCities = new Set(s.movements.filter((m) => s.year - m.born < 10).map((m) => m.city));
  const clubCities = new Map<string, number>();
  for (const c of s.clubs) if (!c.closed) clubCities.set(c.city, (clubCities.get(c.city) ?? 0) + 1);
  return CITIES.map((c) => {
    const scene = Object.entries(s.scenes).filter(([k]) => k.startsWith(c.id + ':')).reduce((t2, [, v]) => t2 + v, 0);
    const mine = s.clubs.some((x) => x.city === c.id && x.owner === 'player');
    return {
      id: c.id,
      color: mine ? 'var(--accent)' : movementCities.has(c.id) ? 'var(--warn, #e0a030)' : scene > 3 ? 'var(--good)' : undefined,
      size: 0.9 + Math.min(1, scene / 20),
      badge: movementCities.has(c.id) ? '★' : clubCities.get(c.id) ? String(clubCities.get(c.id)) : undefined,
      locked: !s.player.territories.includes(c.market) && scene < 1,
    };
  });
}

function mapSection(s: GameState): HTMLElement {
  const opts = {
    getYear: () => store.game?.year ?? s.year,
    getMonth: () => store.game?.month ?? s.month,
    cities: () => mapCities(s),
    selected: focusCity ? [focusCity] : [],
    mode: 'scenes' as const,
    onCityClick: (id: string) => { focusCity = id; rerender(); },
  };
  if (!worldMap) worldMap = new WorldMap(opts);
  else worldMap.update(opts);
  const city = focusCity ? cityById[focusCity] : undefined;
  const scenes = city ? Object.entries(s.scenes).filter(([k]) => k.startsWith(city.id + ':')).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];
  const clubs = city ? s.clubs.filter((c) => c.city === city.id && !c.closed) : [];
  return section(t(l('Mapa das cenas', 'Scene map')), worldMap.element,
    h('p', { class: 'muted small' }, t(l('Verde: cena forte · ★: movimento recente · número: clubes · seu clube em destaque.', 'Green: strong scene · ★: recent movement · number: clubs · your club highlighted.'))),
    city ? h('div', { class: 'city-card' },
      h('h4', null, ic('globe'), ' ', t(city.name)),
      chips(...scenes.map(([k, v]) => stat('fire', v.toFixed(1), genreName(k.split(':')[1])))),
      clubs.length ? h('div', { class: 'cards' }, clubs.map((c) => tile('house', c.name, [
        h('small', null, `${genreName(c.genre)} · ${N(c.capacity)} ${t(l('lugares', 'capacity'))} · ${t(l('prestígio', 'prestige'))} ${Math.round(c.prestige)}`),
        c.owner === 'player' ? pill(t(l('seu clube', 'your club')), 'good') : h('button', { class: 'btn small', onclick: () => { const e = buyClub(s, c.id); toast(e ? t(e) : t(l('Clube comprado!', 'Club bought!')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Comprar', 'Buy'))} ~${$(money(s, 15000 + c.capacity * 40 + c.prestige * 500))}`),
      ]))) : h('p', { class: 'muted small' }, t(l('Sem clubes ativos aqui.', 'No active clubs here.'))),
    ) : null,
  );
}

function geoSection(s: GameState): HTMLElement {
  const geo = activeGeo(s);
  const cens = activeCensorship(s);
  return section(t(l('Geopolítica e censura', 'Geopolitics and censorship')),
    geo.length || cens.length ? h('div', { class: 'cards' },
      geo.map((g) => tile(g.liveBlocked ? 'lock' : 'globe', t(g.name), [h('small', null, t(g.note)), h('small', { class: 'muted' }, `${g.from}–${g.to} · ${g.markets.map((m) => t(MARKETS.find((x) => x.id === m)!.name)).join(', ')}`)], { cls: 'warn' })),
      cens.map((c) => tile('newspaper', t(c.name), [h('small', null, t(l('Gêneros/temas visados: ', 'Targeted genres/themes: ')), c.banned.join(', ')), h('small', { class: 'muted' }, `${c.from}–${c.to}`)], { cls: 'bad' })),
    ) : h('p', { class: 'muted small' }, t(l('Mundo relativamente calmo.', 'A relatively calm world.'))),
    s.bans.length ? h('ul', { class: 'small' }, s.bans.slice(-6).reverse().map((b) => h('li', null, ic('lock'), ' ', releaseLink(s, b.releaseId), ` — ${t(MARKETS.find((m) => m.id === b.market)!.name)}: `, t(b.reason)))) : null,
  );
}

function movementsSection(s: GameState): HTMLElement {
  const list = [...s.movements].sort((a, b) => b.born - a.born).slice(0, 12);
  return section(t(l('Movimentos e moda', 'Movements and fashion')), list.length ? h('div', { class: 'cards' }, list.map((m) => tile('fire', t(m.name), [
    h('small', null, `${cityName(m.city)} · ${m.born} · ${t(l('de', 'from'))} ${genreName(m.parent)}`),
    h('small', { class: 'muted' }, ic('shirt'), ' ', t(m.fashion)),
    h('div', { class: 'row wrap' }, m.acts.slice(0, 4).map((id) => actLink(s, id))),
  ]))) : h('p', { class: 'muted small' }, t(l('Movimentos nascem quando várias bandas de uma cidade fortalecem a mesma cena.', 'Movements are born when several bands in a city grow the same scene.'))));
}

function chartsSection(s: GameState): HTMLElement {
  return section(t(l('Paradas por gênero e região', 'Charts by genre and region')),
    tabs('worldcharts', [
      ...MARKETS.map((m) => ({ id: m.id, label: t(m.name), render: () => h('ol', { class: 'mini-chart' }, (s.regionCharts[m.id] ?? []).map((id) => h('li', null, releaseLink(s, id), ' — ', actLink(s, s.releases[id]?.actId)))) })),
      ...FAMILIES.filter((f) => s.genreCharts[f.id]?.length).map((f) => ({ id: f.id, label: t(f.name), render: () => h('ol', { class: 'mini-chart' }, (s.genreCharts[f.id] ?? []).map((id) => h('li', null, releaseLink(s, id), ' — ', actLink(s, s.releases[id]?.actId)))) })),
    ], rerender),
  );
}

function recordsSection(s: GameState): HTMLElement {
  const r = s.records;
  return section(t(l('Recordes', 'Records')), h('div', { class: 'cards' },
    r.longestNo1 ? tile('trophy', t(l('Mais semanas em #1', 'Most weeks at #1')), [h('small', null, `"${r.longestNo1.title}" — ${r.longestNo1.act}`), h('b', null, `${r.longestNo1.weeks}`)]) : null,
    r.biggestWeek ? tile('fire', t(l('Maior semana de vendas', 'Biggest sales week')), [h('small', null, `"${r.biggestWeek.title}" — ${r.biggestWeek.act}`), h('b', null, N(r.biggestWeek.units))]) : null,
    r.longestRun ? tile('chart-up', t(l('Mais tempo nas paradas', 'Longest chart run')), [h('small', null, `"${r.longestRun.title}" — ${r.longestRun.act}`), h('b', null, `${r.longestRun.weeks}`)]) : null,
    r.mostNo1sAct ? tile('fame', t(l('Mais números 1', 'Most number ones')), [h('small', null, r.mostNo1sAct.name), h('b', null, String(r.mostNo1sAct.n))]) : null,
  ));
}

function hallSection(s: GameState): HTMLElement {
  return section(t(l('Hall dos Ecos', 'Hall of Echoes')), s.hallOfFame.length ? h('div', { class: 'hall' }, [...s.hallOfFame].reverse().slice(0, 20).map((x) => h('div', { class: 'plaque' }, ic('trophy'), h('b', null, x.name), h('small', null, String(x.year)), actLink(s, x.actId)))) : h('p', { class: 'muted small' }, t(l('Carreiras de 25+ anos com hits e prêmios entram aqui.', '25+ year careers with hits and awards are inducted here.'))),
    s.documentaries.length ? h('ul', { class: 'small' }, s.documentaries.slice(-5).reverse().map((d) => h('li', null, ic('film'), ` ${d.title} (${N(d.views)})`))) : null);
}

export function worldPanel(s: GameState): HTMLElement {
  return h('div', { class: 'panel world' },
    h('div', { class: 'col-main' }, mapSection(s), chartsSection(s), movementsSection(s)),
    h('aside', { class: 'col-side' }, geoSection(s), recordsSection(s), hallSection(s)),
  );
}
