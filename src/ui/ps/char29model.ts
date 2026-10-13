// Rodada 29 — "Seu personagem" na Nova run rápida (modelo puro, sem DOM): nome sorteado da cidade e da época, idade
// sugerida pela atividade e pela situação, sexo, aparência e, para quem é artista, função principal + até 2 extras
// (até 3 instrumentos no total), gênero e formação da banda. Tudo passa pelos MESMOS setters da configuração completa
// (sim/char29data.ts, setCharSex29 aqui e os campos de banda de sempre), então rápida e completa dão a mesma RunConfig.

import { Rng } from '../../core/rng';
import { GENRES, cityById, familyOf, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { bandName } from '../../sim/people';
import { defaultCharacter20 } from '../../sim/past20';
import { ROLES29_MAX, charName29, defaultAge29, roleOpen29, rolesOfSpec29, setCharAge29, setCharName29, setExtraRoles29, setMainRole29, sexOfSeed29 } from '../../sim/char29data';
import { ROLE_NAMES } from '../../sim/sys/talent/attrs';
import type { Appearance, CharacterSpec, Person, RunConfig } from '../../sim/types';
import { randomLook } from '../pixel/avatar';
import { fitLookToSex, hairAllowed15, outfitAllowed27, type Sex } from '../pixel/editor';
import type { QuickRun27 } from './home27model';
import { autoGenre29, setBandGenre29, suggestGenres29, syncGenre29 } from '../../sim/genre29data';

export interface QuickChar29 {
  name: string;
  age: number;
  sex: Sex;
  look?: Appearance;
  /** estado da tela: nome/idade ainda automáticos (seguem sexo, cidade, atividade e situação até o jogador mexer) */
  nameAuto?: boolean;
  ageAuto?: boolean;
  /** sorteios (🎲) do nome e da aparência */
  k?: number;
  lk?: number;
}
export interface QuickArt29 {
  /** função principal */
  role: string;
  /** funções extras (no máximo 2: até 3 instrumentos no total) */
  extra: string[];
  /** gênero da banda escolhido na lista (ausente = automático: sugestão da cidade e do ano) */
  genre?: string;
  /** 🎲: índice entre as sugestões da cidade e do ano (o mesmo `genre29` da configuração completa) */
  genreK?: number;
  /** formação: ausente = sorteada (1–4, o padrão de sempre); 1 = solo; 2–6 = banda */
  members?: number;
  /** nome da banda ('' = gerado) */
  bandName: string;
}

/** Atividades que têm banda própria (papel artista; o híbrido da configuração completa também). */
export const isArtist29 = (career: string): boolean => career === 'musician';

/** Gêneros abertos no ano (a mesma lista e ordem do bloco da banda da configuração completa). */
export const genresOpen29 = (year: number) => GENRES.filter((g) => g.born <= year).sort((a, b) => t(a.name).localeCompare(t(b.name)));

/** Sexo na ficha: pronome e aparência ajustados (o mesmo handler do campo Sexo da ficha completa). */
export function setCharSex29(ch: CharacterSpec, sex: Sex): void {
  ch.sex = sex;
  ch.pronoun = sex === 'm' ? 'he' : sex === 'f' ? 'she' : 'they';
  if (ch.look) ch.look = fitLookToSex(ch.look, sex);
}

/** Aparência sorteada coerente com o sexo e com a moda do ano (cabelos e roupas que já existem). */
export function lookFor29(seed: string, year: number, sex: Sex, k = 0): Appearance {
  const a = fitLookToSex(randomLook(`char29:${seed}:${k}`), sex);
  const hs = hairAllowed15(sex, year), os = outfitAllowed27(sex, year);
  const r = Rng.fromSeed(`char29look:${seed}:${k}`);
  if (hs.length && !hs.includes(a.hair)) a.hair = r.pick(hs);
  if (os.length && !os.includes(a.outfit)) a.outfit = r.pick(os);
  return a;
}

const sitOf = (q: QuickRun27): string => q.start29 ?? ({ from_zero: 'zero', emerging: 'emerging', established: 'established' } as Record<string, string>)[q.scenario] ?? 'zero';

/** Personagem inicial da tela rápida: sexo e nome sorteados pela semente, idade pela atividade e situação. */
export function charDefaults29(q: QuickRun27): QuickChar29 {
  const sex = sexOfSeed29(q.seed);
  return { name: charName29(q.seed, q.homeCity, q.startYear, sex, 0), age: defaultAge29(q.career, sitOf(q)), sex, look: lookFor29(q.seed, q.startYear, sex, 0), nameAuto: true, ageAuto: true, k: 0, lk: 0 };
}
/** Atualiza o que ainda é automático (nome, idade) depois de mudar sexo, cidade, ano, atividade ou situação. */
export function refreshChar29(q: QuickRun27): void {
  const c = q.char29;
  if (!c) return;
  if (c.nameAuto) c.name = charName29(q.seed, q.homeCity, q.startYear, c.sex, c.k ?? 0);
  if (c.ageAuto) c.age = defaultAge29(q.career, sitOf(q));
}
/** Artista inicial: a função da ficha de fábrica (guitarra), sem extras, gênero da época, formação sorteada. */
export function artDefaults29(): QuickArt29 {
  return { role: defaultCharacter20().role ?? 'guitar', extra: [], bandName: '' };
}

/** Pode marcar mais uma função? (até 3 no total, contando a principal) */
export const canAddRole29 = (a: Pick<QuickArt29, 'role' | 'extra'>): boolean => 1 + a.extra.filter((x) => x !== a.role).length < ROLES29_MAX;
/** Liga/desliga uma função extra respeitando o limite (o mesmo setter normaliza ordem, época e repetição). */
export function toggleExtra29(a: Pick<QuickArt29, 'role' | 'extra'>, role: string, year: number): void {
  if (role === a.role) return;
  if (a.extra.includes(role)) a.extra = a.extra.filter((x) => x !== role);
  else if (canAddRole29(a) && roleOpen29(role, year)) a.extra = [...a.extra, role];
  const ch = { name: '', age: 30, background: 'musician', role: a.role as Person['role'], roles27: a.extra };
  setExtraRoles29(ch, a.extra, year);
  a.extra = ch.roles27 ?? [];
}

/** Banda do jogador: gênero (só da época), formação (custom.members, o mesmo campo "Seu artista: formação") e nome. */
export function setBand29(cfg: RunConfig, b: { genre?: string; genreK?: number; members?: number; bandName?: string }): void {
  if (b.genre && genresOpen29(cfg.startYear).some((g) => g.id === b.genre)) setBandGenre29(cfg, b.genre); // r29: escolha na lista (deixa de ser automático)
  else if (b.genreK !== undefined) { cfg.genre29 = b.genreK; syncGenre29(cfg); } // 🎲 entre as sugestões
  const c = (cfg.custom ??= {});
  if (b.members === undefined) delete c.members; else c.members = Math.max(1, Math.min(6, Math.round(b.members)));
  cfg.bandName = b.members === 1 ? '' : (b.bandName ?? '').trim().slice(0, 40);
}

/** As escolhas do personagem aplicadas ao rascunho (chamado por applyQuick27). */
export function applyChar29(cfg: RunConfig, q: QuickRun27): void {
  const ch = (cfg.character ??= defaultCharacter20());
  const c = q.char29;
  if (c) {
    setCharName29(ch, c.name);
    setCharAge29(ch, c.age);
    setCharSex29(ch, c.sex);
    if (c.look) ch.look = fitLookToSex(c.look, c.sex);
  }
  const a = q.art29;
  if (a && cfg.role !== 'label') {
    setMainRole29(ch, a.role, cfg.startYear);
    setExtraRoles29(ch, a.extra, cfg.startYear);
    setBand29(cfg, a);
  }
}

/** Nome de banda sorteado (o mesmo gerador do mundo, people.ts bandName). */
export function bandName29(seed: string, city: string, genre: string, members: number, k: number): string {
  const r = Rng.fromSeed(`band29:${seed}:${k}`);
  return bandName(r, cityById[city]?.lang ?? 'en', familyOf(genre), Math.max(2, members));
}

/** Nomes das funções (pt/en). */
export const roleName29 = (r: string): L => (ROLE_NAMES as Record<string, L>)[r] ?? l(r, r);

/** "Ana Souza, 22 · Vocal · Guitarra" (linha de status e revisão). */
export function charLine29(ch: Pick<CharacterSpec, 'name' | 'age' | 'role' | 'roles27'> | undefined, artist: boolean): L {
  if (!ch) return l('', '');
  const nm = ch.name.trim();
  const who: L = nm ? l(`${nm}, ${ch.age}`, `${nm}, ${ch.age}`) : l(`(nome gerado), ${ch.age}`, `(generated name), ${ch.age}`);
  if (!artist) return who;
  const rs = rolesOfSpec29(ch).map(roleName29);
  return { pt: [who.pt, ...rs.map((x) => x.pt)].join(' · '), en: [who.en, ...rs.map((x) => x.en)].join(' · ') };
}

/** Gênero que a banda terá com as escolhas da tela rápida (escolhido, ou a sugestão do 🎲 para a cidade e o ano). */
export function artGenre29(q: Pick<QuickRun27, 'homeCity' | 'startYear'>, a: Pick<QuickArt29, 'genre' | 'genreK'>): string | undefined {
  const ok = a.genre && genresOpen29(q.startYear).some((g) => g.id === a.genre);
  return ok ? a.genre : autoGenre29({ homeCity: q.homeCity, startYear: q.startYear, genre29: a.genreK ?? 0 });
}
/** 🎲 da tela rápida: próxima sugestão (como rollGenre29 da configuração completa). */
export function rollArtGenre29(q: Pick<QuickRun27, 'homeCity' | 'startYear'>, a: QuickArt29): void {
  const xs = suggestGenres29(q.homeCity, q.startYear);
  const cur = a.genre === undefined ? a.genreK ?? 0 : Math.max(-1, xs.indexOf(a.genre));
  a.genre = undefined;
  a.genreK = xs.length ? (cur + 1) % xs.length : 0;
}
