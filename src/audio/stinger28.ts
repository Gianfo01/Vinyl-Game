// Rodada 28 (F4) — stingers: vinhetas de 0,5–1 s nos marcos (primeiro hit, nº 1, ouro, prêmio, fim de capítulo…).
// Puro (sem WebAudio): monta uma PlaySpec de UM compasso rápido que o motor (engine.ts) toca pela mesma cadeia de
// filtro da era (gramofone, AM, FM, digital, neural). Mesma entrada → mesma partitura (determinístico, sem Math.random).

import { Rng } from '../core/rng';
import { FAMILY_SOUND, SCALES, eraSoundOf } from '../sim/sys/music/data';
import type { FamilyId } from '../data/world';
import type { PlaySpec } from './spec';

export type StingKind28 = 'hit' | 'number1' | 'gold' | 'award' | 'chapter' | 'end' | 'bad';

/** Desenho de cada vinheta: acordes do compasso, contorno da melodia (graus) e andamento. */
const SHAPE28: Record<StingKind28, { chords: string[]; melody: number[]; bpm: number }> = {
  hit: { chords: ['I'], melody: [0, 2, 4, 7, -1, -1, -1, -1], bpm: 300 },
  number1: { chords: ['I'], melody: [4, 7, 9, 11, 7, -1, -1, -1], bpm: 260 },
  gold: { chords: ['IV'], melody: [0, 4, 7, 4, 9, -1, -1, -1], bpm: 280 },
  award: { chords: ['V'], melody: [7, 9, 11, 14, -1, -1, -1, -1], bpm: 270 },
  chapter: { chords: ['vi'], melody: [0, -1, 4, -1, 2, -1, -1, -1], bpm: 300 },
  end: { chords: ['I'], melody: [7, 4, 2, 0, -1, -1, -1, -1], bpm: 240 },
  bad: { chords: ['ii'], melody: [3, 1, 0, -1, -1, -1, -1, -1], bpm: 320 },
};

/** Partitura da vinheta (um compasso = 60·4/bpm s → 0,75–1 s). */
export function stingerSpec28(kind: StingKind28, year: number, family: FamilyId = 'pop', seed = ''): PlaySpec {
  const sh = SHAPE28[kind];
  const fs = FAMILY_SOUND[family] ?? FAMILY_SOUND.pop;
  const r = Rng.fromSeed(`sting28:${kind}:${year}:${seed}`);
  const root = 261.63 * Math.pow(2, r.int(-3, 3) / 12) / 2;
  const era = eraSoundOf(year);
  return {
    seed: `sting28:${kind}:${seed}`, family, era, year, bpm: sh.bpm, root,
    scale: SCALES.major.steps, bars: [{ chord: sh.chords[0], section: 'chorus' }],
    melody: [...sh.melody, ...sh.melody.map(() => -1)], drums: 'none', lead: fs.lead, pad: fs.pad, swing: 0,
    tightness: 1, clarity: era === 'gramophone' ? 0.2 : era === 'am' ? 0.4 : 0.8, weird: 0, hook: 1,
    lanes: ['vox', year < 1950 ? 'piano' : year < 1980 ? 'horns' : 'synth', 'bass'], fx: [], seconds: (4 * 60) / sh.bpm,
    title: kind,
  };
}

/** Vinheta das cenas animadas da r27 (cut27: data.d.key). */
const CUT_STING28: Record<string, StingKind28> = {
  chart1: 'hit', star: 'hit', show1: 'hit', sold: 'hit', fest: 'hit', magic: 'hit', no1: 'number1', award: 'award', era: 'chapter',
  flop: 'bad', scandal: 'bad', raid: 'bad', broke: 'bad', death: 'bad', betray: 'bad', leave: 'bad',
};

/** Qual vinheta toca para cada cena de marco (kind do queueCutscene; `key` = chave da cena animada cut27); null = nenhuma. */
export function stingForScene28(sceneKind: string, key?: string): StingKind28 | null {
  if (sceneKind === 'cut27') return (key && CUT_STING28[key]) || null;
  const k = sceneKind.toLowerCase();
  if (/number1|no1|chart1/.test(k)) return 'number1';
  if (/gold|platin|cert/.test(k)) return 'gold';
  if (/award|gramo|prize|ceremon/.test(k)) return 'award';
  if (/firsthit|top10|breakthrough/.test(k)) return 'hit';
  if (/chapter28/.test(k)) return 'chapter';
  if (/run17result|ending|farewell|story28/.test(k)) return 'end';
  if (/bankrupt|insolv|scandal|split|death/.test(k)) return 'bad';
  return null;
}
