// Rodada 19 (Frente 8, P2) — provedores do CALENDÁRIO ÚNICO: cada sistema com data registra aqui o que vence.
// Lê: decide18 (cartões com prazo e janelas de ecos), Caixa (mensagens que vencem), contratos (fim/opção, promessas,
// lançamentos mínimos, prestação de contas — contracts18), artist18 (ofertas, sentenças, prestação), lançamentos e fila
// da fábrica (supply18), turnês e festivais próprios, obras (campus18), tribunal (crime17), empréstimos e prêmios.
// Escreve: dica do Conselheiro (semana apertada), estresse do dono (fato 'crunch' com ouvinte) e "por quê" (cal19.week).

import { l, type L } from '../../data/world';
import { CRITICS_CAL19, ECHOES_CAL19, INDUSTRY_CAL19, LIVE_CAL19, type Cal19 } from '../awardcal19';
import { calendar19, crunch19, nextMonthWeek19, registerDeadline, weekOfMonth19, type Deadline19 } from '../calendar19';
import { registerExplain } from '../explain18';
import { emitFact, onFact } from '../facts17';
import { registerAdvisorTip } from '../inbox18';
import { registerSimHook } from '../ext4';
import { addStress } from '../stress17';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { a18, band18, openOffers18 } from './artist18';
import { CEREMONY_MONTH, NOMS_MONTH } from './ceremonies8';
import { campus18, KIND18 } from './campus18';
import { clausesOf } from './contracts18';
import { crime17 } from './crime17';
import { pending18 } from './decide18';
import { playerPerson } from './life';
import { liveOf } from './live/state';
import { P } from './people/state';
import { sup18 } from './supply18';
import { releasesNow27 } from '../tickcache27';

const N = (pt: string, en: string): L => l(pt, en);
const mineSet = (s: GameState) => new Set(playerActs(s));

// 1. cartões com prazo e janelas de ecos (decide18)
registerDeadline('decide18', (s) => {
  const out: Deadline19[] = [];
  for (const d of s.decisions) if (d.ctx.dl18) out.push({ id: `dl:${d.id}`, w: Number(d.ctx.dl18), kind: 'decision', t: d.title, d: N('Sem resposta, vale a opção padrão.', 'Unanswered, the default applies.'), tone: 'bad', act: true, goto: { area: 'cockpit' } });
  for (const x of pending18(s)) out.push({ id: `echo:${x.id}`, w: x.to, w0: x.from, kind: 'echo', t: x.t, d: fmtL(N('{h} ({c})', '{h} ({c})'), { h: x.hint, c: x.chance }), tone: x.tone === 'mixed' ? 'info' : x.tone });
  return out;
});

// 2. mensagens que pedem resposta e vencem
registerDeadline('inbox', (s) => P(s).inbox.filter((m) => m.expires && !m.resolved && m.actions?.length).map((m) => ({
  id: `msg:${m.id}`, w: m.expires!, kind: 'msg' as const, t: m.subject, d: fmtL(N('Sem resposta, vale "{a}".', 'Unanswered, "{a}" applies.'), { a: m.actions![m.actions!.length - 1].label }), tone: 'bad' as const, act: true, goto: { area: 'cockpit' },
})));

// 3. contratos do selo: fim/opção, promessas, lançamentos mínimos e prestação de contas (contracts18)
const STMT_MO: Record<string, number> = { q: 3, s: 6, a: 12 };
registerDeadline('contracts', (s, _from, to) => {
  const out: Deadline19[] = [];
  for (const id of playerActs(s)) {
    const a = s.acts[id], c = a?.contractId ? s.contracts[a.contractId] : undefined;
    if (!a || !c || c.party !== 'player' || a.playerBand) continue;
    if (c.endWeek > s.week) out.push({ id: `ct:${c.id}`, w: c.endWeek, kind: 'contract', t: fmtL(c.options ? N('Opção de renovação: {a}', 'Renewal option: {a}') : N('Fim do contrato: {a}', 'Contract ends: {a}'), { a: a.name }),
      d: c.options ? fmtL(N('{n} opção(ões) restantes — exercer ou deixar sair.', '{n} option(s) left — exercise or let go.'), { n: c.options }) : N('Renove antes ou o ato fica livre no mercado.', 'Renew first or the act goes free.'), tone: 'bad', act: true, goto: { act: id } });
    for (const [i, p] of c.promises.entries()) if (p.kept === undefined && p.dueWeek > s.week) out.push({ id: `pr:${c.id}:${i}`, w: p.dueWeek, kind: 'clause', t: fmtL(N('Promessa a {a}: {k}', 'Promise to {a}: {k}'), { a: a.name, k: p.kind === 'priority' ? N('prioridade/disco', 'priority/record') : p.kind === 'tour' ? N('turnê', 'tour') : N('liberdade criativa', 'creative freedom') }), d: N('Promessa quebrada vira mágoa (e às vezes processo).', 'A broken promise breeds resentment (sometimes a lawsuit).'), tone: 'bad', act: true, goto: { act: id } });
    const k = clausesOf(c);
    if (!k) continue;
    if (k.minRel > c.releasesDone && c.endWeek > s.week) out.push({ id: `mr:${c.id}`, w: c.endWeek, kind: 'clause', t: fmtL(N('Cláusula: {n} lançamento(s) de {a} até o fim do contrato', 'Clause: {n} release(s) by {a} before the deal ends'), { n: k.minRel - c.releasesDone, a: a.name }), d: N('Descumprir a cláusula dá ao artista motivo para sair ou processar.', 'Breaching the clause gives the act grounds to leave or sue.'), tone: 'bad', act: true, goto: { act: id } });
    // prestação de contas: fim do próximo período + atraso combinado
    const per = STMT_MO[k.stmt] ?? 6;
    const endM = Math.ceil((s.month + 1) / per) * per; // mês (0..) em que o período fecha
    const due = weekOfMonth19(s, s.year + Math.floor((endM + k.lag) / 12), (endM + k.lag) % 12);
    if (due > s.week && due <= to) out.push({ id: `st:${c.id}:${due}`, w: due, kind: 'money', t: fmtL(N('Prestação de contas a {a}', 'Royalty statement to {a}'), { a: a.name }), d: k.audit ? N('O contrato permite auditoria: livros sujos viram processo.', 'The deal allows audits: dirty books become lawsuits.') : undefined, tone: 'info', goto: { area: 'rights18' } });
  }
  return out;
});

// 4. carreira de artista (artist18): ofertas abertas, fim do contrato com o selo, prestações e sentenças
registerDeadline('artist18', (s) => {
  if (s.config.role !== 'artist' && !band18(s)) return [];
  const st = a18(s), out: Deadline19[] = [];
  for (const o of openOffers18(s)) out.push({ id: `of:${o.id}`, w: o.until, kind: 'contract', t: fmtL(N('Oferta de {b} expira', '{b}\'s offer expires'), { b: o.who }), tone: 'info', act: true, goto: { area: 'artist18' } });
  const c = st.deal ? s.contracts[st.deal.cid] : undefined;
  if (c && c.endWeek > s.week) out.push({ id: `dl18:${c.id}`, w: c.endWeek, kind: 'contract', t: c.options ? N('O selo decide a opção do seu contrato', 'The label decides your contract option') : N('Fim do seu contrato com o selo', 'Your label deal ends'), tone: 'info', goto: { area: 'artist18' } });
  for (const x of st.stmts) if (x.st === 'due' && x.due > s.week) out.push({ id: `as:${x.lb}:${x.y}:${x.m}`, w: x.due, kind: 'money', t: N('Prestação de contas do selo', 'Label royalty statement'), tone: 'info', goto: { area: 'artist18' } });
  for (const x of st.suits) if (x.claim && x.ruling > s.week) out.push({ id: `su:${x.lb}:${x.ruling}`, w: x.ruling, kind: 'court', t: N('Sentença do seu processo contra o selo', 'Ruling on your suit against the label'), d: fmtL(N('Chance estimada: {p}%.', 'Estimated odds: {p}%.'), { p: Math.round(x.odds * 100) }), tone: 'info', goto: { area: 'artist18' } });
  return out;
});

// 5. lançamentos e fila da fábrica (supply18)
registerDeadline('release', (s) => {
  const mine = mineSet(s), out: Deadline19[] = [];
  for (const p of s.pendingReleases) if (mine.has(p.actId) && p.week >= s.week) out.push({ id: `rel:${p.id}`, w: p.week, kind: 'release', t: fmtL(N('Lançamento: "{t}"', 'Release: "{t}"'), { t: p.title }), tone: 'good', goto: { area: 'releases' } });
  const sp = sup18(s);
  for (const b of Object.values(sp.book)) {
    const pr = s.pendingReleases.find((x) => x.id === b.pr);
    if (!pr) continue;
    for (const [m, rw] of Object.entries(b.ready)) {
      if (rw === undefined || rw < s.week) continue;
      const late = rw > pr.week;
      out.push({ id: `sup:${b.pr}:${m}`, w: rw, kind: 'supply', t: fmtL(N('Fábrica: {m} de "{t}" pronto', 'Plant: {m} for "{t}" ready'), { m, t: b.title }), d: late ? N('Fica pronto DEPOIS da data de lançamento: adie ou pague prioridade.', 'Ready AFTER the street date: postpone or pay for priority.') : undefined, tone: late ? 'bad' : 'info', act: late, goto: { area: 'supply18' } });
    }
  }
  if (sp.top && sp.top.until > s.week) out.push({ id: `top:${sp.top.plant}`, w: sp.top.until, kind: 'supply', t: N('Fim do contrato de capacidade da fábrica', 'Plant capacity contract ends'), tone: 'info', goto: { area: 'supply18' } });
  return out;
});

// 6. turnês e festivais próprios
registerDeadline('live', (s) => {
  const mine = mineSet(s), out: Deadline19[] = [];
  for (const t of s.tours) {
    if (!mine.has(t.actId) || (t.status !== 'planned' && t.status !== 'running')) continue;
    const next = t.stops.filter((x) => x.status === 'scheduled').sort((a, b) => a.day - b.day);
    if (!next.length) continue;
    const w0 = Math.floor(next[0].day / 7), w1 = Math.floor(next[next.length - 1].day / 7);
    out.push({ id: `tour:${t.id}`, w: w1, w0: w0 < w1 ? w0 : undefined, kind: 'tour', t: fmtL(N('Turnê "{n}" ({k} datas)', 'Tour "{n}" ({k} dates)'), { n: t.name, k: next.length }), tone: 'info', goto: { area: 'shows' } });
  }
  for (const f of liveOf(s).fests) {
    const w = weekOfMonth19(s, Math.max(s.year, f.nextYear), f.month);
    if (w >= s.week) out.push({ id: `fest:${f.id}:${w}`, w, kind: 'festival', t: fmtL(N('Festival {n}', '{n} festival'), { n: f.name }), d: fmtL(N('{k} artista(s) no line-up.', '{k} act(s) on the bill.'), { k: f.lineup.length }), tone: f.lineup.length ? 'info' : 'bad', act: !f.lineup.length, goto: { area: 'shows' } });
  }
  return out;
});

// 7. obras (campus18)
registerDeadline('campus18', (s) => campus18(s).proj.map((p) => {
  const m = s.month + p.left;
  return { id: `bld:${p.id}`, w: weekOfMonth19(s, s.year + Math.floor(m / 12), m % 12), kind: 'build' as const, t: fmtL(N('Obra: {k}', 'Works: {k}'), { k: p.kind === 'reno' ? N('reforma', 'renovation') : KIND18[p.kind]?.name ?? l(p.kind, p.kind) }), d: p.delays ? fmtL(N('{n} atraso(s) até agora.', '{n} delay(s) so far.'), { n: p.delays }) : undefined, tone: p.delays ? 'bad' as const : 'info' as const, goto: { area: 'campus18' } };
}));

// 8. tribunal (crime17): prazo para decidir após o indiciamento
registerDeadline('court', (s) => crime17(s).cases.filter((c) => c.who === 'player' && c.stage === 'charged' && c.dl && c.dl >= s.week).map((c) => ({
  id: `case:${c.id}`, w: c.dl!, kind: 'court' as const, t: N('Indiciamento: decidir delação, julgamento, suborno ou fuga', 'Indictment: choose plea, trial, bribe or flight'), d: N('Sem decisão, o caso segue para julgamento.', 'Without a choice, the case goes to trial.'), tone: 'bad' as const, act: true, goto: { area: 'crime' },
})));

// 9. empréstimos: parcela no começo de cada mês
registerDeadline('loans', (s) => {
  const L0 = s.player.loans.filter((x) => x.balance > 0);
  if (!L0.length) return [];
  const tot = L0.reduce((t, x) => t + x.monthly, 0), m = (s.month + 1) % 12;
  return [{ id: `loan:${s.year}:${m}`, w: weekOfMonth19(s, s.year + (m === 0 ? 1 : 0), m), kind: 'money', t: fmtL(N('Parcela de empréstimo: {v}', 'Loan payment: {v}'), { v: `$${Math.round(tot / 100).toLocaleString('en-US')}` }), d: N('Sem caixa, a parcela vira dívida mais cara.', 'Without cash, the payment turns into costlier debt.'), tone: s.player.cash < tot ? 'bad' : 'info', goto: { area: 'finance' } }];
});

// 10. prêmios (indicações em outubro, cerimônia em dezembro) — só quem lançou algo no último ano concorre
registerDeadline('awards', (s) => {
  const mine = mineSet(s);
  if (!releasesNow27(s).some((r) => mine.has(r.actId) && s.week - r.week < 52)) return [];
  return [
    { id: `noms:${s.year}`, w: nextMonthWeek19(s, NOMS_MONTH), kind: 'award', t: N('Indicações aos prêmios', 'Award nominations'), d: N('Campanha "para sua consideração" só vale antes das indicações.', '"For your consideration" campaigns only count before nominations.'), tone: 'info', goto: { area: 'awards' } },
    { id: `cer:${s.year}`, w: nextMonthWeek19(s, CEREMONY_MONTH), kind: 'award', t: N('Cerimônia de prêmios', 'Awards ceremony'), tone: 'good', goto: { area: 'awards' } },
  ];
});

// 11. r31 (W0-CAL): as outras quatro premiações com data própria (awardcal19) — Crítica, Indústria, Ao Vivo e Hall dos
// Ecos. Mesmo critério dos Gramofones: só aparecem se o selo lançou algo no último ano; antes da fundação não existem.
const OTHER_AWARDS31: { c: Cal19; t: L }[] = [
  { c: CRITICS_CAL19, t: N('Enquete da crítica', 'Critics\' poll') },
  { c: INDUSTRY_CAL19, t: N('Prêmios da indústria', 'Industry awards') },
  { c: LIVE_CAL19, t: N('Prêmios do ao vivo', 'Live awards') },
  { c: ECHOES_CAL19, t: N('Hall dos Ecos', 'Hall of Echoes') },
];
registerDeadline('awardcal19', (s) => {
  const mine = mineSet(s);
  if (!releasesNow27(s).some((r) => mine.has(r.actId) && s.week - r.week < 52)) return [];
  const out: Deadline19[] = [];
  for (const { c, t } of OTHER_AWARDS31) {
    const w = nextMonthWeek19(s, c.month);
    const y = c.month > s.month || (c.month === s.month && weekOfMonth19(s, s.year, c.month) >= s.week) ? s.year : s.year + 1;
    if (y < c.start) continue;
    out.push({ id: `aw31:${c.id}:${y}`, w, kind: 'award', t, tone: 'info', goto: { area: 'awards' } });
  }
  return out;
});

// 12. r31 (W0-CAL): compromissos de dinheiro dos festivais próprios (fest12: patrocínio, fornecedores, tiqueteira,
// direitos). A data do festival já entra por 'live'. Lê o estado direto (sem importar fest12: a ordem de carga dos
// sistemas não muda) e sem criar nada.
type Commit31 = { id: string; due: number; amt: number; what: L; done?: boolean };
registerDeadline('fest12', (s) => {
  const st = (s.x4 as unknown as { fest12?: { f?: Record<string, { commits?: Commit31[] }> } }).fest12?.f;
  if (!st) return [];
  const out: Deadline19[] = [];
  for (const f of liveOf(s).fests) for (const c of st[f.id]?.commits ?? []) {
    if (c.done) continue;
    const w = weekOfMonth19(s, Math.floor(c.due / 12), c.due % 12);
    if (w < s.week) continue;
    out.push({ id: `f12:${c.id}`, w, kind: 'money', t: fmtL(N('{f}: {w}', '{f}: {w}'), { f: f.name, w: c.what }), d: fmtL(c.amt < 0 ? N('A pagar: {v}', 'To pay: {v}') : N('A receber: {v}', 'To receive: {v}'), { v: `$${Math.round(Math.abs(c.amt) / 100).toLocaleString('en-US')}` }), tone: c.amt < 0 && s.player.cash < -c.amt ? 'bad' : 'info', goto: { area: 'shows' } });
  }
  return out;
});

// ---------------------------------------------------------------- semana apertada: dica, fato e estresse

registerAdvisorTip('cal19', (s) => {
  const c = crunch19(s, 6, 3)[0];
  if (!c) return [];
  const wk = c.w - s.week;
  return [{
    id: `cal19-crunch-${c.w}`, cat: 'other', level: wk <= 1 ? 'warn' : 'info', score: 50 - wk * 3,
    text: fmtL(N('Semana apertada {q}: {n} prazos caem juntos.', 'Crunch week {q}: {n} deadlines land together.'), { q: wk <= 0 ? N('agora', 'now') : fmtL(N('em {w} semana(s)', 'in {w} week(s)'), { w: wk }), n: c.items.length }),
    why: c.items.slice(0, 4).map((d) => d.t),
    effect: N('Resolver um ou dois antes alivia o estresse do dono e evita que valha o padrão.', 'Clearing one or two early eases the owner\'s stress and avoids defaults.'),
    goto: { area: 'calendar19', label: N('Abrir o calendário', 'Open the calendar') },
  }];
});
registerSimHook('month', 'cal19:crunch', (s) => {
  const c = crunch19(s, 4, 3)[0];
  if (!c) return;
  emitFact(s, { kind: 'crunch', actors: ['player'], severity: 20 + c.items.length * 4, visibility: 'secret', tags: ['cal19'], text: fmtL(N('Mês apertado: {n} prazos na mesma semana.', 'Tight month: {n} deadlines in the same week.'), { n: c.items.length }), src: 'cal19', data: { n: c.items.length, w: c.w } });
});
onFact('crunch', (s, f) => {
  const me = playerPerson(s);
  if (me) addStress(s, me.id, Math.min(8, Number(f.data?.n ?? 3) * 2), N('Prazos acumulados na mesma semana', 'Deadlines piling up in the same week'));
}, 'cal19:stress');

registerExplain('cal19.week', (s, c) => {
  const w = Number(c.w ?? s.week);
  const xs = calendar19(s, { from: w, weeks: 0 });
  if (!xs.length) return null;
  return {
    title: fmtL(N('Prazos da semana {w}', 'Deadlines in week {w}'), { w: w - s.week <= 0 ? N('atual', 'now') : `+${w - s.week}` }), value: xs.length, fmt: 'num',
    parts: xs.map((d) => ({ label: d.t, value: d.act ? N('pede ação', 'needs action').pt : '', tone: d.tone === 'bad' ? 'bad' as const : d.tone === 'good' ? 'good' as const : '', note: d.d })),
    note: N('Calendário único: cartões, ecos, contratos, fábrica, turnês, obras, tribunal, empréstimos e prêmios.', 'Single calendar: cards, echoes, contracts, plant, tours, works, court, loans and awards.'),
  };
});
