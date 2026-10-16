// Descoberta, A&R e scouting em cinco graus (GDD §10): o CONHECIMENTO (graus, estimativas com névoa, origem) e o
// boca a boca mensal. r27 (AUD1): os verbos ativos (viagens, missões, pedido com filtros e o próximo passo do funil)
// vivem num motor só, src/sim/sys/scout23.ts — o aprofundar na hora e o pedido de scout daqui foram absorvidos lá.

import { signalEligible20 } from './scout20';
import { clamp, type Rng } from '../core/rng';
import { cityById, l, type L } from '../data/world';
import { actTalent } from './people';
import type { Act, GameState, Knowledge } from './types';
import { addSignal, talentScore } from './worldgen';
import { perk } from './perks';
import { hasTech, money, rngOf, staffCount } from './util';
import { actsNow27 } from './tickcache27';
import { KNOW_WIDTHS, band, know } from './know';

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
  return 3 + staffCount(s, 'anr') + s.scouts.length + (s.player.hq >= 2 ? 1 : 0) + (s.flags.scoutBonus ?? 0) + Math.round(perk(s, 'scoutActions'));
}

export interface Range { lo: number; hi: number; mid: number }

/**
 * Intervalo estimado; null = campo ainda oculto. r31 (W0-KN): grau, eixo (público/privado) e largura vêm de
 * know.ts (tabela única); a faixa nunca é centrada no valor real (desvio determinístico + viés do olheiro).
 */
export function estimate(s: GameState, actId: string, field: 'potential' | 'talent' | 'fame' | 'skill', skill?: keyof Act['fans'] | string): Range | null {
  const act = s.acts[actId];
  if (!act) return null;
  const k = know(s, actId);
  const v = trueValue(s, act, field, skill);
  const b = band(s, actId, field === 'skill' ? `skill.${skill ?? ''}` : field, v, k.width(field), { bias: k.mine || !KNOW_WIDTHS[field].scouted ? 0 : s.knowledge[actId]?.bias ?? 0 });
  return b ? { lo: b.lo, hi: b.hi, mid: b.mid } : null;
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
  return money(s, [80, 200, 450, 900, 1500][clamp(degree, 1, 5) - 1]);
}

/** Põe no radar (grau 1) um ato visto na busca, nas paradas ou num show. */
export function watchAct(s: GameState, actId: string): boolean {
  const a = s.acts[actId];
  if (!a || a.owner === 'player' || s.knowledge[actId]) return false;
  s.knowledge[actId] = { actId, degree: 1, stage: 'monitoring', bias: rngOf(s).normal(0, 6), updatedWeek: s.week, source: 'watch' };
  return true;
}

/** Mantém as colunas Oferta/Negociação coerentes com as ofertas e tira do pipeline quem já assinou com rivais. */
export function syncPipeline(s: GameState): void {
  for (const k of Object.values(s.knowledge)) {
    const a = s.acts[k.actId];
    if (!a || a.owner === 'player') continue;
    const o = s.offers.find((x) => x.actId === k.actId && (x.status === 'pending' || x.status === 'counter'));
    if (o) k.stage = o.status === 'counter' ? 'negotiation' : 'offer';
    else if (k.stage === 'offer' || k.stage === 'negotiation') k.stage = k.degree >= 3 ? 'investigating' : 'monitoring';
  }
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
  { id: 'watch', name: l('você mesmo', 'yourself') },
  { id: 'scout', name: l('olheiro', 'scout') },
  // rodada 16: indicação de amigo (lazer) — só por ligação, nunca sorteada como fonte mensal
  { id: 'friend', name: l('indicação de amigo', 'friend\'s tip'), fromYear: 99999 },
  // r23: viagem de olheiro a uma cena (só por ação ativa)
  { id: 'scene23', name: l('viagem de olheiro', 'scouting trip'), fromYear: 99999 },
  // r27: noite de olheiro jogável (night27) — só por ação ativa
  { id: 'night27', name: l('noite de olheiro', 'scouting night'), fromYear: 99999 },
];

export function sourceName(id: string): L {
  return SOURCES.find((x) => x.id === id)?.name ?? l(id);
}

/** r23: fontes do "boca a boca" (sinais passivos) disponíveis nesta época. */
export function passiveSources23(s: GameState): { id: string; name: L }[] {
  return SOURCES.filter((x) => (!x.from || hasTech(s, x.from)) && (!x.fromYear || s.year >= x.fromYear));
}
/** r23: quantos nomes o boca a boca traz por mês (faixa; A&R e bônus aumentam). */
export function passiveCount23(s: GameState): { lo: number; hi: number } {
  const lo = Math.max(0, 1 + Math.min(3, staffCount(s, 'anr')) + Math.round(perk(s, 'signals')));
  return { lo, hi: lo + 1 };
}

/** Sinais que chegam a cada mês (fontes por era e mercado). */
export function monthlySignals(s: GameState, r: Rng): void {
  if (s.config.role === 'artist') return;
  const homeMarket = cityById[s.config.homeCity]?.market;
  const sources = passiveSources23(s);
  const n = Math.max(0, passiveCount23(s).lo + (r.chance(0.5) ? 1 : 0));
  const candidates = actsNow27(s).filter((a) => signalEligible20(s, a)); // r20 (B9): elegibilidade central
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
  // relatórios envelhecem
  for (const k of Object.values(s.knowledge)) {
    if (s.acts[k.actId]?.owner === 'player') continue;
    if (s.week - k.updatedWeek > 52 && k.degree > 1 && r.chance(0.08)) k.degree -= 1;
    if (!s.acts[k.actId] || s.acts[k.actId].status === 'retired' || s.acts[k.actId].status === 'split') delete s.knowledge[k.actId]; // r20 (B9): fora do radar quem não é contratável
  }
}
