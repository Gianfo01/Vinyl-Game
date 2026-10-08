// Motor de áudio procedural (WebAudio, sem arquivos): toca uma PlaySpec com baixo, harmonia,
// melodia, bateria e a cadeia de filtros da era (gramofone, AM, FM, digital, neural). Só toca
// depois de um clique do jogador (o AudioContext nasce na primeira chamada de play).

import { Rng } from '../core/rng';
import { DRUM_ROWS, grooveTemplate } from '../sim/sys/music/data';
import { chordHz, chordRootHz, degreeHz, specSeconds, type PlaySpec } from './spec';

let ctx: AudioContext | null = null;
let current: PlayHandle | null = null;
const listeners = new Set<() => void>();

export interface PlayHandle {
  id: number;
  spec: PlaySpec;
  start: number;
  seconds: number;
  stop: () => void;
  /** 0..1 do trecho já tocado */
  progress: () => number;
  done: boolean;
}

let seq = 0;

export function audioAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window.AudioContext || (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
}

function getCtx(): AudioContext | null {
  if (!audioAvailable()) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function nowPlaying(): PlayHandle | null {
  return current && !current.done ? current : null;
}

/** Avisa a interface quando algo começa ou termina de tocar. */
export function onPlayChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(): void {
  for (const fn of [...listeners]) {
    try { fn(); } catch { /* interface já saiu da tela */ }
  }
}

export function stopAll(): void {
  current?.stop();
  current = null;
}

// ------------------------------------------------------------------ utilidades de síntese

function noiseBuffer(ac: AudioContext, seconds: number, seed: string): AudioBuffer {
  const r = Rng.fromSeed(`noise:${seed}`);
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = r.next() * 2 - 1;
  return buf;
}

function impulse(ac: AudioContext, seconds: number, decay: number, seed: string, gated = false): AudioBuffer {
  const r = Rng.fromSeed(`ir:${seed}`);
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = gated ? (t < 0.8 ? 1 : 0) : Math.pow(1 - t, decay);
      d[i] = (r.next() * 2 - 1) * env;
    }
  }
  return buf;
}

function softClip(ac: AudioContext, amount: number): WaveShaperNode {
  const ws = ac.createWaveShaper();
  const n = 1024;
  const curve = new Float32Array(n);
  const k = Math.max(0.01, amount) * 40;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  ws.curve = curve;
  ws.oversample = '2x';
  return ws;
}

// ------------------------------------------------------------------ padrões de bateria por estilo

function drumPattern(spec: PlaySpec): number[] {
  if (spec.beat) return spec.beat;
  const bits = (...steps: number[]) => steps.reduce((m, x) => m | (1 << x), 0);
  switch (spec.drums) {
    case 'jazz': return [bits(0, 8), bits(4, 12), bits(0, 3, 4, 7, 8, 11, 12, 15), 0, 0, 0];
    case 'rock': return [bits(0, 6, 8), bits(4, 12), bits(0, 2, 4, 6, 8, 10, 12, 14), 0, 0, 0];
    case 'four': return [bits(0, 4, 8, 12), bits(4, 12), bits(2, 6, 10, 14), spec.year >= 1975 ? bits(4, 12) : 0, 0, 0];
    case 'trap': return grooveTemplate('hiphop').map((m, i) => (i === 2 ? m | bits(13, 15) : m));
    case 'reggae': return grooveTemplate('caribbean');
    case 'samba': return grooveTemplate('brazil');
    case 'latin': return grooveTemplate('latin');
    default: return [0, 0, 0, 0, 0, 0];
  }
}

// ------------------------------------------------------------------ tocar

export function play(spec: PlaySpec, opts: { onEnd?: () => void; volume?: number } = {}): PlayHandle | null {
  stopAll();
  const ac = getCtx();
  if (!ac) return null;
  const r = Rng.fromSeed(`play:${spec.seed}`);
  const nodes: AudioScheduledSourceNode[] = [];
  const t0 = ac.currentTime + 0.08;
  const beat = 60 / spec.bpm;
  const eighth = beat / 2;
  const six = beat / 4;
  const total = specSeconds(spec);
  const lanes = new Set(spec.lanes);
  const fad = (i: number, def = 70) => (spec.faders?.[i] ?? def) / 100;
  const jitter = () => r.normal(0, (1 - spec.tightness) * 0.022);
  const detune = () => r.normal(0, (1 - spec.tightness) * 22);

  // ---------- cadeia mestre: barramentos → compressor/volume → era → saída
  const master = ac.createGain();
  master.gain.value = (opts.volume ?? 0.8) * 0.5;
  const comp = ac.createDynamicsCompressor();
  const loud = spec.loud ?? (spec.year >= 1995 ? 55 : 35);
  comp.threshold.value = -8 - loud * 0.32;
  comp.ratio.value = 2 + loud / 10;
  comp.attack.value = 0.005;
  comp.release.value = 0.15;
  const makeup = ac.createGain();
  makeup.gain.value = 0.8 + loud / 110;
  const tone = ac.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2500 + spec.clarity * 15000;
  let tail: AudioNode = makeup;
  const bus = ac.createGain();
  bus.connect(comp).connect(makeup);
  if (loud > 78) { const clip = softClip(ac, (loud - 78) / 30); tail.connect(clip); tail = clip; }
  if (spec.fx.includes('tube')) { const sat = softClip(ac, 0.15); tail.connect(sat); tail = sat; }
  tail.connect(tone);
  tail = tone;
  // era
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  const era = spec.era;
  hp.frequency.value = era === 'gramophone' ? 320 : era === 'am' ? 180 : era === 'fm' ? 35 : 20;
  lp.frequency.value = era === 'gramophone' ? 3000 : era === 'am' ? 4800 : era === 'fm' ? 13000 : 20000;
  tail.connect(hp).connect(lp);
  tail = lp;
  if (era === 'gramophone' || era === 'am') {
    const mid = ac.createBiquadFilter();
    mid.type = 'peaking';
    mid.frequency.value = 1400;
    mid.gain.value = era === 'gramophone' ? 7 : 3;
    tail.connect(mid);
    tail = mid;
  }
  // "wow" do disco: atraso modulado
  if (era === 'gramophone' || era === 'fm') {
    const d = ac.createDelay(0.05);
    d.delayTime.value = 0.01;
    const lfo = ac.createOscillator();
    lfo.frequency.value = era === 'gramophone' ? 0.55 : 0.3;
    const depth = ac.createGain();
    depth.gain.value = era === 'gramophone' ? 0.0016 : 0.0004;
    lfo.connect(depth).connect(d.delayTime);
    lfo.start(t0);
    lfo.stop(t0 + total + 1);
    nodes.push(lfo);
    tail.connect(d);
    tail = d;
  }
  tail.connect(master).connect(ac.destination);

  // reverb/eco (equipamento lendário muda o espaço)
  const reverbSend = ac.createGain();
  reverbSend.gain.value = 0.18 * fad(5, 50) * 2;
  const conv = ac.createConvolver();
  const gated = spec.fx.includes('gated');
  conv.buffer = impulse(ac, gated ? 0.35 : spec.fx.includes('echo') ? 2.4 : spec.fx.includes('plate') ? 1.8 : 1.1, gated ? 1 : 3, spec.seed, gated);
  reverbSend.connect(conv).connect(bus);
  if (spec.fx.includes('tape')) {
    const dl = ac.createDelay(1.5);
    dl.delayTime.value = beat * 0.75;
    const fb = ac.createGain();
    fb.gain.value = 0.42;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200;
    reverbSend.connect(dl);
    dl.connect(f).connect(fb).connect(dl);
    f.connect(bus);
  }
  if (spec.fx.includes('neural')) {
    const dl = ac.createDelay(0.05);
    dl.delayTime.value = 0.018;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.8;
    const g = ac.createGain();
    g.gain.value = 0.004;
    lfo.connect(g).connect(dl.delayTime);
    lfo.start(t0);
    lfo.stop(t0 + total + 1);
    nodes.push(lfo);
    reverbSend.connect(dl).connect(bus);
  }

  // barramentos por canal (faders da mesa)
  const ch = (i: number, def: number) => {
    const g = ac.createGain();
    g.gain.value = fad(i, def);
    g.connect(bus);
    g.connect(reverbSend);
    return g;
  };
  const voxBus = ch(0, 75);
  const drumBus = ch(1, 70);
  const bassBus = ch(2, 65);
  const harmBus = ch(3, 60);
  const hornBus = ch(4, 50);

  const nb = noiseBuffer(ac, 2, spec.seed);

  const tone1 = (dest: AudioNode, freq: number, at: number, dur: number, wave: OscillatorType, vol: number, o: { attack?: number; release?: number; lp?: number; vib?: number; glide?: number; detune?: number } = {}) => {
    if (at + dur < t0) return;
    const osc = ac.createOscillator();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq * (o.glide ?? 1), at);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(freq, at + Math.min(dur, 0.12));
    osc.detune.value = o.detune ?? detune();
    const g = ac.createGain();
    const a = o.attack ?? 0.01;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + a);
    g.gain.setValueAtTime(vol, at + Math.max(a, dur - (o.release ?? 0.05)));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + (o.release ?? 0.05));
    let head: AudioNode = osc;
    if (o.lp) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      head.connect(f);
      head = f;
    }
    if (o.vib) {
      const lfo = ac.createOscillator();
      lfo.frequency.value = 5.2;
      const lg = ac.createGain();
      lg.gain.value = o.vib;
      lfo.connect(lg).connect(osc.detune);
      lfo.start(at);
      lfo.stop(at + dur + 0.2);
      nodes.push(lfo);
    }
    head.connect(g).connect(dest);
    osc.start(at);
    osc.stop(at + dur + (o.release ?? 0.05) + 0.05);
    nodes.push(osc);
  };

  const noise = (dest: AudioNode, at: number, dur: number, vol: number, type: BiquadFilterType, freq: number, q = 1) => {
    const src = ac.createBufferSource();
    src.buffer = nb;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(at, r.float(0, 1.5), dur + 0.05);
    nodes.push(src);
  };

  // ---------- chiado da era (gramofone/AM)
  if (era === 'gramophone' || era === 'am') {
    const hiss = ac.createBufferSource();
    hiss.buffer = nb;
    hiss.loop = true;
    const hf = ac.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.value = 2500;
    const hg = ac.createGain();
    hg.gain.value = era === 'gramophone' ? 0.05 : 0.02;
    hiss.connect(hf).connect(hg).connect(master);
    hiss.start(t0);
    hiss.stop(t0 + total + 0.5);
    nodes.push(hiss);
    if (era === 'gramophone') for (let i = 0; i < total * 9; i++) noise(master, t0 + r.float(0, total), 0.006, r.float(0.15, 0.5), 'highpass', 1800);
  } else if (era === 'fm') {
    for (let i = 0; i < total * 2; i++) noise(master, t0 + r.float(0, total), 0.004, 0.06, 'highpass', 3000);
  }

  // ---------- compassos
  const pattern = drumPattern(spec);
  const drumsOn = (lanes.has('drums') || lanes.has('dm') || lanes.has('perc') || !!spec.beat) && spec.drums !== 'none' || !!spec.beat;
  const electronic = lanes.has('dm') || !!spec.beat;
  spec.bars.forEach((bar, bi) => {
    const barT = t0 + bi * beat * 4;
    const sec = bar.section;
    const energy = sec === 'chorus' ? 1 : sec === 'intro' || sec === 'outro' ? 0.6 : sec === 'bridge' ? 0.75 : 0.85;
    const chordF = chordHz(spec, bar.chord, 1);
    const rootF = chordRootHz(spec, bar.chord, 0);
    // baixo
    if (lanes.has('bass') || lanes.has('sampler') || lanes.has('synth')) {
      const hits = spec.drums === 'four' ? [0, 1, 2, 3] : spec.drums === 'jazz' ? [0, 1, 2, 3] : spec.drums === 'reggae' ? [1.5, 2.5] : [0, 1.5, 2, 3];
      for (const h of hits) {
        const walk = spec.drums === 'jazz' ? chordF[Math.floor(h) % chordF.length] / 2 : rootF;
        tone1(bassBus, walk, barT + h * beat + jitter(), beat * 0.9, electronic ? 'sawtooth' : 'triangle', 0.5 * energy, { lp: electronic ? 600 : 900, release: 0.08 });
      }
    }
    // harmonia
    const harmTimbres: [string, OscillatorType, number, number][] = [['piano', 'triangle', 0.005, 0.6], ['gtr', 'sawtooth', 0.004, 0.35], ['organ', 'square', 0.03, 1], ['synth', spec.pad, 0.08, 1], ['strings', 'sawtooth', 0.35, 1]];
    for (const [lane, wave, atk, len] of harmTimbres) {
      if (!lanes.has(lane)) continue;
      const strum = lane === 'gtr' ? (spec.drums === 'reggae' ? [1, 3] : [0, 1, 2, 3]) : lane === 'piano' ? [0, 2] : [0];
      for (const h of strum) {
        chordF.forEach((f, k) => tone1(lane === 'strings' ? hornBus : harmBus, f, barT + h * beat + k * (lane === 'gtr' ? 0.012 : 0) + jitter(), beat * (lane === 'piano' || lane === 'gtr' ? len * (4 / strum.length) : 4) * 0.95, wave, (lane === 'organ' ? 0.06 : 0.09) * energy, { attack: atk, lp: lane === 'gtr' ? 1800 + spec.clarity * 2000 : lane === 'strings' ? 2600 : 4000, release: lane === 'strings' ? 0.4 : 0.1, detune: lane === 'synth' ? 8 : undefined }));
      }
    }
    if (lanes.has('choir')) chordF.forEach((f) => tone1(hornBus, f, barT, beat * 4, 'sine', 0.08 * energy, { attack: 0.25, release: 0.5, vib: 12 }));
    if (lanes.has('horns') && (sec === 'chorus' || sec === 'intro' || sec === 'solo')) {
      for (const h of [0, 1.5, 2.5]) chordF.slice(0, 3).forEach((f) => tone1(hornBus, f, barT + h * beat + jitter(), eighth * 1.6, 'square', 0.05, { lp: 1800 + spec.clarity * 1600, attack: 0.02 }));
    }
    // melodia (voz/lead): 16 colcheias cobrem 2 compassos
    if ((lanes.has('vox') || lanes.has('synth') || lanes.has('sampler')) && sec !== 'intro' && sec !== 'outro') {
      const shift = sec === 'chorus' ? 2 : sec === 'bridge' ? -1 : 0;
      for (let k = 0; k < 8; k++) {
        const idx = (bi % 2) * 8 + k;
        let deg = spec.melody[idx % spec.melody.length];
        if (deg === undefined || deg < 0) continue;
        if (sec === 'solo') deg = deg + ((idx * 3) % 5) - 2;
        let f = degreeHz(spec, deg + shift, 2);
        if (spec.weird > 0.55 && r.chance((spec.weird - 0.55) * 0.5)) f *= Math.pow(2, (r.chance(0.5) ? 1 : -1) / 12);
        const at = barT + k * eighth + (k % 2 === 1 ? spec.swing * eighth * 0.5 : 0) + jitter();
        const nxt = spec.melody[(idx + 1) % spec.melody.length];
        const dur = nxt === deg ? eighth * 0.9 : eighth * (nxt === -1 ? 1.8 : 0.95);
        const voc = spec.fx.includes('vocoder');
        tone1(voxBus, f, at, dur, voc ? 'sawtooth' : lanes.has('vox') ? spec.lead : 'sawtooth', 0.13 * (0.7 + spec.hook * 0.3), { vib: lanes.has('vox') ? 14 * (1 - spec.tightness * 0.5) : 0, lp: voc ? 1200 : spec.fx.includes('ribbon') ? 3500 : 5000, attack: 0.02, glide: spec.weird > 0.7 ? 0.97 : undefined });
      }
    }
    // bateria
    if (drumsOn) {
      for (let st = 0; st < 16; st++) {
        const at = barT + st * six + (st % 2 === 1 ? spec.swing * six * 0.6 : 0) + jitter() * 0.6;
        const on = (row: number) => ((pattern[row] ?? 0) >> st) & 1;
        if (on(0)) tone1(drumBus, spec.fx.includes('b808') ? 52 : 60, at, 0.18, 'sine', 0.9 * energy, { glide: 2.6, release: 0.12, detune: 0 });
        if (on(1)) { noise(drumBus, at, gated ? 0.22 : 0.14, 0.45 * energy, 'bandpass', 1900, 0.7); tone1(drumBus, 190, at, 0.06, 'triangle', 0.25, { detune: 0 }); if (gated) noise(reverbSend, at, 0.3, 0.6, 'bandpass', 1500); }
        if (on(2)) noise(drumBus, at, spec.drums === 'jazz' ? 0.18 : 0.04, (spec.drums === 'jazz' ? 0.09 : 0.14) * energy, 'highpass', spec.drums === 'jazz' ? 6000 : 8000);
        if (on(3)) for (const d of [0, 0.012, 0.024]) noise(drumBus, at + d, 0.05, 0.25, 'bandpass', 1300, 1.2);
        if (on(4)) tone1(bassBus, chordRootHz(spec, bar.chord, -1), at, beat * 1.4, 'sine', 0.8, { glide: 1.5, release: 0.3, detune: 0 });
        if (on(5) && DRUM_ROWS[5]) tone1(harmBus, chordF[st % chordF.length] * 2, at, six * 0.9, 'sawtooth', 0.07, { lp: 2400, detune: 0 });
      }
    } else if (lanes.has('perc')) {
      for (let st = 0; st < 16; st += 2) noise(drumBus, t0 + bi * beat * 4 + st * six, 0.05, 0.12, 'bandpass', 3500, 2);
    }
  });

  const id = ++seq;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const handle: PlayHandle = {
    id, spec, start: t0, seconds: total, done: false,
    progress: () => Math.max(0, Math.min(1, (ac.currentTime - t0) / total)),
    stop: () => {
      if (handle.done) return;
      handle.done = true;
      if (timer) clearTimeout(timer);
      const now = ac.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      setTimeout(() => {
        for (const n of nodes) { try { n.stop(); } catch { /* já parou */ } }
        try { master.disconnect(); } catch { /* ok */ }
      }, 120);
      if (current === handle) current = null;
      emit();
    },
  };
  timer = setTimeout(() => {
    if (handle.done) return;
    handle.stop();
    opts.onEnd?.();
  }, (total + 0.6) * 1000);
  current = handle;
  emit();
  return handle;
}

/** Nota curta isolada (cartas de acordes, grade da melodia, pads do sequenciador). */
export function blip(freqs: number[], dur = 0.5, wave: OscillatorType = 'triangle', vol = 0.12): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  for (const f of freqs) {
    const o = ac.createOscillator();
    o.type = wave;
    o.frequency.value = f;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/** Batida isolada do sequenciador (0 bumbo, 1 caixa, 2 chimbal, 3 palmas, 4 808, 5 sample). */
export function drumHit(row: number): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  if (row === 0 || row === 4) {
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(row === 4 ? 90 : 150, t);
    o.frequency.exponentialRampToValueAtTime(row === 4 ? 45 : 55, t + 0.12);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (row === 4 ? 0.7 : 0.25));
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + 0.8);
    return;
  }
  const len = Math.floor(ac.sampleRate * 0.2);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  const r = Rng.fromSeed(`hit${row}`);
  for (let i = 0; i < len; i++) d[i] = (r.next() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = row === 2 ? 'highpass' : 'bandpass';
  f.frequency.value = row === 2 ? 8000 : row === 5 ? 900 : 1800;
  const g = ac.createGain();
  g.gain.value = row === 2 ? 0.25 : 0.5;
  src.connect(f).connect(g).connect(ac.destination);
  src.start(t);
}

/** Relógio do contexto (para mini-jogos de ritmo). */
export function audioTime(): number {
  return getCtx()?.currentTime ?? performance.now() / 1000;
}
