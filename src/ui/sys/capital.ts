// Interface de capital (rodada 6): transferências entre bolso e caixa, sócios (opinião detalhada,
// metas, cláusulas, reunião, recompra), propostas de investidores, dividendos, IPO com escolhas e
// confiança do conselho. Aba em Negócios e atalho na área Você → Patrimônio.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import {
  CLAUSES, KINDS, acceptInvestor, boardConfidence, buyBack, buybackPrice, capital, goPublic6, goalProgress, injectCapital, ipoQuote, lendToCompany,
  meetInvestor, opinion, ownerShare, payDividend, seekInvestors, toggleCompanyCard, valuation, withdrawFromCompany, type Underwriter,
} from '../../sim/sys/capital';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { rngOf } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { registerTab } from '../registry';
import { chips, ic, stat } from '../vis';

const say = (e: L | null, ok?: L) => { if (e) toast(t(e), 'bad'); else if (ok) toast(t(ok), 'good'); rerender(); };
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;

export function transferSection(s: GameState): HTMLElement {
  const c = capital(s);
  const o = ownerOf(s);
  let amount = 5000;
  const amt = h('input', { type: 'number', min: 100, step: 500, value: amount, oninput: (e: Event) => (amount = Math.max(0, Number((e.target as HTMLInputElement).value) || 0)) });
  return section(t(l('Dinheiro entre você e a empresa', 'Money between you and the company')),
    chips(stat('house', $(o.wealth), l('Seu bolso', 'Your pocket')), stat('bank', $(s.player.cash), l('Caixa da empresa', 'Company cash')), stat('contract', pct(ownerShare(s)), l('Sua participação', 'Your stake')), c.ownerLoan > 0 ? stat('money', $(c.ownerLoan), l('A empresa te deve', 'The company owes you')) : null),
    h('div', { class: 'row wrap' }, h('label', null, t(l('Valor (US$ de hoje)', 'Amount (today\'s US$)')), ' ', amt)),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', title: t(l('Seu dinheiro vira capital da empresa. Com sócios, sua fatia cresce.', 'Your money becomes company capital. With partners, your stake grows.')), onclick: () => say(injectCapital(s, amount), l('Aporte feito.', 'Capital injected.')) }, ic('money'), ' ', t(l('Aportar na empresa', 'Inject into the company'))),
      h('button', { class: 'btn small', title: t(l('A empresa devolve 3% do saldo + 1% de juros por mês.', 'The company pays back 3% of the balance + 1% interest a month.')), onclick: () => say(lendToCompany(s, amount), l('Empréstimo feito.', 'Loan made.')) }, t(l('Emprestar à empresa', 'Lend to the company'))),
      h('button', { class: 'btn small ghost', title: t(l('20% de imposto; sócios, acionistas e artistas reagem.', '20% tax; partners, shareholders and artists react.')), onclick: () => { if (confirm(t(l('Retirar ${v} da empresa? Haverá imposto e reações.', 'Withdraw ${v} from the company? There will be tax and reactions.'), { v: amount }))) say(withdrawFromCompany(s, rngOf(s), amount), l('Retirada feita.', 'Withdrawal made.')); } }, t(l('Retirar para o bolso', 'Withdraw to your pocket'))),
    ),
    h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: c.companyCard, onchange: () => { toggleCompanyCard(s); rerender(); } }),
      t(l('Pagar despesas pessoais com o cartão da empresa (economiza seu bolso; uma auditoria pode descobrir — mais provável com sócios ou em bolsa)', 'Pay personal expenses with the company card (saves your pocket; an audit may find out — likelier with partners or when listed)'))),
    h('p', { class: 'muted small' }, t(l('Também dá para tirar dinheiro de forma limpa com dividendos (abaixo) ou com a retirada mensal (Você → Patrimônio).', 'You can also take money cleanly through dividends (below) or the monthly draw (You → Wealth).'))),
  );
}

function investorsSection(s: GameState): HTMLElement {
  const c = capital(s);
  if (!c.investors.length) return section(t(l('Sócios', 'Partners')), h('p', { class: 'muted small' }, t(l('Você ainda é dono de 100% (ou do que não está em bolsa). Propostas aparecem a cada trimestre ou quando você busca sócios.', 'You still own 100% (or whatever is not floated). Offers show up every quarter or when you look for partners.'))));
  return section(t(l('Sócios', 'Partners')), h('div', { class: 'cards' }, c.investors.map((inv) => {
    const op = opinion(inv);
    const kd = KINDS[inv.kind];
    const gp = goalProgress(s, inv);
    return h('article', { class: 'tile inv' },
      h('header', null, h('b', null, inv.name), ' ', pill(t(kd.name)), ' ', pill(pct(inv.share), 'trait')),
      h('div', { class: 'small' }, t(l('Opinião', 'Opinion')), ': ', h('b', { class: op >= 20 ? 'good' : op <= -20 ? 'bad' : '' }, `${op > 0 ? '+' : ''}${op}`)),
      h('ul', { class: 'small op-list' },
        h('li', null, t(l('Resultados (o que eles gostam)', 'Results (what they like)')), `: ${Math.round(inv.trend)}`),
        ...inv.mods.map((m) => h('li', null, t(m.label), `: ${m.value > 0 ? '+' : ''}${Math.round(m.value)} `, h('small', { class: 'muted' }, t(l('(−{d}/mês)', '(−{d}/mo)'), { d: m.decay }))))),
      h('small', { class: 'muted' }, t(kd.likes)),
      h('div', { class: 'small' }, t(l('Cláusula', 'Clause')), ': ', h('span', { title: t(CLAUSES[inv.clause].desc) }, t(CLAUSES[inv.clause].name))),
      inv.goal && !inv.goal.done && gp ? h('div', { class: 'small' }, t(l('Meta', 'Goal')), ': ', t(inv.goal.text), ' ', h('small', { class: 'muted' }, `(${gp.value < 1 ? Math.round(gp.value * 1000) / 10 : Math.round(gp.value * 10) / 10} / ${gp.target < 1 ? Math.round(gp.target * 1000) / 10 : gp.target}) · ${t(l('prazo: semana {w}', 'deadline: week {w}'), { w: inv.goal.deadline })}`)) : null,
      inv.demand ? h('p', { class: 'bad small' }, ic('warning'), ' ', t(inv.demand.text)) : null,
      inv.buyout ? h('p', { class: 'bad small' }, t(l('Quer sair: recompre até a semana {w} ou a fatia vai para um rival.', 'Wants out: buy back by week {w} or the stake goes to a rival.'), { w: inv.buyout.until })) : null,
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => say(meetInvestor(s, inv.id), l('Boa conversa.', 'Good talk.')) }, t(l('Reunião (1 tempo)', 'Meeting (1 time)'))),
        h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Recomprar por {v} com caixa da empresa?', 'Buy back for {v} with company cash?'), { v: $(buybackPrice(s, inv)) }))) say(buyBack(s, inv.id, 'company'), l('Participação recomprada.', 'Stake bought back.')); } }, `${t(l('Recomprar (empresa)', 'Buy back (company)'))} ${$(buybackPrice(s, inv))}`),
        h('button', { class: 'btn small ghost', onclick: () => say(buyBack(s, inv.id, 'personal'), l('Participação recomprada com seu dinheiro.', 'Stake bought back with your money.')) }, t(l('Recomprar (seu bolso)', 'Buy back (your pocket)'))),
      ),
    );
  })));
}

function offersSection(s: GameState): HTMLElement {
  const c = capital(s);
  const live = c.offers.filter((o) => o.expires > s.week);
  return section(t(l('Propostas de investidores', 'Investor offers')),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => say(seekInvestors(s, rngOf(s)), l('O banco trouxe propostas.', 'The bankers brought offers.')) }, ic('bank'), ' ', t(l('Buscar sócios (banco $1.500 + 1 tempo)', 'Look for partners (bank $1,500 + 1 time)'))),
      h('span', { class: 'muted small' }, t(l('Valor estimado da empresa: {v}', 'Estimated company value: {v}'), { v: $(valuation(s)) }))),
    live.length ? h('div', { class: 'cards' }, live.map((o) => {
      const kd = KINDS[o.kind];
      return h('article', { class: 'tile inv' },
        h('header', null, h('b', null, o.name), ' ', pill(t(kd.name))),
        h('p', { class: 'small' }, t(kd.desc)),
        h('div', null, h('b', null, $(o.amount)), t(l(' por ', ' for ')), h('b', null, pct(o.share))),
        h('small', { class: 'muted' }, t(kd.likes)),
        h('div', { class: 'small' }, t(l('Cláusula', 'Clause')), ': ', t(CLAUSES[o.clause].name), ' — ', h('span', { class: 'muted' }, t(CLAUSES[o.clause].desc))),
        o.goal ? h('div', { class: 'small' }, t(l('Meta', 'Goal')), ': ', t(o.goal.text)) : null,
        kd.perks ? h('div', { class: 'small good' }, t(l('Traz vantagens (veja Você → Personalidade → Seus bônus).', 'Brings perks (see You → Personality → Your bonuses).'))) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn small primary', onclick: () => say(acceptInvestor(s, o.id), l('Negócio fechado.', 'Deal closed.')) }, t(l('Aceitar', 'Accept'))),
          h('small', { class: 'muted' }, t(l('expira na semana {w}', 'expires week {w}'), { w: o.expires }))),
      );
    })) : h('p', { class: 'muted small' }, t(l('Nenhuma proposta no momento.', 'No offers at the moment.'))),
  );
}

function dividendSection(s: GameState): HTMLElement {
  let frac = 0.1;
  return section(t(l('Dividendos', 'Dividends')),
    h('p', { class: 'muted small' }, t(l('Distribui parte do caixa a todos os acionistas. Sua parte (×{p}) vai para o seu bolso, com 15% de imposto. Famílias adoram; fundos de crescimento preferem reinvestir.', 'Distributes part of cash to all shareholders. Your part (×{p}) goes to your pocket, with 15% tax. Families love it; growth funds prefer reinvestment.'), { p: pct(ownerShare(s)) })),
    h('div', { class: 'row wrap' },
      select(frac, [0.05, 0.1, 0.2, 0.3].map((x) => ({ value: x, label: `${Math.round(x * 100)}% ${t(l('do caixa', 'of cash'))}` })), (v) => (frac = v)),
      h('button', { class: 'btn small', onclick: () => say(payDividend(s, frac), l('Dividendos pagos.', 'Dividends paid.')) }, t(l('Pagar dividendos', 'Pay dividends')))),
  );
}

function ipoSection(s: GameState): HTMLElement {
  if (s.listing.listed) {
    const h0 = s.listing.history;
    const tr = h0.length > 12 ? h0[h0.length - 1] / Math.max(1, h0[h0.length - 13]) - 1 : 0;
    return section(t(l('Na bolsa', 'Listed')), chips(
      stat('chart-up', $(s.listing.price), l('Preço da ação', 'Share price')),
      stat('contract', pct(s.listing.floatShare), l('Em circulação', 'Floated')),
      stat('star', `${tr >= 0 ? '+' : ''}${Math.round(tr * 100)}%`, l('12 meses', '12 months'))));
  }
  let float = 0.25;
  let uw: Underwriter = 'local';
  let road = false;
  const box = h('div', { class: 'small' });
  const draw = () => {
    const q = ipoQuote(s, float, uw, road);
    box.replaceChildren(
      h('div', null, t(l('Valor: {v} · captação líquida: {r} · taxa do banco: {f}', 'Value: {v} · net raise: {r} · bank fee: {f}'), { v: $(q.valuation), r: $(q.raise), f: $(q.fee) })),
      !q.ok && q.reason ? h('div', { class: 'bad' }, t(q.reason)) : '',
    );
  };
  draw();
  return section(t(l('Abrir capital (IPO)', 'Go public (IPO)')),
    h('p', { class: 'muted small' }, t(l('Dinheiro grande, mas acionistas cobram: a cotação entra na confiança do conselho. Fundos adoram; a major parceira odeia ser diluída.', 'Big money, but shareholders demand results: the share price feeds board confidence. Funds love it; a strategic partner hates dilution.'))),
    h('div', { class: 'row wrap' },
      h('label', null, t(l('Fatia', 'Float')), ' ', select(float, [0.1, 0.15, 0.25, 0.33, 0.4].map((x) => ({ value: x, label: pct(x) })), (v) => { float = v; draw(); })),
      h('label', null, t(l('Banco coordenador', 'Underwriter')), ' ', select<Underwriter>(uw, [{ value: 'local', label: t(l('Corretora local (4%)', 'Local broker (4%)')) }, { value: 'major', label: t(l('Banco de primeira linha (7%, +10% de valor)', 'Top-tier bank (7%, +10% value)')) }], (v) => { uw = v; draw(); })),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', onchange: (e: Event) => { road = (e.target as HTMLInputElement).checked; draw(); } }), t(l('Roadshow (+5%, 2 tempos)', 'Roadshow (+5%, 2 time)'))),
    ),
    box,
    h('button', { class: 'btn primary small', onclick: () => { if (confirm(t(l('Abrir capital agora?', 'Go public now?')))) say(goPublic6(s, float, uw, road), l('Sino tocado! A empresa está na bolsa.', 'Bell rung! The company is listed.')); } }, ic('bell'), ' ', t(l('Abrir capital', 'Go public'))),
  );
}

function boardSection(s: GameState): HTMLElement | null {
  const c = capital(s);
  if (!c.investors.length && !s.listing.listed) return null;
  const conf = boardConfidence(s);
  return section(t(l('Confiança do conselho', 'Board confidence')),
    h('div', null, h('span', { class: `meter-bar ${conf < 30 ? 'bad' : conf < 55 ? 'mid' : ''}`, style: 'width:200px' }, h('span', { style: `width:${conf}%` })), ' ', h('b', null, String(conf))),
    h('p', { class: 'small' }, ownerShare(s) >= 0.5
      ? t(l('Você tem a maioria ({p}): um voto de desconfiança não te derruba, mas custa caro.', 'You hold the majority ({p}): a no-confidence vote cannot remove you, but it hurts.'), { p: pct(ownerShare(s)) })
      : h('span', { class: 'bad' }, t(l('Você tem só {p}. Se a confiança ficar abaixo de 15 por meses, o conselho te demite (fim de jogo).', 'You only hold {p}. If confidence stays below 15 for months, the board fires you (game over).'), { p: pct(ownerShare(s)) }))),
  );
}

function logSection(s: GameState): HTMLElement | null {
  const c = capital(s);
  if (!c.log.length) return null;
  return section(t(l('Histórico', 'History')), h('ul', { class: 'small' }, c.log.slice(0, 12).map((x) => h('li', { class: x.tone === 'bad' ? 'bad' : x.tone === 'good' ? 'good' : '' }, `${t(l('sem.', 'wk'))} ${x.week}: `, t(x.text)))));
}

export function capitalPanel(s: GameState): HTMLElement {
  return h('div', { class: 'cols' },
    h('div', { class: 'col-main' }, investorsSection(s), offersSection(s), logSection(s) ?? ''),
    h('aside', { class: 'col-side' }, transferSection(s), boardSection(s) ?? '', dividendSection(s), ipoSection(s)),
  );
}

registerTab('business', { id: 'capital', label: l('Capital e sócios', 'Capital and partners'), icon: 'bank', order: 5, render: capitalPanel, badge: (s) => capital(s).investors.filter((x) => x.demand || x.buyout).length || capital(s).offers.filter((o) => o.expires > s.week).length || undefined });
