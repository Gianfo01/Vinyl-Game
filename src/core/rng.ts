// Gerador determinístico (sfc32). Todo o estado cabe em 4 inteiros e vive no save,
// então mesma seed + mesmas decisões = mesma história (GDD §5.1, L0).

export type RngState = [number, number, number, number];

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function seedState(seed: string): RngState {
  const a = hashString(seed + '#a');
  const b = hashString(seed + '#b');
  const c = hashString(seed + '#c');
  const d = hashString(seed + '#d');
  const s: RngState = [a, b, c, d];
  const r = new Rng(s);
  for (let i = 0; i < 15; i++) r.next();
  return [...r.state] as RngState;
}

export class Rng {
  constructor(public state: RngState) {}

  static fromSeed(seed: string): Rng {
    return new Rng(seedState(seed));
  }

  next(): number {
    let [a, b, c, d] = this.state;
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    const t = (a + b + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    // muta no lugar: o estado pode ser o mesmo array guardado no save
    this.state[0] = a; this.state[1] = b; this.state[2] = c; this.state[3] = d;
    return (t >>> 0) / 4294967296;
  }

  float(min = 0, max = 1): number {
    return min + (max - min) * this.next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.float(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  weighted<T>(items: readonly T[], weight: (t: T) => number): T | undefined {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1];
  }

  /** Aproximação normal (soma de uniformes), suficiente para jogo. */
  normal(mean = 0, sd = 1): number {
    let s = 0;
    for (let i = 0; i < 6; i++) s += this.next();
    return mean + (s - 3) * sd * Math.SQRT2;
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Sub-gerador derivado, sem consumir o fluxo principal mais de uma vez. */
  fork(label: string): Rng {
    const base = this.int(0, 2 ** 31);
    return Rng.fromSeed(`${base}:${label}`);
  }
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
