import { formatMoney, formatNumber } from '../core/money';
import { cityById, genreById, type L } from '../data/world';
import { S, getLang, locale, t } from '../i18n/strings';
import type { Act, GameState, Release } from '../sim/types';
import { coverUrl, logoUrl } from './art';
import { h } from './dom';
import { store } from './store';

export const $ = (cents: number) => formatMoney(cents, locale());
export const N = (n: number) => formatNumber(n, locale());

const MONTHS: L[] = [
  { pt: 'Jan', en: 'Jan' }, { pt: 'Fev', en: 'Feb' }, { pt: 'Mar', en: 'Mar' }, { pt: 'Abr', en: 'Apr' },
  { pt: 'Mai', en: 'May' }, { pt: 'Jun', en: 'Jun' }, { pt: 'Jul', en: 'Jul' }, { pt: 'Ago', en: 'Aug' },
  { pt: 'Set', en: 'Sep' }, { pt: 'Out', en: 'Oct' }, { pt: 'Nov', en: 'Nov' }, { pt: 'Dez', en: 'Dec' },
];

export function monthName(m: number): string {
  return t(MONTHS[m]);
}

export function dateLabel(s: GameState): string {
  return `${monthName(s.month)} ${s.year}`;
}

export function genreName(id: string): string {
  return t(genreById[id]?.name) || id;
}

export function cityName(id: string): string {
  return t(cityById[id]?.name) || id;
}

export function ownerName(s: GameState, owner: string | null | undefined): string {
  if (!owner) return t(S.independent);
  if (owner === 'player') return s.config.companyName;
  if (owner === 'indie') return t(S.independent);
  return s.labels[owner]?.name ?? owner;
}

/** Abre a ficha unificada (definida em ficha.ts, registrada no app). */
export const inspect = {
  act: (_id: string) => {},
  release: (_id: string) => {},
  label: (_id: string) => {},
  person: (_id: string) => {},
};

export function actLink(s: GameState, actId: string | undefined, extra = ''): HTMLElement {
  const a = actId ? s.acts[actId] : undefined;
  if (!a) return h('span', { class: 'muted' }, '—');
  const mine = a.owner === 'player';
  return h('button', { class: `link ${mine ? 'mine' : ''} ${extra}`, onclick: (e: Event) => { e.stopPropagation(); inspect.act(a.id); } }, a.name);
}

export function releaseLink(s: GameState, relId: string): HTMLElement {
  const r = s.releases[relId];
  if (!r) return h('span', { class: 'muted' }, '—');
  return h('button', { class: 'link', onclick: (e: Event) => { e.stopPropagation(); inspect.release(r.id); } }, r.title);
}

export function labelLink(s: GameState, owner: string | null | undefined): HTMLElement {
  if (owner && s.labels[owner]) return h('button', { class: 'link', onclick: (e: Event) => { e.stopPropagation(); inspect.label(owner); } }, s.labels[owner].name);
  return h('span', { class: owner === 'player' ? 'mine' : 'muted' }, ownerName(s, owner));
}

export function logo(act: Act, size = 40): HTMLElement {
  return h('img', { class: 'logo', src: logoUrl(act.logoSeed, act.name, act.genre, act.formed, 96), width: size, height: size, alt: '' });
}

export function cover(s: GameState, r: Release, size = 56): HTMLElement {
  const act = s.acts[r.actId];
  const budget = Math.min(1, r.marketingE + 0.2);
  return h('img', { class: 'cover', src: coverUrl(r.coverSeed, r.title, act?.name ?? '', act?.genre ?? 'pop', r.year, budget, 160), width: size, height: size, alt: '' });
}

export function pill(text: string, cls = ''): HTMLElement {
  return h('span', { class: `pill ${cls}` }, text);
}

type Kid = Node | string | null | false | undefined | Kid[];
export function section(title: string, ...children: Kid[]): HTMLElement {
  return h('section', { class: 'card' }, h('h3', null, title), ...(children as never[]));
}

export function kv(label: string, value: Node | string | number): HTMLElement {
  return h('div', { class: 'kv' }, h('span', { class: 'k' }, label), h('span', { class: 'v' }, value as Node));
}

export function modal(title: string, content: HTMLElement, opts: { wide?: boolean; onClose?: () => void } = {}): () => void {
  const prev = document.activeElement as HTMLElement | null;
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    opts.onClose?.();
    prev?.focus?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const overlay = h('div', { class: 'overlay', onclick: (e: Event) => { if (e.target === overlay) close(); } },
    h('div', { class: `modal ${opts.wide ? 'wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('header', null, h('h2', null, title), h('button', { class: 'icon', onclick: close, 'aria-label': t(S.close) }, '✕')),
      h('div', { class: 'modal-body' }, content),
    ),
  );
  document.body.appendChild(overlay);
  document.addEventListener('keydown', onKey);
  (overlay.querySelector('button, input, select') as HTMLElement | null)?.focus();
  return close;
}

export function toast(msg: string, kind = 'info'): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  // avisos repetidos viram um só com contador (×2, ×3...)
  const same = [...host.children].find((c) => (c as HTMLElement).dataset.msg === msg && !c.classList.contains('out')) as HTMLElement | undefined;
  if (same) {
    const n = Number(same.dataset.n ?? '1') + 1;
    same.dataset.n = String(n);
    same.textContent = `${msg} ×${n}`;
    return;
  }
  const el = h('div', { class: `toast ${kind}`, role: 'status', 'data-msg': msg }, msg);
  host.appendChild(el);
  while (host.children.length > 4) host.firstElementChild?.remove();
  setTimeout(() => el.classList.add('out'), 4200);
  setTimeout(() => el.remove(), 4800);
}

export function sparkline(values: number[], w = 120, hgt = 28): HTMLElement {
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${hgt - (v / max) * (hgt - 2) - 1}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(hgt));
  svg.setAttribute('class', 'spark');
  svg.innerHTML = `<polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${pts}"/>`;
  return svg as unknown as HTMLElement;
}

export function rerender(): void {
  store.rerender();
}

export function tl(x: L | undefined): string {
  return t(x);
}

const STATUS: Record<string, L> = {
  emerging: { pt: 'emergente', en: 'emerging' }, active: { pt: 'ativo', en: 'active' }, hiatus: { pt: 'em pausa', en: 'on hiatus' },
  retired: { pt: 'aposentado', en: 'retired' }, split: { pt: 'separado', en: 'split' },
};
export const statusName = (x: string) => t(STATUS[x]) || x;

const STRATEGY: Record<string, L> = {
  develop: { pt: 'desenvolver talentos', en: 'develop talent' }, buy_catalog: { pt: 'comprar catálogos', en: 'buy catalogs' },
  niche: { pt: 'dominar nichos', en: 'own niches' }, stars: { pt: 'disputar estrelas', en: 'chase stars' },
};
export const strategyName = (x: string) => t(STRATEGY[x]) || x;

const PROMISE: Record<string, L> = { priority: { pt: 'prioridade', en: 'priority' }, tour: { pt: 'turnê', en: 'tour' }, freedom: { pt: 'liberdade', en: 'freedom' } };
export const promiseName = (x: string) => t(PROMISE[x]) || x;

const BRANCH: Record<string, L> = { audio: { pt: 'captação e áudio', en: 'capture & audio' }, manufacturing: { pt: 'fabricação', en: 'manufacturing' }, marketing: { pt: 'marketing', en: 'marketing' }, comfort: { pt: 'conforto', en: 'comfort' }, archive: { pt: 'arquivo', en: 'archive' } };
export const branchName = (x: string) => t(BRANCH[x]) || x;

const MEMO_EN: [string, string][] = [
  ['Aluguel da sede', 'HQ rent'], ['Salários', 'Salaries'], ['Terceirização de carreiras', 'Career outsourcing'], ['Manutenção', 'Maintenance'],
  ['Parcela de empréstimo', 'Loan payment'], ['Empréstimo', 'Loan'], ['Participação do investidor', 'Investor share'], ['Investidor', 'Investor'],
  ['Ampliação da sede', 'HQ upgrade'], ['Pedido de scout', 'Scout request'], ['Reprensagem', 'Repress'], ['Venda forçada de equipamento', 'Forced equipment sale'],
  ['Custos de shows ', 'Gig costs '], ['Vendas ', 'Sales '], ['Distribuição ', 'Distribution '], ['Royalties de ', 'Royalties from '], ['Edição ', 'Publishing '],
  ['Gravação ', 'Recording '], ['Lançamento ', 'Release '], ['Cancelado ', 'Cancelled '], ['Shows ', 'Gigs '], ['Adiantamento ', 'Advance '],
  ['Renovação ', 'Renewal '], ['Contratação ', 'Hire '], ['Rescisão ', 'Severance '], ['Impostos ', 'Taxes '], ['Transferência ', 'Transfer '],
  ['Venda de catálogo', 'Catalog sale'], ['Compra de catálogo', 'Catalog purchase'], ['Bônus de renovação', 'Renewal bonus'], ['Bônus', 'Bonus'],
  ['Tratamento', 'Treatment'], ['Terapia', 'Therapy'], ['Cirurgia', 'Surgery'], ['Processo', 'Lawsuit'], ['Indenização', 'Damages'], ['Multa', 'Fine'],
  ['Acordo de sampling', 'Sampling settlement'], ['Condenação', 'Judgment'], ['Mediação', 'Mediation'], ['Remoção', 'Takedown'], ['Urgência', 'Rush fee'],
  ['Versão editada', 'Edited version'], ['Apoio à cena', 'Scene sponsorship'], ['Licença de voz', 'Voice license'], ['Licença de treino', 'Training license'],
  ['Ato sintético', 'Synthetic act'], ['Álbum fantasma', 'Ghost album'], ['Licença', 'License'], ['Reunião', 'Reunion'], ['Residência', 'Residency'],
  ['Substituto', 'Replacement'], ['Writing camp', 'Writing camp'], ['Divulgação (?)', 'Promotion (?)'], ['Sync (master)', 'Sync (master)'], ['Sync (edição)', 'Sync (publishing)'],
];

/** Memos do extrato ficam gravados em PT; traduz o prefixo para EN na exibição. */
export function memoText(memo: string): string {
  if (getLang() !== 'en') return memo;
  for (const [pt, en] of MEMO_EN) if (memo.startsWith(pt)) return en + memo.slice(pt.length);
  return memo;
}
