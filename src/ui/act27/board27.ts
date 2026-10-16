// r27 (P2B) — REUNIÃO DE DIRETORIA (interface). A sala em pixel art com os diretores sentados; uma carta por
// proposta: quem propõe e por quê (agenda pela função e traço), custo, quem apoia e quem se opõe, o que a equipe
// decidiria pelas regras de delegação (policy18). Aprovar / Vetar; "Decidir o resto pelas regras" fecha a pauta.
// Motor: src/sim/sys/board27.ts (puro).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  TRAIT27, agenda27, autoDecide27, board27, closeMeeting27, decide27, directors27, monthKey27, setBoard27, type Dir27, type Prop27,
} from '../../sim/sys/board27';
import type { GameState } from '../../sim/types';
import { $, modal, rerender } from '../common';
import { h } from '../dom';
import { card27, emptyState27, kpiRow27, statusChip27 } from '../ps/ui27';
import { store } from '../store';
import { occMark27 } from './flow27';
import { cutscene27 } from './mode27';
import { paintBoard27, seatX27, put27 } from './px27b';
import { drawScene27, type Who27 } from './scene27';
import './act27.css';
import './p2b27.css';
import { staffLoyalty } from '../../sim/opinion';
import { withCast31 } from '../r31/cast31'; // R31 onda 4 (W): pessoas reais com humor e "Pular cena"

function room(s: GameState, ds: Dir27[], speaker?: string): HTMLCanvasElement {
  const cv = h('canvas', { class: 'a27-scene', role: 'img', 'aria-label': t(l('Sala da diretoria', 'Boardroom')) }) as HTMLCanvasElement;
  const who: Who27[] = ds.map((d, i) => ({ p: { id: d.id, role: 'producer', born: s.year - 40 }, x: seatX27(i, ds.length), y: d.id === speaker ? 62 : 66, pose: d.id === speaker ? 'stand' : 'sit', dir: i < ds.length / 2 ? 'SE' : 'SW' }));
  drawScene27(cv, paintBoard27(s.year, ds.length), s.year, who);
  return cv;
}
const nameOf = (ds: Dir27[], id: string) => ds.find((d) => d.id === id)?.name ?? id;

export function openBoard27(onDone?: (played: boolean) => void): void {
  const s = store.game;
  if (!s) { onDone?.(false); return; }
  const B = board27(s);
  if (!B.on) setBoard27(s, true);
  const root = h('div', { class: 'a27 p2b-board' });
  const view = (flash?: { t: L; tone: string }) => {
    const ds = directors27(s);
    const props = agenda27(s);
    const mk = monthKey27(s);
    const dec = B.held[mk]?.dec ?? {};
    const next = props.find((p) => !dec[p.id]);
    if (!props.length) {
      put27(root, room(s, ds), emptyState27({ icon: 'people', title: l('Ninguém à mesa', 'Nobody at the table'), why: l('Contrate equipe (ou diretores de carreira) para que tragam propostas todo mês.', 'Hire staff (or career directors) so they bring proposals every month.') }),
        h('div', { class: 'row a27-actions' }, h('button', { class: 'btn', onclick: () => close() }, t(l('Fechar', 'Close')))));
      return;
    }
    put27(root, 
      room(s, ds, next?.by),
      kpiRow27([
        { label: l('Pauta do mês', 'This month\'s agenda'), value: `${Object.keys(dec).length}/${props.length}` },
        { label: l('Caixa', 'Cash'), value: $(s.player.cash), tone: s.player.cash < 0 ? 'bad' : 'neutral' },
        { label: l('Aprovadas / vetadas (total)', 'Approved / vetoed (total)'), value: `${B.n.yes} / ${B.n.no}` },
      ]),
      flash ? h('p', { class: `a27-event ${flash.tone}`, role: 'status' }, t(flash.t)) : null,
      h('div', { class: 'p2b-props' }, props.map((p) => propCard(s, p, ds, dec[p.id], (msg, tone) => view({ t: msg, tone })))),
      h('h4', null, t(l('Quem está à mesa', 'Who\'s at the table'))),
      h('ul', { class: 'p2b-list small' }, ds.map((d) => {
        const st = s.player.staff.find((m) => m.id === d.id);
        const loy = st ? Math.round(staffLoyalty(s, st.id)) : null;
        return h('li', null, h('b', null, d.name), ' · ', t(d.roleName), ' · ', t(TRAIT27[d.trait] ?? l(d.trait, d.trait)), loy !== null ? [' ', statusChip27(t(l('lealdade {v}', 'loyalty {v}'), { v: loy }), loy < 35 ? 'bad' : loy < 55 ? 'warn' : 'good')] : null);
      })),
      h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: B.on, onchange: () => { setBoard27(s, !B.on); view(); } }), ' ',
        t(l('Reunião mensal ligada (mês sem você à mesa = decidido pelas regras de delegação)', 'Monthly meeting on (a month without you = decided by the delegation rules)'))),
      h('div', { class: 'row a27-actions' },
        next ? h('button', { class: 'btn', onclick: () => { const res = closeMeeting27(s); cutscene27('board_meeting', { month: mk, n: res.length }); view({ t: l('O resto da pauta foi decidido pelas regras de delegação.', 'The rest of the agenda was decided by the delegation rules.'), tone: 'info' }); } }, t(l('Decidir o resto pelas regras', 'Decide the rest by the rules'))) : null,
        h('button', { class: 'btn primary', onclick: () => close() }, t(l('Encerrar reunião', 'Close the meeting')))),
    );
    (root.querySelector('.p2b-prop .btn.primary:not([disabled])') as HTMLElement | null)?.focus();
  };
  view();
  const close = modal(t(l('Reunião de diretoria', 'Board meeting')), withCast31(s, s.player.staff.map((x) => x.id), root, () => close()), { wide: true, onClose: () => { onDone?.(true); rerender(); } });
}

function propCard(s: GameState, p: Prop27, ds: Dir27[], done: 'yes' | 'no' | undefined, after: (t: L, tone: string) => void): HTMLElement {
  const auto = autoDecide27(s, p);
  const broke = p.cost > s.player.cash;
  return card27({ title: p.title, cls: `p2b-prop ${done ? 'done' : ''}`, tone: done === 'yes' ? 'good' : done === 'no' ? 'bad' : undefined },
    h('p', { class: 'small' }, t(p.agenda)),
    h('p', null, t(p.pitch)),
    h('div', { class: 'p2b-tags' },
      p.cost ? statusChip27(t(l('custo {v}', 'cost {v}'), { v: $(p.cost) }), broke ? 'bad' : 'neutral') : statusChip27(t(l('sem custo', 'no cost')), 'neutral'),
      p.backers.length ? statusChip27(t(l('apoiam: {n}', 'backing: {n}'), { n: p.backers.map((x) => nameOf(ds, x)).join(', ') }), 'good') : null,
      p.foes.length ? statusChip27(t(l('contra: {n}', 'against: {n}'), { n: p.foes.map((x) => nameOf(ds, x)).join(', ') }), 'bad') : null,
      statusChip27(t(l('regras: {w}', 'rules: {w}'), { w: t(auto.why) }), auto.yes ? 'info' : 'warn')),
    done
      ? h('p', { class: done === 'yes' ? 'good' : 'bad' }, done === 'yes' ? t(l('Aprovada.', 'Approved.')) : t(l('Vetada.', 'Vetoed.')))
      : h('div', { class: 'row' },
          h('button', { class: 'btn primary small', disabled: broke, onclick: () => { const r = decide27(s, p.id, true); after(r, 'good'); } }, t(l('Aprovar', 'Approve'))),
          h('button', { class: 'btn small', onclick: () => { const r = decide27(s, p.id, false); after(r, 'bad'); } }, t(l('Vetar', 'Veto')))));
}

/** Seção da reunião (aba Políticas / Cockpit). */
export function boardSection27(s: GameState): HTMLElement | null {
  const props = agenda27(s);
  const B = (s.x4 as unknown as { board27?: { on: boolean; held: Record<string, { dec: Record<string, string> }> } }).board27;
  const dec = B?.held[monthKey27(s)]?.dec ?? {};
  const pend = props.filter((p) => !dec[p.id]).length;
  if (!props.length) return null;
  return card27({ title: l('Reunião de diretoria', 'Board meeting'), icon: 'people' },
    h('p', { class: 'small' }, pend
      ? t(l('{n} proposta(s) na pauta deste mês ({w}).', '{n} proposal(s) on this month\'s agenda ({w}).'), { n: pend, w: props.map((p) => t(p.title)).slice(0, 2).join('; ') })
      : t(l('Pauta do mês decidida.', 'This month\'s agenda is decided.'))),
    B?.on ? null : h('p', { class: 'small muted' }, t(l('Desligada: o jogo segue como sempre até você se sentar à mesa pela primeira vez.', 'Off: the game runs as always until you first sit at the table.'))),
    // r27 (FLOW2): a reunião chega como cartão no Avançar (Jogar / Resolver rápido) — aqui, o marcador e a chave liga/desliga
    h('div', { class: 'row wrap' },
      pend ? occMark27(s, { src: 'board', key: `board:${monthKey27(s)}`, data: { n: pend, on: !!B?.on } }) ?? h('small', { class: 'muted' }, t(l('No rápido: a pauta é decidida pelas regras de delegação.', 'Quick: the agenda is decided by the delegation rules.'))) : null,
      B?.on ? h('button', { class: 'btn small ghost', onclick: () => { const g = store.game; if (g) setBoard27(g, false); rerender(); } }, t(l('Desligar a reunião mensal', 'Turn off the monthly meeting'))) : null));
}
export const boardPending27 = (s: GameState): number => { const B = (s.x4 as unknown as { board27?: { on: boolean; held: Record<string, { dec: Record<string, string> }> } }).board27; if (!B?.on) return 0; const dec = B.held[monthKey27(s)]?.dec ?? {}; return agenda27(s).filter((p) => !dec[p.id]).length; };

