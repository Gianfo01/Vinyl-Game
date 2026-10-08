// Contratos avançados (GDD §17 + pedido do criador): territórios com cessão parcial,
// cross-collateralization, buyout, opções de renovação, cláusula de saída e renegociação em crise.

import { clamp, type Rng } from '../core/rng';
import { MARKETS, l, type L, type MarketId } from '../data/world';
import { endContract } from './contracts';
import type { Act, Contract, GameState } from './types';
import { fmtL, money, notify, playerActs, post, remember } from './util';

export function contractOf(s: GameState, act: Act): Contract | undefined {
  return act.contractId ? s.contracts[act.contractId] : undefined;
}

/** Ajusta cláusulas negociadas ao assinar (chamado pela UI de oferta avançada). */
export function setClauses(s: GameState, actId: string, c: { territories?: MarketId[]; crossCollat?: boolean; options?: number; exitFee?: number }): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  if (!k || k.party !== 'player') return l('Contrato inválido.', 'Invalid contract.');
  if (c.territories) k.territories = c.territories;
  if (c.crossCollat !== undefined) {
    k.crossCollat = c.crossCollat;
    if (c.crossCollat) {
      // saldos de contratos anteriores do mesmo ato passam a compensar entre si
      for (const other of Object.values(s.contracts)) {
        if (other.id !== k.id && other.actId === actId && other.party === 'player' && other.recoupBalance > 0) {
          k.recoupBalance += other.recoupBalance;
          other.recoupBalance = 0;
        }
      }
      act.trust = clamp(act.trust - 4, 0, 100);
    }
  }
  if (c.options !== undefined) k.options = clamp(c.options, 0, 3);
  if (c.exitFee !== undefined) k.exitFee = Math.max(0, c.exitFee);
  return null;
}

/** Cessão parcial: licencia a outro selo a exploração em alguns mercados por uma fatia. */
export function cedeTerritory(s: GameState, actId: string, labelId: string, markets: MarketId[], share: number): L | null {
  const act = s.acts[actId];
  const k = act ? contractOf(s, act) : undefined;
  const lb = s.labels[labelId];
  if (!k || k.party !== 'player' || !lb?.active) return l('Inválido.', 'Invalid.');
  if (!markets.length) return l('Escolha mercados.', 'Pick markets.');
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
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  const willing = (lb?.cash ?? 0) < money(s, 100000) ? 0.85 : 0.45 - (s.rivalries[k.party] ?? 0) / 200;
  if (!r.chance(willing)) {
    s.rivalries[k.party] = (s.rivalries[k.party] ?? 0) + 5;
    return fmtL(l('{b} recusou vender o contrato.', '{b} refused to sell the contract.'), { b: lb?.name ?? '' });
  }
  post(s, `buyout:${actId}`, -price, 'acquisitions', `Buyout de ${act.name}`);
  if (lb) {
    lb.cash += price;
    lb.roster = lb.roster.filter((x) => x !== actId);
  }
  k.party = 'player';
  act.owner = 'player';
  act.trust = clamp(act.trust + 5, 0, 100);
  s.delegated[actId] = true;
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
    if (s.player.cash < amt) return l('Caixa insuficiente.', 'Not enough cash.');
    post(s, `crisisadv:${actId}`, -amt, 'advances', `Adiantamento emergencial ${act.name}`);
    k.recoupBalance += amt;
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
      act.cash -= k.exitFee;
      post(s, `exit:${id}`, k.exitFee, 'licensing', `Multa de saída ${act.name}`);
      endContract(s, act, 'left');
      continue;
    }
    // artista em crise pede socorro (vira notificação; a UI oferece a renegociação)
    if (act.cash < 0 && !s.flags[`askHelp:${id}`]) {
      s.flags[`askHelp:${id}`] = s.week;
      notify(s, fmtL(l('{a} está sem dinheiro e pede adiantamento emergencial.', '{a} is broke and asks for an emergency advance.'), { a: act.name }), 'event');
    } else if (act.cash >= 0 && s.flags[`askHelp:${id}`]) delete s.flags[`askHelp:${id}`];
  }
}
