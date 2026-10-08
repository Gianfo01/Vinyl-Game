// Paradas por país, por região e por formato (rodada 7). Cada semana, as unidades novas de cada
// lançamento são divididas entre 34 países conforme o tamanho do mercado (população × poder de compra),
// o gosto local por família de gênero naquele ano, a distribuição do lançamento e o "efeito casa"
// (artista local vende mais no próprio país). Daí saem, para cada país e região:
//   - Top músicas e Top álbuns (consumo combinado da era)
//   - Streaming (execuções), Vendas (físico + download) e Clipes (exibições na TV e, depois, views)
// e, no fim do ano, os prêmios nacionais (artista, música, álbum e revelação do ano em cada país).

import { clamp, type Rng } from '../../core/rng';
import { COUNTRY_INFO, countryInfoByA3, countryMarketSize, countryTaste, type CountryInfo } from '../../data/countries';
import { countryName, countryOfCity } from '../../data/geo';
import { MARKETS, familyOf, l, type L, type MarketId } from '../../data/world';
import { registerExt4, registerSimHook } from '../ext4';
import { physicalShare } from '../production';
import type { GameState, Release } from '../types';
import { fmtL, hasTech, notify, remember } from '../util';

export type ChartKind = 'songs' | 'albums' | 'stream' | 'sales' | 'video';
export const CHART_KINDS: ChartKind[] = ['songs', 'albums', 'stream', 'sales', 'video'];

export interface Row7 { relId: string; u: number; pos: number; last: number; wk: number }
type Board = Record<ChartKind, Row7[]>;

export interface NationalAward { year: number; a3: string; cat: 'artist' | 'song' | 'album' | 'newcomer'; winner: string; actId?: string; relId?: string; byPlayer: boolean }

export interface Ch7State {
  lastTotal: Record<string, number>;
  yearUnits: Record<string, Record<string, number>>; // a3 -> relId -> unidades no ano
  peaks: Record<string, Record<string, number>>; // relId -> chave da parada -> melhor posição (só do jogador)
  no1: Record<string, { week: number; relId: string; title: string; act: string }[]>;
  awards: NationalAward[];
  week: number;
}

declare module '../ext4' { interface Ext4 { ch7: Ch7State } }
registerExt4('ch7', () => ({ lastTotal: {}, yearUnits: {}, peaks: {}, no1: {}, awards: [], week: -1 }));

export const ch7 = (s: GameState): Ch7State => (s as unknown as { x4: { ch7: Ch7State } }).x4.ch7;

// as paradas da semana ficam fora do save (são refeitas a cada fechamento semanal)
const BOARDS = new WeakMap<GameState, Record<string, Board>>();
const boardsOf = (s: GameState): Record<string, Board> => { let b = BOARDS.get(s); if (!b) { b = {}; BOARDS.set(s, b); } return b; };

const TOP = 20;

// ---------------------------------------------------------------- nomes

export function chartLabel(s: GameState, key: string, kind: ChartKind): string {
  const real = !!s.config.realNames;
  const kindName = KIND_NAMES[kind];
  if (key === 'world') return `${kindName.pt}`;
  if (key.startsWith('r:')) return `${MARKETS.find((m) => m.id === key.slice(2))?.name.pt ?? key}`;
  const c = countryInfoByA3[key];
  if (!c) return key;
  if (kind === 'songs') return real ? c.chart[1] : c.chart[0];
  return `${real ? c.chart[1] : c.chart[0]} — ${kindName.pt}`;
}

export const KIND_NAMES: Record<ChartKind, L> = {
  songs: l('Top músicas', 'Top songs'),
  albums: l('Top álbuns', 'Top albums'),
  stream: l('Streaming', 'Streaming'),
  sales: l('Vendas (físico e download)', 'Sales (physical and download)'),
  video: l('Clipes', 'Music videos'),
};

/** Unidade mostrada em cada tipo de parada. */
export function kindUnit(s: GameState, kind: ChartKind): L {
  if (kind === 'stream') return l('execuções', 'plays');
  if (kind === 'video') return s.year >= 2005 && hasTech(s, 'internet') ? l('visualizações', 'views') : l('exibições', 'airings');
  if (kind === 'sales') return l('cópias', 'copies');
  return l('unidades', 'units');
}

export function kindAvailable(s: GameState, kind: ChartKind): boolean {
  if (kind === 'stream') return hasTech(s, 'streaming');
  if (kind === 'video') return hasTech(s, 'tv_music');
  if (kind === 'albums') return s.year >= 1948;
  return true;
}

// ---------------------------------------------------------------- divisão por país

const actCountry = (s: GameState, actId: string): string | null => {
  const a = s.acts[actId];
  return a ? countryOfCity(a.city) : null;
};

function countryWeights(s: GameState, rel: Release): number[] {
  const act = s.acts[rel.actId];
  const fam = act ? familyOf(act.genre) : 'pop';
  const home = act ? actCountry(s, act.id) : null;
  const homeMarket = home ? countryInfoByA3[home]?.market : undefined;
  const crossover = act ? act.positioning / 100 : 0.4;
  const out: number[] = [];
  for (const c of COUNTRY_INFO) {
    let w = countryMarketSize(c, s.year);
    const taste = countryTaste(c, fam, s.year);
    w *= taste + (1 - Math.min(1, taste)) * crossover * 0.4;
    w *= rel.territories.includes(c.market) ? 1 : 0.04;
    if (home === c.a3) w *= 4;
    else if (homeMarket === c.market) w *= 1.4;
    out.push(w);
  }
  return out;
}

function formatShares(s: GameState, c: CountryInfo): { phys: number; stream: number; dl: number } {
  const phys = clamp(physicalShare(s) * (c.physical ?? 1), 0.02, 0.97);
  const rest = 1 - phys;
  if (!hasTech(s, 'download') && !hasTech(s, 'streaming')) return { phys, stream: 0, dl: 0 };
  if (!hasTech(s, 'streaming')) return { phys, stream: 0, dl: rest };
  const stream = rest * (s.year >= (s.techDates.streaming ?? 2008) + 6 ? 0.92 : 0.65);
  return { phys, stream, dl: rest - stream };
}

function videoFactor(s: GameState, rel: Release): number {
  if (!hasTech(s, 'tv_music')) return 0;
  const has = (ch: string) => rel.marketing.some((m) => m.channel === ch);
  let k = 0.15 + (has('music_video') ? 1.4 : 0) + (has('tv_show') ? 0.5 : 0) + (has('short_clips') ? 1.3 : 0);
  if (hasTech(s, 'clipnet')) k *= 1.5;
  if (hasTech(s, 'short_video')) k *= 1.6;
  return k;
}

const STREAMS_PER_UNIT = 150; // equivalência aproximada (1 unidade ≈ 150 execuções)
const VIEWS_PER_UNIT = 60;

// ---------------------------------------------------------------- semana

function emptyBoard(): Board {
  return { songs: [], albums: [], stream: [], sales: [], video: [] };
}

function rank(prev: Row7[] | undefined, rows: { relId: string; u: number }[]): Row7[] {
  const before = new Map((prev ?? []).map((x) => [x.relId, x]));
  return rows.filter((x) => x.u > 0.5).sort((a, b) => b.u - a.u).slice(0, TOP).map((x, i) => {
    const p = before.get(x.relId);
    return { relId: x.relId, u: Math.round(x.u), pos: i + 1, last: p?.pos ?? 0, wk: (p?.wk ?? 0) + 1 };
  });
}

function weekCharts(s: GameState): void {
  const st = ch7(s);
  if (st.week === s.week) return;
  st.week = s.week;
  // unidades novas por lançamento nesta semana
  const fresh: { rel: Release; units: number }[] = [];
  const nextTotals: Record<string, number> = {};
  for (const rel of Object.values(s.releases)) {
    if (!rel.live) continue;
    const prev = st.lastTotal[rel.id] ?? (rel.week >= s.week - 1 ? 0 : rel.totalUnits - (rel.weekly[rel.weekly.length - 1] ?? 0));
    const units = rel.totalUnits - prev;
    nextTotals[rel.id] = rel.totalUnits;
    // histórico semanal longo só para o jogador (save leve)
    if (rel.weekly.length > 14 && rel.owner !== 'player' && !s.acts[rel.actId]?.playerBand) rel.weekly.splice(0, rel.weekly.length - 14);
    if (units > 0) fresh.push({ rel, units });
  }
  st.lastTotal = nextTotals;
  if (!fresh.length) return;

  const nC = COUNTRY_INFO.length;
  const shares = COUNTRY_INFO.map((c) => formatShares(s, c));
  // acumuladores: [país][tipo] -> lista
  const acc: Record<ChartKind, { relId: string; u: number }[]>[] = COUNTRY_INFO.map(() => ({ songs: [], albums: [], stream: [], sales: [], video: [] }));
  for (const { rel, units } of fresh) {
    const w = countryWeights(s, rel);
    const sum = w.reduce((a, b) => a + b, 0);
    if (sum <= 0) continue;
    const vf = videoFactor(s, rel);
    const album = rel.type === 'lp' || rel.type === 'ep';
    for (let i = 0; i < nC; i++) {
      const u = (units * w[i]) / sum;
      if (u < 0.5) continue;
      const a = acc[i];
      (album ? a.albums : a.songs).push({ relId: rel.id, u });
      const sh = shares[i];
      if (sh.stream > 0) a.stream.push({ relId: rel.id, u: u * sh.stream * STREAMS_PER_UNIT * (album ? 0.6 : 1) });
      a.sales.push({ relId: rel.id, u: u * (sh.phys + sh.dl) });
      if (vf > 0) a.video.push({ relId: rel.id, u: u * vf * VIEWS_PER_UNIT * (album ? 0.4 : 1) });
      const yu = (st.yearUnits[COUNTRY_INFO[i].a3] ??= {});
      yu[rel.id] = (yu[rel.id] ?? 0) + u;
    }
  }
  // países
  const regionAcc: Record<string, Record<ChartKind, Map<string, number>>> = {};
  const worldAcc: Record<ChartKind, Map<string, number>> = { songs: new Map(), albums: new Map(), stream: new Map(), sales: new Map(), video: new Map() };
  for (let i = 0; i < nC; i++) {
    const c = COUNTRY_INFO[i];
    const prev = boardsOf(s)[c.a3] ?? emptyBoard();
    const board = emptyBoard();
    const reg = (regionAcc[c.market] ??= { songs: new Map(), albums: new Map(), stream: new Map(), sales: new Map(), video: new Map() });
    for (const k of CHART_KINDS) {
      board[k] = rank(prev[k], acc[i][k]);
      for (const x of acc[i][k]) {
        reg[k].set(x.relId, (reg[k].get(x.relId) ?? 0) + x.u);
        worldAcc[k].set(x.relId, (worldAcc[k].get(x.relId) ?? 0) + x.u);
      }
    }
    boardsOf(s)[c.a3] = board;
    trackPlayer(s, c.a3, board);
  }
  for (const [m, accM] of Object.entries(regionAcc)) {
    const key = `r:${m}`;
    const prev = boardsOf(s)[key] ?? emptyBoard();
    const board = emptyBoard();
    for (const k of CHART_KINDS) board[k] = rank(prev[k], [...accM[k]].map(([relId, u]) => ({ relId, u })));
    boardsOf(s)[key] = board;
    // compatibilidade: prêmios regionais usam s.regionCharts (top 10 combinado)
    s.regionCharts[m] = [...board.songs, ...board.albums].sort((a, b) => b.u - a.u).slice(0, 10).map((x) => x.relId);
  }
  const prevW = boardsOf(s).world ?? emptyBoard();
  const wb = emptyBoard();
  for (const k of CHART_KINDS) wb[k] = rank(prevW[k], [...worldAcc[k]].map(([relId, u]) => ({ relId, u })));
  boardsOf(s).world = wb;
  // poda dos acumuladores do ano: só os 60 maiores por país
  if (s.week % 8 === 0) for (const a3 of Object.keys(st.yearUnits)) {
    const ent = Object.entries(st.yearUnits[a3]).sort((a, b) => b[1] - a[1]).slice(0, 60);
    st.yearUnits[a3] = Object.fromEntries(ent);
  }
}

const mineRel = (s: GameState, rel: Release | undefined): boolean => !!rel && (rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);

function trackPlayer(s: GameState, a3: string, board: Board): void {
  const st = ch7(s);
  for (const k of ['songs', 'albums'] as const) {
    for (const row of board[k].slice(0, 10)) {
      const rel = s.releases[row.relId];
      const act = rel ? s.acts[rel.actId] : undefined;
      if (row.pos === 1) {
        const list = (st.no1[a3] ??= []);
        if (list[list.length - 1]?.relId !== row.relId) {
          list.push({ week: s.week, relId: row.relId, title: rel?.title ?? '?', act: act?.name ?? '?' });
          if (list.length > 40) list.splice(0, list.length - 40);
        }
      }
      if (!mineRel(s, rel)) continue;
      const pk = (st.peaks[row.relId] ??= {});
      const key = `${a3}:${k}`;
      const was = pk[key] ?? 999;
      if (row.pos < was) {
        pk[key] = row.pos;
        if (row.pos === 1 || was > 10) {
          const name = countryName(a3);
          notify(s, fmtL(row.pos === 1 ? l('"{t}" é #1 em {c}!', '"{t}" is #1 in {c}!') : l('"{t}" entra no top 10 de {c} (#{p}).', '"{t}" enters the {c} top 10 (#{p}).'), { t: rel!.title, c: name, p: row.pos }), 'good');
          if (row.pos === 1) remember(s, 'no1_country', fmtL(l('"{t}" ({a}) chega ao #1 em {c}.', '"{t}" ({a}) hits #1 in {c}.'), { t: rel!.title, a: act?.name ?? '', c: name }), { actId: act?.id, important: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------- prêmios nacionais

export function awardName(s: GameState, c: CountryInfo): string {
  return c.award ? (s.config.realNames ? c.award[1] : c.award[0]) : '';
}

export const AWARD_CATS: Record<NationalAward['cat'], L> = {
  artist: l('Artista do ano', 'Artist of the year'),
  song: l('Música do ano', 'Song of the year'),
  album: l('Álbum do ano', 'Album of the year'),
  newcomer: l('Revelação', 'Best new artist'),
};

function nationalAwards(s: GameState, r: Rng): void {
  const st = ch7(s);
  const year = s.year;
  for (const c of COUNTRY_INFO) {
    if (!c.award || c.award[2] > year) continue;
    const yu = st.yearUnits[c.a3];
    if (!yu) continue;
    const rels = Object.entries(yu).map(([id, u]) => ({ rel: s.releases[id], u })).filter((x) => x.rel);
    if (!rels.length) continue;
    const pickRel = (f: (x: Release) => boolean) => rels.filter((x) => f(x.rel)).sort((a, b) => b.u * (0.8 + b.rel.q / 200) - a.u * (0.8 + a.rel.q / 200))[0];
    const byAct: Record<string, number> = {};
    for (const x of rels) byAct[x.rel.actId] = (byAct[x.rel.actId] ?? 0) + x.u;
    const actRank = Object.entries(byAct).sort((a, b) => b[1] - a[1]);
    const give = (cat: NationalAward['cat'], actId: string | undefined, rel: Release | undefined) => {
      const act = actId ? s.acts[actId] : undefined;
      if (!act) return;
      const byPlayer = rel ? mineRel(s, rel) : act.owner === 'player' || !!act.playerBand;
      const winner = rel ? `${act.name} — ${rel.title}` : act.name;
      st.awards.push({ year, a3: c.a3, cat, winner, actId, relId: rel?.id, byPlayer });
      act.awards += 1;
      act.fame = clamp(act.fame + (cat === 'artist' ? 1.2 : 0.6) * (countryMarketSize(c, year) > 30 ? 1.5 : 1), 0, 100);
      if (byPlayer) {
        s.player.stats.awards += 1;
        s.awards.push({ year, category: `nat_${c.a3}_${cat}`, releaseId: rel?.id, actId, name: `${awardName(s, c)} — ${AWARD_CATS[cat].pt}: ${winner}`, byPlayer: true });
        notify(s, fmtL(l('{aw} ({c}) — {cat}: {w}!', '{aw} ({c}) — {cat}: {w}!'), { aw: awardName(s, c), c: countryName(c.a3), cat: AWARD_CATS[cat], w: winner }), 'good');
        remember(s, 'nat_award', fmtL(l('{aw} {y} ({c}): {cat} para {w}.', '{aw} {y} ({c}): {cat} to {w}.'), { aw: awardName(s, c), y: year, c: countryName(c.a3), cat: AWARD_CATS[cat], w: winner }), { actId, important: true });
      }
    };
    give('artist', actRank[0]?.[0], undefined);
    const song = pickRel((x) => x.type === 'single');
    give('song', song?.rel.actId, song?.rel);
    const album = pickRel((x) => x.type === 'lp');
    give('album', album?.rel.actId, album?.rel);
    const fresh = actRank.find(([id]) => (s.acts[id]?.debutYear ?? 0) >= year - 1);
    give('newcomer', fresh?.[0], undefined);
  }
  if (st.awards.length > 2400) st.awards.splice(0, st.awards.length - 2400);
  st.yearUnits = {};
  void r;
}

// ---------------------------------------------------------------- consultas para a interface

export function board(s: GameState, key: string, kind: ChartKind): Row7[] {
  return boardsOf(s)[key]?.[kind] ?? [];
}

/** País do ato (para a ficha) e melhores posições do jogador por país. */
export function playerPeaks(s: GameState, relId: string): { a3: string; kind: string; pos: number }[] {
  return Object.entries(ch7(s).peaks[relId] ?? {}).map(([k, pos]) => { const [a3, kind] = k.split(':'); return { a3, kind, pos }; }).sort((a, b) => a.pos - b.pos);
}

/** Líder atual de cada país (para a ficha de país e o mapa). */
export function countryLeader(s: GameState, a3: string): Row7 | undefined {
  const b = boardsOf(s)[a3];
  if (!b) return undefined;
  return b.songs[0] ?? b.albums[0];
}

export function marketKeys(): { key: string; market: MarketId }[] {
  return MARKETS.map((m) => ({ key: `r:${m.id}`, market: m.id }));
}

registerSimHook('week', 'charts7', (s) => weekCharts(s));
registerSimHook('year', 'charts7', (s, r) => nationalAwards(s, r));
