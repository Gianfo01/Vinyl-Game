// r27 (P2B) — cenas em pixel art das mecânicas da fase 2: a estrada (van, céu conforme o evento, cidade no
// horizonte) e a sala de crise (relógio na parede, telefones, luz de alerta pela ameaça); a sala da diretoria
// está em r31/scene31px.paintDirectors31. Mesmo estilo da Sede (hqpx27/scene27): paleta da era,
// contorno, pontilhado; os bonecos são os avatares reais (drawScene27). Funções paint* são PURAS (só Px).

import { paletteOf } from '../pixel/palette';
import { C, Px, dith, mix, noise, shade } from '../pixel/px';
import { H27, W27 } from './scene27';

export type Sky27 = 'day' | 'dusk' | 'night' | 'storm';

/** Estrada: céu, cidade de destino no horizonte, asfalto com faixas, a van (quebrada = capô aberto e fumaça). */
export function paintRoad27(year: number, o: { sky?: Sky27; broken?: boolean; border?: boolean; frame?: number } = {}): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  const sky = o.sky ?? 'day';
  const top = sky === 'night' ? C('#0b1430') : sky === 'storm' ? C('#2b3340') : sky === 'dusk' ? C('#3b2a52') : mix(pal.sky, C('#9cc8ef'), 0.4);
  const low = sky === 'night' ? C('#1e2b55') : sky === 'storm' ? C('#4a5462') : sky === 'dusk' ? C('#e08a5a') : mix(pal.sky, C('#e9f2fb'), 0.5);
  const hz = 48;
  p.fill((x, y) => (y < hz ? (dith(x, y, y / hz) ? low : top) : C('#000000')));
  if (sky === 'night') for (let i = 0; i < 26; i++) p.put((i * 53) % W27, (i * 17) % 34, C('#e8eefc'));
  if (sky === 'day' || sky === 'dusk') p.disc(160, 16, 7, sky === 'dusk' ? C('#ffb35a') : C('#fff1b0'));
  // cidade no horizonte
  for (let i = 0; i < 18; i++) {
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
  // a van
  const vx = 46, vy = 64;
  p.rect(vx - 1, vy - 1, 46, 20, pal.outline);
  p.rect(vx, vy, 44, 18, mix(pal.accent, C('#f0f0f0'), 0.2));
  p.rect(vx, vy + 10, 44, 2, shade(pal.accent, -0.3));
  p.rect(vx + 32, vy + 2, 10, 7, mix(pal.glass, C('#0e1a2a'), 0.4));
  p.rect(vx + 4, vy + 2, 24, 6, mix(pal.glass, C('#0e1a2a'), 0.55));
  p.disc(vx + 9, vy + 18, 4, pal.outline); p.disc(vx + 9, vy + 18, 2, pal.metal);
  p.disc(vx + 35, vy + 18, 4, pal.outline); p.disc(vx + 35, vy + 18, 2, pal.metal);
  if (o.broken) {
    p.rect(vx + 42, vy - 4, 6, 3, pal.outline);
    for (let i = 0; i < 9; i++) p.disc(vx + 46 + i * 2 + ((o.frame ?? 0) % 3), vy - 6 - i * 3, 2 + (i >> 2), mix(C('#9aa0a8'), C('#e6e8ea'), i / 9));
  }
  // chuva
  if (sky === 'storm') for (let i = 0; i < 90; i++) { const x = (i * 37 + (o.frame ?? 0) * 3) % W27, y = (i * 23 + (o.frame ?? 0) * 5) % H27; p.line(x, y, x - 1, y + 3, C('#a9c4e0')); }
  return p;
}

/** Sala de crise: parede com relógio grande, quadro de avisos, mesa com telefones e a luz de alerta (ameaça 0..100). */
export function paintCrisis27(year: number, threat: number, frame = 0): Px {
  const pal = paletteOf(year);
  const p = new Px(W27, H27);
  const fl = pal.floors.office;
  p.fill((x, y) => (y < 60 ? shade(x % 12 < 6 ? pal.wall : mix(pal.wall, pal.wall2, 0.2), -y / 600) : ((x >> 3) + (y >> 2)) % 2 ? fl.a : fl.b));
  p.hline(0, W27 - 1, 59, pal.trim);
  // relógio
  p.disc(100, 22, 15, pal.outline); p.disc(100, 22, 13, pal.paper);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; p.put(100 + Math.round(Math.sin(a) * 11), 22 - Math.round(Math.cos(a) * 11), pal.outline); }
  const a = (frame / 60) * Math.PI * 2;
  p.line(100, 22, 100 + Math.round(Math.sin(a) * 9), 22 - Math.round(Math.cos(a) * 9), C('#c0392b'));
  p.line(100, 22, 100 + 5, 22 - 3, pal.outline);
  // quadro com papéis presos
  p.rect(18, 10, 50, 34, pal.outline); p.rect(19, 11, 48, 32, shade(pal.wood, 0.1));
  for (let i = 0; i < 7; i++) { const x = 22 + (i % 4) * 11, y = 14 + Math.floor(i / 4) * 14; p.rect(x, y, 9, 11, pal.paper); p.hline(x + 1, x + 7, y + 3, shade(pal.paper, -0.4)); p.hline(x + 1, x + 5, y + 6, shade(pal.paper, -0.4)); p.put(x + 4, y, C('#d83a3a')); }
  // gráfico na parede (caindo)
  p.rect(132, 10, 52, 32, pal.outline); p.rect(133, 11, 50, 30, pal.screen);
  let yy = 16; for (let x = 136; x < 180; x += 4) { const ny = Math.min(38, yy + Math.round((noise(x, 1, 3) - 0.3) * 6)); p.line(x, yy, x + 4, ny, threat > 50 ? C('#e05555') : C('#6fd08c')); yy = ny; }
  // luz de alerta
  const on = threat >= 35 && (frame >> 3) % 2 === 0;
  p.rect(186, 4, 8, 6, pal.outline); p.rect(187, 5, 6, 4, threat >= 65 ? (on ? C('#ff3b3b') : C('#5a1e1e')) : threat >= 35 ? (on ? C('#ffb020') : C('#5a3e10')) : C('#3fae5a'));
  // mesa e telefones
  p.rect(30, 66, 140, 10, pal.outline); p.rect(31, 66, 138, 8, pal.woodDark); p.hline(31, 168, 66, shade(pal.wood, 0.2));
  for (let i = 0; i < 3; i++) { const x = 50 + i * 40; p.rect(x, 61, 12, 5, pal.outline); p.rect(x + 1, 62, 10, 3, i === (frame >> 4) % 3 && threat > 40 ? C('#e05555') : pal.metalDark); }
  for (let i = 0; i < 5; i++) p.rect(40 + i * 26, 64, 8, 2, pal.paper);
  return p;
}

// (a sala da diretoria saiu para scene31px.paintDirectors31 — R31 POL2)

/** replaceChildren que aceita null/false (partes opcionais da tela). */
export const put27 = (el: HTMLElement, ...k: (Node | string | null | undefined | false)[]): void => el.replaceChildren(...k.filter((x): x is Node | string => !!x));
