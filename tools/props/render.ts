// Renderiza props gerados (para iterar no desenho).
// Uso: npx tsx tools/props/render.ts [--only id1,id2] [--cat instrumento] [--sheet saida.png] [--jogo saida-jogo.png] [--dir pasta] [--scale 2]
// --sheet: prancha do desenho em detalhe (fundo claro). --jogo: prancha na escala dos personagens (fundo escuro, 3×),
// com um boneco de 78 px na primeira célula para comparar o tamanho.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { C } from '../../src/ui/pixel/px';
import { Kit, upscalePx } from './kit';
import { CHAR_H, mannequin, toGameScale } from './scale';
import { encodePNG } from './png';
import { contactSheet } from './sheet';
import { ALL } from './defs';
import type { PropDef } from './types';

export function renderProp(def: PropDef) {
  const [w, h] = def.size ?? [256, 256];
  const k = new Kit(w, h);
  def.draw(k);
  return k.finish();
}

export const fileName = (def: PropDef) => `${String(def.n).padStart(3, '0')}_${def.id}.png`;

if (process.argv[1]?.endsWith('render.ts')) {
  const args = process.argv.slice(2);
  const arg = (k: string) => {
    const i = args.indexOf(`--${k}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const only = arg('only')?.split(',');
  const cat = arg('cat');
  const defs = ALL.filter((d) => (!only || only.includes(d.id) || only.includes(String(d.n))) && (!cat || d.cat === cat));
  const dir = arg('dir');
  const scale = Number(arg('scale') ?? '1');
  const items = defs.map((d) => {
    const t0 = Date.now();
    const img = renderProp(d);
    const ms = Date.now() - t0;
    if (dir) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, fileName(d)), encodePNG(scale > 1 ? upscalePx(img, scale) : img));
    }
    console.log(`${fileName(d)} ${img.w}×${img.h} ${ms}ms`);
    return { label: fileName(d), img };
  });
  const sheet = arg('sheet');
  if (sheet) writeFileSync(sheet, encodePNG(contactSheet(items, { cols: Number(arg('cols') ?? '4'), cell: Number(arg('cell') ?? '300') })));
  const jogo = arg('jogo');
  if (jogo) {
    const g = [{ label: 'ESCALA 78PX', img: toGameScale(mannequin(), CHAR_H) }, ...defs.map((d, i) => ({ label: `${d.id} ${d.jogo}PX`, img: toGameScale(items[i].img, d.jogo) }))];
    writeFileSync(jogo, encodePNG(upscalePx(contactSheet(g, { cols: 8, cell: 110, scale: 1, bg: C('#231c1f'), ink: C('#ecdcc4') }), 3)));
  }
}
