// R31 (H) — gera o bloco `place:` do registro único de nomes reais (src/data/realnames31.ts) a partir de
// src/data/places31.ts. Uso: npx tsx scripts/r31/gen-places31.ts  (reescreve só o bloco entre as marcas).
// Regra do registro: o mesmo nome real vira sempre a mesma homenagem (a primeira que aparece, inclusive as já registradas).
import { readFileSync, writeFileSync } from 'node:fs';
import { PLACES31 } from '../../src/data/places31';

const F = new URL('../../src/data/realnames31.ts', import.meta.url);
const src = readFileSync(F, 'utf8');
const A = '  // @@PLACES31-BEGIN (gerado por scripts/r31/gen-places31.ts — não editar à mão)', Z = '  // @@PLACES31-END';
const head = src.includes(A) ? src.slice(0, src.indexOf(A)) : src.slice(0, src.indexOf('\n};', src.indexOf('REALNAMES31: Record<string, RealName31> = {')) + 1);
const tail = src.includes(Z) ? src.slice(src.indexOf(Z) + Z.length + 1) : src.slice(src.indexOf('\n};', src.indexOf('REALNAMES31: Record<string, RealName31> = {')) + 1);
const subOf = new Map<string, string>();
for (const m of head.matchAll(/real: '((?:[^'\\]|\\.)*)', substituto: '((?:[^'\\]|\\.)*)'/g)) if (!subOf.has(m[1])) subOf.set(m[1], m[2]);
const esc = (x: string) => x.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const TIPO: Record<string, string> = { radio: 'media', tv: 'media', venue: 'venue', theatre: 'venue', arena: 'venue', store: 'brand', studio: 'company', label: 'label', fest: 'festival', bar: 'venue' };
const lines = PLACES31.map((p) => {
  const real = esc(p.real);
  let sub = subOf.get(real) ?? esc(p.sub);
  if (sub === real) sub = esc(`${p.sub} (homenagem)`);
  subOf.set(real, sub);
  return `  'place:${p.id}': { real: '${real}', substituto: '${sub}', tipo: '${TIPO[p.kind]}' },`;
});
writeFileSync(F, `${head}${A}\n${lines.join('\n')}\n${Z}\n${tail}`);
console.log(`${lines.length} lugares registrados`);
