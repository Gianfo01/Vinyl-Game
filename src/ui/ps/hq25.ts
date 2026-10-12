// r25 (Pixel Studio, fase 3 "Sede viva") — a tela inicial da Sede: o prédio em corte (r27: pixel art desenhada
// por hqpx27.ts conforme nível da sede, ano e cidade — sem imagens), com as salas clicáveis, selos de estado, bonecos do elenco e da equipe reais, "Precisa de você", "Sua agenda" e o
// "Elenco". Toda a lógica está em hq25model.ts (pura); aqui só se desenha. Encaixa pelo slot25.

import { cityById, l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { inspect, rerender } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf, portraitCanvas } from '../pixel/avatar';
import { store } from '../store';
import { ic, setTab } from '../vis';
import { hqModel25, type Agenda25, type Goto25, type HqModel25, type RoomM25, type Sprite25 } from './hq25model';
import { drawHqCutaway27, plan27, type Cell27, type Drawn27 } from './hqpx27';
import { setSedeHome25 } from './slot25';
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

function roomBtn(d: Drawn27, r: RoomM25, c: Cell27): HTMLElement {
  const say = [t(r.name), t(r.desc), ...r.badges.map((b) => t(b.text))].filter(Boolean).join('. ');
  const hot = r.badges.some((b) => b.tone === 'bad' || b.tone === 'warn');
  return h('button', { type: 'button', class: `hq25-room ${hot ? 'hot' : ''}`, 'data-room': r.id, style: box(d, c.x, c.y, c.w, c.h), 'aria-label': say, onclick: () => go25(r.go) },
    h('span', { class: 'hq25-chip' }, ic(r.icon), ' ', t(r.name)),
    h('span', { class: 'hq25-bds' }, r.badges.slice(0, 2).map(badgeEl)));
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
    layer.replaceChildren(
      ...d.plan.cells.filter((c) => !c.room && c.name).map((c) => h('span', { class: 'hq27-deco', style: box(d, c.x, c.y, c.w, c.h) }, h('span', null, t(c.name!)))),
      ...rooms.map((r) => roomBtn(d, r, d.plan.cells.find((c) => c.room === r.id)!)),
      ...d.spots.map((sp) => hitEl(d, sp)),
      ...d.more.map((x) => h('span', { class: 'hq25-more', style: `left:${pct(x.x, d.plan.W)};top:${pct(x.y, d.plan.H)}`, title: t(l('Mais {n} nesta sala', '{n} more in this room'), { n: x.n }) }, `+${x.n}`)));
  };
  paint(Math.min(960, Math.max(360, (window.innerWidth || 960) - 560)));
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver((es) => { if (!scroll.isConnected) { ro.disconnect(); return; } const w = es[0]?.contentRect.width; if (w) paint(w); });
    ro.observe(scroll);
  }
  const company = s.config.companyName || t(l('Seu selo', 'Your label'));
  const city = cityById[m.city];
  const shut = m.rooms.filter((r) => !r.open);
  return h('section', { class: 'hq27' },
    h('header', { class: 'hq27-head' },
      h('div', null, h('h1', { class: 'page21' }, t(l('Sua sede', 'Your HQ'))),
        h('small', { class: 'muted' }, [company, t(m.hqName), city ? t(city.name) : '', String(m.year)].filter(Boolean).join(' · '))),
      m.away.length ? h('div', { class: 'hq25-away', role: 'note', 'aria-label': t(l('Fora da sede', 'Away from HQ')) },
        h('b', null, ic('plane'), ' ', t(l('Fora da sede', 'Away'))), h('span', { class: 'hq25-away-row' }, m.away.slice(0, 5).map((x, i) => awayEl(s, x, i))),
        m.away.length > 5 ? h('small', null, `+${m.away.length - 5}`) : null) : null),
    scroll,
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
