// Registro de interface da rodada 4: sistemas novos acrescentam abas, seções, áreas inteiras e cenas
// em tela cheia sem editar os painéis existentes.
//
//   registerTab('creation', { id: 'compose', label: l('Compor', 'Write'), icon: 'note', render: (s) => ... });
//   registerSection('shows', { id: 'festival', render: (s) => ... });
//   registerArea({ id: 'people', label: l('Pessoas', 'People'), icon: 'heart', key: 'p', render: (s) => ... });
//   registerCutscene('awards', (s, cs, close) => ...);   // abre sozinha quando a simulação enfileira
//   openScene(l('Título', 'Title'), (close) => elemento);  // tela cheia para mini-jogos e locais

import { quietScene, sceneAttnDone } from '../sim/attention';
import type { L } from '../data/world';
import { t } from '../i18n/strings';
import type { Cutscene } from '../sim/ext4';
import type { GameState } from '../sim/types';
import { INTERRUPT23, INT_PREF23, interruptOf23, shouldInterrupt23, type Interrupt23 } from '../sim/interrupt23';
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
  /** r19: rótulo de época (ex.: "Público e streaming" só com streaming); ausente = `label` */
  labelAt?: (s: GameState) => L;
}

export interface ExtraSection {
  id: string;
  render: (s: GameState) => HTMLElement | null;
  order?: number;
  /** r19 (blocks19): peso no Cockpit (maior abre primeiro), condição de exibição e título da barra recolhida */
  weight?: number | ((s: GameState) => number);
  when?: (s: GameState) => boolean;
  title?: L;
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

export function registerCutscene(kind: string, render: (s: GameState, cs: Cutscene, close: () => void) => HTMLElement, opts: { interrupt?: Interrupt23 } = {}): void {
  CUTSCENES[kind] = render;
  if (opts.interrupt) INTERRUPT23[kind] = opts.interrupt; // r23: classe de interrupção declarada no registro
}

/** r23 (A): chamados com as cenas que NÃO interromperam (foram para a caixa de entrada / Álbum). */
export const ON_QUIET23: ((s: GameState, list: Cutscene[]) => void)[] = [];
/** r28 (F3): quais das cenas pendentes podem abrir agora (ids); as outras vão para o álbum em silêncio. */
export const SCENE_GATE28: { f?: (s: GameState, list: Cutscene[]) => string[] } = {};

/** Abas extras no formato de `tabs()` de vis.ts. */
export function extraTabs(host: TabHost, s: GameState): { id: string; label: string; icon?: string; badge?: number; render: () => HTMLElement; order: number }[] {
  return (TABS[host] ?? []).filter((x) => !x.visible || x.visible(s)).map((x) => ({ id: x.id, label: t(x.labelAt?.(s) ?? x.label), icon: x.icon, badge: x.badge?.(s), render: () => x.render(s), order: x.order ?? 60 }));
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

/** r19: seções visíveis de um host (sem desenhar), na ordem — para quem decide o que abrir (blocks19). */
export function sectionList(host: SectionHost, s: GameState): ExtraSection[] {
  return (SECTIONS[host] ?? []).filter((x) => !SECTION_HIDE.some((f) => f(host, x.id, s))).sort((a, b) => (a.order ?? 50) - (b.order ?? 50));
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
  let pending = (s.cutscenes ?? []).filter((c) => !c.seen && CUTSCENES[c.kind]);
  if (!pending.length) return false;
  // r23 (A): rotina não interrompe — marca como vista "em silêncio" (fica para rever) e avisa pela caixa de entrada
  if (!skip) {
    const quiet = pending.filter((c) => !shouldInterrupt23(interruptOf23(c), INT_PREF23.v));
    if (quiet.length) {
      for (const c of quiet) { quietScene(s, c); sceneDone(s, c); }
      for (const f of ON_QUIET23) f(s, quiet);
      pending = pending.filter((c) => !quiet.includes(c));
      if (!pending.length) { rerender(); return false; }
    }
  }
  // r28 (F3): orçamento único de atenção (r31: sim/attention.ts) — no máximo 2 cenas por avanço e 3 por mês; decisões sempre passam
  if (!skip && SCENE_GATE28.f) {
    const ok = new Set(SCENE_GATE28.f(s, pending));
    const over = pending.filter((c) => !ok.has(c.id));
    if (over.length) {
      for (const c of over) { quietScene(s, c); sceneDone(s, c); }
      for (const f of ON_QUIET23) f(s, over);
      pending = pending.filter((c) => ok.has(c.id));
      if (!pending.length) { rerender(); return false; }
    }
  }
  if (skip) {
    for (const c of pending) { quietScene(s, c); sceneDone(s, c); } // r23: fica para rever
    return false;
  }
  const cs = pending[0];
  cs.seen = true;
  sceneAttnDone(s, cs.id); // r31: abriu = visto e resolvido na fila única
  for (const f of ON_SCENE_SHOW28) { try { f(s, cs); } catch { /* vinheta nunca derruba a cena */ } }
  let closeFn: () => void = () => {};
  closeFn = openScene((cs.data.title as L | string | undefined) ?? '', (close) => CUTSCENES[cs.kind](s, cs, close), {
    onClose: () => { sceneDone(s, cs); rerender(); setTimeout(() => showPendingCutscene(s, rerender, false), 50); },
  });
  void closeFn;
  return true;
}

/** Abre uma cena específica (iniciada por uma ação do jogador, não pelo avanço do tempo). */
export function openCutscene(s: GameState, cs: Cutscene, rerender: () => void): boolean {
  const fn = CUTSCENES[cs.kind];
  if (!fn) return false;
  cs.seen = true;
  sceneAttnDone(s, cs.id);
  for (const f of ON_SCENE_SHOW28) { try { f(s, cs); } catch { /* idem */ } }
  openScene((cs.data.title as L | string | undefined) ?? '', (close) => fn(s, cs, close), { onClose: () => { sceneDone(s, cs); rerender(); } });
  return true;
}

/** r28 (F4): chamados quando uma cena abre na tela (ex.: vinheta de áudio do marco, se o som estiver ligado). */
export const ON_SCENE_SHOW28: ((s: GameState, cs: Cutscene) => void)[] = [];

/** r19 (cenas): chamados quando uma cena é fechada ou pulada (ex.: anunciar o resultado guardado da cerimônia). */
export const ON_SCENE_DONE: ((s: GameState, cs: Cutscene) => void)[] = [];
function sceneDone(s: GameState, cs: Cutscene): void { sceneAttnDone(s, cs.id); for (const f of ON_SCENE_DONE) f(s, cs); } // r31: item da cena na fila única fica resolvido

/** r18 decide18: chamados depois de cada avanço de tempo (resumo do mês, etc.). */
export const AFTER_ADVANCE: ((s: GameState) => void)[] = [];

// ---------------------------------------------------------------- r20: vistas de área (hubs)

/** Rodada 20 (hubs20): uma área pode trocar o painel antigo por um hub com subáreas. A vista assume
 *  as seções registradas da área (o painel antigo continua acessível como "Tudo (especialista)"). */
const AREA_VIEWS20: Record<string, (s: GameState) => HTMLElement> = {};
export function registerAreaView20(id: string, render: (s: GameState) => HTMLElement): void { AREA_VIEWS20[id] = render; }
export const areaView20 = (id: string): ((s: GameState) => HTMLElement) | undefined => AREA_VIEWS20[id];
