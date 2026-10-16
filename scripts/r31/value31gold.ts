// R31 (E · Bolsa) — sonda do golden r27-p2a (r16pb-5, 8 meses, 1975): hash de acts com o valor ligado e desligado
// e quais atos/campos diferem. Uso: npx tsx scripts/r31/value31gold.ts
import { hashString } from '../../src/core/rng';
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw } from '../../src/sim/r31/switches';
import { SW_VALUE31 } from '../../src/sim/r31/value31';
import { rngSnapshot19 } from '../../src/sim/rng19';
import type { GameState } from '../../src/sim/types';

function run(on: boolean): GameState {
  const s = createGame(defaultConfig('r16pb-5', { startYear: 1975, realNames: true }));
  setSw(s, SW_VALUE31, on);
  for (let m = 0; m < 8 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  return s;
}
const a = run(true);
const b = run(false);
for (const [n, s] of [['on', a], ['off', b]] as const) console.log(n, s.player.cash, hashString(JSON.stringify(s.acts)), hashString(rngSnapshot19(s)));
let k = 0;
for (const id of Object.keys(a.acts)) {
  const x = a.acts[id] as unknown as Record<string, unknown>; const y = b.acts[id] as unknown as Record<string, unknown>;
  if (!y) { console.log('only on', id); continue; }
  for (const f of Object.keys(x)) if (JSON.stringify(x[f]) !== JSON.stringify(y[f]) && k++ < 30) console.log(id, x.name, f, JSON.stringify(x[f]).slice(0, 80), '|', JSON.stringify(y[f]).slice(0, 80));
}
const st = (a.x4 as unknown as { rng19: { st: Record<string, unknown> } }).rng19.st;
const keys = Object.keys(st).filter((x) => x !== 'bolsa31').sort();
console.log('rng sem bolsa31', hashString(JSON.stringify(keys.map((x) => [x, st[x]]))));
