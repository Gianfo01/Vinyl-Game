// Geração de pessoas, atos, nomes e músicas (GDD §5.3, §9; Catálogo §9).

import { clamp, type Rng } from '../core/rng';
import { AMBITIONS, BAND_WORDS, FIRST_NAMES, LAST_NAMES, ORIGINS, SONG_WORDS, TRAITS, GENRE_AFFINITY, TEMPER_TRAITS, traitById, type SkillId } from '../data/people';
import { cityById, familyOf, type FamilyId, type NameGroup } from '../data/world';
import type { Act, GameState, Person } from './types';
import { hasMutator, nextId } from './util';

const ROLE_SETS: Partial<Record<FamilyId, Person['role'][]>> = {
  blues_jazz: ['vocal', 'horns', 'keys', 'bass', 'drums', 'strings'],
  hiphop: ['mc', 'producer', 'mc', 'dj', 'mc'],
  electronic: ['producer', 'dj', 'keys', 'vocal'],
  sacred: ['vocal', 'strings', 'keys', 'horns'],
};

function rolesFor(family: FamilyId, n: number): Person['role'][] {
  const set = ROLE_SETS[family] ?? ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns'];
  const out: Person['role'][] = [];
  for (let i = 0; i < n; i++) out.push(set[i % set.length]);
  return out;
}

export function personName(r: Rng, lang: NameGroup): string {
  const first = FIRST_NAMES[lang] ?? FIRST_NAMES.en;
  const last = LAST_NAMES[lang] ?? LAST_NAMES.en;
  return `${r.pick(first)} ${r.pick(last)}`;
}

export function langForCity(cityId: string, r: Rng): NameGroup {
  const city = cityById[cityId];
  if (!city) return 'en';
  // cidades cosmopolitas misturam idiomas
  if (r.chance(0.12)) return r.pick(['en', 'es', 'pt', 'fr'] as NameGroup[]);
  return city.lang;
}

export function makePerson(
  s: GameState,
  r: Rng,
  opts: { lang: NameGroup; role: Person['role']; potential: number; born: number; startFrac: number; name?: string; synthetic?: boolean },
): Person {
  const extreme = hasMutator(s, 'difficult_artists');
  const origin = r.pick(ORIGINS);
  const skills = {} as Record<SkillId, number>;
  const base = opts.potential * opts.startFrac;
  const keys: SkillId[] = ['comp', 'lyr', 'voice', 'instr', 'prod', 'stage', 'biz'];
  for (const k of keys) {
    let focus = 0;
    if (k === 'voice' && (opts.role === 'vocal' || opts.role === 'mc')) focus = 14;
    if (k === 'instr' && opts.role !== 'vocal' && opts.role !== 'mc') focus = 14;
    if (k === 'prod' && (opts.role === 'producer' || opts.role === 'dj')) focus = 18;
    if (k === 'lyr' && opts.role === 'mc') focus = 10;
    const v = base + focus + (origin.bonus[k] ?? 0) + r.normal(0, 9) - (k === 'biz' ? 12 : 0);
    skills[k] = Math.round(clamp(v, 3, Math.max(10, opts.potential + 5)));
  }
  const traitCount = extreme ? 3 : r.chance(0.5) ? 2 : 3;
  const traits: string[] = [];
  const groups = new Set<string>();
  while (traits.length < traitCount) {
    const tr = r.pick(TRAITS);
    if (traits.includes(tr.id) || (groups.has(tr.group) && r.chance(0.6))) continue;
    traits.push(tr.id);
    groups.add(tr.group);
  }
  return {
    id: nextId(s, 'p'),
    name: opts.name ?? personName(r, opts.lang),
    born: opts.born,
    role: opts.synthetic ? 'synthetic' : opts.role,
    skills,
    potential: Math.round(opts.potential),
    traits,
    ambition: r.pick(AMBITIONS).id,
    origin: origin.id,
    morale: r.int(55, 80),
    inspiration: r.int(40, 80),
    fatigue: r.int(0, 20),
    stress: r.int(5, 30),
    resentment: 0,
    health: 'ok',
    alive: true,
    rel: {},
    lowMoraleMonths: 0,
  };
}

export function bandName(r: Rng, lang: NameGroup, family: FamilyId, members: number, synthetic = false): string {
  const W = BAND_WORDS;
  if (synthetic) return `${r.pick(W.synthPrefix)} ${r.pick(W.synthNoun)}`;
  if (family === 'electronic' && r.chance(0.6)) return r.chance(0.5) ? r.pick(W.deWord) : r.pick(W.frWord);
  if (family === 'pop' && members >= 4 && r.chance(0.5)) return `${r.pick(W.idolNoun)} ${r.pick(['Five', 'Seven', 'Nine', 'Six', 'Four', 'Eleven'])}`;
  if (members >= 5 && r.chance(0.35)) {
    const city = r.pick(['Harbor', 'Southside', 'Eastgate', 'Riverside', 'Uptown', 'Westend']);
    return `${city} ${r.pick(W.collective)}`;
  }
  if (lang === 'pt') {
    if (members === 2) return `Dupla ${r.pick(W.ptNoun)} ${r.pick(W.ptColor)}`;
    return r.chance(0.5) ? r.pick(W.ptPlural) : `${r.pick(W.ptNoun)} ${r.pick(W.ptColor)}`;
  }
  if (lang === 'es') return r.pick(W.esPlural);
  if (r.chance(0.5)) return `The ${r.pick(W.enAdj)} ${r.pick(W.enPlural)}`;
  return `${r.pick(W.enAdj)} ${r.pick(W.enNoun)}`;
}

export function songTitle(r: Rng, lang: NameGroup): string {
  const set = lang === 'pt' ? SONG_WORDS.pt : lang === 'es' ? SONG_WORDS.es : SONG_WORDS.en;
  const roll = r.next();
  if (roll < 0.3) return r.pick(set.solo);
  return `${r.pick(set.a)} ${r.pick(set.b)}`;
}

export interface MakeActOpts {
  name?: string;
  genre: string;
  city: string;
  members: number;
  potential: number;
  formed: number;
  debutYear: number;
  catalogNo?: number;
  archetype?: Act['archetype'];
  fame?: number;
  startFrac?: number;
  rs?: boolean;
  owner?: string | null;
}

export function makeAct(s: GameState, r: Rng, o: MakeActOpts): Act {
  const lang = langForCity(o.city, r);
  const family = familyOf(o.genre);
  const roles = rolesFor(family, o.members);
  const synthetic = o.archetype === 'synthetic';
  const members: Person[] = [];
  for (let i = 0; i < o.members; i++) {
    const age = r.int(17, 27);
    const pPot = clamp(o.potential + r.normal(0, 6), 15, 99);
    const p = makePerson(s, r, {
      lang,
      role: roles[i],
      potential: pPot,
      born: o.formed - age,
      startFrac: o.startFrac ?? r.float(0.42, 0.62),
      synthetic,
      name: o.members === 1 && o.name ? o.name : undefined,
    });
    if (synthetic) p.traits = ['prolific', 'media_savvy'];
    else if (r.chance(0.7)) {
      // temperamento costuma combinar com o gênero (rebeldia → rock, rua → hip hop…)
      const tr = r.weighted(TEMPER_TRAITS, (x) => Math.max(0.03, (GENRE_AFFINITY[x]?.[family] ?? 0) + 0.08));
      if (tr && !p.traits.includes(tr)) {
        p.traits = p.traits.filter((x) => traitById[x]?.group !== 'temper');
        if (p.traits.length >= 3) p.traits.pop();
        p.traits.push(tr);
      }
    }
    members.push(p);
    s.persons[p.id] = p;
  }
  // relações iniciais
  for (const a of members) for (const b of members) if (a !== b) a.rel[b.id] = r.int(-10, 50);
  const name = o.name ?? (o.members === 1 ? members[0].name : bandName(r, lang, family, o.members, synthetic));
  const act: Act = {
    id: nextId(s, 'a'),
    name,
    catalogNo: o.catalogNo,
    genre: o.genre,
    city: o.city,
    members: members.map((m) => m.id),
    formed: o.formed,
    debutYear: o.debutYear,
    status: 'emerging',
    fame: o.fame ?? r.float(0, 4),
    momentum: r.float(20, 50),
    positioning: r.float(10, 45),
    fans: { casual: Math.round(r.float(20, 300)), active: Math.round(r.float(5, 60)), core: Math.round(r.float(1, 15)) },
    owner: o.owner ?? null,
    trust: 50,
    potential: Math.round(o.potential),
    archetype: o.archetype,
    logoSeed: r.int(1, 2 ** 30),
    songs: [],
    releases: [],
    lastRelease: -999,
    careerEnd: o.debutYear + Math.round(clamp(r.normal(s.config.mode === 'historic' ? 30 : 24, 10), 6, 46)),
    peakChart: 999,
    hits: 0,
    number1s: 0,
    awards: 0,
    legend: false,
    scandals: 0,
    networking: 0,
    rehearsed: 0,
    feats: 0,
    cash: 0,
    history: [],
    rs: o.rs,
  };
  s.acts[act.id] = act;
  return act;
}

/** Talento agregado do ato: melhor compositor, melhor letrista, voz principal, banda. */
export function actTalent(s: GameState, act: Act): Record<SkillId, number> {
  const ms = act.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
  if (!ms.length) return { comp: 0, lyr: 0, voice: 0, instr: 0, prod: 0, stage: 0, biz: 0 };
  const max = (k: SkillId) => Math.max(...ms.map((m) => m.skills[k]));
  const mean = (k: SkillId) => ms.reduce((t, m) => t + m.skills[k], 0) / ms.length;
  return {
    comp: max('comp') * 0.75 + mean('comp') * 0.25,
    lyr: max('lyr') * 0.8 + mean('lyr') * 0.2,
    voice: max('voice'),
    instr: ms.length > 1 ? mean('instr') * 0.7 + max('instr') * 0.3 : max('instr'),
    prod: max('prod'),
    stage: mean('stage') * 0.6 + max('stage') * 0.4,
    biz: max('biz'),
  };
}

export function actState(s: GameState, act: Act): { morale: number; fatigue: number; stress: number; inspiration: number } {
  const ms = act.members.map((id) => s.persons[id]).filter((p) => p && p.alive);
  if (!ms.length) return { morale: 0, fatigue: 0, stress: 0, inspiration: 0 };
  const m = (k: 'morale' | 'fatigue' | 'stress' | 'inspiration') => ms.reduce((t, p) => t + p[k], 0) / ms.length;
  return { morale: m('morale'), fatigue: m('fatigue'), stress: m('stress'), inspiration: m('inspiration') };
}

export function traitMod(s: GameState, act: Act, key: keyof import('../data/people').TraitDef['mod']): number {
  let t = 0;
  for (const id of act.members) {
    const p = s.persons[id];
    if (!p) continue;
    for (const tr of p.traits) {
      const def = TRAITS.find((x) => x.id === tr);
      t += (def?.mod[key] as number | undefined) ?? 0;
    }
  }
  return t / Math.max(1, act.members.length);
}

export function actHasTrait(s: GameState, act: Act, trait: string): boolean {
  return act.members.some((id) => s.persons[id]?.traits.includes(trait));
}

export function mainAmbition(s: GameState, act: Act): string {
  const counts: Record<string, number> = {};
  for (const id of act.members) {
    const p = s.persons[id];
    if (p) counts[p.ambition] = (counts[p.ambition] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'art';
}

/** Crescimento mensal de habilidade rumo ao potencial (retorno decrescente). */
export function growPerson(p: Person, k: SkillId, amount: number): void {
  const cap = Math.min(100, p.potential + 4);
  const gap = Math.max(0, cap - p.skills[k]);
  p.skills[k] = Math.min(cap, p.skills[k] + amount * (gap / Math.max(1, cap)) * 1.6);
}

export function actLang(act: Act): NameGroup {
  return cityById[act.city]?.lang ?? 'en';
}
