// Rodada 19 (Frente 0.6) — FACHADA ÚNICA DE PRÊMIOS. Quatro módulos davam prêmio: `awards2.ts` (crítica, regionais,
// indústria), `sys/awards15.ts` (júri local, esnobadas, boicote) com `sys/charts7.ts` (prêmios nacionais), `sys/awards18.ts`
// (campanhas, corpo de votantes, regras) com `sys/ceremonies8.ts` (Gramófonos: indicação, campanha, cerimônia) e
// `sys/rockhall9.ts` (Hall da Fama). A cerimônia do envelope (cine18) e a cena do discurso (scenes/awards) leem daqui.
//
// Fonte única de cada número:
//   vencedores ........... `s.awards` (livro único; escrito só por `recordAward` em util) → winners19 / recordAward19
//                          + nacionais de NPC em charts7 (`ch7.awards`, os do jogador já estão no livro) + Hall (`hall().inducted`)
//   cerimônias/calendário  ceremonies8 (Gramófonos), rockhall9 (Hall), awards2 (regionais), charts7 (nacionais) → ceremonies19
//   indicados ............ ceremonies8 `cer8().noms` (Gramófonos), rockhall9 `hall().noms` (Hall) → nominations19
//   júri ................. corpo de votantes (awards18.voters18), sorte do júri local (awards15.juryRng) → jury19
//   memória do júri ...... simpatia pós-esnobada (awards15.juryMemHook ← links16/bridge17/sex17), compensação (aw18.makeup)
//                          e fadiga de voto (vitórias em 3 anos no livro) → juryMemory19 (lê as três; não guarda nada)
//   póstumo .............. ato sem nenhum membro vivo no ano do prêmio → isPosthumous19 / posthumousWins19
// Fatos-índice (emitIndexFact; ler com indexFacts): `award_win` (entrada nova no livro) e `award_posthumous`, emitidos por sys/facades19.ts.

import { l, type L } from '../data/world';
import { REGIONAL_AWARDS } from './awards2';
import { juryMemHook, juryRng } from './sys/awards15';
import { aw18, voters18 } from './sys/awards18';
import { CEREMONY_MONTH, GRAMO_CATS, NOMS_MONTH, cer8, type GramoCat } from './sys/ceremonies8';
import { ch7 } from './sys/charts7';
import type { Aw18 } from './sys/cine18';
import { HALL_CEREMONY_MONTH, HALL_FIRST_CLASS, HALL_NOMS_MONTH, hall, hallExists, hallName } from './sys/rockhall9';
import type { GameState } from './types';
import { recordAward } from './util';

// ---------------------------------------------------------------- aliases (API antiga continua valendo)
export { REGIONAL_AWARDS, setRegionalAwards, yearlyAwards2 } from './awards2';
export { aw15, boycotting, homeOf, juryMemHook, juryRng, snub15 } from './sys/awards15';
export { CAMP18, RULES18, aw18, bundle18, campaign18, relAdj18, rulesNow18, voters18 } from './sys/awards18';
export { CAMPAIGN_COST, CEREMONY_MONTH, GRAMO_CATS, NOMS_MONTH, campaignBonus, cer8, eligible, gramoScore, nominees, runCampaign, answerPerform as answerGramoPerform19 } from './sys/ceremonies8';
export { HALL_CATS, HALL_CEREMONY_MONTH, HALL_FIRST_CLASS, HALL_FOUNDED, HALL_NOMS_MONTH, HALL_WAIT, LOBBY_COST, eligibleActs, hall, hallExists, hallName, hallScore, lobby as hallLobby19, answerPerform as answerHallPerform19 } from './sys/rockhall9';
/** Livro único: grava o prêmio em `s.awards` e conta no ato/jogador. */
export const recordAward19 = recordAward;

// ---------------------------------------------------------------- cerimônias
export interface Ceremony19 { id: string; name: L; nomsMonth?: number; month: number; on: boolean }
/** Calendário das cerimônias que existem no ano corrente (nada do futuro). */
export function ceremonies19(s: GameState): Ceremony19[] {
  const out: Ceremony19[] = [
    { id: 'gramo', name: l('Gramófonos de Ouro', 'Golden Gramophones'), nomsMonth: NOMS_MONTH, month: CEREMONY_MONTH, on: true },
    { id: 'national', name: l('Prêmios nacionais (júri local)', 'National awards (local jury)'), month: 11, on: true },
    ...Object.values(REGIONAL_AWARDS).map((a) => ({ id: a.id, name: a.name, month: 11, on: true })),
  ];
  if (hallExists(s)) out.push({ id: 'hall', name: hallName(s), nomsMonth: HALL_NOMS_MONTH, month: HALL_CEREMONY_MONTH, on: s.year >= HALL_FIRST_CLASS - 1 });
  return out;
}

// ---------------------------------------------------------------- indicados
/** Indicados anunciados neste ano: categoria dos Gramófonos (ids de lançamento) ou 'hall' (ids de ato). */
export function nominations19(s: GameState, cat: GramoCat | 'hall'): string[] {
  if (cat === 'hall') { const n = hall(s).noms; return n && n.year === s.year ? [...n.ids] : []; }
  const n = cer8(s)?.noms;
  return n && n.year === s.year ? [...(n.cats[cat] ?? [])] : [];
}
export const GRAMO_CATS19 = GRAMO_CATS;

// ---------------------------------------------------------------- júri e memória do júri
export interface JuryMem19 { k: number; makeup: boolean; fatigue: number; why: L[] }
/** Memória do júri sobre um ato: simpatia/rancor do júri local (país `a3`), compensação pela esnobada e fadiga de voto. */
export function juryMemory19(s: GameState, actId: string, a3?: string): JuryMem19 {
  const why: L[] = [];
  const k = a3 && juryMemHook.f ? juryMemHook.f(s, actId, a3) : 1;
  if (k > 1) why.push(l('O júri local sente que deve uma a este artista.', 'The local jury feels it owes this act one.'));
  else if (k < 1) why.push(l('O júri local guarda rancor deste artista.', 'The local jury holds a grudge against this act.'));
  const makeup = (aw18(s).makeup[actId] ?? 0) === s.year;
  if (makeup) why.push(l('Compensação pela esnobada do ano passado.', 'Make-up for last year\'s snub.'));
  const fatigue = s.awards.filter((a) => a.actId === actId && a.year >= s.year - 3).length;
  if (fatigue >= 2) why.push(l('Fadiga de voto: ganhou demais nos últimos anos.', 'Voter fatigue: won too much lately.'));
  return { k, makeup, fatigue, why };
}
/** O júri do ano: corpo de votantes (idade, gosto, reforma) e o sorteio do júri local por país. */
export function jury19(s: GameState, a3?: string) {
  return { voters: voters18(s), rng: a3 ? juryRng(s, a3) : undefined, mem: (actId: string) => juryMemory19(s, actId, a3) };
}

// ---------------------------------------------------------------- vencedores
export type WinSrc19 = 'gramo' | 'regional' | 'industry' | 'national' | 'hall';
export interface Win19 { year: number; src: WinSrc19; cat: string; name: string; actId?: string; relId?: string; a3?: string; mine: boolean; posthumous: boolean }
const GRAMO_IDS = new Set(['record', 'album', 'newcomer', 'performance']);
const srcOf = (cat: string): WinSrc19 => (GRAMO_IDS.has(cat) ? 'gramo' : cat.startsWith('nat_') ? 'national' : cat.startsWith('reg_') ? 'regional' : 'industry');

/** Ato sem nenhum membro vivo (prêmio póstumo). Sem `year`, olha o presente. */
export function isPosthumous19(s: GameState, actId: string | undefined, year = s.year): boolean {
  const a = actId ? s.acts[actId] : undefined;
  if (!a || !a.members.length) return false;
  return a.members.every((id) => { const p = s.persons[id]; return !!p && !p.alive && (p.died === undefined || p.died <= year); });
}

/** Todos os vencedores num formato só: livro `s.awards` + nacionais de NPC (charts7) + Hall da Fama. */
export function winners19(s: GameState, o: { year?: number; mine?: boolean; actId?: string; src?: WinSrc19 } = {}): Win19[] {
  const out: Win19[] = [];
  for (const a of s.awards) out.push({ year: a.year, src: srcOf(a.category), cat: a.category, name: a.name, actId: a.actId, relId: a.releaseId, a3: a.category.startsWith('nat_') ? a.category.slice(4, 7) : undefined, mine: a.byPlayer, posthumous: isPosthumous19(s, a.actId, a.year) });
  for (const n of ch7(s)?.awards ?? []) if (!n.byPlayer) out.push({ year: n.year, src: 'national', cat: `nat_${n.a3}_${n.cat}`, name: n.winner, actId: n.actId, relId: n.relId, a3: n.a3, mine: false, posthumous: isPosthumous19(s, n.actId, n.year) });
  for (const h of hall(s).inducted) out.push({ year: h.year, src: 'hall', cat: `hall_${h.cat}`, name: h.name, actId: h.actId, mine: !!h.player, posthumous: isPosthumous19(s, h.actId, h.year) });
  return out.filter((w) => (o.year === undefined || w.year === o.year) && (o.mine === undefined || w.mine === o.mine) && (!o.actId || w.actId === o.actId) && (!o.src || w.src === o.src));
}
export const posthumousWins19 = (s: GameState, year?: number): Win19[] => winners19(s, { year }).filter((w) => w.posthumous);

// ---------------------------------------------------------------- cerimônia do envelope (cine18)
/** Dados da cerimônia (cartão de cena `awards`) no formato do storyboard do envelope. Fonte única para cine18. */
export function ceremonyOfCutscene19(s: GameState, cs: { id: string; data: Record<string, unknown> }): Aw18 {
  const d = cs.data;
  return { cs: cs.id, year: Number(d.year ?? s.year), cats: (d.cats as Aw18['cats']) ?? [], won: Number(d.won ?? 0), actId: (d.actId as string) ?? null, rivalId: (d.rivalId as string) ?? null, rivalName: (d.rivalName as string) ?? null };
}

export const AWARD_FACTS19 = ['award_win', 'award_posthumous', 'award', 'boycott'] as const;
