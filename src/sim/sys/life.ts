// Sistema "life" (rodada 5): o jogador como personagem. O dono do selo vira uma pessoa do mundo
// (s.persons, isPlayer) com atributos musicais, e ganha uma vida própria com tempo livre por mês:
// namorar, casar, ter filhos e educá-los, praticar, compor, tocar num bar, seguir carreira solo,
// formar ou entrar numa banda, festas da indústria, hobbies, terapia, filantropia e memórias.
// Dinheiro pessoal = patrimônio do dono (separado do caixa da empresa).

import { clamp, type Rng } from '../../core/rng';
import { genreById, l, type L } from '../../data/world';
import { queueCutscene, registerExt4, registerMod, registerSimHook } from '../ext4';
import { composeSongs, songQ } from '../production';
import { langForCity, makeAct, makePerson, personName } from '../people';
import type { Act, GameState, Person } from '../types';
import { fmtL, money, notify, remember } from '../util';
import { perk } from '../perks';
import { grantPlayerContract } from '../worldgen';
import { P } from './people/state';
import { gainXp, ownerOf, type OwnerAttr } from './people/owner';
import { grow, learnInstrument, overall, type Role } from './talent';
import { BACKGROUNDS, HOBBIES, JOBS, KID_EDU, PARTNER_TRAITS, backgroundById, type BackgroundId, type HobbyId, type KidEdu } from './life/data';
import { ensureBandVocalist } from './vocals10';

export * from './life/data';

export interface Partner {
  name: string;
  born: number;
  job: L;
  trait: string;
  affinity: number;
  since: number;
  stage: 'dating' | 'engaged' | 'married';
  /** pretendente que é uma pessoa do mundo (artista) */
  personId?: string;
  lastDate: number;
}

export interface Candidate {
  id: string;
  name: string;
  born: number;
  job: L;
  trait: string;
  chemistry: number;
  personId?: string;
}

export interface KidX {
  edu: KidEdu;
  bond: number;
  actId?: string;
  adopted?: boolean;
}

export interface LifeState {
  background: BackgroundId;
  /** mês (ano*12+mês) do último reinício do tempo livre e quanto já foi usado */
  monthKey: number;
  used: number;
  partner: Partner | null;
  exes: string[];
  candidates: Candidate[];
  kidsX: Record<number, KidX>;
  fame: number;
  hobbies: Partial<Record<HobbyId, number>>;
  memoir: boolean;
  log: { week: number; year: number; text: L; tone: 'good' | 'bad' | 'info' }[];
  stats: { dates: number; gigs: number; songs: number; parties: number; charity: number };
}

declare module '../ext4' {
  interface Ext4 {
    life: LifeState;
  }
}

const fresh = (): LifeState => ({
  background: 'fan', monthKey: -1, used: 0, partner: null, exes: [], candidates: [], kidsX: {}, fame: 0, hobbies: {}, memoir: false, log: [],
  stats: { dates: 0, gigs: 0, songs: 0, parties: 0, charity: 0 },
});

registerExt4('life', fresh);

export function life(s: GameState): LifeState {
  const x = s.x4 as unknown as { life?: LifeState };
  x.life ??= fresh();
  return x.life;
}

// ---------------------------------------------------------------- tempo livre

export const ENERGY_PER_MONTH = 5;

const mKey = (s: GameState) => s.year * 12 + s.month;

/** Tempo livre do mês: tocar numa banda ocupa uma unidade (ensaios e compromissos). */
export function maxEnergy(s: GameState): number {
  return Math.max(1, ENERGY_PER_MONTH - (playerAct(s) ? 1 : 0) + Math.round(perk(s, 'energy')));
}

export function energyLeft(s: GameState): number {
  const L0 = life(s);
  if (L0.monthKey !== mKey(s)) { L0.monthKey = mKey(s); L0.used = 0; }
  return Math.max(0, maxEnergy(s) - L0.used);
}

/** Gasta tempo livre do mês (para outros sistemas: sócios, tramas, decisões). */
export function spendEnergy(s: GameState, n: number): L | null {
  return spend(s, n);
}

function spend(s: GameState, n: number): L | null {
  if (energyLeft(s) < n) return l('Sem tempo livre este mês. Volte no mês que vem.', 'No free time left this month. Come back next month.');
  life(s).used += n;
  return null;
}

function payPersonal(s: GameState, real: number): L | null {
  const o = ownerOf(s);
  const c = money(s, real);
  if (o.wealth < c) return l('Patrimônio pessoal insuficiente (sai do seu bolso, não da empresa).', 'Not enough personal wealth (it comes out of your pocket, not the company).');
  o.wealth -= c;
  return null;
}

function logLife(s: GameState, text: L, tone: 'good' | 'bad' | 'info' = 'info', important = false): void {
  const L0 = life(s);
  L0.log.unshift({ week: s.week, year: s.year, text, tone });
  if (L0.log.length > 40) L0.log.length = 40;
  if (important) remember(s, 'life', text, { important: true });
}

// ---------------------------------------------------------------- o personagem como pessoa

export function playerPerson(s: GameState): Person | undefined {
  const id = ownerOf(s).personId;
  return id ? s.persons[id] : undefined;
}

export function playerAct(s: GameState): Act | undefined {
  const p = playerPerson(s);
  if (!p) return undefined;
  return Object.values(s.acts).find((a) => a.members.includes(p.id) && a.status !== 'split' && a.status !== 'retired');
}

export function ownerAgeNow(s: GameState): number {
  return s.year - ownerOf(s).born;
}

/** Cria (ou recria, depois de uma sucessão) a pessoa que representa o dono. */
export function ensurePlayerPerson(s: GameState, r: Rng): Person {
  const o = ownerOf(s, r);
  const cur = o.personId ? s.persons[o.personId] : undefined;
  if (cur && cur.alive && cur.name === o.name) return cur;
  if (cur && cur.name !== o.name) cur.isPlayer = false;
  const spec = s.config.character;
  const first = !o.personId && !!spec;
  const bg = backgroundById[(first ? spec!.background : life(s).background) as BackgroundId] ?? backgroundById.fan;
  const role: Role = (first && spec!.role) || bg.role;
  const pot = r.int(55, 72);
  const p = makePerson(s, r, { lang: langForCity(s.config.homeCity, r), role, potential: pot, born: o.born, startFrac: bg.musical, name: o.name });
  for (const [k, v] of Object.entries(bg.skills)) p.skills[k as keyof Person['skills']] = clamp(p.skills[k as keyof Person['skills']] + (v ?? 0), 3, pot + 8);
  p.traits = [...new Set([...bg.traits, ...p.traits])].slice(0, 3);
  p.isPlayer = true;
  p.morale = 70;
  p.origin = ({ musician: 'garage', heir: 'family', dj: 'self_taught', lawyer: 'conservatory', producer: 'self_taught', fan: 'talent_show' } as Record<string, string>)[bg.id] ?? p.origin;
  if (first && spec!.look) p.look = spec!.look;
  s.persons[p.id] = p;
  o.personId = p.id;
  return p;
}

/** Aplica a ficha de criação (nome, idade, origem) ao dono no começo do jogo. */
function applyCharacter(s: GameState, r: Rng): void {
  const spec = s.config.character;
  const o = ownerOf(s, r);
  const L0 = life(s);
  if (spec) {
    if (spec.name.trim()) o.name = spec.name.trim().slice(0, 40);
    o.born = s.year - clamp(Math.round(spec.age || 30), 18, 70);
    L0.background = (backgroundById[spec.background as BackgroundId] ? spec.background : 'fan') as BackgroundId;
  } else L0.background = r.pick(BACKGROUNDS).id;
  const bg = backgroundById[L0.background];
  for (const [k, v] of Object.entries(bg.owner)) o.attrs[k as OwnerAttr] = clamp(o.attrs[k as OwnerAttr] + (v ?? 0), 10, 95);
  o.wealth = money(s, bg.wealth);
  const p = ensurePlayerPerson(s, r);
  // artista/híbrido: o personagem é o líder da própria banda
  const band = s.player.bandActId ? s.acts[s.player.bandActId] : undefined;
  if (band && !band.members.includes(p.id)) {
    const old = band.members[0];
    if (old && s.persons[old]) delete s.persons[old];
    band.members[0] = p.id;
    band.leaderId = p.id;
    if (band.members.length === 1 && !s.config.bandName) band.name = p.name;
    for (const id of band.members) if (id !== p.id && s.persons[id]) { s.persons[id].rel[p.id] = r.int(10, 50); p.rel[id] = r.int(10, 50); }
  }
  ensureBandVocalist(s, band); // rodada 10: a banda começa com alguém que canta
}

registerSimHook('newgame', 'life', (s, r) => applyCharacter(s, r));

// ---------------------------------------------------------------- vida amorosa

export function meetPeople(s: GameState, r: Rng, where: 'out' | 'party' = 'out'): Candidate[] | L {
  const e = spend(s, 1);
  if (e) return e;
  const err = payPersonal(s, where === 'party' ? 0 : 120);
  if (err) { life(s).used -= 1; return err; }
  const L0 = life(s);
  const lang = langForCity(s.config.homeCity, r);
  const age = ownerAgeNow(s);
  const out: Candidate[] = [];
  const o = ownerOf(s);
  for (let i = 0; i < 3; i++) {
    const cAge = clamp(age + r.int(-8, 6), 19, 80);
    out.push({ id: `c${s.week}-${i}`, name: personName(r, lang), born: s.year - cAge, job: r.pick(JOBS), trait: r.pick(PARTNER_TRAITS).id, chemistry: clamp(r.int(25, 85) + (o.attrs.charisma - 50) / 3, 5, 99) });
  }
  // numa festa da indústria dá para conhecer artistas (romance com quem você contrata = drama)
  if (where === 'party') {
    const artists = Object.values(s.persons).filter((p) => p.alive && !p.isPlayer && Math.abs(s.year - p.born - age) < 12 && s.year - p.born >= 20).slice(0, 400);
    if (artists.length) {
      const a = r.pick(artists);
      const act = Object.values(s.acts).find((x) => x.members.includes(a.id));
      out[0] = { id: `c${s.week}-a`, name: a.name, born: a.born, job: act ? fmtL(l('artista ({a})', 'artist ({a})'), { a: act.name }) : l('artista', 'artist'), trait: 'artsy', chemistry: clamp(r.int(35, 90), 5, 99), personId: a.id };
    }
  }
  L0.candidates = out;
  return out;
}

export function startDating(s: GameState, candId: string): L | null {
  const L0 = life(s);
  if (L0.partner) return l('Você já está num relacionamento.', 'You are already in a relationship.');
  const c = L0.candidates.find((x) => x.id === candId);
  if (!c) return l('Essa pessoa já seguiu a vida.', 'That person has moved on.');
  L0.partner = { name: c.name, born: c.born, job: c.job, trait: c.trait, affinity: Math.round(c.chemistry * 0.7), since: s.week, stage: 'dating', personId: c.personId, lastDate: s.week };
  L0.candidates = [];
  logLife(s, fmtL(l('Começou a namorar {p}.', 'Started dating {p}.'), { p: c.name }), 'good');
  if (c.personId) {
    const act = Object.values(s.acts).find((a) => a.members.includes(c.personId!));
    if (act && (act.owner === 'player' || act.playerBand)) notify(s, fmtL(l('Você está namorando alguém do próprio elenco ({a}). A imprensa vai adorar; a banda, talvez não.', 'You are dating someone on your own roster ({a}). The press will love it; the band, maybe not.'), { a: act.name }), 'info');
  }
  return null;
}

const likes = (p: Partner) => PARTNER_TRAITS.find((x) => x.id === p.trait)?.likes ?? 'calm';

/** Programa a dois. Tipo muda o efeito conforme o gosto do par. */
export function goOnDate(s: GameState, r: Rng, kind: 'dinner' | 'show' | 'trip' | 'home'): L | null {
  const L0 = life(s);
  const pt = L0.partner;
  if (!pt) return l('Você não está num relacionamento.', 'You are not in a relationship.');
  const cost = { dinner: 150, show: 250, trip: 2500, home: 0 }[kind];
  const e = spend(s, kind === 'trip' ? 2 : 1);
  if (e) return e;
  const pe = payPersonal(s, cost);
  if (pe) { L0.used -= kind === 'trip' ? 2 : 1; return pe; }
  const lk = likes(pt);
  let gain = { dinner: 6, show: 6, trip: 14, home: 5 }[kind];
  if ((kind === 'show' && (lk === 'music' || lk === 'fame')) || (kind === 'home' && (lk === 'family' || lk === 'calm')) || (kind === 'dinner' && lk === 'money')) gain += 6;
  if (kind === 'trip' && lk === 'calm') gain += 4;
  gain += (ownerOf(s).attrs.charisma - 50) / 12 + r.int(-3, 3);
  pt.affinity = clamp(pt.affinity + gain, 0, 100);
  pt.lastDate = s.week;
  const o = ownerOf(s);
  o.stress = clamp(o.stress - (kind === 'trip' ? 15 : 5), 0, 100);
  L0.stats.dates += 1;
  gainXp(s, 'charisma', 1);
  if (kind === 'show' && pt.personId) life(s).fame = clamp(L0.fame + 1, 0, 100);
  return null;
}

export function propose(s: GameState, r: Rng): { ok: boolean; text: L } | L {
  const L0 = life(s);
  const pt = L0.partner;
  if (!pt || pt.stage !== 'dating') return l('Só dá para pedir em casamento quem você namora.', 'You can only propose to someone you are dating.');
  if (s.week - pt.since < 20) return l('Ainda é cedo: namorem pelo menos alguns meses.', 'Too soon: date for at least a few months.');
  const e = spend(s, 1);
  if (e) return e;
  const pe = payPersonal(s, 1500);
  if (pe) { L0.used -= 1; return pe; }
  const yes = r.chance(clamp((pt.affinity - 35) / 50, 0.05, 0.97));
  if (yes) {
    pt.stage = 'engaged';
    pt.affinity = clamp(pt.affinity + 8, 0, 100);
    const text = fmtL(l('{p} disse sim! Agora é marcar o casamento.', '{p} said yes! Now set the wedding date.'), { p: pt.name });
    logLife(s, text, 'good', true);
    return { ok: true, text };
  }
  pt.affinity = clamp(pt.affinity - 15, 0, 100);
  const text = fmtL(l('{p} pediu mais tempo. Melhor investir no relacionamento.', '{p} asked for more time. Better invest in the relationship.'), { p: pt.name });
  logLife(s, text, 'bad');
  return { ok: false, text };
}

export const WEDDINGS = {
  simple: { name: l('Cartório e almoço em família', 'Registry office and family lunch'), cost: 2500, fame: 0, affinity: 6 },
  party: { name: l('Festa para 200 convidados', 'Party for 200 guests'), cost: 25000, fame: 3, affinity: 12 },
  gala: { name: l('Casamento de gala com imprensa', 'Gala wedding with the press'), cost: 140000, fame: 10, affinity: 15 },
} as const;
export type WeddingKind = keyof typeof WEDDINGS;

export function marry(s: GameState, kind: WeddingKind): L | null {
  const L0 = life(s);
  const pt = L0.partner;
  if (!pt || pt.stage !== 'engaged') return l('Primeiro o pedido de casamento.', 'Propose first.');
  const w = WEDDINGS[kind];
  const e = spend(s, 2);
  if (e) return e;
  const pe = payPersonal(s, w.cost);
  if (pe) { L0.used -= 2; return pe; }
  pt.stage = 'married';
  pt.affinity = clamp(pt.affinity + w.affinity, 0, 100);
  const o = ownerOf(s);
  o.spouse = pt.name;
  o.stress = clamp(o.stress - 10, 0, 100);
  L0.fame = clamp(L0.fame + w.fame, 0, 100);
  if (kind === 'gala') s.player.reputation.institutional = clamp(s.player.reputation.institutional + 2, 0, 100);
  const text = fmtL(l('{o} e {p} se casam — {w}.', '{o} and {p} get married — {w}.'), { o: o.name, p: pt.name, w: w.name });
  logLife(s, text, 'good', true);
  notify(s, text, 'good');
  queueCutscene(s, 'life', { title: l('Casamento', 'Wedding'), text, icon: 'heart', kind: 'wedding', size: kind });
  return null;
}

export function breakUp(s: GameState): L | null {
  const L0 = life(s);
  const pt = L0.partner;
  if (!pt) return l('Você não está num relacionamento.', 'You are not in a relationship.');
  const o = ownerOf(s);
  if (pt.stage === 'married') {
    // divórcio: partilha de bens
    const share = Math.round(Math.max(0, o.wealth) * 0.35);
    o.wealth -= share;
    o.spouse = undefined;
    for (const k of Object.values(L0.kidsX)) k.bond = clamp(k.bond - 15, 0, 100);
    logLife(s, fmtL(l('Divórcio de {p}. Partilha de bens: {v}.', 'Divorce from {p}. Asset split: {v}.'), { p: pt.name, v: String(Math.round(share / 100)) }), 'bad', true);
  } else logLife(s, fmtL(l('Fim do namoro com {p}.', 'Broke up with {p}.'), { p: pt.name }), 'bad');
  o.stress = clamp(o.stress + 12, 0, 100);
  L0.exes.push(pt.name);
  if (L0.exes.length > 10) L0.exes.shift();
  L0.partner = null;
  return null;
}

// ---------------------------------------------------------------- filhos

function addKid(s: GameState, r: Rng, adopted: boolean): string {
  const o = ownerOf(s);
  // dom hereditário (ouvido absoluto): 50% de chance de passar para filhos biológicos
  const gifted = !adopted && ((s.x4 as unknown as { persona?: { traits: string[] } }).persona?.traits ?? []).includes('perfect_pitch') && r.chance(0.5);
  const k = { name: personName(r, langForCity(s.config.homeCity, r)), born: s.year - (adopted ? r.int(1, 6) : 0), aptitude: Math.min(99, r.int(25, 75) + (gifted ? 20 : 0) + (s.config.card === 'dynast' ? 10 : 0)) };
  if (gifted) logLife(s, fmtL(l('{k} herdou o seu ouvido absoluto.', '{k} inherited your perfect pitch.'), { k: k.name }), 'good');
  o.kids.push(k);
  life(s).kidsX[o.kids.length - 1] = { edu: 'public', bond: 60, adopted };
  return k.name;
}

export function tryForBaby(s: GameState, r: Rng): { ok: boolean; text: L } | L {
  const L0 = life(s);
  const pt = L0.partner;
  if (!pt) return l('Precisa de um par para isso.', 'You need a partner for that.');
  if (s.year - pt.born > 46) return l('Pela idade, o caminho agora é a adoção.', 'Given your ages, adoption is the way now.');
  if (pt.affinity < 40) return l('O relacionamento precisa estar melhor antes disso.', 'The relationship needs to be in a better place first.');
  if (ownerOf(s).kids.length >= 6) return l('A casa já está cheia!', 'The house is already full!');
  const e = spend(s, 1);
  if (e) return e;
  const ok = r.chance(0.35);
  if (!ok) return { ok: false, text: l('Ainda não foi desta vez.', 'Not this time.') };
  const name = addKid(s, r, false);
  pt.affinity = clamp(pt.affinity + 6, 0, 100);
  const text = fmtL(l('Nasce {k}, filho(a) de {o} e {p}!', '{k} is born to {o} and {p}!'), { k: name, o: ownerOf(s).name, p: pt.name });
  logLife(s, text, 'good', true);
  notify(s, text, 'good');
  queueCutscene(s, 'life', { title: l('Nascimento', 'Birth'), text, icon: 'heart', kind: 'birth' });
  return { ok: true, text };
}

export function adopt(s: GameState, r: Rng): L | null {
  if (ownerOf(s).kids.length >= 6) return l('A casa já está cheia!', 'The house is already full!');
  const e = spend(s, 2);
  if (e) return e;
  const pe = payPersonal(s, 6000);
  if (pe) { life(s).used -= 2; return pe; }
  const name = addKid(s, r, true);
  const text = fmtL(l('{o} adota {k}.', '{o} adopts {k}.'), { o: ownerOf(s).name, k: name });
  logLife(s, text, 'good', true);
  queueCutscene(s, 'life', { title: l('Adoção', 'Adoption'), text, icon: 'heart', kind: 'birth' });
  return null;
}

export function familyTime(s: GameState): L | null {
  const o = ownerOf(s);
  if (!o.kids.length && !life(s).partner) return l('Ninguém em casa para isso.', 'Nobody at home for that.');
  const e = spend(s, 1);
  if (e) return e;
  for (const k of Object.values(life(s).kidsX)) k.bond = clamp(k.bond + 10, 0, 100);
  const pt = life(s).partner;
  if (pt) { pt.affinity = clamp(pt.affinity + (likes(pt) === 'family' ? 9 : 5), 0, 100); pt.lastDate = s.week; }
  o.stress = clamp(o.stress - 8, 0, 100);
  gainXp(s, 'management', 1);
  return null;
}

export function setKidEdu(s: GameState, idx: number, edu: KidEdu): L | null {
  const k = ownerOf(s).kids[idx];
  if (!k) return l('Filho(a) não encontrado(a).', 'Child not found.');
  if (s.year - k.born >= 18) return l('Já é adulto(a).', 'Already an adult.');
  (life(s).kidsX[idx] ??= { edu: 'public', bond: 50 }).edu = edu;
  return null;
}

/** Filho(a) com 16+ lança carreira pelo seu selo. */
export function launchKidCareer(s: GameState, r: Rng, idx: number, genre: string): Act | L {
  const o = ownerOf(s);
  const k = o.kids[idx];
  const kx = (life(s).kidsX[idx] ??= { edu: 'public', bond: 50 });
  if (!k) return l('Filho(a) não encontrado(a).', 'Child not found.');
  if (s.year - k.born < 16) return l('Precisa ter 16 anos ou mais.', 'Must be 16 or older.');
  if (kx.actId && s.acts[kx.actId]) return l('Já tem carreira.', 'Already has a career.');
  if (!genreById[genre] || genreById[genre].born > s.year) return l('Gênero indisponível nesta época.', 'Genre not available in this era.');
  if (kx.bond < 30) return l('Seu filho(a) não quer saber do seu selo agora (vínculo baixo).', 'Your child wants nothing to do with your label right now (low bond).');
  const e = spend(s, 1);
  if (e) return e;
  const act = makeAct(s, r, { genre, city: s.config.homeCity, members: 1, potential: clamp(k.aptitude + 5, 20, 95), formed: s.year, debutYear: s.year, fame: clamp(life(s).fame / 3, 0, 20), name: k.name });
  const p = s.persons[act.members[0]];
  if (p) { p.born = k.born; p.parentId = o.personId; }
  signOwn(s, act);
  kx.actId = act.id;
  const text = fmtL(l('{k}, filho(a) de {o}, estreia como artista pelo selo.', '{k}, {o}\'s child, debuts as an artist on the label.'), { k: k.name, o: o.name });
  logLife(s, text, 'good', true);
  return act;
}

// ---------------------------------------------------------------- carreira musical

function skillOfRole(p: Person): keyof Person['skills'] {
  return p.role === 'vocal' || p.role === 'mc' ? 'voice' : p.role === 'producer' || p.role === 'dj' ? 'prod' : 'instr';
}

export function practice(s: GameState): L | null {
  const p = playerPerson(s);
  if (!p) return l('Personagem indisponível.', 'Character unavailable.');
  const e = spend(s, 1);
  if (e) return e;
  const k = skillOfRole(p);
  const room = clamp((p.potential + 6 - p.skills[k]) / 20, 0.1, 1);
  p.skills[k] = clamp(p.skills[k] + 1.6 * room, 0, 100);
  p.skills.stage = clamp(p.skills.stage + 0.4 * room, 0, 100);
  grow(s, p, 'tech', 0.8);
  p.fatigue = clamp(p.fatigue + 4, 0, 100);
  return null;
}

export function learnNewInstrument(s: GameState, role: Role): L | null {
  const p = playerPerson(s);
  if (!p) return l('Personagem indisponível.', 'Character unavailable.');
  if (role === p.role) return l('Esse já é o seu instrumento principal.', 'That is already your main instrument.');
  const e = spend(s, 1);
  if (e) return e;
  const pe = payPersonal(s, 250);
  if (pe) { life(s).used -= 1; return pe; }
  learnInstrument(s, p.id, role, 5);
  return null;
}

/** Troca o instrumento principal (perde um pouco da técnica acumulada). */
export function switchMainInstrument(s: GameState, role: Role): L | null {
  const p = playerPerson(s);
  if (!p) return l('Personagem indisponível.', 'Character unavailable.');
  if (role === p.role || role === 'synthetic') return l('Escolha outro instrumento.', 'Pick another instrument.');
  p.role = role;
  return null;
}

export function writeAlone(s: GameState, r: Rng): L | null {
  const p = playerPerson(s);
  if (!p) return l('Personagem indisponível.', 'Character unavailable.');
  const e = spend(s, 1);
  if (e) return e;
  p.skills.comp = clamp(p.skills.comp + 0.6 * clamp((p.potential + 6 - p.skills.comp) / 20, 0.1, 1), 0, 100);
  p.skills.lyr = clamp(p.skills.lyr + 0.4, 0, 100);
  grow(s, p, 'create', 0.6);
  life(s).stats.songs += 1;
  const act = playerAct(s);
  if (act) {
    const [so] = composeSongs(s, r, act, 1);
    if (so) so.writers = [p.id];
    logLife(s, fmtL(l('Compôs "{t}" para {a}.', 'Wrote "{t}" for {a}.'), { t: so?.title ?? '?', a: act.name }), 'good');
  } else logLife(s, l('Encheu o caderno de ideias (sem banda, as músicas ficam guardadas na sua técnica).', 'Filled the notebook with ideas (without a band, they go into your craft).'), 'info');
  return null;
}

/** Tocar num bar/abrir microfone: um pouco de fama pessoal, cachê e palco. */
export function playBar(s: GameState, r: Rng): L | null {
  const p = playerPerson(s);
  if (!p) return l('Personagem indisponível.', 'Character unavailable.');
  const e = spend(s, 1);
  if (e) return e;
  const L0 = life(s);
  const o = ownerOf(s);
  const quality = (overall(s, p) + p.skills.stage) / 2 + r.int(-10, 10);
  const pay = money(s, (60 + quality * 5) * (L0.background === 'musician' || L0.background === 'roadie' ? 1.5 : 1));
  o.wealth += pay;
  L0.fame = clamp(L0.fame + clamp((quality - 35) / 25, 0, 2), 0, 100);
  grow(s, p, 'presence', 0.4);
  grow(s, p, 'crowd', 0.4);
  p.skills.stage = clamp(p.skills.stage + 0.3, 0, 100);
  L0.stats.gigs += 1;
  const act = playerAct(s);
  if (act) act.fans.casual += Math.round(quality * 3);
  logLife(s, quality >= 55 ? l('Noite boa no bar: o público pediu bis.', 'Good night at the bar: the crowd asked for an encore.') : l('Noite morna no bar; pelo menos pagaram o cachê.', 'Lukewarm night at the bar; at least they paid.'), quality >= 55 ? 'good' : 'info');
  return null;
}

function signOwn(s: GameState, act: Act): void {
  if (s.config.role === 'artist') {
    act.owner = 'player';
    act.playerBand = true;
    act.trust = 100;
  } else {
    grantPlayerContract(s, act, 60);
    act.trust = 80;
  }
  s.knowledge[act.id] = { actId: act.id, degree: 5, stage: 'negotiation', bias: 0, updatedWeek: s.week, source: 'self' };
  s.delegated[act.id] = true;
}

/** Carreira solo ou banda nova (com músicos recrutados na cidade). */
export function startProject(s: GameState, r: Rng, kind: 'solo' | 'band', genre: string, name: string): Act | L {
  const p = playerPerson(s);
  if (!p) return l('Personagem indisponível.', 'Character unavailable.');
  if (playerAct(s)) return l('Você já está num projeto musical. Saia dele antes.', 'You are already in a musical project. Leave it first.');
  if (!genreById[genre] || genreById[genre].born > s.year) return l('Gênero indisponível nesta época.', 'Genre not available in this era.');
  const e = spend(s, kind === 'band' ? 2 : 1);
  if (e) return e;
  if (kind === 'band') {
    const pe = payPersonal(s, 800);
    if (pe) { life(s).used -= 2; return pe; }
  }
  const n = kind === 'solo' ? 1 : r.int(3, 4);
  const act = makeAct(s, r, { genre, city: s.config.homeCity, members: n, potential: clamp(p.potential + r.int(-8, 4), 20, 95), formed: s.year, debutYear: s.year, fame: clamp(life(s).fame / 4, 0, 15), startFrac: 0.5 });
  const dropped = act.members[0];
  if (dropped && s.persons[dropped]) delete s.persons[dropped];
  act.members[0] = p.id;
  act.leaderId = p.id;
  for (const id of act.members) if (id !== p.id && s.persons[id]) { s.persons[id].rel[p.id] = r.int(0, 45); p.rel[id] = r.int(10, 50); }
  act.name = name.trim() ? name.trim().slice(0, 40) : kind === 'solo' ? p.name : act.name;
  ensureBandVocalist(s, act); // rodada 10: sem vocalista não há letra
  signOwn(s, act);
  const text = kind === 'solo'
    ? fmtL(l('{o} lança carreira solo como "{a}".', '{o} launches a solo career as "{a}".'), { o: p.name, a: act.name })
    : fmtL(l('{o} forma a banda {a}.', '{o} forms the band {a}.'), { o: p.name, a: act.name });
  logLife(s, text, 'good', true);
  remember(s, 'life_band', text, { actId: act.id });
  return act;
}

/** Bandas em que o personagem pode tentar entrar: elenco do selo e independentes conhecidas da cidade. */
export function joinableActs(s: GameState): Act[] {
  const p = playerPerson(s);
  if (!p) return [];
  return Object.values(s.acts).filter((a) =>
    (a.status === 'active' || a.status === 'emerging') && a.archetype !== 'synthetic' && !a.members.includes(p.id) && a.members.length >= 2 && a.members.length < 7 &&
    (a.owner === 'player' || (!a.owner && (s.knowledge[a.id]?.degree ?? 0) >= 2))).sort((x, y) => y.fame - x.fame).slice(0, 12);
}

export function joinChance(s: GameState, act: Act): number {
  const p = playerPerson(s);
  if (!p) return 0;
  const ms = act.members.map((id) => s.persons[id]).filter((x): x is Person => !!x);
  const avg = ms.length ? ms.reduce((t, x) => t + overall(s, x), 0) / ms.length : 50;
  let c = 0.45 + (overall(s, p) - avg) / 60 + (life(s).fame - act.fame) / 200 + (ownerOf(s).attrs.charisma - 50) / 200;
  if (act.owner === 'player') c += (act.trust - 50) / 150 + 0.1;
  else c += 0.15; // entrar significa também assinar com o seu selo
  if (ms.some((x) => x.role === p.role)) c -= 0.15; // já tem alguém na sua função
  return clamp(c, 0.03, 0.95);
}

export function joinBand(s: GameState, r: Rng, actId: string): { ok: boolean; text: L } | L {
  const p = playerPerson(s);
  const act = s.acts[actId];
  if (!p || !act) return l('Banda não encontrada.', 'Band not found.');
  if (playerAct(s)) return l('Você já está num projeto musical. Saia dele antes.', 'You are already in a musical project. Leave it first.');
  if (!joinableActs(s).includes(act)) return l('Essa banda não está aberta a você.', 'That band is not open to you.');
  const e = spend(s, 1);
  if (e) return e;
  const ok = r.chance(joinChance(s, act));
  if (!ok) {
    const text = fmtL(l('{a} agradeceu, mas preferiu seguir sem você.', '{a} thanked you but chose to carry on without you.'), { a: act.name });
    logLife(s, text, 'bad');
    return { ok: false, text };
  }
  act.members.push(p.id);
  for (const id of act.members) if (id !== p.id && s.persons[id]) { s.persons[id].rel[p.id] = r.int(-10, 40); p.rel[id] = r.int(0, 40); }
  if (!act.owner) signOwn(s, act);
  const text = fmtL(l('{o} entra na banda {a}.', '{o} joins the band {a}.'), { o: p.name, a: act.name });
  logLife(s, text, 'good', true);
  remember(s, 'life_band', text, { actId: act.id });
  return { ok: true, text };
}

export function leaveBand(s: GameState): L | null {
  const p = playerPerson(s);
  const act = playerAct(s);
  if (!p || !act) return l('Você não está em nenhuma banda.', 'You are not in any band.');
  act.members = act.members.filter((x) => x !== p.id);
  if (act.leaderId === p.id) act.leaderId = act.members[0];
  if (!act.members.length) {
    act.status = act.releases.length ? 'retired' : 'split';
    if (s.player.bandActId === act.id && s.config.role === 'artist') act.status = 'hiatus';
  } else for (const id of act.members) if (s.persons[id]) s.persons[id].morale = clamp(s.persons[id].morale - 10, 0, 100);
  const text = fmtL(l('{o} deixa {a}.', '{o} leaves {a}.'), { o: p.name, a: act.name });
  logLife(s, text, 'info', true);
  remember(s, 'life_band', text, { actId: act.id });
  return null;
}

// ---------------------------------------------------------------- o dono perto dos artistas

export type MentorKind = 'talk' | 'studio' | 'stage';
export const MENTOR_NAMES: Record<MentorKind, L> = {
  talk: l('Conversa e conselho', 'Talk and advice'),
  studio: l('Acompanhar no estúdio', 'Sit in on the studio'),
  stage: l('Ensaiar o show junto', 'Rehearse the show together'),
};

/** Passar tempo com um ato do selo: moral, confiança, e o seu talento ajudando de verdade. */
export function mentorAct(s: GameState, actId: string, kind: MentorKind): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  const me = playerPerson(s);
  if (act.members.includes(me?.id ?? '')) return l('Você já faz parte desse ato.', 'You are already part of this act.');
  const key = `mentor:${actId}`;
  if (s.flags[key] && s.week - s.flags[key] < 4) return l('Uma mentoria por ato a cada mês.', 'One mentoring session per act each month.');
  const e = spend(s, 1);
  if (e) return e;
  s.flags[key] = s.week;
  const o = ownerOf(s);
  const ms = act.members.map((id) => s.persons[id]).filter((x): x is Person => !!x && x.alive);
  if (kind === 'talk') {
    for (const p of ms) { p.morale = clamp(p.morale + 6 + (o.attrs.charisma - 50) / 10, 0, 100); p.stress = clamp(p.stress - 5, 0, 100); }
    act.trust = clamp(act.trust + 3, 0, 100);
    gainXp(s, 'management', 2);
  } else if (kind === 'studio') {
    // o seu ouvido e a sua produção valem na próxima gravação (até 6 semanas)
    s.flags[`mentor-studio:${actId}`] = s.week;
    for (const p of ms) p.inspiration = clamp(p.inspiration + 6, 0, 100);
    gainXp(s, 'ear', 2);
  } else {
    act.rehearsed = clamp(act.rehearsed + 8 + (me ? me.skills.stage / 10 : 0), 0, 40);
    for (const p of ms) grow(s, p, 'presence', 0.3);
  }
  o.stress = clamp(o.stress + 2, 0, 100);
  return null;
}

registerSimHook('record', 'life-mentor', (s, _r, arg) => {
  const so = arg.song;
  if (!so) return;
  const at = s.flags[`mentor-studio:${so.actId}`];
  if (!at || s.week - at > 6) return;
  const me = playerPerson(s);
  const ear = ownerOf(s).attrs.ear;
  const boost = clamp((ear - 45) / 10 + (me ? (me.skills.prod - 40) / 15 : 0), 0, 5);
  so.production = clamp(so.production + boost, 0, 100);
  so.performance = clamp(so.performance + boost / 2, 0, 100);
  so.q = songQ(so);
});

/** Fama pessoal do dono ajuda um pouco a divulgar os lançamentos do selo. */
registerMod('appeal', 'life-fame', (s, value, ctx) => {
  if (!ctx.release || (ctx.release.owner !== 'player' && !s.acts[ctx.release.actId]?.playerBand)) return null;
  const f = life(s).fame;
  if (f < 10) return null;
  return { value: value * (1 + Math.min(0.05, f / 2000)), label: l('Fama pessoal do dono', 'Owner\'s personal fame') };
});

// ---------------------------------------------------------------- lazer, saúde e imagem

export function gym(s: GameState): L | null {
  const e = spend(s, 1);
  if (e) return e;
  const pe = payPersonal(s, 60);
  if (pe) { life(s).used -= 1; return pe; }
  const o = ownerOf(s);
  o.health = clamp(o.health + 3, 0, 100);
  o.stress = clamp(o.stress - 4, 0, 100);
  const p = playerPerson(s);
  if (p) { grow(s, p, 'fitness', 0.8); grow(s, p, 'stamina', 0.5); }
  return null;
}

export function therapy(s: GameState): L | null {
  const e = spend(s, 1);
  if (e) return e;
  const pe = payPersonal(s, 300);
  if (pe) { life(s).used -= 1; return pe; }
  const o = ownerOf(s);
  o.stress = clamp(o.stress - 15, 0, 100);
  o.health = clamp(o.health + 1, 0, 100);
  const p = playerPerson(s);
  if (p) grow(s, p, 'composure', 0.6);
  return null;
}

/** Festa da indústria: contatos e pretendentes; às vezes, manchete. */
export function industryParty(s: GameState, r: Rng): { text: L; candidates: Candidate[] } | L {
  if (energyLeft(s) < 1) return l('Sem tempo livre este mês. Volte no mês que vem.', 'No free time left this month. Come back next month.');
  const pe = payPersonal(s, 400);
  if (pe) return pe;
  const cands = meetPeople(s, r, 'party');
  if (!Array.isArray(cands)) return cands;
  const o = ownerOf(s);
  const L0 = life(s);
  L0.stats.parties += 1;
  gainXp(s, 'charisma', 3);
  gainXp(s, 'negotiation', 1);
  o.stress = clamp(o.stress - 5, 0, 100);
  o.health = clamp(o.health - 1, 0, 100);
  L0.fame = clamp(L0.fame + 0.5, 0, 100);
  let text: L;
  const roll = r.next();
  if (roll < 0.12) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100);
    text = l('Você exagerou na festa e foi parar na coluna de fofoca.', 'You overdid it at the party and ended up in the gossip column.');
    L0.fame = clamp(L0.fame + 1.5, 0, 100);
    logLife(s, text, 'bad');
  } else if (roll < 0.4) {
    s.player.reputation.artists = clamp(s.player.reputation.artists + 1.5, 0, 100);
    text = l('Boa conversa com artistas: o selo ganhou fama de lugar bom para trabalhar.', 'Good talks with artists: the label is now seen as a good place to work.');
    logLife(s, text, 'good');
  } else if (roll < 0.6) {
    const acts = Object.values(s.acts).filter((a) => !a.owner && a.status !== 'retired' && a.status !== 'split' && !(s.knowledge[a.id]?.degree)).slice(0, 300);
    if (acts.length) {
      const a = r.pick(acts);
      s.knowledge[a.id] = { actId: a.id, degree: 2, stage: 'monitoring', bias: r.normal(0, 6), updatedWeek: s.week, source: 'network' };
      text = fmtL(l('Um contato falou de {a} — já está no seu radar.', 'A contact told you about {a} — now on your radar.'), { a: a.name });
    } else text = l('Contatos novos, cartões no bolso.', 'New contacts, business cards in your pocket.');
    logLife(s, text, 'good');
  } else {
    text = l('Contatos novos, cartões no bolso.', 'New contacts, business cards in your pocket.');
    logLife(s, text, 'info');
  }
  return { text, candidates: cands };
}

export function hobby(s: GameState, id: HobbyId): L | null {
  const def = HOBBIES.find((x) => x.id === id);
  if (!def) return l('Hobby desconhecido.', 'Unknown hobby.');
  const e = spend(s, 1);
  if (e) return e;
  const pe = payPersonal(s, def.cost);
  if (pe) { life(s).used -= 1; return pe; }
  const L0 = life(s);
  const lv = (L0.hobbies[id] = (L0.hobbies[id] ?? 0) + 1);
  const o = ownerOf(s);
  const p = playerPerson(s);
  const bonus = lv >= 10 ? 2 : lv >= 4 ? 1.5 : 1;
  if (id === 'records') gainXp(s, 'ear', Math.round(3 * bonus));
  if (id === 'golf') gainXp(s, 'negotiation', Math.round(3 * bonus));
  if (id === 'painting') { o.stress = clamp(o.stress - 8, 0, 100); if (p) grow(s, p, 'creativity', 0.5 * bonus); }
  if (id === 'cars') { o.stress = clamp(o.stress - 6, 0, 100); L0.fame = clamp(L0.fame + 0.5, 0, 100); }
  if (id === 'cooking') { o.stress = clamp(o.stress - 5, 0, 100); o.health = clamp(o.health + 1, 0, 100); gainXp(s, 'charisma', 1); }
  if (id === 'sport') { o.stress = clamp(o.stress - 6, 0, 100); o.health = clamp(o.health + 2, 0, 100); if (p) grow(s, p, 'stamina', 0.5); }
  return null;
}

export function charity(s: GameState): L | null {
  const e = spend(s, 1);
  if (e) return e;
  const pe = payPersonal(s, 5000);
  if (pe) { life(s).used -= 1; return pe; }
  const L0 = life(s);
  L0.stats.charity += 1;
  L0.fame = clamp(L0.fame + 1, 0, 100);
  s.player.reputation.institutional = clamp(s.player.reputation.institutional + 1.5, 0, 100);
  s.player.reputation.artists = clamp(s.player.reputation.artists + 0.5, 0, 100);
  logLife(s, l('Doação para um projeto de música nas escolas.', 'Donation to a music-in-schools project.'), 'good');
  return null;
}

export function writeMemoir(s: GameState, r: Rng): L | null {
  const L0 = life(s);
  if (L0.memoir) return l('Você já publicou suas memórias.', 'You already published your memoir.');
  if (ownerAgeNow(s) < 40) return l('Memórias só depois dos 40.', 'Memoirs only after 40.');
  if (L0.fame < 20 && s.player.reputation.institutional < 55) return l('Ninguém compraria ainda: falta fama.', 'Nobody would buy it yet: not famous enough.');
  const e = spend(s, 3);
  if (e) return e;
  L0.memoir = true;
  const gain = money(s, 15000 + L0.fame * 1200 + s.player.stats.signed * 500);
  ownerOf(s).wealth += gain;
  L0.fame = clamp(L0.fame + 5, 0, 100);
  if (P(s).secrets.some((x) => x.owner === 'owner' && !x.known) && r.chance(0.3)) {
    s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100);
    logLife(s, l('O livro vendeu bem, mas um capítulo reabriu feridas antigas na imprensa.', 'The book sold well, but one chapter reopened old wounds in the press.'), 'bad', true);
  } else logLife(s, fmtL(l('Memórias publicadas: "{t}". Best-seller!', 'Memoir published: "{t}". Best-seller!'), { t: `${s.config.companyName}: ${l('uma vida em discos', 'a life in records').pt}` }), 'good', true);
  return null;
}

// ---------------------------------------------------------------- mês

registerSimHook('month', 'life', (s, r) => {
  if (!P(s).owner) return;
  const o = ownerOf(s, r);
  const L0 = life(s);
  const p = ensurePlayerPerson(s, r);
  // o personagem acompanha o humor do dono
  p.stress = clamp(o.stress, 0, 100);
  p.born = o.born;
  if (o.health < 20) p.health = 'ill';
  else if (p.health === 'ill') p.health = 'ok';
  // relacionamento: sem tempo junto, a afinidade cai
  const pt = L0.partner;
  if (pt) {
    const idle = s.week - pt.lastDate;
    if (idle > 6) pt.affinity = clamp(pt.affinity - (pt.stage === 'married' ? 2 : 3) - (o.stress > 70 ? 2 : 0), 0, 100);
    if (likes(pt) === 'money' && s.player.cash < 0) pt.affinity = clamp(pt.affinity - 2, 0, 100);
    if (likes(pt) === 'fame' && L0.fame > 30) pt.affinity = clamp(pt.affinity + 1, 0, 100);
    if (pt.affinity < 25 && s.month % 3 === 0) notify(s, fmtL(l('{p} anda distante. Passe mais tempo juntos (aba Você).', '{p} has been distant. Spend more time together (You tab).'), { p: pt.name }), 'bad');
    if (pt.affinity < 8 && r.chance(0.3)) {
      const text = fmtL(l('{p} decidiu terminar.', '{p} decided to end it.'), { p: pt.name });
      notify(s, text, 'bad');
      breakUp(s);
    } else if (pt.stage === 'married') o.stress = clamp(o.stress - 1, 0, 100);
  }
  // filhos: escola e vínculo
  o.kids.forEach((k, i) => {
    const kx = (L0.kidsX[i] ??= { edu: 'public', bond: 55 });
    const age = s.year - k.born;
    if (age < 18) {
      const ed = KID_EDU[kx.edu];
      if (ed.monthly) {
        const c = money(s, ed.monthly);
        if (o.wealth >= c) { o.wealth -= c; k.aptitude = clamp(k.aptitude + ed.apt, 0, 99); } else kx.edu = 'public';
      } else k.aptitude = clamp(k.aptitude + ed.apt, 0, 99);
    }
    kx.bond = clamp(kx.bond - 0.6, 0, 100);
    if (age === 18 && s.month === 0) notify(s, fmtL(l('{k} fez 18 anos: pode ser herdeiro(a) ou lançar carreira.', '{k} turned 18: can be heir or launch a career.'), { k: k.name }), 'info');
  });
  // vida dupla: tocar numa banda e dirigir o selo cansa
  if (playerAct(s)) o.stress = clamp(o.stress + 1.5, 0, 100);
  // fama pessoal esfria
  L0.fame = clamp(L0.fame - 0.25, 0, 100);
  // pedido do par
  if (pt && pt.stage === 'married' && o.kids.length === 0 && s.year - pt.born < 42 && r.chance(0.04)) notify(s, fmtL(l('{p} quer conversar sobre ter filhos.', '{p} wants to talk about having children.'), { p: pt.name }), 'info');
});

/** Resumo do que o jogador do selo é hoje (para a aba e testes). */
export function lifeSummary(s: GameState): { energy: number; fame: number; partner: Partner | null; kids: number; act?: Act } {
  return { energy: energyLeft(s), fame: life(s).fame, partner: life(s).partner, kids: ownerOf(s).kids.length, act: playerAct(s) };
}


