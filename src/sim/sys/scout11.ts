// Rodada 11 — lista de observação com alertas mensais e comparação lado a lado (até três).
// r27 (AUD1): as missões de olheiro que moravam aqui foram absorvidas pelo motor único de scouting (scout23.ts).

import { l } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import type { GameState } from '../types';
import { fmtL, notify } from '../util';

export interface Scout11State {
  watch: string[];
  compare: string[];
  seen: Record<string, { fame: number; owner: string }>;
}
declare module '../ext4' { interface Ext4 { scout11: Scout11State } }
const fresh = (): Scout11State => ({ watch: [], compare: [], seen: {} });
registerExt4('scout11', fresh);
export const scout11 = (s: GameState): Scout11State => {
  const x = s.x4 as unknown as { scout11?: Scout11State };
  x.scout11 ??= fresh();
  return x.scout11;
};

// ---------------------------------------------------------------- observação e comparação
const live = (s: GameState, id: string) => { const a = s.acts[id]; return !!a && a.status !== 'retired' && a.status !== 'split'; };

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

registerSimHook('month', 'scout11', (s) => watchMonth(s));
