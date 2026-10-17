// R33 · INT-2 — prédios novos com interior: registro (id, lote, onde, cidades e épocas), interruptor `exp33.int2` desligado por
// padrão, ações com custo/espera/gancho, e a arte (interior, fachada e lojas da época: tamanho certo, tudo opaco, épocas
// diferentes entre si, nunca um bloco de uma cor só).
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { newRunConfig20 } from '../src/sim/start17';
import { setSw } from '../src/sim/r31/switches';
import { INT2, INT2_HOOKS, SW_INT2, int2Acts, int2Def, int2Do, int2Exists, int2On, int2Types, int2Used } from '../src/sim/r33/int2';
import { FACADE_H, FACADE_W, IH, IW, SHOP2_IDS, int2Facade, int2Interior, int2Shop, int2Spots } from '../src/ui/r33/int2px';
import { BIZ31 } from '../src/sim/r31/city31';
import type { Px } from '../src/ui/pixel/px';

const game = () => createGame(newRunConfig20({ seed: 'int2-teste', companyName: 'Selo Teste' }));
const colors = (p: Px): number => new Set(p.d).size;
const opaque = (p: Px): boolean => p.d.every((c) => c >>> 24 === 255);
const same = (a: Px, b: Px): boolean => a.d.every((c, i) => c === b.d[i]);

describe('INT-2 · registro e interruptor', () => {
  it('14 tipos, ids únicos, lote e onde preenchidos; samba só no Rio, porto só com água, jazz e boate por época', () => {
    expect(INT2.length).toBe(14);
    expect(new Set(INT2.map((t) => t.id)).size).toBe(14);
    for (const t of INT2) { expect(t.lot.w).toBeGreaterThan(0); expect(t.lot.d).toBeGreaterThan(0); expect(t.where).toBeTruthy(); expect(t.tag).toMatch(/^[A-Z ]+$/); }
    expect(int2Exists(int2Def('samba')!, 'rio', 1962)).toBe(true);
    expect(int2Exists(int2Def('samba')!, 'london', 1962)).toBe(false);
    expect(int2Exists(int2Def('samba')!, 'rio', 1920)).toBe(false);
    expect(int2Exists(int2Def('port')!, 'london', 1889)).toBe(true);
    expect(int2Exists(int2Def('port')!, 'nashville', 1889)).toBe(false);
    expect(int2Exists(int2Def('jazz')!, 'london', 1962)).toBe(true);
    expect(int2Exists(int2Def('jazz')!, 'london', 2025)).toBe(false);
    expect(int2Exists(int2Def('nightclub')!, 'london', 1962)).toBe(false);
    expect(int2Exists(int2Def('nightclub')!, 'london', 2025)).toBe(true);
    expect(int2Exists(int2Def('stadium')!, 'london', 1889)).toBe(false);
  });
  it('desligado por padrão: nenhum tipo, nenhuma ação; ligado: os da época aparecem e a ação roda', () => {
    const s = game();
    expect(int2On(s)).toBe(false);
    expect(int2Types(s)).toEqual([]);
    expect(int2Acts(s, 'bank')).toEqual([]);
    expect(int2Do(s, 'court.registro').ok).toBe(false);
    setSw(s, SW_INT2, true);
    const ids = int2Types(s).map((t) => t.id);
    expect(ids).toContain('bank'); expect(ids).toContain('jazz'); expect(ids).not.toContain('nightclub'); expect(ids).not.toContain('samba');
  });
});

describe('INT-2 · ações', () => {
  it('custo, efeito, espera e gancho da frente dona', () => {
    const s = game(); setSw(s, SW_INT2, true);
    const cash = s.player.cash, rep = s.player.reputation.institutional;
    const a = int2Acts(s, 'court').find((x) => x.id === 'court.registro')!;
    expect(a.cost).toBeGreaterThan(0); expect(a.dis).toBeUndefined();
    const r = int2Do(s, 'court.registro');
    expect(r.ok).toBe(true);
    expect(s.player.cash).toBe(cash - a.cost!);
    expect(s.player.reputation.institutional).toBeGreaterThan(rep);
    expect(int2Used(s, 'court.registro')).toBe(1);
    expect(int2Do(s, 'court.registro').ok).toBe(false); // espera de 12 semanas
    expect(int2Acts(s, 'court').find((x) => x.id === 'court.registro')!.dis).toBeTruthy();
    // gancho: vence o efeito simples
    INT2_HOOKS['court.plagio'] = () => ({ ok: true, text: { pt: 'gancho', en: 'hook' } });
    const r2 = int2Do(s, 'court.plagio');
    delete INT2_HOOKS['court.plagio'];
    expect(r2.text.pt).toBe('gancho');
  });
  it('banco: empréstimo e catálogo como garantia criam dívida; hospital sem ninguém doente bloqueia a reabilitação', () => {
    const s = game(); setSw(s, SW_INT2, true);
    const n = s.player.loans.length;
    expect(int2Do(s, 'bank.loan').ok).toBe(true);
    expect(s.player.loans.length).toBe(n + 1);
    expect(int2Do(s, 'bank.collateral').ok).toBe(true);
    expect(s.player.loans.length).toBe(n + 2);
    expect(int2Acts(s, 'hospital').find((x) => x.id === 'hospital.rehab')).toBeUndefined(); // reabilitação só depois de 1970
    s.year = 1975;
    expect(int2Acts(s, 'hospital').find((x) => x.id === 'hospital.rehab')!.dis).toBeTruthy();
  });
});

describe('INT-2 · arte', () => {
  const YEARS = [1889, 1962, 2025, 2035];
  for (const t of INT2) {
    it(`${t.id}: interior ${IW}×${IH} opaco, épocas diferentes, fachada ${FACADE_W}×${FACADE_H}, pessoas dentro da cena`, () => {
      const ys = YEARS.filter((y) => int2Exists(t, t.cities?.[0] ?? 'new_york', y));
      expect(ys.length).toBeGreaterThan(0);
      const ins = ys.map((y) => int2Interior(t.id, y)), fac = ys.map((y) => int2Facade(t.id, y));
      for (const p of ins) { expect([p.w, p.h]).toEqual([IW, IH]); expect(opaque(p)).toBe(true); expect(colors(p)).toBeGreaterThan(40); }
      for (const p of fac) { expect([p.w, p.h]).toEqual([FACADE_W, FACADE_H]); expect(opaque(p)).toBe(true); expect(colors(p)).toBeGreaterThan(25); }
      for (let i = 1; i < ys.length; i++) { expect(same(ins[i], ins[0])).toBe(false); expect(same(fac[i], fac[0])).toBe(false); }
      expect(same(int2Interior(t.id, ys[0]), ins[0])).toBe(true); // determinístico
      for (const sp of int2Spots(t.id)) { expect(sp.x).toBeGreaterThan(0); expect(sp.x).toBeLessThan(1); expect(sp.y).toBeLessThan(IH); }
    });
  }
  it('lojas da época: todas as de BIZ31 têm interior (360×150 opaco); lojas diferentes se distinguem', () => {
    for (const b of BIZ31) expect(SHOP2_IDS).toContain(b.id);
    const ps = SHOP2_IDS.map((id) => int2Shop(id, 1962));
    for (const p of ps) { expect([p.w, p.h]).toEqual([IW, IH]); expect(opaque(p)).toBe(true); expect(colors(p)).toBeGreaterThan(40); }
    expect(new Set(ps.map((p) => Array.from(p.d).join(','))).size).toBe(ps.length);
  });
});
