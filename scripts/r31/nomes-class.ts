// R31 · NOMES — classifica as trocas achadas por scripts/r31/nomes-sweep.mjs: rótulo da interface (literal do código
// com tradução ou chave de S), número/letra/sigla curta ou palavra trocada no meio de um rótulo = DEFEITO; o resto é
// nome de entidade trocado (esperado). Uso: npx tsx scripts/r31/nomes-class.ts <varredura.json>
import fs from 'node:fs';
import { uiLiterals31 } from './uiwords31';

const f = process.argv[2] ?? 'docs/r31/nomes-sweep.json';
const j = JSON.parse(fs.readFileSync(f, 'utf8')) as { screens: number; skipped: number; swaps: { swap: string; n: number; where: string[] }[]; canvas: [string, string][] };
const lits = uiLiterals31();
const tr = new Set(lits.translated);
const W = /[\p{L}\p{N}]+/gu;
const bad: typeof j.swaps = [], ok: typeof j.swaps = [];
for (const s of j.swaps) {
  const [a0] = s.swap.split(' → ');
  const a = a0.replace(/^@[\w-]+:/, '').trim();
  const short = [...a].length <= 2 || !/\p{L}/u.test(a);
  // a troca mexeu em quê? palavras do original que sumiram
  const [, z0] = s.swap.split(' → ');
  const zw = new Set((z0.match(W) ?? []));
  const gone = (a.match(W) ?? []).filter((w) => !zw.has(w));
  const lowerGone = gone.some((w) => w === w.toLowerCase() && /\p{L}/u.test(w)); // palavra comum trocada
  if (short || tr.has(a) || lowerGone) bad.push(s); else ok.push(s);
}
const tot = (xs: typeof j.swaps) => xs.reduce((n, x) => n + x.n, 0);
console.log(JSON.stringify({ telas: j.screens, semComparar: j.skipped, trocasDistintas: j.swaps.length, defeitos: bad.length, defeitosVezes: tot(bad), entidades: ok.length, entidadesVezes: tot(ok), canvas: j.canvas.length }));
console.log('DEFEITOS'); for (const s of bad.slice(0, 80)) console.log(`  ${s.swap}  ×${s.n}  [${s.where.join(', ')}]`);
console.log('ENTIDADES (amostra)'); for (const s of ok.slice(0, 25)) console.log(`  ${s.swap}  ×${s.n}`);
