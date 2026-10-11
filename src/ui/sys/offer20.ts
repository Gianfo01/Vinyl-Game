// Rodada 20 (G6 §4.5) — oferta de contrato em camadas: três grupos (Dinheiro e prazo / Controle e direitos /
// Compromissos e recuperação), resumo do que cada lado concede, diferença aplicada pelo preset, comparação com até
// duas alternativas (hipótese de receita, nunca previsão) e revisão de caixa livre/reservado antes de enviar.
// O formulário completo continua inteiro ("Formulário completo" abre todos os grupos); nada aqui assina contrato.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { evaluateOffer } from '../../sim/contracts';
import { distributionFee } from '../../sim/market';
import { defaultRights } from '../../sim/rights';
import type { Act, GameState } from '../../sim/types';
import { $, pill } from '../common';
import { h } from '../dom';
import { S } from '../../i18n/strings';
import { compareOffers20, concessions20, review20, rightsDiff20, type Draft20 } from '../ux20';

const put = (el: HTMLElement, ...kids: (Node | null)[]): void => el.replaceChildren(...kids.filter((x): x is Node => !!x));
const mode = { full: false };
try { mode.full = localStorage.getItem('vtn20.offerFull') === '1'; } catch { /* sem armazenamento */ }

const clone = (o: Draft20): Draft20 => ({ ...o, promises: [...o.promises], rights: o.rights ? { ...o.rights } : undefined, pk12: o.pk12 ? { ...o.pk12 } : undefined, clauses18: o.clauses18 ? { ...o.clauses18 } : undefined });
/** Duas alternativas úteis a partir da proposta atual: mais dinheiro agora × mais participação/autonomia ao artista. */
export function alternatives20(o: Draft20): { name: L; o: Draft20 }[] {
  const a = clone(o); a.advance = Math.round((o.advance * 1.25) / 100) * 100; a.royalty = Math.max(0.05, Math.round((o.royalty - 0.02) * 100) / 100);
  const b = clone(o); b.advance = Math.round((o.advance * 0.8) / 100) * 100; b.royalty = Math.min(0.4, Math.round((o.royalty + 0.02) * 100) / 100); b.creativeControl = true;
  return [{ name: l('Mais adiantamento, menos royalty', 'More advance, less royalty'), o: a }, { name: l('Menos adiantamento, mais royalty e controle', 'Less advance, more royalty and control'), o: b }];
}

export interface Layers20 { el: HTMLElement; refresh: () => void; review: HTMLElement }
/** Monta os três grupos ao redor dos campos já existentes do formulário (os mesmos elementos, sem duplicar estado). */
export function offerLayers20(s: GameState, a: Act, o: Draft20, g: { money: HTMLElement[]; control: HTMLElement[]; commit: HTMLElement[] }, evalBox: HTMLElement): Layers20 {
  const sum = h('div', { class: 'of20-sum', 'aria-live': 'polite' });
  const cmp = h('div', { class: 'of20-cmp' });
  const review = h('div', { class: 'rv20' });
  const diffCtl = h('p', { class: 'small of20-diff' });
  let pinned: Draft20 | null = null;
  const grp = (id: string, title: L, hint: L, kids: (HTMLElement | null)[], open: boolean) =>
    h('details', { class: 'of20-grp', 'data-g': id, open: open || mode.full ? true : undefined }, h('summary', null, t(title), ' ', h('small', { class: 'muted' }, t(hint))), ...kids);
  const refresh = () => {
    const base = defaultRights(o.model, o.publishing);
    const diff = o.rights ? rightsDiff20(base, o.rights) : [];
    put(diffCtl, diff.length ? h('span', null, h('b', null, t(l('Diferença do padrão do modelo: ', 'Difference from the model standard: '))), diff.map((x) => t(x)).join(' · ')) : h('span', { class: 'muted' }, t(l('Direitos no padrão do modelo.', 'Rights at the model standard.'))));
    const cs = concessions20(o);
    put(sum, 
      h('div', null, h('b', null, t(l('O selo concede', 'The label gives'))), h('ul', { class: 'small' }, cs.filter((x) => x.side === 'label').map((x) => h('li', null, t(x.t))))),
      h('div', null, h('b', null, t(l('O artista concede', 'The act gives'))), h('ul', { class: 'small' }, cs.filter((x) => x.side === 'artist').map((x) => h('li', null, t(x.t))))),
      diff.length ? h('p', { class: 'small' }, t(l('Preset/ajustes aplicados: {n} cláusula(s) fora do padrão.', 'Preset/edits applied: {n} clause(s) off-standard.'), { n: diff.length })) : null);
    const alts = alternatives20(o);
    if (pinned) alts[1] = { name: l('Sua alternativa guardada', 'Your saved alternative'), o: pinned };
    const xs = [o, ...alts.map((x) => x.o)];
    const rows = compareOffers20(xs, distributionFee(s));
    const band = xs.map((x) => evaluateOffer(s, a, x).band);
    cmp.replaceChildren(
      h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, ''), h('th', { scope: 'col' }, t(l('Atual', 'Current'))), ...alts.map((x) => h('th', { scope: 'col' }, t(x.name))))),
        h('tbody', null, ...rows.map((r) => h('tr', null, h('th', { scope: 'row' }, t(r.k)), ...r.v.map((v) => h('td', null, v)))),
          h('tr', null, h('th', { scope: 'row' }, t(S.chance)), ...band.map((b) => h('td', null, pill(t(S[b]), b)))))),
      h('p', { class: 'muted small' }, t(l('Hipóteses de divisão da receita, não previsão de vendas. A chance é a leitura do artista (faixa, nunca número exato).', 'Revenue-split hypotheses, not a sales forecast. The chance is the act\'s read (a band, never an exact number).'))),
      h('button', { class: 'btn small ghost', onclick: (e: Event) => { e.preventDefault(); pinned = clone(o); refresh(); } }, t(l('Guardar a atual como alternativa', 'Save the current one as an alternative'))));
    const rv = review20(s, o);
    put(review, 
      h('h4', null, t(l('Revisar antes de enviar', 'Review before sending'))),
      h('table', { class: 'tbl compact' }, h('tbody', null,
        h('tr', null, h('th', { scope: 'row' }, t(l('Caixa', 'Cash'))), h('td', null, $(rv.cash))),
        h('tr', null, h('th', { scope: 'row' }, t(l('Reservado em ofertas abertas', 'Reserved in open offers'))), h('td', null, $(rv.reserved))),
        h('tr', null, h('th', { scope: 'row' }, t(l('Livre', 'Free'))), h('td', null, $(rv.free))),
        h('tr', null, h('th', { scope: 'row' }, t(l('Livre depois do adiantamento', 'Free after the advance'))), h('td', { class: rv.after < 0 ? 'bad' : 'good' }, $(rv.after))))),
      rv.debts.length ? h('div', null, h('b', { class: 'small' }, t(l('Gera dívida ou obrigação:', 'Creates debt or obligations:'))), h('ul', { class: 'small' }, rv.debts.map((x) => h('li', null, t(x))))) : null,
      rv.promises.length ? h('p', { class: 'small' }, h('b', null, t(l('Promessas: ', 'Promises: '))), rv.promises.map((x) => t(x)).join(', ')) : null,
      rv.reqs.length ? h('ul', { class: 'small bad', role: 'alert' }, rv.reqs.map((x) => h('li', null, t(x)))) : h('p', { class: 'small good' }, '✓ ', t(l('Requisitos atendidos. Enviar não assina: o artista responde.', 'Requirements met. Sending does not sign: the act answers.'))));
  };
  const el = h('div', { class: 'of20' },
    h('div', { class: 'row wrap' },
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: mode.full, onchange: (e: Event) => { mode.full = (e.target as HTMLInputElement).checked; try { localStorage.setItem('vtn20.offerFull', mode.full ? '1' : '0'); } catch { /* ignora */ } for (const d of el.querySelectorAll<HTMLDetailsElement>('.of20-grp')) d.open = mode.full || d.dataset.g === 'money'; } }),
        ' ', t(l('Formulário completo (abre todos os grupos)', 'Full form (opens every group)')))),
    h('section', { 'aria-label': t(l('Resumo da proposta', 'Offer summary')) }, sum),
    grp('money', l('Dinheiro e prazo', 'Money and term'), l('modelo, adiantamento, royalties, prazo', 'model, advance, royalties, term'), g.money, true),
    grp('control', l('Controle e direitos', 'Control and rights'), l('master, edição, territórios, controle criativo', 'master, publishing, territories, creative control'), [diffCtl, ...g.control], false),
    grp('commit', l('Compromissos e recuperação', 'Commitments and recoupment'), l('promessas, cláusulas recuperáveis, verbas', 'promises, recoupable clauses, budgets'), g.commit, false),
    h('details', { class: 'of20-grp', 'data-g': 'cmp', open: mode.full ? true : undefined }, h('summary', null, t(l('Comparar com alternativas', 'Compare with alternatives'))), cmp),
    evalBox);
  refresh();
  return { el, refresh, review };
}
