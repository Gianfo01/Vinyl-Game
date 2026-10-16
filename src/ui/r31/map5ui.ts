// R31 · onda 5 (MAPA · EXP-3) — CIDADE E MUNDO SÓ PELO MAPA (DOM). Atrás de `exp5.nav` (desligado = tudo como hoje).
// O modelo é ./map5model.ts; aqui ficam as peças que "Nosso mundo" (sys/campus18) e o mapa-múndi (sys/mundo27) usam
// quando o interruptor está ligado:
//   · cidade: painel "Placas" (camadas do mapa no lugar da lista), "!" nos prédios com novidade, setas andam de prédio
//     em prédio (o mapa acompanha), +/− aproximam, 0 volta, "!" (ou N) pula para a próxima novidade, a busca aponta;
//   · mundo: painel do país (mercado, cidades, cultura), seletor de país pelo teclado (setas andam pelo mapa), telex do
//     mês ancorado no canto do mapa, rotas de turnê, e a cidade de outro país como mapa próprio (área `cidade5`);
//   · registro de regiões (`registerRegion5`) e os comandos da busca (Ctrl K) — a casca (frente NAV) só chama `regionCmds5`.
// Explorar não muda o mundo: camadas e foco ficam na memória da sessão, nada vai para o save.

import { cityById, l, type L } from '../../data/world';
import { getLang, t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { nav5On } from '../../sim/r31/exp5';
import { registerRegion5 } from './nav5';
import { buildScene18, drawFrame18, env18 } from '../pixel/campus18px';
import { mapLms27 } from '../pixel/city27';
import { LOTS18, DIST18 } from '../../sim/sys/campus18';
import { citySheet27, type Go27 } from '../sys/mundo27model';
import { genreName, pill, rerender } from '../common';
import { h } from '../dom';
import { registerArea } from '../registry';
import { store } from '../store';
import { ic } from '../vis';
import {
  CITY_LAYERS5, bangText5, country5, countryInfo5, defaultLayers5, find5, next5, telex5, worldCountries5,
  type Country5, type Dir5, type Layer5, type Pin5, type Pt5,
} from './map5model';
import './map5.css';

const T = (x: L | string | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : t(x));
const DIRS5: Record<string, Dir5> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };

// ---------------------------------------------------------------- busca das regiões (Ctrl K) e registro na casca

export interface RegionCmd5 { label: string; hint: string; icon: string; run: () => void }
type Find5Fn = (s: GameState, q: string) => RegionCmd5[];
const FINDS5 = new Map<string, Find5Fn>();
/** Busca de uma região (cidade, mundo…): a paleta (Ctrl K) junta todas com `regionCmds5`. */
export function registerFind5(id: string, fn: Find5Fn): void { FINDS5.set(id, fn); }
/** Comandos de busca das regiões (Ctrl K). Desligado: nada. */
export function regionCmds5(s: GameState, q: string): RegionCmd5[] {
  if (!nav5On(s)) return [];
  return [...FINDS5.values()].flatMap((f) => f(s, q));
}

// ---------------------------------------------------------------- estado da sessão (não vai para o save)

export const CITY5: { layers: Set<Layer5>; want?: string } = { layers: defaultLayers5() };
export const WORLD5: { country?: string; city?: string; focus?: string; want?: { lon: number; lat: number; span: number } } = {};

const goArea5 = (area: string): void => { (store as { area: string }).area = area; rerender(); };

/** Apontar um prédio: abre "Nosso mundo" e, ao desenhar, centraliza e mostra a seta em cima dele. */
export function pointCity5(id: string): void { CITY5.want = id; goArea5('campus18'); }
/** Apontar um país (ou uma cidade dele) no mapa-múndi. */
export function pointWorld5(s: GameState, key: string, city?: string): void {
  const c = country5(s, key);
  WORLD5.country = c?.id; WORLD5.focus = c?.id; WORLD5.city = undefined;
  const cc = city ? cityById[city] : undefined;
  WORLD5.want = cc ? { lon: cc.lon, lat: cc.lat, span: 14 } : c ? { lon: c.lon, lat: c.lat, span: 34 } : undefined;
  goArea5('world');
}
/** Clicar numa cidade do mundo: a da sede abre "Nosso mundo"; as outras, o mapa daquela cidade. */
export function openCityMap5(s: GameState, id: string): void {
  if (id === s.config.homeCity) { goArea5('campus18'); return; }
  WORLD5.city = id; goArea5(CITY_AREA5);
}

registerFind5('cidade', (s, q) => find5(s, q).filter((x) => x.region === 'cidade').map((x) => ({
  label: T(x.name), hint: `${T(l('Cidade', 'City'))} · ${T(x.what)}`, icon: 'skyline', run: () => pointCity5((x as { id: string }).id),
})));
registerFind5('mundo', (s, q) => find5(s, q).filter((x) => x.region === 'mundo').map((x) => {
  const w = x as { country: string; city?: string };
  return { label: T(x.name), hint: `${T(l('Mundo', 'World'))} · ${T(x.what)}`, icon: 'globe', run: () => pointWorld5(s, w.country, w.city) };
}));
// Casca (frente NAV): a cena das regiões 'cidade' e 'mundo' É o mapa — a página da região (campus18 / mapa-múndi), que
// com exp5.nav ligado já vem sem lista. Registrar devolve essa página; a casca põe topo, viagem e bolso em volta.
registerRegion5('cidade', (c) => c.old());
registerRegion5('mundo', (c) => c.old());

// ---------------------------------------------------------------- cidade: placas, "!", teclado, apontar

/** Painel "Placas" (sem nada escolhido): as camadas do mapa no lugar da lista, novidades e atalhos. */
export function cityPanel5(s: GameState, pins: Pin5[], o: { fn: boolean; setFn: (v: boolean) => void; nextBang: () => void; good?: number }): HTMLElement {
  const count = (k: Layer5) => pins.filter((p) => p.layer === k).length;
  const bangs = pins.filter((p) => p.bang.length && CITY5.layers.has(p.layer)).length;
  const on = (k: Layer5) => (k === 'fn' ? o.fn : CITY5.layers.has(k));
  const flip = (k: Layer5) => { if (k === 'fn') { o.setFn(!o.fn); return; } if (CITY5.layers.has(k)) CITY5.layers.delete(k); else CITY5.layers.add(k); rerender(); };
  const city = cityById[s.config.homeCity];
  return h('div', { class: 'c27-pn m5-placas', 'data-m5': 'placas' },
    h('header', { class: 'm5-ph' }, h('b', null, T(l('Placas', 'Signs'))), h('small', { class: 'muted' }, T(l('(mostrar no mapa)', '(show on the map)')))),
    h('div', { class: 'm5-layers', role: 'group', 'aria-label': T(l('Camadas do mapa', 'Map layers')) },
      CITY_LAYERS5.map((x) => h('button', {
        type: 'button', class: `m5-layer ${on(x.id) ? 'on' : ''}`, 'aria-pressed': on(x.id) ? 'true' : 'false', 'data-layer': x.id, title: T(x.tip),
        onclick: () => flip(x.id),
      }, h('span', { class: 'm5-lname' }, T(x.name)), x.id === 'fn' ? null : h('small', { class: 'm5-ln' }, String(count(x.id)))))),
    h('div', { class: 'm5-news' },
      h('button', { type: 'button', class: 'btn small', disabled: bangs ? undefined : true, 'data-m5': 'nextbang', onclick: o.nextBang, title: T(l('Vitrine do mês, à venda, recados', 'Showcase, for sale, messages')) },
        h('i', { class: 'm5-bang', 'aria-hidden': 'true' }, '!'), ' ', T(l('Próxima novidade', 'Next news')), ` (${bangs})`)),
    o.good ? h('p', { class: 'small muted' }, T(l('Vizinhanças boas: {n} (passe o mouse nos seus prédios).', 'Good neighbours: {n} (hover your buildings).')).replace('{n}', String(o.good))) : null,
    h('h4', null, T(l('Atalhos', 'Shortcuts'))),
    h('ul', { class: 'm5-keys small' },
      h('li', null, h('kbd', null, '← ↑ → ↓'), ' ', T(l('anda de prédio em prédio', 'moves building to building'))),
      h('li', null, h('kbd', null, 'Enter'), ' ', T(l('entra / abre o painel', 'enters / opens the panel'))),
      h('li', null, h('kbd', null, '+ −'), ' ', T(l('aproxima e afasta', 'zoom in and out')), ' · ', h('kbd', null, '0'), ' ', T(l('cidade inteira', 'whole city'))),
      h('li', null, h('kbd', null, 'N'), ' ', T(l('próxima novidade', 'next news'))),
      h('li', null, h('kbd', null, 'Ctrl K'), ' ', T(l('busca e aponta no mapa', 'search and point on the map')))),
    h('p', { class: 'small muted' }, `${T(city?.name ?? l('Sua cidade', 'Your city'))} · ${s.year}`));
}

const center5 = (b: HTMLElement): Pt5 => ({ id: b.dataset.id ?? '', x: b.offsetLeft + b.offsetWidth / 2, y: b.offsetTop + b.offsetHeight / 2 });
const shown5 = (layer: HTMLElement): HTMLElement[] => [...layer.querySelectorAll<HTMLElement>('.w19-hs[data-id]')].filter((b) => !b.hidden);

/** Marca os pontos do mapa: esconde as camadas desligadas, põe "!" e completa o rótulo de leitor de tela. */
export function decorateCity5(layer: HTMLElement, pins: Pin5[]): void {
  const by = new Map(pins.map((p) => [p.id, p]));
  for (const b of layer.querySelectorAll<HTMLElement>('.w19-hs[data-id]')) {
    const id = b.dataset.id ?? '';
    const p = by.get(id) ?? (id.startsWith('fl:') ? by.get(`pl:${id.slice(3)}`) : undefined);
    if (!p) continue;
    b.dataset.layer = p.layer;
    if (!CITY5.layers.has(p.layer)) { b.hidden = true; continue; }
    if (p.bang.length) {
      b.classList.add('m5-has-bang');
      b.append(h('i', { class: 'm5-bang m5-pinbang', 'aria-hidden': 'true' }, '!'));
      const why = p.bang.map((x) => T(x.text)).join(', ');
      b.setAttribute('aria-label', `${b.getAttribute('aria-label') ?? T(p.name)} — ! ${why}`);
    }
  }
}

/** Teclado do mapa da cidade: setas andam pelos prédios (ou movem o mapa quando o foco está no mapa), +/− e 0, N. */
export function cityKeys5(vp: HTMLElement, layer: HTMLElement, o: { zoom: (f: number) => void; reset: () => void; pan: (dx: number, dy: number) => void; show: (b: HTMLElement) => void }): void {
  vp.tabIndex = 0;
  vp.setAttribute('role', 'application');
  vp.setAttribute('aria-roledescription', T(l('mapa da cidade', 'city map')));
  vp.setAttribute('aria-label', T(l('Mapa da cidade: setas andam pelos prédios, Enter abre, + e − aproximam.', 'City map: arrows move between buildings, Enter opens, + and − zoom.')));
  vp.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = DIRS5[e.key];
    const cur = (document.activeElement as HTMLElement | null)?.closest?.('.w19-hs[data-id]') as HTMLElement | null;
    if (dir) {
      e.preventDefault(); e.stopPropagation();
      if (!cur && e.shiftKey) { const d = 60; o.pan(dir === 'left' ? d : dir === 'right' ? -d : 0, dir === 'up' ? d : dir === 'down' ? -d : 0); return; }
      const bs = shown5(layer);
      const id = next5(bs.map(center5), cur?.dataset.id, dir);
      const nb = bs.find((b) => b.dataset.id === id);
      if (nb) { nb.focus({ preventScroll: true }); o.show(nb); }
      return;
    }
    if (e.key === '+' || e.key === '=') { e.preventDefault(); o.zoom(1.4); return; }
    if (e.key === '-' || e.key === '_') { e.preventDefault(); o.zoom(1 / 1.4); return; }
    if (e.key === '0' || e.key === 'Home') { e.preventDefault(); o.reset(); return; }
    if (e.key === 'n' || e.key === 'N' || e.key === '!') { e.preventDefault(); e.stopPropagation(); nextBang5(layer, o.show); }
  });
}

/** Pula para a próxima novidade ("!") na ordem de leitura. */
export function nextBang5(layer: HTMLElement, show: (b: HTMLElement) => void): void {
  const bs = shown5(layer).filter((b) => b.classList.contains('m5-has-bang')).sort((a, b) => a.offsetTop - b.offsetTop || a.offsetLeft - b.offsetLeft);
  if (!bs.length) return;
  const cur = document.activeElement as HTMLElement | null;
  const i = bs.findIndex((b) => b === cur);
  const nb = bs[(i + 1) % bs.length];
  nb.focus({ preventScroll: true }); show(nb);
}

/** A seta "é aqui" em cima do prédio apontado pela busca (some sozinha). */
export function point5(b: HTMLElement): void {
  for (const x of document.querySelectorAll('.m5-point')) x.classList.remove('m5-point');
  b.classList.add('m5-point');
  if (!b.querySelector('.m5-arrow')) b.append(h('span', { class: 'm5-arrow', 'aria-hidden': 'true' }, h('i', null), T(l('aqui', 'here'))));
  b.focus({ preventScroll: true });
  setTimeout(() => { b.classList.remove('m5-point'); b.querySelector('.m5-arrow')?.remove(); }, 6000);
}

// ---------------------------------------------------------------- mundo: país, teclado, telex

const tierCls5 = ['', '', 'good', 'gold'];
/** Painel do país (clique no país): mercado, cidades (cada uma leva ao mapa dela), cultura, turnês, fechado. */
export function countryPanel5(s: GameState, key: string, o: { close: () => void; full: (a3: string) => void; market: () => void }): HTMLElement | null {
  const c = countryInfo5(s, key);
  if (!c) return null;
  const n = (v?: number) => (v === undefined ? '' : v >= 10 ? Math.round(v).toLocaleString(getLang() === 'pt' ? 'pt-BR' : 'en-US') : v.toFixed(1));
  return h('aside', { class: 'card sheet27 m5-country', 'aria-label': `${T(l('País', 'Country'))}: ${T(c.name)}`, 'data-m5': 'country', 'data-a3': c.a3 },
    h('header', { class: 'sheet27-h' }, h('div', null, h('h3', null, T(c.name)), h('small', { class: 'muted' }, `${T(l('fronteiras de', 'borders of'))} ${s.year}`)),
      h('button', { type: 'button', class: 'btn tiny ghost', 'aria-label': T(l('Fechar país', 'Close country')), onclick: o.close }, 'x')),
    c.closed.length ? h('div', { class: 'chips' }, c.closed.map((x) => pill(T(x), 'bad'))) : null,
    h('div', { class: 'sheet27-blk' }, h('h4', null, ic('coin'), ' ', T(l('Mercado', 'Market'))),
      h('div', { class: 'chips' },
        c.market.popM ? pill(`${T(l('População', 'Population'))}: ${n(c.market.popM)} mi`) : null,
        c.market.marketM ? pill(`${T(l('Música', 'Music'))}: ${n(c.market.marketM)} M`) : null,
        pill(`${T(l('Seus fãs potenciais', 'Your potential fans'))}: ${n(c.market.yourFans)}`, c.market.yourFans > 0 ? 'good' : ''),
        pill(T(c.market.distributes ? l('você distribui aqui', 'you distribute here') : l('sem distribuição', 'no distribution')), c.market.distributes ? 'good' : 'warn')),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn small', onclick: o.market }, T(l('Mercado e política do país', 'Country market and politics')), ' →'),
        h('button', { type: 'button', class: 'btn small ghost', onclick: () => o.full(c.a3) }, T(l('Tudo sobre o país', 'Everything about the country'))))),
    h('div', { class: 'sheet27-blk' }, h('h4', null, ic('skyline'), ' ', T(l('Cidades (clique = mapa da cidade)', 'Cities (click = city map)'))),
      h('div', { class: 'm5-cities' }, c.cities.map((x) => h('button', {
        type: 'button', class: `btn small ${x.home ? 'primary' : 'ghost'} m5-city`, 'data-city': x.id, onclick: () => openCityMap5(s, x.id),
        title: x.unit && T(x.unit) !== T(c.name) ? T(x.unit) : undefined,
      }, T(x.name), x.tier >= 2 ? [' ', h('span', { class: `pill ${tierCls5[x.tier]}` }, T(l('cena forte', 'strong scene')))] : null, x.tour ? [' ', h('span', { class: 'pill warn' }, T(l('turnê', 'tour')))] : null, x.home ? [' ', h('span', { class: 'pill good' }, T(l('sede', 'HQ')))] : x.mine ? [' ', h('span', { class: 'pill mine27' }, T(l('seu lugar', 'your place')))] : null)))),
    h('div', { class: 'sheet27-blk' }, h('h4', null, ic('book'), ' ', T(l('Cultura', 'Culture'))),
      c.culture.genres.length ? h('p', { class: 'small' }, `${T(l('Cena', 'Scene'))}: ${c.culture.genres.map(genreName).join(', ')}`) : h('p', { class: 'small muted' }, T(l('Nenhuma cena forte agora.', 'No strong scene right now.'))),
      c.culture.native.length ? h('p', { class: 'small muted' }, `${T(l('Da terra', 'Native'))}: ${c.culture.native.map(genreName).join(', ')}`) : null,
      c.culture.movements.length ? h('p', { class: 'small' }, `${T(l('Movimentos', 'Movements'))}: ${c.culture.movements.map(T).join(' · ')}`) : null,
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => goArea5('movements') }, T(l('Livro "Cultura"', '"Culture" book')), ' →')),
    c.tours.length ? h('p', { class: 'small' }, ic('bus'), ' ', T(l('Turnê marcada aqui: {n}', 'Tour booked here: {n}')).replace('{n}', c.tours.map((id) => s.acts[id]?.name ?? id).join(', '))) : null);
}

/** Seletor de país pelo teclado: setas andam pelo mapa (país vizinho naquela direção), Enter abre o painel. */
export function countryKeys5(s: GameState, o: { center: (c: Country5) => void; open: (id: string) => void }): HTMLElement {
  const cs = worldCountries5(s);
  const pts: Pt5[] = cs.map((c) => ({ id: c.id, x: c.lon, y: -c.lat }));
  const cur = () => cs.find((c) => c.id === WORLD5.focus) ?? cs.find((c) => c.cities.includes(s.config.homeCity)) ?? cs[0];
  const label = h('span', { class: 'm5-cname' });
  const paint = () => {
    const c = cur();
    if (!c) return;
    label.replaceChildren(T(c.name), ...c.bang.map((b) => h('i', { class: 'm5-bang', title: T(b.text), 'aria-hidden': 'true' }, '!')));
    btn.setAttribute('aria-label', `${T(l('País', 'Country'))}: ${T(c.name)}${c.bang.length ? ` — ! ${c.bang.map((b) => T(b.text)).join(', ')}` : ''}. ${T(l('Setas: país vizinho; Enter: abrir.', 'Arrows: neighbouring country; Enter: open.'))}`);
  };
  const btn = h('button', {
    type: 'button', class: 'btn small m5-cpick', 'data-m5': 'cpick',
    onclick: () => { const c = cur(); if (c) o.open(c.id); },
    onkeydown: (e: KeyboardEvent) => {
      const d = DIRS5[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      WORLD5.focus = next5(pts, cur()?.id, d);
      paint();
      const c = cur(); if (c) o.center(c);
    },
  }, label);
  paint();
  return h('div', { class: 'm5-cbar', role: 'group', 'aria-label': T(l('Escolher país pelo teclado', 'Pick a country by keyboard')) },
    h('small', { class: 'muted' }, ic('globe'), ' ', T(l('Teclado', 'Keyboard'))), btn,
    h('small', { class: 'muted' }, T(l('setas = país vizinho · Enter = abrir · {n} países', 'arrows = neighbouring country · Enter = open · {n} countries')).replace('{n}', String(cs.length))));
}

/** O telex (ou jornal, pela época) do mês, preso no canto do mapa. */
export function telexCard5(s: GameState, go: (g: Go27) => void): HTMLElement {
  const xs = telex5(s);
  const form = s.year < 1930 ? l('Telégrafo', 'Telegraph') : s.year < 1990 ? l('Telex', 'Telex') : l('Agência de notícias', 'News wire');
  return h('div', { class: 'm5-telex', 'data-m5': 'telex', role: 'region', 'aria-label': `${T(form)}: ${T(l('este mês no mundo', 'this month in the world'))}` },
    h('header', null, h('b', null, T(form).toUpperCase()), h('small', null, ` · ${T(l('este mês no mundo', 'this month in the world'))}`)),
    xs.length ? h('ul', null, xs.map((x) => h('li', null, h('button', { type: 'button', class: `m5-tx ${x.mine ? 'mine' : ''}`, onclick: () => go(x.go) }, T(x.title)))))
      : h('p', { class: 'small muted' }, T(l('Mês calmo no mundo.', 'A quiet month in the world.'))),
    h('button', { type: 'button', class: 'btn tiny ghost', onclick: () => goArea5('mundo27') }, T(l('Ler tudo', 'Read all')), ' →'));
}

/** Faixa de baixo do mapa-múndi (como no mock): o que cada clique faz. */
export function worldHint5(): HTMLElement {
  const it = (x: L) => h('span', { class: 'm5-hit' }, T(x));
  return h('div', { class: 'm5-whint' }, h('b', null, T(l('Clique num país', 'Click a country'))),
    it(l('mercado do país', 'country market')), it(l('cidade = mapa da cidade', 'city = city map')), it(l('telex: este mês no mundo', 'telex: this month in the world')), it(l('livro: cultura e lendas', 'book: culture and legends')));
}

// ---------------------------------------------------------------- cidade de outro país (mapa próprio)

export const CITY_AREA5 = 'cidade5';
/** Sheet completo da cidade (o mesmo da ficha do mapa-múndi), ligado por mundo27 para não duplicar. */
export const CITY5_SHEET: { fn?: (s: GameState, id: string) => HTMLElement | null } = {};

interface VisitSpot5 { id: string; box: [number, number, number, number]; name: string; what: string; kind: 'venue' | 'radio' | 'lm' | 'store' }
/** O mapa isométrico de uma cidade que não é a sua: marcos da época e os lugares reais (casas de show, rádios). Só leitura. */
export function visitCity5(s: GameState, id: string): HTMLElement {
  const c = cityById[id];
  const sh = citySheet27(s, id);
  if (!c || !sh) return h('p', { class: 'muted' }, T(l('Cidade desconhecida.', 'Unknown city.')));
  const end = DIST18[1].end;
  const fill = Array.from({ length: end }, (_, i) => i).filter((i) => LOTS18[i]);
  const named: { lot: number; name: string; what: string; kind: VisitSpot5['kind'] }[] = [];
  const free = [...fill].sort((a, b) => (LOTS18[b].vis ?? 1) - (LOTS18[a].vis ?? 1));
  for (const v of sh.venues.slice(0, 5)) { const lot = free.shift(); if (lot !== undefined) named.push({ lot, name: v.name, what: `${T(l('Casa de shows', 'Venue'))} · ${v.cap} ${T(l('lugares', 'seats'))}`, kind: 'venue' }); }
  for (const r of sh.radios.slice(0, 4)) { const lot = free.shift(); if (lot !== undefined) named.push({ lot, name: r.name, what: T(r.kind === 'tv' ? l('TV', 'TV') : l('Rádio', 'Radio')), kind: 'radio' }); }
  const fillKind = new Map(named.map((x) => [x.lot, x.kind === 'venue' ? 'venue' as const : 'media' as const]));
  let seed = 7; for (const ch of id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
  const lms = mapLms27(id, s.year);
  const scene = buildScene18([], new Map(), env18(s.year, s.month, c.lat, id), [], seed % 9973, 'REC', [], lms, { filler: fill, dist: 1, fillKind });
  const { mw: MW, mh: MH } = scene.geo;
  const cv = h('canvas', { class: 'px m5-vcv', width: MW, height: MH, 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (ctx) drawFrame18(ctx, scene, 3, 0);
  const spots: VisitSpot5[] = [];
  for (const x of named) { const sp = scene.sprites.find((q) => q.id === `fl:${x.lot}`); if (sp) spots.push({ id: `v:${x.lot}`, box: sp.box, name: x.name, what: x.what, kind: x.kind }); }
  for (const m of scene.marks) { const lm = lms.find((q) => q.id === m.id); if (lm) spots.push({ id: `lm:${m.id}`, box: m.box, name: T(lm.n), what: T(l('Marco da cidade', 'City landmark')), kind: 'lm' }); }
  const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(2)}%`;
  const side = h('div', { class: 'm5-vside' });
  const showSheet = () => side.replaceChildren(CITY5_SHEET.fn?.(s, id) ?? h('p', { class: 'muted' }, T(sh.name)));
  const pick = (sp: VisitSpot5) => side.replaceChildren(h('aside', { class: 'card sheet27', 'data-m5': 'vspot' },
    h('header', { class: 'sheet27-h' }, h('div', null, h('h3', null, sp.name), h('small', { class: 'muted' }, sp.what)),
      h('button', { type: 'button', class: 'btn tiny ghost', 'aria-label': T(l('Fechar', 'Close')), onclick: showSheet }, 'x')),
    h('p', { class: 'small' }, sp.kind === 'venue' ? T(l('Palco da cidade: marque shows e turnês por aqui na agenda do artista.', 'A stage in town: book shows and tours here from the artist\'s planner.'))
      : sp.kind === 'radio' ? T(l('Emissora da cidade: tocar aqui leva o disco ao público local.', 'A local station: airplay here takes the record to the local audience.'))
        : T(l('Cartão-postal da época.', 'A postcard sight of the era.'))),
    h('div', { class: 'row wrap' }, h('button', { type: 'button', class: 'btn small', onclick: () => goArea5(sp.kind === 'radio' ? 'media' : sp.kind === 'venue' ? 'shows' : 'world') },
      T(sp.kind === 'radio' ? l('Mídia', 'Media') : sp.kind === 'venue' ? l('Shows', 'Shows') : l('Mundo', 'World')), ' →'))));
  const layer = h('div', { class: 'w19-hot m5-vhot' }, spots.map((sp) => h('button', {
    type: 'button', class: `w19-hs fill m5-vs m5-${sp.kind}`, 'data-id': sp.id, 'aria-label': `${sp.name} · ${sp.what}`, title: `${sp.name} · ${sp.what}`,
    style: `left:${pct(sp.box[0], MW)};top:${pct(sp.box[1], MH)};width:${pct(Math.max(6, sp.box[2] - sp.box[0]), MW)};height:${pct(Math.max(6, sp.box[3] - sp.box[1]), MH)}`,
    onclick: () => pick(sp),
  }, h('span', { class: 'm5-vtag', 'aria-hidden': 'true' }, sp.name))));
  const vp = h('div', { class: 'w19-vp m5-vvp', style: `--ar:${(MW / MH).toFixed(4)}` }, h('div', { class: 'w19-zoom' }, cv, layer));
  cityKeys5(vp, layer, { zoom: () => {}, reset: () => {}, pan: () => {}, show: () => {} });
  const back = () => { WORLD5.city = undefined; WORLD5.country = country5(s, id)?.id; WORLD5.focus = WORLD5.country; goArea5('world'); };
  vp.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); back(); } });
  showSheet();
  return h('div', { class: 'm5-visit', 'data-m5': 'visit', 'data-city': id },
    h('div', { class: 'm5-vhead' }, h('h2', null, T(sh.name)), h('small', { class: 'muted' }, `${T(sh.country)} · ${s.year}`),
      h('button', { type: 'button', class: 'btn small', onclick: back }, '← ', T(l('Voltar ao mundo', 'Back to the world')))),
    h('div', { class: 'm5-vbody' }, h('div', { class: 'm5-vmap c27-frame w19-frame' }, vp), side));
}

registerArea({ id: CITY_AREA5, label: l('Cidade (visita)', 'City (visit)'), icon: 'skyline', key: '',
  render: (s) => (WORLD5.city ? visitCity5(s, WORLD5.city) : h('p', { class: 'muted' }, T(l('Escolha uma cidade no mapa-múndi.', 'Pick a city on the world map.')))), visible: () => false });

export { bangText5 };
