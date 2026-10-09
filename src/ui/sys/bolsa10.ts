// Interface de Investimentos (rodada 10), na área Você: abas Bolsa (ações avulsas, fundos e notícias do pregão),
// Renda fixa, Ouro, Imóveis (alugar só o que você possui) e Carteira (posições e lucro/prejuízo).

import { cityById, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { buyValue, change12, controlShare, holders, holdingsOf, insight, KIND_NAME, listed, OWN, ownListing, playerFrac, raiders, repelRaider, sellShares, bolsa, unlistedNotes, walletOf, type Acct, type Kind } from '../../sim/sys/bolsa10';
import { INVEST, canLet, goodById, goodUpkeep, goods, invest, netWorth, redeem, rentOf, saleValue, sellGood, setLet, type InvId } from '../../sim/sys/goods8';
import { ownerOf } from '../../sim/sys/people/owner';
import type { GameState } from '../../sim/types';
import { money } from '../../sim/util';
import { $, pill, rerender, section, toast } from '../common';
import { h } from '../dom';
import { chips, stat, tabs, tile } from '../vis';

const isL = (x: unknown): x is L => !!x && typeof x === 'object' && 'pt' in (x as object) && 'en' in (x as object);
function run(res: unknown, ok?: L): void {
  if (res === null || res === undefined) { if (ok) toast(t(ok), 'good'); }
  else if (isL(res)) toast(t(res), 'bad');
  rerender();
}
const pct = (x: number) => `${x > 0 ? '+' : ''}${Math.round(x * 100)}%`;
const price = (c: number) => `$${(c / 100).toFixed(2)}`;
const cls = (x: number) => (x >= 0 ? 'good' : 'bad');
const pc1 = (f: number) => `${(f * 100).toFixed(1)}%`;
/** Quem está negociando na aba Bolsa: você (bolso) ou o selo (caixa da empresa). */
let acct: Acct = 'p';

/** Mini-gráfico de preços (escala do mínimo ao máximo). */
function spark(values: number[], w = 96, hg = 26): HTMLElement {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(1, hi - lo);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${hg - 2 - ((v - lo) / span) * (hg - 4)}`).join(' ');
  const up = values.length < 2 || values[values.length - 1] >= values[0];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(hg));
  svg.setAttribute('class', 'spark');
  svg.setAttribute('style', `color:${up ? 'var(--good, #3a9a5b)' : 'var(--bad, #c0504d)'}`);
  svg.innerHTML = `<polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${pts}"/>`;
  return svg as unknown as HTMLElement;
}

function wealthChips(s: GameState): HTMLElement {
  const o = ownerOf(s);
  const hs = holdingsOf(s);
  const val = hs.reduce((a, x) => a + x.value, 0);
  const cval = holdingsOf(s, 'c').reduce((a, x) => a + x.value, 0);
  const funds = Object.values(goods(s).inv).reduce((a, x) => a + (x?.value ?? 0), 0);
  return chips(
    stat('money', $(o.wealth), l('Dinheiro no bolso', 'Cash in pocket')),
    stat('chart-up', $(val), l('Em ações', 'In shares')),
    stat('bank', `${$(s.player.cash)} · ${$(cval)}`, l('Selo: caixa · ações', 'Label: cash · shares')),
    stat('bank', $(funds), l('Em fundos, renda fixa e ouro', 'In funds, fixed income and gold')),
    stat('star', $(netWorth(s)), l('Patrimônio líquido', 'Net worth')),
  );
}

// ------------------------------------------------------------------ bolsa

function stockRow(s: GameState, r: ReturnType<typeof listed>[number]): HTMLElement {
  const w = walletOf(s, acct);
  const pos = (acct === 'c' ? bolsa(s).cpos : bolsa(s).pos)[r.id];
  const other = (acct === 'c' ? bolsa(s).pos : bolsa(s).cpos)[r.id];
  const c12 = change12(r.q);
  const ins = insight(s, r.id);
  const lbl = r.id.startsWith('lb:');
  const no = r.id === OWN && acct === 'c';
  const top = holders(s, r.id, 3);
  return h('tr', null,
    h('td', null,
      h('b', null, r.name),
      h('div', { class: 'muted small' }, t(r.blurb)),
      r.q.note ? h('div', { class: `small ${cls(r.q.chg)}` }, t(r.q.note)) : null,
      ins ? h('div', { class: 'small' }, pill(t(l('Conselho: receita {r} · caixa {c} · {n} artistas', 'Board: revenue {r} · cash {c} · {n} acts'), { r: $(ins.revenue), c: $(ins.cash), n: ins.roster }), 'good')) : null,
      lbl && (pos || other) ? h('div', { class: 'small muted' }, t(l('Você e o selo têm {p} do selo (teto 20%; 5% mostra o conselho, 10% chama a atenção da imprensa).', 'You and your label hold {p} of it (cap 20%; 5% shows you the board, 10% attracts the press).'), { p: pc1(playerFrac(s, r.id)) })) : null,
      top.length ? h('div', { class: 'small muted' }, `${t(l('Maiores acionistas', 'Top holders'))}: `, top.map((x) => `${t(x.name)} ${pc1(x.frac)}`).join(' · ')) : null),
    h('td', null, spark(r.q.hist.slice(-36))),
    h('td', null, h('b', null, price(r.q.p)), ' ', pill(pct(r.q.chg), cls(r.q.chg)), h('div', { class: 'muted small' }, `12m ${pct(c12)}`)),
    h('td', { class: 'small' }, `P/L ${r.pe.toFixed(1)}`, h('div', { class: 'muted' }, r.div ? `${t(l('dividendo', 'yield'))} ${(r.div * 100).toFixed(1)}%` : t(l('sem dividendo', 'no dividend')))),
    h('td', null,
      pos ? h('div', { class: 'small' }, `${pos.sh} ${t(l('ações', 'sh'))} · ${$(Math.round(pos.sh * r.q.p))}`) : null,
      other ? h('div', { class: 'small muted' }, `${acct === 'c' ? t(l('Você', 'You')) : t(l('Selo', 'Label'))}: ${other.sh} ${t(l('ações', 'sh'))}`) : null,
      no ? h('div', { class: 'small muted' }, t(l('O caixa do selo não negocia a própria ação.', 'Label cash does not trade its own stock.'))) : h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', disabled: w < money(s, 1000), onclick: () => run(buyValue(s, r.id, money(s, 1000), acct), l('Comprado.', 'Bought.')) }, `+${$(money(s, 1000))}`),
        h('button', { class: 'btn small', disabled: w < money(s, 10000), onclick: () => run(buyValue(s, r.id, money(s, 10000), acct), l('Comprado.', 'Bought.')) }, `+${$(money(s, 10000))}`),
        h('button', { class: 'btn small', disabled: w < money(s, 2000), onclick: () => run(buyValue(s, r.id, Math.round(w * 0.25), acct), l('Comprado.', 'Bought.')) }, '+25%'),
        pos ? h('button', { class: 'btn small ghost', onclick: () => run(sellShares(s, r.id, 0.5, acct), l('Vendido.', 'Sold.')) }, '−½') : null,
        pos ? h('button', { class: 'btn small ghost', onclick: () => run(sellShares(s, r.id, 1, acct), l('Vendido.', 'Sold.')) }, t(l('Vender tudo', 'Sell all'))) : null)));
}

function fundCard(s: GameState, id: InvId): HTMLElement {
  const o = ownerOf(s);
  const d = INVEST[id];
  const pos = goods(s).inv[id];
  const gain = pos ? pos.value / Math.max(1, pos.principal) - 1 : 0;
  return tile('chart-up', t(d.name), [
    h('small', null, t(d.desc)),
    pos ? h('div', null, h('b', null, $(pos.value)), ' ', pill(pct(gain), cls(gain)), h('small', { class: 'muted' }, ` ${t(l('aplicado', 'put in'))} ${$(pos.principal)}`)) : h('small', { class: 'muted' }, t(l('Nada aplicado.', 'Nothing invested.'))),
    h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', disabled: o.wealth < money(s, 5000), onclick: () => run(invest(s, id, money(s, 5000)), l('Aplicado.', 'Invested.')) }, `+${$(money(s, 5000))}`),
      h('button', { class: 'btn small', disabled: o.wealth < money(s, 1000), onclick: () => run(invest(s, id, Math.min(o.wealth, Math.max(money(s, 1000), Math.round(o.wealth * 0.25)))), l('Aplicado.', 'Invested.')) }, `+25% ${t(l('do bolso', 'of pocket'))}`),
      pos ? h('button', { class: 'btn small ghost', onclick: () => run(redeem(s, id, 0.5), l('Resgatado.', 'Redeemed.')) }, t(l('Resgatar metade', 'Redeem half'))) : null,
      pos ? h('button', { class: 'btn small ghost', onclick: () => run(redeem(s, id, 1), l('Resgatado.', 'Redeemed.')) }, t(l('Resgatar tudo', 'Redeem all'))) : null),
  ]);
}

const fundIds = (s: GameState, ids: InvId[]) => ids.filter((id) => s.year >= INVEST[id].from);

function bolsaTab(s: GameState): HTMLElement {
  const rows = listed(s);
  const kinds = (Object.keys(KIND_NAME) as Kind[]).filter((k) => rows.some((r) => r.kind === k));
  const own = ownListing(s);
  const nw = bolsa(s).news.slice(0, 8);
  const funds = fundIds(s, ['stocks', 'tech', 'catalogs', 'crypto']);
  const rs = raiders(s);
  return h('div', null,
    wealthChips(s),
    h('div', { class: 'row wrap' },
      h('span', { class: 'small muted' }, t(l('Investir como:', 'Invest as:'))),
      h('button', { class: `btn small${acct === 'p' ? '' : ' ghost'}`, onclick: () => { acct = 'p'; rerender(); } }, `${t(l('Você (bolso)', 'You (pocket)'))} ${$(ownerOf(s).wealth)}`),
      h('button', { class: `btn small${acct === 'c' ? '' : ' ghost'}`, onclick: () => { acct = 'c'; rerender(); } }, `${t(l('O selo (caixa)', 'The label (cash)'))} ${$(s.player.cash)}`)),
    rs.length ? section(t(l('Blocos no seu selo', 'Blocks in your label')),
      h('p', { class: 'small muted' }, t(l('Seu controle: {c} (fundador + ações que você comprou no pregão). Rival com bloco grande derruba a confiança do conselho; com mais ações que você, é aquisição hostil.', 'Your control: {c} (founder + shares you bought on the exchange). A rival with a big block drags board confidence down; holding more than you is a hostile takeover.'), { c: pc1(controlShare(s)) })),
      h('table', { class: 'tbl compact' }, h('tbody', null, rs.map((x) => h('tr', null,
        h('td', null, h('b', null, t(x.name)), ' ', x.hostile ? pill(t(l('ameaça', 'threat')), 'bad') : null),
        h('td', null, pc1(x.frac)),
        h('td', null, h('button', { class: 'btn small', disabled: s.player.cash < x.cost, onclick: () => run(repelRaider(s, x.k), l('Bloco recomprado.', 'Block bought back.')) }, `${t(l('Recomprar (ágio 20%)', 'Buy back (20% premium)'))} ${$(x.cost)}`))))))) : null,
    h('p', { class: 'muted small' }, t(l('Ações de empresas que existem em {y}. Os preços seguem o mundo do jogo: números dos selos rivais, hits, escândalos, trocas de comando, viradas de formato (CD, pirataria, streaming…) e as crises históricas. Corretagem de 0,5%. Fechou? A ação vai a quase zero; foi comprada? Você recebe ágio.', 'Shares of companies that exist in {y}. Prices follow the game world: rival label numbers, hits, scandals, leadership changes, format shifts (CD, piracy, streaming…) and historic crises. 0.5% brokerage. Closed down? The share goes to almost zero; bought out? You get a premium.'), { y: s.year }), ' ', t(l('Selos só aparecem depois de abrir capital (IPO). Você e o seu selo negociam no mesmo pregão; fundos, selos rivais, chefes de gravadora e artistas também.', 'Labels only appear after going public (IPO). You and your label trade on the same exchange; so do funds, rival labels, label heads and artists.'))),
    nw.length ? section(t(l('Notícias do pregão', 'Market news')), h('ul', { class: 'memory' }, nw.map((n) => h('li', { class: n.tone }, h('span', { class: 'muted' }, `${n.y} · `), t(n.t))))) : null,
    ...kinds.map((k) => section(t(KIND_NAME[k]), h('table', { class: 'tbl compact' }, h('tbody', null, rows.filter((r) => r.kind === k).map((r) => stockRow(s, r)))))),
    own ? section(t(l('Seu selo na bolsa', 'Your label on the exchange')), h('div', { class: 'row wrap' }, h('b', null, `${own.name} · ${price(own.price)}`), spark(own.hist), h('small', { class: 'muted' }, t(l('Gerida em Finanças → Capital e sócios. A cotação entra no valor da empresa e nas fatias.', 'Managed in Finance → Capital and partners. The quote feeds the company valuation and stakes.')))),
      h('table', { class: 'tbl compact' }, h('tbody', null, holders(s, OWN, 8).map((x) => h('tr', null, h('td', null, t(x.name)), h('td', null, pc1(x.frac))))))) : null,
    unlistedNotes(s).length ? h('p', { class: 'muted small' }, t(l('Fora da bolsa: ', 'Not listed: ')), unlistedNotes(s).map((u) => `${t(u.name)} (${t(u.why)})`).join(' · ')) : null,
    funds.length ? section(t(l('Fundos', 'Funds')), h('div', { class: 'cards' }, funds.map((id) => fundCard(s, id)))) : null,
  );
}

// ------------------------------------------------------------------ imóveis

function propertyTab(s: GameState): HTMLElement {
  const st = goods(s);
  const homes = st.owned.filter((x) => canLet(goodById[x.id]));
  let income = 0;
  const rows = homes.map((it) => {
    const d = goodById[it.id];
    const rent = rentOf(s, it);
    const vacant = !!it.let && (it.vac ?? 0) > 0;
    if (it.let && !vacant) income += Math.round(rent * 0.92);
    return h('tr', null,
      h('td', null, h('b', null, t(d.name)), h('div', { class: 'muted small' }, d.city ? t(cityById[d.city]?.name ?? l(d.city)) : '—')),
      h('td', null, $(it.value)),
      h('td', null, it.let ? (vacant ? pill(t(l('vago', 'vacant')), 'warn') : pill(t(l('alugado', 'let')), 'good')) : pill(t(l('você usa', 'you use it')))),
      h('td', { class: 'small' }, `${t(l('aluguel', 'rent'))} ${$(rent)}/${t(l('mês', 'mo'))}`, h('div', { class: 'muted' }, `${t(l('manutenção', 'upkeep'))} ${$(goodUpkeep(s, d))}/${t(l('mês', 'mo'))}${it.rented ? ` · ${t(l('recebido', 'collected'))} ${$(it.rented)}` : ''}`)),
      h('td', null, h('div', { class: 'row wrap' },
        h('button', { class: 'btn small', onclick: () => run(setLet(s, it.uid, !it.let), it.let ? l('Você voltou para o imóvel.', 'You moved back.') : l('Imóvel anunciado para aluguel.', 'Property listed for rent.')) }, it.let ? t(l('Voltar a usar', 'Move back in')) : t(l('Alugar', 'Let out'))),
        h('button', { class: 'btn small ghost', onclick: () => { if (confirm(t(l('Vender por {v}?', 'Sell for {v}?'), { v: $(saleValue(it)) }))) run(sellGood(s, it.uid), l('Vendido.', 'Sold.')); } }, `${t(l('Vender', 'Sell'))} ${$(saleValue(it))}`))));
  });
  return h('div', null,
    wealthChips(s),
    homes.length
      ? section(t(l('Seus imóveis', 'Your property')),
        h('p', { class: 'muted small' }, t(l('Só dá para alugar o que você possui. Alugado, o imóvel rende (menos 8% da imobiliária), mas você não usa: perde o conforto, os efeitos e a presença local da casa. Pode ficar vago, o inquilino pode atrasar e há reformas.', 'You can only let what you own. Let out, a property earns rent (minus an 8% agency fee) but you do not use it: you lose its comfort, effects and local presence. It can sit vacant, the tenant can pay late, and repairs come up.'))),
        h('table', { class: 'tbl compact' }, h('thead', null, h('tr', null, h('th', null, t(l('Imóvel', 'Property'))), h('th', null, t(l('Vale hoje', 'Worth today'))), h('th', null, t(l('Situação', 'Status'))), h('th', null, t(l('Fluxo mensal', 'Monthly flow'))), h('th', null, ''))), h('tbody', null, rows)),
        h('p', { class: 'small' }, `${t(l('Aluguel líquido esperado', 'Expected net rent'))}: `, h('b', null, `${$(income)}/${t(l('mês', 'mo'))}`)))
      : section(t(l('Imóveis', 'Property')), h('p', { class: 'muted' }, t(l('Você não possui imóveis. Compre uma casa ou apartamento em Bens → Loja → Imóveis para poder alugar.', 'You own no property. Buy a house or apartment in Belongings → Shop → Property to be able to let it.')))),
  );
}

// ------------------------------------------------------------------ carteira

function sharesTable(s: GameState, who: Acct): HTMLElement {
  const hs = holdingsOf(s, who);
  const b = bolsa(s);
  const sharesVal = hs.reduce((a, x) => a + x.value, 0);
  const sharesPl = hs.reduce((a, x) => a + x.pl, 0);
  return section(who === 'c' ? t(l('Ações do selo (caixa da empresa)', 'Label shares (company cash)')) : t(l('Suas ações', 'Your shares')),
      hs.length ? h('table', { class: 'tbl compact' },
        h('thead', null, h('tr', null, h('th', null, t(l('Empresa', 'Company'))), h('th', null, t(l('Ações', 'Shares'))), h('th', null, t(l('Custo', 'Cost'))), h('th', null, t(l('Valor', 'Value'))), h('th', null, t(l('Resultado', 'P&L'))))),
        h('tbody', null, hs.map((x) => h('tr', null,
          h('td', null, h('b', null, x.name), x.frac !== undefined ? h('div', { class: 'muted small' }, `${(x.frac * 100).toFixed(1)}% ${t(l('do selo', 'of the label'))}`) : null),
          h('td', null, String(x.sh)),
          h('td', null, $(x.cost)),
          h('td', null, $(x.value)),
          h('td', null, pill(`${x.pl >= 0 ? '+' : '−'}${$(Math.abs(x.pl))}`, cls(x.pl)), x.divs ? h('div', { class: 'muted small' }, `${t(l('dividendos', 'dividends'))} ${$(x.divs)}`) : null))),
        h('tfoot', null, h('tr', null, h('td', null, h('b', null, 'Total')), h('td'), h('td'), h('td', null, h('b', null, $(sharesVal))), h('td', null, pill(`${sharesPl >= 0 ? '+' : '−'}${$(Math.abs(sharesPl))}`, cls(sharesPl)))))))
        : h('p', { class: 'muted' }, t(l('Nenhuma ação na carteira.', 'No shares in the portfolio.'))),
      who === 'p' && b.realized ? h('p', { class: 'small muted' }, `${t(l('Resultado já realizado em vendas', 'Realized result from sales'))}: ${b.realized >= 0 ? '+' : '−'}${$(Math.abs(b.realized))}`) : null);
}

function portfolioTab(s: GameState): HTMLElement {
  const st = goods(s);
  const funds = (Object.keys(st.inv) as InvId[]).filter((id) => st.inv[id] && INVEST[id]);
  const props = st.owned.filter((x) => canLet(goodById[x.id]));
  return h('div', null,
    wealthChips(s),
    sharesTable(s, 'p'),
    sharesTable(s, 'c'),
    section(t(l('Fundos, renda fixa e ouro', 'Funds, fixed income and gold')),
      funds.length ? h('table', { class: 'tbl compact' }, h('tbody', null, funds.map((id) => {
        const p = st.inv[id]!;
        const gain = p.value / Math.max(1, p.principal) - 1;
        return h('tr', null, h('td', null, h('b', null, t(INVEST[id].name))), h('td', null, $(p.value)), h('td', null, pill(pct(gain), cls(gain))));
      }))) : h('p', { class: 'muted' }, t(l('Nada aplicado.', 'Nothing invested.')))),
    section(t(l('Imóveis', 'Property')),
      props.length ? h('p', { class: 'small' }, `${props.length} ${t(l('imóvel(is)', 'propert(ies)'))} · ${$(props.reduce((a, x) => a + x.value, 0))} · ${props.filter((x) => x.let).length} ${t(l('alugado(s)', 'let'))}`) : h('p', { class: 'muted' }, t(l('Nenhum imóvel.', 'No property.')))),
  );
}

/** Aba "Investimentos" da área Você (substitui a antiga lista única). */
export function investmentsTab(s: GameState): HTMLElement {
  const fixed = fundIds(s, ['savings']);
  const gold = fundIds(s, ['gold']);
  return tabs('invest10', [
    { id: 'bolsa', label: t(l('Bolsa', 'Stock market')), icon: 'chart-up', render: () => bolsaTab(s) },
    { id: 'fixed', label: t(l('Renda fixa', 'Fixed income')), icon: 'bank', render: () => h('div', null, wealthChips(s), h('div', { class: 'cards' }, fixed.map((id) => fundCard(s, id)))) },
    { id: 'gold', label: t(l('Ouro', 'Gold')), icon: 'star', render: () => h('div', null, wealthChips(s), h('div', { class: 'cards' }, gold.map((id) => fundCard(s, id)))) },
    { id: 'prop', label: t(l('Imóveis', 'Property')), icon: 'house', render: () => propertyTab(s) },
    { id: 'port', label: t(l('Carteira', 'Portfolio')), icon: 'money', render: () => portfolioTab(s) },
  ], rerender);
}
