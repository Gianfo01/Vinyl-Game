// Rodada 29 (cenas) — TODA cena animada que dispara (cut27/cut28/cut29, pelo avanço ou pela ponte das atividades)
// fica registrada: entra no "Álbum de cenas" (seção "Cenas animadas", por ano, com "rever") e no storyboard do fim
// (end28.album28 lê este registro junto com o arquivo das cenas de lugar). Vale também para as que não interromperam
// (orçamento de atenção do story28 ou preferência): o registro é feito na hora em que a cena entra na fila.
// Só a interface escreve aqui (o headless nunca enfileira cenas animadas), então os valores-ouro não mudam.
// Rever é o MESMO fluxo de sempre: se a cena ainda está na fila da simulação, abre por openCutscene (escolha ainda
// aberta pode ser feita, como no "Rever cena" da r23); se já saiu da fila, abre só para ver, com o resultado guardado.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Cutscene } from '../../sim/ext4';
import type { GameState } from '../../sim/types';
import { rerender, section } from '../common';
import { h } from '../dom';
import { openCutscene, openScene } from '../registry';
import { ALBUM17_X } from '../sys/scene17';
import { drawFigs27 } from './art27';
import { CUT27, cut27, cutModel27, type CutData27 } from './cut27model';
import { paintCut29 } from './cutpaint29';

/** Uma linha do álbum: id da cena na fila, chave, semana/ano, título, ato, dados da cena, escolha e resultado. */
export interface Log29 { id: string; k: string; w: number; y: number; ti: L; a?: string; d: CutData27; ch?: string; out?: L }
export const LOG_MAX29 = 300;

/** Registro das cenas (no estado do cut27, que já é salvo com a partida). */
export function log29of(s: GameState): Log29[] {
  const st = cut27(s) as ReturnType<typeof cut27> & { log?: Log29[] };
  return (st.log ??= []);
}
/** Guarda a cena que acabou de entrar na fila (uma linha por cena). */
export function log29(s: GameState, cs: Cutscene, d: CutData27): void {
  const xs = log29of(s);
  if (xs.some((x) => x.id === cs.id)) return;
  xs.push({ id: cs.id, k: d.key, w: s.week, y: s.year, ti: CUT27[d.key].title, a: d.a, d });
  if (xs.length > LOG_MAX29) xs.splice(0, xs.length - LOG_MAX29);
}
/** Guarda a escolha e o resultado (para o álbum e o storyboard). */
export function outcome29(s: GameState, d: CutData27, ch: string, out: L | null): void {
  const e = log29of(s).filter((x) => x.d.ref === d.ref && x.k === d.key).pop();
  if (!e) return;
  e.ch = ch;
  if (out) e.out = out;
}

/** Abre a cena registrada: pela fila (decisão ainda aberta) ou só para rever. */
export function replay29(s: GameState, e: Log29): void {
  const cs = (s.cutscenes ?? []).find((c) => c.id === e.id);
  if (cs) { openCutscene(s, cs, rerender); return; }
  void import('./cut27').then(({ cutView27 }) => {
    const data: Record<string, unknown> = { choice27: e.ch ?? '—', ...(e.out ? { out27: e.out } : {}) };
    openScene(e.ti, (close) => cutView27(s, e.d, close, { data }));
  });
}

ALBUM17_X.push((s) => {
  const xs = log29of(s);
  if (!xs.length) return null;
  const byYear = new Map<number, Log29[]>();
  for (const e of [...xs].reverse()) { const a = byYear.get(e.y) ?? []; a.push(e); byYear.set(e.y, a); }
  const label = (e: Log29): string => { const c = CUT27[e.k as CutData27['key']]?.choices.find((x) => x.id === e.ch); return c ? t(c.label) : ''; };
  return section(t(l('Cenas animadas', 'Animated scenes')),
    h('p', { class: 'muted small' }, t(l('Todos os grandes momentos que viraram cena, inclusive os que não interromperam. A escolha feita fica anotada.', 'Every big moment that became a scene, including the ones that did not interrupt. The choice you made is noted.'))),
    h('div', { class: 's17-book alb29' }, [...byYear.entries()].map(([y, es]) => h('div', { class: 's17-year' }, h('h4', null, String(y)),
      h('ul', null, es.map((e) => h('li', { 'data-k': e.k },
        h('b', null, t(e.ti)), e.a ? ` · ${e.a}` : '', e.ch && label(e) ? h('small', { class: 'muted' }, ` — ${label(e)}`) : null, ' ',
        h('button', { class: 'link small', onclick: () => replay29(s, e) }, t(l('rever cena', 'replay scene'))))))))));
});

// ---------------------------------------------------------------- storyboard do fim (end28)

/** Miniatura em pixel (96×42) da cena animada registrada com este id, ou null (cena de lugar / sem registro). */
export function thumb29(s: GameState, id: string): HTMLCanvasElement | null {
  const e = log29of(s).find((x) => x.id === id);
  if (!e || typeof document === 'undefined') return null;
  try {
    const m = cutModel27(s, e.d, { w: 96, h: 42 });
    const px = paintCut29(s, e.d, m, 0);
    const c = document.createElement('canvas'); c.width = m.W; c.height = m.H; c.className = 'px sb29-thumb';
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    const img = ctx.createImageData(m.W, m.H); new Uint32Array(img.data.buffer).set(px.d); ctx.putImageData(img, 0, 0);
    drawFigs27(ctx, s, m, 0, true);
    c.style.width = `${m.W * 2}px`; c.style.imageRendering = 'pixelated';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', t(e.ti));
    return c;
  } catch { return null; }
}
/** Todas as cenas animadas da partida (lista compacta por ano, com a escolha) — no storyboard, abaixo do álbum. */
export function allScenes29(s: GameState): HTMLElement | null {
  const xs = log29of(s);
  if (!xs.length) return null;
  const byYear = new Map<number, Log29[]>();
  for (const e of xs) { const a = byYear.get(e.y) ?? []; a.push(e); byYear.set(e.y, a); }
  const label = (e: Log29): string => { const c = CUT27[e.k as CutData27['key']]?.choices.find((x) => x.id === e.ch); return c ? ` — ${t(c.label)}` : ''; };
  return h('details', { class: 'sb29-all' }, h('summary', null, t(l('Todas as cenas animadas ({n})', 'All animated scenes ({n})'), { n: xs.length })),
    h('ul', { class: 'small' }, [...byYear.entries()].map(([y, es]) => h('li', null, h('b', null, `${y}: `), es.map((e) => `${t(e.ti)}${e.a ? ` (${e.a})` : ''}${label(e)}`).join(' · ')))));
}
