// Rodada 27 — modelo puro da tela inicial e da Nova run rápida (sem DOM).
// A Nova run rápida escolhe só o essencial (empresa, ano, cidade, atividade, ponto de partida, dificuldade) e produz
// EXATAMENTE a mesma RunConfig que a configuração completa produziria com as mesmas escolhas: parte da mesma fábrica
// (newRunConfig20), recebe os mesmos padrões que os cartões da configuração completa aplicam ao serem desenhados
// (draftDefaults27) e passa pelo mesmo preparo antes do createGame (buildRun27).

import { l, type L } from '../../data/world';
import { defaultCharacter20 } from '../../sim/past20';
import { newRunConfig20, worldOf17 } from '../../sim/start17';
import { careerDef, roleFromMain } from '../../sim/sys/careers12';
import { scenarioById } from '../../sim/sys/live';
import type { RunConfig } from '../../sim/types';
import { YEAR_MAX20, YEAR_MIN20 } from '../../sim/worldpolicy20';
import { materializeLabels22 } from '../newgameLabels';
import { REC_YEARS28, pickStart28, yearsFor28 } from '../../sim/start28data';
import { SITS29, setStart29, start28Fits29, syncStart29, type Sit29 } from '../../sim/start29data';
import { setRivals29, type Riv29 } from '../../sim/rivals29data';
import { setLabels29, type N29, type Vn29 } from '../../sim/labels29data';
import { LINEUP29_DEFAULT } from '../../sim/lineup29';
import { syncGenre29 } from '../../sim/genre29data';
import { applyChar29, type QuickArt29, type QuickChar29 } from './char29model'; // r29: "Seu personagem"

/** Atividades oferecidas na Nova run (mesma lista e ordem da configuração completa, careers12 NG_CAREERS). */
export const CAREERS27 = ['label', 'musician', 'manager', 'studio', 'festival', 'booking', 'venue', 'publisher', 'media', 'platform'] as const;
/** Rótulos curtos dos cartões (o nome longo fica no title). */
export const CAREER_SHORT27: Record<string, L> = {
  label: l('Gravadora', 'Record label'), musician: l('Artista / banda', 'Artist / band'), manager: l('Empresário', 'Manager'),
  studio: l('Estúdio / produtor', 'Studio / producer'), festival: l('Festival', 'Festival'), booking: l('Agenciamento de shows', 'Booking agency'),
  venue: l('Casa de shows', 'Venue'), publisher: l('Editora musical', 'Music publisher'), media: l('Mídia', 'Media'), platform: l('Plataforma', 'Platform'),
};
/** Pontos de partida (r29: a escada de situações; o nome mostrado segue a carreira — statusLabel29). */
export const STARTS27: { id: Sit29; name: L }[] = SITS29.map((x) => ({ id: x.id, name: x.name }));
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
  /** r29: situação inicial escolhida (ausente = a equivalente ao `scenario`) */
  start29?: Sit29;
  /** r29: nível dos rivais (ausente ou "mix" = mistura realista, o mundo de sempre) */
  rivals29?: Riv29;
  /** r29: gravadoras no início (atalho; ausente = padrão) e concorrentes da carreira no início */
  labels29n?: N29;
  labels29vn?: Vn29;
  /** r28 (F4): duração escolhida pelo ano de fim (0 = sem fim / sandbox); ausente = sugestão do Recomendado */
  runYears?: number;
  /** r29: personagem (nome, idade, sexo, aparência); ausente = o da fábrica (nome gerado no jogo, 30 anos) */
  char29?: QuickChar29;
  /** r29: artista (função principal + até 2 extras, gênero, formação, nome da banda); só vale com banda própria */
  art29?: QuickArt29;
}

/** A atividade existe no ano? (carreiras de época, ex.: plataforma, só abrem no ano certo). */
export const careerOpen27 = (id: string, year: number): boolean => { const d = careerDef(id); return !!d && d.from <= year; };
/** r28 (F4): ano de fim → anos de partida (0 = sem fim). */
export const runYearsFor28 = (start: number, end: number | null): number => yearsFor28(start, end);
export const clampYear27 = (y: number): number => Math.max(YEAR_MIN20, Math.min(YEAR_MAX20, Math.round(Number.isFinite(y) ? y : 1962)));

/** Padrões que os cartões da configuração completa aplicam ao rascunho só por serem desenhados (charCreate, careers12,
 *  newgameLabels, diffCard17, customCard, worldCard17 e o bloco da banda). Idempotente. */
export function draftDefaults27(cfg: RunConfig): RunConfig {
  cfg.custom ??= {};
  cfg.diff17 ??= {};
  cfg.labels ??= {};
  if (cfg.runYears17 === undefined) cfg.runYears17 = REC_YEARS28; // r28 (F4): o Recomendado sugere um fim (editável)
  const ch = (cfg.character ??= defaultCharacter20());
  ch.traits ??= [];
  ch.points ??= {};
  ch.sex ??= 'x';
  const c = (cfg.careers ??= { main: ['label'], origin: 'none', ambition: 'legacy' });
  cfg.role = roleFromMain(c.main);
  if (!cfg.world17) cfg.world17 = worldOf17(cfg);
  cfg.lineup29 ??= LINEUP29_DEFAULT; // R29 (formação): cartão do mundo — formação inicial das bandas reais (só vale com nomes reais fora do exato)
  syncGenre29(cfg); // r29: gênero sugerido pela cidade e pelo ano enquanto automático; escolhido fica (se já existir no ano)
  syncStart29(cfg); // r29: o cartão "Ponto de partida" mostra a situação coerente com o scenario
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
  if (q.start29) setStart29(cfg, q.start29); // r29: mesmo handler do cartão "Ponto de partida" da configuração completa
  if (q.rivals29) setRivals29(cfg, q.rivals29); // r29: mesmo handler do cartão "Nível dos rivais" da configuração completa
  if (q.labels29n || q.labels29vn) setLabels29(cfg, { n: q.labels29n, vn: q.labels29vn }); // r29: mesmo setter do cartão "Gravadoras no início"
  cfg.difficulty = q.difficulty;
  cfg.lineup29 = LINEUP29_DEFAULT; // R29 (formação): a Nova run rápida começa sempre com a formação mais famosa
  if (q.runYears !== undefined) cfg.runYears17 = q.runYears; // r28 (F4)
  const main = [careerOpen27(q.career, cfg.startYear) ? q.career : 'label'];
  cfg.careers = { ...(cfg.careers ?? { origin: 'none', ambition: 'legacy' }), main };
  cfg.role = roleFromMain(main);
  applyChar29(cfg, q); // r29: mesmos setters da ficha completa (charCreate) e do bloco da banda
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
  if (run.scenario17) { delete run.start29; delete run.rivals29; delete run.labels29; } else if (run.start29) syncStart29(run); // r29: cenário histórico tem o próprio começo (e os próprios rivais)
  delete run.genre29; // r29: a marca de "gênero automático" é só do rascunho
  materializeLabels22(run);
  if (!run.scenario17 && !run.start28) { const st = pickStart28(run.seed).id; if (start28Fits29(st, run.start29)) run.start28 = st; } // r28 (F4): começo sorteado pela semente; r29: pulado se contradiz a situação
  return run;
}
