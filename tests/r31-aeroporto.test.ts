// R31 · onda 4 (T): aeroporto por época, notícias da aviação, temporadas no mar e show por holograma.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { recentFacts } from '../src/sim/facts17';
import { advanceMonth } from '../src/sim/tick';
import type { GameState } from '../src/sim/types';
import { createGame } from '../src/sim/worldgen';
import { setSw } from '../src/sim/r31/switches';
import { playerActs } from '../src/sim/util';
import {
  airportOf31, arrivals31, bookCruise31, cruiseLock31, cruiseOpen31, departures31, holoLock31, holoQuote31, holoShow31, linerPorts31, travel31,
} from '../src/sim/sys/travel31';
import { rngSnapshot19 } from '../src/sim/rng19';
import '../src/sim/sys';

const mk = (seed: string, y: number) => createGame(defaultConfig(seed, { startYear: y, realNames: false }));
/** um ato do seu elenco (contrata o primeiro do mundo se ainda não houver) */
const act = (s: GameState): string => {
  const mine = playerActs(s)[0];
  if (mine) return mine;
  const a = Object.values(s.acts).filter((x) => x.members.length && !x.owner).sort((x, y) => y.fame - x.fame)[0];
  a.owner = 'player';
  return a.id;
};

describe('r31 T · aeroporto e transporte', () => {
  it('o aeroporto segue as datas reais', () => {
    expect(airportOf31(1910)).toBe('rail');
    expect(airportOf31(1920)).toBe('field');
    expect(airportOf31(1945)).toBe('terminal');
    expect(airportOf31(1958)).toBe('jet');
  });

  it('notícias da aviação saem uma vez, no mês certo', () => {
    const s = mk('av-news', 1958);
    for (let i = 0; i < 12; i++) advanceMonth(s);
    const f = recentFacts(s, { kind: 'aviation_news', limit: 20 });
    expect(f.filter((x) => x.tags.includes('jet')).length).toBe(1);
    expect(travel31(s).news.jet).toBe(1);
    expect(f.some((x) => x.tags.includes('flight'))).toBe(false); // 1903 é antigo demais para virar notícia em 1958
  });

  it('partidas e desembarque só leem (explorar não muda o mundo)', () => {
    const s = mk('av-read', 1990);
    const snap = rngSnapshot19(s), tours = JSON.stringify(s.tours);
    departures31(s); arrivals31(s);
    expect(rngSnapshot19(s)).toBe(snap);
    expect(JSON.stringify(s.tours)).toBe(tours);
  });

  it('temporada no mar por época: travessia até 1950 leva o ato ao porto; cruzeiro paga por mês', () => {
    const a = mk('cr-liner', 1925);
    expect(cruiseOpen31(a)).toEqual(['liner']);
    const id = act(a);
    const port = linerPorts31(a)[0];
    const cash = a.player.cash;
    expect(bookCruise31(a, id, 'liner', port)).toBeNull();
    expect(a.player.cash).toBeGreaterThan(cash);
    expect(cruiseLock31(a, id, 'liner')).not.toBeNull(); // já está no mar
    advanceMonth(a); advanceMonth(a);
    expect(a.location[id]).toBe(port);

    const b = mk('cr-cruise', 1985);
    expect(cruiseOpen31(b)).toContain('cruise');
    expect(cruiseOpen31(b)).not.toContain('theme');
    const ib = act(b);
    expect(bookCruise31(b, ib, 'cruise')).toBeNull();
    const before = travel31(b).cr[0].earned;
    advanceMonth(b);
    expect(travel31(b).cr[0].earned).toBeGreaterThan(before);
  });

  it('holograma: só a partir de 2027, menos receita que o público ao vivo e com intervalo', () => {
    const old = mk('holo-old', 2010);
    expect(holoLock31(old, act(old))).not.toBeNull();
    const s = mk('holo-new', 2030);
    s.player.cash = 1e10;
    const id = act(s);
    const cities = [s.config.homeCity, 'london', 'new_york'];
    const q = holoQuote31(s, id, cities);
    expect(q.viewers).toBeGreaterThan(0);
    expect(holoShow31(s, id, cities)).toBeNull();
    expect(holoLock31(s, id)).not.toBeNull();
    setSw(s, 'holo31', false);
    expect(holoShow31(s, id, cities)).not.toBeNull();
  });
});
