// r29 (cenas): mais cenas animadas e as antigas melhoradas. Confere que toda cena pinta em toda época sem erro (e de
// forma determinística), que as escolhas são determinísticas e só valem uma vez, que a fila e o orçamento de atenção
// continuam valendo, que nada mexe no s.rng (nem nos fluxos do rng19) e que o álbum/storyboard recebe cada cena.
import { describe, expect, it } from 'vitest';
import { l } from '../src/data/world';
import { defaultConfig } from '../src/sim/bot';
import { fileLawsuit } from '../src/sim/business';
import { queueCutscene } from '../src/sim/ext4';
import { emitFact } from '../src/sim/facts17';
import { album28 } from '../src/sim/sys/end28';
import { attnScenes28 } from '../src/sim/sys/story28';
import type { Act, GameState } from '../src/sim/types';
import { remember, rngOf } from '../src/sim/util';
import { createGame, spawnProceduralAct } from '../src/sim/worldgen';
import { artHash27 } from '../src/ui/ps/art27';
import { CUT27, CUT_KEYS27, beat27, beatsOf27, choose27, cutModel27, scan27, type CutData27, type CutKey27 } from '../src/ui/ps/cut27model';
import { CUT29, KEYS29, coin29, cutOfMemory29, onceKey29 } from '../src/ui/ps/cut29model';
import { paintCut29 } from '../src/ui/ps/cutpaint29';
import { FULL_KEYS29, hasStage29 } from '../src/ui/pixel/cenas29';
import { log29, log29of, outcome29 } from '../src/ui/ps/album29';

const game = (seed = 'r29cut', startYear = 1990): GameState => { const c = defaultConfig(seed, { scenario: 'established', startYear } as Parameters<typeof defaultConfig>[1]); (c as { dbSize?: string }).dbSize = 'small'; return createGame(c); };
const myAct = (s: GameState): Act => { const a = spawnProceduralAct(s, rngOf(s), { city: s.config.homeCity, fame: 60 }); a.owner = 'player'; return a; };
const ERAS = [1925, 1948, 1962, 1977, 1986, 1996, 2006, 2021];
const dataFor = (s: GameState, a: Act, key: CutKey27, year: number): CutData27 => ({
  key, ref: `t29:${key}:${year}`, actId: a.id, pid: a.members[0], p: s.persons[a.members[0]]?.name, a: a.name, year, week: s.week,
  t: key === 'tech' ? 'Rádio' : key === 'verdict' ? 'Sentença: plágio — vitória do selo.' : key === 'plat' ? 'Hino' : 'Uma manchete de teste', city: s.config.homeCity,
});
const rngSnap = (s: GameState): string => JSON.stringify([s.rng, (s as unknown as { x4?: { rng19?: unknown } }).x4?.rng19 ?? null]);

describe('r29 — catálogo', () => {
  it('15+ cenas novas, cada uma com 2–3 escolhas, cena-base e arte própria (cenário ou camada)', () => {
    expect(KEYS29.length).toBeGreaterThanOrEqual(15);
    for (const k of KEYS29) {
      const d = CUT29[k];
      expect(CUT27[k as CutKey27]).toBe(d);
      expect(d.choices.length, k).toBeGreaterThanOrEqual(2);
      expect(d.choices.length, k).toBeLessThanOrEqual(3);
      expect(d.beats.length, k).toBeGreaterThanOrEqual(2);
      expect(hasStage29(k === 'verdict' ? 'court' : k === 'acq' ? 'sale' : k === 'gold' || k === 'plat' ? 'cert' : k), k).toBe(true);
    }
    // F8: golpe, holograma e herdeiros ganharam arte própria
    for (const k of ['coup', 'heirs']) expect(FULL_KEYS29.has(k)).toBe(true);
    expect(hasStage29('holo')).toBe(true);
  });
  it('falas: variantes por hash da cena (estável) e placeholders resolvidos com nomes e objetos da época', () => {
    const s = game(); const a = myAct(s);
    for (const k of CUT_KEYS27) for (const y of [1930, 1975, 2015]) {
      const d = dataFor(s, a, k, y);
      const b1 = beatsOf27(d), b2 = beatsOf27(d);
      expect(b1).toBe(b2);
      for (const b of b1) { const r = beat27(s, d, b); expect(r.pt, `${k} ${y}`).not.toMatch(/\{[a-z]\}/); expect(r.en, `${k} ${y}`).not.toMatch(/\{[a-z]\}/); }
    }
    const anyVar = CUT_KEYS27.some((k) => { const refs = Array.from({ length: 12 }, (_, i) => beatsOf27({ ...dataFor(s, a, k, 1990), ref: `v${i}` })); return new Set(refs).size > 1; });
    expect(anyVar).toBe(true);
  });
});

describe('r29 — toda cena pinta em toda época', () => {
  it('sem erro, quadro cheio, determinístico e diferente entre gerações', () => {
    const s = game(); const a = myAct(s);
    for (const k of CUT_KEYS27) {
      const hs = new Set<string>();
      for (const y of ERAS) {
        const d = dataFor(s, a, k, y);
        const m = cutModel27(s, d);
        const p1 = paintCut29(s, d, m, 0), p2 = paintCut29(s, d, cutModel27(s, d), 0);
        expect(artHash27(p1), `${k} ${y}`).toBe(artHash27(p2));
        let opaque = 0; for (let i = 0; i < p1.d.length; i += 7) if ((p1.d[i] >>> 24) > 0) opaque++;
        expect(opaque / (p1.d.length / 7), `${k} ${y}`).toBeGreaterThan(0.9);
        paintCut29(s, d, m, 3.7); // animado também não quebra
        hs.add(artHash27(p1));
      }
      expect(hs.size, k).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('r29 — detecção', () => {
  it('memórias reais viram as cenas certas, só de ato seu', () => {
    const s = game(); const a = myAct(s); const once: Record<string, number> = {};
    const other = Object.values(s.acts).find((x) => x.owner && x.owner !== 'player')!;
    const M = (kind: string, pt: string, actId?: string) => cutOfMemory29(s, { kind, actId, text: l(pt, pt) }, once);
    expect(M('signed', 'X assina', a.id)).toBe('sign1');
    expect(M('session', 'conclui sessão', a.id)).toBe('studio1');
    expect(M('session', 'diz que é "a melhor sessão do ano"', a.id)).toBeNull();
    expect(M('split', 'chega ao fim', a.id)).toBe('split');
    expect(M('split', 'chega ao fim', other.id)).toBeNull();
    expect(M('reunion', 'reunião', a.id)).toBe('reunion');
    expect(M('lineup', 'Fulano entra em X', a.id)).toBe('join');
    expect(M('lineup', 'X passa a se chamar Y', a.id)).toBeNull();
    expect(M('sniped', 'levou', other.id)).toBe('poach');
    expect(M('promise_broken', 'quebrada', a.id)).toBe('vow_broken');
    expect(M('promise_kept', 'cumprida', a.id)).toBe('vow_kept');
    expect(M('lawsuit', 'processo')).toBe('court');
    expect(M('verdict', 'sentença')).toBe('verdict');
    expect(M('payola', 'jabá')).toBe('payola');
    expect(M('cert', '"Hino" recebe disco de ouro', a.id)).toBe('gold');
    expect(M('cert', '"Hino" recebe disco de platina', a.id)).toBe('plat');
    expect(M('festival', 'toca no Rock (headline)', a.id)).toBe('headline');
    expect(M('festival', 'toca no Rock (abertura)', a.id)).toBeNull();
    expect(M('hq', 'muda para')).toBe('hq');
    expect(M('retired', 'aposentadoria', a.id)).toBe('retire');
    expect(M('label_sold', 'vendida')).toBe('sale');
    expect(M('acquisition', 'compra')).toBe('acq');
    expect(M('tech', 'Chega Streaming.')).toBe('tech');
    expect(M('tech', 'Chega Gravação elétrica.')).toBeNull();
    once.sign1 = 1; expect(M('signed', 'X assina', a.id)).toBeNull(); // a primeira assinatura é uma só
  });
  it('scan: memória e fato reais viram cena com o ato certo; pirataria pelo fato do crime17', () => {
    const s = game(); const a = myAct(s);
    scan27(s);
    remember(s, 'split', l(`Sem ninguém, ${a.name} chega ao fim.`, `${a.name} ends.`), { actId: a.id });
    emitFact(s, { kind: 'piracy', actors: [a.id, 'o:x'], severity: 25, visibility: 'rumor', tags: ['crime', 'bad'], text: l('Piratas', 'Bootlegs'), src: 'test' });
    const got = scan27(s);
    expect(got.map((d) => d.key).sort()).toEqual(['bootleg', 'split']);
    expect(got.every((d) => d.actId === a.id)).toBe(true);
    remember(s, 'split', l('de novo', 'again'), { actId: a.id });
    expect(scan27(s)).toEqual([]); // uma vez por ato
  });
});

describe('r29 — escolhas', () => {
  it('determinísticas (mesmo jogo → mesmo resultado), uma vez por cena, sem tocar no s.rng', () => {
    for (const k of KEYS29) for (const c of CUT29[k].choices) {
      const run = () => { const s = game('r29ch'); const a = myAct(s); const d = dataFor(s, a, k, 1990); const before = rngSnap(s); const out = choose27(s, d, c.id); const again = choose27(s, d, c.id); return { out, again, cash: s.player.cash, rep: { ...s.player.reputation }, trust: a.trust, mom: a.momentum, rng: rngSnap(s) === before }; };
      const r1 = run(), r2 = run();
      expect(r1.out, `${k}/${c.id}`).toBeTruthy();
      expect(r1.again).toBeNull();
      expect(r1).toEqual(r2);
      expect(r1.rng, `${k}/${c.id} mexeu no rng`).toBe(true);
    }
  });
  it('acordo do processo é o mesmo fluxo do painel (settleLawsuit) e o advogado mexe na chance real', () => {
    const s = game(); const a = myAct(s);
    s.player.cash += 10_000_000;
    const suit = fileLawsuit(s, { kind: 'plagiarism', plaintiff: 'Compositor', defendant: 'player', actId: a.id, claim: 100000, odds: 0.5, text: l('Plágio de teste', 'Test plagiarism') });
    const d = { ...dataFor(s, a, 'court', s.year), t: 'Plágio de teste' };
    expect(choose27(s, { ...d, ref: 'c-fight' }, 'fight')).toBeTruthy();
    expect(suit.odds).toBeCloseTo(0.58);
    expect(choose27(s, d, 'settle')).toBeTruthy();
    expect(suit.stage).toBe('settled');
  });
  it('o cara-ou-coroa sai do hash da cena', () => {
    expect(coin29('abc', 0.5)).toBe(coin29('abc', 0.5));
    const xs = Array.from({ length: 200 }, (_, i) => coin29(`ref${i}`, 0.5));
    expect(xs.filter(Boolean).length).toBeGreaterThan(60);
    expect(xs.filter(Boolean).length).toBeLessThan(140);
  });
  it('scan e pintura também não tocam no s.rng', () => {
    const s = game(); const a = myAct(s);
    scan27(s);
    const before = rngSnap(s);
    remember(s, 'retired', l('aposentadoria', 'retires'), { actId: a.id });
    scan27(s);
    for (const k of CUT_KEYS27) paintCut29(s, dataFor(s, a, k, 1970), cutModel27(s, dataFor(s, a, k, 1970)), 1);
    expect(rngSnap(s)).toBe(before);
  });
});

describe('r29 — fila e orçamento de atenção', () => {
  it('no máximo 2 cenas por avanço (as mais importantes), o resto conta como visto', () => {
    const s = game(); const a = myAct(s);
    scan27(s);
    for (const [k, pt] of [['split', 'fim'], ['retired', 'aposentadoria'], ['label_sold', 'vendida'], ['hq', 'sede'], ['payola', 'jabá']] as const) remember(s, k, l(pt, pt), { actId: k === 'split' || k === 'retired' ? a.id : undefined });
    const got = scan27(s);
    expect(got.length).toBe(2);
    expect(got.map((d) => d.key)).toEqual(['sale', 'split']); // prioridades 96 e 87
    expect(scan27(s)).toEqual([]);
  });
  it('as cenas novas passam pelo mesmo orçamento do story28 (2 por avanço, 3 por mês; decisões passam)', () => {
    const s = game();
    const list = ['hq', 'leg', 'gold', 'join'].map((k) => queueCutscene(s, 'cut27', { title: CUT27[k as CutKey27].title, d: { key: k }, int23: 'milestone' }));
    const ok = attnScenes28(s, list);
    expect(ok.length).toBe(2);
    const dec = queueCutscene(s, 'cut27', { title: CUT27.sale.title, d: { key: 'sale' }, int23: 'always' });
    expect(attnScenes28(s, [dec])).toEqual([dec.id]);
  });
  it('regras "uma vez" das cenas novas', () => {
    const d = (key: CutKey27, o: Partial<CutData27> = {}): CutData27 => ({ key, ref: 'r', year: 1990, week: 100, actId: 'a1', ...o });
    expect(onceKey29('sign1', d('sign1'))).toBe('sign1');
    expect(onceKey29('gold', d('gold'))).toBe(onceKey29('gold', d('gold', { ref: 'outra' })));
    expect(onceKey29('court', d('court'))).not.toBe(onceKey29('court', d('court', { week: 120 })));
  });
});

describe('r29 — álbum e storyboard', () => {
  it('cada cena registrada entra no álbum (com a escolha) e no storyboard do fim', () => {
    const s = game(); const a = myAct(s);
    for (const k of CUT_KEYS27) { const d = dataFor(s, a, k, s.year); log29(s, queueCutscene(s, 'cut27', { title: CUT27[k].title, d }), d); }
    const xs = log29of(s);
    expect(new Set(xs.map((x) => x.k))).toEqual(new Set(CUT_KEYS27));
    const d0 = xs.find((x) => x.k === 'gold')!.d;
    const out = choose27(s, d0, 'wall'); outcome29(s, d0, 'wall', out);
    expect(xs.find((x) => x.k === 'gold')!.ch).toBe('wall');
    const alb = album28(s, 50);
    expect(alb.some((x) => x.kind === 'cut27')).toBe(true);
    expect(log29of(s).length).toBe(CUT_KEYS27.length);
  });
});
