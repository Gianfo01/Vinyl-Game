// Rodada 29 (REORG, M44) — alertas por categoria: preferências (Opções), filtro da caixa de entrada, bloco do Cockpit e
// ordem dos avisos flutuantes do avanço. Tudo em localStorage (vtn29.alerts), fora do save; nada muda nas regras.

import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { items18 } from '../../sim/sys/inbox18';
import type { GameState } from '../../sim/types';
import { rerender } from '../common';
import { h } from '../dom';
import { ic, setTab } from '../vis';
import { ALERT_CATS29, ALERT_L29, PRIO_L29, alertGroups29, alertPrefs29, type AlertCat29, type AlertItem29, type AlertPrefs29, type AlertPrio29 } from './alerts29model';
import { pill29 } from './shell29';
import { setInboxAlert27 } from '../sys/inbox27';

const KEY = 'vtn29.alerts';
export const loadAlerts29 = (): AlertPrefs29 => { try { return alertPrefs29(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return alertPrefs29(null); } };
export const saveAlerts29 = (p: AlertPrefs29): void => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* sem armazenamento */ } };

const itemsOf = (s: GameState): AlertItem29[] => {
  try { return items18(s).filter((x) => x.cat !== 'decision').map((x) => ({ key: x.key, text: `${x.subject.pt} ${x.body.pt} ${x.subject.en}`, show: t(x.source === 'notification' ? x.body : x.subject), cat: x.cat, prio: x.prio, unread: x.unread })); } catch { return []; }
};

/** Opções › Alertas: liga/desliga e prioridade por categoria. */
export function alertsSettings29(): HTMLElement {
  const p = loadAlerts29();
  return h('fieldset', { class: 'al29-set' }, h('legend', null, t(l('Alertas por categoria', 'Alerts by category'))),
    h('p', { class: 'small muted' }, t(l('Só apresentação: escolhe o que vira destaque e aviso flutuante, e em que ordem. Nada some da caixa de entrada nem do diário, e prazos e respostas padrão não mudam.', 'Presentation only: picks what becomes a highlight and pop-up notice, and in what order. Nothing leaves the inbox or the diary, and deadlines and default answers do not change.'))),
    h('table', { class: 'al29-t' }, h('tbody', null, ALERT_CATS29.map((c) => h('tr', null,
      h('th', { scope: 'row' }, ic(ALERT_L29[c].icon), ' ', t(ALERT_L29[c].label)),
      h('td', null, h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: p[c].on, onchange: (e: Event) => { p[c].on = (e.target as HTMLInputElement).checked; saveAlerts29(p); } }), ' ', t(l('mostrar', 'show')))),
      h('td', null, h('select', { 'aria-label': `${t(ALERT_L29[c].label)}: ${t(l('prioridade', 'priority'))}`, onchange: (e: Event) => { p[c].prio = Number((e.target as HTMLSelectElement).value) as AlertPrio29; saveAlerts29(p); } },
        ([0, 1, 2, 3] as AlertPrio29[]).map((v) => h('option', { value: String(v), selected: p[c].prio === v ? true : undefined }, t(PRIO_L29[v]))))))))),
    h('button', { type: 'button', class: 'btn small ghost', onclick: () => { saveAlerts29(alertPrefs29(null)); rerender(); } }, t(l('Restaurar padrão', 'Restore defaults'))));
}

/** Caixa de entrada: faixa de categorias de alerta (com contagem); a ativa filtra a lista. */
export function alertChips29(s: GameState, cur: AlertCat29 | undefined, set: (a: AlertCat29 | undefined) => void): HTMLElement | null {
  const G = alertGroups29(itemsOf(s), loadAlerts29()).filter((g) => g.total);
  if (!G.length) return null;
  return h('div', { class: 'al29-chips', role: 'group', 'aria-label': t(l('Alertas por categoria', 'Alerts by category')) },
    h('small', { class: 'muted' }, t(l('Alertas:', 'Alerts:'))),
    G.map((g) => h('button', { type: 'button', class: `chip27 al29-c ${cur === g.cat ? 'on' : ''} ${g.on ? '' : 'muted'}`, 'aria-pressed': cur === g.cat ? 'true' : 'false',
      title: g.on ? t(l('Prioridade {p}', 'Priority {p}'), { p: t(PRIO_L29[g.prio]) }) : t(l('Silenciada em Opções (continua aqui)', 'Muted in Options (still here)')),
      onclick: () => set(cur === g.cat ? undefined : g.cat) }, t(ALERT_L29[g.cat].label), ` ${g.unread}/${g.total}`, g.on ? '' : ' 🔕')));
}

/** Cockpit: alertas por categoria, na ordem escolhida; silenciadas contadas numa linha (nunca escondidas). */
export function cockpitAlerts29(s: GameState): HTMLElement | null {
  const G = alertGroups29(itemsOf(s), loadAlerts29());
  const on = G.filter((g) => g.on && g.unread);
  const muted = G.filter((g) => !g.on && g.total);
  if (!on.length && !muted.length) return null;
  const open = (c: AlertCat29) => { setInboxAlert27(c); setTab('ck20', 'inbox'); rerender(); };
  return h('section', { class: 'card al29-ck', 'aria-label': t(l('Alertas por categoria', 'Alerts by category')) },
    h('h3', null, ic('warning'), ' ', t(l('Alertas por categoria', 'Alerts by category'))),
    on.length ? h('ul', { class: 'al29-list' }, on.slice(0, 5).map((g) => h('li', null,
      h('button', { type: 'button', class: 'link', onclick: () => open(g.cat) }, ic(ALERT_L29[g.cat].icon), ' ', h('b', null, t(ALERT_L29[g.cat].label))),
      ' ', pill29(l(`${g.unread} não lida(s)`, `${g.unread} unread`), g.prio >= 3 ? 'bad' : g.prio === 2 ? 'warn' : 'info'),
      g.top ? h('small', { class: 'muted al29-top' }, (g.top.show ?? g.top.text).slice(0, 110)) : null))) : h('p', { class: 'small muted' }, t(l('Nada novo nas categorias ligadas.', 'Nothing new in the categories you follow.'))),
    muted.length ? h('p', { class: 'small muted' }, '🔕 ', t(l('Silenciadas (continuam na caixa): ', 'Muted (still in the inbox): ')),
      muted.map((g, i) => h('button', { type: 'button', class: 'link', onclick: () => open(g.cat) }, i ? ', ' : '', `${t(ALERT_L29[g.cat].label)} (${g.total})`))) : null);
}
