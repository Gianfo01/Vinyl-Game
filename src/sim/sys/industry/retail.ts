// Varejo e canais: lojas próprias com layout (CD Market/Kairosoft), distribuidores independentes e
// equipe de rua (Schedule I), preço com elasticidade, rotas de jukebox e clube do disco por correio.

import { clamp, type Rng } from '../../../core/rng';
import { MARKETS, cityById, l, type L, type MarketId } from '../../../data/world';
import { registerMod, registerSimHook } from '../../ext4';
import { personName } from '../../people';
import type { GameState, Release } from '../../types';
import { fmtL, hasTech, money, nextId, notify, post, remember, rngOf } from '../../util';
import { researchDone } from './research';
import type { PriceTier, Store, StoreCell } from './state';

// ------------------------------------------------------------------ lojas

export const CELL_INFO: Record<StoreCell, { name: L; cost: number; traffic: number; conversion: number; ticket: number }> = {
  empty: { name: l('Vazio', 'Empty'), cost: 0, traffic: 0, conversion: 0, ticket: 0 },
  shelf: { name: l('Prateleira', 'Shelf'), cost: 800, traffic: 0, conversion: 0.02, ticket: 0.02 },
  vinyl_wall: { name: l('Parede de vinis', 'Vinyl wall'), cost: 1500, traffic: 0.03, conversion: 0.015, ticket: 0.06 },
  booth: { name: l('Cabine de audição', 'Listening booth'), cost: 2500, traffic: 0.02, conversion: 0.05, ticket: 0 },
  window: { name: l('Vitrine', 'Shop window'), cost: 2000, traffic: 0.12, conversion: 0, ticket: 0 },
  register: { name: l('Caixa', 'Till'), cost: 600, traffic: 0, conversion: 0.04, ticket: 0 },
  stage: { name: l('Palquinho para autógrafos', 'Signing stage'), cost: 4000, traffic: 0.08, conversion: 0.01, ticket: 0.03 },
  cafe: { name: l('Café', 'Café'), cost: 5000, traffic: 0.06, conversion: 0.01, ticket: 0.05 },
};
export const STORE_W = 6;
export const STORE_H = 4;

/** Ciclo histórico do varejo físico: megalojas nos 90, fechamentos nos 2000, renascimento do vinil. */
export function retailCycle(year: number): number {
  if (year < 1950) return 0.7;
  if (year < 1990) return 1;
  if (year < 2001) return 1.25;
  if (year < 2013) return Math.max(0.35, 1.25 - (year - 2000) * 0.08);
  return 0.55 + Math.min(0.2, (year - 2013) * 0.02);
}

export function storeOpenCost(s: GameState): number {
  return money(s, 18000);
}

export function openStore(s: GameState, cityId: string): L | null {
  const st = s.x4.industry;
  const city = cityById[cityId];
  if (!city) return l('Cidade inválida.', 'Invalid city.');
  if (st.stores.some((x) => x.city === cityId)) return l('Já existe uma loja sua aqui.', 'You already have a store here.');
  if (st.stores.length >= 12) return l('Limite de 12 lojas.', 'Limit of 12 stores.');
  const cost = storeOpenCost(s);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `store:${cityId}:${s.week}`, -cost, 'retail', `Loja em ${city.name.pt}`);
  const layout: StoreCell[] = new Array(STORE_W * STORE_H).fill('empty');
  layout[0] = 'window';
  layout[1] = 'window';
  layout[STORE_W * STORE_H - 1] = 'register';
  for (let i = STORE_W; i < STORE_W * 2; i++) layout[i] = 'shelf';
  const store: Store = { id: nextId(s, 'st'), city: cityId, name: `${s.config.companyName} ${city.name.pt}`, opened: s.week, layout, revenueMonth: 0, visitorsMonth: 0, signings: 0 };
  st.stores.push(store);
  remember(s, 'store', fmtL(l('Abre a loja de discos {n}.', 'The {n} record store opens.'), { n: store.name }));
  return null;
}

export function setCell(s: GameState, storeId: string, idx: number, cell: StoreCell): L | null {
  const store = s.x4.industry.stores.find((x) => x.id === storeId);
  if (!store || idx < 0 || idx >= store.layout.length) return l('Inválido.', 'Invalid.');
  const cost = money(s, CELL_INFO[cell].cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  if (cost) post(s, `storecell:${store.id}:${idx}:${cell}:${s.week}`, -cost, 'retail', 'Reforma da loja');
  store.layout[idx] = cell;
  return null;
}

export function closeStore(s: GameState, storeId: string): void {
  s.x4.industry.stores = s.x4.industry.stores.filter((x) => x.id !== storeId);
}

/** Nota da loja: tráfego, conversão e tíquete; vizinhança vitrine↔cabine e palco↔café dão combos. */
export function storeScore(store: Store): { traffic: number; conversion: number; ticket: number; combos: L[] } {
  let traffic = 0.4;
  let conversion = 0.05;
  let ticket = 1;
  const combos: L[] = [];
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < STORE_W && y < STORE_H ? store.layout[y * STORE_W + x] : 'empty');
  let shelves = 0;
  for (let y = 0; y < STORE_H; y++) for (let x = 0; x < STORE_W; x++) {
    const c = at(x, y);
    const info = CELL_INFO[c];
    traffic += info.traffic;
    conversion += info.conversion;
    ticket += info.ticket;
    if (c === 'shelf' || c === 'vinyl_wall') shelves++;
    const near = [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)];
    if (c === 'booth' && near.includes('vinyl_wall')) { conversion += 0.02; combos.push(l('Cabine ao lado dos vinis', 'Booth next to the vinyl')); }
    if (c === 'stage' && near.includes('cafe')) { traffic += 0.05; combos.push(l('Palco ao lado do café', 'Stage next to the café')); }
    if (c === 'window' && y === 0) traffic += 0.02;
  }
  if (!store.layout.includes('register')) conversion *= 0.3;
  if (shelves < 3) conversion *= 0.6;
  return { traffic, conversion: Math.min(0.6, conversion), ticket, combos: [...new Set(combos.map((x) => x.pt))].map((pt) => combos.find((c) => c.pt === pt)!) };
}

function storesMonth(s: GameState, r: Rng): void {
  const st = s.x4.industry;
  if (!st.stores.length) return;
  const cyc = retailCycle(s.year);
  const vinylBoost = researchDone(s, 'retail_merch') ? 1.2 : 1;
  for (const store of st.stores) {
    const city = cityById[store.city];
    const mkt = MARKETS.find((m) => m.id === city?.market);
    const size = mkt ? mkt.size(s.year) : 0.3;
    const sc = storeScore(store);
    const visitors = Math.round(9000 * size * sc.traffic * cyc * r.float(0.85, 1.15));
    const buyers = visitors * sc.conversion;
    const revenue = Math.round(buyers * money(s, 14) * sc.ticket * vinylBoost);
    const cost = money(s, 2200) + Math.round(revenue * 0.55); // aluguel, equipe e custo da mercadoria
    store.visitorsMonth = visitors;
    store.revenueMonth = revenue - cost;
    post(s, `storerev:${store.id}`, revenue, 'retail', `Vendas na loja ${store.name}`);
    post(s, `storecost:${store.id}`, -cost, 'retail', `Custos da loja ${store.name}`);
  }
}

// ------------------------------------------------------------------ distribuição

export function hireDistributor(s: GameState, r: Rng, market: MarketId): L | null {
  const st = s.x4.industry;
  if (st.distributors.some((d) => d.market === market)) return l('Já há um distribuidor seu neste mercado.', 'You already have a distributor in this market.');
  const fee = money(s, 3000);
  if (s.player.cash < fee) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `dist:${market}:${s.week}`, -fee, 'distribution', 'Contrato de distribuição');
  const comm = clamp(0.2 + r.float(-0.04, 0.05) - (researchDone(s, 'global_logistics') ? 0.05 : 0), 0.1, 0.3);
  st.distributors.push({ id: nextId(s, 'ds'), market, name: `${personName(r, 'en').split(' ')[1] ?? 'Indie'} Distribution`, commission: comm, stores: r.int(40, 160), since: s.week });
  if (!s.player.territories.includes(market)) s.player.territories.push(market);
  return null;
}

export function fireDistributor(s: GameState, id: string): void {
  s.x4.industry.distributors = s.x4.industry.distributors.filter((d) => d.id !== id);
}

export function setStreetTeam(s: GameState, market: MarketId, level: number): void {
  s.x4.industry.streetTeams[market] = clamp(Math.round(level), 0, 3);
}

export const STREET_COST = [0, 600, 1500, 3500];
export const PRICE_TIERS: Record<PriceTier, { name: L; units: number; revenue: number; desc: L }> = {
  budget: { name: l('Linha econômica', 'Budget line'), units: 1.22, revenue: -0.2, desc: l('Vende mais cópias, ganha menos por cópia, sobe nas paradas.', 'Sells more copies, earns less per copy, climbs the charts.') },
  normal: { name: l('Preço normal', 'Regular price'), units: 1, revenue: 0, desc: l('Equilíbrio.', 'Balanced.') },
  premium: { name: l('Edição premium', 'Premium edition'), units: 0.82, revenue: 0.28, desc: l('Menos cópias, margem maior, imagem de prestígio.', 'Fewer copies, bigger margin, a prestige image.') },
};

function marketsOf(rel: Release): MarketId[] {
  return rel.territories;
}

registerMod('chartUnits', 'industry:pricing', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const st = s.x4.industry;
  let m = PRICE_TIERS[st.pricing].units;
  // distribuidores e equipe de rua ampliam o alcance nos mercados do lançamento
  const mk = marketsOf(rel);
  for (const d of st.distributors) if (mk.includes(d.market)) m *= 1 + Math.min(0.12, d.stores / 1500);
  for (const id of mk) m *= 1 + (st.streetTeams[id] ?? 0) * 0.025;
  if (researchDone(s, 'market_data')) m *= 1.03;
  if (researchDone(s, 'digital_early') && hasTech(s, 'download')) m *= 1.06;
  return { value: v * m };
});

registerMod('appeal', 'industry:channels', (s, v, c) => {
  const rel = c.release;
  if (!rel || rel.owner !== 'player') return null;
  const st = s.x4.industry;
  let m = 1;
  // jukebox: só compactos, 1930–1965
  if (rel.type === 'single' && s.year >= 1930 && s.year <= 1965) for (const id of rel.territories) m *= 1 + (st.jukebox[id] ?? 0) * 0.04;
  // lojas próprias nos mercados do lançamento (vitrine e destaque)
  const stores = st.stores.filter((x) => rel.territories.includes(cityById[x.city]?.market)).length;
  m *= 1 + Math.min(0.1, stores * 0.02);
  if (researchDone(s, 'signature_sound')) m *= 1.04;
  if (researchDone(s, 'radio_network') && rel.type === 'single') m *= 1.05;
  if (researchDone(s, 'ai_mastering')) m *= 1.03;
  return { value: v * m, label: l('Distribuição, lojas e jukebox', 'Distribution, stores and jukebox') };
});

function channelsMonth(s: GameState, r: Rng): void {
  const st = s.x4.industry;
  const sales = s.monthLedger.sales ?? 0;
  // preço: ajuste de receita sobre as vendas do mês
  const adj = Math.round(sales * PRICE_TIERS[st.pricing].revenue);
  if (adj) post(s, `pricing:${s.year}:${s.month}`, adj, 'sales', st.pricing === 'premium' ? 'Margem premium' : 'Desconto da linha econômica');
  if (st.pricing === 'premium') s.player.reputation.artistic = clamp(s.player.reputation.artistic + 0.05, 0, 100);
  // comissão dos distribuidores proporcional à fatia dos mercados deles
  const terr = Math.max(1, s.player.territories.length);
  for (const d of st.distributors) {
    const cut = Math.round((sales / terr) * d.commission);
    if (cut > 0) post(s, `distcut:${d.id}`, -cut, 'distribution', `Comissão ${d.name}`);
    d.stores = clamp(d.stores + r.int(-4, 6), 10, 400);
  }
  for (const [mk, lv] of Object.entries(st.streetTeams)) if (lv) post(s, `street:${mk}`, -money(s, STREET_COST[lv]), 'marketing', `Equipe de rua ${mk}`);
  for (const [mk, lv] of Object.entries(st.jukebox)) {
    if (!lv) continue;
    if (s.year > 1965) { st.jukebox[mk as MarketId] = 0; notify(s, l('As rotas de jukebox perderam sentido: a era do jukebox acabou.', 'Jukebox routes no longer make sense: the jukebox era is over.'), 'info'); continue; }
    post(s, `jukebox:${mk}`, -money(s, 900 * lv), 'marketing', `Rotas de jukebox ${mk}`);
  }
  // clube do disco por correio
  const mc = st.mailClub;
  if (mc.active) {
    if (s.year > 1998) { mc.active = false; notify(s, l('O clube do disco por correio fechou: a internet levou os assinantes.', 'The mail-order record club closed: the internet took the members.'), 'info'); }
    else {
      const target = 2000 + s.player.reputation.commercial * 120 + Object.keys(s.releases).length * 0.4;
      mc.members = Math.round(mc.members + (target - mc.members) * (researchDone(s, 'fan_crm') ? 0.12 : 0.07) + r.int(-50, 50));
      post(s, `mailclub:${s.year}:${s.month}`, Math.round(mc.members * money(s, 1.1)), 'sales', 'Clube do disco');
      post(s, `mailclubc:${s.year}:${s.month}`, -Math.round(mc.members * money(s, 0.75)), 'retail', 'Envio e catálogo do clube');
    }
  }
}

export function setJukebox(s: GameState, market: MarketId, lv: number): L | null {
  if (s.year < 1930 || s.year > 1965) return l('Rotas de jukebox só existem de 1930 a 1965.', 'Jukebox routes only exist from 1930 to 1965.');
  s.x4.industry.jukebox[market] = clamp(Math.round(lv), 0, 3);
  return null;
}

export function toggleMailClub(s: GameState): L | null {
  const mc = s.x4.industry.mailClub;
  if (!mc.active && (s.year < 1955 || s.year > 1998)) return l('Clube do disco por correio: de 1955 a 1998.', 'Mail-order record club: 1955 to 1998.');
  if (!mc.active) {
    const cost = money(s, 12000);
    if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `mailclubopen:${s.week}`, -cost, 'retail', 'Lançamento do clube do disco');
    mc.since = s.week;
    mc.members = 500;
  }
  mc.active = !mc.active;
  return null;
}

registerSimHook('month', 'industry:retail', (s, r) => { storesMonth(s, r); channelsMonth(s, r); });

export { rngOf };
