// Rodada 29 (REORG) — modelos das telas do CICLO da Bíblia de UI/UX (Parte VIII, prioridade 2):
//   S01 indicadores com unidade/período/fonte · S03 revisão antes de avançar · S13 realizado × comprometido × estimado ·
//   S16 trajetória · M04 acompanhamento · M17 "Onde eu estava?".
// Funções PURAS do estado (sem DOM, testáveis). Leem as fontes que já existem — calendário (calendar19), decisões
// (s.decisions), ecos (dec18), promessas (promises28), fechamento (close23), ledger (ledger18), projetos (project8),
// capítulos (end28) — e NUNCA escrevem nada. Desconhecido fica desconhecido (state29model), estimativa fica estimativa.

import { l, type L } from '../../data/world';
import { calendar19 } from '../../sim/calendar19';
import { lastClosed23, lastMonthView23 } from '../../sim/close23';
import { apTotal18, arTotal18 } from '../../sim/ledger18';
import { dec18 } from '../../sim/sys/decide18';
import { chapters28, rumo28 } from '../../sim/sys/end28';
import { STAGE_NAMES, openProjects, projectStage } from '../../sim/sys/project8';
import { PROM28_NAME, committed28, owed28, promiseRows28 } from '../../sim/sys/promises28';
import { isWatched } from '../../sim/sys/scout11';
import type { GameState } from '../../sim/types';
import { fmtL, playerActs } from '../../sim/util';
import { endOf28 } from '../../sim/start28data';
import { PERIOD29, month29, na29, val29, type EntState29, type Val29 } from './state29model';
import type { Target29 } from './route29model';

const safe = <T>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };
const mine = (s: GameState) => new Set(playerActs(s));
const liveActs = (s: GameState) => [...mine(s)].map((id) => s.acts[id]).filter((a) => a && a.status !== 'retired' && a.status !== 'split');

// ---------------------------------------------------------------- S01: indicadores com unidade, período e fonte

export interface Ind29 { id: 'month' | 'cash' | 'runway' | 'fame'; label: L; v: Val29; go?: Target29 }
/** UX-S01-02: os quatro indicadores do Cockpit com unidade/período/fonte; sem elenco, fama "não se aplica" (não zero). */
export function indicators29(s: GameState): Ind29[] {
  const lm = safe(() => lastMonthView23(s), { delta: 0, op: 0, net: 0, adj: 0 } as ReturnType<typeof lastMonthView23>);
  const closed = lm.y !== undefined;
  const runway = s.player.cash < 0 ? 0 : lm.delta < 0 ? s.player.cash / -lm.delta : null;
  const top = liveActs(s).sort((a, b) => b.fame - a.fame)[0];
  return [
    { id: 'month', label: l('Mês', 'Month'), v: { kind: 'value', n: s.week, unit: month29(s.year, s.month), period: PERIOD29.now, source: l('calendário da campanha', 'campaign calendar') } },
    { id: 'cash', label: l('Caixa', 'Cash'), v: val29(s.player.cash, { unit: l('US$ nominais do ano', 'nominal US$ of the year'), period: PERIOD29.now, source: l('saldo da empresa (estoque, não receita)', 'company balance (stock, not revenue)') }), go: { area: 'finance' } },
    { id: 'runway', label: l('Fôlego', 'Runway'),
      v: !closed ? { kind: 'unknown', source: l('sem mês fechado ainda', 'no closed month yet') }
        : runway === null ? { kind: 'na', source: l('o caixa não caiu no último mês fechado', 'cash did not fall in the last closed month') }
          : val29(runway, { estimated: true, unit: l('meses', 'months'), period: PERIOD29.lastMonth, source: l('caixa ÷ queda do último mês fechado', 'cash ÷ last closed month\'s drop') }),
      go: { area: 'finance' } },
    { id: 'fame', label: l('Fama', 'Fame'), v: top ? val29(Math.round(top.fame), { unit: l('0–100, do seu artista mais famoso', '0–100, your most famous act'), source: l(top.name, top.name) }) : na29(l('sem elenco', 'no roster')), go: { area: 'artists' } },
  ];
}

// ---------------------------------------------------------------- S03: revisão antes de avançar (não avança nada)

export type Gate29 = Extract<EntState29, 'met' | 'pending' | 'blocked'> | 'unknown';
export interface Check29 { id: string; state: Gate29; title: L; detail?: L; go?: Target29 }
export interface Review29 { checks: Check29[]; counts: Record<Gate29, number>; horizonWeeks: number; summary: L }

/**
 * UX-S03-03: o que o próximo avanço vai afetar, com o critério de cada item — usa as fontes do motor (decisões com
 * padrão, promessas, prazos do calendário, caixa). Não cria gate novo: "bloqueado" só para o que o jogo já trata como
 * impedimento (caixa negativo é falência em curso); o resto é pendente (o padrão vale) ou atendido.
 */
export function review29(s: GameState, horizonWeeks = 4): Review29 {
  const checks: Check29[] = [];
  for (const d of s.decisions ?? []) {
    const def = d.options.find((o) => o.id === d.defaultOption);
    checks.push({ id: `dec:${d.id}`, state: 'pending', title: d.title,
      detail: def ? fmtL(l('Se não responder: "{o}" (padrão).', 'If you do not answer: "{o}" (default).'), { o: def.label }) : l('Sem padrão registrado.', 'No default recorded.'),
      go: { area: 'cockpit', tab: ['ck20', 'inbox'] } });
  }
  for (const r of safe(() => promiseRows28(s).filter((x) => x.state === 'open'), [] as ReturnType<typeof promiseRows28>)) {
    if (r.kind === 'freedom') continue;
    const due = r.weeksLeft <= horizonWeeks;
    checks.push({ id: `prom:${r.actId}:${r.kind}`, state: r.met ? 'met' : due ? 'pending' : 'met',
      title: fmtL(l('Promessa a {a}: {k}', 'Promise to {a}: {k}'), { a: r.act, k: PROM28_NAME[r.kind] }),
      detail: r.met ? l('Já atendida.', 'Already met.') : fmtL(l('Vence em {n} sem.; se falhar, multa e confiança.', 'Due in {n} wk; failing costs a penalty and trust.'), { n: Math.max(0, r.weeksLeft) }),
      go: { area: 'contracts19' } });
  }
  for (const x of safe(() => calendar19(s, { weeks: horizonWeeks }), [] as ReturnType<typeof calendar19>)) {
    if (x.kind === 'decision' || x.kind === 'msg' || !x.act) continue;
    checks.push({ id: `cal:${x.id}`, state: 'pending', title: x.t, detail: x.d, go: x.goto?.area ? { area: x.goto.area, tab: x.goto.tab } : { area: 'calendar19' } });
  }
  const closed = lastClosed23(s);
  checks.push(s.player.cash < 0
    ? { id: 'cash', state: 'blocked', title: l('Caixa negativo', 'Negative cash'), detail: l('Sem caixa, o avanço segue para a falência: veja empréstimos e vendas em Finanças.', 'With no cash, advancing heads to bankruptcy: see loans and sales in Finance.'), go: { area: 'finance' } }
    : closed ? { id: 'cash', state: 'met', title: l('Caixa positivo', 'Cash positive'), detail: fmtL(l('Último mês fechado: {m}.', 'Last closed month: {m}.'), { m: month29(closed.y, closed.m) }), go: { area: 'finance' } }
      : { id: 'cash', state: 'unknown', title: l('Fôlego ainda desconhecido', 'Runway still unknown'), detail: l('Nenhum mês fechado ainda: o fôlego aparece depois do primeiro fechamento.', 'No closed month yet: runway shows after the first closing.'), go: { area: 'finance' } });
  const counts: Record<Gate29, number> = { met: 0, pending: 0, blocked: 0, unknown: 0 };
  for (const c of checks) counts[c.state]++;
  const summary = counts.blocked ? l('Há um impedimento: resolva antes de avançar ou avance sabendo da consequência.', 'There is a blocker: solve it before advancing or advance knowing the consequence.')
    : counts.pending ? fmtL(l('{n} item(ns) pendente(s): ao avançar, decisões sem resposta usam o padrão.', '{n} pending item(s): advancing applies the default to unanswered decisions.'), { n: counts.pending })
      : l('Nada pendente nas próximas semanas.', 'Nothing pending in the coming weeks.');
  return { checks, counts, horizonWeeks, summary };
}

// ---------------------------------------------------------------- S13: realizado × comprometido × estimado

export interface Money29 { id: string; kind: Extract<EntState29, 'realized' | 'committed' | 'estimated'>; label: L; v: Val29; go?: Target29 }
/** UX-S13: separa o que ocorreu (caixa, último fechamento), o que já está assumido (contas a pagar, promessas, devido)
 *  e o que é projeção (a receber, fôlego). Valores em centavos nominais; nada é somado entre categorias. */
export function money29(s: GameState): Money29[] {
  const c = lastClosed23(s);
  const lm = safe(() => lastMonthView23(s), { delta: 0, op: 0, net: 0, adj: 0 } as ReturnType<typeof lastMonthView23>);
  const per = c ? month29(c.y, c.m) : undefined;
  const ap = safe(() => apTotal18(s), NaN), ar = safe(() => arTotal18(s), NaN);
  const prom = safe(() => committed28(s), NaN), owed = safe(() => owed28(s), NaN);
  const rw = s.player.cash < 0 ? 0 : lm.delta < 0 ? s.player.cash / -lm.delta : null;
  return [
    { id: 'cash', kind: 'realized', label: l('Caixa agora', 'Cash now'), v: val29(s.player.cash, { period: PERIOD29.now, source: l('saldo da empresa', 'company balance') }) },
    { id: 'delta', kind: 'realized', label: l('Variação do caixa', 'Cash change'), v: c ? val29(c.cashEnd - c.cashStart, { period: per, source: l('fechamento do mês', 'month closing') }) : { kind: 'unknown', source: l('sem mês fechado', 'no closed month') } },
    { id: 'op', kind: 'realized', label: l('Resultado operacional', 'Operating result'), v: c ? val29(lm.op, { period: per, source: l('receitas − custos (competência)', 'revenue − costs (accrual)') }) : { kind: 'unknown' } },
    { id: 'ap', kind: 'committed', label: l('Contas a pagar', 'Payables'), v: val29(Number.isNaN(ap) ? null : ap, { period: PERIOD29.total, source: l('ledger: obrigações agendadas', 'ledger: scheduled obligations') }), go: { area: 'business' } },
    { id: 'prom', kind: 'committed', label: l('Verba de promessas abertas', 'Open promise budgets'), v: val29(Number.isNaN(prom) ? null : prom, { period: PERIOD29.total, source: l('contratos com promessas', 'contracts with promises') }), go: { area: 'contracts19' } },
    { id: 'owed', kind: 'committed', label: l('Devido por promessas quebradas', 'Owed for broken promises'), v: val29(Number.isNaN(owed) ? null : owed, { period: PERIOD29.total, source: l('multas em aberto', 'open penalties') }) },
    { id: 'ar', kind: 'estimated', label: l('A receber', 'Receivables'), v: Number.isNaN(ar) ? { kind: 'unknown' } : ar === 0 ? val29(0, { period: PERIOD29.total }) : val29(ar, { estimated: true, period: PERIOD29.total, source: l('ledger: recebíveis agendados', 'ledger: scheduled receivables') }), go: { area: 'business' } },
    { id: 'runway', kind: 'estimated', label: l('Fôlego', 'Runway'), v: !c ? { kind: 'unknown', source: l('sem mês fechado', 'no closed month') } : rw === null ? na29(l('o caixa não caiu', 'cash did not fall')) : val29(rw, { estimated: true, unit: l('meses', 'months'), period: PERIOD29.lastMonth }) },
  ];
}

// ---------------------------------------------------------------- M04: acompanhamento (objetos distintos, não misturados)

export interface Follow29 {
  /** artistas que você acompanha (radar do olheiro) — não são favoritos de página */
  acts: { id: string; name: string; fame: number; mine: boolean }[];
  /** páginas fixadas (☆) */
  pages: string[];
  /** projetos em andamento das suas carreiras */
  projects: { id: string; actId: string; title: string; stage: L }[];
}
export function follow29(s: GameState, pins: string[], max = 4): Follow29 {
  const own = mine(s);
  const watched = Object.values(s.acts).filter((a) => safe(() => isWatched(s, a.id), false)).sort((a, b) => b.fame - a.fame);
  const projects = safe(() => openProjects(s).filter((p) => own.has(p.actId)), [] as ReturnType<typeof openProjects>)
    .slice(0, max).map((p) => ({ id: p.id, actId: p.actId, title: `${s.acts[p.actId]?.name ?? '—'}: ${p.title || p.type.toUpperCase()}`, stage: STAGE_NAMES[projectStage(s, p)] }));
  return { acts: watched.slice(0, max).map((a) => ({ id: a.id, name: a.name, fame: Math.round(a.fame), mine: own.has(a.id) })), pages: pins.slice(0, max * 2), projects };
}

// ---------------------------------------------------------------- M17: "Onde eu estava?" (do checkpoint carregado)

export interface Resume29 { date: L; span: L; projects: Follow29['projects']; next: { id: string; title: L; when: L; go?: Target29 }[]; choices: { title: L; pick: L; when: L }[] }
/** Retomada: data e prazo da campanha, projetos, próximos compromissos e últimas escolhas — tudo do estado carregado,
 *  nada simulado "enquanto você estava fora" (M17). */
export function resume29(s: GameState): Resume29 {
  const end = endOf28(s.config.startYear, s.config.runYears17);
  const next = safe(() => calendar19(s, { weeks: 8 }), [] as ReturnType<typeof calendar19>).filter((x) => x.kind !== 'msg').slice(0, 3)
    .map((x) => ({ id: x.id, title: x.t, when: x.w <= s.week ? l('esta semana', 'this week') : fmtL(l('em {n} sem.', 'in {n} wk'), { n: x.w - s.week }), go: x.goto?.area ? { area: x.goto.area, tab: x.goto.tab } as Target29 : undefined }));
  const th = safe(() => [...dec18(s).th].sort((a, b) => b.w - a.w).slice(0, 3), [] as ReturnType<typeof dec18>['th']);
  return {
    date: month29(s.year, s.month),
    span: end === null ? l('sem fim (sandbox)', 'no end (sandbox)') : fmtL(l('fim em dez/{y} · faltam {n} anos', 'ends Dec {y} · {n} years left'), { y: end, n: Math.max(0, end - s.year) }),
    projects: follow29(s, [], 3).projects,
    next,
    choices: th.map((x) => ({ title: x.t, pick: x.o, when: fmtL(l('há {n} sem.', '{n} wk ago'), { n: Math.max(0, s.week - x.w) }) })),
  };
}

// ---------------------------------------------------------------- S16: trajetória (capítulos, rumo, continuidade)

export interface Trail29 { rumo?: { name: L; score: number }; chapters: { decade: number; open: boolean; epitaph: L }[]; continuity: L; choices: number }
export function trail29(s: GameState): Trail29 {
  const r = safe(() => rumo28(s), null);
  const end = endOf28(s.config.startYear, s.config.runYears17);
  const sandbox = end === null || s.year > end;
  return {
    rumo: r ? { name: r.name, score: r.score } : undefined,
    chapters: safe(() => chapters28(s), [] as ReturnType<typeof chapters28>).map((c) => ({ decade: c.decade, open: c.open, epitaph: c.epitaph })),
    continuity: sandbox ? l('Sandbox: a campanha segue sem fim marcado.', 'Sandbox: the campaign goes on with no set end.') : fmtL(l('História com fim em dez/{y}; depois, opção de continuar em sandbox.', 'Story ending Dec {y}; afterwards, the option to continue in sandbox.'), { y: end! }),
    choices: safe(() => dec18(s).th.length, 0),
  };
}
