// Rodada 20 (G8 — nova run): política VERSIONADA do mundo. O modo `random` ("Reais em mundo aleatório") é o padrão das
// novas configurações e, na versão 2, simula também o ESTADO INICIAL: artistas/gravadoras reais mantêm identidade
// (nome, origem, nascimento, época de estreia, talento), mas repertório anterior, formações passadas, mortes e fins
// documentados, voltas, renomes, empresários históricos e casos reais anteriores ao início NÃO são restaurados.
// Regra de compatibilidade: só `initialWorldPolicy === 'simulated'` liga a política nova — ausência (saves, códigos e
// configurações antigas, inclusive `world17: 'random'` legado) mantém a geração antiga. Puro (sem DOM, sem RNG).

import type { GameState, RunConfig } from './types';

export const CONFIG_SCHEMA_V20 = 2;
export const WORLD_POLICY_V20 = 2;
/** Faixa de anos de início aceita (campo, código e mensagem usam a mesma constante). */
export const YEAR_MIN20 = 1889;
export const YEAR_MAX20 = 2039;

export type InitialPolicy20 = 'historical' | 'simulated';
export type CareerPolicy20 = 'documented' | 'simulated';
export type DebutPolicy20 = 'real_documented' | 'real_era_eligible' | 'generated_only' | 'chaotic';
export type IdentityPolicy20 = 'real_catalog' | 'fictional';
export interface Policy20 { initial: InitialPolicy20; career: CareerPolicy20; debut: DebutPolicy20; identity: IdentityPolicy20 }

/** Contrato de cada um dos seis modos (as seis dimensões da spec §8.1, menos tecnologia e autonomia, que já são campos). */
export const POLICY20: Record<string, Policy20> = {
  random: { initial: 'simulated', career: 'simulated', debut: 'real_era_eligible', identity: 'real_catalog' },
  exact: { initial: 'historical', career: 'documented', debut: 'real_documented', identity: 'real_catalog' },
  real: { initial: 'historical', career: 'simulated', debut: 'real_era_eligible', identity: 'real_catalog' },
  snap: { initial: 'historical', career: 'simulated', debut: 'generated_only', identity: 'real_catalog' },
  fiction: { initial: 'historical', career: 'simulated', debut: 'real_era_eligible', identity: 'fictional' },
  chaos: { initial: 'historical', career: 'simulated', debut: 'chaotic', identity: 'real_catalog' },
};

/** Grava a política (e as versões) de um modo na configuração. */
export function stampPolicy20(c: RunConfig, worldId: string): void {
  const p = POLICY20[worldId] ?? POLICY20.real;
  c.configSchemaVersion = CONFIG_SCHEMA_V20;
  c.worldPolicyVersion = WORLD_POLICY_V20;
  c.initialWorldPolicy = p.initial;
  c.futureCareerPolicy = p.career;
  c.futureDebutPolicy = p.debut;
  c.identityPolicy = p.identity;
}

/** A configuração pede estado inicial simulado (só com versão nova e campo explícito; nunca por inferência). */
export const simulatedStartCfg20 = (c: RunConfig): boolean => c.initialWorldPolicy === 'simulated' && (c.worldPolicyVersion ?? 1) >= 2 && c.history !== 'strict';
/** A partida começou com estado inicial simulado (pré-história real não é restaurada). */
export const simStart20 = (s: GameState): boolean => simulatedStartCfg20(s.config);

/** Configuração anterior à política versionada (save/código antigo): mantém a geração legada. */
export const legacyConfig20 = (c: RunConfig): boolean => !c.worldPolicyVersion;

/** Número em [0,1) fixo para (semente, chave): sorteios da pré-história simulada sem consumir o RNG do jogo. */
export function roll20(s: GameState, key: string): number {
  let h = 2166136261;
  const str = `${s.config.seed}|w20|${key}`;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

/** Ano de morte plausível por idade (pré-história simulada): `undefined` = vivo no ano `year`. Nunca antes de `minYear`. */
export function simDeath20(s: GameState, key: string, born: number | undefined, year: number, minYear: number): number | undefined {
  if (born === undefined) return undefined;
  const life = 62 + Math.floor(roll20(s, `life:${key}`) * 34); // 62..95 anos
  const d = Math.max(minYear, born + life);
  return d <= year ? d : undefined;
}

/** Duração plausível de carreira (anos) para a pré-história simulada. */
export const simCareer20 = (s: GameState, key: string): number => 6 + Math.floor(roll20(s, `career:${key}`) * 34);
