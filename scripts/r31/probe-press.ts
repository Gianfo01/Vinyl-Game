// R31 onda 3 (bal): tiragem × procura. Para cada disco do jogador (robô equilibrado), compara a tiragem, a previsão
// gravada no lançamento (fc, com a verba e o hype do plano), a procura das 10 primeiras semanas (dem10) e a procura
// da vida inteira (vendido + perdido por falta de estoque). Uso: npx tsx scripts/r31/probe-press.ts [meses] semente@ano ...
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { setSw, switchDef } from '../../src/sim/r31/switches';
import { physicalShare } from '../../src/sim/production';

const months = Number(process.argv[2] ?? 36);
const pairs = process.argv.slice(3).length ? process.argv.slice(3) : ['pr-0@1965', 'pr-1@1972'];
const gm = (xs: number[]) => xs.length ? Math.exp(xs.reduce((t, x) => t + Math.log(Math.max(1e-3, x)), 0) / xs.length) : NaN;
const all = { pf: [] as number[], df: [] as number[], lf: [] as number[], sp: [] as number[], short: 0, sold: 0 };
for (const p of pairs) {
  const [seed, ys] = p.split('@');
  const s = createGame(defaultConfig(seed, { startYear: Number(ys), realNames: true }));
  if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
    const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
    setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
  }
  for (let m = 0; m < months && !s.ended; m++) { playMonth(s, 'balanced'); advanceMonth(s); }
  const ph = physicalShare(s);
  for (const r of Object.values(s.releases)) {
    if (r.owner !== 'player' || r.hist || !r.pressed || !r.fc || s.week - r.week < 30) continue;
    const life = r.totalUnits + r.shortage;
    all.pf.push(r.pressed / (r.fc * ph)); all.df.push((r.dem10 ?? 0) / r.fc); all.lf.push(life / r.fc);
    all.short += r.shortage; all.sold += r.totalUnits;
  }
  console.log(`${p} fim ${s.year} ${s.ended ? 'FIM' : 'vivo'} discos ${all.pf.length}`);
}
console.log(`tiragem/(fc×físico) ${gm(all.pf).toFixed(2)} · dem10/fc ${gm(all.df).toFixed(2)} · vida/fc ${gm(all.lf).toFixed(2)} · perdido/vendido ${(all.short / Math.max(1, all.sold)).toFixed(2)} (n=${all.pf.length})`);
