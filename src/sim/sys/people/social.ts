// Hierarquia e panelinhas: mapa social do elenco. Atos se agrupam por gênero musical, cidade,
// geração e filial/selo; cada grupo tem um líder de vestiário cujo humor contamina os outros.
// Amizades e rixas entre bandas evoluem todo mês; contratar e dispensar mexe nos grupos.

import type { Rng } from '../../../core/rng';
import { FAMILIES, familyOf, l, type L } from '../../../data/world';
import type { Act, GameState } from '../../types';
import { playerActs } from '../../util';
import { P } from './state';
import { actMood, thoughtAll } from './thoughts';

export type GroupBy = 'genre' | 'city' | 'age' | 'label';

export const GROUP_NAME: Record<GroupBy, L> = {
  genre: l('Gênero', 'Genre'),
  city: l('Cidade', 'City'),
  age: l('Geração', 'Generation'),
  label: l('Selo/filial', 'Label/branch'),
};

export function bondKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function bond(s: GameState, a: string, b: string): number {
  return P(s).bonds[bondKey(a, b)] ?? 0;
}

function avgAge(s: GameState, act: Act): number {
  const ms = act.members.map((id) => s.persons[id]).filter((p) => p?.alive);
  if (!ms.length) return 30;
  return ms.reduce((t, p) => t + (s.year - p.born), 0) / ms.length;
}

export function groupKey(s: GameState, act: Act, by: GroupBy): string {
  if (by === 'genre') return familyOf(act.genre);
  if (by === 'city') return act.city;
  if (by === 'age') {
    const a = avgAge(s, act);
    return a < 26 ? 'young' : a < 40 ? 'prime' : 'veteran';
  }
  const sub = s.subLabels.find((x) => x.roster.includes(act.id));
  if (sub) return `sub:${sub.id}`;
  return s.branchOf[act.id] ? `br:${s.branchOf[act.id]}` : 'hq';
}

export function groupLabel(s: GameState, by: GroupBy, key: string): L {
  if (by === 'age') return key === 'young' ? l('Novatos (<26)', 'Young (<26)') : key === 'prime' ? l('Auge (26–40)', 'Prime (26–40)') : l('Velha guarda (40+)', 'Old guard (40+)');
  if (by === 'label') {
    if (key === 'hq') return l('Matriz', 'Head office');
    if (key.startsWith('sub:')) return l(s.subLabels.find((x) => x.id === key.slice(4))?.name ?? key);
    return l(s.branches.find((x) => x.id === key.slice(3))?.name ?? key);
  }
  return FAMILIES.find((f) => f.id === key)?.name ?? l(key);
}

/** Influência do ato no vestiário (fama, sucessos, tempo de casa). */
export function influence(s: GameState, act: Act): number {
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  const years = c ? (s.week - c.startWeek) / 52 : 0;
  return act.fame + act.hits * 2 + act.number1s * 4 + (act.legend ? 20 : 0) + years * 2;
}

export interface Clique {
  key: string;
  label: L;
  acts: string[];
  leader?: string;
}

export function cliques(s: GameState, by: GroupBy): Clique[] {
  const map = new Map<string, string[]>();
  for (const id of playerActs(s)) {
    const k = groupKey(s, s.acts[id], by);
    map.set(k, [...(map.get(k) ?? []), id]);
  }
  return [...map.entries()].map(([key, acts]) => ({
    key,
    label: groupLabel(s, by, key),
    acts,
    leader: acts.length > 1 ? acts.slice().sort((a, b) => influence(s, s.acts[b]) - influence(s, s.acts[a]))[0] : undefined,
  })).sort((a, b) => b.acts.length - a.acts.length);
}

/** Líder de vestiário do elenco inteiro. */
export function rosterLeader(s: GameState): string | undefined {
  const ids = playerActs(s);
  if (ids.length < 2) return undefined;
  return ids.slice().sort((a, b) => influence(s, s.acts[b]) - influence(s, s.acts[a]))[0];
}

export function socialMonth(s: GameState, r: Rng): void {
  const st = P(s);
  const ids = playerActs(s);
  const now = new Set(ids);
  const prev = new Set(st.roster);
  // contratações e dispensas mexem nos grupos
  for (const id of ids) {
    if (prev.has(id) || !st.roster.length) continue;
    const act = s.acts[id];
    for (const other of ids) {
      if (other === id) continue;
      const o = s.acts[other];
      const k = bondKey(id, other);
      let b = 0;
      if (familyOf(o.genre) === familyOf(act.genre)) b += 15;
      if (o.city === act.city) b += 10;
      st.bonds[k] = b;
      if (b >= 20) thoughtAll(s, other, 'friend_signed', { p: act.name });
    }
    const lead = rosterLeader(s);
    if (lead && lead !== id && act.fame > s.acts[lead].fame * 0.8) thoughtAll(s, lead, 'newcomer', { p: act.name });
  }
  for (const id of st.roster) {
    if (now.has(id)) continue;
    const gone = s.acts[id];
    for (const other of ids) {
      if (bond(s, id, other) > 30 && gone) thoughtAll(s, other, 'friend_dropped', { p: gone.name });
    }
    for (const k of Object.keys(st.bonds)) if (k.split('|').includes(id)) delete st.bonds[k];
  }
  st.roster = ids.slice();
  // amizades e rixas evoluem
  const best: Record<string, number> = {};
  for (const id of ids) {
    const act = s.acts[id];
    best[id] = Math.min(999, ...act.releases.slice(-2).map((rid) => (s.releases[rid] && s.week - s.releases[rid].week < 10 ? s.releases[rid].peak : 999)));
  }
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = s.acts[ids[i]];
      const b = s.acts[ids[j]];
      const k = bondKey(a.id, b.id);
      let v = st.bonds[k] ?? 0;
      const fam = familyOf(a.genre) === familyOf(b.genre);
      if (fam) v += 0.8;
      if (a.city === b.city) v += 0.6;
      if (s.tours.some((t) => t.status !== 'cancelled' && ((t.actId === a.id && t.partnerActId === b.id) || (t.actId === b.id && t.partnerActId === a.id)))) v += 5;
      // disputa direta nas paradas
      if (fam && best[a.id] < 30 && best[b.id] < 30) v -= 3;
      v += r.normal(0, 1.2);
      v *= 0.98;
      st.bonds[k] = Math.max(-100, Math.min(100, v));
      if (fam && st.bonds[k] < -30 && best[a.id] < 999 && best[b.id] < 999 && best[a.id] !== best[b.id]) {
        const [ahead, behind] = best[a.id] < best[b.id] ? [a, b] : [b, a];
        thoughtAll(s, behind.id, 'rival_ahead', { p: ahead.name });
      }
    }
  }
  // líder contamina o grupo (gênero)
  for (const c of cliques(s, 'genre')) {
    if (!c.leader) continue;
    const m = actMood(s, c.leader);
    const v = Math.round(m * 0.25);
    if (Math.abs(v) < 2) continue;
    for (const id of c.acts) if (id !== c.leader) thoughtAll(s, id, 'leader_mood', { p: s.acts[c.leader].name, v });
  }
}
