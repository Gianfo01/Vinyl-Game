// Perfil temporário (r27-perf): tempo por gancho/sistema em advanceMonth no jogo enorme.
import { defaultConfig, botMonth } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
const dbSize = (process.argv[2] ?? 'huge') as 'huge';
const year = Number(process.argv[3] ?? 2010);
const months = Number(process.argv[4] ?? 12);
const P: Record<string, number> = {};
const s = createGame(defaultConfig('r14perf', { startYear: year, realNames: true, dbSize }));
// aquece 1 mês sem medir
botMonth(s); advanceMonth(s);
(globalThis as { __hookProf?: Record<string, number> }).__hookProf = P;
let tb = 0, ta = 0;
const c0 = process.cpuUsage();
for (let m = 0; m < months; m++) {
  let t = performance.now(); botMonth(s); tb += performance.now() - t;
  t = performance.now(); advanceMonth(s); ta += performance.now() - t;
}
const cpu = process.cpuUsage(c0);
const hooks = Object.values(P).reduce((a, b) => a + b, 0);
console.log(`${dbSize} ${year}: acts=${Object.keys(s.acts).length} bot=${(tb / months).toFixed(0)}ms advance=${(ta / months).toFixed(0)}ms total=${((tb + ta) / months).toFixed(0)}ms/mês cpu=${((cpu.user + cpu.system) / 1000 / months).toFixed(0)}ms/mês hooks=${(hooks / months).toFixed(0)}ms`);
const top = Object.entries(P).sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[5] ?? 30));
for (const [k, v] of top) console.log(`${(v / months).toFixed(1).padStart(8)}  ${k}`);
