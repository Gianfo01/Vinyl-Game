// R31 · onda 4 (I + S) — INTERIORES EM CENA (DOM). O corte em pixel art do lugar (interior27) passa a ser uma cena da
// onda 2 (scene31): pessoas e objetos clicáveis com dica, rótulos, "mostrar tudo que é clicável", lista acessível,
// painel rápido no clique direito — e o SEU personagem lá dentro. A ação se resolve no painel curto embaixo da cena
// (1 clique depois de entrar); "Abrir a tela" fica para o detalhe. Fachadas levam à sala dos fundos; a facção com
// convite aberto mostra o baile; a delegacia mostra as celas; o beco, o mercado negro.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { doPlace27, GO27, type PAct27, type Person27 } from '../../sim/sys/place27';
import { jobLog31, jobOf31, meetHere31, scoutHere31 } from '../../sim/sys/gente31';
import { where31 } from '../../sim/sys/where31';
import {
  BAILE_WAYS31, CASE_WAYS31, PLEA31, ROOM_ACTS31, bail31, baile31, bailCost31, bailes31, bmLock31, bmRows31, buyBm31, caseWay31, cellLock31, cells31, denounce31,
  detective31, facadeOf31, lawyer31, lawyerCost31, myFile31, police31, room31, rowAct31, visitCell31, type BaileWay31,
} from '../../sim/sys/under31';
import { doMob29, mobActs29, METER29 } from '../../sim/sys/mob29';
import { usd } from '../../sim/sys/crime17';
import { inspect, rerender, toast } from '../common';
import { h } from '../dom';
import { drawInterior27 } from '../pixel/interior27';
import { lookOf } from '../pixel/avatar';
import { bindZoomOut27 } from '../ps/zoom27';
import { go18 } from '../sys/inbox18';
import { openFicha13 } from '../sys/persona13';
import { shop31Tab } from './shop31';
import { lockBtn31, quickBtn31 } from './lock31';
import { sceneView31 } from './scene31';
import { INSIDE_W31, infoLines31, insideModel31, type InsideM31, type InsideT31 } from './inside31model';
import './inside31.css';

/** Painel aberto e sala dos fundos (só na sessão: explorar não muda o mundo). */
const ui31: { at?: string; panel?: string; room?: string } = {};
const $v = (c: number): string => t(usd(c));

function result(r: { ok: boolean; text: L } | L): void {
  const x = 'ok' in r ? r : { ok: true, text: r };
  toast(t(x.text), x.ok ? 'good' : 'bad');
  rerender();
}

const li = (xs: L[]): HTMLElement => h('ul', { class: 'in31-lines' }, xs.map((x) => h('li', null, t(x))));
const btn = (label: L, lock: L | null | undefined, on: () => void, primary = false): HTMLElement =>
  lockBtn31(t(label), lock ?? null, on, { cls: `btn small${primary ? ' primary' : ''}` });

/** Ficha de quem é: integrante ('p:'), CEO ('l:'), chefe de facção ('o:'), equipe. */
function openWho(p: Person27): void {
  if (p.key) openFicha13(p.key);
  else if (p.pid) inspect.person(p.pid);
  else if (p.actId) inspect.act(p.actId);
}

// ---------------------------------------------------------------- painéis

function whoPanel(s: GameState, m: InsideM31, p: Person27): HTMLElement {
  const job = p.pid ? jobOf31(s, p.pid) : null;
  const w = p.pid ? where31(s, p.pid) : null;
  const a = p.actId ? s.acts[p.actId] : undefined;
  const canScout = !!a && a.owner !== 'player' && !s.knowledge[a.id];
  const key = p.key ?? (p.pid ? `p:${p.pid}` : undefined);
  return h('div', { class: 'in31-pn' },
    h('h4', null, p.name), h('p', { class: 'small' }, t(job ? job.line : p.role)),
    w && w.k !== 'here' ? h('p', { class: 'small muted' }, t(w.why)) : null,
    p.bico ? h('p', { class: 'small' }, '♪ ', t(l('Faz bico aqui e toca na noite: se assinar com alguém (você ou um rival) ou passar a viver de música, larga o emprego.', 'Moonlights here and plays at night: if they sign (with you or a rival) or start living off music, they quit the job.'))) : null,
    h('div', { class: 'row wrap' },
      p.pid || p.key || p.actId ? btn(l('Ver a ficha', 'See the card'), null, () => openWho(p), true) : null,
      key ? btn(l('Conhecer', 'Meet'), null, () => result(meetHere31(s, key))) : null,
      a ? btn(l('Pôr no radar (descobrir talento)', 'Put on the radar (discover talent)'), canScout ? null : a.owner === 'player' ? l('Esse artista já é seu.', 'That act is already yours.') : l('Já está no seu radar.', 'Already on your radar.'), () => result(scoutHere31(s, a.id))) : null,
      a ? quickBtn31({ kind: 'act', id: a.id }, a.name) : null));
}

function actPanel(s: GameState, m: InsideM31, x: InsideT31, id: string): HTMLElement {
  const acts: PAct27[] = m.acts.filter((a) => a.id === id || (id === 'show' && a.id === 'play') || (id === 'news' && a.id === 'interview'));
  const mine = playerActs(s).map((i) => s.acts[i]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');
  if (!x.place || !acts.length) return h('div', { class: 'in31-pn' }, h('p', { class: 'small muted' }, t(l('Nada a fazer aqui agora.', 'Nothing to do here right now.'))));
  return h('div', { class: 'in31-pn' },
    ...acts.map((a) => h('div', { class: 'in31-act' },
      h('b', null, t(a.label)), a.cost !== undefined ? h('span', { class: 'small' }, ` · ${$v(a.cost)}`) : null,
      h('p', { class: 'small muted' }, t(a.desc)),
      a.act && mine.length > 1
        ? h('div', { class: 'row wrap' }, mine.slice(0, 6).map((ac) => btn(l(ac.name, ac.name), a.dis, () => result(doPlace27(s, x.place!, a.id, ac.id)), true)))
        : btn(a.label, a.dis, () => result(doPlace27(s, x.place!, a.id)), true))));
}

function infoPanel(s: GameState, m: InsideM31, x: InsideT31, key: string): HTMLElement {
  const box = h('div', { class: 'in31-pn' });
  const add = (...xs: (HTMLElement | null)[]) => { for (const e of xs) if (e) box.append(e); };
  switch (key) {
    case 'cells': {
      const cs = cells31(s);
      add(h('h4', null, t(l('Celas', 'Cells'))));
      if (!cs.length) add(h('p', { class: 'small muted' }, t(l('Ninguém preso agora.', 'Nobody locked up right now.'))));
      for (const c of cs.slice(0, 8)) add(h('div', { class: 'in31-act' },
        h('button', { type: 'button', class: 'link', onclick: () => inspect.person(c.pid) }, c.name), c.mine ? h('span', { class: 'small good' }, ` · ${t(l('seu', 'yours'))}`) : null,
        h('p', { class: 'small muted' }, t(fmtL(l('{w} — faltam {n} semana(s).', '{w} — {n} week(s) left.'), { w: c.why, n: c.weeks }))),
        h('div', { class: 'row wrap' },
          btn(l('Visitar', 'Visit'), cellLock31(s, c.pid, 'visit'), () => result(visitCell31(s, c.pid))),
          btn(fmtL(l('Pagar fiança ({v})', 'Pay bail ({v})'), { v: usd(bailCost31(s, c)) }), cellLock31(s, c.pid, 'bail'), () => result(bail31(s, c.pid))),
          btn(fmtL(l('Advogado ({v})', 'Lawyer ({v})'), { v: usd(lawyerCost31(s)) }), cellLock31(s, c.pid, 'lawyer'), () => result(lawyer31(s, c.pid))))));
      break;
    }
    case 'file': {
      const f = myFile31(s);
      add(h('h4', null, t(fmtL(l('Sua pasta — detetive {d}', 'Your file — detective {d}'), { d: detective31(s) }))),
        li([fmtL(l('Calor no país: {h}/100.', 'Heat in the country: {h}/100.'), { h: f.heat }), ...(f.known.length ? f.known : [l('A polícia não tem nada contra você.', 'The police have nothing on you.')])]));
      for (const c of f.cases.filter((y) => y.stage === 'charged')) add(h('div', { class: 'row wrap' }, ...CASE_WAYS31.map((w) => h('span', { title: t(PLEA31[w.how].hint) }, btn(w.label, null, () => result(caseWay31(s, c.id, w.how)))))));
      break;
    }
    case 'heat': { const p = police31(s); add(li([fmtL(l('{a}: {t}', '{a}: {t}'), { a: p.agency, t: p.text }), fmtL(l('{n} viatura(s) na ronda.', '{n} patrol car(s) around.'), { n: p.cars })])); break; }
    case 'table': case 'safe': {
      const r = x.org ? room31(s, x.org) : null;
      if (!r) break;
      add(h('h4', null, t(fmtL(l('A mesa de {b}', '{b}\'s table'), { b: l(r.boss.name, r.boss.name) }))));
      if (key === 'safe') add(li((Object.keys(METER29) as (keyof typeof METER29)[]).map((k) => fmtL(l('{n}: {v}', '{n}: {v}'), { n: METER29[k], v: Math.round(r.meter[k]) }))));
      if (!r.rows.length) add(h('p', { class: 'small muted' }, t(l('Nenhum pedido nem envelope na mesa.', 'No requests or envelopes on the table.'))));
      for (const row of r.rows) add(h('div', { class: 'in31-act' }, h('b', null, t(row.title)), h('p', { class: 'small muted' }, t(row.meta)),
        h('div', { class: 'row wrap' }, row.acts.map((a) => btn(a.label, null, () => result(rowAct31(s, a.id)))))));
      const acts = mobActs29(s, r.o.id).filter((a) => (ROOM_ACTS31 as readonly string[]).includes(a.a.id));
      add(h('div', { class: 'row wrap' }, ...acts.map((a) => btn(a.cost ? fmtL(l('{n} ({v})', '{n} ({v})'), { n: a.a.name, v: usd(a.cost) }) : a.a.name, a.block, () => result(doMob29(s, r.o.id, a.a.id)))),
        btn(l('Denunciar', 'Report them'), null, () => result(denounce31(s, r.o.id)))));
      break;
    }
    case 'bm': {
      add(h('h4', null, t(l('No beco este mês', 'In the alley this month'))));
      const rows = bmRows31(s);
      if (!rows.length) add(h('p', { class: 'small muted' }, t(l('Nada circulando: volte na virada do mês.', 'Nothing going around: come back at the month turn.'))));
      for (const r of rows) add(h('div', { class: 'in31-act' }, h('b', null, t(r.name)), h('span', { class: 'small' }, ` · ${$v(r.price)}`),
        h('p', { class: 'small muted' }, t(r.note), ' ', t(fmtL(l('Risco de apreensão: {p}%.', 'Seizure risk: {p}%.'), { p: Math.round(r.risk * 100) }))),
        btn(l('Comprar', 'Buy'), bmLock31(s, r), () => result(buyBm31(s, r.id)), true)));
      break;
    }
    case 'baile': {
      const b = bailes31(s).find((y) => y.o.id === x.org);
      if (!b) { add(h('p', { class: 'small muted' }, t(l('Nenhum baile marcado com você.', 'No party booked with you.')))); break; }
      add(h('h4', null, t(fmtL(l('Baile de {o}', '{o} party'), { o: b.o.name }))),
        h('p', { class: 'small' }, t(fmtL(l('Seu artista no palco{a}; o chefe no camarote. Calor da polícia: {h}/100.', 'Your act on stage{a}; the boss in the VIP box. Police heat: {h}/100.'), { a: b.actId && s.acts[b.actId] ? l(` (${s.acts[b.actId].name})`, ` (${s.acts[b.actId].name})`) : l('', ''), h: b.police }))));
      add(h('div', { class: 'row wrap' }, ...(Object.keys(BAILE_WAYS31) as BaileWay31[]).map((w) => h('span', { title: t(BAILE_WAYS31[w].tip) }, btn(BAILE_WAYS31[w].label, null, () => result(baile31(s, b.askId, w)), w === 'play')))));
      break;
    }
    default: add(li(infoLines31(s, m, key, x)));
  }
  // atalhos ligados ao que se olha (descobrir talento, conhecer, marcar)
  if (key === 'stage' || key === 'bands' || key === 'live') for (const p of m.people.filter((y) => y.actId && !y.you && !y.staff && y.actId && s.acts[y.actId]?.owner !== 'player').slice(0, 4))
    add(h('div', { class: 'row wrap' }, h('span', { class: 'small' }, p.name), btn(l('Pôr no radar', 'Put on the radar'), s.knowledge[p.actId!] ? l('Já está no seu radar.', 'Already on your radar.') : null, () => result(scoutHere31(s, p.actId!)))));
  if (key === 'meet') for (const p of m.people.filter((y) => !y.you).slice(0, 5)) {
    const k = p.key ?? (p.pid ? `p:${p.pid}` : undefined);
    if (k) add(h('div', { class: 'row wrap' }, h('span', { class: 'small' }, `${p.name} — ${t(p.role)}`), btn(l('Conhecer', 'Meet'), null, () => result(meetHere31(s, k)))));
  }
  if (key === 'stage' && x.place) add(actPanel(s, m, x, 'show'));
  if (x.place && ['venue', 'records', 'studio', 'bar', 'radio', 'press', 'rehearsal', 'office', 'hotel', 'apartments', 'instruments'].includes(x.k)) {
    const log = jobLog31(s, x.place.k, 3);
    if (log.length) add(h('details', { class: 'small' }, h('summary', null, t(l('Quem entrou e saiu da equipe', 'Who joined and left the staff'))),
      li(log.map((e) => fmtL(e.in ? l('{n} entrou como {r}.', '{n} joined as {r}.') : l('{n} saiu ({w}).', '{n} left ({w}).'), { n: e.name, r: e.role, w: e.why ?? l('', '') })))));
  }
  return box;
}

function goPanel(s: GameState, x: InsideT31, dest: string, back: () => void): HTMLElement | null {
  if (dest === 'shop') return h('div', { class: 'in31-pn in31-shop' }, shop31Tab(s));
  const g = dest === 'labels' ? { area: 'labels' } : dest === 'office' ? { area: 'biz17' } : dest === 'own' ? GO27[x.k as keyof typeof GO27] ?? { area: 'campus18' } : { area: dest };
  back();
  go18(g);
  return null;
}

// ---------------------------------------------------------------- a cena

/** Interior em cena (substitui o corte antigo, mesma moldura do mapa). */
export function insideView31(s: GameState, x0: InsideT31, back: () => void, actions?: () => void): HTMLElement {
  if (ui31.at !== x0.id) { ui31.at = x0.id; ui31.panel = undefined; ui31.room = undefined; }
  // fachada: sala dos fundos (ao entrar pela porta) ou o baile (convite aberto)
  let x: InsideT31 = x0;
  if (x0.k === 'facade' && x0.org) {
    const r = room31(s, x0.org);
    const v = r ? facadeOf31(s, r.o) : undefined;
    const baile = bailes31(s).find((b) => b.o.id === x0.org);
    if (ui31.room === x0.id && r) x = { ...x0, k: 'backroom', name: t(fmtL(l('{n} — {b}', '{n} — {b}'), { n: l(x0.name, x0.name), b: l(r.boss.name, r.boss.name) })), people: [{ name: r.boss.name, role: r.boss.role, key: r.boss.key }, ...r.lts.map((y) => ({ name: y.name, role: y.role, key: y.key }))] };
    else if (baile && (v === 'barracao' || v === 'club')) {
      const a = baile.actId ? s.acts[baile.actId] : undefined;
      x = { ...x0, k: 'baile', v, people: [...(a ? a.members.slice(0, 3).map((pid) => ({ name: s.persons[pid]?.name ?? a.name, role: l('Seu artista no palco', 'Your act on stage'), pid, actId: a.id, mine: true })) : []), ...(r ? [{ name: r.boss.name, role: l('No camarote', 'In the VIP box'), key: r.boss.key }] : [])] };
    } else x = { ...x0, v };
  }
  const m = insideModel31(s, x);
  const pane = h('div', { class: 'in31-pane', 'aria-live': 'polite' });
  const show = (panel?: string) => {
    ui31.panel = panel;
    if (!panel) { pane.replaceChildren(h('p', { class: 'small muted' }, t(l('Clique numa pessoa ou num objeto.', 'Click a person or an object.')))); return; }
    const [k, arg = ''] = panel.split(':');
    let el: HTMLElement | null = null;
    if (k === 'who') { const p = m.people[+arg]; if (p) el = whoPanel(s, m, p); }
    else if (k === 'you') el = h('div', { class: 'in31-pn' }, h('p', null, t(m.you.where)), ...m.trail.map((y) => h('p', { class: 'small' }, '★ ', t(y))));
    else if (k === 'do') el = actPanel(s, m, x, arg);
    else if (k === 'info') el = infoPanel(s, m, x, arg);
    else if (k === 'go') el = goPanel(s, x, arg, back);
    else if (k === 'room') { ui31.room = arg === 'enter' ? x0.id : undefined; ui31.panel = undefined; rerender(); return; }
    const head = k === 'who' ? m.people[+arg]?.name ?? '' : t(m.spots.find((y) => y.go.panel === panel)?.label ?? l('', ''));
    if (el) pane.replaceChildren(h('div', { class: 'row in31-ph' }, h('b', { class: 'small' }, head),
      h('button', { type: 'button', class: 'icon', 'aria-label': t(l('Fechar', 'Close')), onclick: () => show() }, '✕')), el);
  };
  const panels: Record<string, (arg?: string) => void> = {};
  for (const k of ['who', 'you', 'do', 'info', 'go', 'room']) panels[k] = (arg?: string) => show(arg === undefined ? k : `${k}:${arg}`);
  const scene = sceneView31(s, {
    id: `in31-${x.k}`, title: m.title, W: m.W, H: m.H, spots: m.spots, panels,
    paint: (cv) => { drawInterior27(cv, m.room, m.people, { minW: INSIDE_W31, city: x.city, name: x.name, seed: x.seed,
      look: (p) => lookOf((p.pid ? s.persons[p.pid] : undefined) ?? { id: p.pid ?? p.key ?? `npc:${x.id}:${p.name}` }), role: (p) => (p.pid ? s.persons[p.pid]?.role : null) ?? null }); },
    list: () => h('ul', { class: 'in31-list' }, m.spots.map((sp) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => show(sp.go.panel) }, t(sp.label)), ' ', h('small', { class: 'muted' }, t(sp.tip))))),
    intro: l('Pessoas e objetos são clicáveis: o painel embaixo resolve a ação aqui mesmo.', 'People and objects are clickable: the panel below resolves the action right here.'),
    note: m.note,
    legend: m.trail.length ? h('p', { class: 'small in31-trail' }, '★ ', m.trail.map((y) => t(y)).join(' · ')) : null,
  });
  const box = h('div', { class: 'c2-in in31', role: 'dialog', 'aria-label': t(l('{n} por dentro', '{n}, inside'), { n: x.name }) },
    h('div', { class: 'c2-in-bar' },
      h('button', { type: 'button', class: 'btn small c2-back', onclick: () => { ui31.room = undefined; back(); } }, '← ', t(l('Voltar à cidade', 'Back to the city'))),
      h('b', null, x.name), x.what ? h('small', { class: 'muted' }, ` · ${x.what}`) : null,
      actions ? h('button', { type: 'button', class: 'btn small primary c2-acts-btn', onclick: actions }, t(l('Ações', 'Actions'))) : null),
    h('div', { class: 'in31-body' }, scene, pane));
  show(ui31.panel);
  bindZoomOut27(box, back);
  return box;
}
