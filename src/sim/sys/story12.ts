// Rodada 12 — "História do selo": retrospectiva visual da partida (a qualquer momento e no fim). Junta o
// que já existe — marcos da Retrospectiva (retro8), fatos da crônica (chron9) com atos do selo, memórias
// importantes do diário, arcos dos artistas (arcs12), sucessões (heirs8) e a vida pessoal que cruzou com
// o selo (life12) — numa linha do tempo por capítulos, com gráficos de receita, reputação e fama do
// elenco (fotografia anual guardada aqui) e as pessoas-chave. Só lê o passado: nada do futuro aparece.

import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { decadeOf, fmtL, playerActs } from '../util';
import { arcs, arcTitle, arcWeight } from './arcs12';
import { chronState } from './chron9';
import { life12 } from './life12';
import { eraName, retrospective } from './retro8';

export interface Snap { y: number; rep: [number, number, number, number]; fame: number; roster: number; cash: number }
export interface Story12 { snaps: Snap[] }
declare module '../ext4' { interface Ext4 { story12: Story12 } }
registerExt4('story12', () => ({ snaps: [] }));
export function story12(s: GameState): Story12 {
  const x = s.x4 as unknown as { story12?: Story12 };
  x.story12 ??= { snaps: [] };
  x.story12.snaps ??= [];
  return x.story12;
}

export function snapNow(s: GameState): Snap {
  const R = s.player.reputation;
  const fames = playerActs(s).map((id) => s.acts[id]?.fame ?? 0).sort((a, b) => b - a).slice(0, 5);
  return { y: s.year, rep: [R.artistic, R.commercial, R.artists, R.institutional].map((v) => Math.round(v)) as Snap['rep'], fame: Math.round(fames.reduce((a, b) => a + b, 0) / Math.max(1, fames.length)), roster: playerActs(s).length, cash: s.player.cash };
}
registerSimHook('year', 'story12', (s) => {
  const st = story12(s);
  const sn = snapNow(s);
  st.snaps = st.snaps.filter((x) => x.y !== sn.y);
  st.snaps.push(sn);
  if (st.snaps.length > 220) st.snaps.shift();
});

export type Tone = 'peak' | 'crisis' | 'release' | 'decision' | 'people' | 'life';
export interface StoryItem { y: number; m: number; tone: Tone; t: L; act?: string; rel?: string; i: number }
export interface Chapter { decade: number; name: L; items: StoryItem[]; rev: number }
export interface KeyPerson { kind: 'act' | 'owner' | 'staff' | 'rival' | 'family'; name: string; id?: string; role: L; note?: L; w?: number }
export interface LabelStory {
  years: [number, number];
  chapters: Chapter[];
  revenue: { y: number; v: number; p: number }[];
  snaps: Snap[];
  peak?: { y: number; v: number };
  crisis?: { y: number; v: number };
  people: KeyPerson[];
  arcs: { act: string; title: L; w: number; n: number }[];
  counts: Record<Tone, number>;
}

const CRISIS = new Set(['left', 'broken_promise', 'sniped', 'masters_sold', 'insolvency', 'split', 'death', 'breakdown', 'scandal', 'lawsuit']);
const OWN = new Set(['succession', 'life', 'masters_sold', 'decision', 'insolvency', 'takeover', 'ipo', 'merger', 'hq', 'expansion']);
const PEAK = new Set(['number1', 'award', 'hall_of_fame', 'legend', 'record', 'rise', 'masterwork']);

/** Monta a história do selo a partir do estado (sem custo de save além das fotografias anuais). */
export function labelStory(s: GameState): LabelStory {
  const items: StoryItem[] = [];
  const seen = new Set<string>();
  const add = (x: StoryItem) => { const k = `${x.y}|${x.t.pt}`; if (seen.has(k)) return; seen.add(k); items.push(x); };
  const rt = retrospective(s);
  for (const m of rt.milestones) add({ y: m.year, m: 0, tone: m.kind === 'first' ? 'release' : 'peak', t: fmtL(l('{k}: "{r}"', '{k}: "{r}"'), { k: m.label, r: m.releaseId ? s.releases[m.releaseId]?.title ?? '' : '' }), act: m.actId, rel: m.releaseId, i: m.kind === 'first' ? 3 : 4 });
  for (const e of rt.eras) if (e.best) add({ y: e.best.year, m: 0, tone: 'release', t: fmtL(l('Maior disco da década: "{t}"', 'Biggest record of the decade: "{t}"'), { t: e.best.title }), act: e.best.actId, rel: e.best.id, i: 3 });
  // crônica: fatos do mundo que envolvem atos que já foram do selo
  const ours = new Set(rt.alumni.map((a) => a.actId));
  for (const e of chronState(s).ev) {
    if (e.i < 3 || !e.a?.some((id) => ours.has(id))) continue;
    const tone: Tone = CRISIS.has(e.k) ? 'crisis' : PEAK.has(e.k) ? 'peak' : 'people';
    if (tone === 'people' && e.i < 4) continue;
    add({ y: e.y, m: e.m, tone, t: e.t, act: e.a.find((id) => ours.has(id)), i: e.i });
  }
  // memórias importantes do diário: decisões, saídas, sucessões
  for (const m of s.memory) {
    if (!m.important || m.kind.startsWith('event:')) continue;
    if (m.actId ? !ours.has(m.actId) : !OWN.has(m.kind)) continue;
    const tone: Tone = CRISIS.has(m.kind) ? 'crisis' : PEAK.has(m.kind) ? 'peak' : m.kind === 'succession' || m.kind === 'life' ? 'life' : m.kind.startsWith('decision') ? 'decision' : 'people';
    add({ y: m.year, m: m.month, tone, t: m.text, act: m.actId, i: 3 });
  }
  // arcos: capítulos de peso
  for (const [id, list] of Object.entries(arcs(s).log)) for (const e of list) if (Math.abs(e.w) >= 0.2) add({ y: e.y, m: e.m, tone: 'decision', t: fmtL(l('{a}: {t}', '{a}: {t}'), { a: s.acts[id]?.name ?? '?', t: e.t }), act: id, i: 3 });
  for (const x of life12(s).log) add({ y: x.y, m: 11, tone: 'life', t: x.t, i: 3 });
  // receita: pico e pior ano
  const revenue = Object.keys(s.player.revenueByYear).map(Number).filter((y) => y <= s.year).sort((a, b) => a - b).map((y) => ({ y, v: s.player.revenueByYear[y] ?? 0, p: s.player.profitByYear[y] ?? 0 }));
  const done = revenue.filter((x) => x.y < s.year);
  const peak = done.length ? done.reduce((a, b) => (b.v > a.v ? b : a)) : undefined;
  const worst = done.length ? done.reduce((a, b) => (b.p < a.p ? b : a)) : undefined;
  if (peak && peak.v > 0) add({ y: peak.y, m: 11, tone: 'peak', t: l('Ano de maior receita do selo', 'The label\'s best revenue year'), i: 4 });
  if (worst && worst.p < 0) add({ y: worst.y, m: 11, tone: 'crisis', t: l('Pior ano: o selo fechou no vermelho', 'Worst year: the label closed in the red'), i: 4 });
  items.sort((a, b) => a.y - b.y || a.m - b.m || b.i - a.i);
  const chMap = new Map<number, Chapter>();
  for (const x of items) {
    const d = decadeOf(x.y);
    const c = chMap.get(d) ?? { decade: d, name: eraName(d), items: [], rev: 0 };
    c.items.push(x);
    chMap.set(d, c);
  }
  for (const r of revenue) { const c = chMap.get(decadeOf(r.y)); if (c) c.rev += r.v; }
  // pessoas-chave
  const people: KeyPerson[] = [];
  const lin = (s.x4 as unknown as { heirs8?: { lineage: { name: string; from: number; to: number }[] } }).heirs8?.lineage ?? [];
  for (const x of lin) people.push({ kind: 'owner', name: x.name, role: fmtL(l('Dono(a) {a}–{b}', 'Owner {a}–{b}'), { a: x.from, b: x.to }) });
  const o = (s.x4 as unknown as { people?: { owner?: { name: string; since?: number } } }).people?.owner;
  if (o) people.push({ kind: 'owner', name: o.name, role: fmtL(l('Dono(a) desde {a}', 'Owner since {a}'), { a: o.since ?? s.config.startYear }) });
  const arcList = rt.alumni.map((a) => ({ a, act: s.acts[a.actId] })).filter((x) => x.act).map(({ a, act }) => ({ act: a.actId, title: arcTitle(s, act!), w: arcWeight(s, act!).v, n: arcs(s).log[a.actId]?.length ?? 0, units: a.units }));
  for (const x of arcList.slice().sort((a, b) => b.units - a.units).slice(0, 6)) people.push({ kind: 'act', name: s.acts[x.act].name, id: x.act, role: x.title, w: x.w });
  for (const sf of s.player.staff.slice().sort((a, b) => b.skill - a.skill).slice(0, 3)) people.push({ kind: 'staff', name: sf.name, role: l('Equipe', 'Staff'), note: fmtL(l('habilidade {k}', 'skill {k}'), { k: Math.round(sf.skill) }) });
  for (const [id, v] of Object.entries(s.rivalries).sort((a, b) => b[1] - a[1]).slice(0, 2)) if (s.labels[id] && v > 20) people.push({ kind: 'rival', name: s.labels[id].name, role: l('Rival', 'Rival'), note: fmtL(l('rivalidade {v}', 'rivalry {v}'), { v: Math.round(v) }) });
  const counts = { peak: 0, crisis: 0, release: 0, decision: 0, people: 0, life: 0 } as Record<Tone, number>;
  for (const x of items) counts[x.tone]++;
  const snaps = story12(s).snaps.filter((x) => x.y < s.year).concat([snapNow(s)]);
  return {
    years: [Math.min(s.config.startYear, ...items.map((x) => x.y)), s.year], chapters: [...chMap.values()].sort((a, b) => a.decade - b.decade), revenue, snaps,
    peak: peak ? { y: peak.y, v: peak.v } : undefined, crisis: worst && worst.p < 0 ? { y: worst.y, v: worst.p } : undefined, people,
    arcs: arcList.filter((x) => x.n).sort((a, b) => Math.abs(b.w) - Math.abs(a.w)).slice(0, 12).map(({ act, title, w, n }) => ({ act, title, w, n })), counts,
  };
}
