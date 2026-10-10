// Capital e sócios (rodada 6): dinheiro entre o bolso do dono e o caixa da empresa (com consequências),
// sócios e investidores com dinâmicas próprias (o que gostam, metas, cláusulas, opinião com
// modificadores que decaem, à la Crusader Kings), recompra de participação, dividendos, IPO com
// escolhas (fatia, banco coordenador, roadshow) e confiança do conselho (Football Manager): quando o
// dono perde o controle (< 50%) e a confiança despenca, o conselho vota a demissão.

import { clamp, type Rng } from '../../core/rng';
import { toReal } from '../../core/money';
import { l, type L } from '../../data/world';
import { ipoTerms } from '../business';
import { registerExt4, registerSimHook } from '../ext4';
import { bumpPerks, perk, registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import type { GameState } from '../types';
import { fmtL, money, nextId, notify, playerActs, post, remember } from '../util';
import { monthlyCosts } from '../economy';
import { energyLeft, spendEnergy } from './life';
import { ownerOf } from './people/owner';
import { allReleases17 } from '../relidx17';

// ---------------------------------------------------------------- tipos de investidor

export type InvestorKind = 'angel' | 'family' | 'vc' | 'strategic' | 'celeb' | 'tech' | 'patron' | 'shady';
export type ClauseId = 'none' | 'dividend' | 'ratchet' | 'first_refusal' | 'seat' | 'mission' | 'silence';

interface KindDef {
  name: L;
  desc: L;
  likes: L;
  from: number;
  share: [number, number];
  /** prêmio sobre o valor justo da participação */
  premium: number;
  clause: ClauseId;
  patience: number; // 0.5 impaciente .. 1.5 paciente
  perks?: PerkValues;
}

export const KINDS: Record<InvestorKind, KindDef> = {
  angel: { name: l('Anjo da cena', 'Scene angel'), desc: l('Um apaixonado por música com algum dinheiro. Paciente e generoso.', 'A music lover with some money. Patient and generous.'), likes: l('Gosta de boa crítica e reputação artística; odeia retiradas grandes.', 'Likes good reviews and artistic reputation; hates big withdrawals.'), from: 1920, share: [0.05, 0.12], premium: 1.05, clause: 'none', patience: 1.4, perks: { critics: 0.1 } },
  family: { name: l('Família tradicional', 'Old-money family'), desc: l('Patrimônio antigo que quer estabilidade e dividendos.', 'Old wealth that wants stability and dividends.'), likes: l('Gosta de lucro, caixa positivo e dividendos; odeia prejuízo e escândalo.', 'Likes profit, positive cash and dividends; hates losses and scandal.'), from: 1920, share: [0.1, 0.2], premium: 0.95, clause: 'dividend', patience: 1.0 },
  vc: { name: l('Fundo de risco', 'Venture fund'), desc: l('Paga caro para crescer rápido. Quer escala e, um dia, a Bolsa.', 'Pays up to grow fast. Wants scale and, one day, the stock market.'), likes: l('Gosta de crescimento de receita e de IPO; odeia estagnação.', 'Likes revenue growth and IPOs; hates stagnation.'), from: 1965, share: [0.15, 0.3], premium: 1.25, clause: 'ratchet', patience: 0.7 },
  strategic: { name: l('Major parceira', 'Strategic major'), desc: l('Um selo grande compra uma fatia: distribuição e fábrica mais baratas.', 'A big label buys a slice: cheaper distribution and pressing.'), likes: l('Gosta de participação de mercado; não gosta de ser vendida a rivais.', 'Likes market share; hates being sold out to rivals.'), from: 1950, share: [0.1, 0.25], premium: 1.0, clause: 'first_refusal', patience: 1.0, perks: { chartUnits: 0.06, pressingCost: -0.05 } },
  celeb: { name: l('Estrela investidora', 'Celebrity investor'), desc: l('Um nome famoso põe dinheiro e prestígio.', 'A famous name brings money and prestige.'), likes: l('Gosta de hits e holofote; odeia fracasso público.', 'Likes hits and spotlight; hates public failure.'), from: 1950, share: [0.03, 0.08], premium: 1.1, clause: 'none', patience: 0.9, perks: { appeal: 0.03, signals: 1 } },
  tech: { name: l('Fundo de tecnologia', 'Tech fund'), desc: l('Aposta que a música vai ser software.', 'Bets that music will become software.'), likes: l('Gosta de participação de mercado e crescimento digital.', 'Likes market share and digital growth.'), from: 1995, share: [0.1, 0.25], premium: 1.3, clause: 'seat', patience: 0.8, perks: { chartUnits: 0.05 } },
  patron: { name: l('Fundação cultural', 'Cultural foundation'), desc: l('Mecenas institucional. Pouco dinheiro, muita reputação.', 'Institutional patron. Little money, lots of reputation.'), likes: l('Gosta de reputação institucional e filantropia; odeia retiradas.', 'Likes institutional reputation and philanthropy; hates withdrawals.'), from: 1930, share: [0.04, 0.08], premium: 0.85, clause: 'mission', patience: 1.5, perks: { reputation: 1 } },
  shady: { name: l('Dinheiro de origem duvidosa', 'Money of dubious origin'), desc: l('Muito dinheiro, pouca pergunta. Até alguém perguntar.', 'Lots of money, few questions. Until someone asks.'), likes: l('Só quer retorno e silêncio.', 'Only wants returns and silence.'), from: 1920, share: [0.1, 0.2], premium: 1.5, clause: 'silence', patience: 1.0 },
};

export const CLAUSES: Record<ClauseId, { name: L; desc: L }> = {
  none: { name: l('Sem cláusulas', 'No clauses'), desc: l('Só a participação.', 'Just the stake.') },
  dividend: { name: l('Dividendo anual', 'Annual dividend'), desc: l('Exige dividendos todo ano; sem eles, a opinião despenca.', 'Demands a dividend every year; without it, opinion collapses.') },
  ratchet: { name: l('Catraca', 'Ratchet'), desc: l('Se a meta falhar, a participação deles sobe 8 pontos.', 'If the goal fails, their stake rises by 8 points.') },
  first_refusal: { name: l('Preferência', 'First refusal'), desc: l('Se você vender ações ou abrir capital, eles reclamam.', 'If you sell shares or go public, they complain.') },
  seat: { name: l('Assento no conselho', 'Board seat'), desc: l('Voto no conselho: a opinião deles pesa o dobro.', 'A board vote: their opinion counts double.') },
  mission: { name: l('Missão cultural', 'Cultural mission'), desc: l('Retiradas do dono são vistas como traição.', 'Owner withdrawals are seen as betrayal.') },
  silence: { name: l('Silêncio', 'Silence'), desc: l('Ninguém pergunta de onde veio. Por enquanto.', 'Nobody asks where it came from. For now.') },
};

export type GoalMetric = 'revenueX' | 'profitYears' | 'top10' | 'goodReviews' | 'reputation' | 'marketShare';

export interface OpinionMod { label: L; value: number; decay: number }

export interface Investor {
  id: string;
  kind: InvestorKind;
  name: string;
  share: number;
  invested: number;
  trend: number;
  mods: OpinionMod[];
  goal?: { metric: GoalMetric; target: number; base: number; deadline: number; text: L; done?: boolean };
  clause: ClauseId;
  since: number;
  labelId?: string;
  lastMet?: number;
  angry: number;
  demand?: { text: L; until: number };
  buyout?: { price: number; until: number };
}

export interface InvestorOffer {
  id: string;
  kind: InvestorKind;
  name: string;
  share: number;
  amount: number;
  clause: ClauseId;
  goal?: Investor['goal'];
  labelId?: string;
  expires: number;
}

export interface CapitalState {
  investors: Investor[];
  offers: InvestorOffer[];
  offersAt: number;
  ownerLoan: number;
  companyCard: boolean;
  cardAccrued: number;
  confidence: number;
  lowMonths: number;
  dividendsYear: Record<number, number>;
  log: { week: number; text: L; tone: 'good' | 'bad' | 'info' }[];
}

declare module '../ext4' {
  interface Ext4 {
    capital: CapitalState;
  }
}

const fresh = (): CapitalState => ({ investors: [], offers: [], offersAt: -999, ownerLoan: 0, companyCard: false, cardAccrued: 0, confidence: 70, lowMonths: 0, dividendsYear: {}, log: [] });
registerExt4('capital', fresh);

export function capital(s: GameState): CapitalState {
  const x = s.x4 as unknown as { capital?: CapitalState };
  x.capital ??= fresh();
  return x.capital;
}

function logC(s: GameState, text: L, tone: 'good' | 'bad' | 'info' = 'info'): void {
  const c = capital(s);
  c.log.unshift({ week: s.week, text, tone });
  if (c.log.length > 30) c.log.length = 30;
}

// ---------------------------------------------------------------- valor e controle

export function valuation(s: GameState): number {
  const base = ipoTerms(s).valuation;
  const floor = money(s, 25000) + Math.max(0, s.player.cash) + playerActs(s).length * money(s, 6000);
  const rep = 1 + (s.player.reputation.commercial - 50) / 250;
  const model = Math.round(base * rep * (1 + perk(s, 'valuation')));
  // listada: metade do valor vem da cotação no pregão (rodada 11)
  return Math.max(floor, s.listing.listed ? Math.round(model * 0.5 + s.listing.price * s.listing.shares * 0.5) : model);
}

/** Blocos do seu selo no pregão (bolsa10, lido cru para não criar ciclo): rivais hostis e o que você comprou. */
function floatBlocks(s: GameState): { hostile: number; mine: number } {
  const b = (s.x4 as unknown as { bolsa10?: { own?: Record<string, Record<string, number>>; pos?: Record<string, { sh: number }> } }).bolsa10;
  let hostile = 0;
  for (const [k, f] of Object.entries(b?.own?.own ?? {})) if (k.startsWith('L:')) hostile += f;
  return { hostile, mine: (b?.pos?.own?.sh ?? 0) / Math.max(1, s.listing.shares) };
}

export function ownerShare(s: GameState): number {
  const c = capital(s);
  return clamp(1 - c.investors.reduce((t, x) => t + x.share, 0) - (s.listing.listed ? s.listing.floatShare : 0), 0, 1);
}

export function opinion(inv: Investor): number {
  return clamp(Math.round(inv.trend + inv.mods.reduce((t, m) => t + m.value, 0)), -100, 100);
}

function addMod(inv: Investor, label: L, value: number, decay = 1): void {
  inv.mods.push({ label, value, decay });
  if (inv.mods.length > 10) inv.mods.shift();
}

function modAll(s: GameState, label: L, f: (inv: Investor) => number, decay = 1): void {
  for (const inv of capital(s).investors) {
    const v = Math.round(f(inv));
    if (v) addMod(inv, label, v, decay);
  }
}

// ---------------------------------------------------------------- transferências

/** Aporte: do seu bolso para o caixa. Com sócios, sua fatia cresce (eles se diluem). */
export function injectCapital(s: GameState, realAmount: number): L | null {
  const o = ownerOf(s);
  const amt = money(s, realAmount);
  if (amt <= 0) return l('Valor inválido.', 'Invalid amount.');
  if (o.wealth < amt) return l('Seu patrimônio pessoal não cobre esse aporte.', 'Your personal wealth does not cover this.');
  o.wealth -= amt;
  post(s, `inject:${s.week}:${capital(s).log.length}`, amt, 'owner_capital', 'Aporte do dono');
  const c = capital(s);
  if (c.investors.length) {
    const v = valuation(s);
    const gain = amt / (v + amt);
    for (const inv of c.investors) inv.share = Math.max(0.005, inv.share * (1 - gain));
    modAll(s, l('Aporte do dono (diluição)', 'Owner injection (dilution)'), (inv) => (inv.kind === 'vc' || inv.kind === 'angel' ? 4 : -4) - gain * 60, 1);
  }
  modAll(s, l('Dono pôs dinheiro do bolso', 'Owner put in own money'), () => 6, 0.5);
  logC(s, fmtL(l('Você aportou ${v} do próprio bolso.', 'You injected ${v} from your own pocket.'), { v: Math.round(realAmount) }), 'good');
  return null;
}

/** Empréstimo do dono: a empresa devolve 3% do saldo + 1% de juros por mês ao seu bolso. */
export function lendToCompany(s: GameState, realAmount: number): L | null {
  const o = ownerOf(s);
  const amt = money(s, realAmount);
  if (amt <= 0) return l('Valor inválido.', 'Invalid amount.');
  if (o.wealth < amt) return l('Seu patrimônio pessoal não cobre esse empréstimo.', 'Your personal wealth does not cover this loan.');
  o.wealth -= amt;
  capital(s).ownerLoan += amt;
  post(s, `ownerloan:${s.week}:${capital(s).log.length}`, amt, 'financing', 'Empréstimo do dono');
  logC(s, fmtL(l('Você emprestou ${v} à empresa (3% do saldo + 1% de juros voltam por mês).', 'You lent ${v} to the company (3% of the balance + 1% interest comes back monthly).'), { v: Math.round(realAmount) }), 'info');
  return null;
}

/** Retirada extraordinária: do caixa para o seu bolso. Imposto, sócios irritados, ações caem, artistas desconfiam. */
export function withdrawFromCompany(s: GameState, r: Rng, realAmount: number): L | null {
  const amt = money(s, realAmount);
  if (amt <= 0) return l('Valor inválido.', 'Invalid amount.');
  if (s.player.cash < amt) return l('A empresa não tem esse caixa.', 'The company does not have that cash.');
  const o = ownerOf(s);
  const c = capital(s);
  post(s, `withdraw:${s.week}:${c.log.length}`, -amt, 'owner_draw', 'Retirada extraordinária do dono');
  const tax = Math.round(amt * 0.2);
  o.wealth += amt - tax;
  const v = valuation(s);
  const ratio = amt / Math.max(1, v);
  const notes: L[] = [l('20% ficaram com o fisco.', '20% went to the taxman.')];
  if (c.investors.length) {
    modAll(s, l('Retirada do dono', 'Owner withdrawal'), (inv) => -clamp(ratio * 300 * (inv.clause === 'mission' || inv.kind === 'angel' || inv.kind === 'patron' ? 2 : 1), 3, 50), 1.5);
    notes.push(l('Os sócios não gostaram.', 'Your partners did not like it.'));
  }
  if (s.listing.listed) {
    s.listing.price = Math.max(1, Math.round(s.listing.price * (1 - clamp(ratio * 2, 0.02, 0.15))));
    notes.push(l('As ações caíram.', 'The shares fell.'));
    if (ratio > 0.05 && r.chance(0.35)) {
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 8, 0, 100);
      post(s, `cvm:${s.week}`, -Math.round(amt * 0.15), 'legal', 'Multa da comissão de valores');
      notes.push(l('A comissão de valores abriu investigação e multou a empresa.', 'The securities commission investigated and fined the company.'));
    }
  }
  const burn = Object.values(monthlyCosts(s)).reduce((t, x) => t + x, 0);
  if (s.player.cash < burn * 3) {
    for (const id of playerActs(s)) { const a = s.acts[id]; if (a && !a.playerBand) a.trust = clamp(a.trust - 4, 0, 100); }
    s.player.reputation.artists = clamp(s.player.reputation.artists - 3, 0, 100);
    notes.push(l('Com o caixa curto, os artistas ouviram boatos de atraso e perderam confiança.', 'With cash tight, artists heard rumours of late payments and lost trust.'));
  }
  if (ratio > 0.1) s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
  logC(s, fmtL(l('Retirada de ${v}: {n}', 'Withdrawal of ${v}: {n}'), { v: Math.round(realAmount), n: { pt: notes.map((x) => x.pt).join(' '), en: notes.map((x) => x.en).join(' ') } }), 'bad');
  return null;
}

/** Cartão corporativo para despesas pessoais: economiza o seu bolso, mas uma auditoria pode achar. */
export function toggleCompanyCard(s: GameState): void {
  const c = capital(s);
  c.companyCard = !c.companyCard;
}

/** Dividendos: fração do caixa distribuída a todos os acionistas; a sua parte vai para o seu bolso. */
export function payDividend(s: GameState, frac: number): L | null {
  if (s.player.cash <= 0) return l('Sem caixa para dividendos.', 'No cash for dividends.');
  const total = Math.round(s.player.cash * clamp(frac, 0.01, 0.5));
  if (total < money(s, 100)) return l('Valor pequeno demais.', 'Amount too small.');
  const c = capital(s);
  post(s, `div6:${s.week}`, -total, 'dividends', 'Dividendos');
  const mine = Math.round(total * ownerShare(s) * 0.85);
  ownerOf(s).wealth += mine;
  c.dividendsYear[s.year] = (c.dividendsYear[s.year] ?? 0) + total;
  modAll(s, l('Dividendos pagos', 'Dividends paid'), (inv) => (inv.kind === 'family' || inv.kind === 'shady' ? 18 : inv.kind === 'vc' || inv.kind === 'tech' ? -4 : 6) * Math.min(2, frac * 10), 1.5);
  if (s.listing.listed) s.listing.price = Math.round(s.listing.price * (1 + frac * 0.2));
  logC(s, fmtL(l('Dividendos de ${v}; ${m} vieram para você (após impostos).', 'Dividends of ${v}; ${m} came to you (after tax).'), { v: Math.round(toReal(total, s.year)), m: Math.round(toReal(mine, s.year)) }), 'good');
  return null;
}

// ---------------------------------------------------------------- sócios

const FAMILY_NAMES = ['Bastos', 'Vanderhoeven', 'Albuquerque', 'Fairchild', 'Montenegro', 'Lindqvist', 'Okafor', 'Takeda', 'Castellane', 'Ribeiro de Sá'];
const FUND_NAMES = ['Aurora Capital', 'Harmonia Ventures', 'Northbridge Partners', 'Tempo Equity', 'Crescendo Fund', 'Cobalt Growth', 'Meridian'];
const TECH_NAMES = ['Pulse Labs Fund', 'Bitstream Capital', 'Neon Valley Partners', 'Quantum Audio Fund'];

function pickName(s: GameState, r: Rng, kind: InvestorKind): { name: string; labelId?: string } {
  switch (kind) {
    case 'family': return { name: fmtL(l('Família {n}', 'The {n} family'), { n: r.pick(FAMILY_NAMES) }).pt };
    case 'vc': return { name: r.pick(FUND_NAMES) };
    case 'tech': return { name: r.pick(TECH_NAMES) };
    case 'patron': return { name: r.pick(['Fundação Clave de Sol', 'Instituto Partitura', 'Fundação Música Viva', 'Arts Trust']) };
    case 'shady': return { name: r.pick(['Grupo Horizonte Ltda.', 'Offshore Bellavista', 'Comercial Três Irmãos', 'Atlantic Holdings']) };
    case 'strategic': {
      const lb = r.pick(Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.revenueLastYear - a.revenueLastYear).slice(0, 6));
      return lb ? { name: lb.name, labelId: lb.id } : { name: 'Major' };
    }
    case 'celeb': {
      const star = Object.values(s.acts).filter((a) => a.fame > 45 && a.owner !== 'player').sort((a, b) => b.fame - a.fame)[r.int(0, 4)];
      return { name: star?.name ?? 'Estrela' };
    }
    default: return { name: fmtL(l('{n} (anjo)', '{n} (angel)'), { n: r.pick(FAMILY_NAMES) }).pt };
  }
}

function makeGoal(s: GameState, r: Rng, kind: InvestorKind): Investor['goal'] {
  const years = kind === 'vc' || kind === 'tech' ? 3 : 2;
  const deadline = s.week + Math.round(years * 52);
  const rev = (s.player.revenueByYear[s.year - 1] ?? 0) || (s.player.revenueByYear[s.year] ?? 0) * 2 || money(s, 20000);
  switch (kind) {
    case 'vc': return { metric: 'revenueX', target: 2, base: rev, deadline, text: fmtL(l('Dobrar a receita anual em {y} anos.', 'Double annual revenue in {y} years.'), { y: years }) };
    case 'tech': return { metric: 'marketShare', target: Math.max(0.05, s.stats.marketShare * 1.8), base: s.stats.marketShare, deadline, text: fmtL(l('Chegar a {p}% do mercado em {y} anos.', 'Reach {p}% market share in {y} years.'), { p: Math.round(Math.max(0.05, s.stats.marketShare * 1.8) * 100), y: years }) };
    case 'strategic': return { metric: 'marketShare', target: Math.max(0.04, s.stats.marketShare * 1.5), base: s.stats.marketShare, deadline, text: fmtL(l('Chegar a {p}% do mercado.', 'Reach {p}% market share.'), { p: Math.round(Math.max(0.04, s.stats.marketShare * 1.5) * 100) }) };
    case 'family': return { metric: 'profitYears', target: 2, base: 0, deadline, text: l('Dar lucro dois anos seguidos.', 'Turn a profit two years in a row.') };
    case 'celeb': return { metric: 'top10', target: s.player.stats.top10s + 2, base: s.player.stats.top10s, deadline, text: l('Emplacar mais 2 músicas no Top 10.', 'Land 2 more songs in the Top 10.') };
    case 'angel': return { metric: 'goodReviews', target: 2, base: 0, deadline, text: l('Lançar 2 discos com média 7+ na crítica.', 'Release 2 records averaging 7+ with critics.') };
    case 'patron': return { metric: 'reputation', target: Math.min(90, Math.max(60, s.player.reputation.institutional + 10)), base: s.player.reputation.institutional, deadline, text: fmtL(l('Reputação institucional {t}+.', 'Institutional reputation {t}+.'), { t: Math.min(90, Math.max(60, s.player.reputation.institutional + 10)) }) };
    default: return r.chance(0.5) ? undefined : undefined;
  }
}

function genOffers(s: GameState, r: Rng, n: number, bonus = 0): void {
  const c = capital(s);
  const kinds = (Object.keys(KINDS) as InvestorKind[]).filter((k) => KINDS[k].from <= s.year && !c.investors.some((x) => x.kind === k && k !== 'angel'));
  const v = valuation(s);
  const cha = (ownerOf(s).attrs.charisma - 50) / 500 + (ownerOf(s).attrs.negotiation - 50) / 400;
  for (let i = 0; i < n && kinds.length; i++) {
    const kind = r.weighted(kinds, (k) => (k === 'shady' ? 0.4 : k === 'angel' ? 1.5 : 1))!;
    const kd = KINDS[kind];
    const share = Math.round(r.float(kd.share[0], kd.share[1]) * 100) / 100;
    const amount = Math.round(v * share * kd.premium * (1 + cha + bonus) * r.float(0.9, 1.1));
    const nm = pickName(s, r, kind);
    c.offers.push({ id: nextId(s, 'iv'), kind, name: nm.name, labelId: nm.labelId, share, amount, clause: kd.clause, goal: makeGoal(s, r, kind), expires: s.week + 13 });
    kinds.splice(kinds.indexOf(kind), 1);
  }
}

/** Buscar sócios ativamente: banco de investimento (custo) + 1 tempo livre → 3 propostas melhores. */
export function seekInvestors(s: GameState, r: Rng): L | null {
  if (energyLeft(s) < 1) return l('Sem tempo livre este mês.', 'No free time this month.');
  const fee = money(s, 1500);
  if (s.player.cash < fee) return l('Caixa insuficiente para o banco.', 'Not enough cash for the bankers.');
  spendEnergy(s, 1);
  post(s, `seekinv:${s.week}`, -fee, 'financing', 'Banco de investimento (prospecção)');
  capital(s).offers = capital(s).offers.filter((o) => o.expires > s.week);
  genOffers(s, r, 3, 0.08);
  return null;
}

export function acceptInvestor(s: GameState, offerId: string): L | null {
  const c = capital(s);
  const o = c.offers.find((x) => x.id === offerId);
  if (!o || o.expires <= s.week) return l('Proposta expirada.', 'Offer expired.');
  if (ownerShare(s) - o.share < 0.05) return l('Você ficaria sem participação.', 'You would be left with no stake.');
  const inv: Investor = { id: o.id, kind: o.kind, name: o.name, labelId: o.labelId, share: o.share, invested: o.amount, trend: 20, mods: [], goal: o.goal, clause: o.clause, since: s.week, angry: 0 };
  for (const other of c.investors) other.share = Math.max(0.005, other.share * (1 - o.share));
  c.investors.push(inv);
  c.offers = c.offers.filter((x) => x !== o);
  post(s, `inv:${o.id}`, o.amount, 'financing', `Aporte de ${o.name}`);
  if (o.labelId && s.rivalries[o.labelId]) s.rivalries[o.labelId] = Math.max(0, s.rivalries[o.labelId] - 20);
  if (ownerShare(s) < 0.5) notify(s, l('Atenção: você agora tem menos da metade da empresa. O conselho pode te demitir se a confiança despencar.', 'Warning: you now own less than half the company. The board can fire you if confidence collapses.'), 'bad');
  remember(s, 'investor', fmtL(l('{n} compra {p}% da {c}.', '{n} buys {p}% of {c}.'), { n: o.name, p: Math.round(o.share * 100), c: s.config.companyName }), { important: true });
  logC(s, fmtL(l('{n} entrou como sócio com {p}%.', '{n} joined as a partner with {p}%.'), { n: o.name, p: Math.round(o.share * 100) }), 'good');
  bumpPerks();
  return null;
}

export function buybackPrice(s: GameState, inv: Investor): number {
  return Math.round(valuation(s) * inv.share * (inv.buyout ? 1 : 1.15));
}

/** Recomprar a participação de um sócio, com dinheiro da empresa ou do seu bolso. */
export function buyBack(s: GameState, invId: string, from: 'company' | 'personal'): L | null {
  const c = capital(s);
  const inv = c.investors.find((x) => x.id === invId);
  if (!inv) return l('Sócio não encontrado.', 'Partner not found.');
  const price = buybackPrice(s, inv);
  if (from === 'company') {
    if (s.player.cash < price) return l('A empresa não tem caixa para a recompra.', 'The company lacks cash for the buyback.');
    post(s, `buyback:${inv.id}`, -price, 'financing', `Recompra da participação de ${inv.name}`);
  } else {
    const o = ownerOf(s);
    if (o.wealth < price) return l('Seu patrimônio pessoal não cobre a recompra.', 'Your personal wealth does not cover the buyback.');
    o.wealth -= price;
  }
  c.investors = c.investors.filter((x) => x !== inv);
  logC(s, fmtL(l('Você recomprou os {p}% de {n}.', 'You bought back {n}\'s {p}%.'), { n: inv.name, p: Math.round(inv.share * 100) }), 'good');
  bumpPerks();
  return null;
}

/** Reunião com um sócio: 1 tempo livre, opinião melhora (e você descobre o humor dele). */
export function meetInvestor(s: GameState, invId: string): L | null {
  const inv = capital(s).investors.find((x) => x.id === invId);
  if (!inv) return l('Sócio não encontrado.', 'Partner not found.');
  if (inv.lastMet && s.week - inv.lastMet < 8) return l('Vocês se falaram há pouco.', 'You spoke recently.');
  const e = spendEnergy(s, 1);
  if (e) return e;
  inv.lastMet = s.week;
  const cha = ownerOf(s).attrs.charisma;
  addMod(inv, l('Reunião com o dono', 'Meeting with the owner'), Math.round(6 + (cha - 50) / 6), 1);
  if (inv.demand) { inv.demand.until += 8; }
  return null;
}

// ---------------------------------------------------------------- IPO com escolhas

export type Underwriter = 'local' | 'major';
export function ipoQuote(s: GameState, float: number, uw: Underwriter, roadshow: boolean): { valuation: number; raise: number; fee: number; ok: boolean; reason?: L } {
  const t = ipoTerms(s);
  const v = Math.round(valuation(s) * (uw === 'major' ? 1.1 : 1) * (roadshow ? 1.05 : 1));
  const gross = Math.round(v * float);
  const fee = Math.round(gross * (uw === 'major' ? 0.07 : 0.04));
  return { valuation: v, raise: gross - fee, fee, ok: t.ok, reason: t.reason };
}

export function goPublic6(s: GameState, float: number, uw: Underwriter, roadshow: boolean): L | null {
  if (s.listing.listed) return l('Já listada.', 'Already listed.');
  if (float < 0.1 || float > 0.4) return l('Fatia inválida.', 'Invalid float.');
  if (ownerShare(s) - float < 0.05) return l('Sobraria pouco para você.', 'Too little would be left for you.');
  const q = ipoQuote(s, float, uw, roadshow);
  if (!q.ok) return q.reason ?? null;
  if (roadshow) { const e = spendEnergy(s, 2); if (e) return e; }
  s.listing.listed = true;
  s.listing.floatShare = float;
  s.listing.price = Math.max(1, Math.round(q.valuation / s.listing.shares));
  s.listing.history = [s.listing.price];
  s.listing.ipoWeek = s.week;
  post(s, 'ipo', q.raise, 'financing', 'Abertura de capital (IPO)');
  s.flags.ipoDone = 1;
  modAll(s, l('Abertura de capital', 'IPO'), (inv) => (inv.kind === 'vc' || inv.kind === 'tech' ? 35 : inv.clause === 'first_refusal' ? -20 : inv.kind === 'family' ? -5 : 5), 1);
  remember(s, 'ipo', fmtL(l('{c} abre capital na Bolsa Sonora.', '{c} goes public on the Sound Exchange.'), { c: s.config.companyName }), { important: true });
  logC(s, fmtL(l('IPO: {p}% em bolsa, captação de ${v}.', 'IPO: {p}% floated, raising ${v}.'), { p: Math.round(float * 100), v: Math.round(toReal(q.raise, s.year)) }), 'good');
  return null;
}

// ---------------------------------------------------------------- mês: opinião, metas, conselho

function metricsTrend(s: GameState, inv: Investor): number {
  const net = Object.values(s.lastMonthLedger).reduce((a, b) => a + b, 0);
  const revNow = s.player.revenueByYear[s.year] ?? 0;
  const revPrev = s.player.revenueByYear[s.year - 1] ?? 0;
  const pace = s.month > 0 ? (revNow / Math.max(1, s.month + 1)) * 12 : revPrev;
  const growth = revPrev > 0 ? pace / revPrev - 1 : 0;
  const cashOk = s.player.cash > 0 ? 10 : -25;
  const recent = allReleases17(s).filter((r) => r.owner === 'player' && s.week - r.week < 52);
  const rv = recent.map((r) => s.reviews[r.id]).filter((x) => x?.length).map((x) => x!.reduce((t, y) => t + y.score, 0) / x!.length);
  const critics = rv.length ? rv.reduce((a, b) => a + b, 0) / rv.length : 6;
  switch (inv.kind) {
    case 'angel': return 20 + (critics - 6) * 12 + (s.player.reputation.artistic - 50) / 3;
    case 'family': return (net > 0 ? 20 : -15) + cashOk;
    case 'vc': return clamp(growth * 120, -50, 50) + (s.listing.listed ? 15 : 0);
    case 'strategic': return 10 + (s.stats.marketShare - (inv.goal?.base ?? 0)) * 400;
    case 'celeb': return 5 + Math.min(40, recent.filter((r) => r.peak <= 10).length * 15) - (recent.length && !recent.some((r) => r.peak <= 40) ? 15 : 0);
    case 'tech': return clamp(growth * 80, -40, 40) + s.stats.marketShare * 200;
    case 'patron': return (s.player.reputation.institutional - 50) * 0.8 + 10;
    case 'shady': return (net > 0 ? 25 : -5);
  }
}

function goalValue(s: GameState, g: NonNullable<Investor['goal']>): number {
  switch (g.metric) {
    case 'revenueX': return (s.player.revenueByYear[s.year - 1] ?? 0) / Math.max(1, g.base);
    case 'marketShare': return s.stats.marketShare;
    case 'profitYears': return [s.year - 1, s.year - 2].filter((y) => (s.player.profitByYear[y] ?? 0) > 0).length;
    case 'top10': return s.player.stats.top10s;
    case 'reputation': return s.player.reputation.institutional;
    case 'goodReviews': return allReleases17(s).filter((r) => r.owner === 'player' && (s.reviews[r.id]?.length ?? 0) > 0 && s.reviews[r.id]!.reduce((t, x) => t + x.score, 0) / s.reviews[r.id]!.length >= 7).length;
  }
}

export function goalProgress(s: GameState, inv: Investor): { value: number; target: number } | null {
  return inv.goal ? { value: goalValue(s, inv.goal), target: inv.goal.target } : null;
}

export function boardConfidence(s: GameState): number {
  const c = capital(s);
  let w = 0;
  let v = 0;
  for (const inv of c.investors) {
    const k = inv.share * (inv.clause === 'seat' ? 2 : 1);
    w += k;
    v += k * (50 + opinion(inv) / 2);
  }
  if (s.listing.listed) {
    const h = s.listing.history;
    const tr = h.length > 6 ? h[h.length - 1] / Math.max(1, h[h.length - 7]) - 1 : 0;
    const k = s.listing.floatShare;
    const fb = floatBlocks(s);
    const hostile = Math.min(k, fb.hostile);
    const mine = Math.min(k - hostile, fb.mine);
    w += k;
    v += (k - hostile - mine) * clamp(55 + tr * 150, 0, 100) + hostile * 15 + mine * 100;
  }
  return w ? Math.round(v / w) : 100;
}

registerSimHook('month', 'capital', (s, r) => {
  const c = capital(s);
  const o = ownerOf(s);
  // propostas espontâneas a cada trimestre, quando a empresa já tem algum tamanho
  c.offers = c.offers.filter((x) => x.expires > s.week);
  if (s.week - c.offersAt >= 13 && valuation(s) > money(s, 40000)) {
    c.offersAt = s.week;
    if (c.offers.length < 3) genOffers(s, r, r.int(1, 2));
  }
  // empréstimo do dono volta aos poucos
  if (c.ownerLoan > 0 && s.player.cash > 0) {
    const pay = Math.min(c.ownerLoan, Math.round(c.ownerLoan * 0.03) + money(s, 50));
    const interest = Math.round(c.ownerLoan * 0.01);
    post(s, `ownerloanpay:${s.year}:${s.month}`, -(pay + interest), 'financing', 'Pagamento do empréstimo do dono');
    c.ownerLoan -= pay;
    o.wealth += pay + interest;
  }
  // cartão corporativo: a empresa paga suas contas; auditoria pode achar
  if (c.companyCard) {
    const living = money(s, 200 + o.kids.length * 120 + 150);
    post(s, `ccard:${s.year}:${s.month}`, -living, 'owner_draw', 'Despesas pessoais no cartão da empresa');
    o.wealth += living;
    c.cardAccrued += living;
    const risk = (c.investors.length ? 0.04 : 0.015) + (s.listing.listed ? 0.04 : 0);
    if (r.chance(risk)) {
      const fine = Math.round(c.cardAccrued * 1.5);
      post(s, `ccardfine:${s.week}`, -fine, 'legal', 'Multa: despesas pessoais na empresa');
      s.player.reputation.institutional = clamp(s.player.reputation.institutional - 8, 0, 100);
      modAll(s, l('Usou a empresa para gastos pessoais', 'Used the company for personal spending'), () => -30, 1);
      c.companyCard = false;
      c.cardAccrued = 0;
      notify(s, l('Auditoria descobriu despesas pessoais no cartão da empresa: multa, reputação abalada e sócios furiosos.', 'An audit found personal spending on the company card: a fine, damaged reputation and furious partners.'), 'bad');
      logC(s, l('Auditoria pegou o cartão corporativo.', 'Audit caught the company card.'), 'bad');
    }
  }
  // opinião de cada sócio
  for (const inv of c.investors) {
    const target = clamp(metricsTrend(s, inv), -60, 60);
    inv.trend += (target - inv.trend) * 0.2 / Math.max(0.5, 1 / KINDS[inv.kind].patience);
    for (const m of inv.mods) m.value = m.value > 0 ? Math.max(0, m.value - m.decay) : Math.min(0, m.value + m.decay);
    inv.mods = inv.mods.filter((m) => m.value !== 0);
    const op = opinion(inv);
    // metas
    if (inv.goal && !inv.goal.done && s.week >= inv.goal.deadline) {
      inv.goal.done = true;
      const ok = goalValue(s, inv.goal) >= inv.goal.target;
      if (ok) {
        addMod(inv, l('Meta cumprida', 'Goal met'), 30, 1);
        if (inv.kind === 'angel') { inv.share = Math.max(0.01, inv.share - 0.02); notify(s, fmtL(l('{n} devolve 2% da empresa como prêmio pela meta.', '{n} hands back 2% of the company as a reward.'), { n: inv.name }), 'good'); }
        else notify(s, fmtL(l('{n}: meta cumprida! A relação melhora muito.', '{n}: goal met! The relationship improves a lot.'), { n: inv.name }), 'good');
      } else {
        addMod(inv, l('Meta perdida', 'Goal missed'), -30, 0.8);
        if (inv.clause === 'ratchet') { inv.share = Math.min(0.6, inv.share + 0.08); notify(s, fmtL(l('{n} acionou a catraca: a fatia deles sobe 8 pontos.', '{n} triggered the ratchet: their stake rises by 8 points.'), { n: inv.name }), 'bad'); }
        else notify(s, fmtL(l('{n}: meta não cumprida. A confiança caiu.', '{n}: goal missed. Confidence dropped.'), { n: inv.name }), 'bad');
      }
      logC(s, fmtL(ok ? l('{n}: meta cumprida.', '{n}: goal met.') : l('{n}: meta perdida.', '{n}: goal missed.'), { n: inv.name }), ok ? 'good' : 'bad');
      inv.goal = ok ? makeGoal(s, r, inv.kind) : undefined;
    }
    // insatisfação → exigência → saída
    if (op < -40) inv.angry += 1; else inv.angry = Math.max(0, inv.angry - 1);
    if (inv.angry === 3 && !inv.demand) {
      inv.demand = { text: inv.kind === 'family' || inv.kind === 'shady' ? l('Exigem dividendos já.', 'They demand dividends now.') : inv.kind === 'vc' || inv.kind === 'tech' ? l('Exigem crescimento: mais lançamentos e territórios.', 'They demand growth: more releases and territories.') : l('Exigem uma reunião e um plano.', 'They demand a meeting and a plan.'), until: s.week + 13 };
      notify(s, fmtL(l('{n} está furioso(a): {d}', '{n} is furious: {d}'), { n: inv.name, d: inv.demand.text }), 'bad');
    }
    if (inv.demand && op > -10) inv.demand = undefined;
    if (inv.demand && s.week > inv.demand.until && !inv.buyout) {
      inv.buyout = { price: Math.round(valuation(s) * inv.share), until: s.week + 9 };
      notify(s, fmtL(l('{n} quer sair: recompre a participação em 2 meses ou ela será vendida a um rival.', '{n} wants out: buy back the stake within 2 months or it will be sold to a rival.'), { n: inv.name }), 'bad');
    }
  }
  // saídas não atendidas: a fatia vai para um rival
  for (const inv of [...c.investors]) {
    if (!inv.buyout || s.week <= inv.buyout.until) continue;
    const lb = r.pick(Object.values(s.labels).filter((x) => x.active).sort((a, b) => b.cash - a.cash).slice(0, 5));
    if (lb) {
      Object.assign(inv, { kind: 'strategic' as InvestorKind, name: lb.name, labelId: lb.id, trend: -30, mods: [], clause: 'seat' as ClauseId, buyout: undefined, demand: undefined, angry: 0, goal: undefined });
      s.rivalries[lb.id] = (s.rivalries[lb.id] ?? 0) + 25;
      notify(s, fmtL(l('{l} comprou a fatia do sócio insatisfeito e agora senta no seu conselho.', '{l} bought the unhappy partner\'s stake and now sits on your board.'), { l: lb.name }), 'bad');
      remember(s, 'investor', fmtL(l('{l}, rival, vira acionista da {c}.', 'Rival {l} becomes a shareholder of {c}.'), { l: lb.name, c: s.config.companyName }), { important: true });
      bumpPerks();
    }
  }
  // dinheiro duvidoso: um dia alguém pergunta
  for (const inv of c.investors) if (inv.kind === 'shady' && r.chance(0.012)) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 15, 0, 100);
    s.player.stats.scandalsSurvived += 1;
    notify(s, fmtL(l('Reportagem liga {n} a lavagem de dinheiro. Sua empresa aparece na matéria.', 'A report links {n} to money laundering. Your company is in the story.'), { n: inv.name }), 'bad');
    remember(s, 'scandal', fmtL(l('Escândalo: o sócio {n} é investigado por lavagem.', 'Scandal: partner {n} is investigated for laundering.'), { n: inv.name }), { important: true });
  }
  // conselho
  if (c.investors.length || s.listing.listed) {
    c.confidence = boardConfidence(s);
    const control = ownerShare(s) + (s.listing.listed ? floatBlocks(s).mine : 0) >= 0.5;
    if (c.confidence < 30) {
      c.lowMonths += 1;
      if (c.lowMonths === 1) notify(s, fmtL(l('Confiança do conselho em {v}: ultimato. Melhore resultados ou converse com os sócios.', 'Board confidence at {v}: ultimatum. Improve results or talk to your partners.'), { v: c.confidence }), 'bad');
      if (c.confidence < 15 && c.lowMonths >= 4) {
        if (control) {
          o.stress = clamp(o.stress + 15, 0, 100);
          s.player.reputation.institutional = clamp(s.player.reputation.institutional - 5, 0, 100);
          notify(s, l('O conselho votou sua saída, mas você tem a maioria das ações e vetou. O clima ficou péssimo.', 'The board voted you out, but you hold the majority and vetoed it. The mood is terrible.'), 'bad');
          c.lowMonths = 0;
        } else if (!s.ended) {
          s.ended = { ending: 'fired_by_board', year: s.year, reason: 'insolvency' };
          remember(s, 'fired', l('Sem a maioria das ações, o conselho votou e demitiu você.', 'Without a majority, the board voted and fired you.'), { important: true });
        }
      }
    } else c.lowMonths = 0;
  }
});

registerSimHook('year', 'capital', (s) => {
  const c = capital(s);
  const paid = c.dividendsYear[s.year - 1] ?? c.dividendsYear[s.year] ?? 0;
  for (const inv of c.investors) if (inv.clause === 'dividend' && s.week - inv.since > 40 && !paid) addMod(inv, l('Ano sem dividendos', 'A year without dividends'), -25, 1);
});

// ---------------------------------------------------------------- perks dos sócios

registerPerkSource('capital', (s) => {
  const out: PerkEntry[] = [];
  for (const inv of capital(s).investors) {
    const p = KINDS[inv.kind].perks;
    if (p) out.push({ label: fmtL(l('Sócio: {n}', 'Partner: {n}'), { n: inv.name }), values: p });
  }
  return out;
});
