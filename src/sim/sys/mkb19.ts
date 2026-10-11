// Rodada 19 (Frente 7, mercado B) — utilitários comuns de remix19, adsync19, score19, cancel19, insure19, culture19 e naming19:
// estado em s.x4 com campos novos preenchidos em save antigo, diário curto por sistema, contadores e as ligações
// ("Ligações do mês", links18) que esses sistemas criam entre si e com o resto do jogo.

import { l, type L } from '../../data/world';
import type { Act, GameState, Release } from '../types';
import { LINKS18, lk18 } from './links18';

/** Estado do sistema em s.x4[key], com campos novos completados (save antigo). */
export function xs19<T extends object>(s: GameState, key: string, fresh: () => T): T {
  const x = ((s as unknown as { x4: Record<string, unknown> }).x4 ??= {});
  const st = (x[key] ??= fresh()) as T;
  const f = fresh() as unknown as Record<string, unknown>, o = st as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) o[k] ??= f[k];
  return st;
}
export interface Log19 { log: [number, number, L][]; n: Record<string, number> }
export const log19 = (s: GameState, st: Log19, t: L, max = 40): void => { st.log.unshift([s.year, s.month, t]); if (st.log.length > max) st.log.length = max; };
export const cnt19 = (st: Log19, k: string, d = 1): void => { st.n[k] = (st.n[k] ?? 0) + d; };
export const usd19 = (c: number): string => `$${Math.round(c / 100).toLocaleString('en-US')}`;
export const mineA19 = (a?: Act): boolean => !!a && (a.owner === 'player' || !!a.playerBand);
export const mineR19 = (s: GameState, rel?: Release): boolean => !!rel && (rel.owner === 'player' || !!s.acts[rel.actId]?.playerBand);
/** desliga os meses dos sistemas do mercado B (A/B de equilíbrio) */
export const off19 = (k = ''): boolean => { const o = (globalThis as { __mkb19Off?: boolean | string }).__mkb19Off; return o === true || (typeof o === 'string' && !!k && o.includes(k)); };
export const safe19 = (fn: () => void): void => { try { fn(); } catch { /* uma ligação com erro não derruba o mês */ } };
/** registra a ligação no "Ligações do mês" (links18) */
export const link19 = (s: GameState, id: string, t: L): void => { const st = lk18(s); st.log.unshift([s.week, id, t]); if (st.log.length > 40) st.log.length = 40; };

const N = (pt: string, en: string): L => l(pt, en);
export const LINKS19M = [
  { id: 'remix', a: N('Remix e DJs', 'Remixes and DJs'), b: N('Sucesso tardio e pistas', 'Late hits and clubs'), how: N('Remix de clube de uma faixa antiga soma calor no sucesso tardio, vende por meses e pode render residência de DJ; white label testa a pista antes.', 'A club remix of an old track adds late-hit heat, sells for months and can earn a DJ residency; a white label tests the floor first.') },
  { id: 'adsync', a: N('Publicidade', 'Advertising'), b: N('Fãs puristas e catálogo', 'Purist fans and catalogue'), how: N('Comercial paga e espalha a faixa (e a revive), mas cada anúncio enche o medidor de "vendido": cheio, os puristas se revoltam e a crítica cobra.', 'An ad pays and spreads the track (and revives it), but each ad fills the "sell-out" meter: full, purists revolt and critics bite.') },
  { id: 'score', a: N('Trilhas e needle drops', 'Scores and needle drops'), b: N('Prêmios, prestígio e streaming', 'Awards, prestige and streaming'), how: N('Canção-tema de filme estreia com cena, pode concorrer a prêmio de cinema; needle drop numa série faz a faixa voltar a tocar.', 'A film theme song premieres with a scene and can compete for a film award; a needle drop in a series makes the track play again.') },
  { id: 'cancel', a: N('Escândalo (2010+)', 'Scandal (2010+)'), b: N('Marcas, fãs e streaming', 'Brands, fans and streaming'), how: N('Na era digital o escândalo vira onda: pico, janela para responder, marcas que saem e cláusulas de conduta; pedir desculpas cedo encurta, contra-atacar divide os fãs.', 'In the digital era a scandal becomes a wave: a peak, a window to respond, brands walking out and conduct clauses; an early apology shortens it, hitting back splits the fans.') },
  { id: 'insure', a: N('Seguros e saúde', 'Insurance and health'), b: N('Espólio, estresse e caixa', 'Estate, stress and cash'), how: N('Seguro de pessoa-chave paga se o astro morre ou adoece (e os herdeiros podem não gostar); plano de saúde alivia o estresse do elenco e ajuda a assinar.', 'Key-person cover pays if the star dies or falls ill (and the heirs may resent it); a health plan eases roster stress and helps signing.') },
  { id: 'culture', a: N('Cultura da empresa', 'Company culture'), b: N('Equipe e propostas', 'Staff and offers'), how: N('Artista primeiro, lucro primeiro, prestígio ou caos: muda a lealdade da equipe (quem fica abaixo de 25 sai), o humor do elenco e quanto os artistas aceitam as suas propostas.', 'Artist-first, profit-first, prestige or chaos: shifts staff loyalty (below 25 they quit), roster mood and how readily artists accept your offers.') },
  { id: 'naming', a: N('Naming rights', 'Naming rights'), b: N('Casa e festival', 'Venue and festival'), how: N('Vender o nome da casa ou do festival dá caixa fixo todo ano, mas a reputação cai com os puristas; escândalo ou tragédia aciona a cláusula de conduta e a marca sai.', 'Selling the venue or festival name brings fixed yearly cash, but reputation drops with purists; a scandal or tragedy triggers the conduct clause and the brand walks.') },
];
for (const d of LINKS19M) if (!LINKS18.some((x) => x.id === d.id)) LINKS18.push(d);
