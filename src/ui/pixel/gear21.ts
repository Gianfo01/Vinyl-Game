// Equipamentos e objetos no estilo do pacote oficial (art/pack-equipamentos-v1), reduzidos para pixel art por
// tools/gear-pack.py num atlas único (src/assets/gear21.png, ~14 KB). Aqui: carga do atlas, recorte de cada
// sprite (com espelho para a orientação SE) e o mapa (tipo de móvel, era, variante, ano) → asset.
// Objetos sem asset no pacote continuam procedurais em sprites.ts, com o acabamento da casa (gearFinish).

import { eraIndex, type EraId } from './palette';
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
