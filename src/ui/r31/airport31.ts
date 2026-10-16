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
import { C, INK, Px, tint, type Col } from '../pixel/px';
import { vehiclePx29 } from '../pixel/things29';
import { registerArea } from '../registry';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { airport31Model, type Air31 } from './airport31model';

const T = (x: L, v?: Record<string, string | number>): string => t(x, v);
const ui = { act: '', port: '', cities: new Set<string>() };
const cityN = (id: string): string => T(cityById[id]?.name ?? l(id, id));

// ---------------------------------------------------------------- pintura

function paint(cv: HTMLCanvasElement, s: GameState, m: Air31): void {
  const p = new Px(m.W, m.H);
  const old = m.year < 1950;
  // céu
  for (let y = 0; y < 96; y++) { const c = old ? C('#c8d8d0') : C('#9cc8e8'); p.hline(0, m.W - 1, y, tint(c, (y - 48) / 400)); }
  for (const [cx, cy] of [[40, 18], [190, 10], [280, 24]]) { p.ellipse(cx, cy, 14, 4, C('#f4f8fa')); p.ellipse(cx + 8, cy - 2, 9, 4, C('#ffffff')); }
  // chão: grama (campo de pouso / trilhos), pista
  const ground: Col = m.era === 'rail' ? C('#9a8a68') : m.era === 'field' ? C('#7aa058') : C('#8a8a88');
  p.rect(0, 96, m.W, m.H - 96, ground);
  if (m.era !== 'rail') { p.rect(0, 92, 250, 6, C('#5a5a5c')); for (let x = 4; x < 250; x += 16) p.rect(x, 94, 8, 1, C('#f0f0e8')); }
  else { for (let x = 0; x < 250; x += 6) p.rect(x, 93, 3, 4, C('#5a3a20')); p.hline(0, 249, 93, C('#3a3a40')); p.hline(0, 249, 96, C('#3a3a40')); }
  // mar e cais à direita
  p.rect(250, 112, 70, 68, C('#3a78a8'));
  for (let y = 116; y < 180; y += 6) for (let x = 252 + (y % 12); x < 320; x += 12) p.rect(x, y, 4, 1, C('#7ab0d8'));
  p.rect(246, 132, 30, 4, C('#7a5a38'));
  // navio (vapor até 1950; cruzeiro depois)
  if (m.year < 1960) { p.rect(268, 124, 44, 10, C('#20242c')); p.rect(272, 118, 32, 6, C('#f0ece0')); p.rect(280, 108, 6, 10, C('#c83028')); p.rect(292, 108, 6, 10, C('#c83028')); }
  else { p.poly([[262, 124], [316, 124], [310, 136], [266, 136]], C('#f4f4f4')); p.rect(272, 114, 36, 10, C('#e8e8ec')); for (let x = 274; x < 306; x += 4) p.rect(x, 117, 2, 2, C('#3a5a80')); p.rect(296, 106, 6, 8, C('#1a4a8a')); }
  // prédio principal pela época
  if (m.era === 'rail') {
    p.rect(100, 40, 120, 56, INK); p.rect(101, 41, 118, 54, C('#b86a48'));
    p.poly([[96, 42], [224, 42], [160, 22]], C('#6a3a28'));
    p.disc(160, 34, 6, C('#f4ecd8')); p.line(160, 34, 160, 30, INK); p.line(160, 34, 163, 34, INK);
    for (let x = 108; x < 214; x += 14) p.rect(x, 60, 8, 14, C('#3a4050'));
    // locomotiva
    p.rect(20, 78, 40, 14, C('#20242c')); p.rect(52, 70, 10, 8, C('#20242c')); p.rect(24, 72, 6, 6, C('#30343c')); p.disc(30, 92, 3, INK); p.disc(46, 92, 3, INK);
  } else if (m.era === 'field') {
    p.rect(120, 56, 80, 40, INK); p.rect(121, 57, 78, 38, C('#a89070')); p.poly([[116, 58], [204, 58], [160, 40]], C('#6a5a48'));
    p.rect(150, 74, 20, 21, C('#3a3020'));
    // biruta
    p.vline(230, 60, 92, INK); p.poly([[231, 60], [246, 63], [231, 66]], C('#e8742a'));
    // biplano
    p.rect(20, 74, 34, 5, C('#c8a040')); p.rect(26, 68, 22, 2, C('#c8a040')); p.rect(26, 80, 22, 2, C('#c8a040')); p.rect(18, 72, 3, 9, C('#5a4020')); p.disc(30, 88, 2, INK); p.disc(46, 88, 2, INK);
  } else {
    const modern = m.era === 'jet';
    p.rect(96, 30, 128, 66, INK); p.rect(97, 31, 126, 64, modern ? C('#d8e0e8') : C('#e8dcc0'));
    if (modern) for (let x = 100; x < 220; x += 6) p.rect(x, 50, 4, 30, C('#6a9ac0'));
    else { for (let x = 104; x < 216; x += 12) p.rect(x, 54, 6, 22, C('#4a5a70')); p.rect(150, 22, 20, 10, C('#e8dcc0')); }
    // torre de controle
    p.rect(232, 30, 8, 62, C('#c8ccd0')); p.rect(226, 22, 20, 10, C('#4a7aa0'));
    // avião (DC-3 ou jato)
    const plane = vehiclePx29('fly', m.year, 'airport');
    p.blit(plane, 16, 66);
  }
  if (m.hangar) { p.rect(220, 58, 60, 36, INK); p.ellipse(250, 60, 30, 10, C('#9aa4ac')); p.rect(221, 60, 58, 33, C('#9aa4ac')); p.rect(232, 70, 36, 23, C('#3a4048')); }
  if (m.holo) { p.rect(22, 30, 56, 40, INK); p.rect(23, 31, 54, 38, C('#1a2030')); p.ellipse(50, 56, 12, 4, C('#40e0ff', 120)); p.rect(46, 36, 8, 20, C('#80f0ff', 140)); }
  // painel de partidas
  p.rect(112, 14, 96, 30, INK); p.rect(113, 15, 94, 28, C('#141418'));
  drawText(p, fitText(T(l('PARTIDAS', 'DEPARTURES')), 90), 116, 17, C('#f0c040'));
  m.dep.slice(0, 3).forEach((f, i) => drawText(p, fitText(`${cityN(f.city)} ${Math.max(0, f.w - s.week)}S`.toUpperCase(), 88), 116, 24 + i * 6, C('#f4ecd8')));
  if (!m.dep.length) drawText(p, '---', 116, 26, C('#808080'));
  // balcões: desembarque, alfândega, VIP, banca
  const desk = (x: number, y: number, w: number, label: L, c: Col): void => { p.rect(x, y, w, 20, INK); p.rect(x + 1, y + 1, w - 2, 18, c); drawText(p, fitText(T(label).toUpperCase(), w - 4), x + 2, y + 3, C('#ffffff')); };
  desk(14, 110, 64, l('Desembarque', 'Arrivals'), C('#3a6a4a'));
  desk(92, 110, 52, l('Alfândega', 'Customs'), C('#6a4a2a'));
  desk(156, 110, 52, l('VIP', 'VIP'), C('#6a2a4a'));
  p.rect(220, 104, 24, 28, INK); p.rect(221, 105, 22, 26, C('#c8a060')); for (let y = 108; y < 128; y += 5) p.rect(223, y, 18, 3, C('#f4ecd8'));
  const ctx = blitPx31(cv, p.d, m.W, m.H);
  if (!ctx) return;
  // multidão no portão (fama de quem voltou)
  for (let i = 0; i < m.crowd * 3; i++) {
    const sp = avatarSprite(lookOf({ id: `fan-${i}` }), { year: m.year, role: null, pose: 'stand', dir: i % 2 ? 'SE' : 'SW' });
    ctx.drawImage(sp.c, 16 + (i % 6) * 10 - sp.ax / 2, 150 + Math.floor(i / 6) * 8 - sp.ay / 2, sp.c.width / 2, sp.c.height / 2);
  }
  const me = playerPerson(s);
  const sp = avatarSprite(lookOf(me ?? { id: 'player' }), { year: m.year, role: me?.role ?? null, pose: 'stand', dir: 'SE' });
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(150, 172, 12, 2);
  ctx.drawImage(sp.c, 156 - sp.ax, 173 - sp.ay);
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
  render: (s) => h('div', null, h('h2', null, T(airport31Model(s).name)), airport31View(s)) });

registerQuick31({
  id: 'q.airport31', verb: 'open', icon: 'globe', kinds: ['city'], passive: true, label: l('Aeroporto (partidas, alfândega, cais)', 'Airport (departures, customs, pier)'),
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'airport31' }),
});
