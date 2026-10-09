// Cadeia de suprimentos e fábricas (Capitalism Lab): matéria-prima por era com choques, fábricas
// próprias com capacidade, fila de prensagem (atraso perde a janela do lançamento) e defeitos.

import { clamp, type Rng } from '../../../core/rng';
import { FORMATS } from '../../../data/rules';
import { cityById, l, type L } from '../../../data/world';
import { registerMod, registerSimHook } from '../../ext4';
import { addAsset } from '../../finance';
import type { GameState, Release } from '../../types';
import { fmtL, money, nextId, notify, post, remember } from '../../util';
import type { Material, Plant } from './state';
import { researchDone } from './research';
import { costFactor, gradeDefect, matTarget, onGradeLaunch } from './supply13';

export const MATERIAL_NAMES: Record<Material, L> = {
  shellac: l('Goma-laca', 'Shellac'),
  vinyl: l('PVC (vinil)', 'PVC (vinyl)'),
  tape: l('Fita magnética', 'Magnetic tape'),
  polycarbonate: l('Policarbonato', 'Polycarbonate'),
  paper: l('Papel e encarte', 'Paper and sleeves'),
};

/** Material dominante na prensagem do ano. */
export function mainMaterial(year: number): Material {
  if (year < 1950) return 'shellac';
  if (year < 1972) return 'vinyl';
  if (year < 1990) return year < 1983 ? 'vinyl' : 'tape';
  if (year < 2014) return 'polycarbonate';
  return 'vinyl';
}

/** Choques históricos e curva por época: ver supply13 (matTarget). */
export function updateMaterials(s: GameState, r: Rng): void {
  const st = s.x4.industry;
  for (const m of Object.keys(st.matPrice) as Material[]) {
    const target = matTarget(m, s.year) * (1 + r.normal(0, 0.03));
    st.matPrice[m] = clamp(st.matPrice[m] + (target - st.matPrice[m]) * 0.35, 0.5, 4);
  }
}

export const PLANT_LEVELS = [
  { name: l('Prensa pequena', 'Small press shop'), capacity: 4000, cost: 60000, upkeep: 2500 },
  { name: l('Fábrica regional', 'Regional plant'), capacity: 15000, cost: 220000, upkeep: 7000 },
  { name: l('Complexo industrial', 'Industrial complex'), capacity: 45000, cost: 700000, upkeep: 18000 },
];

/** Capacidade semanal disponível para os seus pedidos. */
export function pressCapacity(s: GameState): { own: number; third: number } {
  const st = s.x4.industry;
  const own = st.plants.reduce((t, p) => t + p.capacity, 0) * (researchDone(s, 'lean_press') ? 1.25 : 1);
  // terceiros: encolhem em crises de matéria-prima e no aperto do renascimento do vinil
  const squeeze = st.matPrice[mainMaterial(s.year)];
  const pending = st.orders.filter((o) => !o.own).reduce((t, o) => t + o.units, 0);
  const third = Math.max(800, Math.round((9000 / squeeze) - pending * 0.25));
  return { own: Math.round(own), third };
}

export function buildPlant(s: GameState, cityId: string): L | null {
  const st = s.x4.industry;
  if (!cityById[cityId]) return l('Cidade inválida.', 'Invalid city.');
  if (st.plants.length >= 3) return l('No máximo 3 fábricas.', 'At most 3 plants.');
  const cost = money(s, PLANT_LEVELS[0].cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `plant:${cityId}:${s.week}`, -cost, 'plant', `Fábrica em ${cityById[cityId].name.pt}`);
  const p: Plant = { id: nextId(s, 'pl'), city: cityId, level: 1, opened: s.week, capacity: PLANT_LEVELS[0].capacity, contractUnits: 0 };
  st.plants.push(p);
  addAsset(s, { kind: 'plant', name: fmtL(l('Fábrica {c}', 'Plant {c}'), { c: cityById[cityId].name }), cost, lifeMonths: 240, refId: p.id });
  remember(s, 'plant', fmtL(l('A empresa abre a própria fábrica de discos em {c}.', 'The company opens its own pressing plant in {c}.'), { c: cityById[cityId].name }), { important: true });
  return null;
}

export function upgradePlant(s: GameState, id: string): L | null {
  const p = s.x4.industry.plants.find((x) => x.id === id);
  if (!p) return l('Fábrica inválida.', 'Invalid plant.');
  const next = PLANT_LEVELS[p.level];
  if (!next) return l('Fábrica no nível máximo.', 'Plant at max level.');
  const cost = money(s, next.cost);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `plantup:${p.id}:${p.level + 1}`, -cost, 'plant', 'Ampliação da fábrica');
  p.level += 1;
  p.capacity = next.capacity;
  addAsset(s, { kind: 'plant', name: next.name, cost, lifeMonths: 240, refId: p.id });
  return null;
}

/** No lançamento: o que a fila não consegue prensar na primeira semana chega depois. */
function onLaunch(s: GameState, r: Rng, rel: Release): void {
  if (rel.owner !== 'player' || !rel.pressed || rel.stock === Infinity) return;
  if (!rel.formats.some((f) => FORMATS.find((x) => x.id === f)?.physical)) return;
  const st = s.x4.industry;
  const cap = pressCapacity(s);
  const weekly = cap.own + cap.third;
  const firstWeek = Math.min(rel.pressed, Math.round(weekly * 1.5));
  const rest = rel.pressed - firstWeek;
  // defeitos: fábrica própria e pesquisa reduzem
  const ownShare = cap.own / Math.max(1, weekly);
  const defectRate = clamp(0.03 - ownShare * 0.015 - (researchDone(s, 'quality_control') ? 0.012 : 0) + gradeDefect(s, rel.formats) + r.normal(0, 0.01), 0, 0.1);
  const defects = Math.round(rel.pressed * defectRate);
  onGradeLaunch(s, rel, defects);
  st.defectsYear += defects;
  rel.stock = Math.max(0, firstWeek - defects);
  if (defects > 2000) notify(s, fmtL(l('{n} cópias defeituosas de "{t}" voltaram da fábrica.', '{n} defective copies of "{t}" came back from the plant.'), { n: defects, t: rel.title }), 'bad');
  if (rest > 0) {
    let left = rest;
    let wk = s.week + 1;
    while (left > 0 && wk < s.week + 26) {
      const units = Math.min(left, weekly);
      st.orders.push({ releaseId: rel.id, units, ready: wk, own: cap.own > 0 });
      left -= units;
      wk += 1;
    }
    const delay = wk - s.week - 1;
    if (delay >= 2) {
      notify(s, fmtL(l('Fila de prensagem: "{t}" só fica completo em {d} semanas.', 'Pressing queue: "{t}" will only be complete in {d} weeks.'), { t: rel.title, d: delay }), 'event');
      st.log.unshift({ week: s.week, text: fmtL(l('"{t}": atraso de {d} semanas na prensagem.', '"{t}": {d}-week pressing delay.'), { t: rel.title, d: delay }) });
    }
  }
}

function onWeek(s: GameState): void {
  const st = s.x4.industry;
  const still = [];
  for (const o of st.orders) {
    if (o.ready <= s.week) {
      const rel = s.releases[o.releaseId];
      if (rel && rel.stock !== Infinity) rel.stock += o.units;
    } else still.push(o);
  }
  st.orders = still;
  if (st.log.length > 30) st.log.length = 30;
}

/** Fábricas próprias: manutenção e prensagem para terceiros (renda) com a capacidade ociosa. */
function plantsMonth(s: GameState, r: Rng): void {
  const st = s.x4.industry;
  for (const p of st.plants) {
    const lv = PLANT_LEVELS[p.level - 1];
    post(s, `plantupkeep:${p.id}:${s.year}:${s.month}`, -money(s, lv.upkeep), 'plant', 'Manutenção da fábrica');
    const idle = p.capacity * 4 * r.float(0.25, 0.6);
    p.contractUnits = Math.round(idle);
    const unitMargin = money(s, 0.35);
    post(s, `plantjobs:${p.id}:${s.year}:${s.month}`, Math.round(idle * unitMargin), 'plant', 'Prensagem para terceiros');
  }
}

registerMod('pressingCost', 'industry:materials', (s, v, c) => {
  const st = s.x4.industry;
  const mat = c.formats?.length ? costFactor(s, c.formats) : st.matPrice[mainMaterial(s.year)];
  const own = st.plants.reduce((t, p) => t + p.level, 0);
  const discount = Math.min(0.35, own * 0.08) + (researchDone(s, 'lean_press') ? 0.05 : 0);
  const value = v * mat * (1 - discount);
  return { value, label: l('Matéria-prima e fábricas', 'Raw materials and plants') };
});

registerSimHook('launch', 'industry:press', (s, r, a) => { if (a.release) onLaunch(s, r, a.release); });
registerSimHook('week', 'industry:orders', (s) => onWeek(s));
registerSimHook('month', 'industry:supply', (s, r) => { updateMaterials(s, r); plantsMonth(s, r); });
registerSimHook('year', 'industry:defects', (s) => { s.x4.industry.defectsYear = 0; });

export function pressingQueue(s: GameState) {
  return s.x4.industry.orders;
}

