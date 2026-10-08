// Funcionários com carreira (Kairosoft): experiência, treinamento pago, promoção, troca de função
// (engenheiro → produtor, olheiro → A&R...), pedidos de aumento pela caixa de entrada e saída para
// um rival — ou para abrir o próprio selo.

import type { Rng } from '../../../core/rng';
import { STAFF_ROLES, staffRoleById } from '../../../data/rules';
import { l, type L } from '../../../data/world';
import { nominal } from '../../../core/money';
import { hqCaps } from '../../branches';
import type { GameState, StaffMember } from '../../types';
import { fmtL, money, nextId, notify, post, remember } from '../../util';
import { P, addMsg, clamp01, type StaffCareer } from './state';
import { gainXp, ownerBonus } from './owner';

export const LEVEL_NAME: L[] = [l('Júnior', 'Junior'), l('Pleno', 'Mid-level'), l('Sênior', 'Senior'), l('Diretor(a)', 'Director')];

/** Trocas de função possíveis (de → para). */
export const ROLE_PATHS: Record<string, string[]> = {
  engineer: ['producer'],
  producer: ['anr'],
  publicist: ['manager', 'sync'],
  booking: ['tour_manager', 'agent'],
  tour_manager: ['booking'],
  analyst: ['anr', 'rights'],
  admin: ['legal', 'rights'],
  manufacturing: ['engineer'],
  designer: ['publicist'],
  manager: ['agent'],
};

export function careerOf(s: GameState, st: StaffMember): StaffCareer {
  const c = P(s).career;
  return (c[st.id] ??= { xp: 0, level: st.skill > 75 ? 2 : st.skill > 55 ? 1 : 0, loyalty: 60 });
}

export function marketSalary(s: GameState, role: string, skill: number): number {
  const def = staffRoleById[role];
  return nominal((def?.salary ?? 2500) * (0.5 + skill / 100), s.year);
}

export function trainCost(s: GameState, st: StaffMember): number {
  return money(s, 900 + st.skill * 18);
}

export function trainStaff(s: GameState, id: string): L | null {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return l('Funcionário inválido.', 'Invalid staff member.');
  const c = careerOf(s, st);
  if (c.trainingUntil && c.trainingUntil > s.week) return l('Já está em treinamento.', 'Already in training.');
  if (st.skill >= 95) return l('Já está no topo.', 'Already at the top.');
  const cost = trainCost(s, st);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `train:${st.id}`, -cost, 'staff_training', `Treinamento ${st.name}`);
  c.trainingUntil = s.week + 4;
  c.loyalty = clamp01(c.loyalty + 6);
  return null;
}

export function promoteReady(s: GameState, st: StaffMember): boolean {
  const c = careerOf(s, st);
  return c.level < 3 && c.xp >= 12 * (c.level + 1) && st.skill >= 40 + c.level * 15;
}

export function promote(s: GameState, id: string): L | null {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return l('Funcionário inválido.', 'Invalid staff member.');
  if (!promoteReady(s, st)) return l('Ainda não tem experiência ou nível para subir.', 'Not enough experience or skill to move up yet.');
  const c = careerOf(s, st);
  c.level += 1;
  c.xp = 0;
  c.loyalty = clamp01(c.loyalty + 20);
  st.salary = Math.round(st.salary * 1.2);
  st.skill = Math.min(99, st.skill + 2);
  c.lastRaise = s.week;
  remember(s, 'staff_promo', fmtL(l('{n} é promovido(a) a {lv}.', '{n} is promoted to {lv}.'), { n: st.name, lv: LEVEL_NAME[c.level] }));
  return null;
}

export function changeRole(s: GameState, id: string, role: string): L | null {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return l('Funcionário inválido.', 'Invalid staff member.');
  if (!(ROLE_PATHS[st.role] ?? []).includes(role)) return l('Essa troca de função não faz sentido.', 'That role change does not make sense.');
  const from = staffRoleById[st.role]?.name ?? l(st.role);
  st.role = role;
  st.skill = Math.max(15, Math.round(st.skill * 0.85));
  st.salary = Math.max(st.salary, marketSalary(s, role, st.skill));
  const c = careerOf(s, st);
  c.loyalty = clamp01(c.loyalty + 10);
  remember(s, 'staff_role', fmtL(l('{n} troca de função: {a} → {b}.', '{n} changes role: {a} → {b}.'), { n: st.name, a: from, b: staffRoleById[role]?.name ?? l(role) }));
  return null;
}

/** Olheiro de campo vira executivo de A&R na equipe da sede. */
export function scoutToAnr(s: GameState, scoutId: string): L | null {
  const sc = s.scouts.find((x) => x.id === scoutId);
  if (!sc) return l('Olheiro inválido.', 'Invalid scout.');
  if (s.player.staff.length >= hqCaps(s).staff) return l('Sede sem vagas para equipe.', 'No staff room at the HQ.');
  s.scouts = s.scouts.filter((x) => x !== sc);
  const st: StaffMember = { id: nextId(s, 'st'), name: sc.name, role: 'anr', skill: Math.round(sc.skill * 0.9), salary: Math.max(sc.salary, marketSalary(s, 'anr', sc.skill * 0.9)), hiredWeek: s.week, trait: 'ambitious' };
  s.player.staff.push(st);
  const c = careerOf(s, st);
  c.loyalty = 75;
  c.xp = 5;
  remember(s, 'staff_role', fmtL(l('O olheiro {n} vira executivo(a) de A&R.', 'Scout {n} becomes an A&R executive.'), { n: sc.name }));
  return null;
}

export function answerRaise(s: GameState, id: string, choice: 'full' | 'half' | 'refuse'): L {
  const st = s.player.staff.find((x) => x.id === id);
  if (!st) return l('Essa pessoa já saiu.', 'That person already left.');
  const c = careerOf(s, st);
  c.raiseAsk = undefined;
  if (choice === 'refuse') {
    c.loyalty = clamp01(c.loyalty - 18);
    return fmtL(l('{n} sai da sala calado(a).', '{n} leaves the room in silence.'), { n: st.name });
  }
  const pct = choice === 'full' ? 0.15 : 0.07;
  st.salary = Math.round(st.salary * (1 + pct));
  c.lastRaise = s.week;
  c.loyalty = clamp01(c.loyalty + (choice === 'full' ? 22 : 6));
  gainXp(s, 'negotiation', 1);
  return fmtL(l('{n}: salário +{p}%.', '{n}: salary +{p}%.'), { n: st.name, p: Math.round(pct * 100) });
}

function leave(s: GameState, r: Rng, st: StaffMember): void {
  s.player.staff = s.player.staff.filter((x) => x !== st);
  delete P(s).career[st.id];
  if (st.skill > 72 && r.chance(0.35)) {
    const id = nextId(s, 'lb');
    const name = `${st.name.split(' ').slice(-1)[0]} Records`;
    s.labels[id] = {
      id, name, family: 'B', city: s.config.homeCity, founded: s.year, focus: [], cash: money(s, 120000 + st.skill * 1500),
      reputation: Math.round(20 + st.skill / 4), roster: [], active: true, aggression: 0.55, strategy: 'niche', territories: [...s.player.territories.slice(0, 1)],
      revenueYear: 0, revenueLastYear: 0, procedural: true, ceo: st.name,
    };
    s.rivalries[id] = 25;
    const text = fmtL(l('{n} deixa {c} e abre o próprio selo: {b}.', '{n} leaves {c} to start their own label: {b}.'), { n: st.name, c: s.config.companyName, b: name });
    remember(s, 'staff_leaves', text, { important: true });
    notify(s, text, 'bad');
    return;
  }
  const rivals = Object.values(s.labels).filter((x) => x.active);
  const lb = rivals.length ? r.pick(rivals) : undefined;
  if (lb) lb.reputation = clamp01(lb.reputation + 2);
  const text = fmtL(l('{n} pede demissão e vai para {b}.', '{n} quits and joins {b}.'), { n: st.name, b: lb?.name ?? l('outro ramo', 'another industry') });
  remember(s, 'staff_leaves', text);
  notify(s, text, 'bad');
}

export function staffMonth(s: GameState, r: Rng): void {
  const mgmt = ownerBonus(s, 'management');
  for (const st of [...s.player.staff]) {
    const c = careerOf(s, st);
    c.xp += 1 + (c.trainingUntil && c.trainingUntil >= s.week ? 2 : 0) + (st.trait === 'workaholic' ? 1 : 0);
    if (c.trainingUntil && c.trainingUntil <= s.week) {
      st.skill = Math.min(99, st.skill + r.int(4, 7));
      c.trainingUntil = undefined;
    }
    const ratio = st.salary / Math.max(1, marketSalary(s, st.role, st.skill));
    const target = 55 + (ratio - 1) * 70 + mgmt * 15 + c.level * 4 + (st.trait === 'loyal' ? 15 : st.trait === 'opportunist' ? -12 : 0);
    c.loyalty = clamp01(c.loyalty + (target - c.loyalty) * 0.12);
    // pedido de aumento
    if (!c.raiseAsk && ratio < 0.92 && (!c.lastRaise || s.week - c.lastRaise > 40) && r.chance(0.18 - mgmt * 0.05)) {
      c.raiseAsk = s.week;
      const pct = Math.max(5, Math.round(15 - ownerBonus(s, 'negotiation') * 5));
      addMsg(s, {
        from: st.name, kind: 'staff', tone: 'info', expires: s.week + 6,
        subject: l('Pedido de aumento', 'Raise request'),
        body: fmtL(l('{n} ({r}) diz que o mercado paga mais e pede {p}% de aumento.', '{n} ({r}) says the market pays more and asks for a {p}% raise.'), { n: st.name, r: staffRoleById[st.role]?.name ?? l(st.role), p: pct }),
        ref: { staff: st.id },
        actions: [{ id: 'full', label: l('Dar o aumento (+15%)', 'Grant it (+15%)') }, { id: 'half', label: l('Meio-termo (+7%)', 'Meet halfway (+7%)') }, { id: 'refuse', label: l('Recusar', 'Refuse') }],
      });
    }
    if (c.raiseAsk && s.week - c.raiseAsk > 8) {
      c.raiseAsk = undefined;
      c.loyalty = clamp01(c.loyalty - 10);
    }
    // saída
    if (c.loyalty < 25 && r.chance(0.12 - mgmt * 0.04)) leave(s, r, st);
  }
  for (const id of Object.keys(P(s).career)) if (!s.player.staff.some((x) => x.id === id)) delete P(s).career[id];
}

export { STAFF_ROLES };
