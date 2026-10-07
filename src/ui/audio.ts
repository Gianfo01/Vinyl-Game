// Prévias instrumentais procedurais por gênero e era, só por ação explícita (GDD §25).
// Sem fonogramas reais: osciladores, ruído e uma seed.

import { Rng } from '../core/rng';
import { familyOf, type FamilyId } from '../data/world';

let ctx: AudioContext | null = null;
let stopFn: (() => void) | null = null;

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  blues: [0, 3, 5, 6, 7, 10],
  pent: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const FAMILY_SOUND: Record<FamilyId, { bpm: number; scale: string; wave: OscillatorType; swing: number; drums: 'jazz' | 'rock' | 'four' | 'trap' | 'latin' | 'none' }> = {
  blues_jazz: { bpm: 112, scale: 'blues', wave: 'triangle', swing: 0.3, drums: 'jazz' },
  country_folk: { bpm: 100, scale: 'major', wave: 'triangle', swing: 0.1, drums: 'rock' },
  rnb: { bpm: 96, scale: 'dorian', wave: 'sine', swing: 0.15, drums: 'rock' },
  rock: { bpm: 128, scale: 'pent', wave: 'sawtooth', swing: 0, drums: 'rock' },
  pop: { bpm: 118, scale: 'major', wave: 'square', swing: 0, drums: 'four' },
  hiphop: { bpm: 90, scale: 'minor', wave: 'sine', swing: 0.2, drums: 'trap' },
  electronic: { bpm: 126, scale: 'minor', wave: 'sawtooth', swing: 0, drums: 'four' },
  caribbean: { bpm: 84, scale: 'major', wave: 'triangle', swing: 0.1, drums: 'latin' },
  latin: { bpm: 100, scale: 'minor', wave: 'triangle', swing: 0.05, drums: 'latin' },
  brazil: { bpm: 104, scale: 'dorian', wave: 'triangle', swing: 0.25, drums: 'latin' },
  africa: { bpm: 112, scale: 'pent', wave: 'square', swing: 0.15, drums: 'latin' },
  asia_me: { bpm: 96, scale: 'pent', wave: 'triangle', swing: 0, drums: 'none' },
  europe: { bpm: 108, scale: 'minor', wave: 'triangle', swing: 0, drums: 'four' },
  sacred: { bpm: 72, scale: 'major', wave: 'sine', swing: 0, drums: 'none' },
};

export function isPlaying(): boolean {
  return !!stopFn;
}

export function stopPreview(): void {
  stopFn?.();
  stopFn = null;
}

export function playPreview(seed: number, genre: string, year: number, seconds = 8): void {
  stopPreview();
  ctx ??= new AudioContext();
  const ac = ctx;
  const r = Rng.fromSeed(`audio:${seed}`);
  const fam = FAMILY_SOUND[familyOf(genre)];
  const bpm = fam.bpm + r.int(-8, 8) + (year > 1990 ? 4 : 0);
  const beat = 60 / bpm;
  const scale = SCALES[fam.scale];
  const root = 196 * Math.pow(2, r.int(-3, 4) / 12);
  const out = ac.createGain();
  out.gain.value = 0.18;
  // cadeia de era: anos 20–50 soam abafados e com chiado
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = year < 1950 ? 2400 : year < 1970 ? 5000 : year < 2000 ? 9000 : 14000;
  out.connect(filter).connect(ac.destination);
  const t0 = ac.currentTime + 0.05;
  const nodes: AudioScheduledSourceNode[] = [];
  const note = (freq: number, at: number, dur: number, wave: OscillatorType, vol: number) => {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = wave;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    o.connect(g).connect(out);
    o.start(at);
    o.stop(at + dur + 0.05);
    nodes.push(o);
  };
  const noise = (at: number, dur: number, vol: number, hp: number) => {
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ac.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(out);
    src.start(at);
    nodes.push(src);
  };
  const deg = (i: number, oct = 0) => root * Math.pow(2, (scale[((i % scale.length) + scale.length) % scale.length] + 12 * (oct + Math.floor(i / scale.length))) / 12);
  const steps = Math.floor(seconds / (beat / 2));
  const prog = [0, r.pick([3, 4, 5]), r.pick([4, 5]), r.pick([0, 3, 5])];
  let mel = r.int(0, scale.length - 1);
  for (let i = 0; i < steps; i++) {
    const swing = i % 2 === 1 ? fam.swing * beat * 0.5 : 0;
    const at = t0 + i * (beat / 2) + swing;
    const bar = Math.floor(i / 8) % 4;
    const chord = prog[bar];
    if (i % 4 === 0) note(deg(chord, -2), at, beat * 1.6, 'sine', 0.9);
    if (i % 8 === 0) for (const k of [0, 2, 4]) note(deg(chord + k, 0), at, beat * 3.5, fam.wave === 'sawtooth' ? 'triangle' : 'sine', 0.18);
    if (r.chance(0.6)) {
      mel = Math.max(-2, Math.min(9, mel + r.int(-2, 2)));
      note(deg(mel, 1), at, beat * r.pick([0.4, 0.5, 0.9]), fam.wave, 0.22);
    }
    const d = fam.drums;
    if (d !== 'none') {
      if ((d === 'four' && i % 2 === 0) || ((d === 'rock' || d === 'jazz') && i % 4 === 0) || (d === 'trap' && (i % 8 === 0 || i % 8 === 5)) || (d === 'latin' && (i % 8 === 0 || i % 8 === 3 || i % 8 === 6))) note(55, at, 0.25, 'sine', 1.2);
      if ((d === 'rock' || d === 'four' || d === 'trap') && i % 4 === 2) noise(at, 0.15, 0.6, 1500);
      if (d === 'jazz' || d === 'trap' || i % 1 === 0) noise(at, 0.04, d === 'trap' ? 0.25 : 0.15, 7000);
    }
  }
  if (year < 1960) for (let i = 0; i < seconds * 6; i++) noise(t0 + r.float(0, seconds), 0.01, 0.15, 3000);
  const timer = setTimeout(() => stopPreview(), seconds * 1000 + 300);
  stopFn = () => {
    clearTimeout(timer);
    for (const n of nodes) {
      try {
        n.stop();
      } catch {
        /* já parou */
      }
    }
    out.disconnect();
  };
}
