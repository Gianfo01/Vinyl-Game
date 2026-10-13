// Equipamentos e objetos no estilo do pacote oficial (art/pack-equipamentos-v1), reduzidos para pixel art por
// tools/gear-pack.py num atlas único (src/assets/gear21.png, ~14 KB). Aqui: carga do atlas, recorte de cada
// sprite (com espelho para a orientação SE) e o mapa (tipo de móvel, era, variante, ano) → asset.
// Objetos sem asset no pacote continuam procedurais em sprites.ts, com o acabamento da casa (gearFinish).

import { eraIndex, type EraId } from './palette';
import { Px } from './px';
import { GEAR_ATLAS, type GearId } from './gear21-atlas';

const ATLAS_URL = new URL('../../assets/gear21.png', import.meta.url).href;

let atlas: HTMLImageElement | null = null;
let loading: Promise<void> | null = null;
let year = 0;
const listeners: (() => void)[] = [];

/** Carrega o atlas uma vez (no navegador). Resolve mesmo se falhar: os objetos ficam procedurais. */
export function gearReady(): Promise<void> {
  if (loading) return loading;
  if (typeof Image === 'undefined' || typeof document === 'undefined') return (loading = Promise.resolve());
  loading = new Promise<void>((done) => {
    const img = new Image();
    img.onload = () => {
      atlas = img;
      for (const f of listeners.splice(0)) f();
      done();
    };
    img.onerror = () => done();
    setTimeout(done, 3000); // rede lenta: segue com o fallback e troca quando o atlas chegar
    img.src = ATLAS_URL;
  });
  return loading;
}

export const gearLoaded = (): boolean => atlas !== null;

/** Avisa quando o atlas chegar (para redesenhar o que já foi montado com o fallback procedural). */
export function onGearLoaded(f: () => void): void {
  if (atlas) f();
  else listeners.push(f);
}

/** Ano do mundo mostrado: antes de 1910 o toca-discos da sede é o fonógrafo de cilindro. */
export function setGearYear(y: number): void {
  year = y;
}

export const gearYearKey = (): string => (year > 0 && year < 1910 ? 'cil' : '');

/** Peça do atlas desenhada dentro de um sprite: dx = deslocamento horizontal a partir do centro da pegada. */
export interface GearPart {
  id: GearId;
  dx?: number;
  dy?: number;
}

/**
 * Asset(s) do pacote para um tipo de móvel numa era, ou null (fica procedural).
 * Variante segue a mesma convenção de sprites.ts (ex.: mic variante 1 = microfone de fita do equipamento).
 */
export function gearFor(kind: string, era: EraId, variant: number): GearPart[] | null {
  const e = eraIndex(era);
  switch (kind) {
    case 'gramophone': return [{ id: gearYearKey() ? 'fonografo' : 'gramofone' }];
    case 'mic': return variant === 1 || e <= 2 ? [{ id: 'microfone' }] : null;
    case 'tape': return [{ id: e <= 2 ? 'gravador' : 'multifaixas' }];
    case 'console': return [{ id: 'mesa' }];
    case 'daw': return [{ id: 'daw' }];
    case 'server': return [{ id: 'servidor' }];
    case 'piano': return [{ id: 'piano' }];
    case 'drumkit': return [{ id: 'bateria' }];
    case 'synth': return [{ id: e >= 5 ? 'dj' : 'sintetizador' }];
    case 'synth_rack': return [{ id: e >= 4 ? 'sampler' : 'sintetizador_p' }];
    case 'amp': {
      // amplificador com o instrumento ao lado: violão antes de 1960, guitarra (variante par) ou baixo (ímpar) depois
      const inst: GearId = e <= 1 ? 'violao' : variant % 2 === 1 && e >= 2 ? 'baixo' : 'guitarra';
      return [{ id: inst, dx: -9, dy: -2 }, { id: 'amplificador', dx: 3 }];
    }
    case 'speaker': return e >= 2 && e <= 7 ? [{ id: 'caixa_pa' }] : null;
    case 'press': return [{ id: e <= 1 ? 'prensa_1930' : e === 4 || e === 5 ? 'duplicador_cd' : 'prensa_1970' }];
    case 'crate': return [{ id: e === 0 ? 'cilindros' : 'caixa_discos' }];
    case 'mailbag': return [{ id: 'carrinho' }];
    default: return null;
  }
}

/** Desenha um sprite do atlas (espelhado se flip) com o pé (base, centro) em (x, y). */
export function drawGear(ctx: CanvasRenderingContext2D, id: GearId, x: number, y: number, flip = false): void {
  if (!atlas) return;
  const [sx, sy, w, h] = GEAR_ATLAS[id];
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h);
  if (!flip) {
    ctx.drawImage(atlas, sx, sy, w, h, left, top, w, h);
    return;
  }
  ctx.save();
  ctx.translate(left + w, top);
  ctx.scale(-1, 1);
  ctx.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
  ctx.restore();
}

export const gearSize = (id: GearId): { w: number; h: number } => ({ w: GEAR_ATLAS[id][2], h: GEAR_ATLAS[id][3] });

// r27 (port): o mesmo atlas como buffer Px, para quem pinta pixel a pixel (sede em corte, interiores da cidade).
const pxCache = new Map<GearId, Px>();
let atlasData: Uint32Array | null = null;
let atlasW = 0;

/** Sprite do atlas como Px (com contorno), ou null antes de o atlas chegar / sem DOM (testes) — aí o desenho é procedural. */
export function gearPx(id: GearId): Px | null {
  const hit = pxCache.get(id);
  if (hit) return hit;
  if (!atlas) return null;
  if (!atlasData) {
    try {
      const cv = document.createElement('canvas');
      cv.width = atlas.naturalWidth; cv.height = atlas.naturalHeight;
      const ctx = cv.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(atlas, 0, 0);
      atlasData = new Uint32Array(ctx.getImageData(0, 0, cv.width, cv.height).data.buffer.slice(0));
      atlasW = cv.width;
    } catch { return null; }
  }
  const [sx, sy, w, h] = GEAR_ATLAS[id];
  const q = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = atlasData[(sy + y) * atlasW + sx + x]; if ((c >>> 24) > 127) q.d[y * w + x] = c | 0xff000000; }
  pxCache.set(id, q);
  return q;
}
