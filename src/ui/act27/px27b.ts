// r27 (P2B) — cenas em pixel art das mecânicas da fase 2: a estrada (van, céu conforme o evento, cidade no
// horizonte) e a sala de crise (relógio na parede, telefones, luz de alerta pela ameaça); a sala da diretoria
// está em r31/scene31px.paintDirectors31. Mesmo estilo da Sede (hqpx27/scene27): paleta da era,
// contorno, pontilhado; os bonecos são os avatares reais (drawScene27). Funções paint* são PURAS (só Px).

import { paletteOf } from '../pixel/palette';
import { C, Px, dith, mix, noise, shade } from '../pixel/px';
import { H27, W27 } from './scene27';
import { cityView31 } from '../pixel/window31';
import { tourVan5 } from '../r31/salas5px';

export type Sky27 = 'day' | 'dusk' | 'night' | 'storm';

/** Estrada: céu, cidade de destino no horizonte, asfalto com faixas, a van (quebrada = capô aberto e fumaça). */
/** R31 onda 5 (SALAS): com `city`, o horizonte é a cidade real da parada e da época (skyline27), tingida pelo céu. */
export function paintRoad27(year: number, o: { sky?: Sky27; broken?: boolean; border?: boolean; frame?: number; city?: string; month?: number } = {}): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  const sky = o.sky ?? 'day';
  const top = sky === 'night' ? C('#0b1430') : sky === 'storm' ? C('#2b3340') : sky === 'dusk' ? C('#3b2a52') : mix(pal.sky, C('#9cc8ef'), 0.4);
  const low = sky === 'night' ? C('#1e2b55') : sky === 'storm' ? C('#4a5462') : sky === 'dusk' ? C('#e08a5a') : mix(pal.sky, C('#e9f2fb'), 0.5);
  const hz = 48;
  p.fill((x, y) => (y < hz ? (dith(x, y, y / hz) ? low : top) : C('#000000')));
  if (sky === 'night') for (let i = 0; i < 26; i++) p.put((i * 53) % W27, (i * 17) % 34, C('#e8eefc'));
  if (sky === 'day' || sky === 'dusk') p.disc(160, 16, 7, sky === 'dusk' ? C('#ffb35a') : C('#fff1b0'));
  if (o.city) { // cidade real da parada no horizonte (vista da época), com a luz do céu do evento por cima
    const v = cityView31(o.city, year, o.month ?? 6, W27, hz, 11);
    const k = sky === 'night' ? 0.62 : sky === 'storm' ? 0.45 : 0.5;
    for (let y = 0; y < hz; y++) for (let x = 0; x < W27; x++) {
      const c0 = v.d[y * W27 + x], tint = sky === 'night' ? C('#0b1430') : sky === 'storm' ? C('#3a4250') : sky === 'dusk' ? mix(C('#3b2a52'), C('#e08a5a'), y / hz) : 0;
      p.put(x, y, tint ? mix(c0, tint, k) : c0);
    }
    if (sky === 'night') for (let i = 0; i < 26; i++) p.put((i * 53) % W27, (i * 17) % 20, C('#e8eefc'));
    if (sky === 'dusk') p.disc(160, 16, 7, C('#ffb35a'));
  } else for (let i = 0; i < 18; i++) { // (sem cidade: silhuetas genéricas)
    const w = 6 + Math.floor(noise(i, 3, 5) * 8), h = 6 + Math.floor(noise(i, 7, 9) * 18), x = 96 + i * 6;
    p.rect(x, hz - h, w, h, shade(mix(top, C('#202a3a'), 0.6), -0.1));
    for (let yy = hz - h + 2; yy < hz - 1; yy += 3) for (let xx = x + 1; xx < x + w - 1; xx += 2) if (noise(xx, yy, i) > (sky === 'night' ? 0.45 : 0.8)) p.put(xx, yy, sky === 'night' ? C('#ffd66b') : shade(pal.glass, 0.2));
  }
  // campo e asfalto em perspectiva
  p.fill((x, y) => (dith(x, y, 0.5) ? pal.plant : shade(pal.plant, -0.2)), 0, hz, W27, H27 - hz);
  p.poly([[70, hz], [90, hz], [W27 + 30, H27], [-30, H27]], (x, y) => (noise(x >> 1, y >> 1, 3) > 0.92 ? C('#4a4d55') : C('#3a3d44')));
  for (let k = 0; k < 6; k++) { const t = ((k * 7 + (o.frame ?? 0)) % 40) / 40; const y = hz + 2 + Math.round(t * t * (H27 - hz)); const w = 1 + Math.round(t * 4); p.rect(80 - (w >> 1), y, w, 1 + Math.round(t * 2), C('#e8d36a')); }
  // posto de fronteira
  if (o.border) {
    p.rect(150, hz - 14, 26, 14, shade(pal.wall, -0.1)); p.rect(150, hz - 16, 26, 2, pal.outline); p.rect(156, hz - 10, 6, 6, pal.glass);
    p.rect(120, hz + 4, 40, 2, C('#d83a3a')); for (let x = 120; x < 160; x += 8) p.rect(x, hz + 4, 4, 2, C('#f2f2f2'));
  }
  // a van da turnê (R31 onda 5 SALAS): desenho por época no estilo do jogo (contorno INK, luz de cima), cases no bagageiro
  const vb = tourVan5(p, 40, 84, year, pal.accent, { broken: o.broken, frame: o.frame });
  if (o.broken) for (let i = 0; i < 6; i++) { // fumaça do motor: rolos que sobem, crescem, clareiam e vão com o vento
    const t = i + ((o.frame ?? 0) % 8) / 8, cx = vb.x + vb.w - 6 + Math.round(t * 3 + Math.sin(t * 1.7) * 2), cy = vb.y + 2 - Math.round(t * 5), r = 2 + t * 0.7;
    p.disc(cx, cy, r, mix(C('#5a5e66'), C('#d8dade'), t / 6)); p.disc(cx - 1, cy - 1, Math.max(1, r - 1.5), mix(C('#8a8e96'), C('#f0f2f4'), t / 6));
  }
  // chuva
  if (sky === 'storm') for (let i = 0; i < 90; i++) { const x = (i * 37 + (o.frame ?? 0) * 3) % W27, y = (i * 23 + (o.frame ?? 0) * 5) % H27; p.line(x, y, x - 1, y + 3, C('#a9c4e0')); }
  return p;
}

// (a sala de crise saiu para r31/salas5px.paintCrisis5 — R31 onda 5 SALAS)
// (a sala da diretoria saiu para scene31px.paintDirectors31 — R31 POL2)

/** replaceChildren que aceita null/false (partes opcionais da tela). */
export const put27 = (el: HTMLElement, ...k: (Node | string | null | undefined | false)[]): void => el.replaceChildren(...k.filter((x): x is Node | string => !!x));
