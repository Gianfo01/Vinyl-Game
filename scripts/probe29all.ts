// R29 (CONECTAR TUDO): matriz 13×13 de influência entre sistemas (src/sim/probe29all.ts) e o arquivo do mapa da wiki.
// Uso: npx tsx scripts/probe29all.ts [--seed r29all] [--year 1985] [--json saida.json] [--write]   (--write regrava src/sim/connmap29.ts)
import { writeFileSync } from 'node:fs';
import '../src/sim/sys/index';
import { base29, matrix29, median29, run29, SYS29, SYS29_NAME, type Cell29, type Run29 } from '../src/sim/probe29all';

const args = process.argv.slice(2);
const arg = (k: string, d: string): string => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const seeds = arg('seed', 'r29all,r29all-b,r29all-c').split(',');
const year = +arg('year', '1985');
const runs: Run29[] = [];
const rowsAll: unknown[] = [];
for (const seed of seeds) {
  const t0 = Date.now();
  const run = run29(base29(seed, year));
  rowsAll.push({ seed, rows: run.rows });
  runs.push(run);
  console.error(`${seed}: ${run.rows.length} medições (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}
// célula final: mediana entre as sementes de cada (empurrão, saída), depois a maior por par de sistemas
const cells = new Map<string, Cell29>(matrix29(median29(runs)).map((c) => [`${c.a}>${c.b}`, c]));
const ab = (x: string) => x.slice(0, 4);
const sym = { forte: '●', media: '◐', fraca: '·', '': ' ' } as const;
console.log(`| de \\ para | ${SYS29.map(ab).join(' | ')} |`);
console.log(`|---|${SYS29.map(() => '---').join('|')}|`);
for (const a of SYS29) console.log(`| ${ab(a)} | ${SYS29.map((b) => (a === b ? '—' : sym[cells.get(`${a}>${b}`)?.str ?? ''])).join(' | ')} |`);
const n = (s: string) => [...cells.values()].filter((c) => c.a !== c.b && c.str === s).length;
console.log(`\nforte ${n('forte')} · média ${n('media')} · fraca ${n('fraca')} · nenhuma ${SYS29.length * (SYS29.length - 1) - n('forte') - n('media') - n('fraca')}`);
const out = arg('json', '');
if (out) writeFileSync(out, JSON.stringify({ seeds, year, cells: [...cells.values()], rows: rowsAll }, null, 1));
if (args.includes('--write')) {
  const edges = [...cells.values()].filter((c) => c.a !== c.b && c.str).sort((x, y) => SYS29.indexOf(x.a) - SYS29.indexOf(y.a) || SYS29.indexOf(x.b) - SYS29.indexOf(y.b));
  const body = `// GERADO por scripts/probe29all.ts --write (não editar à mão). Mapa das conexões MEDIDO: sementes ${seeds.join(', ')}, ${year}.
// Cada aresta = maior efeito de um empurrão no sistema A sobre uma saída do sistema B (mesma semente, A × B); força
// forte ≥ 10%, média ≥ 3%, fraca ≥ 0,5% (0,2% nas leituras puras); com várias sementes vale a mediana. "via" diz qual
// empurrão e qual saída (src/sim/probe29all.ts). A wiki lê daqui.
export type Str29 = 'forte' | 'media' | 'fraca';
export interface Edge29 { a: string; b: string; str: Str29; d: number; via: string }
export const SYSTEMS29: { id: string; name: string }[] = ${JSON.stringify(SYS29.map((id) => ({ id, name: SYS29_NAME[id] })), null, 1)};
export const CONNMAP29: Edge29[] = [
${edges.map((c) => `  { a: '${c.a}', b: '${c.b}', str: '${c.str}', d: ${Math.round(c.d * 1000) / 1000}, via: '${c.via}' },`).join('\n')}
];
`;
  writeFileSync('src/sim/connmap29.ts', body);
  console.error('src/sim/connmap29.ts regravado');
}
