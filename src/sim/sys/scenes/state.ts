// Estado e utilidades do sistema "scenes": cenas jogáveis em locais de pixel art.
// O estado é pequeno: cursores, recortes de relação com veículos, cooldowns e um arquivo
// das últimas cenas (para a galeria "Lugares" poder revê-las).

import type { L } from '../../../data/world';
import { queueCutscene, registerExt4, type Cutscene } from '../../ext4';
import type { GameState } from '../../types';

/** Locais desenháveis (a interface tem um desenho para cada um, por era). */
export type PlaceKind =
  | 'awards' | 'tv_talk' | 'tv_variety' | 'tv_auditorium' | 'tv_chart' | 'tv_clips' | 'podcast' | 'livestream'
  | 'venue_bar' | 'venue_club' | 'venue_theatre' | 'venue_gym' | 'venue_arena' | 'venue_stadium' | 'venue_festival'
  | 'radio_am' | 'radio_fm' | 'curators' | 'factory' | 'store' | 'backstage' | 'tour_bus' | 'airport' | 'hotel'
  | 'court' | 'boardroom' | 'exchange' | 'dance_club' | 'video_set' | 'country_house' | 'clinic' | 'funeral'
  | 'mansion' | 'street' | 'trade_fair' | 'holo_stage';

export const ALL_PLACES: PlaceKind[] = [
  'awards', 'tv_talk', 'tv_variety', 'tv_auditorium', 'tv_chart', 'tv_clips', 'podcast', 'livestream',
  'venue_bar', 'venue_club', 'venue_theatre', 'venue_gym', 'venue_arena', 'venue_stadium', 'venue_festival',
  'radio_am', 'radio_fm', 'curators', 'factory', 'store', 'backstage', 'tour_bus', 'airport', 'hotel',
  'court', 'boardroom', 'exchange', 'dance_club', 'video_set', 'country_house', 'clinic', 'funeral',
  'mansion', 'street', 'trade_fair', 'holo_stage',
];

export interface SceneLog {
  id: string;
  kind: string;
  week: number;
  year: number;
  title: L;
  place: PlaceKind;
}

export interface ScenesState {
  /** maior número de memória (s.memory) já examinado */
  memCursor: number;
  /** últimas cenas (para rever na galeria) */
  archive: SceneLog[];
  /** cópia dos dados das cenas arquivadas (id → dados), para rever depois que s.cutscenes descarta */
  archiveData: Record<string, Record<string, unknown>>;
  /** relação com veículos de mídia (-100..100) */
  outlets: Record<string, number>;
  /** atoId → semana até quando um discurso político atrai os censores */
  heat: Record<string, number>;
  /** releaseId → impulso de rádio (modificador de apelo) */
  radioBoost: Record<string, { mult: number; until: number; dj: string }>;
  /** chave → semana (cooldowns) */
  cool: Record<string, number>;
  /** orçamento de cenas menores por mês */
  monthKey: number;
  monthCount: number;
  /** ids já tratados (listas curtas) */
  seen: string[];
  stats: { interviews: number; speeches: number; radio: number; vignettes: number; hearings: number; parties: number; payolaSignals: number; fairs: number };
  /** nível da mansão (0..5), cresce com o sucesso */
  mansion: number;
}

declare module '../../ext4' {
  interface Ext4 {
    scenes: ScenesState;
  }
}

export function emptyScenes(): ScenesState {
  return {
    memCursor: 0,
    archive: [],
    archiveData: {},
    outlets: {},
    heat: {},
    radioBoost: {},
    cool: {},
    monthKey: -1,
    monthCount: 0,
    seen: [],
    stats: { interviews: 0, speeches: 0, radio: 0, vignettes: 0, hearings: 0, parties: 0, payolaSignals: 0, fairs: 0 },
    mansion: 0,
  };
}

registerExt4('scenes', emptyScenes);

/** Estado do sistema (cria em saves que ainda não têm). */
export function sc(s: GameState): ScenesState {
  const x4 = (s.x4 ??= {} as GameState['x4']);
  const st = (x4.scenes ??= emptyScenes());
  // saves de versões anteriores deste sistema
  st.stats ??= emptyScenes().stats;
  st.archiveData ??= {};
  st.seen ??= [];
  return st;
}

export function wasSeen(s: GameState, key: string): boolean {
  return sc(s).seen.includes(key);
}

export function markSeen(s: GameState, key: string): void {
  const st = sc(s);
  if (st.seen.includes(key)) return;
  st.seen.push(key);
  if (st.seen.length > 160) st.seen.splice(0, st.seen.length - 160);
}

export function cooled(s: GameState, key: string, weeks: number): boolean {
  const w = sc(s).cool[key];
  return w === undefined || s.week - w >= weeks;
}

export function setCool(s: GameState, key: string): void {
  sc(s).cool[key] = s.week;
  // limpa chaves muito antigas
  const c = sc(s).cool;
  const keys = Object.keys(c);
  if (keys.length > 120) for (const k of keys) if (s.week - c[k] > 104) delete c[k];
}

/**
 * Enfileira uma cena. `minor` respeita um orçamento de 2 cenas menores por mês para não
 * interromper demais; as importantes (premiação, tribunal, crise) sempre entram.
 */
export function queueScene(s: GameState, kind: string, place: PlaceKind, data: Record<string, unknown> & { title: L }, opts: { minor?: boolean } = {}): Cutscene | null {
  const st = sc(s);
  const mk = s.year * 12 + s.month;
  if (st.monthKey !== mk) {
    st.monthKey = mk;
    st.monthCount = 0;
  }
  if (opts.minor && st.monthCount >= 2) return null;
  if (opts.minor) st.monthCount += 1;
  queueCutscene(s, kind, { ...data, place });
  const cs = s.cutscenes[s.cutscenes.length - 1];
  archive(s, cs, place);
  return cs;
}

function archive(s: GameState, cs: Cutscene, place: PlaceKind): void {
  const st = sc(s);
  st.archive.push({ id: cs.id, kind: cs.kind, week: s.week, year: s.year, title: cs.data.title as L, place });
  st.archiveData[cs.id] = cs.data;
  if (st.archive.length > 30) {
    const out = st.archive.splice(0, st.archive.length - 30);
    for (const o of out) delete st.archiveData[o.id];
  }
}

/** Encontra uma cena pelo id (na fila da simulação ou no arquivo). */
export function findScene(s: GameState, id: string): Cutscene | null {
  const cs = (s.cutscenes ?? []).find((x) => x.id === id);
  if (cs) return cs;
  const st = sc(s);
  const log = st.archive.find((x) => x.id === id);
  const data = st.archiveData[id];
  return log && data ? { id, kind: log.kind, week: log.week, data, seen: true } : null;
}

/** Atualiza os dados de uma cena nos dois lugares (fila e arquivo), que podem divergir após carregar o save. */
export function patchScene(s: GameState, id: string, patch: Record<string, unknown>): void {
  const cs = (s.cutscenes ?? []).find((x) => x.id === id);
  if (cs) Object.assign(cs.data, patch);
  const ad = sc(s).archiveData[id];
  if (ad && ad !== cs?.data) Object.assign(ad, patch);
}

/** Número sequencial de uma memória (ids 'm' + base 36). */
export function memSeq(id: string): number {
  const n = parseInt(id.slice(1), 36);
  return Number.isFinite(n) ? n : 0;
}

export const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
