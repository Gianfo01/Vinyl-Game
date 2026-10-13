// r27 (CHAR): liga os sprites de semelhança das pessoas reais (ui/pixel/people27) aos retratos do jogo inteiro.
// Todo retrato passa por portraitCanvas / portraitDataUrl / portraitPx (avatar.ts) — fichas, cartas do elenco,
// listas de pessoas, árvore da família, caixa de entrada, negociação, cenas. Aqui a pessoa vira o busto real
// (64×64, escala inteira) sobre a placa da era; quem não tem sprite (ou nomes fictícios) segue procedural.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import type { Act, GameState, Person } from '../../sim/types';
import { h } from '../dom';
import { eraOf } from '../pixel/palette';
import { portraitPlatePx, setRealPortrait27 } from '../pixel/avatar';
import { Px, upscale } from '../pixel/px';
import { bodyCanvas27, bustReady27, drawBust27, realSprite27, whenSheet27, type Sprite27 } from '../pixel/people27';
import { store } from '../store';
import './sprites27.css';

const PLATES = new Map<string, HTMLCanvasElement>();
function plate(year: number, size: number): HTMLCanvasElement {
  const k = `${eraOf(year)}|${size}`;
  let c = PLATES.get(k);
  if (!c) { c = upscale(portraitPlatePx(year).canvas(), size); PLATES.set(k, c); }
  return c;
}

/** Pinta placa + busto num canvas size×size (false se a folha ainda não chegou). */
function paint(c: HTMLCanvasElement, sp: Sprite27, size: number, year: number): boolean {
  const ctx = c.getContext('2d');
  if (!ctx || !bustReady27(sp)) return false;
  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(plate(year, size), 0, 0);
  return drawBust27(ctx, sp, size);
}

const TPL = new Map<string, HTMLCanvasElement>();
const URLS = new Map<string, string>();
const keyOf = (sp: Sprite27, size: number, year: number) => `${sp.slot}|${eraOf(year)}|${size}`;
function template(sp: Sprite27, size: number, year: number): HTMLCanvasElement | null {
  const k = keyOf(sp, size, year);
  let c = TPL.get(k);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = size;
  if (!paint(c, sp, size, year)) return null;
  if (TPL.size > 1500) TPL.clear();
  TPL.set(k, c);
  return c;
}
const copyOf = (src: HTMLCanvasElement): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.className = 'px portrait real27';
  c.getContext('2d')?.drawImage(src, 0, 0);
  return c;
};
function urlOf(sp: Sprite27, size: number, year: number): string | null {
  const k = keyOf(sp, size, year);
  let u = URLS.get(k);
  if (u) return u;
  const c = template(sp, size, year);
  if (!c) return null;
  u = c.toDataURL();
  if (URLS.size > 1500) URLS.clear();
  URLS.set(k, u);
  return u;
}

setRealPortrait27({
  canvas(person, size, year, fallback) {
    const sp = realSprite27(store.game, person);
    if (!sp) return null;
    const tpl = template(sp, size, year);
    if (tpl) return copyOf(tpl);
    const c = fallback();
    whenSheet27('bust', sp.bust.sheet, () => { if (paint(c, sp, size, year)) c.classList.add('real27'); });
    return c;
  },
  url(person, size, year, late) {
    const sp = realSprite27(store.game, person);
    if (!sp) return null;
    const u = urlOf(sp, size, year);
    if (u) return u;
    if (late) whenSheet27('bust', sp.bust.sheet, () => { const x = urlOf(sp, size, year); if (x) late(x); });
    return null;
  },
  px(person, year) {
    const sp = realSprite27(store.game, person);
    const c = sp ? template(sp, 32, year) : null;
    const d = c?.getContext('2d')?.getImageData(0, 0, 32, 32);
    if (!d) return null;
    const p = new Px(32, 32);
    p.d.set(new Uint32Array(d.data.buffer));
    return p;
  },
});

// ---------------------------------------------------------------- corpo inteiro (fichas)

const phase = (sp: Sprite27) => t(l('sprite da fase de {y}', 'sprite of the {y} era'), { y: sp.year });

/** Corpo inteiro (2× = 192×304; 1× no celular) para o topo da ficha da pessoa; null = sem sprite (fica o busto). */
export function heroBody27(s: GameState, p: Person): HTMLElement | null {
  const sp = realSprite27(s, p);
  if (!sp) return null;
  const c = bodyCanvas27(sp, 2, `px body27 hero27${p.alive ? '' : ' deceased'}`);
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', p.name);
  c.title = `${p.name} · ${phase(sp)}`;
  return c;
}

/** Formação em corpo inteiro (1×) para o topo da página do ato: cada integrante atual que tem sprite.
 *  null quando ninguém tem (ato fictício, nomes fictícios ou sem arte). */
export function lineup27(s: GameState, a: Act, onPick: (pid: string) => void): HTMLElement | null {
  const ms = a.members.map((id) => s.persons[id]).filter((p): p is Person => !!p);
  const xs = ms.map((p) => ({ p, sp: realSprite27(s, p) })).filter((x): x is { p: Person; sp: Sprite27 } => !!x.sp);
  if (!xs.length) return null;
  return h('div', { class: 'lineup27', role: 'list', 'aria-label': t(l('Formação', 'Line-up')) },
    xs.map(({ p, sp }) => h('button', { class: 'lineup27-m', type: 'button', role: 'listitem', title: `${p.name} · ${phase(sp)}`, 'aria-label': p.name, onclick: () => onPick(p.id) },
      bodyCanvas27(sp, 1, `px body27${p.alive ? '' : ' deceased'}`),
      h('small', null, p.name.split(' ')[0]))));
}
