// r27 (K) — tocador das CENAS ANIMADAS (cut27): canvas 256×144 pixelado em escala inteira, falas que passam,
// barra de progresso, Pular, e as escolhas no fim (efeitos reais via cut27model.choose27). Movimento reduzido:
// quadro estático, todas as falas listadas e as escolhas já à mostra.
// Entra na fila de cenas existente (s.cutscenes → showPendingCutscene → uma janela por vez, respeitando
// "Interrupções" e "Mostrar cenas"); a detecção roda só depois de um avanço feito pela interface
// (AFTER_ADVANCE), então bots e testes nunca enfileiram nada. Preferência em Opções: "Cenas: todas / só
// importantes / desligadas" (store.prefs.cut27).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { queueCutscene, type Cutscene } from '../../sim/ext4';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { h } from '../dom';
import { portraitPx } from '../pixel/avatar';
import { Px } from '../pixel/px';
import { AFTER_ADVANCE, registerCutscene } from '../registry';
import { savePrefs, store } from '../store';
import { drawFigs27, fitInt27, paintArt27 } from './art27';
import { CUT27, CUT_H27, CUT_W27, beat27, choose27, cutModel27, paintFx27, scan27, type CutData27, type CutPref27 } from './cut27model';
import './art27.css';

const reduced = (): boolean => typeof document !== 'undefined' && (document.documentElement.classList.contains('reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

export const cutPref27 = (): CutPref27 => (store.prefs as { cut27?: CutPref27 }).cut27 ?? 'all';

/** Elemento da preferência para o painel de Opções. */
export function settingsCut27(): HTMLElement {
  const sel = h('select', { onchange: (e: Event) => { (store.prefs as { cut27?: CutPref27 }).cut27 = (e.target as HTMLSelectElement).value as CutPref27; savePrefs(); } },
    ...([['all', l('Todas', 'All')], ['major', l('Só importantes', 'Major only')], ['off', l('Desligadas', 'Off')]] as [CutPref27, L][])
      .map(([v, lb]) => h('option', { value: v, selected: cutPref27() === v }, t(lb))));
  return h('label', null, t(l('Cenas animadas (grandes momentos)', 'Animated scenes (big moments)')), sel);
}

/** Depois de cada avanço da interface: lê o que aconteceu e põe as cenas na fila (uma janela por vez). */
export function enqueue27(s: GameState, pref: CutPref27 = cutPref27()): Cutscene[] {
  const off = (store.prefs as { cutscenes?: boolean }).cutscenes === false;
  const list = scan27(s, off ? 'off' : pref);
  return list.map((d) => {
    // uma cena por acontecimento: a cena antiga do mesmo momento (mesmo ato, avanço recente) fica só no álbum
    const same = SAME27[d.key];
    if (same) for (const c of s.cutscenes ?? []) if (!c.seen && s.week - c.week <= 5 && (!c.data.actId || !d.actId || c.data.actId === d.actId) && same(c)) { c.seen = true; c.data.quiet23 = true; }
    return queueCutscene(s, 'cut27', { title: CUT27[d.key].title, d, actId: d.actId ?? null, int23: CUT27[d.key].choices.length ? 'always' : 'milestone' });
  });
}
/** Cenas antigas que contam o mesmo momento (number1 da rua, ônibus, momentos do r16, storyboards do cine18). */
const m16 = (pt: string) => (c: Cutscene) => c.kind === 'moment16' && (c.data.title as L | undefined)?.pt === pt;
const SAME27: Partial<Record<CutData27['key'], (c: Cutscene) => boolean>> = {
  no1: (c) => c.kind === 'number1',
  tour: (c) => c.kind === 'busfx',
  press1: m16('Lançamento'),
  show1: m16('Noite de show'),
  magic: m16('Sessão concluída'),
  star: (c) => c.kind === 'cine18' || m16('Contrato assinado')(c),
  sold: (c) => c.kind === 'cine18',
  fest: (c) => c.kind === 'cine18',
};
AFTER_ADVANCE.push((s) => { try { enqueue27(s); } catch (e) { console.warn('cut27', e); } });

/** Dicas falam em dólares reais ("US$ 1.500"); na tela vira o valor nominal da época ("$ 92" em 1930). */
export function hint27(s: GameState, txt: string): string {
  return txt.replace(/US\$ ([\d.,]+)/g, (_, n: string) => `$${Math.round(money(s, Number(n.replace(/[.,]/g, ''))) / 100).toLocaleString(document.documentElement.lang || 'pt-BR')}`);
}

/** Cena montada (também usada pela folha de contato). */
export function cutView27(s: GameState, d: CutData27, close: () => void, cs?: { data: Record<string, unknown> }): HTMLElement {
  const def = CUT27[d.key];
  // no celular a cena fica mais estreita (e mais baixa) para caber em escala 2× sem borrar
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const w = vw < 600 ? Math.max(150, Math.min(CUT_W27, Math.floor((vw - 40) / 2))) : CUT_W27;
  const m = cutModel27(s, d, { w, h: Math.round(w * (vw < 600 ? 0.5 : CUT_H27 / CUT_W27)) });
  const still = reduced();
  const cv = h('canvas', { width: m.W, height: m.H, class: 'px cut27-cv', role: 'img', 'aria-label': t(def.title) }) as HTMLCanvasElement;
  const ctx = cv.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;
  const buf = new Px(m.W, m.H);
  const img = ctx?.createImageData(m.W, m.H);
  const who = d.key === 'death' && d.pid ? s.persons[d.pid] : undefined;
  const pic = who ? portraitPx(who, d.year) : null;
  const paint = (tm: number) => {
    if (!ctx || !img) return;
    paintArt27(m, tm, buf);
    if (pic) buf.blit(pic, Math.round(m.W / 2) - 16, Math.max(6, m.fy - 64) + 2);
    paintFx27(buf, m, def.fx, tm);
    new Uint32Array(img.data.buffer).set(buf.d);
    ctx.putImageData(img, 0, 0);
    drawFigs27(ctx, s, m, tm, still || tm === 0);
  };
  const beats = def.beats.map((b) => beat27(s, d, b));
  const cap = h('p', { class: 'cut27-cap', 'aria-live': 'polite' });
  const bar = h('i');
  const choiceBox = h('div', { class: 'cut27-choices' });
  const outBox = h('div');
  const done = (cs?.data.choice27 as string | undefined) ?? undefined;
  let shown = false;
  const showEnd = () => {
    if (shown) return; shown = true;
    if (still) cap.replaceChildren(h('ul', { class: 'cut27-lines' }, beats.map((b) => h('li', null, t(b)))));
    else cap.replaceChildren(h('b', null, t(beats[beats.length - 1])));
    if (done || !def.choices.length) {
      if (done && cs?.data.out27) outBox.replaceChildren(h('p', { class: 'cut27-out' }, t(cs.data.out27 as L)));
      choiceBox.replaceChildren(h('button', { class: 'btn primary', type: 'button', onclick: close }, t(l('Continuar', 'Continue'))));
      return;
    }
    choiceBox.replaceChildren(...def.choices.map((c) => h('button', { class: 'btn', type: 'button', onclick: () => {
      const out = choose27(s, d, c.id);
      if (cs) { cs.data.choice27 = c.id; if (out) cs.data.out27 = out; }
      outBox.replaceChildren(h('p', { class: 'cut27-out' }, h('b', null, `${t(c.label)}: `), out ? t(out) : ''));
      choiceBox.replaceChildren(h('button', { class: 'btn primary', type: 'button', onclick: close }, t(l('Continuar', 'Continue'))));
      (choiceBox.querySelector('button') as HTMLButtonElement | null)?.focus();
    } }, t(c.label), h('small', null, hint27(s, t(c.hint))))));
  };
  const wrap = h('div', { class: 'cut27', 'data-key': d.key },
    h('div', { class: 'cut27-stage' }, cv), cap, outBox, choiceBox,
    h('div', { class: 'cut27-ctl' }, h('span', { class: 'cut27-bar' }, bar),
      h('button', { class: 'btn small ghost', type: 'button', onclick: () => { t0 -= def.ms; showEnd(); } }, t(l('Pular ⏭', 'Skip ⏭')))));
  fitInt27(cv, m.W, 3);
  let t0 = 0, last = 0;
  if (still) { paint(0); showEnd(); }
  else {
    paint(0.01);
    cap.replaceChildren(h('b', null, t(beats[0])));
    const loop = (now: number) => {
      if (t0 && !wrap.isConnected) return;
      if (!t0) t0 = now;
      if (now - last >= 80) {
        last = now;
        const tm = (now - t0) / 1000;
        paint(tm);
        const k = Math.min(1, tm / (def.ms / 1000));
        bar.style.width = `${Math.round(k * 100)}%`;
        if (!shown) { const i = Math.min(beats.length - 1, Math.floor(k * beats.length)); cap.replaceChildren(h('b', null, t(beats[i]))); }
        if (k >= 1) showEnd();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  return wrap;
}

registerCutscene('cut27', (s, cs, close) => cutView27(s, cs.data.d as CutData27, close, cs), { interrupt: 'milestone' });
