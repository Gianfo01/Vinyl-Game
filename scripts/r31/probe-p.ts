// R31 onda 3 (P) — sonda: quanto do resultado fica sem artista/projeto, por categoria e prefixo da chave.
// Uso: npx tsx scripts/r31/probe-p.ts [semente] [ano] [meses]
import { defaultConfig } from '../../src/sim/bot';
import { createGame } from '../../src/sim/worldgen';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { txnObs31 } from '../../src/sim/r31/txn';
import '../../src/sim/r31/results31';
import { resultsReport31 } from '../../src/sim/r31/results31';

const [seed = 'p31a', start = '1990', months = '36'] = process.argv.slice(2);
const cfg = { ...defaultConfig(seed), startYear: Number(start), career: 'label' } as ReturnType<typeof defaultConfig>;
const g = createGame(cfg);
const un: Record<string, number> = {};
const at: Record<string, number> = {};
txnObs31().push((_s, t) => {
  if (t.cls !== 'res') return;
  const k = `${t.cat} ${t.key.replace(/^\d+:/, '').split(/[:\d]/)[0]}`;
  const o = t.tags.artist ? at : un;
  o[k] = (o[k] ?? 0) + Math.abs(t.amount);
});
for (let i = 0; i < Number(months); i++) { playMonth(g); advanceMonth(g); if (g.ended) break; }
const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${(v / 100).toFixed(0).padStart(12)}  ${k}`).join('\n');
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
console.log(`atribuído |x| ${(sum(at) / 100).toFixed(0)}  não alocado |x| ${(sum(un) / 100).toFixed(0)}  (${((100 * sum(un)) / (sum(un) + sum(at))).toFixed(1)}%)`);
console.log('--- não alocado'); console.log(top(un));
console.log('--- atribuído'); console.log(top(at));
const r = resultsReport31(g, 'artist');
console.log(JSON.stringify(r.totals));
