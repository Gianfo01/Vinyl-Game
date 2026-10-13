// Mais prêmios (pedido do criador): da crítica, regionais por mercado e da indústria,
// além dos Gramófonos de Ouro (legacy.ts).

import { clamp, type Rng } from '../core/rng';
import { MARKETS, l, type L } from '../data/world';
import type { GameState } from './types';
import { fmtL, notify, recordAward, remember } from './util';
import { avgReview } from './media';
import { PRODUCERS } from './studio';
import { calOf19, honoredYear19 } from './awardcal19';
import { livePublic20 } from './livesnap20';
import { releasesNow27 } from './tickcache27';

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
  recordAward(s, { year, category, releaseId: opts.releaseId, actId: opts.actId, name: `${name.pt} / ${name.en}: ${winnerName}`, byPlayer: opts.byPlayer });
  if (opts.byPlayer) {
    notify(s, fmtL(l('{c}: {n}!', '{c}: {n}!'), { c: name, n: winnerName }), 'good');
  }
  remember(s, 'award2', fmtL(l('{y} — {c}: {n}.', '{y} — {c}: {n}.'), { y: year, c: name, n: winnerName }), { actId: opts.actId, important: opts.byPlayer });
}

/** r19: o id é de um prêmio regional (ids reais do conteúdo: trofeu_vitrola, euro_stage… ou os antigos reg_*). */
export const isRegional19 = (cat: string): boolean => cat.startsWith('reg_') || Object.values(REGIONAL_AWARDS).some((d) => d.id === cat);

/** r19 (calendário real): roda no fechamento de cada mês e entrega só os prêmios cuja cerimônia é neste mês e que já
 *  existem (ano de fundação do dado). Premia o ano homenageado (cerimônias do 1º semestre = ano anterior). */
export function yearlyAwards2(s: GameState, r: Rng): void {
  const at = (cat: string) => { const c = calOf19(cat); return s.month === c.month && s.year >= c.start; };
  const year = honoredYear19(s.year, s.month);
  const rels = releasesNow27(s).filter((x) => x.year === year && x.totalUnits > 0);
  // crítica: melhor média de resenhas
  const critic = at('critics') ? rels.map((x) => ({ x, v: avgReview(s, x.id) ?? 0 })).filter((y) => y.v > 0).sort((a, b) => b.v - a.v)[0] : undefined;
  if (critic) {
    const act = s.acts[critic.x.actId];
    give(s, year, 'critics', l('Prêmio da Crítica', "Critics' Prize"), `${act?.name ?? '?'} — ${critic.x.title}`, { actId: act?.id, releaseId: critic.x.id, byPlayer: critic.x.owner === 'player' || !!act?.playerBand });
    if (critic.x.owner === 'player') s.player.reputation.artistic = clamp(s.player.reputation.artistic + 3, 0, 100);
  }
  // regionais: líder da parada regional na noite (cada um no seu mês e desde a sua fundação)
  for (const m of MARKETS) {
    const def = REGIONAL_AWARDS[m.id];
    if (!def || !at(def.id)) continue;
    const top = s.regionCharts[m.id]?.[0];
    const rel = top ? s.releases[top] : undefined;
    if (!rel || rel.year < year - 1) continue;
    const act = s.acts[rel.actId];
    give(s, year, def.id, def.name, `${act?.name ?? '?'} — ${rel.title}`, { actId: act?.id, releaseId: rel.id, byPlayer: rel.owner === 'player' || !!act?.playerBand });
  }
  // indústria: selo do ano (receita), produtor do ano (hits)
  if (at('label_year')) {
    const rev = (lb: { revenueYear: number; revenueLastYear: number }) => (year === s.year ? lb.revenueYear : lb.revenueLastYear);
    const labels = Object.values(s.labels).filter((x) => x.active).map((lb) => ({ id: lb.id, name: lb.name, v: rev(lb) }));
    labels.push({ id: 'player', name: s.config.companyName, v: s.player.revenueByYear[year] ?? 0 });
    const bestLabel = labels.sort((a, b) => b.v - a.v)[0];
    if (bestLabel) give(s, year, 'label_year', l('Selo do Ano (indústria)', 'Label of the Year (industry)'), bestLabel.name, { byPlayer: bestLabel.id === 'player' });
    const prodHits: Record<string, number> = {};
    for (const rel of rels) for (const id of rel.songs) {
      const p = s.songs[id]?.producerId;
      if (p && rel.peak <= 20) prodHits[p] = (prodHits[p] ?? 0) + 1;
    }
    const bestProd = Object.entries(prodHits).sort((a, b) => b[1] - a[1])[0];
    if (bestProd) give(s, year, 'producer_year', l('Produtor do Ano', 'Producer of the Year'), PRODUCERS.find((p) => p.id === bestProd[0])?.name ?? bestProd[0], { byPlayer: false });
  }
  // ato ao vivo: maior público em turnê no ano homenageado
  if (at('live_act')) {
    // r20 (B14): snapshot por show jogado no ano homenageado (turnês em curso concorrem; datas de outro ano não contam)
    const bestLive = Object.entries(livePublic20(s, year)).map(([actId, v]) => ({ actId, v })).sort((a, b) => b.v - a.v || (a.actId < b.actId ? -1 : 1))[0];
    if (bestLive && bestLive.v > 20000) {
      const act = s.acts[bestLive.actId];
      // r19: só é "do jogador" se o ato ainda for seu (antes era sempre true)
      give(s, year, 'live_act', l('Ato ao Vivo do Ano', 'Live Act of the Year'), act?.name ?? '?', { actId: act?.id, byPlayer: !!act && (act.owner === 'player' || !!act.playerBand) });
    }
  }
  void r;
}
