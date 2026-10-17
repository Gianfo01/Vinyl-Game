// R31 (DBTAM): perfil rápido — cria uma partida e vira N meses com o robô (igual ao measure.ts), sem filho.
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
const [size = 'medium', start = '2012', months = '6'] = process.argv.slice(2);
const t0 = performance.now();
const s = createGame(defaultConfig('prof', { startYear: +start, role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste', dbSize: size as never }));
const t1 = performance.now();
for (let i = 0; i < +months; i++) { playMonth(s); advanceMonth(s); }
const t2 = performance.now();
const acts = Object.values(s.acts);
console.log(`${size} ${start}: criar ${(t1 - t0).toFixed(0)}ms, ${((t2 - t1) / +months).toFixed(0)} ms/mês, atos ${acts.length} (ativos ${acts.filter((a) => a.status === 'active').length}), pessoas ${Object.keys(s.persons).length}`);
