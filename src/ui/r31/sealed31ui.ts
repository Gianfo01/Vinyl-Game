// R31 · onda 4 (T2) — SALA DE ABERTURA DOS ENVELOPES em cena (DOM + pintura). O modelo (sealed31model) diz quem está
// na mesa; aqui se pinta a sala da época (cartório, sala de reuniões, transmissão ao vivo) e se abrem os painéis: o
// edital, a urna (entregar o envelope único e secreto, com o motivo do bloqueio — caixa, mínimo, antitruste), as pistas
// de quem você conhece, a abertura (envelopes um por um, do menor para o maior) e o arquivo para vender o seu catálogo.
// Toda ação chama o motor (sim/sys/sealed31: deliver31, sellCatalog31); a abertura em si acontece na virada do mês — a
// cena só revela a ata, envelope por envelope (o clique não muda o mundo).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { playerPerson } from '../../sim/sys/life';
import { leaderOf } from '../../sim/sys/leaders10';
import {
  antiWhy31, CAUSE31, catAnti31, deliver31, envLock31, sellable31, sellCatalog31, sellLock31, type Tender31,
} from '../../sim/sys/sealed31';
import type { GameState } from '../../sim/types';
import { $, modal, pill, rerender, toast } from '../common';
import { h, select } from '../dom';
import { avatarSprite, lookOf } from '../pixel/avatar';
import { drawText, fitText, textWidth } from '../pixel/font';
import { box, floor, screen, shelf, table, wall } from '../pixel/places/kit';
import { eraOf, paletteOf, type Palette } from '../pixel/palette';
import { C, INK, Px, discV, lv, tint } from '../pixel/px';
import { furniture } from '../pixel/sprites';
import { registerArea } from '../registry';
import { lockBtn31 } from './lock31';
import { registerQuick31 } from './quick31core';
import { blitPx31, moreBtn31, runGo31, sceneView31 } from './scene31';
import { ROOM_S31, sealed31Model, type Seal31 } from './sealed31model';

const ui = { id: '', opened: 0 };
/** Estado só de tela (qual edital e quantos envelopes já foram revelados) — exposto para as capturas. */
export const sealedUi31 = ui;
const T = (x: L, v?: Record<string, string | number>): string => t(x, v);
const short$ = (c: number): string => { const v = c / 100; return v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${Math.round(v / 1e3)}K` : `$${Math.round(v)}`; };

// ---------------------------------------------------------------- pintura

function paintRoom(p: Px, m: Seal31, pal: Palette): void {
  if (m.room === 'notary') { wall(p, pal, 0, 92, C('#3e4a3a'), 'wainscot'); floor(p, 92, pal.floors.office.a, pal.floors.office.b, 'boards'); }
  else if (m.room === 'board') { wall(p, pal, 0, 92, tint(pal.wall, -0.04), 'panel'); floor(p, 92, C('#4a5a6a'), C('#44546a'), 'carpet'); }
  else { wall(p, pal, 0, 92, C('#dfe3e8'), 'plain'); floor(p, 92, C('#9aa0a8'), C('#9298a2'), 'carpet'); }
  // porta de saída
  box(p, 5, 50, 18, 42, pal.woodDark, 0);
  p.rect(8, 53, 12, 39, lv(pal.woodDark, 2.2)); discV(p, 18, 72, 1, pal.gold, { ink: false });
  // relógio (cartório e reuniões) ou telão de transmissão
  if (m.room === 'stream') {
    screen(p, 110, 8, 100, 34, C('#101820'), C('#202630'), true);
    p.disc(120, 15, 2, C('#e03030'));
    drawText(p, fitText(T(l('AO VIVO', 'LIVE')), 40), 125, 13, C('#ffffff'));
    drawText(p, fitText(T(l('ABERTURA', 'OPENING')).toUpperCase(), 90), 116, 26, C('#80e0ff'));
  } else {
    p.disc(160, 22, 9, INK); p.disc(160, 22, 8, pal.gold); p.disc(160, 22, 7, C('#f4ecd8'));
    p.vline(160, 17, 22, INK); p.hline(160, 164, 22, INK);
    shelf(p, 214, 30, 40, 62, pal, 31);
  }
}

function paintEdital(p: Px, s: GameState, m: Seal31, pal: Palette): void {
  const x = 28, y = 12, w = 64, hh = 54;
  box(p, x, y, w, hh, m.room === 'notary' ? pal.woodDark : pal.metalDark, 0);
  p.rect(x + 3, y + 3, w - 6, hh - 6, C('#f2ead6'));
  p.disc(x + w / 2, y + 4, 1, C('#c03030'));
  drawText(p, fitText(T(l('EDITAL', 'NOTICE')), w - 10), x + 6, y + 7, C('#5a3a20'));
  p.hline(x + 5, x + w - 6, y + 14, C('#c8b890'));
  if (!m.t) { drawText(p, fitText(T(l('NENHUM', 'NONE')), w - 10), x + 6, y + 20, C('#8a7a60')); return; }
  const lines = [
    `${m.t.rels.length} MASTERS`,
    `${T(l('MIN', 'MIN'))} ${short$(m.t.ask)}`,
    m.done ? T(l('ABERTO', 'OPENED')) : `${Math.max(0, m.t.ends - s.week)} ${T(l('SEM', 'WK'))}`,
  ];
  lines.forEach((tx, i) => drawText(p, fitText(tx.toUpperCase(), w - 10), x + 6, y + 18 + i * 9, i === 2 ? C('#b02020') : C('#3a2a1a')));
}

function envelope(p: Px, x: number, y: number, open: boolean, win: boolean, dq: boolean, amt?: number, up = 0): void {
  const paper = dq ? C('#b8b0a0') : C('#efe4c8');
  if (win) { p.rect(x - 2, y - 2, 15, 11, C('#f0c040')); }
  p.rect(x - 1, y - 1, 13, 9, INK);
  p.rect(x, y, 11, 7, paper);
  if (open) {
    p.poly([[x, y], [x + 11, y], [x + 5, y - 3]], lv(paper, 4.2));
    p.line(x, y, x + 5, y - 3, INK); p.line(x + 11, y, x + 5, y - 3, INK);
    if (amt !== undefined) {
      const tx = short$(amt);
      const tw = textWidth(tx);
      const ly = y - 15 - up;
      p.vline(x + 5, ly + 8, y - 4, INK);
      p.rect(x + 5 - Math.round(tw / 2) - 3, ly - 1, tw + 6, 10, INK);
      p.rect(x + 5 - Math.round(tw / 2) - 2, ly, tw + 4, 8, win ? C('#f0c040') : C('#f4ecd8'));
      drawText(p, tx, x + 5 - Math.round(tw / 2), ly + 1, dq ? C('#8a8a8a') : C('#2a1a10'));
    }
    if (dq) p.line(x, y + 6, x + 10, y, C('#b02020'));
  } else {
    p.line(x, y, x + 5, y + 4, lv(paper, 1.6)); p.line(x + 10, y, x + 5, y + 4, lv(paper, 1.6));
    p.disc(x + 5, y + 4, 1, C('#b02020'));
  }
}

function paintScene(cv: HTMLCanvasElement, s: GameState, m: Seal31): void {
  const p = new Px(m.W, m.H);
  const pal = paletteOf(m.year);
  paintRoom(p, m, pal);
  paintEdital(p, s, m, pal);
  // arquivo de aço (vender o catálogo)
  box(p, 280, 44, 30, 52, m.room === 'notary' ? pal.woodDark : C('#7a808a'), 3);
  for (let i = 0; i < 4; i++) { p.hline(282, 307, 56 + i * 11, INK); p.rect(291, 50 + i * 11, 8, 2, pal.gold); }
  // tapete sob a mesa (cartório e sala de reuniões)
  if (m.room !== 'stream') {
    const rug = m.room === 'notary' ? C('#6a2a2a') : C('#3a4a6a');
    p.rect(72, 126, 216, 34, rug); p.rect(75, 129, 210, 28, lv(rug, 2.6)); p.rect(78, 132, 204, 22, rug);
    p.hline(72, 287, 159, lv(rug, 1.2));
  }
  // urna sobre um pedestal (no chão, à esquerda da frente)
  box(p, 40, 128, 18, 30, pal.woodDark, 3);
  box(p, 36, 112, 26, 16, m.room === 'stream' ? C('#c8d0d8') : pal.wood, 3);
  p.rect(44, 110, 10, 2, INK);
  // mesa comprida com feltro (a frente cobre as pernas de quem está sentado)
  const env = m.done ? m.env : [];
  const ctxPre = blitPx31(cv, p.d, m.W, m.H);
  if (!ctxPre) return;
  const ctx = ctxPre;
  const era = eraOf(m.year);
  const spr = (look: ReturnType<typeof lookOf>, role: Parameters<typeof avatarSprite>[1]['role'], x: number, y: number, dir: 'SE' | 'SW' | 'NE' | 'NW', pose: 'stand' | 'sit' = 'stand'): void => {
    const sp = avatarSprite(look, { year: m.year, role: role ?? null, pose, dir });
    if (pose === 'stand') { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(x - 6, y, 12, 2); }
    ctx.drawImage(sp.c, x - sp.ax, y - sp.ay + 1);
  };
  // gente atrás da mesa (cortada no tampo): representantes sentados e o leiloeiro de pé no centro
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, m.W, 106); ctx.clip();
  for (const x of m.seats) {
    const ch = furniture('chair', era, 'SE'); ctx.drawImage(ch.c, x.x - ch.ax, x.y + 14 - ch.ay);
    const lead = x.p.kind === 'label' ? leaderOf(s, x.p.who) : undefined;
    spr(lookOf(lead ? { id: `leader:${lead.id}` } : { id: `rep:${x.p.who}` }), null, x.x, x.y + 14, 'SE', 'sit');
  }
  spr(lookOf({ id: `notary-${s.config.homeCity}` }), null, 160, 112, 'SE');
  ctx.restore();
  // tampo e frente da mesa por cima
  const q = new Px(m.W, m.H);
  table(q, 76, 110, 208, 16, pal.woodDark, m.room === 'stream' ? C('#3a4a5a') : C('#2e5a3a'));
  // envelopes no tampo: abertos (ata) do menor para o maior; lacrados antes da abertura
  const n = Math.min(6, m.done ? env.length : m.sealedN);
  const shown = m.done && env.length > n ? [...env.slice(0, n - 1), env[env.length - 1]] : env; // muitos envelopes: o maior sempre aparece
  const gap = n ? Math.min(32, Math.floor(196 / n)) : 0;
  const x0 = 180 - Math.round((n * gap) / 2);
  for (let i = 0; i < n; i++) {
    const e = shown[i];
    const open = m.done && env.indexOf(e) < ui.opened;
    envelope(q, x0 + i * gap + Math.round((gap - 11) / 2), 102, open, open && !!e?.win, open && !!e?.dq, open ? e?.amt : undefined, i % 2 ? 10 : 0);
  }
  // martelo do leiloeiro
  q.rect(164, 100, 6, 3, C('#8a5028')); q.vline(167, 103, 105, C('#3a1e10'));
  ctx.drawImage(q.canvas(), 0, 0);
  // você, de pé na frente, com o seu envelope na mão (antes de entregar)
  const me = playerPerson(s);
  spr(lookOf(me ?? { id: 'player' }), me?.role ?? null, 150, 174, 'NE');
  if (m.t && !m.done && !m.mine && m.t.from !== 'player') { ctx.fillStyle = '#170e12'; ctx.fillRect(155, 150, 12, 9); ctx.fillStyle = '#efe4c8'; ctx.fillRect(156, 151, 10, 7); ctx.fillStyle = '#b02020'; ctx.fillRect(160, 154, 2, 2); }
}

// ---------------------------------------------------------------- painéis

function editalPanel(s: GameState, m: Seal31): void {
  const x = m.t;
  if (!x) { modal(T(l('Edital', 'Tender notice')), h('p', { class: 'muted' }, T(l('Nenhum edital aberto. Quando um selo quebra, alguém morre sem herdeiro com masters próprios, uma empresa é desmontada ou você põe o seu catálogo à venda, o edital aparece aqui.', 'No tender open. When a label goes bust, someone with their own masters dies without an heir, a company is dismantled or you put your catalog up for sale, the notice shows up here.')))); return; }
  modal(T(l('Edital · {n}', 'Tender notice · {n}'), { n: x.name }), h('div', { class: 'sc31-panel' },
    h('p', null, pill(T(CAUSE31[x.cause]), 'gold'), ' ', T(l('{k} master(s)', '{k} master(s)'), { k: x.rels.length })),
    h('ul', null,
      h('li', { class: 'sc31-row' }, T(l('Valor justo (rendimento × múltiplo da época)', 'Fair value (income × era multiple)')), ': ', h('b', null, $(x.fair))),
      h('li', { class: 'sc31-row' }, T(l('Mínimo do edital', 'Tender minimum')), ': ', h('b', null, $(x.ask))),
      h('li', { class: 'sc31-row' }, T(l('Abertura', 'Opening')), ': ', h('b', null, x.st === 'done' ? T(l('já aberta', 'already opened')) : T(l('semana {w} (em {n})', 'week {w} (in {n})'), { w: x.ends, n: Math.max(0, x.ends - s.week) })))),
    h('p', { class: 'small' }, T(l('Gravações', 'Recordings')), ': ', x.rels.slice(0, 8).map((id) => s.releases[id]?.title ?? '').filter(Boolean).join(' · ')),
    h('p', { class: 'small muted' }, T(l('Cada interessado entrega um envelope só. Na abertura, os envelopes são lidos do menor para o maior; o maior leva e paga o que escreveu.', 'Each bidder delivers a single envelope. At the opening, envelopes are read from lowest to highest; the highest takes it and pays what they wrote.')))));
}

function urnPanel(s: GameState, m: Seal31): void {
  const x = m.t;
  if (!x || m.done) return;
  let close = (): void => {};
  const an = catAnti31(s, x.rels);
  const inp = h('input', { type: 'number', min: String(Math.round(x.ask / 100)), step: '1', value: String(Math.round(Math.max(x.ask, x.fair * 0.9) / 100)), 'aria-label': T(l('Valor do envelope', 'Envelope amount')), style: 'width:10em' }) as HTMLInputElement;
  const lockNow = (): L | null => envLock31(s, x.id, Math.round(Number(inp.value) * 100));
  const btnBox = h('span');
  const draw = (): void => { btnBox.replaceChildren(lockBtn31(T(l('Lacrar e pôr na urna', 'Seal it and drop it in the urn')), lockNow(), () => {
    const e = deliver31(s, x.id, Math.round(Number(inp.value) * 100));
    close(); toast(T(e ?? l('Envelope na urna. Ninguém vê o valor até a abertura.', 'Envelope in the urn. Nobody sees the amount until the opening.')), e ? 'bad' : 'good'); rerender();
  }, { cls: 'btn small primary' })); };
  inp.addEventListener('input', draw);
  draw();
  close = modal(T(l('Urna · {n}', 'Urn · {n}'), { n: x.name }), h('div', { class: 'sc31-panel' },
    m.mine ? h('p', null, T(l('Seu envelope já está na urna: {v}. A proposta é única — não volta nem muda.', 'Your envelope is already in the urn: {v}. The bid is single — it does not come back or change.'), { v: $(m.mine) }))
      : h('div', null,
        h('p', null, T(l('Mínimo {m} · valor justo {f}', 'Minimum {m} · fair value {f}'), { m: $(x.ask), f: $(x.fair) })),
        an.blocked ? h('p', { class: 'small bad' }, T(antiWhy31(an))) : h('p', { class: 'small muted' }, T(l('Sua fatia do catálogo do mercado hoje: {p}%; depois, {q}% (teto do antitruste: 40%, desde 1950).', 'Your share of the market\'s catalog today: {p}%; afterwards, {q}% (antitrust cap: 40%, since 1950).'), { p: Math.round(an.before * 100), q: Math.round(an.after * 100) })),
        h('div', { class: 'row wrap' }, h('span', null, '$ ', inp), ' ', btnBox),
        h('p', { class: 'small muted' }, T(l('Uma proposta só, secreta. Se o caixa não cobrir no dia da abertura, o envelope é anulado.', 'One bid only, secret. If cash does not cover it on opening day, the envelope is voided.'))))));
}

function seatPanel(s: GameState, m: Seal31, arg?: string): void {
  const x = m.seats[Number(arg)];
  if (!x) return;
  const e = m.done ? m.env.find((y) => y.who === x.p.who) : undefined;
  modal(T(x.p.name), h('div', { class: 'sc31-panel' },
    e ? h('p', null, T(l('Envelope', 'Envelope')), ': ', h('b', null, ui.opened > m.env.indexOf(e) ? $(e.amt) : T(l('ainda lacrado', 'still sealed')))) : null,
    h('ul', null, (x.p.hints.length ? x.p.hints : [l('Representante na mesa.', 'A representative at the table.')]).map((y) => h('li', null, T(y)))),
    h('p', { class: 'small muted' }, T(l('O valor de cada envelope nunca aparece antes da abertura; quem você conhece melhor dá mais pistas.', 'No envelope amount ever shows before the opening; people you know better give more hints.')))));
}

function notaryPanel(s: GameState, m: Seal31): void {
  const x = m.t;
  if (!x) return;
  if (!m.done) {
    modal(T(l('Leiloeiro judicial', 'Court auctioneer')), h('div', { class: 'sc31-panel' },
      h('p', null, T(l('A abertura é na semana {w} (em {n}), na virada do mês. Até lá, os envelopes ficam lacrados na urna.', 'The opening is in week {w} ({n} from now), at the turn of the month. Until then, the envelopes stay sealed in the urn.'), { w: x.ends, n: Math.max(0, x.ends - s.week) })),
      h('p', null, T(l('Envelopes na urna até agora', 'Envelopes in the urn so far')), ': ', h('b', null, String(m.sealedN)))));
    return;
  }
  const box2 = h('div', { class: 'sc31-panel' });
  let close = (): void => {};
  const draw = (): void => {
    const rows = m.env.map((e, i) => h('li', { class: 'sc31-row' }, i < ui.opened
      ? [h('b', null, e.who === 'player' ? T(l('Você', 'You')) : e.name), ': ', $(e.amt), e.dq ? [' ', pill(T(e.dq === 'anti' ? l('anulado: antitruste', 'voided: antitrust') : l('anulado: caixa', 'voided: cash')), 'bad')] : e.win ? [' ', pill(T(l('vence', 'wins')), 'gold')] : null]
      : T(l('Envelope {i} — lacrado', 'Envelope {i} — sealed'), { i: i + 1 })));
    const all = ui.opened >= m.env.length;
    box2.replaceChildren(
      h('p', null, T(l('{c}. Os envelopes são lidos do menor para o maior.', '{c}. The envelopes are read from lowest to highest.'), { c: T(CAUSE31[x.cause]) })),
      m.env.length ? h('ol', null, rows) : h('p', { class: 'muted' }, T(l('Nenhum envelope chegou à mesa.', 'No envelope reached the table.'))),
      all ? h('p', null, x.win ? T(l('{w} leva os masters por {v}.', '{w} takes the masters for {v}.'), { w: x.win === 'player' ? T(l('Você', 'You')) : x.winName ?? '', v: $(x.price ?? 0) }) : T(l('Ninguém chegou ao mínimo.', 'Nobody reached the minimum.')))
        : h('button', { type: 'button', class: 'btn small primary', onclick: () => { ui.opened += 1; draw(); rerender(); } }, T(l('Abrir o próximo envelope', 'Open the next envelope'))));
  };
  draw();
  close = modal(T(l('Abertura · {n}', 'Opening · {n}'), { n: x.name }), box2, { wide: true });
  void close;
}

function sellPanel(s: GameState): void {
  const xs = sellable31(s).slice(0, 12);
  const pick = new Set<string>();
  let close = (): void => {};
  const btn = h('span');
  const draw = (): void => { btn.replaceChildren(lockBtn31(T(l('Abrir edital com {n} master(s)', 'Open a tender with {n} master(s)'), { n: pick.size }), sellLock31(s, [...pick]), () => {
    const e = sellCatalog31(s, [...pick]); close(); toast(T(e ?? l('Edital aberto: a abertura é em 8 semanas.', 'Tender opened: the opening is in 8 weeks.')), e ? 'bad' : 'good'); rerender();
  }, { cls: 'btn small primary' })); };
  draw();
  close = modal(T(l('Vender catálogo por envelope', 'Sell catalog by sealed bids')), h('div', { class: 'sc31-panel' },
    h('p', { class: 'small' }, T(l('Escolha masters seus (fora de penhor e de títulos). Rivais e fundos entregam envelopes; o maior leva e você recebe o valor dele. Sem envelope no mínimo, os masters ficam com você.', 'Pick masters of yours (not pledged or bonded). Rivals and funds deliver envelopes; the highest takes them and you get its amount. With no envelope at the minimum, the masters stay with you.'))),
    xs.length ? h('ul', null, xs.map((r) => h('li', null, h('label', null, h('input', { type: 'checkbox', onchange: (ev: Event) => { if ((ev.target as HTMLInputElement).checked) pick.add(r.id); else pick.delete(r.id); draw(); } }), ' ', r.title, ' ', h('span', { class: 'muted small' }, `(${r.year})`)))))
      : h('p', { class: 'muted' }, T(l('Nenhum master seu livre para vender.', 'No master of yours free to sell.'))),
    btn), { wide: true });
}

// ---------------------------------------------------------------- vista

export function sealed31View(s: GameState): HTMLElement {
  const m = sealed31Model(s, { id: ui.id || undefined });
  if (m.t && m.t.id !== ui.id) { ui.id = m.t.id; ui.opened = 0; }
  const host = h('div', { class: 'sc31-host' });
  const again = (): void => { if (host.isConnected) host.replaceWith(sealed31View(s)); };
  const tools = m.picks.length > 1 ? h('span', { class: 'sc31-pick' }, select(m.t?.id ?? '', m.picks.map((x: Tender31) => ({ value: x.id, label: `${x.name} · ${T(x.st === 'done' ? l('ata', 'minutes') : l('aberto', 'open'))}` })), (v) => { ui.id = v; ui.opened = 0; again(); }, { 'aria-label': T(l('Edital', 'Tender')) })) : undefined;
  host.appendChild(sceneView31(s, {
    id: 'sealed', title: m.title, W: m.W, H: m.H, spots: m.spots,
    paint: (cv) => paintScene(cv, s, m),
    panels: {
      door: () => runGo31({ area: 'business', tab: ['business', 'debt19'] }), edital: () => editalPanel(s, m), urn: () => urnPanel(s, m), table: () => editalPanel(s, m),
      notary: () => { notaryPanel(s, m); }, seat: (a?: string) => seatPanel(s, m, a), sell: () => sellPanel(s),
    },
    list: () => h('div', null, m.on ? null : h('p', { class: 'muted' }, T(l('A proposta fechada está desligada nesta partida (editor › interruptores).', 'Sealed bids are off in this game (editor › switches).'))),
      h('ul', null, m.picks.map((x) => h('li', null, h('button', { type: 'button', class: 'link', onclick: () => { ui.id = x.id; ui.opened = 0; again(); } }, x.name), ' · ', T(CAUSE31[x.cause]), ' · ', $(x.ask)))),
      moreBtn31(l('Vender catálogo por envelope', 'Sell catalog by sealed bids'), () => sellPanel(s))),
    tools,
    note: m.done ? l('Ata da abertura: clique no leiloeiro para abrir os envelopes um por um.', 'Opening minutes: click the auctioneer to open the envelopes one by one.') : m.t && !m.mine && m.t.from !== 'player' ? l('Edital aberto: a sua proposta vai na urna, lacrada.', 'Tender open: your bid goes in the urn, sealed.') : undefined,
    intro: l('Catálogos e masters vão a proposta fechada quando um dono quebra, morre sem herdeiro, vende o catálogo ou a empresa é desmontada. Cada um entrega um envelope só; na abertura, eles são lidos do menor para o maior.', 'Catalogs and masters go to sealed bids when an owner goes bust, dies without an heir, sells the catalog or a company is dismantled. Each bidder delivers one envelope; at the opening, they are read from lowest to highest.'),
    legend: h('p', { class: 'sc31-legend' }, h('span', null, h('b', null, T(ROOM_S31[m.room]))), ' · ', h('span', null, T(l('Lacre vermelho: envelope fechado. Dourado: o vencedor.', 'Red seal: closed envelope. Gold: the winner.')))),
  }));
  return host;
}

registerArea({ id: 'sealed31', label: l('Abertura dos envelopes', 'Envelope opening'), icon: 'bank', key: '',
  badge: (s) => { const m = sealed31Model(s); return m.t && !m.done && !m.mine && m.t.ends - s.week <= 2 ? 1 : undefined; },
  render: (s) => h('div', null, h('h2', null, T(l('Abertura dos envelopes', 'Envelope opening'))), sealed31View(s)) });

registerQuick31({
  id: 'q.sealed31', verb: 'open', icon: 'bank', kinds: ['city'], passive: true, label: l('Proposta fechada (catálogos e masters)', 'Sealed bids (catalogs and masters)'),
  applies: (s, tg) => tg.id === s.config.homeCity,
  dest: () => ({ area: 'sealed31' }),
});
