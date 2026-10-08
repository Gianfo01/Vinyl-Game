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
export type TabHost = 'creation' | 'marketHub' | 'mediaHub' | 'business' | 'chartsHub' | 'worldHub';
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
  return (TABS[host] ?? []).map((x) => ({ id: x.id, label: t(x.label), icon: x.icon, badge: x.badge?.(s), render: () => x.render(s), order: x.order ?? 60 }));
}

/** Junta abas existentes (ordem 50) e extras, ordenadas. */
export function mergeTabs<T extends { id: string }>(base: T[], host: TabHost, s: GameState): (T | ReturnType<typeof extraTabs>[number])[] {
  const extra = extraTabs(host, s);
  const before = extra.filter((x) => x.order < 50).sort((a, b) => a.order - b.order);
  const after = extra.filter((x) => x.order >= 50).sort((a, b) => a.order - b.order);
  return [...before, ...base, ...after];
}

export function extraSections(host: string, s: GameState): HTMLElement | null {
  const list = (SECTIONS[host] ?? []).slice().sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
  const els = list.map((x) => x.render(s)).filter((x): x is HTMLElement => !!x);
  return els.length ? h('div', { class: 'extra-sections' }, els) : null;
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
