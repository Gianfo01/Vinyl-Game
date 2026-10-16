// Componentes visuais compartilhados: ícone, medidor com ícone, chips de status, cartões,
// barras de carga mensal, linha do tempo diária e contagem regressiva. Menos texto, mais leitura
// rápida (pedido do criador). Ícones em pixel art (r31 EMO: sem emoji de reserva).

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import type { GameState, Person } from '../sim/types';
import { h } from './dom';
import { nameSvg20 } from './ux20';
import { shownTabs31 } from './ps/view27'; // R31 (A): ≤ 6 abas à mostra + "Mais ▾" em toda faixa


type IconFn = (name: string, scale?: number) => HTMLElement | null;
let pixelIcon: IconFn | null = null;

/** O módulo de pixel art registra seu desenhista de ícones aqui. */
export function registerIconRenderer(fn: IconFn): void {
  pixelIcon = fn;
}

export function ic(name: string, scale = 1, title?: string): HTMLElement {
  const px = pixelIcon?.(name, scale);
  if (px) {
    if (title) px.setAttribute('title', title);
    px.classList.add('ic-px');
    return px;
  }
  // r31 onda 4 (EMO): sem emoji do sistema — nome desconhecido vira um ponto neutro
  return h('span', { class: 'ic-emoji', 'aria-hidden': title ? undefined : 'true', title, role: title ? 'img' : undefined, 'aria-label': title }, '•');
}

/** Valor com ícone e rótulo acessível — substitui "Fama: 42" por ⭐42. */
export function stat(icon: string, value: string | number, label: L | string, cls = ''): HTMLElement {
  const lbl = typeof label === 'string' ? label : t(label);
  return h('span', { class: `stat ${cls}`, title: lbl }, ic(icon), h('b', null, String(value)), h('span', { class: 'sr-only' }, lbl));
}

/** Medidor horizontal com ícone; cor pela faixa (bom/médio/ruim), com padrão para daltônicos. */
export function meter(icon: string, label: L | string, value: number, max = 100, invert = false): HTMLElement {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const good = invert ? pct < 35 : pct > 65;
  const bad = invert ? pct > 70 : pct < 30;
  const lbl = typeof label === 'string' ? label : t(label);
  return h('div', { class: 'meter', title: `${lbl}: ${Math.round(value)}` },
    ic(icon),
    h('span', { class: 'meter-lbl' }, lbl),
    h('span', { class: `meter-bar ${good ? 'good' : bad ? 'bad' : 'mid'}`, role: 'meter', 'aria-label': lbl, 'aria-valuenow': Math.round(value), 'aria-valuemin': 0, 'aria-valuemax': max }, h('span', { style: `width:${pct}%` })),
    h('span', { class: 'meter-val' }, String(Math.round(value))),
  );
}

export function chips(...items: (HTMLElement | null | false | undefined)[]): HTMLElement {
  return h('div', { class: 'chips' }, items.filter(Boolean) as HTMLElement[]);
}

export function tile(icon: string, title: string, body: (Node | string | null)[], opts: { onClick?: () => void; cls?: string; badge?: string; ent?: Record<string, string> } = {}): HTMLElement {
  // r29 (menus): `ent` = marca de clique direito (ent27) — o cartão inteiro abre o menu de ações da entidade
  return h(opts.onClick ? 'button' : 'div', { class: `tile ${opts.cls ?? ''}`, onclick: opts.onClick, ...(opts.ent ?? {}) },
    h('div', { class: 'tile-ic' }, ic(icon, 2)),
    h('div', { class: 'tile-body' }, h('b', null, title), ...(body.filter((x) => x !== null) as Node[])),
    opts.badge ? h('span', { class: 'badge' }, opts.badge) : null,
  );
}

/** Barra empilhada de carga mensal (100% por pessoa). */
export function loadBar(parts: { label: string; load: number; cls?: string }[]): HTMLElement {
  const total = parts.reduce((x, y) => x + y.load, 0);
  return h('div', { class: `loadbar ${total > 100 ? 'over' : ''}`, role: 'img', 'aria-label': `${total}%` },
    parts.map((p, i) => h('span', { class: `seg s${i % 6} ${p.cls ?? ''}`, style: `width:${Math.min(100, p.load)}%`, title: `${p.label} ${p.load}%` })),
    h('em', null, `${total}%`),
  );
}

export function countdown(daysLeft: number): HTMLElement {
  const urgent = daysLeft <= 2;
  return h('span', { class: `countdown ${urgent ? 'bad' : ''}` }, ic('clock'), `${Math.max(0, daysLeft)}d`);
}

export function scoreBadge(score: number): HTMLElement {
  const cls = score >= 8 ? 'good' : score >= 6 ? 'mid' : 'bad';
  return h('span', { class: `score ${cls}`, title: `${score.toFixed(1)}/10` }, score.toFixed(1));
}

export function toneIcon(tone?: string): string {
  return tone === 'good' ? 'chart-up' : tone === 'bad' ? 'warning' : 'sparkle';
}

const KIND_ICON: Record<string, string> = { tour: 'tour-bus', studio: 'mic', crisis: 'newspaper', travel: 'plane', world: 'globe' };

/** Linha do tempo dos dias (turnê, estúdio, crise). */
export function dailyTimeline(s: GameState, actId?: string, max = 14): HTMLElement {
  const items = s.daily.filter((d) => !actId || d.actId === actId).slice(-max).reverse();
  if (!items.length) return h('p', { class: 'muted small' }, t(l('Sem diário de dias nesta semana.', 'No daily log this week.')));
  return h('ol', { class: 'timeline' }, items.map((d) => {
    const date = new Date(Date.UTC(s.config.startYear, 0, 1) + d.day * 86400000);
    return h('li', { class: d.tone ?? '' }, h('span', { class: 'tl-date' }, `${date.getUTCDate()}/${date.getUTCMonth() + 1}`), ic(KIND_ICON[d.kind] ?? 'sparkle'), h('span', null, t(d.text)));
  }));
}

type PortraitFn = (p: Person, size: number) => HTMLElement | null;
let portraitFn: PortraitFn | null = null;
export function registerPortrait(fn: PortraitFn): void {
  portraitFn = fn;
}

/** Retrato da pessoa (pixel art quando disponível; iniciais como reserva). */
export function portrait(p: Person | undefined, size = 40): HTMLElement {
  if (!p) return h('span', { class: 'portrait empty', style: `width:${size}px;height:${size}px` });
  const px = portraitFn?.(p, size);
  if (px) {
    px.classList.add('portrait');
    if (!p.alive) px.classList.add('deceased');
    return px;
  }
  const initials = p.name.split(' ').map((x) => x[0]).slice(0, 2).join('');
  let hue = 0;
  for (const ch of p.id) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return h('span', { class: `portrait ${p.alive ? '' : 'deceased'}`, style: `width:${size}px;height:${size}px;background:hsl(${hue} 45% 45%)`, title: p.name }, initials);
}

/** Abas simples guardadas por chave. */
const tabState: Record<string, string> = {};
/** r27 UX: faixas que a pessoa abriu por inteiro ("+N mais") nesta sessão. */
export function tabs(key: string, items: { id: string; label: string; icon?: string; badge?: number; render: () => HTMLElement }[], rerender: () => void): HTMLElement {
  const cur = tabState[key] && items.some((i) => i.id === tabState[key]) ? tabState[key] : items[0]?.id;
  const active = items.find((i) => i.id === cur);
  tabHook25.f?.(key, items, tabTrail25);
  // R31 (A): toda faixa mostra até 6 abas (as 5 primeiras + a aberta) e o resto num "Mais ▾" (nada some; a busca acha todas)
  const ci = items.findIndex((i) => i.id === cur);
  const shown = new Set(shownTabs31(items.length, ci));
  const hidden = items.filter((_, k) => !shown.has(k));
  const pick = (i: { id: string }) => { tabState[key] = i.id; rerender(); };
  const bar = h('div', { class: 'tabs', role: 'tablist' }, items.map((i, k) => h('button', { role: 'tab', 'aria-selected': i.id === cur ? 'true' : 'false', class: `${i.id === cur ? 'on' : ''} ${shown.has(k) ? '' : 'tab27-x'}`, onclick: () => pick(i) }, i.icon ? ic(i.icon) : null, i.label, i.badge ? h('span', { class: 'badge' }, i.badge) : null)),
    hidden.length ? h('details', { class: 'more31' },
      h('summary', { class: 'tab27-more', 'aria-label': t(l('Mais abas', 'More tabs')), title: hidden.map((i) => i.label).join(' · ') }, t(l('Mais', 'More')), hidden.some((i) => i.badge) ? h('span', { class: 'badge' }, hidden.reduce((a, i) => a + (i.badge ?? 0), 0)) : null, ' ▾'),
      h('div', { class: 'more31-list', role: 'menu' }, hidden.map((i) => h('button', { type: 'button', role: 'menuitem', onclick: () => pick(i) }, i.label, i.badge ? h('span', { class: 'badge' }, i.badge) : null)))) : null);
  // r25: abas dentro de abas — a trilha diz quais abas-mãe estão abertas (a busca global abre o caminho todo)
  tabTrail25.push([key, cur ?? '']);
  let panel: HTMLElement | null = null;
  try { panel = active ? active.render() : null; } finally { tabTrail25.pop(); }
  return h('div', { class: 'tabs-wrap', 'data-tabs': key, 'data-cur': cur }, bar, h('div', { role: 'tabpanel' }, panel));
}
/** r25: trilha de abas abertas durante o desenho e gancho que registra as abas vistas (busca global). */
export const tabTrail25: [string, string][] = [];
export const tabHook25: { f?: (key: string, items: { id: string; label: string; icon?: string }[], trail: [string, string][]) => void } = {};

export function setTab(key: string, id: string): void {
  tabState[key] = id;
}
export const getTab = (key: string): string | undefined => tabState[key];
/** Rodada 15: abas escolhidas (para lembrar entre sessões). */
export const tabSnapshot = (): Record<string, string> => ({ ...tabState });

/** Gráfico de linha simples em SVG (ações, receita). */
export function lineChart(values: number[], w = 260, hgt = 70, name?: string): HTMLElement {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${hgt - ((v - min) / (max - min || 1)) * (hgt - 4) - 2}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('class', 'linechart');
  svg.innerHTML = `<polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts}"/>`;
  nameSvg20(svg, name ?? t(l('Evolução', 'Over time')), values); // r20 B24: nome + resumo acessível
  return svg as unknown as HTMLElement;
}
