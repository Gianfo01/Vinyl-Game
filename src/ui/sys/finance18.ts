// Rodada 18 (econ18): DRE e fluxo de caixa por mês/ano, contas a receber/pagar na linha do tempo, câmbio por
// exposição, renda perdida com vendas de catálogo e resultado das turnês. Lucro ≠ caixa, e a tela mostra por quê.
import { l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { arTotal18, apTotal18, fin18, netProfit18, opProfit18, sumP18 } from '../../sim/ledger18';
import { factor18, factorRate18, fxWhy18, whoName18 } from '../../sim/sys/econ18';
import type { GameState } from '../../sim/types';
import { $, actLink, rerender, section, toast } from '../common';
import { h } from '../dom';
import { chips, stat } from '../vis';
import { registerTab } from '../registry';

const MON: L[] = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => l(m, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]));
const mName = (mi: number) => `${t(MON[mi % 12])}/${String(Math.floor(mi / 12)).slice(2)}`;

const REV: [string, L][] = [['rec', l('Gravações (vendas, streaming, distribuição)', 'Recordings (sales, streaming, distribution)')], ['live', l('Shows e turnês', 'Live and touring')], ['pub', l('Edição, sync e licenças', 'Publishing, sync and licensing')], ['merch', l('Merch e marcas', 'Merch and brands')], ['svc', l('Serviços e outras operações', 'Services and other operations')]];
const COST: [string, L][] = [['cogs', l('Custos diretos (gravação, fabricação, royalties, logística)', 'Direct costs (recording, manufacturing, royalties, logistics)')], ['mkt', l('Marketing e divulgação', 'Marketing and promotion')], ['ar', l('A&R (adiantamentos, desenvolvimento)', 'A&R (advances, development)')], ['pay', l('Pessoal', 'Payroll')], ['ovh', l('Despesas gerais (sede, jurídico, administração)', 'Overhead (HQ, legal, admin)')]];
const NON: [string, L][] = [['fx', l('Perda cambial', 'FX loss')], ['int', l('Despesa financeira (antecipação de recebíveis)', 'Financial cost (receivables factoring)')], ['oth', l('Outros não operacionais (indenizações, dividendos recebidos…)', 'Other non-operating (settlements, dividends received…)')]];

const st = { per: 'year' as 'year' | 'month', y: 0, m: 0 };

function row(label: string, v: number, cls = '', strong = false): HTMLElement {
  return h('tr', { class: cls }, h('td', null, strong ? h('b', null, label) : label), h('td', { class: `num ${v < 0 ? 'bad' : v > 0 ? 'good' : 'muted'}` }, strong ? h('b', null, $(v)) : $(v)));
}

function dre(o: Record<string, number> | undefined): HTMLElement {
  const rev = sumP18(o, 'rev:'), op = opProfit18(o), net = netProfit18(o);
  return h('table', { class: 'tbl compact dre18' }, h('tbody', null,
    h('tr', null, h('th', { colspan: 2 }, t(l('Receita operacional', 'Operating revenue')))),
    ...REV.map(([k, n]) => row(t(n), o?.[`rev:${k}`] ?? 0)),
    row(t(l('= Receita operacional', '= Operating revenue')), rev, '', true),
    h('tr', null, h('th', { colspan: 2 }, t(l('Custos e despesas', 'Costs and expenses')))),
    ...COST.map(([k, n]) => row(t(n), o?.[`cost:${k}`] ?? 0)),
    row(t(l('= Lucro operacional (o que o conselho cobra)', '= Operating profit (what the board judges)')), op, '', true),
    ...NON.map(([k, n]) => row(t(n), o?.[`nonop:${k}`] ?? 0)),
    row(t(l('Impostos', 'Taxes')), sumP18(o, 'tax:')),
    row(t(l('= Resultado líquido', '= Net result')), net, '', true),
    h('tr', null, h('th', { colspan: 2 }, t(l('Fluxo de caixa', 'Cash flow')))),
    row(t(l('Operacional (o que entrou e saiu de verdade)', 'Operating (what actually came in and out)')), o?.['cf:op'] ?? 0),
    row(t(l('Investimento (compra/venda de catálogo, casas, sede, empresas)', 'Investing (buying/selling catalog, venues, HQ, companies)')), o?.['cf:inv'] ?? 0),
    row(t(l('Financiamento (empréstimos, aportes, IPO, retiradas, dividendos)', 'Financing (loans, investors, IPO, owner draws, dividends)')), o?.['cf:fin'] ?? 0),
    row(t(l('= Variação do caixa', '= Change in cash')), (o?.['cf:op'] ?? 0) + (o?.['cf:inv'] ?? 0) + (o?.['cf:fin'] ?? 0), '', true),
  ));
}

/** barras de 12 meses: lucro operacional × caixa operacional (lucro ≠ caixa) */
function bars(s: GameState): HTMLElement {
  const f = fin18(s);
  const cur = s.year * 12 + s.month;
  const ms = Array.from({ length: 12 }, (_, i) => cur - 11 + i);
  const op = ms.map((m) => opProfit18(f.m[m])), cf = ms.map((m) => f.m[m]?.['cf:op'] ?? 0);
  const max = Math.max(1, ...op.map(Math.abs), ...cf.map(Math.abs));
  const W = 300, H = 90, bw = W / 12;
  const y = (v: number) => H / 2 - (v / max) * (H / 2 - 4);
  let svg = `<line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="currentColor" stroke-opacity=".3"/>`;
  ms.forEach((_, i) => {
    const a = op[i], b = cf[i];
    svg += `<rect x="${i * bw + 2}" y="${Math.min(y(a), H / 2)}" width="${bw / 2 - 2}" height="${Math.abs(y(a) - H / 2)}" fill="var(--accent, #4a8)"><title>${t(l('Lucro operacional', 'Operating profit'))} ${mName(ms[i])}: ${$(a)}</title></rect>`;
    svg += `<rect x="${i * bw + bw / 2}" y="${Math.min(y(b), H / 2)}" width="${bw / 2 - 2}" height="${Math.abs(y(b) - H / 2)}" fill="var(--warn, #c84)"><title>${t(l('Caixa operacional', 'Operating cash'))} ${mName(ms[i])}: ${$(b)}</title></rect>`;
  });
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', `0 0 ${W} ${H}`);
  el.setAttribute('class', 'bars18');
  el.setAttribute('style', 'width:100%;max-width:460px;height:auto');
  el.innerHTML = svg;
  return h('div', null, el as unknown as HTMLElement, h('p', { class: 'muted small' }, '■ ', t(l('verde: lucro operacional (competência)', 'green: operating profit (accrual)')), ' · ■ ', t(l('laranja: caixa operacional (dinheiro de fato)', 'orange: operating cash (actual money)')), ' — ', mName(ms[0]), '…', mName(ms[11])));
}

function timeline(s: GameState): HTMLElement {
  const f = fin18(s);
  const cur = s.year * 12 + s.month;
  const months = new Map<number, { inn: number; out: number; who: Set<string> }>();
  for (const b of [...f.ar, ...f.ap]) {
    const m = Math.max(cur, b.due);
    const x = months.get(m) ?? { inn: 0, out: 0, who: new Set<string>() };
    if (b.amt > 0) x.inn += b.amt; else x.out += b.amt;
    x.who.add(t(whoName18(b.who)) + (b.mk ? ` ${b.mk.toUpperCase()}` : ''));
    months.set(m, x);
  }
  const rows = [...months.entries()].sort((a, b) => a[0] - b[0]).slice(0, 14);
  const soon = f.ar.filter((b) => b.amt > 0).sort((a, b) => a.due - b.due)[0];
  return h('div', null,
    chips(stat('bank', $(arTotal18(s)), l('A receber', 'Receivables')), stat('warning', $(apTotal18(s)), l('A pagar (royalties)', 'Payables (royalties)')), stat('money', $(s.player.cash), l('Caixa', 'Cash'), s.player.cash < 0 ? 'bad' : '')),
    rows.length ? h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Mês', 'Month'))), h('th', null, t(l('Entra', 'In'))), h('th', null, t(l('Sai', 'Out'))), h('th', null, t(l('De/para', 'From/to'))))),
      h('tbody', null, rows.map(([m, x]) => h('tr', null, h('td', null, mName(m)), h('td', { class: 'good' }, x.inn ? $(x.inn) : '—'), h('td', { class: 'bad' }, x.out ? $(x.out) : '—'), h('td', { class: 'small' }, [...x.who].slice(0, 4).join(', ')))))) : h('p', { class: 'muted small' }, t(l('Nada a receber nem a pagar.', 'Nothing receivable or payable.'))),
    h('p', { class: 'muted small' }, t(l('Prazos: distribuidor físico paga em 90–120 dias (mais em países lentos ou em crise), plataformas digitais ~2 meses, sociedade arrecadadora por trimestre/semestre. Royalties do artista saem na prestação de contas do contrato.', 'Terms: physical distributors pay in 90–120 days (longer in slow or crisis countries), digital platforms ~2 months, collection societies quarterly/semiannually. Artist royalties go out on the contract\'s statement date.'))),
    h('div', { class: 'row wrap' },
      soon ? h('button', { class: 'btn small', onclick: () => { const got = factor18(s, Math.max(soon.amt, 1), l('Pedido seu', 'Your request')); toast(t(l('Antecipado: {v}', 'Advanced: {v}'), { v: $(got) }), 'good'); rerender(); } }, t(l('Antecipar o próximo título (desconto {d}%)', 'Factor the next receivable ({d}% discount)'), { d: Math.round(factorRate18(s, soon) * 100) })) : null,
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: f.auto, onchange: (e: Event) => { f.auto = (e.target as HTMLInputElement).checked; rerender(); } }), t(l('Antecipar automaticamente se o caixa ficar negativo', 'Auto-factor receivables when cash goes negative'))),
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: f.delayRoy, onchange: (e: Event) => { f.delayRoy = (e.target as HTMLInputElement).checked; rerender(); } }), t(l('Atrasar prestação de contas quando faltar caixa (confiança e auditorias)', 'Delay royalty statements when short of cash (trust and audits)'))),
      h('label', { class: 'check small' }, h('input', { type: 'checkbox', checked: (s.flags.fastPay18 ?? 0) > 0, onchange: (e: Event) => { s.flags.fastPay18 = (e.target as HTMLInputElement).checked ? 1 : 0; rerender(); } }), t(l('Distribuidor com pagamento rápido (+3% de taxa, −1 mês de prazo)', 'Fast-pay distributor (+3% fee, −1 month term)'))),
    ),
  );
}

function fx(s: GameState): HTMLElement | null {
  const ex = fxWhy18.get(s);
  if (!ex.length) return null;
  return section(t(l('Câmbio: por que perdemos dinheiro', 'FX: why we are losing money')),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Mercado', 'Market'))), h('th', null, t(l('Desvalorização/ano', 'Devaluation/yr'))), h('th', null, t(l('Faturado no mês', 'Billed this month'))), h('th', null, t(l('A receber lá', 'Receivable there'))), h('th', null, t(l('A pagar lá (proteção)', 'Payable there (hedge)'))), h('th', null, t(l('Perda', 'Loss'))))),
      h('tbody', null, ex.map((e) => h('tr', null, h('td', null, e.mk.toUpperCase()), h('td', null, `${Math.round(e.rate * 100)}%`), h('td', null, $(e.flow)), h('td', null, $(e.ar + e.cash)), h('td', null, $(e.ap)), h('td', { class: 'bad' }, $(e.loss)))))),
    h('p', { class: 'muted small' }, t(l('A perda vem da SUA exposição: vendas faturadas no país, títulos parados lá (prazo longo = mais perda) e caixa na moeda da casa. Royalties devidos na mesma moeda protegem. Antecipar recebíveis e o distribuidor rápido reduzem a exposição.', 'The loss comes from YOUR exposure: sales billed in that country, receivables sitting there (longer terms = more loss) and cash in the home currency. Royalties owed in the same currency hedge it. Factoring and the fast-pay distributor reduce exposure.'))));
}

function lost(s: GameState): HTMLElement | null {
  const f = fin18(s);
  if (!f.lost.length) return null;
  return section(t(l('Catálogo vendido: caixa hoje × renda futura', 'Catalog sold: cash today × future income')),
    h('table', { class: 'tbl compact' }, h('tbody', null, f.lost.slice(-8).reverse().map((x) => h('tr', null, h('td', null, `${t(MON[x.m])}/${x.y}`), h('td', null, x.what), h('td', { class: 'good' }, '+' + $(x.cash)), h('td', { class: 'bad' }, `−${$(x.perYear)}/${t(l('ano', 'yr'))}`), h('td', { class: 'muted small' }, t(l('≈{v} em 10 anos', '≈{v} over 10 years'), { v: $(Math.round(x.perYear * (1 - Math.pow(0.88, 10)) / 0.12)) })))))),
    h('p', { class: 'muted small' }, t(l('Venda de catálogo é investimento (não lucro): salva o caixa agora e corta a receita dos próximos anos.', 'A catalog sale is investing (not profit): it saves cash now and cuts the next years\' revenue.'))));
}

function tours(s: GameState): HTMLElement | null {
  const done = s.tours.filter((x) => x.status === 'done' && s.acts[x.actId]?.owner === 'player').slice(-6).reverse();
  if (!done.length) return null;
  return section(t(l('Turnês: casa cheia não é lucro', 'Tours: a full house is not profit')),
    h('table', { class: 'tbl compact' },
      h('thead', null, h('tr', null, h('th', null, t(l('Turnê', 'Tour'))), h('th', null, t(l('Ocupação', 'Occupancy'))), h('th', null, t(l('Receita', 'Revenue'))), h('th', null, t(l('Custos', 'Costs'))), h('th', null, t(l('Resultado', 'Result'))))),
      h('tbody', null, done.map((x) => {
        const pl = x.stops.filter((p) => p.status === 'played');
        const occ = pl.length ? pl.reduce((a, p) => a + p.sold, 0) / Math.max(1, pl.reduce((a, p) => a + p.capacity, 0)) : 0;
        const res = x.revenue - x.costs;
        return h('tr', null, h('td', null, actLink(s, x.actId), ' ', x.name), h('td', { class: occ > 0.9 ? 'good' : '' }, `${Math.round(occ * 100)}%`), h('td', null, $(x.revenue)), h('td', null, $(x.costs)), h('td', { class: res < 0 ? 'bad' : 'good' }, $(res), res < 0 && occ > 0.85 ? ' ' + t(l('(lotou e perdeu: produção e logística caras)', '(sold out and lost: costly production and logistics)')) : ''));
      }))));
}

function render(s: GameState): HTMLElement {
  const f = fin18(s);
  const years = Object.keys(f.y).map(Number).sort((a, b) => b - a);
  if (!st.y || !f.y[st.y]) st.y = years[0] ?? s.year;
  const cur = s.year * 12 + s.month;
  if (!st.m || st.m > cur || st.m < cur - 47) st.m = cur;
  const o = st.per === 'year' ? f.y[st.y] : f.m[st.m];
  const pick = h('div', { class: 'row wrap' },
    h('button', { class: `btn small ${st.per === 'year' ? '' : 'ghost'}`, onclick: () => { st.per = 'year'; rerender(); } }, t(l('Por ano', 'By year'))),
    h('button', { class: `btn small ${st.per === 'month' ? '' : 'ghost'}`, onclick: () => { st.per = 'month'; rerender(); } }, t(l('Por mês', 'By month'))),
    ...(st.per === 'year' ? years.slice(0, 8).map((y) => h('button', { class: `btn small ${y === st.y ? '' : 'ghost'}`, onclick: () => { st.y = y; rerender(); } }, String(y)))
      : Array.from({ length: 12 }, (_, i) => cur - 11 + i).filter((m) => f.m[m]).map((m) => h('button', { class: `btn small ${m === st.m ? '' : 'ghost'}`, onclick: () => { st.m = m; rerender(); } }, mName(m)))));
  return h('div', null,
    section(t(l('Demonstrativo de resultado e fluxo de caixa', 'Income statement and cash flow')), pick, dre(o),
      h('p', { class: 'muted small' }, t(l('Aporte de investidor, empréstimo, IPO e venda de ativos NÃO são receita nem lucro: entram em Financiamento/Investimento. O conselho, as metas e a avaliação da empresa usam o lucro operacional.', 'Investor money, loans, IPOs and asset sales are NOT revenue or profit: they go to Financing/Investing. The board, goals and company valuation use operating profit.')))),
    section(t(l('Lucro × caixa nos últimos 12 meses', 'Profit × cash over the last 12 months')), bars(s),
      h('p', { class: 'muted small' }, t(l('Um disco lucrativo pode deixar o selo sem caixa por meses: a receita é reconhecida na venda, mas o distribuidor só paga no prazo.', 'A profitable record can leave the label cash-starved for months: revenue is booked at sale, but the distributor only pays on terms.')))),
    section(t(l('Contas a receber e a pagar', 'Receivables and payables')), timeline(s)),
    fx(s), lost(s), tours(s),
  );
}

registerTab('business', { id: 'dre18', label: l('DRE e caixa', 'P&L and cash'), icon: 'chart-up', order: 0, render });
