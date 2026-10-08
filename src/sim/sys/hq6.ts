// Gestão da sede (rodada 6): departamentos com níveis (A&R, marketing, jurídico, financeiro, bem-estar,
// estúdio interno, booking, digital), compra do prédio (acaba o aluguel da matriz), foco e diretor
// regional das filiais. Tudo vira perks; a manutenção mensal sai do caixa.

import { l, type L, cityById } from '../../data/world';
import { BRANCH_LEVELS, HQ_LEVELS } from '../../data/rules';
import { addAsset } from '../finance';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { bumpPerks, registerPerkSource, type PerkEntry, type PerkValues } from '../perks';
import type { GameState } from '../types';
import { fmtL, hasTech, money, post, remember } from '../util';

export type DeptId = 'anr' | 'marketing' | 'legal' | 'finance' | 'wellbeing' | 'studio' | 'booking' | 'digital';

export interface DeptDef {
  id: DeptId;
  name: L;
  desc: L;
  icon: string;
  minHq: number;
  tech?: string;
  /** custo de cada nível (dólares reais) e manutenção mensal por nível */
  cost: [number, number, number];
  upkeep: number;
  perLevel: PerkValues;
}

export const DEPTS: DeptDef[] = [
  { id: 'anr', name: l('Departamento de A&R', 'A&R department'), desc: l('Olheiros internos: mais ações e sinais de scouting.', 'In-house scouts: more scouting actions and signals.'), icon: 'fans', minHq: 1, cost: [6000, 25000, 90000], upkeep: 300, perLevel: { scoutActions: 1, signals: 0.5, scoutAccuracy: 0.03 } },
  { id: 'marketing', name: l('Marketing e promoção', 'Marketing and promotion'), desc: l('Equipe de rádio, imprensa e campanhas: mais apelo.', 'Radio, press and campaign team: more appeal.'), icon: 'radio', minHq: 1, cost: [8000, 35000, 120000], upkeep: 400, perLevel: { appeal: 0.04 } },
  { id: 'legal', name: l('Jurídico', 'Legal'), desc: l('Contratos melhores: adiantamentos menores e ofertas mais seguras.', 'Better contracts: smaller advances and safer offers.'), icon: 'contract', minHq: 2, cost: [10000, 40000, 140000], upkeep: 450, perLevel: { advance: -0.04, offer: 0.015 } },
  { id: 'finance', name: l('Financeiro', 'Finance'), desc: l('Controladoria: salários sob controle e empresa mais valiosa.', 'Controlling: salaries in check and a more valuable company.'), icon: 'bank', minHq: 2, cost: [9000, 38000, 130000], upkeep: 400, perLevel: { staffCost: -0.03, valuation: 0.05 } },
  { id: 'wellbeing', name: l('Bem-estar e RH', 'Wellbeing and HR'), desc: l('Psicólogo, fisioterapia vocal, folgas: elenco feliz, dono menos estressado.', 'Therapist, vocal physio, time off: happy roster, less stressed owner.'), icon: 'heart', minHq: 2, cost: [7000, 30000, 100000], upkeep: 350, perLevel: { morale: 0.5, stress: -0.07 } },
  { id: 'studio', name: l('Estúdio interno', 'In-house studio'), desc: l('Salas próprias e engenheiros: mais qualidade nas gravações.', 'Own rooms and engineers: better recording quality.'), icon: 'mic', minHq: 1, cost: [12000, 50000, 180000], upkeep: 500, perLevel: { songQ: 0.8 } },
  { id: 'booking', name: l('Agência de shows', 'Booking agency'), desc: l('Agenda própria de turnês: bilheteria maior.', 'Own tour booking: bigger box office.'), icon: 'tour-bus', minHq: 2, cost: [9000, 40000, 150000], upkeep: 400, perLevel: { showRevenue: 0.05 } },
  { id: 'digital', name: l('Digital e dados', 'Digital and data'), desc: l('Plataformas, playlists e dados: mais vendas.', 'Platforms, playlists and data: more sales.'), icon: 'chart-up', minHq: 2, tech: 'internet', cost: [15000, 60000, 200000], upkeep: 600, perLevel: { chartUnits: 0.04 } },
];
export const deptById = Object.fromEntries(DEPTS.map((d) => [d.id, d])) as Record<DeptId, DeptDef>;

export type BranchFocus = 'scouting' | 'promo' | 'studio' | 'live' | 'sales';
export const BRANCH_FOCUS: Record<BranchFocus, { name: L; desc: L }> = {
  scouting: { name: l('Garimpo', 'Scouting'), desc: l('Mais sinais e precisão de scouting.', 'More signals and scouting precision.') },
  promo: { name: l('Promoção', 'Promotion'), desc: l('+6% de apelo para os artistas desta filial.', '+6% appeal for this branch\'s artists.') },
  studio: { name: l('Estúdio', 'Studio'), desc: l('+1,5 de qualidade para os artistas desta filial.', '+1.5 quality for this branch\'s artists.') },
  live: { name: l('Shows', 'Live'), desc: l('+12% de público na região da filial.', '+12% audience in the branch\'s region.') },
  sales: { name: l('Vendas', 'Sales'), desc: l('+3% de vendas no geral.', '+3% sales overall.') },
};

export interface Hq6State {
  depts: Partial<Record<DeptId, number>>;
  ownBuilding: boolean;
  branchFocus: Record<string, BranchFocus>;
  directors: Record<string, boolean>;
}

declare module '../ext4' {
  interface Ext4 {
    hq6: Hq6State;
  }
}

const fresh = (): Hq6State => ({ depts: {}, ownBuilding: false, branchFocus: {}, directors: {} });
registerExt4('hq6', fresh);

export function hq6(s: GameState): Hq6State {
  const x = s.x4 as unknown as { hq6?: Hq6State };
  x.hq6 ??= fresh();
  return x.hq6;
}

/** Vagas de departamento: cresce com a sede. */
export function deptSlots(s: GameState): number {
  return [1, 2, 4, 6, 8, 8][Math.min(5, s.player.hq)];
}

export function deptCount(s: GameState): number {
  return Object.values(hq6(s).depts).filter((v) => (v ?? 0) > 0).length;
}

export function deptBlocker(s: GameState, id: DeptId): L | null {
  const d = deptById[id];
  const lv = hq6(s).depts[id] ?? 0;
  if (lv >= 3) return l('Departamento no nível máximo.', 'Department at max level.');
  if (s.player.hq < d.minHq + lv) return fmtL(l('Precisa de sede nível {n}+ ({h}).', 'Needs HQ level {n}+ ({h}).'), { n: d.minHq + lv, h: HQ_LEVELS[Math.min(HQ_LEVELS.length - 1, d.minHq + lv)].name });
  if (d.tech && !hasTech(s, d.tech)) return l('Tecnologia ainda não existe.', 'Technology does not exist yet.');
  if (lv === 0 && deptCount(s) >= deptSlots(s)) return fmtL(l('A sede comporta {n} departamentos. Amplie a sede.', 'The HQ fits {n} departments. Upgrade the HQ.'), { n: deptSlots(s) });
  if (s.player.cash < money(s, d.cost[lv])) return l('Caixa insuficiente.', 'Not enough cash.');
  return null;
}

export function buildDept(s: GameState, id: DeptId): L | null {
  const e = deptBlocker(s, id);
  if (e) return e;
  const st = hq6(s);
  const lv = st.depts[id] ?? 0;
  const d = deptById[id];
  const cost = money(s, d.cost[lv]);
  post(s, `dept:${id}:${lv + 1}`, -cost, 'hq', `${d.name.pt} nível ${lv + 1}`);
  addAsset(s, { kind: 'building', name: fmtL(l('{d} (nível {n})', '{d} (level {n})'), { d: d.name, n: lv + 1 }), cost, lifeMonths: 180 });
  st.depts[id] = lv + 1;
  bumpPerks();
  return null;
}

export function closeDept(s: GameState, id: DeptId): void {
  delete hq6(s).depts[id];
  bumpPerks();
}

export function buildingPrice(s: GameState): number {
  return money(s, HQ_LEVELS[s.player.hq].rent * 90);
}

/** Comprar o prédio da matriz: acaba o aluguel (até a próxima mudança de sede). */
export function buyBuilding(s: GameState): L | null {
  const st = hq6(s);
  if (st.ownBuilding) return l('O prédio já é seu.', 'You already own the building.');
  const price = buildingPrice(s);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `building:${s.player.hq}`, -price, 'hq', 'Compra do prédio da sede');
  addAsset(s, { kind: 'building', name: fmtL(l('Prédio: {h}', 'Building: {h}'), { h: HQ_LEVELS[s.player.hq].name }), cost: price, lifeMonths: 600 });
  st.ownBuilding = true;
  s.flags.ownBuildingHq = s.player.hq;
  remember(s, 'hq', fmtL(l('{c} compra o próprio prédio.', '{c} buys its own building.'), { c: s.config.companyName }), { important: true });
  return null;
}

export function setBranchFocus(s: GameState, branchId: string, f: BranchFocus): void {
  hq6(s).branchFocus[branchId] = f;
  bumpPerks();
}

export function hireDirector(s: GameState, branchId: string): L | null {
  const st = hq6(s);
  if (st.directors[branchId]) { delete st.directors[branchId]; bumpPerks(); return null; }
  if (s.player.cash < money(s, 3000)) return l('Caixa insuficiente.', 'Not enough cash.');
  st.directors[branchId] = true;
  bumpPerks();
  return null;
}

export function directorSalary(s: GameState, branchId: string): number {
  const b = s.branches.find((x) => x.id === branchId);
  return money(s, 1500 + (b?.level ?? 0) * 900);
}

// ---------------------------------------------------------------- perks e custos

registerPerkSource('hq6', (s) => {
  const st = hq6(s);
  const out: PerkEntry[] = [];
  for (const d of DEPTS) {
    const lv = st.depts[d.id] ?? 0;
    if (!lv) continue;
    const v: PerkValues = {};
    for (const [k, x] of Object.entries(d.perLevel)) (v as Record<string, number>)[k] = (x ?? 0) * lv;
    out.push({ label: fmtL(l('{d} (nível {n})', '{d} (level {n})'), { d: d.name, n: lv }), values: v });
  }
  for (const b of s.branches ?? []) {
    const f = st.branchFocus[b.id];
    if (!f) continue;
    const mult = (1 + b.level * 0.5) * (st.directors[b.id] ? 1.5 : 1);
    const label = fmtL(l('Filial {c}: {f}', 'Branch {c}: {f}'), { c: cityById[b.city]?.name ?? l(b.city, b.city), f: BRANCH_FOCUS[f].name });
    if (f === 'scouting') out.push({ label, values: { signals: 0.6 * mult, scoutAccuracy: 0.03 * mult } });
    if (f === 'sales') out.push({ label, values: { chartUnits: 0.03 * mult } });
    if (f === 'promo') out.push({ label, values: { appeal: 0.06 * mult }, act: (s2, a) => s2.branchOf[a.id] === b.id });
    if (f === 'studio') out.push({ label, values: { songQ: 1.5 * mult }, act: (s2, a) => s2.branchOf[a.id] === b.id });
  }
  return out;
});

registerMod('cityDemand', 'hq6-live', (s, value, ctx) => {
  if (!ctx.cityId || ctx.act?.owner !== 'player') return null;
  const st = hq6(s);
  const m = cityById[ctx.cityId]?.market;
  const b = (s.branches ?? []).find((x) => st.branchFocus[x.id] === 'live' && cityById[x.city]?.market === m);
  if (!b) return null;
  return { value: value * (1 + 0.12 * (1 + b.level * 0.5) * (st.directors[b.id] ? 1.5 : 1)), label: l('Filial focada em shows', 'Live-focused branch') };
});

registerSimHook('month', 'hq6', (s) => {
  const st = hq6(s);
  // mudou de sede: o prédio antigo fica para trás
  if (st.ownBuilding && s.flags.ownBuildingHq !== s.player.hq) { st.ownBuilding = false; delete s.flags.ownBuildingHq; }
  let upkeep = 0;
  for (const d of DEPTS) upkeep += (st.depts[d.id] ?? 0) * d.upkeep;
  if (upkeep) post(s, `deptup:${s.year}:${s.month}`, -money(s, upkeep), 'hq', 'Manutenção dos departamentos');
  let dir = 0;
  for (const b of s.branches ?? []) if (st.directors[b.id]) dir += directorSalary(s, b.id);
  for (const id of Object.keys(st.directors)) if (!s.branches.some((b) => b.id === id)) delete st.directors[id];
  if (dir) post(s, `dirs:${s.year}:${s.month}`, -dir, 'salaries', 'Diretores regionais');
});

export function branchLevelName(level: number): L {
  return BRANCH_LEVELS[level]?.name ?? l('?', '?');
}
