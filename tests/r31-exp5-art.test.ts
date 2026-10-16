// R31 · onda 5 (ART5) — a arte nova desenha sem erro, no tamanho certo, e nenhum desenho é um retângulo de uma cor só.
import { describe, expect, it } from 'vitest';
import { Px } from '../src/ui/pixel/px';
import { EP5, EP5_YEAR, OBJ5, OBJ5_IDS, PAD5, ST5, TRAVEL5, ep5Of, obj5Px, obj5Size, travel5Px } from '../src/ui/pixel/exp5px';
import {
  CAT5, INBOX5, PAPER5, card5Px, inbox5Layout, inbox5Look, inbox5Px, inboxItem5Px, paper5Layout, paper5Px, polaroid5Px, postit5Px, tab5Px,
  type Cat5, type Rect5,
} from '../src/ui/pixel/exp5paper';

/** Quantas cores diferentes (opacas) tem o desenho, e se há transparência em volta (não é um bloco cheio). */
function colors(p: Px): number { const s = new Set<number>(); for (const c of p.d) if (c >>> 24 > 40) s.add(c); return s.size; }
function filled(p: Px): number { let n = 0; for (const c of p.d) if (c >>> 24 > 40) n++; return n; }
const inside = (r: Rect5, w: number, h: number) => r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= w && r.y + r.h <= h;
const overlap = (a: Rect5, b: Rect5) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('ART5 · objetos da sede e da casa', () => {
  it('épocas: 6 faixas nos limites certos', () => {
    expect([1889, 1919, 1920, 1949, 1950, 1969, 1970, 1989, 1990, 2009, 2010, 2040].map(ep5Of)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  it('catálogo cobre os 31 objetos pedidos, sem repetição', () => {
    expect(OBJ5_IDS.length).toBe(31);
    expect(new Set(OBJ5_IDS).size).toBe(31);
  });
  for (const o of OBJ5) {
    it(`${o.id}: todas as épocas e estados desenham, no tamanho fixo, com desenho de verdade`, () => {
      const sz = obj5Size(o.id);
      expect(sz).toEqual({ w: o.w + 2 * PAD5, h: o.h + 2 * PAD5 });
      const byEp: string[] = [];
      for (const e of EP5) {
        const idle = obj5Px(o.id, EP5_YEAR[e], 'idle');
        for (const st of ST5) {
          const p = obj5Px(o.id, EP5_YEAR[e], st);
          expect([p.w, p.h]).toEqual([sz.w, sz.h]);
          expect(colors(p)).toBeGreaterThanOrEqual(5); // nunca um retângulo de uma cor
          expect(filled(p)).toBeLessThan(p.w * p.h); // tem silhueta (margem transparente)
          expect(filled(p)).toBeGreaterThan(o.w * o.h * 0.15); // e não é um rabisco perdido
        }
        // os estados se distinguem do parado
        expect(obj5Px(o.id, EP5_YEAR[e], 'new').d).not.toEqual(idle.d);
        expect(obj5Px(o.id, EP5_YEAR[e], 'lit').d).not.toEqual(idle.d);
        byEp.push(Array.from(idle.d).join(','));
      }
      expect(new Set(byEp).size).toBe(EP5.length); // cada época tem desenho próprio
    });
  }
  it('determinístico: mesmo pedido, mesmos pixels', () => {
    const a = Array.from(obj5Px('radiotv', 1962, 'lit').d);
    expect(Array.from(obj5Px('radiotv', 1962, 'lit').d)).toEqual(a);
  });
});

describe('ART5 · ícones de viagem', () => {
  for (const id of TRAVEL5) it(`${id}: 16×16, três estados distintos`, () => {
    const ps = ST5.map((st) => travel5Px(id, st));
    for (const p of ps) { expect([p.w, p.h]).toEqual([16, 16]); expect(colors(p)).toBeGreaterThanOrEqual(5); }
    expect(new Set(ps.map((p) => Array.from(p.d).join(','))).size).toBe(3);
  });
});

describe('ART5 · papéis e caixa de entrada', () => {
  for (const k of PAPER5) it(`${k}: moldura no tamanho pedido, áreas dentro e sem sobrepor`, () => {
    for (const [w, h] of [[160, 100], [300, 170], [640, 360]] as const) {
      const p = paper5Px(k, w, h);
      expect([p.w, p.h]).toEqual([w, h]);
      expect(colors(p)).toBeGreaterThanOrEqual(6);
      const L = paper5Layout(k, w, h);
      for (const r of [L.head, L.tabs, ...L.body]) expect(inside(r, w, h)).toBe(true);
      expect(overlap(L.head, L.tabs)).toBe(false);
      for (const b of L.body) { expect(overlap(L.tabs, b)).toBe(false); expect(b.w).toBeGreaterThan(40); expect(b.h).toBeGreaterThan(30); }
      if (L.body.length === 2) expect(overlap(L.body[0], L.body[1])).toBe(false);
    }
    const t = [tab5Px(k, 34, true), tab5Px(k, 34, false)];
    expect(t[0].d).not.toEqual(t[1].d);
  });
  it('aparência por época', () => {
    expect([1900, 1935, 1965, 1980, 1995, 2005, 2025].map(inbox5Look)).toEqual(['desk', 'telegram', 'telegram', 'fax', 'crt', 'flat', 'phone']);
  });
  for (const k of INBOX5) it(`caixa ${k}: mesma estrutura, áreas dentro da tela, itens por categoria`, () => {
    const p = inbox5Px(k, 330, 200);
    expect([p.w, p.h]).toEqual([330, 200]);
    expect(colors(p)).toBeGreaterThanOrEqual(6);
    const L = inbox5Layout(k, 330, 200);
    const parts = [L.head, L.tabs, L.filters, L.list, L.read, L.notes, L.keys];
    for (const r of parts) expect(inside(r, L.screen.x + L.screen.w, L.screen.y + L.screen.h)).toBe(true);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) expect(overlap(parts[i], parts[j])).toBe(false);
    for (const c of Object.keys(CAT5) as Cat5[]) {
      const it0 = inboxItem5Px(k, 120, 22, c), sel = inboxItem5Px(k, 120, 22, c, { sel: true, urgent: true });
      expect([it0.w, it0.h]).toEqual([122, 24]);
      expect(colors(it0)).toBeGreaterThanOrEqual(4);
      expect(sel.d).not.toEqual(it0.d);
    }
  });
  it('peças: polaroid, ficha e post-it', () => {
    for (const p of [polaroid5Px(44, 52), card5Px(86, 46), postit5Px(30, 24)]) expect(colors(p)).toBeGreaterThanOrEqual(4);
  });
});
