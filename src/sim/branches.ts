// Sedes e filiais (pedido do criador): a empresa começa na garagem e pode chegar a uma torre
// multinacional (anos 70+) e a um campus futurista (era dos hologramas). Filiais em outras cidades
// somam capacidade, abrem o mercado local e dão vantagem de agenda e de garimpo na região.

import { BRANCH_LEVELS, HQ_LEVELS, type HqLevel } from '../data/rules';
import { cityById, l, type L } from '../data/world';
import { addAsset } from './finance';
import type { GameState } from './types';
import type { Branch } from './xtypes';
import { fmtL, hasTech, money, nextId, post, remember } from './util';

export interface HqCaps {
  careers: number;
  staff: number;
  sessions: number;
  equipment: number;
}

/** Capacidade total: matriz + filiais. */
export function hqCaps(s: GameState): HqCaps {
  const m = HQ_LEVELS[Math.min(s.player.hq, HQ_LEVELS.length - 1)];
  const c: HqCaps = { careers: m.careers, staff: m.staff, sessions: m.sessions, equipment: m.equipment };
  for (const b of s.branches ?? []) {
    const lv = BRANCH_LEVELS[b.level];
    c.careers += lv.careers;
    c.staff += lv.staff;
    c.sessions += lv.sessions;
  }
  return c;
}

/** Por que o próximo nível ainda não está disponível (null = pode ampliar). */
export function hqBlocker(s: GameState, lv: HqLevel | undefined = HQ_LEVELS[s.player.hq + 1]): L | null {
  if (!lv) return l('Sede já no nível máximo.', 'HQ already at max level.');
  if (lv.minYear && s.year < lv.minYear) return fmtL(l('Disponível a partir de {y}.', 'Available from {y}.'), { y: lv.minYear });
  if (lv.tech && !hasTech(s, lv.tech)) return l('Exige a tecnologia de hologramas de palco.', 'Requires stage hologram technology.');
  if (lv.minReputation && s.player.reputation.commercial < lv.minReputation) return fmtL(l('Exige reputação comercial {r}.', 'Requires commercial reputation {r}.'), { r: lv.minReputation });
  return null;
}

export function branchRent(s: GameState): number {
  return (s.branches ?? []).reduce((t, b) => t + money(s, BRANCH_LEVELS[b.level].rent), 0);
}

export function canOpenBranch(s: GameState, cityId: string): L | null {
  if (s.player.hq < 2) return l('Abra filiais a partir do Loft.', 'Open branches once you have a Loft.');
  if (cityId === s.config.homeCity) return l('A matriz já fica nesta cidade.', 'The main HQ is already in this city.');
  if (s.branches.some((b) => b.city === cityId)) return l('Já existe uma filial aqui.', 'There is already a branch here.');
  const max = Math.max(1, s.player.hq * 2 - 2);
  if (s.branches.length >= max) return fmtL(l('A sede atual comporta até {n} filiais.', 'The current HQ supports up to {n} branches.'), { n: max });
  if (s.player.cash < money(s, BRANCH_LEVELS[0].cost)) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}

export function openBranch(s: GameState, cityId: string): L | null {
  const err = canOpenBranch(s, cityId);
  if (err) return err;
  const city = cityById[cityId];
  const lv = BRANCH_LEVELS[0];
  const cost = money(s, lv.cost);
  post(s, `branch:${cityId}:${s.week}`, -cost, 'hq', `Filial em ${city.name.pt}`);
  const b: Branch = { id: nextId(s, 'br'), city: cityId, level: 0, name: `${s.config.companyName} ${city.name.pt}`, opened: s.week };
  s.branches.push(b);
  addAsset(s, { kind: 'building', name: fmtL(l('Filial {c}', 'Branch {c}'), { c: city.name }), cost, lifeMonths: 180 });
  if (!s.player.territories.includes(city.market)) s.player.territories.push(city.market);
  remember(s, 'branch', fmtL(l('{c} abre filial em {x}.', '{c} opens a branch in {x}.'), { c: s.config.companyName, x: city.name }), { important: true });
  return null;
}

export function upgradeBranch(s: GameState, id: string): L | null {
  const b = s.branches.find((x) => x.id === id);
  if (!b) return l('Filial inválida.', 'Invalid branch.');
  const next = BRANCH_LEVELS[b.level + 1];
  if (!next) return l('Filial no nível máximo.', 'Branch at max level.');
  if (s.player.hq < b.level + 2) return l('Amplie a matriz primeiro.', 'Upgrade the main HQ first.');
  const cost = money(s, next.cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `branchup:${b.id}:${b.level + 1}`, -cost, 'hq', `Ampliação da filial ${b.name}`);
  b.level += 1;
  addAsset(s, { kind: 'building', name: fmtL(l('{n}: {lv}', '{n}: {lv}'), { n: b.name, lv: next.name }), cost, lifeMonths: 180 });
  return null;
}

export function closeBranch(s: GameState, id: string): void {
  s.branches = s.branches.filter((b) => b.id !== id);
  for (const [a, bid] of Object.entries(s.branchOf)) if (bid === id) delete s.branchOf[a];
}

export function assignBranch(s: GameState, actId: string, branchId: string | null): void {
  if (!branchId) delete s.branchOf[actId];
  else s.branchOf[actId] = branchId;
}

/** Cidade da filial que cuida do ato (ou null). */
export function branchCityOf(s: GameState, actId: string): string | null {
  const id = s.branchOf?.[actId];
  return id ? s.branches.find((b) => b.id === id)?.city ?? null : null;
}

/** Bônus de agenda (público) numa cidade com filial: equipe local de booking e imprensa. */
export function branchCityBonus(s: GameState, cityId: string): number {
  const b = (s.branches ?? []).find((x) => x.city === cityId);
  if (b) return 1.12 + b.level * 0.05;
  const m = cityById[cityId]?.market;
  return (s.branches ?? []).some((x) => cityById[x.city]?.market === m) ? 1.05 : 1;
}

export function branchesInMarket(s: GameState, market: string): Branch[] {
  return (s.branches ?? []).filter((b) => cityById[b.city]?.market === market);
}
