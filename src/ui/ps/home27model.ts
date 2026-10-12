// Rodada 27 — modelo puro da tela inicial e da Nova run rápida (sem DOM).
// A Nova run rápida escolhe só o essencial (empresa, ano, cidade, atividade, ponto de partida, dificuldade) e produz
// EXATAMENTE a mesma RunConfig que a configuração completa produziria com as mesmas escolhas: parte da mesma fábrica
// (newRunConfig20), recebe os mesmos padrões que os cartões da configuração completa aplicam ao serem desenhados
// (draftDefaults27) e passa pelo mesmo preparo antes do createGame (buildRun27).

import { GENRES, l, type L } from '../../data/world';
import { t } from '../../i18n/strings';
import { defaultCharacter20 } from '../../sim/past20';
import { newRunConfig20, worldOf17 } from '../../sim/start17';
import { careerDef, roleFromMain } from '../../sim/sys/careers12';
import { scenarioById } from '../../sim/sys/live';
import type { RunConfig } from '../../sim/types';
import { YEAR_MAX20, YEAR_MIN20 } from '../../sim/worldpolicy20';
import { materializeLabels22 } from '../newgameLabels';

/** Atividades oferecidas na Nova run (mesma lista e ordem da configuração completa, careers12 NG_CAREERS). */
export const CAREERS27 = ['label', 'musician', 'manager', 'studio', 'festival', 'booking', 'venue', 'publisher', 'media', 'platform'] as const;
/** Rótulos curtos dos cartões (o nome longo fica no title). */
export const CAREER_SHORT27: Record<string, L> = {
  label: l('Gravadora', 'Record label'), musician: l('Artista / banda', 'Artist / band'), manager: l('Empresário', 'Manager'),
  studio: l('Estúdio / produtor', 'Studio / producer'), festival: l('Festival', 'Festival'), booking: l('Agenciamento de shows', 'Booking agency'),
  venue: l('Casa de shows', 'Venue'), publisher: l('Editora musical', 'Music publisher'), media: l('Mídia', 'Media'), platform: l('Plataforma', 'Platform'),
};
export const STARTS27: { id: RunConfig['scenario']; name: L }[] = [
  { id: 'from_zero', name: l('Do zero', 'From zero') },
  { id: 'emerging', name: l('Selo emergente', 'Emerging label') },
  { id: 'established', name: l('Empresa estabelecida', 'Established company') },
];
export const DIFFS27: { id: RunConfig['difficulty']; name: L }[] = [
  { id: 'easy', name: l('Tranquila', 'Relaxed') }, { id: 'normal', name: l('Equilibrada', 'Balanced') }, { id: 'hard', name: l('Difícil', 'Hard') },
];

export interface QuickRun27 {
  seed: string;
  companyName: string;
  startYear: number;
  homeCity: string;
  /** Atividade principal (uma; a configuração completa permite combinar várias). */
  career: string;
  scenario: RunConfig['scenario'];
  difficulty: RunConfig['difficulty'];
}

/** A atividade existe no ano? (carreiras de época, ex.: plataforma, só abrem no ano certo). */
export const careerOpen27 = (id: string, year: number): boolean => { const d = careerDef(id); return !!d && d.from <= year; };
export const clampYear27 = (y: number): number => Math.max(YEAR_MIN20, Math.min(YEAR_MAX20, Math.round(Number.isFinite(y) ? y : 1962)));

/** Padrões que os cartões da configuração completa aplicam ao rascunho só por serem desenhados (charCreate, careers12,
 *  newgameLabels, diffCard17, customCard, worldCard17 e o bloco da banda). Idempotente. */
export function draftDefaults27(cfg: RunConfig): RunConfig {
  cfg.custom ??= {};
  cfg.diff17 ??= {};
  cfg.labels ??= {};
  const ch = (cfg.character ??= defaultCharacter20());
  ch.traits ??= [];
  ch.points ??= {};
  ch.sex ??= 'x';
  const c = (cfg.careers ??= { main: ['label'], origin: 'none', ambition: 'legacy' });
  cfg.role = roleFromMain(c.main);
  if (!cfg.world17) cfg.world17 = worldOf17(cfg);
  const genres = GENRES.filter((g) => g.born <= cfg.startYear).sort((a, b) => t(a.name).localeCompare(t(b.name)));
  if (!genres.find((g) => g.id === cfg.bandGenre)) cfg.bandGenre = genres[0]?.id;
  return cfg;
}

/** Valores iniciais da tela rápida (os da fábrica). */
export function quickDefaults27(seed: string, companyName: string): QuickRun27 {
  const c = newRunConfig20({ seed, companyName });
  return { seed, companyName, startYear: c.startYear, homeCity: c.homeCity, career: 'label', scenario: c.scenario, difficulty: c.difficulty };
}

/** As escolhas rápidas aplicadas a um rascunho, do mesmo jeito que os controles da configuração completa as aplicam. */
export function applyQuick27(cfg: RunConfig, q: QuickRun27): RunConfig {
  cfg.seed = q.seed;
  cfg.companyName = q.companyName.trim() || 'Selo';
  cfg.startYear = clampYear27(q.startYear);
  cfg.homeCity = q.homeCity;
  cfg.scenario = q.scenario;
  cfg.difficulty = q.difficulty;
  const main = [careerOpen27(q.career, cfg.startYear) ? q.career : 'label'];
  cfg.careers = { ...(cfg.careers ?? { origin: 'none', ambition: 'legacy' }), main };
  cfg.role = roleFromMain(main);
  return draftDefaults27(cfg);
}

/** Rascunho completo da Nova run rápida (é o mesmo objeto que "Configuração completa" recebe pré-preenchido). */
export function quickRunConfig27(q: QuickRun27): RunConfig {
  return applyQuick27(draftDefaults27(newRunConfig20({ seed: q.seed, companyName: q.companyName })), q);
}

/** Preparo comum antes do createGame (configuração completa e rápida): cópia do rascunho, semente aparada,
 *  cenário aplicado e a sugestão de gravadoras materializada na lista da partida. */
export function buildRun27(cfg: RunConfig): RunConfig {
  const run = JSON.parse(JSON.stringify(cfg)) as RunConfig;
  run.seed = run.seed.trim();
  const sc = run.scenario17 ? scenarioById[run.scenario17] : undefined;
  if (sc) Object.assign(run, { startYear: sc.startYear, homeCity: sc.homeCity, scenario: sc.scenario, ...(sc.role ? { role: sc.role } : {}) });
  materializeLabels22(run);
  return run;
}
