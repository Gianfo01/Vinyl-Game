// Paradas já preenchidas no início da run (rodada 8): os atos ativos mais conhecidos ganham um
// lançamento recente (das últimas semanas) e o mercado roda quatro semanas "antes" do começo, só para
// as paradas mundiais, por país e por formato já abrirem com gente dentro.

import type { Rng } from '../../core/rng';
import { registerSimHook } from '../ext4';
import { computeAppeal, launchNpcRelease, marketWeek } from '../market';
import { composeSongs } from '../production';
import type { GameState } from '../types';
import { weekCharts, ch7 } from './charts7';
import { histLocked } from '../history15';

const WARM_WEEKS = 4;

export function warmCharts(s: GameState, r: Rng): void {
  const w0 = s.week;
  s.week = w0 - WARM_WEEKS;
  const candidates = Object.values(s.acts)
    .filter((a) => a.status === 'active' && a.owner !== 'player' && !a.playerBand && a.members.some((id) => s.persons[id]?.alive))
    .sort((a, b) => b.fame - a.fame)
    .slice(0, 110);
  for (const act of candidates) {
    if (act.releases.some((id) => s.releases[id]?.live)) continue;
    // nomes reais: o disco real mais recente (dos últimos três anos) volta a tocar
    const recent = s.config.realNames ? act.releases.map((id) => s.releases[id]).filter((x) => x?.hist && x.year >= s.config.startYear - 3).sort((a, b) => b.week - a.week)[0] : undefined;
    if (recent) {
      recent.live = true;
      recent.week = Math.min(recent.week, s.week);
      recent.appeal = computeAppeal(s, r, recent, act).appeal;
      continue;
    }
    if (histLocked(s, act)) continue; // vida real exata: sem disco inventado
    const songs = composeSongs(s, r, act, 1);
    if (!songs.length) continue;
    const type = r.chance(s.config.startYear < 1966 ? 0.75 : 0.5) ? 'single' : 'lp';
    const rel = launchNpcRelease(s, r, act, act.owner ?? 'indie', songs.map((x) => x.id), type, 1500 + act.fame * 120);
    const back = r.int(0, 22);
    rel.week -= back;
    act.lastRelease = rel.week;
  }
  const units = s.stats.marketUnitsYear;
  const pu = s.stats.playerUnitsYear;
  for (let i = 0; i < WARM_WEEKS; i++) {
    marketWeek(s, r);
    weekCharts(s);
    s.week += 1;
  }
  s.week = w0;
  s.stats.marketUnitsYear = units;
  s.stats.playerUnitsYear = pu;
  ch7(s).week = w0 - 1;
}

registerSimHook('newgame', 'warmup8', (s, r) => warmCharts(s, r));
