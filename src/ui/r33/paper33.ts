// R33 · FICHAS33 — PAPEL COMUM das janelas (paperSheet33). Substitui o modal marrom arredondado: a janela abre como
// PAPEL por cima da cena (na casca nova, entre a barra de cima e a doca; sem a casca, em tela cheia), com plaqueta de
// título em fonte de pixel (Silkscreen) e subtítulo, "+ fixar no bolso" (quando há objeto dono), "Esc fechar",
// MARCADORES no alto no lugar das abas (com o número de assuntos) e TODAS as ações no CARTÃO DE AÇÕES numerado — o
// mesmo componente do cartão do Mural/Mesa (EXP-13: classes .ac5, botão com trava e motivo lockBtn31).
// Só apresentação: quem chama entrega o conteúdo e as ações (as funções de hoje); nada aqui escreve no jogo.
// Compatibilidade: o fundo continua sendo `.overlay` (fila de avisos, tutorial, teclas da casca e quem fecha janelas
// procuram por ela) e o miolo continua `.modal-body`.

import './paper33.css';
import { l, type L } from '../../data/world';
import { S, t } from '../../i18n/strings';
import type { Lock31 } from '../../sim/r31/lock';
import { h } from '../dom';
import { lockBtn31 } from '../r31/lock31';

/** Um marcador do papel (as abas de antes). `count` = número de assuntos. */
export interface Mark33 { id: string; label: string; count?: number; render: () => HTMLElement | null }
/** Uma linha do cartão de ações. `panel` abre um quadro dentro do próprio cartão (ex.: "Mais ações ▸"). */
export interface Row33 { id?: string; label: string; lock?: Lock31 | L | null; run?: () => void; panel?: () => HTMLElement | null; open?: boolean; primary?: boolean }
export interface Num33 { label: string; value: string | Node }
export interface Card33 { title: string; nums?: Num33[]; rows: Row33[]; note?: string }
export interface Sheet33 {
  /** plaqueta: "PASTA DO ARTISTA", "OFERTA: LUIZ GONZAGA"… */
  plate: string;
  /** subtítulo da plaqueta: "ARQUIVO DE AÇO · LUIZ GONZAGA · 1962" */
  sub?: string;
  /** nome do diálogo para leitor de tela (padrão: a plaqueta) */
  label?: string;
  marks?: Mark33[];
  mark?: string;
  /** conteúdo fixo (janela comum sem marcadores) */
  body?: HTMLElement;
  /** papel dentro de uma pasta manila; o texto vai na orelha da pasta */
  folder?: string;
  /** cartão de ações (refeito a cada redesenho) */
  card?: () => Card33 | null;
  /** objeto da casca cujo bolso o papel usa ("+ fixar no bolso") */
  pin?: string;
  /** papel grande (fichas): ocupa a mesa toda */
  big?: boolean;
  wide?: boolean;
  onClose?: () => void;
}
export interface Open33 { close: () => void; redraw: () => void; go: (mark: string) => void; el: HTMLElement }

/** Barras de ação das janelas antigas: os botões delas vão para o cartão (a linha clica o MESMO botão). */
export const ACTION_BARS33 = ['.actions', '.a27-actions'];
const txt33 = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Colhe os botões das barras de ação do miolo (esconde os originais; o cartão os espelha). */
function harvestBars33(body: HTMLElement): Row33[] {
  const sel = ACTION_BARS33.flatMap((b) => [`${b} > button`, `${b} > .lk31 > button`]).join(', ');
  const bs = [...body.querySelectorAll<HTMLButtonElement>(sel)].filter((b) => b.closest('.pp33-body') === body && txt33(b));
  return bs.map((b, i) => {
    const wrap = b.parentElement?.classList.contains('lk31') ? b.parentElement : null;
    (wrap ?? b).classList.add('pp33-moved');
    const why = wrap?.querySelector('.lk31-why > span:not(.lk31-cond)');
    const cond = wrap?.querySelector('.lk31-cond');
    const t0 = (b.getAttribute('title') ?? '').replace(/^\S*🔒\S*\s*/u, '');
    const lock: Lock31 | L | null = !b.disabled ? null
      : why ? { why: l(txt33(why), txt33(why)), unlock: l(txt33(cond ?? why).replace(/^→\s*/, ''), txt33(cond ?? why).replace(/^→\s*/, '')) }
        : l(t0 || t(l('Indisponível agora.', 'Unavailable now.')), t0 || t(l('Indisponível agora.', 'Unavailable now.')));
    return { id: `bar${i}`, label: txt33(b), lock, primary: b.classList.contains('primary'), run: () => { if (b.isConnected && !b.disabled) b.click(); } };
  });
}

/** Bolso da casca (ligado por fichas33, que conhece a casca; sem casca, nada). */
export const POCKET33: { has?: (obj: string) => boolean; toggle?: (obj: string) => L | undefined; on?: () => boolean } = {};

const typing = (e: Event): boolean => {
  const tg = e.target as HTMLElement | null;
  return !!tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT' || tg.isContentEditable);
};

/** O cartão de ações (mesmas classes do cartão EXP-13). */
export function card33(c: Card33, panelHost?: { cur?: string; redraw?: () => void }): HTMLElement {
  const host = panelHost ?? {};
  const panelOf = (r: Row33, i: number) => (host.cur === (r.id ?? String(i)) && r.panel ? r.panel() : null);
  return h('aside', { class: 'ac5 ac5-in33', role: 'region', 'aria-label': `${t(l('Ações', 'Actions'))} — ${c.title}` },
    h('header', { class: 'ac5-h' }, h('b', null, c.title)),
    c.nums?.length ? h('ul', { class: 'ac5-nums', 'aria-label': t(l('Números', 'Numbers')) }, c.nums.map((n) => h('li', null, h('span', null, n.label), h('b', null, n.value)))) : null,
    h('div', { class: 'ac5-acts' }, c.rows.map((r, i) => {
      const id = r.id ?? String(i);
      const label = h('span', { class: 'ac5-al' }, h('kbd', { class: 'ac5-n' }, String(i + 1)), h('span', null, r.label), r.open || r.panel ? ' ▸' : null);
      const btn = lockBtn31(label, r.lock ?? null, () => {
        if (r.panel) { host.cur = host.cur === id ? undefined : id; host.redraw?.(); return; }
        r.run?.();
      }, { cls: `ac5-a${r.primary ? ' pp33-pri' : ''}${r.open ? ' k-open' : ''}`, attrs: { 'data-row33': id, 'aria-expanded': r.panel ? (host.cur === id ? 'true' : 'false') : undefined } });
      const p = panelOf(r, i);
      return p ? h('div', { class: 'pp33-rowp' }, btn, h('div', { class: 'pp33-panel' }, p)) : btn;
    })),
    c.note ? h('p', { class: 'ac5-t pp33-note' }, c.note) : null);
}

/** Abre o papel. Devolve fechar/redesenhar/ir para um marcador. */
export function paperSheet33(o: Sheet33): Open33 {
  const prev = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
  let cur = o.marks?.find((m) => m.id === o.mark)?.id ?? o.marks?.[0]?.id;
  const panel: { cur?: string; redraw?: () => void } = {};
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    back.remove();
    document.removeEventListener('keydown', onKey);
    o.onClose?.();
    prev?.focus?.();
  };
  const top = () => [...document.querySelectorAll('.overlay')].pop() === back;
  const onKey = (e: KeyboardEvent) => {
    if (!back.isConnected) { document.removeEventListener('keydown', onKey); return; }
    if (!top()) return; // outra janela por cima: a tecla é dela
    if (e.key === 'Escape') { close(); e.preventDefault(); return; } // QA5: a casca nova não abre a pausa com o mesmo Esc
    if (typing(e) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[1-9]$/.test(e.key) && !e.defaultPrevented && cardBox.isConnected && !cardBox.hidden) {
      const b = cardBox.querySelectorAll<HTMLButtonElement>('.ac5-a')[Number(e.key) - 1];
      if (b && !b.disabled) { e.preventDefault(); b.click(); }
      return;
    }
    if ((e.key === '[' || e.key === ']') && o.marks && o.marks.length > 1) {
      const i = o.marks.findIndex((m) => m.id === cur);
      go(o.marks[(i + (e.key === ']' ? 1 : -1) + o.marks.length) % o.marks.length].id);
      e.preventDefault();
    }
  };

  // ---- cabeçalho: plaqueta, marcadores, bolso e fechar
  const plate = h('div', { class: 'pp33-plate' }, h('b', { class: 'pp33-pt' }, o.plate), o.sub ? h('small', { class: 'pp33-ps' }, o.sub) : null);
  const marks = h('nav', { class: 'pp33-mks', role: 'tablist', 'aria-label': t(l('Marcadores', 'Markers')) });
  const pinBtn = o.pin && POCKET33.on?.() ? h('button', { type: 'button', class: 'pp33-pin' }) : null;
  const drawPin = () => {
    if (!pinBtn || !o.pin) return;
    const on = !!POCKET33.has?.(o.pin);
    pinBtn.classList.toggle('on', on);
    pinBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    pinBtn.title = t(on ? l('Tirar do bolso', 'Remove from pocket') : l('Fixar no bolso (abre direto pela tecla)', 'Pin to the pocket (opens straight from the key)'));
    pinBtn.textContent = on ? t(l('no bolso', 'in pocket')) : `+ ${t(l('fixar no bolso', 'pin to pocket'))}`;
  };
  pinBtn?.addEventListener('click', () => { const why = POCKET33.toggle?.(o.pin!); if (why) pinBtn.title = t(why); drawPin(); });
  drawPin();
  const head = h('header', { class: 'pp33-hd' },
    h('div', { class: 'pp33-hl' }, plate, marks),
    h('span', { class: 'pp33-sp' }),
    pinBtn,
    h('button', { type: 'button', class: 'pp33-x', 'aria-label': t(S.close), onclick: close }, h('kbd', null, 'Esc'), ' ', t(l('fechar', 'close'))));

  // ---- miolo: papel (ou pasta) + cartão
  const body = h('div', { class: 'modal-body pp33-body', tabindex: '-1' });
  const paper = h('div', { class: 'pp33-paper' }, body);
  const sheetBox = o.folder
    ? h('div', { class: 'pp33-folder' }, h('div', { class: 'pp33-ftab' }, o.folder), h('div', { class: 'pp33-fin' }, paper))
    : paper;
  const cardBox = h('div', { class: 'pp33-cardcol' });
  const main = h('div', { class: 'pp33-main' }, sheetBox, cardBox);
  const sheet = h('section', { class: `pp33${o.big ? ' big' : ''}${o.wide ? ' wide' : ''}${o.folder ? ' has-folder' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': o.label ?? o.plate }, head, main);
  const desk = h('div', { class: `pp33-desk${o.big ? '' : ' dim'}` }, sheet);
  const back = h('div', { class: 'overlay pp33-back' }, desk);
  back.addEventListener('click', (e) => { if (e.target === back || e.target === desk) close(); });

  const drawMarks = () => {
    marks.hidden = !o.marks || o.marks.length < 2;
    marks.replaceChildren(...(o.marks ?? []).map((m) => h('button', { type: 'button', role: 'tab', class: `pp33-mk${m.id === cur ? ' on' : ''}`, 'aria-selected': m.id === cur ? 'true' : 'false', 'data-mark33': m.id, onclick: () => go(m.id) },
      m.label, m.count !== undefined ? h('small', null, String(m.count)) : null)));
  };
  const drawBody = () => {
    const m = o.marks?.find((x) => x.id === cur);
    let el: HTMLElement | null = null;
    try { el = m ? m.render() : o.body ?? null; } catch (err) { console.error('[paper33]', m?.id, err); el = h('p', { class: 'muted' }, '—'); }
    body.replaceChildren(el ?? h('p', { class: 'muted' }, '—'));
  };
  const drawCard = () => {
    const bars = o.card ? [] : harvestBars33(body);
    const c = o.card?.() ?? (bars.length ? { title: o.plate, rows: bars } : null);
    cardBox.hidden = !c;
    sheet.classList.toggle('has-card', !!c);
    cardBox.replaceChildren(...(c ? [card33(c, panel)] : []));
  };
  panel.redraw = drawCard;
  const go = (id: string) => { cur = id; drawMarks(); drawBody(); body.scrollTop = 0; };
  const redraw = () => { if (closed) return; drawMarks(); drawBody(); drawCard(); drawPin(); };
  redraw();
  // janela comum: a tela muda sozinha (passos, takes, respostas) — o cartão acompanha os botões da barra de ações
  if (!o.card && typeof MutationObserver !== 'undefined') {
    let queued = false;
    const mo = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => { queued = false; if (!back.isConnected) { mo.disconnect(); return; } drawCard(); });
    });
    mo.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  }
  document.body.appendChild(back);
  document.addEventListener('keydown', onKey);
  (sheet.querySelector<HTMLElement>('.pp33-body button, .pp33-body input, .pp33-body select, .ac5-a:not([disabled])') ?? sheet.querySelector<HTMLElement>('.pp33-x'))?.focus();
  return { close, redraw, go, el: back };
}
