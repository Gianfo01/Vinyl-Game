// R31 · onda 4 (T2) — LEILÃO SILENCIOSO em cena (DOM + pintura). O modelo (bauc31model) diz o que há na sala dos
// fundos do beco; aqui se pinta a sala (tijolo, lâmpada pendurada, caixote com os lotes, prancheta, gente sem rosto
// sob a aba do chapéu, a janela com a viatura quando o calor sobe) e se abrem os painéis: a folha (linhas anônimas e o
// seu lance, com o motivo do bloqueio), o lote (vendedor, pista, alfândega), o vendedor, a polícia e a folha anterior.
// Toda ação chama o motor (sim/sys/bauc31: writeBid31); o fechamento é na virada do mês.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { playerPerson } from '../../sim/sys/life';
import { bidLock31, writeBid31 } from '../../sim/sys/bauc31';
import { relics } from '../../sim/sys/relics9';
import { ITEMS31, items31 } from '../../sim/r31/items31';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, toast } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText } from '../pixel/font';
import { beam, box, floor, wall } from '../pixel/places/kit';
import { paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, discV, lv, withAlpha } from '../pixel/px';
import { relicArtOf28, relicPx28 } from '../pixel/relic28';
import { registerArea } from '../registry';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { CRATE_TOP31, bauc31Model, type Bauc31, type LotV31 } from './bauc31model';

const T = (x: L, v?: Record<string, string | number>): string => t(x, v);
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const FAM_ART31: Record<string, string> = { guitar: 'guitar', strings: 'guitar', bass: 'bass', drums: 'drums', keys: 'piano', mic: 'mic', horns: 'prop' };
/** Arte do lote: a da relíquia (pelo tipo dela) ou a do instrumento (pela família do modelo). */
function lotArt(s: GameState, x: LotV31) {
  const kind = x.lot.k === 'relic' ? relics(s).list.find((r) => r.id === x.lot.ref)?.k ?? 'guitar'
    : FAM_ART31[ITEMS31.find((d) => d.id === items31(s).d[x.lot.ref]?.def)?.fam ?? 'guitar'] ?? 'guitar';
  return relicArtOf28(kind, x.lot.n.pt, x.lot.y, x.lot.id);
}

// ---------------------------------------------------------------- pintura

function paintRoom(p: Px, m: Bauc31, pal: Palette): void {
  wall(p, pal, 0, 96, C('#4a2c26'), 'brick');
  floor(p, 96, C('#3a3634'), C('#34302e'), 'concrete');
  // porta de saída (ferro) e o olheiro encostado nela (pintado depois)
  box(p, 5, 52, 18, 44, C('#3a3e44'), 0);
  p.rect(8, 55, 12, 41, C('#4a4e56')); for (let y = 58; y < 94; y += 6) p.hline(8, 19, y, C('#3a3e44'));
  discV(p, 18, 76, 1, C('#a0a4a8'), { ink: false });
  // janela gradeada alta: noite — ou a viatura piscando quando o calor está alto
  const wx = 234, wy = 14, ww = 56, wh = 24;
  for (let j = 0; j < wh; j++) p.hline(wx, wx + ww - 1, wy + j, lv(C('#141c30'), 2 + j / wh));
  if (m.hot) { p.rect(wx + 4, wy + 6, 22, 12, withAlpha(C('#e02020'), 150)); p.rect(wx + 28, wy + 6, 22, 12, withAlpha(C('#2060f0'), 150)); }
  else { p.disc(wx + 44, wy + 7, 2, C('#e8e4c0')); }
  for (let x = wx + 6; x < wx + ww; x += 8) p.vline(x, wy, wy + wh - 1, C('#2a2a2e'));
  box(p, wx - 2, wy - 2, ww + 4, 2, C('#2a2a2e'), 0); box(p, wx - 2, wy + wh, ww + 4, 2, C('#2a2a2e'), 0);
  // caixotes empilhados no fundo
  for (const [x, y, w, hh] of [[30, 70, 26, 26], [56, 76, 22, 20], [36, 50, 20, 20], [270, 72, 30, 24]] as const) {
    box(p, x, y, w, hh, C('#7a5a38'), 3);
    for (let j = y + 4; j < y + hh - 1; j += 5) p.hline(x + 1, x + w - 2, j, lv(C('#7a5a38'), 1.8));
  }
  // folha do mês passado pregada na parede
  box(p, 100, 28, 30, 30, C('#e8dcc0'), 0);
  for (let i = 0; i < 5; i++) p.hline(104, 125, 36 + i * 4, C('#a89878'));
  p.disc(115, 30, 1, C('#b02020'));
}

function paintScene(cv: HTMLCanvasElement, s: GameState, m: Bauc31): void {
  const p = new Px(m.W, m.H);
  const pal = paletteOf(m.year);
  paintRoom(p, m, pal);
  // lâmpada pendurada e o cone de luz sobre o caixote
  p.vline(160, 0, 14, INK); p.rect(157, 14, 7, 3, C('#2a2a2e'));
  discV(p, 160, 19, 3, C('#fff0b0'), { ink: false });
  beam(p, 160, 20, 150, 70, C('#fff0c0'), 26);
  // caixote grande servindo de mesa, com os lotes em cima
  const tx = 104, tw = 112;
  box(p, tx, CRATE_TOP31, tw, 30, C('#8a6440'), 4);
  for (let j = CRATE_TOP31 + 5; j < CRATE_TOP31 + 29; j += 6) p.hline(tx + 1, tx + tw - 2, j, lv(C('#8a6440'), 1.8));
  for (const x of m.lots) {
    p.blit(relicPx28(lotArt(s, x), x.lot.id, x.lot.y, x.lot.n.pt), x.x - 12, CRATE_TOP31 - 26);
    p.rect(x.x - 5, CRATE_TOP31 + 3, 10, 7, C('#efe4c8')); drawText(p, String(m.lots.indexOf(x) + 1), x.x - 2, CRATE_TOP31 + 4, C('#3a2a1a'));
  }
  if (!m.lots.length) {
    // mês sem lotes: lona velha jogada por cima do caixote, presa com corda
    const tarp = C('#5a6048');
    p.poly([[tx - 2, CRATE_TOP31 + 14], [tx + 8, CRATE_TOP31 - 6], [tx + tw - 8, CRATE_TOP31 - 6], [tx + tw + 2, CRATE_TOP31 + 16]], tarp);
    for (let i = tx + 6; i < tx + tw - 4; i += 9) p.line(i, CRATE_TOP31 - 5, i + 3, CRATE_TOP31 + 13, lv(tarp, 1.6));
    p.hline(tx + 8, tx + tw - 9, CRATE_TOP31 - 6, lv(tarp, 4));
    p.line(tx + 20, CRATE_TOP31 - 6, tx + 24, CRATE_TOP31 + 18, C('#c8b080')); p.line(tx + tw - 22, CRATE_TOP31 - 6, tx + tw - 26, CRATE_TOP31 + 18, C('#c8b080'));
  }
  // mesinha com a prancheta (a folha de lances)
  box(p, 232, 132, 30, 26, C('#5a4030'), 3);
  p.rect(236, 118, 22, 14, C('#7a5a38')); p.rect(238, 120, 18, 11, C('#f4ecd8'));
  for (let i = 0; i < 3; i++) p.hline(240, 253, 123 + i * 3, C('#7a7a80'));
  p.rect(244, 116, 6, 3, C('#a0a4a8'));
  const ctx = blitPx31(cv, p.d, m.W, m.H);
  if (!ctx) return;
  const spr = (id: string, x: number, y: number, dir: 'SE' | 'SW' | 'NE' | 'NW', shade = false, pid?: string): void => {
    const pr = pid ? s.persons[pid] : undefined;
    const sp = avatarSprite(lookOf(pr ?? { id }), { year: m.year, role: pr?.role ?? null, pose: 'stand', dir });
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 6, y, 12, 2);
    ctx.drawImage(sp.c, x - sp.ax, y - sp.ay + 1);
    if (shade) {
      // aba do chapéu e rosto na sombra: ninguém aqui tem nome
      const top = y - sp.ay + 1;
      ctx.fillStyle = '#16100e'; ctx.fillRect(x - 7, top + 1, 14, 3); ctx.fillRect(x - 4, top - 2, 8, 3);
      ctx.fillStyle = 'rgba(10,6,6,.55)'; ctx.fillRect(x - 5, top + 4, 10, 7);
    }
  };
  // vendedor atrás do caixote (cortado no tampo)
  if (m.lots.length) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, m.W, CRATE_TOP31 - 2); ctx.clip(); spr(`seller-${m.sheet?.id ?? 'x'}`, 200, CRATE_TOP31 + 8, 'SE', m.lots.every((x) => !x.k)); ctx.restore(); }
  // olheiro na porta e mãos anônimas em volta (uma passando a folha)
  spr('lookout-bauc', 34, 150, 'SE', true);
  spr('hand-1', 86, 160, 'NE', true);
  spr('hand-2', 214, 162, 'NW', true);
  spr('hand-3', 280, 156, 'NW', true);
  ctx.fillStyle = '#170e12'; ctx.fillRect(268, 136, 9, 8); ctx.fillStyle = '#f4ecd8'; ctx.fillRect(269, 137, 7, 6);
  // você
  const me = playerPerson(s);
  spr('player', 156, 176, 'NE', false, me?.id);
}

// ---------------------------------------------------------------- painéis

function lineRows(s: GameState, x: LotV31): HTMLElement {
  const rows: HTMLElement[] = x.lines.map((y) => h('li', { class: 'sc31-row' }, T(l('Mão nº {n}', 'Hand no. {n}'), { n: y.hand }), ': ', $(y.amt)));
  if (x.lot.mine) rows.push(h('li', { class: 'sc31-row' }, h('b', null, T(l('Sua letra', 'Your handwriting'))), ': ', $(x.lot.mine), ' ', x.mineTop ? pill(T(l('na frente', 'leading')), 'good') : pill(T(l('superado', 'outbid')), 'bad')));
  return rows.length ? h('ol', null, rows) : h('p', { class: 'muted small' }, T(l('Ninguém escreveu ainda. Lance inicial: {v}.', 'Nobody has written yet. Opening bid: {v}.'), { v: $(x.lot.open) }));
  void s;
}
function bidRow(s: GameState, x: LotV31, done: () => void): HTMLElement {
  const inp = h('input', { type: 'number', min: String(Math.round(x.need / 100)), step: String(Math.max(1, Math.round(x.lot.step / 100))), value: String(Math.round(x.need / 100)), style: 'width:8em', 'aria-label': T(l('Seu lance', 'Your bid')) }) as HTMLInputElement;
  const holder = h('span');
  const draw = (): void => { holder.replaceChildren(lockBtn31(T(l('Escrever na folha', 'Write it on the sheet')), bidLock31(s, x.lot.id, Math.round(Number(inp.value) * 100)), () => {
    const e = writeBid31(s, x.lot.id, Math.round(Number(inp.value) * 100));
    toast(T(e ?? l('Lance escrito. A folha segue de mão em mão até a virada do mês.', 'Bid written. The sheet keeps going from hand to hand until the turn of the month.')), e ? 'bad' : 'good'); done(); rerender();
  }, { cls: 'btn small primary' })); };
  inp.addEventListener('input', draw);
  draw();
  return h('div', { class: 'row wrap' }, h('span', null, '$ ', inp), ' ', holder);
}
function sheetPanel(s: GameState, m: Bauc31): void {
  if (!m.lots.length) { modal(T(l('Folha de lances', 'Bid sheet')), h('p', { class: 'muted' }, T(l('Nenhuma folha circulando este mês. Ela aparece na virada do mês, quando o beco tem o que vender.', 'No sheet going around this month. It shows up at the turn of the month, when the alley has something to sell.')))); return; }
  let close = (): void => {};
  close = modal(T(l('Folha de lances', 'Bid sheet')), h('div', { class: 'sc31-panel' },
    ...m.lots.map((x, i) => h('section', null, h('p', null, h('b', null, `${i + 1}. ${T(x.lot.n)}`), x.abroad ? [' ', pill(T(l('vem pela alfândega', 'comes via customs')), 'gold')] : null),
      lineRows(s, x), bidRow(s, x, () => close()))),
    h('p', { class: 'small muted' }, T(l('Na virada do mês a folha é recolhida: quem escreveu mais leva e paga o que escreveu. Se alguém estava disposto a mais, a folha volta com um lance acima do seu.', 'At the turn of the month the sheet is collected: whoever wrote the most takes it and pays what they wrote. If someone was willing to go higher, the sheet comes back with a bid above yours.')))), { wide: true });
}
function lotPanel(s: GameState, m: Bauc31, arg?: string): void {
  const x = m.lots[Number(arg)];
  if (!x) return;
  modal(T(x.lot.n), h('div', { class: 'sc31-panel' },
    h('p', null, pill(T(x.lot.k === 'relic' ? l('relíquia roubada', 'stolen relic') : l('instrumento roubado', 'stolen instrument')), 'bad'), ' ', T(l('Ano {y}', 'Year {y}'), { y: x.lot.y })),
    h('ul', null,
      h('li', { class: 'sc31-row' }, T(l('Quem vende', 'Seller')), ': ', h('b', null, T(x.seller))),
      h('li', { class: 'sc31-row' }, T(x.hint)),
      x.fake ? h('li', { class: 'sc31-row' }, T(l('Pelo que você sabe dele: {f}.', 'From what you know of them: {f}.'), { f: T(x.fake) })) : null,
      h('li', { class: 'sc31-row' }, T(l('Maior lance na folha', 'Highest bid on the sheet')), ': ', h('b', null, x.top ? $(x.top) : '—'), ' · ', T(l('próximo', 'next')), ': ', $(x.need)),
      x.abroad ? h('li', { class: 'sc31-row' }, T(l('A peça está fora do país: chega pela alfândega, sem nota (risco de apreensão).', 'The piece is abroad: it arrives through customs, without an invoice (seizure risk).'))) : null,
      h('li', { class: 'sc31-row' }, T(l('Chance de a polícia rastrear a peça depois: {p}', 'Chance the police trace the piece afterwards: {p}'), { p: pct(x.trace) }))),
    h('p', { class: 'small muted' }, T(l('Rastreada, a compra vira notícia, escândalo e caso na polícia — e quem era dono dela não esquece.', 'If traced, the purchase becomes news, a scandal and a police case — and whoever owned it does not forget.')))));
}
function sellerPanel(s: GameState, m: Bauc31): void {
  modal(T(l('Vendedor', 'Seller')), h('div', { class: 'sc31-panel' },
    h('ul', null, m.lots.map((x) => h('li', null, h('b', null, T(x.lot.n)), ': ', T(x.seller), ' — ', T(x.hint)))),
    h('p', { class: 'small muted' }, T(l('Cada nível de conhecimento sobre quem vende corta a chance de falsificação (conheça o pessoal das facções pelo submundo).', 'Each level of knowledge about the seller cuts the forgery odds (get to know the faction people through the underworld).')))));
  void s;
}
function windowPanel(s: GameState, m: Bauc31): void {
  modal(T(l('Janela gradeada', 'Barred window')), h('div', { class: 'sc31-panel' },
    h('p', null, T(m.hot ? l('Uma viatura parada na esquina, luz piscando.', 'A patrol car parked on the corner, lights flashing.') : l('A rua está quieta.', 'The street is quiet.'))),
    h('p', { class: 'small' }, T(l('Calor da polícia no país: {h}/100. Quanto mais calor, maior a chance de rastrearem o que você leva daqui.', 'Police heat in the country: {h}/100. The more heat, the higher the chance they trace what you take from here.'), { h: m.heat }))));
  void s;
}
function lastPanel(s: GameState, m: Bauc31): void {
  const x = m.last;
  modal(T(l('Folha do mês passado', 'Last month\'s sheet')), x ? h('ul', { class: 'sc31-panel' }, x.lots.map((y) => h('li', null, h('b', null, T(y.n)), ' — ',
    y.st === 'won' ? T(l('sua, por {v}{f}', 'yours, for {v}{f}'), { v: $(y.price ?? 0), f: y.fake ? T(l(' (era falsa)', ' (it was fake)')) : y.traced ? T(l(' (rastreada)', ' (traced)')) : '' })
      : y.st === 'lost' ? T(l('levada por uma mão anônima ({v})', 'taken by an anonymous hand ({v})'), { v: $(y.price ?? 0) }) : T(l('saiu da folha', 'left the sheet')))))
    : h('p', { class: 'muted' }, T(l('Nenhuma folha recolhida ainda.', 'No sheet collected yet.'))));
  void s;
}

// ---------------------------------------------------------------- vista

export function bauc31View(s: GameState): HTMLElement {
  const m = bauc31Model(s);
  return sceneView31(s, {
    id: 'bauc', title: m.title, W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintScene(cv, s, m),
    panels: { door: () => runGo31({ area: 'crime' }), sheet: () => sheetPanel(s, m), lot: (a?: string) => lotPanel(s, m, a), seller: () => sellerPanel(s, m), window: () => windowPanel(s, m), last: () => lastPanel(s, m) },
    list: () => h('div', null, m.on ? null : h('p', { class: 'muted' }, T(l('O leilão silencioso está desligado nesta partida (editor › interruptores).', 'The silent auction is off in this game (editor › switches).'))),
      h('ul', null, m.lots.map((x, i) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => lotPanel(s, m, String(i)) }, T(x.lot.n)), ' · ', x.top ? $(x.top) : $(x.lot.open)))),
      moreBtn31(l('Folha de lances', 'Bid sheet'), () => sheetPanel(s, m))),
    note: m.lots.some((x) => x.lot.mine && !x.mineTop) ? l('Alguém escreveu acima de você na folha.', 'Someone wrote above you on the sheet.') : undefined,
    intro: l('Na sala dos fundos do beco, a folha de lances passa de mão em mão: ninguém assina, cada linha é só uma letra. Peças roubadas ou falsas — conhecer quem vende reduz o risco.', 'In the alley\'s back room, the bid sheet goes from hand to hand: nobody signs, each line is just handwriting. Stolen or fake pieces — knowing the seller lowers the risk.'),
    legend: h('p', { class: 'sc31-legend' }, h('span', null, T(l('Rostos na sombra: ninguém aqui tem nome.', 'Faces in shadow: nobody here has a name.')))),
  });
}

registerArea({ id: 'bauc31', label: l('Leilão silencioso (beco)', 'Silent auction (alley)'), icon: 'skull', key: '',
  badge: (s) => { const m = bauc31Model(s); return m.lots.some((x) => x.lot.mine && !x.mineTop) ? 1 : undefined; },
  render: (s) => h('div', null, h('h2', null, T(bauc31Model(s).title)), bauc31View(s)) });

registerQuick31({
  id: 'q.bauc31', verb: 'open', icon: 'skull', kinds: ['city'], passive: true, label: l('Leilão silencioso do beco (mercado negro)', 'Alley silent auction (black market)'),
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'bauc31' }),
});
