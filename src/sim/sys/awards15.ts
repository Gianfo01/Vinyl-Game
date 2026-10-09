// Rodada 15 — Paradas e prêmios com drama: prêmios nacionais votados por júri local (artistas da casa
// pesam mais, a crítica conta), avisos agrupados (um hit em 28 países vira UMA notícia, não 28) e
// "esnobadas": quando seu artista vendeu mais que todos em casa e mesmo assim perdeu Artista do Ano,
// você decide como reagir (protestar, boicotar a cerimônia, ou aceitar com elegância).

import { clamp, Rng } from '../../core/rng';
import { countryOfCity } from '../../data/geo';
import { l, type L } from '../../data/world';
import { emitEvent, type EventDef } from '../events';
import { deferEvents, registerExt4 } from '../ext4';
import type { GameState } from '../types';
import { fmtL, notify } from '../util';
import { addHype } from './hype12';

export interface Aw15 { snubs: [number, string, string, string][]; boycott: Record<string, number> }
declare module '../ext4' { interface Ext4 { awards15: Aw15 } }
const fresh = (): Aw15 => ({ snubs: [], boycott: {} });
registerExt4('awards15', fresh);
export function aw15(s: GameState): Aw15 {
  const x = s.x4 as unknown as { awards15?: Aw15 };
  const st = (x.awards15 ??= fresh());
  st.snubs ??= []; st.boycott ??= {};
  return st;
}

/** País de origem do ato (cidade natal). */
export const homeOf = (s: GameState, actId: string): string | null => { const a = s.acts[actId]; return a ? countryOfCity(a.city) : null; };
/** Júri nacional: artista da casa pesa 2,5×; quem é de fora precisa vender muito mais. */
export const homeK = (s: GameState, actId: string, a3: string): number => (homeOf(s, actId) === a3 ? 2.5 : 1);
/** Ruído de júri estável por país/ano (a crítica e o lobby também votam). */
export const juryRng = (s: GameState, a3: string): Rng => Rng.fromSeed(`${s.config.seed}:aw15:${s.year}:${a3}`);

// ---------------------------------------------------------------- avisos agrupados

const top10: Record<string, { title: string; c: L[]; no1: L[] }> = {};
/** Guarda a entrada no top 10 de um país; flushTop10 avisa uma vez por disco na semana. */
export function queueTop10(title: string, country: L, pos: number): void {
  const e = (top10[title] ??= { title, c: [], no1: [] });
  (pos === 1 ? e.no1 : e.c).push(country);
}
const list = (xs: L[], n = 5): L => ({ pt: xs.slice(0, n).map((x) => x.pt).join(', ') + (xs.length > n ? ` +${xs.length - n}` : ''), en: xs.slice(0, n).map((x) => x.en).join(', ') + (xs.length > n ? ` +${xs.length - n}` : '') });
export function flushTop10(s: GameState): void {
  for (const [k, e] of Object.entries(top10)) {
    if (e.no1.length) notify(s, fmtL(e.no1.length === 1 ? l('"{t}" é #1 em {c}!', '"{t}" is #1 in {c}!') : l('"{t}" é #1 em {n} países: {c}!', '"{t}" is #1 in {n} countries: {c}!'), { t: e.title, n: e.no1.length, c: list(e.no1) }), 'good');
    if (e.c.length) notify(s, fmtL(e.c.length === 1 ? l('"{t}" entra no top 10 de {c}.', '"{t}" enters the {c} top 10.') : l('"{t}" entra no top 10 de {n} países: {c}.', '"{t}" enters the top 10 in {n} countries: {c}.'), { t: e.title, n: e.c.length, c: list(e.c) }), 'good');
    delete top10[k];
  }
}

const won: Record<string, { cat: L; w: string; c: L[] }> = {};
export function queueAward(cat: L, winner: string, award: string, country: L): void {
  const e = (won[`${cat.en}|${winner}`] ??= { cat, w: winner, c: [] });
  e.c.push({ pt: `${award} (${country.pt})`, en: `${award} (${country.en})` });
}
export function flushAwards(s: GameState): void {
  for (const [k, e] of Object.entries(won)) {
    notify(s, fmtL(e.c.length === 1 ? l('{c} — {cat}: {w}!', '{c} — {cat}: {w}!') : l('{cat}: {w} vence em {n} países — {c}.', '{cat}: {w} wins in {n} countries — {c}.'), { c: list(e.c, 4), cat: e.cat, w: e.w, n: e.c.length }), 'good');
    delete won[k];
  }
}

// ---------------------------------------------------------------- esnobadas

/** Chamado pelos prêmios nacionais: seu ato liderou as vendas em casa e perdeu Artista do Ano. */
export function snub15(s: GameState, actId: string, a3: string, award: string, winner: string): void {
  const st = aw15(s);
  st.snubs.unshift([s.year, actId, a3, winner]);
  if (st.snubs.length > 12) st.snubs.length = 12;
  if (s.decisions.some((d) => d.eventId === 'aw15_snub')) return;
  emitEvent(s, juryRng(s, a3), 'aw15_snub', { act: actId, award, winner, a3 });
}

/** Ato em boicote não comparece (e não concorre com simpatia do júri) no ano seguinte. */
export const boycotting = (s: GameState, actId: string): boolean => (aw15(s).boycott[actId] ?? 0) >= s.year;

deferEvents<EventDef>([
  {
    id: 'aw15_snub', cat: 'career', tone: 'bad', tags: [], cooldown: 6, forcedOnly: true,
    title: l('{act} esnobado no {award}', '{act} snubbed at the {award}'),
    text: l('{act} vendeu mais que todos em casa, mas o júri do {award} deu Artista do Ano a {winner}. O camarim está em silêncio; a imprensa quer uma reação.', '{act} outsold everyone at home, but the {award} jury gave Artist of the Year to {winner}. The dressing room is silent; the press wants a reaction.'),
    options: [
      { id: 'protest', label: l('Protestar publicamente', 'Protest publicly'), hint: l('Hype +10 e confiança +4; o júri e a indústria não esquecem (reputação institucional −4).', 'Hype +10 and trust +4; the jury and industry remember (institutional reputation −4).'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (!a) return; addHype(s, `a:${a.id}`, 'aw15', l('Esnobado no prêmio', 'Award snub'), 10); a.trust = clamp(a.trust + 4, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional - 4, 0, 100); } },
      { id: 'boycott', label: l('Boicotar a cerimônia do ano que vem', 'Boycott next year\'s ceremony'), hint: l('Confiança +6, credibilidade artística +2; o ato não concorre no país no ano seguinte.', 'Trust +6, artistic credibility +2; the act does not compete in that country next year.'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (!a) return; a.trust = clamp(a.trust + 6, 0, 100); s.player.reputation.artistic = clamp(s.player.reputation.artistic + 2, 0, 100); aw15(s).boycott[a.id] = s.year + 1; s.player.reputation.institutional = clamp(s.player.reputation.institutional - 2, 0, 100); } },
      { id: 'grace', label: l('Aplaudir o vencedor', 'Applaud the winner'), hint: l('Reputação institucional +3; o artista acha que você não brigou por ele (confiança −3).', 'Institutional reputation +3; the act feels you did not fight for them (trust −3).'),
        apply: (s, _r, c) => { const a = s.acts[String(c.act)]; if (a) a.trust = clamp(a.trust - 3, 0, 100); s.player.reputation.institutional = clamp(s.player.reputation.institutional + 3, 0, 100); } },
    ],
  },
]);
