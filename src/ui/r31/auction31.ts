// R31 · onda 4 (T) — CASA DE LEILÕES em cena (DOM + pintura). O modelo (auction31model) diz quem está na sala e o
// que cada objeto mostra; aqui se pinta a sala da época e se abrem os painéis curtos: o lote, a lista de donos, o
// lance (levantar a plaquinha com tempo por rodada, ou deixar o representante com limite), as pistas de quem você
// conhece, o catálogo dos próximos pregões e o balcão de consignação. Toda ação chama a função do motor
// (sim/sys/auction31: raise31, dropBid31, hammer31, consign31) — a cena é a frente da mesma conta.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { explain18 } from '../../sim/explain18';
import { cashLock31 } from '../../sim/r31/lock';
import { ownHow31, tierStars31 } from '../../sim/r31/relic31';
import { playerPerson } from '../../sim/sys/life';
import {
  COMMISSION31, consign31, consignable31, dropBid31, dutyRate31, hammer31, HOUSE31, houseName31, raise31, shipWeeks31, auction31,
} from '../../sim/sys/auction31';
import { openingBid, relics } from '../../sim/sys/relics9';
import { countryOfCity } from '../../data/geo';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, fitText } from '../pixel/font';
import { C, INK, Px, tint, type Col } from '../pixel/px';
import { relicArtOf28, relicPx28 } from '../pixel/relic28';
import { registerArea } from '../registry';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { auction31Model, cityName31, ROOM_NAME31, type Auc31 } from './auction31model';

const ui = { sess: '', lot: 0 };
/** tempo por rodada (segundos) no dia do pregão */
const ROUND_S31 = 10;

// ---------------------------------------------------------------- pintura

const TIER_GLOW: Col[] = [C('#b8b0a0'), C('#7ac070'), C('#6aa0e8'), C('#f0c040'), C('#c080f0')];
const WALL: Record<Auc31['room'], [Col, Col, Col]> = {
  salon: [C('#5a1e24'), C('#6a2a2e'), C('#6e4428')], // damasco, friso, lambri
  hall: [C('#b8a888'), C('#a89878'), C('#7a6448')],
  screen: [C('#4a5a70'), C('#56667c'), C('#384458')],
  app: [C('#e8ecf0'), C('#d8dee6'), C('#b8c0cc')],
};
const FLOOR: Record<Auc31['room'], Col> = { salon: C('#7a4a28'), hall: C('#8a2a30'), screen: C('#5a5a64'), app: C('#c8ccd4') };

function paintRoom(p: Px, m: Auc31): void {
  const [wall, frieze, wain] = WALL[m.room];
  for (let y = 0; y < 112; y++) for (let x = 0; x < m.W; x++) {
    const n = m.room === 'salon' ? ((x >> 2) + (y >> 2)) % 4 === 0 && (x + y) % 3 === 0 : (x * 7 + y * 3) % 23 === 0;
    p.put(x, y, n ? tint(wall, 0.08) : wall);
  }
  p.rect(0, 84, m.W, 2, frieze);
  p.rect(0, 86, m.W, 26, wain);
  for (let x = 0; x < m.W; x += 24) p.vline(x, 86, 111, tint(wain, -0.2));
  const fl = FLOOR[m.room];
  for (let y = 112; y < m.H; y++) for (let x = 0; x < m.W; x++) {
    const plank = m.room === 'salon' ? ((x + (y >> 3) * 11) % 16 === 0 || y % 8 === 0) : m.room === 'hall' ? (x + y) % 9 === 0 : y % 12 === 0;
    p.put(x, y, plank ? tint(fl, -0.15) : fl);
  }
  // porta
  p.rect(4, 60, 18, 52, INK); p.rect(5, 61, 16, 50, tint(wain, 0.1)); p.disc(18, 88, 1, C('#f0d080'));
  // lustre (salão) / refletores (auditório)
  if (m.room === 'salon') {
    p.vline(160, 0, 6, C('#c09048'));
    p.ellipse(160, 9, 14, 4, C('#e0b050'));
    for (let i = -12; i <= 12; i += 4) { p.disc(160 + i, 12, 1, C('#fff4c0')); p.put(160 + i, 14, C('#ffe080')); }
  } else if (m.room === 'hall') {
    for (const x of [60, 260]) { p.rect(x - 4, 0, 8, 4, C('#2a2a30')); p.poly([[x - 6, 4], [x + 6, 4], [x + 14, 30], [x - 14, 30]], (xx, yy) => ((xx + yy) % 2 ? C('#d8c8a0', 60) : C('#d8c8a0', 30))); }
  }
}

function paintScreen(p: Px, s: GameState, m: Auc31): void {
  const x0 = 96, y0 = 6, w = 128, hh = 38;
  const bg = m.room === 'salon' ? C('#2a2018') : m.room === 'hall' ? C('#e8e4d8') : m.room === 'screen' ? C('#10283c') : C('#202024');
  const fg = m.room === 'salon' ? C('#f0e0b0') : m.room === 'hall' ? C('#2a2420') : m.room === 'screen' ? C('#80e0ff') : C('#ffffff');
  if (m.room === 'app') { p.rect(x0 + 36, y0 - 2, 56, hh + 4, INK); p.rect(x0 + 38, y0, 52, hh, bg); }
  else { p.rect(x0 - 2, y0 - 2, w + 4, hh + 4, m.room === 'salon' ? C('#c09048') : INK); p.rect(x0, y0, w, hh, bg); }
  const lot = m.lot;
  if (!lot) { drawText(p, t(l('SEM LOTES', 'NO LOTS')).toUpperCase(), x0 + 30, y0 + 16, fg); return; }
  const left = m.room === 'app' ? x0 + 40 : x0 + 3, maxW = m.room === 'app' ? 48 : w - 6;
  drawText(p, fitText(t(l('DONOS', 'OWNERS')), maxW), left, y0 + 2, fg);
  lot.own.slice(-4).forEach((o, i) => drawText(p, fitText(`${o[1]} ${o[0]}`.toUpperCase(), maxW), left, y0 + 9 + i * 7, tint(fg, -0.15)));
  if (m.lad && m.today && m.room !== 'salon') drawText(p, fitText($(m.lad.price), maxW), left, y0 + hh - 7, C('#f0c040'));
  void s;
}

function paintScene(cv: HTMLCanvasElement, s: GameState, m: Auc31): void {
  const p = new Px(m.W, m.H);
  paintRoom(p, m);
  paintScreen(p, s, m);
  // catálogo na parede: folhas com os próximos lotes
  p.rect(236, 14, 64, 66, INK); p.rect(238, 16, 60, 62, C('#f4ecd8'));
  drawText(p, fitText(t(l('CATÁLOGO', 'CATALOGUE')), 56), 240, 18, C('#5a3a20'));
  const next = m.picks.slice(0, 3);
  next.forEach((x, i) => { p.rect(241, 27 + i * 16, 54, 13, C('#e8dcc0')); drawText(p, fitText(`${t(HOUSE31[x.house].name)}`.toUpperCase(), 52), 243, 29 + i * 16, C('#3a2a1a')); drawText(p, `${x.lots.length} - ${Math.max(0, x.w - s.week)}S`, 243, 35 + i * 16, C('#8a5a30')); });
  // balcão de consignação
  p.rect(262, 104, 54, 30, INK); p.rect(263, 105, 52, 8, C('#c09048')); p.rect(263, 113, 52, 20, C('#6e2e20'));
  drawText(p, fitText(t(l('CONSIGNAÇÃO', 'CONSIGNMENT')), 50), 265, 106, INK);
  // pedestal com o brilho do nível
  const glow = TIER_GLOW[Math.max(0, m.tier - 1)];
  if (m.lot) {
    for (let r = 20; r >= 12; r -= 2) p.ellipse(160, 60, r, r, (x, y) => ((x + y) % 3 === 0 ? C('#ffffff', 0) : withA(glow, 40 + (20 - r) * 8)));
    p.rect(150, 74, 20, 36, INK); p.rect(151, 75, 18, 34, C('#ece4d4')); p.rect(148, 72, 24, 4, C('#d8cebc')); p.rect(148, 108, 24, 4, C('#b8ae9c'));
    const art = relicArtOf28(m.lot.k, m.lot.n.pt, m.lot.y, m.lot.id);
    p.blit(relicPx28(art, m.lot.id, m.lot.y, m.lot.n.pt), 148, 48);
    for (let i = 0; i < 5; i++) { p.disc(148 + i * 6, 42, 2, INK); p.disc(148 + i * 6, 42, 1, i < m.tier ? glow : C('#5a5048')); }
  }
  // púlpito do leiloeiro
  p.rect(40, 84, 30, 26, INK); p.rect(41, 85, 28, 24, C('#6e2e20')); p.rect(41, 85, 28, 3, C('#c09048'));
  const ctx = blitPx31(cv, p.d, m.W, m.H);
  if (!ctx) return;
  const spr = (look: ReturnType<typeof lookOf>, role: Parameters<typeof avatarSprite>[1]['role'], x: number, y: number, dir: 'SE' | 'SW' | 'NE' | 'NW'): void => {
    const sp = avatarSprite(look, { year: m.year, role: role ?? null, pose: 'stand', dir });
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 6, y, 12, 2);
    ctx.drawImage(sp.c, x - sp.ax, y - sp.ay + 1);
  };
  spr(lookOf({ id: `auctioneer-${m.sess?.house ?? 'x'}` }), null, 55, 84, 'SE');
  // martelo
  ctx.fillStyle = '#5a3018'; ctx.fillRect(66, 80, 2, 6); ctx.fillStyle = '#8a5028'; ctx.fillRect(63, 78, 8, 3);
  // plateia com plaquinhas
  for (const x of m.seats) {
    const pr = x.b.pid ? s.persons[x.b.pid] : undefined;
    spr(lookOf(pr ?? { id: x.b.key }), pr?.role ?? null, x.x, x.y, 'NW');
    const up = x.lead ? 14 : x.outAt !== undefined ? -2 : 6;
    ctx.fillStyle = '#170e12'; ctx.fillRect(x.x + 5, x.y - 28 - up + 8, 1, up + 6);
    ctx.fillStyle = x.outAt !== undefined ? '#8a8a8a' : x.lead ? '#f0c040' : '#f4ecd8';
    ctx.fillRect(x.x + 1, x.y - 34 - up + 8, 9, 7);
  }
  // você, de costas, com a sua plaquinha
  const me = playerPerson(s);
  spr(lookOf(me ?? { id: 'player' }), me?.role ?? null, 160, 178, 'NE');
  if (!m.cons && m.lot) {
    const lead = m.lad?.lead === 'player';
    ctx.fillStyle = '#170e12'; ctx.fillRect(166, lead ? 140 : 148, 1, lead ? 18 : 10);
    ctx.fillStyle = lead ? '#f0c040' : '#ffffff'; ctx.fillRect(162, lead ? 133 : 141, 10, 8);
  }
}
const withA = (c: Col, a: number): Col => (c & 0x00ffffff) | (Math.max(0, Math.min(255, a)) << 24);

// ---------------------------------------------------------------- painéis

const T = (x: L, v?: Record<string, string | number>): string => t(x, v);

function lotPanel(s: GameState, m: Auc31): void {
  const rl = m.lot;
  if (!rl || !m.sess) return;
  const ex = explain18(s, 'relic.value', { id: rl.id });
  let close = (): void => {};
  close = modal(T(rl.n), h('div', { class: 'sc31-panel' },
    h('p', null, pill(`${tierStars31(m.tier)} ${m.tierName ? T(m.tierName) : ''}`, m.tier >= 4 ? 'gold' : 'good'), ' ', T(l('Ano {y}', 'Year {y}'), { y: rl.y })),
    h('ul', null,
      h('li', { class: 'sc31-row' }, T(l('Lance inicial', 'Opening bid')), ': ', h('b', null, $(openingBid(s, rl)))),
      ex ? h('li', { class: 'sc31-row' }, T(l('Valor de mercado (como se calcula)', 'Market value (how it is computed)')), ': ', h('b', null, $(Number(ex.value)))) : null,
      h('li', { class: 'sc31-row' }, T(l('Pregão', 'Sale')), ': ', h('b', null, T(houseName31(s, m.sess.house, m.sess.city))), ' · ', T(l('em {n} semana(s)', 'in {n} week(s)'), { n: Math.max(0, m.sess.w - s.week) }))),
    h('p', { class: 'small muted' }, T(l('O preço sobe de degrau em degrau enquanto duas pessoas ainda querem. Ninguém mostra o próprio limite.', 'The price climbs step by step while two people still want it. Nobody shows their own limit.'))),
    h('div', { class: 'row wrap' }, moreBtn31(l('Ficha completa (lista de relíquias)', 'Full record (relic list)'), () => { close(); runGo31({ area: 'lendas', tab: ['lendas9', 'relics'] }); }))));
}

function ownersPanel(s: GameState, m: Auc31): void {
  const rl = m.lot;
  if (!rl) return;
  modal(T(l('Lista de donos', 'Owner list')), h('div', { class: 'sc31-panel' }, h('ol', null, rl.own.map((o) => h('li', null, `${o[1]} · ${o[0]} · `, h('span', { class: 'muted' }, T(ownHow31(o[2]))))))));
}

function bidPanel(s: GameState, m: Auc31): void {
  const rl = m.lot, se = m.sess;
  if (!rl || !se) return;
  let close = (): void => {};
  let timer: ReturnType<typeof setInterval> | undefined;
  const box = h('div', { class: 'sc31-panel' });
  const foreign = (countryOfCity(se.city) ?? '') !== (countryOfCity(s.config.homeCity) ?? '');
  const draw = (): void => {
    const mm = auction31Model(s, { sessId: se.id, lotIdx: m.lotIdx });
    const lad = mm.lad;
    if (!lad || rl.st !== 'auction') { box.replaceChildren(h('p', null, T(l('O lote já foi vendido.', 'The lot is already sold.')))); return; }
    const lead = lad.lead === 'player';
    const leadName = lad.lead === 'player' ? T(l('você', 'you')) : lad.lead ? T(mm.seats.find((x) => x.b.key === lad.lead)?.label ?? l('um licitante ao telefone', 'a phone bidder')) : '—';
    const need = lad.need;
    let left = ROUND_S31;
    const clock = h('b', { class: 'sc31-clock', 'aria-live': 'polite' }, `${left}s`);
    const rows: (HTMLElement | null)[] = [
      h('p', null, T(l('Lance inicial {o} · degrau {i}', 'Opening {o} · step {i}'), { o: $(lad.open), i: $(lad.inc) })),
      mm.today ? h('p', null, T(l('Preço agora', 'Price now')), ': ', h('b', null, $(lad.price)), ' · ', T(l('na frente', 'leading')), ': ', h('b', null, leadName), ' · ', T(l('tempo da rodada', 'round time')), ': ', clock)
        : h('p', null, T(l('O pregão é na semana {w} (daqui a {n}). Até lá, deixe o representante com um limite: ele levanta a plaquinha por você até esse valor.', 'The sale is in week {w} ({n} from now). Until then, leave your representative a limit: they raise the paddle for you up to that amount.'), { w: se.w, n: se.w - s.week })),
      rl.bid ? h('p', null, T(l('Seu limite', 'Your limit')), ': ', h('b', null, $(rl.bid)), ' ', h('button', { type: 'button', class: 'btn small ghost', onclick: () => { dropBid31(s, rl.id); draw(); rerender(); } }, T(l('Retirar', 'Withdraw')))) : null,
      mm.today && lad.out.length ? h('p', { class: 'small muted' }, T(l('Baixaram a plaquinha', 'Lowered their paddle')), ': ', lad.out.map((o) => `${T(mm.seats.find((x) => x.b.key === o.key)?.label ?? l('telefone', 'phone'))} (${$(o.at)})`).join(' · ')) : null,
      foreign ? h('p', { class: 'small' }, '✈ ', T(l('Pregão fora do seu país: imposto de importação de {d}% e a peça chega em {w} semana(s) pela alfândega.', 'Sale abroad: {d}% import duty and the piece clears customs in {w} week(s).'), { d: Math.round(dutyRate31(s.year) * 100), w: shipWeeks31(s.year) })) : null,
    ];
    const raise = (amount: number): void => { const e = raise31(s, rl.id, amount); if (e) toast(T(e), 'bad'); draw(); rerender(); };
    const lim = h('input', { type: 'number', min: String(Math.round(lad.open / 100)), step: String(Math.max(1, Math.round(lad.inc / 100))), value: String(Math.round(Math.max(need, rl.bid ?? 0) / 100)), 'aria-label': T(l('Limite do representante', 'Representative limit')), style: 'width:9em' }) as HTMLInputElement;
    rows.push(h('div', { class: 'row wrap' },
      lead ? pill(T(l('Você está na frente', 'You are leading')), 'good') : lockBtn31(T(l('Levantar a plaquinha: {v}', 'Raise the paddle: {v}'), { v: $(need) }), cashLock31(s, need), () => raise(need), { cls: 'btn small primary' }),
      h('span', null, lim, ' ', h('button', { type: 'button', class: 'btn small', onclick: () => raise(Math.round(Number(lim.value) * 100)) }, T(l('Deixar limite ao representante', 'Leave a limit to the representative'))))));
    if (mm.today) rows.push(h('div', { class: 'row wrap' }, lockBtn31(T(l('Martelo! (fecha este lote agora)', 'Hammer! (close this lot now)')), lead || left <= 0 ? null : l('O leiloeiro ainda está chamando lances nesta rodada.', 'The auctioneer is still calling for bids this round.'), () => {
      const r = hammer31(s, se, rl.id);
      if (timer) clearInterval(timer);
      close(); rerender();
      if (r) toast(r[3] ? T(l('Arrematado por {v}!', 'Yours for {v}!'), { v: $(r[2]) }) : r[2] ? T(l('Vendido a outra pessoa por {v}.', 'Sold to someone else for {v}.'), { v: $(r[2]) }) : T(l('Sem lance no valor pedido.', 'No bid at the asking level.')), r[3] ? 'good' : 'info');
    }, { cls: 'btn small' })));
    box.replaceChildren(...rows.filter((x): x is HTMLElement => !!x));
    if (timer) clearInterval(timer);
    if (mm.today && !lead) timer = setInterval(() => {
      left -= 1;
      clock.textContent = left > 0 ? `${left}s` : T(l('dou-lhe uma, dou-lhe duas…', 'going once, going twice…'));
      if (left <= 0) { if (timer) clearInterval(timer); draw(); }
    }, 1000);
  };
  draw();
  close = modal(T(l('Lance · {n}', 'Bid · {n}'), { n: T(rl.n) }), box, { wide: true, onClose: () => { if (timer) clearInterval(timer); } });
}

function seatPanel(s: GameState, m: Auc31, arg?: string): void {
  const x = m.seats[Number(arg)];
  if (!x) return;
  const hs = x.hint;
  const lines: string[] = [];
  if (!hs.k) lines.push(T(l('Você não conhece esta pessoa: é só um rosto com uma plaquinha.', 'You do not know this person: just a face with a paddle.')));
  if (hs.spend) lines.push(T(hs.spend));
  if (hs.keen) lines.push(T(l('Quer muito esta peça.', 'Really wants this piece.')));
  if (hs.keen === false) lines.push(T(l('Não parece apaixonada pela peça.', 'Does not seem passionate about the piece.')));
  if (hs.hesitant) lines.push(T(l('Hesita antes de cada lance.', 'Hesitates before each bid.')));
  if (hs.k && lines.length === 0) lines.push(T(l('Você conhece de nome, mas não sabe como ela gasta.', 'You know them by name, but not how they spend.')));
  const goFicha = x.b.pid ? moreBtn31(l('Abrir a ficha', 'Open the profile'), () => runGo31({ quick: { kind: 'person', id: x.b.pid! } })) : null;
  modal(T(x.label), h('div', { class: 'sc31-panel' }, h('ul', null, lines.map((y) => h('li', null, y))),
    h('p', { class: 'small muted' }, T(l('O limite de cada pessoa nunca aparece; quem você conhece melhor dá mais pistas.', 'Nobody\'s limit is ever shown; people you know better give more hints.'))), goFicha));
}

function catalogList(s: GameState, m: Auc31, pick?: () => void): HTMLElement {
  if (!m.on) return h('p', { class: 'muted' }, T(l('A casa de leilões está desligada nesta partida (editor › interruptores).', 'The auction house is off in this game (editor › switches).')));
  if (!m.picks.length) return h('p', { class: 'muted' }, T(l('Nenhum lote nos próximos pregões. O catálogo sai assim que uma peça vai a leilão.', 'No lots in the upcoming sales. The catalogue appears as soon as a piece goes to auction.')));
  return h('div', null, m.picks.map((se) => section(`${T(houseName31(s, se.house, se.city))} · ${T(l('semana {w} (em {n})', 'week {w} (in {n})'), { w: se.w, n: Math.max(0, se.w - s.week) })}`,
    h('ul', null, se.lots.map((rid, i) => {
      const rl = relics(s).list.find((x) => x.id === rid);
      if (!rl) return null;
      return h('li', null, h('button', { type: 'button', class: 'link', onclick: () => { ui.sess = se.id; ui.lot = i; pick?.(); rerender(); } }, T(rl.n)), ' · ', $(openingBid(s, rl)),
        auction31(s).cons[rid] ? [' ', pill(T(l('seu', 'yours')), 'gold')] : rl.bid ? [' ', pill(T(l('limite {v}', 'limit {v}'), { v: $(rl.bid) }), 'good')] : null);
    })))));
}

function consignPanel(s: GameState): void {
  const xs = consignable31(s);
  let close = (): void => {};
  close = modal(T(l('Balcão de consignação', 'Consignment desk')), h('div', { class: 'sc31-panel' },
    h('p', { class: 'small' }, T(l('A peça vai ao próximo pregão do porte dela. Você recebe o martelo menos {c}% de comissão; sem lance no valor pedido, ela volta para você.', 'The piece goes to the next sale of its size. You get the hammer price minus {c}% commission; with no bid at the asking level, it comes back to you.'), { c: Math.round((auction31(s).fee ?? COMMISSION31) * 100) })),
    xs.length ? h('ul', null, xs.map((rl) => h('li', null, T(rl.n), ' · ', $(openingBid(s, rl)), ' ',
      h('button', { type: 'button', class: 'btn small', onclick: () => { const e = consign31(s, rl.id); close(); toast(T(e ?? l('Peça enviada ao pregão.', 'Piece sent to the sale.')), e ? 'bad' : 'good'); rerender(); } }, T(l('Consignar', 'Consign'))))))
      : h('p', { class: 'muted' }, T(l('Nenhuma peça livre no seu acervo.', 'No free piece in your collection.')))));
}

// ---------------------------------------------------------------- vista

export function auction31View(s: GameState): HTMLElement {
  const m = auction31Model(s, { sessId: ui.sess || undefined, lotIdx: ui.lot });
  const host = h('div', { class: 'sc31-host' });
  const again = (): void => { if (host.isConnected) host.replaceWith(auction31View(s)); };
  const tools = h('span', { class: 'sc31-pick' },
    m.picks.length > 1 ? select(m.sess?.id ?? '', m.picks.map((x) => ({ value: x.id, label: `${T(houseName31(s, x.house, x.city))} · ${x.lots.length}` })), (v) => { ui.sess = v; ui.lot = 0; again(); }, { 'aria-label': T(l('Pregão', 'Sale')) }) : null,
    m.sess && m.sess.lots.length > 1 ? h('button', { type: 'button', class: 'btn small ghost', 'aria-label': T(l('Lote anterior', 'Previous lot')), onclick: () => { ui.lot = Math.max(0, m.lotIdx - 1); again(); } }, '‹') : null,
    m.sess ? h('b', null, T(l('Lote {i} de {n}', 'Lot {i} of {n}'), { i: m.lotIdx + 1, n: m.sess.lots.length })) : null,
    m.sess && m.sess.lots.length > 1 ? h('button', { type: 'button', class: 'btn small ghost', 'aria-label': T(l('Próximo lote', 'Next lot')), onclick: () => { ui.lot = Math.min(m.sess!.lots.length - 1, m.lotIdx + 1); again(); } }, '›') : null);
  host.appendChild(sceneView31(s, {
    id: 'auction', title: m.title, W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintScene(cv, s, m),
    panels: {
      lot: () => lotPanel(s, m), owners: () => ownersPanel(s, m), bid: () => bidPanel(s, m), seat: (a?: string) => seatPanel(s, m, a),
      catalog: () => { let c = (): void => {}; c = modal(T(l('Catálogo dos próximos pregões', 'Catalogue of upcoming sales')), catalogList(s, m, () => c()), { wide: true }); },
      consign: () => consignPanel(s), door: () => runGo31({ area: 'lendas', tab: ['lendas9', 'relics'] }),
    },
    list: () => h('div', null, catalogList(s, m), h('button', { type: 'button', class: 'btn small', onclick: () => consignPanel(s) }, T(l('Balcão de consignação', 'Consignment desk')))),
    tools,
    note: m.today ? l('Hoje tem pregão: clique na sua plaquinha para dar lance (cada rodada tem tempo).', 'There is a sale today: click your paddle to bid (each round is timed).') : undefined,
    intro: fmtIntro(m),
    legend: h('p', { class: 'sc31-legend' }, h('span', null, h('b', null, T(ROOM_NAME31[m.room]))), ' · ',
      h('span', null, T(l('Plaquinha dourada: quem está com o lance. Cinza: já desistiu.', 'Gold paddle: who holds the bid. Grey: already out.')))),
  }));
  return host;
}
const fmtIntro = (m: Auc31): L => l(`A sala muda com a época (${ROOM_NAME31[m.room].pt}). O lote fica no pedestal com o brilho do nível; a plateia é gente do jogo — quem você conhece mostra pistas.`,
  `The room changes with the era (${ROOM_NAME31[m.room].en}). The lot sits on the pedestal with its level's glow; the audience is in-game people — those you know give hints.`);

registerArea({ id: 'auction31', label: l('Casa de leilões', 'Auction house'), icon: 'vault', key: '',
  badge: (s) => { const se = auction31Model(s); return se.today ? 1 : undefined; },
  render: (s) => h('div', null, h('h2', null, T(l('Casa de leilões', 'Auction house'))), auction31View(s)) });

registerQuick31({
  id: 'q.auction31', verb: 'open', icon: 'vault', kinds: ['city'], passive: true, label: l('Casa de leilões (catálogo e lances)', 'Auction house (catalogue and bids)'),
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'auction31' }),
});
export const cityOf31 = cityName31;
