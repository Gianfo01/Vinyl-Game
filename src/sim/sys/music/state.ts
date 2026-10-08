// Estado do sistema "music" em s.x4.music e a aplicação limitada de bônus dos mini-jogos às músicas.

import { clamp } from '../../../core/rng';
import { registerExt4 } from '../../ext4';
import { songQ } from '../../production';
import type { GameState, Song } from '../../types';
import type { Stage } from './data';

export type Attr = 'melody' | 'lyrics' | 'originality' | 'performance' | 'production';
export const ATTRS: Attr[] = ['melody', 'lyrics', 'originality', 'performance', 'production'];
export type Deltas = Partial<Record<Attr, number>>;

export type GameId = 'chords' | 'melody' | 'lyrics' | 'arrange' | 'take' | 'mix' | 'master' | 'beat' | 'dig' | 'focus' | 'gear';

export interface SongComp {
  chords?: { verse: string[]; chorus: string[]; fam: number; sur: number; classic?: string; score: number };
  melody?: { notes: number[]; scale: string; hook: number; score: number };
  lyrics?: { lines: string[][]; scheme: 'AABB' | 'ABAB' | 'free'; title: string; risk: number; score: number };
  arrange?: { blocks: string[]; lanes: string[]; seconds: number; score: number };
  beat?: { grid: number[]; score: number; sig?: string };
  take?: { score: number; used?: boolean };
  mix?: { faders: number[]; eq: number[]; score: number };
  master?: { loud: number; score: number };
  dig?: { sourceId: string; brk: number };
  /** deltas por mini-jogo (cada um limitado) */
  b: Partial<Record<GameId, Deltas>>;
  /** quanto já está somado nos atributos da música */
  applied: Deltas;
  /** gravação já vista (performance/produção recebem os bônus depois disso) */
  recSeen?: boolean;
  week: number;
}

export interface MusicState {
  songs: Record<string, SongComp>;
  /** ouvido do selo (audição às cegas), 0..10 */
  ear: number;
  earTries: number;
  earHits: number;
  lastBlindWeek: number;
  /** assinaturas de batida (sequenciador) */
  beats: { id: string; name: string; grid: number[]; family: string; score: number; uses: number; week: number }[];
  /** foco por etapa marcado para a próxima gravação de cada ato */
  focus: Record<string, Record<Stage, number>>;
  /** aprendizado do foco por família: tentativas, melhor encaixe e último encaixe (0..1) */
  focusLearn: Record<string, { tries: number; best: number; last: number; bestMix?: Record<Stage, number> }>;
  gear: string[];
  gearOffers: { id: string; gearId: string; from: string; price: number; expires: number }[];
  lastJam: Record<string, number>;
  jams: number;
  seenLabels: string[];
  /** demos já corrigidas pelo ouvido */
  earFixed?: string[];
  /** contadores para o relatório e testes */
  played: number;
}

declare module '../../ext4' {
  interface Ext4 {
    music: MusicState;
  }
}

registerExt4('music', () => ({
  songs: {}, ear: 0, earTries: 0, earHits: 0, lastBlindWeek: -99, beats: [], focus: {}, focusLearn: {}, gear: [], gearOffers: [], lastJam: {}, jams: 0, seenLabels: [], played: 0,
}));

export function ms(s: GameState): MusicState {
  const x = s.x4 as unknown as { music?: MusicState };
  x.music ??= { songs: {}, ear: 0, earTries: 0, earHits: 0, lastBlindWeek: -99, beats: [], focus: {}, focusLearn: {}, gear: [], gearOffers: [], lastJam: {}, jams: 0, seenLabels: [], played: 0 };
  return x.music;
}

export function songRec(s: GameState, songId: string): SongComp {
  const m = ms(s);
  return (m.songs[songId] ??= { b: {}, applied: {}, week: s.week });
}

/** Limite por mini-jogo e limite total por atributo (bônus de jogar bem é limitado). */
export const PER_GAME_CAP = 6;
export const TOTAL_CAP = 10;

export function capDeltas(d: Deltas, cap = PER_GAME_CAP): Deltas {
  const out: Deltas = {};
  for (const k of ATTRS) if (d[k]) out[k] = Math.round(clamp(d[k]!, -cap, cap) * 10) / 10;
  return out;
}

/** Recalcula Q como o jogo faz: música só escrita usa performance e produção estimadas. */
export function refreshQ(song: Song): void {
  song.q = song.recorded ? songQ(song) : songQ({ ...song, performance: song.melody * 0.6, production: 30 });
}

/**
 * Soma os deltas de todos os mini-jogos (limitados) e aplica a diferença nos atributos.
 * Performance e produção só valem depois da gravação (a gravação recalcula esses atributos).
 */
export function syncSong(s: GameState, songId: string): void {
  const song = s.songs[songId];
  const rec = ms(s).songs[songId];
  if (!song || !rec) return;
  if (song.recorded && !rec.recSeen) {
    rec.recSeen = true;
    rec.applied.performance = 0;
    rec.applied.production = 0;
  }
  for (const k of ATTRS) {
    if ((k === 'performance' || k === 'production') && !song.recorded) continue;
    let total = 0;
    for (const g of Object.values(rec.b)) total += g?.[k] ?? 0;
    total = clamp(total, -TOTAL_CAP, TOTAL_CAP);
    const prev = rec.applied[k] ?? 0;
    if (Math.abs(total - prev) < 0.01) continue;
    song[k] = clamp(song[k] + (total - prev), 0, 100);
    rec.applied[k] = total;
  }
  refreshQ(song);
}

/** Grava o resultado de um mini-jogo (substitui o anterior do mesmo jogo) e sincroniza a música. */
export function setGameBonus(s: GameState, songId: string, game: GameId, d: Deltas, cap = PER_GAME_CAP): Deltas {
  const rec = songRec(s, songId);
  rec.b[game] = capDeltas(d, cap);
  rec.week = s.week;
  ms(s).played += 1;
  syncSong(s, songId);
  return rec.b[game]!;
}

export function isPlayerSong(s: GameState, song: Song | undefined): boolean {
  if (!song) return false;
  const act = s.acts[song.actId];
  return !!act && (act.owner === 'player' || !!act.playerBand);
}

/** Mantém o estado pequeno: descarta registros de músicas sumidas ou lançadas há muito tempo. */
export function pruneSongs(s: GameState): void {
  const m = ms(s);
  const ids = Object.keys(m.songs);
  for (const id of ids) {
    const so = s.songs[id];
    if (!so) delete m.songs[id];
  }
  const left = Object.keys(m.songs);
  if (left.length > 160) {
    left.sort((a, b) => m.songs[a].week - m.songs[b].week);
    for (const id of left.slice(0, left.length - 160)) if (s.songs[id]?.releaseId) delete m.songs[id];
  }
}
