// Rodada 19 (Frente 0.6) — FACHADA ÚNICA DE FANDOM. Três modelos de fã conviviam: `fandom.ts` (superfãs, haters,
// toxicidade, nome e ritual), `sys/fan15.ts` (pedidos, promessas, guerra de fandoms) e `sys/fans18.ts` (motivações,
// lealdade, mobilização, cansaço, facções). Daqui em diante todo sistema novo lê e escreve fãs por aqui.
//
// Fonte única de cada número (as outras leituras viram aliases desta tabela):
//   contagem (casual/ativo/núcleo) .... `act.fans`                → fanCount19 / fanTotal19 / scaleFans19
//   por região (mercado) ............... derivado de fame16.fameIn × tamanho do mercado (sem estado)
//   superfãs, haters, toxicidade, nome . `s.fandoms` (fandom.ts)   → fandomView19
//   lealdade, mobilização, cansaço ..... fans18 (`fan18`)          → loyalty19 / mobilization19
//   motivações e facções ............... fans18 (`MOT18`, `factions18`)
//   pedidos/promessas/guerra ........... fan15 (log)               → fanEvents19
// Leitura NUNCA cria estado (`fan18(..., false)` e `s.fandoms[id]` sem `??=`): ler pela fachada não muda o jogo.
// Fatos-índice (emitIndexFact; ler com indexFacts): `fan_wave` (onda de fãs) e `fan_drop` (debandada), de sys/facades19.ts.

import { COUNTRY_INFO, countryMarketSize } from '../data/countries';
import { MARKETS, type L, type MarketId } from '../data/world';
import { fanTotal, fandomOf, scaleFans } from './fandom';
import { indexFacts, recentFacts, type Fact } from './facts17';
import { fn15 } from './sys/fan15';
import { fameIn } from './sys/fame16';
import { FAC18, MOT18, fan18, factions18, fans18, setTeam18, type Fac18, type Mot18 } from './sys/fans18';
import type { Act, GameState } from './types';

// ---------------------------------------------------------------- aliases (API antiga continua valendo)
export { callOutToxic, fanMeetup, fandomOf, moderateCommunity, playerFandomSummary, ritualFor, superfanDebut } from './fandom';
export { fn15, vaultSong } from './sys/fan15';
export { FAC18, FAC_NAME18, MOT18, MOT_NAME18, TEAM_FROM18, fan18, factions18, fans18, pp18, relLoad18, setSupplier18, setTeam18, teamCost18, ticketShock18 } from './sys/fans18';

// ---------------------------------------------------------------- contagem
/** Total de fãs (casual + ativo + núcleo): fonte única `act.fans`. */
export const fanTotal19 = (a: Act): number => fanTotal(a);
/** Escala os círculos de fãs em `pct`% (núcleo mexe a metade) — usado por decide18 (Fx18.fans). */
export const scaleFans19 = (a: Act, pct: number): void => scaleFans(a, pct);
export function fanCount19(s: GameState, actId: string): { casual: number; active: number; core: number; total: number } {
  const a = s.acts[actId];
  if (!a) return { casual: 0, active: 0, core: 0, total: 0 };
  return { ...a.fans, total: fanTotal(a) };
}

/** Fãs por região (mercado), estimados pela fama local (fame16) × tamanho do mercado. Soma = total. Sem estado. */
export function fansByRegion19(s: GameState, actId: string): Record<MarketId, number> {
  const out = Object.fromEntries(MARKETS.map((m) => [m.id, 0])) as Record<MarketId, number>;
  const a = s.acts[actId];
  if (!a) return out;
  const w = { ...out };
  let tot = 0;
  for (const c of COUNTRY_INFO) {
    const f = fameIn(s, a, c.a3);
    if (f <= 0) continue;
    const v = f * f * countryMarketSize(c, s.year);
    w[c.market] += v; tot += v;
  }
  const n = fanTotal(a);
  if (!tot) return out;
  for (const m of MARKETS) out[m.id] = Math.round((n * w[m.id]) / tot);
  return out;
}

// ---------------------------------------------------------------- lealdade, motivação, mobilização (fans18)
/** Lealdade 0–100 (fans18; para atos de fora é calculada sem guardar). */
export const loyalty19 = (s: GameState, actId: string): number => fan18(s, actId, false)?.loy ?? 0;
/** Mobilização 0–90 (fã-clube, equipe de rua). */
export const mobilization19 = (s: GameState, actId: string): number => fan18(s, actId, false)?.mob ?? 0;
/** Cansaço da base (lançamentos demais). */
export const fatigue19 = (s: GameState, actId: string): number => fan18(s, actId, false)?.fat ?? 0;
/** Motivações (somam 1): novidade, letra, dança, virtuose, identidade, cena. */
export function motivation19(s: GameState, actId: string): Record<Mot18, number> {
  const f = fan18(s, actId, false);
  return Object.fromEntries(MOT18.map((k, i) => [k, f?.m[i] ?? 0])) as Record<Mot18, number>;
}
/** Estado guardado de fans18 (só atos do jogador que já foram lidos); não cria. */
export const fanState19 = (s: GameState, actId: string) => fans18(s).a[actId];

export interface FanView19 {
  actId: string; casual: number; active: number; core: number; total: number;
  superfans: number; haters: number; toxicity: number; name?: string; ritual?: L;
  loyalty: number; mobilization: number; fatigue: number; motivation: Record<Mot18, number>; top: Mot18;
  factions?: Record<Fac18, number>; team: boolean;
}
/** Retrato completo do fandom de um ato, num só objeto (para interface e sistemas novos). */
export function fandomView19(s: GameState, actId: string): FanView19 | undefined {
  const a = s.acts[actId];
  if (!a) return undefined;
  const fd = s.fandoms[actId];
  const f = fan18(s, actId, false);
  const motivation = motivation19(s, actId);
  const top = MOT18.reduce((b, k) => (motivation[k] > motivation[b] ? k : b), MOT18[0]);
  return {
    actId, ...a.fans, total: fanTotal(a),
    superfans: fd?.superfans ?? 0, haters: fd?.haters ?? 0, toxicity: fd?.toxicity ?? 0, name: fd?.name, ritual: fd?.ritual,
    loyalty: f?.loy ?? 0, mobilization: f?.mob ?? 0, fatigue: f?.fat ?? 0, motivation, top,
    factions: f ? factions18(s, a, f) : undefined, team: f?.team !== undefined,
  };
}

// ---------------------------------------------------------------- eventos de fã e mobilização
export const FAN_FACTS19 = ['fan_wave', 'fan_drop', 'fan_war', 'street_team'] as const;
export interface FanEvent19 { y: number; m: number; t: L; src: 'fans18' | 'fan15' | 'fact' }
/** Linha do tempo única de fandom: diário de fans18 + fan15 + fatos de fã (onda, debandada, guerra, equipe de rua). */
export function fanEvents19(s: GameState, actId?: string, n = 12): FanEvent19[] {
  const name = actId ? s.acts[actId]?.name : undefined;
  const hit = (t: L) => !name || t.pt.includes(name) || t.en.includes(name);
  const q = { kinds: [...FAN_FACTS19], months: 36, ...(actId ? { actor: actId } : {}) };
  const out: FanEvent19[] = [
    ...fans18(s).log.filter((x) => hit(x[2])).map(([y, m, t]) => ({ y, m, t, src: 'fans18' as const })),
    ...fn15(s).log.filter((x) => hit(x[2])).map(([y, m, t]) => ({ y, m, t, src: 'fan15' as const })),
    ...[...recentFacts(s, q), ...indexFacts(s, q)].map((f: Fact) => ({ y: f.y, m: f.m, t: f.text, src: 'fact' as const })),
  ];
  const seen = new Set<string>();
  return out.sort((a, b) => b.y - a.y || b.m - a.m).filter((e) => !seen.has(e.t.pt) && !!seen.add(e.t.pt)).slice(0, n);
}

/** Mobiliza (ou desmobiliza) a base: liga a equipe de rua de fans18. Devolve erro (L) ou null. */
export const mobilize19 = (s: GameState, actId: string, on: boolean): L | null => setTeam18(s, actId, on);
/** Superfãs (cria o registro de fandom, como a API antiga): para ESCREVER; para ler use fandomView19. */
export const fandomRec19 = (s: GameState, actId: string) => fandomOf(s, actId);
export { FAC18 as FACTIONS19, MOT18 as MOTIVES19 };
