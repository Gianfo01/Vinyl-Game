// Interface da rodada 9: laços duradouros (duplas, casais, supergrupos, alianças, cruzamentos,
// padrinhos), admiração, movimentos completos (páginas com camadas, linha do tempo e obras), rede de
// relações em SVG e a aba "Relações & Movimentos" no hub do mundo.

import { CITIES, cityById, genreById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Act, GameState } from '../../sim/types';
import { playerActs, rngOf } from '../../sim/util';
import { $, actLink, modal, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { ACT_HEAD_EXTRAS, ACT_TABS, PERSON_TABS, openActPage, openPersonPage } from '../pages';
import {
  BOND_NAME, END_NAME, EPI_NAME, PLAYER_KINDS, activeBonds, admiration, bondChance, bondCost, bondTitle, bonds, bondsOfAct, bondsOfPerson, leaveBond, opinionsOf, proposeBond,
  type Bond, type BondKind,
} from '../../sim/sys/bonds9';
import {
  FOUND_COST, MV_END_NAME, PHASE_NAME, TIER_NAME, enemyKind, foundChance, foundMovement, leaveMovement, members, memberAffinity, mov9, movX, mvById, requestJoin, tierOf, type FoundSpec, type MvTier,
} from '../../sim/sys/movements9';
import { actTies, actOfPerson, social } from '../../sim/sys/social8';

const mine = (s: GameState, a?: Act) => !!a && (a.owner === 'player' || !!a.playerBand);
const myActs = (s: GameState) => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a && a.members.length > 0 && a.status !== 'split' && a.status !== 'retired');
const liveActs = (s: GameState) => Object.values(s.acts).filter((a) => (a.status === 'active' || a.status === 'emerging') && !a.deceased && a.members.length > 0);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const band = (p: number) => (p >= 0.6 ? 'good' : p >= 0.3 ? 'warn' : 'bad');
const esc = (x: string) => x.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const KIND_CLS: Record<BondKind, string> = { duo: 'good', couple: 'gold', super: 'gold', ally: 'good', cross: 'warn', patron: 'gold' };

// ================================================================== laços

function bondRow(s: GameState, b: Bond, close: () => void): HTMLElement {
  return h('li', null,
    pill(t(BOND_NAME[b.k]), KIND_CLS[b.k]), ' ',
    h('b', null, bondTitle(s, b)), b.real ? h('small', { class: 'muted' }, ' ★') : null, ' ',
    ...b.p.slice(0, 5).map((p) => h('button', { class: 'link small', onclick: () => { close(); openPersonPage(p); } }, s.persons[p]?.name ?? '?')),
    b.act ? h('span', null, ' → ', actLink(s, b.act)) : null, ' ',
    b.end ? h('small', { class: 'muted' }, ` ${b.y}–${b.end.y} · ${t(END_NAME[b.end.c])}${b.end.ep ? ` · ${t(EPI_NAME[b.end.ep])}` : ''}`) : h('span', null, bar(b.str, 100, b.str > 40 ? 'good' : 'warn'), h('small', { class: 'muted' }, ` ${t(l('desde', 'since'))} ${b.y} · ${t(l('obras', 'works'))} ${b.works}`)),
    b.pl && !b.end ? h('button', { class: 'btn small ghost', onclick: () => { leaveBond(s, rngOf(s), b.id); rerender(); close(); } }, t(l('Encerrar', 'End'))) : null,
    b.hist.length > 1 ? h('details', null, h('summary', { class: 'small muted' }, t(l('História', 'History'))), h('ul', { class: 'small' }, b.hist.map((x) => h('li', null, `${x.y} · `, t(x.t))))) : null,
  );
}

export function openBondModal(s: GameState, pre: { mine?: string; other?: string; k?: BondKind } = {}): void {
  const hosts = myActs(s);
  if (!hosts.length) { toast(t(l('Você precisa de um artista no elenco.', 'You need an act on your roster.')), 'bad'); return; }
  const o = { mine: pre.mine && hosts.some((x) => x.id === pre.mine) ? pre.mine : hosts[0].id, k: pre.k ?? 'ally' as BondKind, others: [pre.other ?? '', '', ''] };
  const box = h('div');
  let close = () => {};
  const draw = () => {
    const M = s.acts[o.mine];
    const targets = liveActs(s).filter((a) => !mine(s, a)).map((a) => ({ a, v: admiration(s, a.leaderId ?? a.members[0], M.id) + a.fame / 2 })).sort((x, y) => y.v - x.v).slice(0, 50).map((x) => x.a);
    if (o.others[0] && s.acts[o.others[0]] && !targets.includes(s.acts[o.others[0]])) targets.unshift(s.acts[o.others[0]]);
    if (!o.others[0]) o.others[0] = targets[0]?.id ?? '';
    const n = o.k === 'super' ? 3 : 1;
    const ids = o.others.slice(0, n).filter(Boolean);
    const cost = ids.reduce((x, id) => x + bondCost(s, o.k, id).cost, 0);
    const opt = targets.map((a) => ({ value: a.id, label: `${a.name} · ${t(l('fama', 'fame'))} ${Math.round(a.fame)} · ${t(l('admira você', 'admires you'))} ${admiration(s, a.leaderId ?? a.members[0], M.id)}` }));
    box.replaceChildren(h('div', { class: 'form' },
      h('label', null, t(l('Seu artista', 'Your act')), select(o.mine, hosts.map((a) => ({ value: a.id, label: a.name })), (v) => { o.mine = v; draw(); })),
      h('label', null, t(l('Tipo de laço', 'Bond type')), select(o.k, PLAYER_KINDS.map((k) => ({ value: k, label: t(BOND_NAME[k]) })), (v) => { o.k = v; draw(); })),
      ...Array.from({ length: n }, (_, i) => h('label', null, `${t(l('Com', 'With'))} ${n > 1 ? i + 1 : ''}`, select(o.others[i] || '', [{ value: '', label: '—' }, ...opt], (v) => { o.others[i] = v; draw(); }))),
      h('div', { class: 'eval' },
        ...ids.map((id) => h('div', null, `${s.acts[id]?.name}: `, pill(pct(bondChance(s, o.k, o.mine, id)), band(bondChance(s, o.k, o.mine, id))), ' ', h('small', { class: 'muted' }, t(bondCost(s, o.k, id).text)))),
        h('p', null, `${t(l('Custo', 'Cost'))}: ${$(cost)}`),
        h('p', { class: 'muted small' }, t(KIND_HELP[o.k]))),
    ));
  };
  draw();
  const reply = h('div');
  close = modal(t(l('Propor laço artístico', 'Propose an artistic bond')), h('div', null, box, h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => {
      const res = proposeBond(s, rngOf(s), o.k, o.mine, o.others.slice(0, o.k === 'super' ? 3 : 1).filter(Boolean));
      if (res.ok) { toast(t(res.text), 'good'); close(); rerender(); } else reply.replaceChildren(h('p', { class: 'bad' }, t(res.text)));
    } }, t(l('Propor', 'Propose'))), reply)), { wide: true });
}

const KIND_HELP: Record<BondKind, L> = {
  duo: l('Créditos conjuntos e músicas melhores; quebra com ego ou fama desigual.', 'Joint credits and better songs; breaks over ego or unequal fame.'),
  couple: l('Precisa de romance entre os dois. Discos e turnês a dois; um divórcio arrasta os dois.', 'Needs a romance between them. Joint albums and tours; a divorce drags both down.'),
  super: l('Projeto paralelo com prazo (3 anos), com nomes de outros atos. Pode voltar em reuniões.', 'Side project with a term (3 years), with names from other acts. Can return for reunions.'),
  ally: l('Uma ou duas faixas: os públicos se aproximam e há chance de hit.', 'One or two tracks: audiences come closer and there is a hit chance.'),
  cross: l('Une públicos distantes: risco alto, prêmio alto. Pode nascer um subgênero híbrido.', 'Merges distant audiences: high risk, high reward. A hybrid subgenre may be born.'),
  patron: l('O mais famoso apadrinha o outro: fama e impulso para o protegido.', 'The more famous one sponsors the other: fame and momentum for the protégé.'),
};

// ================================================================== rede (SVG simples)

const EDGE: Record<string, string> = { friend: '#3a9d5d', collab: '#3a9d5d', mentor: '#c9a227', romance: '#d94f8a', rival: '#e09f3e', feud: '#d62828', bond: '#4361ee', mv: '#8d99ae' };

export function networkSvg(s: GameState, act: Act): HTMLElement {
  const nodes = new Map<string, { kind: string; v: number }>();
  for (const { t: x, other } of actTies(s, act)) {
    const A = actOfPerson(s, other);
    if (!A || A.id === act.id) continue;
    const cur = nodes.get(A.id);
    if (!cur || Math.abs(x.v) > Math.abs(cur.v)) nodes.set(A.id, { kind: x.k, v: x.v });
  }
  for (const b of bondsOfAct(s, act)) for (const id of [...b.a, b.act ?? '']) if (id && id !== act.id && s.acts[id]) nodes.set(id, { kind: 'bond', v: b.str });
  const tm = tierOf(s, act.id);
  if (tm) for (const id of members(tm.x).slice(0, 8)) if (id !== act.id && s.acts[id] && !nodes.has(id)) nodes.set(id, { kind: 'mv', v: 20 });
  const list = [...nodes.entries()].sort((a, b) => Math.abs(b[1].v) - Math.abs(a[1].v)).slice(0, 14);
  const W = 360, R = 130, cx = W / 2, cy = W / 2;
  let svg = `<svg viewBox="0 0 ${W} ${W}" width="100%" style="max-width:${W}px" role="img" aria-label="${esc(t(l('Rede de relações', 'Relationship network')))}">`;
  list.forEach(([id, n], i) => {
    const ang = (i / list.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
    svg += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${EDGE[n.kind] ?? '#999'}" stroke-width="${(1 + Math.abs(n.v) / 30).toFixed(1)}"${n.kind === 'mv' ? ' stroke-dasharray="4 3"' : ''}/>`;
  });
  list.forEach(([id], i) => {
    const ang = (i / list.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(ang) * R, y = cy + Math.sin(ang) * R;
    const nm = s.acts[id].name;
    svg += `<g data-act="${esc(id)}" style="cursor:pointer"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="var(--panel,#fff)" stroke="currentColor"/><text x="${x.toFixed(1)}" y="${(y + (y < cy ? -11 : 19)).toFixed(1)}" text-anchor="middle" font-size="10" fill="currentColor">${esc(nm.length > 18 ? nm.slice(0, 17) + '…' : nm)}</text></g>`;
  });
  svg += `<circle cx="${cx}" cy="${cy}" r="12" fill="currentColor"/><text x="${cx}" y="${cy + 28}" text-anchor="middle" font-size="12" font-weight="bold" fill="currentColor">${esc(act.name)}</text></svg>`;
  const div = h('div', { class: 'net9' });
  div.innerHTML = svg;
  div.addEventListener('click', (e) => { const g = (e.target as Element).closest('[data-act]'); if (g) openActPage(g.getAttribute('data-act')!); });
  const legend = h('p', { class: 'small muted' }, ...[['friend', l('amizade/parceria', 'friendship/collab')], ['romance', l('romance', 'romance')], ['mentor', l('mentoria', 'mentorship')], ['rival', l('rivalidade', 'rivalry')], ['feud', l('rixa', 'feud')], ['bond', l('laço duradouro', 'durable bond')], ['mv', l('movimento', 'movement')]]
    .map(([k, n]) => h('span', { style: `color:${EDGE[k as string]};margin-right:8px` }, `● ${t(n as L)}`)));
  return list.length ? h('div', null, div, legend) : h('p', { class: 'muted small' }, t(l('Sem conexões ainda.', 'No connections yet.')));
}

// ================================================================== movimentos

const TIER_ORDER: MvTier[] = ['founder', 'core', 'peri', 'symp'];
const TIER_KEY = { founder: 'founders', core: 'core', peri: 'peri', symp: 'symp' } as const;

export function openMovementPage(s: GameState, id: string): void {
  const mv = mvById(s, id);
  if (!mv) return;
  const x = movX(s, mv);
  let close = () => {};
  const go = (aid: string) => { close(); openActPage(aid); };
  const reply = h('div');
  const join = myActs(s).filter((a) => { const tt = tierOf(s, a.id); return !tt || tt.tier === 'symp'; });
  const body = h('div', null,
    h('p', null, pill(t(PHASE_NAME[x.phase]), x.phase === 'death' ? 'bad' : x.phase === 'peak' || x.phase === 'canon' ? 'gold' : ''), ' ',
      `${t(cityById[mv.city]?.name ?? l(mv.city))} · ${x.parents.map((g) => t(genreById[g]?.name ?? l(g))).join(' + ')} · ${t(l('desde', 'since'))} ${mv.born}`,
      x.end ? ` · ${t(l('fim', 'end'))} ${x.end.y} (${t(MV_END_NAME[x.end.c])})` : ''),
    h('blockquote', null, '“', t(x.idea), '”'),
    h('div', null, t(l('Força', 'Strength')), ' ', bar(mv.strength, 100, 'good'), ` ${Math.round(mv.strength)} · ${t(l('pico', 'peak'))} ${Math.round(x.peak)} · ${t(mv.fashion)}`),
    x.enemies.length ? h('p', null, h('b', null, t(l('Inimigos', 'Enemies')), ': '), x.enemies.map((e) => `${t(e.n)} (${t(enemyKind(e.k))})`).join(' · ')) : null,
    h('h4', null, t(l('Integrantes', 'Members'))),
    ...TIER_ORDER.map((tr) => x[TIER_KEY[tr]].length ? h('p', null, pill(t(TIER_NAME[tr])), ' ', ...x[TIER_KEY[tr]].flatMap((aid) => s.acts[aid] ? [h('button', { class: 'link', onclick: () => go(aid) }, s.acts[aid].name), ' '] : [])) : null),
    x.works.length ? h('div', null, h('h4', null, t(l('Obras marcantes', 'Landmark works'))), h('ul', { class: 'small' }, x.works.map((w) => h('li', null, `${w.y} · "${w.t}" — ${s.acts[w.a]?.name ?? '?'} (Q ${w.q})`)))) : null,
    h('h4', null, t(l('Linha do tempo', 'Timeline'))),
    h('ul', { class: 'small' }, x.hist.map((e) => h('li', null, `${e.y} · `, t(e.t)))),
    join.length && x.phase !== 'death' && x.phase !== 'canon' ? h('div', { class: 'row' }, ...join.map((a) => h('button', { class: 'btn small', onclick: () => { const res = requestJoin(s, mv.id, a.id); reply.replaceChildren(h('p', { class: res.ok ? 'good' : 'bad' }, t(res.text))); if (res.ok) rerender(); } }, `${t(l('Pedir entrada', 'Request to join'))}: ${a.name}`))) : null,
    h('div', { class: 'row' }, ...myActs(s).filter((a) => members(x).includes(a.id)).map((a) => h('button', { class: 'btn small ghost', onclick: () => { leaveMovement(s, a.id); close(); rerender(); } }, `${t(l('Sair do movimento', 'Leave the movement'))}: ${a.name}`))),
    reply,
  );
  close = modal(t(mv.name), body, { wide: true });
}

function mvLabel(s: GameState, a: Act): HTMLElement | null {
  const tm = tierOf(s, a.id);
  if (!tm) return null;
  return h('button', { class: 'btn small ghost', onclick: () => openMovementPage(s, tm.mv.id) }, `${t(l('Movimento', 'Movement'))}: ${t(tm.mv.name)} (${t(TIER_NAME[tm.tier])})`);
}

export function openFoundModal(s: GameState): void {
  const hosts = myActs(s);
  if (!hosts.length) { toast(t(l('Você precisa de um artista no elenco.', 'You need an act on your roster.')), 'bad'); return; }
  const o: FoundSpec = { name: '', idea: '', city: hosts[0].city, genre: hosts[0].genre, acts: [hosts[0].id], allies: [] };
  const box = h('div');
  let close = () => {};
  const draw = () => {
    const allyOpts = liveActs(s).filter((a) => !mine(s, a) && !tierOf(s, a.id)).map((a) => ({ a, v: o.acts.reduce((x, id) => x + admiration(s, a.leaderId ?? a.members[0], id), 0) + (a.city === o.city ? 15 : 0) })).sort((x, y) => y.v - x.v).slice(0, 30);
    const p = foundChance(s, o);
    box.replaceChildren(h('div', { class: 'form' },
      h('label', null, t(l('Nome', 'Name')), h('input', { type: 'text', maxlength: 40, value: o.name, oninput: (e: Event) => { o.name = (e.target as HTMLInputElement).value; } })),
      h('label', null, t(l('Ideia / manifesto', 'Idea / manifesto')), h('input', { type: 'text', maxlength: 160, value: o.idea, oninput: (e: Event) => { o.idea = (e.target as HTMLInputElement).value; } })),
      h('label', null, t(l('Cidade', 'City')), select(o.city, CITIES.map((c) => ({ value: c.id, label: t(c.name) })), (v) => { o.city = v; draw(); })),
      h('label', null, t(l('Gênero de origem', 'Parent genre')), select(o.genre, [...new Set(hosts.map((a) => a.genre))].map((g) => ({ value: g, label: t(genreById[g]?.name ?? l(g)) })), (v) => { o.genre = v; draw(); })),
      h('div', null, t(l('Seus atos fundadores', 'Your founding acts')), ...hosts.map((a) => h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: o.acts.includes(a.id), onchange: (e: Event) => { o.acts = (e.target as HTMLInputElement).checked ? [...o.acts, a.id] : o.acts.filter((x) => x !== a.id); draw(); } }), ` ${a.name}`))),
      h('div', null, t(l('Aliados convidados (até 4)', 'Invited allies (up to 4)')), ...[0, 1, 2, 3].map((i) => select(o.allies[i] ?? '', [{ value: '', label: '—' }, ...allyOpts.map((x) => ({ value: x.a.id, label: `${x.a.name} (${t(cityById[x.a.city]?.name ?? l(x.a.city))})` }))], (v) => { const al = o.allies.slice(); al[i] = v; o.allies = al.filter(Boolean); draw(); }))),
      h('div', { class: 'eval' }, t(l('Chance de pegar', 'Chance to catch on')), ': ', pill(pct(p), band(p)), ` · ${t(l('Custo', 'Cost'))} ${$(FOUND_COST)}`,
        h('p', { class: 'muted small' }, t(l('Pesa: momento cultural do gênero, força da cena na cidade, obras fortes recentes, sua reputação com a crítica, quantos são da cidade e aliados (que só entram se admiram vocês).', 'What matters: the genre\'s cultural moment, the city scene, strong recent works, your critical reputation, how many are local and allies (who only join if they admire you).')))),
    ));
  };
  draw();
  const reply = h('div');
  close = modal(t(l('Fundar um movimento', 'Start a movement')), h('div', null, box, h('div', { class: 'actions' },
    h('button', { class: 'btn primary', onclick: () => {
      const res = foundMovement(s, rngOf(s), o);
      if (res.ok) { toast(t(res.text), 'good'); close(); rerender(); if (res.id) openMovementPage(s, res.id); } else { reply.replaceChildren(h('p', { class: 'bad' }, t(res.text))); rerender(); }
    } }, t(l('Lançar o manifesto', 'Launch the manifesto'))), reply)), { wide: true });
}

// ================================================================== páginas de ato e pessoa

ACT_HEAD_EXTRAS.push((s, a) => mvLabel(s, a));

ACT_TABS.push((s, a, close) => {
  const bs = bondsOfAct(s, a);
  const tm = tierOf(s, a.id);
  const lead = a.leaderId && a.members.includes(a.leaderId) ? a.leaderId : a.members[0];
  return {
    id: 'bonds9', label: l('Laços e movimento', 'Bonds and movement'), icon: 'handshake',
    render: () => h('div', null,
      myActs(s).length && (a.status === 'active' || a.status === 'emerging') ? h('div', { class: 'row' }, h('button', { class: 'btn small primary', onclick: () => { close(); openBondModal(s, mine(s, a) ? { mine: a.id } : { other: a.id }); } }, t(l('Propor laço artístico', 'Propose an artistic bond')))) : null,
      tm ? h('div', null, h('h4', null, t(l('Movimento', 'Movement'))), mvLabel(s, a),
        h('ul', { class: 'small' }, memberAffinity(s, a.id).slice(0, 6).map((x) => h('li', null, actLink(s, x.act.id), ` · ${t(l('afinidade', 'affinity'))} `, pill(`${x.v > 0 ? '+' : ''}${x.v}`, x.v > 10 ? 'good' : x.v < -10 ? 'bad' : ''))))) : null,
      h('h4', null, t(l('Laços duradouros', 'Durable bonds'))),
      bs.length ? h('ul', { class: 'attr-list' }, bs.slice(0, 12).map((b) => bondRow(s, b, close))) : h('p', { class: 'muted small' }, t(l('Nenhum laço duradouro ainda.', 'No durable bonds yet.'))),
      lead ? opinionsBlock(s, lead, close) : null,
      h('h4', null, t(l('Rede de relações', 'Relationship network'))), networkSvg(s, a),
    ),
  };
});

function opinionsBlock(s: GameState, pid: string, close: () => void): HTMLElement | null {
  const op = opinionsOf(s, pid);
  if (!op.top.length && !op.low.length) return null;
  const row = (x: { act: Act; v: number }) => h('li', null, h('button', { class: 'link', onclick: () => { close(); openActPage(x.act.id); } }, x.act.name), ' ', pill(`${x.v > 0 ? '+' : ''}${x.v}`, x.v > 0 ? 'good' : 'bad'));
  return h('div', null, h('h4', null, `${t(l('Opiniões de', 'Opinions of'))} ${s.persons[pid]?.name ?? ''}`),
    op.top.length ? h('div', null, h('small', { class: 'muted' }, t(l('Admira', 'Admires'))), h('ul', { class: 'small' }, op.top.map(row))) : null,
    op.low.length ? h('div', null, h('small', { class: 'muted' }, t(l('Torce o nariz para', 'Looks down on'))), h('ul', { class: 'small' }, op.low.map(row))) : null);
}

PERSON_TABS.push((s, p, closeAll) => {
  const bs = bondsOfPerson(s, p.id);
  const A = actOfPerson(s, p.id);
  if (!bs.length && (!A || A.fame < 10)) return null;
  return {
    id: 'bonds9p', label: l('Laços e opiniões', 'Bonds and opinions'), icon: 'handshake',
    render: () => h('div', null,
      bs.length ? h('ul', { class: 'attr-list' }, bs.map((b) => bondRow(s, b, closeAll))) : null,
      opinionsBlock(s, p.id, closeAll) ?? h('p', { class: 'muted small' }, t(l('Sem opiniões fortes.', 'No strong opinions.')))),
  };
});

// ================================================================== aba "Relações & Movimentos"

export function relTab(s: GameState): HTMLElement {
  const st = mov9(s);
  const mvs = s.movements.map((mv) => ({ mv, x: st.m[mv.id] })).filter((m) => m.x).sort((a, b) => Number(a.x.phase === 'death' || a.x.phase === 'canon') - Number(b.x.phase === 'death' || b.x.phase === 'canon') || b.mv.strength - a.mv.strength);
  const act = activeBonds(s).sort((a, b) => (b.pl ?? 0) * 100 + (b.real ?? 0) * 50 + b.str - ((a.pl ?? 0) * 100 + (a.real ?? 0) * 50 + a.str));
  const ended = bonds(s).list.filter((b) => b.end).sort((a, b) => b.end!.y - a.end!.y).slice(0, 15);
  const nws = [...bonds(s).news, ...social(s).news].sort((a, b) => b.y - a.y).slice(0, 10);
  const noop = () => {};
  return h('div', null,
    h('div', { class: 'row' },
      h('button', { class: 'btn small primary', onclick: () => openBondModal(s) }, t(l('Propor laço artístico', 'Propose an artistic bond'))),
      h('button', { class: 'btn small', onclick: () => openFoundModal(s) }, t(l('Fundar um movimento', 'Start a movement')))),
    section(t(l('Movimentos', 'Movements')), mvs.length ? h('ul', { class: 'attr-list' }, mvs.slice(0, 30).map(({ mv, x }) => h('li', null,
      h('button', { class: 'link', onclick: () => openMovementPage(s, mv.id) }, t(mv.name)), ' ',
      pill(t(PHASE_NAME[x.phase]), x.phase === 'death' ? 'bad' : x.phase === 'peak' ? 'gold' : ''), x.pl ? pill(t(l('seu', 'yours')), 'good') : null, ' ',
      bar(mv.strength, 100, 'good'),
      h('small', { class: 'muted' }, ` ${t(cityById[mv.city]?.name ?? l(mv.city))} · ${mv.born} · ${members(x).length} ${t(l('artistas', 'artists'))}${x.end ? ` · ${t(MV_END_NAME[x.end.c])}` : ''}`)))) : h('p', { class: 'muted small' }, t(l('Nenhum movimento por enquanto.', 'No movements yet.')))),
    section(t(l('Laços duradouros ativos', 'Active durable bonds')), act.length ? h('ul', { class: 'attr-list' }, act.slice(0, 30).map((b) => bondRow(s, b, noop))) : h('p', { class: 'muted small' }, t(l('Nenhum.', 'None.')))),
    ended.length ? section(t(l('Laços que acabaram', 'Bonds that ended')), h('ul', { class: 'attr-list' }, ended.map((b) => bondRow(s, b, noop)))) : h('span'),
    nws.length ? section(t(l('Na cena', 'On the scene')), h('ul', { class: 'small' }, nws.map((n) => h('li', null, `${n.y} · `, t(n.t))))) : h('span'),
  );
}


