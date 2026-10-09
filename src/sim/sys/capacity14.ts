// Rodada 14 — capacidade mensal real: cada um tem o seu tempo.
// • Você: o tempo livre (bolinhas) só paga o que é seu de verdade: reuniões além da cota da mesa,
//   scouting em pessoa, vida pessoal, mentorias.
// • Cada ato: a agenda gasta as horas dos membros (100% por pessoa/mês, já existente em capacity.ts);
//   não tira nada do seu tempo. Sobrecarga (turnê + agenda + outro projeto) vira fadiga e esgotamento.
// • Equipe: cada função tem uma carga de trabalho vinda do estado do selo; acima do limite por meses
//   seguidos, alguém se esgota (perde rendimento ou pede as contas).
// • Rivais: o A&R de cada selo fecha um número limitado de contratos por mês (gate14.ts).

import { Rng } from '../../core/rng';
import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { STAFF_ROLES } from '../../data/rules';
import { activeMembers, monthIndex, personLoad } from '../capacity';
import { registerSimHook } from '../ext4';
import { scoutActionsPerMonth } from '../scouting';
import type { Act, GameState, StaffMember } from '../types';
import { fmtL, notify, playerActs } from '../util';
import { bindSpend, cap14, meetingCap } from './gate14';
import { energyLeft, maxEnergy, playerAct, spendEnergy } from './life';
import { overCapacity, teamCapacity } from './pacing8';

export { cap14, meetingCap, rivalSignCap, rivalSignsLeft } from './gate14';

bindSpend((s, n) => spendEnergy(s, n));

const logC = (s: GameState, t: L, tone: 'good' | 'bad' | 'info' = 'info') => {
  const c = cap14(s);
  c.log.unshift({ w: s.week, t, tone });
  if (c.log.length > 30) c.log.length = 30;
};

// ---------------------------------------------------------------- você

export interface PlayerTime { left: number; max: number; uses: { label: L; n: number }[] }

export function playerTime(s: GameState): PlayerTime {
  const c = cap14(s);
  const max = maxEnergy(s), left = energyLeft(s);
  const used = max - left;
  const uses: { label: L; n: number }[] = [];
  if (playerAct(s)) uses.push({ label: l('Ensaios da sua banda (fixo)', 'Your band rehearsals (fixed)'), n: 1 });
  if (c.meetDots) uses.push({ label: l('Reuniões de oferta em pessoa', 'Offer meetings in person'), n: c.meetDots });
  if (c.scoutDots) uses.push({ label: l('Scouting em pessoa', 'Scouting in person'), n: c.scoutDots });
  const other = used - c.meetDots - c.scoutDots;
  if (other > 0) uses.push({ label: l('Vida pessoal, mentorias e decisões', 'Personal life, mentoring and decisions'), n: other });
  return { left, max, uses };
}

/** A equipe de scouting esgotou as ações do mês: você vai pessoalmente (1 de tempo livre = +1 ação). */
export function scoutInPerson(s: GameState): L | null {
  if (s.scoutActionsUsed < scoutActionsPerMonth(s)) return l('A equipe ainda tem ações de scouting este mês: use as delas primeiro.', 'The team still has scouting actions this month: use theirs first.');
  const e = spendEnergy(s, 1);
  if (e) return e;
  s.scoutActionsUsed -= 1;
  cap14(s).scoutDots += 1;
  logC(s, l('Você pegou a estrada para ver artistas pessoalmente (+1 ação de scouting, −1 de tempo livre).', 'You hit the road to see acts yourself (+1 scouting action, −1 free time).'));
  return null;
}

// ---------------------------------------------------------------- atos (horas dos membros)

export interface MemberLoad { id: string; name: string; load: number; parts: { label: L; load: number }[] }
export interface ActCap { members: MemberLoad[]; free: number; max: number; avg: number; busy: MemberLoad[] }

export function actCapacity(s: GameState, act: Act, idx = monthIndex(s)): ActCap {
  const members = activeMembers(s, act).map((id) => {
    const p = s.persons[id];
    const pl = personLoad(s, id, idx);
    return { id, name: p?.name ?? id, load: pl.total, parts: pl.parts };
  });
  const max = members.reduce((m, x) => Math.max(m, x.load), 0);
  const avg = members.length ? Math.round(members.reduce((t, x) => t + x.load, 0) / members.length) : 0;
  return { members, free: Math.max(0, 100 - max), max, avg, busy: members.filter((x) => x.load >= 100) };
}

/** Por que o ato não aceita mais nada: quem está ocupado e com o quê. */
export function busyWhy(s: GameState, act: Act, need = 0): L | null {
  const c = actCapacity(s, act);
  if (c.free >= need && !c.busy.length) return null;
  const who = c.members.filter((m) => 100 - m.load < Math.max(1, need)).sort((a, b) => b.load - a.load)[0];
  if (!who) return null;
  const parts = who.parts.map((p) => `${p.label.pt} ${p.load}%`).join(', ');
  const partsEn = who.parts.map((p) => `${p.label.en} ${p.load}%`).join(', ');
  return { pt: `${who.name} está com ${who.load}% do mês ocupado (${parts || 'sem detalhes'}). As ações da banda gastam o tempo dos membros, não o seu.`, en: `${who.name} has ${who.load}% of the month booked (${partsEn || 'no details'}). Band actions spend the members' time, not yours.` };
}

// ---------------------------------------------------------------- equipe (horas por função)

interface RoleWork { unit: L; per: number; demand: (s: GameState) => number }

const mine = (s: GameState): Act[] => playerActs(s).map((id) => s.acts[id]).filter((a): a is Act => !!a);
const recentReleases = (s: GameState): number => mine(s).reduce((t, a) => t + a.releases.filter((rid) => { const r = s.releases[rid]; return !!r && s.week - r.week >= 0 && s.week - r.week < 5; }).length, 0)
  + s.pendingReleases.filter((p) => s.acts[p.actId]?.owner === 'player').length;
const liveTours = (s: GameState): number => s.tours.filter((t) => t.status !== 'done' && t.status !== 'cancelled' && s.acts[t.actId]?.owner === 'player').length;
const delegatedCount = (s: GameState): number => mine(s).filter((a) => s.delegated[a.id] !== false && !a.playerBand).length;

/** Rodada 16: ordens permanentes ativas delegadas a uma função (estado em x4.deleg16, sem importar o sistema). */
const orders16 = (s: GameState, role: string): number => ((s.x4 as unknown as { deleg16?: { orders: { on: boolean; staffId: string }[] } }).deleg16?.orders ?? []).filter((o) => o.on && s.player.staff.some((x) => x.id === o.staffId && x.role === role)).length;

const WORK: Record<string, RoleWork> = {
  manager: { unit: l('carreiras delegadas', 'delegated careers'), per: 3, demand: (s) => delegatedCount(s) },
  admin: { unit: l('carreiras delegadas', 'delegated careers'), per: 2, demand: (s) => delegatedCount(s) },
  anr: { unit: l('ações de scouting', 'scouting actions'), per: 1, demand: (s) => Math.max(0, s.scoutActionsUsed - 3) },
  producer: { unit: l('sessões de estúdio', 'studio sessions'), per: 2, demand: (s) => s.sessions.length },
  engineer: { unit: l('sessões de estúdio', 'studio sessions'), per: 2, demand: (s) => s.sessions.length },
  publicist: { unit: l('lançamentos em campanha', 'releases in campaign'), per: 2, demand: recentReleases },
  designer: { unit: l('lançamentos em campanha', 'releases in campaign'), per: 3, demand: recentReleases },
  manufacturing: { unit: l('prensagens na fila', 'pressings queued'), per: 3, demand: (s) => s.pendingReleases.filter((p) => s.acts[p.actId]?.owner === 'player').length },
  booking: { unit: l('turnês ativas', 'active tours'), per: 2, demand: liveTours },
  tour_manager: { unit: l('turnês ativas', 'active tours'), per: 2, demand: liveTours },
  agent: { unit: l('turnês ativas', 'active tours'), per: 3, demand: liveTours },
  legal: { unit: l('carreiras sob contrato', 'careers under contract'), per: 8, demand: (s) => playerActs(s).length },
  rights: { unit: l('carreiras sob contrato', 'careers under contract'), per: 10, demand: (s) => playerActs(s).length },
  analyst: { unit: l('carreiras acompanhadas', 'careers tracked'), per: 10, demand: (s) => playerActs(s).length },
  booking_agent: { unit: l('ordens permanentes', 'standing orders'), per: 3, demand: (s) => orders16(s, 'booking_agent') },
  promoter: { unit: l('ordens permanentes', 'standing orders'), per: 3, demand: (s) => orders16(s, 'promoter') },
};

export interface RoleLoad { role: string; name: L; staff: StaffMember[]; demand: number; supply: number; load: number; unit: L; strain: number }

/** Carga por função. Empresário e Administração dividem as carreiras delegadas com o escritório (você + sede). */
export function roleLoads(s: GameState): RoleLoad[] {
  const c = cap14(s);
  const out: RoleLoad[] = [];
  // carreiras delegadas: empresários primeiro, depois administração, depois o escritório (você + sede);
  // o que sobra pesa em quem estiver por último na fila (sobrecarga)
  const nm = s.player.staff.filter((x) => x.role === 'manager').length, na = s.player.staff.filter((x) => x.role === 'admin').length;
  const office = Math.max(0, teamCapacity(s) - nm * 3 - na * 2);
  const del = delegatedCount(s);
  const dm = Math.min(del, nm * 3), da = Math.min(del - dm, na * 2);
  const overflow = Math.max(0, del - dm - da - office);
  const careerDemand: Record<string, number> = { manager: dm + (na ? 0 : overflow), admin: da + overflow };
  for (const r of STAFF_ROLES) {
    const w = WORK[r.id];
    const staff = s.player.staff.filter((x) => x.role === r.id);
    if (!w || !staff.length) continue;
    const supply = staff.length * w.per;
    const demand = r.id in careerDemand ? careerDemand[r.id] : w.demand(s);
    out.push({ role: r.id, name: r.name, staff, demand, supply, load: Math.round((demand / Math.max(1, supply)) * 100), unit: w.unit, strain: c.strain[r.id] ?? 0 });
  }
  return out;
}

export interface StaffRow { m: StaffMember; load: number; task: L }
export function staffRows(s: GameState): StaffRow[] {
  const out: StaffRow[] = [];
  for (const r of roleLoads(s)) for (const m of r.staff) out.push({ m, load: r.load, task: fmtL(l('{d} {u} para {n} pessoa(s) (até {p} cada)', '{d} {u} for {n} person(s) (up to {p} each)'), { d: r.demand, u: r.unit, n: r.staff.length, p: WORK[r.role].per }) });
  return out;
}

/** Resumo da mesa do mês: quem tem tempo, quem está no limite. */
export interface DeskLine { label: L; used: number; max: number; why?: L; tone?: 'bad' | 'warn' | '' }
export function deskLines(s: GameState): DeskLine[] {
  const pt = playerTime(s);
  const c = cap14(s);
  const lines: DeskLine[] = [
    { label: l('Seu tempo livre', 'Your free time'), used: pt.max - pt.left, max: pt.max, why: l('Só o que é seu: vida pessoal, mentorias, reuniões e scouting em pessoa.', 'Only what is yours: personal life, mentoring, in-person meetings and scouting.') },
    { label: l('Reuniões de oferta (equipe)', 'Offer meetings (team)'), used: Math.min(c.meet, meetingCap(s)), max: meetingCap(s), why: l('Acima disso, cada oferta tira 1 do seu tempo livre. Administração, Jurídico e Empresário ampliam.', 'Beyond this, each offer takes 1 of your free time. Administration, Legal and Managers add slots.') },
    { label: l('Ações de scouting', 'Scouting actions'), used: s.scoutActionsUsed, max: scoutActionsPerMonth(s), why: l('A&R e olheiros ampliam; esgotou, dá para ir em pessoa (1 de tempo livre).', 'A&R and scouts add more; when out, you can go in person (1 free time).') },
  ];
  const del = delegatedCount(s), cap = teamCapacity(s);
  const lost = overCapacity(s).size;
  lines.push({ label: l('Carreiras acompanhadas pela equipe', 'Careers followed by the team'), used: del, max: cap, tone: lost ? 'bad' : '', why: lost ? fmtL(l('{n} carreira(s) além da capacidade ficam no mínimo (agenda leve, sem atenção).', '{n} career(s) beyond capacity drop to minimum (light agenda, no attention).'), { n: lost }) : l('Cada ato usa as horas dos próprios membros; a equipe só coordena.', 'Each act uses its own members\' hours; the team only coordinates.') });
  return lines;
}

/** Atos do jogador com alguém acima de 100% no mês. */
export function overbookedActs(s: GameState): { act: Act; cap: ActCap }[] {
  return mine(s).map((act) => ({ act, cap: actCapacity(s, act) })).filter((x) => x.cap.max > 100);
}

// ---------------------------------------------------------------- consequências no fim do mês

const rngM = (s: GameState) => Rng.fromSeed(`${s.config.seed}|cap14|${s.year}|${s.month}`);

registerSimHook('month', 'cap14', (s) => {
  const r = rngM(s);
  const c = cap14(s);
  // membros sobrecarregados: cansaço, estresse e, persistindo, esgotamento
  const idx = monthIndex(s);
  const seen = new Set<string>();
  for (const act of mine(s)) {
    const hit: string[] = [];
    for (const id of activeMembers(s, act)) {
      if (seen.has(id)) continue;
      seen.add(id);
      const p = s.persons[id];
      if (!p) continue;
      const load = personLoad(s, id, idx).total;
      if (load <= 100) { c.over[id] = 0; continue; }
      const ex = load - 100;
      p.fatigue = clamp(p.fatigue + Math.min(20, ex * 0.25), 0, 100);
      p.stress = clamp(p.stress + Math.min(15, ex * 0.2), 0, 100);
      c.over[id] = (c.over[id] ?? 0) + 1;
      hit.push(`${p.name} ${load}%`);
      if (c.over[id] >= 2 && load >= 125 && p.health === 'ok' && r.chance(0.3)) {
        p.health = 'burnout';
        const t = fmtL(l('{p} ({a}) teve esgotamento: {n} meses seguidos acima de 100% da agenda ({l}%).', '{p} ({a}) burned out: {n} months in a row above 100% booked ({l}%).'), { p: p.name, a: act.name, n: c.over[id], l: load });
        notify(s, t, 'bad');
        logC(s, t, 'bad');
      }
    }
    if (hit.length) {
      const t = fmtL(l('{a} passou do limite este mês ({w}): mais cansaço e estresse. Alivie a agenda, a turnê ou o projeto paralelo.', '{a} went over the limit this month ({w}): more fatigue and stress. Lighten the agenda, tour or side project.'), { a: act.name, w: hit.join(', ') });
      notify(s, t, 'bad');
      logC(s, t, 'bad');
    }
  }
  // equipe: função acima do limite por meses seguidos
  for (const rl of roleLoads(s)) {
    if (rl.load <= 115) { c.strain[rl.role] = Math.max(0, (c.strain[rl.role] ?? 0) - 1); continue; }
    const k = (c.strain[rl.role] = (c.strain[rl.role] ?? 0) + 1);
    if (k === 2) {
      const t = fmtL(l('{r} sobrecarregada: {d} {u} para {n} pessoa(s). Contrate ou reduza, ou alguém vai se esgotar.', '{r} overloaded: {d} {u} for {n} person(s). Hire or cut back, or someone will burn out.'), { r: rl.name, d: rl.demand, u: rl.unit, n: rl.staff.length });
      notify(s, t, 'bad');
      logC(s, t, 'bad');
    } else if (k >= 3 && r.chance(0.4)) {
      const m = rl.staff.slice().sort((a, b) => a.skill - b.skill || a.id.localeCompare(b.id))[0];
      let t: L;
      if (m.skill < 45) {
        s.player.staff = s.player.staff.filter((x) => x !== m);
        t = fmtL(l('{n} ({r}) pediu as contas: {k} meses carregando {l}% do trabalho.', '{n} ({r}) quit: {k} months carrying {l}% of the workload.'), { n: m.name, r: rl.name, k, l: rl.load });
      } else {
        m.skill = Math.max(1, m.skill - 4);
        t = fmtL(l('{n} ({r}) está esgotado(a) e rende menos (−4 de habilidade): {l}% da carga há {k} meses.', '{n} ({r}) is burned out and performs worse (−4 skill): {l}% load for {k} months.'), { n: m.name, r: rl.name, k, l: rl.load });
      }
      c.strain[rl.role] = 1;
      notify(s, t, 'bad');
      logC(s, t, 'bad');
    }
  }
});
