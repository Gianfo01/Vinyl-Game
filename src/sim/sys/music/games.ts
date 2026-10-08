// Estúdio: foco por etapa da próxima gravação e equipamentos lendários, aplicados (com limite)
// quando a faixa é gravada. Os mini-jogos de composição foram retirados na rodada 5.

import { clamp, type Rng } from '../../../core/rng';
import { familyOf, l, type FamilyId, type L } from '../../../data/world';
import type { GameState, Song } from '../../types';
import { fmtL, money, notify, post } from '../../util';
import { FOCUS_IDEAL, GEAR, STAGES, gearById, type Stage } from './data';
import { ms, songRec, syncSong, type Deltas } from './state';

const fam = (song: Song): FamilyId => familyOf(song.genre);

// ================================================================== foco por etapa

export function normalizeFocus(mix: Partial<Record<Stage, number>>): Record<Stage, number> {
  const keys = Object.keys(STAGES) as Stage[];
  const raw = keys.map((k) => Math.max(0, mix[k] ?? 25));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const out = {} as Record<Stage, number>;
  keys.forEach((k, i) => { out[k] = Math.round((raw[i] / sum) * 100); });
  return out;
}

export function setFocus(s: GameState, actId: string, mix: Partial<Record<Stage, number>>): Record<Stage, number> {
  const f = normalizeFocus(mix);
  ms(s).focus[actId] = f;
  return f;
}

export function focusFit(family: FamilyId, mix: Record<Stage, number>): number {
  const ideal = FOCUS_IDEAL[family];
  let d = 0;
  for (const k of Object.keys(STAGES) as Stage[]) d += Math.abs((mix[k] ?? 25) - ideal[k]);
  return Math.round(clamp(1 - d / 120, 0, 1) * 100) / 100;
}

// ================================================================== equipamentos lendários

export function gearAvailable(s: GameState) {
  return GEAR.filter((g) => s.year >= g.from && s.year <= g.to && !ms(s).gear.includes(g.id));
}

export function buyGear(s: GameState, gearId: string, offerId?: string): L | null {
  const def = gearById[gearId];
  const m = ms(s);
  if (!def) return l('Equipamento inexistente.', 'Unknown gear.');
  if (m.gear.includes(gearId)) return l('Você já tem este equipamento.', 'You already own this gear.');
  const offer = offerId ? m.gearOffers.find((o) => o.id === offerId && o.gearId === gearId) : undefined;
  if (!offer && (s.year < def.from || s.year > def.to)) return l('Ainda não existe nesta época.', 'It does not exist yet in this era.');
  const price = offer ? offer.price : money(s, def.price);
  if (s.player.cash < price) return l('Caixa insuficiente.', 'Not enough cash.');
  if (!post(s, `x4gear:${gearId}`, -price, 'equipment', `Equipamento lendário: ${def.name.pt}`)) return l('Compra já registrada nesta semana.', 'Purchase already booked this week.');
  m.gear.push(gearId);
  if (offer) m.gearOffers = m.gearOffers.filter((o) => o !== offer);
  return null;
}

export function gearDeltas(s: GameState, song: Song): Deltas {
  const f = fam(song);
  const tierF = (song.studioTier ?? 1) === 0 ? 1 : 0.5;
  const d: Deltas = { production: 0, performance: 0, originality: 0 };
  for (const id of ms(s).gear) {
    const g = gearById[id];
    if (!g) continue;
    const fit = g.families.includes(f) ? 1 : 0.4;
    d.production! += g.prod * fit * tierF;
    d.performance! += g.perf * fit * tierF;
    d.originality! += g.orig * fit * tierF;
  }
  return d;
}

/** Ofertas de massa falida: selos fechados vendem seu equipamento com desconto. */
export function gearOffersMonth(s: GameState, r: Rng): void {
  const m = ms(s);
  m.gearOffers = m.gearOffers.filter((o) => o.expires > s.week);
  for (const lb of Object.values(s.labels)) {
    if (lb.active || m.seenLabels.includes(lb.id)) continue;
    m.seenLabels.push(lb.id);
    if (m.seenLabels.length > 60) m.seenLabels.shift();
    const opts = GEAR.filter((g) => s.year >= g.from && !m.gear.includes(g.id) && !m.gearOffers.some((o) => o.gearId === g.id));
    if (!opts.length || !r.chance(0.6)) continue;
    const g = r.pick(opts);
    m.gearOffers.push({ id: `go${s.week}-${g.id}`, gearId: g.id, from: lb.name, price: Math.round(money(s, g.price) * 0.45), expires: s.week + 12 });
    notify(s, fmtL(l('Leilão da massa falida de {lb}: {g} com 55% de desconto (Criação → Estúdio).', '{lb} bankruptcy auction: {g} at 55% off (Creation → Studio).'), { lb: lb.name, g: def(g.id) }), 'info');
  }
  if (m.gearOffers.length > 6) m.gearOffers = m.gearOffers.slice(-6);
}
const def = (id: string): L => gearById[id]?.name ?? l('equipamento', 'gear');

// ================================================================== gravação: aplica foco, equipamento e bônus pendentes

export function onRecorded(s: GameState, song: Song): void {
  const rec = songRec(s, song.id);
  if (rec.recSeen) return;
  const act = s.acts[song.actId];
  const f = fam(song);
  const focus = act ? ms(s).focus[act.id] : undefined;
  if (focus) {
    const fit = focusFit(f, focus);
    const b = (fit - 0.6) * 10;
    rec.b.focus = { performance: clamp(b, -4, 4), production: clamp(b, -4, 4), melody: clamp((focus.comp - 25) / 25 * fit, -1, 2) };
    const fl = (ms(s).focusLearn[f] ??= { tries: 0, best: 0, last: 0 });
    fl.tries += 1;
    fl.last = fit;
    if (fit > fl.best) { fl.best = fit; fl.bestMix = { ...focus }; }
  }
  const g = gearDeltas(s, song);
  if ((g.production ?? 0) || (g.performance ?? 0) || (g.originality ?? 0)) rec.b.gear = { production: clamp(g.production ?? 0, 0, 6), performance: clamp(g.performance ?? 0, 0, 3), originality: clamp(g.originality ?? 0, -2, 4) };
  syncSong(s, song.id);
}
