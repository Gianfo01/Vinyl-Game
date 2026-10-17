// R33 (GESTÃO · 10) — O ROBÔ JOGADOR (playbot16) USA JABÁ, LEILÕES, TERRENOS/CASAS E VITRINE. Interruptor `exp33.bots`
// (desligado no código: o robô joga exatamente como antes e os valores de referência não mudam). Ligado, uma vez por
// mês, pelos mesmos botões da interface e com a prudência do perfil (cauteloso / equilibrado / agressivo):
//   • jabá (world4 payDJs): com disco seu saído há até 4 semanas e caixa folgado — o equilibrado só o envelope barato e
//     só quando o jabá é tolerado (antes de 1960) ou passa por promotores; o agressivo arrisca o segundo nível em qualquer
//     época. Lê o rosto do diretor como na cena (w31) e desiste se ele sua (equilibrado) ou fecha a cara (agressivo); ainda
//     assim ele pode recusar ou denunciar (w31.jaba): é o risco de sempre.
//   • leilões (auction31): deixa um representante com limite no lote mais barato dos pregões marcados, se o lance inicial
//     couber numa fração pequena do caixa (1% / 2% / 4%) — limite 1,2× / 1,35× / 1,6× o lance inicial.
//   • terrenos (lots31): no máximo um por ano, o mais barato à venda, até 3% / 6% do caixa (o cauteloso não compra).
//   • casas (owner/city31): muda para uma casa de mais prestígio quando o patrimônio pessoal passa de 4× o preço; o
//     agressivo compra um imóvel na maior praça do seu mercado (base de turnê) com 6× o preço.
//   • vitrine (vitrine31): põe no radar o primeiro artista que a vitrine do mês mostra (barato, sem dinheiro).
// Outras frentes registram regras novas pelo `registerBot33` (cada uma só roda com o interruptor dela ligado).
// Sem sorteio próprio: as decisões leem o estado; o acaso é o das funções do jogo.

import { toReal } from '../../core/money';
import { CITIES, cityById, l } from '../../data/world';
import { registerEditable } from '../r31/editor';
import { registerSwitch, setSw, sw } from '../r31/switches';
import { auction31, auctionOn31, ladder31, openSessions31, raise31 } from '../sys/auction31';
import { LOTS18 } from '../sys/campus18';
import { buyLot31, lotLock31, lotPrice31, lotsOn31 } from '../sys/lots31';
import { HOUSES, availableHouses, buyHouse, ownerOf } from '../sys/people/owner';
import { relics } from '../sys/relics9';
import { PAYOLA_TIERS, payDJs, payolaCost, payolaEra } from '../sys/world4/charts';
import { jabaFace31, jabaStation31 } from '../r31/w31';
import { buyHome31, casasOn31, homePrice31, homes31, housesAt31 } from '../r31/city31';
import { VIT_PLACES31, runVit31, vitItems31, vitOn31, vitView31 } from '../r31/vitrine31';
import type { GameState } from '../types';
import { playerActs } from '../util';

export type Prof33 = 'cautious' | 'balanced' | 'aggressive';

export const SW_BOTS33 = 'exp33.bots';
registerSwitch({
  id: SW_BOTS33, def: false, scope: 'game',
  desc: l('Versão 33 · o robô jogador (testes de equilíbrio) também usa jabá, leilões, terrenos, casas e a vitrine do mês. Desligado: o robô de antes.',
    'Version 33 · the bot player (balance tests) also uses payola, auctions, plots, homes and the showcase of the month. Off: the old bot.'),
});
export const botsOn33 = (s: GameState): boolean => sw<boolean>(s, SW_BOTS33);
registerEditable({ id: `sw.${SW_BOTS33}`, area: 'tools', kind: 'bool', label: l('V33 · robô usa jabá, leilões, terrenos/casas e vitrine', 'V33 · bot uses payola, auctions, plots/homes and showcase'),
  get: (s) => botsOn33(s), set: (s, v) => { setSw(s, SW_BOTS33, !!v); } });

/** O que o robô fez (contadores; só existe com o interruptor ligado). */
export interface Bots33Log { jaba: number; bids: number; lots: number; house: number; homes: number; vit: number; lastLotY?: number; x: Record<string, number> }
declare module '../ext4' { interface Ext4 { bots33?: Bots33Log } }
export function bots33Log(s: GameState): Bots33Log {
  const x = ((s as unknown as { x4?: Record<string, unknown> }).x4 ??= {});
  const g = (x.bots33 ??= { jaba: 0, bids: 0, lots: 0, house: 0, homes: 0, vit: 0, x: {} }) as Bots33Log;
  g.x ??= {};
  return g;
}

/** Fração do caixa por perfil (lance inicial do leilão, terreno) e multiplicador do limite no leilão. */
export const BOT33 = {
  bid: { cautious: 0.01, balanced: 0.02, aggressive: 0.04 } as Record<Prof33, number>,
  bidMax: { cautious: 1.2, balanced: 1.35, aggressive: 1.6 } as Record<Prof33, number>,
  lot: { cautious: 0, balanced: 0.03, aggressive: 0.06 } as Record<Prof33, number>,
};

// ---------------------------------------------------------------- partes (cada uma devolve se agiu)

export function botJaba33(s: GameState, p: Prof33): boolean {
  if (p === 'cautious') return false;
  const fresh = playerActs(s).some((id) => (s.acts[id]?.releases ?? []).some((r) => { const rel = s.releases[r]; return !!rel && s.week - rel.week <= 4 && s.week >= rel.week; }));
  if (!fresh) return false;
  const era = payolaEra(s);
  const tier = p === 'aggressive' ? 1 : era === 'legal' || era === 'indie' ? 0 : -1;
  if (tier < 0 || !PAYOLA_TIERS[tier]) return false;
  if (payolaCost(s, tier) * (p === 'aggressive' ? 20 : 40) > s.player.cash) return false;
  // lê o rosto do diretor como na cena (w31): o equilibrado desiste se ele sua; o agressivo só se fecha a cara
  const face = jabaFace31(s, tier, jabaStation31(s));
  if (face === 'stern' || (p === 'balanced' && face === 'sweat')) return false;
  return payDJs(s, tier) === null;
}

export function botBid33(s: GameState, p: Prof33): boolean {
  if (!auctionOn31(s)) return false;
  const cons = auction31(s).cons;
  const list = relics(s).list;
  let best: { id: string; open: number } | null = null;
  for (const sess of openSessions31(s)) {
    if (sess.w < s.week) continue;
    for (const rid of sess.lots) {
      const rl = list.find((x) => x.id === rid);
      if (!rl || cons[rid] || (rl.bid ?? 0) > 0) continue;
      const open = ladder31(s, sess.id, rl, 0).open;
      if (open <= 0 || open > s.player.cash * BOT33.bid[p]) continue;
      if (!best || open < best.open || (open === best.open && rid < best.id)) best = { id: rid, open };
    }
  }
  return !!best && raise31(s, best.id, Math.round(best.open * BOT33.bidMax[p])) === null;
}

export function botLot33(s: GameState, p: Prof33): boolean {
  const f = BOT33.lot[p];
  if (!f || !lotsOn31(s)) return false;
  const g = bots33Log(s);
  if (g.lastLotY === s.year) return false;
  let best = -1, price = Infinity;
  for (let i = 1; i < LOTS18.length; i++) {
    if (lotLock31(s, i)) continue;
    const v = lotPrice31(s, i);
    if (v < price) { price = v; best = i; }
  }
  if (best < 0 || price > s.player.cash * f) return false;
  const ok = buyLot31(s, best).ok;
  if (ok) g.lastLotY = s.year;
  return ok;
}

export function botHouse33(s: GameState, p: Prof33): boolean {
  if (p === 'cautious') return false;
  const o = ownerOf(s);
  const cur = o.house >= 0 ? HOUSES[o.house]?.prestige ?? 0 : -1;
  const up = availableHouses(s).filter((h) => h.prestige > cur && toReal(o.wealth, s.year) > h.price * 4).sort((a, b) => a.prestige - b.prestige || a.price - b.price)[0];
  return !!up && buyHouse(s, up.id) === null;
}

export function botHome33(s: GameState, p: Prof33): boolean {
  if (p !== 'aggressive' || !casasOn31(s)) return false;
  const mk = cityById[s.config.homeCity]?.market;
  const city = CITIES.filter((c) => c.market === mk && c.id !== s.config.homeCity).sort((a, b) => (b.w ?? 1) - (a.w ?? 1) || (a.id < b.id ? -1 : 1))[0]?.id;
  if (!city || homes31(s).some((h) => h.city === city)) return false;
  const house = housesAt31(s)[0];
  if (house === undefined || ownerOf(s).wealth < homePrice31(s, city, house) * 6) return false;
  return buyHome31(s, city, house) === null;
}

export function botVit33(s: GameState): boolean {
  if (!vitOn31(s)) return false;
  for (const pl of VIT_PLACES31) for (const it of vitItems31(s, pl)) {
    const b = vitView31(s, it).btns.find((x) => x.run.k === 'radar' && !x.lock);
    if (!b) continue;
    const r = runVit31(s, b.run);
    if ('ok' in r && r.ok) return true;
  }
  return false;
}

// ---------------------------------------------------------------- regras de outras frentes (gancho)

export interface BotRule33 { id: string; on: (s: GameState) => boolean; run: (s: GameState, p: Prof33) => boolean }
export const BOT_RULES33: BotRule33[] = [];
/** Outra frente ensina o robô a usar a regra dela (só roda com `on` verdadeiro — o interruptor da própria regra). */
export function registerBot33(r: BotRule33): void {
  const i = BOT_RULES33.findIndex((x) => x.id === r.id);
  if (i >= 0) BOT_RULES33[i] = r; else BOT_RULES33.push(r);
}

/** O mês do robô (chamado pelo playbot16 depois dos negócios). Desligado: não faz nada nem cria estado. */
export function botMonth33(s: GameState, p: Prof33): void {
  if (!botsOn33(s) || s.config.role === 'artist') return;
  const g = bots33Log(s);
  if (botJaba33(s, p)) g.jaba++;
  if (botBid33(s, p)) g.bids++;
  if (botLot33(s, p)) g.lots++;
  if (botHouse33(s, p)) g.house++;
  if (botHome33(s, p)) g.homes++;
  if (botVit33(s)) g.vit++;
  for (const r of BOT_RULES33) if (r.on(s) && r.run(s, p)) g.x[r.id] = (g.x[r.id] ?? 0) + 1;
}
