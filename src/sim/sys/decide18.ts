// Rodada 18 (decide18) — estado e motor dos ECOS: cada escolha registrada em decide18.ts agenda o que pode voltar
// (semanas/meses depois). No mês do disparo: Rng próprio semeado, condição lida no estado de então, efeito, Fato
// (facts17, com a causa) e mensagem na Caixa no MESMO FIO da decisão original ("continuação de…"). Também:
// portões de opção (DEC_GATE18), prazos curtos (ctx.dl18 → vence na semana), desbloqueios e o PULSO do mês
// (série curta de caixa/fãs/humor/paradas para o Cockpit e o resumo ao avançar).

import { Rng } from '../../core/rng';
import { l, type L } from '../../data/world';
import { conseq18, echoP18, evKey18, Fx18, fuzzy18, type Ctx18, type EchoSpec18, type Tone18 } from '../decide18';
import { DEC_GATE18, registerDecisionListener, registerExt4, registerSimHook } from '../ext4';
import { registerExplain } from '../explain18';
import { emitFact } from '../facts17';
import { pushInbox18, registerAdvisorTip, registerInboxKind } from '../inbox18';
import { PA_AFTER18 } from '../personact18';
import type { GameState } from '../types';
import { fmtL, notify, playerActs } from '../util';
import { resolveDecision } from '../events';
import { MSG_AFTER18 } from './people/inbox';

export interface Echo18 {
  id: string;
  /** chave do registro + índice do eco */
  k: string; i: number;
  /** título e escolha originais (fio) */
  t: L; o: L;
  c: Ctx18;
  w0: number; due: number;
  tone: Tone18; hint: L; p: number;
}
export interface Thread18 { id: string; t: L; o: L; w: number; n: number }
export interface Pulse18 { w: number; cash: number[]; fans: number[]; mood: number[]; hits: number[]; last?: { cash: number; fans: number; mood: number; hits: number; best: number; fired: number } }
export interface Dec18State {
  q: Echo18[];
  /** ecos já resolvidos: [semana, título, manchete, tom, fio] */
  done: [number, L, L, Tone18 | 'miss', string][];
  unl: Record<string, number>;
  th: Thread18[];
  seq: number;
  pl: Pulse18;
  /** ecos disparados no mês corrente (para o resumo) */
  fm: number;
}
declare module '../ext4' { interface Ext4 { dec18: Dec18State } }
const fresh = (): Dec18State => ({ q: [], done: [], unl: {}, th: [], seq: 0, pl: { w: -1, cash: [], fans: [], mood: [], hits: [] }, fm: 0 });
registerExt4('dec18', fresh);
export function dec18(s: GameState): Dec18State {
  const x = s.x4 as unknown as { dec18?: Dec18State };
  const st = (x.dec18 ??= fresh());
  st.q ??= []; st.done ??= []; st.unl ??= {}; st.th ??= []; st.seq ??= 0; st.fm ??= 0;
  st.pl ??= { w: -1, cash: [], fans: [], mood: [], hits: [] };
  return st;
}

const W = 4.35;
/** Agenda os ecos de uma escolha. Devolve quantos ficaram pendentes. */
export function schedule18(s: GameState, key: string, c: Ctx18, title: L, pick: L): number {
  const spec = conseq18(key);
  if (!spec) return 0;
  const st = dec18(s);
  if (spec.unlock) st.unl[spec.unlock] = s.week;
  if (!spec.later?.length) return 0;
  const tid = `t${++st.seq}`;
  const r = Rng.fromSeed(`${s.config.seed}:dec18:${key}:${s.week}:${st.seq}`);
  let n = 0;
  spec.later.forEach((e, i) => {
    const p = echoP18(s, e, c);
    if (p <= 0) return;
    const m = r.float(e.in[0], e.in[1]);
    st.q.push({ id: `${tid}.${i}`, k: key, i, t: title, o: pick, c: { ...c, e18: `${tid}.${i}` }, w0: s.week, due: s.week + Math.max(1, Math.round(m * W)), tone: e.tone, hint: e.hint, p });
    n++;
  });
  if (n) {
    st.th.unshift({ id: tid, t: title, o: pick, w: s.week, n });
    if (st.th.length > 60) st.th.length = 60;
  }
  if (st.q.length > 80) st.q.splice(0, st.q.length - 80);
  return n;
}

const threadOf = (e: Echo18): string => e.id.split('.')[0];

/** Dispara um eco (público para os testes). */
export function fire18(s: GameState, e: Echo18): { text: L; tone: Tone18 | 'miss' } | null {
  const spec = conseq18(e.k)?.later?.[e.i];
  if (!spec) return null;
  const r = Rng.fromSeed(`${s.config.seed}:echo18:${e.id}:${e.k}`);
  const f = new Fx18(s, e.c, r);
  // quem saiu do mundo leva o eco junto
  if ((e.c.act && !s.acts[String(e.c.act)]) || (e.c.person && !s.persons[String(e.c.person)]?.alive)) return null;
  const okCond = !spec.when || safe(() => spec.when!(s, e.c), false);
  let text: L | void = undefined;
  let tone: Tone18 | 'miss' = spec.tone;
  if (okCond && r.chance(e.p)) text = spec.fx(f);
  else if (spec.miss) { text = spec.miss(f); tone = 'miss'; }
  if (!text) return null;
  const st = dec18(s);
  st.done.unshift([s.week, e.t, text, tone, threadOf(e)]);
  if (st.done.length > 40) st.done.length = 40;
  st.fm++;
  const body = f.lines.length ? fmtL(l('{t}\n\nEfeitos: {e}.', '{t}\n\nEffects: {e}.'), { t: text, e: { pt: f.lines.map((x) => x.pt).join(' · '), en: f.lines.map((x) => x.en).join(' · ') } }) : text;
  pushInbox18(s, 'echo18', {
    from: l('Consequências', 'Consequences').pt,
    subject: fmtL(l('↳ {t}', '↳ {t}'), { t: e.t }),
    body: fmtL(l('Você escolheu "{o}". {b}', 'You chose "{o}". {b}'), { o: e.o, b: body }),
    tone: tone === 'good' ? 'good' : tone === 'bad' ? 'bad' : 'info',
    ref: { thr: threadOf(e), ...(e.c.act ? { act: e.c.act } : {}), ...(e.c.person ? { person: e.c.person } : {}), tone },
  });
  emitFact(s, {
    kind: 'echo', actors: [e.c.person ? `p:${e.c.person}` : e.c.act ? String(e.c.act) : 'player'], severity: tone === 'bad' ? 35 : 20,
    visibility: tone === 'bad' ? 'rumor' : 'public', tags: ['echo18', String(tone), e.k], text, src: 'decide18',
  });
  return { text, tone };
}
function safe<T>(fn: () => T, d: T): T { try { return fn(); } catch { return d; } }

function monthEcho(s: GameState): void {
  const st = dec18(s);
  st.fm = 0;
  const due = st.q.filter((e) => e.due <= s.week);
  if (!due.length) return;
  st.q = st.q.filter((e) => e.due > s.week);
  // no máximo 3 por mês (os outros esperam um pouco: o mundo não desaba de uma vez)
  due.sort((a, b) => a.due - b.due);
  for (const e of due.slice(3)) { e.due = s.week + Math.round(W); st.q.push(e); }
  for (const e of due.slice(0, 3)) safe(() => fire18(s, e), null);
}

// ---------------------------------------------------------------- ganchos de escolha

registerDecisionListener('decide18', (s, eventId, opt, ctx) => {
  const d = s.decisions.find((x) => x.eventId === eventId && (!ctx || x.ctx === ctx));
  const title = d?.title ?? l(eventId, eventId);
  const pick = d?.options.find((o) => o.id === opt)?.label ?? l(opt, opt);
  schedule18(s, evKey18(eventId, opt), { ...(ctx ?? {}) }, title, pick);
});
MSG_AFTER18.push((s, m, action) => {
  const k = m.ref?.k18;
  if (!k) return;
  const c: Ctx18 = {};
  for (const [a, b] of Object.entries(m.ref ?? {})) if (typeof b === 'string' || typeof b === 'number') c[a] = b;
  schedule18(s, `ib:${k}:${action}`, c, m.subject, m.actions?.find((a) => a.id === action)?.label ?? l(action, action));
});
PA_AFTER18.push((s, id, key, ok) => {
  const c: Ctx18 = { pk: key, ...(key.startsWith('p:') ? { person: key.slice(2) } : {}) };
  const name = key.startsWith('p:') ? s.persons[key.slice(2)]?.name ?? key : key;
  schedule18(s, `pa:${id}:${ok ? 'ok' : 'fail'}`, c, fmtL(l('Ação com {n}', 'Action with {n}'), { n: name }), l(id, id));
});

// portões: bloqueada → vira a opção padrão (o jogador vê o motivo no cartão)
export function gateOf18(s: GameState, eventId: string, opt: string, ctx: Ctx18): L | null {
  const g = conseq18(evKey18(eventId, opt))?.gate;
  return g ? safe(() => g(s, ctx), null) : null;
}
DEC_GATE18.f = (s, ev, opt, ctx) => !!gateOf18(s, ev, opt, ctx);

// prazos curtos: decisões com ctx.dl18 vencem na semana (aplicam o padrão)
registerSimHook('week', 'decide18:dl', (s) => {
  for (const d of [...s.decisions]) {
    const dl = Number(d.ctx.dl18 ?? 0);
    if (dl && dl <= s.week) {
      notify(s, fmtL(l('Prazo vencido: "{t}" — valeu a opção padrão.', 'Deadline passed: "{t}" — the default applied.'), { t: d.title }), 'event');
      resolveDecision(s, d.id, d.defaultOption);
    }
  }
});

// ---------------------------------------------------------------- pulso do mês (Cockpit e resumo)

export function pulseNow18(s: GameState): { cash: number; fans: number; mood: number; hits: number; best: number } {
  const acts = playerActs(s).map((id) => s.acts[id]).filter(Boolean);
  let fans = 0, mood = 0, n = 0;
  for (const a of acts) {
    fans += a.fans.casual + a.fans.active + a.fans.core;
    for (const id of a.members) { const p = s.persons[id]; if (p?.alive) { mood += p.morale - p.stress * 0.5; n++; } }
  }
  const mine = [...s.charts.singles, ...s.charts.albums].filter((e) => s.releases[e.releaseId]?.owner === 'player' || s.acts[s.releases[e.releaseId]?.actId]?.owner === 'player');
  return { cash: s.player.cash, fans, mood: n ? Math.round(mood / n) : 50, hits: mine.length, best: mine.length ? Math.min(...mine.map((e) => e.pos)) : 0 };
}
registerSimHook('month', 'decide18', (s) => {
  monthEcho(s);
  const st = dec18(s), P = st.pl, now = pulseNow18(s);
  const prev = { cash: P.cash.at(-1) ?? now.cash, fans: P.fans.at(-1) ?? now.fans, mood: P.mood.at(-1) ?? now.mood, hits: P.hits.at(-1) ?? now.hits };
  P.last = { cash: now.cash - prev.cash, fans: now.fans - prev.fans, mood: now.mood - prev.mood, hits: now.hits - prev.hits, best: now.best, fired: st.fm };
  P.cash.push(now.cash); P.fans.push(now.fans); P.mood.push(now.mood); P.hits.push(now.hits);
  for (const k of ['cash', 'fans', 'mood', 'hits'] as const) if (P[k].length > 24) P[k].splice(0, P[k].length - 24);
  P.w = s.week;
});

// ---------------------------------------------------------------- leitura (interface)

export interface Pending18 { id: string; t: L; o: L; hint: L; tone: Tone18; chance: L; from: number; to: number; thr: string }
/** O que pode voltar, sem spoiler: janela aproximada (nunca a semana exata) e incerteza em palavras. */
export function pending18(s: GameState): Pending18[] {
  return dec18(s).q.map((e) => {
    const spec = conseq18(e.k)?.later?.[e.i] as EchoSpec18 | undefined;
    const span = spec ? Math.round(((spec.in[1] - spec.in[0]) * W) / 2) : 4;
    return { id: e.id, t: e.t, o: e.o, hint: e.hint, tone: e.tone, chance: fuzzy18(e.p), from: Math.max(s.week, e.due - span), to: e.due + span, thr: threadOf(e) };
  }).sort((a, b) => a.from - b.from);
}
export const thread18 = (s: GameState, id: string): Thread18 | undefined => dec18(s).th.find((t) => t.id === id);

registerInboxKind('echo18', {
  label: l('Consequência', 'Consequence'), cat: 'decision', icon: 'clock', prio: 1,
  goto: (_s, m) => (m.ref?.act ? { act: String(m.ref.act) } : m.ref?.person ? { person: `p:${m.ref.person}` } : null),
});

registerExplain('dec18.pending', (s) => {
  const P = pending18(s);
  if (!P.length) return null;
  const bad = P.filter((x) => x.tone === 'bad').length, good = P.filter((x) => x.tone === 'good').length;
  return {
    title: l('Consequências pendentes', 'Pending consequences'), value: P.length, fmt: 'num',
    parts: [
      { label: l('Podem morder', 'May bite'), value: bad, fmt: 'num', tone: 'bad' },
      { label: l('Podem render', 'May pay off'), value: good, fmt: 'num', tone: 'good' },
      { label: l('Incertas', 'Uncertain'), value: P.length - bad - good, fmt: 'num' },
    ],
    note: l('Escolhas antigas voltam semanas ou meses depois — com chance e condição lidas no momento (a promessa foi cumprida? o ato ainda está com você?). No máximo 3 por mês.',
      'Past choices return weeks or months later — with odds and conditions read at that time (was the promise kept? is the act still with you?). At most 3 per month.'),
  };
});

registerAdvisorTip('decide18', (s) => {
  const P = pending18(s).filter((x) => x.tone === 'bad' && x.from - s.week <= 5);
  if (!P.length) return [];
  return [{
    id: 'dec18-soon', level: 'info', cat: 'other', score: 35,
    text: fmtL(l('{n} escolha(s) antiga(s) podem voltar a te morder nas próximas semanas.', '{n} past choice(s) may come back to bite you in the coming weeks.'), { n: P.length }),
    why: P.slice(0, 3).map((x) => fmtL(l('"{t}" → {o}: {h}', '"{t}" → {o}: {h}'), { t: x.t, o: x.o, h: x.hint })),
    goto: { area: 'inbox' },
  }];
});

/** Odds de uma aposta num cartão (mesmo número usado no sorteio). */
export function odds18(s: GameState, eventId: string, opt: string, c: Ctx18): { p: number; why: L[] } | null {
  const o = conseq18(evKey18(eventId, opt))?.odds;
  return o ? safe(() => o(s, c), null) : null;
}
registerExplain('dec18.odds', (s, c) => {
  const d = s.decisions.find((x) => x.id === c.d);
  const o = d ? odds18(s, d.eventId, String(c.opt), d.ctx) : null;
  if (!d || !o) return null;
  return { title: l('Chance da aposta', 'Gamble odds'), value: Math.round(o.p * 100), fmt: 'pct', parts: o.why.map((w) => ({ label: w })), note: l('O sorteio usa exatamente este número (Rng próprio, semeado).', 'The roll uses exactly this number (own seeded Rng).') };
});

