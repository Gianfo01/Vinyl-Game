// R31 · onda 4 (S) — o SUBMUNDO NA SUA CIDADE (DOM): a aba "Na sua cidade" da área Crime e o MURAL DE LIGAÇÕES da
// sede (cena em pixel art: fotos dos chefes, fios entre facções, artistas, gêneros e você — cada fio conta a história).
// Os lugares (fachadas, delegacia, beco) abrem a mesma cena de interior do mapa (inside31), aqui dentro da página.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { registerRunnable } from '../../sim/r31/editor';
import { FACADE31, bailes31, cells31, cityName31, countryOf31, facadeOf31, underOrgs31, mural31, police31, underPlaces31, type EdgeK31, type MEdge31, type MNode31 } from '../../sim/sys/under31';
import { h } from '../dom';
import { store } from '../store';
import { rerender } from '../common';
import { C, Px, inked, lv, mix, noise, withAlpha } from '../pixel/px';
import { portraitPx } from '../pixel/avatar';
import { playerPerson } from '../../sim/sys/life';
import type { Appearance } from '../../sim/types';
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
  for (const n of placed) spots.push({ id: `n:${n.id}`, x: n.x - 12, y: n.y - 16, w: 24, h: 31, label: n.name, tip: n.k === 'org' ? (n.local ? l('Facção do país: ficha do chefe.', 'Faction in the country: the boss\'s card.') : l('Facção de fora já contatada.', 'Foreign faction already contacted.')) : n.k === 'act' ? l('Artista com laço de rua: ficha.', 'Act with street ties: card.') : n.k === 'you' ? l('Você: seus favores e dívidas.', 'You: your favours and debts.') : l('Cena ligada à facção.', 'Scene tied to the faction.'), go: { panel: `node:${n.id}` }, quiet: n.k === 'you' });
  for (const e of es) {
    const a = pos.get(e.a)!, b = pos.get(e.b)!;
    const mx = Math.round((a.x + b.x) / 2), my = Math.round((a.y + b.y) / 2);
    spots.push({ id: `e:${e.i}`, x: mx - 5, y: my - 5, w: 10, h: 10, label: EDGE31[e.k].name, tip: e.story, go: { panel: `edge:${e.i}` }, badge: { text: '', level: 'info', sym: EDGE31[e.k].sym }, quiet: true });
  }
  return { W, H, nodes: placed, edges: es, spots };
}
/** Quem aparece na foto de cada nó (chefe, primeiro integrante, você); cena = sem rosto (disco). */
type Face31 = { id: string; look?: Appearance; born?: number } | null;
function paintMural(cv: HTMLCanvasElement, m: MuralM31, year: number, face: (n: MNode31) => Face31): void {
  const p = new Px(m.W, m.H);
  // R31 (arte): cortiça com grão em 3 tons (luz de cima à esquerda) e moldura de madeira com relevo — antes um
  // padrão de módulo repetido e uma moldura chapada; fotos com o retrato do boneco no estilo do jogo (antes um
  // círculo bege sobre um retângulo preto, igual para todo mundo).
  const wood = C('#6a4426'), cork = C('#b8875a');
  p.rect(0, 0, m.W, m.H, wood);
  p.hline(0, m.W - 1, 0, lv(wood, 4.4)); p.vline(0, 1, m.H - 2, lv(wood, 4)); p.hline(0, m.W - 1, m.H - 1, lv(wood, 1.2)); p.vline(m.W - 1, 1, m.H - 2, lv(wood, 2));
  for (let y = 1; y < 6; y++) for (let x = 1; x < m.W - 1; x += 1) if (noise(x >> 2, y, 41) < 0.18) p.put(x, y, lv(wood, 2.4)); // veio
  p.fill((x, y) => { const v = noise(x, y, 7); return v < 0.08 ? lv(cork, 2.2) : v > 0.93 ? lv(cork, 4) : v > 0.8 ? lv(cork, 3.4) : cork; }, 6, 6, m.W - 12, m.H - 12);
  p.hline(6, m.W - 7, 6, lv(cork, 1.4)); p.vline(6, 7, m.H - 7, lv(cork, 1.8)); // sombra da moldura na cortiça
  const pos = new Map(m.nodes.map((n) => [n.id, n]));
  // fios (a cor diz o tipo; o símbolo no meio diz também, para não depender de cor)
  for (const e of m.edges) {
    const a = pos.get(e.a)!, b = pos.get(e.b)!;
    const c = C(EDGE31[e.k].col);
    p.line(a.x + 1, a.y + 1, b.x + 1, b.y + 1, withAlpha(lv(cork, 1), 150)); // sombra do fio
    p.line(a.x, a.y, b.x, b.y, c);
    const mx = Math.round((a.x + b.x) / 2), my = Math.round((a.y + b.y) / 2);
    p.disc(mx, my, 3, C('#f4ecd8'));
    p.ring(mx, my, 3, c);
  }
  // fotos (polaroides 24×30) com o retrato e percevejo; contornadas como os outros objetos
  inked(p, (q) => {
    for (const n of m.nodes) {
      const x0 = n.x - 12, y0 = n.y - 15, paper = C('#f4ecd8');
      q.rect(x0, y0, 24, 30, paper); q.hline(x0, x0 + 23, y0, lv(paper, 5)); q.vline(x0 + 23, y0 + 1, y0 + 29, lv(paper, 2.6)); q.hline(x0, x0 + 23, y0 + 29, lv(paper, 2.4));
      const who = face(n);
      if (who) {
        const pic = portraitPx(who, year);
        for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { const c = pic.get(x + 6, y + 5); q.put(x0 + 2 + x, y0 + 2 + y, (c >>> 24) > 127 ? c : lv(paper, 1.6)); }
      } else {
        const bg = C('#2a4a6a');
        q.rect(x0 + 2, y0 + 2, 20, 20, bg);
        q.disc(x0 + 12, y0 + 12, 7.5, (xx, yy) => (xx + yy < x0 + y0 + 20 ? C('#3a3a44') : C('#1a1a1e'))); q.disc(x0 + 12, y0 + 12, 2.5, C('#d8b040')); // disco da cena
      }
      if (year < 1960) for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { const c = q.get(x0 + 2 + x, y0 + 2 + y); q.put(x0 + 2 + x, y0 + 2 + y, mix(c, C('#8a6a4a'), 0.35)); } // foto sépia
      q.hline(x0 + 3, x0 + 20, y0 + 25, lv(paper, 2.8)); // legenda a lápis
      const pin = n.k === 'org' ? C('#d8342c') : C('#3a6ad0');
      q.disc(n.x, y0, 2, pin); q.put(n.x - 1, y0 - 1, lv(pin, 4.6));
    }
  });
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
    paint: (cv) => paintMural(cv, m, s.year, (n) => {
      if (n.k === 'you') return playerPerson(s) ?? { id: 'you' };
      if (n.k === 'act') { const a = n.actId ? s.acts[n.actId] : undefined; const pid = a?.members[0]; return (pid && s.persons[pid]) || { id: n.id }; }
      if (n.k === 'org') return { id: n.key ?? n.id };
      return null;
    }),
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
  const { here, via } = underOrgs31(s);
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
