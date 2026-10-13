// R29 demo: bytes do estado demo29 no save (JSON) depois de N meses de playbot, por base de dados
import { defaultConfig } from '../src/sim/bot';
import { createGame } from '../src/sim/worldgen';
import { advanceMonth } from '../src/sim/tick';
import { playMonth } from '../src/sim/playbot16';
import { demo29 } from '../src/sim/sys/demo29';
for (const db of ['small', 'huge'] as const) {
  const s = createGame(defaultConfig('bytes29', { startYear: 1975, dbSize: db }));
  for (let m = 0; m < 24; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const st = demo29(s), part = (o: unknown) => JSON.stringify(o).length;
  console.log(db, 'save', part(s), 'demo29', part(st), '(atos', Object.keys(st.a).length, '· a', part(st.a), '· rp', part(st.rp), '· gh', part(st.gh), '· log', part(st.log), ')');
}
