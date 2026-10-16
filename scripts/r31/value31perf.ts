// R31 (E · Bolsa) — custo do modelo de valor por mês (ligado × desligado). Uso: npx tsx scripts/r31/value31perf.ts [ano] [meses]
import { defaultConfig } from '../../src/sim/bot';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw } from '../../src/sim/r31/switches';
import { SW_VALUE31 } from '../../src/sim/r31/value31';

const [y = '2019', n = '8'] = process.argv.slice(2);
for (const on of [false, true, false, true]) {
  const s = createGame(defaultConfig('v31perf', { startYear: Number(y) }));
  setSw(s, SW_VALUE31, on);
  const t0 = performance.now();
  for (let i = 0; i < Number(n); i++) advanceMonth(s);
  console.log(on ? 'ligado' : 'desligado', Math.round((performance.now() - t0) / Number(n)), 'ms/mês', Object.keys(s.releases).length, 'lançamentos');
}
