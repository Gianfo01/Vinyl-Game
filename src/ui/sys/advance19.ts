// Rodada 19 (onda 5, B.5 — auditoria 8 §5): antes de avançar, a lista de cartões que vão valer a resposta padrão
// ("decidir agora" / "aceitar padrões"), com a opção de não perguntar de novo (Configurações). Também: a seção
// "Por carreira" da aba Políticas (delegação do empresário, festival e estúdio) e o resumo dos avisos agrupados.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { autoResolve19, dlg19, folded19, type Auto19 } from '../../sim/sys/budget19';
import { isActive } from '../../sim/sys/careers12';
import { liveOf } from '../../sim/sys/live';
import { studios } from '../../sim/sys/studio12';
import { ventures } from '../../sim/sys/ventures9';
import type { GameState } from '../../sim/types';
import { modal, rerender, section } from '../common';
import { h } from '../dom';
import { savePrefs, store } from '../store';
import { POLICY19 } from './long18';

type Mode = 'week' | 'month' | 'quarter' | 'event' | 'until';
/** true = abriu o diálogo (o avanço espera a resposta e chama `go`). */
export function askAdvance19(g: GameState, mode: Mode, go: () => void): boolean {
  if (store.prefs.ask19 === false) return false;
  const xs = autoResolve19(g, mode);
  if (!xs.length) return false;
  // r21e (§2.3.13): quando todas as decisões pendentes têm opção padrão (já mostrada em cada cartão do Cockpit),
  // a confirmação é uma linha presa ao próprio botão Avançar, não um diálogo
  const allDefault = g.decisions.every((d) => d.options.some((o) => o.id === d.defaultOption));
  const anchor = document.activeElement instanceof HTMLButtonElement && document.activeElement.closest('.topbar') ? document.activeElement : document.querySelector<HTMLButtonElement>('.topbar .advance button.primary, .topbar button.primary');
  if (allDefault && anchor && !document.querySelector('.overlay')) { confirmPop21(xs, anchor, go); return true; }
  let close = () => {};
  const body = h('div', { class: 'adv19' },
    h('p', null, t(l('{n} cartão(ões) vão valer a resposta padrão se você avançar agora:', '{n} card(s) will take the default answer if you advance now:'), { n: xs.length })),
    h('ul', { class: 'small' }, xs.map((x) => h('li', null, h('b', null, t(x.title)), ' → ', h('i', null, t(x.def)), ' ', h('span', { class: 'muted' }, `(${t(x.why)})`)))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => { close(); store.area = 'cockpit' as typeof store.area; rerender(); setTimeout(() => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' }), 50); } }, t(l('Decidir agora', 'Decide now'))),
      h('button', { class: 'btn primary', onclick: () => { close(); go(); } }, t(l('Avançar e aceitar {n} padrão(ões)', 'Advance and accept {n} default(s)'), { n: xs.length }))),
    askLine21()); // r21 (§2.3.13): o "não perguntar" em destaque
  close = modal(t(l('Antes de avançar', 'Before advancing')), body);
  return true;
}

const askLine21 = (): HTMLElement => h('label', { class: 'check adv19-ask21' }, h('input', { type: 'checkbox', onchange: (e: Event) => { store.prefs.ask19 = !(e.target as HTMLInputElement).checked; savePrefs(); } }), ' ', h('b', null, t(l('Não perguntar de novo', 'Do not ask again'))), ' ', h('small', { class: 'muted' }, t(l('(o padrão já aparece em cada cartão do Cockpit; dá para religar em Configurações)', '(the default is already shown on each Cockpit card; re-enable in Settings)'))));

/** r21e (§2.3.13): confirmação presa ao botão Avançar — "Avançar e aceitar N padrões", "Decidir agora" e o "não perguntar"
 *  em destaque. Escape, clique fora ou Tab para fora fecham sem avançar. */
function confirmPop21(xs: Auto19[], anchor: HTMLButtonElement, go: () => void): void {
  document.querySelector('.adv21-pop')?.remove();
  const pop = h('div', { class: 'adv21-pop', role: 'dialog', 'aria-modal': 'false', 'aria-label': t(l('Antes de avançar', 'Before advancing')) },
    h('p', { class: 'small' }, h('b', null, t(l('{n} decisão(ões) vão valer o padrão:', '{n} decision(s) will take the default:'), { n: xs.length }))),
    h('ul', { class: 'small' }, xs.slice(0, 4).map((x) => h('li', null, t(x.title), ' → ', h('i', null, t(x.def)))), xs.length > 4 ? h('li', { class: 'muted' }, t(l('+{n} outras', '+{n} more'), { n: xs.length - 4 })) : null),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn primary', onclick: () => { close(); go(); } }, t(l('Avançar e aceitar {n} padrão(ões)', 'Advance and accept {n} default(s)'), { n: xs.length })),
      h('button', { class: 'btn ghost', onclick: () => { close(); store.area = 'cockpit' as typeof store.area; rerender(); setTimeout(() => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' }), 50); } }, t(l('Decidir agora', 'Decide now')))),
    askLine21());
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); anchor.focus(); } };
  const onDown = (e: Event) => { if (!pop.contains(e.target as Node) && e.target !== anchor) close(); };
  const onFocus = (e: FocusEvent) => { if (!pop.contains(e.target as Node) && e.target !== anchor) close(); };
  function close(): void {
    if (!pop.isConnected) return;
    pop.remove();
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('focusin', onFocus, true);
    anchor.setAttribute('aria-expanded', 'false');
  }
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect(), w = pop.offsetWidth || 420;
  pop.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
  pop.style.top = `${r.bottom + 6}px`;
  anchor.setAttribute('aria-expanded', 'true');
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('focusin', onFocus, true);
  (pop.querySelector('button.primary') as HTMLElement | null)?.focus();
}

/** Linha para o diálogo de Configurações. */
export const settings19 = (): HTMLElement => h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: store.prefs.ask19 !== false, onchange: (e: Event) => { store.prefs.ask19 = (e.target as HTMLInputElement).checked; savePrefs(); } }), t(l('Avisar antes de avançar quando cartões vão valer o padrão', 'Warn before advancing when cards will take the default')));

/** Avisos menores agrupados neste mês (lista completa do "Resumo do mês"). */
export function folded19View(s: GameState): HTMLElement | null {
  const xs = folded19(s);
  if (!xs.length) return null;
  return h('details', { class: 'small' }, h('summary', null, t(l('Resumo do mês: {n} aviso(s) menor(es)', 'Monthly summary: {n} minor notice(s)'), { n: xs.length })), h('ul', null, xs.slice().reverse().map((x) => h('li', null, t(x.t)))));
}

const chk = (on: boolean, flip: () => void) => h('input', { type: 'checkbox', checked: on, onchange: () => { flip(); rerender(); } });
const row = (label: string, help: string, el: HTMLElement) => h('div', { class: 'lg18-pol' }, h('label', null, h('b', null, label), ' ', el), h('small', { class: 'muted' }, help));
POLICY19.push((s) => {
  const D = dlg19(s);
  const mg = isActive(s, 'manager') || ventures(s).mg.clients.length > 0, fe = liveOf(s).fests.length > 0, st = studios(s).length > 0;
  if (!mg && !fe && !st) return null;
  return section(t(l('Por carreira (a equipe age e só sobe exceções)', 'Per career (staff acts and only raises exceptions)')),
    mg ? row(t(l('Empresário: renovar mandatos', 'Manager: renew mandates')), t(l('A 8 semanas do fim, a equipe propõe os mesmos termos. Abaixo da confiança mínima, volta para você.', '8 weeks before the end, staff offers the same terms. Below minimum trust, it comes back to you.')), chk(D.mg, () => (D.mg = !D.mg))) : null,
    mg ? row(t(l('Confiança mínima do cliente', 'Minimum client trust')), '', h('input', { type: 'number', min: 0, max: 100, step: 5, value: D.mgTrust, onchange: (e: Event) => { D.mgTrust = Number((e.target as HTMLInputElement).value) || 0; } })) : null,
    fe ? row(t(l('Festival: aceitar patrocínios', 'Festival: accept sponsorships')), t(l('Só quando a meta de público do patrocinador cabe em 90% da projeção.', 'Only when the sponsor\'s crowd target fits within 90% of the projection.')), chk(D.fsp, () => (D.fsp = !D.fsp))) : null,
    fe ? row(t(l('Festival: fechar headliner', 'Festival: book a headliner')), t(l('A 5 meses da edição, sem headliner: a equipe fecha o maior nome cujo adiantamento (30%) caiba no teto do caixa.', '5 months out with no headliner: staff books the biggest name whose 30% advance fits the cash cap.')), chk(D.fhead, () => (D.fhead = !D.fhead))) : null,
    fe ? row(t(l('Teto do adiantamento (fração do caixa)', 'Advance cap (share of cash)')), '', h('input', { type: 'number', min: 0.05, max: 1, step: 0.05, value: D.fcap, onchange: (e: Event) => { D.fcap = Number((e.target as HTMLInputElement).value) || 0.25; } })) : null,
    st ? row(t(l('Estúdio: aceitar sessões', 'Studio: accept sessions')), t(l('Com sala e engenheiro livres, a equipe aceita; sem, sobe a exceção.', 'With a free room and engineer staff accepts; otherwise it raises an exception.')), chk(D.st, () => (D.st = !D.st))) : null,
    h('p', { class: 'small muted' }, t(l('Feito pela equipe: {d} · exceções: {e}', 'Done by staff: {d} · exceptions: {e}'), { d: D.n.done, e: D.n.exc })));
});
