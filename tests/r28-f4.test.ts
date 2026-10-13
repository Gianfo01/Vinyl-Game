// Rodada 28 (F4) — primeiro sucesso perto e fim com peso:
// início e fim escolhidos na Nova run (Recomendado = 25 anos, sem fim = sandbox); começo sorteado pela semente (sem
// mexer no RNG da partida nem nos testes sem `start28`); cenário "Primeiro hit"; rumo (x/100), capítulos por década e
// storyboard (álbum, 3 maiores cadeias de eco, epitáfio); tutorial que se conclui fazendo; vinhetas de 0,5–1 s por era.
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { newRunConfig20, presetDiff20 } from '../src/sim/start17';
import { liveOf, scenarioConfig, setNextGameSetup } from '../src/sim/sys/live';
import { FIRST_HIT28 } from '../src/sim/sys/start28';
import { END_MAX28, REC_YEARS28, STARTS28, endOf28, pickStart28, yearsFor28 } from '../src/sim/start28data';
import { album28, chapters28, echoChains28, epitaph28, rumo28, storyboard28 } from '../src/sim/sys/end28';
import { runEnd17 } from '../src/sim/sys/start17';
import { stingForScene28, stingerSpec28 } from '../src/audio/stinger28';
import { specSeconds } from '../src/audio/spec';
import { buildRun27, quickDefaults27, quickRunConfig27 } from '../src/ui/ps/home27model';
import { doHint28, doneByDoing28 } from '../src/ui/onboard28';
import type { GameState } from '../src/sim/types';

describe('r28 F4 — início e fim na Nova run', () => {
  it('Recomendado sugere 25 anos; o fim é editável e "sem fim" é sandbox', () => {
    const q = quickDefaults27('f4-a', 'Selo');
    expect(quickRunConfig27(q).runYears17).toBe(REC_YEARS28);
    expect(presetDiff20(newRunConfig20({ seed: 'f4-a', companyName: 'Selo' }), 'rec')).toEqual([]);
    const c = quickRunConfig27({ ...q, startYear: 1970, runYears: yearsFor28(1970, 1984) });
    expect(c.runYears17).toBe(15);
    expect(endOf28(c.startYear, c.runYears17)).toBe(1984);
    expect(quickRunConfig27({ ...q, runYears: 0 }).runYears17).toBe(0);
    expect(yearsFor28(2030, 9999)).toBe(END_MAX28 - 2030 + 1);
    expect(yearsFor28(1990, 1980)).toBe(1); // fim antes do início: vira o próprio ano
    const g = createGame(buildRun27(c));
    expect(runEnd17(g)).toBe(1984);
  });
});

describe('r28 F4 — começo sorteado pela semente', () => {
  it('determinístico e variado (≥ 4 começos diferentes em 40 sementes)', () => {
    expect(pickStart28('abc').id).toBe(pickStart28('abc').id);
    const ids = new Set(Array.from({ length: 40 }, (_, i) => pickStart28(`s${i}`).id));
    expect(ids.size).toBeGreaterThanOrEqual(4);
  });
  it('buildRun27 grava o começo; sem start28 o jogo é o de sempre (valores-ouro intactos)', () => {
    const cfg = quickRunConfig27(quickDefaults27('f4-b', 'Selo'));
    const run = buildRun27(cfg);
    expect(run.start28).toBe(pickStart28('f4-b').id);
    const plain = createGame(defaultConfig('f4-c'));
    const plain2 = createGame(defaultConfig('f4-c'));
    expect(plain.player.cash).toBe(plain2.player.cash);
    for (const st of STARTS28) {
      const g = createGame(defaultConfig('f4-c', { start28: st.id }));
      expect(g.player.cash).toBe(Math.round(plain.player.cash * st.cash));
      for (const [k, v] of Object.entries(st.rep)) expect(g.player.reputation[k as 'artists']).toBe(Math.min(100, plain.player.reputation[k as 'artists'] + (v ?? 0)));
      if (st.id !== 'calm') expect(g.memory.some((m) => m.kind === 'start28')).toBe(true);
    }
  });
});

describe('r28 F4 — cenário "Primeiro hit"', () => {
  it('artista pronto para estourar e meta de top 10', () => {
    setNextGameSetup({ scenarioId: FIRST_HIT28.id });
    const g = createGame(scenarioConfig(FIRST_HIT28, defaultConfig('f4-hit')));
    expect(liveOf(g).scenario?.id).toBe(FIRST_HIT28.id);
    const soul = Object.values(g.acts).filter((a) => a.owner === 'player' && a.genre === 'soul');
    expect(soul.length).toBe(1);
    expect(soul[0].fame).toBeGreaterThanOrEqual(20);
    expect(soul[0].potential).toBeGreaterThanOrEqual(80);
    expect(FIRST_HIT28.metric(g, {})).toBe(0); // meta: singles no top 40 (nenhum ainda)
    expect(FIRST_HIT28.tiers).toEqual([1, 3, 6]);
  });
});

describe('r28 F4 — rumo, capítulos e storyboard', () => {
  const g = createGame(defaultConfig('f4-end', { startYear: 1969 }));
  for (let i = 0; i < 60 && g.year < 1970; i++) advanceMonth(g);
  it('rumo: final provável com nota 0–100', () => {
    const r = rumo28(g)!;
    expect(r.name.pt.length).toBeGreaterThan(0);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });
  it('capítulos: um por década jogada, só a última aberta, cada um com epitáfio parcial', () => {
    expect(g.year).toBe(1970);
    const cs = chapters28(g);
    expect(cs.map((c) => c.decade)).toEqual([1960, 1970]);
    expect(cs.map((c) => c.open)).toEqual([false, true]);
    expect(cs[0].epitaph.pt).toMatch(/^Anos 1960 \(1969\): /);
    expect(cs[1].epitaph.en).toMatch(/^The 1970s/);
  });
  it('storyboard: epitáfio, álbum e cadeias de eco (ler não muda o save)', () => {
    const before = JSON.stringify(g);
    const st = storyboard28(g);
    expect(JSON.stringify(g)).toBe(before);
    expect(st.epitaph.pt).toContain(g.config.companyName);
    expect(epitaph28(g).en).toMatch(/releases/);
    expect(st.album.length).toBeLessThanOrEqual(9);
    expect(album28(g).every((a, i, xs) => i === 0 || xs[i - 1].week <= a.week)).toBe(true);
  });
  it('cadeias de eco: as 3 maiores por número de ecos', () => {
    const fake = { x4: { dec18: {
      th: [{ id: 'a', t: { pt: 'A', en: 'A' }, o: { pt: 'x', en: 'x' }, w: 1, n: 0 }, { id: 'b', t: { pt: 'B', en: 'B' }, o: { pt: 'y', en: 'y' }, w: 2, n: 0 }],
      done: [[5, { pt: 'A', en: 'A' }, { pt: 'a1', en: 'a1' }, 'good', 'a'], [6, { pt: 'B', en: 'B' }, { pt: 'b1', en: 'b1' }, 'bad', 'b'], [7, { pt: 'B', en: 'B' }, { pt: 'b2', en: 'b2' }, 'good', 'b'],
        [8, { pt: 'C', en: 'C' }, { pt: 'c1', en: 'c1' }, 'neutral', 'c'], [9, { pt: 'D', en: 'D' }, { pt: 'd', en: 'd' }, 'miss', 'd'], [10, { pt: 'E', en: 'E' }, { pt: 'e', en: 'e' }, 'good', 'e']],
    } } } as unknown as GameState;
    const xs = echoChains28(fake);
    expect(xs.length).toBe(3);
    expect(xs[0]).toMatchObject({ id: 'b', n: 2, good: 1, bad: 1 });
    expect(xs.map((x) => x.id)).not.toContain('d'); // eco perdido não conta
  });
});

describe('r28 F4 — tutorial que se conclui fazendo', () => {
  const g = createGame(defaultConfig('f4-tut'));
  it('não conclui no mesmo desenho em que o passo aparece', () => {
    expect(doneByDoing28('artists', g, { area: 'artists', armed: false, week0: 0 })).toBe(false);
    expect(doneByDoing28('artists', g, { area: 'artists', armed: true, week0: 0 })).toBe(true);
    expect(doneByDoing28('artists', g, { area: 'cockpit', armed: true, week0: 0 })).toBe(false);
  });
  it('contratar, avançar o tempo e abrir o Mercado concluem os passos certos', () => {
    expect(doneByDoing28('market', g, { area: 'market', armed: true, week0: 0 })).toBe(g.player.stats.signed >= 1);
    expect(doneByDoing28('cockpit', g, { area: 'market', armed: true, week0: 0 })).toBe(true);
    expect(doneByDoing28(undefined, g, { area: 'cockpit', armed: true, week0: g.week })).toBe(false);
    expect(doneByDoing28(undefined, g, { area: 'cockpit', armed: true, week0: g.week - 1 })).toBe(true);
    expect(doHint28('hq').pt).toMatch(/^Faça:/);
  });
});

describe('r28 F4 — vinhetas de áudio', () => {
  it('0,5–1 s, filtro da era do ano e determinísticas', () => {
    for (const k of ['hit', 'number1', 'gold', 'award', 'chapter', 'end', 'bad'] as const) {
      const s = stingerSpec28(k, 1970);
      expect(specSeconds(s)).toBeGreaterThanOrEqual(0.5);
      expect(specSeconds(s)).toBeLessThanOrEqual(1);
      expect(stingerSpec28(k, 1970, 'pop', 'x')).toEqual(stingerSpec28(k, 1970, 'pop', 'x'));
    }
    expect(stingerSpec28('hit', 1920).era).toBe('gramophone');
    expect(stingerSpec28('hit', 1950).era).toBe('am');
    expect(stingerSpec28('hit', 1975).era).toBe('fm');
    expect(stingerSpec28('hit', 2005).era).toBe('digital');
    expect(stingerSpec28('hit', 2035).era).toBe('neural');
  });
  it('marcos têm vinheta; cenas comuns não', () => {
    expect(stingForScene28('cut27', 'no1')).toBe('number1');
    expect(stingForScene28('cut27', 'award')).toBe('award');
    expect(stingForScene28('cut27', 'press1')).toBe(null);
    expect(stingForScene28('chapter28')).toBe('chapter');
    expect(stingForScene28('run17Result')).toBe('end');
    expect(stingForScene28('interview')).toBe(null);
  });
});
