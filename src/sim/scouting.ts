// Descoberta, A&R e scouting em cinco graus (GDD §10).

import { clamp, type Rng } from '../core/rng';
import { CITIES, cityById, familyOf, l, type L } from '../data/world';
import { actTalent } from './people';
import type { Act, GameState, Knowledge } from './types';
import { addSignal, spawnProceduralAct, talentScore } from './worldgen';
import { fmtL, hasCard, hasTech, money, notify, post, rngOf, staffCount, staffSkill } from './util';

export const DEGREES: L[] = [
  l('Rumor', 'Rumor'),
  l('Observação', 'Observation'),
  l('Acompanhamento', 'Follow-up'),
  l('Audição ou conversa', 'Audition or talk'),
  l('Convivência', 'Close contact'),
];

export const STAGES: Record<Knowledge['stage'], L> = {
  signal: l('Sinais', 'Signals'),
  monitoring: l('Monitorando', 'Monitoring'),
  investigating: l('Investigando', 'Investigating'),
  offer: l('Oferta', 'Offer'),
  negotiation: l('Negociação', 'Negotiation'),
};

export function scoutActionsPerMonth(s: GameState): number {
  return 1 + staffCount(s, 'anr') + (hasCard(s, 'prospector') ? 1 : 0) + (s.player.hq >= 2 ? 1 : 0);
}

function widthFor(s: GameState, degree: number, base: number[]): number {
  let w = base[clamp(degree, 1, 5) - 1];
  w *= 1 - staffSkill(s, 'anr') / 300;
  if (hasCard(s, 'prospector')) w *= 0.8;
  return w;
}

export interface Range { lo: number; hi: number; mid: number }

/** Intervalo estimado; null = campo ainda oculto neste grau. */
export function estimate(s: GameState, actId: string, field: 'potential' | 'talent' | 'fame' | 'skill', skill?: keyof Act['fans'] | string): Range | null {
  const k = s.knowledge[actId];
  const act = s.acts[actId];
  if (!act) return null;
  const deg = k?.degree ?? 0;
  if (act.owner === 'player') {
    // atos próprios: convivência
    const v = trueValue(s, act, field, skill);
    return { lo: v - 2, hi: v + 2, mid: v };
  }
  if (deg === 0) return null;
  if (field === 'potential' && deg < 3) return null;
  if ((field === 'talent' || field === 'skill') && deg < 2) return null;
  const v = trueValue(s, act, field, skill);
  const widths = field === 'fame' ? [16, 10, 6, 4, 2] : field === 'potential' ? [40, 30, 20, 11, 5] : [40, 26, 15, 8, 3];
  const w = widthFor(s, deg, widths);
  const bias = (k?.bias ?? 0) * (w / 30);
  const mid = clamp(v + bias, 0, 100);
  return { lo: Math.round(clamp(mid - w / 2, 0, 100)), hi: Math.round(clamp(mid + w / 2, 0, 100)), mid: Math.round(mid) };
}

function trueValue(s: GameState, act: Act, field: string, skill?: string): number {
  if (field === 'potential') return act.potential;
  if (field === 'fame') return act.fame;
  if (field === 'talent') return talentScore(s, act);
  if (field === 'skill' && skill) return (actTalent(s, act) as Record<string, number>)[skill] ?? 0;
  return 0;
}

export function visibleFields(degree: number): { skills: boolean; potential: boolean; ambition: boolean; traits: boolean; private: boolean } {
  return { skills: degree >= 2, potential: degree >= 3, ambition: degree >= 3, traits: degree >= 4, private: degree >= 5 };
}

export function scoutCost(s: GameState, degree: number): number {
  return money(s, [150, 300, 700, 1200, 2000][clamp(degree, 1, 5) - 1]);
}

export function canScout(s: GameState, actId: string): { ok: boolean; reason?: L } {
  const k = s.knowledge[actId];
  if (!k) return { ok: false };
  if (s.scoutActionsUsed >= scoutActionsPerMonth(s)) return { ok: false, reason: l('Sem ações de scouting neste mês.', 'No scouting actions left this month.') };
  if (k.degree >= 4 && s.acts[actId]?.owner !== 'player') return { ok: false, reason: l('Convivência só com contrato ou após meses de negociação.', 'Close contact only after signing or months of negotiation.') };
  if (k.degree >= 5) return { ok: false };
  if (s.player.cash < scoutCost(s, k.degree)) return { ok: false, reason: l('Caixa insuficiente.', 'Not enough cash.') };
  return { ok: true };
}

export function scoutAct(s: GameState, actId: string): boolean {
  const chk = canScout(s, actId);
  if (!chk.ok) return false;
  const k = s.knowledge[actId];
  const cost = scoutCost(s, k.degree);
  post(s, `scout:${actId}:${k.degree}`, -cost, 'scouting', `Scouting ${s.acts[actId].name}`);
  s.scoutActionsUsed += 1;
  k.degree += 1;
  k.updatedWeek = s.week;
  // relatório novo pode discordar do anterior
  const r = rngOf(s);
  k.bias = k.bias * 0.6 + r.normal(0, 3);
  if (k.stage === 'signal' && k.degree >= 2) k.stage = 'monitoring';
  if (k.degree >= 3 && (k.stage === 'monitoring' || k.stage === 'signal')) k.stage = 'investigating';
  return true;
}

export function dropSignal(s: GameState, actId: string): void {
  if (s.acts[actId]?.owner === 'player') return;
  delete s.knowledge[actId];
}

const SOURCES: { id: string; name: L; from?: string; fromYear?: number }[] = [
  { id: 'clubs', name: l('clubes e bares', 'clubs and bars') },
  { id: 'contest', name: l('concurso de calouros', 'talent contest') },
  { id: 'demo', name: l('demo enviada', 'submitted demo') },
  { id: 'local_radio', name: l('rádio local', 'local radio'), from: 'radio' },
  { id: 'tv_talent', name: l('programa de talentos na TV', 'TV talent show'), fromYear: 2002 },
  { id: 'referral', name: l('indicação de produtor', 'producer referral') },
  { id: 'showcase', name: l('showcase de feira', 'trade showcase'), fromYear: 1967 },
  { id: 'viral', name: l('viralização em plataforma', 'platform virality'), from: 'streaming' },
  { id: 'scene', name: l('cena da cidade', 'city scene') },
];

export function sourceName(id: string): L {
  return SOURCES.find((x) => x.id === id)?.name ?? l(id);
}

/** Sinais que chegam a cada mês (fontes por era e mercado). */
export function monthlySignals(s: GameState, r: Rng): void {
  if (s.config.role === 'artist') return;
  const homeMarket = cityById[s.config.homeCity]?.market;
  const sources = SOURCES.filter((x) => (!x.from || hasTech(s, x.from)) && (!x.fromYear || s.year >= x.fromYear));
  const n = 1 + Math.min(3, staffCount(s, 'anr')) + (r.chance(0.5) ? 1 : 0);
  const candidates = Object.values(s.acts).filter((a) => !a.owner && (a.status === 'emerging' || a.status === 'active') && !s.knowledge[a.id]);
  for (let i = 0; i < n; i++) {
    const src = r.pick(sources);
    const act = r.weighted(candidates, (a) => {
      const vis = a.archetype === 'genius' ? 0.08 : 1;
      const local = cityById[a.city]?.market === homeMarket ? 3 : s.player.territories.includes(cityById[a.city]?.market) ? 1.2 : 0.25;
      const viral = src.id === 'viral' ? 1 + a.momentum / 30 : 1;
      return vis * local * viral * (1 + a.fame / 10) * (a.catalogNo ? 1.5 : 1);
    });
    if (act && !s.knowledge[act.id]) {
      addSignal(s, r, act.id, src.id);
      candidates.splice(candidates.indexOf(act), 1);
    }
  }
  // pedidos de scout: formulário estruturado, sem texto livre (GDD §10)
  for (const req of s.scoutRequests.splice(0)) {
    const matches = Object.values(s.acts).filter((a) => {
      if (a.owner || s.knowledge[a.id]) return false;
      if (req.genreFamily !== 'any' && familyOf(a.genre) !== req.genreFamily) return false;
      if (req.market !== 'any' && cityById[a.city]?.market !== req.market) return false;
      if (req.level === 'beginner' && a.fame > 8) return false;
      if (req.level === 'promising' && (a.fame < 3 || a.fame > 25)) return false;
      if (req.level === 'established' && a.fame < 15) return false;
      if (req.role === 'band' && a.members.length < 2) return false;
      if (req.role === 'solo' && a.members.length !== 1) return false;
      return true;
    });
    r.shuffle(matches);
    let found = matches.slice(0, r.int(1, 3));
    if (!found.length) {
      const city = req.market !== 'any' ? r.pick(CITIES.filter((c) => c.market === req.market)).id : undefined;
      const genre = req.genreFamily !== 'any' ? r.pick(Object.keys(s.genrePop).filter((g) => familyOf(g) === req.genreFamily && (s.genrePop[g] ?? 0) > 0.3)) : undefined;
      const act = spawnProceduralAct(s, r, { city, genre });
      if (req.role === 'band' && act.members.length < 2) act.members = act.members.slice(0, 1);
      found = [act];
    }
    for (const a of found) addSignal(s, r, a.id, 'referral');
    notify(s, fmtL(l('Scouts trouxeram {n} nome(s) do pedido.', 'Scouts brought back {n} name(s) from your request.'), { n: found.length }), 'info');
  }
  // relatórios envelhecem
  for (const k of Object.values(s.knowledge)) {
    if (s.acts[k.actId]?.owner === 'player') continue;
    if (s.week - k.updatedWeek > 52 && k.degree > 1 && r.chance(0.08)) k.degree -= 1;
    if (!s.acts[k.actId] || s.acts[k.actId].status === 'retired') delete s.knowledge[k.actId];
  }
}

export function requestScout(s: GameState, req: { genreFamily: string; market: string; level: string; role: string }): boolean {
  const cost = money(s, 900);
  if (s.player.cash < cost) return false;
  if (s.scoutActionsUsed >= scoutActionsPerMonth(s)) return false;
  s.scoutActionsUsed += 1;
  post(s, `scoutreq:${s.scoutRequests.length}`, -cost, 'scouting', 'Pedido de scout');
  s.scoutRequests.push({ ...req, week: s.week });
  return true;
}
