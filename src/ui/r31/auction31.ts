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
import { abbrText, drawText, fitText } from '../pixel/font';
import { beam, box, curtain, floor, lightRig, screen, sign, stagePlatform, wall, type FloorStyle } from '../pixel/places/kit';
import { eraOf, paletteOf, type Palette, type WallKind } from '../pixel/palette';
import { C, INK, Px, discV, ellipseV, lv, tint, withAlpha, type Col } from '../pixel/px';
import { furniture } from '../pixel/sprites';
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
/** Parede e piso por sala: salão com lustre (papel de damasco e lambri), auditório (painéis e carpete), tela de lances
 *  (parede lisa escura, carpete), aplicativo (parede clara, concreto). Tons da paleta da época (pixel/palette). */
const ROOMK: Record<Auc31['room'], { wall: (pal: Palette) => Col; kind: WallKind; floor: FloorStyle; fa: (pal: Palette) => Col; fb: (pal: Palette) => Col }> = {
  salon: { wall: () => C('#6a2430'), kind: 'wainscot', floor: 'boards', fa: (p) => p.floors.lounge.a, fb: (p) => p.floors.lounge.b },
  hall: { wall: (p) => tint(p.wall, -0.05), kind: 'panel', floor: 'carpet', fa: () => C('#8a2a34'), fb: () => C('#7a2230') },
  screen: { wall: () => C('#3a4458'), kind: 'plain', floor: 'carpet', fa: () => C('#4a4e5c'), fb: () => C('#42465a') },
  app: { wall: () => C('#e4e8ee'), kind: 'plain', floor: 'concrete', fa: () => C('#c8ccd4'), fb: () => C('#bcc0ca') },
};

function paintRoom(p: Px, m: Auc31, pal: Palette): void {
  const R = ROOMK[m.room];
  wall(p, pal, 0, 92, R.wall(pal), R.kind);
  floor(p, 92, R.fa(pal), R.fb(pal), R.floor);
  // porta de saída
  box(p, 5, 52, 18, 40, pal.woodDark, 0);
  p.rect(8, 55, 12, 37, lv(pal.woodDark, 2.2)); discV(p, 18, 74, 1, pal.gold, { ink: false });
  // cortina à esquerda do palco
  curtain(p, 26, 0, 14, 80, m.room === 'app' ? C('#5a6a8a') : C('#8a1e2a'));
  // luz: lustre no salão, refletores no auditório, faixa de LED depois
  if (m.room === 'salon') {
    for (const cx of [66]) { // à esquerda do telão (no centro ficaria escondido)
      p.vline(cx, 0, 8, pal.gold);
      ellipseV(p, cx, 13, 12, 4, pal.gold);
      for (let i = -10; i <= 10; i += 4) { discV(p, cx + i, 18, 1, C('#fff4c8'), { ink: false }); p.put(cx + i, 20, C('#ffe080')); }
      beam(p, cx, 20, 88, 22, C('#fff0c0'), 16);
    }
  } else if (m.room === 'hall') lightRig(p, 1, pal, 5, 50, 230);
  else for (let x = 46; x < 236; x += 2) p.put(x, 1, (x >> 1) % 3 ? C('#80e0ff') : C('#ffffff'));
}

function paintScreen(p: Px, s: GameState, m: Auc31, pal: Palette): void {
  const x0 = 96, y0 = 8, w = 128, hh = 36;
  const body = m.room === 'salon' ? C('#2c2018') : m.room === 'hall' ? C('#e8e2d0') : m.room === 'screen' ? C('#0e2236') : C('#18181c');
  const fg = m.room === 'salon' ? C('#f0e0b0') : m.room === 'hall' ? C('#2a2420') : m.room === 'screen' ? C('#80e0ff') : C('#ffffff');
  const rim = m.room === 'salon' ? pal.gold : m.room === 'hall' ? pal.metalDark : C('#202630');
  if (m.room === 'app') { screen(p, x0 + 38, y0, 52, hh, body, rim, false); } else screen(p, x0, y0, w, hh, body, rim, m.room === 'screen');
  const lot = m.lot;
  const left = m.room === 'app' ? x0 + 40 : x0 + 3, maxW = m.room === 'app' ? 48 : w - 6;
  if (!lot) { drawText(p, fitText(t(l('SEM LOTES', 'NO LOTS')).toUpperCase(), maxW), left, y0 + 14, fg); return; }
  drawText(p, fitText(t(l('DONOS DA PEÇA', 'OWNERS')).toUpperCase(), maxW), left, y0 + 2, fg);
  lot.own.slice(-3).forEach((o, i) => drawText(p, fitText(`${o[1]} ${o[0]}`.toUpperCase(), maxW), left, y0 + 9 + i * 7, tint(fg, -0.18)));
  if (m.lad && m.today && m.room !== 'salon') drawText(p, fitText($(m.lad.price), maxW), left, y0 + hh - 7, C('#f0c040'));
  void s;
}

function paintScene(cv: HTMLCanvasElement, s: GameState, m: Auc31): void {
  const p = new Px(m.W, m.H);
  const pal = paletteOf(m.year);
  paintRoom(p, m, pal);
  paintScreen(p, s, m, pal);
  // catálogo na parede: quadro com as folhas dos próximos pregões
  box(p, 238, 14, 62, 64, m.room === 'salon' ? pal.gold : pal.woodDark, 0);
  p.rect(241, 17, 56, 58, C('#f2ead6'));
  drawText(p, fitText(t(l('CATÁLOGO', 'CATALOGUE')), 52), 243, 19, C('#5a3a20'));
  // R31 (POL): nome abreviado na palavra (não "GRANDE LEILA"), ficha alta o bastante para as duas linhas, prazo legível
  m.picks.slice(0, 3).forEach((x, i) => {
    const wk = Math.max(0, x.w - s.week);
    box(p, 243, 28 + i * 16, 52, 15, C('#e6d8b8'), 0, lv(C('#e6d8b8'), 1.4));
    drawText(p, abbrText(t(HOUSE31[x.house].name), 48), 245, 30 + i * 16, C('#3a2a1a'));
    drawText(p, abbrText(`${t(l('{n} lotes', '{n} lots'), { n: x.lots.length })} ${wk ? t(l('em {w} sem', 'in {w} wk'), { w: wk }) : t(l('hoje', 'today'))}`, 48), 245, 36 + i * 16, C('#8a5a30'));
  });
  // palco com o púlpito e o pedestal
  stagePlatform(p, 26, 98, 200, 8, pal.wood, pal.woodDark);
  box(p, 40, 82, 28, 16, pal.woodDark, 3);
  p.rect(48, 86, 12, 3, pal.gold);
  const glow = TIER_GLOW[Math.max(0, m.tier - 1)];
  if (m.lot) {
    for (let r = 22; r >= 10; r -= 3) p.disc(160, 58, r, withAlpha(glow, 26));
    box(p, 151, 76, 18, 22, C('#e8e0d0'), 3);
    p.rect(149, 73, 22, 3, C('#d6ccb8')); p.hline(149, 170, 73, C('#f4eee2'));
    const art = relicArtOf28(m.lot.k, m.lot.n.pt, m.lot.y, m.lot.id);
    p.blit(relicPx28(art, m.lot.id, m.lot.y, m.lot.n.pt), 148, 48);
    for (let i = 0; i < 5; i++) { p.disc(148 + i * 6, 42, 2, INK); p.disc(148 + i * 6, 42, 1, i < m.tier ? glow : C('#5a5048')); }
  }
  // balcão de consignação
  box(p, 262, 114, 52, 18, pal.woodDark, 4);
  p.rect(264, 116, 48, 2, lv(pal.woodDark, 4.4));
  sign(p, 288, 98, t(l('CONSIGNAÇÃO', 'CONSIGNMENT')).toUpperCase(), pal.paper, tint(pal.accent2, -0.35));
  const ctx = blitPx31(cv, p.d, m.W, m.H);
  if (!ctx) return;
  const era = eraOf(m.year);
  const spr = (look: ReturnType<typeof lookOf>, role: Parameters<typeof avatarSprite>[1]['role'], x: number, y: number, dir: 'SE' | 'SW' | 'NE' | 'NW', pose: 'stand' | 'sit' = 'stand'): void => {
    const sp = avatarSprite(look, { year: m.year, role: role ?? null, pose, dir });
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - 6, y, 12, 2);
    ctx.drawImage(sp.c, x - sp.ax, y - sp.ay + 1);
  };
  // leiloeiro atrás do púlpito, com o martelo
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, m.W, 83); ctx.clip();
  spr(lookOf({ id: `auctioneer-${m.sess?.house ?? 'x'}` }), null, 54, 92, 'SE'); // de pé no tablado: tronco acima do púlpito
  ctx.restore();
  ctx.fillStyle = '#3a1e10'; ctx.fillRect(66, 76, 1, 6); ctx.fillStyle = '#8a5028'; ctx.fillRect(64, 75, 6, 3);
  // plateia sentada, de costas para você, com as plaquinhas
  for (const x of m.seats) {
    const ch = furniture('chair', era, 'SW'); ctx.drawImage(ch.c, x.x - ch.ax, x.y - ch.ay + 2);
    const pr = x.b.pid ? s.persons[x.b.pid] : undefined;
    spr(lookOf(pr ?? { id: x.b.key }), pr?.role ?? null, x.x, x.y, 'NW', 'sit');
    const up = x.lead ? 12 : x.outAt !== undefined ? -4 : 4;
    ctx.fillStyle = '#170e12'; ctx.fillRect(x.x + 6, x.y - 26 - up, 1, up + 8);
    ctx.fillStyle = '#170e12'; ctx.fillRect(x.x + 1, x.y - 34 - up, 11, 9);
    ctx.fillStyle = x.outAt !== undefined ? '#8a8a8a' : x.lead ? '#f0c040' : '#f4ecd8';
    ctx.fillRect(x.x + 2, x.y - 33 - up, 9, 7);
    // R31 (POL): plaquinha com o número do licitante (antes um quadrado branco liso)
    drawText(ctx, String((m.seats.indexOf(x) + 1) * 7 + 10), x.x + 3, x.y - 32 - up, x.outAt !== undefined ? '#d8d8d8' : '#170e12');
  }
  // você, de pé no corredor, com a sua plaquinha
  const me = playerPerson(s);
  spr(lookOf(me ?? { id: 'player' }), me?.role ?? null, 160, 178, 'NE');
  if (!m.cons && m.lot) {
    const lead = m.lad?.lead === 'player';
    ctx.fillStyle = '#170e12'; ctx.fillRect(166, lead ? 138 : 146, 1, lead ? 20 : 12); ctx.fillRect(161, lead ? 131 : 139, 12, 9);
    ctx.fillStyle = lead ? '#f0c040' : '#ffffff'; ctx.fillRect(162, lead ? 132 : 140, 10, 7);
    drawText(ctx, '1', 166, lead ? 133 : 141, '#170e12');
  }
}


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
