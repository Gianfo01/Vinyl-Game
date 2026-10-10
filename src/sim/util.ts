import { Rng } from '../core/rng';
import { nominal } from '../core/money';
import type { L } from '../data/world';
import type { GameState, MemoryEntry, Notification } from './types';
import { book18, postHooks18, sect18, type Sect18 } from './ledger18';

export const START_DAY_MS = (year: number) => Date.UTC(year, 0, 1);

export function rngOf(s: GameState): Rng {
  return new Rng(s.rng);
}

export function nextId(s: GameState, prefix: string): string {
  s.idSeq += 1;
  return prefix + s.idSeq.toString(36);
}

export function dateOfDay(startYear: number, day: number): { year: number; month: number; dom: number } {
  const d = new Date(START_DAY_MS(startYear) + day * 86400000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), dom: d.getUTCDate() };
}

export function dayOfDate(startYear: number, year: number, month: number): number {
  return Math.round((Date.UTC(year, month, 1) - START_DAY_MS(startYear)) / 86400000);
}

/** Semana absoluta → ano (aprox.) */
export function yearOfWeek(s: GameState, week: number): number {
  return dateOfDay(s.config.startYear, week * 7).year;
}

export function hasTech(s: GameState, id: string, year = s.year): boolean {
  const y = s.techDates[id];
  return y !== undefined && y <= year;
}

/** Dólares reais → centavos nominais no ano corrente */
export function money(s: GameState, realDollars: number): number {
  return nominal(realDollars, s.year);
}

export type Param = string | number | L;

export function fmtL(text: L, params: Record<string, Param> = {}): L {
  const rep = (str: string, lang: 'pt' | 'en') =>
    str.replace(/\{(\w+)\}/g, (_, k) => {
      const v = params[k];
      if (v === undefined) return `{${k}}`;
      return typeof v === 'object' ? v[lang] : String(v);
    });
  return { pt: rep(text.pt, 'pt'), en: rep(text.en, 'en') };
}

/** Lançamento contábil. R18: só receita/custo OPERACIONAL entram em revenueByYear/profitByYear (aporte, empréstimo,
 *  venda de ativo, impostos e câmbio não). `cash=false` reconhece agora e deixa o caixa para um título a receber/pagar
 *  (ver sim/sys/econ18.ts). */
export function post(s: GameState, key: string, amount: number, cat: string, memo: string, cash = true): boolean {
  if (amount === 0) return true;
  const fullKey = `${s.week}:${key}`;
  if (s.ledgerKeys[fullKey]) return false; // reprocessar não duplica (GDD §27)
  s.ledgerKeys[fullKey] = 1;
  amount = Math.round(amount);
  if (cash) {
    s.player.cash += amount;
    s.player.totalPosted += amount;
  }
  s.ledger.push({ key: fullKey, week: s.week, amount, cat, memo: cash ? memo : memo + ' ⏳' });
  if (s.ledger.length > 400) s.ledger.splice(0, s.ledger.length - 400);
  s.monthLedger[cat] = (s.monthLedger[cat] ?? 0) + amount;
  s.player.totals[cat] = (s.player.totals[cat] ?? 0) + amount;
  const sec = sect18(cat, amount, key);
  if (sec === 'rev') s.player.revenueByYear[s.year] = (s.player.revenueByYear[s.year] ?? 0) + amount;
  if (sec === 'rev' || sec === 'cost') s.player.profitByYear[s.year] = (s.player.profitByYear[s.year] ?? 0) + amount;
  book18(s, sec, cat, key, amount, cash);
  if (sec === 'cost') for (const fn of postHooks18()) fn(s, key, amount, cat);
  return true;
}

/** Movimento só de caixa (liquidação de título já reconhecido): não é receita nem custo de novo. */
export function settleCash(s: GameState, amount: number, cat: string, memo: string, sect: Sect18 = 'rev'): void {
  amount = Math.round(amount);
  if (!amount) return;
  s.player.cash += amount;
  s.player.totalPosted += amount;
  s.ledger.push({ key: `${s.week}:settle:${s.ledger.length}`, week: s.week, amount, cat: 'settle', memo });
  if (s.ledger.length > 400) s.ledger.splice(0, s.ledger.length - 400);
  book18(s, sect, cat, '', amount, true, false);
}

export function remember(
  s: GameState,
  kind: string,
  text: L,
  opts: { actId?: string; causeIds?: string[]; important?: boolean } = {},
): MemoryEntry {
  const e: MemoryEntry = { id: nextId(s, 'm'), week: s.week, year: s.year, month: s.month, kind, text, ...opts };
  s.memory.push(e);
  if (s.memory.length > 1500) {
    // mantém fatos importantes; descarta rotina antiga
    const keep = s.memory.filter((m, i) => m.important || i > s.memory.length - 1000);
    s.memory = keep.slice(-1400);
  }
  if (opts.actId && s.acts[opts.actId]) {
    const h = s.acts[opts.actId].history;
    h.push(e.id);
    if (h.length > 40) h.splice(0, h.length - 40);
  }
  for (const fn of rememberListeners()) fn(s, e);
  return e;
}

/** Observadores do diário (rodada 9: a crônica do mundo lê os fatos sem tocar em cada sistema).
 *  Função içada: pode ser chamada por módulos que carregam antes deste terminar. */
export function rememberListeners(): ((s: GameState, e: MemoryEntry) => void)[] {
  const f = rememberListeners as unknown as { l?: ((s: GameState, e: MemoryEntry) => void)[] };
  return (f.l ??= []);
}

export function notify(s: GameState, text: L, kind: Notification['kind'] = 'info'): void {
  s.notifications.push({ week: s.week, text, kind });
  if (s.notifications.length > 120) s.notifications.splice(0, s.notifications.length - 120);
}

export function sum(arr: number[]): number {
  let t = 0;
  for (const x of arr) t += x;
  return t;
}

export function avg(arr: number[]): number {
  return arr.length ? sum(arr) / arr.length : 0;
}

let paCache: { s: GameState; ids: string[] } | null = null;

/** Roda `fn` com a lista de atos do jogador congelada (para varreduras que não mudam o elenco). */
export function withPlayerActsCache<T>(s: GameState, fn: () => T): T {
  const prev = paCache;
  paCache = { s, ids: playerActsRaw(s) };
  try {
    return fn();
  } finally {
    paCache = prev;
  }
}

export function playerActs(s: GameState): string[] {
  if (paCache && paCache.s === s) return paCache.ids.slice();
  return playerActsRaw(s);
}

function playerActsRaw(s: GameState): string[] {
  const out: string[] = [];
  for (const id in s.acts) {
    const a = s.acts[id];
    if (a.owner === 'player' && a.status !== 'retired' && a.status !== 'split') out.push(id);
  }
  return out;
}

export function staffCount(s: GameState, role: string): number {
  return s.player.staff.filter((x) => x.role === role).length;
}

export function staffSkill(s: GameState, role: string): number {
  const list = s.player.staff.filter((x) => x.role === role);
  if (!list.length) return 0;
  return Math.max(...list.map((x) => x.skill + staffAdjusters().reduce((t, f) => t + f(s, x), 0)));
}

/** Rodada 13: ajustes do desempenho efetivo de um funcionário (aptidão para o cargo, atributos). Função içada. */
export function staffAdjusters(): ((s: GameState, st: GameState['player']['staff'][number]) => number)[] {
  const f = staffAdjusters as unknown as { l?: ((s: GameState, st: GameState['player']['staff'][number]) => number)[] };
  return (f.l ??= []);
}

export function hasMutator(s: GameState, id: string): boolean {
  return s.config.mutators.includes(id);
}

export function hasCard(s: GameState, id: string): boolean {
  return s.config.card === id;
}

export function decadeOf(year: number): number {
  return Math.floor(year / 10) * 10;
}
