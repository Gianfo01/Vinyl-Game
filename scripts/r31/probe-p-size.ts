// R31 onda 3 (P) — tamanho no save dos estados novos (res31, dctx31, purse31) e do contrato txn31, por era.
// Uso: npx tsx scripts/r31/probe-p-size.ts [meses]
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { resultsReport31, results31Balance } from '../../src/sim/r31/results31';
import { purse31 } from '../../src/sim/r31/purse31';

const months = Number(process.argv[2] ?? 36);
for (const start of [1955, 2012]) {
  const g = createGame(defaultConfig(`r31-base-0`, { startYear: start }));
  for (let i = 0; i < months && !g.ended; i++) { playMonth(g); advanceMonth(g); }
  const x = g.x4 as unknown as Record<string, unknown>;
  const kb = (k: string) => (JSON.stringify(x[k] ?? null).length / 1024).toFixed(1);
  const rep = resultsReport31(g, 'artist');
  const T = rep.totals;
  const mov = Math.abs(T.direct) + Math.abs(T.unRev) + Math.abs(T.unCost);
  console.log(`${start}: res31 ${kb('res31')} KB · dctx31 ${kb('dctx31')} KB · purse31 ${kb('purse31')} KB · txn31 ${kb('txn31')} KB · save ${(JSON.stringify(g).length / 1048576).toFixed(2)} MB`);
  console.log(`   resultado ${T.total / 100} · direto ${T.direct / 100} · rateado ${T.shared / 100} · não alocado ${T.unallocated / 100} · sem marca ${((100 * (Math.abs(T.unRev) + Math.abs(T.unCost))) / Math.max(1, mov)).toFixed(1)}% do movimento · fecha: ${results31Balance(g).length === 0}`);
  const P = purse31(g);
  console.log(`   bolso: ${P.n} movimentos · retiradas por bem/gasto ${P.drawn / 100} · categorias ${Object.keys(P.tot).join(', ')}`);
}
