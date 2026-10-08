// Subselos como empresas (GDD §43, §44 + pedido do criador): caixa e extrato próprios, credores,
// conselho societário com votos, dividendos, estratégia delegada e falência própria.
// Transferência entre caixas não é lucro; dinheiro da matriz não cobre o subselo automaticamente.

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import { composeSongs, recordSongs, unreleasedRecorded } from './production';
import { launchNpcRelease } from './market';
import type { GameState } from './types';
import type { SubLabel } from './xtypes';
import { fmtL, money, nextId, notify, post, remember } from './util';

const INVESTOR_NAMES = ['Fundo Aurora', 'Kestrel Capital', 'Família Montenegro', 'Lyra Ventures', 'Coletivo Raiz', 'Banco Atlântico', 'Harbor Partners'];

function slog(sl: SubLabel, week: number, amount: number, memo: string): void {
  sl.cash += amount;
  sl.log.push({ week, amount, memo });
  if (sl.log.length > 80) sl.log.splice(0, sl.log.length - 80);
  if (amount > 0) sl.revenueYear += amount;
}

function hist(s: GameState, sl: SubLabel, text: L): void {
  sl.history.push({ week: s.week, text });
  if (sl.history.length > 20) sl.history.splice(0, sl.history.length - 20);
}

export function subLabelValuation(s: GameState, sl: SubLabel): number {
  const masters = sl.roster.flatMap((id) => s.acts[id]?.releases ?? []).map((id) => s.releases[id]).filter((r) => r && r.owner === sl.id);
  const recent = masters.reduce((t, r) => t + r.revenue, 0) / Math.max(1, masters.length) * 0.5;
  const debt = sl.loans.reduce((t, x) => t + x.balance, 0) + sl.creditors.reduce((t, c) => t + c.owed, 0);
  return Math.max(money(s, 10000), sl.cash + recent * 18 + money(s, 3000) * sl.roster.length - debt);
}

export function foundSubLabel(s: GameState, r: Rng, name: string, genre: string, capital: number, strategy: SubLabel['strategy']): SubLabel | L {
  if (s.config.role === 'artist') return l('Só gravadora ou híbrido.', 'Label or hybrid only.');
  if (s.player.hq < 2) return l('Exige Loft ou Complexo.', 'Requires a Loft or Complex HQ.');
  const setup = money(s, 5000);
  const cap = Math.max(money(s, 3000), Math.min(capital, money(s, 1_000_000)));
  if (s.player.cash < setup + cap) return l('Caixa insuficiente para instalação e capital.', 'Not enough cash for setup and capital.');
  const sl: SubLabel = {
    id: nextId(s, 'sub'), name: name.trim() || 'Subselo', logoSeed: r.int(1, 2 ** 30), genreFocus: genre, cash: 0, reserve: money(s, 2000), budget: money(s, 2000),
    strategy, roster: [], managerSalary: money(s, 650), founderShare: 1, board: [], loans: [], creditors: [], status: 'active', distressMonths: 0,
    retained: 0, revenueYear: 0, revenueLastYear: 0, log: [], history: [], founded: s.year,
  };
  post(s, `subsetup:${sl.id}`, -setup, 'hq', `Instalação ${sl.name}`);
  post(s, `subcap:${sl.id}`, -cap, 'transfers', `Capital para ${sl.name}`);
  slog(sl, s.week, cap, 'Capital inicial da matriz');
  sl.revenueYear = 0;
  s.subLabels.push(sl);
  hist(s, sl, l('Fundação.', 'Founded.'));
  remember(s, 'sublabel', fmtL(l('{c} funda o subselo {n}.', '{c} founds the sub-label {n}.'), { c: s.config.companyName, n: sl.name }), { important: true });
  return sl;
}

/** Aporte da matriz (transferência, não lucro). Com sócios externos, só via proposta aprovada. */
export function transferToSub(s: GameState, subId: string, amount: number): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl || sl.status === 'closed' || sl.status === 'bankrupt') return l('Subselo inativo.', 'Sub-label inactive.');
  if (s.player.cash < amount) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `subtx:${sl.id}`, -amount, 'transfers', `Aporte em ${sl.name}`);
  slog(sl, s.week, amount, 'Aporte da matriz');
  sl.revenueYear -= amount; // aporte não é receita
  return null;
}

export function assignAct(s: GameState, subId: string, actId: string): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  const act = s.acts[actId];
  if (!sl || !act || act.owner !== 'player') return l('Inválido.', 'Invalid.');
  if (sl.roster.length >= 3) return l('Cada subselo acompanha até três carreiras.', 'Each sub-label manages up to three careers.');
  for (const o of s.subLabels) o.roster = o.roster.filter((x) => x !== actId);
  sl.roster.push(actId);
  hist(s, sl, fmtL(l('{a} passa ao subselo.', '{a} moves to the sub-label.'), { a: act.name }));
  return null;
}

export function unassignAct(s: GameState, subId: string, actId: string): void {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (sl) sl.roster = sl.roster.filter((x) => x !== actId);
}

export function subOfAct(s: GameState, actId: string): SubLabel | undefined {
  return s.subLabels.find((x) => x.roster.includes(actId) && (x.status === 'active' || x.status === 'distress'));
}

export function setSubPolicy(s: GameState, subId: string, p: { budget?: number; reserve?: number; strategy?: SubLabel['strategy']; salary?: number }): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl) return l('Inválido.', 'Invalid.');
  if (sl.founderShare <= 0.5) {
    sl.pendingProposal = { kind: 'policy', amount: 0, week: s.week };
    s.flags[`policyDraft:${sl.id}`] = JSON.stringify(p).length;
    (sl as SubLabel & { draft?: typeof p }).draft = p;
    return l('Sem maioria: a proposta vai a voto do conselho no próximo mês.', 'No majority: the proposal goes to a board vote next month.');
  }
  applyPolicy(sl, p);
  return null;
}

function applyPolicy(sl: SubLabel, p: { budget?: number; reserve?: number; strategy?: SubLabel['strategy']; salary?: number }): void {
  if (p.budget !== undefined) sl.budget = Math.max(0, p.budget);
  if (p.reserve !== undefined) sl.reserve = Math.max(0, p.reserve);
  if (p.strategy) sl.strategy = p.strategy;
  if (p.salary !== undefined) sl.managerSalary = Math.max(0, p.salary);
}

/** Rodada de capital: vende participação (até 35%) a um sócio com objetivo próprio. */
export function proposeCapital(s: GameState, r: Rng, subId: string, amount: number): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl) return l('Inválido.', 'Invalid.');
  if (sl.board.length >= 5) return l('Máximo de cinco sócios externos.', 'At most five outside partners.');
  const val = subLabelValuation(s, sl);
  const frac = amount / (val + amount);
  if (frac > 0.35) return l('Uma rodada vende no máximo 35%.', 'A round sells at most 35%.');
  if (sl.cash < money(s, 500)) return l('O subselo precisa de $500 para a rodada.', 'The sub-label needs $500 for the round.');
  slog(sl, s.week, -money(s, 500), 'Custos da rodada');
  sl.revenueYear += money(s, 500);
  // diluição proporcional
  sl.founderShare *= 1 - frac;
  for (const b of sl.board) b.share *= 1 - frac;
  sl.board.push({ name: r.pick(INVESTOR_NAMES), share: frac, goal: r.pick(['return', 'growth', 'culture'] as const) });
  slog(sl, s.week, amount, 'Aporte de sócio');
  sl.revenueYear -= amount;
  hist(s, sl, fmtL(l('Rodada de capital: {p}% vendidos.', 'Capital round: {p}% sold.'), { p: Math.round(frac * 100) }));
  return null;
}

export function proposeDividend(s: GameState, subId: string, amount: number): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl) return l('Inválido.', 'Invalid.');
  if (amount > sl.retained || sl.cash - amount < sl.reserve) return l('Dividendos exigem lucro retido e caixa acima da reserva.', 'Dividends need retained profit and cash above reserve.');
  if (sl.founderShare > 0.5) {
    payDividend(s, sl, amount);
    return null;
  }
  sl.pendingProposal = { kind: 'dividend', amount, week: s.week };
  return l('Sem maioria: o conselho vota no próximo mês.', 'No majority: the board votes next month.');
}

function payDividend(s: GameState, sl: SubLabel, amount: number): void {
  slog(sl, s.week, -amount, 'Dividendos');
  sl.revenueYear += amount;
  sl.retained -= amount;
  post(s, `subdiv:${sl.id}`, Math.round(amount * sl.founderShare), 'dividends', `Dividendos de ${sl.name}`);
  hist(s, sl, fmtL(l('Dividendos distribuídos.', 'Dividends paid out.'), {}));
}

export function buyBack(s: GameState, subId: string): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl || !sl.board.length) return l('Não há sócios externos.', 'No outside partners.');
  if (sl.pendingProposal) return l('Há proposta pendente.', 'A proposal is pending.');
  const outside = sl.board.reduce((t, b) => t + b.share, 0);
  const cost = Math.round(subLabelValuation(s, sl) * outside * 1.15);
  if (s.player.cash < cost) return l('Caixa insuficiente para a recompra.', 'Not enough cash for the buyback.');
  post(s, `subbuy:${sl.id}`, -cost, 'transfers', `Recompra de ${sl.name}`);
  sl.board = [];
  sl.founderShare = 1;
  hist(s, sl, l('Recompra das participações externas.', 'Bought back outside stakes.'));
  return null;
}

export function closeSubLabel(s: GameState, subId: string): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl || sl.status === 'closed') return l('Inválido.', 'Invalid.');
  if (sl.board.length) return l('Recompre os sócios antes de encerrar.', 'Buy out partners before closing.');
  const debt = sl.loans.reduce((t, x) => t + x.balance, 0) + sl.creditors.reduce((t, c) => t + c.owed, 0) - Math.min(0, sl.cash);
  if (debt > 0) {
    if (s.player.cash < debt) return l('A matriz precisa cobrir a dívida do subselo.', 'The parent must cover the sub-label\'s debt.');
    post(s, `subdebt:${sl.id}`, -debt, 'transfers', `Dívidas de ${sl.name}`);
  }
  if (sl.cash > 0) post(s, `subclose:${sl.id}`, sl.cash, 'transfers', `Saldo de ${sl.name}`);
  sl.cash = 0;
  sl.loans = [];
  sl.creditors = [];
  sl.roster = [];
  sl.status = 'closed';
  hist(s, sl, l('Encerrado; elenco volta à matriz.', 'Closed; roster returns to the parent.'));
  return null;
}

export function subLoan(s: GameState, subId: string): L | null {
  const sl = s.subLabels.find((x) => x.id === subId);
  if (!sl || sl.status !== 'active') return l('Subselo inativo.', 'Sub-label inactive.');
  if (sl.loans.length) return l('Uma dívida ativa por vez.', 'One active loan at a time.');
  const amount = money(s, 15000);
  const rate = 0.18;
  const monthly = Math.round((amount * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -24)));
  sl.loans.push({ id: nextId(s, 'sln'), principal: amount, balance: amount, rate, monthly, startWeek: s.week });
  slog(sl, s.week, amount, 'Empréstimo bancário');
  sl.revenueYear -= amount;
  sl.creditors.push({ id: nextId(s, 'scr'), name: 'Banco Atlântico', kind: 'bank', patience: 70, owed: 0 });
  return null;
}

/** Mês do subselo: custos, vendas atribuídas, decisões delegadas, conselho e falência própria. */
export function subLabelsMonth(s: GameState, r: Rng): void {
  for (const sl of s.subLabels) {
    if (sl.status === 'closed' || sl.status === 'bankrupt') continue;
    const before = sl.cash;
    // custos fixos
    slog(sl, s.week, -sl.managerSalary, 'Gestor e estrutura');
    for (const loan of sl.loans) {
      const interest = Math.round((loan.balance * loan.rate) / 12);
      const principal = Math.min(loan.balance, loan.monthly - interest);
      slog(sl, s.week, -(interest + principal), 'Parcela');
      loan.balance -= Math.max(0, principal);
    }
    sl.loans = sl.loans.filter((x) => x.balance > 0);
    // receitas: lançamentos do subselo já entram via distribute (owner = sl.id) → s.labels não existe; liquidamos aqui
    for (const actId of sl.roster) {
      const act = s.acts[actId];
      if (!act) continue;
      for (const rid of act.releases) {
        const rel = s.releases[rid];
        if (!rel || rel.owner !== sl.id || !rel.live) continue;
        const w = rel.weekly.slice(-4).reduce((t, x) => t + x, 0);
        const gross = Math.round(w * money(s, rel.type === 'lp' ? 6 : 1.2) * 0.8);
        if (gross > 0) slog(sl, s.week, gross, `Vendas ${rel.title}`);
        rel.revenue += gross;
      }
    }
    // decisões delegadas pela estratégia, respeitando orçamento e reserva
    const spend = Math.min(sl.budget, sl.cash - sl.reserve);
    if (spend > money(s, 500) && sl.status === 'active') {
      const act = sl.roster.map((id) => s.acts[id]).filter(Boolean).sort((a, b) => a.lastRelease - b.lastRelease)[0];
      if (act) {
        if (sl.strategy === 'development') {
          for (const id of act.members) {
            const p = s.persons[id];
            if (p) p.skills.comp = Math.min(p.potential, p.skills.comp + 0.6);
          }
          slog(sl, s.week, -Math.min(spend, money(s, 650)), `Desenvolvimento ${act.name}`);
        } else if (sl.strategy === 'commercial') {
          act.fans.casual += Math.round(200 + act.fame * 20);
          slog(sl, s.week, -Math.min(spend, money(s, 1200)), `Ação comunitária ${act.name}`);
        } else if (s.week - act.lastRelease > 26) {
          const cost = money(s, 3000);
          if (spend >= cost) {
            const songs = composeSongs(s, r, act, 1);
            recordSongs(s, r, act, songs.map((x) => x.id), 2, 'balanced', 'act');
            act.cash += cost;
            const ready = unreleasedRecorded(s, act);
            if (ready.length) {
              const rel = launchNpcRelease(s, r, act, sl.id, [ready[0].id], 'single', 1500);
              rel.owner = sl.id;
              slog(sl, s.week, -cost - money(s, 1500), `Single ${rel.title}`);
              hist(s, sl, fmtL(l('Lança "{t}" de {a}.', 'Releases "{t}" by {a}.'), { t: rel.title, a: act.name }));
            }
          }
        }
      }
    }
    // lucro retido e conselho
    const profit = sl.cash - before;
    sl.retained += profit;
    if (sl.pendingProposal && s.week - sl.pendingProposal.week >= 3) {
      const pp = sl.pendingProposal;
      let yes = sl.founderShare;
      for (const b of sl.board) {
        const likes = pp.kind === 'dividend' ? b.goal === 'return' : pp.kind === 'capital' ? b.goal === 'growth' : b.goal !== 'return' || sl.cash > sl.reserve * 2;
        if (likes ? r.chance(0.8) : r.chance(0.25)) yes += b.share;
      }
      if (yes > 0.5) {
        if (pp.kind === 'dividend') payDividend(s, sl, pp.amount);
        if (pp.kind === 'policy') applyPolicy(sl, (sl as SubLabel & { draft?: Parameters<typeof applyPolicy>[1] }).draft ?? {});
        hist(s, sl, l('Conselho aprovou a proposta.', 'The board approved the proposal.'));
        notify(s, fmtL(l('Conselho de {n} aprovou a proposta.', '{n}\'s board approved the proposal.'), { n: sl.name }), 'good');
      } else {
        hist(s, sl, l('Conselho rejeitou a proposta.', 'The board rejected the proposal.'));
        notify(s, fmtL(l('Conselho de {n} rejeitou a proposta.', '{n}\'s board rejected the proposal.'), { n: sl.name }), 'bad');
      }
      sl.pendingProposal = undefined;
    }
    // falência própria: saldo negativo vira dívida com credores
    if (sl.cash < 0) {
      sl.distressMonths += 1;
      sl.status = 'distress';
      let cr = sl.creditors.find((c) => c.kind === 'supplier');
      if (!cr) {
        cr = { id: nextId(s, 'scr'), name: 'Fornecedores', kind: 'supplier', patience: 60, owed: 0 };
        sl.creditors.push(cr);
      }
      cr.owed = -sl.cash;
      cr.patience -= 20;
      if (sl.distressMonths === 1) notify(s, fmtL(l('{n} está no vermelho. Aporte, empréstimo ou encerramento?', '{n} is in the red. Inject capital, borrow or close?'), { n: sl.name }), 'bad');
      if (cr.patience <= 0 || sl.distressMonths >= 6) {
        sl.status = 'bankrupt';
        sl.roster = [];
        hist(s, sl, l('Falência decretada pelos credores. Elenco volta à matriz; masters ficam com os credores.', 'Creditors forced bankruptcy. Roster returns to the parent; masters go to creditors.'));
        remember(s, 'sub_bankrupt', fmtL(l('O subselo {n} vai à falência.', 'Sub-label {n} goes bankrupt.'), { n: sl.name }), { important: true });
        s.player.reputation.institutional = clamp(s.player.reputation.institutional - 6, 0, 100);
      }
    } else {
      sl.distressMonths = 0;
      if (sl.status === 'distress') sl.status = 'active';
      for (const c of sl.creditors) c.owed = 0;
    }
    if (s.month === 11) {
      sl.revenueLastYear = sl.revenueYear;
      sl.revenueYear = 0;
    }
  }
}
