// Rodada 29 (REORG, S03 / M09 da Bíblia de UI/UX) — grade semana/mês com CAPACIDADE por recurso (pessoas, estúdio,
// dinheiro, tempo), função pura do estado (sem DOM). Lê só as fontes que já decidem capacidade e prazo:
//   pessoas  → capacity.personLoad (planos + agenda + turnês; % da agenda do mês)
//   estúdio  → s.sessions (sessões abertas e seus dias) e o teto de sessões da sede (branches/caps quando houver)
//   dinheiro → ledger18: contas a pagar e a receber agendadas por mês (centavos nominais)
//   tempo    → agenda17: bolinhas livres do mês corrente (meses futuros: desconhecido — não se inventa)
//   prazos   → calendar19 (quantos itens caem no período e quantos pedem ação)
// Selecionar uma coluna é CONSULTA (estado de interface); avançar o tempo continua sendo o comando de sempre.

import { l, type L } from '../../data/world';
import { calendar19 } from '../../sim/calendar19';
import { activeMembers, monthIndex, monthLabel, personLoad } from '../../sim/capacity';
import { fin18 } from '../../sim/ledger18';
import { balls } from '../../sim/sys/agenda17';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { val29, type Val29 } from './state29model';

export type GridMode29 = 'week' | 'month';
export type Level29 = 'ok' | 'warn' | 'over' | 'unknown' | 'none';
export interface Col29 { key: string; label: L; /** semanas absolutas [w0, w1) cobertas */ w0: number; w1: number; month: number; now: boolean }
export interface Cell29 { v: Val29; level: Level29; note?: L }
export interface Row29 { id: string; kind: 'person' | 'studio' | 'money' | 'time' | 'deadlines'; label: L | string; unit: L; cells: Cell29[] }
export interface Grid29 { mode: GridMode29; cols: Col29[]; rows: Row29[] }

const safe = <T>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };

/** Data (UTC) de uma semana absoluta, ancorada no dia atual da campanha (s.day), como o calendário do motor. */
export const dateOfWeek29 = (s: GameState, w: number): Date => new Date(Date.UTC(s.config.startYear, 0, 1) + (s.day + (w - s.week) * 7) * 86400000);

/** Mês absoluto (ano*12+mês) de uma semana absoluta da campanha. */
export function monthOfWeek29(s: GameState, w: number): number {
  const d = dateOfWeek29(s, w);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

/** Colunas: 6 semanas a partir desta, ou 6 meses a partir deste. */
export function cols29(s: GameState, mode: GridMode29, n = 6): Col29[] {
  const m0 = monthIndex(s);
  if (mode === 'week') return Array.from({ length: n }, (_, i) => {
    const w = s.week + i;
    const d = dateOfWeek29(s, w);
    const dd = d.getUTCDate(), mo = d.getUTCMonth();
    const pt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][mo], en = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][mo];
    return { key: `w${w}`, label: i === 0 ? l('esta semana', 'this week') : l(`${dd} ${pt}`, `${en} ${dd}`), w0: w, w1: w + 1, month: monthOfWeek29(s, w), now: i === 0 };
  });
  // meses: semanas absolutas do 1º ao último dia do mês (a 1ª coluna começa nesta semana)
  const weekOf = (m: number) => s.week + Math.floor(((Date.UTC(Math.floor(m / 12), m % 12, 1) - Date.UTC(s.config.startYear, 0, 1)) / 86400000 - s.day) / 7);
  return Array.from({ length: n }, (_, i) => {
    const m = m0 + i;
    return { key: `m${m}`, label: monthLabel(m), w0: Math.max(s.week, weekOf(m)), w1: Math.max(s.week + 1, weekOf(m + 1)), month: m, now: i === 0 };
  });
}

const lvlPct = (p: number): Level29 => (p > 100 ? 'over' : p >= 80 ? 'warn' : p > 0 ? 'ok' : 'none');

/** A grade inteira. `maxPeople` limita as linhas de pessoas (as mais carregadas primeiro; o resto fica na agenda). */
export function grid29(s: GameState, mode: GridMode29 = 'week', maxPeople = 6): Grid29 {
  const cols = cols29(s, mode);
  const rows: Row29[] = [];
  // pessoas: integrantes ativos dos atos do jogador (sem repetir) — carga em % da agenda do mês
  const ids = [...new Set(playerActs(s).flatMap((id) => (s.acts[id] ? safe(() => activeMembers(s, s.acts[id]), []) : [])))];
  const people = ids.map((pid) => ({ pid, cells: cols.map((c): Cell29 => {
    const ld = safe(() => personLoad(s, pid, c.month), null);
    if (!ld) return { v: { kind: 'unknown' }, level: 'unknown' };
    return { v: val29(Math.round(ld.total), { unit: l('% da agenda do mês', '% of the month\'s schedule') }), level: lvlPct(ld.total),
      note: ld.parts.length ? l(ld.parts.map((p) => `${p.label.pt} ${p.load}%`).join(' · '), ld.parts.map((p) => `${p.label.en} ${p.load}%`).join(' · ')) : undefined };
  }) }));
  people.sort((a, b) => Math.max(...b.cells.map((x) => x.v.n ?? 0)) - Math.max(...a.cells.map((x) => x.v.n ?? 0)));
  for (const p of people.slice(0, maxPeople)) rows.push({ id: `p:${p.pid}`, kind: 'person', label: s.persons[p.pid]?.name ?? p.pid, unit: l('% da agenda', '% of schedule'), cells: p.cells });
  // estúdio: sessões abertas que ocupam o período (dias de gravação)
  const sess = (s.sessions ?? []).filter((x) => !x.done);
  rows.push({ id: 'studio', kind: 'studio', label: l('Estúdio (sessões)', 'Studio (sessions)'), unit: l('sessões ativas', 'active sessions'), cells: cols.map((c): Cell29 => {
    const d0 = c.w0 * 7, d1 = c.w1 * 7;
    const n = sess.filter((x) => x.startDay < d1 && x.startDay + x.days > d0).length;
    return { v: val29(n, { unit: l('sessões', 'sessions') }), level: n >= 3 ? 'warn' : n > 0 ? 'ok' : 'none' };
  }) });
  // dinheiro: a pagar e a receber agendados no mês da coluna (ledger); semana herda o mês (sem rateio inventado)
  const f = safe(() => fin18(s), null);
  rows.push({ id: 'money', kind: 'money', label: l('Dinheiro agendado', 'Scheduled money'), unit: l('US$ (a pagar − a receber), mês', 'US$ (payables − receivables), month'), cells: cols.map((c): Cell29 => {
    if (!f) return { v: { kind: 'unknown' }, level: 'unknown' };
    const ap = -f.ap.filter((b) => b.due === c.month).reduce((t, b) => t + b.amt, 0);
    const ar = f.ar.filter((b) => b.due === c.month).reduce((t, b) => t + b.amt, 0);
    const net = ap - ar;
    return { v: val29(net, { period: mode === 'week' ? l('do mês desta semana', 'of this week\'s month') : l('do mês', 'of the month') }), level: net > s.player.cash ? 'over' : net > 0 ? 'warn' : 'none',
      note: fmtL(l('a pagar {p} · a receber {r}', 'payables {p} · receivables {r}'), { p: `$${Math.round(ap / 100).toLocaleString('en-US')}`, r: `$${Math.round(ar / 100).toLocaleString('en-US')}` }) };
  }) });
  // tempo pessoal: bolinhas do mês corrente; futuro = desconhecido (o motor só calcula o mês em curso)
  // balls() faz a virada preguiçosa do mês da vida pessoal (monthKey/used): lemos numa cópia e devolvemos o original,
  // para a consulta não alterar nada (a própria tela de Agenda faz a virada quando é desenhada, como sempre fez)
  const b = safe(() => { const x = s.x4 as unknown as Record<string, unknown>; const keep = x.life; x.life = keep === undefined ? keep : JSON.parse(JSON.stringify(keep)); try { return balls(s); } finally { x.life = keep; } }, null);
  rows.push({ id: 'time', kind: 'time', label: l('Seu tempo (bolinhas)', 'Your time (tokens)'), unit: l('bolinhas livres', 'free tokens'), cells: cols.map((c): Cell29 => {
    if (!b || c.month !== monthIndex(s)) return { v: { kind: 'unknown', source: l('só o mês em curso é calculado', 'only the current month is computed') }, level: 'unknown' };
    const free = b.personal.filter((x) => x.k === 'free').length + b.office.filter((x) => x.k === 'free').length;
    return { v: val29(free, { unit: l('livres', 'free') }), level: b.over.length ? 'over' : free === 0 ? 'warn' : 'ok' };
  }) });
  // prazos: quantos itens do calendário caem no período (e quantos pedem ação)
  const cal = safe(() => calendar19(s, { weeks: Math.max(...cols.map((c) => c.w1)) - s.week + 1 }), [] as ReturnType<typeof calendar19>);
  rows.push({ id: 'deadlines', kind: 'deadlines', label: l('Prazos do calendário', 'Calendar deadlines'), unit: l('itens', 'items'), cells: cols.map((c): Cell29 => {
    const xs = cal.filter((d) => d.w >= c.w0 && d.w < c.w1);
    const act = xs.filter((d) => d.act).length;
    return { v: val29(xs.length, { unit: l('itens', 'items') }), level: act ? 'warn' : xs.length ? 'ok' : 'none', note: act ? fmtL(l('{n} pedem ação', '{n} need action'), { n: act }) : undefined };
  }) });
  return { mode, cols, rows };
}

/** Itens do calendário de uma coluna (para o detalhe ao selecionar) — mesma fonte, sem cópia. */
export function colItems29(s: GameState, c: Col29): ReturnType<typeof calendar19> {
  return safe(() => calendar19(s, { weeks: c.w1 - s.week + 1 }).filter((d) => d.w >= c.w0 && d.w < c.w1), []);
}
