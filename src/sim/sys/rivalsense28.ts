// Rodada 28 (fase 5, C7) — RIVAIS SEM ESTADO PRIVADO E COM RESERVA PRÓPRIA.
//   • O rival não lê o que só o jogador sabe (receita real, confiança do ato no selo). Ele INFERE por sinais
//     públicos — paradas, certificados, vendas aproximadas, boatos (promessa quebrada, ato engavetado) — sempre
//     com ruído (sorteio próprio por selo × ato × trimestre: a leitura muda devagar e erra dos dois lados).
//   • Reserva própria: quanto o selo topa pagar de adiantamento sai da fama PERCEBIDA do ato, da agressividade,
//     da mágoa com você e do caixa dele — nunca do seu lance nem do mínimo escondido do artista.
//   • Disputa (oferta ao vivo de ato com fama > 10, fechamento do mês e mesa r27): o rival abre com uma fração
//     sorteada da reserva; se a sua proposta for melhor aos olhos do artista, ele PODE cobrir (sorteio pela
//     agressividade) até a reserva. Esgotada a reserva, recua.
// Sorte: Rng.fromSeed(semente|rs28|…); a única tirada do RNG do jogo é a de "interesse" (já existia).

import { Rng, clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { defaultOffer, evaluateOffer, expectedAdvance, signWithRival } from '../contracts';
import type { Act, GameState, Label, Offer } from '../types';
import { fmtL, money, playerActs } from '../util';
import { labelClout } from './offers12';

export const RS28 = 'rs28v1';
const q28 = (s: GameState) => Math.floor(s.week / 13);
const rng28 = (s: GameState, ...parts: (string | number)[]) => Rng.fromSeed(`${s.config.seed}|${RS28}|${parts.join('|')}`);

interface Rs28State { live: number; contests: number; wins: number; counters: number; backoffs: number }
export function rs28(s: GameState): Rs28State {
  const x = s.x4 as unknown as Record<string, unknown>;
  return (x.rs28 ??= { live: 0, contests: 0, wins: 0, counters: 0, backoffs: 0 }) as Rs28State;
}

// ---------------------------------------------------------------- leitura pública (com ruído)

/** Sinal público de sucesso de um lançamento: paradas, semanas na parada e certificado (0 = nada visível). */
export function publicHeat28(s: GameState, relId: string): number {
  const r = s.releases[relId];
  if (!r || r.hist) return 0;
  const chart = r.peak > 0 ? (101 - Math.min(100, r.peak)) * (1 + Math.min(30, r.weeksOnChart) / 10) : 0;
  const cert = r.certified === 'diamond' ? 400 : r.certified === 'platinum' ? 160 : r.certified === 'gold' ? 60 : 0;
  return chart + cert;
}

/** Fama que o rival enxerga: a fama (pública) + o embalo das paradas recentes + ruído. */
export function perceivedFame28(s: GameState, labelId: string, act: Act): number {
  let best = 0;
  for (const rid of act.releases) {
    const r = s.releases[rid];
    if (!r || r.hist || s.week - r.week > 104 || !(r.peak > 0)) continue;
    best = Math.max(best, r.peak <= 10 ? 4 : r.peak <= 40 ? 2 : 0.5);
  }
  return clamp(act.fame + best + rng28(s, 'fame', labelId, act.id, q28(s)).normal(0, 2.5), 0, 100);
}

/** Confiança do ato no SEU selo, vista de fora: boatos de promessa quebrada, ato engavetado, sucesso recente. */
export function perceivedTrust28(s: GameState, labelId: string, act: Act): number {
  let v = 62;
  const since = s.week - 156;
  for (const m of s.memory) {
    if (m.actId !== act.id || m.week < since) continue;
    if (m.kind === 'broken_promise') v -= 14;
    else if (m.kind === 'renegotiation' || m.kind === 'renewal') v += 4;
  }
  if (act.owner === 'player') {
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    const last = act.releases.map((id) => s.releases[id]?.week ?? -1).reduce((a, b) => Math.max(a, b), -1);
    if (c && s.week - c.startWeek > 78 && s.week - last > 78) v -= 12; // "engavetado": sem disco há 18 meses
    if (act.releases.some((id) => { const r = s.releases[id]; return !!r && s.week - r.week < 52 && r.peak > 0 && r.peak <= 10; })) v += 8;
  }
  return clamp(v + rng28(s, 'trust', labelId, act.id, q28(s)).normal(0, 10), 0, 100);
}

export interface PDep28 { act?: { id: string; share: number }; fam?: { id: string; share: number }; total: number }
/** Concentração da sua receita de discos como o MERCADO a estima: vendas aproximadas (base das paradas) ×
 *  preço médio, com ruído por ato e por trimestre. Nunca lê `release.revenue`. */
export function perceivedDependence28(s: GameState, famOf: (genre: Act['genre']) => string): PDep28 {
  const byAct = new Map<string, number>();
  const byFam = new Map<string, number>();
  let total = 0;
  const unit = money(s, 4);
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a) continue;
    let v = 0;
    for (const rid of a.releases) {
      const r = s.releases[rid];
      if (!r || r.hist || s.week - r.week > 104) continue;
      v += r.totalUnits * unit + publicHeat28(s, rid) * unit * 10;
    }
    if (v <= 0) continue;
    v *= Math.exp(rng28(s, 'dep', a.id, q28(s)).normal(0, 0.3));
    total += v;
    byAct.set(a.id, (byAct.get(a.id) ?? 0) + v);
    const f = famOf(a.genre);
    byFam.set(f, (byFam.get(f) ?? 0) + v);
  }
  if (!total) return { total: 0 };
  const ta = [...byAct].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
  const tf = [...byFam].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1))[0];
  return { total, act: ta && { id: ta[0], share: ta[1] / total }, fam: tf && { id: tf[0], share: tf[1] / total } };
}

// ---------------------------------------------------------------- reserva, lance e placar do rival

/** Quanto o selo topa pagar de adiantamento (centavos): fama percebida, agressividade, mágoa, caixa. */
export function rivalReserve28(s: GameState, lb: Label, act: Act): number {
  const fame = perceivedFame28(s, lb.id, act);
  const base = money(s, expectedAdvance(s, { ...act, fame }));
  const grudge = clamp((s.rivalries[lb.id] ?? 0) / 200, 0, 0.2);
  const v = base * (0.85 + lb.aggression * 0.6 + grudge) * Math.exp(rng28(s, 'res', lb.id, act.id, q28(s)).normal(0, 0.12));
  return Math.max(money(s, 200), Math.round(Math.min(v, Math.max(0, lb.cash) * 0.3) / 100) * 100);
}

/** Termos do rival: o padrão do mercado (prazo e discos do contrato de selo) com o adiantamento do lance. */
export function rivalTerms28(s: GameState, act: Act, bid: number): Omit<Offer, 'id' | 'week' | 'status'> {
  return { ...defaultOffer(s, act), advance: bid, termMonths: 48, releasesOwed: 4 };
}

/** Placar da proposta rival aos olhos do artista: mesma régua da sua (evaluateOffer) + diferença de força do selo. */
export function rivalScore28(s: GameState, act: Act, lb: Label, bid: number): number {
  return evaluateOffer(s, act, rivalTerms28(s, act, bid)).score + (labelClout(s, lb.id) - labelClout(s, 'player')) * 0.25;
}

/** Contraproposta do rival (sorteio): cobre se a reserva deixa e a agressividade manda. Devolve o lance novo ou null. */
export function rivalCounter28(lb: Label, bid: number, reserve: number, r: Rng): number | null {
  if (reserve < bid * 1.05 || !r.chance(clamp(0.3 + lb.aggression * 0.4, 0.2, 0.85))) return null;
  return Math.round((bid + (reserve - bid) * r.float(0.35, 1)) / 100) * 100;
}

/** Assina com o rival pelo lance dele (o contrato e o caixa do selo ficam com o valor do lance). */
export function rivalSign28(s: GameState, act: Act, lb: Label, bid: number, r: Rng): boolean {
  signWithRival(s, act, lb.id, r);
  if (act.owner !== lb.id || !act.contractId) return false;
  const c = s.contracts[act.contractId];
  if (c) { lb.cash += c.advance - bid; c.advance = bid; c.recoupBalance = bid; }
  return true;
}

/** Selo rival que disputa (o mesmo critério de antes: o mais agressivo com caixa). */
export function contender28(s: GameState): Label | undefined {
  return Object.values(s.labels).filter((x) => x.active && x.cash > money(s, 50000)).sort((a, b) => b.aggression - a.aggression || (a.id < b.id ? -1 : 1))[0];
}

export interface Contest28 { lb: Label; bid: number; reserve: number; countered: boolean; log: L[] }
/** Disputa de uma oferta (ao vivo ou no fechamento). Devolve o rival vencedor (já assinado) ou null.
 *  `r` = RNG do jogo, usado só para a tirada de interesse (mesma do código antigo). */
export function rivalContest28(s: GameState, r: Rng, act: Act, o: Offer, playerScore: number, live: boolean): Contest28 | null {
  const lb = contender28(s);
  if (!lb) return null;
  const thinking = o.thinkUntil !== undefined;
  if (!r.chance(clamp((0.2 + lb.aggression * 0.4) * (thinking ? 0.6 : 1), 0, 0.9))) return null;
  const st = rs28(s);
  st.contests += 1;
  if (live) st.live += 1;
  const rr = rng28(s, 'contest', o.id, act.id, s.week);
  const reserve = rivalReserve28(s, lb, act);
  let bid = Math.round(reserve * rr.float(0.7, 0.9) / 100) * 100;
  const noise = rr.normal(0, 0.05);
  const edge = (b: number) => playerScore - rivalScore28(s, act, lb, b) + noise;
  const log: L[] = [fmtL(l('{l} entra na disputa com {a} de adiantamento.', '{l} joins the bidding with a {a} advance.'), { l: lb.name, a: usd28(bid) })];
  let countered = false;
  if (edge(bid) >= 0) {
    const nb = rivalCounter28(lb, bid, reserve, rr);
    if (nb === null) { st.backoffs += 1; return null; }
    countered = true;
    st.counters += 1;
    bid = nb;
    log.push(fmtL(l('{l} sobe o lance: {a}.', '{l} raises its bid: {a}.'), { l: lb.name, a: usd28(bid) }));
    if (edge(bid) >= 0) { st.backoffs += 1; return null; }
  }
  if (!rivalSign28(s, act, lb, bid, rng28(s, 'sign', o.id, act.id))) return null;
  st.wins += 1;
  return { lb, bid, reserve, countered, log };
}

export const usd28 = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
