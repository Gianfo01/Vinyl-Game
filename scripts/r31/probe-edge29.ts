// R31 onda 3 (bal): mede uma aresta da sonda R29 (empurrão → métrica) com interruptores. Uso: R31_SW=... npx tsx scripts/r31/probe-edge29.ts estresse despesas
import '../../src/sim/sys/index';
import { base29, median29, run29 } from '../../src/sim/probe29all';
import { setSw, switchDef } from '../../src/sim/r31/switches';

const [nudge, metric] = process.argv.slice(2);
const runs = ['r29all', 'r29all-q', 'r29all-x'].map((sd) => {
  const b = base29(sd);
  if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
    const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
    setSw(b.s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
  }
  return run29(b, (n) => n.id === nudge);
});
for (const r of runs) console.log(r.rows.filter((x) => x.metric === metric).map((x) => (x.d * 100).toFixed(2) + '%').join(' '));
console.log('mediana', median29(runs).rows.filter((x) => x.metric === metric).map((x) => `${x.nudge}→${x.metric} ${(x.d * 100).toFixed(2)}%`).join(' '));
