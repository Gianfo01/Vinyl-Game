// Rodada 17 (I) — Novo Jogo e saves: nuvem em pedaços (gzip+base64, ida e volta com db falso), cenários de época
// com regras especiais, mundo "real até o início", dificuldade detalhada, prazo com pontuação e código de partida.

import { describe, expect, it } from 'vitest';
import { cloudDelete17, cloudList17, cloudLoad17, cloudRename17, cloudSave17, cloudSlot, chunks17, memDb17, pack17, unpack17, CHUNK17 } from '../src/core/cloud17';
import { genreById } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { perk } from '../src/sim/perks';
import { applyPreset17, applyWorld17, notes17, PRESETS17, readSetupCode17, setupCode17, worldOf17, WORLDS17 } from '../src/sim/start17';
import { advanceMonth } from '../src/sim/tick';
import { createGame } from '../src/sim/worldgen';
import { liveOf, scenarioConfig, setNextGameSetup } from '../src/sim/sys/live';
import { SCENARIOS17 } from '../src/sim/sys/scenarios17';
import { runDone17 } from '../src/sim/sys/start17';
import { rw } from '../src/sim/sys/realworld';

describe('saves na nuvem (r17)', () => {
  it('gzip+base64 em pedaços: ida e volta exata, docs < 256 KiB, índice e limpeza', async () => {
    const db = memDb17();
    // save grande e pouco compressível (força vários pedaços)
    let x = 7;
    const big = JSON.stringify({ a: Array.from({ length: 120000 }, () => (x = (x * 1103515245 + 12345) % 2147483648).toString(36)) });
    const slot = cloudSlot('auto-abc/1 2');
    expect(slot).toMatch(/^s-[A-Za-z0-9_.-]+$/);
    const m = await cloudSave17(db, 'u1', slot, big, { name: 'Run', year: 1970, label: 'Selo' });
    expect(m.chunks).toBeGreaterThan(1);
    for (const v of db.store.values()) expect(JSON.stringify(v).length).toBeLessThan(256 * 1024);
    expect(await cloudLoad17(db, 'u1', slot)).toBe(big);
    // regravar menor apaga pedaços sobrando
    await cloudSave17(db, 'u1', slot, '{"b":1}', { name: 'Run', year: 1971, label: 'Selo' });
    expect([...db.store.keys()].filter((k) => k.includes(`/saves/${slot}/`)).length).toBe(1);
    expect(await cloudLoad17(db, 'u1', slot)).toBe('{"b":1}');
    await cloudRename17(db, 'u1', slot, 'Nome novo');
    const list = await cloudList17(db, 'u1');
    expect(list.map((z) => z.name)).toEqual(['Nome novo']);
    // outro usuário não vê nada (caminho privado por id)
    expect(await cloudList17(db, 'u2')).toEqual([]);
    expect(await cloudLoad17(db, 'u2', slot)).toBeNull();
    await cloudDelete17(db, 'u1', slot);
    expect(db.store.size).toBe(0);
  });

  it('pedaço de outra gravação é detectado', async () => {
    const db = memDb17();
    await cloudSave17(db, 'u', 's-a', 'x'.repeat(10), { name: 'a', year: 1, label: 'b' });
    await db.doc('data/users/u/saves/s-a/c0').set({ gen: 'outra', i: 0, d: 'zz' });
    await expect(cloudLoad17(db, 'u', 's-a')).rejects.toThrow('incomplete');
    expect(chunks17('abcdef', 4)).toEqual(['abcd', 'ef']);
    expect(CHUNK17).toBeLessThan(256 * 1024);
    expect(await unpack17(await pack17('olá ✓'))).toBe('olá ✓');
  });
});

describe('novo jogo r17', () => {
  it('modos de mundo e predefinições ficam coerentes', () => {
    for (const w of WORLDS17) {
      const c = defaultConfig('w');
      applyWorld17(c, w.id);
      expect(worldOf17(c)).toBe(w.id);
    }
    for (const p of PRESETS17) {
      const c = defaultConfig('p');
      applyPreset17(c, p.id);
      expect(c.preset17).toBe(p.id);
      expect(notes17(c).every((n) => n.text.pt && n.text.en)).toBe(true);
    }
    const c = defaultConfig('code', { startYear: 1977, homeCity: 'rio' });
    applyPreset17(c, 'challenge');
    const back = readSetupCode17(`  ${setupCode17(c)}\n`)!;
    expect(back.ironman).toBe(true);
    expect(back.runYears17).toBe(20);
    expect(back.homeCity).toBe('rio');
    expect(readSetupCode17('lixo')).toBeNull();
  });

  it('real até o início: nenhuma estreia real futura', () => {
    const c = defaultConfig('snap', { startYear: 1965 });
    const g0 = createGame({ ...c });
    expect(g0.upcoming.length + rw(g0).upcoming.length).toBeGreaterThan(10);
    applyWorld17(c, 'snap');
    const g = createGame(c);
    expect(g.upcoming.filter((u) => !u.synthetic).length).toBe(0);
    expect(rw(g).upcoming.length).toBe(0);
    expect(g.config.history).toBe('free');
  });

  it('dificuldade detalhada vira perk e mexe nas rivais', () => {
    const a = createGame(defaultConfig('d', { startYear: 1980 }));
    const b = createGame(defaultConfig('d', { startYear: 1980, diff17: { market: 2, rivals: 2, costs: -1 } }));
    expect(perk(b, 'appeal') - perk(a, 'appeal')).toBeCloseTo(0.16, 5);
    expect(perk(b, 'pressingCost') - perk(a, 'pressingCost')).toBeCloseTo(0.08, 5);
    const ag = (g: typeof a) => Object.values(g.labels).reduce((t, x) => t + x.aggression, 0);
    expect(ag(b)).toBeLessThan(ag(a));
  });

  it('cenários de época: começam com elenco, marcos datados e regras; gêneros existem', () => {
    expect(SCENARIOS17.length).toBeGreaterThanOrEqual(10);
    for (const d of SCENARIOS17) {
      expect(d.rules17.length).toBeGreaterThan(0);
      for (const e of d.events17 ?? []) {
        expect(genreById[e.genre!], `${d.id}:${e.genre}`).toBeTruthy();
        expect(e.year).toBeGreaterThanOrEqual(d.startYear);
        expect(e.year).toBeLessThanOrEqual(d.endYear);
      }
    }
    const d = SCENARIOS17.find((x) => x.id === 'disco_1977')!;
    setNextGameSetup({ scenarioId: d.id });
    const g = createGame(scenarioConfig(d, defaultConfig('disco')));
    expect(liveOf(g).scenario?.id).toBe('disco_1977');
    expect(Object.values(g.acts).filter((a) => a.owner === 'player' && a.genre === 'disco').length).toBeGreaterThanOrEqual(2);
    expect(liveOf(g).events.filter((e) => e.genre === 'disco').length).toBe(2);
    const rescue = SCENARIOS17.find((x) => x.id === 'rescue_1986')!;
    setNextGameSetup({ scenarioId: rescue.id });
    const r = createGame(scenarioConfig(rescue, defaultConfig('rescue')));
    expect(r.player.loans.length).toBeGreaterThan(0);
    const mtv = SCENARIOS17.find((x) => x.id === 'mtv_1981')!;
    setNextGameSetup({ scenarioId: mtv.id });
    const m = createGame(scenarioConfig(mtv, defaultConfig('mtv')));
    const act = Object.values(m.acts).find((a) => a.owner === 'player' && a.genre === 'new_wave')!;
    expect(perk(m, 'appeal', act)).toBeGreaterThan(perk(m, 'appeal'));
  });

  it('prazo da partida: pontuação final no último dezembro', () => {
    const g = createGame(defaultConfig('prazo', { startYear: 1990, runYears17: 1 }));
    while (g.month < 11 || g.year < 1990) advanceMonth(g);
    advanceMonth(g);
    const done = runDone17(g);
    expect(done?.years).toBe(1);
    expect(typeof done?.score).toBe('number');
  });
});
