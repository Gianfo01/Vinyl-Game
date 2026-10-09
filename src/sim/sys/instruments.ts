// Instrumentos (rodada 7): cada pessoa toca até 5 instrumentos, cada um com nível 0–100, e tem uma
// facilidade própria para aprender cada família (cordas, teclas, percussão, sopros, voz, eletrônica).
// Quem não aprendeu nada novo usa o conjunto padrão, derivado da função e de um hash fixo do id (não
// ocupa espaço no save); só quem estuda ou evolui ganha registro em s.x4.inst.
//
// Efeitos: multi-instrumentistas gravam e compõem melhor; instrumentos típicos do gênero (sanfona no
// forró, cavaquinho no samba, sitar na música indiana…) dão um bônus extra; shows rendem um pouco mais.
// Jogador escolhe aulas para a própria pessoa e para os integrantes dos seus atos; os NPCs aprendem
// sozinhos ao longo da carreira.

import { clamp, hashString, type Rng } from '../../core/rng';
import { familyOf, l, type L } from '../../data/world';
import { registerExt4, registerMod, registerSimHook } from '../ext4';
import { songQ } from '../production';
import type { GameState, Person } from '../types';
import { fmtL, money, notify, playerActs, post, remember } from '../util';

export type InstFamily = 'strings' | 'keys' | 'perc' | 'winds' | 'voice' | 'electronic';

export interface InstDef { id: string; name: L; fam: InstFamily; genres?: string[]; families?: string[]; from?: number }

export const INSTRUMENTS: InstDef[] = [
  { id: 'voice', name: l('Voz', 'Voice'), fam: 'voice' },
  { id: 'guitar', name: l('Guitarra', 'Electric guitar'), fam: 'strings', families: ['rock', 'blues_jazz'], from: 1936 },
  { id: 'acoustic', name: l('Violão', 'Acoustic guitar'), fam: 'strings', families: ['country_folk', 'brazil', 'latin'] },
  { id: 'bass', name: l('Baixo', 'Bass'), fam: 'strings', families: ['rnb', 'rock'] },
  { id: 'drums', name: l('Bateria', 'Drums'), fam: 'perc', families: ['rock', 'rnb'] },
  { id: 'percussion', name: l('Percussão', 'Percussion'), fam: 'perc', families: ['brazil', 'africa', 'latin', 'caribbean'] },
  { id: 'piano', name: l('Piano', 'Piano'), fam: 'keys', families: ['blues_jazz', 'sacred', 'pop'] },
  { id: 'synth', name: l('Sintetizador', 'Synthesizer'), fam: 'keys', families: ['electronic', 'pop'], from: 1965 },
  { id: 'organ', name: l('Órgão', 'Organ'), fam: 'keys', families: ['rnb', 'sacred'] },
  { id: 'sax', name: l('Saxofone', 'Saxophone'), fam: 'winds', families: ['blues_jazz', 'rnb'] },
  { id: 'trumpet', name: l('Trompete', 'Trumpet'), fam: 'winds', families: ['blues_jazz', 'latin', 'africa'] },
  { id: 'flute', name: l('Flauta', 'Flute'), fam: 'winds', families: ['sacred', 'brazil'] },
  { id: 'harmonica', name: l('Gaita', 'Harmonica'), fam: 'winds', families: ['blues_jazz', 'country_folk'] },
  { id: 'violin', name: l('Violino', 'Violin'), fam: 'strings', families: ['sacred', 'country_folk', 'europe'] },
  { id: 'cello', name: l('Violoncelo', 'Cello'), fam: 'strings', families: ['sacred'] },
  { id: 'accordion', name: l('Sanfona', 'Accordion'), fam: 'keys', genres: ['baiao', 'forro', 'tango', 'norteno', 'tejano', 'vallenato', 'musette', 'cumbia', 'piseiro', 'gaucho'], families: ['europe'] },
  { id: 'cavaquinho', name: l('Cavaquinho', 'Cavaquinho'), fam: 'strings', genres: ['samba', 'choro', 'pagode', 'samba_enredo', 'samba_cancao'] },
  { id: 'banjo', name: l('Banjo', 'Banjo'), fam: 'strings', genres: ['bluegrass', 'old_time', 'country', 'hot_jazz'] },
  { id: 'sitar', name: l('Sitar e tabla', 'Sitar and tabla'), fam: 'strings', genres: ['indian_classical', 'bollywood', 'psychedelic', 'ghazal_pop', 'qawwali_fusion', 'bhangra'] },
  { id: 'turntables', name: l('Toca-discos (DJ)', 'Turntables (DJ)'), fam: 'electronic', families: ['hiphop', 'electronic'], from: 1975 },
  { id: 'daw', name: l('Produção no computador', 'Computer production'), fam: 'electronic', families: ['electronic', 'hiphop', 'pop'], from: 1990 },
];
export const instById: Record<string, InstDef> = Object.fromEntries(INSTRUMENTS.map((x) => [x.id, x]));

export const FAMILY_NAMES: Record<InstFamily, L> = {
  strings: l('Cordas', 'Strings'), keys: l('Teclas', 'Keys'), perc: l('Percussão', 'Percussion'), winds: l('Sopros', 'Winds'), voice: l('Voz', 'Voice'), electronic: l('Eletrônicos', 'Electronics'),
};

export const MAX_INSTRUMENTS = 5;

/** Instrumento principal de cada função. */
const ROLE_MAIN: Record<Person['role'], string> = {
  vocal: 'voice', guitar: 'guitar', bass: 'bass', drums: 'drums', keys: 'piano', horns: 'sax', dj: 'turntables', producer: 'daw', mc: 'voice', strings: 'violin', synthetic: 'daw',
};
/** Segundos instrumentos prováveis por função. */
const ROLE_SECOND: Record<Person['role'], string[]> = {
  vocal: ['acoustic', 'piano', 'percussion', 'guitar'], guitar: ['acoustic', 'voice', 'bass', 'piano'], bass: ['guitar', 'voice', 'acoustic'], drums: ['percussion', 'voice', 'piano'], keys: ['synth', 'organ', 'voice', 'acoustic'],
  horns: ['trumpet', 'flute', 'piano'], dj: ['daw', 'synth'], producer: ['synth', 'piano', 'guitar'], mc: ['daw', 'turntables'], strings: ['cello', 'piano', 'acoustic'], synthetic: ['voice'],
};

export interface InstEntry { id: string; lvl: number }
export interface PersonInst { list: InstEntry[]; learning?: { id: string; progress: number; teacher: boolean } }
export interface InstState { people: Record<string, PersonInst> }

declare module '../ext4' { interface Ext4 { inst: InstState } }
registerExt4('inst', () => ({ people: {} }));

const st = (s: GameState): InstState => (s as unknown as { x4: { inst: InstState } }).x4.inst;

/** Facilidade para aprender cada família (0–100): hash fixo + traços + personalidade. */
export function aptitude(p: Person, fam: InstFamily): number {
  let v = 30 + (hashString(`${p.id}:apt:${fam}`) % 51);
  if (p.traits.includes('perfect_pitch')) v += 15;
  if (p.traits.includes('virtuoso')) v += 12;
  if (p.traits.includes('intellectual') && (fam === 'keys' || fam === 'strings')) v += 6;
  if (p.traits.includes('street') && (fam === 'perc' || fam === 'electronic' || fam === 'voice')) v += 6;
  if (fam === 'voice') v = v * 0.6 + p.skills.voice * 0.4;
  else v = v * 0.75 + p.skills.instr * 0.25;
  v += ((p.persona?.discipline ?? 50) - 50) / 6;
  return Math.round(clamp(v, 5, 99));
}

export const aptitudeLabel = (v: number): L => (v >= 75 ? l('muito fácil', 'very easy') : v >= 58 ? l('fácil', 'easy') : v >= 42 ? l('média', 'average') : v >= 28 ? l('difícil', 'hard') : l('muito difícil', 'very hard'));

/** Conjunto padrão (sem estado): principal + 0–3 secundários conforme hash e habilidade. */
function defaults(p: Person): InstEntry[] {
  const main = ROLE_MAIN[p.role] ?? 'voice';
  const base = p.role === 'vocal' || p.role === 'mc' ? p.skills.voice : p.skills.instr;
  const out: InstEntry[] = [{ id: main, lvl: Math.round(clamp(base, 5, 100)) }];
  const h = hashString(`${p.id}:inst`);
  const extra = h % 100 < 35 ? 0 : h % 100 < 70 ? 1 : h % 100 < 90 ? 2 : 3;
  const pool = ROLE_SECOND[p.role] ?? [];
  for (let i = 0; i < extra && i < pool.length; i++) {
    const id = pool[(h >>> (i * 3)) % pool.length];
    if (out.some((x) => x.id === id)) continue;
    const lvl = Math.round(clamp(base * (0.35 + ((h >>> (i * 5)) % 40) / 100), 5, 95));
    out.push({ id, lvl });
  }
  return out;
}

export function instrumentsOf(s: GameState, p: Person): InstEntry[] {
  const own = st(s).people[p.id];
  // saves antigos podiam guardar um instrumento sem id (hash negativo): limpa
  if (own && own.list.some((x) => !instById[x.id])) own.list = own.list.filter((x) => instById[x.id]);
  return own?.list ?? defaults(p);
}

export function learningOf(s: GameState, p: Person): PersonInst['learning'] {
  return st(s).people[p.id]?.learning;
}

function own(s: GameState, p: Person): PersonInst {
  return (st(s).people[p.id] ??= { list: defaults(p).map((x) => ({ ...x })) });
}

export function lessonCost(s: GameState, teacher: boolean): number {
  return money(s, teacher ? 450 : 60);
}

export function canLearn(s: GameState, p: Person, id: string): L | null {
  const def = instById[id];
  if (!def) return l('Instrumento desconhecido.', 'Unknown instrument.');
  if (def.from && s.year < def.from) return fmtL(l('Só existe a partir de {y}.', 'Only exists from {y}.'), { y: def.from });
  const list = instrumentsOf(s, p);
  if (!list.some((x) => x.id === id) && list.length >= MAX_INSTRUMENTS) return l('Já toca 5 instrumentos: abandone um antes.', 'Already plays 5 instruments: drop one first.');
  if (learningOf(s, p)) return l('Já está estudando outro instrumento.', 'Already studying another instrument.');
  return null;
}

/** Começa (ou aprofunda) um instrumento. Professor custa mais por mês e acelera muito. */
export function startLessons(s: GameState, personId: string, id: string, teacher: boolean): L | null {
  const p = s.persons[personId];
  if (!p?.alive) return l('Pessoa indisponível.', 'Person unavailable.');
  const err = canLearn(s, p, id);
  if (err) return err;
  own(s, p).learning = { id, progress: 0, teacher };
  return null;
}

export function stopLessons(s: GameState, personId: string): void {
  const e = st(s).people[personId];
  if (e) e.learning = undefined;
}

export function dropInstrument(s: GameState, personId: string, id: string): L | null {
  const p = s.persons[personId];
  if (!p) return l('Pessoa indisponível.', 'Person unavailable.');
  const e = own(s, p);
  if (e.list.length <= 1) return l('Ninguém para de tocar tudo.', 'Nobody stops playing everything.');
  e.list = e.list.filter((x) => x.id !== id);
  return null;
}

/** Ganho mensal de nível: facilidade, disciplina, idade, professor e o quanto já sabe. */
export function monthlyGain(p: Person, fam: InstFamily, lvl: number, teacher: boolean, year: number): number {
  const apt = aptitude(p, fam);
  const age = year - p.born;
  const ageF = age < 16 ? 1.3 : age < 30 ? 1 : age < 50 ? 0.75 : 0.5;
  const diminishing = 1 - lvl / 115;
  return Math.max(0.2, (1.2 + apt / 22) * ageF * diminishing * (teacher ? 1.8 : 1));
}

function learnMonth(s: GameState, p: Person, e: PersonInst, payer: 'player' | 'npc'): void {
  const lr = e.learning;
  if (!lr) return;
  const def = instById[lr.id];
  if (!def) { e.learning = undefined; return; }
  if (payer === 'player') {
    const cost = lessonCost(s, lr.teacher);
    post(s, `inst:${p.id}`, -cost, 'artist_dev', `Aulas de ${def.name.pt} (${p.name})`);
  }
  let cur = e.list.find((x) => x.id === lr.id);
  const gain = monthlyGain(p, def.fam, cur?.lvl ?? 0, lr.teacher, s.year);
  lr.progress += gain;
  if (!cur && lr.progress >= 12) {
    if (e.list.length >= MAX_INSTRUMENTS) { e.learning = undefined; return; }
    cur = { id: lr.id, lvl: 12 };
    e.list.push(cur);
    if (payer === 'player') {
      notify(s, fmtL(l('{p} já toca {i}!', '{p} can now play {i}!'), { p: p.name, i: def.name }), 'good');
      remember(s, 'inst', fmtL(l('{p} aprende {i}.', '{p} learns {i}.'), { p: p.name, i: def.name }), {});
    }
  } else if (cur) {
    cur.lvl = Math.round(clamp(cur.lvl + gain, 0, 100) * 10) / 10;
  }
  p.stress = clamp(p.stress + (lr.teacher ? 0.8 : 0.4), 0, 100);
  p.inspiration = clamp(p.inspiration + 1.5, 0, 100);
  if (cur && cur.lvl >= 70 && lr.progress > 60) {
    e.learning = undefined;
    if (payer === 'player') notify(s, fmtL(l('{p} domina {i} (nível {v}).', '{p} masters {i} (level {v}).'), { p: p.name, i: def.name, v: Math.round(cur.lvl) }), 'good');
  }
}

/** Quanto o conjunto de instrumentos ajuda nesta música (0..~8 pontos). */
export function instrumentBonus(s: GameState, actId: string, genre: string): number {
  const act = s.acts[actId];
  if (!act) return 0;
  const fam = familyOf(genre);
  let bonus = 0;
  const seen = new Set<string>();
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p?.alive) continue;
    for (const x of instrumentsOf(s, p)) {
      if (x.lvl < 35) continue;
      const def = instById[x.id];
      if (!def) continue;
      if (!seen.has(x.id)) bonus += 0.6 * (x.lvl / 100);
      seen.add(x.id);
      if (def.genres?.includes(genre)) bonus += 2 * (x.lvl / 100);
      else if (def.families?.includes(fam)) bonus += 0.5 * (x.lvl / 100);
    }
  }
  return Math.min(8, bonus);
}

registerSimHook('compose', 'inst', (s, _r, arg) => {
  const so = arg.song;
  if (!so) return;
  const b = instrumentBonus(s, so.actId, so.genre);
  so.melody = clamp(so.melody + b * 0.35, 5, 100);
  so.originality = clamp(so.originality + b * 0.2, 5, 100);
});

registerSimHook('record', 'inst', (s, _r, arg) => {
  const so = arg.song;
  if (!so) return;
  so.performance = clamp(so.performance + instrumentBonus(s, so.actId, so.genre) * 0.5, 5, 100);
  so.q = songQ(so);
});

registerMod('showRevenue', 'inst', (s, value, ctx) => {
  const act = ctx.act;
  if (!act) return null;
  const b = instrumentBonus(s, act.id, act.genre);
  return b > 1 ? { value: value * (1 + b / 100), label: l('Banda multi-instrumentista', 'Multi-instrumentalist band') } : null;
});

registerSimHook('month', 'inst', (s, r: Rng) => {
  const I = st(s);
  const mine = new Set<string>();
  for (const id of playerActs(s)) for (const pid of s.acts[id]?.members ?? []) mine.add(pid);
  for (const p of Object.values(s.persons)) if (p.isPlayer) mine.add(p.id);
  for (const [pid, e] of Object.entries(I.people)) {
    const p = s.persons[pid];
    if (!p?.alive) { if (!p) delete I.people[pid]; continue; }
    learnMonth(s, p, e, mine.has(pid) ? 'player' : 'npc');
  }
  // NPCs famosos às vezes começam um instrumento novo (ninguém para de aprender)
  if (s.month % 3 === 0) {
    for (const act of Object.values(s.acts)) {
      if (act.owner === 'player' || act.playerBand || (act.status !== 'active' && act.status !== 'hiatus')) continue;
      if (!r.chance(0.04)) continue;
      const p = s.persons[r.pick(act.members)];
      if (!p?.alive || mine.has(p.id) || I.people[p.id]?.learning) continue;
      const have = instrumentsOf(s, p);
      if (have.length >= MAX_INSTRUMENTS) continue;
      const opts = INSTRUMENTS.filter((d) => !have.some((x) => x.id === d.id) && (!d.from || d.from <= s.year) && (d.genres?.includes(act.genre) || d.families?.includes(familyOf(act.genre))));
      if (!opts.length) continue;
      own(s, p).learning = { id: r.pick(opts).id, progress: 0, teacher: r.chance(0.5) };
    }
  }
});
