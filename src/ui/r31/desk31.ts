// R31 · onda 2 (J) — MESA DO CHEFE (Hoje em cena): pintura em pixel art (primitivas da sede, prim27) e painéis
// curtos que resolvem na própria cena: o telefone mostra cada decisão com as opções (as MESMAS funções da Mesa do mês e
// da caixa: resolveDecision, answerMsg, acceptCounter/withdrawOffer); o mural abre o painel rápido de cada projeto;
// o jornal lista o que mudou. "Ver como lista" volta às três colunas do Hoje.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { gateOf18 } from '../../sim/sys/decide18';
import type { GameState } from '../../sim/types';
import { modal, rerender, toast } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, textWidth } from '../pixel/font';
import { eraOf, paletteOf } from '../pixel/palette';
import { C, INK, Px, lv, mix, tint, withAlpha, type Col } from '../pixel/px';
import { gearOf27, lightOf27, prim27, type Ctx27, type Plan27 } from '../ps/hqpx27';
import { P as people } from '../../sim/sys/people/state';
import { lockBtn31, quickBtn31 } from './lock31';
import { DESK_ACTS31, DESK_FY31, PIN31, PIN_MAX31, desk31, pinBox31, type Desk31, type DeskCall31 } from './desk31model';
import { ALERT31, MON31 } from './scene31model';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { goToHub } from '../sys/project12';

// ---------------------------------------------------------------- pintura

const PIN_COL: Record<string, Col> = { ok: C('#3aa84a'), late: C('#f0b020'), stuck: C('#d8342c') };

function phonePx(p: Px, x: number, y: number, year: number, ringing: boolean): void {
  // x,y = canto de baixo à esquerda (em cima da mesa)
  if (year < 1930) { // castiçal
    p.rect(x + 4, y - 3, 8, 3, INK); p.rect(x + 7, y - 16, 2, 13, C('#2a2a2e')); p.rect(x + 5, y - 19, 6, 3, C('#2a2a2e'));
    p.rect(x + 12, y - 14, 3, 6, C('#2a2a2e')); p.put(x + 13, y - 15, C('#c09048'));
  } else if (year < 1970) { // de disco, preto
    p.rect(x + 1, y - 7, 16, 7, C('#1e1e22')); p.rect(x + 2, y - 8, 14, 1, C('#3a3a40')); p.disc(x + 9, y - 4, 2.5, C('#d8d0c0')); p.put(x + 9, y - 4, INK);
    p.rect(x, y - 11, 18, 3, C('#2a2a2e')); p.rect(x - 1, y - 12, 4, 3, C('#2a2a2e')); p.rect(x + 15, y - 12, 4, 3, C('#2a2a2e'));
  } else if (year < 1992) { // de teclas
    const body = year < 1982 ? C('#c8302c') : C('#d8cfb8');
    p.rect(x + 1, y - 7, 17, 7, body); p.rect(x + 2, y - 8, 15, 1, tint(body, 0.25));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) p.put(x + 7 + i * 2, y - 6 + j * 2, C('#f4f0e4'));
    p.rect(x, y - 11, 19, 3, tint(body, -0.15)); p.rect(x - 1, y - 12, 4, 3, tint(body, -0.15)); p.rect(x + 16, y - 12, 4, 3, tint(body, -0.15));
  } else if (year < 2010) { // sem fio com visor
    p.rect(x + 1, y - 5, 18, 5, C('#2a2a30')); p.rect(x + 4, y - 15, 6, 11, C('#3a3a44')); p.rect(x + 5, y - 13, 4, 3, C('#9ad070'));
    for (let j = 0; j < 3; j++) p.hline(x + 5, x + 8, y - 9 + j * 2, C('#8a8a96'));
  } else { // celular no suporte
    p.rect(x + 3, y - 3, 12, 3, C('#3a3a40')); p.rect(x + 5, y - 17, 8, 14, C('#1a1a20')); p.rect(x + 6, y - 16, 6, 11, ringing ? C('#7ad0ff') : C('#2a4a6a'));
  }
  if (ringing) { // ondas do toque
    for (const [dx, dy] of [[-3, -14], [-5, -16], [21, -14], [23, -16]] as const) p.rect(x + dx, y + dy, 1, 4, C('#ff4a3a'));
  }
}

function calendarPx(p: Px, m: Desk31, x: number, y: number, w: number, hh: number): void {
  p.rect(x, y, w, hh, C('#f4ecd8')); p.rect(x, y, w, 12, C('#c8302c'));
  p.rect(x + w / 2 - 3, y - 3, 6, 4, C('#5a5a62'));
  const head = `${t(MON31[m.month])} ${String(m.year).slice(-2)}`;
  drawText(p, head, x + Math.round((w - textWidth(head)) / 2), y + 4, C('#ffffff'));
  const cw = Math.floor((w - 4) / 7);
  for (let d = 1; d <= 35; d++) {
    const cx = x + 2 + ((d - 1) % 7) * cw, cy = y + 15 + Math.floor((d - 1) / 7) * 8;
    if (cy + 6 > y + hh) break;
    const mark = m.cal.days.includes(d);
    p.rect(cx, cy, cw - 1, 6, mark ? C('#3a6ad0') : C('#e2d8c0'));
  }
}

function boardPx(p: Px, m: Desk31, x: number, y: number, w: number, hh: number): void {
  p.rect(x, y, w, hh, C('#5a3420')); p.rect(x + 2, y + 2, w - 4, hh - 4, C('#b88a58'));
  for (let i = 0; i < 40; i++) p.put(x + 3 + ((i * 37) % (w - 6)), y + 3 + ((i * 53) % (hh - 6)), C('#9a6e44'));
  if (!m.pins.length) { p.rect(x + 30, y + 18, 16, 18, C('#f4ecd8')); p.rect(x + 37, y + 22, 2, 10, C('#9a9080')); p.rect(x + 33, y + 26, 10, 2, C('#9a9080')); return; }
  m.pins.slice(0, PIN_MAX31).forEach((pn, i) => {
    const b = pinBox31(i);
    const paper = pn.status === 'ok' ? C('#f4ecd8') : pn.status === 'late' ? C('#f8e890') : C('#f6d0c8');
    p.rect(b.x, b.y + 2, b.w, b.h - 2, paper);
    for (let j = 0; j < 4; j++) p.hline(b.x + 2, b.x + b.w - 3 - (j % 2) * 3, b.y + 6 + j * 3, C('#8a8478'));
    p.disc(b.x + b.w / 2, b.y + 2, 2, PIN_COL[pn.status]);
    p.put(Math.round(b.x + b.w / 2) - 1, b.y + 1, C('#ffffff'));
  });
  // fio vermelho entre bilhetes travados (o mural "investiga" o problema)
  const stuck = m.pins.slice(0, PIN_MAX31).map((pn, i) => [pn, pinBox31(i)] as const).filter(([pn]) => pn.status !== 'ok');
  for (let i = 1; i < stuck.length; i++) p.line(stuck[i - 1][1].x + 7, stuck[i - 1][1].y + 2, stuck[i][1].x + 7, stuck[i][1].y + 2, C('#c8302c'));
}

function paintDesk(cv: HTMLCanvasElement, s: GameState, m: Desk31): void {
  const W = m.W, H = m.H, FY = DESK_FY31, year = m.year;
  const pal = paletteOf(year);
  const shell: Plan27['shell'] = m.shell === 'kitchen' ? 'garage' : m.shell === 'top' ? 'tower' : 'shop';
  const cell = { kind: 'office' as Plan27['cells'][number]['kind'], floor: 0, x: 0, y: 0, w: W, h: FY + 4 };
  const pl = { hq: m.hq, year, shell, gear: gearOf27(year), light: lightOf27(shell, year), era: eraOf(year), facade: 'block', W, H, gy: H, bx: 0, bw: W, top: 0,
    floors: 1, cells: [cell], rooms: [], city: s.config.homeCity ?? '', lms: [], brand: '', seed: 31, flock: {}, vip: null, crown: null } as unknown as Plan27;
  const back = new Px(W, H);
  const g: Ctx27 = { p: back, pal, pl, r: prim27.rng27(31), lamp: pl.light === 'tube' ? C('#e8f4ff') : pl.light === 'led' ? mix(C('#ffffff'), pal.accent, 0.25) : C('#ffd889') };
  prim27.wallFill(g, cell as Plan27['cells'][number]);
  // chão na frente (tábuas) até o pé do desenho
  for (let yy = FY + 4; yy < H; yy++) for (let xx = 0; xx < W; xx++) back.put(xx, yy, ((xx + (yy % 2) * 7) % 13 === 0) ? lv(pal.floors.office.a, 1.2) : (yy % 3 ? pal.floors.office.a : pal.floors.office.b));
  back.rect(0, FY + 4, W, 1, withAlpha(C('#000000'), 60));
  // parede: mural, calendário, janela, relógio, quadros
  const deco = new Px(W, H);
  g.p = deco;
  boardPx(deco, m, 12, 20, 82, 58);
  calendarPx(deco, m, 104, 18, 46, 58);
  const wx = m.shell === 'top' ? 220 : 228, ww = m.shell === 'top' ? 90 : 76, wh = m.shell === 'kitchen' ? 46 : 66;
  prim27.backWindow(g, wx, 16, ww, wh, year < 1930);
  deco.disc(200, 44, 8, C('#f4ecd8')); deco.ring(200, 44, 8, INK); deco.line(200, 44, 200, 38, INK); deco.line(200, 44, 204, 46, INK);
  if (m.hq >= 1) { prim27.goldDisc(g, 162, 24, false); prim27.goldDisc(g, 176, 24, true); }
  prim27.plant(g, 16, FY + 2, true);
  prim27.filing(g, 288, FY + 2); prim27.filing(g, 299, FY + 2);
  deco.outline(INK);
  back.blit(deco, 0, 0);
  for (const lx of [60, 260]) prim27.lamp({ ...g, p: back }, lx, 0, FY, 30);
  // cadeira atrás da mesa (encosto alto)
  const chair = m.shell === 'kitchen' ? pal.wood : year < 1990 ? C('#5a2a20') : C('#2a2a32');
  back.rect(152, 82, 22, 34, chair); back.rect(153, 83, 20, 2, tint(chair, 0.25));
  // frente: mesa e objetos
  const front = new Px(W, H);
  const top = FY - 30;
  if (m.shell === 'kitchen') { // mesa da cozinha: tampo claro, toalha xadrez, pernas
    front.rect(84, top, 164, 5, C('#c8a070')); for (let xx = 84; xx < 248; xx++) if (((xx >> 2) % 2) === 0) front.rect(xx, top + 5, 1, 7, C('#c8302c')); else front.rect(xx, top + 5, 1, 7, C('#f4ecd8'));
    for (const lx of [90, 238]) front.rect(lx, top + 12, 4, FY - top - 12, C('#8a5a30'));
  } else {
    const wood = m.shell === 'top' ? C('#4a2418') : pal.wood;
    front.rect(84, top, 164, 5, tint(wood, 0.15)); front.hline(84, 247, top, tint(wood, 0.4));
    front.rect(88, top + 5, 156, FY - top - 5, wood);
    for (const dx of [92, 196]) { front.rect(dx, top + 9, 44, 8, tint(wood, -0.15)); front.rect(dx + 19, top + 12, 6, 2, C('#c09048')); front.rect(dx, top + 19, 44, 8, tint(wood, -0.15)); front.rect(dx + 19, top + 22, 6, 2, C('#c09048')); }
    front.rect(140, top + 9, 52, FY - top - 12, tint(wood, -0.08));
  }
  // objetos em cima da mesa (pé em top)
  phonePx(front, 98, top, year, m.calls.length > 0);
  const nLet = Math.min(6, m.letters);
  front.rect(124, top - 6, 24, 6, C('#7a7a82')); front.rect(125, top - 7, 22, 1, C('#a8acb8'));
  for (let i = 0; i < nLet; i++) front.rect(126 + (i % 2), top - 7 - i, 19, 1, i % 2 ? C('#f4ecd8') : C('#e8dcc0'));
  front.rect(182, top - 6, 32, 6, C('#ece4d0')); front.rect(182, top - 6, 32, 1, C('#ffffff'));
  for (let j = 0; j < 2; j++) front.hline(185, 210, top - 4 + j * 2, C('#5a5a62'));
  front.rect(185, top - 5, 8, 1, C('#170e12'));
  if (year >= 1940) { front.rect(228, top - 2, 8, 2, C('#2a2a2e')); front.line(232, top - 2, 236, top - 14, C('#2a2a2e')); front.rect(234, top - 18, 10, 5, C('#2e5a52')); }
  front.outline(INK);
  // pinta: fundo → você (sentado atrás da mesa) → frente
  const ctx = blitPx31(cv, back.d, W, H);
  if (!ctx) return;
  if (!m.me.away) {
    const pr = m.me.personId ? s.persons[m.me.personId] : undefined;
    const sp = avatarSprite(lookOf(pr ?? { id: 'player' }), { year, role: pr?.role ?? null, pose: 'sit', dir: 'SE' });
    ctx.drawImage(sp.c, 163 - sp.ax, top + 12 - sp.ay);
  } else {
    ctx.fillStyle = '#f4ecd8'; ctx.fillRect(156, 96, 14, 9); ctx.fillStyle = '#3a6ad0'; ctx.fillRect(158, 98, 10, 1); ctx.fillRect(158, 101, 7, 1); // bilhete "fui viajar"
  }
  ctx.drawImage(front.canvas(), 0, 0);
}

// ---------------------------------------------------------------- painéis na cena

const lvTag = (lv: DeskCall31['level']): HTMLElement => h('span', { class: `sc31-lv lvl-${lv}`, title: t(ALERT31[lv].name) }, ALERT31[lv].sym);

function callRow(s: GameState, c: DeskCall31, close: () => void): HTMLElement {
  const done = (x?: L | null, ok?: L): void => { close(); if (x) toast(t(x), ok ? 'good' : 'info'); rerender(); };
  const due = c.due !== undefined ? (c.due - s.week <= 0 ? t(l('vence nesta semana', 'due this week')) : t(l('vence em {n} sem.', 'due in {n} wk'), { n: c.due - s.week })) : '';
  const head = h('div', null, lvTag(c.level), h('b', null, t(c.title)), ' ', h('small', { class: 'muted' }, t(c.word), due ? ` · ${due}` : ''));
  if (c.kind === 'decision') {
    const d = s.decisions.find((x) => x.id === c.ref);
    if (!d) return h('li', { class: 'sc31-row' }, head);
    return h('li', { class: 'sc31-row' }, head, h('p', { class: 'small' }, t(d.text)),
      h('div', { class: 'row wrap' }, d.options.map((o) => {
        const why = o.id === d.defaultOption ? null : gateOf18(s, d.eventId, o.id, d.ctx);
        return lockBtn31(t(o.label), why, () => { DESK_ACTS31.decide(s, d.id, o.id); done(l('Decisão tomada.', 'Decision made.'), l('ok', 'ok')); }, { cls: `btn small${o.id === d.defaultOption ? ' ghost' : ''}`, title: o.hint ? t(o.hint) : undefined });
      })),
      h('small', { class: 'muted' }, t(l('Se ignorar: ', 'If ignored: ')), t(d.options.find((o) => o.id === d.defaultOption)?.label ?? l('—'))));
  }
  if (c.kind === 'offer') {
    return h('li', { class: 'sc31-row' }, head, h('div', { class: 'row wrap' },
      h('button', { type: 'button', class: 'btn small primary', onclick: () => { DESK_ACTS31.acceptCounter(s, c.ref); done(l('Contraproposta aceita.', 'Counter-offer accepted.'), l('ok', 'ok')); } }, t(l('Aceitar contraproposta', 'Accept counter-offer'))),
      h('button', { type: 'button', class: 'btn small ghost', onclick: () => { DESK_ACTS31.withdraw(s, c.ref); done(l('Oferta retirada.', 'Offer withdrawn.')); } }, t(l('Retirar oferta', 'Withdraw offer'))),
      c.actId ? quickBtn31({ kind: 'act', id: c.actId }, s.acts[c.actId]?.name ?? '') : null));
  }
  if (c.kind === 'inbox') {
    const msg = people(s).inbox.find((x) => x.id === c.ref);
    return h('li', { class: 'sc31-row' }, head, msg?.body ? h('p', { class: 'small' }, t(msg.body)) : null, h('div', { class: 'row wrap' },
      ...(msg?.actions ?? []).map((a) => h('button', { type: 'button', class: 'btn small', onclick: () => { const r = DESK_ACTS31.reply(s, msg!.id, a.id); done(r); } }, t(a.label))),
      moreBtn31(l('Abrir na caixa', 'Open in inbox'), () => { close(); runGo31({ area: 'cockpit', tab: ['ck20', 'inbox'] }); })));
  }
  return h('li', { class: 'sc31-row' }, head, moreBtn31(l('Abrir onde se resolve', 'Open where it is resolved'), () => { close(); runGo31({ area: c.owner }); }));
}

function phonePanel(s: GameState): void {
  const m = desk31(s);
  let close = (): void => {};
  const body = h('div', { class: 'sc31-panel' },
    h('p', { class: 'muted small' }, t(m.callsLine)),
    m.calls.length ? h('ul', null, m.calls.map((c) => callRow(s, c, () => close()))) : h('p', null, t(l('Nada pede decisão agora: dá para avançar.', 'Nothing needs a decision now: you can advance.'))));
  close = modal(t(l('Telefone · decidir agora', 'Phone · decide now')), body, { wide: true });
}

function boardPanel(s: GameState): void {
  const m = desk31(s);
  let close = (): void => {};
  const body = h('div', { class: 'sc31-panel' },
    h('ul', null, m.pins.map((p) => h('li', { class: 'sc31-row' },
      h('div', null, h('span', { class: `sc31-lv lvl-${p.status === 'stuck' ? 'crit' : p.status === 'late' ? 'soon' : 'info'}` }, PIN31[p.status].sym), h('b', null, p.title), ' ',
        h('small', { class: 'muted' }, `${t(p.stage)} · ${t(PIN31[p.status].name)} · ${t(p.why)}`)),
      h('div', { class: 'row wrap' },
        h('button', { type: 'button', class: 'btn small', onclick: () => { close(); goToHub(p.actId, p.pid); } }, t(l('Abrir a rua do projeto', 'Open the project street'))),
        quickBtn31({ kind: 'project', id: p.pid }, p.title))))),
    moreBtn31(l('Todos os projetos', 'All projects'), () => { close(); runGo31({ area: 'project' }); }));
  close = modal(t(l('Mural · projetos em andamento', 'Board · projects in progress')), body, { wide: true });
}

function newsPanel(s: GameState): void {
  const m = desk31(s);
  let close = (): void => {};
  const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
  const body = h('div', { class: 'sc31-panel' },
    m.news.length ? h('ul', null, m.news.map((r) => h('li', { class: `sc31-row ${r.tone ? 't-' + r.tone : ''}` },
      h('span', { class: 'sc31-lv lvl-info' }, r.tone === 'bad' ? '▼' : r.tone === 'good' ? '▲' : '•'), tx(r.title),
      r.go ? h('div', { class: 'row' }, moreBtn31(l('Ver', 'See'), () => { close(); runGo31({ area: r.go!.area, tab: r.go!.tab, hub: r.go!.hub }); })) : null)))
      : h('p', { class: 'muted' }, t(l('Ainda nada: avance o tempo para ver o resumo.', 'Nothing yet: advance time to see the summary.'))));
  close = modal(t(l('Jornal · o que mudou', 'Paper · what changed')), body, { wide: true });
}

// ---------------------------------------------------------------- vista

/** A Mesa do chefe; `list` é a alternativa (as três colunas do Hoje). */
export function deskView31(s: GameState, list: () => HTMLElement): HTMLElement {
  const m = desk31(s);
  return sceneView31(s, {
    id: 'desk', title: l('Mesa do chefe', 'The boss\'s desk'), W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintDesk(cv, s, m),
    panels: { phone: () => phonePanel(s), board: () => boardPanel(s), news: () => newsPanel(s) },
    list,
    note: m.me.away,
    intro: l('Os objetos da mesa são os botões: o telefone toca quando algo pede decisão, o mural mostra os projetos e o jornal o que mudou.', 'The objects on the desk are the buttons: the phone rings when something needs a decision, the board shows the projects and the paper what changed.'),
    legend: h('p', { class: 'sc31-legend' },
      h('span', null, h('b', null, '☎'), ' ', t(m.callsLine)),
      h('span', null, h('b', null, `${PIN31.ok.sym}/${PIN31.late.sym}/${PIN31.stuck.sym}`), ' ', t(l('mural: no prazo / atrasado / travado', 'board: on schedule / behind / stuck'))),
      h('span', null, h('b', null, `${ALERT31.crit.sym} ${ALERT31.soon.sym} ${ALERT31.normal.sym}`), ' ', t(l('crítico · prazo próximo · decisão', 'critical · deadline soon · decision')))),
  });
}
