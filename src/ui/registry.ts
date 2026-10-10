// Registro de interface da rodada 4: sistemas novos acrescentam abas, seções, áreas inteiras e cenas
// em tela cheia sem editar os painéis existentes.
//
//   registerTab('creation', { id: 'compose', label: l('Compor', 'Write'), icon: 'note', render: (s) => ... });
//   registerSection('shows', { id: 'festival', render: (s) => ... });
//   registerArea({ id: 'people', label: l('Pessoas', 'People'), icon: 'heart', key: 'p', render: (s) => ... });
//   registerCutscene('awards', (s, cs, close) => ...);   // abre sozinha quando a simulação enfileira
//   openScene(l('Título', 'Title'), (close) => elemento);  // tela cheia para mini-jogos e locais

import type { L } from '../data/world';
import { t } from '../i18n/strings';
import type { Cutscene } from '../sim/ext4';
import type { GameState } from '../sim/types';
import { h } from './dom';

/** Painéis que aceitam abas extras (já usam abas). */
export type TabHost = 'creation' | 'marketHub' | 'mediaHub' | 'business' | 'chartsHub' | 'worldHub' | 'catalogHub';
/** Áreas que aceitam seções extras no fim. */
export type SectionHost = 'hq' | 'desk' | 'plan' | 'charts' | 'artists' | 'market' | 'media' | 'catalog' | 'creation' | 'shows' | 'company' | 'business' | 'world' | 'diary';

export interface ExtraTab {
  id: string;
  label: L;
  icon: string;
  render: (s: GameState) => HTMLElement;
  badge?: (s: GameState) => number | undefined;
  /** posição: abas com ordem menor vêm antes (as existentes contam como 50) */
  order?: number;
  /** some quando falso (ex.: o que ainda não existe no ano do jogo) */
  visible?: (s: GameState) => boolean;
}

export interface ExtraSection {
  id: string;
  render: (s: GameState) => HTMLElement | null;
  order?: number;
}

export interface ExtraArea {
  id: string;
  label: L;
  icon: string;
  /** tecla de atalho (uma letra ainda livre) */
  key: string;
  render: (s: GameState) => HTMLElement;
  badge?: (s: GameState) => number | undefined;
  /** some do menu quando falso (ex.: instituições que ainda não existem no ano) */
  visible?: (s: GameState) => boolean;
}

const TABS: Record<string, ExtraTab[]> = {};
const SECTIONS: Record<string, ExtraSection[]> = {};
export const EXTRA_AREAS: ExtraArea[] = [];
const CUTSCENES: Record<string, (s: GameState, cs: Cutscene, close: () => void) => HTMLElement> = {};

export function registerTab(host: TabHost, tab: ExtraTab): void {
  const list = (TABS[host] ??= []);
  const i = list.findIndex((x) => x.id === tab.id);
  if (i >= 0) list[i] = tab;
  else list.push(tab);
}

export function registerSection(host: SectionHost, sec: ExtraSection): void {
  const list = (SECTIONS[host] ??= []);
  const i = list.findIndex((x) => x.id === sec.id);
  if (i >= 0) list[i] = sec;
  else list.push(sec);
}

export function registerArea(a: ExtraArea): void {
  const i = EXTRA_AREAS.findIndex((x) => x.id === a.id);
  if (i >= 0) EXTRA_AREAS[i] = a;
  else EXTRA_AREAS.push(a);
}

export function registerCutscene(kind: string, render: (s: GameState, cs: Cutscene, close: () => void) => HTMLElement): void {
  CUTSCENES[kind] = render;
}

/** Abas extras no formato de `tabs()` de vis.ts. */
export function extraTabs(host: TabHost, s: GameState): { id: string; label: string; icon?: string; badge?: number; render: () => HTMLElement; order: number }[] {
  return (TABS[host] ?? []).filter((x) => !x.visible || x.visible(s)).map((x) => ({ id: x.id, label: t(x.label), icon: x.icon, badge: x.badge?.(s), render: () => x.render(s), order: x.order ?? 60 }));
}

/** Junta abas existentes (ordem 50) e extras, ordenadas. */
export function mergeTabs<T extends { id: string }>(base: T[], host: TabHost, s: GameState): (T | ReturnType<typeof extraTabs>[number])[] {
  const extra = extraTabs(host, s);
  const before = extra.filter((x) => x.order < 50).sort((a, b) => a.order - b.order);
  const after = extra.filter((x) => x.order >= 50).sort((a, b) => a.order - b.order);
  return [...before, ...base, ...after];
}

/** Rodada 17: seções que se mudaram para outra página (ex.: casa de shows → página da carreira) somem do host. */
const SECTION_HIDE: ((host: string, id: string, s: GameState) => boolean)[] = [];
export function hideSection(fn: (host: string, id: string, s: GameState) => boolean): void { SECTION_HIDE.push(fn); }
/** Desenha seções registradas específicas (por id) em outra página. */
export function sectionsOf(host: SectionHost, ids: string[], s: GameState): HTMLElement[] {
  return ids.map((id) => (SECTIONS[host] ?? []).find((x) => x.id === id)?.render(s)).filter((x): x is HTMLElement => !!x);
}

export function extraSections(host: string, s: GameState): HTMLElement | null {
  const list = (SECTIONS[host] ?? []).filter((x) => !SECTION_HIDE.some((f) => f(host, x.id, s))).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  const els = list.map((x) => x.render(s)).filter((x): x is HTMLElement => !!x);
  return els.length ? h('div', { class: 'extra-sections' }, els) : null;
}

// ---------------------------------------------------------------- fichas (rodada 8)

/** Abas extras na página do ato e seções extras na ficha do selo. */
export interface PageTab {
  id: string;
  label: L;
  icon: string;
  render: (s: GameState, id: string) => HTMLElement | null;
  /** aparece só quando devolve true (ex.: conhecimento suficiente do ato) */
  when?: (s: GameState, id: string) => boolean;
  order?: number;
}
const PAGE_TABS: Record<'act' | 'label', PageTab[]> = { act: [], label: [] };

export function registerPageTab(host: 'act' | 'label', tab: PageTab): void {
  const list = PAGE_TABS[host];
  const i = list.findIndex((x) => x.id === tab.id);
  if (i >= 0) list[i] = tab;
  else list.push(tab);
}

export function pageTabs(host: 'act' | 'label', s: GameState, id: string): PageTab[] {
  return PAGE_TABS[host].filter((x) => !x.when || x.when(s, id)).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
}

export function hasCutscene(kind: string): boolean {
  return !!CUTSCENES[kind];
}

// ---------------------------------------------------------------- cenas em tela cheia

let sceneOpen: (() => void) | null = null;

/** Abre uma cena em tela cheia (mini-jogo, local em pixel art). Devolve a função de fechar. */
export function openScene(title: L | string, render: (close: () => void) => HTMLElement, opts: { onClose?: () => void; wide?: boolean } = {}): () => void {
  sceneOpen?.();
  const prev = document.activeElement as HTMLElement | null;
  let root: HTMLElement;
  const close = () => {
    if (!root.isConnected) return;
    root.remove();
    document.removeEventListener('keydown', onKey);
    sceneOpen = null;
    opts.onClose?.();
    prev?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  const label = typeof title === 'string' ? title : t(title);
  root = h('div', { class: 'scene-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': label },
    h('div', { class: `scene-box ${opts.wide === false ? '' : 'wide'}` },
      h('header', { class: 'scene-head' }, h('h2', null, label), h('button', { class: 'icon', 'aria-label': t({ pt: 'Fechar', en: 'Close' }), onclick: close }, '✕')),
      h('div', { class: 'scene-body' }, render(close)),
    ));
  document.body.appendChild(root);
  document.addEventListener('keydown', onKey);
  sceneOpen = close;
  (root.querySelector('button, [tabindex]') as HTMLElement | null)?.focus();
  return close;
}

/** Mostra a próxima cena pendente da simulação (chamado pela interface depois de avançar o tempo). */
export function showPendingCutscene(s: GameState, rerender: () => void, skip: boolean): boolean {
  const pending = (s.cutscenes ?? []).filter((c) => !c.seen && CUTSCENES[c.kind]);
  if (!pending.length) return false;
  if (skip) {
    for (const c of pending) c.seen = true;
    return false;
  }
  const cs = pending[0];
  cs.seen = true;
  let closeFn: () => void = () => {};
  closeFn = openScene((cs.data.title as L | string | undefined) ?? '', (close) => CUTSCENES[cs.kind](s, cs, close), {
    onClose: () => { rerender(); setTimeout(() => showPendingCutscene(s, rerender, false), 50); },
  });
  void closeFn;
  return true;
}

/** Abre uma cena específica (iniciada por uma ação do jogador, não pelo avanço do tempo). */
export function openCutscene(s: GameState, cs: Cutscene, rerender: () => void): boolean {
  const fn = CUTSCENES[cs.kind];
  if (!fn) return false;
  cs.seen = true;
  openScene((cs.data.title as L | string | undefined) ?? '', (close) => fn(s, cs, close), { onClose: rerender });
  return true;
}

/** r18 decide18: chamados depois de cada avanço de tempo (resumo do mês, etc.). */
export const AFTER_ADVANCE: ((s: GameState) => void)[] = [];
