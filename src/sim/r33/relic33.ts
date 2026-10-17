// R33 · CATÁLOGO (5) — RELÍQUIAS COM EFEITO MUSICAL PEQUENO, IMPRENSA E GARANTIA (`exp33.relics`, desligado).
//  • Estúdio: cada peça "de tocar" no acervo do selo ou sua (guitarra, microfone, piano, bateria, baixo, amplificador,
//    sintetizador, metais, fita master) dá +1% na qualidade das faixas gravadas pelo seu elenco; +1% a mais quando a peça
//    é do mesmo gênero da faixa. Teto +3% (entra na cadeia `songQ` com o retorno decrescente de sempre).
//  • Imprensa: peça Notável ou acima que chega às suas mãos sai no jornal uma vez (fato público) e rende reputação
//    artística (+1; +2 da Rara para cima). No máximo uma notícia por mês.
//  • Leilão: já existe (consignação da casa de leilões, sys/auction31). Peça empenhada não vai a pregão.
//  • Garantia (gancho do BANCO, INT-2/GESTÃO): `collateral33` lista o que pode ser empenhado e por quanto; `pledge33`
//    empenha, `unpledge33` solta (empréstimo quitado), `seize33` executa a garantia (a peça vai a leilão em nome do banco e
//    a função devolve o valor apurado para abater a dívida). O banco é quem decide quando chamar.

import { clamp } from '../../core/rng';
import { l, type L } from '../../data/world';
import { registerMod, registerSimHook } from '../ext4';
import { emitFact } from '../facts17';
import { relicTierOf31, syncRelic31, TIER_NAME31 } from '../r31/relic31';
import { consignGuard31 } from '../sys/auction31';
import { isRelicFixed9, openingBid, relics, type Relic, type RelicKind } from '../sys/relics9';
import type { GameState } from '../types';
import { fmtL, playerActs } from '../util';
import { cat33, log33, on33, peek33 } from './cat33';

const ON = 'exp33.relics' as const;
export const STUDIO_KINDS33: ReadonlySet<RelicKind> = new Set<RelicKind>(['guitar', 'mic', 'piano', 'drums', 'bass', 'amp', 'synth', 'horn', 'tape']);
export const RELIC_Q_CAP33 = 0.03;
/** Fração do lance inicial que o banco aceita como garantia. */
export const COLLATERAL_LTV33 = 0.5;

const mine = (rl: Relic): boolean => rl.st === 'player';
export const pledged33 = (s: GameState, rid: string): boolean => !!peek33(s)?.pledge[rid];

// ---------------------------------------------------------------- efeito no estúdio

/** Bônus de qualidade (fração) que o acervo dá a uma faixa deste gênero. */
export function relicQ33(s: GameState, genre?: string): number {
  if (!on33(s, ON)) return 0;
  let b = 0;
  for (const rl of relics(s).list) {
    if (!mine(rl) || !STUDIO_KINDS33.has(rl.k)) continue;
    b += 0.01;
    const g = rl.a ? (s.acts[rl.a] as unknown as { genre?: string } | undefined)?.genre : undefined;
    if (genre && g === genre) b += 0.01;
    if (b >= RELIC_Q_CAP33) break;
  }
  return Math.min(RELIC_Q_CAP33, b);
}
registerMod('songQ', 'relic33', (s, value, { song, act }) => {
  if (!on33(s, ON) || !act || !playerActs(s).includes(act.id)) return null;
  const b = relicQ33(s, song?.genre);
  return b ? { value: value * (1 + b), label: l('Relíquias no estúdio', 'Relics in the studio') } : null;
});

// ---------------------------------------------------------------- imprensa

registerSimHook('month', 'relic33', (s) => {
  if (!on33(s, ON)) return;
  for (const rl of relics(s).list) {
    if (!mine(rl) || peek33(s)?.press[rl.id]) continue;
    const t = relicTierOf31(s, rl);
    if (t < 1) continue;
    const st = cat33(s);
    st.press[rl.id] = 1;
    const rep = s.player.reputation;
    rep.artistic = clamp(rep.artistic + (t >= 2 ? 2 : 1), 0, 100);
    const tx = fmtL(l('Imprensa: "{n}" ({t}) agora está no acervo do selo — a peça vira assunto.', 'Press: "{n}" ({t}) is now in the label\'s collection — the piece is the talk of the town.'), { n: rl.n, t: TIER_NAME31[t] });
    emitFact(s, { kind: 'statement', actors: ['player'], severity: 15 + t * 5, visibility: 'public', tags: ['relic33', 'press'], src: 'relic33', data: { relic: rl.id }, text: tx, diary: true });
    log33(s, tx);
    break; // uma notícia por mês
  }
});

// ---------------------------------------------------------------- garantia (gancho do banco)

export interface Coll33 { rid: string; n: L; v: number }
/** Peças que o banco aceitaria como garantia agora, com o valor de empréstimo de cada uma. */
export function collateral33(s: GameState): Coll33[] {
  if (!on33(s, ON)) return [];
  return relics(s).list.filter((rl) => mine(rl) && !rl.meta?.fix && !isRelicFixed9(rl) && !rl.ln && !rl.brw && !pledged33(s, rl.id))
    .map((rl) => ({ rid: rl.id, n: rl.n, v: Math.round(openingBid(s, rl) * COLLATERAL_LTV33) }))
    .sort((a, b) => b.v - a.v);
}
/** Empenha a peça junto a `to` (id/nome do credor). Devolve o motivo da recusa ou null. */
export function pledge33(s: GameState, rid: string, to: string): L | null {
  const c = collateral33(s).find((x) => x.rid === rid);
  if (!c) return l('Esta peça não pode ser dada em garantia.', 'This piece cannot be pledged.');
  cat33(s).pledge[rid] = { to, w: s.week, v: c.v };
  return null;
}
export function unpledge33(s: GameState, rid: string): void { const st = peek33(s); if (st) delete st.pledge[rid]; }
/** Executa a garantia: a peça sai do acervo, entra em leilão em nome do credor; devolve o valor apurado (para abater). */
export function seize33(s: GameState, rid: string, creditor: string): number {
  const st = peek33(s), p = st?.pledge[rid];
  const rl = relics(s).list.find((x) => x.id === rid);
  if (!st || !p || !rl) return 0;
  delete st.pledge[rid];
  rl.own.push([creditor, s.year, 'garantia']);
  rl.st = 'auction'; rl.ex = undefined; rl.bid = undefined; rl.au = s.week + 13;
  if (rl.meta) rl.meta.po = undefined;
  syncRelic31(s, rl);
  const tx = fmtL(l('{c} executa a garantia: "{n}" sai do acervo e vai a leilão.', '{c} forecloses on the collateral: "{n}" leaves the collection and goes to auction.'), { c: creditor, n: rl.n });
  emitFact(s, { kind: 'deal', actors: ['player'], severity: 30, visibility: 'public', tags: ['relic33', 'bad'], src: 'relic33', data: { relic: rid }, text: tx, notify: 'bad' });
  log33(s, tx);
  return p.v;
}

consignGuard31.f = (s, rid) => pledged33(s, rid);
