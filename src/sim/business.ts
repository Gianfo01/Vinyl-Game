// Negócios (GDD §16, §20 + pedido do criador): compra de empresas com passivos, joint ventures,
// fábricas de prensagem, publishing próprio, leilão de catálogo, securitização, bolsa de valores
// e processos (plágio, sample, auditoria de royalties, contrato, imagem).

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { endContract } from './contracts';
import type { GameState, Label } from './types';
import type { CatalogAuction, Company, Lawsuit } from './xtypes';
import { fmtL, money, nextId, notify, playerActs, post, remember, staffSkill } from './util';
import { addAsset, removeAsset } from './finance';
import { unclearedSamples } from './studio';
import { allReleases17 } from './relidx17';

// ---------- Avaliações ----------

// r17 (desempenho): somas de receita do catálogo por dono, calculadas uma vez para um lote de avaliações (bolsa)
let catSums: Map<string, number> | null = null;
export function withCatalogSums<T>(s: GameState, fn: () => T): T {
  const prev = catSums;
  const m = new Map<string, number>();
  for (const r of allReleases17(s)) m.set(r.owner, (m.get(r.owner) ?? 0) + r.revenue);
  catSums = m;
  try { return fn(); } finally { catSums = prev; }
}
export function labelValuation(s: GameState, lb: Label): { value: number; liabilities: number; catalog: number } {
  const catalog = (catSums ? catSums.get(lb.id) ?? 0 : allReleases17(s).filter((r) => r.owner === lb.id).reduce((t, r) => t + r.revenue, 0)) * 0.35;
  const roster = lb.roster.reduce((t, id) => t + (s.acts[id]?.fame ?? 0) * money(s, 2500), 0);
  const liabilities = Math.max(0, -lb.cash) + (lb.debt ?? 0) + lb.roster.reduce((t, id) => t + (s.contracts[s.acts[id]?.contractId ?? '']?.recoupBalance ?? 0) * 0.2, 0);
  return { value: Math.max(money(s, 50000), Math.round(catalog + roster + Math.max(0, lb.cash) * 0.5)), liabilities: Math.round(liabilities), catalog: Math.round(catalog) };
}

/** Selos à venda: caixa baixo ou dívida. */
export function labelsForSale(s: GameState): Label[] {
  return Object.values(s.labels).filter((lb) => lb.active && (lb.cash < money(s, 150000) || (lb.debt ?? 0) > 0) && lb.roster.length > 0);
}

/** Compra um selo inteiro: elenco, contratos, catálogo e DÍVIDAS (passivos transferidos). */
export function acquireLabel(s: GameState, labelId: string): L | null {
  const lb = s.labels[labelId];
  if (!lb || !lb.active) return l('Selo indisponível.', 'Label unavailable.');
  if (s.config.role === 'artist') return l('Só gravadora ou híbrido.', 'Label or hybrid only.');
  const v = labelValuation(s, lb);
  const price = Math.round(v.value * 0.9);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `acq:${lb.id}`, -price, 'acquisitions', `Aquisição de ${lb.name}`);
  transferLabel(s, lb, v, price);
  return null;
}

/** Transfere elenco, contratos, catálogo e passivos de um selo para o jogador (compra ou controle). */
export function transferLabel(s: GameState, lb: Label, v: { value: number; liabilities: number; catalog: number }, price: number): void {
  // passivos: viram credor
  if (v.liabilities > 0) {
    s.creditors.push({ id: nextId(s, 'cr'), name: fmtL(l('Credores de {n}', '{n} creditors'), { n: lb.name }).pt, kind: 'supplier', patience: 70, owed: v.liabilities });
  }
  const releases = allReleases17(s).filter((r) => r.owner === lb.id);
  for (const r of releases) r.owner = 'player';
  for (const id of [...lb.roster]) {
    const a = s.acts[id];
    const c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || !c) continue;
    c.party = 'player';
    a.owner = 'player';
    a.trust = clamp(a.trust - 8, 0, 100); // troca de dono gera desconfiança
    s.delegated[a.id] = true;
  }
  lb.roster = [];
  lb.active = false;
  lb.closedYear = s.year;
  const co: Company = { id: nextId(s, 'co'), name: lb.name, kind: 'label', stake: 1, value: v.value, liabilities: v.liabilities, monthlyRevenue: 0, monthlyCost: 0, acquiredWeek: s.week, catalog: releases.map((r) => r.id) };
  s.companies.push(co);
  addAsset(s, { kind: 'company', name: lb.name, cost: price, lifeMonths: 0, refId: co.id });
  addAsset(s, { kind: 'catalog', name: fmtL(l('Catálogo {n}', '{n} catalog'), { n: lb.name }), cost: v.catalog, lifeMonths: 120, refId: co.id });
  s.player.legacy.industry = (s.player.legacy.industry ?? 0) + 5;
  remember(s, 'acquisition', fmtL(l('{c} compra {n} — com elenco, catálogo e dívidas.', '{c} buys {n} — roster, catalog and debts included.'), { c: s.config.companyName, n: lb.name }), { important: true });
}

// ---------- Joint venture ----------

export function startJointVenture(s: GameState, labelId: string, capital: number): L | null {
  const lb = s.labels[labelId];
  if (!lb || !lb.active) return l('Parceiro indisponível.', 'Partner unavailable.');
  if (s.companies.some((c) => c.partner === labelId)) return l('Já existe JV com esse selo.', 'A JV with this label already exists.');
  if (s.player.cash < capital) return l('Caixa insuficiente.', 'Not enough cash.');
  if ((s.rivalries[labelId] ?? 0) > 40) return l('A rivalidade impede a parceria.', 'The rivalry blocks the partnership.');
  post(s, `jv:${labelId}`, -capital, 'acquisitions', `Joint venture com ${lb.name}`);
  lb.cash -= capital;
  const co: Company = { id: nextId(s, 'co'), name: `${s.config.companyName.split(' ')[0]} × ${lb.name.split(' ')[0]}`, kind: 'label', stake: 0.5, partner: labelId, value: capital * 2, liabilities: 0, monthlyRevenue: Math.round(capital * 0.025), monthlyCost: Math.round(capital * 0.012), acquiredWeek: s.week, catalog: [] };
  s.companies.push(co);
  addAsset(s, { kind: 'stake', name: co.name, cost: capital, lifeMonths: 0, refId: co.id });
  remember(s, 'jv', fmtL(l('Nasce a joint venture {n}.', 'The joint venture {n} is born.'), { n: co.name }), { important: true });
  return null;
}

// ---------- Fábrica de prensagem ----------

export function buildPlant(s: GameState): L | null {
  if (s.companies.some((c) => c.kind === 'plant')) return l('Você já tem uma fábrica.', 'You already own a plant.');
  const cost = money(s, 90000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'plant', -cost, 'acquisitions', 'Fábrica de prensagem');
  const co: Company = { id: nextId(s, 'co'), name: fmtL(l('Prensas {c}', '{c} Pressing'), { c: s.config.companyName.split(' ')[0] }).pt, kind: 'plant', stake: 1, value: cost, liabilities: 0, monthlyRevenue: money(s, 2500), monthlyCost: money(s, 1800), acquiredWeek: s.week, catalog: [] };
  s.companies.push(co);
  if (!s.player.equipment.includes('own_plant')) s.player.equipment.push('own_plant');
  addAsset(s, { kind: 'plant', name: co.name, cost, lifeMonths: 180, refId: co.id });
  return null;
}

// ---------- Publishing próprio ----------

export function openPublishing(s: GameState): L | null {
  if (s.ownPublishing) return null;
  const cost = money(s, 25000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, 'publishing_arm', -cost, 'acquisitions', 'Editora própria');
  s.ownPublishing = true;
  s.companies.push({ id: nextId(s, 'co'), name: fmtL(l('{c} Edições', '{c} Publishing'), { c: s.config.companyName.split(' ')[0] }).pt, kind: 'publisher', stake: 1, value: cost, liabilities: 0, monthlyRevenue: 0, monthlyCost: money(s, 900), acquiredWeek: s.week, catalog: [] });
  remember(s, 'publishing', l('O selo abre sua própria editora musical.', 'The label opens its own music publisher.'), { important: true });
  return null;
}

// ---------- Leilão de catálogo ----------

function catalogAuctionsMonth(s: GameState, r: Rng): void {
  // selos em crise colocam catálogo à venda
  for (const lb of Object.values(s.labels)) {
    if (!lb.active || lb.cash > -money(s, 50000) || s.catalogAuctions.some((a) => a.seller === lb.id && a.status === 'open')) continue;
    const rels = allReleases17(s).filter((x) => x.owner === lb.id && x.totalUnits > 10000).slice(0, 12);
    if (!rels.length) continue;
    const ask = Math.round(rels.reduce((t, x) => t + x.revenue, 0) * 0.3);
    s.catalogAuctions.push({ id: nextId(s, 'ca'), seller: lb.id, releaseIds: rels.map((x) => x.id), ask: Math.max(money(s, 20000), ask), bids: [], endsWeek: s.week + 8, status: 'open' });
    notify(s, fmtL(l('{n} leiloa parte do catálogo. Veja Negócios.', '{n} is auctioning part of its catalog. See Business.'), { n: lb.name }), 'event');
  }
  for (const au of s.catalogAuctions) {
    if (au.status !== 'open') continue;
    // rivais de catálogo dão lances
    for (const lb of Object.values(s.labels)) {
      if (!lb.active || lb.id === au.seller || lb.strategy !== 'buy_catalog' || lb.cash < au.ask) continue;
      const top = Math.max(au.ask, ...au.bids.map((b) => b.amount));
      if (r.chance(0.4)) au.bids.push({ party: lb.id, amount: Math.round(top * r.float(1.02, 1.15)) });
    }
    if (s.week < au.endsWeek) continue;
    const best = [...au.bids].sort((a, b) => b.amount - a.amount)[0];
    if (!best) {
      au.status = 'withdrawn';
      continue;
    }
    au.status = 'sold';
    const seller = s.labels[au.seller];
    if (seller) seller.cash += best.amount;
    if (au.seller === 'player') post(s, `catsale:${au.id}`, best.amount, 'asset_sales', 'Venda de catálogo em leilão');
    for (const id of au.releaseIds) if (s.releases[id]) s.releases[id].owner = best.party;
    if (best.party === 'player') {
      if (s.player.cash < best.amount) {
        au.status = 'withdrawn';
        for (const id of au.releaseIds) if (s.releases[id]) s.releases[id].owner = au.seller;
        notify(s, l('Seu lance venceu mas faltou caixa: leilão anulado.', 'Your bid won but cash fell short: auction voided.'), 'bad');
        continue;
      }
      post(s, `catbuy:${au.id}`, -best.amount, 'acquisitions', 'Compra de catálogo em leilão');
      addAsset(s, { kind: 'catalog', name: l('Catálogo arrematado', 'Auctioned catalog'), cost: best.amount, lifeMonths: 120 });
      for (const id of au.releaseIds) {
        const rel = s.releases[id];
        if (rel && !rel.live) {
          rel.live = true;
          rel.week = s.week - 60;
          rel.appeal *= 0.15;
        }
      }
      remember(s, 'catalog_won', l('Você arremata um catálogo em leilão.', 'You win a catalog at auction.'), { important: true });
    } else if (s.labels[best.party]) s.labels[best.party].cash -= best.amount;
  }
  s.catalogAuctions = s.catalogAuctions.filter((a) => a.status === 'open' || s.week - a.endsWeek < 26).slice(-15);
}

export function bidCatalog(s: GameState, auctionId: string, amount: number): L | null {
  const au = s.catalogAuctions.find((x) => x.id === auctionId && x.status === 'open');
  if (!au) return l('Leilão encerrado.', 'Auction closed.');
  const top = Math.max(au.ask, ...au.bids.map((b) => b.amount));
  if (amount <= top) return l('O lance precisa superar o atual.', 'The bid must beat the current one.');
  if (s.player.cash < amount) return l('Caixa insuficiente.', 'Not enough cash.');
  au.bids.push({ party: 'player', amount });
  return null;
}

export function auctionOwnCatalog(s: GameState, releaseIds: string[]): L | null {
  const rels = releaseIds.map((id) => s.releases[id]).filter((r) => r && r.owner === 'player');
  if (!rels.length) return l('Escolha masters seus.', 'Pick masters you own.');
  if (s.catalogAuctions.some((a) => a.seller === 'player' && a.status === 'open')) return l('Já há um leilão seu aberto.', 'You already have an auction open.');
  const ask = Math.max(money(s, 10000), Math.round(rels.reduce((t, x) => t + x.revenue, 0) * 0.3));
  const au: CatalogAuction = { id: nextId(s, 'ca'), seller: 'player', releaseIds: rels.map((r) => r.id), ask, bids: [], endsWeek: s.week + 8, status: 'open' };
  s.catalogAuctions.push(au);
  return null;
}

// ---------- Securitização ----------

export function catalogMonthlyRevenue(s: GameState): number {
  const sales = (s.lastMonthLedger.sales ?? 0) + (s.lastMonthLedger.publishing ?? 0) + (s.lastMonthLedger.sync ?? 0);
  return Math.max(0, sales);
}

export function securitize(s: GameState, share: number, months: number): L | null {
  if (s.securitizations.some((x) => x.untilWeek > s.week)) return l('Já existe um título ativo.', 'A bond is already active.');
  const base = catalogMonthlyRevenue(s);
  if (base < money(s, 2000)) return l('Catálogo pequeno demais para securitizar.', 'Catalog too small to securitize.');
  const advance = Math.round(base * share * months * 0.75); // desconto do investidor
  s.securitizations.push({ id: nextId(s, 'sec'), advance, share, untilWeek: s.week + Math.round(months * 4.35), paid: 0 });
  post(s, `sec:${s.week}`, advance, 'financing', 'Securitização de catálogo');
  remember(s, 'securitization', fmtL(l('O catálogo vira título: {p}% das receitas por {m} meses.', 'The catalog becomes a bond: {p}% of revenue for {m} months.'), { p: Math.round(share * 100), m: months }), { important: true });
  return null;
}

function securitizationMonth(s: GameState): void {
  for (const sec of s.securitizations) {
    if (sec.untilWeek <= s.week) continue;
    const due = Math.round(((s.monthLedger.sales ?? 0) + (s.monthLedger.publishing ?? 0) + (s.monthLedger.sync ?? 0)) * sec.share);
    if (due > 0) {
      post(s, `secpay:${sec.id}`, -due, 'financing', 'Pagamento a detentores do título');
      sec.paid += due;
    }
  }
}

// ---------- Bolsa ----------

export function ipoTerms(s: GameState): { valuation: number; raise: number; ok: boolean; reason?: L } {
  const rev = (s.player.revenueByYear[s.year - 1] ?? 0) + (s.player.revenueByYear[s.year] ?? 0);
  const valuation = Math.round(rev * 2.2 + s.assets.reduce((t, a) => t + a.bookValue, 0) + Math.max(0, s.player.cash));
  const ok = s.player.hq >= 2 && rev > money(s, 1_000_000) && s.year >= 1950;
  return { valuation, raise: Math.round(valuation * 0.25), ok, reason: ok ? undefined : l('IPO exige Loft+, receita acima de $1 mi e mercado de capitais (1950+).', 'IPO needs a Loft+, revenue above $1M and capital markets (1950+).') };
}

export function goPublic(s: GameState): L | null {
  if (s.listing.listed) return l('Já listada.', 'Already listed.');
  const t = ipoTerms(s);
  if (!t.ok) return t.reason ?? null;
  s.listing.listed = true;
  s.listing.floatShare = 0.25;
  s.listing.price = Math.max(1, Math.round(t.valuation / s.listing.shares));
  s.listing.history = [s.listing.price];
  s.listing.ipoWeek = s.week;
  post(s, 'ipo', t.raise, 'financing', 'Abertura de capital (IPO)');
  remember(s, 'ipo', fmtL(l('{c} abre capital na Bolsa Sonora.', '{c} goes public on the Sound Exchange.'), { c: s.config.companyName }), { important: true });
  return null;
}

function listingMonth(s: GameState, r: Rng): void {
  if (!s.listing.listed) return;
  const profit = s.player.profitByYear[s.year] ?? 0;
  const growth = (s.player.revenueByYear[s.year] ?? 0) / Math.max(1, s.player.revenueByYear[s.year - 1] ?? 1);
  const drift = (profit > 0 ? 0.01 : -0.02) + (growth - 1) * 0.02 + (s.economy.recession ? -0.03 : 0.005);
  s.listing.price = Math.max(1, Math.round(s.listing.price * Math.exp(drift + r.normal(0, 0.05))));
  s.listing.history.push(s.listing.price);
  if (s.listing.history.length > 120) s.listing.history.shift();
  // acionistas cobram: queda forte pressiona a diretoria
  const h = s.listing.history;
  if (h.length > 12 && h[h.length - 1] < h[h.length - 13] * 0.6) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
    if (r.chance(0.2)) notify(s, l('Acionistas exigem cortes depois da queda das ações.', 'Shareholders demand cuts after the share price slump.'), 'bad');
  }
  // dividendos anuais a quem tem ações em circulação
  if (s.month === 11 && profit > 0) post(s, `dividend:${s.year}`, -Math.round(profit * 0.2 * s.listing.floatShare), 'dividends', 'Dividendos aos acionistas');
}

export function issueShares(s: GameState, frac: number): L | null {
  if (!s.listing.listed) return l('Abra capital primeiro.', 'Go public first.');
  if (s.listing.floatShare + frac > 0.49) return l('Você perderia o controle (máx. 49% em circulação).', 'You would lose control (max 49% floating).');
  const cash = Math.round(s.listing.price * s.listing.shares * frac * 0.95);
  s.listing.floatShare += frac;
  s.listing.price = Math.round(s.listing.price * 0.97);
  post(s, `follow:${s.week}`, cash, 'financing', 'Oferta subsequente de ações');
  return null;
}

// ---------- Processos ----------

export function fileLawsuit(s: GameState, l2: Omit<Lawsuit, 'id' | 'stage' | 'nextWeek'>): Lawsuit {
  const suit: Lawsuit = { ...l2, id: nextId(s, 'ls'), stage: 'filed', nextWeek: s.week + 8 };
  s.lawsuits.push(suit);
  notify(s, fmtL(l('Processo: {t}', 'Lawsuit: {t}'), { t: suit.text }), 'bad');
  remember(s, 'lawsuit', suit.text, { actId: suit.actId, important: true });
  return suit;
}

export function settleLawsuit(s: GameState, id: string): L | null {
  const suit = s.lawsuits.find((x) => x.id === id);
  if (!suit || ['settled', 'won', 'lost'].includes(suit.stage)) return l('Processo encerrado.', 'Case closed.');
  const amount = Math.round(suit.claim * (suit.defendant === 'player' ? 0.45 : -0.35));
  if (amount > 0 && s.player.cash < amount) return l('Caixa insuficiente para o acordo.', 'Not enough cash to settle.');
  post(s, `settle:${suit.id}`, -amount, 'legal', 'Acordo judicial');
  suit.stage = 'settled';
  return null;
}

function suitsMonth(s: GameState, r: Rng): void {
  const legal = staffSkill(s, 'legal') / 400;
  // novos processos com causa real
  for (const rel of allReleases17(s)) {
    if (rel.owner !== 'player' || s.week - rel.week > 4 || s.flags[`suitchk:${rel.id}`]) continue;
    s.flags[`suitchk:${rel.id}`] = 1;
    const unc = unclearedSamples(s, rel.songs);
    if (unc.length && r.chance(0.5 + rel.totalUnits / 2e6)) {
      fileLawsuit(s, { kind: 'sample', plaintiff: s.acts[s.songs[unc[0].sourceSongId]?.actId ?? '']?.name ?? 'Espólio', defendant: 'player', actId: rel.actId, songId: unc[0].songId, claim: money(s, 15000 + rel.totalUnits * 0.3), odds: 0.25 + legal, text: fmtL(l('Uso de sample sem liberação em "{t}".', 'Uncleared sample in "{t}".'), { t: rel.title }) });
    }
    // plágio: melodias parecidas de músicas muito populares
    // selos pequenos e novos são alvo raro: o processo segue o dinheiro
    if (rel.peak <= 10 && s.week > 78 && r.chance(rel.revenue > money(s, 30000) ? 0.03 : 0.008)) {
      fileLawsuit(s, { kind: 'plagiarism', plaintiff: 'Compositor independente', defendant: 'player', actId: rel.actId, songId: rel.songs[0], claim: Math.min(money(s, 40000 + rel.totalUnits * 0.5), Math.round(rel.revenue * 0.5) + money(s, 8000)), odds: 0.55 + legal, text: fmtL(l('Acusação de plágio contra "{t}".', 'Plagiarism claim against "{t}".'), { t: rel.title }) });
    }
  }
  // auditoria de royalties: artista desconfiado com saldo de recoupment
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    const c = a.contractId ? s.contracts[a.contractId] : undefined;
    if (!c || c.party !== 'player' || a.playerBand) continue;
    if (a.trust < 30 && c.recoupBalance > 0 && a.fame > 25 && !s.lawsuits.some((x) => x.actId === id && x.kind === 'audit' && !['settled', 'won', 'lost'].includes(x.stage)) && r.chance(0.04)) {
      const rights = staffSkill(s, 'rights') / 300;
      fileLawsuit(s, { kind: 'audit', plaintiff: a.name, defendant: 'player', actId: id, claim: Math.round(c.recoupBalance * 0.3 + money(s, 10000)), odds: 0.45 + rights + legal, text: fmtL(l('{a} pede auditoria de royalties.', '{a} demands a royalty audit.'), { a: a.name }) });
    }
  }
  // andamento
  for (const suit of s.lawsuits) {
    if (['settled', 'won', 'lost'].includes(suit.stage) || suit.nextWeek > s.week) continue;
    if (suit.stage === 'filed') {
      suit.stage = 'discovery';
      suit.nextWeek = s.week + 12;
      post(s, `legalfee:${suit.id}:1`, -Math.min(money(s, 2500), Math.round(suit.claim * 0.08)), 'legal', 'Honorários advocatícios');
      continue;
    }
    if (suit.stage === 'discovery') {
      suit.stage = 'trial';
      suit.nextWeek = s.week + 8;
      post(s, `legalfee:${suit.id}:2`, -Math.min(money(s, 4000), Math.round(suit.claim * 0.12)), 'legal', 'Honorários advocatícios');
      continue;
    }
    const win = r.chance(clamp(suit.odds, 0.05, 0.95));
    const playerDef = suit.defendant === 'player';
    suit.stage = win ? 'won' : 'lost';
    if (playerDef && !win) {
      post(s, `verdict:${suit.id}`, -suit.claim, 'legal', 'Condenação judicial');
      if (suit.kind === 'audit' && suit.actId) {
        const a = s.acts[suit.actId];
        const c = a?.contractId ? s.contracts[a.contractId] : undefined;
        if (c) c.recoupBalance = Math.round(c.recoupBalance * 0.5);
      }
    } else if (!playerDef && win) post(s, `verdict:${suit.id}`, suit.claim, 'legal', 'Indenização recebida');
    if (suit.kind === 'audit' && suit.actId && s.acts[suit.actId]) {
      const a = s.acts[suit.actId];
      a.trust = clamp(a.trust + (win ? -5 : 5), 0, 100);
      if (!win && a.trust < 20) endContract(s, a, 'left');
    }
    remember(s, 'verdict', fmtL(l('Sentença: {t} — {r}.', 'Verdict: {t} — {r}.'), { t: suit.text, r: win === playerDef ? l('vitória do selo', 'label wins') : l('derrota do selo', 'label loses') }), { actId: suit.actId, important: true });
  }
  s.lawsuits = s.lawsuits.filter((x) => !['settled', 'won', 'lost'].includes(x.stage) || s.week - x.nextWeek < 52).slice(-20);
}

/** Processar quem plagiou uma música sua (o jogador como autor da ação). */
export function sueForPlagiarism(s: GameState, r: Rng, mySongId: string, theirReleaseId: string): L | null {
  const mine = s.songs[mySongId];
  const theirs = s.releases[theirReleaseId];
  if (!mine || !theirs) return l('Inválido.', 'Invalid.');
  const cost = money(s, 3000);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `sue:${theirReleaseId}`, -cost, 'legal', 'Ação por plágio');
  const sim = 0.15 + (mine.genre === s.acts[theirs.actId]?.genre ? 0.15 : 0) + staffSkill(s, 'legal') / 400 + r.float(0, 0.1);
  fileLawsuit(s, { kind: 'plagiarism', plaintiff: 'player', defendant: theirs.owner, actId: theirs.actId, songId: mySongId, claim: Math.round(theirs.revenue * 0.2 + money(s, 10000)), odds: sim, text: fmtL(l('Você processa "{t}" por plágio.', 'You sue "{t}" for plagiarism.'), { t: theirs.title }) });
  return null;
}

// ---------- Empresas: mês ----------

function companiesMonth(s: GameState, r: Rng): void {
  for (const co of s.companies) {
    let rev = co.monthlyRevenue;
    if (co.kind === 'plant') rev = Math.round(co.monthlyRevenue * (s.year < 2008 ? 1 : 0.5) * r.float(0.8, 1.2));
    if (co.kind === 'label' && co.partner) {
      const p = s.labels[co.partner];
      if (!p?.active) {
        co.partner = undefined;
        co.stake = 1;
      }
      rev = Math.round(co.monthlyRevenue * r.float(0.6, 1.5));
    }
    if (co.kind === 'publisher') rev = Math.round((s.monthLedger.publishing ?? 0) * 0.15);
    const net = Math.round((rev - co.monthlyCost) * co.stake);
    if (net) post(s, `co:${co.id}`, net, net > 0 ? 'subsidiaries' : 'subsidiaries', `Resultado ${co.name}`);
  }
}

export function sellCompany(s: GameState, id: string): L | null {
  const co = s.companies.find((x) => x.id === id);
  if (!co) return l('Inválido.', 'Invalid.');
  const price = Math.round(co.value * co.stake * 0.8);
  post(s, `cosale:${co.id}`, price, 'asset_sales', `Venda de ${co.name}`);
  for (const a of s.assets.filter((x) => x.refId === co.id)) removeAsset(s, a.id);
  s.companies = s.companies.filter((x) => x !== co);
  if (co.kind === 'publisher') s.ownPublishing = false;
  return null;
}

export function businessMonth(s: GameState, r: Rng): void {
  companiesMonth(s, r);
  catalogAuctionsMonth(s, r);
  securitizationMonth(s);
  listingMonth(s, r);
  suitsMonth(s, r);
}
