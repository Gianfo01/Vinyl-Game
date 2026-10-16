import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
const s = createGame(defaultConfig(process.argv[2] ?? 'r29rel-bot', { startYear: 1970, realNames: true }));
let m = 0;
for (; m < 240 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); if (m % 24 === 0) console.log(m, s.year, Math.round(s.player.cash)); }
console.log('fim', m, s.year, s.ended, JSON.stringify((s as unknown as { endReason?: unknown }).endReason ?? null));
