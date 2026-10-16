// R31 F (medição): custo do mês com rivais decidindo pelo que sabem (know31.rivals ligado × desligado).
// Uso: npx tsx scripts/r31/probe-rivals.ts [meses]
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { advanceMonth } from '../../src/sim/tick';
import { setSw } from '../../src/sim/r31/switches';
import { SOC31_PERF, edgeCount31 } from '../../src/sim/social31';

const months = Number(process.argv[2] ?? '24');
for (const on of (process.argv[3] === "rev" ? [false, true] : [true, false])) {
  const ids = ['x_avex', 'x_xl', 'x_atlantic', 'x_stax', 'x_hipgnosis', 'x_sony', 'x_rca', 'x_capitol', 'x_trojan', 'x_sire', 'x_creation', 'x_epic', 'x_ktel', 'x_peerless', 'x_distrokid', 'imperial', 'heritage'];
  const s = createGame(defaultConfig('r10-pb', { startYear: 2019, labels: { ids, future: 'none' } } as never));
  setSw(s, 'know31.rivals', on);
  SOC31_PERF.ms = 0; SOC31_PERF.factMs = 0; SOC31_PERF.months = 0;
  const t0 = performance.now();
  for (let i = 0; i < months; i++) advanceMonth(s);
  const dt = performance.now() - t0;
  console.log(`know31.rivals=${on}: ${(dt / months).toFixed(0)} ms/mês · social ${((SOC31_PERF.ms + SOC31_PERF.factMs) / months).toFixed(2)} ms/mês · laços ${edgeCount31(s)}`);
}
