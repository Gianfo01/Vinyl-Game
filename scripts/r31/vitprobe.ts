import { createGame } from '../../src/sim/worldgen';
import { defaultConfig } from '../../src/sim/bot';
import { advanceMonth } from '../../src/sim/tick';
import '../../src/sim/sys/index';
import { VIT_PLACES31, vitItems31, vitView31 } from '../../src/sim/r31/vitrine31';
for (const y of [1935, 1975, 2015]) {
  const s = createGame(defaultConfig('vitp', { startYear: y }));
  for (let m = 0; m < 3; m++) advanceMonth(s);
  console.log('=====', y, s.year, s.month);
  for (const p of VIT_PLACES31) {
    const xs = vitItems31(s, p);
    console.log(' --', p, xs.length);
    for (const it of xs.slice(0, 6)) { const v = vitView31(s, it); console.log('   ', it.c, '|', v.name.pt, '|', v.note.pt.slice(0, 70), '|', v.btns.map((b) => b.label.pt + (b.lock ? '🔒' : '')).join(', ')); }
  }
}
