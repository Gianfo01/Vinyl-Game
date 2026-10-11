// Rodada 20 (G2, uiux §4.6): Finanças → "Posição". Caixa, competência, AR/AP e obrigações como conceitos separados;
// "Agora" × "Último fechamento" (com data); obrigações consolidadas (empréstimos, credores, títulos, a pagar, reservas,
// compromissos) com detalhe por instrumento; reconciliação simples do caixa. Mesma fonte do Balanço (sim/oblig20).
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { fin18, mIdx18, netProfit18 } from '../../sim/ledger18';
import { freeCash20, lastClose20, position20, recon20, type Pos20 } from '../../sim/oblig20';
import { cov19 } from '../../sim/sys/money19';
import { oblGroups20 } from '../../sim/sys/fin20';
import type { GameState } from '../../sim/types';
import { $, section } from '../common';
import { h } from '../dom';
import { why18 } from '../explain18';
import { registerTab } from '../registry';
import { chips, stat } from '../vis';

const MON: L[] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => l(m, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]));
/** o retrato é tirado no início do mês (y,m): representa o fechamento do mês anterior */
const closedName = (y: number, m: number) => { const pm = (m + 11) % 12, py = m === 0 ? y - 1 : y; return `${t(MON[pm])}/${py}`; };
const num = (v: number, bad = false) => h('td', { class: `num ${bad && v > 0 ? 'bad' : v < 0 ? 'bad' : ''}` }, $(v));

function nowVsClose(s: GameState): HTMLElement {
  const p = position20(s), c = lastClose20(s);
  const rows: [L, keyof Pos20, boolean][] = [
    [l('Caixa', 'Cash'), 'cash', false], [l('A receber', 'Receivables'), 'ar', false], [l('A pagar', 'Payables'), 'ap', true],
    [l('Dívida (empréstimos, credores, títulos)', 'Debt (loans, creditors, bonds)'), 'debt', true], [l('Ativos (valor contábil)', 'Assets (book value)'), 'assets', false],
    [l('Patrimônio líquido', 'Equity'), 'equity', false],
  ];
  return h('div', { class: 'fin20-scroll', style: 'overflow-x:auto;max-width:100%' }, h('table', { class: 'tbl compact fin20-tbl' },
    h('thead', null, h('tr', null, h('th', null, ''), h('th', { class: 'num' }, t(l('Agora', 'Now'))), h('th', { class: 'num' }, c ? `${t(l('Último fechamento', 'Last close'))} (${closedName(c.y, c.m)})` : t(l('Último fechamento', 'Last close'))))),
    h('tbody', null, rows.map(([name, k, bad]) => h('tr', null, h('td', null, k === 'equity' ? why18(s, 'fin.position20', {}, t(name)) : t(name)), num(p[k], bad), c ? num(c[k], bad) : h('td', { class: 'num muted' }, '—'))))));
}

function concepts(s: GameState): HTMLElement {
  const p = position20(s);
  const M = fin18(s).m[mIdx18(s)];
  return chips(
    stat('money', $(p.cash), l('Caixa (dinheiro na conta)', 'Cash (money in the bank)'), p.cash < 0 ? 'bad' : ''),
    stat('chart-up', $(netProfit18(M)), l('Resultado do mês por competência', 'Accrual result this month'), netProfit18(M) < 0 ? 'bad' : ''),
    stat('bank', `${$(p.ar)} / ${$(p.ap)}`, l('A receber / a pagar (ao vivo)', 'Receivable / payable (live)')),
    stat('warning', $(p.debt), l('Obrigações financeiras', 'Financial obligations'), p.debt > 0 ? 'bad' : ''),
    stat('calendar', $(freeCash20(s) - p.committed), l('Caixa livre (após reservas e planos)', 'Free cash (after reserves and plans)'), freeCash20(s) - p.committed < 0 ? 'bad' : ''),
  );
}

function obligations(s: GameState): HTMLElement {
  const gs = oblGroups20(s);
  if (!gs.length) return h('p', { class: 'muted small' }, t(l('Nenhuma obrigação aberta.', 'No open obligations.')));
  const cv = cov19(s);
  return h('div', null,
    gs.map((g) => h('details', { class: 'fin20-grp' },
      h('summary', null, h('b', null, t(g.name)), ' — ', $(g.total), ' ', h('small', { class: 'muted' }, g.liability ? t(l('passivo', 'liability')) : t(l('compromete caixa, não é passivo', 'commits cash, not a liability')))),
      h('ul', { class: 'small' }, g.items.map((o) => h('li', null, typeof o.label === 'string' ? o.label : t(o.label), ': ', h('b', null, $(o.amt)),
        o.monthly ? ` · ${$(o.monthly)}/${t(l('mês', 'mo'))}` : '', o.rate ? ` · ${(o.rate * 100).toFixed(1)}% ${t(l('a.a.', '/yr'))}` : '',
        o.bank ? h('span', { class: 'pill small' }, t(l('covenant bancário', 'bank covenant'))) : null,
        o.note ? h('small', { class: 'muted' }, ' — ', t(o.note)) : null))))),
    h('p', { class: 'small muted' }, t(l('Covenant do banco: conta só empréstimos e o credor banco ({b}); títulos de catálogo e fornecedores ficam fora do contrato, mas entram no balanço.', 'Bank covenant: counts only loans and the bank creditor ({b}); catalog bonds and suppliers are outside the contract but count on the balance sheet.'), { b: $(cv.debt) })),
  );
}

function reconciliation(s: GameState): HTMLElement {
  const r = recon20(s);
  if (!r) return h('p', { class: 'muted small' }, t(l('A reconciliação aparece depois do primeiro fechamento de mês.', 'The reconciliation shows after the first month close.')));
  const line = (name: L, v: number, strong = false) => h('tr', null, h('td', null, strong ? h('b', null, t(name)) : t(name)), h('td', { class: `num ${v < 0 ? 'bad' : ''}` }, strong ? h('b', null, $(v)) : (v > 0 ? '+' : '') + $(v)));
  return h('div', null,
    h('table', { class: 'tbl compact fin20-tbl' }, h('tbody', null,
      line(l('Saldo no fechamento', 'Balance at close'), r.open, true),
      line(l('Operacional', 'Operating'), r.op), line(l('Investimento', 'Investing'), r.inv), line(l('Financiamento', 'Financing'), r.fin),
      Math.abs(r.other) >= 100 ? line(l('Outros ajustes (fora do livro)', 'Other adjustments (off the book)'), r.other) : null,
      line(l('Caixa agora', 'Cash now'), r.now, true))),
    h('p', { class: 'small muted' }, why18(s, 'fin.recon20', {}, t(l('Saldo inicial + entradas − saídas = saldo final. Lucro contábil ≠ variação de caixa (prazos de recebimento, investimentos e empréstimos).', 'Opening + inflows − outflows = closing. Accounting profit ≠ cash change (payment terms, investments and loans).')))));
}

function render(s: GameState): HTMLElement {
  return h('div', { class: 'fin20' },
    section(t(l('Posição: quatro conceitos separados', 'Position: four separate concepts')), concepts(s),
      h('p', { class: 'small muted' }, t(l('Caixa é o que está na conta; competência é o resultado reconhecido (venda feita, mesmo sem dinheiro); a receber/a pagar são prazos; obrigações são dívidas e compromissos.', 'Cash is what is in the bank; accrual is the recognized result (a sale made, even without money); receivable/payable are payment terms; obligations are debts and commitments.')))),
    section(t(l('Agora × Último fechamento', 'Now × Last close')), nowVsClose(s),
      h('p', { class: 'small muted' }, t(l('"Agora" lê o subledger ao vivo; "Último fechamento" é o retrato datado do fim do mês. Os dois nunca se misturam.', '"Now" reads the live subledger; "Last close" is the dated end-of-month snapshot. The two never mix.')))),
    section(t(l('Obrigações consolidadas', 'Consolidated obligations')), obligations(s)),
    section(t(l('Reconciliação do caixa (mês corrente)', 'Cash reconciliation (current month)')), reconciliation(s)),
  );
}

registerTab('business', { id: 'pos20', label: l('Posição', 'Position'), icon: 'money', order: -1, render });
