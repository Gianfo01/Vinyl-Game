// R31 · onda 4 (ART) — adereços das cenas no pixel art padrão: a bateria, o amplificador, a caixa de som, a plateia
// e a grade vêm de uma fonte única (stage31px), pintada pixel a pixel (sem meio-tom de antialiasing, poucas cores,
// contorno INK), na escala dos bonecos; nenhuma cena pinta mais com o atlas do pacote (arte HD reduzida).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AV_H } from '../src/ui/pixel/avatar';
import { C, INK, Px, inked } from '../src/ui/pixel/px';
import { amp31, bars31, crowd31, drumKit31, speaker31 } from '../src/ui/pixel/stage31px';

const bbox = (p: Px) => {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.d[y * p.w + x] >>> 24) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
};
const colors = (p: Px) => new Set(Array.from(p.d).filter((c) => c >>> 24));
const props: [string, (p: Px) => void][] = [
  ['bateria 1955', (p) => drumKit31(p, 10, 40, 1955, C('#c8302c'))],
  ['bateria 1975', (p) => drumKit31(p, 10, 40, 1975, C('#2a8ab0'))],
  ['bateria 2005', (p) => drumKit31(p, 10, 40, 2005, C('#c8302c'))],
  ['amplificador tweed', (p) => amp31(p, 10, 40, 1960, true)],
  ['amplificador', (p) => amp31(p, 10, 40, 1985, false)],
  ['caixa de som', (p) => speaker31(p, 10, 40, 12, 30)],
  ['plateia', (p) => crowd31(p, 4, 52, 4, 40, 1985, 7)],
  ['grade', (p) => bars31(p, 4, 6, 30, 40)],
];

describe('r31 ART: adereços na grade e na paleta do jogo', () => {
  it('pixel a pixel: opaco ou vazio (sem antialiasing), poucas cores, contorno INK, determinístico', () => {
    for (const [name, draw] of props) {
      const a = new Px(60, 44), b = new Px(60, 44);
      inked(a, draw); inked(b, draw);
      expect(Array.from(a.d), name).toEqual(Array.from(b.d));
      const alphas = new Set(Array.from(a.d).map((c) => c >>> 24));
      expect([...alphas].every((x) => x === 0 || x === 255), `${name}: meio-tom ${[...alphas].join(',')}`).toBe(true);
      const cs = colors(a);
      expect(cs.size, `${name}: ${cs.size} cores`).toBeLessThanOrEqual(name === 'plateia' ? 4 * 14 : 36); // plateia: até 14 tons por pessoa
      expect(cs.has(INK >>> 0) || cs.has(INK | 0), `${name}: sem contorno INK`).toBe(true);
    }
  });

  it('escala dos bonecos: bateria e amplificador cabem ao lado de um boneco (nem miniatura nem gigante)', () => {
    const d = new Px(60, 44); drumKit31(d, 10, 40, 1975, C('#2a8ab0'));
    const k = bbox(d);
    expect(k.h).toBeGreaterThanOrEqual(Math.round(AV_H * 0.6));
    expect(k.h).toBeLessThanOrEqual(AV_H);
    expect(k.w).toBeGreaterThanOrEqual(28);
    const a = new Px(60, 44); amp31(a, 10, 40, 1985, true);
    expect(bbox(a).h).toBeGreaterThanOrEqual(16);
    expect(bbox(a).h).toBeLessThan(AV_H * 0.7);
  });

  it('fonte única: sede, interiores, salas e ilustrações usam stage31px; ninguém pinta com o atlas do pacote', () => {
    const src = (f: string) => readFileSync(f, 'utf8');
    for (const f of ['src/ui/ps/hqpx27.ts', 'src/ui/pixel/interior27.ts', 'src/ui/r31/salas31px.ts', 'src/ui/ps/art27kit.ts', 'src/ui/r31/under31ui.ts', 'src/ui/r31/scene31px.ts'])
      expect(src(f), f).not.toMatch(/gear21/);
    expect(src('src/ui/ps/hqpx27.ts')).toMatch(/drumKit31\(/);
    expect(src('src/ui/ps/art27kit.ts')).toMatch(/drumKit31\(/);
    expect(src('src/ui/pixel/interior27.ts')).toMatch(/crowd31\(/);
    expect(src('src/ui/pixel/interior27.ts')).toMatch(/bars31\(/);
    // a plateia e a grade não são mais retângulos chapados direto no contexto
    expect(src('src/ui/pixel/interior27.ts')).not.toMatch(/ctx\.fillStyle = cols\[/);
  });
});
