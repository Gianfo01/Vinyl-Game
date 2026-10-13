// Determinismo r27-perf: estado serializado após 12 meses (bot + advanceMonth), hash por cenário.
import { createHash } from 'crypto';
const root = process.argv[2];
const { defaultConfig, botMonth } = await import(root + '/src/sim/bot.ts');
const { createGame } = await import(root + '/src/sim/worldgen.ts');
const { advanceMonth } = await import(root + '/src/sim/tick.ts');
const only = process.argv[3];
const cases: [string, string, number, string][] = [['seedA', 'medium', 1962, 'm1962'], ['seedB', 'medium', 1985, 'm1985'], ['seedC', 'medium', 2005, 'm2005'], ['r14perf', 'huge', 2010, 'h2010']];
for (const [seed, db, y, name] of cases) {
  if (only && !only.split(',').includes(name)) continue;
  const s = createGame(defaultConfig(seed, { startYear: y, realNames: true, dbSize: db }));
  const hs: string[] = [];
  for (let m = 0; m < 12; m++) { botMonth(s); advanceMonth(s); hs.push(createHash('sha256').update(JSON.stringify(s)).digest('hex').slice(0, 10)); }
  console.log(name, hs[11], 'months:', hs.join(','));
}
