// Rodada 11 — scouting com névoa: missões de olheiros com duração escolhida (4, 8 ou 12 semanas), foco de
// gênero e pistas reveladas semana a semana (o intervalo de potencial estreita à medida que o grau sobe);
// lista de observação com alertas e comparação lado a lado. Gerador próprio (semente + semana + olheiro).

import { Rng, clamp } from '../../core/rng';
import { cityById, familyOf, l, type L, type MarketId } from '../../data/world';
import { sendScout } from '../discovery';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import type { Scout } from '../xtypes';
import { fmtL, notify } from '../util';
import { addSignal } from '../worldgen';

export interface Scout11State {
  watch: string[];
  compare: string[];
  seen: Record<string, { fame: number; owner: string }>;
  feed: { w: number; t: L }[];
}
declare module '../ext4' { interface Ext4 { scout11: Scout11State } }
const fresh = (): Scout11State => ({ watch: [], compare: [], seen: {}, feed: [] });
registerExt4('scout11', fresh);
export const scout11 = (s: GameState): Scout11State => {
  const x = s.x4 as unknown as { scout11?: Scout11State };
  x.scout11 ??= fresh();
  return x.scout11;
};

export const MISSION_WEEKS = [4, 8, 12] as const;
/** Grau máximo que a missão alcança: curtas só observam, longas acompanham; olheiro excelente em missão longa chega à audição. */
export function missionDepth(sc: Scout, weeks: number): number {
  return weeks >= 12 && sc.skill >= 80 ? 4 : weeks >= 8 ? 3 : 2;
}
export function missionTarget(sc: Scout, weeks: number): number {
  return 1 + Math.floor(sc.skill / 35) + (weeks >= 12 ? 1 : 0);
}
export function missionLength(sc: Scout, region: MarketId, weeks: number): number {
  return weeks + (sc.region === region ? 0 : 4);
}

/** Envia o olheiro com duração e foco escolhidos. Fora da região dele a missão leva +4 semanas e custa mais. */
export function startMission(s: GameState, scoutId: string, region: MarketId, family: string, weeks: number): L | null {
  const sc = s.scouts.find((x) => x.id === scoutId);
  if (!sc) return l('Olheiro inválido.', 'Invalid scout.');
  const e = sendScout(s, scoutId, region, family);
  if (e) return e;
  sc.mission = { region, family, untilWeek: s.week + missionLength(sc, region, weeks), start: s.week, depth: missionDepth(sc, weeks), leads: [] };
  return null;
}

export function missionProgress(s: GameState, sc: Scout): number {
  const m = sc.mission;
  if (!m?.start) return 0;
  return clamp((s.week - m.start) / Math.max(1, m.untilWeek - m.start), 0, 1);
}

const live = (s: GameState, id: string) => { const a = s.acts[id]; return !!a && a.status !== 'retired' && a.status !== 'split'; };

function feed(s: GameState, t: L): void {
  const st = scout11(s);
  st.feed.push({ w: s.week, t });
  if (st.feed.length > 30) st.feed.shift();
}

function missionWeek(s: GameState, sc: Scout): void {
  const m = sc.mission;
  if (!m?.leads || m.untilWeek <= s.week) return;
  const r = Rng.fromSeed(`${s.config.seed}:scout11:${s.week}:${sc.id}`);
  m.leads = m.leads.filter((id) => live(s, id) && s.knowledge[id]);
  const weeks = m.untilWeek - (m.start ?? s.week) - (sc.region === m.region ? 0 : 4);
  const onSpec = m.family === 'any' || m.family === sc.family;
  if (m.leads.length < missionTarget(sc, weeks) && r.chance((0.3 + sc.skill / 250) * (onSpec ? 1 : 0.6))) {
    const cands = Object.values(s.acts).filter((a) => !a.owner && live(s, a.id) && !s.knowledge[a.id] && cityById[a.city]?.market === m.region && (m.family === 'any' || familyOf(a.genre) === m.family));
    // olheiro bom enxerga potencial; o mediano vai atrás de quem já faz barulho
    const a = r.weighted(cands, (x) => 1 + (x.potential / 40) * (sc.skill / 60) + x.fame / 30);
    if (a) {
      addSignal(s, r, a.id, 'scout');
      const k = s.knowledge[a.id];
      k.bias = sc.bias + r.normal(0, Math.max(2, 12 - sc.skill / 10));
      m.leads.push(a.id);
      feed(s, fmtL(l('{n}: pista nova — {a}.', '{n}: new lead — {a}.'), { n: sc.name, a: a.name }));
    }
  }
  for (const id of m.leads) {
    const k = s.knowledge[id];
    if (k.degree >= (m.depth ?? 2) || s.acts[id].owner || !r.chance(0.16 + sc.skill / 300)) continue;
    k.degree += 1;
    k.bias *= 0.7;
    k.updatedWeek = s.week;
    if (k.stage === 'signal' && k.degree >= 2) k.stage = 'monitoring';
    if (k.degree >= 3 && k.stage === 'monitoring') k.stage = 'investigating';
    feed(s, fmtL(l('{n}: relatório de {a} chega ao grau {d}.', '{n}: report on {a} reaches degree {d}.'), { n: sc.name, a: s.acts[id].name, d: k.degree }));
  }
}

// ---------------------------------------------------------------- observação e comparação

export function toggleWatch(s: GameState, actId: string): boolean {
  const st = scout11(s);
  const i = st.watch.indexOf(actId);
  if (i >= 0) { st.watch.splice(i, 1); delete st.seen[actId]; return false; }
  const a = s.acts[actId];
  if (!a) return false;
  st.watch.push(actId);
  st.seen[actId] = { fame: a.fame, owner: a.owner ?? '' };
  return true;
}
export const isWatched = (s: GameState, actId: string) => scout11(s).watch.includes(actId);

export function toggleCompare(s: GameState, actId: string): boolean {
  const st = scout11(s);
  const i = st.compare.indexOf(actId);
  if (i >= 0) { st.compare.splice(i, 1); return false; }
  st.compare.push(actId);
  if (st.compare.length > 3) st.compare.shift();
  return true;
}

/** Alertas mensais da lista de observação: assinou com alguém, disparou ou sumiu. */
function watchMonth(s: GameState): void {
  const st = scout11(s);
  st.watch = st.watch.filter((id) => live(s, id) && s.acts[id].owner !== 'player');
  st.compare = st.compare.filter((id) => s.acts[id]);
  for (const id of st.watch) {
    const a = s.acts[id];
    const prev = st.seen[id] ?? { fame: a.fame, owner: a.owner ?? '' };
    if (a.owner && a.owner !== prev.owner) notify(s, fmtL(l('Observado: {a} assinou com {b}.', 'Watchlist: {a} signed with {b}.'), { a: a.name, b: s.labels[a.owner]?.name ?? '?' }), 'bad');
    else if (a.fame - prev.fame >= 5) notify(s, fmtL(l('Observado: {a} está crescendo rápido (★{f}).', 'Watchlist: {a} is rising fast (★{f}).'), { a: a.name, f: Math.round(a.fame) }), 'info');
    st.seen[id] = { fame: a.fame, owner: a.owner ?? '' };
  }
}

registerSimHook('week', 'scout11', (s) => { for (const sc of s.scouts) missionWeek(s, sc); });
registerSimHook('month', 'scout11', (s) => watchMonth(s));
