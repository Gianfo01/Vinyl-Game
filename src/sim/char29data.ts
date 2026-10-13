// Rodada 29 — o personagem na Nova run (rápida e completa usam ESTES setters, então as duas produzem o mesmo
// cfg.character): idade (mesma faixa que o motor aceita, life.ts applyCharacter), nome, função principal e funções extras
// do artista (Person.role + Person.roles27), com as funções abertas por época (sem DJ/MC/produtor antes de existirem).
// Puro (sem DOM, sem ganchos do motor): testável.

import { Rng, hashString } from '../core/rng';
import { FIRST_NAMES, LAST_NAMES } from '../data/people';
import { GENRES, cityById, familyOf, type FamilyId, type NameGroup } from '../data/world';
import type { CharacterSpec, Person } from './types';

export type Role29 = Exclude<Person['role'], 'synthetic'>;

/** Funções que o personagem pode ter (mesma lista da ficha completa, charCreate identityCard22). */
export const ROLES29: Role29[] = ['vocal', 'guitar', 'bass', 'drums', 'keys', 'horns', 'strings', 'dj', 'producer', 'mc'];

const firstBorn = (fam: FamilyId): number => Math.min(...GENRES.filter((g) => familyOf(g.id) === fam).map((g) => g.born));
/** Ano em que a função passa a existir numa banda (ausente = sempre): DJ com os toca-discos como instrumento
 *  (instruments.ts, 1975), MC com o primeiro gênero de hip hop e o produtor-integrante com a primeira eletrônica. */
export const ROLE_FROM29: Partial<Record<Role29, number>> = { dj: 1975, mc: firstBorn('hiphop'), producer: firstBorn('electronic') };
export const roleOpen29 = (r: string, year: number): boolean => ROLES29.includes(r as Role29) && (ROLE_FROM29[r as Role29] ?? 0) <= year;
export const rolesOpen29 = (year: number): Role29[] => ROLES29.filter((r) => roleOpen29(r, year));
/** A função canta (vocal ou MC)? */
export const singsRole29 = (r: string): boolean => r === 'vocal' || r === 'mc';

/** Faixa de idade do personagem (a mesma que o motor aplica ao nascer o dono). */
export const AGE29_MIN = 18;
export const AGE29_MAX = 70;
/** Mesma regra do campo Idade da ficha completa (vazio/inválido = 30). */
export const clampAge29 = (v: number): number => Math.max(AGE29_MIN, Math.min(AGE29_MAX, Math.round(Number(v) || 30)));

/** Até 3 funções/instrumentos no total: a principal e no máximo duas extras ("Vocal · Guitarra · Teclados"). */
export const ROLES29_MAX = 3;
export const EXTRA29_MAX = ROLES29_MAX - 1;

// ---------------------------------------------------------------- setters (rápida e completa)

export function setCharName29(ch: CharacterSpec, name: string): void { ch.name = String(name ?? '').slice(0, 40); }
export function setCharAge29(ch: CharacterSpec, age: number): void { ch.age = clampAge29(age); }

/** Função principal; aberta no ano (fechada cai em Vocal). Sai da lista de extras. */
export function setMainRole29(ch: CharacterSpec, role: string, year: number): void {
  ch.role = (roleOpen29(role, year) ? role : 'vocal') as Person['role'];
  if (ch.roles27) setExtraRoles29(ch, ch.roles27, year);
}

/** Funções extras: sem repetir, sem a principal, abertas no ano, na ordem canônica e no máximo EXTRA29_MAX.
 *  Lista vazia apaga o campo (o rascunho fica igual ao de quem nunca mexeu). */
export function setExtraRoles29(ch: CharacterSpec, extras: readonly string[], year: number): void {
  const xs = ROLES29.filter((r) => extras.includes(r) && r !== ch.role && roleOpen29(r, year)).slice(0, EXTRA29_MAX);
  if (xs.length) ch.roles27 = xs; else delete ch.roles27;
}

/** Todas as funções do personagem (principal primeiro). */
export const rolesOfSpec29 = (ch: Pick<CharacterSpec, 'role' | 'roles27'> | undefined): string[] => (ch ? [ch.role ?? 'guitar', ...(ch.roles27 ?? [])] : []);

// ---------------------------------------------------------------- idade sugerida

/** Idade típica de quem começa em cada atividade (ponto de partida "do zero"). */
const AGE_BASE29: Record<string, number> = { musician: 21, label: 30, manager: 28, studio: 29, festival: 33, booking: 28, venue: 35, publisher: 36, media: 34, platform: 30 };
/** Anos a mais por situação inicial (mais estabelecido = mais estrada). */
const AGE_SIT29: Record<string, number> = { zero: 0, emerging: 2, hipster: 1, mid: 5, established: 9, top5: 13, fallen: 16, leader: 17 };
export function defaultAge29(career: string, sit: string): number {
  return clampAge29((AGE_BASE29[career] ?? 30) + (AGE_SIT29[sit] ?? 0));
}

// ---------------------------------------------------------------- nome sorteado

/** Nome da cidade e da época: o idioma vem da cidade (às vezes cosmopolita, como langForCity); as listas de nomes
 *  alternam masculino/feminino e vão dos mais antigos aos mais novos, então o ano puxa a janela e o sexo, a paridade. */
export function charName29(seed: string, city: string, year: number, sex: 'm' | 'f' | 'x', k = 0): string {
  const r = Rng.fromSeed(`char29:${seed}:${city}:${sex}:${k}`);
  const c = cityById[city];
  const lang: NameGroup = !c ? 'en' : r.chance(0.12) ? r.pick(['en', 'es', 'pt', 'fr'] as NameGroup[]) : c.lang;
  const first = FIRST_NAMES[lang] ?? FIRST_NAMES.en;
  const last = LAST_NAMES[lang] ?? LAST_NAMES.en;
  const n = first.length;
  const f = Math.max(0, Math.min(1, (year - 1900) / 130));
  const lo = Math.floor(Math.max(0, f - 0.35) * n), hi = Math.max(lo + 2, Math.ceil(Math.min(1, f + 0.35) * n));
  const idx: number[] = [];
  for (let i = lo; i < Math.min(n, hi); i++) if (sex === 'x' || (i % 2 === 0) === (sex === 'm')) idx.push(i);
  const fi = idx.length ? r.pick(idx) : r.int(0, n - 1);
  return `${first[fi]} ${r.pick(last)}`;
}

/** Sexo sugerido pela semente (o rascunho de fábrica é "outro"; a Nova run rápida sugere um nome com sexo). */
export const sexOfSeed29 = (seed: string): 'm' | 'f' => (hashString(`sex29:${seed}`) % 2 ? 'f' : 'm');
