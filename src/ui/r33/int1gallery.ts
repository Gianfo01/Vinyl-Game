// R33 · INT-1 (arte) — GALERIA para o dono aprovar os interiores novos (não entra no jogo): cada lugar nas épocas em que existe,
// com pessoas de exemplo, no corte recortado que o jogo usa. Aberta por docs/r33/mocks/int1/galeria.html (vite) e capturada
// por scripts/r33/shots-int1.mjs (um print por lugar e época em docs/r33/mocks/int1/).

import '../../sim/sys/index'; // a ordem de carga do jogo (a galeria não passa pelo main)
import type { IntK33, Person27 } from '../../sim/sys/place27';
import { drawInterior33, interior33, paintInt33 } from './int1px';

export const GAL33: Record<IntK33, number[]> = {
  school: [1889, 1962, 2025], plant: [1889, 1962, 2025], museum: [1889, 1962, 2025], platform: [2008, 2025, 2035], agency: [1935, 1962, 2025], branch: [1889, 1962, 2025],
};
const NAME: Record<IntK33, string> = { school: 'Escola de musica', plant: 'Fabrica de discos', museum: 'Museu', platform: 'Plataforma', agency: 'Agencia de turne', branch: 'Filial' };
const CREW: Record<IntK33, Person27[]> = {
  school: [{ name: 'Helena Prado', role: { pt: 'Professora', en: 'Teacher' }, staff: true }, { name: 'Davi Rocha', role: { pt: 'Aluno', en: 'Student' } }, { name: 'Luna Reis', role: { pt: 'Aluna', en: 'Student' } }],
  plant: [{ name: 'Otto Brandt', role: { pt: 'Operador', en: 'Operator' }, staff: true }, { name: 'Ines Vaz', role: { pt: 'Qualidade', en: 'QC' }, staff: true }],
  museum: [{ name: 'Marta Lins', role: { pt: 'Guia', en: 'Guide' }, staff: true }, { name: 'Caio Nunes', role: { pt: 'Seguranca', en: 'Security' }, staff: true }, { name: 'Visita', role: { pt: 'Visitante', en: 'Visitor' } }],
  platform: [{ name: 'Lia Costa', role: { pt: 'Curadora', en: 'Curator' }, staff: true }, { name: 'Ravi Shah', role: { pt: 'Servidores', en: 'Servers' }, staff: true }],
  agency: [{ name: 'Nico Alves', role: { pt: 'Agente', en: 'Booker' }, staff: true }, { name: 'Bea Duarte', role: { pt: 'Agente', en: 'Booker' }, staff: true }, { name: 'Cliente', role: { pt: 'Cliente', en: 'Client' } }],
  branch: [{ name: 'Paulo Reis', role: { pt: 'Gerente', en: 'Manager' }, staff: true }, { name: 'Ana Lopes', role: { pt: 'Recepcao', en: 'Reception' }, staff: true }],
};

const el = (tag: string, st = '', txt = ''): HTMLElement => { const e = document.createElement(tag); if (st) e.style.cssText = st; if (txt) e.textContent = txt; return e; };

/** Um lugar numa época, no tamanho em que o jogo o mostra (escala 3). */
export function placeShot33(k: IntK33, year: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const m = interior33(k, year, CREW[k].length);
  drawInterior33(cv, m, CREW[k], { minW: 360, city: 'sao_paulo', name: NAME[k], seed: `gal33|${k}`, extra: (g, sd) => paintInt33(k, year)(g, sd) });
  cv.style.cssText = `image-rendering:pixelated;display:block;width:${cv.width * 3}px;height:${cv.height * 3}px`;
  return cv;
}

export function int1Gallery(k: IntK33): HTMLElement {
  const root = el('div', 'background:#12141c;color:#e8e0c8;padding:14px;font-family:sans-serif;width:max-content');
  for (const y of GAL33[k]) {
    const box = el('div', 'margin-bottom:14px');
    box.append(el('div', 'font:600 14px sans-serif;color:#f0c060;margin-bottom:4px', `${NAME[k]} · ${y}`), placeShot33(k, y));
    box.dataset.year = String(y);
    root.append(box);
  }
  return root;
}
