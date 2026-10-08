// Interface do festival próprio: fundação, editor de terreno (grade), line-up, previsão e o dia do
// festival em pixel art com pensamentos do público em balões.

import { CITIES, l } from '../../../data/world';
import { t } from '../../../i18n/strings';
import {
  FEST_TILES, MAX_FESTS, addToLineup, canFoundFestival, countTiles, createFestival, festModel, foundCost, guestAccepts, guestFee, isMine, lineupMax, liveOf, placeTile,
  removeFromLineup, setFestival, tileDef, type FestEdition, type FestTile, type OwnFestival,
} from '../../../sim/sys/live';
import type { GameState } from '../../../sim/types';
import { money, playerActs } from '../../../sim/util';
import { $, N, cityName, monthName, pill, rerender, section, toast } from '../../common';
import { h, select } from '../../dom';
import { Px } from '../../pixel/px';
import { registerCutscene, registerSection, openScene } from '../../registry';
import { store } from '../../store';
import { chips, ic, meter, stat } from '../../vis';
import { drawPerson, drawTile, tileUrl } from './art';

const draft = { name: '', city: '', month: 6, days: 1 };

function foundForm(s: GameState): HTMLElement {
  draft.city ||= s.config.homeCity;
  draft.name ||= t(l('Festival {c}', '{c} Festival'), { c: cityName(draft.city) });
  const why = canFoundFestival(s);
  const cost = foundCost(s);
  const cities = [...CITIES].sort((a, b) => cityName(a.id).localeCompare(cityName(b.id)));
  return h('div', { class: 'lv-form' },
    h('label', null, t(l('Nome', 'Name')), h('input', { type: 'text', value: draft.name, maxlength: 40, oninput: (e: Event) => (draft.name = (e.target as HTMLInputElement).value) })),
    h('label', null, t(l('Cidade', 'City')), select(draft.city, cities.map((c) => ({ value: c.id, label: cityName(c.id) })), (v) => (draft.city = v))),
    h('label', null, t(l('Mês', 'Month')), select(draft.month, Array.from({ length: 12 }, (_, i) => ({ value: i, label: monthName(i) })), (v) => (draft.month = v))),
    h('label', null, t(l('Dias', 'Days')), select(draft.days, [1, 2, 3].map((d) => ({ value: d, label: String(d) })), (v) => (draft.days = v))),
    h('button', { class: 'btn primary', disabled: !!why || s.player.cash < cost, title: why ? t(why) : '', onclick: () => {
      const f = createFestival(s, draft.name, draft.city, draft.month, draft.days);
      if ('pt' in f) return toast(t(f), 'bad');
      toast(t(l('Festival fundado! Monte o terreno.', 'Festival founded! Lay out the grounds.')), 'good');
      draft.name = '';
      rerender();
      openFestivalEditor(s, f.id);
    } }, ic('flag'), ' ', t(l('Fundar ({c})', 'Found ({c})'), { c: $(cost) })),
    why ? h('small', { class: 'muted' }, t(why)) : null,
  );
}

function estimateBox(s: GameState, f: OwnFestival): HTMLElement {
  const m = festModel(s, f);
  const rev = m.revenue.tickets + m.revenue.food + m.revenue.bar + m.revenue.merch;
  const cost = m.costs.tiles + m.costs.fees + m.costs.production;
  return h('div', { class: 'lv-est' },
    chips(
      stat('fans', `${N(m.attendance)} / ${N(m.capacity)}`, l('Público previsto / capacidade', 'Expected crowd / capacity')),
      stat('chart-up', N(m.demand), l('Demanda', 'Demand'), m.overflow > m.capacity * 0.2 ? 'warn' : ''),
      stat('clock', `${m.queueMin} min`, l('Fila do banheiro', 'Toilet queue'), m.queueMin > 30 ? 'bad' : ''),
      stat('money', $(rev), l('Receita prevista', 'Expected revenue')),
      stat('money', $(-cost), l('Custos previstos', 'Expected costs'), 'bad'),
      stat('sparkle', $(rev - cost), l('Resultado previsto (sem clima)', 'Expected result (no weather)'), rev - cost >= 0 ? 'good' : 'bad'),
    ),
    meter('fire', l('Empolgação', 'Excitement'), m.excitement),
    meter('heart', l('Conforto', 'Comfort'), m.comfort),
    meter('lock', l('Segurança', 'Safety'), m.safety),
    m.priceTooHigh ? h('p', { class: 'small warn' }, ic('warning'), ' ', t(l('Ingresso caro para esse line-up: a demanda cai.', 'Ticket too pricey for this line-up: demand drops.'))) : null,
    !m.stages ? h('p', { class: 'small bad' }, ic('warning'), ' ', t(l('Sem palco não há festival.', 'No stage, no festival.'))) : null,
    !countTiles(f).gate ? h('p', { class: 'small bad' }, ic('warning'), ' ', t(l('Coloque ao menos um acesso.', 'Place at least one gate.'))) : null,
  );
}

function festivalCard(s: GameState, f: OwnFestival): HTMLElement {
  const last = f.editions.at(-1);
  return h('div', { class: 'lv-fest' },
    h('header', null, ic('flag', 2), h('b', null, f.name), ' ', pill(cityName(f.cityId)), pill(`${monthName(f.month)} · ${f.days}d`), pill(t(l('{n} edições', '{n} editions'), { n: f.editions.length }))),
    meter('star', l('Prestígio do festival', 'Festival prestige'), f.rep),
    h('p', { class: 'small muted' }, t(l('Próxima edição: {m}/{y} · terreno {w}×{h} · line-up {n}/{max}', 'Next edition: {m}/{y} · grounds {w}×{h} · line-up {n}/{max}'), { m: monthName(f.month), y: f.nextYear, w: f.w, h: f.h, n: f.lineup.length, max: lineupMax(f) })),
    estimateBox(s, f),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => openFestivalEditor(s, f.id) }, ic('pen'), ' ', t(l('Terreno e line-up', 'Grounds and line-up'))),
      last ? h('button', { class: 'btn ghost', onclick: () => openScene(t(l('{f} {y}', '{f} {y}'), { f: f.name, y: last.year }), (close) => festivalDayView(s, f, last, close)) }, ic('film'), ' ', t(l('Rever a edição {y}', 'Replay the {y} edition'), { y: last.year })) : null,
    ),
    f.editions.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, ...[l('Ano', 'Year'), l('Público', 'Crowd'), l('Nota', 'Rating'), l('Clima', 'Weather'), l('Resultado', 'Result')].map((x) => h('th', null, t(x))))),
      h('tbody', null, f.editions.slice(-6).reverse().map((e) => h('tr', null,
        h('td', null, String(e.year)), h('td', null, N(e.attendance)), h('td', { class: e.rating >= 60 ? 'good' : e.rating < 40 ? 'bad' : '' }, String(e.rating)),
        h('td', null, weatherIcon(e)), h('td', { class: e.revenue - e.costs >= 0 ? 'good' : 'bad' }, $(e.revenue - e.costs), e.disaster ? h('small', { class: 'bad' }, ' ', t(e.disaster)) : null)))),
    ) : null,
  );
}

function weatherIcon(e: FestEdition): string {
  return e.weather === 'storm' ? '⛈' : e.weather === 'rain' ? '🌧' : '☀';
}

export function festivalSection(s: GameState): HTMLElement {
  const lv = liveOf(s);
  return section(t(l('Festival próprio', 'Your own festival')),
    h('p', { class: 'muted small' }, t(l('Monte o terreno como num parque: palcos, acessos, banheiros, comida, camping e segurança. Na data, o público decide.', 'Lay out the grounds like a theme park: stages, gates, toilets, food, camping and security. On the day, the crowd decides.'))),
    lv.fests.map((f) => festivalCard(s, f)),
    lv.fests.length < MAX_FESTS ? foundForm(s) : null,
  );
}

// ---------------------------------------------------------------- editor de terreno

let brush: FestTile = 'stage';

export function openFestivalEditor(s: GameState, festId: string): void {
  openScene(l('Terreno do festival', 'Festival grounds'), () => {
    const root = h('div', { class: 'lv-editor' });
    const draw = () => {
      const f = liveOf(s).fests.find((x) => x.id === festId);
      if (!f) return root.replaceChildren(h('p', null, '—'));
      root.replaceChildren(editorView(s, f, draw));
    };
    draw();
    return root;
  }, { onClose: () => rerender() });
}

function editorView(s: GameState, f: OwnFestival, redraw: () => void): HTMLElement {
  const c = countTiles(f);
  const palette = h('div', { class: 'lv-palette', role: 'radiogroup', 'aria-label': t(l('Peça a posicionar', 'Piece to place')) },
    [...FEST_TILES.map((d) => ({ id: d.id as FestTile, name: d.name, desc: d.desc, cost: d.cost })), { id: '' as FestTile, name: l('Limpar (área de público)', 'Clear (crowd area)'), desc: l('Cada quadrado livre comporta ~900 pessoas.', 'Each free square holds ~900 people.'), cost: 0 }].map((d) =>
      h('button', { class: `lv-brush ${brush === d.id ? 'on' : ''}`, role: 'radio', 'aria-checked': brush === d.id ? 'true' : 'false', title: t(d.desc), onclick: () => { brush = d.id; redraw(); } },
        h('img', { class: 'px', src: tileUrl(d.id), width: 32, height: 32, alt: '' }),
        h('span', null, t(d.name), h('small', { class: 'muted' }, d.cost ? ` ${$(money(s, d.cost))}` : ''), h('small', { class: 'muted' }, d.id ? ` ×${c[d.id as Exclude<FestTile, ''>]}` : ` ×${c.free}`)))));
  const grid = h('div', { class: 'lv-grid', style: `grid-template-columns: repeat(${f.w}, 1fr)`, role: 'grid', 'aria-label': t(l('Terreno', 'Grounds')) });
  for (let y = 0; y < f.h; y++) {
    for (let x = 0; x < f.w; x++) {
      const tile = f.grid[y * f.w + x];
      grid.appendChild(h('button', {
        class: 'lv-cell', style: `background-image:url(${tileUrl(tile)})`, 'aria-label': `${x + 1},${y + 1}: ${tile ? t(tileDef[tile].name) : t(l('livre', 'free'))}`,
        onclick: () => { placeTile(s, f.id, x, y, brush); redraw(); },
      }));
    }
  }
  const mine = playerActs(s).map((id) => s.acts[id]).filter((a) => !f.lineup.some((x) => x.actId === a.id));
  const guests = Object.values(s.acts).filter((a) => !isMine(s, a.id) && (a.status === 'active' || a.status === 'emerging') && a.fame > 5 && !f.lineup.some((x) => x.actId === a.id)).sort((a, b) => b.fame - a.fame).slice(0, 40);
  let pick = '';
  const settings = h('div', { class: 'lv-side' },
    h('label', null, t(l('Ingresso por dia (US$ reais)', 'Ticket per day (real US$)')), h('input', { type: 'number', min: 5, max: 400, value: f.price, onchange: (e: Event) => { setFestival(s, f.id, { price: Number((e.target as HTMLInputElement).value) }); redraw(); } }), h('small', { class: 'muted' }, ` ≈ ${$(money(s, f.price))}`)),
    h('label', null, t(l('Dias', 'Days')), select(f.days, [1, 2, 3].map((d) => ({ value: d, label: String(d) })), (v) => { setFestival(s, f.id, { days: v }); redraw(); })),
    h('label', null, t(l('Mês', 'Month')), select(f.month, Array.from({ length: 12 }, (_, i) => ({ value: i, label: monthName(i) })), (v) => { setFestival(s, f.id, { month: v }); redraw(); })),
    h('h4', null, t(l('Line-up ({n}/{m})', 'Line-up ({n}/{m})'), { n: f.lineup.length, m: lineupMax(f) })),
    h('ul', { class: 'lv-lineup' }, f.lineup.map((x) => {
      const a = s.acts[x.actId];
      return h('li', null, h('b', null, a?.name ?? '?'), ' ', isMine(s, x.actId) ? pill(t(l('seu', 'yours')), 'good') : pill($(money(s, x.fee))), ' ',
        h('button', { class: 'btn small ghost', 'aria-label': t(l('Remover', 'Remove')), onclick: () => { removeFromLineup(s, f.id, x.actId); redraw(); } }, '✕'));
    })),
    h('div', { class: 'row' },
      select('', [{ value: '', label: t(l('— escolher atração —', '— pick an act —')) },
        ...mine.map((a) => ({ value: a.id, label: `★ ${a.name} (${t(l('seu', 'yours'))})` })),
        ...guests.map((a) => ({ value: a.id, label: `${a.name} · ${Math.round(a.fame)} · ${$(money(s, guestFee(s, a)))}${guestAccepts(f, a) ? '' : ' ✗'}`, disabled: !guestAccepts(f, a) }))], (v) => (pick = v), { 'aria-label': t(l('Atração', 'Act')) }),
      h('button', { class: 'btn small', onclick: () => { if (!pick) return; const e = addToLineup(s, f.id, pick); if (e) toast(t(e), 'bad'); redraw(); } }, t(l('Convidar', 'Book'))),
    ),
    h('small', { class: 'muted' }, t(l('✗ = o festival ainda não tem prestígio para esse nome. Cachês são pagos na data.', '✗ = the festival lacks prestige for that name yet. Fees are paid on the day.'))),
  );
  return h('div', null,
    h('div', { class: 'lv-editor-grid' }, palette, h('div', { class: 'lv-ground' }, grid), settings),
    estimateBox(s, f),
  );
}

// ---------------------------------------------------------------- o dia do festival

export function festivalDayView(s: GameState, f: OwnFestival, e: FestEdition, close: () => void): HTMLElement {
  const W = f.w * 16;
  const H = f.h * 16;
  const scale = Math.max(2, Math.min(4, Math.floor(880 / W)));
  const canvas = h('canvas', { class: 'px lv-day', width: W, height: H, style: `width:${W * scale}px;max-width:100%`, role: 'img', 'aria-label': t(l('O festival visto de cima, com o público andando.', 'The festival seen from above, with the crowd walking around.')) });
  const wrap = h('div', { class: 'lv-day-wrap' }, canvas);
  const free: { x: number; y: number }[] = [];
  f.grid.forEach((tile, i) => { if (!tile) free.push({ x: i % f.w, y: Math.floor(i / f.w) }); });
  const n = Math.max(10, Math.min(500, Math.round(e.attendance / 200)));
  const crowd = Array.from({ length: n }, (_, i) => {
    const sp = free[i % Math.max(1, free.length)] ?? { x: 0, y: 0 };
    return { x: sp.x * 16 + Math.random() * 13, y: sp.y * 16 + Math.random() * 11, seed: i * 7919, vx: 0, vy: 0 };
  });
  const base = new Px(W, H);
  f.grid.forEach((tile, i) => drawTile(base, (i % f.w) * 16, Math.floor(i / f.w) * 16, tile));
  const ctx = canvas.getContext('2d');
  let frame = 0;
  let raf = 0;
  const balloons = h('div', { class: 'lv-balloons', 'aria-hidden': 'true' });
  wrap.appendChild(balloons);
  const paint = () => {
    if (!ctx) return;
    const p = base.clone();
    for (const c of crowd) {
      if (frame % 20 === 0) {
        c.vx = (Math.random() - 0.5) * 0.6;
        c.vy = (Math.random() - 0.5) * 0.6;
      }
      c.x = Math.max(0, Math.min(W - 4, c.x + c.vx));
      c.y = Math.max(0, Math.min(H - 5, c.y + c.vy));
      drawPerson(p, Math.round(c.x), Math.round(c.y), c.seed, e.excitement > 65 && (frame + c.seed) % 40 < 20);
    }
    if (e.weather !== 'sun') for (let i = 0; i < (e.weather === 'storm' ? 120 : 60); i++) {
      const x = (i * 37 + frame * 3) % W;
      const y = (i * 53 + frame * 5) % H;
      p.line(x, y, x - 1, y + 3, 0xccffd0b0);
    }
    ctx.putImageData(new ImageData(new Uint8ClampedArray(p.d.buffer.slice(0)), W, H), 0, 0);
  };
  let bi = 0;
  const showBalloon = () => {
    if (!e.thoughts.length) return;
    const th = e.thoughts[bi % e.thoughts.length];
    bi += 1;
    const b = h('div', { class: `lv-balloon ${th.tone}`, style: `left:${((th.x + 0.5) / f.w) * 100}%;top:${(th.y / f.h) * 100}%` }, t(th.text));
    balloons.appendChild(b);
    while (balloons.children.length > 3) balloons.firstElementChild?.remove();
  };
  const reduced = !!store.prefs.reducedMotion;
  const loop = () => {
    if (!canvas.isConnected && frame > 2) return;
    frame += 1;
    paint();
    if (frame % 70 === 1) showBalloon();
    raf = requestAnimationFrame(loop);
  };
  if (reduced) {
    paint();
    e.thoughts.slice(0, 3).forEach(() => showBalloon());
  } else raf = requestAnimationFrame(loop);
  void raf;
  return h('div', { class: 'lv-day-scene' },
    wrap,
    chips(
      stat('fans', `${N(e.attendance)} / ${N(e.capacity)}`, l('Público / capacidade', 'Crowd / capacity')),
      stat('clock', `${e.queueMin} min`, l('Fila do banheiro', 'Toilet queue'), e.queueMin > 30 ? 'bad' : ''),
      stat('money', $(e.revenue), l('Receita', 'Revenue'), 'good'),
      stat('money', $(-e.costs), l('Custos', 'Costs'), 'bad'),
      stat('sparkle', String(e.rating), l('Nota', 'Rating'), e.rating >= 60 ? 'good' : e.rating < 40 ? 'bad' : ''),
    ),
    meter('fire', l('Empolgação', 'Excitement'), e.excitement),
    meter('heart', l('Conforto', 'Comfort'), e.comfort),
    meter('lock', l('Segurança', 'Safety'), e.safety),
    e.disaster ? h('p', { class: 'bad' }, ic('warning'), ' ', t(e.disaster)) : null,
    e.grew ? h('p', { class: 'good' }, ic('chart-up'), ' ', t(l('Sucesso: o terreno cresce para a próxima edição.', 'Success: the grounds grow for the next edition.'))) : null,
    h('h4', null, t(l('O que o público disse', 'What the crowd said'))),
    h('ul', { class: 'lv-thoughts' }, e.thoughts.map((th) => h('li', { class: th.tone }, '💬 ', t(th.text)))),
    h('p', { class: 'small muted' }, t(l('Line-up: {l}', 'Line-up: {l}'), { l: e.lineup.join(', ') })),
    h('button', { class: 'btn primary', onclick: close }, t(l('Fechar', 'Close'))),
  );
}

registerSection('shows', { id: 'live-festival', order: 40, render: (s) => festivalSection(s) });

registerCutscene('festivalDay', (s, cs, close) => {
  const f = liveOf(s).fests.find((x) => x.id === cs.data.festId);
  const e = f?.editions.find((x) => x.year === cs.data.year);
  if (!f || !e) return h('p', null, '—');
  return festivalDayView(s, f, e, close);
});
