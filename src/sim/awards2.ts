// Mais prêmios (pedido do criador): da crítica, regionais por mercado e da indústria,
// além dos Gramófonos de Ouro (legacy.ts).

import { clamp, type Rng } from '../core/rng';
import { MARKETS, l, type L } from '../data/world';
import type { GameState } from './types';
import { fmtL, notify, remember } from './util';
import { avgReview } from './media';
import { PRODUCERS } from './studio';

export interface AwardDef {
  id: string;
  name: L;
  realRef?: string;
}

export let REGIONAL_AWARDS: Record<string, AwardDef> = {
  br: { id: 'reg_br', name: l('Prêmio Sabiá (Brasil)', 'Sabiá Award (Brazil)'), realRef: 'Prêmio da Música Brasileira' },
  na: { id: 'reg_na', name: l('Prêmio Águia (América do Norte)', 'Eagle Award (North America)'), realRef: 'AMAs' },
  latam: { id: 'reg_latam', name: l('Prêmio Condor (América Latina)', 'Condor Award (Latin America)'), realRef: 'Latin Grammy' },
  eu: { id: 'reg_eu', name: l('Prêmio Farol (Europa)', 'Lighthouse Award (Europe)'), realRef: 'BRIT/MTV EMA' },
  asia: { id: 'reg_asia', name: l('Prêmio Lótus (Ásia)', 'Lotus Award (Asia)'), realRef: 'MAMA' },
  africa: { id: 'reg_africa', name: l('Prêmio Baobá (África)', 'Baobab Award (Africa)'), realRef: 'AFRIMA' },
  oceania: { id: 'reg_oceania', name: l('Prêmio Cruzeiro (Oceania)', 'Southern Cross Award (Oceania)'), realRef: 'ARIA' },
};

export function setRegionalAwards(x: Record<string, AwardDef>): void {
  REGIONAL_AWARDS = { ...REGIONAL_AWARDS, ...x };
}

function give(s: GameState, year: number, category: string, name: L, winnerName: string, opts: { actId?: string; releaseId?: string; byPlayer: boolean }): void {
  s.awards.push({ year, category, releaseId: opts.releaseId, actId: opts.actId, name: `${name.pt} / ${name.en}: ${winnerName}`, byPlayer: opts.byPlayer });
  if (opts.actId && s.acts[opts.actId]) s.acts[opts.actId].awards += 1;
  if (opts.byPlayer) {
    s.player.stats.awards += 1;
    notify(s, fmtL(l('{c}: {n}!', '{c}: {n}!'), { c: name, n: winnerName }), 'good');
  }
  remember(s, 'award2', fmtL(l('{y} — {c}: {n}.', '{y} — {c}: {n}.'), { y: year, c: name, n: winnerName }), { actId: opts.actId, important: opts.byPlayer });
}

export function yearlyAwards2(s: GameState, r: Rng): void {
  const year = s.year;
  const rels = Object.values(s.releases).filter((x) => x.year === year && x.totalUnits > 0);
  if (!rels.length) return;
  // crítica: melhor média de resenhas
  const critic = rels.map((x) => ({ x, v: avgReview(s, x.id) ?? 0 })).filter((y) => y.v > 0).sort((a, b) => b.v - a.v)[0];
  if (critic) {
    const act = s.acts[critic.x.actId];
    give(s, year, 'critics', l('Prêmio da Crítica', 'Critics\' Prize'), `${act?.name ?? '?'} — ${critic.x.title}`, { actId: act?.id, releaseId: critic.x.id, byPlayer: critic.x.owner === 'player' || !!act?.playerBand });
    if (critic.x.owner === 'player') s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100);
  }
  // regionais: líder da parada regional
  for (const m of MARKETS) {
    const top = s.regionCharts[m.id]?.[0];
    const rel = top ? s.releases[top] : undefined;
    if (!rel || rel.year < year - 1) continue;
    const def = REGIONAL_AWARDS[m.id];
    const act = s.acts[rel.actId];
    give(s, year, def.id, def.name, `${act?.name ?? '?'} — ${rel.title}`, { actId: act?.id, releaseId: rel.id, byPlayer: rel.owner === 'player' || !!act?.playerBand });
  }
  // indústria: selo do ano (receita), produtor do ano (hits), ato ao vivo (público em turnê)
  const labels = Object.values(s.labels).filter((x) => x.active).map((lb) => ({ id: lb.id, name: lb.name, v: lb.revenueYear }));
  labels.push({ id: 'player', name: s.config.companyName, v: s.player.revenueByYear[year] ?? 0 });
  const bestLabel = labels.sort((a, b) => b.v - a.v)[0];
  if (bestLabel && s.year >= 1930) give(s, year, 'label_year', l('Selo do Ano (indústria)', 'Label of the Year (industry)'), bestLabel.name, { byPlayer: bestLabel.id === 'player' });
  const prodHits: Record<string, number> = {};
  for (const rel of rels) for (const id of rel.songs) {
    const p = s.songs[id]?.producerId;
    if (p && rel.peak <= 20) prodHits[p] = (prodHits[p] ?? 0) + 1;
  }
  const bestProd = Object.entries(prodHits).sort((a, b) => b[1] - a[1])[0];
  if (bestProd) give(s, year, 'producer_year', l('Produtor do Ano', 'Producer of the Year'), PRODUCERS.find((p) => p.id === bestProd[0])?.name ?? bestProd[0], { byPlayer: false });
  const live = s.tours.filter((t) => t.status === 'done' && t.stops.some((st) => st.status === 'played' && Math.floor(st.day / 365.25) + s.config.startYear === year));
  const bestLive = live.map((t) => ({ t, v: t.stops.reduce((x, y) => x + y.sold, 0) })).sort((a, b) => b.v - a.v)[0];
  if (bestLive && bestLive.v > 20000) {
    const act = s.acts[bestLive.t.actId];
    give(s, year, 'live_act', l('Ato ao Vivo do Ano', 'Live Act of the Year'), act?.name ?? '?', { actId: act?.id, byPlayer: true });
  }
  void r;
}
