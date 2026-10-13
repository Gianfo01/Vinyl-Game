// r27 (CHAR): sprites de semelhança das pessoas reais — índice, homônimos, modo de nomes fictícios, atlas e determinismo.

import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { REAL_ALL } from '../src/sim/sys/realworld';
import { BODY_URLS27, BUST_URLS27 } from '../src/assets/people27/sheets';
import {
  BODY_H27, BODY_W27, COUNT27, bustWindow27, realSlot27, realSprite27, sheetCount27, sheetSize27, slotFor27, spriteAt27,
} from '../src/ui/pixel/people27';
import type { GameState } from '../src/sim/types';
import type { RealArtist } from '../src/data/realtypes';

const peopleOf = (): string[] => {
  const out = new Set<string>();
  for (const a of REAL_ALL) {
    if (a.m?.length) for (const m of a.m) out.add(m[0]);
    else out.add(a.n);
  }
  return [...out];
};
/** cobertura pelo nome (com o ato para homônimos; o líder herda o sprite com o nome do ato, como no jogo) */
const coverage = (acts: RealArtist[]) => {
  const seen = new Map<string, boolean>();
  for (const a of acts) {
    const ms = a.m?.length ? a.m.map((m) => m[0]) : [a.n];
    const selfNamed = ms.some((n) => n === a.n);
    ms.forEach((n, i) => {
      const ok = slotFor27(n, () => [a.n], () => (i === 0 && !selfNamed ? [a.n] : [])) !== undefined;
      seen.set(n, (seen.get(n) ?? false) || ok);
    });
  }
  const miss = [...seen].filter(([, ok]) => !ok).map(([n]) => n);
  return { n: seen.size, miss, cov: 1 - miss.length / seen.size };
};
const mk = (seed: string, realNames: boolean, startYear = 1985) => createGame(defaultConfig(seed, { startYear, mode: 'historic', realNames }));
const resolved = (s: GameState) => Object.values(s.persons).map((p) => [p.id, realSlot27(s, p.id) ?? -1] as const);

describe('r27 sprites das pessoas reais', () => {
  it('o índice cobre ≥ 95% das pessoas reais da lista original pelo nome (escopo da arte)', () => {
    // A arte (art/personagens, 3.130) foi feita da lista original de REAL_ALL (atos sem `z`: base pequena/média).
    // Os lotes novos de dados (z = 1–3, integrantes pesquisados depois) ainda não têm sprite: ficam procedurais.
    const base = coverage(REAL_ALL.filter((a) => !a.z));
    expect(base.n).toBeGreaterThan(1400);
    expect(base.cov, `faltam ${base.miss.length}: ${base.miss.slice(0, 20).join(', ')}`).toBeGreaterThanOrEqual(0.95);
    // REAL_ALL inteiro (6 mil pessoas) — lacuna conhecida; o piso só impede regressão
    const all = coverage(REAL_ALL);
    expect(all.n).toBeGreaterThan(6000);
    expect(all.cov).toBeGreaterThanOrEqual(0.44);
    expect(peopleOf().length).toBe(all.n);
  });

  it('homônimos casam pelo ato (e sem ato que confirme, nada)', () => {
    const key = (n: string, acts: string[]) => { const i = slotFor27(n, () => acts); return i === undefined ? undefined : spriteAt27(i).key; };
    expect(key('Roger Taylor', ['Queen'])).toBe('Roger Taylor (Queen)');
    expect(key('Roger Taylor', ['Duran Duran'])).toBe('Roger Taylor (Duran Duran)');
    expect(key('Mick Jones', ['The Clash'])).toBe('Mick Jones (The Clash)');
    expect(key('Mick Jones', ['Foreigner'])).toBe('Mick Jones (Foreigner)');
    expect(key('Andy Bell', ['Erasure'])).toBe('Andy Bell (Erasure)');
    expect(key('Roger Taylor', [])).toBeUndefined();
    expect(key('Roger Taylor', ['Uma Banda Qualquer'])).toBeUndefined();
    // nome comum (sem homônimo) casa direto, mesmo sem ato
    expect(key('John Lennon', [])).toBe('John Lennon');
  });

  it('numa partida real, cada Roger Taylor / Mick Jones ganha o rosto do próprio ato', () => {
    const s = mk('r27-char-h', true);
    const acts = Object.values(s.acts);
    let seen = 0;
    for (const p of Object.values(s.persons)) {
      if (p.name !== 'Roger Taylor' && p.name !== 'Mick Jones') continue;
      const sp = realSprite27(s, p);
      const mine = acts.filter((a) => a.members.includes(p.id)).map((a) => a.name.replace(/^The /, ''));
      if (!sp || !mine.length) continue;
      seen++;
      expect(mine.some((a) => sp.key.includes(a)), `${p.name} de ${mine.join('/')} → ${sp.key}`).toBe(true);
    }
    expect(seen).toBeGreaterThanOrEqual(2);
    // e a maioria das pessoas reais da partida tem sprite
    const real = Object.values(s.persons).filter((p) => p.real27 && !p.isPlayer);
    const withArt = real.filter((p) => realSlot27(s, p.id) !== undefined);
    expect(withArt.length / real.length).toBeGreaterThan(0.8); // base média: lista original + 1º lote novo (sem arte)
    // os famosos da lista original têm sprite
    for (const n of ['Freddie Mercury', 'Brian May', 'Simon Le Bon', 'Joe Strummer']) {
      const p = Object.values(s.persons).find((x) => x.name === n);
      if (p) expect(realSprite27(s, p)?.key, n).toBe(n);
    }
  });

  it('com nomes fictícios nada resolve (as pessoas reais estão disfarçadas)', () => {
    const s = mk('r27-char-f', false);
    expect(resolved(s).filter(([, v]) => v >= 0)).toEqual([]);
    const r = mk('r27-char-f', true);
    expect(resolved(r).some(([, v]) => v >= 0)).toBe(true);
    r.config.realNames = false;
    expect(resolved(r).filter(([, v]) => v >= 0)).toEqual([]);
    expect(realSprite27(null, { id: 'x' })).toBeUndefined();
  });

  it('coordenadas do atlas dentro dos limites e folhas presentes', () => {
    expect(COUNT27).toBeGreaterThan(3000);
    expect(BUST_URLS27.length).toBe(sheetCount27('bust'));
    expect(BODY_URLS27.length).toBe(sheetCount27('body'));
    const dir = fileURLToPath(new URL('../src/assets/people27/', import.meta.url));
    for (let i = 0; i < sheetCount27('bust'); i++) expect(existsSync(`${dir}busto-${String(i).padStart(2, '0')}.webp`)).toBe(true);
    for (let i = 0; i < sheetCount27('body'); i++) expect(existsSync(`${dir}corpo-${String(i).padStart(2, '0')}.webp`)).toBe(true);
    for (let i = 0; i < COUNT27; i++) {
      const sp = spriteAt27(i);
      const [bw, bh] = sheetSize27('bust', sp.bust.sheet)!;
      expect(sp.bust.x >= 0 && sp.bust.y >= 0 && sp.bust.x + sp.bust.w <= bw && sp.bust.y + sp.bust.h <= bh, `busto ${sp.key}`).toBe(true);
      const b = sp.body;
      const [cw, ch] = sheetSize27('body', b.sheet)!;
      expect(b.w > 0 && b.h > 0 && b.x >= 0 && b.y >= 0 && b.x + b.w <= cw && b.y + b.h <= ch, `corpo ${sp.key}`).toBe(true);
      expect(b.dx >= 0 && b.dy >= 0 && b.dx + b.w <= BODY_W27 && b.dy + b.h <= BODY_H27, `quadro ${sp.key}`).toBe(true);
    }
    // janelas do busto: escala inteira, dentro do quadro 64×64
    for (const size of [18, 24, 32, 40, 48, 64, 96, 128, 160, 192]) {
      const w = bustWindow27(size);
      expect(w.x >= 0 && w.y >= 0 && w.x + w.w <= 64 + 1e-9 && w.y + w.w <= 64 + 1e-9, `janela ${size}`).toBe(true);
      if (!w.smooth) expect(Number.isInteger(size / w.w) || size / w.w === 0.5, `escala ${size}`).toBe(true);
    }
  });

  it('a busca é determinística (mesma partida, mesma semente, mesmo nome)', () => {
    const a = mk('r27-char-d', true, 1966);
    const b = mk('r27-char-d', true, 1966);
    const ra = resolved(a);
    expect(resolved(a)).toEqual(ra); // cache
    expect(resolved(b)).toEqual(ra); // outra partida igual
    const names = peopleOf().slice(0, 600);
    const once = names.map((n) => slotFor27(n, () => []));
    expect(names.map((n) => slotFor27(n, () => []))).toEqual(once);
  });
});
