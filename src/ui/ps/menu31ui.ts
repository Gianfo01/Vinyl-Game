// R31 · onda 1 (A) — desenho do menu "mundo primeiro" (o modelo é ps/menu31.ts; o Hoje é ps/hoje31model.ts).
// Peças: menu lateral de entradas (≤ 10), faixa "Lugares" sob a área-base de cada entrada, faixa das Listas (≤ 6 abas +
// "Mais ▾"), faixa de páginas do lugar, o painel "Hoje" (3 perguntas + linha do tempo) e o "Menu completo" (árvore
// clássica, pela Opções). Tudo só lê o jogo; aberto/fechado e filtros são conveniência deste navegador.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { h } from '../dom';
import { ic } from '../vis';
import { CAL19_ICON } from '../../sim/calendar19';
import {
  LIST_TABS31, TABS_MAX31, entryLabel31, listTabOf31, menu31, placeOf31, shownTabs31,
  type Entry31, type EntryId31, type ListTab31, type MenuCtx31, type Place31,
} from './menu31';
import { TL_FILTERS31, filterTl31, type Go31, type Hoje31, type Row31, type TlFilter31 } from './hoje31model';
import './menu31.css';

const tx = (x: L | string | undefined): string => (x === undefined ? '' : typeof x === 'string' ? x : t(x));

// ---------------------------------------------------------------- preferência "Menu completo" (por pessoa)
const FULL_KEY = 'vtn31.fullMenu';
let full: boolean | null = null;
/** "Menu completo" ligado? (padrão: desligado) */
export function fullMenu31(): boolean {
  if (full !== null) return full;
  try { full = localStorage.getItem(FULL_KEY) === '1'; } catch { full = false; }
  return full;
}
export function setFullMenu31(v: boolean): void { full = v; try { localStorage.setItem(FULL_KEY, v ? '1' : '0'); } catch { /* sem armazenamento */ } }

// ---------------------------------------------------------------- ganchos para outras frentes
/** Itens extras do topo (ex.: busca, favoritos, metas — frente O). Cada função devolve um elemento ou null. */
export const TOPBAR31: ((s: unknown) => HTMLElement | null)[] = [];
/** Itens extras do menu lateral, depois das entradas (ex.: Editor — frente EDT). Não contam no teto de 10 entradas
 *  quando são ferramentas de teste; quem registrar deve manter o menu curto. */
export const NAVEXTRA31: ((s: unknown) => HTMLElement | null)[] = [];

// ---------------------------------------------------------------- menu lateral
export interface PageItem31 { id: string; label: string; icon: string }
export interface NavCtx31 {
  menu: MenuCtx31;
  /** página aberta */
  area: string;
  /** contadores por entrada (pendências únicas) */
  badge: Partial<Record<EntryId31, number>>;
  company: string;
  open: (e: Entry31) => void;
  pins: PageItem31[];
  houses: PageItem31[];
  go: (area: string) => void;
  /** seções da árvore clássica (só com o "Menu completo" ligado) */
  fullTree?: () => HTMLElement[];
  foot?: HTMLElement | null;
}

export function nav31(c: NavCtx31): HTMLElement {
  const cur = placeOf31(c.area, c.menu).entry;
  const entries = menu31(c.menu);
  const head = (e: Entry31): HTMLElement => {
    const on = e.id === cur || (e.id === 'listas' && cur === 'listas');
    const n = c.badge[e.id] ?? 0;
    const lbl = t(e.label);
    const pop = e.util === 'pins' || e.util === 'houses';
    const box: HTMLElement = h('div', { class: `nav-group nav31-e ${on ? 'open' : ''} ${e.cond ? 'nav31-cond' : ''} ${e.util ? 'nav31-util' : ''}`, 'data-entry31': e.id });
    const btn = h('button', { type: 'button', class: `nav-head ${on ? 'on' : ''}`, 'aria-current': on ? 'true' : undefined, title: e.key ? `${lbl} (Shift+${e.key})` : lbl,
      'aria-expanded': pop ? 'false' : undefined,
      'aria-label': n ? `${lbl}: ${n} ${t(n === 1 ? l('pendência', 'pending item') : l('pendências', 'pending items'))}` : lbl,
      onclick: () => {
        if (!pop) { c.open(e); return; }
        const now = !box.classList.contains('exp31');
        box.classList.toggle('exp31', now); btn.setAttribute('aria-expanded', now ? 'true' : 'false');
      } },
    h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(e.icon, 2)), h('span', { class: 'lbl' }, lbl), n ? h('span', { class: 'badge' }, n) : null);
    box.append(btn);
    if (pop) {
      const xs = e.util === 'pins' ? c.pins : c.houses;
      box.append(h('ul', { class: 'nav31-pop', role: 'group', 'aria-label': lbl }, xs.map((x) => h('li', null,
        h('button', { type: 'button', class: `nav31-pg ${x.id === c.area ? 'on' : ''}`, onclick: () => c.go(x.id) }, h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(x.icon)), h('span', { class: 'lbl' }, x.label))))));
    }
    return box;
  };
  const fixed = entries.filter((e) => !e.cond);
  const cond = entries.filter((e) => e.cond);
  const fullOn = fullMenu31() && c.fullTree;
  return h('nav', { class: 'nav grouped nav25 nav31', 'aria-label': 'menu' },
    h('div', { class: 'nav-brand21', 'aria-hidden': 'true' }, h('span', { class: 'disc-sm' }), h('span', null, h('b', null, c.company))),
    fixed.map(head),
    cond.length ? h('div', { class: 'nav31-sep', 'aria-hidden': 'true' }) : null,
    cond.map(head),
    ...NAVEXTRA31.map((f) => { try { return f(c); } catch { return null; } }),
    fullOn ? h('div', { class: 'nav31-full' }, h('small', { class: 'nav-sec' }, t(l('Menu completo', 'Full menu'))), ...c.fullTree!()) : null,
    c.foot ?? null);
}

// ---------------------------------------------------------------- faixa "Lugares"
export interface Places31Ctx { entry: EntryId31; menu: MenuCtx31; places: Place31[]; badge: Record<string, number>; label: (area: string) => string; go: (area: string, tab?: [string, string]) => void }
export function placesStrip31(c: Places31Ctx): HTMLElement | null {
  if (!c.places.length) return null;
  const title = fmt(l('Lugares — {e}', 'Places — {e}'), { e: t(entryLabel31(c.entry, c.menu)) });
  return h('section', { class: 'places31', 'aria-label': title },
    h('h2', { class: 'places31-h' }, title),
    h('ul', { class: 'places31-grid' }, c.places.map((p) => {
      const n = c.badge[p.id] ?? 0;
      const [main, ...rest] = p.areas;
      return h('li', { class: `place31 ${n ? 'has-pend' : ''} ${p.career ? 'is-career' : ''}`, 'data-place31': p.id },
        h('button', { type: 'button', class: 'place31-main', onclick: () => c.go(main, p.tab) },
          h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(p.icon, 2)),
          h('span', { class: 'place31-name' }, p.career ? '★ ' : '', t(p.label)),
          n ? h('span', { class: 'badge', title: n === 1 ? t(l('1 coisa espera você aqui', '1 thing waits for you here')) : fmt(l('{n} coisas esperam você aqui', '{n} things wait for you here'), { n }) }, n) : null),
        h('span', { class: 'place31-links' },
          h('button', { type: 'button', class: 'link', onclick: () => c.go(main, p.tab) }, t(l('ver detalhes', 'see details'))),
          ...rest.map((a) => h('button', { type: 'button', class: 'link muted', onclick: () => c.go(a) }, c.label(a)))));
    })));
}
const fmt = (x: L | string, v: Record<string, string | number>): string => Object.entries(v).reduce((a, [k, w]) => a.split(`{${k}}`).join(String(w)), tx(x));

// ---------------------------------------------------------------- faixa das Listas e do lugar
export interface Sub31Ctx { area: string; menu: MenuCtx31; has: (area: string) => boolean; label: (area: string) => string; go: (area: string) => void; extra: string[] }
/** Abas das Listas (≤ 6 + "Mais ▾") quando a página é uma lista; senão, as páginas do lugar (quando há mais de uma). */
export function subnav31(c: Sub31Ctx): HTMLElement | null {
  const lt = listTabOf31(c.area) ?? (c.extra.includes(c.area) ? LIST_TABS31.find((x) => x.id === 'other') : undefined);
  if (lt) return listsBar31(c, lt);
  const p = placeOf31(c.area, c.menu);
  const pages = p.areas.filter((a) => c.has(a));
  if (pages.length < 2) return null;
  return h('div', { class: 'tabs25 views27 sub31', role: 'tablist', 'aria-label': t(p.label) },
    h('span', { class: 'views27-hub', 'aria-hidden': 'true' }, ic(p.icon), h('b', null, t(p.label))),
    pages.map((a) => chip(c, a)));
}
const chip = (c: Sub31Ctx, a: string): HTMLElement => h('button', { role: 'tab', 'aria-selected': c.area === a ? 'true' : 'false', class: `btn25 ${c.area === a ? 'on' : ''}`, onclick: () => c.go(a) }, h('span', { class: 'lbl' }, c.label(a)));

const lastList: Record<string, string> = {};
/** Página que a aba das Listas abre: a última vista nela (se ainda existe) ou a 1ª visível. */
export function listHome31(tab: ListTab31, has: (a: string) => boolean, extra: string[] = []): string | undefined {
  const areas = (tab.id === 'other' ? extra : tab.areas).filter(has);
  return lastList[tab.id] && areas.includes(lastList[tab.id]) ? lastList[tab.id] : areas[0];
}
let lastTab31 = 'artists';
/** Área que a entrada Listas abre: a última lista vista. */
export function listsHome31(has: (a: string) => boolean, extra: string[] = []): string {
  const tab = LIST_TABS31.find((x) => x.id === lastTab31) ?? LIST_TABS31[0];
  return listHome31(tab, has, extra) ?? LIST_TABS31.map((x) => listHome31(x, has, extra)).find((x) => !!x) ?? 'charts';
}

function listsBar31(c: Sub31Ctx, cur: ListTab31): HTMLElement {
  lastList[cur.id] = c.area;
  lastTab31 = cur.id;
  const tabs = LIST_TABS31.filter((x) => (x.id === 'other' ? c.extra : x.areas).some(c.has));
  const ci = tabs.findIndex((x) => x.id === cur.id);
  const main = tabs.filter((x) => !x.more);
  const shown = new Set(shownTabs31(main.length, main.findIndex((x) => x.id === cur.id)).map((i) => main[i]?.id));
  const visible = tabs.filter((x) => shown.has(x.id) || x.id === cur.id).slice(0, TABS_MAX31);
  const more = tabs.filter((x) => !visible.includes(x));
  void ci;
  const tabBtn = (x: ListTab31) => h('button', { role: 'tab', 'aria-selected': x.id === cur.id ? 'true' : 'false', class: `btn25 ${x.id === cur.id ? 'on' : ''}`, onclick: () => { const a = listHome31(x, c.has, c.extra); if (a) c.go(a); } },
    h('span', { class: 'ic', 'aria-hidden': 'true' }, ic(x.icon)), h('span', { class: 'lbl' }, t(x.label)));
  const pages = (cur.id === 'other' ? c.extra : cur.areas).filter(c.has);
  return h('div', { class: 'lists31' },
    h('div', { class: 'tabs25 pages27 lists31-tabs', role: 'tablist', 'aria-label': t(l('Listas', 'Lists')) },
      visible.map(tabBtn),
      more.length ? moreMenu31(more.map((x) => ({ label: t(x.label), run: () => { const a = listHome31(x, c.has, c.extra); if (a) c.go(a); } }))) : null),
    pages.length > 1 ? h('div', { class: 'tabs25 views27 sub31', role: 'tablist', 'aria-label': t(cur.label) }, pages.map((a) => chip(c, a))) : null);
}

/** "Mais ▾": menu curto com o que não coube na faixa. */
export function moreMenu31(items: { label: string; on?: boolean; run: () => void }[]): HTMLElement {
  return h('details', { class: 'more31' },
    h('summary', { class: 'btn25', 'aria-label': t(l('Mais abas', 'More tabs')) }, t(l('Mais', 'More')), ' ▾'),
    h('div', { class: 'more31-list', role: 'menu' }, items.map((x) => h('button', { type: 'button', role: 'menuitem', class: x.on ? 'on' : '',
      onclick: (e: Event) => { (e.currentTarget as HTMLElement).closest('details')?.removeAttribute('open'); x.run(); } }, x.label))));
}

// ---------------------------------------------------------------- Hoje
let tlFilter: TlFilter31 = 'all';
export function hoje31View(m: Hoje31, week: number, go: (g: Go31) => void, place: (area: string) => string): HTMLElement {
  const row = (r: Row31): HTMLElement => h('li', { class: `h31-row ${r.tone ? 't-' + r.tone : ''}` },
    r.go ? h('button', { type: 'button', class: 'h31-go', onclick: () => go(r.go!) }, h('b', null, tx(r.title)), r.meta ? h('small', null, tx(r.meta)) : null)
      : h('span', { class: 'h31-go' }, h('b', null, tx(r.title)), r.meta ? h('small', null, tx(r.meta)) : null),
    r.aside ? h('span', { class: 'h31-aside' }, tx(r.aside)) : null);
  const col = (id: string, title: L, rows: Row31[], empty: L, extra?: HTMLElement | null) => h('section', { class: `h31-col h31-${id}`, 'aria-labelledby': `h31-${id}-h` },
    h('h2', { id: `h31-${id}-h`, class: 'h31-h' }, t(title), id === 'decide' && rows.length ? h('span', { class: 'badge' }, rows.length) : null),
    rows.length ? h('ul', { class: 'h31-list' }, rows.slice(0, 6).map(row)) : h('p', { class: 'muted small' }, t(empty)),
    rows.length > 6 ? h('p', { class: 'small muted' }, fmt(l('+{n} na lista completa', '+{n} in the full list'), { n: rows.length - 6 })) : null,
    extra ?? null);
  // as pendências mostram onde são resolvidas (o lugar dono)
  const decideRows = m.decide.map((r) => ({ ...r, meta: r.meta ?? (r.go?.area ? place(r.go.area) : undefined) }));
  const tl = h('div', { class: 'h31-tl-body' });
  const drawTl = (): void => {
    const xs = filterTl31(m.timeline, tlFilter);
    const weeks = new Map<number, typeof xs>();
    for (const x of xs) { const k = Math.max(0, x.w - week); weeks.set(k, [...(weeks.get(k) ?? []), x]); }
    tl.replaceChildren(xs.length
      ? h('ol', { class: 'h31-weeks' }, [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([k, items]) => h('li', { class: 'h31-week' },
        h('span', { class: 'h31-wk' }, k === 0 ? t(l('Esta semana', 'This week')) : fmt(l('+{n} sem.', '+{n} wk'), { n: k })),
        h('ul', null, items.map((x) => h('li', { class: `h31-ev ${x.tone ? 't-' + x.tone : ''} ${x.act ? 'is-act' : ''}` },
          x.go ? h('button', { type: 'button', class: 'link', onclick: () => go(x.go!) }, h('span', { 'aria-hidden': 'true' }, CAL19_ICON[x.kind] ?? '◆', ' '), t(x.title))
            : h('span', null, h('span', { 'aria-hidden': 'true' }, CAL19_ICON[x.kind] ?? '◆', ' '), t(x.title))))))))
      : h('p', { class: 'muted small' }, t(l('Nada marcado nesse filtro nas próximas 12 semanas.', 'Nothing booked for this filter in the next 12 weeks.'))));
    filt.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === tlFilter ? 'true' : 'false'));
  };
  const filt = h('div', { class: 'h31-filters', role: 'group', 'aria-label': t(l('Filtro da linha do tempo', 'Timeline filter')) },
    TL_FILTERS31.map((f) => h('button', { type: 'button', class: 'btn small ghost', 'data-f': f.id, 'aria-pressed': f.id === tlFilter ? 'true' : 'false', onclick: () => { tlFilter = f.id; drawTl(); } }, t(f.label))));
  drawTl();
  return h('div', { class: 'h31' },
    h('div', { class: 'h31-cols' },
      col('decide', l('Decidir agora', 'Decide now'), decideRows, l('Nada pede você agora: dá para avançar.', 'Nothing needs you now: you can advance.'),
        m.suggest.length ? h('div', { class: 'h31-suggest' }, h('small', { class: 'muted' }, t(l('Sugestões do mês (não contam como pendência):', 'Suggestions this month (not counted as pending):'))), h('ul', { class: 'h31-list' }, m.suggest.map(row))) : null),
      col('ongoing', l('Em andamento', 'In progress'), m.ongoing, l('Nenhum projeto, sessão ou lançamento em andamento.', 'No project, session or release in progress.')),
      col('changed', l('O que mudou', 'What changed'), m.changed, l('Ainda nada: avance o tempo para ver o resumo.', 'Nothing yet: advance time to see the summary.'))),
    h('section', { class: 'h31-tl', 'aria-labelledby': 'h31-tl-h' },
      h('div', { class: 'h31-tl-head' }, h('h2', { id: 'h31-tl-h', class: 'h31-h' }, t(l('Linha do tempo (12 semanas)', 'Timeline (12 weeks)'))), filt),
      tl));
}
