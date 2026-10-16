// R31 · onda 4 (PRED) — todo tipo de prédio do mapa tem arte própria em toda época (assinatura de pixels distinta entre
// tipos) e o desenho não quebra em 6 épocas × 4 cidades. O canvas é simulado (o teste lê os pixels do ImageData).
import { describe, expect, it } from 'vitest';
import '../src/sim/worldgen';
import { ART31_ALL, ARTK31, BIZART31, NBART31, RART31, artOfKind31, type Art31 } from '../src/ui/pixel/pred31';
import { PLART31 } from '../src/ui/pixel/pred31place';
import { BIZ31 } from '../src/sim/r31/city31';
import { RKINDS31 } from '../src/data/places31';
import { styleOf18, type Style18 } from '../src/sim/sys/campus18';

type FakeCv = { width: number; height: number; data?: Uint8ClampedArray; getContext: () => unknown };
(globalThis as { document?: unknown }).document = {
  createElement: () => {
    const cv: FakeCv = { width: 0, height: 0, getContext: () => ({
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (img: { data: Uint8ClampedArray }) => { cv.data = img.data; },
    }) };
    return cv;
  },
};
const { artSprite31 } = await import('../src/ui/pixel/campus18px');

const ERAS = [1905, 1935, 1962, 1978, 2000, 2030];
/** Estilo de fachada da cidade comum por cidade (o mesmo critério do mapa: tijolo, baía, torres, pedra). */
const CITY: Record<string, (y: number) => Style18> = {
  london: (y) => (y < 1990 ? 'brick' : 'loft'),
  rio: (y) => (y >= 1930 ? 'tropical' : styleOf18(y)),
  new_york: (y) => (y < 1950 ? 'deco' : y < 1975 ? 'midcentury' : y < 1990 ? 'brutal' : 'glass'),
  sao_paulo: (y) => styleOf18(y - 10),
};
const pix = (a: Art31, y: number, st?: Style18): Uint32Array => {
  const sp = artSprite31(a, y, 7, 2, st);
  const c = sp.c as unknown as FakeCv;
  expect(c.data, `${a} ${y}`).toBeTruthy();
  return new Uint32Array(c.data!.buffer.slice(0));
};
const opaque = (p: Uint32Array) => p.reduce((n, v) => n + ((v >>> 24) > 0 ? 1 : 0), 0);

describe('r31-pred — arte própria por tipo de prédio', () => {
  it('as tabelas cobrem todo lugar do mapa (BKind, vizinho, lugar do bairro, lugar real, loja da época)', () => {
    for (const a of ART31_ALL) expect(ARTK31[a], a).toBeTruthy();
    for (const k of Object.keys(ARTK31)) expect(ART31_ALL).toContain(artOfKind31(ARTK31[k as Art31]));
    for (const b of BIZ31) expect(BIZART31[b.id], b.id).toBeTruthy();
    for (const k of RKINDS31) expect(RART31[k], k).toBeTruthy();
    for (const a of [...Object.values(NBART31), ...Object.values(PLART31)]) expect(ART31_ALL).toContain(a);
    // tipos que o dono citou não podem cair na mesma arte
    expect(BIZART31.records).not.toBe(PLART31.label);
    expect(BIZART31.instruments).not.toBe(BIZART31.records);
    expect(RART31.tv).not.toBe(RART31.radio);
    expect(RART31.theatre).not.toBe('museum');
  });

  it('sem erro de desenho em 6 épocas × 4 cidades, todo tipo com pixels', () => {
    for (const city of Object.keys(CITY)) for (const y of ERAS) for (const a of ART31_ALL) {
      const p = pix(a, y, a === 'hq' ? undefined : CITY[city](y));
      expect(opaque(p), `${a} ${city} ${y}`).toBeGreaterThan(30);
    }
  });

  it('dois tipos diferentes nunca têm a mesma assinatura de pixels (toda época, mesmo lote e estilo)', () => {
    for (const y of ERAS) {
      const st = styleOf18(y);
      const ps = ART31_ALL.map((a) => pix(a, y, a === 'hq' ? undefined : st));
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        let diff = 0, tot = 0;
        if (a.length !== b.length) continue; // silhueta (tamanho do sprite) já é diferente
        for (let k = 0; k < a.length; k++) { const oa = a[k] >>> 24 > 0, ob = b[k] >>> 24 > 0; if (oa || ob) { tot++; if (a[k] !== b[k]) diff++; } }
        expect(diff / Math.max(1, tot), `${ART31_ALL[i]} × ${ART31_ALL[j]} em ${y}`).toBeGreaterThan(0.04);
      }
    }
  });
});
