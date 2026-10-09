// Componentes visuais compartilhados: ícone, medidor com ícone, chips de status, cartões,
// barras de carga mensal, linha do tempo diária e contagem regressiva. Menos texto, mais leitura
// rápida (pedido do criador). Ícones em pixel art quando disponíveis; emoji como reserva.

import { l, type L } from '../data/world';
import { t } from '../i18n/strings';
import type { GameState, Person } from '../sim/types';
import { h } from './dom';

const EMOJI: Record<string, string> = {
  money: '💰', fame: '⭐', fans: '👥', disc: '💿', cd: '📀', cassette: '📼', stream: '📶', 'chart-up': '📈', 'chart-down': '📉',
  mic: '🎤', guitar: '🎸', drums: '🥁', calendar: '📅', contract: '📜', warning: '⚠️', heart: '❤️', 'broken-heart': '💔', trophy: '🏆',
  'gold-disc': '🥇', 'platinum-disc': '💿', house: '🏠', 'tour-bus': '🚌', plane: '✈️', ship: '🚢', train: '🚆', newspaper: '📰', tv: '📺',
  radio: '📻', camera: '📷', film: '🎬', gamepad: '🎮', shirt: '👕', handshake: '🤝', gavel: '⚖️', bank: '🏦', hologram: '👻', brain: '🧠',
  flag: '🚩', star: '🎪', note: '🎵', pen: '✍️', vault: '🗄️', bulb: '💡', building: '🏢', rocket: '🚀',
  fire: '🔥', skull: '💀', sleep: '😴', sparkle: '✨', stress: '😣', clock: '⏱', globe: '🌍', lock: '🔒', key: '🔑',
};

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
  return h('span', { class: 'ic-emoji', 'aria-hidden': title ? undefined : 'true', title, role: title ? 'img' : undefined, 'aria-label': title }, EMOJI[name] ?? '•');
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

export function tile(icon: string, title: string, body: (Node | string | null)[], opts: { onClick?: () => void; cls?: string; badge?: string } = {}): HTMLElement {
  return h(opts.onClick ? 'button' : 'div', { class: `tile ${opts.cls ?? ''}`, onclick: opts.onClick },
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
export function tabs(key: string, items: { id: string; label: string; icon?: string; badge?: number; render: () => HTMLElement }[], rerender: () => void): HTMLElement {
  const cur = tabState[key] && items.some((i) => i.id === tabState[key]) ? tabState[key] : items[0]?.id;
  const active = items.find((i) => i.id === cur);
  return h('div', { class: 'tabs-wrap', 'data-tabs': key, 'data-cur': cur },
    h('div', { class: 'tabs', role: 'tablist' }, items.map((i) => h('button', { role: 'tab', 'aria-selected': i.id === cur ? 'true' : 'false', class: i.id === cur ? 'on' : '', onclick: () => { tabState[key] = i.id; rerender(); } }, i.icon ? ic(i.icon) : null, i.label, i.badge ? h('span', { class: 'badge' }, i.badge) : null))),
    h('div', { role: 'tabpanel' }, active ? active.render() : null),
  );
}

export function setTab(key: string, id: string): void {
  tabState[key] = id;
}
export const getTab = (key: string): string | undefined => tabState[key];
/** Rodada 15: abas escolhidas (para lembrar entre sessões). */
export const tabSnapshot = (): Record<string, string> => ({ ...tabState });

/** Gráfico de linha simples em SVG (ações, receita). */
export function lineChart(values: number[], w = 260, hgt = 70): HTMLElement {
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${hgt - ((v - min) / (max - min || 1)) * (hgt - 4) - 2}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`);
  svg.setAttribute('class', 'linechart');
  svg.innerHTML = `<polyline fill="none" stroke="currentColor" stroke-width="2" points="${pts}"/>`;
  return svg as unknown as HTMLElement;
}
