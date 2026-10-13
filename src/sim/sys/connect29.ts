// R29 (CONNECT): fonte canônica de "quem passou por qual ato". Antes cada vista lia uma fonte diferente:
//  - página do ato → Integrantes/Ex-integrantes: act.members + rw.former;
//  - ficha → Carreira ("Atos:"): só act.members (ex-bandas sumiam);
//  - ficha → Alma ("Bandas:" e a crônica): chron9.mem, que só registra atos ativos e notáveis A PARTIR do início da run
//    (quem saiu antes do início não aparecia na biografia);
//  - ficha → Trajetória e Formação do ato: members + former + log de formação (lineup16).
// Este índice junta as quatro (sem RNG e sem escrever no estado: só leitura, cache por semana) e as duas pontas leem dele,
// então "ex-integrante de X" na página de X ⇔ X nos atos de carreira da pessoa — por construção.
import { l16, segTxt, stints16 } from './lineup16';
import { biography, chronState, type ChronEv } from './chron9';
import { rw } from './realworld';
import type { Act, GameState } from '../types';

export interface Seg29 { from: number; to?: number }
export interface CareerAct29 { act: Act; segs: Seg29[]; current: boolean; solo: boolean }
export interface ExMember29 { pid: string; year: number; reason: 'left' | 'died' | 'retired' | 'fired' }

const live = (a: Act) => a.status === 'active' || a.status === 'emerging' || a.status === 'hiatus';

type Idx29 = { k: string; byP: Map<string, Set<string>>; byA: Map<string, Set<string>>; chronY: Map<string, number> };
const CACHE = new WeakMap<GameState, Idx29>();

function index29(s: GameState): Idx29 {
  const st = rw(s), ev = l16(s).ev, mem = chronState(s).mem;
  const k = `${s.week}|${s.day}|${ev.length}|${Object.keys(s.acts).length}|${Object.keys(mem).length}`;
  const c = CACHE.get(s);
  if (c && c.k === k) return c;
  const byP = new Map<string, Set<string>>(), byA = new Map<string, Set<string>>(), chronY = new Map<string, number>();
  const put = (pid: string, aid: string) => {
    if (!s.persons[pid] || !s.acts[aid]) return;
    (byP.get(pid) ?? byP.set(pid, new Set()).get(pid)!).add(aid);
    (byA.get(aid) ?? byA.set(aid, new Set()).get(aid)!).add(pid);
  };
  for (const a of Object.values(s.acts)) {
    for (const pid of a.members) put(pid, a.id);
    for (const f of st.former[a.id] ?? []) put(f.personId, a.id);
  }
  for (const e of ev) put(e[2], e[1]);
  for (const [pid, list] of Object.entries(mem)) for (const x of list) {
    const [aid, y] = x.split(':');
    put(pid, aid);
    chronY.set(`${pid}|${aid}`, Number(y));
  }
  const out = { k, byP, byA, chronY };
  CACHE.set(s, out);
  return out;
}

/** Passagens da pessoa pelo ato: as da formação (stints16); sem registro lá, o ano da crônica; morte fecha a passagem. */
function segsOf(s: GameState, a: Act, pid: string, ix: Idx29): Seg29[] {
  const me = stints16(s, a).find((x) => x.pid === pid);
  const segs = me?.segs.map((g) => ({ ...g })) ?? [{ from: ix.chronY.get(`${pid}|${a.id}`) ?? a.formed }];
  const p = s.persons[pid];
  const last = segs[segs.length - 1];
  if (p && !p.alive && p.died !== undefined && last && last.to === undefined) last.to = Math.max(last.from, p.died);
  return segs;
}

/** Todos os atos de carreira da pessoa (bandas atuais e antigas, solos), em ordem de entrada. */
export function careerActs29(s: GameState, pid: string): CareerAct29[] {
  const ix = index29(s), p = s.persons[pid];
  const out: CareerAct29[] = [];
  for (const aid of ix.byP.get(pid) ?? []) {
    const a = s.acts[aid];
    const segs = segsOf(s, a, pid, ix);
    const people = ix.byA.get(aid)?.size ?? 1;
    out.push({ act: a, segs, current: a.members.includes(pid) && live(a) && !!p?.alive, solo: people === 1 && a.members.length <= 1 });
  }
  // filho(a) herdeiro(a) de um ato (dinastia) continua listado como antes na aba Carreira
  if (p?.parentId && s.acts[p.parentId]?.history.length && !out.some((x) => x.act.id === p.parentId)) out.push({ act: s.acts[p.parentId], segs: [{ from: s.acts[p.parentId].formed }], current: false, solo: false });
  return out.sort((x, y) => x.segs[0].from - y.segs[0].from);
}

/** Ex-integrantes do ato (todos que passaram e não estão na formação atual), com o motivo/ano mais preciso que houver. */
export function exMembers29(s: GameState, a: Act): ExMember29[] {
  const ix = index29(s), f = rw(s).former[a.id] ?? [];
  const out: ExMember29[] = [];
  for (const pid of ix.byA.get(a.id) ?? []) {
    if (a.members.includes(pid)) continue;
    const p = s.persons[pid];
    const rec = [...f].reverse().find((x) => x.personId === pid);
    const segs = segsOf(s, a, pid, ix);
    const year = rec?.year ?? segs[segs.length - 1].to ?? s.year;
    out.push({ pid, year, reason: rec?.reason ?? (p && !p.alive && p.died !== undefined && p.died <= year ? 'died' : 'left') });
  }
  return out.sort((x, y) => x.year - y.year);
}

/** Texto curto "1965–1968, 1975–" das passagens (mesmo formato da Formação). */
export const segs29 = (x: CareerAct29): string => segTxt(x.segs);

/** Crônica de uma pessoa: o que a cita e o que aconteceu (importância ≥ 2) com os atos dela DURANTE as passagens —
 *  as passagens vêm de careerActs29 (antes só de chron9.mem, sem as bandas anteriores ao início da run). */
export function biography29(s: GameState, pid: string): ChronEv[] {
  if (!s.persons[pid]) return biography(s, pid);
  const spans = careerActs29(s, pid).flatMap((x) => x.segs.map((g) => ({ a: x.act.id, from: g.from, to: g.to ?? 9999 })));
  return chronState(s).ev.filter((e) => e.a?.includes(pid) || (e.i >= 2 && spans.some((x) => e.a?.[0] === x.a && e.y >= x.from && e.y <= x.to)));
}

export interface PersonFeat29 { songId: string; title: string; hostActId: string; year: number; via: 'person' | 'act'; actId?: string }
/** R29 (feat de pessoa): participações da pessoa — as dela, pessoa a pessoa (creation.songs[].featPersons), e as do ato
 *  inteiro de uma banda/carreira dela (careerActs29) gravadas durante a passagem. Só leitura; mais recentes primeiro. */
export function personFeats29(s: GameState, pid: string, limit = 24): PersonFeat29[] {
  const songs = (s.x4 as unknown as { creation?: { songs: Record<string, { featuring?: string; featPersons?: string[] }> } }).creation?.songs ?? {};
  const spans = careerActs29(s, pid).flatMap((x) => x.segs.map((g) => ({ a: x.act.id, from: g.from, to: g.to ?? 9999 })));
  const out: PersonFeat29[] = [];
  for (const [id, x] of Object.entries(songs)) {
    const so = s.songs[id];
    if (!so || (!x.featuring && !x.featPersons?.length)) continue;
    const rel = so.releaseId ? s.releases[so.releaseId] : undefined;
    const year = rel?.year ?? s.year - Math.max(0, Math.floor((s.week - so.createdWeek) / 52));
    if (x.featPersons?.includes(pid)) out.push({ songId: id, title: so.title, hostActId: so.actId, year, via: 'person' });
    else if (x.featuring && spans.some((g) => g.a === x.featuring && year >= g.from && year <= g.to)) out.push({ songId: id, title: so.title, hostActId: so.actId, year, via: 'act', actId: x.featuring });
  }
  return out.sort((a, b) => b.year - a.year).slice(0, limit);
}
