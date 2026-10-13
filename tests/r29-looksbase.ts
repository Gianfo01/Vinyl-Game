// r29 (arte): amostra fixa de visuais "antigos" (salvos antes da rodada 29) e o hash dos pixels do retrato e do
// sprite. Usado por tests/r29-art.test.ts para provar que looks já salvos desenham IGUAL depois das peças novas.
import { Rng } from '../src/core/rng';
import { REAL_LOOK_NAMES, realLook15 } from '../src/data/looks15';
import type { Appearance } from '../src/sim/types';
import { avatarSprite, portraitPx, randomLook } from '../src/ui/pixel/avatar';
import { flavor27 } from '../src/ui/pixel/looks27';
import { pxHash28 } from '../src/ui/pixel/art28kit';

/** Canvas falso (node): guarda os pixels de putImageData para hashear o sprite. */
export function fakeCanvas(): void {
  const g = globalThis as unknown as { document?: unknown };
  if (g.document) return;
  g.document = {
    createElement: () => {
      const c: Record<string, unknown> = { width: 0, height: 0, data: null };
      c.getContext = () => ({
        createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        putImageData: (img: { data: Uint8ClampedArray }) => { c.data = img.data; },
        drawImage: () => {}, imageSmoothingEnabled: false,
      });
      c.toDataURL = () => 'data:';
      return c;
    },
  };
}

const hashBytes = (d: Uint8ClampedArray): number => { let h = 2166136261 >>> 0; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };

/** Amostra: 120 visuais procedurais, 60 com moda da época (flavor27) e até 80 visuais reais. */
export function sampleLooks(): [string, Appearance][] {
  const out: [string, Appearance][] = [];
  for (let i = 0; i < 120; i++) out.push([`r${i}`, randomLook(`base29:${i}`)]);
  const r = Rng.fromSeed('base29f');
  for (let i = 0; i < 60; i++) out.push([`f${i}`, flavor27(randomLook(`base29f:${i}`), `bf${i}`, { year: 1930 + r.int(0, 105), genre: r.pick(['rock', 'samba', 'hiphop', 'jazz', 'reggae', 'enka', 'afrobeat', 'punk', 'disco', 'country']) })]);
  for (const n of REAL_LOOK_NAMES().slice(0, 80)) { const a = realLook15(n, 1975); if (a) out.push([`L:${n}`, a]); }
  return out;
}

export function looksHashes(): Record<string, number> {
  fakeCanvas();
  const res: Record<string, number> = {};
  for (const [k, a] of sampleLooks()) {
    for (const y of [1935, 1968, 1992, 2031]) res[`${k}|p${y}`] = pxHash28(portraitPx({ id: k, look: a }, y));
    for (const [pose, dir, role] of [['stand', 'SE', null], ['walk', 'SW', null], ['play', 'SE', 'guitar'], ['sitplay', 'NE', 'drums']] as const) {
      const sp = avatarSprite(a, { year: 1975, pose, dir, role: role as never, frame: 1 });
      res[`${k}|${pose}${dir}`] = hashBytes((sp.c as unknown as { data: Uint8ClampedArray }).data);
    }
  }
  return res;
}
