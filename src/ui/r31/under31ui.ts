// R31 · onda 4 (S) — o SUBMUNDO NA SUA CIDADE (DOM): a aba "Na sua cidade" da área Crime e o MURAL DE LIGAÇÕES da
// sede (cena em pixel art: fotos dos chefes, fios entre facções, artistas, gêneros e você — cada fio conta a história).
// Os lugares (fachadas, delegacia, beco) abrem a mesma cena de interior do mapa (inside31), aqui dentro da página.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { registerRunnable } from '../../sim/r31/editor';
import { FACADE31, bailes31, cells31, cityName31, countryOf31, facadeOf31, localOrgs31, mural31, police31, underPlaces31, type EdgeK31, type MEdge31, type MNode31 } from '../../sim/sys/under31';
import { h } from '../dom';
import { store } from '../store';
import { rerender } from '../common';
import { C, INK, Px, withAlpha, type Col } from '../pixel/px';
import { openFicha13 } from '../sys/persona13';
import { inspect } from '../common';
import { insideView31 } from './inside31';
import { blitPx31, sceneView31 } from './scene31';
import type { Spot31 } from './scene31model';
import type { InsideT31 } from './inside31model';

// ---------------------------------------------------------------- mural (modelo puro + pintura)

export const EDGE31: Record<EdgeK31, { col: string; sym: string; name: L }> = {
  war: { col: '#d8342c', sym: '⚔', name: l('guerra', 'war') }, tie: { col: '#e8e0cc', sym: '♪', name: l('laço de rua', 'street tie') },
  genre: { col: '#5a8ad0', sym: '♫', name: l('cena', 'scene') }, debt: { col: '#f0a030', sym: '$', name: l('você deve', 'you owe') },
  owed: { col: '#3a9a5a', sym: '+', name: l('te devem', 'owed to you') }, ask: { col: '#ffd34a', sym: '!', name: l('pedido', 'request') },
};
export interface MuralM31 { W: number; H: number; nodes: (MNode31 & { x: number; y: number })[]; edges: (MEdge31 & { i: number })[]; spots: Spot31[] }
/** Posições: facções no alto, você no centro, artistas embaixo, cenas nas laterais. */
export function muralModel31(s: GameState): MuralM31 {
  const W = 360, H = 200;
  const { nodes, edges } = mural31(s);
  const by = (k: MNode31['k']) => nodes.filter((n) => n.k === k);
  const row = (xs: MNode31[], y: number, x0 = 30, x1 = W - 30) => xs.map((n, i) => ({ ...n, x: Math.round(xs.length === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (xs.length - 1)), y }));
  const placed = [...row(by('org').slice(0, 7), 40), ...row(by('you'), 104), ...row(by('act').slice(0, 7), 168), ...row(by('genre').slice(0, 4), 104, 30, 120).map((n, i) => (i % 2 ? { ...n, x: W - n.x } : n))];
  const pos = new Map(placed.map((n) => [n.id, n]));
  const es = edges.map((e, i) => ({ ...e, i })).filter((e) => pos.has(e.a) && pos.has(e.b));
  const spots: Spot31[] = [];
  for (const n of placed) spots.push({ id: `n:${n.id}`, x: n.x - 12, y: n.y - 14, w: 24, h: 28, label: n.name, tip: n.k === 'org' ? (n.local ? l('Facção do país: ficha do chefe.', 'Faction in the country: the boss\'s card.') : l('Facção de fora já contatada.', 'Foreign faction already contacted.')) : n.k === 'act' ? l('Artista com laço de rua: ficha.', 'Act with street ties: card.') : n.k === 'you' ? l('Você: seus favores e dívidas.', 'You: your favours and debts.') : l('Cena ligada à facção.', 'Scene tied to the faction.'), go: { panel: `node:${n.id}` }, quiet: n.k === 'you' });
  for (const e of es) {
    const a = pos.get(e.a)!, b = pos.get(e.b)!;
    const mx = Math.round((a.x + b.x) / 2), my = Math.round((a.y + b.y) / 2);
    spots.push({ id: `e:${e.i}`, x: mx - 5, y: my - 5, w: 10, h: 10, label: EDGE31[e.k].name, tip: e.story, go: { panel: `edge:${e.i}` }, badge: { text: '', level: 'info', sym: EDGE31[e.k].sym }, quiet: true });
  }
  return { W, H, nodes: placed, edges: es, spots };
}
function paintMural(cv: HTMLCanvasElement, m: MuralM31, year: number): void {
  const p = new Px(m.W, m.H);
  // cortiça com moldura de madeira
  p.rect(0, 0, m.W, m.H, C('#5a3a20'));
  p.fill((x, y) => (((x * 7 + y * 13) % 11) < 2 ? C('#a8784a') : ((x + y * 3) % 7) === 0 ? C('#b8885a') : C('#c09060')), 6, 6, m.W - 12, m.H - 12);
  const pos = new Map(m.nodes.map((n) => [n.id, n]));
  // fios (a cor diz o tipo; o símbolo no meio diz também, para não depender de cor)
  for (const e of m.edges) {
    const a = pos.get(e.a)!, b = pos.get(e.b)!;
    const c = C(EDGE31[e.k].col);
    p.line(a.x, a.y, b.x, b.y, c);
    p.line(a.x + 1, a.y, b.x + 1, b.y, withAlpha(c, 140));
    const mx = Math.round((a.x + b.x) / 2), my = Math.round((a.y + b.y) / 2);
    p.disc(mx, my, 3, C('#f4ecd8'));
    p.ring(mx, my, 3, c);
  }
  // fotos (polaroides) com percevejo
  for (const n of m.nodes) {
    const base: Col = n.k === 'org' ? C('#2a2a30') : n.k === 'act' ? C('#4a3a5a') : n.k === 'you' ? C('#7a5a1a') : C('#2a4a6a');
    p.rect(n.x - 11, n.y - 13, 22, 26, C('#f4ecd8'));
    p.rect(n.x - 9, n.y - 11, 18, 16, year < 1960 ? C('#5a5048') : base);
    p.disc(n.x, n.y - 5, 3, C('#d8b090')); p.rect(n.x - 4, n.y - 1, 8, 6, year < 1960 ? C('#3a3430') : C('#1e1e24'));
    p.disc(n.x, n.y - 13, 2, n.k === 'org' ? C('#d8342c') : C('#3a6ad0'));
  }
  p.outline(INK);
  blitPx31(cv, p.d, m.W, m.H);
}

/** Cena do mural de ligações (na sede). */
export function muralView31(s: GameState): HTMLElement {
  const m = muralModel31(s);
  const pane = h('div', { class: 'in31-pane' }, h('p', { class: 'small muted' }, t(l('Clique numa foto ou num fio.', 'Click a photo or a string.'))));
  const show = (el: HTMLElement) => pane.replaceChildren(el);
  const panels: Record<string, (arg?: string) => void> = {
    node: (id?: string) => {
      const n = m.nodes.find((x) => x.id === id);
      if (!n) return;
      const lines = m.edges.filter((e) => e.a === n.id || e.b === n.id).map((e) => h('li', null, EDGE31[e.k].sym, ' ', t(e.story)));
      show(h('div', { class: 'in31-pn' }, h('h4', null, t(n.name)), lines.length ? h('ul', { class: 'in31-lines' }, lines) : h('p', { class: 'small muted' }, t(l('Nenhum fio ainda.', 'No strings yet.'))),
        n.key || n.actId ? h('button', { type: 'button', class: 'btn small', onclick: () => (n.key ? openFicha13(n.key) : inspect.act(n.actId!)) }, t(l('Ver a ficha', 'See the card'))) : null));
    },
    edge: (i?: string) => { const e = m.edges.find((x) => String(x.i) === i); if (e) show(h('div', { class: 'in31-pn' }, h('h4', null, EDGE31[e.k].sym, ' ', t(EDGE31[e.k].name)), h('p', null, t(e.story)))); },
  };
  const legend = h('p', { class: 'sc31-legend' }, ...(Object.keys(EDGE31) as EdgeK31[]).map((k) => h('span', null, h('b', { style: `color:${EDGE31[k].col}` }, EDGE31[k].sym), ' ', t(EDGE31[k].name))));
  return h('div', { class: 'in31 in31-inline' }, sceneView31(s, {
    id: 'mural31', title: l('Mural de ligações', 'Connections board'), W: m.W, H: m.H, spots: m.spots, panels,
    paint: (cv) => paintMural(cv, m, s.year),
    list: () => h('ul', { class: 'in31-list' }, m.edges.map((e) => h('li', null, EDGE31[e.k].sym, ' ', t(e.story)))),
    intro: l('Fotos dos chefes, fios entre facções, artistas, cenas e você. Mostra as do país e as de fora já contatadas.', 'Bosses\' photos and strings between factions, acts, scenes and you. Shows the country\'s and foreign ones already contacted.'),
    legend,
    note: m.nodes.filter((n) => n.k === 'org').length ? undefined : l('Nenhuma facção conhecida no país nesta época.', 'No known faction in the country in this era.'),
  }), pane);
}

// ---------------------------------------------------------------- aba "Na sua cidade"

const open31: { id?: string } = {};
/** Os lugares do submundo da cidade, com a cena por dentro (mesma do mapa). */
export function underCityTab31(s: GameState): HTMLElement {
  const places = underPlaces31(s);
  const pol = police31(s);
  const { here, via } = localOrgs31(s);
  const cur = places.find((p) => p.key === open31.id);
  const card = (p: (typeof places)[number]) => h('li', { class: 'in31-act' },
    h('b', null, t(p.name)), h('small', { class: 'muted' }, ` · ${t(p.what)}`), h('p', { class: 'small' }, t(p.now)),
    h('button', { type: 'button', class: 'btn small primary', onclick: () => { open31.id = p.key; rerender(); } }, t(l('Entrar', 'Go in'))));
  const scene = cur ? insideView31(s, { id: `u31:${cur.key}`, k: cur.k, name: t(cur.name), what: t(cur.what), people: cur.people, year: s.year, city: s.config.homeCity, seed: s.config.seed, org: cur.org } as InsideT31,
    () => { open31.id = undefined; rerender(); }) : null;
  if (scene) scene.classList.add('in31-inline');
  return h('div', { class: 'in31-hub' },
    h('p', { class: 'small' }, t(fmtL(l('{c} ({p}): {n} facção(ões) com fachada na cidade, {v} por contato. {t}', '{c} ({p}): {n} faction(s) with a front in town, {v} by contact. {t}'),
      { c: cityName31(s), p: countryOf31(s), n: here.length, v: via.length, t: pol.text }))),
    scene,
    h('ul', { class: 'in31-cards' }, places.map(card)),
    via.length ? h('p', { class: 'small muted' }, t(fmtL(l('Emissários no bar: {o}.', 'Envoys at the bar: {o}.'), { o: via.slice(0, 2).map((o) => o.name.pt).join(', ') }))) : null,
    h('details', { class: 'in31-mural', open: true }, h('summary', null, t(l('Mural de ligações (na sua sede)', 'Connections board (at your HQ)'))), muralView31(s)),
    bailes31(s).length ? h('p', { class: 'small' }, '! ', t(l('Há convite para baile em aberto: entre na fachada da facção.', 'There is an open party invitation: go into the faction\'s front.'))) : null,
    cells31(s).some((c) => c.mine) ? h('p', { class: 'small' }, '⛓ ', t(l('Gente sua na cadeia: veja as celas da delegacia.', 'Your people are in prison: see the police station cells.'))) : null,
    here.length ? h('p', { class: 'small muted' }, here.map((o) => `${o.name.pt}: ${t(FACADE31[facadeOf31(s, o)].front)}`).join(' · ')) : null);
}

// ---------------------------------------------------------------- editor (regra 10)

registerRunnable({ id: 'under31.scene', area: 'scenes', label: l('Abrir cena: Mural de ligações', 'Open scene: Connections board'),
  help: l('Leva à área Crime › Na sua cidade (só abre; não decide nada).', 'Goes to Crime › In your city (only opens; decides nothing).'),
  run: () => { setTimeout(() => { store.area = 'crime' as typeof store.area; rerender(); }, 0); return l('Cena aberta.', 'Scene opened.'); } });
