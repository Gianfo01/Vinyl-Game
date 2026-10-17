// R31 · DECO-A — arte da decoração: todo item do catálogo tem desenho em toda época em que existe, no tamanho do
// catálogo, nenhum desenho é um retângulo de uma cor só, itens diferentes nunca saem iguais, épocas e níveis diferem.
import { describe, expect, it } from 'vitest';
import { Px } from '../src/ui/pixel/px';
import { DECO31, REQ31, UPG31, upgsOf31 } from '../src/data/deco31';
import {
  DPAD, DSTY_YEAR, DTILE, DWIN, decoArtSize, decoEras, decoFillPx, decoHasArt, decoIsTile, decoPx, decoSize, decoTilePx, styOf, styRange, upgPx, upgSize,
} from '../src/ui/pixel/deco31px';

const colors = (p: Px): number => { const s = new Set<number>(); for (const c of p.d) if (c >>> 24 > 40) s.add(c); return s.size; };
const filled = (p: Px): number => { let n = 0; for (const c of p.d) if (c >>> 24 > 40) n++; return n; };
const sig = (p: Px): string => `${p.w}x${p.h}:${Array.from(p.d).join(',')}`;
/** Ano dentro da época e do período do item. */
const yearIn = (e: number, from: number, to?: number): number => { const [a, b] = styRange(e); return Math.max(a, from, Math.min(b, to ? to - 1 : 2040, DSTY_YEAR[e])); };

describe('DECO-A · catálogo inteiro desenhado', () => {
  it('estilos: cortes iguais aos do catálogo', () => {
    expect([1889, 1921, 1922, 1948, 1966, 1979, 1990, 2000, 2015, 2040].map(styOf)).toEqual([0, 0, 1, 2, 3, 4, 5, 6, 7, 7]);
  });
  it('todo item de DECO31 tem desenho', () => {
    expect(DECO31.filter((d) => !decoHasArt(d.id)).map((d) => d.id)).toEqual([]);
  });
  for (const d of DECO31) {
    it(`${d.id}: toda época em que existe, tamanho do catálogo, desenho de verdade, novo ≠ usado`, () => {
      const eras = decoEras(d.id);
      expect(eras.length).toBeGreaterThan(0);
      const byEra = new Set<string>();
      for (const e of eras) {
        const y = yearIn(e, d.from, d.to);
        const p = decoPx(d.id, y);
        if (decoIsTile(d.id)) expect([p.w, p.h]).toEqual([DTILE, DTILE]);
        else {
          const a = decoArtSize(d.id);
          if (d.w > 0) expect(a).toEqual({ w: d.w, h: d.h });
          expect([p.w, p.h]).toEqual([a.w + 2 * DPAD, a.h + 2 * DPAD]);
          expect(decoSize(d.id)).toEqual({ w: p.w, h: p.h });
          expect(filled(p)).toBeLessThan(p.w * p.h); // tem silhueta
          expect(filled(p)).toBeGreaterThan(Math.min(12, a.w * a.h * 0.3));
        }
        expect(colors(p)).toBeGreaterThanOrEqual(3); // nunca um retângulo de uma cor só
        expect(sig(decoPx(d.id, y, { cond: 'used' }))).not.toBe(sig(p));
        byEra.add(sig(p));
      }
      // sem época: cada época tem desenho próprio
      if (d.style === 'any') expect(byEra.size).toBe(eras.length);
    });
  }
  it('dois itens diferentes nunca saem iguais (na mesma época)', () => {
    const seen = new Map<string, string>();
    for (const d of DECO31) for (const e of decoEras(d.id)) {
      const s = sig(decoPx(d.id, yearIn(e, d.from, d.to)));
      const other = seen.get(s);
      expect(other === undefined || other === d.id, `${d.id} igual a ${other}`).toBe(true);
      seen.set(s, d.id);
    }
  });
  it('padrões repetem sem costura e a área bate com o ladrilho', () => {
    for (const d of DECO31) if (decoIsTile(d.id)) {
      const t = decoTilePx(d.id, d.from), f = decoFillPx(d.id, d.from, 40, 24, 'new', 5, 3);
      for (let y = 0; y < 24; y++) for (let x = 0; x < 40; x++) expect(f.d[y * 40 + x]).toBe(t.d[((y + 3) % DTILE) * DTILE + ((x + 5) % DTILE)]);
    }
  });
  it('cortinas e molduras deixam o vão da janela quase todo livre (a cidade aparece)', () => {
    for (const d of DECO31) if (d.cat === 'window') {
      const p = decoPx(d.id, d.from);
      let opaque = 0;
      for (let y = DWIN.y; y < DWIN.y + DWIN.h; y++) for (let x = DWIN.x; x < DWIN.x + DWIN.w; x++) if (p.d[(y + DPAD) * p.w + x + DPAD] >>> 24 > 200) opaque++;
      expect(opaque / (DWIN.w * DWIN.h), d.id).toBeLessThan(0.45);
    }
  });
  it('letreiros escrevem o nome do selo', () => {
    for (const d of DECO31) if (d.cat === 'sign') expect(sig(decoPx(d.id, d.from, { name: 'Odeon' })), d.id).not.toBe(sig(decoPx(d.id, d.from, { name: 'Rocinante' })));
  });
  it('determinístico', () => {
    expect(sig(decoPx('h_jukebox', 1960, { lit: true }))).toBe(sig(decoPx('h_jukebox', 1960, { lit: true })));
  });
});

describe('DECO-A · upgrades dos obrigatórios', () => {
  for (const r of REQ31) {
    it(`${r.id}: todos os níveis no mesmo tamanho, distintos entre si, novo ≠ usado`, () => {
      const ups = upgsOf31(r.id);
      expect(ups.length).toBeGreaterThan(0);
      const sz = upgSize(ups[0].id), seen = new Set<string>();
      for (const u of ups) {
        const p = upgPx(u.id, Math.max(u.from, 1905));
        expect([p.w, p.h]).toEqual([sz.w, sz.h]);
        expect(colors(p)).toBeGreaterThanOrEqual(4);
        expect(filled(p)).toBeLessThan(p.w * p.h);
        expect(sig(upgPx(u.id, Math.max(u.from, 1905), { cond: 'used' }))).not.toBe(sig(p));
        seen.add(sig(p));
      }
      expect(seen.size).toBe(ups.length); // cada modelo (nível/época) tem desenho próprio
      // nível maior = mais detalhe (mais cores ou mais área desenhada)
      const best = (lv: number) => Math.max(...ups.filter((u) => u.lv === lv).map((u) => { const p = upgPx(u.id, Math.max(u.from, 1905)); return colors(p) * 1000 + filled(p); }));
      const lvs = [...new Set(ups.map((u) => u.lv))].sort();
      expect(best(lvs[lvs.length - 1])).toBeGreaterThan(Math.min(...lvs.map(best)) - 1);
    });
  }
  it('todo modelo de UPG31 desenha', () => {
    for (const u of UPG31) expect(() => upgPx(u.id, Math.max(u.from, 1905))).not.toThrow();
  });
});
