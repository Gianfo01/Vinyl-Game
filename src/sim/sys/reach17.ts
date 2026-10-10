// Rodada 17 — alcance mundial por artista. O peso do país (data/relevance) diz quanto a música dele viaja:
// americano viaja mais. Mas há exceções reais (Shakira, ABBA, BTS — carreiras globais consolidadas) e o hit
// viral planetário (Gangnam Style, Despacito, Macarena): um single que chega ao nº 1 em vários países fora do
// mercado de casa ganha, por ~18 meses, o peso mundial de um astro americano — e puxa o gênero junto.
// Se o ato não emplaca outro nº 1 nesse período, vira "one-hit wonder": o rótulo pega e o momento cai.

import { clamp } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { globalOf17 } from '../../data/relevance17';
import { softPower } from '../../data/relevance';
import { l, type L } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import type { Act, GameState } from '../types';
import { fmtL, notify } from '../util';
import { ch7 } from './charts7';
import { reachHook17 } from './reachhook17';
import { realName17 } from './realidx17';

export interface Viral17 { rel: string; until: number; n: number; y: number; hit: string; other?: 1 }
export interface Reach17State { viral: Record<string, Viral17>; ohw: Record<string, { y: number; hit: string }> }
declare module '../ext4' { interface Ext4 { reach17: Reach17State } }
const fresh = (): Reach17State => ({ viral: {}, ohw: {} });
registerExt4('reach17', fresh);
export function reach17(s: GameState): Reach17State {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x.reach17 ??= fresh()) as Reach17State;
  st.viral ??= {}; st.ohw ??= {};
  return st;
}

export const VIRAL_MIN17 = 4;
const WEEKS = 78;

/** Peso mundial efetivo do ato e o porquê. */
export function actReach17(s: GameState, act: Act): { v: number; base: number; why: L } {
  const home = countryOfCity(act.city);
  const base = softPower(home, s.year);
  const g = globalOf17(realName17(act), s.year);
  const vr = reach17(s).viral[act.id];
  const vv = vr && s.week < vr.until ? 0.95 : 0;
  const v = Math.max(base, g.v, vv);
  const why = vv >= g.v && vv > base ? fmtL(l('Hit viral global: "{h}" foi nº 1 em {n} países.', 'Global viral hit: "{h}" was No. 1 in {n} countries.'), { h: vr!.hit, n: vr!.n })
    : g.v > base && g.g ? l(g.g[4], g.g[5])
    : home === 'USA' ? l('Artista americano: a indústria e a mídia dos EUA levam a música ao mundo.', 'American act: US industry and media carry the music worldwide.')
    : l('Peso mundial do país de origem.', 'Global weight of the home country.');
  return { v, base, why };
}

// cache por partida/ano (countryWeights chama isto por lançamento × semana)
const GC = new WeakMap<GameState, { y: number; m: Map<string, number> }>();
const globalCached = (s: GameState, act: Act): number => {
  let c = GC.get(s);
  if (!c || c.y !== s.year) { c = { y: s.year, m: new Map() }; GC.set(s, c); }
  let v = c.m.get(act.id);
  if (v === undefined) { v = act.catalogNo ? globalOf17(realName17(act), s.year).v : 0; c.m.set(act.id, v); }
  return v;
};
reachHook17.f = (s, act) => {
  const g = globalCached(s, act);
  const vr = reach17(s).viral[act.id];
  return Math.max(g, vr && s.week < vr.until ? 0.95 : 0);
};

registerSimHook('month', 'reach17', (s) => {
  const st = reach17(s);
  const c7 = ch7(s);
  if (!c7?.no1) return;
  // nº 1 por país nas últimas 8 semanas → em quantos países cada lançamento chegou ao topo
  const cnt: Record<string, Set<string>> = {};
  for (const [a3, list] of Object.entries(c7.no1)) if (/^[A-Z]{3}$/.test(a3)) for (const e of list) if (s.week - e.week <= 8) (cnt[e.relId] ??= new Set()).add(a3);
  for (const [rid, set] of Object.entries(cnt)) {
    const rel = s.releases[rid];
    const act = rel ? s.acts[rel.actId] : undefined;
    if (!rel || !act) continue;
    const home = countryOfCity(act.city);
    const abroad = [...set].filter((x) => x !== home).length;
    const cur = st.viral[act.id];
    if (cur && cur.rel !== rid && s.week < cur.until) { cur.other = 1; continue; }
    if (abroad < VIRAL_MIN17 || softPower(home, s.year) >= 0.85 || (cur && cur.rel === rid)) continue;
    st.viral[act.id] = { rel: rid, until: s.week + WEEKS, n: set.size, y: s.year, hit: rel.title };
    act.fame = clamp(act.fame + 6, 0, 100);
    s.genrePop[act.genre] = clamp((s.genrePop[act.genre] ?? 0.6) + 0.25, 0.15, 2.2); // o gênero vai junto
    const mine = act.owner === 'player' || !!act.playerBand;
    emitFact(s, { kind: 'chart', actors: [act.id], place: act.city, severity: 70, visibility: 'public', tags: ['good', 'viral'], src: 'reach17',
      text: fmtL(l('Fenômeno mundial: "{h}", de {a}, é nº 1 em {n} países — o mundo inteiro dança a mesma música.', 'Global phenomenon: {a}\'s "{h}" is No. 1 in {n} countries — the whole world dances to the same song.'), { h: rel.title, a: act.name, n: set.size }) });
    if (mine) notify(s, fmtL(l('"{h}" virou hit mundial! Por 18 meses {a} viaja como astro americano. Emplaque outro nº 1 ou vira one-hit wonder.', '"{h}" became a worldwide hit! For 18 months {a} travels like a US star. Land another No. 1 or become a one-hit wonder.'), { h: rel.title, a: act.name }), 'good');
  }
  // fim da janela: sem outro nº 1 → one-hit wonder
  for (const [aid, v] of Object.entries(st.viral)) {
    if (s.week < v.until) continue;
    const act = s.acts[aid];
    delete st.viral[aid];
    if (!act || v.other) continue;
    st.ohw[aid] = { y: v.y, hit: v.hit };
    act.momentum = clamp(act.momentum - 10, 0, 100);
    emitFact(s, { kind: 'statement', actors: [aid], place: act.city, severity: 40, visibility: 'public', tags: ['bad', 'ohw'], src: 'reach17',
      text: fmtL(l('A imprensa já chama {a} de "one-hit wonder": nada repetiu "{h}".', 'The press already calls {a} a "one-hit wonder": nothing matched "{h}".'), { a: act.name, h: v.hit }) });
    if (act.owner === 'player') notify(s, fmtL(l('{a} ganhou o rótulo de one-hit wonder (momento −10). Um novo nº 1 apaga a fama.', '{a} got the one-hit-wonder label (momentum −10). A new No. 1 erases it.'), { a: act.name }), 'bad');
  }
  // rótulo some com um novo nº 1
  for (const aid of Object.keys(st.ohw)) if (Object.keys(cnt).some((rid) => s.releases[rid]?.actId === aid && s.releases[rid]?.title !== st.ohw[aid].hit)) delete st.ohw[aid];
});
