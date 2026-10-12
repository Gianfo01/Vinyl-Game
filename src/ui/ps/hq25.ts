// r25 (Pixel Studio, fase 3 "Sede viva") — a tela inicial da Sede: o prédio em corte (r27: pixel art desenhada
// por hqpx27.ts conforme nível da sede, ano e cidade — sem imagens), com as salas clicáveis, selos de estado, bonecos do elenco e da equipe reais, "Precisa de você", "Sua agenda" e o
// "Elenco". Toda a lógica está em hq25model.ts (pura); aqui só se desenha. Encaixa pelo slot25.

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { buyBlocker27, buyRoom27, cityMul27, hqRooms27, type Unit27 } from '../../sim/sys/hqrooms27';
import type { GameState } from '../../sim/types';
import { $, inspect, modal, rerender, toast } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf, portraitCanvas } from '../pixel/avatar';
import { store } from '../store';
import { ic, setTab } from '../vis';
import { hqModel25, type Agenda25, type Goto25, type HqModel25, type RoomM25, type Sprite25 } from './hq25model';
import { drawHqCutaway27, isNarrow27, plan27, type Cell27, type Drawn27 } from './hqpx27';
import { setSedeHome25 } from './slot25';
import { bindZoomOut27, placeTabs27, toCity27 } from './zoom27';
import './hq25.css';

/** Navega para o destino (usa as funções existentes: store.area + rerender, abas e ficha do artista). */
export function go25(g: Goto25): void {
  if (g.act) { inspect.act(g.act); return; }
  if (g.market) store.marketTab = g.market as typeof store.marketTab;
  if (g.tab) setTab(g.tab[0], g.tab[1]);
  if (g.area) { store.area = g.area as typeof store.area; rerender(); }
}

/** Boneco pequeno (lista "Fora da sede"): canvas próprio. */
function awayEl(s: GameState, x: Sprite25, i: number): HTMLElement {
  const p = x.personId ? s.persons[x.personId] : undefined;
  const sp = avatarSprite(lookOf(p ?? { id: x.id }), { year: s.year, role: p?.role ?? null, dir: i % 2 ? 'SW' : 'SE' });
  const c = document.createElement('canvas');
  c.width = sp.c.width; c.height = sp.c.height;
  c.getContext('2d')?.drawImage(sp.c, 0, 0);
  c.className = 'px';
  const label = `${x.name} — ${t(x.note)}`;
  const on = x.actId ? () => go25({ act: x.actId }) : undefined;
  return h(on ? 'button' : 'span', { class: `hq25-sp hq25-sp-${x.kind}`, title: label, 'aria-label': label, onclick: on, type: on ? 'button' : undefined },
    c, h('span', { class: 'hq25-tag', 'aria-hidden': 'true' }, x.name));
}

function badgeEl(b: RoomM25['badges'][number]): HTMLElement {
  return h('span', { class: `hq25-bd ${b.tone}` }, h('span', { class: 'hq25-bd-ic', 'aria-hidden': 'true' }, ic(b.icon)), t(b.text));
}

/** Posição em % do desenho (W×H lógicos). */
const pct = (v: number, of: number): string => `${((v / of) * 100).toFixed(3)}%`;
const box = (d: Drawn27, x: number, y: number, w: number, hh: number): string =>
  `left:${pct(x, d.plan.W)};top:${pct(y, d.plan.H)};width:${pct(w, d.plan.W)};height:${pct(hh, d.plan.H)}`;

/** Nomes curtos para salas estreitas (garagem): o selo cabe na sala e os detalhes vão para os cartões abaixo. */
const SHORT27: Record<RoomM25['id'], L> = {
  studio: l('Estúdio', 'Studio'), lounge: l('Lounge', 'Lounge'), office: l('Escritório', 'Office'),
  anr: l('A&R', 'A&R'), stage: l('Palco', 'Stage'), lobby: l('Recepção', 'Lobby'),
};

function roomBtn(d: Drawn27, r: RoomM25, c: Cell27, k: number): HTMLElement {
  const say = [t(r.name), t(r.desc), ...r.badges.map((b) => t(b.text))].filter(Boolean).join('. ');
  const hot = r.badges.some((b) => b.tone === 'bad' || b.tone === 'warn');
  const narrow = isNarrow27(c, k);
  const tone = r.badges.find((b) => b.tone === 'bad')?.tone ?? r.badges.find((b) => b.tone === 'warn')?.tone;
  return h('button', { type: 'button', class: `hq25-room ${hot ? 'hot' : ''} ${narrow ? 'narrow' : ''}`, 'data-room': r.id, style: box(d, c.x, c.y, c.w, c.h), 'aria-label': say, title: narrow ? say : undefined, onclick: () => go25(r.go) },
    h('span', { class: 'hq25-chip' }, ic(r.icon), h('span', { class: 'hq25-chip-t' }, t(narrow ? SHORT27[r.id] : r.name)), narrow && tone ? h('i', { class: `hqr27-dot ${tone}`, 'aria-hidden': 'true' }) : null),
    narrow ? null : h('span', { class: 'hq25-bds' }, r.badges.slice(0, 2).map(badgeEl)));
}

// ---------------------------------------------------------------- r27 I1: salas e andares compráveis

const months27 = (n: number): string => t(n === 1 ? l('1 mês', '1 month') : l('{n} meses', '{n} months'), { n });
const floorName27 = (f: number): string => (f === 0 ? t(l('Térreo', 'Ground floor')) : t(l('{n}º andar', 'Floor {n}'), { n: f }));

/** Diálogo de compra: custo da obra, manutenção, tempo de obra e efeito; confirma e começa a obra. */
export function buyDlg27(s: GameState, id: string): void {
  const u = hqRooms27(s).find((x) => x.id === id);
  if (!u) return;
  const why = buyBlocker27(s, id);
  const city = cityById[s.config.homeCity];
  let close = (): void => {};
  const buy = (): void => {
    const e = buyRoom27(s, id);
    close();
    if (e) toast(t(e), 'bad');
    else toast(t(l('Obra começou: {n}. Pronta em {m}.', 'Construction started: {n}. Ready in {m}.'), { n: t(u.name), m: months27(u.months) }), 'good');
    rerender();
  };
  const row = (k: L, v: Node | string) => [h('dt', null, t(k)), h('dd', null, v)];
  const body = h('div', { class: 'hqr27-dlg' },
    h('p', null, t(u.desc)),
    h('dl', { class: 'hqr27-dl' },
      ...row(l('Custo da obra', 'Construction cost'), h('b', { class: 'num20' }, u.cost ? $(u.cost) : t(l('já é seu', 'already yours')))),
      ...row(l('Manutenção', 'Upkeep'), h('span', { class: 'num20' }, `${$(u.upkeep)} ${t(l('por mês', 'per month'))}`)),
      ...row(l('Tempo de obra', 'Construction time'), months27(u.months)),
      ...row(l('Efeito', 'Effect'), h('b', null, t(u.effect))),
      ...row(l('Onde', 'Where'), floorName27(u.floor))),
    h('p', { class: 'muted small' }, t(l('Preço da época e da cidade-sede{c} (×{m}). A manutenção começa quando a obra termina.', 'Priced for the era and the home city{c} (×{m}). Upkeep starts when construction ends.'), { c: city ? ` (${t(city.name)})` : '', m: cityMul27(s).toFixed(2) })),
    why ? h('p', { class: 'hqr27-why', role: 'alert' }, ic('lock'), ' ', t(why)) : null,
    h('div', { class: 'row wrap hqr27-act' },
      h('button', { type: 'button', class: 'btn primary', disabled: !!why, onclick: buy }, u.kind === 'floor' ? t(l('Montar o andar', 'Fit out the floor')) : u.kind === 'upgrade' ? t(l('Fazer a reforma', 'Do the makeover')) : t(l('Comprar e começar a obra', 'Buy and start building'))),
      h('button', { type: 'button', class: 'btn ghost', onclick: () => close() }, t(l('Cancelar', 'Cancel')))));
  close = modal(t(u.kind === 'floor' ? l('Montar andar: {n}', 'Fit out floor: {n}') : l('Comprar sala: {n}', 'Buy room: {n}'), { n: t(u.name) }), body);
}

/** Botões e etiquetas por cima do desenho: "Comprar sala — $X", "Comprar andar — $X", "Em obra · N meses". */
function lockEls27(s: GameState, d: Drawn27, units: Unit27[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  const pl = d.plan;
  const byId = new Map(units.map((u) => [u.id, u]));
  const span = (f: number) => { const cs = pl.cells.filter((c) => c.floor === f); return { x: cs[0].x, y: cs[0].y, w: cs[cs.length - 1].x + cs[cs.length - 1].w - cs[0].x, h: cs[0].h }; };
  const btn = (u: Unit27, b: { x: number; y: number; w: number; h: number }, cls: string, label: L) =>
    h('button', { type: 'button', class: `hqr27-buy ${cls}`, style: box(d, b.x, b.y, b.w, b.h), 'data-unit': u.id, 'aria-label': `${t(label)}: ${t(u.name)} — ${$(u.cost)}. ${t(u.effect)}`, onclick: () => buyDlg27(s, u.id) },
      h('span', { class: 'hqr27-buy-in' }, h('b', null, ic(u.kind === 'floor' ? 'building' : 'lock'), ' ', t(u.name)), h('span', null, `${t(label)} — ${$(u.cost)}`)));
  const work = (u: Unit27, b: { x: number; y: number; w: number; h: number }, cls: string) =>
    h('span', { class: `hqr27-work ${cls}`, style: box(d, b.x, b.y, b.w, b.h), role: 'note', 'data-unit': u.id, title: t(u.effect) },
      h('span', { class: 'hqr27-buy-in' }, h('b', null, ic('clock'), ' ', t(u.name)), h('span', null, t(l('Em obra · falta {m}', 'Under construction · {m} left'), { m: months27(u.eta) }))));
  for (const u of units) {
    if (u.status === 'open') continue;
    if (u.kind === 'floor') {
      const b = span(u.floor);
      out.push(u.status === 'building' ? work(u, b, 'floor') : btn(u, b, 'floor', l('Comprar andar', 'Buy floor')));
    } else if (u.kind === 'upgrade') {
      const c = pl.cells.find((x) => x.kind === 'lounge');
      if (!c) continue;
      // reforma do lounge: selinho compacto no canto de cima à direita (ícone + preço ou meses; o texto todo no title)
      const b = { x: c.x + c.w - 52, y: c.y + 3, w: 48, h: 11 };
      const full = u.status === 'building' ? `${t(u.name)}: ${t(l('em obra, falta {m}', 'under construction, {m} left'), { m: months27(u.eta) })}` : `${t(l('Reformar o lounge', 'Make over the lounge'))} — ${$(u.cost)}. ${t(u.effect)}`;
      out.push(h(u.status === 'building' ? 'span' : 'button', { type: u.status === 'building' ? undefined : 'button', class: `${u.status === 'building' ? 'hqr27-work' : 'hqr27-buy'} mini`, style: box(d, b.x, b.y, b.w, b.h), 'data-unit': u.id, title: full, 'aria-label': full, onclick: u.status === 'building' ? undefined : () => buyDlg27(s, u.id) },
        h('span', { class: 'hqr27-buy-in' }, ic(u.status === 'building' ? 'clock' : 'sparkle'), h('span', null, u.status === 'building' ? months27(u.eta) : $(u.cost)))));
    }
  }
  for (const c of pl.cells) {
    if (!c.unit || !c.lock || pl.flock[c.floor]) continue;
    const u = byId.get(c.unit);
    if (!u) continue;
    out.push(c.lock === 'building' ? work(u, c, '') : btn(u, c, '', l('Comprar sala', 'Buy room')));
  }
  return out;
}

/** Lista das salas e andares do nível (abre o mesmo diálogo; no celular é o jeito mais fácil). */
function unitList27(s: GameState, units: Unit27[]): HTMLElement | null {
  if (!units.length) return null;
  const open = units.filter((u) => u.status === 'open').length;
  return h('details', { class: 'hqr27-box', open: units.some((u) => u.status !== 'open') ? true : undefined },
    h('summary', null, h('b', null, t(l('Salas e andares para comprar', 'Rooms and floors to buy'))), ' ', h('small', { class: 'muted' }, t(l('{a} de {n} em uso', '{a} of {n} in use'), { a: open, n: units.length }))),
    h('ul', { class: 'hqr27-list' }, units.map((u) => h('li', { class: `st-${u.status}` },
      h('button', { type: 'button', class: 'hqr27-row', disabled: u.status !== 'locked' ? true : undefined, onclick: () => buyDlg27(s, u.id) },
        h('span', { class: 'hqr27-row-ic', 'aria-hidden': 'true' }, ic(u.status === 'building' ? 'clock' : u.icon)),
        h('span', { class: 'hqr27-row-t' }, h('b', null, t(u.name)), h('small', { class: 'muted' }, `${floorName27(u.floor)} · ${t(u.effect)}`)),
        h('span', { class: 'hqr27-row-v' }, u.status === 'open' ? t(l('Em uso', 'In use'))
          : u.status === 'building' ? t(l('Obra: falta {m}', 'Building: {m} left'), { m: months27(u.eta) })
          : u.blocked ? t(u.blocked) : `${$(u.cost)} · ${months27(u.months)}`))))));
}

/** Botão invisível sobre cada boneco desenhado (nome no foco/hover; artista abre a ficha). */
function hitEl(d: Drawn27, sp: Drawn27['spots'][number]): HTMLElement {
  const x = sp.sprite;
  const label = `${x.name} — ${t(x.note)}`;
  const on = x.actId ? () => go25({ act: x.actId }) : undefined;
  return h(on ? 'button' : 'span', { class: `hq27-hit hq25-sp-${x.kind}`, style: box(d, sp.x - 7, sp.y - 31, 14, 32), title: label, 'aria-label': label, tabindex: on ? '-1' : undefined, onclick: on, type: on ? 'button' : undefined },
    h('span', { class: 'hq25-tag', 'aria-hidden': 'true' }, x.name));
}

/** Escala inteira (pixels nítidos): 2× no mínimo (celular rola de lado), 3× em telas largas. */
export function fit27(cw: number, need: number): { k: number; minW: number } {
  const k = Math.max(2, Math.min(3, Math.floor(cw / need)));
  return { k, minW: Math.max(need, Math.floor(cw / k)) };
}

function stage(s: GameState, m: HqModel25): HTMLElement {
  const cv = h('canvas', { class: 'hq27-cv px', 'aria-hidden': 'true' }) as HTMLCanvasElement;
  const layer = h('div', { class: 'hq27-layer' });
  const st = h('div', { class: `hq25-stage hq27-stage lv-${m.hq}`, role: 'group', 'aria-label': t(l('Sua sede: {e}. Cada sala abre uma área do jogo.', 'Your HQ: {e}. Each room opens a game area.'), { e: t(m.hqName) }) }, cv, layer);
  const scroll = h('div', { class: 'hq25-scroll hq27-scroll' }, st);
  const look = (x: Sprite25) => lookOf((x.personId ? s.persons[x.personId] : undefined) ?? { id: x.id });
  const role = (x: Sprite25) => (x.personId ? s.persons[x.personId]?.role : null) ?? null;
  const need = plan27({ hq: m.hq, year: m.year }).W;
  let last = '';
  const paint = (cw: number): void => {
    const { k, minW } = fit27(cw, need);
    const key = `${k}|${minW}`;
    if (key === last) return;
    last = key;
    const d = drawHqCutaway27(cv, m, { minW, look, role });
    st.style.width = `${d.plan.W * k}px`;
    st.style.height = `${d.plan.H * k}px`;
    const rooms = m.rooms.filter((r) => d.plan.rooms.includes(r.id));
    const fx = new Map(m.units.map((u) => [u.id, u]));
    layer.replaceChildren(
      ...d.plan.cells.filter((c) => !c.room && c.name && !c.lock).map((c) => h('span', { class: 'hq27-deco', style: box(d, c.x, c.y, c.w, c.h), title: c.unit && fx.get(c.unit) ? t(fx.get(c.unit)!.effect) : undefined }, h('span', null, t(c.name!)))),
      ...rooms.map((r) => roomBtn(d, r, d.plan.cells.find((c) => c.room === r.id)!, k)),
      ...lockEls27(s, d, m.units),
      ...d.spots.map((sp) => hitEl(d, sp)),
      ...d.more.map((x) => h('span', { class: 'hq25-more', style: `left:${pct(x.x, d.plan.W)};top:${pct(x.y, d.plan.H)}`, title: t(l('Mais {n} nesta sala', '{n} more in this room'), { n: x.n }) }, `+${x.n}`)));
  };
  paint(Math.min(960, Math.max(360, (window.innerWidth || 960) - 560)));
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver((es) => { if (!scroll.isConnected) { ro.disconnect(); return; } const w = es[0]?.contentRect.width; if (w) paint(w); });
    ro.observe(scroll);
  }
  bindZoomOut27(scroll, () => toCity27(scroll)); // r27 (CITY2): Ctrl + roda / pinça fechando = ver a cidade
  const company = s.config.companyName || t(l('Seu selo', 'Your label'));
  const city = cityById[m.city];
  const shut = m.rooms.filter((r) => !r.open);
  return h('section', { class: 'hq27' },
    h('header', { class: 'hq27-head' },
      h('div', null, h('h1', { class: 'page21' }, t(l('Sua sede', 'Your HQ'))),
        h('small', { class: 'muted' }, [company, t(m.hqName), city ? t(city.name) : '', String(m.year)].filter(Boolean).join(' · '))),
      placeTabs27('hq', () => scroll), // r27 (CITY2): a sede e a cidade são o mesmo lugar (afastar = Nosso mundo)
      m.away.length ? h('div', { class: 'hq25-away', role: 'note', 'aria-label': t(l('Fora da sede', 'Away from HQ')) },
        h('b', null, ic('plane'), ' ', t(l('Fora da sede', 'Away'))), h('span', { class: 'hq25-away-row' }, m.away.slice(0, 5).map((x, i) => awayEl(s, x, i))),
        m.away.length > 5 ? h('small', null, `+${m.away.length - 5}`) : null) : null),
    scroll,
    unitList27(s, m.units),
    shut.length ? h('ul', { class: 'hq27-shut', 'aria-label': t(l('Salas que chegam com uma sede maior', 'Rooms that come with a bigger HQ')) },
      shut.map((r) => h('li', null, h('button', { type: 'button', class: 'btn small ghost', onclick: () => go25(r.go), title: t(r.desc) }, ic('lock'), ' ', h('b', null, t(r.name)), ' · ', h('small', { class: 'muted' }, r.lockNote ? t(r.lockNote) : ''))))) : null);
}

function roomCards(m: HqModel25): HTMLElement {
  return h('ul', { class: 'hq25-cards', 'aria-label': t(l('Salas da sede', 'HQ rooms')) }, m.rooms.map((r) => h('li', null,
    h('button', { type: 'button', class: `hq25-card ${r.open ? '' : 'shut'}`, onclick: () => go25(r.go) },
      h('span', { class: 'hq25-card-h' }, ic(r.icon), ' ', h('b', null, t(r.name))),
      h('small', { class: 'muted' }, t(r.desc)),
      h('span', { class: 'hq25-bds' }, r.badges.slice(0, 2).map(badgeEl)),
      r.sprites.length ? h('small', { class: 'hq25-who' }, r.sprites.map((x) => x.name).join(', '), r.more ? ` +${r.more}` : '') : null))));
}

function needsCol(m: HqModel25): HTMLElement {
  return h('aside', { class: 'hq25-need card', 'aria-labelledby': 'hq25-need-h' },
    h('h2', { id: 'hq25-need-h' }, t(l('Precisa de você', 'Needs you'))),
    m.needs.length ? h('ol', { class: 'hq25-need-list' }, m.needs.map((n) => h('li', { class: `hq25-task ${n.tone}` },
      h('span', { class: 'hq25-task-ic', 'aria-hidden': 'true' }, ic(n.icon, 2)),
      h('div', null, h('h3', null, t(n.title)), h('p', { class: 'muted small' }, t(n.why))),
      h('button', { type: 'button', class: 'btn primary', onclick: () => go25(n.go) }, t(n.cta)))))
      : h('div', { class: 'hq25-empty' }, h('p', null, h('b', null, t(l('Tudo em dia.', 'All caught up.')))),
        h('p', { class: 'muted small' }, t(l('Nada pede sua mão agora: avance a semana e o mundo continua a tocar.', 'Nothing needs your hand right now: advance the week and the world keeps playing.')))),
    h('p', { class: 'muted small hq25-foot' }, t(l('O mundo continua a tocar. Você escolhe o próximo passo.', 'The world keeps playing. You choose the next step.'))));
}

const KIND_IC: Record<string, string> = { studio: 'mic', decision: 'contract', release: 'cd', tour: 'tour-bus', festival: 'stage', contract: 'contract', clause: 'scroll', money: 'money', supply: 'factory', build: 'building', court: 'gavel', award: 'trophy', echo: 'clock', other: 'calendar' };
function agendaRow(a: Agenda25): HTMLElement {
  const when = a.weeks <= 0 ? t(l('esta semana', 'this week')) : a.weeks === 1 ? t(l('em 1 semana', 'in 1 week')) : t(l('em {n} semanas', 'in {n} weeks'), { n: a.weeks });
  return h('li', { class: a.tone === 'bad' ? 'bad' : '' },
    h('span', { class: 'hq25-ag-ic', 'aria-hidden': 'true' }, ic(KIND_IC[a.kind] ?? 'calendar')),
    h('span', { class: 'hq25-ag-t' }, h('small', { class: 'num20 muted' }, when), h('b', null, t(a.t)), a.d ? h('small', { class: 'muted' }, t(a.d)) : null),
    a.go ? h('button', { type: 'button', class: 'btn small ghost', 'aria-label': `${t(l('Abrir', 'Open'))}: ${t(a.t)}`, onclick: () => go25(a.go!) }, '›') : null);
}
function agendaCol(m: HqModel25): HTMLElement {
  return h('section', { class: 'hq25-agenda card', 'aria-labelledby': 'hq25-ag-h' },
    h('h2', { id: 'hq25-ag-h' }, t(l('Sua agenda', 'Your agenda'))),
    m.agenda.length ? h('ul', { class: 'hq25-ag-list' }, m.agenda.map(agendaRow))
      : h('div', { class: 'hq25-empty' }, h('p', { class: 'muted small' }, t(l('Nada marcado nas próximas 8 semanas. Gravações, lançamentos, shows e prazos aparecem aqui assim que você os marcar.', 'Nothing booked in the next 8 weeks. Sessions, releases, shows and deadlines show up here once you book them.'))),
        h('button', { type: 'button', class: 'btn small', onclick: () => go25({ area: 'project' }) }, t(l('Começar um disco', 'Start a record')))));
}
function castRow(s: GameState, m: HqModel25): HTMLElement {
  return h('section', { class: 'hq25-cast card', 'aria-labelledby': 'hq25-cast-h' },
    h('h2', { id: 'hq25-cast-h' }, t(l('Elenco', 'Roster'))),
    m.cast.length ? h('ul', { class: 'hq25-faces' }, m.cast.map((c) => {
      const p = c.personId ? s.persons[c.personId] : undefined;
      const face = portraitCanvas(p ?? { id: c.actId }, s, 1);
      return h('li', null, h('button', { type: 'button', class: `hq25-face w-${c.where}`, onclick: () => go25({ act: c.actId }), title: t(c.status) },
        face, h('span', null, h('b', null, c.name), h('small', { class: 'muted' }, t(c.status)))));
    }))
      : h('div', { class: 'hq25-empty' }, h('p', { class: 'muted small' }, t(l('Ninguém no elenco ainda: o primeiro passo é descobrir um artista.', 'No one on the roster yet: the first step is to discover an act.'))),
        h('button', { type: 'button', class: 'btn small primary', onclick: () => go25({ area: 'market', market: 'scouting' }) }, t(l('Procurar talentos', 'Look for talent')))));
}

/** A página inteira. */
export function hqView25(s: GameState): HTMLElement {
  const m = hqModel25(s);
  return h('div', { class: 'hq25' },
    h('div', { class: 'hq25-main' }, stage(s, m), roomCards(m),
      h('div', { class: 'hq25-low' }, agendaCol(m), castRow(s, m))),
    needsCol(m));
}

setSedeHome25((root) => { const s = store.game; if (s) root.replaceChildren(hqView25(s)); });
