// R31 · onda 4 (T) — AEROPORTO em cena (DOM + pintura). A construção segue a época (airport31model) e cada balcão
// abre um painel curto que chama a função do motor: temporadas no mar (bookCruise31), show por holograma
// (holoShow31) — ou leva à tela que já existe (turnês, olheiros, intermediário, sócios, casa de leilões).

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { auction31 } from '../../sim/sys/auction31';
import { playerPerson } from '../../sim/sys/life';
import {
  CRUISE31, bookCruise31, cruiseFee31, cruiseLock31, cruiseOpen31, holoLock31, holoQuote31, holoShow31, linerPorts31, travel31, airportEvents31,
} from '../../sim/sys/travel31';
import type { GameState } from '../../sim/types';
import { playerActs } from '../../sim/util';
import { $, modal, pill, rerender, toast } from '../common';
import { h, select } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, fitText } from '../pixel/font';
import { box, floor, screen, sign, wall, windowPane } from '../pixel/places/kit';
import { eraOf, paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, discV, ellipseV, lv, rectV, tint, volume, withAlpha, type Col } from '../pixel/px';
import { furniture } from '../pixel/sprites';
import { registerArea } from '../registry';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { vitStrip31 } from './vit31'; // r31 (VIT): vitrine do mês
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { airport31Model, type Air31 } from './airport31model';

const T = (x: L, v?: Record<string, string | number>): string => t(x, v);
const ui = { act: '', port: '', cities: new Set<string>() };
const cityN = (id: string): string => T(cityById[id]?.name ?? l(id, id));

// ---------------------------------------------------------------- pintura

// Saguão em vista frontal 2.5D, com o kit dos lugares (pixel/places/kit): parede e piso da paleta da época, janelas
// com a pista (trem, biplano, avião a hélice ou jato) e o mar com o navio, telão de partidas, balcões com volume e
// contorno escuro quente, placas e gente. Luz de cima à esquerda.
const TXT = C('#ffd040');

function outside(p: Px, m: Air31, x: number, y: number, w: number, h: number): void {
  const gy = y + h - 9;
  // chão lá fora: trilho, grama ou pista
  p.rect(x, gy, w, 9, m.era === 'rail' ? C('#8a7a5c') : m.era === 'field' ? C('#6e9a50') : C('#6a6a70'));
  if (m.era === 'rail') { for (let i = 0; i < w; i += 5) p.rect(x + i, gy + 4, 3, 3, C('#5a3a22')); p.hline(x, x + w - 1, gy + 4, C('#30303a')); p.hline(x, x + w - 1, gy + 6, C('#30303a')); }
  else if (m.era !== 'field') for (let i = 2; i < w; i += 12) p.rect(x + i, gy + 4, 6, 1, C('#f0f0e8'));
  const vx = x + 10, vy = gy - 14;
  if (m.era === 'rail') {
    rectV(p, vx, vy - 2, 34, 12, C('#2a2e38'));
    rectV(p, vx + 26, vy - 10, 10, 10, C('#2a2e38'));
    rectV(p, vx + 4, vy - 8, 5, 7, C('#3a3e48'));
    discV(p, vx + 8, vy + 11, 3, C('#3a3a40')); discV(p, vx + 24, vy + 11, 3, C('#3a3a40'));
    for (let i = 0; i < 4; i++) p.disc(vx + 6 - i * 3, vy - 12 - i * 3, 2 + i, withAlpha(C('#e8e8e8'), 170 - i * 30));
  } else if (m.era === 'field') {
    rectV(p, vx, vy + 2, 32, 6, C('#c8a040'));
    rectV(p, vx + 6, vy - 4, 22, 3, C('#d8b050')); rectV(p, vx + 6, vy + 9, 22, 3, C('#d8b050'));
    p.vline(vx + 10, vy - 1, vy + 8, INK); p.vline(vx + 24, vy - 1, vy + 8, INK);
    rectV(p, vx - 3, vy, 3, 10, C('#5a4020'));
    discV(p, vx + 10, vy + 14, 2, C('#2a2a2a')); discV(p, vx + 24, vy + 14, 2, C('#2a2a2a'));
    // biruta
    p.vline(x + w - 12, gy - 18, gy, INK); p.poly([[x + w - 11, gy - 18], [x + w - 2, gy - 16], [x + w - 11, gy - 14]], C('#e8742a'));
  } else {
    // avião a hélice (até 1958) ou jato: fuselagem, asa, cauda e janelinhas
    const jet = m.era === 'jet', L = jet ? 64 : 50, fy = gy - 12;
    const body = jet ? C('#eef2f6') : C('#c8ccd2');
    ellipseV(p, vx + L / 2, fy, L / 2, 4, body);
    volume(p, vx + L - 10, fy - 13, 10, 12, (xx, yy) => xx - (vx + L - 10) >= (fy - yy) * 0.5 - 2, jet ? C('#c83030') : body);
    rectV(p, vx + L / 2 - 8, fy + 1, 20, 3, tint(body, -0.12));
    for (let i = vx + 8; i < vx + L - 12; i += 4) p.rect(i, fy - 2, 2, 1, C('#3a5a80'));
    if (!jet) { p.vline(vx, fy - 5, fy + 5, INK); discV(p, vx + L / 2 - 2, fy + 3, 2, C('#4a4a50')); }
    else { rectV(p, vx + L / 2 - 4, fy + 3, 8, 3, C('#9aa0a8')); p.rect(vx + L / 2 - 6, fy, L / 2, 1, C('#c83030')); }
    discV(p, vx + 12, fy + 6, 1, INK); discV(p, vx + L / 2, fy + 6, 1, INK);
  }
}

function sea(p: Px, m: Air31, x: number, y: number, w: number, h: number): void {
  const sy = y + Math.floor(h * 0.55);
  for (let j = sy; j < y + h; j++) p.hline(x, x + w - 1, j, tint(C('#3a78a8'), -(j - sy) / 60));
  for (let j = sy + 2; j < y + h; j += 4) for (let i = (j * 3) % 9; i < w; i += 9) p.rect(x + i, j, 3, 1, C('#8ac0e0'));
  const bx = x + 8, by = sy - 2;
  if (m.year < 1960) {
    rectV(p, bx, by, 40, 8, C('#22262e'));
    rectV(p, bx + 6, by - 6, 28, 6, C('#ece6d6'));
    rectV(p, bx + 12, by - 14, 5, 8, C('#c03028')); rectV(p, bx + 22, by - 14, 5, 8, C('#c03028'));
  } else {
    volume(p, bx, by - 2, 44, 10, (xx, yy) => yy - (by - 2) < 10 - Math.max(0, (xx - bx - 36)), C('#f0f0f2'));
    rectV(p, bx + 6, by - 10, 30, 8, C('#e4e6ec'));
    for (let i = bx + 8; i < bx + 34; i += 4) p.rect(i, by - 7, 2, 2, C('#3a5a80'));
    rectV(p, bx + 26, by - 16, 5, 6, C('#1a4a8a'));
  }
}

function desk(p: Px, x: number, y: number, w: number, col: Col, label: string, pal: Palette): void {
  box(p, x, y, w, 16, col, 4);
  p.rect(x + 2, y + 2, w - 4, 2, lv(col, 4.4));
  sign(p, x + Math.round(w / 2), 78, label, pal.paper, tint(pal.accent2, -0.35));
}

function paint(cv: HTMLCanvasElement, s: GameState, m: Air31): void {
  const p = new Px(m.W, m.H);
  const pal = paletteOf(m.year);
  const glassy = m.era === 'jet';
  wall(p, pal, 0, 96, m.era === 'rail' ? pal.wall : glassy ? tint(pal.metal, 0.15) : pal.wall, m.era === 'rail' ? 'wainscot' : glassy ? 'glass' : pal.wallKind);
  floor(p, 96, pal.floors.hall.a, pal.floors.hall.b, m.era === 'rail' ? 'boards' : m.era === 'field' ? 'checker' : 'tiles');
  // janela grande: a pista (ou os trilhos)
  windowPane(p, 8, 8, 120, 56, pal, 'day');
  outside(p, m, 8, 8, 120, 56);
  // janela do cais
  windowPane(p, 254, 8, 58, 56, pal, 'day');
  sea(p, m, 254, 8, 58, 56);
  // telão / quadro de partidas
  const chalk = m.year < 1950;
  screen(p, 144, 10, 94, 40, chalk ? C('#24382c') : C('#121216'), chalk ? pal.woodDark : pal.metalDark, !chalk);
  drawText(p, fitText(T(m.era === 'rail' ? l('PARTIDAS: TRENS E NAVIOS', 'DEPARTURES: TRAINS AND SHIPS') : l('PARTIDAS', 'DEPARTURES')).toUpperCase(), 88), 147, 12, chalk ? C('#f0f0e0') : TXT);
  const rows = m.dep.slice(0, 4);
  rows.forEach((f, i) => {
    const t = fitText(`${cityN(f.city)}`.toUpperCase(), 62);
    drawText(p, t, 147, 20 + i * 7, chalk ? C('#e0e8d8') : C('#f4ecd8'));
    drawText(p, `${Math.max(0, f.w - s.week)}S`, 226, 20 + i * 7, chalk ? C('#e0e8d8') : TXT);
  });
  // o resto do quadro: as linhas regulares da cidade (apagadas: não são seus artistas)
  ['london', 'new_york', 'paris', 'rio', 'tokyo'].filter((c) => c !== s.config.homeCity && !rows.some((f) => f.city === c)).slice(0, 4 - rows.length)
    .forEach((c, i) => drawText(p, fitText(cityN(c).toUpperCase(), 62), 147, 20 + (rows.length + i) * 7, chalk ? C('#7a8a74') : C('#6a6658')));
  // portas (hangar e cais) e relógio
  discV(p, 135, 70, 5, pal.paper);
  p.line(135, 70, 135, 67, INK); p.line(135, 70, 137, 71, INK);
  if (m.hangar) { box(p, 214, 60, 30, 36, tint(pal.metal, -0.1), 0); p.rect(218, 64, 22, 32, C('#2a2e36')); sign(p, 229, 52, T(l('HANGAR', 'HANGAR')), pal.paper, C('#2a3a5a')); }
  box(p, 266, 70, 34, 26, pal.woodDark, 0); p.rect(270, 74, 26, 22, C('#1e2a38')); sign(p, 283, 64, T(l('CAIS', 'PIER')), pal.paper, C('#1a4a6a'));
  // estúdio de holograma (2027+)
  // balcões
  desk(p, 14, 120, 58, pal.wood, T(l('DESEMBARQUE', 'ARRIVALS')), pal);
  desk(p, 92, 120, 50, pal.woodDark, T(l('ALFANDEGA', 'CUSTOMS')), pal);
  // sala VIP: tapete e cordão
  p.rect(154, 110, 58, 30, tint(pal.fabric, -0.15));
  for (let x = 156; x < 210; x += 4) p.put(x, 112, lv(pal.fabric, 4));
  sign(p, 183, 78, m.year < 1950 ? T(l('SALA DE ESPERA', 'WAITING ROOM')) : 'VIP', pal.paper, tint(pal.gold, -0.35));
  // banca de jornal
  box(p, 222, 116, 26, 20, C('#b07a40'), 3);
  for (let i = 0; i < 3; i++) p.rect(225 + i * 7, 118, 5, 8, [C('#f4ecd8'), C('#e8d0a0'), C('#f0e0c8')][i]);
  const ctx = blitPx31(cv, p.d, m.W, m.H);
  if (!ctx) return;
  const fur = (k: Parameters<typeof furniture>[0], x: number, y: number, f: 'SW' | 'SE' = 'SW'): void => { const sp = furniture(k, eraOf(m.year), f); ctx.drawImage(sp.c, x - sp.ax, y - sp.ay); };
  fur('sofa', 176, 136); fur('plant', 160, 128); fur('lamp', 212, 126);
  if (m.holo) { fur('holo', 148, 104); }
  const dude = (id: string, x: number, y: number, dir: 'SE' | 'SW' | 'NE' | 'NW', scale = 1): void => {
    const sp = avatarSprite(lookOf({ id }), { year: m.year, role: null, pose: 'stand', dir });
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - 6 * scale, y, 12 * scale, 2);
    ctx.drawImage(sp.c, x - sp.ax * scale, y - sp.ay * scale, sp.c.width * scale, sp.c.height * scale);
  };
  // funcionários nos balcões
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, m.W, 117); ctx.clip();
  dude('desk-arr', 43, 124, 'SE'); dude('desk-cus', 117, 124, 'SW');
  ctx.restore();
  // multidão no portão (fama de quem voltou)
  for (let i = 0; i < m.crowd * 3; i++) dude(`fan-${i}`, 10 + (i % 6) * 11, 152 + Math.floor(i / 6) * 10, i % 2 ? 'NE' : 'NW');
  // viajantes
  for (let i = 0; i < 3; i++) dude(`trav-${m.year}-${i}`, 96 + i * 46, 168 - (i % 2) * 6, i % 2 ? 'SW' : 'SE');
  const me = playerPerson(s);
  const sp = avatarSprite(lookOf(me ?? { id: 'player' }), { year: m.year, role: me?.role ?? null, pose: 'stand', dir: 'SE' });
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(150, 176, 12, 2);
  ctx.drawImage(sp.c, 156 - sp.ax, 177 - sp.ay);
}

// ---------------------------------------------------------------- painéis

const actSel = (s: GameState): HTMLElement | null => {
  const ids = playerActs(s);
  if (!ids.length) return null;
  if (!ids.includes(ui.act)) ui.act = ids[0];
  return select(ui.act, ids.map((id) => ({ value: id, label: s.acts[id]?.name ?? id })), (v) => { ui.act = v; }, { 'aria-label': T(l('Artista', 'Act')) });
};

function depPanel(s: GameState, m: Air31): void {
  let close = (): void => {};
  close = modal(T(l('Partidas', 'Departures')), h('div', { class: 'sc31-panel' },
    m.dep.length ? h('ul', null, m.dep.map((f) => h('li', { class: 'sc31-row' }, h('b', null, s.acts[f.act]?.name ?? '?'), ' → ', cityN(f.city), ' · ', T(l('em {n} semana(s)', 'in {n} week(s)'), { n: Math.max(0, f.w - s.week) }))))
      : h('p', { class: 'muted' }, T(l('Nenhum artista seu sai do país nas próximas semanas.', 'None of your acts leaves the country in the coming weeks.'))),
    h('div', { class: 'row wrap' },
      moreBtn31(l('Abrir turnê internacional', 'Open an international tour'), () => { close(); runGo31({ area: 'shows', tab: ['showsHub', 'tours'] }); }),
      moreBtn31(l('Mandar o olheiro para outro país', 'Send the scout abroad'), () => { close(); runGo31({ area: 'market' }); }))));
}

function arrPanel(s: GameState, m: Air31): void {
  let close = (): void => {};
  close = modal(T(l('Desembarque', 'Arrivals')), h('div', { class: 'sc31-panel' },
    m.arr.length ? h('ul', null, m.arr.map((f) => h('li', { class: 'sc31-row' },
      h('b', null, s.acts[f.act]?.name ?? '?'), ' · ',
      f.mine ? T(l('voltando de {c}: {n}', 'back from {c}: {n}'), { c: cityN(f.city), n: T([l('chegada discreta', 'a quiet arrival'), l('alguns fãs no portão', 'a few fans at the gate'), l('fãs e imprensa no portão', 'fans and press at the gate'), l('multidão no portão', 'a crowd at the gate'), l('aeroporto parado', 'the airport at a standstill')][Math.min(4, Math.floor(f.fame / 20))]) })
        : T(l('chega para tocar aqui em {n} semana(s)', 'arrives to play here in {n} week(s)'), { n: Math.max(0, f.w - s.week) }),
      ' ', f.mine ? null : h('button', { type: 'button', class: 'btn small ghost', onclick: () => { close(); runGo31({ quick: { kind: 'act', id: f.act } }); } }, T(l('Conhecer e convidar', 'Meet and invite'))))))
      : h('p', { class: 'muted' }, T(l('Ninguém de fora com show marcado aqui nas próximas semanas.', 'No foreign act booked here in the coming weeks.')))));
}

function customsPanel(s: GameState): void {
  const st = (s.x4 as unknown as { auction31?: unknown }).auction31 ? auction31(s) : undefined;
  const ims = (st?.imports ?? []).filter((x) => x.arrive >= s.week - 1);
  let close = (): void => {};
  close = modal(T(l('Alfândega', 'Customs')), h('div', { class: 'sc31-panel' },
    ims.length ? h('ul', null, ims.map((x) => h('li', { class: 'sc31-row' }, h('b', null, T(x.n)), ' · ', T(l('de {c}', 'from {c}'), { c: cityN(x.from) }), ' · ', T(l('imposto pago {v}', 'duty paid {v}'), { v: $(x.duty) }), ' · ',
      x.arrive > s.week ? T(l('libera em {n} semana(s)', 'clears in {n} week(s)'), { n: x.arrive - s.week }) : T(l('liberada', 'cleared'))))) : h('p', { class: 'muted' }, T(l('Nada passando pela alfândega agora.', 'Nothing going through customs right now.'))),
    h('p', { class: 'small' }, T(l('Peça arrematada em leilão fora do país paga imposto de importação e chega depois. Carga do mercado negro arrisca apreensão e escândalo na inspeção.', 'A piece won at an auction abroad pays import duty and arrives later. Black-market cargo risks seizure and scandal at inspection.'))),
    h('div', { class: 'row wrap' },
      moreBtn31(l('Casa de leilões', 'Auction house'), () => { close(); runGo31({ area: 'auction31' }); }),
      moreBtn31(l('Exportar discos (licenciamento nos mercados)', 'Export records (licensing in the markets)'), () => { close(); runGo31({ area: 'regions18' }); }))));
}

function vipPanel(s: GameState): void {
  let close = (): void => {};
  close = modal(T(l('Sala VIP', 'VIP lounge')), h('div', { class: 'sc31-panel' },
    h('p', null, T(l('Num canto, o intermediário das facções de fora; no bar, executivos estrangeiros com propostas de distribuição, sociedade ou compra.', 'In a corner, the broker for foreign factions; at the bar, foreign executives with distribution, partnership or buyout proposals.'))),
    h('div', { class: 'row wrap' },
      moreBtn31(l('Falar com o intermediário', 'Talk to the broker'), () => { close(); runGo31({ area: 'crime', tab: ['crime17', 'broker'] }); }),
      moreBtn31(l('Sócios e compras', 'Partners and buyouts'), () => { close(); runGo31({ area: 'business' }); }))));
  void s;
}

function hangarPanel(): void {
  let close = (): void => {};
  close = modal(T(l('Hangar', 'Hangar')), h('div', { class: 'sc31-panel' },
    h('p', null, T(l('Fretar avião para a turnê poupa tempo e cansaço, mas custa caro: escolha "Avião" na logística da turnê. Cada trecho mostra as opções reais da época.', 'Chartering a plane for the tour saves time and fatigue but costs a lot: pick "Fly" in the tour logistics. Each leg shows the real options of the era.'))),
    moreBtn31(l('Logística da turnê', 'Tour logistics'), () => { close(); runGo31({ area: 'shows', tab: ['showsHub', 'tours'] }); })));
}

function seaPanel(s: GameState): void {
  let close = (): void => {};
  const box = h('div', { class: 'sc31-panel' });
  const draw = (): void => {
    const sel = actSel(s);
    const ks = cruiseOpen31(s);
    const ports = linerPorts31(s);
    if (!ports.includes(ui.port)) ui.port = ports[0] ?? '';
    const atSea = travel31(s).cr.filter((x) => x.until > s.week && playerActs(s).includes(x.act));
    box.replaceChildren(...([
      atSea.length ? h('p', null, '⚓ ', atSea.map((x) => `${s.acts[x.act]?.name ?? '?'} · ${T(CRUISE31[x.k].name)} · ${T(l('volta em {n} sem.', 'back in {n} wk'), { n: x.until - s.week })}`).join(' / ')) : null,
      !ks.length ? h('p', { class: 'muted' }, T(l('Nesta época não há temporadas no mar (transatlânticos até 1950; cruzeiros a partir de 1970).', 'No seasons at sea in this era (ocean liners until 1950; cruises from 1970).'))) : null,
      sel ? h('p', null, T(l('Artista', 'Act')), ': ', sel) : h('p', { class: 'muted' }, T(l('Você não tem artistas no elenco.', 'You have no acts on the roster.'))),
      ...ks.map((k) => {
        const a = s.acts[ui.act];
        const fee = a ? cruiseFee31(s, a, k) : 0;
        return h('div', { class: 'card' }, h('b', null, T(CRUISE31[k].name)), ' ', pill(k === 'cruise' ? T(l('{v}/mês', '{v}/mo'), { v: $(fee) }) : $(fee), 'good'),
          h('p', { class: 'small muted' }, T(CRUISE31[k].desc)),
          k === 'liner' ? h('p', null, T(l('Porto de chegada', 'Arrival port')), ': ', select(ui.port, ports.map((c) => ({ value: c, label: cityN(c) })), (v) => { ui.port = v; })) : null,
          lockBtn31(T(l('Embarcar', 'Set sail')), a ? cruiseLock31(s, a.id, k) : l('Escolha um artista.', 'Pick an act.'), () => { const e = bookCruise31(s, ui.act, k, ui.port); toast(T(e ?? l('Embarcou!', 'Set sail!')), e ? 'bad' : 'good'); rerender(); draw(); }, { cls: 'btn small primary' }));
      }),
    ] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
  };
  draw();
  close = modal(T(l('Cais · temporadas no mar', 'Pier · seasons at sea')), box, { wide: true });
  void close;
}

const HOLO_CITIES31 = ['london', 'new_york', 'los_angeles', 'paris', 'tokyo', 'sao_paulo', 'berlin', 'mexico_city'];
function holoPanel(s: GameState): void {
  const box = h('div', { class: 'sc31-panel' });
  const draw = (): void => {
    const sel = actSel(s);
    const opts = [s.config.homeCity, ...HOLO_CITIES31.filter((c) => c !== s.config.homeCity)].filter((c) => cityById[c]);
    if (!ui.cities.size) ui.cities = new Set(opts.slice(0, 3));
    const cs = [...ui.cities];
    const q = ui.act ? holoQuote31(s, ui.act, cs) : null;
    box.replaceChildren(...([
      sel ? h('p', null, T(l('Artista', 'Act')), ': ', sel) : h('p', { class: 'muted' }, T(l('Você não tem artistas no elenco.', 'You have no acts on the roster.'))),
      h('div', { class: 'row wrap' }, opts.map((c) => h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: ui.cities.has(c) ? true : undefined, onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) ui.cities.add(c); else ui.cities.delete(c); draw(); } }), ' ', cityN(c)))),
      q ? h('ul', null, h('li', null, T(l('Produção', 'Production')), ': ', h('b', null, $(q.cost))), h('li', null, T(l('Receita prevista', 'Expected revenue')), ': ', h('b', null, $(q.revenue))), h('li', null, T(l('Espectadores', 'Viewers')), ': ', h('b', null, q.viewers.toLocaleString())), h('li', null, T(l('Fama', 'Fame')), ': +', String(q.fame))) : null,
      h('p', { class: 'small muted' }, T(l('Menos receita e menos fama que um show ao vivo — e nada de teletransporte: a turnê de verdade continua sendo na estrada.', 'Less revenue and fame than a live show — and no teleporting: a real tour still happens on the road.'))),
      ui.act ? lockBtn31(T(l('Transmitir o show', 'Broadcast the show')), holoLock31(s, ui.act), () => { const e = holoShow31(s, ui.act, cs); toast(T(e ?? l('Show transmitido!', 'Show broadcast!')), e ? 'bad' : 'good'); rerender(); draw(); }, { cls: 'btn small primary' }) : null,
    ] as (HTMLElement | null)[]).filter((x): x is HTMLElement => !!x));
  };
  draw();
  modal(T(l('Estúdio de holograma', 'Hologram studio')), box, { wide: true });
}

function newsPanel(s: GameState, m: Air31): void {
  modal(T(l('Banca: aviação e transporte', 'Newsstand: aviation and transport')), h('div', { class: 'sc31-panel' },
    m.news.length ? h('ul', null, m.news.map((f) => h('li', null, `${f.y} · `, T(f.text)))) : h('p', { class: 'muted' }, T(l('Sem notícias de aviação recentes.', 'No recent aviation news.')))));
  void s;
}
function eventsPanel(s: GameState): void {
  modal(T(l('Imigração', 'Immigration')), h('div', { class: 'sc31-panel' }, h('ul', null, airportEvents31(s).map((x) => h('li', null, `${s.acts[x.tour.actId]?.name ?? '?'} · ${cityN(x.city)} · `, T(l('visto negado, show cancelado', 'visa denied, show cancelled')))))));
}

// ---------------------------------------------------------------- vista

export function airport31View(s: GameState): HTMLElement {
  const m = airport31Model(s);
  return sceneView31(s, {
    id: 'airport', title: m.name, W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paint(cv, s, m),
    panels: { dep: () => depPanel(s, m), arr: () => arrPanel(s, m), customs: () => customsPanel(s), vip: () => vipPanel(s), hangar: () => hangarPanel(), sea: () => seaPanel(s), holo: () => holoPanel(s), news: () => newsPanel(s, m), events: () => eventsPanel(s) },
    list: () => h('ul', null, m.spots.map((sp) => h('li', null, h('b', null, T(sp.label)), ' — ', T(sp.tip)))),
    intro: l('O aeroporto muda com a época: estação e porto até 1919, campo de pouso, terminal, jatos (1958) e hangar de jatinhos. Cada balcão leva a uma ação.', 'The airport changes with the era: station and port until 1919, airfield, terminal, jets (1958) and a private-jet hangar. Each desk leads to an action.'),
    legend: h('p', { class: 'sc31-legend' }, h('span', null, h('b', null, T(m.name)))),
  });
}

registerArea({ id: 'airport31', label: l('Aeroporto e porto', 'Airport and port'), icon: 'globe', key: '',
  render: (s) => h('div', null, h('h2', null, T(airport31Model(s).name)), airport31View(s), vitStrip31(s, 'airport')) });

registerQuick31({
  id: 'q.airport31', verb: 'open', icon: 'globe', kinds: ['city'], passive: true, label: l('Aeroporto (partidas, alfândega, cais)', 'Airport (departures, customs, pier)'),
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'airport31' }),
});
