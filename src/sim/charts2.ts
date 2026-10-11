// Paradas semanais por gênero e por região, com recordes (GDD §19).

import { familyOf } from '../data/world';
import type { GameState } from './types';
import { fmtL, notify, remember } from './util';
import { l } from '../data/world';

/** Peso de um mercado FORA dos territórios do lançamento (importação/vazamento), relativo a 1 dentro.
 *  r21 (B9): constante única — market19a (certificação por mercado) e charts7 (por país, metade) leem daqui. */
export const OUTSIDE_TERRITORY_W = 0.08;

export function chartsWeek(s: GameState): void {
  const entries = [...s.charts.singles, ...s.charts.albums];
  // por família de gênero (unidades da semana)
  const byFam: Record<string, { id: string; u: number }[]> = {};
  for (const e of entries) {
    const rel = s.releases[e.releaseId];
    const act = rel ? s.acts[rel.actId] : undefined;
    if (!rel || !act) continue;
    const fam = familyOf(act.genre);
    (byFam[fam] ??= []).push({ id: rel.id, u: e.units });
  }
  s.genreCharts = {};
  for (const [f, list] of Object.entries(byFam)) s.genreCharts[f] = list.sort((a, b) => b.u - a.u).slice(0, 10).map((x) => x.id);
  // r21 (B9): `s.regionCharts` é preenchido só pelo charts7 (por país → região) no mesmo fechamento semanal; o cálculo
  // antigo por mercado era descartado na mesma semana
  s.regionCharts ??= {};
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
