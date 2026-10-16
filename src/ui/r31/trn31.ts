// R31 · onda 5 (TRN, EXP-11) — TRANSIÇÕES ENTRE TELAS: a camada de tela e a API.
//
// API pequena para a navegação de hoje e a nova da onda 5:
//   transition31(kind, info, swap?)  → anima (true) ou não (false: desligada / movimento reduzido); `swap` troca a tela
//                                      por baixo no meio (cortina fechada, zoom cheio) e roda sempre exatamente uma vez;
//   trnGate31(nav, swap)             → o portão do desenho da página (app.ts): decide viagem / objeto / fechar;
//   skipTrn31()                      → pula; qualquer tecla ou clique também pula;
//   trnBack31()                      → a página aberta pelo zoom de um objeto da sede? (Esc volta descendo o papel)
//   trnMap31.at(cityId)              → posição na tela da cidade no mapa-múndi (o mapa preenche), para a rota.
// Modelo puro: trn31model.ts; relógio: trn31core.ts; pintura: trn31px.ts. Interruptor `exp5.trn` + modo nas Opções.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { TRN_MODES31, trnMode31, trnOn31, type TrnMode31 } from '../../sim/r31/exp5trn';
import { setSwUi } from '../../sim/r31/switches';
import { h, select } from '../dom';
import { C, Px } from '../pixel/px';
import { store } from '../store';
import { TrnCtl31, type TrnEnv31, type TrnRun31, type TrnView31 } from './trn31core';
import { calendarOf31, curtainOf31, monthShort31, ticketLine31, type TrnInfo31, type TrnKind31, type TrnPhase31, type TrnPlace31 } from './trn31model';
import { calBox31, cardBox31, paintCalendar31, paintCard31, paintCurtain31, paintRoute31, paintTicket31, placeIcon31, ticketBox31, type Box31 } from './trn31px';
import './trn31.css';

const lang = (): 'pt' | 'en' => (store.prefs.lang === 'en' ? 'en' : 'pt');
const reduced = (): boolean => {
  try { return !!store.prefs.reducedMotion || document.documentElement.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};
const live = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.body;

/** Posição (tela) de uma cidade no mapa-múndi aberto, para a rota da viagem (o mapa preenche). */
export const trnMap31: { at?: (cityId: string) => { x: number; y: number } | null } = {};

// ---------------------------------------------------------------- a tela (overlay)

const DIM = C('#06080e', 158);
const ease = (p: number) => p * p * (3 - 2 * p);
const easeIn = (p: number) => p * p;
const easeOut = (p: number) => 1 - (1 - p) * (1 - p);

interface Live { el: HTMLElement; cv?: HTMLCanvasElement; ctx?: CanvasRenderingContext2D | null; px?: Px; img?: ImageData; S: number; txt?: HTMLElement; card?: HTMLElement; main?: HTMLElement | null; zoom?: { src: HTMLCanvasElement; from: DOMRect | { x: number; y: number; width: number; height: number } } }
let cur: Live | null = null;

function scaleOf(): number { return window.innerWidth >= 900 ? 3 : 2; }

function makeCanvas(L: Live): void {
  const S = L.S;
  const W = Math.ceil(window.innerWidth / S), H = Math.ceil(window.innerHeight / S);
  const cv = h('canvas', { class: 'trn31-cv', width: W, height: H, 'aria-hidden': 'true' }) as HTMLCanvasElement;
  cv.style.width = `${W * S}px`; cv.style.height = `${H * S}px`;
  L.cv = cv; L.ctx = cv.getContext('2d'); L.px = new Px(W, H);
  L.img = L.ctx ? L.ctx.createImageData(W, H) : undefined;
  L.el.append(cv);
}
function flush(L: Live): void {
  if (!L.ctx || !L.img || !L.px) return;
  new Uint32Array(L.img.data.buffer).set(L.px.d);
  L.ctx.putImageData(L.img, 0, 0);
}
const at = (b: Box31, S: number) => `left:${b.x * S}px;top:${b.y * S}px;width:${b.w * S}px;height:${b.h * S}px`;

/** Texto em HTML por cima da moldura em pixel (acentos e as duas línguas). */
function cardText(L: Live, r: TrnRun31): void {
  const c = r.info.card;
  if (!c || !L.px) return;
  const b = cardBox31(L.px.w, L.px.h);
  const mat = curtainOf31(r.info.year);
  L.card = h('div', { class: `trn31-card m-${mat}`, style: at(b, L.S), role: 'status' },
    h('b', { class: 'trn31-t' }, t(c.title)), h('span', { class: 'trn31-w' }, t(c.where)), h('small', { class: 'trn31-l' }, t(c.line)));
  L.card.style.paddingLeft = `${64 * L.S}px`;
  L.card.hidden = true;
  L.el.append(L.card);
}
function ticketText(L: Live, r: TrnRun31): void {
  const k = r.info.ticket;
  if (!k || !L.px) return;
  const b = ticketBox31(L.px.w, L.px.h);
  L.card = h('div', { class: 'trn31-ticket', style: at(b, L.S), role: 'status' },
    h('span', { class: 'trn31-th' }, t(l('PASSAGEM', 'TICKET'))),
    h('b', { class: 'trn31-tr' }, k.from), h('b', { class: 'trn31-tr' }, `→ ${k.to}`),
    h('small', { class: 'trn31-tl' }, t(ticketLine31(k))));
  L.card.style.paddingRight = `${Math.round(b.w * 0.3) * L.S}px`;
  L.card.hidden = true;
  L.el.append(L.card);
}
function monthText(L: Live, r: TrnRun31): void {
  const m = r.info.month;
  if (!m || !L.px) return;
  const b = calBox31(calendarOf31(r.info.year), L.px.w, L.px.h);
  L.card = h('ul', { class: 'trn31-chips', style: `left:0;right:0;top:${(b.y + b.h + 12) * L.S}px`, role: 'status', 'aria-label': t(l('O que pede você neste mês', 'What needs you this month')) },
    m.items.length ? m.items.map((x) => h('li', null, t(x))) : h('li', { class: 'none' }, t(l('Nada urgente pede você', 'Nothing urgent needs you'))));
  L.card.hidden = true;
  L.el.append(L.card);
}

/** Cidades da rota em px do buffer (posição real no mapa quando ele está na tela). */
function routeEnds(r: TrnRun31, L: Live): { a: [number, number]; b: [number, number]; onMap: boolean } {
  const W = L.px!.w, H = L.px!.h, S = L.S;
  const k = r.info.ticket!;
  const A = trnMap31.at?.(k.fromId) ?? null, B = trnMap31.at?.(k.toId) ?? null;
  const inside = (p: { x: number; y: number } | null) => !!p && p.x > 8 && p.y > 8 && p.x < window.innerWidth - 8 && p.y < window.innerHeight - 8;
  if (A && B && inside(A) && inside(B) && Math.hypot(A.x - B.x, A.y - B.y) > 24) return { a: [A.x / S, A.y / S], b: [B.x / S, B.y / S], onMap: true };
  const left = Math.round(W * 0.27), right = Math.round(W * 0.73);
  return { a: [left, Math.round(H * 0.56)], b: [right, Math.round(H * 0.46)], onMap: false };
}

const view: TrnView31 = {
  begin(r) {
    cur?.el.remove();
    const el = h('div', { class: `trn31 k-${r.kind}`, 'data-trn': r.kind, title: t(l('Clique ou tecle para pular', 'Click or press a key to skip')) });
    const L: Live = { el, S: scaleOf() };
    cur = L;
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); ctl.skip(); });
    if (r.kind === 'close') {
      L.main = document.getElementById('main');
      el.classList.add('ghost');
    } else if (r.kind === 'open') {
      const src = sedeCanvas();
      const rc = r.info.rect;
      if (src && rc) { L.zoom = { src, from: { x: rc.x, y: rc.y, width: rc.w, height: rc.h } }; }
      const cv = h('canvas', { class: 'trn31-zoom', width: window.innerWidth, height: window.innerHeight, 'aria-hidden': 'true' }) as HTMLCanvasElement;
      L.cv = cv; L.ctx = cv.getContext('2d');
      el.append(cv);
    } else {
      makeCanvas(L);
      if (r.kind === 'travel') cardText(L, r);
      if (r.kind === 'trip') {
        ticketText(L, r);
        const e = routeEnds(r, L);
        const k = r.info.ticket!;
        L.txt = h('div', { class: 'trn31-route' },
          h('span', { style: `left:${e.a[0] * L.S}px;top:${(e.a[1] + 6) * L.S}px` }, k.from),
          h('span', { style: `left:${e.b[0] * L.S}px;top:${(e.b[1] + 6) * L.S}px` }, k.to));
        if (!e.onMap) el.classList.add('dim');
        el.append(L.txt);
      }
      if (r.kind === 'month') monthText(L, r);
    }
    document.body.append(el);
    this.frame(r, r.kind === 'month' ? 'fall' : r.kind === 'trip' ? 'route' : r.kind === 'open' ? 'zoom' : r.kind === 'close' ? 'drop' : 'close', 0, 0);
  },
  frame(r, ph, p, ms) {
    const L = cur;
    if (!L) return;
    if (r.kind === 'close') {
      if (L.main?.isConnected) { L.main.style.transform = `translateY(${Math.round(easeIn(p) * 70)}vh)`; L.main.style.opacity = String(1 - p * 0.8); }
      return;
    }
    if (r.kind === 'open') return zoomFrame(L, ph, p);
    const px = L.px!;
    px.d.fill(0);
    const mat = curtainOf31(r.info.year);
    let card = false;
    if (r.kind === 'travel') {
      const open = ph === 'close' ? 1 - easeOut(p) : ph === 'card' ? 0 : easeIn(p);
      paintCurtain31(px, mat, open, ms);
      card = ph === 'card' || (ph === 'close' && p > 0.7) || (ph === 'open' && p < 0.35);
      if (card && r.info.card) paintCard31(px, cardBox31(px.w, px.h), mat, placeIcon31(r.info.card.place));
    } else if (r.kind === 'trip') {
      const e = routeEnds(r, L);
      const k = r.info.ticket!;
      if (ph === 'route' || ph === 'close') paintRoute31(px, e.a, e.b, ph === 'route' ? ease(p) : 1, k.vehicle);
      if (L.txt) L.txt.hidden = ph !== 'route';
      if (ph !== 'route') {
        const open = ph === 'close' ? 1 - easeOut(p) : ph === 'ticket' ? 0 : easeIn(p);
        paintCurtain31(px, mat, open, ms);
        card = ph === 'ticket' || (ph === 'close' && p > 0.75) || (ph === 'open' && p < 0.3);
        if (card) paintTicket31(px, ticketBox31(px.w, px.h), k.vehicle, lang() === 'en' ? 'BOARDING' : 'EMBARQUE');
      }
    } else if (r.kind === 'month') {
      const m = r.info.month!;
      const cal = calendarOf31(r.info.year);
      px.rect(0, 0, px.w, px.h, DIM); // fundo escurecido (como no mock)
      const face = (x: [number, number]) => ({ mon: monthShort31(x[0], lang()), year: String(x[1]) });
      paintCalendar31(px, cal, calBox31(cal, px.w, px.h), face(m.old), face(m.now), ph === 'fall' ? p : 1);
      card = ph !== 'fall';
      L.el.style.opacity = ph === 'fade' ? String(1 - p) : '1';
    }
    if (L.card) L.card.hidden = !card;
    flush(L);
  },
  end(r, skipped) {
    const L = cur;
    cur = null;
    if (L?.main) { L.main.style.transform = ''; L.main.style.opacity = ''; }
    L?.el.remove();
    if (r.kind === 'open' && !skipped) riseDone();
  },
};

function sedeCanvas(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>('.sede25 canvas.hq27-cv') ?? document.querySelector<HTMLCanvasElement>('.sede25 canvas');
}

/** Zoom em pixel: recorta a cena da sede em volta do objeto e amplia sem suavizar; depois o papel (a página) sobe. */
function zoomFrame(L: Live, ph: TrnPhase31, p: number): void {
  const ctx = L.ctx;
  const vw = window.innerWidth, vh = window.innerHeight;
  if (ph === 'rise') {
    L.el.style.opacity = String(1 - easeOut(p));
    const main = document.getElementById('main');
    if (main) { main.style.transform = `translateY(${Math.round((1 - easeOut(p)) * 45)}vh)`; main.style.opacity = String(0.4 + 0.6 * p); L.main = main; }
    return;
  }
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = `rgba(6,8,14,${0.35 * p})`;
  const z = L.zoom;
  if (!z) { ctx.clearRect(0, 0, vw, vh); ctx.fillRect(0, 0, vw, vh); return; }
  const sr = z.src.getBoundingClientRect();
  const f = z.from;
  // região alvo com a proporção da tela, centrada no objeto
  const k = Math.max(f.width / vw, f.height / vh, 0.18);
  const cw = vw * k, ch = vh * k;
  const cx = Math.max(sr.left, Math.min(sr.right - cw, f.x + f.width / 2 - cw / 2));
  const cy = Math.max(sr.top, Math.min(sr.bottom - ch, f.y + f.height / 2 - ch / 2));
  const e = ease(p);
  // de onde está (cx,cy,cw,ch) até a tela inteira
  const dx = cx * (1 - e), dy = cy * (1 - e), dw = cw + (vw - cw) * e, dh = ch + (vh - ch) * e;
  const sx = ((cx - sr.left) / sr.width) * z.src.width, sy = ((cy - sr.top) / sr.height) * z.src.height;
  const sw = (cw / sr.width) * z.src.width, sh = (ch / sr.height) * z.src.height;
  ctx.clearRect(0, 0, vw, vh);
  ctx.fillRect(0, 0, vw, vh);
  try { ctx.drawImage(z.src, sx, sy, sw, sh, dx, dy, dw, dh); } catch { /* canvas sumiu */ }
}
function riseDone(): void {
  const main = document.getElementById('main');
  if (main) { main.style.transform = ''; main.style.opacity = ''; }
}

const env: TrnEnv31 = {
  on: trnOn31,
  mode: trnMode31,
  reduced,
  live,
  now: () => performance.now(),
  frame: (cb) => { requestAnimationFrame(() => cb()); },
  later: (cb, ms) => { window.setTimeout(cb, ms); },
};
export const ctl = new TrnCtl31(env, view);

/** Começa uma transição (ver o topo do arquivo). */
export function transition31(kind: TrnKind31, info: TrnInfo31, swap?: () => void): boolean {
  if (!live()) return false;
  return ctl.start(kind, info, swap);
}
export const skipTrn31 = (): void => ctl.skip();
export const trnBusy31 = (): boolean => ctl.busy();

// qualquer tecla pula (e não vaza para os atalhos da página)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (!ctl.busy()) return;
    if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    ctl.skip();
  }, true);
}

// ---------------------------------------------------------------- portão da navegação (app.ts)

interface Ptr { t: number; inSede: boolean; rect: { x: number; y: number; w: number; h: number } }
let ptr: Ptr | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', (e) => {
    const tg = e.target as HTMLElement | null;
    if (!tg || tg.closest('.trn31')) return;
    const hit = tg.closest<HTMLElement>('button, a, [role=button]') ?? tg;
    const r = hit.getBoundingClientRect();
    const rect = r.width > 0 && r.width < window.innerWidth * 0.6 ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: e.clientX - 24, y: e.clientY - 24, w: 48, h: 48 };
    ptr = { t: performance.now(), inSede: !!tg.closest('.sede25'), rect };
  }, true);
  document.addEventListener('keydown', () => { ptr = null; }, true); // atalho de teclado abre direto, sem zoom
}
/** Página aberta pelo zoom de um objeto da sede (Esc/fechar faz o papel descer). */
let opened: string | null = null;
export const trnBack31 = (area: string): boolean => opened === area && trnOn31() && trnMode31() !== 'off';

export interface TrnNav31 {
  from: string;
  to: string;
  year: number;
  /** área-base da sede (sede25 ou a casa da carreira) */
  sede: string;
  /** lugar (Sede/Casa/Cidade/Mundo) a que a área pertence */
  placeOf: (area: string) => TrnPlace31 | null;
  /** a área é a porta de entrada de um lugar? */
  homeOf: (area: string) => TrnPlace31 | null;
  /** o que o cartão mostra (lido do jogo, só leitura) */
  info: (to: TrnPlace31) => TrnInfo31;
}
/** Decide se o desenho da página espera a transição. true = não desenhe agora (a transição chama `swap`). */
export function trnGate31(n: TrnNav31, swap: () => void): boolean {
  if (ctl.inSwap) return false;
  if (ctl.pending()) return true; // a cortina ainda fecha: a troca desenha a página mais nova
  if (!n.from || n.from === n.to || !live()) return false;
  const p = ptr && performance.now() - ptr.t < 1500 ? ptr : null;
  if (opened && n.from === opened) {
    opened = null;
    if (n.to === n.sede) return transition31('close', { year: n.year }, swap);
  }
  const a = n.placeOf(n.from), b = n.homeOf(n.to);
  if (n.from === n.sede && !b && p?.inSede) {
    ptr = null;
    const ok = transition31('open', { year: n.year, rect: p.rect }, swap);
    if (ok) opened = n.to;
    return ok;
  }
  if (a && b && a !== b) return transition31('travel', n.info(b), swap);
  return false;
}

// ---------------------------------------------------------------- Opções

export const TRN_LABEL31: Record<TrnMode31, ReturnType<typeof l>> = { full: l('Completas', 'Full'), fast: l('Rápidas', 'Fast'), off: l('Desligadas', 'Off') };
/** "Transições: completas / rápidas / desligadas" (preferência do navegador; não entra no save). */
export function settingsTrn31(): HTMLElement | null {
  if (!trnOn31()) return null;
  return h('label', null, t(l('Transições entre telas', 'Screen transitions')),
    select(trnMode31(), TRN_MODES31.map((m) => ({ value: m, label: t(TRN_LABEL31[m]) })), (v) => setSwUi('exp5.trn.mode', v)));
}
