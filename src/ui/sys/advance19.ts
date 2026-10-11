// Rodada 19 (onda 5, B.5 — auditoria 8 §5): antes de avançar, a lista de cartões que vão valer a resposta padrão
// ("decidir agora" / "aceitar padrões"), com a opção de não perguntar de novo (Configurações). Também: a seção
// "Por carreira" da aba Políticas (delegação do empresário, festival e estúdio) e o resumo dos avisos agrupados.
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { autoResolve19, dlg19, folded19 } from '../../sim/sys/budget19';
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
  let close = () => {};
  const body = h('div', { class: 'adv19' },
    h('p', null, t(l('{n} cartão(ões) vão valer a resposta padrão se você avançar agora:', '{n} card(s) will take the default answer if you advance now:'), { n: xs.length })),
    h('ul', { class: 'small' }, xs.map((x) => h('li', null, h('b', null, t(x.title)), ' → ', h('i', null, t(x.def)), ' ', h('span', { class: 'muted' }, `(${t(x.why)})`)))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn', onclick: () => { close(); store.area = 'cockpit' as typeof store.area; rerender(); setTimeout(() => document.getElementById('ck14-desk')?.scrollIntoView({ behavior: 'smooth' }), 50); } }, t(l('Decidir agora', 'Decide now'))),
      h('button', { class: 'btn primary', onclick: () => { close(); go(); } }, t(l('Aceitar padrões e avançar', 'Accept defaults and advance')))),
    h('label', { class: 'check small' }, h('input', { type: 'checkbox', onchange: (e: Event) => { store.prefs.ask19 = !(e.target as HTMLInputElement).checked; savePrefs(); } }), ' ', t(l('Não perguntar de novo (dá para religar em Configurações)', 'Do not ask again (re-enable in Settings)'))));
  close = modal(t(l('Antes de avançar', 'Before advancing')), body);
  return true;
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
