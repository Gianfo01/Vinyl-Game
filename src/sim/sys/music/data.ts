// Dados do sistema "music": cartas de acordes, progressões clássicas, escalas, perfis de som por
// família, limites da era (pistas, duração do compacto), equipamentos lendários, ímãs de letra e
// a distribuição ideal (oculta) do foco por etapa.

import { l, type FamilyId, type L } from '../../../data/world';
import type { GameState } from '../../types';
import { hasTech } from '../../util';
import type { Idea } from '../../xtypes';

// ------------------------------------------------------------------ harmonia

/** Graus em semitons a partir da tônica; 'q' = qualidade (maior, menor, dominante, diminuto). */
export interface ChordCard { id: string; root: number; q: 'M' | 'm' | '7' | 'dim' | 'm7' | 'M7'; common: number }

export const CHORDS: Record<string, ChordCard> = {
  I: { id: 'I', root: 0, q: 'M', common: 1 },
  ii: { id: 'ii', root: 2, q: 'm', common: 0.7 },
  iii: { id: 'iii', root: 4, q: 'm', common: 0.4 },
  IV: { id: 'IV', root: 5, q: 'M', common: 0.95 },
  V: { id: 'V', root: 7, q: 'M', common: 0.95 },
  vi: { id: 'vi', root: 9, q: 'm', common: 0.8 },
  'vii°': { id: 'vii°', root: 11, q: 'dim', common: 0.2 },
  bVII: { id: 'bVII', root: 10, q: 'M', common: 0.5 },
  bVI: { id: 'bVI', root: 8, q: 'M', common: 0.35 },
  bIII: { id: 'bIII', root: 3, q: 'M', common: 0.3 },
  I7: { id: 'I7', root: 0, q: '7', common: 0.6 },
  IV7: { id: 'IV7', root: 5, q: '7', common: 0.6 },
  V7: { id: 'V7', root: 7, q: '7', common: 0.75 },
  ii7: { id: 'ii7', root: 2, q: 'm7', common: 0.65 },
  IM7: { id: 'IM7', root: 0, q: 'M7', common: 0.5 },
  i: { id: 'i', root: 0, q: 'm', common: 0.7 },
  iv: { id: 'iv', root: 5, q: 'm', common: 0.5 },
};

export const CHORD_TONES: Record<ChordCard['q'], number[]> = {
  M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], dim: [0, 3, 6], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11],
};

export interface Progression { id: string; name: L; chords: string[]; families: FamilyId[]; from: number }

export const PROGRESSIONS: Progression[] = [
  { id: 'axis', name: l('I–V–vi–IV (a progressão do pop)', 'I–V–vi–IV (the pop progression)'), chords: ['I', 'V', 'vi', 'IV'], families: ['pop', 'rock', 'country_folk', 'electronic', 'latin', 'brazil'], from: 1955 },
  { id: 'doowop', name: l('I–vi–IV–V (doo-wop)', 'I–vi–IV–V (doo-wop)'), chords: ['I', 'vi', 'IV', 'V'], families: ['rnb', 'pop', 'rock', 'country_folk'], from: 1940 },
  { id: 'blues8', name: l('Blues de 8 compassos', '8-bar blues'), chords: ['I7', 'I7', 'IV7', 'I7', 'V7', 'IV7', 'I7', 'V7'], families: ['blues_jazz', 'rock', 'rnb', 'country_folk'], from: 1920 },
  { id: 'twofive', name: l('ii–V–I (jazz)', 'ii–V–I (jazz)'), chords: ['ii7', 'V7', 'IM7', 'IM7'], families: ['blues_jazz', 'brazil', 'rnb', 'europe'], from: 1920 },
  { id: 'mixo', name: l('I–bVII–IV–I (rock)', 'I–bVII–IV–I (rock)'), chords: ['I', 'bVII', 'IV', 'I'], families: ['rock', 'country_folk', 'caribbean'], from: 1962 },
  { id: 'andaluz', name: l('i–bVII–bVI–V (andaluza)', 'i–bVII–bVI–V (Andalusian)'), chords: ['i', 'bVII', 'bVI', 'V'], families: ['latin', 'europe', 'asia_me', 'rock'], from: 1920 },
  { id: 'gospel', name: l('I–IV–I–V (hino)', 'I–IV–I–V (hymn)'), chords: ['I', 'IV', 'I', 'V'], families: ['sacred', 'country_folk', 'africa', 'caribbean'], from: 1920 },
  { id: 'minorloop', name: l('i–iv–i–V (lamento)', 'i–iv–i–V (lament)'), chords: ['i', 'iv', 'i', 'V'], families: ['hiphop', 'electronic', 'latin', 'brazil', 'africa'], from: 1920 },
  { id: 'twochord', name: l('Vamp de dois acordes', 'Two-chord vamp'), chords: ['i', 'iv', 'i', 'iv'], families: ['rnb', 'hiphop', 'africa', 'caribbean', 'electronic'], from: 1965 },
];

/** Mão de cartas do compositor por família e era. */
export function chordHand(family: FamilyId, year: number): string[] {
  const base = ['I', 'IV', 'V', 'vi', 'ii'];
  const extra: Partial<Record<FamilyId, string[]>> = {
    blues_jazz: ['I7', 'IV7', 'V7', 'ii7', 'IM7'],
    rnb: ['ii7', 'IM7', 'i', 'iv', 'V7'],
    rock: ['bVII', 'iii', 'bVI'],
    hiphop: ['i', 'iv', 'bVI', 'bVII'],
    electronic: ['i', 'iv', 'bVI', 'bVII'],
    latin: ['i', 'iv', 'bVII', 'bVI', 'V7'],
    brazil: ['ii7', 'V7', 'IM7', 'i', 'iv'],
    europe: ['i', 'iv', 'bVI', 'bVII'],
    asia_me: ['i', 'iv', 'bVII', 'bVI'],
    africa: ['i', 'iv', 'bVII'],
    caribbean: ['bVII', 'V7'],
    country_folk: ['V7', 'iii'],
    sacred: ['iii', 'V7'],
    pop: ['iii', 'bVII'],
  };
  const out = [...base, ...(extra[family] ?? [])];
  if (year >= 1962 && !out.includes('bVII')) out.push('bVII');
  if (year >= 1940) out.push('vii°');
  return [...new Set(out)];
}

/** Quão comum é ir de um acorde a outro (0..1): cadências fortes são familiares. */
export function transitionCommon(a: string, b: string): number {
  const A = CHORDS[a];
  const B = CHORDS[b];
  if (!A || !B) return 0.3;
  if (a === b) return 0.55;
  const iv = (B.root - A.root + 12) % 12;
  // quarta acima (V→I, ii→V) é a mais natural; quinta acima e terças vêm depois
  const byInterval: Record<number, number> = { 5: 0.95, 7: 0.8, 9: 0.6, 3: 0.55, 8: 0.5, 10: 0.55, 2: 0.45, 4: 0.4, 1: 0.15, 11: 0.25, 6: 0.1 };
  return Math.min(1, (byInterval[iv] ?? 0.3) * 0.6 + (A.common + B.common) * 0.2);
}

// ------------------------------------------------------------------ escalas e som por família

export const SCALES: Record<string, { name: L; steps: number[] }> = {
  major: { name: l('Maior', 'Major'), steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: l('Menor', 'Minor'), steps: [0, 2, 3, 5, 7, 8, 10] },
  pent: { name: l('Pentatônica', 'Pentatonic'), steps: [0, 2, 4, 7, 9] },
  mpent: { name: l('Pentatônica menor', 'Minor pentatonic'), steps: [0, 3, 5, 7, 10] },
  blues: { name: l('Blues', 'Blues'), steps: [0, 3, 5, 6, 7, 10] },
  dorian: { name: l('Dórico', 'Dorian'), steps: [0, 2, 3, 5, 7, 9, 10] },
  mixo: { name: l('Mixolídio', 'Mixolydian'), steps: [0, 2, 4, 5, 7, 9, 10] },
  phryg: { name: l('Frígio', 'Phrygian'), steps: [0, 1, 3, 5, 7, 8, 10] },
};

export type DrumStyle = 'jazz' | 'rock' | 'four' | 'trap' | 'latin' | 'reggae' | 'samba' | 'none';
export interface FamilySound { bpm: number; scale: string; lead: OscillatorTypeLike; pad: OscillatorTypeLike; swing: number; drums: DrumStyle; minor: boolean }
export type OscillatorTypeLike = 'sine' | 'square' | 'sawtooth' | 'triangle';

export const FAMILY_SOUND: Record<FamilyId, FamilySound> = {
  blues_jazz: { bpm: 112, scale: 'blues', lead: 'triangle', pad: 'sine', swing: 0.33, drums: 'jazz', minor: false },
  country_folk: { bpm: 100, scale: 'major', lead: 'triangle', pad: 'triangle', swing: 0.1, drums: 'rock', minor: false },
  rnb: { bpm: 96, scale: 'dorian', lead: 'sine', pad: 'sine', swing: 0.15, drums: 'rock', minor: true },
  rock: { bpm: 128, scale: 'mpent', lead: 'sawtooth', pad: 'square', swing: 0, drums: 'rock', minor: false },
  pop: { bpm: 118, scale: 'major', lead: 'square', pad: 'triangle', swing: 0, drums: 'four', minor: false },
  hiphop: { bpm: 90, scale: 'minor', lead: 'sine', pad: 'triangle', swing: 0.2, drums: 'trap', minor: true },
  electronic: { bpm: 126, scale: 'minor', lead: 'sawtooth', pad: 'sawtooth', swing: 0, drums: 'four', minor: true },
  caribbean: { bpm: 84, scale: 'major', lead: 'triangle', pad: 'square', swing: 0.1, drums: 'reggae', minor: false },
  latin: { bpm: 100, scale: 'minor', lead: 'triangle', pad: 'triangle', swing: 0.05, drums: 'latin', minor: true },
  brazil: { bpm: 104, scale: 'dorian', lead: 'triangle', pad: 'sine', swing: 0.25, drums: 'samba', minor: false },
  africa: { bpm: 112, scale: 'pent', lead: 'square', pad: 'triangle', swing: 0.15, drums: 'latin', minor: false },
  asia_me: { bpm: 96, scale: 'phryg', lead: 'triangle', pad: 'sine', swing: 0, drums: 'none', minor: true },
  europe: { bpm: 108, scale: 'minor', lead: 'triangle', pad: 'sine', swing: 0, drums: 'four', minor: true },
  sacred: { bpm: 72, scale: 'major', lead: 'sine', pad: 'sine', swing: 0, drums: 'none', minor: false },
};

// ------------------------------------------------------------------ era

export type EraSound = 'gramophone' | 'am' | 'fm' | 'digital' | 'neural';

/** Som da gravação feita em um ano (cadeia de filtro do trecho). */
export function eraSoundOf(year: number): EraSound {
  if (year < 1935) return 'gramophone';
  if (year < 1962) return 'am';
  if (year < 1990) return 'fm';
  if (year < 2032) return 'digital';
  return 'neural';
}

/** Meio pelo qual a rádio do jogo chega ao ouvinte no ano corrente. */
export function broadcastSound(s: GameState): EraSound {
  if (!hasTech(s, 'electric_rec') || s.year < 1930) return 'gramophone';
  if (!hasTech(s, 'fm')) return 'am';
  if (!hasTech(s, 'streaming')) return 'fm';
  if (hasTech(s, 'neural')) return 'neural';
  return 'digital';
}

export const ERA_NAMES: Record<EraSound, L> = {
  gramophone: l('Gramofone (chiado, banda estreita)', 'Gramophone (crackle, narrow band)'),
  am: l('Rádio AM', 'AM radio'),
  fm: l('FM e vinil', 'FM and vinyl'),
  digital: l('Digital', 'Digital'),
  neural: l('Neural', 'Neural'),
};

/** Número de pistas do estúdio na era: 1, 4, 8, 24 ou ilimitado (99). */
export function trackLimit(s: GameState): number {
  if (!hasTech(s, 'multitrack')) return 1;
  if (hasTech(s, 'daw')) return 99;
  const mt = s.techDates.multitrack ?? 1955;
  if (hasTech(s, 'synth', s.year - 3)) return 24;
  if (s.year >= mt + 11) return 8;
  return 4;
}

export const TRACK_LABEL = (n: number): string => (n >= 99 ? '∞' : String(n));

/** Duração máxima por faixa (segundos) e se a intro precisa ser curta (streaming paga após 30 s). */
export function eraLimits(s: GameState): { maxSeconds: number; shortIntro: boolean; note: L } {
  if (hasTech(s, 'streaming')) return { maxSeconds: 300, shortIntro: true, note: l('Streaming: só conta a execução depois de 30 s — intro curta, refrão cedo.', 'Streaming: a play only counts after 30 s — short intro, early chorus.') };
  if (!hasTech(s, 'lp')) return { maxSeconds: 190, shortIntro: false, note: l('Disco de 78 rotações: cerca de 3 minutos por lado.', '78 rpm disc: about 3 minutes per side.') };
  if (s.year < 1966) return { maxSeconds: 180, shortIntro: false, note: l('Compacto e rádio: 3 minutos no máximo.', 'Single and radio: 3 minutes at most.') };
  if (s.year < 1985) return { maxSeconds: 270, shortIntro: false, note: l('FM aceita faixas mais longas; o rádio AM ainda corta.', 'FM accepts longer tracks; AM radio still edits.') };
  return { maxSeconds: 300, shortIntro: false, note: l('CD e clipe: até uns 5 minutos.', 'CD and video: up to about 5 minutes.') };
}

/** Volume da masterização deixa de ajudar após a normalização das plataformas. */
export function loudnessNormalized(s: GameState): boolean {
  return s.year >= 2014 || hasTech(s, 'streaming', s.year - 6);
}

/** Bateria eletrônica (1980) e sampler (1986), ligados aos sintetizadores da run. */
export function drumMachineReady(s: GameState): boolean {
  return hasTech(s, 'synth') && s.year >= 1980;
}
export function samplerReady(s: GameState): boolean {
  return hasTech(s, 'synth') && s.year >= 1986;
}

export const BEAT_FAMILIES: FamilyId[] = ['hiphop', 'electronic', 'rnb', 'pop', 'brazil', 'caribbean', 'latin', 'africa'];

// ------------------------------------------------------------------ arranjo

export type BlockId = 'intro' | 'verse' | 'pre' | 'chorus' | 'bridge' | 'solo' | 'outro';
export const BLOCKS: Record<BlockId, { name: L; bars: number; energy: number }> = {
  intro: { name: l('Intro', 'Intro'), bars: 4, energy: 30 },
  verse: { name: l('Verso', 'Verse'), bars: 8, energy: 50 },
  pre: { name: l('Pré-refrão', 'Pre-chorus'), bars: 4, energy: 65 },
  chorus: { name: l('Refrão', 'Chorus'), bars: 8, energy: 90 },
  bridge: { name: l('Ponte', 'Bridge'), bars: 4, energy: 55 },
  solo: { name: l('Solo', 'Solo'), bars: 8, energy: 75 },
  outro: { name: l('Final', 'Outro'), bars: 4, energy: 40 },
};

export const INSTRUMENTS: { id: string; name: L; from: number; families?: FamilyId[] }[] = [
  { id: 'vox', name: l('Voz', 'Vocals'), from: 1900 },
  { id: 'piano', name: l('Piano', 'Piano'), from: 1900 },
  { id: 'gtr', name: l('Guitarra/violão', 'Guitar'), from: 1900 },
  { id: 'bass', name: l('Baixo', 'Bass'), from: 1900 },
  { id: 'drums', name: l('Bateria', 'Drums'), from: 1900 },
  { id: 'horns', name: l('Metais', 'Horns'), from: 1900 },
  { id: 'strings', name: l('Cordas', 'Strings'), from: 1900 },
  { id: 'organ', name: l('Órgão', 'Organ'), from: 1935 },
  { id: 'perc', name: l('Percussão', 'Percussion'), from: 1900 },
  { id: 'synth', name: l('Sintetizador', 'Synthesizer'), from: 1970 },
  { id: 'dm', name: l('Bateria eletrônica', 'Drum machine'), from: 1980 },
  { id: 'sampler', name: l('Sampler', 'Sampler'), from: 1986 },
  { id: 'choir', name: l('Coro', 'Choir'), from: 1900 },
];

// ------------------------------------------------------------------ sequenciador

export const DRUM_ROWS: { id: string; name: L; sampler?: boolean }[] = [
  { id: 'kick', name: l('Bumbo', 'Kick') },
  { id: 'snare', name: l('Caixa', 'Snare') },
  { id: 'hat', name: l('Chimbal', 'Hi-hat') },
  { id: 'clap', name: l('Palmas', 'Clap') },
  { id: 'b808', name: l('Grave 808', '808 bass') },
  { id: 'chop', name: l('Sample cortado', 'Sample chop'), sampler: true },
];

/** Molde de groove por família: onde cada peça "deveria" cair (bitmask de 16 passos). */
export function grooveTemplate(family: FamilyId): number[] {
  const bits = (...steps: number[]) => steps.reduce((m, x) => m | (1 << x), 0);
  switch (family) {
    case 'hiphop': return [bits(0, 7, 10), bits(4, 12), bits(0, 2, 4, 6, 8, 10, 12, 14), bits(12), bits(0, 10), 0];
    case 'electronic': return [bits(0, 4, 8, 12), bits(4, 12), bits(2, 6, 10, 14), bits(4, 12), bits(0, 8), 0];
    case 'brazil': return [bits(0, 3, 8, 11), bits(4, 12), bits(0, 2, 3, 4, 6, 8, 10, 11, 12, 14), bits(6, 14), bits(0, 8), 0];
    case 'caribbean': return [bits(8), bits(8), bits(2, 6, 10, 14), 0, bits(0, 3, 8), 0];
    case 'latin': return [bits(0, 3, 8, 11), bits(4, 12), bits(0, 2, 4, 6, 8, 10, 12, 14), bits(3, 11), bits(0, 8), 0];
    default: return [bits(0, 8, 10), bits(4, 12), bits(0, 2, 4, 6, 8, 10, 12, 14), bits(12), bits(0, 8), 0];
  }
}

// ------------------------------------------------------------------ foco por etapa

export type Stage = 'comp' | 'arr' | 'rec' | 'mix';
export const STAGES: Record<Stage, L> = {
  comp: l('Composição', 'Songwriting'), arr: l('Arranjo', 'Arrangement'), rec: l('Gravação', 'Recording'), mix: l('Mixagem', 'Mixing'),
};

/** Distribuição ideal (oculta) por família, soma 100. */
export const FOCUS_IDEAL: Record<FamilyId, Record<Stage, number>> = {
  blues_jazz: { comp: 20, arr: 25, rec: 45, mix: 10 },
  country_folk: { comp: 40, arr: 20, rec: 30, mix: 10 },
  rnb: { comp: 25, arr: 25, rec: 30, mix: 20 },
  rock: { comp: 25, arr: 20, rec: 40, mix: 15 },
  pop: { comp: 35, arr: 20, rec: 15, mix: 30 },
  hiphop: { comp: 35, arr: 15, rec: 15, mix: 35 },
  electronic: { comp: 15, arr: 30, rec: 10, mix: 45 },
  caribbean: { comp: 25, arr: 20, rec: 30, mix: 25 },
  latin: { comp: 30, arr: 30, rec: 25, mix: 15 },
  brazil: { comp: 35, arr: 30, rec: 25, mix: 10 },
  africa: { comp: 20, arr: 30, rec: 35, mix: 15 },
  asia_me: { comp: 30, arr: 35, rec: 25, mix: 10 },
  europe: { comp: 30, arr: 30, rec: 20, mix: 20 },
  sacred: { comp: 35, arr: 25, rec: 30, mix: 10 },
};

// ------------------------------------------------------------------ equipamentos lendários

export type GearSound = 'echo' | 'plate' | 'tube' | 'tape' | 'gated' | 'b808' | 'vocoder' | 'ribbon' | 'neural';
export interface GearDef { id: string; name: L; desc: L; from: number; to: number; price: number; prod: number; perf: number; orig: number; families: FamilyId[]; sound: GearSound }

export const GEAR: GearDef[] = [
  { id: 'g_ribbon44', name: l('Microfone de fita "44"', '"44" ribbon microphone'), desc: l('Voz aveludada das big bands e dos crooners.', 'The velvet voice of big bands and crooners.'), from: 1932, to: 2040, price: 2500, prod: 2, perf: 2, orig: 0, families: ['blues_jazz', 'pop', 'sacred', 'brazil'], sound: 'ribbon' },
  { id: 'g_chamber', name: l('Câmara de eco subterrânea', 'Underground echo chamber'), desc: l('Reverb natural de concreto; o som dos anos 50.', 'Natural concrete reverb; the sound of the fifties.'), from: 1947, to: 2040, price: 9000, prod: 3, perf: 0, orig: 1, families: ['pop', 'rnb', 'rock', 'country_folk'], sound: 'echo' },
  { id: 'g_plate', name: l('Placa de reverb de aço', 'Steel plate reverb'), desc: l('Brilho de reverb em qualquer sala.', 'Reverb sheen in any room.'), from: 1957, to: 2040, price: 7000, prod: 3, perf: 0, orig: 0, families: ['pop', 'rnb', 'rock', 'europe'], sound: 'plate' },
  { id: 'g_tubecomp', name: l('Compressor valvulado lendário', 'Legendary tube compressor'), desc: l('Cola a mixagem e encorpa os graves.', 'Glues the mix and thickens the low end.'), from: 1952, to: 2040, price: 8000, prod: 4, perf: 0, orig: 0, families: ['rnb', 'rock', 'pop', 'hiphop'], sound: 'tube' },
  { id: 'g_tapeecho', name: l('Eco de fita jamaicano', 'Jamaican tape echo'), desc: l('Repetições que viram instrumento: o dub nasce aqui.', 'Repeats become an instrument: dub is born here.'), from: 1962, to: 2040, price: 5000, prod: 2, perf: 0, orig: 4, families: ['caribbean', 'electronic', 'hiphop', 'rock'], sound: 'tape' },
  { id: 'g_console', name: l('Console britânico de 1968', '1968 British console'), desc: l('Pré-amplificadores que definiram o rock.', 'The preamps that defined rock.'), from: 1968, to: 2040, price: 22000, prod: 6, perf: 1, orig: 0, families: ['rock', 'pop', 'rnb', 'country_folk'], sound: 'tube' },
  { id: 'g_gated', name: l('Sala de pedra com reverb fechado', 'Stone room with gated reverb'), desc: l('A caixa explosiva dos anos 80.', 'The explosive eighties snare.'), from: 1980, to: 2040, price: 12000, prod: 4, perf: 0, orig: 2, families: ['pop', 'rock', 'electronic'], sound: 'gated' },
  { id: 'g_808', name: l('Bateria eletrônica 808 original', 'Original 808 drum machine'), desc: l('O grave que sustenta o hip-hop e o trap.', 'The low end that holds up hip-hop and trap.'), from: 1980, to: 2040, price: 6000, prod: 3, perf: 0, orig: 3, families: ['hiphop', 'electronic', 'rnb', 'brazil'], sound: 'b808' },
  { id: 'g_vocoder', name: l('Vocoder de estúdio', 'Studio vocoder'), desc: l('Vozes robóticas, funk e disco espacial.', 'Robot voices, funk and space disco.'), from: 1975, to: 2040, price: 7000, prod: 2, perf: 0, orig: 4, families: ['electronic', 'rnb', 'pop'], sound: 'vocoder' },
  { id: 'g_neuralmix', name: l('Mixador neural', 'Neural mixer'), desc: l('Uma IA que mixa como os mestres.', 'An AI that mixes like the masters.'), from: 2030, to: 2040, price: 30000, prod: 6, perf: 0, orig: -1, families: ['electronic', 'pop', 'hiphop'], sound: 'neural' },
];

export const gearById = Object.fromEntries(GEAR.map((g) => [g.id, g])) as Record<string, GearDef>;

// ------------------------------------------------------------------ ímãs de geladeira

export interface Magnet { pt: string; en: string; tag?: 'political' | 'explicit' | 'rare' }

/** Palavras por fonte de ideia (tema). */
export const THEME_WORDS: Record<Idea['source'] | 'generic', Magnet[]> = {
  tour: [{ pt: 'estrada', en: 'road' }, { pt: 'motel', en: 'motel' }, { pt: 'farol', en: 'headlight' }, { pt: 'distância', en: 'distance' }, { pt: 'poeira', en: 'dust' }, { pt: 'viagem', en: 'journey' }],
  family: [{ pt: 'pai', en: 'father' }, { pt: 'mãe', en: 'mother' }, { pt: 'casa', en: 'home' }, { pt: 'berço', en: 'cradle' }, { pt: 'herança', en: 'legacy' }, { pt: 'mesa', en: 'table' }],
  movement: [{ pt: 'juventude', en: 'youth' }, { pt: 'rua', en: 'street' }, { pt: 'pista', en: 'floor' }, { pt: 'neon', en: 'neon' }, { pt: 'rebelde', en: 'rebel', tag: 'political' }, { pt: 'ritmo', en: 'rhythm' }],
  city: [{ pt: 'cidade', en: 'city' }, { pt: 'trem', en: 'train' }, { pt: 'esquina', en: 'corner' }, { pt: 'janela', en: 'window' }, { pt: 'luar', en: 'moonlight' }, { pt: 'avenida', en: 'avenue' }],
  love: [{ pt: 'coração', en: 'heart' }, { pt: 'beijo', en: 'kiss' }, { pt: 'paixão', en: 'passion' }, { pt: 'saudade', en: 'longing', tag: 'rare' }, { pt: 'amor', en: 'love' }, { pt: 'ciúme', en: 'jealousy' }],
  loss: [{ pt: 'adeus', en: 'goodbye' }, { pt: 'silêncio', en: 'silence' }, { pt: 'lágrima', en: 'tear' }, { pt: 'memória', en: 'memory' }, { pt: 'sombra', en: 'shadow' }, { pt: 'luto', en: 'mourning', tag: 'rare' }],
  politics: [{ pt: 'liberdade', en: 'freedom', tag: 'political' }, { pt: 'protesto', en: 'protest', tag: 'political' }, { pt: 'general', en: 'general', tag: 'political' }, { pt: 'povo', en: 'people', tag: 'political' }, { pt: 'muro', en: 'wall' }, { pt: 'verdade', en: 'truth' }],
  generic: [{ pt: 'noite', en: 'night' }, { pt: 'dia', en: 'day' }, { pt: 'sonhar', en: 'dream' }, { pt: 'dançar', en: 'dance' }, { pt: 'voltar', en: 'return' }, { pt: 'mar', en: 'sea' }, { pt: 'luz', en: 'light' }, { pt: 'fogo', en: 'fire' }, { pt: 'chão', en: 'ground' }, { pt: 'céu', en: 'sky' }, { pt: 'você', en: 'you' }, { pt: 'eu', en: 'I' }, { pt: 'corpo', en: 'body', tag: 'explicit' }, { pt: 'pecado', en: 'sin', tag: 'explicit' }],
};

/** Família do tema de uma música (a partir do texto do tema). */
export function themeSource(theme: L | undefined): Idea['source'] | 'generic' {
  if (!theme) return 'generic';
  const txt = `${theme.pt} ${theme.en}`.toLowerCase();
  const map: [Idea['source'], string[]][] = [
    ['tour', ['estrada', 'hotel', 'road', 'foreign', 'crowd', 'multidão', 'homesick']],
    ['family', ['pai', 'filho', 'casamento', 'herança', 'father', 'child', 'wedding']],
    ['movement', ['cena', 'juventude', 'pista', 'moda', 'scene', 'youth', 'dance']],
    ['city', ['bairro', 'cidade', 'trem', 'city', 'train', 'neighbourhood']],
    ['love', ['amor', 'separação', 'ciúme', 'reencontro', 'love', 'break', 'jealous']],
    ['loss', ['despedida', 'perdido', 'luto', 'farewell', 'lost', 'grief']],
    ['politics', ['protesto', 'censura', 'liberdade', 'guerra', 'protest', 'freedom', 'war']],
  ];
  for (const [src, keys] of map) if (keys.some((k) => txt.includes(k))) return src;
  return 'generic';
}

/** Chave de rima: as duas últimas letras (sem acento) do ímã no idioma. */
export function rhymeKey(word: string): string {
  const w = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return w.slice(-2);
}
