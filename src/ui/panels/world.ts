// Mundo: mapa de mercados e cenas, geopolítica, movimentos e moda, clubes, paradas por gênero e
// região, recordes, Hall dos Ecos e documentários.

import { CITIES, FAMILIES, MARKETS, cityById, l, type L } from '../../data/world';
import { FESTIVALS } from '../../data/catalog';
import { BRANCH_LEVELS } from '../../data/rules';
import { countryName, countryOfCity, marketOfCountry, unitOfCity, unitOfCountry } from '../../data/geo';
import { climateAt } from '../../sim/travel';
import { cityDemand, tourList } from '../../sim/tours';
import { canOpenBranch, openBranch } from '../../sim/branches';
import { t } from '../../i18n/strings';
import { activeGeo, buyClub, geoEffects, liveBlocked } from '../../sim/culture';
import { activeCensorship } from '../../sim/media';
import type { GameState } from '../../sim/types';
import { money, playerActs } from '../../sim/util';
import { $, N, actLink, cityName, dateLabel, genreName, pill, releaseLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { WorldMap, glyphCanvas, type MapCity, type MapOverlay } from '../map';
import { store } from '../store';
import { ic, stat, chips, tabs, tile } from '../vis';
import { select } from '../dom';
import { board } from '../../sim/sys/charts7';
import { fansByCountry, genreHeat, rivalPower } from '../../sim/sys/mapx8';
import { ageBubbles29, ageLayer29, ageLayerColor29, ageLegend29 } from '../sys/demo29'; // R29 demo29: camada Fãs por idade
import { cityActions, cityScene, countryExtra, personalOverlays } from '../sys/mapx8';
import { bubbleNotes, cityTip13, countryPanel13, countryTip13, paintBar, paintLegend, paintNow, paintShadeMap, setPaint } from '../sys/map13';
import { PAINT_INFO, paintAvailable, type Paint } from '../../sim/sys/map13';
import { tagName14 } from '../../sim/sys/polish14';
import { LAYERS17, layerButtons17, layers17Now, legend17, openMapInfo17, overlays17, setLayers17, shade17, type Ly17Id } from '../sys/mapinfo17';

let worldMap: WorldMap | null = null;
let focusCity: string | null = null;
let focusCountry: string | null = null;

type Layer = 'fans' | 'scenes' | 'festivals' | 'rivals' | 'hq' | 'tours' | 'movements' | 'clubs' | 'geo' | 'countryfans' | 'genre' | 'rivalpower' | 'charts' | 'you' | 'agefans';
const LAYERS: { id: Layer; icon: string; name: L }[] = [
  { id: 'fans', icon: 'fans', name: l('Seus fãs', 'Your fans') },
  { id: 'scenes', icon: 'fire', name: l('Cenas', 'Scenes') },
  { id: 'hq', icon: 'house', name: l('Suas sedes', 'Your HQs') },
  { id: 'rivals', icon: 'flag', name: l('Selos rivais', 'Rival labels') },
  { id: 'festivals', icon: 'star', name: l('Festivais', 'Festivals') },
  { id: 'tours', icon: 'tour-bus', name: l('Turnês', 'Tours') },
  { id: 'movements', icon: 'fire', name: l('Movimentos', 'Movements') },
  { id: 'clubs', icon: 'house', name: l('Clubes', 'Clubs') },
  { id: 'geo', icon: 'globe', name: l('Crises e censura', 'Crises and censorship') },
  { id: 'countryfans', icon: 'fans', name: l('Fãs por país', 'Fans by country') },
  { id: 'genre', icon: 'note', name: l('Calor de um gênero', 'Genre heat') },
  { id: 'rivalpower', icon: 'flag', name: l('Força dos rivais', 'Rival strength') },
  { id: 'charts', icon: 'chart-up', name: l('Suas paradas', 'Your charts') },
  { id: 'agefans', icon: 'fans', name: l('Fãs por idade', 'Fans by age') }, // R29 demo29
  { id: 'you', icon: 'star', name: l('Você (casas, viagem, divulgação)', 'You (homes, travel, promo)') },
];
const layers = new Set<Layer>(['fans', 'hq', 'tours', 'you']);
let genreFam = 'rock';

function sceneOf(s: GameState, cityId: string): number {
  let v = 0;
  for (const [k, x] of Object.entries(s.scenes)) if (k.startsWith(cityId + ':')) v += x;
  return v;
}

function fansByCity(s: GameState): Map<string, number> {
  const out = new Map<string, number>();
  const acts = refActs(s).map((id) => s.acts[id]); // r20: artista de referência
  if (!acts.length) return out;
  for (const c of CITIES) {
    let v = 0;
    for (const a of acts) v += cityDemand(s, a, c.id);
    if (v > 0) out.set(c.id, v);
  }
  return out;
}

function festivalsNow(s: GameState) {
  return FESTIVALS.filter((f) => f.start <= s.year);
}

function marketShade(s: GameState): Map<string, { color: string; hatch?: boolean }> {
  const m = new Map<string, { color: string; hatch?: boolean }>();
  if (!layers.has('geo')) return m;
  for (const g of activeGeo(s)) for (const id of g.markets) if (g.liveBlocked) m.set(id, { color: 'var(--bad)', hatch: true });
  for (const c of activeCensorship(s)) if (c.level >= 0.25) for (const id of c.markets) if (!m.has(id)) m.set(id, { color: 'var(--bad)' });
  for (const g of activeGeo(s)) for (const id of g.markets) if (!m.has(id) && g.demand < 0.9) m.set(id, { color: 'var(--warn, #e0a030)' });
  return m;
}

/** Sombreamento por país das camadas novas: paradas (ouro) e fãs por país (laranja, mais forte = mais fãs). */
function countryLayerShade(s: GameState): Map<string, { color: string }> {
  const m = new Map<string, { color: string }>();
  if (layers.has('countryfans')) {
    const f = fansByCountry(s);
    const max = Math.max(1, ...f.values());
    for (const [a3, v] of f) if (v / max > 0.03) m.set(a3, { color: `rgba(200,100,30,${(0.35 + 0.65 * Math.sqrt(v / max)).toFixed(2)})` });
  }
  if (layers.has('agefans')) for (const [a3, x] of ageLayer29(s)) m.set(a3, { color: ageLayerColor29(x.band, x.v) }); // R29 demo29: faixa dominante dos seus fãs no país
  if (layers.has('charts')) {
    const keys = new Set<string>();
    for (const c of CITIES) { const a3 = countryOfCity(c.id); if (a3) keys.add(a3); }
    for (const a3 of keys) {
      const rows = board(s, a3, 'songs');
      const best = rows.find((row) => s.releases[row.relId]?.owner === 'player');
      if (best) m.set(a3, { color: best.pos === 1 ? 'rgba(184,144,28,1)' : best.pos <= 10 ? 'rgba(184,144,28,0.6)' : 'rgba(184,144,28,0.3)' });
    }
  }
  return m;
}

function overlays(s: GameState): MapOverlay[] {
  const o: MapOverlay[] = [];
  const slots = new Map<string, number>();
  const icon = (city: string, ic2: MapOverlay & { kind: 'icon' } extends infer T ? T extends { icon: infer I } ? I : never : never) => {
    const n = slots.get(city) ?? 0;
    slots.set(city, n + 1);
    o.push({ kind: 'icon', city, icon: ic2, slot: n });
  };
  if (layers.has('fans')) {
    const f = fansByCity(s);
    const max = Math.max(1, ...f.values());
    for (const [c, v] of [...f].sort((a, b) => b[1] - a[1]).slice(0, 18)) if (v / max > 0.15) o.push({ kind: 'bubble', city: c, value: v / max, color: 'var(--accent)' });
  }
  if (layers.has('scenes')) {
    const vals = CITIES.map((c) => [c.id, sceneOf(s, c.id)] as const).filter(([, v]) => v > 1);
    const max = Math.max(1, ...vals.map(([, v]) => v));
    for (const [c, v] of vals) o.push({ kind: 'bubble', city: c, value: v / max, color: 'var(--good)' });
  }
  if (layers.has('hq')) {
    icon(s.config.homeCity, 'hq');
    for (const b of s.branches) {
      icon(b.city, 'branch');
      o.push({ kind: 'arc', from: s.config.homeCity, to: b.city, color: 'var(--gold, #b8901c)', dashed: true, width: 1.2 });
    }
  }
  if (layers.has('rivals')) for (const lb of Object.values(s.labels)) if (lb.active) icon(lb.city, 'rival');
  if (layers.has('festivals')) for (const f of festivalsNow(s)) icon(f.city, 'festival');
  if (layers.has('movements')) for (const m of s.movements) if (s.year - m.born < 10) icon(m.city, 'movement');
  if (layers.has('tours')) {
    for (const tr of tourList(s)) {
      const next = tr.stops.filter((x) => x.status !== 'cancelled');
      for (let i = 1; i < next.length; i++) o.push({ kind: 'arc', from: next[i - 1].cityId, to: next[i].cityId, color: next[i].status === 'played' ? 'var(--muted)' : 'var(--accent)', width: 1.8 });
      const cur = next.find((x) => x.status === 'scheduled');
      if (cur) icon(cur.cityId, 'tour');
    }
  }
  if (layers.has('genre')) {
    const heat = genreHeat(s, genreFam);
    const max = Math.max(1, ...heat.values());
    for (const [c, v] of heat) if (v / max > 0.08) o.push({ kind: 'bubble', city: c, value: v / max, color: '#a35bd8' });
  }
  if (layers.has('rivalpower')) {
    const pw = rivalPower(s);
    const max = Math.max(1, ...pw.values());
    for (const [c, v] of pw) o.push({ kind: 'bubble', city: c, value: v / max, color: 'var(--bad)' });
  }
  if (layers.has('you')) personalOverlays(s, (c, g) => icon(c, g), (x) => o.push(x));
  if (layers.has('agefans')) o.push(...ageBubbles29(s)); // R29 demo29
  return o;
}

function mapCities(s: GameState): MapCity[] {
  const movementCities = new Set(s.movements.filter((m) => s.year - m.born < 10).map((m) => m.city));
  const clubCities = new Map<string, number>();
  for (const c of s.clubs) if (!c.closed) clubCities.set(c.city, (clubCities.get(c.city) ?? 0) + 1);
  return CITIES.map((c) => {
    const scene = sceneOf(s, c.id);
    const mine = s.clubs.some((x) => x.city === c.id && x.owner === 'player');
    const own = c.id === s.config.homeCity || s.branches.some((b) => b.city === c.id);
    return {
      id: c.id,
      color: own ? 'var(--gold, #b8901c)' : mine ? 'var(--accent)' : movementCities.has(c.id) ? 'var(--warn, #e0a030)' : scene > 3 ? 'var(--good)' : undefined,
      size: (own ? 1.2 : 0.9) + Math.min(1, scene / 20),
      badge: layers.has('clubs') && clubCities.get(c.id) ? String(clubCities.get(c.id)) : undefined,
      locked: !s.player.territories.includes(c.market) && scene < 1,
    };
  });
}

function tipLine(icon: string, text: string): HTMLElement {
  return h('div', { class: 'wmap-tip-row' }, ic(icon), text);
}

function cityTipExtra(s: GameState, id: string): HTMLElement | null {
  const rows: HTMLElement[] = [];
  const fans = playerActs(s).reduce((t2, a) => t2 + cityDemand(s, s.acts[a], id), 0);
  if (fans) rows.push(tipLine('fans', `${N(fans)} ${t(l('fãs potenciais', 'potential fans'))}`));
  if (id === s.config.homeCity) rows.push(tipLine('house', t(l('Sua matriz', 'Your main HQ'))));
  const br = s.branches.find((b) => b.city === id);
  if (br) rows.push(tipLine('house', `${t(l('Filial', 'Branch'))}: ${t(BRANCH_LEVELS[br.level].name)}`));
  const rivals = Object.values(s.labels).filter((lb) => lb.active && lb.city === id);
  if (rivals.length) rows.push(tipLine('flag', rivals.map((r) => r.name).join(', ')));
  const fest = festivalsNow(s).filter((f) => f.city === id);
  if (fest.length) rows.push(tipLine('star', fest.map((f) => f.name).join(', ')));
  const blk = liveBlocked(s, id);
  if (blk) rows.push(tipLine('lock', t(blk.name)));
  const x13 = cityTip13(s, id, layers, genreFam);
  if (x13) rows.push(x13);
  return rows.length ? h('div', { class: 'wmap-tip-extra' }, rows) : null;
}

function countryTipExtra(s: GameState, a3: string): HTMLElement | null {
  const m = marketOfCountry(a3);
  const geo = activeGeo(s).filter((g) => g.markets.includes(m));
  const cens = activeCensorship(s).filter((c) => c.markets.includes(m));
  const x13 = countryTip13(s, a3);
  const ag = layers.has('agefans') ? ageLayer29(s).get(a3) : undefined; // R29 demo29: fatias por idade dos seus fãs no país
  const agL = ag ? tipLine('fans', ag.mix.map((v, i) => `${['13–17', '18–24', '25–34', '35–49', '50+'][i]} ${Math.round(v * 100)}%`).join(' · ')) : null;
  if (!geo.length && !cens.length && !agL) return x13;
  return h('div', { class: 'wmap-tip-extra' }, [...geo.map((g) => tipLine('globe', t(g.name))), ...cens.map((c) => tipLine('newspaper', t(c.name))), agL, x13]);
}

function layerBar(): HTMLElement {
  return h('div', { class: 'layer-bar', role: 'group', 'aria-label': t(l('Camadas do mapa', 'Map layers')) },
    LAYERS.map((ly) => h('button', {
      type: 'button', class: `chip-btn ${layers.has(ly.id) ? 'on' : ''}`, 'aria-pressed': layers.has(ly.id) ? 'true' : 'false',
      onclick: () => { if (layers.has(ly.id)) layers.delete(ly.id); else layers.add(ly.id); rerender(); },
    }, ic(ly.icon), ' ', t(ly.name))),
    paintBar(store.game!),
    ...layerButtons17(),
    layers.has('genre') ? select(genreFam, FAMILIES.map((f) => ({ value: f.id, label: t(f.name) })), (v) => { genreFam = v; rerender(); }, { 'aria-label': t(l('Gênero da camada', 'Layer genre')) }) : null);
}

function cityCard(s: GameState, cityId: string): HTMLElement {
  const city = cityById[cityId];
  const scenes = Object.entries(s.scenes).filter(([k]) => k.startsWith(city.id + ':')).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const clubs = s.clubs.filter((c) => c.city === city.id && !c.closed);
  const fans = playerActs(s).map((id) => s.acts[id]).map((a) => [a, cityDemand(s, a, cityId)] as const).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const rivals = Object.values(s.labels).filter((lb) => lb.active && lb.city === cityId);
  const fest = festivalsNow(s).filter((f) => f.city === cityId);
  const geo = activeGeo(s).filter((g) => g.markets.includes(city.market));
  const cens = activeCensorship(s).filter((c) => c.markets.includes(city.market) && !geo.some((g) => g.id === c.id));
  const cl = climateAt(cityId, s.month);
  const unit = unitOfCity(cityId, s.year);
  const br = s.branches.find((b) => b.city === cityId);
  const brErr = canOpenBranch(s, cityId);
  const mkt = MARKETS.find((m) => m.id === city.market)!;
  return h('div', { class: 'city-card' },
    h('div', { class: 'row between' },
      h('h4', null, ic('globe'), ' ', t(city.name)),
      h('button', { class: 'btn small ghost', 'aria-label': t(l('Fechar', 'Close')), onclick: () => { focusCity = null; rerender(); } }, '×')),
    h('div', { class: 'muted small' }, [...new Set([unit ? t(unit.name) : '', t(mkt.name)].filter(Boolean))].join(' · ') + ` · ${t(cl.name)} ${Math.round(cl.tempC)} °C`),
    chips(
      stat('fans', N(fans.reduce((t2, [, v]) => t2 + v, 0)), l('Seus fãs potenciais', 'Your potential fans')),
      stat('fire', sceneOf(s, cityId).toFixed(1), l('Força da cena', 'Scene strength')),
      s.player.territories.includes(city.market) ? pill(t(l('mercado aberto', 'market open')), 'good') : pill(t(l('sem distribuição', 'no distribution')), 'warn'),
      cityId === s.config.homeCity ? pill(t(l('sua matriz', 'your main HQ')), 'good') : null,
      br ? pill(`${t(l('filial', 'branch'))}: ${t(BRANCH_LEVELS[br.level].name)}`, 'good') : null,
    ),
    fans.length ? h('div', { class: 'bars' }, fans.map(([a, v]) => h('div', { class: 'bar-row' }, actLink(s, a.id), h('div', { class: 'bar' }, h('i', { style: `width:${Math.round((v / fans[0][1]) * 100)}%` })), h('small', null, N(v))))) : null,
    cityActions(s, cityId),
    cityScene(s, cityId),
    scenes.length ? h('div', null, h('small', { class: 'muted' }, t(l('Cenas', 'Scenes'))), chips(...scenes.map(([k, v]) => stat('fire', v.toFixed(1), genreName(k.split(':')[1]))), ...scenes.slice(0, 4).map(([k]) => pill(genreName(k.split(':')[1]))))) : null,
    fest.length ? h('div', null, h('small', { class: 'muted' }, t(l('Festivais', 'Festivals'))), h('ul', { class: 'small' }, fest.map((f) => h('li', null, ic('star'), ` ${f.name}${f.realRef ? ` (≈ ${f.realRef})` : ''} · ${t(l('prestígio', 'prestige'))} ${f.prestige}`)))) : null,
    rivals.length ? h('div', null, h('small', { class: 'muted' }, t(l('Selos rivais com sede aqui', 'Rival labels based here'))), h('ul', { class: 'small' }, rivals.map((r) => h('li', null, ic('flag'), ` ${r.name} · ${r.roster.length} ${t(l('artistas', 'acts'))}`)))) : null,
    geo.length || cens.length ? h('div', null, h('small', { class: 'muted' }, t(l('Contexto político', 'Political context'))), h('ul', { class: 'small' },
      geo.map((g) => h('li', null, ic(g.liveBlocked ? 'lock' : 'globe'), ` ${t(g.name)} — ${geoLine(s, g)}`)),
      cens.map((c) => h('li', null, ic('newspaper'), ` ${t(c.name)} — ${t(l('visados', 'targeted'))}: ${c.banned.map((x) => t(tagName14(x))).join(', ')}`)))) : null,
    clubs.length ? h('div', { class: 'cards' }, clubs.map((c) => tile('house', c.name, [
      h('small', null, `${genreName(c.genre)} · ${N(c.capacity)} ${t(l('lugares', 'capacity'))} · ${t(l('prestígio', 'prestige'))} ${Math.round(c.prestige)}`),
      c.owner === 'player' ? pill(t(l('seu clube', 'your club')), 'good') : h('button', { class: 'btn small', onclick: () => { const e = buyClub(s, c.id); toast(e ? t(e) : t(l('Clube comprado!', 'Club bought!')), e ? 'bad' : 'good'); rerender(); } }, `${t(l('Comprar', 'Buy'))} ~${$(money(s, 15000 + c.capacity * 40 + c.prestige * 500))}`),
    ]))) : h('p', { class: 'muted small' }, t(l('Sem clubes ativos aqui.', 'No active clubs here.'))),
    !br && cityId !== s.config.homeCity ? h('div', { class: 'row' },
      h('button', { class: 'btn small primary', disabled: !!brErr, title: brErr ? t(brErr) : '', onclick: () => { const e = openBranch(s, cityId); toast(e ? t(e) : t(l('Filial aberta!', 'Branch opened!')), e ? 'bad' : 'good'); rerender(); } },
        ic('house'), ` ${t(l('Abrir filial aqui', 'Open a branch here'))} (${$(money(s, BRANCH_LEVELS[0].cost))})`),
      brErr ? h('small', { class: 'muted' }, t(brErr)) : null) : null,
  );
}

function geoLine(s: GameState, g: ReturnType<typeof activeGeo>[number]): string {
  const cr = activeCensorship(s).find((c) => c.id === g.id);
  return [...geoEffects(g).map((e) => t(e)), cr ? `${t(l('visados', 'targeted'))}: ${cr.banned.map((x) => t(tagName14(x))).join(', ')}` : ''].filter(Boolean).join(' · ');
}

function countryCard(s: GameState, a3: string): HTMLElement {
  const unit = unitOfCountry(a3, s.year);
  const m = marketOfCountry(a3);
  const mkt = MARKETS.find((x) => x.id === m)!;
  const cities = CITIES.filter((c) => countryOfCity(c.id) === a3);
  const geo = activeGeo(s).filter((g) => g.markets.includes(m));
  const cens = activeCensorship(s).filter((c) => c.markets.includes(m) && !geo.some((g) => g.id === c.id));
  const blocName: Record<string, L> = { west: l('Bloco ocidental', 'Western bloc'), east: l('Bloco socialista', 'Eastern bloc'), nonaligned: l('Não alinhado', 'Non-aligned') };
  return h('div', { class: 'city-card' },
    h('div', { class: 'row between' },
      h('h4', null, ic('flag'), ' ', t(unit.name)),
      h('button', { class: 'btn small ghost', 'aria-label': t(l('Fechar', 'Close')), onclick: () => { focusCountry = null; rerender(); } }, '×')),
    h('div', { class: 'muted small' }, [t(countryName(a3)), unit.bloc ? t(blocName[unit.bloc]) : '', t(mkt.name)].filter(Boolean).join(' · ')),
    chips(s.player.territories.includes(m) ? pill(t(l('mercado aberto', 'market open')), 'good') : pill(t(l('sem distribuição', 'no distribution')), 'warn')),
    countryExtra(s, a3),
    countryPanel13(s, a3),
    geo.length || cens.length ? h('ul', { class: 'small' },
      geo.map((g) => h('li', null, ic(g.liveBlocked ? 'lock' : 'globe'), ' ', h('b', null, t(g.name)), ` (${t(l('desde', 'since'))} ${g.from}) — ${geoLine(s, g)}`)),
      cens.map((c) => h('li', null, ic('newspaper'), ' ', h('b', null, t(c.name)), ` (${t(l('desde', 'since'))} ${c.from}) — ${t(l('visados', 'targeted'))}: ${c.banned.map((x) => t(tagName14(x))).join(', ')}`))) : h('p', { class: 'muted small' }, t(l('Sem crises ou censura ativas.', 'No active crises or censorship.'))),
    cities.length ? h('div', { class: 'row wrap' }, cities.map((c) => h('button', { class: 'btn small ghost', onclick: () => { focusCity = c.id; focusCountry = null; rerender(); } }, t(c.name)))) : null,
  );
}

function mapSection(s: GameState): HTMLElement {
  void focusCountry; // r17: a ficha do país agora abre no popup
  const shade = marketShade(s);
  const cshade = countryLayerShade(s);
  const pshade = paintShadeMap(s);
  const opts = {
    getYear: () => store.game?.year ?? s.year,
    getMonth: () => store.game?.month ?? s.month,
    cities: () => mapCities(s),
    selected: focusCity ? [focusCity] : [],
    mode: 'scenes' as const,
    // r17: clicar abre o popup com tudo sobre o lugar (a ficha antiga vai no topo do popup)
    onCityClick: (id: string) => { focusCity = id; focusCountry = null; rerender(); openMapInfo17(s, 'city', id, () => cityById[id] ? cityCard(s, id) : null); },
    onCountryClick: (a3: string) => { focusCountry = a3; focusCity = null; rerender(); openMapInfo17(s, 'country', a3, () => countryCard(s, a3)); },
    overlays: () => [...overlays(s), ...overlays17(s)],
    countryShade: (a3: string) => shade17(s, a3) ?? shade.get(marketOfCountry(a3)) ?? pshade.get(a3) ?? cshade.get(a3),
    cityTipExtra: (id: string) => cityTipExtra(s, id),
    countryTipExtra: (a3: string) => countryTipExtra(s, a3),
    legendExtra: () => [
      ...legend17(),
      ...paintLegend(s),
      ...bubbleNotes(s, layers, genreFam),
      layers.has('fans') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: 'background-color:var(--accent)' }), t(l('Bolha: seus fãs', 'Bubble: your fans'))) : null,
      layers.has('geo') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw hatch', style: 'background-color:var(--bad)' }), t(l('Shows suspensos', 'Shows suspended'))) : null,
      layers.has('geo') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw', style: 'background-color:var(--bad);opacity:.5' }), t(l('Censura forte', 'Heavy censorship'))) : null,
      layers.has('geo') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw', style: 'background-color:var(--warn, #e0a030);opacity:.5' }), t(l('Crise econômica', 'Economic crisis'))) : null,
      layers.has('countryfans') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw', style: 'background-color:rgb(200,100,30);opacity:.5' }), t(l('País: seus fãs', 'Country: your fans'))) : null,
      layers.has('charts') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw', style: 'background-color:rgb(184,144,28);opacity:.5' }), t(l('País: você nas paradas', 'Country: you on the charts'))) : null,
      ...(layers.has('agefans') ? ageLegend29() : []),
      layers.has('genre') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: 'background-color:#a35bd8' }), t(l('Bolha: calor do gênero', 'Bubble: genre heat'))) : null,
      layers.has('rivalpower') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: 'background-color:var(--bad)' }), t(l('Bolha: força dos rivais', 'Bubble: rival strength'))) : null,
      ...(['hq', 'branch', 'rival', 'festival', 'tour', 'movement', 'home', 'you', 'promo', 'scout'] as const).map((g) => h('span', { class: 'wmap-key' }, glyphCanvas(g, 1), t(GLYPH_NAMES[g]))),
    ].filter(Boolean) as HTMLElement[],
  };
  if (!worldMap) worldMap = new WorldMap(opts);
  else worldMap.update(opts);
  return section(t(l('Mapa do mundo', 'World map')), presetBar20(s), legend20(s),
    h('details', { class: 'layers20', open: preset20 ? undefined : true }, h('summary', { class: 'small' }, t(l('Todas as camadas (especialista)', 'All layers (expert)'))), layerBar()),
    worldMap.element,
    h('p', { class: 'muted small' }, t(l('Clique numa cidade ou num país para abrir o popup com tudo sobre o lugar (mercado, cenas, artistas, casas, imprensa, crime, leis, tendências, relíquias, notícias).', 'Click a city or a country to open a popup with everything about the place (market, scenes, acts, venues, press, crime, laws, trends, relics, news).'))),
  );
}

const GLYPH_NAMES: Record<'hq' | 'branch' | 'rival' | 'festival' | 'tour' | 'movement' | 'home' | 'you' | 'promo' | 'scout', L> = {
  home: l('Sua casa', 'Your home'), you: l('Você está aqui', 'You are here'), promo: l('Divulgação', 'Promo'), scout: l('Olheiro avulso', 'Freelance scout'),
  hq: l('Matriz', 'Main HQ'), branch: l('Filial', 'Branch'), rival: l('Selo rival', 'Rival label'), festival: l('Festival', 'Festival'), tour: l('Turnê', 'Tour'), movement: l('Movimento', 'Movement'),
};

function geoSection(s: GameState): HTMLElement {
  const geo = activeGeo(s);
  const cens = activeCensorship(s);
  const mk = (ids: string[]) => ids.map((m) => t(MARKETS.find((x) => x.id === m)!.name)).join(', ');
  return section(t(l('Geopolítica e censura', 'Geopolitics and censorship')),
    geo.length || cens.length ? h('div', { class: 'cards' },
      geo.map((g) => tile(g.liveBlocked ? 'lock' : 'globe', t(g.name), [
        h('small', null, t(g.note)),
        h('div', { class: 'chips' }, geoEffects(g).map((e) => pill(t(e), 'warn'))),
        h('small', { class: 'muted' }, `${t(l('Desde', 'Since'))} ${g.from} · ${mk(g.markets)}`)], { cls: 'warn' })),
      cens.map((c) => tile('newspaper', t(c.name), [
        h('small', null, t(l('Gêneros/temas visados: ', 'Targeted genres/themes: ')), c.banned.map((x) => t(tagName14(x))).join(', ')),
        h('div', { class: 'chips' }, pill(`${t(l('Risco de veto', 'Ban risk'))} ${Math.round(c.level * 100)}%`, 'bad')),
        h('small', { class: 'muted' }, `${t(l('Desde', 'Since'))} ${c.from} · ${mk(c.markets)}`)], { cls: 'bad' })),
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
    h('aside', { class: 'col-side' }, placePanel20(s), geoSection(s), recordsSection(s), hallSection(s)),
  );
}

// ---------------------------------------------------------------- r20: perguntas, referência, legenda e lugar

/** Presets de tarefa: cada pergunta liga um conjunto de camadas existentes (o especialista continua com todos os botões). */
export type Preset20 = 'audience' | 'expand' | 'opps' | 'risk';
export const PRESETS20: { id: Preset20; icon: string; name: L; layers: Layer[]; l17: Ly17Id[]; paint: Paint }[] = [
  { id: 'audience', icon: 'fans', name: l('Onde tenho público?', 'Where is my audience?'), layers: ['fans', 'countryfans', 'hq'], l17: ['tour17'], paint: 'none' },
  { id: 'expand', icon: 'globe', name: l('Onde expandir?', 'Where to expand?'), layers: ['hq', 'rivals', 'scenes'], l17: [], paint: 'market' },
  { id: 'opps', icon: 'star', name: l('Onde há oportunidades?', 'Where are the opportunities?'), layers: ['scenes', 'festivals', 'movements', 'clubs'], l17: [], paint: 'growth' },
  { id: 'risk', icon: 'warning', name: l('Que risco afeta minha operação?', 'What risk affects my operation?'), layers: ['geo', 'rivalpower', 'tours'], l17: ['clash17', 'heat17'], paint: 'rivaldom' },
];
let preset20: Preset20 | null = null;
/** Artista de referência das camadas de público ('' = elenco inteiro). */
let refAct20 = '';

export function applyPreset20(s: GameState, id: Preset20 | null): void {
  preset20 = id;
  layers.clear();
  const p = PRESETS20.find((x) => x.id === id);
  if (!p) { setLayers17([]); setPaint('none'); return; }
  for (const x of p.layers) layers.add(x);
  setLayers17(p.l17);
  setPaint(paintAvailable(s, p.paint) ? p.paint : 'none');
}
export const activeLayers20 = (): string[] => [...layers];

function refActs(s: GameState): string[] {
  const ids = playerActs(s);
  return refAct20 && ids.includes(refAct20) ? [refAct20] : ids;
}

function presetBar20(s: GameState): HTMLElement {
  const on = [...LAYERS.filter((x) => layers.has(x.id)).map((x) => t(x.name)), ...LAYERS17.filter((x) => layers17Now().includes(x.id)).map((x) => t(x.name)), paintNow() !== 'none' ? t(PAINT_INFO[paintNow()].name) : ''].filter(Boolean);
  const ids = playerActs(s);
  return h('div', { class: 'presets20-box' },
    h('div', { class: 'presets20', role: 'group', 'aria-label': t(l('Perguntas do mapa', 'Map questions')) },
      PRESETS20.map((p) => h('button', { type: 'button', class: `chip-btn ${preset20 === p.id ? 'on' : ''}`, 'aria-pressed': preset20 === p.id ? 'true' : 'false', onclick: () => { applyPreset20(s, preset20 === p.id ? null : p.id); rerender(); } }, ic(p.icon), ' ', t(p.name)))),
    h('div', { class: 'row wrap small' },
      h('label', null, t(l('Artista de referência', 'Reference act')), ' ',
        select(refAct20, [{ value: '', label: t(l('Todo o elenco', 'Whole roster')) }, ...ids.map((id) => ({ value: id, label: s.acts[id].name }))], (v) => { refAct20 = v; if (v) store.selectedAct = v; rerender(); }, { 'aria-label': t(l('Artista de referência', 'Reference act')) })),
      h('span', { class: 'muted' }, ` · ${t(l('Período', 'Period'))}: ${dateLabel(s)}`)),
    h('div', { class: 'row wrap small' },
      h('span', null, h('b', null, t(l('Ativas', 'Active')), ': '), on.length ? on.join(' · ') : t(l('nenhuma camada', 'no layers'))),
      on.length ? h('button', { class: 'btn small ghost', onclick: () => { applyPreset20(s, null); rerender(); } }, t(l('Limpar', 'Clear'))) : null));
}

/** Legenda com unidade, escala, data e confiança (observado × estimado). */
function legend20(s: GameState): HTMLElement | null {
  const when = `${dateLabel(s)}`;
  const ref = refAct20 && s.acts[refAct20] ? s.acts[refAct20].name : t(l('todo o elenco', 'whole roster'));
  const est = t(l('estimado', 'estimated'));
  const obs = t(l('observado', 'observed'));
  const rows: [string, L, string][] = [];
  if (layers.has('fans')) rows.push([est, l(`Bolha laranja = fãs potenciais por cidade (${ref}). Unidade: pessoas; escala: relativa ao maior valor do mapa. Derivado da base global do artista (núcleo, ativos, casuais) × fatia da cidade — não é uma contagem local persistida.`, `Orange bubble = potential fans per city (${ref}). Unit: people; scale: relative to the map's largest value. Derived from the act's global base (core, active, casual) × city share — not a persisted local count.`), when]);
  if (layers.has('countryfans')) rows.push([est, l('País laranja = fãs por país (mesma derivação; mais forte = mais fãs).', 'Orange country = fans by country (same derivation; stronger = more fans).'), when]);
  if (layers.has('scenes')) rows.push([obs, l('Bolha verde = força das cenas locais (estado do mundo).', 'Green bubble = local scene strength (world state).'), when]);
  if (layers.has('tours')) rows.push([obs, l('Arcos = rotas das turnês marcadas.', 'Arcs = booked tour routes.'), when]);
  if (layers.has('rivalpower')) rows.push([est, l('Bolha vermelha = força relativa dos rivais na cidade.', 'Red bubble = relative rival strength in the city.'), when]);
  if (layers.has('geo')) rows.push([obs, l('Países vermelhos/amarelos = crises, censura e shows suspensos.', 'Red/yellow countries = crises, censorship and suspended shows.'), when]);
  if (paintNow() !== 'none') rows.push([paintNow() === 'piracy' ? est : obs, l(`Países: ${PAINT_INFO[paintNow()].name.pt} — unidade: ${PAINT_INFO[paintNow()].unit.pt}.`, `Countries: ${PAINT_INFO[paintNow()].name.en} — unit: ${PAINT_INFO[paintNow()].unit.en}.`), when]);
  if (!rows.length) return null;
  return h('div', { class: 'legend20', role: 'note', 'aria-label': t(l('Legenda das camadas', 'Layer legend')) },
    rows.map(([conf, txt, d]) => h('div', null, pill(conf, conf === est ? 'warn' : 'good'), ' ', t(txt), h('small', { class: 'muted' }, ` (${d})`))));
}

/** Painel do lugar + lista textual com busca que compartilha a seleção do mapa. */
function placePanel20(s: GameState): HTMLElement {
  const acts = refActs(s).map((id) => s.acts[id]);
  const rows = CITIES.map((c) => ({ c, v: acts.reduce((x, a) => x + cityDemand(s, a, c.id), 0) })).sort((a, b) => b.v - a.v);
  const list = h('ul', { class: 'drawer20-list' }, rows.map(({ c, v }) => h('li', { 'data-q': `${t(c.name)} ${t(MARKETS.find((m) => m.id === c.market)?.name ?? l('', ''))}`.toLowerCase() },
    h('button', { type: 'button', class: `chip-btn ${focusCity === c.id ? 'on' : ''}`, 'aria-pressed': focusCity === c.id ? 'true' : 'false', onclick: () => { focusCity = c.id; focusCountry = null; rerender(); } }, t(c.name)),
    h('small', { class: 'muted' }, ` ${N(v)} ${t(l('fãs est.', 'est. fans'))}`, s.player.territories.includes(c.market) ? '' : ` · ${t(l('sem distribuição', 'no distribution'))}`))));
  const search = h('input', { type: 'search', class: 'input', placeholder: t(l('Buscar cidade ou mercado…', 'Search city or market…')), 'aria-label': t(l('Buscar lugar', 'Search place')) }) as HTMLInputElement;
  search.oninput = () => { const q = search.value.trim().toLowerCase(); for (const li of Array.from(list.children) as HTMLElement[]) li.hidden = !!q && !(li.dataset.q ?? '').includes(q); };
  const blk = focusCity ? liveBlocked(s, focusCity) : null;
  return section(t(l('Lugar selecionado', 'Selected place')),
    h('div', { class: 'place20' },
      focusCity && cityById[focusCity] ? cityCard(s, focusCity) : h('p', { class: 'muted small' }, t(l('Escolha uma cidade no mapa ou na lista.', 'Pick a city on the map or in the list.'))),
      blk ? h('p', { class: 'small bad' }, ic('lock'), ' ', t(l('Sem shows aqui agora: ', 'No shows here now: ')), t(blk.name), t(l('. Alternativas: cidades vizinhas do mesmo mercado sem bloqueio ou lançar sem turnê.', '. Alternatives: nearby cities in an unblocked market, or release without touring.'))) : null,
      focusCity ? h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => openMapInfo17(s, 'city', focusCity!, () => cityById[focusCity!] ? cityCard(s, focusCity!) : null) }, ic('globe'), ' ', t(l('Tudo sobre o lugar', 'Everything about the place'))),
        h('button', { class: 'btn small ghost', onclick: () => { focusCity = null; rerender(); } }, t(l('Limpar seleção', 'Clear selection')))) : null,
      h('details', { class: 'drawer20' }, h('summary', null, ic('globe'), ' ', t(l('Lista de lugares', 'Place list'))), search, list)));
}
