// Importa os PNGs originais enviados (≈1 254 px) para tools/props/fonte/ na grade nativa, com o nome
// padronizado (NNN_id.png). Uso: npx tsx tools/props/importar.ts <pasta-com-os-png>

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGINAIS } from './originais-meta';
import { decodePNG, encodePNG } from './png';
import { nativeFromOriginal } from './originais';

const dir = process.argv[2];
if (!dir) throw new Error('uso: importar.ts <pasta>');
const out = join(import.meta.dirname, 'fonte');
mkdirSync(out, { recursive: true });
const files = readdirSync(dir).filter((f) => f.endsWith('.png'));
for (const m of ORIGINAIS) {
  const f = files.find((x) => x.replace(/^0*/, '').startsWith(`${m.n}_`) && x.includes(m.id));
  if (!f) {
    console.warn(`faltando: ${m.n} ${m.id}`);
    continue;
  }
  const px = nativeFromOriginal(decodePNG(readFileSync(join(dir, f))));
  const name = `${String(m.n).padStart(3, '0')}_${m.id}.png`;
  writeFileSync(join(out, name), encodePNG(px));
  console.log(`${f} → ${name} ${px.w}×${px.h}`);
}
