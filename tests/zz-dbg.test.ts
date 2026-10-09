import { it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { rngOf } from '../src/sim/util';
import { advanceMonth } from '../src/sim/tick';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { bookRoutedTour, route, suggestRoute } from '../src/sim/sys/route8';
import { ai, makeOffer, scaleIncome, setUse, voiceIncome } from '../src/sim/sys/consent8';
it('dbg', () => {
  for (const fam of [15, 45]) {
    const s = createGame(defaultConfig('dbg' + fam, { startYear: 1988 }));
    const r = rngOf(s);
    const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: fam });
    acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
    s.player.cash += 1e8; s.player.initialCash += 1e8; act.fans = fam === 15 ? { casual: 8000, active: 1500, core: 300 } : { casual: 120000, active: 20000, core: 4000 };
    for (const mode of ['compact', 'expand'] as const) {
      const cities = suggestRoute(s, act.id, mode, 6);
      const res = bookRoutedTour(s, act.id, cities, { format: 'standard', fee: 1, split: 1, support: 1, rider: 1, intensity: 'normal', price: 1 }, 10);
      if ('pt' in res) { console.log(fam, mode, res.pt); continue; }
      for (let i = 0; i < 5 && s.tours.some((t) => t.status === 'planned' || t.status === 'running'); i++) advanceMonth(s);
      advanceMonth(s);
      console.log(fam, mode, cities.join(','), JSON.stringify(route(s).reports[0]), JSON.stringify(res.deal.countered), res.deal.mood);
    }
  }
  const s = createGame(defaultConfig('dbgai', { startYear: 2026 }));
  const r = rngOf(s);
  const act = spawnProceduralAct(s, r, { city: s.config.homeCity, fame: 45 });
  acceptOffer(s, act, { ...defaultOffer(s, act), id: 'o1', week: 0, status: 'pending', advance: 0 });
  setUse(s, 2);
  console.log('cash', s.player.cash, 'scale', scaleIncome(s), 'voice', voiceIncome(s, act), 'offer', JSON.stringify(makeOffer(s, r)), ai(s).trust);
});
