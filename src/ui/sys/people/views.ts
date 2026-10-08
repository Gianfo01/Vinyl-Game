// Vistas compartilhadas do sistema "people": feed social (ou cartas e colunas antes de 2004) e o
// mapa social do elenco em SVG (grupos, líderes, amizades e rixas).

import { familyOf, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import { feedFor, sentimentOf } from '../../../sim/sys/people/feed';
import { GROUP_NAME, bond, cliques, rosterLeader, type GroupBy } from '../../../sim/sys/people/social';
import { activeRomance } from '../../../sim/sys/people/life';
import { socialEra } from '../../../sim/sys/people/state';
import type { GameState } from '../../../sim/types';
import { playerActs } from '../../../sim/util';
import { N, actLink, rerender, section } from '../../common';
import { h, select } from '../../dom';
import { meter } from '../../vis';

let feedAct = '';

export function feedView(s: GameState): HTMLElement {
  const ids = playerActs(s);
  const posts = feedFor(s, feedAct || undefined, 40);
  const era = socialEra(s.year);
  return section(era ? t(l('Redes sociais', 'Social media')) : t(l('Cartas de fãs e colunas de fofoca', 'Fan letters and gossip columns')),
    h('div', { class: 'row' },
      select(feedAct, [{ value: '', label: t(l('Todos', 'All')) }, ...ids.map((id) => ({ value: id, label: s.acts[id].name }))], (v) => { feedAct = v; rerender(); }, { 'aria-label': t(l('Filtrar por ato', 'Filter by act')) }),
    ),
    ids.length ? h('div', { class: 'ppl-badges' }, ids.slice(0, 8).map((id) => {
      const se = sentimentOf(s, id);
      return se.n ? h('div', { style: 'min-width:14rem' }, meter('heart', `${s.acts[id].name} (${se.n})`, Math.round((se.avg + 1) * 50))) : null;
    })) : null,
    posts.length ? h('ul', { class: 'ppl-feed' }, posts.map((p) => h('li', { class: `${p.role} ${p.sentiment > 0.2 ? 'pos' : p.sentiment < -0.2 ? 'neg' : ''}` },
      h('div', { class: 'au' }, p.author, ' ', h('span', { class: 'pill' }, t({ fan: l('fã', 'fan'), hater: l('hater', 'hater'), journalist: l('imprensa', 'press'), artist: l('artista', 'artist'), gossip: l('fofoca', 'gossip'), letter: l('carta', 'letter') }[p.role]))),
      h('div', null, t(p.text)),
      h('div', { class: 'meta' }, h('span', null, `${p.year}`), p.likes ? h('span', null, `♥ ${N(p.likes)}`) : null, p.actId ? actLink(s, p.actId) : null),
    ))) : h('p', { class: 'muted' }, t(l('Ninguém falando de vocês ainda.', 'Nobody is talking about you yet.'))),
  );
}

let groupBy: GroupBy = 'genre';

/** Diagrama: grupos em círculo, atos como nós, arestas de amizade (verde) e rixa (vermelho tracejado). */
export function socialDiagram(s: GameState): HTMLElement {
  const groups = cliques(s, groupBy);
  const W = 640;
  const H = 380;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t(l('Mapa social do elenco', 'Roster social map')));
  const pos: Record<string, { x: number; y: number }> = {};
  const G = groups.length || 1;
  groups.forEach((g, gi) => {
    const ang = (gi / G) * Math.PI * 2 - Math.PI / 2;
    const cx = W / 2 + (G > 1 ? Math.cos(ang) * 190 : 0);
    const cy = H / 2 + (G > 1 ? Math.sin(ang) * 120 : 0);
    const rr = Math.min(70, 22 + g.acts.length * 9);
    const hull = document.createElementNS(ns, 'circle');
    hull.setAttribute('cx', String(cx));
    hull.setAttribute('cy', String(cy));
    hull.setAttribute('r', String(rr + 14));
    hull.setAttribute('class', 'hull');
    svg.appendChild(hull);
    const lbl = document.createElementNS(ns, 'text');
    lbl.setAttribute('x', String(cx));
    lbl.setAttribute('y', String(cy - rr - 18));
    lbl.setAttribute('text-anchor', 'middle');
    lbl.textContent = t(g.label);
    svg.appendChild(lbl);
    g.acts.forEach((id, i) => {
      const a = (i / Math.max(1, g.acts.length)) * Math.PI * 2;
      pos[id] = { x: cx + (g.acts.length > 1 ? Math.cos(a) * rr : 0), y: cy + (g.acts.length > 1 ? Math.sin(a) * rr : 0) };
    });
  });
  const ids = Object.keys(pos);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const b = bond(s, ids[i], ids[j]);
      if (Math.abs(b) < 30) continue;
      const e = document.createElementNS(ns, 'line');
      e.setAttribute('x1', String(pos[ids[i]].x));
      e.setAttribute('y1', String(pos[ids[i]].y));
      e.setAttribute('x2', String(pos[ids[j]].x));
      e.setAttribute('y2', String(pos[ids[j]].y));
      e.setAttribute('class', `edge ${b > 0 ? 'friend' : 'feud'}`);
      e.setAttribute('stroke-width', String(1 + Math.abs(b) / 30));
      svg.appendChild(e);
    }
  }
  const lead = rosterLeader(s);
  for (const id of ids) {
    const a = s.acts[id];
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', String(pos[id].x));
    c.setAttribute('cy', String(pos[id].y));
    c.setAttribute('r', String(6 + Math.min(10, a.fame / 8)));
    let hue = 0;
    for (const ch of familyOf(a.genre)) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
    c.setAttribute('fill', `hsl(${hue} 55% 55%)`);
    c.setAttribute('class', `node ${groups.some((g) => g.leader === id) ? 'lead' : ''}`);
    const tt = document.createElementNS(ns, 'title');
    tt.textContent = a.name;
    c.appendChild(tt);
    svg.appendChild(c);
    const tx = document.createElementNS(ns, 'text');
    tx.setAttribute('x', String(pos[id].x + 10));
    tx.setAttribute('y', String(pos[id].y + 4));
    tx.textContent = (id === lead ? '★ ' : '') + a.name;
    svg.appendChild(tx);
  }
  const friends: [string, string, number][] = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) { const b = bond(s, ids[i], ids[j]); if (Math.abs(b) >= 30) friends.push([ids[i], ids[j], b]); }
  return section(t(l('Hierarquia e panelinhas', 'Hierarchy and cliques')),
    h('div', { class: 'row' }, t(l('Agrupar por', 'Group by')), ' ',
      select(groupBy, (Object.keys(GROUP_NAME) as GroupBy[]).map((g) => ({ value: g, label: t(GROUP_NAME[g]) })), (v) => { groupBy = v; rerender(); })),
    ids.length ? h('div', { class: 'ppl-social' }, svg as unknown as HTMLElement) : h('p', { class: 'muted' }, t(l('Sem elenco.', 'No roster.'))),
    lead ? h('p', { class: 'small' }, '★ ', t(l('Líder de vestiário: ', 'Locker-room leader: ')), actLink(s, lead), ' — ', t(l('o humor dele contamina o grupo.', 'their mood spreads to the group.'))) : null,
    h('ul', { class: 'small' },
      groups.filter((g) => g.leader).map((g) => h('li', null, h('b', null, t(g.label)), ': ', t(l('líder', 'leader')), ' ', actLink(s, g.leader!), ` (${g.acts.length})`)),
      friends.map(([a, b, v]) => h('li', { class: v > 0 ? 'good' : 'bad' }, actLink(s, a), v > 0 ? ' 🤝 ' : ' ⚔ ', actLink(s, b), ` (${Math.round(v)})`)),
      ids.map((id) => activeRomance(s, id)).filter(Boolean).map((ro) => h('li', null, '❤ ', `${s.persons[ro!.a]?.name} + ${s.persons[ro!.b]?.name}`, ' — ', actLink(s, ro!.actId))),
    ),
  );
}
