// Rodada 27 (E1) — telas da seção MUNDO:
//  - "Este mês no mundo" (área `mundo27`, casa da seção): só o que mudou nas últimas semanas, cada item leva à tela certa,
//    e a faixa das eras (passado, agora e o que vem, com o que muda no seu negócio).
//  - Mapa (aba `map27` do Mundo, a primeira): mapa-múndi pixel art (ui/map.ts) com as cidades brilhando pela força da
//    cena e 6 camadas (cenas, gêneros em alta, seus artistas na estrada, festivais, rivais, países fechados); clicar numa
//    cidade abre a ficha (cena, casas, rádios, público, quem domina). A ficha completa antiga (mapinfo17) segue a um clique.
//  - "O que sabemos" (área `known27`): segredos e vínculos (secrets23) + fatos públicos e boatos (facts17), separados.
// Modelos puros em ./mundo27model.ts (testes: tests/r27-mundo.test.ts).

import { ageBubbles29, ageLayer29, ageLayerColor29, ageLegend29 } from './demo29'; // R29 demo29: camada Fãs por idade
import { CITIES, l, type L } from '../../data/world';
import { countryOfCity } from '../../data/geo';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { LVL23 } from '../../sim/sys/secrets23';
import type { Fact } from '../../sim/facts17';
import { FESTIVALS } from '../../data/catalog';
import { N, actLink, cityName, genreName, inspect, labelLink, monthName, pill, rerender } from '../common';
import { h } from '../dom';
import { WorldMap, type MapCity, type MapOverlay } from '../map';
import { registerArea, registerTab } from '../registry';
import { store } from '../store';
import { ic, setTab } from '../vis';
import { openMapInfo17 } from './mapinfo17';
import {
  KIND_INFO27, KINDS27, KNOWN27, LAYERS27, MAPTAB27, MUNDO27, TIER27, citySheet27, closedCountries27, eraTimeline27, hotGenres27, known27, monthlyDigest27, sceneGlow27, sitesByCity27, type Site27,
  sceneStrength27, sceneTier27, type CitySheet27, type DigestItem27, type EraStep27, type Go27, type KnownRow27, type MapLayer27,
} from './mundo27model';
import './mundo27.css';
import { ent27 } from '../ps/ent27'; // r27 (CTX)

const T = (x: L | string): string => (typeof x === 'string' ? x : t(x));
import { a29, placeArt29, venueArt29 } from '../art29ui'; // r29 (arte)
import { cityCrestImg29, skylineThumbImg29 } from '../pixel/geo29';

// ================================================================ navegação

let mapSel: string | null = null;
const layers = new Set<MapLayer27>(['glow', 'tour', 'mine']);
let eraSel: string | null = null;

/** Leva ao destino de um item (área, aba, cidade no mapa, camada, âncora). */
export function go27(x: Go27): void {
  if (x.tab) setTab(x.tab[0], x.tab[1]);
  if (x.city) mapSel = x.city;
  if (x.layer) layers.add(x.layer);
  const scroll = () => { if (x.anchor) document.getElementById(x.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  if ((store as { area: string }).area === x.area) { rerender(); requestAnimationFrame(scroll); return; }
  (store as { area: string }).area = x.area;
  rerender();
  requestAnimationFrame(scroll);
}
const goBtn = (x: Go27, label: L, cls = 'btn small ghost') => h('button', { type: 'button', class: cls, onclick: () => go27(x) }, T(label), ' →');

// ================================================================ 1. Este mês no mundo

function itemRow(s: GameState, it: DigestItem27): HTMLElement {
  return h('li', { class: `mw27-item ${it.mine ? 'mine27' : ''}` },
    h('div', { class: 'mw27-txt' },
      h('span', null, h('b', null, T(it.title)), it.mine ? [' ', pill(T(l('seu', 'yours')), 'mine27')] : null),
      it.text ? h('small', { class: 'muted' }, T(it.text)) : null,
      it.act && s.acts[it.act] && it.kind !== 'chart' ? h('small', null, actLink(s, it.act)) : null),
    h('button', { type: 'button', class: 'btn small mw27-go', 'aria-label': `${T(l('Ver', 'View'))}: ${T(it.title)}`, onclick: () => (it.kind === 'chart' && it.act ? go27(it.go) : it.go.act && !it.go.tab ? inspect.act(it.go.act) : go27(it.go)) }, T(l('Ver', 'View')), ' →'));
}

function digestPage(s: GameState): HTMLElement {
  const d = monthlyDigest27(s);
  const groups = KINDS27.map((k) => ({ k, items: d.items.filter((x) => x.kind === k) })).filter((g) => g.items.length);
  const quick = h('nav', { class: 'mw27-quick', 'aria-label': T(l('Telas do Mundo', 'World screens')) },
    goBtn({ area: 'world', tab: ['worldHub', MAPTAB27] }, l('Mapa', 'Map'), 'btn small'),
    goBtn({ area: 'charts' }, l('Paradas', 'Charts'), 'btn small'),
    goBtn({ area: KNOWN27 }, l('O que sabemos', 'What we know'), 'btn small'),
    goBtn({ area: 'news17' }, l('Imprensa', 'Press'), 'btn small'));
  const body = groups.length
    ? h('div', { class: 'mw27-grid' }, groups.map((g) => {
      const info = KIND_INFO27[g.k];
      const more = (d.counts[g.k] ?? 0) - g.items.length;
      return h('section', { class: `card mw27-card k-${g.k}` },
        h('h3', null, ic(info.icon), ' ', T(info.name), more > 0 ? h('small', { class: 'muted' }, ` +${more}`) : null),
        h('ul', { class: 'mw27-list' }, g.items.map((it) => itemRow(s, it))));
    }))
    : h('div', { class: 'card mw27-empty' },
      ic('hourglass', 2),
      h('div', null,
        h('b', null, T(l('Mês calmo no mundo.', 'A quiet month in the world.'))),
        h('p', { class: 'small' }, T(l('Nada mudou nas últimas 4 semanas: nenhuma estreia forte nas paradas, lei, escândalo ou contratação de rival. Avance uma semana ou um mês — o que mudar aparece aqui, com o atalho para a tela certa. Enquanto isso, veja no mapa onde as cenas estão quentes.',
          'Nothing changed in the last 4 weeks: no big chart debut, law, scandal or rival signing. Advance a week or a month — whatever changes shows up here, with a shortcut to the right screen. Meanwhile, check the map for where scenes are hot.'))),
        h('div', { class: 'row wrap' }, goBtn({ area: 'world', tab: ['worldHub', MAPTAB27], layer: 'glow' }, l('Ver cenas no mapa', 'See scenes on the map'), 'btn small'), goBtn({ area: 'charts' }, l('Paradas', 'Charts')))));
  return h('div', { class: 'page mw27' },
    h('header', { class: 'mw27-head' },
      h('div', null, h('h2', null, T(l('Este mês no mundo', 'This month in the world'))),
        h('p', { class: 'muted small' }, `${monthName(s.month)} ${s.year} · ${T(l('o que mudou nas últimas 4 semanas', 'what changed in the last 4 weeks'))}`)),
      quick),
    body,
    eraStrip(s));
}

// ================================================================ 3. Faixa das eras

const TECH_IC27: Record<string, string> = {
  radio: 'radio', electric_rec: 'mic', disc: 'disc', lp: 'disc', single45: 'turntable', tv_music: 'tv', multitrack: 'mixer', cassette: 'cassette', fm: 'radio',
  synth: 'note', clipnet: 'film', cd: 'cd', daw: 'headphones', internet: 'network', p2p: 'network', download: 'stream', streaming: 'stream', short_video: 'camera',
  hologram: 'hologram', synthetic_voice: 'brain', neural: 'brain',
};
const STATUS27: Record<EraStep27['status'], L> = {
  past: l('chegou', 'arrived'), now: l('chegando agora', 'arriving now'), next: l('próxima', 'next'), soon: l('no horizonte', 'on the horizon'), later: l('mais adiante', 'further ahead'), never: l('não surgiu nesta história', 'never appeared in this history'),
};

function eraStrip(s: GameState): HTMLElement {
  const tl = eraTimeline27(s);
  const sel = tl.steps.find((x) => x.id === eraSel) ?? tl.next ?? tl.steps.filter((x) => x.status === 'past' || x.status === 'now').at(-1) ?? tl.steps[0];
  const nowIdx = tl.steps.findIndex((x) => x.year > s.year);
  const chips: HTMLElement[] = [];
  tl.steps.forEach((x, i) => {
    if (i === nowIdx) chips.push(h('li', { class: 'era27-now', 'aria-label': T(l('Você está aqui', 'You are here')) }, h('span', null, String(s.year)), h('small', null, T(l('hoje', 'today')))));
    chips.push(h('li', null, h('button', { type: 'button', class: `era27-step st-${x.status} ${x === sel ? 'on' : ''}`, 'aria-pressed': x === sel ? 'true' : 'false',
      title: `${T(x.name)} — ${T(STATUS27[x.status])}`, onclick: () => { eraSel = x.id; rerender(); } },
      h('span', { class: 'era27-y' }, x.status === 'never' ? '—' : `${x.status === 'past' || x.status === 'now' ? '' : '~'}${x.year}`), ic(TECH_IC27[x.id] ?? 'clock'), h('span', { class: 'era27-n' }, T(x.name)))));
  });
  if (nowIdx < 0) chips.push(h('li', { class: 'era27-now' }, h('span', null, String(s.year)), h('small', null, T(l('hoje', 'today')))));
  const when = sel.status === 'never' ? T(STATUS27.never)
    : sel.status === 'past' || sel.status === 'now' ? `${T(l('Chegou em', 'Arrived in'))} ${sel.year}`
      : `${T(l('Previsto por volta de', 'Expected around'))} ${sel.year} (${T(l('em', 'in'))} ~${sel.year - s.year} ${T(l('anos', 'years'))})`;
  const list = [...sel.changes, ...sel.formats, ...sel.unlocks];
  const strip = h('ol', { class: 'era27-strip' }, chips);
  // rola a faixa até "hoje" depois de montar
  requestAnimationFrame(() => { const n = strip.querySelector('.era27-now') as HTMLElement | null; if (n && strip.scrollWidth > strip.clientWidth) strip.scrollLeft = Math.max(0, n.offsetLeft - strip.clientWidth / 2); });
  return h('section', { class: 'card era27', id: 'era27' },
    h('h3', null, ic('clock'), ' ', T(l('Linha das eras', 'Era timeline'))),
    h('p', { class: 'muted small' }, T(l('Tecnologias desta história: o que já mudou o negócio e o que vem por aí. Clique numa etapa para ver o que muda para o seu selo.', 'Technologies in this history: what already changed the business and what is coming. Click a step to see what it changes for your label.'))),
    strip,
    h('div', { class: `era27-detail st-${sel.status}`, 'aria-live': 'polite' },
      h('div', { class: 'era27-dh' }, ic(TECH_IC27[sel.id] ?? 'clock', 2), h('div', null, h('b', null, T(sel.name)), h('small', { class: 'muted' }, ` · ${when}`),
        sel.shifted ? h('small', { class: 'muted' }, ` · ${T(l('na história real', 'in real history'))}: ${sel.real}`) : null)),
      h('p', null, T(sel.fx)),
      list.length ? h('ul', { class: 'small' }, list.map((x) => h('li', null, T(x)))) : null));
}

// ================================================================ 2. Mapa pixel art + ficha da cidade

let map27: WorldMap | null = null;

function strengths27(s: GameState): Map<string, number> {
  const m = new Map<string, number>();
  for (const [k, v] of Object.entries(s.scenes)) if (v > 0) { const c = k.slice(0, k.indexOf(':')); m.set(c, (m.get(c) ?? 0) + v); }
  return m;
}
function cities27(s: GameState, closed: ReturnType<typeof closedCountries27>, st: Map<string, number>): MapCity[] {
  const sel = mapSel;
  return CITIES.map((c) => {
    const tier = sceneTier27(st.get(c.id) ?? 0);
    const a3 = countryOfCity(c.id);
    const a3Closed = layers.has('closed') && !!a3 && !!closed.get(a3)?.hard;
    return { id: c.id, color: c.id === s.config.homeCity ? 'var(--accent)' : ['var(--muted)', 'var(--sage)', 'var(--good)', 'var(--gold)'][tier], size: 0.75 + tier * 0.15 + (c.id === sel ? 0.2 : 0), locked: a3Closed };
  });
}

function overlays27(s: GameState): MapOverlay[] {
  const o: MapOverlay[] = [];
  const slots = new Map<string, number>();
  const icon = (city: string, k: 'hq' | 'rival' | 'festival' | 'tour' | 'branch') => { const n = slots.get(city) ?? 0; slots.set(city, n + 1); o.push({ kind: 'icon', city, icon: k, slot: n }); };
  if (layers.has('glow')) for (const [c, v] of sceneGlow27(s)) o.push({ kind: 'glow', city: c, value: v });
  if (layers.has('hot')) for (const [c, v] of hotGenres27(s).heat) if (v > 0.12) o.push({ kind: 'bubble', city: c, value: v, color: '#a35bd8' });
  icon(s.config.homeCity, 'hq');
  // r27 FLOW2: filiais, escritórios e empreendimentos fora da cidade-sede (CITY2 os tirou do mapa do bairro)
  if (layers.has('mine')) for (const c of sitesByCity27(s).keys()) icon(c, 'branch');
  if (layers.has('tour')) {
    const mine = new Set(playerActs(s));
    for (const tr of s.tours) {
      if (!mine.has(tr.actId)) continue;
      const stops = tr.stops.filter((x) => x.status !== 'cancelled');
      for (let i = 1; i < stops.length; i++) o.push({ kind: 'arc', from: stops[i - 1].cityId, to: stops[i].cityId, color: stops[i].status === 'played' ? 'var(--muted)' : 'var(--accent)', width: 1.8 });
      const cur = stops.find((x) => x.status === 'scheduled');
      if (cur) icon(cur.cityId, 'tour');
    }
  }
  if (layers.has('festivals')) for (const c of new Set(FESTIVALS.filter((f) => f.start <= s.year).map((f) => f.city))) icon(c, 'festival');
  if (layers.has('rivals')) {
    const pw = new Map<string, number>();
    for (const lb of Object.values(s.labels)) if (lb.active) pw.set(lb.city, (pw.get(lb.city) ?? 0) + lb.roster.length + lb.reputation / 20);
    const max = Math.max(1, ...pw.values());
    for (const [c, v] of [...pw].sort((a, b) => b[1] - a[1]).slice(0, 14)) { icon(c, 'rival'); o.push({ kind: 'bubble', city: c, value: (v / max) * 0.5, color: 'var(--bad)' }); }
  }
  return o;
}

const block = (icon: string, title: L, ...body: (HTMLElement | string | null | false)[]): HTMLElement =>
  h('div', { class: 'sheet27-blk' }, h('h4', null, ic(icon), ' ', T(title)), ...body.filter((x): x is HTMLElement | string => !!x));
const none = (x: L) => h('p', { class: 'small muted' }, T(x));

/** r27 FLOW2: a "janela" do marcador — seus lugares nesta cidade (tipo, nível, equipe, artistas) com a ação de abrir a página. */
function sitesBlock27(xs: Site27[]): HTMLElement | null {
  if (!xs.length) return null;
  return h('div', { class: 'sheet27-blk sites27', 'data-sites27': String(xs.length) }, h('h4', null, ic('building'), ' ', T(l('Seus lugares aqui', 'Your places here'))),
    h('ul', { class: 'small sites27-list' }, xs.map((x) => h('li', null,
      h('div', null, h('b', null, x.name), ' ', pill(T(x.kindName), 'mine27')),
      h('div', { class: 'row between' },
        h('small', { class: 'muted' }, [`${T(l('nível', 'level'))} ${x.lvl}`, x.staff !== undefined ? `${T(l('equipe', 'staff'))} ${x.staff}` : '', x.acts !== undefined ? `${T(l('artistas', 'acts'))} ${x.acts}` : ''].filter(Boolean).join(' · ')),
        h('button', { type: 'button', class: 'btn tiny', 'aria-label': `${T(l('Abrir', 'Open'))}: ${x.name}`, onclick: () => go27(x.go) }, T(l('Abrir', 'Open')), ' →'))))));
}

function sheet27(s: GameState, c: CitySheet27): HTMLElement {
  const sc = c.scene;
  const tierCls = ['', '', 'good', 'gold'][sc.tier];
  return h('aside', { class: 'card sheet27', 'aria-label': `${T(l('Ficha da cidade', 'City sheet'))}: ${T(c.name)}` },
    h('header', { class: 'sheet27-h' },
      h('div', null, h('h3', null, a29(cityCrestImg29(c.id, 20)), T(c.name)), h('small', { class: 'muted' }, `${T(c.country)}${c.market ? ` · ${T(c.market)}` : ''}`)),
      h('button', { type: 'button', class: 'btn tiny ghost', 'aria-label': T(l('Fechar ficha', 'Close sheet')), onclick: () => { mapSel = null; rerender(); } }, '✕')),
    (() => { const i = skylineThumbImg29(c.id, s.year, 240); i.style.display = 'block'; i.style.width = '100%'; i.style.height = 'auto'; return i; })(), // r29: horizonte da cidade
    c.closed.length ? h('div', { class: 'chips' }, c.closed.map((x) => pill(T(x), 'bad'))) : null,
    sitesBlock27(sitesByCity27(s).get(c.id) ?? []),
    block('fire', l('Cena', 'Scene'),
      h('div', { class: 'row wrap' }, pill(`${T(l('Cena', 'Scene'))}: ${T(TIER27[sc.tier])}`, tierCls), h('span', { class: `sheet27-meter t${sc.tier}`, role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '3', 'aria-valuenow': String(sc.tier), 'aria-label': T(l('Força da cena', 'Scene strength')) }, [0, 1, 2].map((i) => h('i', { class: i < sc.tier ? 'on' : '' })))),
      sc.genres.length ? h('ul', { class: 'small' }, sc.genres.map((g) => h('li', null, genreName(g.id), ` ${g.v.toFixed(1)}`, g.hot ? [' ', pill(T(l('em alta', 'hot')), 'warn')] : null))) : none(l('Nenhuma cena forte agora.', 'No strong scene right now.')),
      sc.native.length ? h('p', { class: 'small muted' }, `${T(l('Da terra', 'Native'))}: ${sc.native.map(genreName).join(', ')}`) : null,
      sc.movements.length ? h('p', { class: 'small' }, `${T(l('Movimentos', 'Movements'))}: ${sc.movements.map(T).join(' · ')}`) : null),
    block('house', l('Casas de show', 'Venues'),
      c.venues.length ? h('ul', { class: 'small' }, c.venues.map((v) => h('li', null, venueArt29(v.name, v.name, v.cap, s.year, c.id, 20), h('b', null, v.name), ` · ${N(v.cap)} ${T(l('lugares', 'seats'))}`, v.mine ? [' ', pill(T(l('sua', 'yours')), 'good')] : null))) : none(l('Sem casas famosas registradas.', 'No famous venues on record.'))),
    block('radio', l('Rádios e TV', 'Radio and TV'),
      c.radios.length ? h('ul', { class: 'small' }, c.radios.map((r) => h('li', null, placeArt29(r.kind === 'tv' ? 'tv' : 'radio', r.name, r.name, s.year, c.id, 20), `${r.name} · ${T(l('alcance', 'reach'))} ${Math.round(r.reach)}`))) : none(l('Nenhuma emissora de peso neste mercado.', 'No major broadcaster in this market.'))),
    block('fans', l('Público', 'Audience'),
      h('div', { class: 'chips' },
        c.audience.popM ? pill(`${T(l('País', 'Country'))}: ${N(Math.round(c.audience.popM))} mi`) : null,
        c.audience.marketM ? pill(`${T(l('Mercado de música', 'Music market'))} ${c.audience.marketM.toFixed(1)} M`) : null,
        pill(`${T(l('Seus fãs potenciais', 'Your potential fans'))}: ${N(c.audience.yourFans)}`, c.audience.yourFans > 0 ? 'good' : ''),
        pill(T(c.audience.distributes ? l('você distribui aqui', 'you distribute here') : l('sem distribuição', 'no distribution')), c.audience.distributes ? 'good' : 'warn'))),
    block('crown', l('Quem domina', 'Who rules'),
      c.dominates.label ? h('p', { class: 'small' }, c.dominates.label.player ? h('b', { class: 'mine' }, c.dominates.label.name) : labelLink(s, c.dominates.label.id), ` — ${Math.round(c.dominates.label.share * 100)}% ${T(l('da fama dos artistas daqui', 'of local acts\' fame'))}`) : none(l('Ninguém: os artistas daqui são independentes.', 'Nobody: local acts are independent.')),
      c.dominates.act ? h('p', { class: 'small' }, `${T(l('Maior nome', 'Biggest name'))}: `, actLink(s, c.dominates.act.id), c.dominates.act.mine ? [' ', pill(T(l('seu', 'yours')), 'mine27')] : null) : null,
      h('p', { class: 'small muted' }, `${N(c.dominates.acts)} ${T(l('artistas da cidade', 'acts from here'))} · ${c.dominates.onChart} ${T(l('nas paradas', 'on the charts'))}`)),
    c.festivals.length ? block('star', l('Festivais', 'Festivals'), h('p', { class: 'small' }, c.festivals.join(' · '))) : null,
    h('div', { class: 'row wrap sheet27-act' },
      h('button', { type: 'button', class: 'btn small', onclick: () => openMapInfo17(s, 'city', c.id) }, ic('eye'), ' ', T(l('Tudo sobre a cidade', 'Everything about this city')))));
}

function hintSheet(s: GameState): HTMLElement {
  const top = CITIES.map((c) => [c.id, sceneStrength27(s, c.id)] as const).sort((a, b) => b[1] - a[1]).slice(0, 6).filter(([, v]) => v > 0);
  const hot = hotGenres27(s).genres;
  return h('aside', { class: 'card sheet27 sheet27-hint' },
    h('h3', null, T(l('Clique numa cidade', 'Click a city'))),
    h('p', { class: 'small muted' }, T(l('Cidades brilham pela força da cena musical. A ficha mostra cena, casas, rádios, público e quem domina.', 'Cities glow by the strength of their music scene. The sheet shows scene, venues, radios, audience and who rules.'))),
    top.length ? h('div', null, h('h4', null, ic('sparkle'), ' ', T(l('Cenas mais fortes', 'Strongest scenes'))),
      h('ol', { class: 'small' }, top.map(([id, v]) => h('li', null, h('button', { type: 'button', class: 'link', ...ent27('city', id), onclick: () => { mapSel = id; rerender(); } }, cityName(id)), ` · ${T(TIER27[sceneTier27(v)])}`)))) : null,
    hot.length ? h('p', { class: 'small' }, ic('fire'), ` ${T(l('Em alta', 'Hot'))}: ${hot.map(genreName).join(', ')}`) : null,
    ((m) => m.size ? h('div', null, h('h4', null, ic('building'), ' ', T(l('Seus lugares fora da sede', 'Your places away from HQ'))),
      h('ul', { class: 'small' }, [...m].map(([id, xs]) => h('li', null, h('button', { type: 'button', class: 'link', ...ent27('city', id), onclick: () => { mapSel = id; layers.add('mine'); rerender(); } }, cityName(id)), ` · ${xs.map((x) => T(x.kindName)).join(', ')}`)))) : null)(sitesByCity27(s)));
}

function mapTab(s: GameState): HTMLElement {
  const closed = layers.has('closed') ? closedCountries27(s) : new Map<string, ReturnType<typeof closedCountries27> extends Map<string, infer V> ? V : never>();
  const st = strengths27(s);
  const cities = cities27(s, closed, st);
  const ov = layers.has('agefans') ? [...overlays27(s), ...ageBubbles29(s)] : overlays27(s); // R29 demo29: bolhas por idade
  const sites = sitesByCity27(s);
  const ages = layers.has('agefans') ? ageLayer29(s) : null; // R29 demo29: faixa dominante dos seus fãs por país
  const opts = {
    getYear: () => store.game?.year ?? s.year,
    getMonth: () => store.game?.month ?? s.month,
    cities: () => cities,
    selected: mapSel ? [mapSel] : [],
    mode: 'scenes' as const,
    onCityClick: (id: string) => { mapSel = id; rerender(); },
    onCountryClick: (a3: string) => openMapInfo17(s, 'country', a3),
    overlays: () => ov,
    countryShade: (a3: string) => { const c = closed.get(a3); if (!c && ages) { const x = ages.get(a3); if (x) return { color: ageLayerColor29(x.band, x.v) }; } return c ? (c.hard ? { color: 'var(--bad)', hatch: true } : { color: 'rgba(238,143,132,0.45)' }) : undefined; },
    cityTipExtra: (id: string) => { const v = st.get(id) ?? 0; const mine = layers.has('mine') ? sites.get(id) ?? [] : []; return h('div', { class: 'small' }, `${T(l('Cena', 'Scene'))}: ${T(TIER27[sceneTier27(v)])}`, mine.length ? h('div', { class: 'mine27' }, ic('building'), ` ${mine.map((x) => `${x.name} (${T(x.kindName)})`).join(' · ')}`) : null); },
    countryTipExtra: (a3: string) => { const c = closed.get(a3); const x = ages?.get(a3); return c ? h('div', { class: 'small bad' }, ic('lock'), ' ', T(c.why)) : x ? h('div', { class: 'small' }, ic('fans'), ' ', x.mix.map((v, i) => `${['13–17', '18–24', '25–34', '35–49', '50+'][i]} ${Math.round(v * 100)}%`).join(' · ')) : null; },
    legendExtra: () => [
      h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: 'background-color:var(--gold)' }), T(l('Brilho: força da cena', 'Glow: scene strength'))),
      layers.has('mine') && sites.size ? h('span', { class: 'wmap-key' }, ic('building'), ' ', T(l('Seus lugares fora da sede', 'Your places away from HQ'))) : null,
      layers.has('hot') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: 'background-color:#a35bd8' }), T(l('Gêneros em alta', 'Hot genres'))) : null,
      layers.has('rivals') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw dot', style: 'background-color:var(--bad)' }), T(l('Força dos rivais', 'Rival strength'))) : null,
      layers.has('closed') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw hatch', style: 'background-color:var(--bad)' }), T(l('Fechado (guerra, bloco, shows proibidos)', 'Closed (war, bloc, shows banned)'))) : null,
      layers.has('closed') ? h('span', { class: 'wmap-key' }, h('i', { class: 'sw', style: 'background-color:rgba(238,143,132,0.45)' }), T(l('Censura forte', 'Heavy censorship'))) : null,
      ...(ages ? ageLegend29() : []),
    ].filter(Boolean) as HTMLElement[],
  };
  if (!map27) map27 = new WorldMap(opts);
  else map27.update(opts);
  const sheet = mapSel ? citySheet27(s, mapSel) : null;
  const hot = layers.has('hot') ? hotGenres27(s).genres : [];
  return h('div', { class: 'map27' },
    h('div', { class: 'map27-bar', role: 'group', 'aria-label': T(l('Camadas do mapa', 'Map layers')) },
      LAYERS27.map((x) => h('button', { type: 'button', class: `chip-btn ${layers.has(x.id) ? 'on' : ''}`, 'aria-pressed': layers.has(x.id) ? 'true' : 'false',
        onclick: () => { if (layers.has(x.id)) layers.delete(x.id); else layers.add(x.id); rerender(); } }, ic(x.icon), ' ', T(x.name)))),
    hot.length ? h('p', { class: 'small muted map27-note' }, ic('fire'), ` ${T(l('Em alta nas paradas', 'Hot on the charts'))}: ${hot.map(genreName).join(', ')}`) : null,
    layers.has('closed') && closed.size ? h('p', { class: 'small muted map27-note' }, ic('lock'), ` ${closed.size} ${T(l('países fechados ou sob censura forte agora', 'countries closed or under heavy censorship now'))}`) : null,
    h('div', { class: 'map27-body' }, h('div', { class: 'map27-map' }, map27.element), sheet ? sheet27(s, sheet) : hintSheet(s)));
}

// ================================================================ 4. O que sabemos

const LV_CLS27 = ['', 'muted', 'warn', 'bad', 'bad'];
function knownRow(s: GameState, r: KnownRow27): HTMLElement {
  const who = r.act ? actLink(s, r.act) : r.label && s.labels[r.label] ? labelLink(s, r.label) : h('b', null, r.name);
  return h('li', { class: `kn27-row ${r.mine ? 'mine27' : ''}` },
    h('div', null, who, ' ', h('span', null, T(r.kind))),
    h('div', { class: 'chips' }, pill(T(LVL23[r.lv]), LV_CLS27[r.lv]), r.press >= 2 ? pill(`${T(l('imprensa', 'press'))}: ${T(LVL23[r.press])}`, r.press >= 4 ? 'bad' : 'warn') : null, r.mine ? pill(T(l('seu elenco', 'your roster')), 'mine27') : null),
    r.src ? h('small', { class: 'muted' }, `${T(l('Fonte', 'Source'))}: ${T(r.src)}`) : null);
}
const factRow = (f: Fact) => h('li', { class: 'kn27-row' }, h('small', { class: 'muted' }, `${monthName(f.m)} ${f.y}`), h('span', null, T(f.text)));

function knownPage(s: GameState): HTMLElement {
  const k = known27(s);
  const col = (icon: string, title: L, blurb: L, cls: string, rows: HTMLElement[], empty: L) =>
    h('section', { class: `card kn27-col ${cls}` }, h('h3', null, ic(icon), ' ', T(title), h('small', { class: 'muted' }, ` ${rows.length}`)),
      h('p', { class: 'small muted' }, T(blurb)), rows.length ? h('ul', { class: 'kn27-list' }, rows) : none(empty));
  return h('div', { class: 'page kn27' },
    h('header', { class: 'mw27-head' }, h('div', null, h('h2', null, T(l('O que sabemos', 'What we know'))),
      h('p', { class: 'muted small' }, T(l('Segredos, boatos e fatos do mundo da música — separados pelo quanto são certos. A imprensa, um detetive ou gente próxima fazem um boato subir de nível.', 'Secrets, rumors and facts from the music world — split by how certain they are. The press, a detective or people close by move a rumor up a level.'))))),
    h('div', { class: 'kn27-grid' },
      col('newspaper', l('Fatos públicos', 'Public facts'), l('Todo mundo sabe: saiu na imprensa ou foi assumido.', 'Everyone knows: it was in the press or admitted.'), 'pub',
        [...k.pub.map((r) => knownRow(s, r)), ...k.facts.map(factRow)], l('Nenhum escândalo público no último ano.', 'No public scandal in the last year.')),
      col('key', l('Só nós sabemos', 'Only we know'), l('Você tem prova; o público não sabe. Vale como trunfo — ou como risco.', 'You have proof; the public does not know. Leverage — or risk.'), 'conf',
        k.confirmed.map((r) => knownRow(s, r)), l('Nada confirmado por enquanto.', 'Nothing confirmed yet.')),
      col('megaphone', l('Boatos', 'Rumors'), l('Corre por aí; pode ser verdade ou não.', 'Going around; may or may not be true.'), 'rum',
        [...k.rumor.map((r) => knownRow(s, r)), ...k.rumorFacts.map(factRow)], l('Nenhum boato chegou até nós.', 'No rumor has reached us.')),
      col('eye', l('Suspeitas', 'Suspicions'), l('Só um pressentimento: investigue antes de agir.', 'Just a hunch: investigate before acting.'), 'sus',
        k.suspicion.map((r) => knownRow(s, r)), l('Nenhuma suspeita.', 'No suspicions.'))),
    h('p', { class: 'small muted' }, ic('bulb'), ' ', T(l('Para investigar alguém, abra a ficha do artista ou da pessoa › aba "O que sabemos" › Contratar detetive. Ex.: um boato sobre o rival vira "confirmado" e você decide proteger, negociar ou vazar.', 'To investigate someone, open the act or person page › "What we know" tab › Hire a detective. E.g. a rumor about a rival becomes "confirmed" and you decide to protect, negotiate or leak.'))));
}

// ================================================================ registro

registerArea({ id: MUNDO27, label: l('Este mês no mundo', 'This month in the world'), icon: 'globe', key: '', render: digestPage,
  badge: (s) => { const n = monthlyDigest27(s).items.filter((x) => x.mine).length; return n || undefined; } });
registerArea({ id: KNOWN27, label: l('O que sabemos', 'What we know'), icon: 'eye', key: '', render: knownPage });
registerTab('worldHub', { id: MAPTAB27, label: l('Mapa', 'Map'), icon: 'map', order: 10, render: mapTab });

/** Para outras telas: abrir o mapa numa cidade. */
export function openCity27(id: string): void { go27({ area: 'world', tab: ['worldHub', MAPTAB27], city: id }); }
