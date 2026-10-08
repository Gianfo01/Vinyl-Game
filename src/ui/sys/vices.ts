// Interface da "Vida intensa" (rodada 7): vícios com dependência, reabilitação, viagens e empréstimos
// pessoais (aba em Você) e empréstimos da empresa com credores diferentes (aba em Negócios).

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { CO_LENDERS, LENDERS, TRIPS, VICE_INFO, companyLoanBlocker, drugName, goToRehab, indulge, personalLoanBlocker, rehabCost, repayPersonalLoan, takeCompanyLoan, takePersonalLoan, takeTrip, toggleSmoking, tripBlocker, vices, type CoLenderId, type LenderId, type ViceId } from '../../sim/sys/vices';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { money, rngOf } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { bar, h, select } from '../dom';
import { registerTab } from '../registry';

const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); rerender(); };
const form = { lender: 'bank' as LenderId, amount: 5000 };

export function vicesTab(s: GameState): HTMLElement {
  const v = vices(s);
  const o = ownerOf(s);
  const inRehab = !!v.rehab && v.rehab.until > s.week;
  const depRow = (k: ViceId) => h('li', null, h('span', null, t(VICE_INFO[k].name)), bar(v.dep[k], 100, v.dep[k] > 60 ? 'bad' : v.dep[k] > 30 ? 'warn' : ''), h('small', null, v.dep[k] > 60 ? t(l('dependência', 'addicted')) : v.dep[k] > 30 ? t(l('hábito', 'habit')) : v.dep[k] > 5 ? t(l('de vez em quando', 'now and then')) : t(l('limpo', 'clean'))));
  const lenderMax = LENDERS[form.lender].max(s);
  const amount = money(s, form.amount);
  const loanErr = personalLoanBlocker(s, form.lender, amount);
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' },
      section(t(l('Vícios e válvulas de escape', 'Vices and escapes')),
        h('p', { class: 'muted small' }, t(l('Aliviam o estresse agora e cobram depois: dependência, saúde, gastos, polícia e manchetes. Dependência alta vira o traço Dependente; ficar um ano limpo vira Sóbrio.', 'They relieve stress now and charge later: addiction, health, spending, police and headlines. High dependence becomes the Addicted trait; a clean year becomes Sober.'))),
        h('div', { class: 'kv-grid small' }, h('div', null, t(l('Estresse', 'Stress')), ' ', bar(o.stress, 100, o.stress > 70 ? 'bad' : '')), h('div', null, t(l('Saúde', 'Health')), ' ', bar(o.health, 100, o.health < 35 ? 'bad' : 'good'))),
        h('ul', { class: 'attr-list' }, (['smoke', 'drink', 'drugs'] as ViceId[]).map(depRow)),
        inRehab ? h('p', null, pill(t(l('na reabilitação', 'in rehab')), 'good'), ' ', t(l('até a semana {w}', 'until week {w}'), { w: v.rehab!.until })) : h('div', { class: 'row wrap' },
          h('button', { class: `btn small ${v.smoking ? 'primary' : ''}`, title: t(VICE_INFO.smoke.desc), onclick: () => say(toggleSmoking(s)) }, v.smoking ? t(l('Parar de fumar', 'Quit smoking')) : t(l('Fumar (hábito mensal)', 'Smoke (monthly habit)'))),
          h('button', { class: 'btn small', title: t(VICE_INFO.drink.desc), onclick: () => say(indulge(s, rngOf(s), 'drink')) }, `${t(l('Sair para beber', 'Go drinking'))} (${$(money(s, VICE_INFO.drink.cost))})`),
          s.config.contentFilters.includes('drugs') ? null : h('button', { class: 'btn small ghost', title: t(VICE_INFO.drugs.desc), onclick: () => { if (confirm(t(l('Usar {d}? Vicia rápido, pode dar polícia e manchete.', 'Use {d}? Highly addictive; police and headlines possible.'), { d: drugName(s.year) }))) say(indulge(s, rngOf(s), 'drugs')); } }, `${t(l('Usar', 'Use'))} ${t(drugName(s.year))} (${$(money(s, VICE_INFO.drugs.cost))})`),
          h('button', { class: 'btn small', onclick: () => say(goToRehab(s), l('Reabilitação marcada.', 'Rehab booked.')) }, `${t(l('Reabilitação', 'Rehab'))} (${$(rehabCost(s))})`),
        ),
      ),
      section(t(l('Viagens', 'Travel')),
        h('p', { class: 'muted small' }, t(l('Gastam 2 de tempo livre e saem do seu bolso. Aliviam o estresse, inspiram, trazem sinais da cena local e podem mudar você (espiritual, boêmio, viajado).', 'Cost 2 free time and come out of your pocket. Relieve stress, inspire, bring signals from the local scene and may change you (spiritual, bohemian, worldly).'))),
        h('div', { class: 'mg-depts' }, TRIPS.map((tp) => {
          const err = tripBlocker(s, tp.id);
          return h('div', { class: 'mg-dept' }, h('b', null, t(tp.name)), h('small', { class: 'muted' }, t(tp.desc)),
            h('small', null, `−${tp.stress} ${t(l('estresse', 'stress'))} · ${tp.health >= 0 ? '+' : ''}${tp.health} ${t(l('saúde', 'health'))}`),
            h('button', { class: 'btn small', disabled: !!err, title: err ? t(err) : '', onclick: () => say(takeTrip(s, rngOf(s), tp.id), l('Boa viagem!', 'Have a good trip!')) }, `${t(l('Viajar', 'Travel'))} ${$(money(s, tp.cost))}`));
        })),
        v.trips.length ? h('small', { class: 'muted' }, t(l('Já foi para: ', 'Been to: ')), [...new Set(v.trips.map((x) => t(TRIPS.find((tp) => tp.id === x.dest)?.name)))].join(', ')) : null,
      ),
    ),
    h('aside', { class: 'col-side' },
      section(t(l('Empréstimos pessoais', 'Personal loans')),
        h('p', { class: 'muted small' }, t(l('Patrimônio pessoal: {v}. O dinheiro entra no seu bolso; as parcelas saem dele todo mês.', 'Personal wealth: {v}. Money goes into your pocket; payments come out of it every month.'), { v: $(o.wealth) })),
        v.loans.length ? h('ul', { class: 'small' }, v.loans.map((x) => h('li', null, h('b', null, t(LENDERS[x.lender].name)), ` — ${$(x.balance)} · ${$(x.monthly)}/${t(l('mês', 'mo'))}`, x.missed >= 1 ? pill(t(l('atrasado', 'late')), 'bad') : null, ' ', h('button', { class: 'link', onclick: () => say(repayPersonalLoan(s, x.id)) }, t(l('quitar', 'pay off')))))) : h('p', { class: 'muted small' }, t(l('Sem dívidas pessoais.', 'No personal debts.'))),
        h('label', null, t(l('Credor', 'Lender')), select<LenderId>(form.lender, (Object.keys(LENDERS) as LenderId[]).map((k) => ({ value: k, label: `${t(LENDERS[k].name)} (${Math.round(LENDERS[k].rate * 100)}% a.a.)` })), (v2) => { form.lender = v2; rerender(); })),
        h('small', { class: 'muted' }, t(LENDERS[form.lender].desc)),
        h('label', null, t(l('Valor (dólares de 1960)', 'Amount (1960 dollars)')), h('input', { type: 'number', min: 500, step: 500, value: form.amount, onchange: (e: Event) => { form.amount = Math.max(500, Number((e.target as HTMLInputElement).value)); rerender(); } })),
        h('small', { class: 'muted' }, t(l('Máximo deste credor: {v}', 'Max from this lender: {v}'), { v: $(lenderMax) })),
        h('button', { class: 'btn small', disabled: !!loanErr, title: loanErr ? t(loanErr) : '', onclick: () => say(takePersonalLoan(s, form.lender, amount), l('Dinheiro no bolso.', 'Money in your pocket.')) }, `${t(l('Pegar', 'Borrow'))} ${$(amount)}`),
      ),
      v.log.length ? section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, v.log.slice(0, 10).map((x) => h('li', { class: x.tone === 'bad' ? 'bad' : x.tone === 'good' ? 'good' : '' }, t(x.text))))) : null,
    ),
  );
}

function companyLoansTab(s: GameState): HTMLElement {
  const v = vices(s);
  return section(t(l('Empréstimos da empresa', 'Company loans')),
    h('p', { class: 'muted small' }, t(l('Cada credor tem regras próprias. As parcelas saem do caixa todo mês; caixa negativo traz consequências (o agiota ameaça, o investidor vira sócio, o banco suja seu nome).', 'Each lender has its own rules. Payments come out of cash every month; negative cash has consequences (the shark threatens, the investor becomes a partner, the bank ruins your credit).'))),
    s.player.loans.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Credor', 'Lender'))), h('th', null, t(l('Saldo', 'Balance'))), h('th', null, t(l('Parcela', 'Payment'))), h('th', null, t(l('Juros', 'Rate'))))),
      h('tbody', null, s.player.loans.map((x) => h('tr', null, h('td', null, t(CO_LENDERS[v.coLenders[x.id] ?? 'bank'].name)), h('td', null, $(x.balance)), h('td', null, $(x.monthly)), h('td', null, `${(x.rate * 100).toFixed(1)}%`))))) : h('p', { class: 'muted small' }, t(l('Nenhum empréstimo ativo.', 'No active loans.'))),
    h('div', { class: 'mg-depts' }, (Object.keys(CO_LENDERS) as CoLenderId[]).map((k) => {
      const def = CO_LENDERS[k];
      const err = companyLoanBlocker(s, k);
      return h('div', { class: 'mg-dept' }, h('b', null, t(def.name)), h('small', { class: 'muted' }, t(def.desc)),
        h('small', null, `${$(def.amount(s))} · ${(def.rate(s) * 100).toFixed(1)}% a.a. · ${def.months} ${t(l('meses', 'months'))}`),
        h('button', { class: `btn small ${k === 'shark' ? 'ghost' : ''}`, disabled: !!err, title: err ? t(err) : '', onclick: () => { if (k !== 'shark' || confirm(t(l('Pegar dinheiro com agiota?', 'Borrow from a loan shark?')))) say(takeCompanyLoan(s, k), l('Dinheiro no caixa.', 'Money in the bank.')); } }, t(l('Pegar', 'Borrow'))),
        err ? h('small', { class: 'muted' }, t(err)) : null);
    })),
  );
}

registerTab('business', { id: 'loans7', label: l('Empréstimos', 'Loans'), icon: 'bank', order: 6, render: companyLoansTab });
