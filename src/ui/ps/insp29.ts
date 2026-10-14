// Rodada 29 (REORG, S04/S05/M05) — inspetor lateral de um ato no estilo do Atlas: identidade, cinco abas (Formação,
// Projetos, Contratos, Agenda, Saúde), as AÇÕES do menu de contexto (menuSections27 — a mesma fonte do clique direito
// e da ficha) e "Abrir ficha completa". Abas são estado de interface; ações passam pelo executor do ctx27.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import type { GameState } from '../../sim/types';
import { inspect, logo, rerender } from '../common';
import { h } from '../dom';
import { ic } from '../vis';
import { CTXHOOK27, NO_ACTIONS29, ctxMenu27, liveCount29, menuSections27, secOf27 } from './ctx27model';
import { INSP_TABS29, insp29, type InspTab29 } from './insp29model';
import { openTarget29 } from './route29';
import { pill29 } from './shell29';
import './insp29.css';

const ui = { tab: 'lineup' as InspTab29 };
const tx = (x: L | string): string => (typeof x === 'string' ? x : t(x));

/** Inspetor de um ato (null se não existe). `compact` = sem o botão de abrir a ficha (dentro da própria ficha). */
export function insp29View(s: GameState, actId: string, compact = false): HTMLElement | null {
  const M = insp29(s, actId);
  if (!M) return null;
  const a = s.acts[actId];
  const rows = M.tabs[ui.tab];
  let menu: ReturnType<typeof ctxMenu27> = null;
  try { menu = ctxMenu27(s, 'act', actId, CTXHOOK27.env?.(s) ?? {}, a.name); } catch { menu = null; }
  const secs = menu ? menuSections27(menu).filter((x) => x.sec !== 'open') : [];
  return h('section', { class: 'in29i card', 'aria-label': `${t(l('Inspetor', 'Inspector'))}: ${M.name}` },
    h('div', { class: 'in29i-id' }, h('span', { class: 'in29i-logo' }, logo(a, 64)),
      h('div', null, h('h3', null, M.name), h('small', { class: 'muted' }, t(M.kind)), ' ', pill29(M.status.label, M.status.hue))),
    h('div', { class: 'in29i-tabs', role: 'tablist', 'aria-label': t(l('Seções do inspetor', 'Inspector sections')) },
      INSP_TABS29.map((x) => h('button', { type: 'button', role: 'tab', 'aria-selected': ui.tab === x.id ? 'true' : 'false', class: ui.tab === x.id ? 'on' : '',
        onclick: () => { ui.tab = x.id; rerender(); } }, h('span', { 'aria-hidden': 'true' }, ic(x.icon)), ' ', t(x.label), M.tabs[x.id].length ? h('small', null, ` ${M.tabs[x.id].length}`) : null))),
    h('div', { class: 'in29i-body', role: 'tabpanel' },
      rows.length ? h('ul', { class: 'in29i-list' }, rows.map((r) => h('li', null,
        h('div', { class: 'in29i-t' }, r.person ? h('button', { type: 'button', class: 'link', 'data-ent': 'person', 'data-id': r.person, onclick: () => inspect.person?.(r.person!) }, tx(r.title)) : h('b', null, tx(r.title)),
          r.meta ? h('small', { class: 'muted' }, tx(r.meta)) : null),
        r.pill ? pill29(r.pill.label, r.pill.hue) : null,
        r.go ? h('button', { type: 'button', class: 'in29i-go', 'aria-label': t(l('Abrir origem', 'Open source')), onclick: () => openTarget29(r.go!) }, '›') : null)))
        : h('p', { class: 'small muted' }, t(M.empty[ui.tab]))),
    // r29 (menus): nenhuma ação possível agora → "Ações" desabilitado com o motivo (sem painel vazio)
    secs.length && !liveCount29(menu, (x) => secOf27(x) === 'open') ? h('button', { type: 'button', class: 'btn small in29i-acts', disabled: true, 'aria-disabled': 'true', title: t(NO_ACTIONS29), 'data-noacts29': '' }, t(l('Ações', 'Actions')))
    : secs.length ? h('details', { class: 'in29i-acts' }, h('summary', null, t(l('Ações', 'Actions')), h('small', { class: 'muted' }, ` · ${t(l('as mesmas do clique direito', 'same as right-click'))}`)),
      secs.map((sx) => h('div', { class: 'in29i-sec' }, h('small', { class: 'in29i-sech' }, t(sx.label)),
        h('div', { class: 'in29i-btns' }, sx.items.map((it) => h('button', { type: 'button', class: 'btn small ghost', disabled: !!it.block, title: it.block ? t(it.block) : undefined,
          onclick: (e: Event) => { if (menu) CTXHOOK27.run?.(s, menu, it, e.currentTarget as HTMLElement); } }, t(it.label))))))) : null,
    compact ? null : h('button', { ...ent27('act', actId), type: 'button', class: 'btn primary in29i-full', onclick: () => inspect.act(actId) }, ic('book'), ' ', t(l('Abrir ficha completa', 'Open full sheet'))));
}

// S05: o mesmo inspetor como aba "Resumo" na ficha do ato (seus artistas) — uma fonte só, sem botão de abrir a ficha
import { registerPageTab } from '../registry';
import { ent27 } from './ent27';
registerPageTab('act', { id: 'insp29', label: l('Resumo', 'Summary'), icon: 'eye', order: 1,
  when: (s, id) => s.acts[id]?.owner === 'player' || !!s.acts[id]?.playerBand,
  render: (s, id) => insp29View(s, id, true) });
