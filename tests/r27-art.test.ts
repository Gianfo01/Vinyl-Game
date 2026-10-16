// r27 (K): ilustrações de página e cenas animadas em pixel art — variante por área/época/estado (puro), pintura
// determinística, qual cena cada acontecimento dispara, preferência (todas/importantes/desligadas) e os efeitos
// reais das escolhas (caixa, empréstimo, calor da polícia, momento, reputação).

import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { emitFact } from '../src/sim/facts17';
import { crime17, heatIn, a3Of } from '../src/sim/sys/crime17';
import type { Act, GameState } from '../src/sim/types';
import { remember } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { ART_KINDS27, AREA_ART27, artHash27, artKindOf27, artModel27, paintArt27 } from '../src/ui/ps/art27';
import { bandOf27 } from '../src/ui/ps/art27kit';
import { CUT27, CUT_KEYS27, choose27, coin27, cut27, cutModel27, cutOfFact27, cutOfMemory27, paintFx27, scan27, type CutData27 } from '../src/ui/ps/cut27model';
import { rng19, rngSnapshot19 } from '../src/sim/rng19';

const game = (y = 1966, seed = 'r27k'): GameState => { const c = defaultConfig(seed, { scenario: 'established', startYear: y } as Parameters<typeof defaultConfig>[1]); (c as { dbSize?: string }).dbSize = 'small'; return createGame(c); };
const myAct = (s: GameState, fame = 60): Act => { const a = spawnProceduralAct(s, rng19(s, 'act'), { city: s.config.homeCity, fame }); a.owner = 'player'; a.fame = fame; return a; };
const opaque = (p: { d: Uint32Array }) => p.d.filter((c) => c >>> 24 === 255).length / p.d.length;

describe('r27 K — arte de página: área → cena', () => {
  it('toda página grande pedida tem cena', () => {
    const want: Record<string, string> = { crime: 'crime', market: 'anr', studio: 'studio', releases: 'releases', shows: 'shows', tour12: 'tour', festivals: 'festival', charts: 'charts', news17: 'press', finance: 'finance', team: 'team', publishing16: 'rights', awards: 'awards', rockhall: 'awards', you: 'you', dyn18: 'family', night14: 'night', world: 'world', artists: 'roster' };
    for (const [a, k] of Object.entries(want)) expect(artKindOf27(a), a).toBe(k);
    expect(artKindOf27('nada-disso')).toBeNull();
    expect(new Set(Object.values(AREA_ART27))).toEqual(new Set(ART_KINDS27));
  });
  it('faixas de época: 4 gerações de objetos', () => {
    expect([1925, 1954, 1955, 1979, 1980, 1999, 2000, 2035].map(bandOf27)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  it('cada cena muda com a época (≥4 variantes) e a pintura é determinística e cheia', () => {
    const s = game();
    for (const k of ART_KINDS27) {
      const area = Object.keys(AREA_ART27).find((a) => AREA_ART27[a] === k)!;
      const hs = [1935, 1966, 1988, 2015].map((y) => { const m = artModel27(area, s, { year: y })!; expect(m.variant.startsWith(`${k}/${bandOf27(y)}/`)).toBe(true); const p = paintArt27(m); expect(opaque(p), `${k} ${y}`).toBeGreaterThan(0.97); return artHash27(p); });
      expect(new Set(hs).size, k).toBe(4);
      const m = artModel27(area, s, { year: 1988 })!;
      expect(artHash27(paintArt27(m))).toBe(artHash27(paintArt27(m)));
    }
  });
});

describe('r27 K — arte de página: estado', () => {
  it('finanças no vermelho × folgadas', () => {
    const s = game();
    s.player.cash = -5000; expect(artModel27('finance', s)!.state).toBe('red');
    s.player.cash = s.player.initialCash * 10; expect(artModel27('finance', s)!.state).toBe('rich');
  });
  it('submundo vazio × movimentado e com calor da polícia', () => {
    const s = game();
    const c = crime17(s); c.log = []; c.heat = {};
    expect(artModel27('crime', s)!.state).toBe('empty');
    c.log.push({} as never); c.heat.BRA = 70;
    const m = artModel27('crime', s)!;
    expect(m.state).toBe('busy-hot');
    expect(m.figs.length).toBeGreaterThan(1);
  });
  it('você: moradia pela riqueza; prêmios: estante pelos troféus; imprensa: manchete de escândalo', () => {
    const s = game();
    s.player.cash = 0; expect(artModel27('you', s)!.state).toBe('w0');
    s.player.cash = s.player.initialCash * 50; expect(artModel27('you', s)!.state).toBe('w3');
    s.player.stats.awards = 0; s.player.stats.gold = 0; expect(artModel27('awards', s)!.state).toBe('bare');
    s.player.stats.awards = 6; expect(artModel27('awards', s)!.state).toBe('full');
    const a = myAct(s);
    expect(artModel27('news17', s)!.state).toBe('calm');
    (s.x4 as unknown as { scandal17: { last: Record<string, { w: number }> } }).scandal17.last[a.id] = { w: s.week } as never;
    expect(artModel27('news17', s)!.state).toBe('scandal');
  });
});

describe('r27 K — cenas: qual acontecimento dispara qual cena', () => {
  it('memória e fatos do jogador → cena; do mundo → nada', () => {
    const s = game();
    const a = myAct(s, 70);
    const other = Object.values(s.acts).find((x) => x.owner !== 'player')!;
    const map: [string, string | null][] = [['release', 'press1'], ['number1', 'no1'], ['signed', 'star'], ['gigs', 'show1'], ['sellout', 'sold'], ['stage_incident', 'flop'], ['member_quits', 'leave'], ['festival', 'fest'], ['tour_done', null]];
    for (const [k, v] of map) expect(cutOfMemory27(s, k, a.id), k).toBe(v);
    expect(cutOfMemory27(s, 'release', other.id)).toBeNull();
    expect(cutOfMemory27(s, 'session', a.id, l('{p} diz que X é "a melhor sessão do ano".', 'x'))).toBe('magic');
    expect(cutOfFact27(s, { kind: 'scandal', actors: [a.id], tags: [], severity: 40, visibility: 'public' })).toBe('scandal');
    expect(cutOfFact27(s, { kind: 'scandal', actors: [other.id], tags: [], severity: 40, visibility: 'public' })).toBeNull();
    expect(cutOfFact27(s, { kind: 'arrest', actors: ['player'], tags: ['crime'], severity: 50, visibility: 'public' })).toBe('raid');
    expect(cutOfFact27(s, { kind: 'arrest', actors: [other.id], tags: ['crime'], severity: 50, visibility: 'public' })).toBeNull();
  });
  it('scan: começa marcando o ponto de partida, depois toca cada "primeira vez" uma vez só', () => {
    const s = game();
    s.player.stats.releases = 0;
    const a = myAct(s);
    expect(scan27(s)).toEqual([]); // início: nada do passado vira cena
    remember(s, 'release', l('lança', 'releases'), { actId: a.id });
    const got = scan27(s);
    expect(got.map((d) => d.key)).toEqual(['press1']);
    expect(got[0].actId).toBe(a.id);
    remember(s, 'release', l('lança de novo', 'again'), { actId: a.id });
    expect(scan27(s).map((d) => d.key)).toEqual([]);
  });
  it('scan: no máximo 2 por avanço, as mais importantes primeiro; fatos (escândalo) entram', () => {
    const s = game();
    const a = myAct(s);
    scan27(s);
    remember(s, 'gigs', l('show', 'show'), { actId: a.id });
    remember(s, 'number1', l('nº1', 'no1'), { actId: a.id });
    emitFact(s, { kind: 'scandal', actors: [a.id], severity: 60, visibility: 'public', tags: ['drugs', 'bad'], text: l('Escândalo', 'Scandal') });
    expect(scan27(s).map((d) => d.key)).toEqual(['no1', 'scandal']);
    expect(scan27(s)).toEqual([]); // o que não coube não volta
  });
  it('preferência: só importantes corta as menores; desligadas não toca nada mas avança o cursor', () => {
    const s = game();
    const a = myAct(s);
    scan27(s);
    remember(s, 'gigs', l('show', 'show'), { actId: a.id });
    expect(scan27(s, 'major')).toEqual([]);
    remember(s, 'number1', l('nº1', 'no1'), { actId: a.id });
    expect(scan27(s, 'off')).toEqual([]);
    expect(scan27(s, 'all')).toEqual([]);
    expect(CUT27.no1.tier).toBe('major');
    expect(CUT27.show1.tier).toBe('minor');
  });
  it('nova era: toca quando a geração dos objetos avança', () => {
    const s = game(1978);
    scan27(s);
    s.year = 1981;
    expect(scan27(s).map((d) => d.key)).toEqual(['era']);
  });
  it('ameaça de falência: caixa negativo com meses de insolvência (uma vez por ano)', () => {
    const s = game();
    scan27(s);
    s.player.cash = -100000; s.player.insolvencyMonths = 1;
    expect(scan27(s).map((d) => d.key)).toEqual(['broke']);
    expect(scan27(s)).toEqual([]);
  });
});

describe('r27 K — cenas: escolhas com efeito real', () => {
  const dOf = (s: GameState, key: CutData27['key'], actId?: string): CutData27 => ({ key, ref: `t-${key}-${s.week}`, year: s.year, week: s.week, actId });
  it('prensagem: levar às rádios custa caixa e dá momento; repetir não aplica duas vezes', () => {
    const s = game();
    const a = myAct(s); a.momentum = 10;
    const cash = s.player.cash;
    const d = dOf(s, 'press1', a.id);
    expect(choose27(s, d, 'radio')).not.toBeNull();
    expect(s.player.cash).toBeLessThan(cash);
    expect(a.momentum).toBe(14);
    expect(choose27(s, d, 'radio')).toBeNull();
    expect(a.momentum).toBe(14);
    expect(cut27(s).done[d.ref]).toBe('radio');
  });
  it('falência: pedir empréstimo usa o banco de verdade', () => {
    const s = game();
    s.player.loans = []; s.player.insolvencyMonths = 0;
    const cash = s.player.cash;
    choose27(s, dOf(s, 'broke'), 'loan');
    expect(s.player.loans.length).toBe(1);
    expect(s.player.cash).toBeGreaterThan(cash);
  });
  it('falência: vender equipamento tira o item mais caro e entra dinheiro', () => {
    const s = game();
    s.player.equipment = ['ribbon_mic', 'mixing_desk'];
    const cash = s.player.cash;
    choose27(s, dOf(s, 'broke'), 'sell');
    expect(s.player.equipment).toEqual(['ribbon_mic']);
    expect(s.player.cash).toBeGreaterThan(cash);
  });
  it('batida: cooperar esfria a polícia e confisca o produto do crime; queimar provas esquenta', () => {
    const s = game();
    const a3 = a3Of(s, s.config.homeCity);
    crime17(s).heat[a3] = 50; crime17(s).loot19 = 9999;
    choose27(s, { ...dOf(s, 'raid'), ref: 'r1' }, 'cooperate');
    expect(heatIn(s, a3)).toBe(30);
    expect(crime17(s).loot19).toBe(0);
    choose27(s, { ...dOf(s, 'raid'), ref: 'r2' }, 'burn');
    expect(heatIn(s, a3)).toBe(38);
  });
  it('escândalo: negar é cara ou coroa determinístico (sem Rng do jogo)', () => {
    const s = game();
    const a = myAct(s); a.momentum = 20;
    const inst = s.player.reputation.institutional;
    const rng = rngSnapshot19(s);
    const ref = ['x1', 'x2', 'x3', 'x4', 'x5', 'x6'].find((r) => coin27(r))!;
    choose27(s, { ...dOf(s, 'scandal', a.id), ref }, 'deny');
    expect(a.momentum).toBe(23);
    const bad = ['y1', 'y2', 'y3', 'y4', 'y5', 'y6'].find((r) => !coin27(r))!;
    choose27(s, { ...dOf(s, 'scandal', a.id), ref: bad }, 'deny');
    expect(s.player.reputation.institutional).toBeCloseTo(Math.max(0, inst - 2.5), 5);
    expect(rngSnapshot19(s)).toBe(rng);
  });
  it('toda cena tem quadro pintável nas duas pontas da história e 0–3 escolhas', () => {
    const s = game();
    const a = myAct(s);
    for (const key of CUT_KEYS27) {
      expect(CUT27[key].choices.length).toBeLessThanOrEqual(3);
      expect(CUT27[key].ms).toBeGreaterThanOrEqual(5000);
      expect(CUT27[key].ms).toBeLessThanOrEqual(15000);
      for (const y of [1930, 2020]) {
        const m = cutModel27(s, { ...dOf(s, key, a.id), year: y });
        const p = paintArt27(m, 2.5);
        paintFx27(p, m, CUT27[key].fx, 2.5);
        expect(opaque(p), `${key} ${y}`).toBeGreaterThan(0.97);
      }
    }
  });
});
