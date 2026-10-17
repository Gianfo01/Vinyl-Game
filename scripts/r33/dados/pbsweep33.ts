// R33 (DADOS33): varredura de sementes do r16-playbot (1º ano, 1975, nomes reais) — quais têm todas as ações.
// mesma ordem de carga do teste (a ordem dos ganchos muda a trajetória)
import { defaultConfig } from '../../../src/sim/bot';
import { playLog, playMonth } from '../../../src/sim/playbot16';
import { advanceMonth } from '../../../src/sim/tick';
import { createGame } from '../../../src/sim/worldgen';
const K = ['signs', 'projects', 'recordings', 'releases', 'tours', 'festivals', 'syncPitches', 'scouts', 'decisions', 'hires'] as const;
const from = Number(process.argv[2] ?? 1), to = Number(process.argv[3] ?? 16);
for (let i = from; i <= to; i++) {
  const s = createGame(defaultConfig(`r16pb-${i}`, { startYear: 1975, realNames: true }));
  for (let m = 0; m < 12 && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const L = playLog(s) as unknown as Record<string, number>;
  const miss = K.filter((k) => !(L[k] > 0));
  console.log(`pb-${i}`, miss.length ? 'falta ' + miss.join(',') : 'TODAS', `turnês ${L.tours} festivais ${L.festivals} contratações ${L.hires}`);
}
