// R29 demo: custo dos ganchos por mês na base "enorme" (globalThis.__hookProf) — demo29 × total
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
const P: Record<string, number> = {};
(globalThis as { __hookProf?: Record<string, number> }).__hookProf = P;
const s = createGame(defaultConfig('r14perf', { startYear: 2010, realNames: true, dbSize: 'huge' }));
const t = performance.now();
for (let i = 0; i < 12; i++) advanceMonth(s);
const tot = (performance.now() - t) / 12;
const top = Object.entries(P).sort((a, b) => b[1] - a[1]);
console.log('ms/mês', tot.toFixed(0), '| demo29 (gancho mensal)', ((P['month:demo29'] ?? 0) / 12).toFixed(1), 'ms/mês; posição', top.findIndex(([k]) => k === 'month:demo29') + 1, 'de', top.length);
console.log('maiores:', top.slice(0, 5).map(([k, v]) => `${k} ${(v / 12).toFixed(0)}`).join(' · '));
