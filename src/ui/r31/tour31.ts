// R31 · onda 2 (J) — TURNÊ em cena: mapa + calendário juntos, em pixel art. O modelo (tour31model) diz o que cada
// ponto, linha e dia mostra; aqui só se pinta e se abrem os painéis curtos: ônibus (logística, custo, diário de estrada,
// cancelar — as MESMAS funções da tabela de turnês) e conflito (o que bate com o quê e onde resolver).
// A tabela detalhada continua logo abaixo (Ver como lista mostra só ela).

import { tourList } from '../../sim/tours';
import { cityById, l } from '../../data/world';
import { geoData, loadGeo, countryIndexAt, type Geo } from '../../data/geo';
import { t } from '../../i18n/strings';
import { KIT_TXT18 } from '../../sim/sys/live18';
import { KIT0, type Kit18 } from '../../sim/tourhook18';
import type { GameState } from '../../sim/types';
import { $, N, modal, rerender, toast } from '../common';
import { h, select } from '../dom';
import { openRoad27 } from '../act27/road27';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, drawTextOutlined, textWidth } from '../pixel/font';
import { C, INK, Px, tint, type Col } from '../pixel/px';
import { vehiclePx29, type Move29 } from '../pixel/things29';
import { tourStops20 } from '../panels/misc';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { MON31 } from './scene31model';
import { CAL_CH31, CAL_CW31, CAL_X31, CAL_Y31, TOUR_ACTS31, busX31, TOUR_LEGEND31, tour31, type Day31, type Tour31 } from './tour31model';

const ui31 = { tourId: '', mon: null as null | { year: number; month: number } };

// ---------------------------------------------------------------- pintura

const maskCache = new Map<string, Uint8Array>();
function landMask(geo: Geo, m: Tour31): Uint8Array {
  const key = m.bbox.map((x) => x.toFixed(2)).join('|');
  const hit = maskCache.get(key);
  if (hit) return hit;
  const W = m.W, H = m.mapH, out = new Uint8Array(W * H);
  const [lon0, lat0, lon1, lat1] = m.bbox;
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const lon = lon0 + ((x + 1) / W) * (lon1 - lon0), lat = lat1 - ((y + 1) / H) * (lat1 - lat0);
    const v = countryIndexAt(geo, lon, lat) >= 0 ? 1 : 0;
    out[y * W + x] = v; out[y * W + x + 1] = v; if (y + 1 < H) { out[(y + 1) * W + x] = v; out[(y + 1) * W + x + 1] = v; }
  }
  maskCache.set(key, out);
  return out;
}

const DAY_COL: Record<Day31['kind'], Col> = {
  played: C('#e8884a'), show: C('#b8b0f0'), travel: C('#d8d0c0'), studio: C('#9ad0c0'), conflict: C('#f08a80'), free: C('#f4ecd8'), past: C('#a8a094'),
};

function paintTour(cv: HTMLCanvasElement, s: GameState, m: Tour31, repaint: () => void): void {
  const W = m.W, H = m.H, MH = m.mapH;
  const p = new Px(W, H);
  const geo = geoData();
  if (!geo) void loadGeo().then(() => repaint()).catch(() => {});
  const mask = geo ? landMask(geo, m) : null;
  const sea = m.year < 1950 ? C('#b8ccc8') : C('#a8cce0'), land = m.year < 1950 ? C('#b8b080') : C('#8ab470');
  for (let y = 0; y < MH; y++) for (let x = 0; x < W; x++) {
    const on = mask ? mask[y * W + x] === 1 : false;
    const n = ((x * 13 + y * 7) ^ (x >> 2)) % 9;
    p.put(x, y, on ? (n === 0 ? tint(land, -0.12) : n === 1 ? tint(land, 0.1) : land) : (n === 0 && y % 3 === 0 ? tint(sea, 0.18) : sea));
  }
  if (mask) for (let y = 1; y < MH - 1; y++) for (let x = 1; x < W - 1; x++) { // costa: 1 px mais escuro
    if (mask[y * W + x] && (!mask[y * W + x - 1] || !mask[y * W + x + 1] || !mask[(y - 1) * W + x] || !mask[(y + 1) * W + x])) p.put(x, y, tint(land, -0.3));
  }
  // rota: tracejado laranja (feito) e roxo (falta)
  for (let i = 1; i < m.dots.length; i++) {
    const a = m.dots[i - 1], b = m.dots[i];
    const col = b.status === 'played' ? C('#d8682a') : C('#5a48c8');
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 2));
    for (let k = 0; k <= n; k++) if (k % 2 === 0) { const x = Math.round(a.x + ((b.x - a.x) * k) / n), y = Math.round(a.y + ((b.y - a.y) * k) / n); p.rect(x, y, 2, 2, col); }
  }
  // casa (sede)
  if (m.home) { p.rect(m.home.x - 3, m.home.y - 3, 7, 6, C('#f4ecd8')); p.poly([[m.home.x - 4, m.home.y - 3], [m.home.x + 4, m.home.y - 3], [m.home.x, m.home.y - 7]], C('#c8302c')); }
  // pontos: tamanho = lotação; feito = laranja cheio com miolo branco; falta = roxo com anel; cancelado = cinza
  for (const d of m.dots) {
    const col = d.status === 'played' ? C('#e8884a') : d.status === 'cancelled' ? C('#8a8a8a') : d.status === 'draft' ? C('#f4ecd8') : C('#7a6ae0');
    p.disc(d.x, d.y, d.r + 1, INK); p.disc(d.x, d.y, d.r, col);
    if (d.status === 'played') p.disc(d.x, d.y, Math.max(1, d.r - 3), C('#fff4e0'));
    else if (d.status === 'todo') p.ring(d.x, d.y, Math.max(1, d.r - 2), C('#ffffff'));
    if (d.status === 'cancelled') { p.line(d.x - d.r, d.y - d.r, d.x + d.r, d.y + d.r, INK); }
  }
  // nomes: à direita do ponto; se bater em outro nome, à esquerda; se ainda bater, fica só na dica (sem sobrepor)
  const boxes: [number, number, number, number][] = [];
  const hit = (b: [number, number, number, number]) => boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
  for (const d of m.dots) {
    const nm = t(d.name).toUpperCase(), tw = textWidth(nm) + 2;
    const right: [number, number, number, number] = [d.x + d.r + 2, d.y - 3, d.x + d.r + 2 + tw, d.y + 4];
    const left: [number, number, number, number] = [d.x - d.r - 2 - tw, d.y - 3, d.x - d.r - 2, d.y + 4];
    const b = [right, left].find((x) => x[0] >= 0 && x[2] <= W && !hit(x));
    if (!b) continue;
    boxes.push(b);
    drawTextOutlined(p, nm, b[0] + 1, d.y - 2, C('#ffffff'), INK);
  }
  // título do mapa
  const title = m.tour ? `${s.acts[m.tour.actId]?.name ?? ''} · ${m.tour.name}` : m.draft ? t(l('ROTA EM RASCUNHO', 'DRAFT ROUTE')) : t(l('SEM TURNÊ MARCADA', 'NO TOUR BOOKED'));
  p.rect(0, 0, Math.min(W, textWidth(title) + 8), 9, C('#170e12')); drawText(p, title, 4, 2, C('#ffe9b0'));
  // calendário: faixa de madeira com um bloco por dia
  p.rect(0, MH, W, H - MH, C('#3a2418'));
  for (let x = 0; x < W; x += 7) p.vline(x, MH, H - 1, C('#43291c'));
  const mon = `${t(MON31[m.month.month])} ${m.month.year}`;
  drawText(p, mon, 5, MH + 2, C('#ffe9b0'));
  if (m.conflicts) drawText(p, `! ${m.conflicts}`, 5 + textWidth(mon) + 8, MH + 2, C('#ff8a80'));
  for (const d of m.days) {
    const x = CAL_X31 + (d.dom - 1) * CAL_CW31, y = CAL_Y31;
    p.rect(x, y, CAL_CW31 - 1, CAL_CH31, INK);
    p.rect(x + 1, y + 1, CAL_CW31 - 3, CAL_CH31 - 2, DAY_COL[d.kind]);
    const num = String(d.dom);
    drawText(p, num, x + Math.round((CAL_CW31 - 1 - textWidth(num)) / 2), y + 3, d.kind === 'past' ? C('#5a5450') : C('#2a1e1a'));
    const cx = x + 4, cy = y + 20;
    if (d.kind === 'played' || d.kind === 'show' || d.kind === 'conflict') { p.disc(cx, cy, 2, d.kind === 'played' ? C('#c0501a') : C('#4a3ab8')); }
    if (d.kind === 'played') { p.put(cx - 1, cy, C('#ffffff')); p.put(cx, cy + 1, C('#ffffff')); p.put(cx + 1, cy - 1, C('#ffffff')); }
    if (d.kind === 'travel') for (let yy = y + 11; yy < y + CAL_CH31 - 2; yy += 3) p.rect(cx, yy, 1, 2, C('#6a6058'));
    if (d.kind === 'studio') { p.rect(cx, cy - 4, 1, 5, C('#1a4a40')); p.rect(cx - 2, cy, 3, 2, C('#1a4a40')); p.rect(cx + 1, cy - 4, 2, 1, C('#1a4a40')); }
    if (d.kind === 'conflict') { p.rect(x, y, CAL_CW31 - 1, 1, C('#d8342c')); p.rect(x, y + CAL_CH31 - 1, CAL_CW31 - 1, 1, C('#d8342c')); p.rect(cx, y + 26, 1, 4, C('#a8201a')); }
    if (d.kind === 'free') { p.rect(cx - 1, cy, 3, 1, C('#7aa070')); p.rect(cx, cy - 1, 1, 3, C('#7aa070')); }
    if (d.today) { p.rect(x + 1, y + CAL_CH31 - 3, CAL_CW31 - 3, 2, C('#170e12')); }
  }
  const ctx = blitPx31(cv, p.d, W, H);
  if (!ctx) return;
  // ônibus (veículo da época) e você
  if (m.bus) {
    const move = ((m.tour?.move ?? KIT0.move) as Move29);
    const v = vehiclePx29(move, m.year, m.tour?.id ?? '');
    const bx = busX31(m.bus.x, v.w), by = Math.max(0, m.bus.y - v.h - 2);
    const c = v.canvas(); const cx = c.getContext('2d'); if (cx) { const img = cx.getImageData(0, 0, v.w, v.h); for (let i = 0; i < v.w * 3; i++) img.data[(v.w * (v.h - 3)) * 4 + i * 4 + 3] = 0; cx.putImageData(img, 0, 0); }
    ctx.drawImage(c, bx, by);
  }
  const pr = m.me.personId ? s.persons[m.me.personId] : undefined;
  const sp = avatarSprite(lookOf(pr ?? { id: 'player' }), { year: m.year, role: pr?.role ?? null, pose: 'stand', dir: 'SW' });
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(m.me.x - 6, m.me.y, 12, 1);
  ctx.drawImage(sp.c, m.me.x - sp.ax, m.me.y - sp.ay + 1);
}

// ---------------------------------------------------------------- painéis na cena

function busPanel(s: GameState, m: Tour31): void {
  const tr = m.tour ? tourList(s).find((x) => x.id === m.tour!.id) : undefined;
  if (!tr) return;
  const kit: Kit18 = { ...KIT0, ...(tr.kit18 ?? {}) };
  let close = (): void => {};
  const live = tr.status === 'planned' || tr.status === 'running';
  const body = h('div', { class: 'sc31-panel' },
    h('p', null, h('b', null, tr.name), ' · ', s.acts[tr.actId]?.name ?? '—', m.bus ? ` · ${t(m.bus.label)}` : ''),
    h('ul', null,
      h('li', { class: 'sc31-row' }, t(l('Transporte', 'Transport')), ': ', h('b', null, t(KIT_TXT18.move[kit.move]))),
      h('li', { class: 'sc31-row' }, t(l('Hospedagem', 'Lodging')), ': ', h('b', null, t(KIT_TXT18.bed[kit.bed])), ' · ', t(KIT_TXT18.diem[kit.diem])),
      h('li', { class: 'sc31-row' }, t(l('Equipe técnica', 'Road crew')), ': ', h('b', null, N(tr.crew)), ' · ', t(l('Logística reservada', 'Logistics booked')), ': ', h('b', null, $(tr.costReserved))),
      h('li', { class: 'sc31-row' }, t(l('Receita até agora', 'Revenue so far')), ': ', h('b', null, $(tr.revenue)), ' · ', t(l('Público', 'Attendance')), ': ', h('b', null, N(tr.stops.reduce((a, x) => a + x.sold, 0))))),
    h('div', { class: 'row wrap' },
      live ? h('button', { type: 'button', class: 'btn small', onclick: () => { close(); openRoad27(tr.id); } }, t(l('Diário de estrada', 'Road journal'))) : null,
      live ? lockBtn31(t(l('Cancelar (devolve metade)', 'Cancel (half refunded)')), null, () => { const e = TOUR_ACTS31.cancel(s, tr.id); close(); toast(t(e ?? l('Turnê cancelada.', 'Tour cancelled.')), e ? 'bad' : 'info'); rerender(); }, { cls: 'btn small ghost' }) : null,
      moreBtn31(l('Operação completa (tabela)', 'Full operation (table)'), () => { close(); runGo31({ area: 'shows', tab: ['showsHub', 'tours'] }); })));
  close = modal(t(l('Ônibus · logística da turnê', 'Bus · tour logistics')), body, { wide: true });
}

function conflictPanel(s: GameState, m: Tour31, dom?: string): void {
  const d = m.days.find((x) => String(x.dom) === dom);
  if (!d) return;
  let close = (): void => {};
  const city = d.cityId ? t(cityById[d.cityId]?.name ?? l('—')) : '—';
  const body = h('div', { class: 'sc31-panel' },
    h('p', null, h('span', { class: 'sc31-lv lvl-crit' }, '!'), t(l('{d} de {m}: show em {c}.', '{m} {d}: show in {c}.'), { d: d.dom, m: t(MON31[m.month.month]), c: city }), ' ', d.why ? t(d.why) : ''),
    h('p', { class: 'muted small' }, t(l('O artista não pode estar em dois lugares: mude a sessão de estúdio ou altere a turnê.', 'The act cannot be in two places: move the studio session or change the tour.'))),
    h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn small', onclick: () => { close(); runGo31({ area: 'studio' }); } }, t(l('Abrir o estúdio', 'Open the studio'))),
      h('button', { type: 'button', class: 'btn small', onclick: () => { close(); runGo31({ area: 'shows', tab: ['showsHub', 'agenda'] }); } }, t(l('Agenda de shows (conflitos)', 'Show agenda (conflicts)')))));
  close = modal(t(l('Conflito na agenda', 'Schedule conflict')), body);
}

// ---------------------------------------------------------------- vista

/** A turnê em cena; `list` = a tabela detalhada (operação, datas). */
export function tourView31(s: GameState, list: () => HTMLElement): HTMLElement {
  let draft: string[] = [];
  try { draft = tourStops20(); } catch { draft = []; }
  const m = tour31(s, { tourId: ui31.tourId || undefined, draft, month: ui31.mon ?? undefined });
  const host = h('div', { class: 'sc31-host' });
  const shift = (k: number): void => { const mm = m.month.month + k; ui31.mon = { year: m.month.year + Math.floor(mm / 12), month: ((mm % 12) + 12) % 12 }; host.replaceWith(tourView31(s, list)); };
  const tools = h('span', { class: 'sc31-pick' },
    m.picks.length > 1 ? select(m.tour?.id ?? '', m.picks.map((x) => ({ value: x.id, label: `${x.actName}: ${x.name}` })), (v) => { ui31.tourId = v; ui31.mon = null; host.replaceWith(tourView31(s, list)); }, { 'aria-label': t(l('Turnê', 'Tour')) }) : null,
    h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Mês anterior', 'Previous month')), onclick: () => shift(-1) }, '‹'),
    h('b', null, t(m.month.label)),
    h('button', { type: 'button', class: 'btn small ghost', 'aria-label': t(l('Próximo mês', 'Next month')), onclick: () => shift(1) }, '›'));
  const repaint = (): void => { if (host.isConnected) host.replaceWith(tourView31(s, list)); };
  host.appendChild(sceneView31(s, {
    id: 'tour', title: l('Turnê', 'Tour'), W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintTour(cv, s, m, repaint),
    panels: { bus: () => busPanel(s, m), conflict: (dom?: string) => conflictPanel(s, m, dom) },
    list, tools,
    note: m.conflicts ? l('Há conflito na agenda (dia vermelho com "!"): clique nele para resolver.', 'There is a schedule conflict (red day with "!"): click it to resolve.') : undefined,
    intro: l('Mapa e calendário juntos: o tamanho do ponto é a lotação, a cor diz se já tocou, e cada dia livre tem um "+" para marcar data.', 'Map and calendar together: dot size is capacity, the colour says whether it was played, and each free day has a "+" to book a date.'),
    legend: h('p', { class: 'sc31-legend' }, TOUR_LEGEND31.map((x) => h('span', null, h('b', null, x.sym), ' ', t(x.name)))),
  }));
  return host;
}

// painel rápido de um artista com turnê marcada: leva ao mapa + calendário
registerQuick31({
  id: 'q.tourmap', verb: 'open', icon: 'tour-bus', kinds: ['act'], passive: true, label: l('Ver a turnê no mapa', 'See the tour on the map'),
  applies: (s, tg) => tg.kind === 'act' && tourList(s).some((x) => x.actId === tg.id && (x.status === 'planned' || x.status === 'running')),
  dest: () => ({ area: 'shows', tab: 'showsHub/tours' }),
});
