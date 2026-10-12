// Rodada 27 (J) — componentes visuais compartilhados (guia: docs/ui27.md). Só apresentação.
// Cabeçalho de página, faixa de KPIs, cartão, estado vazio, chip de estado, linha de lista, barra de ferramentas,
// número alinhado e diálogo de confirmação. A parte pura (tons, contraste, propósito e KPIs) está em ui27model.ts.
// Regras: o mais importante no topo à esquerda; a ação ao lado do dado que ela muda; no máximo um nível de caixa
// dentro de outra; detalhes em <details> (divulgação progressiva).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { h } from '../dom';
import { ic } from '../vis';
import type { Kpi27, Tone27 } from './ui27model';
// ui27.css é importado em main.ts DEPOIS do theme25.css (a ordem importa)

type Kid = Node | string | number | null | undefined | false | Kid[];
const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));
const kids = (xs: Kid[]): Node[] => xs.flat(9 as 1).filter((x) => x !== null && x !== undefined && x !== false).map((x) => (x instanceof Node ? x : document.createTextNode(String(x))));

// ---------------------------------------------------------------- arte da página (encaixe para ps/art27.ts)
/** Encaixe da ilustração de página: quem desenha registra `artHook27.f = pageArt27` (uma linha). Sem registro, nada aparece. */
export const artHook27: { f?: (area: string, s: GameState) => HTMLElement | HTMLCanvasElement | null } = {};
const FOLD_KEY = 'vtn27.artFold';
const artFolded = (): boolean => { try { return localStorage.getItem(FOLD_KEY) === '1'; } catch { return false; } };

// ---------------------------------------------------------------- cabeçalho de página
export interface PageHeader27 {
  title: L | string;
  /** linha pequena acima do título (seção, carreira, artista…); opcional — as migalhas já dão o caminho */
  eyebrow?: L | string;
  /** para que serve a página / contexto em uma frase */
  sub?: L | string | Node;
  /** ação principal (no máximo uma .primary) e secundárias, à direita do título */
  actions?: Kid[];
  kpis?: Kpi27[];
  /** ilustração (canvas/img); null ou ausente = sem coluna de arte */
  art?: HTMLElement | null;
  /** id da página (data-area) */
  area?: string;
  go?: (area: string) => void;
}
/** Cabeçalho único de página: título + propósito à esquerda, ações à direita, KPIs embaixo e arte opcional. */
export function pageHeader27(o: PageHeader27): HTMLElement {
  const art = o.art ?? null;
  const fold = art ? artFolded() : false;
  const head: HTMLElement = h('header', { class: `ph27 ${art ? 'has-art' : ''} ${fold ? 'art-folded' : ''}`, 'data-area': o.area },
    h('div', { class: 'ph27-text' },
      o.eyebrow ? h('p', { class: 'ph27-eyebrow' }, tx(o.eyebrow)) : null,
      h('h1', { class: 'page21 ph27-title' }, tx(o.title)),
      o.sub ? h('p', { class: 'ph27-sub' }, o.sub instanceof Node ? o.sub : tx(o.sub)) : null),
    o.actions && kids(o.actions).length ? h('div', { class: 'ph27-actions' }, ...kids(o.actions)) : null,
    o.kpis?.length ? kpiRow27(o.kpis, o.go) : null,
    art ? h('aside', { class: 'ph27-art', 'aria-hidden': 'true' }, art) : null,
    art ? h('button', { type: 'button', class: 'ph27-fold', 'aria-expanded': fold ? 'false' : 'true', title: t(l('Mostrar/ocultar ilustração', 'Show/hide illustration')),
      onclick: () => { const f = !head.classList.toggle('art-folded') ? '0' : '1'; try { localStorage.setItem(FOLD_KEY, f); } catch { /* sem armazenamento */ } (head.querySelector('.ph27-fold') as HTMLElement).setAttribute('aria-expanded', f === '1' ? 'false' : 'true'); } },
    h('span', { 'aria-hidden': 'true' }, '▾'), h('span', { class: 'sr-only' }, t(l('Ilustração', 'Illustration')))) : null,
  );
  return head;
}

// ---------------------------------------------------------------- KPIs
/** Um número-chave: rótulo pequeno em cima, valor monoespaçado, tom opcional; vira botão se leva a algum lugar. */
export function kpi27(k: Kpi27, go?: (area: string) => void): HTMLElement {
  const body = [h('span', { class: 'kpi27-l' }, t(k.label)), h('b', { class: `kpi27-v ${k.tone && k.tone !== 'neutral' ? 't-' + k.tone : ''}` }, k.value), k.hint ? h('small', { class: 'kpi27-h' }, t(k.hint)) : null];
  return k.go && go
    ? h('button', { type: 'button', class: 'kpi27 is-link', title: t(k.label), onclick: () => go(k.go!) }, ...body)
    : h('div', { class: 'kpi27' }, ...body);
}
export function kpiRow27(items: Kpi27[], go?: (area: string) => void): HTMLElement {
  return h('div', { class: 'kpis27', role: 'list' }, items.map((k) => { const e = kpi27(k, go); e.setAttribute('role', 'listitem'); return e; }));
}

// ---------------------------------------------------------------- cartão
export interface Card27 {
  title?: L | string;
  icon?: string;
  /** ações do cartão, no canto do título (pequenas) */
  actions?: Kid[];
  /** default = painel com borda; flat = sem caixa (só título e régua), para cartões dentro de cartões; hero = destaque */
  variant?: 'default' | 'flat' | 'hero';
  tone?: Tone27;
  cls?: string;
  /** conteúdo recolhível: o resumo fica sempre à vista, o resto abre ao clicar */
  more?: { label: L | string; body: Kid[] };
}
/** Cartão padrão (section.card): título em caixa-alta pequena com régua, ações à direita, corpo livre. */
export function card27(o: Card27, ...body: Kid[]): HTMLElement {
  const head = o.title || o.actions ? h('header', { class: 'c27-h' },
    o.title ? h('h3', null, o.icon ? h('span', { class: 'c27-ic', 'aria-hidden': 'true' }, ic(o.icon)) : null, tx(o.title)) : null,
    o.actions ? h('div', { class: 'c27-act' }, ...kids(o.actions)) : null) : null;
  return h('section', { class: `card c27 v-${o.variant ?? 'default'} ${o.tone ? 't-' + o.tone : ''} ${o.cls ?? ''}` },
    head, ...kids(body),
    o.more ? h('details', { class: 'c27-more' }, h('summary', null, tx(o.more.label)), ...kids(o.more.body)) : null);
}

// ---------------------------------------------------------------- estados vazio / carregando / erro
export interface Empty27 { icon?: string; title: L | string; why?: L | string; action?: { label: L | string; run: () => void }; secondary?: { label: L | string; run: () => void }; tone?: 'empty' | 'error' | 'loading' }
/** Estado vazio com o próximo passo: o que é, por que está vazio, um botão para resolver. */
export function emptyState27(o: Empty27): HTMLElement {
  const kind = o.tone ?? 'empty';
  return h('div', { class: `empty27 k-${kind}`, role: kind === 'error' ? 'alert' : 'note', 'aria-busy': kind === 'loading' ? 'true' : undefined },
    o.icon ? h('span', { class: 'empty27-ic', 'aria-hidden': 'true' }, ic(o.icon, 2)) : kind === 'loading' ? h('span', { class: 'empty27-spin', 'aria-hidden': 'true' }) : null,
    h('div', { class: 'empty27-b' },
      h('b', null, tx(o.title)),
      o.why ? h('p', null, tx(o.why)) : null,
      o.action || o.secondary ? h('div', { class: 'empty27-act' },
        o.action ? h('button', { type: 'button', class: 'btn small primary', onclick: o.action.run }, tx(o.action.label), ' →') : null,
        o.secondary ? h('button', { type: 'button', class: 'btn small ghost', onclick: o.secondary.run }, tx(o.secondary.label)) : null) : null));
}

// ---------------------------------------------------------------- chips
/** Chip de estado com contraste AA nos dois temas (cores em ui27.css, conferidas em tests/r27-ui.test.ts). */
export function statusChip27(text: L | string, tone: Tone27 = 'neutral', title?: string): HTMLElement {
  return h('span', { class: `chip27 t-${tone}`, title }, tx(text));
}

// ---------------------------------------------------------------- linha de lista com avatar
export interface Row27 { lead?: Node | null; title: Node | string; meta?: Kid; aside?: Kid; actions?: Kid[]; onClick?: () => void; selected?: boolean; tone?: Tone27 }
/** Linha de lista: avatar/logo à esquerda, título + meta, um dado à direita e ações por último. */
export function listRow27(o: Row27): HTMLElement {
  const main = [o.lead ? h('span', { class: 'r27-lead' }, o.lead) : null,
    h('span', { class: 'r27-body' }, h('b', { class: 'r27-t' }, o.title), o.meta ? h('span', { class: 'r27-m' }, ...kids([o.meta])) : null),
    o.aside ? h('span', { class: 'r27-aside' }, ...kids([o.aside])) : null];
  return h('li', { class: `row27 ${o.selected ? 'sel' : ''} ${o.tone ? 't-' + o.tone : ''}`, 'aria-current': o.selected ? 'true' : undefined },
    o.onClick ? h('button', { type: 'button', class: 'r27-hit', onclick: o.onClick }, ...main) : h('span', { class: 'r27-hit' }, ...main),
    o.actions?.length ? h('span', { class: 'r27-act' }, ...kids(o.actions)) : null);
}
export const list27 = (label: L | string, rows: HTMLElement[]): HTMLElement => h('ul', { class: 'list27', 'aria-label': tx(label) }, rows);

// ---------------------------------------------------------------- barra de ferramentas, números
/** Filtros à esquerda, ações à direita, numa linha (quebra no celular). */
export function toolbar27(left: Kid[], right: Kid[] = []): HTMLElement {
  return h('div', { class: 'toolbar27', role: 'group' }, h('div', { class: 'tb27-l' }, ...kids(left)), right.length ? h('div', { class: 'tb27-r' }, ...kids(right)) : null);
}
/** Número tabular alinhado à direita (dinheiro, contagens) com tom opcional. */
export const num27 = (v: string | number, tone?: Tone27): HTMLElement => h('span', { class: `num27 ${tone && tone !== 'neutral' ? 't-' + tone : ''}` }, String(v));
/** Célula numérica de tabela (alinhada à direita, tabular; o sort22 continua lendo o texto). */
export const tdNum27 = (v: string | number, tone?: Tone27): HTMLElement => h('td', { class: `num ${tone && tone !== 'neutral' ? tone : ''}` }, String(v));
