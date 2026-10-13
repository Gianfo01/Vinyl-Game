// Rodada 27 — mais variedade nos bonecos do jogo (cabelos, barbas, chapéus, óculos, roupas, colares, brincos,
// tatuagens e instrumentos), com trava de época, gerador por gênero/região e famosos revistos.

import { describe, expect, it } from 'vitest';
import { Px } from '../src/ui/pixel/px';
import { avatarSprite, HAIR_STYLES, lookKey, portraitPx, randomLook } from '../src/ui/pixel/avatar';
import { BEARD27, EAR27, flavor27, gate27, GLASSES27, HAIR27, HAIR_BASE, HAT27, INST27, instFor, NECK27, OUTFIT27, OUTFIT_BASE, TAT27 } from '../src/ui/pixel/looks27';
import { realLook15, REAL_LOOK_NAMES } from '../src/data/looks15';
import { LOOKS27 } from '../src/data/looks27';
import type { Appearance } from '../src/sim/types';

// no node não há canvas: o sprite devolve o próprio buffer
(Px.prototype as unknown as { canvas: () => unknown }).canvas = function (this: Px) { return this; };
const fnv = (d: Uint32Array): string => { let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
const P = (look: Appearance, y: number, id = 'x') => portraitPx({ id, look }, y);
const S = (look: Appearance, y: number, role: string | null, pose: 'play' | 'walk' | 'stand' = 'play', dir: 'SE' | 'NW' = 'SE', frame = 1) =>
  avatarSprite(look, { year: y, role: role as never, pose, dir, frame, variant: 0 }).c as unknown as Px;
const base = (o: Partial<Appearance> = {}): Appearance => ({ body: 1, face: 0, skin: 1, hair: 1, hairColor: 1, outfit: 0, outfitColor: 0, glasses: false, hat: false, beard: false, sx: 'm', ...o });

/** Mesmos visuais usados para gravar os hashes antes da rodada 27. */
function ext(i: number): Appearance {
  const a = randomLook(`ext27-${i}`);
  a.hair = i % 23; a.hat = i % 3 === 0; if (a.hat) a.hatT = i % 9 || undefined; a.glasses = i % 4 === 0; if (a.glasses) a.glT = i % 4 || undefined;
  a.beard = i % 5 === 0; if (a.beard) a.bdT = i % 4 || undefined; if (i % 7 === 0) a.paint = i % 8 || undefined; if (i % 11 === 0) a.roots = 3;
  a.outfit = i % 4; a.outfitColor = i % 13; a.hairColor = i % 13; a.sx = i % 2 ? 'm' : 'f';
  return a;
}
const rnd = (i: number) => randomLook(`base27-${i}`);

describe('r27 visuais', () => {
  it('visuais antigos desenham pixel a pixel igual a antes (hashes gravados antes da rodada)', () => {
    const before: [string, () => Px, string][] = [
      ['rnd0 1925', () => P(rnd(0), 1925, 'rnd0'), '391ba0c1'], ['rnd1 1965', () => P(rnd(1), 1965, 'rnd1'), '8e33a663'],
      ['rnd2 1985', () => P(rnd(2), 1985, 'rnd2'), 'cefc9f9f'], ['rnd3 2005', () => P(rnd(3), 2005, 'rnd3'), 'dbb704e7'],
      ['rnd4 2025', () => P(rnd(4), 2025, 'rnd4'), '7a3dedf5'], ['ext0 1965', () => P(ext(0), 1965, 'ext0'), 'ec501c31'],
      ['ext7 1995', () => P(ext(7), 1995, 'ext7'), '8be6ab4d'], ['ext21 1985', () => P(ext(21), 1985, 'ext21'), 'c0064ade'],
      ['ext33 2015', () => P(ext(33), 2015, 'ext33'), 'd84fe137'], ['ext77 1955', () => P(ext(77), 1955, 'ext77'), 'd86d8a81'],
      ['rnd5 guitarra', () => S(rnd(5), 1965, 'guitar'), '304efdb5'], ['rnd6 sopros', () => S(rnd(6), 1985, 'horns'), 'e2f68aba'],
      ['ext14 voz', () => S(ext(14), 1995, 'vocal'), '36185442'], ['ext50 teclado', () => S(ext(50), 2005, 'keys'), 'dcca4c2d'],
      ['rnd9 andando', () => S(rnd(9), 1965, null, 'walk', 'NW', 2), '73e356c5'], ['ext66 andando', () => S(ext(66), 2035, null, 'walk', 'NW', 2), '6f55bf0c'],
    ];
    for (const [n, f, h] of before) expect(fnv(f().d), n).toBe(h);
    // a chave de cache dos visuais antigos não ganhou segmento novo
    expect(lookKey(rnd(1))).not.toContain('|n');
  });

  it('todas as peças novas desenham em todas as épocas sem erro (retrato, boneco de frente e de costas)', () => {
    expect(HAIR_STYLES).toBe(HAIR_BASE + HAIR27.length);
    const looks: Appearance[] = [];
    HAIR27.forEach((_, i) => looks.push(base({ hair: HAIR_BASE + i, skin: i % 4 })));
    BEARD27.forEach((_, i) => looks.push(base({ beard: true, bdT: 4 + i })));
    GLASSES27.forEach((_, i) => looks.push(base({ glasses: true, glT: 4 + i })));
    HAT27.forEach((_, i) => looks.push(base({ hat: true, hatT: 9 + i, hatC: i % 2 ? 3 : undefined })));
    OUTFIT27.forEach((o, i) => looks.push(base({ outfit: OUTFIT_BASE + i, outfitColor: i % 13, sx: o[3] === 'f' ? 'f' : 'm', body: i % 3 })));
    NECK27.forEach((_, i) => i && looks.push(base({ nk: i, outfit: 6 })));
    EAR27.forEach((_, i) => i && looks.push(base({ ear: i, sx: 'f' })));
    TAT27.forEach((_, i) => i && looks.push(base({ tat: i, outfit: 7 })));
    let n = 0;
    for (const a of looks) for (const y of [1925, 1955, 1965, 1985, 1995, 2005, 2015, 2025, 2035]) {
      const p = P(a, y);
      expect(p.d.some((c) => c !== 0)).toBe(true);
      S(a, y, null, 'walk', 'NW', 2); S(a, y, null, 'stand');
      n++;
    }
    expect(n).toBe(78 * 9);
    // instrumentos: cada um com um papel que o aceita, tocando, sentado e de costas
    INST27.forEach(([, , roles], i) => {
      if (!i) return;
      for (const role of roles) for (const y of [1990, 2030]) {
        const a = base({ inst: i });
        expect(instFor(a, role, y)).toBe(i);
        const withI = S(a, y, role);
        const without = S(base(), y, role);
        if (i !== 16 || role !== 'guitar') expect(fnv(withI.d), `${i}/${role}`).not.toBe(fnv(without.d));
        avatarSprite(a, { year: y, role: role as never, pose: 'sitplay', frame: 0 });
        avatarSprite(a, { year: y, role: role as never, pose: 'play', dir: 'NE', frame: 0 });
      }
    });
    // instrumento fora do papel não muda nada
    expect(fnv(S(base({ inst: 18 }), 1990, 'guitar').d)).toBe(fnv(S(base(), 1990, 'guitar').d));
  });

  it('trava de época: peça que ainda não existe cai para a antiga equivalente', () => {
    const hoodie = base({ outfit: 13 }); // moletom (1975)
    expect(gate27(hoodie, 1930).outfit).toBe(3);
    expect(fnv(P(hoodie, 1930).d)).toBe(fnv(P(base({ outfit: 3 }), 1930).d));
    expect(fnv(P(hoodie, 1990).d)).not.toBe(fnv(P(base({ outfit: 3 }), 1990).d));
    expect(gate27(base({ hair: 26 }), 1960).hair).toBe(3); // high-top fade só depois de 1984
    expect(gate27(base({ hat: true, hatT: 21 }), 1950)).toMatchObject({ hat: false }); // durag
    expect(gate27(base({ glasses: true, glT: 8 }), 1970).glT).toBe(2); // envolvente → escuros
    expect(gate27(base({ nk: 2 }), 1970).nk).toBe(1); // correntão → corrente
    expect(gate27(base({ tat: 3 }), 1990).tat).toBe(2); // rosto → pescoço
    expect(gate27(base({ inst: 15 }), 1970).inst).toBeUndefined(); // keytar
    expect(instFor(base({ inst: 5 }), 'guitar', 1950)).toBe(0); // Flying V é de 1958
    const old = rnd(3);
    expect(gate27(old, 1925)).toBe(old); // visual sem peça nova: o mesmo objeto
    // o gerador nunca põe peça fora da época
    for (let i = 0; i < 400; i++) {
      const y = 1925 + (i % 12) * 9;
      const fams = ['rock', 'hiphop', 'brazil', 'africa', 'country_folk', 'asia_me', 'latin', 'rnb', 'pop', 'electronic'];
      const a = flavor27(randomLook(`g${i}`), `g${i}`, { year: y, family: fams[i % fams.length], sex: i % 2 ? 'm' : 'f', role: ['guitar', 'vocal', 'keys', 'bass', 'horns', 'strings'][i % 6] });
      expect(gate27(a, y)).toBe(a);
      if (a.hair >= HAIR_BASE) expect(HAIR27[a.hair - HAIR_BASE][1]).toBeLessThanOrEqual(y);
      if (a.outfit >= OUTFIT_BASE) expect(OUTFIT27[a.outfit - OUTFIT_BASE][1]).toBeLessThanOrEqual(y);
      if (i % 2 === 0) expect(a.bdT ?? 0).toBeLessThan(4); // mulher: nenhuma barba nova
      else { expect([14, 18, 19]).not.toContain(a.outfit); expect([27, 28, 32, 36]).not.toContain(a.hair); } // homem: só peças unissex/masculinas
    }
  });

  it('gerador: determinístico e com sotaque de época/gênero/região', () => {
    const b = randomLook('det');
    const c = { year: 1987, family: 'hiphop', sex: 'm' as const, role: 'mc' };
    expect(flavor27(b, 'det', c)).toEqual(flavor27(b, 'det', c));
    const count = (pred: (a: Appearance) => boolean, ctx: Parameters<typeof flavor27>[2]) => {
      let k = 0;
      for (let i = 0; i < 300; i++) if (pred(flavor27(randomLook(`f${i}`), `f${i}`, ctx))) k++;
      return k;
    };
    // hip-hop 1990 tem mais correntes que country; country tem mais chapéu de caubói
    expect(count((a) => (a.nk ?? 0) === 1 || a.nk === 2, { year: 1990, family: 'hiphop', sex: 'm' })).toBeGreaterThan(count((a) => (a.nk ?? 0) === 1 || a.nk === 2, { year: 1990, family: 'country_folk', sex: 'm' }) * 2);
    expect(count((a) => a.hatT === 2, { year: 1975, family: 'country_folk', sex: 'm' })).toBeGreaterThan(count((a) => a.hatT === 2, { year: 1975, family: 'rock', sex: 'm' }) * 2);
    // anos 50 usam topete; anos 2010 não usam colmeia
    expect(count((a) => a.hair === 4, { year: 1956, family: 'rock', sex: 'm' })).toBeGreaterThan(count((a) => a.hair === 4, { year: 2015, family: 'rock', sex: 'm' }));
    // sanfona no forró, cavaquinho no samba, sári na Índia
    expect(count((a) => a.inst === 14, { year: 1975, family: 'brazil', genre: 'forro', sex: 'm', role: 'keys' })).toBeGreaterThan(100);
    expect(count((a) => a.inst === 9, { year: 1975, family: 'brazil', genre: 'samba', sex: 'm', role: 'guitar' })).toBeGreaterThan(100);
    expect(count((a) => a.outfit === 19, { year: 1975, family: 'asia_me', country: 'IND', sex: 'f' })).toBeGreaterThan(10);
  });

  it('famosos ganham a marca registrada (e por fase)', () => {
    const L = (n: string, y: number) => realLook15(n, y)!;
    expect(L('Jimi Hendrix', 1969)).toMatchObject({ hair: 6, hatT: 5, outfit: 17, inst: 3 }); // black + faixa + franjas + Strato
    expect(L('John Lennon', 1964).hair).toBe(5); // cuia
    expect(L('John Lennon', 1971)).toMatchObject({ hair: 34, glT: 1 }); // longo repartido, óculos redondos
    expect(L('Bob Marley', 1978).hair).toBe(15); // dreads
    expect(L('Elton John', 1974)).toMatchObject({ glasses: true, glT: 3, outfit: 16 });
    expect(L('Freddie Mercury', 1974).hair).toBe(7);
    expect(L('Freddie Mercury', 1985)).toMatchObject({ hair: 1, beard: true, bdT: 1 }); // cabelo curto e bigode
    expect(L('Amy Winehouse', 2007)).toMatchObject({ hair: 17, paint: 6 }); // colmeia e delineado
    expect(L('Slash', 1988)).toMatchObject({ hat: true, hatT: 1, hair: 20, inst: 2 }); // cartola, cachos, Les Paul
    expect(L('Elvis Presley', 1972)).toMatchObject({ outfit: 16, bdT: 4 }); // macacão e costeletas
    expect(L('Luiz Gonzaga', 1955)).toMatchObject({ hatT: 19, inst: 14 }); // chapéu de cangaceiro e sanfona
    expect(L('Lemmy', 1981)).toMatchObject({ bdT: 4, outfit: 4 });
    expect(L('Willie Nelson', 1978).hair).toBe(23); // tranças
    expect(L('Snoop Dogg', 1993).hair).toBe(23);
    expect(L('Ice Cube', 1988).hair).toBe(25); // jheri curl
    expect(L('Ravi Shankar', 1967).inst).toBe(10); // cítara
    expect(L('Paul McCartney', 1964).inst).toBe(12); // baixo violino
    expect(L('Angus Young', 1979)).toMatchObject({ inst: 4, outfit: 1 }); // SG
    expect(L('Post Malone', 2018).tat).toBe(3); // tatuagem no rosto
    expect(L('Flavor Flav', 1988).nk).toBe(2);
    // pelo menos 150 famosos revistos, todos com tokens válidos
    expect(Object.keys(LOOKS27).length).toBeGreaterThanOrEqual(150);
    for (const n of REAL_LOOK_NAMES()) for (const y of [1930, 1965, 1980, 1995, 2025]) {
      const a = L(n, y);
      expect(a.hair, n).toBeLessThan(HAIR_STYLES);
      expect(a.outfit, n).toBeLessThan(OUTFIT_BASE + OUTFIT27.length);
      expect(a.hatT ?? 0, n).toBeLessThan(9 + HAT27.length);
      expect(a.glT ?? 0, n).toBeLessThan(4 + GLASSES27.length);
      expect(a.bdT ?? 0, n).toBeLessThan(4 + BEARD27.length);
      expect(a.nk ?? 0, n).toBeLessThan(NECK27.length);
      expect(a.inst ?? 0, n).toBeLessThan(INST27.length);
    }
    // o retrato do famoso realmente muda com a peça nova
    const amy = L('Amy Winehouse', 2007);
    expect(fnv(P(amy, 2007).d)).not.toBe(fnv(P({ ...amy, hair: 7 }, 2007).d));
  });
});
