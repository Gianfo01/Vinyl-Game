// Rodada 18 (campus18): estado → prédios, ciclo de obra (planejado → andaime → aberto) com capex,
// estilo por época (e por reforma), dano por incêndio, venda e retratos anuais.
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/sim/bot';
import { acceptOffer, defaultOffer } from '../src/sim/contracts';
import { emitFact } from '../src/sim/facts17';
import { sect18 } from '../src/sim/ledger18';
import { advanceMonth } from '../src/sim/tick';
import { rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { openBranch } from '../src/sim/branches';
import { CITIES } from '../src/data/world';
import { buyHouse, ownerOf } from '../src/sim/sys/people/owner';
import { foundSchool18 } from '../src/sim/sys/school18';
import { v17 } from '../src/sim/sys/venues17';
import {
  HOME_LOT18, buildings18, campus18, decode18, encode18, freeLots18, layout18, snapshot18, startProj18, styleOf18, sync18, vehicleOf18,
} from '../src/sim/sys/campus18';

const rich = (y: number, seed = 'c18') => { const s = createGame(defaultConfig(seed, { startYear: y })); s.player.cash += 5e9; s.player.initialCash += 5e9; return s; };

describe('campus18', () => {
  it('estilo e veículo pela época', () => {
    expect(styleOf18(1889)).toBe('victorian');
    expect(styleOf18(1910)).toBe('brick');
    expect(styleOf18(1930)).toBe('deco');
    expect(styleOf18(1965)).toBe('midcentury');
    expect(styleOf18(1975)).toBe('brutal');
    expect(styleOf18(1990)).toBe('postmod');
    expect(styleOf18(2005)).toBe('glass');
    expect(styleOf18(2030)).toBe('eco');
    expect([vehicleOf18(1889), vehicleOf18(1925), vehicleOf18(1965), vehicleOf18(2030)]).toEqual(['cart', 'modelT', 'fin', 'pod']);
  });

  it('estado → prédios: sede, filial no mundo, escola, casa no lote residencial', () => {
    const s = rich(1965);
    let bs = buildings18(s);
    const hq = bs.find((b) => b.kind === 'hq')!;
    expect(hq.lvl).toBe(s.player.hq + 1);
    expect(hq.zone).toBe('campus');
    s.player.hq = 2;
    const other = CITIES.find((c) => c.id !== s.config.homeCity)!;
    expect(openBranch(s, other.id)).toBeNull();
    expect(foundSchool18(s)).toBeNull();
    ownerOf(s).wealth += 5e9;
    expect(buyHouse(s, 'suburb')).toBeNull();
    bs = buildings18(s);
    expect(bs.find((b) => b.kind === 'branch')?.zone).toBe('world');
    expect(bs.find((b) => b.kind === 'school')?.zone).toBe('campus');
    expect(bs.find((b) => b.kind === 'hq')?.lvl).toBe(3);
    const lots = layout18(s, bs);
    expect(lots.get('hq')).toBe(0);
    expect(lots.get('home')).toBe(HOME_LOT18);
    expect(new Set(lots.values()).size).toBe(lots.size);
    // retrato anual: codifica e decodifica
    const dec = decode18(encode18(s, bs));
    expect(dec.map((b) => b.kind).sort()).toEqual(bs.map((b) => b.kind).sort());
    snapshot18(s);
    expect(campus18(s).snaps.at(-1)?.y).toBe(s.year);
  });

  it('obra: entrada 30% como investimento, andaime, atraso/estouro possíveis, inauguração', () => {
    const s = rich(1920);
    const lot = freeLots18(s)[0];
    const cash0 = s.player.cash;
    expect(startProj18(s, 'store', lot, 1)).toBeNull();
    expect(startProj18(s, 'store', lot, 1)).not.toBeNull(); // não duplica
    const p = campus18(s).proj[0];
    expect(cash0 - s.player.cash).toBe(Math.round(p.cost * 0.3));
    const e = s.ledger.find((x) => x.key.includes('campus18:'))!;
    expect(sect18(e.cat, e.amount, e.key.split(':').slice(1).join(':'))).toBe('inv');
    expect(buildings18(s).find((b) => b.id === 'c:store')?.st).toBe('planned');
    advanceMonth(s);
    const b1 = buildings18(s).find((b) => b.id === 'c:store');
    expect(b1?.st).toBe('building');
    expect(b1!.prog!).toBeGreaterThan(0);
    for (let i = 0; i < 14 && campus18(s).proj.length; i++) advanceMonth(s);
    expect(campus18(s).proj.length).toBe(0);
    expect(campus18(s).built.store?.lot).toBe(lot);
    expect(buildings18(s).find((b) => b.id === 'c:store')?.st).toBe('open');
    const paid = s.ledger.filter((x) => x.key.includes(':campus18:cp1')).reduce((t, x) => t - x.amount, 0);
    expect(paid).toBe(p.cost + p.over);
    expect(freeLots18(s)).not.toContain(lot);
  });

  it('incêndio num ato seu danifica a sede; reforma conserta e muda o estilo para a época atual', () => {
    const s = rich(1950);
    const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity });
    acceptOffer(s, a, { ...defaultOffer(s, a), id: 'o1', week: 0, status: 'pending', advance: 0 });
    sync18(s);
    campus18(s).ren.hq = 1931;
    expect(styleOf18(buildings18(s).find((b) => b.id === 'hq')!.sy)).toBe('deco');
    emitFact(s, { kind: 'disaster', actors: [a.id], place: a.city, severity: 55, tags: ['bad', 'fire'], text: { pt: 'Incêndio', en: 'Fire' } });
    expect(buildings18(s).find((b) => b.id === 'hq')?.st).toBe('damaged');
    expect(startProj18(s, 'reno', -1, 2, 'hq')).toBeNull();
    expect(buildings18(s).find((b) => b.id === 'hq')?.st).toBe('renovating');
    for (let i = 0; i < 16 && campus18(s).proj.length; i++) advanceMonth(s);
    const hq = buildings18(s).find((b) => b.id === 'hq')!;
    expect(hq.st).toBe('open');
    expect(styleOf18(hq.sy)).toBe(styleOf18(s.year));
  });

  it('casa de shows vendida vira placa de "vendido" por um tempo', () => {
    const s = rich(1990);
    v17(s).own.push({ id: 'vanguard', rep: 50, policy: 'curated', price: 'mid', cond: 80, maint: true, y: 1990, paid: 0, booked: [], total: 0 });
    sync18(s);
    expect(buildings18(s).some((b) => b.id === 've:vanguard' && b.st === 'open')).toBe(true);
    v17(s).own = [];
    sync18(s);
    const g = buildings18(s).find((b) => b.id === 've:vanguard');
    expect(g?.st).toBe('sold');
    expect(g?.name).toBe('Village Vanguard');
  });
});
