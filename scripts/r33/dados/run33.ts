// R33 (DADOS33): varredura da base — `npx tsx scripts/r33/dados/run33.ts [saida.json] [sementes] [anosSim]`
import fs from 'node:fs';
import { audit33, count33 } from './audit33';
const out = process.argv[2] ?? 'docs/r33/dados/auditoria.json';
const seeds = Number(process.argv[3] ?? 3);
const simYears = Number(process.argv[4] ?? 40);
const t0 = Date.now();
const xs = audit33({ seeds, simYears, simYearsOf: [1950, 1962, 1975] });
const c = count33(xs);
const ex: Record<string, string[]> = {};
for (const x of xs) { const k = x.kind; ex[k] ??= []; const w = `${x.hist} ${x.year} · ${x.what}`; if (!ex[k].includes(w) && ex[k].length < 40) ex[k].push(w); }
fs.mkdirSync('docs/r33/dados', { recursive: true });
fs.writeFileSync(out, JSON.stringify({ seeds, simYears, count: c, examples: ex }, null, 1));
console.log(JSON.stringify(c), ((Date.now() - t0) / 1000).toFixed(0) + 's');
