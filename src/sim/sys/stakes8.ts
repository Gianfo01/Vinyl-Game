// Participações em selos concorrentes (rodada 8): o jogador compra uma fatia (ou o selo inteiro) de um
// rival negociando com o dono — avaliação por receita, elenco, catálogo e caixa; resposta na hora
// (aceita, contraproposta, recusa ou "preciso de tempo"); o perfil do selo (arquétipo, estratégia,
// agressividade, aperto de caixa, rivalidade) pesa. Amigável ou hostil (comprando dos acionistas por
// cima do CEO, com reação: pílula de veneno ou cavaleiro branco). A fatia paga dividendos; com 25% há
// assento no conselho (o selo para de aliciar o seu elenco e libera feats); acima de 50% o controle:
// absorver elenco e catálogo, transformar em subselo ou mandar na estratégia. Antitruste e reputação
// entram na conta. Os rivais também compram fatias uns dos outros (e engolem quem passa de 50%).

import { clamp, type Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { labelValuation, transferLabel } from '../business';
import { endContract } from '../contracts';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState, Label } from '../types';
import type { SubLabel } from '../xtypes';
import { fmtL, money, nextId, notify, post, remember } from '../util';
import { ownerBonus } from './people/owner';

export interface Holding { holder: string; share: number; since: number; cost: number }
export interface StakeTalk {
  id: string;
  labelId: string;
  share: number;
  price: number;
  mode: 'friendly' | 'hostile';
  status: 'thinking' | 'counter';
  thinkUntil?: number;
  counter?: { share: number; price: number };
  week: number;
}
export interface StakesState {
  recs: Record<string, Holding[]>;
  talks: StakeTalk[];
  /** semana até quando o selo está blindado contra compra hostil (pílula de veneno) */
  shield: Record<string, number>;
  /** recusas recentes por selo (semana) */
  refused: Record<string, number>;
  /** selos sob controle do jogador mantidos independentes: estratégia imposta */
  run: Record<string, Label['strategy']>;
  news: { y: number; t: L }[];
}

declare module '../ext4' { interface Ext4 { stakes8: StakesState } }
const fresh = (): StakesState => ({ recs: {}, talks: [], shield: {}, refused: {}, run: {}, news: [] });
registerExt4('stakes8', fresh);
export const stakes = (s: GameState): StakesState => {
  const x = s.x4 as unknown as { stakes8?: StakesState };
  x.stakes8 ??= fresh();
  return x.stakes8;
};

export const BOARD_SEAT = 0.25;
export const CONTROL = 0.5;

export function holdings(s: GameState, labelId: string): Holding[] {
  return stakes(s).recs[labelId] ?? [];
}

/** Fatia de um acionista ('player' ou id de selo). */
export function stakeOf(s: GameState, labelId: string, holder = 'player'): number {
  const x = (s.x4 as unknown as { stakes8?: StakesState }).stakes8;
  const h = x?.recs[labelId]?.find((y) => y.holder === holder);
  return h ? h.share : 0;
}

/** O que sobra com o fundador/dono original. */
export function founderShare(s: GameState, labelId: string): number {
  return clamp(1 - holdings(s, labelId).reduce((t, h) => t + h.share, 0), 0, 1);
}

/** Valor do selo inteiro: patrimônio (catálogo, elenco, caixa) + múltiplo da receita, menos passivos. */
export function labelValue(s: GameState, lb: Label): { value: number; liabilities: number; catalog: number; revenue: number } {
  const v = labelValuation(s, lb);
  const revenue = Math.max(lb.revenueLastYear, lb.revenueYear);
  const value = Math.max(money(s, 40000), Math.round(v.value + revenue * 1.2 - v.liabilities * 0.6));
  return { value, liabilities: v.liabilities, catalog: v.catalog, revenue };
}

/** Preço justo de uma fatia (prêmio de controle acima de 25% e 50%; compra hostil paga mais). */
export function fairStakePrice(s: GameState, labelId: string, share: number, mode: 'friendly' | 'hostile' = 'friendly'): number {
  const lb = s.labels[labelId];
  if (!lb) return 0;
  const after = stakeOf(s, labelId) + share;
  const prem = after > CONTROL ? 1.3 : after >= BOARD_SEAT ? 1.1 : 1;
  // selo listado (fez IPO): metade do preço vem da cotação no pregão (rodada 11)
  const b = (s.x4 as unknown as { bolsa10?: { q: Record<string, { p: number; dead?: unknown }>; lsh: Record<string, number> } }).bolsa10;
  const q = b?.q[`lb:${labelId}`];
  const v = labelValue(s, lb).value;
  const worth = q && !q.dead && b?.lsh[labelId] ? Math.round(v * 0.5 + q.p * b.lsh[labelId] * 0.5) : v;
  return Math.round(worth * share * prem * (mode === 'hostile' ? 1.25 : 1));
}

/** Participação de mercado estimada (fração) de um selo e do jogador. */
function marketShares(s: GameState, lb: Label): { mine: number; theirs: number } {
  let total = Math.max(1, s.player.revenueByYear[s.year - 1] ?? 0);
  for (const x of Object.values(s.labels)) if (x.active) total += Math.max(0, x.revenueLastYear);
  return { mine: (s.player.revenueByYear[s.year - 1] ?? 0) / total, theirs: Math.max(0, lb.revenueLastYear) / total };
}

/** Antitruste: controlar um selo grande demais, ou selos demais, é barrado pelo regulador. */
export function antitrust(s: GameState, labelId: string, share: number): { blocked: boolean; warn: boolean; text?: L } {
  const lb = s.labels[labelId];
  if (!lb) return { blocked: false, warn: false };
  const after = stakeOf(s, labelId) + share;
  if (after <= CONTROL) return { blocked: false, warn: false };
  const ms = marketShares(s, lb);
  const combined = ms.mine + ms.theirs;
  const controlled = Object.keys(stakes(s).recs).filter((id) => id !== labelId && s.labels[id]?.active && stakeOf(s, id) > CONTROL).length;
  if (combined > 0.3 || controlled >= 3) return { blocked: true, warn: true, text: fmtL(l('O órgão antitruste barrou: vocês juntos teriam {p}% do mercado (ou selos demais sob o mesmo dono).', 'The antitrust regulator blocked it: together you would hold {p}% of the market (or too many labels under one owner).'), { p: Math.round(combined * 100) }) };
  if (combined > 0.18) return { blocked: false, warn: true, text: l('O regulador vai investigar a concentração (reputação institucional cai).', 'The regulator will investigate the concentration (institutional reputation drops).') };
  return { blocked: false, warn: false };
}

/** Vontade de vender (>0 tende a aceitar). */
function sellerScore(s: GameState, lb: Label, share: number, price: number, mode: 'friendly' | 'hostile'): number {
  const fair = fairStakePrice(s, lb.id, share, mode);
  const ratio = price / Math.max(1, fair) - 1;
  const after = stakeOf(s, lb.id) + share;
  const distress = lb.cash < money(s, 150000) || (lb.debt ?? 0) > 0 ? 0.5 : lb.cash < money(s, 500000) ? 0.15 : 0;
  if (mode === 'hostile') {
    // acionistas pulverizados: olham o prêmio, quase só isso
    return ratio * 2.6 + distress * 0.6 - 0.25 - (after > CONTROL ? 0.45 : 0) - (s.rivalries[lb.id] ?? 0) / 300;
  }
  let sc = ratio * 2 + distress;
  const arch = lb.archetype ?? 'boutique';
  if (arch === 'empire') sc -= 0.45;
  else if (arch === 'hitmaker') sc -= 0.2;
  else if (arch === 'catalog') sc += 0.1;
  else if (arch === 'boutique') sc -= 0.15;
  if (lb.strategy === 'stars') sc -= 0.15;
  sc -= lb.aggression * 0.4;
  sc -= (s.rivalries[lb.id] ?? 0) / 90;
  sc += (s.player.reputation.institutional - 50) / 160 + ownerBonus(s, 'negotiation') * 0.25;
  if (after > CONTROL) sc -= 0.55;
  if (after >= 0.99) sc -= 0.3;
  if (after >= BOARD_SEAT) sc -= 0.1;
  const ref = stakes(s).refused[lb.id];
  if (ref && s.week - ref < 12) sc -= 0.3;
  return sc;
}

export function stakeChance(s: GameState, labelId: string, share: number, price: number, mode: 'friendly' | 'hostile'): number {
  const lb = s.labels[labelId];
  if (!lb) return 0;
  return clamp(1 / (1 + Math.exp(-sellerScore(s, lb, share, price, mode) * 3)), 0.02, 0.95);
}

export type StakeResult = 'accepted' | 'counter' | 'rejected' | 'thinking' | 'blocked' | 'invalid';

export function canBuyStake(s: GameState, labelId: string, share: number, price: number, mode: 'friendly' | 'hostile'): L | null {
  const lb = s.labels[labelId];
  if (s.config.role === 'artist') return l('Só gravadora ou híbrido compra participação em selos.', 'Only a label or hybrid can buy stakes in labels.');
  if (!lb || !lb.active) return l('Selo indisponível.', 'Label unavailable.');
  if (share < 0.02 - 1e-9) return l('A fatia mínima é 2%.', 'The minimum slice is 2%.');
  if (share > founderShare(s, labelId) + 1e-6) return l('Não há tantas ações à venda (outros acionistas têm o resto).', 'Not that many shares are for sale (other shareholders own the rest).');
  if (price <= 0) return l('Preço inválido.', 'Invalid price.');
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  if (mode === 'hostile' && (stakes(s).shield[labelId] ?? 0) > s.week) return l('O selo está blindado (pílula de veneno) contra compras hostis por enquanto.', 'The label is shielded (poison pill) against hostile buys for now.');
  if (stakes(s).talks.some((t) => t.labelId === labelId)) return l('Já há uma negociação aberta com este selo.', 'There is already an open negotiation with this label.');
  return null;
}

/** Proposta de compra com resposta na hora. */
export function proposeStake(s: GameState, r: Rng, labelId: string, share: number, price: number, mode: 'friendly' | 'hostile' = 'friendly'): { result: StakeResult; talk?: StakeTalk; text: L } {
  share = Math.round(share * 100) / 100;
  price = Math.round(price);
  const err = canBuyStake(s, labelId, share, price, mode);
  if (err) return { result: 'invalid', text: err };
  const lb = s.labels[labelId];
  const at = antitrust(s, labelId, share);
  if (at.blocked) return { result: 'blocked', text: at.text! };
  const p = stakeChance(s, labelId, share, price, mode);
  const roll = r.next();
  const st = stakes(s);
  if (roll < p * 0.8) {
    closeStake(s, r, labelId, share, price, mode);
    return { result: 'accepted', text: fmtL(mode === 'hostile' ? l('Os acionistas venderam: você agora tem {p}% de {lb}. O CEO não gostou nada.', 'Shareholders sold: you now own {p}% of {lb}. The CEO is furious.') : l('Negócio fechado: você agora tem {p}% de {lb}.', 'Deal: you now own {p}% of {lb}.'), { p: Math.round(stakeOf(s, labelId) * 100), lb: lb.name }) };
  }
  if (roll < p || (p > 0.3 && roll < p + 0.12)) {
    const talk: StakeTalk = { id: nextId(s, 'stk'), labelId, share, price, mode, status: 'thinking', thinkUntil: s.week + r.int(1, 3), week: s.week };
    st.talks.push(talk);
    return { result: 'thinking', talk, text: fmtL(l('{c} vai levar a proposta ao conselho de {lb}. Resposta em até 3 semanas.', '{c} will take the offer to {lb}\'s board. Answer within 3 weeks.'), { c: lb.ceo ?? lb.name, lb: lb.name }) };
  }
  if (p > 0.1) {
    // contraproposta: mais dinheiro ou uma fatia menor (quem não quer perder o controle oferece menos)
    const after = stakeOf(s, labelId) + share;
    const cShare = after > CONTROL && mode === 'friendly' && r.chance(0.6) ? Math.max(0.02, Math.round((CONTROL - stakeOf(s, labelId) - 0.01) * 100) / 100) : share;
    const fair = fairStakePrice(s, labelId, cShare, mode);
    const cPrice = Math.round(Math.max(price * (cShare / share), fair * (1.08 + r.next() * 0.15)));
    const talk: StakeTalk = { id: nextId(s, 'stk'), labelId, share, price, mode, status: 'counter', counter: { share: cShare, price: cPrice }, week: s.week };
    st.talks.push(talk);
    return { result: 'counter', talk, text: fmtL(l('{lb} topa vender {p}% por {v}.', '{lb} would sell {p}% for {v}.'), { lb: lb.name, p: Math.round(cShare * 100), v: `$${Math.round(cPrice / 100).toLocaleString('en-US')}` }) };
  }
  st.refused[labelId] = s.week;
  s.rivalries[labelId] = (s.rivalries[labelId] ?? 0) + (mode === 'hostile' ? 8 : 3);
  return { result: 'rejected', text: fmtL(l('{lb} recusou: "{w}"', '{lb} declined: "{w}"'), { lb: lb.name, w: p < 0.05 ? l('não estamos à venda', 'we are not for sale') : l('o preço não chega perto', 'the price is nowhere near') }) };
}

export function acceptStakeCounter(s: GameState, r: Rng, talkId: string): L | null {
  const st = stakes(s);
  const t = st.talks.find((x) => x.id === talkId && x.status === 'counter');
  if (!t?.counter) return l('Contraproposta expirada.', 'Counter-offer expired.');
  const lb = s.labels[t.labelId];
  if (!lb?.active) return l('Selo indisponível.', 'Label unavailable.');
  if (s.player.cash < t.counter.price) return l('Caixa insuficiente.', 'Not enough cash.');
  const at = antitrust(s, t.labelId, t.counter.share);
  if (at.blocked) return at.text!;
  st.talks = st.talks.filter((x) => x !== t);
  closeStake(s, r, t.labelId, t.counter.share, t.counter.price, t.mode);
  return null;
}

export function dropStakeTalk(s: GameState, talkId: string): void {
  const st = stakes(s);
  st.talks = st.talks.filter((x) => x.id !== talkId);
}

/** Pressionar quem pediu tempo (o conselho responde já, de má vontade). */
export function pressStake(s: GameState, r: Rng, talkId: string): { result: StakeResult; text: L } {
  const t = stakes(s).talks.find((x) => x.id === talkId && x.status === 'thinking');
  if (!t) return { result: 'invalid', text: l('Nada pendente.', 'Nothing pending.') };
  return resolveTalk(s, r, t, -0.1);
}

function resolveTalk(s: GameState, r: Rng, t: StakeTalk, malus = 0): { result: StakeResult; text: L } {
  const st = stakes(s);
  st.talks = st.talks.filter((x) => x !== t);
  const lb = s.labels[t.labelId];
  if (!lb?.active) return { result: 'invalid', text: l('O selo não existe mais.', 'The label no longer exists.') };
  const p = stakeChance(s, t.labelId, t.share, t.price, t.mode) + 0.12 + malus;
  if (s.player.cash >= t.price && !antitrust(s, t.labelId, t.share).blocked && t.share <= founderShare(s, t.labelId) + 1e-6 && r.chance(p)) {
    closeStake(s, r, t.labelId, t.share, t.price, t.mode);
    return { result: 'accepted', text: fmtL(l('O conselho de {lb} aprovou: você tem {p}% do selo.', '{lb}\'s board approved: you own {p}% of the label.'), { lb: lb.name, p: Math.round(stakeOf(s, t.labelId) * 100) }) };
  }
  st.refused[t.labelId] = s.week;
  return { result: 'rejected', text: fmtL(l('O conselho de {lb} rejeitou a sua proposta.', '{lb}\'s board rejected your offer.'), { lb: lb.name }) };
}

function addHolding(s: GameState, labelId: string, holder: string, share: number, cost: number): void {
  const recs = stakes(s).recs;
  const list = (recs[labelId] ??= []);
  const h = list.find((x) => x.holder === holder);
  if (h) { h.share = Math.round((h.share + share) * 1000) / 1000; h.cost += cost; }
  else list.push({ holder, share: Math.round(share * 1000) / 1000, since: s.year, cost });
}

function syncAsset(s: GameState, labelId: string): void {
  const ref = `stake8:${labelId}`;
  const h = holdings(s, labelId).find((x) => x.holder === 'player');
  s.assets = s.assets.filter((a) => a.refId !== ref);
  if (h && h.share > 0) s.assets.push({ id: nextId(s, 'as'), kind: 'stake', name: `${s.labels[labelId]?.name ?? labelId} (${Math.round(h.share * 100)}%)`, cost: h.cost, bookValue: h.cost, lifeMonths: 0, boughtMonth: s.year * 12 + s.month, refId: ref });
}

function news(s: GameState, text: L, important = false): void {
  const st = stakes(s);
  st.news.push({ y: s.year, t: text });
  if (st.news.length > 30) st.news.shift();
  remember(s, 'stakes8', text, { important });
}

/** Fecha a compra: dinheiro sai pelo extrato, a fatia entra; consequências e reação do selo. */
export function closeStake(s: GameState, r: Rng, labelId: string, share: number, price: number, mode: 'friendly' | 'hostile'): void {
  const lb = s.labels[labelId];
  if (!lb) return;
  const before = stakeOf(s, labelId);
  post(s, `stake8:${labelId}:${nextId(s, 'k')}`, -price, 'acquisitions', `Participação de ${Math.round(share * 100)}% em ${lb.name}`);
  // amigável: metade é ação nova (capital para o selo); hostil: tudo vai para os acionistas
  if (mode === 'friendly') lb.cash += Math.round(price * 0.5);
  addHolding(s, labelId, 'player', share, price);
  const after = stakeOf(s, labelId);
  const at = antitrust(s, labelId, 0);
  if (at.warn) s.player.reputation.institutional = clamp(s.player.reputation.institutional - 3, 0, 100);
  if (mode === 'hostile') {
    s.rivalries[labelId] = (s.rivalries[labelId] ?? 0) + 25;
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
    s.player.reputation.artists = clamp(s.player.reputation.artists - 2, 0, 100);
    for (const id of lb.roster) { const a = s.acts[id]; if (a) a.trust = clamp(a.trust - 5, 0, 100); }
    react(s, r, lb, after);
  } else {
    s.rivalries[labelId] = Math.max(0, (s.rivalries[labelId] ?? 0) - 8);
    lb.lastDecision = fmtL(l('vendeu {p}% para {c}', 'sold {p}% to {c}'), { p: Math.round(share * 100), c: s.config.companyName });
  }
  syncAsset(s, labelId);
  const now = stakeOf(s, labelId);
  if (before < BOARD_SEAT && now >= BOARD_SEAT) notify(s, fmtL(l('Você ganhou um assento no conselho de {lb}: o selo para de aliciar o seu elenco e libera feats.', 'You won a board seat at {lb}: the label stops poaching your roster and clears features.'), { lb: lb.name }), 'good');
  if (before <= CONTROL && now > CONTROL) notify(s, fmtL(l('Você controla {lb}! Decida: absorver, virar subselo ou manter independente (ficha do selo).', 'You control {lb}! Decide: absorb, turn into a sub-label or keep it independent (label page).'), { lb: lb.name }), 'good');
  news(s, fmtL(l('{c} compra {p}% de {lb} ({m}).', '{c} buys {p}% of {lb} ({m}).'), { c: s.config.companyName, p: Math.round(share * 100), lb: lb.name, m: mode === 'hostile' ? l('hostil', 'hostile') : l('amigável', 'friendly') }), now > CONTROL);
  s.player.legacy.industry = (s.player.legacy.industry ?? 0) + Math.round(share * 6);
}

/** Reação a uma compra hostil: pílula de veneno (dilui) ou cavaleiro branco (outro selo entra). */
function react(s: GameState, r: Rng, lb: Label, after: number): void {
  const st = stakes(s);
  if (after > CONTROL) return; // tarde demais
  if (r.chance(0.45)) {
    // pílula de veneno: novas ações para os outros acionistas diluem o jogador
    const list = holdings(s, lb.id);
    const mine = list.find((x) => x.holder === 'player');
    if (mine) mine.share = Math.round(mine.share * 0.7 * 1000) / 1000;
    st.shield[lb.id] = s.week + 26;
    lb.lastDecision = l('aprovou uma pílula de veneno contra a compra hostil', 'approved a poison pill against the hostile buy');
    news(s, fmtL(l('{lb} reage com uma pílula de veneno: sua fatia é diluída.', '{lb} answers with a poison pill: your stake is diluted.'), { lb: lb.name }), true);
    syncAsset(s, lb.id);
  } else if (r.chance(0.5)) {
    const knight = Object.values(s.labels).filter((x) => x.active && x.id !== lb.id && x.cash > money(s, 1_000_000)).sort((a, b) => b.cash - a.cash)[0];
    const free = founderShare(s, lb.id);
    if (knight && free > 0.1) {
      const sh = Math.min(free - 0.05, 0.2);
      const price = Math.round(labelValue(s, lb).value * sh);
      knight.cash -= price;
      lb.cash += price;
      addHolding(s, lb.id, knight.id, sh, price);
      st.shield[lb.id] = s.week + 13;
      news(s, fmtL(l('Cavaleiro branco: {k} compra {p}% de {lb} para barrar você.', 'White knight: {k} buys {p}% of {lb} to block you.'), { k: knight.name, p: Math.round(sh * 100), lb: lb.name }), true);
    }
  }
}

/** Vende a sua fatia de volta (ao selo ou ao mercado) com desconto de liquidez. */
export function sellStake(s: GameState, labelId: string): L | null {
  const lb = s.labels[labelId];
  const h = holdings(s, labelId).find((x) => x.holder === 'player');
  if (!lb || !h) return l('Você não tem participação aqui.', 'You have no stake here.');
  const price = Math.round(labelValue(s, lb).value * h.share * 0.85);
  post(s, `stakesell:${labelId}`, price, 'asset_sales', `Venda de ${Math.round(h.share * 100)}% de ${lb.name}`);
  lb.cash -= Math.round(price * 0.5);
  stakes(s).recs[labelId] = holdings(s, labelId).filter((x) => x !== h);
  delete stakes(s).run[labelId];
  syncAsset(s, labelId);
  news(s, fmtL(l('{c} vende a fatia que tinha em {lb}.', '{c} sells its stake in {lb}.'), { c: s.config.companyName, lb: lb.name }));
  return null;
}

/** Com controle: impõe a estratégia do selo (ele segue independente, mas obedece). */
export function directLabel(s: GameState, labelId: string, strategy: Label['strategy']): L | null {
  const lb = s.labels[labelId];
  if (!lb?.active || stakeOf(s, labelId) <= CONTROL) return l('Precisa de mais de 50% para mandar no selo.', 'You need more than 50% to run the label.');
  lb.strategy = strategy;
  stakes(s).run[labelId] = strategy;
  lb.lastDecision = fmtL(l('mudou de estratégia por ordem de {c}', 'changed strategy on {c}\'s orders'), { c: s.config.companyName });
  return null;
}

/** Custo para comprar a parte dos minoritários ao absorver (sem prêmio). */
export function squeezeCost(s: GameState, labelId: string): number {
  const lb = s.labels[labelId];
  if (!lb) return 0;
  return Math.round(labelValue(s, lb).value * (1 - stakeOf(s, labelId)) * 0.9);
}

/** Absorve o selo controlado: elenco, contratos e catálogo passam a ser seus (paga os minoritários). */
export function absorbLabel(s: GameState, r: Rng, labelId: string): L | null {
  const lb = s.labels[labelId];
  if (!lb?.active || stakeOf(s, labelId) <= CONTROL) return l('Precisa de mais de 50% para absorver o selo.', 'You need more than 50% to absorb the label.');
  const cost = squeezeCost(s, labelId);
  if (s.player.cash < cost) return l('Caixa insuficiente para comprar a parte dos minoritários.', 'Not enough cash to buy out the minority.');
  if (cost > 0) post(s, `squeeze:${labelId}`, -cost, 'acquisitions', `Compra dos minoritários de ${lb.name}`);
  payOutOthers(s, lb, 'player');
  const v = labelValuation(s, lb);
  const roster = [...lb.roster];
  const paid = holdings(s, labelId).find((x) => x.holder === 'player')?.cost ?? 0;
  transferLabel(s, lb, v, paid + cost);
  // nem todo artista aceita trocar de casa
  for (const id of roster) {
    const a = s.acts[id];
    if (a && a.owner === 'player' && a.trust < 30 && r.chance(0.35)) {
      endContract(s, a, 'terminated');
      notify(s, fmtL(l('{a} não aceitou a fusão e saiu.', '{a} refused the merger and left.'), { a: a.name }), 'bad');
    }
  }
  delete stakes(s).recs[labelId];
  delete stakes(s).run[labelId];
  syncAsset(s, labelId);
  s.assets = s.assets.filter((a) => a.refId !== `stake8:${labelId}`);
  news(s, fmtL(l('{c} absorve {lb}: elenco e catálogo agora são seus.', '{c} absorbs {lb}: roster and catalog are now yours.'), { c: s.config.companyName, lb: lb.name }), true);
  return null;
}

/** Transforma o selo controlado em subselo (empresa própria; os minoritários viram sócios). */
export function makeSubLabel(s: GameState, labelId: string): L | null {
  const lb = s.labels[labelId];
  if (!lb?.active || stakeOf(s, labelId) <= CONTROL) return l('Precisa de mais de 50% para transformar em subselo.', 'You need more than 50% to turn it into a sub-label.');
  if (s.config.role === 'artist') return l('Só gravadora ou híbrido.', 'Label or hybrid only.');
  const mine = stakeOf(s, labelId);
  const others = holdings(s, labelId).filter((x) => x.holder !== 'player');
  const board = [
    ...others.map((h) => ({ name: s.labels[h.holder]?.name ?? h.holder, share: h.share, goal: 'return' as const })),
    ...(founderShare(s, labelId) > 0.001 ? [{ name: lb.ceo ?? lb.name, share: founderShare(s, labelId), goal: 'growth' as const }] : []),
  ];
  const sl: SubLabel = {
    id: nextId(s, 'sub'), name: lb.name, logoSeed: (lb.name.length * 7919) % 100000, genreFocus: s.acts[lb.roster[0]]?.genre ?? 'pop', cash: lb.cash - (lb.debt ?? 0),
    reserve: money(s, 3000), budget: money(s, 3000), strategy: lb.strategy === 'buy_catalog' ? 'catalog' : lb.strategy === 'develop' ? 'development' : 'commercial',
    roster: [], managerSalary: money(s, 900), founderShare: mine, board, loans: [], creditors: [], status: 'active', distressMonths: 0,
    retained: 0, revenueYear: 0, revenueLastYear: lb.revenueLastYear, log: [], history: [{ week: s.week, text: l('Selo adquirido e transformado em subselo.', 'Label acquired and turned into a sub-label.') }], founded: lb.founded,
  };
  for (const id of [...lb.roster]) {
    const a = s.acts[id];
    const c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || !c) continue;
    c.party = 'player';
    a.owner = 'player';
    a.trust = clamp(a.trust - 4, 0, 100);
    s.delegated[a.id] = true;
    sl.roster.push(a.id);
  }
  const rosterSet = new Set(sl.roster);
  for (const rel of Object.values(s.releases)) if (rel.owner === lb.id) rel.owner = rosterSet.has(rel.actId) ? sl.id : 'player';
  s.subLabels.push(sl);
  lb.roster = [];
  lb.active = false;
  lb.closedYear = s.year;
  lb.cash = 0;
  delete stakes(s).recs[labelId];
  delete stakes(s).run[labelId];
  s.assets = s.assets.filter((a) => a.refId !== `stake8:${labelId}`);
  s.player.legacy.industry = (s.player.legacy.industry ?? 0) + 4;
  news(s, fmtL(l('{lb} vira subselo de {c}.', '{lb} becomes a sub-label of {c}.'), { lb: lb.name, c: s.config.companyName }), true);
  return null;
}

/** Quando alguém fica com tudo, os demais acionistas recebem a parte deles. */
function payOutOthers(s: GameState, lb: Label, buyer: string): void {
  const val = labelValue(s, lb).value;
  for (const h of holdings(s, lb.id)) {
    if (h.holder === buyer) continue;
    const amount = Math.round(val * h.share * 0.95);
    if (h.holder === 'player') {
      post(s, `squeezed:${lb.id}`, amount, 'asset_sales', `Fatia em ${lb.name} comprada na fusão`);
      notify(s, fmtL(l('{lb} foi absorvida: a sua fatia foi comprada por {v}.', '{lb} was absorbed: your stake was bought for {v}.'), { lb: lb.name, v: `$${Math.round(amount / 100).toLocaleString('en-US')}` }), 'info');
    } else if (s.labels[h.holder]) s.labels[h.holder].cash += amount;
    if (buyer !== 'player' && s.labels[buyer]) s.labels[buyer].cash -= amount;
  }
}

// ---------------------------------------------------------------- rivais compram rivais

export function npcAbsorb(s: GameState, buyer: Label, target: Label): void {
  payOutOthers(s, target, buyer.id);
  for (const id of [...target.roster]) {
    const a = s.acts[id];
    const c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || !c) continue;
    c.party = buyer.id;
    a.owner = buyer.id;
    if (!buyer.roster.includes(a.id)) buyer.roster.push(a.id);
  }
  for (const rel of Object.values(s.releases)) if (rel.owner === target.id) rel.owner = buyer.id;
  buyer.cash += Math.max(0, target.cash);
  target.roster = [];
  target.active = false;
  target.closedYear = s.year;
  target.parentLabel = buyer.id;
  delete stakes(s).recs[target.id];
  s.assets = s.assets.filter((a) => a.refId !== `stake8:${target.id}`);
  news(s, fmtL(l('{b} assume o controle de {t} e incorpora elenco e catálogo.', '{b} takes control of {t} and folds in roster and catalog.'), { b: buyer.name, t: target.name }), true);
}

function npcStakes(s: GameState, r: Rng): void {
  const active = Object.values(s.labels).filter((x) => x.active);
  const buyers = active.filter((x) => x.cash > money(s, 2_000_000) && (x.archetype === 'empire' || x.archetype === 'catalog' || x.strategy === 'buy_catalog' || x.family === 'A'));
  if (!buyers.length || !r.chance(0.5)) return;
  const b = r.pick(buyers);
  const targets = active.filter((x) => x.id !== b.id && x.roster.length > 0 && stakeOf(s, x.id) <= CONTROL && x.cash < b.cash);
  if (!targets.length) return;
  // prefere os fracos e os do mesmo foco
  const t = targets.map((x) => ({ x, v: (x.cash < money(s, 300000) ? 2 : 0) + (x.focus.some((f) => b.focus.includes(f)) ? 1 : 0) + r.next() })).sort((p, q) => q.v - p.v)[0].x;
  const free = founderShare(s, t.id);
  if (free < 0.06) return;
  const sh = Math.min(free, Math.round((0.1 + r.next() * 0.25) * 100) / 100);
  const price = Math.round(labelValue(s, t).value * sh);
  if (price > b.cash * 0.4) return;
  b.cash -= price;
  t.cash += Math.round(price * 0.5);
  addHolding(s, t.id, b.id, sh, price);
  b.lastDecision = fmtL(l('comprou {p}% de {t}', 'bought {p}% of {t}'), { p: Math.round(sh * 100), t: t.name });
  const total = stakeOf(s, t.id, b.id);
  if (total > CONTROL && stakeOf(s, t.id) < BOARD_SEAT) npcAbsorb(s, b, t);
  else if (b.revenueLastYear > 0 || t.reputation > 40) news(s, fmtL(l('{b} compra {p}% de {t}.', '{b} buys {p}% of {t}.'), { b: b.name, p: Math.round(sh * 100), t: t.name }));
}

// ---------------------------------------------------------------- dividendos, limpeza, negociações

function dividendsYear(s: GameState): void {
  for (const [labelId, list] of Object.entries(stakes(s).recs)) {
    const lb = s.labels[labelId];
    if (!lb?.active || lb.cash <= 0 || lb.revenueLastYear <= 0) continue;
    const pool = Math.round(Math.min(lb.cash * 0.12, lb.revenueLastYear * 0.1));
    if (pool <= 0) continue;
    for (const h of list) {
      const amount = Math.round(pool * h.share);
      if (amount <= 0) continue;
      lb.cash -= amount;
      if (h.holder === 'player') {
        post(s, `div8:${labelId}:${s.year}`, amount, 'dividends', `Dividendos de ${lb.name}`);
        notify(s, fmtL(l('{lb} pagou {v} de dividendos pela sua fatia.', '{lb} paid {v} in dividends for your stake.'), { lb: lb.name, v: `$${Math.round(amount / 100).toLocaleString('en-US')}` }), 'good');
      } else if (s.labels[h.holder]) s.labels[h.holder].cash += amount;
    }
  }
}

function cleanup(s: GameState): void {
  const st = stakes(s);
  for (const labelId of Object.keys(st.recs)) {
    const lb = s.labels[labelId];
    if (lb?.active) {
      // acionista que fechou some da lista
      st.recs[labelId] = st.recs[labelId].filter((h) => h.holder === 'player' || s.labels[h.holder]?.active);
      if (!st.recs[labelId].length) delete st.recs[labelId];
      continue;
    }
    const mine = stakeOf(s, labelId);
    if (mine > 0) notify(s, fmtL(l('{lb} fechou as portas: a sua participação virou pó.', '{lb} closed its doors: your stake is worthless.'), { lb: lb?.name ?? labelId }), 'bad');
    delete st.recs[labelId];
    delete st.run[labelId];
    s.assets = s.assets.filter((a) => a.refId !== `stake8:${labelId}`);
  }
  // selos controlados seguem a estratégia imposta
  for (const [id, strat] of Object.entries(st.run)) { const lb = s.labels[id]; if (lb?.active && stakeOf(s, id) > CONTROL) lb.strategy = strat; else delete st.run[id]; }
  st.talks = st.talks.filter((t) => s.labels[t.labelId]?.active && (t.status === 'thinking' || s.week - t.week < 8));
  for (const k of Object.keys(st.refused)) if (s.week - st.refused[k] > 26) delete st.refused[k];
  for (const k of Object.keys(st.shield)) if (st.shield[k] < s.week) delete st.shield[k];
}

registerSimHook('week', 'stakes8', (s, r) => {
  for (const t of [...stakes(s).talks]) {
    if (t.status !== 'thinking' || (t.thinkUntil ?? 0) > s.week) continue;
    const res = resolveTalk(s, r, t);
    notify(s, res.text, res.result === 'accepted' ? 'good' : 'bad');
  }
});

registerSimHook('month', 'stakes8', (s, r) => {
  cleanup(s);
  if (s.month % 3 === 1) npcStakes(s, r);
});

registerSimHook('year', 'stakes8', (s) => dividendsYear(s));
