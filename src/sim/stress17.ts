// Rodada 17 — ESTRESSE ÚNICO (Dwarf Fortress + CK3). Curto prazo = Person.stress (o mesmo campo que agenda,
// turnês, vícios, soul9 e eventos já movem); longo prazo = desgaste acumulado em s.x4.stress17 (sobe com meses
// de estresse alto, cai devagar). Só a combinação quebra: curto > 65 E longo > 45. A quebra dispara mecânicas
// que já existem (colapso/vício/saúde/escândalo — ver sys/bridge17.ts). Uma leitura para a interface: stressOf.
//
//   addStress(s, pid, +12, l('Turnê sem folga', 'Tour with no days off'))   // registra o porquê
//   stressOf(s, pid) → { short, long, vuln, level, risk, why[] }

import { clamp } from '../core/rng';
import { l, type L } from '../data/world';
import { registerExt4 } from './ext4';
import { facts17 } from './facts17';
import type { Act, GameState, Person } from './types';

export interface Stress17State {
  /** desgaste de longo prazo por pessoa (0..100) */
  l: Record<string, number>;
  /** últimos motivos: [semana, delta, texto] */
  why: Record<string, [number, number, L][]>;
  /** ano da última quebra */
  lb: Record<string, number>;
}
declare module './ext4' { interface Ext4 { stress17: Stress17State } }
const fresh = (): Stress17State => ({ l: {}, why: {}, lb: {} });
registerExt4('stress17', fresh);
export function stress17(s: GameState): Stress17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.stress17 ??= fresh()) as Stress17State;
  st.l ??= {}; st.why ??= {}; st.lb ??= {};
  return st;
}

export type StressLevel = 'ok' | 'tense' | 'strained' | 'breaking';
export const STRESS_LEVEL: Record<StressLevel, L> = {
  ok: l('Tranquilo', 'Calm'), tense: l('Tenso', 'Tense'), strained: l('Sobrecarregado', 'Strained'), breaking: l('À beira de quebrar', 'Near breaking point'),
};
export interface StressRead { short: number; long: number; vuln: number; level: StressLevel; risk: number; why: L[] }

/** Vulnerabilidade 0..1 (ansiedade/melancolia sobem; coragem/confiança/resiliência descem). Substituível por
 *  um provedor com as facetas da persona (sys/bridge17 registra o de persona13). */
let vulnFn: (s: GameState, p: Person) => number = (_s, p) => {
  let v = 0.5 - ((p.persona?.resilience ?? 50) - 50) / 120;
  if (p.traits.includes('anxious')) v += 0.12;
  if (p.traits.includes('resilient')) v -= 0.12;
  return clamp(v, 0.05, 0.95);
};
export function setStressVuln(fn: (s: GameState, p: Person) => number): void { vulnFn = fn; }
export const vulnOf = (s: GameState, p: Person): number => clamp(vulnFn(s, p), 0.05, 0.95);

/** Limiares da quebra: curto acima de 65 E longo acima de 45 (os dois juntos). */
export const BREAK_SHORT = 65, BREAK_LONG = 45;
/** Chance mensal de quebra (0..1) — mesma fórmula da simulação, mostrada na interface. */
export function breakChance17(short: number, long: number, vuln: number): number {
  if (short <= BREAK_SHORT || long <= BREAK_LONG) return 0;
  return clamp((0.04 + (short - BREAK_SHORT) / 250 + (long - BREAK_LONG) / 300) * (0.7 + vuln * 0.6), 0, 0.35);
}

const HEALTH_ADD: Record<Person['health'], number> = { ok: 0, voice_strain: 6, burnout: 15, addiction: 10, recovering: 4, ill: 10 };
/** Estresse de curto prazo COMPOSTO: Person.stress (o que eventos/agenda/vícios já movem) + cansaço acima de 45,
 *  saúde, moral baixa, ressentimento e o corpo (voz/lesão de people/health). */
export function shortOf(s: GameState, p: Person): { v: number; parts: L[]; np: [L, number][] } {
  const parts: L[] = [];
  let v = p.stress;
  const fat = Math.max(0, p.fatigue - 45) * 0.6;
  if (fat >= 3) parts.push(l('cansaço', 'fatigue'));
  const hl = HEALTH_ADD[p.health] ?? 0;
  if (hl) parts.push(l('saúde', 'health'));
  const mor = Math.max(0, 45 - p.morale) * 0.5;
  if (mor >= 3) parts.push(l('moral baixa', 'low morale'));
  const res = p.resentment * 0.15;
  if (res >= 4) parts.push(l('ressentimento', 'resentment'));
  const h = (s.x4 as unknown as { people?: { health?: Record<string, { voice: number; injuryWeeks: number }> } }).people?.health?.[p.id];
  const body = h ? Math.max(0, h.voice - 70) * 0.3 + (h.injuryWeeks > 0 ? 5 : 0) : 0;
  if (body >= 3) parts.push(l('corpo (voz/lesão)', 'body (voice/injury)'));
  const fx = factPressure(s, p.id);
  if (fx.v >= 3) parts.push(fx.why);
  const car = careerPressure(s, p);
  if (car.v >= 3) parts.push(car.why);
  v += fat + hl + mor + res + body + fx.v + car.v;
  // r18 (explain18): a mesma soma com números
  const np: [L, number][] = [[l('Tensão acumulada (agenda, eventos, vícios)', 'Built-up tension (schedule, events, vices)'), p.stress], [l('cansaço', 'fatigue'), fat], [l('saúde', 'health'), hl], [l('moral baixa', 'low morale'), mor], [l('ressentimento', 'resentment'), res], [l('corpo (voz/lesão)', 'body (voice/injury)'), body], [fx.why, fx.v], [car.why, car.v]];
  return { v: Math.round(clamp(v, 0, 100)), parts, np: np.filter((x) => x[1] >= 0.5) };
}

/** Atos de cada pessoa (cache por semana; a interface e os mods chamam muito). */
const AOP = new WeakMap<GameState, { k: string; m: Map<string, Act[]> }>();
function actsOfP(s: GameState, pid: string): Act[] {
  const k = `${s.week}|${s.clock?.dayInMonth ?? 0}`;
  let c = AOP.get(s);
  if (!c || c.k !== k) {
    const m = new Map<string, Act[]>();
    for (const a of Object.values(s.acts)) if (a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus') for (const id of a.members) { const l0 = m.get(id); if (l0) l0.push(a); else m.set(id, [a]); }
    c = { k, m };
    AOP.set(s, c);
  }
  return c.m.get(pid) ?? [];
}
/** Fatos ruins recentes sobre a pessoa ou o ato dela (escândalo, morte, separação…): pesam por 3 meses. */
const FXC = new WeakMap<GameState, { w: number; n: number; m: Map<string, { v: number; why: L }> }>();
function factPressure(s: GameState, pid: string): { v: number; why: L } {
  const fs = facts17(s);
  let c = FXC.get(s);
  if (!c || c.w !== s.week || c.n !== fs.seq) { c = { w: s.week, n: fs.seq, m: new Map() }; FXC.set(s, c); }
  const hit = c.m.get(pid);
  if (hit) return hit;
  const ids = new Set([pid, ...actsOfP(s, pid).map((a) => a.id)]);
  let v = 0, top = 0, why: L = l('fatos ruins recentes', 'recent bad news');
  const f = fs.f;
  for (let i = f.length - 1; i >= 0; i--) {
    const x = f[i];
    if (s.week - x.w > 13) break;
    if (!x.tags.includes('bad') || !x.actors.some((a) => ids.has(a))) continue;
    const w = x.severity / 5 * (1 - (s.week - x.w) / 16);
    v += w;
    if (w > top) { top = w; why = x.text; }
  }
  const out = { v: Math.min(30, v), why };
  c.m.set(pid, out);
  return out;
}
/** Pressão da carreira: embalo em queda, holofote de estrela, estrada. */
function careerPressure(s: GameState, p: Person): { v: number; why: L } {
  let v = 0, why = l('pressão da carreira', 'career pressure');
  for (const a of actsOfP(s, p.id)) {
    if (a.status !== 'active' && a.status !== 'emerging') continue;
    if (a.momentum < 20 && a.fame >= 15) { v += 8; why = l('carreira em baixa', 'career slump'); }
    if (a.fame >= 75) { v += 6; why = l('holofote de estrela', 'star spotlight'); }
    if (s.tours.some((t) => t.actId === a.id && t.status === 'running')) { v += 6; why = l('na estrada', 'on the road'); }
    break;
  }
  return { v, why };
}

export function stressOf(s: GameState, pid: string): StressRead {
  const p = s.persons[pid];
  const st = stress17(s);
  if (!p) return { short: 0, long: 0, vuln: 0.5, level: 'ok', risk: 0, why: [] };
  const so = shortOf(s, p);
  const short = so.v, long = Math.round(st.l[pid] ?? 0), vuln = vulnOf(s, p);
  const level: StressLevel = short > BREAK_SHORT && long > BREAK_LONG ? 'breaking' : short > 55 || long > 35 ? 'strained' : short > 35 ? 'tense' : 'ok';
  const why = [...(st.why[pid] ?? []).filter((x) => s.week - x[0] < 26).map((x) => x[2]), ...so.parts];
  return { short, long, vuln, level, risk: st.lb[pid] === s.year ? 0 : breakChance17(short, long, vuln), why };
}

/** Soma (ou alivia, com d < 0) estresse de curto prazo e guarda o motivo para a interface. */
export function addStress(s: GameState, pid: string, d: number, why?: L): void {
  const p = s.persons[pid];
  if (!p?.alive || !d) return;
  p.stress = clamp(p.stress + d, 0, 100);
  if (why && Math.abs(d) >= 3) {
    const w = (stress17(s).why[pid] ??= []);
    w.unshift([s.week, Math.round(d), why]);
    if (w.length > 4) w.length = 4;
  }
}
/** Alivia o desgaste de longo prazo (terapia, férias, família). */
export function relieveLong(s: GameState, pid: string, d: number): void {
  const st = stress17(s);
  st.l[pid] = clamp((st.l[pid] ?? 0) - d, 0, 100);
}

/** Passo mensal do desgaste longo (chamado por sys/bridge17). Retorna true se a pessoa está em zona de quebra. */
export function stressMonthStep(s: GameState, p: Person): boolean {
  const st = stress17(s);
  const v = vulnOf(s, p);
  const cur = st.l[p.id] ?? 0;
  const sh = shortOf(s, p).v;
  const nx = sh > 40 ? cur + (sh - 40) * 0.1 * (0.7 + v * 0.6) : sh < 30 ? cur - 1.5 * (1.3 - v * 0.6) : cur - 0.3;
  if (nx <= 0.5) delete st.l[p.id];
  else st.l[p.id] = Math.round(clamp(nx, 0, 100) * 10) / 10;
  return sh > BREAK_SHORT && (st.l[p.id] ?? 0) > BREAK_LONG;
}
