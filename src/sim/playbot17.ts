// Rodada 17 — o bot jogador também usa os sistemas novos quando um jogador de verdade usaria:
// canais de lançamento da época (padrão aplicado a cada lançamento), merch quando o contrato permite,
// uma casa de shows se a conta fecha, resposta a boatos sobre os seus artistas, escolhas nas cenas
// interativas e o envolvimento na carreira (à frente / acompanhando). Sem aleatoriedade própria.

import type { GameState } from './types';
import { playerActs } from './util';
import { careers } from './sys/careers12';
import { setInv, invOf } from './sys/agenda17';
import { feed17, respond, respondOdds } from './sys/media17';
import { canSell, demandOf, m17 as merch, makeBatch, skusNow, unitCost, type Sku } from './sys/merch17';
import { outletsNow, out17, setPreset, type OutId } from './sys/outlets17';
import { options17, s17, choose17 } from './sys/scene17';
import { buyVenue17, marketVenues, monthEst17, v17, venuePrice } from './sys/venues17';
import { cityById } from '../data/world';

export type Prof17 = 'cautious' | 'balanced' | 'aggressive';
export interface Log17 { channels: number; merch: number; venues: number; news: number; scenes: number; inv: number }
export const freshLog17 = (): Log17 => ({ channels: 0, merch: 0, venues: 0, news: 0, scenes: 0, inv: 0 });

/** Canais que cada perfil liga na época (só os que existem no ano). */
const WANT: Record<Prof17, OutId[]> = {
  cautious: ['indie_shops', 'direct', 'streaming', 'mp3_store'],
  balanced: ['streaming', 'mall_chain', 'rack', 'eight_track', 'mp3_store', 'indie_shops'],
  aggressive: ['streaming', 'short_video', 'video', 'record_club', 'mall_chain', 'rack', 'eight_track', 'platform_excl', 'vinyl_special'],
};

function channels(s: GameState, p: Prof17, L: Log17): void {
  if (s.month !== 0 && out17(s).preset.length) return;
  const now = new Set(outletsNow(s).map((o) => o.id));
  const want = WANT[p].filter((id) => now.has(id));
  // exclusivas brigam com o streaming: o agressivo fica com a exclusiva paga quando ela existe
  const pick = want.includes('platform_excl') ? want.filter((x) => x !== 'streaming') : want;
  const ids = pick.slice(0, p === 'cautious' ? 2 : 3);
  if (ids.join() !== out17(s).preset.join()) { setPreset(s, ids); L.channels++; }
}

function merchMonth(s: GameState, p: Prof17, cash: number, L: Log17): void {
  if (p === 'cautious') return;
  for (const id of playerActs(s)) {
    const a = s.acts[id];
    if (!a || a.fame < 12 || canSell(s, a)) continue;
    const sku: Sku | undefined = (['tee', 'poster', 'button'] as Sku[]).find((k) => skusNow(s).includes(k));
    if (!sku) continue;
    const ln = merch(s).lines.find((x) => x.act === id && x.sku === sku && !x.drop);
    const dem = ln ? demandOf(s, ln).units : Math.round(a.fans.active * 0.006);
    if (ln && ln.stock > dem * 2) continue;
    const units = Math.max(50, dem * 3);
    if (unitCost(s, sku, 50) * units > cash * (p === 'aggressive' ? 0.08 : 0.04)) continue;
    if (!makeBatch(s, id, sku, units, 50, 'mid')) L.merch++;
  }
}

function venue(s: GameState, p: Prof17, cash: number, burn: number, L: Log17): void {
  if (p === 'cautious' || v17(s).own.length >= (p === 'aggressive' ? 2 : 1) || s.month % 3 !== 1) return;
  const home = cityById[s.config.homeCity]?.market;
  let best: { id: string; v: number; price: number } | null = null;
  for (const d of marketVenues(s)) {
    if (d.buyable === false || cityById[d.city]?.market !== home) continue;
    const price = venuePrice(s, d);
    if (price > cash * (p === 'aggressive' ? 0.35 : 0.2) || cash - price < burn * 8) continue;
    const est = monthEst17(s, { id: d.id, rep: d.prestige * 0.7, policy: 'curated', price: 'mid', cond: 80, maint: true, y: s.year, paid: price, booked: [], total: 0 });
    const v = est.net * 12 / price; // retorno anual
    if (est.net > 0 && v > (p === 'aggressive' ? 0.08 : 0.15) && (!best || v > best.v)) best = { id: d.id, v, price };
  }
  if (best && !buyVenue17(s, best.id)) L.venues++;
}

function news(s: GameState, p: Prof17, cash: number, L: Log17): void {
  for (const sto of feed17(s, { mine: true, open: true })) {
    if (sto.resp || sto.tone >= 0 || !sto.a) continue;
    let v: 'deny' | 'confirm' | 'silent' | 'kill' | 'sue' = 'silent';
    const od = respondOdds(s, sto.id, 'silent');
    if (od.truth === 1) v = sto.sev >= 45 ? (p === 'aggressive' && respondOdds(s, sto.id, 'kill').cost < cash * 0.05 ? 'kill' : 'confirm') : 'silent';
    else if (od.truth === 0) v = p === 'aggressive' && sto.sev >= 50 && respondOdds(s, sto.id, 'sue').cost < cash * 0.05 ? 'sue' : 'deny';
    if (respond(s, sto.id, v).ok) L.news++;
  }
}

function scenes(s: GameState, p: Prof17, L: Log17): void {
  for (const k of Object.keys(s17(s).pend)) {
    if (!s17(s).pend[k].cs) continue;
    for (let g = 0; g < 4 && s17(s).pend[k]; g++) {
      const o = options17(s, k);
      if (!o?.opts.length) break;
      const min = p === 'cautious' ? 0.65 : p === 'balanced' ? 0.5 : 0.35;
      // ousado: primeira opção que passa no risco do perfil; senão a mais segura; sem chance mostrada, a última (neutra)
      const pick = o.opts.find((x) => x.odds && x.odds.p >= min) ?? [...o.opts].filter((x) => x.odds).sort((a, b) => b.odds!.p - a.odds!.p)[0] ?? o.opts[o.opts.length - 1];
      choose17(s, k, pick.id);
    }
    L.scenes++;
  }
}

function involvement(s: GameState, p: Prof17, energy: number, L: Log17): void {
  if (s.month !== 0 || !careers(s).active.includes('label')) return;
  const want = p === 'aggressive' && energy >= 3 ? 'lead' : 'normal';
  if (invOf(s, 'label') !== want && setInv(s, 'label', want).ok) L.inv++;
}

export function play17(s: GameState, p: Prof17, o: { cash: number; burn: number; energy: number }, L: Log17): void {
  channels(s, p, L);
  scenes(s, p, L);
  news(s, p, o.cash, L);
  involvement(s, p, o.energy, L);
  merchMonth(s, p, o.cash, L);
  venue(s, p, o.cash, o.burn, L);
}
