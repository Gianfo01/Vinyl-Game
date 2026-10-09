// Rodada 14 — portões de capacidade mensal usados por arquivos centrais (contratos, rivais).
// Arquivo leve de propósito (sem importar sistemas pesados) para não criar ciclos de import:
// a lógica e a interface ficam em capacity14.ts, que injeta o gasto de tempo livre aqui.

import { l, type L } from '../../data/world';
import { registerExt4 } from '../ext4';
import type { Act, GameState, Label } from '../types';
import { fmtL, staffCount } from '../util';

export interface Cap14 {
  /** mês absoluto (ano*12+mês) dos contadores abaixo */
  mk: number;
  /** reuniões de oferta feitas no mês e quantas saíram do seu tempo livre */
  meet: number;
  meetDots: number;
  scoutDots: number;
  /** contratações de cada selo rival no mês */
  rv: Record<string, number>;
  /** contratação barrada que não deve aparecer no registro do rival */
  blk?: { lb: string; a: string };
  /** último bloqueio explicado (para a interface) */
  why?: L;
  /** meses seguidos de sobrecarga por função da equipe e por pessoa */
  strain: Record<string, number>;
  over: Record<string, number>;
  log: { w: number; t: L; tone: 'good' | 'bad' | 'info' }[];
}

declare module '../ext4' {
  interface Ext4 {
    cap14: Cap14;
  }
}

const fresh = (): Cap14 => ({ mk: -1, meet: 0, meetDots: 0, scoutDots: 0, rv: {}, strain: {}, over: {}, log: [] });
registerExt4('cap14', fresh);

const mKey = (s: GameState) => s.year * 12 + s.month;

export function cap14(s: GameState): Cap14 {
  const x = s.x4 as unknown as { cap14?: Cap14 };
  x.cap14 ??= fresh();
  const c = x.cap14;
  if (c.mk !== mKey(s)) { c.mk = mKey(s); c.meet = 0; c.meetDots = 0; c.scoutDots = 0; c.rv = {}; c.blk = undefined; c.why = undefined; }
  return c;
}

// ---------------------------------------------------------------- tempo do jogador (injetado)

let spendFn: (s: GameState, n: number) => L | null = () => null;
export function bindSpend(f: (s: GameState, n: number) => L | null): void { spendFn = f; }

/** Reuniões de oferta que a mesa do selo absorve por mês sem tirar tempo seu. */
export function meetingCap(s: GameState): number {
  return 2 + staffCount(s, 'admin') + staffCount(s, 'legal') + staffCount(s, 'manager') + (s.player.hq >= 2 ? 1 : 0);
}

/** Cada oferta é uma reunião: dentro da cota, a equipe cuida; acima, sai do seu tempo livre. */
export function useMeeting(s: GameState): L | null {
  const c = cap14(s);
  if (c.meet < meetingCap(s)) { c.meet += 1; c.why = undefined; return null; }
  const e = spendFn(s, 1);
  if (e) {
    c.why = fmtL(l('Agenda de reuniões cheia: a equipe já fez {n} reuniões de oferta este mês e você está sem tempo livre. Contrate Administração, Jurídico ou Empresário, ou espere o mês que vem.', 'Meeting calendar full: the team already held {n} offer meetings this month and you have no free time left. Hire Administration, Legal or a Manager, or wait for next month.'), { n: c.meet });
    return c.why;
  }
  c.meet += 1;
  c.meetDots += 1;
  c.why = l('A equipe estava sem horário: você foi pessoalmente à reunião (−1 de tempo livre).', 'The team had no slot left: you went to the meeting yourself (−1 free time).');
  return null;
}

// ---------------------------------------------------------------- selos rivais

const FAMILY_SIGN: Record<Label['family'], number> = { A: 3, B: 1, C: 2, D: 1 };

/** Contratações por mês que o A&R de um selo rival consegue fechar (gente, não dinheiro). */
export function rivalSignCap(lb: Label): number {
  return FAMILY_SIGN[lb.family] + (lb.aggression > 0.75 ? 1 : 0) + (lb.procedural ? 0 : lb.roster.length >= 20 ? 1 : 0);
}

export const rivalSignsLeft = (s: GameState, lb: Label): number => Math.max(0, rivalSignCap(lb) - (cap14(s).rv[lb.id] ?? 0));

/** Transferência (compra de contrato, venda, absorção): o contrato anterior acabou nesta semana. */
function isTransfer(s: GameState, act: Act): boolean {
  return Object.values(s.contracts).some((k) => k.actId === act.id && k.endWeek === s.week && k.startWeek < s.week);
}

/** Pode o selo assinar mais alguém neste mês? Conta a contratação quando pode. */
export function rivalSignOk(s: GameState, labelId: string, act: Act): boolean {
  const lb = s.labels[labelId];
  if (!lb) return true;
  const c = cap14(s);
  if (!isTransfer(s, act) && (c.rv[labelId] ?? 0) >= rivalSignCap(lb)) { c.blk = { lb: labelId, a: act.name }; return false; }
  c.rv[labelId] = (c.rv[labelId] ?? 0) + 1;
  return true;
}

/** Registro do rival: some a jogada que a capacidade barrou. */
export function skipBlockedLog(s: GameState, labelId: string, actName?: string): boolean {
  const c = cap14(s);
  if (c.blk && c.blk.lb === labelId && c.blk.a === actName) { c.blk = undefined; return true; }
  return false;
}
