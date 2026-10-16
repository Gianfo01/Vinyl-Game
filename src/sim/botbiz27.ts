// r27 (AUD1) — o bot jogador (playbot16) também toca os NEGÓCIOS que nunca tocava, quando a conta fecha como para um
// jogador de verdade: salas da sede (hqrooms27), estúdio para alugar (ventures9 + studio12), editora (ventures9),
// casa de shows (uma lista só: venues27 — casa real à venda na região ou um clube construído, com programação) e
// festival próprio (fest12, o festival único). Assim os testes de equilíbrio passam por esses sistemas.
// Regras de prudência: salas a partir do 6º mês, negócios depois do 1º ano, um negócio novo por trimestre, caixa de
// 3–4× o preço e pelo menos 3× o fôlego de corte do perfil depois da compra.
// Só as funções que os botões da interface chamam. Sem aleatoriedade própria (o acaso é o do jogo).

import { ownFests } from './sys/feststore';
import { builtVenue } from './sys/venuestore27';
import { cityById } from '../data/world';
import type { GameState } from './types';
import { money, playerActs } from './util';
import { buyBlocker27, buyRoom27, hqRooms27, hqr27 } from './sys/hqrooms27';
import { foundCost, foundVenture, placeSong, signWriter, upgradeGear, ventures, writerAdvance, writerCandidates, maxGear } from './sys/ventures9';
import { acceptJob, studioOf } from './sys/studio12';
import { buyVenue, setVenueAgenda, venueKind } from './sys/live/venue';
import { addNight12, v12 } from './sys/venue12';
import { buyVenue17, marketVenues, monthEst17, venuePrice } from './sys/venues17';
import { hasVenue27, venueCount27, MAX_VENUES27 } from './sys/venues27';
import { f12, found12, offer12, wantTime } from './sys/fest12';
import { actsNow27 } from './tickcache27';
import { rng19 } from './rng19';

export interface LogBiz27 { rooms: number; studio: number; studioJobs: number; publisher: number; writers: number; placements: number; venue: number; venueNights: number; festival: number; festBookings: number }
export const freshLogBiz27 = (): LogBiz27 => ({ rooms: 0, studio: 0, studioJobs: 0, publisher: 0, writers: 0, placements: 0, venue: 0, venueNights: 0, festival: 0, festBookings: 0 });

type Prof = 'cautious' | 'balanced' | 'aggressive';
interface Ctx { cash: number; burn: number; cut: number }

const runwayAfter = (c: Ctx, cost: number) => (c.cash - cost) / Math.max(1, c.burn);
/** Pode gastar `cost` agora? (o fôlego que sobra é o que um jogador prudente exige) */
const affords = (c: Ctx, cost: number, mult: number) => cost > 0 && c.cash > cost * mult && runwayAfter(c, cost) > c.cut * 3;
const owns = (s: GameState, kind: string) => ventures(s).list.some((v) => v.kind === kind && v.owner === 'label');

// ---------------------------------------------------------------- sede: salas e andares compráveis
function rooms(s: GameState, c: Ctx, L: LogBiz27): void {
  if (hqr27(s).jobs.length) return; // uma obra por vez
  const prio = ['rehearsal', 'archive', 'meeting', 'studioB', 'loungeVip', 'marketing', 'press', 'legal'];
  const units = hqRooms27(s).filter((u) => u.status === 'locked' && !u.blocked).sort((a, b) => (prio.indexOf(a.id) + 99) % 99 - (prio.indexOf(b.id) + 99) % 99 || a.cost - b.cost);
  const u = units.find((x) => x.kind !== 'floor' && affords(c, x.cost, 4) && x.upkeep * 12 < c.cash * 0.1);
  if (u && !buyBlocker27(s, u.id) && !buyRoom27(s, u.id)) L.rooms++;
}

// ---------------------------------------------------------------- estúdio para alugar
function studio(s: GameState, c: Ctx, L: LogBiz27, open: boolean): boolean {
  const v = ventures(s).list.find((x) => x.kind === 'studio' && x.owner === 'label');
  if (!v) {
    if (!open) return false;
    const cost = foundCost(s, 'studio');
    if (playerActs(s).length >= 2 && affords(c, cost, 3) && !foundVenture(s, 'studio', 'label')) { L.studio++; return true; }
    return false;
  }
  // sessões de outros selos: aceita as propostas com o primeiro engenheiro e sala livres
  const x = studioOf(s, v);
  for (const j of x.jobs.filter((b) => b.state === 'proposal')) {
    const busyE = new Set(x.jobs.filter((b) => b.state === 'booked').map((b) => b.eng));
    const busyR = new Set(x.jobs.filter((b) => b.state === 'booked').map((b) => b.room));
    const e = x.engs.find((y) => !busyE.has(y.id)), r = x.rooms.find((y) => !busyR.has(y.id));
    if (!e || !r) break;
    if (!acceptJob(s, v.id, j.id, e.id, r.id)) L.studioJobs++;
  }
  if ((v.gear ?? 0) < maxGear(s) && affords(c, money(s, 15000 * ((v.gear ?? 0) + 1)), 6)) upgradeGear(s, v.id);
  return false;
}

// ---------------------------------------------------------------- editora
function publisher(s: GameState, c: Ctx, L: LogBiz27, open: boolean): boolean {
  const v = ventures(s).list.find((x) => x.kind === 'publisher' && x.owner === 'label');
  if (!v) {
    if (!open) return false;
    const cost = foundCost(s, 'publisher');
    if (affords(c, cost, 3) && !foundVenture(s, 'publisher', 'label')) { L.publisher++; return true; }
    return false;
  }
  const r = rng19(s, 'act');
  if ((v.writers?.length ?? 0) < 2 + v.level * 2 && s.month % 3 === 0) {
    const w = writerCandidates(s, v.id).find((x) => writerAdvance(s, x.skill) < c.cash * 0.02);
    if (w && signWriter(s, r, v.id, w.pid).ok) L.writers++;
  }
  const w = v.writers?.[0];
  if (w && (v.cool ?? 0) <= s.week) {
    const a = actsNow27(s).filter((x) => (x.status === 'active' || x.status === 'emerging') && x.members.length && x.fame >= 10 && x.fame < 50).sort((p, q) => q.fame - p.fame)[0];
    if (a && placeSong(s, r, v.id, w.pid, a.id).ok) L.placements++;
  }
  return false;
}

// ---------------------------------------------------------------- casa de shows (lista única venues27)
function venue(s: GameState, p: Prof, c: Ctx, L: LogBiz27, open: boolean): boolean {
  if (!hasVenue27(s) && venueCount27(s) < MAX_VENUES27) {
    if (!open) return false;
    // 1) casa real à venda na região (a mesma conta da tela: retorno anual da curadoria)
    const home = cityById[s.config.homeCity]?.market;
    let best: { id: string; v: number } | null = null;
    for (const d of marketVenues(s)) {
      if (d.buyable === false || cityById[d.city]?.market !== home) continue;
      const price = venuePrice(s, d);
      if (!affords(c, price, 3)) continue;
      const est = monthEst17(s, { id: d.id, rep: d.prestige * 0.7, policy: 'curated', price: 'mid', cond: 80, maint: true, y: s.year, paid: price, booked: [], total: 0 });
      const v = (est.net * 12) / price;
      if (est.net > 0 && v > (p === 'aggressive' ? 0.05 : 0.08) && (!best || v > best.v)) best = { id: d.id, v };
    }
    if (best && !buyVenue17(s, best.id)) { L.venue++; return true; }
    // 2) senão, um clube na cidade (casa construída da carreira de shows)
    const price = money(s, venueKind('club').price);
    if (affords(c, price, 3) && playerActs(s).length >= 2) {
      const r = buyVenue(s, 'club', s.config.homeCity, '');
      if (!('pt' in r)) {
        const act = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.fame >= 5).sort((a, b) => b.fame - a.fame)[0];
        setVenueAgenda(s, 12, act?.id, act ? 2 : 0);
        L.venue++;
        return true;
      }
    }
    return false;
  }
  // programação da casa construída: uma noite autoral às sextas com divisão de porta (a cena gosta)
  const x = builtVenue(s) ? v12(s) : null;
  if (x && !x.prog.length && !addNight12(s, { k: 'original', day: 'fri', deal: 'door' })) L.venueNights++;
  return false;
}

// ---------------------------------------------------------------- festival próprio (fest12)
function festival(s: GameState, c: Ctx, L: LogBiz27, open: boolean): boolean {
  const f = ownFests(s)[0];
  const acts = playerActs(s).map((id) => s.acts[id]).filter((a) => a && a.fame >= 12);
  if (!f) {
    if (!open) return false;
    const cost = foundCost(s, 'festival');
    if (acts.length >= 2 && s.year >= 1950 && affords(c, cost, 4) && !owns(s, 'festival')) {
      const r = found12(s, 'label', { month: (s.month + 6) % 12, ident: 'discovery' });
      if (!('pt' in r)) { L.festival++; return true; }
    }
    return false;
  }
  // line-up com os atos da casa (sem cachê de mercado: preço da casa), na posição que cada um quer
  const x = f12(s, f);
  for (const a of acts.slice(0, 3)) {
    if (x.deals[a.id] || f.lineup.some((y) => y.actId === a.id)) continue;
    const used = new Set(Object.values(x.deals).map((d) => `${d.stage}:${d.time}`));
    let slot: { stage: number; time: number } | undefined;
    for (let t = wantTime(a); t >= 0 && !slot; t--) if (!used.has(`0:${t}`)) slot = { stage: 0, time: t };
    if (slot && offer12(s, f.id, a.id, { ...slot, len: 60, excl: false, fee: 0 }).res === 'yes') L.festBookings++;
  }
  return false;
}

/** Um mês de negócios do bot. `cut` = meses de fôlego do perfil. */
export function playBiz27(s: GameState, p: Prof, o: Ctx, L: LogBiz27): void {
  if (s.config.role === 'artist' || p === 'cautious') return;
  const months = (s.year - s.config.startYear) * 12 + s.month;
  if (months >= 6) rooms(s, o, L);
  if (months < 12) return;
  // um negócio novo por trimestre (no máximo); os que já existem são tocados todo mês
  let open = s.month % 3 === 2;
  for (const fn of [(x: boolean) => venue(s, p, o, L, x), (x: boolean) => publisher(s, o, L, x), (x: boolean) => studio(s, o, L, x), (x: boolean) => festival(s, o, L, x)]) if (fn(open)) open = false;
}
