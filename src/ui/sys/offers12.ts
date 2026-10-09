// Rodada 12 — interface da negociação por pacote: campos novos (aprovação de A&R, verba de turnê e de
// marketing prometidas), o que pesa para o artista e a comparação lado a lado com as propostas rivais.
// `compareTable` e `weightsBox` servem a qualquer papel (o empresário pode reutilizar para os clientes).

import { CONTRACT_MODELS } from '../../data/rules';
import { l } from '../../data/world';
import { t } from '../../i18n/strings';
import { forecastSigning } from '../../sim/sys/explain12';
import { AR_NAME, DIMS, DIM_NAME, comparePackages, packageFromOffer, pledgeOf, rivalPackages, type ArApproval, type Comparison, type DealPackage, type WeightInfo } from '../../sim/sys/offers12';
import { MASTER_NAME, SCOPE_NAME } from '../../sim/rights';
import type { Act, GameState, Offer } from '../../sim/types';
import { $, pill } from '../common';
import { h, select } from '../dom';
import { forecastBox } from './explain12';

type Draft = Omit<Offer, 'id' | 'week' | 'status'>;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Campos do pacote que a ficha antiga não tinha. */
export function packageFields(s: GameState, o: Draft, onChange: () => void): HTMLElement {
  o.pk12 ??= { ar: o.creativeControl ? 'joint' : 'label', tour: 0, mkt: 0 };
  const pk = o.pk12;
  const num = (v: number, set: (x: number) => void) => h('input', { type: 'number', min: 0, step: 100, value: Math.round(v / 100), oninput: (e: Event) => { set(Math.max(0, Math.round(Number((e.target as HTMLInputElement).value) * 100))); onChange(); } });
  return h('fieldset', null, h('legend', null, t(l('Autonomia e compromissos', 'Autonomy and commitments'))),
    h('label', null, t(l('Aprovação de A&R', 'A&R approval')), select<ArApproval>(pk.ar, (['label', 'joint', 'artist'] as ArApproval[]).map((x) => ({ value: x, label: t(AR_NAME[x]) })), (v) => { pk.ar = v; onChange(); })),
    h('label', null, `${t(l('Apoio de turnê prometido', 'Tour support pledged'))} ($)`, num(pk.tour, (v) => (pk.tour = v))),
    h('label', null, `${t(l('Verba de marketing prometida', 'Marketing budget pledged'))} ($)`, num(pk.mkt, (v) => (pk.mkt = v))),
    h('p', { class: 'muted small' }, t(l('A verba prometida sai do caixa em 12 parcelas depois da assinatura e vira fama, embalo e público. Sem caixa numa parcela, é promessa quebrada.', 'Pledged budgets leave your cash in 12 monthly installments after signing and turn into fame, momentum and audience. Missing an installment is a broken promise.'))),
  );
}

/** O que pesa para o artista (barras por bloco + motivos: ambição, sonho, memória). */
export function weightsBox(wi: WeightInfo, known: boolean): HTMLElement {
  if (!known) return h('p', { class: 'muted small' }, t(l('Você ainda não sabe o que pesa para este artista — mais scouting revela as prioridades.', 'You do not yet know what matters to this act — more scouting reveals their priorities.')));
  return h('div', { class: 'small' },
    h('div', { class: 'row wrap' }, DIMS.map((d) => pill(`${t(DIM_NAME[d])} ${pct(wi.w[d])}`, wi.w[d] >= 0.25 ? 'good' : ''))),
    wi.why.length ? h('ul', null, wi.why.map((x) => h('li', null, t(x)))) : null,
  );
}

const term = (p: DealPackage, k: string): string => {
  switch (k) {
    case 'model': return t(CONTRACT_MODELS.find((m) => m.id === p.model)?.name) || p.model;
    case 'advance': return $(p.advance);
    case 'royalty': return pct(p.royalty);
    case 'ar': return t(AR_NAME[p.ar]) + (p.creativeControl ? ` · ${t(l('controle criativo', 'creative control'))}` : '');
    case 'master': return t(MASTER_NAME[p.master]) + (p.master !== 'artist' && p.reversionYears ? ` · ${t(l('reversão {y}a', 'reverts {y}y'), { y: p.reversionYears })}` : '');
    case 'pub': return `${pct(p.pubShare)}${p.share360 ? ` · 360 ${pct(p.share360)}` : ''}`;
    case 'commit': return `${p.albums} ${t(l('discos', 'records'))} · ${p.termMonths}m · ${t(SCOPE_NAME[p.scope])}`;
    case 'pledge': return p.tourSupport + p.marketing ? `${$(p.tourSupport)} + ${$(p.marketing)}` : '—';
    default: return '';
  }
};
const ROWS: [string, ReturnType<typeof l>][] = [
  ['model', l('Modelo', 'Model')], ['advance', l('Adiantamento', 'Advance')], ['royalty', l('Royalty', 'Royalty')], ['ar', l('Autonomia', 'Autonomy')],
  ['master', l('Masters', 'Masters')], ['pub', l('Edição / 360', 'Publishing / 360')], ['commit', l('Compromissos', 'Commitments')], ['pledge', l('Turnê + marketing', 'Tour + marketing')],
];

/** Tabela lado a lado: termos, notas por bloco (pela régua do artista) e prós/contras. */
export function compareTable(cmp: Comparison, showScores = true): HTMLElement {
  const cols = cmp.rows;
  return h('div', { class: 'x12-cmp' },
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, ''), cols.map((r) => h('th', { class: r.pkg.from === 'player' ? 'good' : '' }, `${r.rank}. ${r.pkg.name}`)))),
      h('tbody', null,
        ROWS.map(([k, lab]) => h('tr', null, h('td', { class: 'muted' }, t(lab)), cols.map((r) => h('td', null, term(r.pkg, k))))),
        showScores ? DIMS.map((d) => h('tr', null, h('td', { class: 'muted' }, t(DIM_NAME[d])), cols.map((r) => { const v = r.score.dims[d]; const top = Math.max(...cols.map((c) => c.score.dims[d])); return h('td', { class: v >= top - 0.001 && cols.length > 1 ? 'good' : '' }, `${Math.round(v * 10)}/10`); }))) : null,
        h('tr', null, h('td', { class: 'muted' }, t(l('Prós', 'Pros'))), cols.map((r) => h('td', { class: 'small good' }, r.score.pros.map((x) => t(x)).join(' · ') || '—'))),
        h('tr', null, h('td', { class: 'muted' }, t(l('Contras', 'Cons'))), cols.map((r) => h('td', { class: 'small bad' }, r.score.cons.map((x) => t(x)).join(' · ') || '—'))),
      )),
    h('p', { class: 'small' }, h('b', null, t(cmp.verdict))),
  );
}

/** Coluna lateral da oferta: pesos do artista, propostas rivais lado a lado e previsão. */
export function offerAside12(s: GameState, a: Act, o: Draft): HTMLElement {
  const deg = s.knowledge[a.id]?.degree ?? 0;
  const mine = packageFromOffer(s, o);
  const rivals = rivalPackages(s, a);
  const cmp = comparePackages(s, a, [mine, ...rivals]);
  return h('div', { class: 'x12-aside' },
    h('h4', null, t(l('O que pesa para {a}', 'What matters to {a}'), { a: a.name })),
    weightsBox(cmp.weights, deg >= 2),
    h('h4', null, rivals.length ? t(l('Propostas na mesa', 'Offers on the table')) : t(l('Sua proposta', 'Your offer'))),
    rivals.length && deg < 2 ? h('p', { class: 'muted small' }, t(l('Há rivais na disputa; sem scouting você vê os termos, mas não a régua do artista.', 'Rivals are in the race; without scouting you see their terms, not the act\'s yardstick.'))) : null,
    compareTable(cmp, deg >= 2),
    forecastBox(forecastSigning(s, a, o)),
  );
}

/** Linha do contrato assinado: verba prometida e quanto já saiu. */
export function pledgeLine(s: GameState, a: Act): HTMLElement | null {
  const p = pledgeOf(s, a.contractId);
  if (!p) return null;
  return h('p', { class: 'small' }, pill(t(AR_NAME[p.ar])), ' ', p.tour + p.mkt ? t(l('Verba prometida: {v} ({m}/12 parcelas){b}', 'Pledged budget: {v} ({m}/12 installments){b}'), { v: $(p.tour + p.mkt), m: p.months, b: p.broken ? t(l(' — QUEBRADA', ' — BROKEN')) : '' }) : '');
}
