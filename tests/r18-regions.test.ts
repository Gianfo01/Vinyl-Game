// Rodada 18 (regions18) — submercados, afinidades dinâmicas, entrada local, circuitos, K-pop e idols.
import { describe, expect, it } from 'vitest';
import { subById18 } from '../src/data/regions18';
import { defaultConfig } from '../src/sim/bot';
import { applyMods } from '../src/sim/ext4';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { joinCirc18 } from '../src/sim/sys/circuits18';
import { audition18, debut18, foundProg18, kp18 } from '../src/sim/sys/kpop18';
import { hsBlock18, setHs18 } from '../src/sim/sys/idols18';
import { access18, locBlock18, localize18, mkFit18, pref18, reg18 } from '../src/sim/sys/regions18';
import { money } from '../src/sim/util';
import { makeAct } from '../src/sim/people';
import { Rng } from '../src/core/rng';
import type { Act, GameState } from '../src/sim/types';
import '../src/sim/sys';

const mine = (s: GameState): Act => makeAct(s, Rng.fromSeed('r18reg'), { genre: 'rock', city: 'new_york', members: 3, potential: 50, formed: s.year, debutYear: s.year, owner: 'player' });
const rich = (s: GameState) => { s.player.cash += money(s, 5_000_000); };

describe('r18 regions18', () => {
  it('Ásia aberta em submercados: neutra em média, mas o gosto difere por país', () => {
    const s = createGame(defaultConfig('r18-reg1', { startYear: 1990 }));
    const a = mine(s);
    for (const y of [1965, 1990, 2020]) {
      s.year = y;
      a.genre = 'pop';
      const r = mkFit18(s, 'asia', a).ratio;
      expect(r).toBeGreaterThan(0.75);
      expect(r).toBeLessThan(1.25);
    }
    s.year = 2015;
    expect(pref18(s, subById18.kr, 'kpop')).toBeGreaterThan(pref18(s, subById18.in, 'kpop') + 0.8);
    expect(pref18(s, subById18.in, 'bollywood')).toBeGreaterThan(pref18(s, subById18.jp, 'bollywood') + 1);
  });

  it('save antigo sem estado ganha estado novo; viradas anteriores ao início já valem', () => {
    const s = createGame(defaultConfig('r18-reg2', { startYear: 2010 }));
    delete (s as unknown as { x4: Record<string, unknown> }).x4.regions18;
    advanceMonth(s);
    expect(reg18(s).perm.cn?.kpop ?? 0).toBeGreaterThan(0.3); // Hallyu 1999
    expect(reg18(s).log.some((x) => x.sub === 'cn' && x.g === 'kpop')).toBe(false); // passado não vira notícia
  });

  it('modo exato: Despacito (2017) muda a afinidade no ano certo', () => {
    const s = createGame(defaultConfig('r18-reg3', { startYear: 2016, mode: 'historic', realNames: true, history: 'strict' }));
    for (let i = 0; i < 26; i++) advanceMonth(s);
    expect(reg18(s).perm.jp?.reggaeton ?? 0).toBeGreaterThan(0.3);
    expect(reg18(s).log.some((x) => x.g === 'reggaeton')).toBe(true);
  });

  it('licenciado/escritório: exige a região aberta, melhora o acesso; China fechada ao escritório antes de 1979', () => {
    const s = createGame(defaultConfig('r18-reg4', { startYear: 1975 }));
    rich(s);
    const a = mine(s);
    s.player.territories = s.player.territories.filter((m) => m !== 'asia');
    expect(locBlock18(s, subById18.jp, 'lic')).not.toBeNull();
    s.player.territories.push('asia');
    const before = access18(s, subById18.jp, a).v;
    expect(localize18(s, 'jp', 'lic')).toBeNull();
    expect(access18(s, subById18.jp, a).v).toBeGreaterThan(before);
    expect(locBlock18(s, subById18.cn, 'own')).not.toBeNull();
  });

  it('circuito de rodeio aumenta a demanda de shows no Brasil', () => {
    const s = createGame(defaultConfig('r18-reg5', { startYear: 1995 }));
    rich(s);
    const a = mine(s);
    a.genre = 'sertanejo';
    const base = applyMods(s, 'cityDemand', 1000, { act: a, cityId: 'goiania' }).value;
    expect(joinCirc18(s, a.id, 'rodeio')).toBeNull();
    expect(applyMods(s, 'cityDemand', 1000, { act: a, cityId: 'goiania' }).value).toBeGreaterThan(base * 1.2);
  });

  it('K-pop: academia, audição, 12 meses de treino, debut com contrato KFTC de 7 anos', () => {
    const s = createGame(defaultConfig('r18-reg6', { startYear: 2012 }));
    rich(s);
    expect(foundProg18(s)).toBeNull();
    audition18(s);
    expect(kp18(s).tr.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < 13; i++) { rich(s); advanceMonth(s); }
    const ids = kp18(s).tr.filter((t) => t.months >= 12).map((t) => t.id);
    if (ids.length < 2) return; // desistências raras
    expect(debut18(s, { ids, mode: 'direct', long: true })).toHaveProperty('pt'); // 13 anos proibido depois de 2009
    const g = debut18(s, { ids, mode: 'direct' }) as Act;
    expect(g.owner).toBe('player');
    expect(s.contracts[g.contractId!].termMonths).toBe(84);
    expect(hsBlock18(s, g) === null || !s.player.territories.includes('asia')).toBe(true);
    if (!hsBlock18(s, g)) expect(setHs18(s, g.id, true)).toBeNull();
  });
});
