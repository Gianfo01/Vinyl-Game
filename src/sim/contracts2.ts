// Contratos avançados (GDD §17 + pedido do criador): territórios com cessão parcial,
// cross-collateralization, buyout, opções de renovação, cláusula de saída e renegociação em crise.

import { clamp, type Rng } from '../core/rng';
import { MARKETS, l, type L, type MarketId } from '../data/world';
import { endContract, transferAct } from './contracts';
import { rightsOf } from './rights';
import type { Act, Contract, GameState } from './types';
import { fmtL, money, notify, playerActs, post, remember, rngOf } from './util';
import { cashWhy20, freeCash20 } from './oblig20';
import { recoup } from './sys/contracts18';
import { setClause19 } from './sys/moneyb19';

export function contractOf(s: GameState, act: Act): Contract | undefined {
  return act.contractId ? s.contracts[act.contractId] : undefined;
}

export type ClauseKind2 = 'option' | 'cross' | 'exit';
export const CLAUSE_COOLDOWN2 = 26;
/** r21 (H-4): cláusula depois da assinatura é uma renegociação — o artista precisa concordar. Chance pela confiança,
 *  custo de confiança ao pedir e cooldown de 26 semanas por ato (o mesmo do `setClause19`). */
export function clauseConsent2(s: GameState, act: Act, kind: ClauseKind2, undo = false): { p: number; band: L; cost: number; cooldown: number } {
  const cooldown = Math.max(0, (s.flags[`clauseCd:${act.id}`] ?? 0) - s.week);
  if (undo) return { p: 1, band: l('certa', 'certain'), cost: 0, cooldown };
  const base = kind === 'exit' ? 0.1 : kind === 'cross' ? 0.15 : 0.2;
  const p = clamp(base + act.trust / 125, 0.05, 0.9);
  const band = p >= 0.6 ? l('alta', 'high') : p >= 0.35 ? l('média', 'medium') : l('baixa', 'low');
  return { p, band, cost: kind === 'exit' ? 5 : kind === 'cross' ? 4 : 3, cooldown };
}

/** Ajusta cláusulas negociadas (ao assinar, ou depois — com consentimento do artista; r21, H-4).
 *  A multa de saída tem um único gravador: `moneyb19.setClause19` (valor, custo e cooldown). */
export function setClauses(s: GameState, actId: string, c: { territories?: MarketId[]; crossCollat?: boolean; options?: number; exitFee?: number }): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  if (!k || k.party !== 'player') return l('Contrato inválido.', 'Invalid contract.');
  if (c.territories) k.territories = c.territories;
  const fresh = k.startWeek === s.week; // na assinatura ainda é a mesa de negociação: nada a consentir
  const ask = (kind: ClauseKind2, undo: boolean): L | null => {
    if (fresh) return null;
    const cc = clauseConsent2(s, act, kind, undo);
    if (cc.cooldown > 0) return fmtL(l('Renegociou uma cláusula há pouco: espere {w} semana(s).', 'A clause was renegotiated recently: wait {w} week(s).'), { w: cc.cooldown });
    s.flags[`clauseCd:${act.id}`] = s.week + CLAUSE_COOLDOWN2;
    if (undo) return null;
    act.trust = clamp(act.trust - cc.cost, 0, 100);
    if (!rngOf(s).chance(cc.p)) {
      remember(s, 'clause_refused', fmtL(l('{a} recusou a cláusula nova que o selo pediu.', '{a} refused the new clause the label asked for.'), { a: act.name }), { actId });
      return fmtL(l('{a} não aceitou a cláusula (chance {b}); a confiança caiu {c}.', '{a} did not accept the clause ({b} chance); trust fell {c}.'), { a: act.name, b: cc.band, c: cc.cost });
    }
    remember(s, 'clause_added', fmtL(l('{a} aceitou renegociar uma cláusula do contrato.', '{a} agreed to renegotiate a contract clause.'), { a: act.name }), { actId });
    return null;
  };
  if (c.crossCollat !== undefined && !!k.crossCollat !== c.crossCollat) {
    const e = ask('cross', !c.crossCollat);
    if (e) return e;
    k.crossCollat = c.crossCollat;
    if (c.crossCollat) {
      // saldos de contratos anteriores do mesmo ato passam a compensar entre si
      for (const other of Object.values(s.contracts)) {
        if (other.id !== k.id && other.actId === actId && other.party === 'player' && other.recoupBalance > 0) {
          recoup(s, k, 'adv', other.recoupBalance);
          other.recoupBalance = 0;
        }
      }
      if (fresh) act.trust = clamp(act.trust - 4, 0, 100);
    }
  }
  if (c.options !== undefined && (k.options ?? 0) !== clamp(c.options, 0, 3)) {
    const e = ask('option', clamp(c.options, 0, 3) < (k.options ?? 0));
    if (e) return e;
    k.options = clamp(c.options, 0, 3);
  }
  if (c.exitFee !== undefined && (k.exitFee ?? 0) !== Math.max(0, c.exitFee)) {
    const e = ask('exit', c.exitFee <= 0);
    if (e) return e;
    if (fresh) k.exitFee = Math.max(0, c.exitFee);
    else {
      const r = setClause19(s, actId, c.exitFee > 0 ? 'fair' : 'none');
      if (r) return r;
    }
  }
  return null;
}

/** Cessão parcial: licencia a outro selo a exploração em alguns mercados por uma fatia. */
export function cedeTerritory(s: GameState, actId: string, labelId: string, markets: MarketId[], share: number): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  const lb = s.labels[labelId];
  if (!k || k.party !== 'player' || !lb?.active) return l('Inválido.', 'Invalid.');
  if (!markets.length) return l('Escolha mercados.', 'Pick markets.');
  if (!rightsOf(k).license) return l('O contrato não cede ao selo o direito de licenciar a terceiros.', 'The contract does not grant the label third-party licensing rights.');
  const size = markets.reduce((t, m) => t + (MARKETS.find((x) => x.id === m)?.size(s.year) ?? 0), 0);
  const fee = money(s, 2000 + act.fame * 400 * size * share * 3);
  if (lb.cash < fee) return l('O parceiro não tem caixa para isso.', 'The partner lacks the cash.');
  lb.cash -= fee;
  post(s, `cede:${actId}:${labelId}`, fee, 'licensing', `Licença territorial a ${lb.name}`);
  (k.ceded ??= []).push({ party: labelId, share, markets });
  for (const m of markets) if (!lb.territories.includes(m)) lb.territories.push(m);
  remember(s, 'territory_license', fmtL(l('{a} é licenciado a {b} em {n} mercado(s).', '{a} is licensed to {b} in {n} market(s).'), { a: act.name, b: lb.name, n: markets.length }), { actId });
  return null;
}

/** Buyout: comprar o contrato de um artista de um selo rival. */
export function buyoutPrice(s: GameState, act: Act): number {
  const k = contractOf(s, act);
  if (!k) return 0;
  const left = Math.max(0, k.endWeek - s.week) / 52;
  return Math.round((k.buyout ?? 0) || money(s, 5000 + act.fame * act.fame * 40 * (0.5 + left / 2)) + k.recoupBalance * 0.6);
}

export function buyoutContract(s: GameState, r: Rng, actId: string): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  if (!act || !k || k.party === 'player') return l('Sem contrato rival para comprar.', 'No rival contract to buy.');
  const lb = s.labels[k.party];
  const price = buyoutPrice(s, act);
  if (freeCash20(s) < price) return cashWhy20(s, price, l('Caixa insuficiente.', 'Not enough cash.'));
  const willing = (lb?.cash ?? 0) < money(s, 100000) ? 0.85 : 0.45 - (s.rivalries[k.party] ?? 0) / 200;
  if (!r.chance(willing)) {
    s.rivalries[k.party] = (s.rivalries[k.party] ?? 0) + 5;
    return fmtL(l('{b} recusou vender o contrato.', '{b} refused to sell the contract.'), { b: lb?.name ?? '' });
  }
  post(s, `buyout:${actId}`, -price, 'acquisitions', `Buyout de ${act.name}`);
  if (lb) lb.cash += price;
  k.party = 'player';
  transferAct(s, act, 'player', 'bought'); // r21 (H-3)
  act.trust = clamp(act.trust + 5, 0, 100);
  remember(s, 'buyout', fmtL(l('{c} compra o contrato de {a} de {b}.', '{c} buys {a}\'s contract from {b}.'), { c: s.config.companyName, a: act.name, b: lb?.name ?? '' }), { actId, important: true });
  return null;
}

/** Exercer opção de renovação (sem renegociar, mas custa confiança se o artista queria sair). */
export function exerciseOption(s: GameState, actId: string): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  if (!k || k.party !== 'player' || !k.options) return l('Sem opções no contrato.', 'No options left in the contract.');
  k.options -= 1;
  k.endWeek += 52;
  k.releasesOwed += 1;
  const unhappy = act.trust < 50;
  act.trust = clamp(act.trust - (unhappy ? 10 : 2), 0, 100);
  remember(s, 'option', fmtL(l('O selo exerce a opção de mais um ano com {a}.', 'The label exercises a one-year option on {a}.'), { a: act.name }), { actId });
  return null;
}

/** Renegociação em crise: artista sem dinheiro pede socorro, ou selo pede corte de royalties. */
export function crisisRenegotiate(s: GameState, actId: string, kind: 'advance' | 'cut'): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  if (!k || k.party !== 'player') return l('Inválido.', 'Invalid.');
  if (kind === 'advance') {
    const amt = money(s, 3000 + act.fame * 100);
    if (freeCash20(s) < amt) return cashWhy20(s, amt, l('Caixa insuficiente.', 'Not enough cash.'));
    post(s, `crisisadv:${actId}`, -amt, 'advances', `Adiantamento emergencial ${act.name}`);
    recoup(s, k, 'adv', amt);
    act.cash += amt;
    act.trust = clamp(act.trust + 8, 0, 100);
    return null;
  }
  if (s.player.cash >= 0 && s.player.insolvencyMonths === 0) return l('Só em crise do selo.', 'Only during a label crisis.');
  const ok = act.trust > 55;
  if (!ok) {
    act.trust = clamp(act.trust - 10, 0, 100);
    return l('O artista recusou o corte e ficou ressentido.', 'The artist refused the cut and resents it.');
  }
  k.royalty = Math.max(0.05, k.royalty - 0.03);
  k.endWeek -= 26; // em troca, liberdade mais cedo
  act.trust = clamp(act.trust - 3, 0, 100);
  return null;
}

/** Cláusula de saída: artista com caixa paga a multa e vai embora. */
export function contracts2Month(s: GameState, r: Rng): void {
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    const k = contractOf(s, act);
    if (!k || k.party !== 'player' || act.playerBand) continue;
    if (k.exitFee && act.trust < 25 && act.cash > k.exitFee && r.chance(0.2)) {
      endContract(s, act, 'left'); // r21 (H-5): a multa é cobrada dentro de endContract
      continue;
    }
    // artista em crise pede socorro (vira notificação; a UI oferece a renegociação)
    if (act.cash < 0 && !s.flags[`askHelp:${id}`]) {
      s.flags[`askHelp:${id}`] = s.week;
      notify(s, fmtL(l('{a} está sem dinheiro e pede adiantamento emergencial.', '{a} is broke and asks for an emergency advance.'), { a: act.name }), 'event');
    } else if (act.cash >= 0 && s.flags[`askHelp:${id}`]) delete s.flags[`askHelp:${id}`];
  }
}
