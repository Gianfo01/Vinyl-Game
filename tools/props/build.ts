// Gera o catálogo de props de Masters em assets/masters/:
//   detalhe/NNN_id.png  arte na grade nativa (~256 px), originais (tools/props/fonte) + gerados (defs)
//   jogo/NNN_id.png     mesma arte na densidade dos personagens de corpo inteiro, com sombra no chão
//   manifest.json       metadados de todos
//   pranchas/*.png      pranchas de contato por categoria (detalhe sobre fundo claro, jogo sobre fundo escuro)
// Uso: npm run props

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { C, type Px } from '../../src/ui/pixel/px';
import { ALL } from './defs';
import { upscalePx } from './kit';
import { ORIGINAIS } from './originais-meta';
import { decodePNG, encodePNG } from './png';
import { renderProp } from './render';
import { toGameScale } from './scale';
import { contactSheet } from './sheet';
import type { Categoria } from './types';

const ROOT = join(import.meta.dirname, '..', '..');
const OUT = join(ROOT, 'assets', 'masters');
const FONTE = join(import.meta.dirname, 'fonte');

interface Entry {
  n: number;
  id: string;
  arquivo: string;
  nome: string;
  name: string;
  cat: Categoria;
  era?: [number, number];
  origem: 'original' | 'gerado';
  detalhe: { w: number; h: number };
  jogo: { w: number; h: number };
}

const file = (n: number, id: string) => `${String(n).padStart(3, '0')}_${id}.png`;

for (const d of ['detalhe', 'jogo', 'pranchas']) rmSync(join(OUT, d), { recursive: true, force: true });
for (const d of ['detalhe', 'jogo', 'pranchas']) mkdirSync(join(OUT, d), { recursive: true });

const entries: (Entry & { det: Px; game: Px })[] = [];
for (const m of ORIGINAIS) {
  const f = file(m.n, m.id);
  const det = decodePNG(readFileSync(join(FONTE, f))) as unknown as Px;
  const game = toGameScale(det, m.jogo, { snap: false });
  entries.push({ ...m, arquivo: f, origem: 'original', det, game, detalhe: { w: det.w, h: det.h }, jogo: { w: game.w, h: game.h } });
}
const seen = new Set(entries.map((e) => e.n));
for (const d of ALL) {
  if (seen.has(d.n)) throw new Error(`número repetido: ${d.n} (${d.id})`);
  seen.add(d.n);
  const det = renderProp(d);
  const game = toGameScale(det, d.jogo);
  const f = file(d.n, d.id);
  entries.push({ n: d.n, id: d.id, nome: d.nome, name: d.name, cat: d.cat, ...(d.era ? { era: d.era } : {}), arquivo: f, origem: 'gerado', det, game, detalhe: { w: det.w, h: det.h }, jogo: { w: game.w, h: game.h } });
}
entries.sort((a, b) => a.n - b.n);

for (const e of entries) {
  writeFileSync(join(OUT, 'detalhe', e.arquivo), encodePNG(e.det));
  writeFileSync(join(OUT, 'jogo', e.arquivo), encodePNG(e.game));
}

const manifest = {
  sobre: 'Props de Masters: 001–101 originais (desenhados à mão), 102+ gerados por tools/props. Pixel art; amplie por vizinho mais próximo.',
  escala: { detalhe: 'grade nativa da arte (~256 px)', jogo: 'densidade dos personagens de corpo inteiro (~78 px em pé), com sombra no chão' },
  total: entries.length,
  props: entries.map(({ det: _d, game: _g, ...e }) => e),
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');

const cats = [...new Set(entries.map((e) => e.cat))];
for (const c of cats) {
  const list = entries.filter((e) => e.cat === c);
  writeFileSync(join(OUT, 'pranchas', `${c}_detalhe.png`), encodePNG(contactSheet(list.map((e) => ({ label: e.arquivo.replace('.png', ''), img: e.det })), { cols: 6, cell: 280, scale: 1 })));
  const g = contactSheet(list.map((e) => ({ label: e.arquivo.replace('.png', ''), img: e.game })), { cols: 8, cell: 96, scale: 1, bg: C('#231c1f'), ink: C('#ecdcc4') });
  writeFileSync(join(OUT, 'pranchas', `${c}_jogo.png`), encodePNG(upscalePx(g, 3)));
}
console.log(`${entries.length} props (${entries.filter((e) => e.origem === 'gerado').length} gerados) em ${OUT}`);
