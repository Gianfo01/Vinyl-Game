// Retrospectiva (rodada 8): o catálogo conta a história da run — discos por era, capas, prêmios e
// certificados, primeiros hits e maiores apostas, artistas que passaram pelo selo, rompimentos e
// reencontros, e a influência nas cenas e nos gêneros. Tudo é lido do estado (sem save próprio).

import { l, type L } from '../../data/world';
import type { GameState, Release } from '../types';
import { decadeOf, playerActs } from '../util';

export interface RetroEra { decade: number; name: L; releases: Release[]; units: number; revenue: number; best?: Release; awards: number; certs: number }
export interface RetroMilestone { kind: 'first' | 'top10' | 'no1' | 'cert' | 'award' | 'million'; label: L; week: number; year: number; releaseId?: string; actId?: string }
export interface RetroBet { rel: Release; spend: number; roi: number; hit: boolean }
export interface RetroAlum { actId: string; name: string; from: number; to: number | null; current: boolean; releases: number; units: number; best?: Release; status: string }
export interface RetroStory { week: number; year: number; kind: 'broken' | 'reunion'; text: L; actId?: string }
export interface RetroGenre { genre: string; releases: number; units: number; share: number }
export interface RetroScene { city: string; genre: string; strength: number }

export interface Retrospective {
  years: [number, number];
  totals: { releases: number; units: number; revenue: number; no1: number; top10: number; certs: number; awards: number; acts: number };
  eras: RetroEra[];
  milestones: RetroMilestone[];
  bets: RetroBet[];
  hits: Release[];
  certs: Release[];
  awards: GameState['awards'];
  alumni: RetroAlum[];
  stories: RetroStory[];
  genres: RetroGenre[];
  scenes: RetroScene[];
}

const BROKEN = new Set(['split', 'breakup', 'member_quits', 'left', 'fired', 'separation', 'broken_promise', 'promise_broken', 'lawsuit', 'poach', 'sniped', 'reunion_fail', 'hiatus', 'staff_leaves', 'rival_sign', 'buyout', 'solo']);
const REUNION = new Set(['reunion', 'return', 'comeback', 'mediation', 'renewal', 'revival', 'signed', 'supergroup', 'promise_kept']);

export const eraName = (decade: number): L => l(decade < 2000 ? `Anos ${String(decade).slice(2)}` : `Anos ${decade}`, `${decade}s`);

/** Lançamentos do jogador (do selo ou da banda do jogador), sem edições repetidas. */
export function playerReleases(s: GameState): Release[] {
  return Object.values(s.releases).filter((r) => (r.owner === 'player' || s.acts[r.actId]?.playerBand) && r.kind !== 'limited').sort((a, b) => a.week - b.week);
}

export function retrospective(s: GameState): Retrospective {
  const rels = playerReleases(s);
  const run = rels.filter((r) => !r.hist);
  const myAwards = s.awards.filter((a) => a.byPlayer);
  // ---- eras
  const eraMap = new Map<number, RetroEra>();
  for (const r of rels) {
    const d = decadeOf(r.year);
    const e = eraMap.get(d) ?? { decade: d, name: eraName(d), releases: [], units: 0, revenue: 0, awards: 0, certs: 0 };
    e.releases.push(r);
    e.units += r.totalUnits;
    e.revenue += r.revenue;
    if (r.certified) e.certs += 1;
    if (!e.best || r.totalUnits > e.best.totalUnits) e.best = r;
    eraMap.set(d, e);
  }
  for (const a of myAwards) {
    const e = eraMap.get(decadeOf(a.year));
    if (e) e.awards += 1;
  }
  const eras = [...eraMap.values()].sort((a, b) => a.decade - b.decade);
  // ---- marcos: primeiro disco, primeiro top 10, primeiro nº 1, primeiro certificado, primeiro prêmio, primeiro milhão
  const milestones: RetroMilestone[] = [];
  const firstOf = (pred: (r: Release) => boolean) => run.find(pred);
  const add = (kind: RetroMilestone['kind'], r: Release | undefined, label: L) => { if (r) milestones.push({ kind, label, week: r.week, year: r.year, releaseId: r.id, actId: r.actId }); };
  add('first', firstOf(() => true), l('Primeiro lançamento', 'First release'));
  add('top10', firstOf((r) => r.peak <= 10), l('Primeiro hit no top 10', 'First top 10 hit'));
  add('no1', firstOf((r) => r.peak === 1), l('Primeiro número 1', 'First number one'));
  add('cert', firstOf((r) => !!r.certified), l('Primeiro disco certificado', 'First certified record'));
  add('million', firstOf((r) => r.totalUnits >= 1_000_000), l('Primeiro milhão de cópias', 'First million copies'));
  const aw = myAwards.slice().sort((a, b) => a.year - b.year)[0];
  if (aw) milestones.push({ kind: 'award', label: l('Primeiro prêmio', 'First award'), week: (aw.year - s.config.startYear) * 52, year: aw.year, releaseId: aw.releaseId, actId: aw.actId });
  milestones.sort((a, b) => a.year - b.year || a.week - b.week);
  // ---- maiores apostas (verba de divulgação) e se acertaram
  const bets: RetroBet[] = run.map((r) => ({ rel: r, spend: r.marketing.reduce((t, m) => t + m.budget, 0) }))
    .filter((x) => x.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, 6)
    .map((x) => ({ rel: x.rel, spend: x.spend, roi: x.rel.revenue / Math.max(1, x.spend), hit: x.rel.revenue >= x.spend * 1.5 || x.rel.peak <= 10 }));
  const hits = rels.filter((r) => r.peak <= 10 || r.certified).sort((a, b) => b.totalUnits - a.totalUnits).slice(0, 12);
  const certs = rels.filter((r) => r.certified);
  // ---- artistas que passaram pelo selo
  const mine = new Set(playerActs(s));
  const alumMap = new Map<string, RetroAlum>();
  for (const c of Object.values(s.contracts)) {
    if (c.party !== 'player') continue;
    const a = s.acts[c.actId];
    if (!a) continue;
    const cur = alumMap.get(a.id);
    const current = mine.has(a.id) && a.contractId === c.id;
    const from = Math.min(cur?.from ?? Infinity, s.config.startYear + Math.floor(c.startWeek / 52));
    const isCur = !!cur?.current || current;
    const end = s.config.startYear + Math.floor(Math.min(c.endWeek, s.week) / 52);
    alumMap.set(a.id, { actId: a.id, name: a.name, from, to: isCur ? null : Math.max(cur?.to ?? 0, end), current: isCur, releases: 0, units: 0, status: a.deceased ? 'deceased' : a.status });
  }
  for (const id of mine) {
    const a = s.acts[id];
    if (a && !alumMap.has(id)) alumMap.set(id, { actId: id, name: a.name, from: a.playerBand ? a.formed : s.config.startYear, to: null, current: true, releases: 0, units: 0, status: a.status });
  }
  for (const r of rels) {
    const al = alumMap.get(r.actId);
    if (!al) continue;
    al.releases += 1;
    al.units += r.totalUnits;
    if (!al.best || r.totalUnits > al.best.totalUnits) al.best = r;
  }
  const alumni = [...alumMap.values()].sort((a, b) => Number(b.current) - Number(a.current) || b.units - a.units);
  // ---- rompimentos e reencontros (da memória da run, só de quem passou pelo selo ou da empresa)
  const stories: RetroStory[] = [];
  for (const m of s.memory) {
    const kind = BROKEN.has(m.kind) ? 'broken' : REUNION.has(m.kind) ? 'reunion' : null;
    if (!kind) continue;
    if (m.actId ? !alumMap.has(m.actId) : !m.important) continue;
    stories.push({ week: m.week, year: m.year, kind, text: m.text, actId: m.actId });
  }
  stories.sort((a, b) => b.week - a.week);
  // ---- gêneros e cenas
  const gmap = new Map<string, RetroGenre>();
  let unitsAll = 0;
  for (const r of rels) {
    const g = s.acts[r.actId]?.genre;
    if (!g) continue;
    const x = gmap.get(g) ?? { genre: g, releases: 0, units: 0, share: 0 };
    x.releases += 1;
    x.units += r.totalUnits;
    unitsAll += r.totalUnits;
    gmap.set(g, x);
  }
  const genres = [...gmap.values()].map((x) => ({ ...x, share: unitsAll ? x.units / unitsAll : 0 })).sort((a, b) => b.units - a.units);
  const sceneKeys = new Set([...alumMap.keys()].map((id) => s.acts[id]).filter(Boolean).map((a) => `${a.city}:${a.genre}`));
  const scenes = [...sceneKeys].map((k) => ({ city: k.split(':')[0], genre: k.split(':')[1], strength: s.scenes[k] ?? 0 })).filter((x) => x.strength > 0).sort((a, b) => b.strength - a.strength).slice(0, 10);
  return {
    years: [s.config.startYear, s.year],
    totals: {
      releases: run.length, units: run.reduce((t, r) => t + r.totalUnits, 0), revenue: run.reduce((t, r) => t + r.revenue, 0),
      no1: run.filter((r) => r.peak === 1).length, top10: run.filter((r) => r.peak <= 10).length, certs: certs.length, awards: myAwards.length, acts: alumni.length,
    },
    eras, milestones, bets, hits, certs, awards: myAwards.slice().sort((a, b) => b.year - a.year), alumni, stories: stories.slice(0, 40), genres, scenes,
  };
}
