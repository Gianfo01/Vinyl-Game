// Paradas semanais por gênero e por região, com recordes (GDD §19).

import { MARKETS, MARKET_PREF, familyOf } from '../data/world';
import type { GameState } from './types';
import { fmtL, notify, remember } from './util';
import { l } from '../data/world';

export function chartsWeek(s: GameState): void {
  const entries = [...s.charts.singles, ...s.charts.albums];
  // por família de gênero (unidades da semana)
  const byFam: Record<string, { id: string; u: number }[]> = {};
  const byMarket: Record<string, { id: string; u: number }[]> = {};
  for (const e of entries) {
    const rel = s.releases[e.releaseId];
    const act = rel ? s.acts[rel.actId] : undefined;
    if (!rel || !act) continue;
    const fam = familyOf(act.genre);
    (byFam[fam] ??= []).push({ id: rel.id, u: e.units });
    // região: consumo repartido pelos mercados atendidos, pesado pelo gosto local
    let den = 0;
    const w: Record<string, number> = {};
    for (const m of MARKETS) {
      const inside = rel.territories.includes(m.id) ? 1 : 0.08;
      const v = m.size(s.year) * (MARKET_PREF[m.id][fam] ?? 0.6) * inside;
      w[m.id] = v;
      den += v;
    }
    for (const m of MARKETS) (byMarket[m.id] ??= []).push({ id: rel.id, u: (e.units * w[m.id]) / Math.max(1e-9, den) });
  }
  s.genreCharts = {};
  for (const [f, list] of Object.entries(byFam)) s.genreCharts[f] = list.sort((a, b) => b.u - a.u).slice(0, 10).map((x) => x.id);
  s.regionCharts = {};
  for (const [m, list] of Object.entries(byMarket)) s.regionCharts[m] = list.sort((a, b) => b.u - a.u).slice(0, 10).map((x) => x.id);
  records(s);
}

function records(s: GameState): void {
  const r = s.records;
  const top = s.charts.singles[0];
  if (top) {
    const rel = s.releases[top.releaseId];
    const act = rel ? s.acts[rel.actId] : undefined;
    if (rel && act) {
      const key = `no1run:${rel.id}`;
      s.flags[key] = (s.flags[key] ?? 0) + 1;
      const run = s.flags[key];
      if (!r.longestNo1 || run > r.longestNo1.weeks) {
        const was = r.longestNo1;
        r.longestNo1 = { releaseId: rel.id, weeks: run, title: rel.title, act: act.name };
        if (was && was.releaseId !== rel.id && run > 8) {
          remember(s, 'record', fmtL(l('Recorde: "{t}" ({a}) chega a {n} semanas em #1.', 'Record: "{t}" ({a}) reaches {n} weeks at #1.'), { t: rel.title, a: act.name, n: run }), { actId: act.id, important: true });
          if (rel.owner === 'player') notify(s, fmtL(l('Recorde histórico: {n} semanas em #1!', 'All-time record: {n} weeks at #1!'), { n: run }), 'good');
        }
      }
    }
  }
  for (const e of [...s.charts.singles.slice(0, 3), ...s.charts.albums.slice(0, 3)]) {
    const rel = s.releases[e.releaseId];
    const act = rel ? s.acts[rel.actId] : undefined;
    if (!rel || !act) continue;
    if (!r.biggestWeek || e.units > r.biggestWeek.units) {
      r.biggestWeek = { releaseId: rel.id, units: e.units, title: rel.title, act: act.name, week: s.week };
    }
    if (!r.longestRun || rel.weeksOnChart > r.longestRun.weeks) r.longestRun = { releaseId: rel.id, weeks: rel.weeksOnChart, title: rel.title, act: act.name };
  }
  const champ = Object.values(s.acts).reduce<{ id: string; n: number; name: string } | undefined>((best, a) => (a.number1s > (best?.n ?? 0) ? { id: a.id, n: a.number1s, name: a.name } : best), undefined);
  if (champ) r.mostNo1sAct = { actId: champ.id, n: champ.n, name: champ.name };
  // limpa contadores de #1 que já saíram
  if (s.week % 26 === 0) for (const k of Object.keys(s.flags)) if (k.startsWith('no1run:') && s.charts.singles[0]?.releaseId !== k.slice(7)) delete s.flags[k];
}
