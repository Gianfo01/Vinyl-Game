// Rodada 17 — SITUAÇÕES do diretor (RimWorld + CK3). Uma SituationDef é um pequeno drama com elenco: um gatilho
// (um Fact novo ou pressão acumulada — estresse, obrigação, caixa), quem participa (actorsPick) e respostas.
// NPCs escolhem sozinhos pelos traços (persona13: facetas → weightByTraits); quando o elenco inclui você ou seu
// selo, a situação vira um cartão de decisão na mesa (o mesmo da caixa de entrada). Um ORÇAMENTO DE DRAMA mensal
// (por narrador) limita quantas acontecem, e quem acabou de ser protagonista ganha meses de calma:
// "machuca, mas não mata". Cada desfecho publica um Fact (NPC: boato/segredo; você: o que escolheu).
//
//   registerSituation({ id, pressure, cost, cooldown, trigger: ['scandal'], when, actorsPick, title, text, options: [...] })

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { deferEvents, registerExt4, registerSimHook } from '../ext4';
import { emitFact, recentFacts, type Fact, type FactKind } from '../facts17';
import { narratorPace } from '../narrator13';
import type { Decision, GameState } from '../types';
import { fmtL, nextId, playerActs } from '../util';
import { per13, type P13 } from './persona13';

export type Pressure = 'money' | 'heart' | 'law' | 'fame' | 'body' | 'faith' | 'power';
export interface SitCtx {
  /** protagonista: id de pessoa/ato/selo, 'player' ou chave persona13 */
  hero: string;
  /** ato envolvido (se houver) */
  act?: string;
  /** papéis secundários: role → id */
  cast: Record<string, string>;
  fact?: Fact;
  data: Record<string, string | number>;
}
export interface SitOption {
  id: string;
  label: L;
  /** consequência e chance visíveis */
  hint: L;
  /** peso para NPCs (persona do protagonista); padrão 1 */
  weightByTraits?: (P: P13 | null, s: GameState, ctx: SitCtx) => number;
  apply: (s: GameState, ctx: SitCtx, r: Rng) => L | void;
}
export interface SituationDef {
  id: string;
  pressure: Pressure;
  /** custo no orçamento de drama (1 leve … 3 pesado) */
  cost: number;
  /** meses até poder repetir */
  cooldown: number;
  /** tipos de Fact que acordam a situação (o fato chega em ctx.fact); sem trigger = varredura de pressão */
  trigger?: FactKind[];
  when: (s: GameState, ctx: { fact?: Fact }) => boolean;
  actorsPick: (s: GameState, ctx: { fact?: Fact }, r: Rng) => SitCtx | null;
  title: (s: GameState, ctx: SitCtx) => L;
  text: (s: GameState, ctx: SitCtx) => L;
  options: SitOption[];
  /** só acontece com o jogador (não roda entre NPCs) */
  playerOnly?: boolean;
  /** só entre NPCs */
  npcOnly?: boolean;
}

export interface Sit17State {
  /** orçamento de drama */
  b: number;
  /** calma por protagonista (semana até quando) */
  calm: Record<string, number>;
  /** recarga por situação */
  cd: Record<string, number>;
  /** última semana de fatos lida */
  lw: number;
  /** histórico: [ano, mês, sitId, texto] */
  log: [number, number, string, L][];
}
declare module '../ext4' { interface Ext4 { sit17: Sit17State } }
const fresh = (): Sit17State => ({ b: 2, calm: {}, cd: {}, lw: 0, log: [] });
registerExt4('sit17', fresh);
export function sit17(s: GameState): Sit17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.sit17 ??= fresh()) as Sit17State;
  st.calm ??= {}; st.cd ??= {}; st.log ??= []; st.b ??= 2; st.lw ??= 0;
  return st;
}

export const SITS: SituationDef[] = [];
const byId: Record<string, SituationDef> = {};
const PREFIX = 'sit17:';

/** Registra uma situação (e o cartão de decisão correspondente para quando envolve o jogador). */
export function registerSituation(def: SituationDef): void {
  if (byId[def.id]) { const i = SITS.findIndex((x) => x.id === def.id); SITS[i] = def; } else SITS.push(def);
  byId[def.id] = def;
  deferEvents([{
    id: PREFIX + def.id, cat: 'people', tone: 'neutral', tags: [], cooldown: 0, forcedOnly: true, title: l('Situação', 'Situation'), text: l('…', '…'),
    options: def.options.map((o) => ({ id: o.id, label: o.label, hint: o.hint, apply: (s: GameState, _r: Rng, c: Record<string, string | number>) => resolveForPlayer(s, def.id, o.id, c) })),
  }]);
}

// ---------------------------------------------------------------- contexto <-> cartão

function flat(ctx: SitCtx): Record<string, string | number> {
  const c: Record<string, string | number> = { hero: ctx.hero, ...(ctx.act ? { act: ctx.act } : {}), ...(ctx.fact ? { fact: ctx.fact.id } : {}) };
  for (const [k, v] of Object.entries(ctx.cast)) c[`c_${k}`] = v;
  for (const [k, v] of Object.entries(ctx.data)) c[`d_${k}`] = v;
  if (s0Person(ctx)) c.person = s0Person(ctx)!;
  return c;
}
const s0Person = (ctx: SitCtx): string | undefined => ctx.cast.person;
function unflat(s: GameState, c: Record<string, string | number>): SitCtx {
  const ctx: SitCtx = { hero: String(c.hero), cast: {}, data: {} };
  if (c.act) ctx.act = String(c.act);
  for (const [k, v] of Object.entries(c)) { if (k.startsWith('c_')) ctx.cast[k.slice(2)] = String(v); if (k.startsWith('d_')) ctx.data[k.slice(2)] = v; }
  if (c.fact) ctx.fact = recentFacts(s, { months: 24 }).find((f) => f.id === c.fact);
  return ctx;
}

function resolveForPlayer(s: GameState, sitId: string, optId: string, c: Record<string, string | number>): void {
  const def = byId[sitId];
  const opt = def?.options.find((o) => o.id === optId);
  if (!def || !opt) return;
  const ctx = unflat(s, c);
  const r = Rng.fromSeed(`${s.config.seed}:sit17p:${sitId}:${optId}:${s.week}`);
  const res = opt.apply(s, ctx, r);
  record(s, def, ctx, opt, res ?? null, true);
}

function record(s: GameState, def: SituationDef, ctx: SitCtx, opt: SitOption, res: L | null, mine: boolean): void {
  const st = sit17(s);
  const title = def.title(s, ctx);
  const text = res ?? fmtL(l('{t}: {o}.', '{t}: {o}.'), { t: title, o: opt.label });
  st.log.unshift([s.year, s.month, def.id, text]);
  if (st.log.length > 30) st.log.length = 30;
  emitFact(s, {
    kind: 'situation', actors: [ctx.hero, ...(ctx.act ? [ctx.act] : []), ...Object.values(ctx.cast)], place: ctx.act ? s.acts[ctx.act]?.city : undefined,
    severity: def.cost * 15, visibility: mine ? 'public' : def.cost >= 2 ? 'rumor' : 'secret', tags: [def.pressure, `sit:${def.id}`, `opt:${opt.id}`],
    text, src: 'situations17', cause: ctx.fact ? [ctx.fact.id] : undefined,
  });
}

// ---------------------------------------------------------------- quem é "o jogador" num elenco

export function involvesPlayer(s: GameState, ctx: SitCtx): boolean {
  const ids = [ctx.hero, ...(ctx.act ? [ctx.act] : []), ...Object.values(ctx.cast)];
  const mine = new Set(playerActs(s));
  return ids.some((id) => id === 'player' || mine.has(id) || s.persons[id]?.isPlayer || [...mine].some((a) => s.acts[a]?.members.includes(id)));
}
const keyOf = (s: GameState, id: string): string => (s.persons[id] ? `p:${id}` : id);

/** Escolha do NPC: pesos pelos traços do protagonista, sorteio próprio. */
export function npcChoice(s: GameState, def: SituationDef, ctx: SitCtx, r: Rng): SitOption {
  const P = per13(s, keyOf(s, ctx.hero));
  const ws = def.options.map((o) => Math.max(0.01, o.weightByTraits ? o.weightByTraits(P, s, ctx) : 1));
  return r.weighted(def.options.map((o, i) => [o, ws[i]] as [SitOption, number]), (x) => x[1])![0];
}

// ---------------------------------------------------------------- diretor mensal

/** Tetos: 1 situação sua por mês (mesa cheia → nenhuma), até 3 entre NPCs. */
export function runSituations(s: GameState): { mine: string[]; npc: string[] } {
  const st = sit17(s);
  const r = Rng.fromSeed(`${s.config.seed}:sit17:${s.week}`);
  const pace = narratorPace(s.config.storyteller);
  st.b = clamp(st.b * 0.5 + 1.2 + pace.freq * 0.9 + (pace.random ? r.float(-0.6, 0.9) : 0), 0, 6);
  const facts = recentFacts(s, { sinceWeek: st.lw + 1 }).reverse();
  st.lw = s.week;
  const struggling = s.player.cash < 0 || s.player.insolvencyMonths > 0;
  const out = { mine: [] as string[], npc: [] as string[] };
  const order = r.shuffle([...SITS]);
  for (const def of order) {
    if (st.b < def.cost) continue;
    if ((st.cd[def.id] ?? 0) > s.week) continue;
    const cands: { fact?: Fact }[] = def.trigger ? facts.filter((f) => def.trigger!.includes(f.kind)).slice(-4).map((fact) => ({ fact })) : [{}];
    for (const c of cands) {
      if (!def.when(s, c)) continue;
      const ctx = def.actorsPick(s, c, r);
      if (!ctx || (st.calm[ctx.hero] ?? 0) > s.week) continue;
      const mine = involvesPlayer(s, ctx);
      if (mine) {
        if (def.npcOnly || out.mine.length >= 1 || s.decisions.length >= 4) continue;
        if (struggling && (def.pressure === 'money' || def.cost >= 3)) continue; // machuca, mas não mata
        const opts = def.options;
        const d: Decision = {
          id: nextId(s, 'd'), eventId: PREFIX + def.id, cat: 'people', title: def.title(s, ctx), text: def.text(s, ctx),
          options: opts.map((o) => ({ id: o.id, label: o.label, hint: o.hint })), ctx: flat(ctx), week: s.week, defaultOption: opts[opts.length - 1].id, tags: [],
        };
        s.decisions.push(d);
        out.mine.push(def.id);
      } else {
        if (def.playerOnly || out.npc.length >= 3) continue;
        const opt = npcChoice(s, def, ctx, r);
        const res = opt.apply(s, ctx, r);
        record(s, def, ctx, opt, res ?? null, false);
        out.npc.push(def.id);
      }
      st.b -= def.cost;
      st.cd[def.id] = s.week + Math.round(def.cooldown * 4.35);
      st.calm[ctx.hero] = s.week + (mine ? 13 : 26);
      break;
    }
  }
  for (const k of Object.keys(st.calm)) if (st.calm[k] < s.week) delete st.calm[k];
  return out;
}

registerSimHook('month', 'situations17', (s) => { runSituations(s); });

export const situationById = (id: string): SituationDef | undefined => byId[id];
