// Rodada 29 (REORG) — componentes no estilo do Atlas visual da Bíblia (Parte IX): cartões-resumo coloridos com
// "Ver origem", funil em etapas, coluna-inspetor, pílula de estado com ponto, cartões de link com ícone e dica.
// Sem arte nova: ícones são os pixel-icons existentes (vis.ic); ilustrações vêm dos ganchos que já existem.
// Estilos em atlas29.css (tokens ui27).

import type { L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { ic } from '../vis';
import './atlas29.css';

const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
type Kid = Node | string | null | undefined | false;

export type Hue29 = 'good' | 'warn' | 'info' | 'bad' | 'accent' | 'muted';

/** Pílula de estado: ponto colorido + TEXTO (nunca só cor). */
export const pill29 = (label: L | string, hue: Hue29 = 'muted'): HTMLElement =>
  h('span', { class: `pill29 hue-${hue}` }, h('span', { class: 'pill29-dot', 'aria-hidden': 'true' }), tx(label));

/** Cartão-resumo colorido (Realizado/Comprometido/Estimado…): ícone, título, explicação, valores e "Ver origem". */
export interface Tri29 { icon: string; hue: Hue29; title: L | string; why: L | string; lines?: [L | string, string][]; go?: () => void; goLabel?: L | string }
export function triCards29(items: Tri29[]): HTMLElement {
  return h('div', { class: 'tri29', role: 'list' }, items.map((x) => h('section', { class: `tri29-c hue-${x.hue}`, role: 'listitem' },
    h('div', { class: 'tri29-h' }, h('span', { class: 'tri29-ic', 'aria-hidden': 'true' }, ic(x.icon, 2)),
      h('div', null, h('h3', null, tx(x.title)), h('p', { class: 'small' }, tx(x.why)))),
    x.lines?.length ? h('dl', { class: 'tri29-dl' }, x.lines.flatMap(([k, v]) => [h('dt', null, tx(k)), h('dd', null, v)])) : null,
    x.go ? h('button', { type: 'button', class: 'tri29-go', onclick: x.go }, tx(x.goLabel ?? 'Ver origem'), ' ›') : null)));
}

/** Funil em etapas (chevrons): a etapa atual em destaque; cada etapa abre o destino EXISTENTE. */
export interface Step29 { n: number; icon: string; title: L | string; sub: L | string; on: boolean; go: () => void }
export function steps29(label: string, xs: Step29[]): HTMLElement {
  return h('nav', { class: 'steps29', 'aria-label': label }, h('ol', null, xs.map((x) => h('li', { class: x.on ? 'on' : '' },
    h('button', { type: 'button', 'aria-current': x.on ? 'step' : undefined, onclick: x.go },
      h('span', { class: 'steps29-ic', 'aria-hidden': 'true' }, ic(x.icon, 2)),
      h('span', { class: 'steps29-tx' }, h('b', null, `${x.n}. `, tx(x.title)), h('small', null, tx(x.sub))))))));
}

/** Cartões de link (rodapé/contexto): ícone, título, descrição e seta. */
export interface Link29 { icon: string; title: L | string; sub: L | string; go: () => void }
export function linkCards29(xs: Link29[], cls = ''): HTMLElement {
  return h('div', { class: `links29 ${cls}` }, xs.map((x) => h('button', { type: 'button', class: 'links29-c', onclick: x.go },
    h('span', { class: 'links29-ic', 'aria-hidden': 'true' }, ic(x.icon, 2)),
    h('span', { class: 'links29-tx' }, h('b', null, tx(x.title)), h('small', null, tx(x.sub))),
    h('span', { class: 'links29-ch', 'aria-hidden': 'true' }, '›'))));
}

/** Coluna principal + inspetor à direita (no celular, o inspetor desce para baixo do conteúdo). */
export const layout29 = (main: Kid[], aside: Kid[]): HTMLElement =>
  h('div', { class: 'lay29' }, h('div', { class: 'lay29-main' }, ...main), h('aside', { class: 'lay29-aside' }, ...aside));

/** Título de seção com a barrinha dourada à esquerda (como no Atlas). */
export const secTitle29 = (title: L | string, sub?: L | string): HTMLElement =>
  h('div', { class: 'sec29' }, h('h2', null, tx(title)), sub ? h('span', { class: 'small muted' }, tx(sub)) : null);

/** Caixa de aviso/informação (ícone + título + texto). */
export const note29 = (title: L | string, body: L | string, hue: Hue29 = 'info'): HTMLElement =>
  h('div', { class: `note29 hue-${hue}`, role: 'note' }, h('b', null, tx(title)), h('p', { class: 'small' }, tx(body)));
