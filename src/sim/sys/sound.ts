// Direção sonora (rodada 8, §3.2 do documento do jogador): cada faixa tem seis eixos audíveis —
// energia, densidade, acústico↔eletrônico, foco vocal↔instrumental, cru↔polido e experimentação.
// Gênero e era dão o ponto de partida; os instrumentos de quem toca, o momento de vida de quem
// compõe (humor, estresse, inspiração, cansaço, vício, reabilitação, luto, paixão, idade, sucesso
// ou fracasso recente), o produtor, o estúdio, a abordagem e a receita de arranjo puxam cada eixo.
// O jogador pode marcar uma direção pretendida por ato (ao compor) e por faixa (ao gravar); o
// resultado se desvia conforme quem está envolvido.
//
// Os eixos importam no jogo: combinam (ou não) com rádio, clubes, pista, estádios, playlists, TV e
// vídeo curto; com o palco (bilheteria); com o gosto de cada crítico; com o estilo da capa; e com a
// identidade do artista e do selo, que evolui a cada lançamento. Sem áudio: só texto e visual.

import { Rng, clamp, hashString } from '../../core/rng';
import { APPROACHES, STUDIO_TIERS } from '../../data/rules';
import { familyOf, l, type FamilyId, type L } from '../../data/world';
import { coverById, type CoverStyle } from '../covers';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { CRITICS } from '../media';
import { eraProductionBase, songQ } from '../production';
import { songProfile } from '../repertoire';
import { PRODUCERS, SIGNATURES, type ProducerDef } from '../studio';
import type { Act, GameState, Person, Release, Song, SongSound } from '../types';
import { hasTech, playerActs, staffSkill } from '../util';
import { INGREDIENTS, songX, themeById } from './creation/core';
import { instrumentsOf } from './instruments';
import { activeThoughts, moodOf } from './people/thoughts';
import { P as peopleState } from './people/state';
import { vices } from './vices';

// ------------------------------------------------------------------ eixos

export type Axis = 'en' | 'de' | 'el' | 'vo' | 'po' | 'ex';
export const AXES: Axis[] = ['en', 'de', 'el', 'vo', 'po', 'ex'];
export type Vec = number[];

export const AXIS_INFO: Record<Axis, { name: L; lo: L; hi: L }> = {
  en: { name: l('Energia', 'Energy'), lo: l('calma', 'calm'), hi: l('explosiva', 'explosive') },
  de: { name: l('Densidade', 'Density'), lo: l('espaçosa', 'sparse'), hi: l('em camadas', 'layered') },
  el: { name: l('Acústico ↔ eletrônico', 'Acoustic ↔ electronic'), lo: l('acústica', 'acoustic'), hi: l('eletrônica', 'electronic') },
  vo: { name: l('Foco instrumental ↔ vocal', 'Instrumental ↔ vocal focus'), lo: l('instrumental', 'instrumental'), hi: l('voz na frente', 'vocal-led') },
  po: { name: l('Cru ↔ polido', 'Raw ↔ polished'), lo: l('crua', 'raw'), hi: l('polida', 'polished') },
  ex: { name: l('Experimentação', 'Experimentation'), lo: l('clássica', 'classic'), hi: l('experimental', 'experimental') },
};

const zero = (): Vec => [0, 0, 0, 0, 0, 0];
const add = (a: Vec, b: Vec, k = 1): Vec => a.map((x, i) => x + (b[i] ?? 0) * k);
const V = (p: Partial<Record<Axis, number>>): Vec => AXES.map((k) => p[k] ?? 0);
const round = (v: Vec): Vec => v.map((x) => Math.round(clamp(x, 0, 100)));

/** Distância média (0–100) entre dois perfis, só nos eixos definidos (≥ 0) do segundo. */
export function dist(a: Vec, b: Vec): number {
  let t = 0;
  let n = 0;
  for (let i = 0; i < 6; i++) {
    if (b[i] === undefined || b[i] < 0) continue;
    t += Math.abs(a[i] - b[i]);
    n++;
  }
  return n ? t / n : 0;
}

/** Uma parcela que puxa os eixos, com rótulo (para mostrar "quem puxou para onde"). */
export interface Pull { label: L; d: Vec }

// ------------------------------------------------------------------ gênero e era

const FAMILY_BASE: Record<FamilyId, Vec> = {
  blues_jazz: [45, 50, 8, 45, 45, 50],
  country_folk: [40, 35, 6, 70, 45, 25],
  rnb: [55, 50, 30, 80, 65, 30],
  rock: [72, 60, 15, 55, 45, 40],
  pop: [62, 55, 45, 80, 75, 25],
  hiphop: [65, 45, 65, 85, 60, 40],
  electronic: [75, 60, 92, 25, 65, 60],
  caribbean: [60, 45, 35, 65, 45, 40],
  latin: [68, 60, 25, 70, 55, 30],
  brazil: [55, 50, 15, 70, 50, 40],
  africa: [70, 65, 25, 60, 45, 45],
  asia_me: [50, 55, 30, 65, 55, 45],
  europe: [45, 50, 25, 60, 55, 40],
  sacred: [40, 55, 5, 75, 55, 25],
};

/** Teto do eixo eletrônico na era (antes do sintetizador, no máximo órgão elétrico e efeitos). */
export function electronicCap(s: GameState, year = s.year): number {
  if (hasTech(s, 'synth', year)) return 100;
  if (hasTech(s, 'multitrack', year)) return 38;
  return 22;
}

/** Ponto de partida do gênero na era (cada gênero com um desvio fixo da família). */
export function genreBase(s: GameState, genre: string, year = s.year): Vec {
  const base = FAMILY_BASE[familyOf(genre)] ?? FAMILY_BASE.pop;
  const out = base.map((x, i) => x + ((hashString(`${genre}:snd:${i}`) % 17) - 8));
  // polimento acompanha a técnica de gravação da época
  out[4] += (eraProductionBase(s) - 35) * 0.6;
  out[2] = Math.min(out[2], electronicCap(s, year));
  return out;
}

// ------------------------------------------------------------------ instrumentos de quem toca

const INST_PULL: Record<string, Partial<Record<Axis, number>>> = {
  voice: { vo: 6 }, guitar: { en: 5, de: 3, el: 2 }, acoustic: { el: -8, en: -3, po: -2 }, bass: { de: 2, en: 2 }, drums: { en: 6 },
  percussion: { en: 4, el: -3 }, piano: { el: -3, po: 2 }, synth: { el: 10, de: 3 }, organ: { de: 3, el: 2 }, sax: { de: 3, vo: -3, ex: 2 },
  trumpet: { de: 3, en: 3, vo: -2 }, flute: { el: -3, de: -2 }, harmonica: { po: -4, el: -3 }, violin: { po: 3, de: 3, el: -4 },
  cello: { po: 3, en: -2, el: -3 }, accordion: { el: -5, en: 3 }, cavaquinho: { el: -5, en: 2 }, banjo: { el: -5, po: -3 },
  sitar: { ex: 6, el: -2 }, turntables: { el: 8, en: 3, ex: 2 }, daw: { el: 12, po: 4 },
};

/** Nomes de instrumento com gênero e número (para a descrição concordar em português). */
const INST_NOUN: Record<string, { pt: string; en: string; g: 'm' | 'f'; pl: boolean }> = {
  guitar: { pt: 'guitarras', en: 'guitars', g: 'f', pl: true }, acoustic: { pt: 'violão', en: 'acoustic guitar', g: 'm', pl: false },
  bass: { pt: 'baixo', en: 'bass', g: 'm', pl: false }, drums: { pt: 'bateria', en: 'drums', g: 'f', pl: false },
  percussion: { pt: 'percussão', en: 'percussion', g: 'f', pl: false }, piano: { pt: 'piano', en: 'piano', g: 'm', pl: false },
  synth: { pt: 'sintetizadores', en: 'synths', g: 'm', pl: true }, organ: { pt: 'órgão', en: 'organ', g: 'm', pl: false },
  sax: { pt: 'saxofone', en: 'sax', g: 'm', pl: false }, trumpet: { pt: 'metais', en: 'horns', g: 'm', pl: true },
  flute: { pt: 'flauta', en: 'flute', g: 'f', pl: false }, harmonica: { pt: 'gaita', en: 'harmonica', g: 'f', pl: false },
  violin: { pt: 'cordas', en: 'strings', g: 'f', pl: true }, cello: { pt: 'violoncelo', en: 'cello', g: 'm', pl: false },
  accordion: { pt: 'sanfona', en: 'accordion', g: 'f', pl: false }, cavaquinho: { pt: 'cavaquinho', en: 'cavaquinho', g: 'm', pl: false },
  banjo: { pt: 'banjo', en: 'banjo', g: 'm', pl: false }, sitar: { pt: 'sitar', en: 'sitar', g: 'm', pl: false },
  turntables: { pt: 'scratches', en: 'scratches', g: 'm', pl: true }, daw: { pt: 'batidas programadas', en: 'programmed beats', g: 'f', pl: true },
  // ingredientes da receita
  distortion: { pt: 'guitarras distorcidas', en: 'distorted guitars', g: 'f', pl: true }, strings: { pt: 'cordas', en: 'strings', g: 'f', pl: true },
  horns: { pt: 'metais', en: 'horns', g: 'm', pl: true }, choir: { pt: 'coro', en: 'choir', g: 'm', pl: false },
  drum_machine: { pt: 'bateria eletrônica', en: 'drum machine', g: 'f', pl: false }, sample: { pt: 'samples de disco antigo', en: 'old-record samples', g: 'm', pl: true },
};

export function instrumentPull(s: GameState, act: Act): { d: Vec; lead?: string; parts: Pull[] } {
  let d = zero();
  const parts: Pull[] = [];
  let lead: { id: string; lvl: number } | undefined;
  const seen = new Set<string>();
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    for (const x of instrumentsOf(s, p)) {
      if (x.lvl < 35 || seen.has(x.id)) continue;
      seen.add(x.id);
      const pull = INST_PULL[x.id];
      if (!pull) continue;
      const v = V(pull).map((y) => y * (x.lvl / 100));
      d = add(d, v);
      if (x.id !== 'voice' && (!lead || x.lvl > lead.lvl)) lead = { id: x.id, lvl: x.lvl };
      const noun = INST_NOUN[x.id];
      if (noun && parts.length < 4) parts.push({ label: l(`${noun.pt} de ${p.name}`, `${p.name}'s ${noun.en}`), d: v });
    }
  }
  // formação: solo é mais espaçoso, banda grande mais densa
  const live = act.members.filter((id) => s.persons[id]?.alive).length;
  d[1] += (live - 3) * 3;
  return { d: d.map((x) => clamp(x, -18, 18)), lead: lead?.id, parts };
}

// ------------------------------------------------------------------ momento de vida de quem compõe

export const MOMENTS: Record<string, { name: L; phrase: L; themes?: string[] }> = {
  gr: { name: l('luto', 'grief'), phrase: l('escrita no luto', 'written in mourning'), themes: ['longing', 'heartbreak', 'faith'] },
  ad: { name: l('vício', 'addiction'), phrase: l('febril, escrita no excesso', 'feverish, written in excess'), themes: ['rebellion', 'party'] },
  rh: { name: l('reabilitação', 'rehab'), phrase: l('sóbria, sobre recomeçar', 'sober, about starting over'), themes: ['faith', 'nature'] },
  su: { name: l('sucesso recente', 'recent success'), phrase: l('confiante depois do sucesso', 'confident after a hit'), themes: ['money', 'party'] },
  fl: { name: l('fracasso recente', 'recent flop'), phrase: l('teimosa depois do tropeço', 'defiant after a stumble'), themes: ['rebellion', 'protest'] },
  lv: { name: l('apaixonado(a)', 'in love'), phrase: l('apaixonada', 'smitten'), themes: ['love'] },
  br: { name: l('término', 'breakup'), phrase: l('de coração partido', 'heartbroken'), themes: ['heartbreak'] },
  yo: { name: l('juventude', 'youth'), phrase: l('com pressa de juventude', 'with youthful hurry') },
  ol: { name: l('maturidade', 'maturity'), phrase: l('madura, sem pressa', 'mature, unhurried'), themes: ['nostalgia'] },
  ti: { name: l('exaustão', 'exhaustion'), phrase: l('cansada', 'weary') },
  st: { name: l('estresse', 'stress'), phrase: l('tensa', 'tense') },
  in: { name: l('inspiração', 'inspiration'), phrase: l('inspirada', 'inspired') },
  lo: { name: l('baixo astral', 'low spirits'), phrase: l('confessional', 'confessional'), themes: ['longing'] },
  hi: { name: l('alto astral', 'high spirits'), phrase: l('para cima', 'upbeat'), themes: ['party', 'dance'] },
};

const MOMENT_PULL: Record<string, Partial<Record<Axis, number>>> = {
  gr: { en: -15, de: -10, vo: 10, el: -6 },
  ad: { ex: 15, po: -12, de: 6 },
  rh: { en: -8, vo: 8, po: 4, ex: -4 },
  su: { po: 8, en: 6, de: 5 },
  fl: { ex: 10, po: -5 },
  lv: { en: 4, vo: 6 },
  br: { vo: 10, en: -6 },
  yo: { en: 8, el: 6, po: -5 },
  ol: { en: -8, el: -6, ex: -6, po: 6 },
  ti: { en: -10, de: -6 },
  st: { en: 8, po: -8 },
  in: { ex: 8, de: 5 },
  lo: { en: -6, vo: 6 },
  hi: { en: 6 },
};

function writersOf(s: GameState, act: Act, song?: Song): Person[] {
  const ids = song?.writers?.length ? song.writers : act.members;
  const out = ids.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive);
  return out.length ? out : act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p);
}

/** Houve morte ligada ao ato no último ano? (memória é cronológica: lê só o fim) */
function grieving(s: GameState, act: Act): boolean {
  for (let i = s.memory.length - 1, k = 0; i >= 0 && k < 500; i--, k++) {
    const m = s.memory[i];
    if (s.week - m.week > 52) break;
    if (m.kind === 'death' && m.actId === act.id) return true;
  }
  return false;
}

/** Último lançamento do ato no último ano: sucesso (top 10) ou fracasso (fora da parada). */
function recentOutcome(s: GameState, act: Act): 'su' | 'fl' | null {
  for (let i = act.releases.length - 1; i >= 0; i--) {
    const r = s.releases[act.releases[i]];
    if (!r || r.hist) continue;
    if (s.week - r.week > 52) return null;
    if (s.week - r.week < 6) continue; // cedo demais para saber
    if (r.peak <= 10) return 'su';
    if (r.peak > 60 && act.releases.length >= 2) return 'fl';
    return null;
  }
  return null;
}

/** Momento de vida de quem compõe: códigos ativos com intensidade (0–1). */
export function lifeMoments(s: GameState, act: Act, song?: Song): { code: string; k: number }[] {
  const ws = writersOf(s, act, song);
  if (!ws.length) return [];
  const out: { code: string; k: number }[] = [];
  const avg = (f: (p: Person) => number) => ws.reduce((t, p) => t + f(p), 0) / ws.length;
  const insp = avg((p) => p.inspiration);
  const stress = avg((p) => p.stress);
  const fat = avg((p) => p.fatigue);
  const morale = avg((p) => p.morale);
  const mood = avg((p) => moodOf(s, p.id));
  const age = avg((p) => s.year - p.born);
  const push = (code: string, k: number) => { if (k > 0.15) out.push({ code, k: Math.min(1, k) }); };
  if (grieving(s, act)) push('gr', 1);
  // vício e reabilitação: saúde do músico (e do próprio jogador, pelos vícios)
  let addicted = 0;
  let rehab = 0;
  for (const p of ws) {
    const hh = peopleState(s).health[p.id]; // só lê (não cria registro para NPCs)
    if (p.health === 'addiction' || (hh?.dependency ?? 0) > 60) addicted = Math.max(addicted, p.health === 'addiction' ? 1 : ((hh?.dependency ?? 0) - 50) / 40);
    if (p.health === 'recovering' || hh?.treatment?.kind === 'rehab') rehab = 1;
    if (p.isPlayer) {
      const v = vices(s);
      const dep = Math.max(v.dep.drink, v.dep.drugs);
      if (dep > 45) addicted = Math.max(addicted, (dep - 35) / 45);
      if (v.rehab || (v.clean.drugs > 0 && v.clean.drugs < 12 && v.dep.drugs > 20)) rehab = 1;
    }
  }
  push('ad', addicted);
  push('rh', rehab);
  const res = recentOutcome(s, act);
  if (res) push(res, 0.9);
  const th = new Set(ws.flatMap((p) => activeThoughts(s, p.id).map((x) => x.k)));
  if (th.has('breakup')) push('br', 1);
  else if (th.has('in_love')) push('lv', 0.8);
  if (age < 24) push('yo', (24 - age) / 5);
  if (age > 45) push('ol', (age - 45) / 15);
  if (fat > 55) push('ti', (fat - 50) / 35);
  if (stress > 60) push('st', (stress - 55) / 35);
  if (insp > 88) push('in', (insp - 84) / 14);
  const spirit = mood + (morale - 50) / 3;
  if (spirit < -8) push('lo', (-spirit - 4) / 20);
  else if (spirit > 10) push('hi', (spirit - 6) / 20);
  return out.sort((a, b) => b.k - a.k).slice(0, 4);
}

export function composerPull(s: GameState, act: Act, song?: Song): { d: Vec; moments: { code: string; k: number }[]; parts: Pull[] } {
  const ws = writersOf(s, act, song);
  let d = zero();
  const parts: Pull[] = [];
  if (ws.length) {
    const open = ws.reduce((t, p) => t + (p.persona?.openness ?? 50), 0) / ws.length;
    const perf = ws.reduce((t, p) => t + (p.persona?.perfectionism ?? 50), 0) / ws.length;
    const pers = V({ ex: (open - 50) * 0.3, po: (perf - 50) * 0.2, de: (perf - 50) * 0.12 });
    d = add(d, pers);
    if (Math.abs(open - 50) > 12 || Math.abs(perf - 50) > 12) parts.push({ label: l('Personalidade de quem compõe', 'Writers\' personality'), d: pers });
  }
  const moments = lifeMoments(s, act, song);
  for (const m of moments) {
    const v = V(MOMENT_PULL[m.code] ?? {}).map((x) => x * m.k);
    d = add(d, v);
    parts.push({ label: l(`Momento: ${MOMENTS[m.code].name.pt}`, `Moment: ${MOMENTS[m.code].name.en}`), d: v });
  }
  return { d: d.map((x) => clamp(x, -25, 25)), moments, parts };
}

// ------------------------------------------------------------------ estado: direção pretendida e assinaturas

export interface SoundState {
  /** direção pretendida por ato do jogador (−1 = livre) */
  aim: Record<string, number[]>;
  /** assinatura dos atos do jogador (média móvel dos lançamentos) */
  sig: Record<string, { v: number[]; n: number }>;
  /** assinatura do selo e sua história anual */
  label: { v: number[]; n: number; hist: { y: number; v: number[] }[] };
  init?: boolean;
}

declare module '../ext4' { interface Ext4 { sound: SoundState } }
registerExt4('sound', () => ({ aim: {}, sig: {}, label: { v: [50, 50, 50, 50, 50, 50], n: 0, hist: [] } }));
export const snd = (s: GameState): SoundState => (s as unknown as { x4: { sound: SoundState } }).x4.sound;

export const PRESETS: { id: string; name: L; v: number[] }[] = [
  { id: 'radio', name: l('Radiofônico', 'Radio-friendly'), v: [55, 50, -1, 80, 80, 15] },
  { id: 'clubs', name: l('Clube pequeno, cru', 'Small club, raw'), v: [78, 55, -1, 55, 30, 50] },
  { id: 'dance', name: l('Pista de dança', 'Dancefloor'), v: [85, 60, 75, 50, 65, -1] },
  { id: 'human', name: l('Soar humano', 'Sound human'), v: [-1, 40, 15, 70, 30, -1] },
  { id: 'exp', name: l('Experimental', 'Experimental'), v: [-1, -1, -1, 35, -1, 85] },
  { id: 'stadium', name: l('Estádio', 'Stadium'), v: [80, 75, -1, 70, 65, 25] },
];

export function actAim(s: GameState, actId: string): number[] | undefined {
  const a = snd(s).aim[actId];
  return a && a.some((x) => x >= 0) ? a : undefined;
}

export function setActAim(s: GameState, actId: string, aim: number[] | null): void {
  if (!aim || !aim.some((x) => x >= 0)) delete snd(s).aim[actId];
  else snd(s).aim[actId] = aim.map((x) => (x < 0 ? -1 : Math.round(clamp(x, 0, 100))));
}

/** Direção pretendida para uma faixa ainda não gravada (arranjo na gravação). */
export function setSongAim(s: GameState, songId: string, aim: number[] | null): L | null {
  const so = s.songs[songId];
  if (!so) return l('Música inexistente.', 'Unknown song.');
  if (so.recorded) return l('Já gravada: a direção vale só para a próxima gravação.', 'Already recorded: direction only applies to the next recording.');
  const sd = ensureSound(s, so);
  if (!aim || !aim.some((x) => x >= 0)) delete sd.a;
  else sd.a = aim.map((x) => (x < 0 ? -1 : Math.round(clamp(x, 0, 100))));
  return null;
}

/** Quanto a direção do jogador "pega" na composição: disciplina ajuda; espírito livre, ego e controle criativo resistem. */
export function composeControl(s: GameState, act: Act): number {
  const ms = act.members.map((id) => s.persons[id]).filter((p): p is Person => !!p?.alive);
  if (!ms.length) return 0.4;
  const disc = ms.reduce((t, p) => t + (p.persona?.discipline ?? 50), 0) / ms.length;
  const open = ms.reduce((t, p) => t + (p.persona?.openness ?? 50), 0) / ms.length;
  let c = 0.45 + ((disc - 50) / 50) * 0.15 - ((open - 50) / 50) * 0.12;
  if (ms.some((p) => p.traits.includes('big_ego'))) c -= 0.1;
  const ct = act.contractId ? s.contracts[act.contractId] : undefined;
  if (ct?.creativeControl) c -= 0.15;
  if (act.playerBand) c += 0.15;
  return clamp(c, 0.15, 0.75);
}

function pullToAim(v: Vec, aim: number[] | undefined, k: number): Vec {
  if (!aim) return v;
  return v.map((x, i) => (aim[i] >= 0 ? x + (aim[i] - x) * k : x));
}

// ------------------------------------------------------------------ composição

// cache da semana: o mesmo ato compõe várias faixas de uma vez (NPCs compõem muito)
let CACHE: { s: GameState; day: number; m: Map<string, unknown> } | null = null;
/** Esquece o cache (testes e telas que mudam o estado no mesmo dia). */
export function clearSoundCache(): void { CACHE = null; }
function cached<T>(s: GameState, key: string, f: () => T): T {
  const day = s.day + (s.clock?.dayInMonth ?? 0);
  if (!CACHE || CACHE.s !== s || CACHE.day !== day) CACHE = { s, day, m: new Map() };
  if (CACHE.m.has(key)) return CACHE.m.get(key) as T;
  const v = f();
  CACHE.m.set(key, v);
  return v;
}

/** Para onde o ato iria sozinho agora (gênero + era + instrumentos + momento de vida). */
export function naturalSound(s: GameState, act: Act, song?: Song): { v: Vec; parts: Pull[]; moments: { code: string; k: number }[] } {
  const genre = song?.genre ?? act.genre;
  const base = cached(s, `g:${genre}`, () => genreBase(s, genre));
  const inst = cached(s, `i:${act.id}`, () => instrumentPull(s, act));
  const comp = cached(s, `c:${act.id}:${song?.writers.join(',') ?? ''}`, () => composerPull(s, act, song));
  const v = add(add(base, inst.d), comp.d);
  v[2] = Math.min(v[2], electronicCap(s));
  return { v, parts: [...inst.parts, ...comp.parts], moments: comp.moments };
}

function ensureSound(s: GameState, so: Song): SongSound {
  if (!so.sound) so.sound = { v: fallbackSound(s, so) };
  return so.sound;
}

function onCompose(s: GameState, so: Song): void {
  const act = s.acts[so.actId];
  if (!act) return;
  const r = Rng.fromSeed(`snd:${so.id}`);
  const nat = naturalSound(s, act, so);
  const mine = act.owner === 'player' || !!act.playerBand;
  const aim = mine ? actAim(s, act.id) : undefined;
  let v = nat.v.map((x) => x + r.normal(0, nat.moments.some((m) => m.code === 'ad') ? 9 : 6));
  v = pullToAim(v, aim, composeControl(s, act));
  v[2] = Math.min(v[2], electronicCap(s));
  const sd: SongSound = { v: round(v) };
  if (aim) sd.a = [...aim];
  const ms = nat.moments.filter((m) => m.k > 0.35).map((m) => m.code);
  if (ms.length) sd.m = ms.slice(0, 3);
  so.sound = sd;
  // o momento de vida também muda o assunto
  const strong = nat.moments.find((m) => MOMENTS[m.code].themes && m.k >= 0.5);
  if (strong && !so.theme && r.chance(0.35 + strong.k * 0.4)) {
    const th = r.pick(MOMENTS[strong.code].themes!);
    (songX(s, so.id) as { theme?: string }).theme = th;
    if (mine && themeById[th]) so.theme = themeById[th].name;
  }
  // forçar uma direção contra a natureza do ato cobra um pouco; seguir a própria veia ajuda
  if (aim) {
    const gap = dist(nat.v, aim);
    if (gap > 30) {
      so.originality = clamp(so.originality - 3, 0, 100);
      for (const id of act.members) { const p = s.persons[id]; if (p) p.stress = clamp(p.stress + 1, 0, 100); }
    } else if (gap < 12) so.melody = clamp(so.melody + 1.5, 0, 100);
    if (!so.recorded) so.q = songQ({ ...so, performance: so.melody * 0.6, production: 30 });
  }
}

// ------------------------------------------------------------------ gravação

const SIG_PULL: Record<ProducerDef['signature'], Partial<Record<Axis, number>>> = {
  wall_of_sound: { de: 20, po: 12, en: 5 },
  lofi: { po: -25, de: -10, ex: 10, el: 5 },
  maximalist: { de: 22, po: 10, el: 10, ex: 5 },
  dry: { po: -10, de: -15, vo: 8, el: -10 },
  organic: { el: -18, po: -4, en: 3 },
  trap808: { el: 20, en: 8, de: -5, vo: 5 },
  neural: { el: 28, po: 15, ex: 10 },
  swing: { de: 10, el: -15, en: 8, po: 5 },
  dub: { ex: 15, de: -8, el: 10, vo: -12 },
  glossy: { po: 22, vo: 10, ex: -12 },
};

const APPROACH_PULL: Record<string, Partial<Record<Axis, number>>> = {
  spontaneous: { po: -10, en: 6, ex: 3 },
  balanced: {},
  meticulous: { po: 10, de: 6, en: -3 },
};

/** O que a gravação faz com os eixos: produtor (assinatura), estúdio, abordagem e técnica da época. */
export function recordPulls(s: GameState, so: Song): Pull[] {
  const out: Pull[] = [];
  const act = s.acts[so.actId];
  const pr = PRODUCERS.find((x) => x.id === so.producerId);
  if (pr) {
    const fit = pr.families.includes(familyOf(so.genre)) ? 1 : 0.75;
    out.push({ label: l(`Produtor ${pr.name} (${SIGNATURES[pr.signature].name.pt.toLowerCase()})`, `Producer ${pr.name} (${SIGNATURES[pr.signature].name.en.toLowerCase()})`), d: V(SIG_PULL[pr.signature]).map((x) => x * fit) });
  } else if (act && (act.owner === 'player' || act.playerBand)) {
    const sk = staffSkill(s, 'producer');
    if (sk > 0) out.push({ label: l('Produtor da casa', 'In-house producer'), d: V({ po: sk / 10 - 3 }) });
  }
  const tier = clamp(so.studioTier ?? 1, 0, 3);
  out.push({ label: l(`Estúdio: ${STUDIO_TIERS[tier].name.pt}`, `Studio: ${STUDIO_TIERS[tier].name.en}`), d: V({ po: (tier - 1) * 6, de: tier >= 2 ? 3 : 0 }) });
  const ap = APPROACHES.find((a) => a.id === so.approach);
  if (ap && ap.id !== 'balanced') out.push({ label: l(`Gravação ${ap.name.pt.toLowerCase()}`, `${ap.name.en} recording`), d: V(APPROACH_PULL[ap.id] ?? {}) });
  return out;
}

/** Quanto a direção pretendida pega na gravação: produtor de ego alto impõe a assinatura dele. */
export function recordControl(s: GameState, so: Song): number {
  const pr = PRODUCERS.find((x) => x.id === so.producerId);
  let c = 0.35 + (so.approach === 'meticulous' ? 0.1 : so.approach === 'spontaneous' ? -0.08 : 0);
  if (pr) c -= pr.ego / 400;
  return clamp(c, 0.1, 0.6);
}

export function applyRecord(s: GameState, so: Song): void {
  const sd = ensureSound(s, so);
  if (sd.r) return;
  let v = [...sd.v];
  for (const p of recordPulls(s, so)) v = add(v, p.d);
  v = pullToAim(v, sd.a, recordControl(s, so));
  v[2] = Math.min(v[2], electronicCap(s));
  sd.v = round(v);
  sd.r = 1;
}

// ------------------------------------------------------------------ arranjo (receita sonora)

const ING_PULL: Record<string, Partial<Record<Axis, number>>> = {
  strings: { de: 8, po: 6, el: -6 }, horns: { de: 8, en: 6 }, acoustic: { el: -10, en: -4, po: -3 }, distortion: { en: 10, po: -8 },
  organ: { de: 4 }, percussion: { en: 6, el: -3 }, choir: { de: 8, vo: 4 }, synth: { el: 14, de: 3 }, drum_machine: { el: 12, en: 5 },
  sample: { ex: 6, el: 6 }, reverb: { de: 4, po: 3, vo: -3 }, autotune: { el: 8, po: 8, vo: 4 }, whisper: { vo: 8, en: -8 },
  shout: { en: 10, po: -8, vo: 4 }, tape_noise: { po: -12, ex: 4 }, neural: { el: 16, ex: 8 },
};

export function arrangementPull(s: GameState, so: Song): Pull[] {
  const rec = s.x4.creation?.songs[so.id]?.recipe ?? [];
  return rec.map((id) => ({ label: l(`Arranjo: ${INGREDIENTS.find((x) => x.id === id)?.name.pt ?? id}`, `Arrangement: ${INGREDIENTS.find((x) => x.id === id)?.name.en ?? id}`), d: V(ING_PULL[id] ?? {}) }));
}

// ------------------------------------------------------------------ leitura

/** Som de músicas antigas (sem registro): gênero, era e técnica de gravação, com um desvio fixo. */
function fallbackSound(s: GameState, so: Song): Vec {
  const age = Math.max(0, Math.round((s.week - so.createdWeek) / 52));
  const v = genreBase(s, so.genre, s.year - age).map((x, i) => x + ((hashString(`${so.id}:${i}`) % 21) - 10));
  v[0] += (so.performance - 50) * 0.1;
  v[5] += (so.originality - 45) * 0.35;
  return round(v);
}

/** Som final da faixa (0–100 por eixo), com o arranjo enquanto ainda não foi lançada. */
export function soundOf(s: GameState, so: Song): Vec {
  const sd = so.sound;
  if (sd?.f) return sd.v;
  let v = sd ? [...sd.v] : fallbackSound(s, so);
  if (sd && !sd.r && so.recorded) for (const p of recordPulls(s, so)) v = add(v, p.d);
  for (const p of arrangementPull(s, so)) v = add(v, p.d);
  return round(v);
}

/** Perfil do disco: média das faixas, com a faixa de trabalho pesando o dobro. */
export function releaseSound(s: GameState, rel: Release): Vec | null {
  let t = zero();
  let w = 0;
  rel.songs.forEach((id, i) => {
    const so = s.songs[id];
    if (!so) return;
    const k = i === 0 ? 2 : 1;
    t = add(t, soundOf(s, so), k);
    w += k;
  });
  return w ? round(t.map((x) => x / w)) : null;
}

/** Coesão da sequência (desvio médio entre faixas); null se poucas faixas. */
export function cohesion(s: GameState, rel: Release): number | null {
  const vs = rel.songs.map((id) => s.songs[id]).filter((x): x is Song => !!x).map((so) => soundOf(s, so));
  if (vs.length < 3) return null;
  let sd = 0;
  for (let i = 0; i < 6; i++) {
    const m = vs.reduce((t, v) => t + v[i], 0) / vs.length;
    sd += Math.sqrt(vs.reduce((t, v) => t + (v[i] - m) ** 2, 0) / vs.length);
  }
  return Math.round(sd / 6);
}

// ------------------------------------------------------------------ onde o som funciona

export interface Outlet { id: string; name: L; ideal: number[]; w: number[]; ok: (s: GameState) => boolean }

const nameDance = (s: GameState): L => (s.year < 1970 ? l('salões de baile', 'dance halls') : l('pista de dança', 'the dancefloor'));

export const OUTLETS: Outlet[] = [
  { id: 'radio', name: l('rádio adulta', 'adult radio'), ideal: [50, 50, -1, 80, 75, 20], w: [1, 0.6, 0, 1, 1.2, 1.2], ok: (s) => hasTech(s, 'radio') || s.year >= 1925 },
  { id: 'popradio', name: l('rádio jovem', 'youth radio'), ideal: [72, 60, -1, 80, 68, 30], w: [1, 0.5, 0, 1, 0.8, 0.8], ok: (s) => s.year >= 1955 },
  { id: 'clubs', name: l('clubes pequenos', 'small clubs'), ideal: [75, 55, -1, 55, 30, 55], w: [1, 0.4, 0, 0.4, 1.2, 0.6], ok: () => true },
  { id: 'dance', name: l('pista de dança', 'the dancefloor'), ideal: [85, 60, 70, 45, 65, 35], w: [1.3, 0.5, 0.6, 0.5, 0.4, 0.4], ok: () => true },
  { id: 'arena', name: l('estádios', 'stadiums'), ideal: [80, 75, -1, 70, 65, 25], w: [1, 1, 0, 0.6, 0.6, 0.8], ok: (s) => s.year >= 1965 },
  { id: 'playlists', name: l('playlists de streaming', 'streaming playlists'), ideal: [55, 40, -1, 75, 75, 30], w: [0.6, 1, 0, 1, 1, 0.6], ok: (s) => hasTech(s, 'streaming') },
  { id: 'press', name: l('a crítica especializada', 'specialist critics'), ideal: [55, -1, -1, -1, 45, 80], w: [0.3, 0, 0, 0, 0.6, 1.5], ok: () => true },
  { id: 'tv', name: l('TV', 'TV'), ideal: [65, 55, -1, 85, 75, 20], w: [0.8, 0.4, 0, 1.2, 1, 1], ok: (s) => hasTech(s, 'tv_music') },
  { id: 'short', name: l('vídeos curtos', 'short videos'), ideal: [80, 50, -1, 80, 65, 40], w: [1.2, 0.4, 0, 1.2, 0.5, 0.3], ok: (s) => hasTech(s, 'short_video') },
];
export const outletById = Object.fromEntries(OUTLETS.map((o) => [o.id, o])) as Record<string, Outlet>;

export function outletName(s: GameState, id: string): L {
  return id === 'dance' ? nameDance(s) : outletById[id]?.name ?? l(id);
}

/** Encaixe 0–100 do som num canal/formato (o eixo eletrônico só conta na pista depois de 1975). */
export function outletFit(s: GameState, v: Vec, id: string): number {
  const o = outletById[id];
  if (!o) return 50;
  let t = 0;
  let wt = 0;
  for (let i = 0; i < 6; i++) {
    let ideal = o.ideal[i];
    let w = o.w[i];
    if (id === 'dance' && i === 2) { if (s.year < 1975) { ideal = 30; w = 0.3; } }
    if (ideal < 0 || !w) continue;
    t += Math.abs(v[i] - ideal) * w;
    wt += w;
  }
  return Math.round(clamp(100 - (wt ? t / wt : 0) * 1.6, 0, 100));
}

export function availableOutlets(s: GameState): Outlet[] {
  return OUTLETS.filter((o) => o.ok(s));
}

/** Melhor e pior encaixe entre os canais existentes na era. */
export function bestWorst(s: GameState, v: Vec): { best: { id: string; fit: number }; worst: { id: string; fit: number }; all: { id: string; fit: number }[] } {
  const all = availableOutlets(s).map((o) => ({ id: o.id, fit: outletFit(s, v, o.id) })).sort((a, b) => b.fit - a.fit);
  return { best: all[0], worst: all[all.length - 1], all };
}

/** Canal de divulgação → onde o som precisa funcionar. */
const CHANNEL_OUTLET: Record<string, string> = {
  radio_plug: 'radio', sheet_music: 'radio', jukebox: 'dance', tv_show: 'tv', music_video: 'tv', street_team: 'clubs', web_forums: 'press',
  press: 'press', playlists: 'playlists', social: 'short', short_clips: 'short', neural_feed: 'playlists',
};

/** Encaixe ponderado do disco nos canais em que ele foi divulgado (mais o canal dominante da era). */
export function channelFit(s: GameState, rel: Release, v: Vec): number {
  const parts: { id: string; w: number }[] = [];
  const total = rel.marketing.reduce((t, m) => t + m.budget, 0);
  for (const m of rel.marketing) {
    const o = CHANNEL_OUTLET[m.channel];
    if (o && total > 0) parts.push({ id: o, w: (m.budget / total) * 0.6 });
  }
  const main = hasTech(s, 'streaming') ? 'playlists' : s.year >= 1955 ? 'popradio' : 'radio';
  parts.push({ id: main, w: parts.length ? 0.4 : 1 });
  const wt = parts.reduce((t, p) => t + p.w, 0);
  return parts.reduce((t, p) => t + outletFit(s, v, p.id) * p.w, 0) / wt;
}

// ------------------------------------------------------------------ capa × som

const COVER_IDEAL: Record<CoverStyle, Partial<Record<Axis, [number, number]>>> = {
  portrait: { vo: [80, 1.5], po: [65, 0.5] },
  concept: { ex: [75, 1.5], de: [60, 0.5] },
  provocative: { en: [80, 1.2], po: [35, 0.8] },
  minimal: { de: [30, 1.3], po: [70, 0.7] },
  illustrated: { ex: [70, 1], de: [70, 1] },
  scene: { po: [35, 1], el: [30, 0.7] },
  diy: { po: [25, 1.5], en: [65, 0.5] },
};

/** Coerência −1..1 entre a capa e o som. */
export function coverFit(style: string | undefined, v: Vec): number {
  const ideal = style ? COVER_IDEAL[style as CoverStyle] : undefined;
  if (!ideal) return 0;
  let t = 0;
  let wt = 0;
  for (const [k, [x, w]] of Object.entries(ideal) as [Axis, [number, number]][]) {
    t += Math.abs(v[AXES.indexOf(k)] - x) * w;
    wt += w;
  }
  return Math.round(clamp(1 - (t / wt) / 22, -1, 1) * 100) / 100;
}

// ------------------------------------------------------------------ descrição

const ADJ: Record<string, [string, string, string, string, string]> = {
  dry: ['seco', 'seca', 'secos', 'secas', 'dry'],
  layered: ['em camadas', 'em camadas', 'em camadas', 'em camadas', 'layered'],
  urgent: ['nervoso', 'nervosa', 'nervosos', 'nervosas', 'restless'],
  restrained: ['contido', 'contida', 'contidos', 'contidas', 'restrained'],
  glossy: ['brilhante', 'brilhante', 'brilhantes', 'brilhantes', 'glossy'],
  warm: ['quente', 'quente', 'quentes', 'quentes', 'warm'],
  odd: ['torto', 'torta', 'tortos', 'tortas', 'skewed'],
};

function agree(adj: string, noun: { g: 'm' | 'f'; pl: boolean }): string {
  const a = ADJ[adj];
  return a[(noun.pl ? 2 : 0) + (noun.g === 'f' ? 1 : 0)];
}

/** Instrumento que dá a cara da faixa: arranjo escolhido > instrumento mais forte da banda. */
function leadInstrument(s: GameState, so: Song): string | undefined {
  const rec = s.x4.creation?.songs[so.id]?.recipe ?? [];
  const fromRecipe = rec.find((id) => INST_NOUN[id]);
  if (fromRecipe) return fromRecipe;
  const act = s.acts[so.actId];
  if (act) {
    const lead = instrumentPull(s, act).lead;
    if (lead) return lead;
  }
  const fam = familyOf(so.genre);
  return fam === 'electronic' ? 'synth' : fam === 'hiphop' ? 'daw' : fam === 'country_folk' || fam === 'brazil' ? 'acoustic' : fam === 'blues_jazz' ? 'piano' : 'guitar';
}

const PROD_PHRASE: Record<ProducerDef['signature'], L> = {
  wall_of_sound: l('parede de som', 'a wall of sound'), lofi: l('textura de fita', 'tape texture'), maximalist: l('camadas sobre camadas', 'layers on layers'),
  dry: l('sem reverb', 'no reverb'), organic: l('tocada ao vivo na sala', 'played live in the room'), trap808: l('graves 808', '808 low end'),
  neural: l('texturas sintéticas', 'synthetic textures'), swing: l('metais de big band', 'big-band horns'), dub: l('ecos de dub', 'dub echoes'),
  glossy: l('brilho de rádio', 'radio sheen'),
};

/** Frases (pt/en) que descrevem o som, sem o veredito de canais. */
export function soundPhrases(s: GameState, v: Vec, opts: { song?: Song; inst?: string; hook?: number; year?: number; moments?: string[] } = {}): L[] {
  const [en, de, el, vo, po, ex] = v;
  const out: L[] = [];
  const year = opts.year ?? s.year;
  const inst = opts.inst;
  const noun = inst ? INST_NOUN[inst] : undefined;
  if (noun) {
    const adj = ex > 75 ? 'odd' : po < 40 ? 'dry' : de > 68 ? 'layered' : en > 72 ? 'urgent' : en < 35 ? 'restrained' : po > 70 ? 'glossy' : 'warm';
    out.push(l(`${noun.pt} ${agree(adj, noun)}`, `${ADJ[adj][4]} ${noun.en}`));
  }
  if (vo >= 70) out.push(po < 50 ? l('voz próxima', 'close-miked vocals') : l('voz na frente e polida', 'upfront, polished vocals'));
  else if (vo >= 45) out.push(en > 65 && po < 50 ? l('voz gritada por cima da banda', 'vocals shouted over the band') : l('voz dividindo espaço com a banda', 'vocals sharing space with the band'));
  else if (vo >= 25) out.push(l('voz enterrada na mixagem', 'vocals buried in the mix'));
  else out.push(l('quase instrumental', 'almost instrumental'));
  const hook = opts.hook ?? 55;
  if (ex > 72) out.push(l('estrutura torta, sem refrão óbvio', 'a crooked structure with no obvious chorus'));
  else if (hook >= 60) out.push(en >= 60 ? l('refrão aberto', 'a big open chorus') : l('refrão que gruda baixinho', 'a quiet chorus that sticks'));
  else if (hook < 33) out.push(l('refrão tímido', 'a shy chorus'));
  else out.push(l('refrão no lugar de sempre', 'the chorus right where you expect it'));
  if (de < 30) out.push(l('muito espaço entre as notas', 'plenty of space between the notes'));
  else if (de > 74) out.push(l('tudo ao mesmo tempo', 'everything at once'));
  if (el > 70 && (!noun || (inst !== 'synth' && inst !== 'daw' && inst !== 'drum_machine'))) out.push(l('pulso eletrônico', 'an electronic pulse'));
  else if (el < 15 && !['acoustic', 'guitar', 'distortion', 'organ', 'bass'].includes(inst ?? '')) out.push(l('tudo acústico', 'all acoustic'));
  // a era dá o contexto
  if (el > 55 && year < 1978) out.push(l('soa à frente do seu tempo', 'sounds ahead of its time'));
  else if (po < 28 && year >= 1995) out.push(l('com cara de demo, de propósito', 'deliberately demo-like'));
  else if (po > 80 && year < 1960) out.push(l('luxo de estúdio para a época', 'studio luxury for its day'));
  for (const m of (opts.moments ?? []).slice(0, 1)) if (MOMENTS[m]) out.push(MOMENTS[m].phrase);
  return out;
}

const joinL = (parts: L[], sep = ', '): L => l(parts.map((x) => x.pt).join(sep), parts.map((x) => x.en).join(sep));

/** Veredito de canais: "forte para X, menos compatível com Y". */
export function fitVerdict(s: GameState, v: Vec): L {
  const { best, worst } = bestWorst(s, v);
  const b = outletName(s, best.id);
  const w = outletName(s, worst.id);
  if (best.fit - worst.fit < 12) return l(`funciona em quase todo lugar (${b.pt} um pouco mais)`, `works almost anywhere (${b.en} slightly more)`);
  return l(`forte para ${b.pt}, menos compatível com ${w.pt}`, `strong for ${b.en}, less suited to ${w.en}`);
}

/** Descrição curta e específica de uma faixa (pt/en). */
export function describeSong(s: GameState, so: Song): L {
  const v = soundOf(s, so);
  const pr = PRODUCERS.find((x) => x.id === so.producerId);
  const phrases = soundPhrases(s, v, { song: so, inst: leadInstrument(s, so), hook: songProfile(so).hook, moments: so.sound?.m, year: s.year - Math.max(0, Math.round((s.week - so.createdWeek) / 52)) });
  if (pr && phrases.length < 6) phrases.splice(1, 0, PROD_PHRASE[pr.signature]);
  const head = joinL(phrases.slice(0, 4));
  const fit = fitVerdict(s, v);
  return l(`${cap(head.pt)}; ${fit.pt}.`, `${cap(head.en)}; ${fit.en}.`);
}

/** Descrição de um disco: som médio, faixa de trabalho e a sequência. */
export function describeRelease(s: GameState, rel: Release): L | null {
  const v = releaseSound(s, rel);
  if (!v) return null;
  const lead = s.songs[rel.songs[0]];
  const phrases = soundPhrases(s, v, { inst: lead ? leadInstrument(s, lead) : undefined, hook: lead ? songProfile(lead).hook : 55, moments: lead?.sound?.m, year: rel.year });
  const coh = cohesion(s, rel);
  if (coh !== null) phrases.push(coh < 8 ? l('faixas muito parecidas entre si', 'tracks very alike') : coh > 20 ? l('sequência dispersa', 'a scattered running order') : l('sequência bem amarrada', 'a well-knit running order'));
  const head = joinL(phrases.slice(0, 5));
  const fit = fitVerdict(s, v);
  return l(`${cap(head.pt)}; ${fit.pt}.`, `${cap(head.en)}; ${fit.en}.`);
}

const cap = (x: string): string => (x ? x[0].toUpperCase() + x.slice(1) : x);

/** Rótulo curto do perfil (2–3 palavras) para assinaturas. */
export function soundTags(v: Vec): L[] {
  const out: L[] = [];
  const pick = (i: number, lo: number, hi: number) => { if (v[i] >= hi) out.push(AXIS_INFO[AXES[i]].hi); else if (v[i] <= lo) out.push(AXIS_INFO[AXES[i]].lo); };
  pick(5, 25, 68);
  pick(4, 35, 72);
  pick(2, 20, 65);
  pick(0, 35, 72);
  pick(3, 38, 78);
  pick(1, 32, 70);
  return out.slice(0, 3);
}

// ------------------------------------------------------------------ assinaturas (artista e selo)

/** Assinatura de um ato calculada dos lançamentos (média móvel; os mais recentes pesam mais). */
export function computeActSignature(s: GameState, act: Act): { v: Vec; n: number; first?: Vec; last?: Vec } | null {
  const rels = act.releases.map((id) => s.releases[id]).filter((r): r is Release => !!r && !r.reissueOf && r.kind !== 'compilation').sort((a, b) => a.week - b.week);
  const vs = rels.map((r) => releaseSound(s, r)).filter((v): v is Vec => !!v);
  if (!vs.length) return null;
  let ema = vs[0];
  for (const v of vs.slice(1)) ema = ema.map((x, i) => x + (v[i] - x) * 0.35);
  const avgOf = (list: Vec[]) => round(zero().map((_, i) => list.reduce((t, v) => t + v[i], 0) / list.length));
  return { v: round(ema), n: vs.length, first: avgOf(vs.slice(0, 2)), last: avgOf(vs.slice(-2)) };
}

export function actSignature(s: GameState, act: Act): { v: Vec; n: number; first?: Vec; last?: Vec } | null {
  return computeActSignature(s, act);
}

function backfill(s: GameState): void {
  const st = snd(s);
  if (st.init) return;
  st.init = true;
  const rels = Object.values(s.releases).filter((r) => r.owner === 'player' && !r.reissueOf).sort((a, b) => a.week - b.week);
  for (const r of rels) bump(s, r);
}

function bump(s: GameState, rel: Release): void {
  const v = releaseSound(s, rel);
  if (!v) return;
  const st = snd(s);
  const lb = st.label;
  const k = lb.n < 5 ? 1 / (lb.n + 1) : 0.15;
  lb.v = round(lb.v.map((x, i) => x + (v[i] - x) * k));
  lb.n += 1;
  const a = (st.sig[rel.actId] ??= { v: [...v], n: 0 });
  if (a.n) a.v = round(a.v.map((x, i) => x + (v[i] - x) * 0.35));
  a.n += 1;
}

export function labelSignature(s: GameState): SoundState['label'] {
  backfill(s);
  return snd(s).label;
}

// ------------------------------------------------------------------ efeitos no jogo

/** Multiplicador de apelo do som (canais, era, som humano, identidade). Exposto para testes e para a ficha. */
export function soundAppeal(s: GameState, rel: Release, act: Act): { m: number; parts: { label: L; m: number }[] } {
  const v = releaseSound(s, rel);
  const parts: { label: L; m: number }[] = [];
  if (!v) return { m: 1, parts };
  const fit = channelFit(s, rel, v);
  const fm = clamp(1 + 0.12 * (fit - 70) / 35, 0.9, 1.1);
  parts.push({ label: l('Som × canais de divulgação', 'Sound × promotion channels'), m: fm });
  // na era das vozes sintéticas, soar humano (cru e acústico) vira diferencial
  if (hasTech(s, 'synthetic_voice') && v[4] < 45 && v[2] < 40) parts.push({ label: l('Som humano na era sintética', 'Human sound in the synthetic era'), m: 1.04 });
  const mine = rel.owner === 'player' || !!act.playerBand;
  if (mine) {
    const lb = labelSignature(s);
    if (lb.n >= 4 && dist(v, lb.v) < 12) parts.push({ label: l('Identidade sonora do selo reconhecível', 'Recognizable label sound'), m: 1.03 });
    const sig = snd(s).sig[act.id];
    if (sig && sig.n >= 2 && dist(v, sig.v) > 24) parts.push({ label: l('Mudança brusca de som (fãs antigos estranham)', 'Abrupt change of sound (old fans balk)'), m: 0.96 });
  }
  return { m: parts.reduce((t, p) => t * p.m, 1), parts };
}

registerMod('appeal', 'sound', (s, value, ctx) => {
  const rel = ctx.release;
  const act = ctx.act ?? (rel ? s.acts[rel.actId] : undefined);
  if (!rel || !act || rel.reissueOf) return null;
  const { m, parts } = soundAppeal(s, rel, act);
  if (Math.abs(m - 1) < 0.005) return null;
  const main = parts.reduce((a, b) => (Math.abs(Math.log(b.m)) > Math.abs(Math.log(a.m)) ? b : a), parts[0]);
  return { value: value * m, label: parts.length > 1 ? l(`Som do disco (${main.label.pt.toLowerCase()}…)`, `Record's sound (${main.label.en.toLowerCase()}…)`) : main.label };
});

/** Palco: energia crua cresce ao vivo; som de estúdio muito polido e eletrônico é difícil de reproduzir. */
export function liveFactor(s: GameState, act: Act): { m: number; label?: L } {
  const sig = snd(s).sig[act.id]?.v ?? (() => {
    for (let i = act.releases.length - 1; i >= 0 && i >= act.releases.length - 3; i--) {
      const r = s.releases[act.releases[i]];
      const v = r ? releaseSound(s, r) : null;
      if (v) return v;
    }
    return undefined;
  })();
  if (!sig) return { m: 1 };
  let m = 1 + ((sig[0] - 55) / 45) * 0.04;
  let label = l('Som do ato no palco', 'The act\'s sound on stage');
  if (sig[4] > 72 && sig[2] > 60) {
    const canPlay = act.members.some((id) => { const p = s.persons[id]; return !!p && instrumentsOf(s, p).some((x) => (x.id === 'daw' || x.id === 'turntables' || x.id === 'synth') && x.lvl >= 50); });
    if (!canPlay) { m -= 0.05; label = l('Som de estúdio difícil de reproduzir ao vivo', 'Studio sound hard to reproduce live'); }
  } else if (sig[4] < 45 && sig[0] > 62) { m += 0.03; label = l('Som cru que cresce no palco', 'Raw sound that grows on stage'); }
  return { m: clamp(m, 0.92, 1.08), label };
}

registerMod('showRevenue', 'sound', (s, value, ctx) => {
  if (!ctx.act) return null;
  const f = liveFactor(s, ctx.act);
  return Math.abs(f.m - 1) < 0.005 ? null : { value: value * f.m, label: f.label };
});

/** Gosto de cada crítico pelo som: undergrounds querem risco e crueza; mainstream, polimento e voz. */
export function criticTaste(s: GameState, criticName: string, v: Vec): number {
  const c = CRITICS.find((x) => x.name === criticName);
  if (!c) return 0;
  const mu = c.mainstream;
  let d = 0;
  d += ((v[5] - 50) / 50) * -mu * 0.6 + ((50 - v[4]) / 50) * -mu * 0.3;
  d += mu > 0 ? mu * (((v[4] - 50) / 50) * 0.4 + ((v[3] - 50) / 50) * 0.2) - mu * Math.max(0, (v[5] - 70) / 30) * 0.3 : 0;
  if (c.dislikes.includes('electronic') && v[2] > 70) d -= 0.4;
  if (c.favors.includes('electronic') && v[2] > 60) d += 0.3;
  if (c.favors.includes('folk') && v[2] < 25) d += 0.2;
  return d;
}

function onLaunch(s: GameState, rel: Release): void {
  const act = s.acts[rel.actId];
  if (!act) return;
  // congela o som final das faixas (arranjo incluído)
  for (const id of rel.songs) {
    const so = s.songs[id];
    if (!so || so.sound?.f) continue;
    const v = soundOf(s, so);
    so.sound = { ...(so.sound ?? { v }), v, f: 1, r: 1 };
    if (so.sound.a && act.owner !== 'player' && !act.playerBand) delete so.sound.a;
  }
  const v = releaseSound(s, rel);
  if (!v || rel.reissueOf) return;
  const mine = rel.owner === 'player' || !!act.playerBand;
  // capa coerente com o som reforça a identidade (ou confunde)
  const cf = rel.coverChoice ? coverFit(rel.coverChoice, v) : 0;
  if (rel.coverChoice && Math.abs(cf) > 0.05) {
    const m = 1 + 0.04 * cf;
    rel.appeal *= m;
    rel.autopsy?.push({ key: 'cover-sound', label: l(`Capa × som (${coverById[rel.coverChoice as CoverStyle]?.name.pt ?? ''})`, `Cover × sound (${coverById[rel.coverChoice as CoverStyle]?.name.en ?? ''})`), value: m, confidence: 'low' });
  }
  // a crítica ouve: gosto de cada crítico, coerência com a capa e a sequência do disco
  const rv = s.reviews[rel.id];
  if (rv?.length && mine) {
    const before = rv.reduce((t, x) => t + x.score, 0) / rv.length;
    const coh = cohesion(s, rel);
    const cohD = coh === null ? 0 : coh < 8 ? -0.1 : coh > 20 ? -0.4 : 0.3;
    const sig = snd(s).sig[act.id];
    const reinvent = sig && sig.n >= 2 && dist(v, sig.v) > 24 && v[5] > 60 ? 0.3 : 0;
    for (const x of rv) {
      const d = clamp(criticTaste(s, x.critic, v) + cf * 0.3 + cohD + reinvent, -1, 1);
      x.score = clamp(Math.round((x.score + d) * 10) / 10, 0, 10);
    }
    const after = rv.reduce((t, x) => t + x.score, 0) / rv.length;
    rel.critic = Math.round(after * 10);
    rel.appeal *= (0.92 + after / 60) / (0.92 + before / 60);
  }
  if (mine) {
    backfill(s);
    bump(s, rel);
  }
}

// ------------------------------------------------------------------ ganchos

registerSimHook('compose', 'sound', (s, _r, a) => { if (a.song) onCompose(s, a.song); });
registerSimHook('record', 'sound', (s, _r, a) => { if (a.song) applyRecord(s, a.song); });
registerSimHook('launch', 'sound', (s, _r, a) => { if (a.release) onLaunch(s, a.release); });

/** Sessões de estúdio fecham faixas dia a dia (sem o gancho de gravação): aplica a camada nelas. */
function sweepSessions(s: GameState): void {
  for (const sess of s.sessions) {
    if (s.day - sess.startDay > 120) continue;
    for (const id of sess.songIds) {
      const so = s.songs[id];
      if (so?.recorded && !so.sound?.r) applyRecord(s, so);
    }
  }
}
registerSimHook('day', 'sound', (s) => sweepSessions(s));
registerSimHook('week', 'sound', (s) => sweepSessions(s));

registerSimHook('year', 'sound', (s) => {
  const st = snd(s);
  backfill(s);
  if (st.label.n) {
    st.label.hist.push({ y: s.year - 1, v: [...st.label.v] });
    if (st.label.hist.length > 80) st.label.hist.splice(0, st.label.hist.length - 80);
  }
  // atos que saíram do selo não precisam de assinatura guardada
  const mine = new Set(playerActs(s));
  for (const id of Object.keys(st.sig)) if (!mine.has(id)) delete st.sig[id];
  for (const id of Object.keys(st.aim)) if (!mine.has(id)) delete st.aim[id];
});
