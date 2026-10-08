// Marcas (GDD §21, §37, §42.7): merch, licenciamento, patrocínio com exclusividade e sync em
// cinema, TV, jogos e comerciais. Master e composição aprovam separadamente; artista com
// autonomia e pouca confiança pode recusar publicidade.

import { clamp, type Rng } from '../core/rng';
import { l, type L } from '../data/world';
import type { Act, GameState } from './types';
import type { BrandDeal } from './xtypes';
import { fmtL, hasTech, money, nextId, notify, playerActs, post, remember } from './util';

export interface BrandDef {
  name: string;
  realRef?: string;
  kind: 'sponsor' | 'sync_film' | 'sync_tv' | 'sync_game' | 'sync_ad' | 'license';
  from: number;
  to: number;
  image: 'family' | 'edgy' | 'luxury' | 'youth' | 'tech';
  budget: number; // dólares base
}

const B = (name: string, kind: BrandDef['kind'], from: number, to: number, image: BrandDef['image'], budget: number, realRef?: string): BrandDef => ({ name, kind, from, to, image, budget, realRef });

export let BRANDS: BrandDef[] = [
  B('Cola Estrela', 'sponsor', 1930, 2040, 'family', 18000, 'Coca-Cola'),
  B('Pepsy', 'sponsor', 1950, 2040, 'youth', 15000, 'Pepsi'),
  B('Corsa Motors', 'sync_ad', 1950, 2040, 'luxury', 12000),
  B('Swoosh Athletics', 'sponsor', 1975, 2040, 'youth', 25000, 'Nike'),
  B('Ápice Tecnologia', 'sync_ad', 1985, 2040, 'tech', 20000, 'Apple'),
  B('Estúdios Aurora', 'sync_film', 1930, 2040, 'family', 9000, 'Hollywood'),
  B('Celuloide Filmes', 'sync_film', 1960, 2040, 'edgy', 11000),
  B('Rede Globalis', 'sync_tv', 1955, 2040, 'family', 9000, 'Rede Globo (novelas)'),
  B('Netstream Séries', 'sync_tv', 2012, 2040, 'youth', 15000, 'Netflix'),
  B('Pixelforge Games', 'sync_game', 1995, 2040, 'youth', 11000, 'EA Games'),
  B('Rockstride Interactive', 'sync_game', 2000, 2040, 'edgy', 16000, 'Rockstar'),
  B('Maison Lumière', 'sponsor', 1960, 2040, 'luxury', 30000, 'Chanel'),
  B('Rádio Vitrola', 'license', 1925, 1970, 'family', 4000),
  B('Neurolink Wear', 'sponsor', 2032, 2040, 'tech', 40000),
];

export function setBrands(list: BrandDef[]): void {
  if (list.length) BRANDS = list;
}

function brandFit(act: Act, b: BrandDef): number {
  const edgy = act.positioning < 35;
  if (b.image === 'family' && edgy) return 0.6;
  if (b.image === 'edgy' && !edgy) return 0.8;
  if (b.image === 'luxury' && act.fame < 40) return 0.5;
  return 1;
}

/** Ofertas surgem a partir de trajetória e contatos; ficam na mesa por um mês. */
function offersMonth(s: GameState, r: Rng): void {
  for (const id of playerActs(s)) {
    const act = s.acts[id];
    if (act.cancelledUntil && act.cancelledUntil > s.week) continue;
    if (act.fame < 12) continue;
    if (!r.chance(0.06 + act.fame / 600 + act.networking / 400)) continue;
    const pool = BRANDS.filter((b) => s.year >= b.from && s.year <= b.to && (b.kind !== 'sync_game' || hasTech(s, 'internet') || s.year >= 1995));
    const b = r.pick(pool);
    if (!b) continue;
    const exclusive = s.deals.some((d) => d.actId === id && d.kind === 'sponsor' && d.status === 'active' && d.exclusive);
    if (b.kind === 'sponsor' && exclusive) continue;
    const song = act.songs.map((x) => s.songs[x]).filter((x) => x?.releaseId).sort((a, c) => c.q - a.q)[0];
    if (b.kind.startsWith('sync') && !song) continue;
    const fee = money(s, b.budget * (0.4 + act.fame / 120) * brandFit(act, b) * r.float(0.8, 1.2));
    s.deals.push({ id: nextId(s, 'bd'), actId: id, brand: b.name, kind: b.kind === 'license' ? 'license' : b.kind, fee, songId: song?.id, untilWeek: s.week + 5, exclusive: b.kind === 'sponsor', status: 'offered', boost: b.kind === 'sync_film' ? 0.6 : b.kind === 'sync_game' ? 0.5 : b.kind === 'sync_tv' ? 0.7 : 0.3 });
    notify(s, fmtL(l('{b} quer {a} ({k}). Veja Marcas.', '{b} wants {a} ({k}). See Brands.'), { b: b.name, a: act.name, k: dealKindName(b.kind) }), 'event');
  }
}

export function dealKindName(k: BrandDeal['kind'] | BrandDef['kind']): L {
  return ({
    sponsor: l('patrocínio', 'sponsorship'), merch: l('merch', 'merch'), license: l('licenciamento', 'licensing'),
    sync_film: l('sync em filme', 'film sync'), sync_tv: l('sync em série/novela', 'TV sync'), sync_game: l('sync em jogo', 'game sync'), sync_ad: l('sync em comercial', 'ad sync'),
  } as Record<string, L>)[k] ?? l(k);
}

export function acceptDeal(s: GameState, r: Rng, dealId: string, counter = false): L {
  const d = s.deals.find((x) => x.id === dealId && x.status === 'offered');
  if (!d) return l('Oferta expirada.', 'Offer expired.');
  const act = s.acts[d.actId];
  const c = act?.contractId ? s.contracts[act.contractId] : undefined;
  // artista com autonomia e pouca confiança recusa publicidade
  if ((d.kind === 'sync_ad' || d.kind === 'sponsor') && c?.creativeControl && act.trust < 40 && !act.playerBand) {
    d.status = 'declined';
    return l('O artista vetou: não quer o nome ligado a essa marca.', 'The artist vetoed it: they do not want their name tied to that brand.');
  }
  if (counter) {
    if (r.chance(0.45)) d.fee = Math.round(d.fee * 1.3);
    else {
      d.status = 'declined';
      return l('A marca recusou a contraproposta e saiu da mesa.', 'The brand rejected the counter and walked away.');
    }
  }
  d.status = 'active';
  d.untilWeek = s.week + (d.kind === 'sponsor' ? 52 : d.kind === 'license' ? 52 : 52);
  // master 75% / composição 25% (sync), recebidos pelo dono de cada direito
  const masterShare = act.playerBand || c?.party === 'player' ? 0.75 : 0;
  const pubShare = act.playerBand || (c?.party === 'player' && c.publishing) || s.ownPublishing ? 0.25 : 0;
  const mine = d.kind.startsWith('sync') ? Math.round(d.fee * (masterShare + pubShare)) : act.playerBand ? d.fee : Math.round(d.fee * (c?.model === '360' ? c.share360 : 0.15));
  post(s, `deal:${d.id}`, mine, d.kind.startsWith('sync') ? 'sync' : 'brands', `${d.brand} — ${act.name}`);
  if (!act.playerBand) act.cash += d.fee - mine;
  // impulso de consumo é efeito separado da taxa (GDD §21)
  if (d.songId) {
    const rel = s.releases[s.songs[d.songId]?.releaseId ?? ''];
    if (rel) {
      if (!rel.live) {
        rel.live = true;
        rel.week = s.week - 53;
        rel.appeal *= 0.2;
      }
      rel.appeal *= 1 + d.boost * r.float(0.2, 1.5);
    }
  }
  if (d.kind === 'sponsor') {
    act.fans.casual += Math.round(d.fee / money(s, 4));
    const purist = act.members.some((id) => s.persons[id]?.traits.includes('purist'));
    if (purist) {
      act.trust = clamp(act.trust - 6, 0, 100);
      const f = s.fandoms[act.id];
      if (f) f.superfans = Math.round(f.superfans * 0.92);
    }
  }
  remember(s, 'deal', fmtL(l('{a} fecha {k} com {b}.', '{a} closes a {k} deal with {b}.'), { a: act.name, k: dealKindName(d.kind), b: d.brand }), { actId: act.id });
  return l('Acordo fechado.', 'Deal closed.');
}

export function declineDeal(s: GameState, dealId: string): void {
  const d = s.deals.find((x) => x.id === dealId);
  if (d && d.status === 'offered') d.status = 'declined';
}

// ---------- Merch ----------

export function produceMerch(s: GameState, actId: string, units: number, quality: number): L | null {
  const act = s.acts[actId];
  if (!act || (act.owner !== 'player' && !act.playerBand)) return l('Ato não é seu.', 'Not your act.');
  const c = act.contractId ? s.contracts[act.contractId] : undefined;
  if (!act.playerBand && c?.model !== '360') return l('Merch do artista só com contrato 360.', 'Artist merch requires a 360 deal.');
  const unit = money(s, 2 + quality / 25);
  const cost = unit * units + money(s, 300);
  if (s.player.cash < cost) return l('Caixa insuficiente.', 'Not enough cash.');
  post(s, `merch:${actId}:${units}`, -cost, 'merch', `Merch ${act.name}`);
  const m = (s.merch[actId] ??= { actId, stock: 0, designs: 0, sold: 0, revenue: 0, quality: 40 });
  m.stock += units;
  m.designs += 1;
  m.quality = Math.round((m.quality + quality) / 2);
  return null;
}

/** Venda online/lojas de merch (shows vendem em tours.ts). */
function merchMonth(s: GameState): void {
  for (const m of Object.values(s.merch)) {
    const act = s.acts[m.actId];
    if (!act || m.stock <= 0) continue;
    const demand = Math.round((act.fans.core * 0.03 + act.fans.active * 0.004) * (0.5 + m.quality / 100) * (hasTech(s, 'internet') ? 1.5 : 1));
    const sold = Math.min(m.stock, demand);
    if (!sold) continue;
    m.stock -= sold;
    m.sold += sold;
    const rev = sold * money(s, 8 + m.quality / 10);
    m.revenue += rev;
    const c = act.contractId ? s.contracts[act.contractId] : undefined;
    const share = act.playerBand ? 1 : c?.model === '360' ? Math.max(0.3, c.share360) : 0;
    if (share) post(s, `merchsales:${m.actId}`, Math.round(rev * share), 'merch', `Merch ${act.name}`);
    if (share < 1) act.cash += Math.round(rev * (1 - share));
  }
}

export function brandsMonth(s: GameState, r: Rng): void {
  offersMonth(s, r);
  merchMonth(s);
  for (const d of s.deals) {
    if (d.status === 'offered' && d.untilWeek < s.week) d.status = 'declined';
    if (d.status === 'active' && d.untilWeek < s.week) d.status = 'done';
    // patrocínio com cancelamento ativo: marca rompe
    const act = s.acts[d.actId];
    if (d.status === 'active' && act?.cancelledUntil && act.cancelledUntil > s.week && d.kind === 'sponsor') {
      d.status = 'done';
      notify(s, fmtL(l('{b} rompeu o patrocínio de {a}.', '{b} dropped its sponsorship of {a}.'), { b: d.brand, a: act.name }), 'bad');
    }
  }
  s.deals = s.deals.filter((d) => d.status === 'offered' || d.status === 'active' || s.week - d.untilWeek < 26).slice(-40);
}
