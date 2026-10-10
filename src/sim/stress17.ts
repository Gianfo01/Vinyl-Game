// Rodada 17 — ESTRESSE ÚNICO (Dwarf Fortress + CK3). Curto prazo = Person.stress (o mesmo campo que agenda,
// turnês, vícios, soul9 e eventos já movem); longo prazo = desgaste acumulado em s.x4.stress17 (sobe com meses
// de estresse alto, cai devagar). Só a combinação quebra: curto > 70 E longo > 50. A quebra dispara mecânicas
// que já existem (colapso/vício/saúde/escândalo — ver sys/bridge17.ts). Uma leitura para a interface: stressOf.
//
//   addStress(s, pid, +12, l('Turnê sem folga', 'Tour with no days off'))   // registra o porquê
//   stressOf(s, pid) → { short, long, vuln, level, risk, why[] }

import { clamp } from '../core/rng';
import { l, type L } from '../data/world';
import { registerExt4 } from './ext4';
import type { GameState, Person } from './types';

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

/** Chance mensal de quebra (0..1) — mesma fórmula da simulação, mostrada na interface. */
export function breakChance17(short: number, long: number, vuln: number): number {
  if (short <= 70 || long <= 50) return 0;
  return clamp((0.04 + (short - 70) / 250 + (long - 50) / 300) * (0.7 + vuln * 0.6), 0, 0.35);
}

export function stressOf(s: GameState, pid: string): StressRead {
  const p = s.persons[pid];
  const st = stress17(s);
  if (!p) return { short: 0, long: 0, vuln: 0.5, level: 'ok', risk: 0, why: [] };
  const short = Math.round(p.stress), long = Math.round(st.l[pid] ?? 0), vuln = vulnOf(s, p);
  const level: StressLevel = short > 70 && long > 50 ? 'breaking' : short > 60 || long > 45 ? 'strained' : short > 40 ? 'tense' : 'ok';
  const why = (st.why[pid] ?? []).filter((x) => s.week - x[0] < 26).map((x) => x[2]);
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
  const nx = p.stress > 55 ? cur + (p.stress - 55) * 0.08 * (0.7 + v * 0.6) : cur - 1.2 * (1.3 - v * 0.6);
  if (nx <= 0.5) delete st.l[p.id];
  else st.l[p.id] = Math.round(clamp(nx, 0, 100) * 10) / 10;
  return p.stress > 70 && (st.l[p.id] ?? 0) > 50;
}
