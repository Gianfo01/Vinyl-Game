// R31 · onda 1 (A) — HOJE: a Mesa do chefe responde três perguntas, nesta ordem, e mostra UMA linha do tempo.
//   1. O que preciso decidir agora?  → pendências únicas (src/sim/r31/pending.ts), mais urgentes primeiro
//   2. O que está em andamento?      → projetos, sessões de estúdio e lançamentos programados
//   3. O que mudou?                  → o resumo do último avanço (briefing) e a variação do caixa
// Linha do tempo única: o calendário único (src/sim/calendar19.ts) nas próximas 12 semanas, com filtros.
// Modelo puro (sem DOM): só lê o estado. Testes em tests/r31-nav.test.ts.

import { l, type L } from '../../data/world';
import { calendar19, type CalKind19, type Deadline19 } from '../../sim/calendar19';
import { lastMonthView23 } from '../../sim/close23';
import { pendingList } from '../../sim/r31/pending';
import type { GameState } from '../../sim/types';
import { fmtL } from '../../sim/util';
import { proj } from '../sys/cockpit27model';
import { hqModel25 } from './hq25model';

export type Tone31 = 'bad' | 'warn' | 'good' | 'info' | undefined;
export interface Go31 { area?: string; tab?: [string, string]; act?: string; hub?: { actId: string; pid: string } }
export interface Row31 { id: string; title: L | string; meta?: L | string; aside?: L | string; tone?: Tone31; go?: Go31 }
export type TlFilter31 = 'all' | 'shows' | 'studio' | 'deadlines' | 'world';
export interface Tl31 { id: string; w: number; kind: CalKind19; title: L; tone?: 'bad' | 'good' | 'info'; act?: boolean; go?: Go31 }
export interface Hoje31 {
  /** pendências únicas (o número do Hoje no menu) */
  decide: Row31[];
  /** sugestões do mês que não são pendência (caixa curto, próximo passo) — não contam */
  suggest: Row31[];
  ongoing: Row31[];
  changed: Row31[];
  timeline: Tl31[];
}

/** Semanas da linha do tempo (hoje → +12). */
export const TL_WEEKS31 = 12;
export const TL_FILTERS31: { id: TlFilter31; label: L; kinds?: CalKind19[] }[] = [
  { id: 'all', label: l('Tudo', 'All') },
  { id: 'shows', label: l('Shows', 'Shows'), kinds: ['tour', 'festival'] },
  { id: 'studio', label: l('Estúdio e lançamentos', 'Studio and releases'), kinds: ['release', 'supply', 'build'] },
  { id: 'deadlines', label: l('Prazos', 'Deadlines'), kinds: ['decision', 'echo', 'msg', 'contract', 'clause', 'money', 'court'] },
  { id: 'world', label: l('Mundo', 'World'), kinds: ['award', 'other'] },
];
export const filterTl31 = (xs: readonly Tl31[], f: TlFilter31): Tl31[] => {
  const k = TL_FILTERS31.find((x) => x.id === f)?.kinds;
  return k ? xs.filter((x) => k.includes(x.kind)) : [...xs];
};

const inWeeks = (n: number): L => (n <= 0 ? l('esta semana', 'this week') : fmtL(n === 1 ? l('em 1 semana', 'in 1 week') : l('em {n} semanas', 'in {n} weeks'), { n }));
const goOf = (g: unknown): Go31 | undefined => (g && typeof g === 'object' ? (g as Go31) : undefined);

export function hoje31(s: GameState): Hoje31 {
  // 1. decidir agora — pendências únicas
  let pend: ReturnType<typeof pendingList> = [];
  try { pend = pendingList(s); } catch { pend = []; }
  const decide: Row31[] = pend.map((p) => ({
    id: p.id, title: p.title,
    aside: p.due !== undefined ? inWeeks(p.due - s.week) : undefined,
    tone: (p.prio ?? 0) >= 3 || (p.due !== undefined && p.due - s.week <= 1) ? 'bad' : 'warn',
    go: { area: p.owner.area, ...(p.actId && p.owner.area === 'artists' ? { act: p.actId } : {}) },
  }));
  let needs: ReturnType<typeof hqModel25>['needs'] = [];
  try { needs = hqModel25(s).needs; } catch { needs = []; }
  const suggest: Row31[] = needs.filter((n) => !n.id.startsWith('dec:')).slice(0, 2).map((n) => ({
    id: n.id, title: n.title, meta: n.why, tone: n.tone === 'bad' ? 'bad' : n.tone === 'good' ? 'good' : 'info', go: goOf(n.go),
  }));

  // 2. em andamento — projetos, sessões de estúdio, lançamentos programados
  const ongoing: Row31[] = [];
  try { for (const r of proj(s)) ongoing.push({ id: `p:${r.id}`, title: r.title, meta: r.meta, aside: r.aside, tone: r.tone === 'bad' ? 'bad' : undefined, go: r.hub ? { hub: r.hub } : goOf(r.go) }); } catch { /* sem projetos */ }
  for (const x of (s as unknown as { sessions?: { id: string; actId: string; days: number; dayDone: number }[] }).sessions ?? []) {
    const left = Math.max(0, x.days - x.dayDone);
    if (left <= 0) continue; // sessão já gravada: sai do "em andamento"
    ongoing.push({ id: `ses:${x.id}`, title: fmtL(l('Estúdio: {a}', 'Studio: {a}'), { a: s.acts[x.actId]?.name ?? '—' }),
      meta: fmtL(left === 1 ? l('falta 1 dia de gravação', '1 recording day left') : l('faltam {n} dias de gravação', '{n} recording days left'), { n: left }), go: { area: 'studio' } });
  }
  for (const r of (s.pendingReleases ?? []).filter((x) => s.acts[x.actId]?.owner === 'player').slice(0, 4)) {
    ongoing.push({ id: `rel:${r.id}`, title: fmtL(l('Lançamento: {a} — {t}', 'Release: {a} — {t}'), { a: s.acts[r.actId]?.name ?? '—', t: r.title || r.type.toUpperCase() }),
      aside: inWeeks(r.week - s.week), go: { area: 'releases' } });
  }

  // 3. o que mudou — resumo do último avanço + caixa do mês
  const changed: Row31[] = [];
  let delta: number | null = null;
  try { delta = lastMonthView23(s).delta; } catch { delta = null; }
  if (delta !== null && delta !== 0) changed.push({ id: 'cash', title: delta > 0 ? l('O caixa subiu no último mês', 'Cash went up last month') : l('O caixa caiu no último mês', 'Cash went down last month'), tone: delta > 0 ? 'good' : 'bad', go: { area: 'finance' } });
  for (const [i, n] of (s.briefing ?? []).filter((x) => !x.fold).slice(0, 6).entries()) {
    changed.push({ id: `b:${i}`, title: n.text, tone: n.kind === 'bad' ? 'bad' : n.kind === 'good' ? 'good' : 'info' });
  }

  // linha do tempo única (calendário único, próximas 12 semanas)
  let cal: Deadline19[] = [];
  try { cal = calendar19(s, { weeks: TL_WEEKS31 }); } catch { cal = []; }
  const timeline: Tl31[] = cal.map((d) => ({ id: d.id, w: d.w, kind: d.kind, title: d.t, tone: d.tone, act: d.act, go: goOf(d.goto) }));

  return { decide, suggest, ongoing, changed, timeline };
}
