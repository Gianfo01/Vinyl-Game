// R33 · QA33 — calibração de GENTE33 parte B ligada por padrão: quantos talentos escondidos o jogador descobre, quantos
// os rivais levam, quantos o jogador perde (missed) e quantas voltas por cima acontecem num jogo longo, e quanto custa o mês.
// Uso: npx tsx scripts/r33/qa33-gente.ts [ano0=1960] [anos=30] [cidade=london] [semente=0]
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { recentFacts } from '../../src/sim/facts17';

const y0 = Number(process.argv[2] ?? 1960), years = Number(process.argv[3] ?? 30), city = process.argv[4] ?? 'london', seed = process.argv[5] ?? '0';
const s = createGame(defaultConfig(`gente33-${seed}`, { startYear: y0, homeCity: city, dbSize: 'small', realNames: true }));
const seen = new Set<string>();
const dec: Record<string, Record<string, number>> = {};
let msAll = 0;
while (s.year < y0 + years && !s.ended) {
  playMonth(s, 'balanced');
  const t0 = performance.now();
  advanceMonth(s);
  msAll += performance.now() - t0;
  for (const f of recentFacts(s, { months: 2 })) {
    if (seen.has(f.id) || !['talent33', 'missed33', 'comeback33'].includes(f.kind)) continue;
    seen.add(f.id);
    const d = `${Math.floor(s.year / 10) * 10}`;
    const k = f.kind === 'talent33' ? (f.actors[2] === 'player' ? 'talento-jogador' : 'talento-rival') : f.kind === 'missed33' ? 'perdido' : `volta-${f.tags?.[2] ?? '?'}`;
    (dec[d] ??= {})[k] = ((dec[d] ??= {})[k] ?? 0) + 1;
  }
}
const tot: Record<string, number> = {};
for (const d of Object.values(dec)) for (const [k, v] of Object.entries(d)) tot[k] = (tot[k] ?? 0) + v;
console.log(JSON.stringify({ seed, y0, ano: s.year, fim: s.ended?.ending ?? '', porDecada: dec, total: tot, msMes: Math.round(msAll / (years * 12)) }));
