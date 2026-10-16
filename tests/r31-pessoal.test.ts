// Masters 31 · onda 3 (P / UNI-3 · B.17) — dinheiro pessoal por porta única com registro.
//
// Varredura: escrita direta no bolso do dono (`.wealth +=`, `-=`, `=`) fora de src/sim/r31/purse31.ts. ALLOW é a lista
// de permitidos (arquivo → nº de escritas) e SÓ PODE DIMINUIR: arquivo novo ou contagem maior = teste falha. No fim da
// onda 3 ela está vazia (as ~90 escritas antigas passaram por `purse`/`purseSet`).
// Além disso: pagador, dono e beneficiário separados; bem pago pela empresa que fica com você = retirada (pró-labore/
// dividendo), não custo; bens perdem valor e têm manutenção; totais duráveis.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createGame } from '../src/sim/worldgen'; // primeiro: ordem de carga dos sistemas
import { defaultConfig } from '../src/sim/bot';
import { Rng } from '../src/core/rng';
import type { GameState } from '../src/sim/types';
import { advanceMonth } from '../src/sim/tick';
import { ownerOf, withdraw } from '../src/sim/sys/people/owner';
import { buyGood, goods, goodsMonth } from '../src/sim/sys/goods8';
import { PURSE_LAST31, purse, purse31, purseSet, purseSummary } from '../src/sim/r31/purse31';
import { setSw } from '../src/sim/r31/switches';
import { txn31 } from '../src/sim/r31/txn';
import { resultsReport31 } from '../src/sim/r31/results31';

const ROOT = join(__dirname, '..');
const OWNER = 'src/sim/r31/purse31.ts';
/** Estado no fim da onda 3 (só diminui). */
const ALLOW: Record<string, number> = {};
/** `x.wealth = …`, `+=`, `-=`, `*=`, `++`, `--` (não pega `wealth[` do dinheiro dos músicos NPC nem `const wealth =`). */
const WRITE = /\.wealth\s*(?:\+|-|\*|\/)?=(?!=)|\.wealth\s*(?:\+\+|--)|(?:\+\+|--)\s*[\w.()]+\.wealth\b|\[\s*['"]wealth['"]\s*\]\s*(?:\+|-)?=(?!=)/g;

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const game = (seed = 'r31pp', y = 1990): GameState => createGame(defaultConfig(`${seed}-${y}`, { startYear: y, scenario: 'established' }));

describe('varredura: dinheiro pessoal só pela função única', () => {
  it('nenhuma escrita direta em .wealth fora de purse31 (permitidos só diminuem)', () => {
    const found: Record<string, number> = {};
    for (const f of walk(join(ROOT, 'src'))) {
      const rel = relative(ROOT, f).replace(/\\/g, '/');
      if (rel === OWNER) continue;
      const src = readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
      const n = (src.match(WRITE) ?? []).length;
      if (n) found[rel] = n;
    }
    for (const [f, n] of Object.entries(found)) expect({ f, n, allowed: ALLOW[f] ?? 0 }).toEqual({ f, n: Math.min(n, ALLOW[f] ?? 0), allowed: ALLOW[f] ?? 0 });
    // a lista não guarda folga: contagem menor que a permitida → baixe o número aqui
    for (const [f, n] of Object.entries(ALLOW)) expect({ f, n: found[f] ?? 0 }).toEqual({ f, n });
  });
});

describe('extrato pessoal', () => {
  it('mesma conta de antes (sem arredondar), pagador/dono/beneficiário separados e totais duráveis', () => {
    const g = game('r31pp1');
    const o = ownerOf(g);
    const w0 = o.wealth;
    expect(purse(g, -12.5, 'leisure', 't')).toBe(-12.5);
    expect(o.wealth).toBe(w0 - 12.5);
    expect(purse(g, -1e12, 'leisure', 't', { floor: 0 })).toBe(-(w0 - 12.5));
    expect(o.wealth).toBe(0);
    purseSet(g, 5000, 'edit', 't');
    const last = purse31(g).last[purse31(g).last.length - 1];
    expect(last).toMatchObject({ amt: 5000, cat: 'edit', owner: 'me' });
    for (let i = 0; i < PURSE_LAST31 + 40; i++) purse(g, 1, 'income', 'loop');
    expect(purse31(g).last.length).toBe(PURSE_LAST31);
    expect(purse31(g).tot.income!.i).toBeGreaterThanOrEqual(PURSE_LAST31 + 40);
    expect(purseSummary(g, g.year).find((x) => x.cat === 'income')!.amt).toBeGreaterThanOrEqual(PURSE_LAST31 + 40);
  });

  it('retirada: a empresa paga (owner_draw, financiamento) e o extrato mostra a empresa como pagadora', () => {
    const g = game('r31pp2');
    g.player.cash += 10_000_000;
    const res0 = txn31(g).cls.res.total;
    expect(withdraw(g, 50000)).toBeNull();
    const t = purse31(g).last[purse31(g).last.length - 1];
    expect(t).toMatchObject({ amt: 50000, cat: 'draw', payer: 'label', owner: 'me', ben: 'me' });
    expect(txn31(g).cls.res.total).toBe(res0); // retirada não é custo
  });

  it('bem pago pela empresa que fica com você conta como retirada (e aparece como tal); desligado = custo antigo', () => {
    const g = game('r31pp3');
    g.player.cash += 10_000_000;
    const o = ownerOf(g);
    const w0 = o.wealth;
    const res0 = txn31(g).cls.res.total;
    const fin0 = txn31(g).cls.fin.total;
    const cash0 = g.player.cash;
    expect(buyGood(g, 'car_family', 'label')).toBeNull();
    const it0 = goods(g).owned.find((x) => x.id === 'car_family')!;
    expect(it0.by).toBe('label');
    const price = it0.paid;
    expect(g.player.cash).toBe(cash0 - price);
    expect(o.wealth).toBe(w0); // o bolso não muda: entra a retirada, sai a compra
    expect(txn31(g).cls.res.total).toBe(res0);
    expect(txn31(g).cls.fin.total).toBe(fin0 - price);
    const L = purse31(g).last.slice(-2);
    expect(L.map((x) => [x.cat, x.amt, x.payer, x.owner, x.ben])).toEqual([['draw', price, 'label', 'me', 'me'], ['goods', -price, 'label', 'me', 'me']]);
    expect(purse31(g).drawn).toBe(price);
    // o resultado por artista/projeto não enxerga a compra pessoal (caixa, resultado e bem separados)
    expect(resultsReport31(g, 'artist').totals.total).toBe(txn31(g).cls.res.total);

    const h = game('r31pp4');
    h.player.cash += 10_000_000;
    setSw(h, 'purse31.draws', false);
    const r1 = txn31(h).cls.res.total;
    expect(buyGood(h, 'car_family', 'label')).toBeNull();
    expect(txn31(h).cls.res.total).toBeLessThan(r1); // sem a regra, vira custo da empresa (o atalho que a regra fecha)
  });

  it('bens perdem valor e têm manutenção, registrada no extrato', () => {
    const g = game('r31pp5');
    const o = ownerOf(g);
    o.wealth += 1_000_000;
    expect(buyGood(g, 'car_family')).toBeNull();
    const it0 = goods(g).owned.find((x) => x.id === 'car_family')!;
    const v0 = it0.value;
    const up0 = purse31(g).tot.upkeep?.o ?? 0;
    const r = Rng.fromSeed('r31pp5');
    for (let i = 0; i < 12; i++) goodsMonth(g, r);
    expect(it0.value).toBeLessThan(v0);
    expect((purse31(g).tot.upkeep?.o ?? 0) - up0).toBeLessThan(0);
  });

  it('o mês do dono (pró-labore e custo de vida) passa pelo extrato', () => {
    const g = game('r31pp6');
    const n0 = purse31(g).n;
    advanceMonth(g);
    expect(purse31(g).n).toBeGreaterThan(n0);
    expect(purse31(g).tot.living?.o ?? 0).toBeLessThan(0);
  });
});
