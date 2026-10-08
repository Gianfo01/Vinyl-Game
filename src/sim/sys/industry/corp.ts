// Grupo empresarial: streaming próprio, mídia própria (rádio, TV, revista), promotora de shows e
// ticketeira, fábrica de instrumentos com endossos, conselho (modo carreira), fusões entre rivais
// com órgão antitruste, e câmbio/inflação por mercado.

import { clamp, type Rng } from '../../../core/rng';
import { MARKETS, cityById, l, type L, type MarketId } from '../../../data/world';
import { registerEvents, emitEvent, type EventDef } from '../../events';
import { registerMod, registerSimHook } from '../../ext4';
import type { GameState } from '../../types';
import { fmtL, hasTech, money, nextId, notify, playerActs, post, remember } from '../../util';
import { researchDone } from './research';
import type { Outlet } from './state';

// ------------------------------------------------------------------ streaming próprio

export function launchStreaming(s: GameState, name: string): L | null {
  const st = s.x4.industry.streaming;
  if (!hasTech(s, 'streaming')) return l('Streaming ainda não existe.', 'Streaming does not exist yet.');
  if (st.active) return l('Sua plataforma já está no ar.', 'Your platform is already live.');
  const cost = money(s, 2500000);
  if (s.player.cash < cost) return l('Caixa insuficiente (precisa de um investimento enorme).', 'Not enough cash (it needs a huge investment).');
  post(s, `streamlaunch:${s.week}`, -cost, 'business', 'Lançamento da plataforma de streaming');
  Object.assign(st, { active: true, subs: 20000, since: s.week, licenses: [], name: name || `${s.config.companyName} Play` });
  remember(s, 'streaming', fmtL(l('{c} lança a própria plataforma de streaming: {n}.', '{c} launches its own streaming platform: {n}.'), { c: s.config.companyName, n: st.name }), { important: true });
  return null;
}

export function licenseCatalog(s: GameState, labelId: string): L | null {
  const st = s.x4.industry.streaming;
  const lb = s.labels[labelId];
  if (!st.active || !lb) return l('Inválido.', 'Invalid.');
  if (st.licenses.includes(labelId)) return l('Catálogo já licenciado.', 'Catalog already licensed.');
  const cost = money(s, 40000 + lb.roster.length * 4000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `streamlic:${labelId}:${s.week}`, -cost, 'business', `Licença do catálogo de ${lb.name}`);
  st.licenses.push(labelId);
  return null;
}

function streamingMonth(s: GameState, r: Rng): void {
  const st = s.x4.industry.streaming;
  if (!st.active) return;
  const catalog = Object.values(s.releases).filter((x) => x.owner === 'player').length + st.licenses.reduce((t, id) => t + (s.labels[id]?.roster.length ?? 0) * 6, 0);
  const target = catalog * 900 * (researchDone(s, 'fan_crm') ? 1.3 : 1);
  st.subs = Math.max(0, Math.round(st.subs + (target - st.subs) * 0.05 + r.normal(0, st.subs * 0.01)));
  post(s, `streamsubs:${s.year}:${s.month}`, Math.round(st.subs * money(s, 9) * 0.3), 'business', `Assinaturas ${st.name}`);
  post(s, `streamcost:${s.year}:${s.month}`, -Math.round(money(s, 60000) + st.subs * money(s, 9) * 0.12), 'business', `Operação ${st.name}`);
}

// ------------------------------------------------------------------ mídia própria

const OUTLET_INFO: Record<Outlet['kind'], { name: L; from: number; cost: number; revenue: number }> = {
  radio: { name: l('Rádio', 'Radio station'), from: 1922, cost: 250000, revenue: 9000 },
  magazine: { name: l('Revista de música', 'Music magazine'), from: 1925, cost: 120000, revenue: 4000 },
  tv: { name: l('Canal de TV', 'TV channel'), from: 1950, cost: 1500000, revenue: 45000 },
};

export function outletKinds(s: GameState): Outlet['kind'][] {
  return (Object.keys(OUTLET_INFO) as Outlet['kind'][]).filter((k) => s.year >= OUTLET_INFO[k].from);
}

export function outletCost(s: GameState, kind: Outlet['kind']): number {
  return money(s, OUTLET_INFO[kind].cost);
}

export function buyOutlet(s: GameState, kind: Outlet['kind'], market: MarketId, name: string): L | null {
  const st = s.x4.industry;
  if (!outletKinds(s).includes(kind)) return l('Ainda não existe nesta época.', 'Not available in this era yet.');
  if (st.outlets.some((o) => o.kind === kind && o.market === market)) return l('Você já tem esse veículo neste mercado.', 'You already own that outlet in this market.');
  const cost = outletCost(s, kind);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `outlet:${kind}:${market}:${s.week}`, -cost, 'business', `Compra de ${OUTLET_INFO[kind].name.pt}`);
  st.outlets.push({ id: nextId(s, 'mo'), kind, market, name: name || `${OUTLET_INFO[kind].name.pt} ${s.config.companyName}`, audience: 35, bought: s.week, favoritism: 0.2 });
  return null;
}

export function setFavoritism(s: GameState, id: string, v: number): void {
  const o = s.x4.industry.outlets.find((x) => x.id === id);
  if (o) o.favoritism = clamp(v, 0, 1);
}

/** A internet corrói rádio, TV e revistas (opção "Disrupção da mídia tradicional" do Capitalism Lab). */
function mediaDisruption(s: GameState): number {
  if (!hasTech(s, 'internet')) return 0;
  return Math.min(0.6, (s.year - 1997) * 0.025);
}

function outletsMonth(s: GameState, r: Rng): void {
  const st = s.x4.industry;
  const dis = mediaDisruption(s);
  for (const o of st.outlets) {
    const target = 55 - dis * 60 - o.favoritism * 15 + (o.kind === 'tv' && s.year < 1995 ? 15 : 0);
    o.audience = clamp(o.audience + (target - o.audience) * 0.08 + r.normal(0, 1.2), 3, 95);
    const base = money(s, OUTLET_INFO[o.kind].revenue);
    post(s, `outletrev:${o.id}`, Math.round(base * (o.audience / 50)), 'business', `Publicidade ${o.name}`);
    post(s, `outletcost:${o.id}`, -Math.round(base * 0.7), 'business', `Operação ${o.name}`);
    if (o.favoritism > 0.5 && r.chance((o.favoritism - 0.5) * 0.06)) emitEvent(s, r, 'ind_favoritism', { outlet: o.id, outletName: o.name });
  }
}

registerMod('appeal', 'industry:outlets', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  let m = 1;
  for (const o of s.x4.industry.outlets) if (rel.territories.includes(o.market)) m *= 1 + (o.audience / 100) * o.favoritism * (o.kind === 'tv' ? 0.25 : o.kind === 'radio' ? 0.18 : 0.08);
  return { value: v * m, label: l('Mídia própria', 'Own media') };
});

// ------------------------------------------------------------------ promotora, ticketeira, instrumentos

export function openVenture(s: GameState, kind: 'promoter' | 'ticketing' | 'instruments'): L | null {
  const st = s.x4.industry;
  const v = st[kind];
  if (v.active) return l('Já está em operação.', 'Already operating.');
  if (kind === 'ticketing' && s.year < 1970) return l('Ticketeiras nacionais surgem nos anos 70.', 'National ticketing companies appear in the 1970s.');
  const cost = money(s, kind === 'promoter' ? 150000 : kind === 'ticketing' ? 300000 : 200000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `venture:${kind}:${s.week}`, -cost, 'business', kind === 'promoter' ? 'Promotora de shows' : kind === 'ticketing' ? 'Ticketeira' : 'Fábrica de instrumentos');
  v.active = true;
  v.since = s.week;
  return null;
}

export function endorse(s: GameState, actId: string): L | null {
  const ins = s.x4.industry.instruments;
  if (!ins.active) return l('Abra a fábrica de instrumentos primeiro.', 'Open the instrument factory first.');
  if (ins.endorsements.includes(actId)) return l('Já endossa.', 'Already endorsing.');
  const a = s.acts[actId];
  const fee = money(s, 1500 + (a?.fame ?? 0) * 120);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `endorse:${actId}:${s.week}`, -fee, 'business', `Endosso de ${a?.name}`);
  ins.endorsements.push(actId);
  return null;
}

function venturesMonth(s: GameState, r: Rng): void {
  const st = s.x4.industry;
  const pool = s.stats.weeklyPool || 1;
  const markets = s.player.territories.length;
  const bonus360 = researchDone(s, 'deal_360') ? 1.1 : 1;
  if (st.promoter.active) {
    const rev = Math.round(money(s, 6000) * markets * r.float(0.7, 1.3) * bonus360);
    st.promoter.revenue = rev;
    post(s, `promoter:${s.year}:${s.month}`, rev, 'live', 'Promotora: shows de terceiros');
    post(s, `promoterc:${s.year}:${s.month}`, -Math.round(rev * 0.62), 'live', 'Promotora: custos');
    if (r.chance(0.02)) emitEvent(s, r, 'ind_conflict', {});
  }
  if (st.ticketing.active) {
    const rev = Math.round(money(s, 4500) * markets * (s.year > 2005 ? 1.6 : 1) * bonus360);
    st.ticketing.revenue = rev;
    post(s, `ticketing:${s.year}:${s.month}`, rev, 'live', 'Ticketeira: taxas');
    post(s, `ticketingc:${s.year}:${s.month}`, -Math.round(rev * 0.5), 'live', 'Ticketeira: operação');
  }
  if (st.instruments.active) {
    st.instruments.endorsements = st.instruments.endorsements.filter((id) => s.acts[id]);
    const fame = st.instruments.endorsements.reduce((t, id) => t + (s.acts[id]?.fame ?? 0), 0);
    const rev = Math.round(money(s, 3000 + fame * 90) * r.float(0.8, 1.2));
    st.instruments.revenue = rev;
    post(s, `instr:${s.year}:${s.month}`, rev, 'business', 'Instrumentos e equipamentos');
    post(s, `instrc:${s.year}:${s.month}`, -Math.round(rev * 0.65), 'business', 'Fábrica de instrumentos: custos');
  }
  void pool;
}

registerMod('cityDemand', 'industry:promoter', (s, v, c) => {
  if (!s.x4.industry.promoter.active || !c.act || c.act.owner !== 'player') return null;
  return { value: v * 1.05 };
});

// ------------------------------------------------------------------ conselho (modo carreira)

const GOALS = [
  { id: 'profit', metric: 'profit' as const, text: l('Lucro anual acima de {t}', 'Annual profit above {t}') },
  { id: 'releases', metric: 'releases' as const, text: l('Ao menos {t} lançamentos no ano', 'At least {t} releases this year') },
  { id: 'top10', metric: 'top10' as const, text: l('Ao menos {t} hits no top 10', 'At least {t} top-10 hits') },
  { id: 'awards', metric: 'awards' as const, text: l('Ao menos {t} prêmios no ano', 'At least {t} awards this year') },
];

function newGoals(s: GameState, r: Rng): GameState['x4']['industry']['board']['goals'] {
  const b = s.x4.industry.board;
  const profitT = Math.max(money(s, 20000), Math.round((s.player.profitByYear[s.year - 1] ?? money(s, 20000)) * 1.1));
  const out: GameState['x4']['industry']['board']['goals'] = [
    { id: 'profit', metric: 'profit' as const, target: profitT, text: fmtL(GOALS[0].text, { t: `$${Math.round(profitT / 100).toLocaleString('pt-BR')}` }) },
    { id: 'releases', metric: 'releases' as const, target: 3 + Math.min(10, playerActs(s).length), text: fmtL(GOALS[1].text, { t: 3 + Math.min(10, playerActs(s).length) }) },
  ];
  const extra = r.pick(GOALS.slice(2));
  const target = extra.metric === 'top10' ? 1 + Math.floor(b.warnings === 0 ? 1 : 0) : 1;
  out.push({ id: extra.id, metric: extra.metric, target, text: fmtL(extra.text, { t: target }) });
  return out;
}

export function joinBoard(s: GameState, r: Rng): L | null {
  const b = s.x4.industry.board;
  if (b.active) return l('O conselho já está ativo.', 'The board is already active.');
  const cash = money(s, 400000);
  post(s, `boardin:${s.week}`, cash, 'financing', 'Aporte de investidores (conselho)');
  Object.assign(b, { active: true, since: s.week, satisfaction: 60, year: s.year, warnings: 0, bonusPaid: 0, offers: [] });
  b.goals = newGoals(s, r);
  remember(s, 'board', fmtL(l('Investidores entram na {c}: agora há um conselho com metas anuais.', 'Investors join {c}: there is now a board with annual goals.'), { c: s.config.companyName }), { important: true });
  return null;
}

function goalValue(s: GameState, metric: string): number {
  const st = s.player.stats;
  if (metric === 'profit') return s.player.profitByYear[s.year] ?? 0;
  if (metric === 'releases') return Object.values(s.releases).filter((x) => x.owner === 'player' && x.year === s.year).length;
  if (metric === 'top10') return Object.values(s.releases).filter((x) => x.owner === 'player' && x.year === s.year && x.peak <= 10).length;
  if (metric === 'awards') return s.awards.filter((a) => a.byPlayer && a.year === s.year).length;
  return st.releases;
}

export function boardProgress(s: GameState) {
  return s.x4.industry.board.goals.map((g) => ({ ...g, value: goalValue(s, g.metric) }));
}

function boardYear(s: GameState, r: Rng): void {
  const b = s.x4.industry.board;
  if (!b.active) return;
  const prog = boardProgress(s);
  const met = prog.filter((g) => g.value >= g.target).length;
  b.satisfaction = clamp(b.satisfaction + (met - 1.5) * 18, 0, 100);
  if (met === prog.length) {
    const bonus = money(s, 15000);
    post(s, `boardbonus:${s.year}`, bonus, 'financing', 'Bônus do conselho');
    b.bonusPaid += bonus;
    notify(s, l('O conselho bateu palmas: todas as metas cumpridas. Bônus pago.', 'The board applauded: every goal met. Bonus paid.'), 'good');
  } else if (met === 0 || b.satisfaction < 25) {
    b.warnings += 1;
    notify(s, fmtL(l('O conselho está insatisfeito (aviso {n} de 2).', 'The board is unhappy (warning {n} of 2).'), { n: b.warnings }), 'bad');
  }
  if (b.warnings >= 3 && !s.ended) {
    s.ended = { ending: 'fired_by_board', year: s.year, reason: 'insolvency' };
    remember(s, 'fired', l('O conselho demite a diretoria. Sua passagem pelo selo termina aqui.', 'The board fires management. Your time at the label ends here.'), { important: true });
    return;
  }
  // rivais de olho em quem entrega
  if (b.satisfaction > 75 && r.chance(0.4)) {
    const lb = r.pick(Object.values(s.labels).filter((x) => x.active));
    if (lb) b.offers.unshift({ label: lb.name, week: s.week });
    if (b.offers.length > 5) b.offers.length = 5;
  }
  b.year = s.year + 1;
  b.goals = newGoals(s, r);
}

// ------------------------------------------------------------------ fusões e antitruste

function mergersYear(s: GameState, r: Rng): void {
  const big = Object.values(s.labels).filter((x) => x.active && x.family === 'A').sort((a, b) => b.cash - a.cash);
  if (big.length < 3 || s.year < 1955 || !r.chance(0.18)) return;
  const [buyer, target] = [big[0], big[big.length - 1]];
  // órgão regulador: quanto maior a soma, maior a chance de exigir desinvestimento
  const share = (buyer.roster.length + target.roster.length) / Math.max(1, Object.values(s.labels).reduce((t, x) => t + x.roster.length, 0));
  const forced = share > 0.18 || r.chance(0.3);
  if (forced) {
    emitEvent(s, r, 'ind_divestiture', { buyer: buyer.id, target: target.id, buyerName: buyer.name, targetName: target.name, price: money(s, 60000 + target.roster.length * 15000) });
  } else {
    target.active = false;
    for (const id of target.roster) { const a = s.acts[id]; if (a) a.owner = buyer.id; buyer.roster.push(id); }
    target.roster = [];
    buyer.cash += target.cash;
    for (const rel of Object.values(s.releases)) if (rel.owner === target.id) rel.owner = buyer.id;
  }
  const text = fmtL(forced ? l('{b} compra {t}; o órgão antitruste exige a venda de parte do catálogo.', '{b} buys {t}; the antitrust authority demands a partial divestiture.') : l('{b} absorve {t}. O mercado fica mais concentrado.', '{b} absorbs {t}. The market becomes more concentrated.'), { b: buyer.name, t: target.name });
  s.x4.industry.mergers.unshift({ year: s.year, text });
  if (s.x4.industry.mergers.length > 12) s.x4.industry.mergers.length = 12;
  remember(s, 'merger', text, { important: true });
}

// ------------------------------------------------------------------ câmbio e inflação

/** Perda de valor da moeda local por ano (hiperinflação, crises cambiais). */
export function fxLoss(market: MarketId, year: number): number {
  if (market === 'br' && year >= 1980 && year <= 1994) return year >= 1986 ? 0.22 : 0.12;
  if (market === 'latam' && year >= 1982 && year <= 1991) return 0.15;
  if (market === 'latam' && year >= 2001 && year <= 2002) return 0.12;
  if (market === 'asia' && year >= 1997 && year <= 1998) return 0.1;
  if (market === 'eu' && year >= 1923 && year <= 1923) return 0.5;
  if (market === 'africa' && year >= 1990 && year <= 2008) return 0.06;
  return 0;
}

function fxMonth(s: GameState): void {
  const st = s.x4.industry;
  const sales = s.monthLedger.sales ?? 0;
  if (sales <= 0) return;
  let loss = 0;
  const terr = s.player.territories;
  for (const m of MARKETS) {
    const lossRate = fxLoss(m.id, s.year);
    st.fx[m.id] = clamp((st.fx[m.id] ?? 1) * (1 - lossRate / 12), 0.01, 1);
    if (!lossRate || !terr.includes(m.id)) continue;
    const weight = m.size(s.year) / terr.reduce((t, id) => t + (MARKETS.find((x) => x.id === id)?.size(s.year) ?? 0), 0);
    loss += sales * weight * (lossRate / 2);
  }
  if (loss > 0) {
    post(s, `fx:${s.year}:${s.month}`, -Math.round(loss), 'fx', 'Perda cambial e inflação local');
    st.fxLossYear += Math.round(loss);
  }
}

// ------------------------------------------------------------------ eventos

const EVENTS_IND: EventDef[] = [
  {
    id: 'ind_favoritism', cat: 'business', tone: 'bad', tags: [], cooldown: 12, forcedOnly: true,
    title: l('Acusação de favorecimento', 'Favoritism accusation'),
    text: l('Concorrentes acusam {outletName} de tocar só os artistas da casa.', 'Competitors accuse {outletName} of only playing house artists.'),
    options: [
      { id: 'reduce', label: l('Diminuir a preferência', 'Tone down the favoritism'), apply: (s, _r, c) => { const o = s.x4.industry.outlets.find((x) => x.id === c.outlet); if (o) o.favoritism = 0.2; } },
      { id: 'deny', label: l('Negar e seguir', 'Deny and carry on'), hint: l('Reputação institucional cai.', 'Institutional reputation drops.'), apply: (s) => { s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100); } },
    ],
  },
  {
    id: 'ind_conflict', cat: 'business', tone: 'bad', tags: [], cooldown: 18, forcedOnly: true,
    title: l('Conflito de interesse', 'Conflict of interest'),
    text: l('Artistas de outros selos reclamam que a sua promotora dá as melhores datas aos seus.', "Other labels' artists complain that your promoter gives the best dates to your own acts."),
    options: [
      { id: 'audit', label: l('Contratar auditoria independente', 'Hire an independent audit'), apply: (s) => { post(s, `audit:${s.week}`, -money(s, 8000), 'legal', 'Auditoria independente'); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100); } },
      { id: 'ignore', label: l('Ignorar', 'Ignore'), apply: (s) => { s.player.reputation.artists = clamp(s.player.reputation.artists - 4, 0, 100); } },
    ],
  },
  {
    id: 'ind_divestiture', cat: 'business', tone: 'good', tags: [], cooldown: 0, forcedOnly: true,
    title: l('Desinvestimento obrigatório', 'Forced divestiture'),
    text: l('O órgão antitruste aprovou a compra de {targetName} por {buyerName} com uma condição: parte do catálogo precisa ser vendida. Você pode comprar.', 'The antitrust authority approved {buyerName} buying {targetName} on one condition: part of the catalog must be sold. You can buy it.'),
    options: [
      { id: 'buy', label: l('Comprar o catálogo', 'Buy the catalog'), apply: (s, _r, c) => {
        const t = s.labels[String(c.target)];
        const b = s.labels[String(c.buyer)];
        const price = Number(c.price);
        if (!t || s.player.cash < price) return;
        post(s, `divest:${t.id}`, -price, 'business', `Catálogo de ${t.name}`);
        const rels = Object.values(s.releases).filter((x) => x.owner === t.id).sort((a, z) => z.totalUnits - a.totalUnits).slice(0, 12);
        for (const rel of rels) rel.owner = 'player';
        t.active = false;
        if (b) { for (const id of t.roster) { const a = s.acts[id]; if (a) a.owner = b.id; b.roster.push(id); } }
        t.roster = [];
        remember(s, 'divest', fmtL(l('Você compra {n} masters de {t} no desinvestimento.', 'You buy {n} masters from {t} in the divestiture.'), { n: rels.length, t: t.name }), { important: true });
      } },
      { id: 'pass', label: l('Deixar passar', 'Pass'), apply: (s, _r, c) => {
        const t = s.labels[String(c.target)];
        const b = s.labels[String(c.buyer)];
        if (!t || !b) return;
        t.active = false;
        for (const id of t.roster) { const a = s.acts[id]; if (a) a.owner = b.id; b.roster.push(id); }
        t.roster = [];
        for (const rel of Object.values(s.releases)) if (rel.owner === t.id) rel.owner = 'indie';
      } },
    ],
  },
];
registerEvents(EVENTS_IND);

registerSimHook('month', 'industry:corp', (s, r) => { streamingMonth(s, r); outletsMonth(s, r); venturesMonth(s, r); fxMonth(s); });
registerSimHook('year', 'industry:board', (s, r) => { boardYear(s, r); mergersYear(s, r); s.x4.industry.fxLossYear = 0; });

export { OUTLET_INFO, cityById };
