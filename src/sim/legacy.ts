// Legado em 7 dimensões, prêmios, metas visíveis, Cartas do Selo e os 20 finais (GDD §22).

import { clamp, type Rng } from '../core/rng';
import { toReal } from '../core/money';
import { HQ_LEVELS } from '../data/rules';
import { l, type L } from '../data/world';
import type { GameState, Release } from './types';
import { fmtL, hasCard, notify, remember, sum } from './util';
import { hqCaps } from './branches';

export function updateLegacy(s: GameState): void {
  const p = s.player;
  const totalRevenueReal = Object.entries(p.revenueByYear).reduce((t, [y, v]) => t + toReal(v, Number(y)), 0);
  const mine = Object.values(s.releases).filter((r) => r.owner === 'player' || s.acts[r.actId]?.playerBand);
  const developed = Object.values(s.acts).filter((a) => (a.owner === 'player' || s.memory.some((m) => m.actId === a.id && m.kind === 'signed')) && a.fame > 35).length;
  const legends = Object.values(s.acts).filter((a) => a.legend && (a.owner === 'player' || a.playerBand)).length;
  const share = s.stats.marketShare;
  const L = p.legacy;
  L.commercial = clamp(Math.log10(1 + totalRevenueReal) * 12 - 30, 0, 100);
  L.cultural = clamp(p.stats.number1s * 5 + p.stats.awards * 6 + p.reputation.artistic * 0.4 + (s.flags.movement ? 12 : 0), 0, 100);
  L.artists = clamp(developed * 7 + legends * 10 + p.reputation.artists * 0.35 - p.stats.leftUnhappy * 3, 0, 100);
  L.innovation = clamp(L.innovation * 0.995 + (p.neural.synthActs > 0 ? 0.2 : 0), 0, 100);
  L.industry = clamp(share * 250 + p.territories.length * 4 + p.hq * 6, 0, 100);
  L.catalog = clamp(mine.filter((r) => r.totalUnits > 100000).length * 4 + p.reissues * 2 + mine.length * 0.3, 0, 100);
  L.reputation = clamp((p.reputation.artistic + p.reputation.commercial + p.reputation.artists + p.reputation.institutional) / 4, 0, 100);
}

/** Gramófonos de Ouro em dezembro: 4 categorias, reconhecimento sem bônus universal. */
export function yearlyAwards(s: GameState, r: Rng): void {
  const year = s.year;
  const rels = Object.values(s.releases).filter((x) => x.year === year && x.totalUnits > 0);
  if (!rels.length) return;
  const winner = (list: Release[], score: (x: Release) => number) => list.sort((a, b) => score(b) - score(a))[0];
  const cats: { id: string; name: L; pick: () => Release | undefined }[] = [
    { id: 'record', name: l('Gravação do Ano', 'Record of the Year'), pick: () => winner(rels.filter((x) => x.type === 'single'), (x) => x.q * 1.2 + Math.log10(1 + x.totalUnits) * 8 + r.float(0, 6)) },
    { id: 'album', name: l('Álbum do Ano', 'Album of the Year'), pick: () => winner(rels.filter((x) => x.type === 'lp'), (x) => x.q * 1.4 + Math.log10(1 + x.totalUnits) * 6 + r.float(0, 6)) },
    { id: 'newcomer', name: l('Artista Revelação', 'Best New Artist'), pick: () => winner(rels.filter((x) => s.acts[x.actId]?.debutYear >= year - 1), (x) => (s.acts[x.actId]?.fame ?? 0) + x.q * 0.5 + r.float(0, 6)) },
    { id: 'performance', name: l('Melhor Performance', 'Best Performance'), pick: () => winner(rels, (x) => Math.max(...x.songs.map((id) => s.songs[id]?.performance ?? 0)) + r.float(0, 6)) },
  ];
  for (const c of cats) {
    const w = c.pick();
    if (!w) continue;
    const act = s.acts[w.actId];
    const byPlayer = w.owner === 'player' || !!act?.playerBand;
    s.awards.push({ year, category: c.id, releaseId: w.id, actId: w.actId, name: `${act?.name ?? '?'} — ${w.title}`, byPlayer });
    if (act) {
      act.awards += 1;
      act.fame = clamp(act.fame + 3, 0, 100);
    }
    if (byPlayer) {
      s.player.stats.awards += 1;
      s.player.reputation.artistic = clamp(s.player.reputation.artistic + 4, 0, 100);
      notify(s, fmtL(l('Gramófono de Ouro: {c} para {n}!', 'Golden Gramophone: {c} goes to {n}!'), { c: c.name, n: `${act?.name} — ${w.title}` }), 'good');
    }
    remember(s, 'award', fmtL(l('Gramófonos de Ouro {y} — {c}: {n}.', 'Golden Gramophones {y} — {c}: {n}.'), { y: year, c: c.name, n: `${act?.name ?? '?'} — ${w.title}` }), { actId: w.actId, important: byPlayer || !!act?.catalogNo });
  }
  if (s.awards.length > 400) s.awards.splice(0, s.awards.length - 400);
}

// ---------- Metas visíveis (6 a 12 meses) ----------
export interface Milestone { id: string; text: L; done: boolean }

export function milestones(s: GameState): Milestone[] {
  const st = s.player.stats;
  const mine = Object.values(s.releases).filter((r) => r.owner === 'player' || s.acts[r.actId]?.playerBand);
  const bestPeak = Math.min(999, ...mine.map((r) => r.peak));
  const list: Milestone[] = [
    { id: 'first_release', text: l('Primeiro lançamento', 'First release'), done: mine.length > 0 },
    { id: 'top40', text: l('Primeiro Top 40', 'First Top 40'), done: bestPeak <= 40 },
    { id: 'top10', text: l('Primeiro Top 10', 'First Top 10'), done: st.top10s > 0 },
    { id: 'gold', text: l('Primeiro disco de ouro', 'First gold record'), done: st.gold > 0 || st.platinum > 0 },
    { id: 'number1', text: l('Primeiro #1', 'First #1'), done: st.number1s > 0 },
    { id: 'platinum', text: l('Primeira platina', 'First platinum'), done: st.platinum > 0 },
    { id: 'markets3', text: l('Distribuição em 3 mercados', 'Distribution in 3 markets'), done: s.player.territories.length >= 3 },
    { id: 'award', text: l('Um Gramófono de Ouro', 'A Golden Gramophone'), done: st.awards > 0 },
    { id: 'hq', text: l('Ampliar a sede para Loft', 'Upgrade HQ to Loft'), done: s.player.hq >= 2 },
    { id: 'careers10', text: l('10 carreiras desenvolvidas', '10 careers developed'), done: st.signed >= 10 },
    { id: 'headline', text: l('Headline num festival', 'Headline a festival'), done: st.headlines > 0 },
  ];
  if (s.config.role === 'artist') return list.filter((m) => !['careers10', 'hq', 'markets3'].includes(m.id));
  return list;
}

export function nextGoals(s: GameState): Milestone[] {
  return milestones(s).filter((m) => !m.done).slice(0, 3);
}

export function cardGoalDone(s: GameState): boolean {
  const st = s.player.stats;
  switch (s.config.card) {
    case 'prospector': return st.influential >= 5;
    case 'emperor': {
      const mine = s.player.revenueByYear[s.year - 1] ?? 0;
      return mine > 0 && Object.values(s.labels).every((lb) => lb.revenueLastYear < mine);
    }
    case 'artists_house': return s.year - s.config.startYear >= 10 && st.leftUnhappy === 0;
    case 'archivist': return s.player.reissues >= 10;
    case 'manufacturer': return s.player.equipment.includes('own_plant') && s.player.territories.length >= 3;
    case 'showman': return st.headlines >= 3;
    case 'digital_native': return s.techDates.streaming !== undefined && s.year >= s.techDates.streaming && s.stats.marketShare > 0.08;
    case 'publisher': return Object.values(s.songs).filter((x) => s.acts[x.actId]?.owner === 'player').length >= 150;
    case 'patron': return !!s.flags.movement;
    case 'corsair': return st.scandalsSurvived >= 1;
    case 'globalist': return s.player.territories.length >= 7;
    case 'synthetic_pioneer': return s.player.neural.synthActs > 0 && !!s.flags.synthNumber1;
    default: return false;
  }
}

export function checkCardGoal(s: GameState): void {
  if (s.config.card === 'none' || s.player.goalsDone.includes(s.config.card)) return;
  if (cardGoalDone(s)) {
    s.player.goalsDone.push(s.config.card);
    s.player.legacy.reputation = clamp(s.player.legacy.reputation + 5, 0, 100);
    notify(s, l('Meta da Carta do Selo cumprida!', 'Label Card goal achieved!'), 'good');
    remember(s, 'card_goal', l('A meta pessoal da Carta do Selo foi cumprida.', 'The Label Card personal goal was achieved.'), { important: true });
  }
}

// ---------- Finais ----------
export function endingScores(s: GameState): { id: string; score: number }[] {
  const L = s.player.legacy;
  const n = s.player.neural;
  const st = s.player.stats;
  const synth = n.synthActs + n.voiceLicenses;
  const consent = n.consentPolicy === 'consent';
  const totals = s.player.totals;
  const revenue = Math.max(1, (totals.sales ?? 0) + (totals.live ?? 0) + (totals.publishing ?? 0) + (totals.neural ?? 0));
  const liveShare = (totals.live ?? 0) / revenue;
  const legends = Object.values(s.acts).filter((a) => a.legend && (a.owner === 'player' || a.playerBand)).length;
  const recent = Object.values(s.releases).some((r) => r.owner === 'player' && s.year - r.year <= 5);
  const consentOk = consent && n.voiceLicenses + n.synthActs > 0;
  const scores: Record<string, number> = {
    last_vinyl: (s.player.equipment.includes('own_plant') || hasCard(s, 'manufacturer')) && n.humanFocus >= 2 ? 50 + n.humanFocus * 2 + L.catalog * 0.05 : 0,
    house_of_masters: legends >= 2 && L.artists > 55 ? 45 + legends * 3 + L.artists * 0.1 : 0,
    live_stage: liveShare > 0.3 ? 45 + liveShare * 30 + st.headlines * 2 : 0,
    analog_manifesto: n.neuralAdopted === false && n.humanFocus >= 4 && L.cultural > 35 ? 45 + L.cultural * 0.15 + n.humanFocus * 1.5 : 0,
    end_of_bar: L.commercial < 25 && L.industry < 20 ? 60 : 0,
    silenced_voice: n.consentPolicy === 'no_consent' && n.voiceLicenses >= 1 ? 50 + n.voiceLicenses * 5 : 0,
    perfect_duet: consentOk && n.synthActs >= 1 && n.voiceLicenses >= 1 ? 50 + synth * 3 : 0,
    the_bridge: consentOk && L.artists > 45 ? 40 + Math.min(L.artists, L.innovation + synth * 8) * 0.2 : 0,
    licensed_choir: consent && n.voiceLicenses >= 2 ? 46 + n.voiceLicenses * 4 : 0,
    two_worlds: n.synthActs >= 1 && n.humanFocus >= 3 ? 48 + Math.min(n.synthActs, n.humanFocus) * 2 : 0,
    fragile_balance: 45,
    voice_scandal: n.voiceScandal ? 70 : 0,
    neural_empire: n.neuralAdopted && s.divergence.neural === 'accepted' && L.industry > 40 && L.commercial > 45 ? 42 + (L.commercial + L.industry) * 0.12 : 0,
    infinite_catalog: n.catalogTraining ? 44 + L.catalog * 0.2 : 0,
    famous_ghost: n.ghostVoice ? 58 : 0,
    white_noise: synth >= 3 && L.cultural < 30 ? 52 + synth : 0,
    human_renaissance: s.divergence.neural === 'rejected' && n.humanFocus >= 3 ? 42 + L.cultural * 0.2 + n.humanFocus * 1.5 : 0,
    creative_singularity: s.flags.synthNumber1 ? 66 : 0,
    eternal_archivist: hasCard(s, 'archivist') || s.player.reissues >= 10 ? 45 + L.catalog * 0.15 + s.player.reissues : 0,
    the_silence: !recent && s.config.role !== 'artist' ? 62 : 0,
  };
  return Object.entries(scores).map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score);
}

export function finishArc(s: GameState): void {
  if (s.ended) return;
  const best = endingScores(s)[0];
  s.ended = { ending: best.id, year: s.year, reason: 'arc' };
  if (s.config.card === 'synthetic_pioneer' && ['creative_singularity', 'neural_empire', 'perfect_duet', 'licensed_choir', 'two_worlds'].includes(best.id)) s.player.goalsDone.push('synthetic_pioneer');
  remember(s, 'ending', l('Fim do Arco Neural.', 'End of the Neural Arc.'), { important: true });
}

export function legacyTotal(s: GameState): number {
  return Math.round(sum(Object.values(s.player.legacy)));
}

export function hqCapacityText(s: GameState): L {
  const h = HQ_LEVELS[s.player.hq];
  const c = hqCaps(s);
  const br = s.branches?.length ?? 0;
  return fmtL(l('{n}{b}: {c} carreiras, {st} funcionários, {se} sessões, {e} equipamentos', '{n}{b}: {c} careers, {st} staff, {se} sessions, {e} gear'), { n: h.name, b: br ? ` + ${br} ${br > 1 ? 'filiais' : 'filial'}` : '', c: c.careers, st: c.staff, se: c.sessions, e: c.equipment });
}
