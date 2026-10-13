// R29 demo: efeito médio (média geométrica) de cada modificador demo29 numa partida com playbot
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
const g = globalThis as { __mod19?: Record<string, { n: number; lg: number; max: number }> };
g.__mod19 = {};
const s = createGame(defaultConfig(process.argv[2] ?? 'b19-6', { startYear: Number(process.argv[3] ?? 1975) }));
for (let m = 0; m < Number(process.argv[4] ?? 24) && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
for (const [k, v] of Object.entries(g.__mod19!).filter(([k]) => /demo29|terr20|fame16|audience8|fans18|regions18/.test(k)).sort()) console.log(k.padEnd(28), 'n', String(v.n).padStart(7), 'média', Math.exp(v.lg / v.n).toFixed(3), 'max', v.max.toFixed(2));
console.log('caixa', s.player.cash);
