// R33 · INTRO33 — a rua que atravessa as épocas: cada trecho desenha sem erro (sem DOM), o loop volta ao começo, só há um
// holograma, movimento reduzido é um quadro parado, e nenhum quadro é um bloco de uma cor só.
import { describe, expect, it } from 'vitest';
import { Px } from '../src/ui/pixel/px';
import { ep5Of } from '../src/ui/pixel/exp5px';
import {
  PITCH33, ROOFLINE33, STOPS33, WH33, WW33, buildSky33, buildWorld33, camOf33, frame33, homeState33, intro33Plan, introState33, riverHW33, stillHome33, stopOfYear33, waveColAt33, yearAt33,
  type FrameOpts33,
} from '../src/ui/r33/intro33px';
import { intro33On } from '../src/sim/r33/intro33sw';

// no node não há canvas: o sprite devolve o próprio buffer
(Px.prototype as unknown as { canvas: () => unknown }).canvas = function (this: Px) { return this; };

const W = 480, H = 270, Y0 = Math.round(0.3 * H) - ROOFLINE33;
const world = buildWorld33('pt'), sky = buildSky33();
const colors = (p: Px): number => { const s = new Set<number>(); for (let i = 0; i < p.d.length; i += 7) s.add(p.d[i]); return s.size; };
const render = (cam: number, o: FrameOpts33): Px => { const out = new Px(W, H); frame33(world, sky, out, { W, H, cam, y0: Y0 }, o); return out; };
const same = (a: Px, b: Px): boolean => a.d.every((v, i) => v === b.d[i]);

describe('INTRO33 · o mundo', () => {
  it('7 trechos, de 1889 a 2035, em ordem, nas 6 faixas de época do jogo', () => {
    expect(STOPS33.map((s) => s.year)).toEqual([1889, 1920, 1950, 1965, 1975, 1995, 2035]);
    expect(STOPS33.map((s) => ep5Of(s.year))).toEqual([0, 1, 2, 2, 3, 4, 5]);
    STOPS33.forEach((s, i) => { expect(s.cx).toBeGreaterThan(i ? STOPS33[i - 1].cx : 0); expect(s.cx + PITCH33).toBeLessThan(WW33 + PITCH33); });
    expect(world.W).toBe(WW33); expect(world.H).toBe(WH33);
  });
  it('o ano anda junto com a posição, e a onda muda de cor do dourado ao ciano', () => {
    let prev = 0;
    for (let x = 0; x <= WW33; x += 40) { const y = yearAt33(x); expect(y).toBeGreaterThanOrEqual(prev); prev = y; }
    expect(yearAt33(STOPS33[0].cx)).toBe(1889); expect(yearAt33(STOPS33[6].cx)).toBe(2035);
    const r = (c: number) => c & 255, b = (c: number) => (c >> 16) & 255;
    expect(r(waveColAt33(STOPS33[0].cx))).toBeGreaterThan(b(waveColAt33(STOPS33[0].cx))); // dourado: mais vermelho que azul
    expect(b(waveColAt33(STOPS33[6].cx))).toBeGreaterThan(r(waveColAt33(STOPS33[6].cx))); // ciano: mais azul que vermelho
  });
  it('só existe UM holograma no mundo (a cantora de 2035)', () => {
    expect(world.holos).toBe(1);
    expect(world.fixed.filter((f) => f.holo)).toHaveLength(1);
    expect(world.fixed.filter((f) => f.holo)[0].year).toBeGreaterThanOrEqual(2030);
  });
  it('tem vida: gente, carros, postes, janelas, ribalta, plateia, torre e luzes de palco', () => {
    expect(world.walkers.length).toBeGreaterThanOrEqual(21);
    expect(world.cars.length).toBeGreaterThanOrEqual(14);
    expect(world.lamps.length).toBeGreaterThanOrEqual(9);
    expect(world.windows.length).toBeGreaterThanOrEqual(5);
    expect(world.gas.length).toBeGreaterThan(5);
    expect(world.spots.length).toBeGreaterThanOrEqual(4);
    expect(world.reels.length).toBe(2);
    expect(world.tower[1]).toBeLessThan(ROOFLINE33);
    expect(world.crowdBox[2]).toBeGreaterThan(60);
    expect(new Set(world.lamps.map((l) => l.kind))).toEqual(new Set(['gas', 'elec', 'led'])); // gás → elétrico → LED
  });
  it('easter eggs: gatos, pombos e um violonista de rua, todos em cima de algo do mundo', () => {
    expect(world.eggs.cats.length).toBe(2); expect(world.eggs.pigeons.length).toBe(5);
    for (const [x, y] of [...world.eggs.cats, ...world.eggs.pigeons]) { expect(x).toBeGreaterThan(0); expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(ROOFLINE33 + 40); }
    expect(world.eggs.busker).toBeGreaterThan(STOPS33[3].cx); expect(world.eggs.busker).toBeLessThan(STOPS33[4].cx);
    // o disco voador só cruza o céu quando a onda passa pelos anos 50: o céu muda entre antes e durante
    const before = { head: STOPS33[1].cx, cam: camOf33(STOPS33[2].cx, W), fade: 0, flash: 0, logo: 0 }, during = { ...before, head: (STOPS33[2].cx + STOPS33[3].cx) / 2 };
    expect(same(render(before.cam, { t: 1, state: before }), render(before.cam, { t: 1, state: during }))).toBe(false);
  });
  it('o rio abre para quem olha e as pontas têm ponte (água dos dois lados do mundo)', () => {
    expect(riverHW33(150)).toBeGreaterThan(riverHW33(90));
    let water = 0;
    for (const x of [140, WW33 - 140]) for (let y = 90; y < 140; y++) { const c = world.base.get(x, y); if (((c >> 16) & 255) > (c & 255) + 20) water++; }
    expect(water).toBeGreaterThan(40);
  });
});

describe('INTRO33 · cada trecho desenha, e nenhum quadro é um bloco de uma cor', () => {
  for (const [i, s] of STOPS33.entries()) {
    it(`${s.year} (${s.id})`, () => {
      const head = s.cx + 60, cam = camOf33(s.cx + W * 0.04, W);
      const out = render(cam, { t: 1.3, state: { head, cam, fade: 0, flash: 0, logo: 0 } });
      expect(out.w).toBe(W);
      expect(colors(out)).toBeGreaterThan(60);
      // o trecho tem desenho de verdade (não é bloco): pixels do corte, no mundo, em muitas cores
      const cut = new Set<number>();
      for (let y = 0; y < world.H; y++) for (let x = s.cx - 40; x < s.cx + 40; x++) cut.add(world.base.get(x, y));
      expect(cut.size).toBeGreaterThan(i === 6 ? 30 : 40);
    });
  }
  it('os 7 trechos são diferentes entre si', () => {
    const sig = STOPS33.map((s) => { const p = new Px(80, world.H); for (let y = 0; y < world.H; y++) for (let x = 0; x < 80; x++) p.put(x, y, world.base.get(s.cx - 40 + x, y)); return p; });
    for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) expect(same(sig[a], sig[b])).toBe(false);
  });
});

describe('INTRO33 · o loop', () => {
  it('começa e termina no escuro (o corte do loop não aparece) e volta ao começo', () => {
    const a = homeState33(0, W), z = homeState33(0.999999, W), wrap = homeState33(((40000) % 40000) / 40000, W);
    expect(a.fade).toBe(1); expect(z.fade).toBeGreaterThan(0.99);
    expect(wrap).toEqual(a);
    const dark = (p: Px) => { let s = 0; for (const c of p.d) s += (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255); return s / p.d.length / 3; };
    expect(dark(render(a.cam, { t: 0, state: a }))).toBeLessThan(12);
    expect(dark(render(z.cam, { t: 39.9, state: z }))).toBeLessThan(12);
  });
  it('a onda anda sempre para a direita e a câmera vai junto, de 1889 a 2035', () => {
    let head = -1, cam = -1;
    for (let u = 0.03; u <= 0.86; u += 0.01) { const s = homeState33(u, W); expect(s.head).toBeGreaterThanOrEqual(head); expect(s.cam).toBeGreaterThanOrEqual(cam); head = s.head; cam = s.cam; }
    expect(homeState33(0.05, W).head).toBeLessThan(STOPS33[1].cx);
    expect(homeState33(0.86, W).head).toBeGreaterThan(STOPS33[6].cx);
    expect(yearAt33(homeState33(0.05, W).cam + W / 2)).toBeLessThan(1920);
  });
  it('perto do fim a rua toda está acesa (janelas acendem com a onda) e o quadro tem o clarão', () => {
    const early = homeState33(0.1, W), late = homeState33(0.9, W);
    const a = render(camOf33(STOPS33[0].cx, W), { t: 2, state: { ...early, head: STOPS33[0].cx - 120 } });
    const b = render(camOf33(STOPS33[0].cx, W), { t: 2, state: { ...late, head: STOPS33[6].cx + 90, fade: 0, flash: 0 } });
    expect(same(a, b)).toBe(false);
    expect(late.flash).toBeGreaterThan(0);
  });
});

describe('INTRO33 · movimento reduzido', () => {
  it('é um quadro parado: a mesma imagem sempre, e bonita (muitas cores)', () => {
    const s = stillHome33(W), a = render(s.cam, { t: 0, state: s }), b = render(s.cam, { t: 0, state: stillHome33(W) });
    expect(same(a, b)).toBe(true);
    expect(colors(a)).toBeGreaterThan(80);
    expect(s.fade).toBe(0);
  });
  it('com o tempo correndo a imagem muda (a animação existe; reduzido é que a desliga)', () => {
    const s = stillHome33(W);
    expect(same(render(s.cam, { t: 0, state: s }), render(s.cam, { t: 2.4, state: s }))).toBe(false);
  });
});

describe('INTRO33 · a intro da partida', () => {
  it('cada faixa de época cai no trecho dela', () => {
    expect([1889, 1905, 1919, 1920, 1949, 1950, 1959, 1960, 1962, 1969, 1970, 1989, 1990, 2009, 2010, 2025, 2040].map(stopOfYear33)).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5, 6, 6, 6]);
  });
  it('dura uns 12 a 15 segundos, em qualquer época', () => {
    for (const y of [1889, 1920, 1962, 1980, 2000, 2025, 2040]) { const p = intro33Plan(y); expect(p.totalMs).toBeGreaterThanOrEqual(12000); expect(p.totalMs).toBeLessThanOrEqual(15500); }
  });
  it('o herói anda até o trecho escolhido, para ali, e a imagem escurece no fim', () => {
    const p = intro33Plan(1962), W2 = 480;
    let prev = -1;
    for (let ms = 0; ms <= p.walkMs; ms += 250) { const s = introState33(ms, W2, p); expect(s.hero).toBeGreaterThanOrEqual(prev); prev = s.hero; expect(s.walking).toBe(ms < p.walkMs); }
    expect(introState33(p.walkMs, W2, p).hero).toBeCloseTo(STOPS33[p.stop].cx, 0);
    expect(introState33(p.walkMs + 2000, W2, p).walking).toBe(false);
    expect(introState33(0, W2, p).fade).toBe(1);
    expect(introState33(p.totalMs, W2, p).fade).toBeGreaterThan(0.99);
    expect(introState33(p.walkMs + 1000, W2, p).fade).toBe(0);
  });
  it('desenha o herói e o ano em cada etapa da caminhada', () => {
    const p = intro33Plan(2025);
    const look = { body: 1, face: 1, skin: 1, hair: 3, hairColor: 2, outfit: 1, outfitColor: 3, glasses: false, hat: false, beard: false };
    for (const f of [0.1, 0.5, 0.95]) {
      const ms = p.walkMs * f, s = introState33(ms, W, p), y = yearAt33(s.hero);
      const out = render(s.cam, { t: ms / 1000, state: s, hero: { x: s.hero, look, year: y, walking: true, stride: s.hero / 6.5 }, yearTag: y });
      expect(colors(out)).toBeGreaterThan(60);
    }
  });
});

describe('INTRO33 · interruptor', () => {
  it('exp33.intro existe e vem ligado por padrão', () => {
    expect(intro33On()).toBe(true);
  });
});
