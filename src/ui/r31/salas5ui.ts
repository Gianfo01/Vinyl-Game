// R31 · onda 5 (SALAS) — pinta uma sala de salas5px no <canvas>: fundo, os bonecos (avatares reais) nos lugares da
// sala (na ordem de `people`; lugar sem pessoa fica de fora) e a camada da frente por cima (mesa, vidro, flashes).
import { drawScene27, type Who27 } from '../act27/scene27';
import { SH5, SW5, type Sala5 } from './salas5px';

export function drawSala5(cv: HTMLCanvasElement, s: Sala5, year: number, people: (Who27['p'] | undefined)[]): void {
  cv.style.aspectRatio = `${SW5} / ${SH5}`;
  const who: Who27[] = [];
  s.spots.forEach((sp, i) => { const p = people[i]; if (p) who.push({ p, x: sp.x, y: sp.y, pose: sp.pose, dir: sp.dir }); });
  drawScene27(cv, s.back, year, who, s.front);
}
