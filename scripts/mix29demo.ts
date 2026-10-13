// R29 demo: mistura etária média (por ato e ponderada por fãs) dos atos ativos e dos atos do jogador
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { ageMix29 } from '../src/sim/sys/demo29';
import { playerActs } from '../src/sim/util';
for (const y of [1955, 1975, 1995, 2015]) {
  const s = createGame(defaultConfig(`mix-${y}`, { startYear: y }));
  for (let m = 0; m < 12; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const acc = (ids: string[]) => { const w = [0, 0, 0, 0, 0]; let n = 0; for (const id of ids) { const a = s.acts[id]; if (!a) continue; const b = ageMix29(s, a); b.forEach((x, i) => (w[i] += x)); n++; } return w.map((x) => (x / Math.max(1, n)).toFixed(3)).join(' '); };
  const act = Object.values(s.acts).filter((a) => a.status === 'active' && a.fame >= 5).map((a) => a.id);
  console.log(y, 'ativos', acc(act), '| jogador', acc(playerActs(s)));
}
