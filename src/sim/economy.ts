// Finanças mensais: aluguel da sede, salários, empréstimos, investidores e insolvência (GDD §18).
// Ações de empresa: contratar, sede, equipamento, territórios.

import { clamp, type Rng } from '../core/rng';
import { EQUIPMENT, HQ_LEVELS } from '../data/rules';
import { MARKETS, cityById, l, type L, type MarketId } from '../data/world';
import { careerSlotsUsed } from './contracts';
import type { GameState, StaffMember } from './types';
import { fmtL, hasMutator, hasTech, money, nextId, notify, post, remember } from './util';
import { genProfessionals } from './worldgen';
import { emitEvent } from './events';
import { addAsset } from './finance';

export function monthlyCosts(s: GameState): { rent: number; salaries: number; outsourcing: number; loans: number; equipment: number } {
  const hq = HQ_LEVELS[s.player.hq];
  const rent = money(s, hq.rent);
  const salaries = s.player.staff.reduce((t, x) => t + x.salary, 0);
  const over = Math.max(0, careerSlotsUsed(s) - hq.careers);
  const outsourcing = money(s, over * 2200);
  const loans = s.player.loans.reduce((t, x) => t + x.monthly, 0);
  const equipment = money(s, s.player.equipment.length * 60);
  return { rent, salaries, outsourcing, loans, equipment };
}

/** Carga de gestão: acima de 1 há atrito (qualidade, confiança). */
export function managementLoad(s: GameState): number {
  const hq = HQ_LEVELS[s.player.hq];
  const admin = s.player.staff.filter((x) => x.role === 'admin').length;
  return careerSlotsUsed(s) / Math.max(1, hq.careers + admin * 1.5);
}

export function payMonth(s: GameState): void {
  const c = monthlyCosts(s);
  post(s, 'rent', -c.rent, 'rent', 'Aluguel da sede');
  post(s, 'salaries', -c.salaries, 'salaries', 'Salários');
  if (c.outsourcing) post(s, 'outsourcing', -c.outsourcing, 'outsourcing', 'Terceirização de carreiras');
  if (c.equipment) post(s, 'equip_maint', -c.equipment, 'equipment', 'Manutenção');
  for (const loan of s.player.loans) {
    const interest = Math.round((loan.balance * loan.rate) / 12);
    const principal = Math.min(loan.balance, loan.monthly - interest);
    post(s, `loan:${loan.id}`, -(interest + principal), 'loans', 'Parcela de empréstimo');
    loan.balance -= Math.max(0, principal);
  }
  s.player.loans = s.player.loans.filter((x) => x.balance > 0);
  // investidor fica com parte das vendas
  if (s.economy.investorUntil > s.week && s.economy.investorShare > 0) {
    const sales = s.monthLedger.sales ?? 0;
    if (sales > 0) post(s, 'investor_share', -Math.round(sales * s.economy.investorShare), 'financing', 'Participação do investidor');
  }
  // carga de gestão desgasta a confiança dos artistas
  const load = managementLoad(s);
  if (load > 1) {
    for (const a of Object.values(s.acts)) if (a.owner === 'player' && !a.playerBand) a.trust = clamp(a.trust - (load - 1) * 3, 0, 100);
  }
}

export function loanOffer(s: GameState): { amount: number; rate: number; months: number } | null {
  if (hasMutator(s, 'no_safety_net')) return null;
  const rep = s.player.reputation.commercial + s.player.reputation.institutional;
  const amount = money(s, 20000 + rep * 600 + s.player.hq * 30000);
  const rate = clamp(0.16 - rep / 1500 + (s.economy.recession ? 0.04 : 0), 0.05, 0.25);
  return { amount, rate, months: 36 };
}

export function takeLoan(s: GameState): boolean {
  const o = loanOffer(s);
  if (!o || s.player.loans.length >= 3) return false;
  const monthly = Math.round((o.amount * (o.rate / 12)) / (1 - Math.pow(1 + o.rate / 12, -o.months)));
  s.player.loans.push({ id: nextId(s, 'ln'), principal: o.amount, balance: o.amount, rate: o.rate, monthly, startWeek: s.week });
  post(s, `loan_in:${s.player.loans.length}`, o.amount, 'financing', 'Empréstimo');
  return true;
}

export function checkInsolvency(s: GameState, r: Rng): void {
  if (s.player.cash >= 0) {
    s.player.insolvencyMonths = 0;
    return;
  }
  s.player.insolvencyMonths += 1;
  const m = s.player.insolvencyMonths;
  if (m === 1) notify(s, l('ALERTA: caixa negativo. Reestruture, venda ativos ou peça crédito.', 'ALERT: negative cash. Restructure, sell assets or seek credit.'), 'bad');
  if (m === 2 || m === 4) {
    const mine = Object.values(s.releases).filter((x) => x.owner === 'player');
    const n = Math.max(1, Math.ceil(mine.length / 2));
    const value = mine.slice(0, n).reduce((t, x) => t + Math.sqrt(x.totalUnits + 100) * 25, 0);
    const best = Object.values(s.acts).filter((a) => a.owner === 'player' && !a.playerBand).sort((a, b) => b.fame - a.fame)[0];
    if (mine.length || best) emitEvent(s, r, 'distress_sale', { n, price: Math.round(value + 2000), act: best?.id ?? '', fee: best ? Math.round(1500 + best.fame * best.fame * 25) : 0 });
  }
  if (m === 3) {
    // venda forçada de equipamento
    const sold = s.player.equipment.splice(0);
    s.assets = s.assets.filter((a) => a.kind !== 'equipment');
    let v = 0;
    for (const id of sold) v += money(s, (EQUIPMENT.find((e) => e.id === id)?.cost ?? 0) * 0.4);
    if (v) post(s, 'forced_sale', v, 'asset_sales', 'Venda forçada de equipamento');
    if (s.player.staff.length > 1) {
      s.player.staff = s.player.staff.slice(0, 1);
      notify(s, l('Reestruturação: equipe reduzida.', 'Restructuring: staff cut.'), 'bad');
    }
    remember(s, 'restructure', l('O selo passa por uma reestruturação forçada.', 'The label goes through forced restructuring.'), { important: true });
  }
  if (m >= 6 && !s.ended) {
    s.ended = { ending: s.year >= 2030 ? 'the_silence' : 'insolvency', year: s.year, reason: 'insolvency' };
    remember(s, 'end', l('Insolvência: a empresa encerra as atividades.', 'Insolvency: the company shuts down.'), { important: true });
  }
  void r;
}

// ---------- Ações de empresa ----------

export function hireStaff(s: GameState, proId: string): L | null {
  const pro = s.professionals.find((x) => x.id === proId);
  if (!pro) return l('Profissional indisponível.', 'Professional unavailable.');
  if (s.player.staff.length >= HQ_LEVELS[s.player.hq].staff) return l('Sede sem vagas para equipe. Amplie a sede.', 'No staff room in the HQ. Upgrade it.');
  const signOn = Math.round(pro.salary * 0.5);
  if (s.player.cash < signOn) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `hire:${pro.id}`, -signOn, 'salaries', `Contratação ${pro.name}`);
  s.professionals = s.professionals.filter((x) => x !== pro);
  s.player.staff.push({ ...pro, hiredWeek: s.week });
  return null;
}

export function fireStaff(s: GameState, staffId: string): void {
  const st = s.player.staff.find((x) => x.id === staffId);
  if (!st) return;
  post(s, `fire:${st.id}`, -st.salary, 'salaries', `Rescisão ${st.name}`);
  s.player.staff = s.player.staff.filter((x) => x !== st);
}

export function refreshProfessionals(s: GameState, r: Rng): void {
  s.professionals = s.professionals.filter(() => r.chance(0.7));
  s.professionals.push(...genProfessionals(s, r, Math.max(0, 8 - s.professionals.length)));
}

export function upgradeCost(s: GameState): number | null {
  const next = HQ_LEVELS[s.player.hq + 1];
  return next ? money(s, next.upgradeCost) : null;
}

export function upgradeHq(s: GameState): L | null {
  const cost = upgradeCost(s);
  if (cost === null) return l('Sede já no nível máximo.', 'HQ already at max level.');
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `hq:${s.player.hq + 1}`, -cost, 'hq', 'Ampliação da sede');
  s.player.hq += 1;
  addAsset(s, { kind: 'building', name: HQ_LEVELS[s.player.hq].name, cost, lifeMonths: 240 });
  remember(s, 'hq', fmtL(l('{c} muda para: {h}.', '{c} moves up to: {h}.'), { c: s.config.companyName, h: HQ_LEVELS[s.player.hq].name }), { important: true });
  return null;
}

export function availableEquipment(s: GameState) {
  return EQUIPMENT.filter((e) => (!e.tech || hasTech(s, e.tech)) && !s.player.equipment.includes(e.id));
}

export function buyEquipment(s: GameState, id: string): L | null {
  const def = EQUIPMENT.find((e) => e.id === id);
  if (!def) return l('Item inválido.', 'Invalid item.');
  if (s.player.equipment.length >= HQ_LEVELS[s.player.hq].equipment) return l('Sem espaço para equipamento na sede.', 'No equipment space in the HQ.');
  const cost = money(s, def.cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `eq:${id}`, -cost, 'equipment', def.name.pt);
  s.player.equipment.push(id);
  addAsset(s, { kind: 'equipment', name: def.name, cost, lifeMonths: 60, refId: id });
  if (def.tech && s.techDates[def.tech] && s.year - s.techDates[def.tech] <= 2) s.player.legacy.innovation += 3;
  return null;
}

export function territoryCost(s: GameState, m: MarketId): number {
  const mk = MARKETS.find((x) => x.id === m)!;
  return money(s, 6000 + mk.size(s.year) * 40000);
}

export function openTerritory(s: GameState, m: MarketId): L | null {
  if (s.player.territories.includes(m)) return null;
  const cost = territoryCost(s, m);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `terr:${m}`, -cost, 'distribution', `Distribuição ${m}`);
  s.player.territories.push(m);
  s.player.stats.marketsPresent = s.player.territories.length;
  remember(s, 'territory', fmtL(l('Acordo de distribuição: {m}.', 'Distribution deal: {m}.'), { m: MARKETS.find((x) => x.id === m)!.name }));
  return null;
}

export function homeMarket(s: GameState): MarketId {
  return cityById[s.config.homeCity]?.market ?? 'na';
}

export function staffList(s: GameState): StaffMember[] {
  return s.player.staff;
}
