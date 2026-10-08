// Partitura de um trecho tocável: tudo que o motor de áudio precisa, montado a partir dos
// atributos da música (gênero/família, era, melodia, letra, originalidade, produção) e dos dados
// de composição salvos pelos mini-jogos. Puro (sem WebAudio) para ser testável.

import { Rng, clamp, hashString } from '../core/rng';
import { familyOf, type FamilyId } from '../data/world';
import {
  BLOCKS, CHORDS, CHORD_TONES, FAMILY_SOUND, PROGRESSIONS, SCALES, chordHand, eraSoundOf, gearById,
  type BlockId, type DrumStyle, type EraSound, type GearSound, type OscillatorTypeLike,
} from '../sim/sys/music/data';
import { ms } from '../sim/sys/music/state';
import type { Act, GameState, Song } from '../sim/types';
import { yearOfWeek } from '../sim/util';

export interface PlayBar { chord: string; section: BlockId }

export interface PlaySpec {
  seed: string;
  family: FamilyId;
  era: EraSound;
  year: number;
  bpm: number;
  root: number;
  scale: number[];
  bars: PlayBar[];
  /** 16 colcheias (2 compassos) em graus da escala; −1 = pausa */
  melody: number[];
  beat?: number[];
  drums: DrumStyle;
  lead: OscillatorTypeLike;
  pad: OscillatorTypeLike;
  swing: number;
  /** performance: precisão de tempo e afinação (0..1) */
  tightness: number;
  /** produção: brilho e definição (0..1) */
  clarity: number;
  /** originalidade: notas de passagem e timbres estranhos (0..1) */
  weird: number;
  /** melodia: força do gancho (0..1) */
  hook: number;
  lanes: string[];
  fx: GearSound[];
  faders?: number[];
  loud?: number;
  seconds: number;
  title?: string;
}

export interface SpecOverrides {
  verse?: string[];
  chorus?: string[];
  melody?: number[];
  blocks?: BlockId[];
  lanes?: string[];
  beat?: number[];
  faders?: number[];
  eq?: number[];
  loud?: number;
  seconds?: number;
  era?: EraSound;
  /** começa direto no refrão (rádio, garimpo) */
  chorusFirst?: boolean;
}

const MIDI_A4 = 440;
const hz = (semi: number) => MIDI_A4 * Math.pow(2, semi / 12);

function defaultProgression(r: Rng, family: FamilyId, year: number, chorus: boolean): string[] {
  const progs = PROGRESSIONS.filter((p) => p.families.includes(family) && year >= p.from);
  if (progs.length && r.chance(chorus ? 0.7 : 0.55)) return [...r.pick(progs).chords].slice(0, 8);
  const hand = chordHand(family, year);
  return Array.from({ length: 4 }, (_, i) => (i === 0 ? (FAMILY_SOUND[family].minor && hand.includes('i') ? 'i' : 'I') : r.pick(hand)));
}

function defaultMelody(r: Rng, quality: number): number[] {
  const skill = clamp(quality / 100, 0.1, 1);
  const out: number[] = [];
  let cur = r.int(2, 5);
  for (let i = 0; i < 16; i++) {
    if (i >= 8 && i < 12 && r.chance(skill)) { out.push(out[i - 8]); continue; }
    if (r.chance(0.14)) { out.push(-1); continue; }
    cur = clamp(cur + (r.chance(skill) ? r.int(-1, 1) : r.int(-4, 4)), 0, 9);
    out.push(cur);
  }
  return out;
}

export function defaultBlocks(year: number, streaming: boolean): BlockId[] {
  if (streaming) return ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'];
  if (year < 1960) return ['intro', 'verse', 'chorus', 'verse', 'chorus', 'solo', 'chorus'];
  return ['intro', 'verse', 'pre', 'chorus', 'verse', 'pre', 'chorus', 'bridge', 'chorus', 'outro'];
}

export function defaultLanes(family: FamilyId, year: number): string[] {
  if (year < 1945) return family === 'sacred' ? ['vox', 'organ', 'choir'] : ['vox', 'piano', 'bass', 'horns', 'drums'];
  const base: Record<string, string[]> = {
    electronic: year >= 1980 ? ['vox', 'synth', 'bass', 'dm'] : ['vox', 'synth', 'bass', 'drums'],
    hiphop: year >= 1986 ? ['vox', 'sampler', 'bass', 'dm'] : ['vox', 'bass', 'drums', 'piano'],
    rock: ['vox', 'gtr', 'bass', 'drums'],
    blues_jazz: ['vox', 'piano', 'bass', 'horns', 'drums'],
    sacred: ['vox', 'organ', 'choir'],
    asia_me: ['vox', 'strings', 'perc'],
    rnb: year >= 1975 ? ['vox', 'piano', 'bass', 'drums', 'synth'] : ['vox', 'organ', 'bass', 'drums', 'horns'],
  };
  const out = base[family] ?? ['vox', 'gtr', 'bass', 'drums', 'piano'];
  return out.filter((x) => (x !== 'synth' || year >= 1970) && (x !== 'dm' || year >= 1980) && (x !== 'sampler' || year >= 1986));
}

/** Expande os blocos em compassos e corta uma janela de `seconds` que inclui o primeiro refrão. */
function windowBars(blocks: BlockId[], verse: string[], chorus: string[], barSec: number, seconds: number, chorusFirst: boolean): PlayBar[] {
  const all: PlayBar[] = [];
  for (const b of blocks) {
    const n = BLOCKS[b]?.bars ?? 4;
    const prog = b === 'chorus' ? chorus : b === 'bridge' ? [...chorus].reverse() : verse;
    for (let i = 0; i < n; i++) all.push({ chord: prog[i % prog.length] ?? 'I', section: b });
  }
  const want = Math.max(2, Math.round(seconds / barSec));
  const firstCh = all.findIndex((x) => x.section === 'chorus');
  let start = 0;
  if (chorusFirst && firstCh >= 0) start = firstCh;
  else if (firstCh >= 0 && firstCh + 4 > want) start = Math.max(0, firstCh - Math.floor(want / 2));
  const out = all.slice(start, start + want);
  while (out.length < want) out.push(...all.slice(0, want - out.length));
  return out;
}

function eqBright(eq?: number[]): number {
  return eq ? (eq[2] ?? 0) / 12 : 0;
}

/** Monta a partitura de uma música do jogo (com dados de composição se houver). */
export function buildSongSpec(s: GameState, song: Song, ov: SpecOverrides = {}): PlaySpec {
  const family = familyOf(song.genre);
  const fs = FAMILY_SOUND[family];
  const rec = ms(s).songs[song.id];
  const year = song.releaseId && s.releases[song.releaseId] ? s.releases[song.releaseId].year : yearOfWeek(s, song.createdWeek);
  const r = Rng.fromSeed(`song:${song.id}`);
  const bpm = fs.bpm + r.int(-8, 8) + (year > 1990 && family !== 'blues_jazz' ? 4 : 0);
  const root = hz(-12 + r.int(-5, 6)) / 2;
  const scale = SCALES[rec?.melody?.scale ?? fs.scale]?.steps ?? SCALES.major.steps;
  const verse = ov.verse ?? rec?.chords?.verse ?? defaultProgression(r, family, year, false);
  const chorus = ov.chorus ?? rec?.chords?.chorus ?? defaultProgression(r, family, year, true);
  const melody = ov.melody ?? rec?.melody?.notes ?? defaultMelody(r, song.melody);
  const streaming = year >= 2010;
  const blocks = ov.blocks ?? (rec?.arrange?.blocks as BlockId[] | undefined) ?? defaultBlocks(year, streaming);
  const lanes = ov.lanes ?? rec?.arrange?.lanes ?? defaultLanes(family, year);
  const seconds = clamp(ov.seconds ?? 22, 6, 32);
  const barSec = (4 * 60) / bpm;
  const perf = song.recorded ? song.performance : song.melody * 0.6;
  const prod = song.recorded ? song.production : 30;
  const fx: GearSound[] = [];
  if (song.recorded) for (const id of ms(s).gear) { const g = gearById[id]; if (g && g.families.includes(family)) fx.push(g.sound); }
  if (!fx.length && year < 1962 && year >= 1947) fx.push('echo');
  const beat = ov.beat ?? rec?.beat?.grid;
  return {
    seed: song.id,
    family,
    era: ov.era ?? eraSoundOf(year),
    year,
    bpm,
    root,
    scale,
    bars: windowBars(blocks, verse, chorus, barSec, seconds, !!ov.chorusFirst),
    melody,
    beat: beat && year >= 1980 ? beat : undefined,
    drums: fs.drums,
    lead: lanes.includes('synth') && family !== 'blues_jazz' ? 'sawtooth' : fs.lead,
    pad: fs.pad,
    swing: fs.swing,
    tightness: clamp(perf / 100, 0.05, 1),
    clarity: clamp(prod / 100 + eqBright(ov.eq ?? rec?.mix?.eq), 0.05, 1),
    weird: clamp((song.originality - 30) / 70, 0, 1),
    hook: clamp(song.melody / 100, 0.05, 1),
    lanes,
    fx: [...new Set(fx)].slice(0, 3),
    faders: ov.faders ?? rec?.mix?.faders,
    loud: ov.loud ?? rec?.master?.loud,
    seconds,
    title: song.title,
  };
}

/** Demo de um artista (audição às cegas): soa como o potencial real dele, sem mostrar números. */
export function buildActDemoSpec(s: GameState, act: Act): PlaySpec {
  const family = familyOf(act.genre);
  const fs = FAMILY_SOUND[family];
  const r = Rng.fromSeed(`demo:${act.id}`);
  const pot = act.potential;
  const bpm = fs.bpm + r.int(-6, 6);
  const barSec = (4 * 60) / bpm;
  const verse = defaultProgression(r, family, s.year, false);
  const chorus = defaultProgression(r, family, s.year, true);
  return {
    seed: act.id, family, era: s.year < 1935 ? 'gramophone' : 'am', year: s.year, bpm, root: hz(-12 + r.int(-5, 6)) / 2,
    scale: SCALES[fs.scale].steps, bars: windowBars(['verse', 'chorus'], verse, chorus, barSec, 12, false),
    melody: defaultMelody(r, pot), drums: fs.drums, lead: fs.lead, pad: fs.pad, swing: fs.swing,
    tightness: clamp(pot / 100 + r.normal(0, 0.06), 0.05, 1), clarity: 0.25, weird: clamp(r.float(0, 0.5) + (pot > 75 ? 0.2 : 0), 0, 1), hook: clamp(pot / 100, 0.05, 1),
    lanes: ['vox', act.members.length > 1 ? 'gtr' : 'piano', act.members.length > 2 ? 'drums' : 'perc'], fx: [], seconds: 12, title: act.name,
  };
}

/** Nota (Hz) de um grau da escala a partir da tônica. */
export function degreeHz(spec: PlaySpec, degree: number, octave = 0): number {
  const n = spec.scale.length;
  const d = ((degree % n) + n) % n;
  const oct = Math.floor(degree / n) + octave;
  return spec.root * Math.pow(2, (spec.scale[d] + 12 * oct) / 12);
}

/** Frequências do acorde (romano) a partir da tônica. */
export function chordHz(spec: PlaySpec, chord: string, octave = 1): number[] {
  const c = CHORDS[chord] ?? CHORDS.I;
  return CHORD_TONES[c.q].map((iv) => spec.root * Math.pow(2, (c.root + iv + 12 * octave) / 12));
}

export function chordRootHz(spec: PlaySpec, chord: string, octave = 0): number {
  const c = CHORDS[chord] ?? CHORDS.I;
  return spec.root * Math.pow(2, (c.root + 12 * octave) / 12);
}

/** Duração aproximada (segundos) da partitura. */
export function specSeconds(spec: PlaySpec): number {
  return (spec.bars.length * 4 * 60) / spec.bpm;
}

export function specHash(spec: PlaySpec): number {
  return hashString(`${spec.seed}:${spec.bars.map((b) => b.chord).join('')}:${spec.melody.join(',')}`);
}


