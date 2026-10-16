// R31 · onda 4 (T2) — ALFÂNDEGA em cena (DOM + pintura). O modelo (customs31model) diz o que há no balcão; aqui se
// pinta o galpão do porto ou o salão do aeroporto da época e se abrem os painéis curtos: a carga parada (declarar e
// pagar imposto, tentar liberar sozinho ou com o despachante, oferecer propina, abandonar — cada botão com o motivo do
// bloqueio), o fiscal, o despachante, o quadro de cargas e a tabela de impostos. Toda ação chama o motor
// (sim/sys/customs31: cargoAct31) — a cena é a frente da mesma conta.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { playerPerson } from '../../sim/sys/life';
import {
  bribeCost31, bribeP31, cargoAct31, cargoLock31, despFee31, fine31, seizeP31, type Act31, type Cargo31,
} from '../../sim/sys/customs31';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, toast } from '../common';
import { h } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, fitText } from '../pixel/font';
import { box, floor, sign, wall } from '../pixel/places/kit';
import { eraOf, paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, discV, lv, tint } from '../pixel/px';
import { registerArea } from '../registry';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { cityN31, customs31Model, type Cus31 } from './customs31model';

const T = (x: L, v?: Record<string, string | number>): string => t(x, v);
const pct = (x: number): string => `${Math.round(x * 100)}%`;

// ---------------------------------------------------------------- pintura

function paintRoom(p: Px, m: Cus31, pal: Palette): void {
  if (m.port) {
    // galpão de madeira do porto: tábuas verticais, viga, portão aberto para o cais
    wall(p, pal, 0, 98, tint(pal.wood, -0.18), 'plain');
    for (let x = 0; x < m.W; x += 9) { p.vline(x, 0, 97, lv(pal.woodDark, 1.4)); p.vline(x + 1, 0, 97, lv(pal.wood, 3.2)); }
    p.rect(0, 6, m.W, 4, pal.woodDark); p.hline(0, m.W - 1, 6, lv(pal.woodDark, 3.6));
    floor(p, 98, C('#7a6248'), C('#6e5840'), 'boards');
    // portão para o cais (água e um casco ao fundo)
    const gx = 244, gy = 58, gw = 70, gh = 40;
    p.rect(gx, gy, gw, gh, C('#9cc4d8'));
    for (let j = 0; j < 14; j++) p.hline(gx, gx + gw - 1, gy + gh - 14 + j, lv(C('#3a6a88'), 2.2 + (j % 3) * 0.4));
    p.rect(gx + 30, gy + 14, 30, 12, C('#2a2a30')); p.rect(gx + 40, gy + 4, 4, 10, C('#8a2020')); p.rect(gx + 30, gy + 22, 30, 4, C('#5a1a1a'));
    box(p, gx - 3, gy - 4, 3, gh + 4, pal.woodDark, 0); box(p, gx + gw, gy - 4, 3, gh + 4, pal.woodDark, 0);
    p.rect(gx - 3, gy - 6, gw + 6, 3, pal.woodDark);
    // corrente e gancho do guindaste
    for (let y = 10; y < 46; y += 3) { p.put(206, y, pal.metalDark); p.put(207, y + 1, pal.metal); }
    p.rect(204, 46, 5, 2, pal.metalDark); p.put(208, 48, pal.metalDark); p.put(208, 49, pal.metalDark); p.put(207, 50, pal.metalDark);
  } else {
    wall(p, pal, 0, 98, m.year >= 2001 ? C('#d8dce2') : pal.wall, m.year >= 1975 ? 'tile' : 'panel');
    floor(p, 98, m.year >= 1975 ? C('#c8c4ba') : pal.floors.hall.a, m.year >= 1975 ? C('#b8b4aa') : pal.floors.hall.b, 'tiles');
    // janela alta com a pista
    const wx = 244, wy = 58, ww = 70, wh = 26;
    p.rect(wx, wy, ww, wh, C('#a8d0ec'));
    p.rect(wx, wy + wh - 6, ww, 6, C('#7a7c80'));
    p.rect(wx + 18, wy + 10, 34, 5, C('#e8ecf0')); p.rect(wx + 30, wy + 6, 8, 4, C('#e8ecf0')); p.rect(wx + 48, wy + 8, 3, 7, C('#c03030'));
    box(p, wx - 2, wy - 2, ww + 4, 2, pal.metalDark, 0); box(p, wx - 2, wy + wh, ww + 4, 2, pal.metalDark, 0);
    for (let x = wx; x < wx + ww; x += 17) p.vline(x, wy, wy + wh - 1, pal.metalDark);
  }
  // porta de saída
  box(p, 5, 54, 18, 44, pal.woodDark, 0);
  p.rect(8, 57, 12, 41, lv(pal.woodDark, 2.2)); discV(p, 18, 78, 1, pal.gold, { ink: false });
}

function paintBoard(p: Px, s: GameState, m: Cus31, pal: Palette): void {
  const x = 30, y = 10, w = 72, hh = 48;
  const body = m.port ? C('#2e3a30') : m.year >= 1975 ? C('#16181c') : C('#2a2a2e');
  const fg = m.port ? C('#e8ecdc') : C('#f0c040');
  box(p, x, y, w, hh, m.port ? pal.woodDark : pal.metalDark, 0);
  p.rect(x + 2, y + 2, w - 4, hh - 4, body);
  drawText(p, fitText(T(m.port ? l('NAVIOS', 'SHIPS') : l('CARGAS', 'CARGO')).toUpperCase(), w - 8), x + 4, y + 4, fg);
  p.hline(x + 3, x + w - 4, y + 11, tint(fg, -0.5));
  const rows = m.transit.slice(0, 4);
  if (!rows.length) drawText(p, fitText(T(l('NADA A CAMINHO', 'NOTHING DUE')).toUpperCase(), w - 8), x + 4, y + 15, tint(fg, -0.25));
  rows.forEach((c, i) => {
    const wk = Math.max(0, c.arrive - s.week);
    drawText(p, fitText(T(cityN31(c.from)).toUpperCase(), w - 22), x + 4, y + 15 + i * 8, tint(fg, -0.15));
    drawText(p, `${wk}S`, x + w - 16, y + 15 + i * 8, fg);
  });
}

function paintCrate(p: Px, x: number, y: number, w: number, hh: number, legal: boolean, pal: Palette, n: number): void {
  // palete no chão (pés no piso) e caixa de ripas
  p.rect(x - 2, y + hh, w + 4, 3, lv(pal.woodDark, 1.6)); p.hline(x - 2, x + w + 1, y + hh, lv(pal.wood, 3.6));
  for (let i = x; i < x + w; i += 6) p.vline(i, y + hh + 1, y + hh + 2, INK);
  box(p, x, y, w, hh, C('#b08850'), 3);
  for (let j = y + 4; j < y + hh - 1; j += 5) p.hline(x + 1, x + w - 2, j, lv(C('#b08850'), 1.8));
  p.line(x + 2, y + 2, x + w - 3, y + hh - 3, lv(C('#b08850'), 1.4));
  // etiqueta e carimbo
  p.rect(x + 4, y + 3, 12, 8, pal.paper); p.hline(x + 4, x + 15, y + 3, lv(pal.paper, 4.6));
  drawText(p, String(n), x + 8, y + 5, C('#3a2a1a'));
  p.rect(x + w - 10, y + hh - 8, 7, 5, legal ? C('#3a7a3a') : C('#b02020'));
}

function paintScene(cv: HTMLCanvasElement, s: GameState, m: Cus31): void {
  const p = new Px(m.W, m.H);
  const pal = paletteOf(m.year);
  paintRoom(p, m, pal);
  paintBoard(p, s, m, pal);
  // placa grande sobre o balcão
  sign(p, 170, 30, T(l('ALFÂNDEGA', 'CUSTOMS')).toUpperCase(), pal.paper, m.port ? tint(pal.woodDark, -0.2) : C('#24406a'), pal.gold);
  // tabela de impostos (cartaz)
  box(p, 236, 14, 58, 36, pal.paper, 0);
  drawText(p, fitText(T(l('IMPOSTO', 'DUTY')).toUpperCase(), 52), 240, 18, C('#5a3a20'));
  drawText(p, `${Math.round(m.duty * 100)}%`, 240, 27, C('#b02020'), 2);
  drawText(p, fitText(T(l('DO VALOR', 'OF VALUE')).toUpperCase(), 52), 240, 40, C('#5a3a20'));
  // scanner (2001+) na saída para a pista
  if (m.scanner) {
    box(p, 270, 62, 5, 38, C('#9aa0aa'), 0); box(p, 300, 62, 5, 38, C('#9aa0aa'), 0); box(p, 270, 58, 35, 5, C('#7a808a'), 0);
    p.rect(282, 59, 10, 2, C('#40e070'));
  }
  // balcão (frente) — o fiscal fica atrás (pintado depois, cortado na altura do tampo)
  const cx = 110, cy = 100, cw = 120, ch = 26;
  box(p, cx, cy, cw, ch, m.port ? pal.woodDark : C('#6a7280'), 4);
  p.rect(cx + 2, cy + 2, cw - 4, 2, lv(m.port ? pal.woodDark : C('#6a7280'), 4.2));
  // carimbo, livro de registro e lâmpada no tampo
  p.rect(cx + 8, cy - 5, 14, 4, C('#2a2a30')); p.rect(cx + 10, cy - 7, 4, 2, C('#8a2020'));
  p.rect(cx + 90, cy - 4, 18, 3, pal.paper); p.vline(cx + 99, cy - 4, cy - 2, lv(pal.paper, 1.6));
  // raio X (1975+) à direita do balcão, com a esteira
  if (m.xray) {
    box(p, 234, 84, 30, 34, C('#c8ccd2'), 3);
    p.rect(238, 96, 22, 14, C('#1a1c22')); for (let i = 0; i < 4; i++) p.vline(240 + i * 5, 96, 109, C('#2a2c34'));
    p.rect(240, 87, 10, 6, C('#2a6aa0')); p.rect(241, 88, 8, 4, C('#7ad0ff'));
    p.rect(218, 112, 16, 4, C('#3a3a40')); p.hline(218, 233, 112, C('#5a5a62'));
  }
  // caixas paradas (cargas reais)
  m.crates.forEach((x, i) => paintCrate(p, x.x, x.y, x.w, x.h, x.c.law === 'legal', pal, i + 1));
  if (!m.crates.length) {
    // sem carga: pilha de caixotes vazios encostada no fundo (não fica um vazio liso)
    box(p, 34, 140, 26, 20, C('#9a7848'), 3); box(p, 40, 124, 20, 16, C('#9a7848'), 3);
    p.rect(30, 160, 34, 3, lv(pal.woodDark, 1.6));
  }
  const ctx = blitPx31(cv, p.d, m.W, m.H);
  if (!ctx) return;
  const spr = (look: ReturnType<typeof lookOf>, role: Parameters<typeof avatarSprite>[1]['role'], x: number, y: number, dir: 'SE' | 'SW' | 'NE' | 'NW'): void => {
    const sp = avatarSprite(look, { year: m.year, role: role ?? null, pose: 'stand', dir });
    ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - 6, y, 12, 2);
    ctx.drawImage(sp.c, x - sp.ax, y - sp.ay + 1);
  };
  // fiscal atrás do balcão (cortado no tampo)
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, m.W, 101); ctx.clip();
  spr(lookOf({ id: `fiscal-${s.config.homeCity}-${eraOf(m.year)}` }), null, 162, 112, 'SE');
  ctx.restore();
  // cão farejador (1946–2000), sentado no chão ao lado do balcão
  if (m.dog) {
    const dx = 198, dy = 144;
    ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.22; ctx.fillRect(dx - 2, dy, 18, 2); ctx.globalAlpha = 1;
    const ink = '#1a120c', fur = '#7a5430', dark = '#4a3018';
    ctx.fillStyle = ink; ctx.fillRect(dx - 1, dy - 10, 14, 7); ctx.fillRect(dx + 9, dy - 15, 7, 7); ctx.fillRect(dx - 4, dy - 12, 4, 2);
    for (const lx of [0, 3, 8, 11]) ctx.fillRect(dx + lx - 1, dy - 4, 3, 4);
    ctx.fillStyle = fur; ctx.fillRect(dx, dy - 9, 12, 5); ctx.fillRect(dx + 10, dy - 14, 5, 5); ctx.fillRect(dx - 3, dy - 11, 3, 1);
    for (const lx of [0, 3, 8, 11]) ctx.fillRect(dx + lx, dy - 4, 1, 3);
    ctx.fillStyle = dark; ctx.fillRect(dx + 10, dy - 16, 2, 2); ctx.fillRect(dx + 15, dy - 12, 2, 2); ctx.fillRect(dx + 2, dy - 9, 6, 2);
    ctx.fillStyle = '#f0e8d0'; ctx.fillRect(dx + 13, dy - 13, 1, 1);
  }
  // despachante encostado, com a pasta
  spr(lookOf({ id: `desp-${s.config.homeCity}` }), null, 136, 154, 'SE');
  ctx.fillStyle = '#170e12'; ctx.fillRect(140, 140, 8, 7); ctx.fillStyle = '#5a3a20'; ctx.fillRect(141, 141, 6, 5);
  // você
  const me = playerPerson(s);
  spr(lookOf(me ?? { id: 'player' }), me?.role ?? null, 176, 176, 'NW');
}

// ---------------------------------------------------------------- painéis

const ACTS31: { a: Act31; label: L }[] = [
  { a: 'declare', label: l('Declarar e pagar o imposto', 'Declare and pay duty') },
  { a: 'self', label: l('Tentar liberar sem declarar', 'Try to clear it undeclared') },
  { a: 'desp', label: l('Chamar o despachante', 'Call the broker') },
  { a: 'bribe', label: l('Oferecer um envelope ao fiscal', 'Offer the inspector an envelope') },
  { a: 'drop', label: l('Abandonar a carga', 'Abandon the cargo') },
];
function crateRows(s: GameState, c: Cargo31): HTMLElement[] {
  const legal = c.law === 'legal';
  return [
    h('p', null, pill(legal ? T(l('com nota', 'with invoice')) : T(l('sem nota (roubada)', 'no invoice (stolen)')), legal ? 'good' : 'bad'), ' ',
      T(l('De {c}, pelo {v}', 'From {c}, by {v}'), { c: T(cityN31(c.from)), v: T(c.via === 'port' ? l('porto', 'port') : l('aeroporto', 'airport')) })),
    h('ul', null,
      h('li', { class: 'sc31-row' }, T(l('Valor declarado', 'Declared value')), ': ', h('b', null, $(c.v))),
      h('li', { class: 'sc31-row' }, T(l('Imposto devido', 'Duty owed')), ': ', h('b', null, $(c.duty))),
      h('li', { class: 'sc31-row' }, T(l('Parada há', 'Waiting for')), ': ', h('b', null, T(l('{n} semana(s) — com 4, ela se resolve sozinha', '{n} week(s) — at 4 it settles itself'), { n: Math.max(0, s.week - c.arrive) })))),
    h('ul', { class: 'small' },
      h('li', null, T(l('Sozinho: risco de apreensão {p}', 'On your own: seizure risk {p}'), { p: pct(seizeP31(s, c, 'self')) })),
      h('li', null, T(l('Com o despachante ({f}): risco {p}', 'With the broker ({f}): risk {p}'), { f: $(despFee31(s, c)), p: pct(seizeP31(s, c, 'desp')) })),
      h('li', null, T(l('Envelope de {v}: o fiscal aceita {p} das vezes; recusado, ele denuncia', '{v} envelope: the inspector takes it {p} of the time; refused, they report it'), { v: $(bribeCost31(s, c)), p: pct(bribeP31(s)) })),
      h('li', null, T(l('Pego: multa de {f}, jornal e reputação{x}', 'Caught: {f} fine, the papers and reputation{x}'), { f: $(fine31(s, c)), x: legal ? T(l(' (a peça é liberada depois)', ' (the piece is released afterwards)')) : T(l('; a peça é apreendida e o calor sobe', '; the piece is seized and the heat rises')) }))),
  ];
}
function cratePanel(s: GameState, m: Cus31, arg?: string): void {
  const x = m.crates[Number(arg)];
  if (!x) return;
  const c = x.c;
  let close = (): void => {};
  const run = (a: Act31): void => { const r = cargoAct31(s, c.id, a); close(); toast(T(r.text), r.ok ? 'good' : 'bad'); rerender(); };
  close = modal(T(c.n), h('div', { class: 'sc31-panel' }, ...crateRows(s, c),
    h('div', { class: 'row wrap' }, ACTS31.map((x2) => lockBtn31(T(x2.a === 'declare' && c.law !== 'legal' ? l('Declarar (sem nota: confisco)', 'Declare (no invoice: confiscation)') : x2.label), cargoLock31(s, c.id, x2.a), () => run(x2.a), { cls: x2.a === 'declare' ? 'btn small primary' : 'btn small' })))), { wide: true });
}
function inspectorPanel(s: GameState, m: Cus31): void {
  modal(T(l('Fiscal da alfândega', 'Customs inspector')), h('div', { class: 'sc31-panel' },
    h('p', null, h('b', null, m.inspector), ' — ', T(m.tool), '.'),
    h('p', null, T(m.strict)),
    h('p', { class: 'small muted' }, T(l('O rigor depende da época (do fiscal com lanterna ao scanner) e do país: onde a corrupção é maior, abre-se menos caixa — e aceita-se mais envelope.', 'Strictness depends on the era (from the inspector with a lamp to the scanner) and the country: where corruption is higher, fewer crates are opened — and more envelopes accepted.')))));
  void s;
}
function despPanel(s: GameState, m: Cus31): void {
  modal(T(l('Despachante', 'Customs broker')), h('div', { class: 'sc31-panel' },
    h('p', null, h('b', null, m.desp), ' — ', m.despKnown ? T(l('já trabalhou com você: cobra menos e erra menos.', 'has worked with you before: charges less and slips less.')) : T(l('ainda não te conhece: cobra a taxa cheia.', 'does not know you yet: charges the full fee.'))),
    h('p', { class: 'small' }, T(l('Ele leva a papelada e conversa com o fiscal: o risco de apreensão cai pela metade (mais, se ele te conhece). A taxa é uma parte pequena do valor da carga.', 'They handle the paperwork and talk to the inspector: the seizure risk halves (more, if they know you). The fee is a small share of the cargo value.')))));
  void s;
}
function boardPanel(s: GameState, m: Cus31): void {
  modal(T(m.port ? l('Quadro de navios', 'Ships board') : l('Painel de cargas', 'Cargo board')), h('div', { class: 'sc31-panel' },
    m.transit.length ? h('ul', null, m.transit.map((c) => h('li', { class: 'sc31-row' }, h('b', null, T(c.n)), ' · ', T(l('de {c}', 'from {c}'), { c: T(cityN31(c.from)) }), ' · ', T(l('chega em {n} semana(s)', 'arrives in {n} week(s)'), { n: Math.max(0, c.arrive - s.week) }))))
      : h('p', { class: 'muted' }, T(l('Nada a caminho.', 'Nothing on its way.'))),
    m.done.length ? h('div', null, h('p', { class: 'small' }, h('b', null, T(l('Resolvidas', 'Settled')))), h('ul', { class: 'small' }, m.done.map((c) => h('li', null, T(c.n), ' — ', T(c.res ?? l('', '')))))) : null,
    h('p', { class: 'small muted' }, T(l('Entram aqui as peças arrematadas em pregões fora do país e os lotes do leilão silencioso que estavam noutro país.', 'This is where pieces won at sales abroad and silent-auction lots that were in another country come in.')))));
}
function taxPanel(s: GameState, m: Cus31): void {
  modal(T(l('Tabela de impostos', 'Duty table')), h('div', { class: 'sc31-panel' },
    h('p', null, T(l('Imposto de importação desta época: {d}% do valor declarado.', 'Import duty in this era: {d}% of the declared value.'), { d: Math.round(m.duty * 100) })),
    h('p', { class: 'small muted' }, T(l('Até 1946, 20%; até 1980, 12%; até 2000, 8%; depois, 5%. Carga sem nota não tem como ser declarada: é confiscada com multa pequena.', 'Until 1946, 20%; until 1980, 12%; until 2000, 8%; after that, 5%. Cargo without an invoice cannot be declared: it is confiscated with a small fine.')))));
  void s;
}

// ---------------------------------------------------------------- vista

export function customs31View(s: GameState): HTMLElement {
  const m = customs31Model(s);
  return sceneView31(s, {
    id: 'customs', title: m.title, W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintScene(cv, s, m),
    panels: {
      door: () => runGo31({ area: 'airport31' }), inspector: () => inspectorPanel(s, m), desp: () => despPanel(s, m), board: () => boardPanel(s, m), tax: () => taxPanel(s, m),
      crate: (a?: string) => cratePanel(s, m, a),
    },
    list: () => h('div', null, m.on ? null : h('p', { class: 'muted' }, T(l('A alfândega real está desligada nesta partida (editor › interruptores).', 'Real customs is off in this game (editor › switches).'))),
      h('ul', null, m.crates.map((x, i) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => cratePanel(s, m, String(i)) }, T(x.c.n)), ' · ', $(x.c.v)))),
      moreBtn31(l('Quadro de cargas', 'Cargo board'), () => boardPanel(s, m))),
    note: m.crates.length ? l('Há carga parada no balcão: clique na caixa para decidir.', 'There is cargo held at the desk: click the crate to decide.') : undefined,
    intro: l('O balcão muda com a época: galpão do porto até 1946, depois o salão do aeroporto, com cão farejador, raio X e scanner. As caixas no chão são as suas cargas paradas.', 'The desk changes with the era: a port shed until 1946, then the airport hall, with a sniffer dog, X-ray and scanner. The crates on the floor are your held cargo.'),
    legend: h('p', { class: 'sc31-legend' }, h('span', null, h('b', null, T(m.strict))), ' · ', h('span', null, T(l('Selo verde: com nota. Vermelho: sem nota.', 'Green seal: with invoice. Red: no invoice.')))),
  });
}

registerArea({ id: 'customs31', label: l('Alfândega', 'Customs'), icon: 'globe', key: '',
  badge: (s) => { const n = customs31Model(s).crates.length; return n || undefined; },
  render: (s) => h('div', null, h('h2', null, T(customs31Model(s).title)), customs31View(s)) });

registerQuick31({
  id: 'q.customs31', verb: 'open', icon: 'globe', kinds: ['city'], passive: true, label: l('Alfândega (cargas paradas, imposto, despachante)', 'Customs (held cargo, duty, broker)'),
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'customs31' }),
});
