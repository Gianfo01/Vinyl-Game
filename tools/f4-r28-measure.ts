// Rodada 28 (F4) — medição: meses até o 1º top 10 (bot equilibrado) no começo padrão × cenário "Primeiro hit",
// variedade dos começos sorteados pela semente e duração das vinhetas. Uso: npx tsx tools/f4-r28-measure.ts [seeds]
import { createGame } from '../src/sim/worldgen';
import { botMonth, defaultConfig } from '../src/sim/bot';
import { advanceMonth } from '../src/sim/tick';
import { scenarioConfig, setNextGameSetup } from '../src/sim/sys/live';
import { FIRST_HIT28, top40Hits28 } from '../src/sim/sys/start28';
import { STARTS28, pickStart28 } from '../src/sim/start28data';
import { stingerSpec28 } from '../src/audio/stinger28';
import { specSeconds } from '../src/audio/spec';
import type { GameState, RunConfig } from '../src/sim/types';

const N = Number(process.argv[2] ?? 6);
const CAP = 36;
/** Meses até o 1º top 40 e o 1º top 10 (CAP+1 = não chegou). */
function monthsTo(make: () => GameState): [number, number] {
  const s = make();
  let t40 = CAP + 1, t10 = CAP + 1;
  for (let m = 1; m <= CAP; m++) {
    botMonth(s); advanceMonth(s);
    if (t40 > CAP && top40Hits28(s) >= 1) t40 = m;
    if (t10 > CAP && s.player.stats.top10s >= 1) t10 = m;
    if (s.ended || (t40 <= CAP && t10 <= CAP)) break;
  }
  return [t40, t10];
}
const med = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2; };
const rows: Record<string, number[]> = {};
const add = (k: string, [a, b]: [number, number]) => { (rows[`${k} · top 40`] ??= []).push(a); (rows[`${k} · top 10`] ??= []).push(b); };
for (let i = 0; i < N; i++) {
  const seed = `f4m-${i}`;
  add('padrão 1962', monthsTo(() => createGame(defaultConfig(seed))));
  add('NY 1964 emergente', monthsTo(() => createGame(defaultConfig(seed, { startYear: 1964, homeCity: 'new_york', scenario: 'emerging' } as Partial<RunConfig>))));
  add('Primeiro hit', monthsTo(() => { setNextGameSetup({ scenarioId: FIRST_HIT28.id }); return createGame(scenarioConfig(FIRST_HIT28, defaultConfig(seed))); }));
}
for (const [k, xs] of Object.entries(rows)) console.log(`${k}: meses = [${xs.map((x) => (x > CAP ? `>${CAP}` : x)).join(', ')}] · mediana ${med(xs) > CAP ? `>${CAP}` : med(xs)} · dentro de 12 meses ${xs.filter((x) => x <= 12).length}/${xs.length}`);
const dist: Record<string, number> = {};
for (let i = 0; i < 300; i++) { const id = pickStart28(`seed-${i}`).id; dist[id] = (dist[id] ?? 0) + 1; }
console.log(`começos em 300 sementes: ${STARTS28.map((x) => `${x.id} ${dist[x.id] ?? 0}`).join(' · ')}`);
const secs = (['hit', 'number1', 'gold', 'award', 'chapter', 'end', 'bad'] as const).map((k) => specSeconds(stingerSpec28(k, 1970)));
console.log(`vinhetas: ${Math.min(...secs).toFixed(2)}–${Math.max(...secs).toFixed(2)} s`);
