// Negócios: balanço com ativos e credores, subselos (empresas com conselho), aquisições com
// passivos, JV, fábrica, editora, leilão e securitização de catálogo, bolsa, processos e marcas.

import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { balanceSheet } from '../../sim/finance';
import { acquireLabel, auctionOwnCatalog, bidCatalog, buildPlant, catalogMonthlyRevenue, goPublic, ipoTerms, issueShares, labelValuation, labelsForSale, openPublishing, securitize, sellCompany, settleLawsuit, startJointVenture } from '../../sim/business';
import { acceptDeal, dealKindName, declineDeal } from '../../sim/brands';
import { assignAct, buyBack, closeSubLabel, foundSubLabel, proposeCapital, proposeDividend, setSubPolicy, subLabelValuation, subLoan, transferToSub, unassignAct } from '../../sim/sublabels';
import { buyoutContract, buyoutPrice } from '../../sim/contracts2';
import type { GameState } from '../../sim/types';
import type { SubLabel } from '../../sim/xtypes';
import { money, playerActs, rngOf } from '../../sim/util';
import { $, N, actLink, genreName, labelLink, logo, memoText, pill, rerender, section, toast } from '../common';
import { h, select } from '../dom';
import { logoUrl } from '../art';
import { chips, ic, lineChart, stat, tabs, tile } from '../vis';
import { mergeTabs } from '../registry';

const say = (e: L | null, ok: L) => toast(t(e ?? ok), e ? 'bad' : 'good');

const KIND_NAME: Record<string, L> = {
  equipment: l('Equipamento', 'Equipment'), building: l('Imóveis', 'Buildings'), plant: l('Fábrica', 'Plant'), catalog: l('Catálogos', 'Catalogs'),
  company: l('Empresas', 'Companies'), stake: l('Participações', 'Stakes'), hologram: l('Hologramas', 'Holograms'), voice: l('Licenças de voz', 'Voice licenses'),
};

function overview(s: GameState): HTMLElement {
  const b = balanceSheet(s);
  return h('div', null,
    section(t(l('Balanço (visão contábil)', 'Balance sheet (accounting view)')),
      chips(stat('money', $(b.cash), l('Caixa', 'Cash')), stat('house', $(b.assets), l('Ativos (valor contábil)', 'Assets (book value)')), stat('bank', $(b.receivables), l('A receber', 'Receivables')), stat('warning', $(b.debt), l('Dívidas', 'Debts'), b.debt > 0 ? 'bad' : ''), stat('trophy', $(b.equity), l('Patrimônio líquido', 'Equity'), b.equity < 0 ? 'bad' : 'good')),
      h('p', { class: 'muted small' }, t(l('Depreciação do mês: {d}. Depreciação não sai do caixa; reduz o valor contábil dos bens.', 'Depreciation this month: {d}. Depreciation does not leave cash; it lowers book value.'), { d: $(b.depreciationMonth) })),
      h('div', { class: 'cards' }, Object.entries(b.byKind).map(([k, v]) => tile(k === 'equipment' ? 'mic' : k === 'catalog' ? 'disc' : k === 'plant' ? 'cd' : k === 'hologram' ? 'hologram' : k === 'voice' ? 'brain' : 'house', t(KIND_NAME[k] ?? l(k)), [h('span', null, $(v))]))),
    ),
    section(t(l('Inventário de ativos', 'Asset inventory')), s.assets.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Bem', 'Asset'))), h('th', null, t(l('Custo', 'Cost'))), h('th', null, t(l('Valor contábil', 'Book value'))), h('th', null, t(l('Vida útil', 'Useful life'))))),
      h('tbody', null, s.assets.map((a) => h('tr', null, h('td', null, typeof a.name === 'string' ? a.name : t(a.name)), h('td', null, $(a.cost)), h('td', null, $(a.bookValue)), h('td', null, a.lifeMonths ? `${a.lifeMonths} ${t(l('meses', 'months'))}` : '—')))),
    ) : h('p', { class: 'muted small' }, t(l('Nenhum bem registrado ainda.', 'No assets recorded yet.')))),
    section(t(l('Credores', 'Creditors')), s.creditors.length ? h('ul', null, s.creditors.map((c) => h('li', null, ic('bank'), ' ', h('b', null, c.name), ' ', c.owed ? $(c.owed) : '', ' ', t(l('paciência', 'patience')), ' ', h('span', { class: `meter-bar ${c.patience < 30 ? 'bad' : 'mid'}` }, h('span', { style: `width:${c.patience}%` }))))) : h('p', { class: 'muted small' }, t(l('Ninguém cobrando. Caixa negativo por meses faz credores retomarem bens.', 'No one chasing you. Months of negative cash make creditors seize assets.')))),
  );
}

function subCard(s: GameState, sl: SubLabel): HTMLElement {
  const r = rngOf(s);
  const free = playerActs(s).filter((id) => !s.subLabels.some((x) => x.roster.includes(id)) && !s.acts[id].playerBand);
  const statusPill = pill(t({ active: l('ativo', 'active'), distress: l('em crise', 'in distress'), bankrupt: l('falido', 'bankrupt'), closed: l('encerrado', 'closed') }[sl.status]), sl.status === 'active' ? 'good' : 'bad');
  return h('article', { class: 'sub-card' },
    h('header', null, h('img', { class: 'logo px', src: logoUrl(sl.logoSeed, sl.name, sl.genreFocus, sl.founded, 96), width: 40, height: 40, alt: '' }), h('b', null, sl.name), statusPill),
    chips(stat('money', $(sl.cash), l('Caixa próprio', 'Own cash'), sl.cash < 0 ? 'bad' : ''), stat('chart-up', $(sl.revenueYear), l('Receita no ano', 'Revenue this year')), stat('trophy', `${Math.round(sl.founderShare * 100)}%`, l('Sua participação', 'Your stake')), stat('bank', $(subLabelValuation(s, sl)), l('Avaliação', 'Valuation'))),
    h('p', { class: 'small' }, t(l('Estratégia', 'Strategy')), ': ', select(sl.strategy, [{ value: 'development' as const, label: t(l('Desenvolvimento', 'Development')) }, { value: 'commercial' as const, label: t(l('Comercial', 'Commercial')) }, { value: 'catalog' as const, label: t(l('Catálogo', 'Catalog')) }], (v) => { const e = setSubPolicy(s, sl.id, { strategy: v }); if (e) toast(t(e), 'info'); rerender(); }),
      ' · ', t(l('Orçamento/mês', 'Budget/month')), ': ', select(sl.budget, [0, 1000, 2000, 5000, 10000].map((x) => ({ value: money(s, x), label: $(money(s, x)) })), (v) => { setSubPolicy(s, sl.id, { budget: v }); rerender(); })),
    h('div', { class: 'row wrap' }, sl.roster.map((id) => h('span', { class: 'pill' }, actLink(s, id), h('button', { class: 'link', onclick: () => { unassignAct(s, sl.id, id); rerender(); } }, ' ✕'))),
      free.length && sl.roster.length < 3 ? select('', [{ value: '', label: t(l('+ atribuir carreira', '+ assign career')) }, ...free.map((id) => ({ value: id, label: s.acts[id].name }))], (v) => { if (v) { const e = assignAct(s, sl.id, v); if (e) toast(t(e), 'bad'); rerender(); } }) : null),
    sl.board.length ? h('p', { class: 'small' }, ic('handshake'), ' ', sl.board.map((b) => `${b.name} ${Math.round(b.share * 100)}% (${t({ return: l('retorno', 'return'), growth: l('crescimento', 'growth'), culture: l('cultura', 'culture') }[b.goal])})`).join(' · ')) : null,
    sl.pendingProposal ? h('p', { class: 'small warn' }, ic('clock'), ' ', t(l('Proposta aguardando voto do conselho.', 'Proposal awaiting board vote.'))) : null,
    sl.status !== 'closed' && sl.status !== 'bankrupt' ? h('div', { class: 'row wrap' },
      h('button', { class: 'btn small', onclick: () => { say(transferToSub(s, sl.id, money(s, 10000)), l('Aporte feito (transferência, não lucro).', 'Capital injected (transfer, not profit).')); rerender(); } }, `+${$(money(s, 10000))}`),
      h('button', { class: 'btn small ghost', onclick: () => { say(proposeCapital(s, r, sl.id, money(s, 25000)), l('Novo sócio entrou.', 'New partner joined.')); rerender(); } }, t(l('Vender participação', 'Sell a stake'))),
      h('button', { class: 'btn small ghost', onclick: () => { say(proposeDividend(s, sl.id, Math.max(0, Math.round(sl.retained / 2))), l('Dividendos pagos.', 'Dividends paid.')); rerender(); } }, t(l('Dividendos', 'Dividends'))),
      h('button', { class: 'btn small ghost', onclick: () => { say(subLoan(s, sl.id), l('Empréstimo do subselo aprovado.', 'Sub-label loan approved.')); rerender(); } }, t(l('Empréstimo', 'Loan'))),
      sl.board.length ? h('button', { class: 'btn small ghost', onclick: () => { say(buyBack(s, sl.id), l('Participações recompradas.', 'Stakes bought back.')); rerender(); } }, t(l('Recomprar sócios', 'Buy out partners'))) : null,
      h('button', { class: 'btn small ghost', onclick: () => { say(closeSubLabel(s, sl.id), l('Subselo encerrado.', 'Sub-label closed.')); rerender(); } }, t(l('Encerrar', 'Close'))),
    ) : null,
    h('details', null, h('summary', null, t(l('Extrato e histórico', 'Ledger and history'))),
      h('ul', { class: 'small' }, sl.log.slice(-10).reverse().map((x) => h('li', { class: x.amount >= 0 ? 'good' : 'bad' }, `${$(x.amount)} — ${memoText(x.memo)}`))),
      h('ul', { class: 'small muted' }, sl.history.slice(-8).reverse().map((x) => h('li', null, t(x.text))))),
  );
}

function subsTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  const draft = { name: '', capital: 20000, strategy: 'development' as SubLabel['strategy'] };
  return h('div', null,
    section(t(l('Fundar subselo', 'Found a sub-label')),
      h('p', { class: 'muted small' }, t(l('Exige Loft ou Complexo. $5.000 de instalação + capital próprio. Caixa, credores e conselho próprios; a matriz não cobre o subselo automaticamente.', 'Needs a Loft or Complex. $5,000 setup + its own capital. Own cash, creditors and board; the parent does not cover it automatically.'))),
      h('div', { class: 'row wrap' },
        h('input', { placeholder: t(l('Nome do subselo', 'Sub-label name')), oninput: (e: Event) => { draft.name = (e.target as HTMLInputElement).value; } }),
        select(draft.capital, [5000, 20000, 50000, 200000].map((x) => ({ value: x, label: $(money(s, x)) })), (v) => { draft.capital = v; }),
        select(draft.strategy, [{ value: 'development' as const, label: t(l('Desenvolvimento', 'Development')) }, { value: 'commercial' as const, label: t(l('Comercial', 'Commercial')) }, { value: 'catalog' as const, label: t(l('Catálogo', 'Catalog')) }], (v) => { draft.strategy = v; }),
        h('button', { class: 'btn primary', onclick: () => { const res = foundSubLabel(s, r, draft.name, s.acts[playerActs(s)[0]]?.genre ?? 'pop', money(s, draft.capital), draft.strategy); if ('pt' in res) toast(t(res), 'bad'); rerender(); } }, ic('house'), ' ', t(l('Fundar', 'Found'))),
      ),
    ),
    h('div', { class: 'cards' }, s.subLabels.map((sl) => subCard(s, sl))),
  );
}

function companiesTab(s: GameState): HTMLElement {
  const forSale = labelsForSale(s);
  const partners = Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 200000)).slice(0, 8);
  return h('div', null,
    section(t(l('Suas empresas', 'Your companies')),
      h('div', { class: 'row wrap' },
        h('button', { class: 'btn', onclick: () => { say(buildPlant(s), l('Fábrica construída.', 'Plant built.')); rerender(); } }, ic('cd'), ' ', t(l('Construir fábrica de prensagem', 'Build a pressing plant')), ` (${$(money(s, 90000))})`),
        !s.ownPublishing ? h('button', { class: 'btn', onclick: () => { say(openPublishing(s), l('Editora aberta.', 'Publisher opened.')); rerender(); } }, ic('contract'), ' ', t(l('Abrir editora própria', 'Open your own publisher')), ` (${$(money(s, 25000))})`) : pill(t(l('Editora própria ativa', 'Own publisher active')), 'good'),
      ),
      h('div', { class: 'cards' }, s.companies.map((co) => tile(co.kind === 'plant' ? 'cd' : co.kind === 'publisher' ? 'contract' : 'house', co.name, [
        chips(stat('trophy', `${Math.round(co.stake * 100)}%`, l('Participação', 'Stake')), stat('money', $(co.value), l('Valor', 'Value')), co.liabilities ? stat('warning', $(co.liabilities), l('Passivos herdados', 'Inherited liabilities'), 'bad') : null),
        co.partner ? h('small', null, 'JV: ', labelLink(s, co.partner)) : null,
        h('button', { class: 'btn small ghost', onclick: () => { say(sellCompany(s, co.id), l('Vendida.', 'Sold.')); rerender(); } }, t(l('Vender', 'Sell'))),
      ]))),
    ),
    section(t(l('Selos à venda (com passivos)', 'Labels for sale (with liabilities)')), forSale.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Selo', 'Label'))), h('th', null, t(l('Elenco', 'Roster'))), h('th', null, t(l('Preço', 'Price'))), h('th', null, t(l('Passivos', 'Liabilities'))), h('th', null, ''))),
      h('tbody', null, forSale.map((lb) => { const v = labelValuation(s, lb); return h('tr', null, h('td', null, labelLink(s, lb.id)), h('td', null, String(lb.roster.length)), h('td', null, $(Math.round(v.value * 0.9))), h('td', { class: 'bad' }, $(v.liabilities)), h('td', null, h('button', { class: 'btn small', onclick: () => { say(acquireLabel(s, lb.id), l('Aquisição concluída: elenco, catálogo e dívidas agora são seus.', 'Acquisition done: roster, catalog and debts are now yours.')); rerender(); } }, t(l('Comprar', 'Buy'))))); })),
    ) : h('p', { class: 'muted small' }, t(l('Nenhum selo em crise no momento.', 'No label in distress right now.')))),
    section(t(l('Joint venture', 'Joint venture')), h('div', { class: 'row wrap' }, partners.map((lb) => h('button', { class: 'btn small ghost', onclick: () => { say(startJointVenture(s, lb.id, money(s, 30000)), l('JV criada.', 'JV created.')); rerender(); } }, ic('handshake'), ' ', lb.name)))),
    section(t(l('Comprar contratos de rivais (buyout)', 'Buy rival contracts (buyout)')), h('div', { class: 'cards' }, Object.values(s.acts).filter((a) => a.owner && a.owner !== 'player' && a.fame > 25 && (s.knowledge[a.id]?.degree ?? 0) >= 2).slice(0, 8).map((a) => tile('contract', a.name, [h('small', null, labelLink(s, a.owner)), h('button', { class: 'btn small', onclick: () => { say(buyoutContract(s, rngOf(s), a.id), l('Contrato comprado!', 'Contract bought!')); rerender(); } }, `${t(l('Comprar', 'Buy'))} ${$(buyoutPrice(s, a))}`)])))),
  );
}

function catalogTab(s: GameState): HTMLElement {
  const base = catalogMonthlyRevenue(s);
  const mine = Object.values(s.releases).filter((r) => r.owner === 'player' && !r.live).slice(0, 30);
  const pick = new Set<string>();
  return h('div', null,
    section(t(l('Leilões de catálogo', 'Catalog auctions')), s.catalogAuctions.filter((a) => a.status === 'open').length ? s.catalogAuctions.filter((a) => a.status === 'open').map((au) => {
      const top = Math.max(au.ask, ...au.bids.map((b) => b.amount));
      return h('div', { class: 'auction' }, ic('gavel', 2), ' ', h('b', null, au.seller === 'player' ? s.config.companyName : s.labels[au.seller]?.name ?? ''), ` · ${au.releaseIds.length} masters · `, t(l('lance atual', 'current bid')), ` ${$(top)} `,
        au.seller !== 'player' ? h('button', { class: 'btn small', onclick: () => { say(bidCatalog(s, au.id, Math.round(top * 1.1)), l('Lance registrado.', 'Bid placed.')); rerender(); } }, `${t(l('Dar lance', 'Bid'))} ${$(Math.round(top * 1.1))}`) : pill(t(l('seu leilão', 'your auction'))));
    }) : h('p', { class: 'muted small' }, t(l('Nenhum leilão aberto. Selos em crise leiloam catálogo.', 'No open auctions. Labels in distress auction catalogs.')))),
    section(t(l('Leiloar parte do seu catálogo', 'Auction part of your catalog')), mine.length ? h('div', null,
      h('div', { class: 'row wrap' }, mine.map((r) => h('label', { class: 'check small' }, h('input', { type: 'checkbox', onchange: (e: Event) => { if ((e.target as HTMLInputElement).checked) pick.add(r.id); else pick.delete(r.id); } }), r.title))),
      h('button', { class: 'btn small', onclick: () => { say(auctionOwnCatalog(s, [...pick]), l('Leilão aberto por 8 semanas.', 'Auction open for 8 weeks.')); rerender(); } }, ic('gavel'), ' ', t(l('Abrir leilão', 'Open auction'))),
    ) : h('p', { class: 'muted small' }, t(l('Sem masters de catálogo ainda.', 'No catalog masters yet.')))),
    section(t(l('Securitização', 'Securitization')),
      h('p', { class: 'small' }, t(l('Receita de catálogo/mês: {v}. Vende uma fatia das receitas futuras em troca de dinheiro agora (com desconto).', 'Catalog revenue/month: {v}. Sells a slice of future revenue for cash now (at a discount).'), { v: $(base) })),
      s.securitizations.filter((x) => x.untilWeek > s.week).map((x) => h('p', { class: 'small' }, ic('bank'), ` ${Math.round(x.share * 100)}% → ${$(x.paid)} / ${$(x.advance)}`)),
      h('div', { class: 'row' }, [[0.2, 24], [0.3, 36], [0.5, 60]].map(([sh, mo]) => h('button', { class: 'btn small ghost', onclick: () => { say(securitize(s, sh, mo), l('Título emitido.', 'Bond issued.')); rerender(); } }, `${sh * 100}% · ${mo}m ≈ ${$(Math.round(base * sh * mo * 0.75))}`))),
    ),
  );
}

function stockTab(s: GameState): HTMLElement {
  const lt = s.listing;
  if (!lt.listed) {
    const tm = ipoTerms(s);
    return section(t(l('Bolsa Sonora', 'Sound Exchange')),
      chips(stat('bank', $(tm.valuation), l('Avaliação estimada', 'Estimated valuation')), stat('money', $(tm.raise), l('Captação com 25%', 'Raise with 25%'))),
      tm.reason ? h('p', { class: 'muted small' }, t(tm.reason)) : null,
      h('button', { class: 'btn primary', disabled: !tm.ok, onclick: () => { say(goPublic(s), l('Abertura de capital concluída!', 'IPO completed!')); rerender(); } }, ic('chart-up'), ' ', t(l('Abrir capital (IPO)', 'Go public (IPO)'))),
    );
  }
  return section(t(l('Bolsa Sonora', 'Sound Exchange')),
    chips(stat('chart-up', $(lt.price), l('Preço da ação', 'Share price')), stat('trophy', `${Math.round((1 - lt.floatShare) * 100)}%`, l('Seu controle', 'Your control')), stat('bank', $(lt.price * lt.shares), l('Valor de mercado', 'Market cap'))),
    lineChart(lt.history),
    h('button', { class: 'btn small', onclick: () => { say(issueShares(s, 0.05), l('Ações emitidas.', 'Shares issued.')); rerender(); } }, t(l('Emitir mais 5%', 'Issue 5% more'))),
    h('p', { class: 'muted small' }, t(l('Acionistas cobram resultado: quedas fortes pressionam a reputação; lucro paga dividendos em dezembro.', 'Shareholders want results: big drops hurt reputation; profit pays dividends in December.'))),
  );
}

function legalTab(s: GameState): HTMLElement {
  const open = s.lawsuits.filter((x) => !['settled', 'won', 'lost'].includes(x.stage));
  const closed = s.lawsuits.filter((x) => ['settled', 'won', 'lost'].includes(x.stage)).slice(-8);
  const STAGE: Record<string, L> = { filed: l('ajuizado', 'filed'), discovery: l('instrução', 'discovery'), trial: l('julgamento', 'trial'), settled: l('acordo', 'settled'), won: l('vitória', 'won'), lost: l('derrota', 'lost') };
  return h('div', null,
    section(t(l('Processos em andamento', 'Active lawsuits')), open.length ? open.map((x) => h('div', { class: 'lawsuit' }, ic('gavel', 2), ' ', h('b', null, t(x.text)), ' ', pill(t(STAGE[x.stage])), ` ${t(l('valor', 'claim'))} ${$(x.claim)} · ${t(l('chance estimada', 'est. odds'))} ${Math.round(x.odds * 100)}% `,
      h('button', { class: 'btn small', onclick: () => { say(settleLawsuit(s, x.id), l('Acordo fechado.', 'Settled.')); rerender(); } }, t(l('Fazer acordo', 'Settle'))))) : h('p', { class: 'muted small' }, t(l('Nenhum processo. Samples sem liberação, plágio e auditorias geram ações.', 'No lawsuits. Uncleared samples, plagiarism and audits trigger suits.')))),
    closed.length ? section(t(l('Encerrados', 'Closed')), h('ul', { class: 'small' }, closed.map((x) => h('li', null, t(x.text), ' — ', pill(t(STAGE[x.stage]), x.stage === 'won' ? 'good' : x.stage === 'lost' ? 'bad' : ''))))) : null,
  );
}

function brandsTab(s: GameState): HTMLElement {
  const r = rngOf(s);
  const offers = s.deals.filter((d) => d.status === 'offered');
  const active = s.deals.filter((d) => d.status === 'active');
  const icon = (k: string) => (k === 'sponsor' ? 'handshake' : k === 'sync_film' ? 'film' : k === 'sync_tv' ? 'tv' : k === 'sync_game' ? 'gamepad' : k === 'sync_ad' ? 'camera' : 'contract');
  return h('div', null,
    section(t(l('Ofertas de marcas e sync', 'Brand and sync offers')), offers.length ? h('div', { class: 'cards' }, offers.map((d) => tile(icon(d.kind), d.brand, [
      h('small', null, t(dealKindName(d.kind)), ' · ', actLink(s, d.actId)),
      d.songId ? h('small', { class: 'muted' }, `♪ ${s.songs[d.songId]?.title ?? ''}`) : null,
      chips(stat('money', $(d.fee), l('Valor', 'Fee')), d.exclusive ? pill(t(l('exclusivo 12 meses', '12-month exclusive')), 'warn') : null),
      h('div', { class: 'row' },
        h('button', { class: 'btn small primary', onclick: () => { toast(t(acceptDeal(s, r, d.id)), 'info'); rerender(); } }, t(l('Aceitar', 'Accept'))),
        h('button', { class: 'btn small', onclick: () => { toast(t(acceptDeal(s, r, d.id, true)), 'info'); rerender(); } }, t(l('Contraproposta +30%', 'Counter +30%'))),
        h('button', { class: 'btn small ghost', onclick: () => { declineDeal(s, d.id); rerender(); } }, t(l('Recusar', 'Decline')))),
    ]))) : h('p', { class: 'muted small' }, t(l('Ofertas surgem com fama, contatos e um agente de sync.', 'Offers come with fame, contacts and a sync agent.')))),
    active.length ? section(t(l('Acordos ativos', 'Active deals')), h('ul', null, active.map((d) => h('li', null, ic(icon(d.kind)), ' ', d.brand, ' — ', actLink(s, d.actId), ` · ${$(d.fee)}`)))) : null,
  );
}

export function businessPanel(s: GameState): HTMLElement {
  return h('div', { class: 'panel business' },
    tabs('business', mergeTabs([
      { id: 'overview', label: t(l('Balanço', 'Balance')), icon: 'bank', render: () => overview(s) },
      { id: 'subs', label: t(l('Subselos', 'Sub-labels')), icon: 'house', badge: s.subLabels.filter((x) => x.status === 'distress').length || undefined, render: () => subsTab(s) },
      { id: 'companies', label: t(l('Empresas', 'Companies')), icon: 'handshake', render: () => companiesTab(s) },
      { id: 'catalog', label: t(l('Catálogo', 'Catalog')), icon: 'disc', render: () => catalogTab(s) },
      { id: 'stock', label: t(l('Bolsa', 'Stock market')), icon: 'chart-up', render: () => stockTab(s) },
      { id: 'legal', label: t(l('Jurídico', 'Legal')), icon: 'gavel', badge: s.lawsuits.filter((x) => !['settled', 'won', 'lost'].includes(x.stage)).length || undefined, render: () => legalTab(s) },
      { id: 'brands', label: t(l('Marcas e sync', 'Brands & sync')), icon: 'handshake', badge: s.deals.filter((d) => d.status === 'offered').length || undefined, render: () => brandsTab(s) },
    ], 'business', s), rerender),
  );
}

void N; void genreName; void logo;
