import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceUntil, DEFAULT_STOP, digestEnd, digestStart } from '../src/sim/sys/pacing8';
import { advanceMonth } from '../src/sim/tick';

const s = createGame(defaultConfig('dg', { startYear: 1962, scenario: 'established', mode: 'historic' }));
const snap = digestStart(s);
const kinds = new Set<string>();
const m0 = s.memory.length;
advanceMonth(s); advanceMonth(s);
for (const m of s.memory.slice(m0)) kinds.add(m.kind);
const d = digestEnd(s, snap, 2);
console.log([...kinds].join(' '));
for (const g of d.groups) console.log(g.id, g.n, g.items.map((x) => x.pt).join(' || '));
const u = advanceUntil(s, { ...DEFAULT_STOP });
console.log(u.stop, u.weeks, u.reason.pt);
