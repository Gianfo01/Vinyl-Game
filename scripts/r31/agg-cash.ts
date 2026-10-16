// R31 onda 3 (bal): soma do caixa por categoria do livro (US$ 2020) nos primeiros N meses de várias partidas do robô,
// para comparar interruptores ligados × desligados sem depender só da contagem de falências.
// Uso: MEAS=1 R31_SW="id=v,..." npx tsx scripts/r31/agg-cash.ts <meses> semente@ano ...  → JSON numa linha no fim
import { defaultConfig } from '../../src/sim/bot';
import { playMonth } from '../../src/sim/playbot16';
import { advanceMonth } from '../../src/sim/tick';
import { createGame } from '../../src/sim/worldgen';
import { postObs18 } from '../../src/sim/ledger18';
import { setSw, switchDef } from '../../src/sim/r31/switches';
import { toReal } from '../../src/core/money';

const months = Number(process.argv[2] ?? 24);
const agg: Record<string, number> = {};
let posted = 0, cur: { year: number } | null = null;
postObs18().push((s, key, amount, cat, _sect, cash) => {
  if (!cash || s !== cur) return;
  posted += amount;
  const k = `${cat}|${key.replace(/[:#].*$/, '').replace(/\d+/g, '')}`;
  agg[k] = (agg[k] ?? 0) + toReal(amount, s.year);
});
const per: string[] = [];
for (const p of process.argv.slice(3)) {
  const [seed, ys] = p.split('@');
  const s = createGame(defaultConfig(seed, process.env.MEAS ? { startYear: Number(ys), role: 'label', bandGenre: 'rnr', bandName: 'Banda Teste' } : { startYear: Number(ys), realNames: true }));
  if (process.env.R31_SW) for (const kv of process.env.R31_SW.split(',')) {
    const [id, raw] = kv.split('='); const d = switchDef(id); if (!d) throw new Error(id);
    setSw(s, id, typeof d.def === 'boolean' ? raw === 'true' : typeof d.def === 'number' ? Number(raw) : raw);
  }
  cur = s;
  let m = 0;
  for (; m < months && !s.ended; m++) {
    const c0 = s.player.cash; posted = 0;
    playMonth(s, 'balanced'); advanceMonth(s);
    agg['(fora do livro)'] = (agg['(fora do livro)'] ?? 0) + toReal(s.player.cash - c0 - posted, s.year);
  }
  per.push(`${p}:${s.ended ? 'X' : '.'}${m}:${Math.round(toReal(s.player.cash, s.year) / 1000)}k`);
  console.log(per[per.length - 1]);
}
console.log('AGG', JSON.stringify(Object.fromEntries(Object.entries(agg).map(([k, v]) => [k, Math.round(v)]))));
