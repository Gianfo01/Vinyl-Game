// Regras dos mini-jogos de composição e estúdio: cada um tem pontuação pura (a interface mostra
// os medidores), resolução automática pelos atributos (usa o `r` do jogo) e aplicação limitada
// dos bônus na música (via setGameBonus).

import { clamp, hashString, type Rng } from '../../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../../data/world';
import { addIdea } from '../../repertoire';
import { actLang, actState, actTalent } from '../../people';
import { requestSample } from '../../studio';
import type { Act, GameState, Song } from '../../types';
import type { Idea } from '../../xtypes';
import { fmtL, hasTech, money, notify, post } from '../../util';
import { activeCensorship } from '../../media';
import {
  BLOCKS, CHORDS, DRUM_ROWS, FAMILY_SOUND, FOCUS_IDEAL, GEAR, INSTRUMENTS, PROGRESSIONS, SCALES, STAGES, THEME_WORDS,
  chordHand, eraLimits, gearById, grooveTemplate, rhymeKey, samplerReady, themeSource, trackLimit, transitionCommon,
  type BlockId, type Magnet, type Stage,
} from './data';
import { ms, setGameBonus, songRec, syncSong, type Deltas } from './state';

const fam = (song: Song): FamilyId => familyOf(song.genre);
const pct = (v: number) => Math.round(clamp(v, 0, 100));

// ================================================================== escada de acordes

export interface ChordResult { fam: number; sur: number; classic?: { id: string; name: L }; score: number; deltas: Deltas }

function cyclicContains(seq: string[], pat: string[]): boolean {
  if (seq.length < pat.length) return false;
  for (let i = 0; i < seq.length; i++) {
    let ok = true;
    for (let j = 0; j < pat.length && ok; j++) ok = seq[(i + j) % seq.length] === pat[j];
    if (ok) return true;
  }
  return false;
}

export function scoreChords(s: GameState, song: Song, verse: string[], chorus: string[]): ChordResult {
  const f = fam(song);
  const rows = [verse, chorus].filter((x) => x.length);
  if (!rows.length) return { fam: 0, sur: 0, score: 0, deltas: {} };
  let tr = 0;
  let n = 0;
  let rare = 0;
  const used = new Set<string>();
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      tr += transitionCommon(row[i], row[(i + 1) % row.length]);
      n++;
      used.add(row[i]);
      if ((CHORDS[row[i]]?.common ?? 0.3) < 0.5) rare++;
    }
  }
  const famV = pct((tr / n) * 100 + (verse.length === 4 || verse.length === 8 ? 5 : -5));
  const sur = pct(used.size * 9 + rare * 8 + (verse.join() !== chorus.join() ? 12 : -10) + (100 - famV) * 0.3);
  let classic: ChordResult['classic'];
  for (const p of PROGRESSIONS) {
    if (s.year < p.from) continue;
    if (rows.some((row) => cyclicContains(row, p.chords) || (p.chords.length > row.length && cyclicContains(p.chords, row)))) {
      if (p.families.includes(f)) { classic = { id: p.id, name: p.name }; break; }
    }
  }
  const act = s.acts[song.actId];
  const w = 0.45 + (act?.positioning ?? 50) / 250; // crossover quer familiaridade
  const balance = 100 - Math.abs(famV - 62) - Math.abs(sur - 50) * 0.6;
  const score = pct(w * famV + (1 - w) * sur * 0.9 + balance * 0.25 + (classic ? 14 : 0) - 12);
  const deltas: Deltas = { melody: (score - 50) / 7, originality: (sur - 50) / 12 + (classic ? -0.5 : 0.5) };
  return { fam: famV, sur, classic, score, deltas };
}

export function autoChords(s: GameState, r: Rng, song: Song): { verse: string[]; chorus: string[] } {
  const f = fam(song);
  const t = s.acts[song.actId] ? actTalent(s, s.acts[song.actId]) : { comp: 50 };
  const hand = chordHand(f, s.year);
  const progs = PROGRESSIONS.filter((p) => p.families.includes(f) && s.year >= p.from && p.chords.every((c) => hand.includes(c) || CHORDS[c]));
  const verse = progs.length && r.chance(0.3 + t.comp / 160) ? [...r.pick(progs).chords] : Array.from({ length: 4 }, () => r.pick(hand));
  const chorus = progs.length && r.chance(t.comp / 140) ? [...r.pick(progs).chords] : Array.from({ length: 4 }, () => r.pick(hand));
  return { verse: verse.slice(0, 8), chorus: chorus.slice(0, 8) };
}

export function applyChords(s: GameState, songId: string, verse: string[], chorus: string[]): ChordResult | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.recorded) return l('A harmonia se define antes da gravação.', 'Harmony is set before recording.');
  if (verse.length < 2 || chorus.length < 2) return l('Monte ao menos 2 acordes no verso e no refrão.', 'Place at least 2 chords in the verse and chorus.');
  const res = scoreChords(s, song, verse.slice(0, 8), chorus.slice(0, 8));
  songRec(s, songId).chords = { verse: verse.slice(0, 8), chorus: chorus.slice(0, 8), fam: res.fam, sur: res.sur, classic: res.classic?.id, score: res.score };
  res.deltas = setGameBonus(s, songId, 'chords', res.deltas);
  return res;
}

// ================================================================== contorno da melodia

export const MELODY_STEPS = 16;
export const MELODY_ROWS = 10;

export function songScale(song: Song): string {
  return FAMILY_SOUND[fam(song)].scale;
}

export interface MelodyResult { hook: number; flow: number; range: number; score: number; deltas: Deltas }

export function scoreMelody(song: Song, notes: number[], scale = songScale(song)): MelodyResult {
  const ns = notes.slice(0, MELODY_STEPS);
  const played = ns.filter((x) => x >= 0);
  if (played.length < 4) return { hook: 0, flow: 0, range: 0, score: 0, deltas: {} };
  let small = 0;
  let iv = 0;
  for (let i = 1; i < ns.length; i++) if (ns[i] >= 0 && ns[i - 1] >= 0) { iv++; if (Math.abs(ns[i] - ns[i - 1]) <= 2) small++; }
  const flow = pct(100 - Math.abs((iv ? small / iv : 0) - 0.72) * 220);
  const span = Math.max(...played) - Math.min(...played);
  const range = pct(span >= 4 && span <= 8 ? 100 : span < 4 ? 45 + span * 12 : 100 - (span - 8) * 25);
  const motif = [0, 1, 2, 3].reduce((t, i) => t + (ns[i] >= 0 && ns[i] === ns[i + 8] ? 1 : 0) + (ns[i] >= 0 && ns[i] === ns[i + 4] ? 0.5 : 0), 0);
  const top = Math.max(...played);
  const climax = ns.slice(8).includes(top) && !ns.slice(0, 4).includes(top) ? 100 : ns.slice(8).includes(top) ? 70 : 35;
  const len = SCALES[scale]?.steps.length ?? 7;
  const last = [...ns].reverse().find((x) => x >= 0) ?? 0;
  const resolve = last % len === 0 ? 100 : last % len === Math.floor(len / 2) ? 60 : 30;
  const rests = ns.length - played.length;
  const breath = rests >= 1 && rests <= 5 ? 100 : rests === 0 ? 55 : 40;
  const hook = pct(motif * 14 + climax * 0.35 + (song.originality > 50 ? 6 : 0));
  const score = pct(hook * 0.35 + flow * 0.2 + range * 0.15 + resolve * 0.15 + breath * 0.15);
  return { hook, flow, range, score, deltas: { melody: (score - 50) / 6, originality: (hook - 50) / 25 } };
}

export function autoMelody(s: GameState, r: Rng, song: Song): number[] {
  const t = s.acts[song.actId] ? actTalent(s, s.acts[song.actId]).comp : 50;
  const skill = clamp((t + song.melody) / 200, 0.1, 1);
  const out: number[] = [];
  let cur = r.int(1, 4);
  for (let i = 0; i < MELODY_STEPS; i++) {
    if (i >= 8 && i < 12 && r.chance(skill)) { out.push(out[i - 8]); continue; }
    if (r.chance(0.12)) { out.push(-1); continue; }
    cur = clamp(cur + (r.chance(skill) ? r.int(-1, 1) : r.int(-4, 4)), 0, MELODY_ROWS - 1);
    if (i >= 12 && i < 14 && r.chance(skill)) cur = Math.min(MELODY_ROWS - 1, cur + 2);
    out.push(cur);
  }
  if (r.chance(skill)) out[MELODY_STEPS - 1] = 0;
  return out;
}

export function applyMelody(s: GameState, songId: string, notes: number[]): MelodyResult | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.recorded) return l('A melodia se define antes da gravação.', 'The melody is set before recording.');
  const ns = Array.from({ length: MELODY_STEPS }, (_, i) => clamp(Math.round(notes[i] ?? -1), -1, MELODY_ROWS - 1));
  const res = scoreMelody(song, ns);
  if (!res.score) return l('Desenhe ao menos 4 notas.', 'Draw at least 4 notes.');
  songRec(s, songId).melody = { notes: ns, scale: songScale(song), hook: res.hook, score: res.score };
  res.deltas = setGameBonus(s, songId, 'melody', res.deltas);
  return res;
}

// ================================================================== ímãs de geladeira

export interface MagnetPick extends Magnet { key: string; theme: boolean }

/** Ímãs disponíveis: palavras do tema da música, das ideias do caderno e gerais (determinístico). */
export function magnetsFor(s: GameState, song: Song): MagnetPick[] {
  const src = themeSource(song.theme);
  const ideaSrc = (s.ideas[song.actId] ?? []).map((i) => i.source);
  const out: MagnetPick[] = [];
  const seen = new Set<string>();
  const push = (key: string, m: Magnet, theme: boolean) => { if (!seen.has(m.pt)) { seen.add(m.pt); out.push({ ...m, key, theme }); } };
  THEME_WORDS[src].forEach((m, i) => push(`${src}:${i}`, m, src !== 'generic'));
  for (const is of [...new Set(ideaSrc)].slice(0, 2)) THEME_WORDS[is].slice(0, 3).forEach((m, i) => push(`${is}:${i}`, m, is === src));
  const gen = THEME_WORDS.generic;
  const h0 = hashString(song.id);
  for (let i = 0; i < 9; i++) { const k = (h0 + i * 5) % gen.length; push(`generic:${k}`, gen[k], false); }
  if (src === 'generic') THEME_WORDS.love.slice(0, 3).forEach((m, i) => push(`love:${i}`, m, false));
  return out;
}

export function magnetByKey(key: string): Magnet | undefined {
  const [src, i] = key.split(':');
  return THEME_WORDS[src as keyof typeof THEME_WORDS]?.[Number(i)];
}

export interface LyricsResult { coherence: number; rhyme: number; risk: number; title: string; score: number; deltas: Deltas; riskRule?: L }

/** Risco de censura das palavras na era e nos mercados do selo (0..1). */
export function lyricRisk(s: GameState, words: Magnet[]): { risk: number; rule?: L } {
  const pol = words.filter((w) => w.tag === 'political').length;
  const expl = words.filter((w) => w.tag === 'explicit').length;
  if (!pol && !expl) return { risk: 0 };
  let risk = 0;
  let rule: L | undefined;
  for (const c of activeCensorship(s)) {
    const reach = c.markets.some((m) => s.player.territories.includes(m)) ? 1 : 0.3;
    const hit = (c.banned.includes('political') ? pol * 0.35 : 0) + (c.id === 'pmrc' || c.id === 'hays' ? expl * 0.3 : expl * 0.08);
    const v = clamp(hit * c.level * 2 * reach, 0, 1);
    if (v > risk) { risk = v; rule = c.name; }
  }
  if (s.year < 1965) risk = Math.max(risk, expl * 0.15);
  return { risk: Math.round(clamp(risk, 0, 1) * 100) / 100, rule };
}

export function scoreLyrics(s: GameState, song: Song, lines: string[][], scheme: 'AABB' | 'ABAB' | 'free'): LyricsResult {
  const pool = new Map(magnetsFor(s, song).map((m) => [m.key, m]));
  const ls = lines.map((ln) => ln.map((k) => pool.get(k) ?? magnetByKey(k)).filter((x): x is MagnetPick | Magnet => !!x)).filter((ln) => ln.length);
  const words = ls.flat();
  if (ls.length < 2 || words.length < 4) return { coherence: 0, rhyme: 0, risk: 0, title: '', score: 0, deltas: {} };
  const themeW = words.filter((w) => 'theme' in w && w.theme).length;
  const coherence = pct((themeW / words.length) * 140 + 10);
  const endKey = (ln: Magnet[], lang: 'pt' | 'en') => rhymeKey(ln[ln.length - 1][lang]);
  const rhymeIn = (lang: 'pt' | 'en') => {
    const ks = ls.map((ln) => endKey(ln, lang));
    let pairs = 0;
    let ok = 0;
    if (scheme === 'free') return ks.length >= 2 ? 55 : 0;
    for (let i = 0; i + 1 < ks.length; i += scheme === 'AABB' ? 2 : 4) {
      if (scheme === 'AABB') { pairs++; if (ks[i] === ks[i + 1]) ok++; } else {
        if (i + 2 < ks.length) { pairs++; if (ks[i] === ks[i + 2]) ok++; }
        if (i + 3 < ks.length) { pairs++; if (ks[i + 1] === ks[i + 3]) ok++; }
      }
    }
    return pairs ? pct(25 + (ok / pairs) * 85) : 30;
  };
  const rhyme = Math.max(rhymeIn('pt'), rhymeIn('en'));
  const lenOk = ls.filter((ln) => ln.length >= 2 && ln.length <= 5).length / ls.length;
  const rare = words.filter((w) => w.tag === 'rare').length;
  const variety = new Set(words.map((w) => w.pt)).size / words.length;
  const { risk, rule } = lyricRisk(s, words);
  const score = pct(coherence * 0.35 + rhyme * 0.3 + lenOk * 100 * 0.15 + variety * 100 * 0.2 + rare * 4 - risk * 10);
  const act = s.acts[song.actId];
  const lang: 'pt' | 'en' = (song.lang ?? (act ? actLang(act) : 'en')) === 'pt' ? 'pt' : 'en';
  const head = ls[0].slice(0, 3).map((w) => w[lang]);
  const title = head.map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
  const pol = words.filter((w) => w.tag === 'political').length;
  return { coherence, rhyme, risk, title, score, riskRule: rule, deltas: { lyrics: (score - 50) / 6, originality: rare * 0.8 + pol * 0.5 } };
}

export function autoLyrics(s: GameState, r: Rng, song: Song): { lines: string[][]; scheme: 'AABB' | 'ABAB' } {
  const pool = magnetsFor(s, song);
  const t = s.acts[song.actId] ? actTalent(s, s.acts[song.actId]).lyr : 50;
  const skill = clamp(t / 100, 0.1, 1);
  const theme = pool.filter((m) => m.theme);
  const lines: string[][] = [];
  for (let i = 0; i < 4; i++) {
    const n = r.int(2, 4);
    const ln: string[] = [];
    for (let j = 0; j < n; j++) ln.push((theme.length && r.chance(skill) ? r.pick(theme) : r.pick(pool)).key);
    lines.push(ln);
  }
  // compositor bom acha rimas: troca a última palavra da linha 2 por uma que rime com a 1
  if (r.chance(skill)) {
    const k1 = rhymeKey(magnetByKey(lines[0][lines[0].length - 1])?.pt ?? '');
    const mate = pool.find((m) => rhymeKey(m.pt) === k1 && m.key !== lines[0][lines[0].length - 1]);
    if (mate) lines[1][lines[1].length - 1] = mate.key;
  }
  return { lines, scheme: 'AABB' };
}

export function applyLyrics(s: GameState, songId: string, lines: string[][], scheme: 'AABB' | 'ABAB' | 'free', useTitle = false): LyricsResult | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.recorded) return l('A letra se fecha antes da gravação.', 'Lyrics are locked before recording.');
  const ls = lines.slice(0, 8).map((x) => x.slice(0, 6));
  const res = scoreLyrics(s, song, ls, scheme);
  if (!res.score) return l('Monte ao menos 2 versos com 4 palavras no total.', 'Build at least 2 lines with 4 words in total.');
  songRec(s, songId).lyrics = { lines: ls, scheme, title: res.title, risk: res.risk, score: res.score };
  if (useTitle && res.title && !song.releaseId) song.title = res.title;
  res.deltas = setGameBonus(s, songId, 'lyrics', res.deltas);
  return res;
}

// ================================================================== linha do tempo do arranjo

export interface ArrangeResult { seconds: number; firstChorus: number; energy: number[]; tracks: number; lanes: string[]; warnings: L[]; score: number; deltas: Deltas }

export function availableInstruments(s: GameState): typeof INSTRUMENTS {
  return INSTRUMENTS.filter((i) => s.year >= i.from && (i.id !== 'synth' || hasTech(s, 'synth')) && (i.id !== 'sampler' || samplerReady(s)));
}

export function scoreArrange(s: GameState, song: Song, blocks: BlockId[], lanes: string[]): ArrangeResult {
  const bpm = FAMILY_SOUND[fam(song)].bpm;
  const barSec = (4 * 60) / bpm;
  const lim = eraLimits(s);
  const tracks = trackLimit(s);
  const okLanes = lanes.filter((x) => availableInstruments(s).some((i) => i.id === x)).slice(0, Math.min(tracks, 12));
  const warnings: L[] = [];
  if (lanes.length > okLanes.length) warnings.push(fmtL(l('O estúdio só tem {n} pista(s): instrumentos a mais ficaram de fora.', 'The studio only has {n} track(s): extra instruments were left out.'), { n: tracks >= 99 ? '∞' : tracks }));
  const bs = blocks.filter((b) => BLOCKS[b]).slice(0, 14);
  let t = 0;
  let firstChorus = -1;
  const energy: number[] = [];
  for (const b of bs) {
    if (b === 'chorus' && firstChorus < 0) firstChorus = t;
    t += BLOCKS[b].bars * barSec;
    energy.push(BLOCKS[b].energy);
  }
  const seconds = Math.round(t);
  let score = 40;
  const choruses = bs.filter((b) => b === 'chorus').length;
  score += choruses >= 2 ? 15 : choruses === 1 ? 5 : -15;
  if (bs[0] === 'intro' || bs[0] === 'verse') score += 5;
  if (bs.indexOf('verse') >= 0 && bs.indexOf('verse') < bs.indexOf('chorus')) score += 8;
  const lastCh = bs.lastIndexOf('chorus');
  if (lastCh > 0 && (bs[lastCh - 1] === 'bridge' || bs[lastCh - 1] === 'solo' || bs[lastCh - 1] === 'pre')) score += 10;
  if (bs[bs.length - 1] === 'outro' || bs[bs.length - 1] === 'chorus') score += 6;
  if (bs.filter((b) => b === 'intro').length > 1) score -= 8;
  if (seconds > lim.maxSeconds) { score -= Math.min(30, (seconds - lim.maxSeconds) / 4); warnings.push(fmtL(l('Longa demais para a era: {s}s (máx. {m}s).', 'Too long for the era: {s}s (max {m}s).'), { s: seconds, m: lim.maxSeconds })); }
  if (seconds < 100) { score -= 10; warnings.push(l('Curta demais: parece uma vinheta.', 'Too short: it sounds like a jingle.')); }
  if (lim.shortIntro && firstChorus > 35) { score -= 12; warnings.push(l('No streaming o refrão precisa chegar antes dos 30–35 s.', 'On streaming the chorus must land before 30–35 s.')); }
  if (lim.shortIntro && bs[0] === 'intro' && bs[1] === 'intro') score -= 6;
  const rich = clamp(okLanes.length, 0, 8);
  score += rich >= 3 && rich <= 6 ? 8 : rich < 2 ? -8 : 2;
  const varied = new Set(bs).size;
  score += varied * 2;
  const deltas: Deltas = {
    melody: (score - 50) / 10,
    originality: (bs.includes('bridge') ? 1 : 0) + (bs.includes('solo') ? 1 : 0) + (okLanes.includes('synth') || okLanes.includes('sampler') ? 1 : 0) - (varied <= 2 ? 2 : 0),
    production: clamp((rich - 3) * 0.8, -2, 3),
  };
  return { seconds, firstChorus: Math.round(Math.max(0, firstChorus)), energy, tracks, lanes: okLanes, warnings, score: pct(score), deltas };
}

export function autoArrange(s: GameState, r: Rng, song: Song): { blocks: BlockId[]; lanes: string[] } {
  const lim = eraLimits(s);
  const t = s.acts[song.actId] ? actTalent(s, s.acts[song.actId]) : { comp: 50, prod: 50 };
  const good = r.chance(0.35 + t.comp / 200);
  const blocks: BlockId[] = lim.shortIntro
    ? ['verse', 'chorus', 'verse', 'chorus', good ? 'bridge' : 'verse', 'chorus']
    : lim.maxSeconds <= 190 ? ['intro', 'verse', 'chorus', 'verse', 'chorus', good ? 'solo' : 'verse', 'chorus']
      : ['intro', 'verse', 'pre', 'chorus', 'verse', 'pre', 'chorus', good ? 'bridge' : 'solo', 'chorus', 'outro'];
  const inst = availableInstruments(s).map((i) => i.id);
  const lanes = ['vox', 'drums', 'bass', 'gtr', 'piano', 'strings', 'synth', 'horns'].filter((x) => inst.includes(x)).slice(0, Math.min(trackLimit(s), r.int(3, 6)));
  return { blocks, lanes };
}

export function applyArrange(s: GameState, songId: string, blocks: BlockId[], lanes: string[]): ArrangeResult | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.recorded) return l('O arranjo se define antes da gravação.', 'The arrangement is set before recording.');
  if (blocks.length < 3) return l('Monte ao menos 3 blocos.', 'Place at least 3 blocks.');
  const res = scoreArrange(s, song, blocks, lanes);
  songRec(s, songId).arrange = { blocks: blocks.slice(0, 14), lanes: res.lanes, seconds: res.seconds, score: res.score };
  song.minutes = Math.round((res.seconds / 60) * 10) / 10;
  res.deltas = setGameBonus(s, songId, 'arrange', res.deltas);
  return res;
}

// ================================================================== take no tempo

export interface TakeResult { score: number; boost: number; tired: boolean; applied: 'take' | 'pending' }

/** Sessão com take aguardando decisão para esta música (o mini-jogo melhora o último take). */
export function pendingTake(s: GameState, songId?: string) {
  return s.sessions.find((x) => !x.done && x.decision && (!songId || x.decision.songId === songId));
}

export function takeScore(hits: number, perfect: number, total: number): number {
  if (total <= 0) return 0;
  return pct(((hits + perfect * 0.5) / total) * 100);
}

export function applyTake(s: GameState, songId: string, hits: number, perfect: number, total: number): TakeResult | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  const score = takeScore(hits, perfect, total);
  const act = s.acts[song.actId];
  const misses = total - hits;
  const tired = total > 0 && misses / total > 0.4;
  if (tired && act) for (const id of act.members) if (s.persons[id]) s.persons[id].fatigue = clamp(s.persons[id].fatigue + 3, 0, 100);
  const sess = pendingTake(s, songId);
  const rec = songRec(s, songId);
  if (sess) {
    const tk = sess.takes[songId]?.[sess.takes[songId].length - 1];
    const boost = Math.round(clamp((score - 50) / 6, -3, 8));
    if (tk && !rec.take?.used) {
      tk.quality = clamp(tk.quality + boost, 5, 100);
      tk.note = boost >= 3 ? l('no tempo, com pegada', 'in the pocket') : boost < 0 ? l('atravessou o tempo', 'rushed the beat') : tk.note;
    }
    rec.take = { score, used: true };
    ms(s).played += 1;
    return { score, boost, tired, applied: 'take' };
  }
  if (song.recorded) return l('Faixa já gravada: o take no tempo vale na próxima sessão.', 'Track already recorded: the timing take counts in the next session.');
  rec.take = { score };
  setGameBonus(s, songId, 'take', { performance: (score - 50) / 7 }, 5);
  return { score, boost: Math.round((score - 50) / 7), tired, applied: 'pending' };
}

/** Resolução automática do take: atributos de voz e instrumento + acaso. */
export function autoTake(s: GameState, r: Rng, songId: string): TakeResult | L {
  const song = s.songs[songId];
  const act = song ? s.acts[song.actId] : undefined;
  if (!song || !act) return l('Música inexistente.', 'Unknown song.');
  const t = actTalent(s, act);
  const st = actState(s, act);
  const p = clamp((t.voice * 0.5 + t.instr * 0.5) / 100 - st.fatigue / 300, 0.2, 0.95);
  const total = 24;
  let hits = 0;
  let perfect = 0;
  for (let i = 0; i < total; i++) if (r.chance(p)) { hits++; if (r.chance(p * 0.6)) perfect++; }
  return applyTake(s, songId, hits, perfect, total);
}

// ================================================================== mesa de mixagem

export const MIX_CHANNELS: L[] = [l('Voz', 'Vocals'), l('Bateria', 'Drums'), l('Baixo', 'Bass'), l('Harmonia', 'Harmony'), l('Metais/cordas', 'Horns/strings'), l('Efeitos', 'FX')];
export const EQ_BANDS: L[] = [l('Graves', 'Lows'), l('Médios', 'Mids'), l('Agudos', 'Highs')];

/** Alvo de som da era e da família (faders 0..100, EQ −6..+6) e o nome do alvo. */
export function mixTarget(s: GameState, song: Song): { faders: number[]; eq: number[]; name: L } {
  const f = fam(song);
  const y = s.year;
  let t: { faders: number[]; eq: number[]; name: L };
  if (y < 1945) t = { faders: [90, 30, 35, 60, 70, 10], eq: [-4, 4, -4], name: l('Gramofone abafado: voz na frente, graves contidos', 'Muffled gramophone: vocals up front, restrained lows') };
  else if (y < 1966) t = { faders: [80, 50, 50, 65, 80, 45], eq: [-1, 3, 0], name: l('Parede de som: tudo junto, eco de câmara', 'Wall of sound: everything together, chamber echo') };
  else if (y < 1980) t = { faders: [75, 70, 65, 65, 45, 35], eq: [1, 1, 1], name: l('Banda ao vivo no estéreo', 'Live band in stereo') };
  else if (y < 1992) t = { faders: [75, 85, 60, 60, 40, 60], eq: [1, -1, 4], name: l('Reverb fechado dos anos 80: caixa explosiva e agudos brilhantes', 'Eighties gated reverb: explosive snare and bright highs') };
  else if (y < 2010) t = { faders: [85, 75, 75, 55, 35, 45], eq: [3, -1, 2], name: l('Polido de rádio: voz e grave grandes', 'Radio gloss: big vocals and bass') };
  else t = { faders: [85, 70, 90, 45, 25, 55], eq: [5, -2, 2], name: l('Grave de 808 e voz seca na cara', '808 low end and a dry, in-your-face vocal') };
  if (f === 'electronic' || f === 'hiphop') { t.faders[1] = Math.min(100, t.faders[1] + 10); t.faders[2] = Math.min(100, t.faders[2] + 10); t.faders[0] -= 10; }
  if (f === 'blues_jazz' || f === 'sacred') { t.faders[4] = Math.min(100, t.faders[4] + 15); t.faders[5] = Math.max(0, t.faders[5] - 15); }
  return t;
}

export function scoreMix(s: GameState, song: Song, faders: number[], eq: number[]): { score: number; dist: number[]; deltas: Deltas } {
  const tg = mixTarget(s, song);
  const dist = tg.faders.map((v, i) => Math.abs(v - (faders[i] ?? 50)));
  const eqd = tg.eq.map((v, i) => Math.abs(v - (eq[i] ?? 0)) * 6);
  const err = (dist.reduce((a, b) => a + b, 0) + eqd.reduce((a, b) => a + b, 0)) / (dist.length + eqd.length);
  const score = pct(100 - err * 2.2);
  return { score, dist, deltas: { production: (score - 50) / 6 } };
}

export function autoMix(s: GameState, r: Rng, song: Song): { faders: number[]; eq: number[] } {
  const tg = mixTarget(s, song);
  const prod = s.player.staff.filter((x) => x.role === 'engineer' || x.role === 'producer').reduce((t, x) => Math.max(t, x.skill), 30);
  const sd = clamp(30 - prod / 4, 4, 30);
  return { faders: tg.faders.map((v) => clamp(Math.round(v + r.normal(0, sd)), 0, 100)), eq: tg.eq.map((v) => clamp(Math.round(v + r.normal(0, sd / 8)), -6, 6)) };
}

export function applyMix(s: GameState, songId: string, faders: number[], eq: number[]): ReturnType<typeof scoreMix> | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.releaseId) return l('Música já lançada: a mixagem está fechada.', 'Song already released: the mix is locked.');
  const res = scoreMix(s, song, faders, eq);
  songRec(s, songId).mix = { faders: faders.slice(0, 6).map((x) => clamp(Math.round(x), 0, 100)), eq: eq.slice(0, 3).map((x) => clamp(Math.round(x), -6, 6)), score: res.score };
  res.deltas = setGameBonus(s, songId, 'mix', res.deltas);
  return res;
}

// ================================================================== masterização e guerra do volume

export interface MasterResult { loud: number; dynamics: number; radio: number; critics: number; normalized: boolean; score: number }

export function scoreMaster(s: GameState, loud: number): MasterResult {
  const L0 = clamp(loud, 0, 100);
  const normalized = s.year >= 2014 || hasTech(s, 'streaming', s.year - 6);
  const dynamics = pct(100 - Math.max(0, L0 - 40) * 1.4);
  const radio = normalized ? 0 : Math.round(L0 * 0.06 * 10) / 10; // % de apelo
  const critics = Math.round(Math.max(0, L0 - 60) * 0.08 * 10) / 10; // pontos de prestígio perdidos
  const best = normalized ? 45 : 65;
  const score = pct(100 - Math.abs(L0 - best) * 1.6);
  return { loud: L0, dynamics, radio, critics, normalized, score };
}

export function applyMaster(s: GameState, songId: string, loud: number): MasterResult | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (song.releaseId) return l('Música já lançada.', 'Song already released.');
  const res = scoreMaster(s, loud);
  songRec(s, songId).master = { loud: res.loud, score: res.score };
  // dinâmica esmagada perde um pouco de produção; um bom master acrescenta
  setGameBonus(s, songId, 'master', { production: (res.score - 50) / 12 - (res.dynamics < 40 ? 1.5 : 0) }, 4);
  return res;
}

// ================================================================== sequenciador de 16 passos

export function beatReady(s: GameState, song?: Song): boolean {
  return hasTech(s, 'synth') && s.year >= 1980 && (!song || true);
}

export function scoreBeat(s: GameState, song: Song, grid: number[]): { groove: number; variety: number; hits: number; score: number; deltas: Deltas } {
  const tpl = grooveTemplate(fam(song));
  const rows = DRUM_ROWS.length;
  const g = Array.from({ length: rows }, (_, i) => (DRUM_ROWS[i].sampler && !samplerReady(s) ? 0 : (grid[i] ?? 0) & 0xffff));
  const bitsOf = (m: number) => { let c = 0; for (let i = 0; i < 16; i++) if (m & (1 << i)) c++; return c; };
  const weights = [3, 3, 1.5, 1, 1.5, 1];
  let match = 0;
  let wsum = 0;
  let diff = 0;
  let hits = 0;
  for (let i = 0; i < rows; i++) {
    const a = g[i];
    const b = tpl[i];
    const inter = bitsOf(a & b);
    const uni = bitsOf(a | b);
    if (uni) { match += (inter / uni) * weights[i]; wsum += weights[i]; }
    diff += bitsOf(a ^ b);
    hits += bitsOf(a);
  }
  const groove = pct(wsum ? (match / wsum) * 100 + 10 : 0);
  const variety = pct(100 - Math.abs(diff - 8) * 7);
  const busy = hits > 44 ? (hits - 44) * 3 : hits < 6 ? 30 : 0;
  const chop = g[5] ? 6 : 0;
  const score = pct(groove * 0.6 + variety * 0.4 - busy + chop);
  return { groove, variety, hits, score, deltas: { production: (score - 50) / 8, originality: (variety - 50) / 12 + (chop ? 1 : 0) } };
}

export function autoBeat(s: GameState, r: Rng, song: Song): number[] {
  const tpl = grooveTemplate(fam(song));
  return tpl.map((m, i) => {
    let v = m;
    if (DRUM_ROWS[i].sampler && !samplerReady(s)) return 0;
    if (r.chance(0.5)) v ^= 1 << r.int(0, 15);
    if (i === 5 && samplerReady(s) && r.chance(0.5)) v |= (1 << r.int(0, 7)) | (1 << r.int(8, 15));
    return v;
  });
}

export function applyBeat(s: GameState, songId: string, grid: number[], saveAs?: string): ReturnType<typeof scoreBeat> | L {
  const song = s.songs[songId];
  if (!song) return l('Música inexistente.', 'Unknown song.');
  if (!beatReady(s)) return l('A bateria eletrônica ainda não chegou (por volta de 1980).', 'Drum machines have not arrived yet (around 1980).');
  if (song.releaseId) return l('Música já lançada.', 'Song already released.');
  const res = scoreBeat(s, song, grid);
  const rec = songRec(s, songId);
  rec.beat = { grid: grid.slice(0, DRUM_ROWS.length), score: res.score };
  const m = ms(s);
  if (saveAs && saveAs.trim()) {
    const id = `bt${s.week}-${m.beats.length}`;
    m.beats.push({ id, name: saveAs.trim().slice(0, 24), grid: rec.beat.grid, family: fam(song), score: res.score, uses: 1, week: s.week });
    if (m.beats.length > 6) m.beats.sort((a, b) => b.score - a.score).pop();
    rec.beat.sig = m.beats.some((b) => b.id === id) ? id : undefined;
  }
  res.deltas = setGameBonus(s, songId, 'beat', res.deltas, 5);
  return res;
}

/** Reaproveita uma batida-assinatura: o som do produtor; repetir demais cansa (originalidade cai). */
export function useSignatureBeat(s: GameState, songId: string, beatId: string): L | null {
  const song = s.songs[songId];
  const b = ms(s).beats.find((x) => x.id === beatId);
  if (!song || !b) return l('Batida inexistente.', 'Unknown beat.');
  if (song.releaseId) return l('Música já lançada.', 'Song already released.');
  b.uses += 1;
  const rec = songRec(s, songId);
  rec.beat = { grid: [...b.grid], score: b.score, sig: b.id };
  const res = scoreBeat(s, song, b.grid);
  setGameBonus(s, songId, 'beat', { production: res.deltas.production, originality: (res.deltas.originality ?? 0) - Math.max(0, b.uses - 3) * 1.5 }, 5);
  return null;
}

// ================================================================== garimpo de discos

/** Qualidade oculta do "break" de um disco (bateria aberta, groove) — determinística. */
export function breakScore(s: GameState, src: Song): number {
  const f = fam(src);
  const funk = ['rnb', 'blues_jazz', 'caribbean', 'brazil', 'africa', 'latin'].includes(f) ? 18 : f === 'rock' ? 8 : 0;
  const age = clamp((s.week - src.createdWeek) / 52, 0, 40);
  return pct((hashString(src.id + 'brk') % 40) + src.performance * 0.35 + funk + age * 0.4 - 10);
}

/** Caixa da loja: discos lançados por outros, mais antigos, com fama variada (determinística por semana). */
export function crateRecords(s: GameState, songId: string): Song[] {
  const me = s.songs[songId];
  const pool = Object.values(s.songs).filter((x) => x.recorded && x.releaseId && x.id !== songId && s.acts[x.actId]?.owner !== 'player' && s.week - x.createdWeek > 26);
  pool.sort((a, b) => (hashString(a.id + s.week) % 997) - (hashString(b.id + s.week) % 997));
  void me;
  return pool.slice(0, 8);
}

export function digRecord(s: GameState, r: Rng, songId: string, sourceId: string): { brk: number; status: string; fee: number } | L {
  const song = s.songs[songId];
  const src = s.songs[sourceId];
  if (!song || !src) return l('Disco inválido.', 'Invalid record.');
  if (song.recorded) return l('Samples entram antes da gravação.', 'Samples go in before recording.');
  const req = requestSample(s, r, songId, sourceId, 'sample');
  if (!('status' in req)) return req;
  const brk = breakScore(s, src);
  songRec(s, songId).dig = { sourceId, brk };
  const good = req.status === 'cleared' || req.status === 'uncleared';
  setGameBonus(s, songId, 'dig', good ? { originality: brk > 65 ? 5 : brk > 45 ? 2 : -1, production: brk > 65 ? 2 : 0 } : {}, 5);
  return { brk, status: req.status, fee: req.fee };
}

/** Garimpo automático: um produtor experiente tende a achar o melhor break da caixa. */
export function autoDig(s: GameState, r: Rng, songId: string): ReturnType<typeof digRecord> {
  const crate = crateRecords(s, songId);
  if (!crate.length) return l('A loja está sem discos interessantes agora.', 'The shop has no interesting records right now.');
  const skill = s.player.staff.filter((x) => x.role === 'producer').reduce((t, x) => Math.max(t, x.skill), 30);
  const best = [...crate].sort((a, b) => breakScore(s, b) - breakScore(s, a))[0];
  const pick = r.chance(skill / 120) ? best : r.pick(crate);
  return digRecord(s, r, songId, pick.id);
}

// ================================================================== audição às cegas

export interface BlindCand { actId: string; demoId?: string }

/** Três artistas disponíveis (demos recebidas primeiro), estáveis durante a semana. */
export function blindCandidates(s: GameState): BlindCand[] {
  const out: BlindCand[] = [];
  const demos = [...s.demos].filter((d) => s.acts[d.actId] && !s.acts[d.actId].owner).sort((a, b) => (hashString(a.id + s.week) % 991) - (hashString(b.id + s.week) % 991));
  for (const d of demos) if (out.length < 3 && !out.some((x) => x.actId === d.actId)) out.push({ actId: d.actId, demoId: d.id });
  if (out.length < 3) {
    const pool = Object.values(s.acts).filter((a) => !a.owner && (a.status === 'emerging' || a.status === 'active') && !out.some((x) => x.actId === a.id))
      .sort((a, b) => (hashString(a.id + s.week) % 991) - (hashString(b.id + s.week) % 991));
    for (const a of pool) { if (out.length >= 3) break; out.push({ actId: a.id }); }
  }
  return out;
}

export function blindReady(s: GameState): boolean {
  return s.week - ms(s).lastBlindWeek >= 4 && blindCandidates(s).length >= 3;
}

export function blindBet(s: GameState, r: Rng, pickActId: string): { correct: boolean; bestId: string; ear: number } | L {
  if (!blindReady(s)) return l('A próxima audição às cegas fica para daqui a algumas semanas.', 'The next blind audition is a few weeks away.');
  const cands = blindCandidates(s);
  if (!cands.some((c) => c.actId === pickActId)) return l('Escolha uma das três demos.', 'Pick one of the three demos.');
  const best = [...cands].sort((a, b) => (s.acts[b.actId]?.potential ?? 0) - (s.acts[a.actId]?.potential ?? 0))[0];
  const m = ms(s);
  m.lastBlindWeek = s.week;
  m.earTries += 1;
  const correct = best.actId === pickActId;
  if (correct) { m.earHits += 1; m.ear = Math.min(10, m.ear + 1); }
  m.played += 1;
  // a aposta conta como ouvir a demo: o artista entra no radar
  const pick = cands.find((c) => c.actId === pickActId);
  if (pick?.demoId) {
    const d = s.demos.find((x) => x.id === pick.demoId);
    if (d) d.heard = true;
  }
  const k = s.knowledge[pickActId];
  if (k) k.degree = Math.max(k.degree, 2);
  else s.knowledge[pickActId] = { actId: pickActId, degree: 2, stage: 'signal', bias: Math.round(r.normal(0, 6)), updatedWeek: s.week, source: 'demo' };
  return { correct, bestId: best.actId, ear: m.ear };
}

/** Bônus permanente de "ouvido": notas percebidas das demos novas chegam mais perto da verdade. */
export function earCorrectDemos(s: GameState): void {
  const m = ms(s);
  if (m.ear <= 0) return;
  m.earFixed ??= [];
  for (const d of s.demos) {
    if (m.earFixed.includes(d.id)) continue;
    const a = s.acts[d.actId];
    if (!a) continue;
    const truth = a.potential * 0.6 + 15;
    d.hint = Math.round(d.hint + (truth - d.hint) * (m.ear / 14));
    m.earFixed.push(d.id);
  }
  if (m.earFixed.length > 40) m.earFixed = m.earFixed.slice(-40);
}

// ================================================================== jam da banda

export type JamKind = 'riff' | 'groove' | 'solo' | 'lyric' | 'melody';
export interface JamCard { id: string; personId: string; kind: JamKind; power: number }
export const JAM_NAMES: Record<JamKind, L> = { riff: l('Riff', 'Riff'), groove: l('Levada', 'Groove'), solo: l('Solo', 'Solo'), lyric: l('Verso de letra', 'Lyric line'), melody: l('Frase melódica', 'Melodic phrase') };

export function jamCards(s: GameState, act: Act): JamCard[] {
  const out: JamCard[] = [];
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p || !p.alive) continue;
    const opts: [JamKind, number][] = [
      ['riff', p.skills.instr * (p.role === 'guitar' || p.role === 'keys' ? 1.1 : 0.8)],
      ['groove', p.skills.instr * (p.role === 'drums' || p.role === 'bass' || p.role === 'dj' ? 1.15 : 0.7)],
      ['solo', p.skills.instr * 0.9 + (p.traits.includes('big_ego') ? 10 : 0)],
      ['lyric', p.skills.lyr],
      ['melody', p.skills.comp],
    ];
    opts.sort((a, b) => b[1] - a[1] || (hashString(p.id + a[0]) % 7) - (hashString(p.id + b[0]) % 7));
    for (const [kind, v] of opts.slice(0, 2)) out.push({ id: `${id}:${kind}`, personId: id, kind, power: Math.round(clamp(v, 1, 100)) });
  }
  return out;
}

export function jamChemistry(s: GameState, act: Act): number {
  const ms0 = act.members.map((id) => s.persons[id]).filter((p) => p?.alive);
  let sum = 0;
  let n = 0;
  for (const a of ms0) for (const b of ms0) if (a !== b) { sum += a.rel[b.id] ?? 0; n++; }
  return Math.round(n ? sum / n : 30);
}

export function jamReady(s: GameState, actId: string): boolean {
  const key = s.year * 12 + s.month;
  return (ms(s).lastJam[actId] ?? -1) !== key;
}

export interface JamResult { score: number; combos: L[]; fight: boolean; ideas: Idea[] }

export function scoreJam(s: GameState, act: Act, picks: JamCard[]): { score: number; combos: L[]; fight: boolean } {
  const chem = jamChemistry(s, act);
  const kinds = picks.map((p) => p.kind);
  const combos: L[] = [];
  let score = picks.reduce((t, p) => t + p.power, 0) / Math.max(1, picks.length) * 0.55 + chem * 0.25 + 15;
  if (kinds.includes('riff') && kinds.includes('groove')) { score += 12; combos.push(l('Riff + levada: nasce um groove', 'Riff + groove: a groove is born')); }
  if (kinds.includes('lyric') && kinds.includes('melody')) { score += 12; combos.push(l('Letra + melodia: um refrão', 'Lyric + melody: a chorus')); }
  if (new Set(picks.map((p) => p.personId)).size >= 3) { score += 6; combos.push(l('Todo mundo junto', 'Everyone together')); }
  const egoSolos = picks.filter((p) => p.kind === 'solo' && s.persons[p.personId]?.traits.includes('big_ego')).length;
  const fight = egoSolos >= 1 && kinds.filter((k) => k === 'solo').length >= 2 || (egoSolos >= 1 && chem < -10);
  if (fight) score -= 20;
  return { score: pct(score), combos, fight };
}

export function playJam(s: GameState, r: Rng, actId: string, cardIds: string[]): JamResult | L {
  const act = s.acts[actId];
  if (!act) return l('Ato inexistente.', 'Unknown act.');
  if (act.members.length < 2) return l('Jam precisa de pelo menos duas pessoas.', 'A jam needs at least two people.');
  if (!jamReady(s, actId)) return l('A banda já fez a jam deste mês.', 'The band already jammed this month.');
  const cards = jamCards(s, act);
  const picks = cardIds.map((id) => cards.find((c) => c.id === id)).filter((x): x is JamCard => !!x).slice(0, 4);
  if (picks.length < 2) return l('Coloque ao menos 2 cartas na mesa.', 'Put at least 2 cards on the table.');
  const m = ms(s);
  m.lastJam[actId] = s.year * 12 + s.month;
  m.jams += 1;
  m.played += 1;
  const { score, combos, fight } = scoreJam(s, act, picks);
  const ids = [...new Set(picks.map((p) => p.personId))];
  for (const a of ids) for (const b of ids) if (a !== b && s.persons[a]) s.persons[a].rel[b] = clamp((s.persons[a].rel[b] ?? 0) + (fight ? -6 : score > 60 ? 3 : 1), -100, 100);
  if (fight) for (const id of ids) if (s.persons[id]) s.persons[id].stress = clamp(s.persons[id].stress + 5, 0, 100);
  for (const id of ids) if (s.persons[id]) s.persons[id].inspiration = clamp(s.persons[id].inspiration + (score > 60 ? 6 : 2), 0, 100);
  const ideas: Idea[] = [];
  const kinds = picks.map((p) => p.kind);
  const src: Idea['source'] = kinds.includes('lyric') ? (r.chance(0.5) ? 'love' : 'city') : kinds.includes('groove') ? 'movement' : r.chance(0.5) ? 'city' : 'tour';
  const n = fight ? (score > 50 ? 1 : 0) : score > 62 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const idea = addIdea(s, r, actId, i === 0 ? src : 'movement', clamp(score / 11 + r.int(-1, 1), 1, 10));
    if (idea) ideas.push(idea);
  }
  return { score, combos, fight, ideas };
}

export function autoJam(s: GameState, r: Rng, actId: string): JamResult | L {
  const act = s.acts[actId];
  if (!act) return l('Ato inexistente.', 'Unknown act.');
  const cards = [...jamCards(s, act)].sort((a, b) => b.power - a.power);
  // escolha razoável: busca um combo e evita dois solos
  const pick: JamCard[] = [];
  for (const k of ['riff', 'groove', 'lyric', 'melody', 'solo'] as JamKind[]) {
    const c = cards.find((x) => x.kind === k && !pick.includes(x));
    if (c && pick.length < 4 && !(k === 'solo' && pick.some((p) => p.kind === 'solo'))) pick.push(c);
  }
  if (pick.length < 2) pick.push(...cards.filter((c) => !pick.includes(c)).slice(0, 2 - pick.length));
  void r;
  return playJam(s, r, actId, pick.map((p) => p.id));
}

// ================================================================== foco por etapa

export function normalizeFocus(mix: Partial<Record<Stage, number>>): Record<Stage, number> {
  const keys = Object.keys(STAGES) as Stage[];
  const raw = keys.map((k) => Math.max(0, mix[k] ?? 25));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const out = {} as Record<Stage, number>;
  keys.forEach((k, i) => { out[k] = Math.round((raw[i] / sum) * 100); });
  return out;
}

export function setFocus(s: GameState, actId: string, mix: Partial<Record<Stage, number>>): Record<Stage, number> {
  const f = normalizeFocus(mix);
  ms(s).focus[actId] = f;
  return f;
}

export function focusFit(family: FamilyId, mix: Record<Stage, number>): number {
  const ideal = FOCUS_IDEAL[family];
  let d = 0;
  for (const k of Object.keys(STAGES) as Stage[]) d += Math.abs((mix[k] ?? 25) - ideal[k]);
  return Math.round(clamp(1 - d / 120, 0, 1) * 100) / 100;
}

// ================================================================== equipamentos lendários

export function gearAvailable(s: GameState) {
  return GEAR.filter((g) => s.year >= g.from && s.year <= g.to && !ms(s).gear.includes(g.id));
}

export function buyGear(s: GameState, gearId: string, offerId?: string): L | null {
  const def = gearById[gearId];
  const m = ms(s);
  if (!def) return l('Equipamento inexistente.', 'Unknown gear.');
  if (m.gear.includes(gearId)) return l('Você já tem este equipamento.', 'You already own this gear.');
  const offer = offerId ? m.gearOffers.find((o) => o.id === offerId && o.gearId === gearId) : undefined;
  if (!offer && (s.year < def.from || s.year > def.to)) return l('Ainda não existe nesta época.', 'It does not exist yet in this era.');
  const price = offer ? offer.price : money(s, def.price);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  if (!post(s, `x4gear:${gearId}`, -price, 'equipment', `Equipamento lendário: ${def.name.pt}`)) return l('Compra já registrada nesta semana.', 'Purchase already booked this week.');
  m.gear.push(gearId);
  if (offer) m.gearOffers = m.gearOffers.filter((o) => o !== offer);
  return null;
}

export function gearDeltas(s: GameState, song: Song): Deltas {
  const f = fam(song);
  const tierF = (song.studioTier ?? 1) === 0 ? 1 : 0.5;
  const d: Deltas = { production: 0, performance: 0, originality: 0 };
  for (const id of ms(s).gear) {
    const g = gearById[id];
    if (!g) continue;
    const fit = g.families.includes(f) ? 1 : 0.4;
    d.production! += g.prod * fit * tierF;
    d.performance! += g.perf * fit * tierF;
    d.originality! += g.orig * fit * tierF;
  }
  return d;
}

/** Ofertas de massa falida: selos fechados vendem seu equipamento com desconto. */
export function gearOffersMonth(s: GameState, r: Rng): void {
  const m = ms(s);
  m.gearOffers = m.gearOffers.filter((o) => o.expires > s.week);
  for (const lb of Object.values(s.labels)) {
    if (lb.active || m.seenLabels.includes(lb.id)) continue;
    m.seenLabels.push(lb.id);
    if (m.seenLabels.length > 60) m.seenLabels.shift();
    const opts = GEAR.filter((g) => s.year >= g.from && !m.gear.includes(g.id) && !m.gearOffers.some((o) => o.gearId === g.id));
    if (!opts.length || !r.chance(0.6)) continue;
    const g = r.pick(opts);
    m.gearOffers.push({ id: `go${s.week}-${g.id}`, gearId: g.id, from: lb.name, price: Math.round(money(s, g.price) * 0.45), expires: s.week + 12 });
    notify(s, fmtL(l('Leilão da massa falida de {lb}: {g} com 55% de desconto (Criação → Sala de composição).', '{lb} bankruptcy auction: {g} at 55% off (Creation → Writing room).'), { lb: lb.name, g: def(g.id) }), 'info');
  }
  if (m.gearOffers.length > 6) m.gearOffers = m.gearOffers.slice(-6);
}
const def = (id: string): L => gearById[id]?.name ?? l('equipamento', 'gear');

// ================================================================== gravação: aplica foco, equipamento e bônus pendentes

export function onRecorded(s: GameState, song: Song): void {
  const rec = songRec(s, song.id);
  if (rec.recSeen) return;
  const act = s.acts[song.actId];
  const f = fam(song);
  const focus = act ? ms(s).focus[act.id] : undefined;
  if (focus) {
    const fit = focusFit(f, focus);
    const b = (fit - 0.6) * 10;
    rec.b.focus = { performance: clamp(b, -4, 4), production: clamp(b, -4, 4), melody: clamp((focus.comp - 25) / 25 * fit, -1, 2) };
    const fl = (ms(s).focusLearn[f] ??= { tries: 0, best: 0, last: 0 });
    fl.tries += 1;
    fl.last = fit;
    if (fit > fl.best) { fl.best = fit; fl.bestMix = { ...focus }; }
  }
  const g = gearDeltas(s, song);
  if ((g.production ?? 0) || (g.performance ?? 0) || (g.originality ?? 0)) rec.b.gear = { production: clamp(g.production ?? 0, 0, 6), performance: clamp(g.performance ?? 0, 0, 3), originality: clamp(g.originality ?? 0, -2, 4) };
  syncSong(s, song.id);
}
